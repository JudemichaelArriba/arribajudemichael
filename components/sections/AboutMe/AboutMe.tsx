'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import TiltedCard from '@/components/ui/TiltedCard/TiltedCard';
import AboutBento, { type AboutCardData } from './AboutBento';

gsap.registerPlugin(ScrollTrigger);

const aboutCards: AboutCardData[] = [
    { code: 'A.01', label: 'Location', value: 'Tagum City, Philippines' },
    { code: 'A.02', label: 'Status', value: 'Open to opportunities' },
    { code: 'A.03', label: 'Focus', value: 'Backend APIs, IoT systems, and polished web clients' },
    { code: 'A.04', label: 'Quality', value: 'Clean architecture, performance, and long-term maintainability' },
];

const proofPoints = [
    'Full-stack systems',
    'Backend + IoT',
    'Maintainable code',
];

export default function AboutMe() {
    const sectionRef = useRef<HTMLElement>(null);
    const copyRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef<HTMLDivElement>(null);
    const bentoWrapRef = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            const section = sectionRef.current;
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            if (!section || prefersReducedMotion) return;

            const revealTargets = [copyRef.current, frameRef.current, bentoWrapRef.current].filter(Boolean) as HTMLElement[];

            gsap.set(revealTargets, { autoAlpha: 0, y: 24 });

            const tween = gsap.to(revealTargets, {
                autoAlpha: 1,
                y: 0,
                duration: 0.58,
                ease: 'back.out(1.12)',
                stagger: 0.08,
                force3D: true,
                overwrite: 'auto',
                scrollTrigger: {
                    trigger: section,
                    start: 'top 72%',
                    once: true,
                },
            });

            return () => {
                tween.scrollTrigger?.kill();
                tween.kill();
            };
        },
        { scope: sectionRef }
    );

    return (
        <section id="about" ref={sectionRef} className="relative w-full px-5 py-20 md:px-8 lg:py-28">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--signal)]/20 to-transparent" />

            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 lg:grid-cols-[360px_1fr] lg:items-center lg:gap-14">
                <div ref={frameRef} className="mx-auto w-full max-w-[340px] lg:mx-0">
                    <div className="relative rounded-[18px] border border-white/10 bg-white/[0.035] p-2 shadow-2xl shadow-black/25 backdrop-blur-xl">
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute -left-2 -top-2 h-7 w-7 border-l-2 border-t-2 border-[var(--signal)]/40"
                        />
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute -right-2 -bottom-2 h-7 w-7 border-b-2 border-r-2 border-[var(--signal)]/40"
                        />

                        <TiltedCard
                            imageSrc="/profile.jpeg"
                            altText="Jude Michael Arriba"
                            captionText="Jude Michael Arriba"
                            containerHeight="390px"
                            containerWidth="100%"
                            imageHeight="390px"
                            imageWidth="100%"
                            rotateAmplitude={5}
                            scaleOnHover={1.015}
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
                    <div ref={copyRef} className="max-w-2xl">
                        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--signal)]">{'// about'}</p>
                        <h2 className="font-display mt-4 text-4xl font-bold leading-[1.04] tracking-normal text-[var(--text)] sm:text-5xl">
                            I build reliable systems with a clean product feel.
                        </h2>
                        <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--muted)]/78">
                            Full-stack engineer focused on backend APIs, IoT workflows, and fast web interfaces that stay easy to maintain.
                        </p>

                        <div className="mt-7 flex flex-wrap gap-2.5">
                            {proofPoints.map((point) => (
                                <span
                                    key={point}
                                    className="rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]/72"
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
