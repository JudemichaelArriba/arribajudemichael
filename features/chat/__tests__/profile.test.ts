/** @jest-environment node */

import { buildProfileContext, getAgeOn } from '../profile';

describe('getAgeOn', () => {
  it('turns over at midnight Philippine time on the birthday, not UTC', () => {
    // 2026-01-25 23:59:59 and 2026-01-26 00:00:00 in Asia/Manila (UTC+8).
    expect(getAgeOn(new Date('2026-01-25T15:59:59Z'))).toBe(20);
    expect(getAgeOn(new Date('2026-01-25T16:00:00Z'))).toBe(21);
  });

  it('holds the age for the rest of the year', () => {
    expect(getAgeOn(new Date('2026-10-20T04:00:00Z'))).toBe(21);
    expect(getAgeOn(new Date('2027-01-25T12:00:00Z'))).toBe(21);
    expect(getAgeOn(new Date('2027-01-26T12:00:00Z'))).toBe(22);
  });
});

describe('buildProfileContext', () => {
  it('sends the current age but never the birth date', () => {
    const context = buildProfileContext(new Date('2026-10-20T04:00:00Z'));

    expect(context).toContain('Age: 21.');
    expect(context).not.toMatch(/2005|January|26/);
  });
});
