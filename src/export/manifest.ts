// dist/manifest.json：把每次产出的成片登记进去，供播放器读取（按 file 去重合并）。

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { Lang, Ratio } from '../types';

export interface ManifestItem {
  topic: string;
  lang: Lang;
  ratio: Ratio;
  file: string;
  srt: string | null;
  thumb: string | null;
  bytes: number;
}

// 抽取成片一帧作封面（800 内宽），供播放器 poster 使用。
export function extractThumb(videoPath: string, thumbPath: string, atSec: number): boolean {
  fs.mkdirSync(path.dirname(thumbPath), { recursive: true });
  const r = spawnSync('ffmpeg', [
    '-y', '-v', 'error', '-ss', Math.max(0, atSec).toFixed(2), '-i', videoPath,
    '-frames:v', '1', '-vf', 'scale=800:-2', thumbPath,
  ]);
  return r.status === 0 && fs.existsSync(thumbPath);
}

export function updateManifest(distDir: string, items: ManifestItem[]): void {
  const file = path.join(distDir, 'manifest.json');
  let prev: ManifestItem[] = [];
  if (fs.existsSync(file)) {
    try {
      prev = JSON.parse(fs.readFileSync(file, 'utf8')) as ManifestItem[];
    } catch {
      prev = [];
    }
  }
  const map = new Map(prev.map((i) => [i.file, i]));
  for (const it of items) map.set(it.file, it);
  const merged = Array.from(map.values()).sort((a, b) =>
    a.topic.localeCompare(b.topic) || a.lang.localeCompare(b.lang) || a.ratio.localeCompare(b.ratio));
  fs.writeFileSync(file, JSON.stringify(merged, null, 2));
}
