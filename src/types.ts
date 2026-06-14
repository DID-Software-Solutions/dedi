export enum EnemyType {
  Grunt = 'grunt',
  Rusher = 'rusher',
  Heavy = 'heavy',
  Spitter = 'spitter',
  Boss = 'boss',
}

export enum EnemyState {
  Idle = 'idle',
  Alert = 'alert',
  Chase = 'chase',
  Attack = 'attack',
  Dead = 'dead',
}

export enum WeaponId {
  Pistol = 'pistol',
  Shotgun = 'shotgun',
  AssaultRifle = 'ar',
  SMG = 'smg',
  Launcher = 'launcher',
}

/** Floor pickups. Health/Ammo are instant; the rest are stacking run-long buffs. */
export enum PickupType {
  Health = 'health',
  Ammo = 'ammo',
  Attack = 'attack',
  Defense = 'defense',
  Speed = 'speed',
  FireRate = 'firerate',
  CritChance = 'critchance',
  CritHit = 'crithit',
}

/** The six stackable buff pickups (subset of PickupType). */
export type BuffType =
  | PickupType.Attack | PickupType.Defense | PickupType.Speed
  | PickupType.FireRate | PickupType.CritChance | PickupType.CritHit;

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
  name: string;
  damage: number;
  magazineSize: number;
  reloadMs: number;
  fireIntervalMs: number;
  unlimitedAmmo: boolean;
  /** Starting reserve / cap topped up by ammo drops (ignored if unlimited). */
  reserveMax: number;
  /** Pellets fired per shot; >1 = shotgun spread. */
  pellets: number;
  /** Cone half-angle in radians applied per pellet. */
  spread: number;
  /** Hold-to-fire (full auto) vs click-per-shot. */
  auto: boolean;
  /** Launcher: travelling rocket dealing splash damage on impact. */
  projectile: boolean;
  /** Splash radius for projectile weapons. */
  splashRadius: number;
  /** Total enemy kills required before this weapon unlocks (0 = from start). */
  unlockKills: number;
}

export interface SaveData {
  highScore: number;
  highScoreWave: number;
  settings: {
    sensitivity: number;
    volume: number;
    fov: number;
    muted: boolean;
  };
}
