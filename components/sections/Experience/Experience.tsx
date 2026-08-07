'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import ScrollFloat from '@/components/ui/ScrollFloat/ScrollFloat';
import { BentoCard, BentoSpotlight } from '@/components/ui/Bento/Bento';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface ExperienceItem {
  title: string;
  subtitle: string;
  date: string;
  description: string;
  status: 'active' | 'complete';
}

const EXPERIENCE_ITEMS: ExperienceItem[] = [
  {
    title: 'Capstone Project Deployment',
    subtitle: 'Production Release',
    date: '2025 — Present',
    description:
      'Deployment of full-stack capstone and facility intelligence platforms.',
    status: 'active',
  },
  {
    title: 'First Tagum City Hackathon',
    subtitle: 'Participant & Pitch',
    date: '2026',
    description:
      'Participated and pitched an innovative tech solution as a competitor in Tagum City’s inaugural hackathon event.',
    status: 'complete',
  },
  {
    title: 'Started Building',
    subtitle: 'Self-Taught Foundations',
    date: '2023',
    description:
      'First lines of code, first bugs, first sites where the engineering habit began.',
    status: 'complete',
  },
  {
    title: 'Bachelor of Science in Information Technology',
    subtitle: 'Aces Tagum Collage, Inc.',
    date: '2023',
    description:
      'Focused coursework in software engineering, systems design, and database architecture.',
    status: 'complete',
  },
];

export default function Experience() {
  const sectionRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<HTMLOListElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      const items = gsap.utils.toArray<HTMLLIElement>('.experience-item', section);
      const nodes = gsap.utils.toArray<HTMLElement>('.experience-node', section);
      const cards = gsap.utils.toArray<HTMLElement>('.experience-card', section);
      const cardInternals = gsap.utils.toArray<HTMLElement>(
        '.experience-card-date, .experience-card-meta, .experience-card-title, .experience-card-description, .experience-gutter',
        section
      );
      const lineFill = section.querySelector<HTMLElement>('.experience-line-fill');
      const triggers: ScrollTrigger[] = [];
      const timelines: gsap.core.Timeline[] = [];

      if (prefersReducedMotion) {
        gsap.set([...nodes, ...cards, ...cardInternals], {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          clearProps: 'transform,opacity,visibility,willChange',
        });
        if (lineFill) gsap.set(lineFill, { scaleY: 1, clearProps: 'transform' });
        return;
      }

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

      items.forEach((item, index) => {
        const node = nodes[index];
        const card = cards[index];
        if (!node || !card) return;

        const internals = gsap.utils.toArray<HTMLElement>(
          '.experience-card-date, .experience-card-meta, .experience-card-title, .experience-card-description, .experience-gutter',
          item
        );

        const setItemInitialState = () => {
          timeline.pause(0, true);
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

        const timeline = gsap.timeline({
          paused: true,
          defaults: { overwrite: 'auto', force3D: true },
        });
        timelines.push(timeline);

        const trigger = ScrollTrigger.create({
          trigger: item,
          start: 'top 96%',
          end: 'bottom top',
          invalidateOnRefresh: true,
          onEnter: () => {
            setItemInitialState();
            timeline.restart(true);
          },
          onLeaveBack: setItemInitialState,
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
            {
              autoAlpha: 0,
            },
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
        triggers.forEach((trigger) => trigger.kill(false));
        timelines.forEach((timeline) => timeline.kill());
      };
    },
    { scope: sectionRef, dependencies: [] }
  );

  return (
    <section
      ref={sectionRef}
      id="experience"
      className="relative mx-auto w-full max-w-7xl scroll-mt-[var(--nav-height)] px-4 py-24 md:py-32"
    >
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[var(--signal)]/20 to-transparent md:inset-x-8" aria-hidden="true" />
      <p className="eyebrow mx-auto mb-[clamp(1.25rem,3vw,2rem)] flex w-full max-w-sm items-center justify-center gap-3 text-center font-mono text-xs font-extrabold uppercase leading-[1.2] tracking-[0.14em] text-[color-mix(in_srgb,var(--signal)_78%,#ffffff_22%)]">
        <span
          aria-hidden="true"
          className="h-px min-w-8 flex-1 bg-gradient-to-r from-transparent to-[var(--signal)]/55"
        />
        Experience
        <span
          aria-hidden="true"
          className="h-px min-w-8 flex-1 bg-gradient-to-l from-transparent to-[var(--signal)]/55"
        />
      </p>

      <BentoSpotlight
        gridRef={timelineRef}
        spotlightRadius={260}
        glowColor="195, 109, 252"
        activateOnCardOnly
      />

      <ol ref={timelineRef} className="relative flex max-w-6xl flex-col gap-10 md:gap-14">
        {/* editor-gutter rail: ticked track behind the commit-node column */}
        <div
          aria-hidden="true"
          className="absolute inset-y-2 left-[4.25rem] w-px bg-white/10 [background-image:repeating-linear-gradient(to_bottom,transparent_0,transparent_6px,rgba(255,255,255,0.35)_6px,rgba(255,255,255,0.35)_7px)] sm:left-20"
        >
          <div className="experience-line-fill absolute inset-0 bg-gradient-to-b from-[#5227FF] via-[var(--signal)] to-[#FF9FFC] shadow-[0_0_15px_rgba(195,109,252,0.35)]" />
        </div>

        {EXPERIENCE_ITEMS.map((item, index) => (
          <li
            key={item.title}
            className="experience-item group relative grid grid-cols-[2.5rem_2rem_1fr] items-start gap-x-3 sm:grid-cols-[3rem_2rem_1fr] sm:gap-x-4"
          >
            {/* line-number gutter */}
            <span
              aria-hidden="true"
              className="experience-gutter select-none pt-2 text-right font-mono text-[0.7rem] font-medium tabular-nums text-white/20 sm:pt-2.5"
            >
              {String(index + 1).padStart(2, '0')}
            </span>

            {/* commit node — diamond marker, pulses while active */}
            <div className="experience-node relative z-10 mt-1 flex h-8 w-8 items-center justify-center sm:mt-1.5">
              <span
                aria-hidden="true"
                className="absolute inset-0 rotate-45 rounded-[7px] border border-white/15 bg-[#0a0e14] shadow-[0_0_20px_rgba(82,39,255,0.25)] transition-colors duration-300 group-hover:border-white/35"
              />
              <span
                className={`relative h-2 w-2 rounded-full ${item.status === 'active'
                  ? 'bg-[var(--signal)] shadow-[0_0_10px_var(--signal)]'
                  : 'bg-gradient-to-br from-[#5227FF] to-[#FF9FFC]'
                  }`}
              >
                {item.status === 'active' && (
                  <span
                    aria-hidden="true"
                    className="motion-safe:animate-ping absolute inset-0 rounded-full bg-[var(--signal)]"
                  />
                )}
              </span>
            </div>

            <BentoCard className="experience-card col-start-3 h-54 text-left">
              <div className="flex items-start justify-between gap-4">
                <h3 className="experience-card-title text-lg font-extrabold tracking-tight text-[var(--text)] md:text-xl">
                  {item.title}
                  <span
                    aria-hidden="true"
                    className="ml-0.5 inline-block h-[0.9em] w-[2px] translate-y-[0.1em] bg-[var(--signal)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-safe:group-hover:animate-pulse"
                  />
                </h3>

                <span className="experience-card-date flex shrink-0 items-center gap-1.5 pt-1">
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${item.status === 'active'
                      ? 'bg-[var(--signal)] shadow-[0_0_8px_var(--signal)]'
                      : 'bg-white/25'
                      }`}
                  />
                  <span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--signal)]">
                    {item.date}
                  </span>
                </span>
              </div>

              <p className="experience-card-description mt-2 text-sm leading-relaxed text-[var(--muted)] md:text-base">
                {item.description}
              </p>

              <div className="experience-card-meta mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-2.5">
                <span aria-hidden="true" className="font-mono text-xs text-white/25">
                  ›
                </span>
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  {item.subtitle}
                </span>
              </div>
            </BentoCard>
          </li>
        ))}
      </ol>
    </section>
  );
}