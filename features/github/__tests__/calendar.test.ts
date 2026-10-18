import {
  formatContributionDate,
  formatContributionMonth,
  getContributionMonthLabels,
  getContributionWeekday,
  summarizeContributions,
} from '../calendar';
import type { ContributionDay } from '../types';

function day(date: string, count: number): ContributionDay {
  return { date, count, level: count > 0 ? 1 : 0 };
}

describe('summarizeContributions', () => {
  it('returns empty stats when there is no activity', () => {
    expect(summarizeContributions([day('2026-01-01', 0), day('2026-01-02', 0)])).toEqual({
      activeDays: 0,
      longestStreak: 0,
      busiestMonth: null,
      busiestDay: null,
    });
  });

  it('counts the longest run of consecutive active days, reset by an inactive day', () => {
    const stats = summarizeContributions([
      day('2026-01-01', 1),
      day('2026-01-02', 3),
      day('2026-01-03', 0),
      day('2026-01-04', 1),
      day('2026-01-05', 1),
      day('2026-01-06', 1),
    ]);

    expect(stats.activeDays).toBe(5);
    expect(stats.longestStreak).toBe(3);
  });

  it('does not join active days across a missing calendar date', () => {
    expect(summarizeContributions([day('2026-01-01', 1), day('2026-01-03', 1)]).longestStreak).toBe(1);
  });

  it('is independent of input order and keeps the earliest day on ties', () => {
    const stats = summarizeContributions([
      day('2026-02-10', 5),
      day('2026-01-31', 2),
      day('2026-01-30', 5),
      day('2026-02-01', 1),
    ]);

    expect(stats.busiestDay).toEqual(day('2026-01-30', 5));
    expect(stats.busiestMonth).toEqual({ month: '2026-01', count: 7 });
    expect(stats.longestStreak).toBe(3);
  });
});

describe('calendar date helpers', () => {
  it('derives weekdays in UTC so rows never shift with the server time zone', () => {
    expect(getContributionWeekday('2025-10-19')).toBe(0);
    expect(getContributionWeekday('2026-10-17')).toBe(6);
  });

  it('formats days and months for labels', () => {
    expect(formatContributionDate('2026-05-14')).toBe('May 14, 2026');
    expect(formatContributionMonth('2026-03')).toBe('Mar 2026');
  });
});

describe('getContributionMonthLabels', () => {
  function weeksFrom(startSunday: string, weekCount: number): ContributionDay[][] {
    const start = Date.parse(`${startSunday}T00:00:00Z`);
    return Array.from({ length: weekCount }, (_, week) =>
      Array.from({ length: 7 }, (_, weekday) => {
        const date = new Date(start + (week * 7 + weekday) * 86_400_000).toISOString().slice(0, 10);
        return day(date, 0);
      }),
    );
  }

  it('labels each month once, on the week containing its first days', () => {
    const labels = getContributionMonthLabels(weeksFrom('2025-10-19', 12));

    expect(labels).toEqual([
      { weekIndex: 1, label: 'Nov' },
      { weekIndex: 6, label: 'Dec' },
    ]);
  });

  it('skips the partial leading month and labels too close to the right edge', () => {
    const labels = getContributionMonthLabels(weeksFrom('2025-10-19', 7));

    expect(labels.map((label) => label.label)).toEqual(['Nov']);
  });
});
