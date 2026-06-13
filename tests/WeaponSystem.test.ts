import { describe, it, expect, beforeEach } from 'vitest';
import { WeaponSystem, WEAPON_DEFS } from '../src/systems/WeaponSystem';
import { WeaponId } from '../src/types';

let ws: WeaponSystem;
beforeEach(() => { ws = new WeaponSystem(); });

describe('WeaponSystem initial state', () => {
  it('starts with the Pistol, only Pistol unlocked', () => {
    expect(ws.currentWeapon).toBe(WeaponId.Pistol);
    expect(ws.ammo).toBe(WEAPON_DEFS[WeaponId.Pistol].magazineSize);
    expect(ws.isReloading).toBe(false);
    expect(ws.unlocked.has(WeaponId.Pistol)).toBe(true);
    expect(ws.unlocked.has(WeaponId.AssaultRifle)).toBe(false);
  });

  it('Pistol has infinite reserve ammo', () => {
    expect(ws.reserveAmmo).toBe(Infinity);
  });
});

describe('WeaponSystem.fire', () => {
  it('decrements ammo on fire', () => {
    ws.fire();
    expect(ws.ammo).toBe(WEAPON_DEFS[WeaponId.Pistol].magazineSize - 1);
  });

  it('canFire respects fire interval', () => {
    ws.fire();
    expect(ws.canFire()).toBe(false);
    ws.update(WEAPON_DEFS[WeaponId.Pistol].fireIntervalMs / 1000 + 0.01);
    expect(ws.canFire()).toBe(true);
  });

  it('Pistol auto-reloads when emptied (unlimited ammo)', () => {
    const mag = WEAPON_DEFS[WeaponId.Pistol].magazineSize;
    for (let i = 0; i < mag; i++) { ws.fire(); ws.update(0.3); }
    expect(ws.ammo).toBe(0);
    expect(ws.isReloading).toBe(true);
    ws.update(1.2);
    expect(ws.ammo).toBe(mag);
  });
});

describe('WeaponSystem.reload', () => {
  it('does not reload when mag is full', () => {
    ws.startReload();
    expect(ws.isReloading).toBe(false);
  });

  it('refills the Pistol mag after the reload delay', () => {
    ws.fire();
    ws.startReload();
    expect(ws.isReloading).toBe(true);
    ws.update(WEAPON_DEFS[WeaponId.Pistol].reloadMs / 1000 + 0.1);
    expect(ws.isReloading).toBe(false);
    expect(ws.ammo).toBe(WEAPON_DEFS[WeaponId.Pistol].magazineSize);
  });

  it('pulls rounds from reserve for limited weapons', () => {
    ws.unlock(WeaponId.Shotgun); // 2 mag / 24 reserve, auto-selects
    expect(ws.currentWeapon).toBe(WeaponId.Shotgun);
    ws.fire(); ws.update(0.7); // 1 left
    const reserveBefore = ws.reserveAmmo;
    ws.startReload();
    ws.update(WEAPON_DEFS[WeaponId.Shotgun].reloadMs / 1000 + 0.1);
    expect(ws.ammo).toBe(2);
    expect(ws.reserveAmmo).toBe(reserveBefore - 1);
  });
});

describe('WeaponSystem unlocking', () => {
  it('unlock adds the weapon and switches to it', () => {
    const def = ws.unlock(WeaponId.AssaultRifle);
    expect(def?.id).toBe(WeaponId.AssaultRifle);
    expect(ws.unlocked.has(WeaponId.AssaultRifle)).toBe(true);
    expect(ws.currentWeapon).toBe(WeaponId.AssaultRifle);
  });

  it('unlock is idempotent (returns null if already unlocked)', () => {
    ws.unlock(WeaponId.AssaultRifle);
    expect(ws.unlock(WeaponId.AssaultRifle)).toBeNull();
  });

  it('unlockByKills unlocks the gun whose threshold is crossed', () => {
    expect(ws.unlockByKills(19)).toBeNull();
    const def = ws.unlockByKills(20); // Shotgun threshold
    expect(def?.id).toBe(WeaponId.Shotgun);
  });
});

describe('WeaponSystem selection', () => {
  it('selectWeapon rejects locked weapons', () => {
    expect(ws.selectWeapon(WeaponId.Launcher)).toBe(false);
    expect(ws.currentWeapon).toBe(WeaponId.Pistol);
  });

  it('switchWeapon only cycles unlocked weapons', () => {
    ws.unlock(WeaponId.AssaultRifle); // now Pistol + AR unlocked, current AR
    ws.switchWeapon();
    expect(ws.currentWeapon).toBe(WeaponId.Pistol);
    ws.switchWeapon();
    expect(ws.currentWeapon).toBe(WeaponId.AssaultRifle);
  });

  it('keeps each weapon’s magazine independent across switches', () => {
    ws.unlock(WeaponId.AssaultRifle);
    ws.fire(); ws.update(0.2); // AR now 29
    ws.selectWeapon(WeaponId.Pistol);
    expect(ws.ammo).toBe(WEAPON_DEFS[WeaponId.Pistol].magazineSize);
    ws.selectWeapon(WeaponId.AssaultRifle);
    expect(ws.ammo).toBe(WEAPON_DEFS[WeaponId.AssaultRifle].magazineSize - 1);
  });
});
