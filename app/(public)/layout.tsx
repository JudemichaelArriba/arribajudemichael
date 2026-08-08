import Preloader from '@/components/loader/Preloader';
import Navbar from '@/components/navbar/Navbar';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <Preloader>
            <Navbar />
            <main className="min-h-svh bg-[var(--site-bg)] text-[var(--text)]">{children}</main>
        </Preloader>
    );
}
