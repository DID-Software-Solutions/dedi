import { EnemyType } from '../types';

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
  update(px: number, pz: number, heading: number, enemies: Blip[], medkits: { x: number; z: number }[]): void {
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

    // Medkits.
    for (const m of medkits) {
      const p = plot(m.x, m.z);
      ctx.fillStyle = p.off ? '#2a6638' : '#44ff66';
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
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
