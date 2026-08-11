'use client';

import { ANALYTICS_SESSION_INACTIVITY_MS } from './constants';

type AnalyticsActivityListener = (activityAt: number) => void;

const activityListeners = new Set<AnalyticsActivityListener>();

let lastActivityAt = 0;

export { ANALYTICS_SESSION_INACTIVITY_MS };

export function getLastAnalyticsActivityAt(): number {
    return lastActivityAt;
}

export function recordAnalyticsActivity(activityAt = Date.now()): void {
    if (!Number.isFinite(activityAt) || activityAt <= lastActivityAt) return;

    lastActivityAt = activityAt;
    activityListeners.forEach((listener) => listener(activityAt));
}

export function subscribeToAnalyticsActivity(
    listener: AnalyticsActivityListener,
): () => void {
    activityListeners.add(listener);
    return () => activityListeners.delete(listener);
}
