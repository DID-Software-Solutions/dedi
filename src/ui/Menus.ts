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
    this._injectStyles();
  }

  private _injectStyles(): void {
    if (document.getElementById('menu-styles')) return;
    const s = document.createElement('style');
    s.id = 'menu-styles';
    s.textContent = `
      .menu-screen{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.85);font-family:monospace;color:#88ff44;pointer-events:all;}
      .menu-screen h1{font-size:40px;letter-spacing:8px;text-shadow:0 0 20px #88ff44;margin-bottom:8px;}
      .menu-screen .msub{color:#446622;letter-spacing:4px;font-size:11px;margin-bottom:40px;}
      .menu-btn{background:transparent;border:1px solid #446622;color:#88ff44;font-family:monospace;font-size:14px;letter-spacing:3px;padding:12px 32px;margin:6px;cursor:pointer;transition:all .15s;pointer-events:all;}
      .menu-btn:hover{border-color:#88ff44;background:rgba(136,255,68,.08);box-shadow:0 0 12px rgba(136,255,68,.3);}
      .stat-row{display:flex;justify-content:space-between;width:260px;padding:4px 0;border-bottom:1px solid #1a2a0a;font-size:13px;}
      .countdown{font-size:32px;text-shadow:0 0 16px #88ff44;margin:12px 0;}
    `;
    document.head.appendChild(s);
  }

  showMainMenu(highScore: number): void {
    this.root.innerHTML = `
      <div class="menu-screen">
        <h1>DEDI</h1>
        <div class="msub">MILITARY WAVE SHOOTER</div>
        <button class="menu-btn" id="btn-play">▶ PLAY</button>
        <div style="margin-top:20px;color:#446622;font-size:11px;letter-spacing:2px;">HIGH SCORE: ${Number(highScore).toLocaleString()}</div>
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
      <div class="menu-screen" style="background:rgba(0,0,0,.6);">
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
          <div class="stat-row"><span>SCORE</span><span>${Number(score).toLocaleString()}</span></div>
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
        <div class="msub">ALL 15 WAVES CLEARED</div>
        ${isHighScore ? '<div style="color:#ffaa22;letter-spacing:3px;font-size:11px;margin-bottom:16px;">★ NEW HIGH SCORE ★</div>' : ''}
        <div style="margin-bottom:24px;">
          <div class="stat-row"><span>FINAL SCORE</span><span>${Number(score).toLocaleString()}</span></div>
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

// keep GamePhase import used (for future routing)
export { GamePhase };
