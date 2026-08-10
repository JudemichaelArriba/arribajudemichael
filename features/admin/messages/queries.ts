import 'server-only';

import { requireUser } from '@/lib/auth/requireUser';
import { createClient } from '@/lib/supabase/server';
import type {
    AdminMessageDto,
    AdminMessageQuery,
    AdminMessagesPageDto,
    ContactBan,
    Message,
} from './types';
import {
    ADMIN_MESSAGES_PAGE_SIZE,
    isMessageSecurityStatus,
} from './validation';

const ADMIN_MESSAGE_SELECT =
    'id,sender_name,sender_email,message,received_at,is_read,is_starred,is_archived,security_status,source_ip_hash' as const;
const ADMIN_BAN_STATE_SELECT = 'ip_hash,expires_at' as const;
const SOURCE_IDENTIFIER_PATTERN = /^[a-f0-9]{64}$/;

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
    | 'source_ip_hash'
>;

type AdminBanStateRow = Pick<ContactBan, 'ip_hash' | 'expires_at'>;

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

function toAdminMessage(
    row: AdminMessageRow,
    activeSourceIdentifiers: ReadonlySet<string>,
): AdminMessageDto {
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
        isSourceBanned:
            row.source_ip_hash !== null &&
            activeSourceIdentifiers.has(row.source_ip_hash),
    };
}

async function getActiveSourceIdentifiers(
    supabase: Awaited<ReturnType<typeof createClient>>,
    messageRows: readonly AdminMessageRow[],
): Promise<Set<string>> {
    const sourceIdentifiers = [...new Set(
        messageRows
            .map((message) => message.source_ip_hash)
            .filter((source): source is string =>
                source !== null && SOURCE_IDENTIFIER_PATTERN.test(source)),
    )];

    if (sourceIdentifiers.length === 0) return new Set();

    const { data, error } = await supabase
        .from('contact_bans')
        .select(ADMIN_BAN_STATE_SELECT)
        .in('ip_hash', sourceIdentifiers)
        .is('revoked_at', null);

    if (error) {
        logQueryFailure('ban-state', error);
        throw new Error('Admin message security state is unavailable.');
    }

    const now = Date.now();
    const activeSourceIdentifiers = new Set<string>();

    for (const ban of (data ?? []) satisfies AdminBanStateRow[]) {
        if (ban.expires_at === null) {
            activeSourceIdentifiers.add(ban.ip_hash);
            continue;
        }

        const expiresAt = Date.parse(ban.expires_at);
        if (!Number.isFinite(expiresAt)) {
            logQueryFailure('ban-state', { code: 'invalid_expiration' });
            throw new Error('Admin message security state is unavailable.');
        }

        if (expiresAt > now) activeSourceIdentifiers.add(ban.ip_hash);
    }

    return activeSourceIdentifiers;
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
        const activeSourceIdentifiers = await getActiveSourceIdentifiers(
            supabase,
            messageRows,
        );
        messages = messageRows.map((message) =>
            toAdminMessage(message, activeSourceIdentifiers));
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
