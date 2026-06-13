import { describe, it, expect } from 'vitest';
import { Vector3 } from '@babylonjs/core';
import { resolveCircleXZ, type Obstacle } from '../src/systems/Collision';

describe('resolveCircleXZ — circle obstacle', () => {
  const crate: Obstacle = { kind: 'circle', cx: 0, cz: 0, r: 1 };

  it('leaves a non-overlapping circle untouched', () => {
    const p = new Vector3(5, 1, 0);
    resolveCircleXZ(p, 0.5, [crate]);
    expect(p.x).toBe(5);
    expect(p.z).toBe(0);
  });

  it('pushes an overlapping circle out to exactly the touching distance', () => {
    const p = new Vector3(0.5, 1, 0); // inside r+radius = 1.5
    resolveCircleXZ(p, 0.5, [crate]);
    const d = Math.hypot(p.x - crate.cx, p.z - crate.cz);
    expect(d).toBeCloseTo(1.5, 5);
  });

  it('never touches the Y axis', () => {
    const p = new Vector3(0.5, 1.7, 0);
    resolveCircleXZ(p, 0.5, [crate]);
    expect(p.y).toBe(1.7);
  });
});

describe('resolveCircleXZ — box obstacle', () => {
  const wall: Obstacle = { kind: 'box', cx: 0, cz: 0, hx: 2, hz: 2 };

  it('pushes a circle off the nearest face', () => {
    const p = new Vector3(2.2, 1, 0); // 0.2 into the +x face for radius 0.5
    resolveCircleXZ(p, 0.5, [wall]);
    expect(p.x).toBeCloseTo(2.5, 5); // hx + radius
    expect(p.z).toBeCloseTo(0, 5);
  });

  it('ejects a centre stuck inside the box along the shallowest face', () => {
    const p = new Vector3(1.5, 1, 0.2); // deepest in x → eject along x
    resolveCircleXZ(p, 0.5, [wall]);
    expect(p.x).toBeCloseTo(2.5, 5);
  });

  it('leaves a circle clear of the box untouched', () => {
    const p = new Vector3(10, 1, 10);
    resolveCircleXZ(p, 0.5, [wall]);
    expect(p.x).toBe(10);
    expect(p.z).toBe(10);
  });
});
