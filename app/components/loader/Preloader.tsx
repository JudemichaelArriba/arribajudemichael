'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { Urbanist } from 'next/font/google';
import gsap from 'gsap';

const urbanist = Urbanist({
    subsets: ['latin'],
    weight: ['700'],
    display: 'swap',
});

export default function Preloader({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const overlayRef = useRef<HTMLDivElement>(null);
    const outlineRef = useRef<SVGTextElement>(null);
    const colorRef = useRef<SVGTextElement>(null);

    useLayoutEffect(() => {

        document.body.style.overflow = 'hidden';


        const DASH_LENGTH = 1500;

        const tl = gsap.timeline({
            onComplete: () => {

                document.body.style.overflow = '';
                setLoading(false);
            },
        });

        tl.set(overlayRef.current, { opacity: 1 })
            .set(outlineRef.current, {
                attr: { 'stroke-dasharray': DASH_LENGTH, 'stroke-dashoffset': DASH_LENGTH },
                opacity: 1,
            })
            .set(colorRef.current, { opacity: 0 });

        tl.to(outlineRef.current, {
            attr: { 'stroke-dashoffset': 0 },
            duration: 1.4,
            ease: 'power2.inOut',
        })

            .to(colorRef.current, {
                opacity: 1,
                duration: 0.4,
                ease: 'power2.out',
            }, '-=0.2')

            .to({}, { duration: 0.35 })

            .to(colorRef.current, {
                opacity: 0,
                duration: 0.5,
                ease: 'power2.inOut',
            })

            .to(outlineRef.current, {
                attr: { 'stroke-dashoffset': DASH_LENGTH },
                duration: 1.2,
                ease: 'power2.inOut',
            })


            .to({}, { duration: 0.15 })

            .to(overlayRef.current, {
                opacity: 0,
                duration: 0.7,
                ease: 'power2.out'
            });

        return () => {
            tl.kill();
        };
    }, []);

    return (
        <>
            {loading && (
                <div
                    ref={overlayRef}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-[#141414]"
                >
                    <svg
                        viewBox="0 0 480 110"
                        className="w-[220px] md:w-[300px]"
                        style={{ overflow: 'visible' }}
                    >
                        <defs>
                            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="6" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>


                        <text
                            ref={outlineRef}
                            x="50%"
                            y="50%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="60"
                            fontWeight="700"
                            letterSpacing="2"
                            style={{
                                fontFamily: urbanist.style.fontFamily,
                                fill: 'none',
                                stroke: '#ffffff',
                                strokeWidth: 1.2,
                            }}
                        >
                            JMA
                        </text>


                        <text
                            ref={colorRef}
                            x="50%"
                            y="50%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="60"
                            fontWeight="700"
                            letterSpacing="2"
                            filter="url(#glow)"
                            style={{
                                fontFamily: urbanist.style.fontFamily,
                                fill: '#ffffff',
                                filter: 'drop-shadow(0 0 10px rgba(110, 0, 255, 0.9))',
                            }}
                        >
                            JMA
                        </text>
                    </svg>
                </div>
            )}
            {children}
        </>
    );
}