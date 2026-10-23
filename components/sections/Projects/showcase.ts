export type ShowcasePanel = 'projects' | 'certificates';

export const SHOWCASE_PANELS: readonly ShowcasePanel[] = ['projects', 'certificates'];

export const PANEL_LABELS: Record<ShowcasePanel, string> = {
    projects: 'Projects',
    certificates: 'Certificates',
};

/** Stable ids shared by the tabs and the single panel they control. */
export const SHOWCASE_PANEL_ID = 'showcase-panel';
export const showcaseTabId = (panel: ShowcasePanel) => `showcase-tab-${panel}`;

/**
 * Pointer hover waits this long before swapping the desktop preview, so sweeping across the list
 * does not flicker through every item. The visual starts loading the moment the pointer arrives.
 */
export const HOVER_INTENT_MS = 80;

export const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--site-bg)]';

/** Small uppercase metadata labels (numbers, categories, issuers). */
export const MONO_LABEL = 'font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.12em] text-[var(--faint)]';

export const padIndex = (value: number) => String(value).padStart(2, '0');

/** "Issued by Aces Tagum College, Inc." — an issuer that already ends with a full stop keeps one. */
export const issuedBy = (issuer: string) => `Issued by ${issuer.trim().replace(/\.+$/, '')}.`;
