const LIST_ROWS = [0, 1, 2] as const;

function SkeletonBlock({ className }: { className: string }) {
    return <div className={`bg-[var(--hairline)] ${className}`} />;
}

/** Streams in place of the section; mirrors its shape (tab words, index and preview) so nothing jumps. */
export default function ProjectsSkeleton() {
    return (
        <section
            id="projects"
            aria-busy="true"
            aria-label="Loading projects and certificates"
            className="relative w-full scroll-mt-[calc(var(--nav-height,80px)+2rem)] px-5 py-24 md:px-8 md:py-32 short:py-24"
        >
            <span role="status" className="sr-only">
                Loading projects and certificates...
            </span>
            <div aria-hidden="true" className="animate-pulse motion-reduce:animate-none">
                <div className="mx-auto max-w-7xl">
                    <div className="flex w-full items-center gap-4">
                        <SkeletonBlock className="h-3 w-20 shrink-0" />
                        <SkeletonBlock className="h-px min-w-8 flex-1" />
                        <SkeletonBlock className="hidden h-2.5 w-16 shrink-0 sm:block" />
                    </div>

                    <div className="mt-11 grid gap-6 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] lg:items-end lg:gap-12 short:mt-8">
                        <div className="flex flex-wrap gap-x-[clamp(0.9rem,3vw,2.75rem)] gap-y-2">
                            <SkeletonBlock className="h-[clamp(1.75rem,6vw,5rem)] w-[38%] min-w-28" />
                            <SkeletonBlock className="h-[clamp(1.75rem,6vw,5rem)] w-[52%] min-w-40 opacity-60" />
                        </div>
                        <div className="space-y-2.5">
                            <SkeletonBlock className="h-3.5 w-full max-w-sm" />
                            <SkeletonBlock className="h-3.5 w-2/3 max-w-60" />
                        </div>
                    </div>

                    <div className="mt-11 lg:mt-14 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-14 xl:gap-16 short:mt-9">
                        <div className="hidden border-b border-[var(--hairline)] lg:block">
                            {LIST_ROWS.map((row) => (
                                <div key={row} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-2.5 border-t border-[var(--hairline)] py-[1.375rem] short:py-4">
                                    <SkeletonBlock className="mt-1.5 h-2.5 w-5" />
                                    <div>
                                        <SkeletonBlock className="h-6 w-4/5" />
                                        <SkeletonBlock className="mt-3 h-2.5 w-3/5" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div>
                            <div className="aspect-[16/10] w-full border border-[var(--hairline)] bg-[var(--surface-muted)] short:max-h-[calc(100svh-var(--nav-height,80px)-16rem)]" />
                            <div className="mt-6 space-y-2.5 lg:hidden">
                                <SkeletonBlock className="h-7 w-3/4" />
                                <SkeletonBlock className="h-2.5 w-1/2" />
                            </div>
                            <div className="mt-6 hidden space-y-2.5 lg:block short:mt-4">
                                <SkeletonBlock className="h-3.5 w-full max-w-lg" />
                                <SkeletonBlock className="h-3.5 w-4/5 max-w-md" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
