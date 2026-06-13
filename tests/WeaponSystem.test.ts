import { describe, it, expect, beforeEach } from 'vitest';
import { WeaponSystem } from '../src/systems/WeaponSystem';
import { WeaponId } from '../src/types';

let ws: WeaponSystem;
beforeEach(() => { ws = new WeaponSystem(); });

describe('WeaponSystem initial state', () => {
  it('starts with AssaultRifle', () => {
    expect(ws.currentWeapon).toBe(WeaponId.AssaultRifle);
    expect(ws.ammo).toBe(30);
    expect(ws.isReloading).toBe(false);
  });
});

describe('WeaponSystem.fire', () => {
  it('decrements ammo on fire', () => {
    ws.fire();
    expect(ws.ammo).toBe(29);
  });

  it('canFire returns false after mag empty', () => {
    for (let i = 0; i < 30; i++) ws.fire();
    ws.update(0); // reset fire timer
    expect(ws.canFire()).toBe(false);
  });

  it('canFire respects fire interval', () => {
    ws.fire();
    expect(ws.canFire()).toBe(false);
    ws.update(0.11);
    expect(ws.canFire()).toBe(true);
  });
});

describe('WeaponSystem.reload', () => {
  it('reloads after delay', () => {
    ws.fire();
    ws.startReload();
    expect(ws.isReloading).toBe(true);
    ws.update(2.1);
    expect(ws.isReloading).toBe(false);
    expect(ws.ammo).toBe(30);
  });

  it('does not reload when mag is full', () => {
    ws.startReload();
    expect(ws.isReloading).toBe(false);
  });
});

describe('WeaponSystem.switchWeapon', () => {
  it('switches to Pistol', () => {
    ws.switchWeapon();
    expect(ws.currentWeapon).toBe(WeaponId.Pistol);
    expect(ws.ammo).toBe(12);
  });

  it('Pistol has infinite reserve ammo', () => {
    ws.switchWeapon();
    expect(ws.reserveAmmo).toBe(Infinity);
  });

  it('switches back to AR', () => {
    ws.switchWeapon();
    ws.switchWeapon();
    expect(ws.currentWeapon).toBe(WeaponId.AssaultRifle);
  });
});
