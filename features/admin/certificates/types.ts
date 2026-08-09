import type { Database } from '@/lib/models/database.types';

export type Certificate = Database['public']['Tables']['certificates']['Row'];
export type CertificateInsert = Database['public']['Tables']['certificates']['Insert'];
export type CertificateUpdate = Database['public']['Tables']['certificates']['Update'];

export interface PublicCertificateDto {
    id: string;
    title: string;
    issuer: string;
    pdfUrl: string;
    updatedAt: string;
}

export interface AdminCertificateDto {
    id: string;
    slug: string;
    title: string;
    issuer: string;
    pdfUrl: string | null;
    hasPdf: boolean;
    isPublished: boolean;
    displayOrder: number;
    createdAt: string;
    updatedAt: string;
}

export type CertificateField =
    | 'title'
    | 'issuer'
    | 'slug'
    | 'displayOrder'
    | 'pdf'
    | 'isPublished';

export type CertificateFieldErrors = Partial<Record<CertificateField, string>>;

export interface CertificateActionState {
    status: 'idle' | 'error' | 'success';
    message: string;
    attempt: number;
    fieldErrors: CertificateFieldErrors;
}
