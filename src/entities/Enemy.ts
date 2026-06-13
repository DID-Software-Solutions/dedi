import { EnemyType, EnemyState } from '../types';

interface EnemyStat {
  hp: number; speed: number; damage: number; attackInterval: number;
  ranged?: boolean; attackRange?: number;
}

const ENEMY_STATS: Record<EnemyType, EnemyStat> = {
  // Grunt: mid-range rifleman. Heavy: long-range suppression (faster cadence).
  [EnemyType.Grunt]:  { hp: 60,  speed: 4, damage: 10, attackInterval: 1.5, ranged: true, attackRange: 16 },
  [EnemyType.Rusher]: { hp: 30,  speed: 7, damage: 20, attackInterval: 0.8, attackRange: 2.0 },
  [EnemyType.Heavy]:  { hp: 200, speed: 2, damage: 15, attackInterval: 1.0, ranged: true, attackRange: 20 },
  [EnemyType.Spitter]:{ hp: 45,  speed: 3, damage: 12, attackInterval: 2.2, ranged: true, attackRange: 22 },
};

export class Enemy {
  readonly type: EnemyType;
  readonly maxHp: number;
  readonly speed: number;
  readonly attackDamage: number;
  readonly attackInterval: number;
  readonly ranged: boolean;
  readonly attackRange: number;
  attackTimer: number = 0;
  /** Counts up while winding up a telegraphed attack. */
  windup: number = 0;
  hp: number;
  state: EnemyState = EnemyState.Idle;

  constructor(type: EnemyType) {
    this.type = type;
    const s = ENEMY_STATS[type];
    this.maxHp = s.hp;
    this.hp = s.hp;
    this.speed = s.speed;
    this.attackDamage = s.damage;
    this.attackInterval = s.attackInterval;
    this.ranged = s.ranged ?? false;
    this.attackRange = s.attackRange ?? 2.4;
  }

  takeDamage(amount: number): void {
    if (this.state === EnemyState.Dead) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp === 0) this.state = EnemyState.Dead;
  }

  alert(): void {
    if (this.state === EnemyState.Dead) return;
    if (this.state === EnemyState.Idle) this.state = EnemyState.Alert;
  }

  chase(): void {
    if (this.state === EnemyState.Dead) return;
    this.state = EnemyState.Chase;
  }

  attack(): void {
    if (this.state === EnemyState.Dead) return;
    this.state = EnemyState.Attack;
  }
}
