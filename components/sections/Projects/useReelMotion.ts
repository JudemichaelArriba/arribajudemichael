'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { isPreloading } from '@/lib/animations/preloaderHold';
import { primeStagger } from '@/lib/animations/primeStagger';
import { resyncAfterRefresh } from '@/lib/animations/resyncAfterRefresh';
import { REDUCED_MOTION_QUERY, REEL_PIN_QUERY } from '@/lib/breakpoints';

gsap.registerPlugin(ScrollTrigger, Draggable, useGSAP);

/** `any` always matches: matchMedia only runs its callback when at least one condition does. */
const MOTION_CONDITIONS = { any: 'all', pin: REEL_PIN_QUERY, reduce: REDUCED_MOTION_QUERY };

/** Scroll distance per project while the stage is pinned, as a share of the screen height. */
const SCROLL_PER_PROJECT = 0.9;
/** A frame one step or more from the playhead fades to this opacity and shrinks by this much. */
const AWAY_OPACITY = 0.3;
const AWAY_SHRINK = 0.14;
/** Pixels a pointer must travel before a press on the strip becomes a drag. */
const DRAG_THRESHOLD = 6;
/** How far past either end a drag may pull the unpinned strip, in frame steps. */
const DRAG_OVERSHOOT = 0.25;
/** A released drag moves on to the neighbour once it has covered this share of a step. */
const DRAG_COMMIT = 0.2;

export interface ReelController {
    /** Brings project `index` under the playhead. */
    goTo: (index: number) => void;
}

interface ReelMotionOptions {
    count: number;
    /** Changes whenever the rendered projects change, so stale DOM is never animated. */
    itemsKey: string;
    /** Called when a different project comes under the playhead. */
    onActive: (index: number) => void;
}

/**
 * Added to the strip's position (in projects) before rounding when a drag ends, so the strip moves
 * on to the neighbour in the drag's direction once DRAG_COMMIT of a step has been covered.
 */
function dragLean(dragX: number): number {
    const bias = 0.5 - DRAG_COMMIT;
    return dragX < 0 ? bias : dragX > 0 ? -bias : 0;
}

/**
 * How far the current drag has moved, in pixels. The proxy keeps its position between drags, so
 * its `x` alone is not the distance of this drag.
 */
function dragDistance(drag: Draggable): number {
    return drag.x - drag.startX;
}

/**
 * Draggable decides `touch-action` from the size of the dragged element. Ours is a detached proxy
 * (0 × 0), which it reads as "scrollable both ways" and answers with `manipulation`, so a sideways
 * swipe counts as a page pan and the browser cancels the drag. Dropping that inline value restores
 * the viewport's own `pan-y` class: vertical swipes still scroll the page, sideways ones drag.
 * (Touch actions intersect down the tree, so the descendants' inline values change nothing.)
 */
function keepVerticalPanning(viewport: HTMLElement) {
    viewport.style.removeProperty('touch-action');
}

/** Distance between the left edges of the first two elements (frames or ruler ticks). */
function stepOf(elements: HTMLElement[]): number {
    return elements.length > 1 ? elements[1].offsetLeft - elements[0].offsetLeft : 0;
}

/**
 * Motion for the Projects reel. The projects sit on one strip under a fixed playhead, with a ruler
 * below it.
 *
 * - Where `REEL_PIN_QUERY` matches (and there is more than one project), the stage pins and one
 *   scrubbed timeline moves the strip and the ruler together; it snaps to each project. Dragging
 *   the strip scrubs the same scroll position, so dragging and scrolling never disagree.
 * - Elsewhere (reduced motion, landscape phones, a single project) nothing is pinned: the strip
 *   moves only when a tick is chosen or the strip is dragged, instantly with reduced motion.
 *
 * As the stage scrolls up, a scrubbed entrance draws the rule, raises the heading, slides the strip
 * in and opens the ruler. It finishes where the pin begins, as the site's other sections do.
 */
export function useReelMotion(
    stageRef: RefObject<HTMLElement | null>,
    { count, itemsKey, onActive }: ReelMotionOptions,
): RefObject<ReelController | null> {
    const controller = useRef<ReelController | null>(null);
    const activeRef = useRef(0);
    const onActiveRef = useRef(onActive);
    useEffect(() => {
        onActiveRef.current = onActive;
    }, [onActive]);

    useGSAP(
        () => {
            const stage = stageRef.current;
            if (!stage) return;
            const mm = gsap.matchMedia();

            mm.add(MOTION_CONDITIONS, (context) => {
                const { pin, reduce } = context.conditions as { pin: boolean; reduce: boolean };
                const viewport = stage.querySelector<HTMLElement>('[data-reel-viewport]');
                const strip = stage.querySelector<HTMLElement>('[data-reel-strip]');
                const track = stage.querySelector<HTMLElement>('[data-reel-track]');
                const ruler = stage.querySelector<HTMLElement>('[data-reel-ruler]');
                const frames = gsap.utils.toArray<HTMLElement>('[data-reel-frame]', stage);
                const ticks = gsap.utils.toArray<HTMLElement>('[data-reel-tick]', stage);
                const last = frames.length - 1;
                const pinned = pin && last > 0;
                const cleanups: (() => void)[] = [];

                if (!reduce) {
                    // Entrance. With a pin it completes exactly where the pin starts.
                    const rises = gsap.utils.toArray<HTMLElement>('[data-reel-rise]', stage);
                    const entrance = gsap.timeline({
                        defaults: { ease: 'none' },
                        scrollTrigger: { trigger: stage, start: 'top 85%', end: pinned ? 'top top' : 'top 35%', scrub: 0.6, invalidateOnRefresh: true },
                    })
                        .fromTo('[data-reel-rule]', { scaleX: 0 }, { scaleX: 1, transformOrigin: 'left center', duration: 0.3 }, 0)
                        .fromTo('[data-reel-line]', { yPercent: 110 }, { yPercent: 0, ease: 'power3.out', duration: 0.4 }, 0.05)
                        .fromTo('[data-reel-lead]', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0.2);
                    if (viewport) {
                        entrance.fromTo(viewport, { autoAlpha: 0, x: 120 }, { autoAlpha: 1, x: 0, ease: 'power3.out', duration: 0.5 }, 0.15);
                    }
                    if (ruler) {
                        entrance.fromTo(ruler, { clipPath: 'inset(0% 50% 0% 50%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut', duration: 0.4 }, 0.4);
                    }
                    if (rises.length) {
                        entrance.fromTo(rises, primeStagger(rises, { autoAlpha: 0, y: 16 }), { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.05 }, 0.55);
                    }
                }

                if (!strip || !track || last < 0) return () => cleanups.forEach((cleanup) => cleanup());

                const clamp = (index: number) => Math.min(last, Math.max(0, index));
                let shown = -1;
                // Frames fade and shrink with their distance from the playhead; the readout and the
                // ruler follow the nearest one. Inline styles, written every frame of a scrub; the
                // next build writes them again, so nothing has to restore them.
                const render = (position: number) => {
                    frames.forEach((frame, index) => {
                        const away = Math.min(Math.abs(index - position), 1);
                        frame.style.opacity = String(1 - away * (1 - AWAY_OPACITY));
                        frame.style.transform = `scale(${1 - away * AWAY_SHRINK})`;
                    });
                    const nearest = clamp(Math.round(position));
                    if (nearest === shown) return;
                    shown = nearest;
                    activeRef.current = nearest;
                    onActiveRef.current(nearest);
                };
                const stripStep = () => stepOf(frames);
                const tickStep = () => stepOf(ticks);
                // Where the strip is now, in projects (0 = first under the playhead).
                const stripPosition = () => {
                    const step = stripStep();
                    return step ? -Number(gsap.getProperty(strip, 'x')) / step : 0;
                };

                if (pinned) {
                    // Function values and invalidateOnRefresh: a resize re-measures the steps.
                    const timeline = gsap.timeline({ defaults: { ease: 'none' }, onUpdate: () => render(timeline.time()) })
                        .fromTo(strip, { x: 0 }, { x: () => -stripStep() * last, duration: last }, 0)
                        .fromTo(track, { x: 0 }, { x: () => -tickStep() * last, duration: last }, 0);
                    const trigger = ScrollTrigger.create({
                        trigger: stage,
                        start: 'top top',
                        end: () => `+=${Math.round(window.innerHeight * SCROLL_PER_PROJECT * last)}`,
                        pin: true,
                        animation: timeline,
                        scrub: 0.6,
                        invalidateOnRefresh: true,
                        snap: { snapTo: 1 / last, duration: { min: 0.25, max: 0.7 }, delay: 0.05, ease: 'power3.inOut' },
                    });
                    const scrollFor = (position: number) => trigger.start + ((trigger.end - trigger.start) * position) / last;

                    controller.current = {
                        goTo: (index) => window.scrollTo({ top: scrollFor(clamp(index)), behavior: 'smooth' }),
                    };

                    if (viewport) {
                        const proxy = document.createElement('div');
                        let origin = 0;
                        const [drag] = Draggable.create(proxy, {
                            trigger: viewport,
                            type: 'x',
                            allowNativeTouchScrolling: true,
                            minimumMovement: DRAG_THRESHOLD,
                            zIndexBoost: false,
                            cursor: 'grab',
                            activeCursor: 'grabbing',
                            onPress() {
                                origin = window.scrollY;
                            },
                            onDrag(this: Draggable) {
                                const step = stripStep();
                                if (!step) return;
                                const perProject = (trigger.end - trigger.start) / last;
                                const top = Math.min(trigger.end, Math.max(trigger.start, origin - (dragDistance(this) / step) * perProject));
                                // `instant` ignores any smooth scroll-behavior, so the strip tracks the pointer.
                                window.scrollTo({ top, behavior: 'instant' });
                            },
                            onDragEnd(this: Draggable) {
                                // Same rule as the unpinned strip; the snap then settles on it.
                                const position = ((window.scrollY - trigger.start) / (trigger.end - trigger.start)) * last;
                                controller.current?.goTo(Math.round(position + dragLean(dragDistance(this))));
                            },
                        });
                        keepVerticalPanning(viewport);
                        cleanups.push(() => drag.kill());
                    }

                    render(timeline.time());
                    // A refresh rewinds the timeline with callbacks on and restores it silently.
                    cleanups.push(resyncAfterRefresh(() => render(timeline.time())));
                } else {
                    let index = clamp(activeRef.current);
                    const place = (animate: boolean) => {
                        const x = -stripStep() * index;
                        const trackX = -tickStep() * index;
                        gsap.killTweensOf([strip, track]);
                        if (!animate || reduce) {
                            gsap.set(strip, { x });
                            gsap.set(track, { x: trackX });
                            render(index);
                            return;
                        }
                        gsap.to(strip, { x, duration: 0.7, ease: 'power3.inOut', onUpdate: () => render(stripPosition()), onComplete: () => render(index) });
                        gsap.to(track, { x: trackX, duration: 0.7, ease: 'power3.inOut' });
                    };

                    controller.current = {
                        goTo: (next) => {
                            index = clamp(next);
                            place(true);
                        },
                    };

                    if (viewport && last > 0) {
                        const proxy = document.createElement('div');
                        let origin = 0;
                        const [drag] = Draggable.create(proxy, {
                            trigger: viewport,
                            type: 'x',
                            allowNativeTouchScrolling: true,
                            minimumMovement: DRAG_THRESHOLD,
                            zIndexBoost: false,
                            cursor: 'grab',
                            activeCursor: 'grabbing',
                            onPress() {
                                gsap.killTweensOf([strip, track]);
                                origin = Number(gsap.getProperty(strip, 'x'));
                            },
                            onDrag(this: Draggable) {
                                const step = stripStep();
                                if (!step) return;
                                const x = Math.min(step * DRAG_OVERSHOOT, Math.max(-step * (last + DRAG_OVERSHOOT), origin + dragDistance(this)));
                                gsap.set(strip, { x });
                                gsap.set(track, { x: (x / step) * tickStep() });
                                render(stripPosition());
                            },
                            onDragEnd(this: Draggable) {
                                index = clamp(Math.round(stripPosition() + dragLean(dragDistance(this))));
                                place(true);
                            },
                        });
                        keepVerticalPanning(viewport);
                        cleanups.push(() => drag.kill());
                    }

                    place(false);
                    // A resize changes the frame step: put the strip back on the current project.
                    cleanups.push(resyncAfterRefresh(() => place(false)));
                    // Tweens started later by goTo or a drag are not owned by this context.
                    cleanups.push(() => {
                        gsap.killTweensOf([strip, track]);
                        gsap.set([strip, track], { clearProps: 'transform' });
                    });
                }

                return () => {
                    controller.current = null;
                    cleanups.forEach((cleanup) => cleanup());
                };
            }, stage);

            // This section streams in after the ones below it were set up, and its pin adds space
            // above them: re-sort every trigger into document order and refresh (unless the
            // preloader is about to measure everything anyway).
            const frame = window.requestAnimationFrame(() => {
                ScrollTrigger.sort();
                if (!isPreloading()) ScrollTrigger.refresh();
            });
            return () => {
                window.cancelAnimationFrame(frame);
                mm.revert();
            };
        },
        { scope: stageRef, dependencies: [count, itemsKey], revertOnUpdate: true },
    );

    return controller;
}
