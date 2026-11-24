// 旁白合成：edge-tts 生成女声旁白 + 句级时间轴。
// 按分镜逐句合成（shot 边界即精确时间轴），再按语种拼成整轨。
// 桌面端专用（依赖本地 edge-tts / ffmpeg）。

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { AudioTrack, Cue, Lang, Shot, ShotTiming } from '../types';

export const VOICES: Record<Lang, string> = {
  zh: 'zh-CN-XiaoxiaoNeural',
  en: 'en-US-AriaNeural',
};

const SR = 44100;
const CH = 2;
const GAP_SEC = 0.35;

export interface NarrateOptions {
  workDir: string;
  voice?: string;
  gapSec?: number;
}

function run(cmd: string, args: string[]): void {
  const r = spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status !== 0) {
    const err = r.stderr?.toString().trim() || r.error?.message || 'unknown';
    throw new Error(`[tts] ${cmd} 失败 (${r.status}): ${err}`);
  }
}

function probeDuration(file: string): number {
  const r = spawnSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file,
  ]);
  const d = parseFloat(r.stdout.toString().trim());
  if (!Number.isFinite(d)) throw new Error(`[tts] 无法读取时长: ${file}`);
  return d;
}

// 解析 edge-tts 输出的 VTT，得到句级时间轴（相对该片段，秒）。
export function parseVtt(file: string): Cue[] {
  if (!fs.existsSync(file)) return [];
  const raw = fs.readFileSync(file, 'utf8');
  const cues: Cue[] = [];
  const blocks = raw.split(/\n\s*\n/);
  const toSec = (s: string): number | null => {
    const m = s.trim().match(/^(\d+):(\d+):(\d+)[,.](\d+)$/);
    if (!m) return null;
    return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000;
  };
  for (const b of blocks) {
    const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
    const tl = lines.find((l) => l.includes('-->'));
    if (!tl) continue;
    const [a, bb] = tl.split('-->').map((x) => x.trim().split(/\s+/)[0]);
    const start = toSec(a);
    const end = toSec(bb);
    if (start == null || end == null) continue;
    const text = lines.filter((l) => l !== tl && !/^\d+$/.test(l)).join(' ');
    if (text) cues.push({ start, end, text });
  }
  return cues;
}

// 合成单句（带缓存）。返回 mp3/vtt 路径与时长。
function synthClip(text: string, voice: string, outDir: string): { mp3: string; vtt: string; duration: number } {
  const key = crypto.createHash('sha1').update(`${voice}|${text}`).digest('hex').slice(0, 16);
  const mp3 = path.join(outDir, `${key}.mp3`);
  const vtt = path.join(outDir, `${key}.vtt`);
  const meta = path.join(outDir, `${key}.json`);
  if (fs.existsSync(mp3) && fs.existsSync(meta)) {
    const { duration } = JSON.parse(fs.readFileSync(meta, 'utf8')) as { duration: number };
    return { mp3, vtt, duration };
  }
  run('edge-tts', ['--voice', voice, '--text', text, '--write-media', mp3, '--write-subtitles', vtt]);
  if (!fs.existsSync(mp3) || fs.statSync(mp3).size === 0) {
    throw new Error(`[tts] edge-tts 未生成音频（语音=${voice}）`);
  }
  const duration = probeDuration(mp3);
  fs.writeFileSync(meta, JSON.stringify({ duration }));
  return { mp3, vtt, duration };
}

function normalizeWav(src: string, dst: string): void {
  run('ffmpeg', ['-y', '-i', src, '-ar', String(SR), '-ac', String(CH), '-c:a', 'pcm_s16le', dst]);
}

function silenceWav(sec: number, dst: string): void {
  run('ffmpeg', ['-y', '-f', 'lavfi', '-i', `anullsrc=r=${SR}:cl=stereo`, '-t', sec.toFixed(3), '-c:a', 'pcm_s16le', dst]);
}

export function narrate(shots: Shot[], lang: Lang, opts: NarrateOptions): AudioTrack {
  const voice = opts.voice ?? VOICES[lang];
  const gap = opts.gapSec ?? GAP_SEC;
  const ttsDir = path.join(opts.workDir, 'tts');
  const trackDir = path.join(opts.workDir, 'track');
  fs.mkdirSync(ttsDir, { recursive: true });
  fs.mkdirSync(trackDir, { recursive: true });

  const gapWav = path.join(trackDir, `gap-${lang}.wav`);
  silenceWav(gap, gapWav);

  const listParts: string[] = [];
  const timings: ShotTiming[] = [];
  let cursor = 0;

  shots.forEach((shot, i) => {
    const text = shot.narration[lang];
    const { mp3, vtt } = synthClip(text, voice, ttsDir);
    const wav = path.join(trackDir, `${lang}-${shot.id}.wav`);
    normalizeWav(mp3, wav);
    // 以归一化后的 wav 时长为准，保证时间轴与实际音轨一致（避免 mp3/wav 微差累积）
    const duration = probeDuration(wav);

    const start = cursor;
    const end = start + duration;
    const cues: Cue[] = parseVtt(vtt)
      .map((c) => ({ start: start + c.start, end: start + Math.min(c.end, duration), text: c.text }))
      .filter((c) => c.text);
    timings.push({ id: shot.id, start, end, duration, cues });
    listParts.push(wav);
    cursor = end;
    if (i < shots.length - 1) {
      listParts.push(gapWav);
      cursor += gap;
    }
  });

  const listFile = path.join(trackDir, `list-${lang}.txt`);
  fs.writeFileSync(listFile, listParts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'));
  const track = path.join(opts.workDir, `narration-${lang}.wav`);
  run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', track]);

  const duration = probeDuration(track);
  return { lang, file: track, duration, timings };
}
