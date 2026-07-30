'use client';

import { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';

interface RollingTextProps {
    children: string;
    className?: string;
    duration?: number;

    stagger?: number;
}

export default function RollingText({
    children,
    className = '',
    duration = 0.32,
    stagger = 0.012,
}: RollingTextProps) {
    const containerRef = useRef<HTMLSpanElement>(null);
    const ctxRef = useRef<gsap.Context | null>(null);

    const characters = Array.from(children);

    useLayoutEffect(() => {
        ctxRef.current = gsap.context(() => { }, containerRef);
        return () => ctxRef.current?.revert();
    }, []);

    const prefersReducedMotion = () =>
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const animateTo = (yPercent: number) => {
        if (prefersReducedMotion() || !containerRef.current) return;
        const q = gsap.utils.selector(containerRef);
        const targets = q('.char-col');

        gsap.killTweensOf(targets);
        gsap.to(targets, {
            yPercent,
            duration,

            ease: 'power2.inOut',
            stagger: { each: stagger, from: 'start' },
            force3D: true,
            overwrite: 'auto',
        });
    };

    return (
        <span
            ref={containerRef}
            onMouseEnter={() => animateTo(-100)}
            onMouseLeave={() => animateTo(0)}
            className={`relative inline-block overflow-hidden align-middle select-none ${className}`}
            style={{ height: '1em', lineHeight: 1 }}
        >
            <span className="pointer-events-none whitespace-pre opacity-0">{children}</span>

            <span aria-hidden="true" className="absolute left-0 top-0 flex whitespace-pre">
                {characters.map((char, index) => (
                    <span
                        key={index}
                        className="char-col relative inline-block transform-gpu will-change-transform"
                    >
                        <span className="block">{char === ' ' ? '\u00A0' : char}</span>
                        <span className="absolute left-0 top-full block">{char === ' ' ? '\u00A0' : char}</span>
                    </span>
                ))}
            </span>
        </span>
    );
}