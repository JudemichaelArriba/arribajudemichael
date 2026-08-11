'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useActiveSection } from '@/lib/useActiveSection';
import { SITE_NAVIGATION } from '@/lib/site';
import { NAV_LINK_UNDERLINE_CLASS } from '@/components/ui/navigationStyles';

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
    const menuPanelRef = useRef<HTMLDivElement>(null);
    const lastScrollYRef = useRef(0);
    const tickingRef = useRef(false);
    const active = useActiveSection(TRACKED_SECTION_IDS);

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
        setMenuOpen(false);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const isNavVisible = mode !== 'hidden';

    return (
        <header className="pointer-events-none fixed inset-x-0 top-0 z-[70] px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-4 sm:pt-[calc(env(safe-area-inset-top)+1rem)] md:px-6 md:pt-[calc(env(safe-area-inset-top)+1.5rem)]">
            <div className="relative mx-auto w-full max-w-[72rem]">

                <div
                    aria-hidden="true"
                    onClick={() => setMenuOpen(false)}
                    className={`fixed inset-0 bg-black/70 backdrop-blur-[5px] transition-[opacity,backdrop-filter] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:hidden ${menuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                        }`}
                />

                <nav
                    ref={navRef}
                    aria-label="Primary navigation"
                    className={`pointer-events-auto relative isolate flex h-14 items-center justify-between gap-3 rounded-full border px-2.5 backdrop-blur-[20px] transition-[opacity,transform,filter,border-color,background-color,box-shadow] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:gap-4 md:px-3 ${menuOpen
                        ? 'border-[rgba(195,109,252,0.28)] bg-black/[0.58] shadow-[0_18px_56px_rgba(0,0,0,0.5),0_0_24px_rgba(195,109,252,0.08)]'
                        : 'border-white/[0.11] bg-black/[0.34] shadow-[0_12px_42px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.025)]'
                        } ${isNavVisible
                        ? 'translate-y-0 opacity-100 blur-none'
                        : 'pointer-events-none -translate-y-4 opacity-0 blur-md'
                        }`}
                >
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
                    />
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/[0.025]"
                    />

                    <button
                        onClick={() => scrollTo('home')}
                        type="button"
                        aria-label="Go to home"
                        className="group relative z-[1] flex h-11 w-11 shrink-0 items-center justify-center font-[family-name:var(--font-name)] text-[1.35rem] font-extrabold tracking-normal text-[var(--text)] transition-[color,transform] duration-300 ease-out hover:scale-[1.025] hover:text-white focus-visible:text-white focus-visible:outline-none active:scale-[0.98] motion-reduce:transition-none md:h-10 md:w-12 md:text-2xl"
                    >
                        <span className="relative z-[1] inline-flex items-center leading-none">
                            J<span className="text-[var(--signal)] transition-colors duration-300 group-hover:text-[#e945f5]">M</span>
                            <span
                                aria-hidden="true"
                                className={`${NAV_LINK_UNDERLINE_CLASS} scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100`}
                            />
                        </span>
                    </button>

                    <ul className="relative z-[1] hidden h-10 min-w-0 items-center gap-1 md:flex lg:gap-2">
                        {SITE_NAVIGATION.map((item) => {
                            const isActive = active === item.id || (active === 'what-i-do' && item.id === 'home');

                            return (
                                <li key={item.id} className="flex h-full shrink-0 items-center">
                                    <button
                                        onClick={() => scrollTo(item.id)}
                                        type="button"
                                        aria-current={isActive ? 'page' : undefined}
                                        className={`group relative flex h-10 items-center justify-center px-2.5 font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-semibold uppercase tracking-normal transition-colors duration-300 ease-out focus-visible:text-[var(--signal)] focus-visible:outline-none motion-reduce:transition-none lg:px-3 lg:text-xs ${isActive
                                            ? 'font-bold text-[var(--signal)]'
                                            : 'text-[var(--muted)]/65 hover:text-[var(--text)]'
                                            }`}
                                    >
                                        <span className="relative z-[1] inline-flex items-center leading-none">
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

                    <button
                        ref={menuButtonRef}
                        onClick={() => setMenuOpen((prev) => !prev)}
                        type="button"
                        aria-expanded={menuOpen}
                        aria-controls="mobile-nav-panel"
                        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        className={`group relative z-[1] flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border transition-[transform,border-color,background-color,box-shadow] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-95 motion-reduce:transition-none md:hidden ${menuOpen
                            ? 'border-[var(--signal)]/40 bg-[rgba(195,109,252,0.09)] shadow-[0_0_24px_rgba(195,109,252,0.16),inset_0_0_12px_rgba(195,109,252,0.04)]'
                            : 'border-white/[0.11] bg-black/20 hover:border-white/25 hover:bg-white/[0.055]'
                            }`}
                    >
                        <span
                            aria-hidden="true"
                            className={`absolute inset-1 rounded-full bg-[var(--signal)] transition-opacity duration-300 motion-reduce:transition-none ${menuOpen ? 'opacity-[0.06]' : 'opacity-0 group-hover:opacity-[0.035]'
                                }`}
                        />
                        <span aria-hidden="true" className="relative z-[1] h-5 w-5">
                            <Menu
                                strokeWidth={1.8}
                                className={`absolute inset-0 h-5 w-5 text-[var(--text)] transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${menuOpen
                                    ? 'rotate-90 scale-75 opacity-0'
                                    : 'rotate-0 scale-100 opacity-100'
                                    }`}
                            />
                            <X
                                strokeWidth={1.8}
                                className={`absolute inset-0 h-5 w-5 text-[var(--signal)] transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${menuOpen
                                    ? 'rotate-0 scale-100 opacity-100'
                                    : '-rotate-90 scale-75 opacity-0'
                                    }`}
                            />
                        </span>
                    </button>
                </nav>

                <div
                    id="mobile-nav-panel"
                    ref={menuPanelRef}
                    inert={!menuOpen ? true : undefined}
                    aria-hidden={!menuOpen}
                    className={`absolute inset-x-0 top-full z-10 mt-2.5 origin-top overflow-hidden rounded-[1.4rem] border bg-[rgba(3,3,7,0.82)] shadow-[0_28px_80px_rgba(0,0,0,0.58),0_0_0_1px_rgba(255,255,255,0.018)] backdrop-blur-[20px] transition-[opacity,transform,filter,border-color] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none sm:left-auto sm:right-0 sm:w-[22rem] md:hidden ${menuOpen
                        ? 'pointer-events-auto translate-y-0 scale-100 border-white/[0.12] opacity-100 blur-none'
                        : 'pointer-events-none -translate-y-2.5 scale-[0.98] border-white/[0.06] opacity-0 blur-sm'
                        }`}
                >
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[var(--signal)]/40 to-transparent"
                    />
                    <ul className="relative flex flex-col gap-1 p-2.5">
                        {SITE_NAVIGATION.map((item, index) => {
                            const isActive = active === item.id || (active === 'what-i-do' && item.id === 'home');

                            return (
                                <li
                                    key={item.id}
                                    style={{ transitionDelay: menuOpen ? `${45 + index * 35}ms` : '0ms' }}
                                    className={`relative transition-[opacity,transform] duration-300 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${menuOpen ? 'translate-y-0 opacity-100' : '-translate-y-1.5 opacity-0'
                                        }`}
                                >
                                    <button
                                        onClick={() => scrollTo(item.id)}
                                        type="button"
                                        aria-current={isActive ? 'page' : undefined}
                                        className={`group relative flex min-h-12 w-full items-center justify-between overflow-hidden rounded-[0.9rem] border px-4 py-3 text-left font-[family-name:var(--font-jetbrains-mono)] text-sm font-semibold uppercase tracking-normal transition-[color,border-color,background-color,transform,box-shadow] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 focus-visible:ring-offset-1 focus-visible:ring-offset-black active:scale-[0.985] motion-reduce:transition-none ${isActive
                                            ? 'border-[rgba(195,109,252,0.18)] bg-[rgba(195,109,252,0.09)] font-bold text-[var(--signal)] shadow-[inset_0_0_18px_rgba(195,109,252,0.04)]'
                                            : 'border-transparent text-[var(--muted)]/70 hover:border-white/[0.075] hover:bg-white/[0.04] hover:text-[var(--text)]'
                                            }`}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={`absolute left-2 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--signal)] shadow-[0_0_10px_rgba(195,109,252,0.35)] transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${isActive
                                                ? 'scale-y-100 opacity-100'
                                                : 'scale-y-50 opacity-0 group-hover:scale-y-75 group-hover:opacity-30'
                                                }`}
                                        />
                                        <span className="relative z-[1] pl-1">{item.label}</span>
                                        <span
                                            aria-hidden="true"
                                            className={`relative z-[1] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--signal)] shadow-[0_0_10px_rgba(195,109,252,0.7)] transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${isActive
                                                ? 'scale-100 opacity-100'
                                                : 'scale-50 opacity-0 group-hover:scale-75 group-hover:opacity-[0.28]'
                                                }`}
                                        />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </header>
    );
}
