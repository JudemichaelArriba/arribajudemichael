import 'server-only';

import { z } from 'zod';

export interface ChatEnv {
    groqApiKey: string;
    cloudflareAccountId: string;
    cloudflareApiToken: string;
}

export type ChatEnvResult = { ok: true; env: ChatEnv } | { ok: false };

const requiredString = z.string().trim().min(1);

const chatEnvSchema = z.object({
    GROQ_API_KEY: requiredString,
    CLOUDFLARE_ACCOUNT_ID: requiredString.regex(/^[a-f0-9]{32}$/i),
    CLOUDFLARE_API_TOKEN: requiredString,
});

let cachedEnv: ChatEnvResult | null = null;

/** The kill switch: the chat is off unless CHAT_ENABLED is exactly "true". */
export function isChatEnabled(): boolean {
    return process.env.CHAT_ENABLED?.trim().toLowerCase() === 'true';
}

/**
 * Validates the provider credentials once per server instance. A failure is cached too, so a
 * misconfigured deployment fails closed on every request. Only variable *names* are logged.
 */
export function getChatEnv(): ChatEnvResult {
    if (cachedEnv) return cachedEnv;

    const parsed = chatEnvSchema.safeParse({
        GROQ_API_KEY: process.env.GROQ_API_KEY,
        CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
    });

    if (!parsed.success) {
        console.error('[chat/env] Configuration is incomplete or invalid.', {
            variables: [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))],
        });
        cachedEnv = { ok: false };
        return cachedEnv;
    }

    cachedEnv = {
        ok: true,
        env: {
            groqApiKey: parsed.data.GROQ_API_KEY,
            cloudflareAccountId: parsed.data.CLOUDFLARE_ACCOUNT_ID,
            cloudflareApiToken: parsed.data.CLOUDFLARE_API_TOKEN,
        },
    };
    return cachedEnv;
}
