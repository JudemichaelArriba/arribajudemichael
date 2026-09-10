'use client';

import { createContext, useContext, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { urbanist } from '@/lib/fonts';
import { buildPreloaderTimeline } from '@/lib/animations/preloader';
import { PreloaderLogo } from './PreloaderLogo';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * True once the intro overlay has cleared. Sections that reveal on mount must
 * wait for this, otherwise their entrance plays behind the overlay and is over
 * before the visitor sees the page. Defaults to true so a section rendered
 * outside the preloader still animates.
 */
const PreloaderReadyContext = createContext(true);

export function usePreloaderReady() {
    return useContext(PreloaderReadyContext);
}

export default function Preloader({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const overlayRef = useRef<HTMLDivElement>(null);
    const outlineRef = useRef<SVGTextElement>(null);
    const colorRef = useRef<SVGTextElement>(null);

    useGSAP(() => {
        document.body.style.overflow = 'hidden';

        // Web fonts swap in after the sections have already measured themselves.
        // Without this every ScrollTrigger keeps its pre-swap start position, so
        // reveals below the fold fire early (behind this overlay) and there is
        // nothing left to watch by the time you scroll to them.
        void document.fonts?.ready.then(() => ScrollTrigger.refresh());

        buildPreloaderTimeline(
            { overlay: overlayRef.current, outline: outlineRef.current, color: colorRef.current },
            {
                onComplete: () => {
                    document.body.style.overflow = '';
                    setLoading(false);
                    // Every section's ScrollTrigger measured itself while the body
                    // was scroll-locked behind the overlay, so their start/end
                    // positions are stale. Without this the scroll reveals never fire.
                    requestAnimationFrame(() => ScrollTrigger.refresh());
                },
            }
        );
    }, []);

    return (
        <PreloaderReadyContext.Provider value={!loading}>
            {loading && (
                <div
                    ref={overlayRef}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--site-bg)]"
                >
                    <PreloaderLogo outlineRef={outlineRef} colorRef={colorRef} fontFamily={urbanist.style.fontFamily} />
                </div>
            )}
            {children}
        </PreloaderReadyContext.Provider>
    );
}
