const CERTIFICATE_CELLS = [0, 1, 2] as const;

function SkeletonBlock({ className }: { className: string }) {
    return <div className={`bg-[var(--hairline)] ${className}`} />;
}

/**
 * Streams in place of the section; mirrors its shape (the header, a window beside its readout,
 * then the certificate register) so nothing jumps when the real section arrives.
 */
export default function ProjectsSkeleton() {
    return (
        <section
            id="projects"
            aria-busy="true"
            aria-label="Loading projects and certificates"
            className="relative w-full scroll-mt-[calc(var(--nav-height,80px)+2rem)]"
        >
            <span role="status" className="sr-only">
                Loading projects and certificates...
            </span>
            <div aria-hidden="true" className="animate-pulse motion-reduce:animate-none">
                <div className="mx-auto w-full max-w-7xl px-5 pb-6 pt-24 md:px-8 md:pt-32">
                    <div className="flex w-full items-center gap-4">
                        <SkeletonBlock className="h-3 w-20 shrink-0" />
                        <SkeletonBlock className="h-px min-w-8 flex-1" />
                        <SkeletonBlock className="hidden h-2.5 w-16 shrink-0 sm:block" />
                    </div>
                    <div className="mt-10 flex items-end justify-between gap-8">
                        <SkeletonBlock className="h-[clamp(2.2rem,4vw,3.6rem)] w-[clamp(11rem,26vw,20rem)]" />
                        <div className="hidden w-[18rem] space-y-2.5 lg:block">
                            <SkeletonBlock className="ml-auto h-3.5 w-full" />
                            <SkeletonBlock className="ml-auto h-3.5 w-2/3" />
                        </div>
                    </div>

                    {/* The first project: its window on the left, its readout on the right. */}
                    <div className="mt-[clamp(3rem,8vh,5.5rem)] grid gap-7 lg:grid-cols-12 lg:items-center lg:gap-x-8">
                        <div className="overflow-hidden rounded-lg border border-[var(--hairline)] bg-[var(--surface)] sm:rounded-[10px] lg:col-span-7">
                            <div className="h-7 border-b border-[var(--hairline)] bg-[var(--surface-muted)] sm:h-[38px]" />
                            <div className="aspect-video bg-[var(--surface-muted)]" />
                        </div>
                        <div className="grid gap-[1.1rem] pt-3 lg:col-span-5 lg:pt-0">
                            <SkeletonBlock className="h-2.5 w-28" />
                            <SkeletonBlock className="h-[clamp(2rem,3.3vw,3.1rem)] w-4/5" />
                            <div className="space-y-2.5">
                                <SkeletonBlock className="h-3.5 w-full" />
                                <SkeletonBlock className="h-3.5 w-5/6" />
                                <SkeletonBlock className="h-3.5 w-2/3" />
                            </div>
                            <div className="h-9 border-t border-[var(--hairline)]" />
                            <SkeletonBlock className="h-12 w-40" />
                        </div>
                    </div>
                </div>

                <div className="mx-auto w-full max-w-7xl px-5 pb-[clamp(3.5rem,7vw,6.5rem)] pt-[clamp(3.5rem,7vw,6rem)] md:px-8">
                    <div className="h-px bg-[var(--hairline)]" />
                    <div className="flex flex-col gap-[1.125rem] pt-[clamp(3rem,6vw,5rem)] lg:flex-row lg:items-end lg:justify-between lg:gap-12">
                        <div>
                            <SkeletonBlock className="mb-3.5 h-2.5 w-24" />
                            <SkeletonBlock className="h-[clamp(1.75rem,3vw,2.6rem)] w-[min(100%,26rem)]" />
                        </div>
                        <div className="w-full max-w-[18rem] space-y-2.5">
                            <SkeletonBlock className="h-3.5 w-full" />
                            <SkeletonBlock className="h-3.5 w-2/3 lg:ml-auto" />
                        </div>
                    </div>
                    <div className="mt-[clamp(2.25rem,4.5vw,3.5rem)] grid grid-cols-1 border-b border-[var(--hairline)] sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 lg:gap-x-0">
                        {CERTIFICATE_CELLS.map((cell) => (
                            <div
                                key={cell}
                                className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-[1.125rem] border-t border-[var(--hairline)] px-3 py-[1.125rem] lg:grid-cols-1 lg:gap-5 lg:border-l lg:px-6 lg:py-7 lg:[&:nth-child(3n+1)]:border-l-0"
                            >
                                <div className="aspect-[1.414/1] bg-[var(--surface-muted)] shadow-[0_0_0_1px_var(--hairline)]" />
                                <div className="space-y-2.5">
                                    <SkeletonBlock className="h-2.5 w-2/5" />
                                    <SkeletonBlock className="h-4 w-4/5" />
                                    <SkeletonBlock className="h-2.5 w-20" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
