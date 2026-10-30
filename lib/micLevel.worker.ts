/**
 * Reads microphone samples off the main thread and reports a level (0–1) for the voice-input
 * meter. An AudioContext would also work, but creating one opens the audio output device, which
 * froze the page for ~300ms on Windows right as the visitor started speaking. A track processor
 * feeding this worker needs no audio device at all.
 */

export type MicLevelWorkerMessage = { type: 'start'; readable: ReadableStream<AudioData> };

export type MicLevelWorkerEvent = { type: 'level'; value: number };

interface MicLevelWorkerScope {
    onmessage: ((event: MessageEvent<MicLevelWorkerMessage>) => void) | null;
    postMessage: (event: MicLevelWorkerEvent) => void;
}

/** Quietest level that moves the meter, and the level that fills it (dBFS). */
const FLOOR_DB = -55;
const CEILING_DB = -18;
/** One report per this much audio: about a display frame. */
const REPORT_MS = 16;
/** How much of the gap a falling level closes per report (rises are immediate). */
const RELEASE = 0.25;

const scope = self as unknown as MicLevelWorkerScope;

function toLevel(rms: number): number {
    const decibels = 20 * Math.log10(rms || 1e-8);
    return Math.min(1, Math.max(0, (decibels - FLOOR_DB) / (CEILING_DB - FLOOR_DB)));
}

async function measure(readable: ReadableStream<AudioData>) {
    const reader = readable.getReader();
    let samples = new Float32Array(0);
    let level = 0;
    let loudest = 0;
    let elapsed = 0;

    for (;;) {
        let chunk: ReadableStreamReadResult<AudioData>;
        try {
            chunk = await reader.read();
        } catch {
            return;
        }
        // The track was stopped: the stream ends and so does this loop.
        if (chunk.done) return;

        const data = chunk.value;
        const frames = data.numberOfFrames;
        if (samples.length < frames) samples = new Float32Array(frames);
        const view = samples.subarray(0, frames);
        try {
            data.copyTo(view, { planeIndex: 0, format: 'f32-planar' });
        } finally {
            data.close();
        }

        let sum = 0;
        for (const sample of view) sum += sample * sample;
        loudest = Math.max(loudest, Math.sqrt(sum / (frames || 1)));
        elapsed += (frames / data.sampleRate) * 1000;

        if (elapsed >= REPORT_MS) {
            const target = toLevel(loudest);
            level = target > level ? target : level + (target - level) * RELEASE;
            scope.postMessage({ type: 'level', value: level });
            loudest = 0;
            elapsed = 0;
        }
    }
}

scope.onmessage = ({ data }) => {
    if (data.type === 'start') void measure(data.readable);
};
