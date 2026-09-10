'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import './Bento.css';

export interface BentoCardData {
  code: string;
  label: string;
  value: string;
}

export interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

export interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  elevation?: 'default' | 'smooth';
  enableStars?: boolean;
  enableBorderGlow?: boolean;
  disableAnimations?: boolean;
  particleCount?: number;
  glowColor?: string;
  clickEffect?: boolean;
}

export interface BentoSpotlightProps {
  gridRef: React.RefObject<HTMLElement | null>;
  disableAnimations?: boolean;
  enabled?: boolean;
  spotlightRadius?: number;
  glowColor?: string;
  activateOnCardOnly?: boolean;
}

export const DEFAULT_PARTICLE_COUNT = 12;
export const DEFAULT_SPOTLIGHT_RADIUS = 320;
export const DEFAULT_GLOW_COLOR = '140, 140, 140';
export const BENTO_GRID_CLASS = 'about-bento-section grid w-full grid-cols-1 gap-3';
export const BENTO_CARD_BASE_CLASS =
  'about-bento-card relative flex min-h-[104px] flex-col justify-center gap-[0.72em] overflow-hidden border border-[var(--hairline)] bg-[var(--surface)] px-[1.25em] py-[1.2em] max-sm:min-h-0 max-sm:p-[1.05em]';
/**
 * Card hover shares one duration and easing with everything animating inside it
 * (media zoom, arrows, meta). Mismatched timings meant the image kept travelling
 * after the card had settled, which read as lag rather than as one gesture.
 */
export const BENTO_HOVER_DURATION = 'duration-[520ms]';
export const BENTO_HOVER_EASE = 'ease-[cubic-bezier(0.22,1,0.36,1)]';

export const BENTO_DEFAULT_ELEVATION_CLASS =
  `transition-[transform,border-color] ${BENTO_HOVER_DURATION} ${BENTO_HOVER_EASE} hover:-translate-y-0.5 hover:border-[var(--hairline-strong)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 [@media(hover:none)]:hover:translate-y-0`;
export const BENTO_SMOOTH_ELEVATION_CLASS =
  `transform-gpu shadow-[var(--shadow-card)] transition-[transform,border-color,box-shadow] ${BENTO_HOVER_DURATION} ${BENTO_HOVER_EASE} hover:-translate-y-1.5 hover:border-[var(--hairline-strong)] hover:shadow-[var(--shadow-lift)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 [@media(hover:none)]:hover:translate-y-0`;
export const BENTO_CARD_CLASS = `${BENTO_CARD_BASE_CLASS} ${BENTO_DEFAULT_ELEVATION_CLASS}`;
export const BENTO_META_CLASS = 'flex items-baseline gap-[0.6em]';
export const BENTO_CODE_CLASS = 'font-mono text-[10px] text-[var(--faint)]';
export const BENTO_LABEL_CLASS = 'font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--faint)]';
export const BENTO_VALUE_CLASS = 'text-[clamp(0.95rem,1.45vw,1.06rem)] font-[550] leading-[1.38] text-[var(--text)]';

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

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
  el.style.cssText = 
    'position: absolute;' +
    'width: 4px;' +
    'height: 4px;' +
    'border-radius: 50%;' +
    'background: rgba(' + color + ', 1);' +
    'box-shadow: 0 0 6px rgba(' + color + ', 0.6);' +
    'pointer-events: none;' +
    'z-index: 100;' +
    'left: ' + x + 'px;' +
    'top: ' + y + 'px;';
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

  card.style.setProperty('--glow-x', relativeX + '%');
  card.style.setProperty('--glow-y', relativeY + '%');
  card.style.setProperty('--glow-intensity', glow.toString());
  card.style.setProperty('--glow-radius', radius + 'px');
};

export const BentoGrid = React.forwardRef<HTMLDivElement, BentoGridProps>(function BentoGrid(
  { children, className = '' },
  ref
) {
  return (
    <div ref={ref} className={cx(BENTO_GRID_CLASS, className)}>
      {children}
    </div>
  );
});

export function BentoSpotlight({
  gridRef,
  disableAnimations = false,
  enabled = true,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  glowColor = DEFAULT_GLOW_COLOR,
  activateOnCardOnly = false,
}: BentoSpotlightProps) {
  const canUseInteractiveMotion = useInteractiveMotion();
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const shouldDisableAnimations = disableAnimations || !canUseInteractiveMotion;

  useEffect(() => {
    if (shouldDisableAnimations || !gridRef.current || !enabled) return;

    const grid = gridRef.current;
    const spotlight = document.createElement('div');
    spotlight.className = 'about-global-spotlight';
    spotlight.style.cssText =
      'position: fixed;' +
      'width: ' + spotlightRadius * 1.8 + 'px;' +
      'height: ' + spotlightRadius * 1.8 + 'px;' +
      'border-radius: 50%;' +
      'pointer-events: none;' +
      'background: radial-gradient(circle, ' +
      'rgba(' + glowColor + ', 0.12) 0%, ' +
      'rgba(' + glowColor + ', 0.065) 20%, ' +
      'rgba(' + glowColor + ', 0.025) 42%, ' +
      'transparent 70%);' +
      'z-index: 200;' +
      'opacity: 0;' +
      'transform: translate(-50%, -50%);' +
      'mix-blend-mode: screen;';
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;
    const moveSpotlightX = gsap.quickTo(spotlight, 'left', { duration: 0.12, ease: 'power2.out' });
    const moveSpotlightY = gsap.quickTo(spotlight, 'top', { duration: 0.12, ease: 'power2.out' });
    const setSpotlightOpacity = gsap.quickTo(spotlight, 'opacity', { duration: 0.18, ease: 'power2.out' });
    let activeCard: HTMLElement | null = null;

    const resetGlow = () => {
      if (!pointerRef.current && !activeCard) return;
      pointerRef.current = null;
      if (activateOnCardOnly) {
        activeCard?.style.setProperty('--glow-intensity', '0');
        activeCard = null;
      } else {
        grid.querySelectorAll<HTMLElement>('.about-bento-card').forEach((card) => {
          card.style.setProperty('--glow-intensity', '0');
        });
      }
      setSpotlightOpacity(0);
    };

    const updateGlow = () => {
      frameRef.current = null;
      const pointer = pointerRef.current;
      if (!pointer || !spotlightRef.current) return;

      if (activateOnCardOnly) {
        if (!activeCard) return;
        updateCardGlowProperties(activeCard, pointer.x, pointer.y, 1, spotlightRadius);
        moveSpotlightX(pointer.x);
        moveSpotlightY(pointer.y);
        setSpotlightOpacity(0.55);
        return;
      }

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

      moveSpotlightX(pointer.x);
      moveSpotlightY(pointer.y);
      setSpotlightOpacity(minDistance <= fadeDistance ? 0.55 : 0);
    };

    const requestGlowUpdate = () => {
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(updateGlow);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (activateOnCardOnly) {
        const target = event.target instanceof Element ? event.target : null;
        const hoveredCard = target?.closest('.about-bento-card');

        if (!(hoveredCard instanceof HTMLElement) || !grid.contains(hoveredCard)) {
          resetGlow();
          return;
        }

        if (activeCard && activeCard !== hoveredCard) {
          activeCard.style.setProperty('--glow-intensity', '0');
        }
        activeCard = hoveredCard;
      }

      pointerRef.current = { x: event.clientX, y: event.clientY };
      requestGlowUpdate();
    };

    const handlePointerLeave = () => {
      resetGlow();
    };

    grid.addEventListener('pointermove', handlePointerMove);
    grid.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      grid.removeEventListener('pointermove', handlePointerMove);
      grid.removeEventListener('pointerleave', handlePointerLeave);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      activeCard?.style.setProperty('--glow-intensity', '0');
      gsap.killTweensOf(spotlight);
      spotlight.parentNode?.removeChild(spotlight);
    };
  }, [activateOnCardOnly, enabled, glowColor, gridRef, shouldDisableAnimations, spotlightRadius]);

  return null;
}

export function BentoCard({
  children,
  className = '',
  elevation = 'default',
  enableStars = false,
  enableBorderGlow = true,
  disableAnimations = false,
  particleCount = DEFAULT_PARTICLE_COUNT,
  glowColor = DEFAULT_GLOW_COLOR,
  clickEffect = false,
}: BentoCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isHoveredRef = useRef(false);
  const memoizedParticles = useRef<HTMLDivElement[]>([]);
  const particlesInitialized = useRef(false);
  const canUseInteractiveMotion = useInteractiveMotion();
  const shouldDisableAnimations = disableAnimations || !canUseInteractiveMotion;

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
    if (shouldDisableAnimations || !cardRef.current || (!enableStars && !clickEffect)) return;
    const element = cardRef.current;

    const handlePointerEnter = () => {
      if (!enableStars) return;
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
      ripple.style.cssText =
        'position: absolute;' +
        'width: ' + maxDistance * 2 + 'px;' +
        'height: ' + maxDistance * 2 + 'px;' +
        'border-radius: 50%;' +
        'background: radial-gradient(circle, rgba(' + glowColor + ', 0.32) 0%, rgba(' + glowColor + ', 0.14) 30%, transparent 70%);' +
        'left: ' + (x - maxDistance) + 'px;' +
        'top: ' + (y - maxDistance) + 'px;' +
        'pointer-events: none;' +
        'z-index: 1000;';
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
  }, [animateParticles, clearAllParticles, clickEffect, enableStars, glowColor, shouldDisableAnimations]);

  return (
    <div
      ref={cardRef}
      className={cx(
        BENTO_CARD_BASE_CLASS,
        elevation === 'smooth' ? BENTO_SMOOTH_ELEVATION_CLASS : BENTO_DEFAULT_ELEVATION_CLASS,
        enableBorderGlow && 'about-bento-card--border-glow',
        className
      )}
    >
      {children}
    </div>
  );
}
