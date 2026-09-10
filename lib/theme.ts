export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'jm-theme';
export const DEFAULT_THEME: Theme = 'dark';

export function isTheme(value: unknown): value is Theme {
    return value === 'light' || value === 'dark';
}

/**
 * Runs before paint so the stored theme is applied without a flash of the
 * default. Kept as a string because it is injected as an inline script.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t!=='light'&&t!=='dark'){t='${DEFAULT_THEME}';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','${DEFAULT_THEME}');}})();`;
