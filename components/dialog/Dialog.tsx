'use client';

import {
    AlertTriangle,
    CircleCheck,
    CircleHelp,
    CircleX,
    LoaderCircle,
    X,
    type LucideIcon,
} from 'lucide-react';
import { unstable_rethrow } from 'next/navigation';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
    useTransition,
    type KeyboardEvent as ReactKeyboardEvent,
    type ReactNode,
} from 'react';

export type DialogType = 'success' | 'error' | 'alert' | 'confirm';
export type DialogTone = 'default' | 'danger';

export interface DialogActionResult {
    ok: boolean;
    message?: string;
}

type DialogAction = () =>
    | void
    | DialogActionResult
    | Promise<void | DialogActionResult>;

export interface DialogConfig {
    type: DialogType;
    title: string;
    message: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    pendingLabel?: string;
    tone?: DialogTone;
    onConfirm?: DialogAction;
    onCancel?: () => void;
}

export interface DialogConfirmOptions {
    confirmLabel?: string;
    cancelLabel?: string;
    pendingLabel?: string;
    tone?: DialogTone;
}

export interface DialogController {
    open: (config: DialogConfig) => void;
    close: () => void;
    success: (title: string, message: ReactNode, onConfirm?: DialogAction) => void;
    error: (title: string, message: ReactNode, onConfirm?: DialogAction) => void;
    alert: (title: string, message: ReactNode, onConfirm?: DialogAction) => void;
    confirm: (
        title: string,
        message: ReactNode,
        onConfirm: DialogAction,
        onCancel?: () => void,
        options?: DialogConfirmOptions,
    ) => void;
}

interface DialogProviderProps {
    children: ReactNode;
}

interface DialogVisual {
    icon: LucideIcon;
    eyebrow: string;
    iconClassName: string;
    pingClassName: string;
    confirmClassName: string;
}

const CLOSE_ANIMATION_MS = 280;
const FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

const DIALOG_VISUALS: Record<DialogType, DialogVisual> = {
    success: {
        icon: CircleCheck,
        eyebrow: 'Completed',
        iconClassName: 'border-emerald-300/20 bg-emerald-300/[0.09] text-emerald-200',
        pingClassName: 'bg-emerald-300/20',
        confirmClassName: 'border-emerald-300/25 bg-emerald-300/[0.12] text-emerald-100 hover:border-emerald-200/40 hover:bg-emerald-300/[0.18] focus-visible:ring-emerald-200/55',
    },
    error: {
        icon: CircleX,
        eyebrow: 'Action failed',
        iconClassName: 'border-red-300/20 bg-red-300/[0.09] text-red-200',
        pingClassName: 'bg-red-300/20',
        confirmClassName: 'border-red-300/25 bg-red-300/[0.12] text-red-100 hover:border-red-200/40 hover:bg-red-300/[0.18] focus-visible:ring-red-200/55',
    },
    alert: {
        icon: AlertTriangle,
        eyebrow: 'Attention',
        iconClassName: 'border-amber-200/20 bg-amber-200/[0.09] text-amber-100',
        pingClassName: 'bg-amber-200/20',
        confirmClassName: 'border-amber-200/25 bg-amber-200/[0.12] text-amber-50 hover:border-amber-100/40 hover:bg-amber-200/[0.18] focus-visible:ring-amber-100/55',
    },
    confirm: {
        icon: CircleHelp,
        eyebrow: 'Confirmation',
        iconClassName: 'border-[var(--signal)]/24 bg-[var(--signal)]/[0.1] text-[var(--signal)]',
        pingClassName: 'bg-[var(--signal)]/20',
        confirmClassName: 'border-[var(--signal)]/28 bg-[var(--signal)]/14 text-[var(--signal)] hover:border-[var(--signal)]/45 hover:bg-[var(--signal)]/20 focus-visible:ring-[var(--signal)]/60',
    },
};

const DANGER_VISUAL: DialogVisual = {
    icon: AlertTriangle,
    eyebrow: 'Destructive action',
    iconClassName: 'border-red-300/20 bg-red-300/[0.09] text-red-200',
    pingClassName: 'bg-red-300/20',
    confirmClassName: 'border-red-300/25 bg-red-300/[0.12] text-red-100 hover:border-red-200/40 hover:bg-red-300/[0.18] focus-visible:ring-red-200/55',
};

const DialogContext = createContext<DialogController | null>(null);

function getFocusableElements(dialog: HTMLDialogElement): HTMLElement[] {
    return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

export function useDialog(): DialogController {
    const dialog = useContext(DialogContext);

    if (!dialog) {
        throw new Error('useDialog must be used within a DialogProvider.');
    }

    return dialog;
}

export function DialogProvider({ children }: DialogProviderProps) {
    const [config, setConfig] = useState<DialogConfig | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [actionError, setActionError] = useState('');
    const [isPending, startTransition] = useTransition();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingRef = useRef(isPending);
    const titleId = `dialog-title-${useId()}`;
    const messageId = `dialog-message-${useId()}`;
    const errorId = `dialog-error-${useId()}`;
    const isOpen = config !== null;

    useEffect(() => {
        pendingRef.current = isPending;
    }, [isPending]);

    const clearCloseTimer = useCallback(() => {
        if (!closeTimerRef.current) return;
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
    }, []);

    const open = useCallback((nextConfig: DialogConfig) => {
        clearCloseTimer();
        setActionError('');
        setIsAnimating(false);
        setConfig(nextConfig);
    }, [clearCloseTimer]);

    const dismiss = useCallback((afterDismiss?: () => void, force = false) => {
        if (pendingRef.current && !force) return;

        clearCloseTimer();
        setIsAnimating(false);
        closeTimerRef.current = setTimeout(() => {
            setConfig(null);
            setActionError('');
            closeTimerRef.current = null;
            afterDismiss?.();
        }, CLOSE_ANIMATION_MS);
    }, [clearCloseTimer]);

    const close = useCallback(() => dismiss(), [dismiss]);

    const controller = useMemo<DialogController>(() => ({
        open,
        close,
        success: (title, message, onConfirm) => open({
            type: 'success',
            title,
            message,
            confirmLabel: 'Got it',
            onConfirm,
        }),
        error: (title, message, onConfirm) => open({
            type: 'error',
            title,
            message,
            confirmLabel: 'OK',
            onConfirm,
        }),
        alert: (title, message, onConfirm) => open({
            type: 'alert',
            title,
            message,
            confirmLabel: 'OK',
            onConfirm,
        }),
        confirm: (title, message, onConfirm, onCancel, options) => open({
            type: 'confirm',
            title,
            message,
            onConfirm,
            onCancel,
            confirmLabel: options?.confirmLabel ?? 'Confirm',
            cancelLabel: options?.cancelLabel ?? 'Cancel',
            pendingLabel: options?.pendingLabel,
            tone: options?.tone,
        }),
    }), [close, open]);

    useEffect(() => {
        if (!isOpen) return;

        const dialog = dialogRef.current;
        if (!dialog) return;

        const previouslyFocused = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        const previousOverflow = document.body.style.overflow;

        if (!dialog.open) dialog.showModal();
        document.body.style.overflow = 'hidden';

        const focusFrame = window.requestAnimationFrame(() => {
            dialog.querySelector<HTMLElement>('[data-dialog-initial-focus="true"]')?.focus();
        });

        return () => {
            window.cancelAnimationFrame(focusFrame);
            if (dialog.open) dialog.close();
            document.body.style.overflow = previousOverflow;
            previouslyFocused?.focus();
        };
    }, [isOpen]);

    useEffect(() => {
        if (!config) return;

        const animationFrame = window.requestAnimationFrame(() => {
            setIsAnimating(true);
        });

        return () => window.cancelAnimationFrame(animationFrame);
    }, [config]);

    useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

    const handleCancel = useCallback(() => {
        const onCancel = config?.onCancel;
        dismiss(onCancel);
    }, [config, dismiss]);

    const handleConfirm = useCallback(() => {
        if (!config || isPending) return;

        if (!config.onConfirm) {
            dismiss();
            return;
        }

        setActionError('');
        startTransition(async () => {
            try {
                const result = await config.onConfirm?.();

                if (result && !result.ok) {
                    setActionError(result.message ?? 'The action could not be completed. Please try again.');
                    return;
                }

                dismiss(undefined, true);
            } catch (error) {
                unstable_rethrow(error);

                const name = error instanceof Error ? error.name : 'UnknownError';
                console.error('[dialog] Confirm action failed.', { name });
                setActionError('The action could not be completed. Please try again.');
            }
        });
    }, [config, dismiss, isPending]);

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLDialogElement>) => {
        if (event.key !== 'Tab') return;

        const focusable = getFocusableElements(event.currentTarget);
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

    const visual = config?.tone === 'danger'
        ? DANGER_VISUAL
        : DIALOG_VISUALS[config?.type ?? 'alert'];
    const Icon = visual.icon;
    const showCancel = config?.type === 'confirm';

    return (
        <DialogContext.Provider value={controller}>
            {children}

            {config ? (
                <dialog
                    ref={dialogRef}
                    aria-labelledby={titleId}
                    aria-describedby={`${messageId}${actionError ? ` ${errorId}` : ''}`}
                    aria-busy={isPending}
                    onCancel={(event) => {
                        event.preventDefault();
                        handleCancel();
                    }}
                    onKeyDown={handleKeyDown}
                    className={`fixed inset-0 m-0 h-dvh w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 text-[var(--text)] backdrop:bg-[rgba(0,0,0,0.72)] backdrop:[-webkit-backdrop-filter:blur(10px)] backdrop:[backdrop-filter:blur(10px)] backdrop:[transition:opacity_280ms_ease] motion-reduce:backdrop:[transition:none] ${isAnimating ? 'backdrop:opacity-100' : 'backdrop:opacity-0'}`}
                >
                    <div
                        className={`flex h-full w-full items-center justify-center p-4 transition-opacity duration-[280ms] motion-reduce:transition-none ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget) handleCancel();
                        }}
                    >
                        <section
                            className={`relative w-full max-w-sm overflow-hidden rounded-lg border border-white/[0.1] bg-[#0a090c]/95 shadow-[0_28px_90px_rgba(0,0,0,0.68),inset_0_1px_0_rgba(255,255,255,0.035)] transition-[opacity,transform] duration-[280ms] [transition-timing-function:cubic-bezier(0.34,1.35,0.64,1)] motion-reduce:transition-none ${isAnimating ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-5 scale-[0.96] opacity-0'}`}
                            role="document"
                            onMouseDown={(event) => event.stopPropagation()}
                        >
                            <span
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[var(--signal)]/42 to-transparent"
                            />

                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={isPending}
                                aria-label="Close dialog"
                                className="absolute right-3 top-3 inline-flex size-10 items-center justify-center rounded-lg border border-transparent text-[var(--muted)]/52 transition-[color,border-color,background-color] duration-200 hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
                            >
                                <X aria-hidden="true" size={18} strokeWidth={1.8} />
                            </button>

                            <div className="px-5 pb-5 pt-7 text-center sm:px-7 sm:pb-7 sm:pt-8">
                                <div className={`relative mx-auto flex size-14 items-center justify-center rounded-lg border ${visual.iconClassName}`}>
                                    <span
                                        aria-hidden="true"
                                        className={`absolute inset-1 rounded-lg opacity-0 motion-safe:animate-ping motion-safe:opacity-100 ${visual.pingClassName}`}
                                    />
                                    <Icon aria-hidden="true" size={25} strokeWidth={1.9} className="relative z-10" />
                                </div>

                                <p className="mt-5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--signal)]/72">
                                    {visual.eyebrow}
                                </p>
                                <h2
                                    id={titleId}
                                    className="mt-1.5 text-xl font-extrabold leading-tight tracking-normal text-[var(--text)] sm:text-[1.35rem]"
                                >
                                    {config.title}
                                </h2>
                                <div
                                    id={messageId}
                                    className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-[var(--muted)]/68"
                                >
                                    {config.message}
                                </div>

                                <div
                                    id={errorId}
                                    role="alert"
                                    aria-live="polite"
                                    className="mt-4 min-h-5 text-sm font-semibold text-red-300/88"
                                >
                                    {!isPending ? actionError : null}
                                </div>

                                <div className={`mt-5 grid gap-2 ${showCancel ? 'sm:grid-cols-2' : ''}`}>
                                    {showCancel ? (
                                        <button
                                            data-dialog-initial-focus="true"
                                            type="button"
                                            onClick={handleCancel}
                                            disabled={isPending}
                                            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.025] px-4 text-sm font-bold text-[var(--muted)]/72 transition-[color,border-color,background-color] duration-200 hover:border-white/[0.16] hover:bg-white/[0.055] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/55 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
                                        >
                                            {config.cancelLabel ?? 'Cancel'}
                                        </button>
                                    ) : null}

                                    <button
                                        data-dialog-initial-focus={showCancel ? undefined : 'true'}
                                        type="button"
                                        onClick={handleConfirm}
                                        disabled={isPending}
                                        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-bold transition-[color,border-color,background-color,transform] duration-200 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 disabled:cursor-wait disabled:opacity-55 motion-reduce:transition-none motion-reduce:active:scale-100 ${visual.confirmClassName}`}
                                    >
                                        {isPending ? (
                                            <LoaderCircle
                                                aria-hidden="true"
                                                size={17}
                                                strokeWidth={1.9}
                                                className="animate-spin motion-reduce:animate-none"
                                            />
                                        ) : null}
                                        {isPending
                                            ? config.pendingLabel ?? 'Working...'
                                            : config.confirmLabel ?? 'OK'}
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>
                </dialog>
            ) : null}
        </DialogContext.Provider>
    );
}
