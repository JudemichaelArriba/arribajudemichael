'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
    BriefcaseBusiness,
    CalendarDays,
    Pencil,
    Plus,
    RefreshCw,
    Trash2,
} from 'lucide-react';

import {
    ManagementPage,
    ManagementPageChrome,
} from '@/components/admin/layout/ManagementPage';
import { useDialog } from '@/components/dialog/Dialog';
import { useSnackbar } from '@/components/snackbar/Snackbar';
import { deleteExperience } from '@/features/admin/experiences/actions';
import type {
    AdminExperienceDto,
    ExperienceActionState,
} from '@/features/admin/experiences/types';
import ExperienceModal from './ExperienceModal/ExperienceModal';

interface ExperiencesProps {
    experiences: AdminExperienceDto[];
    unavailable?: boolean;
}

type EditorState =
    | { mode: 'create' }
    | { mode: 'edit'; experience: AdminExperienceDto }
    | null;

const ACTIVE_ACTION_CLASS =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold transition-[color,border-color,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none';

const DELETE_INITIAL_STATE: ExperienceActionState = {
    status: 'idle',
    message: '',
    attempt: 0,
    fieldErrors: {},
};

export default function Experiences({
    experiences,
    unavailable = false,
}: ExperiencesProps) {
    const dialog = useDialog();
    const snackbar = useSnackbar();
    const router = useRouter();
    const [editor, setEditor] = useState<EditorState>(null);
    const [isRefreshing, startRefresh] = useTransition();

    const handleMutationSuccess = useCallback((message: string) => {
        setEditor(null);
        snackbar.success(message);
        startRefresh(() => router.refresh());
    }, [router, snackbar]);

    const handleDelete = useCallback((experience: AdminExperienceDto) => {
        dialog.confirm(
            'Delete experience?',
            <>
                <strong className="font-bold text-[var(--text)]">{experience.title}</strong>{' '}
                will be removed from the dashboard and public timeline. This cannot be undone.
            </>,
            async () => {
                const result = await deleteExperience(
                    experience.id,
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
                confirmLabel: 'Delete experience',
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
            <ManagementPageChrome
                eyebrow="Content / Experiences"
                title="Experiences"
                description="Review and manage the ordered milestones presented on the public experience timeline."
                count={experiences.length}
                countLabel="milestones"
                actionLabel="Add experience"
                noticeId="experiences-management-notice"
                showNotice={false}
                action={(
                    <button
                        type="button"
                        onClick={() => setEditor({ mode: 'create' })}
                        className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--signal)]/24 bg-[var(--signal)]/12 px-4 text-sm font-bold text-[var(--signal)] transition-[border-color,background-color] duration-200 hover:border-[var(--signal)]/42 hover:bg-[var(--signal)]/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 sm:w-auto motion-reduce:transition-none"
                    >
                        <Plus aria-hidden="true" size={17} strokeWidth={2} />
                        Add experience
                    </button>
                )}
            />

            <section aria-labelledby="experience-list-heading" className="mt-4 sm:mt-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <BriefcaseBusiness
                            aria-hidden="true"
                            size={17}
                            strokeWidth={1.8}
                            className="shrink-0 text-[var(--signal)]/72"
                        />
                        <h2
                            id="experience-list-heading"
                            className="text-sm font-bold tracking-normal text-[var(--text)]"
                        >
                            Timeline entries
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
                            Experiences could not be loaded.
                        </h3>
                        <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]/58">
                            Refresh the page to try the secure admin query again.
                        </p>
                        <button
                            type="button"
                            onClick={handleRetry}
                            disabled={isRefreshing}
                            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.035] px-4 text-sm font-bold text-[var(--text)] transition-colors duration-200 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none"
                        >
                            <RefreshCw
                                aria-hidden="true"
                                size={16}
                                strokeWidth={1.8}
                                className={isRefreshing ? 'animate-spin motion-reduce:animate-none' : ''}
                            />
                            Retry
                        </button>
                    </div>
                ) : experiences.length === 0 ? (
                    <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] px-5 py-10 text-center">
                        <BriefcaseBusiness aria-hidden="true" size={25} strokeWidth={1.5} className="text-[var(--signal)]/62" />
                        <h3 className="mt-4 text-lg font-extrabold text-[var(--text)]">
                            No experiences yet.
                        </h3>
                        <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]/58">
                            Add the first milestone when it is ready for the timeline.
                        </p>
                        <button
                            type="button"
                            onClick={() => setEditor({ mode: 'create' })}
                            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--signal)]/24 bg-[var(--signal)]/12 px-4 text-sm font-bold text-[var(--signal)] transition-colors duration-200 hover:bg-[var(--signal)]/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 motion-reduce:transition-none"
                        >
                            <Plus aria-hidden="true" size={16} strokeWidth={2} />
                            Add experience
                        </button>
                    </div>
                ) : (
                    <ol className="relative space-y-4 before:absolute before:bottom-8 before:left-[1.3125rem] before:top-8 before:w-px before:bg-white/[0.08]">
                        {experiences.map((experience, index) => (
                            <li
                                key={experience.id}
                                className="relative grid min-w-0 grid-cols-[2.625rem_minmax(0,1fr)] gap-3 sm:gap-4"
                            >
                                <div className="relative z-[1] mt-5 flex size-[2.625rem] items-center justify-center rounded-lg border border-white/[0.09] bg-black font-mono text-[10px] font-bold tabular-nums text-[var(--signal)]/72">
                                    {String(index + 1).padStart(2, '0')}
                                </div>

                                <article className="grid min-w-0 rounded-lg border border-white/[0.08] bg-white/[0.025] xl:grid-cols-[minmax(0,1fr)_auto]">
                                    <div className="min-w-0 p-4 sm:p-5 lg:p-6">
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                            <span className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.11em] text-[var(--signal)]/75">
                                                <CalendarDays aria-hidden="true" size={14} strokeWidth={1.8} />
                                                {experience.dateLabel}
                                            </span>
                                            <span className={experience.status === 'active'
                                                ? 'inline-flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.11em] text-emerald-300/68'
                                                : 'inline-flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.11em] text-[var(--muted)]/45'}
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className={experience.status === 'active'
                                                        ? 'size-1.5 rounded-full bg-emerald-300/75'
                                                        : 'size-1.5 rounded-full bg-white/25'}
                                                />
                                                {experience.status === 'active' ? 'Currently active' : 'Completed'}
                                            </span>
                                            <span className={experience.isPublished
                                                ? 'inline-flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.11em] text-[var(--signal)]/70'
                                                : 'inline-flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.11em] text-amber-200/58'}
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className={experience.isPublished
                                                        ? 'size-1.5 rounded-full bg-[var(--signal)]/75'
                                                        : 'size-1.5 rounded-full bg-amber-200/65'}
                                                />
                                                {experience.isPublished ? 'Published' : 'Draft'}
                                            </span>
                                            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.11em] text-[var(--muted)]/42">
                                                Order {experience.displayOrder}
                                            </span>
                                        </div>

                                        <p className="mt-4 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]/48">
                                            {experience.subtitle}
                                        </p>
                                        <h3 className="mt-1.5 text-xl font-extrabold leading-tight tracking-normal text-[var(--text)] sm:text-2xl">
                                            {experience.title}
                                        </h3>
                                        <p className="mt-2 max-w-3xl text-sm leading-[1.65] text-[var(--muted)]/64 sm:text-[0.95rem]">
                                            {experience.description}
                                        </p>
                                    </div>

                                    <div className="flex items-center border-t border-white/[0.07] p-4 xl:min-w-40 xl:items-end xl:border-l xl:border-t-0 xl:p-5">
                                        <div className="flex w-full flex-wrap items-center gap-2 xl:flex-col xl:items-stretch">
                                            <button
                                                type="button"
                                                onClick={() => setEditor({ mode: 'edit', experience })}
                                                aria-label={`Edit ${experience.title}`}
                                                className={`${ACTIVE_ACTION_CLASS} border-white/[0.1] bg-white/[0.035] text-[var(--muted)]/72 hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-[var(--text)]`}
                                            >
                                                <Pencil aria-hidden="true" size={15} strokeWidth={1.8} />
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(experience)}
                                                aria-label={`Delete ${experience.title}`}
                                                className={`${ACTIVE_ACTION_CLASS} border-red-400/12 bg-red-400/[0.035] text-red-300/62 hover:border-red-300/24 hover:bg-red-400/[0.07] hover:text-red-200`}
                                            >
                                                <Trash2 aria-hidden="true" size={15} strokeWidth={1.8} />
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            </li>
                        ))}
                    </ol>
                )}
            </section>

            {editor ? (
                <ExperienceModal
                    key={editor.mode === 'create' ? 'create-experience' : editor.experience.id}
                    mode={editor.mode}
                    experience={editor.mode === 'edit' ? editor.experience : undefined}
                    onClose={() => setEditor(null)}
                    onSuccess={handleMutationSuccess}
                />
            ) : null}
        </ManagementPage>
    );
}
