'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useActiveSection } from '@/lib/useActiveSection';
import RollingText from '@/components/ui/RollingText';
import LineSidebar from '@/components/ui/LineSidebar/LineSidebar';
import type { LineSidebarItem } from '@/components/ui/LineSidebar/LineSidebar';
import styles from './Navbar.module.css';

const NAV_ITEMS: LineSidebarItem[] = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'techstack', label: 'Tech Stack' },
    { id: 'experience', label: 'Experience' },
    { id: 'projects', label: 'Projects' },
    { id: 'contact', label: 'Contact' },
];

const NAV_ITEM_IDS = NAV_ITEMS.map((item) => item.id);
const TOP_THRESHOLD = 24;
const SCROLL_DELTA = 6;

type NavMode = 'top' | 'hidden' | 'compact';

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [mode, setMode] = useState<NavMode>('top');
    const navRef = useRef<HTMLElement>(null);
    const lastScrollYRef = useRef(0);
    const tickingRef = useRef(false);
    const active = useActiveSection(NAV_ITEM_IDS);

    const activeIndex = useMemo(() => {
        const index = NAV_ITEMS.findIndex((item) => item.id === active);
        return index >= 0 ? index : 0;
    }, [active]);

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
    }, [mode, menuOpen]);

    useEffect(() => {
        const updateMode = () => {
            const currentY = window.scrollY;
            const previousY = lastScrollYRef.current;
            const diff = currentY - previousY;

            if (currentY <= TOP_THRESHOLD) {
                setMode('top');
                setMenuOpen(false);
            } else if (diff > SCROLL_DELTA) {
                setMode('hidden');
                setMenuOpen(false);
            } else if (diff < -SCROLL_DELTA) {
                setMode('compact');
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
        if (!menuOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [menuOpen]);

    const scrollTo = useCallback((id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        setMenuOpen(false);
    }, []);

    const handleSidebarClick = useCallback(
        (_index: number, item: LineSidebarItem) => {
            scrollTo(item.id);
        },
        [scrollTo]
    );

    const showPill = mode === 'top' && !menuOpen;
    const showCompact = mode === 'compact' || menuOpen;

    return (
        <>
            <header className={styles.header}>
                <nav
                    ref={navRef}
                    className={`${styles.pillNav} ${showPill ? styles.visible : styles.hidden}`}
                    aria-label="Primary navigation"
                    aria-hidden={!showPill}
                >
                    <button onClick={() => scrollTo('home')} className={styles.logoButton} type="button">
                        <span className={styles.logoText}>JM</span>
                        <span className={styles.logoGlow} aria-hidden="true" />
                    </button>

                    <ul className={styles.desktopList}>
                        {NAV_ITEMS.map((item) => {
                            const isActive = active === item.id;
                            return (
                                <li key={item.id}>
                                    <button
                                        onClick={() => scrollTo(item.id)}
                                        className={`${styles.navLink} ${isActive ? styles.activeLink : ''}`}
                                        type="button"
                                    >
                                        <RollingText>{item.label}</RollingText>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>

                    <button
                        onClick={() => setMenuOpen((prev) => !prev)}
                        className={`${styles.mobileMenuButton} ${menuOpen ? styles.menuButtonOpen : ''}`}
                        type="button"
                        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                        aria-expanded={menuOpen}
                        aria-controls="portfolio-navigation-overlay"
                    >
                        <span aria-hidden="true" />
                        <span aria-hidden="true" />
                        <span aria-hidden="true" />
                    </button>
                </nav>

                <nav
                    className={`${styles.compactNav} ${showCompact ? styles.visible : styles.hidden}`}
                    aria-label="Compact navigation"
                    aria-hidden={!showCompact}
                >
                    <div className={styles.compactLogoPill}>
                        <button onClick={() => scrollTo('home')} className={styles.compactLogo} type="button">
                            <span>J</span>
                            <span className={styles.logoAccent}>M</span>
                        </button>
                    </div>

                    <button
                        onClick={() => setMenuOpen((prev) => !prev)}
                        className={`${styles.compactMenuButton} ${menuOpen ? styles.menuButtonOpen : ''}`}
                        type="button"
                        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                        aria-expanded={menuOpen}
                        aria-controls="portfolio-navigation-overlay"
                    >
                        <span className={styles.menuIcon} aria-hidden="true">
                            <span aria-hidden="true" />
                            <span aria-hidden="true" />
                            <span aria-hidden="true" />
                        </span>
                        <span className={styles.menuLabel}>
                            <RollingText>Menu</RollingText>
                        </span>
                    </button>
                </nav>
            </header>

            <div
                id="portfolio-navigation-overlay"
                className={`${styles.overlay} ${menuOpen ? styles.overlayOpen : ''}`}
                aria-hidden={!menuOpen}
            >
                <div className={styles.overlayScrim} onClick={() => setMenuOpen(false)} aria-hidden="true" />
                <div className={styles.overlayPanel}>
                    <LineSidebar
                        items={NAV_ITEMS}
                        accentColor="#c36dfc"
                        textColor="#e7e9ec"
                        markerColor="rgba(231, 233, 236, 0.34)"
                        defaultActive={activeIndex}
                        proximityRadius={120}
                        maxShift={34}
                        markerLength={76}
                        itemGap={24}
                        fontSize={1.28}
                        smoothing={90}
                        onItemClick={handleSidebarClick}
                    />
                </div>
            </div>
        </>
    );
}