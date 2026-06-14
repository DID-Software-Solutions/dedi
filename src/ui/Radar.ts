import { EnemyType } from '../types';
import type { Obstacle } from '../systems/Collision';

const SIZE = 150;          // CSS px (square)
const RANGE = 45;          // world metres mapped to the radar edge
const ENEMY_COLOR: Record<EnemyType, string> = {
  [EnemyType.Grunt]: '#ff4d33',
  [EnemyType.Rusher]: '#ffaa22',
  [EnemyType.Heavy]: '#ff2e6a',
  [EnemyType.Spitter]: '#cc55ff',
  [EnemyType.Boss]: '#ff1493',
};

interface Blip { x: number; z: number; type: EnemyType }
interface Pickup { x: number; z: number; color: string }

/**
 * Heading-relative enemy radar (player forward = up). Drawn each frame onto a
 * small corner canvas. Pure 2D — no Babylon scene cost.
 */
export class Radar {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private r = SIZE / 2;

  constructor(parent: HTMLElement) {
    const dpr = window.devicePixelRatio || 1;
    this.canvas = document.createElement('canvas');
    this.canvas.width = SIZE * dpr;
    this.canvas.height = SIZE * dpr;
    this.canvas.style.cssText =
      `position:absolute;right:16px;bottom:16px;width:${SIZE}px;height:${SIZE}px;` +
      'pointer-events:none;opacity:.92;';
    parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);
  }

  show(): void { this.canvas.style.display = 'block'; }
  hide(): void { this.canvas.style.display = 'none'; }
  dispose(): void { this.canvas.remove(); }

  /** @param heading camera yaw (rad); forward = (sin h, cos h) in world XZ. */
  update(
    px: number, pz: number, heading: number,
    enemies: Blip[], pickups: Pickup[], obstacles: Obstacle[] = [],
  ): void {
    const ctx = this.ctx;
    const r = this.r;
    const scale = (r - 8) / RANGE;
    const sin = Math.sin(heading);
    const cos = Math.cos(heading);

    ctx.clearRect(0, 0, SIZE, SIZE);

    // Dish + range rings.
    ctx.fillStyle = 'rgba(6,14,4,.7)';
    ctx.beginPath(); ctx.arc(r, r, r - 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1f3a12'; ctx.lineWidth = 1;
    for (const frac of [0.5, 1]) {
      ctx.beginPath(); ctx.arc(r, r, (r - 8) * frac, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.strokeStyle = '#13270b';
    ctx.beginPath(); ctx.moveTo(r, 8); ctx.lineTo(r, SIZE - 8); ctx.moveTo(8, r); ctx.lineTo(SIZE - 8, r); ctx.stroke();

    // Project a world point into radar-local (forward = up = -y on screen).
    // Returns raw (unclamped) coords too, for drawing geometry that may extend
    // partly off-dish.
    const plot = (wx: number, wz: number): { x: number; y: number; off: boolean } => {
      const dx = wx - px, dz = wz - pz;
      const fwd = dx * sin + dz * cos;      // along player forward
      const rgt = dx * cos - dz * sin;      // along player right
      let sx = rgt * scale, sy = -fwd * scale;
      const len = Math.hypot(sx, sy);
      const max = r - 8;
      let off = false;
      if (len > max) { const k = max / len; sx *= k; sy *= k; off = true; }
      return { x: r + sx, y: r + sy, off };
    };
    // Raw projection (no clamp), for filled obstacle footprints.
    const raw = (wx: number, wz: number): { x: number; y: number } => {
      const dx = wx - px, dz = wz - pz;
      const fwd = dx * sin + dz * cos;
      const rgt = dx * cos - dz * sin;
      return { x: r + rgt * scale, y: r - fwd * scale };
    };

    // Level geometry (clipped to the dish).
    ctx.save();
    ctx.beginPath(); ctx.arc(r, r, r - 4, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = 'rgba(90,120,150,.35)';
    ctx.strokeStyle = 'rgba(140,180,210,.5)';
    ctx.lineWidth = 1;
    for (const o of obstacles) {
      ctx.beginPath();
      if (o.kind === 'circle') {
        const c = raw(o.cx, o.cz);
        ctx.arc(c.x, c.y, Math.max(1.5, o.r * scale), 0, Math.PI * 2);
      } else {
        // Box corners rotated into radar-local space (heading-relative).
        const corners = [
          raw(o.cx - o.hx, o.cz - o.hz), raw(o.cx + o.hx, o.cz - o.hz),
          raw(o.cx + o.hx, o.cz + o.hz), raw(o.cx - o.hx, o.cz + o.hz),
        ];
        ctx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y);
        ctx.closePath();
      }
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();

    // Pickups (colour-coded by type).
    for (const m of pickups) {
      const p = plot(m.x, m.z);
      ctx.globalAlpha = p.off ? 0.5 : 1;
      ctx.fillStyle = m.color;
      ctx.fillRect(p.x - 2.5, p.y - 2.5, 5, 5);
      ctx.globalAlpha = 1;
    }

    // Enemies.
    for (const e of enemies) {
      const p = plot(e.x, e.z);
      ctx.fillStyle = ENEMY_COLOR[e.type];
      const rad = e.type === EnemyType.Boss ? 5 : e.type === EnemyType.Heavy ? 3.5 : 2.5;
      ctx.globalAlpha = p.off ? 0.55 : 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Player arrow (always centre, pointing up).
    ctx.fillStyle = '#aaffaa';
    ctx.beginPath();
    ctx.moveTo(r, r - 6);
    ctx.lineTo(r - 4, r + 5);
    ctx.lineTo(r + 4, r + 5);
    ctx.closePath();
    ctx.fill();

    // Bezel.
    ctx.strokeStyle = '#3a6622'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(r, r, r - 2, 0, Math.PI * 2); ctx.stroke();
  }
}
