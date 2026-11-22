# Pokémon: Starlight Island — Complete 1,025 Gen 1–9 Edition

A zero-dependency, native ES6 module Pokémon adventure crafted for **Violet** and **Ozias**, designed to run directly from static hosting or GitHub Pages with no build step required.

## Highlights

- **Dual Trainer Profiles & Style Studio:** Independent auto-saving profiles in `localStorage` for **Violet** (★ purple starlight theme) and **Ozias** (⚡ sky thunder theme) with customizable outfits, headgear, capes, Starlight Auras, nicknames, Star Rank upgrades, and a discreet **Parent Zone** requiring a 3-second hold to reset progress.
- **Complete 1,025 National Pokédex (Gen 1–9):** Explore **#001 Bulbasaur through #1025 Pecharunt** with **all 18 canonical types** and a balanced `TYPE_CHART`, **128 moves**, **38 battle abilities**, **16 evolution gems** (powering complete Gen 1–9, Eeveelution, branched, and cross-gen evolutions), and **28 elemental badges**.
- **18 Biomes Across a 100×84 Starlight Island:** Journey from **Starlight Village** through 17 wild biomes—**Whispering Forest**, **Crystal Cavern**, **Sapphire Lagoon**, **Ember Caldera**, **Starfall Peak**, **Celestial Grove**, **Sunstone Dunes**, **Glowspore Bayou**, **Astral Sky Citadel**, **Thundersteppe Canyon**, **Abyssal Pearl Trench**, **Chrono Relic Ruins**, **Mythic Starlight Rift**, **Pixie Faeveldt Glade**, **Sunburst Alola Atoll**, **Iron Crown Highlands**, and **Terastal Crystal Crater**—featuring **20 shrines**, **23 field quests**, **17 rival trainers**, **36 treasure chests**, **20 landmarks**, **18 signposts**, **15 healing fountains**, and live Starlight Compass guidance.
- **1,025-Dex UX & Cry Previews:** Search by name, `#id`, or seen ability; filter by caught status, biome, type, ability, or generation (`All Gens` and `Gen 1`–`Gen 9`); browse smoothly with `IntersectionObserver` lazy-loaded sprites; and preview Pokémon cries right from Pokédex cards, detail panels, and evolutions.
- **Living Battle Animations & Procedural Web Audio:** Every move, ability cut-in, biome battle arena, and static Gen 6–9 sprite comes alive with canvas FX and deterministic living idle motion, paired with 18+ chiptune BGM themes and **1,025 deterministic procedural Web Audio Pokémon cries**.
- **Resilient Offline PWA & 10-Archetype Fallbacks:** Backed by a `starlight-shell-v8` service worker precaching the app shell, all 18 canonical elemental SVG mascots (`./assets/fallback/`), and Showdown/PokeAPI sprite cascades with **10-archetype** inline SVG silhouette and pixel-art follower fallbacks so offline play never stalls.
- **Desktop, Chromebook & Tablet Playability:** Full keyboard (`WASD` / Arrow keys, `Space`/`Enter`, `1`–`4` move slots, `P` for Pokédex) with input/select focus protection and responsive multi-touch virtual D-Pad + A/B buttons.

## Local Preview & GitHub Pages

Run any static HTTP server from the repository root (ES6 modules require HTTP rather than `file://`):

```bash
python -m http.server 8123
```

Open `http://localhost:8123/` in your browser (or `http://localhost:8123/?test=true` to run the automated test suite). All asset and module paths use relative `./` references so the repository deploys cleanly as-is to **GitHub Pages** (`Settings -> Pages -> Deploy from branch`).
