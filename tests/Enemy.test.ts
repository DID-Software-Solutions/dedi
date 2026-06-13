import { describe, it, expect } from 'vitest';
import { Enemy } from '../src/entities/Enemy';
import { EnemyType, EnemyState } from '../src/types';

describe('Enemy construction', () => {
  it('Grunt has correct stats', () => {
    const e = new Enemy(EnemyType.Grunt);
    expect(e.hp).toBe(60);
    expect(e.speed).toBe(4);
    expect(e.state).toBe(EnemyState.Idle);
  });

  it('Rusher has correct stats', () => {
    const e = new Enemy(EnemyType.Rusher);
    expect(e.hp).toBe(30);
    expect(e.speed).toBe(7);
  });

  it('Heavy has correct stats', () => {
    const e = new Enemy(EnemyType.Heavy);
    expect(e.hp).toBe(200);
    expect(e.speed).toBe(2);
  });

  it('Grunt and Heavy are ranged; Rusher is melee (per design spec)', () => {
    expect(new Enemy(EnemyType.Grunt).ranged).toBe(true);
    expect(new Enemy(EnemyType.Heavy).ranged).toBe(true);
    expect(new Enemy(EnemyType.Rusher).ranged).toBe(false);
  });
});

describe('Enemy.takeDamage', () => {
  it('reduces hp', () => {
    const e = new Enemy(EnemyType.Grunt);
    e.alert();
    e.takeDamage(20);
    expect(e.hp).toBe(40);
  });

  it('transitions to Dead at 0 hp', () => {
    const e = new Enemy(EnemyType.Grunt);
    e.alert();
    e.takeDamage(100);
    expect(e.state).toBe(EnemyState.Dead);
    expect(e.hp).toBe(0);
  });

  it('ignores damage when already dead', () => {
    const e = new Enemy(EnemyType.Grunt);
    e.alert();
    e.takeDamage(100);
    e.takeDamage(50);
    expect(e.hp).toBe(0);
  });
});

describe('Enemy.alert', () => {
  it('transitions Idle to Alert', () => {
    const e = new Enemy(EnemyType.Grunt);
    e.alert();
    expect(e.state).toBe(EnemyState.Alert);
  });

  it('does not alert dead enemies', () => {
    const e = new Enemy(EnemyType.Grunt);
    e.alert();
    e.takeDamage(100);
    e.alert();
    expect(e.state).toBe(EnemyState.Dead);
  });
});
