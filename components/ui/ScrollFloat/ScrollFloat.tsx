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

            if (!el || prefersReducedMotion) return;

            const scroller = scrollContainerRef?.current ?? window;
            const wordElements = gsap.utils.toArray<HTMLElement>('.scroll-float-word', el);
            const allChars = gsap.utils.toArray<HTMLElement>('.scroll-float-char', el);

            gsap.set(allChars, {
                autoAlpha: 0,
                yPercent: 78,
                scaleY: 0.92,
                scaleX: 0.98,
                transformOrigin: '50% 100%',
            });

            const riseDuration = animationDuration * 0.48;
            const settleDuration = animationDuration * 0.52;
            const settleOverlap = riseDuration * 0.4;

            const playBounce = (trigger?: ScrollTrigger) => {
                if (playOnce && hasPlayedRef.current) return;

                hasPlayedRef.current = true;
                el.classList.add('scroll-float-animating');

                const tl = gsap.timeline({
                    defaults: { force3D: true, overwrite: 'auto' },
                    onComplete: () => {
                        el.classList.remove('scroll-float-animating');
                        if (playOnce) trigger?.kill(false);
                    },
                });

                wordElements.forEach((wordEl, wordIndex) => {
                    const chars = gsap.utils.toArray<HTMLElement>('.scroll-float-char', wordEl);
                    const startTime = wordIndex * wordStagger;

                    tl.to(
                        chars,
                        {
                            autoAlpha: 1,
                            yPercent: -20,
                            scaleY: 1.06,
                            scaleX: 0.98,
                            duration: riseDuration,
                            ease,
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
            };

            const trigger = ScrollTrigger.create({
                trigger: el,
                scroller,
                start: scrollStart,
                end: scrollEnd,
                once: playOnce,
                onEnter: (self) => playBounce(self),
                onEnterBack: (self) => {
                    if (!playOnce) playBounce(self);
                },
            });

            return () => {
                trigger.kill(false);
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
            ],
        }
    );

    return createElement(
        Component,
        { ref: containerRef, className: `overflow-hidden text-center ${containerClassName}` },
        <span className={`inline-block max-w-full text-center leading-[1.08] ${textClassName}`}>
            {words.map((word, wordIndex) => (
                <span className="scroll-float-word inline-block" key={`word-${wordIndex}`}>
                    {Array.from(word).map((char, charIndex) => (
                        <span
                            className="scroll-float-char inline-block translate-z-0"
                            key={`${char}-${wordIndex}-${charIndex}`}
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
