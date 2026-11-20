// Little synthesized sound effects (no audio files needed).
let actx = null;
export function unlockAudio() {
  if (!actx) { try { actx = new AudioContext(); } catch { /* no audio */ } }
  else if (actx.state === 'suspended') actx.resume();
}
addEventListener('keydown', unlockAudio);
addEventListener('pointerdown', unlockAudio);

function tone(freq, dur, type = 'sine', vol = 0.15, slide = 0, delay = 0) {
  if (!actx || actx.state !== 'running') return;
  const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
}

export const sfx = {
  beep: () => tone(660, 0.18, 'square', 0.08),
  go: () => { tone(880, 0.5, 'square', 0.1); tone(440, 0.5, 'sawtooth', 0.06); },
  shoot: () => tone(220, 0.12, 'triangle', 0.2, 0.5),
  grab: () => tone(520, 0.07, 'sine', 0.12, 1.5),
  gem: () => { tone(988, 0.08, 'sine', 0.12); tone(1319, 0.14, 'sine', 0.12, 0, 0.07); },
  gold: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.12, 'square', 0.07, 0, i * 0.07)); },
  score3: () => { tone(784, 0.12, 'square', 0.08); tone(1047, 0.12, 'square', 0.08, 0, 0.1); tone(1319, 0.22, 'square', 0.08, 0, 0.2); },
  score1: () => tone(880, 0.15, 'square', 0.07),
  gate: () => { tone(660, 0.08, 'square', 0.07); tone(990, 0.12, 'square', 0.07, 0, 0.07); },
  bump: () => tone(110, 0.1, 'triangle', 0.25, 0.6),
  fall: () => tone(600, 0.7, 'sawtooth', 0.08, 0.15),
  penalty: () => tone(180, 0.25, 'sawtooth', 0.09),
  end: () => { tone(330, 0.9, 'sawtooth', 0.1); tone(247, 0.9, 'square', 0.06); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'square', 0.08, 0, i * 0.12)); },
  join: () => { tone(523, 0.08, 'square', 0.07); tone(784, 0.12, 'square', 0.07, 0, 0.08); },
  move: () => tone(440, 0.05, 'square', 0.05),
};
