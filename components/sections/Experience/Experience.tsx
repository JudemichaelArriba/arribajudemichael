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
}

const EXPERIENCE_ITEMS: ExperienceItem[] = [
  {
    title: 'Capstone Project Deployment',
    subtitle: 'Production Release',
    date: '2025 — Present',
    description:
      'Deployment of full-stack capstone and facility intelligence platforms.',
  },
  {
    title: 'First Tagum City Hackathon',
    subtitle: 'Participant & Pitch',
    date: '2026',
    description:
      'Participated and pitched an innovative tech solution as a competitor in Tagum City’s inaugural hackathon event.',
  },

  {
    title: 'Started Building',
    subtitle: 'Self-Taught Foundations',
    date: '2023',
    description:
      'First lines of code, first bugs, first sites where the engineering habit began.',
  },
  {
    title: 'Bachelor of Science in Information Technology',
    subtitle: 'Aces Tagum Collage, Inc.',
    date: '2023',
    description:
      'Focused coursework in software engineering, systems design, and database architecture.',
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
        '.experience-card-date, .experience-card-meta, .experience-card-title, .experience-card-description',
        section
      );
      const lineFill = section.querySelector<HTMLElement>('.experience-line-fill');
      const triggers: ScrollTrigger[] = [];
      const timelines: gsap.core.Timeline[] = [];

      if (prefersReducedMotion) {
        gsap.set([...nodes, ...cards, ...cardInternals], {
          autoAlpha: 1,
          yPercent: 0,
          scale: 1,
          scaleX: 1,
          scaleY: 1,
          clearProps: 'transform,opacity,visibility,willChange',
        });
        if (lineFill) gsap.set(lineFill, { scaleY: 1, clearProps: 'transform' });
        return;
      }

      gsap.set(nodes, {
        autoAlpha: 0,
        scale: 0.35,
        transformOrigin: '50% 50%',
        willChange: 'transform, opacity',
      });
      gsap.set(cards, {
        autoAlpha: 0,
        yPercent: 38,
        scaleY: 0.94,
        scaleX: 0.98,
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
          '.experience-card-date, .experience-card-meta, .experience-card-title, .experience-card-description',
          card
        );

        const setItemInitialState = () => {
          timeline.pause(0, true);
          gsap.set(node, {
            autoAlpha: 0,
            scale: 0.35,
            transformOrigin: '50% 50%',
            willChange: 'transform, opacity',
          });
          gsap.set(card, {
            autoAlpha: 0,
            yPercent: 38,
            scaleY: 0.94,
            scaleX: 0.98,
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
            timeline.invalidate().restart(true);
          },
          onLeaveBack: setItemInitialState,
        });
        triggers.push(trigger);

        timeline
          .fromTo(
            node,
            {
              autoAlpha: 0,
              scale: 0.35,
              transformOrigin: '50% 50%',
            },
            {
              autoAlpha: 1,
              scale: 1.18,
              duration: 0.18,
              ease: 'power3.out',
              immediateRender: false,
            }
          )
          .to(node, {
            scale: 1,
            duration: 0.28,
            ease: 'back.out(2.2)',
            clearProps: 'transform,willChange',
          })
          .fromTo(
            card,
            {
              autoAlpha: 0,
              yPercent: 38,
              scaleY: 0.94,
              scaleX: 0.98,
              transformOrigin: '50% 100%',
            },
            {
              autoAlpha: 1,
              yPercent: -8,
              scaleY: 1.04,
              scaleX: 0.98,
              duration: 0.22,
              ease: 'power3.out',
              immediateRender: false,
            },
            '-=0.34'
          )
          .to(
            card,
            {
              yPercent: 0,
              scaleY: 1,
              scaleX: 1,
              duration: 0.32,
              ease: 'back.out(1.7)',
              clearProps: 'transform,willChange',
            },
            '-=0.08'
          )
          .fromTo(
            internals,
            {
              autoAlpha: 0,
            },
            {
              autoAlpha: 1,
              duration: 0.22,
              ease: 'power2.out',
              immediateRender: false,
              stagger: 0.055,
              clearProps: 'willChange',
            },
            '-=0.12'
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


      <ScrollFloat
        as="p"
        containerClassName="mb-[clamp(1.25rem,3vw,2rem)] text-center"
        textClassName="font-mono text-xs font-extrabold uppercase leading-[1.2] tracking-[0.14em] text-[color-mix(in_srgb,var(--signal)_78%,#ffffff_22%)]"
        playOnce={false}
      >
        {'// Experience'}
      </ScrollFloat>

      <BentoSpotlight
        gridRef={timelineRef}
        spotlightRadius={260}
        glowColor="195, 109, 252"
        activateOnCardOnly
      />


      <ol ref={timelineRef} className="relative flex flex-col gap-12 md:gap-16">

        <div
          aria-hidden="true"
          className="absolute inset-y-2 left-5 w-[2px] bg-white/10 md:left-1/2 md:-translate-x-1/2"
        >
          <div className="experience-line-fill absolute inset-0 bg-gradient-to-b from-[#5227FF] via-[var(--signal)] to-[#FF9FFC] shadow-[0_0_15px_rgba(195,109,252,0.35)]" />
        </div>

        {EXPERIENCE_ITEMS.map((item, index) => {
          const isRight = index % 2 === 1;

          return (
            <li
              key={item.title}
              className="experience-item relative grid grid-cols-[2.75rem_1fr] items-start gap-x-4 md:grid-cols-[1fr_2.75rem_1fr] md:items-center md:gap-x-8"
            >

              <div className="experience-node relative z-10 col-start-1 row-start-1 mt-1 flex h-9 w-9 items-center justify-center justify-self-center rounded-full border border-white/20 bg-[#0a0e14] shadow-[0_0_20px_rgba(82,39,255,0.25)] transition-transform duration-300 hover:scale-110 md:col-start-2 md:mt-0">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-full bg-gradient-to-r from-[var(--signal)] to-[#FF9FFC] shadow-[0_0_12px_var(--signal)]"
                />
              </div>


              <BentoCard
                className={`experience-card col-start-2 row-start-1 text-left ${isRight ? 'md:col-start-3' : 'md:col-start-1'}`}
              >

                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute top-6 hidden h-px w-5 bg-gradient-to-r from-white/25 to-transparent md:block ${isRight
                    ? '-left-5 bg-gradient-to-l'
                    : '-right-5 bg-gradient-to-r'
                    }`}
                />


                <div className="flex items-start justify-between gap-4">
                  <h3 className="experience-card-title text-lg font-extrabold tracking-tight text-[var(--text)] md:text-xl">
                    {item.title}
                  </h3>

                  <span className="experience-card-date shrink-0 font-mono text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--signal)] pt-1">
                    {item.date}
                  </span>
                </div>


                <p className="experience-card-description text-sm leading-relaxed text-[var(--muted)] md:text-base">
                  {item.description}
                </p>


                <div className="experience-card-meta mt-1 pt-2 border-t border-white/[0.06]">
                  <span className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    {item.subtitle}
                  </span>
                </div>
              </BentoCard>
            </li>
          );
        })}
      </ol>
    </section>
  );
}