'use client';

import { useActionState, useEffect, useRef } from 'react';
import { AlertTriangle, LoaderCircle, Trash2, X } from 'lucide-react';

import { deleteProject } from '@/features/admin/projects/actions';
import type { AdminProjectDto, ProjectActionState } from '@/features/admin/projects/types';

interface DeleteProjectDialogProps {
    project: AdminProjectDto;
    onClose: () => void;
    onSuccess: (message: string) => void;
}

const INITIAL_ACTION_STATE: ProjectActionState = {
    status: 'idle',
    message: '',
    attempt: 0,
    fieldErrors: {},
};

function getFocusableElements(dialog: HTMLDialogElement): HTMLElement[] {
    return Array.from(
        dialog.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
    );
}

export default function DeleteProjectDialog({
    project,
    onClose,
    onSuccess,
}: DeleteProjectDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const closeRef = useRef(onClose);
    const pendingRef = useRef(false);
    const handledAttemptRef = useRef(0);
    const deleteAction = deleteProject.bind(null, project.id);
    const [state, formAction, isPending] = useActionState(deleteAction, INITIAL_ACTION_STATE);

    closeRef.current = onClose;
    pendingRef.current = isPending;

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const previouslyFocused = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        const previousOverflow = document.body.style.overflow;

        dialog.showModal();
        document.body.style.overflow = 'hidden';
        window.requestAnimationFrame(() => {
            dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus();
        });

        const handleCancel = (event: Event) => {
            event.preventDefault();
            if (!pendingRef.current) closeRef.current();
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
            if (dialog.open) dialog.close();
            document.body.style.overflow = previousOverflow;
            previouslyFocused?.focus();
        };
    }, []);

    useEffect(() => {
        if (
            state.status !== 'success' ||
            state.attempt === 0 ||
            state.attempt === handledAttemptRef.current
        ) {
            return;
        }

        handledAttemptRef.current = state.attempt;
        onSuccess(state.message);
    }, [onSuccess, state]);

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby="delete-project-title"
            aria-describedby="delete-project-description"
            onClick={(event) => {
                if (event.target === event.currentTarget && !isPending) onClose();
            }}
            className="m-auto w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-lg border border-red-400/15 bg-[#0a090c] p-0 text-left text-[var(--text)] shadow-[0_28px_90px_rgba(0,0,0,0.65)] backdrop:bg-black/78 backdrop:backdrop-blur-sm"
        >
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] px-4 py-4 sm:px-5">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-red-400/14 bg-red-400/[0.06] text-red-300/75">
                        <AlertTriangle aria-hidden="true" size={18} strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0">
                        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-red-300/62">
                            Destructive action
                        </p>
                        <h2
                            id="delete-project-title"
                            className="mt-1 text-xl font-extrabold tracking-normal text-[var(--text)]"
                        >
                            Delete project?
                        </h2>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isPending}
                    aria-label="Close delete confirmation"
                    className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-[var(--muted)]/55 transition-colors hover:bg-white/[0.04] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
                >
                    <X aria-hidden="true" size={18} strokeWidth={1.8} />
                </button>
            </div>

            <form action={formAction} className="px-4 py-5 sm:px-5">
                <p id="delete-project-description" className="text-sm leading-relaxed text-[var(--muted)]/68">
                    <strong className="font-bold text-[var(--text)]">{project.title}</strong> will be removed from the dashboard and public portfolio. This cannot be undone.
                </p>

                <div aria-live="polite" className="mt-4 min-h-5 text-sm text-red-300/85">
                    {!isPending && state.status === 'error' ? state.message : null}
                </div>

                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        data-initial-focus
                        type="button"
                        onClick={onClose}
                        disabled={isPending}
                        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/[0.09] px-4 text-sm font-bold text-[var(--muted)]/68 transition-colors hover:bg-white/[0.04] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-400/20 bg-red-400/[0.075] px-4 text-sm font-bold text-red-200/85 transition-colors hover:border-red-300/35 hover:bg-red-400/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/55 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none"
                    >
                        {isPending ? (
                            <LoaderCircle aria-hidden="true" size={17} className="animate-spin motion-reduce:animate-none" />
                        ) : (
                            <Trash2 aria-hidden="true" size={16} strokeWidth={1.9} />
                        )}
                        {isPending ? 'Deleting...' : 'Delete project'}
                    </button>
                </div>
            </form>
        </dialog>
    );
}
