import {
  acknowledgeEngagementDeltas,
  beginSectionEngagement,
  pauseSectionEngagement,
  recordSectionVisibility,
  resumeSectionEngagement,
  snapshotEngagementDeltas,
} from '../engagement';

describe('analytics engagement deltas', () => {
  it('acknowledges only the sent snapshot and preserves newer in-flight deltas', () => {
    const sectionKey = 'test-acknowledge-exact-snapshot';

    beginSectionEngagement(sectionKey, 0.4, 0, '2026-08-12T00:00:00.000Z');
    pauseSectionEngagement(sectionKey, 1_000, '2026-08-12T00:00:01.000Z');
    const sentSnapshot = snapshotEngagementDeltas().filter(
      (delta) => delta.sectionKey === sectionKey,
    );

    resumeSectionEngagement(sectionKey, 0.6, 1_000, '2026-08-12T00:00:01.000Z');
    recordSectionVisibility(sectionKey, 0.9, '2026-08-12T00:00:01.300Z');
    pauseSectionEngagement(sectionKey, 1_600, '2026-08-12T00:00:01.600Z');
    acknowledgeEngagementDeltas(sentSnapshot);

    const remaining = snapshotEngagementDeltas().filter(
      (delta) => delta.sectionKey === sectionKey,
    );
    expect(sentSnapshot).toEqual([{
      maxVisibility: 0.4,
      sectionKey,
      viewCount: 1,
      visibleMs: 1_000,
    }]);
    expect(remaining).toEqual([{
      maxVisibility: 0.9,
      sectionKey,
      viewCount: 0,
      visibleMs: 600,
    }]);

    acknowledgeEngagementDeltas(remaining);
  });
});
