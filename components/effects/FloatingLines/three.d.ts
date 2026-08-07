declare module 'three' {
  export class Vector2 {
    constructor(x?: number, y?: number);
    set(x: number, y: number): this;
    copy(vector: Vector2): this;
    lerp(vector: Vector2, alpha: number): this;
  }

  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
    copy(vector: Vector3): this;
  }

  export class Scene {
    add(...objects: object[]): this;
    remove(...objects: object[]): this;
  }

  export class OrthographicCamera {
    constructor(
      left: number,
      right: number,
      top: number,
      bottom: number,
      near?: number,
      far?: number
    );
    position: { z: number };
  }

  export class PlaneGeometry {
    constructor(width?: number, height?: number);
    dispose(): void;
  }

  export class ShaderMaterial {
    constructor(parameters?: {
      uniforms?: Record<string, { value: unknown }>;
      vertexShader?: string;
      fragmentShader?: string;
    });
    dispose(): void;
  }

  export class Mesh {
    constructor(geometry?: PlaneGeometry, material?: ShaderMaterial);
  }

  export class WebGLRenderer {
    constructor(parameters?: { antialias?: boolean; alpha?: boolean });
    domElement: HTMLCanvasElement;
    setClearColor(color: number, alpha?: number): void;
    setPixelRatio(value: number): void;
    getPixelRatio(): number;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    render(scene: Scene, camera: OrthographicCamera): void;
    dispose(): void;
    forceContextLoss(): void;
  }
}
