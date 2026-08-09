import 'server-only';

import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';

export type ContactSourceResult =
    | { ok: true; identifier: string }
    | { ok: false; reason: 'configuration' | 'source-unavailable' };

const TRUSTED_IP_HEADERS = [
    'x-vercel-forwarded-for',
    'x-real-ip',
    'x-forwarded-for',
] as const;

function normalizeIp(candidate: string): string | null {
    const trimmedCandidate = candidate.trim();
    const unwrappedCandidate =
        trimmedCandidate.startsWith('[') && trimmedCandidate.endsWith(']')
            ? trimmedCandidate.slice(1, -1)
            : trimmedCandidate;
    const version = isIP(unwrappedCandidate);

    if (version === 4) {
        return unwrappedCandidate
            .split('.')
            .map((part) => String(Number(part)))
            .join('.');
    }

    if (version !== 6) {
        return null;
    }

    try {
        const hostname = new URL(`http://[${unwrappedCandidate}]/`).hostname;
        return hostname.slice(1, -1).toLowerCase();
    } catch {
        return unwrappedCandidate.toLowerCase();
    }
}

function getFirstValidIp(headerValue: string | null): string | null {
    if (!headerValue) return null;

    for (const candidate of headerValue.split(',')) {
        const normalizedIp = normalizeIp(candidate);
        if (normalizedIp) return normalizedIp;
    }

    return null;
}

function getTrustedClientIp(request: Request): string | null {
    for (const headerName of TRUSTED_IP_HEADERS) {
        const normalizedIp = getFirstValidIp(request.headers.get(headerName));
        if (normalizedIp) return normalizedIp;
    }

    return null;
}

export function getContactSourceIdentifier(
    request: Request,
): ContactSourceResult {
    const hashSecret = process.env.CONTACT_IP_HASH_SECRET;

    if (!hashSecret || hashSecret.trim().length === 0) {
        return { ok: false, reason: 'configuration' };
    }

    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction && process.env.VERCEL !== '1') {
        return { ok: false, reason: 'source-unavailable' };
    }

    const normalizedIp =
        getTrustedClientIp(request) ?? (isProduction ? null : '127.0.0.1');

    if (!normalizedIp) {
        return { ok: false, reason: 'source-unavailable' };
    }

    try {
        return {
            ok: true,
            identifier: createHmac('sha256', hashSecret)
                .update(normalizedIp)
                .digest('hex'),
        };
    } catch {
        return { ok: false, reason: 'source-unavailable' };
    }
}
