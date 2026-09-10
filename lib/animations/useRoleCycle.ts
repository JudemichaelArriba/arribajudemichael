'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export function useRoleCycle(roles: string[], interval = 2800) {
    const [index, setIndex] = useState(0);
    const textRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (roles.length <= 1) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const id = window.setInterval(() => {
            const node = textRef.current;

            if (!node || prefersReducedMotion) {
                setIndex((prev) => (prev + 1) % roles.length);
                return;
            }

            gsap.to(node, {
                yPercent: -110,
                opacity: 0,
                duration: 0.36,
                ease: 'power2.in',
                onComplete: () => {
                    setIndex((prev) => (prev + 1) % roles.length);
                    gsap.fromTo(
                        node,
                        { yPercent: 110, opacity: 0 },
                        { yPercent: 0, opacity: 1, duration: 0.42, ease: 'power2.out' }
                    );
                },
            });
        }, interval);

        const node = textRef.current;

        return () => {
            window.clearInterval(id);
            if (node) gsap.killTweensOf(node);
        };
    }, [roles.length, interval]);

    return { textRef, current: roles[index] };
}
