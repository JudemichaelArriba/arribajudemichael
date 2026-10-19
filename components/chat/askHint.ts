// When the navbar's "Chat with Nero" tooltip may appear. Pure browser-storage flags, no personal
// data: it shows on hover, then rests for a cool-down, and comes back after it until the visitor
// has opened the chat once; after that it never shows again in this browser. Storage can be
// blocked (private mode, disabled site data), so every access is guarded; without storage the
// hint still respects the cool-down for the current page.

const HINT_LAST_SHOWN_KEY = 'ask-hint-last-shown';
const CHAT_USED_KEY = 'ask-chat-used';

/** How long the hint stays away after being shown, while the chat has not been used yet. */
export const ASK_HINT_COOLDOWN_MS = 20 * 60 * 1000;

function read(key: string): string | null {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function write(key: string, value: string): void {
    try {
        window.localStorage.setItem(key, value);
    } catch {
        // Storage unavailable: the in-memory flag below still limits the hint to once per page.
    }
}

// In-memory mirrors of the stored values, so the rules hold even when storage is blocked.
let lastShownThisPage = 0;
let chatUsedThisPage = false;

function storedTimestamp(now: number): number {
    const value = Number(read(HINT_LAST_SHOWN_KEY));
    // Missing, malformed or future timestamps (clock changes) count as "not shown recently".
    return Number.isFinite(value) && value > 0 && value <= now ? value : 0;
}

export function shouldShowAskHint(now: number = Date.now()): boolean {
    if (chatUsedThisPage || read(CHAT_USED_KEY) === '1') return false;

    const lastShown = Math.max(lastShownThisPage, storedTimestamp(now));
    return lastShown === 0 || now - lastShown >= ASK_HINT_COOLDOWN_MS;
}

export function markAskHintSeen(now: number = Date.now()): void {
    lastShownThisPage = now;
    write(HINT_LAST_SHOWN_KEY, String(now));
}

export function markChatUsed(): void {
    chatUsedThisPage = true;
    write(CHAT_USED_KEY, '1');
}

/** Test-only: forget the in-memory state, as a fresh page load would. */
export function resetAskHintForTests(): void {
    lastShownThisPage = 0;
    chatUsedThisPage = false;
}
