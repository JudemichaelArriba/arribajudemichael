import type {
    ContributionDay,
    ContributionMonthTotal,
    ContributionStats,
} from './types';

const DAY_MS = 86_400_000;

export interface ContributionMonthLabel {
    /** Zero-based week column where the month starts. */
    weekIndex: number;
    label: string;
}

/** Parses `YYYY-MM-DD` as a UTC midnight timestamp so weekdays never shift with the server time zone. */
export function parseContributionDate(date: string): number {
    return Date.parse(`${date}T00:00:00Z`);
}

/** Sunday = 0 ... Saturday = 6, matching GitHub's calendar rows. */
export function getContributionWeekday(date: string): number {
    return new Date(parseContributionDate(date)).getUTCDay();
}

export function formatContributionDate(date: string): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(parseContributionDate(date)));
}

export function formatContributionMonth(month: string): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(parseContributionDate(`${month}-01`)));
}

export function summarizeContributions(days: readonly ContributionDay[]): ContributionStats {
    const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date));
    const monthTotals = new Map<string, number>();
    let activeDays = 0;
    let longestStreak = 0;
    let currentStreak = 0;
    let previousActiveTime: number | null = null;
    let busiestDay: ContributionDay | null = null;

    for (const day of sortedDays) {
        const month = day.date.slice(0, 7);
        monthTotals.set(month, (monthTotals.get(month) ?? 0) + day.count);

        if (day.count <= 0) {
            currentStreak = 0;
            previousActiveTime = null;
            continue;
        }

        const time = parseContributionDate(day.date);
        activeDays += 1;
        currentStreak = previousActiveTime !== null && time - previousActiveTime === DAY_MS
            ? currentStreak + 1
            : 1;
        previousActiveTime = time;
        longestStreak = Math.max(longestStreak, currentStreak);

        if (!busiestDay || day.count > busiestDay.count) {
            busiestDay = day;
        }
    }

    let busiestMonth: ContributionMonthTotal | null = null;
    for (const [month, count] of monthTotals) {
        if (count > 0 && (!busiestMonth || count > busiestMonth.count)) {
            busiestMonth = { month, count };
        }
    }

    return { activeDays, longestStreak, busiestMonth, busiestDay };
}

/**
 * One label per month, placed on the first week column that contains the 1st-7th of
 * that month (GitHub's convention). Labels too close to the right edge are dropped so
 * they never overflow the grid.
 */
export function getContributionMonthLabels(
    weeks: readonly (readonly ContributionDay[])[],
): ContributionMonthLabel[] {
    const labels: ContributionMonthLabel[] = [];
    const seenMonths = new Set<string>();
    const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

    weeks.forEach((week, weekIndex) => {
        const firstDay = week[0];
        if (!firstDay || weekIndex > weeks.length - 3) return;

        const monthStart = week.find((day) => Number(day.date.slice(8, 10)) <= 7);
        if (!monthStart) return;

        const month = monthStart.date.slice(0, 7);
        if (seenMonths.has(month)) return;

        seenMonths.add(month);
        labels.push({
            weekIndex,
            label: formatter.format(new Date(parseContributionDate(monthStart.date))),
        });
    });

    return labels;
}
