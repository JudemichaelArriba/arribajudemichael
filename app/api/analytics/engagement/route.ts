import { cookies } from 'next/headers';

import {
    getAnalyticsAuthenticationState,
    isAnalyticsEnabled,
} from '@/features/analytics/request';
import {
    ANALYTICS_SESSION_COOKIE,
    ANALYTICS_VISITOR_COOKIE,
    validateAnalyticsSession,
} from '@/features/analytics/session';
import type { Json } from '@/lib/models/database.types';
import { checkAnalyticsEngagementRateLimit } from '@/lib/security/analyticsEngagementRateLimit';
import {
    createSystemClient,
    SupabaseSystemConfigurationError,
} from '@/lib/supabase/system';

export const runtime = 'nodejs';

const MAX_REQUEST_BYTES = 16 * 1024;
const MAX_SECTIONS = 20;
const MAX_SECTION_KEY_LENGTH = 64;
const MAX_VIEW_COUNT = 100;
const MAX_VISIBLE_MS = 1_800_000;
const DATABASE_TIMEOUT_MS = 5_000;
const SECTION_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
const REQUEST_KEYS = new Set(['sections']);
const SECTION_KEYS = new Set([
    'sectionKey',
    'viewCount',
    'visibleMs',
    'maxVisibility',
]);

interface ValidatedEngagementSection {
    sectionKey: string;
    viewCount: number;
    visibleMs: number;
    maxVisibility: number;
}

type BoundedJsonResult =
    | { status: 'ok'; value: unknown }
    | { status: 'malformed' | 'oversized' };

function emptyResponse(status: number): Response {
    return new Response(null, {
        status,
        headers: { 'Cache-Control': 'no-store' },
    });
}

function hasExactKeys(
    value: Record<string, unknown>,
    expectedKeys: ReadonlySet<string>,
): boolean {
    const keys = Object.keys(value);
    return (
        keys.length === expectedKeys.size &&
        keys.every((key) => expectedKeys.has(key))
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readBoundedJson(request: Request): Promise<BoundedJsonResult> {
    const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.startsWith('application/json')) {
        return { status: 'malformed' };
    }

    const declaredLength = request.headers.get('content-length');
    if (declaredLength !== null) {
        const normalizedLength = declaredLength.trim();
        if (!/^\d+$/.test(normalizedLength)) {
            return { status: 'malformed' };
        }

        const contentLength = Number(normalizedLength);
        if (!Number.isSafeInteger(contentLength)) {
            return { status: 'malformed' };
        }
        if (contentLength > MAX_REQUEST_BYTES) {
            return { status: 'oversized' };
        }
    }

    if (!request.body) return { status: 'malformed' };

    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            totalBytes += value.byteLength;
            if (totalBytes > MAX_REQUEST_BYTES) {
                await reader.cancel().catch(() => undefined);
                return { status: 'oversized' };
            }

            chunks.push(value);
        }
    } catch {
        return { status: 'malformed' };
    } finally {
        reader.releaseLock();
    }

    try {
        const decoder = new TextDecoder('utf-8', { fatal: true });
        let bodyText = '';

        chunks.forEach((chunk, index) => {
            bodyText += decoder.decode(chunk, {
                stream: index < chunks.length - 1,
            });
        });
        bodyText += decoder.decode();

        if (!bodyText) return { status: 'malformed' };
        return { status: 'ok', value: JSON.parse(bodyText) as unknown };
    } catch {
        return { status: 'malformed' };
    }
}

function validatePayload(value: unknown): ValidatedEngagementSection[] | null {
    if (!isRecord(value) || !hasExactKeys(value, REQUEST_KEYS)) return null;

    const sections = value.sections;
    if (
        !Array.isArray(sections) ||
        sections.length < 1 ||
        sections.length > MAX_SECTIONS
    ) {
        return null;
    }

    const seenSectionKeys = new Set<string>();
    const validatedSections: ValidatedEngagementSection[] = [];

    for (const section of sections) {
        if (!isRecord(section) || !hasExactKeys(section, SECTION_KEYS)) {
            return null;
        }

        const { sectionKey, viewCount, visibleMs, maxVisibility } = section;

        if (
            typeof sectionKey !== 'string' ||
            sectionKey.length < 1 ||
            sectionKey.length > MAX_SECTION_KEY_LENGTH ||
            !SECTION_KEY_PATTERN.test(sectionKey) ||
            sectionKey === 'home' ||
            seenSectionKeys.has(sectionKey) ||
            typeof viewCount !== 'number' ||
            !Number.isInteger(viewCount) ||
            viewCount < 0 ||
            viewCount > MAX_VIEW_COUNT ||
            typeof visibleMs !== 'number' ||
            !Number.isInteger(visibleMs) ||
            visibleMs < 0 ||
            visibleMs > MAX_VISIBLE_MS ||
            typeof maxVisibility !== 'number' ||
            !Number.isFinite(maxVisibility) ||
            maxVisibility < 0 ||
            maxVisibility > 1 ||
            (viewCount === 0 && visibleMs === 0)
        ) {
            return null;
        }

        seenSectionKeys.add(sectionKey);
        validatedSections.push({
            sectionKey,
            viewCount,
            visibleMs,
            maxVisibility,
        });
    }

    return validatedSections;
}

export async function POST(request: Request): Promise<Response> {
    if (!isAnalyticsEnabled()) return emptyResponse(204);

    const authenticationState = await getAnalyticsAuthenticationState();
    if (authenticationState === 'authenticated') return emptyResponse(204);
    if (authenticationState === 'unavailable') return emptyResponse(503);

    const bodyResult = await readBoundedJson(request);
    if (bodyResult.status !== 'ok') {
        return emptyResponse(bodyResult.status === 'oversized' ? 413 : 400);
    }

    const sections = validatePayload(bodyResult.value);
    if (!sections) return emptyResponse(400);

    const rateLimit = await checkAnalyticsEngagementRateLimit(request);
    if (!rateLimit.allowed) {
        return emptyResponse(rateLimit.reason === 'limited' ? 429 : 503);
    }

    const cookieStore = await cookies();
    const session = await validateAnalyticsSession({
        visitorCookieValue: cookieStore.get(ANALYTICS_VISITOR_COOKIE)?.value,
        sessionCookieValue: cookieStore.get(ANALYTICS_SESSION_COOKIE)?.value,
    });

    if (!session.valid) {
        return emptyResponse(session.reason === 'invalid' ? 401 : 503);
    }

    let supabase: ReturnType<typeof createSystemClient>;

    try {
        supabase = createSystemClient();
    } catch (error) {
        console.error('[api/analytics/engagement] System client is unavailable.', {
            name:
                error instanceof SupabaseSystemConfigurationError
                    ? error.name
                    : error instanceof Error
                        ? error.name
                        : 'UnknownError',
        });
        return emptyResponse(503);
    }

    const rpcSections: Json = sections.map((section) => ({
        sectionKey: section.sectionKey,
        viewCount: section.viewCount,
        visibleMs: section.visibleMs,
        maxVisibility: section.maxVisibility,
    }));
    const controller = new AbortController();
    const timeoutId = setTimeout(
        () => controller.abort(),
        DATABASE_TIMEOUT_MS,
    );

    try {
        const { error } = await supabase
            .rpc('record_analytics_engagement', {
                p_session_id: session.sessionId,
                p_sections: rpcSections,
            })
            .abortSignal(controller.signal);

        if (error) {
            console.error('[api/analytics/engagement] RPC failed.', {
                operation: 'record',
                code: error.code || 'unknown',
            });
            return emptyResponse(503);
        }
    } catch (error) {
        console.error('[api/analytics/engagement] RPC request failed.', {
            operation: 'record',
            name: error instanceof Error ? error.name : 'UnknownError',
        });
        return emptyResponse(503);
    } finally {
        clearTimeout(timeoutId);
    }

    return emptyResponse(204);
}
