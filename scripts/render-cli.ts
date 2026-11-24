// 桌面渲染 CLI：
//   npm run render -- content/why-sleep.md --lang both --ratio both
//
// 流程：文稿 → 分镜 → 逐语种旁白(TTS)+时间轴 → 规划 → 逐画幅渲染编码。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Lang, Ratio } from '../src/types';
import { loadScript } from '../src/script/load-fs';
import { narrate } from '../src/tts/narrate';
import { plan } from '../src/story/planner';
import { layoutFor } from '../src/layout/strategy';
import { resolveFonts } from '../src/render/fonts';
import { encodeVideo } from '../src/export/encoder';
import { writeSrt } from '../src/export/subtitles';
import { updateManifest, extractThumb, type ManifestItem } from '../src/export/manifest';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

interface Args {
  script: string;
  langs: Lang[];
  ratios: Ratio[];
  voiceZh?: string;
  voiceEn?: string;
}

function parseArgs(argv: string[]): Args {
  let script = '';
  let langs: Lang[] = ['zh'];
  let ratios: Ratio[] = ['16:9'];
  let voiceZh: string | undefined;
  let voiceEn: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--lang') {
      const v = argv[++i];
      langs = v === 'both' ? ['zh', 'en'] : [v as Lang];
    } else if (a === '--ratio') {
      const v = argv[++i];
      ratios = v === 'both' ? ['16:9', '9:16'] : [v as Ratio];
    } else if (a === '--voice') {
      voiceZh = argv[++i];
    } else if (a === '--voice-en') {
      voiceEn = argv[++i];
    } else if (!a.startsWith('--')) {
      script = a;
    }
  }
  if (!script) script = path.join(ROOT, 'content', 'why-sleep.md');
  else if (!path.isAbsolute(script)) script = path.join(ROOT, script);
  return { script, langs, ratios, voiceZh, voiceEn };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = path.basename(args.script).replace(/\.md$/, '');
  const workDir = path.join(ROOT, 'work');
  const distDir = path.join(ROOT, 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  const entries: ManifestItem[] = [];

  console.log(`[kepu] 文稿: ${path.relative(ROOT, args.script)}`);
  const shots = loadScript(args.script);
  console.log(`[kepu] 分镜: ${shots.length} 个`);
  const fonts = resolveFonts();
  console.log(`[kepu] 字体: zh=${fonts.zh}${fonts.ok.zh ? '' : '(降级)'} en=${fonts.en}${fonts.ok.en ? '' : '(降级)'}`);

  for (const lang of args.langs) {
    console.log(`\n[kepu] === 语言: ${lang} ===`);
    process.stdout.write('[kepu] TTS 合成旁白…');
    const voice = lang === 'zh' ? args.voiceZh : args.voiceEn;
    const track = narrate(shots, lang, { workDir, voice });
    const scenes = plan(shots, track);
    console.log(` 完成 (${track.duration.toFixed(1)}s)`);
    const srt = path.join(distDir, `${base}-${lang}.srt`);
    writeSrt(scenes, lang, srt);
    console.log(`[kepu] 字幕: ${path.basename(srt)}`);

    for (const ratio of args.ratios) {
      const layout = layoutFor(ratio);
      const out = path.join(distDir, `${base}-${lang}-${ratio.replace(':', 'x')}.mp4`);
      process.stdout.write(`[kepu] 渲染 ${ratio} (${layout.dims.W}x${layout.dims.H}) → ${path.basename(out)} `);
      let last = -1;
      await encodeVideo({
        scenes, fonts, layout, lang,
        audioFile: track.file,
        outFile: out,
        onProgress: (f) => {
          const pct = Math.round(f * 100);
          if (pct >= last + 25) { process.stdout.write(`${pct}% `); last = pct; }
        },
      });
      const size = fs.statSync(out).size;
      console.log(`\n[kepu] ✔ 完成 ${path.relative(ROOT, out)} (${(size / 1024 / 1024).toFixed(1)} MB)`);
      const thumbName = path.basename(out).replace(/\.mp4$/, '.jpg');
      const thumbAbs = path.join(distDir, 'thumbs', thumbName);
      const okThumb = extractThumb(out, thumbAbs, track.duration * 0.55);
      entries.push({
        topic: base, lang, ratio,
        file: path.basename(out),
        srt: path.basename(srt),
        thumb: okThumb ? `thumbs/${thumbName}` : null,
        bytes: size,
      });
    }
  }

  updateManifest(distDir, entries);
  console.log(`[kepu] 清单: dist/manifest.json (${entries.length} 条)`);
  console.log('\n[kepu] 全部完成。');
}

main().catch((e) => {
  console.error('\n[kepu] 失败:', (e as Error).message);
  process.exit(1);
});
