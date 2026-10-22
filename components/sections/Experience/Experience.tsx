'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ArrowUpRight } from 'lucide-react';
import { isPreloading } from '@/lib/animations/preloaderHold';
import type { PublicExperienceDto } from '@/features/admin/experiences/types';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface ExperienceProps {
  experiences: PublicExperienceDto[];
  experiencesUnavailable?: boolean;
}

export default function Experience({
  experiences,
  experiencesUnavailable = false,
}: ExperienceProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const milestoneCount = String(experiences.length).padStart(2, '0');
  const hasTimeline = !experiencesUnavailable && experiences.length > 0;

  // One scrubbed timeline over the whole list: the header arrives, then each milestone wipes in
  // from the left as it reaches its place. Rebuilt when the data changes (revertOnUpdate).
  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const rows = gsap.utils.toArray<HTMLElement>('.experience-row', section);
        const total = Math.max(1, section.offsetHeight);
        const timeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: section, start: 'top 75%', end: 'bottom 85%', scrub: 0.6, invalidateOnRefresh: true },
        });

        timeline
          .fromTo('[data-experience-line]', { scaleX: 0 }, { scaleX: 1, transformOrigin: 'left center', duration: 0.05 }, 0)
          .fromTo('.experience-title', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: 0.08 }, 0.01)
          .fromTo('.experience-summary', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.06 }, 0.02)
          .fromTo('.experience-intro, .experience-state', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.06 }, 0.05);

        rows.forEach((row) => {
          const at = Math.min(0.92, Math.max(0.08, (row.offsetTop - 200) / total));
          timeline.fromTo(row, { clipPath: 'inset(0% 100% 0% 0%)', x: -24 }, { clipPath: 'inset(0% 0% 0% 0%)', x: 0, ease: 'power2.out', duration: 0.07 }, at);
        });
      }, section);

      // Streams in after the sections below were set up: re-sort triggers into document order.
      const refreshFrame = window.requestAnimationFrame(() => {
        ScrollTrigger.sort();
        if (!isPreloading()) ScrollTrigger.refresh();
      });
      return () => {
        window.cancelAnimationFrame(refreshFrame);
        mm.revert();
      };
    },
    {
      scope: sectionRef,
      dependencies: [experiences, experiencesUnavailable],
      revertOnUpdate: true,
    }
  );

  return (
    <section
      ref={sectionRef}
      id="experience"
      data-analytics-section="experience"
      aria-labelledby="experience-heading"
      className="relative w-full scroll-mt-[calc(var(--nav-height,80px)+2rem)] px-5 py-24 md:px-8 md:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="experience-heading-copy flex w-full items-center gap-4">
          <p className="shrink-0 font-display text-xs font-bold uppercase leading-none tracking-[0.14em] text-[var(--text)]">
            Experience
          </p>
          <span
            data-experience-line
            aria-hidden="true"
            className="h-px min-w-8 flex-1 bg-[var(--hairline)]"
          />
          <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)] sm:inline">
            {milestoneCount} / Milestones
          </span>
        </div>

        <div className="mt-12 flex flex-col gap-8 lg:mt-16 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <h2
            id="experience-heading"
            className="experience-title max-w-[18ch] font-display text-4xl font-bold leading-[1.06] tracking-[-0.025em] text-[var(--text)] sm:text-5xl lg:text-[3.1rem]"
          >
            A record of building, shipping, and learning.
          </h2>

          <div className="experience-summary flex shrink-0 gap-10 sm:gap-14">
            <div>
              <p className="font-display text-3xl font-bold tabular-nums text-[var(--text)]">{milestoneCount}</p>
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
                Milestones
              </p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold tabular-nums text-[var(--text)]">2023</p>
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
                Starting point
              </p>
            </div>
          </div>
        </div>

        <p className="experience-intro mt-6 max-w-[52ch] text-base leading-[1.75] text-[var(--muted)]">
          Selected milestones across production work, collaborative challenges, and formal study.
        </p>

        {hasTimeline ? (
          <ol className="mt-12 border-b border-[var(--hairline)] lg:mt-14">
            {experiences.map((item) => (
              <li
                key={item.id}
                className="experience-row group grid grid-cols-[minmax(0,1fr)_1.5rem] items-start gap-x-5 gap-y-2 border-t border-[var(--hairline)] px-4 py-8 transition-colors duration-300 ease-out hover:bg-[var(--inverse-bg)] motion-reduce:transition-none sm:grid-cols-[10rem_minmax(0,1fr)_1.5rem] sm:gap-x-10"
              >
                <time className="order-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--faint)] transition-colors duration-300 ease-out group-hover:text-[var(--inverse-text)]/60 motion-reduce:transition-none sm:pt-1.5">
                  {item.dateLabel}
                </time>

                <div className="order-3 col-span-2 min-w-0 sm:order-2 sm:col-span-1">
                  <h3 className="font-display text-2xl font-bold leading-[1.15] tracking-[-0.02em] text-[var(--text)] transition-colors duration-300 ease-out group-hover:text-[var(--inverse-text)] motion-reduce:transition-none sm:text-[1.75rem]">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 max-w-[62ch] text-sm leading-[1.6] text-[var(--muted)] transition-colors duration-300 ease-out group-hover:text-[var(--inverse-text)]/70 motion-reduce:transition-none">
                    <span className="font-mono text-[11px] uppercase tracking-[0.1em]">{item.subtitle}</span>
                    <span aria-hidden="true" className="mx-2 opacity-50">&middot;</span>
                    {item.description}
                  </p>
                  <p className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--faint)] transition-colors duration-300 ease-out group-hover:text-[var(--inverse-text)]/55 motion-reduce:transition-none">
                    <span
                      aria-hidden="true"
                      className={`size-1.5 rounded-full transition-colors duration-300 motion-reduce:transition-none ${item.status === 'active'
                        ? 'bg-[var(--text)] group-hover:bg-[var(--inverse-text)]'
                        : 'bg-[var(--faint)]'
                        }`}
                    />
                    {item.status === 'active' ? 'Currently active' : 'Completed milestone'}
                  </p>
                </div>

                <ArrowUpRight
                  aria-hidden="true"
                  size={20}
                  strokeWidth={2.2}
                  className="order-2 col-start-2 row-start-1 justify-self-end text-[var(--inverse-text)] opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 motion-reduce:transition-none sm:order-3 sm:col-start-3 sm:pt-1"
                />
              </li>
            ))}
          </ol>
        ) : (
          <div className="experience-state mt-12 border-y border-[var(--hairline)] px-4 py-14 lg:mt-14">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.13em] text-[var(--faint)]">
              Timeline status
            </p>
            <h3 className="mt-4 font-display text-2xl font-bold tracking-[-0.02em] text-[var(--text)]">
              {experiencesUnavailable
                ? 'Experience is temporarily unavailable.'
                : 'Experience milestones are being prepared.'}
            </h3>
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
              {experiencesUnavailable
                ? 'The rest of the portfolio remains available while this timeline reconnects.'
                : 'New milestones will appear here as they are prepared for publication.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
