'use client';

import {
    Fragment,
    useCallback,
    useRef,
    useState,
    type FormEvent,
} from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
    ArrowUpRight,
    BriefcaseBusiness,
    GitFork,
    LoaderCircle,
    Mail,
    Send,
    type LucideIcon,
} from 'lucide-react';
import Turnstile, {
    type TurnstileStatus,
} from '@/components/ui/Turnstile/Turnstile';
import {
    CONTACT_CHANNELS,
    type ContactChannel,
    type ContactChannelId,
} from '@/lib/site';

/** Split so the scroll animation can raise the heading word by word. */
const CONTACT_HEADING_WORDS = ["Let's", 'build', 'something', 'reliable.'] as const;

gsap.registerPlugin(ScrollTrigger, useGSAP);

const CONTACT_ICONS: Record<ContactChannelId, LucideIcon> = {
    github: GitFork,
    linkedin: BriefcaseBusiness,
    email: Mail,
};

const VERIFICATION_SERVICE_MESSAGE =
    'Unable to verify your request. Please try again.';
const CAPTCHA_REQUIRED_MESSAGE = 'Please complete the security check.';
const CAPTCHA_REJECTED_MESSAGE = 'Verification failed. Please try again.';
const RATE_LIMIT_MESSAGE =
    'Too many message attempts. Please try again later.';
const PROCESSING_SERVICE_MESSAGE =
    'Unable to process your request right now. Please try again later.';
const MESSAGE_SERVICE_MESSAGE =
    'Unable to send your message right now. Please try again later.';
const MESSAGE_SENT_MESSAGE = 'Message sent successfully.';
const VALIDATION_MESSAGE = 'Please check the information you entered.';
const FIELD_CLASS =
    'min-h-12 w-full border border-[var(--hairline)] bg-[var(--field-bg)] px-4 py-3 text-base leading-relaxed tracking-normal text-[var(--text)] outline-none transition-[border-color,box-shadow] duration-300 placeholder:text-[var(--faint)] hover:border-[var(--hairline-strong)] focus:border-[var(--text)] focus:shadow-[0_0_0_2px_var(--hairline)] motion-reduce:transition-none';
const FIELD_ERROR_CLASS =
    'border-[var(--danger)] focus:border-[var(--danger)] focus:shadow-[0_0_0_2px_var(--hairline)]';
const CONTACT_FIELD_NAMES = ['username', 'email', 'message'] as const;

type ContactFieldName = (typeof CONTACT_FIELD_NAMES)[number];
type ContactFieldErrors = Partial<Record<ContactFieldName, string>>;

interface ParsedContactResponse {
    ok: boolean;
    message?: string;
    fieldErrors: ContactFieldErrors;
}

function parseContactResponse(value: unknown): ParsedContactResponse | null {
    if (typeof value !== 'object' || value === null) return null;

    const response = value as Record<string, unknown>;
    if (typeof response.ok !== 'boolean') return null;

    const parsed: ParsedContactResponse = {
        ok: response.ok,
        fieldErrors: {},
    };

    if (
        typeof response.message === 'string' &&
        response.message.length <= 240
    ) {
        parsed.message = response.message;
    }

    if (typeof response.fieldErrors === 'object' && response.fieldErrors !== null) {
        const responseFieldErrors = response.fieldErrors as Record<string, unknown>;

        for (const fieldName of CONTACT_FIELD_NAMES) {
            const error = responseFieldErrors[fieldName];

            if (typeof error === 'string' && error.length <= 160) {
                parsed.fieldErrors[fieldName] = error;
            }
        }
    }

    return parsed;
}

function ContactChannelItem({ channel }: { channel: ContactChannel }) {
    const Icon = CONTACT_ICONS[channel.id];
    const isWebLink = /^https?:\/\//.test(channel.href);
    const content = (
        <>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--hairline)] text-[var(--text)] transition-colors duration-300 group-hover:border-[var(--text)] motion-reduce:transition-none">
                <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1 font-mono text-xs font-bold uppercase tracking-normal text-[var(--text)]">
                {channel.label}
            </span>
            {channel.href ? (
                <ArrowUpRight
                    aria-hidden="true"
                    size={16}
                    strokeWidth={1.8}
                    className="shrink-0 text-[var(--faint)] transition-[color,transform] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--text)] motion-reduce:transition-none"
                />
            ) : (
                <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--faint)]" />
            )}
        </>
    );

    return (
        <li className="contact-channel min-w-0">
            {channel.href ? (
                <a
                    href={channel.href}
                    target={isWebLink ? '_blank' : undefined}
                    rel={isWebLink ? 'noopener noreferrer' : undefined}
                    className="group flex min-h-16 w-full items-center gap-3 border-b border-[var(--hairline)] px-1 transition-colors duration-300 hover:border-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--site-bg)] motion-reduce:transition-none"
                >
                    {content}
                </a>
            ) : (
                <div className="flex min-h-16 w-full items-center gap-3 border-b border-[var(--hairline)] px-1">
                    {content}
                </div>
            )}
        </li>
    );
}

export default function Contact() {
    const sectionRef = useRef<HTMLElement>(null);
    const isSubmittingRef = useRef(false);
    const hasSubmissionResultRef = useRef(false);
    const [submitStatus, setSubmitStatus] = useState('');
    const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [turnstileResetKey, setTurnstileResetKey] = useState(0);

    // Scroll animation page: everything is scrubbed with the scroll — heading word by word, intro and
    // channels, then the message panel, its fields and the Send button. Side by side (desktop) both
    // columns follow the section; stacked (phones, tablets) the form sits a screen or more below the
    // heading, so each part follows itself and plays while it is actually on screen. Safety: the
    // moment a field is focused (typing, autofill, keyboard), the form snaps to fully shown and stops
    // following the scroll.
    useGSAP(
        () => {
            const section = sectionRef.current;
            if (!section) return;
            const refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh());

            const mm = gsap.matchMedia();
            mm.add(
                // `any` always matches: matchMedia only runs the callback when at least one condition does.
                { any: 'all', wide: '(min-width: 1024px)', reduce: '(prefers-reduced-motion: reduce)' },
                (context) => {
                    const { wide, reduce } = context.conditions as { wide: boolean; reduce: boolean };
                    if (reduce) return;
                    const scrubbed = (trigger: Element, start: string, end: string) => gsap.timeline({
                        defaults: { ease: 'none' },
                        scrollTrigger: { trigger, start, end, scrub: 0.6, invalidateOnRefresh: true },
                    });
                    const intro = section.querySelector('.contact-intro') ?? section;
                    const channels = section.querySelector('.contact-channel')?.parentElement ?? section;

                    const heading = wide ? scrubbed(section, 'top 80%', 'top 5%') : scrubbed(intro, 'top 90%', 'top 35%');
                    heading
                        .fromTo('[data-contact-line]', { scaleX: 0 }, { scaleX: 1, transformOrigin: 'left center', duration: 0.25 }, 0)
                        .fromTo('[data-contact-word]', { yPercent: 110 }, { yPercent: 0, ease: 'power3.out', duration: 0.3, stagger: 0.05 }, 0.05)
                        .fromTo('.contact-intro p', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.25, stagger: 0.08 }, 0.25);
                    (wide ? heading : scrubbed(channels, 'top 92%', 'top 60%'))
                        .fromTo('.contact-channel', { autoAlpha: 0, x: -24 }, { autoAlpha: 1, x: 0, ease: 'power2.out', duration: 0.2, stagger: 0.06 }, wide ? 0.35 : 0);

                    const panel = section.querySelector<HTMLElement>('.contact-form-panel');
                    if (!panel) return;
                    const button = panel.querySelector<HTMLElement>('button[type="submit"]');
                    const fields = gsap.utils.toArray<HTMLElement>('[data-contact-field]', panel);
                    const panelFrom = { autoAlpha: 0, y: 60 };
                    const panelTo = { autoAlpha: 1, y: 0, ease: 'power3.out', duration: 0.35 };
                    const fieldFrom = { autoAlpha: 0, y: 16 };
                    const fieldTo = { autoAlpha: 1, y: 0, duration: 0.18 };
                    const buttonFrom = { clipPath: 'inset(0% 100% 0% 0%)' };
                    const buttonTo = { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut', duration: 0.25 };
                    const form: gsap.core.Timeline[] = [];

                    if (wide) {
                        const timeline = scrubbed(section, 'top 80%', 'top 5%')
                            .fromTo(panel, panelFrom, panelTo, 0.2)
                            .fromTo(fields, fieldFrom, { ...fieldTo, stagger: 0.06 }, 0.42);
                        if (button) timeline.fromTo(button, buttonFrom, buttonTo, 0.72);
                        timeline.to({}, { duration: 0.03 }, 0.97);
                        form.push(timeline);
                    } else {
                        form.push(scrubbed(panel, 'top 92%', 'top 55%').fromTo(panel, panelFrom, panelTo));
                        fields.forEach((field) => form.push(scrubbed(field, 'top 95%', 'top 75%').fromTo(field, fieldFrom, fieldTo)));
                        if (button) form.push(scrubbed(button, 'top 95%', 'top 70%').fromTo(button, buttonFrom, buttonTo));
                    }

                    const settle = () => {
                        form.forEach((timeline) => {
                            timeline.scrollTrigger?.kill(false);
                            timeline.progress(1);
                        });
                    };
                    panel.addEventListener('focusin', settle);
                    return () => panel.removeEventListener('focusin', settle);
                },
                section,
            );

            return () => {
                window.cancelAnimationFrame(refreshFrame);
                mm.revert();
            };
        },
        { scope: sectionRef }
    );

    const handleTurnstileStatus = useCallback(
        (status: TurnstileStatus) => {
            if (isSubmittingRef.current || hasSubmissionResultRef.current) return;

            if (status === 'verified') {
                setSubmitStatus('');
            } else if (status === 'expired') {
                setSubmitStatus(CAPTCHA_REQUIRED_MESSAGE);
            } else if (status === 'error') {
                setSubmitStatus(VERIFICATION_SERVICE_MESSAGE);
            }
        },
        [],
    );

    const clearFieldError = useCallback((fieldName: ContactFieldName) => {
        setFieldErrors((currentErrors) => {
            if (!currentErrors[fieldName]) return currentErrors;

            const nextErrors = { ...currentErrors };
            delete nextErrors[fieldName];
            return nextErrors;
        });
    }, []);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (isSubmittingRef.current) return;

        const form = event.currentTarget;
        const formData = new FormData(form);

        isSubmittingRef.current = true;
        hasSubmissionResultRef.current = false;
        setIsSubmitting(true);
        setSubmitStatus('');
        setFieldErrors({});

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                },
                body: formData,
            });

            let message: string;
            let submissionSucceeded = false;

            if (response.ok) {
                message = MESSAGE_SENT_MESSAGE;
            } else if (response.status === 400) {
                message = VALIDATION_MESSAGE;
            } else if (response.status === 429) {
                message = RATE_LIMIT_MESSAGE;
            } else if (response.status === 503) {
                message = PROCESSING_SERVICE_MESSAGE;
            } else if (response.status === 403) {
                message = CAPTCHA_REJECTED_MESSAGE;
            } else if (response.status === 500) {
                message = MESSAGE_SERVICE_MESSAGE;
            } else {
                message = MESSAGE_SERVICE_MESSAGE;
            }

            try {
                const result: unknown = await response.json();
                const parsedResult = parseContactResponse(result);

                if (parsedResult) {
                    if (parsedResult.message) {
                        message = parsedResult.message;
                    }

                    if (!response.ok) {
                        setFieldErrors(parsedResult.fieldErrors);
                    }

                    submissionSucceeded = response.ok && parsedResult.ok;
                }
            } catch {
                // The status-based fallback remains safe when a response is malformed.
            }

            if (response.ok && !submissionSucceeded) {
                message = MESSAGE_SERVICE_MESSAGE;
            }

            if (submissionSucceeded) {
                form.reset();
            }

            hasSubmissionResultRef.current = true;
            setSubmitStatus(message);
        } catch {
            hasSubmissionResultRef.current = true;
            setSubmitStatus(MESSAGE_SERVICE_MESSAGE);
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
            setTurnstileResetKey((currentKey) => currentKey + 1);
        }
    };

    return (
        <section
            id="contact"
            data-analytics-section="contact"
            ref={sectionRef}
            aria-labelledby="contact-heading"
            className="relative w-full scroll-mt-[calc(var(--nav-height,80px)+2rem)] px-5 py-24 md:px-8 md:py-32"
        >
            <div className="mx-auto max-w-7xl">
                <div className="contact-heading flex w-full items-center gap-4">
                    <p className="shrink-0 font-display text-xs font-bold uppercase leading-none tracking-[0.14em] text-[var(--text)]">
                        Contact
                    </p>
                    <span
                        data-contact-line
                        aria-hidden="true"
                        className="h-px min-w-8 flex-1 bg-[var(--hairline)]"
                    />
                    <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)] sm:inline">
                        07 / Connect
                    </span>
                </div>

                <div className="mt-12 grid items-start gap-12 lg:mt-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(28rem,1.1fr)] lg:gap-16 xl:gap-24">
                    <div className="min-w-0">
                        <div className="contact-intro max-w-2xl">
                            <h2
                                id="contact-heading"
                                className="font-display text-4xl font-bold leading-[1.05] tracking-[-0.025em] text-[var(--text)] sm:text-5xl lg:text-[3.4rem]"
                            >
                                {CONTACT_HEADING_WORDS.map((word, index) => (
                                    <Fragment key={word}>
                                        <span className="inline-block overflow-hidden pb-[0.06em] align-bottom">
                                            <span data-contact-word className="inline-block">
                                                {word}
                                            </span>
                                        </span>
                                        {/* The space sits outside the mask: inside an inline-block it collapses. */}
                                        {index < CONTACT_HEADING_WORDS.length - 1 ? ' ' : null}
                                    </Fragment>
                                ))}
                            </h2>
                            <p className="mt-5 max-w-xl text-base leading-[1.75] text-[var(--muted)] sm:text-lg">
                                Have a project, role, or collaboration in mind? Share the context and start the conversation.
                            </p>

                            <p className="mt-10 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--faint)] sm:mt-12">
                                Direct channels
                            </p>
                        </div>

                        <ul className="mt-3 grid min-w-0 grid-cols-1 gap-x-6 sm:grid-cols-3 lg:max-w-lg lg:grid-cols-1">
                            {CONTACT_CHANNELS.map((channel) => (
                                <ContactChannelItem key={channel.id} channel={channel} />
                            ))}
                        </ul>
                    </div>

                    <div className="contact-form-panel min-w-0 border border-[var(--hairline)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] sm:p-7 lg:p-8">
                        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--hairline)] pb-5">
                            <h3 className="font-display text-xl font-bold tracking-[-0.02em] text-[var(--text)] sm:text-2xl">
                                Message details
                            </h3>
                            <span className="border border-[var(--hairline)] px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--faint)]">
                                All fields required
                            </span>
                        </div>

                        <form
                            className="mt-6"
                            aria-describedby="contact-form-status"
                            aria-busy={isSubmitting}
                            onSubmit={handleSubmit}
                        >
                            <fieldset
                                disabled={isSubmitting}
                                className="m-0 min-w-0 border-0 p-0"
                            >
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <div data-contact-field className="min-w-0">
                                    <label
                                        htmlFor="contact-username"
                                        className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--faint)]"
                                    >
                                        Username
                                    </label>
                                    <input
                                        id="contact-username"
                                        name="username"
                                        type="text"
                                        autoComplete="name"
                                        maxLength={80}
                                        required
                                        placeholder="Your name"
                                        aria-invalid={Boolean(fieldErrors.username)}
                                        aria-describedby={fieldErrors.username ? 'contact-username-error' : undefined}
                                        onInput={() => clearFieldError('username')}
                                        className={`${FIELD_CLASS} ${fieldErrors.username ? FIELD_ERROR_CLASS : ''}`}
                                    />
                                    {fieldErrors.username ? (
                                        <p
                                            id="contact-username-error"
                                            className="mt-1.5 text-xs leading-relaxed text-[var(--danger)]"
                                        >
                                            {fieldErrors.username}
                                        </p>
                                    ) : null}
                                </div>

                                <div data-contact-field className="min-w-0">
                                    <label
                                        htmlFor="contact-email"
                                        className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--faint)]"
                                    >
                                        Email
                                    </label>
                                    <input
                                        id="contact-email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        maxLength={254}
                                        required
                                        placeholder="you@example.com"
                                        aria-invalid={Boolean(fieldErrors.email)}
                                        aria-describedby={fieldErrors.email ? 'contact-email-error' : undefined}
                                        onInput={() => clearFieldError('email')}
                                        className={`${FIELD_CLASS} ${fieldErrors.email ? FIELD_ERROR_CLASS : ''}`}
                                    />
                                    {fieldErrors.email ? (
                                        <p
                                            id="contact-email-error"
                                            className="mt-1.5 text-xs leading-relaxed text-[var(--danger)]"
                                        >
                                            {fieldErrors.email}
                                        </p>
                                    ) : null}
                                </div>

                                <div data-contact-field className="min-w-0 sm:col-span-2">
                                    <label
                                        htmlFor="contact-message"
                                        className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--faint)]"
                                    >
                                        Message
                                    </label>
                                    <textarea
                                        id="contact-message"
                                        name="message"
                                        rows={6}
                                        maxLength={2000}
                                        required
                                        placeholder="Tell me about the project, role, or collaboration."
                                        aria-invalid={Boolean(fieldErrors.message)}
                                        aria-describedby={fieldErrors.message ? 'contact-message-error' : undefined}
                                        onInput={() => clearFieldError('message')}
                                        className={`${FIELD_CLASS} min-h-40 resize-y ${fieldErrors.message ? FIELD_ERROR_CLASS : ''}`}
                                    />
                                    {fieldErrors.message ? (
                                        <p
                                            id="contact-message-error"
                                            className="mt-1.5 text-xs leading-relaxed text-[var(--danger)]"
                                        >
                                            {fieldErrors.message}
                                        </p>
                                    ) : null}
                                </div>

                                <div data-contact-field className="min-w-0 sm:col-span-2">
                                    <Turnstile
                                        action="contact"
                                        resetKey={turnstileResetKey}
                                        onStatusChange={handleTurnstileStatus}
                                    />
                                </div>
                            </div>

                            <div data-contact-field className="mt-8 flex flex-col gap-4 sm:col-span-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="group inline-flex min-h-14 w-full items-center justify-center gap-2.5 bg-[var(--inverse-bg)] px-5 py-3 font-mono text-base font-bold uppercase tracking-[0.08em] text-[var(--inverse-text)] transition-[opacity,transform] duration-200 hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none motion-reduce:active:scale-100"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <LoaderCircle
                                                aria-hidden="true"
                                                size={18}
                                                strokeWidth={2}
                                                className="animate-spin motion-reduce:animate-none"
                                            />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            Send message
                                            <Send aria-hidden="true" size={18} strokeWidth={2} />
                                        </>
                                    )}
                                </button>

                                <p
                                    id="contact-form-status"
                                    role="status"
                                    aria-live="polite"
                                    aria-atomic="true"
                                    className="min-h-5 text-center text-xs leading-relaxed text-[var(--muted)]"
                                >
                                    {submitStatus}
                                </p>
                            </div>
                            </fieldset>
                        </form>
                        <p className="mt-5 border-t border-[var(--hairline)] pt-4 text-center text-xs leading-relaxed text-[var(--muted)]">
                            Your message goes straight to my email and isn&apos;t stored on this site.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
