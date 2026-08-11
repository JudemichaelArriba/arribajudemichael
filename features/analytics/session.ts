import 'server-only';

import { randomUUID } from 'node:crypto';

import type { Database } from '@/lib/models/database.types';
import {
    createSystemClient,
    SupabaseSystemConfigurationError,
} from '@/lib/supabase/system';
import { ANALYTICS_SESSION_INACTIVITY_MS } from './constants';

export const ANALYTICS_VISITOR_COOKIE = 'portfolio_visitor_id';
export const ANALYTICS_SESSION_COOKIE = 'portfolio_session_id';

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1_000;
const DATABASE_TIMEOUT_MS = 5_000;

type DatabaseOperation = 'lookup' | 'rpc';

interface AnalyticsSessionCookieInput {
    sessionCookieValue?: string;
    visitorCookieValue?: string;
}

type RecordAnalyticsSessionInput = Pick<
    AnalyticsSessionCookieInput,
    'visitorCookieValue'
>;

type GetOrCreateAnalyticsSessionResult =
    Database['public']['Functions']['get_or_create_analytics_session']['Returns'];

export type AnalyticsSessionValidationResult =
    | { valid: true; sessionId: string }
    | { valid: false; reason: 'invalid' | 'service' };

export interface RecordedAnalyticsSession {
    sessionId: string;
    shouldSetVisitorCookie: boolean;
    visitorId: string;
}

function parseUuid(value: string | undefined): string | null {
    if (!value || !UUID_PATTERN.test(value)) return null;
    return value.toLowerCase();
}

function parseCreatedSessionId(
    data: GetOrCreateAnalyticsSessionResult | null,
): string | null {
    if (!Array.isArray(data) || data.length !== 1) return null;

    const [row] = data;

    if (!row || typeof row.created !== 'boolean') return null;

    return parseUuid(row.session_id);
}

function isSessionActive(lastSeenAt: string, now: Date): boolean {
    const lastSeenTime = Date.parse(lastSeenAt);

    if (!Number.isFinite(lastSeenTime)) return false;

    const inactivityMs = now.getTime() - lastSeenTime;

    return (
        inactivityMs >= -MAX_CLOCK_SKEW_MS &&
        inactivityMs < ANALYTICS_SESSION_INACTIVITY_MS
    );
}

async function withDatabaseTimeout<T>(
    operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DATABASE_TIMEOUT_MS);

    try {
        return await operation(controller.signal);
    } finally {
        clearTimeout(timeoutId);
    }
}

function logDatabaseError(operation: DatabaseOperation, code: string): void {
    console.error('[analytics/session] Database operation failed.', {
        operation,
        code: code || 'unknown',
    });
}

export async function validateAnalyticsSession({
    sessionCookieValue,
    visitorCookieValue,
}: AnalyticsSessionCookieInput): Promise<AnalyticsSessionValidationResult> {
    const visitorId = parseUuid(visitorCookieValue);
    const sessionId = parseUuid(sessionCookieValue);

    if (!visitorId || !sessionId) {
        return { valid: false, reason: 'invalid' };
    }

    let supabase: ReturnType<typeof createSystemClient>;

    try {
        supabase = createSystemClient();
    } catch (error) {
        console.error('[analytics/session] System client is unavailable.', {
            name:
                error instanceof SupabaseSystemConfigurationError
                    ? error.name
                    : error instanceof Error
                        ? error.name
                        : 'UnknownError',
        });
        return { valid: false, reason: 'service' };
    }

    try {
        const { data: existingSession, error: lookupError } =
            await withDatabaseTimeout(async (signal) =>
                supabase
                    .from('analytics_sessions')
                    .select('last_seen_at')
                    .eq('id', sessionId)
                    .eq('visitor_id', visitorId)
                    .abortSignal(signal)
                    .maybeSingle(),
            );

        if (lookupError) {
            logDatabaseError('lookup', lookupError.code);
            return { valid: false, reason: 'service' };
        }

        if (
            !existingSession ||
            !isSessionActive(existingSession.last_seen_at, new Date())
        ) {
            return { valid: false, reason: 'invalid' };
        }

        return { valid: true, sessionId };
    } catch (error) {
        console.error('[analytics/session] Database request failed.', {
            operation: 'lookup',
            name: error instanceof Error ? error.name : 'UnknownError',
        });
        return { valid: false, reason: 'service' };
    }
}

export async function recordAnalyticsSession({
    visitorCookieValue,
}: RecordAnalyticsSessionInput): Promise<RecordedAnalyticsSession | null> {
    let supabase: ReturnType<typeof createSystemClient>;

    try {
        supabase = createSystemClient();
    } catch (error) {
        console.error('[analytics/session] System client is unavailable.', {
            name:
                error instanceof SupabaseSystemConfigurationError
                    ? error.name
                    : error instanceof Error
                        ? error.name
                        : 'UnknownError',
        });
        return null;
    }

    const storedVisitorId = parseUuid(visitorCookieValue);
    const visitorId = storedVisitorId ?? randomUUID();
    const shouldSetVisitorCookie = storedVisitorId === null;

    try {
        const { data, error: rpcError } = await withDatabaseTimeout(
            async (signal) =>
                supabase
                    .rpc('get_or_create_analytics_session', {
                        p_visitor_id: visitorId,
                        p_inactivity_seconds:
                            ANALYTICS_SESSION_INACTIVITY_MS / 1_000,
                    })
                    .abortSignal(signal),
        );

        if (rpcError) {
            logDatabaseError('rpc', rpcError.code);
            return null;
        }

        const sessionId = parseCreatedSessionId(data);

        if (!sessionId) {
            console.error('[analytics/session] RPC returned an invalid result.', {
                operation: 'rpc',
            });
            return null;
        }

        return {
            sessionId,
            shouldSetVisitorCookie,
            visitorId,
        };
    } catch (error) {
        console.error('[analytics/session] Database request failed.', {
            operation: 'rpc',
            name: error instanceof Error ? error.name : 'UnknownError',
        });
        return null;
    }
}
