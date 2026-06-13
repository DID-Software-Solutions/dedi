// Procedural Web Audio synth — no asset files needed (CSP-friendly).
// Generates gunshots, impacts, explosions, footsteps and an ambient bed
// entirely from oscillators + filtered noise.

export class ProceduralAudio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private noiseBuffer!: AudioBuffer;
  private ambientGain: GainNode | null = null;
  private volume = 0.8;
  private ready = false;

  /** Must be called from a user gesture (click) to satisfy autoplay policy. */
  resume(): void {
    if (!this.ctx) this._init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  private _init(): void {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);

    // Pre-baked 1s white-noise buffer reused for all noise bursts.
    const len = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    this.ready = true;
  }

  private _now(): number { return this.ctx!.currentTime; }

  private _noise(dur: number): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    src.start(this._now());
    src.stop(this._now() + dur);
    return src;
  }

  // --- Sound effects -------------------------------------------------------

  /** Punchy gunshot: noise crack + low body thump, tuned per weapon. */
  shoot(weapon: 'ar' | 'pistol' | 'shotgun' | 'smg' | 'launcher' = 'ar'): void {
    if (!this.ready) return;
    // Per-weapon tone: [crack peak, highpass Hz, crack dur, thump start, thump dur].
    const tone = {
      ar:       { peak: 0.5,  hp: 700,  dur: 0.12, sub: 180, subDur: 0.1 },
      pistol:   { peak: 0.42, hp: 1100, dur: 0.12, sub: 180, subDur: 0.1 },
      smg:      { peak: 0.34, hp: 1300, dur: 0.08, sub: 150, subDur: 0.07 },
      shotgun:  { peak: 0.6,  hp: 450,  dur: 0.22, sub: 110, subDur: 0.2 },
      launcher: { peak: 0.55, hp: 260,  dur: 0.3,  sub: 80,  subDur: 0.35 },
    }[weapon];
    const t = this._now();
    const g = this.ctx!.createGain();
    g.connect(this.master);
    g.gain.setValueAtTime(tone.peak, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + tone.dur);

    const hp = this.ctx!.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = tone.hp;
    const noise = this._noise(tone.dur);
    noise.connect(hp);
    hp.connect(g);

    // Low-end thump for weight.
    const osc = this.ctx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(tone.sub, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + tone.subDur);
    const og = this.ctx!.createGain();
    og.gain.setValueAtTime(0.5, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + tone.subDur);
    osc.connect(og);
    og.connect(this.master);
    osc.start(t);
    osc.stop(t + tone.subDur);
  }

  /** Metallic reload click-clack (two short transients). */
  reload(): void {
    if (!this.ready) return;
    [0, 0.18].forEach((delay, i) => {
      const t = this._now() + delay;
      const g = this.ctx!.createGain();
      g.connect(this.master);
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      const bp = this.ctx!.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = i === 0 ? 2200 : 1600;
      bp.Q.value = 4;
      const noise = this.ctx!.createBufferSource();
      noise.buffer = this.noiseBuffer;
      noise.start(t);
      noise.stop(t + 0.05);
      noise.connect(bp);
      bp.connect(g);
    });
  }

  /** Wet thud when a round connects with an enemy. */
  hit(): void {
    if (!this.ready) return;
    const t = this._now();
    const osc = this.ctx!.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  /** Crunchy explosion for enemy deaths. */
  explosion(): void {
    if (!this.ready) return;
    const t = this._now();
    const g = this.ctx!.createGain();
    g.connect(this.master);
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    const lp = this.ctx!.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1800, t);
    lp.frequency.exponentialRampToValueAtTime(120, t + 0.5);
    const noise = this._noise(0.5);
    noise.connect(lp);
    lp.connect(g);

    const sub = this.ctx!.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(90, t);
    sub.frequency.exponentialRampToValueAtTime(35, t + 0.4);
    const sg = this.ctx!.createGain();
    sg.gain.setValueAtTime(0.6, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    sub.connect(sg);
    sg.connect(this.master);
    sub.start(t);
    sub.stop(t + 0.4);
  }

  /** Distorted zap for enemy projectile launches. */
  enemyShoot(): void {
    if (!this.ready) return;
    const t = this._now();
    const osc = this.ctx!.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.18);
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  /** Muffled grunt + low thump when the player gets hit. */
  playerHurt(): void {
    if (!this.ready) return;
    const t = this._now();
    const osc = this.ctx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.25);
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  /** Bright pickup chime for medkits. */
  pickup(): void {
    if (!this.ready) return;
    [660, 990].forEach((f, i) => {
      const t = this._now() + i * 0.08;
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = this.ctx!.createGain();
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  /** Rising sting played at the start of each wave. */
  waveStart(): void {
    if (!this.ready) return;
    const t = this._now();
    const osc = this.ctx!.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.6);
    const lp = this.ctx!.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0, t);
    g.gain.linearRampToValueAtTime(0.3, t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    osc.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.7);
  }

  /** Soft footstep tick. */
  footstep(): void {
    if (!this.ready) return;
    const t = this._now();
    const g = this.ctx!.createGain();
    g.connect(this.master);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    const lp = this.ctx!.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 500;
    const noise = this.ctx!.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.start(t);
    noise.stop(t + 0.06);
    noise.connect(lp);
    lp.connect(g);
  }

  /** Low droning ambient bed; loops until stopped. */
  startAmbient(): void {
    if (!this.ready || this.ambientGain) return;
    const t = this._now();
    this.ambientGain = this.ctx!.createGain();
    this.ambientGain.gain.setValueAtTime(0, t);
    this.ambientGain.gain.linearRampToValueAtTime(0.06, t + 2);
    this.ambientGain.connect(this.master);

    [55, 82.5, 110].forEach((f) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      const lp = this.ctx!.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 220;
      osc.connect(lp);
      lp.connect(this.ambientGain!);
      osc.start(t);
    });
  }

  stopAmbient(): void {
    if (!this.ambientGain) return;
    const t = this._now();
    this.ambientGain.gain.cancelScheduledValues(t);
    this.ambientGain.gain.linearRampToValueAtTime(0, t + 0.6);
    const g = this.ambientGain;
    setTimeout(() => g.disconnect(), 800);
    this.ambientGain = null;
  }
}
