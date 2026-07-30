'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import RollingText from '@/components/ui/RollingText';
import styles from './LineSidebar.module.css';

type Falloff = 'linear' | 'smooth' | 'sharp';

type SidebarStyle = CSSProperties & Record<`--${string}`, string | number>;

export interface LineSidebarItem {
    id: string;
    label: string;
}

interface LineSidebarProps {
    items: LineSidebarItem[];
    accentColor?: string;
    textColor?: string;
    markerColor?: string;
    showIndex?: boolean;
    showMarker?: boolean;
    proximityRadius?: number;
    maxShift?: number;
    falloff?: Falloff;
    markerLength?: number;
    markerGap?: number;
    tickScale?: number;
    scaleTick?: boolean;
    itemGap?: number;
    fontSize?: number;
    smoothing?: number;
    defaultActive?: number | null;
    onItemClick?: (index: number, item: LineSidebarItem) => void;
    className?: string;
}

const FALLOFF_CURVES: Record<Falloff, (progress: number) => number> = {
    linear: (progress) => progress,
    smooth: (progress) => progress * progress * (3 - 2 * progress),
    sharp: (progress) => progress * progress * progress,
};

export default function LineSidebar({
    items,
    accentColor = '#A855F7',
    textColor = '#c4c4c4',
    markerColor = '#6c6c6c',
    showIndex = true,
    showMarker = true,
    proximityRadius = 100,
    maxShift = 30,
    falloff = 'smooth',
    markerLength = 60,
    markerGap = 0,
    tickScale = 0.5,
    scaleTick = true,
    itemGap = 20,
    fontSize = 1.1,
    smoothing = 100,
    defaultActive = null,
    onItemClick,
    className = '',
}: LineSidebarProps) {
    const listRef = useRef<HTMLUListElement>(null);
    const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
    const targetsRef = useRef<number[]>([]);
    const currentRef = useRef<number[]>([]);
    const rafRef = useRef<number | null>(null);
    const lastRef = useRef(0);
    const smoothingRef = useRef(smoothing);
    const activeRef = useRef<number | null>(defaultActive);
    const runFrameRef = useRef<(now: number) => void>(() => undefined);
    const [activeIndex, setActiveIndex] = useState<number | null>(defaultActive);

    const runFrame = useCallback((now: number) => {
        const dt = Math.min((now - lastRef.current) / 1000, 0.05);
        lastRef.current = now;
        const tau = Math.max(smoothingRef.current, 1) / 1000;
        const k = 1 - Math.exp(-dt / tau);

        let moving = false;

        itemRefs.current.forEach((el, index) => {
            if (!el) return;

            const target = Math.max(targetsRef.current[index] || 0, activeRef.current === index ? 1 : 0);
            const current = currentRef.current[index] || 0;
            const next = current + (target - current) * k;
            const settled = Math.abs(target - next) < 0.0015;
            const value = settled ? target : next;

            currentRef.current[index] = value;
            el.style.setProperty('--effect', value.toFixed(4));
            if (!settled) moving = true;
        });

        rafRef.current = moving ? requestAnimationFrame(runFrameRef.current) : null;
    }, []);

    const startLoop = useCallback(() => {
        if (rafRef.current !== null) return;
        lastRef.current = performance.now();
        rafRef.current = requestAnimationFrame(runFrameRef.current);
    }, []);

    useEffect(() => {
        runFrameRef.current = runFrame;
    }, [runFrame]);

    useEffect(() => {
        activeRef.current = activeIndex;
        smoothingRef.current = smoothing;
        startLoop();
    }, [activeIndex, smoothing, startLoop]);

    const handlePointerMove = useCallback(
        (event: PointerEvent<HTMLUListElement>) => {
            const list = listRef.current;
            if (!list) return;

            const rect = list.getBoundingClientRect();
            const pointerY = event.clientY - rect.top;
            const ease = FALLOFF_CURVES[falloff] ?? FALLOFF_CURVES.linear;

            itemRefs.current.forEach((el, index) => {
                if (!el) return;

                const center = el.offsetTop + el.offsetHeight / 2;
                const distance = Math.abs(pointerY - center);
                targetsRef.current[index] = ease(Math.max(0, 1 - distance / proximityRadius));
            });

            startLoop();
        },
        [falloff, proximityRadius, startLoop]
    );

    const handlePointerLeave = useCallback(() => {
        targetsRef.current = itemRefs.current.map(() => 0);
        startLoop();
    }, [startLoop]);

    const handleClick = useCallback(
        (index: number, item: LineSidebarItem) => {
            setActiveIndex(index);
            onItemClick?.(index, item);
        },
        [onItemClick]
    );

    useEffect(
        () => () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        },
        []
    );

    const classes = [
        styles.lineSidebar,
        showMarker ? styles.withMarkers : '',
        scaleTick ? styles.scaleTick : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <nav
            className={classes}
            style={
                {
                    '--accent-color': accentColor,
                    '--text-color': textColor,
                    '--marker-color': markerColor,
                    '--marker-length': `${markerLength}px`,
                    '--marker-gap': `${markerGap}px`,
                    '--tick-scale': tickScale,
                    '--max-shift': `${maxShift}px`,
                    '--item-gap': `${itemGap}px`,
                    '--font-size': `${fontSize}rem`,
                    '--smoothing': `${smoothing}ms`,
                } as SidebarStyle
            }
            aria-label="Portfolio navigation"
        >
            <ul ref={listRef} className={styles.list} onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave}>
                {items.map((item, index) => (
                    <li
                        key={item.id}
                        ref={(el) => {
                            itemRefs.current[index] = el;
                        }}
                        className={styles.item}
                        aria-current={activeIndex === index ? 'true' : undefined}
                    >
                        <button className={styles.button} type="button" onClick={() => handleClick(index, item)}>
                            {showMarker && <span className={styles.marker} aria-hidden="true" />}
                            <span className={styles.label}>
                                {showIndex && <span className={styles.index}>{String(index + 1).padStart(2, '0')}</span>}
                                <RollingText className={styles.text}>{item.label}</RollingText>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
