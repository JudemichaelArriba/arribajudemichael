import { BadgeCheck, PanelsTopLeft } from 'lucide-react';

import type { ShowcasePanel } from './showcase';

/** Shown instead of a list when a tab has nothing published, or its data could not be loaded. */
export default function ShowcaseState({ panel, unavailable }: { panel: ShowcasePanel; unavailable: boolean }) {
    const isProjects = panel === 'projects';
    const Icon = isProjects ? PanelsTopLeft : BadgeCheck;
    const noun = isProjects ? 'Projects' : 'Certificates';
    return (
        <article
            data-showcase-state
            className="flex flex-col items-center justify-center gap-3 border-y border-[var(--hairline)] py-16 text-center"
        >
            <Icon aria-hidden="true" size={24} strokeWidth={1.5} className="text-[var(--faint)]" />
            <h3 className="font-display text-lg font-bold tracking-[-0.02em] text-[var(--text)]">
                {unavailable ? `${noun} are temporarily unavailable.` : `${noun} are being prepared.`}
            </h3>
            <p className="max-w-md text-sm leading-relaxed text-[var(--muted)]">
                {unavailable ? 'Please check back shortly while this archive reconnects.' : 'Published items will appear here as they become available.'}
            </p>
        </article>
    );
}
