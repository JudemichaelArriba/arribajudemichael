import type { NextConfig } from 'next';

function getProjectMediaPattern(): URL | null {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return null;

    try {
        return new URL('/storage/v1/object/public/project-media/**', supabaseUrl);
    } catch {
        return null;
    }
}

const projectMediaPattern = getProjectMediaPattern();

const nextConfig: NextConfig = {
    experimental: {
        serverActions: {
            bodySizeLimit: '6mb',
        },
    },
    images: {
        remotePatterns: projectMediaPattern ? [projectMediaPattern] : [],
    },
};

export default nextConfig;
