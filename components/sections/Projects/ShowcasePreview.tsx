'use client';

import { useRef } from 'react';

import type { IndexItem } from './ShowcaseIndex';
import { MONO_LABEL, padIndex } from './showcase';
import { usePreviewSwap } from './usePreviewSwap';

interface ShowcasePreviewProps {
    id: string;
    items: IndexItem[];
    active: number;
    /** The item shown before `active`; it stays under the incoming wipe. */
    previous: number;
    /** Items whose visual has been requested (active, hovered or focused at least once). */
    warmed: ReadonlySet<string>;
}

/**
 * The desktop preview beside the index. It stays in view while the list scrolls and shows the
 * selected item: its visual in a fixed 16:10 frame and its caption below.
 *
 * Visuals mount lazily (only once wanted) and then stay mounted, so going back to an item never
 * downloads or repaints it again. Every caption is rendered in the same grid cell, so the block
 * is always as tall as the longest one and switching items never moves anything around it.
 */
export default function ShowcasePreview({ id, items, active, previous, warmed }: ShowcasePreviewProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    usePreviewSwap(rootRef, active);

    return (
        <div ref={rootRef} id={id} data-preview className="sticky top-[calc(var(--nav-height,80px)+1.5rem)] min-w-0">
            <div
                data-preview-frame
                className="relative aspect-[16/10] w-full overflow-hidden border border-[var(--hairline)] bg-[var(--surface-muted)] short:max-h-[calc(100svh-var(--nav-height,80px)-16rem)]"
            >
                <div data-preview-stage className="absolute inset-0">
                    {items.map((item, index) => warmed.has(item.id) && (
                        <div
                            key={item.id}
                            data-preview-layer={index}
                            aria-hidden={index !== active}
                            className={`absolute inset-0 bg-[var(--surface-muted)] ${index === active ? 'z-[2]' : index === previous ? 'z-[1]' : 'z-0'}`}
                        >
                            {item.visual}
                        </div>
                    ))}
                </div>
                <span aria-hidden="true" className={`absolute left-3 top-3 z-[3] flex items-center gap-1 border border-[var(--hairline)] bg-[var(--site-bg)] px-2 py-1.5 tabular-nums ${MONO_LABEL} text-[10px] leading-none text-[var(--text)]`}>
                    <span className="inline-block overflow-hidden">
                        <span data-preview-count className="inline-block">{padIndex(active + 1)}</span>
                    </span>
                    <span>/ {padIndex(items.length)}</span>
                </span>
            </div>

            <div className="mt-6 grid short:mt-4">
                {items.map((item, index) => (
                    <div
                        key={item.id}
                        data-preview-caption={index}
                        aria-hidden={index !== active}
                        inert={index !== active}
                        className={`[grid-area:1/1] ${index === active ? '' : 'invisible'}`}
                    >
                        {item.caption}
                    </div>
                ))}
            </div>
        </div>
    );
}
