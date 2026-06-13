import { Scene, AssetsManager, type MeshAssetTask } from '@babylonjs/core';

export class AssetLoader {
  private manager: AssetsManager;

  constructor(scene: Scene) {
    this.manager = new AssetsManager(scene);
    this.manager.useDefaultLoadingScreen = false;
  }

  addMesh(name: string, rootUrl: string, filename: string): MeshAssetTask {
    return this.manager.addMeshTask(name, '', rootUrl, filename);
  }

  loadAll(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.manager.onFinish = () => resolve();
      this.manager.onTaskError = (task) => reject(new Error(`Asset load failed: ${task.name}`));
      this.manager.load();
    });
  }
}
