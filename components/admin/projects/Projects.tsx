'use client';

import { useCallback, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
    ArrowUpRight,
    CheckCircle2,
    FolderKanban,
    ImageIcon,
    ListOrdered,
    Pencil,
    Plus,
    RefreshCw,
    Trash2,
} from 'lucide-react';

import {
    AdminPageHeader,
    AdminPageStat,
    AdminPageStats,
    ManagementPage,
} from '@/components/admin/layout/ManagementPage';
import { useDialog } from '@/components/dialog/Dialog';
import { deleteProject } from '@/features/admin/projects/actions';
import type {
    AdminProjectDto,
    ProjectActionState,
} from '@/features/admin/projects/types';
import ProjectModal from './ProjectModal/ProjectModal';

interface ProjectsProps {
    projects: AdminProjectDto[];
    unavailable?: boolean;
}

interface ProjectRecordProps {
    index: number;
    project: AdminProjectDto;
    onDelete: (project: AdminProjectDto) => void;
    onEdit: (project: AdminProjectDto) => void;
}

type EditorState =
    | { mode: 'create' }
    | { mode: 'edit'; project: AdminProjectDto }
    | null;

const DELETE_INITIAL_STATE: ProjectActionState = {
    status: 'idle',
    message: '',
    attempt: 0,
    fieldErrors: {},
};

const PROJECT_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

const ACTION_CLASS =
    'inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold transition-[color,border-color,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none';

function formatProjectDate(value: string): string {
    const date = new Date(value);
    return Number.isFinite(date.getTime())
        ? PROJECT_DATE_FORMATTER.format(date)
        : 'Unavailable';
}

function ProjectRecord({
    index,
    project,
    onDelete,
    onEdit,
}: ProjectRecordProps) {
    const displayOrder = String(project.displayOrder).padStart(2, '0');
    const displayOrderSize = displayOrder.length > 4
        ? 'text-lg xl:text-xl'
        : 'text-2xl xl:text-3xl';

    return (
        <li className="group grid min-w-0 bg-[#07080a] transition-colors duration-200 hover:bg-white/[0.022] md:grid-cols-[minmax(13rem,0.36fr)_minmax(0,1fr)] xl:grid-cols-[5.5rem_minmax(14rem,17rem)_minmax(0,1fr)_10.5rem] motion-reduce:transition-none">
            <div className="flex min-w-0 items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-3 md:col-span-2 xl:col-span-1 xl:flex-col xl:items-start xl:justify-between xl:border-b-0 xl:border-r xl:px-4 xl:py-5">
                <div>
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]/42">
                        Order
                    </p>
                    <p className={`mt-1 font-display font-extrabold tabular-nums text-[var(--signal)]/88 ${displayOrderSize}`}>
                        {displayOrder}
                    </p>
                </div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/32">
                    Record {String(index + 1).padStart(2, '0')}
                </p>
            </div>

            <div className="relative aspect-video min-w-0 overflow-hidden border-b border-white/[0.07] bg-[#030405] md:aspect-auto md:min-h-56 md:border-b-0 md:border-r xl:min-h-52">
                {project.imageUrl ? (
                    <Image
                        src={project.imageUrl}
                        alt={project.imageAlt ?? ''}
                        fill
                        sizes="(max-width: 767px) calc(100vw - 2rem), (max-width: 1279px) 38vw, 272px"
                        className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.012] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                ) : (
                    <div className="flex h-full min-h-44 flex-col items-center justify-center gap-2 text-[var(--muted)]/30">
                        <ImageIcon aria-hidden="true" size={25} strokeWidth={1.5} />
                        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em]">
                            Media pending
                        </span>
                    </div>
                )}
            </div>

            <article className="min-w-0 px-4 py-5 sm:px-5 md:px-6 xl:py-6">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="max-w-full break-words font-mono text-[9px] font-bold uppercase tracking-[0.11em] text-[var(--muted)]/52">
                        {project.category}
                    </span>
                    <span aria-hidden="true" className="size-0.5 rounded-full bg-white/18" />
                    <span
                        className={`inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2 font-mono text-[9px] font-bold uppercase tracking-[0.08em] ${
                            project.isPublished
                                ? 'border-emerald-300/16 bg-emerald-300/[0.045] text-emerald-200/72'
                                : 'border-amber-200/14 bg-amber-200/[0.04] text-amber-100/64'
                        }`}
                    >
                        <span
                            aria-hidden="true"
                            className={`size-1.5 rounded-full ${project.isPublished ? 'bg-emerald-300/75' : 'bg-amber-200/70'}`}
                        />
                        {project.isPublished ? 'Published' : 'Draft'}
                    </span>
                </div>

                <h3 className="mt-3 break-words text-xl font-extrabold leading-tight tracking-normal text-[var(--text)] sm:text-2xl">
                    {project.title}
                </h3>
                <p className="mt-2 line-clamp-3 max-w-3xl break-words text-sm leading-[1.65] text-[var(--muted)]/64 sm:text-[0.95rem]">
                    {project.description}
                </p>

                {project.tags.length > 0 ? (
                    <ul
                        aria-label={`${project.title} highlights`}
                        className="mt-4 flex flex-wrap gap-x-2 gap-y-1.5"
                    >
                        {project.tags.map((tag) => (
                            <li
                                key={tag}
                                className="max-w-full break-all rounded-md border border-white/[0.07] bg-black/30 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-normal text-[var(--muted)]/52"
                            >
                                {tag}
                            </li>
                        ))}
                    </ul>
                ) : null}

                <div className="mt-5 flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.06] pt-3 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]/38">
                    <span className="max-w-full min-w-0 truncate" title={project.slug}>
                        Slug: {project.slug}
                    </span>
                    <time dateTime={project.updatedAt} className="shrink-0">
                        Updated {formatProjectDate(project.updatedAt)}
                    </time>
                </div>
            </article>

            <div className={`grid grid-cols-2 gap-2 border-t border-white/[0.07] p-4 md:col-span-2 xl:col-span-1 xl:flex xl:flex-col xl:justify-center xl:border-l xl:border-t-0 xl:p-4 ${project.githubUrl ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                <button
                    type="button"
                    onClick={() => onEdit(project)}
                    aria-label={`Edit ${project.title}`}
                    className={`${ACTION_CLASS} border-[var(--signal)]/22 bg-[var(--signal)]/[0.075] text-[var(--signal)] hover:border-[var(--signal)]/40 hover:bg-[var(--signal)]/[0.13] hover:text-[var(--text)]`}
                >
                    <Pencil aria-hidden="true" size={15} strokeWidth={1.8} />
                    Edit
                </button>

                {project.githubUrl ? (
                    <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${project.title} repository`}
                        className={`${ACTION_CLASS} border-white/[0.09] bg-white/[0.025] text-[var(--muted)]/66 hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-[var(--text)]`}
                    >
                        Repository
                        <ArrowUpRight aria-hidden="true" size={14} strokeWidth={1.8} />
                    </a>
                ) : null}

                <button
                    type="button"
                    onClick={() => onDelete(project)}
                    aria-label={`Delete ${project.title}`}
                    className={`${ACTION_CLASS} border-transparent bg-transparent text-[var(--muted)]/48 hover:border-red-300/20 hover:bg-red-400/[0.05] hover:text-red-200 focus-visible:border-red-300/20 focus-visible:text-red-200 ${project.githubUrl ? 'col-span-2 sm:col-span-1' : ''}`}
                >
                    <Trash2 aria-hidden="true" size={15} strokeWidth={1.8} />
                    Delete
                </button>
            </div>
        </li>
    );
}

export default function Projects({ projects, unavailable = false }: ProjectsProps) {
    const dialog = useDialog();
    const router = useRouter();
    const [editor, setEditor] = useState<EditorState>(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [isRefreshing, startRefresh] = useTransition();
    const publishedCount = projects.filter((project) => project.isPublished).length;
    const draftCount = projects.length - publishedCount;

    const handleMutationSuccess = useCallback((message: string) => {
        setEditor(null);
        setStatusMessage(message);
        startRefresh(() => router.refresh());
    }, [router]);

    const handleDelete = useCallback((project: AdminProjectDto) => {
        dialog.confirm(
            'Delete project?',
            <>
                <strong className="font-bold text-[var(--text)]">{project.title}</strong>{' '}
                will be removed from the dashboard and public portfolio. This cannot be undone.
            </>,
            async () => {
                const result = await deleteProject(
                    project.id,
                    { ...DELETE_INITIAL_STATE, fieldErrors: {} },
                    new FormData(),
                );

                if (result.status !== 'success') {
                    return { ok: false, message: result.message };
                }

                handleMutationSuccess(result.message);
                return { ok: true };
            },
            undefined,
            {
                confirmLabel: 'Delete project',
                cancelLabel: 'Cancel',
                pendingLabel: 'Deleting...',
                tone: 'danger',
            },
        );
    }, [dialog, handleMutationSuccess]);

    const handleRetry = () => {
        startRefresh(() => router.refresh());
    };

    return (
        <ManagementPage>
            <AdminPageHeader
                eyebrow="Content registry / Projects"
                title="Projects"
                description="Control the work, ordering, and publication details presented in your portfolio."
                action={
                    <button
                        type="button"
                        onClick={() => setEditor({ mode: 'create' })}
                        className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--signal)]/28 bg-[var(--signal)]/12 px-4 text-sm font-bold text-[var(--signal)] transition-[border-color,background-color,color] duration-200 hover:border-[var(--signal)]/46 hover:bg-[var(--signal)]/18 hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 sm:w-auto motion-reduce:transition-none"
                    >
                        <Plus aria-hidden="true" size={17} strokeWidth={2} />
                        Add project
                    </button>
                }
            >
                <AdminPageStats>
                    <AdminPageStat
                        label="Total"
                        value={unavailable ? '--' : String(projects.length).padStart(2, '0')}
                    />
                    <AdminPageStat
                        label="Published"
                        value={unavailable ? '--' : String(publishedCount).padStart(2, '0')}
                        valueClassName="text-emerald-200/72"
                    />
                    <AdminPageStat
                        label="Drafts"
                        value={unavailable ? '--' : String(draftCount).padStart(2, '0')}
                        valueClassName="text-amber-100/68"
                    />
                </AdminPageStats>
            </AdminPageHeader>

            {statusMessage ? (
                <div
                    role="status"
                    aria-live="polite"
                    className="mt-5 flex items-start gap-2.5 rounded-lg border border-emerald-300/10 bg-emerald-300/[0.025] px-3.5 py-3 text-sm text-emerald-200/72"
                >
                    <CheckCircle2 aria-hidden="true" size={16} strokeWidth={1.8} className="mt-0.5 shrink-0" />
                    <p className="leading-relaxed">{statusMessage}</p>
                </div>
            ) : null}

            <section aria-labelledby="project-register-heading" className="mt-8">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2
                            id="project-register-heading"
                            className="flex items-center gap-2.5 text-sm font-extrabold tracking-normal text-[var(--text)]"
                        >
                            <FolderKanban aria-hidden="true" size={17} strokeWidth={1.8} className="text-[var(--signal)]/72" />
                            Project register
                        </h2>
                        <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]/45">
                            Public sequence and publishing readiness at a glance.
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/38">
                        <ListOrdered aria-hidden="true" size={14} strokeWidth={1.8} />
                        Sorted by display order
                    </span>
                </div>

                {unavailable ? (
                    <div className="grid min-h-72 place-items-center rounded-lg border border-white/[0.08] bg-[#07080a] px-5 py-12 text-center">
                        <div>
                            <RefreshCw aria-hidden="true" size={25} strokeWidth={1.5} className="mx-auto text-[var(--signal)]/62" />
                            <h3 className="mt-4 text-lg font-extrabold text-[var(--text)]">
                                Project register unavailable
                            </h3>
                            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]/60">
                                The secure project connection could not be reached. Refresh this view to try again.
                            </p>
                            <button
                                type="button"
                                onClick={handleRetry}
                                disabled={isRefreshing}
                                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.025] px-4 text-sm font-bold text-[var(--text)] transition-colors duration-200 hover:border-[var(--signal)]/28 hover:bg-[var(--signal)]/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none"
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
                    </div>
                ) : projects.length === 0 ? (
                    <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-white/[0.1] bg-[#07080a] px-5 py-12 text-center">
                        <div>
                            <span className="font-display text-4xl font-extrabold tabular-nums text-[var(--signal)]/42">
                                00
                            </span>
                            <h3 className="mt-3 text-lg font-extrabold text-[var(--text)]">
                                Your project register is empty
                            </h3>
                            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]/60">
                                Create the first record as a draft, then publish it when its media and repository details are ready.
                            </p>
                            <button
                                type="button"
                                onClick={() => setEditor({ mode: 'create' })}
                                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--signal)]/28 bg-[var(--signal)]/12 px-4 text-sm font-bold text-[var(--signal)] transition-colors duration-200 hover:border-[var(--signal)]/46 hover:bg-[var(--signal)]/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 motion-reduce:transition-none"
                            >
                                <Plus aria-hidden="true" size={17} strokeWidth={2} />
                                Add first project
                            </button>
                        </div>
                    </div>
                ) : (
                    <ol className="divide-y divide-white/[0.07] overflow-hidden rounded-lg border border-white/[0.085] bg-[#07080a] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
                        {projects.map((project, index) => (
                            <ProjectRecord
                                key={project.id}
                                index={index}
                                project={project}
                                onEdit={(selectedProject) => setEditor({ mode: 'edit', project: selectedProject })}
                                onDelete={handleDelete}
                            />
                        ))}
                    </ol>
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
        </ManagementPage>
    );
}
