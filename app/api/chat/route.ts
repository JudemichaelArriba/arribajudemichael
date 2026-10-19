import { getChatEnv, isChatEnabled } from '@/features/chat/env';
import { moderateInput } from '@/features/chat/moderation';
import {
    createModerationClassifier,
    streamCannedReply,
    streamChatAnswer,
} from '@/features/chat/respond';
import { parseChatRequest } from '@/features/chat/schema';
import { checkChatRateLimit } from '@/lib/security/chatRateLimit';
import { getContactSourceIdentifier } from '@/lib/security/contactSource';
import { isSameOriginRequest } from '@/lib/security/requestOrigin';

export const runtime = 'nodejs';
export const maxDuration = 60;

type ChatErrorCode = 'unavailable' | 'forbidden' | 'invalid' | 'too_large' | 'rate_limited' | 'error';

const MAX_REQUEST_BYTES = 24 * 1024;

const MESSAGES: Record<ChatErrorCode, string> = {
    unavailable: 'Ask is resting right now. Please try again later.',
    forbidden: 'This request is not allowed.',
    invalid: 'Please check your message and try again.',
    too_large: 'That message is too long.',
    rate_limited: "You've asked a lot of questions. Please try again in a few minutes.",
    error: 'Something went wrong, please try again.',
};

function errorResponse(
    code: ChatErrorCode,
    status: number,
    additionalHeaders: Record<string, string> = {},
): Response {
    return Response.json(
        { ok: false, code, message: MESSAGES[code] },
        { status, headers: { ...additionalHeaders, 'Cache-Control': 'no-store' } },
    );
}

/** Reads at most `maxBytes`, whatever Content-Length claims, so chunked bodies are capped too. */
async function readBodyWithLimit(request: Request, maxBytes: number): Promise<string | null> {
    if (!request.body) return '';

    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        total += value.byteLength;
        if (total > maxBytes) {
            await reader.cancel().catch(() => undefined);
            return null;
        }
        chunks.push(value);
    }

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export async function POST(request: Request): Promise<Response> {
    if (!isChatEnabled()) {
        return errorResponse('unavailable', 503);
    }

    const chatEnv = getChatEnv();
    if (!chatEnv.ok) {
        return errorResponse('unavailable', 503);
    }

    if (!isSameOriginRequest(request)) {
        return errorResponse('forbidden', 403);
    }

    const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.startsWith('application/json')) {
        return errorResponse('invalid', 415);
    }

    const contentLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
        return errorResponse('too_large', 413);
    }

    const source = getContactSourceIdentifier(request);
    if (!source.ok) {
        console.error('[api/chat] Source identification failed.', { reason: source.reason });
        return errorResponse('unavailable', 503);
    }

    const rateLimit = await checkChatRateLimit(source.identifier);
    if (!rateLimit.allowed) {
        return rateLimit.reason === 'limited'
            ? errorResponse('rate_limited', 429, {
                'Retry-After': String(rateLimit.retryAfterSeconds),
            })
            : errorResponse('unavailable', 503);
    }

    let rawBody: string | null;
    try {
        rawBody = await readBodyWithLimit(request, MAX_REQUEST_BYTES);
    } catch {
        return errorResponse('invalid', 400);
    }

    if (rawBody === null) {
        return errorResponse('too_large', 413);
    }

    let json: unknown;
    try {
        json = JSON.parse(rawBody);
    } catch {
        return errorResponse('invalid', 400);
    }

    const chatRequest = parseChatRequest(json);
    if (!chatRequest) {
        return errorResponse('invalid', 400);
    }

    try {
        const moderation = await moderateInput(
            chatRequest.messages
                .filter((message) => message.role === 'user')
                .map((message) => message.content),
            createModerationClassifier(chatEnv.env),
        );

        if (!moderation.allowed) {
            return streamCannedReply(moderation.reply);
        }

        const answer = await streamChatAnswer(chatEnv.env, chatRequest.messages, request.signal);
        return answer ?? errorResponse('error', 502);
    } catch (error) {
        console.error('[api/chat] Request failed.', {
            name: error instanceof Error ? error.name : 'UnknownError',
        });
        return errorResponse('error', 500);
    }
}
