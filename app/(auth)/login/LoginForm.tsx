'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    ArrowRight,
    LoaderCircle,
    Lock,
} from 'lucide-react';

import Button from '@/components/ui/Button';
import { login } from './LoginActions';
import type { LoginActionState } from './LoginActions';

const INPUT_CLASS =
    'h-14 w-full appearance-none rounded-lg border border-white/[0.09] bg-[#050505] px-4 text-base tracking-normal text-[var(--text)] caret-[var(--signal)] outline-none [color-scheme:dark] transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-[var(--muted)]/28 hover:border-white/[0.16] focus:border-[var(--signal)]/65 focus:bg-[#080808] focus:shadow-[0_0_0_3px_rgba(195,109,252,0.09)] autofill:bg-[#050505] autofill:text-[var(--text)] [&:-webkit-autofill]:[-webkit-text-fill-color:#e7e9ec] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#050505_inset] [&:-webkit-autofill]:[caret-color:#e7e9ec] motion-reduce:transition-none';

const INITIAL_LOGIN_STATE: LoginActionState = {
    status: 'idle',
    message: '',
    attempt: 0,
};

export default function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginState, formAction, isPending] = useActionState(
        login,
        INITIAL_LOGIN_STATE,
    );

    useEffect(() => {
        if (loginState.status === 'error') {
            setPassword('');
        }
    }, [loginState.attempt, loginState.status]);

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
        <main className="fixed inset-0 grid h-dvh grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-black text-[var(--text)]">
            {/* Ambient signal glow */}
            <div
                aria-hidden="true"
                className="pointer-events-none fixed left-1/2 top-[-12rem] -z-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[var(--signal)]/[0.08] blur-[120px]"
            />

            <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 -z-0 bg-[radial-gradient(circle_at_50%_0%,transparent_0%,black_72%)]"
            />

            <header className="relative border-b border-white/[0.06] px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
                    <Link
                        href="/"
                        aria-label="Jude Michael Arriba, return to portfolio"
                        className="group inline-flex min-h-11 items-center gap-3 rounded-[6px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/65 focus-visible:ring-offset-4 focus-visible:ring-offset-black"
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
                        className="group inline-flex min-h-11 items-center gap-2 rounded-[6px] px-1 font-mono text-[10px] font-bold uppercase tracking-normal text-[var(--muted)]/55 transition-colors duration-200 hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/65 focus-visible:ring-offset-4 focus-visible:ring-offset-black motion-reduce:transition-none"
                    >
                        <ArrowLeft
                            aria-hidden="true"
                            size={14}
                            strokeWidth={1.8}
                            className="transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                        />

                        Return home
                    </Link>
                </div>
            </header>

            <section
                aria-labelledby="login-heading"
                className="relative min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-8"
            >
                <div className="mx-auto flex min-h-full w-full max-w-[27rem] flex-col justify-center py-6 sm:py-8">
                    <div className="mb-8">
                        <div className="mb-4 flex items-center gap-2.5">
                            <span
                                aria-hidden="true"
                                className="flex h-6 w-6 items-center justify-center rounded-[5px] border border-[var(--signal)]/30 bg-[var(--signal)]/[0.08] text-[var(--signal)]"
                            >
                                <Lock size={12} strokeWidth={2} />
                            </span>

                            <p className="font-mono text-[10px] font-extrabold uppercase tracking-normal text-[var(--signal)]">
                                Account access
                            </p>
                        </div>

                        <h1
                            id="login-heading"
                            className="font-display text-4xl font-extrabold leading-none tracking-normal text-[var(--text)] sm:text-[2.75rem]"
                        >
                            Sign in
                        </h1>

                        <p className="mt-3 text-sm leading-6 text-[var(--muted)]/58 sm:text-base">
                            Enter your email and password to continue.
                        </p>

                        <div
                            aria-hidden="true"
                            className="mt-6 h-px w-full bg-white/[0.06]"
                        />
                    </div>

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
                        <div className="space-y-5">
                            <div>
                                <label
                                    htmlFor="login-email"
                                    className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-normal text-[var(--muted)]/62"
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
                                    placeholder="you@example.com"
                                    className={INPUT_CLASS}
                                />
                            </div>

                            <div>
                                <div className="mb-2">
                                    <label
                                        htmlFor="login-password"
                                        className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-normal text-[var(--muted)]/62"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="text-[var(--signal)]/70"
                                        >
                                            02
                                        </span>

                                        Password
                                    </label>
                                </div>

                                <div className="relative">
                                    <input
                                        id="login-password"
                                        name="password"
                                        type="password"
                                        autoComplete="current-password"
                                        required
                                        maxLength={1024}
                                        value={password}
                                        onChange={(event) =>
                                            setPassword(event.currentTarget.value)
                                        }
                                        placeholder="Enter your password"
                                        className={INPUT_CLASS}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-7">
                            <Button
                                type="submit"
                                variant="brand"
                                size="lg"
                                radius={8}
                                className="min-h-14 w-full justify-center px-5 text-sm shadow-[0_12px_30px_rgba(124,58,237,0.18)] transition-transform duration-200 hover:-translate-y-px active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                            >
                                <span className="inline-flex items-center gap-2.5">
                                    {isPending ? (
                                        <>
                                            <LoaderCircle
                                                aria-hidden="true"
                                                size={17}
                                                strokeWidth={2}
                                                className="animate-spin motion-reduce:animate-none"
                                            />
                                            Signing in...
                                        </>
                                    ) : (
                                        <>
                                            Sign in
                                            <ArrowRight
                                                aria-hidden="true"
                                                size={17}
                                                strokeWidth={2}
                                                className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                                            />
                                        </>
                                    )}
                                </span>
                            </Button>

                            <p
                                id="login-form-status"
                                role="status"
                                aria-live="polite"
                                aria-atomic="true"
                                className="mt-3 min-h-5 text-xs leading-relaxed text-red-400"
                            >
                                {statusMessage}
                            </p>
                        </div>
                        </fieldset>
                    </form>
                </div>
            </section>
        </main>
    );
}
