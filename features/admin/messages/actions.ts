'use server';

import { revalidatePath } from 'next/cache';

import { requireUser } from '@/lib/auth/requireUser';
import { createClient } from '@/lib/supabase/server';
import type {
    BanDuration,
    BanSourceActionCode,
    BanSourceActionResult,
    BanSourceFieldErrors,
    BanSourceInput,
    ContactBan,
    ContactBanInsert,
    ContactBanUpdate,
    MessageActionResult,
    MessageUpdate,
} from './types';
import {
    isMessageId,
    validateBanSourceInput,
} from './validation';

type MessageOperation =
    | 'mark-read'
    | 'mark-unread'
    | 'star'
    | 'unstar'
    | 'archive'
    | 'restore'
    | 'delete'
    | 'ban-source'
    | 'revoke-source';

type MessageUpdateOperation = Exclude<
    MessageOperation,
    'delete' | 'ban-source' | 'revoke-source'
>;

type MessageSourceLookupResult =
    | { ok: true; sourceIdentifier: string }
    | { ok: false; result: BanSourceActionResult };

type UnrevokedBanRow = Pick<ContactBan, 'id' | 'expires_at'>;

const SOURCE_IDENTIFIER_PATTERN = /^[a-f0-9]{64}$/;
const UNIQUE_VIOLATION_CODE = '23505';
const BAN_DURATION_MILLISECONDS: Record<
    Exclude<BanDuration, 'permanent'>,
    number
> = {
    '24h': 24 * 60 * 60 * 1_000,
    '7d': 7 * 24 * 60 * 60 * 1_000,
    '30d': 30 * 24 * 60 * 60 * 1_000,
};

function actionResult(
    status: MessageActionResult['status'],
    message: string,
): MessageActionResult {
    return { status, message };
}

function banActionResult(
    status: BanSourceActionResult['status'],
    message: string,
    code?: BanSourceActionCode,
    fieldErrors?: BanSourceFieldErrors,
): BanSourceActionResult {
    return {
        status,
        message,
        ...(code ? { code } : {}),
        ...(fieldErrors && Object.keys(fieldErrors).length > 0
            ? { fieldErrors }
            : {}),
    };
}

function getErrorCode(error: unknown): string {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
        return 'unknown';
    }

    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : 'unknown';
}

function logMutationFailure(operation: MessageOperation, error: unknown) {
    console.error(`[messages/${operation}] Operation failed.`, {
        code: getErrorCode(error),
    });
}

function getOperationFailureMessage(operation: MessageOperation): string {
    if (operation === 'archive' || operation === 'restore') {
        return operation === 'archive'
            ? 'Unable to archive this message.'
            : 'Unable to restore this message.';
    }

    if (operation === 'delete') {
        return 'Unable to delete this message.';
    }

    return 'Unable to update this message.';
}

function invalidateMessages() {
    revalidatePath('/dashboard/messages');
}

async function updateMessage(
    messageId: string,
    operation: MessageUpdateOperation,
    update: MessageUpdate,
    successMessage: string,
): Promise<MessageActionResult> {
    if (!isMessageId(messageId)) {
        return actionResult('error', 'Unable to identify this message.');
    }

    try {
        const supabase = await createClient();
        const { data: existingMessage, error: readError } = await supabase
            .from('messages')
            .select('id')
            .eq('id', messageId)
            .maybeSingle();

        if (readError) {
            logMutationFailure(operation, readError);
            return actionResult('error', getOperationFailureMessage(operation));
        }

        if (!existingMessage) {
            return actionResult('error', 'This message is no longer available.');
        }

        const { data: updatedMessage, error } = await supabase
            .from('messages')
            .update(update)
            .eq('id', messageId)
            .select('id')
            .maybeSingle();

        if (error) {
            logMutationFailure(operation, error);
            return actionResult('error', getOperationFailureMessage(operation));
        }

        if (!updatedMessage) {
            return actionResult('error', 'This message is no longer available.');
        }

        invalidateMessages();
        return actionResult('success', successMessage);
    } catch (error) {
        logMutationFailure(operation, error);
        return actionResult('error', getOperationFailureMessage(operation));
    }
}

function getBanExpiration(
    duration: BanDuration,
    now: Date,
): string | null {
    if (duration === 'permanent') return null;
    return new Date(
        now.getTime() + BAN_DURATION_MILLISECONDS[duration],
    ).toISOString();
}

function getUnrevokedBanState(
    expiresAt: string | null,
    nowMilliseconds: number,
): 'active' | 'expired' | 'invalid' {
    if (expiresAt === null) return 'active';

    const expiration = Date.parse(expiresAt);
    if (!Number.isFinite(expiration)) return 'invalid';
    return expiration > nowMilliseconds ? 'active' : 'expired';
}

async function getMessageSourceIdentifier(
    supabase: Awaited<ReturnType<typeof createClient>>,
    messageId: string,
    operation: 'ban-source' | 'revoke-source',
): Promise<MessageSourceLookupResult> {
    const { data: message, error } = await supabase
        .from('messages')
        .select('id,source_ip_hash')
        .eq('id', messageId)
        .maybeSingle();

    if (error) {
        logMutationFailure(operation, error);
        return {
            ok: false,
            result: banActionResult(
                'error',
                'Unable to update this source right now.',
                'operation_failed',
            ),
        };
    }

    if (!message) {
        return {
            ok: false,
            result: banActionResult(
                'error',
                'This message is no longer available.',
                'message_unavailable',
            ),
        };
    }

    if (
        message.source_ip_hash === null ||
        !SOURCE_IDENTIFIER_PATTERN.test(message.source_ip_hash)
    ) {
        return {
            ok: false,
            result: banActionResult(
                'error',
                'This message does not have a source identifier available for banning.',
                'source_unavailable',
            ),
        };
    }

    return {
        ok: true,
        sourceIdentifier: message.source_ip_hash,
    };
}

async function getUnrevokedSourceBan(
    supabase: Awaited<ReturnType<typeof createClient>>,
    sourceIdentifier: string,
    operation: 'ban-source' | 'revoke-source',
): Promise<
    | { ok: true; ban: UnrevokedBanRow | null }
    | { ok: false; result: BanSourceActionResult }
> {
    const { data, error } = await supabase
        .from('contact_bans')
        .select('id,expires_at')
        .eq('ip_hash', sourceIdentifier)
        .is('revoked_at', null)
        .limit(1)
        .maybeSingle();

    if (error) {
        logMutationFailure(operation, error);
        return {
            ok: false,
            result: banActionResult(
                'error',
                'Unable to update this source right now.',
                'operation_failed',
            ),
        };
    }

    return { ok: true, ban: data };
}

export async function markMessageRead(
    messageId: string,
): Promise<MessageActionResult> {
    await requireUser();

    return updateMessage(
        messageId,
        'mark-read',
        {
            is_read: true,
            read_at: new Date().toISOString(),
        },
        'Message marked as read.',
    );
}

export async function markMessageUnread(
    messageId: string,
): Promise<MessageActionResult> {
    await requireUser();

    return updateMessage(
        messageId,
        'mark-unread',
        {
            is_read: false,
            read_at: null,
        },
        'Message marked as unread.',
    );
}

export async function setMessageStarred(
    messageId: string,
    starred: boolean,
): Promise<MessageActionResult> {
    await requireUser();

    if (typeof starred !== 'boolean') {
        return actionResult('error', 'Unable to update this message.');
    }

    return updateMessage(
        messageId,
        starred ? 'star' : 'unstar',
        { is_starred: starred },
        starred ? 'Message starred.' : 'Star removed.',
    );
}

export async function archiveMessage(
    messageId: string,
): Promise<MessageActionResult> {
    await requireUser();

    return updateMessage(
        messageId,
        'archive',
        {
            is_archived: true,
            archived_at: new Date().toISOString(),
        },
        'Message archived.',
    );
}

export async function restoreMessage(
    messageId: string,
): Promise<MessageActionResult> {
    await requireUser();

    return updateMessage(
        messageId,
        'restore',
        {
            is_archived: false,
            archived_at: null,
        },
        'Message restored to the inbox.',
    );
}

export async function deleteMessage(
    messageId: string,
): Promise<MessageActionResult> {
    await requireUser();

    if (!isMessageId(messageId)) {
        return actionResult('error', 'Unable to identify this message.');
    }

    try {
        const supabase = await createClient();
        const { data: existingMessage, error: readError } = await supabase
            .from('messages')
            .select('id')
            .eq('id', messageId)
            .maybeSingle();

        if (readError) {
            logMutationFailure('delete', readError);
            return actionResult('error', 'Unable to delete this message.');
        }

        if (!existingMessage) {
            return actionResult('error', 'This message is no longer available.');
        }

        const { data: deletedMessage, error } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId)
            .select('id')
            .maybeSingle();

        if (error) {
            logMutationFailure('delete', error);
            return actionResult('error', 'Unable to delete this message.');
        }

        if (!deletedMessage) {
            return actionResult('error', 'This message is no longer available.');
        }

        invalidateMessages();
        return actionResult('success', 'Message deleted permanently.');
    } catch (error) {
        logMutationFailure('delete', error);
        return actionResult('error', 'Unable to delete this message.');
    }
}

export async function banMessageSource(
    input: BanSourceInput,
): Promise<BanSourceActionResult> {
    const { userId } = await requireUser();
    const validation = validateBanSourceInput(input);

    if (!validation.success) {
        return banActionResult(
            'error',
            validation.message,
            'validation_error',
            validation.fieldErrors,
        );
    }

    const now = new Date();

    try {
        const supabase = await createClient();
        const sourceLookup = await getMessageSourceIdentifier(
            supabase,
            validation.data.messageId,
            'ban-source',
        );
        if (!sourceLookup.ok) return sourceLookup.result;

        const existingBanResult = await getUnrevokedSourceBan(
            supabase,
            sourceLookup.sourceIdentifier,
            'ban-source',
        );
        if (!existingBanResult.ok) return existingBanResult.result;

        if (existingBanResult.ban) {
            const existingState = getUnrevokedBanState(
                existingBanResult.ban.expires_at,
                now.getTime(),
            );

            if (existingState === 'invalid') {
                logMutationFailure('ban-source', {
                    code: 'invalid_expiration',
                });
                return banActionResult(
                    'error',
                    'Unable to update this source right now.',
                    'operation_failed',
                );
            }

            if (existingState === 'active') {
                return banActionResult(
                    'error',
                    'This message source is already banned.',
                    'already_banned',
                );
            }

            const expiredBanUpdate = {
                revoked_at: now.toISOString(),
            } satisfies ContactBanUpdate;
            const {
                data: revokedExpiredBan,
                error: revokeExpiredError,
            } = await supabase
                .from('contact_bans')
                .update(expiredBanUpdate)
                .eq('id', existingBanResult.ban.id)
                .is('revoked_at', null)
                .select('id')
                .maybeSingle();

            if (revokeExpiredError) {
                logMutationFailure('ban-source', revokeExpiredError);
                return banActionResult(
                    'error',
                    'Unable to update this source right now.',
                    'operation_failed',
                );
            }

            if (!revokedExpiredBan) {
                const concurrentBanResult = await getUnrevokedSourceBan(
                    supabase,
                    sourceLookup.sourceIdentifier,
                    'ban-source',
                );
                if (!concurrentBanResult.ok) return concurrentBanResult.result;

                if (concurrentBanResult.ban) {
                    const concurrentState = getUnrevokedBanState(
                        concurrentBanResult.ban.expires_at,
                        Date.now(),
                    );

                    if (concurrentState === 'active') {
                        return banActionResult(
                            'error',
                            'This message source is already banned.',
                            'already_banned',
                        );
                    }

                    logMutationFailure('ban-source', {
                        code: concurrentState === 'expired'
                            ? 'expired_ban_not_revoked'
                            : 'invalid_expiration',
                    });
                    return banActionResult(
                        'error',
                        'Unable to update this source right now.',
                        'operation_failed',
                    );
                }
            }
        }

        const insert = {
            ip_hash: sourceLookup.sourceIdentifier,
            reason: validation.data.reason,
            source_message_id: validation.data.messageId,
            created_by: userId,
            expires_at: getBanExpiration(validation.data.duration, now),
            revoked_at: null,
        } satisfies ContactBanInsert;
        const { data: createdBan, error } = await supabase
            .from('contact_bans')
            .insert(insert)
            .select('id')
            .maybeSingle();

        if (error) {
            if (getErrorCode(error) === UNIQUE_VIOLATION_CODE) {
                return banActionResult(
                    'error',
                    'This message source is already banned.',
                    'already_banned',
                );
            }

            logMutationFailure('ban-source', error);
            return banActionResult(
                'error',
                'Unable to ban this source right now.',
                'operation_failed',
            );
        }

        if (!createdBan) {
            logMutationFailure('ban-source', { code: 'no_row_inserted' });
            return banActionResult(
                'error',
                'Unable to ban this source right now.',
                'operation_failed',
            );
        }

        invalidateMessages();
        return banActionResult('success', 'Message source banned.');
    } catch (error) {
        logMutationFailure('ban-source', error);
        return banActionResult(
            'error',
            'Unable to ban this source right now.',
            'operation_failed',
        );
    }
}

export async function revokeMessageSourceBan(
    messageId: string,
): Promise<BanSourceActionResult> {
    await requireUser();

    if (!isMessageId(messageId)) {
        return banActionResult(
            'error',
            'Unable to identify this message.',
            'validation_error',
        );
    }

    const now = new Date();

    try {
        const supabase = await createClient();
        const sourceLookup = await getMessageSourceIdentifier(
            supabase,
            messageId,
            'revoke-source',
        );
        if (!sourceLookup.ok) return sourceLookup.result;

        const existingBanResult = await getUnrevokedSourceBan(
            supabase,
            sourceLookup.sourceIdentifier,
            'revoke-source',
        );
        if (!existingBanResult.ok) return existingBanResult.result;

        if (!existingBanResult.ban) {
            return banActionResult(
                'error',
                'This source no longer has an active ban.',
                'no_active_ban',
            );
        }

        const existingState = getUnrevokedBanState(
            existingBanResult.ban.expires_at,
            now.getTime(),
        );

        if (existingState === 'invalid') {
            logMutationFailure('revoke-source', {
                code: 'invalid_expiration',
            });
            return banActionResult(
                'error',
                'Unable to revoke this source ban right now.',
                'operation_failed',
            );
        }

        if (existingState === 'expired') {
            return banActionResult(
                'error',
                'This source no longer has an active ban.',
                'no_active_ban',
            );
        }

        const update = {
            revoked_at: now.toISOString(),
        } satisfies ContactBanUpdate;
        const { data: revokedBan, error } = await supabase
            .from('contact_bans')
            .update(update)
            .eq('id', existingBanResult.ban.id)
            .is('revoked_at', null)
            .select('id')
            .maybeSingle();

        if (error) {
            logMutationFailure('revoke-source', error);
            return banActionResult(
                'error',
                'Unable to revoke this source ban right now.',
                'operation_failed',
            );
        }

        if (!revokedBan) {
            return banActionResult(
                'error',
                'This source no longer has an active ban.',
                'no_active_ban',
            );
        }

        invalidateMessages();
        return banActionResult('success', 'Source ban revoked.');
    } catch (error) {
        logMutationFailure('revoke-source', error);
        return banActionResult(
            'error',
            'Unable to revoke this source ban right now.',
            'operation_failed',
        );
    }
}
