import type { TextStreamPart, ToolSet } from 'ai';

import { createStreamingRedactor, type StreamingRedactor } from '@/lib/security/chatOutputFilter';
import { describeModelError, isRetryableModelError } from './fallback';

// Pure stream plumbing for the model fallback chain. Only type imports from `ai`, so it runs in
// Jest with plain ReadableStreams.

export type ModelStreamPart = TextStreamPart<ToolSet>;

export interface ModelStreamAttempt {
    /** Log label only; never sent to the client. */
    label: string;
    start: (signal: AbortSignal) => ReadableStream<ModelStreamPart>;
}

// Time allowed until the first answer text, which comes after reasoning and any tool step.
export const FIRST_PART_TIMEOUT_MS = 20_000;

// The attempt is committed once visible answer text starts: from then on a failure ends the
// answer instead of silently restarting it on another model. Everything before that (reasoning,
// tool calls and their results) is buffered, so a provider failure on a later step (for example
// the call that follows a tool lookup) still falls back to the next model.
const COMMITTING_PART_TYPES = new Set<ModelStreamPart['type']>(['text-delta']);

type PeekOutcome =
    | { kind: 'commit' }
    | { kind: 'done' }
    | { kind: 'failed'; error: unknown };

async function peekUntilCommitted(
    reader: ReadableStreamDefaultReader<ModelStreamPart>,
    buffered: ModelStreamPart[],
): Promise<PeekOutcome> {
    while (true) {
        let result: ReadableStreamReadResult<ModelStreamPart>;
        try {
            result = await reader.read();
        } catch (error) {
            return { kind: 'failed', error };
        }

        if (result.done) return { kind: 'done' };

        const part = result.value;
        if (part.type === 'error') return { kind: 'failed', error: part.error };
        if (part.type === 'abort') {
            return { kind: 'failed', error: new DOMException('The attempt was aborted.', 'AbortError') };
        }

        buffered.push(part);
        if (COMMITTING_PART_TYPES.has(part.type)) return { kind: 'commit' };
    }
}

function replay(
    buffered: ModelStreamPart[],
    reader: ReadableStreamDefaultReader<ModelStreamPart>,
): ReadableStream<ModelStreamPart> {
    return new ReadableStream<ModelStreamPart>({
        start(controller) {
            for (const part of buffered) controller.enqueue(part);
        },
        async pull(controller) {
            try {
                const { done, value } = await reader.read();
                if (done) controller.close();
                else controller.enqueue(value);
            } catch (error) {
                controller.error(error);
            }
        },
        cancel(reason) {
            return reader.cancel(reason);
        },
    });
}

/**
 * Tries each attempt in order and returns the first stream that starts answering. An attempt is
 * abandoned for the next one only on retryable trouble (429, 5xx, timeout, network) before it has
 * produced output. Returns null when every attempt failed or the visitor went away.
 */
export async function openFirstHealthyStream(
    attempts: readonly ModelStreamAttempt[],
    requestSignal: AbortSignal,
    firstPartTimeoutMs = FIRST_PART_TIMEOUT_MS,
): Promise<ReadableStream<ModelStreamPart> | null> {
    for (const [index, attempt] of attempts.entries()) {
        if (requestSignal.aborted) return null;

        const attemptController = new AbortController();
        const timer = setTimeout(
            () => attemptController.abort(new DOMException('No response in time.', 'TimeoutError')),
            firstPartTimeoutMs,
        );
        const signal = AbortSignal.any([requestSignal, attemptController.signal]);

        let reader: ReadableStreamDefaultReader<ModelStreamPart> | null = null;
        const buffered: ModelStreamPart[] = [];
        let outcome: PeekOutcome;

        try {
            reader = attempt.start(signal).getReader();
            outcome = await peekUntilCommitted(reader, buffered);
        } catch (error) {
            outcome = { kind: 'failed', error };
        } finally {
            clearTimeout(timer);
        }

        if (outcome.kind !== 'failed' && reader) {
            return replay(buffered, reader);
        }

        reader?.cancel().catch(() => undefined);
        if (requestSignal.aborted) return null;

        const timedOut = attemptController.signal.aborted;
        const error = outcome.kind === 'failed' ? outcome.error : null;
        const retryable = timedOut || isRetryableModelError(error);

        console.warn('[api/chat] Model attempt failed.', {
            attempt: index + 1,
            label: attempt.label,
            ...(timedOut ? { name: 'TimeoutError', statusCode: null } : describeModelError(error)),
            willFallBack: retryable && index < attempts.length - 1,
        });

        if (!retryable) return null;
    }

    return null;
}

export const CUT_SHORT_NOTE = '\n\n(That answer was cut short. Ask me to continue, or ask about one item.)';

export interface AnswerTracker {
    transform: TransformStream<ModelStreamPart, ModelStreamPart>;
    /** The visible answer text so far (after redaction). */
    text: () => string;
}

/**
 * Records the answer text as it passes (for the "Jump to" sections) and, if the model stopped
 * because it hit its output limit, ends the answer with a clear note instead of a dangling
 * half-sentence.
 */
export function createAnswerTracker(): AnswerTracker {
    let text = '';

    const transform = new TransformStream<ModelStreamPart, ModelStreamPart>({
        transform(part, controller) {
            if (part.type === 'text-delta') text += part.text;

            if (part.type === 'finish' && part.finishReason === 'length') {
                text += CUT_SHORT_NOTE;
                controller.enqueue({ type: 'text-start', id: 'cut-short' } as ModelStreamPart);
                controller.enqueue({ type: 'text-delta', id: 'cut-short', text: CUT_SHORT_NOTE } as ModelStreamPart);
                controller.enqueue({ type: 'text-end', id: 'cut-short' } as ModelStreamPart);
            }

            controller.enqueue(part);
        },
    });

    return { transform, text: () => text };
}

/** Redacts text deltas per text block, holding a short tail until the block ends. */
export function createRedactionTransform(): TransformStream<ModelStreamPart, ModelStreamPart> {
    const redactors = new Map<string, StreamingRedactor>();

    return new TransformStream<ModelStreamPart, ModelStreamPart>({
        transform(part, controller) {
            if (part.type === 'text-delta') {
                let redactor = redactors.get(part.id);
                if (!redactor) {
                    redactor = createStreamingRedactor();
                    redactors.set(part.id, redactor);
                }
                const text = redactor.push(part.text);
                if (text) controller.enqueue({ ...part, text });
                return;
            }

            if (part.type === 'text-end') {
                const rest = redactors.get(part.id)?.flush();
                redactors.delete(part.id);
                if (rest) controller.enqueue({ type: 'text-delta', id: part.id, text: rest });
            }

            controller.enqueue(part);
        },
        flush(controller) {
            for (const [id, redactor] of redactors) {
                const rest = redactor.flush();
                if (rest) controller.enqueue({ type: 'text-delta', id, text: rest });
            }
            redactors.clear();
        },
    });
}
