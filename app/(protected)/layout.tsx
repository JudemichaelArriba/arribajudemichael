import type { ReactNode } from 'react';
import { unstable_rethrow } from 'next/navigation';

import AdminShell from '@/components/admin/layout/sidebar';
import { getUnreadMessageCount } from '@/features/admin/messages/queries';

export default async function ProtectedLayout({
    children,
}: Readonly<{ children: ReactNode }>) {
    let initialUnreadMessageCount: number | null = null;

    try {
        initialUnreadMessageCount = await getUnreadMessageCount();
    } catch (error) {
        unstable_rethrow(error);
    }

    return (
        <div data-theme="dark" data-theme-pin="admin" className="flex min-h-svh flex-col bg-[#020203] text-[var(--text)]">
            <AdminShell initialUnreadMessageCount={initialUnreadMessageCount}>
                {children}
            </AdminShell>
        </div>
    );
}
