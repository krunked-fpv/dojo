// Zero-Dependency Automated Test Suite for Pokémon: Starlight Island
// Run manually via `await window.runGameTests()` in DevTools console or automatically via `?test=true`

import {
  ABILITIES,
  BADGES,
  BIOMES,
  CHESTS,
  EVOLUTION_ITEMS,
  EVOLUTIONS,
  FIELD_QUESTS,
  GAME_META,
  LANDMARKS,
  MOVES,
  NPCS,
  RIVAL_TRAINERS,
  SHRINES,
  SIGNPOSTS,
  SOLID_TILES,
  SPECIES,
  STARTER_IDS,
  TILE,
  TRAINER_ACCESSORIES,
  TRAINER_AURAS,
  TRAINER_STYLES,
  TRAINERS,
  TYPES,
  TYPE_CHART,
  WORLD_COLS,
  WORLD_MAP,
  WORLD_ROWS,
  getBiomeAt,
  getBiomeDiscoveryStats,
  getCompassGuidance,
  getSpriteUrls,
  isTileWalkableAt,
  resolveTrainerLook,
} from '../js/config.js';
import {
  MAX_UPGRADE_TIER,
  Pokemon,
  attachPokemonSprite,
  calculateCatchAttempt,
  calculateDamage,
  createPokemon,
  evaluateDefensiveAbility,
  evaluateEntryAbility,
  evaluateOffensiveAbility,
  evaluateTurnEndAbility,
  generateSilhouetteDataUri,
  getBattleShardReward,
  getBiomeScaledRange,
  getBondTier,
  getPokemonAbility,
  getScaledRivalParty,
  getScaledShrineGuard,
  getTrainerPowerLevel,
  getTypeEffectiveness,
  rollWildPokemon,
} from '../js/pokemon.js';
import {
  STORAGE_KEY,
  StorageManager,
  isSpeciesCaught,
  isSpeciesSeen,
  sanitizePosition,
  storage,
  syncProfilePokedex,
} from '../js/storage.js';
import { AudioEngine, THEMES } from '../js/audio.js';
import { BATTLE_STATES, BattleEngine } from '../js/battle.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, label = '') {
  if (actual !== expected) {
    throw new Error(`${label ? `${label}: ` : ''}Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertGreater(actual, min, label = '') {
  if (!(actual > min)) {
    throw new Error(`${label ? `${label}: ` : ''}Expected ${actual} > ${min}`);
  }
}

function assertInRange(actual, min, max, label = '') {
  if (typeof actual !== 'number' || Number.isNaN(actual) || actual < min || actual > max) {
    throw new Error(`${label ? `${label}: ` : ''}Expected ${actual} to be within [${min}, ${max}]`);
  }
}

function assertFinite(actual, label = '') {
  if (typeof actual !== 'number' || !Number.isFinite(actual)) {
    throw new Error(`${label ? `${label}: ` : ''}Expected finite number, got ${actual}`);
  }
}

function buildTestSuites() {
  return [
    {
      name: '1. Type Effectiveness Matrix',
      tests: [
        {
          name: 'Water is super effective (2x) against Fire and Rock',
          fn() {
            assertEqual(getTypeEffectiveness('water', 'fire'), 2, 'water -> fire');
            assertEqual(getTypeEffectiveness('water', 'rock'), 2, 'water -> rock');
          },
        },
        {
          name: 'Grass resists Water (0.5x) and is super effective (2x) against Water & Rock',
          fn() {
            assertEqual(getTypeEffectiveness('water', 'grass'), 0.5, 'water -> grass');
            assertEqual(getTypeEffectiveness('grass', 'water'), 2, 'grass -> water');
            assertEqual(getTypeEffectiveness('grass', 'rock'), 2, 'grass -> rock');
          },
        },
        {
          name: 'Fire, Electric, Psychic, Normal & unknown fallback modifiers',
          fn() {
            assertEqual(getTypeEffectiveness('fire', 'grass'), 2, 'fire -> grass');
            assertEqual(getTypeEffectiveness('fire', 'water'), 0.5, 'fire -> water');
            assertEqual(getTypeEffectiveness('electric', 'water'), 2, 'electric -> water');
            assertEqual(getTypeEffectiveness('normal', 'rock'), 0.5, 'normal -> rock');
            assertEqual(getTypeEffectiveness('normal', 'fire'), 1, 'normal -> fire');
            assertEqual(getTypeEffectiveness('unknown', 'fire'), 1, 'unknown -> fire');
            assert(Boolean(TYPE_CHART.grass && TYPE_CHART.water && TYPE_CHART.fire), 'TYPE_CHART core entries exist');
          },
        },
      ],
    },
    {
      name: '2. Damage Calculation Boundaries',
      tests: [
        {
          name: 'Damage is non-negative and clamped to minimum 1 on extreme Lv.1 vs Lv.50 resisted hit',
          fn() {
            const weakAttacker = createPokemon(10, 1); // Lv.1 Caterpie (grass)
            const tankDefender = createPokemon(4, 50); // Lv.50 Charmander (fire, resists grass)
            const res = calculateDamage(weakAttacker, tankDefender, MOVES.vine_whip, {
              forceHit: true,
              forceCrit: false,
              fixedVariance: 0.9,
            });
            assertEqual(res.missed, false, 'forced hit');
            assertFinite(res.damage, 'minimum damage finite');
            assertEqual(res.damage, 1, 'extreme resisted hit floors to 1');
          },
        },
        {
          name: 'Super effective, STAB, and critical multipliers scale strictly as expected',
          fn() {
            const squirtle = createPokemon(7, 12); // Water
            const charmander = createPokemon(4, 12); // Fire
            const pikachu = createPokemon(25, 12); // Electric
            const bulbasaur = createPokemon(1, 12); // Grass

            const superEff = calculateDamage(squirtle, charmander, MOVES.water_gun, {
              forceHit: true,
              forceCrit: false,
              fixedVariance: 1.0,
            });
            const neutral = calculateDamage(squirtle, pikachu, MOVES.water_gun, {
              forceHit: true,
              forceCrit: false,
              fixedVariance: 1.0,
            });
            const resisted = calculateDamage(squirtle, bulbasaur, MOVES.water_gun, {
              forceHit: true,
              forceCrit: false,
              fixedVariance: 1.0,
            });
            const crit = calculateDamage(squirtle, charmander, MOVES.water_gun, {
              forceHit: true,
              forceCrit: true,
              fixedVariance: 1.0,
            });

            assertEqual(superEff.effectiveness, 2, 'super effective multiplier');
            assertEqual(resisted.effectiveness, 0.5, 'resisted multiplier');
            assertGreater(superEff.damage, neutral.damage, 'super effective > neutral');
            assertGreater(neutral.damage, resisted.damage, 'neutral > resisted');
            assertGreater(crit.damage, superEff.damage, 'critical > non-critical');
          },
        },
        {
          name: 'Heal moves produce 0 damage & positive heal, and malformed stats never produce NaN',
          fn() {
            const bulbasaur = createPokemon(1, 8);
            const healRes = calculateDamage(bulbasaur, bulbasaur, MOVES.synthesis);
            assertEqual(healRes.category, 'heal', 'heal category');
            assertEqual(healRes.damage, 0, 'heal damage');
            assertGreater(healRes.heal, 7, 'heal amount >= 8');

            const brokenAttacker = { level: NaN, atk: undefined, type: 'normal' };
            const zeroDefDefender = { def: 0, type: 'normal' };
            const safeRes = calculateDamage(brokenAttacker, zeroDefDefender, MOVES.tackle, {
              forceHit: true,
              forceCrit: false,
              fixedVariance: 1.0,
            });
            assertFinite(safeRes.damage, 'malformed stat damage is finite');
            assertGreater(safeRes.damage, 0, 'malformed stat damage >= 1');
          },
        },
      ],
    },
    {
      name: '3. Level-Up & EXP Curve Thresholds',
      tests: [
        {
          name: 'EXP curve tracks lv * 22 + 15 and accumulates without premature level-up',
          fn() {
            const mon = createPokemon(1, 5);
            assertEqual(mon.xpToNext, 5 * 22 + 15, 'Lv.5 xpToNext');
            const halfGain = mon.gainXp(mon.xpToNext - 1);
            assertEqual(halfGain.leveledUp, false, 'below threshold does not level up');
            assertEqual(mon.level, 5, 'level remains 5');
            assertEqual(mon.xp, mon.xpToNext - 1, 'xp stored');
          },
        },
        {
          name: 'Crossing EXP threshold levels up, carries remainder, grows stats & handles multi-level',
          fn() {
            const mon = createPokemon(4, 5);
            const prevMaxHp = mon.maxHp;
            const prevAtk = mon.atk;
            mon.takeDamage(10);
            const hpBeforeLevel = mon.hp;

            const needed = mon.xpToNext;
            const res = mon.gainXp(needed + 10);
            assertEqual(res.leveledUp, true, 'leveledUp flag');
            assertEqual(res.levelsGained, 1, 'levelsGained');
            assertEqual(mon.level, 6, 'new level 6');
            assertEqual(mon.xp, 10, 'carryover xp');
            assertEqual(mon.xpToNext, 6 * 22 + 15, 'Lv.6 xpToNext');
            assertGreater(mon.maxHp, prevMaxHp, 'maxHp increased');
            assertGreater(mon.atk, prevAtk, 'atk increased');
            assertGreater(mon.hp, hpBeforeLevel, 'conscious HP bonus granted');

            // Multi-level burst and Level 50 cap
            const mega = mon.gainXp(100000);
            assertEqual(mega.leveledUp, true, 'multi-level burst');
            assertEqual(mon.level, 50, 'capped at Level 50');
            const capCheck = mon.gainXp(500);
            assertEqual(capCheck.leveledUp, false, 'no level past 50');
            assertEqual(mon.level, 50, 'remains 50');
          },
        },
      ],
    },
    {
      name: '4. Catch Rate Formulas & 0-HP Safety',
      tests: [
        {
          name: 'Capture probability scales strictly higher as HP drops and ball tier rises',
          fn() {
            const fullHp = createPokemon(25, 6);
            const midHp = createPokemon(25, 6);
            midHp.hp = Math.round(midHp.maxHp * 0.5);
            const lowHp = createPokemon(25, 6);
            lowHp.hp = Math.max(1, Math.round(lowHp.maxHp * 0.1));

            const cFull = calculateCatchAttempt(fullHp, 1.0);
            const cMid = calculateCatchAttempt(midHp, 1.0);
            const cLow = calculateCatchAttempt(lowHp, 1.0);
            const cGreat = calculateCatchAttempt(midHp, 1.45);

            assertGreater(cMid.chance, cFull.chance, '50% HP > 100% HP catch chance');
            assertGreater(cLow.chance, cMid.chance, '10% HP > 50% HP catch chance');
            assertGreater(cGreat.chance, cMid.chance, 'Great Ball > Poké Ball catch chance');
            assertInRange(cFull.shakes, 1, 3, 'fullHp shakes in [1, 3]');
          },
        },
        {
          name: 'Throwing at 0 HP or malformed maxHp never yields NaN or invalid shakes',
          fn() {
            const fainted = createPokemon(10, 5);
            fainted.hp = 0;
            const resZero = calculateCatchAttempt(fainted, 1.0);
            assertFinite(resZero.chance, '0 HP catch chance finite');
            assertInRange(resZero.chance, 0.01, 1.0, '0 HP catch chance bounded');
            assertInRange(resZero.shakes, 1, 3, '0 HP shakes valid');

            const brokenMon = { hp: -5, maxHp: 0, species: { catchFactor: NaN } };
            const resBroken = calculateCatchAttempt(brokenMon, NaN);
            assertFinite(resBroken.chance, 'broken mon catch chance finite');
            assertInRange(resBroken.shakes, 1, 3, 'broken mon shakes valid');
          },
        },
      ],
    },
    {
      name: '5. Storage Serialization, Reload & Parent Reset',
      tests: [
        {
          name: 'localStorage persists profiles, hydrates Pokemon instances, and isolates parent resets',
          fn() {
            const TEST_KEY = 'starlight_pokemon_test_save_v1';
            try {
              window.localStorage.removeItem(TEST_KEY);
              const store = new StorageManager(TEST_KEY);

              // Setup Violet
              store.selectTrainer('violet');
              store.chooseStarter(1); // Bulbasaur
              const violet = store.getActiveProfile();
              violet.team[0].gainXp(35);
              violet.team[0].takeDamage(6);
              store.markChestOpened('forest_chest');
              store.markShrineCleared('forest_shrine');
              store.updateSettings({ muted: true, crtEnabled: false });

              // Setup Ozias
              store.selectTrainer('ozias');
              store.chooseStarter(7); // Squirtle
              store.recordBattleWin();

              // Reload from localStorage
              const reloaded = new StorageManager(TEST_KEY);
              assertEqual(reloaded.getActiveTrainerId(), 'ozias', 'activeTrainerId persisted');
              assertEqual(reloaded.getSettings().muted, true, 'settings.muted persisted');
              assertEqual(reloaded.getSettings().crtEnabled, false, 'settings.crtEnabled persisted');

              const vProfile = reloaded.getProfile('violet');
              assertEqual(vProfile.starterId, 1, 'Violet starterId hydrated');
              assert(vProfile.team[0] instanceof Pokemon, 'Violet team hydrated as Pokemon instance');
              assertEqual(vProfile.team[0].xp, 35, 'Violet starter XP persisted');
              assert(vProfile.shrinesCleared.includes('forest_shrine'), 'Violet shrine persisted');
              assert(vProfile.badges.includes('meadow'), 'Meadow badge persisted');

              // Single trainer reset preserves other trainer and settings
              reloaded.resetTrainerProgress('violet');
              const vAfterReset = reloaded.getProfile('violet');
              assertEqual(vAfterReset.starterId, null, 'Violet starter reset');
              assertEqual(vAfterReset.team.length, 0, 'Violet team cleared');
              assertEqual(reloaded.getProfile('ozias').starterId, 7, 'Ozias preserved');
              assertEqual(reloaded.getSettings().muted, true, 'Settings preserved after single reset');

              // Parent full reset wipes both profiles while keeping settings
              reloaded.resetAllProgress();
              assertEqual(reloaded.getProfile('ozias').starterId, null, 'Ozias reset on resetAll');
              assertEqual(reloaded.getActiveTrainerId(), null, 'activeTrainerId cleared on resetAll');
              assertEqual(reloaded.getSettings().crtEnabled, false, 'Settings preserved on resetAll');
            } finally {
              window.localStorage.removeItem(TEST_KEY);
            }
          },
        },
        {
          name: 'Corrupted save / empty-party edge case auto-recovers without locking',
          fn() {
            const TEST_KEY = 'starlight_pokemon_test_corrupt_v1';
            try {
              const corruptPayload = {
                version: 1,
                activeTrainerId: 'violet',
                profiles: {
                  violet: {
                    starterId: 4,
                    team: [{ bad: 'entry' }],
                    box: [],
                  },
                },
              };
              window.localStorage.setItem(TEST_KEY, JSON.stringify(corruptPayload));
              const recovered = new StorageManager(TEST_KEY);
              const v = recovered.getProfile('violet');
              assertEqual(v.team.length, 1, 'empty team auto-recovered from starterId');
              assertEqual(v.team[0].speciesId, 4, 'recovered fallback Charmander');
              assert(v.team[0].hp > 0, 'recovered starter is conscious');
            } finally {
              window.localStorage.removeItem(TEST_KEY);
            }
          },
        },
      ],
    },
    {
      name: '6. Party Swapping & Storage Box Routing',
      tests: [
        {
          name: 'Catches up to 6 fill team, 7th+ routes to box, and lead/box swaps persist',
          fn() {
            const TEST_KEY = 'starlight_pokemon_test_party_v1';
            try {
              window.localStorage.removeItem(TEST_KEY);
              const store = new StorageManager(TEST_KEY);
              store.selectTrainer('violet');
              store.chooseStarter(1); // Slot 1: Bulbasaur

              const catchIds = [10, 16, 25, 43, 133]; // Slots 2..6
              for (const id of catchIds) {
                const res = store.recordCaught(createPokemon(id, 5));
                assertEqual(res.destination, 'team', `species ${id} joins active team`);
              }

              const profile = store.getActiveProfile();
              assertEqual(profile.team.length, 6, 'team reached max capacity 6');
              assertEqual(profile.box.length, 0, 'box empty before 7th catch');

              // 7th catch must route to Reserve Box
              const seventh = store.recordCaught(createPokemon(131, 8)); // Lapras
              assertEqual(seventh.destination, 'box', '7th catch routes to box');
              assertEqual(profile.team.length, 6, 'team stays at 6');
              assertEqual(profile.box.length, 1, 'box has 1 mon');
              assertEqual(profile.box[0].speciesId, 131, 'Lapras stored in box');

              // Set Lead reorders team[2] -> team[0]
              const promotedSpecies = profile.team[2].speciesId;
              assertEqual(store.setLeadPokemon(2), true, 'setLeadPokemon returns true');
              assertEqual(profile.team[0].speciesId, promotedSpecies, 'promoted Pokemon is now lead');

              // Swap team[1] with box[0]
              const swappedOutId = profile.team[1].speciesId;
              assertEqual(store.swapTeamWithBox(1, 0), true, 'swapTeamWithBox returns true');
              assertEqual(profile.team[1].speciesId, 131, 'Lapras swapped into team[1]');
              assertEqual(profile.box[0].speciesId, swappedOutId, 'previous team[1] moved to box[0]');
            } finally {
              window.localStorage.removeItem(TEST_KEY);
            }
          },
        },
      ],
    },
    {
      name: '7. Audio Engine, Asset Fallback & Staging Hardening',
      tests: [
        {
          name: 'AudioEngine initializes lowpass master filter (~900-1300Hz), quiet BGM gains, and unlocks safely',
          async fn() {
            const testAudio = new AudioEngine({ silent: true, attachUnlockListeners: false });
            try {
              const ctx = testAudio.ensureContext();
              if (ctx) {
                assert(Boolean(testAudio.masterFilter), 'masterFilter created');
                assertEqual(testAudio.masterFilter.type, 'lowpass', 'masterFilter is lowpass');
                assertInRange(testAudio.masterFilter.frequency.value, 900, 1300, 'masterFilter cutoff in 900-1300Hz');
                assert(Boolean(testAudio.masterGain), 'masterGain created');
              }

              for (const [themeName, theme] of Object.entries(THEMES)) {
                assertInRange(theme.leadGain, 0, 0.12, `${themeName}.leadGain <= 0.12`);
                assertInRange(theme.arpGain, 0, 0.12, `${themeName}.arpGain <= 0.12`);
                assertInRange(theme.bassGain, 0, 0.12, `${themeName}.bassGain <= 0.12`);
              }

              await Promise.race([testAudio.unlock(), new Promise((r) => setTimeout(r, 200))]);
              testAudio.playBGM('battle');
              testAudio.playTackle();
              testAudio.playPhysicalImpact(55);
              testAudio.playElemental('fire');
              testAudio.playElemental('water');
              testAudio.playElemental('grass');
              testAudio.playPokeballThrow();
              testAudio.playPokeballAbsorb();
              testAudio.playPokeballBounce(0);
              testAudio.playPokeballWobble(1);
              testAudio.playCaptureSuccess();
              testAudio.playLevelUp();
              testAudio.stopBGM();
            } finally {
              await testAudio.destroy();
            }
          },
        },
        {
          name: 'Sprite pipeline falls back cleanly to high-contrast SVG silhouette without stalling',
          async fn() {
            const uri = generateSilhouetteDataUri(SPECIES[25], false);
            assert(uri.startsWith('data:image/svg+xml'), 'silhouette data URI valid');

            const unknownImg = document.createElement('img');
            await attachPokemonSprite(unknownImg, 999999);
            assert(unknownImg.src.startsWith('data:image/svg+xml'), 'unknown species swaps to inline SVG');

            const brokenImg = document.createElement('img');
            const promise = attachPokemonSprite(brokenImg, 25, { back: false, timeoutMs: 80 });
            assert(Boolean(brokenImg.getAttribute('src')), 'immediate local placeholder assigned synchronously');
            if (typeof brokenImg.onerror === 'function') {
              brokenImg.onerror();
              assert(brokenImg.src.startsWith('data:image/svg+xml'), 'error handler swaps immediately to SVG silhouette');
            }
            await promise;
            assert(Boolean(brokenImg.src), 'sprite promise settles cleanly with valid src');
          },
        },
        {
          name: 'Viewport lock, BattleEngine state integrity & pixelated CSS rendering hold',
          fn() {
            const meta = document.querySelector('meta[name="viewport"]');
            assert(Boolean(meta), 'viewport meta exists');
            const content = meta.getAttribute('content') || '';
            assert(content.includes('user-scalable=no'), 'viewport locks user scaling');
            assert(content.includes('viewport-fit=cover'), 'viewport-fit=cover enabled');

            const enemyImg = document.getElementById('enemy-sprite');
            const playerImg = document.getElementById('player-sprite');
            assert(Boolean(enemyImg && playerImg), 'battle sprite elements mounted');
            const enemyRender = window.getComputedStyle(enemyImg).imageRendering;
            assert(
              enemyRender === 'pixelated' || enemyRender === 'crisp-edges',
              `expected crisp pixel rendering on sprites, got "${enemyRender}"`,
            );

            // BattleEngine cannot throw or soft-lock on empty party start
            const TEST_KEY = 'starlight_pokemon_test_battle_guard_v1';
            let engine = null;
            try {
              window.localStorage.removeItem(TEST_KEY);
              const store = new StorageManager(TEST_KEY);
              store.selectTrainer('violet'); // unstarted: team is empty
              let endedWith = null;
              engine = new BattleEngine({
                storage: store,
                audio: { playMenuBlip() {} },
                onBattleEnd: (res) => {
                  endedWith = res;
                },
              });
              engine.start({ enemy: createPokemon(25, 5), biomeId: 'forest' });
              assertEqual(engine.active, false, 'BattleEngine does not stay stuck active on empty team');
              assertEqual(endedWith?.outcome, 'escaped', 'BattleEngine invokes onBattleEnd cleanly');
              assert(BADGES.length === 24 && Object.keys(SPECIES).length === 649, 'Config roster intact');
            } finally {
              engine?.destroy();
              window.localStorage.removeItem(TEST_KEY);
            }
          },
        },
      ],
    },
    {
      name: '8. Turn State Machine, Rapid-Click Lock & Loop Cleanup',
      tests: [
        {
          name: 'BATTLE_STATES exported and 25 rapid clicks execute only 1 player turn & 1 PP consumption',
          async fn() {
            const requiredStates = [
              'INACTIVE', 'INTRO', 'PLAYER_INPUT', 'ACTION_ANIMATING',
              'OPPONENT_AI', 'OPPONENT_ANIMATING', 'CHECK_FAINT',
              'RETURN_TO_INPUT', 'FORCED_SWITCH', 'BATTLE_END',
            ];
            for (const s of requiredStates) {
              assertEqual(BATTLE_STATES[s], s, `BATTLE_STATES.${s}`);
            }

            const TEST_KEY = 'starlight_pokemon_test_turn_lock_v1';
            const noopAudio = {
              playMenuBlip() {},
              playCursorMove() {},
              playMoveSelect() {},
              playPhysicalImpact() {},
              playElemental() {},
              playFaint() {},
              playHealChime() {},
              playLevelUp() {},
            };
            const store = new StorageManager(TEST_KEY);
            store.selectTrainer('violet');
            store.chooseStarter(1); // Bulbasaur Lv.5
            const player = store.getActiveProfile().team[0];
            const enemy = createPokemon(10, 4); // Caterpie Lv.4

            const engine = new BattleEngine({
              storage: store,
              audio: noopAudio,
              onBattleEnd() {},
              onBadgesUnlocked() {},
              onHudRefresh() {},
            });

            const waitUntil = async (pred, timeoutMs = 4500) => {
              const start = performance.now();
              while (!pred()) {
                if (engine.typingResolve) engine.finishTypewriter();
                if (performance.now() - start > timeoutMs) {
                  throw new Error(`Timed out waiting for condition (state=${engine.state}, busy=${engine.busy})`);
                }
                await new Promise((r) => setTimeout(r, 15));
              }
            };

            try {
              const startPromise = engine.start({ enemy, biomeId: 'forest' });
              await waitUntil(() => engine.state === BATTLE_STATES.PLAYER_INPUT);
              await startPromise;

              let playerMoveExecutions = 0;
              const origExec = engine.executeMoveAction.bind(engine);
              engine.executeMoveAction = async (side, move, sid) => {
                if (side === 'player') playerMoveExecutions += 1;
                return origExec(side, move, sid);
              };

              const tackleBtn = Array.from(document.querySelectorAll('#battle-moves .move-card'))
                .find((btn) => btn.dataset.moveId === 'tackle') || document.querySelector('#battle-moves .move-card');
              assert(Boolean(tackleBtn), 'Move card rendered for battle');

              const moveId = tackleBtn.dataset.moveId;
              const ppBefore = player.getMovePp(moveId).current;

              // Spam-click 25 times synchronously
              for (let i = 0; i < 25; i++) {
                tackleBtn.click();
              }

              // Global Action Lock must be engaged immediately on the very first click
              assertEqual(engine.busy, true, 'engine.busy locked immediately');
              assert(
                engine.state === BATTLE_STATES.ACTION_ANIMATING || engine.state === BATTLE_STATES.OPPONENT_AI,
                `expected locked turn state, got ${engine.state}`,
              );
              assert(
                document.getElementById('battle-screen').classList.contains('is-action-locked'),
                'battle-screen has .is-action-locked immediately',
              );
              const allDisabled = Array.from(document.querySelectorAll('#battle-moves .move-card'))
                .every((b) => b.disabled);
              assertEqual(allDisabled, true, 'all move buttons disabled during turn execution');
              assertEqual(player.getMovePp(moveId).current, ppBefore - 1, 'PP consumed exactly once despite 25 clicks');

              // Let the turn finish cleanly
              await waitUntil(() => engine.state === BATTLE_STATES.PLAYER_INPUT || !engine.active, 6000);
              assertEqual(playerMoveExecutions, 1, 'only 1 player move executed across 25 rapid clicks');

              // Test say() typing -> waiting -> resolved lifecycle
              const logEl = document.getElementById('battle-log');
              const sayPromise = engine.say('Testing arcade box!', 5, 350);
              assert(logEl.classList.contains('is-typing'), 'logEl sets .is-typing during typewriter');
              await new Promise((r) => setTimeout(r, 140));
              assert(logEl.classList.contains('is-waiting'), 'logEl sets .is-waiting with bouncing arrow cue');
              engine.finishTypewriter();
              await sayPromise;
              assert(!logEl.classList.contains('is-typing') && !logEl.classList.contains('is-waiting'), 'classes cleared after finishTypewriter');

              engine.stop();
              assertEqual(engine.state, BATTLE_STATES.INACTIVE, 'state reset to INACTIVE on stop');
              assertEqual(engine.fxRaf, null, 'fxRaf cancelled on stop');
              assertEqual(engine.pendingTimers.size, 0, 'all pendingTimers cleared on stop');
              assertEqual(engine.ballRafId, null, 'ballRafId null on stop');
              assertEqual(engine.hpRafs.enemy, null, 'enemy hpRaf null on stop');
              assertEqual(engine.hpRafs.player, null, 'player hpRaf null on stop');
            } finally {
              engine.destroy();
              window.localStorage.removeItem(TEST_KEY);
            }
          },
        },
        {
          name: 'Closing Pokédex (X button & backdrop) and Settings immediately unpauses overworld movement',
          fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            const wasBootHidden = app.bootScreenEl.hidden;
            const wasShellHidden = app.gameShellEl.hidden;
            const wasOverworldActive = app.overworld.active;
            const wasPaused = app.overworld.paused;
            const wasBattleActive = app.battle.active;

            try {
              app.battle.active = false;
              app.encounterTransitioning = false;
              app.dialogueOpen = false;
              app.gameShellEl.hidden = false;
              app.bootScreenEl.hidden = true;
              app.overworld.active = true;
              app.syncOverworldPause();
              assertEqual(app.overworld.paused, false, 'overworld initially unpaused');

              app.openPokedex('dex');
              assertEqual(app.pokedex.isOpen(), true, 'Pokédex opened');
              assertEqual(app.overworld.paused, true, 'overworld paused while Pokédex open');
              document.getElementById('pokedex-close-btn').click();
              assertEqual(app.pokedex.isOpen(), false, 'Pokédex closed via X button');
              assertEqual(app.overworld.paused, false, 'overworld unpaused after Pokédex X button');

              app.openPokedex('badges');
              assertEqual(app.overworld.paused, true, 'overworld paused on Pokédex badges tab');
              const dexModal = document.getElementById('pokedex-modal');
              dexModal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              assertEqual(app.pokedex.isOpen(), false, 'Pokédex closed via backdrop click');
              assertEqual(app.overworld.paused, false, 'overworld unpaused after Pokédex backdrop click');

              app.openSettings();
              assertEqual(app.isSettingsOpen(), true, 'Settings opened');
              assertEqual(app.overworld.paused, true, 'overworld paused while Settings open');
              document.getElementById('settings-close-btn').click();
              assertEqual(app.isSettingsOpen(), false, 'Settings closed via X button');
              assertEqual(app.overworld.paused, false, 'overworld unpaused after Settings close');
            } finally {
              app.pokedex.close();
              app.closeSettings();
              app.battle.active = wasBattleActive;
              app.bootScreenEl.hidden = wasBootHidden;
              app.gameShellEl.hidden = wasShellHidden;
              app.overworld.active = wasOverworldActive;
              app.overworld.setPaused(wasPaused);
            }
          },
        },
      ],
    },
    {
      name: '9. Audio Scheduler Stability & Authentic Chiptune Engine',
      tests: [
        {
          name: 'Rapid BGM theme switching maintains single scheduler and stopBGM clears active nodes',
          async fn() {
            const testAudio = new AudioEngine({ silent: true, attachUnlockListeners: false });
            try {
              testAudio.ensureContext();
              await Promise.race([testAudio.unlock(), new Promise((r) => setTimeout(r, 200))]);

              const cycle = ['battle', 'overworld', 'title', 'battle'];
              for (let i = 0; i < 12; i++) {
                testAudio.playBGM(cycle[i % cycle.length]);
              }

              const diagActive = testAudio.getDiagnostics();
              assertEqual(diagActive.currentTheme, 'battle', 'final active theme is battle');
              if (testAudio.ctx && testAudio.ctx.state === 'running') {
                assertEqual(diagActive.schedulerActive, true, 'single scheduler active when running');
              }

              // Authentic Gen 1/Gen 3 battle ostinato composition assertions
              const battle = THEMES.battle;
              assertInRange(battle.stepSec, 0.12, 0.16, 'battle stepSec in 0.12-0.16s groove range');
              assert(battle.melody.length >= 64, 'battle melody >= 64 steps');
              assert(Array.isArray(battle.drums) && battle.drums.length >= 16, 'battle percussion track present');
              assert(battle.leadWave === 'pulse25' || battle.leadWave === 'pulse12', 'battle lead uses authentic pulse wave');

              testAudio.playCursorMove();
              testAudio.playMoveSelect();
              testAudio.playPhysicalImpact(45);
              testAudio.playFaint();

              testAudio.stopBGM();
              const diagStopped = testAudio.getDiagnostics();
              assertEqual(diagStopped.currentTheme, null, 'currentTheme cleared on stopBGM');
              assertEqual(diagStopped.schedulerActive, false, 'scheduler stopped on stopBGM');
              assertEqual(diagStopped.activeBgmNodes, 0, 'all active BGM oscillators stopped and cleared');
              assertEqual(diagStopped.stepIndex, 0, 'stepIndex reset to 0 on stopBGM');
            } finally {
              await testAudio.destroy();
            }
          },
        },
      ],
    },
    {
      name: '10. Elemental Move Cards & PP Meter UI',
      tests: [
        {
          name: 'Move cards render type-specific elemental styling, cursor, category, power, and 5 PP pips',
          fn() {
            const TEST_KEY = 'starlight_pokemon_test_cards_v1';
            const store = new StorageManager(TEST_KEY);
            store.selectTrainer('ozias');
            store.chooseStarter(4); // Charmander

            const engine = new BattleEngine({
              storage: store,
              audio: { playMenuBlip() {}, playCursorMove() {} },
              onBattleEnd() {},
              onBadgesUnlocked() {},
              onHudRefresh() {},
            });

            try {
              const speciesToTest = [4, 7, 1, 25, 133]; // Charmander(fire), Squirtle(water), Bulbasaur(grass), Pikachu(electric), Eevee(normal)
              const expectedClasses = ['move-card--fire', 'move-card--water', 'move-card--grass', 'move-card--electric', 'move-card--normal'];

              engine.enemy = createPokemon(10, 5);
              engine.active = true;
              engine.state = BATTLE_STATES.PLAYER_INPUT;

              const seenClasses = new Set();
              for (const spId of speciesToTest) {
                engine.player = createPokemon(spId, 5);
                engine.renderMoveButtons();
                const cards = Array.from(document.querySelectorAll('#battle-moves .move-card'));
                assertGreater(cards.length, 0, `cards rendered for species ${spId}`);

                for (const card of cards) {
                  for (const cls of card.classList) {
                    if (cls.startsWith('move-card--')) seenClasses.add(cls);
                  }
                  const cursor = card.querySelector('.move-cursor');
                  assert(Boolean(cursor) && cursor.textContent.includes('▶'), 'move-cursor ▶ present');
                  assert(Boolean(card.querySelector('.move-cat-badge')), 'category badge present');
                  assert(Boolean(card.querySelector('.move-pwr-tag')), 'power tag present');
                  const ppText = card.querySelector('.move-pp-text')?.textContent || '';
                  assert(/^PP \d+\/\d+$/.test(ppText), `valid PP readout "${ppText}"`);
                  assertEqual(card.querySelectorAll('.pp-pip').length, 5, '5 PP energy pips rendered');
                }
              }

              for (const reqCls of expectedClasses) {
                assert(seenClasses.has(reqCls), `rendered elemental class ${reqCls}`);
              }
            } finally {
              engine.destroy();
              window.localStorage.removeItem(TEST_KEY);
            }
          },
        },
      ],
    },
    {
      name: '11. v1 to v2 Lossless Save Migration & Safe Coordinate Recovery',
      tests: [
        {
          name: 'Migrates v1 Violet & Ozias save payload losslessly and rescues stranded coordinates',
          fn() {
            assertEqual(STORAGE_KEY, 'starlight_pokemon_save_v1', 'STORAGE_KEY constant preserved');
            const TEST_KEY = 'starlight_pokemon_test_v1_migration';
            try {
              const v1Payload = {
                version: 1,
                activeTrainerId: 'violet',
                settings: {
                  muted: true,
                  crtEnabled: false,
                  showTouchPad: 'show',
                },
                profiles: {
                  violet: {
                    trainerId: 'violet',
                    starterId: 1,
                    pos: { x: 0, y: 0, dir: 'up' }, // solid TREE tile
                    team: [
                      {
                        uid: 'v-bulba-1',
                        speciesId: 1,
                        level: 7,
                        xp: 42,
                        hp: 29,
                        caughtBiome: 'starter',
                        movePp: { vine_whip: 19, tackle: 30 },
                      },
                    ],
                    box: [
                      {
                        uid: 'v-pika-box',
                        speciesId: 25,
                        level: 6,
                        xp: 12,
                        hp: 25,
                        caughtBiome: 'forest',
                      },
                    ],
                    pokedex: { seen: [1, 10, 25], caught: { 1: 1, 25: 1 } },
                    badges: ['meadow'],
                    shrinesCleared: ['forest_shrine'],
                    chestsOpened: ['forest_chest'],
                    bag: { potions: 9, greatBalls: 7 },
                    stats: { battlesWon: 4, totalCaught: 2, steps: 120 },
                  },
                  ozias: {
                    trainerId: 'ozias',
                    starterId: 4,
                    pos: { x: 99, y: 99, dir: 'left' }, // out-of-bounds
                    team: [
                      {
                        uid: 'o-char-1',
                        speciesId: 4,
                        level: 6,
                        xp: 18,
                        hp: 24,
                        caughtBiome: 'starter',
                      },
                    ],
                    box: [],
                    pokedex: { seen: [4], caught: { 4: 1 } },
                    badges: [],
                    shrinesCleared: [],
                    chestsOpened: [],
                    bag: { potions: 5, greatBalls: 4 },
                    stats: { battlesWon: 1, totalCaught: 1, steps: 33 },
                  },
                },
              };

              window.localStorage.setItem(TEST_KEY, JSON.stringify(v1Payload));
              const migrated = new StorageManager(TEST_KEY);

              assertEqual(migrated.state.version, 2, 'migrated save state version is 2');
              assertEqual(migrated.getActiveTrainerId(), 'violet', 'activeTrainerId preserved');
              assertEqual(migrated.getSettings().muted, true, 'muted preserved');
              assertEqual(migrated.getSettings().crtEnabled, false, 'crtEnabled preserved');
              assertEqual(migrated.getSettings().showTouchPad, 'show', 'showTouchPad preserved');
              assertEqual(migrated.getSettings().battlePace, 'cinema', 'battlePace defaults to cinema');

              const v = migrated.getProfile('violet');
              assertEqual(v.team.length, 1, 'Violet team preserved');
              assert(v.team[0] instanceof Pokemon, 'Violet team mon hydrated');
              assertEqual(v.team[0].speciesId, 1, 'Violet starter species preserved');
              assertEqual(v.team[0].level, 7, 'Violet starter level preserved');
              assertEqual(v.team[0].xp, 42, 'Violet starter XP preserved');
              assertEqual(v.team[0].hp, 29, 'Violet starter HP preserved');
              assertEqual(v.box.length, 1, 'Violet box preserved');
              assertEqual(v.box[0].speciesId, 25, 'Violet box species preserved');
              assert(v.pokedex.caught[1] === 1 && v.pokedex.caught[25] === 1, 'Violet caught preserved');
              assert(v.shrinesCleared.includes('forest_shrine'), 'Violet forest_shrine preserved');
              assert(v.chestsOpened.includes('forest_chest'), 'Violet forest_chest preserved');
              assert(v.badges.includes('meadow'), 'Violet meadow badge preserved');
              assertEqual(v.bag.potions, 9, 'Violet potions preserved');
              assertEqual(v.bag.greatBalls, 7, 'Violet greatBalls preserved');
              assertEqual(v.bag.gems.fire_gem, 0, 'gems initialized to 0');
              assertEqual(v.bag.gems.moon_gem, 0, 'moon_gem initialized to 0');
              assert(Array.isArray(v.questsCompleted), 'questsCompleted initialized');
              assertEqual(v.stats.evolutions, 0, 'stats.evolutions initialized');
              assertEqual(v.stats.shiniesFound, 0, 'stats.shiniesFound initialized');
              assertEqual(isTileWalkableAt(v.pos.x, v.pos.y), true, 'Violet stranded (0,0) relocated to walkable tile');

              const o = migrated.getProfile('ozias');
              assertEqual(o.team[0].speciesId, 4, 'Ozias team preserved');
              assertEqual(o.team[0].xp, 18, 'Ozias XP preserved');
              assertEqual(isTileWalkableAt(o.pos.x, o.pos.y), true, 'Ozias out-of-bounds (99,99) relocated safely');
              assertEqual(o.pos.x, GAME_META.spawn.x, 'Ozias out-of-bounds falls back to spawn.x');
              assertEqual(o.pos.y, GAME_META.spawn.y, 'Ozias out-of-bounds falls back to spawn.y');

              migrated.save();
              const rawSaved = JSON.parse(window.localStorage.getItem(TEST_KEY));
              assertEqual(rawSaved.version, 2, 'persisted save writes version 2');
            } finally {
              window.localStorage.removeItem(TEST_KEY);
            }
          },
        },
      ],
    },
    {
      name: '12. Evolution Chains, Evolution Gems & Expanded 649-Species Roster',
      tests: [
        {
          name: 'All 10 TYPES have fallback SVGs, 649 SPECIES & 12 gems exist, and level & gem evolutions update Pokemon & Storage',
          async fn() {
            const typeIds = Object.keys(TYPES);
            assertEqual(typeIds.length, 10, '10 elemental types exist');
            for (const reqType of ['grass', 'fire', 'water', 'electric', 'rock', 'psychic', 'normal', 'ice', 'ghost', 'dragon']) {
              assert(Boolean(TYPES[reqType]), `TYPES.${reqType} present`);
              const resp = await fetch(`./assets/fallback/${reqType}.svg`);
              assertEqual(resp.ok, true, `fallback SVG exists for ${reqType}`);
            }

            assertEqual(Object.keys(SPECIES).length, 649, '649 species defined');
            assertEqual(Object.keys(EVOLUTION_ITEMS).length, 12, '12 evolution gems defined');
            assertEqual(EVOLUTIONS[1][0].to, 2, 'Bulbasaur -> Ivysaur');
            assertEqual(EVOLUTIONS[2][0].to, 3, 'Ivysaur -> Venusaur');
            assertEqual(EVOLUTIONS[129][0].to, 130, 'Magikarp -> Gyarados');
            assertEqual(EVOLUTIONS[25][0].to, 26, 'Pikachu -> Raichu');
            const eeveeTargets = EVOLUTIONS[133].map((r) => r.to).sort((a, b) => a - b);
            assertEqual(JSON.stringify(eeveeTargets), JSON.stringify([134, 135, 136, 196, 197, 470, 471]), 'Eevee -> 7 Eeveelutions');

            const bulbaLv9 = createPokemon(1, 9);
            assertEqual(bulbaLv9.getPendingLevelEvolution(), null, 'Lv.9 Bulbasaur has no pending level evolution');
            const bulbaLv10 = createPokemon(1, 10);
            assertEqual(bulbaLv10.getPendingLevelEvolution()?.toId, 2, 'Lv.10 Bulbasaur pending Ivysaur');

            const eevee = createPokemon(133, 8);
            assertEqual(eevee.getPendingLevelEvolution(), null, 'Eevee has no level evolution');
            const eeveeNoGems = eevee.getAvailableItemEvolutions({ water_gem: 0, thunder_gem: 0, fire_gem: 0, moon_gem: 0, leaf_gem: 0, ice_gem: 0, sun_gem: 0, dusk_gem: 0, astral_gem: 0 });
            assertEqual(eeveeNoGems.length, 7, 'Eevee has 7 item evolution paths');
            assertEqual(eeveeNoGems.every((o) => !o.canUse), true, 'cannot use gem evolution with 0 gems');
            const eeveeWithWater = eevee.getAvailableItemEvolutions({ water_gem: 1 });
            assertEqual(eeveeWithWater.find((o) => o.toId === 134)?.canUse, true, 'Vaporeon usable with water_gem');

            const TEST_KEY = 'starlight_pokemon_test_evo_v1';
            try {
              window.localStorage.removeItem(TEST_KEY);
              const store = new StorageManager(TEST_KEY);
              store.selectTrainer('violet');
              store.chooseStarter(1); // Bulbasaur
              const profile = store.getActiveProfile();
              const starter = profile.team[0];
              starter.level = 10;
              starter.recalculateStats();
              const prevMaxHp = starter.maxHp;

              const lvlEvoRes = store.evolvePokemon(starter.uid, 2);
              assert(Boolean(lvlEvoRes?.evolution), 'evolvePokemon level evolution succeeded');
              assertEqual(starter.speciesId, 2, 'starter evolved into Ivysaur');
              assertGreater(starter.maxHp, prevMaxHp, 'evolved maxHp increased');
              assert(Boolean(profile.pokedex.caught[2]), 'Ivysaur registered in Dex caught');
              assertEqual(profile.stats.evolutions, 1, 'stats.evolutions incremented to 1');

              // Gem evolution on Pikachu
              const pika = createPokemon(25, 8);
              store.recordCaught(pika);
              store.addGem('thunder_gem', 1);
              assertEqual(profile.bag.gems.thunder_gem, 1, 'thunder_gem added');
              const gemEvoRes = store.evolvePokemon(pika.uid, 26, 'thunder_gem');
              assert(Boolean(gemEvoRes?.evolution), 'gem evolution succeeded');
              assertEqual(pika.speciesId, 26, 'Pikachu evolved into Raichu');
              assertEqual(profile.bag.gems.thunder_gem, 0, 'thunder_gem consumed');
              assert(Boolean(profile.pokedex.caught[26]), 'Raichu registered in Dex caught');
              assertEqual(profile.stats.evolutions, 2, 'stats.evolutions incremented to 2');
              assert(Object.keys(pika.movePp).length >= 3, 'Raichu movePp updated');
            } finally {
              window.localStorage.removeItem(TEST_KEY);
            }
          },
        },
      ],
    },
    {
      name: '13. Buff/Shield Mechanics & Starlight Shimmer (Shiny)',
      tests: [
        {
          name: 'Buff/shield moves modify stages, mitigate damage, reset cleanly, and shiny state persists',
          async fn() {
            const attacker = createPokemon(4, 10); // Charmander
            const defender = createPokemon(7, 10); // Squirtle

            const baseAtk = attacker.getEffectiveAtk();
            const buffRes = calculateDamage(attacker, defender, MOVES.focus_roar);
            assertEqual(buffRes.category, 'buff', 'focus_roar returns buff category');
            assertEqual(buffRes.damage, 0, 'buff deals 0 damage');

            attacker.applyStageBoost('atk', 1);
            assertGreater(attacker.getEffectiveAtk(), baseAtk, 'ATK stage +1 raises effective ATK');
            attacker.applyStageBoost('spd', 2);
            assertGreater(attacker.getEffectiveSpd(), attacker.spd, 'SPD stage +2 raises effective SPD');

            const unshieldedHit = calculateDamage(attacker, defender, MOVES.ember, {
              forceHit: true,
              forceCrit: false,
              fixedVariance: 1.0,
            });

            const shieldRes = calculateDamage(defender, attacker, MOVES.shell_shield);
            assertEqual(shieldRes.category, 'shield', 'shell_shield returns shield category');
            assertEqual(shieldRes.grantShield, true, 'shell_shield grants shield');
            assertGreater(shieldRes.heal, 0, 'shell_shield grants small heal');
            defender.shieldTurns = 2;

            const shieldedHit = calculateDamage(attacker, defender, MOVES.ember, {
              forceHit: true,
              forceCrit: false,
              fixedVariance: 1.0,
            });
            assertGreater(unshieldedHit.damage, shieldedHit.damage, 'active shield mitigates incoming attack damage');

            attacker.resetBattleState();
            defender.resetBattleState();
            assertEqual(attacker.battleStages.atk, 0, 'resetBattleState clears atk stage');
            assertEqual(attacker.battleStages.spd, 0, 'resetBattleState clears spd stage');
            assertEqual(attacker.getEffectiveAtk(), baseAtk, 'effective ATK returns to base');
            assertEqual(defender.shieldTurns, 0, 'resetBattleState clears shieldTurns');

            // Starlight Shimmer (Shiny)
            const shiny = rollWildPokemon('forest', 6, { forceShiny: true });
            assertEqual(shiny.isShiny, true, 'forceShiny creates shiny Pokémon');
            const shinyUrls = getSpriteUrls(shiny.speciesId, true, true);
            assert(shinyUrls.static.includes('shiny/'), 'shiny sprite URL includes shiny/');

            const img = document.createElement('img');
            await attachPokemonSprite(img, shiny, { back: false, timeoutMs: 60 });
            assertEqual(img.classList.contains('is-shiny-sprite'), true, 'attachPokemonSprite marks .is-shiny-sprite');

            const roundTrip = Pokemon.fromJSON(shiny.toJSON());
            assertEqual(roundTrip.isShiny, true, 'isShiny survives toJSON/fromJSON');

            const TEST_KEY = 'starlight_pokemon_test_shiny_v1';
            try {
              window.localStorage.removeItem(TEST_KEY);
              const store = new StorageManager(TEST_KEY);
              store.selectTrainer('ozias');
              store.chooseStarter(7);
              store.recordCaught(shiny);
              const reloaded = new StorageManager(TEST_KEY);
              const oz = reloaded.getProfile('ozias');
              assertEqual(oz.stats.shiniesFound, 1, 'shiniesFound persisted');
              assertEqual(oz.team[1].isShiny, true, 'caught shiny Pokemon persists across reload');
            } finally {
              window.localStorage.removeItem(TEST_KEY);
            }
          },
        },
      ],
    },
    {
      name: '14. 14 Biomes, 16 Shrines, NPCs, Quests & Starlight Compass',
      tests: [
        {
          name: '84x72 world map is BFS-reachable to all 14 biomes, 16 shrines, 28 chests, 19 NPCs, landmarks & quests work',
          fn() {
            assertEqual(WORLD_COLS, 84, 'WORLD_COLS === 84');
            assertEqual(WORLD_ROWS, 72, 'WORLD_ROWS === 72');
            assertEqual(WORLD_MAP.length, 72, 'WORLD_MAP has 72 rows');
            for (let y = 0; y < WORLD_ROWS; y++) {
              assertEqual(WORLD_MAP[y].length, 84, `row ${y} width === 84`);
            }

            const reqBiomes = ['village', 'forest', 'cave', 'water', 'volcano', 'peak', 'grove', 'desert', 'marsh', 'sanctum', 'canyon', 'reef', 'ruins', 'rift'];
            for (const bId of reqBiomes) {
              assert(Boolean(BIOMES[bId]), `BIOMES.${bId} exists`);
            }

            const shrineList = Object.entries(SHRINES);
            assertEqual(shrineList.length, 16, '16 shrines exist');
            const chestList = Object.entries(CHESTS);
            assertEqual(chestList.length, 28, '28 chests exist');
            assertEqual(Object.keys(NPCS).length, 19, '19 NPCs exist');
            assertGreater(Object.keys(LANDMARKS).length, 15, '16+ landmarks exist');

            // BFS from spawn (8, 15)
            const visited = new Set([`${GAME_META.spawn.x},${GAME_META.spawn.y}`]);
            const queue = [[GAME_META.spawn.x, GAME_META.spawn.y]];
            assertEqual(isTileWalkableAt(GAME_META.spawn.x, GAME_META.spawn.y), true, 'spawn is walkable');
            for (let head = 0; head < queue.length; head++) {
              const [cx, cy] = queue[head];
              for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
                const nx = cx + dx;
                const ny = cy + dy;
                const key = `${nx},${ny}`;
                if (!visited.has(key) && isTileWalkableAt(nx, ny)) {
                  visited.add(key);
                  queue.push([nx, ny]);
                }
              }
            }

            const hasReachableAdj = (coordKey) => {
              const [x, y] = coordKey.split(',').map(Number);
              return [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => visited.has(`${x + dx},${y + dy}`));
            };

            for (const [coordKey, shrine] of shrineList) {
              const [sx, sy] = coordKey.split(',').map(Number);
              assertEqual(WORLD_MAP[sy][sx], TILE.SHRINE, `shrine ${shrine.id} on TILE.SHRINE`);
              assertEqual(hasReachableAdj(coordKey), true, `shrine ${shrine.id} reachable from spawn`);
            }
            for (const [coordKey, chest] of chestList) {
              const [cx, cy] = coordKey.split(',').map(Number);
              assertEqual(WORLD_MAP[cy][cx], TILE.CHEST, `chest ${chest.id} on TILE.CHEST`);
              assertEqual(hasReachableAdj(coordKey), true, `chest ${chest.id} reachable from spawn`);
            }
            for (const [coordKey, npc] of Object.entries(NPCS)) {
              assertEqual(hasReachableAdj(coordKey), true, `NPC ${npc.id} reachable from spawn`);
            }
            for (const [coordKey, lm] of Object.entries(LANDMARKS)) {
              assertEqual(hasReachableAdj(coordKey), true, `Landmark ${lm.id} reachable from spawn`);
            }

            const TEST_KEY = 'starlight_pokemon_test_world_v1';
            try {
              window.localStorage.removeItem(TEST_KEY);
              const store = new StorageManager(TEST_KEY);
              store.selectTrainer('violet');
              store.chooseStarter(1);
              const profile = store.getActiveProfile();

              const guidance = getCompassGuidance(profile, SPECIES);
              assert(Boolean(guidance && guidance.title && guidance.arrowDir), 'getCompassGuidance returns non-empty guidance');
              const stats = getBiomeDiscoveryStats(profile, 'volcano');
              assertEqual(stats.biomeId, 'volcano', 'getBiomeDiscoveryStats returns volcano stats');

              const quest = FIELD_QUESTS.find((q) => q.id === 'quest_willow_dex') || FIELD_QUESTS[0];
              const qRes = store.completeQuest(quest.id, {
                potions: 2,
                greatBalls: 3,
                gems: { moon_gem: 1 },
              });
              assertEqual(qRes.completed, true, 'completeQuest marks quest completed');
              assert(profile.questsCompleted.includes(quest.id), 'quest recorded in questsCompleted');
              assertEqual(profile.bag.gems.moon_gem, 1, 'quest awarded moon_gem');
              assertEqual(profile.bag.greatBalls, 6, 'quest awarded greatBalls');
              const dup = store.completeQuest(quest.id, { potions: 9 });
              assertEqual(dup.alreadyCompleted, true, 'duplicate completeQuest blocked');

              // Badge unlock via Volcano Shrine
              const shrineBadges = store.markShrineCleared('volcano_shrine');
              assert(shrineBadges.some((b) => b.id === 'magma'), 'Caldera Badge unlocked on volcano_shrine clear');
            } finally {
              window.localStorage.removeItem(TEST_KEY);
            }
          },
        },
      ],
    },
    {
      name: '15. Context-Aware Touch Controls Auto-Hide, Battle Pace & Viewport Non-Overlap',
      tests: [
        {
          name: 'Touch controls auto-hide in battle/modals, #hud-btn-pad toggles, battlePace cycles, and stage has zero overlap',
          async fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            const prevRawSave = window.localStorage.getItem(STORAGE_KEY);
            const wasBootHidden = app.bootScreenEl.hidden;
            const wasStarterHidden = app.starterScreenEl.hidden;
            const wasShellHidden = app.gameShellEl.hidden;
            const wasOverworldActive = app.overworld.active;

            try {
              window.localStorage.removeItem(STORAGE_KEY);
              storage.state = storage.load();
              storage.selectTrainer('violet');
              storage.chooseStarter(1);
              // Give Violet Clefairy (ID 35, tall back-sprite) as lead so we verify Clefairy non-overlap
              const clefairy = createPokemon(35, 8);
              storage.getActiveProfile().team[0] = clefairy;

              app.bootScreenEl.hidden = true;
              app.starterScreenEl.hidden = true;
              app.gameShellEl.hidden = false;
              app.applyTrainerTheme('violet');
              app.applySettings();
              app.overworld.setActive(true);
              app.overworld.syncFromProfile();

              // Verify battlePace cycle via settings button
              assertEqual(storage.getSettings().battlePace, 'cinema', 'initial battlePace is cinema');
              const paceBtn = document.getElementById('setting-pace-btn');
              assert(Boolean(paceBtn), '#setting-pace-btn present');
              paceBtn.click();
              assertEqual(storage.getSettings().battlePace, 'classic', 'pace cycles cinema -> classic');
              paceBtn.click();
              assertEqual(storage.getSettings().battlePace, 'fast', 'pace cycles classic -> fast');
              paceBtn.click();
              assertEqual(storage.getSettings().battlePace, 'cinema', 'pace cycles fast -> cinema');

              // Verify modal-open hides .touch-controls
              const touchControlsEl = document.querySelector('.touch-controls');
              assert(Boolean(touchControlsEl), '.touch-controls element exists');
              app.openPokedex('guide');
              assertEqual(document.body.classList.contains('modal-open'), true, 'body.modal-open set when Pokédex opens');
              assertEqual(window.getComputedStyle(touchControlsEl).display, 'none', '.touch-controls hidden during modal-open');
              app.pokedex.close();
              assertEqual(document.body.classList.contains('modal-open'), false, 'body.modal-open cleared on close');

              // Verify input.clearAll() clears held direction on battle entry
              app.input.pushDirection('right');
              assertEqual(app.input.getDirection(), 'right', 'simulated held direction active before battle');

              const enemy = createPokemon(25, 6);
              const startPromise = app.battle.start({ enemy, biomeId: 'forest' });
              app.syncControlVisibility();

              assertEqual(document.body.classList.contains('in-battle'), true, 'body.in-battle set on battle entry');
              assertEqual(app.input.getDirection(), null, 'input.clearAll() cleared held direction on battle entry');
              assertEqual(window.getComputedStyle(touchControlsEl).display, 'none', '.touch-controls auto-hidden in battle');

              // #hud-btn-pad manually toggles touch controls in battle
              const padBtn = document.getElementById('hud-btn-pad');
              padBtn.click();
              assertEqual(document.body.classList.contains('manual-battle-pad'), true, 'manual-battle-pad toggled on via #hud-btn-pad');
              assert(window.getComputedStyle(touchControlsEl).display !== 'none', '.touch-controls visible when manual-battle-pad active');
              padBtn.click();
              assertEqual(document.body.classList.contains('manual-battle-pad'), false, 'manual-battle-pad toggled off via #hud-btn-pad');
              assertEqual(window.getComputedStyle(touchControlsEl).display, 'none', '.touch-controls hidden again');

              // Wait for sprite setup + battle-stage container-query layout to settle
              const fastTypeTimer = setInterval(() => app.battle.finishTypewriter(), 20);
              try {
                await startPromise;
              } finally {
                clearInterval(fastTypeTimer);
              }
              await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

              const enemyCardRect = document.querySelector('.status-card-enemy').getBoundingClientRect();
              const playerSpriteRect = document.querySelector('.fighter-sprite-player').getBoundingClientRect();
              const playerCardRect = document.querySelector('.status-card-player').getBoundingClientRect();
              const enemySpriteRect = document.querySelector('.fighter-sprite-enemy').getBoundingClientRect();

              assertGreater(enemyCardRect.width, 0, 'status-card-enemy rendered');
              assertGreater(playerSpriteRect.height, 0, 'fighter-sprite-player (Clefairy) rendered');

              const overlaps = (a, b) => !(
                a.right <= b.left ||
                a.left >= b.right ||
                a.bottom <= b.top ||
                a.top >= b.bottom
              );

              assertEqual(
                overlaps(enemyCardRect, playerSpriteRect),
                false,
                `status-card-enemy (${Math.round(enemyCardRect.bottom)}b) must not overlap fighter-sprite-player (${Math.round(playerSpriteRect.top)}t)`,
              );
              assertEqual(
                overlaps(playerCardRect, enemySpriteRect),
                false,
                `status-card-player (${Math.round(playerCardRect.top)}t) must not overlap fighter-sprite-enemy (${Math.round(enemySpriteRect.bottom)}b)`,
              );

              app.battle.stop({ outcome: 'escaped', faintedAll: false });
              assertEqual(document.body.classList.contains('in-battle'), false, 'body.in-battle cleared on battle exit');
            } finally {
              if (app.battle.active) {
                app.battle.stop({ outcome: 'escaped', faintedAll: false });
              }
              app.pokedex.close();
              app.closeSettings();
              if (prevRawSave === null) {
                window.localStorage.removeItem(STORAGE_KEY);
              } else {
                window.localStorage.setItem(STORAGE_KEY, prevRawSave);
              }
              storage.state = storage.load();
              app.manualBattlePad = false;
              app.encounterTransitioning = false;
              app.bootScreenEl.hidden = wasBootHidden;
              app.starterScreenEl.hidden = wasStarterHidden;
              app.gameShellEl.hidden = wasShellHidden;
              app.overworld.setActive(wasOverworldActive);
              if (!wasOverworldActive) {
                app.audio?.stopBGM?.();
              }
              app.applySettings();
              if (!wasBootHidden) {
                app.showBootScreen();
              } else {
                const vSumEl = document.getElementById('summary-violet');
                const oSumEl = document.getElementById('summary-ozias');
                if (vSumEl) vSumEl.textContent = storage.getProfileSummary('violet').label;
                if (oSumEl) oSumEl.textContent = storage.getProfileSummary('ozias').label;
                app.refreshHud();
              }
              if (!wasOverworldActive) {
                app.audio?.stopBGM?.();
              }
              app.syncOverworldPause();
            }
          },
        },
      ],
    },
    {
      name: '16. Pokédex Discovered State & Retroactive Team/Box/Lineage Sync',
      tests: [
        {
          name: 'Hydrates legacy/desynced saves, recovers team/box/starter/non-wild lineages & shrines, and renders accurate PokedexUI & HUD counts',
          fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            const prevRawSave = window.localStorage.getItem(STORAGE_KEY);
            const wasBootHidden = app.bootScreenEl.hidden;
            const wasStarterHidden = app.starterScreenEl.hidden;
            const wasShellHidden = app.gameShellEl.hidden;
            const wasOverworldActive = app.overworld.active;

            try {
              const ivysaur = createPokemon(2, 12, 'starter');
              const raichu = createPokemon(26, 16, 'forest');
              const lapras = createPokemon(131, 10, 'water');
              const eevee = createPokemon(133, 7, 'forest');
              const metapod = createPokemon(11, 7, 'forest');

              const legacyPayload = {
                version: 1,
                activeTrainerId: 'violet',
                profiles: {
                  violet: {
                    trainerId: 'violet',
                    starterId: 1,
                    pos: { x: 8, y: 15, dir: 'down' },
                    team: [ivysaur.toJSON(), raichu.toJSON()],
                    box: [lapras.toJSON(), eevee.toJSON(), metapod.toJSON()],
                    pokedex: {
                      seen: ['16', '999'],
                      caught: {
                        '025': 1,
                        '999': 1,
                        '10': 0,
                      },
                    },
                    shrinesCleared: ['volcano_shrine'],
                    badges: ['magma'],
                    stats: { battlesWon: 5, totalCaught: 0, steps: 88 },
                  },
                },
              };

              window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyPayload));
              const hydratedStore = new StorageManager(STORAGE_KEY);
              const v = hydratedStore.getProfile('violet');

              // Caught retroactive sync: 1 (starter/pre-evo), 2 (team), 25 ("025"/pre-evo), 26 (team), 131 (box), 133 (box), 11 (box)
              for (const expectedCaughtId of [1, 2, 11, 25, 26, 131, 133]) {
                assertEqual(isSpeciesCaught(v, expectedCaughtId), true, `species #${expectedCaughtId} marked caught`);
                assertEqual(isSpeciesSeen(v, expectedCaughtId), true, `caught species #${expectedCaughtId} marked seen`);
                assertGreater(v.pokedex.caught[expectedCaughtId], 0, `pokedex.caught[${expectedCaughtId}] >= 1`);
              }

              // Seen retroactive sync: "16" Pidgey + volcano_shrine Guardian #146 Moltres
              assertEqual(isSpeciesSeen(v, 16), true, 'string seen "16" normalized to Pidgey #16');
              assertEqual(isSpeciesSeen(v, 146), true, 'cleared volcano_shrine marks Moltres #146 seen');
              assertEqual(isSpeciesCaught(v, 16), false, 'Pidgey #16 remains uncaught');
              assertEqual(isSpeciesCaught(v, 146), false, 'Moltres #146 remains uncaught');

              // Invalid & zero-count stripping, and wild-encounter Metapod #11 must NOT mark Caterpie #10
              assertEqual(v.pokedex.caught[999], undefined, 'invalid #999 stripped from caught');
              assertEqual(v.pokedex.caught[10], undefined, 'zero-count #10 stripped from caught');
              assertEqual(v.pokedex.seen.includes(999), false, 'invalid #999 stripped from seen');
              assertEqual(isSpeciesCaught(v, 10), false, 'wild-encounter Metapod #11 does not falsely mark Caterpie #10 caught');
              assertEqual(isSpeciesSeen(v, 10), false, 'wild-encounter Metapod #11 does not falsely mark Caterpie #10 seen');
              assert(v.stats.totalCaught >= 7, `stats.totalCaught repaired (${v.stats.totalCaught} >= 7)`);

              // Pure non-wild lineage recovery check without starterId=1 or "025" in caught
              const lineageProfile = {
                trainerId: 'violet',
                starterId: 4,
                team: [createPokemon(2, 12), createPokemon(26, 16)],
                box: [createPokemon(134, 14), createPokemon(11, 7), createPokemon(148, 16)],
                pokedex: { seen: { '16': true, '999': true, '10': false }, caught: [4] },
                shrinesCleared: [],
                stats: { totalCaught: 0 },
              };
              const lineageRes = syncProfilePokedex(lineageProfile);
              assertEqual(lineageRes.changed, true, 'syncProfilePokedex reports changed on normalization');
              assertEqual(isSpeciesCaught(lineageProfile, 1), true, 'Ivysaur #2 recovers Bulbasaur #1');
              assertEqual(isSpeciesCaught(lineageProfile, 25), true, 'Raichu #26 recovers Pikachu #25');
              assertEqual(isSpeciesCaught(lineageProfile, 133), true, 'Vaporeon #134 recovers Eevee #133');
              assertEqual(isSpeciesCaught(lineageProfile, 10), false, 'Metapod #11 does not recover wild Caterpie #10');
              assertEqual(isSpeciesCaught(lineageProfile, 147), false, 'Dragonair #148 does not recover wild Dratini #147');
              assertEqual(isSpeciesSeen(lineageProfile, 16), true, 'object-map seen {"16": true} normalized');
              assertEqual(isSpeciesSeen(lineageProfile, 999), false, 'invalid #999 stripped from object-map seen');

              // recordSeen invalid guard
              hydratedStore.selectTrainer('violet');
              hydratedStore.recordSeen(999, false);
              assertEqual(v.pokedex.seen.includes(999), false, 'recordSeen ignores invalid species 999');

              // Live PokedexUI & HUD count reconciliation
              storage.state = storage.load();
              storage.selectTrainer('violet');
              app.bootScreenEl.hidden = true;
              app.starterScreenEl.hidden = true;
              app.gameShellEl.hidden = false;
              app.applyTrainerTheme('violet');
              app.refreshHud();

              assert(
                app.hudDexBtn.textContent.includes('Dex 7/649'),
                `HUD Dex pill displays reconciled 7/649, got "${app.hudDexBtn.textContent}"`,
              );

              app.openPokedex('dex');
              const summaryText = document.querySelector('.dex-summary-bar')?.textContent || '';
              assert(summaryText.includes('Caught: 7/649'), `Dex summary shows Caught: 7/649, got "${summaryText}"`);
              assert(summaryText.includes('Seen: 9/649'), `Dex summary shows Seen: 9/649, got "${summaryText}"`);

              const cards = Array.from(document.querySelectorAll('.dex-grid .dex-card'));
              assertEqual(cards.length, 649, '649 Pokédex cards rendered');
              assertEqual(cards.filter((c) => c.classList.contains('is-caught')).length, 7, '7 .is-caught cards rendered');
              assertEqual(cards.filter((c) => c.classList.contains('is-seen')).length, 2, '2 .is-seen cards rendered');
              assertEqual(cards.filter((c) => c.classList.contains('is-unknown')).length, 640, '640 .is-unknown cards rendered');

              const cardById = new Map();
              for (const card of cards) {
                const numText = card.querySelector('.dex-num')?.textContent?.trim() || '';
                const id = Number(numText.replace('#', ''));
                cardById.set(id, card);
              }

              for (const discoveredId of [1, 2, 11, 16, 25, 26, 131, 133, 146]) {
                const card = cardById.get(discoveredId);
                assert(Boolean(card), `card for #${discoveredId} exists`);
                assertEqual(card.classList.contains('is-unknown'), false, `card #${discoveredId} is not .is-unknown`);
                const nameText = card.querySelector('.dex-name')?.textContent?.trim() || '';
                assertEqual(nameText, SPECIES[discoveredId].name, `card #${discoveredId} shows species name`);
                assert(nameText !== '???', `card #${discoveredId} never shows ???`);
                const sprite = card.querySelector('img.dex-sprite');
                assert(Boolean(sprite), `card #${discoveredId} renders img.dex-sprite`);
                assertEqual(sprite.classList.contains('is-silhouette'), false, `card #${discoveredId} sprite is not blacked-out .is-silhouette`);
                if (discoveredId === 16 || discoveredId === 146) {
                  assertEqual(sprite.classList.contains('is-seen-sprite'), true, `seen card #${discoveredId} uses .is-seen-sprite`);
                } else {
                  assertEqual(sprite.classList.contains('is-caught-sprite'), true, `caught card #${discoveredId} uses .is-caught-sprite`);
                }
              }

              // Click seen-only Moltres #146 and verify detail panel
              cardById.get(146).click();
              const detailHeadMoltres = document.querySelector('.dex-detail-head')?.textContent || '';
              const detailSpriteMoltres = document.querySelector('.dex-detail-sprite');
              assert(detailHeadMoltres.includes('Moltres'), `Moltres detail shows species name, got "${detailHeadMoltres}"`);
              assert(!detailHeadMoltres.includes('Undiscovered'), 'Moltres detail never says Undiscovered');
              assert(Boolean(detailSpriteMoltres), 'Moltres detail renders sprite');
              assertEqual(detailSpriteMoltres.classList.contains('is-silhouette'), false, 'Moltres detail sprite is not .is-silhouette');
              assertEqual(detailSpriteMoltres.classList.contains('is-seen-sprite'), true, 'Moltres detail sprite uses .is-seen-sprite');

              // Click undiscovered Caterpie #10 and verify Unknown type pill
              cardById.get(10).click();
              const detailHeadCaterpie = document.querySelector('.dex-detail-head')?.textContent || '';
              assert(detailHeadCaterpie.includes('Undiscovered Pokémon'), `Undiscovered detail shows Undiscovered Pokémon, got "${detailHeadCaterpie}"`);
              assert(detailHeadCaterpie.includes('Unknown'), `Undiscovered detail hides elemental type with Unknown pill, got "${detailHeadCaterpie}"`);

              // Guide tab Dex header matches Pokédex tab
              app.openPokedex('guide');
              const guideText = document.querySelector('.guide-compass-stats')?.textContent || '';
              assert(guideText.includes('Dex: 7/649'), `Guide tab shows matching Dex: 7/649, got "${guideText}"`);
            } finally {
              app.pokedex.close();
              if (prevRawSave === null) {
                window.localStorage.removeItem(STORAGE_KEY);
              } else {
                window.localStorage.setItem(STORAGE_KEY, prevRawSave);
              }
              storage.state = storage.load();
              app.bootScreenEl.hidden = wasBootHidden;
              app.starterScreenEl.hidden = wasStarterHidden;
              app.gameShellEl.hidden = wasShellHidden;
              app.overworld.setActive(wasOverworldActive);
              if (!wasOverworldActive) {
                app.audio?.stopBGM?.();
              }
              if (!wasBootHidden) {
                app.showBootScreen();
              } else {
                app.refreshHud();
              }
              app.syncOverworldPause();
            }
          },
        },
      ],
    },
    {
      name: '17. Overworld Lead Pokémon Follower, Lead Slot Swaps & Biome Transition Persistence',
      tests: [
        {
          name: 'Follower spawns behind trainer, trails steps, ignores wall bumps, swaps on 180-deg turnarounds, tracks lead/slot/evo changes, and persists across biomes',
          fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            const prevRawSave = window.localStorage.getItem(STORAGE_KEY);
            const wasBootHidden = app.bootScreenEl.hidden;
            const wasStarterHidden = app.starterScreenEl.hidden;
            const wasShellHidden = app.gameShellEl.hidden;
            const wasOverworldActive = app.overworld.active;

            try {
              window.localStorage.removeItem(STORAGE_KEY);
              storage.state = storage.load();
              storage.selectTrainer('violet');
              storage.chooseStarter(1); // Bulbasaur Lv.5

              const profile = storage.getActiveProfile();
              const bulba = profile.team[0];
              bulba.level = 10;
              bulba.recalculateStats();

              const shinyPika = createPokemon(25, 8, 'forest', { isShiny: true });
              const lapras = createPokemon(131, 9, 'water');
              storage.recordCaught(shinyPika);
              profile.box.push(lapras);
              storage.save();

              app.dialogueOpen = false;
              app.encounterTransitioning = false;
              app.pokedex.close();
              app.closeSettings();
              if (app.battle.active) app.battle.stop({ outcome: 'escaped', faintedAll: false });

              app.bootScreenEl.hidden = true;
              app.starterScreenEl.hidden = true;
              app.gameShellEl.hidden = false;
              app.applyTrainerTheme('violet');

              profile.pos = { x: 8, y: 15, dir: 'down' };
              app.overworld.followerInitialized = false;
              app.overworld.setActive(true);
              app.overworld.setPaused(false);
              app.refreshHud();

              // 1. Spawns behind trainer facing down -> (8, 14)
              const fStart = app.overworld.getFollowerState();
              assertEqual(fStart.active, true, 'follower active when team[0] exists');
              assertEqual(fStart.speciesId, profile.team[0].speciesId, 'follower speciesId matches team[0]');
              assertEqual(fStart.uid, bulba.uid, 'follower uid matches team[0]');
              assertEqual(fStart.x, 8, 'initial follower X behind down-facing trainer');
              assertEqual(fStart.y, 14, 'initial follower Y behind down-facing trainer');

              // 2. Smoothly trails vacated tile on valid step (8,15) -> (9,15)
              app.overworld.tryStartMove('right');
              assertEqual(app.overworld.moving, true, 'trainer step started right to (9,15)');
              assertEqual(app.overworld.followerMoving, true, 'follower step started into vacated tile');
              app.overworld.update(app.overworld.moveDuration * 0.5, null);
              const fMid = app.overworld.getFollowerState();
              assertEqual(fMid.moving, true, 'follower moving mid-step');
              assertGreater(fMid.renderY, 14, 'follower renderY interpolates smoothly toward 15');
              app.overworld.update(app.overworld.moveDuration, null);
              const fStepped = app.overworld.getFollowerState();
              assertEqual(profile.pos.x, 9, 'trainer arrived at x=9');
              assertEqual(profile.pos.y, 15, 'trainer arrived at y=15');
              assertEqual(fStepped.x, 8, 'follower trailed to vacated x=8');
              assertEqual(fStepped.y, 15, 'follower trailed to vacated y=15');

              // 3. Wall bump does NOT stack follower onto trainer
              profile.pos = { x: 1, y: 15, dir: 'left' };
              app.overworld.followerInitialized = false;
              app.overworld.syncFromProfile();
              assertEqual(app.overworld.getFollowerState().x, 2, 'follower placed at (2,15) behind left-facing trainer');
              assertEqual(isTileWalkableAt(0, 15), false, '(0,15) is solid border tree');
              app.overworld.tryStartMove('left');
              app.overworld.update(0.05, null);
              assertEqual(app.overworld.moving, false, 'wall bump does not move trainer');
              assertEqual(profile.pos.x, 1, 'trainer stays at x=1 on wall bump');
              assertEqual(app.overworld.getFollowerState().x, 2, 'follower does not stack onto trainer on wall bump');
              assertEqual(app.overworld.getFollowerState().y, 15, 'follower remains at y=15 on wall bump');

              // 4. 180-deg turnaround swap in narrow 1-tile corridor (18,15) without blocking isTileWalkable
              assertEqual(isTileWalkableAt(18, 14), false, '(18,14) corridor north wall is solid');
              assertEqual(isTileWalkableAt(18, 16), false, '(18,16) corridor south wall is solid');
              assertEqual(isTileWalkableAt(17, 15), true, '(17,15) corridor west tile is walkable');
              assertEqual(isTileWalkableAt(19, 15), true, '(19,15) corridor east tile is walkable');

              profile.pos = { x: 18, y: 15, dir: 'right' };
              app.overworld.followerInitialized = false;
              app.overworld.syncFromProfile();
              assertEqual(app.overworld.getFollowerState().x, 17, 'follower starts behind at (17,15) in 1-tile corridor');
              assertEqual(app.overworld.isTileWalkable(17, 15), true, 'follower tile never blocks isTileWalkable');

              app.overworld.tryStartMove('left');
              assertEqual(app.overworld.moving, true, '180-deg turnaround step into follower tile succeeds');
              app.overworld.update(app.overworld.moveDuration + 0.05, null);
              const fSwapped = app.overworld.getFollowerState();
              assertEqual(profile.pos.x, 17, 'trainer swapped to (17,15)');
              assertEqual(fSwapped.x, 18, 'follower cleanly swapped to (18,15)');
              assertEqual(fSwapped.y, 15, 'follower stays in corridor y=15');
              assertEqual(fSwapped.dir, 'right', 'follower faces trainer vacated tile direction');

              // 5. Auto-update on setLeadPokemon, swapTeamWithBox(0, 0), and evolvePokemon
              assertEqual(storage.setLeadPokemon(1), true, 'setLeadPokemon(1) moves shiny Pikachu to slot 0');
              app.overworld.update(0.016, null);
              const fLeadSwap = app.overworld.getFollowerState();
              assertEqual(fLeadSwap.speciesId, 25, 'follower auto-updates to Pikachu #25 after setLeadPokemon');
              assertEqual(fLeadSwap.uid, shinyPika.uid, 'follower uid matches shiny Pikachu');
              assertEqual(fLeadSwap.isShiny, true, 'follower isShiny tracks shiny lead');

              assertEqual(storage.swapTeamWithBox(0, 0), true, 'swapTeamWithBox(0, 0) swaps Lapras into slot 0');
              app.overworld.update(0.016, null);
              const fBoxSwap = app.overworld.getFollowerState();
              assertEqual(fBoxSwap.speciesId, 131, 'follower auto-updates to Lapras #131 after box swap');
              assertEqual(fBoxSwap.uid, lapras.uid, 'follower uid matches Lapras');
              assertEqual(fBoxSwap.isShiny, false, 'follower isShiny resets to false for non-shiny Lapras');

              assertEqual(storage.setLeadPokemon(1), true, 'return Bulbasaur Lv.10 to slot 0');
              const evoRes = storage.evolvePokemon(bulba.uid, 2);
              assert(Boolean(evoRes?.evolution), 'Bulbasaur evolved to Ivysaur #2');
              app.refreshHud();
              const fEvolved = app.overworld.getFollowerState();
              assertEqual(fEvolved.speciesId, 2, 'follower updates to Ivysaur #2 after evolution + refreshHud/syncFollower');
              assertEqual(fEvolved.uid, bulba.uid, 'follower uid remains Bulbasaur/Ivysaur uid');

              // Render pass runs cleanly with follower active
              app.overworld.render(performance.now());

              // 6. Seamless biome transitions (village -> forest, village -> cave, village -> water) & post-battle syncFromProfile preservation
              const checkBiomeStep = (startPos, stepDir, fromBiome, toBiome, expectedTrainer, expectedFollower) => {
                profile.pos = { ...startPos };
                app.overworld.followerInitialized = false;
                app.overworld.syncFromProfile();
                assertEqual(getBiomeAt(profile.pos.x, profile.pos.y).id, fromBiome, `starts in ${fromBiome}`);
                assertEqual(app.overworld.getFollowerState().biomeId, fromBiome, `follower starts in ${fromBiome}`);
                app.overworld.tryStartMove(stepDir);
                assertEqual(app.overworld.moving, true, `step ${stepDir} started across ${fromBiome} -> ${toBiome}`);
                app.overworld.update(app.overworld.moveDuration + 0.05, null);
                const state = app.overworld.getFollowerState();
                assertEqual(profile.pos.x, expectedTrainer.x, `${fromBiome}->${toBiome} trainer X`);
                assertEqual(profile.pos.y, expectedTrainer.y, `${fromBiome}->${toBiome} trainer Y`);
                assertEqual(state.biomeId, toBiome, `follower biomeId transitioned to ${toBiome}`);
                assertEqual(state.speciesId, 2, `follower speciesId persisted across ${fromBiome} -> ${toBiome}`);
                assertEqual(state.x, expectedFollower.x, `${fromBiome}->${toBiome} follower X`);
                assertEqual(state.y, expectedFollower.y, `${fromBiome}->${toBiome} follower Y`);
              };

              checkBiomeStep({ x: 6, y: 10, dir: 'up' }, 'up', 'village', 'forest', { x: 6, y: 9 }, { x: 6, y: 10 });
              checkBiomeStep({ x: 19, y: 15, dir: 'right' }, 'right', 'village', 'cave', { x: 20, y: 15 }, { x: 19, y: 15 });
              checkBiomeStep({ x: 8, y: 17, dir: 'down' }, 'down', 'village', 'water', { x: 8, y: 18 }, { x: 8, y: 17 });

              // Turn right & step to (9, 18) so follower is to trainer's left at (8, 18), then face down and call syncFromProfile()
              app.overworld.tryStartMove('right');
              app.overworld.update(app.overworld.moveDuration + 0.05, null);
              profile.pos.dir = 'down';
              app.overworld.syncFromProfile();
              const postBattleState = app.overworld.getFollowerState();
              assertEqual(postBattleState.x, 8, 'post-battle syncFromProfile preserves adjacent follower X at (8,18)');
              assertEqual(postBattleState.y, 18, 'post-battle syncFromProfile preserves adjacent follower Y at (8,18)');
              assertEqual(postBattleState.biomeId, 'water', 'post-battle follower preserves water biome');
            } finally {
              if (app.battle.active) {
                app.battle.stop({ outcome: 'escaped', faintedAll: false });
              }
              app.pokedex.close();
              app.closeSettings();
              if (prevRawSave === null) {
                window.localStorage.removeItem(STORAGE_KEY);
              } else {
                window.localStorage.setItem(STORAGE_KEY, prevRawSave);
              }
              storage.state = storage.load();
              app.dialogueOpen = false;
              app.encounterTransitioning = false;
              app.bootScreenEl.hidden = wasBootHidden;
              app.starterScreenEl.hidden = wasStarterHidden;
              app.gameShellEl.hidden = wasShellHidden;
              app.overworld.followerInitialized = false;
              app.overworld.setActive(wasOverworldActive);
              if (!wasOverworldActive) {
                app.audio?.stopBGM?.();
              }
              if (!wasBootHidden) {
                app.showBootScreen();
              } else {
                app.refreshHud();
              }
              app.syncOverworldPause();
            }
          },
        },
      ],
    },
    {
      name: '18. Expanded Roster, 24 Badges, 16 Shrines, 28 Chests, 19 Quests, 13 Rivals & Safe Relocation',
      tests: [
        {
          name: '649 species, 10 Sprint-3 + 8 Sprint-4 moves, 12 gems, 24 badges, 16 shrines, 28 chests, 19 quests, 13 rivals & BFS/sanitizePosition hold',
          fn() {
            assertEqual(Object.keys(SPECIES).length, 649, '649 species total');
            const newIds = [18, 39, 40, 45, 62, 65, 76, 94, 116, 117, 143, 145, 151, 179, 180, 181, 196, 230, 470, 471];
            for (const id of newIds) {
              assert(Boolean(SPECIES[id]), `new species #${id} exists`);
              assert(id <= 471, `species #${id} <= 471`);
            }

            const newMoves = [
              'sky_wing', 'star_melody', 'hyper_nova', 'petal_blizzard', 'cosmos_mind',
              'meteor_slam', 'phantom_claw', 'thunder_tempest', 'aurora_flare', 'cotton_guard',
            ];
            for (const mv of newMoves) {
              assert(Boolean(MOVES[mv]), `new move ${mv} exists`);
            }
            for (const sp of Object.values(SPECIES)) {
              assert(Boolean(TYPES[sp.type]), `species #${sp.id} valid type`);
              for (const mv of sp.movePool) {
                assert(Boolean(MOVES[mv]), `species #${sp.id} move ${mv} exists`);
              }
            }

            assertEqual(Object.keys(EVOLUTION_ITEMS).length, 12, '12 evolution gems exist');
            assert(Boolean(EVOLUTION_ITEMS.leaf_gem && EVOLUTION_ITEMS.ice_gem), 'leaf_gem and ice_gem present');
            assertEqual(EVOLUTIONS[133].length, 7, '7 Eeveelutions defined');

            assertEqual(BADGES.length, 24, '24 badges defined');
            const tempest = BADGES.find((b) => b.id === 'tempest');
            const celestial = BADGES.find((b) => b.id === 'celestial');
            assert(Boolean(tempest && celestial), 'tempest and celestial badges exist');
            assertEqual(tempest.check({ shrinesCleared: ['thunder_shrine'], pokedex: { caught: {} } }), true, 'tempest unlocks on thunder_shrine');
            assertEqual(tempest.check({ shrinesCleared: [], pokedex: { caught: { 25: 1, 179: 1, 180: 1 } } }), true, 'tempest unlocks on 3 Electric species');
            assertEqual(celestial.check({ shrinesCleared: ['starlight_shrine'], pokedex: { caught: {} } }), true, 'celestial unlocks on starlight_shrine');
            const caught25 = Object.fromEntries(Object.keys(SPECIES).slice(0, 25).map((id) => [id, 1]));
            assertEqual(celestial.check({ shrinesCleared: [], pokedex: { caught: caught25 } }), true, 'celestial unlocks on 25 caught species');

            assertEqual(Object.keys(SHRINES).length, 16, '16 shrines defined');
            assertEqual(Object.values(SHRINES).some((s) => s.id === 'thunder_shrine' && s.guardianId === 145), true, 'thunder_shrine guardian Zapdos #145');
            assertEqual(Object.values(SHRINES).some((s) => s.id === 'starlight_shrine' && s.guardianId === 151), true, 'starlight_shrine guardian Mew #151');
            assertEqual(Object.keys(CHESTS).length, 28, '28 chests defined');
            assertEqual(Object.keys(NPCS).length, 19, '19 NPCs defined');
            assertEqual(FIELD_QUESTS.length, 19, '19 quests defined');
            assertEqual(FIELD_QUESTS.some((q) => q.id === 'quest_celeste_style'), true, 'quest_celeste_style exists');
            assertEqual(FIELD_QUESTS.some((q) => q.id === 'quest_yuki_peak'), true, 'quest_yuki_peak exists');
            assertEqual(Object.keys(RIVAL_TRAINERS).length, 13, '13 RIVAL_TRAINERS defined');

            // No evolved forms in wild encounters (preserves Suite 16 lineage rules)
            const forbiddenWild = new Set([2, 26, 134, 135, 136, 157, 182, 186, 196, 197, 208, 254, 282, 334, 350, 365, 373, 405, 448, 467, 468, 470, 471, 475, 478]);
            for (const [bId, biome] of Object.entries(BIOMES)) {
              for (const enc of biome.encounters || []) {
                assert(!forbiddenWild.has(enc.id), `forbidden evolved wild #${enc.id} in ${bId}`);
              }
            }

            // Full BFS from spawn (8,15) to every Shrine, Chest, NPC, Rival, and Landmark
            const visited = new Set([`${GAME_META.spawn.x},${GAME_META.spawn.y}`]);
            const queue = [[GAME_META.spawn.x, GAME_META.spawn.y]];
            for (let head = 0; head < queue.length; head++) {
              const [cx, cy] = queue[head];
              for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
                const nx = cx + dx;
                const ny = cy + dy;
                const k = `${nx},${ny}`;
                if (!visited.has(k) && isTileWalkableAt(nx, ny)) {
                  visited.add(k);
                  queue.push([nx, ny]);
                }
              }
            }
            const hasReachableAdj = (coordKey) => {
              const [x, y] = coordKey.split(',').map(Number);
              return [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => visited.has(`${x + dx},${y + dy}`));
            };

            for (const [k, s] of Object.entries(SHRINES)) {
              assertEqual(hasReachableAdj(k), true, `shrine ${s.id} reachable`);
            }
            for (const [k, c] of Object.entries(CHESTS)) {
              assertEqual(hasReachableAdj(k), true, `chest ${c.id} reachable`);
            }
            for (const [k, n] of Object.entries(NPCS)) {
              assertEqual(isTileWalkableAt(...k.split(',').map(Number)), false, `NPC ${n.id} blocks tile`);
              assertEqual(hasReachableAdj(k), true, `NPC ${n.id} reachable`);
            }
            for (const [k, r] of Object.entries(RIVAL_TRAINERS)) {
              assertEqual(isTileWalkableAt(...k.split(',').map(Number)), false, `Rival ${r.id} blocks tile`);
              assertEqual(hasReachableAdj(k), true, `Rival ${r.id} reachable`);
            }
            for (const [k, l] of Object.entries(LANDMARKS)) {
              assertEqual(isTileWalkableAt(...k.split(',').map(Number)), false, `Landmark ${l.id} blocks tile`);
              assertEqual(hasReachableAdj(k), true, `Landmark ${l.id} reachable`);
            }

            // sanitizePosition relocates off NPC, Rival & Landmark tiles
            const npcCoord = Object.keys(NPCS)[0].split(',').map(Number);
            const rivalCoord = Object.keys(RIVAL_TRAINERS)[0].split(',').map(Number);
            const lmCoord = Object.keys(LANDMARKS)[0].split(',').map(Number);
            for (const [label, [x, y]] of [['NPC', npcCoord], ['Rival', rivalCoord], ['Landmark', lmCoord]]) {
              const safe = sanitizePosition({ x, y, dir: 'down' });
              assertEqual(isTileWalkableAt(safe.x, safe.y), true, `sanitizePosition relocates off ${label} (${x},${y}) to walkable (${safe.x},${safe.y})`);
            }
          },
        },
      ],
    },
    {
      name: '19. Trainer Style Studio, Nicknames, Bond & Star Ball Save Migration',
      tests: [
        {
          name: 'TRAINER_STYLES, TRAINER_ACCESSORIES, resolveTrainerLook, nicknames, bond crit boost & starBalls save/migration hold',
          fn() {
            assertEqual(Object.keys(TRAINER_STYLES).length, 10, '10 TRAINER_STYLES defined');
            assertEqual(Object.keys(TRAINER_ACCESSORIES).length, 8, '8 TRAINER_ACCESSORIES defined');

            for (const tid of ['violet', 'ozias']) {
              const base = TRAINERS[tid];
              const resolvedNull = resolveTrainerLook(tid, null);
              const resolvedDefault = resolveTrainerLook(tid, { styleId: 'default', accessory: 'cap', cape: false });
              for (const k of ['outfitPrimary', 'outfitSecondary', 'accent', 'accentDark', 'accentSoft', 'hair', 'skin']) {
                assertEqual(resolvedNull[k], base[k], `${tid} null look preserves ${k}`);
                assertEqual(resolvedDefault[k], base[k], `${tid} default look preserves ${k}`);
              }
            }
            const customLook = resolveTrainerLook('violet', { styleId: 'royal', accessory: 'crown', cape: true });
            assertEqual(customLook.outfitPrimary, TRAINER_STYLES.royal.outfitPrimary, 'royal palette applied');
            assertEqual(customLook.accessory, 'crown', 'crown accessory applied');
            assertEqual(customLook.cape, true, 'cape boolean applied');

            // Nickname & Bond on Pokemon + calculateDamage crit boost without overriding forceCrit
            const mon = createPokemon(25, 16, 'forest', { nickname: '  StarBuddy123456789  ', bond: 20 });
            assertEqual(mon.nickname, 'StarBuddy12345', 'nickname trimmed and capped at 14 chars');
            assertEqual(mon.name, 'Pikachu', 'mon.name preserves species name');
            assertEqual(mon.displayName, 'StarBuddy12345', 'mon.displayName returns nickname');
            assertEqual(mon.bond, 20, 'bond defaults to 20');
            assertEqual(mon.gainBond(45), 65, 'gainBond adds cleanly');
            assertEqual(mon.gainBond(99), 100, 'gainBond clamps at 100');
            assertEqual(mon.gainBond(-200), 0, 'gainBond clamps at 0');
            mon.gainBond(75);
            mon.evolve(26);
            assertEqual(mon.nickname, 'StarBuddy12345', 'nickname preserved on evolve');
            assertEqual(mon.bond, 75, 'bond preserved on evolve');
            const roundTrip = Pokemon.fromJSON(mon.toJSON());
            assertEqual(roundTrip.displayName, 'StarBuddy12345', 'nickname preserved across JSON');
            assertEqual(roundTrip.bond, 75, 'bond preserved across JSON');

            const target = createPokemon(10, 10);
            assertEqual(calculateDamage(mon, target, MOVES.tackle, { forceHit: true, forceCrit: false, fixedVariance: 1 }).isCrit, false, 'forceCrit:false never overridden by high bond');
            assertEqual(calculateDamage(mon, target, MOVES.tackle, { forceHit: true, forceCrit: true, fixedVariance: 1 }).isCrit, true, 'forceCrit:true preserved');

            const lowBondMon = createPokemon(25, 10, 'forest', { bond: 20 });
            const origRandom = Math.random;
            try {
              Math.random = () => 0.1; // between 0.08 and 0.12
              const lowRes = calculateDamage(lowBondMon, target, MOVES.tackle, { forceHit: true, fixedVariance: 1 });
              const highRes = calculateDamage(mon, target, MOVES.tackle, { forceHit: true, fixedVariance: 1 });
              assertEqual(lowRes.isCrit, false, 'bond 20 stays at 8% crit rate (0.10 not crit)');
              assertEqual(highRes.isCrit, true, 'bond >= 60 boosts crit rate to 12% (0.10 is crit)');
            } finally {
              Math.random = origRandom;
            }

            // Storage appearance, nickname, fresh starBalls & v1 migration
            const TEST_KEY = 'starlight_pokemon_test_s19_v1';
            try {
              window.localStorage.removeItem(TEST_KEY);
              const store = new StorageManager(TEST_KEY);
              store.selectTrainer('violet');
              store.chooseStarter(1);
              const vp = store.getActiveProfile();
              assertEqual(vp.bag.starBalls, 1, 'fresh profile starts with 1 starBall');
              store.updateAppearance({ styleId: 'aurora', accessory: 'wizard', cape: true });
              store.setPokemonNickname(vp.team[0].uid, '  Sprout  ');
              store.addRewards({ starBalls: 2 });
              assertEqual(vp.bag.starBalls, 3, 'addRewards adds starBalls');
              assertEqual(store.useItem('starBalls'), true, 'useItem consumes starBall');

              const reloaded = new StorageManager(TEST_KEY);
              const rv = reloaded.getProfile('violet');
              assertEqual(rv.appearance.styleId, 'aurora', 'appearance.styleId persisted');
              assertEqual(rv.appearance.accessory, 'wizard', 'appearance.accessory persisted');
              assertEqual(rv.appearance.cape, true, 'appearance.cape persisted');
              assertEqual(rv.team[0].displayName, 'Sprout', 'nickname persisted');
              assertEqual(rv.bag.starBalls, 2, 'starBalls count persisted');

              // Clear nickname resets to null
              reloaded.setPokemonNickname(rv.team[0].uid, '   ');
              assertEqual(rv.team[0].nickname, null, 'empty nickname clears to null');
              assertEqual(rv.team[0].displayName, 'Bulbasaur', 'displayName reverts to species name');

              // Legacy v1 save without starBalls migrates cleanly with starBalls: 0 and version: 2
              window.localStorage.setItem(TEST_KEY, JSON.stringify({
                version: 1,
                activeTrainerId: 'ozias',
                profiles: {
                  ozias: {
                    trainerId: 'ozias',
                    starterId: 4,
                    pos: { x: 8, y: 15, dir: 'down' },
                    team: [createPokemon(4, 5).toJSON()],
                    bag: { potions: 5, greatBalls: 3 },
                  },
                },
              }));
              const migrated = new StorageManager(TEST_KEY);
              assertEqual(migrated.state.version, 2, 'migrated save version === 2');
              assertEqual(migrated.getProfile('ozias').bag.starBalls, 0, 'v1 save without starBalls hydrates 0');
            } finally {
              window.localStorage.removeItem(TEST_KEY);
            }
          },
        },
      ],
    },
    {
      name: '20. Multi-Pokemon Rival Battle, Star Ball, 2x2 Move Cursor & Fountain PP',
      tests: [
        {
          name: 'Rival multi-mon send-out, ball block, Star Ball 2.0x, 2x2 cursor + Digit1-4, auto-skip 0-PP & fountain PP work',
          async fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            const prevRawSave = window.localStorage.getItem(STORAGE_KEY);
            const wasBootHidden = app.bootScreenEl.hidden;
            const wasStarterHidden = app.starterScreenEl.hidden;
            const wasShellHidden = app.gameShellEl.hidden;
            const wasOverworldActive = app.overworld.active;

            const TEST_KEY = 'starlight_pokemon_test_s20_v1';
            const noopAudio = {
              playMenuBlip() {},
              playCursorMove() {},
              playMoveSelect() {},
              playPhysicalImpact() {},
              playElemental() {},
              playFaint() {},
              playHealChime() {},
              playLevelUp() {},
              playPokeballThrow() {},
              playPokeballAbsorb() {},
              playPokeballBounce() {},
              playPokeballWobble() {},
              playCaptureSuccess() {},
              playStarBallShimmer() {},
              playXpTick() {},
            };

            const waitUntil = async (engine, pred, timeoutMs = 4500) => {
              const start = performance.now();
              while (!pred()) {
                if (engine.typingResolve) engine.finishTypewriter();
                if (performance.now() - start > timeoutMs) {
                  throw new Error(`Timed out waiting (state=${engine.state}, busy=${engine.busy})`);
                }
                await new Promise((r) => setTimeout(r, 15));
              }
            };

            let rivalEngine = null;
            let starEngine = null;
            const unsubs = [];

            try {
              // 1. Multi-Pokemon Rival Battle & markRivalDefeated
              window.localStorage.removeItem(TEST_KEY);
              const store = new StorageManager(TEST_KEY);
              store.updateSettings({ battlePace: 'fast' });
              store.selectTrainer('violet');
              store.chooseStarter(4); // Charmander
              const vp = store.getActiveProfile();
              const ace = createPokemon(25, 22, 'forest'); // Lv.22 Pikachu
              vp.team[0] = ace;

              const rivalMeta = Object.values(RIVAL_TRAINERS)[0];
              const enemyParty = [createPokemon(10, 1), createPokemon(16, 1)];
              let battleResult = null;
              rivalEngine = new BattleEngine({
                storage: store,
                audio: noopAudio,
                onBattleEnd: (res) => { battleResult = res; },
                onBadgesUnlocked() {},
                onHudRefresh() {},
              });

              const rivalStart = rivalEngine.start({
                enemy: enemyParty[0],
                enemyParty,
                biomeId: rivalMeta.biome,
                isTrainer: true,
                trainerData: rivalMeta,
              });
              await waitUntil(rivalEngine, () => rivalEngine.state === BATTLE_STATES.PLAYER_INPUT);
              await rivalStart;

              const pipsEl = document.getElementById('enemy-party-pips');
              assert(Boolean(pipsEl) && !pipsEl.hidden, 'enemy-party-pips visible in multi-mon rival battle');
              assertEqual(pipsEl.querySelectorAll('.enemy-party-pip').length, 2, '2 enemy party pips rendered');

              // Ball throw blocked in trainer battle without consuming starBalls
              const starBefore = vp.bag.starBalls;
              const ballPromise = rivalEngine.handleThrowBall('star');
              await waitUntil(rivalEngine, () => rivalEngine.state === BATTLE_STATES.PLAYER_INPUT && !rivalEngine.busy);
              await ballPromise;
              assertEqual(vp.bag.starBalls, starBefore, 'trainer battle rejects Star Ball without consuming');

              // 2x2 Move Cursor + Auto-skip 0-PP
              const moves = ace.getMoveObjects();
              ace.movePp[moves[0].id] = 0;
              rivalEngine.selectedMoveIndex = 0;
              rivalEngine.renderMoveButtons();
              assertEqual(rivalEngine.selectedMoveIndex, 1, 'renderMoveButtons auto-skips depleted PP move 0 -> 1');

              ace.movePp[moves[0].id] = moves[0].pp;
              rivalEngine.selectedMoveIndex = 0;
              rivalEngine.renderMoveButtons();
              assertEqual(rivalEngine.moveSelectionCursor('right'), true, 'cursor moves 0 -> 1');
              assertEqual(rivalEngine.selectedMoveIndex, 1, 'selectedMoveIndex === 1');
              assertEqual(rivalEngine.moveSelectionCursor('down'), true, 'cursor moves 1 -> 3');
              assertEqual(rivalEngine.selectedMoveIndex, 3, 'selectedMoveIndex === 3');
              assertEqual(rivalEngine.moveSelectionCursor('left'), true, 'cursor moves 3 -> 2');
              assertEqual(rivalEngine.selectedMoveIndex, 2, 'selectedMoveIndex === 2');
              assertEqual(rivalEngine.moveSelectionCursor('up'), true, 'cursor moves 2 -> 0');
              assertEqual(rivalEngine.selectedMoveIndex, 0, 'selectedMoveIndex === 0');

              // Defeat rival mon #1 -> mid-battle send-out of mon #2
              const origRand = Math.random;
              try {
                Math.random = () => 0.99; // prevent miss
                rivalEngine.selectMoveBySlot(0);
                await waitUntil(rivalEngine, () => rivalEngine.enemyPartyIndex === 1 && rivalEngine.state === BATTLE_STATES.PLAYER_INPUT, 6000);
                assertEqual(rivalEngine.active, true, 'battle continues for rival mon #2');
                assertEqual(rivalEngine.enemy.speciesId, 16, 'rival sent out second Pokemon #16');

                // Defeat rival mon #2 -> battle ends won with trainerData
                rivalEngine.selectMoveBySlot(0);
                await waitUntil(rivalEngine, () => !rivalEngine.active, 6000);
              } finally {
                Math.random = origRand;
              }
              assertEqual(battleResult?.outcome, 'won', 'rival battle ended with won');
              assertEqual(battleResult?.isTrainer, true, 'result marks isTrainer: true');
              assertEqual(battleResult?.trainerData?.id, rivalMeta.id, 'result includes trainerData');

              const win1 = store.markRivalDefeated(rivalMeta.id, rivalMeta.rewards);
              assertEqual(win1.firstWin, true, 'first rival defeat records firstWin: true');
              assert(vp.rivalsDefeated.includes(rivalMeta.id), 'rivalId saved in rivalsDefeated');
              const win2 = store.markRivalDefeated(rivalMeta.id, rivalMeta.rematchRewards);
              assertEqual(win2.firstWin, false, 'rematch returns firstWin: false');

              // 2. Star Ball 2.0x catch chance & #battle-btn-star consumption
              const wildTarget = createPokemon(25, 6);
              const cPoke = calculateCatchAttempt(wildTarget, 1.0);
              const cGreat = calculateCatchAttempt(wildTarget, 1.45);
              const cStar = calculateCatchAttempt(wildTarget, 2.0);
              assertGreater(cStar.chance, cGreat.chance, 'Star Ball (2.0x) > Great Ball (1.45x)');
              assertGreater(cGreat.chance, cPoke.chance, 'Great Ball (1.45x) > Poke Ball (1.0x)');

              store.healTeam(true);
              vp.bag.starBalls = 1;
              starEngine = new BattleEngine({
                storage: store,
                audio: noopAudio,
                onBattleEnd() {},
                onBadgesUnlocked() {},
                onHudRefresh() {},
              });
              const starStart = starEngine.start({ enemy: createPokemon(10, 3), biomeId: 'forest' });
              await waitUntil(starEngine, () => starEngine.state === BATTLE_STATES.PLAYER_INPUT);
              await starStart;

              const btnStar = document.getElementById('battle-btn-star');
              assert(Boolean(btnStar), '#battle-btn-star exists');
              assert(btnStar.textContent.includes('Star Ball (1)'), '#battle-btn-star displays count');
              assertEqual(btnStar.disabled, false, '#battle-btn-star enabled with 1 ball');

              try {
                Math.random = () => 0.0; // guarantee capture
                btnStar.click();
                await waitUntil(starEngine, () => !starEngine.active, 6000);
              } finally {
                Math.random = origRand;
              }
              assertEqual(vp.bag.starBalls, 0, 'Star Ball consumed on throw');
              starEngine.renderActionButtons();
              assertEqual(btnStar.disabled, true, '#battle-btn-star disables when 0 remain');
              starEngine.destroy();
              starEngine = null;

              // 3. InputController Digit1-4 & Arrow navigation + input-focus guard + Fountain PP check
              window.localStorage.removeItem(STORAGE_KEY);
              storage.state = storage.load();
              storage.selectTrainer('violet');
              storage.chooseStarter(1);
              app.bootScreenEl.hidden = true;
              app.starterScreenEl.hidden = true;
              app.gameShellEl.hidden = false;

              const navEvents = [];
              const slotEvents = [];
              unsubs.push(app.input.on('navigate', (d) => navEvents.push(d)));
              unsubs.push(app.input.on('moveSlot', (s) => slotEvents.push(s)));

              window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', key: 'ArrowRight', bubbles: true }));
              window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight', key: 'ArrowRight', bubbles: true }));
              window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit3', key: '3', bubbles: true }));
              assertEqual(navEvents.includes('right'), true, 'ArrowRight emits navigate("right")');
              assertEqual(slotEvents.includes(2), true, 'Digit3 emits moveSlot(2)');

              const tempInput = document.createElement('input');
              document.body.appendChild(tempInput);
              try {
                const countBefore = slotEvents.length;
                tempInput.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1', key: '1', bubbles: true }));
                assertEqual(slotEvents.length, countBefore, 'Digit1 inside <input> does not trigger moveSlot');
              } finally {
                tempInput.remove();
              }

              // Healing Fountain PP check when HP is full and potions >= 5
              const liveProfile = storage.getActiveProfile();
              const leadMon = liveProfile.team[0];
              leadMon.hp = leadMon.maxHp;
              liveProfile.bag.potions = 5;
              const firstMove = leadMon.getMoveObjects()[0];
              leadMon.movePp[firstMove.id] = 0;
              app.dialogueOpen = false;
              app.handleHealSpot(false);
              assertEqual(leadMon.getMovePp(firstMove.id).current, leadMon.getMovePp(firstMove.id).max, 'Healing Fountain restores depleted PP even at full HP');
              assertEqual(app.dialogueOpen, true, 'Healing Fountain opens confirmation dialogue');
              app.closeDialogue();
            } finally {
              unsubs.forEach((fn) => fn());
              rivalEngine?.destroy();
              starEngine?.destroy();
              window.localStorage.removeItem(TEST_KEY);
              app.closeDialogue();
              if (prevRawSave === null) {
                window.localStorage.removeItem(STORAGE_KEY);
              } else {
                window.localStorage.setItem(STORAGE_KEY, prevRawSave);
              }
              storage.state = storage.load();
              app.bootScreenEl.hidden = wasBootHidden;
              app.starterScreenEl.hidden = wasStarterHidden;
              app.gameShellEl.hidden = wasShellHidden;
              app.overworld.setActive(wasOverworldActive);
              if (!wasOverworldActive) {
                app.audio?.stopBGM?.();
              }
              if (!wasBootHidden) {
                app.showBootScreen();
              } else {
                app.refreshHud();
              }
              app.syncOverworldPause();
            }
          },
        },
      ],
    },
    {
      name: '21. Pokedex Filters (649 Cards), Style Studio, Box Evo, Audio & Battle Layout',
      tests: [
        {
          name: 'Dex defaults to 649 cards, Style Studio updates live preview & theme, Box evolves, THEMES.rival works & battle stage has zero overlap',
          async fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            // Audio checks
            assert(Boolean(THEMES.rival), 'THEMES.rival exists');
            assertInRange(THEMES.rival.leadGain, 0, 0.12, 'rival.leadGain <= 0.12');
            assertInRange(THEMES.rival.arpGain, 0, 0.12, 'rival.arpGain <= 0.12');
            assertInRange(THEMES.rival.bassGain, 0, 0.12, 'rival.bassGain <= 0.12');
            assert(THEMES.rival.melody.length >= 64, 'rival melody >= 64 steps');
            const testAudio = new AudioEngine({ silent: true, attachUnlockListeners: false });
            try {
              testAudio.ensureContext();
              await Promise.race([testAudio.unlock(), new Promise((r) => setTimeout(r, 200))]);
              testAudio.playXpTick(0.6);
              testAudio.playStarBallShimmer();
              testAudio.playBGM('rival');
              testAudio.stopBGM();
            } finally {
              await testAudio.destroy();
            }

            const prevRawSave = window.localStorage.getItem(STORAGE_KEY);
            const wasBootHidden = app.bootScreenEl.hidden;
            const wasStarterHidden = app.starterScreenEl.hidden;
            const wasShellHidden = app.gameShellEl.hidden;
            const wasOverworldActive = app.overworld.active;

            try {
              window.localStorage.removeItem(STORAGE_KEY);
              storage.state = storage.load();
              storage.selectTrainer('violet');
              storage.chooseStarter(1); // Bulbasaur
              const profile = storage.getActiveProfile();
              // Clefairy (tall back-sprite) as lead for non-overlap verification
              profile.team[0] = createPokemon(35, 8);
              // Evolve-ready Bulbasaur Lv.10 in Reserve Box
              const boxBulba = createPokemon(1, 10, 'starter');
              profile.box.push(boxBulba);
              storage.save();

              app.bootScreenEl.hidden = true;
              app.starterScreenEl.hidden = true;
              app.gameShellEl.hidden = false;
              app.applyTrainerTheme('violet', profile.appearance);
              app.applySettings();
              app.overworld.setActive(true);
              app.overworld.syncFromProfile();

              // 1. Pokédex default 'all' filter (649 cards) + filter pills + reset on reopen
              app.openPokedex('dex');
              assertEqual(document.querySelectorAll('.dex-grid .dex-card').length, 649, 'Dex opens with 649 cards on default "all" filter');
              const peakPill = document.querySelector('.dex-filter-pill[data-filter="peak"]');
              assert(Boolean(peakPill), 'Peak filter pill rendered');
              peakPill.click();
              const peakCount = document.querySelectorAll('.dex-grid .dex-card').length;
              assert(peakCount > 0 && peakCount < 649, `Peak filter narrows cards (${peakCount})`);
              app.openPokedex('dex');
              assertEqual(document.querySelectorAll('.dex-grid .dex-card').length, 649, 'Reopening Dex resets filter to all (649 cards)');

              // 2. Style Studio tab + #hud-portrait click + live preview + theme update
              app.pokedex.close();
              document.getElementById('hud-portrait').click();
              assertEqual(app.pokedex.isOpen(), true, 'Clicking #hud-portrait opens Pokédex modal');
              assertEqual(app.pokedex.activeTab, 'trainer', 'Clicking #hud-portrait opens trainer Style tab');
              const studioPreview = document.getElementById('trainer-studio-preview');
              assert(Boolean(studioPreview) && studioPreview.width === 112 && studioPreview.height === 112, '112x112 Style Studio canvas mounted');
              assertEqual(document.querySelectorAll('.style-chip').length, 10, '10 outfit style chips rendered');
              assertEqual(document.querySelectorAll('.accessory-chip').length, 8, '8 accessory chips rendered');

              document.querySelector('.style-chip[data-style-id="royal"]').click();
              document.querySelector('.accessory-chip[data-accessory-id="crown"]').click();
              document.getElementById('trainer-cape-toggle').click();
              assertEqual(profile.appearance.styleId, 'royal', 'Style chip updates appearance.styleId');
              assertEqual(profile.appearance.accessory, 'crown', 'Accessory chip updates appearance.accessory');
              assertEqual(profile.appearance.cape, true, 'Cape toggle updates appearance.cape');
              assertEqual(
                document.documentElement.style.getPropertyValue('--trainer-accent').trim(),
                TRAINER_STYLES.royal.accent,
                'CSS --trainer-accent updates live to royal accent',
              );
              const pxData = studioPreview.getContext('2d').getImageData(56, 56, 1, 1).data;
              assertGreater(pxData[3], 0, 'Style Studio canvas drew non-transparent pixels');

              // 3. Reserve Box evolution support
              app.openPokedex('team');
              const boxEvoBtn = document.querySelector('.box-card.is-evo-ready .box-evolve-btn');
              assert(Boolean(boxEvoBtn), 'Evolve-ready Reserve Box card shows .box-evolve-btn');
              boxEvoBtn.click();
              assertEqual(profile.box[0].speciesId, 2, 'Reserve Box Bulbasaur evolved into Ivysaur #2');
              assert(Boolean(document.querySelector('.evo-celebration-banner')), 'Evolution celebration banner rendered');
              app.pokedex.close();

              // 4. Live battle non-overlap with Clefairy + 3-mon Rival pips + #battle-btn-star visible
              const rivalParty = [createPokemon(59, 14), createPokemon(181, 15), createPokemon(471, 16)];
              const rivalMeta = Object.values(RIVAL_TRAINERS)[3] || Object.values(RIVAL_TRAINERS)[0];
              const startPromise = app.battle.start({
                enemy: rivalParty[0],
                enemyParty: rivalParty,
                biomeId: rivalMeta.biome,
                isTrainer: true,
                trainerData: rivalMeta,
              });
              app.syncControlVisibility();
              const fastTypeTimer = setInterval(() => app.battle.finishTypewriter(), 20);
              try {
                await startPromise;
              } finally {
                clearInterval(fastTypeTimer);
              }
              await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

              const enemyCardRect = document.querySelector('.status-card-enemy').getBoundingClientRect();
              const playerSpriteRect = document.querySelector('.fighter-sprite-player').getBoundingClientRect();
              const playerCardRect = document.querySelector('.status-card-player').getBoundingClientRect();
              const enemySpriteRect = document.querySelector('.fighter-sprite-enemy').getBoundingClientRect();
              const starBtnRect = document.getElementById('battle-btn-star').getBoundingClientRect();
              const pipsRect = document.getElementById('enemy-party-pips').getBoundingClientRect();

              const overlaps = (a, b) => !(
                a.right <= b.left ||
                a.left >= b.right ||
                a.bottom <= b.top ||
                a.top >= b.bottom
              );

              assertEqual(
                overlaps(enemyCardRect, playerSpriteRect),
                false,
                `Rival status-card-enemy (${Math.round(enemyCardRect.bottom)}b) must not overlap Clefairy (${Math.round(playerSpriteRect.top)}t)`,
              );
              assertEqual(
                overlaps(playerCardRect, enemySpriteRect),
                false,
                `status-card-player (${Math.round(playerCardRect.top)}t) must not overlap enemy sprite (${Math.round(enemySpriteRect.bottom)}b)`,
              );
              assert(starBtnRect.width > 0 && starBtnRect.height > 0, '#battle-btn-star visible with non-zero size');
              assert(pipsRect.width > 0 && document.querySelectorAll('#enemy-party-pips .enemy-party-pip').length === 3, '3 rival party pips visible');

              app.battle.stop({ outcome: 'escaped', faintedAll: false });
            } finally {
              if (app.battle.active) {
                app.battle.stop({ outcome: 'escaped', faintedAll: false });
              }
              app.pokedex.close();
              app.closeSettings();
              if (prevRawSave === null) {
                window.localStorage.removeItem(STORAGE_KEY);
              } else {
                window.localStorage.setItem(STORAGE_KEY, prevRawSave);
              }
              storage.state = storage.load();
              app.applyTrainerTheme(storage.getActiveTrainerId() || 'violet');
              app.encounterTransitioning = false;
              app.bootScreenEl.hidden = wasBootHidden;
              app.starterScreenEl.hidden = wasStarterHidden;
              app.gameShellEl.hidden = wasShellHidden;
              app.overworld.setActive(wasOverworldActive);
              if (!wasOverworldActive) {
                app.audio?.stopBGM?.();
              }
              app.applySettings();
              if (!wasBootHidden) {
                app.showBootScreen();
              } else {
                app.refreshHud();
              }
              app.syncOverworldPause();
            }
          },
        },
      ],
    },
    {
      name: '22. Sprint 4 Roster (649), 8 Moves, 12 Gems, 7 Eeveelutions, 24 Badges & Full World BFS',
      tests: [
        {
          name: '649 species (16 Sprint-4 id<=467), 8 new moves, 12 gems, 7 Eeveelutions, 24 badges, 16 shrines, 28 chests, 19 NPCs/quests, 13 rivals, 16 landmarks & BFS hold',
          fn() {
            assertEqual(Object.keys(SPECIES).length, 649, '649 species defined');
            const sprint4SpeciesIds = [182, 186, 197, 208, 280, 281, 282, 333, 334, 363, 364, 365, 403, 404, 405, 467];
            for (const id of sprint4SpeciesIds) {
              assert(Boolean(SPECIES[id]), `Sprint 4 species #${id} defined`);
              assert(id <= 467, `Sprint 4 species #${id} <= 467`);
            }
            for (const sp of Object.values(SPECIES)) {
              assert(Boolean(TYPES[sp.type]), `species #${sp.id} has valid type`);
              assert(Array.isArray(sp.movePool) && sp.movePool.length >= 3, `species #${sp.id} has movePool`);
              for (const mvId of sp.movePool) {
                assert(Boolean(MOVES[mvId]), `species #${sp.id} move ${mvId} exists`);
              }
            }

            const sprint4Moves = [
              ['thunder_fang', 'electric', 'physical', 'attack'],
              ['wild_volt', 'electric', 'physical', 'attack'],
              ['moonblast', 'psychic', 'special', 'attack'],
              ['calm_aura', 'psychic', 'status', 'shield'],
              ['shadow_pulse', 'ghost', 'special', 'attack'],
              ['iron_crush', 'rock', 'physical', 'attack'],
              ['glacier_crash', 'ice', 'physical', 'attack'],
              ['magma_cannon', 'fire', 'special', 'attack'],
            ];
            for (const [id, type, dmgClass, category] of sprint4Moves) {
              const mv = MOVES[id];
              assert(Boolean(mv), `MOVES.${id} defined`);
              assertEqual(mv.type, type, `${id}.type`);
              assertEqual(mv.damageClass, dmgClass, `${id}.damageClass`);
              assertEqual(mv.category, category, `${id}.category`);
            }

            assertEqual(Object.keys(EVOLUTION_ITEMS).length, 12, '12 gems defined');
            assertEqual(EVOLUTION_ITEMS.sun_gem?.icon, '☀️', 'sun_gem present');
            assertEqual(EVOLUTION_ITEMS.dusk_gem?.icon, '🔮', 'dusk_gem present');

            const eeveeTargets = EVOLUTIONS[133].map((e) => e.to).sort((a, b) => a - b);
            assertEqual(JSON.stringify(eeveeTargets), JSON.stringify([134, 135, 136, 196, 197, 470, 471]), '7 Eeveelutions incl. Umbreon #197');
            assert(EVOLUTIONS[44].some((e) => e.to === 182 && e.item === 'sun_gem'), 'Gloom -> Bellossom via sun_gem');
            assert(EVOLUTIONS[61].some((e) => e.to === 186 && e.item === 'sun_gem'), 'Poliwhirl -> Politoed via sun_gem');
            assert(EVOLUTIONS[95].some((e) => e.to === 208 && e.item === 'dusk_gem'), 'Onix -> Steelix via dusk_gem');
            assert(EVOLUTIONS[126].some((e) => e.to === 467 && e.item === 'fire_gem'), 'Magmar -> Magmortar via fire_gem');
            assert(EVOLUTIONS[333].some((e) => e.to === 334 && e.item === 'sun_gem'), 'Swablu -> Altaria via sun_gem');

            assertEqual(Object.keys(TRAINER_STYLES).length, 10, '10 TRAINER_STYLES defined');
            assert(Boolean(TRAINER_STYLES.solstice && TRAINER_STYLES.twilight), 'solstice and twilight styles defined');
            assertEqual(Object.keys(TRAINER_ACCESSORIES).length, 8, '8 TRAINER_ACCESSORIES defined');
            assert(Boolean(TRAINER_ACCESSORIES.goggles && TRAINER_ACCESSORIES.halo), 'goggles and halo accessories defined');
            assertEqual(Object.keys(TRAINER_AURAS).length, 6, '6 TRAINER_AURAS defined');
            for (const auraId of ['none', 'stars', 'hearts', 'lightning']) {
              assert(Boolean(TRAINER_AURAS[auraId]), `TRAINER_AURAS.${auraId} exists`);
            }
            const defaultLook = resolveTrainerLook('violet', { styleId: 'default', accessory: 'halo', cape: true, aura: 'stars' });
            assertEqual(defaultLook.outfitPrimary, TRAINERS.violet.outfitPrimary, 'default style preserves base outfitPrimary');
            assertEqual(defaultLook.aura, 'stars', 'resolveTrainerLook resolves aura');
            assertEqual(resolveTrainerLook('ozias', null).aura, 'none', 'null appearance defaults aura to none');

            assertEqual(BADGES.length, 24, '24 BADGES defined');
            const eclipseBadge = BADGES.find((b) => b.id === 'eclipse');
            const stardustBadge = BADGES.find((b) => b.id === 'stardust');
            assert(Boolean(eclipseBadge && stardustBadge), 'eclipse and stardust badges defined');
            assertEqual(eclipseBadge.check({ shrinesCleared: ['eclipse_shrine'], pokedex: { caught: {} } }), true, 'eclipse unlocks on eclipse_shrine');
            assertEqual(eclipseBadge.check({ shrinesCleared: [], pokedex: { caught: { 92: 1, 93: 1, 197: 1, 282: 1 } } }), true, 'eclipse unlocks on 4 Ghost/Psychic species');
            assertEqual(stardustBadge.check({ stats: { upgrades: 1, evolutions: 0 } }), true, 'stardust unlocks on 1 upgrade');
            assertEqual(stardustBadge.check({ stats: { upgrades: 0, evolutions: 3 } }), true, 'stardust unlocks on 3 evolutions');

            assertEqual(Object.keys(SHRINES).length, 16, '16 SHRINES defined');
            assert(Object.values(SHRINES).some((s) => s.id === 'eclipse_shrine' && s.guardianId === 282 && s.badgeId === 'eclipse'), 'eclipse_shrine guardian Gardevoir #282');
            assertEqual(Object.keys(CHESTS).length, 28, '28 CHESTS defined');
            assert(Object.values(CHESTS).some((c) => c.id === 'lagoon_chest_sun' && c.rewards?.gems?.sun_gem === 1), 'lagoon_chest_sun grants sun_gem');
            assert(Object.values(CHESTS).some((c) => c.id === 'cave_chest_dusk' && c.rewards?.gems?.dusk_gem === 1), 'cave_chest_dusk grants dusk_gem');
            assertEqual(Object.keys(NPCS).length, 19, '19 NPCS defined');
            assertEqual(FIELD_QUESTS.length, 19, '19 FIELD_QUESTS defined');
            assert(FIELD_QUESTS.some((q) => q.id === 'quest_orion_upgrade'), 'quest_orion_upgrade defined');
            assert(FIELD_QUESTS.some((q) => q.id === 'quest_selene_twilight'), 'quest_selene_twilight defined');
            assertEqual(Object.keys(RIVAL_TRAINERS).length, 13, '13 RIVAL_TRAINERS defined');
            assert(Object.values(RIVAL_TRAINERS).some((r) => r.id === 'rival_astra' && r.biome === 'peak'), 'rival_astra in peak');
            assertEqual(Object.keys(LANDMARKS).length, 16, '16 LANDMARKS defined');

            // BFS from spawn (8,15) reaches all 8 shrines, 12 chests, 10 NPCs, 5 rivals, 7 landmarks
            const visited = new Set([`${GAME_META.spawn.x},${GAME_META.spawn.y}`]);
            const queue = [[GAME_META.spawn.x, GAME_META.spawn.y]];
            for (let head = 0; head < queue.length; head++) {
              const [cx, cy] = queue[head];
              for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
                const nx = cx + dx;
                const ny = cy + dy;
                const k = `${nx},${ny}`;
                if (!visited.has(k) && isTileWalkableAt(nx, ny)) {
                  visited.add(k);
                  queue.push([nx, ny]);
                }
              }
            }
            const hasAdj = (coordKey) => {
              const [x, y] = coordKey.split(',').map(Number);
              return [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => visited.has(`${x + dx},${y + dy}`));
            };
            for (const [label, map] of [
              ['shrine', SHRINES],
              ['chest', CHESTS],
              ['npc', NPCS],
              ['rival', RIVAL_TRAINERS],
              ['landmark', LANDMARKS],
            ]) {
              for (const [coord, entry] of Object.entries(map)) {
                assertEqual(hasAdj(coord), true, `${label} ${entry.id} at ${coord} reachable from spawn`);
              }
            }

            const guidance = getCompassGuidance({
              shrinesCleared: ['forest_shrine', 'cave_shrine', 'water_shrine', 'thunder_shrine', 'volcano_shrine', 'peak_shrine'],
              pokedex: { caught: {} },
            });
            assert(guidance?.title?.includes('Eclipse'), `Compass points to eclipse_shrine when prior 6 cleared, got "${guidance?.title}"`);
          },
        },
      ],
    },
    {
      name: '23. Star Rank Upgrading (★1–★5) & Lossless v1 / Sprint 3 v2 Migration',
      tests: [
        {
          name: 'applyUpgrade, Star Shards, stardust badge, Box upgrades, evolve preservation & v1/v2 save migration work',
          fn() {
            assertEqual(MAX_UPGRADE_TIER, 5, 'MAX_UPGRADE_TIER === 5');

            // Tier 0 preserves exact base formulas
            const baseMon = createPokemon(25, 10);
            const expectedHp = Math.floor(((baseMon.species.baseStats.hp * 2) * 10) / 35) + 10 + 18;
            const expectedAtk = Math.floor(((baseMon.species.baseStats.atk * 2) * 10) / 40) + 7;
            assertEqual(baseMon.upgradeTier, 0, 'default upgradeTier is 0');
            assertEqual(baseMon.isElite, false, 'default isElite is false');
            assertEqual(baseMon.maxHp, expectedHp, 'tier 0 maxHp unchanged');
            assertEqual(baseMon.atk, expectedAtk, 'tier 0 atk unchanged');
            assertEqual(baseMon.xpToNext, 10 * 22 + 15, 'tier 0 xpToNext unchanged');

            const expectedCosts = [2, 4, 6, 8, 10];
            for (let tier = 0; tier < 5; tier++) {
              assertEqual(baseMon.getUpgradeCost(), expectedCosts[tier], `tier ${tier} cost === ${expectedCosts[tier]}`);
              baseMon.takeDamage(5);
              baseMon.consumeMovePp(baseMon.species.movePool[0]);
              const bondBefore = baseMon.bond;
              const res = baseMon.applyUpgrade();
              assertEqual(res.upgraded, true, `applyUpgrade succeeds from tier ${tier}`);
              assertEqual(res.oldTier, tier, 'oldTier reported');
              assertEqual(res.newTier, tier + 1, 'newTier reported');
              assertEqual(baseMon.hp, baseMon.maxHp, 'applyUpgrade heals full HP');
              const firstMove = baseMon.species.movePool[0];
              assertEqual(baseMon.getMovePp(firstMove).current, baseMon.getMovePp(firstMove).max, 'applyUpgrade restores full PP');
              assertEqual(baseMon.bond, Math.min(100, bondBefore + 10), 'applyUpgrade adds +10 bond');
            }
            assertEqual(baseMon.upgradeTier, 5, 'reached tier 5');
            assertEqual(baseMon.getUpgradeCost(), null, 'tier 5 getUpgradeCost returns null');
            assertEqual(baseMon.maxHp, Math.round((Math.floor(((baseMon.species.baseStats.hp * 2) * baseMon.level) / 35) + baseMon.level + 18) * 1.25), 'tier 5 scales maxHp +25%');
            const cappedRes = baseMon.applyUpgrade();
            assertEqual(cappedRes.upgraded, false, 'cannot upgrade past tier 5');

            // Preserve upgradeTier and isElite across toJSON/fromJSON and evolve()
            const eliteRalts = createPokemon(280, 12, 'forest', { upgradeTier: 3, isElite: true });
            const rt = Pokemon.fromJSON(eliteRalts.toJSON());
            assertEqual(rt.upgradeTier, 3, 'upgradeTier survives JSON round-trip');
            assertEqual(rt.isElite, true, 'isElite survives JSON round-trip');
            rt.evolve(281);
            assertEqual(rt.speciesId, 281, 'Ralts evolved to Kirlia');
            assertEqual(rt.upgradeTier, 3, 'upgradeTier preserved on evolve()');
            assertEqual(rt.isElite, true, 'isElite preserved on evolve()');

            // StorageManager upgradePokemon on Team & Box + starShards + stardust badge
            const TEST_KEY = 'starlight_pokemon_test_s23_v1';
            try {
              window.localStorage.removeItem(TEST_KEY);
              const store = new StorageManager(TEST_KEY);
              store.selectTrainer('violet');
              store.chooseStarter(1);
              const profile = store.getActiveProfile();
              assertEqual(profile.bag.starShards, 4, 'fresh profile starts with 4 starShards');
              assertEqual(store.hasAnyReadyEvolution(profile), false, 'fresh Lv.5 Bulbasaur has no ready evolution');

              // Fill team to 6 and place 7th mon in Reserve Box
              for (const id of [10, 16, 25, 43, 133]) {
                store.recordCaught(createPokemon(id, 5));
              }
              const boxSpheal = createPokemon(363, 13, 'water');
              boxSpheal.gainXp(Math.ceil(boxSpheal.xpToNext * 0.45));
              store.recordCaught(boxSpheal);
              assertEqual(profile.box.length, 1, 'Spheal placed in Reserve Box');

              // Upgrade lead Bulbasaur (cost 2) -> unlocks stardust badge
              const up1 = store.upgradePokemon(profile.team[0].uid);
              assertEqual(up1.upgraded, true, 'Team upgrade succeeded');
              assertEqual(up1.cost, 2, 'Team upgrade cost 2');
              assertEqual(up1.remainingShards, 2, '2 starShards remaining');
              assertEqual(profile.stats.upgrades, 1, 'stats.upgrades incremented to 1');
              assert(profile.badges.includes('stardust'), 'stardust badge unlocked');
              assert(up1.newBadges.some((b) => b.id === 'stardust'), 'stardust returned in newBadges');

              // Upgrade Box Spheal (cost 2) -> Lv.13 + 65% XP -> Lv.14 -> pendingEvo Sealeo #364
              const upBox = store.upgradePokemon(boxSpheal.uid);
              assertEqual(upBox.upgraded, true, 'Box upgrade succeeded');
              assertEqual(upBox.remainingShards, 0, '0 starShards remaining');
              assertEqual(boxSpheal.upgradeTier, 1, 'Box Spheal at ★1');
              assertEqual(boxSpheal.level, 14, 'Box Spheal leveled up to 14');
              assertEqual(upBox.pendingEvo?.toId, 364, 'Box Spheal unlocked pending Sealeo evolution');
              assertEqual(store.hasAnyReadyEvolution(profile), true, 'hasAnyReadyEvolution detects Box pending evolution');

              // Insufficient shards rejected cleanly
              const failUp = store.upgradePokemon(profile.team[0].uid);
              assertEqual(failUp.upgraded, false, 'insufficient shards rejected');
              assertEqual(failUp.reason, 'insufficient_shards', 'reason === insufficient_shards');
              assertEqual(profile.bag.starShards, 0, 'starShards unchanged on failure');

              store.addStarShards(5);
              assertEqual(profile.bag.starShards, 5, 'addStarShards added 5');

              // Lossless v1 & Sprint 3 v2 migration preserving explicit starShards: 0 & hydrating defaults
              window.localStorage.setItem(TEST_KEY, JSON.stringify({
                version: 1,
                activeTrainerId: 'violet',
                profiles: {
                  violet: {
                    trainerId: 'violet',
                    starterId: 1,
                    pos: { x: 8, y: 15, dir: 'down' },
                    team: [{ uid: 'v1-mon', speciesId: 1, level: 8, xp: 10, hp: 30 }],
                    bag: { potions: 4, greatBalls: 2 },
                  },
                  ozias: {
                    trainerId: 'ozias',
                    starterId: 4,
                    pos: { x: 8, y: 15, dir: 'down' },
                    team: [{ uid: 'v2-mon', speciesId: 4, level: 9, xp: 12, hp: 32, upgradeTier: 2, isElite: true }],
                    bag: { potions: 3, greatBalls: 1, starBalls: 1, starShards: 0 },
                    appearance: { styleId: 'royal', accessory: 'crown', cape: true },
                  },
                },
              }));
              const migrated = new StorageManager(TEST_KEY);
              assertEqual(migrated.state.version, 2, 'migrated save keeps version === 2');
              const mv = migrated.getProfile('violet');
              const mo = migrated.getProfile('ozias');
              assertEqual(mv.bag.starShards, 2, 'v1 save without starShards hydrates to 2');
              assertEqual(mv.bag.gems.sun_gem, 0, 'sun_gem hydrated to 0');
              assertEqual(mv.bag.gems.dusk_gem, 0, 'dusk_gem hydrated to 0');
              assertEqual(mv.appearance.aura, 'none', 'aura defaults to none');
              assertEqual(mv.stats.upgrades, 0, 'stats.upgrades defaults to 0');
              assertEqual(mv.team[0].upgradeTier, 0, 'v1 mon defaults upgradeTier to 0');
              assertEqual(mv.team[0].isElite, false, 'v1 mon defaults isElite to false');
              assertEqual(mo.bag.starShards, 0, 'explicit starShards: 0 preserved during migration');
              assertEqual(mo.team[0].upgradeTier, 2, 'mon upgradeTier preserved on hydration');
              assertEqual(mo.team[0].isElite, true, 'mon isElite preserved on hydration');
            } finally {
              window.localStorage.removeItem(TEST_KEY);
            }
          },
        },
      ],
    },
    {
      name: '24. World Scaling, Battle Move Badges, Elite Spectacle, Shard Drops, Bench XP & Audio',
      tests: [
        {
          name: 'Scaling APIs, AudioEngine 8 moves + fanfare, Battle .move-eff-badge, Star/Elite badges, Shards & Bench Catch-Up XP work',
          async fn() {
            // 1. World Scaling APIs
            const newbieProfile = { team: [{ level: 5 }], badges: [] };
            const newbiePower = getTrainerPowerLevel(newbieProfile);
            assertEqual(newbiePower, 5, 'Lv.5 solo starter power === 5');
            const newbieForest = getBiomeScaledRange('forest', newbieProfile);
            assertEqual(newbieForest.minLv, BIOMES.forest.levelRange[0], 'newbie forest minLv preserves base');
            assertEqual(newbieForest.maxLv, BIOMES.forest.levelRange[1], 'newbie forest maxLv preserves base');
            assertEqual(newbieForest.isScaled, false, 'newbie forest isScaled === false');

            const veteranProfile = {
              team: [{ level: 22 }, { level: 20 }, { level: 18 }],
              badges: ['meadow', 'flame', 'cascade', 'thunder', 'boulder', 'magma'],
              rivalsDefeated: ['rival_leo', 'rival_kai'],
            };
            const vetPower = getTrainerPowerLevel(veteranProfile);
            assertGreater(vetPower, 21, 'veteran power includes top-2 + badge bonus');
            const vetPeak = getBiomeScaledRange('peak', veteranProfile);
            assertEqual(vetPeak.isScaled, true, 'veteran peak isScaled === true');
            assertGreater(vetPeak.maxLv, vetPeak.baseMax, 'veteran peak scales above baseMax');

            const eliteWild = rollWildPokemon('cave', veteranProfile, { forceElite: true, upgradeTier: 2 });
            assertEqual(eliteWild.isElite, true, 'rollWildPokemon forceElite: true');
            assertEqual(eliteWild.upgradeTier, 2, 'rollWildPokemon respects upgradeTier');
            const normalWild = rollWildPokemon('forest', 6, { forceElite: false });
            assertEqual(normalWild.isElite, false, 'rollWildPokemon numeric signature backward-compatible');

            const shrineGuard = getScaledShrineGuard(Object.values(SHRINES)[0], veteranProfile);
            assertGreater(shrineGuard.level, Object.values(SHRINES)[0].level, 'shrine guardian scales with veteran profile');
            assertGreater(shrineGuard.upgradeTier, 0, 'scaled shrine guardian receives Star Rank');

            const firstRival = Object.values(RIVAL_TRAINERS)[0];
            const scaledRival = getScaledRivalParty(firstRival, veteranProfile);
            assertEqual(scaledRival.length, firstRival.party.length, 'scaled rival party length preserved');
            assertGreater(scaledRival[0].level, firstRival.party[0].level, 'rival rematch levels scaled');
            assert(scaledRival[0].speciesId !== firstRival.party[0].speciesId, 'high-level rival rematch evolves eligible partner');

            assertGreater(getBattleShardReward(eliteWild, { isShrine: false, isTrainer: false, caught: true }), 2, 'elite catch grants >=3 Shards');
            assertGreater(getBattleShardReward(createPokemon(151, 25, 'peak', { upgradeTier: 2 }), { isShrine: true }), 3, 'shrine victory grants >=4 Shards');

            // 2. AudioEngine 8 new moves + playUpgradeFanfare + gain/cutoff invariants
            const testAudio = new AudioEngine({ silent: true, attachUnlockListeners: false });
            try {
              const ctx = testAudio.ensureContext();
              if (ctx) {
                assertInRange(testAudio.masterFilter.frequency.value, 900, 1300, 'masterFilter cutoff stays in 900-1300Hz');
              }
              for (const [themeName, theme] of Object.entries(THEMES)) {
                assertInRange(theme.leadGain, 0, 0.12, `${themeName}.leadGain <= 0.12`);
                assertInRange(theme.arpGain, 0, 0.12, `${themeName}.arpGain <= 0.12`);
                assertInRange(theme.bassGain, 0, 0.12, `${themeName}.bassGain <= 0.12`);
              }
              await Promise.race([testAudio.unlock(), new Promise((r) => setTimeout(r, 150))]);
              testAudio.playUpgradeFanfare();
              for (const mvId of ['thunder_fang', 'wild_volt', 'moonblast', 'calm_aura', 'shadow_pulse', 'iron_crush', 'glacier_crash', 'magma_cannon']) {
                testAudio.playElemental(MOVES[mvId].type, mvId);
              }
            } finally {
              await testAudio.destroy();
            }

            // 3. BattleEngine UI, 8 new move choreographies, Star Shard drops & Bench Catch-Up XP Share
            const TEST_KEY = 'starlight_pokemon_test_s24_v1';
            const noopAudio = {
              playMenuBlip() {},
              playCursorMove() {},
              playMoveSelect() {},
              playWindup() {},
              playPhysicalImpact() {},
              playElemental() {},
              playShieldChime() {},
              playHealChime() {},
              playFaint() {},
              playLevelUp() {},
              playPokeballThrow() {},
              playPokeballAbsorb() {},
              playPokeballBounce() {},
              playPokeballWobble() {},
              playCaptureSuccess() {},
              playStarBallShimmer() {},
              playXpTick() {},
              playShinySparkle() {},
            };
            const waitUntil = async (engine, pred, timeoutMs = 5000) => {
              const start = performance.now();
              while (!pred()) {
                if (engine.typingResolve) engine.finishTypewriter();
                if (performance.now() - start > timeoutMs) {
                  throw new Error(`Timed out waiting (state=${engine.state}, busy=${engine.busy})`);
                }
                await new Promise((r) => setTimeout(r, 15));
              }
            };

            let engine = null;
            const origRand = Math.random;
            try {
              window.localStorage.removeItem(TEST_KEY);
              const store = new StorageManager(TEST_KEY);
              store.updateSettings({ battlePace: 'fast' });
              store.selectTrainer('ozias');
              store.chooseStarter(4); // Charmander
              const vp = store.getActiveProfile();
              vp.bag.starShards = 0;

              // Active lead: Gardevoir #282 Lv.25 ★2 (knows moonblast [psychic], starlight_ray, cosmos_mind, calm_aura)
              const gardevoir = createPokemon(282, 25, 'cave', { upgradeTier: 2 });
              const benchHealthy = createPokemon(403, 5, 'forest'); // Shinx conscious bench mate
              const benchFainted = createPokemon(363, 5, 'water');
              benchFainted.hp = 0;
              vp.team = [gardevoir, benchHealthy, benchFainted];

              engine = new BattleEngine({
                storage: store,
                audio: noopAudio,
                onBattleEnd() {},
                onBadgesUnlocked() {},
                onHudRefresh() {},
              });

              // Enemy: Rock-type Steelix #208 Lv.2 (tests 1.5x BOOST for moonblast + ★3 + ⚡ ELITE)
              const eliteRock = createPokemon(208, 2, 'cave', { upgradeTier: 3, isElite: true });
              const startP = engine.start({ enemy: eliteRock, biomeId: 'cave' });
              await waitUntil(engine, () => engine.state === BATTLE_STATES.PLAYER_INPUT);
              await startP;

              // Verify .rank-pill and .elite-badge and .is-elite-sprite / .is-elite-card
              assert(document.getElementById('player-rank-pill')?.textContent.includes('★2'), 'player .rank-pill ★2 rendered');
              assert(document.getElementById('enemy-rank-pill')?.textContent.includes('★3'), 'enemy .rank-pill ★3 rendered');
              assert(Boolean(document.querySelector('.status-card-enemy .elite-badge')), 'enemy .elite-badge rendered');
              assert(document.querySelector('.status-card-enemy')?.classList.contains('is-elite-card'), 'enemy card has .is-elite-card');
              assert(document.getElementById('enemy-sprite')?.classList.contains('is-elite-sprite'), 'enemy sprite has .is-elite-sprite');

              // Verify .move-eff-badge 1.5x BOOST (psychic vs rock), plus 2x SUPER & 0.5x RESIST
              const effTexts1 = Array.from(document.querySelectorAll('#battle-moves .move-eff-badge')).map((el) => el.textContent.trim());
              assert(effTexts1.includes('1.5x BOOST'), `expected 1.5x BOOST badge for psychic->rock, got ${JSON.stringify(effTexts1)}`);

              const savedEnemy = engine.enemy;
              const savedPlayer = engine.player;
              engine.enemy = createPokemon(94, 5, 'cave'); // ghost
              engine.player = createPokemon(197, 10, 'cave'); // Umbreon knows shadow_pulse (ghost->ghost 2x SUPER)
              engine.renderMoveButtons();
              const effTextsSuper = Array.from(document.querySelectorAll('#battle-moves .move-eff-badge')).map((el) => el.textContent.trim());
              assert(effTextsSuper.includes('2x SUPER'), `expected 2x SUPER badge, got ${JSON.stringify(effTextsSuper)}`);

              engine.enemy = createPokemon(4, 5, 'volcano'); // fire
              engine.player = createPokemon(1, 5, 'forest'); // Bulbasaur knows vine_whip (grass->fire 0.5x RESIST)
              engine.renderMoveButtons();
              const effTextsResist = Array.from(document.querySelectorAll('#battle-moves .move-eff-badge')).map((el) => el.textContent.trim());
              assert(effTextsResist.includes('0.5x RESIST'), `expected 0.5x RESIST badge, got ${JSON.stringify(effTextsResist)}`);

              engine.enemy = savedEnemy;
              engine.player = savedPlayer;
              engine.renderMoveButtons();

              // Exercise all 8 new move choreographies cleanly
              for (const mvId of ['thunder_fang', 'wild_volt', 'moonblast', 'calm_aura', 'shadow_pulse', 'iron_crush', 'glacier_crash', 'magma_cannon']) {
                const mv = MOVES[mvId];
                const fakeRes = mv.category === 'shield'
                  ? { category: 'shield', damage: 0, heal: 5, grantShield: true, buffStat: 'def', buffStages: 1, effectiveness: 1, isCrit: false, missed: false }
                  : { category: 'attack', damage: 18, heal: 0, effectiveness: 1, isCrit: false, missed: false };
                await engine.playAttackVisual('player', 'enemy', mv, fakeRes, engine.enemy, engine.sessionId);
              }

              // Defeat Elite Lv.2 Steelix -> awards Star Shards + Bench Catch-Up XP Share (conscious only)
              const xpBeforeBench = benchHealthy.xp;
              const xpBeforeFainted = benchFainted.xp;
              Math.random = () => 0.5;
              engine.selectMoveBySlot(0);
              await waitUntil(engine, () => !engine.active, 6000);
              Math.random = origRand;

              assertGreater(vp.bag.starShards, 0, 'victory awarded Star Shards');
              assertGreater(benchHealthy.xp + benchHealthy.level * 100, xpBeforeBench + 5 * 100, 'conscious bench mate received Catch-Up XP');
              assertEqual(benchFainted.xp, xpBeforeFainted, 'fainted bench mate skipped for Catch-Up XP');

              // Catch wild Elite -> awards Star Shards & excludes caught mon from Catch-Up XP
              const shardsBeforeCatch = vp.bag.starShards;
              const wildTarget = createPokemon(403, 5, 'forest', { isElite: true, upgradeTier: 1 });
              const startCatch = engine.start({ enemy: wildTarget, biomeId: 'forest' });
              await waitUntil(engine, () => engine.state === BATTLE_STATES.PLAYER_INPUT);
              await startCatch;
              Math.random = () => 0.0;
              document.getElementById('battle-btn-ball').click();
              await waitUntil(engine, () => !engine.active, 6000);
              Math.random = origRand;
              assertGreater(vp.bag.starShards, shardsBeforeCatch, 'capture awarded Star Shards');
              assertEqual(wildTarget.xp, 0, 'newly caught mon excluded from self Catch-Up XP');
            } finally {
              Math.random = origRand;
              engine?.destroy();
              window.localStorage.removeItem(TEST_KEY);
            }
          },
        },
      ],
    },
    {
      name: '25. UI Integration: Style Bar, Evo Pulse, Power-Up UI, Auras, Responsive Layout & 60fps Loop',
      tests: [
        {
          name: 'Starter style bar, evo pulse, Team/Box .upgrade-btn, Guide scaling, Studio auras, 1280x720/1024x768 Clefairy non-overlap & 60fps loop pass',
          async fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            const prevRawSave = window.localStorage.getItem(STORAGE_KEY);
            const wasBootHidden = app.bootScreenEl.hidden;
            const wasStarterHidden = app.starterScreenEl.hidden;
            const wasShellHidden = app.gameShellEl.hidden;
            const wasOverworldActive = app.overworld.active;
            const origCabinetStyle = app.cabinetEl?.getAttribute('style') ?? null;

            try {
              window.localStorage.removeItem(STORAGE_KEY);
              storage.state = storage.load();

              // 1. #starter-style-bar on #starter-screen
              app.selectTrainer('violet');
              assertEqual(app.starterScreenEl.hidden, false, 'starter screen shown for new profile');
              const styleBar = document.getElementById('starter-style-bar');
              assert(Boolean(styleBar), '#starter-style-bar exists');
              assertEqual(styleBar.querySelectorAll('.starter-style-chip').length, 10, '10 starter style chips');
              assertEqual(styleBar.querySelectorAll('.starter-acc-chip').length, 8, '8 starter accessory chips');
              assertEqual(styleBar.querySelectorAll('.starter-aura-chip').length, 6, '6 starter aura chips');
              styleBar.querySelector('.starter-style-chip[data-starter-style-id="twilight"]')?.click();
              styleBar.querySelector('.starter-acc-chip[data-starter-acc-id="halo"]')?.click();
              styleBar.querySelector('.starter-aura-chip[data-starter-aura-id="stars"]')?.click();
              const preStarterProfile = storage.getProfile('violet');
              assertEqual(preStarterProfile.appearance.styleId, 'twilight', 'starter bar sets styleId');
              assertEqual(preStarterProfile.appearance.accessory, 'halo', 'starter bar sets accessory');
              assertEqual(preStarterProfile.appearance.aura, 'stars', 'starter bar sets aura');

              // Pick starter and enter overworld
              storage.chooseStarter(1); // Bulbasaur Lv.5
              const profile = storage.getActiveProfile();
              profile.bag.starShards = 32; // enough for ★0 -> ★5 (2+4+6+8+10 = 30)
              storage.save();
              app.enterOverworld(true);
              app.applySettings();

              // 2. #hud-btn-dex.has-evo-ready & #quick-dex-btn.has-evo-ready
              assertEqual(app.hudDexBtn.classList.contains('has-evo-ready'), false, 'no .has-evo-ready at Lv.5');
              profile.team[0].level = 10;
              profile.team[0].recalculateStats();
              app.refreshHud();
              assertEqual(app.hudDexBtn.classList.contains('has-evo-ready'), true, '#hud-btn-dex has .has-evo-ready when evolution ready');
              assertEqual(document.getElementById('quick-dex-btn')?.classList.contains('has-evo-ready'), true, '#quick-dex-btn has .has-evo-ready');

              // 3. Team & Box .upgrade-btn + ✨ Shards + Star Rank + ★ MAX RANK
              app.openPokedex('team');
              const bagText = document.querySelector('.dex-summary-bar')?.textContent || '';
              assert(bagText.includes('Shards:'), `Team bag displays ✨ Shards, got "${bagText}"`);
              assert(Boolean(document.querySelector('.team-card .rank-pill')), 'Team card renders .rank-pill');
              const upBtn = document.querySelector('.team-card .upgrade-btn');
              assert(Boolean(upBtn), 'Team card renders .upgrade-btn');
              upBtn.click();
              assertEqual(profile.team[0].upgradeTier, 1, 'clicking .upgrade-btn upgrades to ★1');
              assertEqual(profile.bag.starShards, 30, 'clicking .upgrade-btn deducts 2 starShards');
              assert(profile.badges.includes('stardust'), 'upgrading in UI unlocks stardust badge');
              assert(Boolean(document.querySelector('.evo-celebration-banner')), 'Power Up renders celebratory banner');

              for (let i = 0; i < 4; i++) {
                document.querySelector('.team-card .upgrade-btn')?.click();
              }
              assertEqual(profile.team[0].upgradeTier, 5, 'upgraded to ★5');
              assert(Boolean(document.querySelector('.team-card .rank-max-pill')), 'Tier 5 renders ★ MAX RANK pill');

              // 4. Guide scaled level ranges & threat tags
              app.openPokedex('guide');
              const guideHtml = document.getElementById('pokedex-body')?.textContent || '';
              assert(guideHtml.includes('Trainer Power:'), 'Guide renders Trainer Power');
              assertGreater(document.querySelectorAll('.biome-threat-tag').length, 0, 'Guide renders biome threat tags');

              // 5. Style Studio 10 styles / 8 accessories / 6 auras + overworld aura render
              app.openPokedex('trainer');
              assertEqual(document.querySelectorAll('.style-chip').length, 10, 'Style Studio renders 10 styles');
              assertEqual(document.querySelectorAll('.accessory-chip').length, 8, 'Style Studio renders 8 accessories');
              assertEqual(document.querySelectorAll('.aura-chip').length, 6, 'Style Studio renders 6 auras');
              document.querySelector('.aura-chip[data-aura-id="lightning"]')?.click();
              assertEqual(profile.appearance.aura, 'lightning', 'clicking .aura-chip updates appearance.aura');
              app.pokedex.close();
              app.overworld.render(performance.now());

              // 6. Chromebook (1280x720) & Tablet (1024x768) Clefairy #35 + Star Rank + Elite + Rival non-overlap
              profile.team[0] = createPokemon(35, 16, 'peak', { upgradeTier: 4 });
              const rivalParty = [
                createPokemon(334, 17, 'peak', { upgradeTier: 3, isElite: true }),
                createPokemon(365, 18, 'peak', { upgradeTier: 2 }),
                createPokemon(282, 19, 'peak', { upgradeTier: 2 }),
              ];
              const astraMeta = Object.values(RIVAL_TRAINERS).find((r) => r.id === 'rival_astra') || Object.values(RIVAL_TRAINERS)[0];
              const startBattleP = app.battle.start({
                enemy: rivalParty[0],
                enemyParty: rivalParty,
                biomeId: 'peak',
                isTrainer: true,
                trainerData: astraMeta,
              });
              app.syncControlVisibility();
              const fastTimer = setInterval(() => app.battle.finishTypewriter(), 20);
              try {
                await startBattleP;
              } finally {
                clearInterval(fastTimer);
              }

              const overlaps = (a, b) => !(
                a.right <= b.left ||
                a.left >= b.right ||
                a.bottom <= b.top ||
                a.top >= b.bottom
              );

              for (const [label, w, h] of [
                ['Chromebook 1280x720', 940, Math.round(720 * 0.985)],
                ['Tablet 1024x768', 940, Math.round(768 * 0.985)],
              ]) {
                app.cabinetEl.style.width = `${w}px`;
                app.cabinetEl.style.height = `${h}px`;
                await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
                const enemyCard = document.querySelector('.status-card-enemy').getBoundingClientRect();
                const playerSprite = document.querySelector('.fighter-sprite-player').getBoundingClientRect();
                const playerCard = document.querySelector('.status-card-player').getBoundingClientRect();
                const enemySprite = document.querySelector('.fighter-sprite-enemy').getBoundingClientRect();
                assertEqual(
                  overlaps(enemyCard, playerSprite),
                  false,
                  `${label}: status-card-enemy overlaps Clefairy player sprite`,
                );
                assertEqual(
                  overlaps(playerCard, enemySprite),
                  false,
                  `${label}: status-card-player overlaps enemy sprite`,
                );
              }

              app.battle.stop({ outcome: 'escaped', faintedAll: false });

              // 7. 60fps loop diagnostics
              const fpsDeadline = performance.now() + 1400;
              while (app.getDiagnostics().measuredFps <= 0 && performance.now() < fpsDeadline) {
                await new Promise((r) => setTimeout(r, 60));
              }
              const diag = app.getDiagnostics();
              assertEqual(diag.loopRafActive, true, 'loopRafActive === true');
              assertEqual(diag.loopStartCount, 1, 'single loop started (loopStartCount === 1)');
              assertGreater(diag.measuredFps, 0, `measuredFps > 0 (got ${diag.measuredFps})`);
            } finally {
              if (origCabinetStyle === null) {
                app.cabinetEl?.removeAttribute('style');
              } else {
                app.cabinetEl?.setAttribute('style', origCabinetStyle);
              }
              if (app.battle.active) {
                app.battle.stop({ outcome: 'escaped', faintedAll: false });
              }
              app.pokedex.close();
              app.closeSettings();
              if (prevRawSave === null) {
                window.localStorage.removeItem(STORAGE_KEY);
              } else {
                window.localStorage.setItem(STORAGE_KEY, prevRawSave);
              }
              storage.state = storage.load();
              app.applyTrainerTheme(storage.getActiveTrainerId() || 'violet');
              app.encounterTransitioning = false;
              app.bootScreenEl.hidden = wasBootHidden;
              app.starterScreenEl.hidden = wasStarterHidden;
              app.gameShellEl.hidden = wasShellHidden;
              app.overworld.setActive(wasOverworldActive);
              if (!wasOverworldActive) {
                app.audio?.stopBGM?.();
              }
              app.applySettings();
              if (!wasBootHidden) {
                app.showBootScreen();
              } else {
                app.refreshHud();
              }
              app.syncOverworldPause();
            }
          },
        },
      ],
    },
    {
      name: '26. Sprint 5 Roster (649), Celestial Grove, Bond Perks & Save Migration',
      tests: [
        {
          name: '649 species, 8 moves, astral_gem, Kirlia->Gallade split evo, getBondTier, cheerPokemon, badges & post-shrine roamers hold',
          fn() {
            assertEqual(Object.keys(SPECIES).length, 649, '649 species defined');
            const sprint5SpeciesIds = [
              155, 156, 157, 175, 176, 252, 253, 254, 349, 350,
              361, 371, 372, 373, 385, 447, 448, 468, 475, 478,
            ];
            for (const id of sprint5SpeciesIds) {
              assert(Boolean(SPECIES[id]), `Sprint 5 species #${id} exists`);
            }
            for (const sp of Object.values(SPECIES)) {
              assert(Boolean(TYPES[sp.type]), `species #${sp.id} has valid type ${sp.type}`);
              assert(Array.isArray(sp.movePool) && sp.movePool.length >= 3, `species #${sp.id} has movePool`);
              for (const mvId of sp.movePool) {
                assert(Boolean(MOVES[mvId]), `species #${sp.id} move ${mvId} exists`);
              }
            }

            const sprint5Moves = [
              ['leaf_blade', 'grass', 'physical', 'attack', 'grass'],
              ['eruption_flare', 'fire', 'special', 'attack', 'fire'],
              ['aura_sphere', 'psychic', 'special', 'attack', 'psychic'],
              ['psycho_cut', 'psychic', 'physical', 'attack', 'psychic'],
              ['aqua_tail', 'water', 'physical', 'attack', 'water'],
              ['draco_meteor', 'dragon', 'special', 'attack', 'dragon'],
              ['omen_wind', 'ghost', 'special', 'attack', 'ghost'],
              ['doom_desire', 'psychic', 'special', 'attack', 'star'],
            ];
            for (const [id, type, dmgClass, category, fx] of sprint5Moves) {
              const mv = MOVES[id];
              assert(Boolean(mv), `MOVES.${id} defined`);
              assertEqual(mv.type, type, `${id}.type`);
              assertEqual(mv.damageClass, dmgClass, `${id}.damageClass`);
              assertEqual(mv.category, category, `${id}.category`);
              assertEqual(mv.fx, fx, `${id}.fx`);
            }

            assertEqual(Object.keys(EVOLUTION_ITEMS).length, 12, '12 evolution gems defined');
            assert(Boolean(EVOLUTION_ITEMS.astral_gem), 'astral_gem defined');
            assertEqual(EVOLUTION_ITEMS.astral_gem.icon, '🌠', 'astral_gem icon');

            // Kirlia (#281) split evo: Gardevoir (#282, moon_gem) first, Gallade (#475, astral_gem) second
            const kirliaRules = EVOLUTIONS[281];
            assert(Array.isArray(kirliaRules) && kirliaRules.length === 2, 'Kirlia has 2 split evolution rules');
            assertEqual(kirliaRules[0].to, 282, 'Kirlia first rule is Gardevoir #282');
            assertEqual(kirliaRules[0].item, 'moon_gem', 'Kirlia -> Gardevoir uses moon_gem');
            assertEqual(kirliaRules[1].to, 475, 'Kirlia second rule is Gallade #475');
            assertEqual(kirliaRules[1].item, 'astral_gem', 'Kirlia -> Gallade uses astral_gem');

            assert(EVOLUTIONS[176].some((r) => r.to === 468 && r.item === 'astral_gem'), 'Togetic -> Togekiss via astral_gem');
            assert(EVOLUTIONS[349].some((r) => r.to === 350 && r.item === 'astral_gem'), 'Feebas -> Milotic via astral_gem');
            assert(EVOLUTIONS[361].some((r) => r.to === 478 && r.item === 'dusk_gem'), 'Snorunt -> Froslass via dusk_gem');
            assert(EVOLUTIONS[447].some((r) => r.to === 448 && r.item === 'astral_gem'), 'Riolu -> Lucario via astral_gem');

            // getBondTier boundary verification & calculateDamage tiered critBonus
            const tier0 = getBondTier(0);
            const tier0Edge = getBondTier(39);
            const tier1 = getBondTier(40);
            const tier2 = getBondTier(60);
            const tier3 = getBondTier(85);
            const tierNeg = getBondTier(-20);
            const tierHigh = getBondTier(999);
            const tierNaN = getBondTier(NaN);
            assertEqual(tier0.tier, 0, 'bond 0 -> tier 0');
            assertEqual(tier0Edge.xpMult, 1.0, 'bond 39 -> xpMult 1.0');
            assertEqual(tier1.tier, 1, 'bond 40 -> tier 1');
            assertEqual(tier1.xpMult, 1.08, 'tier 1 xpMult 1.08');
            assertEqual(tier1.critBonus, 0.02, 'tier 1 critBonus 0.02');
            assertEqual(tier2.tier, 2, 'bond 60 -> tier 2');
            assertEqual(tier2.xpMult, 1.12, 'tier 2 xpMult 1.12');
            assertEqual(tier2.critBonus, 0.04, 'tier 2 critBonus 0.04');
            assertEqual(tier2.endureChance, 0.15, 'tier 2 endureChance 0.15');
            assertEqual(tier3.tier, 3, 'bond 85 -> tier 3');
            assertEqual(tier3.xpMult, 1.20, 'tier 3 xpMult 1.20');
            assertEqual(tier3.endureChance, 0.25, 'tier 3 endureChance 0.25');
            assertEqual(tierNeg.tier, 0, 'negative bond clamps safely to tier 0');
            assertEqual(tierHigh.tier, 3, 'high bond clamps safely to tier 3');
            assertEqual(tierNaN.tier, 0, 'NaN bond defaults safely to tier 0');

            const target = createPokemon(10, 10);
            const monB20 = createPokemon(25, 10, 'forest', { bond: 20 });
            const monB45 = createPokemon(25, 10, 'forest', { bond: 45 });
            const monB70 = createPokemon(25, 10, 'forest', { bond: 70 });
            const origRand = Math.random;
            try {
              Math.random = () => 0.09; // between 0.08 and 0.10
              assertEqual(calculateDamage(monB20, target, MOVES.tackle, { forceHit: true, fixedVariance: 1 }).isCrit, false, 'bond 20 stays 8% crit');
              assertEqual(calculateDamage(monB45, target, MOVES.tackle, { forceHit: true, fixedVariance: 1 }).isCrit, true, 'bond 45 raises crit to 10%');
              Math.random = () => 0.11; // between 0.10 and 0.12
              assertEqual(calculateDamage(monB45, target, MOVES.tackle, { forceHit: true, fixedVariance: 1 }).isCrit, false, 'bond 45 does not crit at 0.11');
              assertEqual(calculateDamage(monB70, target, MOVES.tackle, { forceHit: true, fixedVariance: 1 }).isCrit, true, 'bond 70 raises crit to 12%');
            } finally {
              Math.random = origRand;
            }

            // Grove & Harmony badges
            assertEqual(BADGES.length, 24, '24 badges defined');
            const groveBadge = BADGES.find((b) => b.id === 'grove');
            const harmonyBadge = BADGES.find((b) => b.id === 'harmony');
            assert(Boolean(groveBadge && harmonyBadge), 'grove and harmony badges defined');
            assertEqual(groveBadge.check({ shrinesCleared: ['grove_shrine'], pokedex: { caught: {} } }), true, 'grove badge unlocks on grove_shrine');
            assertEqual(groveBadge.check({ shrinesCleared: [], pokedex: { caught: { 175: true, 252: 1, 447: 1 } } }), true, 'grove badge unlocks on 3 grove species');
            assertEqual(groveBadge.check({ shrinesCleared: [], pokedex: { caught: { 175: 1, 252: 0 } } }), false, 'grove badge ignores zero-count entries');
            assertEqual(harmonyBadge.check({ team: [{ bond: 60 }], box: [], pokedex: { caught: {} } }), true, 'harmony badge unlocks at bond 60');
            const caught35 = Object.fromEntries(Object.keys(SPECIES).slice(0, 35).map((id) => [id, 1]));
            assertEqual(harmonyBadge.check({ team: [], box: [], pokedex: { caught: caught35 } }), true, 'harmony badge unlocks at 35 species');

            // Storage: Kirlia->Gallade split evo + cheerPokemon + persistence
            const TEST_KEY = 'starlight_pokemon_test_s26_v1';
            try {
              window.localStorage.removeItem(TEST_KEY);
              const store = new StorageManager(TEST_KEY);
              store.selectTrainer('violet');
              store.chooseStarter(1);
              const profile = store.getActiveProfile();

              const missingCheer = store.cheerPokemon('missing-uid');
              assertEqual(missingCheer.cheered, false, 'cheerPokemon rejects unknown uid');

              const starter = profile.team[0];
              assertEqual(starter.bond, 20, 'starter starts at bond 20');
              for (let step = 1; step <= 4; step++) {
                const cheerRes = store.cheerPokemon(starter.uid);
                assertEqual(cheerRes.cheered, true, `cheer #${step} succeeds`);
                assertEqual(cheerRes.bond, 20 + step * 10, `bond incremented to ${20 + step * 10}`);
              }
              assertEqual(starter.bond, 60, '4 cheers bring bond 20 -> 60');
              assert(profile.badges.includes('harmony'), 'harmony badge unlocked on cheering to bond 60');

              const kirlia = createPokemon(281, 16, 'cave');
              store.recordCaught(kirlia);
              store.addGem('astral_gem', 1);
              const itemOpts = kirlia.getAvailableItemEvolutions({ moon_gem: 1, astral_gem: 1 });
              assertEqual(itemOpts.find((o) => o.toId === 282)?.canUse, true, 'Kirlia split evo Gardevoir available');
              assertEqual(itemOpts.find((o) => o.toId === 475)?.canUse, true, 'Kirlia split evo Gallade available');
              const galladeRes = store.evolvePokemon(kirlia.uid, 475, 'astral_gem');
              assert(Boolean(galladeRes?.evolution), 'Kirlia -> Gallade evolution succeeded');
              assertEqual(kirlia.speciesId, 475, 'Kirlia evolved into Gallade #475');
              assertEqual(profile.bag.gems.astral_gem, 0, 'astral_gem consumed');
              assert(Boolean(profile.pokedex.caught[475]), 'Gallade #475 recorded in Dex');

              // Post-shrine roaming encounters (#144, #145, #146, #151, #385) without mutating BIOMES
              const baseEncCounts = {
                volcano: BIOMES.volcano.encounters.length,
                peak: BIOMES.peak.encounters.length,
                grove: BIOMES.grove.encounters.length,
              };
              const sweepRolls = (biomeId, prof) => {
                const seen = new Set();
                try {
                  for (let i = 0; i < 250; i++) {
                    Math.random = () => (i + 0.5) / 250;
                    seen.add(rollWildPokemon(biomeId, prof, { forceShiny: false, forceElite: false }).speciesId);
                  }
                } finally {
                  Math.random = origRand;
                }
                return seen;
              };

              const unshrineProfile = { team: [{ level: 20 }], badges: [], shrinesCleared: [] };
              const noRoamVolcano = sweepRolls('volcano', unshrineProfile);
              const noRoamPeak = sweepRolls('peak', unshrineProfile);
              const noRoamGrove = sweepRolls('grove', unshrineProfile);
              assert(!noRoamVolcano.has(145) && !noRoamVolcano.has(146), 'no Zapdos/Moltres roamer before shrines');
              assert(!noRoamPeak.has(144) && !noRoamPeak.has(151), 'no Articuno/Mew roamer before shrines');
              assert(!noRoamGrove.has(385), 'no Jirachi roamer before grove_shrine');

              const clearedProfile = {
                team: [{ level: 24 }],
                badges: [],
                shrinesCleared: ['volcano_shrine', 'thunder_shrine', 'peak_shrine', 'starlight_shrine', 'grove_shrine'],
              };
              const roamVolcano = sweepRolls('volcano', clearedProfile);
              const roamPeak = sweepRolls('peak', clearedProfile);
              const roamGrove = sweepRolls('grove', clearedProfile);
              assert(roamVolcano.has(146), 'volcano_shrine unlocks roaming Moltres #146 in volcano');
              assert(roamVolcano.has(145), 'thunder_shrine unlocks roaming Zapdos #145 in volcano');
              assert(roamPeak.has(144), 'peak_shrine unlocks roaming Articuno #144 in peak');
              assert(roamPeak.has(151), 'starlight_shrine unlocks roaming Mew #151 in peak');
              assert(roamGrove.has(385), 'grove_shrine unlocks roaming Jirachi #385 in grove');

              assertEqual(BIOMES.volcano.encounters.length, baseEncCounts.volcano, 'BIOMES.volcano.encounters not mutated');
              assertEqual(BIOMES.peak.encounters.length, baseEncCounts.peak, 'BIOMES.peak.encounters not mutated');
              assertEqual(BIOMES.grove.encounters.length, baseEncCounts.grove, 'BIOMES.grove.encounters not mutated');
            } finally {
              Math.random = origRand;
              window.localStorage.removeItem(TEST_KEY);
            }
          },
        },
        {
          name: '84x72 Celestial Grove BFS reachability (16 shrines, 28 chests, 19 NPCs, 13 rivals, 16 landmarks, 14 signposts) & lossless v1/v2 migration hold',
          fn() {
            assertEqual(WORLD_COLS, 84, 'WORLD_COLS === 84');
            assertEqual(WORLD_ROWS, 72, 'WORLD_ROWS === 72');
            assertEqual(WORLD_MAP.length, 72, 'WORLD_MAP has 72 rows');
            for (let y = 0; y < WORLD_ROWS; y++) {
              assertEqual(WORLD_MAP[y].length, 84, `row ${y} width === 84`);
            }

            assertEqual(getBiomeAt(8, 15).id, 'village', 'spawn remains village');
            assertEqual(getBiomeAt(8, 35).id, 'water', 'row 35 west remains water');
            assertEqual(getBiomeAt(35, 35).id, 'peak', 'row 35 east remains peak');
            assertEqual(getBiomeAt(8, 38).id, 'grove', 'row 38+ is grove');
            assertEqual(getBiomeAt(46, 41).id, 'grove', 'grove_shrine is in grove');

            assertEqual(Object.keys(SHRINES).length, 16, '16 shrines');
            assertEqual(Object.keys(CHESTS).length, 28, '28 chests');
            assertEqual(Object.keys(NPCS).length, 19, '19 NPCs');
            assertEqual(FIELD_QUESTS.length, 19, '19 quests');
            assertEqual(Object.keys(RIVAL_TRAINERS).length, 13, '13 rivals');
            assertEqual(Object.keys(LANDMARKS).length, 16, '16 landmarks');
            assertEqual(Object.keys(SIGNPOSTS).length, 14, '14 signposts');

            const visited = new Set([`${GAME_META.spawn.x},${GAME_META.spawn.y}`]);
            const queue = [[GAME_META.spawn.x, GAME_META.spawn.y]];
            for (let head = 0; head < queue.length; head++) {
              const [cx, cy] = queue[head];
              for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
                const nx = cx + dx;
                const ny = cy + dy;
                const key = `${nx},${ny}`;
                if (!visited.has(key) && isTileWalkableAt(nx, ny)) {
                  visited.add(key);
                  queue.push([nx, ny]);
                }
              }
            }

            const hasAdj = (coordKey) => {
              const [x, y] = coordKey.split(',').map(Number);
              return [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => visited.has(`${x + dx},${y + dy}`));
            };

            for (const [k, s] of Object.entries(SHRINES)) {
              const [sx, sy] = k.split(',').map(Number);
              assertEqual(WORLD_MAP[sy][sx], TILE.SHRINE, `shrine ${s.id} on TILE.SHRINE`);
              assertEqual(hasAdj(k), true, `shrine ${s.id} at ${k} reachable`);
            }
            for (const [k, c] of Object.entries(CHESTS)) {
              const [cx, cy] = k.split(',').map(Number);
              assertEqual(WORLD_MAP[cy][cx], TILE.CHEST, `chest ${c.id} on TILE.CHEST`);
              assertEqual(hasAdj(k), true, `chest ${c.id} at ${k} reachable`);
            }
            for (const [k, n] of Object.entries(NPCS)) {
              assertEqual(hasAdj(k), true, `NPC ${n.id} at ${k} reachable`);
            }
            for (const [k, r] of Object.entries(RIVAL_TRAINERS)) {
              assertEqual(hasAdj(k), true, `Rival ${r.id} at ${k} reachable`);
            }
            for (const [k, l] of Object.entries(LANDMARKS)) {
              assertEqual(hasAdj(k), true, `Landmark ${l.id} at ${k} reachable`);
            }
            for (const k of Object.keys(SIGNPOSTS)) {
              const [sx, sy] = k.split(',').map(Number);
              assertEqual(WORLD_MAP[sy][sx], TILE.SIGN, `Signpost at ${k} on TILE.SIGN`);
              assertEqual(hasAdj(k), true, `Signpost at ${k} reachable`);
            }

            // Both gateways into Celestial Grove and the Grove Healing Fountain are reachable
            assertEqual(visited.has('8,38'), true, 'West Lagoon Causeway reaches Celestial Grove (8,38)');
            assertEqual(visited.has('34,38'), true, 'Peak Rune Gateway reaches Celestial Grove (34,38)');
            assertEqual(WORLD_MAP[41][25], TILE.HEAL, 'Celestial Grove Healing Fountain at (25,41)');
            assertEqual(visited.has('25,41'), true, 'Celestial Grove Healing Fountain reachable');

            const compass = getCompassGuidance({
              shrinesCleared: [
                'forest_shrine', 'cave_shrine', 'water_shrine', 'volcano_shrine',
                'peak_shrine', 'thunder_shrine', 'eclipse_shrine', 'starlight_shrine',
              ],
              pokedex: { caught: {} },
            }, SPECIES);
            assertEqual(compass.targetBiomeId, 'grove', 'Compass guides to Celestial Grove after prior 8 shrines');
            assert(compass.title.includes('Grove'), `Compass title mentions Grove, got "${compass.title}"`);

            // Lossless v1/v2 save migration on STORAGE_KEY
            assertEqual(STORAGE_KEY, 'starlight_pokemon_save_v1', 'STORAGE_KEY stays starlight_pokemon_save_v1');
            const TEST_KEY = 'starlight_pokemon_test_s26_mig_v1';
            try {
              window.localStorage.setItem(TEST_KEY, JSON.stringify({
                version: 1,
                activeTrainerId: 'violet',
                profiles: {
                  violet: {
                    trainerId: 'violet',
                    starterId: 1,
                    pos: { x: 25, y: 41, dir: 'up' }, // Grove fountain
                    team: [{ uid: 'v1-bulba', speciesId: 1, level: 9, xp: 20, hp: 31 }],
                    bag: { potions: 4, greatBalls: 2 },
                  },
                  ozias: {
                    trainerId: 'ozias',
                    starterId: 4,
                    pos: { x: 8, y: 40, dir: 'down' },
                    team: [{ uid: 'v2-char', speciesId: 4, level: 12, xp: 5, hp: 35, bond: 72, upgradeTier: 2 }],
                    bag: { potions: 3, greatBalls: 1, starBalls: 2, starShards: 7, gems: { moon_gem: 1 } },
                  },
                },
              }));
              const migrated = new StorageManager(TEST_KEY);
              assertEqual(migrated.state.version, 2, 'migrated save keeps version === 2');
              const mv = migrated.getProfile('violet');
              const mo = migrated.getProfile('ozias');
              assertEqual(mv.pos.x, 25, 'Grove position x preserved');
              assertEqual(mv.pos.y, 41, 'Grove position y preserved');
              assertEqual(mv.bag.gems.astral_gem, 0, 'v1 save hydrates astral_gem: 0');
              assertEqual(mv.team[0].bond, 20, 'v1 mon hydrates default bond 20');
              assertEqual(mo.bag.gems.astral_gem, 0, 'v2 save hydrates astral_gem: 0');
              assertEqual(mo.bag.gems.moon_gem, 1, 'v2 save preserves moon_gem');
              assertEqual(mo.team[0].bond, 72, 'v2 mon preserves bond 72');
              assertEqual(mo.team[0].upgradeTier, 2, 'v2 mon preserves upgradeTier 2');
              const safeGrove = sanitizePosition({ x: 8, y: 40, dir: 'down' });
              assertEqual(safeGrove.x, 8, 'sanitizePosition keeps walkable Grove x');
              assertEqual(safeGrove.y, 40, 'sanitizePosition keeps walkable Grove y');
            } finally {
              window.localStorage.removeItem(TEST_KEY);
            }
          },
        },
      ],
    },
    {
      name: '27. Sprint 5 Combat Choreographies, Grove Audio/Backdrop, Buddy Endure & Bug Fixes',
      tests: [
        {
          name: '8 move choreographies, THEMES.grove, Grove backdrop, forceBuddyEndure 1-HP survival, 0-PP Struggle, rematchWinText & Cheer/Dex UI hold',
          async fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            // 1. AudioEngine: THEMES.grove gains <= 0.12 + 8 new playElemental SFX + playBuddyCheer/Endure
            assert(Boolean(THEMES.grove), 'THEMES.grove exists');
            assert(THEMES.grove.melody.length >= 64, 'THEMES.grove melody >= 64 steps');
            assertInRange(THEMES.grove.leadGain, 0, 0.12, 'grove.leadGain <= 0.12');
            assertInRange(THEMES.grove.arpGain, 0, 0.12, 'grove.arpGain <= 0.12');
            assertInRange(THEMES.grove.bassGain, 0, 0.12, 'grove.bassGain <= 0.12');

            const testAudio = new AudioEngine({ silent: true, attachUnlockListeners: false });
            try {
              const ctx = testAudio.ensureContext();
              if (ctx) {
                assertInRange(testAudio.masterFilter.frequency.value, 900, 1300, 'masterFilter cutoff in 900-1300Hz');
              }
              await Promise.race([testAudio.unlock(), new Promise((r) => setTimeout(r, 150))]);
              testAudio.playBGM('grove');
              testAudio.playBuddyCheer();
              testAudio.playBuddyEndure();
              for (const mvId of ['leaf_blade', 'eruption_flare', 'aura_sphere', 'psycho_cut', 'aqua_tail', 'draco_meteor', 'omen_wind', 'doom_desire']) {
                testAudio.playElemental(MOVES[mvId].type, mvId);
              }
              testAudio.stopBGM();
            } finally {
              await testAudio.destroy();
            }

            // 2. BattleEngine: Grove backdrop, 8 move choreographies, forceBuddyEndure 1-HP survival, 0-PP Struggle & Bond XP
            const TEST_KEY = 'starlight_pokemon_test_s27_v1';
            const noopAudio = {
              playMenuBlip() {},
              playCursorMove() {},
              playMoveSelect() {},
              playWindup() {},
              playPhysicalImpact() {},
              playElemental() {},
              playShieldChime() {},
              playHealChime() {},
              playFaint() {},
              playLevelUp() {},
              playPokeballThrow() {},
              playPokeballAbsorb() {},
              playPokeballBounce() {},
              playPokeballWobble() {},
              playCaptureSuccess() {},
              playStarBallShimmer() {},
              playXpTick() {},
              playShinySparkle() {},
              playBuddyCheer() {},
              playBuddyEndure() {},
            };
            const waitUntil = async (engine, pred, timeoutMs = 5000) => {
              const start = performance.now();
              while (!pred()) {
                if (engine.typingResolve) engine.finishTypewriter();
                if (performance.now() - start > timeoutMs) {
                  throw new Error(`Timed out waiting (state=${engine.state}, busy=${engine.busy})`);
                }
                await new Promise((r) => setTimeout(r, 15));
              }
            };

            let engine = null;
            const origRand = Math.random;
            const prevRawSave = window.localStorage.getItem(STORAGE_KEY);
            const wasBootHidden = app.bootScreenEl.hidden;
            const wasStarterHidden = app.starterScreenEl.hidden;
            const wasShellHidden = app.gameShellEl.hidden;
            const wasOverworldActive = app.overworld.active;

            try {
              window.localStorage.removeItem(TEST_KEY);
              const store = new StorageManager(TEST_KEY);
              store.updateSettings({ battlePace: 'fast' });
              store.selectTrainer('violet');
              store.chooseStarter(1);
              const vp = store.getActiveProfile();

              const lead = createPokemon(475, 22, 'grove', { bond: 65 }); // Gallade Trusted Buddy
              const benchMate = createPokemon(175, 10, 'grove', { bond: 20 });
              vp.team = [lead, benchMate];

              engine = new BattleEngine({
                storage: store,
                audio: noopAudio,
                onBattleEnd() {},
                onBadgesUnlocked() {},
                onHudRefresh() {},
              });

              const enemy = createPokemon(468, 30, 'grove');
              const startP = engine.start({ enemy, biomeId: 'grove' });
              await waitUntil(engine, () => engine.state === BATTLE_STATES.PLAYER_INPUT);
              await startP;

              const stageEl = document.getElementById('battle-stage');
              assertEqual(stageEl.dataset.biome, 'grove', 'battle-stage data-biome is grove');
              const skyBg = window.getComputedStyle(stageEl.querySelector('.scenery-sky')).backgroundImage;
              assert(Boolean(skyBg && skyBg !== 'none'), 'grove stage sky background gradient rendered');

              // Exercise all 8 Sprint 5 move choreographies
              for (const mvId of ['leaf_blade', 'eruption_flare', 'aura_sphere', 'psycho_cut', 'aqua_tail', 'draco_meteor', 'omen_wind', 'doom_desire']) {
                const mv = MOVES[mvId];
                const fakeRes = { category: 'attack', damage: 22, heal: 0, effectiveness: 1, isCrit: false, missed: false };
                await engine.playAttackVisual('player', 'enemy', mv, fakeRes, engine.enemy, engine.sessionId);
              }

              // Deterministic 1-HP Buddy Endure survival at bond >= 60
              lead.hp = 5;
              engine.playerBuddyEndured = false;
              engine.forceBuddyEndure = true;
              const fastTypeTimer = setInterval(() => engine.finishTypewriter(), 15);
              try {
                Math.random = () => 0.5;
                await engine.executeMoveAction('enemy', MOVES.doom_desire, engine.sessionId);
              } finally {
                clearInterval(fastTypeTimer);
                Math.random = origRand;
              }
              assertEqual(lead.hp, 1, 'forceBuddyEndure clamped player HP to 1');
              assertEqual(engine.playerBuddyEndured, true, 'playerBuddyEndured flagged true');
              assertEqual(lead.isFainted, false, 'player survived lethal blow at 1 HP');
              assertEqual(engine.active, true, 'battle remains active after Buddy Endure');
              assert(
                (document.getElementById('battle-log')?.textContent || '').includes('1 HP'),
                'battle log announces Buddy Endure 1 HP survival',
              );

              // Enemy PP consumption & 0-PP Struggle fallback
              const firstEnemyMove = enemy.getMoveObjects()[0];
              const ppBefore = enemy.getMovePp(firstEnemyMove.id).current;
              lead.hp = lead.maxHp;
              const ppTimer = setInterval(() => engine.finishTypewriter(), 15);
              try {
                Math.random = () => 0.5;
                await engine.executeMoveAction('enemy', firstEnemyMove, engine.sessionId);
              } finally {
                clearInterval(ppTimer);
                Math.random = origRand;
              }
              assertEqual(enemy.getMovePp(firstEnemyMove.id).current, ppBefore - 1, 'enemy move consumes 1 PP');

              for (const m of enemy.getMoveObjects()) {
                enemy.movePp[m.id] = 0;
              }
              const struggleMove = engine.chooseEnemyMove();
              assert(Boolean(struggleMove), 'chooseEnemyMove returns fallback when all moves 0 PP');
              assertEqual(struggleMove.name, 'Struggle', '0-PP fallback move is Struggle');
              assertEqual(struggleMove._isStruggle, true, '0-PP fallback marks _isStruggle: true');

              // Bond XP multiplier & conscious bench +2 bond on victory
              const highBondLead = createPokemon(475, 30, 'grove', { bond: 90 }); // Best Buddy 1.20x
              const benchBefore = benchMate.bond;
              engine.player = highBondLead;
              engine.enemy = createPokemon(175, 10, 'grove');
              vp.team = [highBondLead, benchMate];
              const xpTimer = setInterval(() => engine.finishTypewriter(), 15);
              try {
                await engine.awardVictoryXp(1.0, engine.sessionId, { deferBadges: true });
              } finally {
                clearInterval(xpTimer);
              }
              const expectedXp = Math.round((10 * 14 + 12) * 1.0 * 1.20);
              assertEqual(highBondLead.xp, expectedXp, `bond 90 applies 1.20x XP mult (${expectedXp})`);
              assertEqual(benchMate.bond, benchBefore + 2, 'conscious bench mate gains +2 bond on victory');

              engine.stop({ outcome: 'escaped', faintedAll: false });
              engine.destroy();
              engine = null;

              // 3. GameApp.handleBattleEnd rematchWinText fix + Team .cheer-btn + Dex grove filter pill
              window.localStorage.removeItem(STORAGE_KEY);
              storage.state = storage.load();
              storage.selectTrainer('violet');
              storage.chooseStarter(1);
              const liveProfile = storage.getActiveProfile();
              app.bootScreenEl.hidden = true;
              app.starterScreenEl.hidden = true;
              app.gameShellEl.hidden = false;
              app.overworld.setActive(true);
              app.applyTrainerTheme('violet');

              const kieran = Object.values(RIVAL_TRAINERS).find((r) => r.id === 'rival_kieran');
              assert(Boolean(kieran && kieran.rematchWinText), 'rival_kieran has rematchWinText');

              // First win shows winText
              app.handleBattleEnd({
                outcome: 'won',
                isTrainer: true,
                trainerData: { ...kieran, isRematch: false },
              });
              const firstDlg = document.getElementById('world-dialogue-text')?.textContent || '';
              assert(
                firstDlg.includes(kieran.winText.replace('{trainer}', 'Violet')),
                `First win uses winText, got "${firstDlg}"`,
              );
              app.closeDialogue();

              // Rematch uses rematchWinText
              app.handleBattleEnd({
                outcome: 'won',
                isTrainer: true,
                trainerData: { ...kieran, isRematch: true },
              });
              const rematchDlg = document.getElementById('world-dialogue-text')?.textContent || '';
              assert(
                rematchDlg.includes(kieran.rematchWinText.replace('{trainer}', 'Violet')),
                `Rematch uses rematchWinText, got "${rematchDlg}"`,
              );
              assert(
                !rematchDlg.includes(kieran.winText.replace('{trainer}', 'Violet')),
                'Rematch does not fall back to first-win winText',
              );
              app.closeDialogue();

              // Grove Dex filter pill
              app.openPokedex('dex');
              const grovePill = document.querySelector('.dex-filter-pill[data-filter="grove"]');
              assert(Boolean(grovePill), 'grove Dex filter pill rendered');
              grovePill.click();
              const groveCards = Array.from(document.querySelectorAll('.dex-grid .dex-card'));
              assert(groveCards.length > 0 && groveCards.length < 649, `Grove filter narrows cards (${groveCards.length})`);
              for (const card of groveCards) {
                const spId = Number(card.querySelector('.dex-num')?.textContent?.replace('#', '').trim());
                assertEqual(SPECIES[spId]?.biome, 'grove', `Grove filtered card #${spId} belongs to grove biome`);
              }

              // Team .cheer-btn UI raises Bond & unlocks harmony badge
              app.openPokedex('team');
              const cheerBtn = document.querySelector('.team-card .cheer-btn');
              assert(Boolean(cheerBtn), 'Team card renders .cheer-btn');
              for (let i = 0; i < 4; i++) {
                document.querySelector('.team-card .cheer-btn')?.click();
              }
              assertEqual(liveProfile.team[0].bond, 60, '4 UI cheer clicks raise bond 20 -> 60');
              assert(Boolean(document.querySelector('.evo-celebration-banner')), 'Cheer renders celebration banner');
              assert(
                (document.querySelector('.team-card .bond-badge')?.textContent || '').includes('Trusted Buddy'),
                'Team bond badge updates to Trusted Buddy',
              );
              assert(liveProfile.badges.includes('harmony'), 'UI cheering unlocks harmony badge');
              app.pokedex.close();
            } finally {
              Math.random = origRand;
              engine?.destroy();
              window.localStorage.removeItem(TEST_KEY);
              clearTimeout(app.badgeToastTimer);
              if (app.badgeToastEl) app.badgeToastEl.hidden = true;
              app.closeDialogue();
              app.pokedex.close();
              if (prevRawSave === null) {
                window.localStorage.removeItem(STORAGE_KEY);
              } else {
                window.localStorage.setItem(STORAGE_KEY, prevRawSave);
              }
              storage.state = storage.load();
              app.bootScreenEl.hidden = wasBootHidden;
              app.starterScreenEl.hidden = wasStarterHidden;
              app.gameShellEl.hidden = wasShellHidden;
              app.overworld.setActive(wasOverworldActive);
              if (!wasOverworldActive) {
                app.audio?.stopBGM?.();
              }
              if (!wasBootHidden) {
                app.showBootScreen();
              } else {
                app.refreshHud();
              }
              app.syncControlVisibility();
              app.syncOverworldPause();
            }
          },
        },
      ],
    },
    {
      name: '28. Installable PWA: Manifest, Raster PNG Binary Validation, Service Worker & Install Prompt UI',
      tests: [
        {
          name: 'Manifest, real PNG signatures & IHDR dimensions (192/512/180), <head> links, SW handlers/registration, beforeinstallprompt & 1280x720/1024x768 layout pass',
          async fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            // 1. <head> PWA tags
            const manifestLink = document.querySelector('link[rel="manifest"]');
            const appleIconLink = document.querySelector('link[rel="apple-touch-icon"]');
            const themeMeta = document.querySelector('meta[name="theme-color"]');
            assertEqual(manifestLink?.getAttribute('href'), './manifest.json', 'link[rel="manifest"] points to ./manifest.json');
            assertEqual(appleIconLink?.getAttribute('href'), './assets/icons/apple-touch-icon.png', 'link[rel="apple-touch-icon"] points to ./assets/icons/apple-touch-icon.png');
            assertEqual(themeMeta?.getAttribute('content'), '#090d1a', 'meta[name="theme-color"] is #090d1a');

            // 2. manifest.json validation
            const manResp = await fetch('./manifest.json');
            assertEqual(manResp.ok, true, 'manifest.json fetches HTTP 200');
            const manifest = await manResp.json();
            assertEqual(manifest.display, 'standalone', 'manifest.display === "standalone"');
            assertEqual(manifest.start_url, './', 'manifest.start_url === "./"');
            assertEqual(manifest.scope, './', 'manifest.scope === "./"');
            assertEqual(manifest.background_color, '#090d1a', 'manifest.background_color === #090d1a');
            assertEqual(manifest.theme_color, manifest.background_color, 'manifest.theme_color matches background_color');
            const icon192 = manifest.icons?.find((ic) => ic.sizes === '192x192');
            const icon512 = manifest.icons?.find((ic) => ic.sizes === '512x512');
            assert(Boolean(icon192 && icon512), 'manifest has 192x192 and 512x512 icons');
            assert(icon192.purpose?.includes('any') && icon192.purpose?.includes('maskable'), '192x192 icon purpose includes any maskable');
            assert(icon512.purpose?.includes('any') && icon512.purpose?.includes('maskable'), '512x512 icon purpose includes any maskable');

            // 3. Binary PNG signature (0x89 50 4E 47 0D 0A 1A 0A), IHDR chunk, dimensions & Image decode
            const pngChecks = [
              ['./assets/icons/icon-192.png', 192, 192],
              ['./assets/icons/icon-512.png', 512, 512],
              ['./assets/icons/apple-touch-icon.png', 180, 180],
            ];
            const PNG_SIG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
            for (const [iconUrl, expW, expH] of pngChecks) {
              const resp = await fetch(iconUrl);
              assertEqual(resp.ok, true, `${iconUrl} fetched OK`);
              const buf = await resp.arrayBuffer();
              assertGreater(buf.byteLength, 24, `${iconUrl} non-empty PNG`);
              const bytes = new Uint8Array(buf);
              for (let i = 0; i < PNG_SIG.length; i++) {
                assertEqual(bytes[i], PNG_SIG[i], `${iconUrl} PNG signature byte ${i}`);
              }
              const ihdr = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
              assertEqual(ihdr, 'IHDR', `${iconUrl} first chunk is IHDR`);
              const view = new DataView(buf);
              assertEqual(view.getUint32(16, false), expW, `${iconUrl} IHDR width === ${expW}`);
              assertEqual(view.getUint32(20, false), expH, `${iconUrl} IHDR height === ${expH}`);

              const decoded = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
                img.onerror = () => reject(new Error(`Failed to decode PNG image ${iconUrl}`));
                img.src = `${iconUrl}?v=${Date.now()}`;
              });
              assertEqual(decoded.w, expW, `${iconUrl} naturalWidth === ${expW}`);
              assertEqual(decoded.h, expH, `${iconUrl} naturalHeight === ${expH}`);
            }

            // 4. Service Worker source & live registration check
            const swResp = await fetch('./sw.js');
            assertEqual(swResp.ok, true, 'sw.js fetches HTTP 200');
            const swSrc = await swResp.text();
            assert(swSrc.includes("addEventListener('install'"), 'sw.js has install listener');
            assert(swSrc.includes("addEventListener('activate'"), 'sw.js has activate listener');
            assert(swSrc.includes('caches.delete'), 'sw.js cleans old caches on activate');
            assert(swSrc.includes("addEventListener('fetch'"), 'sw.js has fetch listener');
            assert(swSrc.includes('networkFirstShell'), 'sw.js implements network-first shell handler');
            assert('serviceWorker' in navigator, 'navigator.serviceWorker available');
            if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
              const reg = await window.__starlightSwRegistration;
              assert(Boolean(reg && reg.scope), 'Service worker registered cleanly on HTTP origin');
            }

            // 5. beforeinstallprompt flow, dismiss, standalone suppression & 1280x720 / 1024x768 layout
            const prevRawSave = window.localStorage.getItem(STORAGE_KEY);
            const wasBootHidden = app.bootScreenEl.hidden;
            const wasStarterHidden = app.starterScreenEl.hidden;
            const wasShellHidden = app.gameShellEl.hidden;
            const wasOverworldActive = app.overworld.active;
            const origDeferred = app.deferredInstallPrompt;
            const origDismissed = app.installPromptDismissed;
            const origCabinetStyle = app.cabinetEl?.getAttribute('style') ?? null;

            try {
              const bootBanner = document.getElementById('pwa-install-banner');
              const hudInstall = document.getElementById('hud-install-group');
              const settingInstallRow = document.getElementById('setting-install-row');
              assert(Boolean(bootBanner && hudInstall && settingInstallRow), 'all 3 PWA install UI containers exist');

              app.deferredInstallPrompt = null;
              app.installPromptDismissed = false;
              app.syncInstallBanner();
              assertEqual(bootBanner.hidden, true, 'boot install banner hidden initially');
              assertEqual(hudInstall.hidden, true, 'HUD install group hidden initially');
              assertEqual(settingInstallRow.hidden, true, 'Settings install row hidden initially');

              let promptCalls = 0;
              const makePromptEvent = () => {
                const ev = new Event('beforeinstallprompt', { cancelable: true });
                ev.prompt = async () => {
                  promptCalls += 1;
                  return { outcome: 'accepted' };
                };
                ev.userChoice = Promise.resolve({ outcome: 'accepted' });
                return ev;
              };

              const ev1 = makePromptEvent();
              window.dispatchEvent(ev1);
              assertEqual(ev1.defaultPrevented, true, 'beforeinstallprompt defaultPrevented');
              assertEqual(bootBanner.hidden, false, 'boot install banner unhides on beforeinstallprompt');
              assertEqual(hudInstall.hidden, false, 'HUD install group unhides on beforeinstallprompt');
              assertEqual(settingInstallRow.hidden, false, 'Settings install row unhides on beforeinstallprompt');

              // Dismiss hides cleanly
              document.getElementById('pwa-install-dismiss').click();
              assertEqual(app.installPromptDismissed, true, 'dismiss sets installPromptDismissed');
              assertEqual(bootBanner.hidden, true, 'boot install banner hides on dismiss');
              assertEqual(hudInstall.hidden, true, 'HUD install group hides on dismiss');
              assertEqual(settingInstallRow.hidden, true, 'Settings install row hides on dismiss');

              // Tapping install invokes .prompt() and hides afterward
              app.installPromptDismissed = false;
              window.dispatchEvent(makePromptEvent());
              assertEqual(bootBanner.hidden, false, 'boot banner visible before install tap');
              document.getElementById('pwa-install-btn').click();
              await new Promise((r) => setTimeout(r, 30));
              assertEqual(promptCalls, 1, 'tapping install invokes .prompt()');
              assertEqual(bootBanner.hidden, true, 'install banner hides after .prompt()');

              // Standalone mode suppresses install UI
              app.installPromptDismissed = false;
              app.isStandaloneMode = () => true;
              window.dispatchEvent(makePromptEvent());
              assertEqual(bootBanner.hidden, true, 'standalone mode suppresses boot install banner');
              assertEqual(hudInstall.hidden, true, 'standalone mode suppresses HUD install group');
              assertEqual(settingInstallRow.hidden, true, 'standalone mode suppresses Settings install row');
              delete app.isStandaloneMode;

              // 1280x720 & 1024x768 layout non-overlap check with HUD install pill visible + Grove battle
              window.localStorage.removeItem(STORAGE_KEY);
              storage.state = storage.load();
              storage.selectTrainer('violet');
              storage.chooseStarter(1);
              storage.getActiveProfile().team[0] = createPokemon(35, 16, 'grove', { upgradeTier: 3 });

              app.bootScreenEl.hidden = true;
              app.starterScreenEl.hidden = true;
              app.gameShellEl.hidden = false;
              app.overworld.setActive(true);
              app.applyTrainerTheme('violet');

              app.installPromptDismissed = false;
              window.dispatchEvent(makePromptEvent());
              assertEqual(hudInstall.hidden, false, 'HUD install pill visible during layout check');

              const startBattleP = app.battle.start({
                enemy: createPokemon(385, 20, 'grove', { isElite: true, upgradeTier: 2 }),
                biomeId: 'grove',
              });
              app.syncControlVisibility();
              const fastTimer = setInterval(() => app.battle.finishTypewriter(), 15);
              try {
                await startBattleP;
              } finally {
                clearInterval(fastTimer);
              }

              const overlaps = (a, b) => !(
                a.right <= b.left ||
                a.left >= b.right ||
                a.bottom <= b.top ||
                a.top >= b.bottom
              );

              for (const [label, w, h] of [
                ['Chromebook 1280x720', 940, Math.round(720 * 0.985)],
                ['Tablet 1024x768', 940, Math.round(768 * 0.985)],
              ]) {
                app.cabinetEl.style.width = `${w}px`;
                app.cabinetEl.style.height = `${h}px`;
                await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

                const hudBar = document.querySelector('.hud-bar');
                assert(
                  hudBar.scrollWidth <= hudBar.clientWidth + 2,
                  `${label}: HUD bar overflows horizontally (${hudBar.scrollWidth} > ${hudBar.clientWidth})`,
                );

                const enemyCard = document.querySelector('.status-card-enemy').getBoundingClientRect();
                const playerSprite = document.querySelector('.fighter-sprite-player').getBoundingClientRect();
                const playerCard = document.querySelector('.status-card-player').getBoundingClientRect();
                const enemySprite = document.querySelector('.fighter-sprite-enemy').getBoundingClientRect();
                assertEqual(overlaps(enemyCard, playerSprite), false, `${label}: enemyCard overlaps Clefairy`);
                assertEqual(overlaps(playerCard, enemySprite), false, `${label}: playerCard overlaps Jirachi`);
              }

              app.battle.stop({ outcome: 'escaped', faintedAll: false });
            } finally {
              delete app.isStandaloneMode;
              app.deferredInstallPrompt = origDeferred;
              app.installPromptDismissed = origDismissed;
              app.syncInstallBanner();
              if (origCabinetStyle === null) {
                app.cabinetEl?.removeAttribute('style');
              } else {
                app.cabinetEl?.setAttribute('style', origCabinetStyle);
              }
              if (app.battle.active) {
                app.battle.stop({ outcome: 'escaped', faintedAll: false });
              }
              app.pokedex.close();
              app.closeSettings();
              if (prevRawSave === null) {
                window.localStorage.removeItem(STORAGE_KEY);
              } else {
                window.localStorage.setItem(STORAGE_KEY, prevRawSave);
              }
              storage.state = storage.load();
              app.applyTrainerTheme(storage.getActiveTrainerId() || 'violet');
              app.encounterTransitioning = false;
              app.bootScreenEl.hidden = wasBootHidden;
              app.starterScreenEl.hidden = wasStarterHidden;
              app.gameShellEl.hidden = wasShellHidden;
              app.overworld.setActive(wasOverworldActive);
              if (!wasOverworldActive) {
                app.audio?.stopBGM?.();
              }
              app.applySettings();
              if (!wasBootHidden) {
                app.showBootScreen();
              } else {
                app.refreshHud();
              }
              app.syncControlVisibility();
              app.syncOverworldPause();
            }
          },
        },
      ],
    },
    {
      name: '29. Sprint 6 Roster (649), 308+ Evolutions, Prism Gem, 28 Abilities & Zero-Count Fixes',
      tests: [
        {
          name: '649 species, 100 moves (+16), 12 gems (+prism_gem), 308+ evolution edges, 100% reachability & #361 order hold',
          fn() {
            const allSpecies = Object.values(SPECIES);
            assertEqual(allSpecies.length, 649, '649 species defined');
            assertEqual(Object.keys(MOVES).length, 100, '100 moves defined');
            assertEqual(Object.keys(ABILITIES).length, 28, '28 abilities defined');
            assertEqual(Object.keys(EVOLUTION_ITEMS).length, 12, '12 evolution gems defined');
            assertEqual(EVOLUTION_ITEMS.prism_gem?.id, 'prism_gem', 'prism_gem present');
            assertEqual(EVOLUTION_ITEMS.prism_gem?.icon, '💠', 'prism_gem icon');

            const sprint6Moves = [
              ['frenzy_flora', 'grass', 'special', 'attack', 'grass'],
              ['spore_burst', 'grass', 'special', 'attack', 'grass'],
              ['solar_blade', 'fire', 'physical', 'attack', 'fire'],
              ['fiery_dance', 'fire', 'special', 'attack', 'fire'],
              ['hydro_vortex', 'water', 'special', 'attack', 'water'],
              ['razor_shell', 'water', 'physical', 'attack', 'water'],
              ['plasma_cannon', 'electric', 'special', 'attack', 'electric'],
              ['volt_tackle', 'electric', 'physical', 'attack', 'electric'],
              ['sandstorm_crush', 'rock', 'physical', 'attack', 'rock'],
              ['prism_laser', 'psychic', 'special', 'attack', 'star'],
              ['zen_meteor', 'psychic', 'physical', 'attack', 'psychic'],
              ['icicle_spear', 'ice', 'physical', 'attack', 'ice'],
              ['spectral_lantern', 'ghost', 'special', 'attack', 'ghost'],
              ['night_daze', 'ghost', 'special', 'attack', 'ghost'],
              ['dragon_rush', 'dragon', 'physical', 'attack', 'dragon'],
              ['dune_aegis', 'rock', 'status', 'shield', 'shield'],
            ];
            for (const [id, type, dmgClass, category, fx] of sprint6Moves) {
              const mv = MOVES[id];
              assert(Boolean(mv), `MOVES.${id} defined`);
              assertEqual(mv.type, type, `${id}.type`);
              assertEqual(mv.damageClass, dmgClass, `${id}.damageClass`);
              assertEqual(mv.category, category, `${id}.category`);
              assertEqual(mv.fx, fx, `${id}.fx`);
            }

            const evoParents = Object.keys(EVOLUTIONS).length;
            const evoEdges = Object.values(EVOLUTIONS).reduce((sum, rules) => sum + rules.length, 0);
            assert(evoParents >= 140, `140+ evo parents (got ${evoParents})`);
            assert(evoEdges >= 150, `150+ evo edges (got ${evoEdges})`);

            // #361 Snorunt keeps Froslass (#478) first, Glalie (#362) second
            assertEqual(EVOLUTIONS[361]?.[0]?.to, 478, '#361 first rule is Froslass #478');
            assertEqual(EVOLUTIONS[361]?.[1]?.to, 362, '#361 second rule is Glalie #362');

            // Verify every species is #1..#649, has valid type, biome, ability & 4 valid moves
            for (const sp of allSpecies) {
              assertInRange(sp.id, 1, 649, `species #${sp.id} in National Dex #1..#649`);
              assert(Boolean(TYPES[sp.type]), `species #${sp.id} valid type`);
              assert(sp.biome === 'starter' || Boolean(BIOMES[sp.biome]), `species #${sp.id} valid biome ${sp.biome}`);
              assert(Boolean(ABILITIES[sp.ability]), `species #${sp.id} valid ability ${sp.ability}`);
              assertEqual(sp.movePool.length, 4, `species #${sp.id} has 4 moves`);
              for (const mvId of sp.movePool) {
                assert(Boolean(MOVES[mvId]), `species #${sp.id} move ${mvId} valid`);
              }
            }

            // Starters and core test fixtures kept off 'entry' trigger for deterministic fast battles
            for (const id of [1, 4, 7, 10, 16, 25]) {
              const ab = ABILITIES[SPECIES[id].ability];
              assert(ab.trigger !== 'entry', `species #${id} kept off entry ability (${ab.id})`);
            }

            // 100% species reachability BFS from starters + wild tables + shrines + post-shrine roamers + evolutions
            const reachable = new Set(STARTER_IDS.map(Number));
            for (const b of Object.values(BIOMES)) {
              for (const enc of b.encounters || []) reachable.add(Number(enc.id));
            }
            for (const sh of Object.values(SHRINES)) {
              reachable.add(Number(sh.guardianId));
            }
            for (const roamerId of [144, 145, 146, 151, 385, 248, 251, 384, 249, 243, 244, 382, 245, 483, 486, 493, 150, 250, 643, 644, 649]) {
              reachable.add(roamerId);
            }
            let changed = true;
            while (changed) {
              changed = false;
              for (const [fromKey, rules] of Object.entries(EVOLUTIONS)) {
                const fromId = Number(fromKey);
                assert(Boolean(SPECIES[fromId]), `evo parent #${fromId} exists`);
                for (const rule of rules) {
                  assert(Boolean(SPECIES[rule.to]), `evo target #${rule.to} exists`);
                  if (rule.item) assert(Boolean(EVOLUTION_ITEMS[rule.item]), `evo item ${rule.item} exists`);
                  if (reachable.has(fromId) && !reachable.has(rule.to)) {
                    reachable.add(rule.to);
                    changed = true;
                  }
                }
              }
            }
            const unreachable = allSpecies.map((s) => s.id).filter((id) => !reachable.has(id));
            assertEqual(unreachable.length, 0, `100% species reachable (unreachable: ${unreachable.join(',')})`);

            // Prism Gem evolutions across all 5 targets (112->464, 525->526, 82->462, 233->474, 356->477)
            const TEST_KEY = 'starlight_pokemon_test_s29_prism_v1';
            try {
              window.localStorage.removeItem(TEST_KEY);
              const store = new StorageManager(TEST_KEY);
              store.selectTrainer('violet');
              store.chooseStarter(1);
              store.addRewards({ gems: { prism_gem: 5 } });
              for (const [fromId, toId] of [[112, 464], [525, 526], [82, 462], [233, 474], [356, 477]]) {
                const mon = createPokemon(fromId, 20, 'sanctum');
                const opts = mon.getAvailableItemEvolutions({ prism_gem: 1 });
                assertEqual(opts.some((o) => o.toId === toId && o.item === 'prism_gem' && o.canUse), true, `#${fromId} -> #${toId} via prism_gem`);
                store.recordCaught(mon);
                const evoRes = store.evolvePokemon(mon.uid, toId, 'prism_gem');
                assert(Boolean(evoRes?.evolution), `evolvePokemon #${fromId} -> #${toId} succeeded`);
                assertEqual(mon.speciesId, toId, `evolved into #${toId}`);
              }
              assertEqual(store.getActiveProfile().bag.gems.prism_gem, 0, 'all 5 prism_gems consumed');
            } finally {
              window.localStorage.removeItem(TEST_KEY);
            }
          },
        },
        {
          name: '14 innate abilities, damage/entry/turn_end mechanics, post-shrine roamers & zero-count badge/quest fixes hold',
          fn() {
            const abilityUsage = new Map(Object.keys(ABILITIES).map((id) => [id, []]));
            for (const sp of Object.values(SPECIES)) {
              abilityUsage.get(sp.ability)?.push(sp.id);
            }
            for (const [abId, ids] of abilityUsage.entries()) {
              assertGreater(ids.length, 0, `ability ${abId} assigned to >=1 species`);
            }

            // Pokemon getters & getPokemonAbility + resetBattleState
            const p0 = createPokemon(1, 12);
            assertEqual(p0.abilityId, 'overgrow', 'Bulbasaur abilityId === overgrow');
            assertEqual(p0.ability?.id, 'overgrow', 'Bulbasaur ability getter resolves');
            assertEqual(getPokemonAbility(1)?.id, 'overgrow', 'getPokemonAbility accepts numeric species ID');
            p0.abilityEntryTriggered = true;
            p0.resetBattleState();
            assertEqual(p0.abilityEntryTriggered, false, 'resetBattleState resets abilityEntryTriggered');

            // Entry abilities (pure)
            const entryPairs = [
              ['volt_reflex', 'spd', 1],
              ['diamond_guard', 'def', 1],
              ['cosmic_presence', 'atk', 1],
            ];
            for (const [abId, stat, stages] of entryPairs) {
              const spId = abilityUsage.get(abId)[0];
              const mon = createPokemon(spId, 20);
              const res = evaluateEntryAbility(mon);
              assertEqual(res?.abilityId, abId, `evaluateEntryAbility resolves ${abId}`);
              assertEqual(res?.stat, stat, `${abId} boosts ${stat}`);
              assertEqual(res?.stages, stages, `${abId} stages === ${stages}`);
              assertEqual(mon.abilityEntryTriggered, false, `${abId} evaluateEntryAbility is pure`);
              assertEqual(mon.battleStages[stat], 0, `${abId} does not mutate stages`);
              mon.abilityEntryTriggered = true;
              assertEqual(evaluateEntryAbility(mon), null, `${abId} skips when already triggered`);
              mon.abilityEntryTriggered = false;
              mon.hp = 0;
              assertEqual(evaluateEntryAbility(mon), null, `${abId} skips when fainted`);
            }

            // Turn-end ability (starlight_grace, pure)
            const graceId = abilityUsage.get('starlight_grace')[0];
            const graceMon = createPokemon(graceId, 20);
            assertEqual(evaluateTurnEndAbility(graceMon), null, 'starlight_grace null at full HP');
            graceMon.hp = Math.max(1, graceMon.maxHp - 12);
            const hpBefore = graceMon.hp;
            const graceRes = evaluateTurnEndAbility(graceMon);
            assertEqual(graceRes?.abilityId, 'starlight_grace', 'starlight_grace triggers when injured');
            assertEqual(graceRes?.heal, Math.max(1, Math.round(graceMon.maxHp * 0.08)), 'starlight_grace heals 8% maxHp');
            assertEqual(graceMon.hp, hpBefore, 'evaluateTurnEndAbility is pure');
            graceMon.hp = 0;
            assertEqual(evaluateTurnEndAbility(graceMon), null, 'starlight_grace null when fainted');

            // calculateDamage: legacy off vs applyAbilities:true on pinch, type boosts & defensive abilities
            const bulba = createPokemon(1, 20);
            const targetFire = createPokemon(4, 20);
            const legacyHit = calculateDamage(bulba, targetFire, MOVES.vine_whip, { forceHit: true, forceCrit: false, fixedVariance: 1.0 });
            assertEqual(legacyHit.attackerAbilityTrigger, null, 'legacy calculateDamage leaves attackerAbilityTrigger null');
            assertEqual(legacyHit.defenderAbilityTrigger, null, 'legacy calculateDamage leaves defenderAbilityTrigger null');

            const fullOvergrow = calculateDamage(bulba, targetFire, MOVES.vine_whip, { forceHit: true, forceCrit: false, fixedVariance: 1.0, applyAbilities: true });
            assertEqual(fullOvergrow.attackerAbilityTrigger?.mult, 1.2, 'overgrow 1.2x above 50% HP');
            assertGreater(fullOvergrow.damage, legacyHit.damage, 'overgrow increases Grass damage');

            bulba.hp = Math.floor(bulba.maxHp * 0.5);
            const pinchOvergrow = calculateDamage(bulba, targetFire, MOVES.vine_whip, { forceHit: true, forceCrit: false, fixedVariance: 1.0, applyAbilities: true });
            assertEqual(pinchOvergrow.attackerAbilityTrigger?.mult, 1.35, 'overgrow 1.35x at <=50% HP');
            assertGreater(pinchOvergrow.damage, fullOvergrow.damage, 'pinch overgrow > full-HP overgrow');

            for (const [abId, mvId] of [
              ['storm_conduit', 'plasma_cannon'],
              ['dune_titan', 'sandstorm_crush'],
              ['mystic_prism', 'prism_laser'],
              ['shadow_cloak', 'spectral_lantern'],
              ['dragon_heart', 'dragon_rush'],
            ]) {
              const atkMon = createPokemon(abilityUsage.get(abId)[0], 20);
              const defMon = createPokemon(133, 20);
              const abHit = calculateDamage(atkMon, defMon, MOVES[mvId], { forceHit: true, forceCrit: false, fixedVariance: 1.0, applyAbilities: true });
              assertEqual(abHit.attackerAbilityTrigger?.abilityId, abId, `${abId} triggered on ${mvId}`);
              assertEqual(abHit.attackerAbilityTrigger?.mult, 1.2, `${abId} applies 1.2x`);
            }

            // Defensive abilities: permafrost & prism_scales
            const permaMon = createPokemon(abilityUsage.get('permafrost')[0], 20);
            const fireHit = calculateDamage(targetFire, permaMon, MOVES.ember, { forceHit: true, forceCrit: false, fixedVariance: 1.0, applyAbilities: true });
            assertEqual(fireHit.defenderAbilityTrigger?.abilityId, 'permafrost', 'permafrost triggers on incoming Fire');
            assertEqual(fireHit.defenderAbilityTrigger?.mult, 0.75, 'permafrost reduces by 0.75x');

            const prismMon = createPokemon(abilityUsage.get('prism_scales')[0], 20);
            const prismFull = calculateDamage(targetFire, prismMon, MOVES.ember, { forceHit: true, forceCrit: false, fixedVariance: 1.0, applyAbilities: true });
            assertEqual(prismFull.defenderAbilityTrigger?.abilityId, 'prism_scales', 'prism_scales triggers at full HP');
            assertEqual(prismFull.defenderAbilityTrigger?.mult, 0.7, 'prism_scales reduces by 0.7x');
            prismMon.hp = prismMon.maxHp - 1;
            const prismHurt = calculateDamage(targetFire, prismMon, MOVES.ember, { forceHit: true, forceCrit: false, fixedVariance: 1.0, applyAbilities: true });
            assertEqual(prismHurt.defenderAbilityTrigger, null, 'prism_scales inactive below maxHp');

            // Post-shrine roamers in desert, marsh, sanctum without mutating BIOMES
            const baseCounts = {
              desert: BIOMES.desert.encounters.length,
              marsh: BIOMES.marsh.encounters.length,
              sanctum: BIOMES.sanctum.encounters.length,
            };
            const origRand = Math.random;
            const rollPool = (biomeId, shrinesCleared) => {
              const seen = new Set();
              const prof = { team: [{ level: 24 }], badges: [], shrinesCleared };
              try {
                for (let i = 0; i < 500; i++) {
                  Math.random = () => (i + 0.5) / 500;
                  seen.add(rollWildPokemon(biomeId, prof, { forceShiny: false, forceElite: false }).speciesId);
                }
              } finally {
                Math.random = origRand;
              }
              return seen;
            };
            assert(!rollPool('desert', []).has(248), 'no Tyranitar roamer before desert_shrine');
            assert(rollPool('desert', ['desert_shrine']).has(248), 'desert_shrine unlocks Tyranitar #248 roamer');
            assert(!rollPool('marsh', []).has(251), 'no Celebi roamer before marsh_shrine');
            assert(rollPool('marsh', ['marsh_shrine']).has(251), 'marsh_shrine unlocks Celebi #251 roamer');
            assert(!rollPool('sanctum', []).has(384), 'no Rayquaza roamer before sanctum_shrine');
            const sanctumRoam = rollPool('sanctum', ['sanctum_shrine']);
            assert(sanctumRoam.has(384) && sanctumRoam.has(249), 'sanctum_shrine unlocks Rayquaza #384 & Lugia #249');
            assertEqual(BIOMES.desert.encounters.length, baseCounts.desert, 'BIOMES.desert not mutated');
            assertEqual(BIOMES.marsh.encounters.length, baseCounts.marsh, 'BIOMES.marsh not mutated');
            assertEqual(BIOMES.sanctum.encounters.length, baseCounts.sanctum, 'BIOMES.sanctum not mutated');

            // 24 badges + zero-count badge & quest leak regression guard
            assertEqual(BADGES.length, 24, '24 badges defined');
            for (const reqId of ['mirage', 'bayou', 'zenith', 'grand_dex']) {
              assert(BADGES.some((b) => b.id === reqId), `badge ${reqId} exists`);
            }
            const zeroCaughtProfile = {
              pokedex: {
                caught: Object.fromEntries(Object.keys(SPECIES).map((id) => [id, 0])),
                seen: [],
              },
              shrinesCleared: [],
              stats: { battlesWon: 0, evolutions: 0, upgrades: 0 },
              team: [{ bond: 20 }],
              box: [],
              biomesVisited: ['village'],
            };
            const leakedBadges = BADGES.filter((b) => b.check(zeroCaughtProfile)).map((b) => b.id);
            const leakedQuests = FIELD_QUESTS.filter((q) => q.check(zeroCaughtProfile)).map((q) => q.id);
            assertEqual(leakedBadges.length, 0, `zero-count caught entries unlock 0 badges (got ${leakedBadges.join(',')})`);
            assertEqual(leakedQuests.length, 0, `zero-count caught entries satisfy 0 quests (got ${leakedQuests.join(',')})`);

            const grandDex = BADGES.find((b) => b.id === 'grand_dex');
            assertEqual(grandDex.check({ stats: { evolutions: 6 }, pokedex: { caught: {} } }), true, 'grand_dex unlocks at 6 evolutions');
            const caught60 = Object.fromEntries(Object.keys(SPECIES).slice(0, 60).map((id) => [id, 1]));
            assertEqual(grandDex.check({ stats: { evolutions: 0 }, pokedex: { caught: caught60 } }), true, 'grand_dex unlocks at 60 caught species');
          },
        },
      ],
    },
    {
      name: '30. Sprint 6 Combat: 16 Move Choreographies, Ability Cut-Ins, 0-PP Struggle, 3 Arenas & BGMs',
      tests: [
        {
          name: '16 new moves, playAbilityVisual, Entry/Attack/Defense/Turn-End triggers, 0-PP Struggle, 3 arenas, 3 BGMs & prism_gem drops hold',
          async fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            // 1. Audio: 3 new BGM themes + 16 move SFX + 14 ability cues
            for (const themeId of ['desert', 'marsh', 'sanctum']) {
              const theme = THEMES[themeId];
              assert(Boolean(theme), `THEMES.${themeId} exists`);
              assert(theme.melody.length >= 64, `${themeId} melody >= 64 steps`);
              assertInRange(theme.leadGain, 0, 0.12, `${themeId}.leadGain <= 0.12`);
              assertInRange(theme.arpGain, 0, 0.12, `${themeId}.arpGain <= 0.12`);
              assertInRange(theme.bassGain, 0, 0.12, `${themeId}.bassGain <= 0.12`);
            }

            const newMoveIds = [
              'frenzy_flora', 'spore_burst', 'solar_blade', 'fiery_dance',
              'hydro_vortex', 'razor_shell', 'plasma_cannon', 'volt_tackle',
              'sandstorm_crush', 'prism_laser', 'zen_meteor', 'icicle_spear',
              'spectral_lantern', 'night_daze', 'dragon_rush', 'dune_aegis',
            ];
            const testAudio = new AudioEngine({ silent: true, attachUnlockListeners: false });
            try {
              testAudio.ensureContext();
              await Promise.race([testAudio.unlock(), new Promise((r) => setTimeout(r, 150))]);
              for (const themeId of ['desert', 'marsh', 'sanctum']) {
                testAudio.playBGM(themeId);
              }
              for (const mvId of newMoveIds) {
                testAudio.playElemental(MOVES[mvId].type, mvId);
              }
              for (const ab of Object.values(ABILITIES)) {
                testAudio.playAbilityCue(ab.id, ab.type);
              }
              testAudio.stopBGM();
              const diagStopped = testAudio.getDiagnostics();
              assertEqual(diagStopped.activeBgmNodes, 0, 'all Sprint 6 audio nodes cleaned up');
            } finally {
              await testAudio.destroy();
            }

            // 2. BattleEngine tests
            const TEST_KEY = 'starlight_pokemon_test_s30_v1';
            const cueCalls = [];
            const noopAudio = {
              playMenuBlip() {},
              playCursorMove() {},
              playMoveSelect() {},
              playWindup() {},
              playPhysicalImpact() {},
              playElemental() {},
              playShieldChime() {},
              playHealChime() {},
              playFaint() {},
              playLevelUp() {},
              playPokeballThrow() {},
              playPokeballAbsorb() {},
              playPokeballBounce() {},
              playPokeballWobble() {},
              playCaptureSuccess() {},
              playStarBallShimmer() {},
              playXpTick() {},
              playShinySparkle() {},
              playBuddyCheer() {},
              playBuddyEndure() {},
              playAbilityCue(id, type) {
                cueCalls.push([id, type]);
              },
            };
            const waitUntil = async (eng, pred, timeoutMs = 6000) => {
              const start = performance.now();
              while (!pred()) {
                if (eng.typingResolve) eng.finishTypewriter();
                if (performance.now() - start > timeoutMs) {
                  throw new Error(`Timed out waiting (state=${eng.state}, busy=${eng.busy})`);
                }
                await new Promise((r) => setTimeout(r, 15));
              }
            };

            let engine = null;
            const origRand = Math.random;
            try {
              window.localStorage.removeItem(TEST_KEY);
              const store = new StorageManager(TEST_KEY);
              store.updateSettings({ battlePace: 'fast' });
              store.selectTrainer('violet');
              store.chooseStarter(1);
              const vp = store.getActiveProfile();

              engine = new BattleEngine({
                storage: store,
                audio: noopAudio,
                onBattleEnd() {},
                onBadgesUnlocked() {},
                onHudRefresh() {},
              });
              assertEqual(engine.abilitiesEnabled, true, 'abilitiesEnabled defaults to true');

              // Verify 3 layered arenas (desert, marsh, sanctum)
              for (const biomeId of ['desert', 'marsh', 'sanctum']) {
                vp.team[0] = createPokemon(1, 15, biomeId);
                const sp = engine.start({ enemy: createPokemon(27, 12, biomeId), biomeId });
                await waitUntil(engine, () => engine.state === BATTLE_STATES.PLAYER_INPUT);
                await sp;
                const stageEl = document.getElementById('battle-stage');
                assertEqual(stageEl.dataset.biome, biomeId, `battle-stage data-biome === ${biomeId}`);
                const skyBg = window.getComputedStyle(stageEl.querySelector('.scenery-sky')).backgroundImage;
                assert(Boolean(skyBg && skyBg !== 'none'), `${biomeId} scenery-sky gradient rendered`);
                engine.stop({ outcome: 'escaped', faintedAll: false });
              }

              // Entry abilities auto-trigger in start() & playAbilityVisual drives banner + cue
              const entrySpId = Object.values(SPECIES).find((s) => ABILITIES[s.ability]?.trigger === 'entry')?.id;
              assert(Boolean(entrySpId), 'found species with entry ability');
              const entryMon = createPokemon(entrySpId, 20, 'sanctum');
              const entryExpected = evaluateEntryAbility(entryMon);
              vp.team[0] = entryMon;
              const startEntryP = engine.start({ enemy: createPokemon(10, 10, 'sanctum'), biomeId: 'sanctum' });
              await waitUntil(engine, () => engine.state === BATTLE_STATES.PLAYER_INPUT);
              await startEntryP;
              assertEqual(entryMon.abilityEntryTriggered, true, 'entry ability flagged triggered in battle');
              assertEqual(entryMon.battleStages[entryExpected.stat], entryExpected.stages, `entry ability boosted ${entryExpected.stat} +${entryExpected.stages}`);
              assert(cueCalls.some(([id]) => id === entryExpected.abilityId), `playAbilityCue fired for ${entryExpected.abilityId}`);

              // playAbilityVisual shows and cleanly hides #battle-ability-banner
              const bannerEl = document.getElementById('battle-ability-banner');
              assert(Boolean(bannerEl), '#battle-ability-banner exists');
              const visPromise = engine.playAbilityVisual('player', 'overgrow', 'Grass +20%', engine.sessionId);
              assertEqual(bannerEl.hidden, false, 'banner visible during playAbilityVisual');
              assertEqual(bannerEl.dataset.ability, 'overgrow', 'banner data-ability set');
              assertEqual(bannerEl.dataset.type, 'grass', 'banner data-type set');
              await visPromise;
              assertEqual(bannerEl.hidden, true, 'banner hides cleanly after playAbilityVisual');

              // Exercise all 16 Sprint 6 move choreographies
              for (const mvId of newMoveIds) {
                const mv = MOVES[mvId];
                const fakeRes = mv.category === 'shield'
                  ? { category: 'shield', damage: 0, heal: 6, grantShield: true, buffStat: 'def', buffStages: 1, effectiveness: 1, isCrit: false, missed: false }
                  : { category: 'attack', damage: 24, heal: 0, effectiveness: 1, isCrit: false, missed: false };
                await engine.playAttackVisual('player', 'enemy', mv, fakeRes, engine.enemy, engine.sessionId);
              }

              // Attack (blaze) + Defense (permafrost) abilities fire during executeMoveAction
              const attackerBlaze = createPokemon(4, 20, 'volcano');
              const defenderPerma = createPokemon(220, 20, 'peak');
              vp.team[0] = attackerBlaze;
              engine.player = attackerBlaze;
              engine.enemy = defenderPerma;
              const cuesBeforeAtk = cueCalls.length;
              const atkTimer = setInterval(() => engine.finishTypewriter(), 15);
              try {
                Math.random = () => 0.5;
                await engine.executeMoveAction('player', MOVES.ember, engine.sessionId);
              } finally {
                clearInterval(atkTimer);
                Math.random = origRand;
              }
              const firedIds = cueCalls.slice(cuesBeforeAtk).map(([id]) => id);
              assert(firedIds.includes('blaze'), 'blaze attack ability visual/cue fired in battle');
              assert(firedIds.includes('permafrost'), 'permafrost defense ability visual/cue fired in battle');

              // Turn-end ability (starlight_grace) heals injured mon after action
              const graceSpId = Object.values(SPECIES).find((s) => ABILITIES[s.ability]?.trigger === 'turn_end')?.id;
              const graceMon = createPokemon(graceSpId, 20, 'grove');
              graceMon.hp = Math.max(1, graceMon.maxHp - 15);
              const hpBeforeGrace = graceMon.hp;
              vp.team[0] = graceMon;
              engine.player = graceMon;
              engine.enemy = createPokemon(143, 35, 'grove');
              const graceTimer = setInterval(() => engine.finishTypewriter(), 15);
              try {
                Math.random = () => 0.5;
                await engine.executeMoveAction('player', MOVES.tackle, engine.sessionId);
              } finally {
                clearInterval(graceTimer);
                Math.random = origRand;
              }
              assertGreater(graceMon.hp, hpBeforeGrace, 'starlight_grace healed injured mon at turn end');

              engine.stop({ outcome: 'escaped', faintedAll: false });

              // Player 0-PP Struggle bug fix: 0 PP on ALL moves including synthesis -> executes Struggle & deals damage
              const bulba = createPokemon(1, 10, 'forest');
              for (const m of bulba.species.movePool) {
                bulba.movePp[m] = 0;
              }
              vp.team[0] = bulba;
              const targetCaterpie = createPokemon(10, 10, 'forest');
              const startStruggle = engine.start({ enemy: targetCaterpie, biomeId: 'forest' });
              await waitUntil(engine, () => engine.state === BATTLE_STATES.PLAYER_INPUT);
              await startStruggle;

              const moveBtns = Array.from(document.querySelectorAll('#battle-moves .move-card'));
              assertEqual(moveBtns.every((b) => !b.disabled), true, 'all move buttons stay enabled when 0 PP across all moves');
              const synthBtn = moveBtns.find((b) => b.dataset.moveId === 'synthesis') || moveBtns[0];
              const enemyHpBefore = targetCaterpie.hp;
              const struggleLogs = [];
              const origSay = engine.say.bind(engine);
              engine.say = (txt, ...rest) => {
                struggleLogs.push(txt);
                return origSay(txt, ...rest);
              };
              const stTimer = setInterval(() => engine.finishTypewriter(), 15);
              try {
                Math.random = () => 0.5;
                synthBtn.click();
                await waitUntil(engine, () => engine.state === BATTLE_STATES.PLAYER_INPUT && !engine.busy);
              } finally {
                clearInterval(stTimer);
                Math.random = origRand;
              }
              engine.say = origSay;
              assert(struggleLogs.some((l) => l.includes('used Struggle!')), '0-PP player move substituted Struggle');
              assert(targetCaterpie.hp < enemyHpBefore, 'Struggle dealt damage instead of looping heal/buff');
              engine.stop({ outcome: 'escaped', faintedAll: false });

              // Victory gem drops for desert (prism_gem / sun_gem), marsh (dusk_gem / leaf_gem), sanctum (prism_gem / astral_gem)
              for (const [bId, rollLow, expectedGem] of [
                ['desert', 0.1, 'prism_gem'],
                ['marsh', 0.1, 'dusk_gem'],
                ['sanctum', 0.1, 'prism_gem'],
              ]) {
                vp.bag.gems[expectedGem] = 0;
                engine.active = true;
                engine.sessionId += 1;
                engine.biomeId = bId;
                engine.isShrine = false;
                engine.isTrainer = false;
                engine.shrineData = null;
                engine.player = createPokemon(1, 25, bId);
                engine.enemy = createPokemon(27, 10, bId);
                engine.enemy.hp = 0;
                const dropTimer = setInterval(() => engine.finishTypewriter(), 15);
                try {
                  Math.random = () => rollLow;
                  await engine.handleEnemyDefeated(engine.sessionId);
                } finally {
                  clearInterval(dropTimer);
                  Math.random = origRand;
                }
                assertEqual(vp.bag.gems[expectedGem], 1, `${bId} victory drop awarded ${expectedGem}`);
              }
            } finally {
              Math.random = origRand;
              engine?.destroy();
              window.localStorage.removeItem(TEST_KEY);
            }
          },
        },
      ],
    },
    {
      name: '31. 84x72 World Map BFS, 649-Dex Search/Type Filters, Ability UI, v1/v2 Migration & Layout Gate',
      tests: [
        {
          name: '84x72 map BFS (16 shrines, 28 chests, 19 NPCs/quests, 13 rivals, 16 landmarks, 14 signposts, 11 heals), Overworld tiles 28..36 & Compass hold',
          fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            assertEqual(WORLD_COLS, 84, 'WORLD_COLS === 84');
            assertEqual(WORLD_ROWS, 72, 'WORLD_ROWS === 72');
            assertEqual(WORLD_MAP.length, 72, 'WORLD_MAP has 72 rows');
            for (let y = 0; y < WORLD_ROWS; y++) {
              assertEqual(WORLD_MAP[y].length, 84, `row ${y} width === 84`);
            }

            // Preserve spawn, (18,14) solid wall, and existing (0..51, 0..47) biome zones
            assertEqual(isTileWalkableAt(GAME_META.spawn.x, GAME_META.spawn.y), true, 'spawn (8,15) walkable');
            assertEqual(isTileWalkableAt(18, 14), false, '(18,14) corridor wall remains solid');
            assertEqual(getBiomeAt(8, 15).id, 'village', '(8,15) remains village');
            assertEqual(getBiomeAt(8, 38).id, 'grove', '(8,38) remains grove');
            assertEqual(getBiomeAt(46, 41).id, 'grove', '(46,41) remains grove');
            assertEqual(getBiomeAt(60, 10).id, 'desert', 'east band (60,10) is desert');
            assertEqual(getBiomeAt(14, 54).id, 'marsh', 'SW band (14,54) is marsh');
            assertEqual(getBiomeAt(60, 45).id, 'sanctum', 'SE band (60,45) is sanctum');
            assertEqual(getBiomeAt(44, 53).id, 'sanctum', 'south-east annex (44,53) is sanctum');

            // Tiles 28..36 & solid tiles 30, 33, 36
            assertEqual(TILE.DUNE_SAND, 28, 'TILE.DUNE_SAND === 28');
            assertEqual(TILE.SANDSTONE_WALL, 30, 'TILE.SANDSTONE_WALL === 30');
            assertEqual(TILE.MARSH_GRASS, 31, 'TILE.MARSH_GRASS === 31');
            assertEqual(TILE.MARSH_WALL, 33, 'TILE.MARSH_WALL === 33');
            assertEqual(TILE.SANCTUM_FLOOR, 34, 'TILE.SANCTUM_FLOOR === 34');
            assertEqual(TILE.SANCTUM_WALL, 36, 'TILE.SANCTUM_WALL === 36');
            assert(SOLID_TILES.has(30) && SOLID_TILES.has(33) && SOLID_TILES.has(36), 'SOLID_TILES includes 30, 33, 36');

            // Counts
            assertEqual(Object.keys(BIOMES).length, 14, '14 biomes defined');
            assertEqual(Object.keys(SHRINES).length, 16, '16 shrines defined');
            assertEqual(Object.keys(CHESTS).length, 28, '28 chests defined');
            assertEqual(Object.keys(NPCS).length, 19, '19 NPCs defined');
            assertEqual(FIELD_QUESTS.length, 19, '19 quests defined');
            assertEqual(Object.keys(RIVAL_TRAINERS).length, 13, '13 rivals defined');
            assertEqual(Object.keys(LANDMARKS).length, 16, '16 landmarks defined');
            assertEqual(Object.keys(SIGNPOSTS).length, 14, '14 signposts defined');

            // Full BFS from (8,15)
            const visited = new Set([`${GAME_META.spawn.x},${GAME_META.spawn.y}`]);
            const queue = [[GAME_META.spawn.x, GAME_META.spawn.y]];
            for (let head = 0; head < queue.length; head++) {
              const [cx, cy] = queue[head];
              for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
                const nx = cx + dx;
                const ny = cy + dy;
                const key = `${nx},${ny}`;
                if (!visited.has(key) && isTileWalkableAt(nx, ny)) {
                  visited.add(key);
                  queue.push([nx, ny]);
                }
              }
            }
            const hasAdj = (coordKey) => {
              const [x, y] = coordKey.split(',').map(Number);
              return [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => visited.has(`${x + dx},${y + dy}`));
            };

            for (const [label, map] of [
              ['shrine', SHRINES],
              ['chest', CHESTS],
              ['npc', NPCS],
              ['rival', RIVAL_TRAINERS],
              ['landmark', LANDMARKS],
              ['signpost', SIGNPOSTS],
            ]) {
              for (const [k, v] of Object.entries(map)) {
                assertEqual(hasAdj(k), true, `${label} ${v?.id || k} at ${k} reachable from spawn`);
              }
            }

            // All Healing Fountains & all 9 wild biome encounter tiles reachable
            const encTiles = new Map([
              [TILE.TALL_GRASS, 'forest'],
              [TILE.CAVE_FLOOR, 'cave'],
              [TILE.SHALLOW_WATER, 'water'],
              [TILE.VOLCANO_FLOOR, 'volcano'],
              [TILE.SNOW_GRASS, 'peak'],
              [TILE.GROVE_GRASS, 'grove'],
              [TILE.DUNE_SAND, 'desert'],
              [TILE.MARSH_GRASS, 'marsh'],
              [TILE.SANCTUM_FLOOR, 'sanctum'],
            ]);
            const reachableEncByBiome = new Set();
            let healCount = 0;
            for (let y = 0; y < WORLD_ROWS; y++) {
              for (let x = 0; x < WORLD_COLS; x++) {
                const t = WORLD_MAP[y][x];
                if (t === TILE.HEAL) {
                  healCount += 1;
                  assertEqual(visited.has(`${x},${y}`), true, `Healing Fountain (${x},${y}) reachable`);
                }
                if (encTiles.has(t) && visited.has(`${x},${y}`)) {
                  reachableEncByBiome.add(getBiomeAt(x, y).id);
                }
              }
            }
            assertEqual(healCount, 11, '11 Healing Fountains present & reachable');
            for (const bId of ['forest', 'cave', 'water', 'volcano', 'peak', 'grove', 'desert', 'marsh', 'sanctum']) {
              assert(reachableEncByBiome.has(bId), `encounter tiles reachable in ${bId}`);
            }

            // Compass shrine chain: grove_shrine -> desert_shrine -> marsh_shrine -> sanctum_shrine
            const baseShrines = [
              'forest_shrine', 'cave_shrine', 'water_shrine', 'volcano_shrine',
              'peak_shrine', 'thunder_shrine', 'eclipse_shrine', 'starlight_shrine', 'grove_shrine',
            ];
            assertEqual(getCompassGuidance({ shrinesCleared: baseShrines, pokedex: { caught: {} } }).targetBiomeId, 'desert', 'Compass leads to desert after grove_shrine');
            assertEqual(getCompassGuidance({ shrinesCleared: [...baseShrines, 'desert_shrine'], pokedex: { caught: {} } }).targetBiomeId, 'marsh', 'Compass leads to marsh after desert_shrine');
            assertEqual(getCompassGuidance({ shrinesCleared: [...baseShrines, 'desert_shrine', 'marsh_shrine'], pokedex: { caught: {} } }).targetBiomeId, 'sanctum', 'Compass leads to sanctum after marsh_shrine');

            // Overworld rendering across desert, marsh, sanctum
            const prevRawSave = window.localStorage.getItem(STORAGE_KEY);
            const wasBootHidden = app.bootScreenEl.hidden;
            const wasStarterHidden = app.starterScreenEl.hidden;
            const wasShellHidden = app.gameShellEl.hidden;
            const wasOverworldActive = app.overworld.active;
            try {
              window.localStorage.removeItem(STORAGE_KEY);
              storage.state = storage.load();
              storage.selectTrainer('violet');
              storage.chooseStarter(1);
              const prof = storage.getActiveProfile();
              app.bootScreenEl.hidden = true;
              app.starterScreenEl.hidden = true;
              app.gameShellEl.hidden = false;
              app.overworld.setActive(true);
              for (const [x, y] of [[56, 15], [14, 54], [44, 53]]) {
                prof.pos = { x, y, dir: 'down' };
                app.overworld.followerInitialized = false;
                app.overworld.syncFromProfile();
                app.overworld.render(performance.now());
              }
            } finally {
              if (prevRawSave === null) window.localStorage.removeItem(STORAGE_KEY);
              else window.localStorage.setItem(STORAGE_KEY, prevRawSave);
              storage.state = storage.load();
              app.overworld.followerInitialized = false;
              app.bootScreenEl.hidden = wasBootHidden;
              app.starterScreenEl.hidden = wasStarterHidden;
              app.gameShellEl.hidden = wasShellHidden;
              app.overworld.setActive(wasOverworldActive);
              if (!wasOverworldActive) app.audio?.stopBGM?.();
              if (!wasBootHidden) app.showBootScreen();
              else app.refreshHud();
              app.syncOverworldPause();
            }
          },
        },
        {
          name: '649-Dex search/type/biome filters, ability UI pills, SW/index sync, v1/v2 solid-tile migration, 60fps & 1280x720/1024x768 non-overlap gate pass',
          async fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            // 1. SW & index.html cache/count sanity
            const swText = await (await fetch('./sw.js')).text();
            assert(swText.includes('starlight-shell-v7') && swText.includes('starlight-assets-v7'), 'sw.js bumped to v7 caches');

            // 2. v1/v2 save migration with new biomes & solid tiles (30, 33, 36)
            const findFirstTile = (tileId) => {
              for (let y = 0; y < WORLD_ROWS; y++) {
                for (let x = 0; x < WORLD_COLS; x++) {
                  if (WORLD_MAP[y][x] === tileId) return { x, y };
                }
              }
              return null;
            };
            const solid30 = findFirstTile(30);
            const solid33 = findFirstTile(33);
            const solid36 = findFirstTile(36);
            assert(Boolean(solid30 && solid33 && solid36), 'found solid tiles 30, 33, 36');
            for (const sPos of [solid30, solid33, solid36]) {
              const safe = sanitizePosition({ ...sPos, dir: 'down' });
              assertEqual(isTileWalkableAt(safe.x, safe.y), true, `sanitizePosition rescues off solid tile (${sPos.x},${sPos.y}) -> (${safe.x},${safe.y})`);
            }

            const MIG_KEY = 'starlight_pokemon_test_s31_mig_v1';
            try {
              window.localStorage.setItem(MIG_KEY, JSON.stringify({
                version: 1,
                activeTrainerId: 'violet',
                profiles: {
                  violet: {
                    trainerId: 'violet',
                    starterId: 1,
                    pos: { x: 56, y: 15, dir: 'down' },
                    team: [{ uid: 'm1', speciesId: 1, level: 12, xp: 10, hp: 36 }],
                    bag: { potions: 4, greatBalls: 2 },
                  },
                  ozias: {
                    trainerId: 'ozias',
                    starterId: 4,
                    pos: { ...solid36, dir: 'up' },
                    team: [{ uid: 'm2', speciesId: 248, level: 22, xp: 5, hp: 70 }],
                    bag: { potions: 3, greatBalls: 1, starBalls: 2, starShards: 6, gems: { prism_gem: 2 } },
                  },
                },
              }));
              const migrated = new StorageManager(MIG_KEY);
              const mv = migrated.getProfile('violet');
              const mo = migrated.getProfile('ozias');
              assertEqual(mv.pos.x, 56, 'walkable desert position x preserved');
              assertEqual(mv.pos.y, 15, 'walkable desert position y preserved');
              assertEqual(mv.bag.gems.prism_gem, 0, 'v1 save hydrates prism_gem: 0');
              assertEqual(mo.bag.gems.prism_gem, 2, 'v2 save preserves prism_gem: 2');
              assertEqual(isTileWalkableAt(mo.pos.x, mo.pos.y), true, 'Ozias on solid SANCTUM_WALL (36) relocated safely');
            } finally {
              window.localStorage.removeItem(MIG_KEY);
            }

            // 3. 649-Dex UI filters, ability badges, input-focus safety, 60fps & 1280x720 / 1024x768 layout gate
            const prevRawSave = window.localStorage.getItem(STORAGE_KEY);
            const wasBootHidden = app.bootScreenEl.hidden;
            const wasStarterHidden = app.starterScreenEl.hidden;
            const wasShellHidden = app.gameShellEl.hidden;
            const wasOverworldActive = app.overworld.active;
            const origCabinetStyle = app.cabinetEl?.getAttribute('style') ?? null;

            try {
              window.localStorage.removeItem(STORAGE_KEY);
              storage.state = storage.load();
              storage.selectTrainer('violet');
              storage.chooseStarter(1);
              const prof = storage.getActiveProfile();
              prof.team[0] = createPokemon(35, 16, 'sanctum', { upgradeTier: 3 }); // Clefairy tall back-sprite
              storage.recordCaught(createPokemon(248, 20, 'desert'));
              prof.box.push(createPokemon(251, 22, 'marsh'));
              storage.save();

              app.bootScreenEl.hidden = true;
              app.starterScreenEl.hidden = true;
              app.gameShellEl.hidden = false;
              app.overworld.setActive(true);
              app.applyTrainerTheme('violet');
              app.refreshHud();

              // Open Pokédex: default 649 cards
              app.openPokedex('dex');
              assertEqual(document.querySelectorAll('.dex-grid .dex-card').length, 649, 'Dex renders all 649 cards by default');

              // Search by name & #id + input focus safety
              const searchEl = document.getElementById('dex-search-input');
              const typeEl = document.getElementById('dex-type-select');
              assert(Boolean(searchEl && typeEl), 'Dex search input & type select mounted');

              let inputLeaked = false;
              const unsubNav = app.input.on('navigate', () => { inputLeaked = true; });
              const unsubSlot = app.input.on('moveSlot', () => { inputLeaked = true; });
              searchEl.focus();
              searchEl.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true }));
              searchEl.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1', key: '1', bubbles: true }));
              unsubNav();
              unsubSlot();
              assertEqual(inputLeaked, false, 'typing in #dex-search-input never leaks WASD or Digit1 hotkeys');

              searchEl.value = 'Garchomp';
              searchEl.dispatchEvent(new Event('input', { bubbles: true }));
              assertEqual(document.querySelectorAll('.dex-grid .dex-card').length, 1, 'name search narrows to Garchomp');

              searchEl.value = '#248';
              searchEl.dispatchEvent(new Event('input', { bubbles: true }));
              assertEqual(document.querySelectorAll('.dex-grid .dex-card').length, 1, '#248 search narrows to Tyranitar');
              assert(
                (document.querySelector('.dex-detail-ability')?.textContent || '').includes('Dune Titan'),
                'discovered #248 detail displays Dune Titan ability pill & description',
              );

              document.getElementById('dex-search-clear').click();
              assertEqual(document.querySelectorAll('.dex-grid .dex-card').length, 649, 'clear button restores 649 cards');

              // Type + Biome filters
              typeEl.value = 'dragon';
              typeEl.dispatchEvent(new Event('change', { bubbles: true }));
              const dragonCount = document.querySelectorAll('.dex-grid .dex-card').length;
              assert(dragonCount > 0 && dragonCount < 649, `Dragon type filter narrows cards (${dragonCount})`);

              for (const bId of ['desert', 'marsh', 'sanctum']) {
                const pill = document.querySelector(`.dex-filter-pill[data-filter="${bId}"]`);
                assert(Boolean(pill), `biome pill ${bId} rendered`);
              }
              document.querySelector('.dex-filter-pill[data-filter="desert"]').click();
              const desertDragonCount = document.querySelectorAll('.dex-grid .dex-card').length;
              assert(desertDragonCount > 0 && desertDragonCount < dragonCount, 'combining Dragon + Desert narrows further');

              // 0-match reset button
              searchEl.value = 'ZZZZ_NO_MATCH';
              searchEl.dispatchEvent(new Event('input', { bubbles: true }));
              const resetBtn = document.querySelector('.dex-reset-filters-btn');
              assert(Boolean(resetBtn), 'empty filter state shows Show All button');
              resetBtn.click();
              assertEqual(document.querySelectorAll('.dex-grid .dex-card').length, 649, 'Show All resets to 649 cards');

              // Team & Box Ability pills, Guide (14 biomes, 13 rivals, 19 quests), Badges (24)
              app.openPokedex('team');
              assertGreater(document.querySelectorAll('.team-card .ability-pill').length, 0, 'Team cards render .ability-pill');
              assertGreater(document.querySelectorAll('.box-card .ability-pill').length, 0, 'Box cards render .ability-pill');
              app.openPokedex('guide');
              assertEqual(document.querySelectorAll('.biome-progress-card').length, 14, 'Guide renders all 14 biome cards');
              assertEqual(document.querySelectorAll('.quests-list .quest-card').length, 19, 'Guide renders 19 field quests');
              app.openPokedex('badges');
              assertEqual(document.querySelectorAll('.badges-grid .badge-card').length, 24, 'Badges tab renders 24 badge cards');
              app.pokedex.close();

              // 4. Layout non-overlap at 1280x720 & 1024x768 (HUD, cards/sprites, AND ability banner)
              app.hudInstallGroupEl.hidden = false;
              const startBattleP = app.battle.start({
                enemy: createPokemon(384, 25, 'sanctum', { isElite: true, upgradeTier: 3 }),
                biomeId: 'sanctum',
              });
              app.syncControlVisibility();
              const fastTimer = setInterval(() => app.battle.finishTypewriter(), 15);
              try {
                await startBattleP;
              } finally {
                clearInterval(fastTimer);
              }

              const overlaps = (a, b) => !(
                a.right <= b.left ||
                a.left >= b.right ||
                a.bottom <= b.top ||
                a.top >= b.bottom
              );

              const bannerEl = document.getElementById('battle-ability-banner');
              for (const [label, w, h] of [
                ['Chromebook 1280x720', 940, Math.round(720 * 0.985)],
                ['Tablet 1024x768', 940, Math.round(768 * 0.985)],
              ]) {
                app.cabinetEl.style.width = `${w}px`;
                app.cabinetEl.style.height = `${h}px`;
                await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

                const hudBar = document.querySelector('.hud-bar');
                assert(
                  hudBar.scrollWidth <= hudBar.clientWidth + 2,
                  `${label}: HUD overflows horizontally (${hudBar.scrollWidth} > ${hudBar.clientWidth})`,
                );

                const enemyCard = document.querySelector('.status-card-enemy').getBoundingClientRect();
                const playerSprite = document.querySelector('.fighter-sprite-player').getBoundingClientRect();
                const playerCard = document.querySelector('.status-card-player').getBoundingClientRect();
                const enemySprite = document.querySelector('.fighter-sprite-enemy').getBoundingClientRect();
                assertEqual(overlaps(enemyCard, playerSprite), false, `${label}: enemyCard overlaps Clefairy`);
                assertEqual(overlaps(playerCard, enemySprite), false, `${label}: playerCard overlaps Rayquaza`);

                for (const side of ['player', 'enemy']) {
                  bannerEl.hidden = false;
                  bannerEl.dataset.side = side;
                  bannerEl.dataset.type = 'dragon';
                  bannerEl.innerHTML = '<span class="ability-banner-icon">🐉</span> <span class="ability-banner-text">Dragon Soul — Dragon +20%</span>';
                  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
                  const bannerRect = bannerEl.getBoundingClientRect();
                  assertEqual(overlaps(bannerRect, enemyCard), false, `${label} (${side}): ability banner overlaps enemyCard`);
                  assertEqual(overlaps(bannerRect, playerCard), false, `${label} (${side}): ability banner overlaps playerCard`);
                  assertEqual(overlaps(bannerRect, enemySprite), false, `${label} (${side}): ability banner overlaps enemySprite`);
                  assertEqual(overlaps(bannerRect, playerSprite), false, `${label} (${side}): ability banner overlaps playerSprite`);
                }
                bannerEl.hidden = true;
              }

              app.battle.stop({ outcome: 'escaped', faintedAll: false });

              // 5. 60fps loop stability
              const fpsDeadline = performance.now() + 1400;
              while (app.getDiagnostics().measuredFps <= 0 && performance.now() < fpsDeadline) {
                await new Promise((r) => setTimeout(r, 60));
              }
              const diag = app.getDiagnostics();
              assertEqual(diag.loopRafActive, true, 'loopRafActive === true');
              assertEqual(diag.loopStartCount, 1, 'loopStartCount === 1');
              assertGreater(diag.measuredFps, 0, `measuredFps > 0 (got ${diag.measuredFps})`);
            } finally {
              if (origCabinetStyle === null) app.cabinetEl?.removeAttribute('style');
              else app.cabinetEl?.setAttribute('style', origCabinetStyle);
              if (app.battle.active) app.battle.stop({ outcome: 'escaped', faintedAll: false });
              app.pokedex.close();
              app.closeSettings();
              app.hudInstallGroupEl.hidden = true;
              if (prevRawSave === null) window.localStorage.removeItem(STORAGE_KEY);
              else window.localStorage.setItem(STORAGE_KEY, prevRawSave);
              storage.state = storage.load();
              app.applyTrainerTheme(storage.getActiveTrainerId() || 'violet');
              app.encounterTransitioning = false;
              app.bootScreenEl.hidden = wasBootHidden;
              app.starterScreenEl.hidden = wasStarterHidden;
              app.gameShellEl.hidden = wasShellHidden;
              app.overworld.setActive(wasOverworldActive);
              if (!wasOverworldActive) app.audio?.stopBGM?.();
              app.applySettings();
              if (!wasBootHidden) app.showBootScreen();
              else app.refreshHud();
              app.syncControlVisibility();
              app.syncOverworldPause();
            }
          },
        },
      ],
    },
    {
      name: '32. Sprint 7 Systems: 649 Contiguous Species, 308+ Evolutions, 100 Moves, 12 Gems, 28 Abilities & 24 Badges',
      tests: [
        {
          name: 'All 649 contiguous species (#1..#649), >=308 evo edges across >=285 parents, 100 moves, 12 gems (chrono/nebula) & 100% reachability',
          fn() {
            const allSpecies = Object.values(SPECIES);
            assertEqual(allSpecies.length, 649, '649 species defined');
            for (let id = 1; id <= 649; id++) {
              assert(Boolean(SPECIES[id]), `contiguous species #${id} defined`);
            }

            assertEqual(Object.keys(TYPES).length, 10, '10 elemental types preserved');
            assertEqual(Object.keys(MOVES).length, 100, '100 moves defined');
            assertEqual(Object.keys(ABILITIES).length, 28, '28 abilities defined');
            assertEqual(Object.keys(EVOLUTION_ITEMS).length, 12, '12 evolution gems defined');
            assertEqual(EVOLUTION_ITEMS.chrono_gem?.id, 'chrono_gem', 'chrono_gem defined');
            assertEqual(EVOLUTION_ITEMS.chrono_gem?.icon, '⏳', 'chrono_gem icon');
            assertEqual(EVOLUTION_ITEMS.nebula_gem?.id, 'nebula_gem', 'nebula_gem defined');
            assertEqual(EVOLUTION_ITEMS.nebula_gem?.icon, '☄️', 'nebula_gem icon');

            const sprint7Moves = [
              ['thorn_barrage', 'grass', 'physical', 'attack', 'grass'],
              ['jungle_totem', 'grass', 'status', 'buff', 'buff'],
              ['inferno_overdrive', 'fire', 'special', 'attack', 'fire'],
              ['blaze_kick', 'fire', 'physical', 'attack', 'fire'],
              ['abyssal_geyser', 'water', 'special', 'attack', 'water'],
              ['pearl_cascade', 'water', 'physical', 'attack', 'water'],
              ['steppe_bolt', 'electric', 'physical', 'attack', 'electric'],
              ['ion_tempest', 'electric', 'special', 'attack', 'electric'],
              ['canyon_rend', 'rock', 'physical', 'attack', 'rock'],
              ['amber_bastion', 'rock', 'status', 'shield', 'shield'],
              ['chrono_cannon', 'psychic', 'special', 'attack', 'star'],
              ['champion_strike', 'normal', 'physical', 'attack', 'impact'],
              ['polar_lance', 'ice', 'special', 'attack', 'ice'],
              ['relic_hex', 'ghost', 'special', 'attack', 'ghost'],
              ['rift_claw', 'dragon', 'physical', 'attack', 'dragon'],
              ['cosmos_supernova', 'dragon', 'special', 'attack', 'dragon'],
            ];
            for (const [id, type, dmgClass, category, fx] of sprint7Moves) {
              const mv = MOVES[id];
              assert(Boolean(mv), `MOVES.${id} defined`);
              assertEqual(mv.type, type, `${id}.type`);
              assertEqual(mv.damageClass, dmgClass, `${id}.damageClass`);
              assertEqual(mv.category, category, `${id}.category`);
              assertEqual(mv.fx, fx, `${id}.fx`);
            }

            // Species schema, biome distribution & preserved fixtures
            const biomeCounts = { canyon: 0, reef: 0, ruins: 0, rift: 0 };
            for (const sp of allSpecies) {
              assert(Boolean(TYPES[sp.type]), `species #${sp.id} valid type`);
              assert(sp.biome === 'starter' || Boolean(BIOMES[sp.biome]), `species #${sp.id} valid biome ${sp.biome}`);
              if (Object.prototype.hasOwnProperty.call(biomeCounts, sp.biome)) {
                biomeCounts[sp.biome] += 1;
              }
              assert(Boolean(ABILITIES[sp.ability]), `species #${sp.id} valid ability ${sp.ability}`);
              assertInRange(sp.catchFactor, 0.35, 0.98, `species #${sp.id} catchFactor`);
              assert(/^#[0-9a-fA-F]{6}$/.test(sp.color), `species #${sp.id} valid hex color`);
              for (const statKey of ['hp', 'atk', 'def', 'spd']) {
                assertInRange(sp.baseStats[statKey], 24, 135, `species #${sp.id} baseStats.${statKey}`);
              }
              assertEqual(sp.movePool.length, 4, `species #${sp.id} has 4 moves`);
              assertEqual(new Set(sp.movePool).size, 4, `species #${sp.id} has 4 distinct moves`);
              let dmgCount = 0;
              let stabCount = 0;
              for (const mvId of sp.movePool) {
                const mv = MOVES[mvId];
                assert(Boolean(mv), `species #${sp.id} move ${mvId} valid`);
                if (mv.category === 'attack') dmgCount += 1;
                if (mv.type === sp.type) stabCount += 1;
              }
              assert(dmgCount >= 2, `species #${sp.id} has >=2 damaging moves`);
              assert(stabCount >= 1, `species #${sp.id} has >=1 STAB move`);
            }
            for (const newBiome of ['canyon', 'reef', 'ruins', 'rift']) {
              assert(biomeCounts[newBiome] >= 35, `${newBiome} has >=35 species (got ${biomeCounts[newBiome]})`);
            }

            assertEqual(SPECIES[1].ability, 'overgrow', '#1 Bulbasaur keeps overgrow');
            assertEqual(SPECIES[4].ability, 'blaze', '#4 Charmander keeps blaze');
            assertEqual(SPECIES[220].ability, 'permafrost', '#220 Swinub keeps permafrost');
            assertEqual(SPECIES[248].ability, 'dune_titan', '#248 Tyranitar keeps dune_titan');
            for (const id of [1, 4, 7, 10, 16, 25]) {
              assert(ABILITIES[SPECIES[id].ability].trigger !== 'entry', `species #${id} stays off entry trigger`);
            }

            // Evolutions (>=308 edges, >=285 parents, deterministic branches, chrono_gem >=5, nebula_gem >=5)
            const evoParents = Object.keys(EVOLUTIONS).length;
            let evoEdges = 0;
            let chronoEvoCount = 0;
            let nebulaEvoCount = 0;
            const chronoExamples = [];
            const nebulaExamples = [];
            for (const [fromKey, rules] of Object.entries(EVOLUTIONS)) {
              const fromId = Number(fromKey);
              assert(Boolean(SPECIES[fromId]), `evo parent #${fromId} exists`);
              evoEdges += rules.length;
              for (const rule of rules) {
                assert(Boolean(SPECIES[rule.to]), `evo target #${rule.to} exists`);
                if (rule.minLevel !== undefined) {
                  assertInRange(rule.minLevel, 7, 30, `evo #${fromId}->#${rule.to} minLevel in 7..30`);
                }
                if (rule.item) {
                  assert(Boolean(EVOLUTION_ITEMS[rule.item]), `evo item ${rule.item} valid`);
                }
                if (rule.item === 'chrono_gem') {
                  chronoEvoCount += 1;
                  chronoExamples.push([fromId, rule.to]);
                }
                if (rule.item === 'nebula_gem') {
                  nebulaEvoCount += 1;
                  nebulaExamples.push([fromId, rule.to]);
                }
              }
            }
            assert(evoParents >= 285, `>=285 evolution parent keys (got ${evoParents})`);
            assert(evoEdges >= 308, `>=308 evolution edges (got ${evoEdges})`);
            assert(chronoEvoCount >= 5, `>=5 chrono_gem evolutions (got ${chronoEvoCount})`);
            assert(nebulaEvoCount >= 5, `>=5 nebula_gem evolutions (got ${nebulaEvoCount})`);

            for (const branchParent of [79, 236, 265, 290, 366, 412]) {
              const rules = EVOLUTIONS[branchParent] || [];
              assert(rules.length >= 2, `branched parent #${branchParent} has >=2 branches`);
              const levelRules = rules.filter((r) => r.minLevel !== undefined);
              assert(levelRules.length <= 1, `#${branchParent} keeps at most 1 minLevel branch`);
              for (let idx = 1; idx < rules.length; idx++) {
                assert(Boolean(rules[idx].item) && rules[idx].minLevel === undefined, `#${branchParent} secondary branch[${idx}] is item-only`);
              }
            }

            // Live StorageManager chrono_gem & nebula_gem evolution tests
            const TEST_KEY = 'starlight_pokemon_test_s32_gems_v1';
            try {
              window.localStorage.removeItem(TEST_KEY);
              const store = new StorageManager(TEST_KEY);
              store.selectTrainer('violet');
              store.chooseStarter(1);
              store.addRewards({ gems: { chrono_gem: 2, nebula_gem: 2 } });

              const [cFrom, cTo] = chronoExamples[0];
              const cMon = createPokemon(cFrom, 25, 'ruins');
              store.recordCaught(cMon);
              assertEqual(
                cMon.getAvailableItemEvolutions({ chrono_gem: 1 }).some((o) => o.toId === cTo && o.item === 'chrono_gem' && o.canUse),
                true,
                `#${cFrom} -> #${cTo} available via chrono_gem`,
              );
              const cEvo = store.evolvePokemon(cMon.uid, cTo, 'chrono_gem');
              assert(Boolean(cEvo?.evolution), `chrono_gem evolution #${cFrom}->#${cTo} succeeded`);
              assertEqual(cMon.speciesId, cTo, `chrono_gem evolved into #${cTo}`);
              assertEqual(store.getActiveProfile().bag.gems.chrono_gem, 1, 'chrono_gem decremented');

              const [nFrom, nTo] = nebulaExamples[0];
              const nMon = createPokemon(nFrom, 25, 'rift');
              store.recordCaught(nMon);
              assertEqual(
                nMon.getAvailableItemEvolutions({ nebula_gem: 1 }).some((o) => o.toId === nTo && o.item === 'nebula_gem' && o.canUse),
                true,
                `#${nFrom} -> #${nTo} available via nebula_gem`,
              );
              const nEvo = store.evolvePokemon(nMon.uid, nTo, 'nebula_gem');
              assert(Boolean(nEvo?.evolution), `nebula_gem evolution #${nFrom}->#${nTo} succeeded`);
              assertEqual(nMon.speciesId, nTo, `nebula_gem evolved into #${nTo}`);
              assertEqual(store.getActiveProfile().bag.gems.nebula_gem, 1, 'nebula_gem decremented');
            } finally {
              window.localStorage.removeItem(TEST_KEY);
            }

            // 100% 649-species gameplay reachability BFS
            const reachable = new Set(STARTER_IDS.map(Number));
            for (const b of Object.values(BIOMES)) {
              for (const enc of b.encounters || []) reachable.add(Number(enc.id));
            }
            for (const sh of Object.values(SHRINES)) {
              reachable.add(Number(sh.guardianId));
            }
            for (const roamerId of [144, 145, 146, 151, 385, 248, 251, 384, 249, 243, 244, 382, 245, 483, 486, 493, 150, 250, 643, 644, 649]) {
              reachable.add(roamerId);
            }
            let changed = true;
            while (changed) {
              changed = false;
              for (const [fromKey, rules] of Object.entries(EVOLUTIONS)) {
                const fromId = Number(fromKey);
                for (const rule of rules) {
                  if (reachable.has(fromId) && !reachable.has(rule.to)) {
                    reachable.add(rule.to);
                    changed = true;
                  }
                }
              }
            }
            const unreachable = allSpecies.map((s) => s.id).filter((id) => !reachable.has(id));
            assertEqual(unreachable.length, 0, `100% 649 species reachable (unreachable: ${unreachable.slice(0, 10).join(',')})`);
          },
        },
        {
          name: 'All 28 abilities (>=5 species each), pure evaluators for all 14 Sprint 7 abilities, post-shrine roamers & 24 zero-count-safe badges hold',
          fn() {
            const abilityUsage = new Map(Object.keys(ABILITIES).map((id) => [id, []]));
            for (const sp of Object.values(SPECIES)) {
              abilityUsage.get(sp.ability)?.push(sp.id);
            }
            assertEqual(abilityUsage.size, 28, '28 abilities tracked');
            for (const [abId, ids] of abilityUsage.entries()) {
              assert(ids.length >= 5, `ability ${abId} assigned to >=5 species (got ${ids.length})`);
            }

            // 1. Entry abilities (pure, including shield entry abilities pearl_aegis & rift_sovereign)
            for (const [abId, stat, stages, expectShield] of [
              ['chlorophyll_rush', 'spd', 1, false],
              ['supernova_core', 'atk', 1, false],
              ['chrono_shift', 'spd', 1, false],
              ['pearl_aegis', 'def', 1, true],
              ['rift_sovereign', 'atk', 1, true],
            ]) {
              const mon = createPokemon(abilityUsage.get(abId)[0], 25);
              const res = evaluateEntryAbility(mon);
              assertEqual(res?.abilityId, abId, `evaluateEntryAbility resolves ${abId}`);
              assertEqual(res?.stat, stat, `${abId} stat === ${stat}`);
              assertEqual(res?.stages, stages, `${abId} stages === ${stages}`);
              assertEqual(Boolean(res?.grantShield), expectShield, `${abId} grantShield === ${expectShield}`);
              assertEqual(res?.shieldTurns, expectShield ? 1 : 0, `${abId} shieldTurns`);
              if (expectShield) {
                assert(res.summary.includes('Shield'), `${abId} summary mentions Shield`);
              }
              assertEqual(mon.abilityEntryTriggered, false, `${abId} evaluateEntryAbility is pure`);
              assertEqual(mon.battleStages[stat], 0, `${abId} does not mutate battleStages`);
              assertEqual(mon.shieldTurns, 0, `${abId} does not mutate shieldTurns`);
            }

            // 2. Offensive abilities (nectar_siphon, rail_overload, champion_spirit, aurora_cloak)
            const targetDef = createPokemon(143, 25);

            // nectar_siphon
            const nectarMon = createPokemon(abilityUsage.get('nectar_siphon')[0], 25);
            assertEqual(evaluateOffensiveAbility(nectarMon, MOVES.tackle), null, 'nectar_siphon ignores non-Grass');
            const nectarEval = evaluateOffensiveAbility(nectarMon, MOVES.thorn_barrage);
            assertEqual(nectarEval?.abilityId, 'nectar_siphon', 'nectar_siphon triggers on Grass');
            assertEqual(nectarEval?.mult, 1.15, 'nectar_siphon mult === 1.15');
            assertEqual(nectarEval?.drainRatio, 0.2, 'nectar_siphon drainRatio === 0.2');
            const nectarDmg = calculateDamage(nectarMon, targetDef, MOVES.thorn_barrage, {
              forceHit: true,
              forceCrit: false,
              fixedVariance: 1.0,
              applyAbilities: true,
            });
            assertEqual(
              nectarDmg.attackerAbilityTrigger?.drainHeal,
              Math.max(1, Math.round(nectarDmg.damage * 0.2)),
              'calculateDamage computes nectar_siphon drainHeal = 20% damage',
            );

            // rail_overload (+20% Electric & +15% crit surge)
            const railMon = createPokemon(abilityUsage.get('rail_overload')[0], 25, 'canyon', { bond: 20 });
            assertEqual(evaluateOffensiveAbility(railMon, MOVES.tackle), null, 'rail_overload ignores non-Electric');
            const railEval = evaluateOffensiveAbility(railMon, MOVES.ion_tempest);
            assertEqual(railEval?.mult, 1.2, 'rail_overload mult === 1.2');
            assertEqual(railEval?.critBonus, 0.15, 'rail_overload critBonus === 0.15');
            const origRand = Math.random;
            try {
              Math.random = () => 0.18; // > 0.08 base crit, < 0.23 rail_overload crit
              const noAbCrit = calculateDamage(railMon, targetDef, MOVES.ion_tempest, {
                forceHit: true,
                fixedVariance: 1.0,
                applyAbilities: false,
              });
              const withAbCrit = calculateDamage(railMon, targetDef, MOVES.ion_tempest, {
                forceHit: true,
                fixedVariance: 1.0,
                applyAbilities: true,
              });
              assertEqual(noAbCrit.isCrit, false, '0.18 does not crit without rail_overload');
              assertEqual(withAbCrit.isCrit, true, '0.18 crits with rail_overload +15% crit surge');
            } finally {
              Math.random = origRand;
            }

            // champion_spirit (physical +20%, +30% at <=50% HP)
            const champMon = createPokemon(abilityUsage.get('champion_spirit')[0], 25);
            assertEqual(evaluateOffensiveAbility(champMon, MOVES.swift), null, 'champion_spirit ignores special moves');
            const champFull = evaluateOffensiveAbility(champMon, MOVES.champion_strike);
            assertEqual(champFull?.mult, 1.2, 'champion_spirit +20% above 50% HP');
            champMon.hp = Math.floor(champMon.maxHp * 0.5);
            const champPinch = evaluateOffensiveAbility(champMon, MOVES.champion_strike);
            assertEqual(champPinch?.mult, 1.3, 'champion_spirit +30% at <=50% HP');

            // aurora_cloak (Ice +20%)
            const auroraMon = createPokemon(abilityUsage.get('aurora_cloak')[0], 25);
            assertEqual(evaluateOffensiveAbility(auroraMon, MOVES.tackle), null, 'aurora_cloak ignores non-Ice');
            assertEqual(evaluateOffensiveAbility(auroraMon, MOVES.polar_lance)?.mult, 1.2, 'aurora_cloak boosts Ice 1.2x');

            // 3. Defensive abilities (magma_armor, fossil_bastion, phantom_mirage)
            const magmaMon = createPokemon(abilityUsage.get('magma_armor')[0], 25);
            for (const mvId of ['vine_whip', 'ice_beam', 'ember']) {
              assertEqual(evaluateDefensiveAbility(magmaMon, MOVES[mvId], 1)?.mult, 0.75, `magma_armor reduces ${MOVES[mvId].type} to 0.75x`);
            }
            assertEqual(evaluateDefensiveAbility(magmaMon, MOVES.water_gun, 2), null, 'magma_armor does not reduce Water');

            const fossilMon = createPokemon(abilityUsage.get('fossil_bastion')[0], 25);
            assertEqual(evaluateDefensiveAbility(fossilMon, MOVES.water_gun, 2)?.mult, 0.75, 'fossil_bastion reduces super-effective to 0.75x');
            assertEqual(evaluateDefensiveAbility(fossilMon, MOVES.tackle, 1), null, 'fossil_bastion skips neutral hits');

            const mirageMon = createPokemon(abilityUsage.get('phantom_mirage')[0], 25);
            for (const mvId of ['tackle', 'confusion', 'rock_throw']) {
              const defRes = evaluateDefensiveAbility(mirageMon, MOVES[mvId], 1);
              assertEqual(defRes?.abilityId, 'phantom_mirage', `phantom_mirage triggers on ${MOVES[mvId].type}`);
              assertEqual(defRes?.mult, 0.75, 'phantom_mirage reduces to 0.75x');
              assertEqual(defRes?.counterBoostStat, 'spd', 'phantom_mirage counterBoostStat === spd');
            }
            assertEqual(mirageMon.battleStages.spd, 0, 'evaluateDefensiveAbility is pure');
            assertEqual(evaluateDefensiveAbility(mirageMon, MOVES.ember, 1), null, 'phantom_mirage ignores Fire');

            // 4. Turn-end abilities (abyssal_current, thunder_steppe)
            const abyssMon = createPokemon(abilityUsage.get('abyssal_current')[0], 25);
            assertEqual(evaluateTurnEndAbility(abyssMon), null, 'abyssal_current null at full HP');
            abyssMon.hp = Math.max(1, abyssMon.maxHp - 18);
            const abyssHpBefore = abyssMon.hp;
            const abyssRes = evaluateTurnEndAbility(abyssMon);
            assertEqual(abyssRes?.abilityId, 'abyssal_current', 'abyssal_current triggers when injured');
            assertEqual(abyssRes?.heal, Math.max(1, Math.round(abyssMon.maxHp * 0.08)), 'abyssal_current heals 8% maxHp');
            assertEqual(abyssMon.hp, abyssHpBefore, 'abyssal_current evaluator is pure');

            const steppeMon = createPokemon(abilityUsage.get('thunder_steppe')[0], 25);
            const steppeRes = evaluateTurnEndAbility(steppeMon);
            assertEqual(steppeRes?.abilityId, 'thunder_steppe', 'thunder_steppe triggers at full HP');
            assertEqual(steppeRes?.boostStat, 'spd', 'thunder_steppe boostStat === spd');
            assertEqual(steppeRes?.boostStages, 1, 'thunder_steppe boostStages === 1');
            assertEqual(steppeMon.battleStages.spd, 0, 'thunder_steppe evaluator is pure');
            steppeMon.battleStages.spd = 2;
            assertEqual(evaluateTurnEndAbility(steppeMon), null, 'thunder_steppe caps at spd >= 2');
            steppeMon.battleStages.spd = 0;
            steppeMon.hp = 0;
            assertEqual(evaluateTurnEndAbility(steppeMon), null, 'thunder_steppe null when fainted');

            // 5. Post-shrine roamers in canyon, reef, ruins, rift without mutating BIOMES
            const baseCounts = {
              canyon: BIOMES.canyon.encounters.length,
              reef: BIOMES.reef.encounters.length,
              ruins: BIOMES.ruins.encounters.length,
              rift: BIOMES.rift.encounters.length,
            };
            const rollPool = (biomeId, shrinesCleared) => {
              const seen = new Set();
              const prof = { team: [{ level: 30 }], badges: [], shrinesCleared };
              try {
                for (let i = 0; i < 500; i++) {
                  Math.random = () => (i + 0.5) / 500;
                  seen.add(rollWildPokemon(biomeId, prof, { forceShiny: false, forceElite: false }).speciesId);
                }
              } finally {
                Math.random = origRand;
              }
              return seen;
            };

            assert(!rollPool('canyon', []).has(243) && !rollPool('canyon', []).has(244), 'no Raikou/Entei before canyon_shrine');
            const canyonRoam = rollPool('canyon', ['canyon_shrine']);
            assert(canyonRoam.has(243) && canyonRoam.has(244), 'canyon_shrine unlocks Raikou #243 & Entei #244');

            assert(!rollPool('reef', []).has(382) && !rollPool('reef', []).has(245), 'no Kyogre/Suicune before reef_shrine');
            const reefRoam = rollPool('reef', ['reef_shrine']);
            assert(reefRoam.has(382) && reefRoam.has(245), 'reef_shrine unlocks Kyogre #382 & Suicune #245');

            assert(!rollPool('ruins', []).has(483) && !rollPool('ruins', []).has(486), 'no Dialga/Regigigas before ruins_shrine');
            const ruinsRoam = rollPool('ruins', ['ruins_shrine']);
            assert(ruinsRoam.has(483) && ruinsRoam.has(486), 'ruins_shrine unlocks Dialga #483 & Regigigas #486');

            assert(!rollPool('rift', []).has(493) && !rollPool('rift', []).has(649), 'no Arceus/Genesect before rift_shrine');
            const riftRoam = rollPool('rift', ['rift_shrine']);
            for (const rId of [493, 150, 250, 643, 644, 649]) {
              assert(riftRoam.has(rId), `rift_shrine unlocks roamer #${rId}`);
            }

            for (const bId of ['canyon', 'reef', 'ruins', 'rift']) {
              assertEqual(BIOMES[bId].encounters.length, baseCounts[bId], `BIOMES.${bId}.encounters not mutated`);
            }

            // 6. 24 zero-count-safe badges
            assertEqual(BADGES.length, 24, '24 badges defined');
            for (const bId of ['steppe', 'trench', 'relic', 'rift_crown', 'evo_savant', 'national_legend']) {
              assert(BADGES.some((b) => b.id === bId), `badge ${bId} defined`);
            }
            const zeroProfile = {
              pokedex: { caught: Object.fromEntries(Object.keys(SPECIES).map((id) => [id, 0])), seen: [] },
              shrinesCleared: [],
              stats: { battlesWon: 0, evolutions: 0, upgrades: 0 },
              team: [{ bond: 20 }],
              box: [],
              biomesVisited: ['village'],
            };
            assertEqual(BADGES.filter((b) => b.check(zeroProfile)).length, 0, 'zero-count caught unlocks 0 of 24 badges');
            assertEqual(FIELD_QUESTS.filter((q) => q.check(zeroProfile)).length, 0, 'zero-count caught satisfies 0 of 19 quests');

            assertEqual(BADGES.find((b) => b.id === 'steppe').check({ shrinesCleared: ['canyon_shrine'], pokedex: { caught: {} } }), true, 'steppe unlocks via shrine');
            assertEqual(BADGES.find((b) => b.id === 'trench').check({ shrinesCleared: ['reef_shrine'], pokedex: { caught: {} } }), true, 'trench unlocks via shrine');
            assertEqual(BADGES.find((b) => b.id === 'relic').check({ shrinesCleared: ['ruins_shrine'], pokedex: { caught: {} } }), true, 'relic unlocks via shrine');
            assertEqual(BADGES.find((b) => b.id === 'rift_crown').check({ shrinesCleared: ['rift_shrine'], pokedex: { caught: {} } }), true, 'rift_crown unlocks via shrine');
            assertEqual(BADGES.find((b) => b.id === 'evo_savant').check({ stats: { evolutions: 15 }, pokedex: { caught: {} } }), true, 'evo_savant unlocks at 15 evos');
            const caught300 = Object.fromEntries(Object.keys(SPECIES).slice(0, 300).map((id) => [id, 1]));
            assertEqual(BADGES.find((b) => b.id === 'national_legend').check({ shrinesCleared: [], pokedex: { caught: caught300 } }), true, 'national_legend unlocks at 300 caught');
          },
        },
      ],
    },
    {
      name: '33. Sprint 7 Combat: 28 Ability Spectacles, 16 Move Choreographies, 4 Arenas, 4 BGMs & Gem Drops',
      tests: [
        {
          name: '4 new 64+ step BGMs (<=0.12 gain, 0 leaks), 16 Sprint 7 move SFX & 28 ability audio cues hold',
          async fn() {
            const newBiomes = ['canyon', 'reef', 'ruins', 'rift'];
            for (const themeId of newBiomes) {
              const theme = THEMES[themeId];
              assert(Boolean(theme), `THEMES.${themeId} defined`);
              assert(theme.melody.length >= 64, `${themeId} melody >= 64 steps`);
              assertInRange(theme.leadGain, 0, 0.12, `${themeId}.leadGain <= 0.12`);
              assertInRange(theme.arpGain, 0, 0.12, `${themeId}.arpGain <= 0.12`);
              assertInRange(theme.bassGain, 0, 0.12, `${themeId}.bassGain <= 0.12`);
            }

            const sprint7MoveIds = [
              'thorn_barrage', 'jungle_totem', 'inferno_overdrive', 'blaze_kick',
              'abyssal_geyser', 'pearl_cascade', 'steppe_bolt', 'ion_tempest',
              'canyon_rend', 'amber_bastion', 'chrono_cannon', 'champion_strike',
              'polar_lance', 'relic_hex', 'rift_claw', 'cosmos_supernova',
            ];
            const testAudio = new AudioEngine({ silent: true, attachUnlockListeners: false });
            try {
              testAudio.ensureContext();
              await Promise.race([testAudio.unlock(), new Promise((r) => setTimeout(r, 150))]);
              for (const themeId of newBiomes) {
                testAudio.playBGM(themeId);
              }
              for (const mvId of sprint7MoveIds) {
                testAudio.playElemental(MOVES[mvId].type, mvId);
              }
              for (const ab of Object.values(ABILITIES)) {
                testAudio.playAbilityCue(ab.id, ab.type);
              }
              testAudio.stopBGM();
              assertEqual(testAudio.getDiagnostics().activeBgmNodes, 0, '0 leaked BGM nodes after stopBGM()');
            } finally {
              await testAudio.destroy();
            }
          },
        },
        {
          name: 'All 28 ability spectacles (aura + canvas cleanup), 16 Sprint 7 moves, 4 arenas, shield/drain/counter/turn_end hooks & chrono/nebula drops',
          async fn() {
            const TEST_KEY = 'starlight_pokemon_test_s33_v1';
            const cueCalls = [];
            const noopAudio = {
              playMenuBlip() {},
              playCursorMove() {},
              playMoveSelect() {},
              playWindup() {},
              playPhysicalImpact() {},
              playElemental() {},
              playShieldChime() {},
              playHealChime() {},
              playFaint() {},
              playLevelUp() {},
              playPokeballThrow() {},
              playPokeballAbsorb() {},
              playPokeballBounce() {},
              playPokeballWobble() {},
              playCaptureSuccess() {},
              playStarBallShimmer() {},
              playXpTick() {},
              playShinySparkle() {},
              playBuddyCheer() {},
              playBuddyEndure() {},
              playAbilityCue(id, type) {
                cueCalls.push([id, type]);
              },
            };
            const waitUntil = async (eng, pred, timeoutMs = 6000) => {
              const start = performance.now();
              while (!pred()) {
                if (eng.typingResolve) eng.finishTypewriter();
                if (performance.now() - start > timeoutMs) {
                  throw new Error(`Timed out waiting (state=${eng.state}, busy=${eng.busy})`);
                }
                await new Promise((r) => setTimeout(r, 15));
              }
            };

            let engine = null;
            const origRand = Math.random;
            try {
              window.localStorage.removeItem(TEST_KEY);
              const store = new StorageManager(TEST_KEY);
              store.updateSettings({ battlePace: 'fast' });
              store.selectTrainer('violet');
              store.chooseStarter(1);
              const vp = store.getActiveProfile();

              engine = new BattleEngine({
                storage: store,
                audio: noopAudio,
                onBattleEnd() {},
                onBadgesUnlocked() {},
                onHudRefresh() {},
              });

              // 1. 4 new layered arenas (canyon, reef, ruins, rift)
              for (const biomeId of ['canyon', 'reef', 'ruins', 'rift']) {
                vp.team[0] = createPokemon(1, 20, biomeId);
                const sp = engine.start({ enemy: createPokemon(25, 16, biomeId), biomeId });
                await waitUntil(engine, () => engine.state === BATTLE_STATES.PLAYER_INPUT);
                await sp;
                const stageEl = document.getElementById('battle-stage');
                assertEqual(stageEl.dataset.biome, biomeId, `battle-stage data-biome === ${biomeId}`);
                const skyBg = window.getComputedStyle(stageEl.querySelector('.scenery-sky')).backgroundImage;
                assert(Boolean(skyBg && skyBg !== 'none'), `${biomeId} scenery-sky rendered`);
                engine.stop({ outcome: 'escaped', faintedAll: false });
              }

              // 2. All 28 abilities via playAbilityVisual (aura + canvas FX + banner + cleanup)
              const stageEl = document.getElementById('battle-stage');
              const bannerEl = document.getElementById('battle-ability-banner');
              vp.team[0] = createPokemon(1, 20, 'rift');
              const visStart = engine.start({ enemy: createPokemon(10, 12, 'rift'), biomeId: 'rift' });
              await waitUntil(engine, () => engine.state === BATTLE_STATES.PLAYER_INPUT);
              await visStart;

              for (const ab of Object.values(ABILITIES)) {
                const cuesBefore = cueCalls.length;
                const p = engine.playAbilityVisual('player', ab.id, 'Test Spark', engine.sessionId);
                assertEqual(bannerEl.hidden, false, `${ab.id}: banner visible`);
                assertEqual(bannerEl.dataset.ability, ab.id, `${ab.id}: banner dataset.ability`);
                assertEqual(bannerEl.dataset.type, ab.type, `${ab.id}: banner dataset.type`);
                assertEqual(stageEl.dataset.abilityAura, ab.type, `${ab.id}: stage data-ability-aura === ${ab.type}`);
                assertGreater(engine.abilityStageFx.length, 0, `${ab.id}: abilityStageFx spawned`);
                await p;
                assertEqual(bannerEl.hidden, true, `${ab.id}: banner hides cleanly`);
                assertEqual(stageEl.dataset.abilityAura, undefined, `${ab.id}: stage data-ability-aura cleared`);
                assert(cueCalls.slice(cuesBefore).some(([id]) => id === ab.id), `${ab.id}: playAbilityCue fired`);
              }

              // 3. All 16 Sprint 7 move choreographies
              const sprint7MoveIds = [
                'thorn_barrage', 'jungle_totem', 'inferno_overdrive', 'blaze_kick',
                'abyssal_geyser', 'pearl_cascade', 'steppe_bolt', 'ion_tempest',
                'canyon_rend', 'amber_bastion', 'chrono_cannon', 'champion_strike',
                'polar_lance', 'relic_hex', 'rift_claw', 'cosmos_supernova',
              ];
              for (const mvId of sprint7MoveIds) {
                const mv = MOVES[mvId];
                const fakeRes = mv.category === 'shield'
                  ? { category: 'shield', damage: 0, heal: 6, grantShield: true, buffStat: 'def', buffStages: 1, effectiveness: 1, isCrit: false, missed: false }
                  : mv.category === 'buff'
                    ? { category: 'buff', damage: 0, heal: 0, grantShield: false, buffStat: 'atk', buffStages: 1, effectiveness: 1, isCrit: false, missed: false }
                    : { category: 'attack', damage: 28, heal: 0, effectiveness: 1, isCrit: false, missed: false };
                await engine.playAttackVisual('player', 'enemy', mv, fakeRes, engine.enemy, engine.sessionId);
              }

              engine.stop({ outcome: 'escaped', faintedAll: false });
              assertEqual(engine.abilityStageFx.length, 0, 'abilityStageFx cleared on stop()');
              assertEqual(stageEl.dataset.abilityAura, undefined, 'data-ability-aura cleared on stop()');

              // 4. Live entry shield (pearl_aegis & rift_sovereign)
              for (const abId of ['pearl_aegis', 'rift_sovereign']) {
                const spId = Object.values(SPECIES).find((s) => s.ability === abId)?.id;
                const mon = createPokemon(spId, 24, 'rift');
                vp.team[0] = mon;
                const sp = engine.start({ enemy: createPokemon(10, 12, 'rift'), biomeId: 'rift' });
                await waitUntil(engine, () => engine.state === BATTLE_STATES.PLAYER_INPUT);
                await sp;
                assertEqual(mon.abilityEntryTriggered, true, `${abId} entry triggered`);
                assertGreater(mon.shieldTurns, 0, `${abId} granted entry shieldTurns`);
                engine.stop({ outcome: 'escaped', faintedAll: false });
              }

              // 5. Live nectar_siphon drain heal + phantom_mirage defense SPD +1 + thunder_steppe turn-end SPD +1
              const nectarSp = Object.values(SPECIES).find((s) => s.ability === 'nectar_siphon')?.id;
              const mirageSp = Object.values(SPECIES).find((s) => s.ability === 'phantom_mirage')?.id;
              const steppeSp = Object.values(SPECIES).find((s) => s.ability === 'thunder_steppe')?.id;

              const nectarMon = createPokemon(nectarSp, 22, 'marsh');
              nectarMon.hp = Math.max(1, nectarMon.maxHp - 20);
              const hpBeforeDrain = nectarMon.hp;
              vp.team[0] = nectarMon;
              const sNec = engine.start({ enemy: createPokemon(143, 35, 'marsh'), biomeId: 'marsh' });
              await waitUntil(engine, () => engine.state === BATTLE_STATES.PLAYER_INPUT);
              await sNec;
              const timer1 = setInterval(() => engine.finishTypewriter(), 15);
              try {
                Math.random = () => 0.5;
                await engine.executeMoveAction('player', MOVES.thorn_barrage, engine.sessionId);
              } finally {
                clearInterval(timer1);
                Math.random = origRand;
              }
              assertGreater(nectarMon.hp, hpBeforeDrain, 'nectar_siphon healed attacker via drainHeal in BattleEngine');
              engine.stop({ outcome: 'escaped', faintedAll: false });

              const mirageDef = createPokemon(mirageSp, 35, 'ruins');
              vp.team[0] = createPokemon(1, 14, 'ruins');
              const sMir = engine.start({ enemy: mirageDef, biomeId: 'ruins' });
              await waitUntil(engine, () => engine.state === BATTLE_STATES.PLAYER_INPUT);
              await sMir;
              const cuesPreMirage = cueCalls.length;
              const timer2 = setInterval(() => engine.finishTypewriter(), 15);
              try {
                Math.random = () => 0.5;
                await engine.executeMoveAction('player', MOVES.confusion, engine.sessionId);
              } finally {
                clearInterval(timer2);
                Math.random = origRand;
              }
              assert(cueCalls.slice(cuesPreMirage).some(([id]) => id === 'phantom_mirage'), 'phantom_mirage cue fired');
              assertEqual(mirageDef.battleStages.spd, 1, 'phantom_mirage raised defender SPD +1 in BattleEngine');
              engine.stop({ outcome: 'escaped', faintedAll: false });

              const steppeMon = createPokemon(steppeSp, 22, 'canyon');
              vp.team[0] = steppeMon;
              const sStp = engine.start({ enemy: createPokemon(143, 35, 'canyon'), biomeId: 'canyon' });
              await waitUntil(engine, () => engine.state === BATTLE_STATES.PLAYER_INPUT);
              await sStp;
              const timer3 = setInterval(() => engine.finishTypewriter(), 15);
              try {
                Math.random = () => 0.5;
                await engine.executeMoveAction('player', MOVES.tackle, engine.sessionId);
                assertEqual(steppeMon.battleStages.spd, 1, 'thunder_steppe raised SPD +1 at full HP turn end');
                await engine.executeMoveAction('player', MOVES.tackle, engine.sessionId);
                assertEqual(steppeMon.battleStages.spd, 2, 'thunder_steppe raised SPD to +2 on second turn');
              } finally {
                clearInterval(timer3);
                Math.random = origRand;
              }
              engine.stop({ outcome: 'escaped', faintedAll: false });

              // 6. Victory drops for ruins (chrono_gem) & rift (nebula_gem)
              for (const [bId, expectedGem] of [['ruins', 'chrono_gem'], ['rift', 'nebula_gem']]) {
                vp.bag.gems[expectedGem] = 0;
                engine.active = true;
                engine.sessionId += 1;
                engine.biomeId = bId;
                engine.isShrine = false;
                engine.isTrainer = false;
                engine.shrineData = null;
                engine.player = createPokemon(1, 30, bId);
                engine.enemy = createPokemon(25, 10, bId);
                engine.enemy.hp = 0;
                const dropTimer = setInterval(() => engine.finishTypewriter(), 15);
                try {
                  Math.random = () => 0.1;
                  await engine.handleEnemyDefeated(engine.sessionId);
                } finally {
                  clearInterval(dropTimer);
                  Math.random = origRand;
                }
                assertEqual(vp.bag.gems[expectedGem], 1, `${bId} victory drop awarded ${expectedGem}`);
              }
            } finally {
              Math.random = origRand;
              engine?.destroy();
              window.localStorage.removeItem(TEST_KEY);
            }
          },
        },
      ],
    },
    {
      name: '34. 84x72 Archipelago BFS, 649-Dex Ability Filter & Lazy Sprites, v7 SW & Zero-Overlap Gate',
      tests: [
        {
          name: '84x72 map BFS (16 shrines, 28 chests, 19 NPCs/quests, 13 rivals, 16 landmarks, 14 signposts, 11 heals, 13 encounter biomes) & tiles 37..48 hold',
          fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            assertEqual(WORLD_COLS, 84, 'WORLD_COLS === 84');
            assertEqual(WORLD_ROWS, 72, 'WORLD_ROWS === 72');
            assertEqual(WORLD_MAP.length, 72, 'WORLD_MAP has 72 rows');
            for (let y = 0; y < WORLD_ROWS; y++) {
              assertEqual(WORLD_MAP[y].length, 84, `row ${y} width === 84`);
            }

            // Preserved (0..67, 0..59) zones + 4 new biomes
            assertEqual(isTileWalkableAt(8, 15), true, 'spawn (8,15) walkable');
            assertEqual(isTileWalkableAt(18, 14), false, '(18,14) corridor wall solid');
            assertEqual(getBiomeAt(8, 15).id, 'village', '(8,15) remains village');
            assertEqual(getBiomeAt(60, 10).id, 'desert', '(60,10) remains desert');
            assertEqual(getBiomeAt(14, 54).id, 'marsh', '(14,54) remains marsh');
            assertEqual(getBiomeAt(60, 45).id, 'sanctum', '(60,45) remains sanctum');
            assertEqual(getBiomeAt(76, 15).id, 'canyon', 'east band (76,15) is canyon');
            assertEqual(getBiomeAt(20, 65).id, 'reef', 'SW band (20,65) is reef');
            assertEqual(getBiomeAt(50, 65).id, 'ruins', 'south-central band (50,65) is ruins');
            assertEqual(getBiomeAt(76, 45).id, 'rift', 'SE band (76,45) is rift');

            // Tiles 37..48 & solid walls 39, 42, 45, 48
            assertEqual(TILE.CANYON_GRASS, 37, 'TILE.CANYON_GRASS === 37');
            assertEqual(TILE.CANYON_WALL, 39, 'TILE.CANYON_WALL === 39');
            assertEqual(TILE.REEF_WATER, 40, 'TILE.REEF_WATER === 40');
            assertEqual(TILE.REEF_WALL, 42, 'TILE.REEF_WALL === 42');
            assertEqual(TILE.RUINS_FLOOR, 43, 'TILE.RUINS_FLOOR === 43');
            assertEqual(TILE.RUINS_WALL, 45, 'TILE.RUINS_WALL === 45');
            assertEqual(TILE.RIFT_FLOOR, 46, 'TILE.RIFT_FLOOR === 46');
            assertEqual(TILE.RIFT_WALL, 48, 'TILE.RIFT_WALL === 48');
            for (const wallId of [39, 42, 45, 48]) {
              assert(SOLID_TILES.has(wallId), `SOLID_TILES contains ${wallId}`);
            }

            // Object counts
            assertEqual(Object.keys(BIOMES).length, 14, '14 biomes');
            assertEqual(Object.keys(SHRINES).length, 16, '16 shrines');
            assertEqual(Object.keys(CHESTS).length, 28, '28 chests');
            assertEqual(Object.keys(NPCS).length, 19, '19 NPCs');
            assertEqual(FIELD_QUESTS.length, 19, '19 quests');
            assertEqual(Object.keys(RIVAL_TRAINERS).length, 13, '13 rivals');
            assertEqual(Object.keys(LANDMARKS).length, 16, '16 landmarks');
            assertEqual(Object.keys(SIGNPOSTS).length, 14, '14 signposts');

            // Full BFS from (8,15)
            const visited = new Set([`${GAME_META.spawn.x},${GAME_META.spawn.y}`]);
            const queue = [[GAME_META.spawn.x, GAME_META.spawn.y]];
            for (let head = 0; head < queue.length; head++) {
              const [cx, cy] = queue[head];
              for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
                const nx = cx + dx;
                const ny = cy + dy;
                const key = `${nx},${ny}`;
                if (!visited.has(key) && isTileWalkableAt(nx, ny)) {
                  visited.add(key);
                  queue.push([nx, ny]);
                }
              }
            }
            const hasAdj = (coordKey) => {
              const [x, y] = coordKey.split(',').map(Number);
              return [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => visited.has(`${x + dx},${y + dy}`));
            };

            for (const [label, map] of [
              ['shrine', SHRINES],
              ['chest', CHESTS],
              ['npc', NPCS],
              ['rival', RIVAL_TRAINERS],
              ['landmark', LANDMARKS],
              ['signpost', SIGNPOSTS],
            ]) {
              for (const [k, v] of Object.entries(map)) {
                assertEqual(hasAdj(k), true, `${label} ${v?.id || k} at ${k} reachable`);
              }
            }

            const encTiles = new Map([
              [TILE.TALL_GRASS, 'forest'],
              [TILE.CAVE_FLOOR, 'cave'],
              [TILE.SHALLOW_WATER, 'water'],
              [TILE.VOLCANO_FLOOR, 'volcano'],
              [TILE.SNOW_GRASS, 'peak'],
              [TILE.GROVE_GRASS, 'grove'],
              [TILE.DUNE_SAND, 'desert'],
              [TILE.MARSH_GRASS, 'marsh'],
              [TILE.SANCTUM_FLOOR, 'sanctum'],
              [TILE.CANYON_GRASS, 'canyon'],
              [TILE.REEF_WATER, 'reef'],
              [TILE.RUINS_FLOOR, 'ruins'],
              [TILE.RIFT_FLOOR, 'rift'],
            ]);
            const reachableBiomes = new Set();
            let healCount = 0;
            for (let y = 0; y < WORLD_ROWS; y++) {
              for (let x = 0; x < WORLD_COLS; x++) {
                const t = WORLD_MAP[y][x];
                if (t === TILE.HEAL) {
                  healCount += 1;
                  assertEqual(visited.has(`${x},${y}`), true, `Healing Fountain (${x},${y}) reachable`);
                }
                if (encTiles.has(t) && visited.has(`${x},${y}`)) {
                  reachableBiomes.add(getBiomeAt(x, y).id);
                }
              }
            }
            assertEqual(healCount, 11, '11 Healing Fountains present & reachable');
            for (const bId of encTiles.values()) {
              assert(reachableBiomes.has(bId), `wild encounter tiles reachable in ${bId}`);
            }

            // Compass shrine chain sanctum -> canyon -> reef -> ruins -> rift
            const thruSanctum = [
              'forest_shrine', 'cave_shrine', 'water_shrine', 'volcano_shrine',
              'peak_shrine', 'thunder_shrine', 'eclipse_shrine', 'starlight_shrine',
              'grove_shrine', 'desert_shrine', 'marsh_shrine', 'sanctum_shrine',
            ];
            assertEqual(getCompassGuidance({ shrinesCleared: thruSanctum, pokedex: { caught: {} } }).targetBiomeId, 'canyon', 'Compass -> canyon');
            assertEqual(getCompassGuidance({ shrinesCleared: [...thruSanctum, 'canyon_shrine'], pokedex: { caught: {} } }).targetBiomeId, 'reef', 'Compass -> reef');
            assertEqual(getCompassGuidance({ shrinesCleared: [...thruSanctum, 'canyon_shrine', 'reef_shrine'], pokedex: { caught: {} } }).targetBiomeId, 'ruins', 'Compass -> ruins');
            assertEqual(getCompassGuidance({ shrinesCleared: [...thruSanctum, 'canyon_shrine', 'reef_shrine', 'ruins_shrine'], pokedex: { caught: {} } }).targetBiomeId, 'rift', 'Compass -> rift');

            // Overworld rendering in all 4 new biomes
            const prevRawSave = window.localStorage.getItem(STORAGE_KEY);
            const wasBootHidden = app.bootScreenEl.hidden;
            const wasStarterHidden = app.starterScreenEl.hidden;
            const wasShellHidden = app.gameShellEl.hidden;
            const wasOverworldActive = app.overworld.active;
            try {
              window.localStorage.removeItem(STORAGE_KEY);
              storage.state = storage.load();
              storage.selectTrainer('violet');
              storage.chooseStarter(1);
              const prof = storage.getActiveProfile();
              app.bootScreenEl.hidden = true;
              app.starterScreenEl.hidden = true;
              app.gameShellEl.hidden = false;
              app.overworld.setActive(true);
              for (const [x, y] of [[75, 14], [18, 65], [50, 65], [75, 45]]) {
                prof.pos = { x, y, dir: 'down' };
                app.overworld.followerInitialized = false;
                app.overworld.syncFromProfile();
                app.overworld.render(performance.now());
              }
            } finally {
              if (prevRawSave === null) window.localStorage.removeItem(STORAGE_KEY);
              else window.localStorage.setItem(STORAGE_KEY, prevRawSave);
              storage.state = storage.load();
              app.overworld.followerInitialized = false;
              app.bootScreenEl.hidden = wasBootHidden;
              app.starterScreenEl.hidden = wasStarterHidden;
              app.gameShellEl.hidden = wasShellHidden;
              app.overworld.setActive(wasOverworldActive);
              if (!wasOverworldActive) app.audio?.stopBGM?.();
              if (!wasBootHidden) app.showBootScreen();
              else app.refreshHud();
              app.syncOverworldPause();
            }
          },
        },
        {
          name: '649-Dex #dex-ability-select, lazy sprites, focus safety, v7 SW, v1/v2 tiles 39/42/45/48 rescue, 60fps & zero-overlap gate',
          async fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            // 1. SW v7 & index.html static labels
            const swText = await (await fetch('./sw.js')).text();
            assert(swText.includes('starlight-shell-v7') && swText.includes('starlight-assets-v7'), 'sw.js uses v7 caches');
            const idxText = await (await fetch('./index.html')).text();
            assert(idxText.includes('1/649') && idxText.includes('0/24') && idxText.includes('0/16'), 'index.html reflects 649 Dex, 24 Badges & 16 Shrines');

            // 2. Solid tiles 39, 42, 45, 48 rescue & v1/v2 save migration
            const findFirstTile = (tileId) => {
              for (let y = 0; y < WORLD_ROWS; y++) {
                for (let x = 0; x < WORLD_COLS; x++) {
                  if (WORLD_MAP[y][x] === tileId) return { x, y };
                }
              }
              return null;
            };
            const solid39 = findFirstTile(39);
            const solid42 = findFirstTile(42);
            const solid45 = findFirstTile(45);
            const solid48 = findFirstTile(48);
            assert(Boolean(solid39 && solid42 && solid45 && solid48), 'found solid tiles 39, 42, 45, 48');
            for (const sPos of [solid39, solid42, solid45, solid48]) {
              const safe = sanitizePosition({ ...sPos, dir: 'down' });
              assertEqual(isTileWalkableAt(safe.x, safe.y), true, `sanitizePosition rescues off tile (${sPos.x},${sPos.y})`);
            }

            const MIG_KEY = 'starlight_pokemon_test_s34_mig_v1';
            try {
              window.localStorage.setItem(MIG_KEY, JSON.stringify({
                version: 1,
                activeTrainerId: 'violet',
                profiles: {
                  violet: {
                    trainerId: 'violet',
                    starterId: 1,
                    pos: { x: 8, y: 15, dir: 'down' },
                    team: [{ uid: 'v1', speciesId: 1, level: 12, xp: 5, hp: 35 }],
                    bag: { potions: 2, greatBalls: 1 },
                  },
                  ozias: {
                    trainerId: 'ozias',
                    starterId: 4,
                    pos: { ...solid48, dir: 'up' },
                    team: [{ uid: 'o1', speciesId: 493, level: 30, xp: 0, hp: 90 }],
                    bag: { potions: 4, greatBalls: 2, starBalls: 3, starShards: 8, gems: { chrono_gem: 2, nebula_gem: 1 } },
                  },
                },
              }));
              const migrated = new StorageManager(MIG_KEY);
              const mv = migrated.getProfile('violet');
              const mo = migrated.getProfile('ozias');
              assertEqual(mv.pos.x, 8, 'Violet (0..67, 0..59) x preserved');
              assertEqual(mv.pos.y, 15, 'Violet (0..67, 0..59) y preserved');
              assertEqual(mv.bag.gems.chrono_gem, 0, 'v1 hydrates chrono_gem: 0');
              assertEqual(mv.bag.gems.nebula_gem, 0, 'v1 hydrates nebula_gem: 0');
              assertEqual(mo.bag.gems.chrono_gem, 2, 'v2 preserves chrono_gem: 2');
              assertEqual(mo.bag.gems.nebula_gem, 1, 'v2 preserves nebula_gem: 1');
              assertEqual(isTileWalkableAt(mo.pos.x, mo.pos.y), true, 'Ozias rescued off solid RIFT_WALL (48)');
            } finally {
              window.localStorage.removeItem(MIG_KEY);
            }

            // 3. 649-Dex ability filter, lazy sprites, focus safety & layout gates
            const prevRawSave = window.localStorage.getItem(STORAGE_KEY);
            const wasBootHidden = app.bootScreenEl.hidden;
            const wasStarterHidden = app.starterScreenEl.hidden;
            const wasShellHidden = app.gameShellEl.hidden;
            const wasOverworldActive = app.overworld.active;
            const origCabinetStyle = app.cabinetEl?.getAttribute('style') ?? null;

            try {
              window.localStorage.removeItem(STORAGE_KEY);
              storage.state = storage.load();
              storage.selectTrainer('violet');
              storage.chooseStarter(1);
              const prof = storage.getActiveProfile();
              prof.team[0] = createPokemon(35, 18, 'rift', { upgradeTier: 3 });
              for (let id = 2; id <= 32; id++) {
                storage.recordSeen(id, false);
              }
              storage.recordCaught(createPokemon(248, 22, 'desert'));
              storage.save();

              app.bootScreenEl.hidden = true;
              app.starterScreenEl.hidden = true;
              app.gameShellEl.hidden = false;
              app.overworld.setActive(true);
              app.applyTrainerTheme('violet');
              app.refreshHud();

              app.openPokedex('dex');
              const allCards = Array.from(document.querySelectorAll('.dex-grid .dex-card'));
              assertEqual(allCards.length, 649, 'Dex synchronously renders all 649 cards');

              // Lazy-sprite check: >24 seen species -> first 24 resolved/remote, remaining seen start with fallback SVG & observer active
              const seenImgs = allCards.map((c) => c.querySelector('img.dex-sprite')).filter(Boolean);
              assertGreater(seenImgs.length, 28, '30+ seen cards render img.dex-sprite');
              assert(seenImgs.every((img) => !img.classList.contains('is-silhouette')), 'no .is-silhouette on seen cards');
              assert(Boolean(app.pokedex._dexSpriteObserver), 'IntersectionObserver active for >24 seen cards');

              const abilitySelect = document.getElementById('dex-ability-select');
              const typeSelect = document.getElementById('dex-type-select');
              const searchEl = document.getElementById('dex-search-input');
              assert(Boolean(abilitySelect && typeSelect && searchEl), '#dex-ability-select, type select & search input mounted');
              assertEqual(abilitySelect.value, 'all', '#dex-ability-select defaults to all');
              assertEqual(abilitySelect.options.length, 29, '#dex-ability-select has All + 28 ability options');

              // Input / Select focus safety
              let leaked = false;
              const unsub1 = app.input.on('navigate', () => { leaked = true; });
              const unsub2 = app.input.on('moveSlot', () => { leaked = true; });
              for (const el of [searchEl, typeSelect, abilitySelect]) {
                el.focus();
                el.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true }));
                el.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1', key: '1', bubbles: true }));
              }
              unsub1();
              unsub2();
              assertEqual(leaked, false, 'focusing search/type/ability controls never leaks WASD or Digit1 shortcuts');

              // Filter by ability
              abilitySelect.value = 'chrono_shift';
              abilitySelect.dispatchEvent(new Event('change', { bubbles: true }));
              const chronoCards = Array.from(document.querySelectorAll('.dex-grid .dex-card'));
              assert(chronoCards.length >= 5 && chronoCards.length < 649, `chrono_shift filter narrows (${chronoCards.length})`);
              for (const card of chronoCards) {
                const spId = Number(card.dataset.speciesId);
                assertEqual(SPECIES[spId]?.ability, 'chrono_shift', `card #${spId} has chrono_shift`);
              }

              // Search by seen ability name ('Dune Titan' -> includes #248)
              abilitySelect.value = 'all';
              abilitySelect.dispatchEvent(new Event('change', { bubbles: true }));
              searchEl.value = 'Dune Titan';
              searchEl.dispatchEvent(new Event('input', { bubbles: true }));
              const titanIds = Array.from(document.querySelectorAll('.dex-grid .dex-card')).map((c) => Number(c.dataset.speciesId));
              assert(titanIds.includes(248), 'searching seen ability name "Dune Titan" matches #248 Tyranitar');

              // 13-biome filter pills (all 13 non-village biomes)
              for (const bId of ['forest', 'cave', 'water', 'volcano', 'peak', 'grove', 'desert', 'marsh', 'sanctum', 'canyon', 'reef', 'ruins', 'rift']) {
                assert(Boolean(document.querySelector(`.dex-filter-pill[data-filter="${bId}"]`)), `biome filter pill ${bId} exists`);
              }

              // 0-match Show All resets ability filter too
              abilitySelect.value = 'chrono_shift';
              abilitySelect.dispatchEvent(new Event('change', { bubbles: true }));
              searchEl.value = 'ZZZZ_NOMATCH';
              searchEl.dispatchEvent(new Event('input', { bubbles: true }));
              const resetBtn = document.querySelector('.dex-reset-filters-btn');
              assert(Boolean(resetBtn), 'Show All button rendered on 0 matches');
              resetBtn.click();
              assertEqual(app.pokedex.dexAbilityFilter, 'all', 'Show All resets dexAbilityFilter to all');
              assertEqual(document.getElementById('dex-ability-select').value, 'all', 'Show All resets #dex-ability-select value');
              assertEqual(document.querySelectorAll('.dex-grid .dex-card').length, 649, 'Show All restores 649 cards');

              // Reopen resets ability filter
              document.getElementById('dex-ability-select').value = 'pearl_aegis';
              document.getElementById('dex-ability-select').dispatchEvent(new Event('change', { bubbles: true }));
              app.openPokedex('dex');
              assertEqual(app.pokedex.dexAbilityFilter, 'all', 'reopening Dex resets dexAbilityFilter');
              assertEqual(document.querySelectorAll('.dex-grid .dex-card').length, 649, 'reopened Dex renders 649 cards');

              app.pokedex.close();
              assertEqual(app.pokedex._dexSpriteObserver, null, 'closing Dex disconnects IntersectionObserver');

              // Guide (14 biomes, 19 quests) & Badges (24)
              app.openPokedex('guide');
              assertEqual(document.querySelectorAll('.biome-progress-card').length, 14, 'Guide renders 14 biome cards');
              assertEqual(document.querySelectorAll('.quests-list .quest-card').length, 19, 'Guide renders 19 field quests');
              app.openPokedex('badges');
              assertEqual(document.querySelectorAll('.badges-grid .badge-card').length, 24, 'Badges tab renders 24 badge cards');
              app.pokedex.close();

              // Verify zero horizontal overflow across Dex / Guide / Badges tabs at 1280x720 & 1024x768
              for (const [label, w, h] of [
                ['Chromebook 1280x720', 940, Math.round(720 * 0.985)],
                ['Tablet 1024x768', 940, Math.round(768 * 0.985)],
              ]) {
                app.cabinetEl.style.width = `${w}px`;
                app.cabinetEl.style.height = `${h}px`;
                for (const tab of ['dex', 'guide', 'badges']) {
                  app.openPokedex(tab);
                  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
                  const bodyEl = document.getElementById('pokedex-body');
                  assert(bodyEl.scrollWidth <= bodyEl.clientWidth + 2, `${label} ${tab}: modal body overflow (${bodyEl.scrollWidth} > ${bodyEl.clientWidth})`);
                  if (tab === 'dex') {
                    const searchRow = document.querySelector('.dex-search-row');
                    assert(searchRow.scrollWidth <= searchRow.clientWidth + 2, `${label} dex: searchRow overflow (${searchRow.scrollWidth} > ${searchRow.clientWidth})`);
                  }
                }
              }
              app.pokedex.close();

              // 4. Layout non-overlap at 1280x720 & 1024x768 (HUD, cards/sprites, ability banner)
              app.hudInstallGroupEl.hidden = false;
              const startBattleP = app.battle.start({
                enemy: createPokemon(493, 32, 'rift', { isElite: true, upgradeTier: 3 }),
                biomeId: 'rift',
              });
              app.syncControlVisibility();
              const fastTimer = setInterval(() => app.battle.finishTypewriter(), 15);
              try {
                await startBattleP;
              } finally {
                clearInterval(fastTimer);
              }

              const overlaps = (a, b) => !(
                a.right <= b.left ||
                a.left >= b.right ||
                a.bottom <= b.top ||
                a.top >= b.bottom
              );

              const bannerEl = document.getElementById('battle-ability-banner');
              for (const [label, w, h] of [
                ['Chromebook 1280x720', 940, Math.round(720 * 0.985)],
                ['Tablet 1024x768', 940, Math.round(768 * 0.985)],
              ]) {
                app.cabinetEl.style.width = `${w}px`;
                app.cabinetEl.style.height = `${h}px`;
                await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

                const hudBar = document.querySelector('.hud-bar');
                assert(hudBar.scrollWidth <= hudBar.clientWidth + 2, `${label}: HUD no horizontal overflow`);

                const enemyCard = document.querySelector('.status-card-enemy').getBoundingClientRect();
                const playerSprite = document.querySelector('.fighter-sprite-player').getBoundingClientRect();
                const playerCard = document.querySelector('.status-card-player').getBoundingClientRect();
                const enemySprite = document.querySelector('.fighter-sprite-enemy').getBoundingClientRect();
                assertEqual(overlaps(enemyCard, playerSprite), false, `${label}: enemyCard vs playerSprite`);
                assertEqual(overlaps(playerCard, enemySprite), false, `${label}: playerCard vs enemySprite`);

                for (const side of ['player', 'enemy']) {
                  bannerEl.hidden = false;
                  bannerEl.dataset.side = side;
                  bannerEl.dataset.type = 'dragon';
                  bannerEl.innerHTML = '<span class="ability-banner-icon">☄️</span> <span class="ability-banner-text">Astral Rift — Attack +1 & Shield!</span>';
                  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
                  const bannerRect = bannerEl.getBoundingClientRect();
                  assertEqual(overlaps(bannerRect, enemyCard), false, `${label} (${side}): banner vs enemyCard`);
                  assertEqual(overlaps(bannerRect, playerCard), false, `${label} (${side}): banner vs playerCard`);
                  assertEqual(overlaps(bannerRect, enemySprite), false, `${label} (${side}): banner vs enemySprite`);
                  assertEqual(overlaps(bannerRect, playerSprite), false, `${label} (${side}): banner vs playerSprite`);
                }
                bannerEl.hidden = true;
              }
              app.battle.stop({ outcome: 'escaped', faintedAll: false });

              // 5. 60fps loop
              const fpsDeadline = performance.now() + 1400;
              while (app.getDiagnostics().measuredFps <= 0 && performance.now() < fpsDeadline) {
                await new Promise((r) => setTimeout(r, 60));
              }
              const diag = app.getDiagnostics();
              assertEqual(diag.loopRafActive, true, 'loopRafActive === true');
              assertEqual(diag.loopStartCount, 1, 'loopStartCount === 1');
              assertGreater(diag.measuredFps, 0, `measuredFps > 0 (got ${diag.measuredFps})`);
            } finally {
              if (origCabinetStyle === null) app.cabinetEl?.removeAttribute('style');
              else app.cabinetEl?.setAttribute('style', origCabinetStyle);
              if (app.battle.active) app.battle.stop({ outcome: 'escaped', faintedAll: false });
              app.pokedex.close();
              app.closeSettings();
              app.hudInstallGroupEl.hidden = true;
              if (prevRawSave === null) window.localStorage.removeItem(STORAGE_KEY);
              else window.localStorage.setItem(STORAGE_KEY, prevRawSave);
              storage.state = storage.load();
              app.applyTrainerTheme(storage.getActiveTrainerId() || 'violet');
              app.encounterTransitioning = false;
              app.bootScreenEl.hidden = wasBootHidden;
              app.starterScreenEl.hidden = wasStarterHidden;
              app.gameShellEl.hidden = wasShellHidden;
              app.overworld.setActive(wasOverworldActive);
              if (!wasOverworldActive) app.audio?.stopBGM?.();
              app.applySettings();
              if (!wasBootHidden) app.showBootScreen();
              else app.refreshHud();
              app.syncControlVisibility();
              app.syncOverworldPause();
            }
          },
        },
      ],
    },
  ];
}

function renderTestBadge(summary) {
  const existing = document.getElementById('starlight-test-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'starlight-test-banner';
  banner.dataset.summary = JSON.stringify({
    passed: summary.passed,
    failed: summary.failed,
    total: summary.total,
    durationMs: summary.durationMs,
    allPassed: summary.allPassed,
    failures: summary.results.filter((r) => !r.passed),
  });
  banner.style.cssText = [
    'position: fixed',
    'top: 8px',
    'left: 8px',
    'z-index: 9999',
    'padding: 8px 12px',
    'border-radius: 10px',
    'font: 800 12px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace',
    'color: #f8fafc',
    `background: ${summary.allPassed ? 'rgba(6, 78, 59, 0.94)' : 'rgba(127, 29, 29, 0.95)'}`,
    `border: 2px solid ${summary.allPassed ? '#34d399' : '#f87171'}`,
    'box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45)',
    'display: flex',
    'align-items: center',
    'gap: 10px',
  ].join(';');

  const text = document.createElement('span');
  text.textContent = summary.allPassed
    ? `TESTS PASS: ${summary.passed}/${summary.total} (${summary.durationMs}ms)`
    : `TESTS FAIL: ${summary.failed}/${summary.total} failed (${summary.durationMs}ms)`;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'background:transparent;border:none;color:#f8fafc;font-weight:900;cursor:pointer;padding:0 2px;';
  closeBtn.addEventListener('click', () => banner.remove());

  banner.appendChild(text);
  banner.appendChild(closeBtn);
  document.body.appendChild(banner);
}

export async function runGameTests({ showBanner = false } = {}) {
  const suites = buildTestSuites();
  const startMs = performance.now();
  let passed = 0;
  let failed = 0;
  const results = [];

  console.group('%c★ Pokémon: Starlight Island — Automated Test Suite', 'color:#c084fc;font-weight:bold;font-size:13px;');

  for (const suite of suites) {
    console.group(`%c${suite.name}`, 'color:#38bdf8;font-weight:bold;');
    for (const testCase of suite.tests) {
      const t0 = performance.now();
      try {
        await testCase.fn();
        const elapsed = Number((performance.now() - t0).toFixed(2));
        passed += 1;
        results.push({ suite: suite.name, name: testCase.name, passed: true, durationMs: elapsed });
        console.log(`%c[PASS]%c ${testCase.name} (${elapsed}ms)`, 'color:#22c55e;font-weight:bold;', 'color:#e2e8f0;');
      } catch (err) {
        const elapsed = Number((performance.now() - t0).toFixed(2));
        failed += 1;
        const message = err?.message || String(err);
        results.push({ suite: suite.name, name: testCase.name, passed: false, durationMs: elapsed, error: message });
        console.error(`%c[FAIL]%c ${testCase.name} — ${message}`, 'color:#ef4444;font-weight:bold;', 'color:#fecaca;');
        if (err?.stack) console.error(err.stack);
      }
    }
    console.groupEnd();
  }

  const total = passed + failed;
  const durationMs = Number((performance.now() - startMs).toFixed(2));
  const allPassed = failed === 0;

  const badgeStyle = allPassed
    ? 'background:#065f46;color:#d1fae5;padding:3px 8px;border-radius:4px;font-weight:bold;'
    : 'background:#991b1b;color:#fee2e2;padding:3px 8px;border-radius:4px;font-weight:bold;';
  console.log(
    `%c${allPassed ? 'ALL TESTS PASSED' : 'TEST FAILURES DETECTED'}%c ${passed}/${total} passed, ${failed} failed in ${durationMs}ms`,
    badgeStyle,
    'color:#f8fafc;font-weight:bold;',
  );
  console.groupEnd();

  const summary = { passed, failed, total, durationMs, allPassed, results };
  window.__starlightTestSummary = summary;

  if (showBanner || new URLSearchParams(window.location.search).get('test') === 'true') {
    renderTestBadge(summary);
  }

  return summary;
}

window.runGameTests = runGameTests;

if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  if (params.get('test') === 'true') {
    const launch = () => setTimeout(() => runGameTests({ showBanner: true }), 40);
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', launch);
    } else {
      launch();
    }
  }
}
