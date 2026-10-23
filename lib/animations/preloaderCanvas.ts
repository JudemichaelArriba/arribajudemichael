import { COUNTER_CAP_HEIGHT, COUNTER_GLYPHS, JM_BASELINE, JM_CONTOURS, JM_INK_CENTER_X } from './preloaderGlyphs';

/**
 * The preloader's drawing: the JM outline traced by the loading progress, the percentage under it,
 * then the fill-and-clear reveal. Pure canvas code with no DOM access, so the same painter runs in
 * the Web Worker (`preloader.worker.ts`, smooth even while the main thread is busy) or, where
 * OffscreenCanvas is missing, on the main thread.
 */

/** The logo space: JM and counter, 520 units wide (the canvas keeps this aspect ratio). */
export const PRELOADER_ART_WIDTH = 520;
export const PRELOADER_ART_HEIGHT = 160;

export interface PreloaderPalette {
    text: string;
    muted: string;
}

export interface PreloaderPainterEvents {
    /** The whole percentage shown changed (1–100). */
    percent: (value: number) => void;
    /** The outline reached 100%: the reveal is starting. */
    complete: () => void;
    /** The letters have filled and cleared: time to lift the curtain. */
    revealed: () => void;
}

export interface PreloaderPainter {
    /** Real loading progress, 0–1 (ignored if lower than before). */
    setTarget: (value: number) => void;
    /** Canvas size in device pixels. */
    resize: (width: number, height: number) => void;
    /** Advances and draws one frame; returns false once the reveal is over. */
    frame: (now: number) => boolean;
}

type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const OUTLINE_WIDTH = 1.2;
/** Counter size and placement in the logo space. */
const COUNTER_SIZE = 23;
const COUNTER_GAP = 30;
const COUNTER_PERCENT_SCALE = 0.62;
const COUNTER_PERCENT_SPACE = 0.18;
/** Digits sit in equal cells (tabular), so the number never jitters sideways while counting. */
const COUNTER_CELL = Math.max(...'23456789'.split('').map((digit) => COUNTER_GLYPHS[digit].advance));
/**
 * Optical centring. The letters' side bearings put the JM's ink 1-2 units left of the layout
 * centre, so the whole drawing is shifted until the ink sits on the canvas centre line. The digits
 * centre on that same line and the small % hangs to their right, outside the centring: the eye
 * reads the number, not its unit, as the thing under the mark.
 */
const OPTICAL_SHIFT = PRELOADER_ART_WIDTH / 2 - JM_INK_CENTER_X;

/**
 * Pacing. Real progress arrives in uneven jumps (the keyboard reports set-up, rows, legends,
 * shaders…) with flat stretches between them, and the drawing should feel like that real loading:
 * it chases each jump quickly, then settles into a slow crawl a little past the real progress
 * (a share of what is left, never 100%) while loading waits, so it never stops dead. Only real
 * completion lets it reach 100%, which it then finishes decisively. The speed itself eases, so
 * the changes between chase, crawl and finish are smooth.
 */
const CHASE_RATE = 5;
const CRAWL_SHARE = 0.25;
const CRAWL_RATE = 0.8;
const CRAWL_MIN_SPEED = 0.025;
const CRAWL_CEILING = 0.99;
const FINISH_RATE = 6;
const FINISH_MIN_SPEED = 0.8;
const MAX_SPEED = 1.6;
const SPEED_EASE_MS = 90;
/**
 * The letters are drawn in writing order, J then M, overlapping a little like a pen moving on.
 * Each contour gets its share of the progress by length, widened by this much on each side.
 */
const STROKE_OVERLAP = 0.07;

/** Reveal timing (ms after the outline completes), as the curtain's choreography. */
const FILL_MS = 250;
const HOLD_MS = 150;
const CLEAR_MS = 420;
const FADE_MS = 400;
const COUNTER_FADE_IN_MS = 250;

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/**
 * The whole percentage for a shown progress. Starts at 1 (the counter appears with the first
 * stroke, never as "0") and reads 100 only once the outline is complete.
 */
export function preloaderPercent(value: number): number {
    if (value >= 1) return 100;
    return Math.min(99, Math.max(1, Math.round(value * 100)));
}

export function createPreloaderPainter(ctx: Context2D, palette: PreloaderPalette, events: PreloaderPainterEvents): PreloaderPainter {
    const totalLength = JM_CONTOURS.reduce((sum, { length }) => sum + length, 0);
    let traced = 0;
    const contours = JM_CONTOURS.map(({ d, length }) => {
        const from = Math.max(0, traced / totalLength - STROKE_OVERLAP);
        traced += length;
        const to = Math.min(1, traced / totalLength + STROKE_OVERLAP);
        return { path: new Path2D(d), length, from, to };
    });
    const letters = new Path2D(JM_CONTOURS.map(({ d }) => d).join(''));
    const glyphs = new Map(Object.entries(COUNTER_GLYPHS).map(([char, { d, advance }]) => [char, { path: new Path2D(d), advance }]));

    let target = 0;
    let value = 0;
    let speed = 0;
    let shown = 0;
    let last: number | null = null;
    let drawingSince: number | null = null;
    let completedAt: number | null = null;
    let revealed = false;
    let dirty = true;

    const draw = (now: number) => {
        const { width, height } = ctx.canvas;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, width, height);
        if (drawingSince === null) return;
        const scale = width / PRELOADER_ART_WIDTH;
        const shiftX = OPTICAL_SHIFT * scale;
        ctx.setTransform(scale, 0, 0, scale, shiftX, 0);

        const sinceComplete = completedAt === null ? -1 : now - completedAt;
        const fill = sinceComplete < 0 ? 0 : easeOut(clamp01(sinceComplete / FILL_MS));
        const clearing = sinceComplete < 0 ? 0 : clamp01((sinceComplete - FILL_MS - HOLD_MS) / CLEAR_MS);
        const fading = sinceComplete < 0 ? 0 : easeInOut(clamp01((sinceComplete - FILL_MS - HOLD_MS) / FADE_MS));

        // Each contour is traced over its own length within its share of the progress, so the
        // strokes follow one another and all complete exactly at 100%.
        ctx.strokeStyle = palette.text;
        ctx.lineWidth = OUTLINE_WIDTH;
        const undrawn = easeInOut(clearing);
        for (const { path, length, from, to } of contours) {
            const drawn = completedAt === null ? clamp01((value - from) / (to - from)) : 1;
            if (drawn <= 0) continue;
            ctx.setLineDash([length, length]);
            ctx.lineDashOffset = completedAt === null ? length * (1 - drawn) : length * undrawn;
            ctx.stroke(path);
        }
        ctx.setLineDash([]);

        if (fill > 0) {
            ctx.globalAlpha = fill * (1 - fading);
            ctx.fillStyle = palette.text;
            ctx.fill(letters);
        }

        // The counter: digits centred under the JM's ink, the % hanging after them at cap height.
        const digits = String(shown);
        const percentScale = COUNTER_PERCENT_SCALE;
        const percent = glyphs.get('%');
        const digitsWidth = digits.length * COUNTER_CELL * COUNTER_SIZE;
        const capTop = JM_BASELINE + COUNTER_GAP;
        const baseline = capTop + COUNTER_CAP_HEIGHT * COUNTER_SIZE;
        const appear = easeOut(clamp01((now - drawingSince) / COUNTER_FADE_IN_MS));
        ctx.globalAlpha = (0.3 + 0.7 * appear) * (1 - fading);
        ctx.fillStyle = palette.text;
        let x = PRELOADER_ART_WIDTH / 2 - digitsWidth / 2;
        for (const char of digits) {
            const glyph = glyphs.get(char);
            if (glyph) {
                const left = x + ((COUNTER_CELL - glyph.advance) / 2) * COUNTER_SIZE;
                ctx.setTransform(scale * COUNTER_SIZE, 0, 0, scale * COUNTER_SIZE, shiftX + scale * left, scale * baseline);
                ctx.fill(glyph.path);
            }
            x += COUNTER_CELL * COUNTER_SIZE;
        }
        if (percent) {
            const size = COUNTER_SIZE * percentScale;
            x += COUNTER_PERCENT_SPACE * COUNTER_SIZE;
            ctx.fillStyle = palette.muted;
            ctx.setTransform(scale * size, 0, 0, scale * size, shiftX + scale * x, scale * (capTop + COUNTER_CAP_HEIGHT * size));
            ctx.fill(percent.path);
        }
        ctx.globalAlpha = 1;
    };

    return {
        setTarget: (next) => {
            target = Math.max(target, Math.min(1, next));
        },
        resize: (width, height) => {
            if (ctx.canvas.width === width && ctx.canvas.height === height) return;
            ctx.canvas.width = width;
            ctx.canvas.height = height;
            dirty = true;
        },
        frame: (now) => {
            if (revealed) return false;
            // Frame time is capped, so a stalled frame (hidden tab, busy fallback thread) resumes
            // where it was instead of jumping.
            const dtMs = last === null ? 0 : Math.min(now - last, 34);
            const dt = dtMs / 1000;
            last = now;

            if (completedAt === null && target > 0) {
                const finishing = target >= 1;
                const ceiling = finishing ? 1 : Math.min(CRAWL_CEILING, target + (1 - target) * CRAWL_SHARE);
                let desired: number;
                if (finishing) desired = Math.max((1 - value) * FINISH_RATE, FINISH_MIN_SPEED);
                else if (value < target) desired = (target - value) * CHASE_RATE + CRAWL_MIN_SPEED;
                else desired = ceiling - value > 0.002 ? Math.max((ceiling - value) * CRAWL_RATE, CRAWL_MIN_SPEED) : 0;
                speed += (Math.min(MAX_SPEED, desired) - speed) * (1 - Math.exp(-dtMs / SPEED_EASE_MS));
                const next = Math.min(ceiling, value + speed * dt);
                if (next > value) {
                    value = next;
                    if (value > 0 && drawingSince === null) drawingSince = now;
                    const percent = preloaderPercent(value);
                    if (percent !== shown) {
                        shown = percent;
                        events.percent(percent);
                    }
                    dirty = true;
                }
                if (value >= 1) {
                    completedAt = now;
                    events.complete();
                }
            }

            const animating =
                completedAt !== null || (drawingSince !== null && now - drawingSince <= COUNTER_FADE_IN_MS);
            if (dirty || animating) {
                draw(now);
                dirty = false;
            }
            if (completedAt !== null && now - completedAt >= FILL_MS + HOLD_MS + CLEAR_MS) {
                revealed = true;
                events.revealed();
                return false;
            }
            return true;
        },
    };
}
