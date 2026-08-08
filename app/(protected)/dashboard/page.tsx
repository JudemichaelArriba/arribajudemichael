import { requireUser } from '@/lib/auth/requireUser';
import { logout } from './logoutActions';

export default async function DashboardPage() {
    const { userId } = await requireUser();

    return (
        <main className="min-h-screen p-8">
            <h1 className="text-3xl font-semibold">
                Dashboard
            </h1>

            <p className="mt-4">
                Authenticated user: {userId}
            </p>

            <form action={logout} className="mt-6">
                <button
                    type="submit"
                    className="rounded-lg border px-4 py-2"
                >
                    Sign Out
                </button>
            </form>
        </main>
    );
}