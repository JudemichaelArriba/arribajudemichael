'use server';

import { revalidatePath, updateTag } from 'next/cache';

import { requireUser } from '@/lib/auth/requireUser';
import { createClient } from '@/lib/supabase/server';
import { CERTIFICATES_CACHE_TAG } from './queries';
import type {
    CertificateActionState,
    CertificateFieldErrors,
    CertificateInsert,
    CertificateUpdate,
} from './types';
import {
    CERTIFICATE_FILES_BUCKET,
    CERTIFICATE_PDF_MIME_TYPE,
    MAX_CERTIFICATE_PDF_BYTES,
    getCertificatePdfPath,
    hasPdfSignature,
    isCertificateId,
    isCertificatePdfPath,
    validateCertificateFormData,
} from './validation';

type CertificateSupabaseClient = Awaited<ReturnType<typeof createClient>>;
type MutationOperation = 'create' | 'update' | 'delete' | 'verify' | 'cleanup';

interface StoredPdfInspection {
    exists: boolean;
    valid: boolean;
    unavailable?: boolean;
    message?: string;
}

function nextState(
    previousState: CertificateActionState,
    status: CertificateActionState['status'],
    message: string,
    fieldErrors: CertificateFieldErrors = {},
): CertificateActionState {
    return {
        status,
        message,
        fieldErrors,
        attempt: previousState.attempt + 1,
    };
}

function getErrorCode(error: unknown): string {
    if (typeof error !== 'object' || error === null || !('code' in error)) return 'unknown';
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : 'unknown';
}

function logMutationFailure(operation: MutationOperation, error: unknown) {
    console.error(`[certificates/${operation}] Operation failed.`, {
        code: getErrorCode(error),
    });
}

function invalidateCertificateViews() {
    updateTag(CERTIFICATES_CACHE_TAG);
    revalidatePath('/');
    revalidatePath('/dashboard/certificates');
}

async function removeCanonicalPdf(
    supabase: CertificateSupabaseClient,
    certificateId: string,
) {
    const path = getCertificatePdfPath(certificateId);
    const { error } = await supabase.storage.from(CERTIFICATE_FILES_BUCKET).remove([path]);
    if (error) logMutationFailure('cleanup', error);
}

async function inspectCanonicalPdf(
    supabase: CertificateSupabaseClient,
    certificateId: string,
): Promise<StoredPdfInspection> {
    const folder = `certificates/${certificateId}`;
    const path = getCertificatePdfPath(certificateId);
    const { data, error } = await supabase.storage
        .from(CERTIFICATE_FILES_BUCKET)
        .list(folder, { limit: 10, search: 'certificate.pdf' });

    if (error) {
        logMutationFailure('verify', error);
        return {
            exists: false,
            valid: false,
            unavailable: true,
            message: 'The certificate PDF could not be verified right now.',
        };
    }

    const file = data.find((item) => item.name === 'certificate.pdf');
    if (!file) return { exists: false, valid: false };

    if (
        !file.metadata ||
        file.metadata.mimetype !== CERTIFICATE_PDF_MIME_TYPE ||
        !Number.isSafeInteger(file.metadata.size) ||
        file.metadata.size <= 0 ||
        file.metadata.size > MAX_CERTIFICATE_PDF_BYTES
    ) {
        return {
            exists: true,
            valid: false,
            message: 'The stored PDF does not meet the file requirements.',
        };
    }

    try {
        const publicUrl = supabase.storage
            .from(CERTIFICATE_FILES_BUCKET)
            .getPublicUrl(path).data.publicUrl;
        const verificationUrl = new URL(publicUrl);
        verificationUrl.searchParams.set('verify', Date.now().toString());

        const response = await fetch(verificationUrl, {
            cache: 'no-store',
            headers: { Range: 'bytes=0-4' },
        });

        if (!response.ok) {
            return {
                exists: true,
                valid: false,
                unavailable: true,
                message: 'The stored PDF could not be read.',
            };
        }

        const header = new Uint8Array(await response.arrayBuffer());
        if (!hasPdfSignature(header)) {
            return {
                exists: true,
                valid: false,
                message: 'The stored file is not a valid PDF.',
            };
        }
    } catch (error) {
        logMutationFailure('verify', error);
        return {
            exists: true,
            valid: false,
            unavailable: true,
            message: 'The certificate PDF could not be verified right now.',
        };
    }

    return { exists: true, valid: true };
}

function writeFailureState(
    previousState: CertificateActionState,
    operation: 'create' | 'update',
    error: unknown,
): CertificateActionState {
    logMutationFailure(operation, error);

    if (getErrorCode(error) === '23505') {
        return nextState(previousState, 'error', 'Review the highlighted field.', {
            slug: 'This slug is already in use.',
        });
    }

    return nextState(
        previousState,
        'error',
        `Unable to ${operation} the certificate right now. Please try again.`,
    );
}

export async function createCertificate(
    certificateId: string,
    previousState: CertificateActionState,
    formData: FormData,
): Promise<CertificateActionState> {
    await requireUser();

    if (!isCertificateId(certificateId)) {
        return nextState(previousState, 'error', 'Unable to identify this certificate.');
    }

    const supabase = await createClient();
    const { data: existingCertificate, error: readError } = await supabase
        .from('certificates')
        .select('id')
        .eq('id', certificateId)
        .maybeSingle();

    if (readError) {
        logMutationFailure('create', readError);
        return nextState(previousState, 'error', 'Unable to prepare this certificate right now.');
    }

    if (existingCertificate) {
        return nextState(previousState, 'error', 'This certificate already exists. Refresh and try again.');
    }

    const validation = validateCertificateFormData(formData, { hasPdf: true });
    if (!validation.success) {
        await removeCanonicalPdf(supabase, certificateId);
        return nextState(
            previousState,
            'error',
            'Review the highlighted fields.',
            validation.fieldErrors,
        );
    }

    const shouldInspectPdf = validation.data.pdfChanged || validation.data.isPublished;
    const storedPdf = shouldInspectPdf
        ? await inspectCanonicalPdf(supabase, certificateId)
        : { exists: false, valid: false };

    if (storedPdf.unavailable) {
        return nextState(previousState, 'error', 'Review the certificate PDF.', {
            pdf: storedPdf.message ?? 'The uploaded PDF could not be verified right now.',
        });
    }

    if (storedPdf.exists && !storedPdf.valid) {
        await removeCanonicalPdf(supabase, certificateId);
        return nextState(previousState, 'error', 'Review the certificate PDF.', {
            pdf: storedPdf.message ?? 'The uploaded PDF could not be verified.',
        });
    }

    if (
        (validation.data.pdfChanged || validation.data.isPublished) &&
        !storedPdf.valid
    ) {
        return nextState(previousState, 'error', 'Review the certificate PDF.', {
            pdf: validation.data.isPublished
                ? 'A verified PDF is required before publishing.'
                : 'The uploaded PDF could not be found. Please try again.',
        });
    }

    const insert: CertificateInsert = {
        id: certificateId,
        title: validation.data.title,
        issuer: validation.data.issuer,
        slug: validation.data.slug,
        display_order: validation.data.displayOrder,
        is_published: validation.data.isPublished,
        pdf_path: shouldInspectPdf && storedPdf.valid
            ? getCertificatePdfPath(certificateId)
            : null,
    };

    const { error } = await supabase.from('certificates').insert(insert);
    if (error) {
        if (storedPdf.exists) await removeCanonicalPdf(supabase, certificateId);
        return writeFailureState(previousState, 'create', error);
    }

    invalidateCertificateViews();
    return nextState(previousState, 'success', 'Certificate created successfully.');
}

export async function updateCertificate(
    certificateId: string,
    previousState: CertificateActionState,
    formData: FormData,
): Promise<CertificateActionState> {
    await requireUser();

    if (!isCertificateId(certificateId)) {
        return nextState(previousState, 'error', 'Unable to identify this certificate.');
    }

    const supabase = await createClient();
    const { data: existingCertificate, error: readError } = await supabase
        .from('certificates')
        .select('id,pdf_path')
        .eq('id', certificateId)
        .maybeSingle();

    if (readError || !existingCertificate) {
        if (readError) logMutationFailure('update', readError);
        return nextState(
            previousState,
            'error',
            'This certificate could not be found. Refresh and try again.',
        );
    }

    const hadCanonicalPdf = Boolean(
        existingCertificate.pdf_path &&
        isCertificatePdfPath(existingCertificate.pdf_path, certificateId),
    );
    const validation = validateCertificateFormData(formData, {
        hasPdf: hadCanonicalPdf || formData.get('pdfChanged') === 'true',
    });

    if (!validation.success) {
        return nextState(
            previousState,
            'error',
            'Review the highlighted fields.',
            validation.fieldErrors,
        );
    }

    let nextPdfPath = hadCanonicalPdf ? getCertificatePdfPath(certificateId) : null;
    let verifiedReplacement = false;

    if (validation.data.pdfChanged || validation.data.isPublished) {
        const storedPdf = await inspectCanonicalPdf(supabase, certificateId);
        if (!storedPdf.valid) {
            return nextState(previousState, 'error', 'Review the certificate PDF.', {
                pdf: storedPdf.message ?? 'A verified PDF is required before publishing.',
            });
        }

        nextPdfPath = getCertificatePdfPath(certificateId);
        verifiedReplacement = validation.data.pdfChanged;
    }

    const update: CertificateUpdate = {
        title: validation.data.title,
        issuer: validation.data.issuer,
        slug: validation.data.slug,
        display_order: validation.data.displayOrder,
        is_published: validation.data.isPublished,
        pdf_path: nextPdfPath,
    };

    const { error } = await supabase
        .from('certificates')
        .update(update)
        .eq('id', certificateId);

    if (error) {
        if (verifiedReplacement && !hadCanonicalPdf) {
            await removeCanonicalPdf(supabase, certificateId);
        }
        return writeFailureState(previousState, 'update', error);
    }

    invalidateCertificateViews();
    return nextState(previousState, 'success', 'Certificate updated successfully.');
}

export async function deleteCertificate(
    certificateId: string,
    previousState: CertificateActionState,
    _formData: FormData,
): Promise<CertificateActionState> {
    await requireUser();

    if (!isCertificateId(certificateId)) {
        return nextState(previousState, 'error', 'Unable to identify this certificate.');
    }

    const supabase = await createClient();
    const { data: existingCertificate, error: readError } = await supabase
        .from('certificates')
        .select('id,pdf_path')
        .eq('id', certificateId)
        .maybeSingle();

    if (readError || !existingCertificate) {
        if (readError) logMutationFailure('delete', readError);
        return nextState(
            previousState,
            'error',
            'This certificate could not be found. Refresh and try again.',
        );
    }

    const canRemovePdf = Boolean(
        existingCertificate.pdf_path &&
        isCertificatePdfPath(existingCertificate.pdf_path, certificateId),
    );
    const { error } = await supabase
        .from('certificates')
        .delete()
        .eq('id', certificateId);

    if (error) {
        logMutationFailure('delete', error);
        return nextState(
            previousState,
            'error',
            'Unable to delete the certificate right now. Please try again.',
        );
    }

    if (canRemovePdf) await removeCanonicalPdf(supabase, certificateId);

    invalidateCertificateViews();
    return nextState(previousState, 'success', 'Certificate deleted successfully.');
}
