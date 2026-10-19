/** @jest-environment node */

import { isSameOriginRequest } from '../requestOrigin';

function request(headers: Record<string, string>): Request {
  return new Request('https://arriba.dev/api/chat', { method: 'POST', headers });
}

describe('isSameOriginRequest', () => {
  it('accepts a same-origin browser request', () => {
    expect(
      isSameOriginRequest(
        request({ origin: 'https://arriba.dev', host: 'arriba.dev', 'sec-fetch-site': 'same-origin' }),
      ),
    ).toBe(true);
  });

  it('rejects other origins and cross-site fetch metadata', () => {
    expect(isSameOriginRequest(request({ origin: 'https://evil.example', host: 'arriba.dev' }))).toBe(false);
    expect(
      isSameOriginRequest(
        request({ origin: 'https://arriba.dev', host: 'arriba.dev', 'sec-fetch-site': 'cross-site' }),
      ),
    ).toBe(false);
  });

  it('rejects requests without an Origin header (curl, server-to-server)', () => {
    expect(isSameOriginRequest(request({ host: 'arriba.dev' }))).toBe(false);
  });

  it('rejects malformed origins and the literal "null" origin', () => {
    expect(isSameOriginRequest(request({ origin: 'null', host: 'arriba.dev' }))).toBe(false);
    expect(isSameOriginRequest(request({ origin: 'not a url', host: 'arriba.dev' }))).toBe(false);
  });

  it('allows plain http only outside production', () => {
    expect(isSameOriginRequest(request({ origin: 'http://localhost:3000', host: 'localhost:3000' }))).toBe(true);
  });
});
