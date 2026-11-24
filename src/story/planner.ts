// 分镜规划：Shot[] + 旁白时间轴 → SceneSpec[]（纯函数，无副作用）。

import type { AudioTrack, SceneSpec, Shot } from '../types';

function hashSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100000;
}

export function plan(shots: Shot[], track: AudioTrack): SceneSpec[] {
  const byId = new Map(track.timings.map((t) => [t.id, t]));
  return shots.map((shot) => {
    const t = byId.get(shot.id);
    if (!t) throw new Error(`[planner] 缺少分镜时间轴: ${shot.id}`);
    return {
      ...shot,
      startTime: t.start,
      endTime: t.end,
      duration: t.duration,
      seed: hashSeed(shot.id),
      cues: t.cues ?? [],
    };
  });
}

export function lastEnd(scenes: SceneSpec[]): number {
  return scenes.reduce((m, s) => Math.max(m, s.endTime), 0);
}
