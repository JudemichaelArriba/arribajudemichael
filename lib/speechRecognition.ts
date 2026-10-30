/**
 * The Web Speech API's recognition interface. TypeScript's DOM lib ships the result types
 * (SpeechRecognitionResultList and friends) but not the recognizer or its events, so the pieces
 * we use are declared here as module types rather than as a global augmentation.
 */

export type SpeechRecognitionErrorCode =
    | 'aborted'
    | 'audio-capture'
    | 'bad-grammar'
    | 'language-not-supported'
    | 'network'
    | 'no-speech'
    | 'not-allowed'
    | 'service-not-allowed';

export interface SpeechRecognitionEventLike extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionErrorEventLike extends Event {
    readonly error: SpeechRecognitionErrorCode;
    readonly message: string;
}

export interface SpeechRecognitionLike extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
    /** Fires once the microphone is open (permission granted, capture started). */
    onaudiostart: ((event: Event) => void) | null;
    /** Fires as soon as the service detects speech, well before any words are recognized. */
    onspeechstart: ((event: Event) => void) | null;
    onend: ((event: Event) => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechWindow extends Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    opr?: unknown;
}

interface BraveNavigator extends Navigator {
    brave?: { isBrave?: () => Promise<boolean> };
}

export function getSpeechRecognition(): SpeechRecognitionConstructor | null {
    if (typeof window === 'undefined') return null;
    const speechWindow = window as SpeechWindow;
    return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function isOpera(): boolean {
    return (window as SpeechWindow).opr !== undefined || /\bOPR\//.test(navigator.userAgent);
}

async function isBrave(): Promise<boolean> {
    const brave = (navigator as BraveNavigator).brave;
    if (!brave) return false;
    try {
        return (await brave.isBrave?.()) ?? true;
    } catch {
        // navigator.brave only exists in Brave; a failing check still means Brave.
        return true;
    }
}

/**
 * Whether dictation can work here. Brave and Opera expose the API but have no speech service
 * behind it (every attempt fails with "network"), so they are ruled out up front.
 */
export async function detectSpeechSupport(): Promise<boolean> {
    if (!getSpeechRecognition() || isOpera()) return false;
    return !(await isBrave());
}

/** Errors that mean this browser has no usable speech service, so voice input should go away. */
export function isUnavailableError(code: SpeechRecognitionErrorCode): boolean {
    return code === 'network' || code === 'service-not-allowed';
}
