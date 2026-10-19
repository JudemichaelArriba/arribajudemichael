// Pure, dependency-free first pass of the chat moderation. It only catches the obvious cases —
// slurs, explicit profanity and sexual terms in English, Tagalog/Filipino and Bisaya/Cebuano —
// after undoing common obfuscation. Anything subtler is left to the classifier.
//
// Matching is done on letter boundaries against generated patterns, so ordinary words that merely
// contain a term (putahe, computer, gagamba, Scunthorpe) never match.

interface TermPattern {
    term: string;
    /** Allow inflections such as "-ing", "-er" or Filipino "-mo"/"-ka" after the term. */
    suffixes?: boolean;
}

// Blocked outright: no legitimate portfolio question needs these.
const HARD_TERMS: readonly TermPattern[] = [
    // English profanity, sexual terms and slurs
    { term: 'fuck', suffixes: true },
    { term: 'motherfucker', suffixes: true },
    { term: 'cunt', suffixes: true },
    { term: 'whore', suffixes: true },
    { term: 'slut', suffixes: true },
    { term: 'nigger', suffixes: true },
    { term: 'nigga', suffixes: true },
    { term: 'faggot', suffixes: true },
    { term: 'fag', suffixes: true },
    { term: 'retard', suffixes: true },
    { term: 'tranny', suffixes: true },
    { term: 'chink', suffixes: true },
    { term: 'kike', suffixes: true },
    { term: 'blowjob', suffixes: true },
    { term: 'porn', suffixes: true },
    { term: 'nudes' },
    // Tagalog / Filipino
    { term: 'tangina', suffixes: true },
    { term: 'tang ina', suffixes: true },
    { term: 'putangina', suffixes: true },
    { term: 'putang ina', suffixes: true },
    { term: 'puta' },
    { term: 'pakyu', suffixes: true },
    { term: 'punyeta', suffixes: true },
    { term: 'kantot', suffixes: true },
    { term: 'kantutan' },
    { term: 'iyot', suffixes: true },
    { term: 'jakol', suffixes: true },
    { term: 'burat', suffixes: true },
    { term: 'burikat', suffixes: true },
    { term: 'tamod' },
    // Bisaya / Cebuano
    { term: 'bilat', suffixes: true },
    { term: 'buring' },
    { term: 'oten' },
];

// Ambiguous: insults that are also used jokingly or self-deprecatingly ("bobo ako sa math"),
// names, or literal words. They never block on their own; they only make the moderation fail
// closed if the classifier is unavailable.
const SOFT_TERMS: readonly TermPattern[] = [
    { term: 'shit', suffixes: true },
    { term: 'bitch', suffixes: true },
    { term: 'dick', suffixes: true },
    { term: 'pussy' },
    { term: 'cock', suffixes: true },
    { term: 'sex', suffixes: true },
    { term: 'nude', suffixes: true },
    { term: 'naked' },
    { term: 'kill', suffixes: true },
    { term: 'bomb', suffixes: true },
    { term: 'gago', suffixes: true },
    { term: 'gaga' },
    { term: 'ulol' },
    { term: 'olol' },
    { term: 'bobo' },
    { term: 'tanga' },
    { term: 'tarantado', suffixes: true },
    { term: 'leche' },
    { term: 'hayop ka' },
    { term: 'hinayupak' },
    { term: 'titi' },
    { term: 'puke' },
    { term: 'puki' },
    { term: 'pepe' },
    { term: 'yawa' },
    { term: 'animal ka' },
    { term: 'pisti' },
    { term: 'piste' },
    { term: 'giatay' },
    { term: 'buang' },
    { term: 'bayot' },
    { term: 'patay', suffixes: true },
];

// Signals of self-harm or crisis. These route to the supportive reply rather than a block.
const CRISIS_PHRASES: readonly string[] = [
    'kill myself',
    'killing myself',
    'suicide',
    'suicidal',
    'end my life',
    'end it all',
    'ending it all',
    'want to die',
    'wanna die',
    'self harm',
    'selfharm',
    'hurt myself',
    'cut myself',
    'no reason to live',
    'magpakamatay',
    'magpapakamatay',
    'gusto ko na mamatay',
    'gusto ko nang mamatay',
    'ayoko na mabuhay',
    'ayoko nang mabuhay',
    'papatayin ko sarili ko',
    'saktan ang sarili',
    'maghikog',
    'mohikog',
    'gusto na ko mamatay',
    'kapoy na ko mabuhi',
    'dili na ko gusto mabuhi',
];

const INFLECTION_SUFFIXES = '(?:s|es|ed|er|ers|ing|in|mo|nyo|niyo|ka|ko)?';

const LEET_MAP: Readonly<Record<string, string>> = {
    '@': 'a',
    '4': 'a',
    '3': 'e',
    '0': 'o',
    '5': 's',
    $: 's',
    '7': 't',
};

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// "fuck" -> f+u+c+k+ (any letter may be stretched); "ass"-style doubles keep their minimum length;
// spaces inside a multi-word term may be absent or repeated.
function termToSource(term: string): string {
    let source = '';
    for (const word of term.split(' ')) {
        if (source) source += '\\s*';
        const runs = word.match(/(.)\1*/g) ?? [];
        source += runs.map((run) => `${escapeRegExp(run[0])}{${run.length},}`).join('');
    }
    return source;
}

function compile(terms: readonly TermPattern[]): RegExp {
    const alternatives = terms.map(
        ({ term, suffixes }) => `${termToSource(term)}${suffixes ? INFLECTION_SUFFIXES : ''}`,
    );
    return new RegExp(`(?<![a-z])(?:${alternatives.join('|')})(?![a-z])`);
}

const HARD_PATTERN = compile(HARD_TERMS);
const SOFT_PATTERN = compile(SOFT_TERMS);

/**
 * Undoes common obfuscation. Returns two variants because "1" and "!" stand in for both "i"
 * (t4ng1n4) and "l" (u1o1).
 */
export function normalizeForModeration(text: string): string[] {
    const base = text
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[​-‏⁠﻿]/g, '')
        .toLowerCase()
        .replace(/[@4305$7]/g, (character) => LEET_MAP[character] ?? character);

    return ['i', 'l'].map((one) =>
        base
            .replace(/[1!|]/g, one)
            // Rejoin letters spelled out with separators: "p.u.t.a", "f u c k", "t-a-n-g-a".
            .replace(/(?<![a-z])[a-z](?:[\s.\-_*]+[a-z])+(?![a-z])/g, (match) =>
                /^[a-z](?:[\s.\-_*]+[a-z]){2,}$/.test(match) ? match.replace(/[\s.\-_*]+/g, '') : match,
            )
            .replace(/[^a-z\s]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim(),
    );
}

function matchesAnyVariant(text: string, pattern: RegExp): boolean {
    return normalizeForModeration(text).some((variant) => pattern.test(variant));
}

export function containsBlockedTerm(text: string): boolean {
    return matchesAnyVariant(text, HARD_PATTERN);
}

export function containsSoftTerm(text: string): boolean {
    return matchesAnyVariant(text, SOFT_PATTERN);
}

export function containsCrisisSignal(text: string): boolean {
    return normalizeForModeration(text).some((variant) =>
        CRISIS_PHRASES.some((phrase) => variant.includes(phrase)),
    );
}
