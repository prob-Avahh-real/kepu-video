// 手写体字体解析：优先注册系统里的中文手写体（HanziPen / 翩翩体）与英文 MarkerFelt。
// 找不到就降级 sans-serif，保证跨机可跑（失败可诊断，不静默伪装）。

import { GlobalFonts } from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';
import type { FontSet } from '../types';

export type { FontSet };

const ZH_CANDIDATES = [
  '/System/Library/AssetsV2/com_apple_MobileAsset_Font8',
  '/System/Library/Fonts/Supplemental',
  '/Library/Fonts',
  path.join(process.env.HOME ?? '', 'Library/Fonts'),
];

const ZH_FILES = ['Hanzipen.ttc', 'Hannotate.ttc', 'Kaiti.ttc', 'Kai.ttf'];
const EN_FILES = ['/System/Library/Fonts/MarkerFelt.ttc', '/System/Library/Fonts/Supplemental/Comic Sans MS.ttf'];

function findFile(bases: string[], names: string[]): string | null {
  for (const base of bases) {
    for (const name of names) {
      const direct = path.join(base, name);
      if (fs.existsSync(direct)) return direct;
    }
    if (fs.existsSync(base)) {
      try {
        for (const entry of fs.readdirSync(base)) {
          for (const name of names) {
            const p = path.join(base, entry, 'AssetData', name);
            if (fs.existsSync(p)) return p;
            const p2 = path.join(base, entry, name);
            if (fs.existsSync(p2)) return p2;
          }
        }
      } catch {
        /* unreadable dir: skip */
      }
    }
  }
  return null;
}

let cached: FontSet | null = null;

export function resolveFonts(): FontSet {
  if (cached) return cached;
  const zhPath = findFile(ZH_CANDIDATES, ZH_FILES);
  const enPath = findFile(['/System/Library/Fonts', '/System/Library/Fonts/Supplemental'], ['MarkerFelt.ttc', 'Comic Sans MS.ttf']);

  let zh = 'sans-serif';
  let en = 'sans-serif';
  let zhOk = false;
  let enOk = false;

  if (zhPath) {
    try {
      GlobalFonts.registerFromPath(zhPath, 'KepuHand');
      zh = 'KepuHand';
      zhOk = true;
    } catch (e) {
      console.warn('[fonts] 注册中文字体失败:', (e as Error).message, zhPath);
    }
  } else {
    console.warn('[fonts] 未找到中文手写体，降级 sans-serif');
  }

  const resolvedEn = enPath ?? EN_FILES.find((p) => fs.existsSync(p)) ?? null;
  if (resolvedEn) {
    try {
      GlobalFonts.registerFromPath(resolvedEn, 'KepuMarker');
      en = 'KepuMarker';
      enOk = true;
    } catch (e) {
      console.warn('[fonts] 注册英文字体失败:', (e as Error).message);
    }
  }

  cached = { zh, en, ok: { zh: zhOk, en: enOk } };
  return cached;
}
