'use client';

import {
    useActionState,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type FormEvent,
    type MouseEvent as ReactMouseEvent,
} from 'react';
import {
    Activity,
    BriefcaseBusiness,
    CalendarDays,
    LoaderCircle,
    Save,
    X,
} from 'lucide-react';

import {
    createExperience,
    updateExperience,
} from '@/features/admin/experiences/actions';
import type {
    AdminExperienceDto,
    ExperienceActionState,
    ExperienceField,
    ExperienceFieldErrors,
    ExperienceStatus,
} from '@/features/admin/experiences/types';
import {
    EXPERIENCE_DATE_LABEL_MAX_LENGTH,
    EXPERIENCE_DESCRIPTION_MAX_LENGTH,
    EXPERIENCE_DISPLAY_ORDER_MAX,
    EXPERIENCE_SUBTITLE_MAX_LENGTH,
    EXPERIENCE_TITLE_MAX_LENGTH,
    validateExperienceFormData,
} from '@/features/admin/experiences/validation';

interface ExperienceModalProps {
    mode: 'create' | 'edit';
    experience?: AdminExperienceDto;
    onClose: () => void;
    onSuccess: (message: string) => void;
}

const INITIAL_ACTION_STATE: ExperienceActionState = {
    status: 'idle',
    message: '',
    attempt: 0,
    fieldErrors: {},
};

const CLOSE_ANIMATION_MS = 220;

const FIELD_CLASS =
    'min-h-11 w-full rounded-lg border border-white/[0.09] bg-black/30 px-3.5 text-sm text-[var(--text)] outline-none transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-[var(--muted)]/32 focus:border-[var(--signal)]/45 focus:bg-black/45 focus:ring-2 focus:ring-[var(--signal)]/12 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none';

const LABEL_CLASS =
    'font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]/68';

function getFocusableElements(dialog: HTMLDialogElement): HTMLElement[] {
    return Array.from(
        dialog.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
    ).filter((element) => !element.hasAttribute('hidden'));
}

export default function ExperienceModal({
    mode,
    experience,
    onClose,
    onSuccess,
}: ExperienceModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const bypassValidationRef = useRef(false);
    const closeRef = useRef(onClose);
    const successRef = useRef(onSuccess);
    const pendingRef = useRef(false);
    const handledAttemptRef = useRef(0);
    const closeTimerRef = useRef<number | null>(null);
    const openingFrameRef = useRef<number | null>(null);
    const prefersReducedMotionRef = useRef(false);
    const isClosingRef = useRef(false);
    const [isVisible, setIsVisible] = useState(false);
    const [status, setStatus] = useState<ExperienceStatus>(experience?.status ?? 'complete');
    const [isPublished, setIsPublished] = useState(experience?.isPublished ?? false);
    const [clientErrors, setClientErrors] = useState<ExperienceFieldErrors>({});
    const [touchedFields, setTouchedFields] = useState<Set<ExperienceField>>(() => new Set());

    const experienceAction = useMemo(
        () => mode === 'create'
            ? createExperience
            : updateExperience.bind(null, experience?.id ?? ''),
        [experience?.id, mode],
    );
    const [state, formAction, isPending] = useActionState(
        experienceAction,
        INITIAL_ACTION_STATE,
    );

    closeRef.current = onClose;
    successRef.current = onSuccess;
    pendingRef.current = isPending;

    const animateClose = useCallback((afterClose?: () => void, force = false) => {
        if ((!force && pendingRef.current) || isClosingRef.current) return;

        isClosingRef.current = true;
        setIsVisible(false);
        const finish = afterClose ?? (() => closeRef.current());

        if (prefersReducedMotionRef.current) {
            finish();
            return;
        }

        closeTimerRef.current = window.setTimeout(finish, CLOSE_ANIMATION_MS);
    }, []);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const previouslyFocused = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        const previousOverflow = document.body.style.overflow;
        prefersReducedMotionRef.current = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;

        if (!dialog.open) dialog.showModal();
        document.body.style.overflow = 'hidden';
        openingFrameRef.current = window.requestAnimationFrame(() => {
            setIsVisible(true);
            dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus();
        });

        const handleCancel = (event: Event) => {
            if (event.target !== dialog) return;
            event.preventDefault();
            animateClose();
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') return;
            const focusable = getFocusableElements(dialog);
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        dialog.addEventListener('cancel', handleCancel);
        dialog.addEventListener('keydown', handleKeyDown);

        return () => {
            dialog.removeEventListener('cancel', handleCancel);
            dialog.removeEventListener('keydown', handleKeyDown);
            if (openingFrameRef.current !== null) {
                window.cancelAnimationFrame(openingFrameRef.current);
            }
            if (closeTimerRef.current !== null) {
                window.clearTimeout(closeTimerRef.current);
            }
            if (dialog.open) dialog.close();
            document.body.style.overflow = previousOverflow;
            previouslyFocused?.focus();
        };
    }, [animateClose]);

    useEffect(() => {
        if (state.attempt === 0 || state.attempt === handledAttemptRef.current) return;
        handledAttemptRef.current = state.attempt;
        setClientErrors({});
        setTouchedFields(new Set());

        if (state.status === 'success') {
            animateClose(() => successRef.current(state.message), true);
        }
    }, [animateClose, state]);

    const clearFieldError = (field: ExperienceField) => {
        setClientErrors((current) => {
            if (!current[field]) return current;
            const next = { ...current };
            delete next[field];
            return next;
        });
        setTouchedFields((current) => {
            if (current.has(field)) return current;
            const next = new Set(current);
            next.add(field);
            return next;
        });
    };

    const getFieldError = (field: ExperienceField) =>
        clientErrors[field] ?? (touchedFields.has(field) ? undefined : state.fieldErrors[field]);

    const renderError = (field: ExperienceField) => {
        const error = getFieldError(field);
        return error ? (
            <p
                id={`experience-${field}-error`}
                className="mt-1.5 text-xs leading-relaxed text-red-300/85"
            >
                {error}
            </p>
        ) : null;
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        if (bypassValidationRef.current) {
            bypassValidationRef.current = false;
            return;
        }

        event.preventDefault();
        if (isPending) return;

        const form = event.currentTarget;
        const validation = validateExperienceFormData(new FormData(form));
        if (!validation.success) {
            setClientErrors(validation.fieldErrors);
            setTouchedFields(new Set());
            const firstError = Object.keys(validation.fieldErrors)[0] as ExperienceField | undefined;
            if (firstError) {
                form.querySelector<HTMLElement>(`[name="${firstError}"]`)?.focus();
            }
            return;
        }

        setClientErrors({});
        bypassValidationRef.current = true;
        form.requestSubmit();
    };

    const handleBackdropMouseDown = (event: ReactMouseEvent<HTMLDialogElement>) => {
        if (event.target === event.currentTarget) animateClose();
    };

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby="experience-modal-title"
            onMouseDown={handleBackdropMouseDown}
            className="fixed inset-0 z-[90] m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-transparent p-3 text-[var(--text)] backdrop:bg-transparent sm:p-6"
        >
            <div
                aria-hidden="true"
                className={`pointer-events-none fixed inset-0 bg-black/78 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            />

            <div className="relative flex h-full w-full items-center justify-center">
                <section
                    className={`relative flex h-[calc(100dvh-1.5rem)] max-h-[52rem] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-white/[0.1] bg-[#080808] shadow-[0_28px_90px_rgba(0,0,0,0.72)] transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none sm:h-[min(92dvh,52rem)] ${isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.985] opacity-0'}`}
                >
                    <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.08] px-4 py-4 sm:px-6 sm:py-5">
                        <div className="flex min-w-0 items-start gap-3.5">
                            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--signal)]/20 bg-[var(--signal)]/10 text-[var(--signal)]">
                                <BriefcaseBusiness aria-hidden="true" size={19} strokeWidth={1.8} />
                            </div>
                            <div className="min-w-0">
                                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.13em] text-[var(--signal)]/72">
                                    Timeline management
                                </p>
                                <h2
                                    id="experience-modal-title"
                                    className="mt-1 text-xl font-extrabold tracking-normal text-[var(--text)] sm:text-2xl"
                                >
                                    {mode === 'create' ? 'Add experience' : 'Edit experience'}
                                </h2>
                                <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]/55">
                                    Configure the milestone content, timeline state, and publication order.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => animateClose()}
                            disabled={isPending}
                            aria-label="Close experience editor"
                            className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] text-[var(--muted)]/60 transition-colors duration-200 hover:bg-white/[0.05] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
                        >
                            <X aria-hidden="true" size={18} strokeWidth={1.8} />
                        </button>
                    </header>

                    <form action={formAction} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <fieldset
                            disabled={isPending}
                            className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 [scrollbar-gutter:stable] sm:px-6 sm:py-6"
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="experience-title" className={LABEL_CLASS}>Title</label>
                                    <input
                                        id="experience-title"
                                        name="title"
                                        defaultValue={experience?.title ?? ''}
                                        onInput={() => clearFieldError('title')}
                                        required
                                        maxLength={EXPERIENCE_TITLE_MAX_LENGTH}
                                        autoComplete="off"
                                        data-initial-focus
                                        aria-invalid={Boolean(getFieldError('title'))}
                                        aria-describedby={getFieldError('title') ? 'experience-title-error' : undefined}
                                        className={`${FIELD_CLASS} mt-2`}
                                    />
                                    {renderError('title')}
                                </div>

                                <div>
                                    <label htmlFor="experience-subtitle" className={LABEL_CLASS}>Subtitle</label>
                                    <input
                                        id="experience-subtitle"
                                        name="subtitle"
                                        defaultValue={experience?.subtitle ?? ''}
                                        onInput={() => clearFieldError('subtitle')}
                                        required
                                        maxLength={EXPERIENCE_SUBTITLE_MAX_LENGTH}
                                        autoComplete="off"
                                        aria-invalid={Boolean(getFieldError('subtitle'))}
                                        aria-describedby={getFieldError('subtitle') ? 'experience-subtitle-error' : undefined}
                                        className={`${FIELD_CLASS} mt-2`}
                                    />
                                    {renderError('subtitle')}
                                </div>
                            </div>

                            <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.65fr)]">
                                <div>
                                    <label htmlFor="experience-dateLabel" className={LABEL_CLASS}>Date label</label>
                                    <div className="relative mt-2">
                                        <CalendarDays
                                            aria-hidden="true"
                                            size={15}
                                            strokeWidth={1.8}
                                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--signal)]/60"
                                        />
                                        <input
                                            id="experience-dateLabel"
                                            name="dateLabel"
                                            defaultValue={experience?.dateLabel ?? ''}
                                            onInput={() => clearFieldError('dateLabel')}
                                            required
                                            maxLength={EXPERIENCE_DATE_LABEL_MAX_LENGTH}
                                            placeholder="2025 - Present"
                                            autoComplete="off"
                                            aria-invalid={Boolean(getFieldError('dateLabel'))}
                                            aria-describedby={getFieldError('dateLabel') ? 'experience-dateLabel-error' : 'experience-dateLabel-help'}
                                            className={`${FIELD_CLASS} pl-10`}
                                        />
                                    </div>
                                    {renderError('dateLabel')}
                                    <p id="experience-dateLabel-help" className="mt-1.5 text-xs text-[var(--muted)]/42">
                                        Human-readable text, not a calendar date.
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="experience-status" className={LABEL_CLASS}>Timeline status</label>
                                    <div className="relative mt-2">
                                        <Activity
                                            aria-hidden="true"
                                            size={15}
                                            strokeWidth={1.8}
                                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--signal)]/60"
                                        />
                                        <select
                                            id="experience-status"
                                            name="status"
                                            value={status}
                                            onChange={(event) => {
                                                setStatus(event.target.value as ExperienceStatus);
                                                clearFieldError('status');
                                            }}
                                            aria-invalid={Boolean(getFieldError('status'))}
                                            aria-describedby={getFieldError('status') ? 'experience-status-error' : undefined}
                                            className={`${FIELD_CLASS} appearance-none pl-10`}
                                        >
                                            <option value="active">Active</option>
                                            <option value="complete">Complete</option>
                                        </select>
                                    </div>
                                    {renderError('status')}
                                </div>

                                <div>
                                    <label htmlFor="experience-displayOrder" className={LABEL_CLASS}>Display order</label>
                                    <input
                                        id="experience-displayOrder"
                                        name="displayOrder"
                                        type="number"
                                        defaultValue={experience?.displayOrder ?? 0}
                                        onInput={() => clearFieldError('displayOrder')}
                                        required
                                        min={0}
                                        max={EXPERIENCE_DISPLAY_ORDER_MAX}
                                        step={1}
                                        inputMode="numeric"
                                        aria-invalid={Boolean(getFieldError('displayOrder'))}
                                        aria-describedby={getFieldError('displayOrder') ? 'experience-displayOrder-error' : undefined}
                                        className={`${FIELD_CLASS} mt-2 tabular-nums`}
                                    />
                                    {renderError('displayOrder')}
                                </div>
                            </div>

                            <div className="mt-4">
                                <label htmlFor="experience-description" className={LABEL_CLASS}>Description</label>
                                <textarea
                                    id="experience-description"
                                    name="description"
                                    defaultValue={experience?.description ?? ''}
                                    onInput={() => clearFieldError('description')}
                                    required
                                    maxLength={EXPERIENCE_DESCRIPTION_MAX_LENGTH}
                                    rows={7}
                                    aria-invalid={Boolean(getFieldError('description'))}
                                    aria-describedby={getFieldError('description') ? 'experience-description-error' : undefined}
                                    className={`${FIELD_CLASS} mt-2 min-h-36 resize-y py-3 leading-relaxed`}
                                />
                                {renderError('description')}
                            </div>

                            <div className="mt-5 flex flex-col gap-4 rounded-lg border border-white/[0.08] bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-[var(--text)]">Public visibility</p>
                                    <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]/50">
                                        Drafts remain visible only in this admin dashboard.
                                    </p>
                                </div>
                                <label className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-3">
                                    <span className="text-sm font-semibold text-[var(--muted)]/68">
                                        {isPublished ? 'Published' : 'Draft'}
                                    </span>
                                    <span className="relative">
                                        <input
                                            type="checkbox"
                                            checked={isPublished}
                                            onChange={(event) => {
                                                setIsPublished(event.target.checked);
                                                clearFieldError('isPublished');
                                            }}
                                            className="peer sr-only"
                                        />
                                        <span className="block h-6 w-11 rounded-full border border-white/[0.1] bg-white/[0.08] transition-colors duration-200 after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-[var(--muted)]/65 after:transition-transform after:duration-200 peer-checked:border-[var(--signal)]/35 peer-checked:bg-[var(--signal)]/22 peer-checked:after:translate-x-5 peer-checked:after:bg-[var(--signal)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--signal)]/60 motion-reduce:transition-none motion-reduce:after:transition-none" />
                                    </span>
                                    <input type="hidden" name="isPublished" value={isPublished ? 'true' : 'false'} />
                                </label>
                                {renderError('isPublished')}
                            </div>
                        </fieldset>

                        <footer className="shrink-0 border-t border-white/[0.08] bg-black/35 px-4 py-3.5 sm:px-6 sm:py-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div aria-live="polite" className="min-h-5 min-w-0 text-sm">
                                    {!isPending && state.status === 'error' ? (
                                        <p className="text-red-300/85">{state.message}</p>
                                    ) : (
                                        <p className="text-[var(--muted)]/42">
                                            {mode === 'create'
                                                ? 'Create as a draft or publish when ready.'
                                                : 'Changes apply after saving.'}
                                        </p>
                                    )}
                                </div>
                                <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={() => animateClose()}
                                        disabled={isPending}
                                        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/[0.09] px-4 text-sm font-bold text-[var(--muted)]/68 transition-colors duration-200 hover:bg-white/[0.045] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isPending}
                                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--signal)]/28 bg-[var(--signal)]/14 px-5 text-sm font-bold text-[var(--signal)] transition-[border-color,background-color] duration-200 hover:border-[var(--signal)]/48 hover:bg-[var(--signal)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none"
                                    >
                                        {isPending ? (
                                            <LoaderCircle aria-hidden="true" size={16} className="animate-spin motion-reduce:animate-none" />
                                        ) : (
                                            <Save aria-hidden="true" size={16} strokeWidth={1.9} />
                                        )}
                                        {isPending ? 'Saving...' : mode === 'create' ? 'Add experience' : 'Save changes'}
                                    </button>
                                </div>
                            </div>
                        </footer>
                    </form>
                </section>
            </div>
        </dialog>
    );
}
