import 'server-only';

import { requireUser } from '@/lib/auth/requireUser';
import type { Database } from '@/lib/models/database.types';
import { createClient } from '@/lib/supabase/server';
import {
    ANALYTICS_PERIODS,
    ANALYTICS_REPORTING_TIME_ZONE,
    type AnalyticsDashboardData,
    type AnalyticsOverview,
    type AnalyticsPeriod,
    type AnalyticsSectionHighlights,
    type AnalyticsSectionSummary,
    type AnalyticsTrendBucket,
    type AnalyticsTrendPoint,
} from './types';

type AnalyticsSupabaseClient = Awaited<ReturnType<typeof createClient>>;
type PeriodSummaryRow = Database['public']['Functions']['get_analytics_period_summary']['Returns'][number];
type VisitorTrendRow = Database['public']['Functions']['get_analytics_visitor_trend']['Returns'][number];
type SectionSummaryRow = Database['public']['Functions']['get_analytics_section_summary']['Returns'][number];
type AnalyticsQueryScope = 'overview' | 'trend' | 'sections';

interface CalendarDate {
    readonly year: number;
    readonly month: number;
    readonly day: number;
}

interface ZonedDateTimeParts extends CalendarDate {
    readonly hour: number;
    readonly minute: number;
    readonly second: number;
}

interface AnalyticsPeriodRange {
    readonly from: string;
    readonly to: string;
}

interface AnalyticsQueryContext {
    readonly period: AnalyticsPeriod;
    readonly range: AnalyticsPeriodRange;
    readonly supabase: AnalyticsSupabaseClient;
}

interface NumberOptions {
    readonly integer?: boolean;
    readonly max?: number;
    readonly min?: number;
}

const SECTION_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

const reportingDateFormatter = new Intl.DateTimeFormat(
    'en-US-u-ca-gregory',
    {
        timeZone: ANALYTICS_REPORTING_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    },
);

const reportingDateTimeFormatter = new Intl.DateTimeFormat(
    'en-US-u-ca-gregory',
    {
        timeZone: ANALYTICS_REPORTING_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    },
);

function getErrorCode(error: unknown): string {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
        return 'unknown';
    }

    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : 'unknown';
}

function throwAnalyticsQueryError(
    scope: AnalyticsQueryScope,
    error: unknown,
): never {
    console.error('[analytics/query] Reporting query failed.', {
        scope,
        code: getErrorCode(error),
    });
    throw new Error('Admin analytics data is unavailable.');
}

function getNumericPart(
    parts: readonly Intl.DateTimeFormatPart[],
    type: Intl.DateTimeFormatPartTypes,
): number {
    const value = parts.find((part) => part.type === type)?.value;
    const parsed = value ? Number(value) : Number.NaN;

    if (!Number.isInteger(parsed)) {
        throw new Error('Analytics reporting period is unavailable.');
    }

    return parsed;
}

function getReportingDate(date: Date): CalendarDate {
    const parts = reportingDateFormatter.formatToParts(date);
    return {
        year: getNumericPart(parts, 'year'),
        month: getNumericPart(parts, 'month'),
        day: getNumericPart(parts, 'day'),
    };
}

function getReportingDateTime(date: Date): ZonedDateTimeParts {
    const parts = reportingDateTimeFormatter.formatToParts(date);
    return {
        ...getReportingDate(date),
        hour: getNumericPart(parts, 'hour'),
        minute: getNumericPart(parts, 'minute'),
        second: getNumericPart(parts, 'second'),
    };
}

function shiftCalendarDate(date: CalendarDate, days: number): CalendarDate {
    const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day));
    shifted.setUTCDate(shifted.getUTCDate() + days);

    return {
        year: shifted.getUTCFullYear(),
        month: shifted.getUTCMonth() + 1,
        day: shifted.getUTCDate(),
    };
}

function getTimeZoneOffsetMs(date: Date): number {
    const parts = getReportingDateTime(date);
    const representedAsUtc = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second,
    );
    const instantWithoutMilliseconds =
        Math.floor(date.getTime() / 1_000) * 1_000;

    return representedAsUtc - instantWithoutMilliseconds;
}

function reportingMidnightToUtc(date: CalendarDate): Date {
    const midnightAsUtc = Date.UTC(date.year, date.month - 1, date.day);
    let candidate = midnightAsUtc;

    for (let iteration = 0; iteration < 3; iteration += 1) {
        const adjusted =
            midnightAsUtc - getTimeZoneOffsetMs(new Date(candidate));

        if (adjusted === candidate) break;
        candidate = adjusted;
    }

    const result = new Date(candidate);
    const verified = getReportingDateTime(result);

    if (
        verified.year !== date.year ||
        verified.month !== date.month ||
        verified.day !== date.day ||
        verified.hour !== 0 ||
        verified.minute !== 0 ||
        verified.second !== 0
    ) {
        throw new Error('Analytics reporting period is unavailable.');
    }

    return result;
}

function isAnalyticsPeriod(value: string): value is AnalyticsPeriod {
    return (ANALYTICS_PERIODS as readonly string[]).includes(value);
}

function getAnalyticsPeriodRange(
    period: AnalyticsPeriod,
    now = new Date(),
): AnalyticsPeriodRange {
    if (!isAnalyticsPeriod(period) || !Number.isFinite(now.getTime())) {
        throw new Error('Analytics reporting period is unavailable.');
    }

    const today = getReportingDate(now);
    let periodStart: CalendarDate;

    switch (period) {
        case 'today':
            periodStart = today;
            break;
        case 'week': {
            const calendarDay = new Date(
                Date.UTC(today.year, today.month - 1, today.day),
            ).getUTCDay();
            const daysSinceMonday = (calendarDay + 6) % 7;
            periodStart = shiftCalendarDate(today, -daysSinceMonday);
            break;
        }
        case 'month':
            periodStart = { ...today, day: 1 };
            break;
        case 'year':
            periodStart = { year: today.year, month: 1, day: 1 };
            break;
    }

    const from = reportingMidnightToUtc(periodStart);

    if (from.getTime() >= now.getTime()) {
        throw new Error('Analytics reporting period is unavailable.');
    }

    return { from: from.toISOString(), to: now.toISOString() };
}

function getTrendBucket(period: AnalyticsPeriod): AnalyticsTrendBucket {
    return period === 'year' ? 'month' : 'day';
}

function normalizeNumber(
    value: unknown,
    options: NumberOptions = {},
): number {
    if (value === null) return 0;

    const normalized =
        typeof value === 'number'
            ? value
            : typeof value === 'string' && value.trim().length > 0
                ? Number(value)
                : Number.NaN;

    if (
        !Number.isFinite(normalized) ||
        Math.abs(normalized) > Number.MAX_SAFE_INTEGER ||
        (options.integer && !Number.isInteger(normalized)) ||
        (options.min !== undefined && normalized < options.min) ||
        (options.max !== undefined && normalized > options.max)
    ) {
        throw new Error('Analytics result contains an invalid number.');
    }

    return Object.is(normalized, -0) ? 0 : normalized;
}

function normalizeTimestamp(value: unknown): string {
    if (
        typeof value !== 'string' ||
        value.length === 0 ||
        !Number.isFinite(Date.parse(value))
    ) {
        throw new Error('Analytics result contains an invalid timestamp.');
    }

    return value;
}

function mapOverviewRow(
    period: AnalyticsPeriod,
    row: PeriodSummaryRow,
): AnalyticsOverview {
    return {
        period,
        uniqueVisitors: normalizeNumber(row.unique_visitors, {
            integer: true,
            min: 0,
        }),
        sessions: normalizeNumber(row.sessions, { integer: true, min: 0 }),
        averageDailyVisitors: normalizeNumber(row.avg_daily_visitors, {
            min: 0,
        }),
        averageDailySessions: normalizeNumber(row.avg_daily_sessions, {
            min: 0,
        }),
    };
}

function mapTrendRow(row: VisitorTrendRow): AnalyticsTrendPoint {
    return {
        bucketStart: normalizeTimestamp(row.bucket_start),
        uniqueVisitors: normalizeNumber(row.unique_visitors, {
            integer: true,
            min: 0,
        }),
        sessions: normalizeNumber(row.sessions, { integer: true, min: 0 }),
    };
}

function mapSectionRow(row: SectionSummaryRow): AnalyticsSectionSummary {
    if (
        typeof row.section_key !== 'string' ||
        row.section_key.length > 64 ||
        !SECTION_KEY_PATTERN.test(row.section_key) ||
        row.section_key === 'home'
    ) {
        throw new Error('Analytics result contains an invalid section.');
    }

    return {
        sectionKey: row.section_key,
        uniqueVisitors: normalizeNumber(row.unique_visitors, {
            integer: true,
            min: 0,
        }),
        sessionsReached: normalizeNumber(row.sessions_reached, {
            integer: true,
            min: 0,
        }),
        totalViews: normalizeNumber(row.total_views, {
            integer: true,
            min: 0,
        }),
        totalVisibleMs: normalizeNumber(row.total_visible_ms, {
            integer: true,
            min: 0,
        }),
        averageVisibleMs: normalizeNumber(row.avg_visible_ms, { min: 0 }),
        averageMaxVisibility: normalizeNumber(row.avg_max_visibility, {
            min: 0,
            max: 1,
        }),
        reachPercentage: normalizeNumber(row.reach_percentage, {
            min: 0,
            max: 100,
        }),
    };
}

async function queryOverview(
    context: AnalyticsQueryContext,
): Promise<AnalyticsOverview> {
    const { data, error } = await context.supabase.rpc(
        'get_analytics_period_summary',
        {
            p_from: context.range.from,
            p_to: context.range.to,
            p_time_zone: ANALYTICS_REPORTING_TIME_ZONE,
        },
    );

    if (error) throwAnalyticsQueryError('overview', error);
    if (!data || data.length !== 1) {
        throwAnalyticsQueryError('overview', { code: 'invalid_result' });
    }

    try {
        return mapOverviewRow(context.period, data[0]);
    } catch {
        throwAnalyticsQueryError('overview', { code: 'invalid_data' });
    }
}

async function queryTrend(
    context: AnalyticsQueryContext,
): Promise<AnalyticsTrendPoint[]> {
    const { data, error } = await context.supabase.rpc(
        'get_analytics_visitor_trend',
        {
            p_from: context.range.from,
            p_to: context.range.to,
            p_bucket: getTrendBucket(context.period),
            p_time_zone: ANALYTICS_REPORTING_TIME_ZONE,
        },
    );

    if (error) throwAnalyticsQueryError('trend', error);
    if (!data) throwAnalyticsQueryError('trend', { code: 'invalid_result' });

    try {
        return data.map(mapTrendRow);
    } catch {
        throwAnalyticsQueryError('trend', { code: 'invalid_data' });
    }
}

async function querySections(
    context: AnalyticsQueryContext,
): Promise<AnalyticsSectionSummary[]> {
    const { data, error } = await context.supabase.rpc(
        'get_analytics_section_summary',
        {
            p_from: context.range.from,
            p_to: context.range.to,
        },
    );

    if (error) throwAnalyticsQueryError('sections', error);
    if (!data) throwAnalyticsQueryError('sections', { code: 'invalid_result' });

    try {
        return data
            .filter((row) => row.section_key !== 'home')
            .map(mapSectionRow);
    } catch {
        throwAnalyticsQueryError('sections', { code: 'invalid_data' });
    }
}

async function createAnalyticsQueryContext(
    period: AnalyticsPeriod,
): Promise<AnalyticsQueryContext> {
    await requireUser();

    return {
        period,
        range: getAnalyticsPeriodRange(period),
        supabase: await createClient(),
    };
}

function compareSectionKeys(
    first: AnalyticsSectionSummary,
    second: AnalyticsSectionSummary,
): number {
    return first.sectionKey.localeCompare(second.sectionKey);
}

function firstBy(
    sections: readonly AnalyticsSectionSummary[],
    comparator: (
        first: AnalyticsSectionSummary,
        second: AnalyticsSectionSummary,
    ) => number,
): AnalyticsSectionSummary | null {
    return sections.length > 0 ? [...sections].sort(comparator)[0] : null;
}

export function getAnalyticsSectionHighlights(
    sections: readonly AnalyticsSectionSummary[],
): AnalyticsSectionHighlights {
    return {
        mostVisited: firstBy(
            sections,
            (first, second) =>
                second.uniqueVisitors - first.uniqueVisitors ||
                second.reachPercentage - first.reachPercentage ||
                compareSectionKeys(first, second),
        ),
        leastVisited: firstBy(
            sections,
            (first, second) =>
                first.uniqueVisitors - second.uniqueVisitors ||
                first.reachPercentage - second.reachPercentage ||
                compareSectionKeys(first, second),
        ),
        highestEngagement: firstBy(
            sections,
            (first, second) =>
                second.averageVisibleMs - first.averageVisibleMs ||
                second.uniqueVisitors - first.uniqueVisitors ||
                compareSectionKeys(first, second),
        ),
        lowestEngagement: firstBy(
            sections,
            (first, second) =>
                first.averageVisibleMs - second.averageVisibleMs ||
                first.uniqueVisitors - second.uniqueVisitors ||
                compareSectionKeys(first, second),
        ),
    };
}

export async function getAnalyticsOverview(
    period: AnalyticsPeriod,
): Promise<AnalyticsOverview> {
    return queryOverview(await createAnalyticsQueryContext(period));
}

export async function getAnalyticsTrend(
    period: AnalyticsPeriod,
): Promise<AnalyticsTrendPoint[]> {
    return queryTrend(await createAnalyticsQueryContext(period));
}

export async function getAnalyticsSectionSummary(
    period: AnalyticsPeriod,
): Promise<AnalyticsSectionSummary[]> {
    return querySections(await createAnalyticsQueryContext(period));
}

export async function getAnalyticsDashboardData(
    period: AnalyticsPeriod,
): Promise<AnalyticsDashboardData> {
    const context = await createAnalyticsQueryContext(period);
    const [overview, trend, sections] = await Promise.all([
        queryOverview(context),
        queryTrend(context),
        querySections(context),
    ]);

    return {
        overview,
        trend,
        sections,
        highlights: getAnalyticsSectionHighlights(sections),
    };
}
