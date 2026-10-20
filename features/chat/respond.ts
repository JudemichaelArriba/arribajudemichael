import 'server-only';

import {
    createUIMessageStream,
    createUIMessageStreamResponse,
    streamText,
    toUIMessageStream,
    type UIMessageChunk,
} from 'ai';

import type { ChatEnv } from './env';
import { describeModelError } from './fallback';
import { getChatModelChain, getModerationModel } from './models';
import { classifyMessage } from './moderation/classify';
import type { ModerationClassifier } from './moderation';
import {
    createAnswerTracker,
    createRedactionTransform,
    openFirstHealthyStream,
    type ModelStreamAttempt,
} from './modelStream';
import { getChatInstructions } from './prompt';
import { detectAnswerSections, formatPortfolioRecords, loadPortfolioRecords } from './records';
import type { ChatMessage } from './schema';

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
    // Every model gets the complete published records up front: nothing to look up, so even a
    // fallback model can only answer from real data, in a single model call.
    const records = await loadPortfolioRecords();
    const instructions = getChatInstructions(formatPortfolioRecords(records));

    const attempts: ModelStreamAttempt[] = getChatModelChain(env).map(
        ({ label, model, maxOutputTokens, providerOptions }) => ({
            label,
            start: (signal) =>
                streamText({
                    model,
                    instructions,
                    messages: messages.map(({ role, content }) => ({ role, content })),
                    // 0: stay as close to the portfolio data as possible; wording varies little.
                    temperature: 0,
                    // Per model (features/chat/models.ts): reasoning models count hidden reasoning
                    // against this budget, and reasoning options are only sent to models that take them.
                    maxOutputTokens,
                    ...(providerOptions ? { providerOptions } : {}),
                    maxRetries: 0,
                    abortSignal: signal,
                    timeout: { totalMs: 50_000, chunkMs: 15_000 },
                    // Errors are handled (and logged without details) by the fallback runner and the
                    // UI stream below; the SDK default would print the raw provider error.
                    onError: () => undefined,
                }).stream,
        }),
    );

    const modelStream = await openFirstHealthyStream(attempts, requestSignal);
    if (!modelStream) return null;

    const answer = createAnswerTracker();

    // Visual pacing happens in the browser (components/chat/useRevealedText.ts), so text is sent
    // as soon as the redactor releases it.
    const uiStream = toUIMessageStream({
        stream: modelStream.pipeThrough(createRedactionTransform()).pipeThrough(answer.transform),
        sendReasoning: false,
        sendSources: false,
        onError: (error) => {
            console.error('[api/chat] Answer stream failed.', describeModelError(error));
            return GENERIC_STREAM_ERROR;
        },
    });

    // Just before the answer finishes, tell the client which site sections it actually mentioned
    // (matched against the real record titles) for the "Jump to" buttons.
    const stream = uiStream.pipeThrough(
        new TransformStream<UIMessageChunk, UIMessageChunk>({
            transform(chunk, controller) {
                if (chunk.type === 'finish') {
                    const sections = detectAnswerSections(answer.text(), records);
                    if (sections.length > 0) controller.enqueue({ type: 'data-sections', data: sections });
                }
                controller.enqueue(chunk);
            },
        }),
    );

    return createUIMessageStreamResponse({ stream, headers: RESPONSE_HEADERS });
}
