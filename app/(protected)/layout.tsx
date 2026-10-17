import type { ReactNode } from 'react';

import AdminShell from '@/components/admin/layout/sidebar';
import { requireUser } from '@/lib/auth/requireUser';

export default async function ProtectedLayout({
    children,
}: Readonly<{ children: ReactNode }>) {
    // Layout-level guard for every dashboard route, alongside the proxy and the
    // per-page checks. Redirects to /login when there is no session.
    await requireUser();

    return (
        <div data-theme="dark" data-theme-pin="admin" className="flex min-h-svh flex-col bg-[#020203] text-[var(--text)]">
            <AdminShell>
                {children}
            </AdminShell>
        </div>
    );
}
