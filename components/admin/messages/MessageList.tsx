import { Inbox, SearchX, Star } from 'lucide-react';

import {
    deriveMessageSummary,
    formatInboxTimestamp,
    type AdminMessage,
} from './messages.data';

export type MessageListEmptyState = 'inbox' | 'search';

interface MessageListProps {
    messages: readonly AdminMessage[];
    selectedMessageId: string | null;
    referenceTime: string;
    isInert: boolean;
    emptyState?: MessageListEmptyState;
    onSelect: (messageId: string, trigger: HTMLButtonElement) => void;
}

const EMPTY_STATE_CONTENT: Record<
    MessageListEmptyState,
    { title: string; description: string }
> = {
    inbox: {
        title: 'Inbox clear.',
        description: 'No new portfolio messages right now.',
    },
    search: {
        title: 'No conversations found.',
        description: 'Try another name, email, or keyword.',
    },
};

function EmptyMessageList({ state }: { state: MessageListEmptyState }) {
    const content = EMPTY_STATE_CONTENT[state];
    const Icon = state === 'search' ? SearchX : Inbox;

    return (
        <div className="flex min-h-[28rem] flex-1 flex-col items-center justify-center px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] text-[var(--signal)]/65">
                <Icon aria-hidden="true" size={22} strokeWidth={1.6} />
            </span>
            <h3 className="mt-4 text-base font-extrabold tracking-normal text-[var(--text)]">
                {content.title}
            </h3>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-[var(--muted)]/55">
                {content.description}
            </p>
        </div>
    );
}

export default function MessageList({
    messages,
    selectedMessageId,
    referenceTime,
    isInert,
    emptyState = 'inbox',
    onSelect,
}: MessageListProps) {
    return (
        <section
            aria-labelledby="portfolio-inbox-heading"
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
                    {String(messages.length).padStart(2, '0')} messages
                </span>
            </header>

            {messages.length === 0 ? (
                <EmptyMessageList state={emptyState} />
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
                                    className={`group relative grid min-h-[8.25rem] w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-4 py-4 text-left transition-[background-color,color] duration-200 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--signal)]/60 motion-reduce:transition-none sm:px-5 ${
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
                                        </span>

                                        <span
                                            className={`mt-2 block truncate text-sm tracking-normal ${message.isRead ? 'font-semibold text-[var(--muted)]/58' : 'font-bold text-[var(--text)]/90'}`}
                                        >
                                            {summary}
                                        </span>
                                        <span className="mt-1.5 line-clamp-2 block text-xs leading-relaxed text-[var(--muted)]/46 sm:text-[0.8125rem]">
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
        </section>
    );
}
