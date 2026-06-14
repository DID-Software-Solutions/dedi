import { describe, it, expect, beforeEach } from 'vitest';
import { WaveSystem } from '../src/systems/WaveSystem';
import { EnemyType } from '../src/types';

function countType(cfg: ReturnType<WaveSystem['getCurrentConfig']>, type: EnemyType): number {
  if (!cfg) return 0;
  return cfg.enemies.find(e => e.type === type)?.count ?? 0;
}

let ws: WaveSystem;
beforeEach(() => { ws = new WaveSystem(); });

describe('WaveSystem initial state', () => {
  it('starts at wave 0', () => {
    expect(ws.getCurrentWave()).toBe(0);
  });

  it('has 15 total waves', () => {
    expect(ws.getTotalWaves()).toBe(15);
  });

  it('isComplete false at start', () => {
    expect(ws.isComplete()).toBe(false);
  });
});

describe('WaveSystem.advance', () => {
  it('returns wave 1 config on first advance', () => {
    const cfg = ws.advance();
    expect(ws.getCurrentWave()).toBe(1);
    expect(cfg).not.toBeNull();
    expect(countType(cfg, EnemyType.Grunt)).toBeGreaterThan(0);
  });

  it('wave 1 has only Grunts (no Rushers or Heavies)', () => {
    const cfg = ws.advance();
    expect(countType(cfg, EnemyType.Rusher)).toBe(0);
    expect(countType(cfg, EnemyType.Heavy)).toBe(0);
  });

  it('wave 6 introduces Rushers', () => {
    for (let i = 0; i < 6; i++) ws.advance();
    const cfg = ws.getCurrentConfig();
    expect(countType(cfg, EnemyType.Rusher)).toBeGreaterThan(0);
  });

  it('wave 11 introduces Heavies', () => {
    for (let i = 0; i < 11; i++) ws.advance();
    const cfg = ws.getCurrentConfig();
    expect(countType(cfg, EnemyType.Heavy)).toBeGreaterThan(0);
  });

  it('spawns a mini-boss on waves 5, 10 and 15 only', () => {
    const bossWaves = new Set([5, 10, 15]);
    for (let w = 1; w <= 15; w++) {
      const cfg = ws.advance();
      const bosses = countType(cfg, EnemyType.Boss);
      if (bossWaves.has(w)) expect(bosses).toBeGreaterThan(0);
      else expect(bosses).toBe(0);
    }
  });

  it('wave 15 spawns two bosses', () => {
    for (let i = 0; i < 15; i++) ws.advance();
    expect(countType(ws.getCurrentConfig(), EnemyType.Boss)).toBe(2);
  });

  it('returns null after wave 15', () => {
    for (let i = 0; i < 15; i++) ws.advance();
    expect(ws.isComplete()).toBe(true);
    expect(ws.advance()).toBeNull();
  });
});

describe('WaveSystem.reset', () => {
  it('resets to wave 0', () => {
    ws.advance();
    ws.reset();
    expect(ws.getCurrentWave()).toBe(0);
    expect(ws.isComplete()).toBe(false);
  });
});
