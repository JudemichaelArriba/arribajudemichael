'use server';

import { revalidatePath } from 'next/cache';

import { requireUser } from '@/lib/auth/requireUser';
import { createClient } from '@/lib/supabase/server';
import type {
    MessageActionResult,
    MessageUpdate,
} from './types';
import { isMessageId } from './validation';

type MessageOperation =
    | 'mark-read'
    | 'mark-unread'
    | 'star'
    | 'unstar'
    | 'archive'
    | 'restore'
    | 'delete';

function actionResult(
    status: MessageActionResult['status'],
    message: string,
): MessageActionResult {
    return { status, message };
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
    operation: Exclude<MessageOperation, 'delete'>,
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
