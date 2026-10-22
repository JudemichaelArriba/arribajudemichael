import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Re-applies an effect that an animation's `onUpdate` drives, after every ScrollTrigger refresh.
 *
 * A refresh (the preloader runs one; resizes and font loads do too) rewinds each animation to its
 * start with callbacks running, then restores it silently. Anything a callback drives — the
 * keyboard camera, the stacked Projects list, the GitHub calendar — would stay rewound, e.g. after
 * reloading the page part-way down. `sync` must read the animation's (restored) values and apply
 * them. Call it inside the `gsap.matchMedia` callback and return its cleanup from there.
 */
export function resyncAfterRefresh(sync: () => void): () => void {
    ScrollTrigger.addEventListener('refresh', sync);
    return () => ScrollTrigger.removeEventListener('refresh', sync);
}
