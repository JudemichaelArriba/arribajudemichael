import { act, render } from '@testing-library/react';

import {
  acknowledgeEngagementDeltas,
  discardEngagementDeltas,
  snapshotEngagementDeltas,
  type SectionEngagementDelta,
} from '@/features/analytics/engagement';
import {
  getLastAnalyticsActivityAt,
  subscribeToAnalyticsActivity,
} from '@/features/analytics/activity';
import AnalyticsEngagementBatcher from '../AnalyticsEngagementBatcher';

jest.mock('@/features/analytics/engagement', () => ({
  acknowledgeEngagementDeltas: jest.fn(),
  discardEngagementDeltas: jest.fn(),
  snapshotEngagementDeltas: jest.fn(),
}));
jest.mock('@/features/analytics/activity', () => ({
  ANALYTICS_SESSION_INACTIVITY_MS: 30 * 60 * 1_000,
  getLastAnalyticsActivityAt: jest.fn(),
  subscribeToAnalyticsActivity: jest.fn(),
}));

const snapshotMock = jest.mocked(snapshotEngagementDeltas);
const acknowledgeMock = jest.mocked(acknowledgeEngagementDeltas);
const discardMock = jest.mocked(discardEngagementDeltas);
const activityAtMock = jest.mocked(getLastAnalyticsActivityAt);
const subscribeMock = jest.mocked(subscribeToAnalyticsActivity);

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function response(status: number): Response {
  return { status } as Response;
}

function sentPayload(callIndex: number): {
  batchId: string;
  sections: SectionEngagementDelta[];
} {
  const init = jest.mocked(fetch).mock.calls[callIndex][1];
  return JSON.parse(String(init?.body)) as {
    batchId: string;
    sections: SectionEngagementDelta[];
  };
}

describe('AnalyticsEngagementBatcher', () => {
  it('retries immutable batches, acknowledges exact snapshots, and drops stale session work', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-12T00:00:00.000Z'));
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });

    let activityAt = 1_000;
    let activityListener: ((nextActivityAt: number) => void) | undefined;
    activityAtMock.mockImplementation(() => activityAt);
    subscribeMock.mockImplementation((listener) => {
      activityListener = listener;
      return jest.fn();
    });

    const first = [{ maxVisibility: 0.4, sectionKey: 'about', viewCount: 1, visibleMs: 1_000 }];
    const second = [{ maxVisibility: 0.7, sectionKey: 'projects', viewCount: 1, visibleMs: 2_000 }];
    const third = [{ maxVisibility: 0.9, sectionKey: 'contact', viewCount: 1, visibleMs: 3_000 }];
    let currentSnapshot = first;
    snapshotMock.mockImplementation(() => currentSnapshot);

    const requests = [
      deferred<Response>(),
      deferred<Response>(),
      deferred<Response>(),
      deferred<Response>(),
    ];
    global.fetch = jest.fn()
      .mockImplementationOnce(() => requests[0].promise)
      .mockImplementationOnce(() => requests[1].promise)
      .mockImplementationOnce(() => requests[2].promise)
      .mockImplementationOnce(() => requests[3].promise);

    const randomUuid = jest.spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValueOnce('11111111-1111-4111-8111-111111111111')
      .mockReturnValueOnce('22222222-2222-4222-8222-222222222222')
      .mockReturnValueOnce('33333333-3333-4333-8333-333333333333');

    const { unmount } = render(<AnalyticsEngagementBatcher />);

    act(() => jest.advanceTimersByTime(30_000));
    const firstAttempt = sentPayload(0);
    currentSnapshot = second;
    act(() => jest.advanceTimersByTime(30_000));
    expect(fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      requests[0].resolve(response(503));
      await requests[0].promise;
      await Promise.resolve();
    });
    act(() => jest.advanceTimersByTime(30_000));
    expect(sentPayload(1)).toEqual(firstAttempt);

    await act(async () => {
      requests[1].resolve(response(204));
      await requests[1].promise;
      await Promise.resolve();
    });
    expect(acknowledgeMock).toHaveBeenCalledWith(first);

    act(() => jest.advanceTimersByTime(30_000));
    const secondBatch = sentPayload(2);
    expect(secondBatch.sections).toEqual(second);
    expect(secondBatch.batchId).not.toBe(firstAttempt.batchId);

    await act(async () => {
      requests[2].resolve(response(503));
      await requests[2].promise;
      await Promise.resolve();
    });
    activityAt += 30 * 60 * 1_000;
    act(() => activityListener?.(activityAt));
    expect(discardMock).toHaveBeenCalledWith(second);

    currentSnapshot = third;
    act(() => jest.advanceTimersByTime(30_000));
    const thirdBatch = sentPayload(3);
    expect(thirdBatch.sections).toEqual(third);
    expect(thirdBatch.batchId).not.toBe(secondBatch.batchId);

    await act(async () => {
      requests[3].resolve(response(204));
      await requests[3].promise;
      await Promise.resolve();
    });
    expect(acknowledgeMock).toHaveBeenLastCalledWith(third);
    expect(randomUuid).toHaveBeenCalledTimes(3);

    unmount();
    jest.useRealTimers();
  });
});
