import Certificates from '@/components/admin/certificates/Certificates';
import { getAdminCertificates } from '@/features/admin/certificates/queries';
import type { AdminCertificateDto } from '@/features/admin/certificates/types';
import { requireUser } from '@/lib/auth/requireUser';

export default async function CertificatesPage() {
    await requireUser();
    let certificates: AdminCertificateDto[] = [];
    let unavailable = false;

    try {
        certificates = await getAdminCertificates();
    } catch {
        unavailable = true;
    }

    return <Certificates certificates={certificates} unavailable={unavailable} />;
}
