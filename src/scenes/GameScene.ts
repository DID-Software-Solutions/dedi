import {
  Scene, MeshBuilder, StandardMaterial, PBRMetallicRoughnessMaterial,
  Color3, Color4, Vector3, DirectionalLight, HemisphericLight, ShadowGenerator,
  DynamicTexture, Texture, PointLight, ReflectionProbe, ParticleSystem,
  DefaultRenderingPipeline, ImageProcessingConfiguration,
  type Camera, type AbstractMesh, type Light, type Mesh,
} from '@babylonjs/core';

export interface SpawnZone { position: Vector3; }

export class GameScene {
  private scene: Scene;
  private shadowGen!: ShadowGenerator;
  private meshes: AbstractMesh[] = [];
  private lights: Light[] = [];
  private pipeline: DefaultRenderingPipeline | null = null;
  private probe: ReflectionProbe | null = null;
  private dust: ParticleSystem | null = null;
  spawnZones: SpawnZone[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
  }

  build(): void {
    this.scene.clearColor = new Color4(0.03, 0.04, 0.07, 1);
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.012;
    this.scene.fogColor = new Color3(0.08, 0.09, 0.14);
    this.scene.environmentIntensity = 0.85;

    const sun = new DirectionalLight('sun', new Vector3(-0.5, -1.1, -0.7).normalize(), this.scene);
    sun.intensity = 3.2;
    sun.diffuse = new Color3(1.0, 0.92, 0.78);
    sun.specular = new Color3(1, 0.95, 0.85);
    this.lights.push(sun);

    const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), this.scene);
    ambient.intensity = 0.6;
    ambient.diffuse = new Color3(0.5, 0.62, 0.85);
    ambient.groundColor = new Color3(0.12, 0.14, 0.1);
    ambient.specular = new Color3(0.2, 0.25, 0.35);
    this.lights.push(ambient);

    // Cool key rim from behind for separation against the fog.
    const rim = new DirectionalLight('rim', new Vector3(0.7, -0.3, 0.8).normalize(), this.scene);
    rim.intensity = 0.9;
    rim.diffuse = new Color3(0.3, 0.55, 1);
    rim.specular = new Color3(0.4, 0.6, 1);
    this.lights.push(rim);

    this.shadowGen = new ShadowGenerator(2048, sun);
    this.shadowGen.useBlurExponentialShadowMap = true;
    this.shadowGen.blurKernel = 32;
    this.shadowGen.darkness = 0.35;

    this._buildSky();
    this._buildMap();
    this._buildEnvProbe();
    this._buildAtmosphere();
    this._setupSpawnZones();
  }

  /** Bloom, ACES tone mapping, vignette, chromatic aberration, grain, sharpen. */
  enablePostFX(camera: Camera): void {
    const pipe = new DefaultRenderingPipeline('postfx', true, this.scene, [camera]);
    pipe.fxaaEnabled = true;
    pipe.samples = 4;

    pipe.bloomEnabled = true;
    pipe.bloomThreshold = 0.9;
    pipe.bloomWeight = 0.6;
    pipe.bloomKernel = 64;
    pipe.bloomScale = 0.6;

    pipe.imageProcessingEnabled = true;
    pipe.imageProcessing.toneMappingEnabled = true;
    pipe.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    pipe.imageProcessing.exposure = 1.1;
    pipe.imageProcessing.contrast = 1.25;
    pipe.imageProcessing.vignetteEnabled = true;
    pipe.imageProcessing.vignetteWeight = 2.6;
    pipe.imageProcessing.vignetteColor = new Color4(0, 0, 0, 0);

    pipe.chromaticAberrationEnabled = true;
    pipe.chromaticAberration.aberrationAmount = 12;

    pipe.grainEnabled = true;
    pipe.grain.intensity = 5;
    pipe.grain.animated = true;

    pipe.sharpenEnabled = true;
    pipe.sharpen.edgeAmount = 0.3;

    this.pipeline = pipe;
  }

  dispose(): void {
    this.pipeline?.dispose();
    this.pipeline = null;
    this.dust?.dispose();
    this.dust = null;
    this.probe?.dispose();
    this.probe = null;
    this.scene.environmentTexture = null;
    for (const m of this.meshes) m.dispose();
    for (const l of this.lights) l.dispose();
    this.shadowGen?.dispose();
    this.meshes = [];
    this.lights = [];
  }

  private _pbr(name: string, color: Color3, metallic: number, roughness: number, emissive = new Color3(0, 0, 0)): PBRMetallicRoughnessMaterial {
    const m = new PBRMetallicRoughnessMaterial(name, this.scene);
    m.baseColor = color;
    m.metallic = metallic;
    m.roughness = roughness;
    m.emissiveColor = emissive;
    return m;
  }

  private _buildSky(): void {
    const dome = MeshBuilder.CreateSphere('sky', { diameter: 500, segments: 24, sideOrientation: 1 }, this.scene);
    const tex = new DynamicTexture('skyTex', { width: 512, height: 512 }, this.scene, true);
    const ctx = tex.getContext() as CanvasRenderingContext2D;
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#05070f');
    grad.addColorStop(0.5, '#101a2e');
    grad.addColorStop(0.78, '#2a3350');
    grad.addColorStop(0.9, '#5a4a3a');
    grad.addColorStop(1, '#7a4a28');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    // Scatter stars in the upper band.
    for (let i = 0; i < 260; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 300;
      const r = Math.random() * 1.3;
      ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.6})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.fill();
    }
    tex.update();
    const mat = new StandardMaterial('skyMat', this.scene);
    mat.emissiveTexture = tex;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    dome.material = mat;
    dome.isPickable = false;
    dome.infiniteDistance = true;
    this.meshes.push(dome);
  }

  private _buildMap(): void {
    // Ground: dark metallic deck with a glowing tactical grid.
    const ground = MeshBuilder.CreateGround('ground', { width: 90, height: 90 }, this.scene);
    const gMat = this._pbr('gmat', new Color3(0.18, 0.2, 0.24), 0.6, 0.5);
    const gridTex = this._makeGridTexture();
    gMat.baseTexture = gridTex;
    gMat.emissiveColor = new Color3(0.05, 0.12, 0.1);
    gMat.emissiveTexture = gridTex;
    ground.material = gMat;
    ground.receiveShadows = true;
    this.meshes.push(ground);

    const wallMat = this._pbr('wallmat', new Color3(0.22, 0.25, 0.3), 0.85, 0.4);
    const trimColors = [
      new Color3(0.1, 0.9, 0.6), new Color3(0.2, 0.6, 1),
      new Color3(1, 0.5, 0.2), new Color3(0.9, 0.2, 0.8),
    ];

    const buildingDefs = [
      { pos: new Vector3(-28, 5, -20), size: new Vector3(14, 10, 10) },
      { pos: new Vector3(28, 4, -20),  size: new Vector3(12, 8, 12) },
      { pos: new Vector3(-28, 3, 20),  size: new Vector3(10, 6, 14) },
      { pos: new Vector3(28, 3, 20),   size: new Vector3(10, 6, 10) },
      { pos: new Vector3(0, 2, -30),   size: new Vector3(18, 4, 8) },
    ];

    buildingDefs.forEach((def, i) => {
      const b = MeshBuilder.CreateBox(`building${i}`, { width: def.size.x, height: def.size.y, depth: def.size.z }, this.scene);
      b.position = def.pos;
      b.material = wallMat;
      b.receiveShadows = true;
      this.shadowGen.addShadowCaster(b);
      this.meshes.push(b);

      // Glowing neon trim strip near the base.
      const col = trimColors[i % trimColors.length];
      const tMat = this._pbr(`btrim${i}`, col.scale(0.3), 0.2, 0.3, col.scale(1.4));
      const strip = MeshBuilder.CreateBox(`bstrip${i}`, { width: def.size.x + 0.12, height: 0.35, depth: def.size.z + 0.12 }, this.scene);
      strip.position = new Vector3(def.pos.x, 0.7, def.pos.z);
      strip.material = tMat;
      strip.isPickable = false;
      this.meshes.push(strip);

      // A second accent band near the top.
      const top = MeshBuilder.CreateBox(`btop${i}`, { width: def.size.x + 0.12, height: 0.25, depth: def.size.z + 0.12 }, this.scene);
      top.position = new Vector3(def.pos.x, def.pos.y + def.size.y / 2 - 0.6, def.pos.z);
      top.material = tMat;
      top.isPickable = false;
      this.meshes.push(top);
    });

    // Scuffed metal supply crates.
    const crateMat = this._pbr('cratemat', new Color3(0.45, 0.38, 0.22), 0.7, 0.55);
    const crateDefs = [
      new Vector3(-8, 1, -8), new Vector3(8, 1, -8),
      new Vector3(-8, 1, 8),  new Vector3(8, 1, 8),
      new Vector3(0, 1, -14), new Vector3(-14, 1, 0),
      new Vector3(14, 1, 0),
    ];
    crateDefs.forEach((pos, i) => {
      const c = MeshBuilder.CreateBox(`crate${i}`, { size: 2 }, this.scene);
      c.position = pos;
      c.material = crateMat;
      c.receiveShadows = true;
      c.rotation.y = (i % 3) * 0.3;
      this.shadowGen.addShadowCaster(c);
      this.meshes.push(c);
    });

    // Colored atmospheric point lights spread around the arena.
    const lampDefs: { p: Vector3; c: Color3 }[] = [
      { p: new Vector3(-30, 6, -22), c: new Color3(0.3, 0.6, 1) },
      { p: new Vector3(30, 6, 22),   c: new Color3(1, 0.4, 0.7) },
      { p: new Vector3(28, 5, -20),  c: new Color3(1, 0.6, 0.2) },
      { p: new Vector3(-28, 4, 20),  c: new Color3(0.3, 1, 0.7) },
    ];
    lampDefs.forEach((d, i) => {
      const lamp = new PointLight(`lamp${i}`, d.p, this.scene);
      lamp.diffuse = d.c;
      lamp.intensity = 0.8;
      lamp.range = 45;
      this.lights.push(lamp);
    });
  }

  /** Reflection probe captures the sky+geometry into a cubemap used as the
   *  scene environment, so PBR metal surfaces actually reflect their surroundings. */
  private _buildEnvProbe(): void {
    const probe = new ReflectionProbe('envProbe', 256, this.scene);
    probe.position = new Vector3(0, 4, 0);
    for (const m of this.meshes) probe.renderList!.push(m as Mesh);
    this.scene.environmentTexture = probe.cubeTexture;
    // Static world — capture once instead of every frame.
    probe.refreshRate = 1;
    this.probe = probe;
  }

  /** Slow-drifting dust motes catching the light. */
  private _buildAtmosphere(): void {
    const ps = new ParticleSystem('dust', 600, this.scene);
    const dot = new DynamicTexture('dustTex', { width: 32, height: 32 }, this.scene, false);
    const c = dot.getContext() as CanvasRenderingContext2D;
    const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 32, 32);
    dot.update();
    ps.particleTexture = dot;
    ps.emitter = new Vector3(0, 6, 0);
    ps.minEmitBox = new Vector3(-40, -4, -40);
    ps.maxEmitBox = new Vector3(40, 10, 40);
    ps.color1 = new Color4(0.6, 0.75, 1, 0.25);
    ps.color2 = new Color4(1, 0.85, 0.6, 0.18);
    ps.colorDead = new Color4(0, 0, 0, 0);
    ps.minSize = 0.04; ps.maxSize = 0.16;
    ps.minLifeTime = 6; ps.maxLifeTime = 12;
    ps.emitRate = 80;
    ps.blendMode = ParticleSystem.BLENDMODE_ADD;
    ps.gravity = new Vector3(0, -0.04, 0);
    ps.direction1 = new Vector3(-0.3, 0.1, -0.3);
    ps.direction2 = new Vector3(0.3, 0.2, 0.3);
    ps.minEmitPower = 0.05; ps.maxEmitPower = 0.2;
    ps.updateSpeed = 0.01;
    ps.start();
    this.dust = ps;
  }

  private _makeGridTexture(): Texture {
    const size = 512;
    const tex = new DynamicTexture('grid', size, this.scene, true);
    const ctx = tex.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = '#10141c';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#1f6f5a';
    ctx.shadowColor = '#2fae88';
    ctx.shadowBlur = 6;
    ctx.lineWidth = 2;
    const step = size / 8;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(size, i * step); ctx.stroke();
    }
    tex.update();
    tex.uScale = 12; tex.vScale = 12;
    tex.wrapU = Texture.WRAP_ADDRESSMODE; tex.wrapV = Texture.WRAP_ADDRESSMODE;
    return tex;
  }

  private _setupSpawnZones(): void {
    this.spawnZones = [
      { position: new Vector3(-35, 0, 0) },
      { position: new Vector3(35, 0, 0) },
      { position: new Vector3(0, 0, -35) },
      { position: new Vector3(0, 0, 35) },
    ];
  }

  getShadowGenerator(): ShadowGenerator {
    return this.shadowGen;
  }
}
