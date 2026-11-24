// kind: cycle —— 循环流程（水循环/习惯回路）。节点绕圆排布，箭头首尾相连，一个游标循环跑。
// visual.nodes: string[]（图标名）；visual.center: 中心标签。

import type { RC } from '../primitives/sketch';
import { easeOut, lerp, line, stagger, text } from '../primitives/sketch';
import { drawIcon } from '../primitives/icons';
import type { KindCtx } from './types';

function curvedArrow(rc: RC, cx: number, cy: number, R: number, a1: number, a2: number, color: string, seed: number) {
  const p1: [number, number] = [cx + Math.cos(a1) * R, cy + Math.sin(a1) * R];
  const mid = (a1 + a2) / 2;
  const ctrl: [number, number] = [cx + Math.cos(mid) * R * 1.3, cy + Math.sin(mid) * R * 1.3];
  const p2: [number, number] = [cx + Math.cos(a2) * R, cy + Math.sin(a2) * R];
  rc.path(`M ${p1[0]} ${p1[1]} Q ${ctrl[0]} ${ctrl[1]} ${p2[0]} ${p2[1]}`, { stroke: color, strokeWidth: 4, roughness: 1.5, seed });
  const ang = Math.atan2(p2[1] - ctrl[1], p2[0] - ctrl[0]);
  const hl = 16;
  line(rc, p2[0], p2[1], p2[0] - Math.cos(ang - 0.5) * hl, p2[1] - Math.sin(ang - 0.5) * hl, { color, width: 4, seed: seed + 1 });
  line(rc, p2[0], p2[1], p2[0] - Math.cos(ang + 0.5) * hl, p2[1] - Math.sin(ang + 0.5) * hl, { color, width: 4, seed: seed + 2 });
}

export function drawCycle(c: KindCtx): void {
  const { ctx, rc, stage, palette, scene, progress, local } = c;
  const nodes = (scene.visual.nodes as string[] | undefined) ?? ['sun', 'cloud', 'droplet', 'leaf'];
  const n = nodes.length;
  const cx = stage.x + stage.w / 2;
  const cy = stage.y + stage.h / 2;
  const R = Math.min(stage.w, stage.h) * 0.3;
  const step = (Math.PI * 2) / n;
  const start = -Math.PI / 2;

  // 箭头先勾勒
  for (let i = 0; i < n; i++) {
    const t = easeOut(stagger(progress, i, n, 0.5));
    if (t <= 0) continue;
    ctx.save();
    ctx.globalAlpha = t;
    curvedArrow(rc, cx, cy, R * 1.02, start + i * step, start + (i + 1) * step, palette[2], scene.seed + i);
    ctx.restore();
  }

  // 节点
  nodes.forEach((name, i) => {
    const t = easeOut(stagger(progress, i, n, 0.6));
    if (t <= 0) return;
    const a = start + i * step;
    const nx = cx + Math.cos(a) * R;
    const ny = cy + Math.sin(a) * R;
    ctx.save();
    ctx.globalAlpha = t;
    rc.circle(nx, ny, R * 0.62, { stroke: palette[0], strokeWidth: 5, roughness: 1.4, seed: scene.seed + i * 3 });
    drawIcon(ctx, rc, name, nx, ny, R * 0.2, palette[1], scene.seed + i * 5);
    ctx.restore();
  });

  // 中心标签
  if (scene.visual.center) {
    ctx.save();
    ctx.globalAlpha = easeOut((progress - 0.3) / 0.4);
    text(ctx, String(scene.visual.center), cx, cy, R * 0.3, { font: c.fonts.zh, color: palette[0] });
    ctx.restore();
  }

  // 循环游标
  const loop = (local * 0.35) % 1;
  const ang = start + loop * Math.PI * 2;
  const dx = lerp(cx, cx + Math.cos(ang) * R, 1);
  const dy = lerp(cy, cy + Math.sin(ang) * R, 1);
  if (progress > 0.55) {
    ctx.save();
    ctx.globalAlpha = easeOut((progress - 0.55) / 0.3);
    rc.circle(dx, dy, R * 0.16, { stroke: palette[2], strokeWidth: 4, roughness: 1, seed: scene.seed + 77, fill: palette[2], fillStyle: 'solid' });
    ctx.restore();
  }
}
