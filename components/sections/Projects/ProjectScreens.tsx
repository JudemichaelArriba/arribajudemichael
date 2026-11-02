'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { PanelsTopLeft } from 'lucide-react';

import type { PublicProjectDto } from '@/features/admin/projects/types';

import ShowcaseState from './ShowcaseState';
import { ShowcaseLink } from './ShowcaseParts';
import { MONO_LABEL, padIndex, sideOf, type ScreenSide } from './showcase';
import { useScreensMotion } from './useScreensMotion';

const INTRO = 'Systems built end to end, from the interface down to the database.';

const repositoryLabel = (project: PublicProjectDto) => `View the ${project.title} repository on GitHub (opens in a new tab)`;

/**
 * The screenshot fills its screen, centred and from the top: every window is the same 16:9 size, so
 * a wider screenshot loses a little at its sides and never shows bars. A project without one shows
 * a quiet placeholder.
 */
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
            alt=""
            fill
            draggable={false}
            sizes="(min-width: 1024px) min(58vw, 760px), 100vw"
            className="pointer-events-none select-none object-cover object-top"
        />
    );
}

interface ScreenProps {
    project: PublicProjectDto;
    index: number;
    count: number;
    side: ScreenSide;
}

/**
 * A macOS-style browser window around the screenshot: monochrome lights, the project's title in the
 * address bar and its number on the right. It repeats what the readout says, so it is hidden from
 * screen readers.
 *
 * Layers, outermost first: the column gives the perspective, the stage holds the resting tilt (set
 * by the scroll motion), the tilt layer follows the pointer, and the frame carries the wipe. The
 * shadow is its own layer because the wipe's clip-path would cut a box-shadow off.
 */
function Screen({ project, index, count, side }: ScreenProps) {
    return (
        <div
            data-screen-window
            aria-hidden="true"
            className={`group min-w-0 [perspective:1800px] lg:col-span-7 lg:row-start-1 ${side === 'left' ? 'lg:col-start-1' : 'lg:col-start-6'}`}
        >
            {/* Phones swing the window in on the edge it comes from, so it hinges there. */}
            <div data-screen-stage className={`relative [transform-style:preserve-3d] lg:origin-center ${side === 'left' ? 'origin-left' : 'origin-right'}`}>
                <div data-screen-tilt className="relative [transform-style:preserve-3d]">
                    <span
                        data-screen-shade
                        className="pointer-events-none absolute inset-0 rounded-lg shadow-[var(--shadow-screen-flat)] [transform:translateZ(-1px)] sm:rounded-[10px] lg:shadow-[var(--shadow-screen)]"
                    />
                    <div data-screen-frame className="relative overflow-hidden rounded-lg border border-[var(--hairline)] bg-[var(--surface)] sm:rounded-[10px]">
                        <div className="grid h-7 grid-cols-[1fr_minmax(0,auto)_1fr] items-center gap-2 border-b border-[var(--hairline)] bg-[var(--surface-muted)] px-2.5 sm:h-[38px] sm:gap-3 sm:px-3.5">
                            <span data-screen-chrome className="flex gap-[5px] sm:gap-[7px]">
                                {[0, 1, 2].map((light) => (
                                    <i key={light} className="size-[7px] rounded-full bg-[var(--hairline-strong)] sm:size-2.5" />
                                ))}
                            </span>
                            <span
                                data-screen-chrome
                                className="min-w-0 truncate rounded-[5px] border border-[var(--hairline-soft)] bg-[var(--site-bg)] px-2.5 py-[3px] text-center font-mono text-[9px] tracking-[0.06em] text-[var(--muted)] sm:w-[clamp(12rem,34vw,26rem)] sm:rounded-[7px] sm:px-3.5 sm:py-[5px] sm:text-[11px]"
                            >
                                {project.title}
                            </span>
                            <span data-screen-chrome className="justify-self-end whitespace-nowrap font-mono text-[9px] tracking-[0.14em] text-[var(--faint)] sm:text-[10px]">
                                {padIndex(index + 1)} / {padIndex(count)}
                            </span>
                        </div>
                        <div className="relative aspect-video overflow-hidden bg-[var(--surface-muted)]">
                            <div data-screen-shot className="absolute inset-0 origin-top">
                                <Screenshot project={project} />
                            </div>
                        </div>
                        {/* Follows the pointer on hover (desktop only). */}
                        <span
                            data-screen-glare
                            className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(60%_70%_at_var(--glare-x,50%)_var(--glare-y,0%),var(--screen-glare),transparent_70%)] opacity-0 transition-opacity duration-500 group-data-[hover]:opacity-100 motion-reduce:transition-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

interface ProjectScreensProps {
    projects: PublicProjectDto[];
    unavailable?: boolean;
}

/**
 * Projects as screens: each project is a browser window holding its screenshot, beside its readout
 * (description, Category, Stack, Repository). The windows alternate sides: the first sits left, the
 * next right. On desktop a large outlined number fills the corner the readout leaves empty.
 *
 * Motion lives in `useScreensMotion`: each window wipes in from its own side and settles into a 3D
 * tilt, and on a mouse it follows the pointer. Phones keep the windows flat and full width.
 */
export default function ProjectScreens({ projects, unavailable = false }: ProjectScreensProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const showProjects = projects.length > 0 && !unavailable;
    const count = showProjects ? projects.length : 0;
    useScreensMotion(rootRef, showProjects ? projects.map((project) => project.id).join('|') : '');

    return (
        <div ref={rootRef} className="mx-auto w-full max-w-7xl px-5 pb-6 pt-24 md:px-8 md:pt-32">
            <div data-screens-head>
                <div className="flex w-full items-center gap-4">
                    <p className="shrink-0 font-[family-name:var(--font-hero)] text-xs font-normal uppercase leading-none tracking-[0.14em] text-[var(--text)]">
                        Projects
                    </p>
                    <span data-screens-rule aria-hidden="true" className="h-px min-w-8 flex-1 bg-[var(--hairline)]" />
                    <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)] sm:inline">
                        06 / Work
                    </span>
                </div>

                <div className="mt-10 flex items-end justify-between gap-8">
                    <h2
                        id="projects-heading"
                        className="font-[family-name:var(--font-hero)] text-[clamp(2.4rem,4.4vw,4rem)] font-normal leading-[0.95] tracking-[-0.035em] text-[var(--text)]"
                    >
                        <span className="block overflow-hidden pb-[0.06em]">
                            <span data-screens-line className="block">Projects</span>
                        </span>
                    </h2>
                    <p data-screens-lead className="hidden max-w-[34ch] text-right text-[0.95rem] leading-[1.7] text-[var(--muted)] lg:block">
                        {INTRO}
                    </p>
                </div>
            </div>

            {showProjects ? (
                <ol aria-label="Projects" className="mt-[clamp(3rem,8vh,5.5rem)] grid gap-[clamp(4.5rem,12vh,8rem)]">
                    {projects.map((project, index) => {
                        const side = sideOf(index);
                        return (
                            <li
                                key={project.id}
                                data-screen={side}
                                className="grid gap-7 lg:grid-cols-12 lg:items-center lg:gap-x-8"
                            >
                                <Screen project={project} index={index} count={count} side={side} />

                                {/* The column beside the window stacks the outlined number and the
                                    readout, so they never overlap whatever the window's height. The
                                    number sits on the far side of the readout: above it next to a
                                    window on the left, below it next to one on the right. */}
                                <div
                                    className={`flex min-w-0 flex-col gap-7 lg:col-span-5 lg:row-start-1 ${side === 'left' ? 'lg:col-start-8' : 'lg:col-start-1'}`}
                                >
                                    <span
                                        data-screen-number
                                        aria-hidden="true"
                                        className={`hidden select-none font-[family-name:var(--font-hero)] text-[clamp(5rem,8vw,8rem)] leading-[0.8] tracking-[-0.03em] text-transparent [-webkit-text-stroke:1px_var(--hairline-strong)] lg:block ${side === 'left'
                                            ? 'self-start'
                                            : 'order-last self-end'}`}
                                    >
                                        {padIndex(index + 1)}
                                    </span>

                                    <div
                                        data-screen-readout
                                        className="grid min-w-0 justify-items-start gap-[1.1rem] pt-3 lg:pt-0"
                                    >
                                        <p className="flex w-full items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text)]">
                                            Project {padIndex(index + 1)}
                                            <span className="text-[var(--faint)]">/ {padIndex(count)}</span>
                                            <span aria-hidden="true" className="ml-1 h-px max-w-[4.5rem] flex-1 bg-[var(--hairline-strong)]" />
                                        </p>
                                        <h3 className="font-[family-name:var(--font-hero)] text-[clamp(2rem,3.3vw,3.1rem)] font-normal leading-none tracking-[-0.025em] text-[var(--text)] [text-wrap:balance]">
                                            {project.title}
                                        </h3>
                                        <p className="line-clamp-4 max-w-[40ch] text-[0.95rem] leading-[1.7] text-[var(--muted)]">
                                            {project.description}
                                        </p>
                                        <dl className="grid w-full grid-cols-[auto_auto] justify-start gap-x-6 border-t border-[var(--hairline)] pt-[1.1rem] lg:gap-x-10">
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
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            ) : (
                <div className="mt-10">
                    <ShowcaseState panel="projects" unavailable={unavailable} />
                </div>
            )}
        </div>
    );
}
