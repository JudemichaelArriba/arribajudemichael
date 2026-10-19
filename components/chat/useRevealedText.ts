'use client';

import { useEffect, useRef, useState } from 'react';

// Reveal pacing in characters per second. The speed follows the backlog, so a burst from the
// network is spread over roughly CATCH_UP_SECONDS instead of landing in a single frame, while a
// trickle still moves at a readable minimum.
const MIN_CHARS_PER_SECOND = 70;
const MAX_CHARS_PER_SECOND = 420;
const CATCH_UP_SECONDS = 0.7;
const MAX_FRAME_SECONDS = 0.1;

/** End index of the last whole word at or before `index`, so words never appear half-typed. */
export function wordBoundaryAtOrBefore(text: string, index: number): number {
    if (index >= text.length) return text.length;
    for (let cursor = Math.max(0, index); cursor > 0; cursor -= 1) {
        if (/\s/.test(text[cursor])) return cursor;
    }
    return 0;
}

/**
 * Reveals `text` word by word on the animation-frame clock, independent of how the network
 * delivers it. `reveal` is fixed for the lifetime of a turn (only answers that started streaming
 * while on screen are revealed); `complete` tells the loop no more text is coming, so it can stop
 * once it has caught up.
 */
export function useRevealedText(text: string, reveal: boolean, complete: boolean): string {
    const [visibleEnd, setVisibleEnd] = useState(0);
    const textRef = useRef(text);
    const completeRef = useRef(complete);
    const positionRef = useRef(0);

    useEffect(() => {
        textRef.current = text;
        completeRef.current = complete;
    });

    useEffect(() => {
        if (!reveal) return;

        let frame = 0;
        let last = performance.now();

        const step = (now: number) => {
            const elapsed = Math.min((now - last) / 1000, MAX_FRAME_SECONDS);
            last = now;

            const target = textRef.current;
            const done = completeRef.current;
            const backlog = target.length - positionRef.current;

            if (backlog > 0) {
                const speed = Math.min(
                    MAX_CHARS_PER_SECOND,
                    Math.max(MIN_CHARS_PER_SECOND, backlog / CATCH_UP_SECONDS),
                );
                positionRef.current = Math.min(target.length, positionRef.current + speed * elapsed);
            }

            const caughtUp = positionRef.current >= target.length;
            // While text is still arriving, the last word may be incomplete: hold it back until a
            // space follows it or the answer is finished.
            const end =
                caughtUp && done
                    ? target.length
                    : wordBoundaryAtOrBefore(target, Math.min(Math.floor(positionRef.current), target.length - 1));
            setVisibleEnd((current) => (current === end ? current : end));

            if (caughtUp && done) return;
            frame = window.requestAnimationFrame(step);
        };

        frame = window.requestAnimationFrame(step);
        return () => window.cancelAnimationFrame(frame);
    }, [reveal, complete]);

    return reveal ? text.slice(0, visibleEnd) : text;
}
