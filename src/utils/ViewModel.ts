import {
  Scene, MeshBuilder, StandardMaterial, Color3, Vector3,
  TransformNode, type Camera, type TargetCamera, type Mesh,
} from '@babylonjs/core';
import { WeaponId } from '../types';

/** First-person gun model parented to the camera, with recoil + walk sway. */
export class ViewModel {
  private scene: Scene;
  private root: TransformNode;
  /** One distinct model per weapon, keyed by WeaponId. */
  private groups: Record<WeaponId, TransformNode>;
  /** Per-weapon muzzle z-offset so flashes/tracers leave the tip. */
  private muzzleZ: Record<WeaponId, number>;
  /** World-space gun tip; muzzle flash + tracers originate here. */
  muzzle: TransformNode;

  private recoil = 0;
  private bobPhase = 0;
  private basePos = new Vector3(0.32, -0.32, 0.9);

  constructor(scene: Scene, camera: Camera) {
    this.scene = scene;
    this.root = new TransformNode('vmRoot', scene);
    this.root.parent = camera as TargetCamera;
    this.root.position = this.basePos.clone();

    this.groups = {
      [WeaponId.Pistol]: this._buildPistol(),
      [WeaponId.Shotgun]: this._buildShotgun(),
      [WeaponId.AssaultRifle]: this._buildRifle(),
      [WeaponId.SMG]: this._buildSMG(),
      [WeaponId.Launcher]: this._buildLauncher(),
    };
    this.muzzleZ = {
      [WeaponId.Pistol]: 0.85,
      [WeaponId.Shotgun]: 1.0,
      [WeaponId.AssaultRifle]: 1.15,
      [WeaponId.SMG]: 0.8,
      [WeaponId.Launcher]: 1.25,
    };
    for (const id of Object.keys(this.groups) as WeaponId[]) {
      this.groups[id].parent = this.root;
      this.groups[id].setEnabled(false);
    }
    this.groups[WeaponId.Pistol].setEnabled(true);

    this.muzzle = new TransformNode('vmMuzzle', scene);
    this.muzzle.parent = this.root;
    this.muzzle.position = new Vector3(0, 0.02, this.muzzleZ[WeaponId.Pistol]);
  }

  private _mat(name: string, color: Color3, emissive = new Color3(0, 0, 0)): StandardMaterial {
    const m = new StandardMaterial(name, this.scene);
    m.diffuseColor = color;
    m.emissiveColor = emissive;
    m.specularColor = new Color3(0.35, 0.35, 0.4);
    m.specularPower = 64;
    return m;
  }

  private _cyl(name: string, diam: number, height: number, pos: Vector3, mat: StandardMaterial, parent: TransformNode, tessellation = 12): void {
    const c = MeshBuilder.CreateCylinder(name, { diameter: diam, height, tessellation }, this.scene);
    // Lay the cylinder along +Z (forward) instead of its default +Y.
    c.rotation.x = Math.PI / 2;
    c.position = pos;
    c.material = mat;
    c.isPickable = false;
    c.parent = parent;
    c.renderingGroupId = 1;
  }

  private _sphere(name: string, diam: number, pos: Vector3, mat: StandardMaterial, parent: TransformNode, scale?: Vector3): Mesh {
    const s = MeshBuilder.CreateSphere(name, { diameter: diam, segments: 10 }, this.scene);
    s.position = pos;
    s.material = mat;
    s.isPickable = false;
    s.parent = parent;
    s.renderingGroupId = 1;
    if (scale) s.scaling = scale;
    return s;
  }

  private _box(name: string, w: number, h: number, d: number, pos: Vector3, mat: StandardMaterial, parent: TransformNode): void {
    const b = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, this.scene);
    b.position = pos;
    b.material = mat;
    b.isPickable = false;
    b.parent = parent;
    b.renderingGroupId = 1;
  }

  // Each weapon is an abstract rounded silhouette: a shaft (cylinder), a rounded
  // tip (sphere), and a grip. Distinct proportions make them readable at a glance.

  private _buildPistol(): TransformNode {
    const g = new TransformNode('vmPistol', this.scene);
    const skin = this._mat('vmPskin', new Color3(0.55, 0.3, 0.5));
    const grip = this._mat('vmPgrip', new Color3(0.12, 0.12, 0.14));
    this._cyl('vmPshaft', 0.13, 0.5, new Vector3(0, 0.02, 0.45), skin, g);
    this._sphere('vmPtip', 0.16, new Vector3(0, 0.02, 0.72), skin, g, new Vector3(1, 1, 1.25));
    this._sphere('vmPballs', 0.16, new Vector3(0, -0.06, 0.18), grip, g, new Vector3(1.4, 1, 0.7));
    this._box('vmPhandle', 0.07, 0.2, 0.1, new Vector3(0, -0.16, 0.06), grip, g);
    return g;
  }

  private _buildShotgun(): TransformNode {
    const g = new TransformNode('vmShotgun', this.scene);
    const skin = this._mat('vmSGskin', new Color3(0.5, 0.28, 0.46));
    const grip = this._mat('vmSGgrip', new Color3(0.1, 0.1, 0.12));
    // Twin parallel shafts (double barrel).
    for (const x of [-0.08, 0.08]) {
      this._cyl(`vmSGbarrel${x}`, 0.12, 0.6, new Vector3(x, 0.02, 0.5), skin, g);
      this._sphere(`vmSGtip${x}`, 0.15, new Vector3(x, 0.02, 0.82), skin, g, new Vector3(1, 1, 1.2));
    }
    this._sphere('vmSGballs', 0.2, new Vector3(0, -0.05, 0.2), grip, g, new Vector3(1.6, 1, 0.8));
    this._box('vmSGhandle', 0.08, 0.2, 0.1, new Vector3(0, -0.16, 0.08), grip, g);
    return g;
  }

  private _buildRifle(): TransformNode {
    const g = new TransformNode('vmAR', this.scene);
    const skin = this._mat('vmARskin', new Color3(0.45, 0.25, 0.42));
    const grip = this._mat('vmARgrip', new Color3(0.1, 0.11, 0.12));
    const ring = this._mat('vmARring', new Color3(0.2, 0.5, 0.3), new Color3(0.1, 0.4, 0.2));
    // Long ribbed shaft.
    this._cyl('vmARshaft', 0.12, 0.85, new Vector3(0, 0.02, 0.55), skin, g);
    this._sphere('vmARtip', 0.15, new Vector3(0, 0.02, 1.0), skin, g, new Vector3(1, 1, 1.4));
    for (let i = 0; i < 3; i++) {
      this._cyl(`vmARrib${i}`, 0.15, 0.04, new Vector3(0, 0.02, 0.35 + i * 0.18), ring, g);
    }
    this._box('vmARmag', 0.08, 0.22, 0.12, new Vector3(0, -0.16, 0.3), grip, g);
    this._box('vmARhandle', 0.07, 0.16, 0.1, new Vector3(0, -0.13, 0.1), grip, g);
    return g;
  }

  private _buildSMG(): TransformNode {
    const g = new TransformNode('vmSMG', this.scene);
    const skin = this._mat('vmSMGskin', new Color3(0.6, 0.35, 0.55));
    const grip = this._mat('vmSMGgrip', new Color3(0.1, 0.1, 0.12));
    const buzz = this._mat('vmSMGbuzz', new Color3(0.7, 0.6, 0.2), new Color3(0.5, 0.4, 0.1));
    // Stubby fat shaft with a glowing "buzz" collar.
    this._cyl('vmSMGshaft', 0.18, 0.42, new Vector3(0, 0.02, 0.42), skin, g);
    this._sphere('vmSMGtip', 0.21, new Vector3(0, 0.02, 0.66), skin, g, new Vector3(1, 1, 1.1));
    this._cyl('vmSMGcollar', 0.24, 0.06, new Vector3(0, 0.02, 0.5), buzz, g);
    this._box('vmSMGmag', 0.08, 0.26, 0.1, new Vector3(0, -0.18, 0.28), grip, g);
    this._box('vmSMGhandle', 0.07, 0.16, 0.1, new Vector3(0, -0.12, 0.1), grip, g);
    return g;
  }

  private _buildLauncher(): TransformNode {
    const g = new TransformNode('vmLauncher', this.scene);
    const skin = this._mat('vmLskin', new Color3(0.5, 0.26, 0.44));
    const grip = this._mat('vmLgrip', new Color3(0.1, 0.1, 0.12));
    const warn = this._mat('vmLwarn', new Color3(0.7, 0.3, 0.1), new Color3(0.6, 0.2, 0.05));
    // Thick heavy tube with a bulbous head.
    this._cyl('vmLtube', 0.3, 0.8, new Vector3(0, 0.0, 0.5), skin, g, 16);
    this._sphere('vmLhead', 0.4, new Vector3(0, 0.0, 0.95), skin, g, new Vector3(1, 1, 1.2));
    this._cyl('vmLband', 0.36, 0.08, new Vector3(0, 0, 0.55), warn, g, 16);
    this._box('vmLhandle', 0.09, 0.2, 0.12, new Vector3(0, -0.2, 0.25), grip, g);
    return g;
  }

  setWeapon(id: WeaponId): void {
    for (const key of Object.keys(this.groups) as WeaponId[]) {
      this.groups[key].setEnabled(key === id);
    }
    this.muzzle.position.z = this.muzzleZ[id];
  }

  kick(): void {
    this.recoil = Math.min(0.12, this.recoil + 0.05);
  }

  update(dt: number, moving: boolean): void {
    // Recoil decays back to rest.
    this.recoil *= Math.max(0, 1 - dt * 12);
    // Walk bob.
    if (moving) this.bobPhase += dt * 10; else this.bobPhase += dt * 2;
    const bobX = Math.cos(this.bobPhase) * (moving ? 0.012 : 0.003);
    const bobY = Math.abs(Math.sin(this.bobPhase)) * (moving ? 0.015 : 0.004);

    this.root.position.x = this.basePos.x + bobX;
    this.root.position.y = this.basePos.y + bobY + this.recoil * 0.3;
    this.root.position.z = this.basePos.z - this.recoil;
    this.root.rotation.x = -this.recoil * 2.5;
  }

  dispose(): void {
    this.root.dispose(false, true);
  }
}
