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
    LoaderCircle,
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
import { useFormStatus } from 'react-dom';

import { logout } from '@/lib/auth/logoutActions';

interface AdminShellProps {
    children: ReactNode;
}

interface PlaceholderNavigationItem {
    id: string;
    label: string;
    icon: LucideIcon;
}

interface NavigationContentProps {
    isDashboardActive: boolean;
    isExpanded: boolean;
    isMobile?: boolean;
    onDashboardNavigate?: () => void;
    onToggleSections: () => void;
    sectionsId: string;
    sectionsOpen: boolean;
}

interface LogoutControlProps {
    showLabel: boolean;
}

const DESKTOP_BREAKPOINT = '(min-width: 768px)';
const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SECTION_ITEMS: readonly PlaceholderNavigationItem[] = [
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'experiences', label: 'Experiences', icon: BriefcaseBusiness },
    { id: 'certificates', label: 'Certificates', icon: Award },
];

const STATIC_ITEMS: readonly PlaceholderNavigationItem[] = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'messages', label: 'Emails / Messages', icon: Mail },
];

const INTERACTIVE_ITEM_CLASS =
    'group relative flex min-h-11 w-full items-center gap-3 rounded-lg border border-transparent px-3 text-sm font-semibold tracking-normal text-[var(--muted)]/65 transition-[color,border-color,background-color,transform] duration-200 hover:border-white/[0.07] hover:bg-white/[0.045] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/65 active:scale-[0.985] motion-reduce:transition-none motion-reduce:active:scale-100';

function PlaceholderButton({
    item,
    showLabel,
}: {
    item: PlaceholderNavigationItem;
    showLabel: boolean;
}) {
    const Icon = item.icon;

    return (
        <button
            type="button"
            disabled
            aria-disabled="true"
            aria-label={!showLabel ? item.label : undefined}
            title={!showLabel ? item.label : undefined}
            className={`flex min-h-11 w-full cursor-not-allowed items-center gap-3 rounded-lg border border-transparent px-3 text-sm font-semibold tracking-normal text-[var(--muted)]/35 ${showLabel ? 'justify-start' : 'justify-center px-0'}`}
        >
            <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
            {showLabel ? <span className="min-w-0 truncate">{item.label}</span> : null}
        </button>
    );
}

function NavigationContent({
    isDashboardActive,
    isExpanded,
    isMobile = false,
    onDashboardNavigate,
    onToggleSections,
    sectionsId,
    sectionsOpen,
}: NavigationContentProps) {
    const showLabels = isMobile || isExpanded;
    const isSectionsVisible = showLabels && sectionsOpen;

    return (
        <nav
            aria-label={isMobile ? 'Admin mobile navigation' : 'Admin navigation'}
            className="space-y-1"
        >
            <Link
                href="/dashboard"
                onClick={onDashboardNavigate}
                aria-current={isDashboardActive ? 'page' : undefined}
                aria-label={!showLabels ? 'Dashboard' : undefined}
                title={!showLabels ? 'Dashboard' : undefined}
                data-mobile-first={isMobile ? 'true' : undefined}
                className={`group relative flex min-h-11 w-full items-center gap-3 overflow-hidden rounded-lg border px-3 text-sm font-semibold tracking-normal transition-[color,border-color,background-color,transform,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/65 active:scale-[0.985] motion-reduce:transition-none motion-reduce:active:scale-100 ${showLabels ? 'justify-start' : 'justify-center px-0'} ${
                    isDashboardActive
                        ? 'border-[rgba(195,109,252,0.2)] bg-[rgba(195,109,252,0.09)] text-[var(--signal)] shadow-[inset_0_0_18px_rgba(195,109,252,0.035)]'
                        : 'border-transparent text-[var(--muted)]/65 hover:border-white/[0.07] hover:bg-white/[0.045] hover:text-[var(--text)]'
                }`}
            >
                <span
                    aria-hidden="true"
                    className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--signal)] shadow-[0_0_12px_rgba(195,109,252,0.55)] transition-opacity duration-200 motion-reduce:transition-none ${isDashboardActive ? 'opacity-100' : 'opacity-0'}`}
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
                className={`${INTERACTIVE_ITEM_CLASS} ${showLabels ? 'justify-start' : 'justify-center px-0'}`}
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
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${isSectionsVisible ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
                <div className="overflow-hidden">
                    <div className="ml-4 space-y-1 border-l border-white/[0.06] pb-1 pl-2 pt-1">
                        {SECTION_ITEMS.map((item) => (
                            <PlaceholderButton
                                key={item.id}
                                item={item}
                                showLabel={showLabels}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {STATIC_ITEMS.map((item) => (
                <PlaceholderButton
                    key={item.id}
                    item={item}
                    showLabel={showLabels}
                />
            ))}
        </nav>
    );
}

function LogoutButton({ showLabel }: LogoutControlProps) {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            aria-label={pending ? 'Signing out' : 'Sign out'}
            title={!showLabel ? (pending ? 'Signing out' : 'Sign out') : undefined}
            className={`group flex min-h-11 w-full items-center gap-3 rounded-lg border border-transparent px-3 text-sm font-semibold tracking-normal text-[var(--muted)]/55 transition-[color,border-color,background-color] duration-200 hover:border-red-400/15 hover:bg-red-400/[0.055] hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/55 disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none ${showLabel ? 'justify-start' : 'justify-center px-0'}`}
        >
            {pending ? (
                <LoaderCircle
                    aria-hidden="true"
                    size={18}
                    strokeWidth={1.8}
                    className="animate-spin motion-reduce:animate-none"
                />
            ) : (
                <LogOut
                    aria-hidden="true"
                    size={18}
                    strokeWidth={1.8}
                    className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                />
            )}
            {showLabel ? <span>{pending ? 'Signing out...' : 'Logout'}</span> : null}
        </button>
    );
}

function LogoutControl({ showLabel }: LogoutControlProps) {
    return (
        <form action={logout}>
            <LogoutButton showLabel={showLabel} />
        </form>
    );
}

export default function AdminShell({ children }: AdminShellProps) {
    const pathname = usePathname();
    const [isDesktopExpanded, setIsDesktopExpanded] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [sectionsOpen, setSectionsOpen] = useState(false);
    const desktopSectionsId = `desktop-sections-${useId()}`;
    const mobileSectionsId = `mobile-sections-${useId()}`;
    const mobileMenuId = `admin-mobile-menu-${useId()}`;
    const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
    const mobilePanelRef = useRef<HTMLDivElement>(null);
    const isDashboardActive =
        pathname === '/dashboard' || pathname.startsWith('/dashboard/');

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
        <div className="relative min-h-svh overflow-x-hidden bg-black text-[var(--text)]">
            <aside
                className={`fixed bottom-4 left-4 top-4 z-40 hidden flex-col overflow-visible rounded-lg border border-white/[0.085] bg-black/[0.72] shadow-[0_20px_70px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.025)] backdrop-blur-xl transition-[width] duration-300 ease-out motion-reduce:transition-none md:flex ${isDesktopExpanded ? 'w-64' : 'w-[4.5rem]'}`}
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
                    className="absolute -right-3 top-12 z-10 flex h-10 w-6 items-center justify-center rounded-full border border-white/[0.1] bg-black/90 text-[var(--muted)]/60 shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-[color,border-color,background-color] duration-200 hover:border-[var(--signal)]/35 hover:bg-[#09060c] hover:text-[var(--signal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/65 motion-reduce:transition-none"
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
                        className="group flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/65 focus-visible:ring-offset-4 focus-visible:ring-offset-black"
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

                <div className="scrollbar-hide flex-1 overflow-y-auto px-2.5 py-4">
                    <NavigationContent
                        isDashboardActive={isDashboardActive}
                        isExpanded={isDesktopExpanded}
                        onToggleSections={handleDesktopSectionsToggle}
                        sectionsId={desktopSectionsId}
                        sectionsOpen={sectionsOpen}
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
                    className={`relative flex h-14 items-center justify-between rounded-lg border px-2.5 backdrop-blur-xl transition-[border-color,background-color,box-shadow] duration-300 motion-reduce:transition-none ${isMobileMenuOpen ? 'border-[var(--signal)]/25 bg-black/[0.78] shadow-[0_18px_55px_rgba(0,0,0,0.55),0_0_24px_rgba(195,109,252,0.07)]' : 'border-white/[0.1] bg-black/[0.58] shadow-[0_14px_45px_rgba(0,0,0,0.42)]'}`}
                >
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    />

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
                className={`fixed inset-x-3 top-[calc(env(safe-area-inset-top)+5rem)] z-50 max-h-[calc(100dvh-env(safe-area-inset-top)-6rem)] overflow-y-auto rounded-lg border bg-black/[0.88] shadow-[0_26px_80px_rgba(0,0,0,0.62)] backdrop-blur-xl transition-[opacity,transform,border-color] duration-300 ease-out motion-reduce:transition-none md:hidden ${isMobileMenuOpen ? 'pointer-events-auto translate-y-0 border-white/[0.1] opacity-100' : 'pointer-events-none -translate-y-2 border-white/[0.05] opacity-0'}`}
            >
                <div className="p-2.5">
                    <NavigationContent
                        isDashboardActive={isDashboardActive}
                        isExpanded
                        isMobile
                        onDashboardNavigate={() => closeMobileMenu()}
                        onToggleSections={() => setSectionsOpen((isOpen) => !isOpen)}
                        sectionsId={mobileSectionsId}
                        sectionsOpen={sectionsOpen}
                    />
                </div>
                <div className="border-t border-white/[0.055] p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
                    <LogoutControl showLabel />
                </div>
            </div>

            <main
                inert={isMobileMenuOpen ? true : undefined}
                className={`min-h-svh min-w-0 pt-[calc(env(safe-area-inset-top)+5.75rem)] transition-[padding] duration-300 ease-out motion-reduce:transition-none md:pt-0 ${isDesktopExpanded ? 'md:pl-[18rem]' : 'md:pl-[6.5rem]'}`}
            >
                {children}
            </main>
        </div>
    );
}
