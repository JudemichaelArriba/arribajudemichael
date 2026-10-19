'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TECH_CATEGORIES } from '@/lib/techStack';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function TechStack() {
    const sectionRef = useRef<HTMLElement>(null);

    useGSAP(
        () => {
            const section = sectionRef.current;
            if (!section) return;

            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const headingCopy = section.querySelector<HTMLElement>('.tech-stack-heading-copy');
            const rows = gsap.utils.toArray<HTMLElement>('.tech-stack-row', section);
            const animatedTargets = gsap.utils.toArray<HTMLElement>(
                '.tech-stack-heading-copy, .tech-stack-category, .tech-stack-index, .tech-stack-meta-line, .tech-stack-count, .tech-stack-item',
                section
            );
            const triggers: ScrollTrigger[] = [];
            const timelines: gsap.core.Timeline[] = [];

            if (prefersReducedMotion) {
                gsap.set(animatedTargets, {
                    autoAlpha: 1,
                    x: 0,
                    y: 0,
                    scaleX: 1,
                    clearProps: 'transform,opacity,visibility,willChange',
                });
                return;
            }

            if (headingCopy) {
                const setHeadingInitialState = () => {
                    gsap.set(headingCopy, {
                        autoAlpha: 0,
                        x: -16,
                        willChange: 'transform, opacity',
                    });
                };

                setHeadingInitialState();

                const headingTimeline = gsap.timeline({
                    paused: true,
                    defaults: { overwrite: 'auto', force3D: true },
                });
                timelines.push(headingTimeline);

                headingTimeline.to(headingCopy, {
                    autoAlpha: 1,
                    x: 0,
                    duration: 0.62,
                    ease: 'expo.out',
                    clearProps: 'transform,willChange',
                });

                const resetHeading = () => {
                    headingTimeline.pause(0, true);
                    setHeadingInitialState();
                };

                const headingTrigger = ScrollTrigger.create({
                    trigger: headingCopy,
                    start: 'top 92%',
                    end: 'bottom top',
                    invalidateOnRefresh: true,
                    onEnter: () => {
                        resetHeading();
                        headingTimeline.restart(true);
                    },
                    onLeaveBack: resetHeading,
                });
                triggers.push(headingTrigger);
            }

            rows.forEach((row) => {
                const category = row.querySelector<HTMLElement>('.tech-stack-category');
                const metaIndex = row.querySelector<HTMLElement>('.tech-stack-index');
                const metaLine = row.querySelector<HTMLElement>('.tech-stack-meta-line');
                const metaCount = row.querySelector<HTMLElement>('.tech-stack-count');
                const items = gsap.utils.toArray<HTMLElement>('.tech-stack-item', row);
                if (!category || items.length === 0) return;

                const metaTargets = [metaIndex, metaLine, metaCount].filter(
                    (target): target is HTMLElement => target !== null
                );

                const setRowInitialState = () => {
                    gsap.set(metaTargets, {
                        autoAlpha: 0,
                        y: 6,
                    });
                    if (metaLine) {
                        gsap.set(metaLine, {
                            scaleX: 0,
                            transformOrigin: '0% 50%',
                        });
                    }
                    gsap.set(category, {
                        autoAlpha: 0,
                        x: -16,
                        y: 10,
                    });
                    gsap.set(items, {
                        autoAlpha: 0,
                        y: 14,
                    });
                };

                setRowInitialState();
                const rowTargets = [...metaTargets, category, ...items];

                const timeline = gsap.timeline({
                    defaults: { overwrite: 'auto', force3D: true },
                    scrollTrigger: {
                        trigger: row,
                        start: 'top 92%',
                        end: 'bottom 62%',
                        scrub: 0.7,
                        invalidateOnRefresh: true,
                        onToggle: ({ isActive }) => {
                            gsap.set(rowTargets, {
                                willChange: isActive ? 'transform, opacity' : 'auto',
                            });
                        },
                    },
                });
                timelines.push(timeline);
                if (timeline.scrollTrigger) triggers.push(timeline.scrollTrigger);

                timeline.to(metaIndex ?? [], {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.48,
                    ease: 'sine.out',
                }, 0);

                timeline.to(metaLine ?? [], {
                    autoAlpha: 1,
                    y: 0,
                    scaleX: 1,
                    duration: 0.52,
                    ease: 'sine.out',
                }, 0.08);

                timeline.to(metaCount ?? [], {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.56,
                    ease: 'sine.out',
                }, 0.16);

                timeline.to(category, {
                    autoAlpha: 1,
                    x: 0,
                    y: 0,
                    duration: 0.84,
                    ease: 'sine.out',
                }, 0.22);

                items.forEach((item, index) => {
                    const itemStart = 1.02 + index * 1.05;

                    timeline.to(item, {
                        autoAlpha: 1,
                        y: 0,
                        duration: 0.84,
                        ease: 'sine.out',
                    }, itemStart);
                });
            });

            return () => {
                gsap.set(animatedTargets, { clearProps: 'willChange' });
                triggers.forEach((trigger) => trigger.kill(false));
                timelines.forEach((timeline) => timeline.kill());
            };
        },
        { scope: sectionRef }
    );

    return (
        <section
            ref={sectionRef}
            id="techstack"
            data-analytics-section="techstack"
            className="relative mx-auto w-full max-w-7xl scroll-mt-[calc(var(--nav-height,80px)+2rem)] px-5 py-24 md:px-8 md:py-32"
        >
            <div className="mb-14 md:mb-20">
                <div className="tech-stack-heading-copy flex w-full items-center gap-4">
                    <h2 className="shrink-0 font-display text-xs font-bold uppercase leading-[1.2] tracking-[0.14em] text-[var(--text)]">
                        Tech Stack
                    </h2>
                    <span
                        aria-hidden="true"
                        className="h-px min-w-8 flex-1 bg-[var(--hairline)]"
                    />
                    <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)] sm:inline">
                        05 / Toolkit
                    </span>
                </div>
            </div>

            <div className="flex flex-col">
                {TECH_CATEGORIES.map((category, idx) => (
                    <article
                        key={category.name}
                        className={`tech-stack-row grid grid-cols-1 gap-10 md:grid-cols-[minmax(180px,0.72fr)_minmax(0,2fr)] md:gap-20 ${idx > 0 ? 'border-t border-[var(--hairline)] pt-16 mt-16 md:pt-24 md:mt-24' : ''
                            }`}
                    >
                        <div className="flex flex-col gap-3">
                            <div className="tech-stack-meta flex items-center gap-2.5">
                                <span className="tech-stack-index font-mono text-[0.65rem] font-bold tabular-nums text-[var(--faint)]">
                                    {String(idx + 1).padStart(2, '0')}
                                </span>
                                <span aria-hidden="true" className="tech-stack-meta-line h-px w-4 bg-[var(--hairline-strong)]" />
                                <span className="tech-stack-count font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--faint)]">
                                    {category.technologies.length} {category.technologies.length === 1 ? 'tool' : 'tools'}
                                </span>
                            </div>

                            <h3 className="tech-stack-category font-display text-[clamp(2rem,5vw,4.25rem)] font-extrabold leading-none tracking-[-0.03em] text-[var(--text)]">
                                {category.name}
                            </h3>
                        </div>

                        <ul className="grid min-w-0 grid-cols-2 gap-x-8 gap-y-0 sm:grid-cols-3 sm:gap-x-10 xl:grid-cols-4">
                            {category.technologies.map((technology) => (
                                <li
                                    key={technology.name}
                                    className="tech-stack-item group flex min-h-12 min-w-0 items-center gap-3.5 border-b border-[var(--hairline-soft)] py-3.5 transition-colors duration-300 hover:border-[var(--text)] motion-reduce:transition-none"
                                >
                                    <span className="tech-stack-icon flex size-11 shrink-0 items-center justify-center transition-transform duration-300 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
                                        <Image
                                            src={technology.icon}
                                            alt=""
                                            width={36}
                                            height={36}
                                            sizes="36px"
                                            unoptimized
                                            className={`size-9 object-contain opacity-80 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none ${technology.invertOnDark ? 'tech-icon-adaptive' : ''}`}
                                        />
                                    </span>
                                    <span className="tech-stack-label flex min-w-0 items-center gap-1 text-sm font-semibold leading-tight text-[var(--muted)] transition-colors duration-300 group-hover:text-[var(--text)] motion-reduce:transition-none sm:text-[0.95rem]">
                                        <span
                                            aria-hidden="true"
                                            className="font-mono text-[var(--text)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none"
                                        >
                                            ›
                                        </span>
                                        {technology.name}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </article>
                ))}
            </div>
        </section>
    );
}
