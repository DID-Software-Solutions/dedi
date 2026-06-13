# DEDI — Military Wave Shooter

A browser-based first-person tactical wave shooter built with Babylon.js 7, TypeScript, and Vite.

## Quick Start

```bash
npm install
npm run dev          # dev server at http://localhost:3000
npm test             # run unit test suite
npm run build        # production build
```

## Controls

| Key | Action |
|-----|--------|
| W A S D | Move |
| Mouse | Look / Aim |
| LMB hold | Fire (full-auto) |
| R | Reload |
| F | Switch weapon (AR ↔ Pistol) |
| Shift | Sprint (1.6× speed) |
| Ctrl | Crouch (0.6× speed) |
| Esc | Pause / Resume |

Click the game canvas to lock your mouse cursor.

## Gameplay

Survive 15 escalating waves of enemies:

- **Waves 1-5**: Grunts only (3 → 12 enemies)
- **Waves 6-10**: Grunts + Rushers
- **Waves 11-15**: All types including Heavies

**Enemy types:**

| Type | HP | Speed | Notes |
|------|----|-------|-------|
| Grunt | 60 | 4 | Standard infantry |
| Rusher | 30 | 7 | Fast, low HP |
| Heavy | 200 | 2 | Slow tank |

**Weapons:**

| Weapon | Damage | Mag | Reload | Rate |
|--------|--------|-----|--------|------|
| Assault Rifle | 25 | 30 | 2s | 600 RPM |
| Pistol | 18 | 12 | 1.2s | 200 RPM, unlimited ammo |

**Med kits** drop from killed enemies (30% chance). Walk over to heal 30 HP.

## Architecture

```
src/
  main.ts              # Bootstrap + game loop
  types.ts             # Shared enums + interfaces
  waveConfigs.ts       # 15 wave definitions
  entities/
    Player.ts          # HP, score, kills
    Enemy.ts           # Per-type stats + state machine
  scenes/
    GameScene.ts       # Map geometry, lighting, shadows, post-FX
  systems/
    PlayerSystem.ts    # FPS camera, WASD, hitscan shooting
    EnemySystem.ts     # Spawn, AI movement, medkit drops
    WaveSystem.ts      # Wave progression
    WeaponSystem.ts    # Weapon state, ammo, reload
    PhysicsSystem.ts   # Havok physics init
  ui/
    HUD.ts             # DOM overlay: health, ammo, wave, score
    Menus.ts           # Main menu, pause, intermission, game-over, victory
    ControlsWizard.ts  # First-launch controls tutorial
  utils/
    SaveData.ts        # localStorage persistence
    AudioManager.ts    # Babylon.js Sound wrapper
    AssetLoader.ts     # AssetsManager wrapper
tests/
  SaveData.test.ts
  Enemy.test.ts
  WeaponSystem.test.ts
  WaveSystem.test.ts
```

## Tech Stack

- **Babylon.js 7** — 3D engine, PBR materials, shadows, SSAO, bloom
- **Havok** — Physics (via Babylon.js built-in)
- **TypeScript 5** — Strict mode
- **Vite 5** — Dev server + bundler
- **Vitest** — Unit tests (jsdom)

## Persistence

High score and settings saved to `localStorage` under key `dedi_save`. Controls wizard shown once on first visit (`dedi_controls_seen` flag).

## Security

- **CSP header** in `index.html` restricts scripts to `self` + WASM, no inline scripts, no external fetches.
- All UI HTML is static template literals — no user input rendered via innerHTML.
- No backend, no network requests, no external dependencies at runtime.
