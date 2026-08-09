export interface AdminMessage {
    readonly id: string;
    readonly senderName: string;
    readonly senderEmail: string;
    readonly message: string;
    readonly receivedAt: string;
    readonly isRead: boolean;
    readonly isStarred: boolean;
}

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

export const MOCK_MESSAGES = [
    {
        id: 'msg-maya-santos',
        senderName: 'Maya Santos',
        senderEmail: 'maya.santos@example.com',
        message: `I am planning a redesign for a growing logistics company and your portfolio stood out to our team.

The project includes a customer booking portal, an internal operations dashboard, and a small API layer that will connect to our existing dispatch system. We are especially concerned about predictable performance as order volume grows and want the frontend to remain straightforward for staff using older office hardware.

Would you be available for an initial technical discussion next week? I can share the current workflows, expected delivery window, and the constraints from our operations team.`,
        receivedAt: '2026-08-10T22:42:00+08:00',
        isRead: false,
        isStarred: true,
    },
    {
        id: 'msg-ethan-brooks',
        senderName: 'Ethan Brooks',
        senderEmail: 'ethan.brooks@example.com',
        message: `Our product team is looking for a backend engineer to review an API architecture before we begin implementation.

The main questions involve authentication boundaries, background jobs, and a reporting workload that may grow quickly. Your experience with maintainable service design looks relevant, so I wanted to ask whether you offer short technical consultations.`,
        receivedAt: '2026-08-10T16:18:00+08:00',
        isRead: true,
        isStarred: false,
    },
    {
        id: 'msg-priya-nair',
        senderName: 'Priya Nair',
        senderEmail: 'priya.nair@example.com',
        message: `I would like to discuss a full-stack engineering role on a team building internal financial tools.

The role focuses on TypeScript, PostgreSQL, reliable API integrations, and improving a mobile workflow used by field teams. Please let me know if you are open to a brief introduction call and I will send the complete role details.`,
        receivedAt: '2026-08-10T09:05:00+08:00',
        isRead: false,
        isStarred: false,
    },
    {
        id: 'msg-lucas-chen',
        senderName: 'Lucas Chen',
        senderEmail: 'lucas.chen@example.com',
        message: `I am organizing a small open-source collaboration around developer tooling for Supabase projects.

We are preparing the first public milestone and need help refining the Next.js dashboard, typed query boundaries, and documentation examples. Your work seems aligned with the engineering direction, and I would be glad to share the repository outline.`,
        receivedAt: '2026-08-09T18:30:00+08:00',
        isRead: true,
        isStarred: true,
    },
    {
        id: 'msg-sofia-alvarez',
        senderName: 'Sofia Alvarez',
        senderEmail: 'sofia.alvarez@example.com',
        message: `Our capstone group is researching resilient mobile data synchronization for intermittent network conditions.

We saw your emphasis on backend reliability and polished mobile experiences. Would you be willing to answer a few architecture questions or point us toward practical resources that helped you approach similar systems?`,
        receivedAt: '2026-08-09T11:24:00+08:00',
        isRead: true,
        isStarred: false,
    },
    {
        id: 'msg-amina-bello',
        senderName: 'Amina Bello',
        senderEmail: 'amina.bello@example.com',
        message: `We need help diagnosing slow page transitions and inconsistent API response times in an existing customer platform.

The application is already in production, so the engagement would begin with measurement and a prioritized performance review rather than a broad rewrite. I can provide sanitized traces and the current deployment architecture if this is within your scope.`,
        receivedAt: '2026-08-08T14:10:00+08:00',
        isRead: false,
        isStarred: false,
    },
    {
        id: 'msg-noah-williams',
        senderName: 'Noah Williams',
        senderEmail: 'noah.williams@example.com',
        message: `I am looking for a developer to help finish a cross-platform field inspection application.

The remaining work includes offline form handling, image uploads, and an admin review workflow. The current prototype uses Flutter and a PostgreSQL backend, and I would like to understand how you would approach stabilizing it for a pilot release.`,
        receivedAt: '2026-08-06T10:32:00+08:00',
        isRead: true,
        isStarred: false,
    },
    {
        id: 'msg-daniel-kim',
        senderName: 'Daniel Kim',
        senderEmail: 'daniel.kim@example.com',
        message: `I have a technical question about structuring server and client boundaries in a large Next.js application.

Your portfolio handles interactive sections without making the entire page client-rendered. I would appreciate any general guidance on keeping those boundaries maintainable as the application grows.`,
        receivedAt: '2026-08-03T08:45:00+08:00',
        isRead: true,
        isStarred: false,
    },
] as const satisfies readonly AdminMessage[];
