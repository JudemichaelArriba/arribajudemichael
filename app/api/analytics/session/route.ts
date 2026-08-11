import { cookies } from 'next/headers';

import {
    ANALYTICS_SESSION_COOKIE,
    ANALYTICS_VISITOR_COOKIE,
    recordAnalyticsSession,
} from '@/features/analytics/session';
import { checkAnalyticsSessionRateLimit } from '@/lib/security/analyticsSessionRateLimit';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const VISITOR_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
const SESSION_COOKIE_MAX_AGE_SECONDS = 30 * 60;

type AuthenticationState = 'anonymous' | 'authenticated' | 'unavailable';

function isAnalyticsEnabled(): boolean {
    return process.env.ANALYTICS_ENABLED?.trim().toLowerCase() === 'true';
}

function noContentResponse(): Response {
    return new Response(null, {
        status: 204,
        headers: {
            'Cache-Control': 'no-store',
        },
    });
}

async function getAuthenticationState(): Promise<AuthenticationState> {
    try {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase.auth.getClaims();

        if (!error && data?.claims?.sub) return 'authenticated';
        if (!error || error.name === 'AuthSessionMissingError') return 'anonymous';

        console.error('[api/analytics/session] Authentication check failed.', {
            name: error.name || 'UnknownError',
        });
        return 'unavailable';
    } catch (error) {
        console.error('[api/analytics/session] Authentication check failed.', {
            name: error instanceof Error ? error.name : 'UnknownError',
        });
        return 'unavailable';
    }
}

export async function POST(request: Request): Promise<Response> {
    if (!isAnalyticsEnabled()) return noContentResponse();

    const authenticationState = await getAuthenticationState();

    if (authenticationState !== 'anonymous') return noContentResponse();

    const rateLimit = await checkAnalyticsSessionRateLimit(request);

    if (!rateLimit.allowed) return noContentResponse();

    try {
        const cookieStore = await cookies();
        const recordedSession = await recordAnalyticsSession({
            visitorCookieValue: cookieStore.get(ANALYTICS_VISITOR_COOKIE)?.value,
            sessionCookieValue: cookieStore.get(ANALYTICS_SESSION_COOKIE)?.value,
        });

        if (!recordedSession) return noContentResponse();

        const sharedCookieOptions = {
            httpOnly: true,
            sameSite: 'lax' as const,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
        };

        if (recordedSession.shouldSetVisitorCookie) {
            cookieStore.set(
                ANALYTICS_VISITOR_COOKIE,
                recordedSession.visitorId,
                {
                    ...sharedCookieOptions,
                    maxAge: VISITOR_COOKIE_MAX_AGE_SECONDS,
                },
            );
        }

        cookieStore.set(
            ANALYTICS_SESSION_COOKIE,
            recordedSession.sessionId,
            {
                ...sharedCookieOptions,
                maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
            },
        );
    } catch (error) {
        console.error('[api/analytics/session] Session recording failed.', {
            name: error instanceof Error ? error.name : 'UnknownError',
        });
    }

    return noContentResponse();
}
