'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { useTheme } from '@/components/theme/ThemeProvider';
import { TECH_CATEGORIES } from '@/lib/techStack';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { labelForKey, readoutGlyph, shouldMirrorKey, toolLetter, toolsForKey, TOOL_NAMES } from './keyboard/layout';
import type { KeyboardHandle, KeyboardView } from './keyboard/KeyboardCanvas';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// three.js + R3F load only when the section approaches the viewport.
const KeyboardCanvas = dynamic(() => import('./keyboard/KeyboardCanvas'), { ssr: false, loading: () => null });

const DESKTOP_QUERY = '(min-width: 1024px)';
/** Camera framing: where the scroll dolly starts and where it settles. */
// Scroll animation page: the camera dollies in from far away and settles on the Keyboard page framing.
const DESKTOP_VIEW = { from: { dist: 32, offX: 0.5, offY: 0.42 }, to: { dist: 17, offX: 0.5, offY: 0.18 } };
const PHONE_VIEW = { from: { dist: 15, offX: 0, offY: 0.2 }, to: { dist: 8.6, offX: 0, offY: 0.03 } };
/** One key per tool, in display order, pressed silently as the section scrolls. */
const SCROLL_KEYS = TOOL_NAMES.map(toolLetter);

function lerpView(from: KeyboardView, to: KeyboardView, t: number): KeyboardView {
    return {
        dist: from.dist + (to.dist - from.dist) * t,
        offX: from.offX + (to.offX - from.offX) * t,
        offY: from.offY + (to.offY - from.offY) * t,
    };
}

interface Readout {
    glyph: string;
    tools: readonly string[] | null;
}

export default function TechStack() {
    const sectionRef = useRef<HTMLElement>(null);
    const letterRef = useRef<HTMLDivElement>(null);
    const keyboardRef = useRef<KeyboardHandle | null>(null);
    const inViewRef = useRef(false);
    const { theme } = useTheme();
    const isDesktop = useMediaQuery(DESKTOP_QUERY);
    const [keyboardAllowed, setKeyboardAllowed] = useState(false);
    const [boardReady, setBoardReady] = useState(false);
    const handleReady = useCallback(() => setBoardReady(true), []);
    // No WebGL (or a renderer failure): the board is dropped and the tools work on their own.
    const [boardUnavailable, setBoardUnavailable] = useState(false);
    const handleUnavailable = useCallback(() => setBoardUnavailable(true), []);
    const [readout, setReadout] = useState<Readout>({ glyph: 'N', tools: null });

    const viewRef = useRef<KeyboardView>(DESKTOP_VIEW.to);
    const getInitialView = useCallback(() => viewRef.current, []);

    const handlePress = useCallback((label: string) => {
        const tools = toolsForKey(label);
        setReadout({ glyph: readoutGlyph(label), tools });
        const letter = letterRef.current;
        if (letter && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            gsap.fromTo(letter, { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.38, ease: 'expo.out', overwrite: true });
        }
    }, []);

    // Track visibility for physical-key mirroring.
    useEffect(() => {
        const section = sectionRef.current;
        if (!section) return;
        const visible = new IntersectionObserver(([entry]) => {
            inViewRef.current = entry.isIntersecting;
        }, { threshold: 0.35 });
        visible.observe(section);
        return () => {
            visible.disconnect();
        };
    }, []);

    // The 3D board is the heaviest thing on the page, so it is built while the preloader covers
    // the screen: by the time anyone scrolls here it is ready and scrolling never waits on it.
    useEffect(() => {
        if (keyboardAllowed) return;
        const idle = window as Window & { requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
        if (idle.requestIdleCallback) {
            const id = idle.requestIdleCallback(() => setKeyboardAllowed(true), { timeout: 400 });
            return () => idle.cancelIdleCallback?.(id);
        }
        const id = window.setTimeout(() => setKeyboardAllowed(true), 100);
        return () => window.clearTimeout(id);
    }, [keyboardAllowed]);

    // Typing mirrors onto the board only while the section is on screen. Never blocks the key,
    // never reads fields or dialogs, and nothing typed is stored or sent anywhere.
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (!inViewRef.current || !shouldMirrorKey(event)) return;
            const label = labelForKey(event.key);
            if (label) keyboardRef.current?.press(label, { rightSide: /Right$/.test(event.code) });
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    useGSAP(
        () => {
            const section = sectionRef.current;
            if (!section) return;
            const mm = gsap.matchMedia();

            mm.add(
                {
                    // `any` always matches: matchMedia only runs the callback when at least one condition does.
                    any: 'all',
                    desktop: `${DESKTOP_QUERY} and (min-height: 560px)`,
                    reduce: '(prefers-reduced-motion: reduce)',
                },
                (context) => {
                    const { desktop, reduce } = context.conditions as { desktop: boolean; reduce: boolean };
                    const frame = desktop ? DESKTOP_VIEW : window.matchMedia(DESKTOP_QUERY).matches ? DESKTOP_VIEW : PHONE_VIEW;

                    if (reduce) {
                        viewRef.current = frame.to;
                        keyboardRef.current?.setView(frame.to);
                        return;
                    }

                    const proxy = { p: 0 };
                    let lastKey = -1;
                    const applyProgress = () => {
                        const dolly = 1 - (1 - Math.min(1, proxy.p / 0.35)) ** 3;
                        viewRef.current = lerpView(frame.from, frame.to, dolly);
                        keyboardRef.current?.setView(viewRef.current);
                        const next = proxy.p < 0.4 ? -1 : Math.min(SCROLL_KEYS.length - 1, Math.floor(((proxy.p - 0.4) / 0.58) * SCROLL_KEYS.length));
                        if (next !== lastKey) {
                            lastKey = next;
                            if (next >= 0) keyboardRef.current?.press(SCROLL_KEYS[next], { silent: true });
                        }
                    };
                    const cameraTween = { p: 1, duration: 1, onUpdate: applyProgress };

                    if (desktop) {
                        // One pinned timeline: copy rises, the camera dollies in, keys press tool by tool.
                        gsap.timeline({
                            defaults: { ease: 'none' },
                            // At least 1100px of scroll so short screens don't rush through the presses.
                            scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${Math.max(window.innerHeight * 1.4, 1100)}`, pin: true, scrub: 0.6, invalidateOnRefresh: true },
                        })
                            .fromTo('[data-tech-rule]', { scaleX: 0 }, { scaleX: 1, transformOrigin: 'left center', duration: 0.15 }, 0)
                            .fromTo('[data-tech-line]', { yPercent: 110 }, { yPercent: 0, ease: 'power3.out', duration: 0.2, stagger: 0.06 }, 0.04)
                            .fromTo('[data-tech-lead]', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.15 }, 0.14)
                            .fromTo('[data-tech-group]', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.12, stagger: 0.04 }, 0.2)
                            .fromTo(proxy, { p: 0 }, cameraTween, 0);
                    } else {
                        // Phones / short screens: the copy finishes as soon as the heading is on screen,
                        // the board animates while it passes, and each tool group rises on its own.
                        gsap.timeline({
                            defaults: { ease: 'none' },
                            scrollTrigger: { trigger: section, start: 'top 85%', end: 'top 35%', scrub: 0.6, invalidateOnRefresh: true },
                        })
                            .fromTo('[data-tech-rule]', { scaleX: 0 }, { scaleX: 1, transformOrigin: 'left center', duration: 0.3 }, 0)
                            .fromTo('[data-tech-line]', { yPercent: 110 }, { yPercent: 0, ease: 'power3.out', duration: 0.5, stagger: 0.12 }, 0.1)
                            .fromTo('[data-tech-lead]', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.4);
                        const stage = section.querySelector('[data-tech-stage]');
                        gsap.timeline({
                            defaults: { ease: 'none' },
                            scrollTrigger: { trigger: stage ?? section, start: 'top 90%', end: 'bottom 20%', scrub: 0.6, invalidateOnRefresh: true },
                        }).fromTo(proxy, { p: 0 }, cameraTween, 0);
                        gsap.utils.toArray<HTMLElement>('[data-tech-group]', section).forEach((group) => {
                            gsap.fromTo(group, { autoAlpha: 0, y: 20 }, {
                                autoAlpha: 1,
                                y: 0,
                                ease: 'none',
                                scrollTrigger: { trigger: group, start: 'top 92%', end: 'top 70%', scrub: 0.6, invalidateOnRefresh: true },
                            });
                        });
                    }
                    applyProgress();
                },
                section,
            );

            return () => mm.revert();
        },
        // gsap.matchMedia rebuilds on breakpoint changes itself; no React dependency (that would stack triggers).
        { scope: sectionRef },
    );

    const litTools = new Set(readout.tools ?? []);

    return (
        <section
            ref={sectionRef}
            id="techstack"
            data-analytics-section="techstack"
            aria-labelledby="techstack-heading"
            className="relative w-full overflow-hidden bg-[var(--site-bg)] pb-10 pt-24 lg:flex lg:min-h-svh lg:flex-col lg:pb-12 short:pb-6 short:pt-[4.5rem]"
        >
            <div className="relative z-[2] mx-auto flex w-full max-w-7xl items-center gap-4 px-5 md:px-8 pointer-events-none">
                <p className="shrink-0 font-display text-xs font-bold uppercase leading-none tracking-[0.14em] text-[var(--text)]">
                    Tech Stack
                </p>
                <span data-tech-rule aria-hidden="true" className="h-px min-w-8 flex-1 bg-[var(--hairline)]" />
                <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)] sm:inline">
                    05 / Toolkit
                </span>
            </div>

            <div className="mx-auto mt-8 w-full max-w-7xl px-5 md:px-8 lg:mt-12 short:mt-5">
                <div className="lg:w-[min(44rem,52%)]">
                    <h2
                        id="techstack-heading"
                        className="relative z-[3] m-0 font-display text-[2.9rem] font-extrabold leading-[0.95] tracking-[-0.035em] text-[var(--text)] lg:text-[clamp(3.6rem,5.6vw,5.1rem)] short:text-[clamp(2.4rem,7.5svh,3.6rem)]"
                    >
                        <span className="block overflow-hidden pb-[0.06em]">
                            <span data-tech-line className="block">The tools</span>
                        </span>
                        <span className="block overflow-hidden pb-[0.06em]">
                            <span data-tech-line className="block">
                                I type with.
                            </span>
                        </span>
                    </h2>
                    <p data-tech-lead className="relative z-[3] mt-4 max-w-[40ch] text-sm leading-relaxed text-[var(--muted)] lg:mt-6 lg:text-[0.95rem] short:hidden">
                        <span className="lg:hidden">Tap a tool to find it on the keyboard, or tap a dotted key.</span>
                        <span className="hidden lg:inline">
                            Every project on this site started on a keyboard. Tap a dotted key, or type on yours, to find the tools behind the work.
                        </span>
                    </p>

                    {/* Phones: the board sits between the intro and the tools. Desktop: it fills the section behind them. */}
                    <div data-tech-stage className={`relative z-[1] -mx-5 mt-1 h-[330px] transition-opacity duration-700 ease-out motion-reduce:transition-none md:-mx-8 lg:absolute lg:inset-0 lg:m-0 lg:h-auto ${boardReady ? 'opacity-100' : 'opacity-0'} ${boardUnavailable ? 'max-lg:hidden' : ''}`}>
                        {keyboardAllowed ? (
                            <KeyboardCanvas
                                key={isDesktop ? 'desktop' : 'phone'}
                                theme={theme}
                                mobile={!isDesktop}
                                getInitialView={getInitialView}
                                yaw={isDesktop ? 0.32 : 0.18}
                                pitch={0}
                                handleRef={keyboardRef}
                                onPress={handlePress}
                                onReady={handleReady}
                                onUnavailable={handleUnavailable}
                            />
                        ) : null}
                        <p className="sr-only">
                            Interactive 3D keyboard. Each tool below has a button that presses its first letter on the keyboard.
                        </p>
                    </div>

                    <div
                        className="relative z-[3] flex items-center gap-3.5 pb-[18px] pt-1.5 pointer-events-none lg:absolute lg:right-[max(2rem,calc((100%-80rem)/2+2rem))] lg:top-[9.5rem] lg:flex-col lg:items-end lg:gap-4 lg:p-0 short:top-[6.5rem]"
                        aria-live="polite"
                    >
                        <div
                            ref={letterRef}
                            aria-hidden="true"
                            className={`min-w-11 whitespace-nowrap font-display font-extrabold leading-[0.9] tracking-[-0.035em] text-[var(--text)] ${readout.glyph.length > 3
                                ? 'text-[2.5rem] lg:text-[5.5rem] short:text-[min(5.5rem,11svh)]'
                                : 'text-[3.5rem] lg:text-[9.4rem] short:text-[min(9.4rem,18svh)]'} ${readout.tools === null ? 'opacity-[0.18]' : ''}`}
                        >
                            {readout.glyph}
                        </div>
                        <div className="flex items-center gap-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text)] lg:text-xs">
                            <span aria-hidden="true" className="h-px w-[18px] bg-[var(--text)] lg:order-none" />
                            <span className={readout.tools && readout.tools.length === 0 ? 'opacity-60' : ''}>
                                {readout.tools === null
                                    ? 'Press a key'
                                    : readout.tools.length
                                        ? readout.tools.join('  ·  ')
                                        : 'No tool on this key, try the dotted ones'}
                            </span>
                        </div>
                    </div>

                    <div className="relative z-[3] mt-2 lg:mt-7 short:mt-4">
                        {TECH_CATEGORIES.map((category, categoryIndex) => (
                            <div key={category.name} data-tech-group className="border-t border-[var(--hairline)] pb-4 pt-3.5 lg:pb-[1.125rem] lg:pt-4 short:pb-2.5 short:pt-2">
                                <h3 className="mb-2.5 short:mb-1.5 flex items-baseline gap-3.5 font-mono text-[10px] font-normal uppercase tracking-[0.12em] text-[var(--text)] lg:text-xs">
                                    <span className="text-[var(--faint)]">{String(categoryIndex + 1).padStart(2, '0')}</span>
                                    <span>{category.name}</span>
                                    <span className="ml-auto text-[var(--faint)]">{category.technologies.length}</span>
                                </h3>
                                <ul className="flex flex-wrap gap-2">
                                    {category.technologies.map((technology) => {
                                        const lit = litTools.has(technology.name);
                                        return (
                                            <li key={technology.name}>
                                                <button
                                                    type="button"
                                                    aria-pressed={lit}
                                                    onClick={() => {
                                                        const letter = toolLetter(technology.name);
                                                        if (keyboardRef.current && !boardUnavailable) keyboardRef.current.focusPress(letter);
                                                        else handlePress(letter);
                                                    }}
                                                    className={`border px-3 py-3 text-[13px] leading-none transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--site-bg)] motion-reduce:transition-none lg:px-3.5 lg:py-2.5 lg:text-[15px] short:px-3 short:py-[7px] short:text-sm ${lit
                                                        ? 'border-[var(--inverse-bg)] bg-[var(--inverse-bg)] text-[var(--inverse-text)]'
                                                        : 'border-[var(--hairline-strong)] text-[var(--muted)] hover:border-[var(--text)] hover:text-[var(--text)]'}`}
                                                >
                                                    <span className={`font-semibold transition-colors duration-200 motion-reduce:transition-none ${lit ? 'text-[var(--inverse-text)]' : 'text-[var(--text)]'}`}>
                                                        {technology.name.charAt(0)}
                                                    </span>
                                                    {technology.name.slice(1)}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <p className="pointer-events-none relative z-[3] mx-auto mt-6 hidden w-full max-w-7xl items-center gap-3 px-5 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--faint)] md:px-8 lg:mt-auto lg:flex short:hidden">
                <span aria-hidden="true" className="h-px w-[22px] bg-[var(--faint)]" />
                Drag to tilt · tap or type
            </p>
        </section>
    );
}
