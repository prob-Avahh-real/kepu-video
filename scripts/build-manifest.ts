// 从 dist/ 现有成片重建 manifest.json（用于补登记/校验）。
// 运行：npm run manifest

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { updateManifest, extractThumb, type ManifestItem } from '../src/export/manifest';
import type { Lang, Ratio } from '../src/types';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const distDir = path.join(ROOT, 'dist');

function duration(file: string): number {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]);
  return parseFloat(r.stdout.toString().trim()) || 3;
}

const items: ManifestItem[] = [];
for (const f of fs.readdirSync(distDir)) {
  const m = f.match(/^(.+)-(zh|en)-(\d+)x(\d+)\.mp4$/);
  if (!m) continue;
  const [, topic, lang, w, h] = m;
  const ratio: Ratio = `${w}x${h}` === '16x9' ? '16:9' : '9:16';
  const srt = `${topic}-${lang}.srt`;
  const thumbName = f.replace(/\.mp4$/, '.jpg');
  const okThumb = extractThumb(path.join(distDir, f), path.join(distDir, 'thumbs', thumbName), duration(path.join(distDir, f)) * 0.55);
  items.push({
    topic, lang: lang as Lang, ratio, file: f,
    srt: fs.existsSync(path.join(distDir, srt)) ? srt : null,
    thumb: okThumb ? `thumbs/${thumbName}` : null,
    bytes: fs.statSync(path.join(distDir, f)).size,
  });
}

updateManifest(distDir, items);
console.log(`[kepu] manifest.json 重建完成，${items.length} 条（含封面）`);
