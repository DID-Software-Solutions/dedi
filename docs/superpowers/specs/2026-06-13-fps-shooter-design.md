# FPS Military Tactical Wave Shooter — Design Spec

**Date:** 2026-06-13  
**Stack:** Babylon.js 7 · Vite · TypeScript  
**Platform:** Web browser (desktop)  
**Mode:** Single player, wave survival

---

## Overview

A first-person military tactical shooter playable in the browser. The player defends a single map through 15 escalating waves of enemies. No backend — all state in localStorage. Focus: tight gunfeel, good-looking 3D visuals via Babylon.js PBR rendering, and satisfying wave escalation loop.

---

## Tech Stack

| Concern | Tool |
|---|---|
| 3D engine | Babylon.js 7.x |
| Physics | Havok (built into Babylon 7, WASM) |
| Enemy pathfinding | Recast.js (Babylon Navigation Plugin) |
| Build / dev server | Vite |
| Language | TypeScript |
| UI / HUD | HTML overlay (DOM, not in-scene) |
| Persistence | localStorage (scores, settings) |
| Audio | Babylon.js Sound API |
| Deploy | Static (Vercel / Netlify / GitHub Pages) |

---

## File Structure

```
src/
  main.ts                  — engine init, scene bootstrap, game loop entry
  systems/
    PlayerSystem.ts        — FPS camera, movement, shooting, health
    EnemySystem.ts         — spawn, pathfinding, AI state machine
    WaveSystem.ts          — wave config, spawn timing, escalation
    WeaponSystem.ts        — weapon definitions, fire rate, ammo, effects
    PhysicsSystem.ts       — Havok init, collision layer setup
  entities/
    Player.ts              — player state, health, inventory
    Enemy.ts               — enemy state, type definition, HP
    Projectile.ts          — hitscan ray result, decal placement
  ui/
    HUD.ts                 — health bar, ammo counter, wave indicator, score
    Menus.ts               — main menu, pause screen, game-over, high scores
  scenes/
    GameScene.ts           — map geometry, lighting, fog, skybox
  utils/
    AssetLoader.ts         — mesh/texture/sound preloading
    AudioManager.ts        — sound effects, ambient audio
docs/
  superpowers/specs/
    2026-06-13-fps-shooter-design.md
```

---

## Core Systems

### Player System

- **Camera:** Babylon `UniversalCamera` with pointer lock on click
- **Movement:** WASD, sprint (Shift, 1.6× speed), crouch (Ctrl, 0.6× speed + camera lower)
- **Health:** 100 HP, no regeneration. Med kit pickups dropped by enemies restore 25 HP (max 100)
- **Weapon slot:** Single active weapon in v1; pistol always available as fallback
- **Death:** Triggers game-over screen with score summary

### Enemy AI

State machine per enemy: `idle → alert → chase → attack → dead`

| Type | HP | Speed | Behavior |
|---|---|---|---|
| Grunt | 60 | Medium | Rifle, engages at mid-range |
| Rusher | 30 | Fast | Melee, swarms in packs, low HP |
| Heavy | 200 | Slow | Suppression fire, takes cover |

- Navmesh via Recast.js — enemies navigate around static geometry
- Spawn zones at 4 fixed positions at map edges (trigger volumes)
- Alert radius: enemies within 20m of player or gunshot trigger `alert` state
- Attack: Grunt/Heavy use hitscan (same as player); Rusher uses melee collision

### Wave System

15 waves defined in a static config array:

```ts
type WaveConfig = {
  wave: number;
  enemies: { type: EnemyType; count: number }[];
  spawnDelay: number;      // ms between individual spawns
  intermission: number;   // ms break before next wave starts
};
```

- Waves 1–5: Grunts only, escalating count (3 → 12)
- Waves 6–10: Grunts + Rushers
- Waves 11–15: All types, Heavies introduced wave 11
- 10s intermission between waves (HUD countdown, enemies stop spawning)
- Wave 15 completion → victory screen with final score

### Weapon System

**Assault Rifle (primary)**
- Hitscan raycast from camera center
- 30-round magazine, 2s reload animation
- Fire rate: 600 RPM full-auto (hold); tap for semi-auto
- Damage: 25 per hit (Grunt dies in 3 hits, Heavy in 8)
- Effects: muzzle flash particle, bullet decal on surfaces, camera shake

**Pistol (always available)**
- Unlimited ammo, 12-round magazine, 1.2s reload
- Damage: 18 per hit, slower fire rate
- Fallback when AR is empty

### Physics & Collision

- Havok physics, WASM build
- Collision layers: `WORLD`, `PLAYER`, `ENEMY`, `TRIGGER`
- All shooting via ray-mesh intersection (not physics projectiles) — instant hit, no travel time
- Player capsule collider for movement/gravity
- Enemy capsule colliders for navmesh + hit detection

---

## Visuals & Rendering

### Babylon.js Pipeline

| Feature | Implementation |
|---|---|
| Materials | PBR (metal/roughness) on all meshes |
| Shadows | `ShadowGenerator` — sun + muzzle flash as dynamic lights |
| SSAO | `SSAO2RenderingPipeline` |
| Bloom | `DefaultRenderingPipeline` bloom on emissive (muzzle, enemy glow) |
| Depth of field | Subtle DOF on `DefaultRenderingPipeline`, locked to crosshair distance |
| Fog | Babylon exponential fog — atmosphere + performance limiter |
| Particles | `ParticleSystem` for muzzle flash, blood, explosions |
| Skybox | CubeTexture skybox (military overcast look) |

### Map

- Single urban/industrial map — building facades, cover objects (crates, barriers), open central area
- Static geometry, baked lighting textures for surfaces
- 4 spawn zones at map perimeter (trigger volumes activate waves)
- Ambient: overcast daylight, directional sun at low angle for long shadows

### Color Palette / HUD

- Game world: muted greens/browns, desaturated military palette
- HUD: monochrome green-on-dark (`#88ff44` / `#1a1e14`) — tactical overlay feel
- HUD elements: wave indicator (top-left), score (top-center), kills (top-right), health bar (bottom-left), ammo counter (bottom-right), crosshair (center), enemy count (top-center below wave)

---

## UI Screens

1. **Main Menu** — title, Play, High Scores, Settings
2. **In-Game HUD** — see above (DOM overlay)
3. **Pause** — ESC key, resume/quit options
4. **Wave Intermission** — "Wave X complete — Wave Y starting in 10s" countdown
5. **Game Over** — final wave reached, score, kills, high score flag if new record
6. **Victory** — wave 15 cleared, same stats

---

## Persistence (localStorage)

```ts
interface SaveData {
  highScore: number;
  highScoreWave: number;
  settings: {
    sensitivity: number;    // mouse look speed
    volume: number;
    fov: number;            // field of view, 75–110
  };
}
```

---

## Audio

- Gunshot, reload, empty-click (weapon)
- Hit confirm (enemy damage)
- Death sounds (grunt / heavy / rusher variants)
- Ambient wind + distant gunfire loop
- Wave start / wave complete stings
- All via Babylon `Sound` with positional audio on enemy sounds

---

## Out of Scope (v1)

- Multiplayer
- Multiple maps
- Weapon pickups / switching mid-wave
- Procedural generation
- Mobile / touch controls
- Backend / leaderboards

---

## Success Criteria

1. Game runs at 60fps in Chrome on a mid-range laptop
2. All 15 waves playable start to finish without crashes
3. Controls feel responsive (pointer lock, no input lag)
4. Visuals demonstrate PBR + shadows + bloom — clearly "cool 3D graphics"
5. Score persists across sessions via localStorage
