'use client';

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useSyncExternalStore,
    type ReactNode,
} from 'react';
import { DEFAULT_THEME, THEME_STORAGE_KEY, isTheme, type Theme } from '@/lib/theme';
import ThemeTransition, { type ThemeTransitionHandle } from '@/components/theme/ThemeTransition';

interface ThemeContextValue {
    theme: Theme;
    /** `origin` (viewport coords) starts the ink wipe from where it was clicked. */
    setTheme: (theme: Theme, origin?: { x: number; y: number }) => void;
    toggleTheme: (origin?: { x: number; y: number }) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// The document element is the source of truth: an inline script sets it before
// paint, and reading it back through a store keeps React in sync without an
// effect that would cascade a second render.
function subscribe(onChange: () => void) {
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
}

function getSnapshot(): Theme {
    const applied = document.documentElement.getAttribute('data-theme');
    return isTheme(applied) ? applied : DEFAULT_THEME;
}

function getServerSnapshot(): Theme {
    return DEFAULT_THEME;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const transitionRef = useRef<ThemeTransitionHandle>(null);

    const setTheme = useCallback((next: Theme, origin?: { x: number; y: number }) => {
        // Picking the theme that is already applied is a no-op — it should not
        // replay the ink wipe.
        if (getSnapshot() === next) return;

        const apply = () => {
            const root = document.documentElement;
            // Transitions stay off until the new colours have been painted (see globals.css).
            root.setAttribute('data-theme-switching', '');
            root.setAttribute('data-theme', next);
            requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute('data-theme-switching')));
            try {
                window.localStorage.setItem(THEME_STORAGE_KEY, next);
            } catch {
                // Storage can be unavailable (private mode); the theme still applies.
            }
        };

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (!origin || prefersReducedMotion || !transitionRef.current) {
            apply();
            return;
        }

        transitionRef.current.run(next, origin, apply);
    }, []);

    const toggleTheme = useCallback(
        (origin?: { x: number; y: number }) => {
            setTheme(getSnapshot() === 'dark' ? 'light' : 'dark', origin);
        },
        [setTheme]
    );

    const value = useMemo(
        () => ({ theme, setTheme, toggleTheme }),
        [theme, setTheme, toggleTheme]
    );

    return (
        <ThemeContext.Provider value={value}>
            {children}
            <ThemeTransition ref={transitionRef} />
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used inside ThemeProvider');
    return context;
}
