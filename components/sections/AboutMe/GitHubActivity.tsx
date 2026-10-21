'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { ArrowUpRight } from 'lucide-react';

import {
    formatContributionDate,
    formatContributionMonth,
    getContributionMonthLabels,
    getContributionWeekday,
} from '@/features/github/calendar';
import type {
    ContributionDay,
    ContributionLevel,
    GitHubContributionsDto,
} from '@/features/github/types';

interface GitHubActivityProps {
    contributions: GitHubContributionsDto;
}

interface PlacedDay extends ContributionDay {
    weekIndex: number;
    weekday: number;
}

interface ActiveTooltip {
    dayIndex: number;
    left: number;
    top: number;
    below: boolean;
}

// Monochrome intensity scale derived from the theme ink, so it follows light/dark mode.
const LEVEL_CLASSES: Record<ContributionLevel, string> = {
    0: 'bg-[color-mix(in_srgb,var(--text)_7%,transparent)]',
    1: 'bg-[color-mix(in_srgb,var(--text)_24%,transparent)]',
    2: 'bg-[color-mix(in_srgb,var(--text)_44%,transparent)]',
    3: 'bg-[color-mix(in_srgb,var(--text)_70%,transparent)]',
    4: 'bg-[var(--text)]',
};

const LEVELS: readonly ContributionLevel[] = [0, 1, 2, 3, 4];
const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''] as const;
/** Half the widest tooltip, so tooltips near either edge stay inside the scroller. */
const TOOLTIP_HALF_WIDTH = 124;

function describeCount(count: number): string {
    if (count === 0) return 'No contributions';
    return count === 1 ? '1 contribution' : `${count.toLocaleString('en-US')} contributions`;
}

export default function GitHubActivity({ contributions }: GitHubActivityProps) {
    const { username, totalContributions, weeks, stats } = contributions;
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [tooltip, setTooltip] = useState<ActiveTooltip | null>(null);

    const days = useMemo<PlacedDay[]>(
        () => weeks.flatMap((week, weekIndex) =>
            week.map((day) => ({ ...day, weekIndex, weekday: getContributionWeekday(day.date) })),
        ),
        [weeks],
    );
    const monthLabels = useMemo(() => getContributionMonthLabels(weeks), [weeks]);

    const firstDay = days[0];
    const lastDay = days[days.length - 1];
    const firstLabel = firstDay ? formatContributionDate(firstDay.date) : '';
    const lastLabel = lastDay ? formatContributionDate(lastDay.date) : '';
    const rangeLabel = `${firstLabel} – ${lastLabel}`;
    const profileUrl = `https://github.com/${username}`;
    const columnTemplate = { gridTemplateColumns: `repeat(${weeks.length}, var(--cell))` };

    // Like GitHub, open narrow screens on the most recent weeks.
    useEffect(() => {
        const scroller = scrollerRef.current;
        if (scroller) scroller.scrollLeft = scroller.scrollWidth;
    }, []);

    const handlePointerOver = (event: PointerEvent<HTMLDivElement>) => {
        const target = event.target;
        if (!(target instanceof HTMLElement) || target.dataset.dayIndex === undefined) return;

        const dayIndex = Number(target.dataset.dayIndex);
        const day = days[dayIndex];
        const grid = event.currentTarget;
        if (!day || tooltip?.dayIndex === dayIndex) return;

        const center = target.offsetLeft + target.offsetWidth / 2;
        const maxLeft = Math.max(TOOLTIP_HALF_WIDTH, grid.scrollWidth - TOOLTIP_HALF_WIDTH);
        const below = day.weekday < 2;

        setTooltip({
            dayIndex,
            left: Math.min(Math.max(center, TOOLTIP_HALF_WIDTH), maxLeft),
            top: below ? target.offsetTop + target.offsetHeight + 8 : target.offsetTop - 8,
            below,
        });
    };

    const activeDay = tooltip ? days[tooltip.dayIndex] : undefined;
    const statItems = [
        // data-count-to: the About scroll animation counts these up (final text is always the real value).
        { label: 'Active days', value: <span data-count-to={stats.activeDays}>{stats.activeDays.toLocaleString('en-US')}</span> },
        {
            label: 'Longest streak',
            value: <><span data-count-to={stats.longestStreak}>{stats.longestStreak}</span>{stats.longestStreak === 1 ? ' day' : ' days'}</>,
        },
        ...(stats.busiestMonth
            ? [{ label: 'Busiest month', value: formatContributionMonth(stats.busiestMonth.month) }]
            : []),
    ];

    return (
        <div className="mt-20 border-t border-[var(--hairline)] pt-9 lg:mt-24">
            <div
                data-about-activity
                className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between sm:gap-10"
            >
                <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--faint)]">
                        GitHub activity
                    </p>
                    <h3 className="mt-3.5 font-display text-3xl font-bold leading-[1.05] tracking-[-0.025em] text-[var(--text)] sm:text-4xl lg:text-[2.5rem]">
                        {totalContributions > 0 ? (
                            <><span data-count-to={totalContributions}>{totalContributions.toLocaleString('en-US')}</span>{totalContributions === 1 ? ' contribution' : ' contributions'}</>
                        ) : 'No contributions'}{' '}in the last year
                    </h3>
                </div>
                <a
                    href={profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`View @${username} on GitHub (opens in a new tab)`}
                    className="group inline-flex w-fit shrink-0 items-center gap-2 border-b border-[var(--text)] pb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--site-bg)]"
                >
                    @{username}
                    <ArrowUpRight
                        aria-hidden="true"
                        size={13}
                        strokeWidth={2.4}
                        className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    />
                </a>
            </div>

            <div
                data-about-activity
                className="mt-10 flex gap-3 [--cell:10px] [--gap:2px] lg:[--cell:13px] lg:[--gap:3px] xl:[--cell:18px] xl:[--gap:4px]"
            >
                <div aria-hidden="true" className="shrink-0 pt-[26px]">
                    <div className="grid grid-rows-[repeat(7,var(--cell))] gap-y-[var(--gap)]">
                        {WEEKDAY_LABELS.map((label, index) => (
                            <span
                                key={index}
                                className="font-mono text-[9px] uppercase leading-[var(--cell)] tracking-[0.08em] text-[var(--faint)]"
                            >
                                {label}
                            </span>
                        ))}
                    </div>
                </div>

                <div ref={scrollerRef} className="min-w-0 overflow-x-auto pb-2">
                    <div className="relative w-max">
                        <div
                            aria-hidden="true"
                            className="mb-2.5 grid h-4 gap-x-[var(--gap)]"
                            style={columnTemplate}
                        >
                            {monthLabels.map((month) => (
                                <span
                                    key={month.weekIndex}
                                    className="whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--faint)]"
                                    style={{ gridColumn: `${month.weekIndex + 1} / span 4` }}
                                >
                                    {month.label}
                                </span>
                            ))}
                        </div>

                        <div
                            role="img"
                            data-calendar-grid
                            aria-label={`GitHub contribution calendar: ${describeCount(totalContributions).toLowerCase()} between ${firstLabel} and ${lastLabel}.`}
                            className="grid grid-rows-[repeat(7,var(--cell))] gap-[var(--gap)]"
                            style={columnTemplate}
                            onPointerOver={handlePointerOver}
                            onPointerLeave={() => setTooltip(null)}
                        >
                            {days.map((day, index) => (
                                <span
                                    key={day.date}
                                    data-day-index={index}
                                    className={`size-[var(--cell)] ${LEVEL_CLASSES[day.level]} ${
                                        tooltip?.dayIndex === index
                                            ? 'outline outline-2 outline-offset-1 outline-[var(--text)]'
                                            : ''
                                    }`}
                                    // --reveal (set by the About scroll animation, default: everything shown) fades
                                    // the columns in left to right with one CSS variable instead of hundreds of tweens.
                                    style={{
                                        gridColumn: day.weekIndex + 1,
                                        gridRow: day.weekday + 1,
                                        '--col': day.weekIndex,
                                        opacity: 'clamp(0, calc(var(--reveal, 999) - var(--col)), 1)',
                                        scale: 'clamp(0.3, calc(0.3 + (var(--reveal, 999) - var(--col)) * 0.7), 1)',
                                    } as CSSProperties}
                                />
                            ))}
                        </div>

                        {tooltip && activeDay ? (
                            <span
                                aria-hidden="true"
                                className={`pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap bg-[var(--inverse-bg)] px-2.5 py-1.5 font-mono text-[11px] tracking-[0.04em] text-[var(--inverse-text)] ${
                                    tooltip.below ? '' : '-translate-y-full'
                                }`}
                                style={{ left: tooltip.left, top: tooltip.top }}
                            >
                                {describeCount(activeDay.count)} on {formatContributionDate(activeDay.date)}
                            </span>
                        ) : null}
                    </div>
                </div>
            </div>

            <div
                data-about-activity
                className="mt-5 flex flex-col gap-3 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--faint)] sm:flex-row sm:items-center sm:justify-between"
            >
                <span>{rangeLabel} · Synced daily from GitHub</span>
                <span aria-hidden="true" className="inline-flex items-center gap-1.5">
                    Less
                    {LEVELS.map((level) => (
                        <span key={level} className={`size-3 ${LEVEL_CLASSES[level]}`} />
                    ))}
                    More
                </span>
            </div>

            <dl data-about-activity className="mt-10 grid grid-cols-3 sm:flex sm:flex-wrap sm:gap-y-6">
                {statItems.map((item, index) => (
                    <div
                        key={item.label}
                        className={`flex min-w-0 flex-col-reverse justify-end pr-3 sm:pr-10 ${index > 0 ? 'border-l border-[var(--hairline)] pl-3 sm:pl-10' : ''}`}
                    >
                        <dt className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--faint)]">
                            {item.label}
                        </dt>
                        <dd className="m-0 font-display text-xl font-bold tracking-[-0.02em] text-[var(--text)] sm:text-2xl">
                            {item.value}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}
