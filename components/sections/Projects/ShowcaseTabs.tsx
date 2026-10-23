'use client';

import { useRef, type KeyboardEvent } from 'react';

import {
    FOCUS_RING,
    PANEL_LABELS,
    SHOWCASE_PANELS,
    SHOWCASE_PANEL_ID,
    padIndex,
    showcaseTabId,
    type ShowcasePanel,
} from './showcase';

interface ShowcaseTabsProps {
    value: ShowcasePanel;
    onChange: (panel: ShowcasePanel) => void;
    counts: Record<ShowcasePanel, number>;
    /** Called when the visitor shows intent to open Certificates, to fetch the PDF renderer early. */
    onCertificatesIntent?: () => void;
}

/**
 * The tab words double as the section heading: the open tab is in ink, the other in grey.
 * WAI-ARIA tabs with automatic activation: arrow keys, Home and End move and select.
 */
export default function ShowcaseTabs({ value, onChange, counts, onCertificatesIntent }: ShowcaseTabsProps) {
    const tabs = useRef<Partial<Record<ShowcasePanel, HTMLButtonElement | null>>>({});

    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        const last = SHOWCASE_PANELS.length - 1;
        const target = event.key === 'ArrowRight' ? (index + 1) % SHOWCASE_PANELS.length
            : event.key === 'ArrowLeft' ? (index + last) % SHOWCASE_PANELS.length
                : event.key === 'Home' ? 0
                    : event.key === 'End' ? last
                        : null;
        if (target === null) return;
        event.preventDefault();
        const panel = SHOWCASE_PANELS[target];
        tabs.current[panel]?.focus();
        onChange(panel);
    };

    return (
        // Sized from the column's own width (container units), so both words always fit on one line.
        // The words and the em gap measure about 9.4em; the two fixed-size counters add about 2.5rem,
        // which is set aside before dividing. Wrapping stays allowed as a last resort.
        <div className="@container min-w-0">
            <div role="tablist" aria-label="Projects and certificates" className="flex flex-wrap items-start gap-x-[0.45em] gap-y-1 font-display text-[clamp(1.75rem,calc((100cqi-2.75rem)/9.6),5.75rem)] font-bold leading-[0.95] tracking-[-0.045em] short:text-[clamp(1.75rem,calc((100cqi-2.75rem)/12),4.5rem)]">
                {SHOWCASE_PANELS.map((panel, index) => {
                    const selected = panel === value;
                    const intent = panel === 'certificates' ? onCertificatesIntent : undefined;
                    return (
                        <button
                            key={panel}
                            ref={(element) => {
                                tabs.current[panel] = element;
                            }}
                            type="button"
                            role="tab"
                            id={showcaseTabId(panel)}
                            aria-selected={selected}
                            aria-controls={SHOWCASE_PANEL_ID}
                            tabIndex={selected ? 0 : -1}
                            onClick={() => onChange(panel)}
                            onKeyDown={(event) => onKeyDown(event, index)}
                            onPointerEnter={intent}
                            onFocus={intent}
                            onTouchStart={intent}
                            className={`transition-colors duration-300 motion-reduce:transition-none ${selected ? 'text-[var(--text)]' : 'text-[var(--faint)] hover:text-[var(--muted)]'} ${FOCUS_RING}`}
                        >
                            <span data-showcase-word className="inline-flex items-start gap-1.5">
                                {PANEL_LABELS[panel]}
                                <span aria-hidden="true" className="mt-[0.35rem] font-mono text-[10px] font-medium leading-none tracking-[0.1em] text-[var(--faint)]">
                                    {padIndex(counts[panel])}
                                </span>
                                <span className="sr-only">{` (${counts[panel]})`}</span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
