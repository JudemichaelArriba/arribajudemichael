/**
 * Re-arms a section reveal whenever the section sits entirely below the
 * viewport.
 *
 * `onLeaveBack` alone is not enough: if a trigger fires early — stale start
 * positions after a font swap, or while the preloader overlay is still up — the
 * reveal is spent and never resets, so scrolling down to the section shows
 * nothing moving. Watching for "section is below the fold again" restores the
 * armed state in exactly those cases.
 *
 * Returns a disconnect function for the effect cleanup.
 */
export function rearmOnExitBelow(section: Element, reset: () => void) {
    const observer = new IntersectionObserver(
        ([entry]) => {
            if (!entry.isIntersecting && entry.boundingClientRect.top >= window.innerHeight - 16) {
                reset();
            }
        },
        { rootMargin: '0px 0px -16px 0px', threshold: 0 }
    );

    observer.observe(section);
    return () => observer.disconnect();
}
