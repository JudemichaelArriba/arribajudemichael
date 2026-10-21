import gsap from 'gsap';

export const PRELOADER_DASH_LENGTH = 500;

interface PreloaderRefs {
    overlay: HTMLDivElement | null;
    outline: SVGTextElement | null;
    color: SVGTextElement | null;
}

interface PreloaderCallbacks {
    /**
     * Fires as the overlay starts fading, not when it finishes — the page
     * underneath animates in *with* the reveal rather than after a dead beat.
     */
    onReveal: () => void;
    onComplete: () => void;
}

/**
 * Draws the JM outline as far as the page has loaded (`progress` 0–1). Each call eases on from
 * where the stroke is, so the logo is built up as the loading actually happens.
 */
export function drawPreloaderProgress(outline: SVGTextElement | null, progress: number, onComplete?: () => void) {
    return gsap.to(outline, {
        attr: { 'stroke-dashoffset': PRELOADER_DASH_LENGTH * (1 - progress) },
        duration: progress >= 1 ? 0.45 : 0.6,
        ease: 'power2.out',
        overwrite: true,
        onComplete,
    });
}

/** Once fully drawn: the letters fill in, then the outline and fill clear and the curtain lifts. */
export function buildPreloaderReveal(
    refs: PreloaderRefs,
    { onReveal, onComplete }: PreloaderCallbacks
) {
    const tl = gsap.timeline({ onComplete });

    // Kept deliberately short — the hero entrance only starts once this clears.
    tl.to(refs.color, { opacity: 1, duration: 0.25, ease: 'power2.out' })
        .to({}, { duration: 0.15 })
        .to(refs.outline, {
            attr: { 'stroke-dashoffset': PRELOADER_DASH_LENGTH },
            duration: 0.42,
            ease: 'power2.inOut',
        })
        .to(
            refs.color,
            { opacity: 0, duration: 0.4, ease: 'power2.inOut' },
            '<'
        )
        .call(onReveal)
        .to(refs.overlay, { opacity: 0, duration: 0.4, ease: 'power2.out' }, '+=0.05');

    return tl;
}
