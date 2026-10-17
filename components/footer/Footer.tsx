import {
    ArrowUpRight,
    BriefcaseBusiness,
    GitFork,
    Mail,
    type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import {
    CONTACT_CHANNELS,
    SITE_NAVIGATION,
    type ContactChannel,
    type ContactChannelId,
} from '@/lib/site';
import { NAV_LINK_UNDERLINE_CLASS } from '@/components/ui/navigationStyles';

const CONTACT_ICONS: Record<ContactChannelId, LucideIcon> = {
    github: GitFork,
    linkedin: BriefcaseBusiness,
    email: Mail,
};

const ARCHITECTURE_STATEMENT =
    'I architect and deploy scalable backend APIs, high-availability data layers, and polished mobile experiences driven by an unyielding commitment to performance optimization, long-term maintainability, and clean architecture.';

function FooterContactItem({ channel }: { channel: ContactChannel }) {
    const Icon = CONTACT_ICONS[channel.id];
    const isWebLink = /^https?:\/\//.test(channel.href);
    const content = (
        <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--hairline)] text-[var(--text)] transition-colors duration-300 group-hover:border-[var(--text)] motion-reduce:transition-none">
                <Icon aria-hidden="true" size={15} strokeWidth={1.8} />
            </span>
            <span className="relative inline-flex leading-none">
                {channel.label}
                {channel.href ? (
                    <span
                        aria-hidden="true"
                        className={`${NAV_LINK_UNDERLINE_CLASS} scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100`}
                    />
                ) : null}
            </span>
            {channel.href ? (
                <ArrowUpRight
                    aria-hidden="true"
                    size={13}
                    strokeWidth={1.8}
                    className="ml-auto shrink-0 text-[var(--faint)] transition-[color,transform] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--text)] motion-reduce:transition-none"
                />
            ) : (
                <span aria-hidden="true" className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--faint)]" />
            )}
        </>
    );

    return (
        <li>
            {channel.href ? (
                <a
                    href={channel.href}
                    target={isWebLink ? '_blank' : undefined}
                    rel={isWebLink ? 'noopener noreferrer' : undefined}
                    className="group flex min-h-14 items-center gap-3 border-b border-[var(--hairline-soft)] px-0.5 font-mono text-[11px] font-semibold uppercase tracking-normal text-[var(--muted)] transition-[border-color,color] duration-300 hover:border-[var(--text)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--site-bg)] motion-reduce:transition-none"
                >
                    {content}
                </a>
            ) : (
                <span className="flex min-h-14 items-center gap-3 border-b border-[var(--hairline-soft)] px-0.5 font-mono text-[11px] font-semibold uppercase tracking-normal text-[var(--muted)]">
                    {content}
                </span>
            )}
        </li>
    );
}

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer
            aria-label="Site footer"
            className="relative bg-[var(--site-bg)] px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-16 text-[var(--text)] md:px-8 md:pb-[calc(env(safe-area-inset-bottom)+2.5rem)] md:pt-20"
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[var(--hairline)] md:inset-x-8"
            />

            <div className="mx-auto max-w-7xl">
                <div className="flex flex-col gap-6 border-b border-[var(--hairline)] pb-8 sm:flex-row sm:items-end sm:justify-between md:pb-10">
                    <Link
                        href="/#home"
                        aria-label="Jude Michael Arriba - go to home"
                        className="group inline-flex min-h-12 w-fit items-center font-name text-4xl font-extrabold tracking-tight text-[var(--text)] transition-transform duration-300 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--site-bg)] motion-reduce:transition-none sm:text-5xl"
                    >
                        <span className="relative inline-flex leading-none">
                            J
                            <span className="text-[var(--faint)] transition-colors duration-300 group-hover:text-[var(--text)] motion-reduce:transition-none">
                                M
                            </span>
                            <span
                                aria-hidden="true"
                                className={`${NAV_LINK_UNDERLINE_CLASS} scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100`}
                            />
                        </span>
                    </Link>

                    <div className="sm:text-right">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
                            Jude Michael Arriba
                        </p>
                        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--faint)]">
                            Full-Stack Software Engineer
                        </p>
                    </div>
                </div>

                <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.9fr)_minmax(13rem,0.65fr)] lg:gap-14 xl:gap-20">
                    <section aria-labelledby="footer-focus-heading" className="max-w-2xl">
                        <div className="flex items-center gap-3">
                            <span aria-hidden="true" className="h-px w-7 bg-[var(--hairline-strong)]" />
                            <h2
                                id="footer-focus-heading"
                                className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text)]"
                            >
                                Engineering focus
                            </h2>
                        </div>
                        <p className="mt-5 text-base leading-[1.8] text-[var(--muted)] sm:text-lg">
                            {ARCHITECTURE_STATEMENT}
                        </p>
                    </section>

                    <nav aria-label="Footer navigation">
                        <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-3">
                            <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text)]">
                                Navigate
                            </h2>
                            <span className="font-mono text-[9px] tabular-nums text-[var(--faint)]">
                                {String(SITE_NAVIGATION.length).padStart(2, '0')}
                            </span>
                        </div>
                        <ul className="mt-2 grid grid-cols-2 gap-x-7">
                            {SITE_NAVIGATION.map((item, index) => (
                                <li key={item.id} className="border-b border-[var(--hairline-soft)]">
                                    <a
                                        href={`/#${item.id}`}
                                        className="group flex min-h-12 items-center gap-3 font-mono text-[11px] font-semibold uppercase tracking-normal text-[var(--muted)] transition-colors duration-300 hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--site-bg)] motion-reduce:transition-none"
                                    >
                                        <span className="shrink-0 tabular-nums text-[9px] text-[var(--faint)]">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <span className="relative inline-flex leading-none">
                                            {item.label}
                                            <span
                                                aria-hidden="true"
                                                className={`${NAV_LINK_UNDERLINE_CLASS} scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100`}
                                            />
                                        </span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <div>
                        <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-3">
                            <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text)]">
                                Connect
                            </h2>
                            <span className="font-mono text-[9px] tabular-nums text-[var(--faint)]">
                                {String(CONTACT_CHANNELS.length).padStart(2, '0')}
                            </span>
                        </div>
                        <ul className="mt-2">
                            {CONTACT_CHANNELS.map((channel) => (
                                <FooterContactItem key={channel.id} channel={channel} />
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="mt-12 flex flex-col gap-3 border-t border-[var(--hairline)] pt-6 sm:flex-row sm:items-center sm:justify-between lg:mt-14">
                    <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--faint)]">
                        &copy; {currentYear} Jude Michael Arriba. All rights reserved.
                    </p>
                    <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--faint)]">
                        Full-Stack Software Engineer
                    </p>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-[var(--faint)]">
                    This site keeps anonymous visit statistics. No ads, no tracking across sites.
                </p>
            </div>
        </footer>
    );
}
