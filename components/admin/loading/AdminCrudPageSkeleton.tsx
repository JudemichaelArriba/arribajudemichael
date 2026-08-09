import { ManagementPage } from '@/components/admin/layout/ManagementPage';

type AdminSkeletonVariant = 'projects' | 'certificates' | 'experiences';

interface AdminCrudPageSkeletonProps {
    variant: AdminSkeletonVariant;
}

const VARIANT_LABELS: Record<AdminSkeletonVariant, string> = {
    projects: 'projects',
    certificates: 'certificates',
    experiences: 'experiences',
};

const PROJECT_ROWS = [0, 1, 2, 3] as const;
const CERTIFICATE_CARDS = [0, 1, 2, 3, 4, 5] as const;
const EXPERIENCE_ROWS = [0, 1, 2, 3] as const;

function SkeletonBlock({ className }: { className: string }) {
    return <div className={`rounded-[6px] bg-white/[0.06] ${className}`} />;
}

function AdminHeaderSkeleton() {
    return (
        <>
            <header className="flex flex-col gap-6 border-b border-white/[0.07] pb-7 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 flex-1">
                    <SkeletonBlock className="h-2.5 w-32" />
                    <div className="mt-3 flex items-end gap-3">
                        <SkeletonBlock className="h-9 w-44 max-w-[65vw] sm:h-10 sm:w-56" />
                        <SkeletonBlock className="mb-1 h-2.5 w-20" />
                    </div>
                    <div className="mt-4 space-y-2">
                        <SkeletonBlock className="h-3 w-full max-w-xl" />
                        <SkeletonBlock className="h-3 w-3/5 max-w-sm" />
                    </div>
                </div>
                <SkeletonBlock className="h-11 w-full shrink-0 sm:w-36" />
            </header>

            <div className="min-h-6 pt-4" />

            <div className="mb-4 mt-4 flex items-center justify-between gap-4 sm:mt-6">
                <div className="flex items-center gap-2.5">
                    <SkeletonBlock className="size-4" />
                    <SkeletonBlock className="h-3.5 w-32" />
                </div>
                <SkeletonBlock className="h-2.5 w-20" />
            </div>
        </>
    );
}

function ProjectRowsSkeleton() {
    return (
        <ul className="space-y-4">
            {PROJECT_ROWS.map((row) => (
                <li
                    key={row}
                    className="grid min-w-0 overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.025] lg:grid-cols-[minmax(14rem,0.34fr)_minmax(0,1fr)_auto]"
                >
                    <div className="aspect-[1.75/1] min-w-0 border-b border-white/[0.07] bg-white/[0.035] lg:aspect-auto lg:min-h-56 lg:border-b-0 lg:border-r" />

                    <div className="min-w-0 p-4 sm:p-5 lg:p-6">
                        <div className="flex items-center gap-3">
                            <SkeletonBlock className="h-2.5 w-7" />
                            <SkeletonBlock className="h-px w-4" />
                            <SkeletonBlock className="h-2.5 w-24" />
                            <SkeletonBlock className="h-2.5 w-16" />
                        </div>
                        <SkeletonBlock className="mt-4 h-7 w-3/5 max-w-md" />
                        <div className="mt-3 space-y-2">
                            <SkeletonBlock className="h-3 w-full max-w-2xl" />
                            <SkeletonBlock className="h-3 w-4/5 max-w-xl" />
                        </div>
                        <div className="mt-5 flex flex-wrap gap-2">
                            <SkeletonBlock className="h-6 w-16" />
                            <SkeletonBlock className="h-6 w-20" />
                            <SkeletonBlock className="h-6 w-14" />
                        </div>
                    </div>

                    <div className="flex gap-2 border-t border-white/[0.07] p-4 lg:min-w-40 lg:flex-col lg:justify-end lg:border-l lg:border-t-0 lg:p-5">
                        <SkeletonBlock className="h-11 flex-1 lg:flex-none" />
                        <SkeletonBlock className="h-11 flex-1 lg:flex-none" />
                    </div>
                </li>
            ))}
        </ul>
    );
}

function CertificateCardsSkeleton() {
    return (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {CERTIFICATE_CARDS.map((card) => (
                <li
                    key={card}
                    className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.025]"
                >
                    <div className="aspect-[1.3/1] w-full border-b border-white/[0.07] bg-white/[0.045]" />
                    <div className="flex min-h-52 flex-1 flex-col p-4 sm:p-5">
                        <div className="flex items-center gap-2.5">
                            <SkeletonBlock className="h-2.5 w-7" />
                            <SkeletonBlock className="h-px w-4" />
                            <SkeletonBlock className="h-2.5 w-24" />
                        </div>
                        <SkeletonBlock className="mt-4 h-6 w-4/5" />
                        <SkeletonBlock className="mt-3 h-3 w-2/5" />
                        <SkeletonBlock className="mt-5 h-11 w-24" />
                        <div className="mt-auto flex gap-2 border-t border-white/[0.07] pt-4">
                            <SkeletonBlock className="h-11 w-20" />
                            <SkeletonBlock className="h-11 w-20" />
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );
}

function ExperienceRowsSkeleton() {
    return (
        <ol className="relative space-y-4 before:absolute before:bottom-8 before:left-[1.3125rem] before:top-8 before:w-px before:bg-white/[0.08]">
            {EXPERIENCE_ROWS.map((row) => (
                <li
                    key={row}
                    className="relative grid min-w-0 grid-cols-[2.625rem_minmax(0,1fr)] gap-3 sm:gap-4"
                >
                    <div className="relative z-[1] mt-5 size-[2.625rem] rounded-lg border border-white/[0.09] bg-black">
                        <div className="m-auto mt-[1.05rem] h-2 w-4 rounded bg-white/[0.07]" />
                    </div>
                    <article className="grid min-h-52 min-w-0 rounded-lg border border-white/[0.08] bg-white/[0.025] xl:grid-cols-[minmax(0,1fr)_auto]">
                        <div className="min-w-0 p-4 sm:p-5 lg:p-6">
                            <div className="flex flex-wrap items-center gap-3">
                                <SkeletonBlock className="h-2.5 w-24" />
                                <SkeletonBlock className="h-2.5 w-20" />
                                <SkeletonBlock className="h-2.5 w-16" />
                            </div>
                            <SkeletonBlock className="mt-5 h-2.5 w-28" />
                            <SkeletonBlock className="mt-3 h-7 w-3/5 max-w-md" />
                            <div className="mt-3 space-y-2">
                                <SkeletonBlock className="h-3 w-full max-w-2xl" />
                                <SkeletonBlock className="h-3 w-4/5 max-w-xl" />
                            </div>
                        </div>
                        <div className="flex gap-2 border-t border-white/[0.07] p-4 xl:min-w-40 xl:flex-col xl:justify-end xl:border-l xl:border-t-0 xl:p-5">
                            <SkeletonBlock className="h-11 flex-1 xl:flex-none" />
                            <SkeletonBlock className="h-11 flex-1 xl:flex-none" />
                        </div>
                    </article>
                </li>
            ))}
        </ol>
    );
}

export default function AdminCrudPageSkeleton({
    variant,
}: AdminCrudPageSkeletonProps) {
    return (
        <ManagementPage>
            <section aria-busy="true" aria-label={`Loading ${VARIANT_LABELS[variant]}`}>
                <span role="status" className="sr-only">
                    Loading {VARIANT_LABELS[variant]}...
                </span>
                <div
                    aria-hidden="true"
                    className="animate-pulse motion-reduce:animate-none"
                >
                    <AdminHeaderSkeleton />
                    {variant === 'projects' ? <ProjectRowsSkeleton /> : null}
                    {variant === 'certificates' ? <CertificateCardsSkeleton /> : null}
                    {variant === 'experiences' ? <ExperienceRowsSkeleton /> : null}
                </div>
            </section>
        </ManagementPage>
    );
}
