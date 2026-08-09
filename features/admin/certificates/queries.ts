import 'server-only';

import {
    createClient as createAnonymousClient,
    type SupabaseClient,
} from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';

import type { Database } from '@/lib/models/database.types';
import { getSupabasePublicConfig } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import type {
    AdminCertificateDto,
    Certificate,
    PublicCertificateDto,
} from './types';
import {
    CERTIFICATE_FILES_BUCKET,
    isCertificatePdfPath,
} from './validation';

export const CERTIFICATES_CACHE_TAG = 'certificates';

type PublicCertificateRow = Pick<
    Certificate,
    'id' | 'title' | 'issuer' | 'pdf_path' | 'updated_at'
>;

function getVersionedPdfUrl(
    supabase: SupabaseClient<Database>,
    certificateId: string,
    pdfPath: string | null,
    updatedAt: string,
): string | null {
    if (!pdfPath || !isCertificatePdfPath(pdfPath, certificateId)) return null;

    const publicUrl = supabase.storage
        .from(CERTIFICATE_FILES_BUCKET)
        .getPublicUrl(pdfPath).data.publicUrl;

    try {
        const url = new URL(publicUrl);
        url.searchParams.set('v', updatedAt);
        return url.toString();
    } catch {
        return null;
    }
}

function toPublicCertificate(
    certificate: PublicCertificateRow,
    supabase: SupabaseClient<Database>,
): PublicCertificateDto | null {
    const pdfUrl = getVersionedPdfUrl(
        supabase,
        certificate.id,
        certificate.pdf_path,
        certificate.updated_at,
    );

    if (!pdfUrl) {
        console.error('[certificates/public] Published certificate has no valid PDF path.', {
            code: 'invalid_pdf_path',
        });
        return null;
    }

    return {
        id: certificate.id,
        title: certificate.title,
        issuer: certificate.issuer,
        pdfUrl,
        updatedAt: certificate.updated_at,
    };
}

function toAdminCertificate(
    certificate: Certificate,
    supabase: SupabaseClient<Database>,
): AdminCertificateDto {
    const pdfUrl = getVersionedPdfUrl(
        supabase,
        certificate.id,
        certificate.pdf_path,
        certificate.updated_at,
    );

    return {
        id: certificate.id,
        slug: certificate.slug,
        title: certificate.title,
        issuer: certificate.issuer,
        pdfUrl,
        hasPdf: Boolean(pdfUrl),
        isPublished: certificate.is_published,
        displayOrder: certificate.display_order,
        createdAt: certificate.created_at,
        updatedAt: certificate.updated_at,
    };
}

function logReadFailure(scope: 'public' | 'admin', error: { code?: string | null }) {
    console.error(`[certificates/${scope}] Certificate query failed.`, {
        code: error.code ?? 'unknown',
    });
}

const getCachedPublishedCertificates = unstable_cache(
    async (): Promise<PublicCertificateDto[]> => {
        const { url, publishableKey } = getSupabasePublicConfig();
        const supabase = createAnonymousClient<Database>(url, publishableKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
        });

        const { data, error } = await supabase
            .from('certificates')
            .select('id,title,issuer,pdf_path,updated_at')
            .eq('is_published', true)
            .order('display_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) {
            logReadFailure('public', error);
            throw new Error('Published certificates are unavailable.');
        }

        return data.flatMap((certificate) => {
            const mapped = toPublicCertificate(certificate, supabase);
            return mapped ? [mapped] : [];
        });
    },
    ['published-certificates'],
    { revalidate: 3600, tags: [CERTIFICATES_CACHE_TAG] },
);

export async function getPublishedCertificates(): Promise<PublicCertificateDto[]> {
    return getCachedPublishedCertificates();
}

export async function getAdminCertificates(): Promise<AdminCertificateDto[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

    if (error) {
        logReadFailure('admin', error);
        throw new Error('Admin certificates are unavailable.');
    }

    return data.map((certificate) => toAdminCertificate(certificate, supabase));
}
