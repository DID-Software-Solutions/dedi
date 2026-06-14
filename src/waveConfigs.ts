import { EnemyType, type WaveConfig } from './types';

export const WAVE_CONFIGS: WaveConfig[] = [
  { wave: 1,  enemies: [{ type: EnemyType.Grunt, count: 3 }],  spawnDelay: 1500, intermission: 10000 },
  { wave: 2,  enemies: [{ type: EnemyType.Grunt, count: 5 }],  spawnDelay: 1200, intermission: 10000 },
  { wave: 3,  enemies: [{ type: EnemyType.Grunt, count: 7 }],  spawnDelay: 1200, intermission: 10000 },
  { wave: 4,  enemies: [{ type: EnemyType.Grunt, count: 9 }],  spawnDelay: 1000, intermission: 10000 },
  { wave: 5,  enemies: [{ type: EnemyType.Grunt, count: 8 }, { type: EnemyType.Boss, count: 1 }], spawnDelay: 1000, intermission: 10000 },
  { wave: 6,  enemies: [{ type: EnemyType.Grunt, count: 10 }, { type: EnemyType.Rusher, count: 3 }],  spawnDelay: 900, intermission: 10000 },
  { wave: 7,  enemies: [{ type: EnemyType.Grunt, count: 10 }, { type: EnemyType.Rusher, count: 5 },  { type: EnemyType.Spitter, count: 2 }],  spawnDelay: 900, intermission: 10000 },
  { wave: 8,  enemies: [{ type: EnemyType.Grunt, count: 12 }, { type: EnemyType.Rusher, count: 6 },  { type: EnemyType.Spitter, count: 3 }],  spawnDelay: 800, intermission: 10000 },
  { wave: 9,  enemies: [{ type: EnemyType.Grunt, count: 12 }, { type: EnemyType.Rusher, count: 8 },  { type: EnemyType.Spitter, count: 4 }],  spawnDelay: 800, intermission: 10000 },
  { wave: 10, enemies: [{ type: EnemyType.Grunt, count: 12 }, { type: EnemyType.Rusher, count: 8 }, { type: EnemyType.Spitter, count: 5 }, { type: EnemyType.Boss, count: 1 }], spawnDelay: 700, intermission: 10000 },
  { wave: 11, enemies: [{ type: EnemyType.Grunt, count: 10 }, { type: EnemyType.Rusher, count: 8 },  { type: EnemyType.Spitter, count: 4 }, { type: EnemyType.Heavy, count: 1 }], spawnDelay: 700, intermission: 10000 },
  { wave: 12, enemies: [{ type: EnemyType.Grunt, count: 10 }, { type: EnemyType.Rusher, count: 8 },  { type: EnemyType.Spitter, count: 5 }, { type: EnemyType.Heavy, count: 2 }], spawnDelay: 600, intermission: 10000 },
  { wave: 13, enemies: [{ type: EnemyType.Grunt, count: 12 }, { type: EnemyType.Rusher, count: 10 }, { type: EnemyType.Spitter, count: 6 }, { type: EnemyType.Heavy, count: 3 }], spawnDelay: 600, intermission: 10000 },
  { wave: 14, enemies: [{ type: EnemyType.Grunt, count: 12 }, { type: EnemyType.Rusher, count: 12 }, { type: EnemyType.Spitter, count: 7 }, { type: EnemyType.Heavy, count: 4 }], spawnDelay: 500, intermission: 10000 },
  { wave: 15, enemies: [{ type: EnemyType.Grunt, count: 15 }, { type: EnemyType.Rusher, count: 15 }, { type: EnemyType.Spitter, count: 8 }, { type: EnemyType.Heavy, count: 5 }, { type: EnemyType.Boss, count: 2 }], spawnDelay: 500, intermission: 0 },
];
