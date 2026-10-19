import AnalyticsSessionBootstrap from '@/components/analytics/AnalyticsSessionBootstrap';
import AnalyticsEngagementTracker from '@/components/analytics/AnalyticsEngagementTracker';
import AnalyticsEngagementBatcher from '@/components/analytics/AnalyticsEngagementBatcher';
import ChatProvider from '@/components/chat/ChatProvider';
import Preloader from '@/components/loader/Preloader';
import Navbar from '@/components/navbar/Navbar';
import Footer from '@/components/footer/Footer';
import Cursor from '@/components/ui/Cursor/Cursor';
import { isChatEnabled } from '@/features/chat/env';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <Preloader>
            <AnalyticsSessionBootstrap />
            <AnalyticsEngagementTracker />
            <AnalyticsEngagementBatcher />
            <Cursor />
            <ChatProvider enabled={isChatEnabled()}>
                <Navbar />
                <main className="min-h-svh bg-[var(--site-bg)] text-[var(--text)]">{children}</main>
                <Footer />
            </ChatProvider>
        </Preloader>
    );
}
