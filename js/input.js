// Shared input: keyboard players, gamepads and VEX V5 controllers.
// Every device is a "source" with sticks in -1..1 (up = +) and a set of pressed button names.
export const sources = new Map();

export function getSource(key, label, kind) {
  let s = sources.get(key);
  if (!s) { s = { key, label, kind, lx: 0, ly: 0, rx: 0, ry: 0, btn: new Set(), prev: new Set(), alive: true }; sources.set(key, s); }
  return s;
}
export const pressed = (s, b) => s.btn.has(b) && !s.prev.has(b);
export const dead = v => Math.abs(v) < 0.08 ? 0 : v;

// ---------- keyboard ----------
const keys = new Set(), taps = new Set(); // taps: pressed since the last frame, so quick taps still count
const NO_SCROLL = ['Space', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
addEventListener('keydown', e => {
  if (NO_SCROLL.includes(e.code) && !(e.target instanceof HTMLSelectElement)) e.preventDefault();
  keys.add(e.code); taps.add(e.code);
  if (e.code === 'KeyF' && !e.repeat) toggleFull();
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

function pollKeyboard() {
  const down = c => keys.has(c) || taps.has(c);
  const k = c => down(c) ? 1 : 0;
  const a = getSource('kb1', 'Keyboard: W A S D + Space', 'kb');
  a.ly = k('KeyW') - k('KeyS'); a.lx = k('KeyD') - k('KeyA'); a.btn = new Set();
  if (down('Space')) { a.btn.add('A'); a.btn.add('R1'); }
  if (down('KeyQ')) a.btn.add('B');
  const b = getSource('kb2', 'Keyboard: arrows + Enter', 'kb');
  b.ly = k('ArrowUp') - k('ArrowDown'); b.lx = k('ArrowRight') - k('ArrowLeft'); b.btn = new Set();
  if (down('Enter') || down('NumpadEnter')) { b.btn.add('A'); b.btn.add('R1'); }
  if (down('Backspace')) b.btn.add('B');
  taps.clear();
}

// ---------- gamepads ----------
// A VEX V5 controller plugged in with USB shows up as a game controller (vendor 2888, product 0503),
// but its numbering depends on whether the controller is powered on.
// ON (recorded 2026-11-19 in Chrome on Windows, 4 axes): sticks = axes 0/1 (left) and 2/3 (right), with
// left/right reversed (+1 = left) and up = -1. In the teacher's Chrome: B=9, X=11 (live test);
// A=10 and Y=8 are the best guesses. L-up=13 L-down=12, R-up=4 R-down=5, arrows Up=2 Down=0 Left=3 Right=1
// came from press-count tests. Windows also lists the controller twice (mirrored).
// If a computer numbers things differently, controller-setup.html saves that computer's own layout.
// ax = which axis is [left X, left Y, right X, right Y]; sg = multiply so right and up are +.
const V5_ON = { name: 'V5 controller', ax: [0, 1, 2, 3], sg: [-1, -1, -1, -1],
  btn: { 10: 'A', 9: 'B', 11: 'X', 8: 'Y', 13: 'L1', 12: 'L2', 4: 'R1', 5: 'R2', 2: 'Up', 0: 'Down', 3: 'Left', 1: 'Right' } };
// OFF (from the robot-field-sim controller test, 10 axes): sticks = axes 0/1 and 2/5,
// B=0 A=1 Y=2 X=3 L1=4 R1=5 L2=6 R2=7, arrows 12-15 plus a "hat" on axis 9.
const V5_OFF = { name: 'V5 controller', ax: [0, 1, 2, 5], sg: [1, -1, 1, -1], btn: { 0: 'B', 1: 'A', 2: 'Y', 3: 'X', 4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2', 12: 'Up', 13: 'Down', 14: 'Left', 15: 'Right' },
  hat: { axis: 9, Up: [-1, 1], Right: [-0.43, -0.14], Down: [0.14, -0.14], Left: [0.71, 1] } };
// Everything else uses the browser's standard layout (Xbox, PlayStation, Switch Pro, Logitech...).
const STD_PAD = { name: null, ax: [0, 1, 2, 3], sg: [1, -1, 1, -1], btn: { 0: 'A', 1: 'B', 2: 'X', 3: 'Y', 4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2', 12: 'Up', 13: 'Down', 14: 'Left', 15: 'Right' } };
export const isV5Pad = gp => /2888/.test(gp.id) && /0?503|V5/i.test(gp.id);

// Layouts saved on this computer by controller-setup.html, keyed by controller id + axis count.
export const SAVED_KEY = 'robot-arena-pad-layouts';
export const padKey = gp => `${gp.id}|${gp.axes.length}`;
let saved = {};
try { saved = JSON.parse(localStorage.getItem(SAVED_KEY) || '{}'); } catch { /* storage blocked */ }
function profileFor(gp) {
  const mine = saved[padKey(gp)];
  if (mine) return { name: isV5Pad(gp) ? 'V5 controller' : null, ...mine };
  return !isV5Pad(gp) ? STD_PAD : gp.axes.length <= 4 ? V5_ON : V5_OFF;
}

function pollGamepads() {
  const seen = new Set();
  for (const gp of (navigator.getGamepads ? navigator.getGamepads() : [])) {
    if (!gp || !gp.connected) continue;
    const pf = profileFor(gp);
    const name = pf.name || gp.id.replace(/\(.*?\)/g, '').trim().slice(0, 28) || 'Gamepad';
    const s = getSource('gp' + gp.index, `Controller ${gp.index + 1}: ${name}`, 'gp');
    seen.add(s.key); s.alive = true; s.padId = gp.id;
    const a = i => pf.ax[i] == null ? 0 : dead((gp.axes[pf.ax[i]] || 0) * pf.sg[i]);
    s.lx = a(0); s.ly = a(1); s.rx = a(2); s.ry = a(3);
    s.btn = new Set();
    gp.buttons.forEach((b, i) => { if ((b.pressed || b.value > 0.5) && pf.btn[i]) s.btn.add(pf.btn[i]); });
    if (pf.hat && gp.axes.length > pf.hat.axis) {
      const h = gp.axes[pf.hat.axis];
      for (const k of ['Up', 'Right', 'Down', 'Left']) if (pf.hat[k].some(v => Math.abs(h - v) < 0.1)) s.btn.add(k);
    }
    // a button that is already down when the controller first appears is not a new press
    if (!s.started) { s.started = true; s.prev = new Set(s.btn); }
  }
  for (const s of sources.values()) if (s.kind === 'gp' && !seen.has(s.key)) { s.alive = false; s.btn = new Set(); s.lx = s.ly = s.rx = s.ry = 0; }
}

/** Call once at the start of every frame. */
export function pollInputs() {
  pollKeyboard(); pollGamepads();
  // stick flicks act like arrow buttons in menus
  for (const s of sources.values()) {
    if (s.lx < -0.6) s.btn.add('StickLeft'); if (s.lx > 0.6) s.btn.add('StickRight');
    if (s.ly > 0.6) s.btn.add('StickUp'); if (s.ly < -0.6) s.btn.add('StickDown');
  }
}
/** Call once at the end of every frame. */
export function endInputFrame() { for (const s of sources.values()) s.prev = new Set(s.btn); }

/** Menu navigation from any device this frame. */
export function menuNav() {
  const r = { left: false, right: false, up: false, down: false, ok: false, back: false };
  for (const s of sources.values()) {
    if (pressed(s, 'Left') || pressed(s, 'StickLeft')) r.left = true;
    if (pressed(s, 'Right') || pressed(s, 'StickRight')) r.right = true;
    if (pressed(s, 'Up') || pressed(s, 'StickUp')) r.up = true;
    if (pressed(s, 'Down') || pressed(s, 'StickDown')) r.down = true;
    if (pressed(s, 'A')) r.ok = true;
    if (pressed(s, 'B')) r.back = true;
  }
  return r;
}

export function toggleFull() {
  document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {});
}
