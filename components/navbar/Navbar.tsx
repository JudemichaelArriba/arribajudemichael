'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useActiveSection } from '@/lib/useActiveSection';
import RollingText from '@/components/ui/RollingText';

interface NavItem {
    id: string;
    label: string;
}

const NAV_ITEMS: NavItem[] = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'techstack', label: 'Tech Stack' },
    { id: 'experience', label: 'Experience' },
    { id: 'projects', label: 'Projects' },
    { id: 'contact', label: 'Contact' },
];

const TRACKED_SECTION_IDS = ['home', 'what-i-do', ...NAV_ITEMS.filter((item) => item.id !== 'home').map((item) => item.id)];
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
        if (mode === 'hidden' && menuOpen) setMenuOpen(false);
    }, [mode, menuOpen]);


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
        <header className="pointer-events-none fixed inset-x-0 top-0 z-[70] px-4 pt-[calc(env(safe-area-inset-top)+1rem)] md:px-6 md:pt-[calc(env(safe-area-inset-top)+1.5rem)]">
            <div className="relative mx-auto w-full max-w-[72rem]">

                <div
                    aria-hidden="true"
                    onClick={() => setMenuOpen(false)}
                    className={`fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ease-out motion-reduce:transition-none md:hidden ${menuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                        }`}
                />

                <nav
                    ref={navRef}
                    aria-label="Primary navigation"
                    className={`pointer-events-auto relative flex items-center justify-between gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-[0.68rem] backdrop-blur-[14px] transition-[opacity,transform,filter,border-color,background-color] duration-300 ease-out motion-reduce:transition-none md:gap-4 md:px-8 md:py-3 ${isNavVisible
                        ? 'translate-y-0 opacity-100 blur-none'
                        : 'pointer-events-none -translate-y-4 opacity-0 blur-md'
                        }`}
                >
                    <button
                        onClick={() => scrollTo('home')}
                        type="button"
                        className="group relative shrink-0 font-[family-name:var(--font-name)] text-[1.35rem] font-extrabold text-[var(--text)] transition-transform duration-300 ease-out hover:scale-105 md:text-2xl"
                    >
                        <span className="relative z-[1]">JM</span>
                        <span
                            aria-hidden="true"
                            className="absolute -inset-2 rounded-full bg-[rgba(195,109,252,0.2)] opacity-0 blur-xl transition-opacity duration-300 ease-out group-hover:opacity-100"
                        />
                    </button>

                    <ul className="hidden min-w-0 items-center gap-2 md:flex">
                        {NAV_ITEMS.map((item) => {
                            const isActive = active === item.id || (active === 'what-i-do' && item.id === 'home');

                            return (
                                <li key={item.id} className="shrink-0">
                                    <button
                                        onClick={() => scrollTo(item.id)}
                                        type="button"
                                        aria-current={isActive ? 'page' : undefined}
                                        className={`rounded-full px-3 py-2 font-[family-name:var(--font-jetbrains-mono)] text-sm uppercase tracking-[0.08em] transition-colors duration-300 ease-out ${isActive ? 'font-extrabold text-[var(--signal)]' : 'text-[var(--muted)] hover:text-[var(--signal)]'
                                            }`}
                                    >
                                        <RollingText>{item.label}</RollingText>
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
                        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full md:hidden"
                    >
                        <span aria-hidden="true" className="relative flex h-[14px] w-[18px] flex-col justify-between">
                            <span
                                className={`h-[1.5px] w-full origin-center rounded-full bg-[var(--text)] transition-transform duration-300 ease-out motion-reduce:transition-none ${menuOpen ? 'translate-y-[6.25px] rotate-45' : ''
                                    }`}
                            />
                            <span
                                className={`h-[1.5px] w-full rounded-full bg-[var(--text)] transition-opacity duration-200 ease-out motion-reduce:transition-none ${menuOpen ? 'opacity-0' : 'opacity-100'
                                    }`}
                            />
                            <span
                                className={`h-[1.5px] w-full origin-center rounded-full bg-[var(--text)] transition-transform duration-300 ease-out motion-reduce:transition-none ${menuOpen ? '-translate-y-[6.25px] -rotate-45' : ''
                                    }`}
                            />
                        </span>
                    </button>
                </nav>

                <div
                    id="mobile-nav-panel"
                    ref={menuPanelRef}
                    inert={!menuOpen ? true : undefined}
                    className={`absolute inset-x-0 top-full z-10 mt-3 origin-top overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/40 backdrop-blur-[14px] transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none md:hidden ${menuOpen
                        ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                        : 'pointer-events-none -translate-y-2 scale-[0.97] opacity-0'
                        }`}
                >
                    <ul className="flex flex-col gap-1 p-3">
                        {NAV_ITEMS.map((item) => {
                            const isActive = active === item.id || (active === 'what-i-do' && item.id === 'home');

                            return (
                                <li key={item.id}>
                                    <button
                                        onClick={() => scrollTo(item.id)}
                                        type="button"
                                        aria-current={isActive ? 'page' : undefined}
                                        className={`relative flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left font-[family-name:var(--font-jetbrains-mono)] text-sm uppercase tracking-[0.08em] transition-colors duration-300 ease-out ${isActive ? 'font-extrabold text-[var(--signal)]' : 'text-[var(--muted)] hover:text-[var(--signal)]'
                                            }`}
                                    >
                                        <RollingText>{item.label}</RollingText>
                                        <span
                                            aria-hidden="true"
                                            className={`h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--signal)] transition-transform duration-300 ease-out ${isActive ? 'scale-100' : 'scale-0'
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