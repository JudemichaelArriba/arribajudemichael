'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useActiveSection } from '@/lib/useActiveSection';
import RollingText from '@/components/ui/RollingText';
import styles from './Navbar.module.css';

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

type NavMode = 'top' | 'hidden' | 'visible';

export default function Navbar() {
    const [mode, setMode] = useState<NavMode>('top');
    const navRef = useRef<HTMLElement>(null);
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

    const scrollTo = useCallback((id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const isNavVisible = mode !== 'hidden';

    return (
        <header className={styles.header}>
            <nav
                ref={navRef}
                className={`${styles.pillNav} ${isNavVisible ? styles.visible : styles.hidden}`}
                aria-label="Primary navigation"
            >
                <button onClick={() => scrollTo('home')} className={styles.logoButton} type="button">
                    <span className={styles.logoText}>JM</span>
                    <span className={styles.logoGlow} aria-hidden="true" />
                </button>

                <ul className={styles.navList}>
                    {NAV_ITEMS.map((item) => {
                        const isActive = active === item.id || (active === 'what-i-do' && item.id === 'home');

                        return (
                            <li key={item.id} className={styles.navItem}>
                                <button
                                    onClick={() => scrollTo(item.id)}
                                    className={`${styles.navLink} ${isActive ? styles.activeLink : ''}`}
                                    type="button"
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    <RollingText>{item.label}</RollingText>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </header>
    );
}
