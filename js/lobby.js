// Shared "join the game" screen, end screen and in-game HUD for every game.
import { sources, pressed } from './input.js';
import { sfx, unlockAudio } from './audio.js';
import { MODES, MODE_HELP } from './drive.js';

export const COLORS = {
  red: { main: '#e5484d', dark: '#9b1c20', name: 'Red' },
  blue: { main: '#3e8cf0', dark: '#174a8f', name: 'Blue' },
  green: { main: '#2fbf71', dark: '#167a45', name: 'Green' },
  orange: { main: '#f5a524', dark: '#a86a00', name: 'Orange' },
};
export const FFA = ['red', 'blue', 'green', 'orange'];

export const TIME_SELECT = (def = '60') => ({ id: 'time', label: 'Match', options: [['30', '30 s'], ['60', '60 s'], ['90', '90 s'], ['120', '2 min'], ['0', 'Practice (no timer)']], def });
export const SPEED_SELECT = (def = 'normal') => ({ id: 'speed', label: 'Robot speed', options: [['slow', 'Rookie'], ['normal', 'Normal'], ['fast', 'Turbo']], def });

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * o: { title, tag, rules (html), teams (bool), maxPlayers, selects: [{id,label,options:[[value,text]],def}], onStart() }
 */
export function createLobby(o) {
  const maxPlayers = o.maxPlayers || 4;
  const players = []; // { src, team, color, mode, ready, num, name }
  const wrap = document.createElement('div');
  wrap.innerHTML = `
  <div class="overlay" data-lobby>
    <div class="panel">
      <a class="backlink" href="./">◀ All games</a>
      <h1>${o.title} <span>${o.tag || ''}</span></h1>
      <p class="how">${o.rules}</p>
      <div class="slots"></div>
      <div class="join-hint"><b>V5 controller:</b> turn it off, plug it in with USB, press any button.<br>
        Press <kbd>A</kbd> to join (keyboard: <kbd>Space</kbd> or <kbd>Enter</kbd>). <kbd>X</kbd> changes drive style,
        <kbd>B</kbd> leaves. Press <kbd>A</kbd> again when you're ready.${o.hint ? ' ' + o.hint : ''}</div>
      <div class="row">
        ${(o.selects || []).map(s => `<label>${s.label} <select data-opt="${s.id}">${s.options.map(([v, t]) => `<option value="${v}"${v === s.def ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`).join('')}
        <button class="big go" data-start>Start ▶</button>
      </div>
      <div class="status"></div>
    </div>
  </div>
  <div class="overlay hidden" data-end>
    <div class="panel end">
      <h1 data-endtitle></h1>
      <div data-endbody></div>
      <div class="row center">
        <button class="big go" data-again>Play again (A)</button>
        <button class="big" data-tolobby>Change players (B)</button>
        <a class="big" href="./">All games</a>
      </div>
    </div>
  </div>`;
  document.body.append(...wrap.children);
  const $ = sel => document.querySelector(sel);
  const lobbyEl = $('[data-lobby]'), endEl = $('[data-end]'), slotsEl = lobbyEl.querySelector('.slots');

  function renumber() {
    players.forEach((p, i) => {
      p.num = i + 1; p.name = 'P' + p.num;
      p.color = o.teams ? p.team : FFA[i];
    });
  }
  function join(s) {
    if (players.length >= maxPlayers || players.some(p => p.src === s.key)) return;
    let team = null;
    if (o.teams) { const c = { red: 0, blue: 0 }; players.forEach(p => c[p.team]++); team = c.red <= c.blue ? 'red' : 'blue'; }
    players.push({ src: s.key, team, mode: 0, ready: false });
    renumber(); sfx.join(); render();
  }
  function leave(p) { players.splice(players.indexOf(p), 1); renumber(); render(); }
  function setTeam(p, team) {
    if (!o.teams || p.team === team) return;
    if (players.filter(q => q.team === team).length >= 2) return;
    p.team = team; renumber(); render();
  }

  function render() {
    let html = '';
    for (let i = 0; i < maxPlayers; i++) {
      const p = players[i];
      if (!p) { html += `<div class="slot"><div class="pn" style="color:var(--muted)">P${i + 1}</div><div class="empty">Press <kbd>A</kbd> to join</div></div>`; continue; }
      const s = sources.get(p.src), kb = s.kind === 'kb', c = COLORS[p.color];
      html += `<div class="slot filled" style="--pc:${c.main};--pd:${c.dark}">
        <div class="pn">${p.name}</div>
        <div class="src">${esc(s.label)}${s.alive ? '' : '<div class="dead">disconnected</div>'}</div>
        ${p.ready ? '<div class="ready">READY!</div>' : '<div class="notready">press A when ready</div>'}
        <div class="chips">
          ${o.teams ? `<button class="chip team" data-i="${i}" data-act="team">${c.name} team ⇄</button>` : ''}
          <button class="chip" data-i="${i}" data-act="mode" title="${kb ? 'Keyboard always uses 1-stick' : MODE_HELP[p.mode]}">${kb ? 'Keyboard' : MODES[p.mode]}</button>
          <button class="chip" data-i="${i}" data-act="leave" title="Leave">✕</button>
        </div></div>`;
    }
    slotsEl.innerHTML = html;
  }
  slotsEl.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const p = players[+b.dataset.i]; if (!p) return;
    if (b.dataset.act === 'team') setTeam(p, p.team === 'red' ? 'blue' : 'red');
    if (b.dataset.act === 'mode') { p.mode = (p.mode + 1) % 3; render(); }
    if (b.dataset.act === 'leave') leave(p);
  });
  lobbyEl.querySelector('[data-start]').onclick = () => { unlockAudio(); tryStart(); };
  endEl.querySelector('[data-again]').onclick = () => tryStart();
  endEl.querySelector('[data-tolobby]').onclick = () => api.show();

  function tryStart() {
    if (!players.length && !o.allowEmpty) { status('<span class="warn">Join at least one player first: press A on a controller, or Space on the keyboard.</span>'); return; }
    players.forEach(p => p.ready = false);
    lobbyEl.classList.add('hidden'); endEl.classList.add('hidden');
    o.onStart();
  }
  function status(html) { lobbyEl.querySelector('.status').innerHTML = html; }

  const api = {
    players,
    get visible() { return !lobbyEl.classList.contains('hidden'); },
    options() { const r = {}; lobbyEl.querySelectorAll('[data-opt]').forEach(s => r[s.dataset.opt] = s.value); return r; },
    status,
    show() { players.forEach(p => p.ready = false); render(); endEl.classList.add('hidden'); lobbyEl.classList.remove('hidden'); o.onLobby && o.onLobby(); },
    /** call every frame while the lobby is showing */
    update() {
      let changed = false;
      const now = performance.now();
      for (const s of sources.values()) if (pressed(s, 'A')) s.lastA = now;
      for (const s of sources.values()) {
        const p = players.find(q => q.src === s.key);
        if (!p) {
          // Windows can list one V5 controller twice. If a joined controller of the same kind pressed A
          // at the same moment, this one is just its mirror image, so don't make it a new player.
          const mirror = s.kind === 'gp' && players.some(q => {
            const o = sources.get(q.src);
            return o && o !== s && o.padId === s.padId && Math.abs((o.lastA || -1e9) - now) < 350;
          });
          if (pressed(s, 'A') && !mirror) join(s);
          continue;
        }
        if (pressed(s, 'A')) { p.ready = !p.ready; p.ready && sfx.beep(); changed = true; }
        if (pressed(s, 'X') && s.kind !== 'kb') { p.mode = (p.mode + 1) % 3; changed = true; }
        if (pressed(s, 'Left')) setTeam(p, 'red');
        if (pressed(s, 'Right')) setTeam(p, 'blue');
        if (pressed(s, 'B')) { leave(p); return; }
      }
      if (changed) render();
      if (players.length && players.every(p => p.ready)) tryStart();
    },
    showEnd(title, color, bodyHtml) {
      const t = endEl.querySelector('[data-endtitle]');
      t.textContent = title; t.style.color = color || 'var(--ink)';
      endEl.querySelector('[data-endbody]').innerHTML = bodyHtml;
      endEl.classList.remove('hidden');
    },
    /** call every frame while the end screen is showing */
    endUpdate() {
      for (const s of sources.values()) {
        if (!players.some(p => p.src === s.key)) continue;
        if (pressed(s, 'A')) { tryStart(); return; }
        if (pressed(s, 'B')) { api.show(); return; }
      }
    },
  };
  render();
  return api;
}

/** In-game scoreboard across the top + big center text (countdown, banners). */
export function createHud() {
  const hud = document.createElement('div'); hud.className = 'hud hidden';
  const big = document.createElement('div'); big.className = 'bigtext';
  document.body.append(hud, big);
  let lastHtml = '', lastBig = '';
  return {
    show() { hud.classList.remove('hidden'); },
    hide() { hud.classList.add('hidden'); this.big(''); },
    /** items: [{label, value, color}] ; middle: timer text */
    set(items, middle) {
      const box = it => `<div class="box" style="background:${it.color}"><small>${esc(it.label)}</small>${esc(it.value)}</div>`;
      const half = Math.ceil(items.length / 2);
      const html = items.slice(0, half).map(box).join('') + (middle != null ? `<div class="box timer">${esc(middle)}</div>` : '') + items.slice(half).map(box).join('');
      if (html !== lastHtml) { hud.innerHTML = html; lastHtml = html; }
    },
    big(text, color = '#fff', small = false) {
      const key = text + color + small;
      if (key === lastBig) return; lastBig = key;
      big.textContent = text; big.style.color = color; big.classList.toggle('small', small);
    },
  };
}

export const fmtTime = s => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const fmtTenths = s => { const m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`; };
