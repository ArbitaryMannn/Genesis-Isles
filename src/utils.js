import { WORLD_SIZE } from './state.js';

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function idx(x, y) {
  return y * WORLD_SIZE + x;
}
