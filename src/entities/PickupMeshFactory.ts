import {
  Scene, MeshBuilder, StandardMaterial, Color3, Vector3, Mesh,
} from '@babylonjs/core';
import { PickupType } from '../types';

/** Signature colour + label for every pickup type (HUD + radar + floating text). */
export const PICKUP_INFO: Record<PickupType, { color: Color3; label: string; tag: string }> = {
  [PickupType.Health]:     { color: new Color3(0.15, 0.9, 0.25), label: 'HEALTH',     tag: 'HP' },
  [PickupType.Ammo]:       { color: new Color3(0.95, 0.8, 0.2),  label: 'AMMO',       tag: 'AMMO' },
  [PickupType.Attack]:     { color: new Color3(1, 0.25, 0.2),    label: 'ATTACK UP',  tag: 'ATK' },
  [PickupType.Defense]:    { color: new Color3(0.3, 0.55, 1),    label: 'DEFENSE UP', tag: 'DEF' },
  [PickupType.Speed]:      { color: new Color3(0.2, 1, 0.95),    label: 'SPEED UP',   tag: 'SPD' },
  [PickupType.FireRate]:   { color: new Color3(1, 0.55, 0.1),    label: 'FIRE RATE UP', tag: 'ROF' },
  [PickupType.CritChance]: { color: new Color3(0.8, 0.3, 1),     label: 'CRIT CHANCE UP', tag: 'CRIT%' },
  [PickupType.CritHit]:    { color: new Color3(1, 0.2, 0.6),     label: 'CRIT DMG UP', tag: 'CRITx' },
};

function mat(scene: Scene, name: string, color: Color3, emissive: number): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = color;
  m.emissiveColor = color.scale(emissive);
  return m;
}

/**
 * Build a pickup mesh. The returned root is the bobbing/spinning anchor; all
 * sub-parts are parented to it so EnemySystem only animates/disposes the root.
 */
export function buildPickupMesh(scene: Scene, type: PickupType, pos: Vector3): Mesh {
  const info = PICKUP_INFO[type];
  const root = new Mesh(`pickup_${type}`, scene);
  root.position = pos.clone();
  root.isPickable = false;

  if (type === PickupType.Health) {
    // Green box with a raised white cross on its faces.
    const box = MeshBuilder.CreateBox('hpbox', { size: 0.5 }, scene);
    box.material = mat(scene, 'hpboxMat', info.color, 0.5);
    box.parent = root;
    const white = mat(scene, 'hpcrossMat', new Color3(1, 1, 1), 0.7);
    const bar = MeshBuilder.CreateBox('hpv', { width: 0.14, height: 0.42, depth: 0.54 }, scene);
    bar.material = white; bar.parent = root;
    const bar2 = MeshBuilder.CreateBox('hph', { width: 0.42, height: 0.14, depth: 0.54 }, scene);
    bar2.material = white; bar2.parent = root;
    return root;
  }

  if (type === PickupType.Ammo) {
    // Bullet: brass casing cylinder + copper ogive tip.
    const casing = MeshBuilder.CreateCylinder('ammoCase', { height: 0.42, diameter: 0.22 }, scene);
    casing.material = mat(scene, 'ammoCaseMat', new Color3(0.85, 0.65, 0.15), 0.35);
    casing.parent = root;
    const tip = MeshBuilder.CreateCylinder('ammoTip', { height: 0.22, diameterTop: 0, diameterBottom: 0.22 }, scene);
    tip.material = mat(scene, 'ammoTipMat', new Color3(0.8, 0.45, 0.2), 0.4);
    tip.position.y = 0.32;
    tip.parent = root;
    root.rotation.z = Math.PI / 2; // lay it on its side
    return root;
  }

  // Buff: glowing coloured octahedron gem.
  const gem = MeshBuilder.CreatePolyhedron('buffGem', { type: 1, size: 0.32 }, scene);
  gem.material = mat(scene, `buffMat_${type}`, info.color, 0.85);
  gem.parent = root;
  return root;
}
