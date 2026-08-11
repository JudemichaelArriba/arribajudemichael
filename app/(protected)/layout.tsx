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
        <AdminShell initialUnreadMessageCount={initialUnreadMessageCount}>
            {children}
        </AdminShell>
    );
}
