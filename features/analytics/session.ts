import 'server-only';

import { randomUUID } from 'node:crypto';

import type {
    TablesInsert,
    TablesUpdate,
} from '@/lib/models/database.types';
import {
    createSystemClient,
    SupabaseSystemConfigurationError,
} from '@/lib/supabase/system';

export const ANALYTICS_VISITOR_COOKIE = 'portfolio_visitor_id';
export const ANALYTICS_SESSION_COOKIE = 'portfolio_session_id';

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION_INACTIVITY_MS = 30 * 60 * 1_000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1_000;
const DATABASE_TIMEOUT_MS = 5_000;

type DatabaseOperation = 'insert' | 'lookup' | 'update';

interface RecordAnalyticsSessionInput {
    sessionCookieValue?: string;
    visitorCookieValue?: string;
}

export interface RecordedAnalyticsSession {
    sessionId: string;
    shouldSetVisitorCookie: boolean;
    visitorId: string;
}

function parseUuid(value: string | undefined): string | null {
    if (!value || !UUID_PATTERN.test(value)) return null;
    return value.toLowerCase();
}

function isSessionActive(lastSeenAt: string, now: Date): boolean {
    const lastSeenTime = Date.parse(lastSeenAt);

    if (!Number.isFinite(lastSeenTime)) return false;

    const inactivityMs = now.getTime() - lastSeenTime;

    return (
        inactivityMs >= -MAX_CLOCK_SKEW_MS &&
        inactivityMs < SESSION_INACTIVITY_MS
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

export async function recordAnalyticsSession({
    sessionCookieValue,
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
    const storedSessionId = shouldSetVisitorCookie
        ? null
        : parseUuid(sessionCookieValue);
    const now = new Date();
    let operation: DatabaseOperation = 'lookup';

    try {
        if (storedSessionId) {
            const { data: existingSession, error: lookupError } =
                await withDatabaseTimeout(async (signal) =>
                    supabase
                        .from('analytics_sessions')
                        .select('id, last_seen_at')
                        .eq('id', storedSessionId)
                        .eq('visitor_id', visitorId)
                        .abortSignal(signal)
                        .maybeSingle(),
                );

            if (lookupError) {
                logDatabaseError('lookup', lookupError.code);
                return null;
            }

            if (
                existingSession &&
                isSessionActive(existingSession.last_seen_at, now)
            ) {
                operation = 'update';

                const sessionUpdate = {
                    last_seen_at: now.toISOString(),
                } satisfies TablesUpdate<'analytics_sessions'>;
                const { error: updateError } = await withDatabaseTimeout(
                    async (signal) =>
                        supabase
                            .from('analytics_sessions')
                            .update(sessionUpdate)
                            .eq('id', storedSessionId)
                            .eq('visitor_id', visitorId)
                            .abortSignal(signal),
                );

                if (updateError) {
                    logDatabaseError('update', updateError.code);
                    return null;
                }

                return {
                    sessionId: storedSessionId,
                    shouldSetVisitorCookie,
                    visitorId,
                };
            }
        }

        operation = 'insert';

        const sessionId = randomUUID();
        const sessionInsert = {
            id: sessionId,
            visitor_id: visitorId,
        } satisfies TablesInsert<'analytics_sessions'>;
        const { error: insertError } = await withDatabaseTimeout(
            async (signal) =>
                supabase
                    .from('analytics_sessions')
                    .insert(sessionInsert)
                    .abortSignal(signal),
        );

        if (insertError) {
            logDatabaseError('insert', insertError.code);
            return null;
        }

        return {
            sessionId,
            shouldSetVisitorCookie,
            visitorId,
        };
    } catch (error) {
        console.error('[analytics/session] Database request failed.', {
            operation,
            name: error instanceof Error ? error.name : 'UnknownError',
        });
        return null;
    }
}
