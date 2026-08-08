'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { SupabaseConfigurationError } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';

export interface LoginActionState {
    status: 'idle' | 'error';
    message: string;
    attempt: number;
}

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';
const RATE_LIMIT_MESSAGE =
    'Too many sign-in attempts. Please wait and try again.';
const SERVICE_ERROR_MESSAGE =
    'Sign-in is temporarily unavailable. Please try again later.';

const CREDENTIAL_ERROR_CODES = new Set([
    'email_address_invalid',
    'email_address_not_authorized',
    'email_not_confirmed',
    'invalid_credentials',
    'provider_email_needs_verification',
    'user_banned',
    'user_not_found',
    'validation_failed',
]);

const RATE_LIMIT_ERROR_CODES = new Set([
    'over_email_send_rate_limit',
    'over_request_rate_limit',
]);

function getErrorState(
    previousState: LoginActionState,
    message: string,
): LoginActionState {
    const attempt =
        Number.isSafeInteger(previousState.attempt) &&
        previousState.attempt >= 0 &&
        previousState.attempt < Number.MAX_SAFE_INTEGER
            ? previousState.attempt + 1
            : 1;

    return {
        status: 'error',
        message,
        attempt,
    };
}

function logAuthFailure(error: {
    code?: string;
    name?: string;
    status?: number;
}) {
    console.warn('[auth/login] Supabase sign-in rejected.', {
        code: error.code ?? 'unknown',
        name: error.name ?? 'AuthError',
        status: error.status ?? 'unknown',
    });
}

export async function login(
    previousState: LoginActionState,
    formData: FormData,
): Promise<LoginActionState> {
    const rawEmail = formData.get('email');
    const rawPassword = formData.get('password');

    if (
        typeof rawEmail !== 'string' ||
        typeof rawPassword !== 'string'
    ) {
        return getErrorState(previousState, INVALID_CREDENTIALS_MESSAGE);
    }

    const email = rawEmail.trim();
    const password = rawPassword;

    if (
        email.length === 0 ||
        email.length > 254 ||
        password.length === 0 ||
        password.length > 1024
    ) {
        return getErrorState(previousState, INVALID_CREDENTIALS_MESSAGE);
    }

    try {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            logAuthFailure(error);

            if (
                error.status === 429 ||
                RATE_LIMIT_ERROR_CODES.has(error.code ?? '')
            ) {
                return getErrorState(previousState, RATE_LIMIT_MESSAGE);
            }

            if (CREDENTIAL_ERROR_CODES.has(error.code ?? '')) {
                return getErrorState(
                    previousState,
                    INVALID_CREDENTIALS_MESSAGE,
                );
            }

            return getErrorState(previousState, SERVICE_ERROR_MESSAGE);
        }

        if (!data.user || !data.session) {
            console.error(
                '[auth/login] Supabase returned no authenticated session.',
            );

            return getErrorState(previousState, SERVICE_ERROR_MESSAGE);
        }
    } catch (error) {
        if (error instanceof SupabaseConfigurationError) {
            console.error('[auth/login] Supabase configuration is incomplete.');

            return getErrorState(previousState, SERVICE_ERROR_MESSAGE);
        }

        console.error('[auth/login] Unexpected sign-in failure.', {
            name: error instanceof Error ? error.name : 'UnknownError',
        });

        return getErrorState(previousState, SERVICE_ERROR_MESSAGE);
    }

    revalidatePath('/', 'layout');
    redirect('/dashboard');
}
