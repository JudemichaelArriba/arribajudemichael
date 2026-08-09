import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/models/database.types';
import { getSupabasePublicConfig } from './config';

export async function createClient() {
    const cookieStore = await cookies();
    const { url, publishableKey } = getSupabasePublicConfig();

    return createServerClient<Database>(
        url,
        publishableKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },

                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    } catch {
                        // A Server Component cannot always write cookies.
                        // Session refreshing is handled by proxy.ts.
                    }
                },
            },
        },
    );
}
