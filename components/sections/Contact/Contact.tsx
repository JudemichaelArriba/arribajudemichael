'use client';

import {
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
import Button from '@/components/ui/Button';
import Turnstile, {
    type TurnstileStatus,
} from '@/components/ui/Turnstile/Turnstile';
import {
    CONTACT_CHANNELS,
    type ContactChannel,
    type ContactChannelId,
} from '@/lib/site';

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
    'min-h-12 w-full rounded-lg border border-white/[0.09] bg-black/25 px-4 py-3 text-base leading-relaxed tracking-normal text-[var(--text)] outline-none transition-[border-color,background-color,box-shadow] duration-300 placeholder:text-[var(--muted)]/30 hover:border-white/[0.15] focus:border-[var(--signal)]/55 focus:bg-white/[0.035] focus:shadow-[0_0_0_3px_rgba(195,109,252,0.09)] motion-reduce:transition-none';
const FIELD_ERROR_CLASS =
    'border-red-400/45 focus:border-red-300/70 focus:shadow-[0_0_0_3px_rgba(248,113,113,0.08)]';
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
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border border-white/[0.09] bg-white/[0.025] text-[var(--signal)]">
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
                    className="shrink-0 text-[var(--muted)]/45 transition-[color,transform] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--signal)] motion-reduce:transition-none"
                />
            ) : (
                <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--signal)]/45" />
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
                    className="group flex min-h-16 w-full items-center gap-3 border-b border-white/[0.075] px-1 transition-colors duration-300 hover:border-[var(--signal)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black motion-reduce:transition-none"
                >
                    {content}
                </a>
            ) : (
                <div className="flex min-h-16 w-full items-center gap-3 border-b border-white/[0.075] px-1">
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

    useGSAP(
        () => {
            const section = sectionRef.current;
            if (!section) return;

            const heading = section.querySelector<HTMLElement>('.contact-heading');
            const intro = section.querySelector<HTMLElement>('.contact-intro');
            const formPanel = section.querySelector<HTMLElement>('.contact-form-panel');
            const lines = gsap.utils.toArray<HTMLElement>('[data-contact-line]', section);
            const channels = gsap.utils.toArray<HTMLElement>('.contact-channel', section);
            const fields = gsap.utils.toArray<HTMLElement>('[data-contact-field]', section);
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const revealTargets = [heading, intro, formPanel].filter(
                (target): target is HTMLElement => target !== null
            );
            const refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh());

            if (prefersReducedMotion) {
                gsap.set([...revealTargets, ...lines, ...channels, ...fields], {
                    autoAlpha: 1,
                    x: 0,
                    y: 0,
                    scaleX: 1,
                    clearProps: 'transform,opacity,visibility,willChange',
                });
                return () => window.cancelAnimationFrame(refreshFrame);
            }

            const setInitialState = () => {
                gsap.set(heading, { autoAlpha: 0, y: 14 });
                gsap.set(intro, { autoAlpha: 0, y: 20 });
                gsap.set(channels, { autoAlpha: 0, x: -16, y: 8 });
                gsap.set(formPanel, { autoAlpha: 0, y: 26 });
                gsap.set(fields, { autoAlpha: 0, y: 14 });
                lines.forEach((line, index) => {
                    gsap.set(line, {
                        scaleX: 0,
                        transformOrigin: index === 0 ? 'right center' : 'left center',
                    });
                });
            };

            setInitialState();

            const timeline = gsap.timeline({
                paused: true,
                defaults: { overwrite: 'auto', force3D: true },
            });

            timeline
                .to(heading, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.56,
                    ease: 'power3.out',
                    clearProps: 'transform,opacity,visibility,willChange',
                }, 0)
                .to(lines, {
                    scaleX: 1,
                    duration: 0.68,
                    ease: 'power3.out',
                    stagger: 0.04,
                    clearProps: 'transform,willChange',
                }, 0.06)
                .to(intro, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.64,
                    ease: 'power3.out',
                    clearProps: 'transform,opacity,visibility,willChange',
                }, 0.12)
                .to(channels, {
                    autoAlpha: 1,
                    x: 0,
                    y: 0,
                    duration: 0.56,
                    ease: 'power3.out',
                    stagger: 0.07,
                    clearProps: 'transform,opacity,visibility,willChange',
                }, 0.22)
                .to(formPanel, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.66,
                    ease: 'power3.out',
                    clearProps: 'transform,opacity,visibility,willChange',
                }, 0.18)
                .to(fields, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.52,
                    ease: 'power3.out',
                    stagger: 0.055,
                    clearProps: 'transform,opacity,visibility,willChange',
                }, 0.34);

            const resetReveal = () => {
                timeline.pause(0, true);
                setInitialState();
            };

            const playReveal = () => {
                resetReveal();
                timeline.restart(true);
            };

            const trigger = ScrollTrigger.create({
                trigger: section,
                start: 'top 86%',
                end: 'bottom top',
                invalidateOnRefresh: true,
                onEnter: playReveal,
                onLeaveBack: resetReveal,
            });

            return () => {
                window.cancelAnimationFrame(refreshFrame);
                trigger.kill(false);
                timeline.kill();
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
            ref={sectionRef}
            aria-labelledby="contact-heading"
            className="relative w-full scroll-mt-[calc(var(--nav-height,80px)+2rem)] px-5 py-24 md:px-8 md:py-32"
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[var(--signal)]/20 to-transparent md:inset-x-8"
            />

            <div className="mx-auto max-w-7xl">
                <div className="contact-heading flex w-full items-center gap-4">
                    <span
                        data-contact-line
                        aria-hidden="true"
                        className="h-px w-8 shrink-0 bg-gradient-to-r from-transparent to-[var(--signal)]/55 sm:w-12"
                    />
                    <p className="shrink-0 font-mono text-xs font-extrabold uppercase leading-none tracking-normal text-[color-mix(in_srgb,var(--signal)_82%,#ffffff_18%)]">
                        Contact
                    </p>
                    <span
                        data-contact-line
                        aria-hidden="true"
                        className="h-px min-w-8 flex-1 bg-gradient-to-r from-[var(--signal)]/45 via-white/10 to-transparent"
                    />
                    <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-normal text-[var(--muted)]/48 sm:inline">
                        07 / Connect
                    </span>
                </div>

                <div className="mt-12 grid items-start gap-12 lg:mt-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(28rem,1.1fr)] lg:gap-16 xl:gap-24">
                    <div className="min-w-0">
                        <div className="contact-intro max-w-2xl">
                            <h2
                                id="contact-heading"
                                className="font-display text-4xl font-extrabold leading-[1.05] tracking-normal text-[var(--text)] sm:text-5xl lg:text-[3.5rem]"
                            >
                                Let&apos;s build something reliable.
                            </h2>
                            <p className="mt-5 max-w-xl text-base leading-[1.75] text-[var(--muted)]/68 sm:text-lg">
                                Have a project, role, or collaboration in mind? Share the context and start the conversation.
                            </p>

                            <p className="mt-10 font-mono text-[10px] font-bold uppercase tracking-normal text-[var(--signal)]/72 sm:mt-12">
                                Direct channels
                            </p>
                        </div>

                        <ul className="mt-3 grid min-w-0 grid-cols-1 gap-x-6 sm:grid-cols-3 lg:max-w-lg lg:grid-cols-1">
                            {CONTACT_CHANNELS.map((channel) => (
                                <ContactChannelItem key={channel.id} channel={channel} />
                            ))}
                        </ul>
                    </div>

                    <div className="contact-form-panel min-w-0 rounded-lg border border-white/[0.085] bg-white/[0.025] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] sm:p-7 lg:p-8">
                        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.07] pb-5">
                            <h3 className="font-display text-xl font-extrabold tracking-normal text-[var(--text)] sm:text-2xl">
                                Message details
                            </h3>
                            <span className="font-mono text-[9px] font-bold uppercase tracking-normal text-[var(--muted)]/45">
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
                                        className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-normal text-[var(--muted)]/65"
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
                                            className="mt-1.5 text-xs leading-relaxed text-red-300/90"
                                        >
                                            {fieldErrors.username}
                                        </p>
                                    ) : null}
                                </div>

                                <div data-contact-field className="min-w-0">
                                    <label
                                        htmlFor="contact-email"
                                        className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-normal text-[var(--muted)]/65"
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
                                            className="mt-1.5 text-xs leading-relaxed text-red-300/90"
                                        >
                                            {fieldErrors.email}
                                        </p>
                                    ) : null}
                                </div>

                                <div data-contact-field className="min-w-0 sm:col-span-2">
                                    <label
                                        htmlFor="contact-message"
                                        className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-normal text-[var(--muted)]/65"
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
                                            className="mt-1.5 text-xs leading-relaxed text-red-300/90"
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

                            <div data-contact-field className="mt-8 flex flex-col items-center gap-4">
                                <Button
                                    type="submit"
                                    variant="specular"
                                    size="lg"
                                    radius={999}
                                    tint="#490058"
                                    baseColor="#7C3AED"
                                    lineColor="#E945F5"
                                    glowProximity={60}
                                    className="!min-h-16 !w-full !max-w-[22rem] !px-7 !text-lg sm:!px-12"
                                >
                                    <span className="inline-flex items-center gap-2.5">
                                        {isSubmitting ? (
                                            <>
                                                <LoaderCircle
                                                    aria-hidden="true"
                                                    size={20}
                                                    strokeWidth={2.2}
                                                    className="animate-spin motion-reduce:animate-none"
                                                />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                Send message
                                                <Send aria-hidden="true" size={20} strokeWidth={2.2} />
                                            </>
                                        )}
                                    </span>
                                </Button>

                                <p
                                    id="contact-form-status"
                                    role="status"
                                    aria-live="polite"
                                    aria-atomic="true"
                                    className="min-h-5 max-w-md text-center text-xs leading-relaxed text-[var(--muted)]/62"
                                >
                                    {submitStatus}
                                </p>
                            </div>
                            </fieldset>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}
