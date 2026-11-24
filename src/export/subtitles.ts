// 字幕导出：SRT（中英双语，中文在上、英文在下）。与画幅无关，按语种各出一份。

import fs from 'node:fs';
import type { Lang, SceneSpec } from '../types';

const p2 = (n: number) => String(n).padStart(2, '0');
const p3 = (n: number) => String(n).padStart(3, '0');

function ts(sec: number): string {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  const ms = Math.round((s - Math.floor(s)) * 1000);
  return `${p2(h)}:${p2(m)}:${p2(ss)},${p3(ms)}`;
}

export function writeSrt(scenes: SceneSpec[], lang: Lang, outFile: string): void {
  const out: string[] = [];
  let n = 0;
  for (const sc of scenes) {
    const other = lang === 'zh' ? sc.narration.en : sc.narration.zh;
    const cues = sc.cues.length
      ? sc.cues
      : [{ start: sc.startTime, end: sc.endTime, text: sc.narration[lang] }];
    cues.forEach((c, i) => {
      n += 1;
      out.push(String(n));
      out.push(`${ts(c.start)} --> ${ts(c.end)}`);
      out.push(c.text);
      if (other && i === 0) out.push(other); // 另一语种整句只在首条出现，避免重复
      out.push('');
    });
  }
  fs.writeFileSync(outFile, out.join('\n'), 'utf8');
}
