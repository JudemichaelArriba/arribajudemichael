import { createPreloaderPainter, type PreloaderPainter, type PreloaderPalette } from './preloaderCanvas';

/**
 * Draws the preloader on an OffscreenCanvas off the main thread. The page hydrating and the 3D
 * keyboard building block the main thread for hundreds of milliseconds at a time; a worker's
 * frames reach the screen without it, so the logo and the counter keep moving through those stalls.
 */

export type PreloaderWorkerMessage =
    | { type: 'init'; canvas: OffscreenCanvas; palette: PreloaderPalette; width: number; height: number }
    | { type: 'target'; value: number }
    | { type: 'resize'; width: number; height: number };

export type PreloaderWorkerEvent =
    | { type: 'percent'; value: number }
    | { type: 'complete' }
    | { type: 'revealed' };

interface PreloaderWorkerScope {
    onmessage: ((event: MessageEvent<PreloaderWorkerMessage>) => void) | null;
    postMessage: (event: PreloaderWorkerEvent) => void;
    requestAnimationFrame?: (callback: (time: number) => void) => number;
}

const scope = self as unknown as PreloaderWorkerScope;
let painter: PreloaderPainter | null = null;

const nextFrame = (callback: (time: number) => void) => {
    if (scope.requestAnimationFrame) scope.requestAnimationFrame(callback);
    else setTimeout(() => callback(performance.now()), 16);
};

const loop = (time: number) => {
    if (painter?.frame(time)) nextFrame(loop);
};

scope.onmessage = ({ data }) => {
    if (data.type === 'init') {
        const ctx = data.canvas.getContext('2d');
        if (!ctx) return;
        painter = createPreloaderPainter(ctx, data.palette, {
            percent: (value) => scope.postMessage({ type: 'percent', value }),
            complete: () => scope.postMessage({ type: 'complete' }),
            revealed: () => scope.postMessage({ type: 'revealed' }),
        });
        painter.resize(data.width, data.height);
        nextFrame(loop);
    } else if (data.type === 'target') {
        painter?.setTarget(data.value);
    } else if (data.type === 'resize') {
        painter?.resize(data.width, data.height);
    }
};
