'use client';

import { createContext, useContext, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { urbanist } from '@/lib/fonts';
import { buildPreloaderTimeline } from '@/lib/animations/preloader';
import { whenPreloaderReleased } from '@/lib/animations/preloaderHold';
import { PreloaderLogo } from './PreloaderLogo';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * True from the moment the curtain starts lifting. Sections that reveal on
 * mount must wait for this, otherwise their entrance plays behind the overlay
 * and is over before the visitor sees the page. Defaults to true so a section
 * rendered outside the preloader still animates.
 */
const PreloaderReadyContext = createContext(true);

export function usePreloaderReady() {
    return useContext(PreloaderReadyContext);
}

/**
 * `intro` while the logo draws, `loading` while it holds for heavy pieces (they may start loading
 * now, nothing else animates on the main thread), `done` once the reveal starts. Defaults to `done`.
 */
export type PreloaderPhase = 'intro' | 'loading' | 'done';
const PreloaderPhaseContext = createContext<PreloaderPhase>('done');

export function usePreloaderPhase() {
    return useContext(PreloaderPhaseContext);
}

export default function Preloader({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [ready, setReady] = useState(false);
    const [phase, setPhase] = useState<PreloaderPhase>('intro');
    const overlayRef = useRef<HTMLDivElement>(null);
    const logoRef = useRef<HTMLDivElement>(null);
    const outlineRef = useRef<SVGTextElement>(null);
    const colorRef = useRef<SVGTextElement>(null);

    useGSAP(() => {
        document.body.style.overflow = 'hidden';

        // Web fonts swap in after the sections have already measured themselves.
        // Without this every ScrollTrigger keeps its pre-swap start position, so
        // reveals below the fold fire early (behind this overlay) and there is
        // nothing left to watch by the time you scroll to them.
        void document.fonts?.ready.then(() => ScrollTrigger.refresh());

        let cancelWait = () => {};
        let settle: gsap.core.Tween | null = null;
        const timeline = buildPreloaderTimeline(
            {
                overlay: overlayRef.current,
                outline: outlineRef.current,
                color: colorRef.current,
            },
            {
                onHold: (resume) => {
                    const logo = logoRef.current;
                    // While held, the logo breathes with a CSS opacity animation: it runs on the
                    // compositor, so it stays smooth while the keyboard builds on the main thread.
                    logo?.setAttribute('data-holding', '');
                    setPhase('loading');
                    cancelWait = whenPreloaderReleased(() => {
                        const current = logo ? Number(getComputedStyle(logo).opacity) : 1;
                        logo?.removeAttribute('data-holding');
                        const reveal = () => {
                            // Measure the page with its scrollbar back before the curtain lifts,
                            // so nothing re-measures (and stalls) during the reveal.
                            document.body.style.overflow = '';
                            ScrollTrigger.refresh();
                            resume();
                        };
                        if (!logo || current > 0.99) {
                            reveal();
                            return;
                        }
                        settle = gsap.fromTo(logo, { opacity: current }, { opacity: 1, duration: 0.25, ease: 'power1.out', clearProps: 'opacity', onComplete: reveal });
                    });
                },
                onReveal: () => {
                    setReady(true);
                    setPhase('done');
                },
                onComplete: () => {
                    document.body.style.overflow = '';
                    setLoading(false);
                },
            }
        );

        // Hydration and the first section setups run right after mount: draw the logo once the
        // main thread is free, so the stroke animation never stutters.
        timeline.pause();
        const start = () => timeline.play();
        let cancelStart: () => void;
        if (typeof window.requestIdleCallback === 'function') {
            const idleId = window.requestIdleCallback(start, { timeout: 700 });
            cancelStart = () => window.cancelIdleCallback(idleId);
        } else {
            const timeoutId = window.setTimeout(start, 120);
            cancelStart = () => window.clearTimeout(timeoutId);
        }

        return () => {
            cancelStart();
            cancelWait();
            settle?.kill();
            timeline.kill();
        };
    }, []);

    return (
        <PreloaderReadyContext.Provider value={ready}>
            <PreloaderPhaseContext.Provider value={phase}>
            {loading && (
                <div
                    ref={overlayRef}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--site-bg)]"
                >
                    <div
                        ref={logoRef}
                        className="will-change-[opacity] data-[holding]:animate-preloader-breathe motion-reduce:data-[holding]:animate-none"
                    >
                        <PreloaderLogo
                            outlineRef={outlineRef}
                            colorRef={colorRef}
                            fontFamily={urbanist.style.fontFamily}
                        />
                    </div>
                </div>
            )}
            {children}
            </PreloaderPhaseContext.Provider>
        </PreloaderReadyContext.Provider>
    );
}
