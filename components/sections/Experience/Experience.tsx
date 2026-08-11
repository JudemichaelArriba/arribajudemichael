'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { BentoCard, BentoSpotlight } from '@/components/ui/Bento/Bento';
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
  const timelineRef = useRef<HTMLOListElement>(null);
  const milestoneCount = String(experiences.length).padStart(2, '0');
  const hasTimeline = !experiencesUnavailable && experiences.length > 0;

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      const headingTargets = gsap.utils.toArray<HTMLElement>(
        '.experience-heading-copy, .experience-intro, .experience-summary, .experience-state',
        section
      );
      const headingLines = gsap.utils.toArray<HTMLElement>(
        '[data-experience-line]',
        section
      );
      const items = gsap.utils.toArray<HTMLLIElement>('.experience-item', section);
      const nodes = gsap.utils.toArray<HTMLElement>('.experience-node', section);
      const cards = gsap.utils.toArray<HTMLElement>('.experience-card', section);
      const cardInternals = gsap.utils.toArray<HTMLElement>(
        '.experience-card-meta, .experience-card-title, .experience-card-description, .experience-card-status',
        section
      );
      const lineFill = section.querySelector<HTMLElement>('.experience-line-fill');
      const triggers: ScrollTrigger[] = [];
      const timelines: gsap.core.Timeline[] = [];
      const resetItems: Array<() => void> = [];
      let isSectionArmed = true;

      if (prefersReducedMotion) {
        gsap.set([...headingTargets, ...nodes, ...cards, ...cardInternals], {
          autoAlpha: 1,
          x: 0,
          y: 0,
          scale: 1,
          clearProps: 'transform,opacity,visibility,willChange',
        });
        gsap.set(headingLines, { scaleX: 1, clearProps: 'transform' });
        if (lineFill) gsap.set(lineFill, { scaleY: 1, clearProps: 'transform' });
        return;
      }

      const setHeadingInitialState = () => {
        gsap.set(headingTargets, { autoAlpha: 0, y: 14 });
        headingLines.forEach((line, index) => {
          gsap.set(line, {
            scaleX: 0,
            transformOrigin: index === 0 ? 'right center' : 'left center',
          });
        });
      };

      setHeadingInitialState();
      gsap.set(nodes, {
        autoAlpha: 0,
        scale: 0.55,
        transformOrigin: '50% 50%',
        willChange: 'transform, opacity',
      });
      gsap.set(cards, {
        autoAlpha: 0,
        y: 36,
        scale: 0.97,
        transformOrigin: '50% 100%',
        willChange: 'transform, opacity',
      });
      gsap.set(cardInternals, {
        autoAlpha: 0,
        clearProps: 'transform',
        willChange: 'opacity',
      });

      const headingTimeline = gsap.timeline({
        paused: true,
        defaults: { overwrite: 'auto', force3D: true },
      });
      timelines.push(headingTimeline);

      headingTimeline
        .to(headingTargets, {
          autoAlpha: 1,
          y: 0,
          duration: 0.58,
          ease: 'power3.out',
          stagger: 0.08,
        }, 0)
        .to(headingLines, {
          scaleX: 1,
          duration: 0.72,
          ease: 'power3.out',
          stagger: 0.04,
        }, 0.08);

      items.forEach((item, index) => {
        const node = nodes[index];
        const card = cards[index];
        if (!node || !card) return;

        const internals = gsap.utils.toArray<HTMLElement>(
          '.experience-card-meta, .experience-card-title, .experience-card-description, .experience-card-status',
          item
        );
        const timeline = gsap.timeline({
          paused: true,
          defaults: { overwrite: 'auto', force3D: true },
        });
        let isArmed = true;

        timelines.push(timeline);

        const setItemInitialState = () => {
          timeline.pause(0, true);
          isArmed = true;
          gsap.set(node, {
            autoAlpha: 0,
            scale: 0.55,
            transformOrigin: '50% 50%',
            willChange: 'transform, opacity',
          });
          gsap.set(card, {
            autoAlpha: 0,
            y: 36,
            scale: 0.97,
            transformOrigin: '50% 100%',
            willChange: 'transform, opacity',
          });
          gsap.set(internals, {
            autoAlpha: 0,
            clearProps: 'transform',
            willChange: 'opacity',
          });
        };

        resetItems.push(setItemInitialState);

        const trigger = ScrollTrigger.create({
          trigger: item,
          start: 'top 94%',
          end: 'bottom top',
          onEnter: () => {
            if (!isArmed) return;
            isArmed = false;
            timeline.restart(true);
          },
        });
        triggers.push(trigger);

        timeline
          .fromTo(
            node,
            {
              autoAlpha: 0,
              scale: 0.55,
              transformOrigin: '50% 50%',
            },
            {
              autoAlpha: 1,
              scale: 1,
              duration: 0.46,
              ease: 'back.out(2.4)',
              immediateRender: false,
              clearProps: 'transform,willChange',
            },
            0
          )
          .fromTo(
            card,
            {
              autoAlpha: 0,
              y: 36,
              scale: 0.97,
              transformOrigin: '50% 100%',
            },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.82,
              ease: 'elastic.out(1, 0.55)',
              immediateRender: false,
              clearProps: 'transform,willChange',
            },
            0.04
          )
          .fromTo(
            internals,
            { autoAlpha: 0 },
            {
              autoAlpha: 1,
              duration: 0.3,
              ease: 'power2.out',
              immediateRender: false,
              stagger: 0.05,
              clearProps: 'willChange',
            },
            0.24
          );
      });

      const resetSection = () => {
        headingTimeline.pause(0, true);
        isSectionArmed = true;
        setHeadingInitialState();
        resetItems.forEach((resetItem) => resetItem());
      };

      const sectionTrigger = ScrollTrigger.create({
        trigger: section,
        start: 'top 88%',
        end: 'bottom top',
        onEnter: () => {
          if (!isSectionArmed) return;
          isSectionArmed = false;
          setHeadingInitialState();
          headingTimeline.restart(true);
        },
      });
      triggers.push(sectionTrigger);

      const resetObserver = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting && entry.boundingClientRect.top >= window.innerHeight - 1) {
            resetSection();
          }
        },
        { rootMargin: '0px 0px -1px 0px', threshold: 0 }
      );
      resetObserver.observe(section);

      if (lineFill) {
        gsap.set(lineFill, { scaleY: 0, transformOrigin: '50% 0%' });
        const lineTween = gsap.to(lineFill, {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top 72%',
            end: 'bottom 68%',
            scrub: 0.9,
            invalidateOnRefresh: true,
          },
        });

        if (lineTween.scrollTrigger) triggers.push(lineTween.scrollTrigger);
      }

      return () => {
        resetObserver.disconnect();
        gsap.set([...nodes, ...cards, ...cardInternals], { clearProps: 'willChange' });
        triggers.forEach((trigger) => trigger.kill(false));
        timelines.forEach((timeline) => timeline.kill());
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
      className="relative w-full scroll-mt-[calc(var(--nav-height,80px)+2rem)] px-5 py-24 md:px-8 md:py-32"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[var(--signal)]/20 to-transparent md:inset-x-8"
      />

      <div className="mx-auto max-w-7xl">
        <div className="experience-heading-copy flex w-full items-center gap-4">
          <span
            data-experience-line
            aria-hidden="true"
            className="h-px w-8 shrink-0 bg-gradient-to-r from-transparent to-[var(--signal)]/55 sm:w-12"
          />
          <p className="shrink-0 font-mono text-xs font-extrabold uppercase leading-none tracking-[0.14em] text-[color-mix(in_srgb,var(--signal)_82%,#ffffff_18%)]">
            Experience
          </p>
          <span
            data-experience-line
            aria-hidden="true"
            className="h-px min-w-8 flex-1 bg-gradient-to-r from-[var(--signal)]/45 via-white/10 to-transparent"
          />
          <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]/48 sm:inline">
            {milestoneCount} / Milestones
          </span>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-12 lg:mt-16 lg:grid-cols-[minmax(260px,0.62fr)_minmax(0,1.38fr)] lg:items-start lg:gap-16 xl:gap-20">
          <header className="experience-intro lg:sticky lg:top-[calc(var(--nav-height,80px)+2rem)]">
            <h2 className="max-w-[12ch] font-display text-4xl font-extrabold leading-[1.04] tracking-normal text-[var(--text)] sm:text-5xl lg:text-[3.35rem]">
              A record of building, shipping, and learning.
            </h2>
            <p className="mt-6 max-w-md text-base leading-[1.7] text-[var(--muted)]/68">
              Selected milestones across production work, collaborative challenges, and formal study.
            </p>

            <div className="experience-summary mt-8 grid grid-cols-2 border-y border-white/[0.08] py-5">
              <div>
                <span className="block font-mono text-lg font-bold tabular-nums text-[var(--text)]">{milestoneCount}</span>
                <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]/52">
                  Milestones
                </span>
              </div>
              <div className="border-l border-white/[0.08] pl-5">
                <span className="block font-mono text-lg font-bold tabular-nums text-[var(--text)]">2023</span>
                <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]/52">
                  Starting point
                </span>
              </div>
            </div>
          </header>

          <div className="relative min-w-0">
            {hasTimeline ? (
              <>
                <BentoSpotlight
                  gridRef={timelineRef}
                  spotlightRadius={260}
                  glowColor="195, 109, 252"
                  activateOnCardOnly
                />

                <ol ref={timelineRef} className="relative flex flex-col gap-6 sm:gap-7">
                  <div aria-hidden="true" className="absolute bottom-7 left-[0.6875rem] top-7 w-px bg-white/[0.09]">
                    <div className="experience-line-fill absolute inset-0 bg-gradient-to-b from-[#5227FF] via-[var(--signal)] to-[#FF9FFC] shadow-[0_0_12px_rgba(195,109,252,0.22)]" />
                  </div>

                  {experiences.map((item, index) => (
                <li
                  key={item.id}
                  className="experience-item group relative grid grid-cols-[1.375rem_minmax(0,1fr)] items-start gap-x-4 sm:gap-x-5"
                >
                  <div className="experience-node relative z-10 mt-7 flex size-[1.375rem] items-center justify-center rounded-full border border-white/15 bg-black transition-colors duration-300 group-hover:border-[var(--signal)]/45">
                    <span
                      aria-hidden="true"
                      className={`size-1.5 rounded-full ${item.status === 'active'
                        ? 'bg-[var(--signal)] shadow-[0_0_9px_rgba(195,109,252,0.8)]'
                        : 'bg-white/40'
                        }`}
                    />
                  </div>

                  <BentoCard className="experience-card min-h-[178px] text-left sm:min-h-[184px]">
                    <div className="experience-card-meta flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="font-mono text-[10px] font-bold tabular-nums tracking-[0.12em] text-[var(--signal)]/70">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span aria-hidden="true" className="h-px w-4 shrink-0 bg-white/10" />
                        <span className="truncate font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]/58">
                          {item.subtitle}
                        </span>
                      </div>
                      <time className="experience-card-date shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.13em] text-[var(--signal)]">
                        {item.dateLabel}
                      </time>
                    </div>

                    <h3 className="experience-card-title mt-2 text-xl font-extrabold leading-tight tracking-normal text-[var(--text)] sm:text-2xl">
                      {item.title}
                    </h3>

                    <p className="experience-card-description mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--muted)]/68 sm:text-base">
                      {item.description}
                    </p>

                    <div className="experience-card-status mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-3">
                      <span
                        aria-hidden="true"
                        className={`size-1.5 rounded-full ${item.status === 'active' ? 'bg-[var(--signal)]' : 'bg-white/25'}`}
                      />
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--muted)]/52">
                        {item.status === 'active' ? 'Currently active' : 'Completed milestone'}
                      </span>
                    </div>
                  </BentoCard>
                </li>
                  ))}
                </ol>
              </>
            ) : (
              <BentoCard className="experience-state flex min-h-[220px] flex-col justify-center text-left">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.13em] text-[var(--signal)]/70">
                  Timeline status
                </p>
                <h3 className="mt-3 text-xl font-extrabold leading-tight tracking-normal text-[var(--text)] sm:text-2xl">
                  {experiencesUnavailable
                    ? 'Experience is temporarily unavailable.'
                    : 'Experience milestones are being prepared.'}
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]/62 sm:text-base">
                  {experiencesUnavailable
                    ? 'The rest of the portfolio remains available while this timeline reconnects.'
                    : 'New milestones will appear here as they are prepared for publication.'}
                </p>
              </BentoCard>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
