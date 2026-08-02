'use client';

import ScrollFloat from '@/components/ui/ScrollFloat/ScrollFloat';

interface WhatIDoProps {
    sentence?: string;
}

const DEFAULT_SENTENCE = 'I build scalable APIs, resilient backend infrastructure, and fluid digital experiences that bridge technical excellence with intuitive design.';

export default function WhatIDo({ sentence = DEFAULT_SENTENCE }: WhatIDoProps) {
    return (
        <section
            id="what-i-do"
            className="section relative isolate flex min-h-[100svh] scroll-mt-[calc(var(--nav-height,80px)+2rem)] items-center justify-center overflow-hidden px-5 py-24 text-center text-[var(--text)] max-sm:min-h-[92svh] md:px-8 lg:py-28"
        >
            <div className="inner relative z-[1] w-[min(100%,1120px)] text-center">
                <p className="eyebrow mb-[clamp(1.25rem,3vw,2rem)] text-center font-mono text-xs font-extrabold uppercase leading-[1.2] tracking-[0.14em] text-[color-mix(in_srgb,var(--signal)_78%,#ffffff_22%)]">
                    {'// what i do'}
                </p>
                <ScrollFloat
                    containerClassName="statement mx-auto w-[min(100%,980px)] text-center font-display text-[clamp(1.9rem,4.8vw,4.15rem)] font-extrabold leading-[1.08] tracking-normal text-[var(--text)] [text-wrap:balance] max-sm:text-[clamp(1.65rem,8vw,2.45rem)]"
                    textClassName="statementText text-center [text-shadow:0_0_22px_rgba(195,109,252,0.22)]"
                    animationDuration={0.56}
                    ease="power3.out"
                    settleEase="power2.out"
                    scrollStart="top 90%"
                    scrollEnd="bottom top"
                    charStagger={0.018}
                    wordStagger={0.045}
                    playOnce
                >
                    {sentence}
                </ScrollFloat>
            </div>
        </section>
    );
}