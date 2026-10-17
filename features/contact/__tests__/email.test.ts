/** @jest-environment node */

import { sendContactEmail } from '../email';

const ORIGINAL_ENV = { ...process.env };

const FIELDS = {
  senderName: 'Ada Lovelace',
  senderEmail: 'ada@example.com',
  message: 'Hello there.\nSecond line.',
};

interface ResendRequestBody {
  from: string;
  to: string[];
  reply_to: string;
  subject: string;
  html: string;
  text: string;
}

function mockFetch(response: Partial<Response> = { ok: true, status: 200 }) {
  const fetchMock = jest.fn().mockResolvedValue({
    json: async () => ({}),
    ...response,
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function sentBody(fetchMock: jest.Mock): ResendRequestBody {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return JSON.parse(String(init.body)) as ResendRequestBody;
}

describe('sendContactEmail', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      RESEND_API_KEY: 're_test_key',
      NOTIFICATION_EMAIL: 'owner@example.com',
      NOTIFICATION_FROM_EMAIL: 'Portfolio <noreply@example.com>',
    };
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
  });

  it('fails closed without calling the provider when the API key is missing', async () => {
    delete process.env.RESEND_API_KEY;
    const fetchMock = mockFetch();

    await expect(sendContactEmail(FIELDS)).resolves.toEqual({ sent: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['recipient', 'NOTIFICATION_EMAIL', 'not-an-email'],
    ['sender', 'NOTIFICATION_FROM_EMAIL', 'Portfolio <broken>'],
  ])('fails closed when the %s address is malformed', async (_label, key, value) => {
    process.env[key] = value;
    const fetchMock = mockFetch();

    await expect(sendContactEmail(FIELDS)).resolves.toEqual({ sent: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends one Resend request to the owner with the visitor as reply-to', async () => {
    const fetchMock = mockFetch();

    await expect(sendContactEmail(FIELDS)).resolves.toEqual({ sent: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test_key');

    const body = sentBody(fetchMock);
    expect(body.to).toEqual(['owner@example.com']);
    expect(body.from).toBe('Portfolio <noreply@example.com>');
    expect(body.reply_to).toBe('ada@example.com');
    expect(body.subject).toBe('New portfolio message from Ada Lovelace');
    expect(body.text).toContain('Hello there.\nSecond line.');
  });

  it('delivers the full message rather than a truncated preview', async () => {
    const fetchMock = mockFetch();
    const longMessage = 'x'.repeat(2_000);

    await sendContactEmail({ ...FIELDS, message: longMessage });

    expect(sentBody(fetchMock).text).toContain(longMessage);
  });

  it('escapes visitor input in the HTML body', async () => {
    const fetchMock = mockFetch();

    await sendContactEmail({
      ...FIELDS,
      senderName: '<img src=x onerror=alert(1)>',
      message: '<script>alert("x")</script> & \'quotes\'',
    });

    const { html } = sentBody(fetchMock);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;quotes&#39;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('reports failure on a provider error without logging visitor details', async () => {
    mockFetch({ ok: false, status: 422, json: async () => ({ name: 'validation_error' }) });

    await expect(sendContactEmail(FIELDS)).resolves.toEqual({ sent: false });

    const logged = JSON.stringify(consoleErrorSpy.mock.calls);
    expect(logged).toContain('validation_error');
    expect(logged).not.toContain(FIELDS.senderName);
    expect(logged).not.toContain(FIELDS.senderEmail);
    expect(logged).not.toContain('Hello there');
  });

  it('reports failure when the request itself throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('network down')) as unknown as typeof fetch;

    await expect(sendContactEmail(FIELDS)).resolves.toEqual({ sent: false });
    expect(JSON.stringify(consoleErrorSpy.mock.calls)).toContain('TypeError');
  });
});
