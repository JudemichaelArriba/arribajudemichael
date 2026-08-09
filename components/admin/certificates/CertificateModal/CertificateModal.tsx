'use client';

import {
    Award,
    FileText,
    LoaderCircle,
    Save,
    UploadCloud,
    X,
} from 'lucide-react';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    useTransition,
    type DragEvent,
    type FormEvent,
    type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

import CertificatePdfPreview from '@/components/ui/CertificatePdfPreview/CertificatePdfPreview';
import {
    createCertificate,
    updateCertificate,
} from '@/features/admin/certificates/actions';
import type {
    AdminCertificateDto,
    CertificateActionState,
    CertificateField,
    CertificateFieldErrors,
} from '@/features/admin/certificates/types';
import {
    CERTIFICATE_FILES_BUCKET,
    CERTIFICATE_PDF_MIME_TYPE,
    getCertificatePdfPath,
    slugifyCertificateTitle,
    validateCertificateFormData,
    validateCertificatePdf,
} from '@/features/admin/certificates/validation';
import { createClient } from '@/lib/supabase/client';

interface CertificateModalProps {
    mode: 'create' | 'edit';
    certificate?: AdminCertificateDto;
    onClose: () => void;
    onSuccess: (message: string) => void;
}

const CLOSE_ANIMATION_MS = 220;
const FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

const FIELD_CLASS =
    'min-h-11 w-full rounded-lg border border-white/[0.09] bg-black/30 px-3.5 text-sm text-[var(--text)] outline-none transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-[var(--muted)]/30 hover:border-white/[0.14] focus:border-[var(--signal)]/40 focus:bg-black/45 focus:ring-2 focus:ring-[var(--signal)]/12 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none';
const LABEL_CLASS =
    'font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/62';

const INITIAL_ACTION_STATE: CertificateActionState = {
    status: 'idle',
    message: '',
    attempt: 0,
    fieldErrors: {},
};

function getErrorCode(error: unknown): string {
    if (typeof error !== 'object' || error === null || !('code' in error)) return 'unknown';
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : 'unknown';
}

function isStorageObjectMissing(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;

    const status = 'status' in error ? (error as { status?: unknown }).status : undefined;
    const statusCode = 'statusCode' in error
        ? (error as { statusCode?: unknown }).statusCode
        : undefined;

    return status === 404 || statusCode === '404';
}

function formatFileSize(bytes: number): string {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

export default function CertificateModal({
    mode,
    certificate,
    onClose,
    onSuccess,
}: CertificateModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const closeTimerRef = useRef<number | null>(null);
    const openingFrameRef = useRef<number | null>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const dragDepthRef = useRef(0);
    const slugEditedRef = useRef(mode === 'edit');
    const [certificateId] = useState(() => certificate?.id ?? crypto.randomUUID());
    const [isVisible, setIsVisible] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [title, setTitle] = useState(certificate?.title ?? '');
    const [slug, setSlug] = useState(certificate?.slug ?? '');
    const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
    const [clientErrors, setClientErrors] = useState<CertificateFieldErrors>({});
    const [actionState, setActionState] = useState<CertificateActionState>(INITIAL_ACTION_STATE);
    const [isValidating, setIsValidating] = useState(false);
    const [isPending, startTransition] = useTransition();
    const busy = isValidating || isPending;

    const finishClose = useCallback((afterClose: () => void) => {
        if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
        setIsVisible(false);

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            afterClose();
            return;
        }

        closeTimerRef.current = window.setTimeout(afterClose, CLOSE_ANIMATION_MS);
    }, []);

    const handleClose = useCallback(() => {
        if (busy) return;
        finishClose(onClose);
    }, [busy, finishClose, onClose]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        previousFocusRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        const previousOverflow = document.body.style.overflow;

        dialog.showModal();
        document.body.style.overflow = 'hidden';
        openingFrameRef.current = window.requestAnimationFrame(() => {
            setIsVisible(true);
            titleInputRef.current?.focus();
        });

        return () => {
            if (openingFrameRef.current) window.cancelAnimationFrame(openingFrameRef.current);
            if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
            document.body.style.overflow = previousOverflow;
            if (dialog.open) dialog.close();
            previousFocusRef.current?.focus();
        };
    }, []);

    const clearFieldError = (field: CertificateField) => {
        setClientErrors((current) => {
            if (!current[field]) return current;
            const next = { ...current };
            delete next[field];
            return next;
        });
        setActionState((current) => {
            if (!current.fieldErrors[field]) return current;
            const nextErrors = { ...current.fieldErrors };
            delete nextErrors[field];
            return { ...current, fieldErrors: nextErrors };
        });
    };

    const getFieldError = (field: CertificateField) =>
        clientErrors[field] ?? actionState.fieldErrors[field];

    const renderError = (field: CertificateField) => {
        const error = getFieldError(field);
        return error ? (
            <p
                id={`certificate-${field}-error`}
                className="mt-1.5 text-xs leading-relaxed text-red-300/85"
            >
                {error}
            </p>
        ) : null;
    };

    const handleTitleChange = (value: string) => {
        setTitle(value);
        clearFieldError('title');
        if (!slugEditedRef.current) setSlug(slugifyCertificateTitle(value));
    };

    const handleSlugChange = (value: string) => {
        slugEditedRef.current = true;
        setSlug(value);
        clearFieldError('slug');
    };

    const choosePdf = async (file: File | null) => {
        if (!file) return;

        setIsValidating(true);
        const error = await validateCertificatePdf(file);
        setIsValidating(false);

        if (error) {
            setSelectedPdf(null);
            setClientErrors((current) => ({ ...current, pdf: error }));
            if (pdfInputRef.current) pdfInputRef.current.value = '';
            return;
        }

        setSelectedPdf(file);
        clearFieldError('pdf');
    };

    const clearSelectedPdf = () => {
        setSelectedPdf(null);
        if (pdfInputRef.current) pdfInputRef.current.value = '';
        clearFieldError('pdf');
    };

    const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        dragDepthRef.current += 1;
        setIsDragging(true);
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
        void choosePdf(event.dataTransfer.files.item(0));
    };

    const focusFirstError = (errors: CertificateFieldErrors) => {
        const firstField = Object.keys(errors)[0];
        if (!firstField) return;

        window.requestAnimationFrame(() => {
            formRef.current
                ?.querySelector<HTMLElement>(`[data-certificate-field="${firstField}"]`)
                ?.focus();
        });
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (busy) return;

        const formData = new FormData(event.currentTarget);
        formData.set('pdfChanged', selectedPdf ? 'true' : 'false');
        setIsValidating(true);

        const pdfError = selectedPdf ? await validateCertificatePdf(selectedPdf) : null;
        const validation = validateCertificateFormData(formData, {
            hasPdf: Boolean(selectedPdf || certificate?.hasPdf),
        });
        const nextClientErrors: CertificateFieldErrors = validation.success
            ? {}
            : { ...validation.fieldErrors };
        if (pdfError) nextClientErrors.pdf = pdfError;

        setIsValidating(false);
        if (Object.keys(nextClientErrors).length > 0) {
            setClientErrors(nextClientErrors);
            focusFirstError(nextClientErrors);
            return;
        }

        setClientErrors({});
        setActionState((current) => ({ ...current, status: 'idle', message: '', fieldErrors: {} }));

        startTransition(async () => {
            try {
                if (selectedPdf) {
                    const supabase = createClient();
                    const storage = supabase.storage.from(CERTIFICATE_FILES_BUCKET);
                    const path = getCertificatePdfPath(certificateId);
                    const uploadOptions = {
                        cacheControl: '3600',
                        contentType: CERTIFICATE_PDF_MIME_TYPE,
                    };
                    let result = mode === 'edit' && certificate?.hasPdf
                        ? await storage.update(path, selectedPdf, uploadOptions)
                        : await storage.upload(path, selectedPdf, {
                            ...uploadOptions,
                            upsert: false,
                        });

                    if (
                        result.error &&
                        mode === 'edit' &&
                        certificate?.hasPdf &&
                        isStorageObjectMissing(result.error)
                    ) {
                        result = await storage.upload(path, selectedPdf, {
                            ...uploadOptions,
                            upsert: false,
                        });
                    }

                    if (result.error) {
                        console.error('[certificates/upload] Browser upload failed.', {
                            code: getErrorCode(result.error),
                        });
                        const fieldErrors = { pdf: 'The PDF could not be uploaded. Please try again.' };
                        setClientErrors(fieldErrors);
                        focusFirstError(fieldErrors);
                        return;
                    }
                }

                const previousState = {
                    ...INITIAL_ACTION_STATE,
                    attempt: actionState.attempt,
                };
                const result = mode === 'create'
                    ? await createCertificate(certificateId, previousState, formData)
                    : await updateCertificate(certificateId, previousState, formData);

                setActionState(result);
                if (result.status === 'success') {
                    finishClose(() => onSuccess(result.message));
                    return;
                }

                focusFirstError(result.fieldErrors);
            } catch (error) {
                console.error('[certificates/save] Certificate request failed.', {
                    code: getErrorCode(error),
                });
                setActionState((current) => ({
                    status: 'error',
                    message: 'Unable to save the certificate right now. Please try again.',
                    attempt: current.attempt + 1,
                    fieldErrors: {},
                }));
            }
        });
    };

    const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDialogElement>) => {
        if (event.key !== 'Tab') return;

        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
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

    const previewSource = selectedPdf ?? certificate?.pdfUrl ?? null;

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby="certificate-modal-title"
            onCancel={(event) => {
                event.preventDefault();
                handleClose();
            }}
            onKeyDown={handleDialogKeyDown}
            className="fixed inset-0 z-[90] m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-transparent p-0 text-[var(--text)] backdrop:bg-transparent"
        >
            <div
                className={`flex h-full w-full items-center justify-center bg-black/78 p-3 backdrop-blur-sm transition-opacity duration-200 sm:p-5 motion-reduce:transition-none ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                onMouseDown={(event) => {
                    if (event.target === event.currentTarget) handleClose();
                }}
            >
                <div
                    className={`flex h-[calc(100dvh-1.5rem)] max-h-[54rem] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-white/[0.1] bg-[#08070a]/98 shadow-[0_28px_100px_rgba(0,0,0,0.72),0_0_45px_rgba(195,109,252,0.06)] transition-[opacity,transform] duration-200 ease-out sm:h-[min(92dvh,54rem)] motion-reduce:transition-none ${isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.985] opacity-0'}`}
                    onMouseDown={(event) => event.stopPropagation()}
                >
                    <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.08] px-4 py-4 sm:px-6 sm:py-5">
                        <div className="flex min-w-0 items-start gap-3.5">
                            <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--signal)]/18 bg-[var(--signal)]/[0.07] text-[var(--signal)]">
                                <Award aria-hidden="true" size={19} strokeWidth={1.7} />
                            </span>
                            <div className="min-w-0">
                                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--signal)]/72">
                                    Content / Certificates
                                </p>
                                <h2
                                    id="certificate-modal-title"
                                    className="mt-1 text-xl font-extrabold tracking-normal text-[var(--text)] sm:text-2xl"
                                >
                                    {mode === 'create' ? 'Add certificate' : 'Edit certificate'}
                                </h2>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={busy}
                            aria-label="Close certificate editor"
                            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] text-[var(--muted)]/60 transition-colors hover:border-white/[0.16] hover:bg-white/[0.045] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
                        >
                            <X aria-hidden="true" size={18} strokeWidth={1.8} />
                        </button>
                    </header>

                    <form ref={formRef} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <fieldset
                            disabled={busy}
                            className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
                        >
                            <div className="grid gap-7 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.82fr)] lg:gap-8">
                                <section aria-labelledby="certificate-details-heading" className="min-w-0">
                                    <div className="mb-5 flex items-center gap-3">
                                        <div>
                                            <h3 id="certificate-details-heading" className="text-sm font-extrabold text-[var(--text)]">
                                                Credential details
                                            </h3>
                                            <p className="mt-1 text-xs text-[var(--muted)]/48">
                                                Public title, issuer, and ordering.
                                            </p>
                                        </div>
                                        <span aria-hidden="true" className="h-px flex-1 bg-white/[0.07]" />
                                    </div>

                                    <label className="block">
                                        <span className={LABEL_CLASS}>Title</span>
                                        <input
                                            ref={titleInputRef}
                                            data-certificate-field="title"
                                            name="title"
                                            value={title}
                                            onChange={(event) => handleTitleChange(event.target.value)}
                                            required
                                            maxLength={200}
                                            autoComplete="off"
                                            aria-invalid={Boolean(getFieldError('title'))}
                                            aria-describedby={getFieldError('title') ? 'certificate-title-error' : undefined}
                                            className={`${FIELD_CLASS} mt-2`}
                                        />
                                        {renderError('title')}
                                    </label>

                                    <label className="mt-4 block">
                                        <span className={LABEL_CLASS}>Issuer</span>
                                        <input
                                            data-certificate-field="issuer"
                                            name="issuer"
                                            defaultValue={certificate?.issuer ?? ''}
                                            onInput={() => clearFieldError('issuer')}
                                            required
                                            maxLength={200}
                                            autoComplete="organization"
                                            aria-invalid={Boolean(getFieldError('issuer'))}
                                            aria-describedby={getFieldError('issuer') ? 'certificate-issuer-error' : undefined}
                                            className={`${FIELD_CLASS} mt-2`}
                                        />
                                        {renderError('issuer')}
                                    </label>

                                    <label className="mt-4 block">
                                        <span className={LABEL_CLASS}>Slug</span>
                                        <input
                                            data-certificate-field="slug"
                                            name="slug"
                                            value={slug}
                                            onChange={(event) => handleSlugChange(event.target.value)}
                                            required
                                            maxLength={200}
                                            spellCheck={false}
                                            autoCapitalize="none"
                                            aria-invalid={Boolean(getFieldError('slug'))}
                                            aria-describedby={getFieldError('slug') ? 'certificate-slug-error' : 'certificate-slug-help'}
                                            className={`${FIELD_CLASS} mt-2 font-mono text-xs`}
                                        />
                                        <p id="certificate-slug-help" className="mt-1.5 text-xs text-[var(--muted)]/43">
                                            Lowercase letters, numbers, and single hyphens.
                                        </p>
                                        {renderError('slug')}
                                    </label>

                                    <label className="mt-4 block max-w-44">
                                        <span className={LABEL_CLASS}>Display order</span>
                                        <input
                                            data-certificate-field="displayOrder"
                                            name="displayOrder"
                                            type="number"
                                            min={0}
                                            step={1}
                                            defaultValue={certificate?.displayOrder ?? 0}
                                            onInput={() => clearFieldError('displayOrder')}
                                            required
                                            inputMode="numeric"
                                            aria-invalid={Boolean(getFieldError('displayOrder'))}
                                            aria-describedby={getFieldError('displayOrder') ? 'certificate-displayOrder-error' : undefined}
                                            className={`${FIELD_CLASS} mt-2 font-mono tabular-nums`}
                                        />
                                        {renderError('displayOrder')}
                                    </label>
                                </section>

                                <section
                                    aria-labelledby="certificate-pdf-heading"
                                    className="min-w-0 border-t border-white/[0.08] pt-7 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
                                >
                                    <div className="mb-5 flex items-center gap-3">
                                        <div>
                                            <h3 id="certificate-pdf-heading" className="text-sm font-extrabold text-[var(--text)]">
                                                PDF and publishing
                                            </h3>
                                            <p className="mt-1 text-xs text-[var(--muted)]/48">
                                                One source file for preview and download.
                                            </p>
                                        </div>
                                        <span aria-hidden="true" className="h-px flex-1 bg-white/[0.07]" />
                                    </div>

                                    <div
                                        data-certificate-field="pdf"
                                        tabIndex={-1}
                                        onDragEnter={handleDragEnter}
                                        onDragOver={(event) => event.preventDefault()}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        className={`relative overflow-hidden rounded-lg border border-dashed outline-none transition-[border-color,background-color] duration-200 focus-visible:ring-2 focus-visible:ring-[var(--signal)]/55 motion-reduce:transition-none ${isDragging ? 'border-[var(--signal)]/65 bg-[var(--signal)]/[0.08]' : getFieldError('pdf') ? 'border-red-300/35 bg-red-400/[0.025]' : 'border-white/[0.13] bg-black/25 hover:border-white/[0.22]'}`}
                                    >
                                        <input
                                            ref={pdfInputRef}
                                            type="file"
                                            accept="application/pdf,.pdf"
                                            tabIndex={-1}
                                            aria-label="Certificate PDF"
                                            onChange={(event) => void choosePdf(event.target.files?.item(0) ?? null)}
                                            className="sr-only"
                                        />

                                        {previewSource ? (
                                            <div className="aspect-[1.3/1] w-full border-b border-white/[0.07]">
                                                <CertificatePdfPreview
                                                    source={previewSource}
                                                    label={`${title || 'Certificate'} first-page preview`}
                                                    eager
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex min-h-52 flex-col items-center justify-center px-5 py-8 text-center">
                                                <span className="inline-flex size-11 items-center justify-center rounded-lg border border-[var(--signal)]/16 bg-[var(--signal)]/[0.06] text-[var(--signal)]/75">
                                                    <FileText aria-hidden="true" size={20} strokeWidth={1.6} />
                                                </span>
                                                <p className="mt-3 text-sm font-extrabold text-[var(--text)]">
                                                    Drop a certificate PDF here
                                                </p>
                                                <p className="mt-1 text-xs text-[var(--muted)]/46">
                                                    PDF only, up to 10 MiB
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex min-w-0 items-center justify-between gap-3 border-t border-white/[0.07] px-3 py-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-xs font-bold text-[var(--muted)]/66">
                                                    {selectedPdf?.name ?? (certificate?.hasPdf ? 'Stored certificate PDF' : 'No PDF selected')}
                                                </p>
                                                {selectedPdf ? (
                                                    <p className="mt-0.5 font-mono text-[9px] uppercase text-[var(--muted)]/38">
                                                        {formatFileSize(selectedPdf.size)}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1.5">
                                                {selectedPdf ? (
                                                    <button
                                                        type="button"
                                                        onClick={clearSelectedPdf}
                                                        disabled={busy}
                                                        aria-label="Remove selected PDF"
                                                        className="inline-flex size-9 items-center justify-center rounded-lg text-[var(--muted)]/55 transition-colors hover:bg-white/[0.05] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/55 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
                                                    >
                                                        <X aria-hidden="true" size={15} strokeWidth={1.9} />
                                                    </button>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    onClick={() => pdfInputRef.current?.click()}
                                                    disabled={busy}
                                                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.035] px-3 text-xs font-bold text-[var(--text)] transition-[border-color,background-color] hover:border-[var(--signal)]/28 hover:bg-[var(--signal)]/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/55 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
                                                >
                                                    <UploadCloud aria-hidden="true" size={14} strokeWidth={1.8} />
                                                    {previewSource ? 'Replace' : 'Browse'}
                                                </button>
                                            </div>
                                        </div>

                                        <div
                                            aria-hidden="true"
                                            className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-[#120a18]/94 text-[var(--signal)] transition-opacity duration-150 motion-reduce:transition-none ${isDragging ? 'opacity-100' : 'opacity-0'}`}
                                        >
                                            <UploadCloud size={27} strokeWidth={1.6} />
                                            <span className="mt-2 text-sm font-extrabold">Drop PDF to attach</span>
                                        </div>
                                    </div>
                                    <p className="mt-1.5 text-xs text-[var(--muted)]/43">
                                        The PDF uploads securely when this certificate is saved.
                                    </p>
                                    {renderError('pdf')}

                                    <label className="mt-4 flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-lg border border-white/[0.09] bg-white/[0.025] px-3.5 py-3 transition-colors hover:bg-white/[0.04] motion-reduce:transition-none">
                                        <span className="min-w-0">
                                            <span className="block text-sm font-bold text-[var(--text)]">Published</span>
                                            <span className="mt-0.5 block text-xs leading-relaxed text-[var(--muted)]/46">
                                                Visible in the public credentials view.
                                            </span>
                                        </span>
                                        <span className="relative shrink-0">
                                            <input
                                                data-certificate-field="isPublished"
                                                name="isPublished"
                                                type="checkbox"
                                                value="true"
                                                defaultChecked={certificate?.isPublished ?? false}
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
                                    {!isPending && actionState.status === 'error' ? (
                                        <p className="text-red-300/85">{actionState.message}</p>
                                    ) : (
                                        <p className="text-[var(--muted)]/42">
                                            {mode === 'create'
                                                ? 'Create as a draft or publish when its PDF is ready.'
                                                : 'Changes apply after saving.'}
                                        </p>
                                    )}
                                </div>
                                <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={handleClose}
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
                                                    ? 'Create certificate'
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
