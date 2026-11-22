# Pokémon: Starlight Island — Complete 1,025 Gen 1–9 Edition

A zero-dependency, native ES6 module Pokémon adventure crafted for **Violet** and **Ozias**, designed to run directly from static hosting or GitHub Pages with no build step required.

## Highlights

- **Dual Trainer Profiles & Style Studio:** Independent auto-saving profiles in `localStorage` for **Violet** (★ purple starlight theme) and **Ozias** (⚡ sky thunder theme) with customizable outfits, headgear, capes, Starlight Auras, nicknames, Star Rank upgrades, and a discreet **Parent Zone** requiring a 3-second hold to reset progress.
- **Complete 1,025 National Pokédex (Gen 1–9):** Explore **#001 Bulbasaur through #1025 Pecharunt** with **all 18 canonical types** and a balanced `TYPE_CHART`, **128 moves**, **38 battle abilities**, **16 evolution gems** (powering complete Gen 1–9, Eeveelution, branched, and cross-gen evolutions), and **28 elemental badges**.
- **18 Biomes Across a 100×84 Starlight Island:** Journey from **Starlight Village** through 17 wild biomes—**Whispering Forest**, **Crystal Cavern**, **Sapphire Lagoon**, **Ember Caldera**, **Starfall Peak**, **Celestial Grove**, **Sunstone Dunes**, **Glowspore Bayou**, **Astral Sky Citadel**, **Thundersteppe Canyon**, **Abyssal Pearl Trench**, **Chrono Relic Ruins**, **Mythic Starlight Rift**, **Pixie Faeveldt Glade**, **Sunburst Alola Atoll**, **Iron Crown Highlands**, and **Terastal Crystal Crater**—featuring **20 shrines**, **23 field quests**, **17 rival trainers**, **36 treasure chests**, **20 landmarks**, **18 signposts**, **15 healing fountains**, and live Starlight Compass guidance.
- **Full-Bleed Direct Touch & Keyboard Controls:** No bottom D-Pad bar—the overworld viewport fills the full handheld screen! **Tap anywhere** on the island to BFS pathfind and auto-interact with chests, NPCs, shrines, rivals, and signs, or **hold & drag** anywhere on the canvas to steer smoothly with corner-slide assist. Full desktop keyboard controls (`WASD` / Arrow keys, `Space`/`Enter`, `1`–`4` move slots, `P` for Pokédex, `Escape`) remain seamlessly supported.
- **Non-Repeating Encounters, Living Discovery Nodes & Astral Shrine Trials:** Non-repeating wild encounter decks with uncaught discovery bias, biome depth-tier level scaling, encounter traits (`curious`, `treasure`, `spirited`, `apex`), rotating rival rematch pools, three distinct overworld discovery nodes (`shimmer`, `starfall`, `mystery_cry`), and re-challengeable **Astral Shrine Trials** on cleared shrines.
- **Secret Starlight Sky-Hop Arcade Mini-Game:** Disguised behind a star-marked cottage wall in Starlight Village until you earn 1 Badge or catch 5 Pokémon and knock 3 times! Operates on **3 Flight Charges** (`🎟️ 0–3`, recharged every `50` steps, `2` battle wins, Shrine/Rival wins, or a `5 ✨` Star Shard buy-in) and pits your Lead Pokémon against Plasma Vortexes, telegraphed Dread Meteors, Twin Storm Gates, Wave 5+ sky crosswinds, and 6 skill-gated reward tiers (`80+` pts for Star Shards up to `4 ✨`, `180+` pts & Wave 2+ for Cheer Hearts, and `900+` pts & Wave 8+ for badge-gated Evolution Gems on cooldown)!
- **Earned Starlight Economy & Buddy Cheer System:** Fresh adventures begin with `0` Star Shards and `0` Cheer Hearts so every power-up and cheer is genuinely earned—gather **✨ Star Shards** from battle wins, wild catches, Starfall nodes, and Sky-Hop (`80+` pts), and earn **💖 Cheer Hearts** (max `3` held) every `25` walked steps, on battle victories/catches, or at `180+` pts (Wave 2+) in Sky-Hop to raise Buddy Bond (`+10`) up to `🌟 MAX BOND`. Pokédex controls lock clearly when unaffordable or maxed.
- **1,025-Dex UX & Cry Previews:** Search by name, `#id`, or seen ability; filter by caught status, biome, type, ability, or generation (`All Gens` and `Gen 1`–`Gen 9`); browse smoothly with `IntersectionObserver` lazy-loaded sprites; and preview Pokémon cries right from Pokédex cards, detail panels, and evolutions.
- **Android/Tablet Web Audio & Living Battle Celebrations:** Synchronous multi-gesture Android/iPadOS Web Audio unlock with silent wake buffer, first-tap queued SFX playback, visibility pause/resume recovery, 4-mode encounter shutter transitions (`wild`, `rare`, `rival`, `shrine`), multi-color `#celebration-layer` confetti ribbons, and **1,025 deterministic procedural Web Audio Pokémon cries**.
- **Resilient Offline PWA & 10-Archetype Fallbacks:** Backed by a `starlight-shell-v11` / `starlight-assets-v11` service worker precaching the app shell (including `js/minigame.js`), all 18 canonical elemental SVG mascots (`./assets/fallback/`), and Showdown/PokeAPI sprite cascades with **10-archetype** inline SVG silhouette and pixel-art follower fallbacks so offline play never stalls.

## CI/CD & Automated Verification

Continuous integration and automated GitHub Pages deployment are configured in `.github/workflows/ci-cd.yml` using zero-build Node ESM gates:

- `node scripts/ci-static-gate.mjs` — Validates JS/MJS syntax (`--check`), conflict-free source files, `manifest.json` metadata & PNG icon dimensions, `sw.js` `starlight-shell-v11` precache parity, and `1,025`-species / `100×84` world BFS invariants.
- `node scripts/ci-browser-gate.mjs` — Launches Playwright Chromium against a local static server to run the `?test=true` suite, verify zero layout overflow/overlap across 6 mobile/tablet/desktop touch viewports, and confirm offline PWA boot after service worker registration.

## Local Preview & GitHub Pages

Run any static HTTP server from the repository root (ES6 modules require HTTP rather than `file://`):

```bash
python -m http.server 8123
```

Open `http://localhost:8123/` in your browser (or `http://localhost:8123/?test=true` to run the automated test suite). All asset and module paths use relative `./` references so the repository deploys cleanly as-is to **GitHub Pages** (`Settings -> Pages -> Deploy from branch`).
