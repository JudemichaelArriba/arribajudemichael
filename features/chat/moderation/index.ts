import { describeModelError } from '../fallback';
import {
    containsBlockedTerm,
    containsCrisisSignal,
    containsSoftTerm,
} from './blocklist';
import {
    detectReplyLanguage,
    getModerationReply,
    type ModerationReplyKind,
    type ReplyLanguage,
} from './responses';

export interface ModerationClassification {
    category: 'safe' | 'abusive' | 'sexual' | 'threat' | 'self_harm';
    language: 'en' | 'tl' | 'ceb' | 'other';
}

export type ModerationClassifier = (message: string) => Promise<ModerationClassification>;

export type ModerationDecision =
    | { allowed: true }
    | { allowed: false; kind: ModerationReplyKind; reply: string };

/** Short, plain questions may pass when the classifier is down; see `shouldFailOpen`. */
export const FAIL_OPEN_MAX_LENGTH = 120;

const URL_OR_CODE_PATTERN = /https?:\/\/|www\.|[<>{}`\\]|\b[\w-]+\.(?:com|net|org|io|ph|xyz|ru)\b/i;

function block(kind: ModerationReplyKind, language: ReplyLanguage): ModerationDecision {
    return { allowed: false, kind, reply: getModerationReply(kind, language) };
}

function toReplyLanguage(
    language: ModerationClassification['language'],
    message: string,
): ReplyLanguage {
    return language === 'other' ? detectReplyLanguage(message) : language;
}

/**
 * Failing open is limited to the messages that dominate real traffic — short questions with no
 * suspicious words, links or code — because the main model's instructions still keep it on topic.
 * Anything else fails closed while the classifier is unavailable.
 */
export function shouldFailOpen(message: string): boolean {
    return (
        message.length <= FAIL_OPEN_MAX_LENGTH &&
        !containsSoftTerm(message) &&
        !URL_OR_CODE_PATTERN.test(message)
    );
}

/**
 * Keyword pass over every user turn (the client controls the history), then one classifier call
 * on the newest message only.
 */
export async function moderateInput(
    userMessages: readonly string[],
    classify: ModerationClassifier,
): Promise<ModerationDecision> {
    const latest = userMessages.at(-1) ?? '';
    const fallbackLanguage = detectReplyLanguage(latest);

    if (containsCrisisSignal(latest)) {
        return block('crisis', fallbackLanguage);
    }

    if (userMessages.some(containsBlockedTerm)) {
        return block('respect', fallbackLanguage);
    }

    let classification: ModerationClassification;

    try {
        classification = await classify(latest);
    } catch (error) {
        console.warn('[chat/moderation] Classifier is unavailable.', describeModelError(error));
        return shouldFailOpen(latest) ? { allowed: true } : block('unavailable', fallbackLanguage);
    }

    const language = toReplyLanguage(classification.language, latest);

    switch (classification.category) {
        case 'safe':
            return { allowed: true };
        case 'self_harm':
            return block('crisis', language);
        default:
            return block('respect', language);
    }
}
