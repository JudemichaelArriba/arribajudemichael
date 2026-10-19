import { z } from 'zod';

export const MAX_CHAT_MESSAGES = 10;
export const MAX_USER_MESSAGE_LENGTH = 1_000;
export const MAX_ASSISTANT_MESSAGE_LENGTH = 4_000;

const userMessageSchema = z
    .object({
        role: z.literal('user'),
        content: z.string().trim().min(1).max(MAX_USER_MESSAGE_LENGTH),
    })
    .strict();

// Earlier answers are echoed back by the client, so they are untrusted too: they are capped and
// only ever passed to the model as plain conversation text.
const assistantMessageSchema = z
    .object({
        role: z.literal('assistant'),
        content: z.string().trim().min(1).max(MAX_ASSISTANT_MESSAGE_LENGTH),
    })
    .strict();

export const chatRequestSchema = z
    .object({
        messages: z
            .array(z.discriminatedUnion('role', [userMessageSchema, assistantMessageSchema]))
            .min(1)
            .max(MAX_CHAT_MESSAGES)
            .refine((messages) => messages.at(-1)?.role === 'user', {
                message: 'The last message must come from the user.',
            }),
    })
    .strict();

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatMessage = ChatRequest['messages'][number];

export function parseChatRequest(value: unknown): ChatRequest | null {
    const result = chatRequestSchema.safeParse(value);
    return result.success ? result.data : null;
}
