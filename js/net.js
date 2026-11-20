// Online play between computers.
// One computer HOSTS: it runs the game and shows a room code. Other computers JOIN with the code:
// they send their controllers' sticks/buttons to the host (which treats them like local controllers)
// and draw what the host sends back ~30 times a second.
// Connections are browser-to-browser (WebRTC) using PeerJS's free public matchmaking server.
import { sources, getSource } from './input.js';
import { sfx } from './audio.js';

const PEERJS_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const PREFIX = 'robot-arena-v1-';
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O or 1/I/L mix-ups
const PAGES = ['index.html', 'gem-hunt.html', 'sumo.html', 'core-rush.html', 'skills.html'];
const PAGE = PAGES.includes(location.pathname.split('/').pop()) ? location.pathname.split('/').pop() : 'index.html';
const SEND_MS = 1000 / 30;

let hostCode = null, joinCode = null;
try {
  hostCode = sessionStorage.getItem('ra-host');
  joinCode = new URLSearchParams(location.search).get('join') || sessionStorage.getItem('ra-join');
} catch { /* storage blocked */ }
const cleanCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
if (hostCode) joinCode = null;

export const net = {
  role: hostCode ? 'host' : joinCode ? 'client' : null,
  code: cleanCode(hostCode || joinCode) || null,
  status: '',
  connected: 0,          // host: computers connected; client: 1 when connected
  ui: { lobby: null, hud: null },
  parts: null,           // particle system for remote bursts
  latest: null,          // client: newest game snapshot (game reads and clears it)
  get isHost() { return this.role === 'host'; },
  get isClient() { return this.role === 'client'; },
  page: PAGE,
};
if (net.isClient) try { sessionStorage.setItem('ra-join', net.code); } catch {}

const listeners = new Set();
export function onNetChange(fn) { listeners.add(fn); fn(net); }
function changed(status) { if (status != null) net.status = status; listeners.forEach(f => f(net)); }

let peerLib = null;
function loadPeer() {
  if (!peerLib) peerLib = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = PEERJS_URL;
    s.onload = () => res(window.Peer);
    s.onerror = () => { peerLib = null; rej(new Error('could not load the online library (is the internet blocked?)')); };
    document.head.append(s);
  });
  return peerLib;
}

let peer = null;

// ---------------- host ----------------
const conns = new Set();
// each joined computer keeps the same number while the host stays in the room (even across page changes)
let nums = {};
try { nums = JSON.parse(sessionStorage.getItem('ra-nums') || '{}'); } catch {}
function numberFor(id) {
  id = String(id || '').slice(0, 40);
  if (!id) return 100 + conns.size;
  if (!nums[id]) {
    const used = new Set(Object.values(nums));
    let n = 1; while (used.has(n)) n++;
    nums[id] = n;
    try { sessionStorage.setItem('ra-nums', JSON.stringify(nums)); } catch {}
  }
  return nums[id];
}
export function hostGame() {
  const code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  nums = {};
  try { sessionStorage.setItem('ra-host', code); sessionStorage.removeItem('ra-join'); sessionStorage.removeItem('ra-nums'); } catch {}
  net.role = 'host'; net.code = code;
  startHost(code);
}
async function startHost(code, tries = 0) {
  changed('Opening room…');
  let Peer;
  try { Peer = await loadPeer(); } catch (e) { changed('Online play unavailable: ' + e.message); return; }
  if (peer) peer.destroy();
  const p = peer = new Peer(PREFIX + code);
  p.on('open', () => changed('online'));
  p.on('error', e => {
    if (p !== peer) return;
    if (e.type === 'unavailable-id') {
      // the previous page's room may still be closing; try again for a little while
      if (tries < 12) { changed('Re-opening room…'); setTimeout(() => net.isHost && startHost(code, tries + 1), 1500); }
      else changed('That room code is still in use. Click Stop, then host again.');
    } else if (e.type !== 'peer-unavailable') changed('Online problem: ' + e.type);
  });
  p.on('disconnected', () => { if (p === peer && !p.destroyed) setTimeout(() => !p.destroyed && p.reconnect(), 1000); });
  p.on('connection', conn => {
    conn.on('open', () => {
      if (conns.size >= 6) { conn.close(); return; }
      conn.n = numberFor(conn.metadata && conn.metadata.me); conns.add(conn); net.connected = conns.size;
      conn.send({ t: 'page', page: PAGE });
      fullUI = true; changed();
    });
    conn.on('data', d => hostData(conn, d));
    const drop = () => {
      if (!conns.delete(conn)) return;
      net.connected = conns.size;
      for (const s of sources.values()) if (s.conn === conn) { s.alive = false; s.btn = new Set(); s.lx = s.ly = s.rx = s.ry = 0; }
      changed();
    };
    conn.on('close', drop); conn.on('error', drop);
  });
}
const num = v => Math.max(-1, Math.min(1, +v || 0));
function hostData(conn, d) {
  if (!d || d.t !== 'in' || !Array.isArray(d.s)) return;
  for (const it of d.s.slice(0, 6)) {
    if (!it || typeof it.k !== 'string') continue;
    const key = `net${conn.n}:${it.k.slice(0, 20)}`;
    const fresh = !sources.has(key);
    const s = getSource(key, `Computer ${conn.n + 1} · ${String(it.l || 'controller').slice(0, 40)}`, it.kind === 'kb' ? 'kb' : 'gp');
    s.remote = true; s.conn = conn; s.alive = true;
    s.padId = `net${conn.n}:${String(it.p || it.k).slice(0, 80)}`;
    s.lx = num(it.lx); s.ly = num(it.ly); s.rx = num(it.rx); s.ry = num(it.ry);
    s.btn = new Set((Array.isArray(it.b) ? it.b : []).filter(b => typeof b === 'string').slice(0, 16));
    if (fresh) s.prev = new Set(s.btn);
  }
}

let lastSnap = 0, lastFull = 0, fullUI = true, lastUI = {};
const events = [];
/** Host: call once per frame with a function that returns the game's state. */
export function hostTick(getState) {
  if (!net.isHost || !conns.size) { events.length = 0; return; }
  const now = performance.now();
  if (now - lastSnap < SEND_MS) return;
  lastSnap = now;
  if (now - lastFull > 2000) { fullUI = true; lastFull = now; }
  const ui = { ...(net.ui.lobby ? net.ui.lobby.mirror() : {}), ...(net.ui.hud ? net.ui.hud.mirror() : {}) };
  const diff = {};
  for (const k in ui) if (fullUI || ui[k] !== lastUI[k]) diff[k] = ui[k];
  lastUI = ui; fullUI = false;
  const msg = { t: 's', page: PAGE, g: getState ? getState() : null };
  if (Object.keys(diff).length) msg.ui = diff;
  if (events.length) msg.ev = events.splice(0);
  for (const c of conns) if (c.open) try { c.send(msg); } catch { /* closing */ }
}
function queue(e) { if (net.isHost && conns.size && events.length < 60) events.push(e); }

/** Play a sound here and on joined computers. */
export function sound(name) { if (sfx[name]) sfx[name](); queue(['s', name]); }
/** Particle burst here and on joined computers. */
export function burst(...a) { if (net.parts) net.parts.burst(...a); queue(['b', a]); }

// ---------------- client ----------------
let conn = null, retryTimer = null, openTimer = null;
export function joinGame(code) {
  code = cleanCode(code);
  if (code.length < 4) { changed('Type the 4-letter room code.'); return; }
  try { sessionStorage.setItem('ra-join', code); sessionStorage.removeItem('ra-host'); } catch {}
  net.role = 'client'; net.code = code;
  startClient();
}
async function startClient() {
  changed('Connecting…');
  let Peer;
  try { Peer = await loadPeer(); } catch (e) { changed('Online play unavailable: ' + e.message); return; }
  if (peer) peer.destroy();
  const p = peer = new Peer();
  p.on('open', connect);
  p.on('error', e => {
    if (p !== peer) return;
    if (e.type === 'peer-unavailable') changed(`Looking for room ${net.code}… (is the host's game open?)`);
    else changed('Network problem (' + e.type + ') — retrying…');
    retry();
  });
  p.on('disconnected', () => { if (p === peer && !p.destroyed) setTimeout(() => !p.destroyed && p.reconnect(), 1000); });
}
function myId() {
  let id = null;
  try { id = sessionStorage.getItem('ra-me'); } catch {}
  if (!id) { id = Math.random().toString(36).slice(2, 12); try { sessionStorage.setItem('ra-me', id); } catch {} }
  return id;
}
function retry() { clearTimeout(retryTimer); retryTimer = setTimeout(connect, 2000); }
function connect() {
  clearTimeout(retryTimer);
  if (!net.isClient || !peer || peer.destroyed) return;
  if (peer.disconnected) { retry(); return; }
  if (conn && conn.open) return;
  const c = conn = peer.connect(PREFIX + net.code, { reliable: true, metadata: { me: myId() } });
  clearTimeout(openTimer);
  openTimer = setTimeout(() => { if (conn === c && !c.open) { try { c.close(); } catch {} conn = null; retry(); } }, 6000);
  c.on('open', () => { clearTimeout(openTimer); net.connected = 1; changed('connected'); });
  c.on('data', clientData);
  const lost = () => { if (conn !== c) return; conn = null; net.connected = 0; changed('The host left — waiting for them to come back…'); retry(); };
  c.on('close', lost); c.on('error', lost);
}
function goTo(page) {
  if (!PAGES.includes(page) || page === PAGE) return false;
  location.href = page + '?join=' + encodeURIComponent(net.code);
  return true;
}
function clientData(d) {
  if (!d || typeof d !== 'object') return;
  if (d.t === 'page') { goTo(d.page); return; }
  if (d.t !== 's') return;
  if (d.page && goTo(d.page)) return;
  if (d.ui && typeof d.ui === 'object') {
    net.ui.lobby && net.ui.lobby.applyMirror(d.ui);
    net.ui.hud && net.ui.hud.applyMirror(d.ui);
  }
  if (Array.isArray(d.ev)) for (const e of d.ev.slice(0, 60)) {
    if (e[0] === 's' && typeof e[1] === 'string' && Object.hasOwn(sfx, e[1])) sfx[e[1]]();
    if (e[0] === 'b' && Array.isArray(e[1]) && net.parts) net.parts.burst(...e[1].slice(0, 6).map(Number));
  }
  if (d.g && typeof d.g === 'object') net.latest = d.g;
}

// buttons pressed at any time between two sends, so quick taps are never lost
let latch = new Map(), lastSend = 0;
/** Client: call once per frame after pollInputs(). */
export function clientTick() {
  if (!net.isClient) return;
  for (const s of sources.values()) {
    if (s.remote) continue;
    const l = latch.get(s.key) || new Set();
    s.btn.forEach(b => l.add(b)); latch.set(s.key, l);
  }
  const now = performance.now();
  if (!conn || !conn.open || now - lastSend < SEND_MS) return;
  lastSend = now;
  const r2 = v => Math.round(v * 100) / 100;
  const list = [];
  for (const s of sources.values()) {
    if (s.remote || !s.alive) continue;
    list.push({ k: s.key, kind: s.kind, l: s.label, p: s.padId, lx: r2(s.lx), ly: r2(s.ly), rx: r2(s.rx), ry: r2(s.ry),
      b: [...(latch.get(s.key) || [])].filter(b => !b.startsWith('Stick')) });
  }
  latch = new Map();
  try { conn.send({ t: 'in', s: list }); } catch { /* closing */ }
}

/** Stop hosting or leave the room. */
export function stopOnline() {
  try { sessionStorage.removeItem('ra-host'); sessionStorage.removeItem('ra-join'); } catch {}
  clearTimeout(retryTimer);
  if (peer) peer.destroy();
  peer = null; conn = null; conns.clear();
  net.role = null; net.code = null; net.connected = 0;
  if (/[?&]join=/.test(location.search)) { location.href = PAGE; return; }
  changed('');
}

/** Only allow plain formatting tags/attributes in HTML that came from another computer. */
const OK_TAGS = new Set(['DIV', 'SPAN', 'B', 'I', 'SMALL', 'P', 'KBD', 'TABLE', 'TBODY', 'THEAD', 'TR', 'TD', 'TH', 'BUTTON', 'BR', 'STRONG', 'EM']);
export function safeHTML(html) {
  const t = document.createElement('template');
  t.innerHTML = String(html || '');
  const walk = node => {
    for (const el of [...node.children]) {
      if (!OK_TAGS.has(el.tagName)) { el.remove(); continue; }
      for (const a of [...el.attributes]) {
        const ok = a.name === 'class' || (a.name === 'style' && !/url\s*\(|expression|@import/i.test(a.value)) || a.name === 'title';
        if (!ok) el.removeAttribute(a.name);
      }
      walk(el);
    }
  };
  walk(t.content);
  return t.innerHTML;
}

/** Smoothly move displayed robots toward the host's latest positions. */
export function smoothTo(r, dt) {
  if (r.tx == null) return;
  const k = Math.min(1, dt * 18);
  r.x += (r.tx - r.x) * k; r.y += (r.ty - r.y) * k;
  let d = r.tth - r.th; d = Math.atan2(Math.sin(d), Math.cos(d));
  r.th += d * k;
}

// resume hosting / joining after moving to another page
if (net.isHost) startHost(net.code);
else if (net.isClient) startClient();
