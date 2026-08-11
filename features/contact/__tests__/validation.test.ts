import {
  CONTACT_EMAIL_MAX_LENGTH,
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_NAME_MAX_LENGTH,
  validateContactFields,
} from '../validation';

describe('validateContactFields', () => {
  it('normalizes valid user input without altering internal message formatting', () => {
    expect(validateContactFields({
      email: '  USER@Example.COM ',
      message: '  First line\r\nSecond line  ',
      username: '  Jude Michael  ',
    })).toEqual({
      data: {
        message: 'First line\nSecond line',
        senderEmail: 'user@example.com',
        senderName: 'Jude Michael',
      },
      success: true,
    });
  });

  it('rejects whitespace and formatting-only content', () => {
    const result = validateContactFields({
      email: ' ',
      message: '\u200B',
      username: '\u200B',
    });

    expect(result).toEqual({
      fieldErrors: {
        email: 'Enter your email address.',
        message: 'Enter a message.',
        username: 'Enter your name.',
      },
      success: false,
    });
  });

  it('rejects malformed email addresses and control characters', () => {
    const result = validateContactFields({
      email: 'not-an-email',
      message: 'Hello\u0000world',
      username: 'Jude\nMichael',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors).toEqual({
        email: 'Enter a valid email address.',
        message: 'Message contains an unsupported character.',
        username: 'Name contains an unsupported character.',
      });
    }
  });

  it('enforces Unicode-aware field length limits', () => {
    const result = validateContactFields({
      email: `${'a'.repeat(CONTACT_EMAIL_MAX_LENGTH)}@example.com`,
      message: '🙂'.repeat(CONTACT_MESSAGE_MAX_LENGTH + 1),
      username: '🙂'.repeat(CONTACT_NAME_MAX_LENGTH + 1),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.email).toContain(String(CONTACT_EMAIL_MAX_LENGTH));
      expect(result.fieldErrors.message).toContain(String(CONTACT_MESSAGE_MAX_LENGTH));
      expect(result.fieldErrors.username).toContain(String(CONTACT_NAME_MAX_LENGTH));
    }
  });
});
