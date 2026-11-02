export type ShowcasePanel = 'projects' | 'certificates';

/** Which side of the page a project's window sits on (and enters from). */
export type ScreenSide = 'left' | 'right';

/** Projects alternate sides: the first sits on the left, the next on the right, and so on. */
export const sideOf = (index: number): ScreenSide => (index % 2 === 0 ? 'left' : 'right');

export const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--site-bg)]';

/** Small uppercase metadata labels (numbers, categories, issuers). */
export const MONO_LABEL = 'font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.12em] text-[var(--faint)]';

export const padIndex = (value: number) => String(value).padStart(2, '0');

const counted = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

/**
 * "6 certificates from 4 issuers." An issuer is counted once however its name is spaced or
 * capitalised across certificates.
 */
export function certificateSummary(certificates: readonly { issuer: string }[]): string {
    const issuers = new Set(certificates.map(({ issuer }) => issuer.trim().replace(/\s+/g, ' ').toLowerCase()));
    return `${counted(certificates.length, 'certificate')} from ${counted(issuers.size, 'issuer')}.`;
}
