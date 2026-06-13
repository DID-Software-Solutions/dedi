import {
  Scene, MeshBuilder, StandardMaterial, Color3, Vector3,
  TransformNode, type Camera, type TargetCamera,
} from '@babylonjs/core';
import { WeaponId } from '../types';

/** First-person gun model parented to the camera, with recoil + walk sway. */
export class ViewModel {
  private scene: Scene;
  private root: TransformNode;
  private arGroup: TransformNode;
  private pistolGroup: TransformNode;
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

    this.arGroup = this._buildRifle();
    this.pistolGroup = this._buildPistol();
    this.arGroup.parent = this.root;
    this.pistolGroup.parent = this.root;
    this.pistolGroup.setEnabled(false);

    this.muzzle = new TransformNode('vmMuzzle', scene);
    this.muzzle.parent = this.root;
    this.muzzle.position = new Vector3(0, 0.02, 1.0);
  }

  private _mat(name: string, color: Color3, emissive = new Color3(0, 0, 0)): StandardMaterial {
    const m = new StandardMaterial(name, this.scene);
    m.diffuseColor = color;
    m.emissiveColor = emissive;
    m.specularColor = new Color3(0.2, 0.2, 0.2);
    return m;
  }

  private _box(name: string, w: number, h: number, d: number, pos: Vector3, mat: StandardMaterial, parent: TransformNode): void {
    const b = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, this.scene);
    b.position = pos;
    b.material = mat;
    b.isPickable = false;
    b.parent = parent;
    b.renderingGroupId = 1; // draw on top, never clipped by world
  }

  private _buildRifle(): TransformNode {
    const g = new TransformNode('vmAR', this.scene);
    const body = this._mat('vmARbody', new Color3(0.1, 0.11, 0.12));
    const accent = this._mat('vmARaccent', new Color3(0.15, 0.4, 0.25), new Color3(0.1, 0.4, 0.2));
    this._box('vmARreceiver', 0.12, 0.14, 0.7, new Vector3(0, 0, 0.2), body, g);
    this._box('vmARbarrel', 0.06, 0.06, 0.5, new Vector3(0, 0.03, 0.6), body, g);
    this._box('vmARmag', 0.08, 0.22, 0.12, new Vector3(0, -0.16, 0.15), body, g);
    this._box('vmARgrip', 0.07, 0.16, 0.1, new Vector3(0, -0.13, -0.05), body, g);
    this._box('vmARsight', 0.03, 0.05, 0.18, new Vector3(0, 0.1, 0.25), accent, g);
    return g;
  }

  private _buildPistol(): TransformNode {
    const g = new TransformNode('vmPistol', this.scene);
    const body = this._mat('vmPbody', new Color3(0.12, 0.12, 0.14));
    this._box('vmPslide', 0.08, 0.1, 0.34, new Vector3(0, 0.02, 0.2), body, g);
    this._box('vmPgrip', 0.07, 0.2, 0.1, new Vector3(0, -0.16, 0.02), body, g);
    return g;
  }

  setWeapon(id: WeaponId): void {
    const isAR = id === WeaponId.AssaultRifle;
    this.arGroup.setEnabled(isAR);
    this.pistolGroup.setEnabled(!isAR);
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
