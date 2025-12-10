import { animals, WORLD_SIZE } from './state.js';
import { nearestOfType, worldTile } from './world.js';

export function makeAnimal(x, y, kind) {
  return {
    x,
    y,
    kind,
    dir: Math.random() * Math.PI * 2,
    speed: 0.8 + Math.random() * 0.6,
    hunger: 0,
    alive: true,
    animTime: 0,
    moving: false
  };
}

export function spawnAnimals(count = 5) {
  for (let i = 0; i < count; i++) {
    let tries = 0;
    let placed = false;
    while (!placed && tries < 12) {
      const x = Math.floor(Math.random() * WORLD_SIZE);
      const y = Math.floor(Math.random() * WORLD_SIZE);
      const overlap = animals.some(a => Math.hypot(a.x - (x + 0.5), a.y - (y + 0.5)) < 0.8);
      if (!overlap) {
        const kind = Math.random() > 0.5 ? 'deer' : 'boar';
        animals.push(makeAnimal(x + 0.5, y + 0.5, kind));
        placed = true;
      }
      tries++;
    }
  }
}

export function updateAnimal(a, dt) {
  if (!a.alive) return;
  const prevX = a.x;
  const prevY = a.y;
  a.hunger += dt * 0.5;
  if (a.hunger > 80 && Math.random() < 0.02) {
    const target = nearestOfType({ x: a.x, y: a.y }, Math.random() > 0.5 ? 'fertile' : 'forest');
    if (target) {
      a.dir = Math.atan2(target.y - a.y, target.x - a.x);
    }
  }
  const stepX = Math.cos(a.dir) * a.speed * dt;
  const stepY = Math.sin(a.dir) * a.speed * dt;
  const nextTile = worldTile(a.x + stepX, a.y + stepY);
  if (!nextTile || nextTile.type === 'water') {
    a.dir += Math.PI / 2 + (Math.random() - 0.5) * 0.6;
  } else {
    a.x += stepX;
    a.y += stepY;
  }
  if (a.x < 1 || a.y < 1 || a.x > WORLD_SIZE - 1 || a.y > WORLD_SIZE - 1) {
    a.dir += Math.PI / 2;
  }
  const grazing = nearestOfType({ x: a.x, y: a.y }, 'fertile');
  if (grazing && Math.random() < 0.3) {
    a.hunger = Math.max(0, a.hunger - dt * 8);
  }
  const moved = Math.hypot(a.x - prevX, a.y - prevY);
  a.moving = moved > 0.001;
  if (a.moving) a.animTime += moved * 10;
}
