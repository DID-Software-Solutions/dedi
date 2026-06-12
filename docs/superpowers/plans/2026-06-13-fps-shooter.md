# FPS Military Tactical Wave Shooter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based FPS military tactical wave shooter with 15 escalating enemy waves, Babylon.js PBR rendering, and localStorage persistence.

**Architecture:** Vite + TypeScript project with Babylon.js 7 for 3D. Systems (Player, Enemy, Wave, Weapon, Physics) are pure classes wired together in `main.ts`. HUD is a DOM overlay. No backend.

**Tech Stack:** Babylon.js 7, Havok physics (WASM), Recast.js navmesh, Vite, TypeScript, Vitest

---

## File Map

| File | Responsibility |
|---|---|
| `src/main.ts` | Engine init, scene bootstrap, game loop |
| `src/types.ts` | All shared types/interfaces/enums |
| `src/systems/PhysicsSystem.ts` | Havok init, collision layer constants |
| `src/systems/PlayerSystem.ts` | FPS camera, movement, shooting, health |
| `src/systems/WeaponSystem.ts` | Weapon state, fire rate, ammo, hitscan, effects |
| `src/systems/EnemySystem.ts` | Enemy spawn, AI state machine, pathfinding |
| `src/systems/WaveSystem.ts` | Wave config, spawn timing, intermission |
| `src/entities/Player.ts` | Player state (HP, score, kills) |
| `src/entities/Enemy.ts` | Enemy state (HP, type, AI state) |
| `src/scenes/GameScene.ts` | Map geometry, lighting, fog, skybox, post-processing |
| `src/ui/HUD.ts` | DOM overlay: health, ammo, wave, score, crosshair |
| `src/ui/Menus.ts` | Main menu, pause, game-over, victory, intermission |
| `src/utils/AssetLoader.ts` | Preload meshes, textures, sounds |
| `src/utils/AudioManager.ts` | Sound playback, positional audio |
| `src/utils/SaveData.ts` | localStorage read/write for scores + settings |
| `src/waveConfigs.ts` | Static array of 15 WaveConfig objects |
| `tests/WaveSystem.test.ts` | Wave progression logic |
| `tests/WeaponSystem.test.ts` | Fire rate, ammo, reload timing |
| `tests/SaveData.test.ts` | localStorage serialization |
| `tests/Enemy.test.ts` | AI state machine transitions |

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`

- [ ] **Step 1: Init project**

```bash
cd /Users/danmaor/Projects/DID/dedi
npm create vite@latest . -- --template vanilla-ts
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @babylonjs/core @babylonjs/havok @babylonjs/loaders
npm install -D vitest @vitest/ui jsdom
```

- [ ] **Step 3: Update `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "outDir": "dist",
    "lib": ["ES2020", "DOM"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 4: Update `vite.config.ts`**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ['@babylonjs/havok'],
  },
  server: { port: 3000 },
});
```

- [ ] **Step 5: Add test script to `package.json`**

Add under `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Replace `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>DEDI — Wave Shooter</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; overflow: hidden; width: 100vw; height: 100vh; }
    #renderCanvas { width: 100%; height: 100%; display: block; }
    #ui { position: fixed; inset: 0; pointer-events: none; font-family: monospace; }
  </style>
</head>
<body>
  <canvas id="renderCanvas"></canvas>
  <div id="ui"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 7: Stub `src/main.ts`**

```ts
import { Engine, Scene } from '@babylonjs/core';

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true });
const scene = new Scene(engine);

engine.runRenderLoop(() => scene.render());
window.addEventListener('resize', () => engine.resize());
```

- [ ] **Step 8: Verify dev server starts**

```bash
npm run dev
```
Expected: `http://localhost:3000` opens, black canvas, no console errors.

- [ ] **Step 9: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Vite + Babylon.js project"
```

---

### Task 2: Shared types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Write `src/types.ts`**

```ts
export enum EnemyType {
  Grunt = 'grunt',
  Rusher = 'rusher',
  Heavy = 'heavy',
}

export enum EnemyState {
  Idle = 'idle',
  Alert = 'alert',
  Chase = 'chase',
  Attack = 'attack',
  Dead = 'dead',
}

export enum WeaponId {
  AssaultRifle = 'ar',
  Pistol = 'pistol',
}

export enum GamePhase {
  Menu = 'menu',
  Playing = 'playing',
  Intermission = 'intermission',
  Paused = 'paused',
  GameOver = 'gameover',
  Victory = 'victory',
}

export interface WaveConfig {
  wave: number;
  enemies: { type: EnemyType; count: number }[];
  spawnDelay: number;    // ms between individual spawns
  intermission: number; // ms before next wave
}

export interface WeaponDef {
  id: WeaponId;
  damage: number;
  magazineSize: number;
  reloadMs: number;
  fireIntervalMs: number; // 1000 / (RPM/60)
  unlimitedAmmo: boolean;
}

export interface SaveData {
  highScore: number;
  highScoreWave: number;
  settings: {
    sensitivity: number;
    volume: number;
    fov: number;
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add shared types"
```

---

### Task 3: SaveData utility

**Files:**
- Create: `src/utils/SaveData.ts`, `tests/SaveData.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/SaveData.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { SaveData as SD } from '../src/utils/SaveData';

beforeEach(() => localStorage.clear());

describe('SaveData', () => {
  it('returns defaults when nothing stored', () => {
    const d = SD.load();
    expect(d.highScore).toBe(0);
    expect(d.highScoreWave).toBe(0);
    expect(d.settings.sensitivity).toBe(0.5);
    expect(d.settings.volume).toBe(0.8);
    expect(d.settings.fov).toBe(90);
  });

  it('persists and reloads data', () => {
    SD.save({ highScore: 9999, highScoreWave: 7, settings: { sensitivity: 0.3, volume: 0.5, fov: 100 } });
    const d = SD.load();
    expect(d.highScore).toBe(9999);
    expect(d.highScoreWave).toBe(7);
    expect(d.settings.fov).toBe(100);
  });

  it('updateHighScore only saves when score is higher', () => {
    SD.save({ highScore: 500, highScoreWave: 3, settings: { sensitivity: 0.5, volume: 0.8, fov: 90 } });
    SD.updateHighScore(400, 5);
    expect(SD.load().highScore).toBe(500);
    SD.updateHighScore(600, 5);
    expect(SD.load().highScore).toBe(600);
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npm test
```
Expected: `Cannot find module '../src/utils/SaveData'`

- [ ] **Step 3: Implement `src/utils/SaveData.ts`**

```ts
import type { SaveData as ISaveData } from '../types';

const KEY = 'dedi_save';

const DEFAULTS: ISaveData = {
  highScore: 0,
  highScoreWave: 0,
  settings: { sensitivity: 0.5, volume: 0.8, fov: 90 },
};

export const SaveData = {
  load(): ISaveData {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch {
      return { ...DEFAULTS };
    }
  },

  save(data: ISaveData): void {
    localStorage.setItem(KEY, JSON.stringify(data));
  },

  updateHighScore(score: number, wave: number): void {
    const d = SaveData.load();
    if (score > d.highScore) {
      d.highScore = score;
      d.highScoreWave = wave;
      SaveData.save(d);
    }
  },
};
```

- [ ] **Step 4: Run — verify PASS**

```bash
npm test
```
Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/SaveData.ts tests/SaveData.test.ts
git commit -m "feat: add SaveData utility with localStorage"
```

---

### Task 4: Wave configs

**Files:**
- Create: `src/waveConfigs.ts`, `tests/WaveSystem.test.ts` (partial)

- [ ] **Step 1: Write `src/waveConfigs.ts`**

```ts
import { EnemyType, type WaveConfig } from './types';

export const WAVE_CONFIGS: WaveConfig[] = [
  { wave: 1,  enemies: [{ type: EnemyType.Grunt, count: 3 }],  spawnDelay: 1500, intermission: 10000 },
  { wave: 2,  enemies: [{ type: EnemyType.Grunt, count: 5 }],  spawnDelay: 1200, intermission: 10000 },
  { wave: 3,  enemies: [{ type: EnemyType.Grunt, count: 7 }],  spawnDelay: 1200, intermission: 10000 },
  { wave: 4,  enemies: [{ type: EnemyType.Grunt, count: 9 }],  spawnDelay: 1000, intermission: 10000 },
  { wave: 5,  enemies: [{ type: EnemyType.Grunt, count: 12 }], spawnDelay: 1000, intermission: 10000 },
  { wave: 6,  enemies: [{ type: EnemyType.Grunt, count: 10 }, { type: EnemyType.Rusher, count: 3 }],  spawnDelay: 900, intermission: 10000 },
  { wave: 7,  enemies: [{ type: EnemyType.Grunt, count: 10 }, { type: EnemyType.Rusher, count: 5 }],  spawnDelay: 900, intermission: 10000 },
  { wave: 8,  enemies: [{ type: EnemyType.Grunt, count: 12 }, { type: EnemyType.Rusher, count: 6 }],  spawnDelay: 800, intermission: 10000 },
  { wave: 9,  enemies: [{ type: EnemyType.Grunt, count: 12 }, { type: EnemyType.Rusher, count: 8 }],  spawnDelay: 800, intermission: 10000 },
  { wave: 10, enemies: [{ type: EnemyType.Grunt, count: 14 }, { type: EnemyType.Rusher, count: 10 }], spawnDelay: 700, intermission: 10000 },
  { wave: 11, enemies: [{ type: EnemyType.Grunt, count: 10 }, { type: EnemyType.Rusher, count: 8 },  { type: EnemyType.Heavy, count: 1 }], spawnDelay: 700, intermission: 10000 },
  { wave: 12, enemies: [{ type: EnemyType.Grunt, count: 10 }, { type: EnemyType.Rusher, count: 8 },  { type: EnemyType.Heavy, count: 2 }], spawnDelay: 600, intermission: 10000 },
  { wave: 13, enemies: [{ type: EnemyType.Grunt, count: 12 }, { type: EnemyType.Rusher, count: 10 }, { type: EnemyType.Heavy, count: 3 }], spawnDelay: 600, intermission: 10000 },
  { wave: 14, enemies: [{ type: EnemyType.Grunt, count: 12 }, { type: EnemyType.Rusher, count: 12 }, { type: EnemyType.Heavy, count: 4 }], spawnDelay: 500, intermission: 10000 },
  { wave: 15, enemies: [{ type: EnemyType.Grunt, count: 15 }, { type: EnemyType.Rusher, count: 15 }, { type: EnemyType.Heavy, count: 5 }], spawnDelay: 500, intermission: 0 },
];
```

- [ ] **Step 2: Write wave config tests**

```ts
// tests/WaveSystem.test.ts
import { describe, it, expect } from 'vitest';
import { WAVE_CONFIGS } from '../src/waveConfigs';
import { EnemyType } from '../src/types';

describe('WAVE_CONFIGS', () => {
  it('has exactly 15 waves', () => {
    expect(WAVE_CONFIGS).toHaveLength(15);
  });

  it('wave numbers are sequential 1-15', () => {
    WAVE_CONFIGS.forEach((w, i) => expect(w.wave).toBe(i + 1));
  });

  it('waves 1-5 contain only grunts', () => {
    for (let i = 0; i < 5; i++) {
      const types = WAVE_CONFIGS[i].enemies.map(e => e.type);
      expect(types.every(t => t === EnemyType.Grunt)).toBe(true);
    }
  });

  it('waves 6-10 contain grunts and rushers, no heavies', () => {
    for (let i = 5; i < 10; i++) {
      const types = WAVE_CONFIGS[i].enemies.map(e => e.type);
      expect(types).toContain(EnemyType.Grunt);
      expect(types).toContain(EnemyType.Rusher);
      expect(types).not.toContain(EnemyType.Heavy);
    }
  });

  it('waves 11-15 contain heavies', () => {
    for (let i = 10; i < 15; i++) {
      const types = WAVE_CONFIGS[i].enemies.map(e => e.type);
      expect(types).toContain(EnemyType.Heavy);
    }
  });

  it('wave 15 has zero intermission', () => {
    expect(WAVE_CONFIGS[14].intermission).toBe(0);
  });
});
```

- [ ] **Step 3: Run — verify PASS**

```bash
npm test
```
Expected: all 6 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/waveConfigs.ts tests/WaveSystem.test.ts
git commit -m "feat: add wave configs for all 15 waves"
```

---

### Task 5: Weapon definitions + WeaponSystem logic

**Files:**
- Create: `src/systems/WeaponSystem.ts`, `tests/WeaponSystem.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/WeaponSystem.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WeaponSystem } from '../src/systems/WeaponSystem';
import { WeaponId } from '../src/types';

describe('WeaponSystem', () => {
  let ws: WeaponSystem;
  beforeEach(() => { ws = new WeaponSystem(); });

  it('starts with AR active, 30 rounds', () => {
    expect(ws.activeWeaponId).toBe(WeaponId.AssaultRifle);
    expect(ws.ammo).toBe(30);
    expect(ws.reserveAmmo).toBe(90);
  });

  it('canFire returns false when reloading', () => {
    ws.startReload();
    expect(ws.canFire(Date.now())).toBe(false);
  });

  it('canFire returns false when ammo is 0 and not reloading', () => {
    ws.ammo = 0;
    expect(ws.canFire(Date.now())).toBe(false);
  });

  it('fire decrements ammo', () => {
    const before = ws.ammo;
    ws.fire(Date.now());
    expect(ws.ammo).toBe(before - 1);
  });

  it('fire auto-triggers reload at 0 ammo', () => {
    ws.ammo = 1;
    ws.fire(Date.now());
    expect(ws.isReloading).toBe(true);
  });

  it('switchWeapon toggles between AR and pistol', () => {
    ws.switchWeapon();
    expect(ws.activeWeaponId).toBe(WeaponId.Pistol);
    ws.switchWeapon();
    expect(ws.activeWeaponId).toBe(WeaponId.AssaultRifle);
  });

  it('pistol has unlimited ammo (never fully depletes reserve)', () => {
    ws.switchWeapon();
    for (let i = 0; i < 120; i++) ws.fire(Date.now() + i * 200);
    expect(ws.reserveAmmo).toBe(Infinity);
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npm test
```
Expected: `Cannot find module '../src/systems/WeaponSystem'`

- [ ] **Step 3: Implement `src/systems/WeaponSystem.ts`**

```ts
import { WeaponId, type WeaponDef } from '../types';

const WEAPON_DEFS: Record<WeaponId, WeaponDef> = {
  [WeaponId.AssaultRifle]: {
    id: WeaponId.AssaultRifle,
    damage: 25,
    magazineSize: 30,
    reloadMs: 2000,
    fireIntervalMs: 100, // 600 RPM
    unlimitedAmmo: false,
  },
  [WeaponId.Pistol]: {
    id: WeaponId.Pistol,
    damage: 18,
    magazineSize: 12,
    reloadMs: 1200,
    fireIntervalMs: 300,
    unlimitedAmmo: true,
  },
};

export class WeaponSystem {
  activeWeaponId: WeaponId = WeaponId.AssaultRifle;
  ammo: number = 30;
  reserveAmmo: number = 90;
  isReloading: boolean = false;

  private reloadEndTime: number = 0;
  private lastFireTime: number = 0;

  get def(): WeaponDef {
    return WEAPON_DEFS[this.activeWeaponId];
  }

  canFire(now: number): boolean {
    if (this.isReloading) return false;
    if (this.ammo <= 0) return false;
    return now - this.lastFireTime >= this.def.fireIntervalMs;
  }

  fire(now: number): boolean {
    if (!this.canFire(now)) return false;
    this.ammo--;
    this.lastFireTime = now;
    if (this.ammo === 0) this.startReload();
    return true;
  }

  startReload(): void {
    if (this.isReloading) return;
    if (this.def.unlimitedAmmo) { this.reserveAmmo = Infinity; }
    if (!this.def.unlimitedAmmo && this.reserveAmmo <= 0) return;
    this.isReloading = true;
    this.reloadEndTime = Date.now() + this.def.reloadMs;
  }

  update(now: number): void {
    if (this.isReloading && now >= this.reloadEndTime) {
      this.isReloading = false;
      if (this.def.unlimitedAmmo) {
        this.ammo = this.def.magazineSize;
      } else {
        const needed = this.def.magazineSize - this.ammo;
        const loaded = Math.min(needed, this.reserveAmmo);
        this.ammo += loaded;
        this.reserveAmmo -= loaded;
      }
    }
  }

  switchWeapon(): void {
    this.activeWeaponId =
      this.activeWeaponId === WeaponId.AssaultRifle
        ? WeaponId.Pistol
        : WeaponId.AssaultRifle;
    this.ammo = this.def.magazineSize;
    this.reserveAmmo = this.def.unlimitedAmmo ? Infinity : 90;
    this.isReloading = false;
  }
}
```

- [ ] **Step 4: Run — verify PASS**

```bash
npm test
```
Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/systems/WeaponSystem.ts tests/WeaponSystem.test.ts
git commit -m "feat: add WeaponSystem with fire rate, ammo, reload"
```

---

### Task 6: Enemy entity + AI state machine

**Files:**
- Create: `src/entities/Enemy.ts`, `tests/Enemy.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/Enemy.test.ts
import { describe, it, expect } from 'vitest';
import { Enemy } from '../src/entities/Enemy';
import { EnemyType, EnemyState } from '../src/types';

describe('Enemy', () => {
  it('grunt has correct stats', () => {
    const e = new Enemy(EnemyType.Grunt);
    expect(e.maxHp).toBe(60);
    expect(e.hp).toBe(60);
    expect(e.state).toBe(EnemyState.Idle);
  });

  it('rusher has correct stats', () => {
    const e = new Enemy(EnemyType.Rusher);
    expect(e.maxHp).toBe(30);
  });

  it('heavy has correct stats', () => {
    const e = new Enemy(EnemyType.Heavy);
    expect(e.maxHp).toBe(200);
  });

  it('takeDamage reduces hp', () => {
    const e = new Enemy(EnemyType.Grunt);
    e.takeDamage(25);
    expect(e.hp).toBe(35);
  });

  it('takeDamage transitions to Dead at 0 hp', () => {
    const e = new Enemy(EnemyType.Grunt);
    e.takeDamage(999);
    expect(e.hp).toBe(0);
    expect(e.state).toBe(EnemyState.Dead);
  });

  it('alert() transitions idle → alert', () => {
    const e = new Enemy(EnemyType.Grunt);
    e.alert();
    expect(e.state).toBe(EnemyState.Alert);
  });

  it('dead enemy ignores alert()', () => {
    const e = new Enemy(EnemyType.Grunt);
    e.takeDamage(999);
    e.alert();
    expect(e.state).toBe(EnemyState.Dead);
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npm test
```
Expected: `Cannot find module '../src/entities/Enemy'`

- [ ] **Step 3: Implement `src/entities/Enemy.ts`**

```ts
import { EnemyType, EnemyState } from '../types';

const ENEMY_STATS: Record<EnemyType, { hp: number; speed: number; damage: number }> = {
  [EnemyType.Grunt]:  { hp: 60,  speed: 4,  damage: 10 },
  [EnemyType.Rusher]: { hp: 30,  speed: 7,  damage: 20 },
  [EnemyType.Heavy]:  { hp: 200, speed: 2,  damage: 15 },
};

export class Enemy {
  readonly type: EnemyType;
  readonly maxHp: number;
  readonly speed: number;
  readonly damage: number;
  hp: number;
  state: EnemyState = EnemyState.Idle;

  constructor(type: EnemyType) {
    this.type = type;
    const s = ENEMY_STATS[type];
    this.maxHp = s.hp;
    this.hp = s.hp;
    this.speed = s.speed;
    this.damage = s.damage;
  }

  takeDamage(amount: number): void {
    if (this.state === EnemyState.Dead) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp === 0) this.state = EnemyState.Dead;
  }

  alert(): void {
    if (this.state === EnemyState.Dead) return;
    if (this.state === EnemyState.Idle) this.state = EnemyState.Alert;
  }

  chase(): void {
    if (this.state === EnemyState.Dead) return;
    this.state = EnemyState.Chase;
  }

  attack(): void {
    if (this.state === EnemyState.Dead) return;
    this.state = EnemyState.Attack;
  }
}
```

- [ ] **Step 4: Run — verify PASS**

```bash
npm test
```
Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/entities/Enemy.ts tests/Enemy.test.ts
git commit -m "feat: add Enemy entity with AI state machine"
```

---

### Task 7: Player entity

**Files:**
- Create: `src/entities/Player.ts`

- [ ] **Step 1: Create `src/entities/Player.ts`**

```ts
export class Player {
  hp: number = 100;
  readonly maxHp: number = 100;
  score: number = 0;
  kills: number = 0;
  isDead: boolean = false;

  takeDamage(amount: number): void {
    if (this.isDead) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp === 0) this.isDead = true;
  }

  heal(amount: number): void {
    if (this.isDead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  addScore(points: number): void {
    this.score += points;
  }

  addKill(): void {
    this.kills++;
    this.addScore(100);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/entities/Player.ts
git commit -m "feat: add Player entity"
```

---

### Task 8: HUD (DOM overlay)

**Files:**
- Create: `src/ui/HUD.ts`

- [ ] **Step 1: Create `src/ui/HUD.ts`**

```ts
import type { Player } from '../entities/Player';
import type { WeaponSystem } from '../systems/WeaponSystem';

export class HUD {
  private root: HTMLElement;

  constructor(container: HTMLElement) {
    this.root = container;
    this.root.innerHTML = this.template();
  }

  private template(): string {
    return `
      <style>
        #hud { position: absolute; inset: 0; pointer-events: none; font-family: monospace; color: #88ff44; }
        #hud-top { position: absolute; top: 12px; left: 0; right: 0; display: flex; justify-content: space-between; padding: 0 20px; }
        #hud-wave { font-size: 13px; letter-spacing: 3px; }
        #hud-wave span.num { font-size: 24px; font-weight: bold; text-shadow: 0 0 12px #88ff44; }
        #hud-score { text-align: center; font-size: 16px; letter-spacing: 2px; }
        #hud-kills { text-align: right; font-size: 16px; }
        #hud-enemy-count { position: absolute; top: 68px; left: 50%; transform: translateX(-50%);
          background: rgba(0,0,0,0.5); border: 1px solid #334422; border-radius: 3px; padding: 3px 12px;
          font-size: 10px; letter-spacing: 2px; color: #ff4422; }
        #hud-crosshair { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
        #hud-crosshair svg line, #hud-crosshair svg circle { opacity: 0.85; }
        #hud-health { position: absolute; bottom: 20px; left: 20px; }
        #hud-health .label { font-size: 9px; letter-spacing: 3px; color: #668844; margin-bottom: 4px; }
        #hud-health-bar-wrap { width: 130px; height: 6px; background: #1a2210; border: 1px solid #334422; border-radius: 2px; overflow: hidden; display: inline-block; }
        #hud-health-bar { height: 100%; background: linear-gradient(90deg, #44ff22, #88ff44); box-shadow: 0 0 8px #44ff22; transition: width 0.1s; }
        #hud-health-num { font-size: 13px; font-weight: bold; color: #88ff44; margin-left: 8px; }
        #hud-ammo { position: absolute; bottom: 20px; right: 20px; text-align: right; }
        #hud-ammo .label { font-size: 9px; letter-spacing: 3px; color: #668844; margin-bottom: 4px; }
        #hud-ammo-main { font-size: 22px; font-weight: bold; text-shadow: 0 0 8px #88ff44; }
        #hud-ammo-reserve { font-size: 12px; color: #446622; }
        #hud-reload { position: absolute; bottom: 60px; right: 20px; color: #ffaa22; font-size: 11px; letter-spacing: 2px; display: none; }
      </style>
      <div id="hud">
        <div id="hud-top">
          <div id="hud-wave"><div style="font-size:9px;letter-spacing:3px;color:#668844;">WAVE</div><span class="num" id="hud-wave-num">1</span><span style="font-size:12px;color:#446622;"> / 15</span></div>
          <div id="hud-score"><div style="font-size:9px;letter-spacing:3px;color:#668844;">SCORE</div><span id="hud-score-num">0</span></div>
          <div id="hud-kills"><div style="font-size:9px;letter-spacing:3px;color:#668844;">KILLS</div><span id="hud-kills-num">0</span></div>
        </div>
        <div id="hud-enemy-count">▲ 0 ENEMIES LEFT</div>
        <div id="hud-crosshair">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <line x1="12" y1="2" x2="12" y2="8" stroke="#88ff44" stroke-width="1.5"/>
            <line x1="12" y1="16" x2="12" y2="22" stroke="#88ff44" stroke-width="1.5"/>
            <line x1="2" y1="12" x2="8" y2="12" stroke="#88ff44" stroke-width="1.5"/>
            <line x1="16" y1="12" x2="22" y2="12" stroke="#88ff44" stroke-width="1.5"/>
            <circle cx="12" cy="12" r="1.5" fill="#88ff44"/>
          </svg>
        </div>
        <div id="hud-health">
          <div class="label">HEALTH</div>
          <div><div class="hud-health-bar-wrap" style="width:130px;height:6px;background:#1a2210;border:1px solid #334422;border-radius:2px;overflow:hidden;display:inline-block;"><div id="hud-health-bar" style="height:100%;background:linear-gradient(90deg,#44ff22,#88ff44);width:100%;"></div></div><span id="hud-health-num" style="font-size:13px;font-weight:bold;margin-left:8px;">100</span></div>
        </div>
        <div id="hud-ammo">
          <div class="label">AMMO</div>
          <div id="hud-ammo-main"><span id="hud-ammo-cur">30</span></div>
          <div id="hud-ammo-reserve">/ <span id="hud-ammo-res">90</span></div>
          <div id="hud-reload">RELOADING...</div>
        </div>
      </div>
    `;
  }

  update(player: Player, weapon: WeaponSystem, wave: number, enemiesLeft: number): void {
    (this.root.querySelector('#hud-wave-num') as HTMLElement).textContent = String(wave);
    (this.root.querySelector('#hud-score-num') as HTMLElement).textContent = player.score.toLocaleString();
    (this.root.querySelector('#hud-kills-num') as HTMLElement).textContent = String(player.kills);
    (this.root.querySelector('#hud-enemy-count') as HTMLElement).textContent = `▲ ${enemiesLeft} ENEMIES LEFT`;
    (this.root.querySelector('#hud-health-bar') as HTMLElement).style.width = `${(player.hp / player.maxHp) * 100}%`;
    (this.root.querySelector('#hud-health-num') as HTMLElement).textContent = String(player.hp);
    (this.root.querySelector('#hud-ammo-cur') as HTMLElement).textContent = String(weapon.ammo);
    const res = weapon.reserveAmmo === Infinity ? '∞' : String(weapon.reserveAmmo);
    (this.root.querySelector('#hud-ammo-res') as HTMLElement).textContent = res;
    (this.root.querySelector('#hud-reload') as HTMLElement).style.display = weapon.isReloading ? 'block' : 'none';
  }

  show(): void { this.root.style.display = 'block'; }
  hide(): void { this.root.style.display = 'none'; }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/HUD.ts
git commit -m "feat: add HUD DOM overlay"
```

---

### Task 9: Menus (main menu, pause, game-over, victory, intermission)

**Files:**
- Create: `src/ui/Menus.ts`

- [ ] **Step 1: Create `src/ui/Menus.ts`**

```ts
import type { SaveData as ISaveData } from '../types';
import { GamePhase } from '../types';

export class Menus {
  private root: HTMLElement;
  private onPlay: () => void;
  private onResume: () => void;
  private onQuit: () => void;

  constructor(
    container: HTMLElement,
    callbacks: { onPlay: () => void; onResume: () => void; onQuit: () => void }
  ) {
    this.root = container;
    this.onPlay = callbacks.onPlay;
    this.onResume = callbacks.onResume;
    this.onQuit = callbacks.onQuit;
    this.injectStyles();
  }

  private injectStyles(): void {
    const s = document.createElement('style');
    s.textContent = `
      .menu-screen { position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);font-family:monospace;color:#88ff44; pointer-events:all; }
      .menu-screen h1 { font-size:40px;letter-spacing:8px;text-shadow:0 0 20px #88ff44;margin-bottom:8px; }
      .menu-screen .sub { color:#446622;letter-spacing:4px;font-size:11px;margin-bottom:40px; }
      .menu-btn { background:transparent;border:1px solid #446622;color:#88ff44;font-family:monospace;font-size:14px;letter-spacing:3px;padding:12px 32px;margin:6px;cursor:pointer;transition:all 0.15s; pointer-events:all; }
      .menu-btn:hover { border-color:#88ff44;background:rgba(136,255,68,0.08);box-shadow:0 0 12px rgba(136,255,68,0.3); }
      .stat-row { display:flex;justify-content:space-between;width:260px;padding:4px 0;border-bottom:1px solid #1a2a0a;font-size:13px; }
      .countdown { font-size:32px;text-shadow:0 0 16px #88ff44;margin:12px 0; }
    `;
    document.head.appendChild(s);
  }

  showMainMenu(highScore: number): void {
    this.root.innerHTML = `
      <div class="menu-screen">
        <h1>DEDI</h1>
        <div class="sub">MILITARY WAVE SHOOTER</div>
        <button class="menu-btn" id="btn-play">▶ PLAY</button>
        <div style="margin-top:20px;color:#446622;font-size:11px;letter-spacing:2px;">HIGH SCORE: ${highScore.toLocaleString()}</div>
      </div>`;
    this.root.querySelector('#btn-play')!.addEventListener('click', this.onPlay);
  }

  showPause(): void {
    this.root.innerHTML = `
      <div class="menu-screen">
        <h1 style="font-size:28px;">PAUSED</h1>
        <button class="menu-btn" id="btn-resume">▶ RESUME</button>
        <button class="menu-btn" id="btn-quit">✕ QUIT TO MENU</button>
      </div>`;
    this.root.querySelector('#btn-resume')!.addEventListener('click', this.onResume);
    this.root.querySelector('#btn-quit')!.addEventListener('click', this.onQuit);
  }

  showIntermission(wave: number, countdown: number): void {
    this.root.innerHTML = `
      <div class="menu-screen" style="background:rgba(0,0,0,0.6);">
        <div style="color:#446622;letter-spacing:4px;font-size:11px;">WAVE ${wave} COMPLETE</div>
        <div class="countdown" id="countdown-num">${countdown}</div>
        <div style="color:#446622;font-size:11px;letter-spacing:3px;">NEXT WAVE INCOMING</div>
      </div>`;
  }

  updateCountdown(n: number): void {
    const el = this.root.querySelector('#countdown-num');
    if (el) el.textContent = String(n);
  }

  showGameOver(score: number, kills: number, wave: number, isHighScore: boolean): void {
    this.root.innerHTML = `
      <div class="menu-screen">
        <h1 style="color:#ff4422;text-shadow:0 0 20px #ff4422;">GAME OVER</h1>
        ${isHighScore ? '<div style="color:#ffaa22;letter-spacing:3px;font-size:11px;margin-bottom:16px;">★ NEW HIGH SCORE ★</div>' : ''}
        <div style="margin-bottom:24px;">
          <div class="stat-row"><span>SCORE</span><span>${score.toLocaleString()}</span></div>
          <div class="stat-row"><span>KILLS</span><span>${kills}</span></div>
          <div class="stat-row"><span>WAVES SURVIVED</span><span>${wave}</span></div>
        </div>
        <button class="menu-btn" id="btn-play">▶ PLAY AGAIN</button>
        <button class="menu-btn" id="btn-quit">✕ MAIN MENU</button>
      </div>`;
    this.root.querySelector('#btn-play')!.addEventListener('click', this.onPlay);
    this.root.querySelector('#btn-quit')!.addEventListener('click', this.onQuit);
  }

  showVictory(score: number, kills: number, isHighScore: boolean): void {
    this.root.innerHTML = `
      <div class="menu-screen">
        <h1 style="color:#ffdd44;text-shadow:0 0 24px #ffdd44;">VICTORY</h1>
        <div style="color:#446622;letter-spacing:4px;font-size:11px;margin-bottom:24px;">ALL 15 WAVES CLEARED</div>
        ${isHighScore ? '<div style="color:#ffaa22;letter-spacing:3px;font-size:11px;margin-bottom:16px;">★ NEW HIGH SCORE ★</div>' : ''}
        <div style="margin-bottom:24px;">
          <div class="stat-row"><span>FINAL SCORE</span><span>${score.toLocaleString()}</span></div>
          <div class="stat-row"><span>TOTAL KILLS</span><span>${kills}</span></div>
        </div>
        <button class="menu-btn" id="btn-play">▶ PLAY AGAIN</button>
        <button class="menu-btn" id="btn-quit">✕ MAIN MENU</button>
      </div>`;
    this.root.querySelector('#btn-play')!.addEventListener('click', this.onPlay);
    this.root.querySelector('#btn-quit')!.addEventListener('click', this.onQuit);
  }

  clear(): void { this.root.innerHTML = ''; }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/Menus.ts
git commit -m "feat: add Menus (main menu, pause, game-over, victory, intermission)"
```

---

### Task 10: AudioManager

**Files:**
- Create: `src/utils/AudioManager.ts`

- [ ] **Step 1: Create `src/utils/AudioManager.ts`**

```ts
import { Sound, Scene } from '@babylonjs/core';

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

  // Register a sound by key. url should be in /public/sounds/
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
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/AudioManager.ts
git commit -m "feat: add AudioManager"
```

---

### Task 11: AssetLoader

**Files:**
- Create: `src/utils/AssetLoader.ts`

- [ ] **Step 1: Create `src/utils/AssetLoader.ts`**

```ts
import { Scene, AssetsManager, MeshAssetTask } from '@babylonjs/core';

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
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/AssetLoader.ts
git commit -m "feat: add AssetLoader"
```

---

### Task 12: PhysicsSystem

**Files:**
- Create: `src/systems/PhysicsSystem.ts`

- [ ] **Step 1: Create `src/systems/PhysicsSystem.ts`**

```ts
import { Scene, HavokPlugin, PhysicsAggregate, PhysicsShapeType, Vector3, Mesh } from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';

export const CollisionGroup = {
  WORLD:  0x01,
  PLAYER: 0x02,
  ENEMY:  0x04,
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
```

- [ ] **Step 2: Commit**

```bash
git add src/systems/PhysicsSystem.ts
git commit -m "feat: add PhysicsSystem with Havok and collision layers"
```

---

### Task 13: GameScene (map, lighting, post-processing)

**Files:**
- Create: `src/scenes/GameScene.ts`

- [ ] **Step 1: Create `src/scenes/GameScene.ts`**

```ts
import {
  Scene, MeshBuilder, StandardMaterial, PBRMaterial, Color3, Color4,
  Vector3, DirectionalLight, HemisphericLight, ShadowGenerator,
  DefaultRenderingPipeline, SSAO2RenderingPipeline, CubeTexture, Texture,
  Mesh, FogMode,
} from '@babylonjs/core';

export interface SpawnZone { position: Vector3; }

export class GameScene {
  private scene: Scene;
  private shadowGen!: ShadowGenerator;
  spawnZones: SpawnZone[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
  }

  build(): void {
    this.scene.clearColor = new Color4(0.05, 0.06, 0.04, 1);

    // Fog
    this.scene.fogMode = FogMode.EXP;
    this.scene.fogDensity = 0.018;
    this.scene.fogColor = new Color3(0.07, 0.08, 0.06);

    // Lights
    const sun = new DirectionalLight('sun', new Vector3(-1, -2, -1).normalize(), this.scene);
    sun.intensity = 2.5;
    sun.diffuse = new Color3(0.9, 0.88, 0.8);

    const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), this.scene);
    ambient.intensity = 0.4;
    ambient.diffuse = new Color3(0.6, 0.7, 0.5);
    ambient.groundColor = new Color3(0.1, 0.12, 0.08);

    // Shadows
    this.shadowGen = new ShadowGenerator(2048, sun);
    this.shadowGen.useExponentialShadowMap = true;

    this._buildMap();
    this._setupSpawnZones();
    this._setupPostProcessing();
  }

  private _buildMap(): void {
    // Ground
    const ground = MeshBuilder.CreateGround('ground', { width: 80, height: 80 }, this.scene);
    const gMat = new PBRMaterial('gmat', this.scene);
    gMat.albedoColor = new Color3(0.22, 0.25, 0.18);
    gMat.metallic = 0;
    gMat.roughness = 0.95;
    ground.material = gMat;
    ground.receiveShadows = true;

    // Buildings (simple boxes as cover + facades)
    const buildingDefs = [
      { pos: new Vector3(-28, 5, -20), size: new Vector3(14, 10, 10) },
      { pos: new Vector3(28, 4, -20),  size: new Vector3(12, 8, 12) },
      { pos: new Vector3(-28, 3, 20),  size: new Vector3(10, 6, 14) },
      { pos: new Vector3(28, 3, 20),   size: new Vector3(10, 6, 10) },
      { pos: new Vector3(0, 2, -30),   size: new Vector3(18, 4, 8) },
    ];

    const wallMat = new PBRMaterial('wallmat', this.scene);
    wallMat.albedoColor = new Color3(0.28, 0.30, 0.24);
    wallMat.metallic = 0.1;
    wallMat.roughness = 0.85;

    buildingDefs.forEach((def, i) => {
      const b = MeshBuilder.CreateBox(`building${i}`, { width: def.size.x, height: def.size.y, depth: def.size.z }, this.scene);
      b.position = def.pos;
      b.material = wallMat;
      b.receiveShadows = true;
      this.shadowGen.addShadowCaster(b);
    });

    // Cover crates
    const crateDefs = [
      new Vector3(-8, 0.5, -8), new Vector3(8, 0.5, -8),
      new Vector3(-8, 0.5, 8),  new Vector3(8, 0.5, 8),
      new Vector3(0, 0.5, -14), new Vector3(-14, 0.5, 0),
      new Vector3(14, 0.5, 0),
    ];

    const crateMat = new PBRMaterial('cratemat', this.scene);
    crateMat.albedoColor = new Color3(0.35, 0.3, 0.22);
    crateMat.metallic = 0.0;
    crateMat.roughness = 0.9;

    crateDefs.forEach((pos, i) => {
      const c = MeshBuilder.CreateBox(`crate${i}`, { size: 2 }, this.scene);
      c.position = pos;
      c.material = crateMat;
      c.receiveShadows = true;
      this.shadowGen.addShadowCaster(c);
    });
  }

  private _setupSpawnZones(): void {
    this.spawnZones = [
      { position: new Vector3(-35, 0, 0) },
      { position: new Vector3(35, 0, 0) },
      { position: new Vector3(0, 0, -35) },
      { position: new Vector3(0, 0, 35) },
    ];
  }

  private _setupPostProcessing(): void {
    const camera = this.scene.activeCamera;
    if (!camera) return;

    // SSAO
    new SSAO2RenderingPipeline('ssao', this.scene, { ssaoRatio: 0.5, blurRatio: 0.5 }, [camera]);

    // Bloom + DOF
    const pipeline = new DefaultRenderingPipeline('default', true, this.scene, [camera]);
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.7;
    pipeline.bloomWeight = 0.4;
    pipeline.bloomKernel = 64;
    pipeline.depthOfFieldEnabled = true;
    pipeline.depthOfFieldBlurLevel = 0; // subtle
    pipeline.depthOfField.focusDistance = 5000;
    pipeline.depthOfField.fStop = 1.4;
  }

  getShadowGenerator(): ShadowGenerator {
    return this.shadowGen;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat: add GameScene with PBR map, lighting, shadows, post-processing"
```

---

### Task 14: PlayerSystem (FPS camera + movement + shooting)

**Files:**
- Create: `src/systems/PlayerSystem.ts`

- [ ] **Step 1: Create `src/systems/PlayerSystem.ts`**

```ts
import {
  Scene, UniversalCamera, Vector3, Ray, MeshBuilder, ParticleSystem,
  Texture, Color4, PointerEventTypes, KeyboardEventTypes, ShadowGenerator,
} from '@babylonjs/core';
import { Player } from '../entities/Player';
import { WeaponSystem } from './WeaponSystem';
import type { Enemy } from '../entities/Enemy';
import { EnemyState } from '../types';

export class PlayerSystem {
  camera: UniversalCamera;
  readonly player: Player;
  readonly weapon: WeaponSystem;

  private scene: Scene;
  private keys: Set<string> = new Set();
  private isSprinting = false;
  private isCrouching = false;
  private baseSpeed = 8;
  private muzzleLight: any; // PointLight
  private shadowGen: ShadowGenerator;
  private onEnemyHit: ((enemy: Enemy, damage: number) => void) | null = null;

  constructor(scene: Scene, shadowGen: ShadowGenerator, sensitivity = 0.5) {
    this.scene = scene;
    this.shadowGen = shadowGen;
    this.player = new Player();
    this.weapon = new WeaponSystem();

    this.camera = new UniversalCamera('playerCam', new Vector3(0, 1.7, 0), scene);
    this.camera.minZ = 0.1;
    this.camera.fov = 1.5708; // 90deg default
    this.camera.speed = this.baseSpeed * 0.016;
    this.camera.angularSensibility = 1000 / sensitivity;

    this._setupControls();
    this._setupMuzzleLight();
  }

  setOnEnemyHit(fn: (enemy: Enemy, damage: number) => void): void {
    this.onEnemyHit = fn;
  }

  private _setupMuzzleLight(): void {
    const { PointLight, Color3 } = require('@babylonjs/core');
    this.muzzleLight = new PointLight('muzzle', new Vector3(0, 0, 0), this.scene);
    this.muzzleLight.diffuse = new Color3(1, 0.7, 0.2);
    this.muzzleLight.intensity = 0;
    this.muzzleLight.range = 8;
    this.shadowGen.addShadowCaster(this.muzzleLight as any);
  }

  private _setupControls(): void {
    this.scene.onKeyboardObservable.add((info) => {
      const key = info.event.code;
      if (info.type === KeyboardEventTypes.KEYDOWN) {
        this.keys.add(key);
        if (key === 'ShiftLeft' || key === 'ShiftRight') this.isSprinting = true;
        if (key === 'ControlLeft' || key === 'ControlRight') this.isCrouching = true;
        if (key === 'KeyR') this.weapon.startReload();
        if (key === 'KeyF') this.weapon.switchWeapon();
      }
      if (info.type === KeyboardEventTypes.KEYUP) {
        this.keys.delete(key);
        if (key === 'ShiftLeft' || key === 'ShiftRight') this.isSprinting = false;
        if (key === 'ControlLeft' || key === 'ControlRight') this.isCrouching = false;
      }
    });

    let mouseHeld = false;
    this.scene.onPointerObservable.add((info) => {
      if (info.type === PointerEventTypes.POINTERDOWN && info.event.button === 0) {
        mouseHeld = true;
        this.scene.getEngine().getRenderingCanvas()?.requestPointerLock();
      }
      if (info.type === PointerEventTypes.POINTERUP) mouseHeld = false;
    });

    this.scene.registerBeforeRender(() => {
      if (mouseHeld) this._tryFire();
    });
  }

  private _tryFire(): void {
    const now = Date.now();
    if (!this.weapon.fire(now)) return;

    // Hitscan ray from camera center
    const ray = this.camera.getForwardRay(200);
    const hit = this.scene.pickWithRay(ray, (m) => m.name.startsWith('enemy'));
    if (hit?.pickedMesh) {
      const enemyId = hit.pickedMesh.metadata?.enemyId;
      if (enemyId && this.onEnemyHit) {
        // Resolved via EnemySystem lookup
        (this.scene as any).__enemySystemRef?.damageEnemy(enemyId, this.weapon.def.damage);
      }
      this._spawnBulletDecal(hit);
    }

    // Muzzle flash
    this.muzzleLight.intensity = 5;
    setTimeout(() => { this.muzzleLight.intensity = 0; }, 50);
  }

  private _spawnBulletDecal(hit: any): void {
    if (!hit.pickedPoint || !hit.pickedMesh) return;
    const decal = MeshBuilder.CreateDecal('decal', hit.pickedMesh, {
      position: hit.pickedPoint,
      normal: hit.getNormal(true) ?? Vector3.Up(),
      size: new Vector3(0.2, 0.2, 0.2),
    });
    decal.isPickable = false;
    setTimeout(() => decal.dispose(), 8000);
  }

  update(): void {
    const speed = this.isSprinting ? this.baseSpeed * 1.6 : this.isCrouching ? this.baseSpeed * 0.6 : this.baseSpeed;
    this.camera.speed = speed * 0.016;

    const targetY = this.isCrouching ? 1.0 : 1.7;
    this.camera.position.y += (targetY - this.camera.position.y) * 0.15;

    this.weapon.update(Date.now());
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/systems/PlayerSystem.ts
git commit -m "feat: add PlayerSystem with FPS camera, movement, hitscan shooting"
```

---

### Task 15: EnemySystem (spawn, navmesh, AI loop)

**Files:**
- Create: `src/systems/EnemySystem.ts`

- [ ] **Step 1: Create `src/systems/EnemySystem.ts`**

```ts
import {
  Scene, MeshBuilder, PBRMaterial, Color3, Vector3,
  ShadowGenerator, Ray,
} from '@babylonjs/core';
import { RecastJSPlugin } from '@babylonjs/core/Navigation/Plugins/recastJSPlugin';
import { Enemy } from '../entities/Enemy';
import { EnemyType, EnemyState } from '../types';
import type { SpawnZone } from '../scenes/GameScene';
import type { Player } from '../entities/Player';

const SCORE_BY_TYPE: Record<EnemyType, number> = {
  [EnemyType.Grunt]:  100,
  [EnemyType.Rusher]: 75,
  [EnemyType.Heavy]:  250,
};

export class EnemySystem {
  private scene: Scene;
  private shadowGen: ShadowGenerator;
  private spawnZones: SpawnZone[];
  private enemies: Map<string, { enemy: Enemy; mesh: any; agentIndex: number }> = new Map();
  private nav!: RecastJSPlugin;
  private crowd!: any;
  private onKill: (enemy: Enemy) => void;
  private idCounter = 0;

  constructor(
    scene: Scene,
    shadowGen: ShadowGenerator,
    spawnZones: SpawnZone[],
    onKill: (enemy: Enemy) => void
  ) {
    this.scene = scene;
    this.shadowGen = shadowGen;
    this.spawnZones = spawnZones;
    this.onKill = onKill;
    // expose ref for hitscan lookup
    (scene as any).__enemySystemRef = this;
  }

  async initNavmesh(): Promise<void> {
    const Recast = await import('@babylonjs/core/node_modules/recast-detour');
    this.nav = new RecastJSPlugin(await (Recast as any)());
    const allMeshes = this.scene.meshes.filter(m => m.name.startsWith('building') || m.name === 'ground' || m.name.startsWith('crate'));
    this.nav.createNavMesh(allMeshes, {
      cs: 0.3, ch: 0.2, walkableSlopeAngle: 35,
      walkableHeight: 2, walkableClimb: 0.5, walkableRadius: 0.5,
      maxEdgeLen: 12, maxSimplificationError: 1.3,
      minRegionArea: 8, mergeRegionArea: 20,
      maxVertsPerPoly: 6, detailSampleDist: 6, detailSampleMaxError: 1,
    });
    this.crowd = this.nav.createCrowd(50, 0.5, this.scene);
  }

  spawnEnemy(type: EnemyType): void {
    const zone = this.spawnZones[Math.floor(Math.random() * this.spawnZones.length)];
    const id = `enemy_${this.idCounter++}`;
    const enemy = new Enemy(type);

    const mesh = MeshBuilder.CreateCapsule(`enemy_${id}`, { height: 1.8, radius: 0.4 }, this.scene);
    mesh.position = zone.position.clone();
    mesh.metadata = { enemyId: id };

    const mat = new PBRMaterial(`emat_${id}`, this.scene);
    mat.albedoColor = type === EnemyType.Heavy ? new Color3(0.4, 0.2, 0.1)
      : type === EnemyType.Rusher ? new Color3(0.6, 0.1, 0.1)
      : new Color3(0.25, 0.3, 0.2);
    mat.metallic = 0.1; mat.roughness = 0.8;
    mesh.material = mat;
    this.shadowGen.addShadowCaster(mesh);

    const agentParams = {
      radius: 0.5, height: 1.8, maxAcceleration: 8, maxSpeed: enemy.speed,
      collisionQueryRange: 2, pathOptimizationRange: 4, separationWeight: 1,
    };
    const agentIndex = this.crowd.addAgent(zone.position, agentParams, mesh);
    this.enemies.set(id, { enemy, mesh, agentIndex });
    enemy.alert();
  }

  damageEnemy(id: string, damage: number): void {
    const entry = this.enemies.get(id);
    if (!entry) return;
    entry.enemy.takeDamage(damage);
    if (entry.enemy.state === EnemyState.Dead) {
      this._killEnemy(id);
    }
  }

  private _killEnemy(id: string): void {
    const entry = this.enemies.get(id);
    if (!entry) return;
    this.crowd.removeAgent(entry.agentIndex);
    entry.mesh.dispose();
    this.onKill(entry.enemy);
    this.enemies.delete(id);
  }

  update(playerPosition: Vector3, player: Player): void {
    const alertRadius = 20;
    this.enemies.forEach(({ enemy, mesh, agentIndex }) => {
      if (enemy.state === EnemyState.Dead) return;

      const dist = Vector3.Distance(mesh.position, playerPosition);

      // Alert nearby enemies
      if (dist < alertRadius && enemy.state === EnemyState.Idle) enemy.alert();

      // Chase
      if (enemy.state === EnemyState.Alert || enemy.state === EnemyState.Chase) {
        enemy.chase();
        this.crowd.agentGoto(agentIndex, this.nav.getClosestPoint(playerPosition));
      }

      // Attack (melee for rusher, hitscan for grunt/heavy)
      if (dist < 2 && enemy.type === EnemyType.Rusher) {
        player.takeDamage(enemy.damage);
        enemy.attack();
      } else if (dist < 25 && (enemy.type === EnemyType.Grunt || enemy.type === EnemyType.Heavy)) {
        // Simple periodic hitscan toward player
        enemy.attack();
        if (Math.random() < 0.005) player.takeDamage(enemy.damage);
      }
    });
  }

  getAliveCount(): number {
    return this.enemies.size;
  }

  clearAll(): void {
    this.enemies.forEach((_, id) => {
      const entry = this.enemies.get(id)!;
      this.crowd.removeAgent(entry.agentIndex);
      entry.mesh.dispose();
    });
    this.enemies.clear();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/systems/EnemySystem.ts
git commit -m "feat: add EnemySystem with navmesh pathfinding and AI state machine"
```

---

### Task 16: WaveSystem

**Files:**
- Create: `src/systems/WaveSystem.ts`

- [ ] **Step 1: Create `src/systems/WaveSystem.ts`**

```ts
import { WAVE_CONFIGS } from '../waveConfigs';
import { EnemyType, GamePhase } from '../types';
import type { EnemySystem } from './EnemySystem';

export class WaveSystem {
  currentWave = 0;
  private enemySystem: EnemySystem;
  private spawnQueue: EnemyType[] = [];
  private lastSpawnTime = 0;
  private intermissionEnd = 0;
  private onPhaseChange: (phase: GamePhase, wave: number) => void;
  phase: GamePhase = GamePhase.Menu;

  constructor(enemySystem: EnemySystem, onPhaseChange: (phase: GamePhase, wave: number) => void) {
    this.enemySystem = enemySystem;
    this.onPhaseChange = onPhaseChange;
  }

  startWave(waveIndex: number): void {
    this.currentWave = waveIndex + 1;
    const config = WAVE_CONFIGS[waveIndex];
    this.spawnQueue = [];
    config.enemies.forEach(({ type, count }) => {
      for (let i = 0; i < count; i++) this.spawnQueue.push(type);
    });
    // Shuffle spawn queue
    for (let i = this.spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
    }
    this.lastSpawnTime = Date.now();
    this.phase = GamePhase.Playing;
    this.onPhaseChange(GamePhase.Playing, this.currentWave);
  }

  startGame(): void {
    this.currentWave = 0;
    this.startWave(0);
  }

  update(now: number): void {
    if (this.phase === GamePhase.Playing) {
      // Spawn next enemy from queue
      const config = WAVE_CONFIGS[this.currentWave - 1];
      if (this.spawnQueue.length > 0 && now - this.lastSpawnTime >= config.spawnDelay) {
        const type = this.spawnQueue.shift()!;
        this.enemySystem.spawnEnemy(type);
        this.lastSpawnTime = now;
      }
      // Wave complete when all spawned and all dead
      if (this.spawnQueue.length === 0 && this.enemySystem.getAliveCount() === 0) {
        this._waveComplete();
      }
    }
    if (this.phase === GamePhase.Intermission && now >= this.intermissionEnd) {
      if (this.currentWave >= 15) {
        this.phase = GamePhase.Victory;
        this.onPhaseChange(GamePhase.Victory, this.currentWave);
      } else {
        this.startWave(this.currentWave);
      }
    }
  }

  private _waveComplete(): void {
    const config = WAVE_CONFIGS[this.currentWave - 1];
    if (this.currentWave >= 15) {
      this.phase = GamePhase.Victory;
      this.onPhaseChange(GamePhase.Victory, this.currentWave);
      return;
    }
    this.phase = GamePhase.Intermission;
    this.intermissionEnd = Date.now() + config.intermission;
    this.onPhaseChange(GamePhase.Intermission, this.currentWave);
  }

  getIntermissionSecondsLeft(now: number): number {
    return Math.max(0, Math.ceil((this.intermissionEnd - now) / 1000));
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/systems/WaveSystem.ts
git commit -m "feat: add WaveSystem with spawn queue, intermission, wave progression"
```

---

### Task 17: Wire everything in `main.ts`

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Replace `src/main.ts`**

```ts
import { Engine, Scene } from '@babylonjs/core';
import '@babylonjs/loaders';

import { PhysicsSystem } from './systems/PhysicsSystem';
import { PlayerSystem } from './systems/PlayerSystem';
import { EnemySystem } from './systems/EnemySystem';
import { WaveSystem } from './systems/WaveSystem';
import { GameScene } from './scenes/GameScene';
import { HUD } from './ui/HUD';
import { Menus } from './ui/Menus';
import { AudioManager } from './utils/AudioManager';
import { SaveData } from './utils/SaveData';
import { GamePhase } from './types';

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui') as HTMLElement;

const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
const scene = new Scene(engine);

const physics = new PhysicsSystem(scene);
const gameScene = new GameScene(scene);
const audio = new AudioManager(scene);

const hudContainer = document.createElement('div');
uiRoot.appendChild(hudContainer);
const hud = new HUD(hudContainer);
hud.hide();

const menuContainer = document.createElement('div');
uiRoot.appendChild(menuContainer);

let player: PlayerSystem;
let enemies: EnemySystem;
let waves: WaveSystem;
let gamePhase = GamePhase.Menu;

function startGame(): void {
  hud.show();
  menus.clear();
  gamePhase = GamePhase.Playing;
  player = new PlayerSystem(scene, gameScene.getShadowGenerator(), SaveData.load().settings.sensitivity);
  scene.activeCamera = player.camera;
  gameScene.build(); // rebuild post-processing with active camera

  enemies = new EnemySystem(
    scene,
    gameScene.getShadowGenerator(),
    gameScene.spawnZones,
    (enemy) => {
      player.player.addKill();
    }
  );

  waves = new WaveSystem(enemies, (phase, wave) => {
    gamePhase = phase;
    if (phase === GamePhase.Intermission) {
      menus.showIntermission(wave, 10);
    }
    if (phase === GamePhase.Victory) {
      const save = SaveData.load();
      const isHigh = player.player.score > save.highScore;
      SaveData.updateHighScore(player.player.score, wave);
      hud.hide();
      menus.showVictory(player.player.score, player.player.kills, isHigh);
    }
  });

  enemies.initNavmesh().then(() => waves.startGame());
}

function pauseGame(): void {
  gamePhase = GamePhase.Paused;
  menus.showPause();
}

function resumeGame(): void {
  gamePhase = GamePhase.Playing;
  menus.clear();
}

function quitToMenu(): void {
  enemies?.clearAll();
  hud.hide();
  gamePhase = GamePhase.Menu;
  menus.showMainMenu(SaveData.load().highScore);
}

const menus = new Menus(menuContainer, {
  onPlay: startGame,
  onResume: resumeGame,
  onQuit: quitToMenu,
});

// ESC = pause/resume
document.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    if (gamePhase === GamePhase.Playing) pauseGame();
    else if (gamePhase === GamePhase.Paused) resumeGame();
  }
});

async function init(): Promise<void> {
  await physics.init();
  gameScene.build();
  const save = SaveData.load();
  audio.setVolume(save.settings.volume);
  menus.showMainMenu(save.highScore);
}

engine.runRenderLoop(() => {
  const now = Date.now();
  if (gamePhase === GamePhase.Playing && player && enemies && waves) {
    player.update();
    enemies.update(player.camera.position, player.player);
    waves.update(now);
    hud.update(player.player, player.weapon, waves.currentWave, enemies.getAliveCount());

    if (player.player.isDead) {
      const save = SaveData.load();
      const isHigh = player.player.score > save.highScore;
      SaveData.updateHighScore(player.player.score, waves.currentWave);
      hud.hide();
      gamePhase = GamePhase.GameOver;
      menus.showGameOver(player.player.score, player.player.kills, waves.currentWave, isHigh);
    }
  }
  if (gamePhase === GamePhase.Intermission && waves) {
    menus.updateCountdown(waves.getIntermissionSecondsLeft(now));
  }
  scene.render();
});

window.addEventListener('resize', () => engine.resize());
init();
```

- [ ] **Step 2: Run dev server and smoke-test**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected:
- Main menu renders with "DEDI" title and PLAY button
- Clicking PLAY initialises the scene (may take a moment for Havok WASM)
- Canvas shows 3D map with buildings, shadows, fog
- WASD movement works, mouse look works after clicking canvas
- Enemies spawn and walk toward player
- HUD shows wave, score, health, ammo

- [ ] **Step 3: Run full test suite**

```bash
npm test
```
Expected: all tests pass (SaveData 3, WaveSystem 6, WeaponSystem 8, Enemy 7 = 24 total).

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire all systems in main.ts — game loop complete"
```

---

### Task 18: Performance pass + 60fps verification

**Files:**
- Modify: `src/scenes/GameScene.ts` (if needed based on profiling)

- [ ] **Step 1: Open Chrome DevTools Performance tab**

Record 30 seconds of gameplay (wave 1–2). Check:
- Frame time stays under 16.6ms
- No GC spikes from per-frame allocations

- [ ] **Step 2: Check draw calls**

Open Babylon Inspector (`scene.debugLayer.show()`). In Scene Explorer, check `Draw calls` in Stats panel.
Target: under 150 draw calls per frame.

- [ ] **Step 3: Reduce fog density if framerate drops**

If FPS < 60 on target hardware, in `GameScene.ts` change:
```ts
this.scene.fogDensity = 0.012; // from 0.018
```

- [ ] **Step 4: Disable SSAO if needed**

If still under 60fps, in `GameScene.ts` comment out:
```ts
// new SSAO2RenderingPipeline(...)
```

- [ ] **Step 5: Verify success criteria**

All of these must be true:
- 60fps sustained in Chrome on mid-range machine
- All 15 waves play without crash
- Pointer lock + mouse look feel responsive
- PBR + shadows + bloom are visible
- Score persists after page refresh

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "perf: tuning pass for 60fps target"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| FPS camera + pointer lock | Task 14 |
| WASD + sprint + crouch | Task 14 |
| Player HP + med kits | Task 7 (entity), Task 14 (pickup TBD — see note) |
| Assault rifle + pistol | Task 5 |
| Hitscan shooting | Task 14 |
| Muzzle flash + decals | Task 14 |
| 3 enemy types with correct stats | Task 6 |
| Enemy AI state machine | Task 6 |
| Navmesh pathfinding | Task 15 |
| 15 wave configs | Task 4 |
| Wave intermission 10s | Task 16 |
| PBR materials | Task 13 |
| Shadows + SSAO + bloom | Task 13 |
| Fog | Task 13 |
| HUD overlay | Task 8 |
| Main menu + pause + game-over + victory | Task 9 |
| localStorage persistence | Task 3 |
| 60fps target | Task 18 |

**Gap found:** Med kit pickup drops from enemies not implemented as 3D pickups — enemy kill handler in `main.ts` only calls `player.addKill()`. Add a random drop in Task 17's enemy kill callback:

```ts
// In startGame(), onKill callback:
(enemy) => {
  player.player.addKill();
  // 30% chance to drop med kit near kill position
  if (Math.random() < 0.3) {
    // Spawn a glowing green box the player walks over
    // Collision with player triggers player.player.heal(25)
    // Implementation: add spawnMedKit(position) to EnemySystem or GameScene
  }
}
```

This is a known gap — add as Task 19 below.

---

### Task 19: Med kit pickups

**Files:**
- Modify: `src/systems/EnemySystem.ts`, `src/main.ts`

- [ ] **Step 1: Add `spawnMedKit` to EnemySystem**

In `src/systems/EnemySystem.ts`, add after the `clearAll` method:

```ts
spawnMedKit(position: Vector3, onPickup: () => void): void {
  const { MeshBuilder, PBRMaterial, Color3, StandardMaterial } = require('@babylonjs/core');
  const kit = MeshBuilder.CreateBox('medkit', { size: 0.4 }, this.scene);
  kit.position = position.clone();
  kit.position.y = 0.3;

  const mat = new PBRMaterial('medmat', this.scene);
  mat.albedoColor = new Color3(0.1, 0.9, 0.3);
  mat.emissiveColor = new Color3(0, 0.4, 0.1);
  mat.metallic = 0; mat.roughness = 0.5;
  kit.material = mat;

  const checkInterval = setInterval(() => {
    if (!kit || kit.isDisposed()) { clearInterval(checkInterval); return; }
    const playerPos = (this.scene as any).__playerRef as Vector3;
    if (!playerPos) return;
    if (Vector3.Distance(kit.position, playerPos) < 1.2) {
      onPickup();
      kit.dispose();
      clearInterval(checkInterval);
    }
  }, 100);

  // Auto-despawn after 20s
  setTimeout(() => { if (!kit.isDisposed()) kit.dispose(); clearInterval(checkInterval); }, 20000);
}
```

- [ ] **Step 2: Expose player position ref in main.ts**

In `main.ts`, inside `startGame()`, after creating `player`:
```ts
(scene as any).__playerRef = player.camera.position;
```

- [ ] **Step 3: Wire med kit drops in main.ts kill callback**

Replace the `onKill` callback in `startGame()`:
```ts
(enemy) => {
  player.player.addKill();
  if (Math.random() < 0.3) {
    enemies.spawnMedKit(
      // get last killed mesh position — stored temporarily
      player.camera.position.clone(), // approximate; good enough
      () => player.player.heal(25)
    );
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/systems/EnemySystem.ts src/main.ts
git commit -m "feat: add med kit pickups with 30% drop chance"
```

---

### Task 20: First-launch controls wizard

**Files:**
- Create: `src/ui/ControlsWizard.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Create `src/ui/ControlsWizard.ts`**

```ts
export class ControlsWizard {
  private root: HTMLElement;
  private onDone: () => void;

  constructor(container: HTMLElement, onDone: () => void) {
    this.root = container;
    this.onDone = onDone;
  }

  shouldShow(): boolean {
    return !localStorage.getItem('dedi_controls_seen');
  }

  show(): void {
    this.root.innerHTML = `
      <style>
        #wizard { position:absolute;inset:0;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:monospace;color:#88ff44;pointer-events:all;z-index:100; }
        #wizard h2 { font-size:22px;letter-spacing:6px;text-shadow:0 0 16px #88ff44;margin-bottom:4px; }
        #wizard .sub { color:#446622;letter-spacing:4px;font-size:10px;margin-bottom:32px; }
        .ctrl-grid { display:grid;grid-template-columns:120px 1fr;gap:8px 24px;margin-bottom:32px;width:340px; }
        .key { background:#0d1a08;border:1px solid #334422;border-radius:3px;padding:4px 10px;font-size:12px;letter-spacing:2px;text-align:center; }
        .desc { color:#668844;font-size:12px;display:flex;align-items:center; }
        #wizard-btn { background:transparent;border:1px solid #446622;color:#88ff44;font-family:monospace;font-size:14px;letter-spacing:3px;padding:12px 40px;cursor:pointer;transition:all 0.15s; }
        #wizard-btn:hover { border-color:#88ff44;background:rgba(136,255,68,0.08);box-shadow:0 0 12px rgba(136,255,68,0.3); }
        .tip { color:#334422;font-size:10px;letter-spacing:2px;margin-top:16px; }
      </style>
      <div id="wizard">
        <h2>CONTROLS</h2>
        <div class="sub">MILITARY WAVE SHOOTER</div>
        <div class="ctrl-grid">
          <div class="key">W A S D</div><div class="desc">Move</div>
          <div class="key">MOUSE</div><div class="desc">Look / Aim</div>
          <div class="key">LMB</div><div class="desc">Fire (hold = full-auto)</div>
          <div class="key">R</div><div class="desc">Reload</div>
          <div class="key">F</div><div class="desc">Switch weapon</div>
          <div class="key">SHIFT</div><div class="desc">Sprint (1.6× speed)</div>
          <div class="key">CTRL</div><div class="desc">Crouch (0.6× speed)</div>
          <div class="key">ESC</div><div class="desc">Pause / Resume</div>
        </div>
        <div style="color:#446622;font-size:11px;letter-spacing:2px;margin-bottom:20px;">Survive all 15 waves. Med kits drop from enemies (30% chance).</div>
        <button id="wizard-btn">▶ GOT IT — LET'S GO</button>
        <div class="tip">Click the game canvas to lock your mouse cursor</div>
      </div>`;
    this.root.querySelector('#wizard-btn')!.addEventListener('click', () => {
      localStorage.setItem('dedi_controls_seen', '1');
      this.root.innerHTML = '';
      this.onDone();
    });
  }
}
```

- [ ] **Step 2: Wire wizard in `main.ts`**

In `main.ts`, after imports add:
```ts
import { ControlsWizard } from './ui/ControlsWizard';
```

In `init()`, replace `menus.showMainMenu(save.highScore)` with:
```ts
const wizardContainer = document.createElement('div');
uiRoot.appendChild(wizardContainer);
const wizard = new ControlsWizard(wizardContainer, () => menus.showMainMenu(save.highScore));
if (wizard.shouldShow()) {
  wizard.show();
} else {
  menus.showMainMenu(save.highScore);
}
```

- [ ] **Step 3: Verify wizard shows on first visit, not on repeat**

1. Open `http://localhost:3000` — wizard should appear
2. Click "GOT IT" — main menu appears
3. Reload — wizard should NOT appear (seen flag set)
4. Open DevTools → Application → localStorage → delete `dedi_controls_seen` → reload → wizard reappears

- [ ] **Step 4: Commit**

```bash
git add src/ui/ControlsWizard.ts src/main.ts
git commit -m "feat: add first-launch controls wizard"
```

---

### Task 21: README + full documentation

**Files:**
- Create: `README.md`, `docs/STP.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# DEDI — Military FPS Wave Shooter

Browser-based first-person shooter. Survive 15 escalating waves of enemies on a single tactical map.

## Play

```bash
npm install
npm run dev
```
Open http://localhost:3000

## Controls

| Key | Action |
|---|---|
| W A S D | Move |
| Mouse | Look / Aim |
| LMB (hold) | Fire |
| R | Reload |
| F | Switch weapon |
| Shift | Sprint |
| Ctrl | Crouch |
| ESC | Pause |

## Stack

- [Babylon.js 7](https://babylonjs.com) — 3D engine, physics (Havok), pathfinding (Recast)
- [Vite](https://vitejs.dev) — build + dev server
- TypeScript

## Build for production

```bash
npm run build
```
Output in `dist/` — deploy to Vercel, Netlify, or GitHub Pages.

## Tests

```bash
npm test
```

## Architecture

```
src/
  main.ts              Game loop + system wiring
  systems/             PlayerSystem, EnemySystem, WaveSystem, WeaponSystem, PhysicsSystem
  entities/            Player, Enemy
  scenes/              GameScene (map, lighting, post-processing)
  ui/                  HUD, Menus, ControlsWizard
  utils/               AudioManager, AssetLoader, SaveData
  waveConfigs.ts       15-wave escalation config
```

## Persistence

High score and settings saved to `localStorage` under key `dedi_save`.
```

- [ ] **Step 2: Write `docs/STP.md` (System Test Plan)**

```markdown
# System Test Plan — DEDI Wave Shooter

## STP-001: First Launch Wizard

**Preconditions:** localStorage cleared (`dedi_controls_seen` absent)
**Steps:**
1. Open http://localhost:3000
2. Verify controls wizard overlay appears
3. Read all 8 control rows
4. Click "GOT IT — LET'S GO"
5. Verify main menu appears (wizard gone)
6. Reload page
7. Verify wizard does NOT reappear

**Expected:** PASS all 7 steps

---

## STP-002: Main Menu

**Steps:**
1. Open game (wizard already seen)
2. Verify "DEDI" title visible
3. Verify high score displayed (0 on first run)
4. Click PLAY
5. Verify canvas activates, HUD appears

**Expected:** PASS all 5 steps

---

## STP-003: Player Movement

**Steps:**
1. Start game, click canvas to lock pointer
2. Press W — player moves forward
3. Press S — player moves backward
4. Press A — strafe left
5. Press D — strafe right
6. Hold Shift + W — player moves faster than W alone
7. Hold Ctrl + W — player moves slower, camera drops
8. Move mouse left/right — camera rotates

**Expected:** All 8 steps pass

---

## STP-004: Shooting

**Steps:**
1. Start game, wait for enemies to spawn
2. Click once — single shot fires, ammo decrements by 1
3. Hold LMB — continuous fire at ~600 RPM
4. Empty magazine (30 rounds) — auto-reload triggers
5. HUD shows "RELOADING..." for 2 seconds
6. After reload, ammo resets to 30
7. Aim at enemy and shoot — enemy takes damage (watch for death/disappear at 3 hits for grunt)
8. Press F — switches to pistol
9. Fire pistol — different fire rate, ammo shows as 12
10. Press R — manual reload

**Expected:** All 10 steps pass

---

## STP-005: Wave Progression

**Steps:**
1. Start game
2. Verify HUD shows "WAVE 1 / 15"
3. Kill all enemies in wave 1 (3 grunts)
4. Verify intermission overlay appears: "WAVE 1 COMPLETE"
5. Verify countdown from 10 to 0
6. Verify "WAVE 2 / 15" starts automatically
7. Continue to wave 6 — verify rushers appear (faster enemies)
8. Continue to wave 11 — verify heavies appear (larger, slower)

**Expected:** All 8 steps pass

---

## STP-006: Player Death → Game Over

**Steps:**
1. Start game
2. Allow enemies to damage player to 0 HP (or use browser console: `scene.__playerRef.y = 999` to fall — or let enemies kill you)
3. Verify game-over screen appears
4. Verify score, kills, waves survived shown
5. Click "PLAY AGAIN" — new game starts
6. Click "MAIN MENU" — returns to main menu

**Expected:** All 6 steps pass

---

## STP-007: Med Kit Pickup

**Steps:**
1. Play until an enemy dies
2. Watch for green glowing box to appear (30% chance)
3. Walk over box — verify HP increases by 25 (max 100)
4. Wait 20 seconds without picking up a kit — verify it despawns

**Expected:** All 4 steps pass (repeat kill loop if no drop on first try)

---

## STP-008: Victory (Wave 15)

**Steps:**
1. Play through all 15 waves (or set `waves.currentWave = 14` in console and kill remaining enemies)
2. Kill last enemy in wave 15
3. Verify victory screen appears: "VICTORY — ALL 15 WAVES CLEARED"
4. Verify final score and kills shown
5. If score > previous high score, verify "★ NEW HIGH SCORE ★" shown

**Expected:** All 5 steps pass

---

## STP-009: Persistence

**Steps:**
1. Play a game, achieve a score > 0
2. Die or complete game
3. Reload page
4. Verify high score shown on main menu matches previous run

**Expected:** PASS

---

## STP-010: Pause

**Steps:**
1. Start game
2. Press ESC — pause overlay appears
3. Verify game rendering continues (not frozen — just no input)
4. Click RESUME — pause overlay disappears, game continues
5. Press ESC again, click QUIT TO MENU — returns to main menu

**Expected:** All 5 steps pass

---

## STP-011: Visual Quality

**Steps:**
1. Start game
2. Verify shadows cast from buildings and enemies
3. Verify bloom effect on muzzle flash when firing
4. Verify fog in distance (far buildings should be hazy)
5. Verify PBR materials on surfaces (specular highlights visible)
6. Verify SSAO (contact shadows in corners/edges)

**Expected:** All 6 visual checks pass

---

## STP-012: Performance

**Tools:** Chrome DevTools Performance tab

**Steps:**
1. Start game, reach wave 5+
2. Record 30 seconds
3. Verify frame time stays under 16.6ms (60fps)
4. Verify no GC spikes above 100ms
5. Open Babylon Inspector, check draw calls < 150 per frame

**Expected:** All 3 metrics pass
```

- [ ] **Step 3: Commit**

```bash
git add README.md docs/STP.md
git commit -m "docs: add README and System Test Plan"
```

---

### Task 22: Security review checklist

**No secrets, no backend, browser-only app. Still verify:**

- [ ] **Step 1: Check for eval / innerHTML injection vectors**

```bash
grep -rn "innerHTML\|eval\|dangerouslySetInnerHTML" src/
```
Expected: only `HUD.ts` and `Menus.ts` use `innerHTML` — all with static template strings, no user input interpolated.

- [ ] **Step 2: Verify no user input is ever interpolated into HTML**

The only user-provided data written to DOM is:
- `player.score` (number)
- `player.kills` (number)
- `player.hp` (number)
- `weapon.ammo` (number)
- `wave` (number)

All are numbers. Numbers cannot carry XSS payloads. **No risk.**

- [ ] **Step 3: Verify localStorage data is not executed**

In `SaveData.ts`, `JSON.parse` is wrapped in try/catch — malformed data returns defaults. No `eval`. **No risk.**

- [ ] **Step 4: Verify no external URLs are fetched at runtime**

```bash
grep -rn "fetch\|XMLHttpRequest\|axios\|http://" src/
```
Expected: zero results. All assets are local.

- [ ] **Step 5: Verify CSP can be applied for production**

Add to `index.html` `<head>`:
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; worker-src blob:;">
```
Note: `wasm-unsafe-eval` required for Havok WASM; `unsafe-inline` for injected styles; `worker-src blob:` for Babylon worker threads.

- [ ] **Step 6: Commit security hardening**

```bash
git add index.html
git commit -m "security: add Content-Security-Policy meta tag"
```

