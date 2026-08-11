import { unstable_rethrow } from 'next/navigation';

import Analytics from '@/components/admin/analytics/Analytics';
import { getAnalyticsDashboardData } from '@/features/admin/analytics/queries';
import {
    ANALYTICS_PERIODS,
    type AnalyticsDashboardData,
    type AnalyticsPeriod,
} from '@/features/admin/analytics/types';

interface AnalyticsPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const DEFAULT_ANALYTICS_PERIOD: AnalyticsPeriod = 'week';

function parseAnalyticsPeriod(
    value: string | string[] | undefined,
): AnalyticsPeriod {
    if (
        typeof value === 'string' &&
        (ANALYTICS_PERIODS as readonly string[]).includes(value)
    ) {
        return value as AnalyticsPeriod;
    }

    return DEFAULT_ANALYTICS_PERIOD;
}

export default async function AnalyticsPage({
    searchParams,
}: AnalyticsPageProps) {
    const period = parseAnalyticsPeriod((await searchParams).period);
    let data: AnalyticsDashboardData | null = null;
    let unavailable = false;

    try {
        data = await getAnalyticsDashboardData(period);
    } catch (error) {
        unstable_rethrow(error);
        unavailable = true;
    }

    return <Analytics data={data} period={period} unavailable={unavailable} />;
}
