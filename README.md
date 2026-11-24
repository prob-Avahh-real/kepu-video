# 涂知 · kepu-video

手绘涂鸦科普视频生成器。风格对标「柴知道」式中文涂鸦科普：明快、不把观众当小孩，
**画面即讲解**——关掉字幕也能看懂主线。

一支文稿，自动出**中英双语 × 横竖两版**共 4 个 MP4。

## 两种出片环境

| 环境 | 命令 | 旁白 | 产物 |
|------|------|------|------|
| 桌面 CLI | `npm run render -- content/why-rain.md --lang both --ratio both` | edge-tts 女声（句级同步） | MP4 + SRT + manifest |
| 移动端 App | `npm run build:web` → `npm run cap:android` | 不可捕获设备 TTS → 纯字幕版（可附音轨） | MP4（FFmpeg.wasm） |

移动端预览：`npm run dev:web` 打开 `http://localhost:5180`（调试参数 `?lang=&ratio=&t=`）。

## 效果（已含两集）

- **人为什么要睡觉** — 杂物塞满大脑 → 记忆归位书架 → 冲走垃圾 → 睡饱对比
- **为什么会下雨** — 阳光照水 → 水汽上升 → 水循环 → 水珠变大落雨 → 一朵云有多重

每集自动出 **中英双语 × 横竖两版** 共 4 个 MP4 + 双语 SRT。

## 快速开始

```bash
npm install
npm run render -- content/why-rain.md --lang both --ratio both
npm run serve   # http://localhost:8099/player/ 网页预览（可筛选/下载）
```

产物在 `dist/`：`why-rain-zh-16x9.mp4` 等，加 `manifest.json` 清单。

## 镜头类型（kinds）

`metaphor` 隐喻 · `process` 流程 · `concept` 概念 · `compare` 对比 · `cycle` 循环 · `number` 数量。
画面词汇库含 20+ 涂鸦图标与一个可摆姿态的简笔小人。详见 [AGENTS.md](./AGENTS.md)。

## 依赖

- `ffmpeg`（编码）
- `edge-tts`（旁白，`pipx install edge-tts`；若报 403 执行 `pipx upgrade edge-tts`）
- Node 18+；系统中文手写体（HanziPen，缺失自动降级）

## 技术

Vite 无关的纯 Node + TypeScript。画面用 `@napi-rs/canvas` + `roughjs` 生成手绘笔触，
经原始帧管道交给 `ffmpeg` 编码。内容与画幅解耦，同一场景规格可渲染成 16:9 / 9:16。

扩展与规范见 [AGENTS.md](./AGENTS.md)。
