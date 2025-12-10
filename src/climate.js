import { state } from './state.js';
import { idx } from './utils.js';

export function getTileTemp(x, y) {
  const base = state.tempField[idx(x, y)] || 18;
  const seasonAngle = ((state.month - 1) / 12) * Math.PI * 2;
  const seasonOffset = Math.cos(seasonAngle) * 8; // winter negative, summer positive
  const elevPenalty = (state.elevation[idx(x, y)] || 0) * 10;
  return base + seasonOffset - elevPenalty;
}
