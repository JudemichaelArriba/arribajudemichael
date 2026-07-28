import Preloader from '../components/loader/Preloader';


export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <Preloader>{children}</Preloader>
            </body>
        </html>
    );
}