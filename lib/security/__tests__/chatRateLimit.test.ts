import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

import { checkChatRateLimit } from '../chatRateLimit';

const mockMinuteLimit = jest.fn();
const mockDailyLimit = jest.fn();
const mockGlobalLimit = jest.fn();

jest.mock('@upstash/redis', () => ({
  Redis: { fromEnv: jest.fn(() => ({ client: 'redis' })) },
}));
jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: class RatelimitMock {
    static slidingWindow = jest.fn(() => ({ limiter: true }));
    limit: jest.Mock;

    constructor(options: { prefix: string }) {
      this.limit = options.prefix.endsWith(':minute')
        ? mockMinuteLimit
        : options.prefix.endsWith(':daily')
          ? mockDailyLimit
          : mockGlobalLimit;
    }
  },
}));

describe('checkChatRateLimit', () => {
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

    await expect(checkChatRateLimit('source')).resolves.toEqual({ allowed: false, reason: 'service' });
    expect(Redis.fromEnv).not.toHaveBeenCalled();
  });

  it('checks the per-visitor limits and the shared global limit', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://upstash.example';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
    for (const limit of [mockMinuteLimit, mockDailyLimit, mockGlobalLimit]) {
      limit.mockResolvedValue({ reset: Date.now() + 1_000, success: true });
    }

    await expect(checkChatRateLimit('source')).resolves.toEqual({ allowed: true });
    expect(Ratelimit.slidingWindow).toHaveBeenCalledWith(8, '1 m');
    expect(Ratelimit.slidingWindow).toHaveBeenCalledWith(40, '24 h');
    expect(Ratelimit.slidingWindow).toHaveBeenCalledWith(1_500, '24 h');
    expect(mockMinuteLimit).toHaveBeenCalledWith('source');
    expect(mockDailyLimit).toHaveBeenCalledWith('source');
    expect(mockGlobalLimit).toHaveBeenCalledWith('all');
  });

  it('limits when the global budget is spent, with Retry-After from its reset', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-20T00:00:00.000Z'));
    mockMinuteLimit.mockResolvedValue({ reset: Date.now() + 1_000, success: true });
    mockDailyLimit.mockResolvedValue({ reset: Date.now() + 1_000, success: true });
    mockGlobalLimit.mockResolvedValue({ reset: Date.now() + 30_100, success: false });

    await expect(checkChatRateLimit('source')).resolves.toEqual({
      allowed: false,
      reason: 'limited',
      retryAfterSeconds: 31,
    });
    jest.useRealTimers();
  });

  it('fails closed on Upstash timeout results', async () => {
    mockMinuteLimit.mockResolvedValue({ reason: 'timeout', reset: 0, success: true });
    mockDailyLimit.mockResolvedValue({ reset: 0, success: true });
    mockGlobalLimit.mockResolvedValue({ reset: 0, success: true });

    await expect(checkChatRateLimit('source')).resolves.toEqual({ allowed: false, reason: 'service' });
  });
});
