/**
 * Scroll restoration for a page whose height is only final once its pinned sections are measured.
 *
 * The browser restores the scroll position on reload before the pins and streamed sections exist,
 * so a reload part-way down lands thousands of pixels too high. The position is remembered when the
 * page is left and put back by the preloader, after the full page is measured and before the curtain
 * lifts. Only for reloads and back/forward; ordinary links and #anchors are left alone.
 */
const STORAGE_KEY = 'jm-scroll-position';

interface SavedPosition {
    path: string;
    y: number;
}

/** Takes over from the browser and saves the position whenever the page is left. Returns a cleanup. */
export function rememberScrollPosition(): () => void {
    try {
        history.scrollRestoration = 'manual';
    } catch {
        // Not supported: the browser keeps restoring on its own.
    }
    const save = () => {
        try {
            const saved: SavedPosition = { path: location.pathname, y: Math.round(window.scrollY) };
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        } catch {
            // Storage unavailable (private mode): a reload simply starts at the top.
        }
    };
    window.addEventListener('pagehide', save);
    return () => window.removeEventListener('pagehide', save);
}

/** The position to return to after a reload or back/forward visit of this page, if any (read once). */
export function takeSavedScrollPosition(): number | null {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_KEY);
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        if (!raw || !navigation || (navigation.type !== 'reload' && navigation.type !== 'back_forward')) return null;
        const saved = JSON.parse(raw) as Partial<SavedPosition>;
        if (saved.path !== location.pathname || typeof saved.y !== 'number' || !Number.isFinite(saved.y) || saved.y <= 0) return null;
        return saved.y;
    } catch {
        return null;
    }
}
