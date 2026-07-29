'use client';

import type { RefObject } from 'react';
import { PRELOADER_DASH_LENGTH } from '@/lib/animations/preloader';

interface PreloaderLogoProps {
    outlineRef: RefObject<SVGTextElement | null>;
    colorRef: RefObject<SVGTextElement | null>;
    fontFamily: string;
}

export function PreloaderLogo({ outlineRef, colorRef, fontFamily }: PreloaderLogoProps) {
    return (
        <svg viewBox="0 0 520 130" className="w-[280px] md:w-[380px]" style={{ overflow: 'visible' }}>
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
                fontSize="79"
                fontWeight="700"
                letterSpacing="2"
                strokeDasharray={PRELOADER_DASH_LENGTH}
                strokeDashoffset={PRELOADER_DASH_LENGTH}
                className="stroke-text"
                style={{ fontFamily }}
            >
                JM
            </text>

            <text
                ref={colorRef}
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="79"
                fontWeight="700"
                letterSpacing="2"
                filter="url(#glow)"
                opacity="0"
                className="fill-text glow-text"
                style={{ fontFamily }}
            >
                JM
            </text>
        </svg>
    );
}