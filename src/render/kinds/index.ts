// kind 注册表：新增一种镜头 = 在此登记一行（核心循环不变）。

import type { KindRegistry } from './types';
import { drawCompare } from './compare';
import { drawConcept } from './concept';
import { drawCycle } from './cycle';
import { drawMetaphor } from './metaphor';
import { drawNumber } from './number';
import { drawProcess } from './process';

export const KINDS: KindRegistry = {
  metaphor: drawMetaphor,
  process: drawProcess,
  concept: drawConcept,
  compare: drawCompare,
  cycle: drawCycle,
  number: drawNumber,
};
