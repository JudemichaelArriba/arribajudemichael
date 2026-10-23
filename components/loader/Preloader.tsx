'use client';

import { createContext, useContext, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { createPreloaderWorker, liftPreloaderCurtain, startPreloaderCanvas } from '@/lib/animations/preloader';
import { holdPreloader, preloaderProgress, setPreloading } from '@/lib/animations/preloaderHold';
import { rememberScrollPosition, takeSavedScrollPosition } from '@/lib/animations/scrollRestore';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Started while the page's scripts load, before hydration: see `createPreloaderWorker`. Only the
// first preloader takes it; a later mount (or React's dev double-mount) starts its own.
let earlyWorker = createPreloaderWorker();
function takePreloaderWorker() {
    const worker = earlyWorker ?? createPreloaderWorker();
    earlyWorker = null;
    return worker;
}

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
    const stageRef = useRef<HTMLDivElement>(null);
    const meterRef = useRef<HTMLParagraphElement>(null);

    useGSAP(() => {
        document.body.style.overflow = 'hidden';
        setPreloading(true);
        let revealed = false;
        const forgetScrollPosition = rememberScrollPosition();
        const savedScroll = takeSavedScrollPosition();

        // The page itself is one piece of the progress: hydrated now, finished once the web
        // fonts are in. Fonts arriving after the reveal still re-measure every ScrollTrigger,
        // otherwise reveals below the fold keep their pre-swap start positions.
        const page = holdPreloader(1);
        page.progress(0.4);
        void (document.fonts?.ready ?? Promise.resolve()).then(() => {
            page.release();
            if (revealed) ScrollTrigger.refresh();
        });

        // The JM outline and the counter under it are drawn together, off the main thread, gliding
        // toward the real loading progress (never backwards). At 100% the letters fill and clear
        // while the page is measured, then the curtain lifts.
        let cancelLift: () => void = () => undefined;
        const finish = () => {
            if (revealed) return;
            revealed = true;
            // Measure the page with its scrollbar back before the curtain lifts, so nothing
            // re-measures (and stalls) during the reveal. Sections skipped their own refreshes
            // while the preloader was up; this one covers them all.
            setPreloading(false);
            document.body.style.overflow = '';
            ScrollTrigger.refresh();
            // A reload part-way down: return to where the visitor was, now that every pin is
            // measured (the browser's own restore ran too early and landed too high).
            if (savedScroll !== null) {
                window.scrollTo({ top: Math.min(savedScroll, ScrollTrigger.maxScroll(window)), behavior: 'instant' });
                ScrollTrigger.update();
            }
        };
        const overlay = overlayRef.current;
        const palette = overlay ? getComputedStyle(overlay) : null;
        const stopCanvas = stageRef.current
            ? startPreloaderCanvas({
                  stage: stageRef.current,
                  palette: {
                      text: palette?.getPropertyValue('--text').trim() || '#141414',
                      muted: palette?.getPropertyValue('--muted').trim() || '#565656',
                  },
                  target: preloaderProgress,
                  worker: takePreloaderWorker(),
                  events: {
                      percent: (value) => meterRef.current?.setAttribute('aria-valuenow', String(value)),
                      complete: finish,
                      revealed: () => {
                          setReady(true);
                          setPhase('done');
                          cancelLift = liftPreloaderCurtain(overlayRef.current, () => {
                              document.body.style.overflow = '';
                              setLoading(false);
                          });
                      },
                  },
              })
            : () => undefined;

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
            forgetScrollPosition();
            cancelStart();
            stopCanvas();
            cancelLift();
            setPreloading(false);
            page.release();
        };
    }, []);

    return (
        <PreloaderReadyContext.Provider value={ready}>
            <PreloaderPhaseContext.Provider value={phase}>
                {loading && (
                    // Full window width (100vw), not `inset-0`: while scrolling is locked the html keeps
                    // the scrollbar's gutter reserved, and `inset-0` would stop at it, putting the JM
                    // half a scrollbar left of the window's centre.
                    <div
                        ref={overlayRef}
                        className="fixed inset-y-0 left-0 z-[100] flex w-screen items-center justify-center bg-[var(--site-bg)]"
                    >
                        {/* The JM and the percentage under it, drawn on a canvas (see startPreloaderCanvas).
                            Blank until the outline starts, so there is never a lone "0%". */}
                        <div ref={stageRef} aria-hidden="true" className="aspect-[520/160] w-[280px] md:w-[380px]" />
                        <p
                            ref={meterRef}
                            role="progressbar"
                            aria-label="Loading the page"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={0}
                            className="sr-only"
                        />
                    </div>
                )}
                {children}
            </PreloaderPhaseContext.Provider>
        </PreloaderReadyContext.Provider>
    );
}
