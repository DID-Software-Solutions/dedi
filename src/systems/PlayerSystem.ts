import {
  Scene, UniversalCamera, Vector3, Ray, KeyboardEventTypes,
} from '@babylonjs/core';
import { Player } from '../entities/Player';
import { WeaponSystem } from './WeaponSystem';
import { ViewModel } from '../utils/ViewModel';
import { WeaponId } from '../types';
import type { Juice } from '../utils/Juice';
import type { ProceduralAudio } from '../utils/ProceduralAudio';

const SPEED_NORMAL = 12;
const SPEED_SPRINT = 19.2;
const SPEED_CROUCH = 7.2;
const CAMERA_NORMAL_Y = 1.7;
const CAMERA_CROUCH_Y = 0.9;

export type ShootHit = (meshId: string, damage: number, hitPoint: Vector3) => void;

export class PlayerSystem {
  camera: UniversalCamera;
  player: Player;
  weapon: WeaponSystem;
  viewModel: ViewModel;

  private scene: Scene;
  private canvas: HTMLCanvasElement;
  private keys = new Set<string>();
  private isSprinting = false;
  private isCrouching = false;
  private mouseDown = false;
  private enabled = false;
  private recoilKick = 0;
  private footstepTimer = 0;
  private _onWindowKey: ((e: KeyboardEvent) => void) | null = null;

  private juice!: Juice;
  private audio!: ProceduralAudio;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.scene = scene;
    this.canvas = canvas;
    this.player = new Player();
    this.weapon = new WeaponSystem();

    this.camera = new UniversalCamera('playerCam', new Vector3(0, CAMERA_NORMAL_Y, 0), scene);
    this.camera.minZ = 0.05;
    this.camera.fov = 1.22; // ~70deg
    this.camera.setTarget(new Vector3(0, CAMERA_NORMAL_Y, 1));
    scene.activeCamera = this.camera;

    this.viewModel = new ViewModel(scene, this.camera);

    this._bindKeys();
    this._bindMouse();
  }

  setDeps(juice: Juice, audio: ProceduralAudio): void {
    this.juice = juice;
    this.audio = audio;
  }

  enable(): void {
    this.enabled = true;
    try { this.canvas.requestPointerLock(); } catch { /* headless / sandboxed */ }
  }

  disable(): void {
    this.enabled = false;
    try {
      if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    } catch { /* headless */ }
  }

  dispose(): void {
    this.disable();
    if (this._onWindowKey) window.removeEventListener('keydown', this._onWindowKey);
    this.viewModel.dispose();
    this.camera.dispose();
  }

  reset(): void {
    this.player = new Player();
    this.weapon = new WeaponSystem();
    this.camera.position = new Vector3(0, CAMERA_NORMAL_Y, 0);
    this.camera.setTarget(new Vector3(0, CAMERA_NORMAL_Y, 1));
    this.keys.clear();
    this.mouseDown = false;
  }

  private _bindKeys(): void {
    this.scene.onKeyboardObservable.add((info) => {
      if (!this.enabled) return;
      const key = info.event.code;
      if (info.type === KeyboardEventTypes.KEYDOWN) this.keys.add(key);
      if (info.type === KeyboardEventTypes.KEYUP) this.keys.delete(key);
      this.isSprinting = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      this.isCrouching = this.keys.has('ControlLeft') || this.keys.has('ControlRight');
    });

    this._onWindowKey = (e: KeyboardEvent) => {
      if (!this.enabled) return;
      if (e.code === 'KeyR') {
        const before = this.weapon.isReloading;
        this.weapon.startReload();
        if (!before && this.weapon.isReloading) this.audio?.reload();
      }
      if (e.code === 'KeyF') {
        this.weapon.switchWeapon();
        this.viewModel.setWeapon(this.weapon.currentWeapon);
        this.audio?.reload();
      }
    };
    window.addEventListener('keydown', this._onWindowKey);
  }

  private _bindMouse(): void {
    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (e.button === 0) this.mouseDown = true;
    });
    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
    });
    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.enabled || document.pointerLockElement !== this.canvas) return;
      const sensitivity = 0.002;
      this.camera.rotation.y += e.movementX * sensitivity;
      this.camera.rotation.x += e.movementY * sensitivity;
      this.camera.rotation.x = Math.max(-1.4, Math.min(1.4, this.camera.rotation.x));
    });
    this.canvas.addEventListener('click', () => {
      if (this.enabled && document.pointerLockElement !== this.canvas) {
        try { this.canvas.requestPointerLock(); } catch { /* headless */ }
      }
    });
  }

  update(dt: number, onHit: ShootHit): void {
    if (!this.enabled) return;
    this.weapon.update(dt);

    const speed = this.isCrouching ? SPEED_CROUCH : this.isSprinting ? SPEED_SPRINT : SPEED_NORMAL;
    const fwd = this.camera.getForwardRay(1).direction;
    const right = Vector3.Cross(fwd, Vector3.Up()).normalize();
    fwd.y = 0; fwd.normalize();

    const move = Vector3.Zero();
    if (this.keys.has('KeyW')) move.addInPlace(fwd);
    if (this.keys.has('KeyS')) move.subtractInPlace(fwd);
    if (this.keys.has('KeyA')) move.subtractInPlace(right);
    if (this.keys.has('KeyD')) move.addInPlace(right);
    const moving = move.lengthSquared() > 0;
    if (moving) {
      move.normalize().scaleInPlace(speed * dt);
      this.camera.position.addInPlace(move);
      // Footstep ticks scaled to pace.
      this.footstepTimer -= dt;
      if (this.footstepTimer <= 0) {
        this.audio?.footstep();
        this.footstepTimer = this.isSprinting ? 0.32 : 0.45;
      }
    }

    const boundary = 37;
    this.camera.position.x = Math.max(-boundary, Math.min(boundary, this.camera.position.x));
    this.camera.position.z = Math.max(-boundary, Math.min(boundary, this.camera.position.z));

    const targetY = this.isCrouching ? CAMERA_CROUCH_Y : CAMERA_NORMAL_Y;
    let camY = this.camera.position.y + (targetY - this.camera.position.y) * 10 * dt;

    // Camera recoil + screen shake.
    this.recoilKick *= Math.max(0, 1 - dt * 14);
    const shake = this.juice ? this.juice.getShakeOffset(dt) : Vector3.Zero();
    this.camera.position.x += shake.x;
    this.camera.position.z += shake.z;
    this.camera.position.y = camY + shake.y;
    this.camera.rotation.x -= this.recoilKick * dt * 4;

    if (this.mouseDown && this.weapon.canFire()) {
      this.weapon.fire();
      this._doShoot(onHit);
    }

    this.viewModel.update(dt, moving);
  }

  private _doShoot(onHit: ShootHit): void {
    const origin = this.camera.position.clone();
    const dir = this.camera.getForwardRay(1).direction.normalize();
    const ray = new Ray(origin, dir, 200);
    const hit = this.scene.pickWithRay(ray, (m) =>
      m.isPickable && m.isEnabled() && (m.name.startsWith('enemy_') || m.name.startsWith('building') || m.name.startsWith('crate')));

    const muzzlePos = this.viewModel.muzzle.getAbsolutePosition();
    const endPoint = hit?.hit && hit.pickedPoint ? hit.pickedPoint : origin.add(dir.scale(200));

    // Feedback: audio, recoil, muzzle flash, tracer.
    this.audio?.shoot(this.weapon.currentWeapon === WeaponId.AssaultRifle ? 'ar' : 'pistol');
    this.recoilKick = Math.min(0.08, this.recoilKick + 0.04);
    this.viewModel.kick();
    this.juice?.muzzleFlash(muzzlePos, dir);
    this.juice?.tracer(muzzlePos, endPoint);

    if (hit?.hit && hit.pickedMesh && hit.pickedPoint) {
      if (hit.pickedMesh.name.startsWith('enemy_')) {
        onHit(hit.pickedMesh.name, this.weapon.currentDamage, hit.pickedPoint.clone());
      } else {
        this.juice?.impact(hit.pickedPoint.clone(), hit.getNormal(true) ?? dir.scale(-1));
      }
    }
  }
}
