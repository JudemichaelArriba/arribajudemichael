'use client';

import { useCallback, useRef, useState, type MouseEvent } from 'react';

import type { DownloadableFile } from '@/lib/site';

/** A plain primary click. Modified clicks (new tab, new window, save link) keep the browser's own behaviour. */
const isPlainClick = (event: MouseEvent<HTMLAnchorElement>): boolean =>
    event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

/** Hands a URL to the browser as a download saved under `fileName`. */
const saveAs = (url: string, fileName: string): void => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
};

/**
 * Downloads a file from a link while reporting real progress: a plain click fetches the file and
 * `isDownloading` stays true until it has arrived and been handed to the browser, so the button
 * can show it is working. Pair it with `<a href download>`, so the link still works with modified
 * clicks and before hydration. If the fetch fails, the browser downloads the file itself instead
 * (it shows its own progress and errors).
 */
export function useFileDownload({ href, fileName }: DownloadableFile, onSettled?: () => void) {
    const [isDownloading, setIsDownloading] = useState(false);
    const inFlightRef = useRef(false);

    const onClick = useCallback(
        async (event: MouseEvent<HTMLAnchorElement>) => {
            if (!isPlainClick(event)) return;
            event.preventDefault();
            if (inFlightRef.current) return;

            inFlightRef.current = true;
            setIsDownloading(true);
            try {
                const response = await fetch(href);
                if (!response.ok) throw new Error(`Download failed with status ${response.status}`);

                const objectUrl = URL.createObjectURL(await response.blob());
                saveAs(objectUrl, fileName);
                // Released a task later: some browsers still read the URL after click() returns.
                window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
            } catch {
                saveAs(href, fileName);
            } finally {
                inFlightRef.current = false;
                setIsDownloading(false);
                onSettled?.();
            }
        },
        [href, fileName, onSettled]
    );

    return { isDownloading, onClick };
}
