import AnalyticsSessionBootstrap from '@/components/analytics/AnalyticsSessionBootstrap';
import AnalyticsEngagementTracker from '@/components/analytics/AnalyticsEngagementTracker';
import Preloader from '@/components/loader/Preloader';
import Navbar from '@/components/navbar/Navbar';
import Footer from '@/components/footer/Footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <Preloader>
            <AnalyticsSessionBootstrap />
            <AnalyticsEngagementTracker />
            <Navbar />
            <main className="min-h-svh bg-[var(--site-bg)] text-[var(--text)]">{children}</main>
            <Footer />
        </Preloader>
    );
}
