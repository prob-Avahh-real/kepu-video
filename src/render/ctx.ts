// 与宿主无关的 2D 上下文（浏览器 CanvasRenderingContext2D 与 @napi-rs/canvas 均满足）。
// 只声明本项目用到的方法，避免共享渲染代码直接依赖 @napi-rs/canvas（Node 原生）类型。

export interface Gradient {
  addColorStop(offset: number, color: string): void;
}

export interface Ctx2D {
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  font: string;
  textAlign: string;
  textBaseline: string;
  globalAlpha: number;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(x: number, y: number): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  fill(): void;
  stroke(): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  measureText(text: string): { width: number };
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): Gradient;
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): Gradient;
  getImageData(x: number, y: number, w: number, h: number): { data: Uint8ClampedArray };
}

export type RoughCanvasLike = ReturnType<typeof import('roughjs').default.canvas>;
