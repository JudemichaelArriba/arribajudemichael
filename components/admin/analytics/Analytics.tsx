import Link from 'next/link';
import {
    BarChart3,
    CircleAlert,
    ListFilter,
    RefreshCw,
    Rows3,
    type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import {
    AdminPageHeader,
    ManagementPage,
} from '@/components/admin/layout/ManagementPage';
import type {
    AnalyticsDashboardData,
    AnalyticsPeriod,
    AnalyticsSectionSummary,
} from '@/features/admin/analytics/types';
import {
    formatDuration,
    formatMetricNumber,
    formatPercentage,
    formatSectionLabel,
} from './analyticsFormatting';
import SectionPerformanceChart from './SectionPerformanceChart';
import VisitorTrendChart from './VisitorTrendChart';

interface AnalyticsProps {
    data: AnalyticsDashboardData | null;
    period: AnalyticsPeriod;
    unavailable?: boolean;
}

interface SectionHeadingProps {
    description: string;
    icon: LucideIcon;
    id: string;
    title: string;
    trailing?: ReactNode;
}

interface HighlightCardProps {
    label: string;
    metricLabel: string;
    metricValue: string;
    section: AnalyticsSectionSummary | null;
}

const PERIOD_OPTIONS: readonly {
    label: string;
    value: AnalyticsPeriod;
}[] = [
    { label: 'Today', value: 'today' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'Year', value: 'year' },
];

const PERIOD_LABELS: Readonly<Record<AnalyticsPeriod, string>> = {
    today: 'Today',
    week: 'This week',
    month: 'This month',
    year: 'This year',
};

function SectionHeading({
    description,
    icon: Icon,
    id,
    title,
    trailing,
}: SectionHeadingProps) {
    return (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <h2
                    id={id}
                    className="flex items-center gap-2.5 text-sm font-extrabold tracking-normal text-[var(--text)]"
                >
                    <Icon
                        aria-hidden="true"
                        size={17}
                        strokeWidth={1.8}
                        className="shrink-0 text-[var(--signal)]/72"
                    />
                    {title}
                </h2>
                <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-[var(--muted)]/45">
                    {description}
                </p>
            </div>
            {trailing ? <div className="shrink-0">{trailing}</div> : null}
        </div>
    );
}

function PeriodSelector({ period }: { period: AnalyticsPeriod }) {
    return (
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/42">
                    Reporting period
                </p>
                <p className="mt-1.5 text-xs text-[var(--muted)]/55">
                    Boundaries use Asia/Manila time.
                </p>
            </div>

            <nav
                aria-label="Analytics reporting period"
                className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:max-w-xl"
            >
                {PERIOD_OPTIONS.map((option) => {
                    const isActive = period === option.value;

                    return (
                        <Link
                            key={option.value}
                            href={`/dashboard/analytics?period=${option.value}`}
                            prefetch={false}
                            aria-current={isActive ? 'page' : undefined}
                            className={`inline-flex min-h-11 items-center justify-center rounded-md border px-3 text-sm font-bold transition-[border-color,background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 motion-reduce:transition-none ${
                                isActive
                                    ? 'border-[var(--signal)]/32 bg-[var(--signal)]/[0.1] text-[var(--signal)]'
                                    : 'border-white/[0.07] bg-black/25 text-[var(--muted)]/58 hover:border-white/[0.13] hover:bg-white/[0.035] hover:text-[var(--text)]'
                            }`}
                        >
                            {option.label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}

function AnalyticsHeader({ period }: { period: AnalyticsPeriod }) {
    return (
        <AdminPageHeader
            eyebrow="Portfolio intelligence / Reporting"
            title="Analytics"
            headingId="analytics-page-heading"
            description="Review visitor reach and section engagement across the public portfolio."
        >
            <PeriodSelector period={period} />
        </AdminPageHeader>
    );
}

function HighlightCard({
    label,
    metricLabel,
    metricValue,
    section,
}: HighlightCardProps) {
    return (
        <div className="min-h-36 rounded-lg border border-white/[0.08] bg-[#07080a] p-4 sm:p-5">
            <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/42">
                {label}
            </dt>
            <dd className="mt-4 text-xl font-extrabold leading-tight text-[var(--text)]">
                {section ? formatSectionLabel(section.sectionKey) : 'No section data'}
            </dd>
            <dd className="mt-2 flex items-baseline gap-2 text-sm text-[var(--muted)]/56">
                <span className="font-mono font-bold tabular-nums text-[var(--signal)]/78">
                    {section ? metricValue : '--'}
                </span>
                <span>{metricLabel}</span>
            </dd>
        </div>
    );
}

function MobileSectionRecord({
    index,
    section,
}: {
    index: number;
    section: AnalyticsSectionSummary;
}) {
    const metrics = [
        ['Unique visitors', formatMetricNumber(section.uniqueVisitors)],
        ['Sessions reached', formatMetricNumber(section.sessionsReached)],
        ['Reach', formatPercentage(section.reachPercentage)],
        ['Total views', formatMetricNumber(section.totalViews)],
        ['Avg. engagement', formatDuration(section.averageVisibleMs)],
        ['Avg. visibility', formatPercentage(section.averageMaxVisibility, 'ratio')],
    ] as const;

    return (
        <li className="rounded-lg border border-white/[0.08] bg-[#07080a] p-4 sm:p-5">
            <div className="border-b border-white/[0.065] pb-4">
                <div className="min-w-0">
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/38">
                        Rank {String(index + 1).padStart(2, '0')}
                    </p>
                    <h3 className="mt-1.5 truncate text-base font-extrabold text-[var(--text)]">
                        {formatSectionLabel(section.sectionKey)}
                    </h3>
                </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4">
                {metrics.map(([label, value]) => (
                    <div key={label} className="min-w-0">
                        <dt className="text-[10px] leading-snug text-[var(--muted)]/42">
                            {label}
                        </dt>
                        <dd className="mt-1 font-mono text-sm font-bold tabular-nums text-[var(--text)]/82">
                            {value}
                        </dd>
                    </div>
                ))}
            </dl>
        </li>
    );
}

function AnalyticsUnavailable({ period }: { period: AnalyticsPeriod }) {
    return (
        <section
            aria-labelledby="analytics-unavailable-heading"
            className="mt-8 grid min-h-80 place-items-center rounded-lg border border-white/[0.08] bg-[#07080a] px-5 py-12 text-center"
        >
            <div>
                <CircleAlert
                    aria-hidden="true"
                    size={27}
                    strokeWidth={1.6}
                    className="mx-auto text-[var(--signal)]/62"
                />
                <h2
                    id="analytics-unavailable-heading"
                    className="mt-4 text-lg font-extrabold text-[var(--text)]"
                >
                    Analytics report unavailable
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]/60">
                    The reporting service could not load this period. Retry the secure connection.
                </p>
                <form method="get" action="/dashboard/analytics" className="mt-5">
                    <input type="hidden" name="period" value={period} />
                    <button
                        type="submit"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.025] px-4 text-sm font-bold text-[var(--text)] transition-colors duration-200 hover:border-[var(--signal)]/28 hover:bg-[var(--signal)]/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 motion-reduce:transition-none"
                    >
                        <RefreshCw aria-hidden="true" size={16} strokeWidth={1.8} />
                        Retry report
                    </button>
                </form>
            </div>
        </section>
    );
}

function AnalyticsReport({
    data,
    period,
}: {
    data: AnalyticsDashboardData;
    period: AnalyticsPeriod;
}) {
    const kpis = [
        {
            label: 'Unique visitors',
            note: 'Period total',
            value: formatMetricNumber(data.overview.uniqueVisitors),
        },
        {
            label: 'Sessions',
            note: 'Period total',
            value: formatMetricNumber(data.overview.sessions),
        },
        {
            label: 'Average daily visitors',
            note: 'Daily mean',
            value: formatMetricNumber(data.overview.averageDailyVisitors, 2),
        },
        {
            label: 'Average daily sessions',
            note: 'Daily mean',
            value: formatMetricNumber(data.overview.averageDailySessions, 2),
        },
    ] as const;
    const { highlights } = data;
    const trendCadence = period === 'year' ? 'Monthly buckets' : 'Daily buckets';

    return (
        <>
            <section aria-labelledby="analytics-overview-heading" className="mt-8">
                <SectionHeading
                    id="analytics-overview-heading"
                    icon={ListFilter}
                    title="Overview"
                    description={`Core traffic totals for ${PERIOD_LABELS[period].toLowerCase()}.`}
                />
                <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    {kpis.map((metric) => (
                        <div
                            key={metric.label}
                            className="flex min-h-36 min-w-0 flex-col rounded-lg border border-white/[0.08] bg-[#07080a] p-4 sm:p-5"
                        >
                            <dt className="max-w-40 text-xs font-bold leading-snug text-[var(--muted)]/56">
                                {metric.label}
                            </dt>
                            <dd className="mt-4 font-display text-2xl font-extrabold tabular-nums tracking-normal text-[var(--text)] sm:text-3xl">
                                {metric.value}
                            </dd>
                            <p className="mt-auto pt-3 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/34">
                                {metric.note}
                            </p>
                        </div>
                    ))}
                </dl>
            </section>

            <section aria-labelledby="analytics-trend-heading" className="mt-10">
                <SectionHeading
                    id="analytics-trend-heading"
                    icon={BarChart3}
                    title="Visitor traffic"
                    description="Visitor and session totals grouped by the reporting cadence for this period."
                    trailing={
                        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/42">
                            {trendCadence} / {formatMetricNumber(data.trend.length)}
                        </span>
                    }
                />
                <VisitorTrendChart period={period} trend={data.trend} />
            </section>

            <section aria-labelledby="analytics-performance-chart-heading" className="mt-10">
                <SectionHeading
                    id="analytics-performance-chart-heading"
                    icon={Rows3}
                    title="Section performance"
                    description="Compare portfolio reach and average engagement across tracked sections."
                />
                <SectionPerformanceChart sections={data.sections} />
            </section>

            <section aria-labelledby="analytics-highlights-heading" className="mt-10">
                <SectionHeading
                    id="analytics-highlights-heading"
                    icon={Rows3}
                    title="Section highlights"
                    description="Reach and engagement leaders derived from the current report."
                />
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <HighlightCard
                        label="Most visited"
                        section={highlights.mostVisited}
                        metricValue={formatMetricNumber(highlights.mostVisited?.uniqueVisitors ?? 0)}
                        metricLabel="unique visitors"
                    />
                    <HighlightCard
                        label="Least visited"
                        section={highlights.leastVisited}
                        metricValue={formatMetricNumber(highlights.leastVisited?.uniqueVisitors ?? 0)}
                        metricLabel="unique visitors"
                    />
                    <HighlightCard
                        label="Highest engagement"
                        section={highlights.highestEngagement}
                        metricValue={formatDuration(highlights.highestEngagement?.averageVisibleMs ?? 0)}
                        metricLabel="average engagement"
                    />
                    <HighlightCard
                        label="Lowest engagement"
                        section={highlights.lowestEngagement}
                        metricValue={formatDuration(highlights.lowestEngagement?.averageVisibleMs ?? 0)}
                        metricLabel="average engagement"
                    />
                </dl>
            </section>

            <section aria-labelledby="analytics-sections-heading" className="mt-10">
                <SectionHeading
                    id="analytics-sections-heading"
                    icon={Rows3}
                    title="Section performance breakdown"
                    description="Every tracked portfolio section in the server-returned reporting order."
                    trailing={
                        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/42">
                            {formatMetricNumber(data.sections.length)} tracked
                        </span>
                    }
                />

                {data.sections.length === 0 ? (
                    <div className="grid min-h-56 place-items-center rounded-lg border border-dashed border-white/[0.1] bg-[#07080a] px-5 py-10 text-center">
                        <div>
                            <span className="font-display text-4xl font-extrabold tabular-nums text-[var(--signal)]/42">
                                00
                            </span>
                            <h3 className="mt-3 text-lg font-extrabold text-[var(--text)]">
                                No section engagement yet
                            </h3>
                            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]/60">
                                No section engagement has been recorded for this period yet.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        <ol className="space-y-3 xl:hidden">
                            {data.sections.map((section, index) => (
                                <MobileSectionRecord
                                    key={section.sectionKey}
                                    index={index}
                                    section={section}
                                />
                            ))}
                        </ol>

                        <div className="hidden overflow-hidden rounded-lg border border-white/[0.08] bg-[#07080a] xl:block">
                            <table className="w-full border-collapse">
                                <caption className="sr-only">
                                    Performance metrics for tracked portfolio sections
                                </caption>
                                <thead className="border-b border-white/[0.07] bg-[#050607]">
                                    <tr>
                                        {[
                                            'Section',
                                            'Unique visitors',
                                            'Sessions reached',
                                            'Reach',
                                            'Total views',
                                            'Avg. engagement',
                                            'Avg. visibility',
                                        ].map((heading, index) => (
                                            <th
                                                key={heading}
                                                scope="col"
                                                className={`px-4 py-3.5 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]/42 xl:px-5 ${index === 0 ? 'text-left' : 'text-right'}`}
                                            >
                                                {heading}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.06]">
                                    {data.sections.map((section, index) => (
                                        <tr
                                            key={section.sectionKey}
                                            className="transition-colors hover:bg-white/[0.018] motion-reduce:transition-none"
                                        >
                                            <th scope="row" className="px-4 py-4 text-left xl:px-5">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-[9px] font-bold tabular-nums text-[var(--muted)]/32">
                                                        {String(index + 1).padStart(2, '0')}
                                                    </span>
                                                    <span className="text-sm font-extrabold text-[var(--text)]">
                                                        {formatSectionLabel(section.sectionKey)}
                                                    </span>
                                                </div>
                                            </th>
                                            <td className="px-4 py-4 text-right font-mono text-xs font-bold tabular-nums text-[var(--text)]/78 xl:px-5">
                                                {formatMetricNumber(section.uniqueVisitors)}
                                            </td>
                                            <td className="px-4 py-4 text-right font-mono text-xs font-bold tabular-nums text-[var(--text)]/62 xl:px-5">
                                                {formatMetricNumber(section.sessionsReached)}
                                            </td>
                                            <td className="px-4 py-4 text-right font-mono text-xs font-bold tabular-nums text-[var(--signal)]/76 xl:px-5">
                                                {formatPercentage(section.reachPercentage)}
                                            </td>
                                            <td className="px-4 py-4 text-right font-mono text-xs font-bold tabular-nums text-[var(--text)]/62 xl:px-5">
                                                {formatMetricNumber(section.totalViews)}
                                            </td>
                                            <td className="px-4 py-4 text-right font-mono text-xs font-bold tabular-nums text-[var(--text)]/72 xl:px-5">
                                                {formatDuration(section.averageVisibleMs)}
                                            </td>
                                            <td className="px-4 py-4 text-right font-mono text-xs font-bold tabular-nums text-[var(--text)]/62 xl:px-5">
                                                {formatPercentage(section.averageMaxVisibility, 'ratio')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </section>
        </>
    );
}

export default function Analytics({
    data,
    period,
    unavailable = false,
}: AnalyticsProps) {
    return (
        <ManagementPage>
            <section aria-labelledby="analytics-page-heading">
                <AnalyticsHeader period={period} />
                {unavailable || data === null ? (
                    <AnalyticsUnavailable period={period} />
                ) : (
                    <AnalyticsReport data={data} period={period} />
                )}
            </section>
        </ManagementPage>
    );
}
