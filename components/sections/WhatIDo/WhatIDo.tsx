'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ScrollHighlight from '@/components/ui/ScrollHighlight/ScrollHighlight';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface WhatIDoProps {
    sentence?: string;
}

interface Capability {
    code: string;
    label: string;
    detail: string;
}

const DEFAULT_SENTENCE = 'I build scalable APIs, resilient backend infrastructure, and fluid digital experiences that bridge technical excellence with intuitive design.';

const CAPABILITIES: Capability[] = [
    {
        code: '01',
        label: 'System architecture',
        detail: 'Scalable APIs and dependable data flows',
    },
    {
        code: '02',
        label: 'Backend engineering',
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

    useGSAP(
        () => {
            const section = sectionRef.current;
            const header = headerRef.current;
            const statement = section?.querySelector<HTMLElement>('.statement');
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            if (!section || !header || !statement || prefersReducedMotion) return;

            const headerLines = gsap.utils.toArray<HTMLElement>('[data-what-line]', header);
            const statementWords = gsap.utils.toArray<HTMLElement>('.scroll-highlight-word', statement);
            const capabilityItems = gsap.utils.toArray<HTMLElement>(
                '[data-what-capability]',
                capabilityListRef.current ?? undefined
            );
            let isSectionArmed = true;

            const setInitialState = () => {
                gsap.set(header, { autoAlpha: 0, y: 10 });
                headerLines.forEach((line, index) => {
                    gsap.set(line, {
                        scaleX: 0,
                        transformOrigin: index === 0 ? 'right center' : 'left center',
                    });
                });
                gsap.set(capabilityItems, { autoAlpha: 0, y: 14 });
            };

            const setStatementInitialState = () => {
                gsap.set(statementWords, {
                    autoAlpha: 0,
                    y: 20,
                    willChange: 'transform, opacity',
                });
            };

            setInitialState();
            setStatementInitialState();

            const timeline = gsap.timeline({
                paused: true,
                defaults: { overwrite: 'auto', force3D: true },
            });

            timeline
                .to(header, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.56,
                    ease: 'power3.out',
                }, 0)
                .to(headerLines, {
                    scaleX: 1,
                    duration: 0.7,
                    ease: 'power3.out',
                    stagger: 0.04,
                }, 0.08)
                .to(capabilityItems, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.52,
                    ease: 'power3.out',
                    stagger: 0.07,
                }, 0.3);

            const statementTimeline = gsap.timeline({
                paused: true,
                defaults: { overwrite: 'auto', force3D: true },
            });

            statementTimeline.to(statementWords, {
                autoAlpha: 1,
                y: 0,
                duration: 0.64,
                ease: 'power3.out',
                stagger: {
                    each: 0.024,
                    from: 'start',
                },
                clearProps: 'transform,opacity,visibility,willChange',
            });

            const resetReveal = () => {
                timeline.pause(0, true);
                isSectionArmed = true;
                setInitialState();
            };

            const resetStatementReveal = () => {
                statementTimeline.pause(0, true);
                setStatementInitialState();
            };

            const playStatementReveal = () => {
                resetStatementReveal();
                statementTimeline.restart(true);
            };

            const trigger = ScrollTrigger.create({
                trigger: section,
                start: 'top 88%',
                end: 'bottom top',
                onEnter: () => {
                    if (!isSectionArmed) return;
                    isSectionArmed = false;
                    setInitialState();
                    timeline.restart(true);
                },
            });

            const statementTrigger = ScrollTrigger.create({
                trigger: statement,
                start: 'top 96%',
                end: 'bottom top',
                invalidateOnRefresh: true,
                onEnter: playStatementReveal,
                onLeaveBack: resetStatementReveal,
            });

            const resetObserver = new IntersectionObserver(
                ([entry]) => {
                    if (!entry.isIntersecting && entry.boundingClientRect.top >= window.innerHeight - 16) {
                        resetReveal();
                    }
                },
                { rootMargin: '0px 0px -16px 0px', threshold: 0 }
            );
            resetObserver.observe(section);

            return () => {
                resetObserver.disconnect();
                trigger.kill(false);
                statementTrigger.kill(false);
                timeline.kill();
                statementTimeline.kill();
            };
        },
        { scope: sectionRef }
    );

    return (
        <section
            id="what-i-do"
            ref={sectionRef}
            className="section relative isolate flex min-h-[100svh] scroll-mt-[calc(var(--nav-height,80px)+2rem)] items-center justify-center overflow-hidden px-5 py-28 text-center text-[var(--text)] md:px-10 lg:py-32"
        >
            <div className="inner relative z-[1] mx-auto w-full max-w-7xl text-left">
                <div ref={headerRef} className="flex w-full items-center gap-4">
                    <span
                        data-what-line
                        aria-hidden="true"
                        className="h-px w-8 shrink-0 bg-gradient-to-r from-transparent to-[var(--signal)]/55 sm:w-12"
                    />
                    <p className="eyebrow shrink-0 font-mono text-xs font-extrabold uppercase leading-none tracking-[0.14em] text-[color-mix(in_srgb,var(--signal)_82%,#ffffff_18%)]">
                        What I do
                    </p>
                    <span
                        data-what-line
                        aria-hidden="true"
                        className="h-px min-w-8 flex-1 bg-gradient-to-r from-[var(--signal)]/45 via-white/10 to-transparent"
                    />
                    <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]/48 sm:inline">
                        02 / Disciplines
                    </span>
                </div>

                <ScrollHighlight
                    as="h2"
                    containerClassName="statement mt-12 w-full max-w-6xl text-left font-display text-[2.15rem] font-extrabold tracking-normal text-[var(--text)] [text-wrap:balance] sm:mt-16 sm:text-5xl lg:text-[3.75rem]"
                    textClassName="statementText text-left leading-[1.06]"
                    scrollStart="top 105%"
                    scrollEnd="bottom 70%"
                    scrub={0.1}
                    duration={0.18}
                    charStagger={0.025}
                    fromColor="#454a52"
                    toColor="var(--text)"
                >
                    {sentence}
                </ScrollHighlight>

                <ul
                    ref={capabilityListRef}
                    aria-label="Core capabilities"
                    className="mt-14 grid gap-5 border-y border-white/[0.08] py-6 sm:mt-16 sm:grid-cols-3 sm:gap-0 sm:py-7"
                >
                    {CAPABILITIES.map((capability, index) => (
                        <li
                            key={capability.code}
                            data-what-capability
                            className={`grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3 sm:block sm:border-l sm:border-white/[0.08] sm:px-6 sm:first:border-l-0 sm:first:pl-0 sm:last:pr-0 ${index > 0 ? 'max-sm:border-t max-sm:border-white/[0.07] max-sm:pt-5' : ''}`}
                        >
                            <span className="pt-0.5 font-mono text-[10px] font-bold tabular-nums tracking-[0.12em] text-[var(--signal)]/70">
                                {capability.code}
                            </span>
                            <div>
                                <h3 className="font-display text-base font-bold leading-snug text-[var(--text)] sm:text-lg">
                                    {capability.label}
                                </h3>
                                <p className="mt-1.5 max-w-[28ch] text-sm leading-relaxed text-[var(--muted)]/64">
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
