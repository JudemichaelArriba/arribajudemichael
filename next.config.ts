import type { NextConfig } from 'next';

function getSupabaseOrigin(): URL | null {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return null;

    try {
        return new URL(supabaseUrl);
    } catch {
        return null;
    }
}

const supabaseOrigin = getSupabaseOrigin();
const projectMediaPattern = supabaseOrigin
    ? new URL('/storage/v1/object/public/project-media/**', supabaseOrigin)
    : null;

const isDevelopment = process.env.NODE_ENV === 'development';
const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';
const supabaseSources = supabaseOrigin
    ? [supabaseOrigin.origin, `wss://${supabaseOrigin.host}`]
    : [];

// Shipped as Report-Only first: violations show in the browser console without blocking
// anything. Switch the header name to Content-Security-Policy once a preview is clean.
// 'unsafe-inline' scripts are needed by the theme bootstrap and Next's inline scripts (nonces
// would force every page to render dynamically); 'wasm-unsafe-eval' is for the PDF.js decoder.
const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' ${TURNSTILE_ORIGIN}${isDevelopment ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${supabaseOrigin ? ` ${supabaseOrigin.origin}` : ''}`,
    "font-src 'self'",
    `connect-src 'self' ${[...supabaseSources, TURNSTILE_ORIGIN].join(' ')}${isDevelopment ? ' ws:' : ''}`,
    `frame-src ${TURNSTILE_ORIGIN}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
    experimental: {
        serverActions: {
            bodySizeLimit: '6mb',
        },
    },
    images: {
        remotePatterns: projectMediaPattern ? [projectMediaPattern] : [],
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    // microphone=(self): Ask's optional voice input; embedded frames still get none.
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
                    { key: 'Content-Security-Policy-Report-Only', value: contentSecurityPolicy },
                ],
            },
        ];
    },
};

export default nextConfig;
