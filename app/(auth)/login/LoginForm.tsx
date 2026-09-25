'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react';

import Turnstile from '@/components/ui/Turnstile/Turnstile';
import { urbanist } from '@/lib/fonts';
import { PRELOADER_DASH_LENGTH } from '@/lib/animations/preloader';
import { login } from './LoginActions';
import type { LoginActionState } from './LoginActions';

gsap.registerPlugin(useGSAP);

const INPUT_CLASS =
    'h-11 w-full appearance-none border border-[var(--hairline)] bg-[var(--field-bg)] px-3.5 text-sm tracking-normal text-[var(--text)] caret-[var(--text)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[var(--faint)] hover:border-[var(--hairline-strong)] focus:border-[var(--text)] focus:shadow-[0_0_0_2px_var(--hairline)] [&:-webkit-autofill]:[-webkit-text-fill-color:#ededed] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#0f0f0f_inset] [&:-webkit-autofill]:[caret-color:#ededed] motion-reduce:transition-none';

// Readable sentence-case labels: tiny faint uppercase was hard to scan.
const LABEL_CLASS = 'mb-1.5 block text-[13px] font-medium text-[var(--muted)]';

const SUBMIT_BUTTON_CLASS =
    'group inline-flex h-11 w-full items-center justify-center gap-2 bg-[var(--inverse-bg)] px-4 text-sm font-semibold text-[var(--inverse-text)] transition-[opacity,transform] duration-200 hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100';

const INITIAL_LOGIN_STATE: LoginActionState = {
    status: 'idle',
    message: '',
    attempt: 0,
};

export default function LoginForm() {
    const [email, setEmail] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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
    const monogramRef = useRef<SVGTextElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);

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
            const monogram = monogramRef.current;
            const card = cardRef.current;
            if (!monogram || !card) return;

            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                gsap.set(monogram, { attr: { 'stroke-dashoffset': 0 } });
                return;
            }

            const timeline = gsap.timeline({ defaults: { overwrite: 'auto' } });

            timeline
                .to(monogram, {
                    attr: { 'stroke-dashoffset': 0 },
                    duration: 1.8,
                    ease: 'power2.inOut',
                }, 0)
                .from(card, {
                    autoAlpha: 0,
                    y: 14,
                    duration: 0.6,
                    ease: 'power3.out',
                }, 0.15);

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
            className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[var(--site-bg)] px-5 py-6 text-[var(--text)]"
        >
            {/* Kept faint on purpose: it sets the mood without competing with the form. */}
            <svg
                aria-hidden="true"
                viewBox="0 0 520 130"
                className="pointer-events-none absolute left-1/2 top-1/2 w-[min(120vw,1200px)] -translate-x-1/2 -translate-y-1/2 select-none"
                style={{ overflow: 'visible' }}
            >
                <text
                    ref={monogramRef}
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="79"
                    fontWeight="700"
                    letterSpacing="2"
                    fill="none"
                    stroke="var(--hairline)"
                    strokeWidth="0.4"
                    strokeDasharray={PRELOADER_DASH_LENGTH}
                    strokeDashoffset={PRELOADER_DASH_LENGTH}
                    style={{ fontFamily: urbanist.style.fontFamily }}
                >
                    JM
                </text>
            </svg>

            <div
                ref={cardRef}
                className="relative z-10 w-full max-w-[23rem] border border-[var(--hairline)] bg-[var(--surface)] p-7 shadow-[0_24px_64px_rgba(0,0,0,0.5)]"
            >
                <span className="font-name text-lg font-extrabold leading-none tracking-tight text-[var(--text)]">
                    J<span className="text-[var(--faint)]">M</span>
                </span>

                <h1
                    id="login-heading"
                    className="mt-5 font-display text-[1.65rem] font-bold leading-none tracking-[-0.025em] text-[var(--text)]"
                >
                    Sign in
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    Use your admin account to manage the portfolio.
                </p>

                <form
                    action={formAction}
                    className="mt-6 [color-scheme:dark]"
                    aria-labelledby="login-heading"
                    aria-describedby="login-form-status"
                    aria-busy={isPending}
                >
                    <fieldset disabled={isPending} className="m-0 min-w-0 space-y-4 border-0 p-0">
                        <div>
                            <label htmlFor="login-email" className={LABEL_CLASS}>
                                Email
                            </label>
                            <input
                                id="login-email"
                                name="email"
                                type="email"
                                inputMode="email"
                                autoComplete="username"
                                autoCapitalize="none"
                                spellCheck={false}
                                autoFocus
                                required
                                maxLength={254}
                                value={email}
                                onChange={(event) => setEmail(event.currentTarget.value)}
                                placeholder="you@example.com"
                                className={INPUT_CLASS}
                            />
                        </div>

                        <div>
                            <label htmlFor="login-password" className={LABEL_CLASS}>
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="login-password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
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
                                    className={`${INPUT_CLASS} pr-11`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((isShown) => !isShown)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    aria-pressed={showPassword}
                                    aria-controls="login-password"
                                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[var(--faint)] transition-colors duration-200 hover:text-[var(--text)] focus-visible:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--text)]/45 motion-reduce:transition-none"
                                >
                                    {showPassword ? (
                                        <EyeOff aria-hidden="true" size={16} strokeWidth={1.8} />
                                    ) : (
                                        <Eye aria-hidden="true" size={16} strokeWidth={1.8} />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div>
                            <p className={LABEL_CLASS}>Security check</p>
                            <Turnstile action="login" resetKey={loginState.attempt} />
                        </div>

                        {statusMessage ? (
                            <p
                                id="login-form-status"
                                role="status"
                                aria-live="polite"
                                aria-atomic="true"
                                className="border border-[var(--danger)]/45 px-3 py-2.5 text-xs leading-relaxed text-[var(--danger)]"
                            >
                                {statusMessage}
                            </p>
                        ) : (
                            <p
                                id="login-form-status"
                                role="status"
                                aria-live="polite"
                                aria-atomic="true"
                                className="sr-only"
                            />
                        )}

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
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign in
                                    <ArrowRight
                                        aria-hidden="true"
                                        size={15}
                                        strokeWidth={2}
                                        className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                                    />
                                </>
                            )}
                        </button>
                    </fieldset>
                </form>
            </div>

            <Link
                href="/"
                className="group relative z-10 mt-5 inline-flex items-center gap-1.5 text-[13px] text-[var(--faint)] transition-colors duration-200 hover:text-[var(--text)] focus-visible:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 motion-reduce:transition-none"
            >
                <ArrowLeft
                    aria-hidden="true"
                    size={14}
                    strokeWidth={2}
                    className="transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                />
                Back to portfolio
            </Link>
        </main>
    );
}
