'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useSnackbar } from '@/components/snackbar/Snackbar';
import type { Message } from '@/features/admin/messages/types';
import { createClient } from '@/lib/supabase/client';

type RealtimeMessageInsert = Pick<Message, 'id' | 'sender_name'>;

const MESSAGES_ROUTE = '/dashboard/messages';
const INBOX_REFRESH_DELAY_MS = 100;
const MAX_SEEN_INSERTS = 100;

function normalizeCount(count: number): number {
    if (!Number.isFinite(count)) return 0;
    return Math.max(0, Math.trunc(count));
}

function getSafeErrorCode(error: unknown): string {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
        return error instanceof Error ? error.name : 'unknown';
    }

    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : 'unknown';
}

function getSafeSenderName(value: unknown): string | null {
    if (typeof value !== 'string') return null;

    const senderName = value.trim();
    return senderName ? senderName.slice(0, 80) : null;
}

export function useMessageRealtime(
    initialUnreadMessageCount: number | null,
): number {
    const router = useRouter();
    const pathname = usePathname();
    const snackbar = useSnackbar();
    const [supabase] = useState(() => createClient());
    const [unreadMessageCount, setUnreadMessageCount] = useState(() =>
        normalizeCount(initialUnreadMessageCount ?? 0));
    const pathnameRef = useRef(pathname);

    pathnameRef.current = pathname;

    useEffect(() => {
        if (initialUnreadMessageCount === null) return;
        setUnreadMessageCount(normalizeCount(initialUnreadMessageCount));
    }, [initialUnreadMessageCount]);

    useEffect(() => {
        let isActive = true;
        let isCountSyncRunning = false;
        let shouldRepeatCountSync = false;
        let inboxRefreshTimer: number | null = null;
        const seenInsertIds = new Set<string>();
        const seenInsertOrder: string[] = [];

        const rememberInsert = (messageId: string): boolean => {
            if (seenInsertIds.has(messageId)) return false;

            seenInsertIds.add(messageId);
            seenInsertOrder.push(messageId);

            if (seenInsertOrder.length > MAX_SEEN_INSERTS) {
                const oldestMessageId = seenInsertOrder.shift();
                if (oldestMessageId) seenInsertIds.delete(oldestMessageId);
            }

            return true;
        };

        const synchronizeUnreadCount = async () => {
            if (isCountSyncRunning) {
                shouldRepeatCountSync = true;
                return;
            }

            isCountSyncRunning = true;

            try {
                do {
                    shouldRepeatCountSync = false;
                    const { count, error } = await supabase
                        .from('messages')
                        .select('id', { count: 'exact', head: true })
                        .eq('is_read', false)
                        .eq('is_archived', false);

                    if (!isActive) return;

                    if (error || typeof count !== 'number') {
                        console.warn('[messages/realtime] Unread count sync failed.', {
                            code: getSafeErrorCode(error),
                        });
                        continue;
                    }

                    setUnreadMessageCount(normalizeCount(count));
                } while (isActive && shouldRepeatCountSync);
            } catch (error) {
                if (isActive) {
                    console.warn('[messages/realtime] Unread count sync failed.', {
                        code: getSafeErrorCode(error),
                    });
                }
            } finally {
                isCountSyncRunning = false;
            }
        };

        const scheduleInboxRefresh = () => {
            if (pathnameRef.current !== MESSAGES_ROUTE) return;

            if (inboxRefreshTimer !== null) {
                window.clearTimeout(inboxRefreshTimer);
            }

            inboxRefreshTimer = window.setTimeout(() => {
                inboxRefreshTimer = null;
                if (isActive) router.refresh();
            }, INBOX_REFRESH_DELAY_MS);
        };

        const handleMessageChange = () => {
            void synchronizeUnreadCount();
            scheduleInboxRefresh();
        };

        const channel = supabase
            .channel(`admin-message-changes-${crypto.randomUUID()}`)
            .on<RealtimeMessageInsert>(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    select: ['id', 'sender_name'],
                },
                (payload) => {
                    handleMessageChange();

                    const messageId = payload.new.id;
                    if (typeof messageId !== 'string' || !rememberInsert(messageId)) {
                        return;
                    }

                    const senderName = getSafeSenderName(payload.new.sender_name);
                    snackbar.info(
                        senderName
                            ? `New portfolio message from ${senderName}`
                            : 'New portfolio message',
                        {
                            action: {
                                label: 'Open inbox',
                                onAction: () => {
                                    if (pathnameRef.current === MESSAGES_ROUTE) {
                                        router.refresh();
                                        return;
                                    }

                                    router.push(MESSAGES_ROUTE);
                                },
                            },
                        },
                    );
                },
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                    select: ['id'],
                },
                handleMessageChange,
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'messages',
                    select: ['id'],
                },
                handleMessageChange,
            )
            .subscribe((status, error) => {
                if (status === 'SUBSCRIBED') {
                    void synchronizeUnreadCount();
                    return;
                }

                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.warn('[messages/realtime] Subscription unavailable.', {
                        status,
                        code: getSafeErrorCode(error),
                    });
                }
            });

        return () => {
            isActive = false;

            if (inboxRefreshTimer !== null) {
                window.clearTimeout(inboxRefreshTimer);
            }

            seenInsertIds.clear();
            seenInsertOrder.length = 0;
            void supabase.removeChannel(channel).catch((error: unknown) => {
                console.warn('[messages/realtime] Channel cleanup failed.', {
                    code: getSafeErrorCode(error),
                });
            });
        };
    }, [router, snackbar, supabase]);

    return unreadMessageCount;
}
