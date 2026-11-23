# AGENTS.md — Contributor & AI Agent Handbook

Welcome to **Pokémon: Starlight Island (`c:\dojo`)** — a zero-dependency, native ES6 module Pokémon adventure built for **Violet** (★ purple starlight theme) and **Ozias** (⚡ sky thunder theme).

The game runs directly from static hosting / GitHub Pages as an offline-first PWA on Android phones (`390×844`, `412×915`, `667×375` landscape), tablets (`768×1024`, `1024×768`), and Chromebooks/desktops (`1280×720`) with full-bleed direct touch navigation (tap BFS pathfinding + hold/drag steering) and full keyboard support.

---

## 1. Non-Negotiable Guardrails

Always verify these invariants before committing:

1. **Zero-Build Native ES6 + Relative `./` Paths:**
   - Do **not** add `package.json`, bundlers, transpilers, or npm runtime dependencies.
   - Every HTML asset link, ES6 `import`, `sw.js` precache entry, and fallback SVG URL must use relative `./` paths so GitHub Pages subpath deployments work cleanly.
2. **Save Sanctity (`starlight_pokemon_save_v1`):**
   - Never break `Pokemon.toJSON()` / `Pokemon.fromJSON()` or existing trainer saves in `localStorage`.
   - Preserve lossless profile migration/repair in `js/storage.js` (`validateAndRepairProfile`, UID deduplication, Pokédex ancestor recovery, walkable position repair).
   - Keep `mon.xpToNext === lv * 22 + 15`, exact `getBondTier()` thresholds/values (`xpMult: 1.0 / 1.08 / 1.12 / 1.20`, `critBonus: 0 / 0.02 / 0.04 / 0.04`, `endureChance: 0 / 0 / 0.15 / 0.25`), `BALANCE.combat.critBaseChance === 0.08`, and exact `evaluateOffensiveAbility()` / `evaluateDefensiveAbility()` outputs.
   - Keep `getPlayerLevel()` / `getPlayerLevelXpRequired()` / `TRAINER_XP_WEIGHTS` strictly milestone-driven — **never** inspect party or box Pokémon levels when computing Player Level.
3. **Resilient 4-Tier Sprite Fallback & Procedural Web Audio:**
   - Sprites degrade automatically from remote animated/static art to local `./assets/fallback/<type>.svg` mascots and 10-archetype inline SVG silhouettes (`generateSilhouetteDataUri`), so offline play never shows broken images.
   - Audio uses 100% procedural Web Audio synthesis (zero external audio files), synchronous multi-gesture Android/iPadOS unlock, and 1,025 deterministic Pokémon cries.
4. **`sw.js` `CORE_SHELL_URLS` 100% Disk Parity & Cache Contract:**
   - Whenever you add, rename, or remove any runtime file under `css/`, `js/`, `assets/icons/`, or `assets/fallback/`, update `CORE_SHELL_URLS` in `sw.js` to match **100%** (zero duplicates, zero missing runtime files, zero `./tests/`, `./scripts/`, or `./.github/` entries).
   - Keep `starlight-shell-v11` & `starlight-assets-v11` intact in `sw.js` and `starlight-shell-v11` referenced in `README.md` (`scripts/ci-static-gate.mjs` enforces this contract).
5. **Earned Economy & Pokédex Invariants:**
   - Fresh profiles start with `0` Star Shards and `0` Cheer Hearts (`MAX_CHEER_CHARGES = 3`, `STEPS_PER_CHEER_CHARGE = 25`, `MAX_ARCADE_CHARGES = 3`, `STEPS_PER_ARCADE_CHARGE = 50`, `BATTLES_PER_ARCADE_CHARGE = 2`, `ARCADE_SHARD_BUYIN_COST = 5`, `ARCADE_GEM_COOLDOWN_RUNS = 2`).
   - **NEVER** add any `.gainBond(` call in `js/pokedex.js` (`scripts/ci-static-gate.mjs` strictly forbids unguarded `.gainBond(` fallbacks in `pokedex.js`).
   - Reject `NaN`, `Infinity`, `-Infinity`, negatives, and booleans in all currency/reward mutators.
6. **Zero Legacy D-Pad IDs & 6-Viewport Zero-Overflow Layout:**
   - `index.html` must remain free of legacy D-Pad IDs (`dpad`, `btn-a`, `btn-b`, `quick-dex-btn`, `hud-btn-pad`, `setting-pad-btn`).
   - All overlays (HUD, battle deck, Pokédex, Sky-Hop Arcade, and `#encounter-briefing-modal`) must have zero horizontal overflow and zero bounding-box overlaps across all 6 tested viewports, including short landscape phones (`667×375`).
7. **Dataset & World Integrity:**
   - Keep canonical counts intact (`1,025` species, `18` types, `128` moves, `38` abilities, `16` evolution gems, `28` badges, `18` biomes, `20` shrines, `36` chests, `23` NPCs, `23` quests, `17` rivals, `20` landmarks, `18` signposts), `100×84` `WORLD_MAP`, 100% BFS walkability from `(8, 15)` to every interactive target + `SECRET_ARCADE_SPOT`, and 100% 1–1025 Dex reachability.

---

## 2. Module & Territory Map

### Runtime HTML, PWA & Styles
| Path | Role & Ownership |
| --- | --- |
| `index.html` | App shell, trainer select, starter lab, HUD, overworld/battle viewport, `#encounter-briefing-modal`, Pokédex, Sky-Hop Arcade, and Settings modals. |
| `manifest.json` | PWA metadata, icons (`192×192`, `512×512`), and 1,025-species description (validated by static gate). |
| `sw.js` | Offline-first service worker (`starlight-shell-v11` / `starlight-assets-v11`) with exact `CORE_SHELL_URLS` disk parity. |
| `css/main.css` | Core cabinet layout, trainer themes, HUD, overworld overlays (`#compass-hud`, `#biome-banner`, `#interact-pill`), Pokédex/Team/Guide/Style/Settings UI, and readiness pills. |
| `css/battle.css` | Battle arena scenery, fighter pedestals, HP/XP cards, move deck, type effectiveness badges, and responsive battle layout. |
| `css/controls.css` | 4-mode encounter transitions (`#encounter-flash`), celebration confetti/ribbons, Sky-Hop Arcade modal, 2-button Warp Dock (`#warp-dock`), and `#encounter-briefing-modal` responsive styles. |

### Native ES6 JavaScript Modules (`js/`)
| Path | Role & Ownership |
| --- | --- |
| `js/balance.js` | **Single source of truth** (`BALANCE` frozen config) + pure combat compression, Composure guardrail, XP rubber-banding, bench catch-up, and `assessEncounterReadiness` math. Zero imports. |
| `js/config.js` | Canonical game database: `1,025` `SPECIES`, `18` `TYPES` + `TYPE_CHART`, `128` `MOVES`, `38` `ABILITIES`, `16` `EVOLUTION_ITEMS`, `EVOLUTIONS`, `28` `BADGES`, trainer customization palettes, and sprite URL helpers. Re-exports world data. |
| `js/world-data.js` | `100×84` `WORLD_MAP`, `18` `BIOMES`, `20` `SHRINES`, `36` `CHESTS`, `23` `NPCS`, `23` `FIELD_QUESTS`, `17` `RIVAL_TRAINERS`, `20` `LANDMARKS`, `18` `SIGNPOSTS`, `SECRET_ARCADE_SPOT`, BFS walkability, depth tiers, Starlight Compass, and Player-Level/Safe-Zone warp coordinates. |
| `js/pokemon.js` | `Pokemon` class, stat/upgrade/evolution rules, `calculateDamage` (wired to `BALANCE`), `calculateCatchAttempt`, anti-repeat `rollWildPokemon`, scaled Shrine/Trial/Rival generators, `TYPE_CHART`-defaulted `assessEncounterReadiness`, and 4-tier sprite/silhouette loader. |
| `js/storage.js` | `StorageManager` (`starlight_pokemon_save_v1`), lossless save hydration/repair, dual Violet/Ozias profiles, Pokédex reconciliation, earned Star Shards / Cheer Hearts / Arcade charges, badges, and quests. |
| `js/audio.js` | Procedural Web Audio synthesizer (`AudioEngine`), synchronous mobile unlock, dynamic biome/battle BGM (`THEMES`), SFX, and 1,025 deterministic Pokémon cries. |
| `js/input.js` | Unified keyboard controller (`WASD`/Arrows, `Space`/`Enter`/`Z`, `Escape`/`Backspace`/`X`, `P`/`M`, `T`/`H`, `1`–`4`) with direction stack and modal-aware debounce. |
| `js/overworld.js` | 60fps canvas tile renderer, camera, Y-sorted actors/follower, tap-to-walk BFS pathfinder, hold/drag steering, discovery nodes, encounter pacing & grace steps, and readiness auras. |
| `js/battle.js` | Turn-based combat state machine (`BATTLE_STATES`), procedural FX canvas, enemy AI, Composure/ability cut-ins, capture shakes, XP/bench rewards, and switch drawer. |
| `js/pokedex.js` | 5-tab Pokédex Hub (`Dex`, `Team & Box`, `Badges`, `Guide`, `Style`) with lazy-loaded sprites, search/filters, evolution/upgrade/cheer controls, and biome readiness pills. |
| `js/minigame.js` | Secret **Starlight Sky-Hop Arcade** canvas mini-game (`StarlightMinigame`), 3-charge loop, hazard waves, and 6 skill-gated reward tiers. |
| `js/main.js` | Top-level `GameApp` orchestrator (`window.__starlightApp`): boot/starter flows, HUD/compass/warp dock sync, `#encounter-briefing-modal` anti-ambush flow, encounter transitions, dialogue, and `requestAnimationFrame` loop. |

### Verification & Testing (`scripts/` & `tests/`)
| Path | Role & Ownership |
| --- | --- |
| `scripts/ci-static-gate.mjs` | Zero-dependency Node ESM static gate (14 checks: JS/MJS syntax, conflict markers, manifest & PNG IHDR headers, `sw.js` v11 & disk parity, no legacy D-Pad IDs, dataset counts, BFS walkability, 1–1025 reachability, economy/cheer invariants). |
| `scripts/ci-browser-gate.mjs` | Automated Playwright Chromium gate: Stage A (`?test=true` suite), Stage B (6-viewport layout/touch/overlap matrix), Stage C (offline PWA Service Worker boot). |
| `tests/test-runner.js` | Comprehensive in-browser automated test suites (`window.runGameTests()` / `?test=true`). |

---

## 3. Balance Tuning Workflow

Do **not** hunt across `battle.js`, `pokemon.js`, `overworld.js`, or `main.js` for magic numbers.

1. Read [`docs/BALANCE.md`](./docs/BALANCE.md) to pick the exact dial and check its direction-of-effect and invariants.
2. Edit the frozen `BALANCE` object (or pure helper functions) in [`js/balance.js`](./js/balance.js).
3. Run the static CI gate and Node balance simulation snippet from [`docs/BALANCE.md`](./docs/BALANCE.md) to verify TTK curves, composure caps, XP rubber-banding, and scaling anchors.
4. Run the full browser gate to verify zero regressions across all suites and viewports.

---

## 4. Verification Commands

Run all commands from the repository root (`c:\dojo`):

```bash
# 1. Static CI Gate (must pass 14/14, 0 failed)
node scripts/ci-static-gate.mjs

# 2. Browser CI Gate (Playwright Chromium: ?test=true, 6 viewports, offline PWA)
node scripts/ci-browser-gate.mjs

# 3. Local HTTP preview (ES6 modules require HTTP, not file://)
python -m http.server 8123
# Open http://localhost:8123/           (play)
# Open http://localhost:8123/?test=true (run automated browser test suites)
```

---

## 5. Deep-Dive Documentation

- [**ARCHITECTURE.md**](./ARCHITECTURE.md) — Module dependency graph, overworld/battle/storage subsystems, sprite fallback cascade, Web Audio lifecycle, and PWA shell design.
- [**docs/BALANCE.md**](./docs/BALANCE.md) — Complete `js/balance.js` dial table, damage & composure pipeline, target TTK curves, XP rubber-banding tables, scaling anchors, and Node simulation commands.
- [**README.md**](./README.md) — Player-facing feature highlights, CI/CD summary, and GitHub Pages deployment guide.
