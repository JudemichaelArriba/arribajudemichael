'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ScrollFloat from '@/components/ui/ScrollFloat/ScrollFloat';
import TiltedCard from '@/components/ui/TiltedCard/TiltedCard';
import AboutBento, { type AboutCardData } from './AboutBento';

gsap.registerPlugin(ScrollTrigger);

const aboutCards: AboutCardData[] = [
    { code: 'A.01', label: 'Location', value: 'Tagum City, Philippines' },
    { code: 'A.02', label: 'Status', value: 'Open to opportunities' },
    { code: 'A.03', label: 'Focus', value: 'Secure RESTful APIs paired with refined, responsive client experiences.' },
    { code: 'A.04', label: 'Quality', value: 'Clean architecture, measured performance, and long-term maintainability.' },
];

const proofPoints = [
    { code: '01', label: 'Full-stack systems' },
    { code: '02', label: 'Backend + IoT' },
    { code: '03', label: 'Maintainable code' },
] as const;

const aboutCardClassNames = [
    'sm:col-span-7',
    'sm:col-span-5',
    'sm:col-span-7',
    'sm:col-span-5',
] as const;

export default function AboutMe() {
    const sectionRef = useRef<HTMLElement>(null);
    const sectionHeaderRef = useRef<HTMLDivElement>(null);
    const headerLineRef = useRef<HTMLSpanElement>(null);
    const proofListRef = useRef<HTMLUListElement>(null);
    const frameRef = useRef<HTMLDivElement>(null);
    const bentoLabelRef = useRef<HTMLDivElement>(null);
    const bentoWrapRef = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            const section = sectionRef.current;
            const frame = frameRef.current;
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            if (!section || prefersReducedMotion) return;

            const copyTargets = [sectionHeaderRef.current, bentoLabelRef.current].filter(Boolean) as HTMLElement[];
            const proofTargets = gsap.utils.toArray<HTMLElement>('[data-about-proof]', proofListRef.current ?? undefined);
            const cardTargets = gsap.utils.toArray<HTMLElement>('.about-bento-card', bentoWrapRef.current ?? undefined);
            const refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh());

            const setInitialState = () => {
                if (frame) gsap.set(frame, { autoAlpha: 0, y: 24 });
                gsap.set(copyTargets, { autoAlpha: 0, y: 12 });
                gsap.set(headerLineRef.current, { scaleX: 0, transformOrigin: 'left center' });
                gsap.set(proofTargets, { autoAlpha: 0, y: 14 });
                gsap.set(cardTargets, { autoAlpha: 0, y: 18 });
            };

            setInitialState();

            const timeline = gsap.timeline({
                paused: true,
                defaults: { overwrite: 'auto', force3D: true },
            });

            if (frame) {
                timeline.to(frame, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.72,
                    ease: 'power3.out',
                }, 0.08);
            }

            timeline
                .to(copyTargets, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.56,
                    ease: 'power3.out',
                    stagger: 0.22,
                }, 0)
                .to(headerLineRef.current, {
                    scaleX: 1,
                    duration: 0.72,
                    ease: 'power3.out',
                }, 0.1)
                .to(proofTargets, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.5,
                    ease: 'power3.out',
                    stagger: 0.07,
                }, 0.34)
                .to(cardTargets, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.56,
                    ease: 'power3.out',
                    stagger: 0.06,
                }, 0.48);

            const resetReveal = () => {
                timeline.pause(0, true);
                setInitialState();
            };

            const trigger = ScrollTrigger.create({
                trigger: section,
                start: 'top 88%',
                end: 'bottom top',
                invalidateOnRefresh: true,
                onEnter: () => {
                    setInitialState();
                    timeline.restart(true);
                },
                onLeaveBack: () => {
                    if (section.getBoundingClientRect().top >= window.innerHeight * 0.86) {
                        resetReveal();
                    }
                },
            });

            return () => {
                window.cancelAnimationFrame(refreshFrame);
                trigger.kill(false);
                timeline.kill();
            };
        },
        { scope: sectionRef }
    );

    return (
        <section id="about" ref={sectionRef} className="relative w-full scroll-mt-[calc(var(--nav-height,80px)+2rem)] px-5 py-20 sm:py-24 md:px-8 lg:py-28">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[var(--signal)]/20 to-transparent md:inset-x-8" />

            <div className="mx-auto max-w-7xl">
                <div ref={sectionHeaderRef} className="flex w-full items-center gap-4">
                    <p className="shrink-0 font-mono text-xs font-extrabold uppercase leading-none tracking-[0.14em] text-[color-mix(in_srgb,var(--signal)_82%,#ffffff_18%)]">{'// about'}</p>
                    <span
                        ref={headerLineRef}
                        aria-hidden="true"
                        className="h-px min-w-8 flex-1 bg-gradient-to-r from-[var(--signal)]/50 via-white/10 to-transparent"
                    />
                    <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]/42 sm:inline">
                        02 / Profile
                    </span>
                </div>

                <div className="mt-10 grid grid-cols-1 gap-12 lg:mt-14 lg:grid-cols-[minmax(300px,0.78fr)_minmax(0,1.45fr)] lg:items-start lg:gap-16 xl:gap-20">
                    <div className="mx-auto w-full max-w-[390px] lg:mx-0">
                        <div ref={frameRef} className="relative aspect-[6/7] w-full sm:aspect-[4/5]">
                            <TiltedCard
                                imageSrc="/profile.jpeg"
                                altText="Jude Michael Arriba"
                                captionText="Jude Michael Arriba"
                                containerHeight="100%"
                                containerWidth="100%"
                                imageHeight="100%"
                                imageWidth="100%"
                                imageObjectPosition="center 64%"
                                rotateAmplitude={3}
                                scaleOnHover={1.008}
                                showMobileWarning={false}
                                showTooltip={false}
                                displayOverlayContent
                                overlayContent={
                                    <div className="flex w-full flex-col justify-end bg-gradient-to-t from-black via-black/[0.58] to-transparent p-5 pt-24 sm:p-6 sm:pt-28">
                                        <div className="mb-3 flex items-center gap-2">
                                            <span className="relative flex h-2 w-2 items-center justify-center" aria-hidden="true">
                                                <span className="h-1.5 w-1.5 rounded-full bg-[var(--signal)] shadow-[0_0_0_4px_rgba(195,109,252,0.13)]" />
                                            </span>
                                            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--signal)]">
                                                Open to opportunities
                                            </span>
                                        </div>
                                        <p className="font-name text-[1.65rem] font-bold leading-none text-[var(--text)] sm:text-3xl">Jude Michael Arriba</p>
                                        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]/58 sm:text-[11px]">
                                            Full-Stack Engineer
                                        </p>
                                    </div>
                                }
                            />
                        </div>
                    </div>

                    <div className="min-w-0">
                        <div className="max-w-3xl">
                            <ScrollFloat
                                as="h2"
                                containerClassName="font-display text-left text-4xl font-extrabold tracking-normal text-[var(--text)] sm:text-5xl lg:text-[3.5rem]"
                                textClassName="text-left leading-[1.04]"
                                animationDuration={0.56}
                                ease="power3.out"
                                settleEase="power2.out"
                                scrollStart="top 90%"
                                scrollEnd="bottom top"
                                charStagger={0.018}
                                wordStagger={0.045}
                                playOnce={false}
                            >
                                I build reliable systems with a clean product feel.
                            </ScrollFloat>
                            <ScrollFloat
                                as="p"
                                containerClassName="mt-6 max-w-2xl text-left text-base leading-relaxed text-[var(--muted)]/70 sm:text-lg"
                                textClassName="text-left leading-[1.7]"
                                animationDuration={0.48}
                                ease="power3.out"
                                settleEase="power2.out"
                                scrollStart="top 90%"
                                scrollEnd="bottom top"
                                charStagger={0.012}
                                wordStagger={0.035}
                                playOnce={false}
                            >
                                Full-stack engineer focused on backend APIs, IoT workflows, and responsive interfaces that remain fast, clear, and maintainable.
                            </ScrollFloat>

                            <ul ref={proofListRef} className="mt-9 grid gap-5 border-y border-white/[0.08] py-5 sm:grid-cols-3 sm:gap-0 sm:py-6">
                                {proofPoints.map((point) => (
                                    <li
                                        key={point.code}
                                        data-about-proof
                                        className="flex items-baseline gap-3 sm:block sm:border-l sm:border-white/[0.08] sm:px-5 sm:first:border-l-0 sm:first:pl-0 sm:last:pr-0"
                                    >
                                        <span className="font-mono text-[10px] font-bold tabular-nums tracking-[0.12em] text-[var(--signal)]/65">
                                            {point.code}
                                        </span>
                                        <span className="font-mono text-xs font-semibold uppercase leading-relaxed tracking-[0.1em] text-[var(--text)]/78 sm:mt-2 sm:block">
                                            {point.label}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div ref={bentoWrapRef} className="mt-9 sm:mt-10">
                            <div ref={bentoLabelRef} className="mb-4 flex items-center gap-3">
                                <p className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]/48">
                                    Profile details
                                </p>
                                <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                            </div>
                            <AboutBento
                                cards={aboutCards}
                                gridClassName="sm:grid-cols-12"
                                cardClassNames={aboutCardClassNames}
                                enableStars={false}
                                enableSpotlight
                                enableBorderGlow
                                clickEffect={false}
                                spotlightRadius={260}
                                particleCount={0}
                                glowColor="195, 109, 252"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}




