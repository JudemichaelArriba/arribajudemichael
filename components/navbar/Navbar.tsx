'use client';

import { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { useActiveSection } from '@/lib/useActiveSection';
import RollingText from '@/components/ui/RollingText';

const NAV_ITEMS = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'techstack', label: 'Tech Stack' },
    { id: 'experience', label: 'Experience' },
    { id: 'projects', label: 'Projects' },
    { id: 'contact', label: 'Contact' },
];

const NAV_ITEM_IDS = NAV_ITEMS.map((item) => item.id);

export default function Navbar() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const navRef = useRef<HTMLElement>(null);
    const active = useActiveSection(NAV_ITEM_IDS);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        setMobileOpen(false);
    };

    return (
        <header className="pointer-events-none fixed inset-x-0 top-0 z-50 isolate px-4 pt-[calc(env(safe-area-inset-top)+1rem)] md:px-6 md:pt-[calc(env(safe-area-inset-top)+1.5rem)]">
            <nav
                ref={navRef}
                className={`pointer-events-auto mx-auto flex max-w-5xl items-center justify-between rounded-full px-6 py-3 transition-all duration-500 ${
                    scrolled
                        ? 'border border-white/10 bg-[var(--bg)]/70 shadow-lg shadow-black/20 backdrop-blur-xl'
                        : 'border border-white/10 bg-white/[0.03] backdrop-blur-md'
                }`}
            >
                <button
                    onClick={() => scrollTo('home')}
                    className="group relative font-name text-2xl font-extrabold tracking-tight text-[var(--text)] transition-transform duration-300 hover:scale-105"
                >
                    <span className="relative z-10">JM</span>
                    <span className="absolute -inset-2 rounded-full bg-[var(--signal)]/20 blur-md opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </button>

                {/* Desktop Nav Items */}
                <ul className="hidden items-center gap-1 lg:gap-2 md:flex">
                    {NAV_ITEMS.map((item) => {
                        const isActive = active === item.id;
                        return (
                            <li key={item.id}>
                                <button
                                    onClick={() => scrollTo(item.id)}
                                    className={`px-3 py-2 font-mono text-sm uppercase tracking-wider transition-colors duration-300 ${
                                        isActive
                                            ? 'font-bold text-[var(--signal)]'
                                            : 'text-[var(--muted)] hover:text-[var(--text)]'
                                    }`}
                                >
                                    <RollingText>{item.label}</RollingText>
                                </button>
                            </li>
                        );
                    })}
                </ul>

                <button
                    onClick={() => setMobileOpen((prev) => !prev)}
                    className="relative rounded-full p-2 text-[var(--text)] transition-colors hover:bg-white/10 md:hidden"
                    aria-label="Toggle menu"
                    aria-expanded={mobileOpen}
                    aria-controls="mobile-navigation"
                >
                    {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </nav>

            {/* Mobile Nav Menu */}
            {mobileOpen && (
                <div
                    id="mobile-navigation"
                    className="pointer-events-auto mx-auto mt-3 max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[var(--bg)]/90 p-4 shadow-2xl backdrop-blur-2xl md:hidden"
                >
                    <ul className="flex flex-col gap-1">
                        {NAV_ITEMS.map((item) => {
                            const isActive = active === item.id;
                            return (
                                <li key={item.id}>
                                    <button
                                        onClick={() => scrollTo(item.id)}
                                        className={`block w-full rounded-xl px-4 py-3 text-left font-mono text-base uppercase tracking-wider transition-colors duration-200 ${
                                            isActive
                                                ? 'font-bold text-[var(--signal)]'
                                                : 'text-[var(--muted)] hover:text-[var(--text)]'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </header>
    );
}