export const ANALYTICS_REPORTING_TIME_ZONE = 'Asia/Manila' as const;

export const ANALYTICS_PERIODS = [
    'today',
    'week',
    'month',
    'year',
] as const;

export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];
export type AnalyticsTrendBucket = 'day' | 'month';

export interface AnalyticsOverview {
    readonly period: AnalyticsPeriod;
    readonly uniqueVisitors: number;
    readonly sessions: number;
    readonly averageDailyVisitors: number;
    readonly averageDailySessions: number;
}

export interface AnalyticsTrendPoint {
    readonly bucketStart: string;
    readonly uniqueVisitors: number;
    readonly sessions: number;
}

export interface AnalyticsSectionSummary {
    readonly sectionKey: string;
    readonly uniqueVisitors: number;
    readonly sessionsReached: number;
    readonly totalViews: number;
    readonly totalVisibleMs: number;
    readonly averageVisibleMs: number;
    readonly averageMaxVisibility: number;
    readonly reachPercentage: number;
}

export interface AnalyticsSectionHighlights {
    readonly mostVisited: AnalyticsSectionSummary | null;
    readonly leastVisited: AnalyticsSectionSummary | null;
    readonly highestEngagement: AnalyticsSectionSummary | null;
    readonly lowestEngagement: AnalyticsSectionSummary | null;
}

export interface AnalyticsDashboardData {
    readonly overview: AnalyticsOverview;
    readonly trend: readonly AnalyticsTrendPoint[];
    readonly sections: readonly AnalyticsSectionSummary[];
    readonly highlights: AnalyticsSectionHighlights;
}
