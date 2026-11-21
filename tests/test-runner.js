// Zero-Dependency Automated Test Suite for Pokémon: Starlight Island
// Run manually via `await window.runGameTests()` in DevTools console or automatically via `?test=true`

import {
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
  SPECIES,
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
  generateSilhouetteDataUri,
  getBattleShardReward,
  getBiomeScaledRange,
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
              assert(BADGES.length === 12 && Object.keys(SPECIES).length === 90, 'Config roster intact');
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
      name: '12. Evolution Chains, Evolution Gems & Expanded 90-Species Roster',
      tests: [
        {
          name: 'All 10 TYPES have fallback SVGs, 90 SPECIES & 8 gems exist, and level & gem evolutions update Pokemon & Storage',
          async fn() {
            const typeIds = Object.keys(TYPES);
            assertEqual(typeIds.length, 10, '10 elemental types exist');
            for (const reqType of ['grass', 'fire', 'water', 'electric', 'rock', 'psychic', 'normal', 'ice', 'ghost', 'dragon']) {
              assert(Boolean(TYPES[reqType]), `TYPES.${reqType} present`);
              const resp = await fetch(`./assets/fallback/${reqType}.svg`);
              assertEqual(resp.ok, true, `fallback SVG exists for ${reqType}`);
            }

            assertEqual(Object.keys(SPECIES).length, 90, '90 species defined');
            assertEqual(Object.keys(EVOLUTION_ITEMS).length, 8, '8 evolution gems defined');
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
            const eeveeNoGems = eevee.getAvailableItemEvolutions({ water_gem: 0, thunder_gem: 0, fire_gem: 0, moon_gem: 0, leaf_gem: 0, ice_gem: 0, sun_gem: 0, dusk_gem: 0 });
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
      name: '14. 6 Biomes, 8 Shrines, NPCs, Quests & Starlight Compass',
      tests: [
        {
          name: '52x38 world map is BFS-reachable to all 6 biomes, 8 shrines, 12 chests, 10 NPCs, landmarks & quests work',
          fn() {
            assertEqual(WORLD_COLS, 52, 'WORLD_COLS === 52');
            assertEqual(WORLD_ROWS, 38, 'WORLD_ROWS === 38');
            assertEqual(WORLD_MAP.length, 38, 'WORLD_MAP has 38 rows');
            for (let y = 0; y < WORLD_ROWS; y++) {
              assertEqual(WORLD_MAP[y].length, 52, `row ${y} width === 52`);
            }

            const reqBiomes = ['village', 'forest', 'cave', 'water', 'volcano', 'peak'];
            for (const bId of reqBiomes) {
              assert(Boolean(BIOMES[bId]), `BIOMES.${bId} exists`);
            }

            const shrineList = Object.entries(SHRINES);
            assertEqual(shrineList.length, 8, '8 shrines exist');
            const chestList = Object.entries(CHESTS);
            assertEqual(chestList.length, 12, '12 chests exist');
            assertEqual(Object.keys(NPCS).length, 10, '10 NPCs exist');
            assertGreater(Object.keys(LANDMARKS).length, 4, '5+ landmarks exist');

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
                app.hudDexBtn.textContent.includes('Dex 7/90'),
                `HUD Dex pill displays reconciled 7/90, got "${app.hudDexBtn.textContent}"`,
              );

              app.openPokedex('dex');
              const summaryText = document.querySelector('.dex-summary-bar')?.textContent || '';
              assert(summaryText.includes('Caught: 7/90'), `Dex summary shows Caught: 7/90, got "${summaryText}"`);
              assert(summaryText.includes('Seen: 9/90'), `Dex summary shows Seen: 9/90, got "${summaryText}"`);

              const cards = Array.from(document.querySelectorAll('.dex-grid .dex-card'));
              assertEqual(cards.length, 90, '90 Pokédex cards rendered');
              assertEqual(cards.filter((c) => c.classList.contains('is-caught')).length, 7, '7 .is-caught cards rendered');
              assertEqual(cards.filter((c) => c.classList.contains('is-seen')).length, 2, '2 .is-seen cards rendered');
              assertEqual(cards.filter((c) => c.classList.contains('is-unknown')).length, 81, '81 .is-unknown cards rendered');

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
              assert(guideText.includes('Dex: 7/90'), `Guide tab shows matching Dex: 7/90, got "${guideText}"`);
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
      name: '18. Expanded Roster, 12 Badges, 8 Shrines, 12 Chests, 10 Quests, 5 Rivals & Safe Relocation',
      tests: [
        {
          name: '90 species, 10 Sprint-3 + 8 Sprint-4 moves, 8 gems, 12 badges, 8 shrines, 12 chests, 10 quests, 5 rivals & BFS/sanitizePosition hold',
          fn() {
            assertEqual(Object.keys(SPECIES).length, 90, '90 species total');
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

            assertEqual(Object.keys(EVOLUTION_ITEMS).length, 8, '8 evolution gems exist');
            assert(Boolean(EVOLUTION_ITEMS.leaf_gem && EVOLUTION_ITEMS.ice_gem), 'leaf_gem and ice_gem present');
            assertEqual(EVOLUTIONS[133].length, 7, '7 Eeveelutions defined');

            assertEqual(BADGES.length, 12, '12 badges defined');
            const tempest = BADGES.find((b) => b.id === 'tempest');
            const celestial = BADGES.find((b) => b.id === 'celestial');
            assert(Boolean(tempest && celestial), 'tempest and celestial badges exist');
            assertEqual(tempest.check({ shrinesCleared: ['thunder_shrine'], pokedex: { caught: {} } }), true, 'tempest unlocks on thunder_shrine');
            assertEqual(tempest.check({ shrinesCleared: [], pokedex: { caught: { 25: 1, 179: 1, 180: 1 } } }), true, 'tempest unlocks on 3 Electric species');
            assertEqual(celestial.check({ shrinesCleared: ['starlight_shrine'], pokedex: { caught: {} } }), true, 'celestial unlocks on starlight_shrine');
            const caught25 = Object.fromEntries(Object.keys(SPECIES).slice(0, 25).map((id) => [id, 1]));
            assertEqual(celestial.check({ shrinesCleared: [], pokedex: { caught: caught25 } }), true, 'celestial unlocks on 25 caught species');

            assertEqual(Object.keys(SHRINES).length, 8, '8 shrines defined');
            assertEqual(Object.values(SHRINES).some((s) => s.id === 'thunder_shrine' && s.guardianId === 145), true, 'thunder_shrine guardian Zapdos #145');
            assertEqual(Object.values(SHRINES).some((s) => s.id === 'starlight_shrine' && s.guardianId === 151), true, 'starlight_shrine guardian Mew #151');
            assertEqual(Object.keys(CHESTS).length, 12, '12 chests defined');
            assertEqual(Object.keys(NPCS).length, 10, '10 NPCs defined');
            assertEqual(FIELD_QUESTS.length, 10, '10 quests defined');
            assertEqual(FIELD_QUESTS.some((q) => q.id === 'quest_celeste_style'), true, 'quest_celeste_style exists');
            assertEqual(FIELD_QUESTS.some((q) => q.id === 'quest_yuki_peak'), true, 'quest_yuki_peak exists');
            assertEqual(Object.keys(RIVAL_TRAINERS).length, 5, '5 RIVAL_TRAINERS defined');

            // No evolved forms in wild encounters (preserves Suite 16 lineage rules)
            const forbiddenWild = new Set([2, 26, 134, 135, 136, 182, 186, 196, 197, 208, 282, 334, 365, 405, 467, 470, 471]);
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
            assertEqual(Object.keys(TRAINER_STYLES).length, 8, '8 TRAINER_STYLES defined');
            assertEqual(Object.keys(TRAINER_ACCESSORIES).length, 6, '6 TRAINER_ACCESSORIES defined');

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
      name: '21. Pokedex Filters (90 Cards), Style Studio, Box Evo, Audio & Battle Layout',
      tests: [
        {
          name: 'Dex defaults to 90 cards, Style Studio updates live preview & theme, Box evolves, THEMES.rival works & battle stage has zero overlap',
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

              // 1. Pokédex default 'all' filter (90 cards) + filter pills + reset on reopen
              app.openPokedex('dex');
              assertEqual(document.querySelectorAll('.dex-grid .dex-card').length, 90, 'Dex opens with 90 cards on default "all" filter');
              const peakPill = document.querySelector('.dex-filter-pill[data-filter="peak"]');
              assert(Boolean(peakPill), 'Peak filter pill rendered');
              peakPill.click();
              const peakCount = document.querySelectorAll('.dex-grid .dex-card').length;
              assert(peakCount > 0 && peakCount < 90, `Peak filter narrows cards (${peakCount})`);
              app.openPokedex('dex');
              assertEqual(document.querySelectorAll('.dex-grid .dex-card').length, 90, 'Reopening Dex resets filter to all (90 cards)');

              // 2. Style Studio tab + #hud-portrait click + live preview + theme update
              app.pokedex.close();
              document.getElementById('hud-portrait').click();
              assertEqual(app.pokedex.isOpen(), true, 'Clicking #hud-portrait opens Pokédex modal');
              assertEqual(app.pokedex.activeTab, 'trainer', 'Clicking #hud-portrait opens trainer Style tab');
              const studioPreview = document.getElementById('trainer-studio-preview');
              assert(Boolean(studioPreview) && studioPreview.width === 112 && studioPreview.height === 112, '112x112 Style Studio canvas mounted');
              assertEqual(document.querySelectorAll('.style-chip').length, 8, '8 outfit style chips rendered');
              assertEqual(document.querySelectorAll('.accessory-chip').length, 6, '6 accessory chips rendered');

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
      name: '22. Sprint 4 Roster (90), 8 Moves, 8 Gems, 7 Eeveelutions, 12 Badges & Full World BFS',
      tests: [
        {
          name: '90 species (16 new id<=467), 8 new moves, 8 gems, 7 Eeveelutions, 12 badges, 8 shrines, 12 chests, 10 NPCs/quests, 5 rivals, 7 landmarks & BFS hold',
          fn() {
            assertEqual(Object.keys(SPECIES).length, 90, '90 species defined');
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

            assertEqual(Object.keys(EVOLUTION_ITEMS).length, 8, '8 gems defined');
            assertEqual(EVOLUTION_ITEMS.sun_gem?.icon, '☀️', 'sun_gem present');
            assertEqual(EVOLUTION_ITEMS.dusk_gem?.icon, '🔮', 'dusk_gem present');

            const eeveeTargets = EVOLUTIONS[133].map((e) => e.to).sort((a, b) => a - b);
            assertEqual(JSON.stringify(eeveeTargets), JSON.stringify([134, 135, 136, 196, 197, 470, 471]), '7 Eeveelutions incl. Umbreon #197');
            assert(EVOLUTIONS[44].some((e) => e.to === 182 && e.item === 'sun_gem'), 'Gloom -> Bellossom via sun_gem');
            assert(EVOLUTIONS[61].some((e) => e.to === 186 && e.item === 'sun_gem'), 'Poliwhirl -> Politoed via sun_gem');
            assert(EVOLUTIONS[95].some((e) => e.to === 208 && e.item === 'dusk_gem'), 'Onix -> Steelix via dusk_gem');
            assert(EVOLUTIONS[126].some((e) => e.to === 467 && e.item === 'fire_gem'), 'Magmar -> Magmortar via fire_gem');
            assert(EVOLUTIONS[333].some((e) => e.to === 334 && e.item === 'sun_gem'), 'Swablu -> Altaria via sun_gem');

            assertEqual(Object.keys(TRAINER_STYLES).length, 8, '8 TRAINER_STYLES defined');
            assert(Boolean(TRAINER_STYLES.solstice && TRAINER_STYLES.twilight), 'solstice and twilight styles defined');
            assertEqual(Object.keys(TRAINER_ACCESSORIES).length, 6, '6 TRAINER_ACCESSORIES defined');
            assert(Boolean(TRAINER_ACCESSORIES.goggles && TRAINER_ACCESSORIES.halo), 'goggles and halo accessories defined');
            assertEqual(Object.keys(TRAINER_AURAS).length, 4, '4 TRAINER_AURAS defined');
            for (const auraId of ['none', 'stars', 'hearts', 'lightning']) {
              assert(Boolean(TRAINER_AURAS[auraId]), `TRAINER_AURAS.${auraId} exists`);
            }
            const defaultLook = resolveTrainerLook('violet', { styleId: 'default', accessory: 'halo', cape: true, aura: 'stars' });
            assertEqual(defaultLook.outfitPrimary, TRAINERS.violet.outfitPrimary, 'default style preserves base outfitPrimary');
            assertEqual(defaultLook.aura, 'stars', 'resolveTrainerLook resolves aura');
            assertEqual(resolveTrainerLook('ozias', null).aura, 'none', 'null appearance defaults aura to none');

            assertEqual(BADGES.length, 12, '12 BADGES defined');
            const eclipseBadge = BADGES.find((b) => b.id === 'eclipse');
            const stardustBadge = BADGES.find((b) => b.id === 'stardust');
            assert(Boolean(eclipseBadge && stardustBadge), 'eclipse and stardust badges defined');
            assertEqual(eclipseBadge.check({ shrinesCleared: ['eclipse_shrine'], pokedex: { caught: {} } }), true, 'eclipse unlocks on eclipse_shrine');
            assertEqual(eclipseBadge.check({ shrinesCleared: [], pokedex: { caught: { 92: 1, 93: 1, 197: 1, 282: 1 } } }), true, 'eclipse unlocks on 4 Ghost/Psychic species');
            assertEqual(stardustBadge.check({ stats: { upgrades: 1, evolutions: 0 } }), true, 'stardust unlocks on 1 upgrade');
            assertEqual(stardustBadge.check({ stats: { upgrades: 0, evolutions: 3 } }), true, 'stardust unlocks on 3 evolutions');

            assertEqual(Object.keys(SHRINES).length, 8, '8 SHRINES defined');
            assert(Object.values(SHRINES).some((s) => s.id === 'eclipse_shrine' && s.guardianId === 282 && s.badgeId === 'eclipse'), 'eclipse_shrine guardian Gardevoir #282');
            assertEqual(Object.keys(CHESTS).length, 12, '12 CHESTS defined');
            assert(Object.values(CHESTS).some((c) => c.id === 'lagoon_chest_sun' && c.rewards?.gems?.sun_gem === 1), 'lagoon_chest_sun grants sun_gem');
            assert(Object.values(CHESTS).some((c) => c.id === 'cave_chest_dusk' && c.rewards?.gems?.dusk_gem === 1), 'cave_chest_dusk grants dusk_gem');
            assertEqual(Object.keys(NPCS).length, 10, '10 NPCS defined');
            assertEqual(FIELD_QUESTS.length, 10, '10 FIELD_QUESTS defined');
            assert(FIELD_QUESTS.some((q) => q.id === 'quest_orion_upgrade'), 'quest_orion_upgrade defined');
            assert(FIELD_QUESTS.some((q) => q.id === 'quest_selene_twilight'), 'quest_selene_twilight defined');
            assertEqual(Object.keys(RIVAL_TRAINERS).length, 5, '5 RIVAL_TRAINERS defined');
            assert(Object.values(RIVAL_TRAINERS).some((r) => r.id === 'rival_astra' && r.biome === 'peak'), 'rival_astra in peak');
            assertEqual(Object.keys(LANDMARKS).length, 7, '7 LANDMARKS defined');

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
              assertEqual(styleBar.querySelectorAll('.starter-style-chip').length, 8, '8 starter style chips');
              assertEqual(styleBar.querySelectorAll('.starter-acc-chip').length, 6, '6 starter accessory chips');
              assertEqual(styleBar.querySelectorAll('.starter-aura-chip').length, 4, '4 starter aura chips');
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

              // 5. Style Studio 8 styles / 6 accessories / 4 auras + overworld aura render
              app.openPokedex('trainer');
              assertEqual(document.querySelectorAll('.style-chip').length, 8, 'Style Studio renders 8 styles');
              assertEqual(document.querySelectorAll('.accessory-chip').length, 6, 'Style Studio renders 6 accessories');
              assertEqual(document.querySelectorAll('.aura-chip').length, 4, 'Style Studio renders 4 auras');
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
