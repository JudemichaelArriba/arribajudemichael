const MESSAGE_TIME_ZONE = 'Asia/Manila';
const DAY_IN_MILLISECONDS = 86_400_000;
const SUMMARY_MAX_LENGTH = 72;

const CALENDAR_PARTS_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: MESSAGE_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
});

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: MESSAGE_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
});

const INBOX_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: MESSAGE_TIME_ZONE,
    month: 'short',
    day: 'numeric',
});

const INBOX_DATE_WITH_YEAR_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: MESSAGE_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

const DETAIL_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: MESSAGE_TIME_ZONE,
    dateStyle: 'long',
    timeStyle: 'short',
});

function getCalendarTimestamp(value: string): number {
    const parts = CALENDAR_PARTS_FORMATTER.formatToParts(new Date(value));
    const year = Number(parts.find((part) => part.type === 'year')?.value);
    const month = Number(parts.find((part) => part.type === 'month')?.value);
    const day = Number(parts.find((part) => part.type === 'day')?.value);

    return Date.UTC(year, month - 1, day);
}

function getCalendarYear(value: string): number {
    const year = CALENDAR_PARTS_FORMATTER
        .formatToParts(new Date(value))
        .find((part) => part.type === 'year')?.value;

    return Number(year);
}

export function deriveMessageSummary(message: string): string {
    const normalizedMessage = message.replace(/\s+/g, ' ').trim();
    const firstSentence = normalizedMessage.match(/^.*?[.!?](?:\s|$)/)?.[0].trim()
        ?? normalizedMessage;

    if (firstSentence.length <= SUMMARY_MAX_LENGTH) {
        return firstSentence;
    }

    return `${firstSentence.slice(0, SUMMARY_MAX_LENGTH - 3).trimEnd()}...`;
}

export function formatInboxTimestamp(
    receivedAt: string,
    referenceTime: string,
): string {
    const receivedDate = new Date(receivedAt);
    const receivedCalendarTime = getCalendarTimestamp(receivedAt);
    const referenceCalendarTime = getCalendarTimestamp(referenceTime);
    const dayDifference = Math.round(
        (referenceCalendarTime - receivedCalendarTime) / DAY_IN_MILLISECONDS,
    );

    if (dayDifference === 0) {
        return TIME_FORMATTER.format(receivedDate);
    }

    if (dayDifference === 1) {
        return 'Yesterday';
    }

    const receivedYear = getCalendarYear(receivedAt);
    const referenceYear = getCalendarYear(referenceTime);

    return receivedYear === referenceYear
        ? INBOX_DATE_FORMATTER.format(receivedDate)
        : INBOX_DATE_WITH_YEAR_FORMATTER.format(receivedDate);
}

export function formatMessageTimestamp(receivedAt: string): string {
    return DETAIL_DATE_FORMATTER.format(new Date(receivedAt));
}
