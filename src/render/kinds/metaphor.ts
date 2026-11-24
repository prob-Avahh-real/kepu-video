// kind: metaphor —— 用一个中心「隐喻图标」承载抽象概念，周围逐步冒出象征物。
// M0 用途：白天的大脑被杂物塞满（motif=clutter）。

import type { Ctx2D } from '../ctx';
import type { RC } from '../primitives/sketch';
import { easeOut, lerp, line, polygon, rect, stagger, text } from '../primitives/sketch';
import { drawIcon } from '../primitives/icons';
import { drawCharacter } from '../primitives/character';
import type { KindCtx } from './types';

function brainBlob(rc: RC, cx: number, cy: number, R: number, color: string, seed: number, pulse: number) {
  const pts: [number, number][] = [];
  const n = 48;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = R * (1 + 0.09 * Math.sin(6 * a) + pulse * 0.03);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9]);
  }
  rc.polygon(pts, { stroke: color, strokeWidth: 6, roughness: 1.4, seed });
  // 脑沟
  const folds: [number, number][][] = [
    [[cx - R * 0.1, cy - R * 0.6], [cx - R * 0.25, cy], [cx - R * 0.05, cy + R * 0.35], [cx - R * 0.2, cy + R * 0.7]],
    [[cx + R * 0.15, cy - R * 0.55], [cx + R * 0.3, cy - R * 0.1], [cx + R * 0.1, cy + R * 0.3]],
    [[cx, cy - R * 0.75], [cx + R * 0.05, cy], [cx - R * 0.05, cy + R * 0.75]],
  ];
  folds.forEach((f, i) => rc.linearPath(f, { stroke: color, strokeWidth: 4, roughness: 1.8, seed: seed + i + 1 }));
}

function gear(rc: RC, x: number, y: number, s: number, color: string, seed: number) {
  rc.circle(x, y, s * 1.5, { stroke: color, strokeWidth: 4, roughness: 1.3, seed });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    line(rc, x + Math.cos(a) * s * 0.75, y + Math.sin(a) * s * 0.75, x + Math.cos(a) * s * 1.05, y + Math.sin(a) * s * 1.05, { color, width: 4, seed: seed + i });
  }
  rc.circle(x, y, s * 0.45, { stroke: color, strokeWidth: 4, roughness: 1.2, seed: seed + 99 });
}

function box(rc: RC, x: number, y: number, s: number, color: string, seed: number) {
  rect(rc, x - s, y - s * 0.7, s * 2, s * 1.4, { color, width: 4, seed });
  line(rc, x, y - s * 0.7, x, y + s * 0.7, { color, width: 3, seed: seed + 1 });
}

function spiral(rc: RC, x: number, y: number, s: number, color: string, seed: number) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 40; i++) {
    const a = i * 0.5;
    const r = (i / 40) * s;
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  rc.linearPath(pts, { stroke: color, strokeWidth: 3.5, roughness: 1.2, seed });
}

function bolt(rc: RC, x: number, y: number, s: number, color: string, seed: number) {
  polygon(rc, [
    [x - s * 0.3, y - s], [x + s * 0.4, y - s], [x + s * 0.05, y - s * 0.1],
    [x + s * 0.55, y - s * 0.1], [x - s * 0.45, y + s], [x - s * 0.05, y + s * 0.15], [x - s * 0.55, y + s * 0.15],
  ], { color, width: 3.5, fill: color, fillStyle: 'hachure', seed });
}

function phone(rc: RC, x: number, y: number, s: number, color: string, seed: number) {
  rc.rectangle(x - s * 0.55, y - s, s * 1.1, s * 2, { stroke: color, strokeWidth: 4, roughness: 1.3, seed });
  line(rc, x - s * 0.25, y - s * 0.75, x + s * 0.25, y - s * 0.75, { color, width: 3, seed: seed + 1 });
}

function question(ctx: Ctx2D, x: number, y: number, s: number, color: string, font: string) {
  text(ctx, '?', x, y, s * 2.4, { font, color });
}

const ITEMS = ['gear', 'box', 'question', 'spiral', 'bolt', 'phone', 'star', 'box'] as const;

export function drawMetaphor(c: KindCtx): void {
  const { rc, ctx, stage, palette, scene, progress, local, fonts } = c;
  const motif = String(scene.visual.motif ?? 'clutter');
  const cx = stage.x + stage.w / 2;
  const cy = stage.y + stage.h / 2;
  const R = Math.min(stage.w, stage.h) * 0.27;
  const pulse = Math.sin(local * 2.2) * 0.5 + 0.5;

  if (motif === 'clutter') {
    // 中央大脑（先出现）
    const brainIn = easeOut(progress / 0.25);
    ctx.save();
    ctx.globalAlpha = brainIn;
    const br = lerp(R * 0.7, R, brainIn);
    brainBlob(rc, cx, cy, br, palette[0], scene.seed, pulse);
    ctx.restore();

    // 杂物逐个冒进（带轻微弹入）
    const count = Number(scene.visual.items ?? 8);
    const items = Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + 0.4;
      const rr = R * (1.15 + (i % 3) * 0.18);
      return { x: cx + Math.cos(a) * rr * 1.25, y: cy + Math.sin(a) * rr * 0.95, s: R * 0.22 };
    });
    items.forEach((it, i) => {
      const t = stagger(progress, i, count, 0.55);
      if (t <= 0) return;
      const pop = easeOut(t);
      const scale = pop * (1 + Math.sin(pop * Math.PI) * 0.25);
      const wob = Math.sin(local * 3 + i) * 3;
      const color = palette[(i % 2) + 1] ?? palette[1];
      const kind = ITEMS[i % ITEMS.length];
      ctx.save();
      ctx.translate(it.x, it.y + wob);
      ctx.scale(scale, scale);
      ctx.translate(-it.x, -it.y);
      if (kind === 'gear') gear(rc, it.x, it.y, it.s, color, scene.seed + i * 7);
      else if (kind === 'box') box(rc, it.x, it.y, it.s, color, scene.seed + i * 7);
      else if (kind === 'spiral') spiral(rc, it.x, it.y, it.s, color, scene.seed + i * 7);
      else if (kind === 'bolt') bolt(rc, it.x, it.y, it.s, color, scene.seed + i * 7);
      else if (kind === 'phone') phone(rc, it.x, it.y, it.s, color, scene.seed + i * 7);
      else if (kind === 'question') question(ctx, it.x, it.y, it.s, color, fonts.en);
      else {
        const pts: [number, number][] = [];
        for (let k = 0; k < 5; k++) {
          const aa = (k / 5) * Math.PI * 2 - Math.PI / 2;
          pts.push([it.x + Math.cos(aa) * it.s, it.y + Math.sin(aa) * it.s]);
        }
        polygon(rc, pts, { color, width: 3.5, seed: scene.seed + i * 7 });
      }
      ctx.restore();
    });
    return;
  }

  if (motif === 'sunWater') {
    drawIcon(ctx, rc, 'sun', cx, cy - R * 1.4, R * 0.7, palette[2], scene.seed);
    const wy = cy + R * 1.1;
    for (let w = 0; w < 3; w++) {
      const pts: [number, number][] = [];
      for (let x = cx - R * 2.2; x <= cx + R * 2.2; x += 14) {
        pts.push([x, wy + w * 22 + Math.sin(x * 0.03 + local * 1.5 + w) * 9]);
      }
      rc.linearPath(pts, { stroke: palette[0], strokeWidth: 5 - w, roughness: 1.4, seed: scene.seed + w });
    }
    for (let i = 0; i < 4; i++) {
      const t = easeOut(stagger(progress, i, 4, 0.7));
      if (t <= 0) continue;
      ctx.save();
      ctx.globalAlpha = t * (t > 0.9 ? (1 - t) * 10 : 1);
      drawIcon(ctx, rc, 'droplet', cx - R * 1.3 + i * R * 0.9, lerp(wy, cy - R, t), R * 0.18, palette[1], scene.seed + i);
      ctx.restore();
    }
    return;
  }

  if (motif === 'host') {
    const iconName = String(scene.visual.icon ?? 'bulb');
    drawIcon(ctx, rc, iconName, cx + R * 0.4, cy - R * 0.2, R * 0.75, palette[1], scene.seed);
    ctx.save();
    ctx.globalAlpha = easeOut(progress / 0.4);
    drawCharacter(ctx, rc, cx - R * 1.7, cy + R * 1.7, R * 2.4, 'point', palette[0], scene.seed, local);
    ctx.restore();
    return;
  }

  // 通用兜底：中心图标 + 三个环绕节点（可诊断降级，不崩）
  if (scene.visual.icon) {
    drawIcon(ctx, rc, String(scene.visual.icon), cx, cy, R * 0.8, palette[0], scene.seed);
  } else {
    rc.circle(cx, cy, R, { stroke: palette[0], strokeWidth: 6, roughness: 1.4, seed: scene.seed });
  }
  const labels = ['A', 'B', 'C'];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 - Math.PI / 2 + local * 0.2;
    const nx = cx + Math.cos(a) * R * 1.8;
    const ny = cy + Math.sin(a) * R * 1.8;
    const t = easeOut(stagger(progress, i, 3, 0.5));
    ctx.save();
    ctx.globalAlpha = t;
    rc.circle(nx, ny, R * 0.5, { stroke: palette[1], strokeWidth: 4, roughness: 1.4, seed: scene.seed + i });
    text(ctx, labels[i], nx, ny, R * 0.4, { font: fonts.en, color: palette[2] });
    line(rc, cx + Math.cos(a) * R * 0.5, cy + Math.sin(a) * R * 0.5, nx, ny, { color: palette[2], width: 3, seed: scene.seed + i + 5 });
    ctx.restore();
  }
}
