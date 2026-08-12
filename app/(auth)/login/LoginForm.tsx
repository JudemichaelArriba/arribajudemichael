'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    ArrowRight,
    LoaderCircle,
    Lock,
    Shield,
} from 'lucide-react';

import Turnstile from '@/components/ui/Turnstile/Turnstile';
import { login } from './LoginActions';
import type { LoginActionState } from './LoginActions';

const INPUT_CLASS =
    'h-11 w-full appearance-none rounded-lg border border-white/[0.09] bg-[#07080a] px-4 text-sm tracking-normal text-[var(--text)] caret-[var(--signal)] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.015)] [color-scheme:dark] transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-[var(--muted)]/32 hover:border-white/[0.14] focus:border-[var(--signal)]/55 focus:bg-[#0a0b0d] focus:shadow-[0_0_0_3px_rgba(195,109,252,0.08),inset_0_1px_0_rgba(255,255,255,0.025)] autofill:bg-[#07080a] autofill:text-[var(--text)] [&:-webkit-autofill]:[-webkit-text-fill-color:#e7e9ec] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#07080a_inset] [&:-webkit-autofill]:[caret-color:#e7e9ec] motion-reduce:transition-none';

const SUBMIT_BUTTON_CLASS =
    'group inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--signal)]/28 bg-[var(--signal)]/12 px-4 font-mono text-xs font-bold uppercase tracking-[0.08em] text-[var(--signal)] transition-[border-color,background-color,color,transform] duration-200 hover:border-[var(--signal)]/46 hover:bg-[var(--signal)]/18 hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none motion-reduce:active:scale-100';

const INITIAL_LOGIN_STATE: LoginActionState = {
    status: 'idle',
    message: '',
    attempt: 0,
};

export default function LoginForm() {
    const [email, setEmail] = useState('');
    const [loginState, formAction, isPending] = useActionState(
        login,
        INITIAL_LOGIN_STATE,
    );
    const [passwordEntry, setPasswordEntry] = useState({
        attempt: loginState.attempt,
        value: '',
    });
    const password = passwordEntry.attempt === loginState.attempt
        ? passwordEntry.value
        : '';

    useEffect(() => {
        const url = new URL(window.location.href);

        if (!url.searchParams.has('error')) {
            return;
        }

        url.searchParams.delete('error');
        window.history.replaceState(window.history.state, '', url);
    }, []);

    const statusMessage = isPending ? '' : loginState.message;

    return (
        <main className="fixed inset-0 grid h-dvh grid-rows-[auto_1fr] overflow-hidden bg-[#030405] text-[var(--text)]">
            <div
                aria-hidden="true"
                className="pointer-events-none fixed left-1/2 top-[-10rem] -z-0 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[var(--signal)]/[0.06] blur-[110px]"
            />

            <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 -z-0 bg-[radial-gradient(circle_at_50%_0%,transparent_0%,#030405_70%)]"
            />

            <header className="relative z-10 border-b border-white/[0.055] bg-black/20 px-5 py-3 backdrop-blur-sm sm:px-8">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
                    <Link
                        href="/"
                        aria-label="Jude Michael Arriba, return to portfolio"
                        className="group inline-flex items-center gap-3 rounded-md px-0.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/65"
                    >
                        <span className="font-name text-xl font-bold leading-none tracking-normal text-white">
                            JM
                        </span>

                        <span
                            aria-hidden="true"
                            className="h-4 w-px bg-[var(--signal)]/70"
                        />

                        <span className="font-mono text-[10px] font-bold uppercase tracking-normal text-[var(--muted)]/48">
                            Portfolio
                        </span>
                    </Link>

                    <Link
                        href="/"
                        className="group inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]/52 transition-colors duration-200 hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/65 motion-reduce:transition-none"
                    >
                        <ArrowLeft
                            aria-hidden="true"
                            size={13}
                            strokeWidth={2}
                            className="transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                        />
                        Return home
                    </Link>
                </div>
            </header>

            <div className="relative z-10 flex items-center justify-center px-5 sm:px-8">
                <div className="w-full max-w-[27rem]">
                    <div className="overflow-hidden rounded-lg border border-white/[0.085] bg-[#07080a] shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_20px_50px_rgba(0,0,0,0.4)]">
                        <div className="border-b border-white/[0.06] px-5 py-5 sm:px-6">
                            <div className="mb-3 flex items-center gap-2.5">
                                <span
                                    aria-hidden="true"
                                    className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--signal)]/28 bg-[var(--signal)]/[0.09] text-[var(--signal)]"
                                >
                                    <Lock size={14} strokeWidth={2} />
                                </span>

                                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--signal)]/78">
                                    Admin access
                                </p>
                            </div>

                            <h1
                                id="login-heading"
                                className="font-display text-3xl font-extrabold leading-tight tracking-normal text-[var(--text)] sm:text-[2.75rem]"
                            >
                                Sign in
                            </h1>

                            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]/62">
                                Authenticate to access the admin dashboard.
                            </p>
                        </div>

                        <div className="px-5 py-5 sm:px-6">
                            <form
                                action={formAction}
                                className="[color-scheme:dark]"
                                aria-label="Sign in"
                                aria-describedby="login-form-status"
                                aria-busy={isPending}
                            >
                                <fieldset
                                    disabled={isPending}
                                    className="m-0 min-w-0 border-0 p-0"
                                >
                                    <div className="space-y-4">
                                        <div>
                                            <label
                                                htmlFor="login-email"
                                                className="mb-1.5 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/58"
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className="text-[var(--signal)]/70"
                                                >
                                                    01
                                                </span>
                                                Email address
                                            </label>

                                            <input
                                                id="login-email"
                                                name="email"
                                                type="email"
                                                inputMode="email"
                                                autoComplete="username"
                                                autoCapitalize="none"
                                                spellCheck={false}
                                                required
                                                maxLength={254}
                                                value={email}
                                                onChange={(event) =>
                                                    setEmail(event.currentTarget.value)
                                                }
                                                placeholder="admin@example.com"
                                                className={INPUT_CLASS}
                                            />
                                        </div>

                                        <div>
                                            <label
                                                htmlFor="login-password"
                                                className="mb-1.5 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/58"
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className="text-[var(--signal)]/70"
                                                >
                                                    02
                                                </span>
                                                Password
                                            </label>

                                            <input
                                                id="login-password"
                                                name="password"
                                                type="password"
                                                autoComplete="current-password"
                                                required
                                                maxLength={1024}
                                                value={password}
                                                onChange={(event) =>
                                                    setPasswordEntry({
                                                        attempt: loginState.attempt,
                                                        value: event.currentTarget.value,
                                                    })
                                                }
                                                placeholder="Enter your password"
                                                className={INPUT_CLASS}
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1.5 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]/58">
                                                <span
                                                    aria-hidden="true"
                                                    className="text-[var(--signal)]/70"
                                                >
                                                    03
                                                </span>
                                                Security verification
                                            </label>

                                            <Turnstile
                                                action="login"
                                                resetKey={loginState.attempt}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-5">
                                        <button
                                            type="submit"
                                            disabled={isPending}
                                            className={SUBMIT_BUTTON_CLASS}
                                        >
                                            {isPending ? (
                                                <>
                                                    <LoaderCircle
                                                        aria-hidden="true"
                                                        size={15}
                                                        strokeWidth={2}
                                                        className="animate-spin motion-reduce:animate-none"
                                                    />
                                                    Authenticating...
                                                </>
                                            ) : (
                                                <>
                                                    <Shield
                                                        aria-hidden="true"
                                                        size={15}
                                                        strokeWidth={2}
                                                    />
                                                    Sign in to dashboard
                                                    <ArrowRight
                                                        aria-hidden="true"
                                                        size={14}
                                                        strokeWidth={2}
                                                        className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                                                    />
                                                </>
                                            )}
                                        </button>

                                        {statusMessage ? (
                                            <div className="mt-3 rounded-md border border-red-300/15 bg-red-400/[0.06] px-3 py-2.5">
                                                <p
                                                    id="login-form-status"
                                                    role="status"
                                                    aria-live="polite"
                                                    aria-atomic="true"
                                                    className="text-xs leading-relaxed text-red-300/85"
                                                >
                                                    {statusMessage}
                                                </p>
                                            </div>
                                        ) : (
                                            <p
                                                id="login-form-status"
                                                role="status"
                                                aria-live="polite"
                                                aria-atomic="true"
                                                className="sr-only"
                                            />
                                        )}
                                    </div>
                                </fieldset>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
