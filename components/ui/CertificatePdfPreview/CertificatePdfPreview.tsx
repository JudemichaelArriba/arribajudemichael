'use client';

import { FileText, LoaderCircle } from 'lucide-react';
import {
    useEffect,
    useRef,
    useState,
} from 'react';

interface CertificatePdfPreviewProps {
    source: string | File | null;
    label: string;
    eager?: boolean;
    className?: string;
}

let pdfRuntime: Promise<typeof import('pdfjs-dist')> | null = null;

function loadPdfRuntime() {
    pdfRuntime ??= import('pdfjs-dist').catch((error: unknown) => {
        pdfRuntime = null;
        throw error;
    });
    return pdfRuntime;
}

/**
 * One PDF.js worker for every preview: by default each document starts its own worker (script +
 * WebAssembly start-up each time), which made opening a list of certificates take seconds.
 * Kept for the page's lifetime; a destroyed loading task leaves a worker it was given running.
 */
let sharedWorker: import('pdfjs-dist').PDFWorker | null = null;

function previewWorker(pdfjs: typeof import('pdfjs-dist')) {
    if (!sharedWorker || sharedWorker.destroyed) sharedWorker = pdfjs.PDFWorker.create({ name: 'certificate-previews' });
    return sharedWorker;
}

/** Fetches PDF.js ahead of time (e.g. on intent to open certificates). Safe as an event handler. */
export function preloadPdfRuntime(): void {
    void loadPdfRuntime().catch(() => undefined);
}

/**
 * PDF.js paints on the main thread, so previews take turns, each in an idle moment: a list of them
 * mounting at once (a tab switch) never lands as one long task. A preview that is on screen goes
 * first. Downloads still run in parallel.
 */
interface PaintWaiter {
    isVisible: () => boolean;
    start: (release: () => void) => void;
}

const paintWaiters: PaintWaiter[] = [];
let painting = false;

function idleMoment(): Promise<void> {
    return new Promise((resolve) => {
        if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(() => resolve(), { timeout: 500 });
        else window.setTimeout(resolve, 16);
    });
}

function pumpPaints() {
    if (painting || !paintWaiters.length) return;
    painting = true;
    void idleMoment().then(() => {
        const visible = paintWaiters.findIndex((waiter) => waiter.isVisible());
        const [next] = paintWaiters.splice(Math.max(visible, 0), 1);
        let released = false;
        next.start(() => {
            if (released) return;
            released = true;
            painting = false;
            pumpPaints();
        });
    });
}

/** Resolves with a release function once it is this preview's turn to paint. */
function waitForPaintTurn(isVisible: () => boolean): Promise<() => void> {
    return new Promise((resolve) => {
        paintWaiters.push({ isVisible, start: resolve });
        pumpPaints();
    });
}

type PreviewStatus = 'idle' | 'loading' | 'ready' | 'error';

export default function CertificatePdfPreview({
    source,
    label,
    eager = false,
    className = '',
}: CertificatePdfPreviewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isNearViewport, setIsNearViewport] = useState(eager);
    const [status, setStatus] = useState<PreviewStatus>(source ? 'idle' : 'error');
    const displayStatus: PreviewStatus = !source
        ? 'error'
        : !eager && !isNearViewport
            ? 'idle'
            : status;

    useEffect(() => {
        if (eager || isNearViewport) return;

        const container = containerRef.current;
        if (!container || typeof IntersectionObserver === 'undefined') {
            setIsNearViewport(true);
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) return;
                setIsNearViewport(true);
                observer.disconnect();
            },
            { rootMargin: '240px 0px' },
        );

        observer.observe(container);
        return () => observer.disconnect();
    }, [eager, isNearViewport]);

    useEffect(() => {
        if (!source || (!eager && !isNearViewport)) {
            return;
        }

        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        let disposed = false;
        let objectUrl: string | null = null;
        let resizeFrame = 0;
        let resizeObserver: ResizeObserver | null = null;
        let loadingTask: import('pdfjs-dist').PDFDocumentLoadingTask | null = null;
        let documentProxy: import('pdfjs-dist').PDFDocumentProxy | null = null;
        let pageProxy: import('pdfjs-dist').PDFPageProxy | null = null;
        let renderTask: import('pdfjs-dist').RenderTask | null = null;
        // Whether the preview is on screen right now (decides who paints first).
        let onScreen = false;
        const visibility = typeof IntersectionObserver === 'undefined'
            ? null
            : new IntersectionObserver(([entry]) => {
                onScreen = entry.isIntersecting;
            });
        visibility?.observe(container);

        const renderPreview = async () => {
            if (disposed || !pageProxy) return;

            const bounds = container.getBoundingClientRect();
            if (bounds.width <= 0 || bounds.height <= 0) return;

            renderTask?.cancel();

            const baseViewport = pageProxy.getViewport({ scale: 1 });
            const scale = Math.min(
                bounds.width / baseViewport.width,
                bounds.height / baseViewport.height,
            );
            const viewport = pageProxy.getViewport({ scale });
            const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
            const context = canvas.getContext('2d', { alpha: false });

            if (!context) throw new Error('Canvas context unavailable');

            canvas.width = Math.max(1, Math.floor(viewport.width * pixelRatio));
            canvas.height = Math.max(1, Math.floor(viewport.height * pixelRatio));
            canvas.style.width = `${viewport.width}px`;
            canvas.style.height = `${viewport.height}px`;

            renderTask = pageProxy.render({
                canvas,
                canvasContext: context,
                viewport,
                transform: pixelRatio === 1
                    ? undefined
                    : [pixelRatio, 0, 0, pixelRatio, 0, 0],
            });

            try {
                await renderTask.promise;
                if (!disposed) setStatus('ready');
            } catch (error) {
                const name = error instanceof Error ? error.name : '';
                if (!disposed && name !== 'RenderingCancelledException') {
                    setStatus('error');
                }
            }
        };

        const initialize = async () => {
            setStatus('loading');

            try {
                const pdfjs = await loadPdfRuntime();
                if (disposed) return;

                pdfjs.GlobalWorkerOptions.workerSrc =
                    `/vendor/pdfjs/pdf.worker.min.mjs?v=${encodeURIComponent(pdfjs.version)}`;

                const pdfUrl = source instanceof File
                    ? URL.createObjectURL(source)
                    : source;
                objectUrl = source instanceof File ? pdfUrl : null;
                loadingTask = pdfjs.getDocument({
                    url: pdfUrl,
                    wasmUrl: '/vendor/pdfjs/wasm/',
                    worker: previewWorker(pdfjs),
                });
                documentProxy = await loadingTask.promise;
                if (disposed) return;

                pageProxy = await documentProxy.getPage(1);
                if (disposed) return;

                const release = await waitForPaintTurn(() => onScreen);
                try {
                    if (disposed) return;
                    await renderPreview();
                } finally {
                    release();
                }

                if (typeof ResizeObserver !== 'undefined') {
                    resizeObserver = new ResizeObserver(() => {
                        window.cancelAnimationFrame(resizeFrame);
                        resizeFrame = window.requestAnimationFrame(() => {
                            void renderPreview();
                        });
                    });
                    resizeObserver.observe(container);
                }
            } catch {
                if (!disposed) setStatus('error');
            }
        };

        void initialize();

        return () => {
            disposed = true;
            visibility?.disconnect();
            window.cancelAnimationFrame(resizeFrame);
            resizeObserver?.disconnect();
            renderTask?.cancel();
            pageProxy?.cleanup();

            void loadingTask?.destroy();

            if (objectUrl) URL.revokeObjectURL(objectUrl);
            const context = canvas.getContext('2d');
            context?.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = 0;
            canvas.height = 0;
        };
    }, [eager, isNearViewport, source]);

    return (
        <div
            ref={containerRef}
            className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-white ${className}`}
        >
            <canvas
                ref={canvasRef}
                role="img"
                aria-label={label}
                className={displayStatus === 'ready' ? 'block max-h-full max-w-full' : 'invisible'}
            />

            {displayStatus !== 'ready' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f4f4f5] px-4 text-center text-black/50">
                    {displayStatus === 'loading' || displayStatus === 'idle' ? (
                        <>
                            <LoaderCircle
                                aria-hidden="true"
                                size={22}
                                strokeWidth={1.6}
                                className="animate-spin motion-reduce:animate-none"
                            />
                            <span className="mt-2 text-[11px] font-bold">Loading PDF preview</span>
                        </>
                    ) : (
                        <>
                            <FileText aria-hidden="true" size={24} strokeWidth={1.5} />
                            <span className="mt-2 text-[11px] font-bold">Preview unavailable</span>
                        </>
                    )}
                </div>
            ) : null}
        </div>
    );
}
