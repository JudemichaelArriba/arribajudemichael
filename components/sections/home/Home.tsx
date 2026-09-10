'use client';

import { useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { usePreloaderReady } from '@/components/loader/Preloader';

gsap.registerPlugin(useGSAP);

const NAME_WORDS = ['Jude', 'Michael', 'T.', 'Arriba'];

const ROLES = [
    'Frontend Developer',
    'Fullstack Developer',
    'Backend Engineer',
    'Mobile Developer',
];

// Four passes of the list: the second half is identical to the first, so a
// -50% translation loops seamlessly.
const MARQUEE_ITEMS = [...ROLES, ...ROLES, ...ROLES, ...ROLES];

export default function Home() {
    const sectionRef = useRef<HTMLElement>(null);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const portraitMaskRef = useRef<HTMLDivElement>(null);
    const portraitInnerRef = useRef<HTMLDivElement>(null);
    const marqueeRef = useRef<HTMLDivElement>(null);
    const marqueeTrackRef = useRef<HTMLDivElement>(null);
    const marqueeTweenRef = useRef<gsap.core.Tween | null>(null);
    const isReady = usePreloaderReady();

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
                return;
            }

            // The marquee is never hidden here: if the entrance is skipped for any
            // reason it must still be on screen.
            const setInitialState = () => {
                gsap.set(words, { yPercent: 115 });
                gsap.set(mask, { clipPath: 'inset(100% 0% 0% 0%)' });
                gsap.set(inner, { yPercent: 6 });
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
                .from(marquee, {
                    yPercent: 100,
                    duration: 0.7,
                    ease: 'power3.out',
                }, 0.5);

            return () => {
                timeline.kill();
            };
        },
        { scope: sectionRef, dependencies: [isReady] }
    );

    return (
        <section
            id="home"
            ref={sectionRef}
            className="relative isolate min-h-svh w-full overflow-hidden"
        >
            <div className="pointer-events-none absolute inset-x-0 top-1/2 z-0 flex -translate-y-1/2 justify-center px-4">
                <h1
                    ref={headingRef}
                    className="font-name m-0 whitespace-nowrap text-center text-[clamp(1.75rem,7.4vw,8rem)] font-extrabold leading-[0.9] tracking-[-0.04em] text-[var(--text)]"
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
            <div className="pointer-events-none absolute inset-x-0 bottom-12 z-10 flex justify-center">
                <div ref={portraitMaskRef} className="overflow-hidden">
                    <div ref={portraitInnerRef}>
                        <Image
                            src="/Profile 2.png"
                            alt=""
                            width={896}
                            height={1195}
                            priority
                            sizes="(max-width: 767px) 92vw, 55vh"
                            className="block h-[calc(100svh-7.5rem)] w-auto max-w-[92vw] select-none object-contain"
                        />
                    </div>
                </div>
            </div>

            <div
                ref={marqueeRef}
                className="absolute inset-x-0 bottom-0 z-20 flex h-12 items-center overflow-hidden border-t border-[var(--hairline)] bg-[var(--site-bg)]"
                onPointerEnter={() => marqueeTweenRef.current?.pause()}
                onPointerLeave={() => marqueeTweenRef.current?.resume()}
            >
                <div ref={marqueeTrackRef} className="flex w-max shrink-0 items-center">
                    {MARQUEE_ITEMS.map((role, index) => (
                        <span
                            key={`${role}-${index}`}
                            className="flex shrink-0 items-center font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--faint)] md:text-[13px]"
                        >
                            <span className="inline-block origin-center cursor-default transition-[transform,color] duration-300 ease-out hover:scale-[1.35] hover:text-[var(--text)] motion-reduce:transition-none motion-reduce:hover:scale-100">
                                {role}
                            </span>
                            <span
                                aria-hidden="true"
                                className="mx-6 inline-block size-1 rounded-full bg-[var(--hairline-strong)] md:mx-9"
                            />
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}
