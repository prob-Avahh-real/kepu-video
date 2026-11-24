// 冒烟测试：不依赖 TTS/ffmpeg。
// 覆盖：① 每种 kind 都已注册；② 每个文稿 × 每个画幅都能渲染出非空白帧。
// 运行：npm test

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';
import { loadScript } from '../src/script/load-fs';
import { plan } from '../src/story/planner';
import { layoutFor } from '../src/layout/strategy';
import { resolveFonts } from '../src/render/fonts';
import { rcFor } from '../src/render/primitives/sketch';
import { renderFrame } from '../src/render/renderer';
import { KINDS } from '../src/render/kinds';
import type { AudioTrack, Ratio, Shot, ShotKind } from '../src/types';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const outDir = path.join(ROOT, 'work');
fs.mkdirSync(outDir, { recursive: true });

// ① 注册表完整性：ShotKind 全覆盖
const ALL_KINDS: ShotKind[] = ['metaphor', 'process', 'concept', 'compare', 'cycle', 'number'];
for (const k of ALL_KINDS) {
  assert.ok(KINDS[k], `kind 未注册: ${k}`);
}

// ② 每个文稿 × 每个画幅渲染
const scripts = fs.readdirSync(path.join(ROOT, 'content')).filter((f) => f.endsWith('.md'));
assert.ok(scripts.length >= 2, `应有 >=2 个文稿，实得 ${scripts.length}`);

const fonts = resolveFonts();
const ratios: Ratio[] = ['16:9', '9:16'];
let frames = 0;

for (const file of scripts) {
  const shots = loadScript(path.join(ROOT, 'content', file));
  assert.ok(shots.length >= 3, `${file} 分镜过少: ${shots.length}`);
  const per = 4;
  const track: AudioTrack = {
    lang: 'zh', file: '', duration: shots.length * per,
    timings: shots.map((s, i) => ({ id: s.id, start: i * per, end: (i + 1) * per, duration: per, cues: [] })),
  };
  const scenes = plan(shots, track);

  for (const ratio of ratios) {
    const layout = layoutFor(ratio);
    const canvas = createCanvas(layout.dims.W, layout.dims.H);
    const env = { ctx: canvas.getContext('2d'), rc: rcFor(canvas), fonts, layout, lang: 'zh' as const };
    const base = file.replace(/\.md$/, '');
    scenes.forEach((s, i) => {
      const t = s.startTime + s.duration * 0.7;
      renderFrame(env, scenes, t);
      const out = path.join(outDir, `preview-${base}-${ratio.replace(':', 'x')}-s${i + 1}.png`);
      const buf = canvas.toBuffer('image/png');
      fs.writeFileSync(out, buf);
      assert.ok(buf.length > 5000, `预览帧过小: ${out} (${buf.length}B)`);

      const { data } = env.ctx.getImageData(0, 0, layout.dims.W, layout.dims.H);
      const seen = new Set<number>();
      for (let p = 0; p < data.length; p += 4 * 997) {
        seen.add((data[p] << 16) | (data[p + 1] << 8) | data[p + 2]);
      }
      assert.ok(seen.size > 15, `画面疑似空白（颜色 ${seen.size}）: ${out}`);
      frames++;
    });
  }
}

// ③ 未在文稿中出现的图元（小人 host 姿态）单独渲染，避免死代码漏测
{
  const synth: Shot[] = [{
    id: 'host', kind: 'metaphor',
    narration: { zh: '看这个', en: 'look' },
    caption: { zh: '看这个', en: 'look here' },
    visual: { motif: 'host', icon: 'bulb' },
    palette: ['#e4572e', '#2f7fd6', '#f2b705'],
  }];
  const track: AudioTrack = { lang: 'zh', file: '', duration: 4, timings: [{ id: 'host', start: 0, end: 4, duration: 4, cues: [] }] };
  const scenes = plan(synth, track);
  const layout = layoutFor('16:9');
  const canvas = createCanvas(layout.dims.W, layout.dims.H);
  const env = { ctx: canvas.getContext('2d'), rc: rcFor(canvas), fonts, layout, lang: 'zh' as const };
  renderFrame(env, scenes, 3);
  const out = path.join(outDir, 'preview-synth-host.png');
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  frames++;
}

console.log(`[test] OK — ${ALL_KINDS.length} kinds 已注册；${scripts.length} 文稿 × ${ratios.length} 画幅 + 合成图元，共 ${frames} 帧。`);