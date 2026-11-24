// 移动端 App 主逻辑：选主题/语言/画幅 → 预览 → 导出 MP4。
// 复用共享渲染层（src/render、src/layout、src/story、src/script）。

import rough from 'roughjs';
import { parseScript } from '../src/script/adapter';
import { plan } from '../src/story/planner';
import { layoutFor } from '../src/layout/strategy';
import { renderFrame, type RenderEnv } from '../src/render/renderer';
import type { Lang, Ratio, SceneSpec } from '../src/types';
import { resolveFontsWeb } from './fonts.web';
import { buildTimeline } from './timeline.web';
import { exportVideoWeb, preloadFfmpeg } from './export.web';

import whySleep from '../content/why-sleep.md?raw';
import whyRain from '../content/why-rain.md?raw';

const EPISODES: Record<string, string> = {
  '人为什么要睡觉': whySleep,
  '为什么会下雨': whyRain,
};

const fonts = resolveFontsWeb();
const cv = document.getElementById('cv') as HTMLCanvasElement;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let lang: Lang = 'zh';
let ratio: Ratio = '9:16';
let scenes: SceneSpec[] = [];
let env: RenderEnv;
let raf = 0;
let playing = false;
let audioFile: File | null = null;

function loadEpisode(name: string): void {
  const shots = parseScript(EPISODES[name], name);
  const track = buildTimeline(shots, lang);
  scenes = plan(shots, track);
  const layout = layoutFor(ratio);
  cv.width = layout.dims.W;
  cv.height = layout.dims.H;
  env = { ctx: cv.getContext('2d') as unknown as RenderEnv['ctx'], rc: rough.canvas(cv), fonts, layout, lang };
  drawAt(0);
}

function drawAt(t: number): void {
  renderFrame(env, scenes, Math.min(t, scenes[scenes.length - 1].endTime - 1e-3));
}

function totalDuration(): number {
  return scenes[scenes.length - 1].endTime;
}

function stopPreview(): void {
  playing = false;
  cancelAnimationFrame(raf);
  $('play').textContent = '▶ 预览';
}

function startPreview(): void {
  playing = true;
  $('play').textContent = '⏸ 暂停';
  const start = performance.now();
  const tick = () => {
    if (!playing) return;
    const t = ((performance.now() - start) / 1000) % totalDuration();
    drawAt(t);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

// ---- UI 绑定 ----
const epSel = document.getElementById('episode') as HTMLSelectElement;
for (const name of Object.keys(EPISODES)) {
  const o = document.createElement('option');
  o.value = name; o.textContent = name;
  epSel.append(o);
}
epSel.addEventListener('change', () => { stopPreview(); loadEpisode(epSel.value); });

function bindSeg(id: string, cb: (val: string) => void): void {
  const seg = $(id);
  seg.querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => {
      seg.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      cb((b as HTMLElement).dataset.val!);
    });
  });
}
bindSeg('lang', (v) => { stopPreview(); lang = v as Lang; loadEpisode(epSel.value); });
bindSeg('ratio', (v) => { stopPreview(); ratio = v as Ratio; loadEpisode(epSel.value); });

$('audio').addEventListener('change', (e) => {
  const f = (e.target as HTMLInputElement).files?.[0] ?? null;
  audioFile = f;
  $('audioInfo').textContent = f ? `${f.name}（${(f.size / 1048576).toFixed(1)} MB）` : '可选';
});

$('play').addEventListener('click', () => { playing ? stopPreview() : startPreview(); });

$('export').addEventListener('click', async () => {
  stopPreview();
  const btn = $('export') as HTMLButtonElement;
  btn.disabled = true;
  const prog = $('prog');
  const status = $('status');
  $('dl').style.display = 'none';
  try {
    const blob = await exportVideoWeb({
      scenes, fonts, layout: env.layout, lang, audio: audioFile,
      onProgress: (p) => { prog.style.width = `${p.percent}%`; status.textContent = p.message; },
    });
    const ext = blob.type.includes('webm') ? 'webm' : 'mp4';
    const url = URL.createObjectURL(blob);
    const name = `${epSel.value.replace(/[—·\s]/g, '')}-${lang}-${ratio.replace(':', 'x')}.${ext}`;
    const dl = $('dl') as HTMLAnchorElement;
    dl.href = url; dl.download = name; dl.textContent = `下载 ${name}（${(blob.size / 1048576).toFixed(1)} MB）`;
    dl.style.display = 'inline-block';
    status.textContent = '完成';
    document.title = `EXPORT_OK ${name} ${blob.size}`;
    void fetch(`/__export_ok?name=${encodeURIComponent(name)}&size=${blob.size}`);
  } catch (e) {
    status.textContent = `失败：${(e as Error).message}`;
    document.title = `EXPORT_FAIL ${(e as Error).message}`;
    void fetch('/__export_fail?m=' + encodeURIComponent(String((e as Error).message)));
  } finally {
    btn.disabled = false;
  }
});

loadEpisode(epSel.value);

// 调试/验证钩子：?t=<秒> 定位帧；?preview=1 自动播放
const q = new URLSearchParams(location.search);
if (q.has('lang')) { lang = q.get('lang') as Lang; loadEpisode(epSel.value); }
if (q.has('ratio')) { ratio = q.get('ratio') as Ratio; loadEpisode(epSel.value); }
if (q.has('t')) drawAt(Number(q.get('t')));
if (q.has('maxsec')) {
  const m = Number(q.get('maxsec'));
  scenes = scenes.filter((s) => s.startTime < m);
  if (scenes.length) scenes[scenes.length - 1].endTime = m;
}
if (q.get('preview') === '1') startPreview();
if (q.get('export') === '1') ($('export') as HTMLButtonElement).click();
if (q.get('ping') === '1') preloadFfmpeg()
  .then(() => { document.title = 'FFMPEG_OK'; void fetch('/__ffmpeg_ok'); })
  .catch((e) => { document.title = `FFMPEG_FAIL ${(e as Error).message}`; void fetch('/__ffmpeg_fail?m=' + encodeURIComponent(String((e as Error).message))); });
