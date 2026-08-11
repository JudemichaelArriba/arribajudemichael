'use client';

import { useEffect } from 'react';

import {
    acknowledgeEngagementDeltas,
    snapshotEngagementDeltas,
    type SectionEngagementDelta,
} from '@/features/analytics/engagement';
import { getLastAnalyticsActivityAt } from '@/features/analytics/activity';
import { ANALYTICS_MAX_SECTIONS_PER_BATCH } from '@/features/analytics/constants';

const BATCH_INTERVAL_MS = 30_000;
const REQUEST_TIMEOUT_MS = 30_000;

let flushInFlight: Promise<void> | null = null;
let sessionActivityRequiredAfter: number | null = null;

async function sendEngagementBatch(
    sections: readonly SectionEngagementDelta[],
    keepalive: boolean,
): Promise<void> {
    const activityAtRequestStart = getLastAnalyticsActivityAt();
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
    );

    try {
        const response = await fetch('/api/analytics/engagement', {
            method: 'POST',
            cache: 'no-store',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sections }),
            keepalive,
            signal: controller.signal,
        });

        if (response.status === 204) {
            acknowledgeEngagementDeltas(sections);
            sessionActivityRequiredAfter = null;
        } else if (
            response.status === 401 &&
            getLastAnalyticsActivityAt() <= activityAtRequestStart
        ) {
            sessionActivityRequiredAfter = activityAtRequestStart;
        }
    } catch {
        // Analytics is best-effort; pending deltas remain for a later batch.
    } finally {
        window.clearTimeout(timeoutId);
    }
}

function flushEngagementDeltas({
    allowHidden,
    keepalive,
}: {
    allowHidden: boolean;
    keepalive: boolean;
}): void {
    if (
        flushInFlight ||
        (sessionActivityRequiredAfter !== null &&
            getLastAnalyticsActivityAt() <= sessionActivityRequiredAfter) ||
        (!allowHidden && document.visibilityState !== 'visible')
    ) {
        return;
    }

    const sections = snapshotEngagementDeltas().slice(
        0,
        ANALYTICS_MAX_SECTIONS_PER_BATCH,
    );
    if (sections.length === 0) return;

    const request = sendEngagementBatch(sections, keepalive);
    flushInFlight = request;

    void request.finally(() => {
        if (flushInFlight === request) flushInFlight = null;
    });
}

export default function AnalyticsEngagementBatcher() {
    useEffect(() => {
        const intervalId = window.setInterval(() => {
            flushEngagementDeltas({ allowHidden: false, keepalive: false });
        }, BATCH_INTERVAL_MS);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                flushEngagementDeltas({ allowHidden: true, keepalive: true });
            }
        };

        const handlePageHide = () => {
            flushEngagementDeltas({ allowHidden: true, keepalive: true });
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handlePageHide);

        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange,
            );
            window.removeEventListener('pagehide', handlePageHide);
        };
    }, []);

    return null;
}
