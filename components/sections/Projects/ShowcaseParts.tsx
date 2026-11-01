import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';

import { FOCUS_RING } from './showcase';

interface ShowcaseLinkProps {
    href: string;
    /** Full accessible name; the visible text alone ("Repository") would be ambiguous in a list. */
    label: string;
    children: ReactNode;
}

/** A square outlined button that opens a repository in a new tab without exposing this page to it. */
export function ShowcaseLink({ href, label, children }: ShowcaseLinkProps) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className={`group inline-flex min-h-12 items-center gap-2.5 border border-[var(--text)] px-5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text)] transition-colors duration-300 hover:bg-[var(--inverse-bg)] hover:text-[var(--inverse-text)] motion-reduce:transition-none short:min-h-10 ${FOCUS_RING}`}
        >
            {children}
            <ArrowUpRight aria-hidden="true" size={14} strokeWidth={2} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </a>
    );
}
