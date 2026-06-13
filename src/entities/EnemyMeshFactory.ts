import {
  Scene, MeshBuilder, StandardMaterial, Color3, Vector3,
  TransformNode, type Mesh,
} from '@babylonjs/core';
import { EnemyType } from '../types';

export interface EnemyRig {
  /** Invisible pickable hitbox; name === enemy id. EnemySystem moves this. */
  collider: Mesh;
  /** Visual root, parented to collider, origin at the enemy's feet. */
  root: TransformNode;
  head: TransformNode;
  leftLeg: TransformNode;
  rightLeg: TransformNode;
  leftArm: TransformNode;
  rightArm: TransformNode;
  /** World-space muzzle position for ranged attacks. */
  muzzle: TransformNode;
  eyeMat: StandardMaterial;
  bodyMat: StandardMaterial;
  trimMat: StandardMaterial;
  parts: Mesh[];
  height: number;
}

interface TypeStyle {
  height: number;
  width: number;
  body: Color3;
  trim: Color3;
  eye: Color3;
}

const STYLES: Record<EnemyType, TypeStyle> = {
  [EnemyType.Grunt]: {
    height: 1.8, width: 0.55,
    body: new Color3(0.2, 0.28, 0.18), trim: new Color3(0.4, 0.55, 0.3), eye: new Color3(0.3, 1, 0.4),
  },
  [EnemyType.Rusher]: {
    height: 1.6, width: 0.42,
    body: new Color3(0.5, 0.42, 0.08), trim: new Color3(1, 0.7, 0.1), eye: new Color3(1, 0.85, 0.2),
  },
  [EnemyType.Heavy]: {
    height: 2.3, width: 0.95,
    body: new Color3(0.45, 0.16, 0.1), trim: new Color3(1, 0.35, 0.15), eye: new Color3(1, 0.3, 0.2),
  },
  [EnemyType.Spitter]: {
    height: 1.75, width: 0.5,
    body: new Color3(0.32, 0.16, 0.42), trim: new Color3(0.7, 0.3, 1), eye: new Color3(0.8, 0.4, 1),
  },
  [EnemyType.Boss]: {
    height: 4.0, width: 2.6,
    body: new Color3(0.9, 0.72, 0.68), trim: new Color3(1, 0.5, 0.6), eye: new Color3(1, 0.3, 0.45),
  },
};

function makeMaterials(scene: Scene, id: string, st: TypeStyle): {
  bodyMat: StandardMaterial; trimMat: StandardMaterial; eyeMat: StandardMaterial;
} {
  const bodyMat = new StandardMaterial(`${id}_body`, scene);
  bodyMat.diffuseColor = st.body;
  bodyMat.specularColor = new Color3(0.45, 0.48, 0.55);
  bodyMat.specularPower = 48;
  bodyMat.emissiveColor = st.body.scale(0.06);

  const trimMat = new StandardMaterial(`${id}_trim`, scene);
  trimMat.diffuseColor = st.trim.scale(0.4);
  trimMat.emissiveColor = st.trim.scale(0.55);
  trimMat.specularColor = new Color3(0.6, 0.6, 0.6);

  const eyeMat = new StandardMaterial(`${id}_eye`, scene);
  eyeMat.emissiveColor = st.eye;
  eyeMat.disableLighting = true;

  return { bodyMat, trimMat, eyeMat };
}

export function buildEnemyRig(scene: Scene, id: string, type: EnemyType, ranged: boolean): EnemyRig {
  if (type === EnemyType.Boss) return buildBossRig(scene, id);

  const st = STYLES[type];
  const h = st.height;
  const parts: Mesh[] = [];

  // Invisible capsule hitbox — this is what gets ray-picked and moved.
  const collider = MeshBuilder.CreateCapsule(id, { radius: st.width / 2, height: h }, scene);
  collider.visibility = 0;
  collider.isPickable = true;

  const root = new TransformNode(`${id}_root`, scene);
  root.parent = collider;
  root.position.y = -h / 2; // collider origin is its centre; put feet at local 0

  const { bodyMat, trimMat, eyeMat } = makeMaterials(scene, id, st);

  const box = (name: string, opts: { w: number; h: number; d: number }, mat: StandardMaterial, parent: TransformNode, pos: Vector3): Mesh => {
    const m = MeshBuilder.CreateBox(`${id}_${name}`, { width: opts.w, height: opts.h, depth: opts.d }, scene);
    m.material = mat; m.parent = parent; m.position = pos; m.isPickable = false;
    parts.push(m);
    return m;
  };
  const sphere = (name: string, diam: number, mat: StandardMaterial, parent: TransformNode, pos: Vector3, scaleYZ?: Vector3): Mesh => {
    const m = MeshBuilder.CreateSphere(`${id}_${name}`, { diameter: diam, segments: 10 }, scene);
    m.material = mat; m.parent = parent; m.position = pos; m.isPickable = false;
    if (scaleYZ) m.scaling = scaleYZ;
    parts.push(m);
    return m;
  };

  const legH = h * 0.42;
  const torsoH = h * 0.4;
  const headH = h * 0.18;
  const hipY = legH;
  const shoulderY = legH + torsoH * 0.85;

  // Rounded organic torso: a vertically-stretched sphere instead of a hard box.
  sphere('torso', st.width, bodyMat, root, new Vector3(0, hipY + torsoH / 2, 0),
    new Vector3(1, (torsoH / st.width) * 1.05, 0.78));
  // Glowing trim band around the midriff.
  sphere('band', st.width * 1.06, trimMat, root, new Vector3(0, hipY + torsoH * 0.72, 0),
    new Vector3(1, 0.28, 0.82));

  // Domed head (rounded tip) with a glowing eye visor.
  const head = new TransformNode(`${id}_headNode`, scene);
  head.parent = root;
  head.position = new Vector3(0, hipY + torsoH + headH / 2, 0);
  sphere('head', headH * 1.15, bodyMat, head, Vector3.Zero(), new Vector3(0.85, 1.15, 0.85));
  box('visor', { w: st.width * 0.42, h: headH * 0.26, d: 0.06 }, eyeMat, head, new Vector3(0, 0, headH * 0.5));

  // Legs pivoting at the hip (rounded capsule limbs).
  const legW = st.width * 0.34;
  const limb = (name: string, w: number, len: number, mat: StandardMaterial, parent: TransformNode): Mesh => {
    const m = MeshBuilder.CreateCapsule(`${id}_${name}`, { radius: w / 2, height: len }, scene);
    m.material = mat; m.parent = parent; m.position = new Vector3(0, -len / 2, 0); m.isPickable = false;
    parts.push(m);
    return m;
  };
  const leftLeg = new TransformNode(`${id}_lleg`, scene);
  leftLeg.parent = root; leftLeg.position = new Vector3(-st.width * 0.25, hipY, 0);
  limb('llegMesh', legW, legH, bodyMat, leftLeg);
  const rightLeg = new TransformNode(`${id}_rleg`, scene);
  rightLeg.parent = root; rightLeg.position = new Vector3(st.width * 0.25, hipY, 0);
  limb('rlegMesh', legW, legH, bodyMat, rightLeg);

  // Arms pivoting at the shoulder.
  const armH = torsoH * 0.95;
  const armW = st.width * 0.28;
  const leftArm = new TransformNode(`${id}_larm`, scene);
  leftArm.parent = root; leftArm.position = new Vector3(-st.width * 0.62, shoulderY, 0);
  limb('larmMesh', armW, armH, bodyMat, leftArm);
  const rightArm = new TransformNode(`${id}_rarm`, scene);
  rightArm.parent = root; rightArm.position = new Vector3(st.width * 0.62, shoulderY, 0);
  limb('rarmMesh', armW, armH, bodyMat, rightArm);

  // Shoulder caps on the Heavy for silhouette.
  if (type === EnemyType.Heavy) {
    sphere('lpad', st.width * 0.5, trimMat, root, new Vector3(-st.width * 0.55, shoulderY, 0), new Vector3(1, 0.7, 1));
    sphere('rpad', st.width * 0.5, trimMat, root, new Vector3(st.width * 0.55, shoulderY, 0), new Vector3(1, 0.7, 1));
  }

  // Ranged enemies carry a glowing cannon on the right arm; melee enemies
  // get an invisible head-mounted muzzle node (unused, but keeps the rig shape).
  const muzzle = new TransformNode(`${id}_muzzle`, scene);
  if (ranged) {
    const gun = sphere('gun', armW * 1.5, eyeMat, rightArm, new Vector3(0, -armH * 0.6, armH * 0.45),
      new Vector3(1, 1, 1.6));
    gun.material = eyeMat;
    muzzle.parent = rightArm;
    muzzle.position = new Vector3(0, -armH * 0.6, armH * 0.9);
  } else {
    muzzle.parent = head;
    muzzle.position = new Vector3(0, 0, st.width * 0.4);
  }

  return {
    collider, root, head, leftLeg, rightLeg, leftArm, rightArm, muzzle,
    eyeMat, bodyMat, trimMat, parts, height: h,
  };
}

/**
 * Mini-boss rig (waves 5/10/15). A large rounded twin-lobe form on a base, with
 * a central glowing muzzle. Limb nodes are present-but-empty so EnemySystem's
 * shared locomotion animation runs harmlessly (the boss has no walk cycle mesh).
 */
function buildBossRig(scene: Scene, id: string): EnemyRig {
  const st = STYLES[EnemyType.Boss];
  const h = st.height;
  const parts: Mesh[] = [];

  const collider = MeshBuilder.CreateCapsule(id, { radius: st.width / 2, height: h }, scene);
  collider.visibility = 0;
  collider.isPickable = true;

  const root = new TransformNode(`${id}_root`, scene);
  root.parent = collider;
  root.position.y = -h / 2;

  const { bodyMat, trimMat, eyeMat } = makeMaterials(scene, id, st);

  const sphere = (name: string, diam: number, mat: StandardMaterial, pos: Vector3, scale?: Vector3): Mesh => {
    const m = MeshBuilder.CreateSphere(`${id}_${name}`, { diameter: diam, segments: 14 }, scene);
    m.material = mat; m.parent = root; m.position = pos; m.isPickable = false;
    if (scale) m.scaling = scale;
    parts.push(m);
    return m;
  };

  // Broad rounded base/mound.
  sphere('base', st.width * 1.5, bodyMat, new Vector3(0, h * 0.28, 0), new Vector3(1, 0.55, 1));
  // Twin lobes (the silhouette).
  const lobeD = st.width * 0.95;
  const lobeY = h * 0.55;
  sphere('lobeL', lobeD, bodyMat, new Vector3(-st.width * 0.42, lobeY, st.width * 0.12));
  sphere('lobeR', lobeD, bodyMat, new Vector3(st.width * 0.42, lobeY, st.width * 0.12));
  // Glowing tips on each lobe.
  sphere('tipL', lobeD * 0.3, trimMat, new Vector3(-st.width * 0.42, lobeY, st.width * 0.12 + lobeD * 0.45));
  sphere('tipR', lobeD * 0.3, trimMat, new Vector3(st.width * 0.42, lobeY, st.width * 0.12 + lobeD * 0.45));

  // Head node sits at the crest; carries the menacing eye band.
  const head = new TransformNode(`${id}_headNode`, scene);
  head.parent = root;
  head.position = new Vector3(0, h * 0.82, 0);
  const eye = MeshBuilder.CreateBox(`${id}_visor`, { width: st.width * 0.7, height: 0.18, depth: 0.1 }, scene);
  eye.material = eyeMat; eye.parent = head; eye.position = new Vector3(0, 0, st.width * 0.45); eye.isPickable = false;
  parts.push(eye);

  // Empty limb nodes so the shared locomotion animation is a harmless no-op.
  const leftLeg = new TransformNode(`${id}_lleg`, scene); leftLeg.parent = root;
  const rightLeg = new TransformNode(`${id}_rleg`, scene); rightLeg.parent = root;
  const leftArm = new TransformNode(`${id}_larm`, scene); leftArm.parent = root;
  const rightArm = new TransformNode(`${id}_rarm`, scene); rightArm.parent = root;

  // Central muzzle between the lobes; ranged attacks lob from here.
  const muzzle = new TransformNode(`${id}_muzzle`, scene);
  muzzle.parent = root;
  muzzle.position = new Vector3(0, lobeY, st.width * 0.95);
  sphere('core', st.width * 0.45, eyeMat, new Vector3(0, lobeY, st.width * 0.5));

  return {
    collider, root, head, leftLeg, rightLeg, leftArm, rightArm, muzzle,
    eyeMat, bodyMat, trimMat, parts, height: h,
  };
}
