'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
    BriefcaseBusiness,
    ListOrdered,
    Pencil,
    Plus,
    RefreshCw,
    Trash2,
} from 'lucide-react';

import { ManagementPage } from '@/components/admin/layout/ManagementPage';
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

interface ExperienceRecordProps {
    experience: AdminExperienceDto;
    index: number;
    onDelete: (experience: AdminExperienceDto) => void;
    onEdit: (experience: AdminExperienceDto) => void;
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

const EXPERIENCE_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

function formatExperienceDate(value: string): string {
    const date = new Date(value);
    return Number.isFinite(date.getTime())
        ? EXPERIENCE_DATE_FORMATTER.format(date)
        : 'Unavailable';
}

function ExperienceRecord({
    experience,
    index,
    onDelete,
    onEdit,
}: ExperienceRecordProps) {
    const displayOrder = String(experience.displayOrder).padStart(2, '0');
    const isActive = experience.status === 'active';

    return (
        <li className="group min-w-0 bg-[#07080a] transition-colors duration-200 hover:bg-white/[0.018] motion-reduce:transition-none">
            <article className="grid min-w-0 md:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)]">
                <div className="relative min-w-0 border-b border-white/[0.07] bg-[#030405] px-4 py-4 sm:px-5 md:border-b-0 md:border-r md:py-6">
                    <span
                        aria-hidden="true"
                        className="absolute inset-y-0 left-[1.875rem] hidden w-px bg-white/[0.08] md:block"
                    />

                    <div className="relative flex min-w-0 items-start gap-3">
                        <span
                            aria-hidden="true"
                            className={`relative z-[1] mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border bg-[#030405] ${isActive ? 'border-[var(--signal)]/45' : 'border-white/16'}`}
                        >
                            <span
                                className={`size-1.5 rounded-full ${isActive ? 'bg-[var(--signal)] shadow-[0_0_8px_rgba(195,109,252,0.65)]' : 'bg-white/35'}`}
                            />
                        </span>

                        <div className="min-w-0">
                            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/38">
                                Date range
                            </p>
                            <p className="mt-1 break-words text-base font-extrabold leading-snug text-[var(--text)] sm:text-lg">
                                {experience.dateLabel}
                            </p>
                            <p className={`mt-2 font-mono text-[9px] font-bold uppercase tracking-[0.09em] ${isActive ? 'text-[var(--signal)]/74' : 'text-[var(--muted)]/45'}`}>
                                {isActive ? 'Currently active' : 'Completed'}
                            </p>
                        </div>
                    </div>

                    <div className="relative mt-4 flex min-w-0 items-baseline justify-between gap-3 border-t border-white/[0.06] pt-3 md:ml-8 md:mt-6">
                        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.09em] text-[var(--muted)]/38">
                            Public order
                        </span>
                        <span className="font-display text-xl font-extrabold tabular-nums text-[var(--signal)]/82">
                            {displayOrder}
                        </span>
                    </div>
                </div>

                <div className="flex min-w-0 flex-col px-4 py-5 sm:px-6 sm:py-6 xl:px-7">
                    <header className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <p className="break-words font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--signal)]/68">
                                {experience.subtitle}
                            </p>
                            <h3 className="mt-2 max-w-3xl break-words text-xl font-extrabold leading-tight tracking-normal text-[var(--text)] sm:text-2xl">
                                {experience.title}
                            </h3>
                        </div>

                        <span
                            className={`inline-flex min-h-6 w-fit shrink-0 items-center gap-1.5 rounded-full border px-2 font-mono text-[9px] font-bold uppercase tracking-[0.08em] ${
                                experience.isPublished
                                    ? 'border-emerald-300/16 bg-emerald-300/[0.045] text-emerald-200/72'
                                    : 'border-amber-200/14 bg-amber-200/[0.04] text-amber-100/64'
                            }`}
                        >
                            <span
                                aria-hidden="true"
                                className={`size-1.5 rounded-full ${experience.isPublished ? 'bg-emerald-300/75' : 'bg-amber-200/70'}`}
                            />
                            {experience.isPublished ? 'Published' : 'Draft'}
                        </span>
                    </header>

                    <p className="mt-3 max-w-4xl break-words text-sm leading-[1.7] text-[var(--muted)]/64 sm:text-[0.95rem]">
                        {experience.description}
                    </p>

                    <footer className="mt-5 flex min-w-0 flex-col gap-4 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]/38">
                            <span>Record {String(index + 1).padStart(2, '0')}</span>
                            <time dateTime={experience.updatedAt}>
                                Updated {formatExperienceDate(experience.updatedAt)}
                            </time>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center">
                            <button
                                type="button"
                                onClick={() => onEdit(experience)}
                                aria-label={`Edit ${experience.title}`}
                                className={`${ACTIVE_ACTION_CLASS} border-[var(--signal)]/22 bg-[var(--signal)]/[0.075] text-[var(--signal)] hover:border-[var(--signal)]/40 hover:bg-[var(--signal)]/[0.13] hover:text-[var(--text)]`}
                            >
                                <Pencil aria-hidden="true" size={15} strokeWidth={1.8} />
                                Edit
                            </button>
                            <button
                                type="button"
                                onClick={() => onDelete(experience)}
                                aria-label={`Delete ${experience.title}`}
                                className={`${ACTIVE_ACTION_CLASS} border-transparent bg-transparent text-[var(--muted)]/46 hover:border-red-300/20 hover:bg-red-400/[0.05] hover:text-red-200 focus-visible:border-red-300/20 focus-visible:text-red-200`}
                            >
                                <Trash2 aria-hidden="true" size={15} strokeWidth={1.8} />
                                Delete
                            </button>
                        </div>
                    </footer>
                </div>
            </article>
        </li>
    );
}

export default function Experiences({
    experiences,
    unavailable = false,
}: ExperiencesProps) {
    const dialog = useDialog();
    const snackbar = useSnackbar();
    const router = useRouter();
    const [editor, setEditor] = useState<EditorState>(null);
    const [isRefreshing, startRefresh] = useTransition();
    const activeCount = experiences.filter((experience) => experience.status === 'active').length;
    const completedCount = experiences.length - activeCount;
    const publishedCount = experiences.filter((experience) => experience.isPublished).length;

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
            <header className="border-b border-white/[0.07] pb-7">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--signal)]/78">
                            Content registry / Experiences
                        </p>
                        <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight tracking-normal text-[var(--text)] sm:text-4xl">
                            Experiences
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)]/62 sm:text-base">
                            Shape the roles, organizations, dates, and order presented in your public career timeline.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setEditor({ mode: 'create' })}
                        className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--signal)]/28 bg-[var(--signal)]/12 px-4 text-sm font-bold text-[var(--signal)] transition-[border-color,background-color,color] duration-200 hover:border-[var(--signal)]/46 hover:bg-[var(--signal)]/18 hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 sm:w-auto motion-reduce:transition-none"
                    >
                        <Plus aria-hidden="true" size={17} strokeWidth={2} />
                        Add experience
                    </button>
                </div>

                <dl className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 border-y border-white/[0.06] py-3.5">
                    <div className="flex items-baseline gap-2">
                        <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/42">
                            Total
                        </dt>
                        <dd className="text-sm font-extrabold tabular-nums text-[var(--text)]">
                            {unavailable ? '--' : String(experiences.length).padStart(2, '0')}
                        </dd>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/42">
                            Active
                        </dt>
                        <dd className="text-sm font-extrabold tabular-nums text-[var(--signal)]/78">
                            {unavailable ? '--' : String(activeCount).padStart(2, '0')}
                        </dd>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/42">
                            Complete
                        </dt>
                        <dd className="text-sm font-extrabold tabular-nums text-[var(--text)]/68">
                            {unavailable ? '--' : String(completedCount).padStart(2, '0')}
                        </dd>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/42">
                            Published
                        </dt>
                        <dd className="text-sm font-extrabold tabular-nums text-emerald-200/72">
                            {unavailable ? '--' : String(publishedCount).padStart(2, '0')}
                        </dd>
                    </div>
                </dl>
            </header>

            <section aria-labelledby="experience-list-heading" className="mt-8">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2
                            id="experience-list-heading"
                            className="flex items-center gap-2.5 text-sm font-extrabold tracking-normal text-[var(--text)]"
                        >
                            <BriefcaseBusiness
                                aria-hidden="true"
                                size={17}
                                strokeWidth={1.8}
                                className="text-[var(--signal)]/72"
                            />
                            Career chronology
                        </h2>
                        <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]/45">
                            Ordered milestones and publication state at a glance.
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
                                Career chronology unavailable
                            </h3>
                            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]/60">
                                The secure experience connection could not be reached. Refresh this view to try again.
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
                ) : experiences.length === 0 ? (
                    <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-white/[0.1] bg-[#07080a] px-5 py-12 text-center">
                        <div>
                            <span className="font-display text-4xl font-extrabold tabular-nums text-[var(--signal)]/42">
                                00
                            </span>
                            <h3 className="mt-3 text-lg font-extrabold text-[var(--text)]">
                                Your career chronology is empty
                            </h3>
                            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]/60">
                                Add the first role as a draft, then publish it when the timeline details are ready.
                            </p>
                            <button
                                type="button"
                                onClick={() => setEditor({ mode: 'create' })}
                                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--signal)]/28 bg-[var(--signal)]/12 px-4 text-sm font-bold text-[var(--signal)] transition-colors duration-200 hover:border-[var(--signal)]/46 hover:bg-[var(--signal)]/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 motion-reduce:transition-none"
                            >
                                <Plus aria-hidden="true" size={17} strokeWidth={2} />
                                Add first experience
                            </button>
                        </div>
                    </div>
                ) : (
                    <ol className="divide-y divide-white/[0.07] overflow-hidden rounded-lg border border-white/[0.085] bg-[#07080a] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
                        {experiences.map((experience, index) => (
                            <ExperienceRecord
                                key={experience.id}
                                experience={experience}
                                index={index}
                                onEdit={(selectedExperience) => setEditor({ mode: 'edit', experience: selectedExperience })}
                                onDelete={handleDelete}
                            />
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
