// Last line of defence for the chat assistant's output: redacts anything that looks like a
// credential, an environment variable name, or an internal service host before it reaches the
// browser. Pure and dependency-free so it can be tested without the AI SDK.

export const REDACTION = '[removed]';

const SECRET_PATTERNS: readonly RegExp[] = [
    /\bgsk_[A-Za-z0-9]{8,}/g,
    /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{8,}/g,
    /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]*)?/g,
    /\bBearer\s+[A-Za-z0-9._~+/-]{12,}=*/gi,
    /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/g,
    /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
    /\bre_[A-Za-z0-9_]{20,}/g,
    /\bAKIA[0-9A-Z]{16}\b/g,
    /\b0x4AAAA[A-Za-z0-9_-]{10,}/g,
    // Environment variable names used by this project, plus anything shaped like a secret's name.
    /\b(?:NEXT_PUBLIC_[A-Z0-9_]+|SUPABASE_[A-Z0-9_]+|UPSTASH_[A-Z0-9_]+|CLOUDFLARE_[A-Z0-9_]+|GROQ_[A-Z0-9_]+|RESEND_[A-Z0-9_]+|TURNSTILE_[A-Z0-9_]+|GITHUB_CONTRIBUTIONS_TOKEN|CONTACT_IP_HASH_SECRET|NOTIFICATION_(?:FROM_)?EMAIL|ANALYTICS_ENABLED|CHAT_ENABLED)\b/g,
    /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*_(?:API_KEY|KEY|TOKEN|SECRET|PASSWORD)\b/g,
    // Internal service hosts (with any path that follows).
    /\b(?:https?:\/\/)?[a-z0-9-]+\.supabase\.(?:co|in|com)\S*/gi,
    /\b(?:https?:\/\/)?api\.groq\.com\S*/gi,
    /\b(?:https?:\/\/)?api\.cloudflare\.com\S*/gi,
    /\b(?:https?:\/\/)?[a-z0-9-]+\.upstash\.io\S*/gi,
];

export function redactSecrets(text: string): string {
    return SECRET_PATTERNS.reduce((result, pattern) => result.replace(pattern, REDACTION), text);
}

/** Characters always held back so a pattern split across chunks is still seen whole. */
const TAIL_WINDOW = 48;
/** A run with no whitespace longer than this is released anyway (after redaction). */
const MAX_HELD_LENGTH = 2_048;

export interface StreamingRedactor {
    push(chunk: string): string;
    flush(): string;
}

function findMatchRanges(text: string): Array<[number, number]> {
    return SECRET_PATTERNS.flatMap((pattern) =>
        [...text.matchAll(pattern)].map((match): [number, number] => {
            const start = match.index ?? 0;
            return [start, start + match[0].length];
        }),
    );
}

/**
 * A safe place to release up to: after whitespace, before the tail window, never inside a match,
 * and never past the start of a match that reaches the end of the buffer (it may still grow).
 */
function findReleasePoint(text: string): number {
    const limit = text.length - TAIL_WINDOW;
    if (limit <= 0) return -1;

    const ranges = findMatchRanges(text);

    for (let index = limit; index > 0; index -= 1) {
        if (!/\s/.test(text[index - 1])) continue;
        const splitsMatch = ranges.some(([start, end]) => start < index && index < end);
        const passesOpenMatch = ranges.some(([start, end]) => end === text.length && index > start);
        if (!splitsMatch && !passesOpenMatch) return index;
    }

    return -1;
}

/**
 * Streams text through `redactSecrets`. Held text stays raw so a token arriving in pieces is
 * matched — and redacted — as a whole; only text before a safe release point is emitted.
 */
export function createStreamingRedactor(): StreamingRedactor {
    let pending = '';

    return {
        push(chunk) {
            pending += chunk;

            const cut = findReleasePoint(pending);
            if (cut === -1) {
                if (pending.length <= MAX_HELD_LENGTH) return '';
                const released = redactSecrets(pending);
                pending = '';
                return released;
            }

            const released = redactSecrets(pending.slice(0, cut));
            pending = pending.slice(cut);
            return released;
        },
        flush() {
            const released = redactSecrets(pending);
            pending = '';
            return released;
        },
    };
}
