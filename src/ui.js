import { ui, logs, humans, buildings, state, deaths } from './state.js';

export function logEvent(text) {
  logs.unshift({ text, t: performance.now() });
  if (logs.length > 40) logs.length = 40;
  renderLog();
}

export function renderLog() {
  ui.logEl.innerHTML = logs.map(l => `<div class="log-entry">${l.text}</div>`).join('');
}

export function renderDeathLog() {
  if (!ui.deathEl) return;
  ui.deathEl.innerHTML = deaths.map(l => `<div class="log-entry">${l.text}</div>`).join('');
}

export function updateStats() {
  ui.popEl.textContent = humans.length;
  ui.hutEl.textContent = buildings.length;
  const score = Math.min(1, humans.length * 0.03 + buildings.length * 0.08);
  ui.progEl.style.width = `${score * 100}%`;
  const eras = ['Kabile', 'Topluluk', 'Yerleşik', 'Erken Uygarlık'];
  const thresholds = [0.2, 0.45, 0.7];
  let eraIndex = 0;
  if (score > thresholds[0]) eraIndex = 1;
  if (score > thresholds[1]) eraIndex = 2;
  if (score > thresholds[2]) eraIndex = 3;
  ui.eraEl.textContent = eras[eraIndex];
  if (ui.dateEl) ui.dateEl.textContent = `Y${state.year} A${state.month} G${state.day}`;
  if (ui.goldEl) ui.goldEl.textContent = Math.round(state.gold);
  renderDeathLog();
}

export function downloadBook() {
  const text = `İnanç ve Yolculuk\n\nAdem ve Havva'dan bugüne; doğa, bereket, sınavlar ve umut üzerine kısa notlar.\n\n1) Doğayla uyum.\n2) Paylaşım ve emek.\n3) Afet karşısında dayanışma.\n4) Yağmur, bereket ve umut.\n\nBu kitap simülasyon içindeki uygarlığınız için saklanmıştır.`;
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'inanc-kitabi.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
