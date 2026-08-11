import 'server-only';

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

import { getContactSourceIdentifier } from '@/lib/security/contactSource';

export type AnalyticsSessionRateLimitResult =
    | { allowed: true }
    | { allowed: false; reason: 'limited' | 'service' };

interface AnalyticsSessionLimiters {
    daily: Ratelimit;
    short: Ratelimit;
}

const UPSTASH_TIMEOUT_MS = 5_000;

let analyticsSessionLimiters: AnalyticsSessionLimiters | null = null;

function hasRateLimitConfiguration(): boolean {
    return Boolean(
        process.env.UPSTASH_REDIS_REST_URL?.trim() &&
        process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
    );
}

function getAnalyticsSessionLimiters(): AnalyticsSessionLimiters | null {
    if (analyticsSessionLimiters) return analyticsSessionLimiters;
    if (!hasRateLimitConfiguration()) return null;

    const redis = Redis.fromEnv();
    const sharedOptions = {
        redis,
        analytics: false,
        ephemeralCache: false,
        timeout: UPSTASH_TIMEOUT_MS,
    } as const;

    analyticsSessionLimiters = {
        short: new Ratelimit({
            ...sharedOptions,
            prefix: 'portfolio:analytics:session:short',
            limiter: Ratelimit.slidingWindow(60, '10 m'),
        }),
        daily: new Ratelimit({
            ...sharedOptions,
            prefix: 'portfolio:analytics:session:daily',
            limiter: Ratelimit.slidingWindow(1_000, '24 h'),
        }),
    };

    return analyticsSessionLimiters;
}

export async function checkAnalyticsSessionRateLimit(
    request: Request,
): Promise<AnalyticsSessionRateLimitResult> {
    const source = getContactSourceIdentifier(request);

    if (!source.ok) {
        console.error('[security/analytics-rate-limit] Source identification failed.', {
            reason: source.reason,
        });
        return { allowed: false, reason: 'service' };
    }

    let limiters: AnalyticsSessionLimiters | null;

    try {
        limiters = getAnalyticsSessionLimiters();
    } catch (error) {
        console.error('[security/analytics-rate-limit] Initialization failed.', {
            name: error instanceof Error ? error.name : 'UnknownError',
        });
        return { allowed: false, reason: 'service' };
    }

    if (!limiters) {
        console.error('[security/analytics-rate-limit] Configuration is incomplete.');
        return { allowed: false, reason: 'service' };
    }

    try {
        const [shortResult, dailyResult] = await Promise.all([
            limiters.short.limit(source.identifier),
            limiters.daily.limit(source.identifier),
        ]);

        if (
            shortResult.reason === 'timeout' ||
            dailyResult.reason === 'timeout'
        ) {
            console.error('[security/analytics-rate-limit] Provider request timed out.');
            return { allowed: false, reason: 'service' };
        }

        if (!shortResult.success || !dailyResult.success) {
            return { allowed: false, reason: 'limited' };
        }

        return { allowed: true };
    } catch (error) {
        console.error('[security/analytics-rate-limit] Provider request failed.', {
            name: error instanceof Error ? error.name : 'UnknownError',
        });
        return { allowed: false, reason: 'service' };
    }
}
