'use client';

import dynamic from 'next/dynamic';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { markChatUsed } from './askHint';

interface AskChatContextValue {
    enabled: boolean;
    open: () => void;
}

const AskChatContext = createContext<AskChatContextValue>({ enabled: false, open: () => undefined });

// The overlay (and the AI SDK client with it) is only downloaded the first time someone opens it.
const AskOverlay = dynamic(() => import('./AskOverlay'), { ssr: false });

export function useAskChat(): AskChatContextValue {
    return useContext(AskChatContext);
}

function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

interface ChatProviderProps {
    enabled: boolean;
    children: React.ReactNode;
}

export default function ChatProvider({ enabled, children }: ChatProviderProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [hasOpened, setHasOpened] = useState(false);
    const returnFocusRef = useRef<HTMLElement | null>(null);

    const open = useCallback(() => {
        if (!enabled) return;
        markChatUsed();
        returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setHasOpened(true);
        setIsOpen(true);
    }, [enabled]);

    const close = useCallback(() => setIsOpen(false), []);

    const handleClosed = useCallback(() => {
        returnFocusRef.current?.focus({ preventScroll: true });
        returnFocusRef.current = null;
    }, []);

    // Warm the overlay chunk once the page has settled, so the first open animates immediately
    // instead of waiting on a download.
    useEffect(() => {
        if (!enabled) return;
        const timer = window.setTimeout(() => void import('./AskOverlay'), 4_000);
        return () => window.clearTimeout(timer);
    }, [enabled]);

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.isComposing) return;

            const isShortcut = (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k';
            const isSlash = event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !isTypingTarget(event.target);

            if (isShortcut || (isSlash && !isOpen)) {
                event.preventDefault();
                open();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [enabled, isOpen, open]);

    const value = useMemo(() => ({ enabled, open }), [enabled, open]);

    return (
        <AskChatContext.Provider value={value}>
            {children}
            {enabled && hasOpened ? <AskOverlay isOpen={isOpen} onClose={close} onClosed={handleClosed} /> : null}
        </AskChatContext.Provider>
    );
}
