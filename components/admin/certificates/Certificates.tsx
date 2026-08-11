'use client';

import {
    ArrowUpRight,
    Award,
    FileText,
    ListOrdered,
    Pencil,
    Plus,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
    AdminPageHeader,
    AdminPageStat,
    AdminPageStats,
    ManagementPage,
} from '@/components/admin/layout/ManagementPage';
import { useDialog } from '@/components/dialog/Dialog';
import { useSnackbar } from '@/components/snackbar/Snackbar';
import CertificatePdfPreview from '@/components/ui/CertificatePdfPreview/CertificatePdfPreview';
import { deleteCertificate } from '@/features/admin/certificates/actions';
import type {
    AdminCertificateDto,
    CertificateActionState,
} from '@/features/admin/certificates/types';
import CertificateModal from './CertificateModal/CertificateModal';

interface CertificatesProps {
    certificates: AdminCertificateDto[];
    unavailable?: boolean;
}

interface CertificateRecordProps {
    certificate: AdminCertificateDto;
    index: number;
    onDelete: (certificate: AdminCertificateDto) => void;
    onEdit: (certificate: AdminCertificateDto) => void;
}

type EditorState =
    | { mode: 'create' }
    | { mode: 'edit'; certificate: AdminCertificateDto }
    | null;

const ACTIVE_ACTION_CLASS =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold transition-[color,border-color,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none';

const DELETE_INITIAL_STATE: CertificateActionState = {
    status: 'idle',
    message: '',
    attempt: 0,
    fieldErrors: {},
};

const CERTIFICATE_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

function formatCertificateDate(value: string): string {
    const date = new Date(value);
    return Number.isFinite(date.getTime())
        ? CERTIFICATE_DATE_FORMATTER.format(date)
        : 'Unavailable';
}

function CertificateRecord({
    certificate,
    index,
    onDelete,
    onEdit,
}: CertificateRecordProps) {
    const displayOrder = String(certificate.displayOrder).padStart(2, '0');

    return (
        <li className="group min-w-0 overflow-hidden rounded-lg border border-white/[0.085] bg-[#07080a] transition-[border-color,background-color] duration-200 hover:border-white/[0.13] hover:bg-white/[0.018] motion-reduce:transition-none">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-5 gap-y-2 border-b border-white/[0.07] px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3 font-mono text-[9px] font-bold uppercase tracking-[0.1em]">
                    <span className="text-[var(--muted)]/40">
                        Public order
                    </span>
                    <span className="text-sm font-extrabold tabular-nums tracking-normal text-[var(--signal)]/85">
                        {displayOrder}
                    </span>
                    <span aria-hidden="true" className="h-3 w-px bg-white/10" />
                    <span className="truncate text-[var(--muted)]/32">
                        Record {String(index + 1).padStart(2, '0')}
                    </span>
                </div>

                <span
                    className={`inline-flex min-h-6 shrink-0 items-center gap-1.5 rounded-full border px-2 font-mono text-[9px] font-bold uppercase tracking-[0.08em] ${
                        certificate.isPublished
                            ? 'border-emerald-300/16 bg-emerald-300/[0.045] text-emerald-200/72'
                            : 'border-amber-200/14 bg-amber-200/[0.04] text-amber-100/64'
                    }`}
                >
                    <span
                        aria-hidden="true"
                        className={`size-1.5 rounded-full ${certificate.isPublished ? 'bg-emerald-300/75' : 'bg-amber-200/70'}`}
                    />
                    {certificate.isPublished ? 'Published' : 'Draft'}
                </span>
            </div>

            <div className="grid min-w-0 md:grid-cols-[minmax(16rem,0.4fr)_minmax(0,1fr)] xl:grid-cols-[minmax(19rem,0.36fr)_minmax(0,1fr)]">
                <div className="min-w-0 border-b border-white/[0.07] bg-[#030405] p-3 sm:p-4 md:border-b-0 md:border-r">
                    <div className="aspect-[1.3/1] w-full overflow-hidden rounded-[4px] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.3)]">
                        <CertificatePdfPreview
                            source={certificate.pdfUrl}
                            label={`${certificate.title} first-page preview`}
                        />
                    </div>
                    <div className="mt-3 flex min-w-0 items-center justify-between gap-3 font-mono text-[9px] font-bold uppercase tracking-[0.09em]">
                        <span className="inline-flex min-w-0 items-center gap-1.5 text-[var(--muted)]/42">
                            <FileText aria-hidden="true" size={12} strokeWidth={1.8} className="shrink-0" />
                            <span className="truncate">Certificate PDF</span>
                        </span>
                        <span className={certificate.hasPdf ? 'shrink-0 text-emerald-200/62' : 'shrink-0 text-amber-100/58'}>
                            {certificate.hasPdf ? 'File ready' : 'File pending'}
                        </span>
                    </div>
                </div>

                <article className="flex min-w-0 flex-col px-4 py-5 sm:px-6 sm:py-6 xl:px-7">
                    <div className="flex min-w-0 items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.11em] text-[var(--signal)]/68">
                        <Award aria-hidden="true" size={13} strokeWidth={1.8} className="shrink-0" />
                        Credential record
                    </div>

                    <h3 className="mt-3 max-w-3xl break-words text-xl font-extrabold leading-tight tracking-normal text-[var(--text)] sm:text-2xl">
                        {certificate.title}
                    </h3>
                    <p className="mt-2 break-words text-sm leading-relaxed text-[var(--muted)]/64 sm:text-[0.95rem]">
                        Issued by <span className="font-bold text-[var(--text)]/78">{certificate.issuer}</span>
                    </p>

                    <dl className="mt-5 grid min-w-0 grid-cols-1 border-y border-white/[0.06] sm:grid-cols-2">
                        <div className="min-w-0 py-3 sm:pr-5">
                            <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/38">
                                Public slug
                            </dt>
                            <dd className="mt-1.5 truncate font-mono text-[11px] text-[var(--muted)]/62" title={certificate.slug}>
                                {certificate.slug}
                            </dd>
                        </div>
                        <div className="min-w-0 border-t border-white/[0.06] py-3 sm:border-l sm:border-t-0 sm:pl-5">
                            <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/38">
                                Last updated
                            </dt>
                            <dd className="mt-1.5 text-xs font-semibold tabular-nums text-[var(--muted)]/62">
                                <time dateTime={certificate.updatedAt}>
                                    {formatCertificateDate(certificate.updatedAt)}
                                </time>
                            </dd>
                        </div>
                    </dl>

                    <div className="mt-auto grid grid-cols-2 gap-2 pt-5 sm:flex sm:flex-wrap sm:items-center">
                        <button
                            type="button"
                            onClick={() => onEdit(certificate)}
                            aria-label={`Edit ${certificate.title}`}
                            className={`${ACTIVE_ACTION_CLASS} border-[var(--signal)]/22 bg-[var(--signal)]/[0.075] text-[var(--signal)] hover:border-[var(--signal)]/40 hover:bg-[var(--signal)]/[0.13] hover:text-[var(--text)]`}
                        >
                            <Pencil aria-hidden="true" size={15} strokeWidth={1.8} />
                            Edit
                        </button>

                        {certificate.pdfUrl ? (
                            <a
                                href={certificate.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Open ${certificate.title} certificate PDF in a new tab`}
                                className={`${ACTIVE_ACTION_CLASS} border-white/[0.09] bg-white/[0.025] text-[var(--muted)]/66 hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-[var(--text)]`}
                            >
                                Open PDF
                                <ArrowUpRight aria-hidden="true" size={14} strokeWidth={1.8} />
                            </a>
                        ) : (
                            <span className="inline-flex min-h-11 items-center justify-center rounded-lg border border-dashed border-white/[0.07] px-3 text-xs font-bold text-[var(--muted)]/34">
                                No PDF
                            </span>
                        )}

                        <button
                            type="button"
                            onClick={() => onDelete(certificate)}
                            aria-label={`Delete ${certificate.title}`}
                            className={`${ACTIVE_ACTION_CLASS} col-span-2 border-transparent bg-transparent text-[var(--muted)]/46 hover:border-red-300/20 hover:bg-red-400/[0.05] hover:text-red-200 focus-visible:border-red-300/20 focus-visible:text-red-200 sm:ml-auto`}
                        >
                            <Trash2 aria-hidden="true" size={15} strokeWidth={1.8} />
                            Delete
                        </button>
                    </div>
                </article>
            </div>
        </li>
    );
}

export default function Certificates({
    certificates,
    unavailable = false,
}: CertificatesProps) {
    const dialog = useDialog();
    const snackbar = useSnackbar();
    const router = useRouter();
    const [editor, setEditor] = useState<EditorState>(null);
    const [isRefreshing, startRefresh] = useTransition();
    const publishedCount = certificates.filter((certificate) => certificate.isPublished).length;
    const draftCount = certificates.length - publishedCount;
    const fileReadyCount = certificates.filter((certificate) => certificate.hasPdf).length;

    const handleMutationSuccess = useCallback((message: string) => {
        setEditor(null);
        snackbar.success(message);
        startRefresh(() => router.refresh());
    }, [router, snackbar]);

    const handleDelete = useCallback((certificate: AdminCertificateDto) => {
        dialog.confirm(
            'Delete certificate?',
            <>
                <strong className="font-bold text-[var(--text)]">{certificate.title}</strong>{' '}
                and its PDF will be removed from the dashboard and public portfolio. This cannot be undone.
            </>,
            async () => {
                const result = await deleteCertificate(
                    certificate.id,
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
                confirmLabel: 'Delete certificate',
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
                eyebrow="Content registry / Certificates"
                title="Certificates"
                description="Curate credential records, source PDFs, and their public portfolio order."
                action={
                    <button
                        type="button"
                        onClick={() => setEditor({ mode: 'create' })}
                        className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--signal)]/28 bg-[var(--signal)]/12 px-4 text-sm font-bold text-[var(--signal)] transition-[border-color,background-color,color] duration-200 hover:border-[var(--signal)]/46 hover:bg-[var(--signal)]/18 hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 sm:w-auto motion-reduce:transition-none"
                    >
                        <Plus aria-hidden="true" size={17} strokeWidth={2} />
                        Add certificate
                    </button>
                }
            >
                <AdminPageStats>
                    <AdminPageStat
                        label="Total"
                        value={unavailable ? '--' : String(certificates.length).padStart(2, '0')}
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
                    <AdminPageStat
                        label="PDFs ready"
                        value={unavailable ? '--' : String(fileReadyCount).padStart(2, '0')}
                        valueClassName="text-[var(--text)]/72"
                    />
                </AdminPageStats>
            </AdminPageHeader>

            <section aria-labelledby="certificate-list-heading" className="mt-8">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2
                            id="certificate-list-heading"
                            className="flex items-center gap-2.5 text-sm font-extrabold tracking-normal text-[var(--text)]"
                        >
                            <Award
                                aria-hidden="true"
                                size={17}
                                strokeWidth={1.8}
                                className="text-[var(--signal)]/72"
                            />
                            Credential archive
                        </h2>
                        <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]/45">
                            Source files, publication readiness, and portfolio sequence in one register.
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
                                Credential archive unavailable
                            </h3>
                            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]/60">
                                The secure certificate connection could not be reached. Refresh this view to try again.
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
                ) : certificates.length === 0 ? (
                    <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-white/[0.1] bg-[#07080a] px-5 py-12 text-center">
                        <div>
                            <span className="font-display text-4xl font-extrabold tabular-nums text-[var(--signal)]/42">
                                00
                            </span>
                            <h3 className="mt-3 text-lg font-extrabold text-[var(--text)]">
                                Your credential archive is empty
                            </h3>
                            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]/60">
                                Create the first record as a draft, then publish it when the source PDF is ready.
                            </p>
                            <button
                                type="button"
                                onClick={() => setEditor({ mode: 'create' })}
                                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--signal)]/28 bg-[var(--signal)]/12 px-4 text-sm font-bold text-[var(--signal)] transition-colors duration-200 hover:border-[var(--signal)]/46 hover:bg-[var(--signal)]/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 motion-reduce:transition-none"
                            >
                                <Plus aria-hidden="true" size={17} strokeWidth={2} />
                                Add first certificate
                            </button>
                        </div>
                    </div>
                ) : (
                    <ol className="grid grid-cols-1 gap-4">
                        {certificates.map((certificate, index) => (
                            <CertificateRecord
                                key={certificate.id}
                                certificate={certificate}
                                index={index}
                                onEdit={(selectedCertificate) => setEditor({ mode: 'edit', certificate: selectedCertificate })}
                                onDelete={handleDelete}
                            />
                        ))}
                    </ol>
                )}
            </section>

            {editor ? (
                <CertificateModal
                    key={editor.mode === 'create' ? 'create-certificate' : editor.certificate.id}
                    mode={editor.mode}
                    certificate={editor.mode === 'edit' ? editor.certificate : undefined}
                    onClose={() => setEditor(null)}
                    onSuccess={handleMutationSuccess}
                />
            ) : null}
        </ManagementPage>
    );
}
