# Pokémon: Starlight Island — Violet & Ozias Adventure

A zero-dependency, native ES6 module Pokémon adventure crafted for **Violet** and **Ozias**, designed to run directly from static hosting or GitHub Pages with no build step required.

## Highlights

- **Dual Trainer Profiles:** Independent auto-saving profiles in `localStorage` for **Violet** (★ purple starlight theme) and **Ozias** (⚡ sky thunder theme), plus a discreet **Parent Zone** requiring a 3-second hold to reset progress.
- **18 Classic Gen-1 Pokémon across 4 Biomes:** Pick Bulbasaur, Charmander, or Squirtle, then explore **Starlight Village**, **Whispering Forest**, **Crystal Cavern**, and **Sapphire Lagoon** (plus 3 Elemental Shrines & 6 Badges).
- **Resilient Sprite Pipeline:** Loads animated sprites from PokeAPI with automatic fallback to static PNGs, local elemental SVGs (`./assets/fallback/`), and inline SVG silhouettes so offline play never stalls.
- **100% Procedural Web Audio Chiptunes:** Synthesized retro square/triangle BGM loops and attack/capture/level-up SFX using only native Web Audio API oscillators and noise buffers.
- **Desktop + Tablet Playability:** Full keyboard (`WASD` / Arrow keys, `Space`/`Enter`, `P` for Pokédex) and responsive multi-touch virtual D-Pad + A/B buttons.

## Local Preview & GitHub Pages

Run any static HTTP server from the repository root (ES6 modules require HTTP rather than `file://`):

```bash
python -m http.server 8123
```

Open `http://localhost:8123/` in your browser. All asset and module paths use relative `./` references so the repository deploys cleanly as-is to **GitHub Pages** (`Settings -> Pages -> Deploy from branch`).
