'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface Technology {
    name: string;
    icon: string;
    invertOnDark?: boolean;
}

interface TechCategory {
    name: string;
    technologies: Technology[];
}

const TECH_CATEGORIES: TechCategory[] = [
    {
        name: 'Frontend',
        technologies: [
            { name: 'Angular', icon: '/tech/angular.svg' },
            { name: 'Flutter', icon: '/tech/flutter.svg' },
            { name: 'JavaScript', icon: '/tech/javascript.svg' },
            { name: 'Tailwind CSS', icon: '/tech/tailwindcss.svg' },
            { name: 'CSS3', icon: '/tech/css3.svg' },
            { name: 'TypeScript', icon: '/tech/typescript.svg' },
            { name: 'React', icon: '/tech/react.svg' },
            { name: 'Next.js', icon: '/tech/nextjs.svg', invertOnDark: true },
            { name: 'GSAP', icon: '/tech/gsap.svg' },
            { name: 'Kotlin', icon: '/tech/kotlin.svg' },
        ],
    },
    {
        name: 'Backend',
        technologies: [
            { name: 'Laravel', icon: '/tech/laravel.svg' },
            { name: 'Node.js', icon: '/tech/nodejs.svg' },
            { name: 'Python', icon: '/tech/python.svg' },
            { name: 'Java', icon: '/tech/java.svg' },
        ],
    },
    {
        name: 'Database',
        technologies: [
            { name: 'PostgreSQL', icon: '/tech/postgresql.svg' },
            { name: 'Supabase', icon: '/tech/supabase.svg' },
            { name: 'MySQL', icon: '/tech/mysql.svg' },
            { name: 'Firebase RTDB', icon: '/tech/firebase.svg' },
        ],
    },
    {
        name: 'Tools',
        technologies: [
            { name: 'Git', icon: '/tech/git.svg' },
            { name: 'Docker', icon: '/tech/docker.svg' },
            { name: 'Postman', icon: '/tech/postman.svg' },
            { name: 'Figma', icon: '/tech/figma.svg' },
            { name: 'Visual Studio Code', icon: '/tech/vscode.svg' },
            { name: 'Android Studio', icon: '/tech/androidstudio.svg' },
            { name: 'GitHub', icon: '/tech/github.svg', invertOnDark: true },
        ],
    },
];

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
                '.tech-stack-heading-copy, .tech-stack-category, .tech-stack-icon, .tech-stack-label',
                section
            );
            const triggers: ScrollTrigger[] = [];
            const timelines: gsap.core.Timeline[] = [];

            if (prefersReducedMotion) {
                gsap.set(animatedTargets, {
                    autoAlpha: 1,
                    x: 0,
                    y: 0,
                    clearProps: 'transform,opacity,visibility,willChange',
                });
                return;
            }

            if (headingCopy) {
                const setHeadingInitialState = () => {
                    gsap.set(headingCopy, {
                        autoAlpha: 0,
                        x: -20,
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
                const items = gsap.utils.toArray<HTMLElement>('.tech-stack-item', row);
                const icons = gsap.utils.toArray<HTMLElement>('.tech-stack-icon', row);
                const labels = gsap.utils.toArray<HTMLElement>('.tech-stack-label', row);
                if (!category || items.length === 0) return;

                const setRowInitialState = () => {
                    gsap.set(category, {
                        autoAlpha: 0,
                        x: -20,
                        y: 12,
                    });
                    gsap.set(icons, {
                        autoAlpha: 0,
                        y: 18,
                    });
                    gsap.set(labels, {
                        autoAlpha: 0,
                        y: 14,
                    });
                };

                setRowInitialState();
                const rowTargets = [category, ...icons, ...labels];

                const timeline = gsap.timeline({
                    defaults: { overwrite: 'auto', force3D: true },
                    scrollTrigger: {
                        trigger: row,
                        start: 'top 92%',
                        end: () => `+=${Math.max(420, items.length * 96)}`,
                        scrub: 0.55,
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

                timeline.to(category, {
                    autoAlpha: 1,
                    x: 0,
                    y: 0,
                    duration: 0.7,
                    ease: 'power2.out',
                }, 0);

                items.forEach((item, index) => {
                    const icon = item.querySelector<HTMLElement>('.tech-stack-icon');
                    const label = item.querySelector<HTMLElement>('.tech-stack-label');
                    if (!icon || !label) return;

                    const itemStart = 0.72 + index * 0.9;

                    timeline
                        .to(icon, {
                            autoAlpha: 1,
                            y: 0,
                            duration: 0.62,
                            ease: 'power2.out',
                        }, itemStart)
                        .to(label, {
                            autoAlpha: 1,
                            y: 0,
                            duration: 0.66,
                            ease: 'power2.out',
                        }, itemStart + 0.14);
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
            className="relative mx-auto w-full max-w-7xl scroll-mt-[calc(var(--nav-height,80px)+2rem)] px-5 py-24 md:px-8 md:py-32"
        >
            <div className="mb-14 md:mb-20">
                <div className="tech-stack-heading-copy flex w-full max-w-sm items-center gap-3">
                    <h2 className="shrink-0 font-mono text-xs font-extrabold uppercase leading-[1.2] tracking-[0.14em] text-[color-mix(in_srgb,var(--signal)_78%,#ffffff_22%)]">
                        Tech Stack
                    </h2>
                    <span
                        aria-hidden="true"
                        className="h-px min-w-8 flex-1 bg-gradient-to-l from-transparent to-[var(--signal)]/55"
                    />
                </div>
            </div>

            <div className="space-y-20 md:space-y-28">
                {TECH_CATEGORIES.map((category) => (
                    <article
                        key={category.name}
                        className="tech-stack-row grid grid-cols-1 gap-10 md:grid-cols-[minmax(180px,0.72fr)_minmax(0,2fr)] md:gap-20"
                    >
                        <h3 className="tech-stack-category font-display text-[clamp(2rem,5vw,4.25rem)] font-extrabold leading-none tracking-normal text-[var(--text)]">
                            {category.name}
                        </h3>

                        <ul className="grid min-w-0 grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 sm:gap-x-10 xl:grid-cols-4">
                            {category.technologies.map((technology) => (
                                <li
                                    key={technology.name}
                                    className="tech-stack-item flex min-h-12 min-w-0 items-center gap-3.5"
                                >
                                    <span className="tech-stack-icon flex size-11 shrink-0 items-center justify-center">
                                        <Image
                                            src={technology.icon}
                                            alt=""
                                            width={36}
                                            height={36}
                                            sizes="36px"
                                            unoptimized
                                            className={`size-9 object-contain ${technology.invertOnDark ? 'brightness-0 invert' : ''}`}
                                        />
                                    </span>
                                    <span className="tech-stack-label min-w-0 text-sm font-semibold leading-tight text-[var(--text)] sm:text-[0.95rem]">
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
