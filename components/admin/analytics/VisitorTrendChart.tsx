'use client';

import { useMemo } from 'react';
import { useReducedMotion } from 'motion/react';
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    type TooltipContentProps,
} from 'recharts';

import type {
    AnalyticsPeriod,
    AnalyticsTrendPoint,
} from '@/features/admin/analytics/types';
import {
    formatChartBucketLabel,
    formatChartTooltipLabel,
    formatMetricNumber,
} from './analyticsFormatting';

interface VisitorTrendChartProps {
    period: AnalyticsPeriod;
    trend: readonly AnalyticsTrendPoint[];
}

interface VisitorChartDatum {
    axisLabel: string;
    bucketStart: string;
    sessions: number;
    tooltipLabel: string;
    uniqueVisitors: number;
}

const VISITOR_COLOR = '#c36dfc';
const SESSION_COLOR = '#65c7d4';

function VisitorTooltip({
    active,
    payload,
}: TooltipContentProps) {
    const datum = payload[0]?.payload as VisitorChartDatum | undefined;

    if (!active || !datum) return null;

    return (
        <div className="min-w-48 rounded-lg border border-white/[0.11] bg-[#090a0d]/95 px-3.5 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/48">
                {datum.tooltipLabel}
            </p>
            <dl className="mt-3 space-y-2.5">
                <div className="flex items-center justify-between gap-6">
                    <dt className="flex items-center gap-2 text-xs text-[var(--muted)]/64">
                        <span
                            aria-hidden="true"
                            className="size-1.5 rounded-full bg-[#c36dfc]"
                        />
                        Visitors
                    </dt>
                    <dd className="font-mono text-xs font-bold tabular-nums text-[var(--text)]">
                        {formatMetricNumber(datum.uniqueVisitors)}
                    </dd>
                </div>
                <div className="flex items-center justify-between gap-6">
                    <dt className="flex items-center gap-2 text-xs text-[var(--muted)]/64">
                        <span
                            aria-hidden="true"
                            className="size-1.5 rounded-full bg-[#65c7d4]"
                        />
                        Sessions
                    </dt>
                    <dd className="font-mono text-xs font-bold tabular-nums text-[var(--text)]">
                        {formatMetricNumber(datum.sessions)}
                    </dd>
                </div>
            </dl>
        </div>
    );
}

function VisitorLegend() {
    return (
        <div
            aria-label="Chart series"
            className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-white/[0.065] px-4 py-3 sm:px-5"
        >
            <span className="flex items-center gap-2 text-[11px] font-bold text-[var(--muted)]/62">
                <span aria-hidden="true" className="h-0.5 w-4 bg-[#c36dfc]" />
                Unique visitors
            </span>
            <span className="flex items-center gap-2 text-[11px] font-bold text-[var(--muted)]/62">
                <span aria-hidden="true" className="h-0.5 w-4 bg-[#65c7d4]" />
                Sessions
            </span>
        </div>
    );
}

export default function VisitorTrendChart({
    period,
    trend,
}: VisitorTrendChartProps) {
    const shouldReduceMotion = useReducedMotion();
    const chartData = useMemo<VisitorChartDatum[]>(
        () =>
            trend.map((point) => ({
                axisLabel: formatChartBucketLabel(point.bucketStart, period),
                bucketStart: point.bucketStart,
                sessions: point.sessions,
                tooltipLabel: formatChartTooltipLabel(point.bucketStart, period),
                uniqueVisitors: point.uniqueVisitors,
            })),
        [period, trend],
    );
    const hasRecordedActivity = chartData.some(
        (point) => point.uniqueVisitors > 0 || point.sessions > 0,
    );

    return (
        <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#07080a]">
            <VisitorLegend />

            {chartData.length === 0 || !hasRecordedActivity ? (
                <div className="grid h-[19rem] place-items-center px-5 py-10 text-center sm:h-[22rem]">
                    <div>
                        <p className="text-sm font-extrabold text-[var(--text)]">
                            {chartData.length === 0
                                ? 'No visitor trend available'
                                : 'No visitor activity recorded'}
                        </p>
                        <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-[var(--muted)]/52">
                            {chartData.length === 0
                                ? 'This reporting period has not produced trend data yet.'
                                : 'Every reporting bucket in this period is currently zero.'}
                        </p>
                    </div>
                </div>
            ) : (
                <div
                    role="img"
                    aria-label="Line chart comparing unique visitors and sessions over the selected reporting period"
                    className="h-[19rem] min-w-0 px-1 pb-3 pt-5 sm:h-[22rem] sm:px-3 sm:pb-4"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            accessibilityLayer
                            data={chartData}
                            margin={{ bottom: 2, left: -14, right: 10, top: 8 }}
                        >
                            <CartesianGrid
                                vertical={false}
                                stroke="rgba(255,255,255,0.055)"
                                strokeDasharray="3 5"
                            />
                            <XAxis
                                dataKey="axisLabel"
                                axisLine={false}
                                interval="preserveStartEnd"
                                minTickGap={period === 'month' ? 26 : 18}
                                tick={{ fill: 'rgba(232,234,236,0.43)', fontSize: 10 }}
                                tickLine={false}
                                tickMargin={12}
                            />
                            <YAxis
                                allowDecimals={false}
                                axisLine={false}
                                domain={[0, (dataMax: number) => Math.max(1, Math.ceil(dataMax))]}
                                tick={{ fill: 'rgba(232,234,236,0.4)', fontSize: 10 }}
                                tickFormatter={(value: number) => formatMetricNumber(value)}
                                tickLine={false}
                                width={42}
                            />
                            <Tooltip
                                content={VisitorTooltip}
                                cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}
                                isAnimationActive={shouldReduceMotion !== true}
                            />
                            <Line
                                dataKey="uniqueVisitors"
                                dot={
                                    chartData.length === 1
                                        ? { fill: VISITOR_COLOR, r: 3, strokeWidth: 0 }
                                        : false
                                }
                                activeDot={{ fill: VISITOR_COLOR, r: 4, stroke: '#07080a', strokeWidth: 2 }}
                                isAnimationActive={shouldReduceMotion !== true}
                                animationDuration={550}
                                animationEasing="ease-out"
                                name="Unique visitors"
                                stroke={VISITOR_COLOR}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.25}
                                type="monotone"
                            />
                            <Line
                                dataKey="sessions"
                                dot={
                                    chartData.length === 1
                                        ? { fill: SESSION_COLOR, r: 3, strokeWidth: 0 }
                                        : false
                                }
                                activeDot={{ fill: SESSION_COLOR, r: 4, stroke: '#07080a', strokeWidth: 2 }}
                                isAnimationActive={shouldReduceMotion !== true}
                                animationDuration={550}
                                animationEasing="ease-out"
                                name="Sessions"
                                stroke={SESSION_COLOR}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                type="monotone"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            <table className="sr-only">
                <caption>Visitor and session totals by reporting bucket</caption>
                <thead>
                    <tr>
                        <th scope="col">Bucket</th>
                        <th scope="col">Unique visitors</th>
                        <th scope="col">Sessions</th>
                    </tr>
                </thead>
                <tbody>
                    {chartData.map((point) => (
                        <tr key={point.bucketStart}>
                            <th scope="row">{point.tooltipLabel}</th>
                            <td>{formatMetricNumber(point.uniqueVisitors)}</td>
                            <td>{formatMetricNumber(point.sessions)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
