import {
    Archive,
    ArchiveRestore,
    ChevronLeft,
    MailCheck,
    MailOpen,
    MessageSquareText,
    Reply,
    ShieldAlert,
    ShieldBan,
    ShieldCheck,
    ShieldOff,
    Star,
    Trash2,
    type LucideIcon,
} from 'lucide-react';
import type { RefObject } from 'react';

import type { AdminMessageDto } from '@/features/admin/messages/types';
import { formatMessageTimestamp } from './messageFormatting';

interface MessageDetailProps {
    message: AdminMessageDto | null;
    isInert: boolean;
    backButtonRef: RefObject<HTMLButtonElement | null>;
    replyDescriptionId: string;
    isActionPending: boolean;
    onBack: () => void;
    onToggleRead: () => void;
    onToggleStar: () => void;
    onArchiveToggle: () => void;
    onBanSource: () => void;
    onRevokeSourceBan: () => void;
    onDelete: () => void;
}

interface MessageActionProps {
    icon: LucideIcon;
    label: string;
    disabled: boolean;
    onClick: () => void;
    active?: boolean;
    filled?: boolean;
    danger?: boolean;
    security?: boolean;
}

function MessageAction({
    icon: Icon,
    label,
    disabled,
    onClick,
    active = false,
    filled = false,
    danger = false,
    security = false,
}: MessageActionProps) {
    const colorClass = danger
        ? 'text-red-300/60 hover:border-red-300/18 hover:bg-red-300/[0.06] hover:text-red-200'
        : security
            ? 'text-amber-100/58 hover:border-amber-200/16 hover:bg-amber-200/[0.055] hover:text-amber-100'
        : active
            ? 'text-[var(--signal)] hover:border-[var(--signal)]/18 hover:bg-[var(--signal)]/[0.07]'
            : 'text-[var(--muted)]/58 hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-[var(--text)]';

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
            className={`inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-transparent transition-[color,border-color,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-wait disabled:opacity-40 motion-reduce:transition-none ${colorClass}`}
        >
            <Icon
                aria-hidden="true"
                size={17}
                strokeWidth={1.8}
                fill={filled ? 'currentColor' : 'none'}
            />
        </button>
    );
}

function DisabledReply({ descriptionId }: { descriptionId: string }) {
    return (
        <button
            type="button"
            disabled
            aria-label="Reply to message"
            aria-describedby={descriptionId}
            title="Reply requires an email service"
            className="inline-flex size-10 shrink-0 cursor-not-allowed items-center justify-center rounded-lg border border-transparent text-[var(--muted)]/28"
        >
            <Reply aria-hidden="true" size={17} strokeWidth={1.8} />
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
    replyDescriptionId,
    isActionPending,
    onBack,
    onToggleRead,
    onToggleStar,
    onArchiveToggle,
    onBanSource,
    onRevokeSourceBan,
    onDelete,
}: MessageDetailProps) {
    const headingId = message ? `message-detail-${message.id}` : undefined;

    return (
        <article
            aria-labelledby={headingId}
            aria-label={message ? undefined : 'No selected message'}
            aria-busy={isActionPending}
            inert={isInert ? true : undefined}
            className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
        >
            {!message ? (
                <NoSelectedMessage />
            ) : (
                <>
                    <div className="flex shrink-0 flex-col border-b border-white/[0.07] px-3 py-2 sm:min-h-16 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5 sm:py-0">
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
                            <MessageAction
                                icon={message.isRead ? MailOpen : MailCheck}
                                label={message.isRead ? 'Mark as unread' : 'Mark as read'}
                                disabled={isActionPending}
                                onClick={onToggleRead}
                            />
                            <MessageAction
                                icon={Star}
                                label={message.isStarred ? 'Remove star' : 'Add star'}
                                disabled={isActionPending}
                                onClick={onToggleStar}
                                active={message.isStarred}
                                filled={message.isStarred}
                            />
                            <MessageAction
                                icon={message.isArchived ? ArchiveRestore : Archive}
                                label={message.isArchived ? 'Restore to inbox' : 'Archive message'}
                                disabled={isActionPending}
                                onClick={onArchiveToggle}
                            />
                            <MessageAction
                                icon={message.isSourceBanned ? ShieldOff : ShieldBan}
                                label={message.isSourceBanned
                                    ? 'Revoke source ban'
                                    : 'Ban message source'}
                                disabled={isActionPending}
                                onClick={message.isSourceBanned
                                    ? onRevokeSourceBan
                                    : onBanSource}
                                security
                            />
                            <MessageAction
                                icon={Trash2}
                                label="Delete message"
                                disabled={isActionPending}
                                onClick={onDelete}
                                danger
                            />
                            <DisabledReply descriptionId={replyDescriptionId} />
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
                                {message.isArchived ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.025] px-2 py-1 text-[var(--muted)]/56">
                                        <Archive aria-hidden="true" size={11} strokeWidth={1.8} />
                                        Archived
                                    </span>
                                ) : null}
                                {message.securityStatus === 'flagged' ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200/16 bg-amber-200/[0.055] px-2 py-1 text-amber-100/72">
                                        <ShieldAlert aria-hidden="true" size={11} strokeWidth={1.8} />
                                        Flagged
                                    </span>
                                ) : null}
                                {message.isSourceBanned ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-md border border-red-300/16 bg-red-300/[0.055] px-2 py-1 text-red-200/72">
                                        <ShieldCheck aria-hidden="true" size={11} strokeWidth={1.8} />
                                        Source banned
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
