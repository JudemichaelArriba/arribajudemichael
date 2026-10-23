import type { Theme } from '@/lib/theme';

/** Lighting per page theme (the scene sits on the page background). */
export interface StageLighting {
    shadow: number;
    key: number;
    rim: number;
    fill: number;
    hemi: number;
    exposure: number;
}

/** Board colours. Monochrome only, like the rest of the site. */
export interface BoardPalette {
    caseColor: number;
    caseMetalness: number;
    caseRoughness: number;
    caseEnv: number;
    base: string;
    modifier: string;
    accent: string;
    text: string;
    textModifier: string;
    textAccent: string;
    dot: string;
    dotAccent: string;
    plate: number;
    switchBody: number;
    stem: number;
    keyEnv: number;
    knobMetalness: number;
    knobRoughness: number;
}

const LIGHTING: Record<Theme, StageLighting> = {
    dark: { shadow: 0.75, key: 1.15, rim: 0.6, fill: 0.3, hemi: 0.6, exposure: 1.0 },
    light: { shadow: 0.26, key: 1.1, rim: 0.25, fill: 0.3, hemi: 0.75, exposure: 0.95 },
};

const BLACK_BOARD: BoardPalette = {
    caseColor: 0x111111, caseMetalness: 0.3, caseRoughness: 0.8, caseEnv: 0.25,
    base: '#141414', modifier: '#0e0e0e', accent: '#EDEDED',
    text: '#EDEDED', textModifier: '#b0b0b0', textAccent: '#0B0B0B',
    dot: '#a8a8a8', dotAccent: '#0B0B0B',
    plate: 0x070707, switchBody: 0x151515, stem: 0x222222,
    keyEnv: 0.14, knobMetalness: 0.5, knobRoughness: 0.68,
};

const WHITE_BOARD = (page: Theme): BoardPalette => ({
    caseColor: page === 'dark' ? 0xe9e9e6 : 0xe2e2df, caseMetalness: 0, caseRoughness: 0.85, caseEnv: 0.2,
    base: '#fbfbfa', modifier: '#e9e9e6', accent: '#141414',
    text: '#141414', textModifier: '#5c5c5c', textAccent: '#F7F7F6',
    dot: '#7a7a7a', dotAccent: '#F7F7F6',
    plate: 0xcfcfcc, switchBody: 0xdcdcd9, stem: 0xc9c9c6,
    keyEnv: 0.1, knobMetalness: 0.05, knobRoughness: 0.85,
});

const PALETTES: Record<Theme, BoardPalette> = {
    // The board contrasts with the page: dark page → white keyboard, light page → black keyboard.
    dark: WHITE_BOARD('dark'),
    light: BLACK_BOARD,
};

export function keyboardLook(theme: Theme): { lighting: StageLighting; palette: BoardPalette } {
    return { lighting: LIGHTING[theme], palette: PALETTES[theme] };
}
