import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

import { checkContactRateLimit } from '../contactRateLimit';

const mockShortLimit = jest.fn();
const mockDailyLimit = jest.fn();

jest.mock('@upstash/redis', () => ({
  Redis: { fromEnv: jest.fn(() => ({ client: 'redis' })) },
}));
jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: class RatelimitMock {
    static slidingWindow = jest.fn(() => ({ limiter: true }));
    limit: jest.Mock;

    constructor(options: { prefix: string }) {
      this.limit = options.prefix.endsWith(':short') ? mockShortLimit : mockDailyLimit;
    }
  },
}));

describe('checkContactRateLimit', () => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    jest.restoreAllMocks();
  });

  it('fails closed when provider configuration is missing', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    await expect(checkContactRateLimit('source')).resolves.toEqual({
      allowed: false,
      reason: 'service',
    });
    expect(Redis.fromEnv).not.toHaveBeenCalled();
  });

  it('requires both shared limits to allow an attempt', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://upstash.example';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
    mockShortLimit.mockResolvedValue({ reset: Date.now() + 1_000, success: true });
    mockDailyLimit.mockResolvedValue({ reset: Date.now() + 1_000, success: true });

    await expect(checkContactRateLimit('source')).resolves.toEqual({ allowed: true });
    expect(Ratelimit.slidingWindow).toHaveBeenCalledWith(3, '10 m');
    expect(Ratelimit.slidingWindow).toHaveBeenCalledWith(10, '24 h');
    expect(mockShortLimit).toHaveBeenCalledWith('source');
    expect(mockDailyLimit).toHaveBeenCalledWith('source');
  });

  it('returns the latest denied reset as Retry-After', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-12T00:00:00.000Z'));
    mockShortLimit.mockResolvedValue({ reset: Date.now() + 10_100, success: false });
    mockDailyLimit.mockResolvedValue({ reset: Date.now() + 20_100, success: false });

    await expect(checkContactRateLimit('source')).resolves.toEqual({
      allowed: false,
      reason: 'limited',
      retryAfterSeconds: 21,
    });
    jest.useRealTimers();
  });

  it('fails closed on Upstash timeout results', async () => {
    mockShortLimit.mockResolvedValue({ reason: 'timeout', reset: 0, success: true });
    mockDailyLimit.mockResolvedValue({ reset: 0, success: true });

    await expect(checkContactRateLimit('source')).resolves.toEqual({
      allowed: false,
      reason: 'service',
    });
  });
});
