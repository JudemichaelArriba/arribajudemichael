'use client';

import { useEffect, useState, type RefObject } from 'react';
import type { MicLevelWorkerEvent, MicLevelWorkerMessage } from './micLevel.worker';

/** A sound above this share of the meter counts as the visitor being heard. */
const HEARD_LEVEL = 0.35;

/** Chrome and Edge expose this; the DOM lib doesn't declare it yet. */
type TrackProcessorConstructor = new (init: { track: MediaStreamTrack }) => { readable: ReadableStream<AudioData> };

interface MicLevel {
    /** The meter is running (a local level reading is available). */
    live: boolean;
    /** A sound loud enough to be speech has been picked up since the meter started. */
    heard: boolean;
}

/**
 * A live microphone level while `active`, measured locally: no audio leaves the page. The level
 * (0–1) is written to the `--mic-level` custom property on `targetRef`, so the meter moves without
 * re-rendering React.
 *
 * Samples are read by a track processor in a worker, so the main thread never blocks: an
 * AudioContext here froze the page for ~300ms while it opened the audio device. Where there is no
 * track processor (Safari), or on phones and tablets (where the speech recognizer may hold the mic
 * exclusively), there is simply no meter. Callers should start this only once the mic is already
 * open (permission granted), so it never triggers a prompt of its own.
 */
export function useMicLevel(active: boolean, targetRef: RefObject<HTMLElement | null>): MicLevel {
    const [live, setLive] = useState(false);
    const [heard, setHeard] = useState(false);

    useEffect(() => {
        if (!active) return;
        const Processor = (window as unknown as { MediaStreamTrackProcessor?: TrackProcessorConstructor }).MediaStreamTrackProcessor;
        if (!Processor || !window.matchMedia('(pointer: fine)').matches || !navigator.mediaDevices?.getUserMedia) return;

        let cancelled = false;
        let stream: MediaStream | null = null;
        let worker: Worker | null = null;

        const begin = async () => {
            let media: MediaStream;
            try {
                // Raw input: echo cancellation and gain control would reconfigure the device the
                // speech recognizer is reading (and AGC changes the system mic volume on Windows).
                media = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
                });
            } catch {
                // No meter (no permission or no device); dictation still works.
                return;
            }
            if (cancelled) {
                media.getTracks().forEach((track) => track.stop());
                return;
            }
            stream = media;

            const track = media.getAudioTracks()[0];
            if (!track) return;
            try {
                const { readable } = new Processor({ track });
                worker = new Worker(new URL('./micLevel.worker.ts', import.meta.url), { type: 'module' });
                let heardOnce = false;
                worker.onmessage = ({ data }: MessageEvent<MicLevelWorkerEvent>) => {
                    if (cancelled) return;
                    targetRef.current?.style.setProperty('--mic-level', data.value.toFixed(3));
                    if (!heardOnce && data.value >= HEARD_LEVEL) {
                        heardOnce = true;
                        setHeard(true);
                    }
                };
                const message: MicLevelWorkerMessage = { type: 'start', readable };
                worker.postMessage(message, [readable]);
            } catch {
                return;
            }
            setLive(true);
        };

        void begin();

        return () => {
            cancelled = true;
            // Stopping the track ends the worker's stream; terminating covers anything in flight.
            stream?.getTracks().forEach((track) => track.stop());
            worker?.terminate();
            setLive(false);
            setHeard(false);
        };
    }, [active, targetRef]);

    return { live, heard };
}
