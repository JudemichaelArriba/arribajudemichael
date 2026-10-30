'use client';

import {
    Fragment,
    useEffect,
    useMemo,
    useRef,
    useState,
    type FormEvent,
    type Ref,
    type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useChat } from '@ai-sdk/react';
import { APICallError, DefaultChatTransport } from 'ai';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ArrowRight, CornerDownLeft, Mic, Square, X } from 'lucide-react';
import type { SiteSectionId } from '@/lib/site';
import { useMicLevel } from '@/lib/useMicLevel';
import { useSpeechToText, type SpeechToTextError } from '@/lib/useSpeechToText';
import {
    MAX_QUESTION_LENGTH,
    getSectionLabel,
    toAnswerSegments,
    toTurns,
    toWireMessages,
    type ChatTurn,
} from './chatMessages';
import { useRevealedText } from './useRevealedText';

gsap.registerPlugin(useGSAP);

interface AskOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    /** Runs once the close animation has finished. */
    onClosed: () => void;
}

const STARTERS = [
    'What does Jude build?',
    'Which tech stack does he use most?',
    'Walk me through his experience',
    'Is he open to new roles?',
] as const;

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
const COUNTER_THRESHOLD = MAX_QUESTION_LENGTH - 100;
const MAX_INPUT_HEIGHT = 160;
const FOLLOW_THRESHOLD = 96;
/** Where the empty state's mic lands in the open timeline: with the privacy note, after the rule. */
const VOICE_ENTRANCE_AT = 1.0;

type ErrorKind = 'rate_limited' | 'unavailable' | 'error';

const ERROR_COPY: Record<ErrorKind, string> = {
    rate_limited: "You've asked a lot of questions — try again in a few minutes.",
    unavailable: 'Ask is resting right now. Please try again later.',
    error: 'Something went wrong, please try again.',
};

const VOICE_HINT_COPY: Record<SpeechToTextError, string> = {
    unavailable: "Voice input isn't available in this browser. Please type your message.",
    'not-allowed': "Mic access blocked — allow it in your browser's site settings, or type your message.",
    'no-microphone': 'No microphone found. Please type your message.',
    'no-speech': "Didn't catch anything — press the mic and try again, or type your message.",
};

function toErrorKind(error: Error): ErrorKind {
    if (APICallError.isInstance(error)) {
        if (error.statusCode === 429) return 'rate_limited';
        if (error.statusCode === 503) return 'unavailable';
    }
    return 'error';
}

/** Phones and tablets: the primary pointer is a finger, so focusing a field opens a keyboard. */
function prefersTouchInput(): boolean {
    return window.matchMedia('(pointer: coarse)').matches;
}

function pad(index: number): string {
    return String(index + 1).padStart(2, '0');
}

function ThinkingDots() {
    return (
        <span aria-hidden="true" className="inline-flex gap-1">
            <span className="size-[5px] bg-[var(--text)] motion-safe:animate-pulse" />
            <span className="size-[5px] bg-[var(--text)] opacity-55 motion-safe:animate-pulse motion-safe:[animation-delay:150ms]" />
            <span className="size-[5px] bg-[var(--text)] opacity-25 motion-safe:animate-pulse motion-safe:[animation-delay:300ms]" />
        </span>
    );
}

interface VoiceButtonProps {
    listening: boolean;
    hearing: boolean;
    /** A live mic level is available; `meterRef` receives it as `--mic-level`. */
    metered: boolean;
    meterRef: Ref<HTMLSpanElement>;
    disabled?: boolean;
    onToggle: () => void;
    className: string;
}

function VoiceButton({ listening, hearing, metered, meterRef, disabled, onToggle, className }: VoiceButtonProps) {
    return (
        <button
            type="button"
            data-ask-voice
            onClick={onToggle}
            disabled={disabled}
            aria-label="Voice input"
            aria-pressed={listening}
            className={`relative inline-flex shrink-0 items-center justify-center transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 disabled:opacity-40 motion-reduce:transition-none ${className}`}
        >
            {listening ? (
                <>
                    <Square aria-hidden="true" size={12} strokeWidth={2.4} />
                    {metered ? (
                        // Three bars follow the live mic level the instant a sound is made.
                        <span ref={meterRef} aria-hidden="true" className="absolute right-1.5 top-1.5 flex h-2 items-end gap-px">
                            <span className="h-full w-0.5 origin-bottom bg-current [transform:scaleY(calc(0.25+var(--mic-level,0)*0.5))]" />
                            <span className="h-full w-0.5 origin-bottom bg-current [transform:scaleY(calc(0.25+var(--mic-level,0)*0.75))]" />
                            <span className="h-full w-0.5 origin-bottom bg-current [transform:scaleY(calc(0.25+var(--mic-level,0)*0.6))]" />
                        </span>
                    ) : (
                        // No level reading (phones, or before the mic opens): dim while waiting,
                        // pulsing once speech is detected.
                        <span
                            aria-hidden="true"
                            className={`absolute right-1.5 top-1.5 size-[5px] bg-current transition-opacity duration-300 ${hearing ? 'motion-safe:animate-pulse' : 'opacity-35'}`}
                        />
                    )}
                </>
            ) : (
                <Mic aria-hidden="true" size={15} strokeWidth={2} />
            )}
        </button>
    );
}

interface AnswerTextProps {
    answer: string;
    /** Fade in words as they are revealed. Off for answers that were already complete. */
    animate: boolean;
}

// One flat list keyed by word position: a word that is already on screen keeps its element (and
// its finished fade), and only words that arrive later mount with the animation.
function AnswerText({ answer, animate }: AnswerTextProps) {
    const wordClassName = animate ? 'motion-safe:animate-ask-word' : undefined;
    let wordIndex = 0;

    return toAnswerSegments(answer).flatMap((segment) => {
        if (segment.kind === 'link') {
            return [
                <a
                    key={`w${wordIndex++}`}
                    href={segment.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`underline decoration-[var(--hairline-strong)] underline-offset-4 transition-colors hover:decoration-[var(--text)] ${wordClassName ?? ''}`}
                >
                    {segment.text}
                </a>,
            ];
        }

        return segment.text
            .split(/(\s+)/)
            .filter(Boolean)
            .map((token) =>
                /^\s+$/.test(token) ? (
                    <Fragment key={`s${wordIndex}`}>{token}</Fragment>
                ) : (
                    <span key={`w${wordIndex++}`} className={wordClassName}>
                        {token}
                    </span>
                ),
            );
    });
}

interface TurnProps {
    turn: ChatTurn;
    index: number;
    isLatest: boolean;
    isStreaming: boolean;
    isWaiting: boolean;
    onJump: (section: SiteSectionId) => void;
}

function Turn({ turn, index, isLatest, isStreaming, isWaiting, onJump }: TurnProps) {
    // Decided once, when the turn mounts: an answer that arrives while it is on screen is revealed
    // word by word; answers that already exist (older turns) render as they are.
    const [revealAnswer] = useState(() => !turn.hasAnswer);
    const answerComplete = !(isLatest && (isStreaming || isWaiting));
    const visibleAnswer = useRevealedText(turn.answer, revealAnswer, answerComplete);
    const isRevealing = visibleAnswer.length < turn.answer.length;
    const isWriting = isLatest && (isStreaming || isRevealing);
    const showSections = turn.hasAnswer && turn.sections.length > 0 && !isWriting;

    return (
        <li className={`transition-opacity duration-300 ${isLatest ? 'opacity-100' : 'opacity-55 hover:opacity-100'}`}>
            {index > 0 ? <div aria-hidden="true" className="my-8 h-px bg-[var(--hairline)] sm:ml-16" /> : null}

            {/* GSAP animates this wrapper: the <li>'s own opacity transition (for dimming older turns)
                would fight a per-frame tween. */}
            <div data-ask-turn>
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-5">
                    <span className="w-11 shrink-0 font-mono text-[10px] tracking-[0.14em] text-[var(--faint)]">Q.{pad(index)}</span>
                    <h3 className="min-w-0 break-words font-display text-2xl font-bold leading-[1.12] tracking-[-0.025em] text-[var(--text)] md:text-[2.1rem]">
                        {turn.question}
                    </h3>
                </div>

                <div className="mt-4 flex flex-col gap-1.5 sm:flex-row sm:gap-5">
                    <span className="w-11 shrink-0 pt-1 font-mono text-[10px] tracking-[0.14em] text-[var(--faint)]">A.{pad(index)}</span>
                    <div className="min-w-0 max-w-[45rem]">
                        {visibleAnswer ? (
                            <p className={`whitespace-pre-wrap break-words text-base leading-[1.7] md:text-[17px] ${isLatest ? 'text-[var(--text)]' : 'text-[var(--muted)]'}`}>
                                <AnswerText answer={visibleAnswer} animate={revealAnswer} />
                                {isWriting ? (
                                    <span aria-hidden="true" className="ml-0.5 inline-block h-[1.1em] w-0.5 translate-y-[0.18em] bg-[var(--text)] motion-safe:animate-pulse" />
                                ) : null}
                            </p>
                        ) : isLatest && (isWaiting || isWriting) ? (
                            <p className="flex items-center gap-3 pt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--faint)]">
                                <ThinkingDots />
                                Thinking
                            </p>
                        ) : null}

                        {showSections ? (
                            <div className="mt-4 flex flex-wrap items-center gap-2.5">
                                <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">Jump to</span>
                                {turn.sections.map((section) => (
                                    <button
                                        key={section}
                                        type="button"
                                        onClick={() => onJump(section)}
                                        className="inline-flex h-8 items-center gap-2 border border-[var(--hairline-strong)] px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text)] transition-colors duration-300 hover:border-[var(--inverse-bg)] hover:bg-[var(--inverse-bg)] hover:text-[var(--inverse-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 motion-reduce:transition-none"
                                    >
                                        {getSectionLabel(section)}
                                        <ArrowRight aria-hidden="true" size={12} strokeWidth={2.2} />
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </li>
    );
}

export default function AskOverlay({ isOpen, onClose, onClosed }: AskOverlayProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const conversationRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<gsap.core.Timeline | null>(null);
    const onClosedRef = useRef(onClosed);
    const followStreamRef = useRef(true);
    const wasTypingRef = useRef(false);
    const [draft, setDraft] = useState('');
    // Dictation appends to whatever was already typed (`base`). Once the visitor types, sends or
    // leaves, `active` turns off so a late result can never overwrite or refill the input.
    const dictationRef = useRef({ active: false, base: '' });
    const wasListeningRef = useRef(false);

    // Speech only ever fills the draft; sending stays a deliberate Send or Enter.
    const speech = useSpeechToText({
        onTranscript: (heard) => {
            const { active, base } = dictationRef.current;
            if (!active) return;
            setDraft((base && heard ? `${base} ${heard}` : base || heard).slice(0, MAX_QUESTION_LENGTH));
        },
    });
    const { listening, stop: stopListening } = speech;
    const voiceMeterRef = useRef<HTMLSpanElement>(null);
    // Started only once the recognizer has opened the mic, so it never prompts on its own.
    const micLevel = useMicLevel(listening && speech.micOpen, voiceMeterRef);
    // The local meter reacts within a frame; the speech service's own detection lags behind it.
    const hearing = speech.hearing || micLevel.heard;
    // Speech before the mic opens is lost, so the first state says to wait.
    const voicePlaceholder = !speech.micOpen ? 'Starting mic…' : hearing ? 'Hearing you…' : 'Listening…';
    const voiceHint = speech.error ? VOICE_HINT_COPY[speech.error] : null;

    useEffect(() => {
        onClosedRef.current = onClosed;
    }, [onClosed]);

    const transport = useMemo(
        () =>
            new DefaultChatTransport({
                api: '/api/chat',
                prepareSendMessagesRequest: ({ messages }) => ({ body: { messages: toWireMessages(messages) } }),
            }),
        [],
    );

    const { messages, sendMessage, status, error, stop, setMessages, regenerate, clearError } = useChat({ transport });

    const turns = useMemo(() => toTurns(messages), [messages]);
    const hasConversation = turns.length > 0;
    const hadConversationRef = useRef(hasConversation);
    const isWaiting = status === 'submitted';
    const isStreaming = status === 'streaming';
    const isBusy = isWaiting || isStreaming;
    const errorKind = status === 'error' && error ? toErrorKind(error) : null;

    // The approved motion, built fresh for whichever view is showing. Opening: the backdrop fades
    // in, the label drops, then either the empty state (headline rises out of its mask, rule
    // draws, starters stagger in) or the conversation (latest turns rise, docked input follows).
    // Closing has its own short timeline so it never replays steps for elements that are gone.
    useGSAP(
        () => {
            const root = rootRef.current;
            if (!root) return;

            const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const select = gsap.utils.selector(root);
            // The blur layer and the content fade separately. Fading a parent of the
            // backdrop-filter instead makes Chrome skip the blur until it is fully opaque.
            const backdrop = select('[data-ask-backdrop]');
            const content = select('[data-ask-content]');

            timelineRef.current?.kill();

            // The content layer fades with opacity only, never visibility: the input must stay
            // focusable from the first frame. While closed, the dialog is inert and has
            // pointer-events: none, which already hides it from focus, clicks and screen readers.
            if (!isOpen) {
                const closing = gsap.timeline({ onComplete: () => onClosedRef.current() });
                if (reduceMotion) {
                    closing
                        .to(content, { opacity: 0, duration: 0.15, ease: 'none' })
                        .to(backdrop, { autoAlpha: 0, duration: 0.15, ease: 'none' }, 0);
                } else {
                    closing
                        .to(content, { opacity: 0, y: -12, duration: 0.32, ease: 'power2.in' })
                        .to(backdrop, { autoAlpha: 0, duration: 0.4, ease: 'power2.inOut' }, 0.1);
                }
                timelineRef.current = closing;
                return;
            }

            const timeline = gsap.timeline();

            const focusInput = () => {
                const dialog = rootRef.current;
                if (!dialog || dialog.inert) return;
                // On touch screens, focusing the input would throw the keyboard over the overlay
                // before the visitor has chosen to type; move focus into the dialog instead.
                if (prefersTouchInput()) dialog.focus({ preventScroll: true });
                else inputRef.current?.focus({ preventScroll: true });
            };

            if (reduceMotion) {
                timeline
                    .fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'none' })
                    .fromTo(content, { opacity: 0, y: 0 }, { opacity: 1, y: 0, duration: 0.2, ease: 'none' }, 0)
                    .call(focusInput, undefined, 0);
                timelineRef.current = timeline;
                return;
            }

            // Opacity, not autoAlpha: the docked input lives inside a risen element and a
            // visibility: hidden ancestor would make the browser refuse to focus it.
            const rise = (targets: Element[], position: number, extra: gsap.TweenVars = {}) => {
                if (!targets.length) return;
                timeline.fromTo(
                    targets,
                    { y: 18, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.7,
                        ease: 'expo.out',
                        clearProps: 'transform,opacity',
                        ...extra,
                    },
                    position,
                );
            };

            timeline
                .fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.55, ease: 'power3.out' })
                .fromTo(content, { opacity: 0, y: 0 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0.1)
                .call(focusInput, undefined, 0)
                .fromTo(
                    select('[data-ask-label], [data-ask-controls]'),
                    { y: -8, autoAlpha: 0 },
                    { y: 0, autoAlpha: 1, duration: 0.45, ease: 'power3.out', stagger: 0.05 },
                    0.2,
                );

            const headline = select('[data-ask-headline]');
            if (headline.length) {
                timeline.fromTo(headline, { yPercent: 110 }, { yPercent: 0, duration: 0.8, ease: 'expo.out' }, 0.35);
            }
            const rule = select('[data-ask-rule]');
            if (rule.length) {
                timeline.fromTo(rule, { scaleX: 0 }, { scaleX: 1, transformOrigin: 'left center', duration: 0.7, ease: 'expo.out' }, 0.95);
            }
            rise(select('[data-ask-subline]'), 0.6, { duration: 0.6 });
            // The privacy note follows the rule; in the conversation view it rides with the dock.
            rise(select('[data-ask-note]').filter((note) => !note.closest('[data-ask-dock]')), 1.0, { duration: 0.6 });
            rise(select('[data-ask-starters-label]'), 1.05, { duration: 0.5 });
            rise(select('[data-ask-chip]'), 1.1, { y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.07 });

            // Conversation view: only the last few turns are near the viewport, so only they move.
            rise(select('[data-ask-turn]').slice(-3), 0.3, { stagger: 0.08 });
            rise(select('[data-ask-dock]'), 0.45);

            rise(select('[data-ask-footer]'), headline.length ? 1.25 : 0.55, { duration: 0.6 });

            timelineRef.current = timeline;
        },
        { scope: rootRef, dependencies: [isOpen] },
    );

    // Voice support is detected after the overlay mounts, so on the first open the mic arrives
    // after the open timeline was built. Either way it gets the note's rise on the note's beat.
    // (In the conversation view it sits inside the dock and rises with it.)
    useGSAP(
        () => {
            const opening = timelineRef.current;
            if (!isOpen || !speech.supported || !opening) return;
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

            const mic = gsap.utils
                .selector(rootRef)('[data-ask-voice]')
                .filter((button) => !button.closest('[data-ask-dock]'));
            if (!mic.length) return;

            gsap.killTweensOf(mic);
            gsap.fromTo(
                mic,
                { y: 18, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.6,
                    ease: 'expo.out',
                    clearProps: 'transform,opacity',
                    delay: Math.max(0, VOICE_ENTRANCE_AT - opening.time()),
                },
            );
        },
        { scope: rootRef, dependencies: [isOpen, speech.supported] },
    );

    useEffect(() => {
        if (!isOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    // A phone keyboard shrinks only the *visual* viewport; the layout viewport a fixed element is
    // sized against stays full height, so the docked input would sit underneath the keyboard.
    // Pin the overlay to the visible area instead, and keep the newest message in view as it
    // shrinks. On desktop the visual viewport matches the window, so nothing changes.
    useEffect(() => {
        const root = rootRef.current;
        const viewport = window.visualViewport;
        if (!isOpen || !root || !viewport) return;

        const fitToVisibleArea = () => {
            root.style.top = `${viewport.offsetTop}px`;
            root.style.height = `${viewport.height}px`;
            const scroller = scrollRef.current;
            if (scroller && followStreamRef.current) scroller.scrollTop = scroller.scrollHeight;
        };

        fitToVisibleArea();
        viewport.addEventListener('resize', fitToVisibleArea);
        viewport.addEventListener('scroll', fitToVisibleArea);
        return () => {
            viewport.removeEventListener('resize', fitToVisibleArea);
            viewport.removeEventListener('scroll', fitToVisibleArea);
            root.style.top = '';
            root.style.height = '';
        };
    }, [isOpen]);

    // Keep the newest exchange in view as the answer grows (it grows on the reveal clock, not on
    // network events, so watch the content's size). Scrolling up to read detaches; scrolling back
    // to the bottom or sending a question re-attaches.
    useEffect(() => {
        const scroller = scrollRef.current;
        const conversation = conversationRef.current;
        if (!scroller || !conversation) return;

        const observer = new ResizeObserver(() => {
            if (!followStreamRef.current) return;
            const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            scroller.scrollTo({ top: scroller.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
        });
        observer.observe(conversation);
        return () => observer.disconnect();
    }, [hasConversation]);

    const detachFromStream = () => {
        followStreamRef.current = false;
    };

    const handleConversationScroll = () => {
        const scroller = scrollRef.current;
        if (scroller && scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < FOLLOW_THRESHOLD) {
            followStreamRef.current = true;
        }
    };

    // Grow the textarea with its content up to a cap (field-sizing is not universal yet).
    useEffect(() => {
        const input = inputRef.current;
        if (!input) return;
        input.style.height = 'auto';
        input.style.height = `${Math.min(input.scrollHeight, MAX_INPUT_HEIGHT)}px`;
    }, [draft, hasConversation]);

    const endDictation = () => {
        dictationRef.current.active = false;
        stopListening();
    };

    const toggleVoiceInput = () => {
        // Stopping keeps dictation active so the final result still lands in the input.
        if (listening) {
            stopListening();
            return;
        }
        dictationRef.current = { active: true, base: draft.trimEnd() };
        speech.start();
    };

    const handleDraftChange = (value: string) => {
        // Typing takes over from dictation.
        if (dictationRef.current.active) endDictation();
        setDraft(value);
    };

    const submit = (text: string) => {
        const question = text.trim().slice(0, MAX_QUESTION_LENGTH);
        if (!question || isBusy) return;
        endDictation();
        clearError();
        setDraft('');
        followStreamRef.current = true;
        wasTypingRef.current = document.activeElement === inputRef.current;
        void sendMessage({ text: question });
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        submit(draft);
    };

    const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            submit(draft);
        }
    };

    const startNewChat = () => {
        endDictation();
        stop();
        setMessages([]);
        clearError();
        setDraft('');
        window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    };

    useEffect(() => {
        if (isOpen) return;
        dictationRef.current.active = false;
        stopListening();
    }, [isOpen, stopListening]);

    // When dictation ends, hand the caret back so the visitor can review and press Enter. Not on
    // touch screens, where focusing the field would throw the keyboard over the input.
    useEffect(() => {
        const stopped = wasListeningRef.current && !listening;
        wasListeningRef.current = listening;
        const input = inputRef.current;
        if (!stopped || !isOpen || !input || prefersTouchInput()) return;
        input.focus({ preventScroll: true });
        input.setSelectionRange(input.value.length, input.value.length);
    }, [isOpen, listening]);

    const jumpTo = (section: SiteSectionId) => {
        // Release the scroll lock now; its cleanup runs only after the close re-render.
        document.body.style.overflow = '';
        onClose();
        window.requestAnimationFrame(() => {
            document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' });
        });
    };

    // Listens on the document, not the dialog, so Esc and the focus trap still work after focus
    // has drifted to <body> (a click on empty space, or a re-rendered input).
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            const root = rootRef.current;
            if (!root) return;

            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }

            if (event.key !== 'Tab') return;

            const focusable = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;

            if (!(active instanceof Node) || !root.contains(active)) {
                event.preventDefault();
                (event.shiftKey ? last : first).focus();
            } else if (event.shiftKey && active === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // The first question swaps the large input for the docked one; keep the caret in it. On touch
    // screens only when the visitor was typing — tapping a starter should not pop the keyboard.
    // (Opening an existing conversation is handled by the open timeline.)
    useEffect(() => {
        const startedConversation = hasConversation && !hadConversationRef.current;
        hadConversationRef.current = hasConversation;
        if (!isOpen || !startedConversation) return;
        if (prefersTouchInput() && !wasTypingRef.current) return;

        const frame = window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
        return () => window.cancelAnimationFrame(frame);
    }, [hasConversation, isOpen]);

    // Sits right under whichever input is showing: the privacy notice, the voice notes, plus a
    // counter near the limit.
    const inputNote = (
        <div data-ask-note className="mt-2.5 flex items-start justify-between gap-4 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--faint)] md:text-[10px]">
            <div className="flex min-w-0 flex-col gap-1">
                <span>Don&apos;t share sensitive personal information &middot; Chats aren&apos;t stored</span>
                {speech.supported ? <span>Voice input is processed by your browser&apos;s speech service.</span> : null}
                <span role="status" className="text-[var(--muted)] empty:hidden">
                    {voiceHint}
                </span>
            </div>
            {draft.length >= COUNTER_THRESHOLD ? (
                <span className="shrink-0 tabular-nums">
                    {draft.length} / {MAX_QUESTION_LENGTH}
                </span>
            ) : null}
        </div>
    );

    const inputClassName =
        'block w-full resize-none bg-transparent text-[var(--text)] caret-[var(--text)] placeholder:text-[var(--faint)] focus:outline-none';

    return (
        <div
            ref={rootRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ask-dialog-title"
            inert={!isOpen ? true : undefined}
            tabIndex={-1}
            className={`fixed inset-x-0 top-0 z-[90] flex h-dvh flex-col text-[var(--text)] outline-none ${isOpen ? '' : 'pointer-events-none'}`}
        >
            <div
                data-ask-backdrop
                aria-hidden="true"
                className="invisible absolute inset-0 bg-[color-mix(in_srgb,var(--site-bg)_74%,transparent)] opacity-0 backdrop-blur-[16px] will-change-[opacity]"
            />

            <div data-ask-content className="relative flex min-h-0 flex-1 flex-col opacity-0">
                <div className="mx-auto flex w-full max-w-[82rem] items-center justify-between gap-4 px-5 pt-5 md:px-8 md:pt-7">
                    <div data-ask-label className="flex min-w-0 items-center gap-3.5">
                        <span aria-hidden="true" className="font-name text-2xl font-extrabold leading-none tracking-tight">
                            J<span className="text-[var(--faint)]">M</span>
                        </span>
                        <span aria-hidden="true" className="h-px w-6 shrink-0 bg-[var(--hairline-strong)]" />
                        <span id="ask-dialog-title" className="truncate font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text)] sm:text-[11px]">
                            Nero &mdash; AI assistant
                        </span>
                    </div>

                    <div data-ask-controls className="flex shrink-0 items-center gap-2.5">
                        {hasConversation ? (
                            <>
                                <span className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--faint)] sm:inline">
                                    {turns.length} {turns.length === 1 ? 'question' : 'questions'}
                                </span>
                                <button
                                    type="button"
                                    onClick={startNewChat}
                                    className="inline-flex h-10 items-center border border-[var(--hairline-strong)] px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text)] transition-colors duration-300 hover:border-[var(--inverse-bg)] hover:bg-[var(--inverse-bg)] hover:text-[var(--inverse-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 motion-reduce:transition-none"
                                >
                                    New chat
                                </button>
                            </>
                        ) : null}
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close Ask"
                            className="inline-flex h-10 items-center gap-2.5 border border-[var(--hairline-strong)] px-3 text-[var(--text)] transition-colors duration-300 hover:border-[var(--inverse-bg)] hover:bg-[var(--inverse-bg)] hover:text-[var(--inverse-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 motion-reduce:transition-none"
                        >
                            <span aria-hidden="true" className="hidden font-mono text-[10px] tracking-[0.12em] sm:inline">ESC</span>
                            <X aria-hidden="true" size={14} strokeWidth={2} />
                        </button>
                    </div>
                </div>

                {hasConversation ? (
                    <>
                        <div
                            ref={scrollRef}
                            onScroll={handleConversationScroll}
                            onWheel={(event) => {
                                if (event.deltaY < 0) detachFromStream();
                            }}
                            onTouchStart={detachFromStream}
                            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
                        >
                            <div ref={conversationRef} className="mx-auto w-full max-w-[82rem] px-5 pb-8 pt-10 md:px-8 md:pt-14 lg:px-[6.5rem]">
                                <ol className="flex flex-col">
                                    {turns.map((turn, index) => (
                                        <Turn
                                            key={turn.id}
                                            turn={turn}
                                            index={index}
                                            isLatest={index === turns.length - 1}
                                            isStreaming={isStreaming}
                                            isWaiting={isWaiting}
                                            onJump={jumpTo}
                                        />
                                    ))}
                                </ol>

                                {errorKind ? (
                                    <div
                                        role="alert"
                                        className="mt-6 flex flex-wrap items-center justify-between gap-3 border border-[var(--hairline)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] sm:ml-16"
                                    >
                                        <span>{ERROR_COPY[errorKind]}</span>
                                        {errorKind === 'error' ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    clearError();
                                                    void regenerate();
                                                }}
                                                className="inline-flex h-8 items-center border border-[var(--hairline-strong)] px-3 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors duration-300 hover:border-[var(--inverse-bg)] hover:bg-[var(--inverse-bg)] hover:text-[var(--inverse-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 motion-reduce:transition-none"
                                            >
                                                Try again
                                            </button>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <form data-ask-dock onSubmit={handleSubmit} className="mx-auto w-full max-w-[82rem] px-3 sm:px-5 md:px-8 lg:px-[6.5rem]">
                            <div className="flex items-stretch border border-[var(--hairline-strong)] bg-[var(--surface)] shadow-[var(--shadow-lift)]">
                                <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 md:px-5">
                                    <span aria-hidden="true" className="self-start pt-[3px] font-mono text-xs text-[var(--text)]">&gt;</span>
                                    <label htmlFor="ask-input" className="sr-only">Ask a follow-up question</label>
                                    <textarea
                                        id="ask-input"
                                        ref={inputRef}
                                        rows={1}
                                        value={draft}
                                        maxLength={MAX_QUESTION_LENGTH}
                                        onChange={(event) => handleDraftChange(event.target.value)}
                                        onKeyDown={handleInputKeyDown}
                                        placeholder={listening ? voicePlaceholder : 'Ask a follow-up…'}
                                        className={`${inputClassName} text-base leading-6`}
                                    />
                                </div>
                                {speech.supported ? (
                                    <VoiceButton
                                        listening={listening}
                                        hearing={hearing}
                                        metered={micLevel.live}
                                        meterRef={voiceMeterRef}
                                        disabled={isBusy}
                                        onToggle={toggleVoiceInput}
                                        className={`w-12 border-l border-[var(--hairline)] focus-visible:ring-inset ${listening ? 'bg-[var(--surface-muted)] text-[var(--text)]' : 'text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]'}`}
                                    />
                                ) : null}
                                {isBusy ? (
                                    <button
                                        type="button"
                                        onClick={stop}
                                        className="inline-flex shrink-0 items-center gap-2.5 border-l border-[var(--hairline)] bg-[var(--surface-muted)] px-4 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--text)]/45 md:px-5"
                                    >
                                        <ThinkingDots />
                                        <span className="hidden sm:inline">Answering</span>
                                        <span className="border border-[var(--hairline-strong)] px-1.5 py-0.5 text-[var(--text)]">Stop</span>
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={!draft.trim()}
                                        aria-label="Send question"
                                        className="inline-flex w-12 shrink-0 items-center justify-center gap-2.5 bg-[var(--inverse-bg)] font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--inverse-text)] transition-opacity duration-300 hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--inverse-text)]/60 disabled:opacity-40 sm:w-auto sm:px-5"
                                    >
                                        <span className="hidden sm:inline">Send</span>
                                        <CornerDownLeft aria-hidden="true" size={14} strokeWidth={2} />
                                    </button>
                                )}
                            </div>
                            {inputNote}
                        </form>
                    </>
                ) : (
                    <div className="mx-auto flex w-full min-h-0 max-w-[82rem] flex-1 flex-col justify-center-safe overflow-y-auto overscroll-contain px-5 py-6 [scrollbar-width:thin] md:px-8 lg:px-[6.5rem] [@media(min-height:720px)]:py-10">
                        <h2 className="shrink-0 overflow-hidden pb-[0.1em] font-display text-[clamp(2.5rem,7vw,4.75rem)] font-bold lowercase leading-[1.02] tracking-[-0.035em] text-[var(--text)]">
                            <span data-ask-headline className="inline-block">what do you want to ask?</span>
                        </h2>
                        <p data-ask-subline className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-[var(--muted)] md:mt-4 md:text-base">
                            Nero is an AI chatbot that answers questions about Jude&apos;s work.
                        </p>

                        <form onSubmit={handleSubmit} className="mt-6 max-w-[47.5rem] [@media(min-height:720px)]:mt-10">
                            <label htmlFor="ask-input" className="sr-only">Your question about Jude</label>
                            <div className="flex items-end gap-3">
                                <textarea
                                    id="ask-input"
                                    ref={inputRef}
                                    rows={1}
                                    value={draft}
                                    maxLength={MAX_QUESTION_LENGTH}
                                    onChange={(event) => handleDraftChange(event.target.value)}
                                    onKeyDown={handleInputKeyDown}
                                    placeholder={listening ? voicePlaceholder : undefined}
                                    className={`${inputClassName} min-w-0 flex-1 text-[1.35rem] leading-snug md:text-[1.65rem]`}
                                />
                                {speech.supported ? (
                                    <VoiceButton
                                        listening={listening}
                                        hearing={hearing}
                                        metered={micLevel.live}
                                        meterRef={voiceMeterRef}
                                        onToggle={toggleVoiceInput}
                                        className={`size-10 border ${listening ? 'border-[var(--inverse-bg)] bg-[var(--inverse-bg)] text-[var(--inverse-text)]' : 'border-[var(--hairline-strong)] text-[var(--text)] hover:border-[var(--inverse-bg)] hover:bg-[var(--inverse-bg)] hover:text-[var(--inverse-text)]'}`}
                                    />
                                ) : null}
                            </div>
                            <div data-ask-rule aria-hidden="true" className="mt-3 h-px w-full bg-[var(--hairline)]" />
                            {inputNote}
                        </form>

                        <div className="mt-7 [@media(min-height:720px)]:mt-12">
                            <p data-ask-starters-label className="mb-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">Or start with</p>
                            <ul className="flex max-w-[56rem] flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2.5">
                                {STARTERS.map((starter, index) => (
                                    <li key={starter} data-ask-chip>
                                        <button
                                            type="button"
                                            onClick={() => submit(starter)}
                                            className="group inline-flex w-full items-center gap-3 border border-[var(--hairline-strong)] px-4 py-3 text-left text-sm font-medium text-[var(--text)] transition-colors duration-300 hover:border-[var(--inverse-bg)] hover:bg-[var(--inverse-bg)] hover:text-[var(--inverse-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 motion-reduce:transition-none sm:w-auto"
                                        >
                                            <span className="font-mono text-[10px] tracking-[0.1em] text-[var(--faint)] transition-colors duration-300 group-hover:text-[var(--inverse-text)]/70">
                                                {pad(index)}
                                            </span>
                                            {starter}
                                            <ArrowRight
                                                aria-hidden="true"
                                                size={13}
                                                strokeWidth={2.2}
                                                className="-ml-1 w-0 opacity-0 transition-[width,opacity,margin] duration-300 group-hover:ml-0 group-hover:w-[13px] group-hover:opacity-100 motion-reduce:transition-none"
                                            />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                <div data-ask-footer className="mx-auto w-full max-w-[82rem] px-5 pb-4 md:px-8 md:pb-6 lg:px-[6.5rem]">
                    <div className="mt-4 flex items-center justify-center gap-6 border-t border-[var(--hairline)] pt-3.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--faint)] md:mt-5 md:justify-between md:pt-4 md:text-[10px]">
                        <span className="hidden shrink-0 items-center gap-5 whitespace-nowrap md:flex">
                            <span><kbd className="mr-1.5 border border-[var(--hairline-strong)] px-1.5 py-0.5 font-mono text-[var(--text)]">↵</kbd>Send</span>
                            <span><kbd className="mr-1.5 border border-[var(--hairline-strong)] px-1.5 py-0.5 font-mono text-[var(--text)]">Shift ↵</kbd>New line</span>
                            <span><kbd className="mr-1.5 border border-[var(--hairline-strong)] px-1.5 py-0.5 font-mono text-[var(--text)]">Esc</kbd>Close</span>
                        </span>
                        <span className="text-center md:text-right">Answers come from this portfolio &middot; AI can be wrong</span>
                    </div>
                </div>
            </div>

            <p className="sr-only" aria-live="polite">
                {isBusy ? 'Ask is answering.' : status === 'ready' && hasConversation ? 'Answer ready.' : ''}
            </p>
            <p className="sr-only" aria-live="polite">
                {listening ? 'Listening.' : ''}
            </p>
        </div>
    );
}
