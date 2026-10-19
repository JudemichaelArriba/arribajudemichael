import 'server-only';

import { createGroq } from '@ai-sdk/groq';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';

import type { ChatEnv } from './env';

type GroqReasoningOptions = {
    groq: {
        reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
        reasoningFormat?: 'hidden' | 'parsed';
    };
};

export interface ChatModelAttempt {
    /** Stable label for logs. Never sent to the client. */
    label: 'primary' | 'secondary' | 'fallback';
    model: LanguageModel;
    /** Reasoning models spend hidden tokens before answering; they need a larger budget. */
    maxOutputTokens: number;
    providerOptions?: GroqReasoningOptions;
}

const PRIMARY_MODEL_ID = 'openai/gpt-oss-120b';
// Groq preview model: may be retired at short notice. A missing model fails over like any other
// error path, and Cloudflare stays the last resort.
const SECONDARY_MODEL_ID = 'qwen/qwen3.8-27b';
const FALLBACK_MODEL_ID = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MODERATION_MODEL_ID = 'openai/gpt-oss-20b';

const REASONING_OUTPUT_TOKENS = 4_000;
const PLAIN_OUTPUT_TOKENS = 600;

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
        {
            label: 'primary',
            model: groq(PRIMARY_MODEL_ID),
            // gpt-oss follows the grounding rules more reliably with more reasoning.
            maxOutputTokens: REASONING_OUTPUT_TOKENS,
            providerOptions: { groq: { reasoningEffort: 'high' } },
        },
        {
            label: 'secondary',
            model: groq(SECONDARY_MODEL_ID),
            // This project allows only 1,000 output tokens per minute on Qwen, and Groq rejects a
            // request whose max_tokens alone exceeds that. Instruct mode ("none") skips hidden
            // reasoning so a normal answer fits; "hidden" keeps any thinking out of the text.
            maxOutputTokens: PLAIN_OUTPUT_TOKENS,
            providerOptions: { groq: { reasoningEffort: 'none', reasoningFormat: 'hidden' } },
        },
        {
            label: 'fallback',
            model: workersAi.chatModel(FALLBACK_MODEL_ID),
            maxOutputTokens: PLAIN_OUTPUT_TOKENS,
        },
    ];
    return cachedChain;
}

export function getModerationModel(env: ChatEnv): LanguageModel {
    cachedModerationModel ??= createGroqProvider(env)(MODERATION_MODEL_ID);
    return cachedModerationModel;
}
