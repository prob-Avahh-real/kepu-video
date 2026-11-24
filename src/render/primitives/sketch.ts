// 手绘元件库：封装 rough.js，提供稳定种子（seed）的抖动笔触。
// 所有 kind 只用这里的原语，保证风格统一、逐帧不闪（同一 seed 结果一致）。

import rough from 'roughjs';
import type { Ctx2D } from '../ctx';
import { INK } from '../../types';

export type RC = ReturnType<typeof rough.canvas>;

export interface InkOpts {
  color?: string;
  width?: number;
  seed?: number;
  fill?: string;
  fillStyle?: 'hachure' | 'solid' | 'zigzag' | 'cross-hatch' | 'dots';
  roughness?: number;
}

const DEFAULTS = { color: INK, width: 4, seed: 1, roughness: 1.6 };

function opts(o: InkOpts = {}) {
  const out: Record<string, unknown> = {
    stroke: o.color ?? DEFAULTS.color,
    strokeWidth: o.width ?? DEFAULTS.width,
    roughness: o.roughness ?? DEFAULTS.roughness,
    bowing: 1.2,
    seed: o.seed ?? DEFAULTS.seed,
  };
  if (o.fill) {
    out.fill = o.fill;
    out.fillStyle = o.fillStyle ?? 'hachure';
    out.hachureGap = 6;
    out.hachureAngle = -41;
  }
  return out;
}

export function rcFor(canvas: unknown): RC {
  return rough.canvas(canvas as Parameters<typeof rough.canvas>[0]);
}

export function line(rc: RC, x1: number, y1: number, x2: number, y2: number, o: InkOpts = {}) {
  rc.line(x1, y1, x2, y2, opts(o));
}

export function rect(rc: RC, x: number, y: number, w: number, h: number, o: InkOpts = {}) {
  rc.rectangle(x, y, w, h, opts(o));
}

export function roundRect(rc: RC, x: number, y: number, w: number, h: number, r: number, o: InkOpts = {}) {
  const d = `M ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r}
    L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h}
    L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${y + h - r}
    L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
  rc.path(d, opts(o));
}

export function circle(rc: RC, cx: number, cy: number, d: number, o: InkOpts = {}) {
  rc.circle(cx, cy, d, opts(o));
}

export function ellipse(rc: RC, cx: number, cy: number, w: number, h: number, o: InkOpts = {}) {
  rc.ellipse(cx, cy, w, h, opts(o));
}

export function polygon(rc: RC, pts: [number, number][], o: InkOpts = {}) {
  rc.polygon(pts, opts(o));
}

export function polylines(rc: RC, pts: [number, number][], o: InkOpts = {}) {
  rc.linearPath(pts, opts(o));
}

export function path(rc: RC, d: string, o: InkOpts = {}) {
  rc.path(d, opts(o));
}

export function arrow(rc: RC, x1: number, y1: number, x2: number, y2: number, o: InkOpts = {}) {
  const w = o.width ?? DEFAULTS.width;
  line(rc, x1, y1, x2, y2, o);
  const a = Math.atan2(y2 - y1, x2 - x1);
  const hl = 14 + w * 3;
  line(rc, x2, y2, x2 - Math.cos(a - 0.5) * hl, y2 - Math.sin(a - 0.5) * hl, o);
  line(rc, x2, y2, x2 - Math.cos(a + 0.5) * hl, y2 - Math.sin(a + 0.5) * hl, o);
}

// 手写体文字（用于字幕/标题；风格靠字库，描边靠抖动几何）。
export interface TextOpts {
  font?: string;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  weight?: string;
  maxWidth?: number;
}

export function text(ctx: Ctx2D, str: string, x: number, y: number, size: number, o: TextOpts = {}) {
  ctx.save();
  ctx.font = `${o.weight ?? 'bold'} ${size}px ${o.font ?? 'sans-serif'}`;
  ctx.fillStyle = o.color ?? INK;
  ctx.textAlign = o.align ?? 'center';
  ctx.textBaseline = o.baseline ?? 'middle';
  if (o.maxWidth) ctx.fillText(str, x, y, o.maxWidth);
  else ctx.fillText(str, x, y);
  ctx.restore();
}

// 按当前 ctx.font 折行（中文按字断行）。
export function wrapText(ctx: Ctx2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// 线性插值 / 缓动，供各 kind 动画使用
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

export function easeOut(t: number): number {
  const c = clamp01(t);
  return 1 - Math.pow(1 - c, 3);
}

export function easeInOut(t: number): number {
  const c = clamp01(t);
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
}

// 分段进度：返回 0..1，在前 frac 段内完成。
export function stagger(progress: number, index: number, count: number, frac = 0.6): number {
  const start = (index / count) * (1 - frac) + 0.02;
  return clamp01((progress - start) / frac);
}
