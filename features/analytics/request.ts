import 'server-only';

import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';

export type AnalyticsAuthenticationState =
    | 'anonymous'
    | 'authenticated'
    | 'unavailable';

export function isAnalyticsEnabled(): boolean {
    return process.env.ANALYTICS_ENABLED?.trim().toLowerCase() === 'true';
}

export async function getAnalyticsAuthenticationState(): Promise<AnalyticsAuthenticationState> {
    try {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase.auth.getClaims();

        if (!error && data?.claims?.sub) return 'authenticated';
        if (!error || error.name === 'AuthSessionMissingError') {
            return 'anonymous';
        }

        console.error('[analytics/authentication] Check failed.', {
            name: error.name || 'UnknownError',
        });
        return 'unavailable';
    } catch (error) {
        console.error('[analytics/authentication] Check failed.', {
            name: error instanceof Error ? error.name : 'UnknownError',
        });
        return 'unavailable';
    }
}
