import { TECH_CATEGORIES } from '@/lib/techStack';

/** A key: label, width in units (1u = 19.05mm), and kind (0 = alpha, 1 = accent, 2 = modifier). */
export type KeyKind = 0 | 1 | 2;
export type KeySpec = readonly [label: string, width?: number, kind?: KeyKind];

/** `GAP` reserves horizontal space without drawing a key. */
export const GAP = '_';

// 75% layout with a volume knob, ported 1:1 from the Keyboard page design.
export const KEY_ROWS: readonly (readonly KeySpec[])[] = [
    [['Esc', 1, 1], [GAP, 0.25], ['F1'], ['F2'], ['F3'], ['F4'], [GAP, 0.25], ['F5'], ['F6'], ['F7'], ['F8'], [GAP, 0.25], ['F9'], ['F10'], ['F11'], ['F12'], [GAP, 0.25], ['Del', 1, 2], ['KNOB', 1]],
    [['`'], ['1'], ['2'], ['3'], ['4'], ['5'], ['6'], ['7'], ['8'], ['9'], ['0'], ['-'], ['='], ['Backspace', 2, 2], ['PgUp', 1, 2]],
    [['Tab', 1.5, 2], ['Q'], ['W'], ['E'], ['R'], ['T'], ['Y'], ['U'], ['I'], ['O'], ['P'], ['['], [']'], ['\\', 1.5, 2], ['PgDn', 1, 2]],
    [['Caps', 1.75, 2], ['A'], ['S'], ['D'], ['F'], ['G'], ['H'], ['J'], ['K'], ['L'], [';'], ["'"], ['Enter', 2.25, 1], ['Home', 1, 2]],
    [['Shift', 2.25, 2], ['Z'], ['X'], ['C'], ['V'], ['B'], ['N'], ['M'], [','], ['.'], ['/'], ['Shift', 1.75, 2], ['↑', 1, 2], ['End', 1, 2]],
    [['Ctrl', 1.25, 2], ['Opt', 1.25, 2], ['Cmd', 1.25, 2], ['Space', 6.25, 0], ['Cmd', 1, 2], ['Fn', 1, 2], ['Ctrl', 1, 2], ['←', 1, 2], ['↓', 1, 2], ['→', 1, 2]],
];

/** Every tool name in the section, in display order. */
export const TOOL_NAMES: readonly string[] = TECH_CATEGORIES.flatMap((category) =>
    category.technologies.map((technology) => technology.name),
);

/** The key a tool lives on: its first letter. */
export function toolLetter(tool: string): string {
    return tool.charAt(0).toUpperCase();
}

/** Letter → tools that start with it (only letters that have tools appear). */
export const TOOLS_BY_LETTER: ReadonlyMap<string, readonly string[]> = TOOL_NAMES.reduce((map, tool) => {
    const letter = toolLetter(tool);
    map.set(letter, [...(map.get(letter) ?? []), tool]);
    return map;
}, new Map<string, string[]>());

/** Keys that show a dot because a tool starts with that letter. */
export const MARKED_KEYS: ReadonlySet<string> = new Set(TOOLS_BY_LETTER.keys());

export function toolsForKey(label: string): readonly string[] {
    return label.length === 1 ? TOOLS_BY_LETTER.get(label.toUpperCase()) ?? [] : [];
}

/** What the big readout shows for a pressed key: the full key name, never truncated. */
export function readoutGlyph(label: string): string {
    return label.length === 1 ? label.toUpperCase() : label;
}

const KEY_ALIASES: Readonly<Record<string, string>> = {
    Escape: 'Esc',
    Backspace: 'Backspace',
    Tab: 'Tab',
    CapsLock: 'Caps',
    Enter: 'Enter',
    Shift: 'Shift',
    Control: 'Ctrl',
    Alt: 'Opt',
    Meta: 'Cmd',
    ' ': 'Space',
    Delete: 'Del',
    PageUp: 'PgUp',
    PageDown: 'PgDn',
    Home: 'Home',
    End: 'End',
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
};

const KEY_LABELS: ReadonlySet<string> = new Set(
    KEY_ROWS.flat().map(([label]) => label).filter((label) => label !== GAP && label !== 'KNOB'),
);

/** Maps a KeyboardEvent.key to a key label on the board, or null when the board has no such key. */
export function labelForKey(key: string): string | null {
    const label = KEY_ALIASES[key] ?? (key.length === 1 ? key.toUpperCase() : key);
    return KEY_LABELS.has(label) ? label : null;
}

interface KeyTargetLike {
    readonly tagName?: string;
    readonly isContentEditable?: boolean;
    closest?: (selector: string) => unknown;
}

interface KeyEventLike {
    readonly key: string;
    readonly defaultPrevented: boolean;
    readonly ctrlKey: boolean;
    readonly metaKey: boolean;
    readonly altKey: boolean;
    readonly target: unknown;
}

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Whether a physical key press should light up the on-screen keyboard.
 *
 * Never for shortcuts, never while someone types in a field or a dialog (contact form,
 * the Ask overlay), and never for keys the board does not have. The caller must not call
 * preventDefault: scrolling, Tab focus and every other default stays untouched.
 */
export function shouldMirrorKey(event: KeyEventLike): boolean {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return false;

    const target = event.target as KeyTargetLike | null;
    if (target && typeof target === 'object') {
        if (target.isContentEditable) return false;
        if (target.tagName && EDITABLE_TAGS.has(target.tagName.toUpperCase())) return false;
        if (typeof target.closest === 'function' && target.closest('[role="dialog"], dialog, [contenteditable="true"]')) {
            return false;
        }
    }

    return labelForKey(event.key) !== null;
}
