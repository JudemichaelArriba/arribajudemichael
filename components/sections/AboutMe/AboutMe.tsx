'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { GitHubContributionsDto } from '@/features/github/types';
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

    // Scrubbed: the intro rises as the section enters, then a second pass fills the GitHub
    // calendar column by column while its numbers count up.
    useGSAP(
        () => {
            const section = sectionRef.current;
            const heading = headingRef.current;
            if (!section || !heading) return;

            const mm = gsap.matchMedia();
            mm.add('(prefers-reduced-motion: no-preference)', () => {
                gsap.timeline({
                    defaults: { ease: 'none' },
                    scrollTrigger: { trigger: section, start: 'top 85%', end: 'top 20%', scrub: 0.6, invalidateOnRefresh: true },
                })
                    .fromTo(gsap.utils.toArray<HTMLElement>('[data-about-line]', sectionHeaderRef.current ?? undefined), { scaleX: 0 }, { scaleX: 1, transformOrigin: 'left center', duration: 0.3 }, 0)
                    .fromTo(heading, { autoAlpha: 0, y: 48 }, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: 0.5 }, 0.05)
                    .fromTo(introRef.current, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.25)
                    .fromTo(gsap.utils.toArray<HTMLElement>('[data-about-proof]', proofListRef.current ?? undefined), { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, ease: 'back.out(2)', duration: 0.3, stagger: 0.08 }, 0.5);

                const blocks = gsap.utils.toArray<HTMLElement>('[data-about-activity]', section);
                const activity = blocks[0]?.parentElement;
                if (!activity) return;

                // Finishes while the whole block is in view: as its bottom reaches the fold, or, when it
                // is taller than the screen, once its top has risen near the top.
                const calendar = gsap.timeline({
                    defaults: { ease: 'none' },
                    scrollTrigger: {
                        trigger: activity,
                        start: 'top 85%',
                        end: () => (activity.offsetHeight <= window.innerHeight * 0.85 ? 'bottom 95%' : 'top 10%'),
                        scrub: 0.6,
                        invalidateOnRefresh: true,
                    },
                });
                calendar.fromTo(blocks[0], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.15 }, 0);

                // One CSS variable drives every cell (see GitHubActivity): cheap to scrub and to refresh.
                const grid = activity.querySelector<HTMLElement>('[data-calendar-grid]');
                if (grid) {
                    const weeks = getComputedStyle(grid).gridTemplateColumns.split(' ').length || 53;
                    const reveal = { value: 0 };
                    calendar.fromTo(reveal, { value: 0 }, {
                        value: weeks + 1,
                        duration: 0.75,
                        onUpdate: () => grid.style.setProperty('--reveal', reveal.value.toFixed(2)),
                    }, 0.1);
                }

                // Count-ups write only the number's own text node and always end on the real value.
                gsap.utils.toArray<HTMLElement>('[data-count-to]', activity).forEach((el) => {
                    const target = Number(el.dataset.countTo);
                    const node = el.firstChild;
                    if (!Number.isFinite(target) || !node) return;
                    const final = node.nodeValue;
                    const counter = { value: 0 };
                    calendar.fromTo(counter, { value: 0 }, {
                        value: 1,
                        duration: 0.75,
                        onUpdate: () => {
                            node.nodeValue = counter.value >= 1 ? final : Math.round(target * counter.value).toLocaleString('en-US');
                        },
                    }, 0.1);
                });

                calendar.fromTo(blocks.slice(2), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.15, stagger: 0.05 }, 0.8);
                // On breakpoint change / unmount, show the whole calendar again.
                return () => grid?.style.removeProperty('--reveal');
            }, section);

            return () => mm.revert();
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
