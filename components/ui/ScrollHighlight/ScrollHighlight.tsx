'use client';

import { createElement, useMemo, useRef } from 'react';
import type { ElementType, ReactNode, RefObject } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface ScrollHighlightProps {
    as?: ElementType;
    children: ReactNode;
    scrollContainerRef?: RefObject<HTMLElement | null>;
    containerClassName?: string;
    textClassName?: string;
    scrollStart?: string;
    scrollEnd?: string;
    scrub?: number;
    duration?: number;
    charStagger?: number;
    fromColor?: string;
    toColor?: string;
}

export default function ScrollHighlight({
    as: Component = 'span',
    children,
    scrollContainerRef,
    containerClassName = '',
    textClassName = '',
    scrollStart = 'top 70%',
    scrollEnd = 'bottom 35%',
    scrub = 0.65,
    duration = 0.18,
    charStagger = 0.025,
    fromColor = '#626873',
    toColor = 'var(--text)',
}: ScrollHighlightProps) {
    const containerRef = useRef<HTMLElement>(null);

    const words = useMemo(() => {
        const text = typeof children === 'string' ? children : '';
        return text.split(' ').filter(Boolean);
    }, [children]);

    useGSAP(
        () => {
            const element = containerRef.current;
            if (!element) return;

            const scroller = scrollContainerRef?.current ?? window;
            const wordElements = gsap.utils.toArray<HTMLElement>('.scroll-highlight-word', element);
            const allChars = gsap.utils.toArray<HTMLElement>('.scroll-highlight-char', element);
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            gsap.set(wordElements, { clearProps: 'color' });
            gsap.set(allChars, { color: fromColor });

            if (prefersReducedMotion) {
                gsap.set(allChars, { color: toColor });

                return () => {
                    gsap.set(allChars, { color: fromColor });
                };
            }

            const timeline = gsap.timeline({
                scrollTrigger: {
                    trigger: element,
                    scroller,
                    start: scrollStart,
                    end: scrollEnd,
                    scrub,
                    invalidateOnRefresh: true,
                },
            });

            let nextWordStart = 0;

            wordElements.forEach((wordElement) => {
                const chars = gsap.utils.toArray<HTMLElement>('.scroll-highlight-char', wordElement);
                const wordDuration = duration + Math.max(0, chars.length - 1) * charStagger;

                timeline.to(
                    chars,
                    {
                        color: toColor,
                        duration,
                        ease: 'power1.out',
                        stagger: {
                            each: charStagger,
                            from: 'start',
                        },
                    },
                    nextWordStart
                );

                nextWordStart += Math.max(duration * 0.7, wordDuration * 0.72);
            });

            return () => {
                timeline.scrollTrigger?.kill(false);
                timeline.kill();
                gsap.set(allChars, { color: fromColor });
            };
        },
        {
            scope: containerRef,
            dependencies: [
                scrollContainerRef,
                scrollStart,
                scrollEnd,
                scrub,
                duration,
                charStagger,
                fromColor,
                toColor,
                words,
            ],
        }
    );

    return createElement(
        Component,
        { ref: containerRef, className: `overflow-hidden text-center ${containerClassName}` },
        <span className={`inline-block max-w-full text-center leading-[1.08] ${textClassName}`}>
            {words.map((word, wordIndex) => (
                <span className="scroll-highlight-word inline-block" key={`word-${wordIndex}`}>
                    {Array.from(word).map((char, charIndex) => (
                        <span
                            className="scroll-highlight-char inline-block translate-z-0"
                            key={`${char}-${wordIndex}-${charIndex}`}
                            style={{ color: fromColor }}
                        >
                            {char}
                        </span>
                    ))}
                    {wordIndex < words.length - 1 ? '\u00A0' : ''}
                </span>
            ))}
        </span>
    );
}
