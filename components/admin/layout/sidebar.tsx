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
    Mail,
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
import { useMessageRealtime } from '@/components/admin/messages/useMessageRealtime';
import { SnackbarProvider } from '@/components/snackbar/Snackbar';
import { logout } from '@/lib/auth/logoutActions';

interface AdminShellProps {
    children: ReactNode;
    initialUnreadMessageCount?: number | null;
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
    onMessageNavigate?: () => void;
    onSectionNavigate?: () => void;
    onToggleSections: () => void;
    pathname: string;
    sectionsId: string;
    sectionsOpen: boolean;
    unreadMessageCount: number;
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

const MESSAGE_ITEM: DirectNavigationItem = {
    id: 'messages',
    label: 'Emails / Messages',
    icon: Mail,
    href: '/dashboard/messages',
};

const INTERACTIVE_ITEM_CLASS =
    'group relative flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold tracking-normal transition-[color,background-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/65 active:scale-[0.985] motion-reduce:transition-none motion-reduce:active:scale-100';

function formatUnreadMessageCount(count: number): string {
    return count > 99 ? '99+' : String(count);
}

function NavigationContent({
    isExpanded,
    isMobile = false,
    onAnalyticsNavigate,
    onDashboardNavigate,
    onMessageNavigate,
    onSectionNavigate,
    onToggleSections,
    pathname,
    sectionsId,
    sectionsOpen,
    unreadMessageCount,
}: NavigationContentProps) {
    const showLabels = isMobile || isExpanded;
    const isSectionsVisible = showLabels && sectionsOpen;
    const isDashboardActive = pathname === '/dashboard';
    const isSectionRouteActive = SECTION_ITEMS.some(
        (item) => pathname === item.href,
    );
    const isAnalyticsActive = pathname === ANALYTICS_ITEM.href;
    const isMessageActive = pathname === MESSAGE_ITEM.href;
    const AnalyticsIcon = ANALYTICS_ITEM.icon;
    const MessageIcon = MESSAGE_ITEM.icon;
    const unreadMessageLabel = unreadMessageCount === 1
        ? '1 unread message'
        : `${unreadMessageCount} unread messages`;
    const collapsedMessageLabel = unreadMessageCount > 0
        ? `${MESSAGE_ITEM.label}, ${unreadMessageLabel}`
        : MESSAGE_ITEM.label;

    return (
        <nav
            aria-label={isMobile ? 'Admin mobile navigation' : 'Admin navigation'}
            className="space-y-1"
        >
            {showLabels ? (
                <p className="px-3 pb-2 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]/30">
                    Workspace
                </p>
            ) : null}
            <Link
                href="/dashboard"
                onClick={onDashboardNavigate}
                aria-current={isDashboardActive ? 'page' : undefined}
                aria-label={!showLabels ? 'Dashboard' : undefined}
                title={!showLabels ? 'Dashboard' : undefined}
                data-mobile-first={isMobile ? 'true' : undefined}
                className={`group relative flex min-h-11 w-full items-center gap-3 overflow-hidden rounded-md px-3 text-sm font-semibold tracking-normal transition-[color,background-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/65 active:scale-[0.985] motion-reduce:transition-none motion-reduce:active:scale-100 ${showLabels ? 'justify-start' : 'justify-center px-0'} ${
                    isDashboardActive
                        ? 'bg-white/[0.055] text-[var(--text)]'
                        : 'text-[var(--muted)]/65 hover:bg-white/[0.035] hover:text-[var(--text)]'
                }`}
            >
                <span
                    aria-hidden="true"
                    className={`absolute bottom-2 left-0 top-2 w-0.5 bg-[var(--signal)] transition-opacity duration-200 motion-reduce:transition-none ${isDashboardActive ? 'opacity-100' : 'opacity-0'}`}
                />
                <LayoutDashboard aria-hidden="true" size={18} strokeWidth={1.8} />
                {showLabels ? <span>Dashboard</span> : null}
            </Link>

            <button
                type="button"
                onClick={onToggleSections}
                aria-expanded={isSectionsVisible}
                aria-controls={sectionsId}
                aria-label={!showLabels ? 'Open Sections' : undefined}
                title={!showLabels ? 'Sections' : undefined}
                className={`${INTERACTIVE_ITEM_CLASS} ${showLabels ? 'justify-start' : 'justify-center px-0'} ${isSectionRouteActive ? 'bg-white/[0.045] text-[var(--signal)]' : 'text-[var(--muted)]/65 hover:bg-white/[0.035] hover:text-[var(--text)]'}`}
            >
                <Layers3 aria-hidden="true" size={18} strokeWidth={1.8} />
                {showLabels ? (
                    <>
                        <span className="min-w-0 flex-1 text-left">Sections</span>
                        <ChevronDown
                            aria-hidden="true"
                            size={16}
                            strokeWidth={1.8}
                            className={`shrink-0 transition-transform duration-200 motion-reduce:transition-none ${isSectionsVisible ? 'rotate-180' : 'rotate-0'}`}
                        />
                    </>
                ) : null}
            </button>

            <div
                id={sectionsId}
                aria-hidden={!isSectionsVisible}
                inert={!isSectionsVisible ? true : undefined}
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${isSectionsVisible ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
                <div className="overflow-hidden">
                    <div className="ml-4 space-y-1 border-l border-white/[0.06] pb-1 pl-2 pt-1">
                        {SECTION_ITEMS.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    onClick={onSectionNavigate}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`group relative flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold tracking-normal transition-[color,background-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/65 active:scale-[0.985] motion-reduce:transition-none motion-reduce:active:scale-100 ${isActive ? 'bg-[var(--signal)]/[0.075] text-[var(--signal)]' : 'text-[var(--muted)]/58 hover:bg-white/[0.035] hover:text-[var(--text)]'}`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[var(--signal)] transition-opacity duration-200 motion-reduce:transition-none ${isActive ? 'opacity-100' : 'opacity-0'}`}
                                    />
                                    <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
                                    <span className="min-w-0 truncate">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            {showLabels ? (
                <p className="px-3 pb-2 pt-4 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]/30">
                    Operations
                </p>
            ) : (
                <div aria-hidden="true" className="mx-3 my-3 h-px bg-white/[0.055]" />
            )}

            <Link
                href={ANALYTICS_ITEM.href}
                onClick={onAnalyticsNavigate}
                aria-current={isAnalyticsActive ? 'page' : undefined}
                aria-label={!showLabels ? ANALYTICS_ITEM.label : undefined}
                title={!showLabels ? ANALYTICS_ITEM.label : undefined}
                className={`${INTERACTIVE_ITEM_CLASS} overflow-hidden ${showLabels ? 'justify-start' : 'justify-center px-0'} ${
                    isAnalyticsActive
                        ? 'bg-white/[0.055] text-[var(--text)]'
                        : 'text-[var(--muted)]/65 hover:bg-white/[0.035] hover:text-[var(--text)]'
                }`}
            >
                <span
                    aria-hidden="true"
                    className={`absolute bottom-2 left-0 top-2 w-0.5 bg-[var(--signal)] transition-opacity duration-200 motion-reduce:transition-none ${isAnalyticsActive ? 'opacity-100' : 'opacity-0'}`}
                />
                <AnalyticsIcon aria-hidden="true" size={18} strokeWidth={1.8} />
                {showLabels ? (
                    <span className="min-w-0 truncate">{ANALYTICS_ITEM.label}</span>
                ) : null}
            </Link>

            <Link
                href={MESSAGE_ITEM.href}
                onClick={onMessageNavigate}
                aria-current={isMessageActive ? 'page' : undefined}
                aria-label={!showLabels ? collapsedMessageLabel : undefined}
                title={!showLabels ? collapsedMessageLabel : undefined}
                className={`${INTERACTIVE_ITEM_CLASS} overflow-hidden ${showLabels ? 'justify-start' : 'justify-center px-0'} ${
                    isMessageActive
                        ? 'bg-white/[0.055] text-[var(--text)]'
                        : 'text-[var(--muted)]/65 hover:bg-white/[0.035] hover:text-[var(--text)]'
                }`}
            >
                <span
                    aria-hidden="true"
                    className={`absolute bottom-2 left-0 top-2 w-0.5 bg-[var(--signal)] transition-opacity duration-200 motion-reduce:transition-none ${isMessageActive ? 'opacity-100' : 'opacity-0'}`}
                />
                <MessageIcon aria-hidden="true" size={18} strokeWidth={1.8} />
                {showLabels ? (
                    <>
                        <span className="min-w-0 flex-1 truncate">{MESSAGE_ITEM.label}</span>
                        {unreadMessageCount > 0 ? (
                            <span
                                aria-label={unreadMessageLabel}
                                className="inline-flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full border border-[var(--signal)]/25 bg-[var(--signal)]/[0.1] px-1.5 font-mono text-[9px] font-bold tabular-nums text-[var(--signal)]"
                            >
                                {formatUnreadMessageCount(unreadMessageCount)}
                            </span>
                        ) : null}
                    </>
                ) : unreadMessageCount > 0 ? (
                    <span
                        aria-hidden="true"
                        className="absolute right-1 top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full border border-[var(--signal)]/25 bg-[var(--signal)]/[0.12] px-1 font-mono text-[8px] font-bold tabular-nums text-[var(--signal)]"
                    >
                        {formatUnreadMessageCount(unreadMessageCount)}
                    </span>
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
            className={`group flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold tracking-normal text-[var(--muted)]/55 transition-[color,background-color] duration-200 hover:bg-red-400/[0.055] hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/55 motion-reduce:transition-none ${showLabel ? 'justify-start' : 'justify-center px-0'}`}
        >
            <LogOut
                aria-hidden="true"
                size={18}
                strokeWidth={1.8}
                className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
            />
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
    initialUnreadMessageCount = null,
}: AdminShellProps) {
    const pathname = usePathname();
    const unreadMessageCount = useMessageRealtime(initialUnreadMessageCount);
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
    const isSectionRouteActive = SECTION_ITEMS.some(
        (item) => pathname === item.href,
    );

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
        if (isSectionRouteActive) setSectionsOpen(true);
    }, [isSectionRouteActive, pathname]);

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
        <div className="relative min-h-svh overflow-x-hidden bg-[#020203] text-[var(--text)]">
            <aside
                className={`fixed bottom-4 left-4 top-4 z-40 hidden flex-col overflow-visible rounded-lg border border-white/[0.075] bg-[#050607]/96 shadow-[0_18px_52px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.02)] backdrop-blur-md transition-[width] duration-300 ease-out motion-reduce:transition-none md:flex ${isDesktopExpanded ? 'w-64' : 'w-[4.5rem]'}`}
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
                    className="absolute -right-4 top-12 z-10 flex size-8 items-center justify-center rounded-md border border-white/[0.1] bg-[#07080a] text-[var(--muted)]/60 shadow-[0_8px_22px_rgba(0,0,0,0.38)] transition-[color,border-color,background-color] duration-200 hover:border-[var(--signal)]/30 hover:bg-[#0b0a0d] hover:text-[var(--signal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/65 motion-reduce:transition-none"
                >
                    {isDesktopExpanded ? (
                        <PanelLeftClose aria-hidden="true" size={15} strokeWidth={1.8} />
                    ) : (
                        <PanelLeftOpen aria-hidden="true" size={15} strokeWidth={1.8} />
                    )}
                </button>

                <div
                    className={`flex h-20 shrink-0 items-center border-b border-white/[0.055] ${isDesktopExpanded ? 'px-4' : 'justify-center px-2'}`}
                >
                    <Link
                        href="/dashboard"
                        aria-label="Admin dashboard"
                        className="group flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/65 focus-visible:ring-offset-4 focus-visible:ring-offset-[#050607]"
                    >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center font-name text-xl font-extrabold tracking-normal text-white">
                            J<span className="text-[var(--signal)]">M</span>
                        </span>
                        {isDesktopExpanded ? (
                            <span className="min-w-0">
                                <span className="block truncate text-sm font-bold tracking-normal text-[var(--text)]">
                                    Admin Panel
                                </span>
                                <span className="mt-1 block font-mono text-[9px] font-bold uppercase tracking-normal text-[var(--signal)]/75">
                                    Portfolio Console
                                </span>
                            </span>
                        ) : null}
                    </Link>
                </div>

                <div className="scrollbar-hide flex-1 overflow-y-auto px-2.5 py-5">
                    <NavigationContent
                        isExpanded={isDesktopExpanded}
                        onToggleSections={handleDesktopSectionsToggle}
                        pathname={pathname}
                        sectionsId={desktopSectionsId}
                        sectionsOpen={sectionsOpen}
                        unreadMessageCount={unreadMessageCount}
                    />
                </div>

                <div className="shrink-0 border-t border-white/[0.055] p-2.5">
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
                    className={`flex h-14 items-center justify-between rounded-lg border px-2.5 backdrop-blur-xl transition-[border-color,background-color,box-shadow] duration-300 motion-reduce:transition-none ${isMobileMenuOpen ? 'border-[var(--signal)]/22 bg-[#050607]/95 shadow-[0_18px_48px_rgba(0,0,0,0.5)]' : 'border-white/[0.09] bg-[#050607]/88 shadow-[0_12px_36px_rgba(0,0,0,0.38)]'}`}
                >
                    <Link
                        href="/dashboard"
                        onClick={() => closeMobileMenu()}
                        aria-label="Admin dashboard"
                        className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/65"
                    >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center font-name text-xl font-extrabold tracking-normal text-white">
                            J<span className="text-[var(--signal)]">M</span>
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate text-xs font-bold tracking-normal text-[var(--text)]">
                                Admin Panel
                            </span>
                            <span className="mt-0.5 block font-mono text-[8px] font-bold uppercase tracking-normal text-[var(--signal)]/75">
                                Portfolio Console
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
                        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-[border-color,background-color,color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/65 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 ${isMobileMenuOpen ? 'border-[var(--signal)]/30 bg-[var(--signal)]/[0.09] text-[var(--signal)]' : 'border-white/[0.09] bg-white/[0.025] text-[var(--muted)]/70 hover:border-white/[0.18] hover:text-[var(--text)]'}`}
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
                className={`fixed inset-x-3 top-[calc(env(safe-area-inset-top)+5rem)] z-50 max-h-[calc(100dvh-env(safe-area-inset-top)-6rem)] overflow-y-auto rounded-lg border bg-[#050607]/96 shadow-[0_24px_64px_rgba(0,0,0,0.58)] backdrop-blur-xl transition-[opacity,transform,border-color] duration-300 ease-out motion-reduce:transition-none md:hidden ${isMobileMenuOpen ? 'pointer-events-auto translate-y-0 border-white/[0.1] opacity-100' : 'pointer-events-none -translate-y-2 border-white/[0.05] opacity-0'}`}
            >
                <div className="p-2.5">
                    <NavigationContent
                        isExpanded
                        isMobile
                        onAnalyticsNavigate={() => closeMobileMenu()}
                        onDashboardNavigate={() => closeMobileMenu()}
                        onMessageNavigate={() => closeMobileMenu()}
                        onSectionNavigate={() => closeMobileMenu()}
                        onToggleSections={() => setSectionsOpen((isOpen) => !isOpen)}
                        pathname={pathname}
                        sectionsId={mobileSectionsId}
                        sectionsOpen={sectionsOpen}
                        unreadMessageCount={unreadMessageCount}
                    />
                </div>
                <div className="border-t border-white/[0.055] p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
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
