'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Subscribes to a CSS media query. The server snapshot is `false`, so the first client render
 * matches the HTML and the real value arrives right after hydration without a mismatch.
 */
export function useMediaQuery(query: string): boolean {
    const subscribe = useCallback(
        (onChange: () => void) => {
            if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
            const list = window.matchMedia(query);
            list.addEventListener('change', onChange);
            return () => list.removeEventListener('change', onChange);
        },
        [query],
    );
    const getSnapshot = useCallback(
        () => (typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches),
        [query],
    );
    return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
