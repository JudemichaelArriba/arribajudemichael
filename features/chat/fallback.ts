// Pure: decides whether a failed model attempt may move on to the next model in the chain.
// Transient trouble (429, 5xx, timeouts, network) and a model that is unavailable to this account
// (403 blocked, 404 missing or retired) move on: another model can still answer. Malformed
// requests (400/422) and invalid credentials (401) are bugs no other model would fix, so they
// surface as a generic error.

// Model-specific availability problems: the next model in the chain is a different model.
const MODEL_UNAVAILABLE_STATUS = new Set([403, 404]);

const RETRYABLE_ERROR_NAMES = new Set(['TimeoutError', 'AbortError']);
const NETWORK_ERROR_CODES = new Set([
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EAI_AGAIN',
    'ENOTFOUND',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_SOCKET',
]);

function readStatusCode(error: object): number | null {
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    return typeof statusCode === 'number' && Number.isInteger(statusCode) ? statusCode : null;
}

function readCode(error: object): string | null {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : null;
}

export function isRetryableModelError(error: unknown, depth = 0): boolean {
    if (!error || typeof error !== 'object' || depth > 3) return false;

    const statusCode = readStatusCode(error);
    if (statusCode !== null) {
        return (
            statusCode === 429 ||
            MODEL_UNAVAILABLE_STATUS.has(statusCode) ||
            (statusCode >= 500 && statusCode <= 599)
        );
    }

    const name = (error as { name?: unknown }).name;
    if (typeof name === 'string' && RETRYABLE_ERROR_NAMES.has(name)) return true;

    const code = readCode(error);
    if (code && NETWORK_ERROR_CODES.has(code)) return true;

    // fetch() reports network failures as `TypeError: fetch failed` with the real cause attached.
    const cause = (error as { cause?: unknown }).cause;
    if (cause) return isRetryableModelError(cause, depth + 1);

    return name === 'TypeError' && (error as { message?: unknown }).message === 'fetch failed';
}

/** A bounded, secret-free description of an error for logs. */
export function describeModelError(error: unknown): { name: string; statusCode: number | null } {
    if (!error || typeof error !== 'object') return { name: 'UnknownError', statusCode: null };
    const name = (error as { name?: unknown }).name;
    return {
        name: typeof name === 'string' ? name.slice(0, 64) : 'UnknownError',
        statusCode: readStatusCode(error),
    };
}
