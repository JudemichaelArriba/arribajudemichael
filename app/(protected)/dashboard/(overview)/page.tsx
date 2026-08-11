import { unstable_rethrow } from 'next/navigation';

import DashboardOverview from '@/components/admin/dashboard/DashboardOverview';
import { getWeeklyAnalyticsSummary } from '@/features/admin/analytics/queries';
import type { WeeklyAnalyticsSummary } from '@/features/admin/analytics/types';

export default async function DashboardPage() {
    let analyticsSummary: WeeklyAnalyticsSummary | null = null;
    let analyticsUnavailable = false;

    try {
        analyticsSummary = await getWeeklyAnalyticsSummary();
    } catch (error) {
        unstable_rethrow(error);
        analyticsUnavailable = true;
    }

    return (
        <DashboardOverview
            analyticsSummary={analyticsSummary}
            analyticsUnavailable={analyticsUnavailable}
        />
    );
}
