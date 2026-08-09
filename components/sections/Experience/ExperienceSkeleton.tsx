const TIMELINE_ROWS = [0, 1, 2] as const;

function SkeletonBlock({ className }: { className: string }) {
    return <div className={`rounded-[6px] bg-white/[0.06] ${className}`} />;
}

export default function ExperienceSkeleton() {
    return (
        <section
            id="experience"
            aria-busy="true"
            aria-label="Loading experience timeline"
            className="relative w-full scroll-mt-[calc(var(--nav-height,80px)+2rem)] px-5 py-24 md:px-8 md:py-32"
        >
            <span role="status" className="sr-only">
                Loading experience timeline...
            </span>
            <div
                aria-hidden="true"
                className="animate-pulse motion-reduce:animate-none"
            >
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[var(--signal)]/20 to-transparent md:inset-x-8" />

                <div className="mx-auto max-w-7xl">
                    <div className="flex w-full items-center gap-4">
                        <SkeletonBlock className="h-px w-8 shrink-0 sm:w-12" />
                        <SkeletonBlock className="h-3 w-24 shrink-0" />
                        <SkeletonBlock className="h-px min-w-8 flex-1" />
                        <SkeletonBlock className="hidden h-2.5 w-24 shrink-0 sm:block" />
                    </div>

                    <div className="mt-12 grid grid-cols-1 gap-12 lg:mt-16 lg:grid-cols-[minmax(260px,0.62fr)_minmax(0,1.38fr)] lg:items-start lg:gap-16 xl:gap-20">
                        <header>
                            <div className="space-y-3">
                                <SkeletonBlock className="h-10 w-full max-w-sm sm:h-12" />
                                <SkeletonBlock className="h-10 w-4/5 max-w-xs sm:h-12" />
                                <SkeletonBlock className="h-10 w-3/5 max-w-64 sm:h-12" />
                            </div>
                            <div className="mt-7 space-y-2.5">
                                <SkeletonBlock className="h-3.5 w-full max-w-md" />
                                <SkeletonBlock className="h-3.5 w-4/5 max-w-sm" />
                            </div>
                            <div className="mt-8 grid grid-cols-2 border-y border-white/[0.08] py-5">
                                <div>
                                    <SkeletonBlock className="h-5 w-10" />
                                    <SkeletonBlock className="mt-2 h-2.5 w-20" />
                                </div>
                                <div className="border-l border-white/[0.08] pl-5">
                                    <SkeletonBlock className="h-5 w-14" />
                                    <SkeletonBlock className="mt-2 h-2.5 w-24" />
                                </div>
                            </div>
                        </header>

                        <ol className="relative flex flex-col gap-6 sm:gap-7">
                            <div className="absolute bottom-7 left-[0.6875rem] top-7 w-px bg-white/[0.08]" />
                            {TIMELINE_ROWS.map((row) => (
                                <li
                                    key={row}
                                    className="relative grid grid-cols-[1.375rem_minmax(0,1fr)] items-start gap-x-4 sm:gap-x-5"
                                >
                                    <div className="relative z-[1] mt-7 size-[1.375rem] rounded-full border border-white/[0.11] bg-black">
                                        <div className="m-auto mt-[0.4375rem] size-1.5 rounded-full bg-white/[0.09]" />
                                    </div>
                                    <div className="min-h-[178px] rounded-lg border border-white/[0.07] bg-white/[0.03] p-5 sm:min-h-[184px] sm:p-6">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <SkeletonBlock className="h-2.5 w-7" />
                                                <SkeletonBlock className="h-px w-4" />
                                                <SkeletonBlock className="h-2.5 w-28" />
                                            </div>
                                            <SkeletonBlock className="h-2.5 w-24" />
                                        </div>
                                        <SkeletonBlock className="mt-4 h-7 w-3/5 max-w-sm" />
                                        <div className="mt-3 space-y-2">
                                            <SkeletonBlock className="h-3 w-full max-w-xl" />
                                            <SkeletonBlock className="h-3 w-4/5 max-w-lg" />
                                        </div>
                                        <div className="mt-4 border-t border-white/[0.06] pt-3">
                                            <SkeletonBlock className="h-2.5 w-28" />
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </div>
        </section>
    );
}
