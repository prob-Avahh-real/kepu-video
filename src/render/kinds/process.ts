// kind: process —— 表现「一件事如何发生」的动线。
// M0 用途：sortBooks（记忆归位）/ flush（冲刷代谢垃圾）。

import type { RC } from '../primitives/sketch';
import { arrow, clamp01, easeInOut, easeOut, lerp, line, stagger } from '../primitives/sketch';
import { drawIcon } from '../primitives/icons';
import type { KindCtx } from './types';

function wavyLine(rc: RC, x0: number, x1: number, y: number, amp: number, color: string, seed: number, width = 4) {
  const pts: [number, number][] = [];
  for (let x = x0; x <= x1; x += (x1 - x0) / 40) {
    pts.push([x, y + Math.sin((x - x0) * 0.02) * amp]);
  }
  rc.linearPath(pts, { stroke: color, strokeWidth: width, roughness: 1.5, seed });
}

function sortBooks(c: KindCtx): void {
  const { rc, stage, palette, scene, progress } = c;
  const count = Number(scene.visual.books ?? 8);
  const shelves = Number(scene.visual.shelves ?? 3);

  const shelfX = stage.x + stage.w * 0.5;
  const shelfW = stage.w * 0.46;
  const shelfTop = stage.y + stage.h * 0.16;
  const shelfH = stage.h * 0.68;
  const rowH = shelfH / shelves;

  // 书架框（先出现）
  const frameIn = easeOut(progress / 0.2);
  c.ctx.save();
  c.ctx.globalAlpha = frameIn;
  rc.rectangle(shelfX, shelfTop, shelfW, shelfH, { stroke: palette[0], strokeWidth: 5, roughness: 1.4, seed: scene.seed });
  for (let i = 1; i < shelves; i++) {
    line(rc, shelfX, shelfTop + i * rowH, shelfX + shelfW, shelfTop + i * rowH, { color: palette[0], width: 4, seed: scene.seed + i });
  }
  c.ctx.restore();

  const perRow = Math.ceil(count / shelves);
  const colW = shelfW / perRow;
  const bookW = colW * 0.62;
  const bookH = rowH * 0.6;

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const slotX = shelfX + colW * (col + 0.5);
    const slotY = shelfTop + row * rowH + rowH * 0.84;

    const startX = stage.x + stage.w * 0.16 + Math.sin(i * 2.3) * stage.w * 0.09;
    const startY = stage.y + stage.h * 0.5 + Math.cos(i * 1.7) * stage.h * 0.26;
    const startA = Math.sin(i * 3.1) * 0.6;

    const t = easeInOut(stagger(progress, i, count, 0.8));
    const x = lerp(startX, slotX, t);
    const y = lerp(startY, slotY, t) - Math.sin(t * Math.PI) * stage.h * 0.26;
    const a = lerp(startA, 0, t);
    if (t <= 0) continue;

    const color = palette[(i % 2) + 1] ?? palette[1];
    c.ctx.save();
    c.ctx.translate(x, y);
    c.ctx.rotate(a);
    rc.rectangle(-bookW / 2, -bookH, bookW, bookH, {
      stroke: color, strokeWidth: 3.5, fill: color, fillStyle: 'hachure', seed: scene.seed + i * 5,
    });
    c.ctx.restore();
  }

  // 归位方向箭头
  if (progress > 0.1) {
    c.ctx.save();
    c.ctx.globalAlpha = easeOut((progress - 0.1) / 0.3);
    arrow(rc, stage.x + stage.w * 0.2, stage.y + stage.h * 0.85, stage.x + stage.w * 0.44, stage.y + stage.h * 0.85, { color: palette[2], width: 5, seed: scene.seed + 42 });
    c.ctx.restore();
  }
}

function flush(c: KindCtx): void {
  const { rc, stage, palette, scene, progress, local } = c;
  const count = Number(scene.visual.debris ?? 7);

  const y0 = stage.y + stage.h * 0.42;
  const y1 = stage.y + stage.h * 0.72;
  const x0 = stage.x + stage.w * 0.05;
  const x1 = stage.x + stage.w * 0.95;

  // 管道（上下两条波线）
  wavyLine(rc, x0, x1, y0, stage.h * 0.03, palette[0], scene.seed, 5);
  wavyLine(rc, x0, x1, y1, stage.h * 0.03, palette[0], scene.seed + 1, 5);

  // 被冲走的垃圾
  for (let i = 0; i < count; i++) {
    const phase = (progress + i / count) % 1;
    const x = lerp(x0 + stage.w * 0.05, x1 - stage.w * 0.05, clamp01(phase * 1.1));
    const y = lerp(y0, y1, 0.5) + Math.sin(local * 3 + i * 1.7) * stage.h * 0.06 + (i % 2 ? 1 : -1) * stage.h * 0.05;
    const alpha = phase > 0.85 ? (1 - phase) / 0.15 : 1;
    c.ctx.save();
    c.ctx.globalAlpha = alpha;
    const s = stage.h * 0.035;
    if (i % 3 === 0) rc.circle(x, y, s * 2, { stroke: palette[2], strokeWidth: 3.5, seed: scene.seed + i });
    else if (i % 3 === 1) rc.rectangle(x - s, y - s, s * 2, s * 2, { stroke: palette[2], strokeWidth: 3.5, seed: scene.seed + i });
    else rc.polygon([[x, y - s], [x + s, y], [x, y + s], [x - s, y]], { stroke: palette[2], strokeWidth: 3.5, seed: scene.seed + i });
    c.ctx.restore();
  }

  // 流向箭头
  c.ctx.save();
  c.ctx.globalAlpha = easeOut(progress / 0.3);
  arrow(rc, x0 + stage.w * 0.1, lerp(y0, y1, 0.5), x0 + stage.w * 0.32, lerp(y0, y1, 0.5), { color: palette[1], width: 6, seed: scene.seed + 7 });
  c.ctx.restore();

  // 出水后的「干净」闪光
  const clean = easeOut((progress - 0.45) / 0.5);
  if (clean > 0) {
    c.ctx.save();
    c.ctx.globalAlpha = clean;
    const fx = x1 - stage.w * 0.06;
    const fy = lerp(y0, y1, 0.5);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      const r = stage.h * 0.05 * (0.6 + clean);
      line(rc, fx + Math.cos(a) * r, fy + Math.sin(a) * r, fx + Math.cos(a) * r * 1.6, fy + Math.sin(a) * r * 1.6, { color: palette[1], width: 4, seed: scene.seed + 20 + k });
    }
    c.ctx.restore();
  }
}

export function drawProcess(c: KindCtx): void {
  const motif = String(c.scene.visual.motif ?? 'flush');
  if (motif === 'sortBooks') return sortBooks(c);
  if (motif === 'evaporate') return evaporate(c);
  if (motif === 'rainfall') return rainfall(c);
  return flush(c);
}

// 太阳晒水 → 水蒸气上升
function evaporate(c: KindCtx): void {
  const { ctx, rc, stage, palette, scene, progress, local } = c;
  const sunX = stage.x + stage.w * 0.18;
  const sunY = stage.y + stage.h * 0.2;
  const waterY = stage.y + stage.h * 0.82;

  drawIcon(ctx, rc, 'sun', sunX, sunY, stage.h * 0.11, palette[2], scene.seed);
  // 水面
  wavyLine(rc, stage.x + stage.w * 0.05, stage.x + stage.w * 0.95, waterY, stage.h * 0.02, palette[0], scene.seed + 1, 5);
  wavyLine(rc, stage.x + stage.w * 0.05, stage.x + stage.w * 0.95, waterY + stage.h * 0.05, stage.h * 0.02, palette[0], scene.seed + 2, 4);

  // 上升的水汽
  const count = 6;
  for (let i = 0; i < count; i++) {
    const t = stagger(progress, i, count, 0.8);
    if (t <= 0) continue;
    const x = stage.x + stage.w * (0.35 + i * 0.1);
    const y = lerp(waterY, sunY + stage.h * 0.12, easeOut(t)) + Math.sin(local * 3 + i) * 6;
    ctx.save();
    ctx.globalAlpha = easeOut(t) * (t > 0.9 ? (1 - t) * 10 : 1);
    drawIcon(ctx, rc, 'droplet', x, y, stage.h * 0.03, palette[1], scene.seed + i * 4);
    ctx.restore();
  }
  // 上升大箭头
  ctx.save();
  ctx.globalAlpha = easeOut(progress / 0.3);
  arrow(rc, stage.x + stage.w * 0.6, waterY - stage.h * 0.02, stage.x + stage.w * 0.6, sunY + stage.h * 0.16, { color: palette[2], width: 5, seed: scene.seed + 9 });
  ctx.restore();
}

// 云里的水珠聚集、落下
function rainfall(c: KindCtx): void {
  const { ctx, rc, stage, palette, scene, progress, local } = c;
  const cloudX = stage.x + stage.w / 2;
  const cloudY = stage.y + stage.h * 0.22;
  const ground = stage.y + stage.h * 0.92;

  drawIcon(ctx, rc, 'cloud', cloudX, cloudY, stage.h * 0.13, palette[0], scene.seed);

  const count = 7;
  for (let i = 0; i < count; i++) {
    const phase = (local * 0.6 + i / count) % 1;
    const x = cloudX - stage.w * 0.18 + (i * stage.w * 0.36) / Math.max(count - 1, 1);
    const y = lerp(cloudY + stage.h * 0.06, ground, clamp01(phase * 1.05));
    const alpha = phase > 0.88 ? (1 - phase) / 0.12 : 1;
    ctx.save();
    ctx.globalAlpha = easeOut(progress / 0.25) * alpha;
    drawIcon(ctx, rc, 'droplet', x, y, stage.h * 0.03, palette[1], scene.seed + i * 3);
    ctx.restore();
  }
  // 积水线
  ctx.save();
  ctx.globalAlpha = easeOut((progress - 0.3) / 0.5);
  wavyLine(rc, stage.x + stage.w * 0.1, stage.x + stage.w * 0.9, ground, stage.h * 0.02, palette[2], scene.seed + 5, 5);
  ctx.restore();
}
