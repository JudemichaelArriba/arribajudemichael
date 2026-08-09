import type {
    Tables,
    TablesInsert,
    TablesUpdate,
} from '@/lib/models/database.types';

export type Certificate =
    Tables<'certificates'>;

export type CertificateInsert =
    TablesInsert<'certificates'>;

export type CertificateUpdate =
    TablesUpdate<'certificates'>;

export interface PublicCertificateDto {
    id: string;
    title: string;
    issuer: string;
    pdfUrl: string;
}