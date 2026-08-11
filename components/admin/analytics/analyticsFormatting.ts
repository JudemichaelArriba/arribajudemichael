import {
    ANALYTICS_REPORTING_TIME_ZONE,
    type AnalyticsPeriod,
} from '@/features/admin/analytics/types';

const INTEGER_FORMATTER = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
});

const DECIMAL_FORMATTER = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
});

const COMPACT_DECIMAL_FORMATTER = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
});

const MONTH_DAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: ANALYTICS_REPORTING_TIME_ZONE,
});

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: ANALYTICS_REPORTING_TIME_ZONE,
});

const MONTH_BUCKET_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: ANALYTICS_REPORTING_TIME_ZONE,
});

const FULL_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    timeZone: ANALYTICS_REPORTING_TIME_ZONE,
    year: 'numeric',
});

const FULL_MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    timeZone: ANALYTICS_REPORTING_TIME_ZONE,
    year: 'numeric',
});

const SECTION_LABELS: Readonly<Record<string, string>> = {
    about: 'About Me',
    certificates: 'Certificates',
    contact: 'Contact',
    experience: 'Experience',
    projects: 'Projects',
    techstack: 'Tech Stack',
    'what-i-do': 'What I Do',
};

export function formatMetricNumber(
    value: number,
    maximumFractionDigits = 0,
): string {
    if (!Number.isFinite(value)) return '--';

    return maximumFractionDigits === 0
        ? INTEGER_FORMATTER.format(value)
        : DECIMAL_FORMATTER.format(value);
}

export function formatDuration(milliseconds: number): string {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) return '--';
    if (milliseconds < 1_000) return `${INTEGER_FORMATTER.format(Math.round(milliseconds))}ms`;

    const seconds = milliseconds / 1_000;
    if (seconds < 60) return `${COMPACT_DECIMAL_FORMATTER.format(seconds)}s`;

    const roundedSeconds = Math.round(seconds);
    const hours = Math.floor(roundedSeconds / 3_600);
    const minutes = Math.floor((roundedSeconds % 3_600) / 60);
    const remainingSeconds = roundedSeconds % 60;

    if (hours > 0) {
        return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
    }

    return `${minutes}m${remainingSeconds > 0 ? ` ${remainingSeconds}s` : ''}`;
}

export function formatPercentage(
    value: number,
    source: 'percentage' | 'ratio' = 'percentage',
): string {
    if (!Number.isFinite(value)) return '--';

    const percentage = source === 'ratio' ? value * 100 : value;
    return `${COMPACT_DECIMAL_FORMATTER.format(percentage)}%`;
}

export function formatSectionLabel(sectionKey: string): string {
    const knownLabel = SECTION_LABELS[sectionKey];
    if (knownLabel) return knownLabel;

    return sectionKey
        .split(/[-_]+/)
        .filter(Boolean)
        .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
        .join(' ');
}

export function formatChartBucketLabel(
    bucketStart: string,
    period: AnalyticsPeriod,
): string {
    const date = new Date(bucketStart);
    if (!Number.isFinite(date.getTime())) return '--';

    if (period === 'week') return WEEKDAY_FORMATTER.format(date);
    if (period === 'year') return MONTH_BUCKET_FORMATTER.format(date);

    return MONTH_DAY_FORMATTER.format(date);
}

export function formatChartTooltipLabel(
    bucketStart: string,
    period: AnalyticsPeriod,
): string {
    const date = new Date(bucketStart);
    if (!Number.isFinite(date.getTime())) return '--';

    return period === 'year'
        ? FULL_MONTH_FORMATTER.format(date)
        : FULL_DATE_FORMATTER.format(date);
}
