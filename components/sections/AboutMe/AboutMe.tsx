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
    { code: 'A.03', label: 'Focus', value: 'Focused on end-to-end web architecture from secure RESTful APIs to refined, responsive client experiences.' },
    { code: 'A.04', label: 'Quality', value: 'Clean architecture, performance, and long-term maintainability' },
];

const proofPoints = [
    'Web interfaces And Mobile apps',
    'Backend APIs',
    'Maintainable code',
];

export default function AboutMe() {
    const sectionRef = useRef<HTMLElement>(null);
    const eyebrowRef = useRef<HTMLParagraphElement>(null);
    const chipsRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef<HTMLDivElement>(null);
    const bentoWrapRef = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            const section = sectionRef.current;
            const frame = frameRef.current;
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            if (!section || prefersReducedMotion) return;

            const copyTargets = [eyebrowRef.current].filter(Boolean) as HTMLElement[];
            const chipTargets = gsap.utils.toArray<HTMLElement>('[data-about-chip]', chipsRef.current ?? undefined);
            const cardTargets = gsap.utils.toArray<HTMLElement>('.about-bento-card', bentoWrapRef.current ?? undefined);
            const refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh());

            if (frame) gsap.set(frame, { autoAlpha: 0, y: 20, scale: 0.97, transformOrigin: '50% 24%' });
            gsap.set(copyTargets, { autoAlpha: 0, y: 16 });
            gsap.set(chipTargets, { autoAlpha: 0, y: 12 });
            gsap.set(cardTargets, { autoAlpha: 0, y: 16, scale: 0.985, transformOrigin: '50% 0%' });

            const timeline = gsap.timeline({
                defaults: { overwrite: 'auto', force3D: true },
                scrollTrigger: {
                    trigger: section,
                    start: 'top 88%',
                    once: true,
                    invalidateOnRefresh: true,
                },
            });

            if (frame) {
                timeline.to(frame, {
                    autoAlpha: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.68,
                    ease: 'expo.out',
                }, 0);
            }

            timeline
                .to(copyTargets, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.62,
                    ease: 'power3.out',
                    stagger: 0.06,
                }, 0.08)
                .to(chipTargets, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.46,
                    ease: 'power3.out',
                    stagger: 0.035,
                }, 0.28)
                .to(cardTargets, {
                    autoAlpha: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.52,
                    ease: 'power3.out',
                    stagger: 0.045,
                }, 0.36);

            return () => {
                window.cancelAnimationFrame(refreshFrame);
                timeline.scrollTrigger?.kill();
                timeline.kill();
            };
        },
        { scope: sectionRef }
    );

    return (
        <section id="about" ref={sectionRef} className="relative w-full scroll-mt-[calc(var(--nav-height,80px)+2rem)] px-5 py-24 md:px-8 lg:py-28">
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[var(--signal)]/20 to-transparent md:inset-x-8" />

            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-9 lg:grid-cols-[360px_1fr] lg:items-start lg:gap-12">
                <div ref={frameRef} className="mx-auto w-full max-w-[360px] lg:mx-0 lg:pt-10">
                    <div className="relative rounded-lg border border-white/10 bg-white/[0.04] p-2 shadow-2xl shadow-black/20 backdrop-blur-md">
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute -left-2 -top-2 h-6 w-6 border-l-2 border-t-2 border-[var(--signal)]/35"
                        />
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute -right-2 -bottom-2 h-6 w-6 border-b-2 border-r-2 border-[var(--signal)]/35"
                        />

                        <TiltedCard
                            imageSrc="/profile.jpeg"
                            altText="Jude Michael Arriba"
                            captionText="Jude Michael Arriba"
                            containerHeight="430px"
                            containerWidth="100%"
                            imageHeight="430px"
                            imageWidth="100%"
                            rotateAmplitude={4}
                            scaleOnHover={1.01}
                            showMobileWarning={false}
                            showTooltip={false}
                            displayOverlayContent
                            overlayContent={
                                <div className="flex w-full flex-col justify-end bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/70 to-transparent p-5 pt-20">
                                    <div className="mb-2 flex items-center gap-1.5">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--signal)] opacity-70" />
                                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--signal)]" />
                                        </span>
                                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--signal)]">
                                            Open to opportunities
                                        </span>
                                    </div>
                                    <p className="font-name text-2xl font-bold leading-none text-[var(--text)]">Jude Michael Arriba</p>
                                    <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]/62">
                                        Full-Stack Engineer
                                    </p>
                                </div>
                            }
                        />
                    </div>
                </div>

                <div className="min-w-0">
                    <div className="max-w-2xl">
                        <p ref={eyebrowRef} className="font-mono text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--signal)]">{'// about'}</p>
                        <ScrollFloat
                            as="h2"
                            containerClassName="font-display mt-4 text-left text-4xl font-extrabold tracking-normal text-[var(--text)] sm:text-5xl"
                            textClassName="text-left leading-[1.06]"
                            animationDuration={0.56}
                            ease="power3.out"
                            settleEase="power2.out"
                            scrollStart="top 90%"
                            scrollEnd="bottom top"
                            charStagger={0.018}
                            wordStagger={0.045}
                            playOnce
                        >
                            I build reliable systems with a clean product feel.
                        </ScrollFloat>
                        <ScrollFloat
                            as="p"
                            containerClassName="mt-5 max-w-xl text-left text-base leading-relaxed text-[var(--muted)]/76"
                            textClassName="text-left leading-relaxed"
                            animationDuration={0.48}
                            ease="power3.out"
                            settleEase="power2.out"
                            scrollStart="top 90%"
                            scrollEnd="bottom top"
                            charStagger={0.012}
                            wordStagger={0.035}
                            playOnce
                        >
                            Full-stack engineer focused on backend APIs, IoT workflows, and fast web interfaces that stay easy to maintain.
                        </ScrollFloat>

                        <div ref={chipsRef} className="mt-7 flex flex-wrap gap-2">
                            {proofPoints.map((point) => (
                                <span
                                    key={point}
                                    data-about-chip
                                    className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]/72"
                                >
                                    {point}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div ref={bentoWrapRef} className="mt-8">
                        <AboutBento
                            cards={aboutCards}
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
        </section>
    );
}




