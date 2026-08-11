import type { ReactNode } from 'react';

interface ManagementPageProps {
    children: ReactNode;
}

interface AdminPageHeaderProps {
    action?: ReactNode;
    children?: ReactNode;
    description: string;
    eyebrow: string;
    headingId?: string;
    title: string;
}

interface AdminPageStatsProps {
    children: ReactNode;
}

interface AdminPageStatProps {
    label: string;
    value: ReactNode;
    valueClassName?: string;
}

export function ManagementPage({ children }: ManagementPageProps) {
    return (
        <div className="mx-auto min-h-svh w-full max-w-[92rem] px-4 pb-12 pt-5 sm:px-5 sm:pb-16 sm:pt-6 md:px-6 md:py-7 lg:px-8 xl:px-10">
            {children}
        </div>
    );
}

export function AdminPageHeader({
    action,
    children,
    description,
    eyebrow,
    headingId,
    title,
}: AdminPageHeaderProps) {
    return (
        <header className="relative overflow-hidden rounded-lg border border-white/[0.085] bg-[#07080a] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] sm:px-6 sm:py-6 lg:px-7">
            <span
                aria-hidden="true"
                className="absolute bottom-5 left-0 top-5 w-0.5 bg-[var(--signal)]/72"
            />

            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--signal)]/78">
                        {eyebrow}
                    </p>
                    <h1
                        id={headingId}
                        className="mt-2 font-display text-3xl font-extrabold leading-tight tracking-normal text-[var(--text)] sm:text-4xl"
                    >
                        {title}
                    </h1>
                    <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-[var(--muted)]/62 sm:text-[0.95rem]">
                        {description}
                    </p>
                </div>

                {action ? <div className="shrink-0 sm:self-center">{action}</div> : null}
            </div>

            {children ? <div className="mt-6">{children}</div> : null}
        </header>
    );
}

export function AdminPageStats({ children }: AdminPageStatsProps) {
    return (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:flex-wrap sm:gap-x-10">
            {children}
        </dl>
    );
}

export function AdminPageStat({
    label,
    value,
    valueClassName = 'text-[var(--text)]',
}: AdminPageStatProps) {
    return (
        <div className="min-w-0">
            <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/42">
                {label}
            </dt>
            <dd className={`mt-1 text-base font-extrabold tabular-nums ${valueClassName}`}>
                {value}
            </dd>
        </div>
    );
}
