/**
 * Real loading progress for the preloader. Heavy page pieces (the 3D keyboard) hold the preloader
 * and report how far they have got; the preloader draws its logo by the combined progress and
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
const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((listener) => listener());
}

/** Holds the preloader; `weight` is this piece's share of the overall progress. */
export function holdPreloader(weight = 1): PreloaderHold {
    const token = Symbol('preloader-hold');
    holds.set(token, { weight, progress: 0 });
    notify();
    const progress = (value: number) => {
        const state = holds.get(token);
        if (!state) return;
        const next = Math.min(1, Math.max(state.progress, value));
        if (next === state.progress) return;
        state.progress = next;
        notify();
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

/** Calls `listener` whenever a hold is added or reports progress. Returns an unsubscribe. */
export function subscribePreloaderProgress(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
