/** @jest-environment node */

import { getGitHubContributions } from '../contributions';

jest.mock('next/cache', () => ({
  unstable_cache: jest.fn((callback: unknown) => callback),
}));

const ORIGINAL_ENV = { ...process.env };
const TEST_TOKEN = 'github_pat_test_token_value';

type Level = 'NONE' | 'FIRST_QUARTILE' | 'SECOND_QUARTILE' | 'THIRD_QUARTILE' | 'FOURTH_QUARTILE';

interface RawDay {
  date: string;
  contributionCount: number;
  contributionLevel: Level | string;
}

function day(date: string, contributionCount: number, contributionLevel: Level | string = 'NONE'): RawDay {
  return { date, contributionCount, contributionLevel };
}

function payload(weeks: RawDay[][], totalContributions = 7): unknown {
  return {
    data: {
      user: {
        contributionsCollection: {
          contributionCalendar: {
            totalContributions,
            weeks: weeks.map((contributionDays) => ({ contributionDays })),
          },
        },
      },
    },
  };
}

const VALID_WEEKS: RawDay[][] = [
  [day('2026-03-04', 0), day('2026-03-05', 2, 'SECOND_QUARTILE'), day('2026-03-06', 1, 'FIRST_QUARTILE'), day('2026-03-07', 0)],
  [day('2026-03-08', 4, 'FOURTH_QUARTILE'), day('2026-03-09', 0, 'NONE'), day('2026-03-10', 0, 'THIRD_QUARTILE')],
];

function mockFetch(response: Partial<Response>) {
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}), ...response });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function loggedText(spy: jest.SpyInstance): string {
  return JSON.stringify(spy.mock.calls);
}

describe('getGitHubContributions', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, GITHUB_CONTRIBUTIONS_TOKEN: TEST_TOKEN };
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
  });

  it('hides the calendar without calling GitHub when the token is missing or blank', async () => {
    const fetchMock = mockFetch({});

    delete process.env.GITHUB_CONTRIBUTIONS_TOKEN;
    await expect(getGitHubContributions()).resolves.toBeNull();

    process.env.GITHUB_CONTRIBUTIONS_TOKEN = '   ';
    await expect(getGitHubContributions()).resolves.toBeNull();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('queries only the portfolio owner through the GraphQL API with a server-side bearer token', async () => {
    const fetchMock = mockFetch({ json: async () => payload(VALID_WEEKS) });

    await getGitHubContributions();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.github.com/graphql');
    expect(init.method).toBe('POST');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TEST_TOKEN}`);

    const body = JSON.parse(String(init.body)) as { query: string; variables: { login: string } };
    expect(body.variables).toEqual({ login: 'JudemichaelArriba' });
    expect(body.query).toContain('contributionCalendar');
    expect(body.query).not.toMatch(/mutation/i);
  });

  it('maps the calendar into a serializable DTO with levels and derived stats', async () => {
    mockFetch({ json: async () => payload(VALID_WEEKS) });

    const result = await getGitHubContributions();

    expect(result).toEqual({
      username: 'JudemichaelArriba',
      totalContributions: 7,
      weeks: [
        [
          { date: '2026-03-04', count: 0, level: 0 },
          { date: '2026-03-05', count: 2, level: 2 },
          { date: '2026-03-06', count: 1, level: 1 },
          { date: '2026-03-07', count: 0, level: 0 },
        ],
        [
          { date: '2026-03-08', count: 4, level: 4 },
          { date: '2026-03-09', count: 0, level: 0 },
          { date: '2026-03-10', count: 0, level: 3 },
        ],
      ],
      stats: {
        activeDays: 3,
        longestStreak: 2,
        busiestMonth: { month: '2026-03', count: 7 },
        busiestDay: { date: '2026-03-08', count: 4, level: 4 },
      },
    });
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it('fails closed on a non-OK response without leaking the token', async () => {
    mockFetch({ ok: false, status: 401 });

    await expect(getGitHubContributions()).resolves.toBeNull();
    expect(loggedText(consoleErrorSpy)).toContain('401');
    expect(loggedText(consoleErrorSpy)).not.toContain(TEST_TOKEN);
  });

  it('fails closed on GraphQL errors, logging only sanitized error types', async () => {
    mockFetch({
      json: async () => ({
        data: { user: null },
        errors: [{ type: 'NOT_FOUND', message: `secret ${TEST_TOKEN}` }, { type: 'bad type!' }],
      }),
    });

    await expect(getGitHubContributions()).resolves.toBeNull();
    const logs = loggedText(consoleErrorSpy);
    expect(logs).toContain('NOT_FOUND');
    expect(logs).toContain('UNKNOWN');
    expect(logs).not.toContain(TEST_TOKEN);
  });

  it('fails closed when the request throws or times out', async () => {
    const abort = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    global.fetch = jest.fn().mockRejectedValue(abort) as unknown as typeof fetch;

    await expect(getGitHubContributions()).resolves.toBeNull();
    expect(loggedText(consoleErrorSpy)).toContain('TimeoutError');
  });

  it('fails closed when the body is not JSON', async () => {
    mockFetch({ json: async () => { throw new SyntaxError('Unexpected token'); } });

    await expect(getGitHubContributions()).resolves.toBeNull();
  });

  it.each([
    ['a missing user', { data: { user: null } }],
    ['an unknown contribution level', payload([[day('2026-03-04', 1, 'FIFTH_QUARTILE')]])],
    ['a malformed date', payload([[day('2026-3-4', 1, 'FIRST_QUARTILE')]])],
    ['an impossible date', payload([[day('2026-02-31', 1, 'FIRST_QUARTILE')]])],
    ['a negative count', payload([[day('2026-03-04', -1, 'FIRST_QUARTILE')]])],
    ['a fractional count', payload([[day('2026-03-04', 1.5, 'FIRST_QUARTILE')]])],
    ['a non-numeric total', payload([[day('2026-03-04', 1, 'FIRST_QUARTILE')]], Number.NaN)],
    ['an empty calendar', payload([])],
    ['an empty week', payload([[]])],
    ['a week with more than seven days', payload([Array.from({ length: 8 }, (_, i) => day(`2026-03-0${i + 1}`, 0))])],
    ['too many weeks', payload(Array.from({ length: 55 }, () => [day('2026-03-04', 0)]))],
  ])('rejects %s', async (_label, body) => {
    mockFetch({ json: async () => body });

    await expect(getGitHubContributions()).resolves.toBeNull();
  });
});
