import {
  Scene, MeshBuilder, StandardMaterial, Color3, Vector3, type Mesh,
} from '@babylonjs/core';

interface Projectile {
  mesh: Mesh;
  vel: Vector3;
  life: number;
  damage: number;
}

const SPEED = 26;
const LIFETIME = 3;
const HIT_RADIUS = 1.1;

/** Glowing orbs fired by ranged enemies; the player must dodge them. */
export class ProjectileSystem {
  private scene: Scene;
  private projectiles: Projectile[] = [];
  private mat: StandardMaterial;

  onPlayerHit?: (dmg: number, pos: Vector3) => void;

  constructor(scene: Scene) {
    this.scene = scene;
    this.mat = new StandardMaterial('projMat', scene);
    this.mat.emissiveColor = new Color3(0.8, 0.4, 1);
    this.mat.disableLighting = true;
  }

  spawn(from: Vector3, target: Vector3, damage: number): void {
    const mesh = MeshBuilder.CreateSphere('projectile', { diameter: 0.35, segments: 8 }, this.scene);
    mesh.position = from.clone();
    mesh.material = this.mat;
    mesh.isPickable = false;
    const vel = target.subtract(from).normalize().scale(SPEED);
    this.projectiles.push({ mesh, vel, life: LIFETIME, damage });
  }

  update(dt: number, playerPos: Vector3): void {
    this.projectiles = this.projectiles.filter((p) => {
      p.mesh.position.addInPlace(p.vel.scale(dt));
      p.life -= dt;

      const hitGround = p.mesh.position.y <= 0.2;
      const hitPlayer = Vector3.Distance(p.mesh.position, playerPos) < HIT_RADIUS;

      if (hitPlayer) {
        this.onPlayerHit?.(p.damage, p.mesh.position.clone());
      }
      if (hitPlayer || hitGround || p.life <= 0) {
        p.mesh.dispose();
        return false;
      }
      return true;
    });
  }

  clearAll(): void {
    for (const p of this.projectiles) p.mesh.dispose();
    this.projectiles = [];
  }
}
