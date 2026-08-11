'use client';

import { useCallback, useMemo, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

type ScrollFloatElement = 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';

interface ScrollFloatContainerProps {
    as: ScrollFloatElement;
    children: ReactNode;
    className: string;
    setContainer: (element: HTMLElement | null) => void;
}

function ScrollFloatContainer({
    as,
    children,
    className,
    setContainer,
}: ScrollFloatContainerProps) {
    if (as === 'div') return <div ref={setContainer} className={className}>{children}</div>;
    if (as === 'h1') return <h1 ref={setContainer} className={className}>{children}</h1>;
    if (as === 'h3') return <h3 ref={setContainer} className={className}>{children}</h3>;
    if (as === 'h4') return <h4 ref={setContainer} className={className}>{children}</h4>;
    if (as === 'h5') return <h5 ref={setContainer} className={className}>{children}</h5>;
    if (as === 'h6') return <h6 ref={setContainer} className={className}>{children}</h6>;
    if (as === 'p') return <p ref={setContainer} className={className}>{children}</p>;
    if (as === 'span') return <span ref={setContainer} className={className}>{children}</span>;
    return <h2 ref={setContainer} className={className}>{children}</h2>;
}

interface ScrollFloatProps {
    as?: ScrollFloatElement;
    children: ReactNode;
    scrollContainerRef?: RefObject<HTMLElement | null>;
    containerClassName?: string;
    textClassName?: string;
    animationDuration?: number;
    ease?: string;
    settleEase?: string;
    scrollStart?: string;
    scrollEnd?: string;
    charStagger?: number;
    wordStagger?: number;
    playOnce?: boolean;
    highlightOnScroll?: boolean;
    highlightStart?: string;
    highlightEnd?: string;
    highlightScrub?: number;
    highlightDuration?: number;
    highlightCharStagger?: number;
    highlightFromColor?: string;
    highlightToColor?: string;
}

export default function ScrollFloat({
    as: Component = 'h2',
    children,
    scrollContainerRef,
    containerClassName = '',
    textClassName = '',
    animationDuration = 0.5,
    ease = 'power3.out',
    settleEase = 'back.out(1.4)',
    scrollStart = 'top bottom',
    scrollEnd = 'bottom top',
    charStagger = 0.05,
    wordStagger = 0.09,
    playOnce = true,
    highlightOnScroll = false,
    highlightStart = 'top 70%',
    highlightEnd = 'bottom 35%',
    highlightScrub = 0.65,
    highlightDuration = 0.18,
    highlightCharStagger = 0.025,
    highlightFromColor = '#626873',
    highlightToColor = 'var(--text)',
}: ScrollFloatProps) {
    const containerRef = useRef<HTMLElement>(null);
    const hasPlayedRef = useRef(false);
    const setContainer = useCallback((element: HTMLElement | null) => {
        containerRef.current = element;
    }, []);

    const words = useMemo(() => {
        const text = typeof children === 'string' ? children : '';
        return text.split(' ').filter(Boolean);
    }, [children]);

    useGSAP(
        () => {
            const el = containerRef.current;
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            if (!el) return;

            const scroller = scrollContainerRef?.current ?? window;
            const wordElements = gsap.utils.toArray<HTMLElement>('.scroll-float-word', el);
            const allChars = gsap.utils.toArray<HTMLElement>('.scroll-float-char', el);

            const createHighlightTimeline = () => {
                if (!highlightOnScroll) return null;

                const highlightTimeline = gsap.timeline({
                    scrollTrigger: {
                        trigger: el,
                        scroller,
                        start: highlightStart,
                        end: highlightEnd,
                        scrub: highlightScrub,
                        invalidateOnRefresh: true,
                    },
                });

                let nextWordStart = 0;

                wordElements.forEach((wordEl) => {
                    const chars = gsap.utils.toArray<HTMLElement>('.scroll-float-char', wordEl);
                    const wordDuration = highlightDuration
                        + Math.max(0, chars.length - 1) * highlightCharStagger;

                    highlightTimeline.to(
                        chars,
                        {
                            color: highlightToColor,
                            duration: highlightDuration,
                            ease: 'power1.out',
                            stagger: {
                                each: highlightCharStagger,
                                from: 'start',
                            },
                        },
                        nextWordStart
                    );

                    nextWordStart += Math.max(
                        highlightDuration * 0.7,
                        wordDuration * 0.72
                    );
                });

                return highlightTimeline;
            };

            if (highlightOnScroll) {
                gsap.set(wordElements, { clearProps: 'color' });
                gsap.set(allChars, { color: highlightFromColor });
            }

            if (prefersReducedMotion) {
                gsap.set(allChars, {
                    autoAlpha: 1,
                    color: highlightOnScroll ? highlightToColor : undefined,
                    yPercent: 0,
                    scaleX: 1,
                    scaleY: 1,
                    clearProps: 'transform,opacity,visibility',
                });

                return () => {
                    if (highlightOnScroll) {
                        gsap.set(allChars, { color: highlightFromColor });
                    }
                };
            }

            const setInitialState = () => {
                gsap.set(allChars, {
                    autoAlpha: 0,
                    yPercent: 78,
                    scaleY: 0.92,
                    scaleX: 0.98,
                    transformOrigin: '50% 100%',
                });
            };

            setInitialState();

            const riseDuration = animationDuration * 0.48;
            const settleDuration = animationDuration * 0.52;
            const settleOverlap = riseDuration * 0.4;

            const timeline = gsap.timeline({
                paused: true,
                defaults: { force3D: true, overwrite: 'auto' },
                onStart: () => el.classList.add('scroll-float-animating'),
                onComplete: () => el.classList.remove('scroll-float-animating'),
            });

            wordElements.forEach((wordEl, wordIndex) => {
                const chars = gsap.utils.toArray<HTMLElement>('.scroll-float-char', wordEl);
                const startTime = wordIndex * wordStagger;

                timeline.fromTo(
                    chars,
                    {
                        autoAlpha: 0,
                        yPercent: 78,
                        scaleY: 0.92,
                        scaleX: 0.98,
                        transformOrigin: '50% 100%',
                    },
                    {
                        autoAlpha: 1,
                        yPercent: -20,
                        scaleY: 1.06,
                        scaleX: 0.98,
                        duration: riseDuration,
                        ease,
                        immediateRender: false,
                        stagger: { amount: charStagger, from: 'start' },
                    },
                    startTime
                ).to(
                    chars,
                    {
                        yPercent: 0,
                        scaleY: 1,
                        scaleX: 1,
                        duration: settleDuration,
                        ease: settleEase,
                        stagger: { amount: charStagger * 0.45, from: 'start' },
                    },
                    startTime + riseDuration - settleOverlap
                );
            });

            const playBounce = (trigger?: ScrollTrigger) => {
                if (playOnce && hasPlayedRef.current) return;

                hasPlayedRef.current = true;
                if (!playOnce) setInitialState();
                timeline.invalidate().restart(true);

                if (playOnce) {
                    timeline.eventCallback('onComplete', () => {
                        el.classList.remove('scroll-float-animating');
                        trigger?.kill(false);
                    });
                }
            };

            const resetBounce = () => {
                if (playOnce) return;
                timeline.pause(0, true);
                setInitialState();
                el.classList.remove('scroll-float-animating');
            };

            const trigger = ScrollTrigger.create({
                trigger: el,
                scroller,
                start: scrollStart,
                end: scrollEnd,
                once: playOnce,
                onEnter: (self) => playBounce(self),
                onLeaveBack: resetBounce,
            });

            const highlightTimeline = createHighlightTimeline();

            return () => {
                trigger.kill(false);
                highlightTimeline?.scrollTrigger?.kill(false);
                highlightTimeline?.kill();
                if (highlightOnScroll) {
                    gsap.set(allChars, { color: highlightFromColor });
                }
                timeline.kill();
                gsap.killTweensOf(allChars);
                el.classList.remove('scroll-float-animating');
            };
        },
        {
            scope: containerRef,
            dependencies: [
                animationDuration,
                ease,
                settleEase,
                playOnce,
                scrollContainerRef,
                scrollStart,
                scrollEnd,
                charStagger,
                wordStagger,
                words,
                highlightOnScroll,
                highlightStart,
                highlightEnd,
                highlightScrub,
                highlightDuration,
                highlightCharStagger,
                highlightFromColor,
                highlightToColor,
            ],
        }
    );

    return (
        <ScrollFloatContainer
            as={Component}
            className={`overflow-hidden text-center ${containerClassName}`}
            setContainer={setContainer}
        >
        <span className={`inline-block max-w-full text-center leading-[1.08] ${textClassName}`}>
            {words.map((word, wordIndex) => (
                <span
                    className="scroll-float-word inline-block"
                    key={`word-${wordIndex}`}
                >
                    {Array.from(word).map((char, charIndex) => (
                        <span
                            className="scroll-float-char inline-block translate-z-0"
                            key={`${char}-${wordIndex}-${charIndex}`}
                            style={highlightOnScroll ? { color: highlightFromColor } : undefined}
                        >
                            {char}
                        </span>
                    ))}
                    {wordIndex < words.length - 1 ? '\u00A0' : ''}
                </span>
            ))}
        </span>
        </ScrollFloatContainer>
    );
}
