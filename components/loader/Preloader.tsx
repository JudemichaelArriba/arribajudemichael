'use client';

import { createContext, useContext, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { urbanist } from '@/lib/fonts';
import { buildPreloaderReveal, drawPreloaderProgress } from '@/lib/animations/preloader';
import { holdPreloader, preloaderProgress, subscribePreloaderProgress } from '@/lib/animations/preloaderHold';
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
 * `intro` while the page hydrates, `loading` once heavy pieces may start loading (the logo is
 * drawn by their progress), `done` once the reveal starts. Defaults to `done`.
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
    const outlineRef = useRef<SVGTextElement>(null);
    const colorRef = useRef<SVGTextElement>(null);

    useGSAP(() => {
        document.body.style.overflow = 'hidden';
        let revealed = false;

        // The page itself is one piece of the progress: hydrated now, finished once the web
        // fonts are in. Fonts arriving after the reveal still re-measure every ScrollTrigger,
        // otherwise reveals below the fold keep their pre-swap start positions.
        const page = holdPreloader(1);
        page.progress(0.4);
        void (document.fonts?.ready ?? Promise.resolve()).then(() => {
            page.release();
            if (revealed) ScrollTrigger.refresh();
        });

        // The JM outline is drawn by the real loading progress (never backwards); when it is
        // complete the letters fill in and the curtain lifts.
        let drawn = 0;
        let draw: gsap.core.Tween | null = null;
        let reveal: gsap.core.Timeline | null = null;
        const finish = () => {
            if (revealed) return;
            revealed = true;
            // Measure the page with its scrollbar back before the curtain lifts, so nothing
            // re-measures (and stalls) during the reveal.
            document.body.style.overflow = '';
            ScrollTrigger.refresh();
            reveal = buildPreloaderReveal(
                { overlay: overlayRef.current, outline: outlineRef.current, color: colorRef.current },
                {
                    onReveal: () => {
                        setReady(true);
                        setPhase('done');
                    },
                    onComplete: () => {
                        document.body.style.overflow = '';
                        setLoading(false);
                    },
                },
            );
        };
        const update = () => {
            if (revealed) return;
            const progress = preloaderProgress();
            if (progress <= drawn) return;
            drawn = progress;
            draw = drawPreloaderProgress(outlineRef.current, progress, progress >= 1 ? finish : undefined);
        };
        const unsubscribe = subscribePreloaderProgress(update);
        update();

        // Heavy pieces (the keyboard) start once hydration and the first section setups are done.
        const start = () => setPhase('loading');
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
            unsubscribe();
            page.release();
            draw?.kill();
            reveal?.kill();
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
                        <PreloaderLogo
                            outlineRef={outlineRef}
                            colorRef={colorRef}
                            fontFamily={urbanist.style.fontFamily}
                        />
                    </div>
                )}
                {children}
            </PreloaderPhaseContext.Provider>
        </PreloaderReadyContext.Provider>
    );
}
