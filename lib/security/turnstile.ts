import 'server-only';

type TurnstileAction = 'login' | 'contact';

interface VerifyTurnstileTokenOptions {
    token: string;
    expectedAction: TurnstileAction;
}

export type TurnstileVerificationResult =
    | { verified: true }
    | { verified: false; reason: 'invalid' | 'service' };

interface SiteverifyResponse {
    success: boolean;
    action?: string;
    'error-codes'?: string[];
}

const SITEVERIFY_URL =
    'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const SITEVERIFY_TIMEOUT_MS = 8_000;

function isSiteverifyResponse(value: unknown): value is SiteverifyResponse {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Record<string, unknown>;

    return (
        typeof candidate.success === 'boolean' &&
        (candidate.action === undefined || typeof candidate.action === 'string') &&
        (
            candidate['error-codes'] === undefined ||
            (
                Array.isArray(candidate['error-codes']) &&
                candidate['error-codes'].every((code) => typeof code === 'string')
            )
        )
    );
}

export async function verifyTurnstileToken({
    token,
    expectedAction,
}: VerifyTurnstileTokenOptions): Promise<TurnstileVerificationResult> {
    const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();

    if (!secretKey) {
        console.error('[security/turnstile] Server configuration is incomplete.');
        return { verified: false, reason: 'service' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SITEVERIFY_TIMEOUT_MS);

    try {
        const response = await fetch(SITEVERIFY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                secret: secretKey,
                response: token,
            }),
            cache: 'no-store',
            signal: controller.signal,
        });

        if (!response.ok) {
            console.warn('[security/turnstile] Siteverify request was rejected.', {
                status: response.status,
            });
            return { verified: false, reason: 'service' };
        }

        const payload: unknown = await response.json();

        if (!isSiteverifyResponse(payload)) {
            console.warn('[security/turnstile] Siteverify returned an invalid response.');
            return { verified: false, reason: 'service' };
        }

        if (!payload.success) {
            console.warn('[security/turnstile] Verification was rejected.', {
                errorCodes: payload['error-codes']?.slice(0, 8) ?? [],
            });
            return { verified: false, reason: 'invalid' };
        }

        if (payload.action !== expectedAction) {
            console.warn('[security/turnstile] Verification action did not match.');
            return { verified: false, reason: 'invalid' };
        }

        return { verified: true };
    } catch (error) {
        console.error('[security/turnstile] Siteverify request failed.', {
            name: error instanceof Error ? error.name : 'UnknownError',
        });
        return { verified: false, reason: 'service' };
    } finally {
        clearTimeout(timeoutId);
    }
}
