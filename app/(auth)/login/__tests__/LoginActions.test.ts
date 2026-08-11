import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { SupabaseConfigurationError } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { login, type LoginActionState } from '../LoginActions';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/navigation', () => ({ redirect: jest.fn() }));
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));

const createClientMock = jest.mocked(createClient);
const redirectMock = jest.mocked(redirect);
const revalidatePathMock = jest.mocked(revalidatePath);
const INITIAL_STATE: LoginActionState = { attempt: 0, message: '', status: 'idle' };

function loginForm(overrides: Partial<Record<'captcha' | 'email' | 'password', string>> = {}): FormData {
  const formData = new FormData();
  formData.set('email', overrides.email ?? '  admin@example.com  ');
  formData.set('password', overrides.password ?? ' password with spaces ');
  formData.set('cf-turnstile-response', overrides.captcha ?? ' captcha-token ');
  return formData;
}

function mockSignIn(result: unknown) {
  const signInWithPassword = jest.fn().mockResolvedValue(result);
  createClientMock.mockResolvedValue({ auth: { signInWithPassword } } as never);
  return signInWithPassword;
}

describe('login', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects missing credentials before creating a provider client', async () => {
    const result = await login(INITIAL_STATE, new FormData());

    expect(result).toEqual({
      attempt: 1,
      message: 'Invalid email or password.',
      status: 'error',
    });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('requires a non-empty Turnstile token before provider authentication', async () => {
    const result = await login(INITIAL_STATE, loginForm({ captcha: '   ' }));

    expect(result.message).toBe('Please complete the security check.');
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('normalizes email and CAPTCHA while preserving the password exactly', async () => {
    const signIn = mockSignIn({
      data: { session: { access_token: 'session' }, user: { id: 'user-id' } },
      error: null,
    });

    await login(INITIAL_STATE, loginForm());

    expect(signIn).toHaveBeenCalledWith({
      email: 'admin@example.com',
      options: { captchaToken: 'captcha-token' },
      password: ' password with spaces ',
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/', 'layout');
    expect(redirectMock).toHaveBeenCalledWith('/dashboard');
  });

  it.each([
    [{ code: 'invalid_credentials', name: 'AuthApiError', status: 400 }, 'Invalid email or password.'],
    [{ code: 'over_request_rate_limit', name: 'AuthApiError', status: 429 }, 'Too many sign-in attempts. Please wait and try again.'],
    [{ code: 'captcha_failed', name: 'AuthApiError', status: 400 }, 'Security verification failed. Please try again.'],
    [{ code: 'unexpected_provider_error', name: 'AuthApiError', status: 500 }, 'Sign-in is temporarily unavailable. Please try again later.'],
  ])('maps provider failures to safe client messages', async (error, expectedMessage) => {
    mockSignIn({ data: { session: null, user: null }, error });

    const result = await login({ ...INITIAL_STATE, attempt: 2 }, loginForm());

    expect(result).toEqual({ attempt: 3, message: expectedMessage, status: 'error' });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('fails safely when Supabase returns no authenticated session', async () => {
    mockSignIn({ data: { session: null, user: { id: 'user-id' } }, error: null });

    const result = await login(INITIAL_STATE, loginForm());

    expect(result.message).toBe('Sign-in is temporarily unavailable. Please try again later.');
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('does not expose configuration failures', async () => {
    createClientMock.mockRejectedValue(new SupabaseConfigurationError());

    const result = await login(INITIAL_STATE, loginForm());

    expect(result.message).toBe('Sign-in is temporarily unavailable. Please try again later.');
    expect(result.message).not.toContain('Supabase');
  });
});
