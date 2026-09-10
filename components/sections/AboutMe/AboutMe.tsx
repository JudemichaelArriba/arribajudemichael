'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight } from 'lucide-react';
import { rearmOnExitBelow } from '@/lib/animations/rearmOnExitBelow';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface AboutDetail {
    code: string;
    label: string;
    value: string;
}

const ABOUT_DETAILS: AboutDetail[] = [
    { code: 'A.01', label: 'Location', value: 'Tagum City, Philippines' },
    { code: 'A.02', label: 'Status', value: 'Open to opportunities' },
    { code: 'A.03', label: 'Focus', value: 'Secure RESTful APIs paired with refined, responsive client experiences.' },
    { code: 'A.04', label: 'Quality', value: 'Clean architecture, measured performance, and long-term maintainability.' },
];

const PROOF_POINTS = [
    { code: '01', label: 'Full-stack systems' },
    { code: '02', label: 'Backend + IoT' },
    { code: '03', label: 'Maintainable code' },
] as const;

export default function AboutMe() {
    const sectionRef = useRef<HTMLElement>(null);
    const sectionHeaderRef = useRef<HTMLDivElement>(null);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const introRef = useRef<HTMLParagraphElement>(null);
    const proofListRef = useRef<HTMLUListElement>(null);
    const detailListRef = useRef<HTMLDListElement>(null);

    useGSAP(
        () => {
            const section = sectionRef.current;
            if (!section) return;

            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const copyCandidates: Array<HTMLElement | null> = [
                sectionHeaderRef.current,
                headingRef.current,
                introRef.current,
            ];
            const copyTargets = copyCandidates.filter(
                (target): target is HTMLElement => target !== null
            );
            const headerLines = gsap.utils.toArray<HTMLElement>('[data-about-line]', sectionHeaderRef.current ?? undefined);
            const proofTargets = gsap.utils.toArray<HTMLElement>('[data-about-proof]', proofListRef.current ?? undefined);
            const rowTargets = gsap.utils.toArray<HTMLElement>('[data-about-row]', detailListRef.current ?? undefined);

            if (prefersReducedMotion) {
                gsap.set([...copyTargets, ...proofTargets, ...rowTargets], {
                    autoAlpha: 1,
                    y: 0,
                    clearProps: 'transform,opacity,visibility,willChange',
                });
                gsap.set(headerLines, { scaleX: 1, clearProps: 'transform' });
                return;
            }

            const setInitialState = () => {
                gsap.set(copyTargets, { autoAlpha: 0, y: 14 });
                gsap.set(headerLines, { scaleX: 0, transformOrigin: 'left center' });
                gsap.set(proofTargets, { autoAlpha: 0, y: 12 });
                gsap.set(rowTargets, { autoAlpha: 0, y: 18 });
            };

            setInitialState();

            const timeline = gsap.timeline({
                paused: true,
                defaults: { overwrite: 'auto', force3D: true },
            });

            timeline
                .to(copyTargets, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.6,
                    ease: 'power3.out',
                    stagger: 0.08,
                }, 0)
                .to(headerLines, {
                    scaleX: 1,
                    duration: 0.75,
                    ease: 'power3.out',
                }, 0.08)
                .to(proofTargets, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.5,
                    ease: 'power3.out',
                    stagger: 0.07,
                }, 0.3)
                .to(rowTargets, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.58,
                    ease: 'power3.out',
                    stagger: 0.08,
                }, 0.24);

            const resetReveal = () => {
                timeline.pause(0, true);
                setInitialState();
            };

            const trigger = ScrollTrigger.create({
                trigger: section,
                start: 'top 86%',
                end: 'bottom top',
                invalidateOnRefresh: true,
                onEnter: () => {
                    setInitialState();
                    timeline.restart(true);
                },
                onLeaveBack: resetReveal,
            });

            const disconnectRearm = rearmOnExitBelow(section, resetReveal);

            return () => {
                disconnectRearm();
                trigger.kill(false);
                timeline.kill();
            };
        },
        { scope: sectionRef }
    );

    return (
        <section
            id="about"
            data-analytics-section="about"
            ref={sectionRef}
            aria-labelledby="about-heading"
            className="relative w-full scroll-mt-[calc(var(--nav-height,80px)+2rem)] px-5 py-24 md:px-8 md:py-32"
        >
            <div className="mx-auto max-w-7xl">
                <div ref={sectionHeaderRef} className="flex w-full items-center gap-4">
                    <p className="shrink-0 font-display text-xs font-bold uppercase leading-none tracking-[0.14em] text-[var(--text)]">
                        About Me
                    </p>
                    <span
                        data-about-line
                        aria-hidden="true"
                        className="h-px min-w-8 flex-1 bg-[var(--hairline)]"
                    />
                    <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)] sm:inline">
                        03 / Profile
                    </span>
                </div>

                <div className="mt-12 grid grid-cols-1 gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:gap-20">
                    <div className="min-w-0">
                        <h2
                            id="about-heading"
                            ref={headingRef}
                            className="font-display text-4xl font-bold leading-[1.04] tracking-[-0.025em] text-[var(--text)] sm:text-5xl lg:text-[3.65rem]"
                        >
                            I build reliable systems with a clean product feel.
                        </h2>
                        <p
                            ref={introRef}
                            className="mt-7 max-w-[46ch] text-base leading-[1.75] text-[var(--muted)] sm:text-lg"
                        >
                            Full-stack engineer focused on backend APIs, IoT workflows, and responsive interfaces that remain fast, clear, and maintainable.
                        </p>

                        <ul ref={proofListRef} className="mt-10 flex flex-wrap gap-2.5">
                            {PROOF_POINTS.map((point) => (
                                <li
                                    key={point.code}
                                    data-about-proof
                                    className="border border-[var(--hairline)] px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] transition-colors duration-300 ease-out hover:border-[var(--text)] hover:text-[var(--text)] motion-reduce:transition-none sm:text-[11px]"
                                >
                                    {point.code} &middot; {point.label}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <dl ref={detailListRef} className="min-w-0 border-b border-[var(--hairline)]">
                        {ABOUT_DETAILS.map((detail) => (
                            <div
                                key={detail.code}
                                data-about-row
                                className="group grid grid-cols-[minmax(0,1fr)_1.25rem] items-start gap-4 border-t border-[var(--hairline)] px-4 py-7 transition-colors duration-300 ease-out hover:bg-[var(--inverse-bg)] motion-reduce:transition-none sm:grid-cols-[11rem_minmax(0,1fr)_1.25rem] sm:gap-8"
                            >
                                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--faint)] transition-colors duration-300 ease-out group-hover:text-[var(--inverse-text)]/60 motion-reduce:transition-none sm:order-none">
                                    {detail.code} &mdash; {detail.label}
                                </dt>
                                <dd className="col-span-2 m-0 font-display text-lg font-semibold leading-[1.35] text-[var(--text)] transition-colors duration-300 ease-out group-hover:text-[var(--inverse-text)] motion-reduce:transition-none sm:col-span-1 sm:text-xl">
                                    {detail.value}
                                </dd>
                                <ArrowUpRight
                                    aria-hidden="true"
                                    size={18}
                                    strokeWidth={2.2}
                                    className="col-start-2 row-start-1 self-center justify-self-end text-[var(--inverse-text)] opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 motion-reduce:transition-none sm:col-start-3"
                                />
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        </section>
    );
}
