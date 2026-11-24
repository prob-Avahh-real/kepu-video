// 通用契约：所有模块只依赖本文件的类型。
// 新增一种镜头类型 = 新增一个 ShotKind + render/kinds/<kind>.ts 策略，主循环不动。

export type Lang = 'zh' | 'en';
export type Ratio = '16:9' | '9:16';
export type ShotKind = 'metaphor' | 'process' | 'concept' | 'compare' | 'cycle' | 'number';

export interface Narration {
  zh: string;
  en: string;
}

export interface Caption {
  zh?: string;
  en?: string;
}

// 与画幅无关的声明式视觉参数，字段由各 kind 自行解释。
export interface VisualSpec {
  [key: string]: unknown;
}

export interface Shot {
  id: string;
  kind: ShotKind;
  narration: Narration;
  caption: Caption;
  visual: VisualSpec;
  palette: [string, string, string];
}

export interface SceneSpec extends Shot {
  startTime: number;
  endTime: number;
  duration: number;
  seed: number;
  cues: Cue[];
}

// 句级字幕：与旁白逐句对齐（来自 edge-tts VTT，时间为绝对秒）。
export interface Cue {
  start: number;
  end: number;
  text: string;
}

export interface ShotTiming {
  id: string;
  start: number;
  end: number;
  duration: number;
  cues: Cue[];
}

export interface AudioTrack {
  lang: Lang;
  file: string;
  duration: number;
  timings: ShotTiming[];
}

export interface Dims {
  W: number;
  H: number;
  fps: number;
  ratio: Ratio;
}

// 手写字体族名（Node 用系统字体注册，Web 用 @font-face/系统回退）
export interface FontSet {
  zh: string;
  en: string;
  ok: { zh: boolean; en: boolean };
}

// 画面「舞台」：内容按归一化坐标画进这个安全区，与画幅解耦。
export interface Stage {
  x: number;
  y: number;
  w: number;
  h: number;
  vertical: boolean;
}

export interface ExportProgress {
  phase: 'tts' | 'render' | 'encode' | 'done';
  percent: number;
  message: string;
}

// 手绘风格与画幅的全局常量
export const INK = '#211c17';
export const PAPER = '#fbf7ef';
export const DEFAULT_PALETTE: [string, string, string] = ['#e4572e', '#2f7fd6', '#f2b705'];

export const RATIO_DIMS: Record<Ratio, { W: number; H: number }> = {
  '16:9': { W: 1920, H: 1080 },
  '9:16': { W: 1080, H: 1920 },
};

export const FPS = 30;
