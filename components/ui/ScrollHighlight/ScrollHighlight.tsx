'use client';

import { useCallback, useMemo, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger, useGSAP);

type ScrollHighlightElement = 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';

interface ScrollHighlightContainerProps {
    as: ScrollHighlightElement;
    children: ReactNode;
    className: string;
    setContainer: (element: HTMLElement | null) => void;
}

function ScrollHighlightContainer({
    as,
    children,
    className,
    setContainer,
}: ScrollHighlightContainerProps) {
    if (as === 'div') return <div ref={setContainer} className={className}>{children}</div>;
    if (as === 'h1') return <h1 ref={setContainer} className={className}>{children}</h1>;
    if (as === 'h2') return <h2 ref={setContainer} className={className}>{children}</h2>;
    if (as === 'h3') return <h3 ref={setContainer} className={className}>{children}</h3>;
    if (as === 'h4') return <h4 ref={setContainer} className={className}>{children}</h4>;
    if (as === 'h5') return <h5 ref={setContainer} className={className}>{children}</h5>;
    if (as === 'h6') return <h6 ref={setContainer} className={className}>{children}</h6>;
    if (as === 'p') return <p ref={setContainer} className={className}>{children}</p>;
    return <span ref={setContainer} className={className}>{children}</span>;
}

interface ScrollHighlightProps {
    as?: ScrollHighlightElement;
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
    const setContainer = useCallback((element: HTMLElement | null) => {
        containerRef.current = element;
    }, []);

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

            // A freshly built scrubbed timeline sits at progress 0 until the next
            // scroll event. Without this, rebuilding after a theme switch resets
            // every character to `fromColor` and leaves it there until you scroll.
            timeline.scrollTrigger?.refresh();

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

    return (
        <ScrollHighlightContainer
            as={Component}
            className={`overflow-hidden text-center ${containerClassName}`}
            setContainer={setContainer}
        >
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
        </ScrollHighlightContainer>
    );
}
