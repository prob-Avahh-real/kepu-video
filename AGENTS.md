# 涂知 kepu-video

手绘涂鸦科普视频生成器（风格对标「柴知道」）。**文稿进 → 中英双语 · 横竖两版 MP4 出。**

## 用途决定 Target

产物是**视频内容 + 生产流水线**，两种出片环境：

- **桌面 CLI**（主）：本机 `ffmpeg` + `edge-tts`，带真实女声旁白（句级时间轴）。
- **移动端 App**（`web/` + Capacitor）：浏览器 Canvas + **FFmpeg.wasm** 出片。设备端**无法捕获
  Web Speech 音频**，因此移动端默认导出**纯字幕版**（社交媒体静音自动播放常态），可另选音轨 mux。

| 平台 | 需要? | 方式 |
|------|-------|------|
| 移动端 | 需要 | Capacitor Android (`web/` + FFmpeg.wasm 导出) + 桌面 CLI |
| 智能硬件 | 不适用 | 手表 / 戒指 / 手杖 `na`（视频渲染与导出流水线） |

## 双环境共享

`src/` 除以下**Node 专属**模块外，均可被浏览器复用（已用 `Ctx2D` 抽象宿主上下文）：
`src/render/fonts.ts`（GlobalFonts）、`src/tts/narrate.ts`（edge-tts）、`src/export/{encoder,subtitles,manifest}.ts`（fs/ffmpeg）、`src/script/load-fs.ts`。

移动端专属：`web/{main,fonts.web,timeline.web,export.web}.ts`（估时时间轴 + FFmpeg.wasm 导出）。

## 流水线

```
content/*.md ──①adapter──▶ Shot[] ──②narrate(edge-tts,中英)──▶ AudioTrack+时间轴
   └─③planner──▶ SceneSpec[] ──④layout(16:9|9:16)──▶ ⑤render(手绘) ──⑥encoder(ffmpeg)──▶ MP4
```

| 阶段 | 文件 | 职责 |
|------|------|------|
| ① 解析 | `src/script/adapter.ts` | markdown 稿 → `Shot[]` |
| ② 旁白 | `src/tts/narrate.ts` | edge-tts 女声 + 句级时间轴（带缓存）|
| ③ 规划 | `src/story/planner.ts` | `Shot[]`+时间轴 → `SceneSpec[]`（纯函数）|
| ④ 布局 | `src/layout/strategy.ts` | 画幅 → 安全区/字号（内容与画幅解耦）|
| ⑤ 渲染 | `src/render/` | rough.js 手绘，`kinds/<kind>.ts` 分策略 |
| ⑥ 编码 | `src/export/encoder.ts` | 逐帧 RGBA 管道 → ffmpeg → H.264/AAC MP4 |
| ⑦ 字幕/清单 | `src/export/subtitles.ts` · `manifest.ts` | 双语 SRT · `dist/manifest.json` |

## 图元与策略

- `src/render/primitives/`：`sketch.ts`（rough 笔触）、`icons.ts`（20+ 涂鸦图标）、`character.ts`（简笔小人，7 种姿态）。
- kinds：`metaphor` / `process` / `concept` / `compare` / `cycle` / `number`。
- 同 kind 内用 `visual.motif` 分流（process: sortBooks/evaporate/rainfall/flush；metaphor: clutter/sunWater/host/…）。

## 命令

```bash
npm install
npm run render -- content/why-rain.md --lang both --ratio both    # 出 4 支片 + SRT + 清单
npm run render -- content/why-sleep.md --lang zh --ratio 16:9     # 单支
npm run manifest   # 从 dist/ 重建 manifest.json
npm run serve      # http://localhost:8099/player/  网页预览
npm test           # 冒烟：注册表完整性 + 各文稿×画幅渲染非空白
npm run typecheck
```

参数：`--lang zh|en|both`，`--ratio 16:9|9:16|both`，`--voice <edge-tts语音>`，`--voice-en <...>`。

产物：`dist/<name>-<lang>-<ratio>.mp4`、`dist/<name>-<lang>.srt`、`dist/manifest.json`。

## 移动端 / WEB

```bash
npm run dev:web      # 本地开发 http://localhost:5180
npm run build:web    # 出 www/
npm run cap:sync     # build:web + cap sync（复制到 android/）
npm run cap:android  # build + sync + 打开 Android Studio
```

APK：`cd android && ./gradlew assembleDebug`（需 Android SDK；本机未装则此步不可用）。
App 调试参数：`?lang=zh&ratio=9:16&t=9&preview=1`（定位帧 / 自动播放）。

## 如何新增一种镜头（扩展点）

1. 在 `src/render/kinds/` 新建 `myKind.ts`，导出 `drawXxx(c: KindCtx)`；
2. 在 `src/render/kinds/index.ts` 注册一行；
3. `src/types.ts` 的 `ShotKind` 加该类型（`src/script/adapter.ts` 的 `KINDS` 同步）；
4. 文稿里用 `@shot myKind visual={...}`。
   核心循环（planner / layout / renderer / encoder）**不动**，`npm test` 会校验注册表完整性。

新增图标 = 在 `primitives/icons.ts` 加函数并登记；新增流程动线 = 在 `process.ts` 加 `motif` 分支。

## 文稿格式

```
# 标题
@shot <kind> palette=#a,#b,#c visual={"motif":"clutter","items":8}
zh: 中文旁白           # = 配音；也作为字幕（按 edge-tts 句级时间轴逐句同步）
en: english narration  # 同上（英文版）
cap-zh: 中文字幕标题    # = 画面顶部小标签（短标题，仅结构提示）
cap-en: english title
```

> 字幕与配音同源：显示文本 = 该语种旁白（`zh`/`en`），时间轴由 edge-tts VTT 句级对齐；
> `cap-*` 只作画面顶部的小标题，不参与配音。SRT 亦按句级输出（副行为另一语种整句）。

## Harness / Loop

- Guide = 本文件；Sensor = `npm test` + `npm run typecheck` + 产物 `dist/*.mp4` 可播。
- 同类失误第二次 → 沉淀规则或测试（棘轮），不靠口头提醒。
- 开干前写清 Done；每切片过验证环；显式停止（成功 / 上限 / 无进展 / 人审）。

## Done（M1 / M2）

- `npm test` 绿（注册表 6 kinds 完整 + 2 文稿 × 2 画幅非空白）。
- `dist/why-{sleep,rain}-{zh,en}-{16x9,9x16}.mp4` 共 8 支可播、时长=帧数/30、含 aac。
- `dist/*.srt` 双语字幕；`dist/manifest.json` 与 `player/` 可筛选预览。

## 已知限制 / 后续

- 依赖本地 `edge-tts`（若 403 需 `pipx upgrade edge-tts`）与 `ffmpeg`（桌面出片）。
- 中文手写体：桌面用系统 HanziPen；移动端用系统手写体/CJK 回退列表（Android 可能落到默认体）。
- 移动端 **无设备端 TTS 音频捕获**：默认导纯字幕版；要旁白需自带音轨文件（导出时 mux）。
- 移动端 FFmpeg.wasm **自带本地 core**（`web/public/ffmpeg/` ← `@ffmpeg/core`），离线可用；
  本地加载失败才回退 CDN。core 体积 ~32MB，已 gitignore，由 `npm i` 后拷入。
- 本机未装 Android SDK，APK 未在此构建（工程已 `cap sync` 就绪）。
