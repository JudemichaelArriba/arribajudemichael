import gsap from 'gsap';

export const PRELOADER_DASH_LENGTH = 500;

interface PreloaderRefs {
    overlay: HTMLDivElement | null;
    outline: SVGTextElement | null;
    color: SVGTextElement | null;
}

interface PreloaderCallbacks {
    onComplete: () => void;
}

export function buildPreloaderTimeline(refs: PreloaderRefs, { onComplete }: PreloaderCallbacks) {
    const tl = gsap.timeline({ onComplete });

    tl.to(refs.outline, {
        attr: { 'stroke-dashoffset': 0 },
        duration: 1.5,
        ease: 'power2.inOut',
    })
        .to(
            refs.color,
            { opacity: 1, duration: 0.5, ease: 'power2.out' },
            '-=0.6'
        )
        .to({}, { duration: 0.35 })
        .to(refs.outline, {
            attr: { 'stroke-dashoffset': PRELOADER_DASH_LENGTH },
            duration: 1.0,
            ease: 'power2.inOut',
        })
        .to(
            refs.color,
            { opacity: 0, duration: 0.9, ease: 'power2.inOut' },
            '<'
        )
        .to({}, { duration: 0.15 })
        .to(refs.overlay, { opacity: 0, duration: 0.7, ease: 'power2.out' });

    return tl;
}