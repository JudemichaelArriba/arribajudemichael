import 'server-only';

import type { ValidatedContactFields } from './validation';

export type ContactEmailResult = { sent: true } | { sent: false };

interface ContactEmailConfig {
    apiKey: string;
    to: string;
    from: string;
}

interface ContactEmailContent {
    subject: string;
    html: string;
    text: string;
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const RESEND_TIMEOUT_MS = 10_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

function isEmail(value: string): boolean {
    return value.length >= 3 && value.length <= 254 && EMAIL_PATTERN.test(value);
}

/** Accepts `address` or `Display Name <address>`. */
function isValidSender(value: string): boolean {
    if (value.length === 0 || value.length > 400 || CONTROL_CHARACTER_PATTERN.test(value)) {
        return false;
    }

    const bracketedAddress = value.match(/<([^<>]+)>$/)?.[1]?.trim();
    return isEmail(bracketedAddress ?? value);
}

function getConfig(): ContactEmailConfig | null {
    const apiKey = process.env.RESEND_API_KEY?.trim() ?? '';
    const to = process.env.NOTIFICATION_EMAIL?.trim() ?? '';
    const from = process.env.NOTIFICATION_FROM_EMAIL?.trim() ?? '';

    if (apiKey.length === 0 || !isEmail(to) || !isValidSender(from)) {
        return null;
    }

    return { apiKey, to, from };
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
        const entities: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        };

        return entities[character];
    });
}

function formatReceivedAt(receivedAt: Date): string {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short',
    }).format(receivedAt);
}

function createContactEmail(
    fields: ValidatedContactFields,
    receivedAt: Date,
): ContactEmailContent {
    const formattedReceivedAt = formatReceivedAt(receivedAt);
    const safeName = escapeHtml(fields.senderName);
    const safeEmail = escapeHtml(fields.senderEmail);
    const safeMessage = escapeHtml(fields.message);
    const safeReceivedAt = escapeHtml(formattedReceivedAt);

    // The email is now the only copy of the message, so it carries the full
    // text rather than a preview. Solid hex only: email clients handle rgba
    // and CSS variables poorly.
    const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#0b0b0b;color:#ededed;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:620px;margin:0 auto;padding:32px 20px;">
      <div style="border:1px solid #2a2a2a;background:#141414;padding:28px;">
        <p style="margin:0 0 8px;color:#a2a2a2;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">Portfolio contact form</p>
        <h1 style="margin:0 0 24px;color:#ededed;font-size:24px;line-height:1.25;">New portfolio message</h1>
        <p style="margin:0 0 8px;color:#8a8a8a;font-size:13px;">From</p>
        <p style="margin:0 0 20px;font-size:16px;font-weight:700;">${safeName}</p>
        <p style="margin:0 0 8px;color:#8a8a8a;font-size:13px;">Email</p>
        <p style="margin:0 0 20px;font-size:15px;">${safeEmail}</p>
        <p style="margin:0 0 8px;color:#8a8a8a;font-size:13px;">Received</p>
        <p style="margin:0 0 20px;font-size:15px;">${safeReceivedAt}</p>
        <p style="margin:0 0 8px;color:#8a8a8a;font-size:13px;">Message</p>
        <p style="margin:0;white-space:pre-wrap;font-size:15px;line-height:1.65;">${safeMessage}</p>
        <p style="margin:28px 0 0;border-top:1px solid #2a2a2a;padding-top:16px;color:#8a8a8a;font-size:13px;">Reply to this email to answer ${safeName} directly.</p>
      </div>
    </div>
  </body>
</html>`;

    const text = `New portfolio message

From:
${fields.senderName}

Email:
${fields.senderEmail}

Received:
${formattedReceivedAt}

Message:
${fields.message}

Reply to this email to answer ${fields.senderName} directly.`;

    return {
        subject: `New portfolio message from ${fields.senderName}`,
        html,
        text,
    };
}

function getProviderErrorName(value: unknown): string {
    if (typeof value === 'object' && value !== null && 'name' in value) {
        const name = (value as { name: unknown }).name;
        if (typeof name === 'string' && /^[a-z_]{1,64}$/.test(name)) return name;
    }

    return 'unknown';
}

/**
 * Delivers a contact-form submission straight to the site owner's inbox.
 * Nothing is persisted: the email is the only copy. The visitor's name, email
 * and message are never logged.
 */
export async function sendContactEmail(
    fields: ValidatedContactFields,
): Promise<ContactEmailResult> {
    const config = getConfig();

    if (config === null) {
        console.error('[contact/email] Email delivery is not configured.');
        return { sent: false };
    }

    const content = createContactEmail(fields, new Date());
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);

    try {
        const response = await fetch(RESEND_ENDPOINT, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: config.from,
                to: [config.to],
                reply_to: fields.senderEmail,
                subject: content.subject,
                html: content.html,
                text: content.text,
            }),
            signal: controller.signal,
        });

        if (!response.ok) {
            let providerError = 'unknown';

            try {
                providerError = getProviderErrorName(await response.json());
            } catch {
                // Keep provider response details private when parsing fails.
            }

            console.error('[contact/email] Email delivery failed.', {
                providerStatus: response.status,
                providerError,
            });
            return { sent: false };
        }

        return { sent: true };
    } catch (error) {
        console.error('[contact/email] Email request failed.', {
            name: error instanceof Error ? error.name : 'UnknownError',
        });
        return { sent: false };
    } finally {
        clearTimeout(timeoutId);
    }
}
