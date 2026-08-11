import { createSystemClient } from '@/lib/supabase/system';
import { ANALYTICS_SESSION_INACTIVITY_MS } from '../constants';
import {
  recordAnalyticsSession,
  validateAnalyticsSession,
} from '../session';

jest.mock('@/lib/supabase/system', () => ({
  SupabaseSystemConfigurationError: class SupabaseSystemConfigurationError extends Error {},
  createSystemClient: jest.fn(),
}));

const createSystemClientMock = jest.mocked(createSystemClient);
const VISITOR_ID = '123e4567-e89b-42d3-a456-426614174000';
const SESSION_ID = '223e4567-e89b-42d3-a456-426614174000';

function sessionLookup(lastSeenAt: string | null, error: unknown = null) {
  const query = {
    abortSignal: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: lastSeenAt ? { last_seen_at: lastSeenAt } : null,
      error,
    }),
    select: jest.fn().mockReturnThis(),
  };
  createSystemClientMock.mockReturnValue({ from: jest.fn(() => query) } as never);
  return query;
}

describe('analytics sessions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-12T00:00:00.000Z'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('rejects malformed cookie identifiers without opening a database client', async () => {
    await expect(validateAnalyticsSession({
      sessionCookieValue: 'not-a-uuid',
      visitorCookieValue: VISITOR_ID,
    })).resolves.toEqual({ reason: 'invalid', valid: false });
    expect(createSystemClientMock).not.toHaveBeenCalled();
  });

  it('accepts a matching session seen within the inactivity window', async () => {
    const lastSeenAt = new Date(Date.now() - ANALYTICS_SESSION_INACTIVITY_MS + 1).toISOString();
    const query = sessionLookup(lastSeenAt);

    await expect(validateAnalyticsSession({
      sessionCookieValue: SESSION_ID,
      visitorCookieValue: VISITOR_ID,
    })).resolves.toEqual({ sessionId: SESSION_ID, valid: true });
    expect(query.eq).toHaveBeenNthCalledWith(1, 'id', SESSION_ID);
    expect(query.eq).toHaveBeenNthCalledWith(2, 'visitor_id', VISITOR_ID);
  });

  it.each([
    ['expired', new Date(Date.now() - ANALYTICS_SESSION_INACTIVITY_MS).toISOString()],
    ['too far in the future', new Date(Date.now() + 5 * 60 * 1_000 + 1).toISOString()],
    ['malformed', 'not-a-date'],
  ])('rejects a %s persisted session', async (_label, lastSeenAt) => {
    sessionLookup(lastSeenAt);

    await expect(validateAnalyticsSession({
      sessionCookieValue: SESSION_ID,
      visitorCookieValue: VISITOR_ID,
    })).resolves.toEqual({ reason: 'invalid', valid: false });
  });

  it('fails closed on lookup errors', async () => {
    sessionLookup(null, { code: 'database_unavailable' });

    await expect(validateAnalyticsSession({
      sessionCookieValue: SESSION_ID,
      visitorCookieValue: VISITOR_ID,
    })).resolves.toEqual({ reason: 'service', valid: false });
  });

  it('uses the shared inactivity policy when creating or refreshing a session', async () => {
    const rpcResult = {
      abortSignal: jest.fn().mockResolvedValue({
        data: [{ created: true, session_id: SESSION_ID }],
        error: null,
      }),
    };
    const rpc = jest.fn().mockReturnValue(rpcResult);
    createSystemClientMock.mockReturnValue({ rpc } as never);

    await expect(recordAnalyticsSession({ visitorCookieValue: VISITOR_ID })).resolves.toEqual({
      sessionId: SESSION_ID,
      shouldSetVisitorCookie: false,
      visitorId: VISITOR_ID,
    });
    expect(rpc).toHaveBeenCalledWith('get_or_create_analytics_session', {
      p_inactivity_seconds: ANALYTICS_SESSION_INACTIVITY_MS / 1_000,
      p_visitor_id: VISITOR_ID,
    });
  });
});
