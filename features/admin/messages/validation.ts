import type {
    AdminMessageQuery,
    BanDuration,
    BanSourceFieldErrors,
    BanSourceInput,
    MessageFilter,
    MessageSecurityStatus,
} from './types';

export const ADMIN_MESSAGES_PAGE_SIZE = 50;
export const MESSAGE_SEARCH_MAX_LENGTH = 100;
export const BAN_REASON_MIN_LENGTH = 3;
export const BAN_REASON_MAX_LENGTH = 500;
export const BAN_DURATIONS = [
    '24h',
    '7d',
    '30d',
    'permanent',
] as const satisfies readonly BanDuration[];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MESSAGE_FILTERS = new Set<MessageFilter>([
    'inbox',
    'unread',
    'starred',
    'archived',
]);
const BAN_DURATION_VALUES = new Set<BanDuration>(BAN_DURATIONS);
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/g;
const INVALID_REASON_CONTROL_PATTERN = /[\u0000-\u0009\u000b-\u001f\u007f]/;
const MAX_PAGE_NUMBER = 10_000;

type MessageSearchParams = Record<
    string,
    string | string[] | undefined
>;

function getFirstValue(value: string | string[] | undefined): string {
    return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export function isMessageId(value: string): boolean {
    return UUID_PATTERN.test(value);
}

export function isMessageFilter(value: string): value is MessageFilter {
    return MESSAGE_FILTERS.has(value as MessageFilter);
}

export function isBanDuration(value: string): value is BanDuration {
    return BAN_DURATION_VALUES.has(value as BanDuration);
}

export function isMessageSecurityStatus(
    value: string,
): value is MessageSecurityStatus {
    return value === 'normal' || value === 'flagged';
}

export function parseAdminMessageQuery(
    searchParams: MessageSearchParams,
): AdminMessageQuery {
    const filterValue = getFirstValue(searchParams.filter);
    const rawSearch = getFirstValue(searchParams.q);
    const pageValue = Number(getFirstValue(searchParams.page));
    const normalizedSearch = rawSearch
        .replace(CONTROL_CHARACTER_PATTERN, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MESSAGE_SEARCH_MAX_LENGTH);

    return {
        filter: isMessageFilter(filterValue) ? filterValue : 'inbox',
        search: normalizedSearch,
        page:
            Number.isSafeInteger(pageValue) &&
            pageValue >= 1 &&
            pageValue <= MAX_PAGE_NUMBER
                ? pageValue
                : 1,
    };
}

export type BanSourceValidationResult =
    | { success: true; data: BanSourceInput }
    | {
        success: false;
        message: string;
        fieldErrors: BanSourceFieldErrors;
    };

export function validateBanSourceInput(
    input: unknown,
): BanSourceValidationResult {
    if (typeof input !== 'object' || input === null) {
        return {
            success: false,
            message: 'Review the ban details and try again.',
            fieldErrors: {
                duration: 'Choose a valid ban duration.',
                reason: 'Provide a reason for this ban.',
            },
        };
    }

    const candidate = input as Record<string, unknown>;
    const messageId = typeof candidate.messageId === 'string'
        ? candidate.messageId
        : '';
    const duration = typeof candidate.duration === 'string'
        ? candidate.duration
        : '';
    const reason = typeof candidate.reason === 'string'
        ? candidate.reason.replace(/\r\n?/g, '\n').trim()
        : '';
    const fieldErrors: BanSourceFieldErrors = {};

    if (!isMessageId(messageId)) {
        return {
            success: false,
            message: 'Unable to identify this message.',
            fieldErrors,
        };
    }

    if (!isBanDuration(duration)) {
        fieldErrors.duration = 'Choose a valid ban duration.';
    }

    if (!reason) {
        fieldErrors.reason = 'Provide a reason for this ban.';
    } else if (reason.length < BAN_REASON_MIN_LENGTH) {
        fieldErrors.reason = `Use at least ${BAN_REASON_MIN_LENGTH} characters.`;
    } else if (reason.length > BAN_REASON_MAX_LENGTH) {
        fieldErrors.reason = `Use no more than ${BAN_REASON_MAX_LENGTH} characters.`;
    } else if (INVALID_REASON_CONTROL_PATTERN.test(reason)) {
        fieldErrors.reason = 'Use plain text without control characters.';
    }

    if (Object.keys(fieldErrors).length > 0 || !isBanDuration(duration)) {
        return {
            success: false,
            message: 'Review the highlighted fields.',
            fieldErrors,
        };
    }

    return {
        success: true,
        data: {
            messageId,
            duration,
            reason,
        },
    };
}
