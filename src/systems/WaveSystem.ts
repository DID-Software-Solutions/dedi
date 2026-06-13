import { WAVE_CONFIGS } from '../waveConfigs';
import type { WaveConfig } from '../types';

export class WaveSystem {
  private currentWave = 0;
  private totalWaves = WAVE_CONFIGS.length;

  getCurrentWave(): number { return this.currentWave; }
  getTotalWaves(): number { return this.totalWaves; }
  isComplete(): boolean { return this.currentWave >= this.totalWaves; }

  getCurrentConfig(): WaveConfig | null {
    if (this.currentWave < 1 || this.currentWave > this.totalWaves) return null;
    return WAVE_CONFIGS[this.currentWave - 1];
  }

  getNextConfig(): WaveConfig | null {
    if (this.currentWave >= this.totalWaves) return null;
    return WAVE_CONFIGS[this.currentWave];
  }

  advance(): WaveConfig | null {
    if (this.currentWave >= this.totalWaves) return null;
    this.currentWave++;
    return this.getCurrentConfig();
  }

  reset(): void { this.currentWave = 0; }

  getIntermissionDuration(): number {
    const cfg = this.getCurrentConfig();
    return cfg ? cfg.intermission / 1000 : 5;
  }
}
