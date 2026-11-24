// 纸张背景：米白纸底 + 点阵 + 纸纤维 + 轻微暗角。纤维用固定种子预生成，逐帧稳定不闪。

import type { Ctx2D } from './ctx';
import { PAPER } from '../types';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Fiber { x: number; y: number; a: number; len: number }
const FIBERS: Fiber[] = (() => {
  const rnd = mulberry32(20241014);
  return Array.from({ length: 220 }, () => ({
    x: rnd(), y: rnd(), a: rnd() * Math.PI, len: 6 + rnd() * 22,
  }));
})();

export function drawPaper(ctx: Ctx2D, W: number, H: number): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  const step = 54;
  ctx.fillStyle = 'rgba(120,105,85,0.05)';
  for (let y = step; y < H; y += step) {
    for (let x = step; x < W; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.strokeStyle = 'rgba(120,105,85,0.05)';
  ctx.lineWidth = 1;
  for (const f of FIBERS) {
    const x = f.x * W;
    const y = f.y * H;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(f.a) * f.len, y + Math.sin(f.a) * f.len);
    ctx.stroke();
  }

  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, 'rgba(90,70,45,0)');
  vg.addColorStop(1, 'rgba(90,70,45,0.10)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}
