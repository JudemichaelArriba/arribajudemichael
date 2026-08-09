import {
    Archive,
    ChevronLeft,
    MailCheck,
    MailOpen,
    MessageSquareText,
    Reply,
    Star,
    Trash2,
    type LucideIcon,
} from 'lucide-react';
import type { RefObject } from 'react';

import {
    formatMessageTimestamp,
    type AdminMessage,
} from './messages.data';

interface MessageDetailProps {
    message: AdminMessage | null;
    isInert: boolean;
    backButtonRef: RefObject<HTMLButtonElement | null>;
    disabledControlsDescriptionId: string;
    onBack: () => void;
}

interface DisabledActionProps {
    icon: LucideIcon;
    label: string;
    descriptionId: string;
    emphasized?: boolean;
}

function DisabledAction({
    icon: Icon,
    label,
    descriptionId,
    emphasized = false,
}: DisabledActionProps) {
    return (
        <button
            type="button"
            disabled
            aria-label={label}
            aria-describedby={descriptionId}
            title={`${label} - available after message integration`}
            className={`inline-flex size-10 shrink-0 cursor-not-allowed items-center justify-center rounded-lg border border-transparent transition-none ${emphasized ? 'text-[var(--signal)]/48' : 'text-[var(--muted)]/30'}`}
        >
            <Icon
                aria-hidden="true"
                size={17}
                strokeWidth={1.8}
                fill={emphasized ? 'currentColor' : 'none'}
            />
        </button>
    );
}

function NoSelectedMessage() {
    return (
        <div className="flex min-h-[28rem] flex-1 flex-col items-center justify-center px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] text-[var(--signal)]/62">
                <MessageSquareText aria-hidden="true" size={22} strokeWidth={1.6} />
            </span>
            <h2 className="mt-4 text-base font-extrabold tracking-normal text-[var(--text)]">
                Select a message to read it.
            </h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-[var(--muted)]/52">
                Sender details and the full conversation will appear here.
            </p>
        </div>
    );
}

export default function MessageDetail({
    message,
    isInert,
    backButtonRef,
    disabledControlsDescriptionId,
    onBack,
}: MessageDetailProps) {
    const headingId = message ? `message-detail-${message.id}` : undefined;

    return (
        <article
            aria-labelledby={headingId}
            aria-label={message ? undefined : 'No selected message'}
            inert={isInert ? true : undefined}
            className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
        >
            {!message ? (
                <NoSelectedMessage />
            ) : (
                <>
                    <div className="flex shrink-0 flex-col border-b border-white/[0.07] px-3 py-2 sm:min-h-16 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-0 sm:px-5">
                        <button
                            ref={backButtonRef}
                            type="button"
                            onClick={onBack}
                            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg px-2 text-sm font-bold text-[var(--muted)]/68 transition-colors duration-200 hover:bg-white/[0.04] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 motion-reduce:transition-none xl:hidden"
                        >
                            <ChevronLeft aria-hidden="true" size={18} strokeWidth={1.9} />
                            Back to inbox
                        </button>

                        <p className="hidden font-mono text-[9px] font-bold uppercase tracking-[0.11em] text-[var(--muted)]/42 xl:block">
                            Message detail
                        </p>

                        <div
                            aria-label="Message actions"
                            className="flex w-full items-center justify-between border-t border-white/[0.055] pt-1 sm:ml-auto sm:w-auto sm:justify-start sm:border-t-0 sm:pt-0"
                        >
                            <DisabledAction
                                icon={message.isRead ? MailOpen : MailCheck}
                                label={message.isRead ? 'Mark as unread' : 'Mark as read'}
                                descriptionId={disabledControlsDescriptionId}
                            />
                            <DisabledAction
                                icon={Star}
                                label={message.isStarred ? 'Remove star' : 'Add star'}
                                descriptionId={disabledControlsDescriptionId}
                                emphasized={message.isStarred}
                            />
                            <DisabledAction
                                icon={Archive}
                                label="Archive message"
                                descriptionId={disabledControlsDescriptionId}
                            />
                            <DisabledAction
                                icon={Trash2}
                                label="Delete message"
                                descriptionId={disabledControlsDescriptionId}
                            />
                            <DisabledAction
                                icon={Reply}
                                label="Reply to message"
                                descriptionId={disabledControlsDescriptionId}
                            />
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-7 sm:py-8 lg:px-9 xl:px-10">
                        <header className="border-b border-white/[0.07] pb-6">
                            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                                <div className="min-w-0">
                                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--signal)]/72">
                                        From
                                    </p>
                                    <h2
                                        id={headingId}
                                        className="mt-2 text-xl font-extrabold leading-tight tracking-normal text-[var(--text)] sm:text-2xl"
                                    >
                                        {message.senderName}
                                    </h2>
                                    <p className="mt-1 break-all text-sm text-[var(--muted)]/58">
                                        {message.senderEmail}
                                    </p>
                                </div>

                                <div className="shrink-0 sm:text-right">
                                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]/42">
                                        Received
                                    </p>
                                    <time
                                        dateTime={message.receivedAt}
                                        className="mt-2 block font-mono text-[10px] font-semibold leading-relaxed text-[var(--muted)]/60"
                                    >
                                        {formatMessageTimestamp(message.receivedAt)}
                                    </time>
                                </div>
                            </div>

                            <div className="mt-5 flex flex-wrap items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em]">
                                <span
                                    className={message.isRead
                                        ? 'rounded-md border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-[var(--muted)]/42'
                                        : 'rounded-md border border-[var(--signal)]/18 bg-[var(--signal)]/[0.06] px-2 py-1 text-[var(--signal)]/72'}
                                >
                                    {message.isRead ? 'Read' : 'Unread'}
                                </span>
                                {message.isStarred ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--signal)]/14 bg-[var(--signal)]/[0.045] px-2 py-1 text-[var(--signal)]/62">
                                        <Star aria-hidden="true" size={11} strokeWidth={1.8} fill="currentColor" />
                                        Starred
                                    </span>
                                ) : null}
                            </div>
                        </header>

                        <section aria-labelledby={`${headingId}-body`} className="py-7 sm:py-8">
                            <h3
                                id={`${headingId}-body`}
                                className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]/42"
                            >
                                Message
                            </h3>
                            <p className="mt-5 whitespace-pre-wrap break-words text-[0.9375rem] leading-[1.8] tracking-normal text-[var(--text)]/82 [overflow-wrap:anywhere] sm:text-base">
                                {message.message}
                            </p>
                        </section>
                    </div>
                </>
            )}
        </article>
    );
}
