import gsap from 'gsap';

/**
 * Puts every target of a staggered, scroll-scrubbed reveal into its start state right away and
 * returns those `from` vars for the `fromTo`.
 *
 * GSAP only renders the first staggered target's `from` state when the tween is built; the rest
 * keep their natural (fully shown) state until the playhead reaches them. On a fresh load that
 * showed most of a reveal before it played, and it only looked right after scrolling back up.
 * Call it inside the `gsap.matchMedia` / `useGSAP` context so a revert restores the targets.
 */
export function primeStagger(targets: gsap.TweenTarget, from: gsap.TweenVars): gsap.TweenVars {
    gsap.set(targets, { ...from });
    return { ...from };
}
