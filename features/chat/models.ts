import 'server-only';

import { createGroq } from '@ai-sdk/groq';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';

import type { ChatEnv } from './env';

export interface ChatModelAttempt {
    /** Stable label for logs. Never sent to the client. */
    label: 'primary' | 'secondary' | 'fallback';
    model: LanguageModel;
}

const PRIMARY_MODEL_ID = 'openai/gpt-oss-120b';
const SECONDARY_MODEL_ID = 'llama-3.3-70b-versatile';
const FALLBACK_MODEL_ID = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MODERATION_MODEL_ID = 'openai/gpt-oss-20b';

let cachedChain: readonly ChatModelAttempt[] | null = null;
let cachedModerationModel: LanguageModel | null = null;

function createGroqProvider(env: ChatEnv) {
    return createGroq({ apiKey: env.groqApiKey });
}

/** Groq primary -> Groq secondary -> Cloudflare Workers AI, all on server-held keys. */
export function getChatModelChain(env: ChatEnv): readonly ChatModelAttempt[] {
    if (cachedChain) return cachedChain;

    const groq = createGroqProvider(env);
    const workersAi = createOpenAICompatible({
        name: 'workers-ai',
        baseURL: `https://api.cloudflare.com/client/v4/accounts/${env.cloudflareAccountId}/ai/v1`,
        apiKey: env.cloudflareApiToken,
    });

    cachedChain = [
        { label: 'primary', model: groq(PRIMARY_MODEL_ID) },
        { label: 'secondary', model: groq(SECONDARY_MODEL_ID) },
        { label: 'fallback', model: workersAi.chatModel(FALLBACK_MODEL_ID) },
    ];
    return cachedChain;
}

export function getModerationModel(env: ChatEnv): LanguageModel {
    cachedModerationModel ??= createGroqProvider(env)(MODERATION_MODEL_ID);
    return cachedModerationModel;
}
