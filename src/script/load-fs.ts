// Node 专用：从文件加载文稿（浏览器端请直接用 parseScript）。

import fs from 'node:fs';
import type { Shot } from '../types';
import { parseScript } from './adapter';

export function loadScript(file: string): Shot[] {
  return parseScript(fs.readFileSync(file, 'utf8'), file);
}
