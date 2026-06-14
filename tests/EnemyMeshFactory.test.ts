import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NullEngine, Scene } from '@babylonjs/core';
import { buildEnemyRig } from '../src/entities/EnemyMeshFactory';
import { EnemyType } from '../src/types';

// NullEngine builds the real Babylon scene graph with no GPU, so we can assert
// that every enemy rig — including the new mini-boss — has the nodes the
// EnemySystem animation code reaches into.
let engine: NullEngine;
let scene: Scene;

beforeAll(() => {
  engine = new NullEngine();
  scene = new Scene(engine);
});

afterAll(() => {
  scene.dispose();
  engine.dispose();
});

const REQUIRED_NODES = [
  'collider', 'root', 'head', 'leftLeg', 'rightLeg', 'leftArm', 'rightArm', 'muzzle',
] as const;

describe('buildEnemyRig — all enemy types', () => {
  for (const type of Object.values(EnemyType)) {
    it(`${type} rig exposes every node EnemySystem animates`, () => {
      const rig = buildEnemyRig(scene, `t_${type}`, type, true);
      for (const node of REQUIRED_NODES) {
        expect(rig[node], `${type}.${node}`).toBeTruthy();
      }
      expect(rig.parts.length).toBeGreaterThan(0);
      expect(rig.height).toBeGreaterThan(0);
      // Materials must exist so hit-flash / death dimming never throws.
      expect(rig.bodyMat).toBeTruthy();
      expect(rig.eyeMat).toBeTruthy();
      expect(rig.trimMat).toBeTruthy();
    });
  }

  it('the boss is by far the largest rig', () => {
    const boss = buildEnemyRig(scene, 'boss1', EnemyType.Boss, true);
    const grunt = buildEnemyRig(scene, 'grunt1', EnemyType.Grunt, true);
    expect(boss.height).toBeGreaterThan(grunt.height * 1.5);
  });

  it('collider is pickable and named by id (hit detection contract)', () => {
    const rig = buildEnemyRig(scene, 'pick1', EnemyType.Grunt, false);
    expect(rig.collider.isPickable).toBe(true);
    expect(rig.collider.name).toBe('pick1');
  });
});
