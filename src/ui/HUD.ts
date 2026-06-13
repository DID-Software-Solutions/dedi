import type { Player } from '../entities/Player';
import type { WeaponSystem } from '../systems/WeaponSystem';

export class HUD {
  private root: HTMLElement;

  constructor(container: HTMLElement) {
    this.root = container;
    this.root.innerHTML = this._template();
  }

  private _template(): string {
    return `
      <style>
        #hud{position:absolute;inset:0;pointer-events:none;font-family:monospace;color:#88ff44;}
        #hud-top{position:absolute;top:12px;left:0;right:0;display:flex;justify-content:space-between;padding:0 20px;}
        #hud-wave .num{font-size:24px;font-weight:bold;text-shadow:0 0 12px #88ff44;}
        #hud-score{text-align:center;font-size:16px;letter-spacing:2px;}
        #hud-kills{text-align:right;font-size:16px;}
        .hud-label{font-size:9px;letter-spacing:3px;color:#668844;}
        #hud-enemy-count{position:absolute;top:68px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.5);border:1px solid #334422;border-radius:3px;padding:3px 12px;font-size:10px;letter-spacing:2px;color:#ff4422;}
        #hud-crosshair{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);}
        #hud-health{position:absolute;bottom:20px;left:20px;}
        #hud-health-wrap{width:130px;height:6px;background:#1a2210;border:1px solid #334422;border-radius:2px;overflow:hidden;display:inline-block;vertical-align:middle;}
        #hud-health-bar{height:100%;background:linear-gradient(90deg,#44ff22,#88ff44);box-shadow:0 0 8px #44ff22;transition:width .1s;}
        #hud-health-num{font-size:13px;font-weight:bold;margin-left:8px;vertical-align:middle;}
        #hud-ammo{position:absolute;bottom:20px;right:20px;text-align:right;}
        #hud-ammo-main{font-size:22px;font-weight:bold;text-shadow:0 0 8px #88ff44;}
        #hud-ammo-reserve{font-size:12px;color:#446622;}
        #hud-reload{color:#ffaa22;font-size:11px;letter-spacing:2px;display:none;}
        #hud-crosshair svg{transition:transform .05s;}
        #hud-crosshair.hit svg{transform:scale(1.5);}
        #hud-damage{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,transparent 40%,rgba(255,20,20,.55) 100%);transition:opacity .08s;}
      </style>
      <div id="hud">
        <div id="hud-damage"></div>
        <div id="hud-top">
          <div id="hud-wave"><div class="hud-label">WAVE</div><span class="num" id="hud-wave-num">1</span><span style="font-size:12px;color:#446622;"> / 15</span></div>
          <div id="hud-score"><div class="hud-label">SCORE</div><span id="hud-score-num">0</span></div>
          <div id="hud-kills"><div class="hud-label">KILLS</div><span id="hud-kills-num">0</span></div>
        </div>
        <div id="hud-enemy-count">▲ 0 ENEMIES LEFT</div>
        <div id="hud-crosshair">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <line x1="12" y1="2" x2="12" y2="8" stroke="#88ff44" stroke-width="1.5" opacity="0.85"/>
            <line x1="12" y1="16" x2="12" y2="22" stroke="#88ff44" stroke-width="1.5" opacity="0.85"/>
            <line x1="2" y1="12" x2="8" y2="12" stroke="#88ff44" stroke-width="1.5" opacity="0.85"/>
            <line x1="16" y1="12" x2="22" y2="12" stroke="#88ff44" stroke-width="1.5" opacity="0.85"/>
            <circle cx="12" cy="12" r="1.5" fill="#88ff44" opacity="0.9"/>
          </svg>
        </div>
        <div id="hud-health">
          <div class="hud-label">HEALTH</div>
          <div><div id="hud-health-wrap"><div id="hud-health-bar" style="width:100%;"></div></div><span id="hud-health-num">100</span></div>
        </div>
        <div id="hud-ammo">
          <div class="hud-label">AMMO</div>
          <div id="hud-ammo-main"><span id="hud-ammo-cur">30</span></div>
          <div id="hud-ammo-reserve">/ <span id="hud-ammo-res">90</span></div>
          <div id="hud-reload">RELOADING...</div>
        </div>
      </div>`;
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

  /** Crosshair pulse on hit; brighter on a kill. */
  hitmarker(killed: boolean): void {
    const ch = this.root.querySelector('#hud-crosshair') as HTMLElement;
    if (!ch) return;
    const svg = ch.querySelector('svg');
    if (svg) svg.querySelectorAll('line,circle').forEach((el) =>
      el.setAttribute('stroke', killed ? '#ff3322' : '#ffffff'));
    ch.classList.add('hit');
    setTimeout(() => {
      ch.classList.remove('hit');
      if (svg) svg.querySelectorAll('line,circle').forEach((el) => el.setAttribute('stroke', '#88ff44'));
    }, killed ? 140 : 70);
  }

  /** Red vignette flash when the player takes damage. */
  flashDamage(): void {
    const d = this.root.querySelector('#hud-damage') as HTMLElement;
    if (!d) return;
    d.style.opacity = '1';
    setTimeout(() => { d.style.opacity = '0'; }, 90);
  }

  show(): void { this.root.style.display = 'block'; }
  hide(): void { this.root.style.display = 'none'; }
}
