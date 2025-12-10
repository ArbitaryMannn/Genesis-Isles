# Genesis Isles (Web) / Tanrı Simülasyonu

A lightweight browser-based god simulation. Start with Adam and Eve in a small world, influence the ecosystem with rain, snow, quakes, lightning, and blessings, and watch people gather resources, build shelters, discover fire, and evolve across seasons and years.

---

## EN — Overview
- Seeded world with elevation, moisture, and seasonal temperature fields.
- Humans forage, fish, cut wood, mine stone, build huts, and unlock fire.
- Animals roam; fish spawn in water tiles; food hotspots emerge on fertile land.
- Your powers change terrain and outcomes: rain/snow nurture, quakes/lightning destroy, plague culls population, prophet boosts faith.

## EN — Controls
- Tools: Rain, Snow, Quake, Fire (lightning), Bless, Campfire, Plague, Prophet.
- Camera: hover near edges to pan; mouse wheel to zoom.
- Speed: slider or preset speed buttons.
- Audio: Music toggle (first click enables playback).
- Logs: Recent events and separate death log.
- Download: Exports a small in-game “book” as text.

## EN — Run Locally
1. Clone or download the repo.
2. Serve statically:
   - `python3 -m http.server 8000` or
   - `npx serve .`
3. Open `http://localhost:8000` in your browser.

## EN — Tech
- Vanilla JS canvas rendering (`src/render.js`) and state management (`src/state.js`).
- Procedural world generation with noise-based terrain and seasonal masks.
- Effect system (`src/effects.js`) and simple AI for humans/animals (`src/humans.js`, `src/animals.js`).
- Minimal UI + stats overlay (`src/ui.js`), audio via `AudioContext`.

## EN — Assets
- Characters: `fantasy-rpg-character-pack` (Franuka).
- UI + font: `rpg-ui-pack-demo-by-franuka`.
- Environment/animals: `cute-fantasy-free`.
- Building sprite: `buildings-colour2.png`.

---

## TR — Genel Bakış
- Yükseklik, nem ve mevsimsel sıcaklık alanlarıyla tohumlanan dünya.
- İnsanlar yiyecek toplar, balık tutar, odun/taş çıkarır, kulübe kurar, ateşi keşfeder.
- Hayvanlar gezer; balıklar sularda belirir; verimli topraklarda yiyecek kümeleri oluşur.
- Güçlerin araziyi ve sonucu değiştirir: yağmur/kar besler, deprem/yıldırım yıkar, salgın nüfusu azaltır, peygamber inancı yükseltir.

## TR — Kontroller
- Araçlar: Rain, Snow, Quake, Fire (yıldırım), Bless (bereket), Campfire, Plague, Prophet.
- Kamera: Kenara yakın gezdirerek kaydır; tekerlek ile zoom.
- Hız: Kaydırıcı veya hazır hız butonları.
- Ses: Müzik aç/kapat (ilk tıklamada başlar).
- Log: Olay listesi ve ayrı ölüm günlüğü.
- İndir: Oyundaki kısa “inanç kitabı”nı metin olarak indirir.

## TR — Çalıştırma
1. Depoyu klonla veya indir.
2. Statik sunucu ile aç:
   - `python3 -m http.server 8000` veya
   - `npx serve .`
3. Tarayıcıdan `http://localhost:8000` adresine git.

## TR — Teknoloji
- Vanilla JS canvas renderı (`src/render.js`) ve durum yönetimi (`src/state.js`).
- Gürültü tabanlı arazi üretimi ve mevsim maskeleri.
- Etki sistemi (`src/effects.js`) ve basit yapay zekâ (`src/humans.js`, `src/animals.js`).
- Hafif UI/istatistik katmanı (`src/ui.js`), `AudioContext` ile müzik.

## TR — Assetler
- Karakterler: `fantasy-rpg-character-pack` (Franuka).
- Arayüz ve font: `rpg-ui-pack-demo-by-franuka`.
- Çevre ve hayvanlar: `cute-fantasy-free`.
- Bina sprite: `buildings-colour2.png`.

---

## Profile / İletişim
- GitHub: [https://github.com/YOUR_USERNAME](https://github.com/ArbitaryMannn)
- LinkedIn: [https://www.linkedin.com/in/YOUR_LINKEDIN](https://www.linkedin.com/in/ali-yabuz-6b11a33a0/)
- Email: aliyabuz30@gmail.com


