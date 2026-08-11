import Link from 'next/link';
import { ArrowUpRight, BarChart3, CircleAlert } from 'lucide-react';

import {
    AdminPageHeader,
    ManagementPage,
} from '@/components/admin/layout/ManagementPage';
import {
    formatMetricNumber,
    formatPercentage,
    formatSectionLabel,
} from '@/components/admin/analytics/analyticsFormatting';
import VisitorTrendChart from '@/components/admin/analytics/VisitorTrendChart';
import type { WeeklyAnalyticsSummary } from '@/features/admin/analytics/types';

interface DashboardOverviewProps {
    analyticsSummary: WeeklyAnalyticsSummary | null;
    analyticsUnavailable?: boolean;
}

interface WeeklyMetricCardProps {
    label: string;
    note: string;
    value: string;
    valueClassName?: string;
    valueSizeClassName?: string;
}

function WeeklyMetricCard({
    label,
    note,
    value,
    valueClassName = 'text-[var(--text)]',
    valueSizeClassName = 'text-xl sm:text-3xl',
}: WeeklyMetricCardProps) {
    return (
        <div className="flex min-h-32 min-w-0 flex-col rounded-lg border border-white/[0.08] bg-[#07080a] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] sm:p-5">
            <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/46">
                {label}
            </dt>
            <dd
                className={`mt-3 min-w-0 break-words font-display font-extrabold leading-tight tracking-normal ${valueSizeClassName} ${valueClassName}`}
            >
                {value}
            </dd>
            <p className="mt-auto pt-3 text-[11px] leading-relaxed text-[var(--muted)]/42">
                {note}
            </p>
        </div>
    );
}

export default function DashboardOverview({
    analyticsSummary,
    analyticsUnavailable = false,
}: DashboardOverviewProps) {
    const mostVisited = analyticsSummary?.mostVisited ?? null;

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

            <section aria-labelledby="dashboard-analytics-heading" className="mt-8">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                            <BarChart3
                                aria-hidden="true"
                                size={17}
                                strokeWidth={1.8}
                                className="shrink-0 text-[var(--signal)]/72"
                            />
                            <h2
                                id="dashboard-analytics-heading"
                                className="text-sm font-extrabold tracking-normal text-[var(--text)]"
                            >
                                Analytics Overview
                            </h2>
                            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--signal)]/62">
                                This week
                            </span>
                        </div>
                        <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-[var(--muted)]/45">
                            A concise view of portfolio traffic since Monday.
                        </p>
                    </div>

                    <Link
                        href="/dashboard/analytics?period=week"
                        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg px-2 text-xs font-bold text-[var(--muted)]/64 transition-colors duration-200 hover:bg-white/[0.035] hover:text-[var(--signal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 motion-reduce:transition-none"
                    >
                        View full analytics
                        <ArrowUpRight aria-hidden="true" size={14} strokeWidth={1.8} />
                    </Link>
                </div>

                {analyticsUnavailable || analyticsSummary === null ? (
                    <div className="flex min-h-32 items-start gap-3 rounded-lg border border-white/[0.08] bg-[#07080a] p-4 sm:items-center sm:p-5">
                        <CircleAlert
                            aria-hidden="true"
                            size={20}
                            strokeWidth={1.7}
                            className="mt-0.5 shrink-0 text-[var(--signal)]/68 sm:mt-0"
                        />
                        <div>
                            <h3 className="text-sm font-extrabold text-[var(--text)]">
                                Weekly analytics unavailable
                            </h3>
                            <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]/52">
                                The summary could not be loaded. The rest of the workspace remains available.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                            <WeeklyMetricCard
                                label="Visitors This Week"
                                value={formatMetricNumber(analyticsSummary.overview.uniqueVisitors)}
                                note="Unique portfolio visitors"
                            />
                            <WeeklyMetricCard
                                label="Sessions This Week"
                                value={formatMetricNumber(analyticsSummary.overview.sessions)}
                                note="Sessions started this week"
                            />
                            <WeeklyMetricCard
                                label="Average Visitors / Day"
                                value={formatMetricNumber(
                                    analyticsSummary.overview.averageDailyVisitors,
                                    2,
                                )}
                                note="Daily mean for the period"
                            />
                            <WeeklyMetricCard
                                label="Most Visited Section"
                                value={
                                    mostVisited
                                        ? formatSectionLabel(mostVisited.sectionKey)
                                        : 'No data yet'
                                }
                                note={
                                    mostVisited
                                        ? `${formatPercentage(mostVisited.reachPercentage)} reach this week`
                                        : 'No section activity recorded'
                                }
                                valueClassName={
                                    mostVisited
                                        ? 'text-[var(--signal)]'
                                        : 'text-[var(--muted)]/58'
                                }
                                valueSizeClassName="text-base sm:text-xl"
                            />
                        </dl>

                        <div className="mt-3">
                            <VisitorTrendChart
                                period="week"
                                trend={analyticsSummary.trend}
                                variant="compact"
                            />
                        </div>
                    </>
                )}
            </section>
        </ManagementPage>
    );
}
