import Preloader from '@/components/loader/Preloader';
import Navbar from '@/components/navbar/Navbar';
import PurpleScrollbar from '@/components/ui/PurpleScrollbar/PurpleScrollbar';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <Preloader>
            <PurpleScrollbar />
            <Navbar />
            <main>{children}</main>
        </Preloader>
    );
}
