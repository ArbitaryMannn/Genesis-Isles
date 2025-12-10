import { humans, buildings, campfires, animals, fish, foods, state, buildingTypes, WORLD_SIZE, graves, deaths, crops } from './state.js';
import { worldTile, nearestOfType } from './world.js';
import { clamp } from './utils.js';
import { logEvent } from './ui.js';
import { getTileTemp } from './climate.js';

function hasWaterNeighbor(x, y, radius = 0.6) {
  const offsets = [
    [0, 0],
    [radius, 0],
    [-radius, 0],
    [0, radius],
    [0, -radius],
    [radius, radius],
    [radius, -radius],
    [-radius, radius],
    [-radius, -radius]
  ];
  return offsets.some(([dx, dy]) => {
    const t = worldTile(x + dx, y + dy);
    return t && t.type === 'water';
  });
}

function isShoreTile(tx, ty) {
  const tile = worldTile(tx + 0.5, ty + 0.5);
  if (!tile || tile.type === 'water') return false;
  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1]
  ];
  return dirs.some(([dx, dy]) => {
    const n = worldTile(tx + dx + 0.5, ty + dy + 0.5);
    return n && n.type === 'water';
  });
}

function nearestShore(h) {
  let best = null;
  let bestDist = Infinity;
  for (let y = 0; y < WORLD_SIZE; y++) {
    for (let x = 0; x < WORLD_SIZE; x++) {
      if (!isShoreTile(x, y)) continue;
      const cx = x + 0.5;
      const cy = y + 0.5;
      const d = Math.hypot(cx - h.x, cy - h.y);
      if (d < bestDist) {
        best = { x: cx, y: cy };
        bestDist = d;
      }
    }
  }
  return best;
}

export function makeHuman(x, y, gender) {
  const h = {
    x,
    y,
    gender,
    hunger: 20 + Math.random() * 20,
    thirst: 10 + Math.random() * 10,
    age: 18 + Math.random() * 6,
    wood: 0,
    stone: 0,
    target: null,
    reproduceCooldown: 12,
    buildCooldown: 0,
    meat: 0,
    animTime: 0,
    moving: false,
    facing: 0,
    actionType: null,
    actionTime: 0,
    sick: false,
    profession: null,
    resting: false,
    inside: false,
    role: null,
    jailedUntil: 0,
    homeX: clamp(Math.random() * WORLD_SIZE, 2, WORLD_SIZE - 2),
    homeY: clamp(Math.random() * WORLD_SIZE, 2, WORLD_SIZE - 2),
    buildTask: null,
    sitting: false
  };
  assignProfession(h);
  return h;
}

export function pickBalancedGender() {
  let males = 0;
  let females = 0;
  for (const h of humans) {
    if (h.gender === 'M') males++;
    else females++;
  }
  if (males > females + 1) return 'F';
  if (females > males + 1) return 'M';
  return Math.random() > 0.5 ? 'M' : 'F';
}

function assignProfession(h) {
  if (!state.tech.professions) return;
  const roll = Math.random();
  if (state.tech.medicine && roll < 0.12) h.profession = 'healer';
  else if (roll < 0.3) h.profession = 'builder';
  else if (roll < 0.5) h.profession = 'hunter';
  else if (roll < 0.7) h.profession = 'farmer';
  else if (roll < 0.8) h.profession = 'sheriff';
  else if (roll < 0.9) h.profession = 'diplomat';
  else h.profession = 'prophet';
}

function canBuildHere(x, y) {
  const t = worldTile(x, y);
  if (!t) return false;
  if (['water', 'rock'].includes(t.type)) return false;
  for (const b of buildings) {
    if (Math.hypot(b.x - x, b.y - y) < 1.5) return false;
  }
  return true;
}

function findBuildSpot(h) {
  for (let i = 0; i < 6; i++) {
    const rx = clamp(h.homeX + (Math.random() - 0.5) * 8, 1, WORLD_SIZE - 1);
    const ry = clamp(h.homeY + (Math.random() - 0.5) * 8, 1, WORLD_SIZE - 1);
    if (canBuildHere(rx, ry)) return { x: rx, y: ry };
  }
  return null;
}

function cropAt(x, y) {
  return crops.find(c => Math.abs(c.x - x) < 0.51 && Math.abs(c.y - y) < 0.51);
}

function placeBuilding(h, levelKey) {
  let tx = Math.round(h.x);
  let ty = Math.round(h.y);
  if (!canBuildHere(tx + 0.5, ty + 0.5)) {
    const spot = findBuildSpot(h);
    if (!spot) return false;
    tx = Math.floor(spot.x);
    ty = Math.floor(spot.y);
  }
  const type = buildingTypes.find(b => b.key === levelKey) || buildingTypes[0];
  const { wood, stone } = type.cost;
  if (h.wood < wood || h.stone < stone) return false;
  const site = { x: tx + 0.5, y: ty + 0.5, level: levelKey, targetLevel: levelKey, health: 1, progress: 0, underConstruction: true };
  buildings.push(site);
  h.wood -= wood;
  h.stone -= stone;
  h.buildCooldown = 18;
  h.buildTask = { type: 'new', building: site };
  h.target = { x: site.x, y: site.y };
  logEvent(`${type.label} temeli atıldı, inşaat başladı.`);
  return true;
}

function startUpgrade(h, target, levelKey) {
  if (!target || target.underConstruction) return false;
  const type = buildingTypes.find(b => b.key === levelKey) || buildingTypes[0];
  const { wood, stone } = type.cost;
  if (h.wood < wood || h.stone < stone) return false;
  h.wood -= wood;
  h.stone -= stone;
  target.upgradingTo = levelKey;
  target.targetLevel = levelKey;
  target.progress = 0;
  target.underConstruction = true;
  h.buildCooldown = ['tower', 'mall'].includes(levelKey) ? 18 : 8;
  h.buildTask = { type: 'upgrade', building: target };
  h.target = { x: target.x, y: target.y };
  logEvent(`${type.label} için yükseltme başlatıldı.`);
  return true;
}

function nearestFood(h) {
  let best = null;
  let bestDist = Infinity;
  for (const f of foods) {
    const d = Math.hypot(f.x - h.x, f.y - h.y);
    if (d < bestDist) { best = { x: f.x, y: f.y }; bestDist = d; }
  }
  for (const f of fish) {
    const d = Math.hypot(f.x - h.x, f.y - h.y);
    if (d < bestDist && d < 7) { best = { x: f.x, y: f.y, fish: true }; bestDist = d; }
  }
  for (const a of animals) {
    if (!a.alive) continue;
    const d = Math.hypot(a.x - h.x, a.y - h.y);
    if (d < bestDist && d < 6) {
      best = { x: a.x, y: a.y, hunt: true };
      bestDist = d;
    }
  }
  return best;
}

export function updateHuman(h, dt) {
  h.reproduceCooldown = Math.max(0, h.reproduceCooldown - dt);
  h.buildCooldown = Math.max(0, h.buildCooldown - dt);
  h.age += dt * 0.05;
  const prevX = h.x;
  const prevY = h.y;
  const finishedBuildings = buildings.filter(b => !b.underConstruction);
  const call = state.prophetCall && state.prophetCall.ttl > 0 ? state.prophetCall : null;
  const isSummonedProphet = h.role === 'summonedProphet';
  if (h.jailedUntil > 0) {
    h.jailedUntil = Math.max(0, h.jailedUntil - dt);
    h.hunger += dt * 0.2;
    h.thirst += dt * 0.2;
    h.resting = true;
    h.inside = true;
    h.moving = false;
    return true;
  }

  const nearHut = finishedBuildings.some(b => Math.hypot(b.x - h.x, b.y - h.y) < 2.4);
  const nearFire = campfires.some(f => Math.hypot(f.x - h.x, f.y - h.y) < 2.1);
  const tileTemp = getTileTemp(Math.floor(h.x), Math.floor(h.y));
  const thirstRate = 0.6 + Math.max(0, tileTemp - 15) * 0.015;
  h.hunger += dt * (nearHut ? 0.45 : 0.9);
  h.thirst += dt * thirstRate;
  if (h.sick) {
    h.hunger += dt * 0.8;
    h.thirst += dt * 0.8;
  }
  if (nearFire) h.hunger = Math.max(0, h.hunger - dt * 2.4);
  if (isSummonedProphet) {
    h.hunger = Math.max(0, h.hunger - dt * 2.4);
    h.thirst = Math.max(0, h.thirst - dt * 2.4);
  }
  if (h.hunger >= 100 || h.thirst >= 100 || h.age > 95) {
    const cause = h.hunger >= 100 ? 'Açlık' : h.thirst >= 100 ? 'Susuzluk' : 'Yaşlılık';
    graves.push({ x: h.x, y: h.y, life: 160 });
    deaths.unshift({ text: `${cause} (Yaş ${Math.floor(h.age)})` });
    if (deaths.length > 12) deaths.length = 12;
    return false;
  }
  // simple separation to avoid overlaps
  const other = humans.find(o => o !== h && Math.hypot(o.x - h.x, o.y - h.y) < 0.4);
  if (other) {
    const dx = h.x - other.x;
    const dy = h.y - other.y;
    const dist = Math.max(0.01, Math.hypot(dx, dy));
    h.x += (dx / dist) * dt * 0.6;
    h.y += (dy / dist) * dt * 0.6;
  }

  const hasBuildTask = h.buildTask && buildings.includes(h.buildTask.building) && !call;
  if (h.buildTask && !hasBuildTask) {
    h.buildTask = null;
  }
  if (call && h.buildTask) h.buildTask = null;
  if (hasBuildTask && h.buildTask) {
    h.target = { x: h.buildTask.building.x, y: h.buildTask.building.y };
  }

  if (call) {
    const distToCall = Math.hypot(h.x - call.x, h.y - call.y);
    if (distToCall > 0.9) {
      h.target = { x: call.x, y: call.y, gather: true };
      h.resting = false;
      h.actionType = null;
    } else {
      h.target = null;
      h.resting = true;
      if (h.actionTime <= 0) {
        h.actionType = 'pray';
        h.actionTime = 1;
      }
    }
  } else if (isSummonedProphet) {
    h.target = null;
    h.resting = true;
    h.actionType = 'pray';
  } else if ((!h.target || Math.random() < 0.002) && !hasBuildTask) {
    if (!h.target && Math.random() < 0.003) {
      h.homeX = clamp(Math.random() * WORLD_SIZE, 2, WORLD_SIZE - 2);
      h.homeY = clamp(Math.random() * WORLD_SIZE, 2, WORLD_SIZE - 2);
    }
    // night: try to go home/rest
    if (state.night) {
      const nearHome = finishedBuildings.find(b => Math.hypot(b.x - h.x, b.y - h.y) < 2);
      if (!nearHome) {
        const anyHome = finishedBuildings[0];
        if (anyHome) h.target = { x: anyHome.x, y: anyHome.y };
      } else {
        h.resting = true;
        h.inside = true;
      }
    }
    // day idle/rest
    if (!state.night && h.hunger < 30 && h.thirst < 30 && Math.random() < 0.1) {
      h.resting = true;
      h.actionType = null;
      h.actionTime = 0.6;
    }
    if (h.profession === 'healer') {
      const sickOne = humans.find(p => p.sick);
      if (sickOne) h.target = { x: sickOne.x, y: sickOne.y };
    }
    if (h.profession === 'hunter' && h.hunger > 40) {
      const prey = animals.find(a => a.alive);
      if (prey) h.target = { x: prey.x, y: prey.y, hunt: true };
    }
    if (h.profession === 'farmer' && h.hunger > 30) {
      const fertile = nearestOfType(h, 'fertile');
      if (fertile) h.target = fertile;
    }
    if (!h.target && h.thirst > 60) {
      const shore = nearestShore(h);
      if (shore) h.target = shore;
    }
    if (h.hunger > 60) h.target = nearestFood(h) || h.target;
    if (!h.target && h.profession === 'hunter') h.target = nearestFood(h) || h.target;
    if (!h.target && h.wood < 10) h.target = nearestOfType(h, 'forest');
    if (!h.target && h.stone < 8) h.target = nearestOfType(h, 'rock');
    // seek partner occasionally
    if (!h.target && h.reproduceCooldown <= 0 && Math.random() < 0.2) {
      const partner = humans.find(
        other => other !== h &&
        other.gender !== h.gender &&
        other.hunger < 85 &&
        other.thirst < 85
      );
      if (partner) h.target = { x: partner.x, y: partner.y };
    }
    if (!h.target) {
      const rx = clamp(h.homeX + (Math.random() - 0.5) * 20, 1, WORLD_SIZE - 1);
      const ry = clamp(h.homeY + (Math.random() - 0.5) * 20, 1, WORLD_SIZE - 1);
      h.target = { x: rx, y: ry };
    }
  }

  if (h.target) {
    const dx = h.target.x - h.x;
    const dy = h.target.y - h.y;
    const dist = Math.hypot(dx, dy);
    const nearConstruction = hasBuildTask && dist < 0.35;
    if (nearConstruction) {
      // stay near the build site and keep working
      h.resting = false;
    } else if (dist < 0.12) {
      if (h.target.hunt) {
        const prey = animals.find(a => a.alive && Math.hypot(a.x - h.x, a.y - h.y) < 0.6);
        if (prey) {
          prey.alive = false;
          h.meat = (h.meat || 0) + 25;
          h.actionType = 'hunt';
          h.actionTime = 0.5;
          logEvent('Av yakalandı, et depolandı.');
        }
      } else if (h.target.fish) {
        const catchFish = fish.findIndex(f => Math.hypot(f.x - h.x, f.y - h.y) < 0.8);
        if (catchFish !== -1) {
          fish.splice(catchFish, 1);
          h.meat = (h.meat || 0) + 15;
          h.thirst = Math.max(0, h.thirst - 10);
          logEvent('Balık tutuldu.');
        }
      }
      h.target = null;
    } else {
      const dirX = dx / dist;
      const dirY = dy / dist;
      const speed = hasBuildTask ? 1.8 : 2;
      const stepX = dirX * speed * dt;
      const stepY = dirY * speed * dt;
      const nextTile = worldTile(h.x + stepX, h.y + stepY);
      if (!nextTile || nextTile.type === 'water') {
        h.target = null;
        h.actionType = null;
        h.resting = false;
      } else {
        h.x += stepX;
        h.y += stepY;
        h.facing = Math.atan2(dirY, dirX);
        h.resting = false;
      }
    }
  }

  if (hasBuildTask && h.buildTask && buildings.includes(h.buildTask.building)) {
    const site = h.buildTask.building;
    const distToSite = Math.hypot(site.x - h.x, site.y - h.y);
    if (distToSite < 0.65) {
      const rate = dt * (h.profession === 'builder' ? 0.55 : 0.35);
      site.progress = clamp((site.progress || 0) + rate, 0, 1);
      site.underConstruction = true;
      h.actionType = 'build';
      h.actionTime = 0.5;
      h.facing = Math.atan2(site.y - h.y, site.x - h.x);
      if (site.progress >= 1) {
        site.progress = 1;
        site.underConstruction = false;
        if (site.upgradingTo) {
          site.level = site.upgradingTo;
          site.upgradingTo = null;
        }
        const label = buildingTypes.find(b => b.key === (site.targetLevel || site.level))?.label || 'Yapı';
        logEvent(`${label} tamamlandı.`);
        h.buildTask = null;
      }
    }
  }

  const moved = Math.hypot(h.x - prevX, h.y - prevY);
  h.moving = moved > 0.002 && !h.inside && !h.resting;
  if (h.moving) {
    h.animTime += moved * 12;
    h.sitting = false;
  } else {
    h.animTime = Math.max(0, h.animTime - dt * 2);
    if (h.resting) h.sitting = true;
  }

  const tile = worldTile(h.x, h.y);
  const nearSummon = call && Math.hypot(h.x - call.x, h.y - call.y) < 0.95;
  if (tile && !nearSummon) {
    if (tile.type === 'forest' && tile.resource > 0) {
      const gain = dt * 1.5;
      h.wood += gain;
      tile.resource = Math.max(0, tile.resource - gain * 0.7);
      if (tile.resource <= 0.05) tile.type = 'grass';
      h.actionType = 'chop';
      h.actionTime = 0.4;
    } else if (tile.type === 'rock' && tile.resource > 0) {
      const gain = dt * 1.2;
      h.stone += gain;
      tile.resource = Math.max(0, tile.resource - gain * 0.5);
      if (tile.resource <= 0.05) tile.type = 'grass';
      h.actionType = 'chop';
      h.actionTime = 0.4;
    } else if (tile.type === 'fertile') {
      const cx = Math.floor(h.x) + 0.5;
      const cy = Math.floor(h.y) + 0.5;
      let crop = cropAt(cx, cy);
      if (!crop) {
        crop = { x: cx, y: cy, growth: 0.15, stage: 'seed' };
        crops.push(crop);
      }
      const farmerBoost = h.profession === 'farmer' ? 1.8 : 1;
      crop.growth = clamp(crop.growth + dt * 0.08 * farmerBoost, 0, 1.4);
      crop.stage = crop.growth > 0.95 ? 'ripe' : crop.growth > 0.35 ? 'sprout' : 'seed';
      if (crop.stage === 'ripe' && h.profession === 'farmer' && h.hunger > 20) {
        foods.push({ x: cx, y: cy, amount: 24, type: 'wheat' });
        crop.growth = 0.25;
        crop.stage = 'seed';
        h.actionType = 'farm';
        h.actionTime = 0.5;
        logEvent('Buğday hasat edildi.');
      } else {
        h.actionType = 'farm';
        h.actionTime = 0.4;
      }
    }
    if (tile.type === 'water') {
      const shore = nearestShore(h);
      if (shore) {
        h.x = shore.x;
        h.y = shore.y;
      }
    }
  } else if (tile && nearSummon && tile.type === 'water') {
    const shore = nearestShore(h);
    if (shore) {
      h.x = shore.x;
      h.y = shore.y;
    }
  }

  if (hasWaterNeighbor(h.x, h.y, 0.8)) {
    h.thirst = Math.max(0, h.thirst - dt * 18);
  }

  for (let i = foods.length - 1; i >= 0; i--) {
    const f = foods[i];
    if (Math.hypot(f.x - h.x, f.y - h.y) < 0.65) {
      h.hunger = Math.max(0, h.hunger - f.amount * 0.6);
      h.actionType = 'eat';
      h.actionTime = 0.8;
      h.sitting = true;
      foods.splice(i, 1);
      break;
    }
  }

  if (h.meat && h.hunger > 30) {
    const consume = Math.min(h.meat, dt * 4);
    h.meat -= consume;
    h.hunger = Math.max(0, h.hunger - consume * 1.2);
    h.actionType = 'eat';
    h.actionTime = 0.6;
  }

  if (h.profession === 'healer' && state.tech.medicine) {
    const patient = humans.find(p => p.sick && Math.hypot(p.x - h.x, p.y - h.y) < 1.5);
    if (patient) {
      patient.sick = false;
      logEvent('Şifacı bir hastayı iyileştirdi.');
    }
  }

  if (h.buildCooldown <= 0) {
    const score = humans.length * 0.03 + buildings.length * 0.08;
    let desired = 'hut';
    // gated progression: hut->house->apartment->tower->mall
    if (score > 0.15) desired = 'house';
    if (score > 0.3) desired = 'apartment';
    if (score > 0.55) desired = 'tower';
    if (score > 0.7) desired = 'mall';
    const hasCityHall = buildings.some(b => b.level === 'cityhall');
    if (score > 0.6 && !hasCityHall) desired = 'cityhall';

    const upgradeTarget = buildings.find(b => {
      if (b.underConstruction) return false;
      if (desired === 'house') return b.level === 'hut';
      if (desired === 'apartment') return b.level === 'house';
      if (desired === 'tower') return b.level === 'apartment';
      if (desired === 'mall') return b.level === 'tower';
      return false;
    });

    const buildKey = upgradeTarget ? desired : desired;
    const cost = buildingTypes.find(b => b.key === buildKey)?.cost || buildingTypes[0].cost;
    // boost resource gain when buildings are few
    if (buildings.length < 12) {
      h.wood += dt * 2.5;
      h.stone += dt * 2.5;
    }
    if (h.wood >= cost.wood && h.stone >= cost.stone) {
      if (upgradeTarget) {
        const started = startUpgrade(h, upgradeTarget, buildKey);
        if (started) {
          h.actionType = 'build';
          h.actionTime = 0.6;
        }
      } else {
        const built = placeBuilding(h, desired);
        if (built && desired === 'cityhall') logEvent('Belediye binası kuruldu, bir başkan seçildi.');
        h.actionType = 'build';
        h.actionTime = 0.6;
      }
    }
  }

  if (h.reproduceCooldown <= 0 && h.hunger < 85 && h.thirst < 85 && h.age > 18 && humans.length < state.maxPop) {
    const nearby = humans.reduce((acc, o) => acc + (Math.hypot(o.x - h.x, o.y - h.y) < 2 ? 1 : 0), 0);
    if (nearby > 8) return true;
    const partner = humans.find(
      other => other !== h &&
      other.gender !== h.gender &&
      other.hunger < 85 &&
      other.thirst < 85 &&
      Math.hypot(other.x - h.x, other.y - h.y) < 1.8
    );
    if (partner) {
      h.reproduceCooldown = partner.reproduceCooldown = 25;
      const nx = clamp((h.x + partner.x) / 2 + (Math.random() - 0.5) * 0.5, 1, WORLD_SIZE - 2);
      const ny = clamp((h.y + partner.y) / 2 + (Math.random() - 0.5) * 0.5, 1, WORLD_SIZE - 2);
      const child = makeHuman(nx, ny, pickBalancedGender());
      child.homeX = clamp((h.homeX + partner.homeX) / 2 + (Math.random() - 0.5) * 6, 2, WORLD_SIZE - 2);
      child.homeY = clamp((h.homeY + partner.homeY) / 2 + (Math.random() - 0.5) * 6, 2, WORLD_SIZE - 2);
      humans.push(child);
      logEvent('Yeni bir bebek doğdu.');
    }
  }

  if (h.actionTime > 0) {
    h.actionTime = Math.max(0, h.actionTime - dt);
    if (h.actionTime === 0) h.actionType = null;
  }

  if (state.night && h.resting) {
    h.hunger = Math.max(0, h.hunger - dt * 0.2);
    h.thirst = Math.max(0, h.thirst - dt * 0.15);
    h.inside = true;
  } else {
    h.inside = false;
    if (!state.night) h.resting = false;
    if (!h.resting && !h.actionType) h.sitting = false;
  }

  // faith influence: prophets inspire nearby people
  if (h.profession === 'prophet') {
    state.faith = clamp(state.faith + dt * 0.5, 0, 100);
    for (const other of humans) {
      if (other === h) continue;
      if (Math.hypot(other.x - h.x, other.y - h.y) < 2.5) {
        other.hunger = Math.max(0, other.hunger - dt * 0.8);
        other.thirst = Math.max(0, other.thirst - dt * 0.5);
      }
    }
  }

  return true;
}
