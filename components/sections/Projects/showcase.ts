export type ShowcasePanel = 'projects' | 'certificates';

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
