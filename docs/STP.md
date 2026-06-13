# System Test Plan — DEDI Wave Shooter

**Version:** 1.0  
**Date:** 2026-06-13  
**Environment:** Chrome/Firefox, http://localhost:3000 (`npm run dev`)

---

## STP-001: First-Launch Controls Wizard

**Precondition:** Clear `localStorage` (DevTools → Application → Storage → Clear).

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open http://localhost:3000 | Controls wizard displays fullscreen with all 8 key bindings |
| 2 | Verify listed controls | W/A/S/D, Mouse, LMB, R, F, Shift, Ctrl, Esc all shown |
| 3 | Click "GOT IT — LET'S GO" | Wizard closes; main menu appears |
| 4 | Refresh page | Wizard does NOT show again; main menu shows directly |

**Pass criteria:** Wizard shows exactly once per browser; all controls listed.

---

## STP-002: Main Menu Display

**Precondition:** Wizard already dismissed.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open game | "DEDI" title, "MILITARY WAVE SHOOTER" subtitle visible |
| 2 | Check high score | "HIGH SCORE: 0" shown on first launch |
| 3 | Click PLAY | Game starts; main menu disappears; HUD appears |

**Pass criteria:** Menu renders correctly; PLAY transitions to game.

---

## STP-003: HUD Elements

**Precondition:** Game is playing (wave 1).

| Step | Action | Expected |
|------|--------|----------|
| 1 | Observe top-left | WAVE 1 / 15 displayed |
| 2 | Observe top-center | SCORE: 0 |
| 3 | Observe top-right | KILLS: 0 |
| 4 | Observe center | Crosshair visible |
| 5 | Observe bottom-left | HEALTH bar at 100%, "100" label |
| 6 | Observe bottom-right | AMMO: 30 / 90 (Assault Rifle default) |

**Pass criteria:** All 6 HUD elements present and correct at wave start.

---

## STP-004: Player Movement

**Precondition:** Game playing, mouse pointer locked.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Hold W | Player moves forward |
| 2 | Hold S | Player moves backward |
| 3 | Hold A / D | Strafe left / right |
| 4 | Hold Shift + W | Movement noticeably faster (sprint) |
| 5 | Hold Ctrl + W | Movement noticeably slower (crouch), camera lowers |
| 6 | Walk to map edge | Player stops at boundary; cannot exit 80×80 arena |

**Pass criteria:** All movement modes work; boundary prevents escape.

---

## STP-005: Shooting & Hitscan

**Precondition:** Game playing, enemies on screen.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Hold LMB aimed at enemy | Enemy flashes red on hit; HP visible in logic |
| 2 | Fire 30 rounds | Ammo counter reaches 0; auto-reload starts |
| 3 | Wait 2 seconds | Reload completes; ammo shows 30 |
| 4 | Press R during partially spent mag | Reload initiates; "RELOADING..." appears in HUD |
| 5 | Kill enemy with enough shots | Enemy falls; kill counter increments; score +100 |

**Pass criteria:** Hitscan hits register; ammo depletes; reload works; kills score correctly.

---

## STP-006: Weapon Switch

**Precondition:** Game playing with AR equipped.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Press F | Switch to Pistol; ammo shows 12; reserve shows ∞ |
| 2 | Fire Pistol | Slower fire rate than AR |
| 3 | Empty pistol mag | Auto-reload starts; refills from infinite reserve |
| 4 | Press F | Switch back to AR; ammo shows 30 |

**Pass criteria:** Weapon switch works; Pistol has infinite ammo; each weapon has correct stats.

---

## STP-007: Enemy AI Behavior

**Precondition:** Wave 1 active (3 Grunts spawned).

| Step | Action | Expected |
|------|--------|----------|
| 1 | Stand still at center | Enemies move toward player when within ~25 units |
| 2 | Let enemy reach melee range (~2 units) | Player HP begins decreasing |
| 3 | Back away to >3 units | Enemy re-enters chase state |
| 4 | Kill all 3 Grunts | "0 ENEMIES LEFT" in HUD; intermission starts |

**Pass criteria:** Enemies transition idle→chase→attack correctly; player takes damage.

---

## STP-008: Wave Progression & Intermission

**Precondition:** Start game fresh.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Clear wave 1 | Intermission screen shows "WAVE 1 COMPLETE", countdown from 10 |
| 2 | Watch countdown | Counter ticks down to 0; wave 2 auto-starts |
| 3 | Check wave display | HUD shows "WAVE 2 / 15" |
| 4 | Advance to wave 6 | Rushers (fast enemies) appear |
| 5 | Advance to wave 11 | Heavies (large, dark-red enemies) appear |

**Pass criteria:** Intermission shows correct wave; countdown auto-starts next wave; new enemy types appear at correct waves.

---

## STP-009: Med Kit Drops & Healing

**Precondition:** Player has taken some damage; enemy just killed.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Kill multiple enemies | Some drop red med kit boxes |
| 2 | Walk over a med kit | Health bar increases by 30; med kit disappears |
| 3 | At full HP, walk over kit | HP does not exceed 100 |

**Pass criteria:** Med kits drop (≥1 in 10 kills), heal 30 HP, capped at 100.

---

## STP-010: Pause & Resume

**Precondition:** Game playing.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Press Esc | Game pauses; "PAUSED" screen shows RESUME and QUIT buttons |
| 2 | Click RESUME | Game resumes from exact same state; HUD reappears |
| 3 | Press Esc again | Pauses again |
| 4 | Press Esc while paused | Resumes (keyboard toggle) |
| 5 | Pause; click QUIT TO MENU | Returns to main menu; HUD gone |

**Pass criteria:** Pause/resume works via button and keyboard; state preserved.

---

## STP-011: Game Over & High Score

**Precondition:** Game playing.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Let enemies deplete HP to 0 | "GAME OVER" screen shows with score, kills, wave |
| 2 | Check score shown | Matches kills × 100 |
| 3 | Click PLAY AGAIN | New game starts at wave 1 |
| 4 | Earn higher score than previous | "★ NEW HIGH SCORE ★" banner on game-over screen |
| 5 | Return to main menu | High score updated in main menu display |
| 6 | Refresh page | High score persists (localStorage) |

**Pass criteria:** Game-over screen correct; high score saves and persists.

---

## STP-012: Victory Screen (Wave 15 Clear)

**Precondition:** Use browser DevTools console to cheat through waves, or play through all 15.

To skip to wave 15 for testing: pause game, use console to kill all spawned enemies quickly.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Clear all 15 waves | "VICTORY" screen shown in gold text |
| 2 | Verify copy | "ALL 15 WAVES CLEARED", final score, total kills |
| 3 | Click PLAY AGAIN | New game starts; wave resets to 1 |
| 4 | Click MAIN MENU | Returns to main menu |

**Pass criteria:** Victory screen appears after wave 15; score and kills correct; both buttons work.

---

## Security Check

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| CSP header present | DevTools → Network → index.html headers | `content-security-policy` meta tag present |
| No inline script execution | CSP blocks inline | `script-src 'self' 'wasm-unsafe-eval'` — no `'unsafe-inline'` |
| No external network requests | DevTools → Network tab | Zero requests to external domains |
| localStorage keys | DevTools → Application → localStorage | Only `dedi_save` and `dedi_controls_seen` written |
| XSS in HUD | All dynamic values (score, kills, wave) use `.textContent` | No `innerHTML` with user data |
