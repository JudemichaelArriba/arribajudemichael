import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabasePublicConfig } from './config';

export async function updateSession(request: NextRequest) {
    const { url, publishableKey } = getSupabasePublicConfig();
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        url,
        publishableKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },

                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => {
                        request.cookies.set(name, value);
                    });

                    supabaseResponse = NextResponse.next({
                        request,
                    });

                    cookiesToSet.forEach(({ name, value, options }) => {
                        supabaseResponse.cookies.set(name, value, options);
                    });
                },
            },
        },
    );

    /*
     * IMPORTANT:
     * Keep getClaims() immediately after creating the Supabase client.
     */
    const { data, error } = await supabase.auth.getClaims();

    const isAuthenticated = !error && Boolean(data?.claims?.sub);

    const isProtectedRoute =
        request.nextUrl.pathname.startsWith('/dashboard');

    if (isProtectedRoute && !isAuthenticated) {
        const url = request.nextUrl.clone();

        url.pathname = '/login';
        url.search = '';

        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
