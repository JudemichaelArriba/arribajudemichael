import { CONTACT_CHANNELS, SITE_NAVIGATION, type SiteSectionId } from '@/lib/site';

// Pure helpers shared by the Ask overlay. No AI SDK imports, so they are cheap to test.

export const MAX_SENT_MESSAGES = 10;
export const MAX_QUESTION_LENGTH = 1_000;
const MAX_ANSWER_LENGTH = 4_000;

/** The subset of a UI message part this file needs. */
export interface ChatPartLike {
    type: string;
    text?: string;
    data?: unknown;
}

export interface ChatMessageLike {
    id: string;
    role: 'system' | 'user' | 'assistant';
    parts: readonly ChatPartLike[];
}

export interface WireMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface ChatTurn {
    id: string;
    question: string;
    answer: string;
    sections: SiteSectionId[];
    /** False while the answer is still being written or after it failed to arrive. */
    hasAnswer: boolean;
}

export function getMessageText(message: ChatMessageLike): string {
    return message.parts
        .filter((part) => part.type === 'text' && typeof part.text === 'string')
        .map((part) => part.text)
        .join('')
        .trim();
}

/** Answers render as plain text; drop stray markdown emphasis markers the model may still emit. */
export function stripMarkdownEmphasis(text: string): string {
    return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1');
}

/**
 * The request body the server's strict schema accepts: the last ten text-only turns. Tool
 * results and other parts never travel back to the server.
 */
export function toWireMessages(messages: readonly ChatMessageLike[]): WireMessage[] {
    const wire: WireMessage[] = [];

    for (const message of messages) {
        if (message.role === 'system') continue;
        const text = getMessageText(message);
        if (!text) continue;
        wire.push({
            role: message.role,
            content: text.slice(0, message.role === 'user' ? MAX_QUESTION_LENGTH : MAX_ANSWER_LENGTH),
        });
    }

    const recent = wire.slice(-MAX_SENT_MESSAGES);
    while (recent.length > 0 && recent[recent.length - 1].role !== 'user') recent.pop();
    return recent;
}

const SECTION_IDS = new Set<string>(SITE_NAVIGATION.map((item) => item.id));

function isSectionId(value: unknown): value is SiteSectionId {
    return typeof value === 'string' && SECTION_IDS.has(value);
}

/** Sections the server matched in the answer (a `data-sections` part); unknown values are ignored. */
function getAnswerSections(message: ChatMessageLike): SiteSectionId[] {
    const sections = message.parts.flatMap((part) =>
        part.type === 'data-sections' && Array.isArray(part.data) ? part.data.filter(isSectionId) : [],
    );
    return [...new Set(sections)];
}

export function getSectionLabel(id: SiteSectionId): string {
    return SITE_NAVIGATION.find((item) => item.id === id)?.label ?? id;
}

/** Pairs each question with the answer that followed it, plus the sections that answer covered. */
export function toTurns(messages: readonly ChatMessageLike[]): ChatTurn[] {
    const turns: ChatTurn[] = [];

    for (const message of messages) {
        if (message.role === 'user') {
            turns.push({ id: message.id, question: getMessageText(message), answer: '', sections: [], hasAnswer: false });
            continue;
        }

        const turn = turns.at(-1);
        if (message.role !== 'assistant' || !turn) continue;

        turn.answer = stripMarkdownEmphasis(getMessageText(message));
        turn.hasAnswer = turn.answer.length > 0;
        turn.sections = getAnswerSections(message);
    }

    return turns;
}

export type AnswerSegment = { kind: 'text'; text: string } | { kind: 'link'; text: string; href: string };

const LINKABLE_HOSTS = new Set(['github.com', 'www.github.com', 'linkedin.com', 'www.linkedin.com']);
const PUBLIC_EMAILS = new Set(
    CONTACT_CHANNELS.filter((channel) => channel.href.startsWith('mailto:')).map((channel) =>
        channel.href.slice('mailto:'.length).toLowerCase(),
    ),
);
const LINK_CANDIDATE = /https?:\/\/[^\s<>()"']+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

function toSafeHref(candidate: string): string | null {
    if (candidate.includes('@') && !candidate.startsWith('http')) {
        return PUBLIC_EMAILS.has(candidate.toLowerCase()) ? `mailto:${candidate}` : null;
    }

    try {
        const url = new URL(candidate);
        return url.protocol === 'https:' && LINKABLE_HOSTS.has(url.hostname) ? url.toString() : null;
    } catch {
        return null;
    }
}

/**
 * Splits an answer into plain text and links. Only https links to GitHub/LinkedIn and Jude's
 * public email become clickable; everything else stays inert text. Nothing is ever parsed as HTML.
 */
export function toAnswerSegments(answer: string): AnswerSegment[] {
    const segments: AnswerSegment[] = [];
    let cursor = 0;

    for (const match of answer.matchAll(LINK_CANDIDATE)) {
        const raw = match[0].replace(/[.,;:!?]+$/, '');
        const start = match.index ?? 0;
        const href = toSafeHref(raw);
        if (!href) continue;

        if (start > cursor) segments.push({ kind: 'text', text: answer.slice(cursor, start) });
        segments.push({ kind: 'link', text: raw, href });
        cursor = start + raw.length;
    }

    if (cursor < answer.length) segments.push({ kind: 'text', text: answer.slice(cursor) });
    return segments;
}
