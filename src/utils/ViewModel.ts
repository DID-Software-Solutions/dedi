import {
  Scene, MeshBuilder, StandardMaterial, Color3, Vector3,
  TransformNode, type Camera, type TargetCamera, type Mesh,
} from '@babylonjs/core';
import { WeaponId } from '../types';

/**
 * First-person gun models, parented to the camera, with recoil + walk sway.
 * Every weapon is a dildo sized/shaped to its archetype: a shaft, a mushroom
 * glans, and a scrotum at the base. Distinct silhouettes read at a glance —
 * single pistol, twin-shaft shotgun, long ribbed rifle, fat buzzing SMG, and a
 * monstrous launcher.
 */
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
      [WeaponId.AssaultRifle]: 1.2,
      [WeaponId.SMG]: 0.75,
      [WeaponId.Launcher]: 1.3,
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
    // Glossy silicone sheen.
    m.specularColor = new Color3(0.6, 0.6, 0.65);
    m.specularPower = 96;
    return m;
  }

  private _cyl(name: string, diam: number, height: number, pos: Vector3, mat: StandardMaterial, parent: TransformNode, tessellation = 16): void {
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
    const s = MeshBuilder.CreateSphere(name, { diameter: diam, segments: 12 }, this.scene);
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

  /** A shaft tipped with a bulging mushroom glans + corona ridge — the dildo unit. */
  private _shaft(prefix: string, diam: number, len: number, baseZ: number, skin: StandardMaterial, parent: TransformNode): number {
    const midZ = baseZ + len / 2;
    const tipZ = baseZ + len;
    this._cyl(`${prefix}shaft`, diam, len, new Vector3(0, 0, midZ), skin, parent);
    // Corona ridge where the glans flares out.
    this._cyl(`${prefix}corona`, diam * 1.3, diam * 0.35, new Vector3(0, 0, tipZ - diam * 0.1), skin, parent);
    // Bulbous mushroom glans.
    this._sphere(`${prefix}glans`, diam * 1.35, new Vector3(0, 0, tipZ + diam * 0.2), skin, parent, new Vector3(1, 1, 1.15));
    return tipZ + diam * 0.4;
  }

  /** The scrotum at the base: twin sagging spheres under the shaft. */
  private _balls(prefix: string, diam: number, z: number, skin: StandardMaterial, parent: TransformNode): void {
    this._sphere(`${prefix}ballL`, diam, new Vector3(-diam * 0.4, -diam * 0.35, z), skin, parent, new Vector3(0.95, 1.1, 0.95));
    this._sphere(`${prefix}ballR`, diam, new Vector3(diam * 0.4, -diam * 0.35, z), skin, parent, new Vector3(0.95, 1.1, 0.95));
  }

  private _buildPistol(): TransformNode {
    const g = new TransformNode('vmPistol', this.scene);
    const skin = this._mat('vmPskin', new Color3(0.55, 0.3, 0.62));   // purple
    const grip = this._mat('vmPgrip', new Color3(0.12, 0.12, 0.14));
    // Classic single, medium length.
    this._shaft('vmP', 0.16, 0.5, 0.2, skin, g);
    this._balls('vmP', 0.17, 0.16, skin, g);
    this._box('vmPhandle', 0.07, 0.2, 0.1, new Vector3(0, -0.16, 0.06), grip, g);
    return g;
  }

  private _buildShotgun(): TransformNode {
    const g = new TransformNode('vmShotgun', this.scene);
    const skin = this._mat('vmSGskin', new Color3(0.2, 0.55, 0.55));  // teal
    const grip = this._mat('vmSGgrip', new Color3(0.1, 0.1, 0.12));
    // Twin parallel shafts — the double dildo.
    this._shaft('vmSGl', 0.14, 0.58, 0.2, skin, g);
    this._shaft('vmSGr', 0.14, 0.58, 0.2, skin, g);
    g.getChildMeshes().forEach((m) => {
      if (m.name.startsWith('vmSGl')) m.position.x = -0.09;
      if (m.name.startsWith('vmSGr')) m.position.x = 0.09;
    });
    this._balls('vmSG', 0.2, 0.18, skin, g);
    this._box('vmSGhandle', 0.08, 0.2, 0.1, new Vector3(0, -0.16, 0.08), grip, g);
    return g;
  }

  private _buildRifle(): TransformNode {
    const g = new TransformNode('vmAR', this.scene);
    const skin = this._mat('vmARskin', new Color3(0.85, 0.25, 0.5));  // hot pink
    const grip = this._mat('vmARgrip', new Color3(0.1, 0.11, 0.12));
    const ring = this._mat('vmARring', new Color3(0.6, 0.15, 0.35));
    // Long ribbed shaft.
    this._shaft('vmAR', 0.13, 0.9, 0.2, skin, g);
    for (let i = 0; i < 5; i++) {
      this._cyl(`vmARrib${i}`, 0.16, 0.045, new Vector3(0, 0, 0.34 + i * 0.13), ring, g);
    }
    this._balls('vmAR', 0.16, 0.16, skin, g);
    this._box('vmARmag', 0.08, 0.22, 0.12, new Vector3(0, -0.16, 0.3), grip, g);
    this._box('vmARhandle', 0.07, 0.16, 0.1, new Vector3(0, -0.13, 0.1), grip, g);
    return g;
  }

  private _buildSMG(): TransformNode {
    const g = new TransformNode('vmSMG', this.scene);
    const skin = this._mat('vmSMGskin', new Color3(0.8, 0.2, 0.7));   // magenta
    const grip = this._mat('vmSMGgrip', new Color3(0.1, 0.1, 0.12));
    const buzz = this._mat('vmSMGbuzz', new Color3(0.9, 0.8, 0.3), new Color3(0.6, 0.5, 0.15));
    // Stubby fat vibrator with a glowing buzz collar.
    this._shaft('vmSMG', 0.22, 0.4, 0.2, skin, g);
    this._cyl('vmSMGcollar', 0.28, 0.07, new Vector3(0, 0, 0.46), buzz, g);
    this._balls('vmSMG', 0.2, 0.16, skin, g);
    this._box('vmSMGmag', 0.08, 0.26, 0.1, new Vector3(0, -0.18, 0.28), grip, g);
    this._box('vmSMGhandle', 0.07, 0.16, 0.1, new Vector3(0, -0.12, 0.1), grip, g);
    return g;
  }

  private _buildLauncher(): TransformNode {
    const g = new TransformNode('vmLauncher', this.scene);
    const skin = this._mat('vmLskin', new Color3(0.5, 0.1, 0.12));    // deep red
    const grip = this._mat('vmLgrip', new Color3(0.1, 0.1, 0.12));
    const warn = this._mat('vmLwarn', new Color3(0.9, 0.4, 0.1), new Color3(0.7, 0.25, 0.05));
    // Monstrous thick shaft, biggest glans of all.
    this._shaft('vmL', 0.34, 0.75, 0.1, skin, g);
    this._cyl('vmLband', 0.4, 0.09, new Vector3(0, 0, 0.5), warn, g);
    this._balls('vmL', 0.3, 0.05, skin, g);
    this._box('vmLhandle', 0.09, 0.2, 0.12, new Vector3(0, -0.22, 0.25), grip, g);
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
