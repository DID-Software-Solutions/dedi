import { WeaponId, type WeaponDef } from '../types';

export const WEAPON_DEFS: Record<WeaponId, WeaponDef> = {
  [WeaponId.Pistol]: {
    id: WeaponId.Pistol, name: 'DILDO PISTOL',
    damage: 22, magazineSize: 12, reloadMs: 1100, fireIntervalMs: 280,
    unlimitedAmmo: true, reserveMax: 0, pellets: 1, spread: 0,
    auto: false, projectile: false, splashRadius: 0, unlockKills: 0,
  },
  [WeaponId.Shotgun]: {
    id: WeaponId.Shotgun, name: 'DOUBLE BARREL',
    damage: 12, magazineSize: 2, reloadMs: 1400, fireIntervalMs: 650,
    unlimitedAmmo: false, reserveMax: 24, pellets: 9, spread: 0.13,
    auto: false, projectile: false, splashRadius: 0, unlockKills: 20,
  },
  [WeaponId.AssaultRifle]: {
    id: WeaponId.AssaultRifle, name: 'AUTO RIFLE',
    damage: 24, magazineSize: 30, reloadMs: 2000, fireIntervalMs: 100,
    unlimitedAmmo: false, reserveMax: 120, pellets: 1, spread: 0.012,
    auto: true, projectile: false, splashRadius: 0, unlockKills: 40,
  },
  [WeaponId.SMG]: {
    id: WeaponId.SMG, name: 'BUZZ SMG',
    damage: 14, magazineSize: 40, reloadMs: 1500, fireIntervalMs: 60,
    unlimitedAmmo: false, reserveMax: 200, pellets: 1, spread: 0.03,
    auto: true, projectile: false, splashRadius: 0, unlockKills: 60,
  },
  [WeaponId.Launcher]: {
    id: WeaponId.Launcher, name: 'LOAD LAUNCHER',
    damage: 130, magazineSize: 4, reloadMs: 2500, fireIntervalMs: 800,
    unlimitedAmmo: false, reserveMax: 12, pellets: 1, spread: 0,
    auto: false, projectile: true, splashRadius: 5.5, unlockKills: 80,
  },
};

/** Unlock order — also the cycle order for the 1..5 keys and weapon-switch. */
export const WEAPON_ORDER: WeaponId[] = [
  WeaponId.Pistol, WeaponId.Shotgun, WeaponId.AssaultRifle, WeaponId.SMG, WeaponId.Launcher,
];

interface AmmoState { ammo: number; reserve: number; }

export class WeaponSystem {
  currentWeapon: WeaponId = WeaponId.Pistol;
  isReloading: boolean = false;
  readonly unlocked = new Set<WeaponId>([WeaponId.Pistol]);

  /** Per-weapon magazine + reserve, so switching keeps each gun's state. */
  private state: Record<WeaponId, AmmoState>;

  private fireTimer: number = 0;   // cooldown remaining (seconds)
  private reloadTimer: number = 0; // reload remaining (seconds)

  constructor() {
    this.state = {} as Record<WeaponId, AmmoState>;
    for (const id of WEAPON_ORDER) {
      const def = WEAPON_DEFS[id];
      this.state[id] = {
        ammo: def.magazineSize,
        reserve: def.unlimitedAmmo ? Infinity : def.reserveMax,
      };
    }
  }

  get def(): WeaponDef { return WEAPON_DEFS[this.currentWeapon]; }
  get currentDamage(): number { return this.def.damage; }
  get ammo(): number { return this.state[this.currentWeapon].ammo; }
  get reserveAmmo(): number { return this.state[this.currentWeapon].reserve; }

  canFire(): boolean {
    return !this.isReloading && this.ammo > 0 && this.fireTimer <= 0;
  }

  fire(): void {
    if (!this.canFire()) return;
    this.state[this.currentWeapon].ammo--;
    this.fireTimer = this.def.fireIntervalMs / 1000;
    if (this.ammo === 0) {
      if (this._hasReserve()) this.startReload();
      else this._autoSwap();
    }
  }

  private _hasReserve(): boolean {
    return this.def.unlimitedAmmo || this.state[this.currentWeapon].reserve > 0;
  }

  /** Out of ammo with empty reserve → jump to the best loaded unlocked gun. */
  private _autoSwap(): void {
    // Prefer the strongest available; fall back to anything with rounds.
    for (let i = WEAPON_ORDER.length - 1; i >= 0; i--) {
      const id = WEAPON_ORDER[i];
      if (id === this.currentWeapon || !this.unlocked.has(id)) continue;
      const s = this.state[id];
      if (s.ammo > 0 || WEAPON_DEFS[id].unlimitedAmmo || s.reserve > 0) {
        this.selectWeapon(id);
        return;
      }
    }
  }

  startReload(): void {
    if (this.isReloading) return;
    if (this.ammo >= this.def.magazineSize) return;
    if (!this.def.unlimitedAmmo && this.state[this.currentWeapon].reserve <= 0) return;
    this.isReloading = true;
    this.reloadTimer = this.def.reloadMs / 1000;
  }

  update(dt: number): void {
    if (this.fireTimer > 0) this.fireTimer -= dt;
    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        const s = this.state[this.currentWeapon];
        if (this.def.unlimitedAmmo) {
          s.ammo = this.def.magazineSize;
        } else {
          const needed = this.def.magazineSize - s.ammo;
          const loaded = Math.min(needed, s.reserve);
          s.ammo += loaded;
          s.reserve -= loaded;
        }
      }
    }
  }

  /** Cycle to the next unlocked weapon (F key). */
  switchWeapon(): void {
    const cur = WEAPON_ORDER.indexOf(this.currentWeapon);
    for (let i = 1; i <= WEAPON_ORDER.length; i++) {
      const id = WEAPON_ORDER[(cur + i) % WEAPON_ORDER.length];
      if (this.unlocked.has(id)) { this.selectWeapon(id); return; }
    }
  }

  /** Direct-select an unlocked weapon (number keys, auto-swap). */
  selectWeapon(id: WeaponId): boolean {
    if (!this.unlocked.has(id) || id === this.currentWeapon) return false;
    this.currentWeapon = id;
    this.isReloading = false;
    this.fireTimer = 0;
    this.reloadTimer = 0;
    return true;
  }

  /** Unlock a weapon and switch to it. Returns the def if newly unlocked. */
  unlock(id: WeaponId): WeaponDef | null {
    if (this.unlocked.has(id)) return null;
    this.unlocked.add(id);
    this.selectWeapon(id);
    return WEAPON_DEFS[id];
  }

  /** Check kill count against unlock thresholds; unlock the next gun if reached. */
  unlockByKills(kills: number): WeaponDef | null {
    for (const id of WEAPON_ORDER) {
      const def = WEAPON_DEFS[id];
      if (def.unlockKills > 0 && kills >= def.unlockKills && !this.unlocked.has(id)) {
        return this.unlock(id);
      }
    }
    return null;
  }

  /** Ammo pickup: top up the current weapon's reserve (skips unlimited guns). */
  addAmmo(amount: number): void {
    const s = this.state[this.currentWeapon];
    if (this.def.unlimitedAmmo) return;
    s.reserve = Math.min(this.def.reserveMax, s.reserve + amount);
  }
}
