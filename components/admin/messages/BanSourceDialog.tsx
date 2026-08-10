'use client';

import {
    LoaderCircle,
    ShieldAlert,
    ShieldBan,
    ShieldCheck,
    X,
} from 'lucide-react';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    useTransition,
    type FormEvent,
} from 'react';

import { banMessageSource } from '@/features/admin/messages/actions';
import type {
    BanDuration,
    BanSourceField,
    BanSourceFieldErrors,
} from '@/features/admin/messages/types';
import {
    BAN_REASON_MAX_LENGTH,
    validateBanSourceInput,
} from '@/features/admin/messages/validation';

interface BanSourceDialogProps {
    messageId: string;
    onClose: () => void;
    onSuccess: (message: string) => void;
}

const CLOSE_ANIMATION_MS = 220;
const DURATION_OPTIONS = [
    { value: '24h', label: '24 hours' },
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: 'permanent', label: 'Permanent' },
] as const satisfies readonly { value: BanDuration; label: string }[];

const LABEL_CLASS =
    'font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]/68';
const TEXTAREA_CLASS =
    'min-h-32 w-full resize-y rounded-lg border border-white/[0.09] bg-black/35 px-3.5 py-3 text-sm leading-relaxed text-[var(--text)] outline-none transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-[var(--muted)]/32 focus:border-[var(--signal)]/45 focus:bg-black/50 focus:ring-2 focus:ring-[var(--signal)]/12 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none';

function getFocusableElements(dialog: HTMLDialogElement): HTMLElement[] {
    return Array.from(
        dialog.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
    ).filter((element) => !element.hasAttribute('hidden'));
}

export default function BanSourceDialog({
    messageId,
    onClose,
    onSuccess,
}: BanSourceDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const closeRef = useRef(onClose);
    const successRef = useRef(onSuccess);
    const pendingRef = useRef(false);
    const closeTimerRef = useRef<number | null>(null);
    const openingFrameRef = useRef<number | null>(null);
    const prefersReducedMotionRef = useRef(false);
    const isClosingRef = useRef(false);
    const [duration, setDuration] = useState<BanDuration>('24h');
    const [reason, setReason] = useState('');
    const [fieldErrors, setFieldErrors] = useState<BanSourceFieldErrors>({});
    const [actionError, setActionError] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    const [isPending, startTransition] = useTransition();

    closeRef.current = onClose;
    successRef.current = onSuccess;
    pendingRef.current = isPending;

    const animateClose = useCallback((
        afterClose?: () => void,
        force = false,
    ) => {
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
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        prefersReducedMotionRef.current = motionQuery.matches;

        if (!dialog.open) dialog.showModal();
        document.body.style.overflow = 'hidden';
        openingFrameRef.current = window.requestAnimationFrame(() => {
            setIsVisible(true);
            dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus();
        });

        const handleCancel = (event: Event) => {
            event.preventDefault();
            animateClose();
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') return;
            const focusable = getFocusableElements(dialog);
            if (focusable.length === 0) {
                event.preventDefault();
                return;
            }

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

    const clearFieldError = (field: BanSourceField) => {
        setFieldErrors((current) => {
            if (!current[field]) return current;
            const next = { ...current };
            delete next[field];
            return next;
        });
        setActionError('');
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isPending) return;

        const input = { messageId, duration, reason };
        const validation = validateBanSourceInput(input);

        if (!validation.success) {
            setFieldErrors(validation.fieldErrors);
            setActionError(validation.message);
            const firstInvalidField = Object.keys(validation.fieldErrors)[0];
            if (firstInvalidField) {
                event.currentTarget
                    .querySelector<HTMLElement>(`[name="${firstInvalidField}"]`)
                    ?.focus();
            }
            return;
        }

        setFieldErrors({});
        setActionError('');
        startTransition(async () => {
            const result = await banMessageSource(validation.data);

            if (
                result.status === 'success' ||
                result.code === 'already_banned'
            ) {
                animateClose(() => successRef.current(result.message), true);
                return;
            }

            setFieldErrors(result.fieldErrors ?? {});
            setActionError(result.message);
        });
    };

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby="ban-source-dialog-title"
            aria-describedby="ban-source-dialog-description"
            aria-busy={isPending}
            className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 text-left text-[var(--text)] backdrop:bg-transparent"
        >
            <div
                onMouseDown={(event) => {
                    if (event.target === event.currentTarget) animateClose();
                }}
                className={`flex h-full w-full items-center justify-center bg-black/76 p-3 backdrop-blur-sm transition-opacity duration-200 ease-out sm:p-6 motion-reduce:transition-none ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            >
                <section
                    role="document"
                    onMouseDown={(event) => event.stopPropagation()}
                    className={`flex max-h-[92dvh] w-full max-w-lg min-w-0 flex-col overflow-hidden rounded-lg border border-white/[0.1] bg-[#09090c]/98 shadow-[0_28px_90px_rgba(0,0,0,0.72)] transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.985] opacity-0'}`}
                >
                    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.08] px-4 py-4 sm:px-6 sm:py-5">
                        <div className="flex min-w-0 items-center gap-3.5">
                            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-red-300/18 bg-red-300/[0.07] text-red-200 sm:size-11">
                                <ShieldBan aria-hidden="true" size={19} strokeWidth={1.8} />
                            </span>
                            <div className="min-w-0">
                                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-red-200/68">
                                    Security / Contact source
                                </p>
                                <h2
                                    id="ban-source-dialog-title"
                                    className="mt-1 font-display text-xl font-extrabold tracking-normal text-[var(--text)] sm:text-2xl"
                                >
                                    Ban message source?
                                </h2>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => animateClose()}
                            disabled={isPending}
                            aria-label="Close ban source dialog"
                            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] text-[var(--muted)]/62 transition-colors duration-200 hover:border-white/[0.16] hover:bg-white/[0.045] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
                        >
                            <X aria-hidden="true" size={18} strokeWidth={1.8} />
                        </button>
                    </header>

                    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                        <fieldset
                            disabled={isPending}
                            className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6"
                        >
                            <div
                                id="ban-source-dialog-description"
                                className="flex items-start gap-3 border-y border-white/[0.07] bg-white/[0.018] px-3.5 py-3 text-sm leading-relaxed text-[var(--muted)]/68"
                            >
                                <ShieldCheck
                                    aria-hidden="true"
                                    size={17}
                                    strokeWidth={1.8}
                                    className="mt-0.5 shrink-0 text-[var(--signal)]/72"
                                />
                                <p>
                                    Future contact submissions from this privacy-preserving source will be blocked.
                                </p>
                            </div>

                            <div className="mt-6">
                                <p className={LABEL_CLASS}>Duration</p>
                                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {DURATION_OPTIONS.map((option, index) => (
                                        <label key={option.value} className="relative min-w-0">
                                            <input
                                                data-initial-focus={index === 0 ? 'true' : undefined}
                                                type="radio"
                                                name="duration"
                                                value={option.value}
                                                checked={duration === option.value}
                                                onChange={() => {
                                                    setDuration(option.value);
                                                    clearFieldError('duration');
                                                }}
                                                aria-describedby={fieldErrors.duration
                                                    ? 'ban-source-duration-error'
                                                    : undefined}
                                                className="peer absolute inset-0 size-full cursor-pointer opacity-0"
                                            />
                                            <span className="flex min-h-11 items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.025] px-2 text-center text-xs font-bold text-[var(--muted)]/62 transition-[border-color,background-color,color] duration-200 peer-checked:border-[var(--signal)]/32 peer-checked:bg-[var(--signal)]/[0.1] peer-checked:text-[var(--signal)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--signal)]/60 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 motion-reduce:transition-none">
                                                {option.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                {fieldErrors.duration ? (
                                    <p
                                        id="ban-source-duration-error"
                                        className="mt-1.5 text-xs leading-relaxed text-red-300/85"
                                    >
                                        {fieldErrors.duration}
                                    </p>
                                ) : null}
                            </div>

                            <div className="mt-6">
                                <div className="flex items-end justify-between gap-3">
                                    <label htmlFor="ban-source-reason" className={LABEL_CLASS}>
                                        Reason
                                    </label>
                                    <span className="font-mono text-[9px] tabular-nums text-[var(--muted)]/42">
                                        {reason.length}/{BAN_REASON_MAX_LENGTH}
                                    </span>
                                </div>
                                <textarea
                                    id="ban-source-reason"
                                    name="reason"
                                    value={reason}
                                    maxLength={BAN_REASON_MAX_LENGTH}
                                    onChange={(event) => {
                                        setReason(event.target.value);
                                        clearFieldError('reason');
                                    }}
                                    aria-invalid={Boolean(fieldErrors.reason)}
                                    aria-describedby={fieldErrors.reason
                                        ? 'ban-source-reason-error'
                                        : 'ban-source-reason-help'}
                                    placeholder="Example: Repeated abusive submissions"
                                    className={TEXTAREA_CLASS}
                                />
                                <p
                                    id="ban-source-reason-help"
                                    className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]/48"
                                >
                                    Stored privately as plain-text security history.
                                </p>
                                {fieldErrors.reason ? (
                                    <p
                                        id="ban-source-reason-error"
                                        className="mt-1.5 text-xs leading-relaxed text-red-300/85"
                                    >
                                        {fieldErrors.reason}
                                    </p>
                                ) : null}
                            </div>

                            {duration === 'permanent' ? (
                                <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-amber-200/14 bg-amber-200/[0.045] px-3.5 py-3 text-sm leading-relaxed text-amber-100/72">
                                    <ShieldAlert
                                        aria-hidden="true"
                                        size={16}
                                        strokeWidth={1.8}
                                        className="mt-0.5 shrink-0"
                                    />
                                    <p>This ban remains active until manually revoked.</p>
                                </div>
                            ) : null}

                            <p
                                role="alert"
                                aria-live="polite"
                                className="mt-4 min-h-5 text-sm font-semibold text-red-300/85"
                            >
                                {!isPending ? actionError : null}
                            </p>
                        </fieldset>

                        <footer className="grid shrink-0 gap-2 border-t border-white/[0.08] bg-black/25 px-4 py-4 sm:grid-cols-2 sm:px-6">
                            <button
                                type="button"
                                onClick={() => animateClose()}
                                disabled={isPending}
                                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.025] px-4 text-sm font-bold text-[var(--muted)]/72 transition-[color,border-color,background-color] duration-200 hover:border-white/[0.16] hover:bg-white/[0.055] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/55 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-300/24 bg-red-300/[0.1] px-4 text-sm font-bold text-red-100 transition-[border-color,background-color,transform] duration-200 hover:border-red-200/40 hover:bg-red-300/[0.16] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200/55 disabled:cursor-wait disabled:opacity-55 motion-reduce:transition-none motion-reduce:active:scale-100"
                            >
                                {isPending ? (
                                    <LoaderCircle
                                        aria-hidden="true"
                                        size={17}
                                        strokeWidth={1.9}
                                        className="animate-spin motion-reduce:animate-none"
                                    />
                                ) : (
                                    <ShieldBan aria-hidden="true" size={17} strokeWidth={1.8} />
                                )}
                                {isPending ? 'Banning...' : 'Ban source'}
                            </button>
                        </footer>
                    </form>
                </section>
            </div>
        </dialog>
    );
}
