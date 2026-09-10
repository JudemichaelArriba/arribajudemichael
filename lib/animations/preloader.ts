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

export function buildPreloaderTimeline(
    refs: PreloaderRefs,
    { onReveal, onComplete }: PreloaderCallbacks
) {
    const tl = gsap.timeline({ onComplete });

    // Kept deliberately short — the hero entrance only starts once this clears,
    // so every extra second here is a second of blank screen.
    tl.to(refs.outline, {
        attr: { 'stroke-dashoffset': 0 },
        duration: 0.7,
        ease: 'power2.inOut',
    })
        .to(
            refs.color,
            { opacity: 1, duration: 0.25, ease: 'power2.out' },
            '-=0.3'
        )
        .to({}, { duration: 0.1 })
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
