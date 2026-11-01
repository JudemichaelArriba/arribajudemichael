const CERTIFICATE_ROWS = [0, 1, 2] as const;

function SkeletonBlock({ className }: { className: string }) {
    return <div className={`bg-[var(--hairline)] ${className}`} />;
}

/**
 * Streams in place of the section; mirrors its shape (the reel's stage with its frame, readout and
 * ruler, then the certificates) so nothing jumps when the real section arrives.
 */
export default function ProjectsSkeleton() {
    return (
        <section
            id="projects"
            aria-busy="true"
            aria-label="Loading projects and certificates"
            className="relative w-full scroll-mt-[calc(-1*(var(--nav-height,80px)+env(safe-area-inset-top)+2rem))]"
        >
            <span role="status" className="sr-only">
                Loading projects and certificates...
            </span>
            <div aria-hidden="true" className="animate-pulse motion-reduce:animate-none">
                <div className="flex flex-col overflow-hidden pb-16 pt-24 reel-pin:h-svh reel-pin:pb-[clamp(1rem,2.6svh,1.75rem)] reel-pin:pt-[calc(var(--nav-height,80px)+clamp(0.5rem,2svh,1.25rem))] max-lg:reel-pin:justify-center">
                    <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
                        <div className="flex w-full items-center gap-4">
                            <SkeletonBlock className="h-3 w-20 shrink-0" />
                            <SkeletonBlock className="h-px min-w-8 flex-1" />
                            <SkeletonBlock className="hidden h-2.5 w-16 shrink-0 sm:block" />
                        </div>
                        <div className="mt-10 flex items-end justify-between gap-8 reel-pin:mt-[3svh]">
                            <SkeletonBlock className="h-[clamp(2.2rem,4vw,3.6rem)] w-[clamp(11rem,26vw,20rem)]" />
                            <div className="hidden w-[18rem] space-y-2.5 lg:block">
                                <SkeletonBlock className="ml-auto h-3.5 w-full" />
                                <SkeletonBlock className="ml-auto h-3.5 w-2/3" />
                            </div>
                        </div>
                    </div>

                    <div className="relative mt-[2.4svh] flex justify-center overflow-hidden [container-type:inline-size] reel-pin:min-h-0 reel-pin:[container-type:size] lg:reel-pin:flex-1 max-lg:reel-pin:shrink max-lg:reel-pin:grow-0 max-lg:reel-pin:basis-[calc(88vw/1.6+2.5rem)]">
                        <div className="grid w-[var(--fw)] content-center gap-3 [--fw:min(88cqw,1040px)] lg:[--fw:min(62cqw,1040px)] reel-pin:[--fw:min(88cqw,(100cqh_-_2.25rem)*1.6)] lg:reel-pin:[--fw:min(62cqw,(100cqh_-_2.25rem)*1.6,1040px)]">
                            <SkeletonBlock className="h-2.5 w-28" />
                            <div className="aspect-[16/10] w-full border border-[var(--hairline)] bg-[var(--surface-muted)]" />
                        </div>
                    </div>

                    <div className="mx-auto mt-[2.4svh] grid w-full max-w-7xl gap-3.5 px-5 md:px-8">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-10">
                            <SkeletonBlock className="h-7 w-3/5 lg:flex-1" />
                            <SkeletonBlock className="h-9 w-48" />
                            <SkeletonBlock className="h-12 w-40" />
                        </div>
                        <div className="h-10 border-t border-[var(--hairline)]" />
                    </div>
                </div>

                <div className="mx-auto max-w-7xl px-5 pb-24 pt-14 md:px-8 md:pb-32">
                    <div className="flex w-full items-center gap-4">
                        <SkeletonBlock className="h-2.5 w-24 shrink-0" />
                        <SkeletonBlock className="h-px min-w-8 flex-1" />
                    </div>
                    <div className="mt-11 border-b border-[var(--hairline)] lg:mt-14">
                        {CERTIFICATE_ROWS.map((row) => (
                            <div key={row} className="border-t border-[var(--hairline)] py-6">
                                <SkeletonBlock className="h-5 w-3/5" />
                                <SkeletonBlock className="mt-3 h-2.5 w-2/5" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
