'use client';

import Script from 'next/script';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
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
    size: 'flexible';
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
// Cloudflare's flexible widget refuses to shrink below 300px wide. Narrower containers (a 360px
// phone leaves ~278px inside the contact card) scale the bar down to fit instead of falling back
// to the 150x140 compact square. Its rendered height (72px today, nominally 65px) is measured,
// not assumed, so the scaled frame never clips the border.
const WIDGET_MIN_WIDTH = 300;
const WIDGET_NOMINAL_HEIGHT = 65;

export default function Turnstile({
    action,
    resetKey,
    onStatusChange,
    className = '',
}: TurnstileProps) {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const frameRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const previousResetKeyRef = useRef(resetKey);
    const statusCallbackRef = useRef(onStatusChange);
    const [isScriptReady, setIsScriptReady] = useState(false);
    const [scale, setScale] = useState(1);
    const [widgetHeight, setWidgetHeight] = useState(WIDGET_NOMINAL_HEIGHT);

    useEffect(() => {
        const frame = frameRef.current;
        const container = containerRef.current;
        if (!frame || !container) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.target === frame) {
                    const width = entry.contentRect.width;
                    if (width > 0) setScale(Math.min(1, width / WIDGET_MIN_WIDTH));
                } else {
                    // offsetHeight ignores the scale transform: this is the widget's real height.
                    const height = container.offsetHeight;
                    if (height > 0) setWidgetHeight(height);
                }
            }
        });
        observer.observe(frame);
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

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
                size: 'flexible',
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
    }, [action, isScriptReady, removeWidget, siteKey]);

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
                ref={frameRef}
                // The scaled widget still takes its full layout height; size the frame to what is
                // actually visible so no gap is left below it.
                style={{
                    '--turnstile-scale': scale,
                    height: scale < 1 ? `${widgetHeight * scale}px` : undefined,
                } as CSSProperties}
                className={`w-full min-w-0 ${scale < 1 ? 'overflow-hidden' : ''}`}
            >
                <div
                    ref={containerRef}
                    role="group"
                    aria-label="Security verification"
                    className={`flex min-h-[65px] items-center justify-center [&>div]:!w-full [&_iframe]:!w-full ${
                        scale < 1
                            ? 'w-[300px] origin-top-left scale-[var(--turnstile-scale)]'
                            : 'w-full'
                    }`}
                />
            </div>
        </div>
    );
}
