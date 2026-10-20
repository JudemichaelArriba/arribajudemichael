// Workers AI sometimes streams an answer token as a JSON number (`"content": 2023`) instead of a
// string. The OpenAI-compatible provider rejects that chunk, which drops the token from the answer
// and ends it with an error. This fetch wrapper turns numeric `delta.content` back into text before
// the provider validates the stream. Every other line passes through byte-for-byte.

type FetchFunction = typeof globalThis.fetch;

interface StreamChunk {
    choices?: Array<{ delta?: { content?: unknown } }>;
}

// The number form also loses the token's leading space ("since2023"). Restore it after a word or
// punctuation, but not after a digit, so a number split across chunks stays joined.
const NEEDS_SPACE_BEFORE_NUMBER = /[\p{L},.;:!?)]$/u;

/**
 * Returns a per-stream line normalizer. It remembers the answer text so far, which is needed to
 * decide whether a numeric token lost its leading space.
 */
export function createWorkersAiLineNormalizer(): (line: string) => string {
    let answerSoFar = '';

    return (line) => {
        if (!line.startsWith('data:')) return line;

        const payload = line.slice('data:'.length).trim();
        if (!payload.startsWith('{')) return line;

        let chunk: StreamChunk;
        try {
            chunk = JSON.parse(payload) as StreamChunk;
        } catch {
            return line;
        }

        let changed = false;
        for (const choice of chunk.choices ?? []) {
            const delta = choice.delta;
            if (!delta) continue;

            if (typeof delta.content === 'number' || typeof delta.content === 'boolean') {
                const separator = NEEDS_SPACE_BEFORE_NUMBER.test(answerSoFar) ? ' ' : '';
                delta.content = `${separator}${String(delta.content)}`;
                changed = true;
            }
            if (typeof delta.content === 'string') answerSoFar += delta.content;
        }

        return changed ? `data: ${JSON.stringify(chunk)}` : line;
    };
}

function normalizeEventStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const normalizeWorkersAiLine = createWorkersAiLineNormalizer();
    let pending = '';

    return body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
            transform(bytes, controller) {
                pending += decoder.decode(bytes, { stream: true });
                const lines = pending.split('\n');
                // The last piece may be an unfinished line; keep it for the next chunk.
                pending = lines.pop() ?? '';
                if (lines.length > 0) {
                    controller.enqueue(encoder.encode(lines.map((line) => `${normalizeWorkersAiLine(line)}\n`).join('')));
                }
            },
            flush(controller) {
                pending += decoder.decode();
                if (pending) controller.enqueue(encoder.encode(normalizeWorkersAiLine(pending)));
            },
        }),
    );
}

export function createWorkersAiFetch(baseFetch: FetchFunction = globalThis.fetch): FetchFunction {
    return async (input, init) => {
        const response = await baseFetch(input, init);
        const isEventStream = response.headers.get('content-type')?.includes('text/event-stream');
        if (!response.ok || !response.body || !isEventStream) return response;

        return new Response(normalizeEventStream(response.body), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
        });
    };
}
