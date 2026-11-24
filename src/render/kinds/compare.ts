// kind: compare —— 左右/上下对比。M0 用途：没睡（钝）vs 睡饱（清醒）。
// 用「灯泡亮度 + 脑电波形态」表达，不需要角色。

import type { Ctx2D } from '../ctx';
import type { RC } from '../primitives/sketch';
import { easeOut, line, stagger } from '../primitives/sketch';
import type { KindCtx } from './types';

const DIM = '#9a9086';

function bulb(ctx: Ctx2D, rc: RC, cx: number, cy: number, R: number, color: string, bright: number, seed: number) {
  ctx.save();
  ctx.globalAlpha = 0.45 + bright * 0.55;
  rc.circle(cx, cy - R * 0.15, R * 1.25, { stroke: color, strokeWidth: 6, roughness: 1.4, seed });
  line(rc, cx - R * 0.32, cy + R * 0.55, cx + R * 0.32, cy + R * 0.55, { color, width: 5, seed: seed + 1 });
  line(rc, cx - R * 0.28, cy + R * 0.78, cx + R * 0.28, cy + R * 0.78, { color, width: 5, seed: seed + 2 });
  const rays = Math.round(2 + bright * 5);
  for (let i = 0; i < rays; i++) {
    const a = (i / Math.max(rays, 1)) * Math.PI * 2 - Math.PI / 2;
    line(rc, cx + Math.cos(a) * R * 0.92, cy - R * 0.15 + Math.sin(a) * R * 0.92,
      cx + Math.cos(a) * R * 1.3, cy - R * 0.15 + Math.sin(a) * R * 1.3, { color, width: 4, seed: seed + 10 + i });
  }
  ctx.restore();
}

// 脑电波：tired=平缓钝波；rested=高频尖峰
function brainwave(rc: RC, x0: number, x1: number, y: number, w: number, h: number, lively: boolean, color: string, seed: number) {
  const pts: [number, number][] = [];
  const n = 60;
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const p = (i / n) * Math.PI * 2 * (lively ? 6 : 2);
    const spike = lively ? Math.pow(Math.abs(Math.sin(p)), 0.4) * Math.sign(Math.sin(p)) : Math.sin(p) * 0.4;
    pts.push([x, y - spike * h * 0.5]);
  }
  rc.linearPath(pts, { stroke: color, strokeWidth: w, roughness: 1.2, seed });
}

export function drawCompare(c: KindCtx): void {
  const { rc, stage, palette, scene, progress, local } = c;
  const vertical = stage.vertical;

  const panels = vertical
    ? [
        { x: stage.x, y: stage.y, w: stage.w, h: stage.h * 0.46 },
        { x: stage.x, y: stage.y + stage.h * 0.54, w: stage.w, h: stage.h * 0.46 },
      ]
    : [
        { x: stage.x, y: stage.y, w: stage.w * 0.46, h: stage.h },
        { x: stage.x + stage.w * 0.54, y: stage.y, w: stage.w * 0.46, h: stage.h },
      ];

  // 中间分隔线
  rc.line(
    vertical ? stage.x : stage.x + stage.w * 0.5,
    vertical ? stage.y + stage.h * 0.5 : stage.y + stage.h * 0.08,
    vertical ? stage.x + stage.w : stage.x + stage.w * 0.5,
    vertical ? stage.y + stage.h * 0.5 : stage.y + stage.h * 0.92,
    { stroke: palette[2], strokeWidth: 3, roughness: 1.6, seed: scene.seed + 3 },
  );

  const specs = [
    { left: String(scene.visual.left ?? 'tired'), color: DIM, lively: false, bright: 0.0 },
    { left: String(scene.visual.right ?? 'rested'), color: palette[0], lively: true, bright: 1.0 },
  ];

  panels.forEach((p, i) => {
    const t = easeOut(stagger(progress, i, 2, 0.6));
    if (t <= 0) return;
    const s = specs[i];
    const R = Math.min(p.w, p.h) * 0.22;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h * 0.36;
    c.ctx.save();
    c.ctx.globalAlpha = t;
    const flicker = s.lively ? 1 : 0.6 + Math.sin(local * 9) * 0.4;
    bulb(c.ctx, rc, cx, cy, R, s.color, s.bright * flicker, scene.seed + i * 13);
    brainwave(rc, p.x + p.w * 0.12, p.x + p.w * 0.88, p.y + p.h * 0.84, 4.5, p.h * 0.3, s.lively, s.color, scene.seed + i * 5);
    c.ctx.restore();
  });
}
