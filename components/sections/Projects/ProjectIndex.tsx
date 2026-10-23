'use client';

import Image from 'next/image';
import { PanelsTopLeft } from 'lucide-react';

import type { PublicProjectDto } from '@/features/admin/projects/types';

import ShowcaseIndex, { type IndexItem } from './ShowcaseIndex';
import { ShowcaseLink } from './ShowcaseParts';
import { MONO_LABEL, padIndex } from './showcase';

const repositoryLabel = (project: PublicProjectDto) => `View the ${project.title} repository on GitHub (opens in a new tab)`;

/** The screenshot fills its frame from the top; a project without one shows a quiet placeholder. */
function Screenshot({ project, sizes }: { project: PublicProjectDto; sizes: string }) {
    if (!project.imageUrl) {
        return (
            <div className="flex h-full items-center justify-center text-[var(--faint)]">
                <PanelsTopLeft aria-hidden="true" size={32} strokeWidth={1.4} />
            </div>
        );
    }
    return <Image src={project.imageUrl} alt={project.imageAlt ?? ''} fill sizes={sizes} className="object-cover object-top" />;
}

/** "Admission System · Angular · Laravel · MySQL", with the stack in its own element. */
function ProjectMeta({ project }: { project: PublicProjectDto }) {
    return (
        <>
            {project.category}
            {project.tags.length > 0 && (
                <>
                    <span aria-hidden="true"> · </span>
                    <span>{project.tags.join(' · ')}</span>
                </>
            )}
        </>
    );
}

function ProjectCaption({ project }: { project: PublicProjectDto }) {
    return (
        <div className="grid grid-cols-[minmax(0,1fr)_13rem] gap-8 xl:gap-10">
            <p data-caption-part className="text-[0.95rem] leading-[1.75] text-[var(--muted)] short:text-sm short:leading-relaxed">
                {project.description}
            </p>
            <div data-caption-part className="flex flex-col items-start gap-5 short:gap-3.5">
                <dl className="grid gap-3.5 short:gap-2.5">
                    <div>
                        <dt className={MONO_LABEL}>Category</dt>
                        <dd className="mt-1 text-sm font-semibold text-[var(--text)]">{project.category}</dd>
                    </div>
                    {project.tags.length > 0 && (
                        <div>
                            <dt className={MONO_LABEL}>Stack</dt>
                            <dd className="mt-1 text-sm font-semibold text-[var(--text)]">{project.tags.join(' · ')}</dd>
                        </div>
                    )}
                </dl>
                {project.githubUrl && (
                    <ShowcaseLink href={project.githubUrl} label={repositoryLabel(project)} variant="button">
                        Repository
                    </ShowcaseLink>
                )}
            </div>
        </div>
    );
}

/** Phones and tablets: one entry per project, screenshot first, everything readable in full. */
function ProjectEntry({ project, index }: { project: PublicProjectDto; index: number }) {
    return (
        <article data-entry className="border-t border-[var(--hairline)] pb-11 pt-6 sm:pb-14">
            <div data-entry-media className="relative aspect-[16/10] overflow-hidden border border-[var(--hairline)] bg-[var(--surface-muted)]">
                <div data-entry-visual className="absolute inset-0">
                    <Screenshot project={project} sizes="(min-width: 768px) calc(100vw - 4rem), calc(100vw - 2.5rem)" />
                </div>
            </div>
            <div data-entry-copy className="mt-6 grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2.5 sm:grid-cols-[3rem_minmax(0,1fr)]">
                <span className={`${MONO_LABEL} pt-[0.55em]`}>{padIndex(index + 1)}</span>
                <div className="min-w-0">
                    <h3 className="font-display text-[1.6rem] font-bold leading-[1.08] tracking-[-0.025em] text-[var(--text)] sm:text-[2rem]">
                        {project.title}
                    </h3>
                    <p className={`mt-2.5 ${MONO_LABEL}`}>
                        <ProjectMeta project={project} />
                    </p>
                    <p className="mt-4 text-[0.95rem] leading-[1.75] text-[var(--muted)] sm:text-base">{project.description}</p>
                    {project.githubUrl && (
                        <div className="mt-5">
                            <ShowcaseLink href={project.githubUrl} label={repositoryLabel(project)} variant="text">
                                View repository
                            </ShowcaseLink>
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
}

export default function ProjectIndex({ projects, isDesktop }: { projects: PublicProjectDto[]; isDesktop: boolean }) {
    if (isDesktop) {
        const items: IndexItem[] = projects.map((project) => ({
            id: project.id,
            title: project.title,
            meta: <ProjectMeta project={project} />,
            visual: <Screenshot project={project} sizes="(min-width: 1280px) 700px, 58vw" />,
            caption: <ProjectCaption project={project} />,
        }));
        return <ShowcaseIndex items={items} listLabel="Projects" />;
    }

    return (
        <ol aria-label="Projects" className="border-b border-[var(--hairline)]">
            {projects.map((project, index) => (
                <li key={project.id}>
                    <ProjectEntry project={project} index={index} />
                </li>
            ))}
        </ol>
    );
}
