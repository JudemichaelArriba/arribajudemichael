import { CubeUVReflectionMapping, LinearFilter, Plane, Raycaster, SRGBColorSpace, TextureLoader, Vector2, Vector3, type Object3D, type PerspectiveCamera, type Scene, type Texture, type WebGLRenderer } from 'three';

import type { Theme } from '@/lib/theme';
import { buildKeyboard, CAP_Y, TRAVEL, type BuiltKeyboard, type KeyMesh } from './build';
import { keyboardLook } from './palette';
import { playKeyClick, prepareKeyboardSound } from './sound';

export interface KeyboardView {
    /** Camera distance from the board. */
    dist: number;
    /** Horizontal / vertical view offset as a fraction of the canvas. */
    offX: number;
    offY: number;
}

/** The slice of R3F state the controller needs, read fresh each time. */
export interface StageState {
    gl: WebGLRenderer;
    scene: Scene;
    camera: PerspectiveCamera;
    size: { width: number; height: number };
    invalidate: () => void;
}

export interface ControllerOptions {
    theme: Theme;
    mobile: boolean;
    yaw: number;
    pitch: number;
    startView: KeyboardView;
    onPress: (label: string) => void;
    /** Called once the board is built, painted and compiled, i.e. when it becomes visible. */
    onReady?: () => void;
    /** Loading progress, 0–1, reported stage by stage (the preloader draws its logo by it). */
    onProgress?: (value: number) => void;
}

/** Reads the site's Geist stack (set by next/font on <html>) so keycap legends match the UI. */
function siteFontStack(): string {
    const stack = getComputedStyle(document.documentElement).getPropertyValue('--font-geist-sans').trim();
    return stack || 'system-ui, sans-serif';
}

/**
 * Studio reflections, baked by scripts/bake-keyboard-environment.html: generating them at runtime
 * (three's PMREM pass) compiles a GGX filter that takes seconds on Windows. Stored as linear
 * radiance × ENVIRONMENT_SCALE in 8-bit sRGB; the scene's environmentIntensity undoes the scale.
 */
const ENVIRONMENT_URL = '/keyboard/environment.png';
const ENVIRONMENT_SCALE = 0.5;

/** Resolves to null if the image can't load: the board still renders, just without reflections. */
function loadEnvironment(): Promise<Texture | null> {
    return new TextureLoader().loadAsync(ENVIRONMENT_URL).then(
        (texture) => {
            texture.mapping = CubeUVReflectionMapping;
            texture.colorSpace = SRGBColorSpace;
            texture.minFilter = LinearFilter;
            texture.magFilter = LinearFilter;
            texture.generateMipmaps = false;
            return texture;
        },
        () => null,
    );
}

function waitForFont(stack: string): Promise<unknown> {
    if (!document.fonts?.load) return Promise.resolve();
    return Promise.race([
        document.fonts.load(`500 40px ${stack}`).catch(() => undefined),
        new Promise((resolve) => window.setTimeout(resolve, 1500)),
    ]);
}

/**
 * Owns everything imperative about the 3D keyboard: the scene graph, the environment, pointer
 * input, key animation and the click sound. React only creates it, forwards frames and
 * disposes it, so no three.js object is ever mutated from render code.
 */
export class KeyboardController {
    private readonly built: BuiltKeyboard;
    private readonly get: () => StageState;
    private options: ControllerOptions;
    private view: KeyboardView;
    private alive = true;
    private hovered: KeyMesh | null = null;
    private readonly motion: { rotY: number; rotX: number; targetY: number; targetX: number; dragging: boolean; moved: number; startX: number; startY: number };
    private readonly pan = new Vector3();
    private readonly panTarget = new Vector3();
    private readonly ray = new Raycaster();
    private readonly pointer = new Vector2();
    /** Shadows only change when something on the board moves, not when the camera does. */
    private shadowDirty = true;
    private readyPending = false;
    private readonly fontStack = siteFontStack();
    private readonly cleanups: (() => void)[] = [];

    constructor(get: () => StageState, options: ControllerOptions) {
        this.get = get;
        this.options = options;
        this.view = { ...options.startView };
        this.motion = { rotY: options.yaw, rotX: options.pitch, targetY: options.yaw, targetX: options.pitch, dragging: false, moved: 0, startX: 0, startY: 0 };

        const { lighting, palette } = keyboardLook(options.theme);
        const { gl, scene, invalidate } = get();
        this.built = buildKeyboard(palette, lighting, options.mobile);
        this.built.stage.visible = false;
        scene.add(this.built.stage);
        gl.toneMappingExposure = lighting.exposure;
        gl.shadowMap.autoUpdate = false;
        this.cleanups.push(() => {
            gl.shadowMap.autoUpdate = true;
        });

        this.attachPointer(gl.domElement);
        prepareKeyboardSound();

        // Legends need the UI font; the board stays hidden until they're painted (no blank keycaps).
        const stack = this.fontStack;
        const isAlive = () => this.alive;
        // Progress by stage: set-up 0.25, keys to 0.5, legends to 0.7, reflections 0.75,
        // shaders 0.9; the first rendered frame completes it (onReady).
        const report = (value: number) => {
            if (this.alive) this.options.onProgress?.(value);
        };
        report(0.25);
        const legends = this.built.buildKeys(isAlive, (fraction) => report(0.25 + fraction * 0.25))
            .then(() => waitForFont(stack))
            .then(() => this.built.paintLegends(stack, gl.capabilities.getMaxAnisotropy(), isAlive, (fraction) => report(0.5 + fraction * 0.2)));
        void Promise.all([legends, loadEnvironment()])
            .then(([, environment]) => {
                if (!environment) return;
                if (!this.alive) {
                    environment.dispose();
                    return;
                }
                scene.environment = environment;
                scene.environmentIntensity = 1 / ENVIRONMENT_SCALE;
                this.cleanups.push(() => {
                    if (scene.environment === environment) {
                        scene.environment = null;
                        scene.environmentIntensity = 1;
                    }
                    environment.dispose();
                });
            })
            .then(() => report(0.75))
            // Shaders are compiled once the environment is in place, as it changes them.
            .then(() => this.warmUp())
            .then(() => {
                if (!this.alive) return;
                report(0.9);
                this.built.stage.visible = true;
                this.shadowDirty = true;
                // Ready is reported once the first full frame has been drawn (see frame()), so that
                // costly first render never overlaps whatever the page does next (the preloader reveal).
                this.readyPending = true;
                invalidate();
            });
        invalidate();
    }

    /**
     * Compiles every shader the board needs without blocking the main thread (parallel shader
     * compile), so revealing it doesn't stall a frame. compile() only visits visible objects, so
     * the stage is shown just for the synchronous call and hidden again before any render.
     */
    private async warmUp() {
        if (!this.alive) return;
        const { gl, scene, camera } = this.get();
        const stage = this.built.stage;
        stage.visible = true;
        let pending: Promise<unknown> = Promise.resolve();
        try {
            // The whole scene, exactly as it will be rendered: compiling the stage against the scene
            // would count its lights twice and build programs the first frame can't reuse.
            pending = gl.compileAsync(scene, camera);
        } catch {
            // Older drivers: fall back to compiling on first render.
        }
        stage.visible = false;
        await pending.catch(() => undefined);
    }

    /** Presses a key. `silent` skips the click (scroll-driven presses are never heard). */
    press(label: string, options?: { silent?: boolean; rightSide?: boolean }) {
        const meshes = this.built.byLabel.get(label);
        if (!meshes) return;
        this.pressMesh(options?.rightSide ? meshes[meshes.length - 1] : meshes[0], options?.silent ?? false);
    }

    /** A press the visitor asked for (tool chip): on phones the board first pans the key into view. */
    focusPress(label: string) {
        const mesh = this.built.byLabel.get(label)?.[0];
        if (!mesh) return;
        if (this.options.mobile && this.focus(mesh)) {
            window.setTimeout(() => {
                if (this.alive) this.pressMesh(mesh);
            }, 420);
        } else {
            this.pressMesh(mesh);
        }
    }

    /** Recolours the board for the new site theme in place, so it never disappears. */
    setTheme(theme: Theme) {
        if (theme === this.options.theme) return;
        this.options.theme = theme;
        const { gl, invalidate } = this.get();
        const { lighting, palette } = keyboardLook(theme);
        // Colours only (the legend masks are theme-neutral), so the swap is instant.
        this.built.applyLook(palette, lighting);
        gl.toneMappingExposure = lighting.exposure;
        this.shadowDirty = true;
        invalidate();
    }

    setView(view: KeyboardView) {
        const current = this.view;
        // Scroll refreshes re-apply the same view: skip the redraw when nothing moved.
        if (current.dist === view.dist && current.offX === view.offX && current.offY === view.offY) return;
        this.view = { ...view };
        this.get().invalidate();
    }

    /** Called every rendered frame; asks for another only while something is still easing. */
    frame(delta: number) {
        const { camera, size, invalidate } = this.get();
        const dt = Math.min(delta, 0.05);
        const v = this.view;
        camera.aspect = size.width / size.height;
        camera.position.set(0, v.dist * 0.7, v.dist * 0.72);
        camera.lookAt(0, -0.6, 0);
        camera.setViewOffset(size.width, size.height, -size.width * v.offX, -size.height * v.offY, size.width, size.height);
        camera.updateProjectionMatrix();

        let busy = false;
        let boardMoved = false;
        const m = this.motion;
        m.rotY += (m.targetY - m.rotY) * 0.12;
        m.rotX += (m.targetX - m.rotX) * 0.12;
        if (Math.abs(m.targetY - m.rotY) > 1e-4 || Math.abs(m.targetX - m.rotX) > 1e-4) {
            busy = true;
            boardMoved = true;
        }
        const { root, knob, keys } = this.built;
        root.rotation.y = m.rotY;
        root.rotation.x = m.rotX;

        this.pan.lerp(this.panTarget, 1 - Math.exp(-dt * 7));
        if (this.pan.distanceToSquared(this.panTarget) > 1e-6) {
            busy = true;
            boardMoved = true;
        } else this.pan.copy(this.panTarget);
        root.position.copy(this.pan);

        if (knob) {
            knob.rotation += (knob.target - knob.rotation) * 0.15;
            knob.group.rotation.y = -knob.rotation;
            if (Math.abs(knob.target - knob.rotation) > 1e-4) {
                busy = true;
                boardMoved = true;
            }
        }

        for (const mesh of keys) {
            const d = mesh.userData;
            if (d.press > 0) {
                d.press = Math.max(0, d.press - dt * 4);
                busy = true;
                boardMoved = true;
            }
            const target = mesh === this.hovered ? 1 : 0;
            d.hover += (target - d.hover) * 0.2;
            if (Math.abs(target - d.hover) > 1e-3) {
                busy = true;
                boardMoved = true;
            } else if (d.hover !== target) {
                d.hover = target;
                boardMoved = true;
            }
            const travel = d.press > 0.65 ? 1 : d.press / 0.65;
            mesh.position.y = CAP_Y - TRAVEL * Math.sin((travel * Math.PI) / 2) + d.hover * 0.7;
            const glow = d.hover * 0.035 + d.press * 0.05;
            d.sideMat.emissiveIntensity = glow;
            d.topMat.emissiveIntensity = glow;
        }

        if (boardMoved || this.shadowDirty) {
            this.get().gl.shadowMap.needsUpdate = true;
            this.shadowDirty = false;
        }
        if (busy || m.dragging) invalidate();
        if (this.readyPending) {
            this.readyPending = false;
            // frame() runs just before the render: the next animation frame comes after it.
            requestAnimationFrame(() => {
                if (this.alive) this.options.onReady?.();
            });
        }
    }

    dispose() {
        this.alive = false;
        const { scene } = this.get();
        scene.remove(this.built.stage);
        this.cleanups.forEach((cleanup) => cleanup());
        this.built.dispose();
    }

    private pressMesh(mesh: KeyMesh, silent = false) {
        mesh.userData.press = 1;
        if (!silent) playKeyClick(mesh.userData.label === 'Space' || mesh.userData.label.length > 3);
        this.options.onPress(mesh.userData.label);
        this.get().invalidate();
    }

    /** Pans the board so a key sits near the middle of a narrow canvas (phones). */
    private focus(mesh: KeyMesh): boolean {
        const { camera, invalidate } = this.get();
        const { root } = this.built;
        const point = new Vector3();
        const centre = new Vector3();
        root.position.copy(this.pan);
        root.updateMatrixWorld(true);
        mesh.getWorldPosition(point);
        const plane = new Plane(new Vector3(0, 1, 0), -point.y);
        this.ray.setFromCamera(new Vector2(0, 0.08), camera);
        if (!this.ray.ray.intersectPlane(plane, centre)) return false;
        this.panTarget.set(this.pan.x + centre.x - point.x, 0, this.pan.z + centre.z - point.z);
        this.panTarget.x = Math.max(-3.2, Math.min(3.2, this.panTarget.x));
        this.panTarget.z = Math.max(-1.2, Math.min(1.2, this.panTarget.z));
        invalidate();
        return true;
    }

    private pick(el: HTMLElement, event: PointerEvent): Object3D | null {
        const rect = el.getBoundingClientRect();
        this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
        this.ray.setFromCamera(this.pointer, this.get().camera);
        return this.ray.intersectObjects(this.built.pickables, false)[0]?.object ?? null;
    }

    private isKey(object: Object3D | null): object is KeyMesh {
        return !!object && this.built.keys.includes(object as KeyMesh);
    }

    /** Hover lift, click to press, drag to tilt — mouse and pen only, so touch keeps scrolling the page. */
    private attachPointer(el: HTMLCanvasElement) {
        const m = this.motion;
        const { yaw, pitch, mobile } = this.options;
        const canDrag = (event: PointerEvent) => !mobile && event.pointerType !== 'touch';

        let pressedOnDown = false;
        const tapTarget = (event: PointerEvent) => {
            const object = this.pick(el, event);
            if (!object) return;
            if (this.isKey(object)) {
                this.pressMesh(object);
            } else if (this.built.knob) {
                this.built.knob.target += Math.PI / 6;
                playKeyClick(true);
                this.get().invalidate();
            }
        };
        const onDown = (event: PointerEvent) => {
            m.dragging = canDrag(event);
            m.moved = 0;
            // Mouse and pen press on the way down, like a real key, so the click is immediate.
            pressedOnDown = event.pointerType !== 'touch' && event.button === 0;
            if (pressedOnDown) tapTarget(event);
            m.startX = event.clientX;
            m.startY = event.clientY;
            if (m.dragging) {
                try {
                    el.setPointerCapture(event.pointerId);
                } catch {
                    // Capture is best effort.
                }
            }
        };
        const onMove = (event: PointerEvent) => {
            if (m.dragging) {
                const dx = event.clientX - m.startX;
                const dy = event.clientY - m.startY;
                m.moved += Math.abs(dx) + Math.abs(dy);
                m.targetY = Math.max(yaw - 0.45, Math.min(yaw + 0.45, m.targetY + dx * 0.005));
                m.targetX = Math.max(pitch - 0.2, Math.min(pitch + 0.3, m.targetX + dy * 0.003));
                m.startX = event.clientX;
                m.startY = event.clientY;
                this.get().invalidate();
                return;
            }
            if (event.pointerType === 'touch') return;
            const object = this.pick(el, event);
            const next = this.isKey(object) ? object : null;
            if (next !== this.hovered) {
                this.hovered = next;
                this.get().invalidate();
            }
            el.style.cursor = object ? 'pointer' : mobile ? 'default' : 'grab';
        };
        const onUp = (event: PointerEvent) => {
            const wasTap = m.moved < 6;
            m.dragging = false;
            // Touch presses on release, and only for a tap (a swipe is a scroll).
            if (!wasTap || pressedOnDown) return;
            tapTarget(event);
        };
        const onLeave = () => {
            if (this.hovered) {
                this.hovered = null;
                this.get().invalidate();
            }
        };
        const onCancel = () => {
            m.dragging = false;
            m.moved = 99;
        };

        el.style.cursor = mobile ? 'default' : 'grab';
        el.style.touchAction = 'pan-y';
        el.addEventListener('pointerdown', onDown);
        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerup', onUp);
        el.addEventListener('pointerleave', onLeave);
        el.addEventListener('pointercancel', onCancel);
        this.cleanups.push(() => {
            el.removeEventListener('pointerdown', onDown);
            el.removeEventListener('pointermove', onMove);
            el.removeEventListener('pointerup', onUp);
            el.removeEventListener('pointerleave', onLeave);
            el.removeEventListener('pointercancel', onCancel);
        });
    }
}
