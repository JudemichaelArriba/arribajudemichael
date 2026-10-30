'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    detectSpeechSupport,
    getSpeechRecognition,
    isUnavailableError,
    type SpeechRecognitionEventLike,
    type SpeechRecognitionLike,
} from './speechRecognition';

export type SpeechToTextError = 'unavailable' | 'not-allowed' | 'no-microphone' | 'no-speech';

interface UseSpeechToTextOptions {
    /** BCP 47 language tag for recognition. */
    lang?: string;
    /** Called from the result event with everything heard so far (final and interim). */
    onTranscript?: (text: string) => void;
}

export interface UseSpeechToText {
    supported: boolean;
    /** A dictation session is on. Turns off the moment `stop()` is called. */
    listening: boolean;
    /**
     * The browser has opened the microphone for this session (permission granted). Until then,
     * anything said is lost, so the caller should show that it is still starting.
     */
    micOpen: boolean;
    /**
     * Speech has been detected in this session. The service holds back a word until it hears where
     * it ends (the next word or a short silence), so this is the first sign the visitor was heard.
     */
    hearing: boolean;
    transcript: string;
    error: SpeechToTextError | null;
    start: () => void;
    stop: () => void;
}

/** How long a stopped session may take to deliver its last result before it is dropped. */
const STOP_GRACE_MS = 1_500;

function detach(recognition: SpeechRecognitionLike): void {
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onaudiostart = null;
    recognition.onspeechstart = null;
    recognition.onend = null;
}

function readTranscript(event: SpeechRecognitionEventLike): string {
    let text = '';
    for (let index = 0; index < event.results.length; index++) {
        text += event.results[index][0]?.transcript ?? '';
    }
    return text.trim();
}

/**
 * Dictation through the browser's own speech service (Web Speech API). It only reports what was
 * heard; deciding what to do with it, and whether to send anything, stays with the caller.
 *
 * `supported` is false on the server and on the first render, so markup that depends on it never
 * causes a hydration mismatch; the real value arrives once detection has finished.
 */
export function useSpeechToText({ lang = 'en-US', onTranscript }: UseSpeechToTextOptions = {}): UseSpeechToText {
    const [supported, setSupported] = useState(false);
    const [listening, setListening] = useState(false);
    const [micOpen, setMicOpen] = useState(false);
    const [hearing, setHearing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<SpeechToTextError | null>(null);
    // The current recognizer, including one that was stopped and is still delivering its last
    // result; `stopTimerRef` is set while it is in that stopping phase.
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
    const stopTimerRef = useRef<number | null>(null);
    const onTranscriptRef = useRef(onTranscript);

    useEffect(() => {
        onTranscriptRef.current = onTranscript;
    }, [onTranscript]);

    useEffect(() => {
        let cancelled = false;
        void detectSpeechSupport().then((result) => {
            if (!cancelled) setSupported(result);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const endSession = useCallback(() => {
        setListening(false);
        setMicOpen(false);
        setHearing(false);
    }, []);

    // Drops the recognizer without waiting for the browser: no more events, microphone released.
    const abandon = useCallback(() => {
        const recognition = recognitionRef.current;
        recognitionRef.current = null;
        if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
        if (recognition) {
            detach(recognition);
            recognition.abort();
        }
    }, []);

    // Abort on unmount: a recognizer left running keeps the microphone open. The state reset
    // matters when the component survives (Fast Refresh, Strict Mode): otherwise it would still
    // say "listening" with no recognizer left to stop.
    useEffect(
        () => () => {
            abandon();
            endSession();
        },
        [abandon, endSession],
    );

    const start = useCallback(() => {
        const Recognition = getSpeechRecognition();
        if (!supported || !Recognition) return;
        // A stopped session may still be finishing; a new one replaces it.
        abandon();

        const recognition = new Recognition();
        recognition.lang = lang;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        // Each handler checks it still belongs to the current recognizer, so late events from a
        // replaced one can't change state.
        const isCurrent = () => recognitionRef.current === recognition;
        const isStopping = () => stopTimerRef.current !== null;

        recognition.onresult = (event) => {
            if (!isCurrent()) return;
            if (!isStopping()) setMicOpen(true);
            const text = readTranscript(event);
            setTranscript(text);
            onTranscriptRef.current?.(text);
        };
        recognition.onerror = (event) => {
            if (!isCurrent()) return;
            if (isUnavailableError(event.error)) {
                setError('unavailable');
                setSupported(false);
            } else if (event.error === 'not-allowed') {
                setError('not-allowed');
            } else if (event.error === 'audio-capture') {
                setError('no-microphone');
            } else if (event.error === 'no-speech' && !isStopping()) {
                // The session timed out without hearing anything: say so instead of just ending.
                setError('no-speech');
            }
        };
        recognition.onaudiostart = () => {
            if (isCurrent() && !isStopping()) setMicOpen(true);
        };
        recognition.onspeechstart = () => {
            if (!isCurrent() || isStopping()) return;
            // Some browsers skip "audiostart"; hearing speech proves the mic is open.
            setMicOpen(true);
            setHearing(true);
        };
        recognition.onend = () => {
            if (!isCurrent()) return;
            abandon();
            endSession();
        };

        setError(null);
        setMicOpen(false);
        setHearing(false);
        setTranscript('');
        try {
            recognition.start();
        } catch {
            // start() throws if a session is somehow already running; nothing was started.
            endSession();
            return;
        }
        recognitionRef.current = recognition;
        setListening(true);
    }, [abandon, endSession, lang, supported]);

    const stop = useCallback(() => {
        // The session ends now as far as the visitor can tell.
        endSession();

        const recognition = recognitionRef.current;
        if (!recognition || stopTimerRef.current !== null) return;
        // Graceful: the browser still delivers the last final result, then "end". If that never
        // comes (a stalled speech service), drop it.
        recognition.stop();
        stopTimerRef.current = window.setTimeout(() => {
            if (recognitionRef.current === recognition) abandon();
        }, STOP_GRACE_MS);
    }, [abandon, endSession]);

    return { supported, listening, micOpen, hearing, transcript, error, start, stop };
}
