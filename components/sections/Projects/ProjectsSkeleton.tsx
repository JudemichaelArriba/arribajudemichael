const SHOWCASE_CARDS = [0, 1, 2] as const;

function SkeletonBlock({ className }: { className: string }) {
    return <div className={`bg-[var(--hairline)] ${className}`} />;
}

export default function ProjectsSkeleton() {
    return (
        <section
            id="projects"
            aria-busy="true"
            aria-label="Loading projects and certificates"
            className="relative w-full scroll-mt-[calc(var(--nav-height,80px)+2rem)] px-5 py-24 md:px-8 md:py-32"
        >
            <span role="status" className="sr-only">
                Loading projects and certificates...
            </span>
            <div
                aria-hidden="true"
                className="animate-pulse motion-reduce:animate-none"
            >
                <div className="mx-auto max-w-7xl">
                    <div className="flex w-full items-center gap-4">
                        <SkeletonBlock className="h-3 w-44 shrink-0" />
                        <SkeletonBlock className="h-px min-w-8 flex-1" />
                        <SkeletonBlock className="hidden h-2.5 w-20 shrink-0 sm:block" />
                    </div>

                    <div className="mt-12 grid items-end gap-8 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12">
                        <div className="max-w-3xl">
                            <SkeletonBlock className="h-10 w-full max-w-2xl sm:h-12" />
                            <SkeletonBlock className="mt-3 h-10 w-3/4 max-w-lg sm:h-12" />
                            <div className="mt-6 space-y-2.5">
                                <SkeletonBlock className="h-3.5 w-full max-w-xl" />
                                <SkeletonBlock className="h-3.5 w-4/5 max-w-lg" />
                            </div>
                        </div>
                        <div className="grid h-[3.25rem] w-full grid-cols-2 gap-1 border border-[var(--hairline)] p-1 sm:w-[22rem]">
                            <SkeletonBlock className="h-full w-full" />
                            <SkeletonBlock className="h-full w-full opacity-60" />
                        </div>
                    </div>

                    <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-6">
                        {SHOWCASE_CARDS.map((card) => (
                            <li
                                key={card}
                                className="flex min-w-0 flex-col overflow-hidden border border-[var(--hairline)] bg-[var(--surface)]"
                            >
                                <div className="aspect-[2.1/1] w-full border-b border-[var(--hairline)] bg-[var(--surface-muted)]" />
                                <div className="flex min-h-52 flex-1 flex-col p-4 sm:p-5">
                                    <div className="flex items-center gap-3">
                                        <SkeletonBlock className="h-2.5 w-7" />
                                        <SkeletonBlock className="h-px w-4" />
                                        <SkeletonBlock className="h-2.5 w-24" />
                                    </div>
                                    <SkeletonBlock className="mt-4 h-6 w-3/4" />
                                    <div className="mt-3 space-y-2">
                                        <SkeletonBlock className="h-3 w-full" />
                                        <SkeletonBlock className="h-3 w-4/5" />
                                    </div>
                                    <div className="mt-auto flex items-end justify-between gap-4 pt-5">
                                        <div className="flex gap-2">
                                            <SkeletonBlock className="h-2.5 w-12" />
                                            <SkeletonBlock className="h-2.5 w-16" />
                                        </div>
                                        <SkeletonBlock className="h-8 w-24" />
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}
