// 文稿适配器：把简短的 markdown 稿解析成 Shot[]。
// 格式（空行分镜）：
//   @shot <kind> palette=#a,#b,#c visual={"...":...}
//   zh: ...
//   en: ...
//   cap-zh: ...
//   cap-en: ...

import type { Shot, ShotKind, VisualSpec } from '../types';
import { DEFAULT_PALETTE } from '../types';

const KINDS: ShotKind[] = ['metaphor', 'process', 'concept', 'compare', 'cycle', 'number'];

function parsePalette(s: string): [string, string, string] {
  const parts = s.split(',').map((x) => x.trim()).filter(Boolean);
  if (parts.length === 3) return parts as [string, string, string];
  return DEFAULT_PALETTE;
}

export function parseScript(src: string, file = '<inline>'): Shot[] {
  const shots: Shot[] = [];
  let cur: Partial<Shot> | null = null;
  let n = 0;

  const flush = () => {
    if (!cur) return;
    if (!cur.kind || !cur.narration?.zh || !cur.narration?.en) {
      throw new Error(`[adapter] 第 ${n} 个分镜缺少 kind / zh / en：${file}`);
    }
    shots.push({
      id: cur.id ?? `s${n}`,
      kind: cur.kind,
      narration: cur.narration,
      caption: cur.caption ?? {},
      visual: cur.visual ?? {},
      palette: cur.palette ?? DEFAULT_PALETTE,
    });
    cur = null;
  };

  for (const raw of src.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (line.startsWith('#')) continue; // 标题注释

    if (line.startsWith('@shot')) {
      flush();
      n += 1;
      const tokens = line.slice(5).trim().split(/\s+/);
      const kind = tokens[0] as ShotKind;
      if (!KINDS.includes(kind)) {
        throw new Error(`[adapter] 未知 kind "${kind}"，可用: ${KINDS.join(', ')}`);
      }
      cur = { id: `s${n}`, kind, narration: { zh: '', en: '' }, caption: {}, visual: {} };
      const rest = line.slice(5 + tokens[0].length);
      const pal = rest.match(/palette=([^\s]+)/);
      if (pal) cur.palette = parsePalette(pal[1]);
      const vis = rest.match(/visual=(\{.*\})/);
      if (vis) {
        try {
          cur.visual = JSON.parse(vis[1]) as VisualSpec;
        } catch {
          throw new Error(`[adapter] visual JSON 解析失败（第 ${n} 个分镜）: ${vis[1]}`);
        }
      }
      continue;
    }

    if (!cur) throw new Error(`[adapter] 游离字段（不在 @shot 内）: ${line}`);
    const m = line.match(/^(zh|en|cap-zh|cap-en)\s*[:：]\s*(.*)$/);
    if (!m) throw new Error(`[adapter] 无法识别的行: ${line}`);
    const [, key, val] = m;
    if (key === 'zh') cur.narration!.zh = val;
    else if (key === 'en') cur.narration!.en = val;
    else if (key === 'cap-zh') cur.caption!.zh = val;
    else if (key === 'cap-en') cur.caption!.en = val;
  }
  flush();

  if (shots.length === 0) throw new Error(`[adapter] 文稿没有解析出任何分镜: ${file}`);
  return shots;
}
