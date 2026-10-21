import { fireEvent, render, screen } from '@testing-library/react';

import GitHubActivity from '../GitHubActivity';
import type { GitHubContributionsDto } from '@/features/github/types';

const CONTRIBUTIONS: GitHubContributionsDto = {
  username: 'JudemichaelArriba',
  totalContributions: 1477,
  weeks: [
    [
      { date: '2026-03-08', count: 0, level: 0 },
      { date: '2026-03-09', count: 24, level: 4 },
    ],
  ],
  stats: {
    activeDays: 1,
    longestStreak: 1,
    busiestMonth: { month: '2026-03', count: 24 },
    busiestDay: { date: '2026-03-09', count: 24, level: 4 },
  },
};

describe('GitHubActivity', () => {
  it('opens the GitHub profile in a new tab without exposing the opener', () => {
    render(<GitHubActivity contributions={CONTRIBUTIONS} />);

    const link = screen.getByRole('link', { name: /view @JudemichaelArriba on github/i });
    expect(link).toHaveAttribute('href', 'https://github.com/JudemichaelArriba');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('summarizes the calendar and stats for assistive technology', () => {
    render(<GitHubActivity contributions={CONTRIBUTIONS} />);

    expect(screen.getByRole('heading', { name: '1,477 contributions in the last year' })).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /1,477 contributions between mar 8, 2026 and mar 9, 2026/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Longest streak')).toBeInTheDocument();
    // The number sits in its own span (the scroll count-up animates it), so match the whole value.
    expect(screen.getByText((_, element) => element?.tagName === 'DD' && element.textContent === '1 day')).toBeInTheDocument();
    expect(screen.getByText('Mar 2026')).toBeInTheDocument();
  });

  it('shows the hovered day and hides it when the pointer leaves the calendar', () => {
    const { container } = render(<GitHubActivity contributions={CONTRIBUTIONS} />);
    const calendar = screen.getByRole('img');
    const busiestCell = container.querySelector('[data-day-index="1"]');
    if (!busiestCell) throw new Error('Expected a calendar cell.');

    fireEvent.pointerOver(busiestCell);
    expect(screen.getByText('24 contributions on Mar 9, 2026')).toBeInTheDocument();

    fireEvent.pointerLeave(calendar);
    expect(screen.queryByText('24 contributions on Mar 9, 2026')).not.toBeInTheDocument();
  });
});
