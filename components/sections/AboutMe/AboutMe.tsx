'use client';

import { useRef } from 'react';
import Image from 'next/image';
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

interface AiBadge {
    src: string;
    alt: string;
    href: string;
}

const aiBadges: AiBadge[] = [
    {
        src: '/ai-fundamentals-foundations-for-understanding-ai.png',
        alt: 'AI Fundamentals: Foundations for Understanding AI badge',
        href: 'https://www.credly.com/badges/a2b7fa9d-7e20-4236-b44d-85b20d351fe0/public_url',
    },
    {
        src: '/ai-fundamentals-language-and-vision-in-ai.png',
        alt: 'AI Fundamentals: Language and Vision in AI badge',
        href: 'https://www.credly.com/badges/d214e4d8-71dd-400b-bf20-34d3c2619621/public_url',
    },
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

            const setInitialState = () => {
                if (frame) gsap.set(frame, { autoAlpha: 0, y: 20, scale: 0.97, transformOrigin: '50% 24%' });
                gsap.set(copyTargets, { autoAlpha: 0, y: 16 });
                gsap.set(chipTargets, { autoAlpha: 0, y: 12 });
                gsap.set(cardTargets, { autoAlpha: 0, y: 16, scale: 0.985, transformOrigin: '50% 0%' });
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
                onLeaveBack: resetReveal,
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
        <section id="about" ref={sectionRef} className="relative w-full scroll-mt-[calc(var(--nav-height,80px)+2rem)] px-5 py-24 md:px-8 lg:py-28">
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[var(--signal)]/20 to-transparent md:inset-x-8" />

            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-9 lg:grid-cols-[360px_1fr] lg:items-start lg:gap-12">
                <div className="mx-auto w-full max-w-[360px] lg:mx-0 lg:pt-10">
                    <div ref={frameRef} className="relative rounded-lg border border-white/10 bg-white/[0.04] p-2 shadow-2xl shadow-black/20 backdrop-blur-md">
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

                    <div className="mt-3 flex flex-wrap items-center justify-start gap-2 sm:mt-4 sm:gap-2.5">
                        {aiBadges.map((badge) => (
                            <a
                                key={badge.href}
                                href={badge.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`View ${badge.alt} on Credly`}
                                className="group relative block size-14 shrink-0 touch-manipulation overflow-hidden rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:size-16"
                            >
                                <Image
                                    src={badge.src}
                                    alt={badge.alt}
                                    width={600}
                                    height={600}
                                    sizes="(min-width: 640px) 64px, 56px"
                                    unoptimized
                                    className="size-full object-cover"
                                />
                                <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-0 bg-[var(--signal)] opacity-0 mix-blend-color [@media(hover:hover)_and_(pointer:fine)]:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:transition-opacity [@media(hover:hover)_and_(pointer:fine)]:duration-300 [@media(hover:hover)_and_(pointer:fine)]:ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-focus-visible:opacity-0 motion-reduce:transition-none"
                                />
                            </a>
                        ))}
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
                            playOnce={false}
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
                            playOnce={false}
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




