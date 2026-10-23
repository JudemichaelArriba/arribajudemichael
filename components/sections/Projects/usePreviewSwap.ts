'use client';

import { useRef, type RefObject } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { REDUCED_MOTION_QUERY } from '@/lib/breakpoints';

gsap.registerPlugin(useGSAP);

/**
 * Motion for a change of the desktop preview. The incoming visual wipes up over the one before it,
 * the counter rolls to its new number and the caption settles in.
 *
 * Which layer and caption are visible is decided by React (classes and z-order), never by these
 * tweens: every swap first clears what an interrupted swap left behind, then plays from explicit
 * start states. However fast the selection changes, it always comes to rest on the right item.
 */
export function usePreviewSwap(scope: RefObject<HTMLElement | null>, active: number) {
    const shown = useRef(active);

    useGSAP(
        () => {
            const root = scope.current;
            if (!root || shown.current === active) return;
            shown.current = active;

            const layers = root.querySelectorAll('[data-preview-layer]');
            const captions = root.querySelectorAll('[data-preview-caption]');
            const count = root.querySelector('[data-preview-count]');
            gsap.killTweensOf(count ? [...layers, ...captions, count] : [...layers, ...captions]);
            gsap.set(layers, { clearProps: 'clipPath' });
            gsap.set(captions, { clearProps: 'opacity,visibility,transform' });
            if (count) gsap.set(count, { clearProps: 'transform' });
            if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;

            const layer = root.querySelector(`[data-preview-layer="${active}"]`);
            if (layer) {
                gsap.fromTo(layer, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.55, ease: 'power3.inOut', clearProps: 'clipPath' });
            }
            if (count) {
                gsap.fromTo(count, { yPercent: 100 }, { yPercent: 0, duration: 0.4, ease: 'power3.out', clearProps: 'transform' });
            }
            const caption = root.querySelector(`[data-preview-caption="${active}"]`);
            if (caption) {
                gsap.fromTo(caption, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power3.out', clearProps: 'opacity,visibility,transform' });
            }
        },
        { scope, dependencies: [active] },
    );
}
