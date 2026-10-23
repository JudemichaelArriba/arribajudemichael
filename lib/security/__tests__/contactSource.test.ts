import { createHmac } from 'node:crypto';

import { getContactSourceIdentifier } from '../contactSource';

function requestWith(headers: Record<string, string>): Request {
  return { headers: new Headers(headers) } as Request;
}

// Next.js types NODE_ENV as read-only; tests switch it through this writable view.
const env = process.env as Record<string, string | undefined>;

describe('getContactSourceIdentifier', () => {
  const originalEnvironment = {
    hashSecret: process.env.CONTACT_IP_HASH_SECRET,
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL,
  };

  afterEach(() => {
    process.env.CONTACT_IP_HASH_SECRET = originalEnvironment.hashSecret;
    env.NODE_ENV = originalEnvironment.nodeEnv;
    process.env.VERCEL = originalEnvironment.vercel;
  });

  it('fails closed when the HMAC secret is unavailable', () => {
    delete process.env.CONTACT_IP_HASH_SECRET;

    expect(getContactSourceIdentifier(requestWith({ 'x-real-ip': '203.0.113.8' }))).toEqual({
      ok: false,
      reason: 'configuration',
    });
  });

  it('does not trust forwarding headers in non-Vercel production', () => {
    process.env.CONTACT_IP_HASH_SECRET = 'hash-secret';
    env.NODE_ENV = 'production';
    delete process.env.VERCEL;

    expect(getContactSourceIdentifier(requestWith({ 'x-real-ip': '203.0.113.8' }))).toEqual({
      ok: false,
      reason: 'source-unavailable',
    });
  });

  it('uses the first valid trusted Vercel address and returns only its HMAC', () => {
    process.env.CONTACT_IP_HASH_SECRET = 'hash-secret';
    env.NODE_ENV = 'production';
    process.env.VERCEL = '1';

    const result = getContactSourceIdentifier(requestWith({
      'x-forwarded-for': '198.51.100.10',
      'x-real-ip': '198.51.100.9',
      'x-vercel-forwarded-for': 'invalid, 203.0.113.8, 203.0.113.9',
    }));

    expect(result).toEqual({
      identifier: createHmac('sha256', 'hash-secret').update('203.0.113.8').digest('hex'),
      ok: true,
    });
    if (result.ok) expect(result.identifier).not.toContain('203.0.113.8');
  });

  it('uses a deterministic localhost source only in development', () => {
    process.env.CONTACT_IP_HASH_SECRET = 'hash-secret';
    env.NODE_ENV = 'development';

    const first = getContactSourceIdentifier(requestWith({}));
    const second = getContactSourceIdentifier(requestWith({}));

    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
  });
});
