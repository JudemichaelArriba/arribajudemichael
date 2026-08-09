import 'server-only';

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export type ContactRateLimitResult =
    | { allowed: true }
    | { allowed: false; reason: 'limited'; retryAfterSeconds: number }
    | { allowed: false; reason: 'service' };

interface ContactLimiters {
    short: Ratelimit;
    daily: Ratelimit;
}

const UPSTASH_TIMEOUT_MS = 5_000;
const RETRY_AFTER_FALLBACK_SECONDS = 1;

let contactLimiters: ContactLimiters | null = null;

function hasRateLimitConfiguration(): boolean {
    return Boolean(
        process.env.UPSTASH_REDIS_REST_URL?.trim() &&
        process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
    );
}

function getContactLimiters(): ContactLimiters | null {
    if (contactLimiters) return contactLimiters;
    if (!hasRateLimitConfiguration()) return null;

    const redis = Redis.fromEnv();
    const sharedOptions = {
        redis,
        analytics: false,
        ephemeralCache: false,
        timeout: UPSTASH_TIMEOUT_MS,
    } as const;

    contactLimiters = {
        short: new Ratelimit({
            ...sharedOptions,
            prefix: 'portfolio:contact:short',
            limiter: Ratelimit.slidingWindow(3, '10 m'),
        }),
        daily: new Ratelimit({
            ...sharedOptions,
            prefix: 'portfolio:contact:daily',
            limiter: Ratelimit.slidingWindow(10, '24 h'),
        }),
    };

    return contactLimiters;
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

export async function checkContactRateLimit(
    sourceIdentifier: string,
): Promise<ContactRateLimitResult> {
    let limiters: ContactLimiters | null;

    try {
        limiters = getContactLimiters();
    } catch (error) {
        console.error('[security/contact-rate-limit] Initialization failed.', {
            name: error instanceof Error ? error.name : 'UnknownError',
        });
        return { allowed: false, reason: 'service' };
    }

    if (!limiters) {
        console.error('[security/contact-rate-limit] Configuration is incomplete.');
        return { allowed: false, reason: 'service' };
    }

    try {
        const [shortResult, dailyResult] = await Promise.all([
            limiters.short.limit(sourceIdentifier),
            limiters.daily.limit(sourceIdentifier),
        ]);

        if (
            shortResult.reason === 'timeout' ||
            dailyResult.reason === 'timeout'
        ) {
            console.error('[security/contact-rate-limit] Provider request timed out.');
            return { allowed: false, reason: 'service' };
        }

        if (shortResult.success && dailyResult.success) {
            return { allowed: true };
        }

        const deniedResetTimestamps = [shortResult, dailyResult]
            .filter((result) => !result.success)
            .map((result) => result.reset);

        return {
            allowed: false,
            reason: 'limited',
            retryAfterSeconds: getRetryAfterSeconds(deniedResetTimestamps),
        };
    } catch (error) {
        console.error('[security/contact-rate-limit] Provider request failed.', {
            name: error instanceof Error ? error.name : 'UnknownError',
        });
        return { allowed: false, reason: 'service' };
    }
}
