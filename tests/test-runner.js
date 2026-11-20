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
  SHRINES,
  SPECIES,
  TILE,
  TYPES,
  TYPE_CHART,
  WORLD_COLS,
  WORLD_MAP,
  WORLD_ROWS,
  getBiomeDiscoveryStats,
  getCompassGuidance,
  getSpriteUrls,
  isTileWalkableAt,
} from '../js/config.js';
import {
  Pokemon,
  attachPokemonSprite,
  calculateCatchAttempt,
  calculateDamage,
  createPokemon,
  generateSilhouetteDataUri,
  getTypeEffectiveness,
  rollWildPokemon,
} from '../js/pokemon.js';
import { STORAGE_KEY, StorageManager, storage } from '../js/storage.js';
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

              await testAudio.unlock();
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
              assert(BADGES.length === 8 && Object.keys(SPECIES).length === 54, 'Config roster intact');
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
              await testAudio.unlock();

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
      name: '12. Evolution Chains, Evolution Gems & Expanded 54-Species Roster',
      tests: [
        {
          name: 'All 10 TYPES have fallback SVGs, 54 SPECIES exist, and level & gem evolutions update Pokemon & Storage',
          async fn() {
            const typeIds = Object.keys(TYPES);
            assertEqual(typeIds.length, 10, '10 elemental types exist');
            for (const reqType of ['grass', 'fire', 'water', 'electric', 'rock', 'psychic', 'normal', 'ice', 'ghost', 'dragon']) {
              assert(Boolean(TYPES[reqType]), `TYPES.${reqType} present`);
              const resp = await fetch(`./assets/fallback/${reqType}.svg`);
              assertEqual(resp.ok, true, `fallback SVG exists for ${reqType}`);
            }

            assertEqual(Object.keys(SPECIES).length, 54, '54 species defined');
            assertEqual(Object.keys(EVOLUTION_ITEMS).length, 4, '4 evolution gems defined');
            assertEqual(EVOLUTIONS[1][0].to, 2, 'Bulbasaur -> Ivysaur');
            assertEqual(EVOLUTIONS[2][0].to, 3, 'Ivysaur -> Venusaur');
            assertEqual(EVOLUTIONS[129][0].to, 130, 'Magikarp -> Gyarados');
            assertEqual(EVOLUTIONS[25][0].to, 26, 'Pikachu -> Raichu');
            const eeveeTargets = EVOLUTIONS[133].map((r) => r.to).sort((a, b) => a - b);
            assertEqual(JSON.stringify(eeveeTargets), JSON.stringify([134, 135, 136]), 'Eevee -> Vaporeon/Jolteon/Flareon');

            const bulbaLv9 = createPokemon(1, 9);
            assertEqual(bulbaLv9.getPendingLevelEvolution(), null, 'Lv.9 Bulbasaur has no pending level evolution');
            const bulbaLv10 = createPokemon(1, 10);
            assertEqual(bulbaLv10.getPendingLevelEvolution()?.toId, 2, 'Lv.10 Bulbasaur pending Ivysaur');

            const eevee = createPokemon(133, 8);
            assertEqual(eevee.getPendingLevelEvolution(), null, 'Eevee has no level evolution');
            const eeveeNoGems = eevee.getAvailableItemEvolutions({ water_gem: 0, thunder_gem: 0, fire_gem: 0 });
            assertEqual(eeveeNoGems.length, 3, 'Eevee has 3 item evolution paths');
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
      name: '14. 6 Biomes, 5 Shrines, NPCs, Quests & Starlight Compass',
      tests: [
        {
          name: '52x38 world map is BFS-reachable to all 6 biomes, 5 shrines, chests, NPCs, landmarks & quests work',
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
            assertEqual(shrineList.length, 5, '5 shrines exist');
            const chestList = Object.entries(CHESTS);
            assertGreater(chestList.length, 6, '7+ chests exist');
            assertGreater(Object.keys(NPCS).length, 5, '6+ NPCs exist');
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
