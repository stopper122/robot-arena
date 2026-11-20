// Shared robot driving + simple collision helpers. Units are inches (a VEX field is 144").
import { sources } from './input.js';

export const SPEEDS = { slow: { v: 38, w: 2.4 }, normal: { v: 58, w: 3.3 }, fast: { v: 80, w: 4.2 } };
export const MODES = ['1-Stick', '2-Stick', 'Tank'];
export const MODE_HELP = ['Left stick drives', 'Left stick = go, right stick = turn', 'Left stick = left side, right stick = right side'];

/** Target [forward speed, turn rate] from a player's controller and drive style. */
export function driveInput(p, speed) {
  const s = sources.get(p.src);
  if (!s || !s.alive) return [0, 0];
  let fwd, turn;
  const mode = s.kind === 'kb' ? 0 : p.mode;
  if (mode === 0) { fwd = s.ly; turn = s.lx; }
  else if (mode === 1) { fwd = s.ly; turn = s.rx; }
  else { fwd = (s.ly + s.ry) / 2; turn = (s.ly - s.ry) / 2; }
  // gentler response near the middle of the stick makes aiming easier for small hands
  const curve = v => Math.sign(v) * Math.abs(Math.max(-1, Math.min(1, v))) ** 1.4;
  return [curve(fwd) * speed.v, curve(turn) * speed.w];
}

/** Smoothly accelerate toward the target and move (no sideways sliding). */
export function stepRobot(r, tv, tw, speed, dt) {
  const acc = speed.v * 5 * dt, wacc = speed.w * 7 * dt;
  r.v += Math.max(-acc, Math.min(acc, tv - r.v));
  r.w += Math.max(-wacc, Math.min(wacc, tw - r.w));
  r.th += r.w * dt;
  r.x += Math.cos(r.th) * r.v * dt; r.y += Math.sin(r.th) * r.v * dt;
}

/** Push two circles apart. share = how much of the push moves `a` (0..1). */
export function separate(a, b, ra, rb, share = 0.5) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, o = ra + rb - d;
  if (o <= 0) return null;
  const nx = dx / d, ny = dy / d;
  a.x -= nx * o * share; a.y -= ny * o * share; b.x += nx * o * (1 - share); b.y += ny * o * (1 - share);
  return { nx, ny, o };
}

export function clampField(r, R, size = 144) {
  r.x = Math.max(R, Math.min(size - R, r.x));
  r.y = Math.max(R, Math.min(size - R, r.y));
}

/** Push a circle out of a wall segment (with thickness t). Returns true if it touched. */
export function pushFromSegment(r, R, x1, y1, x2, y2, t = 2) {
  const vx = x2 - x1, vy = y2 - y1, L2 = vx * vx + vy * vy;
  const u = Math.max(0, Math.min(1, ((r.x - x1) * vx + (r.y - y1) * vy) / L2));
  const cx = x1 + vx * u, cy = y1 + vy * u, dx = r.x - cx, dy = r.y - cy, d = Math.hypot(dx, dy) || 0.01;
  const o = R + t / 2 - d;
  if (o <= 0) return false;
  r.x += dx / d * o; r.y += dy / d * o;
  return true;
}
