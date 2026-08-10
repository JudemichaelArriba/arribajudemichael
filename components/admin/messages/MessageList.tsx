import {
    Archive,
    ChevronLeft,
    ChevronRight,
    Inbox,
    MailOpen,
    RefreshCw,
    SearchX,
    ShieldAlert,
    Star,
    type LucideIcon,
} from 'lucide-react';

import type {
    AdminMessageDto,
    MessageFilter,
} from '@/features/admin/messages/types';
import {
    deriveMessageSummary,
    formatInboxTimestamp,
} from './messageFormatting';

export type MessageListEmptyState = MessageFilter | 'search' | 'unavailable';

interface MessageListProps {
    messages: readonly AdminMessageDto[];
    selectedMessageId: string | null;
    referenceTime: string;
    isInert: boolean;
    emptyState: MessageListEmptyState;
    resultCount: number;
    page: number;
    hasNewer: boolean;
    hasOlder: boolean;
    isNavigating: boolean;
    onSelect: (messageId: string, trigger: HTMLButtonElement) => void;
    onPageChange: (page: number) => void;
    onRetry: () => void;
}

interface EmptyStateContent {
    icon: LucideIcon;
    title: string;
    description: string;
}

const EMPTY_STATE_CONTENT: Record<MessageListEmptyState, EmptyStateContent> = {
    inbox: {
        icon: Inbox,
        title: 'Inbox clear.',
        description: 'No portfolio messages right now.',
    },
    unread: {
        icon: MailOpen,
        title: "You're all caught up.",
        description: 'No unread messages.',
    },
    starred: {
        icon: Star,
        title: 'No starred messages.',
        description: 'Star important conversations to find them here.',
    },
    archived: {
        icon: Archive,
        title: 'No archived messages.',
        description: 'Archived conversations will appear here.',
    },
    search: {
        icon: SearchX,
        title: 'No conversations found.',
        description: 'Try another name, email, or keyword.',
    },
    unavailable: {
        icon: RefreshCw,
        title: 'Messages are temporarily unavailable.',
        description: 'Refresh this view to try the secure inbox connection again.',
    },
};

function EmptyMessageList({
    state,
    isRetrying,
    onRetry,
}: {
    state: MessageListEmptyState;
    isRetrying: boolean;
    onRetry: () => void;
}) {
    const content = EMPTY_STATE_CONTENT[state];
    const Icon = content.icon;

    return (
        <div className="flex min-h-[28rem] flex-1 flex-col items-center justify-center px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] text-[var(--signal)]/65">
                <Icon
                    aria-hidden="true"
                    size={22}
                    strokeWidth={1.6}
                    className={isRetrying && state === 'unavailable'
                        ? 'animate-spin motion-reduce:animate-none'
                        : undefined}
                />
            </span>
            <h3 className="mt-4 text-base font-extrabold tracking-normal text-[var(--text)]">
                {content.title}
            </h3>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-[var(--muted)]/55">
                {content.description}
            </p>
            {state === 'unavailable' ? (
                <button
                    type="button"
                    onClick={onRetry}
                    disabled={isRetrying}
                    className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.03] px-4 text-sm font-bold text-[var(--text)] transition-[border-color,background-color] duration-200 hover:border-[var(--signal)]/28 hover:bg-[var(--signal)]/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-wait disabled:opacity-55 motion-reduce:transition-none"
                >
                    <RefreshCw
                        aria-hidden="true"
                        size={16}
                        strokeWidth={1.8}
                        className={isRetrying ? 'animate-spin motion-reduce:animate-none' : undefined}
                    />
                    {isRetrying ? 'Refreshing...' : 'Retry'}
                </button>
            ) : null}
        </div>
    );
}

export default function MessageList({
    messages,
    selectedMessageId,
    referenceTime,
    isInert,
    emptyState,
    resultCount,
    page,
    hasNewer,
    hasOlder,
    isNavigating,
    onSelect,
    onPageChange,
    onRetry,
}: MessageListProps) {
    const showPagination = hasNewer || hasOlder;

    return (
        <section
            aria-labelledby="portfolio-inbox-heading"
            aria-busy={isNavigating}
            inert={isInert ? true : undefined}
            className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
        >
            <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-white/[0.07] px-4 sm:px-5">
                <div className="min-w-0">
                    <h2
                        id="portfolio-inbox-heading"
                        className="truncate text-sm font-extrabold tracking-normal text-[var(--text)]"
                    >
                        Portfolio inbox
                    </h2>
                    <p className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/42">
                        Contact submissions
                    </p>
                </div>
                <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--signal)]/70">
                    {String(resultCount).padStart(2, '0')} messages
                </span>
            </header>

            {messages.length === 0 ? (
                <EmptyMessageList
                    state={emptyState}
                    isRetrying={isNavigating}
                    onRetry={onRetry}
                />
            ) : (
                <ul aria-label="Portfolio messages" className="min-h-0 flex-1 overflow-y-auto">
                    {messages.map((message) => {
                        const isSelected = selectedMessageId === message.id;
                        const summary = deriveMessageSummary(message.message);

                        return (
                            <li
                                key={message.id}
                                className="relative border-b border-white/[0.065] last:border-b-0"
                            >
                                <button
                                    type="button"
                                    onClick={(event) => onSelect(message.id, event.currentTarget)}
                                    aria-current={isSelected ? 'true' : undefined}
                                    aria-label={`${message.isRead ? 'Read' : 'Unread'} message from ${message.senderName}: ${summary}`}
                                    className={`group relative grid min-h-[7rem] w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-4 py-3.5 text-left transition-[background-color,color] duration-200 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--signal)]/60 motion-reduce:transition-none sm:px-5 ${
                                        isSelected
                                            ? 'bg-[var(--signal)]/[0.075]'
                                            : message.isRead
                                                ? 'bg-transparent hover:bg-white/[0.025]'
                                                : 'bg-white/[0.035] hover:bg-white/[0.055]'
                                    }`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`absolute inset-y-3 left-0 w-0.5 rounded-full bg-[var(--signal)] shadow-[0_0_10px_rgba(195,109,252,0.4)] transition-opacity duration-200 motion-reduce:transition-none ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                                    />

                                    <span className="min-w-0">
                                        <span className="flex min-w-0 items-center gap-2">
                                            <span
                                                aria-hidden="true"
                                                className={`size-1.5 shrink-0 rounded-full ${message.isRead ? 'bg-white/15' : 'bg-[var(--signal)] shadow-[0_0_8px_rgba(195,109,252,0.45)]'}`}
                                            />
                                            <span
                                                className={`truncate text-sm tracking-normal ${message.isRead ? 'font-semibold text-[var(--muted)]/64' : 'font-extrabold text-[var(--text)]'}`}
                                            >
                                                {message.senderName}
                                            </span>
                                            <span className="hidden min-w-0 truncate text-xs text-[var(--muted)]/38 sm:inline">
                                                {message.senderEmail}
                                            </span>
                                            {message.securityStatus === 'flagged' ? (
                                                <span
                                                    title="Security flagged"
                                                    className="inline-flex shrink-0 text-amber-200/72"
                                                >
                                                    <ShieldAlert aria-hidden="true" size={13} strokeWidth={1.8} />
                                                    <span className="sr-only">Security flagged</span>
                                                </span>
                                            ) : null}
                                        </span>

                                        <span
                                            className={`mt-1.5 block truncate text-sm tracking-normal ${message.isRead ? 'font-semibold text-[var(--muted)]/58' : 'font-bold text-[var(--text)]/90'}`}
                                        >
                                            {summary}
                                        </span>
                                        <span className="mt-1 block truncate text-xs leading-relaxed text-[var(--muted)]/46 sm:text-[0.8125rem]">
                                            {message.message}
                                        </span>
                                    </span>

                                    <span className="flex shrink-0 flex-col items-end gap-3 pl-1">
                                        <time
                                            dateTime={message.receivedAt}
                                            className={`whitespace-nowrap font-mono text-[9px] font-bold uppercase tracking-[0.08em] ${message.isRead ? 'text-[var(--muted)]/38' : 'text-[var(--signal)]/70'}`}
                                        >
                                            {formatInboxTimestamp(message.receivedAt, referenceTime)}
                                        </time>
                                        <span
                                            title={message.isStarred ? 'Starred' : 'Not starred'}
                                            className={message.isStarred ? 'text-[var(--signal)]/78' : 'text-[var(--muted)]/22'}
                                        >
                                            <span className="sr-only">
                                                {message.isStarred ? 'Starred message' : 'Not starred'}
                                            </span>
                                            <Star
                                                aria-hidden="true"
                                                size={15}
                                                strokeWidth={1.8}
                                                fill={message.isStarred ? 'currentColor' : 'none'}
                                            />
                                        </span>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {showPagination ? (
                <nav
                    aria-label="Inbox pages"
                    className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-t border-white/[0.07] px-3 sm:px-4"
                >
                    <button
                        type="button"
                        onClick={() => onPageChange(page - 1)}
                        disabled={!hasNewer || isNavigating}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-[var(--muted)]/68 transition-colors duration-200 hover:bg-white/[0.04] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-not-allowed disabled:opacity-30 motion-reduce:transition-none"
                    >
                        <ChevronLeft aria-hidden="true" size={16} strokeWidth={1.8} />
                        Newer
                    </button>
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/44">
                        Page {page}
                    </span>
                    <button
                        type="button"
                        onClick={() => onPageChange(page + 1)}
                        disabled={!hasOlder || isNavigating}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-[var(--muted)]/68 transition-colors duration-200 hover:bg-white/[0.04] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-not-allowed disabled:opacity-30 motion-reduce:transition-none"
                    >
                        Older
                        <ChevronRight aria-hidden="true" size={16} strokeWidth={1.8} />
                    </button>
                </nav>
            ) : null}
        </section>
    );
}
