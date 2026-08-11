'use client';

import { useEffect } from 'react';

const HEARTBEAT_INTERVAL_MS = 10 * 60 * 1_000;
const REQUEST_TIMEOUT_MS = 10_000;

let lastRequestStartedAt = 0;
let requestInFlight: Promise<void> | null = null;

function refreshAnalyticsSessionIfDue(): void {
    if (document.visibilityState !== 'visible') return;

    const now = Date.now();

    if (
        requestInFlight ||
        now - lastRequestStartedAt < HEARTBEAT_INTERVAL_MS
    ) {
        return;
    }

    lastRequestStartedAt = now;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
    );

    requestInFlight = fetch('/api/analytics/session', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        keepalive: true,
        signal: controller.signal,
    })
        .then(() => undefined)
        .catch(() => undefined)
        .finally(() => {
            window.clearTimeout(timeoutId);
            requestInFlight = null;
        });
}

export default function AnalyticsSessionBootstrap() {
    useEffect(() => {
        refreshAnalyticsSessionIfDue();

        const heartbeatId = window.setInterval(
            refreshAnalyticsSessionIfDue,
            HEARTBEAT_INTERVAL_MS,
        );

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refreshAnalyticsSessionIfDue();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.clearInterval(heartbeatId);
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange,
            );
        };
    }, []);

    return null;
}
