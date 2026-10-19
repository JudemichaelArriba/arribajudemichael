'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Menu, X } from 'lucide-react';
import AskNavButton from '@/components/chat/AskNavButton';
import { useAskChat } from '@/components/chat/ChatProvider';
import { useActiveSection } from '@/lib/useActiveSection';
import { SITE_NAVIGATION } from '@/lib/site';
import { NAV_LINK_UNDERLINE_CLASS } from '@/components/ui/navigationStyles';
import ThemeToggle from '@/components/theme/ThemeToggle';

const TRACKED_SECTION_IDS = ['home', 'what-i-do', ...SITE_NAVIGATION.filter((item) => item.id !== 'home').map((item) => item.id)];
const TOP_THRESHOLD = 24;
const SCROLL_DELTA = 6;
const DESKTOP_BREAKPOINT = 768;
type NavMode = 'top' | 'hidden' | 'visible';

export default function Navbar() {
    const [mode, setMode] = useState<NavMode>('top');
    const [menuOpen, setMenuOpen] = useState(false);
    const navRef = useRef<HTMLElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const lastScrollYRef = useRef(0);
    const tickingRef = useRef(false);
    const active = useActiveSection(TRACKED_SECTION_IDS);
    const askChat = useAskChat();

    useEffect(() => {
        const el = navRef.current;
        if (!el) return;

        const setVar = () => {
            document.documentElement.style.setProperty(
                '--nav-height',
                `${Math.ceil(el.getBoundingClientRect().height)}px`
            );
        };

        setVar();

        const observer = new ResizeObserver(setVar);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const updateMode = () => {
            const currentY = window.scrollY;
            const previousY = lastScrollYRef.current;
            const diff = currentY - previousY;

            if (currentY <= TOP_THRESHOLD) {
                setMode('top');
            } else if (diff > SCROLL_DELTA) {
                setMode('hidden');
                setMenuOpen(false);
            } else if (diff < -SCROLL_DELTA) {
                setMode('visible');
            }

            lastScrollYRef.current = Math.max(currentY, 0);
            tickingRef.current = false;
        };

        const handleScroll = () => {
            if (tickingRef.current) return;
            tickingRef.current = true;
            window.requestAnimationFrame(updateMode);
        };

        lastScrollYRef.current = window.scrollY;
        updateMode();
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= DESKTOP_BREAKPOINT) setMenuOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!menuOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMenuOpen(false);
                menuButtonRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [menuOpen]);

    const scrollTo = useCallback((id: string) => {
        // The open-menu effect locks body scrolling, and its cleanup only runs
        // after the commit. Scrolling while the lock is still on is a no-op on
        // mobile browsers, so release it here first. The cleanup then writes
        // back the same value, so nothing changes mid-scroll.
        document.body.style.overflow = '';
        setMenuOpen(false);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const openAsk = useCallback(() => {
        document.body.style.overflow = '';
        setMenuOpen(false);
        askChat.open();
    }, [askChat]);

    const isNavVisible = mode !== 'hidden';
    const isScrolled = mode !== 'top';

    return (
        <header className="pointer-events-none fixed inset-x-0 top-0 z-[70]">
            <div className="relative">
                <div
                    aria-hidden="true"
                    onClick={() => setMenuOpen(false)}
                    className={`fixed inset-0 bg-[var(--site-bg)]/70 backdrop-blur-[6px] transition-[opacity,backdrop-filter] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:hidden ${menuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                        }`}
                />

                <nav
                    ref={navRef}
                    aria-label="Primary navigation"
                    className={`pointer-events-auto relative isolate w-full border-b transition-[opacity,transform,background-color,border-color,backdrop-filter] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${isScrolled || menuOpen
                        ? 'border-[var(--hairline-soft)] bg-[var(--site-bg)]/85 backdrop-blur-xl'
                        : 'border-transparent bg-transparent'
                        } ${isNavVisible
                        ? 'translate-y-0 opacity-100'
                        : 'pointer-events-none -translate-y-full opacity-0'
                        }`}
                >
                    <div className="mx-auto flex h-16 w-full max-w-[82rem] items-center justify-between gap-4 px-5 md:h-[4.5rem] md:px-8">
                        <button
                            onClick={() => scrollTo('home')}
                            type="button"
                            aria-label="Go to home"
                            className="group relative -ml-1 flex h-11 shrink-0 items-center px-1 font-name text-[1.6rem] font-extrabold leading-none tracking-tight text-[var(--text)] transition-transform duration-300 ease-out hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 active:scale-[0.98] motion-reduce:transition-none md:text-[1.75rem]"
                        >
                            <span className="relative inline-flex items-center leading-none">
                                J<span className="text-[var(--faint)] transition-colors duration-300 group-hover:text-[var(--text)] motion-reduce:transition-none">M</span>
                                <span
                                    aria-hidden="true"
                                    className={`${NAV_LINK_UNDERLINE_CLASS} scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100`}
                                />
                            </span>
                        </button>

                        <div className="hidden min-w-0 items-center gap-6 md:flex lg:gap-8">
                            <ul className="flex min-w-0 items-center gap-5 lg:gap-7">
                                {SITE_NAVIGATION.map((item) => {
                                    const isActive = active === item.id || (active === 'what-i-do' && item.id === 'home');

                                    return (
                                        <li key={item.id} className="flex shrink-0 items-center">
                                            <button
                                                onClick={() => scrollTo(item.id)}
                                                type="button"
                                                aria-current={isActive ? 'page' : undefined}
                                                className={`group relative flex h-10 items-center justify-center font-mono text-[10px] font-semibold uppercase tracking-[0.13em] transition-colors duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 motion-reduce:transition-none lg:text-[11px] ${isActive ? 'text-[var(--text)]' : 'text-[var(--faint)] hover:text-[var(--text)]'
                                                    }`}
                                            >
                                                <span className="relative inline-flex items-center leading-none">
                                                    {item.label}
                                                    <span
                                                        aria-hidden="true"
                                                        className={`${NAV_LINK_UNDERLINE_CLASS} ${isActive
                                                            ? 'scale-x-100'
                                                            : 'scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100'
                                                            }`}
                                                    />
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>

                            {askChat.enabled ? <AskNavButton onOpen={openAsk} /> : null}

                            <ThemeToggle />

                            <a
                                href="/cv.pdf"
                                aria-label="Download CV"
                                className="group inline-flex h-10 shrink-0 items-center justify-center gap-2 bg-[var(--inverse-bg)] px-4 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--inverse-text)] transition-[opacity,transform] duration-300 ease-out hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--site-bg)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
                            >
                                <Download aria-hidden="true" size={13} strokeWidth={2} className="transition-transform duration-300 group-hover:translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0" />
                                <span>CV</span>
                            </a>
                        </div>

                        <div className="flex items-center gap-2 md:hidden">
                            <ThemeToggle />
                            <button
                                ref={menuButtonRef}
                                onClick={() => setMenuOpen((prev) => !prev)}
                                type="button"
                                aria-expanded={menuOpen}
                                aria-controls="mobile-nav-panel"
                                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                                className="relative flex size-11 shrink-0 items-center justify-center border border-[var(--hairline)] text-[var(--text)] transition-[border-color,background-color] duration-300 ease-out hover:border-[var(--hairline-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 active:scale-95 motion-reduce:transition-none"
                            >
                                <span aria-hidden="true" className="relative size-5">
                                    <Menu
                                        strokeWidth={1.8}
                                        className={`absolute inset-0 size-5 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${menuOpen ? 'rotate-90 scale-75 opacity-0' : 'rotate-0 scale-100 opacity-100'
                                            }`}
                                    />
                                    <X
                                        strokeWidth={1.8}
                                        className={`absolute inset-0 size-5 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${menuOpen ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-75 opacity-0'
                                            }`}
                                    />
                                </span>
                            </button>
                        </div>
                    </div>
                </nav>

                <div
                    id="mobile-nav-panel"
                    inert={!menuOpen ? true : undefined}
                    aria-hidden={!menuOpen}
                    className={`absolute inset-x-0 top-full z-10 origin-top overflow-hidden border-b bg-[var(--site-bg)] transition-[opacity,transform,border-color] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:hidden ${menuOpen
                        ? 'pointer-events-auto translate-y-0 border-[var(--hairline-soft)] opacity-100'
                        : 'pointer-events-none -translate-y-2 border-transparent opacity-0'
                        }`}
                >
                    <ul className="flex flex-col px-5 pb-5 pt-1">
                        {SITE_NAVIGATION.map((item, index) => {
                            const isActive = active === item.id || (active === 'what-i-do' && item.id === 'home');

                            return (
                                <li
                                    key={item.id}
                                    style={{ transitionDelay: menuOpen ? `${45 + index * 35}ms` : '0ms' }}
                                    className={`border-b border-[var(--hairline-soft)] transition-[opacity,transform] duration-300 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${menuOpen ? 'translate-y-0 opacity-100' : '-translate-y-1.5 opacity-0'
                                        }`}
                                >
                                    <button
                                        onClick={() => scrollTo(item.id)}
                                        type="button"
                                        aria-current={isActive ? 'page' : undefined}
                                        className={`flex min-h-14 w-full items-center gap-4 text-left font-mono text-[13px] font-semibold uppercase tracking-[0.12em] transition-colors duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 motion-reduce:transition-none ${isActive ? 'text-[var(--text)]' : 'text-[var(--faint)] hover:text-[var(--text)]'
                                            }`}
                                    >
                                        <span className="shrink-0 text-[10px] tabular-nums text-[var(--faint)]">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <span>{item.label}</span>
                                    </button>
                                </li>
                            );
                        })}
                        {askChat.enabled ? (
                            <li
                                style={{ transitionDelay: menuOpen ? `${45 + SITE_NAVIGATION.length * 35}ms` : '0ms' }}
                                className={`mt-5 transition-[opacity,transform] duration-300 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${menuOpen ? 'translate-y-0 opacity-100' : '-translate-y-1.5 opacity-0'}`}
                            >
                                <button
                                    type="button"
                                    onClick={openAsk}
                                    aria-label="Ask Nero, AI assistant"
                                    aria-haspopup="dialog"
                                    className="group flex min-h-14 w-full items-center justify-between gap-3 border border-[var(--hairline-strong)] px-4 font-mono text-xs font-bold uppercase tracking-[0.12em] text-[var(--text)] transition-colors duration-300 ease-out hover:border-[var(--inverse-bg)] hover:bg-[var(--inverse-bg)] hover:text-[var(--inverse-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 motion-reduce:transition-none"
                                >
                                    <span aria-hidden="true">Ask Nero</span>
                                    <span aria-hidden="true" className="border border-[var(--hairline-strong)] px-1.5 py-0.5 text-[10px] transition-colors duration-300 group-hover:border-[var(--inverse-text)]/50 motion-reduce:transition-none">
                                        AI
                                    </span>
                                </button>
                            </li>
                        ) : null}
                        <li
                            style={{ transitionDelay: menuOpen ? `${45 + (SITE_NAVIGATION.length + 1) * 35}ms` : '0ms' }}
                            className={`${askChat.enabled ? 'mt-2.5' : 'mt-5'} transition-[opacity,transform] duration-300 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${menuOpen ? 'translate-y-0 opacity-100' : '-translate-y-1.5 opacity-0'}`}
                        >
                            <a
                                href="/cv.pdf"
                                onClick={() => setMenuOpen(false)}
                                className="flex min-h-14 w-full items-center justify-between gap-3 bg-[var(--inverse-bg)] px-4 font-mono text-xs font-bold uppercase tracking-[0.12em] text-[var(--inverse-text)] transition-opacity duration-300 ease-out hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 motion-reduce:transition-none"
                            >
                                <span>Download CV</span>
                                <Download aria-hidden="true" size={16} strokeWidth={2} />
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </header>
    );
}
