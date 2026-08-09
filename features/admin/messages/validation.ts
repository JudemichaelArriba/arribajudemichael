import type {
    AdminMessageQuery,
    MessageFilter,
    MessageSecurityStatus,
} from './types';

export const ADMIN_MESSAGES_PAGE_SIZE = 50;
export const MESSAGE_SEARCH_MAX_LENGTH = 100;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MESSAGE_FILTERS = new Set<MessageFilter>([
    'inbox',
    'unread',
    'starred',
    'archived',
]);
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/g;
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
