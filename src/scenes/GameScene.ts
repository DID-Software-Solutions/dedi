import {
  Scene, MeshBuilder, StandardMaterial, Color3, Color4,
  Vector3, DirectionalLight, HemisphericLight, ShadowGenerator,
  DynamicTexture, Texture, PointLight, DefaultRenderingPipeline,
  ImageProcessingConfiguration, type Camera, type AbstractMesh, type Light,
} from '@babylonjs/core';

export interface SpawnZone { position: Vector3; }

export class GameScene {
  private scene: Scene;
  private shadowGen!: ShadowGenerator;
  private meshes: AbstractMesh[] = [];
  private lights: Light[] = [];
  private pipeline: DefaultRenderingPipeline | null = null;
  spawnZones: SpawnZone[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
  }

  build(): void {
    this.scene.clearColor = new Color4(0.06, 0.08, 0.11, 1);
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.018;
    this.scene.fogColor = new Color3(0.1, 0.12, 0.16);

    const sun = new DirectionalLight('sun', new Vector3(-0.6, -1.2, -0.8).normalize(), this.scene);
    sun.intensity = 2.2;
    sun.diffuse = new Color3(1.0, 0.93, 0.82);
    sun.specular = new Color3(1, 0.9, 0.7);
    this.lights.push(sun);

    const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), this.scene);
    ambient.intensity = 0.7;
    ambient.diffuse = new Color3(0.45, 0.55, 0.7);
    ambient.groundColor = new Color3(0.15, 0.18, 0.12);
    this.lights.push(ambient);

    // Warm fill from the opposite side for shape definition.
    const rim = new DirectionalLight('rim', new Vector3(0.8, -0.4, 0.6).normalize(), this.scene);
    rim.intensity = 0.5;
    rim.diffuse = new Color3(1, 0.5, 0.3);
    this.lights.push(rim);

    this.shadowGen = new ShadowGenerator(2048, sun);
    this.shadowGen.useBlurExponentialShadowMap = true;
    this.shadowGen.blurKernel = 32;
    this.shadowGen.darkness = 0.4;

    this._buildSky();
    this._buildMap();
    this._setupSpawnZones();
  }

  /** Bloom, ACES tone mapping, vignette, chromatic aberration, grain, sharpen. */
  enablePostFX(camera: Camera): void {
    const pipe = new DefaultRenderingPipeline('postfx', true, this.scene, [camera]);
    pipe.fxaaEnabled = true;
    pipe.samples = 4;

    pipe.bloomEnabled = true;
    pipe.bloomThreshold = 0.7;
    pipe.bloomWeight = 0.6;
    pipe.bloomKernel = 64;
    pipe.bloomScale = 0.5;

    pipe.imageProcessingEnabled = true;
    pipe.imageProcessing.toneMappingEnabled = true;
    pipe.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    pipe.imageProcessing.exposure = 1.3;
    pipe.imageProcessing.contrast = 1.15;
    pipe.imageProcessing.vignetteEnabled = true;
    pipe.imageProcessing.vignetteWeight = 2.2;
    pipe.imageProcessing.vignetteColor = new Color4(0, 0, 0, 0);

    pipe.chromaticAberrationEnabled = true;
    pipe.chromaticAberration.aberrationAmount = 8;

    pipe.grainEnabled = true;
    pipe.grain.intensity = 6;
    pipe.grain.animated = true;

    pipe.sharpenEnabled = true;
    pipe.sharpen.edgeAmount = 0.25;

    this.pipeline = pipe;
  }

  dispose(): void {
    this.pipeline?.dispose();
    this.pipeline = null;
    for (const m of this.meshes) m.dispose();
    for (const l of this.lights) l.dispose();
    this.shadowGen?.dispose();
    this.meshes = [];
    this.lights = [];
  }

  private _buildSky(): void {
    const dome = MeshBuilder.CreateSphere('sky', { diameter: 400, segments: 16, sideOrientation: 1 }, this.scene);
    const tex = new DynamicTexture('skyTex', { width: 16, height: 256 }, this.scene, false);
    const ctx = tex.getContext() as CanvasRenderingContext2D;
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#0a0e16');
    grad.addColorStop(0.55, '#16202e');
    grad.addColorStop(0.8, '#3a3320');
    grad.addColorStop(1, '#52341c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 256);
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
    // Ground with a tactical grid texture.
    const ground = MeshBuilder.CreateGround('ground', { width: 90, height: 90 }, this.scene);
    const gMat = new StandardMaterial('gmat', this.scene);
    const gridTex = this._makeGridTexture();
    gMat.diffuseTexture = gridTex;
    gMat.diffuseColor = new Color3(0.55, 0.62, 0.5);
    gMat.specularColor = new Color3(0.04, 0.04, 0.04);
    ground.material = gMat;
    ground.receiveShadows = true;
    this.meshes.push(ground);

    const wallMat = new StandardMaterial('wallmat', this.scene);
    wallMat.diffuseColor = new Color3(0.28, 0.32, 0.26);
    wallMat.specularColor = new Color3(0.08, 0.08, 0.08);

    const trimMat = new StandardMaterial('trimmat', this.scene);
    trimMat.diffuseColor = new Color3(0.1, 0.2, 0.15);
    trimMat.emissiveColor = new Color3(0.1, 0.5, 0.35);

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

      // Glowing trim strip near the base for sci-fi readability.
      const strip = MeshBuilder.CreateBox(`bstrip${i}`, { width: def.size.x + 0.1, height: 0.3, depth: def.size.z + 0.1 }, this.scene);
      strip.position = new Vector3(def.pos.x, 0.6, def.pos.z);
      strip.material = trimMat;
      strip.isPickable = false;
      this.meshes.push(strip);
    });

    const crateMat = new StandardMaterial('cratemat', this.scene);
    crateMat.diffuseColor = new Color3(0.4, 0.34, 0.22);
    crateMat.specularColor = new Color3(0.06, 0.06, 0.06);

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
      this.shadowGen.addShadowCaster(c);
      this.meshes.push(c);
    });

    // Atmospheric point lights at the corners.
    const lampPositions = [new Vector3(-30, 6, -22), new Vector3(30, 6, 22)];
    lampPositions.forEach((p, i) => {
      const lamp = new PointLight(`lamp${i}`, p, this.scene);
      lamp.diffuse = new Color3(0.3, 0.6, 1);
      lamp.intensity = 0.6;
      lamp.range = 40;
      this.lights.push(lamp);
    });
  }

  private _makeGridTexture(): Texture {
    const size = 512;
    const tex = new DynamicTexture('grid', size, this.scene, true);
    const ctx = tex.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = '#2a3320';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#3c4a2e';
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
