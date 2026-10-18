import 'server-only';

import { unstable_cache } from 'next/cache';

import { GITHUB_USERNAME } from '@/lib/site';
import { summarizeContributions } from './calendar';
import type {
    ContributionDay,
    ContributionLevel,
    GitHubContributionsDto,
} from './types';

const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';
const GITHUB_TIMEOUT_MS = 8_000;
const CONTRIBUTIONS_REVALIDATE_SECONDS = 86_400;
const MAX_WEEKS = 54;
const MAX_DAY_COUNT = 100_000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const CONTRIBUTIONS_QUERY = `
query PortfolioContributions($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            contributionLevel
          }
        }
      }
    }
  }
}`;

const CONTRIBUTION_LEVELS: Readonly<Record<string, ContributionLevel>> = {
    NONE: 0,
    FIRST_QUARTILE: 1,
    SECOND_QUARTILE: 2,
    THIRD_QUARTILE: 3,
    FOURTH_QUARTILE: 4,
};

function getToken(): string | null {
    const token = process.env.GITHUB_CONTRIBUTIONS_TOKEN?.trim() ?? '';
    return token.length > 0 ? token : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidDate(value: unknown): value is string {
    if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;

    // Round-trip so rolled-over dates such as 2026-02-31 are rejected.
    const time = Date.parse(`${value}T00:00:00Z`);
    return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
}

function isValidCount(value: unknown): value is number {
    return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= MAX_DAY_COUNT;
}

function toContributionDay(value: unknown): ContributionDay | null {
    if (!isRecord(value)) return null;

    const { date, contributionCount, contributionLevel } = value;
    if (!isValidDate(date) || !isValidCount(contributionCount) || typeof contributionLevel !== 'string') {
        return null;
    }

    const level = CONTRIBUTION_LEVELS[contributionLevel];
    if (level === undefined) return null;

    return { date, count: contributionCount, level };
}

/** Strictly maps GitHub's GraphQL payload; any unexpected shape rejects the whole response. */
function toContributionsDto(payload: unknown): GitHubContributionsDto | null {
    if (!isRecord(payload) || !isRecord(payload.data)) return null;

    const user = payload.data.user;
    if (!isRecord(user) || !isRecord(user.contributionsCollection)) return null;

    const calendar = user.contributionsCollection.contributionCalendar;
    if (!isRecord(calendar) || !isValidCount(calendar.totalContributions)) return null;

    const rawWeeks = calendar.weeks;
    if (!Array.isArray(rawWeeks) || rawWeeks.length === 0 || rawWeeks.length > MAX_WEEKS) {
        return null;
    }

    const weeks: ContributionDay[][] = [];
    for (const rawWeek of rawWeeks) {
        if (!isRecord(rawWeek) || !Array.isArray(rawWeek.contributionDays)) return null;

        const rawDays: unknown[] = rawWeek.contributionDays;
        if (rawDays.length === 0 || rawDays.length > 7) return null;

        const days: ContributionDay[] = [];
        for (const rawDay of rawDays) {
            const day = toContributionDay(rawDay);
            if (!day) return null;
            days.push(day);
        }

        weeks.push(days);
    }

    return {
        username: GITHUB_USERNAME,
        totalContributions: calendar.totalContributions,
        weeks,
        stats: summarizeContributions(weeks.flat()),
    };
}

function getGraphqlErrorTypes(payload: unknown): string[] {
    if (!isRecord(payload) || !Array.isArray(payload.errors)) return [];

    return payload.errors.map((error) => {
        const type = isRecord(error) ? error.type : undefined;
        return typeof type === 'string' && /^[A-Z_]{1,64}$/.test(type) ? type : 'UNKNOWN';
    });
}

/**
 * Runs inside `unstable_cache`. Failures throw so they are never cached; the last good
 * calendar keeps being served while a later revalidation retries.
 */
async function fetchContributions(): Promise<GitHubContributionsDto> {
    const token = getToken();
    if (!token) throw new Error('GitHub contributions token is not configured.');

    let response: Response;
    try {
        response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': `${GITHUB_USERNAME}-portfolio`,
            },
            body: JSON.stringify({
                query: CONTRIBUTIONS_QUERY,
                variables: { login: GITHUB_USERNAME },
            }),
            signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
        });
    } catch (error) {
        console.error('[github/contributions] GitHub request failed.', {
            name: error instanceof Error ? error.name : 'UnknownError',
        });
        throw new Error('GitHub contributions are unavailable.');
    }

    if (!response.ok) {
        console.error('[github/contributions] GitHub responded with an error.', {
            providerStatus: response.status,
        });
        throw new Error('GitHub contributions are unavailable.');
    }

    let payload: unknown;
    try {
        payload = await response.json();
    } catch {
        console.error('[github/contributions] GitHub returned unreadable JSON.');
        throw new Error('GitHub contributions are unavailable.');
    }

    const errorTypes = getGraphqlErrorTypes(payload);
    if (errorTypes.length > 0) {
        console.error('[github/contributions] GitHub GraphQL query failed.', { errorTypes });
        throw new Error('GitHub contributions are unavailable.');
    }

    const contributions = toContributionsDto(payload);
    if (!contributions) {
        console.error('[github/contributions] GitHub returned an unexpected calendar shape.');
        throw new Error('GitHub contributions are unavailable.');
    }

    return contributions;
}

// The token is read inside the cached function and is never part of the cache key.
const getCachedContributions = unstable_cache(
    fetchContributions,
    ['github-contributions', GITHUB_USERNAME],
    { revalidate: CONTRIBUTIONS_REVALIDATE_SECONDS, tags: ['github-contributions'] },
);

/**
 * Public, read-only contribution calendar for the About section. Never throws: the
 * section simply hides the calendar when GitHub or the token is unavailable.
 */
export async function getGitHubContributions(): Promise<GitHubContributionsDto | null> {
    if (!getToken()) {
        console.error('[github/contributions] GitHub contributions token is not configured.');
        return null;
    }

    try {
        return await getCachedContributions();
    } catch {
        return null;
    }
}
