import {
    AdminPageHeader,
    ManagementPage,
} from '@/components/admin/layout/ManagementPage';

export default function DashboardOverview() {
    return (
        <ManagementPage>
            <section aria-labelledby="dashboard-page-heading">
                <AdminPageHeader
                    eyebrow="Portfolio administration / Overview"
                    title="Dashboard"
                    headingId="dashboard-page-heading"
                    description="Manage portfolio content and review communication from one protected workspace."
                />
            </section>
        </ManagementPage>
    );
}
