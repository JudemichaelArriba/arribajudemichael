'use client';

import { useMemo, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import styles from './ScrollFloat.module.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface ScrollFloatProps {
    children: ReactNode;
    scrollContainerRef?: RefObject<HTMLElement | null>;
    containerClassName?: string;
    textClassName?: string;
    animationDuration?: number;
    ease?: string;
    scrollStart?: string;
    scrollEnd?: string;
    stagger?: number;
}

export default function ScrollFloat({
    children,
    scrollContainerRef,
    containerClassName = '',
    textClassName = '',
    animationDuration = 0.9,
    ease = 'back.inOut(1.7)',
    scrollStart = 'top bottom-=10%',
    scrollEnd = 'center center',
    stagger = 0.018,
}: ScrollFloatProps) {
    const containerRef = useRef<HTMLHeadingElement>(null);

    const splitText = useMemo(() => {
        const text = typeof children === 'string' ? children : '';

        return Array.from(text).map((char, index) => (
            <span className={styles.char} key={`${char}-${index}`}>
                {char === ' ' ? '\u00A0' : char}
            </span>
        ));
    }, [children]);

    useGSAP(
        () => {
            const el = containerRef.current;
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            if (!el || prefersReducedMotion) return;

            const scroller = scrollContainerRef?.current ?? window;
            const charElements = gsap.utils.toArray<HTMLElement>(`.${styles.char}`, el);

            gsap.fromTo(
                charElements,
                {
                    autoAlpha: 0,
                    yPercent: 90,
                    scaleY: 1.8,
                    scaleX: 0.82,
                    transformOrigin: '50% 0%',
                },
                {
                    autoAlpha: 1,
                    yPercent: 0,
                    scaleY: 1,
                    scaleX: 1,
                    duration: animationDuration,
                    ease,
                    stagger,
                    force3D: true,
                    overwrite: 'auto',
                    scrollTrigger: {
                        trigger: el,
                        scroller,
                        start: scrollStart,
                        end: scrollEnd,
                        scrub: 0.65,
                    },
                }
            );
        },
        {
            scope: containerRef,
            dependencies: [animationDuration, ease, scrollContainerRef, scrollStart, scrollEnd, stagger],
        }
    );

    return (
        <h2 ref={containerRef} className={`${styles.scrollFloat} ${containerClassName}`}>
            <span className={`${styles.scrollFloatText} ${textClassName}`}>{splitText}</span>
        </h2>
    );
}
