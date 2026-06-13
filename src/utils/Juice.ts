import {
  Scene, Vector3, Color3, Color4, ParticleSystem, Texture, DynamicTexture,
  MeshBuilder, StandardMaterial, PointLight, type Mesh, GlowLayer,
} from '@babylonjs/core';

/**
 * Visual "juice" — muzzle flashes, tracers, impacts, blood, death bursts,
 * spawn portals, camera shake, and floating 3D score text. All textures are
 * generated procedurally so no asset files are required.
 */
export class Juice {
  private scene: Scene;
  private particleTex: Texture;
  private shakeAmount = 0;
  private shakeTime = 0;
  glow: GlowLayer;

  constructor(scene: Scene) {
    this.scene = scene;
    this.particleTex = this._makeSoftDot();
    this.glow = new GlowLayer('glow', scene, { blurKernelSize: 32 });
    this.glow.intensity = 0.8;
  }

  /** Soft radial-gradient dot used for every particle system. */
  private _makeSoftDot(): Texture {
    const size = 64;
    const dt = new DynamicTexture('particleDot', size, this.scene, false);
    const ctx = dt.getContext() as CanvasRenderingContext2D;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    dt.update();
    dt.hasAlpha = true;
    return dt;
  }

  private _burst(opts: {
    pos: Vector3; count: number; color1: Color4; color2: Color4;
    minSize: number; maxSize: number; minPower: number; maxPower: number;
    lifeMin: number; lifeMax: number; gravity?: number; direction?: Vector3; spread?: number;
  }): void {
    const ps = new ParticleSystem(`burst_${Math.random()}`, opts.count, this.scene);
    ps.particleTexture = this.particleTex;
    ps.emitter = opts.pos.clone();
    ps.minEmitBox = Vector3.Zero();
    ps.maxEmitBox = Vector3.Zero();
    ps.color1 = opts.color1;
    ps.color2 = opts.color2;
    ps.colorDead = new Color4(opts.color2.r, opts.color2.g, opts.color2.b, 0);
    ps.minSize = opts.minSize;
    ps.maxSize = opts.maxSize;
    ps.minLifeTime = opts.lifeMin;
    ps.maxLifeTime = opts.lifeMax;
    ps.emitRate = 0;
    ps.blendMode = ParticleSystem.BLENDMODE_ADD;
    ps.gravity = new Vector3(0, opts.gravity ?? 0, 0);
    ps.minEmitPower = opts.minPower;
    ps.maxEmitPower = opts.maxPower;
    if (opts.direction) {
      const s = opts.spread ?? 0.4;
      ps.direction1 = opts.direction.add(new Vector3(-s, -s, -s));
      ps.direction2 = opts.direction.add(new Vector3(s, s, s));
    } else {
      ps.direction1 = new Vector3(-1, -1, -1);
      ps.direction2 = new Vector3(1, 1, 1);
    }
    ps.manualEmitCount = opts.count;
    ps.disposeOnStop = true;
    ps.targetStopDuration = 0.05;
    ps.start();
    setTimeout(() => ps.dispose(), (opts.lifeMax + 0.2) * 1000);
  }

  /** Muzzle flash: bright spark cone + brief point light. */
  muzzleFlash(pos: Vector3, dir: Vector3): void {
    this._burst({
      pos, count: 14,
      color1: new Color4(1, 0.95, 0.6, 1), color2: new Color4(1, 0.6, 0.15, 1),
      minSize: 0.08, maxSize: 0.22, minPower: 3, maxPower: 7,
      lifeMin: 0.04, lifeMax: 0.1, direction: dir, spread: 0.5,
    });
    const light = new PointLight(`mzl_${Math.random()}`, pos.clone(), this.scene);
    light.diffuse = new Color3(1, 0.8, 0.4);
    light.intensity = 6;
    light.range = 8;
    let life = 0.06;
    const obs = this.scene.onBeforeRenderObservable.add(() => {
      life -= this.scene.getEngine().getDeltaTime() / 1000;
      light.intensity = Math.max(0, (life / 0.06) * 6);
      if (life <= 0) { this.scene.onBeforeRenderObservable.remove(obs); light.dispose(); }
    });
  }

  /** Glowing bullet tracer that fades over ~80ms. */
  tracer(from: Vector3, to: Vector3, color = new Color3(1, 0.85, 0.4)): void {
    const dist = Vector3.Distance(from, to);
    if (dist < 0.1) return;
    const tube = MeshBuilder.CreateCylinder(`tracer_${Math.random()}`, {
      height: dist, diameter: 0.05,
    }, this.scene);
    const mid = Vector3.Center(from, to);
    tube.position = mid;
    // Orient cylinder (Y-up) along the shot direction.
    const dir = to.subtract(from).normalize();
    const up = new Vector3(0, 1, 0);
    const axis = Vector3.Cross(up, dir);
    const angle = Math.acos(Vector3.Dot(up, dir));
    if (axis.lengthSquared() > 1e-6) tube.rotate(axis.normalize(), angle);
    const mat = new StandardMaterial(`tracerMat_${Math.random()}`, this.scene);
    mat.emissiveColor = color;
    mat.disableLighting = true;
    mat.alpha = 0.9;
    tube.material = mat;
    tube.isPickable = false;
    let life = 0.08;
    const obs = this.scene.onBeforeRenderObservable.add(() => {
      life -= this.scene.getEngine().getDeltaTime() / 1000;
      mat.alpha = Math.max(0, (life / 0.08) * 0.9);
      tube.scaling.x = tube.scaling.z = Math.max(0.2, life / 0.08);
      if (life <= 0) { this.scene.onBeforeRenderObservable.remove(obs); tube.dispose(); mat.dispose(); }
    });
  }

  /** Spark scatter where a bullet hits the world. */
  impact(pos: Vector3, normal: Vector3): void {
    this._burst({
      pos, count: 10,
      color1: new Color4(1, 0.9, 0.5, 1), color2: new Color4(0.8, 0.4, 0.1, 1),
      minSize: 0.04, maxSize: 0.12, minPower: 2, maxPower: 5,
      lifeMin: 0.1, lifeMax: 0.3, gravity: -9, direction: normal, spread: 0.7,
    });
  }

  /** Colored burst when an enemy takes a hit. */
  bloodBurst(pos: Vector3, color: Color3): void {
    this._burst({
      pos, count: 12,
      color1: new Color4(color.r, color.g, color.b, 1),
      color2: new Color4(color.r * 0.5, color.g * 0.5, color.b * 0.5, 1),
      minSize: 0.06, maxSize: 0.18, minPower: 1.5, maxPower: 4,
      lifeMin: 0.15, lifeMax: 0.4, gravity: -5,
    });
  }

  /** Big multi-layer burst + debris when an enemy dies. */
  deathExplosion(pos: Vector3, color: Color3): void {
    this._burst({
      pos, count: 40,
      color1: new Color4(color.r, color.g, color.b, 1),
      color2: new Color4(1, 0.5, 0.1, 1),
      minSize: 0.1, maxSize: 0.35, minPower: 3, maxPower: 9,
      lifeMin: 0.25, lifeMax: 0.6, gravity: -8,
    });
    this._burst({
      pos, count: 18,
      color1: new Color4(1, 1, 0.8, 1), color2: new Color4(1, 0.6, 0.2, 1),
      minSize: 0.15, maxSize: 0.5, minPower: 1, maxPower: 4,
      lifeMin: 0.1, lifeMax: 0.3,
    });
    this.addShake(0.5);
  }

  /** Rising portal glow telegraphing an enemy spawn. */
  spawnPortal(pos: Vector3, color: Color3): void {
    const ring = MeshBuilder.CreateDisc(`portal_${Math.random()}`, { radius: 1.2, tessellation: 32 }, this.scene);
    ring.position = new Vector3(pos.x, 0.05, pos.z);
    ring.rotation.x = Math.PI / 2;
    const mat = new StandardMaterial(`portalMat_${Math.random()}`, this.scene);
    mat.emissiveColor = color;
    mat.disableLighting = true;
    mat.alpha = 0.8;
    ring.material = mat;
    ring.isPickable = false;
    this._burst({
      pos: new Vector3(pos.x, 0.1, pos.z), count: 24,
      color1: new Color4(color.r, color.g, color.b, 1),
      color2: new Color4(color.r, color.g, color.b, 0.3),
      minSize: 0.1, maxSize: 0.3, minPower: 2, maxPower: 5,
      lifeMin: 0.4, lifeMax: 0.9, gravity: 3,
      direction: new Vector3(0, 1, 0), spread: 0.3,
    });
    let life = 0.9;
    const obs = this.scene.onBeforeRenderObservable.add(() => {
      const dt = this.scene.getEngine().getDeltaTime() / 1000;
      life -= dt;
      ring.scaling.setAll(0.3 + (1 - life / 0.9) * 1.5);
      mat.alpha = Math.max(0, life / 0.9 * 0.8);
      if (life <= 0) { this.scene.onBeforeRenderObservable.remove(obs); ring.dispose(); mat.dispose(); }
    });
  }

  /** Billboard text that floats up and fades — score popups, "+100". */
  floatingText(pos: Vector3, text: string, color: string): void {
    const dt = new DynamicTexture(`ft_${Math.random()}`, { width: 256, height: 128 }, this.scene, false);
    dt.hasAlpha = true;
    const ctx = dt.getContext() as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 256, 128);
    ctx.font = 'bold 64px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, 128, 64);
    dt.update();

    const plane = MeshBuilder.CreatePlane(`ftp_${Math.random()}`, { width: 1.6, height: 0.8 }, this.scene);
    plane.position = pos.clone();
    plane.billboardMode = 7; // BILLBOARDMODE_ALL
    const mat = new StandardMaterial(`ftm_${Math.random()}`, this.scene);
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.diffuseTexture = dt;
    mat.opacityTexture = dt;
    mat.disableLighting = true;
    mat.useAlphaFromDiffuseTexture = true;
    plane.material = mat;
    plane.isPickable = false;
    let life = 1.0;
    const obs = this.scene.onBeforeRenderObservable.add(() => {
      const d = this.scene.getEngine().getDeltaTime() / 1000;
      life -= d;
      plane.position.y += d * 1.2;
      mat.alpha = Math.max(0, life);
      if (life <= 0) { this.scene.onBeforeRenderObservable.remove(obs); plane.dispose(); mat.dispose(); dt.dispose(); }
    });
  }

  // --- Camera shake --------------------------------------------------------

  addShake(amount: number): void {
    this.shakeAmount = Math.min(1.2, this.shakeAmount + amount);
    this.shakeTime = 0.3;
  }

  /** Returns a small positional jitter to add to the camera this frame. */
  getShakeOffset(dt: number): Vector3 {
    if (this.shakeTime <= 0) return Vector3.Zero();
    this.shakeTime -= dt;
    const decay = Math.max(0, this.shakeTime / 0.3);
    const mag = this.shakeAmount * decay * 0.15;
    if (this.shakeTime <= 0) this.shakeAmount = 0;
    return new Vector3(
      (Math.random() - 0.5) * mag,
      (Math.random() - 0.5) * mag,
      (Math.random() - 0.5) * mag,
    );
  }
}
