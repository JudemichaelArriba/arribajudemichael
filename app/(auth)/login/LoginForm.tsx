'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
    ArrowLeft,
    ArrowRight,
    LoaderCircle,
    Lock,
    ShieldCheck,
} from 'lucide-react';

import Turnstile from '@/components/ui/Turnstile/Turnstile';
import { login } from './LoginActions';
import type { LoginActionState } from './LoginActions';

gsap.registerPlugin(useGSAP);

const INPUT_CLASS =
    'h-12 w-full appearance-none border border-[var(--hairline)] bg-[var(--field-bg)] px-4 text-sm tracking-normal text-[var(--text)] caret-[var(--text)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[var(--faint)] hover:border-[var(--hairline-strong)] focus:border-[var(--text)] focus:shadow-[0_0_0_2px_var(--hairline)] [&:-webkit-autofill]:[-webkit-text-fill-color:#ededed] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#0f0f0f_inset] [&:-webkit-autofill]:[caret-color:#ededed] motion-reduce:transition-none';

const SUBMIT_BUTTON_CLASS =
    'group inline-flex h-12 w-full items-center justify-center gap-2.5 bg-[var(--inverse-bg)] px-4 font-mono text-xs font-bold uppercase tracking-[0.12em] text-[var(--inverse-text)] transition-[opacity,transform] duration-200 hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100';

const CREDENTIALS = [
    { code: '01', label: 'Encrypted session cookies' },
    { code: '02', label: 'Rate limited by source' },
    { code: '03', label: 'Bot verification required' },
] as const;

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
    const rootRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const url = new URL(window.location.href);

        if (!url.searchParams.has('error')) {
            return;
        }

        url.searchParams.delete('error');
        window.history.replaceState(window.history.state, '', url);
    }, []);

    useGSAP(
        () => {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

            const aside = gsap.utils.toArray<HTMLElement>('[data-login-aside]');
            const panel = gsap.utils.toArray<HTMLElement>('[data-login-panel]');
            const fields = gsap.utils.toArray<HTMLElement>('[data-login-field]');

            const timeline = gsap.timeline({
                defaults: { overwrite: 'auto', force3D: true },
            });

            timeline
                .from(aside, { autoAlpha: 0, y: 18, duration: 0.7, ease: 'power3.out', stagger: 0.07 }, 0)
                .from(panel, { autoAlpha: 0, y: 24, duration: 0.75, ease: 'power3.out' }, 0.1)
                .from(fields, { autoAlpha: 0, y: 14, duration: 0.55, ease: 'power3.out', stagger: 0.07 }, 0.3);

            return () => {
                timeline.kill();
            };
        },
        { scope: rootRef }
    );

    const statusMessage = isPending ? '' : loginState.message;

    return (
        <main
            ref={rootRef}
            className="min-h-dvh bg-[var(--site-bg)] text-[var(--text)]"
        >
            <header className="border-b border-[var(--hairline)] px-5 py-4 sm:px-8">
                <div className="mx-auto flex w-full max-w-[80rem] items-center justify-between gap-4">
                    <Link
                        href="/"
                        aria-label="Jude Michael Arriba, return to portfolio"
                        className="group inline-flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45"
                    >
                        <span className="font-name text-xl font-extrabold leading-none tracking-tight text-[var(--text)]">
                            J<span className="text-[var(--faint)] transition-colors duration-300 group-hover:text-[var(--text)]">M</span>
                        </span>
                        <span aria-hidden="true" className="h-4 w-px bg-[var(--hairline-strong)]" />
                        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--faint)]">
                            Portfolio
                        </span>
                    </Link>

                    <Link
                        href="/"
                        className="group inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--faint)] transition-colors duration-200 hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 motion-reduce:transition-none"
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

            <div className="mx-auto grid w-full max-w-[80rem] gap-14 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-center lg:gap-20 lg:py-24">
                <div className="min-w-0">
                    <div data-login-aside className="flex w-full items-center gap-4">
                        <p className="shrink-0 font-display text-xs font-bold uppercase leading-none tracking-[0.14em] text-[var(--text)]">
                            Admin access
                        </p>
                        <span aria-hidden="true" className="h-px min-w-8 flex-1 bg-[var(--hairline)]" />
                        <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)] sm:inline">
                            Restricted
                        </span>
                    </div>

                    <h1
                        data-login-aside
                        id="login-heading"
                        className="mt-10 font-display text-4xl font-bold leading-[1.04] tracking-[-0.025em] text-[var(--text)] sm:text-5xl lg:text-[3.6rem]"
                    >
                        Sign in to the dashboard.
                    </h1>

                    <p
                        data-login-aside
                        className="mt-6 max-w-[46ch] text-base leading-[1.75] text-[var(--muted)]"
                    >
                        This area manages the projects, certificates, experience and messages
                        that the public site reads from.
                    </p>

                    <dl data-login-aside className="mt-12 border-b border-[var(--hairline)]">
                        {CREDENTIALS.map((item) => (
                            <div
                                key={item.code}
                                className="flex items-center gap-5 border-t border-[var(--hairline)] py-4"
                            >
                                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--faint)]">
                                    {item.code}
                                </dt>
                                <dd className="m-0 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--muted)]">
                                    {item.label}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>

                <div
                    data-login-panel
                    className="min-w-0 border border-[var(--hairline)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
                >
                    <div className="flex items-center gap-3 border-b border-[var(--hairline)] pb-5">
                        <span
                            aria-hidden="true"
                            className="flex size-9 items-center justify-center border border-[var(--hairline)] text-[var(--text)]"
                        >
                            <Lock size={15} strokeWidth={2} />
                        </span>
                        <div>
                            <p className="font-display text-base font-bold tracking-[-0.01em] text-[var(--text)]">
                                Authenticate
                            </p>
                            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--faint)]">
                                All fields required
                            </p>
                        </div>
                    </div>

                    <form
                        action={formAction}
                        className="mt-6 [color-scheme:dark]"
                        aria-label="Sign in"
                        aria-describedby="login-form-status"
                        aria-busy={isPending}
                    >
                        <fieldset disabled={isPending} className="m-0 min-w-0 border-0 p-0">
                            <div className="space-y-5">
                                <div data-login-field>
                                    <label
                                        htmlFor="login-email"
                                        className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--faint)]"
                                    >
                                        <span aria-hidden="true">01</span>
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
                                        onChange={(event) => setEmail(event.currentTarget.value)}
                                        placeholder="admin@example.com"
                                        className={INPUT_CLASS}
                                    />
                                </div>

                                <div data-login-field>
                                    <label
                                        htmlFor="login-password"
                                        className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--faint)]"
                                    >
                                        <span aria-hidden="true">02</span>
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

                                <div data-login-field>
                                    <label className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--faint)]">
                                        <span aria-hidden="true">03</span>
                                        Security verification
                                    </label>

                                    <Turnstile action="login" resetKey={loginState.attempt} />
                                </div>
                            </div>

                            <div data-login-field className="mt-7">
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
                                            <ShieldCheck aria-hidden="true" size={15} strokeWidth={2} />
                                            Sign in
                                            <ArrowRight
                                                aria-hidden="true"
                                                size={14}
                                                strokeWidth={2}
                                                className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                                            />
                                        </>
                                    )}
                                </button>

                                {statusMessage ? (
                                    <div className="mt-4 border border-[var(--danger)]/45 px-3.5 py-3">
                                        <p
                                            id="login-form-status"
                                            role="status"
                                            aria-live="polite"
                                            aria-atomic="true"
                                            className="text-xs leading-relaxed text-[var(--danger)]"
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
        </main>
    );
}
