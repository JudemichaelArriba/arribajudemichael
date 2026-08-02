'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { gsap } from 'gsap';
import './AboutBento.css';

export interface AboutCardData {
    code: string;
    label: string;
    value: string;
}

interface AboutBentoProps {
    cards: AboutCardData[];
    enableStars?: boolean;
    enableSpotlight?: boolean;
    enableBorderGlow?: boolean;
    disableAnimations?: boolean;
    spotlightRadius?: number;
    particleCount?: number;
    glowColor?: string;
    clickEffect?: boolean;
}

const DEFAULT_PARTICLE_COUNT = 12;
const DEFAULT_SPOTLIGHT_RADIUS = 320;
const DEFAULT_GLOW_COLOR = '195, 109, 252';
const BENTO_GRID_CLASS = 'about-bento-section grid w-full grid-cols-1 gap-3 sm:grid-cols-2';
const BENTO_CARD_CLASS =
    'about-bento-card relative flex min-h-[104px] flex-col justify-center gap-[0.72em] overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.04] px-[1.25em] py-[1.2em] transition-[transform,border-color,background] duration-[220ms] ease-[ease] hover:-translate-y-0.5 hover:border-[rgba(195,109,252,0.18)] hover:bg-white/[0.055] max-sm:min-h-0 max-sm:p-[1.05em] motion-reduce:transition-none motion-reduce:hover:translate-y-0 [@media(hover:none)]:hover:translate-y-0';
const BENTO_META_CLASS = 'flex items-baseline gap-[0.6em]';
const BENTO_CODE_CLASS = 'font-mono text-[10px] text-[var(--signal)] opacity-65';
const BENTO_LABEL_CLASS = 'font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] opacity-50';
const BENTO_VALUE_CLASS = 'text-[clamp(0.95rem,1.45vw,1.06rem)] font-[550] leading-[1.38] text-[var(--text)]';

const useInteractiveMotion = () => {
    const [canUseMotion, setCanUseMotion] = useState(false);

    useEffect(() => {
        const query = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
        const update = () => setCanUseMotion(query.matches);

        update();
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);

    return canUseMotion;
};

const createParticleElement = (x: number, y: number, color: string): HTMLDivElement => {
    const el = document.createElement('div');
    el.className = 'about-particle';
    el.style.cssText = `
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(${color}, 1);
    box-shadow: 0 0 6px rgba(${color}, 0.6);
    pointer-events: none;
    z-index: 100;
    left: ${x}px;
    top: ${y}px;
  `;
    return el;
};

const calculateSpotlightValues = (radius: number) => ({
    proximity: radius * 0.42,
    fadeDistance: radius * 0.72,
});

const updateCardGlowProperties = (card: HTMLElement, pointerX: number, pointerY: number, glow: number, radius: number) => {
    const rect = card.getBoundingClientRect();
    const relativeX = ((pointerX - rect.left) / rect.width) * 100;
    const relativeY = ((pointerY - rect.top) / rect.height) * 100;

    card.style.setProperty('--glow-x', `${relativeX}%`);
    card.style.setProperty('--glow-y', `${relativeY}%`);
    card.style.setProperty('--glow-intensity', glow.toString());
    card.style.setProperty('--glow-radius', `${radius}px`);
};

const AboutParticleCard: React.FC<{
    children: React.ReactNode;
    className?: string;
    disableAnimations?: boolean;
    particleCount?: number;
    glowColor?: string;
    clickEffect?: boolean;
}> = ({
    children,
    className = '',
    disableAnimations = false,
    particleCount = DEFAULT_PARTICLE_COUNT,
    glowColor = DEFAULT_GLOW_COLOR,
    clickEffect = false,
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const particlesRef = useRef<HTMLDivElement[]>([]);
    const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const isHoveredRef = useRef(false);
    const memoizedParticles = useRef<HTMLDivElement[]>([]);
    const particlesInitialized = useRef(false);

    const initializeParticles = useCallback(() => {
        if (particlesInitialized.current || !cardRef.current) return;
        const { width, height } = cardRef.current.getBoundingClientRect();
        memoizedParticles.current = Array.from({ length: particleCount }, () =>
            createParticleElement(Math.random() * width, Math.random() * height, glowColor)
        );
        particlesInitialized.current = true;
    }, [particleCount, glowColor]);

    const clearAllParticles = useCallback(() => {
        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];

        particlesRef.current.forEach((particle) => {
            gsap.to(particle, {
                scale: 0,
                opacity: 0,
                duration: 0.24,
                ease: 'power2.out',
                onComplete: () => particle.parentNode?.removeChild(particle),
            });
        });
        particlesRef.current = [];
    }, []);

    const animateParticles = useCallback(() => {
        if (!cardRef.current || !isHoveredRef.current || particleCount <= 0) return;
        if (!particlesInitialized.current) initializeParticles();

        memoizedParticles.current.forEach((particle, index) => {
            const timeoutId = setTimeout(() => {
                if (!isHoveredRef.current || !cardRef.current) return;

                const clone = particle.cloneNode(true) as HTMLDivElement;
                cardRef.current.appendChild(clone);
                particlesRef.current.push(clone);

                gsap.fromTo(clone, { scale: 0, opacity: 0 }, { scale: 1, opacity: 0.75, duration: 0.24, ease: 'power2.out' });
                gsap.to(clone, {
                    x: (Math.random() - 0.5) * 72,
                    y: (Math.random() - 0.5) * 72,
                    duration: 1.6 + Math.random(),
                    ease: 'sine.inOut',
                    repeat: -1,
                    yoyo: true,
                });
            }, index * 90);

            timeoutsRef.current.push(timeoutId);
        });
    }, [initializeParticles, particleCount]);

    useEffect(() => {
        if (disableAnimations || !cardRef.current) return;
        const element = cardRef.current;

        const handlePointerEnter = () => {
            isHoveredRef.current = true;
            animateParticles();
        };

        const handlePointerLeave = () => {
            isHoveredRef.current = false;
            clearAllParticles();
        };

        const handleClick = (event: MouseEvent) => {
            if (!clickEffect) return;
            const rect = element.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const maxDistance = Math.max(
                Math.hypot(x, y),
                Math.hypot(x - rect.width, y),
                Math.hypot(x, y - rect.height),
                Math.hypot(x - rect.width, y - rect.height)
            );

            const ripple = document.createElement('div');
            ripple.style.cssText = `
        position: absolute;
        width: ${maxDistance * 2}px;
        height: ${maxDistance * 2}px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(${glowColor}, 0.32) 0%, rgba(${glowColor}, 0.14) 30%, transparent 70%);
        left: ${x - maxDistance}px;
        top: ${y - maxDistance}px;
        pointer-events: none;
        z-index: 1000;
      `;
            element.appendChild(ripple);

            gsap.fromTo(
                ripple,
                { scale: 0, opacity: 1 },
                { scale: 1, opacity: 0, duration: 0.7, ease: 'power2.out', onComplete: () => ripple.remove() }
            );
        };

        element.addEventListener('pointerenter', handlePointerEnter);
        element.addEventListener('pointerleave', handlePointerLeave);
        element.addEventListener('click', handleClick);

        return () => {
            isHoveredRef.current = false;
            element.removeEventListener('pointerenter', handlePointerEnter);
            element.removeEventListener('pointerleave', handlePointerLeave);
            element.removeEventListener('click', handleClick);
            clearAllParticles();
        };
    }, [animateParticles, clearAllParticles, disableAnimations, clickEffect, glowColor]);

    return (
        <div ref={cardRef} className={`${className} relative overflow-hidden`}>
            {children}
        </div>
    );
};

const AboutGlobalSpotlight: React.FC<{
    gridRef: React.RefObject<HTMLDivElement | null>;
    disableAnimations?: boolean;
    enabled?: boolean;
    spotlightRadius?: number;
    glowColor?: string;
}> = ({ gridRef, disableAnimations = false, enabled = true, spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS, glowColor = DEFAULT_GLOW_COLOR }) => {
    const spotlightRef = useRef<HTMLDivElement | null>(null);
    const frameRef = useRef<number | null>(null);
    const pointerRef = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        if (disableAnimations || !gridRef.current || !enabled) return;

        const grid = gridRef.current;
        const spotlight = document.createElement('div');
        spotlight.className = 'about-global-spotlight';
        spotlight.style.cssText = `
      position: fixed;
      width: ${spotlightRadius * 1.8}px;
      height: ${spotlightRadius * 1.8}px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle,
        rgba(${glowColor}, 0.12) 0%,
        rgba(${glowColor}, 0.065) 20%,
        rgba(${glowColor}, 0.025) 42%,
        transparent 70%
      );
      z-index: 200;
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: screen;
    `;
        document.body.appendChild(spotlight);
        spotlightRef.current = spotlight;

        const updateGlow = () => {
            frameRef.current = null;
            const pointer = pointerRef.current;
            if (!pointer || !spotlightRef.current) return;

            const cards = grid.querySelectorAll<HTMLElement>('.about-bento-card');
            const { proximity, fadeDistance } = calculateSpotlightValues(spotlightRadius);
            let minDistance = Infinity;

            cards.forEach((cardElement) => {
                const cardRect = cardElement.getBoundingClientRect();
                const centerX = cardRect.left + cardRect.width / 2;
                const centerY = cardRect.top + cardRect.height / 2;
                const distance =
                    Math.hypot(pointer.x - centerX, pointer.y - centerY) - Math.max(cardRect.width, cardRect.height) / 2;
                const effectiveDistance = Math.max(0, distance);
                minDistance = Math.min(minDistance, effectiveDistance);

                let glowIntensity = 0;
                if (effectiveDistance <= proximity) {
                    glowIntensity = 1;
                } else if (effectiveDistance <= fadeDistance) {
                    glowIntensity = (fadeDistance - effectiveDistance) / (fadeDistance - proximity);
                }

                updateCardGlowProperties(cardElement, pointer.x, pointer.y, glowIntensity, spotlightRadius);
            });

            gsap.to(spotlightRef.current, { left: pointer.x, top: pointer.y, duration: 0.12, ease: 'power2.out' });
            gsap.to(spotlightRef.current, {
                opacity: minDistance <= fadeDistance ? 0.55 : 0,
                duration: 0.18,
                ease: 'power2.out',
            });
        };

        const requestGlowUpdate = () => {
            if (frameRef.current !== null) return;
            frameRef.current = requestAnimationFrame(updateGlow);
        };

        const handlePointerMove = (event: PointerEvent) => {
            pointerRef.current = { x: event.clientX, y: event.clientY };
            requestGlowUpdate();
        };

        const handlePointerLeave = () => {
            pointerRef.current = null;
            grid.querySelectorAll<HTMLElement>('.about-bento-card').forEach((card) => {
                card.style.setProperty('--glow-intensity', '0');
            });
            gsap.to(spotlight, { opacity: 0, duration: 0.22, ease: 'power2.out' });
        };

        grid.addEventListener('pointermove', handlePointerMove);
        grid.addEventListener('pointerleave', handlePointerLeave);

        return () => {
            grid.removeEventListener('pointermove', handlePointerMove);
            grid.removeEventListener('pointerleave', handlePointerLeave);
            if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
            spotlight.parentNode?.removeChild(spotlight);
        };
    }, [gridRef, disableAnimations, enabled, spotlightRadius, glowColor]);

    return null;
};

export default function AboutBento({
    cards,
    enableStars = true,
    enableSpotlight = true,
    enableBorderGlow = true,
    disableAnimations = false,
    spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
    particleCount = DEFAULT_PARTICLE_COUNT,
    glowColor = DEFAULT_GLOW_COLOR,
    clickEffect = true,
}: AboutBentoProps) {
    const gridRef = useRef<HTMLDivElement>(null);
    const canUseInteractiveMotion = useInteractiveMotion();
    const shouldDisableAnimations = disableAnimations || !canUseInteractiveMotion;

    return (
        <>
            {enableSpotlight && (
                <AboutGlobalSpotlight
                    gridRef={gridRef}
                    disableAnimations={shouldDisableAnimations}
                    enabled={enableSpotlight}
                    spotlightRadius={spotlightRadius}
                    glowColor={glowColor}
                />
            )}

            <div className={BENTO_GRID_CLASS} ref={gridRef}>
                {cards.map((card) => {
                    const baseClassName = [BENTO_CARD_CLASS, enableBorderGlow ? 'about-bento-card--border-glow' : ''].filter(Boolean).join(' ');

                    const content = (
                        <>
                            <div className={BENTO_META_CLASS}>
                                <span className={BENTO_CODE_CLASS}>{card.code}</span>
                                <span className={BENTO_LABEL_CLASS}>{card.label}</span>
                            </div>
                            <div className={BENTO_VALUE_CLASS}>{card.value}</div>
                        </>
                    );

                    if (enableStars) {
                        return (
                            <AboutParticleCard
                                key={card.label}
                                className={baseClassName}
                                disableAnimations={shouldDisableAnimations}
                                particleCount={particleCount}
                                glowColor={glowColor}
                                clickEffect={clickEffect}
                            >
                                {content}
                            </AboutParticleCard>
                        );
                    }

                    return (
                        <div key={card.label} className={baseClassName}>
                            {content}
                        </div>
                    );
                })}
            </div>
        </>
    );
}
