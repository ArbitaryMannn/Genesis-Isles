import { tiles, tilePalette, state, fish, foods, WORLD_SIZE, groundNoise, snowMask } from './state.js';
import { idx, clamp } from './utils.js';

const landSeedX = Math.random() * 1000;
const landSeedY = Math.random() * 1000;
let foodHotspots = null;

export function initWorld() {
  for (let y = 0; y < WORLD_SIZE; y++) {
    for (let x = 0; x < WORLD_SIZE; x++) {
      const elevNoise = 0.5 + 0.3 * Math.sin(x * 0.18) * Math.cos(y * 0.14) + (Math.random() - 0.5) * 0.12;
      const elev = clamp(elevNoise, 0, 1);
      state.elevation[idx(x, y)] = elev;
      groundNoise[idx(x, y)] = Math.random();
      snowMask[idx(x, y)] = Math.random();

      const nx = (x / WORLD_SIZE) - 0.5;
      const ny = (y / WORLD_SIZE) - 0.5;
      const radial = 1 - Math.hypot(nx, ny) * 1.2;
      const ridge = Math.sin((x + landSeedX) * 0.12) * 0.15 + Math.sin((y + landSeedY) * 0.1) * 0.15;
      const height = radial * 0.7 + ridge + elev * 0.2 + (Math.random() - 0.5) * 0.08;

      let type = 'grass';
      if (height < 0.18) type = 'water';
      else if (height < 0.26) type = Math.random() < 0.6 ? 'water' : 'rock';
      else if (height < 0.38) type = 'fertile';
      else if (height < 0.6) type = 'forest';

      tiles[idx(x, y)] = {
        type,
        moisture: type === 'water' ? 1 : 0.45 + Math.random() * 0.25,
        resource: type === 'forest' ? 3 + Math.random() * 2 : type === 'rock' ? 3 + Math.random() * 2 : 0
      };
    }
  }
  for (let y = 0; y < WORLD_SIZE; y++) {
    for (let x = 0; x < WORLD_SIZE; x++) {
      const base = 15 + 10 * Math.sin((y / WORLD_SIZE) * Math.PI);
      const noise = (Math.random() - 0.5) * 4;
      state.tempField[idx(x, y)] = base + noise;
    }
  }
}

export function worldTile(x, y) {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= WORLD_SIZE || ty >= WORLD_SIZE) return null;
  return tiles[idx(tx, ty)];
}

export function nearestOfType(h, type) {
  let best = null;
  let bestDist = Infinity;
  for (let y = 0; y < WORLD_SIZE; y++) {
    for (let x = 0; x < WORLD_SIZE; x++) {
      const t = tiles[idx(x, y)];
      if (t.type !== type) continue;
      const d = Math.hypot(x + 0.5 - h.x, y + 0.5 - h.y);
      if (d < bestDist) { best = { x: x + 0.5, y: y + 0.5 }; bestDist = d; }
    }
  }
  return best;
}

export function getTileTemp(x, y) {
  const base = state.tempField[idx(x, y)] || 18;
  const seasonAngle = ((state.month - 1) / 12) * Math.PI * 2;
  const seasonOffset = Math.cos(seasonAngle) * 8; // winter negative, summer positive
  const elevPenalty = (state.elevation[idx(x, y)] || 0) * 10;
  return base + seasonOffset - elevPenalty;
}

export function spawnFood(tileX, tileY, amount = 18) {
  foods.push({ x: tileX + 0.5, y: tileY + 0.5, amount });
}

function ensureFoodHotspots() {
  if (foodHotspots) return foodHotspots;
  foodHotspots = [];
  // pick a few fertile/moist tiles as fixed spawn hubs
  const candidates = [];
  for (let y = 0; y < WORLD_SIZE; y++) {
    for (let x = 0; x < WORLD_SIZE; x++) {
      const t = tiles[idx(x, y)];
      if (!t || t.type !== 'fertile') continue;
      if (t.moisture < 0.5) continue;
      candidates.push({ x, y, score: t.moisture + (groundNoise[idx(x, y)] || 0) * 0.3 });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const pickCount = Math.max(3, Math.min(7, Math.floor(WORLD_SIZE / 14)));
  for (let i = 0; i < candidates.length && foodHotspots.length < pickCount; i++) {
    const c = candidates[i];
    const farEnough = foodHotspots.every(h => Math.hypot(h.x - c.x, h.y - c.y) > 6);
    if (farEnough) foodHotspots.push({ x: c.x, y: c.y });
  }
  return foodHotspots;
}

export function spawnWorldFood() {
  const hubs = ensureFoodHotspots();
  // lower global chance and only around chosen hubs
  for (let i = 0; i < 2; i++) {
    if (Math.random() > 0.35) continue;
    const hub = hubs[Math.floor(Math.random() * hubs.length)];
    const jitterX = clamp(hub.x + (Math.random() - 0.5) * 1.4, 1, WORLD_SIZE - 2);
    const jitterY = clamp(hub.y + (Math.random() - 0.5) * 1.4, 1, WORLD_SIZE - 2);
    const tx = Math.floor(jitterX);
    const ty = Math.floor(jitterY);
    const t = tiles[idx(tx, ty)];
    if (!t || ['water', 'rock', 'forest'].includes(t.type)) continue;
    const nearFood = foods.some(f => Math.hypot(f.x - (tx + 0.5), f.y - (ty + 0.5)) < 1.6);
    if (nearFood) continue;
    if (t.moisture > 0.45) spawnFood(tx, ty, 12 + Math.random() * 10);
  }
  if (Math.random() < 0.12) {
    const x = Math.floor(Math.random() * WORLD_SIZE);
    const y = Math.floor(Math.random() * WORLD_SIZE);
    const t = tiles[idx(x, y)];
    if (t && t.type === 'water') {
      fish.push({ x: x + 0.5, y: y + 0.5, size: 10 + Math.random() * 8 });
    }
  }
}
