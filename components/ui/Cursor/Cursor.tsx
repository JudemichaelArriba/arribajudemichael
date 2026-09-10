'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const INTERACTIVE_SELECTOR = 'a, button, input, textarea, select, summary, [role="button"]';

/**
 * Ink-dot cursor: a solid dot that tracks the pointer exactly and a ring that
 * trails behind it. Both are painted in `--text`, so the cursor is black on the
 * light theme and white on the dark one without any JS reading the theme.
 *
 * Pointer devices only — hidden entirely for touch, coarse pointers and anyone
 * asking for reduced motion.
 */
export default function Cursor() {
    const dotRef = useRef<HTMLDivElement>(null);
    const ringRef = useRef<HTMLDivElement>(null);
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        const query = window.matchMedia(
            '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'
        );
        const sync = () => setEnabled(query.matches);

        sync();
        query.addEventListener('change', sync);
        return () => query.removeEventListener('change', sync);
    }, []);

    useEffect(() => {
        const dot = dotRef.current;
        const ring = ringRef.current;
        if (!enabled || !dot || !ring) return;

        const dotX = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power3.out' });
        const dotY = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power3.out' });
        const ringX = gsap.quickTo(ring, 'x', { duration: 0.42, ease: 'power3.out' });
        const ringY = gsap.quickTo(ring, 'y', { duration: 0.42, ease: 'power3.out' });

        let visible = false;

        const handleMove = (event: PointerEvent) => {
            if (!visible) {
                visible = true;
                gsap.to([dot, ring], { autoAlpha: 1, duration: 0.25, overwrite: 'auto' });
            }

            dotX(event.clientX);
            dotY(event.clientY);
            ringX(event.clientX);
            ringY(event.clientY);

            const overInteractive = Boolean(
                (event.target as Element | null)?.closest?.(INTERACTIVE_SELECTOR)
            );
            gsap.to(ring, {
                scale: overInteractive ? 1.9 : 1,
                opacity: overInteractive ? 0.45 : 1,
                duration: 0.32,
                ease: 'power3.out',
                overwrite: 'auto',
            });
        };

        const handleLeave = () => {
            visible = false;
            gsap.to([dot, ring], { autoAlpha: 0, duration: 0.2, overwrite: 'auto' });
        };

        const handleDown = () => gsap.to(ring, { scale: 0.7, duration: 0.18, overwrite: 'auto' });
        const handleUp = () => gsap.to(ring, { scale: 1, duration: 0.28, overwrite: 'auto' });

        window.addEventListener('pointermove', handleMove, { passive: true });
        window.addEventListener('pointerdown', handleDown);
        window.addEventListener('pointerup', handleUp);
        document.documentElement.addEventListener('pointerleave', handleLeave);

        return () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerdown', handleDown);
            window.removeEventListener('pointerup', handleUp);
            document.documentElement.removeEventListener('pointerleave', handleLeave);
            gsap.killTweensOf([dot, ring]);
        };
    }, [enabled]);

    if (!enabled) return null;

    return (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[120]">
            <div
                ref={ringRef}
                className="invisible absolute -left-5 -top-5 size-10 rounded-full border border-[var(--text)] opacity-0 will-change-transform"
            />
            <div
                ref={dotRef}
                className="invisible absolute -left-[3px] -top-[3px] size-1.5 rounded-full bg-[var(--text)] opacity-0 will-change-transform"
            />
        </div>
    );
}
