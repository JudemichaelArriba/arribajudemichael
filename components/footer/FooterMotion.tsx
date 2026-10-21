'use client';

import { useRef, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { primeStagger } from '@/lib/animations/primeStagger';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Lets the server-rendered footer rows settle in one after another as the page ends. */
export default function FooterMotion({ className, children }: { className?: string; children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            const root = ref.current;
            if (!root) return;
            const mm = gsap.matchMedia();
            mm.add('(prefers-reduced-motion: no-preference)', () => {
                const items = Array.from(root.children);
                gsap.fromTo(
                    items,
                    primeStagger(items, { autoAlpha: 0, y: 30 }),
                    {
                        autoAlpha: 1,
                        y: 0,
                        ease: 'power2.out',
                        stagger: 0.12,
                        scrollTrigger: { trigger: root, start: 'top 95%', end: 'top 45%', scrub: 0.6, invalidateOnRefresh: true },
                    },
                );
            });
            return () => mm.revert();
        },
        { scope: ref },
    );

    return (
        <div ref={ref} className={className}>
            {children}
        </div>
    );
}
