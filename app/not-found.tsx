import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Page not found · Jude Michael Arriba',
};

/** Any unknown URL: the site's own type and theme instead of the framework's default page. */
export default function NotFound() {
    return (
        <main className="flex min-h-svh w-full flex-1 items-center bg-[var(--site-bg)] px-5 py-24 text-[var(--text)] md:px-8">
            <div className="mx-auto w-full max-w-3xl">
                <div className="flex items-center gap-4">
                    <p className="shrink-0 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--faint)]">Error 404</p>
                    <span aria-hidden="true" className="h-px flex-1 bg-[var(--hairline)]" />
                </div>
                <h1 className="mt-8 font-display text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-6xl">
                    This page doesn&apos;t exist.
                </h1>
                <p className="mt-5 max-w-xl text-base leading-[1.7] text-[var(--muted)] sm:text-lg">
                    The link may be old or mistyped. Everything on this site lives on one page.
                </p>
                <Link
                    href="/"
                    className="group mt-10 inline-flex min-h-12 items-center gap-2.5 border border-[var(--text)] px-5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text)] transition-colors duration-300 hover:bg-[var(--inverse-bg)] hover:text-[var(--inverse-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--site-bg)] motion-reduce:transition-none"
                >
                    <ArrowLeft aria-hidden="true" size={14} strokeWidth={2} className="transition-transform duration-300 group-hover:-translate-x-0.5 motion-reduce:transition-none" />
                    Back to the portfolio
                </Link>
            </div>
        </main>
    );
}
