import DashboardOverview from '@/components/admin/dashboard/DashboardOverview';
import { requireUser } from '@/lib/auth/requireUser';

export default async function DashboardPage() {
    await requireUser();

    return <DashboardOverview />;
}
