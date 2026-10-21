/**
 * Keyswitch clicks. Browsers only allow sound after the visitor has interacted with the page
 * (a click, tap or key press — scrolling doesn't count), so the audio context is created and
 * unlocked on the first such gesture anywhere on the page and kept warm, so a press plays at once
 * instead of waiting for a context to start. Only presses the visitor makes are ever heard.
 */
let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let detach: (() => void) | null = null;
/** A resume started by a gesture is in flight: clicks may be scheduled, they play as it lands. */
let resuming = false;

function audioConstructor(): typeof AudioContext | undefined {
    return window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

function unlock() {
    try {
        const Ctor = audioConstructor();
        if (!Ctor) return;
        context ??= new Ctor({ latencyHint: 'interactive' });
        if (!noise) {
            // One decaying noise burst, reused for every click (only the filters vary).
            const length = Math.floor(context.sampleRate * 0.07);
            noise = context.createBuffer(1, length, context.sampleRate);
            const data = noise.getChannelData(0);
            for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 8;
        }
        if (context.state === 'suspended' && !resuming) {
            resuming = true;
            void context.resume().catch(() => undefined).finally(() => {
                resuming = false;
            });
        }
        if (context.state === 'running') {
            detach?.();
            detach = null;
        }
    } catch {
        // Sound is decoration; failing silently is correct.
    }
}

/** Listens for the first gesture that may unlock audio. Safe to call more than once. */
export function prepareKeyboardSound() {
    if (detach || context?.state === 'running') return;
    const events = ['pointerdown', 'keydown', 'touchend'] as const;
    const options: AddEventListenerOptions = { capture: true, passive: true };
    events.forEach((type) => window.addEventListener(type, unlock, options));
    detach = () => events.forEach((type) => window.removeEventListener(type, unlock, options));
}

/** Plays one click if audio is unlocked; otherwise does nothing (never queues). */
export function playKeyClick(deep: boolean, volume = 0.7) {
    // Suspended later on (e.g. the phone locked): wait for the next gesture to bring it back.
    if (context && context.state !== 'running' && !resuming) prepareKeyboardSound();
    if (!context || !noise || (context.state !== 'running' && !resuming)) return;
    try {
        const source = context.createBufferSource();
        source.buffer = noise;
        const band = context.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.value = (deep ? 700 : 1200) + Math.random() * 400;
        band.Q.value = 1.3;
        const low = context.createBiquadFilter();
        low.type = 'lowpass';
        low.frequency.value = 3200;
        const gain = context.createGain();
        gain.gain.value = volume;
        source.connect(band).connect(low).connect(gain).connect(context.destination);
        source.start();
    } catch {
        // Sound is decoration; failing silently is correct.
    }
}
