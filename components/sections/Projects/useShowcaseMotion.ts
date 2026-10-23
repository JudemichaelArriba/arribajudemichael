'use client';

import { useRef, type RefObject } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { isPreloading } from '@/lib/animations/preloaderHold';
import { primeStagger } from '@/lib/animations/primeStagger';
import { REDUCED_MOTION_QUERY } from '@/lib/breakpoints';

import type { ShowcasePanel } from './showcase';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** `any` always matches: matchMedia only runs its callback when at least one condition does. */
const MOTION_CONDITIONS = { any: 'all', reduce: REDUCED_MOTION_QUERY };

/** Items arriving together share one beat: their combined stagger never exceeds this (seconds). */
const MAX_GROUP_STAGGER = 0.5;

/** Re-measures only the triggers inside `section` and after it (the sections above are unaffected). */
function refreshTriggersFrom(section: HTMLElement) {
    ScrollTrigger.sort();
    ScrollTrigger.getAll()
        .filter(({ trigger }) => trigger instanceof Element
            && (section.contains(trigger) || !!(section.compareDocumentPosition(trigger) & Node.DOCUMENT_POSITION_FOLLOWING)))
        .forEach((scrollTrigger) => scrollTrigger.refresh());
}

let callbackId = 0;

/**
 * Wraps a callback that runs later (a ScrollTrigger callback) so the tweens it creates belong to
 * `context` and are killed when the context reverts. `context.add(fn)` would run `fn` right away;
 * registering it under a name returns the wrapped function instead.
 */
function inContext<Args extends unknown[]>(context: gsap.Context, callback: (...args: Args) => unknown): (...args: Args) => void {
    return context.add(`showcase-callback-${callbackId++}`, callback) as (...args: Args) => void;
}

/**
 * Plays a paused reveal once `trigger` reaches `start`, including when the page is scrolled (or
 * reloaded) straight past it, and rewinds it only after the trigger has dropped fully below the
 * screen, so it plays again on the way back down but never vanishes while it can be seen.
 */
function revealOnScroll(context: gsap.Context, trigger: Element, timeline: gsap.core.Timeline, start: string) {
    ScrollTrigger.create({ trigger, start, onEnter: inContext(context, () => timeline.play()) });
    ScrollTrigger.create({ trigger, start: 'top bottom', onLeaveBack: inContext(context, () => timeline.pause(0)) });
}

interface ShowcaseMotionState {
    panel: ShowcasePanel;
    isDesktop: boolean;
    /** Number of items in the open panel (0 when it shows an empty or unavailable state). */
    itemCount: number;
}

/**
 * Scroll reveals for the Projects section, following the HyperFrames motion rules: paused
 * timelines built from `fromTo` with explicit start states (seek-safe in both directions),
 * transforms, opacity and clip-path only, grouped staggers capped to one beat, `power3.out` as the
 * settle and `power3.inOut` for wipes. Nothing is pinned or scrubbed, so content of any length
 * works on any screen height. With reduced motion nothing is hidden or moved.
 */
export function useShowcaseMotion(sectionRef: RefObject<HTMLElement | null>, { panel, isDesktop, itemCount }: ShowcaseMotionState) {
    // Header: the hairline draws, the tab words cascade up, the intro follows. Built once, so a tab
    // switch never replays it.
    useGSAP(
        () => {
            const section = sectionRef.current;
            if (!section) return;
            const mm = gsap.matchMedia();
            mm.add(MOTION_CONDITIONS, (context) => {
                if (context.conditions?.reduce) return;
                const words = gsap.utils.toArray<HTMLElement>('[data-showcase-word]', section);
                const timeline = gsap.timeline({ paused: true })
                    .fromTo('[data-showcase-line]', { scaleX: 0 }, { scaleX: 1, transformOrigin: 'left center', duration: 0.8, ease: 'power2.inOut' }, 0)
                    .fromTo(words, primeStagger(words, { autoAlpha: 0, y: 56 }), { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power4.out', stagger: 0.08 }, 0.1)
                    .fromTo('[data-showcase-intro]', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.25);
                revealOnScroll(context, section, timeline, 'top 78%');
            }, section);
            return () => mm.revert();
        },
        { scope: sectionRef },
    );

    // The open panel. Rebuilt when the tab, the layout or the item count changes. After a tab
    // switch whatever is already on screen is simply shown; only what is still below gets a reveal.
    const hasBuilt = useRef(false);
    useGSAP(
        () => {
            const section = sectionRef.current;
            if (!section) return;
            const afterSwitch = hasBuilt.current;
            hasBuilt.current = true;

            const mm = gsap.matchMedia();
            mm.add(MOTION_CONDITIONS, (context) => {
                if (context.conditions?.reduce) return;
                const all = (selector: string) => gsap.utils.toArray<HTMLElement>(selector, section);
                const onScreen = (element: Element) => afterSwitch && element.getBoundingClientRect().top < window.innerHeight * 0.92;

                const reveal = (element: Element | null, build: (timeline: gsap.core.Timeline) => void, start: string) => {
                    if (!element || onScreen(element)) return;
                    const timeline = gsap.timeline({ paused: true });
                    build(timeline);
                    revealOnScroll(context, element, timeline, start);
                };

                // Items that can arrive several at once (rows, cards): one batch per arrival,
                // staggered within MAX_GROUP_STAGGER, each reset once it is fully below the screen.
                const revealGroup = (
                    elements: HTMLElement[],
                    start: string,
                    hide: (element: HTMLElement) => void,
                    show: (element: HTMLElement, delay: number) => void,
                ) => {
                    const pending = elements.filter((element) => !onScreen(element));
                    if (!pending.length) return;
                    pending.forEach(hide);
                    ScrollTrigger.batch(pending, {
                        start,
                        onEnter: inContext(context, (batch: Element[]) => {
                            const step = Math.min(0.08, MAX_GROUP_STAGGER / batch.length);
                            batch.forEach((element, index) => show(element as HTMLElement, index * step));
                        }),
                    });
                    pending.forEach((element) => ScrollTrigger.create({
                        trigger: element,
                        start: 'top bottom',
                        onLeaveBack: inContext(context, () => hide(element)),
                    }));
                };

                if (isDesktop) {
                    // Index rows: each hairline draws across, then its title rises into place.
                    revealGroup(
                        all('[data-index-row]'),
                        'top 94%',
                        (row) => {
                            const parts = [row.querySelector('[data-row-line]'), row.querySelector('[data-row-body]')];
                            gsap.killTweensOf(parts);
                            gsap.set(parts[0], { scaleX: 0, transformOrigin: 'left center' });
                            gsap.set(parts[1], { autoAlpha: 0, y: 14 });
                        },
                        (row, delay) => {
                            gsap.to(row.querySelector('[data-row-line]'), { scaleX: 1, duration: 0.7, ease: 'power2.inOut', delay, overwrite: true });
                            gsap.to(row.querySelector('[data-row-body]'), { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', delay: delay + 0.06, overwrite: true });
                        },
                    );

                    // Preview: the frame wipes open from the bottom while the visual settles from a
                    // slight zoom, then the caption rises.
                    const preview = section.querySelector('[data-preview]');
                    reveal(preview, (timeline) => {
                        const parts = all('[data-preview-caption][aria-hidden="false"] [data-caption-part]');
                        timeline
                            .fromTo('[data-preview-frame]', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.95, ease: 'power3.inOut' }, 0)
                            .fromTo('[data-preview-stage]', { scale: 1.06 }, { scale: 1, duration: 1.2, ease: 'power3.out' }, 0)
                            .fromTo(parts, primeStagger(parts, { autoAlpha: 0, y: 12 }), { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.08 }, 0.45);
                    }, 'top 85%');
                } else {
                    // Phone and tablet project entries. On a phone the copy sits a screen below its
                    // screenshot, so each part has its own trigger and plays when it is reached.
                    all('[data-entry]').forEach((entry) => {
                        const media = entry.querySelector('[data-entry-media]');
                        reveal(media, (timeline) => {
                            timeline
                                .fromTo(media, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'power3.inOut' }, 0)
                                .fromTo(entry.querySelector('[data-entry-visual]'), { scale: 1.08 }, { scale: 1, duration: 1.1, ease: 'power3.out' }, 0);
                        }, 'top 88%');
                        const copy = entry.querySelector('[data-entry-copy]');
                        reveal(copy, (timeline) => {
                            const parts = copy ? Array.from(copy.children) : [];
                            timeline.fromTo(parts, primeStagger(parts, { autoAlpha: 0, y: 18 }), { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.07 });
                        }, 'top 90%');
                    });

                    // Certificate contact sheet: cards rise in order across each row.
                    revealGroup(
                        all('[data-sheet-card]'),
                        'top 92%',
                        (card) => {
                            gsap.killTweensOf(card);
                            gsap.set(card, { autoAlpha: 0, y: 28 });
                        },
                        (card, delay) => {
                            gsap.to(card, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', delay, overwrite: true });
                        },
                    );
                }

                reveal(section.querySelector('[data-showcase-state]'), (timeline) => {
                    timeline.fromTo('[data-showcase-state]', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' });
                }, 'top 88%');
            }, section);

            // This section streams in after the ones below it were set up. On the first build,
            // re-sort every trigger into document order and refresh (unless the preloader will);
            // after a switch, the panel's height may have changed, so re-measure from here down.
            const frame = window.requestAnimationFrame(() => {
                if (afterSwitch) {
                    refreshTriggersFrom(section);
                    return;
                }
                ScrollTrigger.sort();
                if (!isPreloading()) ScrollTrigger.refresh();
            });
            return () => {
                window.cancelAnimationFrame(frame);
                mm.revert();
            };
        },
        { scope: sectionRef, dependencies: [panel, isDesktop, itemCount], revertOnUpdate: true },
    );
}
