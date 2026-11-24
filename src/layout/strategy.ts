// 布局策略：把「与画幅无关」的内容映射到 16:9 / 9:16 的安全区与字号。
// 新增画幅 = 在此加一个分支，渲染逻辑不变。

import type { Dims, Ratio, Stage } from '../types';
import { FPS, RATIO_DIMS } from '../types';

export interface Layout {
  dims: Dims;
  stage: Stage;
  caption: { y: number; maxW: number; zhSize: number; enSize: number };
}

export function makeDims(ratio: Ratio): Dims {
  const { W, H } = RATIO_DIMS[ratio];
  return { W, H, fps: FPS, ratio };
}

export function layoutFor(ratio: Ratio): Layout {
  const dims = makeDims(ratio);
  const { W, H } = dims;
  const short = Math.min(W, H);

  if (ratio === '16:9') {
    const stage: Stage = {
      x: W * 0.06, y: H * 0.06, w: W * 0.88, h: H * 0.70, vertical: false,
    };
    return {
      dims,
      stage,
      caption: { y: H * 0.90, maxW: W * 0.82, zhSize: Math.round(short * 0.062), enSize: Math.round(short * 0.038) },
    };
  }

  const stage: Stage = {
    x: W * 0.08, y: H * 0.12, w: W * 0.84, h: H * 0.50, vertical: true,
  };
  return {
    dims,
    stage,
    caption: { y: H * 0.80, maxW: W * 0.84, zhSize: Math.round(short * 0.058), enSize: Math.round(short * 0.040) },
  };
}
