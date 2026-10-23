'use client';

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

import { FINE_HOVER_QUERY } from '@/lib/breakpoints';
import { useMediaQuery } from '@/lib/useMediaQuery';

import ShowcasePreview from './ShowcasePreview';
import { FOCUS_RING, HOVER_INTENT_MS, MONO_LABEL, padIndex } from './showcase';

export interface IndexItem {
    id: string;
    title: string;
    meta: ReactNode;
    /** What the preview frame shows (a screenshot, or page 1 of a certificate). */
    visual: ReactNode;
    /** What the preview shows under the frame: description, details and the action. */
    caption: ReactNode;
}

interface Selection {
    active: number;
    previous: number;
}

/**
 * Desktop index: the titles as a list, the selected one previewed beside it. Hover (with a short
 * intent delay), focus, click and the arrow keys all select. Nothing here depends on the list's
 * length or the screen's height: the list scrolls normally and the preview stays in view.
 */
export default function ShowcaseIndex({ items, listLabel }: { items: IndexItem[]; listLabel: string }) {
    const previewId = useId();
    const fineHover = useMediaQuery(FINE_HOVER_QUERY);
    const [selection, setSelection] = useState<Selection>({ active: 0, previous: -1 });
    const [warmed, setWarmed] = useState<ReadonlySet<string>>(() => new Set(items[0] ? [items[0].id] : []));
    const intentTimer = useRef<number | undefined>(undefined);
    const buttons = useRef<(HTMLButtonElement | null)[]>([]);

    const warm = useCallback((id: string) => {
        setWarmed((current) => (current.has(id) ? current : new Set(current).add(id)));
    }, []);

    const select = useCallback((index: number) => {
        const item = items[index];
        if (!item) return;
        warm(item.id);
        setSelection((current) => (current.active === index ? current : { active: index, previous: current.active }));
    }, [items, warm]);

    useEffect(() => () => window.clearTimeout(intentTimer.current), []);

    // The list can shrink after a dashboard edit; never point past its end.
    const active = Math.min(selection.active, Math.max(items.length - 1, 0));
    const activeId = items[active]?.id;
    const mounted = activeId && !warmed.has(activeId) ? new Set(warmed).add(activeId) : warmed;

    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        const last = items.length - 1;
        const target = event.key === 'ArrowDown' ? Math.min(index + 1, last)
            : event.key === 'ArrowUp' ? Math.max(index - 1, 0)
                : event.key === 'Home' ? 0
                    : event.key === 'End' ? last
                        : null;
        if (target === null) return;
        event.preventDefault();
        buttons.current[target]?.focus();
    };

    return (
        <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start gap-14 xl:gap-16">
            <ol aria-label={listLabel} className="relative min-w-0 border-b border-[var(--hairline)]">
                {items.map((item, index) => {
                    const isActive = index === active;
                    return (
                        <li key={item.id} data-index-row className="relative">
                            <span aria-hidden="true" data-row-line className="absolute inset-x-0 top-0 h-px origin-left bg-[var(--hairline)]" />
                            <span
                                aria-hidden="true"
                                className={`absolute inset-x-0 top-0 h-px origin-left bg-[var(--text)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${isActive ? 'scale-x-100' : 'scale-x-0'}`}
                            />
                            <button
                                ref={(element) => {
                                    buttons.current[index] = element;
                                }}
                                type="button"
                                data-row-body
                                aria-controls={previewId}
                                aria-current={isActive ? 'true' : undefined}
                                onClick={() => select(index)}
                                onFocus={() => select(index)}
                                onPointerEnter={fineHover ? () => {
                                    warm(item.id);
                                    window.clearTimeout(intentTimer.current);
                                    intentTimer.current = window.setTimeout(() => select(index), HOVER_INTENT_MS);
                                } : undefined}
                                onPointerLeave={fineHover ? () => window.clearTimeout(intentTimer.current) : undefined}
                                onKeyDown={(event) => onKeyDown(event, index)}
                                className={`group grid w-full grid-cols-[2.5rem_minmax(0,1fr)_1.375rem] gap-x-2.5 py-[1.375rem] text-left short:py-4 ${FOCUS_RING}`}
                            >
                                <span className={`${MONO_LABEL} pt-[0.45em] ${isActive ? 'text-[var(--text)]' : ''}`}>{padIndex(index + 1)}</span>
                                <span className={`font-display text-[clamp(1.25rem,1.9vw,1.7rem)] font-bold leading-[1.12] tracking-[-0.025em] transition-colors duration-300 motion-reduce:transition-none ${isActive ? 'text-[var(--text)]' : 'text-[var(--muted)] group-hover:text-[var(--text)]'}`}>
                                    {item.title}
                                </span>
                                <ArrowRight
                                    aria-hidden="true"
                                    size={18}
                                    strokeWidth={1.8}
                                    className={`mt-1 transition-[transform,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${isActive ? 'translate-x-1 text-[var(--text)]' : 'text-[var(--faint)]'}`}
                                />
                                <span className={`col-start-2 mt-2 ${MONO_LABEL}`}>{item.meta}</span>
                            </button>
                        </li>
                    );
                })}
            </ol>

            <ShowcasePreview id={previewId} items={items} active={active} previous={selection.previous} warmed={mounted} />
        </div>
    );
}
