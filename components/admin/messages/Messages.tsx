'use client';

import { RefreshCw, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useTransition,
} from 'react';

import {
    AdminPageHeader,
    ManagementPage,
} from '@/components/admin/layout/ManagementPage';
import { useDialog } from '@/components/dialog/Dialog';
import { useSnackbar } from '@/components/snackbar/Snackbar';
import {
    archiveMessage,
    deleteMessage,
    markMessageRead,
    markMessageUnread,
    revokeMessageSourceBan,
    restoreMessage,
    setMessageStarred,
} from '@/features/admin/messages/actions';
import type {
    AdminMessagesPageDto,
    MessageActionResult,
    MessageFilter,
} from '@/features/admin/messages/types';
import { MESSAGE_SEARCH_MAX_LENGTH } from '@/features/admin/messages/validation';
import BanSourceDialog from './BanSourceDialog';
import MessageDetail from './MessageDetail';
import MessageList, { type MessageListEmptyState } from './MessageList';

interface MessagesProps {
    pageData: AdminMessagesPageDto;
    referenceTime: string;
    unavailable?: boolean;
}

const SPLIT_VIEW_QUERY = '(min-width: 1280px)';
const SEARCH_DEBOUNCE_MS = 350;
const DIALOG_FOCUS_RETURN_DELAY_MS = 320;
const MESSAGE_FILTERS = [
    { id: 'inbox', label: 'Inbox' },
    { id: 'unread', label: 'Unread' },
    { id: 'starred', label: 'Starred' },
    { id: 'archived', label: 'Archived' },
] as const satisfies readonly { id: MessageFilter; label: string }[];

function getMessagesUrl(filter: MessageFilter, search: string, page: number): string {
    const params = new URLSearchParams();

    if (filter !== 'inbox') params.set('filter', filter);
    if (search) params.set('q', search);
    if (page > 1) params.set('page', String(page));

    const queryString = params.toString();
    return queryString ? `/dashboard/messages?${queryString}` : '/dashboard/messages';
}

export default function Messages({
    pageData,
    referenceTime,
    unavailable = false,
}: MessagesProps) {
    const dialog = useDialog();
    const snackbar = useSnackbar();
    const router = useRouter();
    const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
    const [isSplitView, setIsSplitView] = useState(false);
    const [searchValue, setSearchValue] = useState(pageData.search);
    const [activeFilter, setActiveFilter] = useState<MessageFilter>(pageData.filter);
    const [actionError, setActionError] = useState('');
    const [banDialogMessageId, setBanDialogMessageId] = useState<string | null>(null);
    const [isNavigating, startNavigation] = useTransition();
    const [isActionPending, startAction] = useTransition();
    const backButtonRef = useRef<HTMLButtonElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const selectedTriggerRef = useRef<HTMLButtonElement | null>(null);
    const focusFrameRef = useRef<number | null>(null);
    const focusTimerRef = useRef<number | null>(null);
    const automaticReadIdsRef = useRef(new Set<string>());

    const selectedMessage = useMemo(
        () => pageData.messages.find((message) => message.id === selectedMessageId) ?? null,
        [pageData.messages, selectedMessageId],
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia(SPLIT_VIEW_QUERY);
        const handleChange = (event: MediaQueryListEvent) => {
            setIsSplitView(event.matches);
        };

        setIsSplitView(mediaQuery.matches);
        mediaQuery.addEventListener('change', handleChange);

        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        setSearchValue(pageData.search);
        setActiveFilter(pageData.filter);
    }, [pageData.filter, pageData.search]);

    useEffect(() => {
        if (
            selectedMessageId &&
            !pageData.messages.some((message) => message.id === selectedMessageId)
        ) {
            setSelectedMessageId(null);
        }

        for (const messageId of automaticReadIdsRef.current) {
            const message = pageData.messages.find((item) => item.id === messageId);
            if (!message || message.isRead) automaticReadIdsRef.current.delete(messageId);
        }
    }, [pageData.messages, selectedMessageId]);

    useEffect(() => () => {
        if (focusFrameRef.current !== null) {
            window.cancelAnimationFrame(focusFrameRef.current);
        }
        if (focusTimerRef.current !== null) {
            window.clearTimeout(focusTimerRef.current);
        }
    }, []);

    const scheduleFocus = useCallback((
        target: () => HTMLElement | null,
        delay = 0,
    ) => {
        if (focusFrameRef.current !== null) {
            window.cancelAnimationFrame(focusFrameRef.current);
        }
        if (focusTimerRef.current !== null) {
            window.clearTimeout(focusTimerRef.current);
            focusTimerRef.current = null;
        }

        const focusTarget = () => {
            focusFrameRef.current = window.requestAnimationFrame(() => {
                target()?.focus();
                focusFrameRef.current = null;
            });
            focusTimerRef.current = null;
        };

        if (delay > 0) {
            focusTimerRef.current = window.setTimeout(focusTarget, delay);
        } else {
            focusTarget();
        }
    }, []);

    const refreshMessages = useCallback(() => {
        startNavigation(() => router.refresh());
    }, [router]);

    const clearSelection = useCallback((focusDelay = 0) => {
        setSelectedMessageId(null);
        selectedTriggerRef.current = null;
        scheduleFocus(() => searchInputRef.current, focusDelay);
    }, [scheduleFocus]);

    const navigateMessages = useCallback((
        filter: MessageFilter,
        search: string,
        page: number,
    ) => {
        setSelectedMessageId(null);
        selectedTriggerRef.current = null;
        setActionError('');
        startNavigation(() => {
            router.replace(getMessagesUrl(filter, search, page), { scroll: false });
        });
    }, [router]);

    useEffect(() => {
        if (unavailable || searchValue === pageData.search) return;

        const timer = window.setTimeout(() => {
            navigateMessages(activeFilter, searchValue.trim(), 1);
        }, SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(timer);
    }, [activeFilter, navigateMessages, pageData.search, searchValue, unavailable]);

    const handleSelectMessage = useCallback((
        messageId: string,
        trigger: HTMLButtonElement,
    ) => {
        const message = pageData.messages.find((item) => item.id === messageId);
        if (!message) return;

        selectedTriggerRef.current = trigger;
        setSelectedMessageId(messageId);
        setActionError('');

        if (!isSplitView) {
            scheduleFocus(() => backButtonRef.current);
        }

        if (message.isRead || automaticReadIdsRef.current.has(messageId)) return;

        automaticReadIdsRef.current.add(messageId);
        startAction(async () => {
            const result = await markMessageRead(messageId);

            if (result.status === 'error') {
                automaticReadIdsRef.current.delete(messageId);
                setActionError(result.message);
                return;
            }

            if (activeFilter === 'unread') clearSelection();
            refreshMessages();
        });
    }, [activeFilter, clearSelection, isSplitView, pageData.messages, refreshMessages, scheduleFocus]);

    const handleBackToInbox = useCallback(() => {
        setSelectedMessageId(null);
        scheduleFocus(() => selectedTriggerRef.current);
    }, [scheduleFocus]);

    const runSelectedAction = useCallback((
        action: () => Promise<MessageActionResult>,
        clearAfterSuccess = false,
    ) => {
        if (isActionPending) return;

        setActionError('');
        startAction(async () => {
            const result = await action();
            if (result.status === 'error') {
                setActionError(result.message);
                return;
            }

            snackbar.success(result.message);
            if (clearAfterSuccess) clearSelection();
            refreshMessages();
        });
    }, [clearSelection, isActionPending, refreshMessages, snackbar]);

    const handleToggleRead = useCallback(() => {
        if (!selectedMessage) return;

        const shouldClear = activeFilter === 'unread' && !selectedMessage.isRead;
        runSelectedAction(
            () => selectedMessage.isRead
                ? markMessageUnread(selectedMessage.id)
                : markMessageRead(selectedMessage.id),
            shouldClear,
        );
    }, [activeFilter, runSelectedAction, selectedMessage]);

    const handleToggleStar = useCallback(() => {
        if (!selectedMessage) return;

        const shouldClear = activeFilter === 'starred' && selectedMessage.isStarred;
        runSelectedAction(
            () => setMessageStarred(selectedMessage.id, !selectedMessage.isStarred),
            shouldClear,
        );
    }, [activeFilter, runSelectedAction, selectedMessage]);

    const handleArchiveToggle = useCallback(() => {
        if (!selectedMessage) return;

        runSelectedAction(
            () => selectedMessage.isArchived
                ? restoreMessage(selectedMessage.id)
                : archiveMessage(selectedMessage.id),
            true,
        );
    }, [runSelectedAction, selectedMessage]);

    const handleDelete = useCallback(() => {
        if (!selectedMessage) return;
        const messageId = selectedMessage.id;
        const senderName = selectedMessage.senderName;

        dialog.confirm(
            'Delete message?',
            <>
                The message from{' '}
                <strong className="font-bold text-[var(--text)]">{senderName}</strong>{' '}
                will be permanently removed. This action cannot be undone.
            </>,
            async () => {
                const result = await deleteMessage(messageId);

                if (result.status === 'error') {
                    return { ok: false, message: result.message };
                }

                setActionError('');
                snackbar.success(result.message);
                clearSelection(DIALOG_FOCUS_RETURN_DELAY_MS);
                refreshMessages();
                return { ok: true };
            },
            undefined,
            {
                confirmLabel: 'Delete',
                cancelLabel: 'Cancel',
                pendingLabel: 'Deleting...',
                tone: 'danger',
            },
        );
    }, [clearSelection, dialog, refreshMessages, selectedMessage, snackbar]);

    const handleBanSource = useCallback(() => {
        if (!selectedMessage || selectedMessage.isSourceBanned) return;
        setActionError('');
        setBanDialogMessageId(selectedMessage.id);
    }, [selectedMessage]);

    const handleBanSuccess = useCallback((message: string) => {
        setBanDialogMessageId(null);
        setActionError('');
        snackbar.success(message);
        refreshMessages();
    }, [refreshMessages, snackbar]);

    const handleRevokeSourceBan = useCallback(() => {
        if (!selectedMessage || !selectedMessage.isSourceBanned) return;
        const messageId = selectedMessage.id;

        dialog.confirm(
            'Revoke source ban?',
            'New contact submissions from this source will be allowed again, subject to rate limiting and Turnstile verification.',
            async () => {
                const result = await revokeMessageSourceBan(messageId);

                if (result.status === 'error' && result.code !== 'no_active_ban') {
                    return { ok: false, message: result.message };
                }

                setActionError('');
                snackbar.success(result.message);
                refreshMessages();
                return { ok: true };
            },
            undefined,
            {
                confirmLabel: 'Revoke ban',
                cancelLabel: 'Cancel',
                pendingLabel: 'Revoking...',
                tone: 'danger',
            },
        );
    }, [dialog, refreshMessages, selectedMessage, snackbar]);

    const handleFilterChange = (filter: MessageFilter) => {
        if (filter === activeFilter || unavailable) return;
        setActiveFilter(filter);
        navigateMessages(filter, searchValue.trim(), 1);
    };

    const handlePageChange = (page: number) => {
        if (page < 1 || isNavigating) return;
        navigateMessages(activeFilter, searchValue.trim(), page);
    };

    const handleRetry = () => {
        setActionError('');
        refreshMessages();
    };

    const filterCounts: Record<MessageFilter, number> = {
        inbox: pageData.counts.inbox,
        unread: pageData.counts.unread,
        starred: pageData.counts.starred,
        archived: pageData.counts.archived,
    };
    const emptyState: MessageListEmptyState = unavailable
        ? 'unavailable'
        : pageData.search
            ? 'search'
            : pageData.filter;
    const isDetailOpen = selectedMessage !== null;
    const activeFilterLabel = MESSAGE_FILTERS.find((filter) => filter.id === activeFilter)?.label
        ?? 'Inbox';

    return (
        <ManagementPage>
            <section aria-labelledby="messages-page-heading">
                <div className={isDetailOpen ? 'hidden xl:block' : 'block'}>
                    <AdminPageHeader
                        eyebrow="Communication registry / Inbox"
                        title="Messages"
                        headingId="messages-page-heading"
                        description="Review and manage correspondence received through your public portfolio contact form."
                        action={
                            <div className="min-w-24 sm:text-right">
                                <span className="block font-display text-2xl font-extrabold tabular-nums leading-none text-[var(--text)]">
                                    {String(pageData.counts.total).padStart(2, '0')}
                                </span>
                                <span className="mt-1.5 block font-mono text-[8px] font-bold uppercase tracking-[0.11em] text-[var(--muted)]/38">
                                    Total messages
                                </span>
                            </div>
                        }
                    >
                        <nav
                            aria-label="Message filters"
                            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                        >
                            {MESSAGE_FILTERS.map((filter) => {
                                const isActive = filter.id === activeFilter;

                                return (
                                    <button
                                        key={filter.id}
                                        type="button"
                                        onClick={() => handleFilterChange(filter.id)}
                                        disabled={unavailable}
                                        aria-pressed={isActive}
                                        className={`flex min-h-12 items-center justify-between gap-3 rounded-md border px-3.5 py-2.5 text-left transition-[border-color,background-color,color] duration-200 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-not-allowed disabled:opacity-35 motion-reduce:transition-none ${isActive ? 'border-[var(--signal)]/24 bg-[var(--signal)]/[0.075]' : 'border-white/[0.065] bg-black/35 hover:border-white/[0.11] hover:bg-white/[0.025]'}`}
                                    >
                                        <span className={`font-mono text-[9px] font-bold uppercase tracking-[0.1em] ${isActive ? 'text-[var(--signal)]/78' : 'text-[var(--muted)]/46'}`}>
                                            {filter.label}
                                        </span>
                                        <span className={`text-sm font-extrabold tabular-nums ${isActive ? 'text-[var(--text)]' : 'text-[var(--muted)]/62'}`}>
                                            {String(filterCounts[filter.id]).padStart(2, '0')}
                                        </span>
                                    </button>
                                );
                            })}
                        </nav>
                    </AdminPageHeader>

                    <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div
                            role="search"
                            aria-busy={isNavigating}
                            className="relative min-w-0 flex-1 lg:max-w-xl"
                        >
                            <label htmlFor="message-search" className="sr-only">
                                Search sender, email, or message
                            </label>
                            {isNavigating ? (
                                <RefreshCw
                                    aria-hidden="true"
                                    size={17}
                                    strokeWidth={1.8}
                                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 animate-spin text-[var(--signal)]/58 motion-reduce:animate-none"
                                />
                            ) : (
                                <Search
                                    aria-hidden="true"
                                    size={17}
                                    strokeWidth={1.8}
                                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]/38"
                                />
                            )}
                            <input
                                ref={searchInputRef}
                                id="message-search"
                                type="search"
                                value={searchValue}
                                maxLength={MESSAGE_SEARCH_MAX_LENGTH}
                                disabled={unavailable}
                                onChange={(event) => setSearchValue(event.target.value)}
                                placeholder="Search sender, email, or message"
                                className="min-h-11 w-full appearance-none rounded-lg border border-white/[0.085] bg-[#07080a] py-2.5 pl-10 pr-11 text-sm text-[var(--text)] outline-none transition-[border-color,background-color] duration-200 placeholder:text-[var(--muted)]/34 focus:border-[var(--signal)]/30 focus:bg-white/[0.025] focus:ring-2 focus:ring-[var(--signal)]/16 disabled:cursor-not-allowed disabled:opacity-45 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden motion-reduce:transition-none"
                            />
                            {searchValue ? (
                                <button
                                    type="button"
                                    onClick={() => setSearchValue('')}
                                    disabled={unavailable}
                                    aria-label="Clear message search"
                                    className="absolute right-1.5 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-[var(--muted)]/48 transition-colors duration-200 hover:bg-white/[0.05] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-not-allowed disabled:opacity-30 motion-reduce:transition-none"
                                >
                                    <X aria-hidden="true" size={16} strokeWidth={1.8} />
                                </button>
                            ) : null}
                        </div>

                        <p className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/38">
                            {activeFilterLabel} / Page {pageData.page}
                        </p>
                    </div>
                </div>

                {actionError ? (
                    <p
                        role="alert"
                        aria-live="polite"
                        className="mt-3 rounded-lg border border-red-300/12 bg-red-300/[0.025] px-3.5 py-3 text-sm font-semibold leading-relaxed text-red-300/82"
                    >
                        {actionError}
                    </p>
                ) : null}

                <div
                    aria-label="Portfolio inbox workspace"
                    className={`relative grid min-w-0 overflow-hidden rounded-lg border border-white/[0.085] bg-[#07080a] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] xl:h-[clamp(32rem,calc(100dvh-18rem),54rem)] xl:grid-cols-[minmax(21rem,0.4fr)_minmax(0,1fr)] ${isDetailOpen ? (actionError ? 'mt-3 xl:mt-5' : 'mt-0 xl:mt-5') : 'mt-5'}`}
                >
                    <div
                        className={`min-h-[32rem] min-w-0 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none xl:relative xl:inset-auto xl:h-full xl:translate-x-0 xl:border-r xl:border-white/[0.07] xl:opacity-100 ${
                            isDetailOpen
                                ? 'pointer-events-none absolute inset-0 -translate-x-3 opacity-0 xl:pointer-events-auto'
                                : 'relative translate-x-0 opacity-100'
                        }`}
                    >
                        <MessageList
                            messages={pageData.messages}
                            selectedMessageId={selectedMessageId}
                            referenceTime={referenceTime}
                            isInert={isDetailOpen && !isSplitView}
                            emptyState={emptyState}
                            resultCount={pageData.resultCount}
                            page={pageData.page}
                            hasNewer={pageData.hasNewer}
                            hasOlder={pageData.hasOlder}
                            isNavigating={isNavigating}
                            onSelect={handleSelectMessage}
                            onPageChange={handlePageChange}
                            onRetry={handleRetry}
                        />
                    </div>

                    <div
                        className={`min-h-[32rem] min-w-0 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none xl:relative xl:inset-auto xl:h-full xl:translate-x-0 xl:opacity-100 ${
                            isDetailOpen
                                ? 'relative translate-x-0 opacity-100'
                                : 'pointer-events-none absolute inset-0 translate-x-3 opacity-0 xl:pointer-events-auto'
                        }`}
                    >
                        <MessageDetail
                            message={selectedMessage}
                            isInert={!isDetailOpen && !isSplitView}
                            backButtonRef={backButtonRef}
                            isActionPending={isActionPending || isNavigating}
                            onBack={handleBackToInbox}
                            onToggleRead={handleToggleRead}
                            onToggleStar={handleToggleStar}
                            onArchiveToggle={handleArchiveToggle}
                            onBanSource={handleBanSource}
                            onRevokeSourceBan={handleRevokeSourceBan}
                            onDelete={handleDelete}
                        />
                    </div>
                </div>

                <p aria-live="polite" className="sr-only">
                    {selectedMessage
                        ? `Viewing message from ${selectedMessage.senderName}.`
                        : 'No message selected.'}
                </p>
            </section>
            {banDialogMessageId ? (
                <BanSourceDialog
                    key={banDialogMessageId}
                    messageId={banDialogMessageId}
                    onClose={() => setBanDialogMessageId(null)}
                    onSuccess={handleBanSuccess}
                />
            ) : null}
        </ManagementPage>
    );
}
