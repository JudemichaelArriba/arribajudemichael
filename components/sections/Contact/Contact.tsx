'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
    ArrowUpRight,
    BriefcaseBusiness,
    GitFork,
    Mail,
    Send,
    type LucideIcon,
} from 'lucide-react';
import Button from '@/components/ui/Button';
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

const STATIC_FORM_NOTICE = 'This form is a preview for now; your message has not been sent.';
const FIELD_CLASS =
    'min-h-12 w-full rounded-lg border border-white/[0.09] bg-black/25 px-4 py-3 text-base leading-relaxed tracking-normal text-[var(--text)] outline-none transition-[border-color,background-color,box-shadow] duration-300 placeholder:text-[var(--muted)]/30 hover:border-white/[0.15] focus:border-[var(--signal)]/55 focus:bg-white/[0.035] focus:shadow-[0_0_0_3px_rgba(195,109,252,0.09)] motion-reduce:transition-none';

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
    const [submitStatus, setSubmitStatus] = useState('');

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

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitStatus(STATIC_FORM_NOTICE);
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
                            onSubmit={handleSubmit}
                            onInput={() => {
                                if (submitStatus) setSubmitStatus('');
                            }}
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
                                        className={FIELD_CLASS}
                                    />
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
                                        className={FIELD_CLASS}
                                    />
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
                                        className={`${FIELD_CLASS} min-h-40 resize-y`}
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
                                        Send message
                                        <Send aria-hidden="true" size={20} strokeWidth={2.2} />
                                    </span>
                                </Button>

                                <p
                                    id="contact-form-status"
                                    role="status"
                                    aria-live="polite"
                                    className="min-h-5 max-w-md text-center text-xs leading-relaxed text-[var(--muted)]/62"
                                >
                                    {submitStatus}
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}
