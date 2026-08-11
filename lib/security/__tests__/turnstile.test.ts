/** @jest-environment node */

import { verifyTurnstileToken } from '../turnstile';

describe('verifyTurnstileToken', () => {
  const originalSecret = process.env.TURNSTILE_SECRET_KEY;

  beforeEach(() => {
    process.env.TURNSTILE_SECRET_KEY = 'server-secret';
    global.fetch = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env.TURNSTILE_SECRET_KEY = originalSecret;
    jest.restoreAllMocks();
  });

  it('fails closed without server configuration', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;

    await expect(verifyTurnstileToken({
      expectedAction: 'contact',
      token: 'token',
    })).resolves.toEqual({ reason: 'service', verified: false });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('verifies the expected action with server-only URL-encoded credentials', async () => {
    jest.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({
      action: 'contact',
      success: true,
    }), { status: 200 }));

    await expect(verifyTurnstileToken({
      expectedAction: 'contact',
      token: 'single-use-token',
    })).resolves.toEqual({ verified: true });

    const [, init] = jest.mocked(fetch).mock.calls[0];
    expect(init).toMatchObject({ cache: 'no-store', method: 'POST' });
    expect((init?.body as URLSearchParams).toString()).toBe(
      'secret=server-secret&response=single-use-token',
    );
  });

  it('rejects a valid token issued for a different action', async () => {
    jest.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({
      action: 'login',
      success: true,
    }), { status: 200 }));

    await expect(verifyTurnstileToken({
      expectedAction: 'contact',
      token: 'token',
    })).resolves.toEqual({ reason: 'invalid', verified: false });
  });

  it.each([
    [new Response(null, { status: 503 })],
    [new Response(JSON.stringify({ unexpected: true }), { status: 200 })],
  ])('fails closed on provider or response-contract failures', async (response) => {
    jest.mocked(fetch).mockResolvedValue(response);

    await expect(verifyTurnstileToken({
      expectedAction: 'contact',
      token: 'token',
    })).resolves.toEqual({ reason: 'service', verified: false });
  });
});
