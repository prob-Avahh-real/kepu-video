// 各 kind 策略的共享上下文与注册表类型。

import type { Ctx2D } from '../ctx';
import type { SceneSpec, Stage, ShotKind } from '../../types';
import type { FontSet } from '../../types';
import type { RC } from '../primitives/sketch';

export interface KindCtx {
  ctx: Ctx2D;
  rc: RC;
  scene: SceneSpec;
  stage: Stage;
  palette: [string, string, string];
  fonts: FontSet;
  local: number;
  progress: number;
}

export type KindDraw = (c: KindCtx) => void;

export type KindRegistry = Partial<Record<ShotKind, KindDraw>>;
