import type { Scene } from '@babylonjs/core';
import { Sound } from '@babylonjs/core';

export class AudioManager {
  private scene: Scene;
  private sounds: Map<string, Sound> = new Map();
  private volume: number = 0.8;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  setVolume(v: number): void {
    this.volume = v;
    this.sounds.forEach(s => s.setVolume(v));
  }

  register(key: string, url: string, options: { loop?: boolean; spatial?: boolean } = {}): void {
    const s = new Sound(key, url, this.scene, null, {
      loop: options.loop ?? false,
      autoplay: false,
      spatialSound: options.spatial ?? false,
      volume: this.volume,
    });
    this.sounds.set(key, s);
  }

  play(key: string): void {
    this.sounds.get(key)?.play();
  }

  stop(key: string): void {
    this.sounds.get(key)?.stop();
  }
}
