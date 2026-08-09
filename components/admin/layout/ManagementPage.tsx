import { Info, Pencil, Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

interface ManagementPageProps {
    children: ReactNode;
}

interface ManagementPageChromeProps {
    eyebrow: string;
    title: string;
    description: string;
    count: number;
    countLabel: string;
    actionLabel: string;
    noticeId: string;
    action?: ReactNode;
    notice?: ReactNode;
    showNotice?: boolean;
}

interface StaticItemActionsProps {
    itemLabel: string;
    noticeId: string;
    className?: string;
}

const DISABLED_ACTION_CLASS =
    'inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold opacity-60';

export function ManagementPage({ children }: ManagementPageProps) {
    return (
        <div className="mx-auto min-h-svh w-full max-w-[96rem] px-4 pb-12 pt-5 sm:px-6 sm:pb-16 sm:pt-7 md:px-8 md:pt-8 xl:px-10">
            {children}
        </div>
    );
}

export function ManagementPageChrome({
    eyebrow,
    title,
    description,
    count,
    countLabel,
    actionLabel,
    noticeId,
    action,
    notice,
    showNotice = true,
}: ManagementPageChromeProps) {
    return (
        <>
            <header className="flex flex-col gap-6 border-b border-white/[0.07] pb-7 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--signal)]/78">
                        {eyebrow}
                    </p>
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-2">
                        <h1 className="font-display text-3xl font-extrabold leading-tight tracking-normal text-[var(--text)] sm:text-4xl">
                            {title}
                        </h1>
                        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]/48">
                            {String(count).padStart(2, '0')} {countLabel}
                        </span>
                    </div>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)]/62 sm:text-base">
                        {description}
                    </p>
                </div>

                {action ?? (
                    <button
                        type="button"
                        disabled
                        aria-describedby={noticeId}
                        title="Available after database integration"
                        className="inline-flex min-h-11 w-full shrink-0 cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-[var(--signal)]/18 bg-[var(--signal)]/10 px-4 text-sm font-bold text-[var(--signal)]/55 sm:w-auto"
                    >
                        <Plus aria-hidden="true" size={17} strokeWidth={2} />
                        {actionLabel}
                    </button>
                )}
            </header>

            {showNotice ? (
                notice ?? (
                    <div
                        id={noticeId}
                        className="mt-6 flex items-start gap-3 border-y border-[var(--signal)]/12 bg-[var(--signal)]/[0.035] px-3.5 py-3 text-sm text-[var(--muted)]/62 sm:px-4"
                    >
                        <Info
                            aria-hidden="true"
                            size={17}
                            strokeWidth={1.8}
                            className="mt-0.5 shrink-0 text-[var(--signal)]/75"
                        />
                        <p className="leading-relaxed">
                            Static preview mode. Management controls are visible for review, but changes are not saved or published.
                        </p>
                    </div>
                )
            ) : null}
        </>
    );
}

export function StaticItemActions({
    itemLabel,
    noticeId,
    className = '',
}: StaticItemActionsProps) {
    return (
        <div className={`flex flex-wrap items-center gap-2 ${className}`}>
            <button
                type="button"
                disabled
                aria-label={`Edit ${itemLabel}`}
                aria-describedby={noticeId}
                title="Available after database integration"
                className={`${DISABLED_ACTION_CLASS} border-white/[0.09] bg-white/[0.025] text-[var(--muted)]/58`}
            >
                <Pencil aria-hidden="true" size={15} strokeWidth={1.8} />
                Edit
            </button>
            <button
                type="button"
                disabled
                aria-label={`Delete ${itemLabel}`}
                aria-describedby={noticeId}
                title="Available after database integration"
                className={`${DISABLED_ACTION_CLASS} border-red-400/10 bg-red-400/[0.025] text-red-300/45`}
            >
                <Trash2 aria-hidden="true" size={15} strokeWidth={1.8} />
                Delete
            </button>
        </div>
    );
}
