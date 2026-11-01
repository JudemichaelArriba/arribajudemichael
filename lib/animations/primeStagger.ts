import gsap from 'gsap';

/**
 * Puts every target of a staggered, scroll-scrubbed reveal into its start state right away and
 * returns those `from` vars for the `fromTo`.
 *
 * GSAP only renders the first staggered target's `from` state when the tween is built; the rest
 * keep their natural (fully shown) state until the playhead reaches them. On a fresh load that
 * showed most of a reveal before it played, and it only looked right after scrolling back up.
 * Call it inside the `gsap.matchMedia` / `useGSAP` context so a revert restores the targets.
 *
 * A revert undoes the reveal after this set, which puts the primed state back (the reveal saw it
 * as the targets' starting style). The targets' own inline style is therefore restored in a
 * context cleanup, which GSAP runs after every animation is reverted. Without it, a re-run
 * (breakpoint change, Fast Refresh, React's dev double mount) read a primed `yPercent: 110` back
 * as a pixel `y`, and the reveal could never bring the text into view.
 */
export function primeStagger(targets: gsap.TweenTarget, from: gsap.TweenVars): gsap.TweenVars {
    // toArray follows the current context's scope, so string selectors match what the tween targets.
    const elements = gsap.utils.toArray<HTMLElement>(targets);
    const inlineStyles = elements.map((element) => element.getAttribute('style'));
    gsap.set(elements, { ...from });
    gsap.context(() => () => {
        // clearProps also resets GSAP's cached transforms, so the next run parses a clean element.
        gsap.set(elements, { clearProps: 'all' });
        elements.forEach((element, index) => {
            const style = inlineStyles[index];
            if (style === null) element.removeAttribute('style');
            else element.setAttribute('style', style);
        });
    });
    return { ...from };
}
