import 'server-only';

export const CONTACT_NAME_MAX_LENGTH = 80;
export const CONTACT_EMAIL_MAX_LENGTH = 254;
export const CONTACT_MESSAGE_MAX_LENGTH = 2_000;

export interface RawContactFields {
    username: string;
    email: string;
    message: string;
}

export interface ValidatedContactFields {
    senderName: string;
    senderEmail: string;
    message: string;
}

export interface ContactFieldErrors {
    username?: string;
    email?: string;
    message?: string;
}

export type ContactValidationResult =
    | { success: true; data: ValidatedContactFields }
    | { success: false; fieldErrors: ContactFieldErrors };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;
const MEANINGFUL_CHARACTER_PATTERN = /[^\s\p{Cf}]/u;

function countCharacters(value: string): number {
    return Array.from(value).length;
}

function hasMeaningfulContent(value: string): boolean {
    return MEANINGFUL_CHARACTER_PATTERN.test(value);
}

export function validateContactFields(
    fields: RawContactFields,
): ContactValidationResult {
    const senderName = fields.username.trim();
    const senderEmail = fields.email.trim().toLowerCase();
    const message = fields.message.replace(/\r\n?/g, '\n').trim();
    const fieldErrors: ContactFieldErrors = {};

    if (!hasMeaningfulContent(senderName)) {
        fieldErrors.username = 'Enter your name.';
    } else if (countCharacters(senderName) > CONTACT_NAME_MAX_LENGTH) {
        fieldErrors.username = `Name must be ${CONTACT_NAME_MAX_LENGTH} characters or fewer.`;
    } else if (CONTROL_CHARACTER_PATTERN.test(senderName)) {
        fieldErrors.username = 'Name contains an unsupported character.';
    }

    if (!senderEmail) {
        fieldErrors.email = 'Enter your email address.';
    } else if (countCharacters(senderEmail) > CONTACT_EMAIL_MAX_LENGTH) {
        fieldErrors.email = `Email must be ${CONTACT_EMAIL_MAX_LENGTH} characters or fewer.`;
    } else if (
        CONTROL_CHARACTER_PATTERN.test(senderEmail) ||
        !EMAIL_PATTERN.test(senderEmail)
    ) {
        fieldErrors.email = 'Enter a valid email address.';
    }

    if (!hasMeaningfulContent(message)) {
        fieldErrors.message = 'Enter a message.';
    } else if (countCharacters(message) > CONTACT_MESSAGE_MAX_LENGTH) {
        fieldErrors.message = `Message must be ${CONTACT_MESSAGE_MAX_LENGTH} characters or fewer.`;
    } else if (message.includes('\u0000')) {
        fieldErrors.message = 'Message contains an unsupported character.';
    }

    if (Object.keys(fieldErrors).length > 0) {
        return { success: false, fieldErrors };
    }

    return {
        success: true,
        data: {
            senderName,
            senderEmail,
            message,
        },
    };
}
