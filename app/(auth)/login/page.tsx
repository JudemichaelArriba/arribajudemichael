import Script from 'next/script';

import LoginForm from './LoginForm';

export default function LoginPage() {
    return (
        <>
            <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js"
                strategy="afterInteractive"
            />

            <LoginForm />
        </>
    );
}