'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';

const vertexShader = `
precision highp float;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec3  iResolution;
uniform float animationSpeed;

uniform bool enableTop;
uniform bool enableMiddle;
uniform bool enableBottom;

uniform int topLineCount;
uniform int middleLineCount;
uniform int bottomLineCount;

uniform float topLineDistance;
uniform float middleLineDistance;
uniform float bottomLineDistance;

uniform vec3 topWavePosition;
uniform vec3 middleWavePosition;
uniform vec3 bottomWavePosition;

uniform vec2 iMouse;
uniform bool interactive;
uniform float bendRadius;
uniform float bendStrength;
uniform float bendInfluence;

uniform bool parallax;
uniform float parallaxStrength;
uniform vec2 parallaxOffset;

uniform vec3 lineGradient[8];
uniform int lineGradientCount;

const vec3 BLACK = vec3(0.0);
const vec3 PINK  = vec3(233.0, 71.0, 245.0) / 255.0;
const vec3 BLUE  = vec3(47.0, 75.0, 162.0) / 255.0;

mat2 rotate(float r) {
  return mat2(cos(r), sin(r), -sin(r), cos(r));
}

vec3 background_color(vec2 uv) {
  vec3 col = vec3(0.0);

  float y = sin(uv.x - 0.2) * 0.3 - 0.1;
  float m = uv.y - y;

  col += mix(BLUE, BLACK, smoothstep(0.0, 1.0, abs(m)));
  col += mix(PINK, BLACK, smoothstep(0.0, 1.0, abs(m - 0.8)));
  return col * 0.5;
}

vec3 getLineColor(float t, vec3 baseColor) {
  if (lineGradientCount <= 0) {
    return baseColor;
  }

  vec3 gradientColor;

  if (lineGradientCount == 1) {
    gradientColor = lineGradient[0];
  } else {
    float clampedT = clamp(t, 0.0, 0.9999);
    float scaled = clampedT * float(lineGradientCount - 1);
    int idx = int(floor(scaled));
    float f = fract(scaled);
    int idx2 = min(idx + 1, lineGradientCount - 1);

    vec3 c1 = lineGradient[idx];
    vec3 c2 = lineGradient[idx2];

    gradientColor = mix(c1, c2, f);
  }

  return gradientColor * 0.5;
}

float wave(vec2 uv, float offset, vec2 screenUv, vec2 mouseUv, bool shouldBend) {
  float time = iTime * animationSpeed;

  float x_offset = offset;
  float x_movement = time * 0.1;
  float amp = sin(offset + time * 0.2) * 0.3;
  float y = sin(uv.x + x_offset + x_movement) * amp;

  if (shouldBend) {
    vec2 d = screenUv - mouseUv;
    float influence = exp(-dot(d, d) * bendRadius);
    float bendOffset = (mouseUv.y - screenUv.y) * influence * bendStrength * bendInfluence;
    y += bendOffset;
  }

  float m = uv.y - y;
  return 0.0175 / max(abs(m) + 0.01, 1e-3) + 0.01;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 baseUv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
  baseUv.y *= -1.0;

  if (parallax) {
    baseUv += parallaxOffset;
  }

  vec3 col = vec3(0.0);
  vec3 b = lineGradientCount > 0 ? vec3(0.0) : background_color(baseUv);

  vec2 mouseUv = vec2(0.0);
  if (interactive) {
    mouseUv = (2.0 * iMouse - iResolution.xy) / iResolution.y;
    mouseUv.y *= -1.0;
  }

  if (enableBottom) {
    for (int i = 0; i < bottomLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(bottomLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t, b);

      float angle = bottomWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      col += lineCol * wave(
        ruv + vec2(bottomLineDistance * fi + bottomWavePosition.x, bottomWavePosition.y),
        1.5 + 0.2 * fi,
        baseUv,
        mouseUv,
        interactive
      ) * 0.2;
    }
  }

  if (enableMiddle) {
    for (int i = 0; i < middleLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(middleLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t, b);

      float angle = middleWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      col += lineCol * wave(
        ruv + vec2(middleLineDistance * fi + middleWavePosition.x, middleWavePosition.y),
        2.0 + 0.15 * fi,
        baseUv,
        mouseUv,
        interactive
      );
    }
  }

  if (enableTop) {
    for (int i = 0; i < topLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(topLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t, b);

      float angle = topWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      ruv.x *= -1.0;
      col += lineCol * wave(
        ruv + vec2(topLineDistance * fi + topWavePosition.x, topWavePosition.y),
        1.0 + 0.2 * fi,
        baseUv,
        mouseUv,
        interactive
      ) * 0.1;
    }
  }

  fragColor = vec4(col, 1.0);
}

void main() {
  vec4 color = vec4(0.0);
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor = color;
}
`;

const MAX_GRADIENT_STOPS = 8;
const DEFAULT_ENABLED_WAVES: WaveType[] = ['top', 'middle', 'bottom'];
const DEFAULT_LINE_COUNT = [6];
const DEFAULT_LINE_DISTANCE = [5];
const DEFAULT_BOTTOM_WAVE_POSITION: WavePosition = { x: 2, y: -0.7, rotate: -1 };

type WaveType = 'top' | 'middle' | 'bottom';

interface WavePosition {
  x: number;
  y: number;
  rotate: number;
}

export interface FloatingLinesProps {
  linesGradient?: readonly string[];
  enabledWaves?: readonly WaveType[];
  lineCount?: number | readonly number[];
  lineDistance?: number | readonly number[];
  topWavePosition?: WavePosition;
  middleWavePosition?: WavePosition;
  bottomWavePosition?: WavePosition;
  animationSpeed?: number;
  interactive?: boolean;
  bendRadius?: number;
  bendStrength?: number;
  mouseDamping?: number;
  parallax?: boolean;
  parallaxStrength?: number;
  mixBlendMode?: CSSProperties['mixBlendMode'];
}

function hexToVec3(hex: string): Vector3 {
  const value = hex.trim().replace(/^#/, '');
  const normalized = value.length === 3
    ? value.split('').map((character) => character + character).join('')
    : value;

  if (!/^[\da-fA-F]{6}$/.test(normalized)) {
    return new Vector3(1, 1, 1);
  }

  return new Vector3(
    Number.parseInt(normalized.slice(0, 2), 16) / 255,
    Number.parseInt(normalized.slice(2, 4), 16) / 255,
    Number.parseInt(normalized.slice(4, 6), 16) / 255
  );
}

export default function FloatingLines({
  linesGradient,
  enabledWaves = DEFAULT_ENABLED_WAVES,
  lineCount = DEFAULT_LINE_COUNT,
  lineDistance = DEFAULT_LINE_DISTANCE,
  topWavePosition,
  middleWavePosition,
  bottomWavePosition = DEFAULT_BOTTOM_WAVE_POSITION,
  animationSpeed = 1,
  interactive = true,
  bendRadius = 5,
  bendStrength = -0.5,
  mouseDamping = 0.05,
  parallax = true,
  parallaxStrength = 0.2,
  mixBlendMode = 'screen',
}: FloatingLinesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetMouseRef = useRef(new Vector2(-1000, -1000));
  const currentMouseRef = useRef(new Vector2(-1000, -1000));
  const targetInfluenceRef = useRef(0);
  const currentInfluenceRef = useRef(0);
  const targetParallaxRef = useRef(new Vector2());
  const currentParallaxRef = useRef(new Vector2());

  const getWaveValue = (
    value: number | readonly number[],
    waveType: WaveType,
    fallback: number
  ): number => {
    if (typeof value === 'number') return value;
    const index = enabledWaves.indexOf(waveType);
    return index >= 0 ? value[index] ?? fallback : fallback;
  };

  const topLineCount = enabledWaves.includes('top') ? getWaveValue(lineCount, 'top', 6) : 0;
  const middleLineCount = enabledWaves.includes('middle') ? getWaveValue(lineCount, 'middle', 6) : 0;
  const bottomLineCount = enabledWaves.includes('bottom') ? getWaveValue(lineCount, 'bottom', 6) : 0;

  const topLineDistance = enabledWaves.includes('top') ? getWaveValue(lineDistance, 'top', 0.1) * 0.01 : 0.01;
  const middleLineDistance = enabledWaves.includes('middle')
    ? getWaveValue(lineDistance, 'middle', 0.1) * 0.01
    : 0.01;
  const bottomLineDistance = enabledWaves.includes('bottom')
    ? getWaveValue(lineDistance, 'bottom', 0.1) * 0.01
    : 0.01;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      return;
    }

    let active = true;
    let raf = 0;
    let elapsedTime = 0;
    let lastFrameTime = performance.now();
    let pageVisible = document.visibilityState === 'visible';

    renderer.setClearColor(0x000000, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.className = 'block h-full w-full';
    container.appendChild(renderer.domElement);

    const scene = new Scene();
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    camera.position.z = 1;

    const uniforms = {
      iTime: { value: 0 },
      iResolution: { value: new Vector3(1, 1, 1) },
      animationSpeed: { value: animationSpeed },
      enableTop: { value: enabledWaves.includes('top') },
      enableMiddle: { value: enabledWaves.includes('middle') },
      enableBottom: { value: enabledWaves.includes('bottom') },
      topLineCount: { value: topLineCount },
      middleLineCount: { value: middleLineCount },
      bottomLineCount: { value: bottomLineCount },
      topLineDistance: { value: topLineDistance },
      middleLineDistance: { value: middleLineDistance },
      bottomLineDistance: { value: bottomLineDistance },
      topWavePosition: {
        value: new Vector3(
          topWavePosition?.x ?? 10,
          topWavePosition?.y ?? 0.5,
          topWavePosition?.rotate ?? -0.4
        ),
      },
      middleWavePosition: {
        value: new Vector3(
          middleWavePosition?.x ?? 5,
          middleWavePosition?.y ?? 0,
          middleWavePosition?.rotate ?? 0.2
        ),
      },
      bottomWavePosition: {
        value: new Vector3(
          bottomWavePosition.x,
          bottomWavePosition.y,
          bottomWavePosition.rotate
        ),
      },
      iMouse: { value: new Vector2(-1000, -1000) },
      interactive: { value: interactive },
      bendRadius: { value: bendRadius },
      bendStrength: { value: bendStrength },
      bendInfluence: { value: 0 },
      parallax: { value: parallax },
      parallaxStrength: { value: parallaxStrength },
      parallaxOffset: { value: new Vector2() },
      lineGradient: {
        value: Array.from({ length: MAX_GRADIENT_STOPS }, () => new Vector3(1, 1, 1)),
      },
      lineGradientCount: { value: 0 },
    };

    if (linesGradient?.length) {
      const stops = linesGradient.slice(0, MAX_GRADIENT_STOPS);
      uniforms.lineGradientCount.value = stops.length;
      stops.forEach((hex, index) => {
        uniforms.lineGradient.value[index].copy(hexToVec3(hex));
      });
    }

    const material = new ShaderMaterial({ uniforms, vertexShader, fragmentShader });
    const geometry = new PlaneGeometry(2, 2);
    const mesh = new Mesh(geometry, material);
    scene.add(mesh);

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = reducedMotionQuery.matches;

    const renderFrame = () => {
      uniforms.iTime.value = elapsedTime;
      renderer.render(scene, camera);
    };

    const setSize = () => {
      if (!active) return;
      const width = container.clientWidth || 1;
      const height = container.clientHeight || 1;
      renderer.setSize(width, height, false);
      uniforms.iResolution.value.set(renderer.domElement.width, renderer.domElement.height, 1);
      renderFrame();
    };

    const renderLoop = (time: number) => {
      raf = 0;
      if (!active || !pageVisible || prefersReducedMotion) return;

      const delta = Math.min(Math.max((time - lastFrameTime) / 1000, 0), 0.1);
      elapsedTime += delta;
      lastFrameTime = time;

      if (interactive) {
        currentMouseRef.current.lerp(targetMouseRef.current, mouseDamping);
        uniforms.iMouse.value.copy(currentMouseRef.current);
        currentInfluenceRef.current +=
          (targetInfluenceRef.current - currentInfluenceRef.current) * mouseDamping;
        uniforms.bendInfluence.value = currentInfluenceRef.current;
      }

      if (parallax) {
        currentParallaxRef.current.lerp(targetParallaxRef.current, mouseDamping);
        uniforms.parallaxOffset.value.copy(currentParallaxRef.current);
      }

      renderFrame();
      raf = window.requestAnimationFrame(renderLoop);
    };

    const syncRenderLoop = () => {
      if (raf) {
        window.cancelAnimationFrame(raf);
        raf = 0;
      }

      if (!active) return;
      if (!pageVisible || prefersReducedMotion) {
        renderFrame();
        return;
      }

      lastFrameTime = performance.now();
      raf = window.requestAnimationFrame(renderLoop);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const inside = event.clientX >= rect.left
        && event.clientX <= rect.right
        && event.clientY >= rect.top
        && event.clientY <= rect.bottom;

      if (!inside) {
        targetInfluenceRef.current = 0;
        targetParallaxRef.current.set(0, 0);
        return;
      }

      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const dpr = renderer.getPixelRatio();
      targetMouseRef.current.set(x * dpr, (rect.height - y) * dpr);
      targetInfluenceRef.current = 1;

      if (parallax) {
        const offsetX = (x - rect.width / 2) / rect.width;
        const offsetY = -(y - rect.height / 2) / rect.height;
        targetParallaxRef.current.set(offsetX * parallaxStrength, offsetY * parallaxStrength);
      }
    };

    const resetPointer = () => {
      targetInfluenceRef.current = 0;
      targetParallaxRef.current.set(0, 0);
    };

    const handleVisibilityChange = () => {
      pageVisible = document.visibilityState === 'visible';
      syncRenderLoop();
    };

    const handleReducedMotionChange = (event: MediaQueryListEvent) => {
      prefersReducedMotion = event.matches;
      syncRenderLoop();
    };

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(setSize);

    resizeObserver?.observe(container);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    if (interactive) {
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('blur', resetPointer);
    }

    setSize();
    syncRenderLoop();

    return () => {
      active = false;
      if (raf) window.cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      if (interactive) {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('blur', resetPointer);
      }

      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [
    animationSpeed,
    bendRadius,
    bendStrength,
    bottomLineCount,
    bottomLineDistance,
    bottomWavePosition,
    enabledWaves,
    interactive,
    linesGradient,
    middleLineCount,
    middleLineDistance,
    middleWavePosition,
    mouseDamping,
    parallax,
    parallaxStrength,
    topLineCount,
    topLineDistance,
    topWavePosition,
  ]);

  return (
    <div
      ref={containerRef}
      className="floating-lines-container relative h-full w-full overflow-hidden bg-black"
      style={{ mixBlendMode }}
    />
  );
}
