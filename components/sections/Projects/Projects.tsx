'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight, BadgeCheck, FileText, PanelsTopLeft } from 'lucide-react';
import { BentoCard, BentoSpotlight } from '@/components/ui/Bento/Bento';
import CertificatePdfPreview from '@/components/ui/CertificatePdfPreview/CertificatePdfPreview';
import type { PublicCertificateDto } from '@/features/admin/certificates/types';
import type { PublicProjectDto } from '@/features/admin/projects/types';

gsap.registerPlugin(ScrollTrigger, useGSAP);

type ShowcaseView = 'projects' | 'certificates';

const SHOWCASE_BENTO_CARD_CLASS =
    'group h-full !min-h-0 !justify-start !gap-0 !p-0 text-left';

interface ProjectsProps {
    projects: PublicProjectDto[];
    certificates?: PublicCertificateDto[];
    projectsUnavailable?: boolean;
    certificatesUnavailable?: boolean;
}

function ProjectCard({ project, index }: { project: PublicProjectDto; index: number }) {
    return (
        <li data-showcase-item className="min-w-0">
            <BentoCard elevation="smooth" className={SHOWCASE_BENTO_CARD_CLASS}>
                <div className="relative aspect-[2.1/1] w-full overflow-hidden border-b border-white/[0.065] bg-[#05070a]">
                    {project.imageUrl ? (
                        <Image
                            src={project.imageUrl}
                            alt={project.imageAlt ?? ''}
                            fill
                            loading="eager"
                            sizes="(max-width: 639px) calc(100vw - 2.5rem), (max-width: 1023px) calc(50vw - 2.5rem), (max-width: 1279px) calc(33vw - 2rem), 416px"
                            className="object-cover object-top transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.035] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center text-[var(--muted)]/30">
                            <PanelsTopLeft aria-hidden="true" size={32} strokeWidth={1.4} />
                        </div>
                    )}
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/45 to-transparent"
                    />
                </div>

                <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <div className="flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-normal">
                        <span className="tabular-nums text-[var(--signal)]/72">
                            {String(index + 1).padStart(2, '0')}
                        </span>
                        <span aria-hidden="true" className="h-px w-4 bg-white/10" />
                        <span className="text-[var(--muted)]/52">{project.category}</span>
                    </div>

                    <h3 className="mt-2.5 text-xl font-extrabold leading-tight tracking-normal text-[var(--text)] sm:text-[1.35rem]">
                        {project.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-[1.6] text-[var(--muted)]/68">
                        {project.description}
                    </p>

                    <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
                        <ul className="flex min-w-0 flex-wrap gap-x-3 gap-y-1.5" aria-label={`${project.title} highlights`}>
                            {project.tags.map((tag) => (
                                <li key={tag} className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-normal text-[var(--muted)]/48">
                                    <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[var(--signal)]/55" />
                                    {tag}
                                </li>
                            ))}
                        </ul>
                        {project.githubUrl ? (
                            <a
                                href={project.githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 border-b border-[var(--signal)]/35 font-mono text-[10px] font-bold uppercase tracking-normal text-[var(--text)] transition-[border-color,color] duration-300 hover:border-[var(--signal)] hover:text-[var(--signal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                            >
                                View repository
                                <ArrowUpRight aria-hidden="true" size={14} strokeWidth={1.8} />
                            </a>
                        ) : null}
                    </div>
                </div>
            </BentoCard>
        </li>
    );
}

function CertificateCard({ certificate, index }: { certificate: PublicCertificateDto; index: number }) {
    return (
        <li data-showcase-item className="min-w-0">
            <a
                href={certificate.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${certificate.title} certificate PDF in a new tab`}
                className="block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
                <BentoCard elevation="smooth" className={SHOWCASE_BENTO_CARD_CLASS}>
                    <div className="aspect-[1.3/1] w-full overflow-hidden border-b border-white/[0.065] bg-white transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.018] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                        <CertificatePdfPreview
                            source={certificate.pdfUrl}
                            label={`${certificate.title} first-page preview`}
                        />
                    </div>

                    <div className="flex flex-1 flex-col p-4 sm:p-5">
                        <div className="flex items-center gap-2.5 font-mono text-[9px] font-bold uppercase tracking-normal">
                            <span className="tabular-nums text-[var(--signal)]/72">
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <span aria-hidden="true" className="h-px w-4 bg-white/10" />
                            <span className="inline-flex items-center gap-1.5 text-[var(--muted)]/52">
                                <FileText aria-hidden="true" size={12} strokeWidth={1.8} />
                                PDF credential
                            </span>
                        </div>

                        <h3 className="mt-2.5 line-clamp-2 text-lg font-extrabold leading-snug tracking-normal text-[var(--text)] sm:text-xl">
                            {certificate.title}
                        </h3>
                        <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]/62 sm:text-sm">
                            {certificate.issuer}
                        </p>

                        <div className="mt-auto flex items-center justify-between border-t border-white/[0.065] pt-3.5">
                            <span className="font-mono text-[9px] font-bold uppercase tracking-normal text-[var(--signal)]/75">
                                Open certificate
                            </span>
                            <ArrowUpRight
                                aria-hidden="true"
                                size={15}
                                strokeWidth={1.8}
                                className="text-[var(--muted)]/50 transition-[color,transform] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--signal)] motion-reduce:transition-none"
                            />
                        </div>
                    </div>
                </BentoCard>
            </a>
        </li>
    );
}

function ProjectStateCard({ unavailable }: { unavailable: boolean }) {
    return (
        <li data-showcase-item className="min-w-0 sm:col-span-2 lg:col-span-3">
            <BentoCard
                elevation="smooth"
                className="group h-full !min-h-56 !justify-center !gap-0 !p-6 text-center"
            >
                <PanelsTopLeft
                    aria-hidden="true"
                    size={24}
                    strokeWidth={1.5}
                    className="text-[var(--signal)]/65"
                />
                <h3 className="mt-4 text-lg font-extrabold tracking-normal text-[var(--text)]">
                    {unavailable ? 'Projects are temporarily unavailable.' : 'Projects are being prepared.'}
                </h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]/62">
                    {unavailable
                        ? 'Please check back shortly while this archive reconnects.'
                        : 'Published work will appear here as it becomes available.'}
                </p>
            </BentoCard>
        </li>
    );
}

function CertificateStateCard({ unavailable }: { unavailable: boolean }) {
    return (
        <li data-showcase-item className="min-w-0 sm:col-span-2 lg:col-span-3">
            <BentoCard
                elevation="smooth"
                className="group h-full !min-h-56 !justify-center !gap-0 !p-6 text-center"
            >
                <BadgeCheck
                    aria-hidden="true"
                    size={24}
                    strokeWidth={1.5}
                    className="text-[var(--signal)]/65"
                />
                <h3 className="mt-4 text-lg font-extrabold tracking-normal text-[var(--text)]">
                    {unavailable
                        ? 'Certificates are temporarily unavailable.'
                        : 'Certificates are being prepared.'}
                </h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]/62">
                    {unavailable
                        ? 'Please check back shortly while this credential archive reconnects.'
                        : 'Published credentials will appear here as they become available.'}
                </p>
            </BentoCard>
        </li>
    );
}

export default function Projects({
    projects,
    certificates = [],
    projectsUnavailable = false,
    certificatesUnavailable = false,
}: ProjectsProps) {
    const [activeView, setActiveView] = useState<ShowcaseView>('projects');
    const sectionRef = useRef<HTMLElement>(null);
    const showcaseGridRef = useRef<HTMLDivElement>(null);
    const sectionVisibleRef = useRef(false);
    const entryDelayRef = useRef<gsap.core.Tween | null>(null);
    const itemsTweenRef = useRef<gsap.core.Tween | gsap.core.Timeline | null>(null);

    useGSAP(
        () => {
            const section = sectionRef.current;
            if (!section) return;

            const headingCopy = section.querySelector<HTMLElement>('.showcase-heading-copy');
            const intro = section.querySelector<HTMLElement>('.showcase-intro');
            const controls = section.querySelector<HTMLElement>('.showcase-controls');
            const headingLines = gsap.utils.toArray<HTMLElement>('[data-showcase-line]', section);
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh());

            const getItems = () => gsap.utils.toArray<HTMLElement>('[data-showcase-item]', section);
            const headingTargets = [headingCopy, intro, controls].filter(
                (target): target is HTMLElement => target !== null
            );

            if (prefersReducedMotion) {
                sectionVisibleRef.current = true;
                gsap.set([...headingTargets, ...headingLines, ...getItems()], {
                    autoAlpha: 1,
                    x: 0,
                    y: 0,
                    scale: 1,
                    scaleX: 1,
                    clearProps: 'transform,opacity,visibility,willChange',
                });
                return () => {
                    window.cancelAnimationFrame(refreshFrame);
                    sectionVisibleRef.current = false;
                };
            }

            const setHeadingInitialState = () => {
                gsap.set(headingTargets, { autoAlpha: 0, y: 16 });
                headingLines.forEach((line, index) => {
                    gsap.set(line, {
                        scaleX: 0,
                        transformOrigin: index === 0 ? 'right center' : 'left center',
                    });
                });
            };

            const setItemsInitialState = () => {
                gsap.set(getItems(), {
                    autoAlpha: 0,
                    y: 22,
                });
            };

            setHeadingInitialState();
            setItemsInitialState();

            const headingTimeline = gsap.timeline({
                paused: true,
                defaults: { overwrite: 'auto', force3D: true },
            });

            headingTimeline
                .to(headingCopy, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.58,
                    ease: 'power3.out',
                }, 0)
                .to(headingLines, {
                    scaleX: 1,
                    duration: 0.7,
                    ease: 'power3.out',
                    stagger: 0.04,
                }, 0.08)
                .to(intro, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.62,
                    ease: 'power3.out',
                }, 0.16)
                .to(controls, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.56,
                    ease: 'power3.out',
                }, 0.24);

            const revealItems = () => {
                const items = getItems();
                itemsTweenRef.current?.kill();
                gsap.set(items, {
                    autoAlpha: 0,
                    y: 22,
                    willChange: 'transform, opacity',
                });
                itemsTweenRef.current = gsap.to(items, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.64,
                    ease: 'power3.out',
                    stagger: 0.07,
                    overwrite: 'auto',
                    clearProps: 'transform,opacity,visibility,willChange',
                });
            };

            const resetSection = () => {
                entryDelayRef.current?.kill();
                entryDelayRef.current = null;
                itemsTweenRef.current?.kill();
                itemsTweenRef.current = null;
                headingTimeline.pause(0, true);
                setHeadingInitialState();
                setItemsInitialState();
            };

            const trigger = ScrollTrigger.create({
                trigger: section,
                start: 'top 86%',
                end: 'bottom top',
                invalidateOnRefresh: true,
                onEnter: () => {
                    sectionVisibleRef.current = true;
                    resetSection();
                    headingTimeline.restart(true);
                    entryDelayRef.current = gsap.delayedCall(0.18, revealItems);
                },
                onLeaveBack: () => {
                    sectionVisibleRef.current = false;
                    resetSection();
                },
            });

            return () => {
                window.cancelAnimationFrame(refreshFrame);
                sectionVisibleRef.current = false;
                entryDelayRef.current?.kill();
                entryDelayRef.current = null;
                itemsTweenRef.current?.kill();
                itemsTweenRef.current = null;
                trigger.kill(false);
                headingTimeline.kill();
            };
        },
        { scope: sectionRef }
    );

    useGSAP(
        () => {
            const section = sectionRef.current;
            if (!section) return;

            const items = gsap.utils.toArray<HTMLElement>('[data-showcase-item]', section);
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            if (prefersReducedMotion) {
                gsap.set(items, { autoAlpha: 1, clearProps: 'transform,opacity,visibility,willChange' });
                const refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh());
                return () => window.cancelAnimationFrame(refreshFrame);
            }

            entryDelayRef.current?.kill();
            entryDelayRef.current = null;
            itemsTweenRef.current?.kill();
            itemsTweenRef.current = null;

            gsap.set(items, {
                autoAlpha: 0,
                y: 20,
            });

            const refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh());

            if (!sectionVisibleRef.current) {
                return () => window.cancelAnimationFrame(refreshFrame);
            }

            const timeline = gsap.timeline({ defaults: { overwrite: 'auto', force3D: true } });
            itemsTweenRef.current = timeline;
            timeline.to(items, {
                autoAlpha: 1,
                y: 0,
                duration: 0.58,
                ease: 'power3.out',
                stagger: 0.06,
                clearProps: 'transform,opacity,visibility,willChange',
            });

            return () => {
                window.cancelAnimationFrame(refreshFrame);
                timeline.kill();
                if (itemsTweenRef.current === timeline) itemsTweenRef.current = null;
            };
        },
        {
            scope: sectionRef,
            dependencies: [activeView, projects.length, certificates.length],
            revertOnUpdate: true,
        }
    );

    return (
        <section
            id="projects"
            data-analytics-section="projects"
            ref={sectionRef}
            aria-labelledby="projects-heading"
            className="relative w-full scroll-mt-[calc(var(--nav-height,80px)+2rem)] px-5 py-24 md:px-8 md:py-32"
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[var(--signal)]/20 to-transparent md:inset-x-8"
            />

            <div className="mx-auto max-w-7xl">
                <div className="showcase-heading-copy flex w-full items-center gap-4">
                    <span
                        data-showcase-line
                        aria-hidden="true"
                        className="h-px w-8 shrink-0 bg-gradient-to-r from-transparent to-[var(--signal)]/55 sm:w-12"
                    />
                    <p className="shrink-0 font-mono text-xs font-extrabold uppercase leading-none tracking-normal text-[color-mix(in_srgb,var(--signal)_82%,#ffffff_18%)]">
                        Projects &amp; Credentials
                    </p>
                    <span
                        data-showcase-line
                        aria-hidden="true"
                        className="h-px min-w-8 flex-1 bg-gradient-to-r from-[var(--signal)]/45 via-white/10 to-transparent"
                    />
                    <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-normal text-[var(--muted)]/48 sm:inline">
                        06 / Archive
                    </span>
                </div>

                <div className="mt-12 grid items-end gap-8 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12">
                    <div className="showcase-intro max-w-3xl">
                        <h2
                            id="projects-heading"
                            className="font-display text-4xl font-extrabold leading-[1.05] tracking-normal text-[var(--text)] sm:text-5xl lg:text-[3.5rem]"
                        >
                            Selected work. Verified learning.
                        </h2>
                        <p className="mt-5 max-w-2xl text-base leading-[1.7] text-[var(--muted)]/68 sm:text-lg">
                            A focused archive of shipped interfaces, operational systems, and credentials earned along the way.
                        </p>
                    </div>

                    <div
                        role="group"
                        aria-label="Choose showcase content"
                        className="showcase-controls relative grid h-[3.25rem] w-full grid-cols-2 rounded-lg border border-white/[0.085] bg-white/[0.025] p-1 sm:w-[22rem]"
                    >
                        <span
                            aria-hidden="true"
                            className={`absolute bottom-1 left-1 top-1 w-[calc(50%-0.25rem)] rounded-[6px] border border-[rgba(195,109,252,0.17)] bg-[rgba(195,109,252,0.09)] shadow-[inset_0_0_16px_rgba(195,109,252,0.035)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${activeView === 'certificates' ? 'translate-x-full' : 'translate-x-0'}`}
                        />

                        <button
                            type="button"
                            aria-pressed={activeView === 'projects'}
                            onClick={() => setActiveView('projects')}
                            className={`relative z-[1] flex min-w-0 items-center justify-center gap-2 rounded-[6px] px-3 font-mono text-[11px] font-bold uppercase tracking-normal transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 motion-reduce:transition-none ${activeView === 'projects' ? 'text-[var(--signal)]' : 'text-[var(--muted)]/58 hover:text-[var(--text)]'}`}
                        >
                            <PanelsTopLeft aria-hidden="true" size={15} strokeWidth={1.8} />
                            <span className="truncate">Projects</span>
                            <span className="tabular-nums text-[9px] opacity-55">{projects.length}</span>
                        </button>
                        <button
                            type="button"
                            aria-pressed={activeView === 'certificates'}
                            onClick={() => setActiveView('certificates')}
                            className={`relative z-[1] flex min-w-0 items-center justify-center gap-2 rounded-[6px] px-3 font-mono text-[11px] font-bold uppercase tracking-normal transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 motion-reduce:transition-none ${activeView === 'certificates' ? 'text-[var(--signal)]' : 'text-[var(--muted)]/58 hover:text-[var(--text)]'}`}
                        >
                            <BadgeCheck aria-hidden="true" size={15} strokeWidth={1.8} />
                            <span className="truncate">Certificates</span>
                            <span className="tabular-nums text-[9px] opacity-55">{certificates.length}</span>
                        </button>
                    </div>
                </div>

                <div
                    id="showcase-panel"
                    ref={showcaseGridRef}
                    aria-live="polite"
                    className="relative mt-10 sm:mt-12"
                >
                    <BentoSpotlight
                        gridRef={showcaseGridRef}
                        spotlightRadius={240}
                        activateOnCardOnly
                    />
                    {activeView === 'projects' ? (
                        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                            {projects.length > 0 && !projectsUnavailable ? (
                                projects.map((project, index) => (
                                    <ProjectCard key={project.id} project={project} index={index} />
                                ))
                            ) : (
                                <ProjectStateCard unavailable={projectsUnavailable} />
                            )}
                        </ul>
                    ) : (
                        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                            {certificates.length > 0 && !certificatesUnavailable ? (
                                certificates.map((certificate, index) => (
                                    <CertificateCard
                                        key={certificate.id}
                                        certificate={certificate}
                                        index={index}
                                    />
                                ))
                            ) : (
                                <CertificateStateCard unavailable={certificatesUnavailable} />
                            )}
                        </ul>
                    )}
                </div>
            </div>
        </section>
    );
}
