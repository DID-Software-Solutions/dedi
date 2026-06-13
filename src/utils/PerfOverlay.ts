import { Engine, Scene, SceneInstrumentation } from '@babylonjs/core';

/**
 * Lightweight in-browser perf HUD for the 60fps verification pass (plan Task 18).
 * Toggle with F3. Reads FPS from the engine and draw calls from a
 * SceneInstrumentation — no @babylonjs/inspector dependency, so it adds
 * nothing to the shipped bundle beyond core (already a dep).
 */
export class PerfOverlay {
  private el: HTMLElement;
  private engine: Engine;
  private scene: Scene;
  private instrumentation: SceneInstrumentation;
  private visible = false;
  private acc = 0;
  private _onKey: (e: KeyboardEvent) => void;

  constructor(engine: Engine, scene: Scene, parent: HTMLElement) {
    this.engine = engine;
    this.scene = scene;
    this.instrumentation = new SceneInstrumentation(scene);
    this.instrumentation.captureFrameTime = true;

    this.el = document.createElement('div');
    this.el.style.cssText =
      'position:absolute;top:8px;left:8px;z-index:400;display:none;' +
      'font:11px/1.5 monospace;color:#88ff44;background:rgba(0,0,0,.6);' +
      'padding:6px 10px;border:1px solid #1a2a0a;white-space:pre;pointer-events:none;';
    parent.appendChild(this.el);

    this._onKey = (e: KeyboardEvent) => {
      if (e.code === 'F3') { e.preventDefault(); this.toggle(); }
    };
    window.addEventListener('keydown', this._onKey);
  }

  toggle(): void {
    this.visible = !this.visible;
    this.el.style.display = this.visible ? 'block' : 'none';
  }

  /** Call once per rendered frame. Refreshes the readout ~4x/sec when visible. */
  update(dt: number): void {
    if (!this.visible) return;
    this.acc += dt;
    if (this.acc < 0.25) return;
    this.acc = 0;

    const fps = this.engine.getFps();
    const frameMs = this.instrumentation.frameTimeCounter.lastSecAverage;
    const draws = this.instrumentation.drawCallsCounter.current;
    const meshes = this.scene.getActiveMeshes().length;

    this.el.textContent =
      `FPS    ${fps.toFixed(0)}\n` +
      `frame  ${frameMs.toFixed(1)} ms  (target <16.6)\n` +
      `draws  ${draws}  (target <150)\n` +
      `meshes ${meshes}`;
  }

  dispose(): void {
    window.removeEventListener('keydown', this._onKey);
    this.instrumentation.dispose();
    this.el.remove();
  }
}
