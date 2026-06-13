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
};

export function buildEnemyRig(scene: Scene, id: string, type: EnemyType): EnemyRig {
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

  const bodyMat = new StandardMaterial(`${id}_body`, scene);
  bodyMat.diffuseColor = st.body;
  bodyMat.specularColor = new Color3(0.1, 0.1, 0.1);

  const trimMat = new StandardMaterial(`${id}_trim`, scene);
  trimMat.diffuseColor = st.trim.scale(0.4);
  trimMat.emissiveColor = st.trim.scale(0.6);

  const eyeMat = new StandardMaterial(`${id}_eye`, scene);
  eyeMat.emissiveColor = st.eye;
  eyeMat.disableLighting = true;

  const mk = (name: string, opts: { w: number; h: number; d: number }, mat: StandardMaterial, parent: TransformNode, pos: Vector3): Mesh => {
    const m = MeshBuilder.CreateBox(`${id}_${name}`, { width: opts.w, height: opts.h, depth: opts.d }, scene);
    m.material = mat;
    m.parent = parent;
    m.position = pos;
    m.isPickable = false;
    parts.push(m);
    return m;
  };

  const legH = h * 0.42;
  const torsoH = h * 0.4;
  const headH = h * 0.18;
  const hipY = legH;
  const shoulderY = legH + torsoH * 0.85;

  // Torso (slightly tapered look via two stacked boxes).
  mk('torso', { w: st.width, h: torsoH, d: st.width * 0.7 }, bodyMat, root, new Vector3(0, hipY + torsoH / 2, 0));
  mk('chest', { w: st.width * 1.05, h: torsoH * 0.4, d: st.width * 0.75 }, trimMat, root, new Vector3(0, hipY + torsoH * 0.75, 0));

  // Head with glowing eye visor.
  const head = new TransformNode(`${id}_headNode`, scene);
  head.parent = root;
  head.position = new Vector3(0, hipY + torsoH + headH / 2, 0);
  mk('head', { w: st.width * 0.6, h: headH, d: st.width * 0.6 }, bodyMat, head, Vector3.Zero());
  mk('visor', { w: st.width * 0.5, h: headH * 0.3, d: 0.06 }, eyeMat, head, new Vector3(0, 0, st.width * 0.32));

  // Legs pivoting at the hip.
  const legW = st.width * 0.34;
  const leftLeg = new TransformNode(`${id}_lleg`, scene);
  leftLeg.parent = root; leftLeg.position = new Vector3(-st.width * 0.25, hipY, 0);
  mk('llegMesh', { w: legW, h: legH, d: legW }, bodyMat, leftLeg, new Vector3(0, -legH / 2, 0));
  const rightLeg = new TransformNode(`${id}_rleg`, scene);
  rightLeg.parent = root; rightLeg.position = new Vector3(st.width * 0.25, hipY, 0);
  mk('rlegMesh', { w: legW, h: legH, d: legW }, bodyMat, rightLeg, new Vector3(0, -legH / 2, 0));

  // Arms pivoting at the shoulder.
  const armH = torsoH * 0.95;
  const armW = st.width * 0.28;
  const leftArm = new TransformNode(`${id}_larm`, scene);
  leftArm.parent = root; leftArm.position = new Vector3(-st.width * 0.62, shoulderY, 0);
  mk('larmMesh', { w: armW, h: armH, d: armW }, bodyMat, leftArm, new Vector3(0, -armH / 2, 0));
  const rightArm = new TransformNode(`${id}_rarm`, scene);
  rightArm.parent = root; rightArm.position = new Vector3(st.width * 0.62, shoulderY, 0);
  mk('rarmMesh', { w: armW, h: armH, d: armW }, bodyMat, rightArm, new Vector3(0, -armH / 2, 0));

  // Shoulder pads on the Heavy for silhouette.
  if (type === EnemyType.Heavy) {
    mk('lpad', { w: st.width * 0.4, h: st.width * 0.3, d: st.width * 0.5 }, trimMat, root, new Vector3(-st.width * 0.55, shoulderY, 0));
    mk('rpad', { w: st.width * 0.4, h: st.width * 0.3, d: st.width * 0.5 }, trimMat, root, new Vector3(st.width * 0.55, shoulderY, 0));
  }

  // Ranged enemies carry a glowing cannon on the right arm.
  const muzzle = new TransformNode(`${id}_muzzle`, scene);
  if (type === EnemyType.Spitter) {
    const gun = mk('gun', { w: armW * 1.3, h: armW * 1.3, d: armH * 0.9 }, trimMat, rightArm, new Vector3(0, -armH * 0.6, armH * 0.4));
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
