/**
 * Lets heavy page pieces (the 3D keyboard) keep the preloader up until they are ready, so the
 * page is revealed in one smooth step instead of stuttering while they finish loading.
 * Every hold must be released; callers also cap it with a timeout.
 */
const holds = new Set<symbol>();
const listeners = new Set<() => void>();

/** Keeps the preloader up; call the returned function (safe to call more than once) to release. */
export function holdPreloader(): () => void {
    const token = Symbol('preloader-hold');
    holds.add(token);
    return () => {
        if (!holds.delete(token) || holds.size) return;
        const waiting = [...listeners];
        listeners.clear();
        waiting.forEach((listener) => listener());
    };
}

/** Runs `listener` once nothing holds the preloader (right away if nothing does). Returns a cancel. */
export function whenPreloaderReleased(listener: () => void): () => void {
    if (!holds.size) {
        listener();
        return () => undefined;
    }
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
