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
        #wizard{position:absolute;inset:0;background:rgba(0,0,0,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:monospace;color:#88ff44;pointer-events:all;z-index:200;}
        #wizard h2{font-size:22px;letter-spacing:6px;text-shadow:0 0 16px #88ff44;margin-bottom:4px;}
        #wizard .wsub{color:#446622;letter-spacing:4px;font-size:10px;margin-bottom:28px;}
        .ctrl-grid{display:grid;grid-template-columns:130px 1fr;gap:8px 24px;margin-bottom:28px;width:360px;}
        .key{background:#0d1a08;border:1px solid #334422;border-radius:3px;padding:4px 10px;font-size:12px;letter-spacing:2px;text-align:center;}
        .desc{color:#668844;font-size:12px;display:flex;align-items:center;}
        #wizard-btn{background:transparent;border:1px solid #446622;color:#88ff44;font-family:monospace;font-size:14px;letter-spacing:3px;padding:12px 40px;cursor:pointer;transition:all .15s;}
        #wizard-btn:hover{border-color:#88ff44;background:rgba(136,255,68,.08);box-shadow:0 0 12px rgba(136,255,68,.3);}
        .wtip{color:#334422;font-size:10px;letter-spacing:2px;margin-top:14px;}
      </style>
      <div id="wizard">
        <h2>CONTROLS</h2>
        <div class="wsub">MILITARY WAVE SHOOTER</div>
        <div class="ctrl-grid">
          <div class="key">W A S D</div><div class="desc">Move</div>
          <div class="key">MOUSE</div><div class="desc">Look / Aim</div>
          <div class="key">LMB (hold)</div><div class="desc">Fire full-auto</div>
          <div class="key">R</div><div class="desc">Reload</div>
          <div class="key">F</div><div class="desc">Switch weapon</div>
          <div class="key">SHIFT</div><div class="desc">Sprint (1.6× speed)</div>
          <div class="key">CTRL</div><div class="desc">Crouch (0.6× speed)</div>
          <div class="key">ESC</div><div class="desc">Pause / Resume</div>
        </div>
        <div style="color:#446622;font-size:11px;letter-spacing:2px;margin-bottom:18px;">Survive all 15 waves. Med kits drop from enemies (30% chance).</div>
        <button id="wizard-btn">▶ GOT IT — LET'S GO</button>
        <div class="wtip">Click the game canvas to lock your mouse cursor</div>
      </div>`;
    this.root.querySelector('#wizard-btn')!.addEventListener('click', () => {
      localStorage.setItem('dedi_controls_seen', '1');
      this.root.innerHTML = '';
      this.onDone();
    });
  }
}
