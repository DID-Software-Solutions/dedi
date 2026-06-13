import { Engine, Scene, UniversalCamera, Vector3, Color3 } from '@babylonjs/core';

import { GameScene } from './scenes/GameScene';
import { PlayerSystem } from './systems/PlayerSystem';
import { EnemySystem } from './systems/EnemySystem';
import { WaveSystem } from './systems/WaveSystem';
import { ProjectileSystem } from './systems/ProjectileSystem';
import { HUD } from './ui/HUD';
import { Menus } from './ui/Menus';
import { ControlsWizard } from './ui/ControlsWizard';
import { SaveData } from './utils/SaveData';
import { Juice } from './utils/Juice';
import { ProceduralAudio } from './utils/ProceduralAudio';
import { GamePhase } from './types';
import { isUnsupportedDevice, showUnsupportedScreen } from './ui/DeviceGate';

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLElement;

// Touch-only devices can't play (no pointer-lock aiming / WASD) — block early,
// before the engine and scene are ever built.
if (isUnsupportedDevice()) {
  ui.style.pointerEvents = 'auto';
  showUnsupportedScreen(ui);
  throw new Error('DEDI: unsupported device (desktop only)');
}

const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
const scene = new Scene(engine);

let phase: GamePhase = GamePhase.Menu;

// Placeholder camera prevents "No camera defined" error during menu phase
const menuCamera = new UniversalCamera('menuCam', new Vector3(0, 5, -10), scene);
menuCamera.setTarget(Vector3.Zero());
scene.activeCamera = menuCamera;

const saveData = SaveData.load();

const hudContainer = document.createElement('div');
hudContainer.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
ui.appendChild(hudContainer);

const menuContainer = document.createElement('div');
menuContainer.style.cssText = 'position:absolute;inset:0;';
ui.appendChild(menuContainer);

const wizardContainer = document.createElement('div');
wizardContainer.style.cssText = 'position:absolute;inset:0;z-index:300;';
ui.appendChild(wizardContainer);

const hud = new HUD(hudContainer);
hud.hide();

const juice = new Juice(scene);
const audio = new ProceduralAudio();
const projectiles = new ProjectileSystem(scene);

const waveSystem = new WaveSystem();
let playerSystem: PlayerSystem;
let enemySystem: EnemySystem;
let gameScene: GameScene;
let intermissionTimer = 0;
let intermissionActive = false;

function damagePlayer(dmg: number): void {
  playerSystem.player.takeDamage(dmg);
  juice.addShake(0.4);
  audio.playerHurt();
  hud.flashDamage();
  if (playerSystem.player.isDead) gameOver();
}

projectiles.onPlayerHit = (dmg, pos) => {
  juice.bloodBurst(pos, new Color3(0.8, 0.4, 1));
  damagePlayer(dmg);
};

const menus = new Menus(menuContainer, {
  onPlay: startGame,
  onResume: resumeGame,
  onQuit: quitToMenu,
});

function buildSystems(): void {
  if (typeof playerSystem !== 'undefined') playerSystem.dispose();
  if (typeof enemySystem !== 'undefined') enemySystem.clearAll();
  if (typeof gameScene !== 'undefined') gameScene.dispose();

  playerSystem = new PlayerSystem(scene, canvas);
  enemySystem = new EnemySystem(scene);
  gameScene = new GameScene(scene);
  gameScene.build();
  gameScene.enablePostFX(playerSystem.camera);

  playerSystem.setDeps(juice, audio);
  enemySystem.setDeps(juice, audio, projectiles);
  enemySystem.setSpawnZones(gameScene.spawnZones.map(z => z.position));
  enemySystem.setShadowGenerator(gameScene.getShadowGenerator());
  projectiles.clearAll();
}

function startGame(): void {
  menus.clear();
  audio.resume();
  audio.startAmbient();
  waveSystem.reset();
  buildSystems();
  hud.show();
  phase = GamePhase.Playing;
  playerSystem.enable();
  startNextWave();
}

function startNextWave(): void {
  const config = waveSystem.advance();
  if (!config) { victory(); return; }
  audio.waveStart();
  enemySystem.spawnWave(config);
}

function resumeGame(): void {
  menus.clear();
  phase = GamePhase.Playing;
  playerSystem.enable();
}

function quitToMenu(): void {
  menus.clear();
  audio.stopAmbient();
  if (typeof playerSystem !== 'undefined') playerSystem.disable();
  if (typeof enemySystem !== 'undefined') enemySystem.clearAll();
  if (typeof projectiles !== 'undefined') projectiles.clearAll();
  phase = GamePhase.Menu;
  hud.hide();
  menus.showMainMenu(SaveData.load().highScore);
}

function gameOver(): void {
  phase = GamePhase.GameOver;
  playerSystem.disable();
  hud.hide();
  const isHS = SaveData.updateHighScore(playerSystem.player.score, waveSystem.getCurrentWave());
  menus.showGameOver(playerSystem.player.score, playerSystem.player.kills, waveSystem.getCurrentWave(), isHS);
}

function victory(): void {
  phase = GamePhase.Victory;
  if (typeof playerSystem !== 'undefined') playerSystem.disable();
  hud.hide();
  const isHS = SaveData.updateHighScore(playerSystem.player.score, waveSystem.getCurrentWave());
  menus.showVictory(playerSystem.player.score, playerSystem.player.kills, isHS);
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    if (phase === GamePhase.Playing) {
      phase = GamePhase.Paused;
      playerSystem.disable();
      menus.showPause();
    } else if (phase === GamePhase.Paused) {
      resumeGame();
    }
  }
});

engine.runRenderLoop(() => {
  const dt = engine.getDeltaTime() / 1000;
  scene.render();

  if (phase === GamePhase.Playing && typeof playerSystem !== 'undefined' && typeof enemySystem !== 'undefined') {
    playerSystem.update(dt, (meshId, dmg, hitPoint) => {
      const killed = enemySystem.damageEnemy(meshId, dmg, hitPoint);
      hud.hitmarker(killed);
      if (killed) playerSystem.player.addKill();
    });

    enemySystem.update(dt, playerSystem.camera.position, (dmg) => damagePlayer(dmg));
    projectiles.update(dt, playerSystem.camera.position);

    const healed = enemySystem.checkMedkitPickup(playerSystem.camera.position);
    if (healed > 0) playerSystem.player.heal(healed);

    hud.update(playerSystem.player, playerSystem.weapon, waveSystem.getCurrentWave(), enemySystem.aliveCount());

    if (enemySystem.aliveCount() === 0 && !intermissionActive) {
      const dur = waveSystem.getIntermissionDuration();
      if (!waveSystem.getNextConfig()) {
        victory();
      } else if (dur === 0) {
        startNextWave();
      } else {
        intermissionActive = true;
        intermissionTimer = dur;
        phase = GamePhase.Intermission;
        menus.showIntermission(waveSystem.getCurrentWave(), Math.ceil(intermissionTimer));
      }
    }
  }

  if (phase === GamePhase.Intermission) {
    intermissionTimer -= dt;
    menus.updateCountdown(Math.max(0, Math.ceil(intermissionTimer)));
    if (intermissionTimer <= 0) {
      intermissionActive = false;
      menus.clear();
      phase = GamePhase.Playing;
      startNextWave();
    }
  }
});

window.addEventListener('resize', () => engine.resize());

const wizard = new ControlsWizard(wizardContainer, () => {
  menus.showMainMenu(SaveData.load().highScore);
});

if (wizard.shouldShow()) {
  wizard.show();
} else {
  menus.showMainMenu(saveData.highScore);
}
