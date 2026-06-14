import type { SaveData as ISaveData } from '../types';

const KEY = 'dedi_save';

const DEFAULTS: ISaveData = {
  highScore: 0,
  highScoreWave: 0,
  settings: { sensitivity: 0.5, volume: 0.8, fov: 90, muted: false },
};

export const SaveData = {
  load(): ISaveData {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULTS, settings: { ...DEFAULTS.settings } };
      const parsed = JSON.parse(raw) as Partial<ISaveData>;
      // Coerce numerics on load so a tampered localStorage can never push a
      // non-number into a DOM render path (defence-in-depth against self-XSS).
      const num = (v: unknown, fallback: number): number => {
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
      };
      return {
        highScore: num(parsed.highScore, DEFAULTS.highScore),
        highScoreWave: num(parsed.highScoreWave, DEFAULTS.highScoreWave),
        settings: { ...DEFAULTS.settings, ...(parsed.settings ?? {}) },
      };
    } catch {
      return { ...DEFAULTS, settings: { ...DEFAULTS.settings } };
    }
  },

  save(data: ISaveData): void {
    localStorage.setItem(KEY, JSON.stringify(data));
  },

  updateHighScore(score: number, wave = 0): boolean {
    const d = SaveData.load();
    if (score > d.highScore) {
      d.highScore = score;
      d.highScoreWave = wave;
      SaveData.save(d);
      return true;
    }
    return false;
  },
};
