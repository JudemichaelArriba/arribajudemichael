const TIMELINE_ROWS = [0, 1, 2] as const;

function SkeletonBlock({ className }: { className: string }) {
    return <div className={`bg-[var(--hairline)] ${className}`} />;
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
            <div aria-hidden="true" className="animate-pulse motion-reduce:animate-none">
                <div className="mx-auto max-w-7xl">
                    <div className="flex w-full items-center gap-4">
                        <SkeletonBlock className="h-3 w-24 shrink-0" />
                        <SkeletonBlock className="h-px min-w-8 flex-1" />
                        <SkeletonBlock className="hidden h-2.5 w-24 shrink-0 sm:block" />
                    </div>

                    <div className="mt-12 flex flex-col gap-8 lg:mt-16 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
                        <div className="w-full space-y-3">
                            <SkeletonBlock className="h-10 w-full max-w-lg sm:h-12" />
                            <SkeletonBlock className="h-10 w-3/5 max-w-sm sm:h-12" />
                        </div>
                        <div className="flex shrink-0 gap-10 sm:gap-14">
                            <div>
                                <SkeletonBlock className="h-8 w-12" />
                                <SkeletonBlock className="mt-2 h-2.5 w-20" />
                            </div>
                            <div>
                                <SkeletonBlock className="h-8 w-16" />
                                <SkeletonBlock className="mt-2 h-2.5 w-24" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 space-y-2.5">
                        <SkeletonBlock className="h-3.5 w-full max-w-md" />
                        <SkeletonBlock className="h-3.5 w-4/5 max-w-sm" />
                    </div>

                    <ol className="mt-12 border-b border-[var(--hairline)] lg:mt-14">
                        {TIMELINE_ROWS.map((row) => (
                            <li
                                key={row}
                                className="grid grid-cols-1 gap-x-10 gap-y-3 border-t border-[var(--hairline)] px-4 py-8 sm:grid-cols-[10rem_minmax(0,1fr)]"
                            >
                                <SkeletonBlock className="h-3 w-28 sm:mt-2" />
                                <div className="min-w-0">
                                    <SkeletonBlock className="h-7 w-3/5 max-w-sm" />
                                    <div className="mt-3 space-y-2">
                                        <SkeletonBlock className="h-3 w-full max-w-xl" />
                                        <SkeletonBlock className="h-3 w-4/5 max-w-lg" />
                                    </div>
                                    <SkeletonBlock className="mt-4 h-2.5 w-28" />
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </section>
    );
}
