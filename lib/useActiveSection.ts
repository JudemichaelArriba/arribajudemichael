'use client';

import { useEffect, useState } from 'react';

const TOP_HOME_THRESHOLD = 24;
const HOME_REVEAL_FRACTION = 0.72;
const FOCUS_LINE_FRACTION = 0.38;

export function useActiveSection(sectionIds: string[]) {
  const [active, setActive] = useState(sectionIds[0]);

  useEffect(() => {
    if (sectionIds.length === 0) return;

    let frame: number | null = null;
    const fallbackId = sectionIds[0];

    const resolveActiveSection = () => {
      frame = null;

      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const scrollY = window.scrollY || window.pageYOffset;
      const homeThreshold = Math.max(TOP_HOME_THRESHOLD, viewportHeight * HOME_REVEAL_FRACTION);

      if (scrollY <= homeThreshold) {
        setActive(fallbackId);
        return;
      }

      const focusLine = viewportHeight * FOCUS_LINE_FRACTION;
      const candidates = sectionIds
        .map((id) => ({ id, element: document.getElementById(id) }))
        .filter((candidate): candidate is { id: string; element: HTMLElement } => Boolean(candidate.element));

      const focused = candidates
        .map(({ id, element }) => {
          const rect = element.getBoundingClientRect();
          return {
            id,
            distance: Math.abs(rect.top - focusLine),
            containsFocusLine: rect.top <= focusLine && rect.bottom >= focusLine,
            isVisible: rect.bottom > 0 && rect.top < viewportHeight,
          };
        })
        .filter((candidate) => candidate.containsFocusLine || candidate.isVisible)
        .sort((a, b) => {
          if (a.containsFocusLine !== b.containsFocusLine) return a.containsFocusLine ? -1 : 1;
          return a.distance - b.distance;
        })[0];

      setActive(focused?.id ?? fallbackId);
    };

    const requestResolve = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(resolveActiveSection);
    };

    const observer = new IntersectionObserver(requestResolve, {
      rootMargin: '-24% 0px -58% 0px',
      threshold: [0, 0.1, 0.35, 0.6],
    });

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    resolveActiveSection();
    window.addEventListener('scroll', requestResolve, { passive: true });
    window.addEventListener('resize', requestResolve);

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', requestResolve);
      window.removeEventListener('resize', requestResolve);
    };
  }, [sectionIds]);

  return active;
}
