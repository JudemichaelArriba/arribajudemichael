import {
    BoxGeometry,
    BufferGeometry,
    CanvasTexture,
    Color,
    CylinderGeometry,
    DirectionalLight,
    ExtrudeGeometry,
    Float32BufferAttribute,
    Group,
    HemisphereLight,
    InstancedMesh,
    LinearMipmapLinearFilter,
    Material,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    Path,
    PlaneGeometry,
    Quaternion,
    ShadowMaterial,
    Shape,
    Vector3,
    type Object3D,
    type Texture,
} from 'three';

import { GAP, KEY_ROWS, MARKED_KEYS, type KeyKind } from './layout';
import type { BoardPalette, StageLighting } from './palette';

const U = 19.05;
const TAN6 = Math.tan((6 * Math.PI) / 180);
const ROW_HEIGHT = [10.4, 10.4, 9.4, 8.9, 9.4, 9.8];
const ROW_TILT = [10, 9, 4, 0, -5, -8];
/** Resting height of a keycap and how far it travels when pressed (board units). */
export const CAP_Y = 6;
export const TRAVEL = 4;

export interface KeyState {
    label: string;
    kind: KeyKind;
    /** Press envelope, 1 → 0. */
    press: number;
    /** Hover amount, eased toward 0 or 1. */
    hover: number;
    sideMat: MeshStandardMaterial;
    topMat: MeshStandardMaterial;
    /** Legend colours, read by the keycap shader: a theme change only updates these. */
    legend: LegendColours;
    /** Fixed ±1.5% lightness offset so the board looks the same after a theme change. */
    jitter: number;
}

export interface LegendColours {
    bg: Color;
    fg: Color;
    dot: Color;
}

export type KeyMesh = Mesh<BufferGeometry, MeshStandardMaterial[]> & { userData: KeyState };

export interface Knob {
    group: Group;
    rotation: number;
    target: number;
}

export interface BuiltKeyboard {
    /** Lights + shadow catcher + the scaled board. */
    stage: Group;
    /** The board root that the camera orbits and pans. */
    root: Group;
    keys: KeyMesh[];
    byLabel: Map<string, KeyMesh[]>;
    knob: Knob | null;
    /** Pickable meshes for raycasting (keys + knob). */
    pickables: Object3D[];
    /** Adds the keys row by row, yielding between rows so loading never blocks scrolling. */
    buildKeys: (isAlive: () => boolean, onProgress?: (fraction: number) => void) => Promise<void>;
    /** Paints the keycap legends in small batches; resolves when done or when `isAlive` turns false. */
    paintLegends: (fontStack: string, maxAnisotropy: number, isAlive: () => boolean, onProgress?: (fraction: number) => void) => Promise<void>;
    /** Recolours the existing board for another theme: colours only, no repaint, no rebuild. */
    applyLook: (palette: BoardPalette, lighting: StageLighting) => void;
    dispose: () => void;
}

/** Yields to the browser (idle time when available) so long builds stay off the critical path. */
export function yieldToBrowser(): Promise<void> {
    return new Promise((resolve) => {
        const idle = (window as Window & { requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number }).requestIdleCallback;
        if (idle) idle(() => resolve(), { timeout: 120 });
        else window.setTimeout(resolve, 16);
    });
}

/** Rounded rectangle centred on the origin, as a Shape or a hole Path. */
function roundedRect<T extends Path>(PathClass: new () => T, w: number, d: number, r: number): T {
    const p = new PathClass();
    const x = -w / 2;
    const y = -d / 2;
    p.moveTo(x + r, y);
    p.lineTo(x + w - r, y);
    p.quadraticCurveTo(x + w, y, x + w, y + r);
    p.lineTo(x + w, y + d - r);
    p.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
    p.lineTo(x + r, y + d);
    p.quadraticCurveTo(x, y + d, x, y + d - r);
    p.lineTo(x, y + r);
    p.quadraticCurveTo(x, y, x + r, y);
    return p;
}

/** Sculpted, dished keycap for a width (in units) and a row profile. */
function keycapGeometry(widthUnits: number, row: number): BufferGeometry {
    const bw = widthUnits * U - 0.9;
    const bd = U - 0.9;
    const tw = bw - 5.4;
    const td = bd - 4.4;
    const h = ROW_HEIGHT[row];
    const tilt = Math.tan((ROW_TILT[row] * Math.PI) / 180);
    const tz = -0.6;
    const dishDepth = 0.7;
    const m = 8;
    const ringSize = 4 * (m + 1);
    const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]];

    const ring = (wd: number, dd: number, r: number, zo: number) => {
        const points: [number, number][] = [];
        for (let c = 0; c < 4; c++) {
            for (let j = 0; j <= m; j++) {
                const a = ((c * 90 + (90 * j) / m) * Math.PI) / 180;
                points.push([
                    corners[c][0] * (wd / 2 - r) + r * Math.cos(a),
                    corners[c][1] * (dd / 2 - r) + r * Math.sin(a) + zo,
                ]);
            }
        }
        return points;
    };

    const hx = tw / 2;
    const hz = td / 2;
    const dish = (x: number, z: number) =>
        dishDepth * Math.max(0, 1 - (x / hx) ** 2) * Math.max(0, 1 - ((z - tz) / hz) ** 2) * (widthUnits > 2 ? 0.5 : 1);

    const position: number[] = [];
    const uv: number[] = [];
    const push = (x: number, y: number, z: number) => {
        position.push(x, y, z);
        uv.push((x + tw / 2) / tw, 1 - ((z - tz) + td / 2) / td);
    };

    let rings = 0;
    const sideProfile: [number, number | undefined][] = [[0, 0], [0, 0.7], [0.25, undefined], [0.5, undefined], [0.75, undefined], [0.9, undefined], [0.97, undefined], [1, undefined]];
    for (const [t, y0] of sideProfile) {
        const e = t ** 1.2;
        for (const [x, z] of ring(bw + (tw - bw) * e, bd + (td - bd) * e, 0.9 + 1.6 * e, tz * e)) {
            let y = y0 !== undefined ? y0 : 0.7 + (h - 0.7) * t - (z - tz) * tilt * t;
            if (t === 1) y -= dish(x, z);
            if (t === 0.97) y -= 0.1;
            push(x, y, z);
        }
        rings++;
    }

    const sideEnd = rings;
    const top = ring(tw, td, 2.5, tz);
    for (const s of [0.96, 0.85, 0.7, 0.54, 0.38, 0.22, 0.1]) {
        for (const [x, z] of top) {
            const X = x * s;
            const Z = (z - tz) * s + tz;
            push(X, h - (Z - tz) * tilt - dish(X, Z), Z);
        }
        rings++;
    }
    push(0, h - dish(0, tz), tz);

    const centre = position.length / 3 - 1;
    const index: number[] = [];
    let split = 0;
    for (let i = 0; i < rings - 1; i++) {
        if (i === sideEnd - 1) split = index.length;
        for (let j = 0; j < ringSize; j++) {
            const a = i * ringSize + j;
            const b = i * ringSize + ((j + 1) % ringSize);
            const c = (i + 1) * ringSize + j;
            const d = (i + 1) * ringSize + ((j + 1) % ringSize);
            index.push(a, b, d, a, d, c);
        }
    }
    for (let j = 0; j < ringSize; j++) {
        index.push((rings - 1) * ringSize + j, (rings - 1) * ringSize + ((j + 1) % ringSize), centre);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    if (geometry.getAttribute('normal').getY(centre) < 0) {
        for (let i = 0; i < index.length; i += 3) {
            const t = index[i];
            index[i] = index[i + 1];
            index[i + 1] = t;
        }
        geometry.setIndex(index);
        geometry.computeVertexNormals();
    }
    geometry.addGroup(0, split, 0);
    geometry.addGroup(split, index.length - split, 1);
    geometry.userData = { tw, td };
    return geometry;
}

/** Deterministic ±1.5% lightness jitter so keycaps don't look flat (fixed seed). */
function makeJitter() {
    let seed = 7;
    return () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
    };
}

function vary(hex: string, amount: number): string {
    const c = new Color(hex);
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l * (1 + amount))));
    return `#${c.getHexString()}`;
}

function keyColours(palette: BoardPalette, kind: KeyKind, jitterAmount: number) {
    const raw = kind === 1 ? palette.accent : kind === 2 ? palette.modifier : palette.base;
    return {
        bg: vary(raw, jitterAmount),
        fg: kind === 1 ? palette.textAccent : kind === 2 ? palette.textModifier : palette.text,
        dot: kind === 1 ? palette.dotAccent : palette.dot,
    };
}

/**
 * Legends are painted once as a theme-neutral mask: red = glyph, green = dot, black = keycap.
 * The keycap shader turns the mask into colours, so switching theme never repaints a texture.
 *
 * On screen a keycap top is only ~60-80px tall, so the GPU samples this 256px mask several mip
 * levels down. Glyphs are therefore bold and large enough for their strokes to survive that
 * minification (thin strokes blur into the keycap and read as faint grey), at no extra texture
 * size or painting cost.
 */
function legendTexture(label: string, tw: number, td: number, fontStack: string, maxAnisotropy: number): Texture {
    const LS = 256;
    const ch = 512;
    const cw = (512 * tw) / td;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round((cw * LS) / 512);
    canvas.height = LS;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.scale(LS / 512, LS / 512);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = '#ff0000';
        if (label !== 'Space') {
            if (/[←-↓]/.test(label)) {
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = `500 160px ${fontStack}`;
                ctx.fillText(label, cw / 2, ch / 2);
            } else if (label.length === 1) {
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
                ctx.font = `600 152px ${fontStack}`;
                ctx.fillText(label.toUpperCase(), 80, 204);
            } else {
                // Word legends (Tab, Shift, PgUp…): the longest, "BACKSPACE", still uses about
                // half of its 2u key at this size.
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
                ctx.font = `600 88px ${fontStack}`;
                ctx.fillText(label.toUpperCase(), 80, 172);
            }
        }
        if (MARKED_KEYS.has(label)) {
            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.arc(cw - 96, ch - 96, 22, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    const texture = new CanvasTexture(canvas);
    texture.anisotropy = maxAnisotropy;
    texture.minFilter = LinearMipmapLinearFilter;
    return texture;
}

const LEGEND_UNIFORMS = `uniform vec3 legendBg;
uniform vec3 legendFg;
uniform vec3 legendDot;`;
// The small negative LOD bias samples one notch sharper than the GPU would pick for a keycap this
// small (anisotropic filtering keeps it clean), so legends stay crisp. Free: no extra texels.
const LEGEND_MAP_FRAGMENT = `#ifdef USE_MAP
    vec4 legendMask = texture2D( map, vMapUv, -0.6 );
    diffuseColor.rgb *= mix( mix( legendBg, legendFg, legendMask.r ), legendDot, legendMask.g );
#endif`;

/** Keycap top: plain colour until its legend mask arrives, then the mask is coloured by `legend`. */
function keycapTopMaterial(legend: LegendColours, keyEnv: number): MeshStandardMaterial {
    const material = new MeshStandardMaterial({ color: legend.bg, emissive: legend.bg, emissiveIntensity: 0, roughness: 0.94, envMapIntensity: keyEnv });
    const uniforms = { legendBg: { value: legend.bg }, legendFg: { value: legend.fg }, legendDot: { value: legend.dot } };
    material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
${LEGEND_UNIFORMS}`)
            .replace('#include <map_fragment>', LEGEND_MAP_FRAGMENT);
    };
    // Every keycap shares one compiled program; only the uniform values differ.
    material.customProgramCacheKey = () => 'keycap-legend';
    return material;
}

function disposeObject(object: Object3D) {
    object.traverse((child) => {
        const mesh = child as Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
            ([] as Material[]).concat(mesh.material).forEach((material) => {
                const map = (material as MeshStandardMaterial).map;
                if (map) map.dispose();
                material.dispose();
            });
        }
    });
}

interface KeySlot {
    label: string;
    width: number;
    kind: KeyKind;
    row: number;
    cx: number;
    z: number;
}

/** Walks the layout once: where every key, gap and the knob sit (board units). */
function layoutSlots() {
    const slots: KeySlot[] = [];
    let knobAt: { cx: number; z: number } | null = null;
    KEY_ROWS.forEach((row, ri) => {
        let x = (-16 * U) / 2;
        const z = (-6.25 * U) / 2 + U * (ri + 0.5) + (ri > 0 ? 0.25 * U : 0);
        row.forEach(([label, w = 1, kind = 0]) => {
            const cx = x + (w * U) / 2;
            x += w * U;
            if (label === GAP) return;
            if (label === 'KNOB') knobAt = { cx, z };
            else slots.push({ label, width: w, kind, row: ri, cx, z });
        });
    });
    return { slots, knobAt: knobAt as { cx: number; z: number } | null };
}

export function buildKeyboard(palette: BoardPalette, lighting: StageLighting, mobile: boolean): BuiltKeyboard {
    const stage = new Group();
    const disposables: { dispose: () => void }[] = [];

    const key = new DirectionalLight(0xffffff, lighting.key);
    key.position.set(-3, 12, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(mobile ? 512 : 1024, mobile ? 512 : 1024);
    key.shadow.bias = -0.0002;
    key.shadow.normalBias = 0.008;
    Object.assign(key.shadow.camera, { left: -7, right: 7, top: 5.5, bottom: -5.5, near: 1, far: 25 });
    key.shadow.camera.updateProjectionMatrix();
    const rim = new DirectionalLight(0xffffff, lighting.rim);
    rim.position.set(3, 4, -9);
    const fill = new DirectionalLight(0xffffff, lighting.fill);
    fill.position.set(8, 4, 6);
    stage.add(key, rim, fill);
    disposables.push({ dispose: () => key.shadow.map?.dispose() });

    const hemi = new HemisphereLight(0xffffff, 0x3a3a3a, lighting.hemi);
    const groundMat = new ShadowMaterial({ opacity: lighting.shadow });
    const ground = new Mesh(new PlaneGeometry(40, 40), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.737;
    ground.receiveShadow = true;
    stage.add(hemi, ground);

    const root = new Group();
    root.scale.setScalar(0.03);
    stage.add(root);
    const board = new Group();
    board.rotation.x = (6 * Math.PI) / 180;
    board.position.z = -4;
    root.add(board);

    // Case: top frame with the key well, a wedge-shaped bottom, a seam and a USB-C port.
    const OW = 327;
    const OD = 145;
    const IW = 16 * U + 1.4;
    const ID = 6.25 * U + 1.4;
    const caseMat = new MeshStandardMaterial({ color: palette.caseColor, metalness: palette.caseMetalness, roughness: palette.caseRoughness, envMapIntensity: palette.caseEnv });
    const topShape = roundedRect(Shape, OW, OD, 9);
    topShape.holes.push(roundedRect(Path, IW, ID, 1.5));
    const topGeo = new ExtrudeGeometry(topShape, { depth: 9, bevelEnabled: true, bevelThickness: 1.1, bevelSize: 1.1, bevelSegments: 4, curveSegments: 12 });
    topGeo.rotateX(-Math.PI / 2);
    const topCase = new Mesh(topGeo, caseMat);
    topCase.position.y = 8 - 11.1;
    topCase.castShadow = true;
    topCase.receiveShadow = true;
    board.add(topCase);

    const botGeo = new ExtrudeGeometry(roundedRect(Shape, OW - 0.6, OD - 0.6, 8.7), { depth: 11, bevelEnabled: true, bevelThickness: 1, bevelSize: 0.9, bevelSegments: 4, curveSegments: 12 });
    botGeo.rotateX(-Math.PI / 2);
    const botPos = botGeo.getAttribute('position');
    for (let i = 0; i < botPos.count; i++) {
        if (botPos.getY(i) < 4) botPos.setY(i, botPos.getY(i) + (botPos.getZ(i) - OD / 2) * TAN6);
    }
    botGeo.computeVertexNormals();
    const botCase = new Mesh(botGeo, caseMat);
    botCase.position.y = -3.8 - 12;
    botCase.castShadow = true;
    botCase.receiveShadow = true;
    board.add(botCase);

    const seamGeo = new ExtrudeGeometry(roundedRect(Shape, OW - 1.8, OD - 1.8, 8), { depth: 1, bevelEnabled: false, curveSegments: 12 });
    seamGeo.rotateX(-Math.PI / 2);
    const seam = new Mesh(seamGeo, new MeshBasicMaterial({ color: 0x050505 }));
    seam.position.y = -4.4;
    board.add(seam);

    const usb = new Mesh(new BoxGeometry(9, 3.2, 2), new MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.7, metalness: 0.3 }));
    usb.position.set(-OW / 2 + 70, -7, -OD / 2 - 0.5);
    board.add(usb);

    const plateMat = new MeshStandardMaterial({ color: palette.plate, roughness: 0.85, metalness: 0.3, envMapIntensity: 0.2 });
    const plate = new Mesh(new BoxGeometry(IW - 0.5, 1.5, ID - 0.5), plateMat);
    plate.position.y = -0.75;
    plate.receiveShadow = true;
    board.add(plate);

    // Everything under the keycaps is identical per key, so it is drawn instanced:
    // a few draw calls instead of several hundred.
    const { slots, knobAt } = layoutSlots();
    const stabSlots = slots.flatMap((s) => (s.width >= 2 ? [-1, 1].map((side) => ({ x: s.cx + side * (s.width >= 6 ? 50 : 11.9), z: s.z })) : []));
    const matrix = new Matrix4();
    const scale = new Vector3();
    const flat = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
    const upright = new Quaternion();

    const switchMat = new MeshStandardMaterial({ color: palette.switchBody, roughness: 0.75, envMapIntensity: 0.2 });
    const stemMat = new MeshStandardMaterial({ color: palette.stem, roughness: 0.8, envMapIntensity: 0.2 });
    const stabMat = new MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.4, envMapIntensity: 0.2 });
    const switches = new InstancedMesh(new BoxGeometry(14, 5, 14), switchMat, slots.length);
    const stemsA = new InstancedMesh(new BoxGeometry(4, 3, 1.2), stemMat, slots.length);
    const stemsB = new InstancedMesh(new BoxGeometry(1.2, 3, 4), stemMat, slots.length);
    const stabs = new InstancedMesh(new BoxGeometry(6.5, 4, 12), stabMat, Math.max(1, stabSlots.length));
    switches.receiveShadow = true;

    const aoCanvas = document.createElement('canvas');
    aoCanvas.width = 128;
    aoCanvas.height = 128;
    const aoCtx = aoCanvas.getContext('2d');
    if (aoCtx) {
        aoCtx.filter = 'blur(10px)';
        aoCtx.fillStyle = '#fff';
        aoCtx.fillRect(20, 20, 88, 88);
    }
    const aoTexture = new CanvasTexture(aoCanvas);
    const aoMat = new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.85, depthWrite: false, alphaMap: aoTexture });
    const aoPlanes = new InstancedMesh(new PlaneGeometry(1, 1), aoMat, slots.length);
    disposables.push(aoTexture);

    slots.forEach((slot, i) => {
        matrix.compose(new Vector3(slot.cx, 2.5, slot.z), upright, scale.set(1, 1, 1));
        switches.setMatrixAt(i, matrix);
        matrix.compose(new Vector3(slot.cx, 6.2, slot.z), upright, scale.set(1, 1, 1));
        stemsA.setMatrixAt(i, matrix);
        stemsB.setMatrixAt(i, matrix);
        matrix.compose(new Vector3(slot.cx, 0.05, slot.z + 0.9), flat, scale.set(slot.width * U + 7, U + 7, 1));
        aoPlanes.setMatrixAt(i, matrix);
    });
    stabSlots.forEach((stab, i) => {
        matrix.compose(new Vector3(stab.x, 2, stab.z), upright, scale.set(1, 1, 1));
        stabs.setMatrixAt(i, matrix);
    });
    if (!stabSlots.length) stabs.count = 0;
    board.add(switches, stemsA, stemsB, stabs, aoPlanes);

    let knob: Knob | null = null;
    let knobMat: MeshStandardMaterial | null = null;
    if (knobAt) {
        const group = new Group();
        group.position.set(knobAt.cx, 0, knobAt.z);
        const ridges = new CylinderGeometry(8.6, 8.6, 13, 96, 1, true);
        const rp = ridges.getAttribute('position');
        for (let i = 0; i < rp.count; i++) {
            const a = Math.atan2(rp.getZ(i), rp.getX(i));
            const r = 8.6 + 0.25 * Math.sign(Math.sin(a * 48));
            rp.setX(i, Math.cos(a) * r);
            rp.setZ(i, Math.sin(a) * r);
        }
        ridges.computeVertexNormals();
        knobMat = new MeshStandardMaterial({ color: palette.caseColor, roughness: palette.knobRoughness, metalness: palette.knobMetalness, envMapIntensity: 0.3 });
        const body = new Mesh(ridges, knobMat);
        body.position.y = 9.5;
        body.castShadow = true;
        const cap = new Mesh(new CylinderGeometry(8.4, 8.7, 0.9, 64), knobMat);
        cap.position.y = 16.4;
        cap.castShadow = true;
        const shaft = new Mesh(new CylinderGeometry(3, 3, 4, 16), stemMat);
        shaft.position.y = 1.5;
        group.add(body, cap, shaft);
        board.add(group);
        knob = { group, rotation: 0, target: 0 };
    }

    const keys: KeyMesh[] = [];
    const byLabel = new Map<string, KeyMesh[]>();
    const pickables: Object3D[] = knob ? [...(knob as Knob).group.children] : [];
    const geometryCache = new Map<string, BufferGeometry>();
    const jitter = makeJitter();

    const addKey = (slot: KeySlot) => {
        const cacheKey = `${slot.width}_${slot.row}`;
        let geometry = geometryCache.get(cacheKey);
        if (!geometry) {
            geometry = keycapGeometry(slot.width, slot.row);
            geometryCache.set(cacheKey, geometry);
        }
        const keyJitter = (jitter() - 0.5) * 0.03;
        const { bg, fg, dot } = keyColours(palette, slot.kind, keyJitter);
        const legend: LegendColours = { bg: new Color(bg), fg: new Color(fg), dot: new Color(dot) };
        const sideMat = new MeshStandardMaterial({ color: bg, emissive: bg, emissiveIntensity: 0, roughness: 0.95, envMapIntensity: palette.keyEnv });
        const topMat = keycapTopMaterial(legend, palette.keyEnv);
        const mesh = new Mesh(geometry, [sideMat, topMat]) as KeyMesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.set(slot.cx, CAP_Y, slot.z);
        mesh.userData = { label: slot.label, kind: slot.kind, press: 0, hover: 0, sideMat, topMat, legend, jitter: keyJitter };
        board.add(mesh);
        keys.push(mesh);
        pickables.push(mesh);
        byLabel.set(slot.label, [...(byLabel.get(slot.label) ?? []), mesh]);
    };

    async function buildKeys(isAlive: () => boolean, onProgress?: (fraction: number) => void) {
        for (let row = 0; row < KEY_ROWS.length; row++) {
            if (!isAlive()) return;
            slots.filter((slot) => slot.row === row).forEach(addKey);
            onProgress?.((row + 1) / KEY_ROWS.length);
            await yieldToBrowser();
        }
    }

    async function paintLegends(fontStack: string, maxAnisotropy: number, isAlive: () => boolean, onProgress?: (fraction: number) => void) {
        for (let i = 0; i < keys.length; i++) {
            if (!isAlive()) return;
            const mesh = keys[i];
            const state = mesh.userData;
            const { tw, td } = mesh.geometry.userData as { tw: number; td: number };
            state.topMat.map?.dispose();
            state.topMat.map = legendTexture(state.label, tw, td, fontStack, maxAnisotropy);
            state.topMat.color.set(0xffffff);
            state.topMat.needsUpdate = true;
            if (i % 12 === 11) {
                onProgress?.((i + 1) / keys.length);
                await yieldToBrowser();
            }
        }
    }

    function applyLook(nextPalette: BoardPalette, nextLighting: StageLighting) {
        key.intensity = nextLighting.key;
        rim.intensity = nextLighting.rim;
        fill.intensity = nextLighting.fill;
        hemi.intensity = nextLighting.hemi;
        groundMat.opacity = nextLighting.shadow;
        caseMat.color.set(nextPalette.caseColor);
        caseMat.metalness = nextPalette.caseMetalness;
        caseMat.roughness = nextPalette.caseRoughness;
        caseMat.envMapIntensity = nextPalette.caseEnv;
        plateMat.color.set(nextPalette.plate);
        switchMat.color.set(nextPalette.switchBody);
        stemMat.color.set(nextPalette.stem);
        if (knobMat) {
            knobMat.color.set(nextPalette.caseColor);
            knobMat.metalness = nextPalette.knobMetalness;
            knobMat.roughness = nextPalette.knobRoughness;
        }
        for (const mesh of keys) {
            const state = mesh.userData;
            const colours = keyColours(nextPalette, state.kind, state.jitter);
            state.legend.bg.set(colours.bg);
            state.legend.fg.set(colours.fg);
            state.legend.dot.set(colours.dot);
            state.sideMat.color.set(colours.bg);
            state.sideMat.emissive.set(colours.bg);
            state.sideMat.envMapIntensity = nextPalette.keyEnv;
            state.topMat.emissive.set(colours.bg);
            state.topMat.envMapIntensity = nextPalette.keyEnv;
            // Painted keycaps take the new colours through their legend uniforms (shared objects).
            if (!state.topMat.map) state.topMat.color.set(colours.bg);
        }
    }

    return {
        stage,
        root,
        keys,
        byLabel,
        get knob() {
            return knob;
        },
        pickables,
        buildKeys,
        paintLegends,
        applyLook,
        dispose() {
            disposeObject(stage);
            disposables.forEach((item) => item.dispose());
            geometryCache.forEach((geometry) => geometry.dispose());
        },
    };
}
