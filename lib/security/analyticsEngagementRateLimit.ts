import 'server-only';

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

import { getContactSourceIdentifier } from '@/lib/security/contactSource';

export type AnalyticsEngagementRateLimitResult =
    | { allowed: true }
    | { allowed: false; reason: 'limited' | 'service' };

const UPSTASH_TIMEOUT_MS = 5_000;

let analyticsEngagementLimiter: Ratelimit | null = null;

function hasRateLimitConfiguration(): boolean {
    return Boolean(
        process.env.UPSTASH_REDIS_REST_URL?.trim() &&
        process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
    );
}

function getAnalyticsEngagementLimiter(): Ratelimit | null {
    if (analyticsEngagementLimiter) return analyticsEngagementLimiter;
    if (!hasRateLimitConfiguration()) return null;

    analyticsEngagementLimiter = new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(60, '10 m'),
        prefix: 'portfolio:analytics:engagement',
        analytics: false,
        ephemeralCache: false,
        timeout: UPSTASH_TIMEOUT_MS,
    });

    return analyticsEngagementLimiter;
}

export async function checkAnalyticsEngagementRateLimit(
    request: Request,
): Promise<AnalyticsEngagementRateLimitResult> {
    const source = getContactSourceIdentifier(request);

    if (!source.ok) {
        console.error(
            '[security/analytics-engagement-rate-limit] Source identification failed.',
            { reason: source.reason },
        );
        return { allowed: false, reason: 'service' };
    }

    let limiter: Ratelimit | null;

    try {
        limiter = getAnalyticsEngagementLimiter();
    } catch (error) {
        console.error(
            '[security/analytics-engagement-rate-limit] Initialization failed.',
            { name: error instanceof Error ? error.name : 'UnknownError' },
        );
        return { allowed: false, reason: 'service' };
    }

    if (!limiter) {
        console.error(
            '[security/analytics-engagement-rate-limit] Configuration is incomplete.',
        );
        return { allowed: false, reason: 'service' };
    }

    try {
        const result = await limiter.limit(source.identifier);

        if (result.reason === 'timeout') {
            console.error(
                '[security/analytics-engagement-rate-limit] Provider request timed out.',
            );
            return { allowed: false, reason: 'service' };
        }

        return result.success
            ? { allowed: true }
            : { allowed: false, reason: 'limited' };
    } catch (error) {
        console.error(
            '[security/analytics-engagement-rate-limit] Provider request failed.',
            { name: error instanceof Error ? error.name : 'UnknownError' },
        );
        return { allowed: false, reason: 'service' };
    }
}
