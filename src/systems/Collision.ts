import { Vector3 } from '@babylonjs/core';

/**
 * Lightweight 2D (XZ-plane) collision. Movers are circles; world obstacles are
 * axis-aligned boxes (buildings) or circles (crates). We resolve by pushing the
 * mover's centre out of any overlap — no physics engine, no per-frame allocation
 * in the hot path. Y is untouched (everything stands on the flat ground).
 */
export type Obstacle =
  | { kind: 'box'; cx: number; cz: number; hx: number; hz: number }
  | { kind: 'circle'; cx: number; cz: number; r: number };

/** Push `pos` (mutated) out of `obstacle` if the circle of `radius` overlaps it. */
function resolveOne(pos: Vector3, radius: number, o: Obstacle): void {
  if (o.kind === 'circle') {
    const dx = pos.x - o.cx;
    const dz = pos.z - o.cz;
    const min = radius + o.r;
    const d2 = dx * dx + dz * dz;
    if (d2 >= min * min) return;
    const d = Math.sqrt(d2) || 0.0001;
    const push = (min - d) / d;
    pos.x += dx * push;
    pos.z += dz * push;
    return;
  }

  // Box: nearest point on the box to the circle centre.
  const nx = Math.max(o.cx - o.hx, Math.min(pos.x, o.cx + o.hx));
  const nz = Math.max(o.cz - o.hz, Math.min(pos.z, o.cz + o.hz));
  const dx = pos.x - nx;
  const dz = pos.z - nz;
  const d2 = dx * dx + dz * dz;

  if (d2 > 1e-6) {
    if (d2 >= radius * radius) return;
    const d = Math.sqrt(d2);
    const push = (radius - d) / d;
    pos.x += dx * push;
    pos.z += dz * push;
    return;
  }

  // Centre is inside the box — eject along the shallowest face.
  const overlapX = o.hx + radius - Math.abs(pos.x - o.cx);
  const overlapZ = o.hz + radius - Math.abs(pos.z - o.cz);
  if (overlapX < overlapZ) {
    pos.x += pos.x < o.cx ? -overlapX : overlapX;
  } else {
    pos.z += pos.z < o.cz ? -overlapZ : overlapZ;
  }
}

/** Resolve a moving circle against every obstacle (two passes for corners). */
export function resolveCircleXZ(pos: Vector3, radius: number, obstacles: Obstacle[]): void {
  for (let pass = 0; pass < 2; pass++) {
    for (const o of obstacles) resolveOne(pos, radius, o);
  }
}
