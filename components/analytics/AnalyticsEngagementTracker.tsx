'use client';

import { useEffect } from 'react';

import {
    beginSectionEngagement,
    endSectionEngagement,
    pauseSectionEngagement,
    recordSectionVisibility,
    resumeSectionEngagement,
} from '@/features/analytics/engagement';

const TRACKED_SECTION_SELECTOR = '[data-analytics-section]';
const SECTION_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
const MAX_SECTION_KEY_LENGTH = 64;
const MEANINGFUL_VISIBILITY = 0.25;
const MEANINGFUL_DWELL_MS = 1_000;
const VISIBILITY_THRESHOLDS = [0, 0.25, 0.5, 0.75, 1];

interface TrackedSection {
    element: HTMLElement;
    sectionKey: string;
    currentVisibility: number;
    maxVisibility: number;
    isInEngagementBand: boolean;
    isMeaningfullyEngaged: boolean;
    qualificationTimerId: number | null;
}

interface ViewportMeasurement {
    visibility: number;
    isInEngagementBand: boolean;
}

function clampRatio(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
}

function measureViewportVisibility(
    element: HTMLElement,
): ViewportMeasurement {
    const bounds = element.getBoundingClientRect();
    const viewportWidth = Math.max(
        0,
        window.innerWidth || document.documentElement.clientWidth,
    );
    const viewportHeight = Math.max(
        0,
        window.innerHeight || document.documentElement.clientHeight,
    );

    if (
        bounds.width <= 0 ||
        bounds.height <= 0 ||
        viewportWidth <= 0 ||
        viewportHeight <= 0
    ) {
        return { visibility: 0, isInEngagementBand: false };
    }

    const intersectionWidth = Math.max(
        0,
        Math.min(bounds.right, viewportWidth) - Math.max(bounds.left, 0),
    );
    const intersectionHeight = Math.max(
        0,
        Math.min(bounds.bottom, viewportHeight) - Math.max(bounds.top, 0),
    );
    const intersectionArea = intersectionWidth * intersectionHeight;

    if (intersectionArea <= 0) {
        return { visibility: 0, isInEngagementBand: false };
    }

    const targetRatio = intersectionArea / (bounds.width * bounds.height);
    const viewportRatio =
        intersectionArea / (viewportWidth * viewportHeight);

    const engagementBandTop = viewportHeight * MEANINGFUL_VISIBILITY;
    const engagementBandBottom =
        viewportHeight * (1 - MEANINGFUL_VISIBILITY);
    const engagementBandHeight = Math.max(
        0,
        Math.min(bounds.bottom, engagementBandBottom) -
            Math.max(bounds.top, engagementBandTop),
    );

    return {
        visibility: clampRatio(Math.max(targetRatio, viewportRatio)),
        isInEngagementBand:
            intersectionWidth > 0 && engagementBandHeight > 0,
    };
}

function getSectionKey(element: HTMLElement): string | null {
    const sectionKey = element.dataset.analyticsSection?.trim();

    if (
        !sectionKey ||
        sectionKey.length > MAX_SECTION_KEY_LENGTH ||
        !SECTION_KEY_PATTERN.test(sectionKey)
    ) {
        return null;
    }

    return sectionKey;
}

export default function AnalyticsEngagementTracker() {
    useEffect(() => {
        const trackedByElement = new Map<HTMLElement, TrackedSection>();
        const trackedByKey = new Map<string, TrackedSection>();
        let isDisposed = false;
        let isPageActive = document.visibilityState === 'visible';

        const clearQualificationTimer = (state: TrackedSection) => {
            if (state.qualificationTimerId === null) return;

            window.clearTimeout(state.qualificationTimerId);
            state.qualificationTimerId = null;
        };

        const isCurrentlyMeaningful = (state: TrackedSection) =>
            state.currentVisibility >= MEANINGFUL_VISIBILITY ||
            state.isInEngagementBand;

        const refreshVisibility = (state: TrackedSection) => {
            const measurement = measureViewportVisibility(state.element);
            state.currentVisibility = measurement.visibility;
            state.isInEngagementBand = measurement.isInEngagementBand;

            if (isPageActive) {
                state.maxVisibility = Math.max(
                    state.maxVisibility,
                    state.currentVisibility,
                );
            }
        };

        const startQualificationTimer = (state: TrackedSection) => {
            if (
                state.qualificationTimerId !== null ||
                state.isMeaningfullyEngaged ||
                !isPageActive
            ) {
                return;
            }

            state.qualificationTimerId = window.setTimeout(() => {
                state.qualificationTimerId = null;

                if (
                    isDisposed ||
                    !isPageActive ||
                    document.visibilityState !== 'visible' ||
                    !state.element.isConnected
                ) {
                    return;
                }

                refreshVisibility(state);
                if (!isCurrentlyMeaningful(state)) return;

                state.isMeaningfullyEngaged = true;
                beginSectionEngagement(
                    state.sectionKey,
                    state.maxVisibility,
                    performance.now(),
                    new Date().toISOString(),
                );
            }, MEANINGFUL_DWELL_MS);
        };

        const evaluateSection = (
            state: TrackedSection,
            shouldRecordCheckpoint: boolean,
        ) => {
            refreshVisibility(state);

            if (!isPageActive || document.visibilityState !== 'visible') {
                clearQualificationTimer(state);
                return;
            }

            if (isCurrentlyMeaningful(state)) {
                if (state.isMeaningfullyEngaged) {
                    if (shouldRecordCheckpoint) {
                        recordSectionVisibility(
                            state.sectionKey,
                            state.maxVisibility,
                            new Date().toISOString(),
                        );
                    }
                } else {
                    startQualificationTimer(state);
                }

                return;
            }

            clearQualificationTimer(state);

            if (state.isMeaningfullyEngaged) {
                state.isMeaningfullyEngaged = false;
                endSectionEngagement(
                    state.sectionKey,
                    performance.now(),
                    new Date().toISOString(),
                );
            }
        };

        const visibilityObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const state = trackedByElement.get(
                        entry.target as HTMLElement,
                    );
                    if (state) evaluateSection(state, true);
                });
            },
            { threshold: VISIBILITY_THRESHOLDS },
        );

        const engagementBandObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const state = trackedByElement.get(
                        entry.target as HTMLElement,
                    );
                    if (!state) return;

                    evaluateSection(state, true);
                });
            },
            {
                rootMargin: '-25% 0px -25% 0px',
                threshold: 0,
            },
        );

        const unregisterSection = (element: HTMLElement) => {
            const state = trackedByElement.get(element);
            if (!state) return;

            clearQualificationTimer(state);
            visibilityObserver.unobserve(element);
            engagementBandObserver.unobserve(element);

            if (state.isMeaningfullyEngaged) {
                state.isMeaningfullyEngaged = false;
                endSectionEngagement(
                    state.sectionKey,
                    performance.now(),
                    new Date().toISOString(),
                );
            }

            trackedByElement.delete(element);
            if (trackedByKey.get(state.sectionKey) === state) {
                trackedByKey.delete(state.sectionKey);
            }
        };

        const registerSection = (element: HTMLElement) => {
            if (trackedByElement.has(element)) return;

            const sectionKey = getSectionKey(element);
            if (!sectionKey) return;

            const existing = trackedByKey.get(sectionKey);
            if (existing) {
                if (existing.element.isConnected) return;
                unregisterSection(existing.element);
            }

            const state: TrackedSection = {
                element,
                sectionKey,
                currentVisibility: 0,
                maxVisibility: 0,
                isInEngagementBand: false,
                isMeaningfullyEngaged: false,
                qualificationTimerId: null,
            };

            trackedByElement.set(element, state);
            trackedByKey.set(sectionKey, state);
            visibilityObserver.observe(element);
            engagementBandObserver.observe(element);
        };

        const registerFromNode = (node: Node) => {
            if (!(node instanceof HTMLElement)) return;

            if (node.matches(TRACKED_SECTION_SELECTOR)) {
                registerSection(node);
            }

            node.querySelectorAll<HTMLElement>(TRACKED_SECTION_SELECTOR)
                .forEach(registerSection);
        };

        document.querySelectorAll<HTMLElement>(TRACKED_SECTION_SELECTOR)
            .forEach(registerSection);

        const mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.removedNodes.forEach((node) => {
                    trackedByElement.forEach((state) => {
                        if (
                            !state.element.isConnected &&
                            (node === state.element || node.contains(state.element))
                        ) {
                            unregisterSection(state.element);
                        }
                    });
                });

                mutation.addedNodes.forEach(registerFromNode);
            });
        });

        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });

        const pauseTracking = () => {
            if (!isPageActive) return;
            isPageActive = false;

            const now = performance.now();
            const observedAt = new Date().toISOString();

            trackedByElement.forEach((state) => {
                clearQualificationTimer(state);
                if (state.isMeaningfullyEngaged) {
                    pauseSectionEngagement(
                        state.sectionKey,
                        now,
                        observedAt,
                    );
                }
            });
        };

        const resumeTracking = () => {
            if (isPageActive || document.visibilityState !== 'visible') return;
            isPageActive = true;

            const now = performance.now();
            const observedAt = new Date().toISOString();

            trackedByElement.forEach((state) => {
                refreshVisibility(state);

                if (isCurrentlyMeaningful(state)) {
                    if (state.isMeaningfullyEngaged) {
                        resumeSectionEngagement(
                            state.sectionKey,
                            state.maxVisibility,
                            now,
                            observedAt,
                        );
                    } else {
                        startQualificationTimer(state);
                    }
                    return;
                }

                if (state.isMeaningfullyEngaged) {
                    state.isMeaningfullyEngaged = false;
                    endSectionEngagement(
                        state.sectionKey,
                        now,
                        observedAt,
                    );
                }
            });
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                resumeTracking();
            } else {
                pauseTracking();
            }
        };

        const handlePageHide = () => pauseTracking();
        const handlePageShow = () => resumeTracking();
        const handleFreeze = () => pauseTracking();
        const handleResume = () => resumeTracking();

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handlePageHide);
        window.addEventListener('pageshow', handlePageShow);
        document.addEventListener('freeze', handleFreeze);
        document.addEventListener('resume', handleResume);

        return () => {
            pauseTracking();
            isDisposed = true;
            mutationObserver.disconnect();
            Array.from(trackedByElement.keys()).forEach(unregisterSection);
            visibilityObserver.disconnect();
            engagementBandObserver.disconnect();
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange,
            );
            window.removeEventListener('pagehide', handlePageHide);
            window.removeEventListener('pageshow', handlePageShow);
            document.removeEventListener('freeze', handleFreeze);
            document.removeEventListener('resume', handleResume);
        };
    }, []);

    return null;
}
