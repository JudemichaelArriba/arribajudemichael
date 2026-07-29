import Preloader from '@/components/loader/Preloader';
import Navbar from '@/components/navbar/Navbar';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <Preloader>
            <Navbar />
            <main>{children}</main>
        </Preloader>
    );
}