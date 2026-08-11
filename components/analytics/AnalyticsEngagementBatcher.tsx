'use client';

import { useEffect } from 'react';

import {
    acknowledgeEngagementDeltas,
    discardEngagementDeltas,
    snapshotEngagementDeltas,
    type SectionEngagementDelta,
} from '@/features/analytics/engagement';
import {
    ANALYTICS_SESSION_INACTIVITY_MS,
    getLastAnalyticsActivityAt,
    subscribeToAnalyticsActivity,
} from '@/features/analytics/activity';
import { ANALYTICS_MAX_SECTIONS_PER_BATCH } from '@/features/analytics/constants';

const BATCH_INTERVAL_MS = 30_000;
const REQUEST_TIMEOUT_MS = 30_000;

interface PendingEngagementBatch {
    assignedAt: number;
    batchId: string;
    snapshot: readonly SectionEngagementDelta[];
}

type EngagementDeliveryResult =
    | 'acknowledged'
    | 'invalid-session'
    | 'retry'
    | 'terminal';

let flushInFlight: Promise<void> | null = null;
let pendingBatch: PendingEngagementBatch | null = null;
let sessionActivityRequiredAfter: number | null = null;

async function sendEngagementBatch(
    batch: PendingEngagementBatch,
    keepalive: boolean,
): Promise<EngagementDeliveryResult> {
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
            body: JSON.stringify({
                batchId: batch.batchId,
                sections: batch.snapshot,
            }),
            keepalive,
            signal: controller.signal,
        });

        if (response.status === 204) {
            sessionActivityRequiredAfter = null;
            return 'acknowledged';
        }

        if (
            response.status === 401 &&
            getLastAnalyticsActivityAt() <= activityAtRequestStart
        ) {
            sessionActivityRequiredAfter = activityAtRequestStart;
        }

        if (response.status === 401) return 'invalid-session';
        if (response.status === 400 || response.status === 413) {
            return 'terminal';
        }

        return 'retry';
    } catch {
        return 'retry';
    } finally {
        window.clearTimeout(timeoutId);
    }
}

function acknowledgePendingBatch(batch: PendingEngagementBatch): void {
    if (pendingBatch !== batch) return;

    acknowledgeEngagementDeltas(batch.snapshot);
    pendingBatch = null;
}

function discardPendingBatch(batch: PendingEngagementBatch): void {
    if (pendingBatch !== batch) return;

    discardEngagementDeltas(batch.snapshot);
    pendingBatch = null;
}

function getPendingBatch(): PendingEngagementBatch | null {
    if (
        pendingBatch &&
        Date.now() - pendingBatch.assignedAt >=
            ANALYTICS_SESSION_INACTIVITY_MS
    ) {
        discardPendingBatch(pendingBatch);
    }

    if (pendingBatch) return pendingBatch;

    const snapshot = snapshotEngagementDeltas().slice(
        0,
        ANALYTICS_MAX_SECTIONS_PER_BATCH,
    );
    if (snapshot.length === 0) return null;

    try {
        pendingBatch = {
            assignedAt: Date.now(),
            batchId: crypto.randomUUID(),
            snapshot,
        };
    } catch {
        return null;
    }

    return pendingBatch;
}

async function deliverPendingBatch(
    batch: PendingEngagementBatch,
    keepalive: boolean,
): Promise<void> {
    const result = await sendEngagementBatch(batch, keepalive);

    if (result === 'acknowledged') acknowledgePendingBatch(batch);
    if (result === 'invalid-session' || result === 'terminal') {
        discardPendingBatch(batch);
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

    const batch = getPendingBatch();
    if (!batch) return;

    const request = deliverPendingBatch(batch, keepalive);
    flushInFlight = request;

    void request.finally(() => {
        if (flushInFlight === request) flushInFlight = null;
    });
}

export default function AnalyticsEngagementBatcher() {
    useEffect(() => {
        let previousActivityAt = getLastAnalyticsActivityAt();

        const unsubscribeFromAnalyticsActivity =
            subscribeToAnalyticsActivity((activityAt) => {
                if (
                    previousActivityAt > 0 &&
                    activityAt - previousActivityAt >=
                        ANALYTICS_SESSION_INACTIVITY_MS &&
                    pendingBatch
                ) {
                    discardPendingBatch(pendingBatch);
                }

                previousActivityAt = activityAt;
            });

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
            unsubscribeFromAnalyticsActivity();
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange,
            );
            window.removeEventListener('pagehide', handlePageHide);
        };
    }, []);

    return null;
}
