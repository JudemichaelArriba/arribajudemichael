import { createSystemClient } from '@/lib/supabase/system';
import { checkContactSourceBan } from '../contactBan';

jest.mock('@/lib/supabase/system', () => ({
  SupabaseSystemConfigurationError: class SupabaseSystemConfigurationError extends Error {},
  createSystemClient: jest.fn(),
}));

const createSystemClientMock = jest.mocked(createSystemClient);
const SOURCE_HASH = 'a'.repeat(64);

function banLookup(data: unknown, error: unknown = null) {
  const query = {
    abortSignal: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data, error }),
    select: jest.fn().mockReturnThis(),
  };
  createSystemClientMock.mockReturnValue({ from: jest.fn(() => query) } as never);
}

describe('checkContactSourceBan', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-12T00:00:00.000Z'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('rejects malformed source identifiers before database access', async () => {
    await expect(checkContactSourceBan('raw-ip-address')).resolves.toEqual({ checked: false });
    expect(createSystemClientMock).not.toHaveBeenCalled();
  });

  it.each([
    [null, false],
    [{ expires_at: null }, true],
    [{ expires_at: '2026-08-12T00:10:00.000Z' }, true],
    [{ expires_at: '2026-08-11T23:59:59.000Z' }, false],
  ])('interprets active and expired ban records safely', async (data, banned) => {
    banLookup(data);

    await expect(checkContactSourceBan(SOURCE_HASH)).resolves.toEqual({
      banned,
      checked: true,
    });
  });

  it('fails closed when the ban lookup is unavailable', async () => {
    banLookup(null, { code: 'database_unavailable' });

    await expect(checkContactSourceBan(SOURCE_HASH)).resolves.toEqual({ checked: false });
  });
});
