import { WeaponId, type WeaponDef } from '../types';

const WEAPON_DEFS: Record<WeaponId, WeaponDef> = {
  [WeaponId.AssaultRifle]: {
    id: WeaponId.AssaultRifle,
    damage: 25,
    magazineSize: 30,
    reloadMs: 2000,
    fireIntervalMs: 100,
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
  currentWeapon: WeaponId = WeaponId.AssaultRifle;
  ammo: number = 30;
  reserveAmmo: number = 90;
  isReloading: boolean = false;

  private fireTimer: number = 0;   // cooldown remaining (seconds)
  private reloadTimer: number = 0; // reload remaining (seconds)

  get def(): WeaponDef { return WEAPON_DEFS[this.currentWeapon]; }
  get currentDamage(): number { return this.def.damage; }

  canFire(): boolean {
    return !this.isReloading && this.ammo > 0 && this.fireTimer <= 0;
  }

  fire(): void {
    if (!this.canFire()) return;
    this.ammo--;
    this.fireTimer = this.def.fireIntervalMs / 1000;
    if (this.ammo === 0) this.startReload();
  }

  startReload(): void {
    if (this.isReloading) return;
    if (this.ammo >= this.def.magazineSize) return;
    if (!this.def.unlimitedAmmo && this.reserveAmmo <= 0) return;
    this.isReloading = true;
    this.reloadTimer = this.def.reloadMs / 1000;
  }

  update(dt: number): void {
    if (this.fireTimer > 0) this.fireTimer -= dt;
    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
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
  }

  switchWeapon(): void {
    this.currentWeapon = this.currentWeapon === WeaponId.AssaultRifle
      ? WeaponId.Pistol
      : WeaponId.AssaultRifle;
    this.ammo = this.def.magazineSize;
    this.reserveAmmo = this.def.unlimitedAmmo ? Infinity : 90;
    this.isReloading = false;
    this.fireTimer = 0;
    this.reloadTimer = 0;
  }
}
