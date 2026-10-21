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
    /** White page behind the canvas (default). Off when the surrounding frame provides the surface. */
    paper?: boolean;
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

/** Fetches PDF.js ahead of time (e.g. on intent to open certificates). Safe as an event handler. */
export function preloadPdfRuntime(): void {
    void loadPdfRuntime().catch(() => undefined);
}

/**
 * PDF.js paints on the main thread, so previews take turns, each in an idle moment: a list of them
 * mounting at once (a tab switch) never lands as one long task. Downloads still run in parallel.
 */
let paintQueue: Promise<void> = Promise.resolve();

function idleMoment(): Promise<void> {
    return new Promise((resolve) => {
        if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(() => resolve(), { timeout: 500 });
        else window.setTimeout(resolve, 16);
    });
}

function waitForPaintTurn(): Promise<() => void> {
    let release: () => void = () => undefined;
    const finished = new Promise<void>((resolve) => {
        release = resolve;
    });
    const turn = paintQueue.then(idleMoment);
    paintQueue = turn.then(() => finished);
    return turn.then(() => release);
}

type PreviewStatus = 'idle' | 'loading' | 'ready' | 'error';

export default function CertificatePdfPreview({
    source,
    label,
    eager = false,
    paper = true,
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
                });
                documentProxy = await loadingTask.promise;
                if (disposed) return;

                pageProxy = await documentProxy.getPage(1);
                if (disposed) return;

                const release = await waitForPaintTurn();
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
            className={`relative flex h-full w-full items-center justify-center overflow-hidden ${paper ? 'bg-white' : ''} ${className}`}
        >
            <canvas
                ref={canvasRef}
                role="img"
                aria-label={label}
                className={displayStatus === 'ready' ? 'block max-h-full max-w-full' : 'invisible'}
            />

            {displayStatus !== 'ready' ? (
                <div className={`absolute inset-0 flex flex-col items-center justify-center px-4 text-center ${paper ? 'bg-[#f4f4f5] text-black/50' : 'bg-[var(--surface-muted)] text-[var(--faint)]'}`}>
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
