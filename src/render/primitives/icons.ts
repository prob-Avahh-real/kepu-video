// 涂鸦图标库：所有 kind 共享的图形词汇。新增图标 = 加一个函数 + 注册一行。
// 坐标以「中心 + 尺寸」给出，颜色/种子由调用方传入，保证同 seed 稳定。

import type { Ctx2D } from '../ctx';
import type { RC } from './sketch';
import { line, polygon, text } from './sketch';

export type IconFn = (ctx: Ctx2D, rc: RC, x: number, y: number, s: number, color: string, seed: number) => void;

const sun: IconFn = (_ctx, rc, x, y, s, c, seed) => {
  rc.circle(x, y, s * 1.5, { stroke: c, strokeWidth: 4, roughness: 1.3, seed });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    line(rc, x + Math.cos(a) * s * 0.95, y + Math.sin(a) * s * 0.95, x + Math.cos(a) * s * 1.4, y + Math.sin(a) * s * 1.4, { color: c, width: 4, seed: seed + i });
  }
};

const moon: IconFn = (_ctx, rc, x, y, s, c, seed) => {
  rc.circle(x, y, s * 1.6, { stroke: c, strokeWidth: 4, roughness: 1.4, seed });
  rc.circle(x + s * 0.55, y - s * 0.25, s * 1.35, { stroke: '#fbf7ef', strokeWidth: 10, roughness: 1, seed: seed + 1 });
};

const cloud: IconFn = (_ctx, rc, x, y, s, c, seed) => {
  rc.circle(x - s * 0.6, y + s * 0.1, s * 0.9, { stroke: c, strokeWidth: 4, roughness: 1.4, seed });
  rc.circle(x, y - s * 0.25, s * 1.2, { stroke: c, strokeWidth: 4, roughness: 1.4, seed: seed + 1 });
  rc.circle(x + s * 0.65, y + s * 0.1, s * 0.9, { stroke: c, strokeWidth: 4, roughness: 1.4, seed: seed + 2 });
  line(rc, x - s * 1.05, y + s * 0.5, x + s * 1.05, y + s * 0.5, { color: c, width: 4, seed: seed + 3 });
};

const droplet: IconFn = (_ctx, rc, x, y, s, c, seed) => {
  const d = `M ${x} ${y - s * 1.2} C ${x + s * 0.9} ${y - s * 0.1} ${x + s * 0.8} ${y + s} ${x} ${y + s}
    C ${x - s * 0.8} ${y + s} ${x - s * 0.9} ${y - s * 0.1} ${x} ${y - s * 1.2} Z`;
  rc.path(d, { stroke: c, strokeWidth: 4, roughness: 1.3, seed, fill: c, fillStyle: 'hachure' });
};

const raincloud: IconFn = (ctx, rc, x, y, s, c, seed) => {
  cloud(ctx, rc, x, y - s * 0.4, s, c, seed);
  for (let i = 0; i < 4; i++) {
    const dx = x - s * 0.8 + i * s * 0.55;
    line(rc, dx, y + s * 0.7, dx - s * 0.15, y + s * 1.3, { color: c, width: 4, seed: seed + i });
  }
};

const snowflake: IconFn = (_ctx, rc, x, y, s, c, seed) => {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI;
    line(rc, x - Math.cos(a) * s, y - Math.sin(a) * s, x + Math.cos(a) * s, y + Math.sin(a) * s, { color: c, width: 4, seed: seed + i });
  }
};

const bolt: IconFn = (_ctx, rc, x, y, s, c, seed) => {
  polygon(rc, [
    [x - s * 0.3, y - s], [x + s * 0.4, y - s], [x + s * 0.05, y - s * 0.1],
    [x + s * 0.55, y - s * 0.1], [x - s * 0.45, y + s], [x - s * 0.05, y + s * 0.15], [x - s * 0.55, y + s * 0.15],
  ], { color: c, width: 3.5, fill: c, fillStyle: 'hachure', seed });
};

const star: IconFn = (_ctx, rc, x, y, s, c, seed) => {
  const pts: [number, number][] = [];
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
    const r = k % 2 === 0 ? s : s * 0.45;
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  polygon(rc, pts, { color: c, width: 3.5, seed });
};

const battery: IconFn = (_ctx, rc, x, y, s, c, seed) => {
  rc.rectangle(x - s, y - s * 1.6, s * 2, s * 3.2, { stroke: c, strokeWidth: 4, roughness: 1.3, seed });
  rc.rectangle(x - s * 0.35, y - s * 2.05, s * 0.7, s * 0.45, { stroke: c, strokeWidth: 4, seed: seed + 1 });
};

const glass: IconFn = (_ctx, rc, x, y, s, c, seed) => {
  const d = `M ${x - s} ${y - s} L ${x + s} ${y - s} L ${x + s * 0.7} ${y + s} L ${x - s * 0.7} ${y + s} Z`;
  rc.path(d, { stroke: c, strokeWidth: 4, roughness: 1.3, seed });
  rc.path(`M ${x - s * 0.82} ${y + s * 0.25} L ${x + s * 0.82} ${y + s * 0.25} L ${x + s * 0.7} ${y + s} L ${x - s * 0.7} ${y + s} Z`,
    { stroke: c, strokeWidth: 3, fill: c, fillStyle: 'hachure', seed: seed + 1 });
};

const flame: IconFn = (_ctx, rc, x, y, s, c, seed) => {
  const d = `M ${x} ${y - s * 1.3} C ${x + s} ${y - s * 0.2} ${x + s * 0.7} ${y + s} ${x} ${y + s}
    C ${x - s * 0.7} ${y + s} ${x - s} ${y - s * 0.2} ${x} ${y - s * 1.3} Z`;
  rc.path(d, { stroke: c, strokeWidth: 4, roughness: 1.3, seed, fill: c, fillStyle: 'hachure' });
};

const leaf: IconFn = (_ctx, rc, x, y, s, c, seed) => {
  rc.path(`M ${x - s} ${y + s} Q ${x} ${y - s * 1.4} ${x + s} ${y - s} Q ${x} ${y + s * 0.4} ${x - s} ${y + s} Z`,
    { stroke: c, strokeWidth: 4, roughness: 1.3, seed });
  line(rc, x - s * 0.7, y + s * 0.7, x + s * 0.7, y - s * 0.7, { color: c, width: 3, seed: seed + 1 });
};

const heart: IconFn = (_ctx, rc, x, y, s, c, seed) => {
  rc.path(`M ${x} ${y + s} C ${x - s * 1.6} ${y - s * 0.4} ${x - s * 0.5} ${y - s * 1.3} ${x} ${y - s * 0.5}
    C ${x + s * 0.5} ${y - s * 1.3} ${x + s * 1.6} ${y - s * 0.4} ${x} ${y + s} Z`,
    { stroke: c, strokeWidth: 4, roughness: 1.3, seed, fill: c, fillStyle: 'hachure' });
};

const book: IconFn = (_ctx, rc, x, y, s, c, seed) => {
  rc.rectangle(x - s * 0.85, y - s, s * 1.7, s * 2, { stroke: c, strokeWidth: 4, roughness: 1.3, seed });
  line(rc, x, y - s, x, y + s, { color: c, width: 3, seed: seed + 1 });
};

const bulb: IconFn = (_ctx, rc, x, y, s, c, seed) => {
  rc.circle(x, y - s * 0.2, s * 1.3, { stroke: c, strokeWidth: 4, roughness: 1.4, seed });
  line(rc, x - s * 0.35, y + s * 0.5, x + s * 0.35, y + s * 0.5, { color: c, width: 4, seed: seed + 1 });
  line(rc, x - s * 0.3, y + s * 0.75, x + s * 0.3, y + s * 0.75, { color: c, width: 4, seed: seed + 2 });
};

const gear: IconFn = (_ctx, rc, x, y, s, c, seed) => {
  rc.circle(x, y, s * 1.4, { stroke: c, strokeWidth: 4, roughness: 1.3, seed });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    line(rc, x + Math.cos(a) * s * 0.7, y + Math.sin(a) * s * 0.7, x + Math.cos(a) * s * 1, y + Math.sin(a) * s * 1, { color: c, width: 4, seed: seed + i });
  }
};

const phone: IconFn = (_ctx, rc, x, y, s, c, seed) => {
  rc.rectangle(x - s * 0.6, y - s, s * 1.2, s * 2, { stroke: c, strokeWidth: 4, roughness: 1.3, seed });
  line(rc, x - s * 0.25, y - s * 0.7, x + s * 0.25, y - s * 0.7, { color: c, width: 3, seed: seed + 1 });
};

const box: IconFn = (_ctx, rc, x, y, s, c, seed) => {
  rc.rectangle(x - s, y - s * 0.8, s * 2, s * 1.6, { stroke: c, strokeWidth: 4, roughness: 1.3, seed });
  line(rc, x, y - s * 0.8, x, y + s * 0.8, { color: c, width: 3, seed: seed + 1 });
};

const spiral: IconFn = (_ctx, rc, x, y, s, c, seed) => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 40; i++) {
    const a = i * 0.5;
    const r = (i / 40) * s;
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  rc.linearPath(pts, { stroke: c, strokeWidth: 3.5, roughness: 1.2, seed });
};

const question: IconFn = (ctx, _rc, x, y, s, c) => {
  text(ctx, '?', x, y, s * 2.4, { font: 'sans-serif', color: c });
};

const brain: IconFn = (_ctx, rc, x, y, s, c, seed) => {
  const pts: [number, number][] = [];
  const n = 40;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = s * (1 + 0.09 * Math.sin(6 * a));
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r * 0.9]);
  }
  rc.polygon(pts, { stroke: c, strokeWidth: 4, roughness: 1.4, seed });
  line(rc, x, y - s * 0.75, x + s * 0.05, y + s * 0.75, { color: c, width: 3, seed: seed + 1 });
};

export const ICONS: Record<string, IconFn> = {
  sun, moon, cloud, raincloud, droplet, snowflake, bolt, star,
  battery, glass, flame, leaf, heart, book, bulb, gear, phone, box, spiral, question, brain,
};

export function drawIcon(ctx: Ctx2D, rc: RC, name: string, x: number, y: number, s: number, color: string, seed: number): void {
  const fn = ICONS[name] ?? ICONS.box;
  fn(ctx, rc, x, y, s, color, seed);
}
