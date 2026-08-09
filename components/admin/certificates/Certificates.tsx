'use client';

import {
    ArrowUpRight,
    Award,
    FileText,
    Pencil,
    Plus,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
    ManagementPage,
    ManagementPageChrome,
} from '@/components/admin/layout/ManagementPage';
import { useDialog } from '@/components/dialog/Dialog';
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

export default function Certificates({
    certificates,
    unavailable = false,
}: CertificatesProps) {
    const dialog = useDialog();
    const router = useRouter();
    const [editor, setEditor] = useState<EditorState>(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [isRefreshing, startRefresh] = useTransition();

    const handleMutationSuccess = useCallback((message: string) => {
        setEditor(null);
        setStatusMessage(message);
        startRefresh(() => router.refresh());
    }, [router]);

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
            <ManagementPageChrome
                eyebrow="Content / Certificates"
                title="Certificates"
                description="Review and manage the credentials presented in the public portfolio."
                count={certificates.length}
                countLabel="credentials"
                actionLabel="Add certificate"
                noticeId="certificates-management-notice"
                showNotice={false}
                action={(
                    <button
                        type="button"
                        onClick={() => setEditor({ mode: 'create' })}
                        className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--signal)]/24 bg-[var(--signal)]/12 px-4 text-sm font-bold text-[var(--signal)] transition-[border-color,background-color] duration-200 hover:border-[var(--signal)]/42 hover:bg-[var(--signal)]/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 sm:w-auto motion-reduce:transition-none"
                    >
                        <Plus aria-hidden="true" size={17} strokeWidth={2} />
                        Add certificate
                    </button>
                )}
            />

            <div aria-live="polite" className="min-h-6 pt-4 text-sm text-emerald-300/72">
                {statusMessage}
            </div>

            <section aria-labelledby="certificate-list-heading" className="mt-4 sm:mt-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <Award
                            aria-hidden="true"
                            size={17}
                            strokeWidth={1.8}
                            className="shrink-0 text-[var(--signal)]/72"
                        />
                        <h2
                            id="certificate-list-heading"
                            className="text-sm font-bold tracking-normal text-[var(--text)]"
                        >
                            All credentials
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
                            Certificates could not be loaded.
                        </h3>
                        <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]/62">
                            Refresh this view to try the secure certificate connection again.
                        </p>
                        <button
                            type="button"
                            onClick={handleRetry}
                            disabled={isRefreshing}
                            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.03] px-4 text-sm font-bold text-[var(--text)] transition-colors hover:border-[var(--signal)]/28 hover:bg-[var(--signal)]/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none"
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
                ) : certificates.length === 0 ? (
                    <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.1] bg-white/[0.018] px-5 py-10 text-center">
                        <Award aria-hidden="true" size={26} strokeWidth={1.5} className="text-[var(--signal)]/62" />
                        <h3 className="mt-4 text-lg font-extrabold text-[var(--text)]">
                            No certificates yet.
                        </h3>
                        <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]/62">
                            Add the first credential as a draft, then publish it when its PDF is ready.
                        </p>
                        <button
                            type="button"
                            onClick={() => setEditor({ mode: 'create' })}
                            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--signal)]/24 bg-[var(--signal)]/12 px-4 text-sm font-bold text-[var(--signal)] transition-colors hover:border-[var(--signal)]/42 hover:bg-[var(--signal)]/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 motion-reduce:transition-none"
                        >
                            <Plus aria-hidden="true" size={17} strokeWidth={2} />
                            Add certificate
                        </button>
                    </div>
                ) : (
                    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {certificates.map((certificate, index) => (
                            <li
                                key={certificate.id}
                                className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.025]"
                            >
                                <div className="aspect-[1.3/1] w-full overflow-hidden border-b border-white/[0.07] bg-white">
                                    <CertificatePdfPreview
                                        source={certificate.pdfUrl}
                                        label={`${certificate.title} first-page preview`}
                                    />
                                </div>

                                <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[9px] font-bold uppercase tracking-[0.11em]">
                                        <span className="tabular-nums text-[var(--signal)]/75">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <span aria-hidden="true" className="h-px w-4 bg-white/10" />
                                        <span className="inline-flex items-center gap-1.5 text-[var(--muted)]/48">
                                            <FileText aria-hidden="true" size={12} strokeWidth={1.8} />
                                            PDF credential
                                        </span>
                                        <span className={certificate.isPublished
                                            ? 'inline-flex items-center gap-1.5 text-emerald-300/62'
                                            : 'inline-flex items-center gap-1.5 text-amber-200/58'}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={certificate.isPublished
                                                    ? 'size-1.5 rounded-full bg-emerald-300/70'
                                                    : 'size-1.5 rounded-full bg-amber-200/65'}
                                            />
                                            {certificate.isPublished ? 'Published' : 'Draft'}
                                        </span>
                                        <span className="text-[var(--muted)]/42">
                                            Order {certificate.displayOrder}
                                        </span>
                                    </div>

                                    <h3 className="mt-3 text-lg font-extrabold leading-snug tracking-normal text-[var(--text)] sm:text-xl">
                                        {certificate.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]/60">
                                        {certificate.issuer}
                                    </p>

                                    {certificate.pdfUrl ? (
                                        <a
                                            href={certificate.pdfUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label={`Open ${certificate.title} certificate PDF in a new tab`}
                                            className="mt-5 inline-flex min-h-11 w-fit items-center gap-2 rounded-lg border border-white/[0.09] bg-white/[0.025] px-3 text-xs font-bold text-[var(--muted)]/68 transition-[color,border-color,background-color] duration-200 hover:border-[var(--signal)]/25 hover:bg-[var(--signal)]/[0.05] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 motion-reduce:transition-none"
                                        >
                                            Open PDF
                                            <ArrowUpRight aria-hidden="true" size={14} strokeWidth={1.8} />
                                        </a>
                                    ) : (
                                        <p className="mt-5 inline-flex min-h-11 items-center text-xs font-bold text-[var(--muted)]/42">
                                            No PDF attached
                                        </p>
                                    )}

                                    <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setEditor({ mode: 'edit', certificate })}
                                            aria-label={`Edit ${certificate.title}`}
                                            className={`${ACTIVE_ACTION_CLASS} border-white/[0.09] bg-white/[0.025] text-[var(--muted)]/68 hover:border-[var(--signal)]/24 hover:bg-[var(--signal)]/[0.05] hover:text-[var(--text)]`}
                                        >
                                            <Pencil aria-hidden="true" size={15} strokeWidth={1.8} />
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(certificate)}
                                            aria-label={`Delete ${certificate.title}`}
                                            className={`${ACTIVE_ACTION_CLASS} border-red-400/12 bg-red-400/[0.025] text-red-300/62 hover:border-red-300/25 hover:bg-red-400/[0.065] hover:text-red-200`}
                                        >
                                            <Trash2 aria-hidden="true" size={15} strokeWidth={1.8} />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
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
