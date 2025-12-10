import { canvas, ui, state, tiles, foods, humans, buildings, campfires, animals, fish, effects, graves, clouds, bolts, WORLD_SIZE, DAY_LENGTH, MONTH_LENGTH, TILE, carts } from './src/state.js';
import { initWorld, worldTile, spawnWorldFood } from './src/world.js';
import { makeHuman, updateHuman, pickBalancedGender } from './src/humans.js';
import { spawnAnimals, updateAnimal } from './src/animals.js';
import { applyRain, applyQuake, applyFire, applyBless, applyCampfire, applySnow, applyTyphoon, applyPlague, applyProphet } from './src/effects.js';
import { draw } from './src/render.js';
import { logEvent, updateStats, downloadBook } from './src/ui.js';
import { clamp } from './src/utils.js';

function ensureCamera() {
  if (!state.camera) {
    state.camera = { x: 0, y: 0, vx: 0, vy: 0 };
  }
}

ensureCamera();

function spawnInitial() {
  ensureCamera();
  const center = Math.floor(WORLD_SIZE / 2);
  humans.push(makeHuman(center + 0.2, center + 0.2, 'M'));
  humans.push(makeHuman(center - 0.2, center - 0.2, 'F'));
  spawnAnimals(8);
  logEvent('Adem ve Havva dünyaya indi.');
}

function screenToWorld(sx, sy) {
  ensureCamera();
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const csx = sx * scaleX;
  const csy = sy * scaleY;
  const wx = (csx - canvas.width / 2) / state.zoom + canvas.width / 2 + state.camera.x * TILE;
  const wy = (csy - canvas.height / 2) / state.zoom + canvas.height / 2 + state.camera.y * TILE;
  return { tx: Math.floor(wx / TILE), ty: Math.floor(wy / TILE), wx, wy };
}

function handleTool(x, y) {
  const { tx, ty } = screenToWorld(x, y);
  switch (state.tool) {
    case 'rain': return applyRain(tx, ty);
    case 'snow': return applySnow(tx, ty);
    case 'quake': return applyQuake(tx, ty);
    case 'fire': return applyFire(tx, ty);
    case 'bless': return applyBless(tx, ty);
    case 'campfire': return applyCampfire(tx, ty);
    case 'plague': return applyPlague(tx, ty);
    case 'prophet': return applyProphet(tx, ty);
    default: break;
  }
}

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  handleTool(x, y);
});

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const { tx, ty } = screenToWorld(sx, sy);
  if (tx >= 0 && ty >= 0 && tx < WORLD_SIZE && ty < WORLD_SIZE) {
    state.hoverTile = { x: tx, y: ty };
  } else {
    state.hoverTile = null;
  }
  const edge = 36;
  const normX = sx < edge ? -(1 - sx / edge) : sx > canvas.width - edge ? 1 - (canvas.width - sx) / edge : 0;
  const normY = sy < edge ? -(1 - sy / edge) : sy > canvas.height - edge ? 1 - (canvas.height - sy) / edge : 0;
  const panSpeed = 5; // tiles per second at full edge hover
  state.camera.vx = normX * panSpeed;
  state.camera.vy = normY * panSpeed;
});

canvas.addEventListener('mouseleave', () => {
  state.hoverTile = null;
  state.camera.vx = 0;
  state.camera.vy = 0;
});

ui.buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    state.tool = btn.dataset.tool;
    ui.buttons.forEach(b => b.classList.toggle('active', b === btn));
  });
});

ui.speedInput.addEventListener('input', () => {
  state.speed = parseFloat(ui.speedInput.value);
});

document.querySelectorAll('[data-speed]').forEach(btn => {
  btn.addEventListener('click', () => {
    const val = parseFloat(btn.dataset.speed);
    state.speed = val;
    ui.speedInput.value = val;
  });
});

ui.toggleBtn.addEventListener('click', () => {
  state.paused = !state.paused;
  ui.toggleBtn.textContent = state.paused ? 'Devam' : 'Duraklat';
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  state.zoom = clamp(state.zoom + delta, 0.6, 1.6);
});

ui.downloadBtn?.addEventListener('click', downloadBook);

const music = {
  ctx: null,
  master: null,
  audio: null,
  enabled: false
};

function ensureMusic() {
  if (music.ctx) return;
  const ctx = new AudioContext();
  const audio = new Audio();
  audio.src = './music.mp3';
  audio.loop = true;
  audio.crossOrigin = 'anonymous';
  audio.preload = 'auto';
  const source = ctx.createMediaElementSource(audio);
  const master = ctx.createGain();
  master.gain.value = 0;
  source.connect(master).connect(ctx.destination);
  music.ctx = ctx;
  music.audio = audio;
  music.master = master;
}

function setMusicEnabled(on) {
  ensureMusic();
  const ctx = music.ctx;
  if (ctx.state === 'suspended') ctx.resume();
  if (on) music.audio.play().catch(() => {});
  const target = on ? 0.18 : 0;
  music.master.gain.setTargetAtTime(target, ctx.currentTime, 0.8);
  music.enabled = on;
  if (ui.musicBtn) ui.musicBtn.textContent = on ? 'Music On' : 'Music Off';
}

ui.musicBtn?.addEventListener('click', () => {
  setMusicEnabled(!music.enabled);
});

window.addEventListener('pointerdown', () => {
  if (!music.enabled) setMusicEnabled(true);
}, { once: true });

function spawnCart(x, y) {
  carts.push({ x, y, vx: 0, vy: 0, riderId: null });
}

function updateCarts(dt) {
  for (const cart of carts) {
    const target = humans[0];
    if (target) {
      const dx = target.x - cart.x;
      const dy = target.y - cart.y;
      const dist = Math.hypot(dx, dy) || 1;
      const desired = { vx: (dx / dist) * 1.2, vy: (dy / dist) * 1.2 };
      cart.vx = clamp(cart.vx + (desired.vx - cart.vx) * 0.6 * dt, -1.6, 1.6);
      cart.vy = clamp(cart.vy + (desired.vy - cart.vy) * 0.6 * dt, -1.6, 1.6);
    }
    cart.x = clamp(cart.x + cart.vx * dt, 0.5, WORLD_SIZE - 0.5);
    cart.y = clamp(cart.y + cart.vy * dt, 0.5, WORLD_SIZE - 0.5);
  }
}

function step(dt) {
  ensureCamera();
  state.dayClock += dt;
  if (state.dayClock >= DAY_LENGTH) {
    while (state.dayClock >= DAY_LENGTH) state.dayClock -= DAY_LENGTH;
    state.day += 1;
    if (state.day > MONTH_LENGTH) {
      state.day = 1;
      state.month += 1;
      if (state.month > 12) {
        state.month = 1;
        state.year += 1;
      }
    }
  }
  const dayProgress = state.dayClock / DAY_LENGTH;
  state.time = dayProgress * Math.PI * 2;
  state.light = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(state.time - Math.PI / 2));
  state.night = state.light < 0.45;

  if (!state.tech.fire && state.year >= 2) {
    state.tech.fire = true;
    logEvent('Ateş keşfedildi.');
  }
  if (!state.tech.medicine && state.year >= 3) {
    state.tech.medicine = true;
    logEvent('Şifacılar ortaya çıktı.');
  }
  if (!state.tech.professions && state.year >= 2) {
    state.tech.professions = true;
  }
  if (!state.tech.wheel && buildings.length >= 6 && state.year >= 3) {
    state.tech.wheel = true;
    const hx = humans[0]?.x || Math.floor(WORLD_SIZE / 2);
    const hy = humans[0]?.y || Math.floor(WORLD_SIZE / 2);
    spawnCart(clamp(hx + 1, 1, WORLD_SIZE - 1), clamp(hy + 1, 1, WORLD_SIZE - 1));
    logEvent('Tekerlek icat edildi, arabalar kullanılmaya başlandı.');
  }

  for (const t of tiles) {
    if (t.type !== 'water') {
      t.moisture = clamp(t.moisture - dt * 0.02, 0, 1);
    }
  }

  spawnWorldFood();

  for (let i = humans.length - 1; i >= 0; i--) {
    if (!updateHuman(humans[i], dt)) humans.splice(i, 1);
  }

  for (const a of animals) updateAnimal(a, dt);
  updateCarts(dt);

  for (let i = campfires.length - 1; i >= 0; i--) {
    campfires[i].fuel -= dt * 5;
    if (campfires[i].fuel <= 0) campfires.splice(i, 1);
  }

  for (let i = effects.length - 1; i >= 0; i--) {
    effects[i].life -= dt;
    if (effects[i].life <= 0) effects.splice(i, 1);
  }

  for (let i = bolts.length - 1; i >= 0; i--) {
    bolts[i].life -= dt;
    bolts[i].alpha = Math.max(0, bolts[i].alpha - dt * 2.5);
    if (bolts[i].life <= 0) bolts.splice(i, 1);
  }

  for (let i = graves.length - 1; i >= 0; i--) {
    graves[i].life -= dt;
    if (graves[i].life <= 0) graves.splice(i, 1);
  }

  if (state.prophetCall) {
    const anchor = state.prophetCall.anchor;
    const anchorAlive = anchor && humans.includes(anchor);
    if (anchorAlive) {
      state.prophetCall.x = anchor.x;
      state.prophetCall.y = anchor.y;
    }
    state.prophetCall.ttl = Math.max(0, state.prophetCall.ttl - dt);
    if (state.prophetCall.ttl <= 0 || !anchorAlive) {
      state.prophetCall = null;
    }
  }

  const hasCityHall = buildings.some(b => b.level === 'cityhall');
  state.gold += dt * (humans.length * 0.1 + buildings.length * 0.15 + (hasCityHall ? 1.2 : 0.2));

  // tribe/diplomacy progression
  const score = Math.min(1, humans.length * 0.03 + buildings.length * 0.08);
  if (!state.tribeFormed && score > 0.5) {
    state.tribeFormed = true;
    logEvent('Kabile kuruldu, dışarıya kapalı yaşam başladı.');
  }
  if (!state.diplomacy && state.year >= 4 && hasCityHall) {
    state.diplomacy = true;
    logEvent('Diplomasi başladı, vize gereksinimleri getirildi.');
  }

  // visitors try entry
  if (Math.random() < 0.002 && humans.length > 0) {
    if (!state.diplomacy || !state.tribeFormed) {
      logEvent('Dışarıdan gelen reddedildi (kapalı sınır).');
    } else if (state.gold >= state.visaCost) {
      state.gold -= state.visaCost;
      const hx = Math.max(1, Math.min(WORLD_SIZE - 2, humans[0].x + (Math.random() - 0.5) * 2));
      const hy = Math.max(1, Math.min(WORLD_SIZE - 2, humans[0].y + (Math.random() - 0.5) * 2));
      humans.push(makeHuman(hx, hy, pickBalancedGender()));
      logEvent('Vize onaylandı, yeni bir ziyaretçi kabileye katıldı.');
    } else {
      logEvent('Vize ücreti karşılanamadı, giriş reddedildi.');
    }
  }

  // socio-tech stages
  if (!state.stages.village && score > 0.25) {
    state.stages.village = true;
    state.tech.professions = true;
    logEvent('Köyler kuruluyor, uzmanlaşma başlıyor.');
  }
  if (!state.stages.farm && score > 0.55) {
    state.stages.farm = true;
    state.tech.professions = true;
    logEvent('Çiftlik çağı: gıda üretimi artıyor.');
  }
  if (!state.stages.industry && score > 0.82) {
    state.stages.industry = true;
    state.tech.medicine = true;
    logEvent('Endüstri ve sağlık teknolojisi başladı.');
  }
  if (state.faith > 60 && !state.tech.religion) {
    state.tech.religion = true;
    logEvent('İnanç yayıldı, peygamberler etrafında topluluklar oluşuyor.');
  }

  if (Math.random() < 0.0009) {
    const rx = 4 + Math.random() * (WORLD_SIZE - 8);
    const ry = 4 + Math.random() * (WORLD_SIZE - 8);
    applyRain(rx, ry);
  }
  if (Math.random() < 0.0005) {
    const rx = 4 + Math.random() * (WORLD_SIZE - 8);
    const ry = 4 + Math.random() * (WORLD_SIZE - 8);
    applySnow(rx, ry);
  }
  if (Math.random() < 0.0008 && humans.length > 0) {
    const victim = humans[Math.floor(Math.random() * humans.length)];
    victim.sick = true;
    logEvent('Mikroplar yayılıyor, bir kişi hastalandı.');
  }
  // spontaneous disasters
  if (Math.random() < 0.0005) {
    const rx = Math.random() * WORLD_SIZE;
    const ry = Math.random() * WORLD_SIZE;
    applyTyphoon(rx, ry);
  }

  if (humans.length === 0) {
    const center = Math.floor(WORLD_SIZE / 2);
    humans.push(makeHuman(center + 0.2, center + 0.2, Math.random() > 0.5 ? 'M' : 'F'));
    humans.push(makeHuman(center - 0.2, center - 0.2, Math.random() > 0.5 ? 'M' : 'F'));
    logEvent('Nesil tükendi, yeni bir ruh indi.');
  }

  // camera smoothing
  state.camera.x += state.camera.vx * dt;
  state.camera.y += state.camera.vy * dt;
  const viewW = (canvas.width / TILE) / state.zoom;
  const viewH = (canvas.height / TILE) / state.zoom;
  state.camera.x = clamp(state.camera.x, 0, Math.max(0, WORLD_SIZE - viewW));
  state.camera.y = clamp(state.camera.y, 0, Math.max(0, WORLD_SIZE - viewH));

  updateStats();
}

let last = performance.now();
let fpsTimer = 0;
let fpsCount = 0;
function loop(t) {
  const dt = clamp((t - last) / 1000 * state.speed, 0, 0.12);
  last = t;
  fpsCount += 1;
  fpsTimer += dt;
  if (fpsTimer >= 0.5) {
    state.fps = fpsCount / fpsTimer;
    fpsTimer = 0;
    fpsCount = 0;
  }
  if (!state.paused) step(dt);
  draw();
  requestAnimationFrame(loop);
}

function start() {
  initWorld();
  for (let i = 0; i < 4; i++) {
    clouds.push({ x: Math.random() * canvas.width, y: 40 + Math.random() * 120, speed: 10 + Math.random() * 15, alpha: 0.15 + Math.random() * 0.1 });
  }
  spawnInitial();
  loop(performance.now());
}

start();
