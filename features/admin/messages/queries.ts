import 'server-only';

import { requireUser } from '@/lib/auth/requireUser';
import { createClient } from '@/lib/supabase/server';
import type {
    AdminMessageDto,
    AdminMessageQuery,
    AdminMessagesPageDto,
    Message,
} from './types';
import {
    ADMIN_MESSAGES_PAGE_SIZE,
    isMessageSecurityStatus,
} from './validation';

const ADMIN_MESSAGE_SELECT =
    'id,sender_name,sender_email,message,received_at,is_read,is_starred,is_archived,security_status' as const;

type AdminMessageRow = Pick<
    Message,
    | 'id'
    | 'sender_name'
    | 'sender_email'
    | 'message'
    | 'received_at'
    | 'is_read'
    | 'is_starred'
    | 'is_archived'
    | 'security_status'
>;

function getErrorCode(error: unknown): string {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
        return 'unknown';
    }

    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : 'unknown';
}

function logQueryFailure(scope: string, error: unknown) {
    console.error('[messages/query] Query failed.', {
        scope,
        code: getErrorCode(error),
    });
}

function quoteSearchPattern(search: string): string {
    const escapedSearch = search
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');

    return `"%${escapedSearch}%"`;
}

function toAdminMessage(row: AdminMessageRow): AdminMessageDto {
    if (
        !isMessageSecurityStatus(row.security_status) ||
        !Number.isFinite(Date.parse(row.received_at))
    ) {
        throw new Error('Admin message data is malformed.');
    }

    return {
        id: row.id,
        senderName: row.sender_name,
        senderEmail: row.sender_email,
        message: row.message,
        receivedAt: row.received_at,
        isRead: row.is_read,
        isStarred: row.is_starred,
        isArchived: row.is_archived,
        securityStatus: row.security_status,
    };
}

function requireExactCount(
    scope: string,
    count: number | null,
): number {
    if (typeof count !== 'number') {
        logQueryFailure(scope, { code: 'count_unavailable' });
        throw new Error('Admin message counts are unavailable.');
    }

    return count;
}

export async function getAdminMessages(
    query: AdminMessageQuery,
): Promise<AdminMessagesPageDto> {
    await requireUser();

    const supabase = await createClient();
    let messagesQuery = supabase
        .from('messages')
        .select(ADMIN_MESSAGE_SELECT, { count: 'exact' });

    if (query.filter === 'archived') {
        messagesQuery = messagesQuery.eq('is_archived', true);
    } else {
        messagesQuery = messagesQuery.eq('is_archived', false);

        if (query.filter === 'unread') {
            messagesQuery = messagesQuery.eq('is_read', false);
        } else if (query.filter === 'starred') {
            messagesQuery = messagesQuery.eq('is_starred', true);
        }
    }

    if (query.search) {
        const pattern = quoteSearchPattern(query.search);
        messagesQuery = messagesQuery.or(
            `sender_name.ilike.${pattern},sender_email.ilike.${pattern},message.ilike.${pattern}`,
        );
    }

    const rangeStart = (query.page - 1) * ADMIN_MESSAGES_PAGE_SIZE;
    const rangeEnd = rangeStart + ADMIN_MESSAGES_PAGE_SIZE - 1;
    const [
        messagesResult,
        inboxCountResult,
        unreadCountResult,
        starredCountResult,
        archivedCountResult,
    ] = await Promise.all([
        messagesQuery
            .order('received_at', { ascending: false })
            .order('id', { ascending: false })
            .range(rangeStart, rangeEnd),
        supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('is_archived', false),
        supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('is_archived', false)
            .eq('is_read', false),
        supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('is_archived', false)
            .eq('is_starred', true),
        supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('is_archived', true),
    ]);

    const results = [
        ['messages', messagesResult.error],
        ['inbox-count', inboxCountResult.error],
        ['unread-count', unreadCountResult.error],
        ['starred-count', starredCountResult.error],
        ['archived-count', archivedCountResult.error],
    ] as const;
    const failedResult = results.find(([, error]) => error !== null);

    if (failedResult) {
        logQueryFailure(failedResult[0], failedResult[1]);
        throw new Error('Admin messages are unavailable.');
    }

    const inbox = requireExactCount('inbox-count', inboxCountResult.count);
    const unread = requireExactCount('unread-count', unreadCountResult.count);
    const starred = requireExactCount('starred-count', starredCountResult.count);
    const archived = requireExactCount('archived-count', archivedCountResult.count);
    const resultCount = requireExactCount('messages-count', messagesResult.count);
    const messageRows = messagesResult.data;
    let messages: AdminMessageDto[];

    if (!messageRows) {
        logQueryFailure('messages', { code: 'data_unavailable' });
        throw new Error('Admin messages are unavailable.');
    }

    try {
        messages = messageRows.map(toAdminMessage);
    } catch (error) {
        logQueryFailure('message-mapping', error);
        throw new Error('Admin messages are unavailable.');
    }

    return {
        ...query,
        messages,
        counts: {
            total: inbox + archived,
            inbox,
            unread,
            starred,
            archived,
        },
        pageSize: ADMIN_MESSAGES_PAGE_SIZE,
        resultCount,
        hasNewer: query.page > 1,
        hasOlder: rangeEnd + 1 < resultCount,
    };
}
