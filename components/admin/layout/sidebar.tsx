'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Award,
    BarChart3,
    BriefcaseBusiness,
    ChevronDown,
    FolderKanban,
    Layers3,
    LayoutDashboard,
    LogOut,
    Menu,
    PanelLeftClose,
    PanelLeftOpen,
    X,
    type LucideIcon,
} from 'lucide-react';
import {
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
    type ReactNode,
} from 'react';

import { DialogProvider, useDialog } from '@/components/dialog/Dialog';
import { SnackbarProvider } from '@/components/snackbar/Snackbar';
import { logout } from '@/lib/auth/logoutActions';

interface AdminShellProps {
    children: ReactNode;
}

interface AdminNavigationItem {
    id: string;
    label: string;
    icon: LucideIcon;
}

interface SectionNavigationItem extends AdminNavigationItem {
    href: string;
}

interface DirectNavigationItem extends AdminNavigationItem {
    href: string;
}

interface NavigationContentProps {
    isExpanded: boolean;
    isMobile?: boolean;
    onAnalyticsNavigate?: () => void;
    onDashboardNavigate?: () => void;
    onSectionNavigate?: () => void;
    onToggleSections: () => void;
    pathname: string;
    sectionsId: string;
    sectionsOpen: boolean;
}

interface LogoutControlProps {
    showLabel: boolean;
}

interface LogoutButtonProps extends LogoutControlProps {
    onClick: () => void;
}

const DESKTOP_BREAKPOINT = '(min-width: 768px)';
const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SECTION_ITEMS: readonly SectionNavigationItem[] = [
    {
        id: 'projects',
        label: 'Projects',
        icon: FolderKanban,
        href: '/dashboard/projects',
    },
    {
        id: 'experiences',
        label: 'Experiences',
        icon: BriefcaseBusiness,
        href: '/dashboard/experiences',
    },
    {
        id: 'certificates',
        label: 'Certificates',
        icon: Award,
        href: '/dashboard/certificates',
    },
];

const ANALYTICS_ITEM: DirectNavigationItem = {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    href: '/dashboard/analytics',
};

const ITEM_BASE_CLASS =
    'group relative flex min-h-11 w-full items-center gap-3 px-3 text-sm font-semibold tracking-normal transition-[color,background-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/50 active:scale-[0.985] motion-reduce:transition-none motion-reduce:active:scale-100';

/** The current page is a solid ink tab — the same invert the public site uses
 *  on hover rows — so "where am I" reads at a glance, collapsed or not. */
const ITEM_ACTIVE_CLASS = 'bg-[var(--inverse-bg)] text-[var(--inverse-text)]';
const ITEM_IDLE_CLASS =
    'text-[var(--muted)] hover:bg-[var(--hairline-soft)] hover:text-[var(--text)]';

const ICON_CLASS =
    'shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0';

function GroupLabel({ children }: { children: ReactNode }) {
    return (
        <div className="flex items-center gap-3 px-3 pb-2 pt-1">
            <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--faint)]">
                {children}
            </span>
            <span aria-hidden="true" className="h-px flex-1 bg-[var(--hairline-soft)]" />
        </div>
    );
}

function NavigationContent({
    isExpanded,
    isMobile = false,
    onAnalyticsNavigate,
    onDashboardNavigate,
    onSectionNavigate,
    onToggleSections,
    pathname,
    sectionsId,
    sectionsOpen,
}: NavigationContentProps) {
    const showLabels = isMobile || isExpanded;
    const isSectionsVisible = showLabels && sectionsOpen;
    const isDashboardActive = pathname === '/dashboard';
    const isSectionRouteActive = SECTION_ITEMS.some(
        (item) => pathname === item.href,
    );
    const isAnalyticsActive = pathname === ANALYTICS_ITEM.href;
    const AnalyticsIcon = ANALYTICS_ITEM.icon;
    const alignment = showLabels ? 'justify-start' : 'justify-center px-0';

    return (
        <nav
            aria-label={isMobile ? 'Admin mobile navigation' : 'Admin navigation'}
            className="space-y-1"
        >
            {showLabels ? <GroupLabel>Workspace</GroupLabel> : null}

            <Link
                href="/dashboard"
                onClick={onDashboardNavigate}
                aria-current={isDashboardActive ? 'page' : undefined}
                aria-label={!showLabels ? 'Dashboard' : undefined}
                title={!showLabels ? 'Dashboard' : undefined}
                data-mobile-first={isMobile ? 'true' : undefined}
                className={`${ITEM_BASE_CLASS} ${alignment} ${isDashboardActive ? ITEM_ACTIVE_CLASS : ITEM_IDLE_CLASS}`}
            >
                <LayoutDashboard aria-hidden="true" size={18} strokeWidth={1.8} className={ICON_CLASS} />
                {showLabels ? <span>Dashboard</span> : null}
            </Link>

            <button
                type="button"
                onClick={onToggleSections}
                aria-expanded={isSectionsVisible}
                aria-controls={sectionsId}
                aria-label={!showLabels ? 'Open Sections' : undefined}
                title={!showLabels ? 'Sections' : undefined}
                className={`${ITEM_BASE_CLASS} ${alignment} ${isSectionRouteActive ? 'text-[var(--text)] hover:bg-[var(--hairline-soft)]' : ITEM_IDLE_CLASS}`}
            >
                <Layers3 aria-hidden="true" size={18} strokeWidth={1.8} className={ICON_CLASS} />
                {showLabels ? (
                    <>
                        <span className="min-w-0 flex-1 text-left">Sections</span>
                        <ChevronDown
                            aria-hidden="true"
                            size={16}
                            strokeWidth={1.8}
                            className={`shrink-0 text-[var(--faint)] transition-transform duration-300 ease-out motion-reduce:transition-none ${isSectionsVisible ? 'rotate-180' : 'rotate-0'}`}
                        />
                    </>
                ) : isSectionRouteActive ? (
                    <span
                        aria-hidden="true"
                        className="absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 bg-[var(--text)]"
                    />
                ) : null}
            </button>

            <div
                id={sectionsId}
                aria-hidden={!isSectionsVisible}
                inert={!isSectionsVisible ? true : undefined}
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${isSectionsVisible ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
                <div className="overflow-hidden">
                    <div className="ml-[1.45rem] space-y-1 border-l border-[var(--hairline-soft)] py-1 pl-2">
                        {SECTION_ITEMS.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    onClick={onSectionNavigate}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`${ITEM_BASE_CLASS} min-h-10 text-[13px] ${isActive ? ITEM_ACTIVE_CLASS : ITEM_IDLE_CLASS}`}
                                >
                                    <Icon aria-hidden="true" size={16} strokeWidth={1.8} className={ICON_CLASS} />
                                    <span className="min-w-0 truncate">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            {showLabels ? (
                <div className="pt-4">
                    <GroupLabel>Operations</GroupLabel>
                </div>
            ) : (
                <div aria-hidden="true" className="mx-3 my-3 h-px bg-[var(--hairline-soft)]" />
            )}

            <Link
                href={ANALYTICS_ITEM.href}
                onClick={onAnalyticsNavigate}
                aria-current={isAnalyticsActive ? 'page' : undefined}
                aria-label={!showLabels ? ANALYTICS_ITEM.label : undefined}
                title={!showLabels ? ANALYTICS_ITEM.label : undefined}
                className={`${ITEM_BASE_CLASS} ${alignment} ${isAnalyticsActive ? ITEM_ACTIVE_CLASS : ITEM_IDLE_CLASS}`}
            >
                <AnalyticsIcon aria-hidden="true" size={18} strokeWidth={1.8} className={ICON_CLASS} />
                {showLabels ? (
                    <span className="min-w-0 truncate">{ANALYTICS_ITEM.label}</span>
                ) : null}
            </Link>
        </nav>
    );
}

function LogoutButton({ showLabel, onClick }: LogoutButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label="Sign out"
            title={!showLabel ? 'Sign out' : undefined}
            className={`group flex min-h-11 w-full items-center gap-3 px-3 text-sm font-semibold tracking-normal text-[var(--faint)] transition-[color,background-color] duration-200 hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]/55 motion-reduce:transition-none ${showLabel ? 'justify-start' : 'justify-center px-0'}`}
        >
            <LogOut aria-hidden="true" size={18} strokeWidth={1.8} className={ICON_CLASS} />
            {showLabel ? <span>Logout</span> : null}
        </button>
    );
}

function LogoutControl({ showLabel }: LogoutControlProps) {
    const dialog = useDialog();

    const handleLogout = useCallback(() => {
        dialog.confirm(
            'Sign out?',
            'Your admin session will end and you will return to the login page.',
            async () => {
                await logout();
                return { ok: true };
            },
            undefined,
            {
                confirmLabel: 'Sign out',
                cancelLabel: 'Stay signed in',
                pendingLabel: 'Signing out...',
            },
        );
    }, [dialog]);

    return (
        <LogoutButton showLabel={showLabel} onClick={handleLogout} />
    );
}

function AdminShellContent({
    children,
}: AdminShellProps) {
    const pathname = usePathname();
    const [isDesktopExpanded, setIsDesktopExpanded] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [sectionsOpen, setSectionsOpen] = useState(() =>
        SECTION_ITEMS.some((item) => pathname === item.href),
    );
    const desktopSectionsId = `desktop-sections-${useId()}`;
    const mobileSectionsId = `mobile-sections-${useId()}`;
    const mobileMenuId = `admin-mobile-menu-${useId()}`;
    const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
    const mobilePanelRef = useRef<HTMLDivElement>(null);
    const closeMobileMenu = useCallback((restoreFocus = false) => {
        setIsMobileMenuOpen(false);

        if (restoreFocus) {
            window.requestAnimationFrame(() => mobileMenuButtonRef.current?.focus());
        }
    }, []);

    useEffect(() => {
        const mediaQuery = window.matchMedia(DESKTOP_BREAKPOINT);
        const handleBreakpointChange = (event: MediaQueryListEvent) => {
            if (event.matches) {
                setIsMobileMenuOpen(false);
            }
        };

        mediaQuery.addEventListener('change', handleBreakpointChange);
        return () => mediaQuery.removeEventListener('change', handleBreakpointChange);
    }, []);

    useEffect(() => {
        if (!isMobileMenuOpen) {
            return;
        }

        const panel = mobilePanelRef.current;
        const previousOverflow = document.body.style.overflow;
        const focusFrame = window.requestAnimationFrame(() => {
            panel
                ?.querySelector<HTMLElement>('[data-mobile-first="true"]')
                ?.focus();
        });

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeMobileMenu(true);
                return;
            }

            if (event.key !== 'Tab' || !panel) {
                return;
            }

            const panelItems = Array.from(
                panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
            );
            const focusableItems = [
                mobileMenuButtonRef.current,
                ...panelItems,
            ].filter((item): item is HTMLElement => Boolean(item));

            if (focusableItems.length === 0) {
                return;
            }

            const firstItem = focusableItems[0];
            const lastItem = focusableItems[focusableItems.length - 1];

            if (event.shiftKey && document.activeElement === firstItem) {
                event.preventDefault();
                lastItem.focus();
            } else if (!event.shiftKey && document.activeElement === lastItem) {
                event.preventDefault();
                firstItem.focus();
            }
        };

        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            window.cancelAnimationFrame(focusFrame);
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [closeMobileMenu, isMobileMenuOpen]);

    const handleDesktopSectionsToggle = () => {
        if (!isDesktopExpanded) {
            setIsDesktopExpanded(true);
            setSectionsOpen(true);
            return;
        }

        setSectionsOpen((isOpen) => !isOpen);
    };

    return (
        <div className="relative min-h-svh overflow-x-clip bg-[#020203] text-[var(--text)]">
            <aside
                className={`fixed bottom-4 left-4 top-4 z-40 hidden flex-col overflow-visible border border-[var(--hairline-soft)] bg-[#050607] shadow-[0_24px_60px_rgba(0,0,0,0.45)] transition-[width] duration-300 ease-out motion-reduce:transition-none md:flex ${isDesktopExpanded ? 'w-64' : 'w-[4.5rem]'}`}
            >
                <button
                    type="button"
                    onClick={() => setIsDesktopExpanded((isExpanded) => !isExpanded)}
                    aria-label={
                        isDesktopExpanded
                            ? 'Collapse admin navigation'
                            : 'Expand admin navigation'
                    }
                    title={isDesktopExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                    className="absolute -right-3.5 top-[3.25rem] z-10 flex size-7 items-center justify-center border border-[var(--hairline)] bg-[#050607] text-[var(--faint)] transition-[color,border-color] duration-200 hover:border-[var(--text)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/50 motion-reduce:transition-none"
                >
                    {isDesktopExpanded ? (
                        <PanelLeftClose aria-hidden="true" size={14} strokeWidth={1.8} />
                    ) : (
                        <PanelLeftOpen aria-hidden="true" size={14} strokeWidth={1.8} />
                    )}
                </button>

                <div
                    className={`flex h-20 shrink-0 items-center border-b border-[var(--hairline-soft)] ${isDesktopExpanded ? 'px-4' : 'justify-center px-2'}`}
                >
                    <Link
                        href="/dashboard"
                        aria-label="Admin dashboard"
                        className="group flex min-w-0 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/50 focus-visible:ring-offset-4 focus-visible:ring-offset-[#050607]"
                    >
                        <span className="flex size-10 shrink-0 items-center justify-center border border-[var(--hairline)] font-name text-lg font-extrabold tracking-tight text-[var(--text)] transition-colors duration-300 group-hover:border-[var(--text)] motion-reduce:transition-none">
                            J<span className="text-[var(--faint)] transition-colors duration-300 group-hover:text-[var(--text)] motion-reduce:transition-none">M</span>
                        </span>
                        {isDesktopExpanded ? (
                            <span className="min-w-0">
                                <span className="block truncate font-display text-[15px] font-bold tracking-[-0.01em] text-[var(--text)]">
                                    Admin panel
                                </span>
                                <span className="mt-1 flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--faint)]">
                                    <span aria-hidden="true" className="size-1.5 bg-[var(--text)]" />
                                    Portfolio console
                                </span>
                            </span>
                        ) : null}
                    </Link>
                </div>

                <div className="scrollbar-hide flex-1 overflow-y-auto px-2.5 py-5">
                    <NavigationContent
                        isExpanded={isDesktopExpanded}
                        onSectionNavigate={() => setSectionsOpen(true)}
                        onToggleSections={handleDesktopSectionsToggle}
                        pathname={pathname}
                        sectionsId={desktopSectionsId}
                        sectionsOpen={sectionsOpen}
                    />
                </div>

                <div className="shrink-0 border-t border-[var(--hairline-soft)] p-2.5">
                    <LogoutControl showLabel={isDesktopExpanded} />
                </div>
            </aside>

            <div
                aria-hidden="true"
                onClick={() => closeMobileMenu(true)}
                className={`fixed inset-0 z-40 bg-black/75 backdrop-blur-[3px] transition-[opacity,backdrop-filter] duration-300 motion-reduce:transition-none md:hidden ${isMobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
            />

            <header className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[60] md:hidden">
                <div
                    className={`flex h-14 items-center justify-between border bg-[#050607] px-2.5 transition-[border-color,box-shadow] duration-300 motion-reduce:transition-none ${isMobileMenuOpen ? 'border-[var(--hairline)] shadow-[0_18px_48px_rgba(0,0,0,0.5)]' : 'border-[var(--hairline-soft)] shadow-[0_12px_36px_rgba(0,0,0,0.38)]'}`}
                >
                    <Link
                        href="/dashboard"
                        onClick={() => closeMobileMenu()}
                        aria-label="Admin dashboard"
                        className="flex min-w-0 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/50"
                    >
                        <span className="flex size-10 shrink-0 items-center justify-center border border-[var(--hairline)] font-name text-lg font-extrabold tracking-tight text-[var(--text)]">
                            J<span className="text-[var(--faint)]">M</span>
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate font-display text-sm font-bold tracking-[-0.01em] text-[var(--text)]">
                                Admin panel
                            </span>
                            <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--faint)]">
                                <span aria-hidden="true" className="size-1 bg-[var(--text)]" />
                                Portfolio console
                            </span>
                        </span>
                    </Link>

                    <button
                        ref={mobileMenuButtonRef}
                        type="button"
                        onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
                        aria-expanded={isMobileMenuOpen}
                        aria-controls={mobileMenuId}
                        aria-label={isMobileMenuOpen ? 'Close admin menu' : 'Open admin menu'}
                        className={`relative flex size-10 shrink-0 items-center justify-center border transition-[border-color,background-color,color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/50 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 ${isMobileMenuOpen ? 'border-[var(--inverse-bg)] bg-[var(--inverse-bg)] text-[var(--inverse-text)]' : 'border-[var(--hairline)] text-[var(--muted)] hover:border-[var(--text)] hover:text-[var(--text)]'}`}
                    >
                        <Menu
                            aria-hidden="true"
                            size={19}
                            strokeWidth={1.8}
                            className={`absolute transition-[opacity,transform] duration-200 motion-reduce:transition-none ${isMobileMenuOpen ? 'rotate-90 scale-75 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}
                        />
                        <X
                            aria-hidden="true"
                            size={19}
                            strokeWidth={1.8}
                            className={`absolute transition-[opacity,transform] duration-200 motion-reduce:transition-none ${isMobileMenuOpen ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-75 opacity-0'}`}
                        />
                    </button>
                </div>
            </header>

            <div
                ref={mobilePanelRef}
                id={mobileMenuId}
                role="dialog"
                aria-modal="true"
                aria-label="Admin navigation"
                aria-hidden={!isMobileMenuOpen}
                inert={!isMobileMenuOpen ? true : undefined}
                className={`fixed inset-x-3 top-[calc(env(safe-area-inset-top)+5rem)] z-50 max-h-[calc(100dvh-env(safe-area-inset-top)-6rem)] overflow-y-auto border bg-[#050607] shadow-[0_24px_64px_rgba(0,0,0,0.58)] transition-[opacity,transform,border-color] duration-300 ease-out motion-reduce:transition-none md:hidden ${isMobileMenuOpen ? 'pointer-events-auto translate-y-0 border-[var(--hairline)] opacity-100' : 'pointer-events-none -translate-y-2 border-[var(--hairline-soft)] opacity-0'}`}
            >
                <div className="p-2.5">
                    <NavigationContent
                        isExpanded
                        isMobile
                        onAnalyticsNavigate={() => closeMobileMenu()}
                        onDashboardNavigate={() => closeMobileMenu()}
                        onSectionNavigate={() => {
                            setSectionsOpen(true);
                            closeMobileMenu();
                        }}
                        onToggleSections={() => setSectionsOpen((isOpen) => !isOpen)}
                        pathname={pathname}
                        sectionsId={mobileSectionsId}
                        sectionsOpen={sectionsOpen}
                    />
                </div>
                <div className="border-t border-[var(--hairline-soft)] p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
                    <LogoutControl showLabel />
                </div>
            </div>

            <main
                inert={isMobileMenuOpen ? true : undefined}
                className={`min-h-svh min-w-0 pt-[calc(env(safe-area-inset-top)+5.75rem)] transition-[padding] duration-300 ease-out motion-reduce:transition-none md:pt-0 ${isDesktopExpanded ? 'md:pl-[17rem]' : 'md:pl-[5.5rem]'}`}
            >
                {children}
            </main>
        </div>
    );
}

export default function AdminShell(props: AdminShellProps) {
    return (
        <DialogProvider>
            <SnackbarProvider>
                <AdminShellContent {...props} />
            </SnackbarProvider>
        </DialogProvider>
    );
}
