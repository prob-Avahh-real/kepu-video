// 验收脚本（Sensor）：对 dist/ 产物做可判定校验，失败即非零退出。
// 运行：npm run acceptance
//
// 校验项：
//  ① 每种 文稿×语言×画幅 的 MP4 存在，分辨率/帧率/音轨正确，帧数≈时长×fps
//  ② SRT 存在，且「主字幕文本序列」与「该语言旁白序列」一致（字幕=配音）
//  ③ manifest.json 条目齐全，文件/缩略图/字幕均存在
//  ④ 缩略图非空

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadScript } from '../src/script/load-fs';
import type { Lang } from '../src/types';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = path.join(ROOT, 'dist');
const FPS = 30;

interface Check { ok: boolean; label: string; detail?: string }
const results: Check[] = [];
const check = (ok: boolean, label: string, detail = '') => results.push({ ok, label, detail });

function ffprobe(args: string[]): string {
  const r = spawnSync('ffprobe', args);
  return r.stdout.toString().trim();
}
const probe = (file: string, entries: string) =>
  ffprobe(['-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', entries, '-of', 'csv=p=0', file]);

// SRT → 主字幕文本序列
function srtMainLines(file: string): string[] {
  const raw = fs.readFileSync(file, 'utf8').trim();
  const blocks = raw.split(/\n\s*\n/);
  const lines: string[] = [];
  for (const b of blocks) {
    const ls = b.split('\n').map((x) => x.trim()).filter(Boolean);
    const ti = ls.findIndex((l) => l.includes('-->'));
    if (ti < 0) continue;
    if (ls[ti + 1]) lines.push(ls[ti + 1]); // 主行（副行为另一语种）
  }
  return lines;
}
const norm = (s: string) => s.replace(/\s+/g, '').replace(/[，。！？、,.!?]/g, '');

const scripts = fs.readdirSync(path.join(ROOT, 'content')).filter((f) => f.endsWith('.md'));
const LANGS: Lang[] = ['zh', 'en'];
const RATIOS: { key: string; W: number; H: number }[] = [
  { key: '16x9', W: 1920, H: 1080 },
  { key: '9x16', W: 1080, H: 1920 },
];

// ① + ②
for (const file of scripts) {
  const base = file.replace(/\.md$/, '');
  const shots = loadScript(path.join(ROOT, 'content', file));
  for (const lang of LANGS) {
    const narrSeq = shots.map((s) => s.narration[lang]);
    const srt = path.join(DIST, `${base}-${lang}.srt`);
    if (!fs.existsSync(srt)) { check(false, `${base}-${lang}: SRT 缺失`); }
    else {
      const main = srtMainLines(srt);
      const a = norm(main.join(''));
      const b = norm(narrSeq.join(''));
      check(a === b, `${base}-${lang}: 字幕=配音`, a === b ? `${main.length} 句` : `字幕(${a.slice(0, 24)}…) ≠ 旁白(${b.slice(0, 24)}…)`);
    }

    for (const r of RATIOS) {
      const mp4 = path.join(DIST, `${base}-${lang}-${r.key}.mp4`);
      if (!fs.existsSync(mp4)) { check(false, `${base}-${lang}-${r.key}: MP4 缺失`); continue; }
      const v = probe(mp4, 'stream=width,height,r_frame_rate,nb_read_frames').split(',');
      const [w, h, fr, frames] = [Number(v[0]), Number(v[1]), v[2], Number(v[3])];
      const dur = Number(ffprobe(['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4]));
      const audio = ffprobe(['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', mp4]);
      const expFrames = Math.round(dur * FPS);
      const dimOK = w === r.W && h === r.H;
      const frOK = fr === `${FPS}/1`;
      const frameOK = Math.abs(frames - expFrames) <= 2;
      const audOK = audio === 'aac';
      check(dimOK, `${base}-${lang}-${r.key}: 分辨率 ${w}x${h}`);
      check(frOK, `${base}-${lang}-${r.key}: 帧率 ${fr}`);
      check(frameOK, `${base}-${lang}-${r.key}: 帧数 ${frames}≈${expFrames}`);
      check(audOK, `${base}-${lang}-${r.key}: 音轨 ${audio}`);
    }
  }
}

// ③ + ④
const manifestFile = path.join(DIST, 'manifest.json');
if (!fs.existsSync(manifestFile)) check(false, 'manifest.json 缺失');
else {
  const items = JSON.parse(fs.readFileSync(manifestFile, 'utf8')) as { file: string; srt: string | null; thumb: string | null }[];
  check(items.length === scripts.length * LANGS.length * RATIOS.length, `manifest 条目数 ${items.length}`);
  for (const it of items) {
    check(fs.existsSync(path.join(DIST, it.file)), `manifest: ${it.file} 存在`);
    if (it.srt) check(fs.existsSync(path.join(DIST, it.srt)), `manifest: ${it.srt} 存在`);
    if (it.thumb) {
      const tp = path.join(DIST, it.thumb);
      check(fs.existsSync(tp) && fs.statSync(tp).size > 2000, `封面 ${it.thumb}`);
    } else check(false, `封面缺失: ${it.file}`);
  }
}

// ④ player
check(fs.existsSync(path.join(ROOT, 'player', 'index.html')), 'player/index.html 存在');

// ⑤ 移动端 / WEB 构建产物
check(fs.existsSync(path.join(ROOT, 'capacitor.config.json')), 'capacitor.config.json 存在');
check(fs.existsSync(path.join(ROOT, 'web', 'index.html')), 'web/index.html 存在');
const wwwDir = path.join(ROOT, 'www');
check(fs.existsSync(path.join(wwwDir, 'index.html')), 'www/index.html 已构建');
const assetsDir = path.join(wwwDir, 'assets');
const jsBundle = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js')) : [];
check(jsBundle.length > 0, `www/assets JS 产物 (${jsBundle.length})`);
check(fs.existsSync(path.join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'public', 'index.html')), 'Android 已同步 web 资源');
check(fs.existsSync(path.join(wwwDir, 'ffmpeg', 'ffmpeg-core.wasm')), '自带 FFmpeg.wasm core（离线）');

// 汇总
const pass = results.filter((r) => r.ok).length;
const fail = results.length - pass;
for (const r of results) if (!r.ok) console.log(`  ✗ ${r.label}${r.detail ? '  — ' + r.detail : ''}`);
console.log(`\n[acceptance] ${pass}/${results.length} 通过${fail ? `，${fail} 失败` : '，全部通过 ✅'}`);
process.exit(fail ? 1 : 0);
