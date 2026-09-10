'use client';

import { useEffect, useRef, useState } from 'react';

interface StrokePoint {
    x: number;
    y: number;
    t: number;
    /** Width factor from pointer speed — fast strokes taper, slow ones pool. */
    weight: number;
}

const TRAIL_LIFETIME = 620;
const MAX_POINTS = 90;
const MAX_WIDTH = 26;
const MIN_WIDTH = 2;

/**
 * Ink-brush cursor: the pointer drags a tapered stroke that thins as you move
 * faster and dries out behind you. Painted in the resolved `--text` colour, so
 * it is black on the light theme and white on the dark one.
 *
 * Pointer devices only — skipped for touch, coarse pointers and reduced motion.
 */
export default function Cursor() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
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
        const canvas = canvasRef.current;
        if (!enabled || !canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const points: StrokePoint[] = [];
        let width = 0;
        let height = 0;
        let raf = 0;
        let lastX = 0;
        let lastY = 0;
        let hasLast = false;

        // Read the live token so the stroke follows the theme without prop drilling.
        let ink = '20, 20, 20';
        const readInk = () => {
            const value = getComputedStyle(document.documentElement)
                .getPropertyValue('--text')
                .trim();
            const hex = value.replace('#', '');
            if (hex.length !== 6) return;
            const num = Number.parseInt(hex, 16);
            if (Number.isNaN(num)) return;
            ink = `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
        };

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const handleMove = (event: PointerEvent) => {
            const now = performance.now();
            const speed = hasLast
                ? Math.hypot(event.clientX - lastX, event.clientY - lastY)
                : 0;
            lastX = event.clientX;
            lastY = event.clientY;
            hasLast = true;

            // Faster movement → thinner stroke, the way a real brush behaves.
            const weight = Math.max(0.18, 1 - Math.min(speed / 42, 0.86));
            points.push({ x: event.clientX, y: event.clientY, t: now, weight });
            if (points.length > MAX_POINTS) points.shift();
        };

        const draw = () => {
            const now = performance.now();
            ctx.clearRect(0, 0, width, height);

            while (points.length > 0 && now - points[0].t > TRAIL_LIFETIME) {
                points.shift();
            }

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            for (let i = 1; i < points.length; i++) {
                const previous = points[i - 1];
                const point = points[i];
                const age = (now - point.t) / TRAIL_LIFETIME;
                const life = Math.max(0, 1 - age);
                if (life <= 0) continue;

                // Taper toward the tail as well as with age.
                const along = i / points.length;
                const thickness = Math.max(
                    MIN_WIDTH,
                    MAX_WIDTH * point.weight * life * (0.35 + along * 0.65)
                );

                ctx.strokeStyle = `rgba(${ink}, ${(life * life * 0.9).toFixed(3)})`;
                ctx.lineWidth = thickness;
                ctx.beginPath();
                ctx.moveTo(previous.x, previous.y);
                ctx.lineTo(point.x, point.y);
                ctx.stroke();
            }

            // The wet tip at the pointer itself.
            const tip = points[points.length - 1];
            if (tip) {
                ctx.fillStyle = `rgba(${ink}, 0.95)`;
                ctx.beginPath();
                ctx.arc(tip.x, tip.y, Math.max(MIN_WIDTH, 5 * tip.weight + 2), 0, Math.PI * 2);
                ctx.fill();
            }

            raf = requestAnimationFrame(draw);
        };

        readInk();
        resize();
        raf = requestAnimationFrame(draw);

        const themeObserver = new MutationObserver(readInk);
        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });

        window.addEventListener('pointermove', handleMove, { passive: true });
        window.addEventListener('resize', resize);

        return () => {
            cancelAnimationFrame(raf);
            themeObserver.disconnect();
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('resize', resize);
        };
    }, [enabled]);

    if (!enabled) return null;

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-[120]"
        />
    );
}
