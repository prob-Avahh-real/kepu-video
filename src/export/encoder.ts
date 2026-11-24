// 视频编码（桌面）：逐帧渲染 → 原始 RGBA 管道 → ffmpeg CLI → MP4。
// 复用 song-vlog-ai 的「离线逐帧 + H.264/AAC」思路，改为 Node 管道，画幅由 dims 决定。

import { createCanvas } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import type { Lang, SceneSpec } from '../types';
import type { Layout } from '../layout/strategy';
import type { FontSet } from '../render/fonts';
import { renderFrame, type RenderEnv } from '../render/renderer';
import { rcFor } from '../render/primitives/sketch';

export interface EncodeOptions {
  scenes: SceneSpec[];
  fonts: FontSet;
  layout: Layout;
  lang: Lang;
  audioFile: string;
  outFile: string;
  onProgress?: (frac: number) => void;
}

export async function encodeVideo(opts: EncodeOptions): Promise<void> {
  const { scenes, fonts, layout, lang, audioFile, outFile, onProgress } = opts;
  const { W, H, fps } = layout.dims;
  const total = scenes[scenes.length - 1].endTime;
  const totalFrames = Math.max(1, Math.ceil(total * fps));

  const canvas = createCanvas(W, H);
  const env: RenderEnv = {
    ctx: canvas.getContext('2d'),
    rc: rcFor(canvas),
    fonts,
    layout,
    lang,
  };

  const args = [
    '-y', '-loglevel', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(fps), '-i', '-',
    '-i', audioFile,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-crf', '20', '-preset', 'medium',
    '-c:a', 'aac', '-b:a', '192k',
    '-shortest', '-movflags', '+faststart',
    outFile,
  ];

  await new Promise<void>((resolve, reject) => {
    const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
    let i = 0;
    let done = false;
    let err = '';

    ff.stderr.on('data', (d: Buffer) => { err += d.toString(); });
    const tail = () => err.trim().split('\n').slice(-6).join('\n');

    const fail = (e: Error) => {
      if (done) return;
      done = true;
      ff.stdin.destroy();
      reject(e);
    };

    ff.on('error', (e) => fail(e));
    ff.on('close', (code) => {
      if (done) return;
      done = true;
      if (code === 0) resolve();
      else reject(new Error(`[encoder] ffmpeg 退出码 ${code}\n${tail()}`));
    });

    const pump = () => {
      while (i < totalFrames) {
        const t = i / fps;
        renderFrame(env, scenes, t);
        const { data } = env.ctx.getImageData(0, 0, W, H);
        const buf = Buffer.from(data.buffer, data.byteOffset, data.length);
        const ok = ff.stdin.write(buf);
        i += 1;
        if (onProgress && i % 15 === 0) onProgress(i / totalFrames);
        if (!ok) {
          ff.stdin.once('drain', pump);
          return;
        }
      }
      ff.stdin.end();
    };
    pump();
  });

  onProgress?.(1);
}
