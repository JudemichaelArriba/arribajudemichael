/**
 * Real loading progress for the preloader. Heavy page pieces (the 3D keyboard) hold the preloader
 * and report how far they have got; the preloader reads the combined progress every frame and
 * reveals the page once every hold has finished. Every hold must be released; callers also cap
 * it with a timeout.
 */
interface HoldState {
    weight: number;
    progress: number;
}

export interface PreloaderHold {
    /** Reports progress between 0 and 1 (never goes backwards). */
    progress: (value: number) => void;
    /** Marks this piece as finished. Safe to call more than once. */
    release: () => void;
}

const holds = new Map<symbol, HoldState>();

/** Holds the preloader; `weight` is this piece's share of the overall progress. */
export function holdPreloader(weight = 1): PreloaderHold {
    const token = Symbol('preloader-hold');
    holds.set(token, { weight, progress: 0 });
    const progress = (value: number) => {
        const state = holds.get(token);
        if (!state) return;
        const next = Math.min(1, Math.max(state.progress, value));
        if (next === state.progress) return;
        state.progress = next;
    };
    return { progress, release: () => progress(1) };
}

/** Weighted progress of every hold so far, 0 to 1 (1 when nothing holds the preloader). */
export function preloaderProgress(): number {
    let total = 0;
    let done = 0;
    holds.forEach(({ weight, progress }) => {
        total += weight;
        done += weight * progress;
    });
    return total === 0 ? 1 : done / total;
}


let preloading = false;

/**
 * True while the preloader covers the page. It measures every ScrollTrigger once before it lifts,
 * so sections can skip their own `ScrollTrigger.refresh()` meanwhile (each one stalls the main
 * thread for a few hundred milliseconds while the page is still loading).
 */
export function isPreloading(): boolean {
    return preloading;
}

export function setPreloading(value: boolean) {
    preloading = value;
}
