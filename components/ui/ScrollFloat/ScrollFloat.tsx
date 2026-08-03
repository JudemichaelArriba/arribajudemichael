'use client';

import { createElement, useMemo, useRef } from 'react';
import type { ElementType, ReactNode, RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface ScrollFloatProps {
    as?: ElementType;
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
    highlightFromColor = '#626873',
    highlightToColor = 'var(--text)',
}: ScrollFloatProps) {
    const containerRef = useRef<HTMLElement>(null);
    const hasPlayedRef = useRef(false);

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

                wordElements.forEach((wordEl, wordIndex) => {
                    const chars = gsap.utils.toArray<HTMLElement>('.scroll-float-char', wordEl);
                    highlightTimeline.to(
                        chars,
                        {
                            color: highlightToColor,
                            duration: 0.12,
                            ease: 'none',
                        },
                        wordIndex * 0.14
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
                    yPercent: 0,
                    scaleX: 1,
                    scaleY: 1,
                    clearProps: 'transform,opacity,visibility',
                });
                const highlightTimeline = createHighlightTimeline();

                return () => {
                    highlightTimeline?.scrollTrigger?.kill(false);
                    highlightTimeline?.kill();
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
                highlightFromColor,
                highlightToColor,
            ],
        }
    );

    return createElement(
        Component,
        { ref: containerRef, className: `overflow-hidden text-center ${containerClassName}` },
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
    );
}