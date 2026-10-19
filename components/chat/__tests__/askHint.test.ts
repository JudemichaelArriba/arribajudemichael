import {
  ASK_HINT_COOLDOWN_MS,
  markAskHintSeen,
  markChatUsed,
  resetAskHintForTests,
  shouldShowAskHint,
} from '../askHint';

const NOW = 1_800_000_000_000;

describe('ask hint frequency', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetAskHintForTests();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows on the first hover, then rests during the cool-down', () => {
    expect(shouldShowAskHint(NOW)).toBe(true);
    markAskHintSeen(NOW);
    expect(shouldShowAskHint(NOW)).toBe(false);

    // A later page load within the cool-down.
    resetAskHintForTests();
    expect(shouldShowAskHint(NOW + ASK_HINT_COOLDOWN_MS - 1)).toBe(false);
  });

  it('comes back after the cool-down while the chat has never been opened', () => {
    markAskHintSeen(NOW);
    resetAskHintForTests();

    expect(shouldShowAskHint(NOW + ASK_HINT_COOLDOWN_MS)).toBe(true);
  });

  it('also comes back on the same page when the visitor stays past the cool-down', () => {
    markAskHintSeen(NOW);

    expect(shouldShowAskHint(NOW + ASK_HINT_COOLDOWN_MS - 1)).toBe(false);
    expect(shouldShowAskHint(NOW + ASK_HINT_COOLDOWN_MS)).toBe(true);
  });

  it('never shows again once the chat has been used', () => {
    markChatUsed();
    resetAskHintForTests();

    expect(shouldShowAskHint(NOW + 10 * ASK_HINT_COOLDOWN_MS)).toBe(false);
  });

  it('treats malformed or future timestamps as not shown recently', () => {
    window.localStorage.setItem('ask-hint-last-shown', 'not-a-number');
    expect(shouldShowAskHint(NOW)).toBe(true);

    window.localStorage.setItem('ask-hint-last-shown', String(NOW + 60_000));
    expect(shouldShowAskHint(NOW)).toBe(true);
  });

  it('stays safe and keeps the cool-down when storage is blocked', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(shouldShowAskHint(NOW)).toBe(true);
    expect(() => markAskHintSeen(NOW)).not.toThrow();
    expect(shouldShowAskHint(NOW)).toBe(false);
  });
});
