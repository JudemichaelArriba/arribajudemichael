'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export function useRoleCycle(roles: string[], interval = 2800) {
    const [index, setIndex] = useState(0);
    const textRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const id = setInterval(() => {
            if (!textRef.current) return;
            gsap.to(textRef.current, {
                yPercent: -100,
                opacity: 0,
                duration: 0.4,
                ease: 'power2.in',
                onComplete: () => {
                    setIndex((prev) => (prev + 1) % roles.length);
                    gsap.fromTo(
                        textRef.current,
                        { yPercent: 100, opacity: 0 },
                        { yPercent: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
                    );
                },
            });
        }, interval);

        return () => clearInterval(id);
    }, [roles.length, interval]);

    return { textRef, current: roles[index] };
}