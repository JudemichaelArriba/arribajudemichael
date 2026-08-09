import 'server-only';

import type { Tables } from '@/lib/models/database.types';
import {
    createSystemClient,
    SupabaseSystemConfigurationError,
} from '@/lib/supabase/system';

export type ContactBanCheckResult =
    | { checked: true; banned: boolean }
    | { checked: false };

type ContactBanLookupRow = Pick<Tables<'contact_bans'>, 'expires_at'>;

const SOURCE_IDENTIFIER_PATTERN = /^[a-f0-9]{64}$/;
const BAN_LOOKUP_TIMEOUT_MS = 5_000;

export async function checkContactSourceBan(
    sourceIdentifier: string,
): Promise<ContactBanCheckResult> {
    if (!SOURCE_IDENTIFIER_PATTERN.test(sourceIdentifier)) {
        console.error('[security/contact-ban] Source identifier is invalid.');
        return { checked: false };
    }

    let supabase: ReturnType<typeof createSystemClient>;

    try {
        supabase = createSystemClient();
    } catch (error) {
        console.error('[security/contact-ban] System client is unavailable.', {
            name:
                error instanceof SupabaseSystemConfigurationError
                    ? error.name
                    : error instanceof Error
                        ? error.name
                        : 'UnknownError',
        });
        return { checked: false };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
        () => controller.abort(),
        BAN_LOOKUP_TIMEOUT_MS,
    );

    try {
        const { data, error } = await supabase
            .from('contact_bans')
            .select('expires_at')
            .eq('ip_hash', sourceIdentifier)
            .is('revoked_at', null)
            .abortSignal(controller.signal)
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('[security/contact-ban] Lookup failed.', {
                code: error.code || 'unknown',
            });
            return { checked: false };
        }

        const ban: ContactBanLookupRow | null = data;

        if (!ban) {
            return { checked: true, banned: false };
        }

        if (ban.expires_at === null) {
            return { checked: true, banned: true };
        }

        const expiresAt = Date.parse(ban.expires_at);

        if (!Number.isFinite(expiresAt)) {
            console.error('[security/contact-ban] Ban expiration is invalid.');
            return { checked: false };
        }

        return {
            checked: true,
            banned: expiresAt > Date.now(),
        };
    } catch (error) {
        console.error('[security/contact-ban] Lookup request failed.', {
            name: error instanceof Error ? error.name : 'UnknownError',
        });
        return { checked: false };
    } finally {
        clearTimeout(timeoutId);
    }
}
