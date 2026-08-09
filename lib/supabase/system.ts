import 'server-only';

import {
    createClient,
    type SupabaseClient,
} from '@supabase/supabase-js';
import type { Database } from '@/lib/models/database.types';

export class SupabaseSystemConfigurationError extends Error {
    constructor() {
        super('Supabase system configuration is incomplete.');
        this.name = 'SupabaseSystemConfigurationError';
    }
}

let systemClient: SupabaseClient<Database> | null = null;

export function createSystemClient(): SupabaseClient<Database> {
    if (systemClient) return systemClient;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();

    if (!url || !secretKey) {
        throw new SupabaseSystemConfigurationError();
    }

    systemClient = createClient<Database>(url, secretKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    });

    return systemClient;
}
