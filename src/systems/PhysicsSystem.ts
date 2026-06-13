import { Scene, HavokPlugin, PhysicsAggregate, PhysicsShapeType, Vector3, type Mesh } from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';

export const CollisionGroup = {
  WORLD:   0x01,
  PLAYER:  0x02,
  ENEMY:   0x04,
  TRIGGER: 0x08,
} as const;

export class PhysicsSystem {
  private scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  async init(): Promise<void> {
    const havok = await HavokPhysics();
    const plugin = new HavokPlugin(true, havok);
    this.scene.enablePhysics(new Vector3(0, -9.81, 0), plugin);
  }

  addCapsule(mesh: Mesh, group: number, mask: number): PhysicsAggregate {
    const agg = new PhysicsAggregate(mesh, PhysicsShapeType.CAPSULE, { mass: 0, restitution: 0 }, this.scene);
    agg.shape.filterMembershipMask = group;
    agg.shape.filterCollideMask = mask;
    return agg;
  }

  addBox(mesh: Mesh, group: number, mask: number, mass = 0): PhysicsAggregate {
    const agg = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass, restitution: 0 }, this.scene);
    agg.shape.filterMembershipMask = group;
    agg.shape.filterCollideMask = mask;
    return agg;
  }
}
