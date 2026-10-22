import gsap from 'gsap';
import {
    createPreloaderPainter,
    PRELOADER_ART_HEIGHT,
    PRELOADER_ART_WIDTH,
    type PreloaderPainterEvents,
    type PreloaderPalette,
} from './preloaderCanvas';
import type { PreloaderWorkerEvent, PreloaderWorkerMessage } from './preloader.worker';

/** Dash length of the login page's JM outline. */
export const PRELOADER_DASH_LENGTH = 500;

/**
 * Starts the drawing worker, or returns null where OffscreenCanvas or workers are missing (the
 * painter then runs on the main thread). The Preloader calls this as soon as its module loads:
 * the browser needs a few free moments on the main thread to start a worker, and hydration fills
 * the main thread for most of a second, so a worker started at mount is late to its first frame.
 */
export function createPreloaderWorker(): Worker | null {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;
    if (!('transferControlToOffscreen' in HTMLCanvasElement.prototype)) return null;
    try {
        return new Worker(new URL('./preloader.worker.ts', import.meta.url), { type: 'module' });
    } catch {
        return null;
    }
}

interface PreloaderCanvasOptions {
    /** Box the canvas fills (its width sets the size; the height follows the art's aspect). */
    stage: HTMLElement;
    palette: PreloaderPalette;
    /** Real loading progress, 0–1. */
    target: () => number;
    events: PreloaderPainterEvents;
    /** A worker started early (see `createPreloaderWorker`); null draws on the main thread. */
    worker: Worker | null;
}

/**
 * Starts the preloader drawing (JM outline, counter, reveal) on a canvas inside `stage`. It runs in a
 * Web Worker on an OffscreenCanvas wherever possible, so the main thread's stalls (hydration, the
 * keyboard's WebGL set-up) never freeze it; otherwise the same painter runs on the main thread. The
 * real progress is sent across whenever it changes. Returns a stop function.
 */
export function startPreloaderCanvas({ stage, palette, target, events, worker }: PreloaderCanvasOptions): () => void {
    let stopped = false;
    let complete = false;
    const relay: PreloaderPainterEvents = {
        percent: (value) => {
            if (!stopped) events.percent(value);
        },
        complete: () => {
            if (stopped || complete) return;
            complete = true;
            events.complete();
        },
        revealed: () => {
            if (!stopped) events.revealed();
        },
    };

    const pixelSize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        const width = Math.max(1, Math.round(stage.clientWidth * dpr));
        return { width, height: Math.round((width * PRELOADER_ART_HEIGHT) / PRELOADER_ART_WIDTH) };
    };
    const mountCanvas = () => {
        const canvas = document.createElement('canvas');
        canvas.className = 'block h-full w-full';
        stage.replaceChildren(canvas);
        return canvas;
    };

    let sendSize: () => void = () => undefined;
    let teardown: () => void = () => undefined;

    const runOnMainThread = () => {
        teardown();
        const ctx = mountCanvas().getContext('2d');
        if (!ctx) {
            // No canvas at all: nothing to draw, so don't hold the page.
            relay.complete();
            relay.revealed();
            return;
        }
        const painter = createPreloaderPainter(ctx, palette, relay);
        const { width, height } = pixelSize();
        painter.resize(width, height);
        const tick = () => {
            painter.setTarget(target());
            if (!painter.frame(performance.now())) gsap.ticker.remove(tick);
        };
        gsap.ticker.add(tick);
        sendSize = () => {
            const size = pixelSize();
            painter.resize(size.width, size.height);
        };
        teardown = () => gsap.ticker.remove(tick);
    };

    const runInWorker = (worker: Worker) => {
        const canvas = mountCanvas();
        const offscreen = canvas.transferControlToOffscreen();
        const post = (message: PreloaderWorkerMessage, transfer: Transferable[] = []) => worker.postMessage(message, transfer);
        worker.onmessage = ({ data }: MessageEvent<PreloaderWorkerEvent>) => {
            if (data.type === 'percent') relay.percent(data.value);
            else if (data.type === 'complete') relay.complete();
            else relay.revealed();
        };
        // The worker failed to load or crashed before finishing: draw on the main thread instead.
        worker.onerror = () => {
            if (!complete && !stopped) runOnMainThread();
        };
        post({ type: 'init', canvas: offscreen, palette, ...pixelSize() }, [offscreen]);
        // Progress lives on the main thread: pass each change across (the worker eases toward it).
        let sent = -1;
        const feed = () => {
            const value = target();
            if (value !== sent) {
                sent = value;
                post({ type: 'target', value });
            }
            if (complete) gsap.ticker.remove(feed);
        };
        feed();
        gsap.ticker.add(feed);
        sendSize = () => post({ type: 'resize', ...pixelSize() });
        teardown = () => {
            gsap.ticker.remove(feed);
            worker.terminate();
        };
    };

    try {
        if (worker) runInWorker(worker);
        else runOnMainThread();
    } catch {
        worker?.terminate();
        runOnMainThread();
    }

    const resize = new ResizeObserver(() => sendSize());
    resize.observe(stage);

    return () => {
        stopped = true;
        resize.disconnect();
        teardown();
    };
}

/**
 * Fades the curtain out. A Web Animation on opacity runs on the compositor, so the fade stays smooth
 * while the hero mounts its entrance underneath. Returns a cancel function.
 */
export function liftPreloaderCurtain(overlay: HTMLElement | null, onComplete: () => void): () => void {
    if (!overlay || typeof overlay.animate !== 'function') {
        onComplete();
        return () => undefined;
    }
    const fade = overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 400,
        delay: 50,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fill: 'forwards',
    });
    fade.onfinish = onComplete;
    return () => fade.cancel();
}
