// 移动端时间轴：设备端无法捕获 Web Speech 音频，因此按文本估时（无旁白音轨）。
// 若用户提供音频文件，则导出时把音频整轨 mux 进 MP4。

import type { AudioTrack, Cue, Lang, Shot } from '../src/types';

// 估算语速（去空白后的字符/秒）
const CPS: Record<Lang, number> = { zh: 5.2, en: 13 };
const MIN_SHOT = 1.8;
const GAP = 0.35;

// 按标点切句，按字符占比分配时长，得到与旁白句对齐的字幕 cues。
function splitCues(text: string, start: number, dur: number): Cue[] {
  const parts = text.split(/(?<=[，。！？；：、,.!?;:])/).map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return [{ start, end: start + dur, text }];
  const weights = parts.map((p) => p.replace(/\s/g, '').length || 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let t = start;
  return parts.map((p, i) => {
    const d = (dur * weights[i]) / total;
    const cue = { start: t, end: t + d, text: p };
    t += d;
    return cue;
  });
}

export function buildTimeline(shots: Shot[], lang: Lang): AudioTrack {
  const cps = CPS[lang];
  let cursor = 0;
  const timings = shots.map((s, i) => {
    const text = s.narration[lang];
    const dur = Math.max(MIN_SHOT, text.replace(/\s/g, '').length / cps);
    const start = cursor;
    const end = start + dur;
    const timing = { id: s.id, start, end, duration: dur, cues: splitCues(text, start, dur) };
    cursor = end;
    if (i < shots.length - 1) cursor += GAP;
    return timing;
  });
  return { lang, file: '', duration: cursor, timings };
}
