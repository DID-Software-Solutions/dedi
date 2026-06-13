import { describe, it, expect, beforeEach, vi } from 'vitest';

const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
});

import { SaveData } from '../src/utils/SaveData';

beforeEach(() => localStorage.clear());

describe('SaveData.load', () => {
  it('returns defaults when nothing stored', () => {
    const d = SaveData.load();
    expect(d.highScore).toBe(0);
    expect(d.settings.sensitivity).toBe(0.5);
    expect(d.settings.volume).toBe(0.8);
    expect(d.settings.fov).toBe(90);
  });

  it('returns stored values', () => {
    SaveData.save({ highScore: 500, highScoreWave: 3, settings: { sensitivity: 0.3, volume: 0.6, fov: 80 } });
    const d = SaveData.load();
    expect(d.highScore).toBe(500);
    expect(d.settings.sensitivity).toBe(0.3);
  });
});

describe('SaveData.updateHighScore', () => {
  it('saves new high score and returns true when higher', () => {
    const updated = SaveData.updateHighScore(1000);
    expect(updated).toBe(true);
    expect(SaveData.load().highScore).toBe(1000);
  });

  it('does not overwrite with lower score', () => {
    SaveData.updateHighScore(500);
    const updated = SaveData.updateHighScore(100);
    expect(updated).toBe(false);
    expect(SaveData.load().highScore).toBe(500);
  });
});
