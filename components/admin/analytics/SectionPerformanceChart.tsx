'use client';

import { useMemo, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    type TooltipContentProps,
} from 'recharts';

import type { AnalyticsSectionSummary } from '@/features/admin/analytics/types';
import {
    formatDuration,
    formatMetricNumber,
    formatPercentage,
    formatSectionLabel,
} from './analyticsFormatting';

interface SectionPerformanceChartProps {
    sections: readonly AnalyticsSectionSummary[];
}

type PerformanceMode = 'reach' | 'engagement';

interface SectionChartDatum extends AnalyticsSectionSummary {
    label: string;
    value: number;
}

interface SectionTooltipProps extends TooltipContentProps {
    mode: PerformanceMode;
}

const PERFORMANCE_COLOR = '#c36dfc';

function SectionTooltip({ active, mode, payload }: SectionTooltipProps) {
    const datum = payload[0]?.payload as SectionChartDatum | undefined;

    if (!active || !datum) return null;

    return (
        <div className="min-w-56 rounded-lg border border-white/[0.11] bg-[#090a0d]/95 px-3.5 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <p className="text-xs font-extrabold text-[var(--text)]">{datum.label}</p>
            <dl className="mt-3 space-y-2">
                {mode === 'reach' ? (
                    <>
                        <div className="flex items-center justify-between gap-6">
                            <dt className="text-xs text-[var(--muted)]/58">Unique visitors</dt>
                            <dd className="font-mono text-xs font-bold tabular-nums text-[var(--text)]">
                                {formatMetricNumber(datum.uniqueVisitors)}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-6">
                            <dt className="text-xs text-[var(--muted)]/58">Reach</dt>
                            <dd className="font-mono text-xs font-bold tabular-nums text-[var(--signal)]">
                                {formatPercentage(datum.reachPercentage)}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-6">
                            <dt className="text-xs text-[var(--muted)]/58">Views</dt>
                            <dd className="font-mono text-xs font-bold tabular-nums text-[var(--text)]">
                                {formatMetricNumber(datum.totalViews)}
                            </dd>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center justify-between gap-6">
                            <dt className="text-xs text-[var(--muted)]/58">Avg. engagement</dt>
                            <dd className="font-mono text-xs font-bold tabular-nums text-[var(--signal)]">
                                {formatDuration(datum.averageVisibleMs)}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-6">
                            <dt className="text-xs text-[var(--muted)]/58">Avg. visibility</dt>
                            <dd className="font-mono text-xs font-bold tabular-nums text-[var(--text)]">
                                {formatPercentage(datum.averageMaxVisibility, 'ratio')}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-6">
                            <dt className="text-xs text-[var(--muted)]/58">Views</dt>
                            <dd className="font-mono text-xs font-bold tabular-nums text-[var(--text)]">
                                {formatMetricNumber(datum.totalViews)}
                            </dd>
                        </div>
                    </>
                )}
            </dl>
        </div>
    );
}

export default function SectionPerformanceChart({
    sections,
}: SectionPerformanceChartProps) {
    const [mode, setMode] = useState<PerformanceMode>('reach');
    const shouldReduceMotion = useReducedMotion();
    const chartData = useMemo<SectionChartDatum[]>(() => {
        const visibleSections = sections.filter(
            (section) => section.sectionKey.toLowerCase() !== 'home',
        );

        return [...visibleSections]
            .sort((first, second) => {
                if (mode === 'reach') {
                    return (
                        second.uniqueVisitors - first.uniqueVisitors ||
                        second.reachPercentage - first.reachPercentage ||
                        first.sectionKey.localeCompare(second.sectionKey)
                    );
                }

                return (
                    second.averageVisibleMs - first.averageVisibleMs ||
                    second.uniqueVisitors - first.uniqueVisitors ||
                    first.sectionKey.localeCompare(second.sectionKey)
                );
            })
            .map((section) => ({
                ...section,
                label: formatSectionLabel(section.sectionKey),
                value:
                    mode === 'reach'
                        ? section.reachPercentage
                        : section.averageVisibleMs,
            }));
    }, [mode, sections]);
    const chartHeight = Math.min(520, Math.max(300, chartData.length * 48 + 72));
    const hasRecordedValue = chartData.some((section) => section.value > 0);

    return (
        <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#07080a]">
            <div className="flex flex-col gap-3 border-b border-white/[0.065] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                    <p className="text-xs font-extrabold text-[var(--text)]">
                        {mode === 'reach'
                            ? 'Which sections are reached most?'
                            : 'Which sections hold attention longest?'}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]/46">
                        {mode === 'reach'
                            ? 'Ranked by unique visitors; bars show reach percentage.'
                            : 'Ranked and measured by average visible time.'}
                    </p>
                </div>

                <div
                    aria-label="Section performance metric"
                    role="group"
                    className="grid grid-cols-2 rounded-lg border border-white/[0.08] bg-black/30 p-1"
                >
                    {(['reach', 'engagement'] as const).map((option) => {
                        const isActive = mode === option;

                        return (
                            <button
                                key={option}
                                type="button"
                                aria-pressed={isActive}
                                onClick={() => setMode(option)}
                                className={`inline-flex min-h-10 items-center justify-center rounded-md px-3 text-xs font-bold capitalize transition-[background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 motion-reduce:transition-none ${
                                    isActive
                                        ? 'bg-[var(--signal)]/[0.12] text-[var(--signal)]'
                                        : 'text-[var(--muted)]/52 hover:bg-white/[0.035] hover:text-[var(--text)]'
                                }`}
                            >
                                {option}
                            </button>
                        );
                    })}
                </div>
            </div>

            {chartData.length === 0 || !hasRecordedValue ? (
                <div
                    className="grid place-items-center px-5 py-10 text-center"
                    style={{ height: chartHeight }}
                >
                    <div>
                        <p className="text-sm font-extrabold text-[var(--text)]">
                            {chartData.length === 0
                                ? 'No section performance available'
                                : `No ${mode} activity recorded`}
                        </p>
                        <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-[var(--muted)]/52">
                            {chartData.length === 0
                                ? 'No tracked sections are available for this reporting period.'
                                : `Every tracked section currently has a zero ${mode} value.`}
                        </p>
                    </div>
                </div>
            ) : (
                <div
                    role="img"
                    aria-label={`Horizontal bar chart ranking portfolio sections by ${mode}`}
                    className="min-w-0 px-1 py-5 sm:px-4"
                    style={{ height: chartHeight }}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            accessibilityLayer
                            data={chartData}
                            layout="vertical"
                            margin={{ bottom: 4, left: 2, right: 50, top: 4 }}
                        >
                            <CartesianGrid
                                horizontal={false}
                                stroke="rgba(255,255,255,0.05)"
                                strokeDasharray="3 5"
                            />
                            <XAxis
                                type="number"
                                axisLine={false}
                                domain={
                                    mode === 'reach'
                                        ? [0, 100]
                                        : [0, (dataMax: number) => Math.max(1_000, Math.ceil(dataMax))]
                                }
                                tick={{ fill: 'rgba(232,234,236,0.4)', fontSize: 10 }}
                                tickFormatter={(value: number) =>
                                    mode === 'reach'
                                        ? formatPercentage(value)
                                        : formatDuration(value)
                                }
                                tickLine={false}
                                tickMargin={10}
                            />
                            <YAxis
                                type="category"
                                dataKey="label"
                                axisLine={false}
                                tick={{ fill: 'rgba(231,233,236,0.72)', fontSize: 11, fontWeight: 700 }}
                                tickLine={false}
                                tickMargin={9}
                                width={92}
                            />
                            <Tooltip
                                content={(props) => (
                                    <SectionTooltip {...props} mode={mode} />
                                )}
                                cursor={{ fill: 'rgba(255,255,255,0.025)' }}
                                isAnimationActive={shouldReduceMotion !== true}
                            />
                            <Bar
                                dataKey="value"
                                fill={PERFORMANCE_COLOR}
                                isAnimationActive={shouldReduceMotion !== true}
                                animationDuration={500}
                                animationEasing="ease-out"
                                maxBarSize={18}
                                radius={[0, 4, 4, 0]}
                            >
                                <LabelList
                                    dataKey="value"
                                    fill="rgba(231,233,236,0.68)"
                                    fontSize={10}
                                    fontWeight={700}
                                    offset={8}
                                    position="right"
                                    formatter={(value) =>
                                        mode === 'reach'
                                            ? formatPercentage(Number(value))
                                            : formatDuration(Number(value))
                                    }
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
