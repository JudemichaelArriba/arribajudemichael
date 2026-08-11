/** @jest-environment node */

import { insertContactMessage } from '@/features/contact/messages';
import { validateContactFields } from '@/features/contact/validation';
import { checkContactSourceBan } from '@/lib/security/contactBan';
import { checkContactRateLimit } from '@/lib/security/contactRateLimit';
import { getContactSourceIdentifier } from '@/lib/security/contactSource';
import { verifyTurnstileToken } from '@/lib/security/turnstile';
import { POST } from '../route';

jest.mock('@/features/contact/messages', () => ({ insertContactMessage: jest.fn() }));
jest.mock('@/features/contact/validation', () => ({ validateContactFields: jest.fn() }));
jest.mock('@/lib/security/contactBan', () => ({ checkContactSourceBan: jest.fn() }));
jest.mock('@/lib/security/contactRateLimit', () => ({ checkContactRateLimit: jest.fn() }));
jest.mock('@/lib/security/contactSource', () => ({ getContactSourceIdentifier: jest.fn() }));
jest.mock('@/lib/security/turnstile', () => ({ verifyTurnstileToken: jest.fn() }));

const sourceMock = jest.mocked(getContactSourceIdentifier);
const rateLimitMock = jest.mocked(checkContactRateLimit);
const banMock = jest.mocked(checkContactSourceBan);
const turnstileMock = jest.mocked(verifyTurnstileToken);
const validationMock = jest.mocked(validateContactFields);
const insertMock = jest.mocked(insertContactMessage);

function validForm(): FormData {
  const formData = new FormData();
  formData.set('username', ' Jude ');
  formData.set('email', ' JUDE@example.com ');
  formData.set('message', ' Hello ');
  formData.set('cf-turnstile-response', ' turnstile-token ');
  return formData;
}

function requestWith(formData: FormData, headers: Record<string, string> = {}): Request {
  return {
    formData: async () => formData,
    headers: new Headers({
      'content-type': 'application/x-www-form-urlencoded',
      ...headers,
    }),
  } as Request;
}

async function body(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe('POST /api/contact', () => {
  beforeEach(() => {
    sourceMock.mockReturnValue({ identifier: 'a'.repeat(64), ok: true });
    rateLimitMock.mockResolvedValue({ allowed: true });
    banMock.mockResolvedValue({ banned: false, checked: true });
    turnstileMock.mockResolvedValue({ verified: true });
    validationMock.mockReturnValue({
      data: { message: 'Hello', senderEmail: 'jude@example.com', senderName: 'Jude' },
      success: true,
    });
    insertMock.mockResolvedValue({ inserted: true });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects oversized requests before parsing form data', async () => {
    const request = requestWith(validForm(), { 'content-length': String(32 * 1024 + 1) });
    const formDataSpy = jest.spyOn(request, 'formData');

    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(formDataSpy).not.toHaveBeenCalled();
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('requires an accepted form content type', async () => {
    const response = await POST(requestWith(validForm(), { 'content-type': 'application/json' }));

    expect(response.status).toBe(400);
    expect(sourceMock).not.toHaveBeenCalled();
  });

  it('rejects duplicate fields and missing security tokens', async () => {
    const duplicated = validForm();
    duplicated.append('email', 'other@example.com');
    expect((await POST(requestWith(duplicated))).status).toBe(400);

    const missingToken = validForm();
    missingToken.delete('cf-turnstile-response');
    expect((await POST(requestWith(missingToken))).status).toBe(403);
    expect(sourceMock).not.toHaveBeenCalled();
  });

  it('fails closed when source identification or rate limiting is unavailable', async () => {
    sourceMock.mockReturnValueOnce({ ok: false, reason: 'configuration' });
    expect((await POST(requestWith(validForm()))).status).toBe(503);

    rateLimitMock.mockResolvedValueOnce({ allowed: false, reason: 'service' });
    expect((await POST(requestWith(validForm()))).status).toBe(503);
    expect(turnstileMock).not.toHaveBeenCalled();
  });

  it('returns Retry-After when the source is rate limited', async () => {
    rateLimitMock.mockResolvedValue({ allowed: false, reason: 'limited', retryAfterSeconds: 91 });

    const response = await POST(requestWith(validForm()));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('91');
    expect(banMock).not.toHaveBeenCalled();
  });

  it('rejects banned sources before consuming the Turnstile token', async () => {
    banMock.mockResolvedValue({ banned: true, checked: true });

    const response = await POST(requestWith(validForm()));

    expect(response.status).toBe(403);
    expect(turnstileMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it.each([
    [{ reason: 'invalid', verified: false } as const, 403],
    [{ reason: 'service', verified: false } as const, 500],
  ])('maps Turnstile failures without inserting a message', async (verification, status) => {
    turnstileMock.mockResolvedValue(verification);

    const response = await POST(requestWith(validForm()));

    expect(response.status).toBe(status);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('returns field errors from normalized contact validation', async () => {
    validationMock.mockReturnValue({
      fieldErrors: { email: 'Enter a valid email address.' },
      success: false,
    });

    const response = await POST(requestWith(validForm()));

    expect(response.status).toBe(400);
    expect(await body(response)).toMatchObject({
      fieldErrors: { email: 'Enter a valid email address.' },
      ok: false,
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('stores only validated fields with the server-derived source identifier', async () => {
    const response = await POST(requestWith(validForm()));

    expect(response.status).toBe(200);
    expect(await body(response)).toEqual({ ok: true, message: 'Message sent successfully.' });
    expect(turnstileMock).toHaveBeenCalledWith({
      expectedAction: 'contact',
      token: 'turnstile-token',
    });
    expect(insertMock).toHaveBeenCalledWith(
      { message: 'Hello', senderEmail: 'jude@example.com', senderName: 'Jude' },
      'a'.repeat(64),
    );
  });

  it('returns a safe service error when message persistence fails', async () => {
    insertMock.mockResolvedValue({ inserted: false });

    const response = await POST(requestWith(validForm()));

    expect(response.status).toBe(500);
    expect(await body(response)).toEqual({
      message: 'Unable to send your message right now. Please try again later.',
      ok: false,
    });
  });
});
