'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { primeStagger } from '@/lib/animations/primeStagger';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface WhatIDoProps {
    sentence?: string;
}

interface Capability {
    code: string;
    label: string;
    detail: string;
}

// The Ask assistant restates this copy in features/chat/profile.ts; keep the two in sync.
const DEFAULT_SENTENCE ='I build scalable APIs, resilient backend infrastructure, and fluid digital experiences that bridge technical excellence with intuitive design.';

const CAPABILITIES: Capability[] = [
    {
        code: '01',
        label: 'System architecture',
        detail: 'Scalable APIs and dependable data flows',
    },
    {
        code: '02',
        label: 'Backend development',
        detail: 'Resilient services and practical integrations',
    },
    {
        code: '03',
        label: 'Product delivery',
        detail: 'Responsive web and mobile experiences',
    },
];

export default function WhatIDo({ sentence = DEFAULT_SENTENCE }: WhatIDoProps) {
    const sectionRef = useRef<HTMLElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const capabilityListRef = useRef<HTMLUListElement>(null);

    // Scrubbed with the scroll: the statement inks in word by word as it is read. Pinned on
    // desktop, played in place on phones. Opacity (not colour) keeps the theme switch safe.
    useGSAP(
        () => {
            const section = sectionRef.current;
            const header = headerRef.current;
            const statement = section?.querySelector<HTMLElement>('.statement');
            if (!section || !header || !statement) return;

            const mm = gsap.matchMedia();
            mm.add(
                { desktop: '(min-width: 1024px) and (min-height: 560px)', motion: '(prefers-reduced-motion: no-preference)' },
                (context) => {
                    const { desktop, motion } = context.conditions as { desktop: boolean; motion: boolean };
                    if (!motion) return;

                    const words = gsap.utils.toArray<HTMLElement>('.statement-word', statement);
                    const capabilities = gsap.utils.toArray<HTMLElement>('[data-what-capability]', capabilityListRef.current ?? undefined);
                    gsap.timeline({
                        defaults: { ease: 'none' },
                        scrollTrigger: {
                            trigger: section,
                            start: desktop ? 'top top' : 'top 70%',
                            end: desktop ? () => `+=${Math.max(window.innerHeight, 800)}` : 'bottom 80%',
                            pin: desktop,
                            scrub: 0.6,
                            invalidateOnRefresh: true,
                        },
                    })
                        .fromTo(gsap.utils.toArray<HTMLElement>('[data-what-line]', header), { scaleX: 0 }, { scaleX: 1, transformOrigin: 'left center', duration: 0.15 }, 0)
                        .fromTo(words, primeStagger(words, { autoAlpha: 0.12 }), { autoAlpha: 1, duration: 0.06, stagger: 0.55 / Math.max(1, words.length) }, 0.05)
                        .fromTo(capabilities, primeStagger(capabilities, { autoAlpha: 0, y: 26 }), { autoAlpha: 1, y: 0, ease: 'power3.out', duration: 0.18, stagger: 0.06 }, 0.66);
                },
                section,
            );
            return () => mm.revert();
        },
        { scope: sectionRef }
    );

    return (
        <section
            id="what-i-do"
            data-analytics-section="what-i-do"
            ref={sectionRef}
            className="section relative isolate flex min-h-[100svh] scroll-mt-[calc(var(--nav-height,80px)+2rem)] items-center justify-center overflow-hidden px-5 py-28 text-center text-[var(--text)] md:px-10 lg:py-32"
        >
            <div className="inner relative z-[1] mx-auto w-full max-w-7xl text-left">
                <div ref={headerRef} className="flex w-full items-center gap-4">
                    <p className="eyebrow shrink-0 font-display text-xs font-bold uppercase leading-none tracking-[0.14em] text-[var(--text)]">
                        What I do
                    </p>
                    <span
                        data-what-line
                        aria-hidden="true"
                        className="h-px min-w-8 flex-1 bg-[var(--hairline)]"
                    />
                    <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)] sm:inline">
                        02 / Disciplines
                    </span>
                </div>

                {/* Plain words in the flow, revealed with a stagger. The previous
                    per-character colour scrub kept breaking across theme switches
                    and left the sentence half-lit, so nothing here animates colour. */}
                <h2 className="statement mt-12 w-full max-w-6xl text-left font-display text-[2.15rem] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--text)] [text-wrap:pretty] sm:mt-16 sm:text-5xl lg:text-[3.6rem]">
                    {sentence.split(' ').map((word, index) => (
                        <span
                            key={`${word}-${index}`}
                            className="statement-word inline-block whitespace-pre"
                        >
                            {word}
                            {index < sentence.split(' ').length - 1 ? ' ' : ''}
                        </span>
                    ))}
                </h2>

                <ul
                    ref={capabilityListRef}
                    aria-label="Core capabilities"
                    className="mt-14 grid gap-5 border-y border-[var(--hairline)] py-6 sm:mt-16 sm:grid-cols-3 sm:gap-0 sm:py-7"
                >
                    {CAPABILITIES.map((capability, index) => (
                        <li
                            key={capability.code}
                            data-what-capability
                            className={`group grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3 transition-colors duration-300 ease-out motion-reduce:transition-none sm:block sm:border-l sm:border-[var(--hairline-soft)] sm:px-6 sm:first:border-l-0 sm:first:pl-0 sm:last:pr-0 ${index > 0 ? 'max-sm:border-t max-sm:border-[var(--hairline-soft)] max-sm:pt-5' : ''}`}
                        >
                            <span className="pt-0.5 font-mono text-[10px] font-bold tabular-nums tracking-[0.12em] text-[var(--faint)] transition-colors duration-300 group-hover:text-[var(--text)] motion-reduce:transition-none">
                                {capability.code}
                            </span>
                            <div>
                                <h3 className="font-display text-base font-bold leading-snug text-[var(--text)] sm:text-lg">
                                    {capability.label}
                                </h3>
                                <p className="mt-1.5 max-w-[28ch] text-sm leading-relaxed text-[var(--muted)]">
                                    {capability.detail}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
