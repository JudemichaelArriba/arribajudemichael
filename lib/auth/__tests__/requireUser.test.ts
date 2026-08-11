import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { requireUser } from '../requireUser';

jest.mock('next/navigation', () => ({ redirect: jest.fn() }));
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));

const createClientMock = jest.mocked(createClient);
const redirectMock = jest.mocked(redirect);

describe('requireUser', () => {
  it('returns the authenticated identity from verified claims', async () => {
    const claims = { role: 'authenticated', sub: 'user-123' };
    createClientMock.mockResolvedValue({
      auth: { getClaims: jest.fn().mockResolvedValue({ data: { claims }, error: null }) },
    } as never);

    await expect(requireUser()).resolves.toEqual({ claims, userId: 'user-123' });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it.each([
    [{ claims: {} }, null],
    [{ claims: { sub: 'user-123' } }, { name: 'AuthError' }],
  ])('redirects when verified claims are unavailable', async (data, error) => {
    createClientMock.mockResolvedValue({
      auth: { getClaims: jest.fn().mockResolvedValue({ data, error }) },
    } as never);

    await requireUser();

    expect(redirectMock).toHaveBeenCalledWith('/login');
  });
});
