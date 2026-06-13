/**
 * DEDI needs a mouse + keyboard (pointer-lock aiming, WASD). Touch-only
 * devices can't play, so block them before the engine spins up.
 *
 * `(any-pointer: fine)` is true when ANY connected input is a mouse/trackpad,
 * so a hybrid laptop (touch screen + trackpad) still passes, while phones and
 * tablets are caught.
 */
export function isUnsupportedDevice(): boolean {
  if (typeof window.matchMedia !== 'function') return false; // old browser: let it try
  return !window.matchMedia('(any-pointer: fine)').matches;
}

export function showUnsupportedScreen(host: HTMLElement): void {
  const el = document.createElement('div');
  el.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:9999',
    'display:flex', 'flex-direction:column', 'align-items:center', 'justify-content:center',
    'gap:1.5rem', 'padding:2rem', 'text-align:center',
    'background:radial-gradient(circle at 50% 35%, #0a1018 0%, #030407 80%)',
    'color:#88ff44', 'font-family:monospace', 'pointer-events:auto',
  ].join(';');
  el.innerHTML = `
    <div style="font-size:clamp(2rem,9vw,3.5rem);letter-spacing:0.3em;text-shadow:0 0 18px #2f6;">DEDI</div>
    <div style="width:54px;height:54px;border:2px solid #88ff44;border-radius:50%;
                display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px #2f6;">
      <div style="font-size:1.8rem;">⌨</div>
    </div>
    <div style="font-size:clamp(1rem,4.5vw,1.4rem);color:#cfe;max-width:22rem;line-height:1.5;">
      Desktop only.
    </div>
    <div style="font-size:clamp(0.8rem,3.5vw,1rem);color:#7a8;max-width:22rem;line-height:1.6;">
      This is a mouse + keyboard shooter. Open it on a Mac or PC to play.
    </div>`;
  host.appendChild(el);
}
