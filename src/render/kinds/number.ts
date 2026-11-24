// kind: number —— 数量/对比。支持单值计数与左右对比两种。
// 单值：visual={value,unit,label}；对比：visual={left:{label,value,unit},right:{...}}。

import { clamp01, easeOut, text } from '../primitives/sketch';
import { drawIcon } from '../primitives/icons';
import type { KindCtx } from './types';

interface Side { label?: string; value: number; unit?: string }

function countUp(value: number, progress: number): number {
  return Math.round(value * clamp01(progress / 0.6));
}

function drawSide(c: KindCtx, side: Side, cx: number, cy: number, w: number, color: string, seed: number) {
  const { ctx, rc, progress } = c;
  const shown = countUp(side.value, progress);
  const unit = side.unit ?? 'star';
  const numSize = Math.min(w * 0.4, 140);

  text(ctx, String(shown), cx, cy, numSize, { font: c.fonts.en, color, weight: 'bold' });

  // 单位图标：横向铺开、超出换行；封顶 24 个避免爆量（数值本身照实显示）
  const drawIcons = Math.min(shown, 24);
  const perRow = Math.max(1, Math.min(drawIcons, Math.floor(w / 56)));
  const iconS = 16;
  for (let i = 0; i < drawIcons; i++) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const ix = cx - ((Math.min(perRow, drawIcons) - 1) * 52) / 2 + col * 52;
    const iy = cy + numSize * 0.7 + row * 46;
    const t = easeOut(clamp01((progress - 0.5) - i * 0.02));
    if (t <= 0) continue;
    ctx.save();
    ctx.globalAlpha = t;
    drawIcon(ctx, rc, unit, ix, iy, iconS, color, seed + i);
    ctx.restore();
  }

  if (side.label) {
    text(ctx, side.label, cx, cy - numSize * 0.85, Math.min(w * 0.14, 56), { font: c.fonts.zh, color });
  }
}

export function drawNumber(c: KindCtx): void {
  const { stage, scene, palette } = c;
  const left = scene.visual.left as Side | undefined;
  const right = scene.visual.right as Side | undefined;

  if (left && right) {
    const cy = stage.y + stage.h * 0.42;
    drawSide(c, left, stage.x + stage.w * 0.27, cy, stage.w * 0.4, palette[0], scene.seed);
    drawSide(c, right, stage.x + stage.w * 0.73, cy, stage.w * 0.4, palette[1], scene.seed + 50);
    return;
  }

  const value = Number(scene.visual.value ?? 3);
  const side: Side = { value, unit: scene.visual.unit as string | undefined, label: scene.visual.label as string | undefined };
  drawSide(c, side, stage.x + stage.w / 2, stage.y + stage.h * 0.42, stage.w * 0.6, palette[0], scene.seed);
}
