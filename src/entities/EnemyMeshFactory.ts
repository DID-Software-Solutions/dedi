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
  /** The two testicles hang off these nodes so the walk-swing makes them waddle. */
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

// The bestiary is testicles. Each type is the same scrotal silhouette in a
// different flesh tone / size so they stay readable at a glance; the boss is a
// pair of breasts (see buildBossRig).
const STYLES: Record<EnemyType, TypeStyle> = {
  [EnemyType.Grunt]: {
    height: 1.8, width: 0.7,
    body: new Color3(0.86, 0.62, 0.55), trim: new Color3(0.7, 0.35, 0.4), eye: new Color3(0.3, 1, 0.4),
  },
  [EnemyType.Rusher]: {
    height: 1.5, width: 0.55,
    body: new Color3(0.92, 0.52, 0.46), trim: new Color3(1, 0.5, 0.45), eye: new Color3(1, 0.85, 0.2),
  },
  [EnemyType.Heavy]: {
    height: 2.4, width: 1.15,
    body: new Color3(0.62, 0.32, 0.34), trim: new Color3(0.85, 0.3, 0.35), eye: new Color3(1, 0.3, 0.2),
  },
  [EnemyType.Spitter]: {
    height: 1.75, width: 0.72,
    body: new Color3(0.7, 0.5, 0.74), trim: new Color3(0.7, 0.3, 1), eye: new Color3(0.85, 0.45, 1),
  },
  [EnemyType.Boss]: {
    height: 4.2, width: 2.8,
    body: new Color3(0.95, 0.78, 0.72), trim: new Color3(1, 0.55, 0.6), eye: new Color3(1, 0.35, 0.5),
  },
};

function makeMaterials(scene: Scene, id: string, st: TypeStyle): {
  bodyMat: StandardMaterial; trimMat: StandardMaterial; eyeMat: StandardMaterial;
} {
  // Soft, slightly glossy skin so the flesh reads as skin, not plastic.
  const bodyMat = new StandardMaterial(`${id}_body`, scene);
  bodyMat.diffuseColor = st.body;
  bodyMat.specularColor = new Color3(0.35, 0.32, 0.32);
  bodyMat.specularPower = 32;
  bodyMat.emissiveColor = st.body.scale(0.08);

  const trimMat = new StandardMaterial(`${id}_trim`, scene);
  trimMat.diffuseColor = st.trim.scale(0.55);
  trimMat.emissiveColor = st.trim.scale(0.4);
  trimMat.specularColor = new Color3(0.5, 0.45, 0.45);

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

  // Dark matte coil hair — the single most identifying scrotal cue. Sparse
  // black curls sprouting from the sack, exactly like the reference art.
  const hairMat = new StandardMaterial(`${id}_hair`, scene);
  hairMat.diffuseColor = new Color3(0.06, 0.05, 0.05);
  hairMat.specularColor = new Color3(0.08, 0.08, 0.08);

  const sphere = (name: string, diam: number, mat: StandardMaterial, parent: TransformNode, pos: Vector3, scale?: Vector3): Mesh => {
    const m = MeshBuilder.CreateSphere(`${id}_${name}`, { diameter: diam, segments: 12 }, scene);
    m.material = mat; m.parent = parent; m.position = pos; m.isPickable = false;
    if (scale) m.scaling = scale;
    parts.push(m);
    return m;
  };

  // One curl of hair: a small torus ring standing up off the surface.
  const curl = (name: string, parent: TransformNode, pos: Vector3, rot: Vector3, size: number): void => {
    const t = MeshBuilder.CreateTorus(`${id}_${name}`, { diameter: size, thickness: size * 0.22, tessellation: 8 }, scene);
    t.material = hairMat; t.parent = parent; t.position = pos; t.rotation = rot; t.isPickable = false;
    parts.push(t);
  };

  // --- The two testicles -------------------------------------------------
  // Two big, low-hanging ovoid lobes are the dominant mass. They hang from the
  // "leg" nodes so EnemySystem's leg-swing makes the whole sack sway.
  const lobeR = st.width * 0.72;     // dominant lobe radius
  const lobeY = h * 0.44;            // hang the bulk low
  const seamY = h * 0.66;            // where the lobes fuse into the sack neck
  const lobeGap = st.width * 0.4;

  const leftLeg = new TransformNode(`${id}_lleg`, scene);
  leftLeg.parent = root; leftLeg.position = new Vector3(-lobeGap, lobeY, 0);
  sphere('ballL', lobeR * 2, bodyMat, leftLeg, new Vector3(0, 0, 0), new Vector3(0.96, 1.14, 0.96));

  const rightLeg = new TransformNode(`${id}_rleg`, scene);
  rightLeg.parent = root; rightLeg.position = new Vector3(lobeGap, lobeY, 0);
  sphere('ballR', lobeR * 2, bodyMat, rightLeg, new Vector3(0, 0, 0), new Vector3(0.96, 1.14, 0.96));

  // Scrotal sack neck binding the lobes up into the cord (doesn't swing).
  sphere('sack', st.width * 1.35, bodyMat, root, new Vector3(0, seamY, 0), new Vector3(1.1, 0.85, 1.0));
  // Deep central raphe — the dark vertical crease splitting the two lobes.
  sphere('seam', st.width * 0.42, hairMat, root, new Vector3(0, lobeY + lobeR * 0.3, lobeR * 0.7),
    new Vector3(0.22, 1.9, 0.28));

  // Sparse curly hairs sprouting around the lower/outer sack — the key tell.
  const curlN = type === EnemyType.Heavy ? 14 : 10;
  for (let i = 0; i < curlN; i++) {
    const a = (i / curlN) * Math.PI * 2;
    const fx = Math.sin(a), fz = Math.cos(a);
    if (fz > 0.55 && Math.abs(fx) < 0.55) continue; // keep the front face clear
    const rad = st.width * 0.82;
    const yy = lobeY - lobeR * 0.25 + (i % 3) * lobeR * 0.4;
    const cs = st.width * (0.28 + (i % 2) * 0.12);
    curl(`hair${i}`, root, new Vector3(fx * rad, yy, fz * rad),
      new Vector3(Math.PI / 2 + fz * 0.5, a, (i % 2 ? 1 : -1) * 0.5), cs);
  }

  // --- Head: the spermatic-cord stem + two small angry eyes --------------
  const head = new TransformNode(`${id}_headNode`, scene);
  head.parent = root;
  head.position = new Vector3(0, seamY + st.width * 0.5, 0);
  // Cord stem rising and curving up out of the top.
  sphere('cord1', st.width * 0.36, bodyMat, head, new Vector3(0, st.width * 0.1, 0), new Vector3(0.7, 1.3, 0.7));
  sphere('cord2', st.width * 0.3, bodyMat, head, new Vector3(st.width * 0.12, st.width * 0.42, 0), new Vector3(0.6, 1.1, 0.6));
  // Two small glaring eyes low on the sack front (eyeMat → telegraph flare).
  const eyeR = st.width * (type === EnemyType.Rusher ? 0.16 : 0.12);
  const eyeX = st.width * 0.22;
  sphere('eyeL', eyeR, eyeMat, head, new Vector3(-eyeX, -st.width * 0.25, st.width * 0.5));
  sphere('eyeR', eyeR, eyeMat, head, new Vector3(eyeX, -st.width * 0.25, st.width * 0.5));

  // --- Arms: tiny stub nubs (keep the rig contract; barely visible) -------
  const armStub = (name: string, side: number): TransformNode => {
    const node = new TransformNode(`${id}_${name}`, scene);
    node.parent = root; node.position = new Vector3(side * st.width * 0.85, seamY, 0);
    sphere(`${name}Mesh`, st.width * 0.24, bodyMat, node, new Vector3(side * st.width * 0.1, -st.width * 0.18, 0),
      new Vector3(0.8, 1.3, 0.8));
    return node;
  };
  const leftArm = armStub('larm', -1);
  const rightArm = armStub('rarm', 1);

  // Ranged types (Spitter et al.) sprout a glowing spitter gland on the right
  // stub that the projectile fires from; melee types just keep a head muzzle.
  const muzzle = new TransformNode(`${id}_muzzle`, scene);
  if (ranged) {
    sphere('gland', st.width * 0.4, eyeMat, rightArm, new Vector3(st.width * 0.12, -st.width * 0.4, st.width * 0.35),
      new Vector3(1, 1, 1.4));
    muzzle.parent = rightArm;
    muzzle.position = new Vector3(st.width * 0.12, -st.width * 0.4, st.width * 0.7);
  } else {
    muzzle.parent = head;
    muzzle.position = new Vector3(0, 0, st.width * 0.7);
  }

  return {
    collider, root, head, leftLeg, rightLeg, leftArm, rightArm, muzzle,
    eyeMat, bodyMat, trimMat, parts, height: h,
  };
}

/**
 * Mini-boss rig (waves 5/10/15): a giant pair of breasts on a chest mound, with
 * glowing nipples (eyeMat → they flare during the attack telegraph) and a
 * cleavage core the ranged attacks lob from. Limb nodes are present-but-empty so
 * EnemySystem's shared locomotion animation runs as a harmless no-op.
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
    const m = MeshBuilder.CreateSphere(`${id}_${name}`, { diameter: diam, segments: 18 }, scene);
    m.material = mat; m.parent = root; m.position = pos; m.isPickable = false;
    if (scale) m.scaling = scale;
    parts.push(m);
    return m;
  };

  // Chest mound the breasts sit on.
  sphere('chest', st.width * 1.7, bodyMat, new Vector3(0, h * 0.32, -st.width * 0.1), new Vector3(1.2, 0.7, 0.8));

  // The two breasts — the silhouette.
  const breastD = st.width * 1.2;
  const breastY = h * 0.55;
  const breastX = st.width * 0.5;
  const breastZ = st.width * 0.25;
  sphere('breastL', breastD, bodyMat, new Vector3(-breastX, breastY, breastZ), new Vector3(1, 1.02, 1.05));
  sphere('breastR', breastD, bodyMat, new Vector3(breastX, breastY, breastZ), new Vector3(1, 1.02, 1.05));
  // Areolae (trim) + glowing nipples (eyeMat — telegraph). Big and front-facing
  // so the boss is unmistakably a bust, not a giant scrotum.
  const tipZ = breastZ + breastD * 0.52;
  sphere('areolaL', breastD * 0.46, trimMat, new Vector3(-breastX, breastY, tipZ * 0.95), new Vector3(1, 1, 0.35));
  sphere('areolaR', breastD * 0.46, trimMat, new Vector3(breastX, breastY, tipZ * 0.95), new Vector3(1, 1, 0.35));
  sphere('nippleL', breastD * 0.22, eyeMat, new Vector3(-breastX, breastY, tipZ), new Vector3(1, 1, 1.3));
  sphere('nippleR', breastD * 0.22, eyeMat, new Vector3(breastX, breastY, tipZ), new Vector3(1, 1, 1.3));

  // Head node sits at the cleavage crest (no face — breasts have none).
  const head = new TransformNode(`${id}_headNode`, scene);
  head.parent = root;
  head.position = new Vector3(0, h * 0.78, 0);

  // Empty limb nodes so the shared locomotion animation is a harmless no-op.
  const leftLeg = new TransformNode(`${id}_lleg`, scene); leftLeg.parent = root;
  const rightLeg = new TransformNode(`${id}_rleg`, scene); rightLeg.parent = root;
  const leftArm = new TransformNode(`${id}_larm`, scene); leftArm.parent = root;
  const rightArm = new TransformNode(`${id}_rarm`, scene); rightArm.parent = root;

  // Cleavage core glow + muzzle: ranged attacks lob from between the breasts.
  sphere('core', st.width * 0.5, eyeMat, new Vector3(0, breastY, breastZ + breastD * 0.3));
  const muzzle = new TransformNode(`${id}_muzzle`, scene);
  muzzle.parent = root;
  muzzle.position = new Vector3(0, breastY, breastZ + breastD * 0.8);

  return {
    collider, root, head, leftLeg, rightLeg, leftArm, rightArm, muzzle,
    eyeMat, bodyMat, trimMat, parts, height: h,
  };
}
