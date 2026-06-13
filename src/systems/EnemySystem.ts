import {
  Scene, MeshBuilder, StandardMaterial, Color3, Vector3,
  type ShadowGenerator, type Mesh,
} from '@babylonjs/core';
import { Enemy } from '../entities/Enemy';
import { buildEnemyRig, type EnemyRig } from '../entities/EnemyMeshFactory';
import { EnemyState, EnemyType } from '../types';
import type { WaveConfig } from '../types';
import type { Juice } from '../utils/Juice';
import type { ProceduralAudio } from '../utils/ProceduralAudio';
import type { ProjectileSystem } from './ProjectileSystem';

interface EnemyEntry {
  enemy: Enemy;
  rig: EnemyRig;
  id: string;
  phase: number;     // walk-cycle accumulator
  spawnT: number;    // 0..1 rise-from-ground progress
  lunge: number;     // melee attack lunge anim timer
  bloodColor: Color3;
}

const MEDKIT_DROP_CHANCE = 0.3;
const MEDKIT_HEAL = 30;
const ALERT_RANGE = 100; // larger than the arena: a spawned wave always advances
const SEPARATION_RADIUS = 1.6;
const BOUNDARY = 37;

export class EnemySystem {
  private scene: Scene;
  private entries: EnemyEntry[] = [];
  private medkits: { mesh: Mesh; bob: number }[] = [];
  private shadowGen: ShadowGenerator | null = null;
  private spawnZones: Vector3[] = [];
  private nextId = 0;

  private juice!: Juice;
  private audio!: ProceduralAudio;
  private projectiles!: ProjectileSystem;

  onMedkitSpawned?: (pos: Vector3) => void;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  setSpawnZones(zones: Vector3[]): void { this.spawnZones = zones; }
  setShadowGenerator(sg: ShadowGenerator): void { this.shadowGen = sg; }
  setDeps(juice: Juice, audio: ProceduralAudio, projectiles: ProjectileSystem): void {
    this.juice = juice;
    this.audio = audio;
    this.projectiles = projectiles;
  }

  spawnWave(config: WaveConfig): void {
    let zoneIdx = 0;
    for (const entry of config.enemies) {
      for (let i = 0; i < entry.count; i++) {
        const zone = this.spawnZones[zoneIdx % this.spawnZones.length];
        zoneIdx++;
        const jitter = new Vector3((Math.random() - 0.5) * 8, 0, (Math.random() - 0.5) * 8);
        this._spawnEnemy(entry.type, zone.add(jitter));
      }
    }
  }

  private _spawnEnemy(type: EnemyType, pos: Vector3): void {
    const id = `enemy_${this.nextId++}`;
    const enemy = new Enemy(type);
    const rig = buildEnemyRig(this.scene, id, type);
    rig.collider.position = new Vector3(pos.x, rig.height / 2, pos.z);

    if (this.shadowGen) for (const p of rig.parts) this.shadowGen.addShadowCaster(p);
    this.juice?.spawnPortal(pos, rig.trimMat.emissiveColor);
    this.entries.push({
      enemy, rig, id, phase: Math.random() * 6.28, spawnT: 0, lunge: 0,
      bloodColor: rig.trimMat.emissiveColor.clone(),
    });
  }

  update(dt: number, playerPos: Vector3, onPlayerHit: (dmg: number) => void): void {
    for (const entry of this.entries) {
      const { enemy, rig } = entry;
      if (enemy.state === EnemyState.Dead) { this._animateDeath(entry, dt); continue; }

      // Spawn rise-up.
      if (entry.spawnT < 1) {
        entry.spawnT = Math.min(1, entry.spawnT + dt * 1.5);
        rig.root.position.y = -rig.height / 2 - (1 - entry.spawnT) * rig.height;
      }

      const colPos = rig.collider.position;
      const flatPlayer = new Vector3(playerPos.x, colPos.y, playerPos.z);
      const toPlayer = flatPlayer.subtract(colPos);
      const dist = toPlayer.length();
      const dir = dist > 0.001 ? toPlayer.scale(1 / dist) : Vector3.Zero();

      // Always face the player.
      if (dist > 0.1) rig.collider.rotation.y = Math.atan2(dir.x, dir.z);

      let moving = false;

      switch (enemy.state) {
        case EnemyState.Idle:
          if (dist < ALERT_RANGE) enemy.alert();
          break;

        case EnemyState.Alert:
        case EnemyState.Chase: {
          const stopDist = enemy.ranged ? enemy.attackRange * 0.7 : enemy.attackRange;
          if (dist <= stopDist) {
            enemy.state = EnemyState.Attack;
            break;
          }
          const steer = dir.add(this._separation(entry).scale(1.4));
          steer.y = 0;
          steer.normalize();
          colPos.addInPlace(steer.scale(enemy.speed * dt));
          moving = true;
          break;
        }

        case EnemyState.Attack: {
          // Lost line/range — resume chasing.
          if (dist > enemy.attackRange * 1.4) {
            enemy.state = EnemyState.Chase;
            enemy.windup = 0;
            break;
          }
          // Ranged kiting: keep distance from a charging player.
          if (enemy.ranged && dist < 8) {
            const back = dir.scale(-1).add(this._separation(entry));
            back.y = 0; back.normalize();
            colPos.addInPlace(back.scale(enemy.speed * dt));
            moving = true;
          }

          enemy.attackTimer += dt;
          const windupDur = enemy.ranged ? 0.6 : 0.35;
          if (enemy.attackTimer >= enemy.attackInterval) {
            enemy.windup += dt;
            // Telegraph: eyes flare as the attack charges.
            const g = enemy.windup / windupDur;
            rig.eyeMat.emissiveColor = entry.bloodColor.scale(1 + g * 2.5);
            if (enemy.windup >= windupDur) {
              this._releaseAttack(entry, flatPlayer, playerPos, onPlayerHit);
              enemy.attackTimer = 0;
              enemy.windup = 0;
              rig.eyeMat.emissiveColor = entry.bloodColor.clone();
            }
          }
          break;
        }
      }

      // Keep inside the arena.
      colPos.x = Math.max(-BOUNDARY, Math.min(BOUNDARY, colPos.x));
      colPos.z = Math.max(-BOUNDARY, Math.min(BOUNDARY, colPos.z));

      this._animateLocomotion(entry, dt, moving);
    }

    this._animateMedkits(dt);
  }

  /** Soft push-apart so enemies don't overlap into one blob. */
  private _separation(self: EnemyEntry): Vector3 {
    const push = Vector3.Zero();
    const p = self.rig.collider.position;
    for (const other of this.entries) {
      if (other === self || other.enemy.state === EnemyState.Dead) continue;
      const d = p.subtract(other.rig.collider.position);
      const len = d.length();
      if (len > 0.001 && len < SEPARATION_RADIUS) {
        push.addInPlace(d.scale((SEPARATION_RADIUS - len) / SEPARATION_RADIUS / len));
      }
    }
    push.y = 0;
    return push;
  }

  private _releaseAttack(
    entry: EnemyEntry, flatPlayer: Vector3, playerPos: Vector3,
    onPlayerHit: (dmg: number) => void,
  ): void {
    const { enemy, rig } = entry;
    if (enemy.ranged) {
      const muzzlePos = rig.muzzle.getAbsolutePosition();
      // Aim at the player's torso with slight lead inaccuracy.
      const aim = playerPos.add(new Vector3(
        (Math.random() - 0.5) * 1.5, -0.3, (Math.random() - 0.5) * 1.5,
      ));
      this.projectiles.spawn(muzzlePos, aim, enemy.attackDamage);
      this.audio.enemyShoot();
      this.juice.muzzleFlash(muzzlePos, aim.subtract(muzzlePos).normalize());
    } else {
      entry.lunge = 0.2;
      onPlayerHit(enemy.attackDamage);
      this.juice.addShake(0.35);
    }
  }

  /** Leg/arm swing, breathing bob, and melee lunge. */
  private _animateLocomotion(entry: EnemyEntry, dt: number, moving: boolean): void {
    const { rig } = entry;
    if (moving) {
      entry.phase += dt * (6 + entry.enemy.speed * 0.6);
      const swing = Math.sin(entry.phase) * 0.7;
      rig.leftLeg.rotation.x = swing;
      rig.rightLeg.rotation.x = -swing;
      rig.leftArm.rotation.x = -swing * 0.8;
      rig.rightArm.rotation.x = swing * 0.8;
      rig.root.position.y = -rig.height / 2 + Math.abs(Math.sin(entry.phase)) * 0.08;
    } else {
      // Ease limbs back to idle + gentle breathing.
      rig.leftLeg.rotation.x *= 0.85;
      rig.rightLeg.rotation.x *= 0.85;
      entry.phase += dt * 2;
      rig.root.position.y = -rig.height / 2 + Math.sin(entry.phase) * 0.02;
    }

    if (entry.lunge > 0) {
      entry.lunge -= dt;
      const l = Math.max(0, entry.lunge / 0.2);
      rig.rightArm.rotation.x = -1.4 * l;
      rig.leftArm.rotation.x = -1.4 * l;
    }
  }

  private _animateDeath(entry: EnemyEntry, dt: number): void {
    const { rig } = entry;
    if (rig.collider.rotation.z < Math.PI / 2) {
      rig.collider.rotation.z = Math.min(Math.PI / 2, rig.collider.rotation.z + dt * 5);
      rig.collider.position.y = Math.max(0.25, rig.collider.position.y - dt * 2);
    }
  }

  damageEnemy(meshId: string, damage: number, hitPoint?: Vector3): boolean {
    const entry = this.entries.find(e => e.id === meshId);
    if (!entry || entry.enemy.state === EnemyState.Dead) return false;
    entry.enemy.takeDamage(damage);

    const point = hitPoint ?? entry.rig.collider.position.add(new Vector3(0, 0.5, 0));
    this.juice.bloodBurst(point, entry.bloodColor);
    this.audio.hit();

    if (entry.enemy.hp === 0) {
      this._killEnemy(entry);
      return true;
    }
    // White hit flash on the body.
    entry.rig.bodyMat.emissiveColor = new Color3(0.6, 0.6, 0.6);
    setTimeout(() => { entry.rig.bodyMat.emissiveColor = new Color3(0, 0, 0); }, 80);
    return false;
  }

  /** Launcher splash: damage every live enemy within radius (linear falloff). */
  damageInRadius(center: Vector3, damage: number, radius: number): number {
    let kills = 0;
    for (const entry of [...this.entries]) {
      if (entry.enemy.state === EnemyState.Dead) continue;
      const d = Vector3.Distance(center, entry.rig.collider.position);
      if (d > radius) continue;
      const dmg = damage * (1 - (d / radius) * 0.6);
      const point = entry.rig.collider.position.add(new Vector3(0, 0.5, 0));
      if (this.damageEnemy(entry.id, dmg, point)) kills++;
    }
    return kills;
  }

  private _killEnemy(entry: EnemyEntry): void {
    entry.rig.collider.isPickable = false;
    const center = entry.rig.collider.position.add(new Vector3(0, entry.rig.height * 0.4, 0));
    this.juice.deathExplosion(center, entry.bloodColor);
    this.audio.explosion();
    this.juice.floatingText(center, '+100', '#ffdd44');

    // Dim everything to charred remains.
    entry.rig.bodyMat.diffuseColor = new Color3(0.08, 0.08, 0.08);
    entry.rig.bodyMat.emissiveColor = new Color3(0, 0, 0);
    entry.rig.trimMat.emissiveColor = new Color3(0.05, 0.02, 0);
    entry.rig.eyeMat.emissiveColor = new Color3(0, 0, 0);

    if (Math.random() < MEDKIT_DROP_CHANCE) {
      this._spawnMedkit(new Vector3(entry.rig.collider.position.x, 0.4, entry.rig.collider.position.z));
    }
    setTimeout(() => this._disposeEntry(entry), 3500);
  }

  private _disposeEntry(entry: EnemyEntry): void {
    entry.rig.collider.dispose();
    entry.rig.root.dispose();
    for (const p of entry.rig.parts) p.dispose();
    this.entries = this.entries.filter(e => e !== entry);
  }

  private _spawnMedkit(pos: Vector3): void {
    const kit = MeshBuilder.CreateBox('medkit', { size: 0.5 }, this.scene);
    kit.position = pos.clone();
    const mat = new StandardMaterial('medkitMat', this.scene);
    mat.diffuseColor = new Color3(0.9, 0.1, 0.1);
    mat.emissiveColor = new Color3(0.6, 0, 0);
    kit.material = mat;
    kit.isPickable = false;
    this.medkits.push({ mesh: kit, bob: Math.random() * 6.28 });
    this.onMedkitSpawned?.(pos);
  }

  private _animateMedkits(dt: number): void {
    for (const k of this.medkits) {
      k.bob += dt * 3;
      k.mesh.position.y = 0.5 + Math.sin(k.bob) * 0.12;
      k.mesh.rotation.y += dt * 2;
    }
  }

  checkMedkitPickup(playerPos: Vector3): number {
    let healed = 0;
    this.medkits = this.medkits.filter(k => {
      if (Vector3.Distance(playerPos, k.mesh.position) < 1.5) {
        this.juice?.floatingText(k.mesh.position.add(new Vector3(0, 0.5, 0)), `+${MEDKIT_HEAL}`, '#44ff66');
        this.audio?.pickup();
        k.mesh.dispose();
        healed += MEDKIT_HEAL;
        return false;
      }
      return true;
    });
    return healed;
  }

  aliveCount(): number {
    return this.entries.filter(e => e.enemy.state !== EnemyState.Dead).length;
  }

  clearAll(): void {
    for (const e of this.entries) this._disposeEntry(e);
    for (const k of this.medkits) k.mesh.dispose();
    this.entries = [];
    this.medkits = [];
  }
}
