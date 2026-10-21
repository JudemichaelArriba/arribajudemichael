import { TECH_CATEGORIES } from '@/lib/techStack';
import {
  GAP,
  KEY_ROWS,
  MARKED_KEYS,
  TOOL_NAMES,
  labelForKey,
  readoutGlyph,
  shouldMirrorKey,
  toolLetter,
  toolsForKey,
} from '../layout';

function keyEvent(key: string, overrides: Partial<Parameters<typeof shouldMirrorKey>[0]> = {}) {
  return { key, defaultPrevented: false, ctrlKey: false, metaKey: false, altKey: false, target: document.body, ...overrides };
}

describe('keyboard layout', () => {
  it('keeps every row of the 75% board exactly 16 units wide', () => {
    for (const row of KEY_ROWS) {
      const width = row.reduce((sum, [, w = 1]) => sum + w, 0);
      expect(width).toBe(16);
    }
  });

  it('marks exactly the letters that start a tool, from the shared tech stack data', () => {
    const expected = new Set(TECH_CATEGORIES.flatMap((c) => c.technologies.map((t) => t.name[0].toUpperCase())));
    expect(MARKED_KEYS).toEqual(expected);
    expect(TOOL_NAMES).toHaveLength(TECH_CATEGORIES.reduce((n, c) => n + c.technologies.length, 0));
  });

  it('finds the tools on a key, case-insensitively, and none on modifiers', () => {
    expect(toolsForKey('j')).toEqual(['JavaScript', 'Java']);
    expect(toolsForKey('N')).toEqual(['Next.js', 'Node.js']);
    expect(toolsForKey('Q')).toEqual([]);
    expect(toolsForKey('Shift')).toEqual([]);
    expect(toolLetter('visual Studio Code')).toBe('V');
  });

  it('shows the full key name in the readout, never a truncated one', () => {
    expect(readoutGlyph('a')).toBe('A');
    expect(readoutGlyph('Esc')).toBe('Esc');
    expect(readoutGlyph('Space')).toBe('Space');
    expect(readoutGlyph('Backspace')).toBe('Backspace');
  });
});

describe('labelForKey', () => {
  it('maps browser keys to board labels', () => {
    expect(labelForKey('a')).toBe('A');
    expect(labelForKey(' ')).toBe('Space');
    expect(labelForKey('ArrowLeft')).toBe('←');
    expect(labelForKey('Escape')).toBe('Esc');
    expect(labelForKey('Meta')).toBe('Cmd');
  });

  it('returns null for keys the board does not have', () => {
    expect(labelForKey('F13')).toBeNull();
    expect(labelForKey('Dead')).toBeNull();
    expect(labelForKey('é')).toBeNull();
    expect(labelForKey(GAP)).toBeNull();
    expect(labelForKey('KNOB')).toBeNull();
  });
});

describe('shouldMirrorKey', () => {
  it('mirrors plain key presses on the page', () => {
    expect(shouldMirrorKey(keyEvent('r'))).toBe(true);
    expect(shouldMirrorKey(keyEvent('Enter'))).toBe(true);
  });

  it('never reacts to shortcuts or already-handled keys', () => {
    expect(shouldMirrorKey(keyEvent('c', { ctrlKey: true }))).toBe(false);
    expect(shouldMirrorKey(keyEvent('k', { metaKey: true }))).toBe(false);
    expect(shouldMirrorKey(keyEvent('a', { altKey: true }))).toBe(false);
    expect(shouldMirrorKey(keyEvent('a', { defaultPrevented: true }))).toBe(false);
  });

  it('ignores typing in fields, editable regions and dialogs (contact form, Ask overlay)', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const select = document.createElement('select');
    const editable = document.createElement('div');
    Object.defineProperty(editable, 'isContentEditable', { value: true });
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const insideDialog = document.createElement('button');
    dialog.appendChild(insideDialog);
    document.body.appendChild(dialog);

    for (const target of [input, textarea, select, editable, insideDialog]) {
      expect(shouldMirrorKey(keyEvent('a', { target }))).toBe(false);
    }
    dialog.remove();
  });

  it('ignores keys the board cannot show', () => {
    expect(shouldMirrorKey(keyEvent('F13'))).toBe(false);
  });
});
