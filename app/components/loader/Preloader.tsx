'use client';

import { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { urbanist } from '@/lib/fonts';
import { buildPreloaderTimeline } from '@/lib/animations/preloader';
import { PreloaderLogo } from './PreloaderLogo';

gsap.registerPlugin(useGSAP);

export default function Preloader({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const overlayRef = useRef<HTMLDivElement>(null);
    const outlineRef = useRef<SVGTextElement>(null);
    const colorRef = useRef<SVGTextElement>(null);

    useGSAP(() => {
        document.body.style.overflow = 'hidden';

        buildPreloaderTimeline(
            { overlay: overlayRef.current, outline: outlineRef.current, color: colorRef.current },
            {
                onComplete: () => {
                    document.body.style.overflow = '';
                    setLoading(false);
                },
            }
        );
    }, []);

    return (
        <>
            {loading && (
                <div
                    ref={overlayRef}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-[#141414]"
                >
                    <PreloaderLogo outlineRef={outlineRef} colorRef={colorRef} fontFamily={urbanist.style.fontFamily} />
                </div>
            )}
            {children}
        </>
    );
}