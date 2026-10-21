'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import gsap from 'gsap';
import type { Theme } from '@/lib/theme';

/** Background each theme resolves to, used to paint the droplets. */
const THEME_BACKGROUND: Record<Theme, string> = {
    light: '#f7f7f6',
    dark: '#0b0b0b',
};

export interface ThemeTransitionHandle {
    /**
     * Runs the ink wipe and calls `apply` at the moment the droplets have the
     * screen covered.
     */
    run: (next: Theme, origin: { x: number; y: number }, apply: () => void) => void;
}

interface Droplet {
    /** Offsets from the click point, as a fraction of the spread radius. */
    dx: number;
    dy: number;
    delay: number;
}

const DROPLETS: Droplet[] = [
    { dx: -0.55, dy: 0.28, delay: 0 },
    { dx: 0.5, dy: -0.42, delay: 0.08 },
    { dx: 0.08, dy: 0.62, delay: 0.16 },
];

/**
 * The overlay is always mounted — rendering it only while active meant the
 * circle refs did not exist yet on the first click, so the very transition it
 * exists for was skipped. Visibility is driven straight through GSAP instead of
 * React state to keep it out of the render path entirely.
 */
const ThemeTransition = forwardRef<ThemeTransitionHandle>(function ThemeTransition(_props, ref) {
    const rootRef = useRef<SVGSVGElement>(null);
    const groupRef = useRef<SVGGElement>(null);
    const poolRef = useRef<SVGCircleElement>(null);
    const circleRefs = useRef<Array<SVGCircleElement | null>>([]);
    const timelineRef = useRef<gsap.core.Timeline | null>(null);

    useImperativeHandle(ref, () => ({
        run: (next, origin, apply) => {
            const root = rootRef.current;
            const group = groupRef.current;
            const pool = poolRef.current;
            const circles = circleRefs.current.filter(
                (circle): circle is SVGCircleElement => circle !== null
            );

            if (!root || !group || !pool || circles.length !== DROPLETS.length) {
                apply();
                return;
            }

            timelineRef.current?.kill();
            group.setAttribute('fill', THEME_BACKGROUND[next]);
            pool.setAttribute('fill', THEME_BACKGROUND[next]);
            gsap.set(pool, { attr: { cx: origin.x, cy: origin.y, r: 0 } });
            gsap.set(root, { autoAlpha: 1 });

            // Far enough to cover the whole viewport from wherever it was clicked.
            const maxRadius = Math.hypot(
                Math.max(origin.x, window.innerWidth - origin.x),
                Math.max(origin.y, window.innerHeight - origin.y)
            );
            const spread = Math.min(window.innerWidth, window.innerHeight) * 0.22;

            const timeline = gsap.timeline({
                onComplete: () => {
                    gsap.set(root, { autoAlpha: 0 });
                    timelineRef.current = null;
                },
            });
            timelineRef.current = timeline;

            circles.forEach((circle, index) => {
                const droplet = DROPLETS[index];

                gsap.set(circle, {
                    attr: {
                        cx: origin.x + droplet.dx * spread,
                        cy: origin.y + droplet.dy * spread,
                        r: 0,
                    },
                });

                // Each droplet lands and swells where it fell...
                timeline.to(circle, {
                    attr: { r: spread * 0.5 },
                    duration: 0.36,
                    ease: 'power2.out',
                }, droplet.delay);

                // ...then they run together into one pool...
                timeline.to(circle, {
                    attr: { cx: origin.x, cy: origin.y, r: spread * 0.6 },
                    duration: 0.66,
                    ease: 'power2.inOut',
                }, 0.42);
            });

            // ...that floods the page. The pool sits outside the goo filter: filtering a circle the
            // size of the screen re-blurred the whole viewport every frame (60-80ms frames).
            timeline.to(pool, {
                attr: { r: maxRadius },
                duration: 0.66,
                ease: 'power2.inOut',
            }, 0.42);

            // Swap the palette under full cover, then lift the ink away.
            timeline.add(apply, 0.98);
            timeline.to(root, { opacity: 0, duration: 0.38, ease: 'power2.out' }, 1.06);
        },
    }));

    return (
        <svg
            ref={rootRef}
            aria-hidden="true"
            style={{ visibility: 'hidden', opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-[150] h-full w-full"
        >
            <defs>
                {/* Blur plus a hard alpha ramp: overlapping droplets fuse into one
                    shape instead of stacking, which is what sells the ink read. */}
                <filter id="theme-ink-goo">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur" />
                    <feColorMatrix
                        in="blur"
                        mode="matrix"
                        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 28 -13"
                    />
                </filter>
            </defs>
            <g ref={groupRef} filter="url(#theme-ink-goo)" fill={THEME_BACKGROUND.light}>
                {DROPLETS.map((droplet, index) => (
                    <circle
                        key={`${droplet.dx}-${droplet.dy}`}
                        ref={(element) => {
                            circleRefs.current[index] = element;
                        }}
                        cx="0"
                        cy="0"
                        r="0"
                    />
                ))}
            </g>
            <circle ref={poolRef} cx="0" cy="0" r="0" fill={THEME_BACKGROUND.light} />
        </svg>
    );
});

export default ThemeTransition;
