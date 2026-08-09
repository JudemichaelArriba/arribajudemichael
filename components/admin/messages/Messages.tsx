'use client';

import { Inbox, Search } from 'lucide-react';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import { ManagementPage } from '@/components/admin/layout/ManagementPage';
import MessageDetail from './MessageDetail';
import MessageList from './MessageList';
import type { AdminMessage } from './messages.data';

interface MessagesProps {
    initialMessages: readonly AdminMessage[];
    referenceTime: string;
}

const SPLIT_VIEW_QUERY = '(min-width: 1280px)';
const DISABLED_CONTROLS_DESCRIPTION_ID = 'messages-disabled-controls-description';

export default function Messages({
    initialMessages,
    referenceTime,
}: MessagesProps) {
    const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
    const [isSplitView, setIsSplitView] = useState(false);
    const backButtonRef = useRef<HTMLButtonElement>(null);
    const selectedTriggerRef = useRef<HTMLButtonElement | null>(null);
    const focusFrameRef = useRef<number | null>(null);

    const selectedMessage = useMemo(
        () => initialMessages.find((message) => message.id === selectedMessageId) ?? null,
        [initialMessages, selectedMessageId],
    );
    const unreadCount = useMemo(
        () => initialMessages.filter((message) => !message.isRead).length,
        [initialMessages],
    );
    const starredCount = useMemo(
        () => initialMessages.filter((message) => message.isStarred).length,
        [initialMessages],
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

    useEffect(() => () => {
        if (focusFrameRef.current !== null) {
            window.cancelAnimationFrame(focusFrameRef.current);
        }
    }, []);

    const scheduleFocus = useCallback((target: () => HTMLElement | null) => {
        if (focusFrameRef.current !== null) {
            window.cancelAnimationFrame(focusFrameRef.current);
        }

        focusFrameRef.current = window.requestAnimationFrame(() => {
            target()?.focus();
            focusFrameRef.current = null;
        });
    }, []);

    const handleSelectMessage = useCallback((
        messageId: string,
        trigger: HTMLButtonElement,
    ) => {
        selectedTriggerRef.current = trigger;
        setSelectedMessageId(messageId);

        if (!isSplitView) {
            scheduleFocus(() => backButtonRef.current);
        }
    }, [isSplitView, scheduleFocus]);

    const handleBackToInbox = useCallback(() => {
        setSelectedMessageId(null);
        scheduleFocus(() => selectedTriggerRef.current);
    }, [scheduleFocus]);

    const filters = [
        { id: 'all', label: 'All', count: initialMessages.length },
        { id: 'unread', label: 'Unread', count: unreadCount },
        { id: 'starred', label: 'Starred', count: starredCount },
    ] as const;
    const isDetailOpen = selectedMessage !== null;

    return (
        <ManagementPage>
            <section aria-labelledby="messages-page-heading">
                <p id={DISABLED_CONTROLS_DESCRIPTION_ID} className="sr-only">
                    This control is a visual preview and becomes available after message integration.
                </p>

                <div className={isDetailOpen ? 'hidden xl:block' : 'block'}>
                    <header className="border-b border-white/[0.07] pb-7">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--signal)]/78">
                            Communication / Inbox
                        </p>
                        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-2">
                            <h1
                                id="messages-page-heading"
                                className="font-display text-3xl font-extrabold leading-tight tracking-normal text-[var(--text)] sm:text-4xl"
                            >
                                Email / Messages
                            </h1>
                            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]/48">
                                {String(initialMessages.length).padStart(2, '0')} messages
                            </span>
                        </div>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)]/62 sm:text-base">
                            Review conversations started through your public portfolio contact form.
                        </p>
                    </header>

                    <div className="mt-6 flex flex-col gap-3 border-y border-white/[0.07] py-4 lg:flex-row lg:items-center lg:justify-between">
                        <div role="search" className="relative min-w-0 flex-1 lg:max-w-xl">
                            <label htmlFor="message-search" className="sr-only">
                                Search sender, email, or message
                            </label>
                            <Search
                                aria-hidden="true"
                                size={17}
                                strokeWidth={1.8}
                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]/32"
                            />
                            <input
                                id="message-search"
                                type="search"
                                disabled
                                aria-describedby={DISABLED_CONTROLS_DESCRIPTION_ID}
                                placeholder="Search sender, email, or message"
                                className="min-h-11 w-full cursor-not-allowed rounded-lg border border-white/[0.08] bg-white/[0.025] py-2.5 pl-10 pr-4 text-sm text-[var(--muted)]/45 outline-none placeholder:text-[var(--muted)]/30 disabled:opacity-75"
                            />
                        </div>

                        <nav aria-label="Message filters" className="grid grid-cols-3 gap-1 rounded-lg border border-white/[0.08] bg-black/35 p-1 sm:w-fit">
                            {filters.map((filter) => {
                                const isActive = filter.id === 'all';

                                return (
                                    <button
                                        key={filter.id}
                                        type="button"
                                        disabled
                                        aria-pressed={isActive}
                                        aria-describedby={DISABLED_CONTROLS_DESCRIPTION_ID}
                                        className={`inline-flex min-h-10 cursor-not-allowed items-center justify-center gap-2 rounded-md px-3 text-xs font-bold tracking-normal transition-none ${isActive ? 'bg-[var(--signal)]/[0.09] text-[var(--signal)]/72' : 'text-[var(--muted)]/38'}`}
                                    >
                                        {filter.label}
                                        <span className="font-mono text-[9px] tabular-nums opacity-70">
                                            {filter.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                <div
                    aria-label="Portfolio inbox workspace"
                    className={`relative grid min-w-0 overflow-hidden rounded-lg border border-white/[0.085] bg-white/[0.018] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] xl:h-[clamp(32rem,calc(100dvh-15rem),52rem)] xl:grid-cols-[minmax(20rem,0.42fr)_minmax(0,1fr)] ${isDetailOpen ? 'mt-0 xl:mt-6' : 'mt-6'}`}
                >
                    <div
                        className={`min-h-[32rem] min-w-0 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none xl:relative xl:inset-auto xl:h-full xl:translate-x-0 xl:border-r xl:border-white/[0.07] xl:opacity-100 ${
                            isDetailOpen
                                ? 'pointer-events-none absolute inset-0 -translate-x-3 opacity-0 xl:pointer-events-auto'
                                : 'relative translate-x-0 opacity-100'
                        }`}
                    >
                        <MessageList
                            messages={initialMessages}
                            selectedMessageId={selectedMessageId}
                            referenceTime={referenceTime}
                            isInert={isDetailOpen && !isSplitView}
                            onSelect={handleSelectMessage}
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
                            disabledControlsDescriptionId={DISABLED_CONTROLS_DESCRIPTION_ID}
                            onBack={handleBackToInbox}
                        />
                    </div>
                </div>

                <p aria-live="polite" className="sr-only">
                    {selectedMessage
                        ? `Viewing message from ${selectedMessage.senderName}.`
                        : 'No message selected.'}
                </p>
            </section>
        </ManagementPage>
    );
}
