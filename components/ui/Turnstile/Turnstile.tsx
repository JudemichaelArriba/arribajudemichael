'use client';

import Script from 'next/script';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';

export type TurnstileAction = 'login' | 'contact';
export type TurnstileStatus = 'ready' | 'verified' | 'expired' | 'error';

interface TurnstileProps {
    action: TurnstileAction;
    resetKey: number;
    onStatusChange?: (status: TurnstileStatus) => void;
    className?: string;
}

interface TurnstileRenderOptions {
    sitekey: string;
    action: TurnstileAction;
    theme: 'dark';
    size: 'compact' | 'flexible';
    appearance: 'always';
    execution: 'render';
    retry: 'auto';
    'refresh-expired': 'auto';
    'refresh-timeout': 'auto';
    'response-field': true;
    'response-field-name': 'cf-turnstile-response';
    callback: () => void;
    'expired-callback': () => void;
    'error-callback': () => void;
    'timeout-callback': () => void;
    'unsupported-callback': () => void;
}

interface TurnstileApi {
    render: (
        container: HTMLElement,
        options: TurnstileRenderOptions,
    ) => string;
    reset: (widgetId: string) => void;
    remove: (widgetId: string) => void;
}

declare global {
    interface Window {
        turnstile?: TurnstileApi;
    }
}

const TURNSTILE_SCRIPT_URL =
    'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const COMPACT_QUERY = '(max-width: 399px)';

function subscribeToCompactMode(onStoreChange: () => void): () => void {
    const mediaQuery = window.matchMedia(COMPACT_QUERY);
    mediaQuery.addEventListener('change', onStoreChange);
    return () => mediaQuery.removeEventListener('change', onStoreChange);
}

function getCompactModeSnapshot(): boolean {
    return window.matchMedia(COMPACT_QUERY).matches;
}

function getServerCompactModeSnapshot(): boolean {
    return false;
}

export default function Turnstile({
    action,
    resetKey,
    onStatusChange,
    className = '',
}: TurnstileProps) {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const previousResetKeyRef = useRef(resetKey);
    const statusCallbackRef = useRef(onStatusChange);
    const [isScriptReady, setIsScriptReady] = useState(false);
    const isCompact = useSyncExternalStore(
        subscribeToCompactMode,
        getCompactModeSnapshot,
        getServerCompactModeSnapshot,
    );

    useEffect(() => {
        statusCallbackRef.current = onStatusChange;
    }, [onStatusChange]);

    useEffect(() => {
        if (!siteKey) {
            statusCallbackRef.current?.('error');
        }
    }, [siteKey]);

    const removeWidget = useCallback(() => {
        const widgetId = widgetIdRef.current;
        const api = window.turnstile;

        if (widgetId && api) {
            try {
                api.remove(widgetId);
            } catch (error) {
                console.warn('[turnstile] Widget cleanup failed.', {
                    name: error instanceof Error ? error.name : 'UnknownError',
                });
            }
        }

        widgetIdRef.current = null;
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        const api = window.turnstile;

        if (!siteKey || !isScriptReady || !container || !api) {
            return;
        }

        removeWidget();
        statusCallbackRef.current?.('ready');

        try {
            widgetIdRef.current = api.render(container, {
                sitekey: siteKey,
                action,
                theme: 'dark',
                size: isCompact ? 'compact' : 'flexible',
                appearance: 'always',
                execution: 'render',
                retry: 'auto',
                'refresh-expired': 'auto',
                'refresh-timeout': 'auto',
                'response-field': true,
                'response-field-name': 'cf-turnstile-response',
                callback: () => statusCallbackRef.current?.('verified'),
                'expired-callback': () => statusCallbackRef.current?.('expired'),
                'error-callback': () => statusCallbackRef.current?.('error'),
                'timeout-callback': () => statusCallbackRef.current?.('expired'),
                'unsupported-callback': () => statusCallbackRef.current?.('error'),
            });
        } catch (error) {
            console.error('[turnstile] Widget initialization failed.', {
                name: error instanceof Error ? error.name : 'UnknownError',
            });
            statusCallbackRef.current?.('error');
        }

        return removeWidget;
    }, [action, isCompact, isScriptReady, removeWidget, siteKey]);

    useEffect(() => {
        if (Object.is(previousResetKeyRef.current, resetKey)) {
            return;
        }

        previousResetKeyRef.current = resetKey;

        const widgetId = widgetIdRef.current;
        const api = window.turnstile;

        if (widgetId && api) {
            api.reset(widgetId);
            statusCallbackRef.current?.('ready');
        }
    }, [resetKey]);

    if (!siteKey) {
        return (
            <p
                role="alert"
                className={`text-sm leading-relaxed text-red-300/75 ${className}`}
            >
                Security verification is unavailable. Please try again later.
            </p>
        );
    }

    return (
        <div className={`min-w-0 ${className}`}>
            <Script
                id="cloudflare-turnstile-api"
                src={TURNSTILE_SCRIPT_URL}
                strategy="afterInteractive"
                onReady={() => setIsScriptReady(true)}
                onError={() => statusCallbackRef.current?.('error')}
            />
            <div
                ref={containerRef}
                role="group"
                aria-label="Security verification"
                className="flex min-h-[65px] w-full min-w-0 items-start justify-start max-[399px]:min-h-[140px] max-[399px]:justify-center"
            />
        </div>
    );
}
