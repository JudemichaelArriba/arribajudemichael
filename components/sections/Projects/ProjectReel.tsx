'use client';

import { useCallback, useRef, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import { PanelsTopLeft } from 'lucide-react';

import type { PublicProjectDto } from '@/features/admin/projects/types';

import ShowcaseState from './ShowcaseState';
import { ShowcaseLink } from './ShowcaseParts';
import { MONO_LABEL, padIndex } from './showcase';
import { useReelMotion } from './useReelMotion';

const INTRO = 'Systems built end to end, from the interface down to the database.';

/** Minor ruler ticks between two projects. */
const MINOR_TICKS = Array.from({ length: 9 }, (_, index) => index);

/**
 * Frames other than the first start dimmed, as the motion would draw them, so nothing flashes
 * before it takes over. Constant, so React never rewrites the styles the motion owns.
 */
const AWAY_STYLE: CSSProperties = { opacity: 0.3, transform: 'scale(0.86)' };

const repositoryLabel = (project: PublicProjectDto) => `View the ${project.title} repository on GitHub (opens in a new tab)`;

/** The screenshot fills its frame from the top; a project without one shows a quiet placeholder. */
function Screenshot({ project }: { project: PublicProjectDto }) {
    if (!project.imageUrl) {
        return (
            <div className="flex h-full items-center justify-center text-[var(--faint)]">
                <PanelsTopLeft aria-hidden="true" size={32} strokeWidth={1.4} />
            </div>
        );
    }
    return (
        <Image
            src={project.imageUrl}
            alt={project.imageAlt ?? ''}
            fill
            draggable={false}
            sizes="(min-width: 1024px) min(62vw, 1040px), 88vw"
            className="pointer-events-none select-none object-cover object-top"
        />
    );
}

interface ProjectReelProps {
    projects: PublicProjectDto[];
    unavailable?: boolean;
}

/**
 * Projects as a reel: the screenshots run on one strip under a fixed playhead, the project under it
 * is described below, and a ruler marks each project. Scrolling (the stage pins), dragging the strip
 * or choosing a number on the ruler moves it. Motion lives in `useReelMotion`.
 *
 * Screen readers get the projects as a list (the strip only repeats their screenshots). Focusing a
 * project's link brings that project under the playhead.
 */
export default function ProjectReel({ projects, unavailable = false }: ProjectReelProps) {
    const stageRef = useRef<HTMLDivElement>(null);
    const [selected, setSelected] = useState(0);
    const count = unavailable ? 0 : projects.length;
    const pinnable = count > 1;
    const active = Math.min(selected, Math.max(count - 1, 0));
    const controller = useReelMotion(stageRef, {
        count,
        itemsKey: projects.map((project) => project.id).join('|'),
        onActive: setSelected,
    });

    // Before the motion is ready (or without it) a choice simply shows that project.
    const goTo = useCallback((index: number) => {
        if (controller.current) controller.current.goTo(index);
        else setSelected(index);
    }, [controller]);

    return (
        <div
            ref={stageRef}
            className={`relative flex flex-col overflow-hidden bg-[var(--site-bg)] pb-16 pt-24 ${pinnable
                ? 'reel-pin:h-svh reel-pin:pb-[clamp(1rem,2.6svh,1.75rem)] reel-pin:pt-[calc(var(--nav-height,80px)+clamp(0.5rem,2svh,1.25rem))] max-lg:reel-pin:justify-center'
                : ''}`}
        >
            <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
                <div className="flex w-full items-center gap-4">
                    <p className="shrink-0 font-display text-xs font-bold uppercase leading-none tracking-[0.14em] text-[var(--text)]">
                        Projects
                    </p>
                    <span data-reel-rule aria-hidden="true" className="h-px min-w-8 flex-1 bg-[var(--hairline)]" />
                    <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)] sm:inline">
                        06 / Work
                    </span>
                </div>

                <div className={`mt-10 flex items-end justify-between gap-8 ${pinnable ? 'reel-pin:mt-[3svh]' : ''}`}>
                    <h2
                        id="projects-heading"
                        className="font-display text-[clamp(2.4rem,4.4vw,4rem)] font-extrabold leading-[0.95] tracking-[-0.035em] text-[var(--text)] short:text-[clamp(2.2rem,6.5svh,3.2rem)]"
                    >
                        <span className="block overflow-hidden pb-[0.06em]">
                            <span data-reel-line className="block">Projects</span>
                        </span>
                    </h2>
                    <p data-reel-lead className="hidden max-w-[34ch] text-right text-[0.95rem] leading-[1.7] text-[var(--muted)] lg:block short:text-sm short:leading-relaxed">
                        {INTRO}
                    </p>
                </div>
            </div>

            {count === 0 ? (
                <div data-reel-rise className="mx-auto mt-10 w-full max-w-7xl px-5 md:px-8">
                    <ShowcaseState panel="projects" unavailable={unavailable} />
                </div>
            ) : (
                <>
                    {/* The frame size comes from the space this box gets (container units): pinned,
                        the box takes what the header and readout leave, and the frame fits it. */}
                    <div
                        data-reel-viewport
                        aria-hidden="true"
                        className={`relative mt-[2.4svh] touch-pan-y overflow-hidden [container-type:inline-size] ${pinnable
                            ? 'cursor-grab reel-pin:min-h-0 reel-pin:[container-type:size] lg:reel-pin:flex-1 max-lg:reel-pin:shrink max-lg:reel-pin:grow-0 max-lg:reel-pin:basis-[calc(88vw/1.6+2.5rem)]'
                            : ''}`}
                    >
                        <div
                            data-reel-strip
                            className={`flex items-center gap-[clamp(2rem,5vw,5rem)] pl-[calc(50%-var(--fw)/2)] will-change-transform [--fw:min(88cqw,1040px)] lg:[--fw:min(62cqw,1040px)] ${pinnable
                                ? 'reel-pin:absolute reel-pin:inset-y-0 reel-pin:left-0 reel-pin:[--fw:min(88cqw,(100cqh_-_2.25rem)*1.6)] lg:reel-pin:[--fw:min(62cqw,(100cqh_-_2.25rem)*1.6,1040px)]'
                                : ''}`}
                        >
                            {projects.map((project, index) => (
                                <figure
                                    key={project.id}
                                    data-reel-frame
                                    className="m-0 grid w-[var(--fw)] flex-none origin-center gap-3"
                                    style={index === 0 ? undefined : AWAY_STYLE}
                                >
                                    <p className="font-mono text-[10px] uppercase leading-[1.3] tracking-[0.14em] text-[var(--text)]">
                                        Project {padIndex(index + 1)} / {padIndex(count)}
                                    </p>
                                    <div className="relative aspect-[16/10] w-full overflow-hidden border border-[var(--hairline)] bg-[var(--surface-muted)]">
                                        <Screenshot project={project} />
                                    </div>
                                </figure>
                            ))}
                        </div>
                    </div>

                    <div className="mx-auto mt-[2.4svh] grid w-full max-w-7xl gap-3.5 px-5 md:px-8">
                        {/* Every readout shares one grid cell, so the block is as tall as the longest
                            and switching projects never moves anything around it. */}
                        <ol data-reel-rise aria-label="Projects" className="grid">
                            {projects.map((project, index) => {
                                const isActive = index === active;
                                return (
                                    <li
                                        key={project.id}
                                        aria-current={isActive ? 'true' : undefined}
                                        onFocus={isActive ? undefined : () => goTo(index)}
                                        className={`flex min-w-0 flex-col items-start gap-3 transition-[opacity,transform] duration-300 ease-out [grid-area:1/1] motion-reduce:transition-none lg:flex-row lg:items-center lg:gap-10 ${isActive
                                            ? 'translate-y-0 opacity-100 delay-100'
                                            : 'pointer-events-none -translate-y-2 opacity-0'}`}
                                    >
                                        <h3 className="line-clamp-2 min-w-0 font-display text-[clamp(1.3rem,2vw,1.75rem)] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--text)] lg:min-w-[16rem] lg:flex-1">
                                            {project.title}
                                        </h3>
                                        <p className="sr-only">{project.description}</p>
                                        <dl className="flex min-w-0 gap-5 lg:gap-10">
                                            <div className="min-w-0">
                                                <dt className={MONO_LABEL}>Category</dt>
                                                <dd className="mt-1 text-sm font-semibold leading-[1.3] text-[var(--text)]">{project.category}</dd>
                                            </div>
                                            {project.tags.length > 0 && (
                                                <div className="min-w-0">
                                                    <dt className={MONO_LABEL}>Stack</dt>
                                                    <dd className="mt-1 text-sm font-semibold leading-[1.3] text-[var(--text)]">{project.tags.join(' · ')}</dd>
                                                </div>
                                            )}
                                        </dl>
                                        {project.githubUrl && (
                                            <ShowcaseLink href={project.githubUrl} label={repositoryLabel(project)}>
                                                Repository
                                            </ShowcaseLink>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>

                        <div data-reel-ruler className="relative h-10 overflow-hidden border-t border-[var(--hairline)]">
                            <div
                                data-reel-track
                                role="group"
                                aria-label="Choose a project"
                                className="absolute bottom-0 left-0 flex h-[30px] items-end pl-[calc(50%-0.875rem)]"
                            >
                                {projects.map((project, index) => {
                                    const isActive = index === active;
                                    return (
                                        <span key={project.id} className="contents">
                                            <button
                                                type="button"
                                                data-reel-tick
                                                aria-label={`Show ${project.title}`}
                                                aria-current={isActive ? 'true' : undefined}
                                                onClick={() => goTo(index)}
                                                className="relative flex h-[30px] w-7 flex-none justify-center focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--text)]"
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className={`absolute left-[calc(50%+0.375rem)] top-0 font-mono text-[10px] leading-[1.3] tracking-[0.14em] transition-colors duration-300 motion-reduce:transition-none ${isActive ? 'text-[var(--text)]' : 'text-[var(--faint)]'}`}
                                                >
                                                    {padIndex(index + 1)}
                                                </span>
                                                <span
                                                    aria-hidden="true"
                                                    className={`absolute bottom-0 left-1/2 w-px ${isActive ? 'h-[18px] bg-[var(--text)]' : 'h-3.5 bg-[var(--hairline-strong)]'}`}
                                                />
                                            </button>
                                            {index < count - 1 && (
                                                <span aria-hidden="true" className="flex h-[30px] w-[clamp(7.5rem,22vw,21.25rem)] flex-none items-end justify-around">
                                                    {MINOR_TICKS.map((tick) => <i key={tick} className="h-[7px] w-px bg-[var(--hairline)]" />)}
                                                </span>
                                            )}
                                        </span>
                                    );
                                })}
                            </div>
                            <span
                                aria-hidden="true"
                                className="pointer-events-none absolute bottom-0 left-1/2 h-full w-px bg-[var(--text)] before:absolute before:-left-1 before:-top-px before:size-[9px] before:bg-[var(--text)] before:content-['']"
                            />
                        </div>

                        {pinnable && (
                            <p data-reel-rise aria-hidden="true" className="hidden items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)] lg:flex short:hidden">
                                <span className="h-px w-[22px] bg-[var(--faint)]" />
                                <span className="reel-pin:hidden">Drag the strip or pick a number</span>
                                <span className="hidden reel-pin:inline">Scroll or drag the strip</span>
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
