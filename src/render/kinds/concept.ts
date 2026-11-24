// kind: concept —— 一个核心概念 + 辐射关联。M0 未直接用，作为可扩展示例。

import type { RC } from '../primitives/sketch';
import { easeOut, line, stagger, text } from '../primitives/sketch';
import type { KindCtx } from './types';

function bulb(rc: RC, cx: number, cy: number, R: number, color: string, seed: number) {
  rc.circle(cx, cy - R * 0.2, R * 1.3, { stroke: color, strokeWidth: 6, roughness: 1.4, seed });
  line(rc, cx - R * 0.35, cy + R * 0.5, cx + R * 0.35, cy + R * 0.5, { color, width: 5, seed: seed + 1 });
  line(rc, cx - R * 0.3, cy + R * 0.75, cx + R * 0.3, cy + R * 0.75, { color, width: 5, seed: seed + 2 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    line(rc, cx + Math.cos(a) * R * 0.95, cy - R * 0.2 + Math.sin(a) * R * 0.95,
      cx + Math.cos(a) * R * 1.25, cy - R * 0.2 + Math.sin(a) * R * 1.25, { color, width: 4, seed: seed + 10 + i });
  }
}

export function drawConcept(c: KindCtx): void {
  const { rc, ctx, stage, palette, scene, progress, fonts } = c;
  const cx = stage.x + stage.w / 2;
  const cy = stage.y + stage.h / 2;
  const R = Math.min(stage.w, stage.h) * 0.24;

  ctx.save();
  ctx.globalAlpha = easeOut(progress / 0.3);
  bulb(rc, cx, cy, R, palette[0], scene.seed);
  ctx.restore();

  const labels = (scene.visual.labels as string[] | undefined) ?? ['为什么', '怎么做', '结果'];
  labels.slice(0, 4).forEach((label, i) => {
    const total = Math.min(labels.length, 4);
    const a = (i / total) * Math.PI * 2 - Math.PI / 2;
    const nx = cx + Math.cos(a) * R * 2.6;
    const ny = cy + Math.sin(a) * R * 2.2;
    const t = easeOut(stagger(progress, i, total, 0.5));
    if (t <= 0) return;
    ctx.save();
    ctx.globalAlpha = t;
    line(rc, cx + Math.cos(a) * R * 1.2, cy + Math.sin(a) * R * 1.0, nx, ny, { color: palette[2], width: 3.5, seed: scene.seed + i });
    rc.circle(nx, ny, R * 0.7, { stroke: palette[1], strokeWidth: 4, roughness: 1.4, seed: scene.seed + i + 5 });
    text(ctx, label, nx, ny, R * 0.32, { font: fonts.zh, color: palette[0] });
    ctx.restore();
  });
}
