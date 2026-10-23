'use client';

import {
    ArrowRight,
    CircleAlert,
    CircleCheck,
    CircleX,
    Info,
    LoaderCircle,
    X,
    type LucideIcon,
} from 'lucide-react';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react';

import styles from './Snackbar.module.css';

export type SnackbarType = 'success' | 'info' | 'warning' | 'error';

export interface SnackbarAction {
    label: string;
    onAction: () => void | Promise<void>;
}

export interface SnackbarOptions {
    type: SnackbarType;
    title: string;
    message?: string;
    action?: SnackbarAction;
    durationMs?: number;
    persistent?: boolean;
}

export type SnackbarDisplayOptions = Omit<SnackbarOptions, 'type' | 'title'>;

export interface SnackbarController {
    show: (options: SnackbarOptions) => string;
    success: (title: string, options?: SnackbarDisplayOptions) => string;
    info: (title: string, options?: SnackbarDisplayOptions) => string;
    warning: (title: string, options?: SnackbarDisplayOptions) => string;
    error: (title: string, options?: SnackbarDisplayOptions) => string;
    dismiss: (id: string) => void;
    clear: () => void;
}

interface SnackbarProviderProps {
    children: ReactNode;
}

interface SnackbarItem extends Required<Pick<SnackbarOptions, 'type' | 'title'>> {
    id: string;
    message?: string;
    action?: SnackbarAction;
    durationMs: number;
    persistent: boolean;
    isVisible: boolean;
    isExiting: boolean;
    isPaused: boolean;
    isActionPending: boolean;
}

interface SnackbarVisual {
    icon: LucideIcon;
    surfaceClassName: string;
    washClassName: string;
    iconClassName: string;
    accentClassName: string;
    progressClassName: string;
    actionClassName: string;
}

type PauseReason = 'pointer' | 'focus' | 'action';
type SnackbarProgressStyle = CSSProperties & {
    '--snackbar-duration': string;
};

const MAX_SNACKBARS = 3;
const EXIT_ANIMATION_MS = 220;
const MIN_DURATION_MS = 1_000;
const MAX_DURATION_MS = 60_000;
const DEFAULT_DURATIONS: Record<SnackbarType, number> = {
    success: 5_000,
    info: 5_000,
    warning: 8_000,
    error: 8_000,
};

const SNACKBAR_VISUALS: Record<SnackbarType, SnackbarVisual> = {
    success: {
        icon: CircleCheck,
        surfaceClassName: 'border-[var(--signal)]/24 shadow-[0_20px_60px_rgba(0,0,0,0.5),0_8px_28px_rgba(124,58,237,0.08)]',
        washClassName: 'from-[var(--signal)]/[0.07] via-transparent to-transparent',
        iconClassName: 'border-[var(--signal)]/24 bg-[var(--signal)]/[0.1] text-[var(--signal)]',
        accentClassName: 'bg-[var(--signal)]/82',
        progressClassName: 'bg-[var(--signal)]/82',
        actionClassName: 'text-[var(--signal)] hover:bg-[var(--signal)]/[0.09] focus-visible:ring-[var(--signal)]/60',
    },
    info: {
        icon: Info,
        surfaceClassName: 'border-white/[0.12] shadow-[0_20px_60px_rgba(0,0,0,0.5)]',
        washClassName: 'from-white/[0.045] via-transparent to-transparent',
        iconClassName: 'border-white/[0.13] bg-white/[0.055] text-[var(--text)]/78',
        accentClassName: 'bg-white/45',
        progressClassName: 'bg-white/45',
        actionClassName: 'text-[var(--signal)] hover:bg-[var(--signal)]/[0.08] focus-visible:ring-[var(--signal)]/60',
    },
    warning: {
        icon: CircleAlert,
        surfaceClassName: 'border-amber-200/22 shadow-[0_20px_60px_rgba(0,0,0,0.5),0_8px_28px_rgba(251,191,36,0.045)]',
        washClassName: 'from-amber-200/[0.055] via-transparent to-transparent',
        iconClassName: 'border-amber-200/22 bg-amber-200/[0.085] text-amber-100',
        accentClassName: 'bg-amber-200/78',
        progressClassName: 'bg-amber-200/78',
        actionClassName: 'text-amber-100 hover:bg-amber-200/[0.08] focus-visible:ring-amber-100/55',
    },
    error: {
        icon: CircleX,
        surfaceClassName: 'border-red-300/22 shadow-[0_20px_60px_rgba(0,0,0,0.5),0_8px_28px_rgba(248,113,113,0.045)]',
        washClassName: 'from-red-300/[0.055] via-transparent to-transparent',
        iconClassName: 'border-red-300/22 bg-red-300/[0.085] text-red-200',
        accentClassName: 'bg-red-300/78',
        progressClassName: 'bg-red-300/78',
        actionClassName: 'text-red-200 hover:bg-red-300/[0.08] focus-visible:ring-red-200/55',
    },
};

const SnackbarContext = createContext<SnackbarController | null>(null);
let snackbarSequence = 0;

function createSnackbarId(): string {
    snackbarSequence += 1;
    return `snackbar-${Date.now().toString(36)}-${snackbarSequence.toString(36)}`;
}

function normalizeDuration(
    type: SnackbarType,
    durationMs: number | undefined,
): number {
    if (durationMs === undefined || !Number.isFinite(durationMs)) {
        return DEFAULT_DURATIONS[type];
    }

    return Math.min(
        MAX_DURATION_MS,
        Math.max(MIN_DURATION_MS, Math.round(durationMs)),
    );
}

function getErrorName(error: unknown): string {
    return error instanceof Error ? error.name : 'UnknownError';
}

export function useSnackbar(): SnackbarController {
    const snackbar = useContext(SnackbarContext);

    if (!snackbar) {
        throw new Error('useSnackbar must be used within a SnackbarProvider.');
    }

    return snackbar;
}

function SnackbarCard({
    item,
    onAction,
    onDismiss,
    onPause,
    onResume,
}: {
    item: SnackbarItem;
    onAction: (id: string) => void;
    onDismiss: (id: string) => void;
    onPause: (id: string, reason: PauseReason) => void;
    onResume: (id: string, reason: PauseReason) => void;
}) {
    const visual = SNACKBAR_VISUALS[item.type];
    const Icon = visual.icon;
    const isAssertive = item.type === 'warning' || item.type === 'error';
    const progressStyle: SnackbarProgressStyle = {
        '--snackbar-duration': `${item.durationMs}ms`,
    };

    return (
        <section
            role={isAssertive ? 'alert' : 'status'}
            aria-live={isAssertive ? 'assertive' : 'polite'}
            aria-atomic="true"
            onPointerEnter={() => onPause(item.id, 'pointer')}
            onPointerLeave={() => onResume(item.id, 'pointer')}
            onFocusCapture={() => onPause(item.id, 'focus')}
            onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    onResume(item.id, 'focus');
                }
            }}
            className={`pointer-events-auto relative w-full min-w-0 overflow-hidden rounded-lg border bg-[rgba(7,7,10,0.78)] text-[var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-2xl transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${visual.surfaceClassName} ${item.isVisible && !item.isExiting ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.985] opacity-0'}`}
        >
            <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${visual.washClassName}`}
            />
            <span
                aria-hidden="true"
                className={`absolute inset-y-3 left-0 w-px rounded-full ${visual.accentClassName}`}
            />
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent"
            />

            <div className="relative flex items-start gap-3 px-3.5 py-3.5 pr-2.5 sm:px-4 sm:py-4 sm:pr-3">
                <span
                    className={`mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-lg border ${visual.iconClassName}`}
                >
                    <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
                </span>

                <div className="min-w-0 flex-1 pt-0.5">
                    <p className="break-words text-sm font-extrabold leading-snug tracking-normal text-[var(--text)]">
                        {item.title}
                    </p>
                    {item.message ? (
                        <p className="mt-1 line-clamp-3 break-words text-xs leading-relaxed text-[var(--muted)]/62">
                            {item.message}
                        </p>
                    ) : null}
                    {item.action ? (
                        <button
                            type="button"
                            onClick={() => onAction(item.id)}
                            disabled={item.isActionPending}
                            className={`mt-2.5 inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-bold uppercase tracking-[0.08em] transition-[background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-wait disabled:opacity-55 motion-reduce:transition-none ${visual.actionClassName}`}
                        >
                            {item.isActionPending ? (
                                <LoaderCircle
                                    aria-hidden="true"
                                    size={14}
                                    strokeWidth={1.9}
                                    className="animate-spin motion-reduce:animate-none"
                                />
                            ) : null}
                            {item.action.label}
                            {!item.isActionPending ? (
                                <ArrowRight aria-hidden="true" size={14} strokeWidth={1.8} />
                            ) : null}
                        </button>
                    ) : null}
                </div>

                <button
                    type="button"
                    onClick={() => onDismiss(item.id)}
                    aria-label="Dismiss notification"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-[var(--muted)]/52 transition-[background-color,color] duration-200 hover:bg-white/[0.055] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 motion-reduce:transition-none"
                >
                    <X aria-hidden="true" size={16} strokeWidth={1.8} />
                </button>
            </div>

            {!item.persistent ? (
                <div
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-white/[0.035] motion-reduce:hidden"
                >
                    <div
                        style={progressStyle}
                        className={`h-full w-full ${styles.progress} ${item.isPaused ? styles.paused : ''} ${visual.progressClassName}`}
                    />
                </div>
            ) : null}
        </section>
    );
}

export function SnackbarProvider({ children }: SnackbarProviderProps) {
    const [items, setItems] = useState<SnackbarItem[]>([]);
    const itemsRef = useRef<SnackbarItem[]>([]);
    const mountedRef = useRef(true);
    const prefersReducedMotionRef = useRef(false);
    const autoDismissTimersRef = useRef(new Map<string, number>());
    const removalTimersRef = useRef(new Map<string, number>());
    const entryFramesRef = useRef(new Map<string, number>());
    const remainingMsRef = useRef(new Map<string, number>());
    const timerStartedAtRef = useRef(new Map<string, number>());
    const pauseReasonsRef = useRef(new Map<string, Set<PauseReason>>());
    const dismissRef = useRef<(id: string) => void>(() => undefined);

    const commitItems = useCallback((nextItems: SnackbarItem[]) => {
        itemsRef.current = nextItems;
        if (mountedRef.current) setItems(nextItems);
    }, []);

    const updateItem = useCallback((
        id: string,
        update: Partial<SnackbarItem>,
    ) => {
        const nextItems = itemsRef.current.map((item) =>
            item.id === id ? { ...item, ...update } : item);
        commitItems(nextItems);
    }, [commitItems]);

    const clearAutoDismissTimer = useCallback((id: string) => {
        const timer = autoDismissTimersRef.current.get(id);
        if (timer !== undefined) window.clearTimeout(timer);
        autoDismissTimersRef.current.delete(id);
        timerStartedAtRef.current.delete(id);
    }, []);

    const clearItemResources = useCallback((id: string) => {
        clearAutoDismissTimer(id);

        const removalTimer = removalTimersRef.current.get(id);
        if (removalTimer !== undefined) window.clearTimeout(removalTimer);
        removalTimersRef.current.delete(id);

        const entryFrame = entryFramesRef.current.get(id);
        if (entryFrame !== undefined) window.cancelAnimationFrame(entryFrame);
        entryFramesRef.current.delete(id);

        remainingMsRef.current.delete(id);
        pauseReasonsRef.current.delete(id);
    }, [clearAutoDismissTimer]);

    const removeItem = useCallback((id: string) => {
        clearItemResources(id);
        commitItems(itemsRef.current.filter((item) => item.id !== id));
    }, [clearItemResources, commitItems]);

    const scheduleAutoDismiss = useCallback((id: string) => {
        clearAutoDismissTimer(id);
        const remainingMs = remainingMsRef.current.get(id) ?? 0;

        if (remainingMs <= 0) {
            dismissRef.current(id);
            return;
        }

        timerStartedAtRef.current.set(id, Date.now());
        const timer = window.setTimeout(() => {
            autoDismissTimersRef.current.delete(id);
            timerStartedAtRef.current.delete(id);
            dismissRef.current(id);
        }, remainingMs);
        autoDismissTimersRef.current.set(id, timer);
    }, [clearAutoDismissTimer]);

    const dismiss = useCallback((id: string) => {
        if (!mountedRef.current) return;

        const item = itemsRef.current.find((candidate) => candidate.id === id);
        if (!item || item.isExiting) return;

        clearAutoDismissTimer(id);
        remainingMsRef.current.delete(id);
        pauseReasonsRef.current.delete(id);

        const entryFrame = entryFramesRef.current.get(id);
        if (entryFrame !== undefined) window.cancelAnimationFrame(entryFrame);
        entryFramesRef.current.delete(id);

        updateItem(id, {
            isVisible: false,
            isExiting: true,
            isPaused: false,
        });

        if (prefersReducedMotionRef.current) {
            removeItem(id);
            return;
        }

        const removalTimer = window.setTimeout(
            () => removeItem(id),
            EXIT_ANIMATION_MS,
        );
        removalTimersRef.current.set(id, removalTimer);
    }, [clearAutoDismissTimer, removeItem, updateItem]);

    useEffect(() => {
        dismissRef.current = dismiss;
    }, [dismiss]);

    const show = useCallback((options: SnackbarOptions): string => {
        const id = createSnackbarId();
        if (!mountedRef.current) return id;

        const requestedDuration = options.durationMs;
        const persistent = options.persistent === true || (
            requestedDuration !== undefined && requestedDuration <= 0
        );
        const durationMs = normalizeDuration(options.type, requestedDuration);
        const item: SnackbarItem = {
            id,
            type: options.type,
            title: options.title,
            message: options.message,
            action: options.action,
            durationMs,
            persistent,
            isVisible: false,
            isExiting: false,
            isPaused: false,
            isActionPending: false,
        };
        const nextItems = [...itemsRef.current, item];
        const overflowItems = nextItems.slice(0, -MAX_SNACKBARS);

        overflowItems.forEach((overflowItem) => {
            clearItemResources(overflowItem.id);
        });

        commitItems(nextItems.slice(-MAX_SNACKBARS));
        if (!persistent) remainingMsRef.current.set(id, durationMs);

        const entryFrame = window.requestAnimationFrame(() => {
            entryFramesRef.current.delete(id);
            updateItem(id, { isVisible: true });

            if (!persistent && !(pauseReasonsRef.current.get(id)?.size)) {
                scheduleAutoDismiss(id);
            }
        });
        entryFramesRef.current.set(id, entryFrame);

        return id;
    }, [clearItemResources, commitItems, scheduleAutoDismiss, updateItem]);

    const clear = useCallback(() => {
        const ids = itemsRef.current.map((item) => item.id);
        ids.forEach((id) => dismissRef.current(id));
    }, []);

    const pause = useCallback((id: string, reason: PauseReason) => {
        const item = itemsRef.current.find((candidate) => candidate.id === id);
        if (!item || item.persistent || item.isExiting) return;

        const reasons = pauseReasonsRef.current.get(id) ?? new Set<PauseReason>();
        const wasPaused = reasons.size > 0;
        reasons.add(reason);
        pauseReasonsRef.current.set(id, reasons);
        if (wasPaused) return;

        const startedAt = timerStartedAtRef.current.get(id);
        const remainingMs = remainingMsRef.current.get(id) ?? item.durationMs;
        if (startedAt !== undefined) {
            remainingMsRef.current.set(
                id,
                Math.max(0, remainingMs - (Date.now() - startedAt)),
            );
        }

        clearAutoDismissTimer(id);
        updateItem(id, { isPaused: true });
    }, [clearAutoDismissTimer, updateItem]);

    const resume = useCallback((id: string, reason: PauseReason) => {
        const item = itemsRef.current.find((candidate) => candidate.id === id);
        if (!item || item.persistent || item.isExiting) return;

        const reasons = pauseReasonsRef.current.get(id);
        if (!reasons) return;

        reasons.delete(reason);
        if (reasons.size > 0) return;

        pauseReasonsRef.current.delete(id);
        updateItem(id, { isPaused: false });
        scheduleAutoDismiss(id);
    }, [scheduleAutoDismiss, updateItem]);

    const handleAction = useCallback((id: string) => {
        const item = itemsRef.current.find((candidate) => candidate.id === id);
        if (!item?.action || item.isActionPending || item.isExiting) return;

        pause(id, 'action');
        updateItem(id, { isActionPending: true });
        void Promise.resolve()
            .then(() => item.action?.onAction())
            .catch((error: unknown) => {
                console.error('[snackbar] Action failed.', {
                    name: getErrorName(error),
                });
            })
            .finally(() => dismissRef.current(id));
    }, [pause, updateItem]);

    const controller = useMemo<SnackbarController>(() => ({
        show,
        success: (title, options) => show({
            ...options,
            type: 'success',
            title,
        }),
        info: (title, options) => show({
            ...options,
            type: 'info',
            title,
        }),
        warning: (title, options) => show({
            ...options,
            type: 'warning',
            title,
        }),
        error: (title, options) => show({
            ...options,
            type: 'error',
            title,
        }),
        dismiss,
        clear,
    }), [clear, dismiss, show]);

    useEffect(() => {
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const updateMotionPreference = () => {
            prefersReducedMotionRef.current = motionQuery.matches;
        };

        updateMotionPreference();
        motionQuery.addEventListener('change', updateMotionPreference);

        return () => motionQuery.removeEventListener('change', updateMotionPreference);
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        // The maps are created once and only mutated, so the instances taken here are the ones
        // holding every pending timer when the provider unmounts.
        const autoDismissTimers = autoDismissTimersRef.current;
        const removalTimers = removalTimersRef.current;
        const entryFrames = entryFramesRef.current;
        const remainingMs = remainingMsRef.current;
        const timerStartedAt = timerStartedAtRef.current;
        const pauseReasons = pauseReasonsRef.current;

        return () => {
            mountedRef.current = false;
            autoDismissTimers.forEach((timer) => window.clearTimeout(timer));
            removalTimers.forEach((timer) => window.clearTimeout(timer));
            entryFrames.forEach((frame) => window.cancelAnimationFrame(frame));
            autoDismissTimers.clear();
            removalTimers.clear();
            entryFrames.clear();
            remainingMs.clear();
            timerStartedAt.clear();
            pauseReasons.clear();
            itemsRef.current = [];
        };
    }, []);

    return (
        <SnackbarContext.Provider value={controller}>
            {children}
            {items.length > 0 ? (
                <div
                    role="region"
                    aria-label="Notifications"
                    className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[80] flex flex-col gap-3 px-3 sm:left-auto sm:right-6 sm:w-[calc(100vw-3rem)] sm:max-w-[26.25rem] sm:px-0"
                >
                    {items.map((item) => (
                        <SnackbarCard
                            key={item.id}
                            item={item}
                            onAction={handleAction}
                            onDismiss={dismiss}
                            onPause={pause}
                            onResume={resume}
                        />
                    ))}
                </div>
            ) : null}
        </SnackbarContext.Provider>
    );
}
