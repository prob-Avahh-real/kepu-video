// 移动端/浏览器导出：Canvas 逐帧 → FFmpeg.wasm → MP4（可选 mux 音频）。
// FFmpeg 不可用时降级 MediaRecorder（webm，无声）。

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import rough from 'roughjs';
import { renderFrame, type RenderEnv } from '../src/render/renderer';
import type { FontSet, Lang, SceneSpec } from '../src/types';
import type { Layout } from '../src/layout/strategy';

const CDN = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
let instance: FFmpeg | null = null;

// 优先加载同源自带 core（Capacitor 离线所需），失败再回退 CDN。
async function loadCore(f: FFmpeg, base: string): Promise<void> {
  await f.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
  });
}

async function getFFmpeg(): Promise<FFmpeg> {
  if (instance) return instance;
  const f = new FFmpeg();
  const local = new URL('./ffmpeg', document.baseURI).href.replace(/\/$/, '');
  try {
    await loadCore(f, local);
  } catch (e) {
    console.warn('[export] 本地 core 加载失败，回退 CDN：', e);
    await loadCore(f, CDN);
  }
  instance = f;
  return f;
}

export interface Progress { phase: 'prepare' | 'frames' | 'encode' | 'done'; percent: number; message: string }

// 预热/自检：加载 FFmpeg.wasm 核心（供自动化验证与首用降延迟）。
export async function preloadFfmpeg(): Promise<void> {
  await getFFmpeg();
}

export interface WebExportOptions {
  scenes: SceneSpec[];
  fonts: FontSet;
  layout: Layout;
  lang: Lang;
  audio?: File | null;
  onProgress?: (p: Progress) => void;
  signal?: AbortSignal;
}

function makeEnv(o: WebExportOptions, canvas: HTMLCanvasElement): RenderEnv {
  return {
    ctx: canvas.getContext('2d') as unknown as RenderEnv['ctx'],
    rc: rough.canvas(canvas),
    fonts: o.fonts,
    layout: o.layout,
    lang: o.lang,
  };
}

export async function exportVideoWeb(o: WebExportOptions): Promise<Blob> {
  const { W, H, fps } = o.layout.dims;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const env = makeEnv(o, canvas);
  const total = o.scenes[o.scenes.length - 1].endTime;
  const frames = Math.max(1, Math.ceil(total * fps));

  try {
    o.onProgress?.({ phase: 'prepare', percent: 0, message: '加载 FFmpeg 核心…' });
    const ff = await getFFmpeg();

    for (let i = 0; i < frames; i++) {
      if (o.signal?.aborted) throw new Error('aborted');
      renderFrame(env, o.scenes, i / fps);
      const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), 'image/jpeg', 0.92));
      await ff.writeFile(`f_${String(i).padStart(6, '0')}.jpg`, new Uint8Array(await blob.arrayBuffer()));
      if (i % 10 === 0) o.onProgress?.({ phase: 'frames', percent: (i / frames) * 80, message: `渲染帧 ${i}/${frames}` });
    }

    let audioName = '';
    if (o.audio) {
      audioName = 'in_audio';
      await ff.writeFile(audioName, await fetchFile(o.audio));
    }

    const args = ['-framerate', String(fps), '-i', 'f_%06d.jpg'];
    if (audioName) args.push('-i', audioName);
    args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast');
    if (audioName) args.push('-c:a', 'aac', '-shortest');
    args.push('-movflags', '+faststart', 'out.mp4');

    o.onProgress?.({ phase: 'encode', percent: 84, message: '合成 MP4…' });
    await ff.exec(args);
    const data = await ff.readFile('out.mp4');
    for (let i = 0; i < frames; i++) { try { await ff.deleteFile(`f_${String(i).padStart(6, '0')}.jpg`); } catch { /* */ } }
    try { await ff.deleteFile('out.mp4'); if (audioName) await ff.deleteFile(audioName); } catch { /* */ }
    o.onProgress?.({ phase: 'done', percent: 100, message: '完成' });
    return new Blob([data as BlobPart], { type: 'video/mp4' });
  } catch (e) {
    if ((e as Error).message === 'aborted') throw e;
    console.warn('[export] FFmpeg 失败，降级录制：', e);
    o.onProgress?.({ phase: 'encode', percent: 84, message: 'FFmpeg 不可用，改用实时录制（webm）…' });
    return exportWithMediaRecorder(env, o);
  }
}

async function exportWithMediaRecorder(env: RenderEnv, o: WebExportOptions): Promise<Blob> {
  const { fps } = o.layout.dims;
  const total = o.scenes[o.scenes.length - 1].endTime;
  const el = (env.ctx as unknown as { canvas: HTMLCanvasElement }).canvas;
  const stream = el.captureStream(fps);
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8e6 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise<Blob>((r) => { rec.onstop = () => r(new Blob(chunks, { type: mime })); });
  rec.start(200);
  const start = performance.now();
  await new Promise<void>((res) => {
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      if (t >= total) { res(); return; }
      renderFrame(env, o.scenes, t);
      o.onProgress?.({ phase: 'encode', percent: 84 + (t / total) * 16, message: `录制 ${Math.floor((t / total) * 100)}%` });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  rec.stop();
  const blob = await done;
  o.onProgress?.({ phase: 'done', percent: 100, message: '完成（webm）' });
  return blob;
}
