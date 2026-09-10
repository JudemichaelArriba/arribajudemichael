export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <div data-theme="dark" className="min-h-svh bg-[var(--site-bg)] text-[var(--text)]">
            {children}
        </div>
    );
}
