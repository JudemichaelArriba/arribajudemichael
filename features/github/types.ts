export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export interface ContributionDay {
    /** Calendar date as `YYYY-MM-DD`, exactly as GitHub reports it. */
    date: string;
    count: number;
    level: ContributionLevel;
}

export interface ContributionMonthTotal {
    /** Calendar month as `YYYY-MM`. */
    month: string;
    count: number;
}

export interface ContributionStats {
    activeDays: number;
    longestStreak: number;
    busiestMonth: ContributionMonthTotal | null;
    busiestDay: ContributionDay | null;
}

export interface GitHubContributionsDto {
    username: string;
    totalContributions: number;
    /** Sunday-first weeks; the first and last week may be partial. */
    weeks: ContributionDay[][];
    stats: ContributionStats;
}
