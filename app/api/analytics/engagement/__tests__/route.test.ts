/** @jest-environment node */

import { cookies } from 'next/headers';

import {
  getAnalyticsAuthenticationState,
  isAnalyticsEnabled,
} from '@/features/analytics/request';
import { validateAnalyticsSession } from '@/features/analytics/session';
import { checkAnalyticsEngagementRateLimit } from '@/lib/security/analyticsEngagementRateLimit';
import { createSystemClient } from '@/lib/supabase/system';
import { POST } from '../route';

jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('@/features/analytics/request', () => ({
  getAnalyticsAuthenticationState: jest.fn(),
  isAnalyticsEnabled: jest.fn(),
}));
jest.mock('@/features/analytics/session', () => ({
  ANALYTICS_SESSION_COOKIE: 'portfolio_session_id',
  ANALYTICS_VISITOR_COOKIE: 'portfolio_visitor_id',
  validateAnalyticsSession: jest.fn(),
}));
jest.mock('@/lib/security/analyticsEngagementRateLimit', () => ({
  checkAnalyticsEngagementRateLimit: jest.fn(),
}));
jest.mock('@/lib/supabase/system', () => ({
  SupabaseSystemConfigurationError: class SupabaseSystemConfigurationError extends Error {},
  createSystemClient: jest.fn(),
}));

const enabledMock = jest.mocked(isAnalyticsEnabled);
const authMock = jest.mocked(getAnalyticsAuthenticationState);
const rateLimitMock = jest.mocked(checkAnalyticsEngagementRateLimit);
const validateSessionMock = jest.mocked(validateAnalyticsSession);
const createSystemClientMock = jest.mocked(createSystemClient);
const cookiesMock = jest.mocked(cookies);
const BATCH_ID = '323e4567-e89b-42d3-a456-426614174000';
const SESSION_ID = '223e4567-e89b-42d3-a456-426614174000';

function requestFor(payload: unknown, headers: Record<string, string> = {}): Request {
  const body = JSON.stringify(payload);
  return new Request('http://localhost/api/analytics/engagement', {
    body,
    headers: {
      'content-length': String(new TextEncoder().encode(body).byteLength),
      'content-type': 'application/json',
      ...headers,
    },
    method: 'POST',
  });
}

function validPayload(sectionKey = 'about') {
  return {
    batchId: BATCH_ID,
    sections: [{ maxVisibility: 0.75, sectionKey, viewCount: 1, visibleMs: 1_500 }],
  };
}

describe('POST /api/analytics/engagement', () => {
  beforeEach(() => {
    enabledMock.mockReturnValue(true);
    authMock.mockResolvedValue('anonymous');
    rateLimitMock.mockResolvedValue({ allowed: true });
    validateSessionMock.mockResolvedValue({ sessionId: SESSION_ID, valid: true });
    cookiesMock.mockResolvedValue({
      get: jest.fn((name: string) => ({
        value: name.includes('visitor')
          ? '123e4567-e89b-42d3-a456-426614174000'
          : SESSION_ID,
      })),
    } as never);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does nothing when analytics is disabled', async () => {
    enabledMock.mockReturnValue(false);

    const response = await POST(requestFor(validPayload()));

    expect(response.status).toBe(204);
    expect(authMock).not.toHaveBeenCalled();
  });

  it('excludes authenticated admin traffic before reading engagement data', async () => {
    authMock.mockResolvedValue('authenticated');

    const response = await POST(requestFor(validPayload()));

    expect(response.status).toBe(204);
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(validateSessionMock).not.toHaveBeenCalled();
  });

  it.each([
    ['home section', validPayload('home')],
    ['duplicate section keys', {
      batchId: BATCH_ID,
      sections: [validPayload().sections[0], validPayload().sections[0]],
    }],
    ['unknown request properties', { ...validPayload(), extra: true }],
    ['empty deltas', {
      batchId: BATCH_ID,
      sections: [{ maxVisibility: 0.5, sectionKey: 'about', viewCount: 0, visibleMs: 0 }],
    }],
  ])('rejects invalid payloads: %s', async (_label, payload) => {
    const response = await POST(requestFor(payload));

    expect(response.status).toBe(400);
    expect(rateLimitMock).not.toHaveBeenCalled();
  });

  it('rejects oversized bodies before rate limiting', async () => {
    const response = await POST(requestFor(validPayload(), { 'content-length': String(16 * 1024 + 1) }));

    expect(response.status).toBe(413);
    expect(rateLimitMock).not.toHaveBeenCalled();
  });

  it.each([
    [{ allowed: false, reason: 'limited' } as const, 429],
    [{ allowed: false, reason: 'service' } as const, 503],
  ])('fails closed when engagement rate limiting blocks delivery', async (limit, status) => {
    rateLimitMock.mockResolvedValue(limit);

    expect((await POST(requestFor(validPayload()))).status).toBe(status);
    expect(validateSessionMock).not.toHaveBeenCalled();
  });

  it.each([
    [{ reason: 'invalid', valid: false } as const, 401],
    [{ reason: 'service', valid: false } as const, 503],
  ])('requires a valid, active analytics session', async (session, status) => {
    validateSessionMock.mockResolvedValue(session);

    expect((await POST(requestFor(validPayload()))).status).toBe(status);
    expect(createSystemClientMock).not.toHaveBeenCalled();
  });

  it('records a validated batch through the idempotent RPC', async () => {
    const abortSignal = jest.fn().mockResolvedValue({ data: true, error: null });
    const rpc = jest.fn().mockReturnValue({ abortSignal });
    createSystemClientMock.mockReturnValue({ rpc } as never);

    const response = await POST(requestFor(validPayload()));

    expect(response.status).toBe(204);
    expect(rpc).toHaveBeenCalledWith('record_analytics_engagement_idempotent', {
      p_batch_id: BATCH_ID,
      p_sections: [{
        maxVisibility: 0.75,
        sectionKey: 'about',
        viewCount: 1,
        visibleMs: 1_500,
      }],
      p_session_id: SESSION_ID,
    });
  });

  it('fails closed when the idempotent RPC returns an error', async () => {
    const abortSignal = jest.fn().mockResolvedValue({ data: null, error: { code: 'database_error' } });
    createSystemClientMock.mockReturnValue({
      rpc: jest.fn().mockReturnValue({ abortSignal }),
    } as never);

    expect((await POST(requestFor(validPayload()))).status).toBe(503);
  });
});
