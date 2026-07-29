import Preloader from '@/components/loader/Preloader';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return <Preloader>{children}</Preloader>;
}