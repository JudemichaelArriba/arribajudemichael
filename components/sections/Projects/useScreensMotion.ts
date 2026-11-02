'use client';

import type { RefObject } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { isPreloading } from '@/lib/animations/preloaderHold';
import { DESKTOP_QUERY, FINE_POINTER_QUERY, REDUCED_MOTION_QUERY } from '@/lib/breakpoints';

import type { ScreenSide } from './showcase';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** `any` always matches: matchMedia only runs its callback when at least one condition does. */
const MOTION_CONDITIONS = { any: 'all', desktop: DESKTOP_QUERY, fine: FINE_POINTER_QUERY, reduce: REDUCED_MOTION_QUERY };

/** Desktop windows rest turned this far (degrees), their far edge receding towards the readout. */
const REST_TURN = 14;
/** ...and look up this much. */
const REST_LIFT = 5;
/** How steeply they start their swing in: desktop windows, and phone windows hinged on their side. */
const ENTRY_TURN = { desktop: 42, phone: 40 };
/** How far a window travels in from its side while it wipes in (px). */
const ENTRY_SHIFT = { desktop: 120, phone: 48 };
/** Pointer tilt on hover (degrees, across the whole window) and how far the window lifts (px). */
const HOVER_TURN = 18;
const HOVER_LIFT_TURN = 12;
const HOVER_RAISE = 40;

/** The frame's clip-path, open or shut against one edge, keeping the frame's rounded corners. */
function clipShape(frame: HTMLElement, shutFrom: ScreenSide | null): string {
    const round = `round ${getComputedStyle(frame).borderTopLeftRadius}`;
    if (shutFrom === 'left') return `inset(0% 100% 0% 0% ${round})`;
    if (shutFrom === 'right') return `inset(0% 0% 0% 100% ${round})`;
    return `inset(0% 0% 0% 0% ${round})`;
}

/**
 * On a mouse or pen, the window follows the pointer in 3D on top of its resting tilt, lifts towards
 * the viewer and catches a glare where the pointer is. Returns the cleanup.
 */
function followPointer(column: HTMLElement): () => void {
    const tilt = column.querySelector<HTMLElement>('[data-screen-tilt]');
    const frame = column.querySelector<HTMLElement>('[data-screen-frame]');
    if (!tilt || !frame) return () => {};
    const turnX = gsap.quickTo(tilt, 'rotationX', { duration: 0.6, ease: 'power3.out' });
    const turnY = gsap.quickTo(tilt, 'rotationY', { duration: 0.6, ease: 'power3.out' });
    const raise = gsap.quickTo(tilt, 'z', { duration: 0.6, ease: 'power3.out' });

    const move = (event: PointerEvent) => {
        const box = frame.getBoundingClientRect();
        const x = gsap.utils.clamp(0, 1, (event.clientX - box.left) / box.width);
        const y = gsap.utils.clamp(0, 1, (event.clientY - box.top) / box.height);
        turnY((x - 0.5) * HOVER_TURN);
        turnX((0.5 - y) * HOVER_LIFT_TURN);
        raise(HOVER_RAISE);
        frame.style.setProperty('--glare-x', `${(x * 100).toFixed(1)}%`);
        frame.style.setProperty('--glare-y', `${(y * 100).toFixed(1)}%`);
        column.dataset.hover = '';
    };
    const leave = () => {
        turnX(0);
        turnY(0);
        raise(0);
        delete column.dataset.hover;
    };
    column.addEventListener('pointermove', move);
    column.addEventListener('pointerleave', leave);
    return () => {
        column.removeEventListener('pointermove', move);
        column.removeEventListener('pointerleave', leave);
        delete column.dataset.hover;
        gsap.set(tilt, { clearProps: 'transform' });
    };
}

/**
 * Motion for the project screens, scrubbed like the rest of the site (one timeline per project).
 *
 * - The header: the rule draws, the heading rises out of its mask, the lead follows.
 * - Each window wipes in from its own side, like a certificate cell but mirrored for the windows on
 *   the right: the clip opens from that edge while the window slides in, and the screenshot settles
 *   from a slight zoom. The address bar's pieces appear once it is open.
 * - Desktop: the window swings from a steep turn into its resting 3D tilt, the outlined number trails
 *   it in, and the readout comes from the other side so both meet in the middle. On a mouse the
 *   window then follows the pointer.
 * - Phones and tablets: the window rests flat and full width (a tilt would waste the narrow screen)
 *   and swings in hinged on its side. The readout sits under it and rises on its own trigger, so it
 *   plays while it is on screen.
 *
 * Reduced motion shows everything flat and still.
 */
export function useScreensMotion(rootRef: RefObject<HTMLElement | null>, itemsKey: string) {
    useGSAP(
        () => {
            const root = rootRef.current;
            if (!root) return;
            const mm = gsap.matchMedia();

            mm.add(MOTION_CONDITIONS, (context) => {
                const { desktop, fine, reduce } = context.conditions as { desktop: boolean; fine: boolean; reduce: boolean };
                if (reduce) return;
                const cleanups: (() => void)[] = [];

                const head = root.querySelector('[data-screens-head]');
                if (head) {
                    gsap.timeline({
                        defaults: { ease: 'none' },
                        scrollTrigger: { trigger: head, start: 'top 85%', end: 'top 40%', scrub: 0.6, invalidateOnRefresh: true },
                    })
                        .fromTo('[data-screens-rule]', { scaleX: 0 }, { scaleX: 1, transformOrigin: 'left center', duration: 0.4 }, 0)
                        // 120%: Anton's caps and dots rise above the line box (110% left them in the mask).
                        .fromTo('[data-screens-line]', { y: 0, yPercent: 120 }, { y: 0, yPercent: 0, ease: 'power3.out', duration: 0.5 }, 0.1)
                        .fromTo('[data-screens-lead]', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.3);
                }

                gsap.utils.toArray<HTMLElement>('[data-screen]', root).forEach((scene) => {
                    const side = scene.dataset.screen === 'right' ? 'right' : 'left';
                    // -1 for a window on the left (it comes from the left), 1 for one on the right.
                    const dir = side === 'left' ? -1 : 1;
                    const column = scene.querySelector<HTMLElement>('[data-screen-window]');
                    const stage = scene.querySelector<HTMLElement>('[data-screen-stage]');
                    const frame = scene.querySelector<HTMLElement>('[data-screen-frame]');
                    const shade = scene.querySelector<HTMLElement>('[data-screen-shade]');
                    const shot = scene.querySelector<HTMLElement>('[data-screen-shot]');
                    const number = scene.querySelector<HTMLElement>('[data-screen-number]');
                    const chrome = gsap.utils.toArray<HTMLElement>('[data-screen-chrome]', scene);
                    const readout = scene.querySelector<HTMLElement>('[data-screen-readout]');
                    const lines = readout ? Array.from(readout.children) as HTMLElement[] : [];
                    if (!column || !stage || !frame || !shade || !shot) return;

                    const entrance = gsap.timeline({
                        defaults: { ease: 'none' },
                        scrollTrigger: {
                            trigger: desktop ? scene : column,
                            start: 'top 90%',
                            end: desktop ? 'top 28%' : 'top 45%',
                            scrub: 0.6,
                            invalidateOnRefresh: true,
                        },
                    })
                        .fromTo(
                            frame,
                            { clipPath: () => clipShape(frame, side), x: dir * (desktop ? ENTRY_SHIFT.desktop : ENTRY_SHIFT.phone) },
                            { clipPath: () => clipShape(frame, null), x: 0, ease: 'power2.out', duration: 0.7 },
                            0,
                        )
                        .fromTo(
                            stage,
                            desktop
                                ? { rotationY: -dir * ENTRY_TURN.desktop, rotationX: 14, z: -120 }
                                : { rotationY: -dir * ENTRY_TURN.phone, rotationX: 0, z: 0 },
                            desktop
                                ? { rotationY: -dir * REST_TURN, rotationX: REST_LIFT, z: 0, ease: 'power2.out', duration: 0.85 }
                                : { rotationY: 0, rotationX: 0, z: 0, ease: 'power2.out', duration: 0.85 },
                            0,
                        )
                        .fromTo(shade, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 0.15)
                        .fromTo(shot, { scale: 1.08, xPercent: dir * 3 }, { scale: 1, xPercent: 0, ease: 'power2.out', duration: 0.85 }, 0.05);
                    chrome.forEach((piece, index) => {
                        entrance.fromTo(piece, { autoAlpha: 0, y: -6 }, { autoAlpha: 1, y: 0, ease: 'power2.out', duration: 0.25 }, 0.32 + index * 0.06);
                    });

                    if (desktop) {
                        if (number) {
                            entrance.fromTo(number, { autoAlpha: 0, x: dir * 90 }, { autoAlpha: 1, x: 0, ease: 'power2.out', duration: 0.6 }, 0.12);
                        }
                        lines.forEach((line, index) => {
                            entrance.fromTo(line, { autoAlpha: 0, x: -dir * 40 }, { autoAlpha: 1, x: 0, ease: 'power2.out', duration: 0.4 }, 0.34 + index * 0.08);
                        });
                    } else if (readout) {
                        const rise = gsap.timeline({
                            defaults: { ease: 'none' },
                            scrollTrigger: { trigger: readout, start: 'top 92%', end: 'top 62%', scrub: 0.6, invalidateOnRefresh: true },
                        });
                        lines.forEach((line, index) => {
                            rise.fromTo(line, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, ease: 'power2.out', duration: 0.4 }, index * 0.12);
                        });
                        // Keeps the scroll positions above lined up with the timeline (it spans 0–1).
                        rise.set({}, {}, 1);
                    }
                    entrance.set({}, {}, 1);

                    if (desktop && fine) cleanups.push(followPointer(column));
                });

                return () => cleanups.forEach((cleanup) => cleanup());
            }, root);

            // Streams in after the sections below were set up, and its height moves them: re-sort
            // triggers into document order and re-measure (the preloader does it on the first load).
            const refreshFrame = window.requestAnimationFrame(() => {
                ScrollTrigger.sort();
                if (!isPreloading()) ScrollTrigger.refresh();
            });
            return () => {
                window.cancelAnimationFrame(refreshFrame);
                mm.revert();
            };
        },
        { scope: rootRef, dependencies: [itemsKey], revertOnUpdate: true },
    );
}
