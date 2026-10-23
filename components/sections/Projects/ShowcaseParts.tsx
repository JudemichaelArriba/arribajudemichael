import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';

import { FOCUS_RING } from './showcase';

interface ShowcaseLinkProps {
    href: string;
    /** Full accessible name; the visible text alone ("Open PDF") would be ambiguous in a list. */
    label: string;
    variant: 'button' | 'text';
    children: ReactNode;
}

/** Opens a repository or PDF in a new tab without exposing this page to it. */
export function ShowcaseLink({ href, label, variant, children }: ShowcaseLinkProps) {
    const shape = variant === 'button'
        ? 'min-h-12 gap-2.5 border border-[var(--text)] px-5 font-bold hover:bg-[var(--inverse-bg)] hover:text-[var(--inverse-text)] short:min-h-10'
        : 'gap-2 border-b border-[var(--hairline-strong)] py-1.5 font-semibold hover:border-[var(--text)]';
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className={`group inline-flex items-center font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text)] transition-colors duration-300 motion-reduce:transition-none ${shape} ${FOCUS_RING}`}
        >
            {children}
            <ArrowUpRight aria-hidden="true" size={14} strokeWidth={2} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </a>
    );
}

/**
 * A certificate page lying on the surface: an inset white sheet with a soft shadow. The preview
 * inside contain-fits page 1, so the document is never cropped whatever the frame's shape.
 */
export function PaperFrame({ children }: { children: ReactNode }) {
    return (
        <div className="absolute inset-0 bg-[var(--surface-muted)]">
            <div className="absolute inset-[7%] bg-white shadow-[var(--shadow-lift)]">{children}</div>
        </div>
    );
}
