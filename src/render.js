import { canvas, ctx, TILE, WORLD_SIZE, tiles, buildings, foods, campfires, fish, animals, humans, effects, state, tilePalette, bolts, graves, groundNoise, snowMask, clouds, boats, crops, carts } from './state.js';
import { clamp } from './utils.js';
import { getTileTemp } from './climate.js';
import { sprites, terrainSprites, buildingFrameIndex } from './sprites.js';

let shake = 0;
let vignetteGrad = null;
const HUMAN_SCALE = 0.6;

function hasWaterNeighbor(x, y) {
  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, 1], [1, -1], [-1, -1]
  ];
  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= WORLD_SIZE || ny >= WORLD_SIZE) continue;
    const t = tiles[ny * WORLD_SIZE + nx];
    if (t && t.type === 'water') return true;
  }
  return false;
}

function ensureVignette() {
  if (vignetteGrad && vignetteGrad.width === canvas.width && vignetteGrad.height === canvas.height) return vignetteGrad.grad;
  const grad = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    canvas.width * 0.25,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width * 0.7
  );
  grad.addColorStop(0, `rgba(0,0,0,${0.06})`);
  grad.addColorStop(1, `rgba(0,0,0,${0.3})`);
  vignetteGrad = { grad, width: canvas.width, height: canvas.height };
  return grad;
}

function drawTile(x, y, tile) {
  const noise = groundNoise[y * WORLD_SIZE + x] || 0;
  const elev = state.elevation[y * WORLD_SIZE + x] || 0;
  const m = tile.moisture;

  const terrainSprite = terrainSprites[tile.type] || terrainSprites.grass;
  if (terrainSprite) {
    drawSprite(terrainSprite, x * TILE, y * TILE, TILE);
  } else {
    const c = tilePalette[tile.type] || '#2f4432';
    ctx.fillStyle = c;
    ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
  }

  if (tile.type === 'water') {
    const depth = 0.6 + noise * 0.25 - elev * 0.2;
    const wave = Math.sin((x + state.time * 6) * 0.2) * 0.03 + Math.sin((y + state.time * 4) * 0.22) * 0.03;
    const base = clamp(depth + wave, 0, 1);
    ctx.fillStyle = `rgba(${40 + base * 40},${90 + base * 60},${140 + base * 60},${0.45 + base * 0.3})`;
    ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    // soft highlights on waves
    ctx.fillStyle = `rgba(255,255,255,${0.05 + wave * 0.5})`;
    ctx.fillRect(x * TILE, y * TILE, TILE, TILE * 0.2);
  } else {
    ctx.fillStyle = `rgba(180,220,255,${m * 0.08})`;
    ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    if (hasWaterNeighbor(x, y)) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x * TILE, y * TILE + TILE * 0.7, TILE, TILE * 0.3);
    }
  }

  const temp = getTileTemp(x, y);
  const winterBoost = (state.month === 12 || state.month <= 2) ? 0.3 : 0;
  const snowAlpha = clamp(((5 - temp) / 6) + winterBoost + elev * 0.4, 0, 1) * (0.4 + snowMask[y * WORLD_SIZE + x] * 0.6);
  if (snowAlpha > 0.05 && tile.type !== 'water') {
    ctx.fillStyle = `rgba(240,248,255,${snowAlpha})`;
    ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
  }
  if (tile.type !== 'water') {
    const shade = (noise - 0.5) * 0.08;
    ctx.fillStyle = `rgba(0,0,0,${0.08 + shade})`;
    ctx.fillRect(x * TILE, y * TILE, TILE, TILE);

    if (state.hoverTile && state.hoverTile.x === x && state.hoverTile.y === y) {
      ctx.strokeStyle = 'rgba(255,255,180,0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2);
    }
  }
}

function drawSprite(sprite, px, py, size, frameIndex = 0) {
  if (sprite.img) {
    const frames = sprite.frames && sprite.frames.length ? sprite.frames : (sprite.frame ? [sprite.frame] : []);
    const frame =
      frames.length ? frames[frameIndex % frames.length] :
      sprite.frame || { x: 0, y: 0, w: sprite.img.width, h: sprite.img.height };
    const frameW = frame?.w || sprite.img.width || size;
    const frameH = frame?.h || sprite.img.height || size;
    const frameX = frame?.x || 0;
    const frameY = frame?.y || 0;
    const base = sprite.baseSize || Math.max(frameW, frameH) || size;
    const scale = size / base;
    const drawW = frameW * scale;
    const drawH = frameH * scale;
    let dx = px;
    let dy = py;
    switch (sprite.align) {
      case 'bottom':
        dx += (size - drawW) / 2;
        dy += size - drawH;
        break;
      case 'center':
        dx -= drawW / 2;
        dy -= drawH / 2;
        break;
      default:
        break;
    }
    dx += (sprite.offset?.x || 0) * scale;
    dy += (sprite.offset?.y || 0) * scale;
    ctx.drawImage(sprite.img, frameX, frameY, frameW, frameH, dx, dy, drawW, drawH);
    return;
  }

  const scale = size / sprite.pixels.length;
  for (let y = 0; y < sprite.pixels.length; y++) {
    for (let x = 0; x < sprite.pixels[y].length; x++) {
      const code = sprite.pixels[y][x];
      const color = sprite.palette[code];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(px + x * scale, py + y * scale, scale + 0.01, scale + 0.01);
    }
  }
}

function drawHuman(h) {
  const isSummonedProphet = h.role === 'summonedProphet';
  const spr = h.gender === 'M' ? sprites.humanM : sprites.humanF;
  const size = TILE * HUMAN_SCALE;
  const sizeRatio = HUMAN_SCALE / 0.75;
  const walkCycle = h.moving ? Math.sin(h.animTime * 2.2) : 0;
  const step = Math.abs(walkCycle) * TILE * 0.1 * sizeRatio;
  const frameCount = spr.frames?.length || 1;
  const frameIdx = h.moving && frameCount > 1 ? Math.floor(h.animTime * 3) % frameCount : 0;
  const sitOffset = h.sitting ? TILE * 0.12 * sizeRatio : 0;
  if (h.resting) {
    ctx.fillStyle = 'rgba(60,70,90,0.7)';
    ctx.beginPath();
    ctx.arc(h.x * TILE, h.y * TILE + TILE * 0.2 * sizeRatio + sitOffset, TILE * 0.35 * sizeRatio, 0, Math.PI * 2);
    ctx.fill();
  }
  // shadow + legs
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(h.x * TILE, h.y * TILE + TILE * 0.32 * sizeRatio + sitOffset, TILE * 0.32 * sizeRatio, TILE * 0.18 * sizeRatio, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,25,32,0.8)';
  ctx.beginPath();
  ctx.ellipse(h.x * TILE - TILE * 0.12 * sizeRatio, h.y * TILE + TILE * 0.3 * sizeRatio + walkCycle * 0.1 * sizeRatio + sitOffset, TILE * 0.14 * sizeRatio, TILE * 0.18 * sizeRatio, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(h.x * TILE + TILE * 0.12 * sizeRatio, h.y * TILE + TILE * 0.3 * sizeRatio - walkCycle * 0.1 * sizeRatio + sitOffset, TILE * 0.14 * sizeRatio, TILE * 0.18 * sizeRatio, 0, 0, Math.PI * 2);
  ctx.fill();
  if (isSummonedProphet) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(h.x * TILE, h.y * TILE + TILE * 0.28 * sizeRatio + sitOffset, TILE * 0.48 * sizeRatio, TILE * 0.26 * sizeRatio, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(190,210,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(h.x * TILE, h.y * TILE - TILE * 0.12 * sizeRatio + sitOffset, TILE * 0.34 * sizeRatio, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawSprite(spr, (h.x - 0.5) * TILE, (h.y - 0.5) * TILE - step * 0.2 + sitOffset, size, frameIdx);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect((h.x - 0.4 * sizeRatio) * TILE, (h.y - 0.6 * sizeRatio + sitOffset) * TILE, TILE * 0.8 * sizeRatio, TILE * 0.4 * sizeRatio);
  if (isSummonedProphet) {
    const robeW = TILE * 0.62 * sizeRatio;
    const robeH = TILE * 0.78 * sizeRatio;
    const robeX = h.x * TILE - robeW / 2;
    const robeY = (h.y - 0.58 * sizeRatio + sitOffset) * TILE;
    const hemY = robeY + robeH;
    ctx.fillStyle = 'rgba(245,248,255,0.82)';
    ctx.beginPath();
    ctx.moveTo(h.x * TILE, robeY);
    ctx.lineTo(robeX + robeW, hemY);
    ctx.lineTo(robeX, hemY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(170,190,235,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // tool swing
  const swingActions = ['build', 'chop', 'hunt', 'farm'];
  if (h.actionType && h.actionTime > 0 && swingActions.includes(h.actionType)) {
    const angle = h.facing || 0;
    const swing = Math.sin((h.actionTime) * 12) * 0.4;
    const len = TILE * 0.6 * sizeRatio;
    const ax = h.x * TILE + Math.cos(angle + swing) * len;
    const ay = h.y * TILE + Math.sin(angle + swing) * len;
    ctx.strokeStyle = h.actionType === 'build' ? '#d9c49a' : h.actionType === 'farm' ? '#c2a35f' : '#c0c8d0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(h.x * TILE, h.y * TILE);
    ctx.lineTo(ax, ay);
    ctx.stroke();
    ctx.fillStyle = h.actionType === 'build' ? '#c0b07a' : h.actionType === 'farm' ? '#c2a35f' : '#c0c8d0';
    if (h.actionType === 'build' || h.actionType === 'farm') {
      const headW = TILE * 0.18;
      const headH = TILE * 0.12;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(angle + swing + Math.PI / 2);
      ctx.fillRect(-headW / 2, -headH / 2, headW, headH);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(ax, ay, TILE * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (h.actionType === 'eat' && h.actionTime > 0) {
    const angle = h.facing || 0;
    const biteX = h.x * TILE + Math.cos(angle) * TILE * 0.25;
    const biteY = h.y * TILE + Math.sin(angle) * TILE * 0.25 + sitOffset;
    ctx.fillStyle = '#e2c46a';
    ctx.beginPath();
    ctx.arc(biteX, biteY, TILE * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawForest(x, y) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse((x + 0.5) * TILE, (y + 0.9) * TILE, TILE * 0.35, TILE * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  drawSprite(sprites.tree, x * TILE + TILE * 0.05, y * TILE, TILE * 0.9);
}

function drawBuilding(b) {
  const spr = sprites.buildingSheet;
  const targetKey = b.targetLevel || b.level;
  const frameIdx = buildingFrameIndex[targetKey] ?? buildingFrameIndex.hut;
  const progress = b.underConstruction ? clamp(b.progress || 0, 0, 1) : 1;
  const growth = b.underConstruction ? 0.35 + progress * 0.75 : 1;
  const alpha = b.underConstruction ? 0.35 + progress * 0.65 : 1;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  const baseW = TILE * 0.95;
  ctx.fillRect((b.x - 0.45) * TILE, (b.y - 0.3) * TILE, baseW, TILE * 0.4);
  const scale =
    targetKey === 'tower' ? 1.35 :
    targetKey === 'apartment' ? 1.1 :
    targetKey === 'mall' ? 1.0 :
    targetKey === 'cityhall' ? 1.05 : 0.92;
  ctx.save();
  ctx.globalAlpha = alpha;
  drawSprite(spr, (b.x - 0.5) * TILE, (b.y - scale * 0.5 * growth) * TILE, TILE * scale * growth, frameIdx);
  ctx.restore();
  if (b.underConstruction) {
    ctx.strokeStyle = 'rgba(255,220,120,0.8)';
    ctx.lineWidth = 2;
    const boxW = TILE * (0.8 + growth * 0.2);
    const boxH = TILE * (0.9 * growth);
    ctx.strokeRect(b.x * TILE - boxW / 2, (b.y - 0.55 * growth) * TILE, boxW, boxH);
    ctx.fillStyle = `rgba(255,200,90,${0.35 + progress * 0.3})`;
    ctx.fillRect(b.x * TILE - boxW / 2, (b.y - 0.55 * growth + boxH * (1 - progress)) * TILE, boxW, boxH * progress);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(b.x * TILE, (b.y + 0.2) * TILE, TILE * 0.45, TILE * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  if (state.night) {
    // soft interior light
    const centerX = b.x * TILE;
    const centerY = (b.y - 0.2) * TILE;
    const glow = ctx.createRadialGradient(centerX, centerY, TILE * 0.2, centerX, centerY, TILE * 1.6 * scale);
    glow.addColorStop(0, 'rgba(255,220,150,0.55)');
    glow.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, TILE * 1.6 * scale, 0, Math.PI * 2);
    ctx.fill();
    // window flicker overlay
    ctx.fillStyle = `rgba(255,220,150,${0.35 + Math.random() * 0.15})`;
    ctx.fillRect((b.x - 0.4) * TILE, (b.y - 0.5 * scale) * TILE, TILE * scale * 0.8, TILE * scale * 0.7);
  }
}

function drawFood(f) {
  const px = (f.x - 0.5) * TILE;
  const py = (f.y - 0.5) * TILE;
  ctx.fillStyle = f.type === 'wheat' ? 'rgba(235, 210, 140, 0.24)' : 'rgba(255, 220, 120, 0.22)';
  ctx.beginPath();
  ctx.ellipse(f.x * TILE, f.y * TILE + TILE * 0.2, TILE * 0.35, TILE * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  if (f.type === 'wheat') {
    ctx.fillStyle = '#e2c46a';
    ctx.beginPath();
    ctx.moveTo(f.x * TILE, f.y * TILE - TILE * 0.25);
    ctx.lineTo(f.x * TILE - TILE * 0.12, f.y * TILE + TILE * 0.12);
    ctx.lineTo(f.x * TILE + TILE * 0.12, f.y * TILE + TILE * 0.12);
    ctx.fill();
  } else {
    drawSprite(sprites.fruit, px, py, TILE * 0.55);
  }
}

function drawFish(f) {
  ctx.fillStyle = '#7ec8e3';
  ctx.beginPath();
  ctx.ellipse(f.x * TILE, f.y * TILE, TILE * 0.32, TILE * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.arc(f.x * TILE + TILE * 0.12, f.y * TILE - TILE * 0.05, TILE * 0.05, 0, Math.PI * 2);
  ctx.fill();
}

function drawCampfire(f) {
  drawSprite(sprites.campfire, (f.x - 0.5) * TILE, (f.y - 0.5) * TILE, TILE * 0.9);
  const flicker = 0.35 + Math.random() * 0.25;
  ctx.fillStyle = `rgba(255,170,90,${flicker})`;
  ctx.beginPath();
  ctx.arc(f.x * TILE, f.y * TILE, TILE * 0.5, 0, Math.PI * 2);
  ctx.fill();
  // warm glow on ground
  const grad = ctx.createRadialGradient(f.x * TILE, f.y * TILE, TILE * 0.1, f.x * TILE, f.y * TILE, TILE * 1.6);
  grad.addColorStop(0, `rgba(255,180,110,${flicker * 0.7})`);
  grad.addColorStop(1, 'rgba(255,180,110,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(f.x * TILE, f.y * TILE, TILE * 1.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawCrop(c) {
  const px = (c.x - 0.5) * TILE;
  const py = (c.y - 0.5) * TILE;
  ctx.fillStyle = 'rgba(120,90,40,0.25)';
  ctx.fillRect(px + TILE * 0.15, py + TILE * 0.6, TILE * 0.7, TILE * 0.16);
  const stalks = 4;
  for (let i = 0; i < stalks; i++) {
    const t = i / (stalks - 1);
    const sx = px + TILE * (0.2 + t * 0.6);
    const h = Math.min(1, c.growth || 0.3);
    const sway = Math.sin((c.x + c.y + i) * 1.2 + state.time * 2) * 2;
    ctx.strokeStyle = '#e2c46a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, py + TILE * 0.6);
    ctx.lineTo(sx + sway, py + TILE * (0.6 - 0.35 * h));
    ctx.stroke();
  }
}

function drawCart(cart) {
  const px = (cart.x - 0.5) * TILE;
  const py = (cart.y - 0.5) * TILE;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(cart.x * TILE, (cart.y + 0.35) * TILE, TILE * 0.5, TILE * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c7a36a';
  ctx.fillRect(px + TILE * 0.05, py + TILE * 0.25, TILE * 0.9, TILE * 0.35);
  ctx.fillStyle = '#8a6a3f';
  ctx.fillRect(px + TILE * 0.08, py + TILE * 0.42, TILE * 0.84, TILE * 0.08);
  ctx.fillStyle = '#2d2d2d';
  ctx.beginPath();
  ctx.arc(px + TILE * 0.2, py + TILE * 0.65, TILE * 0.14, 0, Math.PI * 2);
  ctx.arc(px + TILE * 0.8, py + TILE * 0.65, TILE * 0.14, 0, Math.PI * 2);
  ctx.fill();
}

export function addShake(amount) {
  shake = Math.max(shake, amount);
}

export function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    shake = Math.max(0, shake - 0.7);
  }
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(state.zoom, state.zoom);
  const cam = state.camera || { x: 0, y: 0 };
  ctx.translate(-canvas.width / 2 - cam.x * TILE, -canvas.height / 2 - cam.y * TILE);
  for (let y = 0; y < WORLD_SIZE; y++) {
    for (let x = 0; x < WORLD_SIZE; x++) {
      drawTile(x, y, tiles[y * WORLD_SIZE + x]);
    }
  }

  for (const b of buildings) drawBuilding(b);
  for (const f of foods) drawFood(f);
  for (const f of campfires) drawCampfire(f);
  for (const c of crops) drawCrop(c);
  for (const f of fish) drawFish(f);
  for (const b of boats) {
    drawSprite(sprites.boat, (b.x - 0.5) * TILE, (b.y - 0.5) * TILE, TILE * 1.1);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(b.x * TILE, (b.y + 0.35) * TILE, TILE * 0.4, TILE * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const cart of carts) drawCart(cart);
  for (const g of graves) {
    const alpha = clamp(g.life / 160, 0, 1);
    ctx.globalAlpha = alpha;
    drawSprite(sprites.grave, (g.x - 0.5) * TILE, (g.y - 0.5) * TILE, TILE * 0.9);
    ctx.globalAlpha = 1;
  }
  for (const a of animals) {
    if (!a.alive) continue;
    const spr = a.kind === 'deer' ? sprites.deer : sprites.boar;
    ctx.fillStyle = 'rgba(0,0,0,0.26)';
    ctx.beginPath();
    ctx.ellipse(a.x * TILE, (a.y + 0.25) * TILE, TILE * 0.35, TILE * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    const frameIdx = a.moving && spr.frames?.length ? Math.floor(a.animTime * 2.5) % spr.frames.length : 0;
    drawSprite(spr, (a.x - 0.5) * TILE, (a.y - 0.5) * TILE, TILE * 1, frameIdx);
  }

  for (const h of humans) {
    if (!h.inside) drawHuman(h);
    if (h.hunger > 70) {
      ctx.strokeStyle = 'rgba(255,124,124,0.7)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(h.x * TILE, h.y * TILE, TILE * 0.32, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // trees drawn last so characters can pass "under" canopy
  for (let y = 0; y < WORLD_SIZE; y++) {
    for (let x = 0; x < WORLD_SIZE; x++) {
      if (tiles[y * WORLD_SIZE + x].type === 'forest') {
        drawForest(x, y);
      }
    }
  }

  for (const ef of effects) {
    const alpha = clamp(ef.life, 0, 1);
    if (ef.type === 'rain') {
      ctx.strokeStyle = `rgba(88,196,255,${0.3 * alpha})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 40; i++) {
        const rx = (ef.x + (Math.random() - 0.5) * ef.radius * 2) * TILE;
        const ry = (ef.y + (Math.random() - 0.5) * ef.radius * 2) * TILE;
        ctx.beginPath();
        ctx.moveTo(rx, ry - 6);
        ctx.lineTo(rx + 2, ry + 8);
        ctx.stroke();
      }
    }
    switch (ef.type) {
      case 'rain':
        ctx.fillStyle = `rgba(88,196,255,${0.18 * alpha})`;
        break;
      case 'snow':
        ctx.fillStyle = `rgba(230,240,255,${0.16 * alpha})`;
        for (let i = 0; i < 40; i++) {
          const rx = (ef.x + (Math.random() - 0.5) * ef.radius * 2) * TILE;
          const ry = (ef.y + (Math.random() - 0.5) * ef.radius * 2) * TILE;
          ctx.fillRect(rx, ry, 2, 2);
        }
        break;
      case 'quake':
        ctx.fillStyle = `rgba(255,124,124,${0.2 * alpha})`;
        break;
      case 'fire':
        ctx.fillStyle = `rgba(255,184,86,${0.25 * alpha})`;
        break;
      case 'bless':
        ctx.fillStyle = `rgba(125,255,139,${0.25 * alpha})`;
        break;
      case 'plague':
        ctx.fillStyle = `rgba(140,60,90,${0.25 * alpha})`;
        break;
      case 'prophet':
        ctx.fillStyle = `rgba(200,240,255,${0.28 * alpha})`;
        for (let i = 0; i < 26; i++) {
          const rx = (ef.x + (Math.random() - 0.5) * ef.radius * 2) * TILE;
          const ry = (ef.y + (Math.random() - 0.5) * ef.radius * 2) * TILE;
          ctx.fillRect(rx, ry, 2, 6);
        }
        break;
      case 'typhoon':
        ctx.fillStyle = `rgba(180,220,255,${0.3 * alpha})`;
        break;
      default:
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
    }
    ctx.beginPath();
    ctx.arc(ef.x * TILE, ef.y * TILE, ef.radius * TILE, 0, Math.PI * 2);
    ctx.fill();
  }
  // lightning bolts
  for (const bolt of bolts) {
    const screenX = bolt.x * TILE;
    const screenY = bolt.y * TILE;
    ctx.strokeStyle = `rgba(255,255,255,${bolt.alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(screenX + (Math.random() - 0.5) * TILE, 0);
    ctx.lineTo(screenX + (Math.random() - 0.5) * TILE, screenY);
    for (let i = 0; i < 3; i++) {
      ctx.moveTo(screenX + (Math.random() - 0.5) * TILE * 0.6, screenY * (i / 3));
      ctx.lineTo(screenX + (Math.random() - 0.5) * TILE * 0.6, screenY * ((i + 1) / 3));
    }
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,230,120,${bolt.alpha * 0.7})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX + (Math.random() - 0.5) * TILE * 0.2, screenY);
    ctx.stroke();
  }
  ctx.restore();

  // vignette + lightning flash
  let flashAlpha = 0;
  for (const bolt of bolts) {
    flashAlpha = Math.max(flashAlpha, bolt.alpha * 0.6);
  }
  ctx.fillStyle = ensureVignette();
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (flashAlpha > 0) {
    ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // clouds
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  for (const c of clouds) {
    ctx.globalAlpha = c.alpha;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, 60, 24, 0, 0, Math.PI * 2);
    ctx.ellipse(c.x + 30, c.y + 10, 50, 20, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const darkness = clamp(1 - state.light, 0, 1);
  ctx.fillStyle = `rgba(6,10,24,${0.65 * darkness})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const duskTint = Math.max(0, Math.sin(state.time + Math.PI / 2)) * 0.08;
  ctx.fillStyle = `rgba(255,180,90,${duskTint})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sunAlpha = state.light;
  ctx.fillStyle = `rgba(255,215,140,${0.7 * sunAlpha})`;
  ctx.beginPath();
  ctx.arc(canvas.width - 70, 70, 22, 0, Math.PI * 2);
  ctx.fill();
  const moonAlpha = clamp(1 - state.light, 0, 1);
  ctx.fillStyle = `rgba(200,220,255,${0.6 * moonAlpha})`;
  ctx.beginPath();
  ctx.arc(70, 70, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(6,10,24,${0.7 * moonAlpha})`;
  ctx.beginPath();
  ctx.arc(80, 70, 16, 0, Math.PI * 2);
  ctx.fill();

  // FPS counter
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(8, 8, 70, 26);
  ctx.fillStyle = '#e8f1ff';
  ctx.font = '14px monospace';
  ctx.fillText(`FPS ${Math.round(state.fps)}`, 12, 26);
}
