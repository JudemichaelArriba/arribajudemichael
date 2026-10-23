/** @jest-environment node */

import { cookies } from 'next/headers';

import {
  getAnalyticsAuthenticationState,
  isAnalyticsEnabled,
} from '@/features/analytics/request';
import { recordAnalyticsSession } from '@/features/analytics/session';
import { checkAnalyticsSessionRateLimit } from '@/lib/security/analyticsSessionRateLimit';
import { POST } from '../route';

jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('@/features/analytics/request', () => ({
  getAnalyticsAuthenticationState: jest.fn(),
  isAnalyticsEnabled: jest.fn(),
}));
jest.mock('@/features/analytics/session', () => ({
  ANALYTICS_SESSION_COOKIE: 'portfolio_session_id',
  ANALYTICS_VISITOR_COOKIE: 'portfolio_visitor_id',
  recordAnalyticsSession: jest.fn(),
}));
jest.mock('@/lib/security/analyticsSessionRateLimit', () => ({
  checkAnalyticsSessionRateLimit: jest.fn(),
}));

const enabledMock = jest.mocked(isAnalyticsEnabled);
const authMock = jest.mocked(getAnalyticsAuthenticationState);
const rateLimitMock = jest.mocked(checkAnalyticsSessionRateLimit);
const recordSessionMock = jest.mocked(recordAnalyticsSession);
const cookiesMock = jest.mocked(cookies);
const VISITOR_ID = '123e4567-e89b-42d3-a456-426614174000';
const SESSION_ID = '223e4567-e89b-42d3-a456-426614174000';
// Next.js types NODE_ENV as read-only; tests switch it through this writable view.
const env = process.env as Record<string, string | undefined>;

describe('POST /api/analytics/session', () => {
  const originalNodeEnvironment = process.env.NODE_ENV;

  beforeEach(() => {
    enabledMock.mockReturnValue(true);
    authMock.mockResolvedValue('anonymous');
    rateLimitMock.mockResolvedValue({ allowed: true });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    env.NODE_ENV = originalNodeEnvironment;
    jest.restoreAllMocks();
  });

  it('does nothing when analytics is disabled', async () => {
    enabledMock.mockReturnValue(false);

    const response = await POST({} as Request);

    expect(response.status).toBe(204);
    expect(authMock).not.toHaveBeenCalled();
  });

  it('excludes authenticated admin sessions before rate limiting', async () => {
    authMock.mockResolvedValue('authenticated');

    const response = await POST({} as Request);

    expect(response.status).toBe(204);
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(recordSessionMock).not.toHaveBeenCalled();
  });

  it('does not record a session when the source rate limit fails closed', async () => {
    rateLimitMock.mockResolvedValue({ allowed: false, reason: 'service' });

    const response = await POST({} as Request);

    expect(response.status).toBe(204);
    expect(recordSessionMock).not.toHaveBeenCalled();
  });

  it('issues secure, HTTP-only visitor and inactivity-bounded session cookies', async () => {
    env.NODE_ENV = 'production';
    const set = jest.fn();
    cookiesMock.mockResolvedValue({ get: jest.fn(() => undefined), set } as never);
    recordSessionMock.mockResolvedValue({
      sessionId: SESSION_ID,
      shouldSetVisitorCookie: true,
      visitorId: VISITOR_ID,
    });

    const response = await POST({} as Request);

    expect(response.status).toBe(204);
    expect(recordSessionMock).toHaveBeenCalledWith({ visitorCookieValue: undefined });
    expect(set).toHaveBeenNthCalledWith(1, 'portfolio_visitor_id', VISITOR_ID, {
      httpOnly: true,
      maxAge: 365 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
      secure: true,
    });
    expect(set).toHaveBeenNthCalledWith(2, 'portfolio_session_id', SESSION_ID, {
      httpOnly: true,
      maxAge: 30 * 60,
      path: '/',
      sameSite: 'lax',
      secure: true,
    });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
