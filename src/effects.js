import { humans, buildings, effects, campfires, state, bolts, graves, deaths, WORLD_SIZE } from './state.js';
import { worldTile, spawnFood } from './world.js';
import { clamp } from './utils.js';
import { logEvent } from './ui.js';
import { addShake } from './render.js';
import { makeHuman } from './humans.js';

export function applyRain(tx, ty) {
  const r = 2.5;
  effects.push({ type: 'rain', x: tx, y: ty, radius: r, life: 2.4 });
  for (let y = Math.floor(ty - r); y <= Math.ceil(ty + r); y++) {
    for (let x = Math.floor(tx - r); x <= Math.ceil(tx + r); x++) {
      const t = worldTile(x + 0.5, y + 0.5);
      if (!t) continue;
      t.moisture = clamp(t.moisture + 0.35, 0, 1);
      if (t.type === 'forest' && Math.random() < 0.3) t.resource = Math.min(6, t.resource + 1);
      if (t.type === 'grass' && t.moisture > 0.75 && Math.random() < 0.3) t.type = 'fertile';
      if (['grass', 'fertile'].includes(t.type) && Math.random() < 0.5) spawnFood(x, y, 15);
    }
  }
  logEvent('Yağmur yağdırdınız.');
}

export function applySnow(tx, ty) {
  const r = 2.5;
  effects.push({ type: 'snow', x: tx, y: ty, radius: r, life: 2.8 });
  for (let y = Math.floor(ty - r); y <= Math.ceil(ty + r); y++) {
    for (let x = Math.floor(tx - r); x <= Math.ceil(tx + r); x++) {
      const t = worldTile(x + 0.5, y + 0.5);
      if (!t) continue;
      t.moisture = clamp(t.moisture + 0.25, 0, 1);
      if (t.type === 'grass' && Math.random() < 0.2) t.type = 'fertile';
    }
  }
  logEvent('Kar yağdırdınız.');
}

export function applyQuake(tx, ty) {
  const r = 2.8;
  effects.push({ type: 'quake', x: tx, y: ty, radius: r, life: 1.9 });
  const severity = 0.5 + Math.random() * 0.8;
  addShake(8 * severity);
  for (let i = humans.length - 1; i >= 0; i--) {
    const h = humans[i];
    if (Math.hypot(h.x - tx, h.y - ty) < r && Math.random() < 0.45 + severity * 0.25) {
      humans.splice(i, 1);
    }
  }
  for (let i = buildings.length - 1; i >= 0; i--) {
    const b = buildings[i];
    if (Math.hypot(b.x - tx, b.y - ty) < r) {
      b.health -= 0.4 + severity * 0.4;
      if (b.level === 'hut') b.health -= 0.2;
      if (b.health <= 0) buildings.splice(i, 1);
    }
  }
  for (let y = Math.floor(ty - r); y <= Math.ceil(ty + r); y++) {
    for (let x = Math.floor(tx - r); x <= Math.ceil(tx + r); x++) {
      const t = worldTile(x + 0.5, y + 0.5);
      if (!t || Math.random() > 0.55 + severity * 0.2) continue;
      if (t.type === 'forest') t.type = 'grass';
      if (t.type === 'fertile' && Math.random() < 0.6) t.type = 'rock';
      if (t.type === 'grass' && Math.random() < 0.2) t.type = 'water';
    }
  }
  logEvent('Deprem verdiniz.');
}

export function applyFire(tx, ty) {
  const r = 2;
  effects.push({ type: 'fire', x: tx, y: ty, radius: r, life: 1.2 });
  bolts.push({ x: tx, y: ty, life: 0.4, alpha: 1 });
  for (let i = humans.length - 1; i >= 0; i--) {
    const h = humans[i];
    if (Math.hypot(h.x - tx, h.y - ty) < r && Math.random() < 0.45) humans.splice(i, 1);
  }
  for (let y = Math.floor(ty - r); y <= Math.ceil(ty + r); y++) {
    for (let x = Math.floor(tx - r); x <= Math.ceil(tx + r); x++) {
      const t = worldTile(x + 0.5, y + 0.5);
      if (!t) continue;
      if (t.type === 'forest' || t.type === 'fertile') t.type = 'grass';
    }
  }
  logEvent('Yıldırım düşürdünüz.');
}

export function applyBless(tx, ty) {
  const r = 2.3;
  effects.push({ type: 'bless', x: tx, y: ty, radius: r, life: 1.6 });
  for (const h of humans) {
    if (Math.hypot(h.x - tx, h.y - ty) < r) {
      h.hunger = Math.max(0, h.hunger - 25);
      h.wood += 1;
      h.stone += 0.5;
    }
  }
  for (let y = Math.floor(ty - r); y <= Math.ceil(ty + r); y++) {
    for (let x = Math.floor(tx - r); x <= Math.ceil(tx + r); x++) {
      const t = worldTile(x + 0.5, y + 0.5);
      if (!t) continue;
      t.moisture = clamp(t.moisture + 0.2, 0, 1);
      if (t.type === 'grass' && Math.random() < 0.4) t.type = 'fertile';
      if (Math.random() < 0.35) spawnFood(x, y, 22);
    }
  }
  logEvent('Bereket verdiniz.');
}

export function applyTyphoon(tx, ty) {
  const r = 3;
  effects.push({ type: 'typhoon', x: tx, y: ty, radius: r, life: 2 });
  addShake(6);
  for (let i = humans.length - 1; i >= 0; i--) {
    const h = humans[i];
    if (Math.hypot(h.x - tx, h.y - ty) < r && Math.random() < 0.25) humans.splice(i, 1);
  }
  for (let i = buildings.length - 1; i >= 0; i--) {
    const b = buildings[i];
    if (Math.hypot(b.x - tx, b.y - ty) < r) {
      if (Math.random() < 0.35) buildings.splice(i, 1);
    }
  }
  for (let y = Math.floor(ty - r); y <= Math.ceil(ty + r); y++) {
    for (let x = Math.floor(tx - r); x <= Math.ceil(tx + r); x++) {
      const t = worldTile(x + 0.5, y + 0.5);
      if (!t) continue;
      t.moisture = clamp(t.moisture + 0.5, 0, 1);
      if (t.type === 'forest' && Math.random() < 0.2) t.type = 'grass';
    }
  }
  logEvent('Tayfun esti, yapılar zarar gördü.');
}

// ensure named exports are available for module systems
export const extraDisasters = { applyTyphoon };

export function applyCampfire(tx, ty) {
  if (!state.tech.fire) {
    logEvent('Ateş henüz keşfedilmedi.');
    return;
  }
  const t = worldTile(tx, ty);
  if (!t || ['water', 'rock'].includes(t.type)) {
    logEvent('Burada ateş yakılamaz.');
    return;
  }
  campfires.push({ x: tx, y: ty, fuel: 120 });
  effects.push({ type: 'fire', x: tx, y: ty, radius: 1.6, life: 1.2 });
  logEvent('Bir kamp ateşi yaktınız.');
}

export function applyPlague(tx, ty) {
  const r = 2.5;
  effects.push({ type: 'plague', x: tx, y: ty, radius: r, life: 2.2 });
  let killed = 0;
  let sickened = 0;
  for (let i = humans.length - 1; i >= 0; i--) {
    const h = humans[i];
    const dist = Math.hypot(h.x - tx, h.y - ty);
    if (dist < r) {
      if (Math.random() < 0.25) {
        humans.splice(i, 1);
        graves.push({ x: h.x, y: h.y, life: 160 });
        deaths.unshift({ text: `Salgın (Yaş ${Math.floor(h.age)})` });
        if (deaths.length > 12) deaths.length = 12;
        killed++;
      } else {
        h.sick = true;
        sickened++;
      }
    }
  }
  logEvent(`Ölümcül virüs yayıldı: ${killed} kişi öldü, ${sickened} kişi hastalandı.`);
}

export function applyProphet(tx, ty) {
  const r = 2.8;
  effects.push({ type: 'prophet', x: tx, y: ty, radius: r, life: 2.4 });
  state.faith = clamp(state.faith + 8, 0, 100);
  let herald = humans.find(h => h.role === 'summonedProphet');
  if (!herald) {
    herald = makeHuman(tx, ty, Math.random() > 0.5 ? 'M' : 'F');
    herald.profession = 'prophet';
    herald.role = 'summonedProphet';
    herald.homeX = clamp(tx, 1, WORLD_SIZE - 1);
    herald.homeY = clamp(ty, 1, WORLD_SIZE - 1);
    herald.hunger = 0;
    herald.thirst = 0;
    humans.push(herald);
  } else {
    herald.x = tx;
    herald.y = ty;
    herald.homeX = clamp(tx, 1, WORLD_SIZE - 1);
    herald.homeY = clamp(ty, 1, WORLD_SIZE - 1);
    herald.hunger = 0;
    herald.thirst = 0;
  }
  state.prophetCall = { x: herald.x, y: herald.y, ttl: 55, anchor: herald };
  for (const h of humans) {
    if (h === herald) continue;
    h.target = { x: herald.x, y: herald.y, gather: true };
    h.buildTask = null;
    h.resting = false;
  }
  for (const h of humans) {
    const dist = Math.hypot(h.x - tx, h.y - ty);
    if (dist < r) {
      h.sick = false;
      h.hunger = Math.max(0, h.hunger - 12);
      h.thirst = Math.max(0, h.thirst - 8);
    }
  }
  if (!state.tech.religion && state.faith > 40) {
    state.tech.religion = true;
    logEvent('Beyaz elbiseli peygamber indi, herkes etrafına toplanıyor.');
  } else {
    logEvent('Peygamberin mesajı yayıldı, halk moral buldu.');
  }
}
