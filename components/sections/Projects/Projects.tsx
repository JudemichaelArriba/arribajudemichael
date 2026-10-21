'use client';

import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Image from 'next/image';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight, BadgeCheck, PanelsTopLeft } from 'lucide-react';

import CertificatePdfPreview, { preloadPdfRuntime } from '@/components/ui/CertificatePdfPreview/CertificatePdfPreview';
import type { PublicCertificateDto } from '@/features/admin/certificates/types';
import type { PublicProjectDto } from '@/features/admin/projects/types';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export type ShowcasePanel = 'projects' | 'certificates';

interface ProjectsProps {
    projects: PublicProjectDto[];
    certificates?: PublicCertificateDto[];
    projectsUnavailable?: boolean;
    certificatesUnavailable?: boolean;
}

/** Pinned card stack wherever a spread fits on screen (phones in portrait too); otherwise spreads scroll. */
const STACK_QUERY = '(min-height: 560px)';
const NO_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Re-measures only the triggers inside `section` and after it (the sections above are unaffected). */
function refreshTriggersFrom(section: HTMLElement) {
    ScrollTrigger.sort();
    ScrollTrigger.getAll()
        .filter(({ trigger }) => trigger instanceof Element
            && (section.contains(trigger) || !!(section.compareDocumentPosition(trigger) & Node.DOCUMENT_POSITION_FOLLOWING)))
        .forEach((scrollTrigger) => scrollTrigger.refresh());
}

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--site-bg)]';

/**
 * One frame shape for every spread, projects and certificates alike, so the boxes match and the
 * layout never shifts when a screenshot or PDF finishes loading. Visuals are fitted inside it,
 * never cropped or zoomed.
 */
const FRAME_RATIO = 16 / 9;

interface SpreadProps {
    panel: ShowcasePanel;
    index: number;
    flip: boolean;
    frame: ReactNode;
    meta: string;
    title: string;
    description: string;
    rows: { label: string; value: string }[];
    action: ReactNode;
}

/** Direction B spread: a large framed visual and the copy, alternating sides. */
function Spread({ panel, index, flip, frame, meta, title, description, rows, action }: SpreadProps) {
    return (
        <article
            data-showcase-item
            data-panel={panel}
            className={`grid grid-cols-1 items-start gap-6 border-t border-[var(--hairline)] py-8 sm:py-12 lg:gap-14 lg:py-14 group-data-[stack=on]/showcase:absolute group-data-[stack=on]/showcase:inset-x-0 group-data-[stack=on]/showcase:top-0 group-data-[stack=on]/showcase:origin-top group-data-[stack=on]/showcase:bg-[var(--site-bg)] lg:group-data-[stack=on]/showcase:pb-12 lg:group-data-[stack=on]/showcase:pt-7 short:group-data-[stack=on]/showcase:pb-8 short:group-data-[stack=on]/showcase:pt-4 short:gap-10 max-lg:group-data-[stack=on]/showcase:bottom-0 max-lg:group-data-[stack=on]/showcase:flex max-lg:group-data-[stack=on]/showcase:flex-col max-lg:group-data-[stack=on]/showcase:items-stretch max-lg:group-data-[stack=on]/showcase:gap-3 max-lg:group-data-[stack=on]/showcase:pb-4 max-lg:group-data-[stack=on]/showcase:pt-4 ${flip
                ? 'lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]'
                : 'lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]'}`}
        >
            {/* Phones (stacked): this box starts at the frame's natural height (full width) and only
                shrinks when the screen is too short for the whole spread; the frame is then sized to
                fit it with container units, so frame, number and copy always fit on screen. */}
            <div
                style={{ '--ratio': FRAME_RATIO } as CSSProperties}
                className={`min-w-0 self-start ${flip ? 'lg:order-2' : ''} max-lg:group-data-[stack=on]/showcase:min-h-0 max-lg:group-data-[stack=on]/showcase:w-full max-lg:group-data-[stack=on]/showcase:flex-[0_1_calc((100vw-4.25rem)/var(--ratio)+4.375rem)] sm:max-lg:group-data-[stack=on]/showcase:flex-[0_1_calc((100vw-4.25rem)/var(--ratio)+5.125rem)] md:max-lg:group-data-[stack=on]/showcase:flex-[0_1_calc((100vw-5.75rem)/var(--ratio)+5.125rem)] max-lg:group-data-[stack=on]/showcase:pb-6 sm:max-lg:group-data-[stack=on]/showcase:pb-9 max-lg:group-data-[stack=on]/showcase:[container-type:size]`}
            >
                <div
                    data-spread-frame
                    className="relative mx-auto w-full border border-[var(--hairline)] bg-[var(--surface)] p-3 sm:p-3.5 lg:group-data-[stack=on]/showcase:max-w-[calc((var(--stage-h,60svh)-10rem)*var(--ratio)+2rem)] max-lg:group-data-[stack=on]/showcase:max-w-[min(100cqw,calc((100cqh-2.875rem)*var(--ratio)+1.75rem))] max-lg:group-data-[stack=on]/showcase:p-3"
                >
                    <div aria-hidden="true" className="flex gap-1.5">
                        <i className="size-2 border border-[var(--hairline)]" />
                        <i className="size-2 border border-[var(--hairline)]" />
                        <i className="size-2 border border-[var(--hairline)]" />
                    </div>
                    <div className="relative mt-2.5 overflow-hidden border border-[var(--hairline)] bg-[var(--surface-muted)]" style={{ aspectRatio: FRAME_RATIO }}>
                        {frame}
                    </div>
                    <span aria-hidden="true" className="pointer-events-none absolute -bottom-5 right-4 font-[family-name:var(--font-hero)] text-[4.5rem] leading-none text-[var(--text)] sm:-bottom-8 sm:text-[7.5rem] short:-bottom-6 short:text-[5.5rem]">
                        {String(index + 1).padStart(2, '0')}
                    </span>
                </div>
            </div>

            <div data-spread-copy className="flex min-w-0 flex-col pt-1 max-lg:group-data-[stack=on]/showcase:shrink-0 max-lg:group-data-[stack=on]/showcase:pt-0">
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--faint)]">{meta}</span>
                <h3 className="mt-3.5 font-display text-[1.9rem] font-bold leading-[1.02] tracking-[-0.03em] text-[var(--text)] sm:text-[2.4rem] lg:text-[clamp(2.2rem,3.2vw,2.9rem)] short:mt-2.5 short:text-[clamp(1.6rem,4.4svh,2.2rem)] max-lg:group-data-[stack=on]/showcase:mt-2 max-lg:group-data-[stack=on]/showcase:text-[clamp(1.35rem,3.4svh,1.75rem)]">
                    {title}
                </h3>
                <p className="mt-4 text-[0.95rem] leading-[1.75] text-[var(--muted)] sm:text-base lg:group-data-[stack=on]/showcase:line-clamp-4 max-lg:group-data-[stack=on]/showcase:mt-2 max-lg:group-data-[stack=on]/showcase:line-clamp-2 max-lg:group-data-[stack=on]/showcase:text-sm max-lg:group-data-[stack=on]/showcase:leading-relaxed short:mt-3 short:text-sm short:leading-relaxed short:group-data-[stack=on]/showcase:line-clamp-3">
                    {description}
                </p>
                <dl className="mt-6 border-t border-[var(--hairline)] short:mt-4 max-lg:group-data-[stack=on]/showcase:hidden">
                    {rows.map((row) => (
                        <div key={row.label} className="grid grid-cols-[7.5rem_minmax(0,1fr)] border-b border-[var(--hairline)] py-3 text-sm short:py-2">
                            <dt className="pt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--faint)]">{row.label}</dt>
                            <dd className="m-0 font-semibold text-[var(--text)]">{row.value}</dd>
                        </div>
                    ))}
                </dl>
                <div className="mt-7 short:mt-4 max-lg:group-data-[stack=on]/showcase:mt-3">{action}</div>
            </div>
        </article>
    );
}

function ProjectSpread({ project, index, total }: { project: PublicProjectDto; index: number; total: string }) {
    return (
        <Spread
            panel="projects"
            index={index}
            flip={index % 2 === 1}
            meta={`${String(index + 1).padStart(2, '0')} / ${total} · ${project.category}`}
            title={project.title}
            description={project.description}
            rows={[
                { label: 'Category', value: project.category },
                ...(project.tags.length ? [{ label: 'Stack', value: project.tags.join(' · ') }] : []),
            ]}
            frame={project.imageUrl ? (
                <Image
                    src={project.imageUrl}
                    alt={project.imageAlt ?? ''}
                    fill
                    sizes="(max-width: 1023px) calc(100vw - 4rem), 760px"
                    className="object-cover object-top"
                />
            ) : (
                <div className="flex h-full items-center justify-center text-[var(--faint)]">
                    <PanelsTopLeft aria-hidden="true" size={32} strokeWidth={1.4} />
                </div>
            )}
            action={project.githubUrl ? (
                <ActionLink href={project.githubUrl} label={`View the ${project.title} repository on GitHub (opens in a new tab)`}>
                    View repository
                </ActionLink>
            ) : null}
        />
    );
}

function ActionLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className={`group inline-flex min-h-12 short:min-h-10 items-center gap-2.5 border border-[var(--text)] px-5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text)] transition-colors duration-300 hover:bg-[var(--inverse-bg)] hover:text-[var(--inverse-text)] motion-reduce:transition-none ${FOCUS_RING}`}
        >
            {children}
            <ArrowUpRight aria-hidden="true" size={14} strokeWidth={2} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </a>
    );
}

function StateSpread({ panel, unavailable }: { panel: ShowcasePanel; unavailable: boolean }) {
    const isProjects = panel === 'projects';
    const Icon = isProjects ? PanelsTopLeft : BadgeCheck;
    const noun = isProjects ? 'Projects' : 'Certificates';
    return (
        <article data-showcase-item data-panel={panel} className="flex flex-col items-center justify-center gap-3 border-t border-[var(--hairline)] py-16 text-center group-data-[stack=on]/showcase:absolute group-data-[stack=on]/showcase:inset-x-0 group-data-[stack=on]/showcase:top-0 group-data-[stack=on]/showcase:bg-[var(--site-bg)]">
            <Icon aria-hidden="true" size={24} strokeWidth={1.5} className="text-[var(--faint)]" />
            <h3 className="font-display text-lg font-bold tracking-[-0.02em] text-[var(--text)]">
                {unavailable ? `${noun} are temporarily unavailable.` : `${noun} are being prepared.`}
            </h3>
            <p className="max-w-md text-sm leading-relaxed text-[var(--muted)]">
                {unavailable ? 'Please check back shortly while this archive reconnects.' : 'Published items will appear here as they become available.'}
            </p>
        </article>
    );
}

export default function Projects({
    projects,
    certificates = [],
    projectsUnavailable = false,
    certificatesUnavailable = false,
}: ProjectsProps) {
    const [activePanel, setActivePanel] = useState<ShowcasePanel>('projects');
    const sectionRef = useRef<HTMLElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    /** Rebuilds the open list's animation in place after a tab switch (set while motion is on). */
    const showcaseRef = useRef<{ rebuild: () => void } | null>(null);
    const builtPanelRef = useRef<ShowcasePanel>(activePanel);

    const showProjects = projects.length > 0 && !projectsUnavailable;
    const showCertificates = certificates.length > 0 && !certificatesUnavailable;
    /** Spreads per tab (an empty or unavailable tab shows one state spread). */
    const projectSlots = showProjects ? projects.length : 1;
    const certificateSlots = showCertificates ? certificates.length : 1;

    // A tab switch only swaps the list: the pin, its length and the scroll position stay as they
    // are, and the new list takes the state of the current scroll position. Nothing replays.
    const selectPanel = useCallback((panel: ShowcasePanel) => setActivePanel(panel), []);

    useGSAP(
        () => {
            const section = sectionRef.current;
            const header = headerRef.current;
            const stage = stageRef.current;
            if (!section || !header || !stage) return;

            const mm = gsap.matchMedia();
            // `any` always matches: matchMedia only runs the callback when at least one condition does.
            mm.add({ any: 'all', stack: STACK_QUERY, reduce: NO_MOTION_QUERY }, (context) => {
                const { stack, reduce } = context.conditions as { stack: boolean; reduce: boolean };
                if (reduce) return;
                const steps = Math.max(projectSlots, certificateSlots);
                const stacked = stack && steps >= 2;

                const intro = gsap.timeline({
                    defaults: { ease: 'none' },
                    paused: stacked,
                    scrollTrigger: stacked ? undefined : { trigger: section, start: 'top 85%', end: 'top 35%', scrub: 0.6 },
                });
                intro
                    .fromTo('[data-showcase-line]', { scaleX: 0 }, { scaleX: 1, transformOrigin: 'left center', duration: 0.3 }, 0)
                    .fromTo('#projects-heading', { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: 0.5 }, 0)
                    .fromTo('[data-showcase-intro]', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.2)
                    .fromTo('[data-showcase-switch]', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.3);

                if (!stacked) {
                    // Short screens (e.g. a phone held sideways): spreads scroll normally. Frame and copy
                    // are each timed to themselves so every reveal plays while it is on screen; the wipe
                    // runs past the frame's bottom edge so the index number below it is uncovered too.
                    let reveals: gsap.core.Tween[] = [];
                    const build = () => {
                        reveals.forEach((tween) => tween.revert());
                        reveals = [];
                        const reveal = (target: Element, from: gsap.TweenVars, to: gsap.TweenVars, start: string, end: string) => {
                            reveals.push(gsap.fromTo(target, from, {
                                ...to,
                                ease: 'none',
                                scrollTrigger: { trigger: target, start, end, scrub: 0.6, invalidateOnRefresh: true },
                            }));
                        };
                        gsap.utils.toArray<HTMLElement>('[data-showcase-item]', section).forEach((item) => {
                            const frame = item.querySelector('[data-spread-frame]');
                            const copy = item.querySelector('[data-spread-copy]');
                            if (frame) reveal(frame, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% -25% 0%)' }, 'top 92%', 'top 40%');
                            if (copy) reveal(copy, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0 }, 'top 95%', 'top 65%');
                            if (!frame && !copy) reveal(item, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0 }, 'top 92%', 'top 60%');
                        });
                    };
                    build();
                    const rebuild = context.add('rebuild', () => {
                        build();
                        // The list's height changed: re-measure only what sits below it.
                        refreshTriggersFrom(section);
                    }) as () => void;
                    showcaseRef.current = { rebuild };
                    return () => {
                        showcaseRef.current = null;
                    };
                }

                // Card stack (phones included, like the scroll animation page): pin the section and
                // slide each spread of the open tab over the previous one.
                section.dataset.stack = 'on';
                // Size the stacked spreads from the real space under the header, so the frame and its
                // big index number always fit.
                const measureStage = () => {
                    const gap = window.innerWidth < 1024 ? 12 : 24;
                    stage.style.top = `${header.offsetTop + header.offsetHeight + gap}px`;
                    section.style.setProperty('--stage-h', `${stage.clientHeight}px`);
                };
                measureStage();

                // One scroll position drives whichever list is open, so a tab switch can rebuild the
                // list's timeline and drop it at the current position without touching the pin.
                const progress = { value: 0 };
                let items: gsap.core.Timeline | null = null;
                const build = () => {
                    items?.revert();
                    const list = gsap.utils.toArray<HTMLElement>('[data-showcase-item]', section);
                    const step = 0.92 / Math.max(list.length, 1);
                    const timeline = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
                    list.forEach((item, index) => {
                        const at = 0.06 + index * step;
                        const inner = item.querySelectorAll('[data-spread-frame], [data-spread-copy]');
                        timeline.fromTo(item, { yPercent: 105 }, { yPercent: 0, ease: 'power2.out', duration: step * 0.8 }, at);
                        if (inner.length) timeline.fromTo(inner, { autoAlpha: 0.2 }, { autoAlpha: 1, duration: step * 0.6 }, at + step * 0.2);
                        if (index > 0) timeline.fromTo(list[index - 1], { scale: 1, autoAlpha: 1 }, { scale: 0.94, autoAlpha: 0, duration: step * 0.8 }, at);
                    });
                    timeline.to({}, { duration: Math.max(0, 1 - timeline.duration()) });
                    timeline.progress(progress.value);
                    items = timeline;
                };
                build();

                ScrollTrigger.create({
                    trigger: section,
                    start: 'top top',
                    // Sized for the longer tab, so switching never changes the page height. At least
                    // 420px per spread so short screens keep the same pace.
                    end: () => `+=${steps * Math.max(window.innerHeight * 0.5, 420)}`,
                    pin: true,

                    scrub: 0.6,
                    invalidateOnRefresh: true,
                    onRefreshInit: measureStage,
                    animation: gsap.to(progress, {
                        value: 1,
                        ease: 'none',
                        onUpdate: () => {
                            intro.progress(Math.min(1, progress.value / 0.06));
                            items?.progress(progress.value);
                        },
                    }),
                });

                const rebuild = context.add('rebuild', build) as () => void;
                showcaseRef.current = { rebuild };
                return () => {
                    showcaseRef.current = null;
                    delete section.dataset.stack;
                    stage.style.top = '';
                    section.style.removeProperty('--stage-h');
                };
            }, section);

            // This section streams in after the ones below it were set up: re-sort so every trigger
            // (and the pins below) is measured in document order, then refresh.
            const refreshFrame = window.requestAnimationFrame(() => {
                ScrollTrigger.sort();
                ScrollTrigger.refresh();
            });
            return () => {
                window.cancelAnimationFrame(refreshFrame);
                mm.revert();
            };
        },
        // Not keyed on the open tab: a switch rebuilds only the list (below), never the pin.
        { scope: sectionRef, dependencies: [projectSlots, certificateSlots], revertOnUpdate: true },
    );

    // Runs after the new list is in the DOM and before it is painted, so it never flashes unplaced.
    useLayoutEffect(() => {
        if (builtPanelRef.current === activePanel) return;
        builtPanelRef.current = activePanel;
        showcaseRef.current?.rebuild();
    }, [activePanel]);

    const projectsTotal = String(projects.length).padStart(2, '0');
    const certificatesTotal = String(certificates.length).padStart(2, '0');

    return (
        <section
            id="projects"
            data-analytics-section="projects"
            ref={sectionRef}
            aria-labelledby="projects-heading"
            className="group/showcase relative w-full scroll-mt-[calc(var(--nav-height,80px)+2rem)] px-5 py-24 md:px-8 md:py-32 data-[stack=on]:h-svh data-[stack=on]:overflow-hidden data-[stack=on]:py-0 lg:data-[stack=on]:pt-24 short:data-[stack=on]:pt-[4.5rem] max-lg:data-[stack=on]:pt-[4.75rem]"
        >
            <div className="relative mx-auto h-full max-w-7xl">
                <div ref={headerRef}>
                    <div className="flex w-full items-center gap-4">
                        <p className="shrink-0 font-display text-xs font-bold uppercase leading-none tracking-[0.14em] text-[var(--text)]">
                            Projects &amp; Credentials
                        </p>
                        <span data-showcase-line aria-hidden="true" className="h-px min-w-8 flex-1 bg-[var(--hairline)]" />
                        <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)] sm:inline">
                            06 / Archive
                        </span>
                    </div>

                    <div className="mt-12 grid items-end gap-8 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12 short:mt-5 max-lg:group-data-[stack=on]/showcase:mt-5 max-lg:group-data-[stack=on]/showcase:gap-4">
                        <div className="max-w-3xl">
                            <h2 id="projects-heading" className="font-display text-4xl font-bold leading-[1.05] tracking-[-0.025em] text-[var(--text)] sm:text-5xl lg:text-[3.4rem] short:text-[clamp(2rem,5.5svh,2.6rem)] max-lg:group-data-[stack=on]/showcase:text-[clamp(1.75rem,4.4svh,2.25rem)]">
                                Selected work. Verified learning.
                            </h2>
                            <p data-showcase-intro className="mt-5 max-w-2xl text-base leading-[1.7] text-[var(--muted)] sm:text-lg short:hidden max-lg:group-data-[stack=on]/showcase:hidden">
                                A focused archive of shipped interfaces, operational systems, and credentials earned along the way.
                            </p>
                        </div>

                        <div
                            data-showcase-switch
                            role="group"
                            aria-label="Choose showcase content"
                            // Intent to switch (hover, focus, touch): fetch the PDF renderer before the click.
                            onPointerEnter={showCertificates ? preloadPdfRuntime : undefined}
                            onFocus={showCertificates ? preloadPdfRuntime : undefined}
                            onTouchStart={showCertificates ? preloadPdfRuntime : undefined}
                            className="relative grid h-[3.25rem] w-full grid-cols-2 max-lg:group-data-[stack=on]/showcase:h-11 border border-[var(--hairline)] p-1 sm:w-[22rem]"
                        >
                            <span
                                aria-hidden="true"
                                className={`absolute bottom-1 left-1 top-1 w-[calc(50%-0.25rem)] bg-[var(--inverse-bg)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${activePanel === 'certificates' ? 'translate-x-full' : 'translate-x-0'}`}
                            />
                            {(['projects', 'certificates'] as const).map((panel) => {
                                const active = activePanel === panel;
                                const Icon = panel === 'projects' ? PanelsTopLeft : BadgeCheck;
                                return (
                                    <button
                                        key={panel}
                                        type="button"
                                        aria-pressed={active}
                                        aria-controls="showcase-panel"
                                        onClick={() => selectPanel(panel)}
                                        className={`relative z-[1] flex min-w-0 items-center justify-center gap-2 px-3 font-mono text-[11px] font-bold uppercase tracking-normal transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 motion-reduce:transition-none ${active ? 'text-[var(--inverse-text)]' : 'text-[var(--faint)] hover:text-[var(--text)]'}`}
                                    >
                                        <Icon aria-hidden="true" size={15} strokeWidth={1.8} />
                                        <span className="truncate">{panel === 'projects' ? 'Projects' : 'Certificates'}</span>
                                        <span className="tabular-nums text-[9px] opacity-60">
                                            {panel === 'projects' ? projects.length : certificates.length}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div ref={stageRef} className="relative mt-10 sm:mt-12 group-data-[stack=on]/showcase:absolute group-data-[stack=on]/showcase:inset-x-0 group-data-[stack=on]/showcase:bottom-0 group-data-[stack=on]/showcase:mt-0">
                    <div id="showcase-panel" aria-live="polite">
                        {activePanel === 'projects' && (showProjects
                            ? projects.map((project, index) => (
                                <ProjectSpread key={project.id} project={project} index={index} total={projectsTotal} />
                            ))
                            : <StateSpread panel="projects" unavailable={projectsUnavailable} />)}

                        {activePanel === 'certificates' && (showCertificates
                            ? certificates.map((certificate, index) => (
                                <Spread
                                    key={certificate.id}
                                    panel="certificates"
                                    index={index}
                                    flip={index % 2 === 1}
                                    meta={`${String(index + 1).padStart(2, '0')} / ${certificatesTotal} · Certificate`}
                                    title={certificate.title}
                                    description={`Issued by ${certificate.issuer.replace(/\.$/, '')}.`}
                                    rows={[
                                        { label: 'Issuer', value: certificate.issuer },
                                        { label: 'Format', value: 'PDF certificate' },
                                    ]}
                                    frame={(
                                        // Page 1 sits whole on white paper that fills the frame, so it reads as the
                                        // document itself; loaded with the tab, painted one at a time in idle moments.
                                        <CertificatePdfPreview source={certificate.pdfUrl} label={`${certificate.title} first-page preview`} eager />
                                    )}
                                    action={(
                                        <ActionLink href={certificate.pdfUrl} label={`Open the ${certificate.title} certificate PDF (opens in a new tab)`}>
                                            Open PDF
                                        </ActionLink>
                                    )}
                                />
                            ))
                            : <StateSpread panel="certificates" unavailable={certificatesUnavailable} />)}
                    </div>
                </div>
            </div>
        </section>
    );
}
