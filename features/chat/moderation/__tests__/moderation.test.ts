import { FAIL_OPEN_MAX_LENGTH, moderateInput, shouldFailOpen } from '..';
import { detectReplyLanguage, getModerationReply } from '../responses';

describe('detectReplyLanguage', () => {
  it.each([
    ['What projects has he built?', 'en'],
    ['Ano ang mga proyekto niya?', 'tl'],
    ['Pwede ko ba makita yung mga projects niya?', 'tl'],
    ['Unsa iyang mga proyekto?', 'ceb'],
    ['Asa siya nagtrabaho karon?', 'ceb'],
  ])('%s -> %s', (message, language) => {
    expect(detectReplyLanguage(message)).toBe(language);
  });
});

describe('moderateInput', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows a message the classifier marks safe', async () => {
    const classify = jest.fn().mockResolvedValue({ category: 'safe', language: 'en' });

    await expect(moderateInput(['What does Jude build?'], classify)).resolves.toEqual({ allowed: true });
    expect(classify).toHaveBeenCalledWith('What does Jude build?');
  });

  it('blocks blocklisted text in any user turn without calling the classifier', async () => {
    const classify = jest.fn();

    const decision = await moderateInput(['tangina mo', 'What does Jude build?'], classify);

    expect(decision).toEqual({
      allowed: false,
      kind: 'respect',
      reply: getModerationReply('respect', 'en'),
    });
    expect(classify).not.toHaveBeenCalled();
  });

  it('answers a blocked message in the language it was written in, without echoing it', async () => {
    const decision = await moderateInput(['gago ka, ano ba mga proyekto niya, tangina'], jest.fn());

    expect(decision).toMatchObject({ allowed: false, kind: 'respect' });
    if (!decision.allowed) {
      expect(decision.reply).toBe(getModerationReply('respect', 'tl'));
      expect(decision.reply).not.toMatch(/tangina|gago/i);
    }
  });

  it('routes crisis messages to the supportive reply, even before the classifier', async () => {
    const classify = jest.fn();

    const decision = await moderateInput(['I want to kill myself'], classify);

    expect(decision).toMatchObject({ allowed: false, kind: 'crisis' });
    expect(classify).not.toHaveBeenCalled();
    if (!decision.allowed) {
      expect(decision.reply).not.toMatch(/\d{3}/);
    }
  });

  it.each([
    ['abusive', 'respect'],
    ['sexual', 'respect'],
    ['threat', 'respect'],
    ['self_harm', 'crisis'],
  ] as const)('maps the %s category to the %s reply in the detected language', async (category, kind) => {
    const classify = jest.fn().mockResolvedValue({ category, language: 'ceb' });

    await expect(moderateInput(['something subtle'], classify)).resolves.toEqual({
      allowed: false,
      kind,
      reply: getModerationReply(kind, 'ceb'),
    });
  });

  it('fails open for a short, clean question when the classifier is down', async () => {
    const classify = jest.fn().mockRejectedValue(new Error('down'));

    await expect(moderateInput(["What's his stack?"], classify)).resolves.toEqual({ allowed: true });
  });

  it('fails closed for long, suspicious or link-carrying messages when the classifier is down', async () => {
    const classify = jest.fn().mockRejectedValue(new Error('down'));

    for (const message of [
      'a'.repeat(FAIL_OPEN_MAX_LENGTH + 1),
      'gago ka ba',
      'check https://evil.example/now',
      'run <script>alert(1)</script>',
    ]) {
      await expect(moderateInput([message], classify)).resolves.toMatchObject({
        allowed: false,
        kind: 'unavailable',
      });
    }
  });
});

describe('shouldFailOpen', () => {
  it('only accepts short plain messages', () => {
    expect(shouldFailOpen('Where did he study?')).toBe(true);
    expect(shouldFailOpen('see www.example.com')).toBe(false);
    expect(shouldFailOpen('x'.repeat(FAIL_OPEN_MAX_LENGTH + 1))).toBe(false);
  });
});
