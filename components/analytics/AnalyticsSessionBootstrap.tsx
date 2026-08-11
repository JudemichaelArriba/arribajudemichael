'use client';

import { useEffect } from 'react';

import {
    getLastAnalyticsActivityAt,
    recordAnalyticsActivity,
} from '@/features/analytics/activity';

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1_000;
const HEARTBEAT_ACTIVITY_WINDOW_MS = HEARTBEAT_INTERVAL_MS / 2;
const REQUEST_TIMEOUT_MS = 10_000;
const ACTIVITY_SIGNAL_INTERVAL_MS = 1_000;
const SESSION_REQUEST_LOCK = 'portfolio-analytics-session';

let activitySinceLastRequest = true;
let lastActivitySignalAt = 0;
let lastRequestStartedAt = 0;
let requestInFlight: Promise<void> | null = null;

async function sendAnalyticsSessionRequest(): Promise<void> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
    );

    try {
        await fetch('/api/analytics/session', {
            method: 'POST',
            cache: 'no-store',
            credentials: 'same-origin',
            keepalive: true,
            signal: controller.signal,
        });
    } finally {
        window.clearTimeout(timeoutId);
    }
}

async function sendSerializedAnalyticsSessionRequest(): Promise<void> {
    if ('locks' in navigator && navigator.locks) {
        await navigator.locks.request(SESSION_REQUEST_LOCK, async () => {
            await sendAnalyticsSessionRequest();
        });
        return;
    }

    await sendAnalyticsSessionRequest();
}

function refreshAnalyticsSessionIfDue(): void {
    if (document.visibilityState !== 'visible') return;

    const now = Date.now();

    if (
        requestInFlight ||
        !activitySinceLastRequest ||
        now - getLastAnalyticsActivityAt() >
            HEARTBEAT_ACTIVITY_WINDOW_MS ||
        now - lastRequestStartedAt < HEARTBEAT_INTERVAL_MS
    ) {
        return;
    }

    lastRequestStartedAt = now;
    activitySinceLastRequest = false;

    requestInFlight = sendSerializedAnalyticsSessionRequest()
        .catch(() => undefined)
        .finally(() => {
            requestInFlight = null;
        });
}

export default function AnalyticsSessionBootstrap() {
    useEffect(() => {
        const signalActivity = (force = false) => {
            const now = Date.now();

            if (
                !force &&
                now - lastActivitySignalAt < ACTIVITY_SIGNAL_INTERVAL_MS
            ) {
                return;
            }

            lastActivitySignalAt = now;
            activitySinceLastRequest = true;
            recordAnalyticsActivity(now);
            refreshAnalyticsSessionIfDue();
        };

        if (
            getLastAnalyticsActivityAt() === 0 ||
            Date.now() - getLastAnalyticsActivityAt() >=
                ACTIVITY_SIGNAL_INTERVAL_MS
        ) {
            signalActivity(true);
        } else {
            refreshAnalyticsSessionIfDue();
        }

        const heartbeatId = window.setInterval(
            refreshAnalyticsSessionIfDue,
            HEARTBEAT_INTERVAL_MS,
        );

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                signalActivity(true);
            }
        };

        const handleActivity = () => signalActivity();
        const handlePageShow = () => signalActivity(true);
        const handleResume = () => signalActivity(true);

        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('keydown', handleActivity);
        document.addEventListener('scroll', handleActivity, {
            capture: true,
            passive: true,
        });
        window.addEventListener('pointerdown', handleActivity, {
            passive: true,
        });
        window.addEventListener('touchstart', handleActivity, {
            passive: true,
        });
        window.addEventListener('pageshow', handlePageShow);
        document.addEventListener('resume', handleResume);

        return () => {
            window.clearInterval(heartbeatId);
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange,
            );
            document.removeEventListener('keydown', handleActivity);
            document.removeEventListener('scroll', handleActivity, true);
            window.removeEventListener('pointerdown', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
            window.removeEventListener('pageshow', handlePageShow);
            document.removeEventListener('resume', handleResume);
        };
    }, []);

    return null;
}
