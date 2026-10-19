'use client';

import { useEffect, useState, type FocusEvent, type PointerEvent } from 'react';
import { markAskHintSeen, shouldShowAskHint } from './askHint';

interface AskNavButtonProps {
    onOpen: () => void;
}

const HINT_TEXT = 'Chat with Nero, an AI assistant';

/**
 * The navbar's Ask button. A small tooltip names the assistant the moment the pointer is on the
 * button (or keyboard focus lands there). It then rests for a cool-down and keeps coming back
 * until the visitor has opened the chat once (rules in ./askHint). The button's accessible name
 * always carries the same information.
 */
export default function AskNavButton({ onOpen }: AskNavButtonProps) {
    const [isHintVisible, setIsHintVisible] = useState(false);

    const showHint = () => {
        if (!shouldShowAskHint()) return;
        markAskHintSeen();
        setIsHintVisible(true);
    };

    const hideHint = () => setIsHintVisible(false);

    // A visible tooltip must be dismissible without moving the pointer: Esc or scrolling hides it.
    useEffect(() => {
        if (!isHintVisible) return;

        const dismiss = () => setIsHintVisible(false);
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') dismiss();
        };

        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('scroll', dismiss, { passive: true });
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('scroll', dismiss);
        };
    }, [isHintVisible]);

    const handlePointerEnter = (event: PointerEvent<HTMLSpanElement>) => {
        // Touch has no hover; the mobile menu row names the assistant instead.
        if (event.pointerType === 'mouse' || event.pointerType === 'pen') showHint();
    };

    const handleFocus = (event: FocusEvent<HTMLButtonElement>) => {
        // Keyboard focus only: a mouse click also focuses the button but should not show the hint.
        if (event.currentTarget.matches(':focus-visible')) showHint();
    };

    return (
        <span className="relative inline-flex shrink-0" onPointerEnter={handlePointerEnter} onPointerLeave={hideHint}>
            <button
                type="button"
                onClick={() => {
                    hideHint();
                    onOpen();
                }}
                onFocus={handleFocus}
                onBlur={hideHint}
                aria-label="Ask Nero, AI assistant"
                aria-haspopup="dialog"
                aria-keyshortcuts="Control+K Meta+K"
                className="group inline-flex h-10 shrink-0 items-center gap-2.5 border border-[var(--hairline-strong)] pl-3.5 pr-2.5 text-[var(--text)] transition-colors duration-300 ease-out hover:border-[var(--inverse-bg)] hover:bg-[var(--inverse-bg)] hover:text-[var(--inverse-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/45 motion-reduce:transition-none"
            >
                <span aria-hidden="true" className="font-mono text-[10px] font-bold uppercase tracking-[0.12em]">Ask</span>
                <kbd aria-hidden="true" className="border border-[var(--hairline-strong)] px-1.5 py-px font-mono text-[10px] opacity-80 transition-colors duration-300 group-hover:border-[var(--inverse-text)]/50 motion-reduce:transition-none">
                    Ctrl + K
                </kbd>
            </button>

            {/* Decorative for assistive tech (the button name says the same). The transparent top
                padding bridges the gap so the pointer can move onto the tooltip without losing it. */}
            <span
                aria-hidden="true"
                className={`absolute left-1/2 top-full z-10 -translate-x-1/2 pt-3 transition-[opacity,translate,visibility] duration-200 ease-out motion-reduce:transition-none ${
                    isHintVisible ? 'visible translate-y-0 opacity-100' : 'pointer-events-none invisible -translate-y-1 opacity-0'
                }`}
            >
                <span className="relative block whitespace-nowrap bg-[var(--inverse-bg)] px-3 py-2 text-[12.5px] font-medium text-[var(--inverse-text)] shadow-[var(--shadow-lift)]">
                    <span className="absolute -top-[5px] left-1/2 size-2.5 -translate-x-1/2 rotate-45 bg-[var(--inverse-bg)]" />
                    <span className="relative">{HINT_TEXT}</span>
                </span>
            </span>
        </span>
    );
}
