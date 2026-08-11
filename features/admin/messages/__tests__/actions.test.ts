import { revalidatePath } from 'next/cache';

import { requireUser } from '@/lib/auth/requireUser';
import { createClient } from '@/lib/supabase/server';
import { banMessageSource, markMessageRead } from '../actions';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/auth/requireUser', () => ({ requireUser: jest.fn() }));
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));

const requireUserMock = jest.mocked(requireUser);
const createClientMock = jest.mocked(createClient);
const MESSAGE_ID = '123e4567-e89b-42d3-a456-426614174000';
const SOURCE_HASH = 'a'.repeat(64);

function selectOne(data: unknown) {
  return {
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data, error: null }),
    select: jest.fn().mockReturnThis(),
  };
}

describe('message actions', () => {
  beforeEach(() => {
    requireUserMock.mockResolvedValue({ claims: {}, userId: 'admin-id' } as never);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('authenticates before validating a message mutation', async () => {
    const result = await markMessageRead('invalid-id');

    expect(requireUserMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).not.toHaveBeenCalled();
    expect(result.status).toBe('error');
  });

  it('does not create a client for invalid ban details', async () => {
    const result = await banMessageSource({
      duration: '7d',
      messageId: MESSAGE_ID,
      reason: '',
    });

    expect(requireUserMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ code: 'validation_error', status: 'error' });
  });

  it('derives a new ban from the stored source hash and authenticated user', async () => {
    const sourceLookup = selectOne({ id: MESSAGE_ID, source_ip_hash: SOURCE_HASH });
    const banLookup = selectOne(null);
    const maybeSingle = jest.fn().mockResolvedValue({ data: { id: 'ban-id' }, error: null });
    const select = jest.fn().mockReturnValue({ maybeSingle });
    const insert = jest.fn().mockReturnValue({ select });
    const from = jest.fn()
      .mockReturnValueOnce(sourceLookup)
      .mockReturnValueOnce(banLookup)
      .mockReturnValueOnce({ insert });
    createClientMock.mockResolvedValue({ from } as never);

    const result = await banMessageSource({
      duration: 'permanent',
      messageId: MESSAGE_ID,
      reason: 'Repeated abusive submissions.',
    });

    expect(result.status).toBe('success');
    expect(insert).toHaveBeenCalledWith({
      created_by: 'admin-id',
      expires_at: null,
      ip_hash: SOURCE_HASH,
      reason: 'Repeated abusive submissions.',
      revoked_at: null,
      source_message_id: MESSAGE_ID,
    });
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/messages');
  });
});
