/** @jest-environment node */

import { createWorkersAiFetch, createWorkersAiLineNormalizer } from '../workersAiFetch';

const numericChunk = 'data: {"choices":[{"index":0,"delta":{"content":2023}}]}';
const textLine = (content: string) => `data: {"choices":[{"delta":{"content":${JSON.stringify(content)}}}]}`;
const contentOf = (line: string) =>
  (JSON.parse(line.slice('data: '.length)) as { choices: Array<{ delta: { content: string } }> }).choices[0].delta.content;

describe('createWorkersAiLineNormalizer', () => {
  it('turns a numeric content token into text', () => {
    const normalizeWorkersAiLine = createWorkersAiLineNormalizer();
    expect(JSON.parse(normalizeWorkersAiLine(numericChunk).slice('data: '.length))).toEqual({
      choices: [{ index: 0, delta: { content: '2023' } }],
    });
  });

  it('restores the space a numeric token lost after a word, but not inside a number', () => {
    const afterWord = createWorkersAiLineNormalizer();
    afterWord(textLine('started in'));
    expect(contentOf(afterWord(numericChunk))).toBe(' 2023');

    const afterSpace = createWorkersAiLineNormalizer();
    afterSpace(textLine('started in '));
    expect(contentOf(afterSpace(numericChunk))).toBe('2023');

    const splitNumber = createWorkersAiLineNormalizer();
    splitNumber(textLine('since 20'));
    expect(contentOf(splitNumber('data: {"choices":[{"delta":{"content":23}}]}'))).toBe('23');
  });

  it('leaves normal chunks, [DONE] and other lines untouched', () => {
    const normalizeWorkersAiLine = createWorkersAiLineNormalizer();
    const textChunk = 'data: {"choices":[{"delta":{"content":"Hello"}}]}';
    expect(normalizeWorkersAiLine(textChunk)).toBe(textChunk);
    expect(normalizeWorkersAiLine('data: [DONE]')).toBe('data: [DONE]');
    expect(normalizeWorkersAiLine('')).toBe('');
    expect(normalizeWorkersAiLine('data: {broken')).toBe('data: {broken');
  });
});

describe('createWorkersAiFetch', () => {
  function sseResponse(pieces: string[], init: ResponseInit = {}): Response {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const piece of pieces) controller.enqueue(encoder.encode(piece));
        controller.close();
      },
    });
    return new Response(body, { headers: { 'content-type': 'text/event-stream' }, ...init });
  }

  it('fixes numeric tokens even when a line is split across network chunks', async () => {
    const [head, tail] = [numericChunk.slice(0, 30), numericChunk.slice(30)];
    const fetchWithFix = createWorkersAiFetch(async () => sseResponse([`${head}`, `${tail}\n\ndata: [DONE]\n\n`]));

    const text = await (await fetchWithFix('https://example.test')).text();

    expect(text).toContain('"content":"2023"');
    expect(text).toContain('data: [DONE]');
  });

  it('returns error and non-stream responses unchanged', async () => {
    const failed = new Response('{"error":"busy"}', { status: 429 });
    const json = new Response('{"ok":true}', { headers: { 'content-type': 'application/json' } });

    await expect(createWorkersAiFetch(async () => failed)('https://example.test')).resolves.toBe(failed);
    await expect(createWorkersAiFetch(async () => json)('https://example.test')).resolves.toBe(json);
  });
});
