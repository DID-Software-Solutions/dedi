export enum EnemyType {
  Grunt = 'grunt',
  Rusher = 'rusher',
  Heavy = 'heavy',
  Spitter = 'spitter',
}

export enum EnemyState {
  Idle = 'idle',
  Alert = 'alert',
  Chase = 'chase',
  Attack = 'attack',
  Dead = 'dead',
}

export enum WeaponId {
  AssaultRifle = 'ar',
  Pistol = 'pistol',
}

export enum GamePhase {
  Menu = 'menu',
  Playing = 'playing',
  Intermission = 'intermission',
  Paused = 'paused',
  GameOver = 'gameover',
  Victory = 'victory',
}

export interface WaveConfig {
  wave: number;
  enemies: { type: EnemyType; count: number }[];
  spawnDelay: number;
  intermission: number;
}

export interface WeaponDef {
  id: WeaponId;
  damage: number;
  magazineSize: number;
  reloadMs: number;
  fireIntervalMs: number;
  unlimitedAmmo: boolean;
}

export interface SaveData {
  highScore: number;
  highScoreWave: number;
  settings: {
    sensitivity: number;
    volume: number;
    fov: number;
  };
}
