'use client';

import { Component, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';

import type { Theme } from '@/lib/theme';
import { KeyboardController, type KeyboardView, type StageState } from './controller';

export type { KeyboardView } from './controller';

export interface KeyboardHandle {
    /** Presses a key. `silent` skips the click (scroll-driven presses are never heard). */
    press: (label: string, options?: { silent?: boolean; rightSide?: boolean }) => void;
    /** A press the visitor asked for (tool chip): on phones it also pans the key into view. */
    focusPress: (label: string) => void;
    setView: (view: KeyboardView) => void;
}

export interface KeyboardCanvasProps {
    theme: Theme;
    mobile: boolean;
    /** Read when the scene is (re)built: the scroll animation may already have moved the camera. */
    getInitialView: () => KeyboardView;
    yaw: number;
    pitch: number;
    handleRef: Ref<KeyboardHandle | null>;
    onPress: (label: string) => void;
    /** Fires when the board has finished loading and is shown. */
    onReady?: () => void;
    /** Fires when this device cannot draw the board (no WebGL, or the renderer failed). */
    onUnavailable?: () => void;
    /** Loading progress, 0–1. */
    onProgress?: (value: number) => void;
}

function KeyboardScene({ theme, mobile, getInitialView, yaw, pitch, handleRef, onPress, onReady, onProgress }: Omit<KeyboardCanvasProps, 'onUnavailable'>) {
    const getState = useThree((state) => state.get);
    const controllerRef = useRef<KeyboardController | null>(null);
    const onPressRef = useRef(onPress);
    const onReadyRef = useRef(onReady);
    const onProgressRef = useRef(onProgress);
    const themeRef = useRef(theme);

    useEffect(() => {
        onPressRef.current = onPress;
        onReadyRef.current = onReady;
        onProgressRef.current = onProgress;
    }, [onPress, onReady, onProgress]);

    // Theme changes recolour the existing board in the same commit as the page (no rebuild, no
    // repaint), so it never shows the old colours or blinks out.
    useLayoutEffect(() => {
        themeRef.current = theme;
        controllerRef.current?.setTheme(theme);
    }, [theme]);

    // Rebuilt only when the layout changes (phone ↔ desktop); everything it created is disposed on the way out.
    useEffect(() => {
        const read = (): StageState => {
            const state = getState();
            return { gl: state.gl, scene: state.scene, camera: state.camera as PerspectiveCamera, size: state.size, invalidate: state.invalidate };
        };
        const controller = new KeyboardController(read, {
            theme: themeRef.current,
            mobile,
            yaw,
            pitch,
            startView: getInitialView(),
            onPress: (label) => onPressRef.current(label),
            onReady: () => onReadyRef.current?.(),
            onProgress: (value) => onProgressRef.current?.(value),
        });
        controllerRef.current = controller;
        return () => {
            controllerRef.current = null;
            controller.dispose();
        };
    }, [getState, getInitialView, mobile, pitch, yaw]);

    useImperativeHandle(handleRef, () => ({
        press: (label, options) => controllerRef.current?.press(label, options),
        focusPress: (label) => controllerRef.current?.focusPress(label),
        setView: (view) => controllerRef.current?.setView(view),
    }), []);

    useFrame((_, delta) => controllerRef.current?.frame(delta));

    return null;
}

let webglSupport: boolean | null = null;

/** Some browsers and devices have WebGL switched off or blocked; checked once per page. */
function supportsWebGL(): boolean {
    if (webglSupport !== null) return webglSupport;
    try {
        const probe = document.createElement('canvas');
        const context = probe.getContext('webgl2') ?? probe.getContext('webgl');
        context?.getExtension('WEBGL_lose_context')?.loseContext();
        webglSupport = context !== null;
    } catch {
        webglSupport = false;
    }
    return webglSupport;
}

/** Approximate CSS height of the phone stage (the board canvas there is not full screen). */
const PHONE_STAGE_HEIGHT = 360;

/**
 * Sharp on high-density screens, but bounded by a pixel budget so a large or weak screen keeps a
 * smooth frame rate: a full-screen desktop canvas stays near 4 MP, the small phone stage near 1.6 MP.
 */
function pickDpr(mobile: boolean): number {
    const device = window.devicePixelRatio || 1;
    const area = window.innerWidth * (mobile ? PHONE_STAGE_HEIGHT : window.innerHeight);
    const budget = mobile ? 1.6e6 : 4.2e6;
    return Math.max(1, Math.min(device, mobile ? 3 : 2, Math.sqrt(budget / area)));
}

/** A renderer failure only removes the board; it never takes the page down with it. */
class KeyboardBoundary extends Component<{ onError?: () => void; children: ReactNode }, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch() {
        this.props.onError?.();
    }

    render() {
        return this.state.failed ? null : this.props.children;
    }
}

/** Client-only and lazily loaded, so three.js and R3F stay out of the first page load. */
export default function KeyboardCanvas({ onUnavailable, ...props }: KeyboardCanvasProps) {
    const supported = supportsWebGL();
    // Fixed per mount (the canvas is remounted when the layout switches between phone and desktop).
    const [dpr] = useState(() => pickDpr(props.mobile));
    useEffect(() => {
        if (!supported) onUnavailable?.();
    }, [supported, onUnavailable]);
    if (!supported) return null;

    return (
        <KeyboardBoundary onError={onUnavailable}>
            <Canvas
                aria-hidden="true"
                frameloop="demand"
                shadows="percentage"
                dpr={dpr}
                // 'default' avoids waking a discrete GPU on laptops just for this section.
                gl={{ antialias: true, alpha: true, powerPreference: 'default' }}
                camera={{ fov: 22, near: 0.1, far: 100, position: [0, 12, 12] }}
                fallback={null}
                style={{ position: 'absolute', inset: 0 }}
            >
                <KeyboardScene {...props} />
            </Canvas>
        </KeyboardBoundary>
    );
}
