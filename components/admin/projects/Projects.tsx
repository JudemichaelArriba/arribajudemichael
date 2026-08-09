'use client';

import { useCallback, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
    ArrowUpRight,
    Eye,
    FolderKanban,
    ImageIcon,
    Pencil,
    Plus,
    RefreshCw,
    Trash2,
} from 'lucide-react';

import {
    ManagementPage,
    ManagementPageChrome,
} from '@/components/admin/layout/ManagementPage';
import type { AdminProjectDto } from '@/features/admin/projects/types';
import DeleteProjectDialog from './DeleteProjectDialog';
import ProjectModal from './ProjectModal/ProjectModal';

interface ProjectsProps {
    projects: AdminProjectDto[];
    unavailable?: boolean;
}

type EditorState =
    | { mode: 'create' }
    | { mode: 'edit'; project: AdminProjectDto }
    | null;

const ACTIVE_ACTION_CLASS =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold transition-[color,border-color,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none';

export default function Projects({ projects, unavailable = false }: ProjectsProps) {
    const router = useRouter();
    const [editor, setEditor] = useState<EditorState>(null);
    const [projectToDelete, setProjectToDelete] = useState<AdminProjectDto | null>(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [isRefreshing, startRefresh] = useTransition();

    const handleMutationSuccess = useCallback((message: string) => {
        setEditor(null);
        setProjectToDelete(null);
        setStatusMessage(message);
        startRefresh(() => router.refresh());
    }, [router]);

    const handleRetry = () => {
        startRefresh(() => router.refresh());
    };

    return (
        <ManagementPage>
            <ManagementPageChrome
                eyebrow="Content / Projects"
                title="Projects"
                description="Review and manage the project entries presented in the public portfolio."
                count={projects.length}
                countLabel="projects"
                actionLabel="Add project"
                noticeId="projects-management-notice"
                showNotice={false}
                action={(
                    <button
                        type="button"
                        onClick={() => setEditor({ mode: 'create' })}
                        className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--signal)]/24 bg-[var(--signal)]/12 px-4 text-sm font-bold text-[var(--signal)] transition-[border-color,background-color] duration-200 hover:border-[var(--signal)]/42 hover:bg-[var(--signal)]/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 sm:w-auto motion-reduce:transition-none"
                    >
                        <Plus aria-hidden="true" size={17} strokeWidth={2} />
                        Add project
                    </button>
                )}
            />

            <div aria-live="polite" className="min-h-6 pt-4 text-sm text-emerald-300/72">
                {statusMessage}
            </div>

            <section aria-labelledby="project-list-heading" className="mt-4 sm:mt-6">
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
                            All projects
                        </h2>
                    </div>
                    <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]/40">
                        Display order
                    </span>
                </div>

                {unavailable ? (
                    <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] px-5 py-10 text-center">
                        <RefreshCw aria-hidden="true" size={24} strokeWidth={1.5} className="text-[var(--signal)]/62" />
                        <h3 className="mt-4 text-lg font-extrabold text-[var(--text)]">
                            Projects could not be loaded.
                        </h3>
                        <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]/62">
                            Refresh this view to try the secure project connection again.
                        </p>
                        <button
                            type="button"
                            onClick={handleRetry}
                            disabled={isRefreshing}
                            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.03] px-4 text-sm font-bold text-[var(--text)] transition-colors hover:border-[var(--signal)]/28 hover:bg-[var(--signal)]/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none"
                        >
                            <RefreshCw
                                aria-hidden="true"
                                size={16}
                                strokeWidth={1.8}
                                className={isRefreshing ? 'animate-spin motion-reduce:animate-none' : ''}
                            />
                            {isRefreshing ? 'Refreshing...' : 'Retry'}
                        </button>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.1] bg-white/[0.018] px-5 py-10 text-center">
                        <FolderKanban aria-hidden="true" size={26} strokeWidth={1.5} className="text-[var(--signal)]/62" />
                        <h3 className="mt-4 text-lg font-extrabold text-[var(--text)]">
                            No projects yet.
                        </h3>
                        <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]/62">
                            Add the first project as a draft, then publish it when its media and repository details are ready.
                        </p>
                        <button
                            type="button"
                            onClick={() => setEditor({ mode: 'create' })}
                            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--signal)]/24 bg-[var(--signal)]/12 px-4 text-sm font-bold text-[var(--signal)] transition-colors hover:border-[var(--signal)]/42 hover:bg-[var(--signal)]/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 motion-reduce:transition-none"
                        >
                            <Plus aria-hidden="true" size={17} strokeWidth={2} />
                            Add project
                        </button>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {projects.map((project, index) => (
                            <li
                                key={project.id}
                                className="grid min-w-0 overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.025] lg:grid-cols-[minmax(14rem,0.34fr)_minmax(0,1fr)_auto]"
                            >
                                <div className="relative aspect-[1.75/1] min-w-0 overflow-hidden border-b border-white/[0.07] bg-[#05070a] p-2 lg:aspect-auto lg:min-h-56 lg:border-b-0 lg:border-r">
                                    {project.imageUrl ? (
                                        <Image
                                            src={project.imageUrl}
                                            alt={project.imageAlt ?? ''}
                                            fill
                                            sizes="(max-width: 1023px) calc(100vw - 2rem), 360px"
                                            className="object-contain p-2"
                                        />
                                    ) : (
                                        <div className="flex h-full flex-col items-center justify-center gap-2 text-[var(--muted)]/32">
                                            <ImageIcon aria-hidden="true" size={26} strokeWidth={1.5} />
                                            <span className="font-mono text-[9px] uppercase tracking-[0.12em]">No image</span>
                                        </div>
                                    )}
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
                                        <span className={project.isPublished
                                            ? 'inline-flex items-center gap-1.5 text-emerald-300/62'
                                            : 'inline-flex items-center gap-1.5 text-amber-200/58'}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={project.isPublished
                                                    ? 'size-1.5 rounded-full bg-emerald-300/70'
                                                    : 'size-1.5 rounded-full bg-amber-200/65'}
                                            />
                                            {project.isPublished ? 'Published' : 'Draft'}
                                        </span>
                                        <span className="text-[var(--muted)]/42">
                                            Order {project.displayOrder}
                                        </span>
                                    </div>

                                    <h3 className="mt-3 text-xl font-extrabold leading-tight tracking-normal text-[var(--text)] sm:text-2xl">
                                        {project.title}
                                    </h3>
                                    <p className="mt-2 max-w-3xl text-sm leading-[1.65] text-[var(--muted)]/64 sm:text-[0.95rem]">
                                        {project.description}
                                    </p>

                                    {project.tags.length > 0 ? (
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
                                    ) : null}

                                    {project.githubUrl ? (
                                        <a
                                            href={project.githubUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/[0.09] bg-white/[0.025] px-3 text-xs font-bold text-[var(--muted)]/68 transition-[color,border-color,background-color] duration-200 hover:border-[var(--signal)]/25 hover:bg-[var(--signal)]/[0.05] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 motion-reduce:transition-none"
                                        >
                                            <Eye aria-hidden="true" size={15} strokeWidth={1.8} />
                                            Open repository
                                            <ArrowUpRight aria-hidden="true" size={14} strokeWidth={1.8} />
                                        </a>
                                    ) : null}
                                </div>

                                <div className="flex items-center border-t border-white/[0.07] p-4 lg:min-w-40 lg:items-end lg:border-l lg:border-t-0 lg:p-5">
                                    <div className="flex w-full flex-wrap items-center gap-2 lg:flex-col lg:items-stretch">
                                        <button
                                            type="button"
                                            onClick={() => setEditor({ mode: 'edit', project })}
                                            aria-label={`Edit ${project.title}`}
                                            className={`${ACTIVE_ACTION_CLASS} border-white/[0.09] bg-white/[0.025] text-[var(--muted)]/68 hover:border-[var(--signal)]/24 hover:bg-[var(--signal)]/[0.05] hover:text-[var(--text)]`}
                                        >
                                            <Pencil aria-hidden="true" size={15} strokeWidth={1.8} />
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setProjectToDelete(project)}
                                            aria-label={`Delete ${project.title}`}
                                            className={`${ACTIVE_ACTION_CLASS} border-red-400/12 bg-red-400/[0.025] text-red-300/62 hover:border-red-300/25 hover:bg-red-400/[0.065] hover:text-red-200`}
                                        >
                                            <Trash2 aria-hidden="true" size={15} strokeWidth={1.8} />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {editor ? (
                <ProjectModal
                    key={editor.mode === 'create' ? 'create-project' : editor.project.id}
                    mode={editor.mode}
                    project={editor.mode === 'edit' ? editor.project : undefined}
                    onClose={() => setEditor(null)}
                    onSuccess={handleMutationSuccess}
                />
            ) : null}

            {projectToDelete ? (
                <DeleteProjectDialog
                    key={projectToDelete.id}
                    project={projectToDelete}
                    onClose={() => setProjectToDelete(null)}
                    onSuccess={handleMutationSuccess}
                />
            ) : null}
        </ManagementPage>
    );
}
