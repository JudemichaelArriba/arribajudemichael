'use client';

import { useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { usePreloaderReady } from '@/components/loader/Preloader';
import { useTheme } from '@/components/theme/ThemeProvider';
import CursorGrid from '@/components/ui/CursorGrid/CursorGrid';

const GRID_COLOR: Record<'light' | 'dark', string> = {
    light: '#141414',
    dark: '#ededed',
};

gsap.registerPlugin(useGSAP);

const NAME_WORDS = ['Jude', 'Michael', 'T.', 'Arriba'];

const ROLES = [
    'Frontend Developer',
    'Fullstack Developer',
    'Backend Developer',
    'Mobile Developer',
];

// Four passes of the list: the second half is identical to the first, so a
// -50% translation loops seamlessly.
const MARQUEE_ITEMS = [...ROLES, ...ROLES, ...ROLES, ...ROLES];

/**
 * Eases the carousel to a halt and back rather than calling pause()/resume() —
 * a hard stop mid-travel is what made the hover feel like a snag.
 */
function rampMarquee(tween: gsap.core.Tween | null, value: number) {
    if (!tween) return;
    gsap.to(tween, {
        timeScale: value,
        duration: value === 0 ? 0.45 : 0.7,
        ease: value === 0 ? 'power3.out' : 'power2.inOut',
        overwrite: true,
    });
}

export default function Home() {
    const sectionRef = useRef<HTMLElement>(null);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const portraitMaskRef = useRef<HTMLDivElement>(null);
    const portraitInnerRef = useRef<HTMLDivElement>(null);
    const marqueeRef = useRef<HTMLDivElement>(null);
    const marqueeTrackRef = useRef<HTMLDivElement>(null);
    const marqueeTweenRef = useRef<gsap.core.Tween | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const portraitWrapRef = useRef<HTMLDivElement>(null);
    const isReady = usePreloaderReady();
    const { theme } = useTheme();


    // Continuous role carousel — independent of the intro, always looping.
    useGSAP(
        () => {
            const track = marqueeTrackRef.current;
            if (!track) return;
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

            marqueeTweenRef.current = gsap.to(track, {
                xPercent: -50,
                duration: 60,
                ease: 'none',
                repeat: -1,
            });

            return () => {
                marqueeTweenRef.current?.kill();
                marqueeTweenRef.current = null;
            };
        },
        { scope: sectionRef }
    );

    useGSAP(
        () => {
            const heading = headingRef.current;
            const marquee = marqueeRef.current;
            const mask = portraitMaskRef.current;
            const inner = portraitInnerRef.current;
            if (!heading || !marquee || !mask || !inner) return;

            const words = gsap.utils.toArray<HTMLElement>('[data-hero-word]', heading);
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            if (prefersReducedMotion) {
                gsap.set(words, { yPercent: 0 });
                gsap.set(mask, { clipPath: 'inset(0% 0% 0% 0%)' });
                gsap.set(inner, { yPercent: 0 });
                gsap.set(marquee, { yPercent: 0 });
                return;
            }

            // Everything is parked from the very first render, before the curtain
            // starts lifting. Setting the marquee only once `isReady` flipped meant
            // it sat there visible, got yanked off-screen, then rolled back in.
            const setInitialState = () => {
                gsap.set(words, { yPercent: 115 });
                gsap.set(mask, { clipPath: 'inset(100% 0% 0% 0%)' });
                gsap.set(inner, { yPercent: 6 });
                gsap.set(marquee, { yPercent: 100 });
            };

            setInitialState();

            // The intro overlay covers the hero; playing now would burn the whole
            // entrance behind it.
            if (!isReady) return;

            const timeline = gsap.timeline({
                delay: 0.05,
                defaults: { overwrite: 'auto', force3D: true },
            });

            timeline
                .to(words, {
                    yPercent: 0,
                    duration: 0.9,
                    ease: 'expo.out',
                    stagger: 0.07,
                }, 0)
                .to(mask, {
                    clipPath: 'inset(0% 0% 0% 0%)',
                    duration: 1.05,
                    ease: 'expo.out',
                }, 0.2)
                .to(inner, {
                    yPercent: 0,
                    duration: 1.15,
                    ease: 'expo.out',
                }, 0.2)
                .to(marquee, {
                    yPercent: 0,
                    duration: 0.8,
                    ease: 'power3.out',
                }, 0.42);

            return () => {
                timeline.kill();
            };
        },
        { scope: sectionRef, dependencies: [isReady] }
    );

    // Scroll exit (pinned, scrubbed). It moves the words in px and the portrait's outer wrapper,
    // so it composes with the intro (yPercent / clip-path) instead of fighting it.
    useGSAP(
        () => {
            const section = sectionRef.current;
            const heading = headingRef.current;
            const portrait = portraitWrapRef.current;
            const grid = gridRef.current;
            if (!section || !heading || !portrait || !grid) return;

            const mm = gsap.matchMedia();
            mm.add('(prefers-reduced-motion: no-preference)', () => {
                const words = gsap.utils.toArray<HTMLElement>('[data-hero-word]', heading);
                gsap.timeline({
                    defaults: { ease: 'none' },
                    scrollTrigger: {
                        trigger: section,
                        start: 'top top',
                        end: () => `+=${Math.max(window.innerHeight * 0.8, 640)}`,
                        pin: true,
                        scrub: 0.6,
                        invalidateOnRefresh: true,
                    },
                })
                    .fromTo(words, { y: 0 }, { y: (_: number, word: HTMLElement) => word.offsetHeight * 1.15, ease: 'power2.in', duration: 0.45, stagger: 0.07 }, 0.1)
                    .fromTo(portrait, { y: 0, scale: 1, autoAlpha: 1 }, { y: -40, scale: 0.92, autoAlpha: 0.15, transformOrigin: '50% 100%', duration: 0.8 }, 0.15)
                    .fromTo(grid, { autoAlpha: 0.7 }, { autoAlpha: 0, duration: 0.5 }, 0)
                    .to({}, { duration: 0.05 }, 0.95);
            }, section);
            return () => mm.revert();
        },
        { scope: sectionRef }
    );

    return (
        <section
            id="home"
            ref={sectionRef}
            className="relative isolate min-h-svh w-full overflow-hidden"
        >
            <div ref={gridRef} aria-hidden="true" className="absolute inset-0 z-0 opacity-70">
                <CursorGrid
                    color={GRID_COLOR[theme]}
                    cellSize={64}
                    radius={170}
                    lineWidth={1}
                    maxOpacity={0.55}
                    holdTime={260}
                    fadeDuration={900}
                />
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-[calc(3.5rem+min(84.1vw,(100svh-8rem)*0.63))] z-[1] flex translate-y-1/2 justify-center px-4 md:bottom-auto md:top-[42%] md:-translate-y-1/2">
                <h1
                    ref={headingRef}
                    className="m-0 whitespace-nowrap text-center font-[family-name:var(--font-hero)] text-[clamp(2rem,8.6vw,9.5rem)] font-normal uppercase leading-[0.86] tracking-[-0.015em] text-[var(--text)]"
                >
                    {NAME_WORDS.map((word, index) => (
                        <span
                            key={word}
                            className={`inline-block overflow-hidden pb-[0.1em] align-bottom ${index < NAME_WORDS.length - 1 ? 'pr-[0.2em]' : ''
                                }`}
                        >
                            <span data-hero-word className="inline-block">
                                {word}
                            </span>
                        </span>
                    ))}
                </h1>
            </div>

            {/* The original asset, uncropped. Height is stated outright rather than
                inherited through percentage parents, which was leaving the figure
                short of its box; `max-w` shrinks it proportionally on narrow
                screens so nothing is ever clipped. */}
            <div ref={portraitWrapRef} className="pointer-events-none absolute inset-x-0 bottom-14 z-10 flex justify-center">
                <div ref={portraitMaskRef} className="overflow-hidden">
                    <div ref={portraitInnerRef}>
                        <Image
                            src="/Profile 2.png"
                            alt=""
                            width={729}
                            height={1058}
                            priority
                            sizes="(max-width: 767px) 92vw, 55vh"
                            className="block h-auto max-h-[calc(100svh-8rem)] w-[92vw] select-none object-contain object-bottom md:h-[calc(100svh-8rem)] md:max-h-none md:w-auto md:max-w-[92vw]"
                        />
                    </div>
                </div>
            </div>

            <div
                ref={marqueeRef}
                className="absolute inset-x-0 bottom-0 z-20 h-14 border-t border-[var(--hairline)] bg-[var(--site-bg)]"
            >
                <div
                    className="flex h-full items-center overflow-hidden"
                    style={{
                        // Items dissolve at the edges instead of being sliced off
                        // by the viewport.
                        WebkitMaskImage:
                            'linear-gradient(to right, transparent, #000 7%, #000 93%, transparent)',
                        maskImage:
                            'linear-gradient(to right, transparent, #000 7%, #000 93%, transparent)',
                    }}
                >
                    <div ref={marqueeTrackRef} className="flex w-max shrink-0 items-center">
                        {MARQUEE_ITEMS.map((role, index) => (
                            <span key={`${role}-${index}`} className="group/role flex shrink-0 items-center">
                                <span
                                    onPointerEnter={() => rampMarquee(marqueeTweenRef.current, 0)}
                                    onPointerLeave={() => rampMarquee(marqueeTweenRef.current, 1)}
                                    className="inline-block origin-center cursor-default px-7 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.28em] text-[var(--faint)] transition-[transform,color,letter-spacing] duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform group-hover/role:scale-[1.16] group-hover/role:tracking-[0.34em] group-hover/role:text-[var(--text)] motion-reduce:transition-none motion-reduce:group-hover/role:scale-100 md:px-10 md:text-[12px]"
                                >
                                    {role}
                                </span>
                                <span
                                    aria-hidden="true"
                                    className="size-[5px] rotate-45 bg-[var(--hairline-strong)] transition-colors duration-500 group-hover/role:bg-[var(--text)] motion-reduce:transition-none"
                                />
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
