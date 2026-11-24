// 逐帧渲染（纯函数：scenes + t + env → 绘制），画幅由 layout 决定。

import type { Ctx2D } from './ctx';
import type { Lang, SceneSpec } from '../types';
import type { Layout } from '../layout/strategy';
import { drawPaper } from './paper';
import { KINDS } from './kinds';
import { wrapText } from './primitives/sketch';
import type { FontSet } from '../types';
import type { RC } from './primitives/sketch';

export interface RenderEnv {
  ctx: Ctx2D;
  rc: RC;
  fonts: FontSet;
  layout: Layout;
  lang: Lang;
}

export function findSceneAt(scenes: SceneSpec[], t: number): { scene: SceneSpec; index: number } {
  for (let i = 0; i < scenes.length; i++) {
    if (t >= scenes[i].startTime && t < scenes[i].endTime) return { scene: scenes[i], index: i };
  }
  return { scene: scenes[scenes.length - 1], index: scenes.length - 1 };
}

// 当前应显示的句级字幕（取 start <= t 的最后一条）
function currentCue(scene: SceneSpec, t: number): string | null {
  let found: string | null = null;
  for (const c of scene.cues) {
    if (c.start <= t) found = c.text;
    else break;
  }
  return found;
}

function drawLines(
  ctx: RenderEnv['ctx'], str: string, cx: number, topY: number, maxW: number,
  size: number, font: string, color: string,
): number {
  ctx.save();
  ctx.font = `bold ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const lines = wrapText(ctx, str, maxW);
  lines.forEach((l, i) => ctx.fillText(l, cx, topY + i * size * 1.18));
  ctx.restore();
  return lines.length;
}

function drawCaption(env: RenderEnv, scene: SceneSpec, t: number): void {
  const { ctx, fonts, layout, lang } = env;
  const { caption, dims } = layout;
  const W = dims.W;

  // 主字幕 = 当前句（与旁白同步）；副字幕 = 另一语种整句
  const main = currentCue(scene, t) ?? scene.narration[lang];
  const other = lang === 'zh' ? scene.narration.en : scene.narration.zh;
  const mainFont = lang === 'zh' ? fonts.zh : fonts.en;
  const otherFont = lang === 'zh' ? fonts.en : fonts.zh;

  const mainSize = caption.zhSize;
  const otherSize = caption.enSize;
  ctx.save();
  ctx.font = `bold ${mainSize}px ${mainFont}`;
  const mainLines = wrapText(ctx, main, caption.maxW).length;
  ctx.restore();
  ctx.save();
  ctx.font = `bold ${otherSize}px ${otherFont}`;
  const otherLines = other ? wrapText(ctx, other, caption.maxW).length : 0;
  ctx.restore();

  const mainH = mainLines * mainSize * 1.18;
  const otherH = otherLines * otherSize * 1.18;
  const total = mainH + (other ? otherH + otherSize * 0.35 : 0);
  const top = caption.y - total / 2;

  const used = drawLines(ctx, main, W / 2, top, caption.maxW, mainSize, mainFont, '#2f271e');
  if (other) {
    drawLines(ctx, other, W / 2, top + used * mainSize * 1.18 + otherSize * 0.35, caption.maxW, otherSize, otherFont, '#8a7f70');
  }

  // 顶部小标题 = 作者短标签（与旁白无关，仅作结构提示）
  const header = scene.caption[lang];
  if (header) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    drawLines(ctx, header, W / 2, dims.H * 0.045, caption.maxW, Math.round(otherSize * 0.95), lang === 'zh' ? fonts.zh : fonts.en, '#a89b88');
    ctx.restore();
  }
}

function drawProgress(env: RenderEnv, scenes: SceneSpec[], t: number): void {
  const { ctx, layout } = env;
  const total = scenes[scenes.length - 1].endTime;
  const W = layout.dims.W;
  const H = layout.dims.H;
  const p = Math.min(1, t / total);
  const y = H * 0.965;
  const x0 = W * 0.12;
  const w = W * 0.76;
  ctx.save();
  ctx.fillStyle = 'rgba(60,50,40,0.18)';
  ctx.fillRect(x0, y, w, 4);
  ctx.fillStyle = '#e4572e';
  ctx.fillRect(x0, y, w * p, 4);
  scenes.forEach((s) => {
    const cx = x0 + (w * s.startTime) / total;
    ctx.beginPath();
    ctx.fillStyle = t >= s.endTime ? '#e4572e' : 'rgba(60,50,40,0.25)';
    ctx.arc(cx, y + 2, 5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

// 画一帧（ctx 需带 W×H 尺寸）。返回当前分镜序号，便于调用方记录。
export function renderFrame(env: RenderEnv, scenes: SceneSpec[], t: number): number {
  const { ctx, rc, fonts, layout } = env;
  const { W, H } = layout.dims;

  drawPaper(ctx, W, H);

  const { scene, index } = findSceneAt(scenes, t);
  const local = t - scene.startTime;
  const progress = Math.min(1, local / Math.max(scene.duration, 0.001));

  const draw = KINDS[scene.kind] ?? KINDS.concept!;
  ctx.save();
  draw({ ctx, rc, scene, stage: layout.stage, palette: scene.palette, fonts, local, progress });
  ctx.restore();

  drawCaption(env, scene, t);
  drawProgress(env, scenes, t);
  return index;
}
