/** @jest-environment node */

import { REDACTION } from '@/lib/security/chatOutputFilter';
import { describeModelError, isRetryableModelError } from '../fallback';
import {
  createRedactionTransform,
  openFirstHealthyStream,
  type ModelStreamAttempt,
  type ModelStreamPart,
} from '../modelStream';

function apiError(statusCode: number) {
  return Object.assign(new Error(`HTTP ${statusCode}`), { name: 'AI_APICallError', statusCode });
}

function partsStream(parts: ModelStreamPart[]): ReadableStream<ModelStreamPart> {
  return new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(part);
      controller.close();
    },
  });
}

function neverStream(signal: AbortSignal): ReadableStream<ModelStreamPart> {
  return new ReadableStream({
    start(controller) {
      signal.addEventListener('abort', () => controller.enqueue({ type: 'abort' } as ModelStreamPart));
    },
  });
}

const answer: ModelStreamPart[] = [
  { type: 'start' } as ModelStreamPart,
  { type: 'text-start', id: 't' } as ModelStreamPart,
  { type: 'text-delta', id: 't', text: 'Hello' } as ModelStreamPart,
  { type: 'text-end', id: 't' } as ModelStreamPart,
];

async function collect(stream: ReadableStream<ModelStreamPart> | null): Promise<ModelStreamPart[]> {
  if (!stream) throw new Error('expected a stream');
  const parts: ModelStreamPart[] = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) return parts;
    parts.push(value);
  }
}

describe('isRetryableModelError', () => {
  it.each([429, 500, 502, 503, 504])('retries HTTP %i', (status) => {
    expect(isRetryableModelError(apiError(status))).toBe(true);
  });

  it.each([400, 401, 403, 404, 422])('does not retry HTTP %i', (status) => {
    expect(isRetryableModelError(apiError(status))).toBe(false);
  });

  it('retries timeouts, aborts and network failures', () => {
    expect(isRetryableModelError(new DOMException('slow', 'TimeoutError'))).toBe(true);
    expect(isRetryableModelError(new DOMException('stop', 'AbortError'))).toBe(true);
    expect(isRetryableModelError(Object.assign(new Error('reset'), { code: 'ECONNRESET' }))).toBe(true);
    expect(
      isRetryableModelError(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } })),
    ).toBe(true);
  });

  it('does not retry validation or unknown errors', () => {
    expect(isRetryableModelError(new Error('Invalid input'))).toBe(false);
    expect(isRetryableModelError(undefined)).toBe(false);
  });

  it('describes errors without messages or bodies', () => {
    expect(describeModelError(Object.assign(apiError(429), { responseBody: 'gsk_secret' }))).toEqual({
      name: 'AI_APICallError',
      statusCode: 429,
    });
  });
});

describe('openFirstHealthyStream', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function attempt(label: string, start: ModelStreamAttempt['start']): ModelStreamAttempt {
    return { label, start: jest.fn(start) };
  }

  it('uses the primary model when it answers', async () => {
    const primary = attempt('primary', () => partsStream(answer));
    const secondary = attempt('secondary', () => partsStream(answer));

    const parts = await collect(await openFirstHealthyStream([primary, secondary], new AbortController().signal));

    expect(parts).toEqual(answer);
    expect(secondary.start).not.toHaveBeenCalled();
  });

  it('falls back on a rate limit and on a server error', async () => {
    const primary = attempt('primary', () => partsStream([{ type: 'start' } as ModelStreamPart, { type: 'error', error: apiError(429) } as ModelStreamPart]));
    const secondary = attempt('secondary', () => partsStream([{ type: 'error', error: apiError(503) } as ModelStreamPart]));
    const fallback = attempt('fallback', () => partsStream(answer));

    const parts = await collect(
      await openFirstHealthyStream([primary, secondary, fallback], new AbortController().signal),
    );

    expect(parts.map((part) => part.type)).toEqual(['start', 'text-start', 'text-delta', 'text-end']);
    expect(fallback.start).toHaveBeenCalledTimes(1);
  });

  it('falls back when a model produces nothing before the first-part timeout', async () => {
    const primary = attempt('primary', neverStream);
    const secondary = attempt('secondary', () => partsStream(answer));

    const stream = await openFirstHealthyStream([primary, secondary], new AbortController().signal, 20);

    expect(await collect(stream)).toEqual(answer);
  });

  it('falls back when a later step fails after a tool lookup but before any answer text', async () => {
    const primary = attempt('primary', () =>
      partsStream([
        { type: 'start-step' } as ModelStreamPart,
        { type: 'reasoning-delta', id: 'r', text: 'thinking' } as ModelStreamPart,
        { type: 'tool-call', toolCallId: 'c1', toolName: 'getExperience', input: {} } as ModelStreamPart,
        { type: 'tool-result', toolCallId: 'c1', toolName: 'getExperience', input: {}, output: { items: [] } } as ModelStreamPart,
        { type: 'error', error: apiError(429) } as ModelStreamPart,
      ]),
    );
    const secondary = attempt('secondary', () => partsStream(answer));

    const parts = await collect(await openFirstHealthyStream([primary, secondary], new AbortController().signal));

    expect(parts).toEqual(answer);
    expect(secondary.start).toHaveBeenCalledTimes(1);
  });

  it('does not fall back on a non-retryable error', async () => {
    const primary = attempt('primary', () => partsStream([{ type: 'error', error: apiError(401) } as ModelStreamPart]));
    const secondary = attempt('secondary', () => partsStream(answer));

    await expect(openFirstHealthyStream([primary, secondary], new AbortController().signal)).resolves.toBeNull();
    expect(secondary.start).not.toHaveBeenCalled();
  });

  it('returns null when every model fails', async () => {
    const failing = () => partsStream([{ type: 'error', error: apiError(500) } as ModelStreamPart]);

    await expect(
      openFirstHealthyStream([attempt('a', failing), attempt('b', failing)], new AbortController().signal),
    ).resolves.toBeNull();
  });

  it('commits once output has started: a later error is passed through, not retried', async () => {
    const primary = attempt('primary', () =>
      partsStream([
        { type: 'text-start', id: 't' } as ModelStreamPart,
        { type: 'text-delta', id: 't', text: 'Hel' } as ModelStreamPart,
        { type: 'error', error: apiError(503) } as ModelStreamPart,
      ]),
    );
    const secondary = attempt('secondary', () => partsStream(answer));

    const parts = await collect(await openFirstHealthyStream([primary, secondary], new AbortController().signal));

    expect(parts.at(-1)).toMatchObject({ type: 'error' });
    expect(secondary.start).not.toHaveBeenCalled();
  });

  it('stops when the visitor has gone away', async () => {
    const controller = new AbortController();
    controller.abort();
    const primary = attempt('primary', () => partsStream(answer));

    await expect(openFirstHealthyStream([primary], controller.signal)).resolves.toBeNull();
    expect(primary.start).not.toHaveBeenCalled();
  });
});

describe('createRedactionTransform', () => {
  it('redacts secrets in text deltas and flushes held text before text-end', async () => {
    const parts = await collect(
      partsStream([
        { type: 'text-start', id: 't' } as ModelStreamPart,
        { type: 'text-delta', id: 't', text: 'The key is gsk_abcd' } as ModelStreamPart,
        { type: 'text-delta', id: 't', text: 'EFGH12345678 ok' } as ModelStreamPart,
        { type: 'text-end', id: 't' } as ModelStreamPart,
      ]).pipeThrough(createRedactionTransform()),
    );

    const text = parts
      .filter((part): part is Extract<ModelStreamPart, { type: 'text-delta' }> => part.type === 'text-delta')
      .map((part) => part.text)
      .join('');

    expect(text).toBe(`The key is ${REDACTION} ok`);
    expect(parts.at(-1)).toEqual({ type: 'text-end', id: 't' });
  });
});
