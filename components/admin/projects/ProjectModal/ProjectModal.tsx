'use client';

import {
    useActionState,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type DragEvent,
    type FormEvent,
    type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import Image from 'next/image';
import {
    FileImage,
    FolderKanban,
    ImagePlus,
    Link2,
    LoaderCircle,
    Save,
    Tag,
    UploadCloud,
    X,
} from 'lucide-react';

import { createProject, updateProject } from '@/features/admin/projects/actions';
import type {
    AdminProjectDto,
    ProjectActionState,
    ProjectField,
    ProjectFieldErrors,
} from '@/features/admin/projects/types';
import {
    MAX_PROJECT_IMAGE_BYTES,
    MAX_PROJECT_TAGS,
    slugifyProjectTitle,
    validateProjectFormData,
} from '@/features/admin/projects/validation';

interface ProjectModalProps {
    mode: 'create' | 'edit';
    project?: AdminProjectDto;
    onClose: () => void;
    onSuccess: (message: string) => void;
}

const INITIAL_ACTION_STATE: ProjectActionState = {
    status: 'idle',
    message: '',
    attempt: 0,
    fieldErrors: {},
};

const ACCEPTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const CLOSE_ANIMATION_MS = 220;

const FIELD_CLASS =
    'min-h-11 w-full rounded-lg border border-white/[0.09] bg-[#050608] px-3.5 text-sm text-[var(--text)] outline-none transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-[var(--muted)]/30 focus:border-[var(--signal)]/45 focus:bg-[#07080b] focus:ring-2 focus:ring-[var(--signal)]/12 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none';

const LABEL_CLASS =
    'font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]/68';

function getFocusableElements(dialog: HTMLDialogElement): HTMLElement[] {
    return Array.from(
        dialog.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
    ).filter((element) => !element.hasAttribute('hidden'));
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProjectModal({
    mode,
    project,
    onClose,
    onSuccess,
}: ProjectModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const imagePreviewUrlRef = useRef<string | null>(null);
    const bypassValidationRef = useRef(false);
    const validationRunningRef = useRef(false);
    const closeRef = useRef(onClose);
    const successRef = useRef(onSuccess);
    const pendingRef = useRef(false);
    const handledAttemptRef = useRef(0);
    const slugWasEditedRef = useRef(mode === 'edit');
    const dragDepthRef = useRef(0);
    const closeTimerRef = useRef<number | null>(null);
    const openingFrameRef = useRef<number | null>(null);
    const prefersReducedMotionRef = useRef(false);
    const isClosingRef = useRef(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [title, setTitle] = useState(project?.title ?? '');
    const [slug, setSlug] = useState(project?.slug ?? '');
    const [tags, setTags] = useState<string[]>(() => [...(project?.tags ?? [])]);
    const [tagDraft, setTagDraft] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [clientErrors, setClientErrors] = useState<ProjectFieldErrors>({});
    const [touchedFields, setTouchedFields] = useState<Set<ProjectField>>(() => new Set());
    const [isValidating, setIsValidating] = useState(false);

    const projectAction = useMemo(
        () => mode === 'create'
            ? createProject
            : updateProject.bind(null, project?.id ?? ''),
        [mode, project?.id],
    );
    const [state, formAction, isPending] = useActionState(projectAction, INITIAL_ACTION_STATE);
    const busy = isPending || isValidating;

    const tagsForSubmission = useMemo(() => {
        const pendingTag = tagDraft.trim();
        if (!pendingTag) return tags.join(', ');

        const hasDuplicate = tags.some(
            (tag) => tag.toLocaleLowerCase('en-US') === pendingTag.toLocaleLowerCase('en-US'),
        );
        return [...tags, ...(hasDuplicate ? [] : [pendingTag])].join(', ');
    }, [tagDraft, tags]);

    useEffect(() => {
        closeRef.current = onClose;
        successRef.current = onSuccess;
        pendingRef.current = busy;
    }, [busy, onClose, onSuccess]);

    const updateSelectedImage = useCallback((image: File | null) => {
        if (imagePreviewUrlRef.current) {
            URL.revokeObjectURL(imagePreviewUrlRef.current);
        }

        const nextPreviewUrl = image ? URL.createObjectURL(image) : null;
        imagePreviewUrlRef.current = nextPreviewUrl;
        setSelectedImage(image);
        setImagePreviewUrl(nextPreviewUrl);
    }, []);

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
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        prefersReducedMotionRef.current = motionQuery.matches;

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

    useEffect(() => () => {
        if (imagePreviewUrlRef.current) {
            URL.revokeObjectURL(imagePreviewUrlRef.current);
            imagePreviewUrlRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (state.attempt === 0 || state.attempt === handledAttemptRef.current) return;
        handledAttemptRef.current = state.attempt;
        setClientErrors({});
        setTouchedFields(new Set());

        if (state.status === 'success') {
            animateClose(() => successRef.current(state.message), true);
        }
    }, [animateClose, state]);

    const clearFieldError = (field: ProjectField) => {
        setClientErrors((current) => {
            if (!current[field]) return current;
            const next = { ...current };
            delete next[field];
            return next;
        });
        setTouchedFields((current) => {
            const next = new Set(current);
            next.add(field);
            return next;
        });
    };

    const getFieldError = (field: ProjectField) =>
        clientErrors[field] ?? (touchedFields.has(field) ? undefined : state.fieldErrors[field]);

    const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const nextTitle = event.target.value;
        setTitle(nextTitle);
        clearFieldError('title');
        if (mode === 'create' && !slugWasEditedRef.current) {
            setSlug(slugifyProjectTitle(nextTitle));
            clearFieldError('slug');
        }
    };

    const handleSlugChange = (event: ChangeEvent<HTMLInputElement>) => {
        slugWasEditedRef.current = true;
        setSlug(event.target.value.toLocaleLowerCase('en-US'));
        clearFieldError('slug');
    };

    const selectImage = (image: File): boolean => {
        clearFieldError('image');

        if (!ACCEPTED_IMAGE_TYPES.has(image.type)) {
            setClientErrors((current) => ({
                ...current,
                image: 'Choose a PNG, JPEG, or WebP image.',
            }));
            return false;
        }

        if (image.size > MAX_PROJECT_IMAGE_BYTES) {
            setClientErrors((current) => ({
                ...current,
                image: 'Image size must not exceed 5 MiB.',
            }));
            return false;
        }

        updateSelectedImage(image);
        return true;
    };

    const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
        const image = event.target.files?.[0] ?? null;
        if (!image) {
            updateSelectedImage(null);
            return;
        }

        if (!selectImage(image)) event.target.value = '';
    };

    const clearSelectedImage = () => {
        if (busy) return;
        if (imageInputRef.current) imageInputRef.current.value = '';
        updateSelectedImage(null);
        clearFieldError('image');
    };

    const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (busy) return;
        dragDepthRef.current += 1;
        setIsDragging(true);
    };

    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (!busy) event.dataTransfer.dropEffect = 'copy';
    };

    const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) setIsDragging(false);
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        dragDepthRef.current = 0;
        setIsDragging(false);
        if (busy) return;

        const droppedFiles = Array.from(event.dataTransfer.files);
        if (droppedFiles.length !== 1) {
            setClientErrors((current) => ({
                ...current,
                image: 'Drop one project image at a time.',
            }));
            return;
        }

        const image = droppedFiles[0];
        if (!selectImage(image)) return;

        try {
            const transfer = new DataTransfer();
            transfer.items.add(image);
            if (imageInputRef.current) imageInputRef.current.files = transfer.files;
        } catch {
            updateSelectedImage(null);
            setClientErrors((current) => ({
                ...current,
                image: 'This browser could not attach the dropped image. Use Browse instead.',
            }));
        }
    };

    const addTags = (incomingTags: string[]) => {
        const nextTags = [...tags];
        const seen = new Set(nextTags.map((tag) => tag.toLocaleLowerCase('en-US')));
        let reachedLimit = false;

        for (const rawTag of incomingTags) {
            const nextTag = rawTag.trim();
            const key = nextTag.toLocaleLowerCase('en-US');
            if (!nextTag || seen.has(key)) continue;

            if (nextTags.length >= MAX_PROJECT_TAGS) {
                reachedLimit = true;
                break;
            }

            seen.add(key);
            nextTags.push(nextTag);
        }

        setTags(nextTags);
        if (reachedLimit) {
            setClientErrors((current) => ({
                ...current,
                tags: `Use no more than ${MAX_PROJECT_TAGS} tags.`,
            }));
        } else {
            clearFieldError('tags');
        }
    };

    const commitTagDraft = () => {
        const nextTag = tagDraft.trim();
        if (!nextTag) return;
        addTags([nextTag]);
        setTagDraft('');
    };

    const handleTagChange = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        clearFieldError('tags');

        if (!value.includes(',')) {
            setTagDraft(value);
            return;
        }

        const parts = value.split(',');
        addTags(parts.slice(0, -1));
        setTagDraft(parts.at(-1) ?? '');
    };

    const handleTagKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            commitTagDraft();
            return;
        }

        if (event.key === 'Tab' && tagDraft.trim()) {
            commitTagDraft();
            return;
        }

        if (event.key === 'Backspace' && !tagDraft && tags.length > 0) {
            setTags((current) => current.slice(0, -1));
            clearFieldError('tags');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags((current) => current.filter((tag) => tag !== tagToRemove));
        clearFieldError('tags');
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        if (bypassValidationRef.current) {
            bypassValidationRef.current = false;
            return;
        }

        event.preventDefault();
        if (validationRunningRef.current) return;

        const form = event.currentTarget;
        validationRunningRef.current = true;
        setIsValidating(true);

        try {
            const result = await validateProjectFormData(new FormData(form), {
                hasExistingImage: project?.hasImage ?? false,
            });

            if (!result.success) {
                setClientErrors(result.fieldErrors);
                setTouchedFields(new Set());
                const firstInvalidField = Object.keys(result.fieldErrors)[0];
                if (firstInvalidField) {
                    const visibleField = form.querySelector<HTMLElement>(
                        `[data-project-field="${firstInvalidField}"]`,
                    );
                    const namedField = form.querySelector<HTMLElement>(`[name="${firstInvalidField}"]`);
                    (visibleField ?? namedField)?.focus();
                }
                return;
            }

            setClientErrors({});
            bypassValidationRef.current = true;
            form.requestSubmit();
        } finally {
            validationRunningRef.current = false;
            setIsValidating(false);
        }
    };

    const renderError = (field: ProjectField) => {
        const error = getFieldError(field);
        return error ? (
            <p id={`project-${field}-error`} className="mt-1.5 text-xs leading-relaxed text-red-300/85">
                {error}
            </p>
        ) : null;
    };

    const previewUrl = imagePreviewUrl ?? project?.imageUrl ?? null;

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby="project-modal-title"
            className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-transparent p-0 text-left backdrop:bg-transparent"
        >
            <div
                onMouseDown={(event) => {
                    if (event.target === event.currentTarget) animateClose();
                }}
                className={`flex h-full w-full items-center justify-center bg-black/82 p-3 transition-opacity duration-200 ease-out sm:p-6 motion-reduce:transition-none ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            >
                <div
                    onMouseDown={(event) => event.stopPropagation()}
                    className={`flex h-[94dvh] max-h-[58rem] w-full max-w-6xl min-w-0 flex-col overflow-hidden rounded-lg border border-white/[0.1] bg-[#090a0d] shadow-[0_32px_100px_rgba(0,0,0,0.72)] transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.985] opacity-0'}`}
                >
                    <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.08] px-4 py-4 sm:px-6 sm:py-5">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.11em] text-[var(--signal)]/72">
                                <FolderKanban aria-hidden="true" size={14} strokeWidth={1.8} />
                                <span>{mode === 'create' ? 'New project record' : 'Project record'}</span>
                            </div>
                            <h2
                                id="project-modal-title"
                                className="mt-1.5 truncate font-display text-xl font-extrabold tracking-normal text-[var(--text)] sm:text-2xl"
                            >
                                {mode === 'create' ? 'Add project' : 'Edit project'}
                            </h2>
                            <p className="mt-1 hidden text-xs text-[var(--muted)]/44 sm:block">
                                {mode === 'create'
                                    ? 'Build the record first, then decide when it is ready for the portfolio.'
                                    : `Editing ${project?.title ?? 'project details'}`}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => animateClose()}
                            disabled={busy}
                            aria-label="Close project editor"
                            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] text-[var(--muted)]/62 transition-colors duration-200 hover:border-white/[0.16] hover:bg-white/[0.045] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
                        >
                            <X aria-hidden="true" size={18} strokeWidth={1.8} />
                        </button>
                    </header>

                    <form
                        action={formAction}
                        onSubmit={handleSubmit}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        <fieldset
                            disabled={isPending}
                            className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7"
                        >
                            <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(19rem,0.92fr)] lg:gap-10">
                                <section aria-labelledby="project-details-heading" className="min-w-0">
                                    <div className="mb-6 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                                        <span aria-hidden="true" className="font-display text-xl font-extrabold tabular-nums text-[var(--signal)]/58">
                                            01
                                        </span>
                                        <div className="min-w-0 border-b border-white/[0.07] pb-3">
                                            <h3
                                                id="project-details-heading"
                                                className="text-sm font-extrabold tracking-normal text-[var(--text)]"
                                            >
                                                Project details
                                            </h3>
                                            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]/48">
                                                Core content and portfolio ordering.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <label className="block min-w-0 sm:col-span-2">
                                            <span className={LABEL_CLASS}>Title</span>
                                            <input
                                                data-initial-focus
                                                name="title"
                                                value={title}
                                                onChange={handleTitleChange}
                                                required
                                                maxLength={120}
                                                aria-invalid={Boolean(getFieldError('title'))}
                                                aria-describedby={getFieldError('title') ? 'project-title-error' : undefined}
                                                className={`${FIELD_CLASS} mt-2`}
                                            />
                                            {renderError('title')}
                                        </label>

                                        <label className="block min-w-0 sm:col-span-2">
                                            <span className={LABEL_CLASS}>Slug</span>
                                            <input
                                                name="slug"
                                                value={slug}
                                                onChange={handleSlugChange}
                                                required
                                                maxLength={120}
                                                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                                                spellCheck={false}
                                                aria-invalid={Boolean(getFieldError('slug'))}
                                                aria-describedby={getFieldError('slug') ? 'project-slug-error' : undefined}
                                                className={`${FIELD_CLASS} mt-2 font-mono`}
                                            />
                                            {renderError('slug')}
                                        </label>

                                        <label className="block min-w-0">
                                            <span className={LABEL_CLASS}>Category</span>
                                            <input
                                                name="category"
                                                defaultValue={project?.category ?? ''}
                                                onInput={() => clearFieldError('category')}
                                                required
                                                maxLength={120}
                                                aria-invalid={Boolean(getFieldError('category'))}
                                                aria-describedby={getFieldError('category') ? 'project-category-error' : undefined}
                                                className={`${FIELD_CLASS} mt-2`}
                                            />
                                            {renderError('category')}
                                        </label>

                                        <label className="block min-w-0">
                                            <span className={LABEL_CLASS}>Display order</span>
                                            <input
                                                name="displayOrder"
                                                type="number"
                                                defaultValue={project?.displayOrder ?? 0}
                                                onInput={() => clearFieldError('displayOrder')}
                                                required
                                                min={0}
                                                step={1}
                                                aria-invalid={Boolean(getFieldError('displayOrder'))}
                                                aria-describedby={getFieldError('displayOrder') ? 'project-displayOrder-error' : undefined}
                                                className={`${FIELD_CLASS} mt-2 tabular-nums`}
                                            />
                                            {renderError('displayOrder')}
                                        </label>
                                    </div>

                                    <label className="mt-4 block">
                                        <span className={LABEL_CLASS}>Description</span>
                                        <textarea
                                            name="description"
                                            defaultValue={project?.description ?? ''}
                                            onInput={() => clearFieldError('description')}
                                            required
                                            maxLength={2000}
                                            rows={6}
                                            aria-invalid={Boolean(getFieldError('description'))}
                                            aria-describedby={getFieldError('description') ? 'project-description-error' : undefined}
                                            className={`${FIELD_CLASS} mt-2 resize-y py-3 leading-relaxed`}
                                        />
                                        {renderError('description')}
                                    </label>

                                    <div className="mt-4">
                                        <label htmlFor="project-tags" className={LABEL_CLASS}>Tags</label>
                                        <div
                                            className={`mt-2 min-h-12 rounded-lg border bg-[#050608] px-2.5 py-2 transition-[border-color,background-color,box-shadow] duration-200 focus-within:bg-[#07080b] focus-within:ring-2 focus-within:ring-[var(--signal)]/12 motion-reduce:transition-none ${getFieldError('tags') ? 'border-red-300/35' : 'border-white/[0.09] focus-within:border-[var(--signal)]/45'}`}
                                        >
                                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                                {tags.map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-md border border-[var(--signal)]/16 bg-[var(--signal)]/[0.07] pl-2 pr-1 text-[11px] font-bold text-[var(--text)]"
                                                    >
                                                        <Tag aria-hidden="true" size={11} strokeWidth={1.9} className="shrink-0 text-[var(--signal)]/72" />
                                                        <span className="truncate">{tag}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeTag(tag)}
                                                            disabled={busy}
                                                            aria-label={`Remove ${tag} tag`}
                                                            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-[var(--muted)]/52 transition-colors hover:bg-white/[0.06] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/55 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
                                                        >
                                                            <X aria-hidden="true" size={12} strokeWidth={2} />
                                                        </button>
                                                    </span>
                                                ))}
                                                <input
                                                    id="project-tags"
                                                    data-project-field="tags"
                                                    value={tagDraft}
                                                    onChange={handleTagChange}
                                                    onKeyDown={handleTagKeyDown}
                                                    onBlur={commitTagDraft}
                                                    placeholder={tags.length === 0 ? 'Type a tag, then add a comma' : 'Add tag'}
                                                    aria-invalid={Boolean(getFieldError('tags'))}
                                                    aria-describedby={getFieldError('tags') ? 'project-tags-error' : 'project-tags-help'}
                                                    className="min-h-7 min-w-32 flex-1 bg-transparent px-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]/30"
                                                />
                                                <input type="hidden" name="tags" value={tagsForSubmission} />
                                            </div>
                                        </div>
                                        <div className="mt-1.5 flex items-start justify-between gap-3 text-xs text-[var(--muted)]/43">
                                            <p id="project-tags-help">Comma or Enter creates a tag.</p>
                                            <span className="shrink-0 tabular-nums">{tags.length}/{MAX_PROJECT_TAGS}</span>
                                        </div>
                                        {renderError('tags')}
                                    </div>
                                </section>

                                <section
                                    aria-labelledby="project-media-heading"
                                    className="min-w-0 border-t border-white/[0.08] pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0"
                                >
                                    <div className="mb-6 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                                        <span aria-hidden="true" className="font-display text-xl font-extrabold tabular-nums text-[var(--signal)]/58">
                                            02
                                        </span>
                                        <div className="min-w-0 border-b border-white/[0.07] pb-3">
                                            <h3
                                                id="project-media-heading"
                                                className="text-sm font-extrabold tracking-normal text-[var(--text)]"
                                            >
                                                Media and publishing
                                            </h3>
                                            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]/48">
                                                Preview image and public destination.
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        onDragEnter={handleDragEnter}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        className={`relative overflow-hidden rounded-lg border border-dashed transition-[border-color,background-color] duration-200 motion-reduce:transition-none ${isDragging ? 'border-[var(--signal)]/65 bg-[var(--signal)]/[0.08]' : getFieldError('image') ? 'border-red-300/35 bg-red-400/[0.025]' : 'border-white/[0.13] bg-black/25 hover:border-white/[0.22]'}`}
                                    >
                                        <input
                                            ref={imageInputRef}
                                            id="project-image"
                                            name="image"
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={handleImageChange}
                                            tabIndex={-1}
                                            aria-label="Project image"
                                            aria-invalid={Boolean(getFieldError('image'))}
                                            aria-describedby={getFieldError('image') ? 'project-image-error' : 'project-image-help'}
                                            className="sr-only"
                                        />

                                        {previewUrl ? (
                                            <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#050507]">
                                                <Image
                                                    src={previewUrl}
                                                    alt="Project media preview"
                                                    fill
                                                    unoptimized={Boolean(imagePreviewUrl)}
                                                    sizes="(max-width: 1023px) calc(100vw - 3rem), 380px"
                                                    className="object-contain p-3"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex min-h-48 flex-col items-center justify-center px-5 py-8 text-center">
                                                <span className="inline-flex size-11 items-center justify-center rounded-lg border border-[var(--signal)]/16 bg-[var(--signal)]/[0.06] text-[var(--signal)]/75">
                                                    <ImagePlus aria-hidden="true" size={20} strokeWidth={1.6} />
                                                </span>
                                                <p className="mt-3 text-sm font-extrabold text-[var(--text)]">
                                                    Drop a project image here
                                                </p>
                                                <p className="mt-1 text-xs text-[var(--muted)]/46">
                                                    PNG, JPEG, or WebP up to 5 MiB
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex min-w-0 items-center justify-between gap-3 border-t border-white/[0.07] px-3 py-3">
                                            <div className="flex min-w-0 items-center gap-2.5">
                                                <FileImage aria-hidden="true" size={16} strokeWidth={1.7} className="shrink-0 text-[var(--signal)]/62" />
                                                <div className="min-w-0">
                                                    <p className="truncate text-xs font-bold text-[var(--muted)]/66">
                                                        {selectedImage?.name ?? (project?.hasImage ? 'Stored project image' : 'No image selected')}
                                                    </p>
                                                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--muted)]/38">
                                                        {selectedImage
                                                            ? `${formatFileSize(selectedImage.size)} / New selection`
                                                            : previewUrl
                                                                ? 'Current portfolio media'
                                                                : 'PNG, JPEG, or WebP'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1.5">
                                                {selectedImage ? (
                                                    <button
                                                        type="button"
                                                        onClick={clearSelectedImage}
                                                        disabled={busy}
                                                        aria-label="Remove selected image"
                                                        className="inline-flex size-9 items-center justify-center rounded-lg text-[var(--muted)]/55 transition-colors hover:bg-white/[0.05] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/55 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
                                                    >
                                                        <X aria-hidden="true" size={15} strokeWidth={1.9} />
                                                    </button>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    data-project-field="image"
                                                    onClick={() => imageInputRef.current?.click()}
                                                    disabled={busy}
                                                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.035] px-3 text-xs font-bold text-[var(--text)] transition-[border-color,background-color] hover:border-[var(--signal)]/28 hover:bg-[var(--signal)]/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/55 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
                                                >
                                                    <UploadCloud aria-hidden="true" size={14} strokeWidth={1.8} />
                                                    {previewUrl ? 'Replace' : 'Browse'}
                                                </button>
                                            </div>
                                        </div>

                                        <div
                                            aria-hidden="true"
                                            className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-[#120a18]/94 text-[var(--signal)] transition-opacity duration-150 motion-reduce:transition-none ${isDragging ? 'opacity-100' : 'opacity-0'}`}
                                        >
                                            <UploadCloud size={27} strokeWidth={1.6} />
                                            <span className="mt-2 text-sm font-extrabold">Drop image to attach</span>
                                        </div>
                                    </div>
                                    <p id="project-image-help" className="mt-1.5 text-xs text-[var(--muted)]/43">
                                        The image stays local until the project is saved.
                                    </p>
                                    {renderError('image')}

                                    <label className="mt-4 block">
                                        <span className={LABEL_CLASS}>Image alternative text</span>
                                        <input
                                            name="imageAlt"
                                            defaultValue={project?.imageAlt ?? ''}
                                            onInput={() => clearFieldError('imageAlt')}
                                            maxLength={255}
                                            aria-invalid={Boolean(getFieldError('imageAlt'))}
                                            aria-describedby={getFieldError('imageAlt') ? 'project-imageAlt-error' : undefined}
                                            className={`${FIELD_CLASS} mt-2`}
                                        />
                                        {renderError('imageAlt')}
                                    </label>

                                    <label className="mt-4 block">
                                        <span className={`${LABEL_CLASS} inline-flex items-center gap-1.5`}>
                                            <Link2 aria-hidden="true" size={12} strokeWidth={1.9} />
                                            GitHub URL
                                        </span>
                                        <input
                                            name="githubUrl"
                                            type="url"
                                            inputMode="url"
                                            defaultValue={project?.githubUrl ?? ''}
                                            onInput={() => clearFieldError('githubUrl')}
                                            placeholder="https://github.com/username/repository"
                                            aria-invalid={Boolean(getFieldError('githubUrl'))}
                                            aria-describedby={getFieldError('githubUrl') ? 'project-githubUrl-error' : undefined}
                                            className={`${FIELD_CLASS} mt-2`}
                                        />
                                        {renderError('githubUrl')}
                                    </label>

                                    <label className="mt-4 flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-lg border border-white/[0.09] bg-white/[0.025] px-3.5 py-3 transition-colors hover:bg-white/[0.04] motion-reduce:transition-none">
                                        <span className="min-w-0">
                                            <span className="block text-sm font-bold text-[var(--text)]">Published</span>
                                            <span className="mt-0.5 block text-xs leading-relaxed text-[var(--muted)]/46">
                                                Visible in the public portfolio.
                                            </span>
                                        </span>
                                        <span className="relative shrink-0">
                                            <input
                                                name="isPublished"
                                                type="checkbox"
                                                value="true"
                                                defaultChecked={project?.isPublished ?? false}
                                                onChange={() => clearFieldError('isPublished')}
                                                className="peer sr-only"
                                            />
                                            <span className="block h-6 w-11 rounded-full border border-white/[0.1] bg-white/[0.08] transition-colors duration-200 after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-[var(--muted)]/65 after:transition-transform after:duration-200 peer-checked:border-[var(--signal)]/35 peer-checked:bg-[var(--signal)]/22 peer-checked:after:translate-x-5 peer-checked:after:bg-[var(--signal)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--signal)]/60 motion-reduce:transition-none motion-reduce:after:transition-none" />
                                        </span>
                                    </label>
                                </section>
                            </div>
                        </fieldset>

                        <footer className="shrink-0 border-t border-white/[0.08] bg-black/35 px-4 py-3.5 sm:px-6 sm:py-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div aria-live="polite" className="min-h-5 min-w-0 text-sm">
                                    {!isPending && state.status === 'error' ? (
                                        <p className="text-red-300/85">{state.message}</p>
                                    ) : (
                                        <p className="text-[var(--muted)]/42">
                                            {mode === 'create' ? 'Create as a draft or publish when ready.' : 'Changes apply after saving.'}
                                        </p>
                                    )}
                                </div>
                                <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={() => animateClose()}
                                        disabled={busy}
                                        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/[0.09] px-4 text-sm font-bold text-[var(--muted)]/68 transition-colors duration-200 hover:bg-white/[0.045] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={busy}
                                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--signal)]/28 bg-[var(--signal)]/14 px-5 text-sm font-bold text-[var(--signal)] transition-[border-color,background-color] duration-200 hover:border-[var(--signal)]/48 hover:bg-[var(--signal)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none"
                                    >
                                        {busy ? (
                                            <LoaderCircle aria-hidden="true" size={17} className="animate-spin motion-reduce:animate-none" />
                                        ) : (
                                            <Save aria-hidden="true" size={17} strokeWidth={1.9} />
                                        )}
                                        {isValidating
                                            ? 'Checking...'
                                            : isPending
                                                ? 'Saving...'
                                                : mode === 'create'
                                                    ? 'Create project'
                                                    : 'Save changes'}
                                    </button>
                                </div>
                            </div>
                        </footer>
                    </form>
                </div>
            </div>
        </dialog>
    );
}
