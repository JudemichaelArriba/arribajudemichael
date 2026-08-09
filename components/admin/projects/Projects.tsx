import Image, { type StaticImageData } from 'next/image';
import { ArrowUpRight, Eye, FolderKanban } from 'lucide-react';

import {
    ManagementPage,
    ManagementPageChrome,
    StaticItemActions,
} from '@/components/admin/layout/ManagementPage';
import admissionSystemImage from '@/public/projectsTemporary/AdmissionSystem.png';
import ocutempImage from '@/public/projectsTemporary/Ocutmep.png';

interface AdminProject {
    id: string;
    title: string;
    category: string;
    description: string;
    image: StaticImageData;
    imageAlt: string;
    previewHref: string;
    tags: readonly string[];
}

const PROJECTS: readonly AdminProject[] = [
    {
        id: 'aces-admission-system',
        title: 'Aces Admission System',
        category: 'Academic admissions portal',
        description:
            'A responsive admissions experience for Aces Tagum College that guides prospective students from course discovery to application.',
        image: admissionSystemImage,
        imageAlt: 'Aces Admission System landing page and application entry point',
        previewHref: '/projectsTemporary/AdmissionSystem.png',
        tags: ['Application flow', 'Course discovery', 'Responsive UI'],
    },
    {
        id: 'ocutemp',
        title: 'OCUTEMP',
        category: 'IoT administration panel',
        description:
            'A facility dashboard for monitoring room status, occupancy, climate, energy use, and real-time building telemetry.',
        image: ocutempImage,
        imageAlt: 'OCUTEMP room status dashboard with live facility telemetry',
        previewHref: '/projectsTemporary/Ocutmep.png',
        tags: ['IoT telemetry', 'Facility monitoring', 'Operations dashboard'],
    },
] as const;

const NOTICE_ID = 'projects-static-preview-notice';

export default function Projects() {
    return (
        <ManagementPage>
            <ManagementPageChrome
                eyebrow="Content / Projects"
                title="Projects"
                description="Review the project entries currently presented in the public portfolio."
                count={PROJECTS.length}
                countLabel="published"
                actionLabel="Add project"
                noticeId={NOTICE_ID}
            />

            <section aria-labelledby="project-list-heading" className="mt-8 sm:mt-10">
                <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <FolderKanban
                            aria-hidden="true"
                            size={17}
                            strokeWidth={1.8}
                            className="shrink-0 text-[var(--signal)]/72"
                        />
                        <h2
                            id="project-list-heading"
                            className="text-sm font-bold tracking-normal text-[var(--text)]"
                        >
                            Published projects
                        </h2>
                    </div>
                    <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]/40">
                        Public order
                    </span>
                </div>

                <ul className="space-y-4">
                    {PROJECTS.map((project, index) => (
                        <li
                            key={project.id}
                            className="grid min-w-0 overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.025] lg:grid-cols-[minmax(14rem,0.34fr)_minmax(0,1fr)_auto]"
                        >
                            <div className="relative aspect-[1.75/1] min-w-0 overflow-hidden border-b border-white/[0.07] bg-[#05070a] p-2 lg:aspect-auto lg:min-h-56 lg:border-b-0 lg:border-r">
                                <Image
                                    src={project.image}
                                    alt={project.imageAlt}
                                    fill
                                    placeholder="blur"
                                    sizes="(max-width: 1023px) calc(100vw - 2rem), 360px"
                                    className="object-contain p-2"
                                />
                            </div>

                            <div className="min-w-0 p-4 sm:p-5 lg:p-6">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em]">
                                    <span className="tabular-nums text-[var(--signal)]/75">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <span aria-hidden="true" className="h-px w-4 bg-white/10" />
                                    <span className="text-[var(--muted)]/52">
                                        {project.category}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 text-emerald-300/62">
                                        <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-300/70" />
                                        Published
                                    </span>
                                </div>

                                <h3 className="mt-3 text-xl font-extrabold leading-tight tracking-normal text-[var(--text)] sm:text-2xl">
                                    {project.title}
                                </h3>
                                <p className="mt-2 max-w-3xl text-sm leading-[1.65] text-[var(--muted)]/64 sm:text-[0.95rem]">
                                    {project.description}
                                </p>

                                <ul
                                    aria-label={`${project.title} highlights`}
                                    className="mt-4 flex flex-wrap gap-2"
                                >
                                    {project.tags.map((tag) => (
                                        <li
                                            key={tag}
                                            className="rounded-md border border-white/[0.07] bg-black/25 px-2.5 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-normal text-[var(--muted)]/52"
                                        >
                                            {tag}
                                        </li>
                                    ))}
                                </ul>

                                <a
                                    href={project.previewHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/[0.09] bg-white/[0.025] px-3 text-xs font-bold text-[var(--muted)]/68 transition-[color,border-color,background-color] duration-200 hover:border-[var(--signal)]/25 hover:bg-[var(--signal)]/[0.05] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 motion-reduce:transition-none"
                                >
                                    <Eye aria-hidden="true" size={15} strokeWidth={1.8} />
                                    Open preview
                                    <ArrowUpRight aria-hidden="true" size={14} strokeWidth={1.8} />
                                </a>
                            </div>

                            <div className="flex items-center border-t border-white/[0.07] p-4 lg:min-w-40 lg:items-end lg:border-l lg:border-t-0 lg:p-5">
                                <StaticItemActions
                                    itemLabel={project.title}
                                    noticeId={NOTICE_ID}
                                    className="w-full lg:flex-col lg:items-stretch"
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            </section>
        </ManagementPage>
    );
}
