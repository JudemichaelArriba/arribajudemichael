import type { CertificateFieldErrors } from './types';

export const CERTIFICATE_FILES_BUCKET = 'certificate-files';
export const MAX_CERTIFICATE_PDF_BYTES = 10 * 1024 * 1024;
export const CERTIFICATE_PDF_MIME_TYPE = 'application/pdf';

const MAX_TEXT_LENGTH = 200;
const MAX_DISPLAY_ORDER = 2_147_483_647;
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d] as const;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ValidatedCertificateInput {
    title: string;
    issuer: string;
    slug: string;
    displayOrder: number;
    isPublished: boolean;
    pdfChanged: boolean;
}

export type CertificateValidationResult =
    | { success: true; data: ValidatedCertificateInput }
    | { success: false; fieldErrors: CertificateFieldErrors };

interface CertificateValidationOptions {
    hasPdf?: boolean;
}

function readText(formData: FormData, name: string): string {
    const value = formData.get(name);
    return typeof value === 'string' ? value.trim() : '';
}

function validateRequiredText(
    errors: CertificateFieldErrors,
    field: 'title' | 'issuer',
    value: string,
    label: string,
) {
    if (!value) {
        errors[field] = `${label} is required.`;
    } else if (value.length > MAX_TEXT_LENGTH) {
        errors[field] = `${label} must be ${MAX_TEXT_LENGTH} characters or fewer.`;
    }
}

export function isCertificateId(value: string): boolean {
    return UUID_PATTERN.test(value);
}

export function getCertificatePdfPath(certificateId: string): string {
    return `certificates/${certificateId}/certificate.pdf`;
}

export function isCertificatePdfPath(path: string, certificateId: string): boolean {
    return isCertificateId(certificateId) && path === getCertificatePdfPath(certificateId);
}

export function hasPdfSignature(bytes: Uint8Array): boolean {
    return PDF_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

export function slugifyCertificateTitle(value: string): string {
    return value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('en-US')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-')
        .slice(0, MAX_TEXT_LENGTH)
        .replace(/-+$/g, '');
}

export async function validateCertificatePdf(file: File): Promise<string | null> {
    if (file.size === 0) return 'Choose a non-empty PDF file.';
    if (file.type !== CERTIFICATE_PDF_MIME_TYPE) return 'Choose a PDF file.';
    if (file.size > MAX_CERTIFICATE_PDF_BYTES) return 'PDF size must not exceed 10 MiB.';

    try {
        const header = new Uint8Array(await file.slice(0, PDF_SIGNATURE.length).arrayBuffer());
        if (!hasPdfSignature(header)) return 'The selected file is not a valid PDF.';
    } catch {
        return 'The selected PDF could not be inspected.';
    }

    return null;
}

export function validateCertificateFormData(
    formData: FormData,
    options: CertificateValidationOptions = {},
): CertificateValidationResult {
    const fieldErrors: CertificateFieldErrors = {};
    const title = readText(formData, 'title');
    const issuer = readText(formData, 'issuer');
    const slug = readText(formData, 'slug');
    const displayOrderValue = readText(formData, 'displayOrder');
    const isPublished = formData.get('isPublished') === 'true';
    const pdfChanged = formData.get('pdfChanged') === 'true';

    validateRequiredText(fieldErrors, 'title', title, 'Title');
    validateRequiredText(fieldErrors, 'issuer', issuer, 'Issuer');

    if (!slug) {
        fieldErrors.slug = 'Slug is required.';
    } else if (slug.length > MAX_TEXT_LENGTH || !SLUG_PATTERN.test(slug)) {
        fieldErrors.slug = 'Use lowercase letters, numbers, and single hyphens only.';
    }

    const displayOrder = Number(displayOrderValue);
    if (
        displayOrderValue === '' ||
        !Number.isSafeInteger(displayOrder) ||
        displayOrder < 0 ||
        displayOrder > MAX_DISPLAY_ORDER
    ) {
        fieldErrors.displayOrder = 'Display order must be a non-negative whole number.';
    }

    if (isPublished && !options.hasPdf) {
        fieldErrors.pdf = 'A verified PDF is required before publishing.';
    }

    if (Object.keys(fieldErrors).length > 0) {
        return { success: false, fieldErrors };
    }

    return {
        success: true,
        data: {
            title,
            issuer,
            slug,
            displayOrder,
            isPublished,
            pdfChanged,
        },
    };
}
