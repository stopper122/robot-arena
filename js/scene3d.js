// Shared 3D helpers built on three.js. Game logic stays 2D (x, y in inches);
// the 3D world maps (x, y) -> (x, 0, y), and a robot's heading th becomes rotation.y = -th.
import * as THREE from 'three';
export { THREE };

/** Renderer + scene + lights + a camera that keeps the play area in view at any window size. */
export function createWorld(canvas, { cx = 72, cz = 72, span = 150, pitch = 0.95, bg = 0x12151c, shadowSpan = 110 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  const camera = new THREE.PerspectiveCamera(40, 1, 1, 3000);

  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a3f4a, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(cx - 60, 220, cz + 90); sun.target.position.set(cx, 0, cz);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -shadowSpan, right: shadowSpan, top: shadowSpan, bottom: -shadowSpan, near: 10, far: 600 });
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);

  const view = { cx, cz, span, pitch };
  function fit() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const vf = camera.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    const half = view.span / 2;
    // tilted view: the field's depth looks shorter, so it needs less vertical room
    const d = Math.max(half * (0.35 + 0.75 * Math.sin(view.pitch)) / Math.tan(vf / 2), half * 1.05 / Math.tan(hf / 2)) * 1.08;
    camera.position.set(view.cx, Math.sin(view.pitch) * d, view.cz + Math.cos(view.pitch) * d);
    camera.lookAt(view.cx, 0, view.cz - 4);
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', fit); fit();
  return { renderer, scene, camera, view, fit, render: () => renderer.render(scene, camera) };
}

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, ...opts }));
  return matCache.get(key);
}
function mesh(geo, material, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}
export { mesh };

/** Gray foam-tile floor with perimeter walls, like a VEX field. */
export function makeField(size = 144, { walls = true } = {}) {
  const g = new THREE.Group();
  const c = document.createElement('canvas'); c.width = c.height = 768;
  const x = c.getContext('2d'), t = c.width / 6;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
    x.fillStyle = (i + j) % 2 ? '#80889a' : '#8a92a3'; x.fillRect(i * t, j * t, t, t);
    // foam-tile texture dots
    x.fillStyle = 'rgba(0,0,0,.05)';
    for (let k = 0; k < 40; k++) x.fillRect(i * t + Math.random() * t, j * t + Math.random() * t, 2, 2);
  }
  x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 2;
  for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(i * t, 0); x.lineTo(i * t, c.height); x.moveTo(0, i * t); x.lineTo(c.width, i * t); x.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const floor = mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }), false);
  floor.rotation.x = -Math.PI / 2; floor.position.set(size / 2, 0, size / 2);
  g.add(floor);
  // a dark apron around the field
  const apron = mesh(new THREE.PlaneGeometry(size * 3, size * 3), mat(0x232834, { roughness: 1 }), false);
  apron.rotation.x = -Math.PI / 2; apron.position.set(size / 2, -0.2, size / 2);
  g.add(apron);
  if (walls) {
    const wm = mat(0xd7dce4, { roughness: 0.3, metalness: 0.4 });
    const h = 5, th = 2;
    for (const [w, d, px, pz] of [[size + 2 * th, th, size / 2, -th / 2], [size + 2 * th, th, size / 2, size + th / 2], [th, size, -th / 2, size / 2], [th, size, size + th / 2, size / 2]]) {
      const wall = mesh(new THREE.BoxGeometry(w, h, d), wm); wall.position.set(px, h / 2, pz); g.add(wall);
    }
  }
  return g;
}

/** A text label that always faces the camera. */
export function labelSprite(text, bg = '#000', fg = '#fff', scale = 1) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  x.font = '900 80px Segoe UI, sans-serif';
  const w = Math.min(250, x.measureText(text).width + 50);
  x.fillStyle = bg; x.beginPath(); x.roundRect((256 - w) / 2, 14, w, 100, 28); x.fill();
  x.lineWidth = 6; x.strokeStyle = 'rgba(255,255,255,.85)'; x.stroke();
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 68);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  s.scale.set(16 * scale, 8 * scale, 1); s.renderOrder = 10;
  return s;
}

/** An 18" VEX-style robot facing +x. */
export function makeRobot(color, dark, label) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body); g.userData.body = body;
  const chassis = mesh(new THREE.BoxGeometry(17, 5, 15), mat(color, { roughness: 0.45 }));
  chassis.position.y = 5.5; body.add(chassis);
  const plate = mesh(new THREE.BoxGeometry(11, 1.4, 11), mat(dark));
  plate.position.set(-2, 8.7, 0); body.add(plate);
  // metal C-channel rails
  const rail = mat(0xc4cad4, { metalness: 0.7, roughness: 0.35 });
  for (const z of [-7.9, 7.9]) { const r = mesh(new THREE.BoxGeometry(18, 2.2, 1), rail); r.position.set(0, 4, z); body.add(r); }
  // wheels
  const wheelGeo = new THREE.CylinderGeometry(3.1, 3.1, 2.2, 20);
  const tire = mat(0x1d1f24, { roughness: 0.9 }), hub = mat(0x8c939f, { metalness: 0.6 });
  for (const [x, z] of [[-5.5, -9.6], [5.5, -9.6], [-5.5, 9.6], [5.5, 9.6]]) {
    const w = mesh(wheelGeo, tire); w.rotation.x = Math.PI / 2; w.position.set(x, 3.1, z); body.add(w);
    const h = mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.4, 10), hub); h.rotation.x = Math.PI / 2; h.position.set(x, 3.1, z); body.add(h);
  }
  // front intake rollers
  const roll = mat(0x2b2f38), flex = mat(0x6fd36f, { roughness: 0.8 });
  const bar = mesh(new THREE.BoxGeometry(2.5, 5, 15), roll); bar.position.set(9.6, 5, 0); body.add(bar);
  for (const y of [3, 7]) { const r = mesh(new THREE.CylinderGeometry(1.3, 1.3, 14, 12), flex); r.rotation.x = Math.PI / 2; r.position.set(11.2, y, 0); body.add(r); }
  // direction arrow on top
  const arrow = mesh(new THREE.ConeGeometry(2.6, 5, 3), mat(0xffffff, { emissive: 0x666666 }), false);
  arrow.rotation.z = -Math.PI / 2; arrow.rotation.x = Math.PI / 2; arrow.position.set(3.5, 10, 0); body.add(arrow);
  if (label) { const s = labelSprite(label, color); s.position.set(0, 24, 0); g.add(s); g.userData.label = s; }
  return g;
}

/** Place a robot mesh from 2D game state. */
export function placeRobot(m, r, h = 0) { m.position.set(r.x, h, r.y); m.rotation.y = -r.th; }

/** Little burst of cubes (pickups, scores). Call parts.update(dt) every frame. */
export function makeParticles(scene) {
  const list = [], geo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
  return {
    burst(x, y, z, color, n = 14, speed = 40) {
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(geo, mat(color, { emissive: color, emissiveIntensity: 0.4 }));
        m.position.set(x, y, z);
        const a = Math.random() * Math.PI * 2, up = 0.4 + Math.random() * 0.8;
        list.push({ m, vx: Math.cos(a) * speed * (0.4 + Math.random() * 0.6), vy: speed * up * 1.4, vz: Math.sin(a) * speed * (0.4 + Math.random() * 0.6), t: 0.8 });
        scene.add(m);
      }
    },
    update(dt) {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.t -= dt; p.vy -= 160 * dt;
        p.m.position.x += p.vx * dt; p.m.position.y = Math.max(0.6, p.m.position.y + p.vy * dt); p.m.position.z += p.vz * dt;
        p.m.rotation.x += dt * 8; p.m.rotation.y += dt * 6;
        p.m.scale.setScalar(Math.max(0.01, p.t / 0.8));
        if (p.t <= 0) { scene.remove(p.m); list.splice(i, 1); }
      }
    },
  };
}
