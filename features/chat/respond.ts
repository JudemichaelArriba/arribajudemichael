import 'server-only';

import {
    createUIMessageStream,
    createUIMessageStreamResponse,
    isStepCount,
    streamText,
    toUIMessageStream,
} from 'ai';

import type { ChatEnv } from './env';
import { getChatModelChain, getModerationModel } from './models';
import { classifyMessage } from './moderation/classify';
import type { ModerationClassifier } from './moderation';
import { createRedactionTransform, openFirstHealthyStream, type ModelStreamAttempt } from './modelStream';
import { getChatInstructions } from './prompt';
import type { ChatMessage } from './schema';
import { chatTools } from './tools';

// The only module that talks to the AI SDK. The route stays SDK-free and testable.

export const GENERIC_STREAM_ERROR = 'Something went wrong, please try again.';

const RESPONSE_HEADERS = { 'Cache-Control': 'no-store' };

export function createModerationClassifier(env: ChatEnv): ModerationClassifier {
    const model = getModerationModel(env);
    return (message) => classifyMessage(model, message);
}

/** A canned reply streamed exactly like a model answer, so it renders in the thread. */
export function streamCannedReply(text: string): Response {
    const stream = createUIMessageStream({
        execute: ({ writer }) => {
            writer.write({ type: 'text-start', id: 'reply' });
            writer.write({ type: 'text-delta', id: 'reply', delta: text });
            writer.write({ type: 'text-end', id: 'reply' });
        },
    });

    return createUIMessageStreamResponse({ stream, headers: RESPONSE_HEADERS });
}

/** Streams a grounded answer through the fallback chain. Null when no model could start. */
export async function streamChatAnswer(
    env: ChatEnv,
    messages: readonly ChatMessage[],
    requestSignal: AbortSignal,
): Promise<Response | null> {
    const attempts: ModelStreamAttempt[] = getChatModelChain(env).map(({ label, model }) => ({
        label,
        start: (signal) =>
            streamText({
                model,
                instructions: getChatInstructions(),
                messages: messages.map(({ role, content }) => ({ role, content })),
                tools: chatTools,
                stopWhen: isStepCount(4),
                // 0: stay as close to the portfolio data as possible; wording varies little.
                temperature: 0,
                maxOutputTokens: 600,
                maxRetries: 0,
                abortSignal: signal,
                timeout: { totalMs: 50_000, chunkMs: 15_000 },
                // Errors are handled (and logged without details) by the fallback runner and the
                // UI stream below; the SDK default would print the raw provider error.
                onError: () => undefined,
            }).stream,
    }));

    const modelStream = await openFirstHealthyStream(attempts, requestSignal);
    if (!modelStream) return null;

    // Visual pacing happens in the browser (components/chat/useRevealedText.ts), so text is sent
    // as soon as the redactor releases it.
    const stream = toUIMessageStream({
        stream: modelStream.pipeThrough(createRedactionTransform()),
        tools: chatTools,
        sendReasoning: false,
        sendSources: false,
        onError: (error) => {
            console.error('[api/chat] Answer stream failed.', {
                name: error instanceof Error ? error.name : 'UnknownError',
            });
            return GENERIC_STREAM_ERROR;
        },
    });

    return createUIMessageStreamResponse({ stream, headers: RESPONSE_HEADERS });
}
