'use client';

export interface SectionEngagementMetric {
    sectionKey: string;
    viewCount: number;
    visibleMs: number;
    maxVisibility: number;
    firstSeenAt: string;
    lastSeenAt: string;
}

interface EngagementRecord extends SectionEngagementMetric {
    activeStartedAt: number | null;
    visitActive: boolean;
}

const engagementRecords = new Map<string, EngagementRecord>();
const engagementDeltas = new Map<string, SectionEngagementMetric>();

function clampVisibility(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
}

function createDelta(
    record: EngagementRecord,
    observedAt: string,
): SectionEngagementMetric {
    return {
        sectionKey: record.sectionKey,
        viewCount: 0,
        visibleMs: 0,
        maxVisibility: record.maxVisibility,
        firstSeenAt: record.firstSeenAt,
        lastSeenAt: observedAt,
    };
}

function getDelta(
    record: EngagementRecord,
    observedAt: string,
): SectionEngagementMetric {
    const existing = engagementDeltas.get(record.sectionKey);
    if (existing) return existing;

    const delta = createDelta(record, observedAt);
    engagementDeltas.set(record.sectionKey, delta);
    return delta;
}

function recordCheckpoint(
    record: EngagementRecord,
    visibility: number,
    observedAt: string,
): void {
    const normalizedVisibility = clampVisibility(visibility);
    record.maxVisibility = Math.max(
        record.maxVisibility,
        normalizedVisibility,
    );
    record.lastSeenAt = observedAt;

    const delta = getDelta(record, observedAt);
    delta.maxVisibility = Math.max(
        delta.maxVisibility,
        normalizedVisibility,
    );
    delta.lastSeenAt = observedAt;
}

function flushActiveDuration(
    record: EngagementRecord,
    now: number,
    observedAt: string,
): void {
    if (record.activeStartedAt === null) return;

    const elapsed = Math.max(0, now - record.activeStartedAt);
    record.activeStartedAt = now;

    if (elapsed > 0 && Number.isFinite(elapsed)) {
        record.visibleMs += elapsed;
        const delta = getDelta(record, observedAt);
        delta.visibleMs += elapsed;
    }

    record.lastSeenAt = observedAt;
    getDelta(record, observedAt).lastSeenAt = observedAt;
}

export function beginSectionEngagement(
    sectionKey: string,
    visibility: number,
    now: number,
    observedAt: string,
): void {
    const existing = engagementRecords.get(sectionKey);

    if (existing?.visitActive) {
        recordCheckpoint(existing, visibility, observedAt);
        if (existing.activeStartedAt === null) {
            existing.activeStartedAt = now;
        }
        return;
    }

    const record: EngagementRecord = existing ?? {
        sectionKey,
        viewCount: 0,
        visibleMs: 0,
        maxVisibility: 0,
        firstSeenAt: observedAt,
        lastSeenAt: observedAt,
        activeStartedAt: null,
        visitActive: false,
    };

    record.viewCount += 1;
    record.visitActive = true;
    record.activeStartedAt = now;
    recordCheckpoint(record, visibility, observedAt);
    engagementRecords.set(sectionKey, record);

    const delta = getDelta(record, observedAt);
    delta.viewCount += 1;
}

export function recordSectionVisibility(
    sectionKey: string,
    visibility: number,
    observedAt: string,
): void {
    const record = engagementRecords.get(sectionKey);
    if (!record?.visitActive) return;

    recordCheckpoint(record, visibility, observedAt);
}

export function pauseSectionEngagement(
    sectionKey: string,
    now: number,
    observedAt: string,
): void {
    const record = engagementRecords.get(sectionKey);
    if (!record?.visitActive || record.activeStartedAt === null) return;

    flushActiveDuration(record, now, observedAt);
    record.activeStartedAt = null;
}

export function resumeSectionEngagement(
    sectionKey: string,
    visibility: number,
    now: number,
    observedAt: string,
): void {
    const record = engagementRecords.get(sectionKey);
    if (!record?.visitActive || record.activeStartedAt !== null) return;

    record.activeStartedAt = now;
    recordCheckpoint(record, visibility, observedAt);
}

export function endSectionEngagement(
    sectionKey: string,
    now: number,
    observedAt: string,
): void {
    const record = engagementRecords.get(sectionKey);
    if (!record?.visitActive) return;

    flushActiveDuration(record, now, observedAt);
    record.activeStartedAt = null;
    record.visitActive = false;
    record.lastSeenAt = observedAt;
    getDelta(record, observedAt).lastSeenAt = observedAt;
}

function flushAllActiveRecords(): void {
    const now = performance.now();
    const observedAt = new Date().toISOString();

    engagementRecords.forEach((record) => {
        flushActiveDuration(record, now, observedAt);
    });
}

function serializeMetric(
    metric: SectionEngagementMetric,
): SectionEngagementMetric {
    return {
        sectionKey: metric.sectionKey,
        viewCount: metric.viewCount,
        visibleMs: Math.max(0, Math.round(metric.visibleMs)),
        maxVisibility: clampVisibility(metric.maxVisibility),
        firstSeenAt: metric.firstSeenAt,
        lastSeenAt: metric.lastSeenAt,
    };
}

export function snapshotEngagement(): SectionEngagementMetric[] {
    flushAllActiveRecords();

    return Array.from(engagementRecords.values(), serializeMetric).sort(
        (first, second) => first.sectionKey.localeCompare(second.sectionKey),
    );
}

export function consumeEngagementDeltas(): SectionEngagementMetric[] {
    flushAllActiveRecords();

    const deltas = Array.from(engagementDeltas.values(), serializeMetric).sort(
        (first, second) => first.sectionKey.localeCompare(second.sectionKey),
    );
    engagementDeltas.clear();

    return deltas;
}
