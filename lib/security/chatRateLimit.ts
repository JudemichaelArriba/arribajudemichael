import 'server-only';

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export type ChatRateLimitResult =
    | { allowed: true }
    | { allowed: false; reason: 'limited'; retryAfterSeconds: number }
    | { allowed: false; reason: 'service' };

interface ChatLimiters {
    minute: Ratelimit;
    daily: Ratelimit;
    global: Ratelimit;
}

const UPSTASH_TIMEOUT_MS = 5_000;
const RETRY_AFTER_FALLBACK_SECONDS = 1;
// One shared bucket for every visitor: a ceiling on daily model spend, whatever the traffic.
const GLOBAL_IDENTIFIER = 'all';

let chatLimiters: ChatLimiters | null = null;

function hasRateLimitConfiguration(): boolean {
    return Boolean(
        process.env.UPSTASH_REDIS_REST_URL?.trim() &&
        process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
    );
}

function getChatLimiters(): ChatLimiters | null {
    if (chatLimiters) return chatLimiters;
    if (!hasRateLimitConfiguration()) return null;

    const redis = Redis.fromEnv();
    const sharedOptions = {
        redis,
        analytics: false,
        ephemeralCache: false,
        timeout: UPSTASH_TIMEOUT_MS,
    } as const;

    chatLimiters = {
        minute: new Ratelimit({
            ...sharedOptions,
            prefix: 'portfolio:chat:minute',
            limiter: Ratelimit.slidingWindow(8, '1 m'),
        }),
        daily: new Ratelimit({
            ...sharedOptions,
            prefix: 'portfolio:chat:daily',
            limiter: Ratelimit.slidingWindow(40, '24 h'),
        }),
        global: new Ratelimit({
            ...sharedOptions,
            prefix: 'portfolio:chat:global',
            limiter: Ratelimit.slidingWindow(1_500, '24 h'),
        }),
    };

    return chatLimiters;
}

function getRetryAfterSeconds(resetTimestamps: number[]): number {
    const finiteResets = resetTimestamps.filter(Number.isFinite);

    if (finiteResets.length === 0) {
        return RETRY_AFTER_FALLBACK_SECONDS;
    }

    const latestReset = Math.max(...finiteResets);
    return Math.max(
        RETRY_AFTER_FALLBACK_SECONDS,
        Math.ceil((latestReset - Date.now()) / 1_000),
    );
}

export async function checkChatRateLimit(
    sourceIdentifier: string,
): Promise<ChatRateLimitResult> {
    let limiters: ChatLimiters | null;

    try {
        limiters = getChatLimiters();
    } catch (error) {
        console.error('[security/chat-rate-limit] Initialization failed.', {
            name: error instanceof Error ? error.name : 'UnknownError',
        });
        return { allowed: false, reason: 'service' };
    }

    if (!limiters) {
        console.error('[security/chat-rate-limit] Configuration is incomplete.');
        return { allowed: false, reason: 'service' };
    }

    try {
        const results = await Promise.all([
            limiters.minute.limit(sourceIdentifier),
            limiters.daily.limit(sourceIdentifier),
            limiters.global.limit(GLOBAL_IDENTIFIER),
        ]);

        if (results.some((result) => result.reason === 'timeout')) {
            console.error('[security/chat-rate-limit] Provider request timed out.');
            return { allowed: false, reason: 'service' };
        }

        if (results.every((result) => result.success)) {
            return { allowed: true };
        }

        return {
            allowed: false,
            reason: 'limited',
            retryAfterSeconds: getRetryAfterSeconds(
                results.filter((result) => !result.success).map((result) => result.reset),
            ),
        };
    } catch (error) {
        console.error('[security/chat-rate-limit] Provider request failed.', {
            name: error instanceof Error ? error.name : 'UnknownError',
        });
        return { allowed: false, reason: 'service' };
    }
}
