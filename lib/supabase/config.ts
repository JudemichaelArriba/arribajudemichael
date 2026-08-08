export interface SupabasePublicConfig {
    url: string;
    publishableKey: string;
}

export class SupabaseConfigurationError extends Error {
    constructor() {
        super('Supabase public configuration is incomplete.');
        this.name = 'SupabaseConfigurationError';
    }
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !publishableKey) {
        throw new SupabaseConfigurationError();
    }

    return { url, publishableKey };
}
