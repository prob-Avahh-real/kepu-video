// 会动的小人：简笔豆形人，供 sparingly 使用（引入/点题/收尾）。
// 姿态驱动：pose 决定手臂/腿的端点；t 做轻微呼吸/摆动，避免僵死。

import type { Ctx2D } from '../ctx';
import type { RC } from './sketch';
import { line, text } from './sketch';

export type Pose = 'stand' | 'point' | 'shrug' | 'sleep' | 'cheer' | 'think' | 'walk';

export function drawCharacter(
  ctx: Ctx2D, rc: RC,
  x: number, y: number, h: number,
  pose: Pose, color: string, seed: number, t = 0,
): void {
  const bob = Math.sin(t * 2.4) * h * 0.012;
  const headR = h * 0.17;
  const headY = y - h + headR + bob;
  const neckY = headY + headR;
  const hipY = y - h * 0.42 - bob;
  const shoulderY = neckY + h * 0.05;
  const w = color;
  const s = { color: w, width: 5, seed };

  // 头
  rc.circle(x, headY, headR * 2, { stroke: w, strokeWidth: 5, roughness: 1.4, seed });
  // 眼睛 / 表情
  if (pose === 'sleep') {
    line(rc, x - headR * 0.5, headY, x - headR * 0.15, headY, s);
    line(rc, x + headR * 0.15, headY, x + headR * 0.5, headY, s);
    text(ctx, 'z', x + headR * 1.4, headY - headR * 1.2, headR * 1.1, { font: 'MarkerFelt, sans-serif', color: w });
    text(ctx, 'z', x + headR * 2.1, headY - headR * 2.0, headR * 0.8, { font: 'MarkerFelt, sans-serif', color: w });
  } else {
    rc.circle(x - headR * 0.35, headY - headR * 0.1, 5, { stroke: w, strokeWidth: 3, seed: seed + 1, fill: w, fillStyle: 'solid' });
    rc.circle(x + headR * 0.35, headY - headR * 0.1, 5, { stroke: w, strokeWidth: 3, seed: seed + 2, fill: w, fillStyle: 'solid' });
    if (pose === 'cheer') {
      rc.path(`M ${x - headR * 0.4} ${headY + headR * 0.35} Q ${x} ${headY + headR * 0.75} ${x + headR * 0.4} ${headY + headR * 0.35}`, { stroke: w, strokeWidth: 3, seed: seed + 3 });
    }
  }

  // 身体
  line(rc, x, neckY, x, hipY, s);

  // 手臂
  const armLen = h * 0.28;
  const arm = (dir: number, angle: number) => {
    const sx = x + dir * h * 0.02;
    return line(rc, sx, shoulderY, sx + Math.cos(angle) * armLen, shoulderY + Math.sin(angle) * armLen, s);
  };
  if (pose === 'cheer') { arm(-1, -Math.PI * 0.72); arm(1, -Math.PI * 0.28); }
  else if (pose === 'point') { arm(-1, Math.PI * 0.75); arm(1, -0.15 + Math.sin(t * 3) * 0.05); }
  else if (pose === 'shrug') { arm(-1, -Math.PI * 0.62); arm(1, -Math.PI * 0.38); }
  else if (pose === 'think') { arm(-1, Math.PI * 0.85); arm(1, -Math.PI * 0.55); }
  else if (pose === 'sleep') { arm(-1, Math.PI * 0.6); arm(1, Math.PI * 0.4); }
  else if (pose === 'walk') { arm(-1, Math.PI * 0.5 + Math.sin(t * 4) * 0.5); arm(1, Math.PI * 0.5 - Math.sin(t * 4) * 0.5); }
  else { arm(-1, Math.PI * 0.58); arm(1, Math.PI * 0.42); }

  // 腿
  const legLen = h * 0.4;
  if (pose === 'walk') {
    line(rc, x, hipY, x - legLen * 0.35 + Math.sin(t * 4) * legLen * 0.3, y, s);
    line(rc, x, hipY, x + legLen * 0.35 - Math.sin(t * 4) * legLen * 0.3, y, s);
  } else {
    line(rc, x, hipY, x - legLen * 0.3, y, s);
    line(rc, x, hipY, x + legLen * 0.3, y, s);
  }
}
