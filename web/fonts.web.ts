// Web/移动端字体：用系统手写体列表（Android/iOS 回退到系统 CJK 字体）。
// 桌面端用 src/render/fonts.ts（@napi-rs GlobalFonts）；本模块供浏览器使用。

import type { FontSet } from '../src/types';

export function resolveFontsWeb(): FontSet {
  return {
    zh: '"HanziPen SC","Kaiti SC","STKaiti","KaiTi","Noto Sans SC","PingFang SC",cursive',
    en: '"Marker Felt","Comic Sans MS","Chalkboard SE",cursive',
    ok: { zh: true, en: true },
  };
}
