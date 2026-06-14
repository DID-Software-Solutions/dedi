import { PickupType, type BuffType } from '../types';

const MAX_STACKS = 5;
const PER_STACK = 0.1;   // +10% per stack
const CRIT_BASE = 3;     // headshot/crit base multiplier

export class Player {
  hp: number = 100;
  readonly maxHp: number = 100;
  score: number = 0;
  kills: number = 0;
  isDead: boolean = false;

  /** Stacking buff counts (0..MAX_STACKS), one per buff pickup type. */
  private stacks: Record<BuffType, number> = {
    [PickupType.Attack]: 0,
    [PickupType.Defense]: 0,
    [PickupType.Speed]: 0,
    [PickupType.FireRate]: 0,
    [PickupType.CritChance]: 0,
    [PickupType.CritHit]: 0,
  };

  takeDamage(amount: number): void {
    if (this.isDead) return;
    this.hp = Math.max(0, Math.round(this.hp - amount * this.defenseFactor));
    if (this.hp === 0) this.isDead = true;
  }

  heal(amount: number): void {
    if (this.isDead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  addScore(points: number): void {
    this.score += points;
  }

  addKill(): void {
    this.kills++;
    this.addScore(100);
  }

  // --- Buffs ---------------------------------------------------------------

  /** Add a stack of `type`; returns false (no-op) if already at the cap. */
  addBuff(type: BuffType): boolean {
    if (this.stacks[type] >= MAX_STACKS) return false;
    this.stacks[type]++;
    return true;
  }

  getStacks(type: BuffType): number { return this.stacks[type]; }

  get attackMult(): number   { return 1 + PER_STACK * this.stacks[PickupType.Attack]; }
  get speedMult(): number    { return 1 + PER_STACK * this.stacks[PickupType.Speed]; }
  get fireRateMult(): number { return 1 + PER_STACK * this.stacks[PickupType.FireRate]; }
  /** Multiplier applied to incoming damage (1 → -10% per defense stack). */
  get defenseFactor(): number { return 1 - PER_STACK * this.stacks[PickupType.Defense]; }
  /** Probability a body shot crits (headshots always crit). */
  get critChance(): number   { return PER_STACK * this.stacks[PickupType.CritChance]; }
  /** Crit damage multiplier, grown by crit-hit stacks. */
  get critMult(): number     { return CRIT_BASE * (1 + PER_STACK * this.stacks[PickupType.CritHit]); }
}
