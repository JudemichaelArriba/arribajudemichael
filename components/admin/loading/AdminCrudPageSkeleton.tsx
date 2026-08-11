import { ManagementPage } from '@/components/admin/layout/ManagementPage';

type AdminSkeletonVariant =
    | 'analytics'
    | 'dashboard'
    | 'projects'
    | 'certificates'
    | 'experiences'
    | 'messages';

interface AdminCrudPageSkeletonProps {
    variant: AdminSkeletonVariant;
}

interface AdminHeaderSkeletonProps {
    action?: 'button' | 'count' | 'none';
    filters?: boolean;
    statCount?: number;
}

const VARIANT_LABELS: Record<AdminSkeletonVariant, string> = {
    analytics: 'analytics',
    dashboard: 'dashboard',
    projects: 'projects',
    certificates: 'certificates',
    experiences: 'experiences',
    messages: 'messages',
};

const PROJECT_ROWS = [0, 1, 2, 3] as const;
const CERTIFICATE_ROWS = [0, 1, 2] as const;
const EXPERIENCE_ROWS = [0, 1, 2, 3] as const;
const MESSAGE_ROWS = [0, 1, 2, 3, 4] as const;
const ANALYTICS_SECTION_ROWS = [0, 1, 2, 3] as const;
const ANALYTICS_CHART_BARS = [
    'w-[88%]',
    'w-[76%]',
    'w-[65%]',
    'w-[54%]',
    'w-[43%]',
] as const;

function SkeletonBlock({ className }: { className: string }) {
    return <div className={`rounded-[6px] bg-white/[0.06] ${className}`} />;
}

function AdminHeaderSkeleton({
    action = 'button',
    filters = false,
    statCount = 0,
}: AdminHeaderSkeletonProps) {
    return (
        <header className="relative overflow-hidden rounded-lg border border-white/[0.085] bg-[#07080a] px-5 py-5 sm:px-6 sm:py-6 lg:px-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                    <SkeletonBlock className="h-2.5 w-36" />
                    <SkeletonBlock className="mt-3 h-9 w-48 max-w-[68vw] sm:h-10 sm:w-60" />
                    <div className="mt-4 space-y-2">
                        <SkeletonBlock className="h-3 w-full max-w-xl" />
                        <SkeletonBlock className="h-3 w-3/5 max-w-sm" />
                    </div>
                </div>

                {action === 'button' ? (
                    <SkeletonBlock className="h-11 w-full shrink-0 sm:w-36" />
                ) : null}
                {action === 'count' ? (
                    <div className="w-24 shrink-0 sm:text-right">
                        <SkeletonBlock className="h-7 w-12 sm:ml-auto" />
                        <SkeletonBlock className="mt-2 h-2 w-20 sm:ml-auto" />
                    </div>
                ) : null}
            </div>

            {statCount > 0 ? (
                <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:gap-x-10">
                    {Array.from({ length: statCount }, (_, index) => (
                        <div key={index} className="min-w-20">
                            <SkeletonBlock className="h-2 w-14" />
                            <SkeletonBlock className="mt-2 h-5 w-8" />
                        </div>
                    ))}
                </div>
            ) : null}

            {filters ? (
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[0, 1, 2, 3].map((filter) => (
                        <div
                            key={filter}
                            className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-white/[0.06] bg-black/35 px-3.5"
                        >
                            <SkeletonBlock className="h-2.5 w-14" />
                            <SkeletonBlock className="h-4 w-5" />
                        </div>
                    ))}
                </div>
            ) : null}
        </header>
    );
}

function RegistryHeadingSkeleton() {
    return (
        <div className="mb-4 mt-8 flex items-end justify-between gap-4">
            <div>
                <SkeletonBlock className="h-4 w-36" />
                <SkeletonBlock className="mt-2.5 h-2.5 w-64 max-w-[65vw]" />
            </div>
            <SkeletonBlock className="hidden h-2.5 w-28 sm:block" />
        </div>
    );
}

function ProjectRowsSkeleton() {
    return (
        <>
            <RegistryHeadingSkeleton />
            <ol className="divide-y divide-white/[0.07] overflow-hidden rounded-lg border border-white/[0.085] bg-[#07080a]">
                {PROJECT_ROWS.map((row) => (
                    <li
                        key={row}
                        className="grid min-w-0 md:grid-cols-[minmax(13rem,0.36fr)_minmax(0,1fr)] xl:grid-cols-[5.5rem_minmax(14rem,17rem)_minmax(0,1fr)_10.5rem]"
                    >
                        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3 md:col-span-2 xl:col-span-1 xl:flex-col xl:items-start xl:border-b-0 xl:border-r xl:py-5">
                            <div>
                                <SkeletonBlock className="h-2 w-9" />
                                <SkeletonBlock className="mt-2 h-7 w-8" />
                            </div>
                            <SkeletonBlock className="h-2 w-14" />
                        </div>
                        <div className="aspect-video border-b border-white/[0.07] bg-white/[0.035] md:aspect-auto md:min-h-56 md:border-b-0 md:border-r xl:min-h-52" />
                        <div className="min-w-0 px-4 py-5 sm:px-5 md:px-6 xl:py-6">
                            <div className="flex items-center gap-3">
                                <SkeletonBlock className="h-2.5 w-24" />
                                <SkeletonBlock className="h-5 w-16" />
                            </div>
                            <SkeletonBlock className="mt-4 h-7 w-3/5 max-w-md" />
                            <div className="mt-3 space-y-2">
                                <SkeletonBlock className="h-3 w-full max-w-2xl" />
                                <SkeletonBlock className="h-3 w-4/5 max-w-xl" />
                            </div>
                            <div className="mt-5 flex gap-2">
                                <SkeletonBlock className="h-6 w-16" />
                                <SkeletonBlock className="h-6 w-20" />
                                <SkeletonBlock className="h-6 w-14" />
                            </div>
                            <SkeletonBlock className="mt-5 h-2.5 w-44" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 border-t border-white/[0.07] p-4 md:col-span-2 xl:col-span-1 xl:flex xl:flex-col xl:justify-center xl:border-l xl:border-t-0">
                            <SkeletonBlock className="h-11" />
                            <SkeletonBlock className="h-11" />
                        </div>
                    </li>
                ))}
            </ol>
        </>
    );
}

function CertificateRowsSkeleton() {
    return (
        <>
            <RegistryHeadingSkeleton />
            <ol className="space-y-4">
                {CERTIFICATE_ROWS.map((row) => (
                    <li
                        key={row}
                        className="overflow-hidden rounded-lg border border-white/[0.085] bg-[#07080a]"
                    >
                        <div className="flex min-h-12 items-center justify-between border-b border-white/[0.07] px-4 sm:px-5">
                            <div className="flex items-center gap-3">
                                <SkeletonBlock className="h-2.5 w-20" />
                                <SkeletonBlock className="h-4 w-6" />
                                <SkeletonBlock className="h-2.5 w-14" />
                            </div>
                            <SkeletonBlock className="h-5 w-20" />
                        </div>
                        <div className="grid md:grid-cols-[minmax(16rem,0.4fr)_minmax(0,1fr)] xl:grid-cols-[minmax(19rem,0.36fr)_minmax(0,1fr)]">
                            <div className="border-b border-white/[0.07] bg-[#030405] p-3 sm:p-4 md:border-b-0 md:border-r">
                                <div className="aspect-[1.3/1] rounded-[4px] bg-white/[0.1]" />
                                <div className="mt-3 flex justify-between">
                                    <SkeletonBlock className="h-2.5 w-24" />
                                    <SkeletonBlock className="h-2.5 w-16" />
                                </div>
                            </div>
                            <div className="flex min-h-64 flex-col px-4 py-5 sm:px-6 sm:py-6 xl:px-7">
                                <SkeletonBlock className="h-2.5 w-28" />
                                <SkeletonBlock className="mt-4 h-7 w-4/5 max-w-xl" />
                                <SkeletonBlock className="mt-3 h-3 w-2/5" />
                                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <SkeletonBlock className="h-10 w-full" />
                                    <SkeletonBlock className="h-10 w-full" />
                                </div>
                                <div className="mt-auto grid grid-cols-2 gap-2 pt-5 sm:flex">
                                    <SkeletonBlock className="h-11 w-full sm:w-20" />
                                    <SkeletonBlock className="h-11 w-full sm:w-24" />
                                    <SkeletonBlock className="col-span-2 h-11 w-full sm:ml-auto sm:w-20" />
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ol>
        </>
    );
}

function ExperienceRowsSkeleton() {
    return (
        <>
            <RegistryHeadingSkeleton />
            <ol className="divide-y divide-white/[0.07] overflow-hidden rounded-lg border border-white/[0.085] bg-[#07080a]">
                {EXPERIENCE_ROWS.map((row) => (
                    <li key={row} className="grid min-w-0 md:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)]">
                        <div className="border-b border-white/[0.07] bg-[#030405] px-4 py-5 sm:px-5 md:border-b-0 md:border-r md:py-6">
                            <div className="flex gap-3">
                                <SkeletonBlock className="size-5 shrink-0 rounded-full" />
                                <div className="min-w-0 flex-1">
                                    <SkeletonBlock className="h-2.5 w-20" />
                                    <SkeletonBlock className="mt-3 h-5 w-32" />
                                    <SkeletonBlock className="mt-3 h-2.5 w-24" />
                                </div>
                            </div>
                            <div className="mt-6 flex items-center justify-between">
                                <SkeletonBlock className="h-2.5 w-20" />
                                <SkeletonBlock className="h-6 w-8" />
                            </div>
                        </div>
                        <div className="min-w-0 px-4 py-5 sm:px-6 sm:py-6 xl:px-7">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <SkeletonBlock className="h-2.5 w-28" />
                                    <SkeletonBlock className="mt-3 h-7 w-3/5 max-w-md" />
                                </div>
                                <SkeletonBlock className="h-5 w-20" />
                            </div>
                            <div className="mt-4 space-y-2">
                                <SkeletonBlock className="h-3 w-full max-w-2xl" />
                                <SkeletonBlock className="h-3 w-4/5 max-w-xl" />
                            </div>
                            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <SkeletonBlock className="h-2.5 w-32" />
                                <div className="grid grid-cols-2 gap-2 sm:flex">
                                    <SkeletonBlock className="h-11 w-full sm:w-20" />
                                    <SkeletonBlock className="h-11 w-full sm:w-20" />
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ol>
        </>
    );
}

function AnalyticsSkeleton() {
    return (
        <>
            <AdminHeaderSkeleton action="none" filters />

            <div className="mb-4 mt-8">
                <SkeletonBlock className="h-4 w-28" />
                <SkeletonBlock className="mt-2.5 h-2.5 w-64 max-w-[70vw]" />
            </div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {[0, 1, 2, 3].map((metric) => (
                    <div
                        key={metric}
                        className="flex min-h-36 flex-col rounded-lg border border-white/[0.08] bg-[#07080a] p-4 sm:p-5"
                    >
                        <SkeletonBlock className="h-3 w-24 max-w-full" />
                        <SkeletonBlock className="mt-5 h-8 w-20 sm:h-9" />
                        <SkeletonBlock className="mt-auto h-2 w-16" />
                    </div>
                ))}
            </div>

            <div className="mb-4 mt-10 flex items-end justify-between gap-4">
                <div>
                    <SkeletonBlock className="h-4 w-32" />
                    <SkeletonBlock className="mt-2.5 h-2.5 w-72 max-w-[68vw]" />
                </div>
                <SkeletonBlock className="hidden h-2.5 w-28 sm:block" />
            </div>
            <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#07080a]">
                <div className="flex items-center gap-5 border-b border-white/[0.07] px-4 py-3.5 sm:px-5">
                    <SkeletonBlock className="h-2.5 w-24" />
                    <SkeletonBlock className="h-2.5 w-20" />
                </div>
                <div className="grid h-[19rem] grid-cols-[2rem_minmax(0,1fr)] gap-3 px-4 pb-5 pt-7 sm:h-[22rem] sm:px-5">
                    <div className="flex flex-col justify-between pb-6">
                        {[0, 1, 2, 3].map((tick) => (
                            <SkeletonBlock key={tick} className="h-2 w-5" />
                        ))}
                    </div>
                    <div className="flex min-w-0 flex-col justify-between pb-6">
                        {[0, 1, 2, 3].map((line) => (
                            <div key={line} className="h-px w-full bg-white/[0.055]" />
                        ))}
                        <div className="flex items-end justify-between gap-3">
                            {[0, 1, 2, 3, 4, 5].map((tick) => (
                                <SkeletonBlock key={tick} className="h-2 w-8" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-4 mt-10">
                <SkeletonBlock className="h-4 w-40" />
                <SkeletonBlock className="mt-2.5 h-2.5 w-80 max-w-[68vw]" />
            </div>
            <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#07080a]">
                <div className="flex flex-col gap-3 border-b border-white/[0.07] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div>
                        <SkeletonBlock className="h-3 w-48 max-w-full" />
                        <SkeletonBlock className="mt-2 h-2.5 w-64 max-w-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/[0.06] p-1">
                        <SkeletonBlock className="h-10 w-24" />
                        <SkeletonBlock className="h-10 w-24" />
                    </div>
                </div>
                <div className="space-y-7 px-4 py-7 sm:px-5">
                    {ANALYTICS_CHART_BARS.map((width) => (
                        <div key={width} className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[7rem_minmax(0,1fr)]">
                            <SkeletonBlock className="h-2.5 w-full" />
                            <div className="flex items-center gap-2">
                                <SkeletonBlock className={`h-4 ${width}`} />
                                <SkeletonBlock className="h-2.5 w-8 shrink-0" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mb-4 mt-10">
                <SkeletonBlock className="h-4 w-36" />
                <SkeletonBlock className="mt-2.5 h-2.5 w-72 max-w-[68vw]" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map((highlight) => (
                    <div
                        key={highlight}
                        className="min-h-36 rounded-lg border border-white/[0.08] bg-[#07080a] p-4 sm:p-5"
                    >
                        <SkeletonBlock className="h-2 w-24" />
                        <SkeletonBlock className="mt-5 h-6 w-32 max-w-full" />
                        <SkeletonBlock className="mt-3 h-3 w-28" />
                    </div>
                ))}
            </div>

            <div className="mb-4 mt-10 flex items-end justify-between gap-4">
                <div>
                    <SkeletonBlock className="h-4 w-40" />
                    <SkeletonBlock className="mt-2.5 h-2.5 w-80 max-w-[68vw]" />
                </div>
                <SkeletonBlock className="hidden h-2.5 w-16 sm:block" />
            </div>
            <div className="space-y-3 xl:space-y-0 xl:overflow-hidden xl:rounded-lg xl:border xl:border-white/[0.08] xl:bg-[#07080a]">
                {ANALYTICS_SECTION_ROWS.map((row) => (
                    <div
                        key={row}
                        className="rounded-lg border border-white/[0.08] bg-[#07080a] p-4 xl:grid xl:grid-cols-[1.5fr_repeat(6,1fr)] xl:items-center xl:gap-4 xl:rounded-none xl:border-0 xl:border-b xl:border-white/[0.06] xl:px-5 xl:py-4 xl:last:border-b-0"
                    >
                        <SkeletonBlock className="h-4 w-28" />
                        <div className="mt-4 grid grid-cols-2 gap-4 xl:contents">
                            {[0, 1, 2, 3, 4, 5].map((metric) => (
                                <SkeletonBlock
                                    key={metric}
                                    className="h-3 w-12 xl:ml-auto"
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

function MessagesSkeleton() {
    return (
        <>
            <AdminHeaderSkeleton action="count" filters />

            <div className="mt-5 flex items-center justify-between gap-4">
                <SkeletonBlock className="h-11 w-full max-w-xl" />
                <SkeletonBlock className="hidden h-2.5 w-24 sm:block" />
            </div>

            <div className="mt-5 grid min-h-[32rem] min-w-0 overflow-hidden rounded-lg border border-white/[0.085] bg-[#07080a] xl:h-[clamp(32rem,calc(100dvh-18rem),54rem)] xl:grid-cols-[minmax(21rem,0.4fr)_minmax(0,1fr)]">
                <div className="min-w-0 border-white/[0.07] xl:border-r">
                    <div className="flex min-h-16 items-center justify-between border-b border-white/[0.07] bg-[#050607] px-5">
                        <div className="space-y-2">
                            <SkeletonBlock className="h-3.5 w-28" />
                            <SkeletonBlock className="h-2 w-20" />
                        </div>
                        <div className="space-y-1.5">
                            <SkeletonBlock className="ml-auto h-4 w-6" />
                            <SkeletonBlock className="h-2 w-12" />
                        </div>
                    </div>
                    <ul>
                        {MESSAGE_ROWS.map((row) => (
                            <li key={row} className="grid min-h-[6.5rem] grid-cols-[2.25rem_minmax(0,1fr)_auto] gap-3 border-b border-white/[0.065] px-5 py-3.5">
                                <SkeletonBlock className="size-9" />
                                <div className="min-w-0">
                                    <SkeletonBlock className="h-3.5 w-2/5" />
                                    <SkeletonBlock className="mt-3 h-3.5 w-4/5" />
                                    <SkeletonBlock className="mt-2 h-2.5 w-full" />
                                </div>
                                <div className="space-y-5">
                                    <SkeletonBlock className="h-2.5 w-12" />
                                    <SkeletonBlock className="ml-auto size-3.5" />
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="hidden min-w-0 xl:block">
                    <div className="flex min-h-16 items-center justify-between border-b border-white/[0.07] bg-[#050607] px-5">
                        <SkeletonBlock className="h-2.5 w-28" />
                        <div className="flex gap-2">
                            {[0, 1, 2, 3, 4].map((action) => (
                                <SkeletonBlock key={action} className="size-10" />
                            ))}
                        </div>
                    </div>
                    <div className="px-10 py-8">
                        <SkeletonBlock className="h-2.5 w-24" />
                        <SkeletonBlock className="mt-4 h-8 w-3/4" />
                        <div className="mt-7 flex items-center justify-between py-4">
                            <div className="flex items-center gap-3">
                                <SkeletonBlock className="size-10" />
                                <div className="space-y-2">
                                    <SkeletonBlock className="h-3 w-28" />
                                    <SkeletonBlock className="h-2.5 w-40" />
                                </div>
                            </div>
                            <SkeletonBlock className="h-2.5 w-28" />
                        </div>
                        <div className="mt-7 space-y-3">
                            <SkeletonBlock className="h-2.5 w-20" />
                            <SkeletonBlock className="h-3 w-full" />
                            <SkeletonBlock className="h-3 w-11/12" />
                            <SkeletonBlock className="h-3 w-4/5" />
                        </div>
                    </div>
                </div>
            </div>
        </>
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
                <div aria-hidden="true" className="animate-pulse motion-reduce:animate-none">
                    {variant === 'analytics' ? <AnalyticsSkeleton /> : null}
                    {variant === 'dashboard' ? (
                        <AdminHeaderSkeleton action="none" />
                    ) : null}
                    {variant === 'projects' ? (
                        <>
                            <AdminHeaderSkeleton statCount={3} />
                            <ProjectRowsSkeleton />
                        </>
                    ) : null}
                    {variant === 'certificates' ? (
                        <>
                            <AdminHeaderSkeleton statCount={4} />
                            <CertificateRowsSkeleton />
                        </>
                    ) : null}
                    {variant === 'experiences' ? (
                        <>
                            <AdminHeaderSkeleton statCount={4} />
                            <ExperienceRowsSkeleton />
                        </>
                    ) : null}
                    {variant === 'messages' ? <MessagesSkeleton /> : null}
                </div>
            </section>
        </ManagementPage>
    );
}
