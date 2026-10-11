import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

interface NotificationConfig {
    resendApiKey: string;
    notificationEmail: string;
    notificationFromEmail: string;
    webhookSecret: string;
    adminInboxUrl: string;
}

interface MessageRecord {
    id: string;
    senderName: string;
    senderEmail: string;
    message: string;
    receivedAt: string;
}

interface JsonResult {
    ok: boolean;
    message?: string;
}

type ConfigResult =
    | { configured: true; config: NotificationConfig }
    | { configured: false };

type PayloadResult =
    | { outcome: "message"; record: MessageRecord }
    | { outcome: "ignored" }
    | { outcome: "invalid" };

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const WEBHOOK_SECRET_HEADER = "x-notification-secret";
const MAX_REQUEST_BYTES = 32 * 1024;
const MAX_PREVIEW_CHARACTERS = 420;
const RESEND_TIMEOUT_MS = 10_000;

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_TIMESTAMP_PATTERN =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const SINGLE_LINE_CONTROL_PATTERN = /[\u0000-\u001f\u007f]/;
const encoder = new TextEncoder();

function jsonResponse(body: JsonResult, status: number): Response {
    return Response.json(body, {
        status,
        headers: {
            "Cache-Control": "no-store",
        },
    });
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEmail(value: string): boolean {
    return value.length >= 3 && value.length <= 254 && EMAIL_PATTERN.test(value);
}

function isValidSender(value: string): boolean {
    if (
        value.length === 0 ||
        value.length > 400 ||
        SINGLE_LINE_CONTROL_PATTERN.test(value)
    ) {
        return false;
    }

    const bracketedAddress = value.match(/<([^<>]+)>$/)?.[1]?.trim();
    return isEmail(bracketedAddress ?? value);
}

function normalizeAdminInboxUrl(value: string): string | null {
    try {
        const url = new URL(value);
        const isLocalHttp =
            url.protocol === "http:" &&
            ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);

        if (
            (url.protocol !== "https:" && !isLocalHttp) ||
            url.username.length > 0 ||
            url.password.length > 0
        ) {
            return null;
        }

        return url.toString();
    } catch {
        return null;
    }
}

function getConfig(): ConfigResult {
    const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim() ?? "";
    const notificationEmail = Deno.env.get("NOTIFICATION_EMAIL")?.trim() ?? "";
    const notificationFromEmail =
        Deno.env.get("NOTIFICATION_FROM_EMAIL")?.trim() ?? "";
    const webhookSecret =
        Deno.env.get("NOTIFICATION_WEBHOOK_SECRET")?.trim() ?? "";
    const rawAdminInboxUrl = Deno.env.get("ADMIN_INBOX_URL")?.trim() ?? "";
    const adminInboxUrl = normalizeAdminInboxUrl(rawAdminInboxUrl);

    if (
        resendApiKey.length === 0 ||
        webhookSecret.length === 0 ||
        !isEmail(notificationEmail) ||
        !isValidSender(notificationFromEmail) ||
        adminInboxUrl === null
    ) {
        console.error("[notify-new-message] Configuration unavailable.", {
            operation: "configuration",
            code: "invalid_or_missing_configuration",
        });
        return { configured: false };
    }

    return {
        configured: true,
        config: {
            resendApiKey,
            notificationEmail,
            notificationFromEmail,
            webhookSecret,
            adminInboxUrl,
        },
    };
}

async function secretsMatch(provided: string, expected: string): Promise<boolean> {
    if (provided.length === 0 || provided.length > 2_048) return false;

    const [providedDigest, expectedDigest] = await Promise.all([
        crypto.subtle.digest("SHA-256", encoder.encode(provided)),
        crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    ]);
    const providedBytes = new Uint8Array(providedDigest);
    const expectedBytes = new Uint8Array(expectedDigest);
    let difference = 0;

    for (let index = 0; index < expectedBytes.length; index += 1) {
        difference |= providedBytes[index] ^ expectedBytes[index];
    }

    return difference === 0;
}

function getString(
    value: unknown,
    minimumLength: number,
    maximumLength: number,
): string | null {
    if (typeof value !== "string") return null;

    const normalized = value.trim();
    if (
        normalized.length < minimumLength ||
        normalized.length > maximumLength
    ) {
        return null;
    }

    return normalized;
}

function parseMessageRecord(value: unknown): MessageRecord | null {
    if (!isObject(value)) return null;

    const id = getString(value.id, 36, 36);
    const senderName = getString(value.sender_name, 1, 80);
    const senderEmail = getString(value.sender_email, 3, 254);
    const message = getString(value.message, 1, 2_000);
    const receivedAt = getString(value.received_at, 20, 64);

    if (
        id === null ||
        !UUID_PATTERN.test(id) ||
        senderName === null ||
        SINGLE_LINE_CONTROL_PATTERN.test(senderName) ||
        senderEmail === null ||
        !isEmail(senderEmail) ||
        message === null ||
        receivedAt === null ||
        !ISO_TIMESTAMP_PATTERN.test(receivedAt) ||
        !Number.isFinite(Date.parse(receivedAt))
    ) {
        return null;
    }

    return {
        id,
        senderName,
        senderEmail,
        message,
        receivedAt,
    };
}

function parsePayload(value: unknown): PayloadResult {
    if (!isObject(value)) return { outcome: "invalid" };

    const eventType = value.type;
    const schema = value.schema;
    const table = value.table;

    if (
        typeof eventType !== "string" ||
        typeof schema !== "string" ||
        typeof table !== "string"
    ) {
        return { outcome: "invalid" };
    }

    if (
        eventType !== "INSERT" ||
        schema !== "public" ||
        table !== "messages"
    ) {
        return { outcome: "ignored" };
    }

    if (!("old_record" in value) || value.old_record !== null) {
        return { outcome: "invalid" };
    }

    const record = parseMessageRecord(value.record);
    return record
        ? { outcome: "message", record }
        : { outcome: "invalid" };
}

function createMessagePreview(message: string): string {
    const normalized = message.replace(/\s+/g, " ").trim();
    const characters = Array.from(normalized);

    if (characters.length <= MAX_PREVIEW_CHARACTERS) return normalized;

    return `${characters
        .slice(0, MAX_PREVIEW_CHARACTERS - 3)
        .join("")
        .trimEnd()}...`;
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
        const entities: Record<string, string> = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        };

        return entities[character];
    });
}

function formatReceivedAt(receivedAt: string): string {
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
        timeZoneName: "short",
    }).format(new Date(receivedAt));
}

function createEmailContent(
    record: MessageRecord,
    adminInboxUrl: string,
): { subject: string; html: string; text: string } {
    const preview = createMessagePreview(record.message);
    const formattedReceivedAt = formatReceivedAt(record.receivedAt);
    const safeSenderName = escapeHtml(record.senderName);
    const safeSenderEmail = escapeHtml(record.senderEmail);
    const safePreview = escapeHtml(preview);
    const safeReceivedAt = escapeHtml(formattedReceivedAt);
    const safeAdminInboxUrl = escapeHtml(adminInboxUrl);

    const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#0b0b0b;color:#ededed;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:620px;margin:0 auto;padding:32px 20px;">
      <div style="border:1px solid #2a2a2a;background:#141414;padding:28px;">
        <p style="margin:0 0 8px;color:#a2a2a2;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">Portfolio inbox</p>
        <h1 style="margin:0 0 24px;color:#ededed;font-size:24px;line-height:1.25;">New portfolio message</h1>
        <p style="margin:0 0 8px;color:#8a8a8a;font-size:13px;">From</p>
        <p style="margin:0 0 20px;font-size:16px;font-weight:700;">${safeSenderName}</p>
        <p style="margin:0 0 8px;color:#8a8a8a;font-size:13px;">Email</p>
        <p style="margin:0 0 20px;font-size:15px;">${safeSenderEmail}</p>
        <p style="margin:0 0 8px;color:#8a8a8a;font-size:13px;">Received</p>
        <p style="margin:0 0 20px;font-size:15px;">${safeReceivedAt}</p>
        <p style="margin:0 0 8px;color:#8a8a8a;font-size:13px;">Message preview</p>
        <p style="margin:0 0 28px;white-space:pre-wrap;font-size:15px;line-height:1.65;">${safePreview}</p>
        <a href="${safeAdminInboxUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#ededed;color:#0b0b0b;padding:12px 20px;font-size:14px;font-weight:700;text-decoration:none;">Open Admin Inbox</a>
      </div>
    </div>
  </body>
</html>`;

    const text = `New portfolio message

From:
${record.senderName}

Email:
${record.senderEmail}

Received:
${formattedReceivedAt}

Message preview:
${preview}

Open Admin Inbox:
${adminInboxUrl}`;

    return {
        subject: `New portfolio message from ${record.senderName}`,
        html,
        text,
    };
}

function getProviderErrorCode(value: unknown): string {
    if (!isObject(value)) return "unknown";

    const candidate = typeof value.name === "string"
        ? value.name
        : typeof value.code === "string"
        ? value.code
        : "unknown";

    return /^[a-z0-9_.-]{1,64}$/i.test(candidate) ? candidate : "unknown";
}

async function sendNotification(
    config: NotificationConfig,
    record: MessageRecord,
): Promise<boolean> {
    const content = createEmailContent(record, config.adminInboxUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);

    try {
        const response = await fetch(RESEND_ENDPOINT, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.resendApiKey}`,
                "Content-Type": "application/json",
                "Idempotency-Key": `new-portfolio-message/${record.id}`,
            },
            body: JSON.stringify({
                from: config.notificationFromEmail,
                to: [config.notificationEmail],
                subject: content.subject,
                html: content.html,
                text: content.text,
            }),
            signal: controller.signal,
        });

        if (!response.ok) {
            let providerCode = "unknown";

            try {
                providerCode = getProviderErrorCode(await response.json());
            } catch {
                // Keep provider response details private when parsing fails.
            }

            console.error("[notify-new-message] Notification delivery failed.", {
                operation: "send",
                messageId: record.id,
                providerStatus: response.status,
                providerCode,
            });
            return false;
        }

        console.info("[notify-new-message] Notification sent.", {
            operation: "send",
            messageId: record.id,
            providerStatus: response.status,
        });
        return true;
    } catch (error) {
        console.error("[notify-new-message] Notification request failed.", {
            operation: "send",
            messageId: record.id,
            errorName: error instanceof Error ? error.name : "UnknownError",
        });
        return false;
    } finally {
        clearTimeout(timeout);
    }
}

export default {
    fetch: withSupabase({ auth: "none" }, async (request) => {
        if (request.method !== "POST") {
            return new Response(
                JSON.stringify({ ok: false, message: "Method not allowed." }),
                {
                    status: 405,
                    headers: {
                        Allow: "POST",
                        "Cache-Control": "no-store",
                        "Content-Type": "application/json; charset=utf-8",
                    },
                },
            );
        }

        const configResult = getConfig();
        if (!configResult.configured) {
            return jsonResponse(
                { ok: false, message: "Notification service unavailable." },
                503,
            );
        }

        const suppliedSecret = request.headers.get(WEBHOOK_SECRET_HEADER) ?? "";
        if (!(await secretsMatch(suppliedSecret, configResult.config.webhookSecret))) {
            return jsonResponse(
                { ok: false, message: "Request is not authorized." },
                401,
            );
        }

        const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
        const contentLength = Number(request.headers.get("content-length"));

        if (!contentType.startsWith("application/json")) {
            return jsonResponse(
                { ok: false, message: "Invalid webhook payload." },
                400,
            );
        }

        if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
            return jsonResponse(
                { ok: false, message: "Invalid webhook payload." },
                413,
            );
        }

        let rawBody: string;
        let payload: unknown;

        try {
            rawBody = await request.text();
            if (encoder.encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
                return jsonResponse(
                    { ok: false, message: "Invalid webhook payload." },
                    413,
                );
            }
            payload = JSON.parse(rawBody) as unknown;
        } catch {
            return jsonResponse(
                { ok: false, message: "Invalid webhook payload." },
                400,
            );
        }

        const payloadResult = parsePayload(payload);

        if (payloadResult.outcome === "ignored") {
            return jsonResponse({ ok: true }, 202);
        }

        if (payloadResult.outcome === "invalid") {
            return jsonResponse(
                { ok: false, message: "Invalid webhook payload." },
                400,
            );
        }

        const sent = await sendNotification(
            configResult.config,
            payloadResult.record,
        );

        return sent
            ? jsonResponse({ ok: true }, 200)
            : jsonResponse(
                { ok: false, message: "Unable to send notification." },
                502,
            );
    }),
};
