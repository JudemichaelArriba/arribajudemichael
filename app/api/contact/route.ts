import {
    insertContactMessage,
} from '@/features/contact/messages';
import {
    validateContactFields,
    type ContactFieldErrors,
} from '@/features/contact/validation';
import { checkContactSourceBan } from '@/lib/security/contactBan';
import { checkContactRateLimit } from '@/lib/security/contactRateLimit';
import { getContactSourceIdentifier } from '@/lib/security/contactSource';
import { verifyTurnstileToken } from '@/lib/security/turnstile';

export const runtime = 'nodejs';

interface ContactResponse {
    ok: boolean;
    message: string;
    fieldErrors?: ContactFieldErrors;
}

const MAX_REQUEST_BYTES = 32 * 1024;
const MAX_TOKEN_LENGTH = 2_048;

const INVALID_FORM_MESSAGE = 'Missing or invalid form data.';
const VALIDATION_MESSAGE = 'Please check the information you entered.';
const REQUEST_TOO_LARGE_MESSAGE = 'The submitted request is too large.';
const CAPTCHA_REQUIRED_MESSAGE = 'Please complete the security check.';
const CAPTCHA_REJECTED_MESSAGE = 'Verification failed. Please try again.';
const VERIFICATION_SERVICE_MESSAGE =
    'Unable to verify your request. Please try again.';
const RATE_LIMIT_MESSAGE =
    'Too many message attempts. Please try again later.';
const PROCESSING_SERVICE_MESSAGE =
    'Unable to process your request right now. Please try again later.';
const SUBMISSION_REJECTED_MESSAGE =
    'Unable to submit this message. Please try again later.';
const MESSAGE_SERVICE_MESSAGE =
    'Unable to send your message right now. Please try again later.';
const MESSAGE_SENT_MESSAGE = 'Message sent successfully.';

function jsonResponse(
    message: string,
    status: number,
    ok = false,
    additionalHeaders: Record<string, string> = {},
): Response {
    return Response.json(
        { ok, message } satisfies ContactResponse,
        {
            status,
            headers: {
                ...additionalHeaders,
                'Cache-Control': 'no-store',
            },
        },
    );
}

function validationErrorResponse(
    fieldErrors: ContactFieldErrors,
): Response {
    return Response.json(
        {
            ok: false,
            message: VALIDATION_MESSAGE,
            fieldErrors,
        } satisfies ContactResponse,
        {
            status: 400,
            headers: {
                'Cache-Control': 'no-store',
            },
        },
    );
}

function getSingleString(formData: FormData, field: string): string | null {
    const values = formData.getAll(field);

    return values.length === 1 && typeof values[0] === 'string'
        ? values[0]
        : null;
}

export async function POST(request: Request): Promise<Response> {
    const contentLength = Number(request.headers.get('content-length'));

    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
        return jsonResponse(REQUEST_TOO_LARGE_MESSAGE, 413);
    }

    const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';

    if (
        !contentType.startsWith('multipart/form-data') &&
        !contentType.startsWith('application/x-www-form-urlencoded')
    ) {
        return jsonResponse(INVALID_FORM_MESSAGE, 400);
    }

    let formData: FormData;

    try {
        formData = await request.formData();
    } catch {
        return jsonResponse(INVALID_FORM_MESSAGE, 400);
    }

    const rawUsername = getSingleString(formData, 'username');
    const rawEmail = getSingleString(formData, 'email');
    const rawMessage = getSingleString(formData, 'message');

    if (rawUsername === null || rawEmail === null || rawMessage === null) {
        return jsonResponse(INVALID_FORM_MESSAGE, 400);
    }

    const rawToken = getSingleString(formData, 'cf-turnstile-response');

    if (rawToken === null || rawToken.trim().length === 0) {
        return jsonResponse(CAPTCHA_REQUIRED_MESSAGE, 403);
    }

    const token = rawToken.trim();

    if (token.length > MAX_TOKEN_LENGTH) {
        return jsonResponse(CAPTCHA_REJECTED_MESSAGE, 403);
    }

    const source = getContactSourceIdentifier(request);

    if (!source.ok) {
        console.error('[api/contact] Source identification failed.', {
            reason: source.reason,
        });
        return jsonResponse(PROCESSING_SERVICE_MESSAGE, 503);
    }

    const rateLimit = await checkContactRateLimit(source.identifier);

    if (!rateLimit.allowed) {
        return rateLimit.reason === 'limited'
            ? jsonResponse(RATE_LIMIT_MESSAGE, 429, false, {
                'Retry-After': String(rateLimit.retryAfterSeconds),
            })
            : jsonResponse(PROCESSING_SERVICE_MESSAGE, 503);
    }

    const banCheck = await checkContactSourceBan(source.identifier);

    if (!banCheck.checked) {
        return jsonResponse(PROCESSING_SERVICE_MESSAGE, 503);
    }

    if (banCheck.banned) {
        return jsonResponse(SUBMISSION_REJECTED_MESSAGE, 403);
    }

    const verification = await verifyTurnstileToken({
        token,
        expectedAction: 'contact',
    });

    if (!verification.verified) {
        return verification.reason === 'invalid'
            ? jsonResponse(CAPTCHA_REJECTED_MESSAGE, 403)
            : jsonResponse(VERIFICATION_SERVICE_MESSAGE, 500);
    }

    const validation = validateContactFields({
        username: rawUsername,
        email: rawEmail,
        message: rawMessage,
    });

    if (!validation.success) {
        return validationErrorResponse(validation.fieldErrors);
    }

    const insertResult = await insertContactMessage(
        validation.data,
        source.identifier,
    );

    if (!insertResult.inserted) {
        return jsonResponse(MESSAGE_SERVICE_MESSAGE, 500);
    }

    return jsonResponse(MESSAGE_SENT_MESSAGE, 200, true);
}
