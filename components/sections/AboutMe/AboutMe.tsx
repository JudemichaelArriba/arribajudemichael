'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { GitHubContributionsDto } from '@/features/github/types';
import { rearmOnExitBelow } from '@/lib/animations/rearmOnExitBelow';
import GitHubActivity from './GitHubActivity';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface AboutMeProps {
    /** `null` hides the calendar (token missing or GitHub unavailable). */
    contributions: GitHubContributionsDto | null;
}

// The Ask assistant restates this section's copy in features/chat/profile.ts; keep the two in sync.
const PROOF_POINTS = [
    { code: '01', label: 'BSIT' },
    { code: '02', label: 'Coding since 2023' },
    { code: '03', label: 'Innovathon winner' },
] as const;

export default function AboutMe({ contributions }: AboutMeProps) {
    const sectionRef = useRef<HTMLElement>(null);
    const sectionHeaderRef = useRef<HTMLDivElement>(null);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const introRef = useRef<HTMLParagraphElement>(null);
    const proofListRef = useRef<HTMLUListElement>(null);

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
            const activityTargets = gsap.utils.toArray<HTMLElement>('[data-about-activity]', section);

            if (prefersReducedMotion) {
                gsap.set([...copyTargets, ...proofTargets, ...activityTargets], {
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
                gsap.set(activityTargets, { autoAlpha: 0, y: 18 });
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
                .to(activityTargets, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.58,
                    ease: 'power3.out',
                    stagger: 0.08,
                }, 0.36);

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
        { scope: sectionRef, dependencies: [contributions] }
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

                <div className="mt-12 grid grid-cols-1 gap-8 lg:mt-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-20">
                    <h2
                        id="about-heading"
                        ref={headingRef}
                        className="min-w-0 font-display text-4xl font-bold leading-[1.02] tracking-[-0.03em] text-[var(--text)] sm:text-5xl lg:text-[4.25rem]"
                    >
                        Student by day,
                        <br />
                        builder by habit.
                    </h2>

                    <div className="min-w-0">
                        <p
                            ref={introRef}
                            className="max-w-[48ch] text-base leading-[1.75] text-[var(--muted)] sm:text-lg"
                        >
                            I&apos;m <strong className="font-semibold text-[var(--text)]">Jude Michael T. Arriba</strong>, an IT student at ACES Tagum College in Tagum, Davao del Norte, Philippines. I&apos;ve been teaching myself to code since 2023, shipped a capstone to production, won Innovathon 2026, and I&apos;m always looking for the next real problem to build for.
                        </p>

                        <ul ref={proofListRef} className="mt-7 flex flex-wrap gap-2.5">
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
                </div>

                {contributions ? <GitHubActivity contributions={contributions} /> : null}
            </div>
        </section>
    );
}
