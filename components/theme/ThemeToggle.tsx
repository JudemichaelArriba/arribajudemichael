'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import type { Theme } from '@/lib/theme';

const OPTIONS: ReadonlyArray<{ value: Theme; label: string }> = [
    { value: 'light', label: 'Light theme' },
    { value: 'dark', label: 'Dark theme' },
];

export default function ThemeToggle({ className = '' }: { className?: string }) {
    const { theme, setTheme } = useTheme();

    return (
        <div
            role="group"
            aria-label="Color theme"
            className={`inline-flex shrink-0 items-center gap-0.5 rounded-full border border-[var(--hairline)] p-1 ${className}`}
        >
            {OPTIONS.map((option) => {
                const isActive = theme === option.value;
                const Icon = option.value === 'light' ? Sun : Moon;

                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={(event) => {
                            const rect = event.currentTarget.getBoundingClientRect();
                            setTheme(option.value, {
                                x: rect.left + rect.width / 2,
                                y: rect.top + rect.height / 2,
                            });
                        }}
                        aria-label={option.label}
                        aria-pressed={isActive}
                        className={`flex size-7 items-center justify-center rounded-full transition-[background-color,color] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/50 motion-reduce:transition-none ${isActive
                            ? 'bg-[var(--inverse-bg)] text-[var(--inverse-text)]'
                            : 'text-[var(--faint)] hover:text-[var(--text)]'
                            }`}
                    >
                        <Icon aria-hidden="true" size={14} strokeWidth={2} />
                    </button>
                );
            })}
        </div>
    );
}
