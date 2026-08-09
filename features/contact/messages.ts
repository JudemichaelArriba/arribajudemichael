import 'server-only';

import type { TablesInsert } from '@/lib/models/database.types';
import {
    createSystemClient,
    SupabaseSystemConfigurationError,
} from '@/lib/supabase/system';
import type { ValidatedContactFields } from './validation';

export type ContactMessageInsertResult =
    | { inserted: true }
    | { inserted: false };

const SOURCE_IDENTIFIER_PATTERN = /^[a-f0-9]{64}$/;
const MESSAGE_INSERT_TIMEOUT_MS = 8_000;

export async function insertContactMessage(
    fields: ValidatedContactFields,
    sourceIdentifier: string,
): Promise<ContactMessageInsertResult> {
    if (!SOURCE_IDENTIFIER_PATTERN.test(sourceIdentifier)) {
        console.error('[contact/messages] Insert source is invalid.');
        return { inserted: false };
    }

    let supabase: ReturnType<typeof createSystemClient>;

    try {
        supabase = createSystemClient();
    } catch (error) {
        console.error('[contact/messages] System client is unavailable.', {
            name:
                error instanceof SupabaseSystemConfigurationError
                    ? error.name
                    : error instanceof Error
                        ? error.name
                        : 'UnknownError',
        });
        return { inserted: false };
    }

    const messageInsert = {
        sender_name: fields.senderName,
        sender_email: fields.senderEmail,
        message: fields.message,
        source_ip_hash: sourceIdentifier,
        security_status: 'normal',
        security_reason: null,
    } satisfies TablesInsert<'messages'>;
    const controller = new AbortController();
    const timeoutId = setTimeout(
        () => controller.abort(),
        MESSAGE_INSERT_TIMEOUT_MS,
    );

    try {
        const { error } = await supabase
            .from('messages')
            .insert(messageInsert)
            .abortSignal(controller.signal);

        if (error) {
            console.error('[contact/messages] Insert failed.', {
                operation: 'insert',
                code: error.code || 'unknown',
            });
            return { inserted: false };
        }

        return { inserted: true };
    } catch (error) {
        console.error('[contact/messages] Insert request failed.', {
            operation: 'insert',
            name: error instanceof Error ? error.name : 'UnknownError',
        });
        return { inserted: false };
    } finally {
        clearTimeout(timeoutId);
    }
}
