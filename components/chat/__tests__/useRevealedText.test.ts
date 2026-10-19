import { wordBoundaryAtOrBefore } from '../useRevealedText';

describe('wordBoundaryAtOrBefore', () => {
  const text = 'Jude builds APIs';

  it('cuts at the space before a partially revealed word', () => {
    expect(text.slice(0, wordBoundaryAtOrBefore(text, 8))).toBe('Jude');
    expect(text.slice(0, wordBoundaryAtOrBefore(text, 13))).toBe('Jude builds');
  });

  it('keeps everything once the end is reached', () => {
    expect(wordBoundaryAtOrBefore(text, text.length)).toBe(text.length);
    expect(wordBoundaryAtOrBefore(text, 99)).toBe(text.length);
  });

  it('shows nothing while still inside the first word', () => {
    expect(wordBoundaryAtOrBefore(text, 2)).toBe(0);
  });

  it('treats line breaks as word boundaries', () => {
    const list = 'Projects:\n- Admission System';
    expect(list.slice(0, wordBoundaryAtOrBefore(list, 12))).toBe('Projects:\n-');
  });
});
