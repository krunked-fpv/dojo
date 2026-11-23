// Zero-Dependency Automated Test Suite for Pokémon: Starlight Island
// Run manually via `await window.runGameTests()` in DevTools console or automatically via `?test=true`

import {
  ABILITIES,
  BADGES,
  BIOMES,
  BIOME_SCALING_OFFSETS,
  BIOME_WARP_POINTS,
  CHESTS,
  ENCOUNTER_TRAITS,
  EVOLUTION_ITEMS,
  EVOLUTIONS,
  FARMING_BIOME_ORDER,
  FIELD_QUESTS,
  GAME_META,
  LANDMARKS,
  MOVES,
  NPCS,
  RIVAL_TRAINERS,
  SECRET_ARCADE_SPOT,
  SHRINES,
  SIGNPOSTS,
  SOLID_TILES,
  SPECIES,
  STARTER_IDS,
  TILE,
  TRAINER_ACCESSORIES,
  TRAINER_AURAS,
  TRAINER_STYLES,
  TRAINER_XP_WEIGHTS,
  TRAINERS,
  TYPES,
  TYPE_CHART,
  WORLD_COLS,
  WORLD_MAP,
  WORLD_ROWS,
  computeMilestoneTrainerXp,
  getBiomeAt,
  getBiomeDiscoveryStats,
  getBiomeWarpPoint,
  getCompassGuidance,
  getCumulativeXpForPlayerLevel,
  getPlayerLevel,
  getPlayerLevelFromXp,
  getPlayerLevelXpRequired,
  getPlayerProgression,
  getSafeZoneWarpPoint,
  getSpriteUrls,
  getTileDepthInfo,
  isTileWalkableAt,
  resolveFarmingBiomeForLevel,
  resolveTrainerLook,
} from '../js/config.js';
import {
  BIOME_SCALING_OFFSETS as POKEMON_BIOME_SCALING_OFFSETS,
  MAX_UPGRADE_TIER,
  Pokemon,
  SPECIES_ARCHETYPES,
  TRAINER_XP_WEIGHTS as POKEMON_TRAINER_XP_WEIGHTS,
  attachPokemonSprite,
  calculateCatchAttempt,
  calculateDamage,
  computeMilestoneTrainerXp as computePokemonMilestoneTrainerXp,
  createPokemon,
  evaluateDefensiveAbility,
  evaluateEntryAbility,
  evaluateOffensiveAbility,
  evaluateTurnEndAbility,
  generateSilhouetteDataUri,
  getBattleShardReward,
  getBiomeScaledRange,
  getBondTier,
  getCumulativeXpForPlayerLevel as getPokemonCumulativeXpForPlayerLevel,
  getPartyFarmingLevel,
  getPlayerLevel as getPokemonPlayerLevel,
  getPlayerLevelFromXp as getPokemonPlayerLevelFromXp,
  getPlayerLevelXpRequired as getPokemonPlayerLevelXpRequired,
  getPlayerProgression as getPokemonPlayerProgression,
  getPokemonAbility,
  getScaledRivalParty,
  getScaledShrineGuard,
  getScaledShrineTrial,
  getTrainerPowerLevel,
  getTypeEffectiveness,
  resetEncounterHistory,
  resolveRecommendedFarmingZone,
  resolveSpeciesArchetype,
  rollWildPokemon,
} from '../js/pokemon.js';
import {
  ARCADE_GEM_COOLDOWN_RUNS,
  ARCADE_SHARD_BUYIN_COST,
  BATTLES_PER_ARCADE_CHARGE,
  MAX_ARCADE_CHARGES,
  MAX_CHEER_CHARGES,
  STEPS_PER_ARCADE_CHARGE,
  STEPS_PER_CHEER_CHARGE,
  STORAGE_KEY,
  StorageManager,
  isSpeciesCaught,
  isSpeciesSeen,
  sanitizePosition,
  storage,
  syncProfilePlayerProgression,
  syncProfilePokedex,
  validateAndRepairProfile,
} from '../js/storage.js';
import {
  getPlayerProgressionSafe,
  getRecommendedFarmingZoneSafe,
} from '../js/pokedex.js';
import { AudioEngine, THEMES, audio } from '../js/audio.js';
import {
  BATTLE_STATES,
  BattleEngine,
  MOVE_FX_CLASS,
  PHYSICAL_MOVE_IDS,
  resolveMoveParticleShape,
  resolveSpriteMotionStyle,
} from '../js/battle.js';
import {
  MAX_ARCADE_SHARDS,
  MIN_ARCADE_REWARD_SCORE,
  StarlightMinigame,
  WAVE_TEMPLATES,
  getUnlockedArcadeGemPool,
} from '../js/minigame.js';

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
  /** Create a deterministic mock Web Audio context for verifying audio cues without side effects. */
  const createMockAudioCtx = (state, autoResume = false) => {
    const makeParam = (init = 0) => ({
      value: init,
      setValueAtTime() {},
      linearRampToValueAtTime() {},
      exponentialRampToValueAtTime() {},
    });
    const createdOsc = [];
    const createdBuf = [];
    return {
      state,
      currentTime: 1,
      sampleRate: 44100,
      destination: {},
      createdOsc,
      createdBuf,
      createGain() {
        return { gain: makeParam(1), connect() {}, disconnect() {} };
      },
      createOscillator() {
        const osc = {
          type: 'sine',
          frequency: makeParam(440),
          connect() {},
          disconnect() {},
          start() {},
          stop() {},
          setPeriodicWave() {},
          onended: null,
        };
        createdOsc.push(osc);
        return osc;
      },
      createPeriodicWave() {
        return {};
      },
      createBiquadFilter() {
        return { type: 'bandpass', Q: makeParam(1), frequency: makeParam(440), connect() {}, disconnect() {} };
      },
      createBuffer(ch, len) {
        return { getChannelData: () => new Float32Array(len) };
      },
      createBufferSource() {
        const src = { buffer: null, loop: false, connect() {}, disconnect() {}, start() {}, stop() {}, onended: null };
        createdBuf.push(src);
        return src;
      },
      resume() {
        if (autoResume) this.state = 'running';
        return Promise.resolve();
      },
    };
  };

  /** Snapshot and restore GameApp/Overworld/localStorage state across Suite 47 DOM tests. */
  const snapshotAppForTest = (app) => ({
    prevRawSave: window.localStorage.getItem(STORAGE_KEY),
    wasBootHidden: app.bootScreenEl.hidden,
    wasStarterHidden: app.starterScreenEl.hidden,
    wasShellHidden: app.gameShellEl.hidden,
    wasOverworldActive: app.overworld.active,
    prevRarePatches: [...(app.overworld.rarePatches || [])],
    origCabinetStyle: app.cabinetEl?.getAttribute('style') ?? null,
  });

  const restoreAppFromSnapshot = (app, snap) => {
    if (snap.origCabinetStyle === null) app.cabinetEl?.removeAttribute('style');
    else app.cabinetEl?.setAttribute('style', snap.origCabinetStyle);
    app.handleInteractHint(null);
    clearTimeout(app.biomeBannerTimer);
    if (app.biomeBannerEl) app.biomeBannerEl.hidden = true;
    app.cancelWarpTransition?.();
    app.minigame?.close?.();
    app.pokedex?.close?.();
    app.closeSettings?.();
    app.closeDialogue?.();
    app.clearCelebration?.();
    if (app.battle?.active) app.battle.stop({ outcome: 'escaped', faintedAll: false });
    app.encounterTransitioning = false;
    app.overworld.rarePatches = snap.prevRarePatches;
    app.overworld.setActive(snap.wasOverworldActive);
    if (snap.prevRawSave === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, snap.prevRawSave);
    storage.state = storage.load();
    app.applyTrainerTheme(storage.getActiveTrainerId() || 'violet');
    app.bootScreenEl.hidden = snap.wasBootHidden;
    app.starterScreenEl.hidden = snap.wasStarterHidden;
    app.gameShellEl.hidden = snap.wasShellHidden;
    if (!snap.wasOverworldActive) audio?.stopBGM?.();
    if (!snap.wasBootHidden) app.showBootScreen();
    else app.refreshHud();
  };

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
              assert(BADGES.length === 28 && Object.keys(SPECIES).length === 1025, 'Config roster intact');
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
      name: '12. Evolution Chains, Evolution Gems & Expanded 1025-Species Roster',
      tests: [
        {
          name: 'All 18 TYPES have fallback SVGs, 1025 SPECIES & 16 gems exist, and level & gem evolutions update Pokemon & Storage',
          async fn() {
            const typeIds = Object.keys(TYPES);
            assertEqual(typeIds.length, 18, '18 elemental types exist');
            for (const reqType of [
              'grass', 'fire', 'water', 'electric', 'rock', 'psychic', 'normal', 'ice', 'ghost', 'dragon',
              'fighting', 'flying', 'poison', 'ground', 'bug', 'steel', 'dark', 'fairy',
            ]) {
              assert(Boolean(TYPES[reqType]), `TYPES.${reqType} present`);
              const resp = await fetch(`./assets/fallback/${reqType}.svg`);
              assertEqual(resp.ok, true, `fallback SVG exists for ${reqType}`);
            }

            assertEqual(Object.keys(SPECIES).length, 1025, '1025 species defined');
            assertEqual(Object.keys(EVOLUTION_ITEMS).length, 16, '16 evolution gems defined');
            assertEqual(EVOLUTIONS[1][0].to, 2, 'Bulbasaur -> Ivysaur');
            assertEqual(EVOLUTIONS[2][0].to, 3, 'Ivysaur -> Venusaur');
            assertEqual(EVOLUTIONS[129][0].to, 130, 'Magikarp -> Gyarados');
            assertEqual(EVOLUTIONS[25][0].to, 26, 'Pikachu -> Raichu');
            const eeveeTargets = EVOLUTIONS[133].map((r) => r.to).sort((a, b) => a - b);
            assertEqual(JSON.stringify(eeveeTargets), JSON.stringify([134, 135, 136, 196, 197, 470, 471, 700]), 'Eevee -> 8 Eeveelutions');

            const bulbaLv9 = createPokemon(1, 9);
            assertEqual(bulbaLv9.getPendingLevelEvolution(), null, 'Lv.9 Bulbasaur has no pending level evolution');
            const bulbaLv10 = createPokemon(1, 10);
            assertEqual(bulbaLv10.getPendingLevelEvolution()?.toId, 2, 'Lv.10 Bulbasaur pending Ivysaur');

            const eevee = createPokemon(133, 8);
            assertEqual(eevee.getPendingLevelEvolution(), null, 'Eevee has no level evolution');
            const eeveeNoGems = eevee.getAvailableItemEvolutions({ water_gem: 0, thunder_gem: 0, fire_gem: 0, moon_gem: 0, leaf_gem: 0, ice_gem: 0, sun_gem: 0, dusk_gem: 0, astral_gem: 0, pixie_gem: 0 });
            assertEqual(eeveeNoGems.length, 8, 'Eevee has 8 item evolution paths');
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
      name: '14. 18 Biomes, 20 Shrines, NPCs, Quests & Starlight Compass',
      tests: [
        {
          name: '100x84 world map is BFS-reachable to all 18 biomes, 20 shrines, 36 chests, 23 NPCs, landmarks & quests work',
          fn() {
            assertEqual(WORLD_COLS, 100, 'WORLD_COLS === 100');
            assertEqual(WORLD_ROWS, 84, 'WORLD_ROWS === 84');
            assertEqual(WORLD_MAP.length, 84, 'WORLD_MAP has 84 rows');
            for (let y = 0; y < WORLD_ROWS; y++) {
              assertEqual(WORLD_MAP[y].length, 100, `row ${y} width === 100`);
            }

            const reqBiomes = ['village', 'forest', 'cave', 'water', 'volcano', 'peak', 'grove', 'desert', 'marsh', 'sanctum', 'canyon', 'reef', 'ruins', 'rift', 'faeveldt', 'atoll', 'highlands', 'crater'];
            for (const bId of reqBiomes) {
              assert(Boolean(BIOMES[bId]), `BIOMES.${bId} exists`);
            }

            const shrineList = Object.entries(SHRINES);
            assertEqual(shrineList.length, 20, '20 shrines exist');
            const chestList = Object.entries(CHESTS);
            assertEqual(chestList.length, 36, '36 chests exist');
            assertEqual(Object.keys(NPCS).length, 23, '23 NPCs exist');
            assertGreater(Object.keys(LANDMARKS).length, 19, '20+ landmarks exist');

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
      name: '15. Full-Bleed Direct Touch Viewport, Battle Pace & Zero-Overlap Gate',
      tests: [
        {
          name: 'D-Pad bar removed, #overworld-canvas full-bleed touch-action:none, battlePace cycles, and battle stage has zero overlap',
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

              // Verify D-Pad & bottom touch-controls bar are removed
              assertEqual(document.querySelector('.touch-controls'), null, '.touch-controls removed');
              assertEqual(document.getElementById('dpad'), null, '#dpad removed');
              assertEqual(document.getElementById('hud-btn-pad'), null, '#hud-btn-pad removed');
              assertEqual(document.getElementById('setting-pad-btn'), null, '#setting-pad-btn removed');
              assertEqual(document.getElementById('quick-dex-btn'), null, '#quick-dex-btn removed');

              const canvasEl = document.getElementById('overworld-canvas');
              assert(Boolean(canvasEl), '#overworld-canvas present');
              assertEqual(window.getComputedStyle(canvasEl).touchAction, 'none', '#overworld-canvas touch-action: none');
              const hudRect = document.querySelector('.hud-bar').getBoundingClientRect();
              const stageRect = document.querySelector('.viewport-stage').getBoundingClientRect();
              const canvasRect = canvasEl.getBoundingClientRect();
              assert(canvasRect.top >= hudRect.bottom - 1, 'canvas fills below .hud-bar');
              assert(canvasRect.height >= stageRect.height - 2 && canvasRect.height > 200, 'canvas fills full-bleed viewport-stage');

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

              // Verify modal-open toggles cleanly and clears touch navigation
              app.overworld.walkToTile(8, 12);
              app.openPokedex('guide');
              assertEqual(document.body.classList.contains('modal-open'), true, 'body.modal-open set when Pokédex opens');
              assertEqual(app.overworld.getTouchNavigationState().autoPathLength, 0, 'opening modal clears autoPath');
              app.pokedex.close();
              assertEqual(document.body.classList.contains('modal-open'), false, 'body.modal-open cleared on close');

              // Verify input.clearAll() & clearTouchNavigation() on battle entry
              app.input.pushDirection('right');
              assertEqual(app.input.getDirection(), 'right', 'simulated held direction active before battle');

              const enemy = createPokemon(25, 6);
              const startPromise = app.battle.start({ enemy, biomeId: 'forest' });
              app.syncControlVisibility();

              assertEqual(document.body.classList.contains('in-battle'), true, 'body.in-battle set on battle entry');
              assertEqual(app.input.getDirection(), null, 'input.clearAll() cleared held direction on battle entry');
              assertEqual(app.overworld.getTouchNavigationState().autoPathLength, 0, 'battle entry clears touch navigation');

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
                      seen: ['16', '9999'],
                      caught: {
                        '025': 1,
                        '9999': 1,
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
              assertEqual(v.pokedex.caught[9999], undefined, 'invalid #9999 stripped from caught');
              assertEqual(v.pokedex.caught[10], undefined, 'zero-count #10 stripped from caught');
              assertEqual(v.pokedex.seen.includes(9999), false, 'invalid #9999 stripped from seen');
              assertEqual(isSpeciesCaught(v, 10), false, 'wild-encounter Metapod #11 does not falsely mark Caterpie #10 caught');
              assertEqual(isSpeciesSeen(v, 10), false, 'wild-encounter Metapod #11 does not falsely mark Caterpie #10 seen');
              assert(v.stats.totalCaught >= 7, `stats.totalCaught repaired (${v.stats.totalCaught} >= 7)`);

              // Pure non-wild lineage recovery check without starterId=1 or "025" in caught
              const lineageProfile = {
                trainerId: 'violet',
                starterId: 4,
                team: [createPokemon(2, 12), createPokemon(26, 16)],
                box: [createPokemon(134, 14), createPokemon(11, 7), createPokemon(148, 16)],
                pokedex: { seen: { '16': true, '9999': true, '10': false }, caught: [4] },
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
              assertEqual(isSpeciesSeen(lineageProfile, 9999), false, 'invalid #9999 stripped from object-map seen');

              // recordSeen invalid guard
              hydratedStore.selectTrainer('violet');
              hydratedStore.recordSeen(9999, false);
              assertEqual(v.pokedex.seen.includes(9999), false, 'recordSeen ignores invalid species 9999');

              // Live PokedexUI & HUD count reconciliation
              storage.state = storage.load();
              storage.selectTrainer('violet');
              app.bootScreenEl.hidden = true;
              app.starterScreenEl.hidden = true;
              app.gameShellEl.hidden = false;
              app.applyTrainerTheme('violet');
              app.refreshHud();

              assert(
                app.hudDexBtn.textContent.includes('Dex 7/1025'),
                `HUD Dex pill displays reconciled 7/1025, got "${app.hudDexBtn.textContent}"`,
              );

              app.openPokedex('dex');
              const summaryText = document.querySelector('.dex-summary-bar')?.textContent || '';
              assert(summaryText.includes('Caught: 7/1025'), `Dex summary shows Caught: 7/1025, got "${summaryText}"`);
              assert(summaryText.includes('Seen: 9/1025'), `Dex summary shows Seen: 9/1025, got "${summaryText}"`);

              const cards = Array.from(document.querySelectorAll('.dex-grid .dex-card'));
              assertEqual(cards.length, 1025, '1025 Pokédex cards rendered');
              assertEqual(cards.filter((c) => c.classList.contains('is-caught')).length, 7, '7 .is-caught cards rendered');
              assertEqual(cards.filter((c) => c.classList.contains('is-seen')).length, 2, '2 .is-seen cards rendered');
              assertEqual(cards.filter((c) => c.classList.contains('is-unknown')).length, 1016, '1016 .is-unknown cards rendered');

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
              assert(guideText.includes('Dex: 7/1025'), `Guide tab shows matching Dex: 7/1025, got "${guideText}"`);
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
      name: '18. Expanded Roster, 28 Badges, 20 Shrines, 36 Chests, 23 Quests, 17 Rivals & Safe Relocation',
      tests: [
        {
          name: '1025 species, 10 Sprint-3 + 8 Sprint-4 moves, 16 gems, 28 badges, 20 shrines, 36 chests, 23 quests, 17 rivals & BFS/sanitizePosition hold',
          fn() {
            assertEqual(Object.keys(SPECIES).length, 1025, '1025 species total');
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

            assertEqual(Object.keys(EVOLUTION_ITEMS).length, 16, '16 evolution gems exist');
            assert(Boolean(EVOLUTION_ITEMS.leaf_gem && EVOLUTION_ITEMS.ice_gem), 'leaf_gem and ice_gem present');
            assertEqual(EVOLUTIONS[133].length, 8, '8 Eeveelutions defined');

            assertEqual(BADGES.length, 28, '28 badges defined');
            const tempest = BADGES.find((b) => b.id === 'tempest');
            const celestial = BADGES.find((b) => b.id === 'celestial');
            assert(Boolean(tempest && celestial), 'tempest and celestial badges exist');
            assertEqual(tempest.check({ shrinesCleared: ['thunder_shrine'], pokedex: { caught: {} } }), true, 'tempest unlocks on thunder_shrine');
            assertEqual(tempest.check({ shrinesCleared: [], pokedex: { caught: { 25: 1, 179: 1, 180: 1 } } }), true, 'tempest unlocks on 3 Electric species');
            assertEqual(celestial.check({ shrinesCleared: ['starlight_shrine'], pokedex: { caught: {} } }), true, 'celestial unlocks on starlight_shrine');
            const caught25 = Object.fromEntries(Object.keys(SPECIES).slice(0, 25).map((id) => [id, 1]));
            assertEqual(celestial.check({ shrinesCleared: [], pokedex: { caught: caught25 } }), true, 'celestial unlocks on 25 caught species');

            assertEqual(Object.keys(SHRINES).length, 20, '20 shrines defined');
            assertEqual(Object.values(SHRINES).some((s) => s.id === 'thunder_shrine' && s.guardianId === 145), true, 'thunder_shrine guardian Zapdos #145');
            assertEqual(Object.values(SHRINES).some((s) => s.id === 'starlight_shrine' && s.guardianId === 151), true, 'starlight_shrine guardian Mew #151');
            assertEqual(Object.keys(CHESTS).length, 36, '36 chests defined');
            assertEqual(Object.keys(NPCS).length, 23, '23 NPCs defined');
            assertEqual(FIELD_QUESTS.length, 23, '23 quests defined');
            assertEqual(FIELD_QUESTS.some((q) => q.id === 'quest_celeste_style'), true, 'quest_celeste_style exists');
            assertEqual(FIELD_QUESTS.some((q) => q.id === 'quest_yuki_peak'), true, 'quest_yuki_peak exists');
            assertEqual(Object.keys(RIVAL_TRAINERS).length, 17, '17 RIVAL_TRAINERS defined');

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
      name: '21. Pokedex Filters (1025 Cards), Style Studio, Box Evo, Audio & Battle Layout',
      tests: [
        {
          name: 'Dex defaults to 1025 cards, Style Studio updates live preview & theme, Box evolves, THEMES.rival works & battle stage has zero overlap',
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

              // 1. Pokédex default 'all' filter (1025 cards) + filter pills + reset on reopen
              app.openPokedex('dex');
              assertEqual(document.querySelectorAll('.dex-grid .dex-card').length, 1025, 'Dex opens with 1025 cards on default "all" filter');
              const peakPill = document.querySelector('.dex-filter-pill[data-filter="peak"]');
              assert(Boolean(peakPill), 'Peak filter pill rendered');
              peakPill.click();
              const peakCount = document.querySelectorAll('.dex-grid .dex-card').length;
              assert(peakCount > 0 && peakCount < 1025, `Peak filter narrows cards (${peakCount})`);
              app.openPokedex('dex');
              assertEqual(document.querySelectorAll('.dex-grid .dex-card').length, 1025, 'Reopening Dex resets filter to all (1025 cards)');

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
      name: '22. Sprint 4 Roster (1025), 8 Moves, 16 Gems, 8 Eeveelutions, 28 Badges & Full World BFS',
      tests: [
        {
          name: '1025 species (16 Sprint-4 id<=467), 8 new moves, 16 gems, 8 Eeveelutions, 28 badges, 20 shrines, 36 chests, 23 NPCs/quests, 17 rivals, 20 landmarks & BFS hold',
          fn() {
            assertEqual(Object.keys(SPECIES).length, 1025, '1025 species defined');
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

            assertEqual(Object.keys(EVOLUTION_ITEMS).length, 16, '16 gems defined');
            assertEqual(EVOLUTION_ITEMS.sun_gem?.icon, '☀️', 'sun_gem present');
            assertEqual(EVOLUTION_ITEMS.dusk_gem?.icon, '🔮', 'dusk_gem present');

            const eeveeTargets = EVOLUTIONS[133].map((e) => e.to).sort((a, b) => a - b);
            assertEqual(JSON.stringify(eeveeTargets), JSON.stringify([134, 135, 136, 196, 197, 470, 471, 700]), '8 Eeveelutions incl. Umbreon #197 & Sylveon #700');
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

            assertEqual(BADGES.length, 28, '28 BADGES defined');
            const eclipseBadge = BADGES.find((b) => b.id === 'eclipse');
            const stardustBadge = BADGES.find((b) => b.id === 'stardust');
            assert(Boolean(eclipseBadge && stardustBadge), 'eclipse and stardust badges defined');
            assertEqual(eclipseBadge.check({ shrinesCleared: ['eclipse_shrine'], pokedex: { caught: {} } }), true, 'eclipse unlocks on eclipse_shrine');
            assertEqual(eclipseBadge.check({ shrinesCleared: [], pokedex: { caught: { 92: 1, 93: 1, 94: 1, 196: 1 } } }), true, 'eclipse unlocks on 4 Ghost/Psychic species');
            assertEqual(stardustBadge.check({ stats: { upgrades: 1, evolutions: 0 } }), true, 'stardust unlocks on 1 upgrade');
            assertEqual(stardustBadge.check({ stats: { upgrades: 0, evolutions: 3 } }), true, 'stardust unlocks on 3 evolutions');

            assertEqual(Object.keys(SHRINES).length, 20, '20 SHRINES defined');
            assert(Object.values(SHRINES).some((s) => s.id === 'eclipse_shrine' && s.guardianId === 282 && s.badgeId === 'eclipse'), 'eclipse_shrine guardian Gardevoir #282');
            assertEqual(Object.keys(CHESTS).length, 36, '36 CHESTS defined');
            assert(Object.values(CHESTS).some((c) => c.id === 'lagoon_chest_sun' && c.rewards?.gems?.sun_gem === 1), 'lagoon_chest_sun grants sun_gem');
            assert(Object.values(CHESTS).some((c) => c.id === 'cave_chest_dusk' && c.rewards?.gems?.dusk_gem === 1), 'cave_chest_dusk grants dusk_gem');
            assertEqual(Object.keys(NPCS).length, 23, '23 NPCS defined');
            assertEqual(FIELD_QUESTS.length, 23, '23 FIELD_QUESTS defined');
            assert(FIELD_QUESTS.some((q) => q.id === 'quest_orion_upgrade'), 'quest_orion_upgrade defined');
            assert(FIELD_QUESTS.some((q) => q.id === 'quest_selene_twilight'), 'quest_selene_twilight defined');
            assertEqual(Object.keys(RIVAL_TRAINERS).length, 17, '17 RIVAL_TRAINERS defined');
            assert(Object.values(RIVAL_TRAINERS).some((r) => r.id === 'rival_astra' && r.biome === 'peak'), 'rival_astra in peak');
            assertEqual(Object.keys(LANDMARKS).length, 20, '20 LANDMARKS defined');

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
              assertEqual(profile.bag.starShards, 0, 'fresh profile starts with 0 starShards');
              assertEqual(profile.bag.cheerCharges, 0, 'fresh profile starts with 0 cheerCharges');
              assertEqual(store.hasAnyReadyEvolution(profile), false, 'fresh Lv.5 Bulbasaur has no ready evolution');

              // Earn 4 Star Shards before upgrading lead Bulbasaur & Box Spheal
              store.addStarShards(4);
              assertEqual(profile.bag.starShards, 4, 'earned 4 starShards via addStarShards');

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

              // Enemy: Rock-type Golem #76 Lv.2 (tests 1.5x BOOST for moonblast + ★3 + ⚡ ELITE)
              const eliteRock = createPokemon(76, 2, 'cave', { upgradeTier: 3, isElite: true });
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

              // 2. #hud-btn-dex.has-evo-ready
              assertEqual(app.hudDexBtn.classList.contains('has-evo-ready'), false, 'no .has-evo-ready at Lv.5');
              profile.team[0].level = 10;
              profile.team[0].recalculateStats();
              app.refreshHud();
              assertEqual(app.hudDexBtn.classList.contains('has-evo-ready'), true, '#hud-btn-dex has .has-evo-ready when evolution ready');

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
      name: '26. Sprint 5 Roster (1025), Celestial Grove, Bond Perks & Save Migration',
      tests: [
        {
          name: '1025 species, 8 moves, astral_gem, Kirlia->Gallade split evo, getBondTier, cheerPokemon, badges & post-shrine roamers hold',
          fn() {
            assertEqual(Object.keys(SPECIES).length, 1025, '1025 species defined');
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

            assertEqual(Object.keys(EVOLUTION_ITEMS).length, 16, '16 evolution gems defined');
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
            assertEqual(BADGES.length, 28, '28 badges defined');
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
              assertEqual(profile.bag.cheerCharges, 0, 'fresh profile starts with 0 cheerCharges');
              const brokeCheer = store.cheerPokemon(starter.uid);
              assertEqual(brokeCheer.cheered, false, 'cheerPokemon rejects when cheerCharges === 0');
              assertEqual(brokeCheer.reason, 'insufficient_cheers', 'reason === insufficient_cheers');
              assertEqual(starter.bond, 20, 'bond unchanged when cheerCharges === 0');

              // Earn 3 Cheer Hearts via battle victories, cheer 3 times, then walk 25 steps for 4th Cheer Heart
              store.recordBattleWin();
              store.recordBattleWin();
              store.recordBattleWin();
              assertEqual(profile.bag.cheerCharges, 3, '3 battle wins grant 3 cheerCharges (max cap)');
              for (let step = 1; step <= 3; step++) {
                const cheerRes = store.cheerPokemon(starter.uid);
                assertEqual(cheerRes.cheered, true, `cheer #${step} succeeds`);
                assertEqual(cheerRes.bond, 20 + step * 10, `bond incremented to ${20 + step * 10}`);
              }
              let stepCheerHit = false;
              for (let s = 1; s <= 25; s++) {
                const stepOut = store.updatePosition(8, 15, 'down', true);
                if (stepOut.stepCheerEarned) stepCheerHit = true;
              }
              assertEqual(stepCheerHit, true, '25 walked steps grant +1 Cheer Heart');
              const cheer4 = store.cheerPokemon(starter.uid);
              assertEqual(cheer4.cheered, true, 'cheer #4 succeeds');
              assertEqual(cheer4.bond, 60, 'bond incremented to 60');
              assertEqual(starter.bond, 60, '4 earned cheers bring bond 20 -> 60');
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
          name: '100x84 Celestial Grove BFS reachability (20 shrines, 36 chests, 23 NPCs, 17 rivals, 20 landmarks, 18 signposts) & lossless v1/v2 migration hold',
          fn() {
            assertEqual(WORLD_COLS, 100, 'WORLD_COLS === 100');
            assertEqual(WORLD_ROWS, 84, 'WORLD_ROWS === 84');
            assertEqual(WORLD_MAP.length, 84, 'WORLD_MAP has 84 rows');
            for (let y = 0; y < WORLD_ROWS; y++) {
              assertEqual(WORLD_MAP[y].length, 100, `row ${y} width === 100`);
            }

            assertEqual(getBiomeAt(8, 15).id, 'village', 'spawn remains village');
            assertEqual(getBiomeAt(8, 35).id, 'water', 'row 35 west remains water');
            assertEqual(getBiomeAt(35, 35).id, 'peak', 'row 35 east remains peak');
            assertEqual(getBiomeAt(8, 38).id, 'grove', 'row 38+ is grove');
            assertEqual(getBiomeAt(46, 41).id, 'grove', 'grove_shrine is in grove');

            assertEqual(Object.keys(SHRINES).length, 20, '20 shrines');
            assertEqual(Object.keys(CHESTS).length, 36, '36 chests');
            assertEqual(Object.keys(NPCS).length, 23, '23 NPCs');
            assertEqual(FIELD_QUESTS.length, 23, '23 quests');
            assertEqual(Object.keys(RIVAL_TRAINERS).length, 17, '17 rivals');
            assertEqual(Object.keys(LANDMARKS).length, 20, '20 landmarks');
            assertEqual(Object.keys(SIGNPOSTS).length, 18, '18 signposts');

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
              lead.level = 45;
              lead.recalculateStats();
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
              assert(groveCards.length > 0 && groveCards.length < 1025, `Grove filter narrows cards (${groveCards.length})`);
              for (const card of groveCards) {
                const spId = Number(card.querySelector('.dex-num')?.textContent?.replace('#', '').trim());
                assertEqual(SPECIES[spId]?.biome, 'grove', `Grove filtered card #${spId} belongs to grove biome`);
              }

              // Team .cheer-btn UI locks at 0 charges, then raises Bond & unlocks harmony badge once earned
              app.openPokedex('team');
              const lockedCheerBtn = document.querySelector('.team-card .cheer-btn');
              assert(Boolean(lockedCheerBtn), 'Team card renders .cheer-btn');
              assertEqual(lockedCheerBtn.disabled, true, 'Team .cheer-btn disabled when cheerCharges === 0');
              assert(lockedCheerBtn.textContent.includes('🔒'), 'Locked .cheer-btn displays 🔒');
              lockedCheerBtn.click();
              assertEqual(liveProfile.team[0].bond, 20, 'clicking disabled .cheer-btn does not raise bond');
              assertEqual(document.querySelector('.evo-celebration-banner'), null, 'clicking disabled .cheer-btn shows no celebration banner');

              storage.addCheerCharges(3);
              app.pokedex.render();
              for (let i = 0; i < 3; i++) {
                const btn = document.querySelector('.team-card .cheer-btn');
                assertEqual(btn?.disabled, false, `Team .cheer-btn enabled for earned cheer #${i + 1}`);
                btn?.click();
              }
              storage.recordBattleWin();
              app.pokedex.render();
              document.querySelector('.team-card .cheer-btn')?.click();
              assertEqual(liveProfile.team[0].bond, 60, '4 earned UI cheer clicks raise bond 20 -> 60');
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
      name: '29. Sprint 6 Roster (1025), 480+ Evolutions, Prism Gem, 38 Abilities & Zero-Count Fixes',
      tests: [
        {
          name: '1025 species, 128 moves (+28 Sprint 8), 16 gems (+prism_gem), 480+ evolution edges, 100% reachability & #361 order hold',
          fn() {
            const allSpecies = Object.values(SPECIES);
            assertEqual(allSpecies.length, 1025, '1025 species defined');
            assertEqual(Object.keys(MOVES).length, 128, '128 moves defined');
            assertEqual(Object.keys(ABILITIES).length, 38, '38 abilities defined');
            assertEqual(Object.keys(EVOLUTION_ITEMS).length, 16, '16 evolution gems defined');
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

            // Verify every species is #1..#1025, has valid type, biome, ability & 4 valid moves
            for (const sp of allSpecies) {
              assertInRange(sp.id, 1, 1025, `species #${sp.id} in National Dex #1..#1025`);
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
            for (const roamerId of [
              144, 145, 146, 151, 385, 248, 251, 384, 249, 243, 244, 382, 245, 483, 486, 493, 150, 250, 643, 644, 649,
              717, 718, 719, 720, 721, 792, 800, 801, 802, 807, 808, 889, 890, 893, 898, 905, 1007, 1008, 1009, 1010, 1017, 1025,
            ]) {
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

            // 28 badges + zero-count badge & quest leak regression guard
            assertEqual(BADGES.length, 28, '28 badges defined');
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
              const bulba = createPokemon(1, 18, 'forest');
              for (const m of bulba.species.movePool) {
                bulba.movePp[m] = 0;
              }
              vp.team[0] = bulba;
              const targetCaterpie = createPokemon(10, 12, 'forest');
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
      name: '31. 100x84 World Map BFS, 1025-Dex Search/Type Filters, Ability UI, v1/v2 Migration & Layout Gate',
      tests: [
        {
          name: '100x84 map BFS (20 shrines, 36 chests, 23 NPCs/quests, 17 rivals, 20 landmarks, 18 signposts, 15 heals), Overworld tiles 28..36 & Compass hold',
          fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            assertEqual(WORLD_COLS, 100, 'WORLD_COLS === 100');
            assertEqual(WORLD_ROWS, 84, 'WORLD_ROWS === 84');
            assertEqual(WORLD_MAP.length, 84, 'WORLD_MAP has 84 rows');
            for (let y = 0; y < WORLD_ROWS; y++) {
              assertEqual(WORLD_MAP[y].length, 100, `row ${y} width === 100`);
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
            assertEqual(Object.keys(BIOMES).length, 18, '18 biomes defined');
            assertEqual(Object.keys(SHRINES).length, 20, '20 shrines defined');
            assertEqual(Object.keys(CHESTS).length, 36, '36 chests defined');
            assertEqual(Object.keys(NPCS).length, 23, '23 NPCs defined');
            assertEqual(FIELD_QUESTS.length, 23, '23 quests defined');
            assertEqual(Object.keys(RIVAL_TRAINERS).length, 17, '17 rivals defined');
            assertEqual(Object.keys(LANDMARKS).length, 20, '20 landmarks defined');
            assertEqual(Object.keys(SIGNPOSTS).length, 18, '18 signposts defined');

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
            assertEqual(healCount, 15, '15 Healing Fountains present & reachable');
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
          name: '1025-Dex search/type/biome filters, ability UI pills, SW/index sync, v1/v2 solid-tile migration, 60fps & 1280x720/1024x768 non-overlap gate pass',
          async fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            // 1. SW & index.html cache/count sanity
            const swText = await (await fetch('./sw.js')).text();
            assert(swText.includes('starlight-shell-v11') && swText.includes('starlight-assets-v11'), 'sw.js bumped to v11 caches');

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

              // Open Pokédex: default 1025 cards
              app.openPokedex('dex');
              assertEqual(document.querySelectorAll('.dex-grid .dex-card').length, 1025, 'Dex renders all 1025 cards by default');

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
              assertEqual(document.querySelectorAll('.dex-grid .dex-card').length, 1025, 'clear button restores 1025 cards');

              // Type + Biome filters
              typeEl.value = 'dragon';
              typeEl.dispatchEvent(new Event('change', { bubbles: true }));
              const dragonCount = document.querySelectorAll('.dex-grid .dex-card').length;
              assert(dragonCount > 0 && dragonCount < 1025, `Dragon type filter narrows cards (${dragonCount})`);

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
              assertEqual(document.querySelectorAll('.dex-grid .dex-card').length, 1025, 'Show All resets to 1025 cards');

              // Team & Box Ability pills, Guide (18 biomes, 17 rivals, 23 quests), Badges (28)
              app.openPokedex('team');
              assertGreater(document.querySelectorAll('.team-card .ability-pill').length, 0, 'Team cards render .ability-pill');
              assertGreater(document.querySelectorAll('.box-card .ability-pill').length, 0, 'Box cards render .ability-pill');
              app.openPokedex('guide');
              assertEqual(document.querySelectorAll('.biome-progress-card').length, 18, 'Guide renders all 18 biome cards');
              assertEqual(document.querySelectorAll('.quests-list .quest-card').length, 23, 'Guide renders 23 field quests');
              app.openPokedex('badges');
              assertEqual(document.querySelectorAll('.badges-grid .badge-card').length, 28, 'Badges tab renders 28 badge cards');
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
      name: '32. Sprint 7 Systems: 1025 Contiguous Species, 480+ Evolutions, 128 Moves, 16 Gems, 38 Abilities & 28 Badges',
      tests: [
        {
          name: 'All 1025 contiguous species (#1..#1025), >=308 evo edges across >=285 parents, 128 moves, 16 gems (chrono/nebula) & 100% reachability',
          fn() {
            const allSpecies = Object.values(SPECIES);
            assertEqual(allSpecies.length, 1025, '1025 species defined');
            for (let id = 1; id <= 1025; id++) {
              assert(Boolean(SPECIES[id]), `contiguous species #${id} defined`);
            }

            assertEqual(Object.keys(TYPES).length, 18, '18 elemental types preserved');
            assertEqual(Object.keys(MOVES).length, 128, '128 moves defined');
            assertEqual(Object.keys(ABILITIES).length, 38, '38 abilities defined');
            assertEqual(Object.keys(EVOLUTION_ITEMS).length, 16, '16 evolution gems defined');
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

            // 100% 1025-species gameplay reachability BFS
            const reachable = new Set(STARTER_IDS.map(Number));
            for (const b of Object.values(BIOMES)) {
              for (const enc of b.encounters || []) reachable.add(Number(enc.id));
            }
            for (const sh of Object.values(SHRINES)) {
              reachable.add(Number(sh.guardianId));
            }
            for (const roamerId of [
              144, 145, 146, 151, 385, 248, 251, 384, 249, 243, 244, 382, 245, 483, 486, 493, 150, 250, 643, 644, 649,
              717, 718, 719, 720, 721, 792, 800, 801, 802, 807, 808, 889, 890, 893, 898, 905, 1007, 1008, 1009, 1010, 1017, 1025,
            ]) {
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
            assertEqual(unreachable.length, 0, `100% 1025 species reachable (unreachable: ${unreachable.slice(0, 10).join(',')})`);
          },
        },
        {
          name: 'All 38 abilities (>=5 species each), pure evaluators for all 14 Sprint 7 abilities, post-shrine roamers & 28 zero-count-safe badges hold',
          fn() {
            const abilityUsage = new Map(Object.keys(ABILITIES).map((id) => [id, []]));
            for (const sp of Object.values(SPECIES)) {
              abilityUsage.get(sp.ability)?.push(sp.id);
            }
            assertEqual(abilityUsage.size, 38, '38 abilities tracked');
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

            // 6. 28 zero-count-safe badges
            assertEqual(BADGES.length, 28, '28 badges defined');
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
            assertEqual(BADGES.filter((b) => b.check(zeroProfile)).length, 0, 'zero-count caught unlocks 0 of 28 badges');
            assertEqual(FIELD_QUESTS.filter((q) => q.check(zeroProfile)).length, 0, 'zero-count caught satisfies 0 of 23 quests');

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
      name: '34. 100x84 Archipelago BFS, 1025-Dex Ability Filter & Lazy Sprites, v8 SW & Zero-Overlap Gate',
      tests: [
        {
          name: '100x84 map BFS (20 shrines, 36 chests, 23 NPCs/quests, 17 rivals, 20 landmarks, 18 signposts, 15 heals, 13+ encounter biomes) & tiles 37..48 hold',
          fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            assertEqual(WORLD_COLS, 100, 'WORLD_COLS === 100');
            assertEqual(WORLD_ROWS, 84, 'WORLD_ROWS === 84');
            assertEqual(WORLD_MAP.length, 84, 'WORLD_MAP has 84 rows');
            for (let y = 0; y < WORLD_ROWS; y++) {
              assertEqual(WORLD_MAP[y].length, 100, `row ${y} width === 100`);
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
            assertEqual(Object.keys(BIOMES).length, 18, '18 biomes');
            assertEqual(Object.keys(SHRINES).length, 20, '20 shrines');
            assertEqual(Object.keys(CHESTS).length, 36, '36 chests');
            assertEqual(Object.keys(NPCS).length, 23, '23 NPCs');
            assertEqual(FIELD_QUESTS.length, 23, '23 quests');
            assertEqual(Object.keys(RIVAL_TRAINERS).length, 17, '17 rivals');
            assertEqual(Object.keys(LANDMARKS).length, 20, '20 landmarks');
            assertEqual(Object.keys(SIGNPOSTS).length, 18, '18 signposts');

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
            assertEqual(healCount, 15, '15 Healing Fountains present & reachable');
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
          name: '1025-Dex #dex-ability-select, lazy sprites, focus safety, v8 SW, v1/v2 tiles 39/42/45/48 rescue, 60fps & zero-overlap gate',
          async fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            // 1. SW v11 & index.html static labels
            const swText = await (await fetch('./sw.js')).text();
            assert(swText.includes('starlight-shell-v11') && swText.includes('starlight-assets-v11'), 'sw.js uses v11 caches');
            const idxText = await (await fetch('./index.html')).text();
            assert(idxText.includes('1/1025') && idxText.includes('0/28') && idxText.includes('0/20'), 'index.html reflects 1025 Dex, 28 Badges & 20 Shrines');

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

            // 3. 1025-Dex ability filter, lazy sprites, focus safety & layout gates
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
              assertEqual(allCards.length, 1025, 'Dex synchronously renders all 1025 cards');

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
              assertEqual(abilitySelect.options.length, 39, '#dex-ability-select has All + 38 ability options');

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
              assert(chronoCards.length >= 5 && chronoCards.length < 1025, `chrono_shift filter narrows (${chronoCards.length})`);
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
              assertEqual(document.querySelectorAll('.dex-grid .dex-card').length, 1025, 'Show All restores 1025 cards');

              // Reopen resets ability filter
              document.getElementById('dex-ability-select').value = 'pearl_aegis';
              document.getElementById('dex-ability-select').dispatchEvent(new Event('change', { bubbles: true }));
              app.openPokedex('dex');
              assertEqual(app.pokedex.dexAbilityFilter, 'all', 'reopening Dex resets dexAbilityFilter');
              assertEqual(document.querySelectorAll('.dex-grid .dex-card').length, 1025, 'reopened Dex renders 1025 cards');

              app.pokedex.close();
              assertEqual(app.pokedex._dexSpriteObserver, null, 'closing Dex disconnects IntersectionObserver');

              // Guide (18 biomes, 23 quests) & Badges (28)
              app.openPokedex('guide');
              assertEqual(document.querySelectorAll('.biome-progress-card').length, 18, 'Guide renders 18 biome cards');
              assertEqual(document.querySelectorAll('.quests-list .quest-card').length, 23, 'Guide renders 23 field quests');
              app.openPokedex('badges');
              assertEqual(document.querySelectorAll('.badges-grid .badge-card').length, 28, 'Badges tab renders 28 badge cards');
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
    {
      name: '35. Sprint 8 Systems: 1,025 National Dex, Evolutions, 18 Types & Archetypes',
      tests: [
        {
          name: 'Contiguous #1..#1025, 18 TYPES + 18 SVGs, 18x18 TYPE_CHART (0 soft-locks), 128 moves, 38 abilities & pure evaluators hold',
          async fn() {
            // 1. 1,025 contiguous species & strict schema
            const allSpecies = Object.values(SPECIES);
            assertEqual(allSpecies.length, 1025, '1025 species defined');
            for (let id = 1; id <= 1025; id++) {
              const sp = SPECIES[id];
              assert(Boolean(sp), `contiguous SPECIES[${id}] defined`);
              assertEqual(sp.id, id, `SPECIES[${id}].id === ${id}`);
              assert(Boolean(TYPES[sp.type]), `species #${id} valid type ${sp.type}`);
              assert(sp.biome === 'starter' || Boolean(BIOMES[sp.biome]), `species #${id} valid biome ${sp.biome}`);
              assert(Boolean(ABILITIES[sp.ability]), `species #${id} valid ability ${sp.ability}`);
              assertInRange(sp.catchFactor, 0.35, 0.98, `species #${id} catchFactor`);
              assert(/^#[0-9a-fA-F]{6}$/.test(sp.color), `species #${id} hex color`);
              for (const k of ['hp', 'atk', 'def', 'spd']) {
                assertInRange(sp.baseStats[k], 24, 135, `species #${id} baseStats.${k}`);
              }
              assertEqual(sp.movePool.length, 4, `species #${id} has 4 moves`);
              assertEqual(new Set(sp.movePool).size, 4, `species #${id} has 4 distinct moves`);
              let atkCount = 0;
              let stabCount = 0;
              for (const mId of sp.movePool) {
                const mv = MOVES[mId];
                assert(Boolean(mv), `species #${id} valid move ${mId}`);
                if (mv.category === 'attack') atkCount += 1;
                if (mv.type === sp.type) stabCount += 1;
              }
              assert(atkCount >= 2, `species #${id} >=2 attack moves`);
              assert(stabCount >= 1, `species #${id} >=1 STAB move`);
              assert(typeof sp.flavor === 'string' && sp.flavor.length > 8, `species #${id} friendly flavor`);
            }

            // Re-typed canonical #1..#649 species
            assertEqual(SPECIES[10].type, 'bug', '#10 Caterpie is bug');
            assertEqual(SPECIES[35].type, 'fairy', '#35 Clefairy is fairy');
            assertEqual(SPECIES[197].type, 'dark', '#197 Umbreon is dark');
            assertEqual(SPECIES[208].type, 'steel', '#208 Steelix is steel');
            assertEqual(SPECIES[282].type, 'fairy', '#282 Gardevoir is fairy');
            assertEqual(SPECIES[468].type, 'fairy', '#468 Togekiss is fairy');
            assertEqual(SPECIES[475].type, 'fighting', '#475 Gallade is fighting');

            // 2. All 18 TYPES + 18 SVG fallback files fetched cleanly
            const allTypeIds = [
              'grass', 'fire', 'water', 'electric', 'rock', 'psychic', 'normal', 'ice', 'ghost', 'dragon',
              'fighting', 'flying', 'poison', 'ground', 'bug', 'steel', 'dark', 'fairy',
            ];
            assertEqual(Object.keys(TYPES).length, 18, '18 TYPES defined');
            for (const tId of allTypeIds) {
              assert(Boolean(TYPES[tId]), `TYPES.${tId} exists`);
              const resp = await fetch(`./assets/fallback/${tId}.svg`);
              assertEqual(resp.ok, true, `${tId}.svg fetches HTTP 200`);
              const svgText = await resp.text();
              assert(svgText.includes('<svg') && svgText.includes('viewBox="0 0 96 96"'), `${tId}.svg valid 96x96 SVG`);
            }

            // 3. 18x18 TYPE_CHART canonical matchups & zero 0x soft-locks
            for (const atk of allTypeIds) {
              for (const def of allTypeIds) {
                const mult = getTypeEffectiveness(atk, def);
                assert(mult > 0, `zero soft-lock: ${atk} -> ${def} must be > 0 (got ${mult})`);
              }
            }
            const canonicalMatchups = [
              ['water', 'fire', 2], ['water', 'rock', 2], ['water', 'grass', 0.5],
              ['grass', 'water', 2], ['grass', 'rock', 2],
              ['fire', 'grass', 2], ['fire', 'water', 0.5],
              ['electric', 'water', 2], ['normal', 'rock', 0.5], ['normal', 'fire', 1],
              ['unknown', 'fire', 1], ['psychic', 'rock', 1.5],
              ['fairy', 'dragon', 2], ['fairy', 'dark', 2], ['fairy', 'fighting', 2],
              ['steel', 'fairy', 2], ['poison', 'fairy', 2],
              ['dark', 'ghost', 2], ['dark', 'psychic', 2],
              ['fighting', 'steel', 2], ['fighting', 'dark', 2],
              ['ground', 'electric', 2], ['ground', 'steel', 2],
              ['flying', 'fighting', 2], ['flying', 'bug', 2],
              ['bug', 'psychic', 2], ['bug', 'dark', 2],
            ];
            for (const [atk, def, expected] of canonicalMatchups) {
              assertEqual(getTypeEffectiveness(atk, def), expected, `${atk} -> ${def}`);
            }

            // 4. 128 moves including all 28 new Sprint 8 moves
            assertEqual(Object.keys(MOVES).length, 128, '128 moves defined');
            const sprint8Moves = [
              ['close_combat', 'fighting', 'physical', 'attack', 'fighting'],
              ['vacuum_wave', 'fighting', 'special', 'attack', 'fighting'],
              ['collision_course', 'fighting', 'physical', 'attack', 'fighting'],
              ['brave_bird', 'flying', 'physical', 'attack', 'flying'],
              ['air_slash', 'flying', 'special', 'attack', 'flying'],
              ['tailwind_grace', 'flying', 'status', 'buff', 'buff'],
              ['sludge_wave', 'poison', 'special', 'attack', 'poison'],
              ['poison_jab', 'poison', 'physical', 'attack', 'poison'],
              ['malignant_chain', 'poison', 'special', 'attack', 'poison'],
              ['earthquake', 'ground', 'physical', 'attack', 'ground'],
              ['earth_power', 'ground', 'special', 'attack', 'ground'],
              ['headlong_rush', 'ground', 'physical', 'attack', 'ground'],
              ['bug_buzz', 'bug', 'special', 'attack', 'bug'],
              ['x_scissor', 'bug', 'physical', 'attack', 'bug'],
              ['quiver_step', 'bug', 'status', 'buff', 'buff'],
              ['flash_cannon', 'steel', 'special', 'attack', 'steel'],
              ['gigaton_hammer', 'steel', 'physical', 'attack', 'steel'],
              ['king_shield', 'steel', 'status', 'shield', 'shield'],
              ['dark_pulse', 'dark', 'special', 'attack', 'dark'],
              ['kowtow_cleave', 'dark', 'physical', 'attack', 'dark'],
              ['lunar_shroud', 'dark', 'status', 'shield', 'shield'],
              ['dazzling_gleam', 'fairy', 'special', 'attack', 'fairy'],
              ['play_rough', 'fairy', 'physical', 'attack', 'fairy'],
              ['geomancy_bloom', 'fairy', 'status', 'buff', 'buff'],
              ['water_shuriken', 'water', 'special', 'attack', 'water'],
              ['dragon_darts', 'dragon', 'physical', 'attack', 'dragon'],
              ['bitter_blade', 'fire', 'physical', 'attack', 'fire'],
              ['electro_drift', 'electric', 'special', 'attack', 'electric'],
            ];
            for (const [id, type, dmgClass, category, fx] of sprint8Moves) {
              const mv = MOVES[id];
              assert(Boolean(mv), `MOVES.${id} exists`);
              assertEqual(mv.type, type, `${id}.type`);
              assertEqual(mv.damageClass, dmgClass, `${id}.damageClass`);
              assertEqual(mv.category, category, `${id}.category`);
              assertEqual(mv.fx, fx, `${id}.fx`);
            }

            // 5. 38 abilities (>=5 species each) + pure evaluators for all 10 Sprint 8 abilities
            const abilityMap = new Map(Object.keys(ABILITIES).map((k) => [k, []]));
            for (const sp of allSpecies) {
              abilityMap.get(sp.ability)?.push(sp.id);
            }
            assertEqual(abilityMap.size, 38, '38 abilities defined');
            for (const [abId, list] of abilityMap.entries()) {
              assert(list.length >= 5, `ability ${abId} assigned to >=5 species (got ${list.length})`);
            }

            // Entry: orichalcum_pulse, gale_wings, disguise_veil
            for (const [abId, stat, stages, expectShield] of [
              ['orichalcum_pulse', 'atk', 1, false],
              ['gale_wings', 'spd', 1, false],
              ['disguise_veil', 'def', 1, true],
            ]) {
              const mon = createPokemon(abilityMap.get(abId)[0], 25);
              const res = evaluateEntryAbility(mon);
              assertEqual(res?.abilityId, abId, `entry ${abId}`);
              assertEqual(res?.stat, stat, `${abId} stat`);
              assertEqual(res?.stages, stages, `${abId} stages`);
              assertEqual(Boolean(res?.grantShield), expectShield, `${abId} grantShield`);
              assertEqual(mon.abilityEntryTriggered, false, `${abId} pure`);
            }

            // Attack: toxic_alchemy, swarm_resonance, supreme_overlord, pixilate_aura
            const dummyDef = createPokemon(143, 25);
            const toxicMon = createPokemon(abilityMap.get('toxic_alchemy')[0], 25);
            assertEqual(evaluateOffensiveAbility(toxicMon, MOVES.tackle), null, 'toxic_alchemy ignores non-Poison');
            const toxicEval = evaluateOffensiveAbility(toxicMon, MOVES.sludge_wave);
            assertEqual(toxicEval?.mult, 1.15, 'toxic_alchemy 1.15x');
            assertEqual(toxicEval?.drainRatio, 0.2, 'toxic_alchemy 0.2 drainRatio');
            const toxicDmg = calculateDamage(toxicMon, dummyDef, MOVES.sludge_wave, { forceHit: true, forceCrit: false, fixedVariance: 1.0, applyAbilities: true });
            assertEqual(toxicDmg.attackerAbilityTrigger?.drainHeal, Math.max(1, Math.round(toxicDmg.damage * 0.2)), 'toxic_alchemy drainHeal');

            const swarmMon = createPokemon(abilityMap.get('swarm_resonance')[0], 25);
            assertEqual(evaluateOffensiveAbility(swarmMon, MOVES.bug_buzz)?.mult, 1.2, 'swarm_resonance 1.2x above 50% HP');
            swarmMon.hp = Math.floor(swarmMon.maxHp * 0.5);
            assertEqual(evaluateOffensiveAbility(swarmMon, MOVES.bug_buzz)?.mult, 1.35, 'swarm_resonance 1.35x at <=50% HP');

            const supremeMon = createPokemon(abilityMap.get('supreme_overlord')[0], 25, 'crater', { bond: 20 });
            const supEval = evaluateOffensiveAbility(supremeMon, MOVES.dark_pulse);
            assertEqual(supEval?.mult, 1.2, 'supreme_overlord 1.2x');
            assertEqual(supEval?.critBonus, 0.15, 'supreme_overlord +15% critBonus');
            const origRand = Math.random;
            try {
              Math.random = () => 0.18;
              assertEqual(calculateDamage(supremeMon, dummyDef, MOVES.dark_pulse, { forceHit: true, fixedVariance: 1.0, applyAbilities: false }).isCrit, false, '0.18 not crit without supreme_overlord');
              assertEqual(calculateDamage(supremeMon, dummyDef, MOVES.dark_pulse, { forceHit: true, fixedVariance: 1.0, applyAbilities: true }).isCrit, true, '0.18 crits with supreme_overlord');
            } finally {
              Math.random = origRand;
            }

            const pixieMon = createPokemon(abilityMap.get('pixilate_aura')[0], 25);
            assertEqual(evaluateOffensiveAbility(pixieMon, MOVES.tackle), null, 'pixilate_aura ignores non-Fairy');
            assertEqual(evaluateOffensiveAbility(pixieMon, MOVES.dazzling_gleam)?.mult, 1.2, 'pixilate_aura 1.2x Fairy');

            // Defense: stamina_earth, corviknight_armor
            const stamMon = createPokemon(abilityMap.get('stamina_earth')[0], 25);
            for (const mvId of ['thunderbolt', 'sludge_wave', 'rock_slide']) {
              const res = evaluateDefensiveAbility(stamMon, MOVES[mvId], 1);
              assertEqual(res?.abilityId, 'stamina_earth', `stamina_earth triggers on ${MOVES[mvId].type}`);
              assertEqual(res?.mult, 0.75, 'stamina_earth 0.75x');
              assertEqual(res?.counterBoostStat, 'def', 'stamina_earth counterBoostStat === def');
            }
            assertEqual(evaluateDefensiveAbility(stamMon, MOVES.water_gun, 2), null, 'stamina_earth ignores Water');

            const corvMon = createPokemon(abilityMap.get('corviknight_armor')[0], 25);
            for (const mvId of ['close_combat', 'rock_slide', 'dazzling_gleam', 'bug_buzz', 'flash_cannon']) {
              assertEqual(evaluateDefensiveAbility(corvMon, MOVES[mvId], 1)?.mult, 0.75, `corviknight_armor reduces ${MOVES[mvId].type}`);
            }
            assertEqual(evaluateDefensiveAbility(corvMon, MOVES.ember, 2), null, 'corviknight_armor ignores Fire');

            // Turn-end: tera_prism
            const teraMon = createPokemon(abilityMap.get('tera_prism')[0], 25);
            const teraRes = evaluateTurnEndAbility(teraMon);
            assertEqual(teraRes?.abilityId, 'tera_prism', 'tera_prism triggers');
            assertEqual(teraRes?.boostStat, 'atk', 'tera_prism boosts atk');
            assertEqual(teraRes?.boostStages, 1, 'tera_prism +1');
            assertEqual(teraMon.battleStages.atk, 0, 'tera_prism pure');
            teraMon.battleStages.atk = 2;
            assertEqual(evaluateTurnEndAbility(teraMon), null, 'tera_prism caps at atk >= 2');
            teraMon.battleStages.atk = 0;
            teraMon.hp = 0;
            assertEqual(evaluateTurnEndAbility(teraMon), null, 'tera_prism null when fainted');
          },
        },
        {
          name: '16 gems (live Storage evos), 8 Eeveelutions, cross-gen & branched invariants, 28 badges, sprites, 10 archetypes & 100% reachability hold',
          fn() {
            // 1. 16 EVOLUTION_ITEMS & 4 new gems (>=5 evos each) + cross-gen & branched invariants
            assertEqual(Object.keys(EVOLUTION_ITEMS).length, 16, '16 evolution gems defined');
            const newGemCounts = { pixie_gem: [], alola_gem: [], crown_gem: [], tera_gem: [] };
            for (const [fromKey, rules] of Object.entries(EVOLUTIONS)) {
              const fromId = Number(fromKey);
              assert(Boolean(SPECIES[fromId]), `evo parent #${fromId} exists`);
              assert(Array.isArray(rules) && rules.length >= 1, `#${fromId} has >=1 rule`);
              if (rules.length >= 2) {
                const levelRules = rules.filter((r) => r.minLevel !== undefined);
                assert(levelRules.length <= 1, `branched #${fromId} has <=1 minLevel rule`);
                if (levelRules.length === 1) {
                  assert(rules[0].minLevel !== undefined, `branched #${fromId} keeps minLevel at index 0`);
                }
                for (let idx = 1; idx < rules.length; idx++) {
                  assert(Boolean(rules[idx].item) && rules[idx].minLevel === undefined, `branched #${fromId}[${idx}] item-only`);
                }
              }
              for (const r of rules) {
                assert(Boolean(SPECIES[r.to]), `evo target #${r.to} exists`);
                if (r.minLevel !== undefined) assertInRange(r.minLevel, 7, 30, `#${fromId}->#${r.to} minLevel`);
                if (r.item) assert(Boolean(EVOLUTION_ITEMS[r.item]), `valid evo item ${r.item}`);
                if (newGemCounts[r.item]) newGemCounts[r.item].push([fromId, r.to]);
              }
            }
            for (const [gemId, pairs] of Object.entries(newGemCounts)) {
              assert(pairs.length >= 5, `${gemId} powers >=5 evos (got ${pairs.length})`);
            }

            // Canonical Eeveelutions & cross-gen lines
            const eeveeIds = EVOLUTIONS[133].map((r) => r.to).sort((a, b) => a - b);
            assertEqual(JSON.stringify(eeveeIds), JSON.stringify([134, 135, 136, 196, 197, 470, 471, 700]), '8 Eeveelutions incl. #700 Sylveon');
            assertEqual(EVOLUTIONS[361][0].to, 478, '#361 keeps #478 first');
            assertEqual(EVOLUTIONS[361][1].to, 362, '#361 keeps #362 second');
            assertEqual(EVOLUTIONS[281][0].to, 282, '#281 keeps #282 first');
            assertEqual(EVOLUTIONS[281][1].to, 475, '#281 keeps #475 second');
            const crossGenPairs = [
              [234, 899], [123, 900], [217, 901], [550, 902], [215, 903], [211, 904],
              [57, 979], [194, 980], [203, 981], [206, 982], [625, 983],
              [884, 1018], [840, 841], [840, 842], [840, 1011], [1011, 1019],
              [935, 936], [935, 937], [999, 1000], [808, 809], [772, 773],
              [789, 790], [790, 791], [790, 792], [803, 804], [891, 892],
            ];
            for (const [f, t] of crossGenPairs) {
              assert(EVOLUTIONS[f]?.some((r) => r.to === t), `cross-gen evo #${f} -> #${t}`);
            }

            // Live StorageManager evolutions for all 4 new gems
            const TEST_KEY = 'starlight_pokemon_test_s35_gems_v1';
            try {
              window.localStorage.removeItem(TEST_KEY);
              const store = new StorageManager(TEST_KEY);
              store.selectTrainer('violet');
              store.chooseStarter(1);
              store.addRewards({ gems: { pixie_gem: 1, alola_gem: 1, crown_gem: 1, tera_gem: 1 } });
              const prof = store.getActiveProfile();
              for (const [gemId, fromId, toId] of [
                ['pixie_gem', 133, 700],
                ['alola_gem', 808, 809],
                ['crown_gem', 123, 900],
                ['tera_gem', 194, 980],
              ]) {
                const mon = createPokemon(fromId, 28, 'crater');
                store.recordCaught(mon);
                const evoRes = store.evolvePokemon(mon.uid, toId, gemId);
                assert(Boolean(evoRes?.evolution), `${gemId} evo #${fromId} -> #${toId} succeeded`);
                assertEqual(mon.speciesId, toId, `${gemId} evolved species === #${toId}`);
                assertEqual(prof.bag.gems[gemId], 0, `${gemId} consumed`);
                assert(Boolean(prof.pokedex.caught[toId]), `#${toId} marked caught`);
              }
            } finally {
              window.localStorage.removeItem(TEST_KEY);
            }

            // 2. 28 Badges + zero-count safety
            assertEqual(BADGES.length, 28, '28 BADGES defined');
            for (const [bId, shrineId] of [
              ['pixie', 'faeveldt_shrine'],
              ['kahuna', 'atoll_shrine'],
              ['sovereign', 'highlands_shrine'],
              ['terastal', 'crater_shrine'],
            ]) {
              const badge = BADGES.find((b) => b.id === bId);
              assert(Boolean(badge), `badge ${bId} exists`);
              assertEqual(badge.check({ shrinesCleared: [shrineId], pokedex: { caught: {} } }), true, `${bId} unlocks on ${shrineId}`);
            }
            const zeroProf = {
              pokedex: { caught: Object.fromEntries(Object.keys(SPECIES).map((id) => [id, 0])), seen: [] },
              shrinesCleared: [],
              stats: { battlesWon: 0, evolutions: 0, upgrades: 0 },
              team: [{ bond: 20 }],
              box: [],
              biomesVisited: ['village'],
            };
            assertEqual(BADGES.filter((b) => b.check(zeroProf)).length, 0, '0/28 badges unlock on zero-count profile');
            assertEqual(FIELD_QUESTS.filter((q) => q.check(zeroProf)).length, 0, '0/23 quests unlock on zero-count profile');

            // 3. getSpriteUrls(650+) Showdown / PNG / back fallbacks
            const g9Front = getSpriteUrls(1024, false, false);
            const g9Back = getSpriteUrls(1024, true, false);
            assert(g9Front.animated.includes('/other/showdown/1024.gif'), 'Gen 9 front animated uses Showdown GIF');
            assert(g9Front.static.includes('/pokemon/1024.png'), 'Gen 9 front static uses PokeAPI PNG');
            assert(g9Front.fallbacks.some((u) => u.includes('official-artwork')), 'Gen 9 front fallbacks include official-artwork');
            assert(g9Back.animated.includes('/other/showdown/back/1024.gif'), 'Gen 9 back animated uses Showdown back GIF');
            assert(g9Back.fallbacks.some((u) => u.endsWith('/other/showdown/1024.gif')), 'Gen 9 back fallbacks include front Showdown GIF');
            assert(g9Back.fallbacks.some((u) => u.endsWith('/pokemon/1024.png')), 'Gen 9 back fallbacks include front PNG');

            // 4. 10 Archetypes across #1..#1025 & distinct SVG geometries
            assertEqual(SPECIES_ARCHETYPES.length, 10, '10 SPECIES_ARCHETYPES exported');
            const archetypeExamples = new Map();
            for (let id = 1; id <= 1025; id++) {
              const arch = resolveSpeciesArchetype(id);
              assert(SPECIES_ARCHETYPES.includes(arch), `#${id} resolves valid archetype ${arch}`);
              if (!archetypeExamples.has(arch)) archetypeExamples.set(arch, id);
            }
            assertEqual(archetypeExamples.size, 10, 'all 10 archetypes represented across #1..#1025');
            const svgBodies = new Set();
            for (const [arch, sampleId] of archetypeExamples.entries()) {
              const uri = generateSilhouetteDataUri({ ...SPECIES[sampleId], name: 'Sample', color: '#38bdf8' }, false);
              const decoded = decodeURIComponent(uri.replace('data:image/svg+xml;utf8,', ''));
              assert(decoded.includes(`data-archetype="${arch}"`), `silhouette marks data-archetype="${arch}"`);
              svgBodies.add(decoded);
            }
            assertEqual(svgBodies.size, 10, '10 distinct silhouette SVG geometries generated');

            // 5. 100% 1..1025 species reachability BFS
            const reachable = new Set(STARTER_IDS.map(Number));
            for (const b of Object.values(BIOMES)) {
              for (const enc of b.encounters || []) reachable.add(Number(enc.id));
            }
            for (const sh of Object.values(SHRINES)) reachable.add(Number(sh.guardianId));
            for (const rId of [
              144, 145, 146, 151, 385, 248, 251, 384, 249, 243, 244, 382, 245, 483, 486, 493, 150, 250, 643, 644, 649,
              717, 718, 719, 720, 721, 792, 800, 801, 802, 807, 808, 889, 890, 893, 898, 905, 1007, 1008, 1009, 1010, 1017, 1025,
            ]) {
              reachable.add(rId);
            }
            let evoChanged = true;
            while (evoChanged) {
              evoChanged = false;
              for (const [fromKey, rules] of Object.entries(EVOLUTIONS)) {
                const fromId = Number(fromKey);
                for (const r of rules) {
                  if (reachable.has(fromId) && !reachable.has(r.to)) {
                    reachable.add(r.to);
                    evoChanged = true;
                  }
                }
              }
            }
            const missing = Object.keys(SPECIES).map(Number).filter((id) => !reachable.has(id));
            assertEqual(missing.length, 0, `100% 1..1025 reachable (missing: ${missing.slice(0, 10).join(',')})`);
          },
        },
      ],
    },
    {
      name: '36. Sprint 8 Worldbuilder: 100x84 Map BFS, 18 Biomes, Tiles 49..60 & Roamers',
      tests: [
        {
          name: '100x84 map, preserved zones, tiles 49..60, 18 biomes, 20 shrines, 36 chests, 23 NPCs/quests, 17 rivals, 20 landmarks, 18 signposts, 15 heals & BFS pass',
          fn() {
            assertEqual(WORLD_COLS, 100, 'WORLD_COLS === 100');
            assertEqual(WORLD_ROWS, 84, 'WORLD_ROWS === 84');
            assertEqual(WORLD_MAP.length, 84, 'WORLD_MAP has 84 rows');
            for (let y = 0; y < WORLD_ROWS; y++) {
              assertEqual(WORLD_MAP[y].length, 100, `row ${y} width === 100`);
            }

            // Preserved (0..83, 0..71) zones & 4 new Gen 6-9 zones
            assertEqual(isTileWalkableAt(8, 15), true, '(8,15) spawn walkable');
            assertEqual(isTileWalkableAt(18, 14), false, '(18,14) solid wall');
            for (const [x, y, expectedBiome] of [
              [8, 15, 'village'], [60, 10, 'desert'], [14, 54, 'marsh'], [60, 45, 'sanctum'],
              [76, 15, 'canyon'], [20, 65, 'reef'], [50, 65, 'ruins'], [76, 45, 'rift'],
              [90, 20, 'faeveldt'], [25, 76, 'atoll'], [65, 76, 'highlands'], [90, 60, 'crater'],
            ]) {
              assertEqual(getBiomeAt(x, y).id, expectedBiome, `getBiomeAt(${x},${y}) === ${expectedBiome}`);
            }

            // Tiles 49..60 & SOLID_TILES (51, 54, 57, 60)
            assertEqual(TILE.FAE_GRASS, 49, 'TILE.FAE_GRASS === 49');
            assertEqual(TILE.FAE_PATH, 50, 'TILE.FAE_PATH === 50');
            assertEqual(TILE.FAE_WALL, 51, 'TILE.FAE_WALL === 51');
            assertEqual(TILE.ATOLL_SAND, 52, 'TILE.ATOLL_SAND === 52');
            assertEqual(TILE.ATOLL_PATH, 53, 'TILE.ATOLL_PATH === 53');
            assertEqual(TILE.ATOLL_WALL, 54, 'TILE.ATOLL_WALL === 54');
            assertEqual(TILE.CROWN_GRASS, 55, 'TILE.CROWN_GRASS === 55');
            assertEqual(TILE.CROWN_PATH, 56, 'TILE.CROWN_PATH === 56');
            assertEqual(TILE.CROWN_WALL, 57, 'TILE.CROWN_WALL === 57');
            assertEqual(TILE.TERA_FLOOR, 58, 'TILE.TERA_FLOOR === 58');
            assertEqual(TILE.TERA_PATH, 59, 'TILE.TERA_PATH === 59');
            assertEqual(TILE.TERA_WALL, 60, 'TILE.TERA_WALL === 60');
            for (const wall of [51, 54, 57, 60]) {
              assert(SOLID_TILES.has(wall), `SOLID_TILES includes ${wall}`);
            }

            // Exact world fixture totals
            assertEqual(Object.keys(BIOMES).length, 18, '18 BIOMES');
            assertEqual(Object.keys(SHRINES).length, 20, '20 SHRINES');
            assertEqual(Object.keys(CHESTS).length, 36, '36 CHESTS');
            assertEqual(Object.keys(NPCS).length, 23, '23 NPCS');
            assertEqual(FIELD_QUESTS.length, 23, '23 FIELD_QUESTS');
            assertEqual(Object.keys(RIVAL_TRAINERS).length, 17, '17 RIVAL_TRAINERS');
            assertEqual(Object.keys(LANDMARKS).length, 20, '20 LANDMARKS');
            assertEqual(Object.keys(SIGNPOSTS).length, 18, '18 SIGNPOSTS');

            for (const [shId, gId] of [
              ['faeveldt_shrine', 716], ['atoll_shrine', 791], ['highlands_shrine', 888], ['crater_shrine', 1024],
            ]) {
              assert(Object.values(SHRINES).some((s) => s.id === shId && s.guardianId === gId), `${shId} guardian #${gId}`);
            }
            for (const gemId of ['pixie_gem', 'alola_gem', 'crown_gem', 'tera_gem']) {
              assert(Object.values(CHESTS).some((c) => (c.rewards?.gems?.[gemId] || 0) > 0), `chest awards ${gemId}`);
            }

            // Full BFS from (8, 15)
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
              ['shrine', SHRINES], ['chest', CHESTS], ['npc', NPCS],
              ['rival', RIVAL_TRAINERS], ['landmark', LANDMARKS], ['signpost', SIGNPOSTS],
            ]) {
              for (const [k, v] of Object.entries(map)) {
                assertEqual(hasAdj(k), true, `${label} ${v?.id || k} at ${k} reachable`);
              }
            }

            const encTileBiomes = new Map([
              [TILE.TALL_GRASS, 'forest'], [TILE.CAVE_FLOOR, 'cave'], [TILE.SHALLOW_WATER, 'water'],
              [TILE.VOLCANO_FLOOR, 'volcano'], [TILE.SNOW_GRASS, 'peak'], [TILE.GROVE_GRASS, 'grove'],
              [TILE.DUNE_SAND, 'desert'], [TILE.MARSH_GRASS, 'marsh'], [TILE.SANCTUM_FLOOR, 'sanctum'],
              [TILE.CANYON_GRASS, 'canyon'], [TILE.REEF_WATER, 'reef'], [TILE.RUINS_FLOOR, 'ruins'],
              [TILE.RIFT_FLOOR, 'rift'], [TILE.FAE_GRASS, 'faeveldt'], [TILE.ATOLL_SAND, 'atoll'],
              [TILE.CROWN_GRASS, 'highlands'], [TILE.TERA_FLOOR, 'crater'],
            ]);
            const reachableEncBiomes = new Set();
            let healCount = 0;
            for (let y = 0; y < WORLD_ROWS; y++) {
              for (let x = 0; x < WORLD_COLS; x++) {
                const t = WORLD_MAP[y][x];
                if (t === TILE.HEAL) {
                  healCount += 1;
                  assertEqual(visited.has(`${x},${y}`), true, `TILE.HEAL (${x},${y}) reachable`);
                }
                if (encTileBiomes.has(t) && visited.has(`${x},${y}`)) {
                  reachableEncBiomes.add(getBiomeAt(x, y).id);
                }
              }
            }
            assertEqual(healCount, 15, '15 Healing Fountains reachable');
            for (const bId of encTileBiomes.values()) {
              assert(reachableEncBiomes.has(bId), `encounter tiles reachable in ${bId}`);
            }

            // Compass chain through rift -> faeveldt -> atoll -> highlands -> crater
            const preFae = [
              'forest_shrine', 'cave_shrine', 'water_shrine', 'volcano_shrine', 'peak_shrine',
              'thunder_shrine', 'eclipse_shrine', 'starlight_shrine', 'grove_shrine', 'desert_shrine',
              'marsh_shrine', 'sanctum_shrine', 'canyon_shrine', 'reef_shrine', 'ruins_shrine', 'rift_shrine',
            ];
            assertEqual(getCompassGuidance({ shrinesCleared: preFae, pokedex: { caught: {} } }).targetBiomeId, 'faeveldt', 'Compass -> faeveldt');
            assertEqual(getCompassGuidance({ shrinesCleared: [...preFae, 'faeveldt_shrine'], pokedex: { caught: {} } }).targetBiomeId, 'atoll', 'Compass -> atoll');
            assertEqual(getCompassGuidance({ shrinesCleared: [...preFae, 'faeveldt_shrine', 'atoll_shrine'], pokedex: { caught: {} } }).targetBiomeId, 'highlands', 'Compass -> highlands');
            assertEqual(getCompassGuidance({ shrinesCleared: [...preFae, 'faeveldt_shrine', 'atoll_shrine', 'highlands_shrine'], pokedex: { caught: {} } }).targetBiomeId, 'crater', 'Compass -> crater');
            const doneGuidance = getCompassGuidance({
              shrinesCleared: [...preFae, 'faeveldt_shrine', 'atoll_shrine', 'highlands_shrine', 'crater_shrine'],
              pokedex: { caught: Object.fromEntries(Array.from({ length: 700 }, (_, i) => [i + 1, 1])) },
            });
            assert(doneGuidance.title.includes('Dex'), `after 20 shrines w/ 700<1025 caught, Compass directs to Dex, got "${doneGuidance.title}"`);
          },
        },
        {
          name: 'Post-shrine roamers (without mutating BIOMES), 4-biome overworld render & 10-archetype follower fallbacks hold',
          fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            // 1. Post-shrine roamers without mutating BIOMES
            const roamerGroups = {
              faeveldt: ['faeveldt_shrine', [717, 718, 719, 720, 721]],
              atoll: ['atoll_shrine', [792, 800, 801, 802, 807, 808]],
              highlands: ['highlands_shrine', [889, 890, 893, 898, 905]],
              crater: ['crater_shrine', [1007, 1008, 1009, 1010, 1017, 1025]],
            };
            const origRand = Math.random;
            const rollSet = (bId, shrinesCleared) => {
              const seen = new Set();
              const prof = { team: [{ level: 34 }], badges: [], shrinesCleared };
              try {
                for (let i = 0; i < 600; i++) {
                  Math.random = () => (i + 0.5) / 600;
                  seen.add(rollWildPokemon(bId, prof, { forceShiny: false, forceElite: false }).speciesId);
                }
              } finally {
                Math.random = origRand;
              }
              return seen;
            };
            for (const [bId, [shrineId, roamers]] of Object.entries(roamerGroups)) {
              const baseLen = BIOMES[bId].encounters.length;
              const before = rollSet(bId, []);
              const after = rollSet(bId, [shrineId]);
              for (const rId of roamers) {
                assertEqual(before.has(rId), false, `${bId} no roamer #${rId} before ${shrineId}`);
                assertEqual(after.has(rId), true, `${bId} unlocks roamer #${rId} after ${shrineId}`);
              }
              assertEqual(BIOMES[bId].encounters.length, baseLen, `BIOMES.${bId}.encounters not mutated`);
            }

            // 2. Overworld render across all 4 new biomes & 10-archetype follower fallbacks
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

              for (const [x, y] of [[90, 20], [25, 76], [65, 76], [90, 60]]) {
                prof.pos = { x, y, dir: 'down' };
                app.overworld.followerInitialized = false;
                app.overworld.syncFromProfile();
                app.overworld.render(performance.now());
              }

              // 10-archetype follower fallback distinct pixel drawings
              const testCanvas = document.createElement('canvas');
              testCanvas.width = 32;
              testCanvas.height = 32;
              const ctx = testCanvas.getContext('2d');
              const archSamples = new Map();
              for (let id = 1; id <= 1025 && archSamples.size < 10; id++) {
                const a = resolveSpeciesArchetype(id);
                if (!archSamples.has(a)) archSamples.set(a, SPECIES[id]);
              }
              assertEqual(archSamples.size, 10, '10 archetype species found');
              const pixelSignatures = new Set();
              for (const [arch, sp] of archSamples.entries()) {
                ctx.clearRect(0, 0, 32, 32);
                app.overworld._drawMiniCompanionFallback(ctx, 0, 0, { ...sp, color: '#38bdf8' }, 'down');
                const data = ctx.getImageData(0, 0, 32, 32).data;
                let nonZero = 0;
                let sig = '';
                for (let p = 0; p < data.length; p += 4) {
                  const on = data[p + 3] > 0 ? '1' : '0';
                  if (on === '1') nonZero += 1;
                  sig += on;
                }
                assertGreater(nonZero, 20, `follower fallback ${arch} drew pixels`);
                pixelSignatures.add(sig);
              }
              assertEqual(pixelSignatures.size, 10, 'all 10 follower fallback archetypes draw distinct silhouettes');
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
      ],
    },
    {
      name: '37. Sprint 8 Animator: 28 Moves, 10 Abilities, 4 Arenas/BGMs, Living Motion & 1,025 Cries',
      tests: [
        {
          name: '4 new 64+ step BGMs, 28 playNamedMoveSfx, 10 playAbilityCue & deterministic <=0.12-gain leak-free 1,025 cries hold',
          async fn() {
            const newBiomes = ['faeveldt', 'atoll', 'highlands', 'crater'];
            for (const themeId of newBiomes) {
              const t = THEMES[themeId];
              assert(Boolean(t), `THEMES.${themeId} defined`);
              assert(t.melody.length >= 64, `${themeId} melody >= 64 steps`);
              assertInRange(t.leadGain, 0, 0.12, `${themeId}.leadGain <= 0.12`);
              assertInRange(t.arpGain, 0, 0.12, `${themeId}.arpGain <= 0.12`);
              assertInRange(t.bassGain, 0, 0.12, `${themeId}.bassGain <= 0.12`);
            }

            const sprint8MoveIds = [
              'close_combat', 'vacuum_wave', 'collision_course',
              'brave_bird', 'air_slash', 'tailwind_grace',
              'sludge_wave', 'poison_jab', 'malignant_chain',
              'earthquake', 'earth_power', 'headlong_rush',
              'bug_buzz', 'x_scissor', 'quiver_step',
              'flash_cannon', 'gigaton_hammer', 'king_shield',
              'dark_pulse', 'kowtow_cleave', 'lunar_shroud',
              'dazzling_gleam', 'play_rough', 'geomancy_bloom',
              'water_shuriken', 'dragon_darts', 'bitter_blade', 'electro_drift',
            ];
            const sprint8AbilityIds = [
              'orichalcum_pulse', 'gale_wings', 'toxic_alchemy', 'stamina_earth', 'swarm_resonance',
              'corviknight_armor', 'supreme_overlord', 'pixilate_aura', 'disguise_veil', 'tera_prism',
            ];

            const testAudio = new AudioEngine({ silent: true, attachUnlockListeners: false });
            try {
              testAudio.ensureContext();
              await Promise.race([testAudio.unlock(), new Promise((r) => setTimeout(r, 150))]);

              for (const themeId of newBiomes) testAudio.playBGM(themeId);
              for (const mvId of sprint8MoveIds) {
                assertEqual(testAudio.playNamedMoveSfx(mvId), true, `playNamedMoveSfx(${mvId}) === true`);
              }
              assertEqual(testAudio.playNamedMoveSfx('nonexistent_move_xyz'), false, 'unknown move returns false');
              for (const abId of sprint8AbilityIds) {
                testAudio.playAbilityCue(abId, ABILITIES[abId].type);
              }
              testAudio.stopBGM();
              assertEqual(testAudio.getDiagnostics().activeBgmNodes, 0, '0 leaked BGM nodes');

              // 1,025 deterministic cries + gain <= 0.12 + muted/missing-ctx safety + zero node leaks
              const origTrigger = testAudio.triggerVoice.bind(testAudio);
              const voiceGains = [];
              testAudio.triggerVoice = (opts) => {
                voiceGains.push(opts.gain);
                if (voiceGains.length <= 40) return origTrigger(opts);
                return { mockOsc: true };
              };
              const crySignatures = new Set();
              for (let id = 1; id <= 1025; id++) {
                const a = testAudio.playPokemonCry(SPECIES[id]);
                const b = testAudio.playPokemonCry(SPECIES[id]);
                assertEqual(a.speciesId, id, `cry #${id} speciesId`);
                assertEqual(a.baseFreq, b.baseFreq, `cry #${id} deterministic baseFreq`);
                assertEqual(a.wave, b.wave, `cry #${id} deterministic wave`);
                assertEqual(a.duration, b.duration, `cry #${id} deterministic duration`);
                assertEqual(a.played, true, `cry #${id} played when unlocked`);
                crySignatures.add(`${a.wave}:${a.baseFreq}:${a.duration}`);
              }
              assertGreater(crySignatures.size, 900, `diverse procedural cries across 1025 species (${crySignatures.size})`);
              assert(voiceGains.length > 0 && voiceGains.every((g) => g <= 0.12), 'all cry voices maintain gain <= 0.12');
              testAudio.triggerVoice = origTrigger;

              // Muted safety
              testAudio.setMuted(true);
              const mutedRes = testAudio.playPokemonCry(1024);
              assertEqual(mutedRes.played, false, 'muted cry returns played: false');
              assertEqual(testAudio.getDiagnostics().activeBgmNodes, 0, 'muted keeps 0 active nodes');
              testAudio.setMuted(false);

              // Missing AudioContext safety
              const noCtxAudio = new AudioEngine({ silent: true, attachUnlockListeners: false });
              noCtxAudio.ensureContext = () => null;
              const noCtxRes = noCtxAudio.playPokemonCry(716);
              assertEqual(noCtxRes.played, false, 'missing AudioContext cry returns played: false safely');
            } finally {
              await testAudio.destroy();
            }
          },
        },
        {
          name: '28 move choreographies, 10 ability spectacles & live hooks, 4 arenas/gem drops, living data-motion & stop() cleanup hold',
          async fn() {
            const TEST_KEY = 'starlight_pokemon_test_s37_v1';
            const cueCalls = [];
            const cryCalls = [];
            const noopAudio = {
              playMenuBlip() {}, playCursorMove() {}, playMoveSelect() {}, playWindup() {},
              playPhysicalImpact() {}, playElemental() {}, playShieldChime() {}, playHealChime() {},
              playFaint() {}, playLevelUp() {}, playPokeballThrow() {}, playPokeballAbsorb() {},
              playPokeballBounce() {}, playPokeballWobble() {}, playCaptureSuccess() {},
              playStarBallShimmer() {}, playXpTick() {}, playShinySparkle() {},
              playBuddyCheer() {}, playBuddyEndure() {},
              playAbilityCue(id, type) { cueCalls.push([id, type]); },
              playPokemonCry(spOrId) {
                const id = typeof spOrId === 'number' ? spOrId : (spOrId?.speciesId ?? spOrId?.id);
                cryCalls.push(id);
                return { speciesId: id, played: true };
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

              // 1. 4 new arenas & living data-motion styles + stop() cleanup
              const stageEl = document.getElementById('battle-stage');
              const enemySpriteEl = document.getElementById('enemy-sprite');
              const playerSpriteEl = document.getElementById('player-sprite');
              for (const [bId, spId] of [['faeveldt', 716], ['atoll', 791], ['highlands', 888], ['crater', 1024]]) {
                vp.team[0] = createPokemon(658, 28, bId); // bob (water)
                const sp = engine.start({ enemy: createPokemon(spId, 28, bId), biomeId: bId });
                await waitUntil(engine, () => engine.state === BATTLE_STATES.PLAYER_INPUT);
                await sp;
                assertEqual(stageEl.dataset.biome, bId, `arena data-biome === ${bId}`);
                const skyBg = window.getComputedStyle(stageEl.querySelector('.scenery-sky')).backgroundImage;
                assert(Boolean(skyBg && skyBg !== 'none'), `${bId} scenery-sky rendered`);
                assertEqual(playerSpriteEl.dataset.motion, resolveSpriteMotionStyle(vp.team[0]), `${bId} player data-motion set`);
                assertEqual(enemySpriteEl.dataset.motion, resolveSpriteMotionStyle(SPECIES[spId]), `${bId} enemy data-motion set`);
                assert(enemySpriteEl.classList.contains('is-idle') && playerSpriteEl.classList.contains('is-idle'), 'idle motion class applied');
                engine.stop({ outcome: 'escaped', faintedAll: false });
                assertEqual(enemySpriteEl.dataset.motion, undefined, 'stop() clears enemy data-motion');
                assertEqual(playerSpriteEl.dataset.motion, undefined, 'stop() clears player data-motion');
                assertEqual(enemySpriteEl.classList.contains('is-idle'), false, 'stop() removes is-idle');
              }
              assert(cryCalls.includes(716) && cryCalls.includes(1024), 'start() triggered playPokemonCry for encounter intros');

              // 2. All 10 new ability visuals & cleanup
              const bannerEl = document.getElementById('battle-ability-banner');
              vp.team[0] = createPokemon(1, 25, 'crater');
              const visStart = engine.start({ enemy: createPokemon(10, 12, 'crater'), biomeId: 'crater' });
              await waitUntil(engine, () => engine.state === BATTLE_STATES.PLAYER_INPUT);
              await visStart;
              const sprint8AbilityIds = [
                'orichalcum_pulse', 'gale_wings', 'toxic_alchemy', 'stamina_earth', 'swarm_resonance',
                'corviknight_armor', 'supreme_overlord', 'pixilate_aura', 'disguise_veil', 'tera_prism',
              ];
              for (const abId of sprint8AbilityIds) {
                const ab = ABILITIES[abId];
                const cuesPre = cueCalls.length;
                const p = engine.playAbilityVisual('player', abId, 'Sprint 8 Test', engine.sessionId);
                assertEqual(bannerEl.hidden, false, `${abId} banner visible`);
                assertEqual(bannerEl.dataset.type, ab.type, `${abId} banner type`);
                assertEqual(stageEl.dataset.abilityAura, ab.type, `${abId} stage aura`);
                assertGreater(engine.abilityStageFx.length, 0, `${abId} abilityStageFx spawned`);
                await p;
                assertEqual(bannerEl.hidden, true, `${abId} banner hidden after`);
                assertEqual(stageEl.dataset.abilityAura, undefined, `${abId} aura cleared`);
                assert(cueCalls.slice(cuesPre).some(([id]) => id === abId), `${abId} cue fired`);
              }

              // 3. All 28 Sprint 8 move choreographies + particle shapes
              const sprint8MoveIds = [
                'close_combat', 'vacuum_wave', 'collision_course',
                'brave_bird', 'air_slash', 'tailwind_grace',
                'sludge_wave', 'poison_jab', 'malignant_chain',
                'earthquake', 'earth_power', 'headlong_rush',
                'bug_buzz', 'x_scissor', 'quiver_step',
                'flash_cannon', 'gigaton_hammer', 'king_shield',
                'dark_pulse', 'kowtow_cleave', 'lunar_shroud',
                'dazzling_gleam', 'play_rough', 'geomancy_bloom',
                'water_shuriken', 'dragon_darts', 'bitter_blade', 'electro_drift',
              ];
              for (const mvId of [
                'close_combat', 'collision_course', 'brave_bird', 'poison_jab', 'earthquake', 'headlong_rush',
                'x_scissor', 'gigaton_hammer', 'kowtow_cleave', 'play_rough', 'dragon_darts', 'bitter_blade',
              ]) {
                assertEqual(PHYSICAL_MOVE_IDS.has(mvId), true, `PHYSICAL_MOVE_IDS includes ${mvId}`);
              }
              assertEqual(resolveMoveParticleShape(MOVES.water_shuriken), 'shuriken', 'water_shuriken shape');
              assertEqual(resolveMoveParticleShape(MOVES.brave_bird), 'feather', 'brave_bird shape');
              assertEqual(resolveMoveParticleShape(MOVES.sludge_wave), 'venom', 'sludge_wave shape');
              assertEqual(resolveMoveParticleShape(MOVES.bug_buzz), 'wave_arc', 'bug_buzz shape');
              for (const mvId of sprint8MoveIds) {
                const mv = MOVES[mvId];
                assert(Boolean(MOVE_FX_CLASS[mvId]), `MOVE_FX_CLASS.${mvId} defined`);
                const fakeRes = mv.category === 'shield'
                  ? { category: 'shield', damage: 0, heal: 6, grantShield: true, buffStat: 'def', buffStages: 1, effectiveness: 1, isCrit: false, missed: false }
                  : mv.category === 'buff'
                    ? { category: 'buff', damage: 0, heal: 0, grantShield: false, buffStat: mv.buffStat || 'atk', buffStages: 1, effectiveness: 1, isCrit: false, missed: false }
                    : { category: 'attack', damage: 28, heal: 0, effectiveness: 1, isCrit: false, missed: false };
                await engine.playAttackVisual('player', 'enemy', mv, fakeRes, engine.enemy, engine.sessionId);
              }
              engine.stop({ outcome: 'escaped', faintedAll: false });
              assertEqual(engine.abilityStageFx.length, 0, 'abilityStageFx empty on stop()');
              assertEqual(stageEl.dataset.abilityAura, undefined, 'abilityAura cleared on stop()');

              // 4. Live battle hooks for Sprint 8 abilities: disguise_veil entry, toxic_alchemy drain, stamina_earth counter DEF+1, tera_prism turn-end ATK+1
              const findByAb = (abId) => Object.values(SPECIES).find((s) => s.ability === abId).id;
              const disguiseMon = createPokemon(findByAb('disguise_veil'), 25, 'faeveldt');
              vp.team[0] = disguiseMon;
              const sDis = engine.start({ enemy: createPokemon(10, 12, 'faeveldt'), biomeId: 'faeveldt' });
              await waitUntil(engine, () => engine.state === BATTLE_STATES.PLAYER_INPUT);
              await sDis;
              assertEqual(disguiseMon.abilityEntryTriggered, true, 'disguise_veil entry triggered');
              assertGreater(disguiseMon.shieldTurns, 0, 'disguise_veil granted shieldTurns');
              assertEqual(disguiseMon.battleStages.def, 1, 'disguise_veil raised DEF +1');
              engine.stop({ outcome: 'escaped', faintedAll: false });

              const toxicMon = createPokemon(findByAb('toxic_alchemy'), 26, 'crater');
              toxicMon.hp = Math.max(1, toxicMon.maxHp - 25);
              const hpPreToxic = toxicMon.hp;
              const staminaDef = createPokemon(findByAb('stamina_earth'), 38, 'crater');
              vp.team[0] = toxicMon;
              const sTox = engine.start({ enemy: staminaDef, biomeId: 'crater' });
              await waitUntil(engine, () => engine.state === BATTLE_STATES.PLAYER_INPUT);
              await sTox;
              const t1 = setInterval(() => engine.finishTypewriter(), 15);
              try {
                Math.random = () => 0.5;
                await engine.executeMoveAction('player', MOVES.sludge_wave, engine.sessionId);
              } finally {
                clearInterval(t1);
                Math.random = origRand;
              }
              assertGreater(toxicMon.hp, hpPreToxic, 'toxic_alchemy healed attacker via drainHeal');
              assertEqual(staminaDef.battleStages.def, 1, 'stamina_earth raised defender DEF +1');
              engine.stop({ outcome: 'escaped', faintedAll: false });

              const teraMon = createPokemon(findByAb('tera_prism'), 28, 'crater');
              vp.team[0] = teraMon;
              const sTera = engine.start({ enemy: createPokemon(143, 40, 'crater'), biomeId: 'crater' });
              await waitUntil(engine, () => engine.state === BATTLE_STATES.PLAYER_INPUT);
              await sTera;
              const t2 = setInterval(() => engine.finishTypewriter(), 15);
              try {
                Math.random = () => 0.5;
                await engine.executeMoveAction('player', MOVES.tackle, engine.sessionId);
              } finally {
                clearInterval(t2);
                Math.random = origRand;
              }
              assertEqual(teraMon.battleStages.atk, 1, 'tera_prism raised ATK +1 at turn end');
              engine.stop({ outcome: 'escaped', faintedAll: false });

              // 5. Victory gem drops for 4 new biomes
              for (const [bId, expectedGem] of [
                ['faeveldt', 'pixie_gem'], ['atoll', 'alola_gem'], ['highlands', 'crown_gem'], ['crater', 'tera_gem'],
              ]) {
                vp.bag.gems[expectedGem] = 0;
                engine.active = true;
                engine.sessionId += 1;
                engine.biomeId = bId;
                engine.isShrine = false;
                engine.isTrainer = false;
                engine.shrineData = null;
                engine.player = createPokemon(1, 35, bId);
                engine.enemy = createPokemon(716, 15, bId);
                engine.enemy.hp = 0;
                const dTimer = setInterval(() => engine.finishTypewriter(), 15);
                try {
                  Math.random = () => 0.1;
                  await engine.handleEnemyDefeated(engine.sessionId);
                } finally {
                  clearInterval(dTimer);
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
      name: '38. Sprint 8 Ergonomics & Release Gate: Gen Filter, Cry Buttons, v11 SW, Migration & Zero-Overlap',
      tests: [
        {
          name: 'sw.js v11 (18 SVGs + minigame), index.html, README, 18-biome welcome & v1/v2 solid tiles 51/54/57/60 migration hold',
          async fn() {
            const swText = await (await fetch('./sw.js')).text();
            assert(swText.includes('starlight-shell-v11') && swText.includes('starlight-assets-v11'), 'sw.js uses v11 caches');
            assert(swText.includes('./js/minigame.js'), 'sw.js precaches ./js/minigame.js');
            assert(swText.includes('./assets/fallback/pokeball.svg'), 'sw.js precaches pokeball.svg');
            for (const typeId of Object.keys(TYPES)) {
              assert(swText.includes(`./assets/fallback/${typeId}.svg`), `sw.js precaches ${typeId}.svg`);
            }

            const idxText = await (await fetch('./index.html')).text();
            assert(idxText.includes('1/1025') && idxText.includes('0/28') && idxText.includes('0/20'), 'index.html shows 1/1025, 0/28, 0/20');

            const readmeText = await (await fetch('./README.md')).text();
            assert(
              readmeText.includes('1,025') && readmeText.includes('18') && readmeText.includes('20') && readmeText.includes('28') && readmeText.includes('starlight-shell-v11'),
              'README reflects Sprint 11 release details',
            );

            // Solid tiles 51, 54, 57, 60 rescue & v1/v2 migration
            const findFirstTile = (tileId) => {
              for (let y = 0; y < WORLD_ROWS; y++) {
                for (let x = 0; x < WORLD_COLS; x++) {
                  if (WORLD_MAP[y][x] === tileId) return { x, y };
                }
              }
              return null;
            };
            const solid51 = findFirstTile(51);
            const solid54 = findFirstTile(54);
            const solid57 = findFirstTile(57);
            const solid60 = findFirstTile(60);
            assert(Boolean(solid51 && solid54 && solid57 && solid60), 'found solid tiles 51, 54, 57, 60');
            for (const p of [solid51, solid54, solid57, solid60]) {
              const safe = sanitizePosition({ ...p, dir: 'down' });
              assertEqual(isTileWalkableAt(safe.x, safe.y), true, `sanitizePosition rescues off (${p.x},${p.y})`);
            }

            const MIG_KEY = 'starlight_pokemon_test_s38_mig_v1';
            try {
              window.localStorage.setItem(MIG_KEY, JSON.stringify({
                version: 1,
                activeTrainerId: 'violet',
                profiles: {
                  violet: {
                    trainerId: 'violet',
                    starterId: 1,
                    pos: { x: 90, y: 20, dir: 'right' }, // walkable faeveldt
                    team: [{ uid: 'm1', speciesId: 700, level: 24, xp: 10, hp: 60 }],
                    bag: { potions: 4, greatBalls: 2 },
                  },
                  ozias: {
                    trainerId: 'ozias',
                    starterId: 4,
                    pos: { ...solid60, dir: 'up' }, // solid TERA_WALL
                    team: [{ uid: 'm2', speciesId: 1024, level: 35, xp: 0, hp: 100 }],
                    bag: { potions: 3, greatBalls: 1, starBalls: 2, starShards: 8, gems: { pixie_gem: 1, alola_gem: 2, crown_gem: 1, tera_gem: 3 } },
                  },
                },
              }));
              const migrated = new StorageManager(MIG_KEY);
              const mv = migrated.getProfile('violet');
              const mo = migrated.getProfile('ozias');
              assertEqual(mv.pos.x, 90, 'walkable faeveldt x preserved');
              assertEqual(mv.pos.y, 20, 'walkable faeveldt y preserved');
              for (const g of ['pixie_gem', 'alola_gem', 'crown_gem', 'tera_gem']) {
                assertEqual(mv.bag.gems[g], 0, `v1 save hydrates ${g}: 0`);
              }
              assertEqual(mo.bag.gems.pixie_gem, 1, 'v2 preserves pixie_gem');
              assertEqual(mo.bag.gems.alola_gem, 2, 'v2 preserves alola_gem');
              assertEqual(mo.bag.gems.crown_gem, 1, 'v2 preserves crown_gem');
              assertEqual(mo.bag.gems.tera_gem, 3, 'v2 preserves tera_gem');
              assertEqual(isTileWalkableAt(mo.pos.x, mo.pos.y), true, 'Ozias rescued off TERA_WALL (60)');
            } finally {
              window.localStorage.removeItem(MIG_KEY);
            }
          },
        },
        {
          name: '1025-Dex #dex-gen-select, cry buttons (no nested button), focus safety, observer cleanup, Chromebook/Tablet zero-overlap & 60fps hold',
          async fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            const prevRawSave = window.localStorage.getItem(STORAGE_KEY);
            const wasBootHidden = app.bootScreenEl.hidden;
            const wasStarterHidden = app.starterScreenEl.hidden;
            const wasShellHidden = app.gameShellEl.hidden;
            const wasOverworldActive = app.overworld.active;
            const origCabinetStyle = app.cabinetEl?.getAttribute('style') ?? null;
            const origPlayCry = app.audio.playPokemonCry.bind(app.audio);
            const crySpies = [];
            app.audio.playPokemonCry = (spOrId) => {
              const id = typeof spOrId === 'number' ? spOrId : (spOrId?.speciesId ?? spOrId?.id);
              crySpies.push(id);
              return { speciesId: id, played: true };
            };

            try {
              window.localStorage.removeItem(STORAGE_KEY);
              storage.state = storage.load();
              storage.selectTrainer('violet');
              storage.chooseStarter(1); // Bulbasaur
              const prof = storage.getActiveProfile();

              // Verify enterOverworld(true) mentions all 4 new biomes
              app.enterOverworld(true);
              const introText = document.getElementById('world-dialogue-text')?.textContent || '';
              for (const bName of ['Pixie Faeveldt Glade', 'Sunburst Alola Atoll', 'Iron Crown Highlands', 'Terastal Crystal Crater']) {
                assert(introText.includes(bName), `enterOverworld(true) intro names ${bName}`);
              }
              app.closeDialogue();

              // Prepare diverse team/box/seen across Gens 1..9 (>24 seen for IntersectionObserver)
              prof.team[0] = createPokemon(35, 22, 'crater', { upgradeTier: 3 }); // Clefairy tall back-sprite
              const evoEevee = createPokemon(133, 18, 'faeveldt');
              prof.team.push(evoEevee);
              storage.addRewards({ gems: { pixie_gem: 1 } });
              for (const id of [
                1, 2, 3, 4, 25, 35, 133, 152, 252, 387, 495, 650, 658, 700, 716,
                722, 791, 810, 888, 906, 959, 980, 998, 1007, 1018, 1024, 1025,
              ]) {
                storage.recordSeen(id, false);
              }
              storage.save();
              app.applyTrainerTheme('violet');
              app.refreshHud();

              // 1. Open Pokédex -> #dex-gen-select (All + Gen 1-9 exact counts)
              app.openPokedex('dex');
              const genSelect = document.getElementById('dex-gen-select');
              const searchEl = document.getElementById('dex-search-input');
              const typeSelect = document.getElementById('dex-type-select');
              const abilitySelect = document.getElementById('dex-ability-select');
              assert(Boolean(genSelect && searchEl && typeSelect && abilitySelect), 'all 4 Dex filter controls mounted');
              assertEqual(genSelect.options.length, 10, '#dex-gen-select has All + 9 Gens');
              assertEqual(genSelect.value, 'all', '#dex-gen-select defaults to all');

              const expectedGenCounts = [
                ['gen1', 151], ['gen2', 100], ['gen3', 135], ['gen4', 107], ['gen5', 156],
                ['gen6', 72], ['gen7', 88], ['gen8', 96], ['gen9', 120],
              ];
              for (const [val, expectedCount] of expectedGenCounts) {
                genSelect.value = val;
                genSelect.dispatchEvent(new Event('change', { bubbles: true }));
                assertEqual(document.querySelectorAll('.dex-grid .dex-card').length, expectedCount, `${val} renders ${expectedCount} cards`);
              }

              // Focus safety across all 4 filter controls (including #dex-gen-select)
              let shortcutLeaked = false;
              const u1 = app.input.on('navigate', () => { shortcutLeaked = true; });
              const u2 = app.input.on('moveSlot', () => { shortcutLeaked = true; });
              const u3 = app.input.on('confirm', () => { shortcutLeaked = true; });
              for (const el of [searchEl, typeSelect, abilitySelect, genSelect]) {
                el.focus();
                el.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true }));
                el.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', key: 'ArrowDown', bubbles: true }));
                el.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }));
                el.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1', key: '1', bubbles: true }));
              }
              u1(); u2(); u3();
              assertEqual(shortcutLeaked, false, 'focusing search/type/ability/gen controls never leaks shortcuts');

              // Reset on Show All
              genSelect.value = 'gen9';
              genSelect.dispatchEvent(new Event('change', { bubbles: true }));
              searchEl.value = 'ZZZZ_NOMATCH';
              searchEl.dispatchEvent(new Event('input', { bubbles: true }));
              document.querySelector('.dex-reset-filters-btn').click();
              assertEqual(app.pokedex.dexGenFilter, 'all', 'Show All resets dexGenFilter');
              assertEqual(document.getElementById('dex-gen-select').value, 'all', 'Show All resets #dex-gen-select');
              assertEqual(document.querySelectorAll('.dex-grid .dex-card').length, 1025, 'Show All restores 1025 cards');

              // Reset on cross-filter evo chip click (Eevee #133 in Gen 1 -> Sylveon #700 in Gen 6)
              document.getElementById('dex-gen-select').value = 'gen1';
              document.getElementById('dex-gen-select').dispatchEvent(new Event('change', { bubbles: true }));
              document.querySelector('.dex-card[data-species-id="133"]').click();
              const sylvChip = Array.from(document.querySelectorAll('.dex-evo-chip')).find((c) => c.textContent.includes('Sylveon'));
              assert(Boolean(sylvChip), 'Eevee detail renders Sylveon evo chip');
              sylvChip.click();
              assertEqual(app.pokedex.dexGenFilter, 'all', 'cross-filter evo chip resets dexGenFilter to all');
              assertEqual(document.getElementById('dex-gen-select').value, 'all', 'cross-filter evo chip resets #dex-gen-select');
              assertEqual(app.pokedex.selectedSpeciesId, 700, 'selectedSpeciesId updated to #700 Sylveon');

              // Reset on clicking dex tab & reopen
              document.getElementById('dex-gen-select').value = 'gen6';
              document.getElementById('dex-gen-select').dispatchEvent(new Event('change', { bubbles: true }));
              document.getElementById('pokedex-tab-dex').click();
              assertEqual(app.pokedex.dexGenFilter, 'all', 'clicking dex tab resets dexGenFilter');
              document.getElementById('dex-gen-select').value = 'gen7';
              document.getElementById('dex-gen-select').dispatchEvent(new Event('change', { bubbles: true }));
              app.openPokedex('dex');
              assertEqual(app.pokedex.dexGenFilter, 'all', 'reopen resets dexGenFilter');

              // 2. Cry buttons on seen cards (and absent on unknown), no nested <button>, stopPropagation & keyboard Enter/Space, #dex-detail-cry-btn
              const cards = Array.from(document.querySelectorAll('.dex-grid .dex-card'));
              const unknownCard = cards.find((c) => c.classList.contains('is-unknown'));
              assert(Boolean(unknownCard) && unknownCard.querySelector('.dex-cry-btn') === null, 'undiscovered ??? card renders NO .dex-cry-btn');

              const card25 = document.querySelector('.dex-card[data-species-id="25"]');
              const cryBtn25 = card25.querySelector('.dex-cry-btn');
              assert(Boolean(cryBtn25), 'seen card #25 renders .dex-cry-btn');
              assertEqual(cryBtn25.tagName, 'SPAN', '.dex-cry-btn is <span>, not nested <button>');
              assertEqual(card25.querySelector('button'), null, 'zero nested <button> inside .dex-card');

              const selBeforeCry = app.pokedex.selectedSpeciesId;
              crySpies.length = 0;
              cryBtn25.click();
              assert(crySpies.includes(25), 'clicking .dex-cry-btn plays #25 cry');
              assertEqual(app.pokedex.selectedSpeciesId, selBeforeCry, '.dex-cry-btn click stopPropagation preserves selection');
              crySpies.length = 0;
              cryBtn25.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
              assert(crySpies.includes(25), 'Enter on .dex-cry-btn plays #25 cry');

              // Card click plays cry & opens detail w/ #dex-detail-cry-btn
              crySpies.length = 0;
              card25.click();
              assert(crySpies.includes(25), 'clicking seen card #25 plays cry');
              const detailCryBtn = document.getElementById('dex-detail-cry-btn');
              assert(Boolean(detailCryBtn), '#dex-detail-cry-btn rendered for seen species');
              crySpies.length = 0;
              detailCryBtn.click();
              assert(crySpies.includes(25), 'clicking #dex-detail-cry-btn plays #25 cry');

              // Undiscovered detail has NO #dex-detail-cry-btn
              unknownCard.click();
              assertEqual(document.getElementById('dex-detail-cry-btn'), null, 'undiscovered detail renders NO #dex-detail-cry-btn');

              // 3. IntersectionObserver active for >24 seen across 1025 cards & disconnected on tab switch/close
              assert(Boolean(app.pokedex._dexSpriteObserver), 'IntersectionObserver active across 1025 cards');
              app.openPokedex('team');
              assertEqual(app.pokedex._dexSpriteObserver, null, 'tab switch disconnects IntersectionObserver');

              // Post-evolution cry via Team tab .evolve-btn
              crySpies.length = 0;
              const sylvEvoBtn = Array.from(document.querySelectorAll('.team-card .evolve-btn')).find((b) => b.textContent.includes('Sylveon'));
              assert(Boolean(sylvEvoBtn), 'Eevee renders Sylveon evolve button');
              sylvEvoBtn.click();
              assertEqual(evoEevee.speciesId, 700, 'Eevee evolved to Sylveon #700 in Team tab');
              assert(crySpies.includes(700), 'triggerInModalEvolution played #700 Sylveon cry');

              app.openPokedex('guide');
              assertEqual(document.querySelectorAll('.biome-progress-card').length, 18, 'Guide renders 18 biomes');
              assertEqual(document.querySelectorAll('.quests-list .quest-card').length, 23, 'Guide renders 23 quests');
              app.openPokedex('badges');
              assertEqual(document.querySelectorAll('.badges-grid .badge-card').length, 28, 'Badges tab renders 28 badges');

              // 4. Chromebook (1280x720) & Tablet (1024x768) zero-overflow & zero-overlap gates + 60fps
              app.hudInstallGroupEl.hidden = false;
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
              assertEqual(app.pokedex._dexSpriteObserver, null, 'close() disconnects IntersectionObserver');

              const startBattleP = app.battle.start({
                enemy: createPokemon(1024, 36, 'crater', { isElite: true, upgradeTier: 4 }),
                biomeId: 'crater',
              });
              app.syncControlVisibility();
              const fastTimer = setInterval(() => app.battle.finishTypewriter(), 15);
              try {
                await startBattleP;
              } finally {
                clearInterval(fastTimer);
              }

              const overlaps = (a, b) => !(
                a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom
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
                assert(hudBar.scrollWidth <= hudBar.clientWidth + 2, `${label}: HUD overflow`);

                const enemyCard = document.querySelector('.status-card-enemy').getBoundingClientRect();
                const playerSprite = document.querySelector('.fighter-sprite-player').getBoundingClientRect();
                const playerCard = document.querySelector('.status-card-player').getBoundingClientRect();
                const enemySprite = document.querySelector('.fighter-sprite-enemy').getBoundingClientRect();
                assertEqual(overlaps(enemyCard, playerSprite), false, `${label}: enemyCard vs Clefairy`);
                assertEqual(overlaps(playerCard, enemySprite), false, `${label}: playerCard vs Terapagos`);

                for (const side of ['player', 'enemy']) {
                  bannerEl.hidden = false;
                  bannerEl.dataset.side = side;
                  bannerEl.dataset.type = 'fairy';
                  bannerEl.innerHTML = '<span class="ability-banner-icon">💎</span> <span class="ability-banner-text">Terastal Crown — Attack +1!</span>';
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

              const fpsDeadline = performance.now() + 1400;
              while (app.getDiagnostics().measuredFps <= 0 && performance.now() < fpsDeadline) {
                await new Promise((r) => setTimeout(r, 60));
              }
              const diag = app.getDiagnostics();
              assertEqual(diag.loopRafActive, true, 'loopRafActive === true');
              assertEqual(diag.loopStartCount, 1, 'loopStartCount === 1');
              assertGreater(diag.measuredFps, 0, `measuredFps > 0 (got ${diag.measuredFps})`);
            } finally {
              app.audio.playPokemonCry = origPlayCry;
              if (origCabinetStyle === null) app.cabinetEl?.removeAttribute('style');
              else app.cabinetEl?.setAttribute('style', origCabinetStyle);
              if (app.battle.active) app.battle.stop({ outcome: 'escaped', faintedAll: false });
              app.closeDialogue();
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
      name: '39. Sprint 9 Android/Tablet Web Audio Fix & Arcade Audio',
      tests: [
        {
          name: 'Multi-gesture touch unlock avoids _unlockPromise deadlock, flushes _pendingVoices on resume, and handles visibilitychange',
          async fn() {
            const OrigAudioContext = window.AudioContext;
            const OrigWebkitAudioContext = window.webkitAudioContext;
            const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
            let fakeHidden = false;

            const makeParam = (initial = 0) => ({
              value: initial,
              setValueAtTime(v) { this.value = v; },
              linearRampToValueAtTime(v) { this.value = v; },
              exponentialRampToValueAtTime(v) { this.value = v; },
              cancelScheduledValues() {},
              setTargetAtTime(v) { this.value = v; },
            });

            const instances = [];
            class MockAudioContext {
              constructor() {
                this.state = 'suspended';
                this.currentTime = 0;
                this.sampleRate = 44100;
                this.destination = { kind: 'destination' };
                this.onstatechange = null;
                this.resumeCalls = 0;
                this.resumeMode = 'pending';
                this.pendingResolvers = [];
                this.oscillators = [];
                this.bufferSources = [];
                this.createdBuffers = [];
                this.closed = false;
                instances.push(this);
              }
              createGain() {
                return { gain: makeParam(1), connect() {}, disconnect() {} };
              }
              createBiquadFilter() {
                return { type: 'lowpass', frequency: makeParam(350), Q: makeParam(1), connect() {}, disconnect() {} };
              }
              createDynamicsCompressor() {
                return {
                  threshold: makeParam(-24),
                  knee: makeParam(30),
                  ratio: makeParam(12),
                  attack: makeParam(0.003),
                  release: makeParam(0.25),
                  connect() {},
                  disconnect() {},
                };
              }
              createPeriodicWave() { return { kind: 'periodicWave' }; }
              createOscillator() {
                const osc = {
                  type: 'sine',
                  frequency: makeParam(440),
                  started: false,
                  stopped: false,
                  disconnected: false,
                  onended: null,
                  connect() {},
                  disconnect() { this.disconnected = true; },
                  setPeriodicWave() {},
                  start() { this.started = true; },
                  stop() {
                    this.stopped = true;
                    if (typeof this.onended === 'function') this.onended();
                  },
                };
                this.oscillators.push(osc);
                return osc;
              }
              createBuffer(channels, length, sampleRate) {
                const data = new Float32Array(length);
                const buf = { channels, length, sampleRate, getChannelData: () => data };
                this.createdBuffers.push(buf);
                return buf;
              }
              createBufferSource() {
                const src = {
                  buffer: null,
                  started: false,
                  stopped: false,
                  disconnected: false,
                  onended: null,
                  connect() {},
                  disconnect() { this.disconnected = true; },
                  start() { this.started = true; },
                  stop() {
                    this.stopped = true;
                    if (typeof this.onended === 'function') this.onended();
                  },
                };
                this.bufferSources.push(src);
                return src;
              }
              resume() {
                this.resumeCalls += 1;
                if (this.resumeMode === 'resolve-running') {
                  this.state = 'running';
                  this.onstatechange?.();
                  return Promise.resolve();
                }
                return new Promise((resolve) => {
                  this.pendingResolvers.push(() => {
                    this.state = 'running';
                    this.onstatechange?.();
                    resolve();
                  });
                });
              }
              close() {
                this.closed = true;
                this.state = 'closed';
                return Promise.resolve();
              }
            }

            let mockEngine = null;
            let liveEngine = null;
            try {
              window.AudioContext = MockAudioContext;
              window.webkitAudioContext = MockAudioContext;

              mockEngine = new AudioEngine({ silent: true, attachUnlockListeners: true });
              const ctx = mockEngine.ensureContext();
              assert(Boolean(ctx), 'MockAudioContext created');
              assertEqual(ctx.state, 'suspended', 'AudioContext starts suspended');
              assertEqual(mockEngine.masterFilter.type, 'lowpass', 'masterFilter lowpass');
              assertInRange(mockEngine.masterFilter.frequency.value, 900, 1300, 'masterFilter in 900-1300Hz');
              assert(Boolean(mockEngine.compressor), 'DynamicsCompressorNode attached');

              // 1. Pending pointerdown resume() + first-tap SFX queued before running
              window.dispatchEvent(new Event('pointerdown'));
              assertEqual(ctx.resumeCalls, 1, 'first pointerdown invoked ctx.resume()');
              assertEqual(mockEngine.unlocked, false, 'still suspended while first resume() pending');

              const queuedRes = mockEngine.triggerVoice({ freq: 760, duration: 0.05 });
              assertEqual(queuedRes?.queued, true, 'triggerVoice queues while suspended');
              const cryRes = mockEngine.playPokemonCry(25);
              assertEqual(cryRes.played, true, 'playPokemonCry returns played: true on first tap');
              assertGreater(mockEngine.getDiagnostics().queuedVoices, 1, '_pendingVoices queued > 1 entries');
              assertEqual(ctx.oscillators.length, 0, 'no oscillators created while suspended');

              // 2. Subsequent touchend/click MUST still call ctx.resume() (no _unlockPromise deadlock!)
              const resumesBeforeTouchend = ctx.resumeCalls;
              ctx.resumeMode = 'resolve-running';
              window.dispatchEvent(new Event('touchend'));
              await Promise.resolve();
              await Promise.resolve();

              assertEqual(
                ctx.resumeCalls,
                resumesBeforeTouchend + 1,
                'second touchend still invoked ctx.resume() (no deadlock)',
              );
              assertEqual(ctx.state, 'running', 'ctx.state transitioned to running');
              assertEqual(mockEngine.unlocked, true, 'engine marked unlocked');
              const diagRunning = mockEngine.getDiagnostics();
              assertEqual(diagRunning.contextState, 'running', 'diagnostics contextState === running');
              assertEqual(diagRunning.queuedVoices, 0, '_pendingVoices flushed cleanly on running');
              assertGreater(diagRunning.resumeCount, 1, 'resumeCount >= 2');
              assertGreater(ctx.oscillators.length, 1, 'queued SFX flushed into oscillators');
              assert(
                ctx.createdBuffers.some((b) => b.channels === 1 && b.length === 1 && b.sampleRate === 22050),
                '1-sample silent wake buffer created',
              );
              assert(ctx.bufferSources.some((s) => s.started), 'silent wake buffer started');

              // 3. visibilitychange hidden -> pause without clearing currentTheme; visible -> restart
              Object.defineProperty(document, 'hidden', { configurable: true, get: () => fakeHidden });
              mockEngine.playBGM('overworld');
              assertEqual(mockEngine.currentTheme, 'overworld', 'currentTheme is overworld');
              assertEqual(mockEngine.getDiagnostics().schedulerActive, true, 'scheduler active while visible');

              fakeHidden = true;
              document.dispatchEvent(new Event('visibilitychange'));
              assertEqual(mockEngine.getDiagnostics().schedulerActive, false, 'visibility hidden pauses scheduler');
              assertEqual(mockEngine.getDiagnostics().activeBgmNodes, 0, 'visibility hidden halts active BGM nodes');
              assertEqual(mockEngine.currentTheme, 'overworld', 'currentTheme preserved while hidden');

              fakeHidden = false;
              document.dispatchEvent(new Event('visibilitychange'));
              assertEqual(mockEngine.getDiagnostics().schedulerActive, true, 'visibility visible restarts scheduler');
              assertEqual(mockEngine.currentTheme, 'overworld', 'currentTheme still overworld after resume');

              // 4. THEMES.arcade & all 6 Sprint 9 fanfares / SFX + zero node leaks
              const arcadeTheme = THEMES.arcade;
              assert(Boolean(arcadeTheme), 'THEMES.arcade exists');
              assert(arcadeTheme.melody.length >= 64, 'THEMES.arcade >= 64 steps');
              assertInRange(arcadeTheme.leadGain, 0, 0.12, 'arcade.leadGain <= 0.12');
              assertInRange(arcadeTheme.arpGain, 0, 0.12, 'arcade.arpGain <= 0.12');
              assertInRange(arcadeTheme.bassGain, 0, 0.12, 'arcade.bassGain <= 0.12');

              mockEngine.playBGM('arcade');
              assertEqual(mockEngine.currentTheme, 'arcade', 'playBGM arcade active');
              mockEngine.playChestFanfare();
              mockEngine.playQuestCompleteFanfare();
              mockEngine.playArcadeUnlockFanfare();
              mockEngine.playArcadeStar(4);
              mockEngine.playArcadeBoost();
              mockEngine.playArcadeBump();

              mockEngine.stopBGM();
              assertEqual(mockEngine.getDiagnostics().activeBgmNodes, 0, 'stopBGM leaves 0 active BGM nodes');
              assertEqual(mockEngine.getDiagnostics().schedulerActive, false, 'stopBGM stops scheduler');
              await mockEngine.destroy();
              mockEngine = null;

              // Also check graceful fallback when createDynamicsCompressor is absent
              class MinimalMockCtx extends MockAudioContext {}
              MinimalMockCtx.prototype.createDynamicsCompressor = undefined;
              window.AudioContext = MinimalMockCtx;
              window.webkitAudioContext = MinimalMockCtx;
              liveEngine = new AudioEngine({ silent: true, attachUnlockListeners: false });
              const minCtx = liveEngine.ensureContext();
              assert(Boolean(minCtx), 'AudioEngine handles missing createDynamicsCompressor gracefully');
              assertEqual(liveEngine.compressor, null, 'compressor is null when unsupported');
            } finally {
              if (mockEngine) await mockEngine.destroy();
              if (liveEngine) await liveEngine.destroy();
              if (hiddenDescriptor) {
                Object.defineProperty(document, 'hidden', hiddenDescriptor);
              } else {
                delete document.hidden;
              }
              window.AudioContext = OrigAudioContext;
              window.webkitAudioContext = OrigWebkitAudioContext;
            }
          },
        },
      ],
    },
    {
      name: '40. Sprint 9 No D-Pad + Full-Screen Direct Touch Canvas Movement',
      tests: [
        {
          name: 'Legacy D-Pad DOM removed, full-bleed canvas cover math, BFS walkToTile, auto-interact, drag corner-slide, dialogue dismiss & cancellation',
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
              // 1. Assert zero D-Pad / old touch-control DOM elements
              for (const sel of ['#dpad', '.touch-controls', '#btn-a', '#btn-b', '#quick-dex-btn', '#hud-btn-pad', '#setting-pad-btn']) {
                assertEqual(document.querySelector(sel), null, `${sel} does NOT exist in DOM`);
              }

              window.localStorage.removeItem(STORAGE_KEY);
              storage.state = storage.load();
              storage.selectTrainer('violet');
              storage.chooseStarter(1);
              app.enterOverworld(false);
              app.applySettings();

              app.cabinetEl.style.width = '940px';
              app.cabinetEl.style.height = '756px';
              await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

              const canvasEl = document.getElementById('overworld-canvas');
              const hudRect = document.querySelector('.hud-bar').getBoundingClientRect();
              const canvasRect = canvasEl.getBoundingClientRect();
              assertEqual(window.getComputedStyle(canvasEl).touchAction, 'none', '#overworld-canvas has touch-action: none');
              assert(canvasRect.top >= hudRect.bottom - 1, '#overworld-canvas sits cleanly below .hud-bar');
              assert(canvasRect.height > 756 * 0.85, `#overworld-canvas fills full-bleed viewport (got ${Math.round(canvasRect.height)}px)`);

              const profile = storage.getActiveProfile();
              const ow = app.overworld;
              profile.pos = { x: 8, y: 15, dir: 'down' };
              ow.syncFromProfile();

              // 2. screenToWorldTile center & offset accuracy
              const centerRes = ow.screenToWorldTile(
                canvasRect.left + canvasRect.width / 2,
                canvasRect.top + canvasRect.height / 2,
              );
              assertEqual(centerRes.tileX, 8, 'screenToWorldTile center maps to player tileX=8');
              assertEqual(centerRes.tileY, 15, 'screenToWorldTile center maps to player tileY=15');
              const downRightRes = ow.screenToWorldTile(
                canvasRect.left + canvasRect.width / 2 + 64,
                canvasRect.top + canvasRect.height / 2 + 64,
              );
              assert(downRightRes.tileX > 8 && downRightRes.tileY > 15, 'screenToWorldTile maps offset right/down accurately');

              // 3. BFS walkToTile around solid cottage obstacle (12,13) -> (12,10) around walls at y=11..12, x=11..14
              profile.pos = { x: 12, y: 13, dir: 'up' };
              ow.syncFromProfile();
              assertEqual(isTileWalkableAt(12, 12), false, '(12,12) cottage wall is solid');
              assertEqual(isTileWalkableAt(12, 10), true, '(12,10) north side of cottage is walkable');
              const queuedAround = ow.walkToTile(12, 10);
              assertEqual(queuedAround, true, 'walkToTile routes around solid cottage');
              assertGreater(ow.getTouchNavigationState().autoPathLength, 4, 'BFS path routes around obstacle (>4 steps)');
              for (let step = 0; step < 260 && (ow.moving || ow.getTouchNavigationState().autoPathLength > 0); step++) {
                ow.update(0.05, null);
              }
              assertEqual(profile.pos.x, 12, 'BFS walk arrived at x=12');
              assertEqual(profile.pos.y, 10, 'BFS walk arrived at y=10');

              // 4. Tap-to-interact auto-arrival on chest, npc, and secret arcade
              const interactLog = [];
              const origOnInteract = ow.onInteract;
              const origOnWildEncounter = ow.onWildEncounter;
              const origOnDiscoveryNode = ow.onDiscoveryNode;
              const prevStepsSinceBattle = ow.stepsSinceBattle;
              const prevEncounterStreak = ow.encounterTileStreak;
              const prevRarePatches = ow.rarePatches;
              try {
                ow.onInteract = (t) => interactLog.push(t);
                ow.onWildEncounter = () => {};
                ow.onDiscoveryNode = () => {};
                ow.rarePatches = [];

                // Chest (3,3) from nearby walkable tile (3,5)
                ow.stepsSinceBattle = 0;
                ow.encounterTileStreak = 0;
                profile.pos = { x: 3, y: 5, dir: 'up' };
                ow.syncFromProfile();
                ow.stepsSinceBattle = 0;
                ow.encounterTileStreak = 0;
                assertEqual(ow.walkToTile(3, 3), true, 'walkToTile(chest 3,3) queued');
                for (let s = 0; s < 120 && interactLog.length === 0; s++) ow.update(0.05, null);
                assertEqual(interactLog[0]?.type, 'chest', 'auto-arrival triggered chest interact');

                // NPC (9,12) from (8,14)
                interactLog.length = 0;
                profile.pos = { x: 8, y: 14, dir: 'up' };
                ow.syncFromProfile();
                ow.stepsSinceBattle = 0;
                ow.encounterTileStreak = 0;
                assertEqual(ow.walkToTile(9, 12), true, 'walkToTile(npc 9,12) queued');
                for (let s = 0; s < 120 && interactLog.length === 0; s++) ow.update(0.05, null);
                assertEqual(interactLog[0]?.type, 'npc', 'auto-arrival triggered npc interact');

                // Secret Arcade (11,12) from (9,13)
                interactLog.length = 0;
                profile.pos = { x: 9, y: 13, dir: 'right' };
                ow.syncFromProfile();
                ow.stepsSinceBattle = 0;
                ow.encounterTileStreak = 0;
                assertEqual(ow.walkToTile(SECRET_ARCADE_SPOT.x, SECRET_ARCADE_SPOT.y), true, 'walkToTile(arcade 11,12) queued');
                for (let s = 0; s < 120 && interactLog.length === 0; s++) ow.update(0.05, null);
                assertEqual(interactLog[0]?.type, 'arcade', 'auto-arrival triggered arcade interact');
              } finally {
                ow.onInteract = origOnInteract;
                ow.onWildEncounter = origOnWildEncounter;
                ow.onDiscoveryNode = origOnDiscoveryNode;
                ow.stepsSinceBattle = prevStepsSinceBattle;
                ow.encounterTileStreak = prevEncounterStreak;
                ow.rarePatches = prevRarePatches;
              }

              // 5. Hold/drag-to-steer with corner-slide assist
              // Stand at (11, 13): up (11,12) is solid arcade, right (12,13) is walkable!
              profile.pos = { x: 11, y: 13, dir: 'up' };
              ow.syncFromProfile();
              const cx = canvasRect.left + canvasRect.width / 2;
              const cy = canvasRect.top + canvasRect.height / 2;
              canvasEl.dispatchEvent(new PointerEvent('pointerdown', {
                pointerId: 7, button: 0, clientX: cx, clientY: cy, bubbles: true, cancelable: true,
              }));
              // Drag mostly up (-40px) with perpendicular right (+26px) -> primary 'up' blocked, corner-slide -> 'right'!
              canvasEl.dispatchEvent(new PointerEvent('pointermove', {
                pointerId: 7, clientX: cx + 26, clientY: cy - 40, bubbles: true, cancelable: true,
              }));
              const steerState = ow.getTouchNavigationState();
              assertEqual(steerState.touchSteerActive, true, 'drag activates touchSteerActive');
              assertEqual(steerState.touchSteerDir, 'right', 'corner-slide steers perpendicular right when up is blocked');
              canvasEl.dispatchEvent(new PointerEvent('pointerup', {
                pointerId: 7, button: 0, clientX: cx + 26, clientY: cy - 40, bubbles: true, cancelable: true,
              }));
              assertEqual(ow.getTouchNavigationState().touchSteerActive, false, 'pointerup clears touchSteerActive');

              // 6. Canvas-tap #world-dialogue dismissal (without triggering unintended walk)
              profile.pos = { x: 8, y: 15, dir: 'down' };
              ow.syncFromProfile();
              app.openDialogue('Tap anywhere on the island to continue!');
              assertEqual(app.dialogueOpen, true, 'dialogue opened');
              canvasEl.dispatchEvent(new PointerEvent('pointerdown', {
                pointerId: 8, button: 0, clientX: cx + 48, clientY: cy - 48, bubbles: true, cancelable: true,
              }));
              canvasEl.dispatchEvent(new PointerEvent('pointerup', {
                pointerId: 8, button: 0, clientX: cx + 48, clientY: cy - 48, bubbles: true, cancelable: true,
              }));
              assertEqual(app.dialogueOpen, false, 'tapping #overworld-canvas dismisses #world-dialogue');
              assertEqual(ow.getTouchNavigationState().autoPathLength, 0, 'canvas-tap dialogue dismiss does not queue walk');
              assertEqual(profile.pos.x, 8, 'x unchanged after canvas-tap dismiss');
              assertEqual(profile.pos.y, 15, 'y unchanged after canvas-tap dismiss');

              // 7. clearTouchNavigation() on pause & battle entry
              profile.pos = { x: 8, y: 15, dir: 'down' };
              ow.syncFromProfile();
              ow.walkToTile(8, 12);
              assertGreater(ow.getTouchNavigationState().autoPathLength, 0, 'autoPath queued before pause');
              ow.setPaused(true);
              assertEqual(ow.getTouchNavigationState().autoPathLength, 0, 'setPaused(true) clears autoPath');
              assertEqual(ow.getTouchNavigationState().touchDestination, null, 'setPaused(true) clears touchDestination');
              ow.setPaused(false);

              ow.walkToTile(8, 12);
              assertGreater(ow.getTouchNavigationState().autoPathLength, 0, 'autoPath queued before battle');
              const battleP = app.battle.start({ enemy: createPokemon(25, 5), biomeId: 'forest' });
              app.syncControlVisibility();
              const fastT = setInterval(() => app.battle.finishTypewriter(), 15);
              try {
                await battleP;
              } finally {
                clearInterval(fastT);
              }
              assertEqual(ow.getTouchNavigationState().autoPathLength, 0, 'battle entry clears autoPath');
              assertEqual(ow.getTouchNavigationState().autoInteractTarget, null, 'battle entry clears autoInteractTarget');
              app.battle.stop({ outcome: 'escaped', faintedAll: false });
            } finally {
              if (origCabinetStyle === null) app.cabinetEl?.removeAttribute('style');
              else app.cabinetEl?.setAttribute('style', origCabinetStyle);
              if (app.battle.active) app.battle.stop({ outcome: 'escaped', faintedAll: false });
              app.closeDialogue();
              app.pokedex.close();
              app.closeSettings();
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
      name: '41. Sprint 9 Deepened Non-Repeating Pools & Secret Sky-Hop Mini-Game',
      tests: [
        {
          name: 'Wild 0-repeat deck, depthTier 0..2 scaling, encounterTrait JSON roundtrip, Rival/Shrine Trial rotation & 3 discovery node kinds',
          fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            // 1. Wild encounter 0 consecutive repeats across 50 rolls
            resetEncounterHistory();
            let prevId = null;
            for (let i = 0; i < 50; i++) {
              const mon = rollWildPokemon('forest', 5);
              assert(mon.speciesId !== prevId, `numeric roll #${i} repeated species #${prevId}`);
              prevId = mon.speciesId;
              assertInRange(mon.level, BIOMES.forest.levelRange[0], BIOMES.forest.levelRange[1], `depthTier 0 level within range`);
            }

            // Profile roll 50 checks + depthTier scaling + encounterTrait
            const testProf = {
              team: [createPokemon(25, 10)],
              badges: [],
              shrinesCleared: [],
              pokedex: { caught: { 25: 1 } },
              recentEncounters: [],
            };
            prevId = null;
            const observedTraits = new Set();
            let sumDepth0 = 0;
            let sumDepth2 = 0;
            for (let i = 0; i < 50; i++) {
              const m0 = rollWildPokemon('faeveldt', testProf, { depthTier: 0, forceElite: false });
              assert(m0.speciesId !== prevId, `profile roll #${i} repeated species #${prevId}`);
              prevId = m0.speciesId;
              sumDepth0 += m0.level;
              if (m0.encounterTrait) observedTraits.add(m0.encounterTrait);
              const m2 = rollWildPokemon('faeveldt', testProf, { depthTier: 2, forceElite: false });
              assertEqual(m2.encounterTrait, 'apex', 'depthTier 2 sets encounterTrait === apex');
              observedTraits.add(m2.encounterTrait);
              sumDepth2 += m2.level;
              assert(m2.speciesId !== prevId, `profile roll d2 #${i} repeated species`);
              prevId = m2.speciesId;
            }
            assertGreater(sumDepth2, sumDepth0, 'depthTier 2 yields higher levels than depthTier 0');
            assert(observedTraits.has('apex') && observedTraits.size >= 3, `encounterTrait variety observed: ${[...observedTraits].join(',')}`);
            assert(Boolean(ENCOUNTER_TRAITS?.curious && ENCOUNTER_TRAITS?.treasure && ENCOUNTER_TRAITS?.spirited && ENCOUNTER_TRAITS?.apex), 'ENCOUNTER_TRAITS metadata exported');

            // Pokemon toJSON/fromJSON encounterTrait preservation
            const traitMon = createPokemon(133, 12, 'faeveldt', { encounterTrait: 'treasure' });
            const roundTripped = Pokemon.fromJSON(traitMon.toJSON());
            assertEqual(roundTripped.encounterTrait, 'treasure', 'Pokemon.fromJSON preserves encounterTrait');

            // getTileDepthInfo covers all 3 tiers across the world
            const seenTiers = new Set();
            for (let y = 0; y < WORLD_ROWS; y += 3) {
              for (let x = 0; x < WORLD_COLS; x += 3) {
                const info = getTileDepthInfo(x, y);
                seenTiers.add(info.depthTier);
                assert(['Outskirts', 'Heartland', 'Deep Wilds'].includes(info.zoneLabel), `valid zoneLabel ${info.zoneLabel}`);
              }
            }
            assert(seenTiers.has(0) && seenTiers.has(1) && seenTiers.has(2), 'getTileDepthInfo produces depthTier 0, 1, and 2');

            // 2. Rival rematchPool non-repeating consecutive teams across all 17 rivals
            const rivals = Object.values(RIVAL_TRAINERS);
            assertEqual(rivals.length, 17, '17 RIVAL_TRAINERS');
            for (const rival of rivals) {
              assert(Array.isArray(rival.rematchPool) && rival.rematchPool.length >= 6, `${rival.id} has rematchPool >= 6`);
              for (const spId of rival.rematchPool) {
                assert(Boolean(SPECIES[spId]), `${rival.id} rematchPool #${spId} valid species`);
              }
              let prevSig = null;
              for (let rc = 0; rc < 4; rc++) {
                const prof = {
                  team: [createPokemon(25, 22)],
                  badges: ['b1', 'b2'],
                  rivalsDefeated: [rival.id],
                  rivalRematchCounts: { [rival.id]: rc },
                };
                const party = getScaledRivalParty(rival, prof);
                const sig = party.map((m) => m.speciesId).join(',');
                assert(sig !== prevSig, `${rival.id} rematch #${rc} repeats previous team (${sig})`);
                prevSig = sig;
              }
            }

            // 3. Astral Shrine Trial non-repeating consecutive bosses across all 20 shrines
            const shrines = Object.values(SHRINES);
            assertEqual(shrines.length, 20, '20 SHRINES');
            for (const shrine of shrines) {
              let prevBoss = shrine.guardianId;
              for (let tc = 0; tc < 4; tc++) {
                const prof = {
                  team: [createPokemon(25, 25)],
                  shrinesCleared: [shrine.id],
                  shrineTrialCounts: { [shrine.id]: tc },
                };
                const trial = getScaledShrineTrial(shrine, prof);
                assert(trial.guardianId !== prevBoss, `${shrine.id} trial #${tc + 1} repeated boss #${prevBoss}`);
                assertEqual(trial.isElite, true, `${shrine.id} trial isElite`);
                assert(trial.upgradeTier >= 2, `${shrine.id} trial upgradeTier >= 2`);
                prevBoss = trial.guardianId;
              }
            }

            // 4. Overworld 3 non-repeating discovery node kinds
            const nodeKinds = new Set();
            let prevKind = null;
            for (let i = 0; i < 18; i++) {
              app.overworld.rarePatches = [];
              const k = app.overworld._pickNextDiscoveryNodeKind();
              assert(k !== prevKind, `discovery node kind did not repeat immediately (${k})`);
              prevKind = k;
              nodeKinds.add(k);
            }
            assert(nodeKinds.has('shimmer') && nodeKinds.has('starfall') && nodeKinds.has('mystery_cry'), 'all 3 discovery node kinds produced');
          },
        },
        {
          name: 'SECRET_ARCADE_SPOT map invariants, v1/v2 arcade migration, 3-knock + badge unlock, StarlightMinigame 0-repeat waves, rewards & RAF cleanup',
          async fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            // 1. World invariants & SECRET_ARCADE_SPOT
            assertEqual(Object.keys(BIOMES).length, 18, '18 BIOMES preserved');
            assertEqual(Object.keys(SHRINES).length, 20, '20 SHRINES preserved');
            assertEqual(Object.keys(CHESTS).length, 36, '36 CHESTS preserved');
            assertEqual(Object.keys(NPCS).length, 23, '23 NPCS preserved');
            assertEqual(FIELD_QUESTS.length, 23, '23 FIELD_QUESTS preserved');
            assertEqual(Object.keys(RIVAL_TRAINERS).length, 17, '17 RIVAL_TRAINERS preserved');
            assertEqual(Object.keys(LANDMARKS).length, 20, '20 LANDMARKS preserved');
            assertEqual(Object.keys(SIGNPOSTS).length, 18, '18 SIGNPOSTS preserved');

            assert(Boolean(SECRET_ARCADE_SPOT), 'SECRET_ARCADE_SPOT exported');
            const ax = SECRET_ARCADE_SPOT.x;
            const ay = SECRET_ARCADE_SPOT.y;
            assert(SOLID_TILES.has(WORLD_MAP[ay][ax]), `SECRET_ARCADE_SPOT (${ax},${ay}) is solid tile`);
            assertEqual(isTileWalkableAt(ax, ay), false, `SECRET_ARCADE_SPOT (${ax},${ay}) not walkable`);
            const hasWalkAdj = [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => isTileWalkableAt(ax + dx, ay + dy));
            assertEqual(hasWalkAdj, true, 'SECRET_ARCADE_SPOT has walkable orthogonal neighbor');

            // 2. v1/v2 migration & 3-knock + badge/5-caught unlock
            const MIG_KEY = 'starlight_pokemon_test_s41_arcade_v1';
            let mg = null;
            try {
              window.localStorage.setItem(MIG_KEY, JSON.stringify({
                version: 1,
                activeTrainerId: 'violet',
                settings: { showTouchPad: 'hide' },
                profiles: {
                  violet: {
                    trainerId: 'violet',
                    starterId: 1,
                    pos: { x: 8, y: 15, dir: 'down' },
                    team: [{ uid: 'v1', speciesId: 1, level: 6, xp: 0, hp: 22 }],
                    bag: { potions: 5, greatBalls: 1 },
                  },
                  ozias: {
                    trainerId: 'ozias',
                    starterId: 4,
                    pos: { x: 8, y: 15, dir: 'down' },
                    team: [{ uid: 'o1', speciesId: 4, level: 8, xp: 0, hp: 24 }],
                    badges: ['meadow'],
                    arcade: { unlocked: false, highScore: 250, plays: 2, bestWave: 4, secretKnocks: 1 },
                    rivalRematchCounts: { rival_leo: 2 },
                    shrineTrialCounts: { forest_shrine: 3 },
                    recentEncounters: [10, 16, 25],
                  },
                },
              }));

              const store = new StorageManager(MIG_KEY);
              assertEqual(store.getSettings().showTouchPad, 'hide', 'settings.showTouchPad preserved');
              store.selectTrainer('violet');
              assertEqual(store.isArcadeAttuned(), false, 'Violet arcade unattuned initially');
              assertEqual(store.isArcadeUnlocked(), false, 'Violet arcade locked initially');
              const k0 = store.recordSecretKnock();
              assertEqual(k0.attuned, false, 'unattuned knock reports attuned === false');
              assertEqual(k0.knocks, 0, 'unattuned knock does not increment secretKnocks');
              assertEqual(k0.unlocked, false, 'unattuned knock keeps arcade locked');

              store.getActiveProfile().badges.push('meadow');
              assertEqual(store.isArcadeAttuned(), true, 'badge attunes Violet arcade');
              assertEqual(store.isArcadeUnlocked(), false, 'badge alone does not auto-unlock arcade');

              const k1 = store.recordSecretKnock();
              assertEqual(k1.knocks, 1, 'attuned knock 1');
              assertEqual(k1.unlocked, false, 'locked after knock 1');
              const k2 = store.recordSecretKnock();
              assertEqual(k2.knocks, 2, 'attuned knock 2');
              assertEqual(k2.unlocked, false, 'locked after knock 2');
              const k3 = store.recordSecretKnock();
              assertEqual(k3.knocks, 3, 'attuned knock 3');
              assertEqual(k3.unlocked, true, 'unlocked on knock 3');
              assertEqual(k3.justUnlocked, true, 'justUnlocked on knock 3');
              assertEqual(k3.charges, 3, 'unlock starts with 3 charges');

              // 5-caught attunes without auto-unlocking
              const freshStore = new StorageManager(`${MIG_KEY}_2`);
              try {
                freshStore.selectTrainer('violet');
                freshStore.chooseStarter(1);
                for (const id of [10, 16, 19, 25]) {
                  freshStore.recordCaught(createPokemon(id, 5));
                }
                assertEqual(freshStore.isArcadeAttuned(), true, '5 caught attunes arcade');
                assertEqual(freshStore.isArcadeUnlocked(), false, '5 caught does not auto-unlock arcade');
              } finally {
                window.localStorage.removeItem(`${MIG_KEY}_2`);
              }

              // Ozias v2 preservation + legacy plays migration
              store.selectTrainer('ozias');
              const oz = store.getActiveProfile();
              assertEqual(store.isArcadeUnlocked(oz), true, 'legacy plays/highScore migrates unlocked arcade');
              assertEqual(oz.arcade.charges, 3, 'legacy unlocked arcade starts with 3 charges');
              assertEqual(oz.arcade.highScore, 250, 'arcade.highScore migrated');
              assertEqual(oz.arcade.plays, 2, 'arcade.plays migrated');
              assertEqual(oz.arcade.bestWave, 4, 'arcade.bestWave migrated');
              assertEqual(oz.rivalRematchCounts.rival_leo, 2, 'rivalRematchCounts migrated');
              assertEqual(oz.shrineTrialCounts.forest_shrine, 3, 'shrineTrialCounts migrated');
              assertEqual(oz.recentEncounters.join(','), '10,16,25', 'recentEncounters migrated');

              // 3. StarlightMinigame wave deck, open/drag/dash/endRun/close lifecycle
              assert(WAVE_TEMPLATES.length >= 12, `WAVE_TEMPLATES >= 12 (got ${WAVE_TEMPLATES.length})`);
              const prevAudioMuted = app.audio.muted;
              const prevTheme = app.audio.currentTheme;
              mg = new StarlightMinigame({ storage: store, audio: app.audio });
              let prevWaveId = null;
              for (let i = 0; i < 24; i++) {
                const w = mg.drawNextWave();
                assert(w.id !== prevWaveId, `wave draw #${i} repeated ${prevWaveId}`);
                prevWaveId = w.id;
              }

              const prevShards = oz.bag.starShards || 0;
              mg.open();
              assertEqual(mg.isOpen(), true, 'minigame isOpen() === true');
              assertEqual(app.audio.currentTheme, 'arcade', 'minigame starts arcade BGM');
              assertEqual(mg.getDiagnostics().rafActive, true, 'minigame RAF active on open');
              assertEqual(oz.arcade.charges, 2, 'opening Sky-Hop consumes 1 charge (3 -> 2)');

              const mgCanvas = document.getElementById('minigame-canvas');
              const mRect = mgCanvas.getBoundingClientRect();
              mgCanvas.dispatchEvent(new PointerEvent('pointerdown', {
                pointerId: 3, clientX: mRect.left + 80, clientY: mRect.top + mRect.height * 0.25, bubbles: true, cancelable: true,
              }));
              mgCanvas.dispatchEvent(new PointerEvent('pointermove', {
                pointerId: 3, clientX: mRect.left + 80, clientY: mRect.top + mRect.height * 0.72, bubbles: true, cancelable: true,
              }));
              assert(mg.pointerTargetY !== null && mg.pointerTargetY > 200, 'pointer drag updates pointerTargetY');
              mgCanvas.dispatchEvent(new PointerEvent('pointerup', { pointerId: 3, bubbles: true, cancelable: true }));

              assertEqual(mg.activateDash(), true, 'activateDash() succeeds');
              assertGreater(mg.dashTimer, 0, 'dashTimer active');

              const zeroRewards = mg.computeRewards(0, 1);
              assertEqual(zeroRewards.starShards, 0, 'computeRewards(0, 1) grants 0 starShards');
              assertEqual(zeroRewards.potions, 0, 'computeRewards(0, 1) grants 0 potions');
              assertEqual(Boolean(zeroRewards.cheerCharges), false, 'computeRewards(0, 1) grants 0 cheerCharges');

              mg.score = 900;
              mg.wave = 8;
              mg.starsCollected = 24;
              const runOut = mg.endRun();
              assert(Boolean(runOut && runOut.rewards.starShards >= 1), 'endRun returns rewards at 900 pts');
              assertEqual(runOut.rewards.cheerCharges, 1, '900 pts awards +1 cheerCharge');
              assertEqual(mg.getDiagnostics().rafActive, false, 'endRun stops RAF');
              assertEqual(oz.arcade.highScore, 900, 'highScore persisted');
              assertEqual(oz.arcade.bestWave, 8, 'bestWave persisted');
              assertEqual(oz.arcade.plays, 3, 'plays incremented');
              assertGreater(oz.bag.starShards, prevShards, 'starShards awarded');

              mg.close();
              assertEqual(mg.isOpen(), false, 'minigame closed');
              assertEqual(mg.getDiagnostics().rafActive, false, 'close() leaves rafActive === false');
              assert(app.audio.currentTheme !== 'arcade', 'close() restores overworld/biome BGM');
              if (!prevTheme) app.audio.stopBGM();
              app.audio.setMuted(prevAudioMuted);
            } finally {
              mg?.destroy?.();
              app.clearCelebration?.();
              window.localStorage.removeItem(MIG_KEY);
            }
          },
        },
      ],
    },
    {
      name: '42. Sprint 9 "7-Year-Old on a Tablet" End-to-End Node Playtest & Celebration Gate',
      tests: [
        {
          name: 'Exercises all interactive nodes (Boot -> Lab -> Touch Move -> Sign -> Heal -> Chest -> Quest -> Landmark -> Discovery -> Wild/Rival/Shrine/Trial -> Dex -> Arcade -> Switch) + 1024x768/1280x720 Layout & 60fps',
          async fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            const prevRawSave = window.localStorage.getItem(STORAGE_KEY);
            const wasBootHidden = app.bootScreenEl.hidden;
            const wasStarterHidden = app.starterScreenEl.hidden;
            const wasShellHidden = app.gameShellEl.hidden;
            const wasOverworldActive = app.overworld.active;
            const origCabinetStyle = app.cabinetEl?.getAttribute('style') ?? null;
            const origChestFanfare = app.audio.playChestFanfare.bind(app.audio);
            const origQuestFanfare = app.audio.playQuestCompleteFanfare.bind(app.audio);
            const origConfetti = app.battle.spawnCelebrationConfetti.bind(app.battle);
            const origRandom = Math.random;

            let chestFanfareCalls = 0;
            let questFanfareCalls = 0;
            let battleConfettiCalls = 0;

            try {
              app.audio.playChestFanfare = () => {
                chestFanfareCalls += 1;
                return origChestFanfare();
              };
              app.audio.playQuestCompleteFanfare = () => {
                questFanfareCalls += 1;
                return origQuestFanfare();
              };
              app.battle.spawnCelebrationConfetti = (opts) => {
                battleConfettiCalls += 1;
                return origConfetti(opts);
              };

              window.localStorage.removeItem(STORAGE_KEY);
              storage.state = storage.load();
              storage.updateSettings({ battlePace: 'fast' });
              app.applySettings();

              // 1. Boot & Trainer Select -> Starter Lab & Style -> Overworld
              app.showBootScreen();
              document.getElementById('trainer-card-violet').click();
              assertEqual(app.starterScreenEl.hidden, false, 'Boot card navigates to Starter Lab');
              document.querySelector('.starter-style-chip[data-starter-style-id="twilight"]')?.click();
              document.querySelector('.starter-acc-chip[data-starter-acc-id="halo"]')?.click();
              document.querySelector('.starter-aura-chip[data-starter-aura-id="stars"]')?.click();
              document.querySelector('.starter-pick-btn')?.click();
              assertEqual(app.gameShellEl.hidden, false, 'Picking starter enters game shell');
              if (app.dialogueOpen) {
                // Verify tapping #overworld-canvas or dialogue cleanly advances
                app.closeDialogue();
              }
              const profile = storage.getActiveProfile();
              const celLayer = document.getElementById('celebration-layer');

              // 2. Tap-to-walk on Overworld & Signpost
              app.overworld.walkToTile(8, 13);
              for (let s = 0; s < 80 && (app.overworld.moving || app.overworld.getTouchNavigationState().autoPathLength > 0); s++) {
                app.overworld.update(0.05, null);
              }
              assertEqual(profile.pos.y, 13, 'walkToTile moved Violet north to y=13');
              app.handleWorldInteract({ type: 'sign', key: '10,14', data: SIGNPOSTS['10,14'] });
              assertEqual(app.dialogueOpen, true, 'Signpost opens dialogue');
              document.getElementById('world-dialogue').click();
              assertEqual(app.dialogueOpen, false, 'Tapping #world-dialogue closes dialogue');

              // 3. Healing Fountain with celebration
              profile.team[0].hp = 1;
              app.handleHealSpot(true);
              assertEqual(profile.team[0].hp, profile.team[0].maxHp, 'Healing Fountain restores full HP');
              assertEqual(celLayer.hidden, false, 'Healing Fountain triggers #celebration-layer');
              app.closeDialogue();

              // 4. Treasure Chest -> playChestFanfare + #celebration-layer
              const chestEntry = Object.entries(CHESTS)[0];
              app.handleWorldInteract({ type: 'chest', key: chestEntry[0], data: chestEntry[1] });
              assertEqual(chestFanfareCalls, 1, 'Treasure Chest calls playChestFanfare');
              assertEqual(celLayer.hidden, false, 'Treasure Chest shows #celebration-layer');
              assert(profile.chestsOpened.includes(chestEntry[1].id), 'Chest recorded opened');
              app.closeDialogue();

              // 5. NPC Field Quest -> playQuestCompleteFanfare + #celebration-layer
              const willowEntry = Object.entries(NPCS).find(([, n]) => n.id === 'npc_willow');
              const willowQuest = FIELD_QUESTS.find((q) => q.id === willowEntry[1].questId);
              for (let id = 1; id <= 12; id++) storage.recordCaught(createPokemon(id, 5));
              app.handleWorldInteract({ type: 'npc', key: willowEntry[0], data: willowEntry[1] });
              assertEqual(questFanfareCalls, 1, 'Quest completion calls playQuestCompleteFanfare');
              assertEqual(celLayer.hidden, false, 'Quest completion shows #celebration-layer');
              assert(profile.questsCompleted.includes(willowQuest.id), 'Quest marked completed');
              app.closeDialogue();

              // 6. Landmark
              const lmEntry = Object.entries(LANDMARKS)[0];
              app.handleWorldInteract({ type: 'landmark', key: lmEntry[0], data: lmEntry[1] });
              assertEqual(app.dialogueOpen, true, 'Landmark opens dialogue');
              app.closeDialogue();

              // 7. Overworld Discovery Node (starfall)
              const shardsBeforeStarfall = profile.bag.starShards || 0;
              app.handleDiscoveryNode({ kind: 'starfall', biomeId: 'forest', x: 8, y: 12, depthTier: 1 });
              assertEqual(profile.bag.starShards, shardsBeforeStarfall + 2, 'Starfall awards +2 Star Shards');
              assertEqual(celLayer.hidden, false, 'Starfall triggers #celebration-layer');
              app.closeDialogue();

              // 8. 4-Mode #encounter-flash verification
              const flashEl = document.getElementById('encounter-flash');
              const calloutEl = document.getElementById('encounter-callout');
              for (const [mode, expectedSub] of [
                ['wild', 'WILD'],
                ['rare', 'SHIMMER'],
                ['rival', 'RIVAL'],
                ['shrine', 'SHRINE'],
              ]) {
                const p = app.triggerEncounterTransition(mode === 'shrine' ? 'shrine' : mode === 'rival' ? 'rival' : 'battle', { mode });
                assertEqual(flashEl.hidden, false, `#encounter-flash visible for ${mode}`);
                assertEqual(flashEl.dataset.mode, mode, `#encounter-flash data-mode === ${mode}`);
                assert(calloutEl.textContent.toUpperCase().includes(expectedSub), `${mode} callout includes ${expectedSub}`);
                app.cancelEncounterTransition();
                await p;
                assertEqual(flashEl.hidden, true, 'cancelEncounterTransition hides flash');
              }

              // 9. Wild Battle + Capture Confetti + Curious Bond bonus
              battleConfettiCalls = 0;
              profile.team = [createPokemon(35, 25, 'crater', { upgradeTier: 3 })]; // Clefairy #35
              const curiousWild = createPokemon(133, 6, 'faeveldt', { encounterTrait: 'curious' });
              curiousWild.hp = 1;
              const startWildP = app.battle.start({ enemy: curiousWild, biomeId: 'faeveldt' });
              app.syncControlVisibility();
              const typeTimer1 = setInterval(() => app.battle.finishTypewriter(), 15);
              try {
                await startWildP;
                Math.random = () => 0.01;
                const bondBefore = profile.team[0].bond;
                await app.battle.handleThrowBall('star');
                assertGreater(battleConfettiCalls, 0, 'Capture triggered spawnCelebrationConfetti');
                assertEqual(app.battle.active, false, 'Capture ended battle cleanly');
                assertGreater(profile.team[0].bond, bondBefore, 'Curious capture granted bond bonus');
              } finally {
                Math.random = origRandom;
                clearInterval(typeTimer1);
                if (app.battle.active) app.battle.stop({ outcome: 'escaped', faintedAll: false });
              }

              // 10. Rival Battle & Rotating Rematch + Shrine & Astral Shrine Trial (single-counted)
              const rival = Object.values(RIVAL_TRAINERS)[0];
              const teamFirst = getScaledRivalParty(rival, profile).map((m) => m.speciesId).join(',');
              storage.markRivalDefeated(rival.id, rival.rewards);
              const teamRematch1 = getScaledRivalParty(rival, profile).map((m) => m.speciesId).join(',');
              storage.markRivalDefeated(rival.id, rival.rematchRewards);
              const teamRematch2 = getScaledRivalParty(rival, profile).map((m) => m.speciesId).join(',');
              assert(teamFirst.length > 0 && teamRematch1 !== teamRematch2, 'Rival rematch rotates team');

              const firstShrine = Object.values(SHRINES)[0];
              storage.markShrineCleared(firstShrine.id);
              const shardsPreTrial = profile.bag.starShards || 0;
              const starBallsPreTrial = profile.bag.starBalls || 0;
              const trialSpec = getScaledShrineTrial(firstShrine, profile);
              const trialBoss = createPokemon(trialSpec.guardianId, 10, firstShrine.biome, {
                upgradeTier: trialSpec.upgradeTier,
                isElite: true,
              });
              trialBoss.hp = 1;
              const trialP = app.battle.start({
                enemy: trialBoss,
                biomeId: 'shrine',
                isShrine: true,
                shrineData: { ...firstShrine, isAstralTrial: true, trialNumber: trialSpec.trialNumber },
              });
              app.syncControlVisibility();
              const typeTimer2 = setInterval(() => app.battle.finishTypewriter(), 15);
              try {
                await trialP;
                await app.battle.handleEnemyDefeated(app.battle.sessionId);
              } finally {
                clearInterval(typeTimer2);
                if (app.battle.active) app.battle.stop({ outcome: 'escaped', faintedAll: false });
              }
              assertEqual(profile.shrineTrialCounts[firstShrine.id], 1, 'Astral Shrine Trial recorded ONCE');
              assert(profile.bag.starShards >= shardsPreTrial + 3, 'Astral Trial awarded +3 Star Shards');
              assert(profile.bag.starBalls >= starBallsPreTrial + 1, 'Astral Trial awarded +1 Star Ball');
              assertEqual(celLayer.hidden, false, 'Astral Trial win triggers #celebration-layer');
              app.closeDialogue();

              // 11. Pokédex (Gen/Type/Ability/Cry) + Power-Up + Evolution + Buddy Cheer
              profile.team.push(createPokemon(1, 10, 'forest')); // Bulbasaur ready to evolve
              storage.addStarShards(12);
              storage.addCheerCharges(1);
              app.openPokedex('dex');
              document.getElementById('dex-gen-select').value = 'gen1';
              document.getElementById('dex-gen-select').dispatchEvent(new Event('change', { bubbles: true }));
              assertEqual(document.querySelectorAll('.dex-grid .dex-card').length, 151, 'Gen 1 filter works');
              document.querySelector('.dex-card[data-species-id="1"] .dex-cry-btn')?.click();

              app.openPokedex('team');
              document.querySelector('.team-card .upgrade-btn')?.click();
              assertEqual(celLayer.hidden, false, 'Team Power-Up triggers #celebration-layer');
              document.querySelector('.team-card .cheer-btn')?.click();
              assertEqual(celLayer.hidden, false, 'Buddy Cheer triggers #celebration-layer');
              document.querySelector('.team-card .evolve-btn')?.click();
              assertEqual(celLayer.hidden, false, 'Team Evolution triggers #celebration-layer');
              app.pokedex.close();

              // 12. Secret Sky-Hop Arcade unattuned hint + attuned 3-knock unlock + play + close
              profile.arcade = {
                unlocked: false,
                charges: 0,
                stepProgress: 0,
                battleProgress: 0,
                gemCooldown: 0,
                highScore: 0,
                plays: 0,
                bestWave: 0,
                secretKnocks: 0,
              };
              profile.badges = [];
              profile.pokedex.caught = { 1: 1 };
              profile.team = [createPokemon(35, 16, 'crater', { upgradeTier: 3 })];
              profile.box = [];
              app.refreshHud();
              assertEqual(document.getElementById('hud-btn-arcade').hidden, true, '#hud-btn-arcade hidden while locked');

              app.handleWorldInteract({ type: 'arcade', key: SECRET_ARCADE_SPOT.key, data: SECRET_ARCADE_SPOT });
              assertEqual(app.dialogueOpen, true, 'Unattuned inspect opens clue dialogue');
              assertEqual(profile.arcade.secretKnocks, 0, 'Unattuned inspect keeps secretKnocks === 0');
              app.closeDialogue();

              profile.badges = ['meadow'];
              app.refreshHud();
              assertEqual(document.getElementById('hud-btn-arcade').hidden, true, '#hud-btn-arcade stays hidden until 3 attuned knocks');

              app.handleWorldInteract({ type: 'arcade', key: SECRET_ARCADE_SPOT.key, data: SECRET_ARCADE_SPOT });
              assertEqual(app.dialogueOpen, true, 'Attuned Knock 1 opens clue dialogue');
              app.closeDialogue();
              app.handleWorldInteract({ type: 'arcade', key: SECRET_ARCADE_SPOT.key, data: SECRET_ARCADE_SPOT });
              assertEqual(app.dialogueOpen, true, 'Attuned Knock 2 opens clue dialogue');
              app.closeDialogue();
              app.handleWorldInteract({ type: 'arcade', key: SECRET_ARCADE_SPOT.key, data: SECRET_ARCADE_SPOT });
              assertEqual(app.minigame.isOpen(), true, 'Knock 3 unlocks and opens Starlight Sky-Hop Mini-Game');
              assertEqual(document.getElementById('hud-btn-arcade').hidden, false, '#hud-btn-arcade visible after unlock');
              const s42Zero = app.minigame.computeRewards(0, 1);
              assertEqual(s42Zero.starShards, 0, 'Sky-Hop computeRewards(0, 1) returns 0 starShards');
              assertEqual(s42Zero.potions, 0, 'Sky-Hop computeRewards(0, 1) returns 0 potions');
              app.minigame.activateDash();
              app.minigame.score = 520;
              app.minigame.wave = 5;
              const s42End = app.minigame.endRun();
              assertGreater(s42End.rewards.starShards, 0, 'Sky-Hop 520 pts awards starShards');
              assertEqual(s42End.rewards.cheerCharges, 1, 'Sky-Hop 520 pts awards +1 cheerCharge');
              document.getElementById('minigame-close-btn').click();
              assertEqual(app.minigame.isOpen(), false, 'Closing mini-game hides modal');

              // 13. HUD overflow & Battle non-overlap at Tablet 1024x768 & Chromebook 1280x720 with Install + Arcade visible
              app.hudInstallGroupEl.hidden = false;
              app.hudArcadeBtn.hidden = false;
              const battleCheckP = app.battle.start({
                enemy: createPokemon(1024, 36, 'crater', { isElite: true, upgradeTier: 4 }),
                biomeId: 'crater',
              });
              app.syncControlVisibility();
              const typeTimer3 = setInterval(() => app.battle.finishTypewriter(), 15);
              try {
                await battleCheckP;
              } finally {
                clearInterval(typeTimer3);
              }
              const overlaps = (a, b) => !(
                a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom
              );
              for (const [label, w, h] of [
                ['Tablet 1024x768', 940, Math.round(768 * 0.985)],
                ['Chromebook 1280x720', 940, Math.round(720 * 0.985)],
              ]) {
                app.cabinetEl.style.width = `${w}px`;
                app.cabinetEl.style.height = `${h}px`;
                await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
                const hudBar = document.querySelector('.hud-bar');
                assert(hudBar.scrollWidth <= hudBar.clientWidth + 2, `${label}: HUD zero overflow w/ Install + Arcade (${hudBar.scrollWidth} <= ${hudBar.clientWidth})`);
                const enemyCard = document.querySelector('.status-card-enemy').getBoundingClientRect();
                const playerSprite = document.querySelector('.fighter-sprite-player').getBoundingClientRect();
                const playerCard = document.querySelector('.status-card-player').getBoundingClientRect();
                const enemySprite = document.querySelector('.fighter-sprite-enemy').getBoundingClientRect();
                assertEqual(overlaps(enemyCard, playerSprite), false, `${label}: zero enemyCard vs Clefairy overlap`);
                assertEqual(overlaps(playerCard, enemySprite), false, `${label}: zero playerCard vs Terapagos overlap`);
              }
              app.battle.stop({ outcome: 'escaped', faintedAll: false });

              // 14. Settings & Profile Switch
              app.openSettings();
              document.getElementById('setting-switch-trainer-btn').click();
              assertEqual(app.bootScreenEl.hidden, false, 'Profile switch returns to Boot screen');
              document.getElementById('trainer-card-ozias').click();
              assertEqual(storage.getActiveTrainerId(), 'ozias', 'Switched profile cleanly to Ozias');

              // 15. 60fps loop stability
              const fpsDeadline = performance.now() + 1400;
              while (app.getDiagnostics().measuredFps <= 0 && performance.now() < fpsDeadline) {
                await new Promise((r) => setTimeout(r, 60));
              }
              const diag = app.getDiagnostics();
              assertEqual(diag.loopStartCount, 1, 'loopStartCount === 1');
              assertGreater(diag.measuredFps, 0, `measuredFps > 0 (got ${diag.measuredFps})`);
            } finally {
              Math.random = origRandom;
              app.audio.playChestFanfare = origChestFanfare;
              app.audio.playQuestCompleteFanfare = origQuestFanfare;
              app.battle.spawnCelebrationConfetti = origConfetti;
              if (origCabinetStyle === null) app.cabinetEl?.removeAttribute('style');
              else app.cabinetEl?.setAttribute('style', origCabinetStyle);
              if (app.battle.active) app.battle.stop({ outcome: 'escaped', faintedAll: false });
              app.minigame?.close?.();
              app.pokedex.close();
              app.closeSettings();
              app.closeDialogue();
              app.clearCelebration?.();
              app.cancelEncounterTransition?.();
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
      name: '43. Sprint 10 Systems, World & Combat Hardening',
      tests: [
        {
          name: 'StorageManager self-healing (UID dedup, team > 6 rescue, negative/NaN clamp, QuotaExceededError diagnostics, showTouchPad + v1/v2 migration)',
          fn() {
            const TEMP_KEY = 'starlight_pokemon_test_s43_storage';
            const TEMP_QUOTA_KEY = 'starlight_pokemon_test_s43_quota';
            try {
              // 1. Corrupted save with duplicate UIDs, team overflow (>6), negative/NaN bag & dex, v1/v2 settings
              window.localStorage.setItem(TEMP_KEY, JSON.stringify({
                version: 1,
                activeTrainerId: 'violet',
                settings: { showTouchPad: 'show', battlePace: 'fast', crtEnabled: false, muted: true },
                profiles: {
                  violet: {
                    trainerId: 'violet',
                    starterId: 1,
                    pos: { x: 8, y: 15, dir: 'down' },
                    team: [
                      { uid: 'dup_uid', speciesId: 1, level: 10, hp: 30 },
                      { uid: 'dup_uid', speciesId: 4, level: 11, hp: 31 },
                      { uid: '', speciesId: 7, level: 12, hp: 32 },
                      { uid: 'u4', speciesId: 25, level: 13, hp: 33 },
                      { uid: 'u5', speciesId: 35, level: 14, hp: 34 },
                      { uid: 'u6', speciesId: 133, level: 15, hp: 35 },
                      { uid: 'dup_uid', speciesId: 143, level: 16, hp: 50 },
                      { uid: 'u8', speciesId: 149, level: 17, hp: 45 },
                    ],
                    box: [
                      { uid: 'dup_uid', speciesId: 150, level: 25, hp: 70 },
                    ],
                    bag: {
                      potions: -5,
                      greatBalls: 'NaN',
                      starBalls: -2,
                      starShards: 'bad',
                      gems: { sun_gem: -3, pixie_gem: 'NaN', tera_gem: 4.8 },
                    },
                    pokedex: {
                      seen: [-1, 0, 1026, 'NaN', 25],
                      caught: { 0: 2, 1026: 1, 25: -4, 1: 3 },
                    },
                    rivalRematchCounts: { rival_leo: -2, rival_mira: 'NaN', rival_kai: 3.7 },
                    shrineTrialCounts: { forest_shrine: -5, crater_shrine: 2 },
                    recentEncounters: [-1, 0, 1026, 25, '133'],
                    arcade: { highScore: -100, plays: 'NaN', bestWave: -2, secretKnocks: -1 },
                  },
                  ozias: {
                    trainerId: 'ozias',
                    starterId: 4,
                    pos: { x: 8, y: 15, dir: 'down' },
                    team: [{ uid: 'oz_1', speciesId: 4, level: 6, hp: 20 }],
                    bag: { potions: 2, greatBalls: 1 },
                  },
                },
              }));

              const store = new StorageManager(TEMP_KEY);
              assertEqual(store.getSettings().showTouchPad, 'show', 'v1 settings.showTouchPad preserved');
              assertEqual(store.getSettings().battlePace, 'fast', 'v1 settings.battlePace preserved');
              store.updateSettings({ showTouchPad: 'invalid_mode' });
              assertEqual(store.getSettings().showTouchPad, 'show', 'invalid showTouchPad preserves valid setting');
              store.updateSettings({ showTouchPad: 'hide' });
              assertEqual(store.getSettings().showTouchPad, 'hide', 'valid showTouchPad update accepted');

              const vProf = store.getProfile('violet');
              assertEqual(vProf.team.length, 6, 'team clamped to 6');
              assertEqual(vProf.box.length, 3, '2 overflow team mons rescued into box alongside 1 existing box mon');
              const allMons = [...vProf.team, ...vProf.box];
              assertEqual(allMons.map((m) => m.speciesId).sort((a, b) => a - b).join(','), '1,4,7,25,35,133,143,149,150', 'zero Pokemon lost during overflow rescue');
              const allUids = allMons.map((m) => m.uid);
              assert(allUids.every((u) => typeof u === 'string' && u.length > 0), 'all mons have non-empty uid');
              assertEqual(new Set(allUids).size, allUids.length, 'all duplicate/blank UIDs repaired to unique UIDs');

              // Bag, gems, dex & counter clamping
              assertEqual(vProf.bag.potions, 0, 'negative potions clamped to 0');
              assertEqual(vProf.bag.greatBalls, 0, 'NaN greatBalls clamped to 0');
              assertEqual(vProf.bag.starBalls, 0, 'negative starBalls clamped to 0');
              assertEqual(vProf.bag.starShards, 0, 'malformed starShards clamped to 0');
              assertEqual(vProf.bag.gems.sun_gem, 0, 'negative gem clamped to 0');
              assertEqual(vProf.bag.gems.pixie_gem, 0, 'NaN gem clamped to 0');
              assertEqual(vProf.bag.gems.tera_gem, 4, 'fractional gem floored cleanly');

              assert(vProf.pokedex.seen.every((id) => Number.isInteger(id) && id >= 1 && id <= 1025), 'pokedex.seen restricted to 1..1025');
              assert(!Object.prototype.hasOwnProperty.call(vProf.pokedex.caught, '0') && !Object.prototype.hasOwnProperty.call(vProf.pokedex.caught, '1026'), 'out-of-range caught keys removed');
              assertEqual(vProf.pokedex.caught[1], 3, 'valid caught count preserved');
              assertEqual(vProf.rivalRematchCounts.rival_leo, 0, 'negative rivalRematchCounts clamped');
              assertEqual(vProf.rivalRematchCounts.rival_kai, 3, 'valid rivalRematchCounts floored');
              assertEqual(vProf.shrineTrialCounts.forest_shrine, 0, 'negative shrineTrialCounts clamped');
              assertEqual(vProf.arcade.highScore, 0, 'negative arcade.highScore clamped');
              assertEqual(vProf.arcade.plays, 0, 'NaN arcade.plays clamped');
              assertEqual(vProf.arcade.bestWave, 0, 'negative arcade.bestWave clamped');
              assertEqual(vProf.arcade.secretKnocks, 0, 'negative arcade.secretKnocks clamped');

              // v1 migration defaults for Ozias (omitted starBalls/starShards)
              const oProf = store.getProfile('ozias');
              assertEqual(oProf.bag.starBalls, 0, 'v1 migration sets omitted starBalls: 0');
              assertEqual(oProf.bag.starShards, 2, 'v1 migration sets omitted starShards: 2');

              // Direct validateAndRepairProfile test
              const directRepaired = validateAndRepairProfile({
                trainerId: 'violet',
                team: [
                  { uid: 'x', speciesId: 1, level: 5 },
                  { uid: 'x', speciesId: 4, level: 5 },
                ],
                box: [],
              }, 'violet');
              assert(directRepaired.team[0].uid !== directRepaired.team[1].uid, 'validateAndRepairProfile repairs duplicate UID');

              // 2. QuotaExceededError graceful handling & getStorageDiagnostics()
              const quotaStore = new StorageManager(TEMP_QUOTA_KEY);
              quotaStore.selectTrainer('violet');
              quotaStore.chooseStarter(25);
              const origGetStorage = quotaStore._getStorage.bind(quotaStore);
              const failingStorage = {
                getItem: (k) => window.localStorage.getItem(k),
                setItem: () => {
                  const err = new Error('Storage quota exceeded');
                  err.name = 'QuotaExceededError';
                  throw err;
                },
                removeItem: (k) => window.localStorage.removeItem(k),
              };
              quotaStore._getStorage = () => failingStorage;
              const saveOk = quotaStore.save();
              assertEqual(saveOk, false, 'save() returns false on QuotaExceededError without throwing');
              assert(String(quotaStore.lastSaveError || '').includes('QuotaExceededError'), 'lastSaveError records QuotaExceededError');
              const qDiag = quotaStore.getStorageDiagnostics();
              assert(String(qDiag.lastSaveError || '').includes('QuotaExceededError'), 'getStorageDiagnostics().lastSaveError exposed');
              assertEqual(qDiag.usingMemoryFallback, true, 'usingMemoryFallback === true under quota failure');
              assertEqual(qDiag.hasMemoryFallback, true, 'hasMemoryFallback === true');
              assertGreater(qDiag.memoryBytes, 0, 'memoryBytes > 0');
              const reloaded = quotaStore.load();
              assertEqual(reloaded.activeTrainerId, 'violet', 'load() preserves activeTrainerId via memoryFallback');
              assertEqual(reloaded.profiles.violet.starterId, 25, 'load() preserves starter via memoryFallback');

              quotaStore._getStorage = origGetStorage;
              assertEqual(quotaStore.save(), true, 'save() recovers once storage is writable again');
              assertEqual(quotaStore.lastSaveError, null, 'lastSaveError cleared after successful save');
              assertEqual(quotaStore.getStorageDiagnostics().usingMemoryFallback, false, 'usingMemoryFallback cleared after recovery');
            } finally {
              window.localStorage.removeItem(TEMP_KEY);
              window.localStorage.removeItem(TEMP_QUOTA_KEY);
            }
          },
        },
        {
          name: 'Pokemon.fromJSON clamping ([1,50] level, [0,100] bond, [0,5] upgradeTier, zero NaN) + all 1,025 SPECIES have 4 distinct valid moves',
          fn() {
            const highMon = Pokemon.fromJSON({
              speciesId: 25,
              level: 999,
              bond: 250,
              upgradeTier: 99,
              xp: -50,
              hp: 99999,
              isShiny: true,
              isElite: true,
              encounterTrait: 'apex',
              abilityId: 'rail_overload',
              movePp: { thunder_shock: 999, tackle: -5, nonexistent_move: 10 },
              pp: ['NaN', Infinity],
              moves: [{ id: 'quick_attack', pp: -3 }],
            });
            assertEqual(highMon.level, 50, 'level upper clamped to 50');
            assertEqual(highMon.bond, 100, 'bond upper clamped to 100');
            assertEqual(highMon.upgradeTier, MAX_UPGRADE_TIER, 'upgradeTier upper clamped to MAX_UPGRADE_TIER (5)');
            assertEqual(highMon.xp, 0, 'negative xp clamped to 0');
            assertEqual(highMon.hp, highMon.maxHp, 'hp upper clamped to maxHp');
            assertEqual(highMon.isShiny, true, 'isShiny preserved');
            assertEqual(highMon.isElite, true, 'isElite preserved');
            assertEqual(highMon.encounterTrait, 'apex', 'encounterTrait preserved');
            assertEqual(highMon.abilityId, 'rail_overload', 'valid abilityId preserved');
            for (const statKey of ['maxHp', 'hp', 'atk', 'def', 'spd', 'xp', 'xpToNext', 'bond', 'upgradeTier']) {
              assertFinite(highMon[statKey], `highMon.${statKey} finite`);
            }
            for (const mvId of highMon.species.movePool) {
              assertInRange(highMon.movePp[mvId], 0, MOVES[mvId].pp, `movePp[${mvId}] clamped`);
            }

            const lowMon = Pokemon.fromJSON({
              speciesId: 1,
              level: -10,
              bond: -25,
              upgradeTier: -3,
              xp: NaN,
              hp: -5,
              atk: NaN,
              movePp: null,
              pp: [NaN, 'oops'],
              moves: [null, 42],
            });
            assertEqual(lowMon.level, 1, 'level lower clamped to 1');
            assertEqual(lowMon.bond, 0, 'bond lower clamped to 0');
            assertEqual(lowMon.upgradeTier, 0, 'upgradeTier lower clamped to 0');
            assertEqual(lowMon.xp, 0, 'NaN xp clamped to 0');
            assertEqual(lowMon.hp, 0, 'negative hp clamped to 0');
            for (const statKey of ['maxHp', 'hp', 'atk', 'def', 'spd', 'xp', 'xpToNext', 'bond', 'upgradeTier']) {
              assertFinite(lowMon[statKey], `lowMon.${statKey} finite`);
            }

            const roundTripped = Pokemon.fromJSON(highMon.toJSON());
            assertEqual(roundTripped.abilityId, 'rail_overload', 'toJSON/fromJSON preserves abilityId');
            assertEqual(roundTripped.encounterTrait, 'apex', 'toJSON/fromJSON preserves encounterTrait');

            // Audit all 1,025 SPECIES have 4 distinct valid movePool entries + valid ability
            for (let id = 1; id <= 1025; id++) {
              const sp = SPECIES[id];
              assert(Boolean(sp), `SPECIES[${id}] exists`);
              assert(Array.isArray(sp.movePool) && sp.movePool.length === 4, `SPECIES[${id}].movePool has 4 moves`);
              assertEqual(new Set(sp.movePool).size, 4, `SPECIES[${id}].movePool has 4 distinct moves`);
              for (const moveId of sp.movePool) {
                assert(Boolean(MOVES[moveId]), `SPECIES[${id}] move '${moveId}' exists in MOVES`);
              }
              assert(Boolean(ABILITIES[sp.ability]), `SPECIES[${id}] ability '${sp.ability}' exists in ABILITIES`);
            }
          },
        },
        {
          name: 'overworld.walkToTile forgiving near-edge snapping (radius 1..2), interactive/walkable preservation & OOB/walled rejection',
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
              storage.chooseStarter(1);
              app.enterOverworld(false);
              app.closeDialogue();
              const ow = app.overworld;
              const profile = storage.getActiveProfile();

              const findReachableStartNear = (tx, ty, minSteps = 2) => {
                const queue = [];
                const visited = new Set();
                for (let dy = -2; dy <= 2; dy++) {
                  for (let dx = -2; dx <= 2; dx++) {
                    const d = Math.abs(dx) + Math.abs(dy);
                    if (d < 1 || d > 2) continue;
                    const nx = tx + dx;
                    const ny = ty + dy;
                    if (nx >= 0 && ny >= 0 && nx < WORLD_COLS && ny < WORLD_ROWS && isTileWalkableAt(nx, ny)) {
                      queue.push([nx, ny, 0]);
                      visited.add(`${nx},${ny}`);
                    }
                  }
                }
                for (let head = 0; head < queue.length; head++) {
                  const [cx, cy, dist] = queue[head];
                  if (dist >= minSteps) return { x: cx, y: cy };
                  for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx < 0 || ny < 0 || nx >= WORLD_COLS || ny >= WORLD_ROWS) continue;
                    const k = `${nx},${ny}`;
                    if (visited.has(k) || !isTileWalkableAt(nx, ny)) continue;
                    visited.add(k);
                    queue.push([nx, ny, dist + 1]);
                  }
                }
                return null;
              };

              let r1Target = null;
              let r2Target = null;
              let walledTarget = null;
              for (let y = 1; y < WORLD_ROWS - 1; y++) {
                for (let x = 1; x < WORLD_COLS - 1; x++) {
                  if (isTileWalkableAt(x, y) || ow.getInteractiveAtTile(x, y)) continue;
                  let d1 = 0;
                  let d2 = 0;
                  for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                      const d = Math.abs(dx) + Math.abs(dy);
                      if (d < 1 || d > 2) continue;
                      const nx = x + dx;
                      const ny = y + dy;
                      if (nx >= 0 && ny >= 0 && nx < WORLD_COLS && ny < WORLD_ROWS && isTileWalkableAt(nx, ny)) {
                        if (d === 1) d1 += 1;
                        else d2 += 1;
                      }
                    }
                  }
                  if (!r1Target && d1 > 0) {
                    const start = findReachableStartNear(x, y, 2);
                    if (start) r1Target = { x, y, start };
                  }
                  if (!r2Target && d1 === 0 && d2 > 0) {
                    const start = findReachableStartNear(x, y, 2);
                    if (start) r2Target = { x, y, start };
                  }
                  if (!walledTarget && d1 === 0 && d2 === 0) {
                    walledTarget = { x, y };
                  }
                }
              }
              assert(Boolean(r1Target && r2Target && walledTarget), 'found radius-1, radius-2, and walled solid test tiles');

              // 1. Radius-1 near-edge solid tile snap
              profile.pos = { x: r1Target.start.x, y: r1Target.start.y, dir: 'down' };
              ow.syncFromProfile();
              ow.stepsSinceBattle = 0;
              ow.rarePatches = [];
              ow.onWildEncounter = () => {};
              ow.onDiscoveryNode = () => {};
              assertEqual(ow.walkToTile(r1Target.x, r1Target.y), true, 'radius-1 solid tile snaps to walkable neighbor');
              const dest1 = ow.getTouchNavigationState().touchDestination;
              assert(Boolean(dest1), 'radius-1 touchDestination set');
              assertEqual(isTileWalkableAt(dest1.x, dest1.y), true, 'radius-1 snapped destination is walkable');
              assertEqual(Math.abs(dest1.x - r1Target.x) + Math.abs(dest1.y - r1Target.y), 1, 'radius-1 snapped Manhattan distance === 1');
              for (let s = 0; s < 140 && (ow.moving || ow.getTouchNavigationState().autoPathLength > 0); s++) {
                ow.update(0.05, null);
              }
              assertEqual(profile.pos.x, dest1.x, 'walked to radius-1 snapped x');
              assertEqual(profile.pos.y, dest1.y, 'walked to radius-1 snapped y');

              // 2. Radius-2 near-edge solid tile snap (all Manhattan-1 neighbors solid)
              profile.pos = { x: r2Target.start.x, y: r2Target.start.y, dir: 'down' };
              ow.syncFromProfile();
              ow.stepsSinceBattle = 0;
              assertEqual(ow.walkToTile(r2Target.x, r2Target.y), true, 'radius-2 solid tile snaps to walkable radius-2 neighbor');
              const dest2 = ow.getTouchNavigationState().touchDestination;
              assert(Boolean(dest2), 'radius-2 touchDestination set');
              assertEqual(isTileWalkableAt(dest2.x, dest2.y), true, 'radius-2 snapped destination is walkable');
              assertEqual(Math.abs(dest2.x - r2Target.x) + Math.abs(dest2.y - r2Target.y), 2, 'radius-2 snapped Manhattan distance === 2');

              // 3. Standing directly on closest snapped tile succeeds without moving off
              profile.pos = { x: dest1.x, y: dest1.y, dir: 'down' };
              ow.syncFromProfile();
              assertEqual(ow.walkToTile(r1Target.x, r1Target.y), true, 'tapping solid neighbor while standing on closest snapped tile succeeds');
              assertEqual(profile.pos.x, dest1.x, 'player x stays on closest snapped tile');
              assertEqual(profile.pos.y, dest1.y, 'player y stays on closest snapped tile');

              // 4. Walkable tile preserves exact destination (no snap)
              profile.pos = { x: 8, y: 15, dir: 'down' };
              ow.syncFromProfile();
              assertEqual(ow.walkToTile(8, 13), true, 'walkable tile (8,13) queued');
              assertEqual(ow.getTouchNavigationState().touchDestination.x, 8, 'exact walkable x preserved');
              assertEqual(ow.getTouchNavigationState().touchDestination.y, 13, 'exact walkable y preserved');

              // 5. Interactive tile preserves autoInteractTarget
              assertEqual(ow.walkToTile(SECRET_ARCADE_SPOT.x, SECRET_ARCADE_SPOT.y), true, 'interactive arcade tile queued');
              assertEqual(ow.getTouchNavigationState().autoInteractTarget?.x, SECRET_ARCADE_SPOT.x, 'autoInteractTarget x preserved');
              assertEqual(ow.getTouchNavigationState().autoInteractTarget?.y, SECRET_ARCADE_SPOT.y, 'autoInteractTarget y preserved');

              // 6. Out-of-bounds, invalid, and completely walled-off solid tile rejection
              assertEqual(ow.walkToTile(-1, 5), false, 'negative x rejected');
              assertEqual(ow.walkToTile(WORLD_COLS, 5), false, 'x >= WORLD_COLS rejected');
              assertEqual(ow.walkToTile(5, WORLD_ROWS), false, 'y >= WORLD_ROWS rejected');
              assertEqual(ow.walkToTile(NaN, 5), false, 'NaN rejected');
              assertEqual(ow.walkToTile(walledTarget.x, walledTarget.y), false, 'completely walled-off solid tile (>2 from walkable) rejected');
            } finally {
              if (prevRawSave === null) window.localStorage.removeItem(STORAGE_KEY);
              else window.localStorage.setItem(STORAGE_KEY, prevRawSave);
              storage.state = storage.load();
              app.applyTrainerTheme(storage.getActiveTrainerId() || 'violet');
              app.bootScreenEl.hidden = wasBootHidden;
              app.starterScreenEl.hidden = wasStarterHidden;
              app.gameShellEl.hidden = wasShellHidden;
              app.overworld.setActive(wasOverworldActive);
              if (!wasOverworldActive) app.audio?.stopBGM?.();
              if (!wasBootHidden) app.showBootScreen();
              else app.refreshHud();
              app.syncControlVisibility();
              app.syncOverworldPause();
            }
          },
        },
        {
          name: 'Battle tap-to-skip typewriter (no premature unlock), .move-eff-pill badges (0 clip), playPokemonCry anti-overlap & interrupted audio recovery',
          async fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            const prevRawSave = window.localStorage.getItem(STORAGE_KEY);
            const wasBootHidden = app.bootScreenEl.hidden;
            const wasStarterHidden = app.starterScreenEl.hidden;
            const wasShellHidden = app.gameShellEl.hidden;
            const wasOverworldActive = app.overworld.active;
            const origCabinetStyle = app.cabinetEl?.getAttribute('style') ?? null;

            const OrigAudioContext = window.AudioContext;
            const OrigWebkitAudioContext = window.webkitAudioContext;

            try {
              window.localStorage.removeItem(STORAGE_KEY);
              storage.state = storage.load();
              storage.selectTrainer('violet');
              storage.chooseStarter(7); // Squirtle #7 (Water) vs Fire Charmander #4 -> 2x SUPER; plus Bulbasaur #1 -> 0.5x RESIST
              storage.updateSettings({ battlePace: 'cinema' });
              app.applySettings();
              app.enterOverworld(false);
              app.closeDialogue();

              const profile = storage.getActiveProfile();
              profile.team = [createPokemon(7, 10, 'forest')];

              // 1. Tap-to-skip #battle-log and #battle-stage without premature input unlock + drawer guard
              const charmander = createPokemon(4, 8, 'volcano');
              const startP = app.battle.start({ enemy: charmander, biomeId: 'volcano' });
              app.syncControlVisibility();

              const waitTypeDeadline = performance.now() + 800;
              while (app.battle.typingTimer === null && performance.now() < waitTypeDeadline) {
                await new Promise((r) => setTimeout(r, 15));
              }
              assert(app.battle.typingTimer !== null, 'cinema battlePace activates typingTimer');
              assert(app.battle.state !== BATTLE_STATES.PLAYER_INPUT, 'state locked during intro typewriter');

              // Open drawer guard: tapping log/stage while drawer open must NOT skip
              app.battle.teamDrawerEl.hidden = false;
              app.battle.logEl.click();
              assert(app.battle.typingTimer !== null, 'tap-to-skip ignored while #battle-team-drawer is open');
              app.battle.teamDrawerEl.hidden = true;

              // Tap #battle-log -> skips typewriter immediately without premature move unlock
              app.battle.logEl.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', button: 0, bubbles: true, cancelable: true }));
              assertEqual(app.battle.typingTimer, null, 'tapping #battle-log immediately finishes typewriter');

              await startP;
              assertEqual(app.battle.state, BATTLE_STATES.PLAYER_INPUT, 'battle settles to PLAYER_INPUT after intro completes');

              // Tap #battle-stage during simulated turn typewriter does NOT prematurely unlock player input
              app.battle.lockPlayerAction(BATTLE_STATES.ACTION_ANIMATING);
              const stageMsgP = app.battle.say('Squirtle focused its starlight!', 40, 1200);
              assert(app.battle.typingTimer !== null, 'say() starts typingTimer');
              app.battle.stageEl.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', button: 0, bubbles: true, cancelable: true }));
              assertEqual(app.battle.typingTimer, null, 'tapping #battle-stage immediately finishes typewriter');
              assertEqual(app.battle.state, BATTLE_STATES.ACTION_ANIMATING, 'tapping #battle-stage does NOT prematurely unlock PLAYER_INPUT');
              assertEqual(app.battle.busy, true, 'battle remains busy after skip until turn finishes');
              await stageMsgP;
              app.battle.unlockPlayerInput();

              // 2. .move-eff-pill badges rendered without layout clipping (2x SUPER + 0.5x RESIST)
              app.battle.renderMoveButtons();
              const superPills = Array.from(document.querySelectorAll('#battle-moves .move-eff-pill'));
              assert(superPills.length >= 1, `expected >= 1 .move-eff-pill badge for Squirtle vs Charmander, got ${superPills.length}`);
              assert(superPills.some((el) => el.textContent.trim() === '2x SUPER' && (el.title || '').includes('Super Effective')), '2x SUPER .move-eff-pill rendered with kid-friendly tooltip');

              const deckEl = document.querySelector('.battle-deck');
              assert(deckEl.scrollWidth <= deckEl.clientWidth + 2, `.battle-deck zero horizontal overflow (${deckEl.scrollWidth} <= ${deckEl.clientWidth})`);
              for (const pill of superPills) {
                const btnRect = pill.closest('.move-btn').getBoundingClientRect();
                const pillRect = pill.getBoundingClientRect();
                assert(pillRect.width > 0 && pillRect.height > 0, 'super pill visible');
                assert(pillRect.right <= btnRect.right + 1.5 && pillRect.bottom <= btnRect.bottom + 1.5, '2x SUPER .move-eff-pill fits cleanly inside .move-btn without clipping');
              }

              // Switch active player fighter to Bulbasaur (#1 Grass) vs Charmander (#4 Fire) -> 0.5x RESIST
              app.battle.player = createPokemon(1, 10, 'forest');
              app.battle.renderMoveButtons();
              const resistPills = Array.from(document.querySelectorAll('#battle-moves .move-eff-pill'));
              assert(resistPills.some((el) => el.textContent.trim() === '0.5x RESIST' && (el.title || '').includes('Resisted')), '0.5x RESIST .move-eff-pill rendered with kid-friendly tooltip');
              for (const pill of resistPills) {
                const btnRect = pill.closest('.move-btn').getBoundingClientRect();
                const pillRect = pill.getBoundingClientRect();
                assert(pillRect.width > 0 && pillRect.height > 0, 'resist pill visible');
                assert(pillRect.right <= btnRect.right + 1.5 && pillRect.bottom <= btnRect.bottom + 1.5, '0.5x RESIST .move-eff-pill fits cleanly inside .move-btn without clipping');
              }

              app.battle.stop({ outcome: 'escaped', faintedAll: false });

              // 3. 'interrupted' AudioContext recovery + rapid-fire playPokemonCry anti-overlap
              const makeParam = (initial = 0) => ({
                value: initial,
                ramps: [],
                setValueAtTime(v) { this.value = v; },
                linearRampToValueAtTime(v, t) { this.value = v; this.ramps.push({ v, t }); },
                exponentialRampToValueAtTime(v, t) { this.value = v; this.ramps.push({ v, t }); },
                cancelScheduledValues() {},
                setTargetAtTime(v) { this.value = v; },
              });
              const mockInstances = [];
              class MockInterruptedAudioContext {
                constructor() {
                  this.state = 'running';
                  this.currentTime = 1.0;
                  this.sampleRate = 44100;
                  this.destination = {};
                  this.onstatechange = null;
                  this.resumeCalls = 0;
                  this.oscillators = [];
                  this.gains = [];
                  mockInstances.push(this);
                }
                createGain() {
                  const g = { gain: makeParam(1), disconnected: false, connect() {}, disconnect() { this.disconnected = true; } };
                  this.gains.push(g);
                  return g;
                }
                createBiquadFilter() { return { type: 'lowpass', frequency: makeParam(350), Q: makeParam(1), connect() {}, disconnect() {} }; }
                createDynamicsCompressor() { return { threshold: makeParam(-24), knee: makeParam(30), ratio: makeParam(12), attack: makeParam(0.003), release: makeParam(0.25), connect() {}, disconnect() {} }; }
                createPeriodicWave() { return {}; }
                createOscillator() {
                  const osc = {
                    type: 'sine',
                    frequency: makeParam(440),
                    started: false,
                    stopped: false,
                    stopTime: null,
                    stopTimes: [],
                    disconnected: false,
                    onended: null,
                    connect() {},
                    disconnect() { this.disconnected = true; },
                    setPeriodicWave() {},
                    start() { this.started = true; },
                    stop(t) { this.stopped = true; this.stopTime = t; this.stopTimes.push(t); },
                  };
                  this.oscillators.push(osc);
                  return osc;
                }
                createBuffer(ch, len, sr) { const d = new Float32Array(len); return { channels: ch, length: len, sampleRate: sr, getChannelData: () => d }; }
                createBufferSource() { return { buffer: null, connect() {}, disconnect() {}, start() {}, stop() {} }; }
                resume() {
                  this.resumeCalls += 1;
                  this.state = 'running';
                  this.onstatechange?.();
                  return Promise.resolve();
                }
                close() { this.state = 'closed'; return Promise.resolve(); }
              }
              window.AudioContext = MockInterruptedAudioContext;
              window.webkitAudioContext = MockInterruptedAudioContext;

              const cryAudio = new AudioEngine({ silent: true, attachUnlockListeners: false });
              try {
                cryAudio.ensureContext();
                await cryAudio.unlock();
                assertEqual(cryAudio.unlocked, true, 'audio unlocked initially');

                const ctx = mockInstances[0];
                // Simulate iOS/Android phone call / lock interruption
                ctx.state = 'interrupted';
                ctx.onstatechange();
                assertEqual(cryAudio.unlocked, false, 'interrupted state marks audio unlocked = false');

                const queuedVoice = cryAudio.triggerVoice({ freq: 440, duration: 0.12 });
                assertEqual(Boolean(queuedVoice?.queued), true, 'voice while interrupted queues and triggers unlock');
                assertGreater(ctx.resumeCalls, 0, 'interrupted triggerVoice invoked ctx.resume()');
                await Promise.resolve();
                assertEqual(cryAudio.unlocked, true, 'interrupted context recovers to unlocked === true');
                assertEqual(cryAudio.getDiagnostics().queuedVoices, 0, 'queued voices flushed after interrupted recovery');

                // Rapid-fire playPokemonCry anti-overlap
                const oscCountBeforeCries = ctx.oscillators.length;
                const c1 = cryAudio.playPokemonCry(1);
                const oscCountAfter1 = ctx.oscillators.length;
                assertGreater(oscCountAfter1, oscCountBeforeCries, 'cry #1 created oscillator(s)');
                const c2 = cryAudio.playPokemonCry(4);
                const oscCountAfter2 = ctx.oscillators.length;
                assertGreater(oscCountAfter2, oscCountAfter1, 'cry #2 created oscillator(s)');
                const c3 = cryAudio.playPokemonCry(25);
                assertEqual(c1.played && c2.played && c3.played, true, 'all rapid cries returned played: true');
                assert('baseFreq' in c3 && 'wave' in c3 && 'duration' in c3 && 'speciesId' in c3, 'cry return shape preserved');

                for (let i = oscCountBeforeCries; i < oscCountAfter2; i++) {
                  const prevOsc = ctx.oscillators[i];
                  assert(prevOsc.stopTimes.length >= 2, `rapid cry issued early anti-overlap stop on cry oscillator #${i}`);
                  assert(prevOsc.stopTime <= ctx.currentTime + 0.025, `rapid cry faded previous oscillator <= 25ms (${prevOsc.stopTime})`);
                }
                const latestOscs = ctx.oscillators.slice(oscCountAfter2);
                assert(latestOscs.length > 0 && latestOscs.every((o) => o.stopTimes.length === 1 && o.stopTime > ctx.currentTime + 0.05), 'latest cry oscillator remains scheduled without premature anti-overlap stop');
              } finally {
                await cryAudio.destroy();
              }
            } finally {
              window.AudioContext = OrigAudioContext;
              window.webkitAudioContext = OrigWebkitAudioContext;
              if (origCabinetStyle === null) app.cabinetEl?.removeAttribute('style');
              else app.cabinetEl?.setAttribute('style', origCabinetStyle);
              if (app.battle.active) app.battle.stop({ outcome: 'escaped', faintedAll: false });
              if (prevRawSave === null) window.localStorage.removeItem(STORAGE_KEY);
              else window.localStorage.setItem(STORAGE_KEY, prevRawSave);
              storage.state = storage.load();
              app.applyTrainerTheme(storage.getActiveTrainerId() || 'violet');
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
      name: '44. Sprint 10 PWA v11, Sky-Hop Pause/Offline & Accessibility Reconciliation',
      tests: [
        {
          name: 'manifest.json 1,025 copy, sw.js v11 precache parity, Sky-Hop Pause/Space replay/Orb fallback, Pokédex scrollTop reset & dialog a11y',
          async fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            // 1. manifest.json & sw.js v11 precache parity
            const manifest = await (await fetch('./manifest.json')).json();
            assert(!manifest.description.includes('110 '), 'manifest description removed stale "110 " count');
            assert(manifest.description.includes('1,025'), 'manifest description mentions 1,025');

            const swText = await (await fetch('./sw.js')).text();
            assert(swText.includes('starlight-shell-v11') && swText.includes('starlight-assets-v11'), 'sw.js uses v11 cache names');
            const urlsMatch = swText.match(/const CORE_SHELL_URLS\s*=\s*\[([\s\S]*?)\];/);
            assert(Boolean(urlsMatch), 'CORE_SHELL_URLS parsed from sw.js');
            const shellUrls = [...urlsMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
            assertGreater(shellUrls.length, 30, `CORE_SHELL_URLS has runtime entries (${shellUrls.length})`);
            assert(shellUrls.includes('./index.html') && shellUrls.includes('./manifest.json') && shellUrls.includes('./js/minigame.js'), 'CORE_SHELL_URLS includes shell/manifest/minigame');
            assert(shellUrls.every((u) => !u.includes('./scripts/') && !u.includes('./tests/')), 'CORE_SHELL_URLS excludes ./scripts/* and ./tests/*');
            for (const typeId of Object.keys(TYPES)) {
              assert(shellUrls.includes(`./assets/fallback/${typeId}.svg`), `CORE_SHELL_URLS includes ${typeId}.svg`);
            }
            for (const url of shellUrls) {
              const res = await fetch(url);
              assert(res.ok, `CORE_SHELL_URLS entry ${url} returned HTTP ${res.status}`);
            }

            // 2. Modal dialog accessibility attributes
            for (const modalId of ['pokedex-modal', 'settings-modal', 'minigame-modal']) {
              const modal = document.getElementById(modalId);
              assert(Boolean(modal), `#${modalId} exists`);
              assertEqual(modal.getAttribute('role'), 'dialog', `#${modalId} has role="dialog"`);
              assertEqual(modal.getAttribute('aria-modal'), 'true', `#${modalId} has aria-modal="true"`);
              const hasLabel = Boolean(modal.getAttribute('aria-label') || modal.getAttribute('aria-labelledby'));
              assertEqual(hasLabel, true, `#${modalId} has accessible label`);
            }

            const prevRawSave = window.localStorage.getItem(STORAGE_KEY);
            const wasBootHidden = app.bootScreenEl.hidden;
            const wasStarterHidden = app.starterScreenEl.hidden;
            const wasShellHidden = app.gameShellEl.hidden;
            const wasOverworldActive = app.overworld.active;
            const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');

            let mg = null;
            try {
              window.localStorage.removeItem(STORAGE_KEY);
              storage.state = storage.load();
              storage.selectTrainer('violet');
              storage.chooseStarter(25); // Pikachu #25
              app.enterOverworld(false);
              app.closeDialogue();

              // 3. Pokédex scrollTop === 0 reset on filter / generation / Show All changes
              app.openPokedex('dex');
              const dexGrid = document.querySelector('#pokedex-body .dex-grid');
              assert(Boolean(dexGrid), 'dex-grid mounted');
              assertGreater(dexGrid.scrollHeight, dexGrid.clientHeight, 'dex-grid is scrollable across 1,025 entries');
              dexGrid.scrollTop = 320;
              assertGreater(dexGrid.scrollTop, 0, 'dex-grid scrolled down before filter change');

              const genSel = document.getElementById('dex-gen-select');
              genSel.value = 'gen2';
              genSel.dispatchEvent(new Event('change', { bubbles: true }));
              assertEqual(document.querySelector('#pokedex-body .dex-grid').scrollTop, 0, 'changing #dex-gen-select resets scrollTop === 0');

              const grid2 = document.querySelector('#pokedex-body .dex-grid');
              if (grid2.scrollHeight > grid2.clientHeight) {
                grid2.scrollTop = 180;
                const typeSel = document.getElementById('dex-type-select');
                typeSel.value = 'water';
                typeSel.dispatchEvent(new Event('change', { bubbles: true }));
                assertEqual(document.querySelector('#pokedex-body .dex-grid').scrollTop, 0, 'changing #dex-type-select resets scrollTop === 0');
              }

              document.getElementById('dex-reset-filters-btn')?.click();
              assertEqual(document.querySelector('#pokedex-body .dex-grid').scrollTop, 0, 'reset filters resets scrollTop === 0');
              app.pokedex.close();

              // 4. StarlightMinigame Pause (#minigame-pause-btn, KeyP, visibilitychange), Space replay & orb fallback
              const prevMuted = app.audio.muted;
              app.audio.setMuted(true);
              storage.unlockArcade();
              mg = new StarlightMinigame({ storage, audio: app.audio });
              mg.open();
              const pauseBtn = document.getElementById('minigame-pause-btn');
              assert(Boolean(pauseBtn), '#minigame-pause-btn exists');
              assert(Boolean(pauseBtn.closest('.minigame-header')), '#minigame-pause-btn lives inside .minigame-header');
              assertEqual(mg.getDiagnostics().paused, false, 'minigame starts unpaused');
              assertEqual(pauseBtn.getAttribute('aria-pressed'), 'false', 'pause button aria-pressed="false" initially');

              pauseBtn.click();
              assertEqual(mg.getDiagnostics().paused, true, '#minigame-pause-btn click pauses minigame');
              assertEqual(mg.getDiagnostics().rafActive, false, 'pausing stops RAF');
              assertEqual(pauseBtn.getAttribute('aria-pressed'), 'true', 'pause button aria-pressed="true" while paused');

              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', code: 'KeyP', bubbles: true, cancelable: true }));
              assertEqual(mg.getDiagnostics().paused, false, 'KeyP resumes minigame');
              assertEqual(mg.getDiagnostics().rafActive, true, 'KeyP resume restarts RAF');

              // visibilitychange auto-pause
              Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
              document.dispatchEvent(new Event('visibilitychange'));
              assertEqual(mg.getDiagnostics().paused, true, 'visibilitychange hidden === true auto-pauses minigame');
              assertEqual(mg.getDiagnostics().rafActive, false, 'auto-pause stops RAF');
              if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor);
              else delete document.hidden;

              mg.resume();
              assertEqual(mg.getDiagnostics().paused, false, 'resume() unpauses after visibility restore');

              // Space Game Over replay
              mg.score = 180;
              mg.wave = 3;
              mg.endRun();
              assertEqual(mg.runEnded, true, 'endRun sets runEnded === true');
              assertEqual(document.getElementById('minigame-results').hidden, false, 'results screen visible on Game Over');
              window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true }));
              assertEqual(mg.runEnded, false, 'Space key on Game Over starts new run');
              assertEqual(mg.score, 0, 'Space replay resets score to 0');
              assertEqual(document.getElementById('minigame-results').hidden, true, 'Space replay hides results screen');

              // Un-decoded sprite orb fallback
              let orbCalls = 0;
              const origOrb = mg._drawPartnerOrb.bind(mg);
              mg._drawPartnerOrb = (ctx) => {
                orbCalls += 1;
                return origOrb(ctx);
              };
              mg.playerSpriteImg = { complete: false, naturalWidth: 0 };
              mg.render(performance.now());
              assertEqual(orbCalls, 1, 'un-decoded sprite renders Starlight Partner Orb fallback cleanly');
              mg.close();
              app.audio.setMuted(prevMuted);
            } finally {
              if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor);
              else delete document.hidden;
              mg?.destroy?.();
              if (prevRawSave === null) window.localStorage.removeItem(STORAGE_KEY);
              else window.localStorage.setItem(STORAGE_KEY, prevRawSave);
              storage.state = storage.load();
              app.applyTrainerTheme(storage.getActiveTrainerId() || 'violet');
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
        {
          name: '6-viewport (390x844, 412x915, 667x375, 768x1024, 1024x768, 1280x720) zero-overflow & zero-overlap gate',
          async fn() {
            const app = window.__starlightApp;
            const prevRawSave = window.localStorage.getItem(STORAGE_KEY);

            const iframe = document.createElement('iframe');
            iframe.src = './';
            iframe.title = 'Viewport Matrix Verification';
            iframe.style.cssText = 'position:fixed;left:-12000px;top:0;width:390px;height:844px;border:0;opacity:0.01;pointer-events:none;';
            document.body.appendChild(iframe);

            let iframeApp = null;
            try {
              await new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('Viewport iframe load timeout')), 15000);
                iframe.addEventListener('load', () => {
                  clearTimeout(timer);
                  resolve();
                }, { once: true });
              });

              const iWin = iframe.contentWindow;
              const iDoc = iframe.contentDocument;
              const appDeadline = performance.now() + 5000;
              while (!iWin.__starlightApp && performance.now() < appDeadline) {
                await new Promise((r) => setTimeout(r, 25));
              }
              iframeApp = iWin.__starlightApp;
              assert(Boolean(iframeApp), 'iframe GameApp mounted');
              iframeApp.audio?.setMuted?.(true);

              // Boot -> Violet -> Starter -> Game Shell
              iWin.localStorage.removeItem(STORAGE_KEY);
              iframeApp.pokedex.storage.state = iframeApp.pokedex.storage.load();
              iframeApp.showBootScreen();
              iDoc.getElementById('trainer-card-violet').click();
              iDoc.querySelector('.starter-pick-btn').click();
              iframeApp.closeDialogue();
              iframeApp.pokedex.storage.unlockArcade();
              iframeApp.refreshHud();
              iframeApp.hudInstallGroupEl.hidden = false;
              iframeApp.hudArcadeBtn.hidden = false;

              const overlaps = (a, b) => !(
                a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom
              );
              const viewports = [
                ['Android 390x844', 390, 844],
                ['Android 412x915', 412, 915],
                ['Short Landscape 667x375', 667, 375],
                ['Tablet Portrait 768x1024', 768, 1024],
                ['Tablet Landscape 1024x768', 1024, 768],
                ['Chromebook 1280x720', 1280, 720],
              ];

              for (const [label, w, h] of viewports) {
                iframe.style.width = `${w}px`;
                iframe.style.height = `${h}px`;
                iWin.dispatchEvent(new iWin.Event('resize'));
                await new Promise((r) => iWin.requestAnimationFrame(() => iWin.requestAnimationFrame(r)));

                // 1. HUD zero overflow
                const hudBar = iDoc.querySelector('.hud-bar');
                assert(hudBar.scrollWidth <= hudBar.clientWidth + 2, `${label}: HUD overflow (${hudBar.scrollWidth} > ${hudBar.clientWidth})`);

                // 2. Battle zero overlap & .battle-deck fit
                const battleP = iframeApp.battle.start({
                  enemy: createPokemon(1024, 36, 'crater', { isElite: true, upgradeTier: 4 }),
                  biomeId: 'crater',
                });
                iframeApp.syncControlVisibility();
                const fastT = iWin.setInterval(() => iframeApp.battle.finishTypewriter(), 15);
                try {
                  await battleP;
                } finally {
                  iWin.clearInterval(fastT);
                }
                await new Promise((r) => iWin.requestAnimationFrame(() => iWin.requestAnimationFrame(r)));

                const eCard = iDoc.querySelector('.status-card-enemy').getBoundingClientRect();
                const pSprite = iDoc.querySelector('.fighter-sprite-player').getBoundingClientRect();
                const pCard = iDoc.querySelector('.status-card-player').getBoundingClientRect();
                const eSprite = iDoc.querySelector('.fighter-sprite-enemy').getBoundingClientRect();
                const deck = iDoc.querySelector('.battle-deck');
                const deckRect = deck.getBoundingClientRect();
                assertEqual(overlaps(eCard, pSprite), false, `${label}: enemyCard vs playerSprite overlap`);
                assertEqual(overlaps(pCard, eSprite), false, `${label}: playerCard vs enemySprite overlap`);
                assert(deckRect.top >= -1 && deckRect.bottom <= h + 2, `${label}: .battle-deck clipped vertically (${deckRect.bottom} > ${h})`);
                assert(deck.scrollWidth <= deck.clientWidth + 2, `${label}: .battle-deck horizontal overflow (${deck.scrollWidth} > ${deck.clientWidth})`);
                iframeApp.battle.stop({ outcome: 'escaped', faintedAll: false });

                // 3. Pokédex zero horizontal overflow
                iframeApp.openPokedex('dex');
                await new Promise((r) => iWin.requestAnimationFrame(() => iWin.requestAnimationFrame(r)));
                const dexBody = iDoc.getElementById('pokedex-body');
                assert(dexBody.scrollWidth <= dexBody.clientWidth + 2, `${label}: #pokedex-body horizontal overflow (${dexBody.scrollWidth} > ${dexBody.clientWidth})`);
                iframeApp.pokedex.close();

                // 4. Sky-Hop controls inside viewport
                iframeApp.minigame.open();
                await new Promise((r) => iWin.requestAnimationFrame(() => iWin.requestAnimationFrame(r)));
                const mgCard = iDoc.querySelector('#minigame-modal .minigame-card');
                const dashRect = iDoc.getElementById('minigame-dash-btn').getBoundingClientRect();
                const pauseRect = iDoc.getElementById('minigame-pause-btn').getBoundingClientRect();
                assert(mgCard.scrollWidth <= mgCard.clientWidth + 2, `${label}: .minigame-card overflow`);
                assert(dashRect.width > 0 && dashRect.bottom <= h + 2 && dashRect.right <= w + 2, `${label}: #minigame-dash-btn fits inside viewport`);
                assert(pauseRect.width > 0 && pauseRect.bottom <= h + 2 && pauseRect.right <= w + 2, `${label}: #minigame-pause-btn fits inside viewport`);
                iframeApp.minigame.close();
              }
            } finally {
              if (iframeApp) {
                try {
                  if (iframeApp.battle?.active) iframeApp.battle.stop({ outcome: 'escaped', faintedAll: false });
                  iframeApp.minigame?.destroy?.();
                  iframeApp.overworld?.setActive?.(false);
                  await iframeApp.audio?.destroy?.();
                } catch {
                  // Ignore iframe teardown errors
                }
              }
              iframe.remove();
              if (prevRawSave === null) window.localStorage.removeItem(STORAGE_KEY);
              else window.localStorage.setItem(STORAGE_KEY, prevRawSave);
              storage.state = storage.load();
              app.applyTrainerTheme(storage.getActiveTrainerId() || 'violet');
              app.refreshHud();
              app.syncControlVisibility();
              app.syncOverworldPause();
            }
          },
        },
      ],
    },
    {
      name: '45. Sprint 11 Economy Integrity & Buddy Cheer Anti-Spam Gate',
      tests: [
        {
          name: 'Fresh profiles (Violet & Ozias) start with 0 Star Shards & 0 Cheer Hearts, and locked Pokédex buttons mutate nothing',
          fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');
            assertEqual(MAX_CHEER_CHARGES, 3, 'MAX_CHEER_CHARGES === 3');
            assertEqual(STEPS_PER_CHEER_CHARGE, 25, 'STEPS_PER_CHEER_CHARGE === 25');

            const prevRawSave = window.localStorage.getItem(STORAGE_KEY);
            const wasBootHidden = app.bootScreenEl.hidden;
            const wasStarterHidden = app.starterScreenEl.hidden;
            const wasShellHidden = app.gameShellEl.hidden;
            const wasOverworldActive = app.overworld.active;

            try {
              for (const [trainerId, starterId] of [['violet', 1], ['ozias', 4]]) {
                const key = `starlight_pokemon_test_s45_fresh_${trainerId}`;
                window.localStorage.removeItem(key);
                const store = new StorageManager(key);
                store.selectTrainer(trainerId);
                store.chooseStarter(starterId);
                const prof = store.getActiveProfile();
                assertEqual(prof.bag.starShards, 0, `${trainerId}: fresh starShards === 0`);
                assertEqual(prof.bag.cheerCharges, 0, `${trainerId}: fresh cheerCharges === 0`);
                assertEqual(prof.cheerStepProgress, 0, `${trainerId}: fresh cheerStepProgress === 0`);
                assertEqual(prof.stats.cheers, 0, `${trainerId}: fresh stats.cheers === 0`);
                window.localStorage.removeItem(key);
              }

              window.localStorage.removeItem(STORAGE_KEY);
              storage.state = storage.load();
              storage.selectTrainer('violet');
              storage.chooseStarter(1);
              app.enterOverworld(false);
              app.closeDialogue();

              const liveProf = storage.getActiveProfile();
              const celLayer = document.getElementById('celebration-layer');
              app.clearCelebration?.();
              app.openPokedex('team');

              const summaryText = document.querySelector('.dex-summary-bar')?.textContent || '';
              assert(summaryText.includes('Shards: 0'), `summary bar shows Shards: 0, got "${summaryText}"`);
              assert(summaryText.includes('Cheers: 0/3'), `summary bar shows Cheers: 0/3, got "${summaryText}"`);

              const upBtn = document.querySelector('.team-card .upgrade-btn');
              const cheerBtn = document.querySelector('.team-card .cheer-btn');
              assert(Boolean(upBtn), 'Team card renders .upgrade-btn');
              assert(Boolean(cheerBtn), 'Team card renders .cheer-btn');
              assertEqual(upBtn.disabled, true, '.upgrade-btn is disabled at 0 shards');
              assertEqual(upBtn.getAttribute('aria-disabled'), 'true', '.upgrade-btn aria-disabled="true"');
              assertEqual(upBtn.textContent, '🔒 Power Up (0/2 ✨)', '.upgrade-btn locked label matches');
              assertEqual(cheerBtn.disabled, true, '.cheer-btn is disabled at 0 cheers');
              assertEqual(cheerBtn.getAttribute('aria-disabled'), 'true', '.cheer-btn aria-disabled="true"');
              assertEqual(cheerBtn.textContent, '🔒 Cheer (0/3 💖 • 25👣)', '.cheer-btn locked label matches');

              upBtn.click();
              cheerBtn.click();
              app.pokedex.triggerBuddyCheer(liveProf.team[0]);
              app.pokedex.triggerPokemonUpgrade(liveProf.team[0]);

              assertEqual(liveProf.team[0].bond, 20, 'locked cheer click mutates 0 Bond');
              assertEqual(liveProf.team[0].upgradeTier, 0, 'locked upgrade click mutates 0 upgradeTier');
              assertEqual(liveProf.bag.starShards, 0, 'locked clicks mutate 0 starShards');
              assertEqual(liveProf.bag.cheerCharges, 0, 'locked clicks mutate 0 cheerCharges');
              assertEqual(liveProf.stats.cheers, 0, 'locked clicks mutate 0 stats.cheers');
              assertEqual(liveProf.badges.length, 0, 'locked clicks unlock 0 badges');
              assertEqual(document.querySelector('.evo-celebration-banner'), null, 'locked clicks render 0 celebration banners');
              assertEqual(celLayer.hidden, true, 'locked clicks keep #celebration-layer hidden');
              app.pokedex.close();
            } finally {
              app.pokedex.close();
              app.clearCelebration?.();
              if (prevRawSave === null) window.localStorage.removeItem(STORAGE_KEY);
              else window.localStorage.setItem(STORAGE_KEY, prevRawSave);
              storage.state = storage.load();
              app.applyTrainerTheme(storage.getActiveTrainerId() || 'violet');
              app.bootScreenEl.hidden = wasBootHidden;
              app.starterScreenEl.hidden = wasStarterHidden;
              app.gameShellEl.hidden = wasShellHidden;
              app.overworld.setActive(wasOverworldActive);
              if (!wasOverworldActive) app.audio?.stopBGM?.();
              if (!wasBootHidden) app.showBootScreen();
              else app.refreshHud();
            }
          },
        },
        {
          name: 'Earned Cheer Charge loop: 25 steps, battle win, wild catch (+1 total), Sky-Hop 120+ pts & strict cap at MAX_CHEER_CHARGES = 3',
          async fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            const TEST_KEY = 'starlight_pokemon_test_s45_earn_v1';
            const noopAudio = {
              muted: true,
              unlock() {},
              playMenuBlip() {},
              playBattleStart() {},
              playAttackHit() {},
              playHealChime() {},
              playBallThrow() {},
              playBallWobble() {},
              playCatchSuccess() {},
              playVictoryFanfare() {},
              playBuddyCheer() {},
              playBuddyEndure() {},
              playBadgeFanfare() {},
              playRunEscape() {},
              playPokemonCry() {},
              startBattleBGM() {},
              startRivalBGM() {},
              startShrineBGM() {},
              stopBGM() {},
              restoreOverworldBGM() {},
            };

            const origRand = Math.random;
            let engine = null;
            let mg = null;

            const prevRawSave = window.localStorage.getItem(STORAGE_KEY);
            const wasBootHidden = app.bootScreenEl.hidden;
            const wasStarterHidden = app.starterScreenEl.hidden;
            const wasShellHidden = app.gameShellEl.hidden;
            const wasOverworldActive = app.overworld.active;
            const origPlayBuddyCheer = app.audio.playBuddyCheer.bind(app.audio);

            try {
              window.localStorage.removeItem(TEST_KEY);
              const store = new StorageManager(TEST_KEY);
              store.updateSettings({ battlePace: 'fast' });
              store.selectTrainer('violet');
              store.chooseStarter(1);
              const prof = store.getActiveProfile();

              // 1. 25 walked steps -> +1 💖 (steps 1..24 do not grant)
              for (let s = 1; s < STEPS_PER_CHEER_CHARGE; s++) {
                const res = store.updatePosition(8, 15, 'down', true);
                assertEqual(res.stepCheerEarned, false, `step ${s}/25 does not grant Cheer`);
                assertEqual(res.stepProgress, s, `step ${s}/25 stepProgress === ${s}`);
              }
              const step25 = store.updatePosition(8, 15, 'down', true);
              assertEqual(step25.stepCheerEarned, true, 'step 25/25 grants +1 💖 Cheer Heart');
              assertEqual(step25.cheerCharges, 1, 'cheerCharges === 1 after 25 steps');
              assertEqual(step25.stepProgress, 0, 'stepProgress resets to 0');

              // 2. Battle victory -> +1 💖 (1 -> 2)
              store.recordBattleWin();
              assertEqual(prof.bag.cheerCharges, 2, 'recordBattleWin grants +1 💖 (1 -> 2)');

              // 3. Wild catch -> strictly +1 💖 total (reset to 0 first to prove no double +2 with recordBattleWin)
              prof.bag.cheerCharges = 0;
              store.save();
              engine = new BattleEngine({
                storage: store,
                audio: noopAudio,
                onBattleEnd() {},
                onBadgesUnlocked() {},
                onHudRefresh() {},
              });
              const wildEnemy = createPokemon(16, 4, 'forest');
              wildEnemy.hp = 1;
              const startCatchP = engine.start({ enemy: wildEnemy, biomeId: 'forest' });
              const timer = setInterval(() => engine.finishTypewriter(), 10);
              try {
                await startCatchP;
                Math.random = () => 0.0;
                await engine.handleThrowBall('pokeball');
              } finally {
                clearInterval(timer);
                Math.random = origRand;
              }
              assertEqual(prof.bag.cheerCharges, 1, 'wild catch grants strictly +1 💖 total (0 -> 1, no double-count)');
              const catchText = document.getElementById('battle-log')?.textContent || '';
              assert(catchText.includes('Cheer Heart'), `catch text announces Cheer Heart, got "${catchText}"`);
              engine.destroy();
              engine = null;

              // 4. Sky-Hop score >= 180 (Wave 2+) grants +1 💖 (1 -> 2)
              store.unlockArcade();
              mg = new StarlightMinigame({ storage: store, audio: noopAudio });
              mg.score = 180;
              mg.wave = 2;
              const skyOut = mg.endRun();
              assertEqual(skyOut.rewards.cheerCharges, 1, 'Sky-Hop 180 pts (Wave 2) awards +1 💖 Cheer Heart');
              assertEqual(prof.bag.cheerCharges, 2, 'Sky-Hop 180 pts raises cheerCharges 1 -> 2');
              mg.destroy();
              mg = null;

              // 5. Strict cap at MAX_CHEER_CHARGES = 3
              store.recordBattleWin();
              assertEqual(prof.bag.cheerCharges, 3, 'reached MAX_CHEER_CHARGES = 3');
              store.recordBattleWin();
              assertEqual(prof.bag.cheerCharges, 3, 'extra recordBattleWin capped at 3');
              store.addCheerCharges(5);
              assertEqual(prof.bag.cheerCharges, 3, 'addCheerCharges(5) capped at 3');
              for (let s = 1; s <= 30; s++) {
                const stepCap = store.updatePosition(8, 15, 'down', true);
                assertEqual(stepCap.stepCheerEarned, false, 'walked steps at 3/3 cap grant 0 extra');
                assertEqual(stepCap.stepProgress, 0, 'stepProgress stays 0 while at 3/3 cap');
              }
              assertEqual(prof.bag.cheerCharges, 3, 'cheerCharges remains 3');

              // 6. Live GameApp onStepSaved step-25 feedback
              window.localStorage.removeItem(STORAGE_KEY);
              storage.state = storage.load();
              storage.selectTrainer('violet');
              storage.chooseStarter(1);
              app.enterOverworld(false);
              app.closeDialogue();
              let cheerAudioCalls = 0;
              app.audio.playBuddyCheer = () => {
                cheerAudioCalls += 1;
              };
              for (let s = 1; s <= 25; s++) {
                app.overworld.onStepSaved(8, 15, 'down', true);
              }
              assertEqual(storage.getActiveProfile().bag.cheerCharges, 1, 'live app 25 steps grant +1 💖');
              assertEqual(cheerAudioCalls, 1, 'live app step 25 triggers playBuddyCheer feedback');
            } finally {
              Math.random = origRand;
              app.audio.playBuddyCheer = origPlayBuddyCheer;
              engine?.destroy();
              mg?.destroy();
              window.localStorage.removeItem(TEST_KEY);
              if (prevRawSave === null) window.localStorage.removeItem(STORAGE_KEY);
              else window.localStorage.setItem(STORAGE_KEY, prevRawSave);
              storage.state = storage.load();
              app.applyTrainerTheme(storage.getActiveTrainerId() || 'violet');
              app.bootScreenEl.hidden = wasBootHidden;
              app.starterScreenEl.hidden = wasStarterHidden;
              app.gameShellEl.hidden = wasShellHidden;
              app.overworld.setActive(wasOverworldActive);
              if (!wasOverworldActive) app.audio?.stopBGM?.();
              if (!wasBootHidden) app.showBootScreen();
              else app.refreshHud();
            }
          },
        },
        {
          name: 'Max-Bond guard: cheering to Bond 100/100 renders .bond-max-pill (🌟 MAX BOND) and rejects max_bond without consuming a charge',
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
              const starter = storage.chooseStarter(1);
              const prof = storage.getActiveProfile();
              app.enterOverworld(false);
              app.closeDialogue();

              // 8 cheers from Bond 20 -> 100 in earned batches (3 + 3 + 2)
              storage.addCheerCharges(3);
              for (let i = 0; i < 3; i++) {
                const r = storage.cheerPokemon(starter.uid);
                assertEqual(r.cheered, true, `cheer batch 1 #${i + 1} succeeded`);
                assertEqual(r.remainingCheers, 2 - i, 'remainingCheers decrements cleanly');
              }
              storage.addCheerCharges(3);
              for (let i = 0; i < 3; i++) {
                const r = storage.cheerPokemon(starter.uid);
                assertEqual(r.cheered, true, `cheer batch 2 #${i + 1} succeeded`);
              }
              storage.addCheerCharges(3);
              for (let i = 0; i < 2; i++) {
                const r = storage.cheerPokemon(starter.uid);
                assertEqual(r.cheered, true, `cheer batch 3 #${i + 1} succeeded`);
              }

              assertEqual(starter.bond, 100, 'starter reached Bond 100/100');
              assertEqual(prof.stats.cheers, 8, 'stats.cheers === 8');
              assertEqual(prof.bag.cheerCharges, 1, '1 remaining earned charge left over');

              // Attempt cheer at Bond 100 -> rejected with max_bond, charge preserved
              const maxRes = storage.cheerPokemon(starter.uid);
              assertEqual(maxRes.cheered, false, 'cheerPokemon at Bond 100 returns cheered === false');
              assertEqual(maxRes.reason, 'max_bond', 'reason === max_bond');
              assertEqual(prof.bag.cheerCharges, 1, 'max_bond rejection does not consume cheerCharge');
              assertEqual(prof.stats.cheers, 8, 'max_bond rejection does not increment stats.cheers');

              // Pokédex Team renders .bond-max-pill (🌟 MAX BOND) and no .cheer-btn
              app.openPokedex('team');
              const maxPill = document.querySelector('.team-card .bond-max-pill');
              assert(Boolean(maxPill), 'Team card at Bond 100 renders .bond-max-pill');
              assertEqual(maxPill.textContent, '🌟 MAX BOND', '.bond-max-pill shows 🌟 MAX BOND');
              assertEqual(document.querySelector('.team-card .cheer-btn'), null, 'Team card at Bond 100 renders no .cheer-btn');
              app.pokedex.close();
            } finally {
              app.pokedex.close();
              app.clearCelebration?.();
              if (prevRawSave === null) window.localStorage.removeItem(STORAGE_KEY);
              else window.localStorage.setItem(STORAGE_KEY, prevRawSave);
              storage.state = storage.load();
              app.applyTrainerTheme(storage.getActiveTrainerId() || 'violet');
              app.bootScreenEl.hidden = wasBootHidden;
              app.starterScreenEl.hidden = wasStarterHidden;
              app.gameShellEl.hidden = wasShellHidden;
              app.overworld.setActive(wasOverworldActive);
              if (!wasOverworldActive) app.audio?.stopBGM?.();
              if (!wasBootHidden) app.showBootScreen();
              else app.refreshHud();
            }
          },
        },
        {
          name: 'Full economy validation (Infinity/NaN clamp, unowned/broke upgrade, evo/potion/battle anti-bypass, Sky-Hop <60 vs >=60, Guide/Team 6-viewport responsive check)',
          async fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            const TEST_KEY = 'starlight_pokemon_test_s45_economy_v1';
            const noopAudio = {
              muted: true,
              unlock() {},
              playMenuBlip() {},
              playBattleStart() {},
              playAttackHit() {},
              playHealChime() {},
              playBallThrow() {},
              playBallWobble() {},
              playCatchSuccess() {},
              playVictoryFanfare() {},
              playBuddyCheer() {},
              playBuddyEndure() {},
              playBadgeFanfare() {},
              playRunEscape() {},
              playPokemonCry() {},
              playArcadeUnlockFanfare() {},
              startBattleBGM() {},
              startRivalBGM() {},
              startShrineBGM() {},
              stopBGM() {},
              restoreOverworldBGM() {},
            };

            const origRand = Math.random;
            let engine = null;
            let mg = null;
            const prevRawSave = window.localStorage.getItem(STORAGE_KEY);

            try {
              window.localStorage.removeItem(TEST_KEY);
              const store = new StorageManager(TEST_KEY);
              store.updateSettings({ battlePace: 'fast' });
              store.selectTrainer('violet');
              const starter = store.chooseStarter(1); // Bulbasaur Lv.5
              const prof = store.getActiveProfile();

              // 1. Infinity / NaN / -5 / boolean injection rejection
              store.addStarShards(Infinity);
              store.addStarShards(-Infinity);
              store.addStarShards(NaN);
              store.addStarShards(-5);
              store.addStarShards(true);
              assertEqual(prof.bag.starShards, 0, 'Infinity/NaN/-5/boolean addStarShards rejected');

              store.addCheerCharges(Infinity);
              store.addCheerCharges(NaN);
              store.addCheerCharges(-5);
              assertEqual(prof.bag.cheerCharges, 0, 'Infinity/NaN/-5 addCheerCharges rejected');

              store.addGem('thunder_gem', Infinity);
              store.addGem('thunder_gem', NaN);
              store.addGem('thunder_gem', -5);
              assertEqual(prof.bag.gems.thunder_gem, 0, 'Infinity/NaN/-5 addGem rejected');

              store.addRewards({
                potions: Infinity,
                greatBalls: -5,
                starBalls: NaN,
                starShards: Infinity,
                cheerCharges: NaN,
                gems: { sun_gem: Infinity, thunder_gem: -5 },
              });
              assertEqual(prof.bag.potions, 5, 'bad addRewards leaves potions unchanged');
              assertEqual(prof.bag.greatBalls, 3, 'bad addRewards leaves greatBalls unchanged');
              assertEqual(prof.bag.starBalls, 1, 'bad addRewards leaves starBalls unchanged');
              assertEqual(prof.bag.starShards, 0, 'bad addRewards leaves starShards 0');
              assertEqual(prof.bag.cheerCharges, 0, 'bad addRewards leaves cheerCharges 0');
              assertEqual(prof.bag.gems.sun_gem, 0, 'bad addRewards leaves sun_gem 0');

              const repaired = validateAndRepairProfile({
                trainerId: 'violet',
                cheerStepProgress: Infinity,
                bag: { potions: Infinity, greatBalls: -5, starBalls: NaN, starShards: Infinity, cheerCharges: Infinity, gems: { sun_gem: NaN } },
              }, 'violet');
              assertEqual(repaired.cheerStepProgress, 0, 'validateAndRepairProfile clamps cheerStepProgress Infinity -> 0');
              assertEqual(repaired.bag.starShards, 0, 'validateAndRepairProfile clamps starShards Infinity -> 0');
              assertEqual(repaired.bag.cheerCharges, 0, 'validateAndRepairProfile clamps cheerCharges Infinity -> 0');
              assertEqual(repaired.bag.potions, 0, 'validateAndRepairProfile clamps potions Infinity -> 0');

              // 2. upgradePokemon unowned & insufficient shards
              const unowned = createPokemon(4, 5);
              const unownedUp = store.upgradePokemon(unowned);
              assertEqual(unownedUp.upgraded, false, 'upgradePokemon rejects unowned Pokemon instance');
              assertEqual(unownedUp.reason, 'not_found', 'unowned upgrade reason === not_found');
              assertEqual(unowned.upgradeTier, 0, 'unowned Pokemon upgradeTier unchanged');

              const brokeUp = store.upgradePokemon(starter.uid);
              assertEqual(brokeUp.upgraded, false, 'upgradePokemon rejects 0 shards');
              assertEqual(brokeUp.reason, 'insufficient_shards', 'broke upgrade reason === insufficient_shards');

              // 3. evolvePokemon rejections (under-level, gemless, omitted itemKey, wrong gem)
              assertEqual(store.evolvePokemon(starter.uid, 2), null, 'rejects under-level Lv.5 Bulbasaur -> Ivysaur');
              const pika = createPokemon(25, 12);
              store.recordCaught(pika);
              assertEqual(store.evolvePokemon(pika.uid, 26, 'thunder_gem'), null, 'rejects gemless thunder_gem evo');
              assertEqual(store.evolvePokemon(pika.uid, 26), null, 'rejects item evo when itemKey omitted');
              store.addGem('sun_gem', 1);
              assertEqual(store.evolvePokemon(pika.uid, 26, 'sun_gem'), null, 'rejects wrong gem sun_gem for Pikachu');
              assertEqual(prof.bag.gems.sun_gem, 1, 'wrong gem not consumed');

              // 4. healPokemonWithPotion & useItem allowlist
              const fullHealRes = store.healPokemonWithPotion(starter.uid);
              assertEqual(fullHealRes.healed, false, 'healPokemonWithPotion rejects full HP');
              assertEqual(fullHealRes.reason, 'full_hp', 'reason === full_hp');
              assertEqual(prof.bag.potions, 5, 'full_hp does not consume potion');

              starter.hp = 5;
              prof.bag.potions = 0;
              const emptyHealRes = store.healPokemonWithPotion(starter.uid);
              assertEqual(emptyHealRes.healed, false, 'healPokemonWithPotion rejects 0 potions');
              assertEqual(emptyHealRes.reason, 'insufficient_potions', 'reason === insufficient_potions');

              prof.bag.potions = 2;
              const okHealRes = store.healPokemonWithPotion(starter.uid);
              assertEqual(okHealRes.healed, true, 'healPokemonWithPotion succeeds with damaged mon & 2 potions');
              assertEqual(okHealRes.remainingPotions, 1, 'potion decremented 2 -> 1');
              assertGreater(starter.hp, 5, 'HP restored');

              assertEqual(store.useItem('starShards'), false, 'useItem rejects starShards');
              assertEqual(store.useItem('__proto__'), false, 'useItem rejects __proto__');

              // 5. Sky-Hop < 80 vs 80 vs 180+ (Wave 2+) & Game Over UI message
              store.unlockArcade();
              mg = new StarlightMinigame({ storage: store, audio: noopAudio });
              for (const low of [0, 79, -5, NaN, Infinity]) {
                const r = mg.computeRewards(low, 8);
                assertEqual(r.starShards, 0, `Sky-Hop computeRewards(${low}) starShards === 0`);
                assertEqual(r.potions, 0, `Sky-Hop computeRewards(${low}) potions === 0`);
                assertEqual(Boolean(r.cheerCharges), false, `Sky-Hop computeRewards(${low}) cheerCharges === 0`);
              }
              const r80 = mg.computeRewards(80, 1);
              assertEqual(r80.starShards, 1, 'Sky-Hop 80 pts awards 1 starShard');
              assertEqual(r80.potions, 1, 'Sky-Hop 80 pts awards 1 potion');
              assertEqual(Boolean(r80.cheerCharges), false, 'Sky-Hop 80 pts awards 0 cheerCharges');
              const r180 = mg.computeRewards(180, 2);
              assertEqual(r180.starShards, 2, 'Sky-Hop 180 pts (Wave 2) awards 2 starShards');
              assertEqual(r180.potions, 1, 'Sky-Hop 180 pts (Wave 2) awards 1 potion');
              assertEqual(r180.cheerCharges, 1, 'Sky-Hop 180 pts (Wave 2) awards +1 cheerCharge');

              prof.bag.starShards = 0;
              prof.bag.cheerCharges = 0;
              mg.open();
              mg.score = 75;
              mg.wave = 1;
              mg.endRun();
              assertEqual(prof.bag.starShards, 0, 'Sky-Hop 75 pts awards 0 starShards');
              assertEqual(prof.bag.cheerCharges, 0, 'Sky-Hop 75 pts awards 0 cheerCharges');
              assert(
                (document.getElementById('minigame-results-card')?.textContent || '').includes('Score 80+ pts to win Star Shards & prizes!'),
                'Sky-Hop <80 Game Over shows retry tip',
              );
              mg.close();
              mg.destroy();
              mg = null;

              // 6. Battle anti-bypass (0 potions / full HP / 0 balls / Run & Faint award 0 Shards & 0 Cheers)
              prof.bag.potions = 0;
              prof.bag.greatBalls = 0;
              prof.bag.starBalls = 0;
              prof.bag.starShards = 0;
              prof.bag.cheerCharges = 0;
              starter.healFull();

              engine = new BattleEngine({
                storage: store,
                audio: noopAudio,
                onBattleEnd() {},
                onBadgesUnlocked() {},
                onHudRefresh() {},
              });
              const wildRun = createPokemon(16, 4, 'forest');
              const startRunP = engine.start({ enemy: wildRun, biomeId: 'forest' });
              let timer = setInterval(() => engine.finishTypewriter(), 10);
              try {
                await startRunP;
                await engine.handleUsePotion();
                await engine.handleThrowBall('great');
                await engine.handleThrowBall('star');
                assertEqual(engine.active, true, '0-potion & 0-ball bypass attempts leave turn unspent');
                Math.random = () => 0.0;
                await engine.handleRun();
              } finally {
                clearInterval(timer);
                Math.random = origRand;
              }
              assertEqual(prof.bag.starShards, 0, 'escaping awards 0 starShards');
              assertEqual(prof.bag.cheerCharges, 0, 'escaping awards 0 cheerCharges');

              const wildFaint = createPokemon(16, 4, 'forest');
              const startFaintP = engine.start({ enemy: wildFaint, biomeId: 'forest' });
              timer = setInterval(() => engine.finishTypewriter(), 10);
              try {
                await startFaintP;
                starter.hp = 0;
                await engine.handlePlayerFainted(engine.sessionId);
              } finally {
                clearInterval(timer);
              }
              assertEqual(prof.bag.starShards, 0, 'fainting awards 0 starShards');
              assertEqual(prof.bag.cheerCharges, 0, 'fainting awards 0 cheerCharges');
              engine.destroy();
              engine = null;

              // 7. Team & Guide responsive check across all 6 viewports
              const iframe = document.createElement('iframe');
              iframe.src = './';
              iframe.title = 'Sprint 11 Economy Responsive Check';
              iframe.style.cssText = 'position:fixed;left:-12000px;top:0;width:390px;height:844px;border:0;opacity:0.01;pointer-events:none;';
              document.body.appendChild(iframe);
              let iframeApp = null;
              try {
                await new Promise((resolve, reject) => {
                  const t = setTimeout(() => reject(new Error('Sprint 11 iframe timeout')), 15000);
                  iframe.addEventListener('load', () => { clearTimeout(t); resolve(); }, { once: true });
                });
                const iWin = iframe.contentWindow;
                const iDoc = iframe.contentDocument;
                const dl = performance.now() + 5000;
                while (!iWin.__starlightApp && performance.now() < dl) {
                  await new Promise((r) => setTimeout(r, 25));
                }
                iframeApp = iWin.__starlightApp;
                iframeApp.audio?.setMuted?.(true);
                iWin.localStorage.removeItem(STORAGE_KEY);
                iframeApp.pokedex.storage.state = iframeApp.pokedex.storage.load();
                iframeApp.showBootScreen();
                iDoc.getElementById('trainer-card-violet').click();
                iDoc.querySelector('.starter-pick-btn').click();
                iframeApp.closeDialogue();

                for (const [label, w, h] of [
                  ['Android 390x844', 390, 844],
                  ['Android 412x915', 412, 915],
                  ['Short Landscape 667x375', 667, 375],
                  ['Tablet Portrait 768x1024', 768, 1024],
                  ['Tablet Landscape 1024x768', 1024, 768],
                  ['Chromebook 1280x720', 1280, 720],
                ]) {
                  iframe.style.width = `${w}px`;
                  iframe.style.height = `${h}px`;
                  iWin.dispatchEvent(new iWin.Event('resize'));
                  for (const tab of ['team', 'guide']) {
                    iframeApp.openPokedex(tab);
                    await new Promise((r) => iWin.requestAnimationFrame(() => iWin.requestAnimationFrame(r)));
                    const body = iDoc.getElementById('pokedex-body');
                    assert(
                      body.scrollWidth <= body.clientWidth + 2,
                      `${label} (${tab}): #pokedex-body overflow (${body.scrollWidth} > ${body.clientWidth})`,
                    );
                    if (tab === 'guide') {
                      const econCard = iDoc.querySelector('.guide-economy-card');
                      assert(Boolean(econCard), `${label}: .guide-economy-card rendered`);
                      assert(
                        econCard.getBoundingClientRect().right <= body.getBoundingClientRect().right + 2,
                        `${label}: .guide-economy-card fits inside #pokedex-body`,
                      );
                    }
                    iframeApp.pokedex.close();
                  }
                }
              } finally {
                if (iframeApp) {
                  try {
                    iframeApp.overworld?.setActive?.(false);
                    await iframeApp.audio?.destroy?.();
                  } catch {
                    // Ignore teardown
                  }
                }
                iframe.remove();
              }
            } finally {
              Math.random = origRand;
              engine?.destroy();
              mg?.destroy();
              window.localStorage.removeItem(TEST_KEY);
              if (prevRawSave === null) window.localStorage.removeItem(STORAGE_KEY);
              else window.localStorage.setItem(STORAGE_KEY, prevRawSave);
              storage.state = storage.load();
              app.applyTrainerTheme(storage.getActiveTrainerId() || 'violet');
              app.refreshHud();
              app.syncControlVisibility();
              app.syncOverworldPause();
            }
          },
        },
      ],
    },
    {
      name: '46. Sprint 12 Secret Sky-Hop Discovery, Limited Charges, Challenge & Economy Scaling',
      tests: [
        {
          name: 'Reset re-locks Sky-Hop, disguises Village wall, shows Guide/Signpost hints, and unlocks only after 3 attuned knocks',
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
              storage.chooseStarter(1);
              app.enterOverworld(false);
              app.closeDialogue();

              const prof = storage.getActiveProfile();
              assertEqual(storage.isArcadeUnlocked(prof), false, 'fresh profile starts with arcade locked');
              assertEqual(storage.isArcadeAttuned(prof), false, 'fresh profile starts unattuned');
              assertEqual(storage.getArcadeState(prof).charges, 0, 'locked profile has 0 charges');
              assertEqual(document.getElementById('hud-btn-arcade').hidden, true, '#hud-btn-arcade hidden on fresh profile');
              assertEqual(app.openMinigame(), false, 'openMinigame() blocked while locked');

              // Disguised wall & signpost clue
              const wallTarget = app.overworld.getInteractiveAtTile(SECRET_ARCADE_SPOT.x, SECRET_ARCADE_SPOT.y);
              assertEqual(wallTarget?.type, 'arcade', 'secret wall keeps arcade interact type');
              assertEqual(wallTarget?.unlocked, false, 'secret wall target marked unlocked === false');
              assertEqual(wallTarget?.label, '🔍 Mysterious Wall', 'locked secret wall disguised as Mysterious Wall');
              assert(
                SIGNPOSTS['10,14'].includes('cottage wall') && SIGNPOSTS['10,14'].includes('5 Pokémon'),
                'Village signpost hints at hidden cottage wall',
              );

              // Guide tab shows mystery rumor while unattuned
              app.openPokedex('guide');
              const rumorText = document.querySelector('#pokedex-body .guide-arcade-card')?.textContent || '';
              assert(rumorText.includes('Secret Starlight Rumor') && rumorText.includes('1/5'), 'Guide tab shows mystery rumor before attunement');
              assertEqual(document.getElementById('guide-arcade-play-btn'), null, 'Guide tab hides play button while locked');
              app.pokedex.close();

              // Unattuned inspect gives rune hint without counting knocks
              app.handleWorldInteract(wallTarget);
              assertEqual(app.dialogueOpen, true, 'unattuned wall interact opens hint dialogue');
              assert(app.worldDialogueTextEl.textContent.includes('1 Island Badge'), 'unattuned dialogue hints at 1 Badge / 5 species');
              assertEqual(prof.arcade.secretKnocks, 0, 'unattuned inspect does not increment secretKnocks');
              app.closeDialogue();

              // Attune by catching 5 unique species -> still hidden & locked until 3 knocks!
              for (const id of [10, 16, 19, 25]) {
                storage.recordCaught(createPokemon(id, 5));
              }
              app.refreshHud();
              assertEqual(storage.isArcadeAttuned(prof), true, '5 species caught attunes Starlight');
              assertEqual(storage.isArcadeUnlocked(prof), false, '5 species caught does NOT auto-unlock arcade');
              assertEqual(document.getElementById('hud-btn-arcade').hidden, true, '#hud-btn-arcade stays hidden after attunement until discovered');

              app.openPokedex('guide');
              const attunedGuideText = document.querySelector('#pokedex-body .guide-arcade-card')?.textContent || '';
              assert(attunedGuideText.includes('Starlight Attuned') && attunedGuideText.includes('0/3'), 'Guide tab updates to attuned knock hint');
              app.pokedex.close();

              // Knock 1 & 2 stay locked, Knock 3 unlocks with 3 charges
              app.handleWorldInteract(app.overworld.getInteractiveAtTile(SECRET_ARCADE_SPOT.x, SECRET_ARCADE_SPOT.y));
              assertEqual(prof.arcade.secretKnocks, 1, 'attuned knock 1 recorded');
              app.closeDialogue();
              app.handleWorldInteract(app.overworld.getInteractiveAtTile(SECRET_ARCADE_SPOT.x, SECRET_ARCADE_SPOT.y));
              assertEqual(prof.arcade.secretKnocks, 2, 'attuned knock 2 recorded');
              app.closeDialogue();
              app.handleWorldInteract(app.overworld.getInteractiveAtTile(SECRET_ARCADE_SPOT.x, SECRET_ARCADE_SPOT.y));
              assertEqual(storage.isArcadeUnlocked(prof), true, 'attuned knock 3 unlocks arcade');
              assertEqual(app.minigame.isOpen(), true, 'knock 3 opens Sky-Hop');
              assertEqual(prof.arcade.charges, 2, 'opening on knock 3 starts first flight (3 -> 2)');
              assertEqual(document.getElementById('hud-btn-arcade').hidden, false, '#hud-btn-arcade shown after unlock');
              assertEqual(document.getElementById('hud-btn-arcade').dataset.charges, '2', '#hud-btn-arcade shows remaining charge badge');
              assertEqual(
                app.overworld.getInteractiveAtTile(SECRET_ARCADE_SPOT.x, SECRET_ARCADE_SPOT.y)?.label,
                '🕹️ Starlight Sky-Hop Cabinet',
                'overworld interact label switches to Cabinet once unlocked',
              );
              app.minigame.close();

              // Reset trainer & reset all re-hide and re-lock everything
              storage.resetTrainerProgress('violet');
              app.showBootScreen();
              assertEqual(document.getElementById('hud-btn-arcade').hidden, true, 'reset + showBootScreen hides #hud-btn-arcade');
              const resetViolet = storage.getProfile('violet');
              assertEqual(resetViolet.arcade.unlocked, false, 'resetTrainerProgress clears arcade.unlocked');
              assertEqual(resetViolet.arcade.charges, 0, 'resetTrainerProgress clears arcade.charges');
              assertEqual(resetViolet.arcade.secretKnocks, 0, 'resetTrainerProgress clears secretKnocks');

              storage.selectTrainer('ozias');
              storage.chooseStarter(4);
              storage.unlockArcade();
              storage.resetAllProgress();
              assertEqual(storage.getProfile('ozias').arcade.unlocked, false, 'resetAllProgress clears arcade.unlocked');
              assertEqual(storage.getProfile('ozias').arcade.charges, 0, 'resetAllProgress clears arcade.charges');
            } finally {
              app.minigame?.close?.();
              app.pokedex?.close?.();
              app.closeDialogue?.();
              app.clearCelebration?.();
              if (prevRawSave === null) window.localStorage.removeItem(STORAGE_KEY);
              else window.localStorage.setItem(STORAGE_KEY, prevRawSave);
              storage.state = storage.load();
              app.applyTrainerTheme(storage.getActiveTrainerId() || 'violet');
              app.bootScreenEl.hidden = wasBootHidden;
              app.starterScreenEl.hidden = wasStarterHidden;
              app.gameShellEl.hidden = wasShellHidden;
              app.overworld.setActive(wasOverworldActive);
              if (!wasOverworldActive) app.audio?.stopBGM?.();
              if (!wasBootHidden) app.showBootScreen();
              else app.refreshHud();
            }
          },
        },
        {
          name: 'Arcade charge depletion, 50-step/2-battle/Shrine/Rival recharge, catch no-double-count & 5-Shard buy-in sink',
          async fn() {
            const TEST_KEY = 'starlight_pokemon_test_s46_charges_v1';
            const noopAudio = {
              muted: true,
              unlock() {},
              playMenuBlip() {},
              playBattleStart() {},
              playAttackHit() {},
              playHealChime() {},
              playBallThrow() {},
              playBallWobble() {},
              playCatchSuccess() {},
              playVictoryFanfare() {},
              playBuddyCheer() {},
              playBuddyEndure() {},
              playBadgeFanfare() {},
              playRunEscape() {},
              playPokemonCry() {},
              playArcadeUnlockFanfare() {},
              playArcadeStar() {},
              playArcadeBoost() {},
              playArcadeBump() {},
              playBGM() {},
              stopBGM() {},
            };
            const origRand = Math.random;
            let engine = null;
            let mg = null;

            try {
              window.localStorage.removeItem(TEST_KEY);
              const store = new StorageManager(TEST_KEY);
              store.updateSettings({ battlePace: 'fast' });
              store.selectTrainer('violet');
              store.chooseStarter(1);
              store.unlockArcade();
              const prof = store.getActiveProfile();

              assertEqual(MAX_ARCADE_CHARGES, 3, 'MAX_ARCADE_CHARGES === 3');
              assertEqual(STEPS_PER_ARCADE_CHARGE, 50, 'STEPS_PER_ARCADE_CHARGE === 50');
              assertEqual(BATTLES_PER_ARCADE_CHARGE, 2, 'BATTLES_PER_ARCADE_CHARGE === 2');
              assertEqual(ARCADE_SHARD_BUYIN_COST, 5, 'ARCADE_SHARD_BUYIN_COST === 5');

              mg = new StarlightMinigame({ storage: store, audio: noopAudio });
              // Spend all 3 charges
              mg.open();
              assertEqual(prof.arcade.charges, 2, 'Run 1 consumes charge 3 -> 2');
              mg.endRun();
              assertEqual(mg.startNewRun(), true, 'Run 2 starts');
              assertEqual(prof.arcade.charges, 1, 'Run 2 consumes charge 2 -> 1');
              mg.endRun();
              assertEqual(mg.startNewRun(), true, 'Run 3 starts');
              assertEqual(prof.arcade.charges, 0, 'Run 3 consumes charge 1 -> 0');
              mg.endRun();

              // 0-charge enforcement on replay button, startNewRun & Space key
              assertEqual(document.getElementById('minigame-replay-btn').disabled, true, '#minigame-replay-btn disabled at 0 charges');
              assertEqual(document.getElementById('minigame-shard-buy-btn')?.disabled, true, '#minigame-shard-buy-btn disabled with 0 Star Shards');
              assertEqual(mg.startNewRun(), false, 'startNewRun() blocked at 0 charges');
              assertEqual(mg.outOfCharges, true, 'outOfCharges standby state active');
              window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true }));
              assertEqual(mg.outOfCharges, true, 'Space key blocked at 0 charges');
              mg.close();

              // 50-step recharge (+1)
              for (let s = 1; s < STEPS_PER_ARCADE_CHARGE; s++) {
                const res = store.updatePosition(8, 15, 'down', true);
                assertEqual(res.stepArcadeChargeEarned, false, `step ${s}/50 does not award charge`);
              }
              const step50 = store.updatePosition(8, 15, 'down', true);
              assertEqual(step50.stepArcadeChargeEarned, true, 'step 50/50 awards +1 arcade charge');
              assertEqual(prof.arcade.charges, 1, 'charges 0 -> 1 after 50 steps');

              // 2-battle recharge (+1) & wild catch no double-count
              store.recordBattleWin();
              assertEqual(prof.arcade.battleProgress, 1, '1st battle win sets battleProgress === 1');
              assertEqual(prof.arcade.charges, 1, '1st battle win keeps charges === 1');
              store.recordBattleWin();
              assertEqual(prof.arcade.battleProgress, 0, '2nd battle win resets battleProgress === 0');
              assertEqual(prof.arcade.charges, 2, '2nd battle win awards +1 charge (1 -> 2)');

              // Wild catch calls recordCaught + recordBattleWin -> strictly +1 battleProgress total
              engine = new BattleEngine({
                storage: store,
                audio: noopAudio,
                onBattleEnd() {},
                onBadgesUnlocked() {},
                onHudRefresh() {},
              });
              const wildEnemy = createPokemon(16, 4, 'forest');
              wildEnemy.hp = 1;
              const catchStartP = engine.start({ enemy: wildEnemy, biomeId: 'forest' });
              const timer = setInterval(() => engine.finishTypewriter(), 10);
              try {
                await catchStartP;
                Math.random = () => 0.0;
                await engine.handleThrowBall('pokeball');
              } finally {
                clearInterval(timer);
                Math.random = origRand;
              }
              assertEqual(prof.arcade.battleProgress, 1, 'wild catch increments battleProgress strictly by +1 (no double-count)');
              engine.destroy();
              engine = null;

              // Shrine clear, Shrine Trial, Rival win (+1 each, capped at 3)
              prof.arcade.charges = 0;
              store.markShrineCleared('forest_shrine');
              assertEqual(prof.arcade.charges, 1, 'first Shrine clear awards +1 charge');
              store.markShrineCleared('forest_shrine');
              assertEqual(prof.arcade.charges, 1, 'repeat markShrineCleared does not double-award');
              store.recordShrineTrialWin('forest_shrine');
              assertEqual(prof.arcade.charges, 2, 'Shrine Trial win awards +1 charge');
              store.markRivalDefeated('rival_leo');
              assertEqual(prof.arcade.charges, 3, 'Rival win awards +1 charge');
              store.markRivalDefeated('rival_leo');
              assertEqual(prof.arcade.charges, 3, 'charges capped at MAX_ARCADE_CHARGES = 3');
              assertEqual(prof.arcade.stepProgress, 0, 'stepProgress reset at max charges');
              assertEqual(prof.arcade.battleProgress, 0, 'battleProgress reset at max charges');

              // Shard buy-in sink (cost 5 > max reward 4 -> net <= -1)
              const fullBuy = store.buyArcadeChargeWithShards();
              assertEqual(fullBuy.purchased, false, 'buy-in rejected when charges full');
              assertEqual(fullBuy.reason, 'full_charges', 'reason === full_charges');

              prof.arcade.charges = 0;
              prof.bag.starShards = 4;
              const poorBuy = store.buyArcadeChargeWithShards();
              assertEqual(poorBuy.purchased, false, 'buy-in rejected with 4 shards');
              assertEqual(poorBuy.reason, 'insufficient_shards', 'reason === insufficient_shards');

              prof.bag.starShards = 5;
              const okBuy = store.buyArcadeChargeWithShards();
              assertEqual(okBuy.purchased, true, 'buy-in succeeds with 5 shards & 0 charges');
              assertEqual(okBuy.remainingShards, 0, '5 shards deducted cleanly');
              assertEqual(prof.arcade.charges, 1, 'buy-in grants +1 charge');

              mg.open();
              mg.score = 1200;
              mg.wave = 10;
              const maxRun = mg.endRun();
              assertEqual(maxRun.rewards.starShards, MAX_ARCADE_SHARDS, 'max shard reward strictly capped at 4');
              assert(prof.bag.starShards < 5, `Shard buy-in is always a net sink (4 < 5, got ${prof.bag.starShards})`);
              mg.close();
            } finally {
              Math.random = origRand;
              engine?.destroy();
              mg?.destroy();
              window.localStorage.removeItem(TEST_KEY);
            }
          },
        },
        {
          name: 'Sky-Hop harder mechanics (paused Dash cooldown, Void Meteor shatter, combo decay, crosswind) & 6-tier badge-gated rewards',
          fn() {
            const TEST_KEY = 'starlight_pokemon_test_s46_challenge_v1';
            const noopAudio = {
              muted: true,
              unlock() {},
              playMenuBlip() {},
              playHealChime() {},
              playPokemonCry() {},
              playArcadeUnlockFanfare() {},
              playArcadeStar() {},
              playArcadeBoost() {},
              playArcadeBump() {},
              playBGM() {},
            };
            let mg = null;

            try {
              window.localStorage.removeItem(TEST_KEY);
              const store = new StorageManager(TEST_KEY);
              store.selectTrainer('violet');
              store.chooseStarter(1);
              store.unlockArcade();
              const prof = store.getActiveProfile();

              mg = new StarlightMinigame({ storage: store, audio: noopAudio });
              mg.open();

              // 1. Dash cooldown does not tick while Dash is active
              assertEqual(mg.activateDash(), true, 'activateDash() succeeds');
              const initialCd = mg.dashCooldown;
              assertEqual(initialCd, 4.6, 'dashCooldown starts at 4.6s');
              mg.update(0.5);
              assertGreater(mg.dashTimer, 0, 'dashTimer still active after 0.5s');
              assertEqual(mg.dashCooldown, initialCd, 'dashCooldown paused while dashTimer > 0');

              // 2. Void Meteor shatters active Dash without losing a heart, then damages without Dash
              mg.comboStreak = 10;
              mg.combo = 3;
              mg.entities = [{
                kind: 'void_meteor',
                x: 132,
                y: mg.playerY,
                baseY: mg.playerY,
                vy: 0,
                radius: 21,
                speed: 100,
                age: 0,
                bobAmp: 0,
                bobFreq: 0,
              }];
              mg.update(0.016);
              assertEqual(mg.dashTimer, 0, 'Void Meteor shatters active Dash');
              assertEqual(mg.combo, 1, 'Void Meteor Dash shatter resets combo');
              assertEqual(mg.hearts, 3, 'Void Meteor Dash shatter protects heart shield');

              mg.hitInvulnTimer = 0;
              mg.entities = [{
                kind: 'void_meteor',
                x: 132,
                y: mg.playerY,
                baseY: mg.playerY,
                vy: 0,
                radius: 21,
                speed: 100,
                age: 0,
                bobAmp: 0,
                bobFreq: 0,
              }];
              mg.update(0.016);
              assertEqual(mg.hearts, 2, 'Void Meteor deals 1 heart damage without Dash');

              // 3. Missed star decays comboStreak by 4
              mg.comboStreak = 10;
              mg.combo = 3;
              mg.entities = [{
                kind: 'star',
                x: -40,
                y: 200,
                baseY: 200,
                vy: 0,
                radius: 15,
                speed: 300,
                age: 0,
                bobAmp: 0,
                bobFreq: 0,
              }];
              mg.update(0.016);
              assertEqual(mg.comboStreak, 6, 'missing a star decays comboStreak by 4 (10 -> 6)');
              assertEqual(mg.combo, 2, 'combo updates cleanly with decayed streak');

              // 4. Wave escalation: Wave 2 storm_orb, Wave 3 void_meteor, Wave 4 storm gate, Wave 5 heart + crosswind
              mg._beginWave(2);
              assert(mg.pendingSpawns.some((s) => s.kind === 'storm_orb'), 'Wave 2 spawns storm_orb');
              mg._beginWave(3);
              assert(mg.pendingSpawns.some((s) => s.kind === 'void_meteor'), 'Wave 3 spawns void_meteor');
              assertEqual(mg.pendingSpawns.some((s) => s.kind === 'heart'), false, 'Wave 3 no longer spawns free hearts');
              mg._beginWave(4);
              assert(mg.pendingSpawns.filter((s) => s.kind === 'cloud').length >= 3, 'Wave 4 adds Twin Storm Gate clouds');
              mg._beginWave(5);
              assert(mg.pendingSpawns.some((s) => s.kind === 'heart'), 'Wave 5 spawns scarce heart when hurt');
              mg.waveElapsed = 0.7;
              mg.update(0.02);
              assert(Math.abs(mg.windVy) > 0, 'Wave 5+ applies sky crosswind');

              // 5. 6-tier computeRewards, badge-gated gem pool & gemCooldown
              const t0 = mg.computeRewards(79, 8);
              assertEqual(t0.starShards, 0, 'Tier 0 (<80) yields 0 shards');
              const t1 = mg.computeRewards(80, 1);
              assertEqual(t1.starShards, 1, 'Tier 1 (80, W1): 1 shard');
              assertEqual(t1.potions, 1, 'Tier 1 (80, W1): 1 potion');
              const t2 = mg.computeRewards(180, 2);
              assertEqual(t2.starShards, 2, 'Tier 2 (180, W2): 2 shards');
              assertEqual(t2.cheerCharges, 1, 'Tier 2 (180, W2): 1 cheer');
              const t3 = mg.computeRewards(300, 3);
              assertEqual(t3.greatBalls, 1, 'Tier 3 (300, W3): 1 greatBall');
              const t4 = mg.computeRewards(450, 5);
              assertEqual(t4.starShards, 3, 'Tier 4 (450, W5): 3 shards');
              assertEqual(t4.potions, 2, 'Tier 4 (450, W5): 2 potions');
              const t5 = mg.computeRewards(650, 6);
              assertEqual(t5.starShards, 4, 'Tier 5 (650, W6): 4 shards');
              assertEqual(t5.greatBalls, 2, 'Tier 5 (650, W6): 2 greatBalls');
              assertEqual(t5.starBalls, 1, 'Tier 5 (650, W6): 1 starBall');

              // Badge-gated gem pools
              prof.badges = [];
              const pool0 = getUnlockedArcadeGemPool(prof);
              assertEqual(pool0.includes('tera_gem'), false, '0-badge pool excludes endgame tera_gem');
              assert(pool0.includes('fire_gem') && pool0.includes('moon_gem'), '0-badge pool includes early gems');

              prof.badges = ['meadow', 'flame', 'cascade'];
              const pool3 = getUnlockedArcadeGemPool(prof);
              assert(pool3.includes('ice_gem') && pool3.includes('astral_gem'), '3-badge pool unlocks mid-game gems');
              assertEqual(pool3.includes('tera_gem'), false, '3-badge pool still excludes endgame tera_gem');

              prof.badges = ['meadow', 'flame', 'cascade', 'thunder', 'boulder', 'magma', 'aurora', 'starlight'];
              const pool8 = getUnlockedArcadeGemPool(prof);
              assert(pool8.includes('tera_gem') && pool8.includes('crown_gem'), '8-badge pool unlocks endgame gems');

              // Tier 6 gem drop & cooldown enforcement
              prof.arcade.gemCooldown = 0;
              mg.score = 900;
              mg.wave = 8;
              const tier6GemRun = mg.endRun();
              const droppedGems = Object.values(tier6GemRun.rewards.gems || {}).reduce((s, n) => s + n, 0);
              assertEqual(droppedGems, 1, 'Tier 6 (900, W8) drops 1 badge-gated gem when off cooldown');
              assertEqual(prof.arcade.gemCooldown, ARCADE_GEM_COOLDOWN_RUNS, 'gem drop sets gemCooldown === 2');

              // Next run on cooldown awards bonus Star Ball instead of a 2nd gem
              assertEqual(mg.startNewRun(), true, 'next run starts');
              mg.score = 950;
              mg.wave = 8;
              const cooldownRun = mg.endRun();
              assertEqual(Boolean(cooldownRun.rewards.gems), false, 'Tier 6 on cooldown drops 0 gems');
              assertEqual(cooldownRun.rewards.starBalls, 2, 'Tier 6 on cooldown awards +1 bonus Star Ball (total 2)');
              assertEqual(prof.arcade.gemCooldown, 1, 'non-gem run decrements gemCooldown (2 -> 1)');

              mg.close();
            } finally {
              mg?.destroy();
              window.localStorage.removeItem(TEST_KEY);
            }
          },
        },
      ],
    },
    {
      name: '47. Sprint 14 Player-Level Progression, Anti-Spike Scaling, Safe-Zone Recall & 2-Button Warp Dock',
      tests: [
        {
          name: 'Player Level & Trainer XP progression, Lv.40+ party/box immunity & lossless starlight_pokemon_save_v1 Violet & Ozias migration',
          fn() {
            const TEST_KEY = 'starlight_pokemon_test_s47_prog_migration_v1';

            // 1. Single-source XP weights, curve & parity between world-data (config.js) and pokemon.js
            const expectedWeights = {
              battleWin: 14,
              badge: 60,
              shrine: 85,
              rival: 50,
              rivalRematch: 30,
              shrineTrial: 40,
              quest: 45,
              speciesCaught: 4,
            };
            for (const [k, val] of Object.entries(expectedWeights)) {
              assertEqual(TRAINER_XP_WEIGHTS[k], val, `TRAINER_XP_WEIGHTS.${k} (config)`);
              assertEqual(POKEMON_TRAINER_XP_WEIGHTS[k], val, `TRAINER_XP_WEIGHTS.${k} (pokemon)`);
            }

            assertEqual(getPlayerLevelXpRequired(1), 30, 'Lv.1->2 requires 30 XP');
            assertEqual(getPlayerLevelXpRequired(2), 40, 'Lv.2->3 requires 40 XP');
            assertEqual(getPlayerLevelXpRequired(49), 510, 'Lv.49->50 requires 510 XP');
            assertEqual(getPlayerLevelXpRequired(50), 0, 'Lv.50 requires 0 XP (cap)');
            assertEqual(getPlayerLevelXpRequired(99), 0, 'Lv.99 requires 0 XP (cap)');
            assertEqual(getPlayerLevelXpRequired(NaN), 30, 'invalid level defaults to 30 XP');
            assertEqual(getPokemonPlayerLevelXpRequired(3), 50, 'pokemon getPlayerLevelXpRequired matches');

            assertEqual(getCumulativeXpForPlayerLevel(1), 0, 'Lv.1 cumulative XP === 0');
            assertEqual(getCumulativeXpForPlayerLevel(2), 30, 'Lv.2 cumulative XP === 30');
            assertEqual(getCumulativeXpForPlayerLevel(3), 70, 'Lv.3 cumulative XP === 70');
            assertEqual(getCumulativeXpForPlayerLevel(50), 13230, 'Lv.50 cumulative XP === 13230');
            assertEqual(getCumulativeXpForPlayerLevel(-Infinity), 0, '-Infinity cumulative XP === 0');
            assertEqual(getCumulativeXpForPlayerLevel(Infinity), 13230, 'Infinity cumulative XP === 13230');
            assertEqual(getPokemonCumulativeXpForPlayerLevel(50), 13230, 'pokemon cumulative XP matches');

            const xp0 = getPlayerLevelFromXp(0);
            assertEqual(xp0.level, 1, '0 XP -> Lv.1');
            assertEqual(xp0.xpIntoLevel, 0, '0 XP -> 0 xpIntoLevel');
            assertEqual(xp0.xpToNext, 30, '0 XP -> 30 xpToNext');
            assertEqual(xp0.isMaxLevel, false, '0 XP -> not max');

            const xp29 = getPlayerLevelFromXp(29);
            assertEqual(xp29.level, 1, '29 XP stays Lv.1');
            assertEqual(xp29.xpIntoLevel, 29, '29 XP -> 29 xpIntoLevel');

            const xp30 = getPlayerLevelFromXp(30);
            assertEqual(xp30.level, 2, '30 XP advances to Lv.2');
            assertEqual(xp30.xpIntoLevel, 0, '30 XP -> 0 xpIntoLevel');
            assertEqual(xp30.xpToNext, 40, 'Lv.2 -> 40 xpToNext');

            const xpMax = getPlayerLevelFromXp(Infinity);
            assertEqual(xpMax.level, 50, 'Infinity XP -> Lv.50');
            assertEqual(xpMax.isMaxLevel, true, 'Lv.50 isMaxLevel === true');
            assertEqual(xpMax.xpToNext, 0, 'Lv.50 xpToNext === 0');
            assertEqual(xpMax.progressPct, 100, 'Lv.50 progressPct === 100');
            assertEqual(getPokemonPlayerLevelFromXp(70).level, 3, 'pokemon getPlayerLevelFromXp matches');

            // 2. Scalar, string & invalid inputs on getPlayerProgression / getPlayerLevel
            assertEqual(getPlayerLevel(-Infinity), 1, '-Infinity -> Lv.1');
            assertEqual(getPlayerLevel(Infinity), 50, 'Infinity -> Lv.50');
            assertEqual(getPlayerLevel(NaN), 1, 'NaN -> Lv.1');
            assertEqual(getPlayerLevel(null), 1, 'null -> Lv.1');
            assertEqual(getPlayerLevel(undefined), 1, 'undefined -> Lv.1');
            assertEqual(getPlayerLevel(true), 1, 'boolean -> Lv.1');
            assertEqual(getPlayerLevel([]), 1, 'array -> Lv.1');
            assertEqual(getPlayerLevel(''), 1, 'empty string -> Lv.1');
            assertEqual(getPlayerLevel(' 12 '), 12, 'trimmed numeric string -> Lv.12');
            assertEqual(getPlayerLevel(0), 1, '0 clamps to Lv.1');
            assertEqual(getPlayerLevel(99), 50, '99 clamps to Lv.50');
            assertEqual(getPokemonPlayerLevel(' 15 '), 15, 'pokemon getPlayerLevel matches');
            assertEqual(getPokemonPlayerProgression(10).xp, getPlayerProgression(10).xp, 'progression parity across modules');

            // 3. computeMilestoneTrainerXp exact formula & total immunity to Lv.40+ team/box levels
            const milestoneProfile = {
              stats: { battlesWon: 3 }, // 3*14 = 42
              badges: ['meadow', 'meadow', 'flame'], // 2 unique * 60 = 120
              shrinesCleared: ['forest_shrine', 'forest_shrine'], // 1 unique * 85 = 85
              rivalsDefeated: ['rival_leo', 'rival_leo'], // 1 unique * 50 = 50
              rivalRematchCounts: { rival_leo: 2, invalid: -5, bad: NaN }, // 2*30 = 60
              shrineTrialCounts: { forest_shrine: 1, bad: true }, // 1*40 = 40
              questsCompleted: ['quest_forest_friends'], // 1*45 = 45
              pokedex: { caught: { 1: 1, 16: true, 25: 0, 150: 2 } }, // 3 unique caught -> (3-1)*4 = 8
              team: [{ speciesId: 150, level: 50, hp: 180 }, { speciesId: 384, level: 48, hp: 170 }],
              box: [{ speciesId: 493, level: 50, hp: 200 }, { speciesId: 1024, level: 45, hp: 160 }],
            };
            const expectedMilestoneXp = 42 + 120 + 85 + 50 + 60 + 40 + 45 + 8; // 450 XP
            assertEqual(computeMilestoneTrainerXp(milestoneProfile), expectedMilestoneXp, 'computeMilestoneTrainerXp sums all 8 weights & ignores Lv.45-50 team/box');
            assertEqual(computePokemonMilestoneTrainerXp(milestoneProfile), expectedMilestoneXp, 'pokemon computeMilestoneTrainerXp matches');

            const caughtArrayProfile = {
              pokedex: { caught: [1, 16, '16', 25] },
              team: [{ speciesId: 493, level: 50 }],
              box: [{ speciesId: 150, level: 49 }],
            };
            assertEqual(computeMilestoneTrainerXp(caughtArrayProfile), 8, 'array pokedex.caught deduplicates & ignores starter + Lv.49-50 mons');

            // Explicit floor only applies when persisted trainerXp is 0, else max(persistedXp, milestoneXp)
            assertEqual(getPlayerLevel({ trainerXp: 0, playerLevel: 9 }), 9, 'explicit playerLevel floor honored when trainerXp === 0');
            assertEqual(getPlayerLevel({ trainerXp: 100, playerLevel: 25 }), 3, 'non-zero trainerXp + milestone dominates arbitrary playerLevel');
            assertEqual(getPlayerLevel({ trainerXp: 20, stats: { battlesWon: 5 } }), 3, 'higher milestoneXp overrides lower persisted trainerXp');

            try {
              window.localStorage.removeItem(TEST_KEY);

              // 4. Catching/holding Lv.40+ Pokemon in party & box never inflates Player Level or farming zone
              const store = new StorageManager(TEST_KEY);
              store.selectTrainer('violet');
              store.chooseStarter(1); // Bulbasaur Lv.5
              assertEqual(store.getPlayerLevel(), 1, 'fresh starter Violet starts at Player Lv.1');
              assertEqual(store.getActiveProfile().trainerXp, 0, 'fresh starter Violet starts at 0 trainerXp');

              const lv45Mewtwo = createPokemon(150, 45, 'rift');
              const lv48Rayquaza = createPokemon(384, 48, 'sanctum');
              const lv50Arceus = createPokemon(493, 50, 'rift');
              store.recordCaught(lv45Mewtwo);
              store.recordCaught(lv48Rayquaza);
              const activeProf = store.getActiveProfile();
              assertEqual(activeProf.badges.length, 0, 'catching Lv.45 Mewtwo + Lv.48 Rayquaza unlocks 0 badges');
              assertEqual(activeProf.trainerXp, 2 * 4, 'catching Lv.45 + Lv.48 grants only 8 speciesCaught XP');
              assertEqual(store.getPlayerLevel(), 1, 'holding Lv.45 & Lv.48 mons in party keeps Player Lv.1');

              for (const id of [10, 16, 19, 25]) {
                store.recordCaught(createPokemon(id, 4));
              }
              store.recordCaught(lv50Arceus); // goes to box (party of 6 full)
              assert(activeProf.team.some((m) => m.level >= 45), 'Lv.45+ mons held in party');
              assert(activeProf.box.some((m) => m.level >= 50), 'Lv.50 mon held in box');
              const expectedAfter7Catches = 7 * 4 + activeProf.badges.length * 60; // 28 + 2*60 = 148
              assertEqual(activeProf.trainerXp, expectedAfter7Catches, 'catching 7 species grants 28 species XP + badge XP only (ignoring Lv.45-50 levels)');
              assertEqual(store.getPlayerLevel(), 4, '148 XP places trainer at Player Lv.4 despite Lv.45-50 party & box');
              const immuneZone = resolveRecommendedFarmingZone(activeProf);
              assertEqual(immuneZone.biomeId, 'forest', 'Lv.40+ mon holder still farms Whispering Forest at Player Lv.4');
              assertEqual(immuneZone.minLv, 2, 'Lv.40+ mon holder forest minLv stays 2');
              assertEqual(immuneZone.maxLv, 7, 'Lv.40+ mon holder forest maxLv stays 7');
              const immuneWild = rollWildPokemon('forest', activeProf, { forceElite: false });
              assertInRange(immuneWild.level, 2, 7, 'wild encounter stays Lv.2..7 despite Lv.45-50 party & box');

              // Earning real trainer milestones advances trainerXp & playerLevel
              store.recordBattleWin({ expEarned: 20 });
              assertEqual(activeProf.trainerXp, expectedAfter7Catches + 14, 'battleWin adds +14 XP');
              store.markShrineCleared('forest_shrine', 151);
              assert(activeProf.trainerXp >= expectedAfter7Catches + 14 + 85, 'shrine clear advances trainerXp');
              assertGreater(store.getPlayerLevel(), 4, 'shrine clear advances Player Level beyond Lv.4');

              // 5. Lossless starlight_pokemon_save_v1 migration for BOTH Violet & Ozias
              const v1LegacySave = {
                version: 1,
                activeTrainerId: 'violet',
                settings: { muted: true, crtEnabled: false, battlePace: 'fast' },
                profiles: {
                  violet: {
                    trainerId: 'violet',
                    starterId: 1,
                    pos: { x: 11, y: 15, dir: 'left' },
                    team: [
                      { speciesId: 1, level: 12, hp: 32, maxHp: 32, exp: 400 },
                      { speciesId: 150, level: 44, hp: 140, maxHp: 140 },
                    ],
                    box: [{ speciesId: 25, level: 42, hp: 98, maxHp: 98 }],
                    bag: { potions: 9, greatBalls: 4, starBalls: 2, starShards: 7, cheerCharges: 2, gems: { sun_gem: 1 } },
                    badges: ['meadow'],
                    shrinesCleared: ['forest_shrine'],
                    rivalsDefeated: ['rival_leo'],
                    questsCompleted: ['quest_forest_friends'],
                    stats: { battlesWon: 4, steps: 88 },
                    pokedex: { seen: [1, 25, 150], caught: { 1: 1, 25: 1, 150: 1 } },
                  },
                  ozias: {
                    trainerId: 'ozias',
                    starterId: 4,
                    pos: { x: 4, y: 5, dir: 'up' },
                    team: [{ speciesId: 4, level: 18, hp: 44, maxHp: 44 }],
                    box: [{ speciesId: 384, level: 46, hp: 165, maxHp: 165 }],
                    bag: { potions: 3, greatBalls: 5, starBalls: 2, starShards: 10, gems: { fire_gem: 2 } },
                    badges: ['meadow', 'flame'],
                    stats: { battlesWon: 2 },
                    pokedex: { seen: [4, 384], caught: { 4: 1, 384: 1 } },
                  },
                },
              };
              window.localStorage.setItem(TEST_KEY, JSON.stringify(v1LegacySave));
              const migrated = new StorageManager(TEST_KEY);
              const mViolet = migrated.getProfile('violet');
              const mOzias = migrated.getProfile('ozias');

              assertEqual(mViolet.team.length, 2, 'v1 Violet team count preserved');
              assertEqual(mViolet.team[0].level, 12, 'v1 Violet starter level preserved');
              assertEqual(mViolet.team[1].level, 44, 'v1 Violet Lv.44 party mon preserved losslessly');
              assertEqual(mViolet.box.length, 1, 'v1 Violet box count preserved');
              assertEqual(mViolet.box[0].level, 42, 'v1 Violet Lv.42 box mon preserved losslessly');
              assertEqual(mViolet.bag.potions, 9, 'v1 Violet potions preserved');
              assertEqual(mViolet.bag.starShards, 7, 'v1 Violet starShards preserved');
              assertEqual(mViolet.bag.gems.sun_gem, 1, 'v1 Violet gems preserved');
              assertEqual(mViolet.badges.length, 1, 'v1 Violet badges preserved');
              assertEqual(mViolet.pos.x, 11, 'v1 Violet walkable x preserved');
              assertEqual(mViolet.pos.y, 15, 'v1 Violet walkable y preserved');
              assertEqual(mViolet.pos.dir, 'left', 'v1 Violet dir preserved');
              // Violet milestone XP: 4*14 + 1*60 + 1*85 + 1*50 + 1*45 + (3-1)*4 = 56+60+85+50+45+8 = 304 -> Lv.7 (0+30+40+50+60+70=250, +80=330)
              assertEqual(mViolet.trainerXp, 304, 'v1 Violet trainerXp hydrated accurately without reading team/box levels');
              assertEqual(mViolet.playerLevel, 6, 'v1 Violet playerLevel hydrated accurately (304 XP -> Lv.6)');

              assertEqual(mOzias.team.length, 1, 'v1 Ozias team count preserved');
              assertEqual(mOzias.team[0].speciesId, 4, 'v1 Ozias starter speciesId preserved');
              assertEqual(mOzias.team[0].level, 18, 'v1 Ozias starter level preserved');
              assertEqual(mOzias.box.length, 1, 'v1 Ozias box count preserved');
              assertEqual(mOzias.box[0].level, 46, 'v1 Ozias Lv.46 box mon preserved losslessly');
              assertEqual(mOzias.bag.greatBalls, 5, 'v1 Ozias greatBalls preserved');
              assertEqual(mOzias.bag.gems.fire_gem, 2, 'v1 Ozias gems preserved');
              assertEqual(mOzias.badges.length, 2, 'v1 Ozias badges preserved');
              assertEqual(mOzias.pos.x, 4, 'v1 Ozias walkable x preserved');
              assertEqual(mOzias.pos.y, 5, 'v1 Ozias walkable y preserved');
              // Ozias milestone XP: 2*14 + 2*60 + (2-1)*4 = 28+120+4 = 152 -> Lv.4 (0+30+40+50=120, +60=180)
              assertEqual(mOzias.trainerXp, 152, 'v1 Ozias trainerXp hydrated accurately');
              assertEqual(mOzias.playerLevel, 4, 'v1 Ozias playerLevel hydrated accurately');

              const vSummary = migrated.getProfileSummary('violet');
              const oSummary = migrated.getProfileSummary('ozias');
              assertEqual(vSummary.playerLevel, 6, 'Violet getProfileSummary exposes playerLevel');
              assert(vSummary.label.startsWith('Trainer Lv.6 •'), `Violet summary label includes Trainer Lv.6 (got "${vSummary.label}")`);
              assertEqual(oSummary.playerLevel, 4, 'Ozias getProfileSummary exposes playerLevel');
              assert(oSummary.label.startsWith('Trainer Lv.4 •'), `Ozias summary label includes Trainer Lv.4 (got "${oSummary.label}")`);

              // Invalid/solid positions still repaired safely without stranding
              const repairedViolet = validateAndRepairProfile({ ...v1LegacySave.profiles.violet, pos: { x: 0, y: 0, dir: 'down' } }, 'violet');
              assertEqual(isTileWalkableAt(repairedViolet.pos.x, repairedViolet.pos.y), true, 'solid Violet pos repaired to walkable');
              const repairedOzias = validateAndRepairProfile({ ...v1LegacySave.profiles.ozias, pos: { x: -5, y: 999, dir: 'right' } }, 'ozias');
              assertEqual(isTileWalkableAt(repairedOzias.pos.x, repairedOzias.pos.y), true, 'out-of-bounds Ozias pos repaired to walkable');

              // syncProfilePlayerProgression handles corrupted fields cleanly
              const corruptProg = { trainerXp: NaN, playerLevel: -5, stats: { battlesWon: 1 }, pokedex: { caught: { 1: 1 } } };
              const synced = syncProfilePlayerProgression(corruptProg);
              assertEqual(synced.xp, 14, 'corrupted trainerXp repaired from milestones');
              assertEqual(corruptProg.trainerXp, 14, 'syncProfilePlayerProgression writes repaired trainerXp');
              assertEqual(corruptProg.playerLevel, 1, 'syncProfilePlayerProgression writes repaired playerLevel');
            } finally {
              window.localStorage.removeItem(TEST_KEY);
            }
          },
        },
        {
          name: 'Player-Level farming zone selection (Lv.1..50), actual encounter bracket parity, Veteran/Apex anti-spike protection & shrine tiebreak',
          fn() {
            assertEqual(Array.isArray(FARMING_BIOME_ORDER), true, 'FARMING_BIOME_ORDER exported');
            assertEqual(FARMING_BIOME_ORDER.length, 17, 'FARMING_BIOME_ORDER covers all 17 encounter biomes');
            assertEqual(FARMING_BIOME_ORDER.includes('village'), false, 'non-farming village excluded from FARMING_BIOME_ORDER');
            assertEqual(Object.keys(BIOMES).length, 18, '18 total BIOMES defined');

            const expectedOffsets = {
              village: -2,
              forest: -1,
              cave: 0,
              water: 0,
              volcano: 0,
              desert: 0,
              peak: 1,
              grove: 1,
              marsh: 1,
              faeveldt: 1,
              canyon: 1,
              sanctum: 1,
              atoll: 1,
              reef: 1,
              highlands: 1,
              ruins: 1,
              crater: 1,
              rift: 1,
            };
            for (const [bId, expectedOffset] of Object.entries(expectedOffsets)) {
              assertEqual(BIOME_SCALING_OFFSETS[bId], expectedOffset, `BIOME_SCALING_OFFSETS.${bId} (config)`);
              assertEqual(POKEMON_BIOME_SCALING_OFFSETS[bId], expectedOffset, `BIOME_SCALING_OFFSETS.${bId} (pokemon)`);
            }

            // Edge clamping & legacy getPartyFarmingLevel compatibility
            const lv1World = resolveFarmingBiomeForLevel(1);
            const lv1Poke = resolveRecommendedFarmingZone(1);
            assertEqual(lv1World.biomeId, 'forest', 'Lv.1 low-clamps to forest (world-data)');
            assertEqual(lv1World.clamped, 'low', 'Lv.1 marks clamped=low (world-data)');
            assertEqual(lv1Poke.biomeId, 'forest', 'Lv.1 low-clamps to forest (pokemon)');
            assertEqual(lv1Poke.clamped, 'low', 'Lv.1 marks clamped=low (pokemon)');
            assertEqual(lv1Poke.playerLevel, 1, 'Lv.1 playerLevel === 1');
            assertEqual(lv1Poke.partyLevel, 1, 'Lv.1 partyLevel alias === 1');

            for (const highLv of [37, 45, 50]) {
              const wHigh = resolveFarmingBiomeForLevel(highLv);
              const pHigh = resolveRecommendedFarmingZone(highLv);
              assertEqual(wHigh.biomeId, 'rift', `Lv.${highLv} high-clamps to rift (world-data)`);
              assertEqual(wHigh.clamped, 'high', `Lv.${highLv} clamped=high (world-data)`);
              assertEqual(pHigh.biomeId, 'rift', `Lv.${highLv} high-clamps to rift (pokemon)`);
              assertEqual(pHigh.clamped, 'high', `Lv.${highLv} clamped=high (pokemon)`);
            }

            assertEqual(getPartyFarmingLevel(-Infinity), 1, 'legacy getPartyFarmingLevel(-Infinity) === 1');
            assertEqual(getPartyFarmingLevel(Infinity), 50, 'legacy getPartyFarmingLevel(Infinity) === 50');
            assertEqual(getPartyFarmingLevel([{ level: 14, hp: 30, isFainted: false }]), 14, 'legacy getPartyFarmingLevel kept exported');

            // Every integer Lv.1..50 resolves identically across world-data, pokemon & pokedex,
            // matches actual scaled encounter brackets, and NEVER puts players into Veteran/Apex spikes.
            for (let lv = 1; lv <= 50; lv++) {
              const w = resolveFarmingBiomeForLevel(lv);
              const p = resolveRecommendedFarmingZone(lv);
              const px = getRecommendedFarmingZoneSafe(lv);
              assert(w.biomeId !== 'village' && p.biomeId !== 'village', `Lv.${lv} never matches village`);
              assertEqual(w.biomeId, p.biomeId, `Lv.${lv} world-data and pokemon match (${w.biomeId})`);
              assertEqual(px.biomeId, p.biomeId, `Lv.${lv} pokedex helper matches (${px.biomeId})`);
              assertEqual(w.minLv, p.minLv, `Lv.${lv} minLv matches`);
              assertEqual(w.maxLv, p.maxLv, `Lv.${lv} maxLv matches`);
              assertEqual(w.clamped, lv < 2 ? 'low' : (lv > 36 ? 'high' : null), `Lv.${lv} clamped state exact`);
              assertEqual(p.clamped, w.clamped, `Lv.${lv} pokemon clamped state exact`);
              assert(
                w.threatTone !== 'veteran' && w.threatTone !== 'apex',
                `Lv.${lv} world-data never Veteran/Apex (got ${w.threatTone})`,
              );
              assert(
                p.threatTone !== 'veteran' && p.threatTone !== 'apex',
                `Lv.${lv} pokemon never Veteran/Apex (got ${p.threatTone})`,
              );
              assert(
                p.maxLv <= Math.max(7, lv + 4) && p.minLv <= Math.max(2, lv + 1),
                `Lv.${lv} bracket [${p.minLv},${p.maxLv}] obeys anti-spike cap`,
              );

              const scaledCheck = getBiomeScaledRange(p.biomeId, lv);
              assertEqual(scaledCheck.minLv, p.minLv, `Lv.${lv} getBiomeScaledRange minLv parity`);
              assertEqual(scaledCheck.maxLv, p.maxLv, `Lv.${lv} getBiomeScaledRange maxLv parity`);
              assert(
                scaledCheck.threatTone !== 'veteran' && scaledCheck.threatTone !== 'apex',
                `Lv.${lv} getBiomeScaledRange never Veteran/Apex`,
              );
              if (lv >= 2) {
                assert(
                  lv >= p.minLv && lv <= p.maxLv,
                  `Lv.${lv} falls within ${p.biomeId} actual bracket [${p.minLv}, ${p.maxLv}]`,
                );
              }

              // Verify actual wild encounter rolls stay inside the chosen bracket
              const lvProf = {
                trainerId: 'violet',
                playerLevel: lv,
                trainerXp: getCumulativeXpForPlayerLevel(lv),
                badges: lv > 7 ? ['meadow', 'flame'] : [],
                stats: { battlesWon: 0 },
                shrinesCleared: [],
                questsCompleted: [],
                team: [{ speciesId: 1, level: 50, hp: 150 }],
                box: [{ speciesId: 150, level: 50, hp: 180 }],
              };
              const recProf = resolveRecommendedFarmingZone(lvProf);
              assertEqual(recProf.playerLevel, lv, `Lv.${lv} profile ignores Lv.50 team/box`);
              assert(
                recProf.threatTone !== 'veteran' && recProf.threatTone !== 'apex',
                `Lv.${lv} profile with Lv.50 mons never hits Veteran/Apex spike`,
              );
              const rolledWild = rollWildPokemon(recProf.biomeId, lvProf, { forceElite: false });
              assertInRange(
                rolledWild.level,
                recProf.minLv,
                recProf.maxLv,
                `Lv.${lv} rolled wild mon level fits ${recProf.biomeId} [${recProf.minLv}, ${recProf.maxLv}]`,
              );
            }

            // Deterministic regardless of trainer position & shrine tiebreak
            const lv14Profile = {
              playerLevel: 14,
              trainerXp: getCumulativeXpForPlayerLevel(14),
              team: [{ level: 48, hp: 150, isFainted: false }],
              pos: { x: 8, y: 15, dir: 'down' },
              shrinesCleared: [],
            };
            const resVillagePos = resolveRecommendedFarmingZone(lv14Profile);
            const resRiftPos = resolveRecommendedFarmingZone({ ...lv14Profile, pos: { x: 78, y: 42, dir: 'up' } });
            assertEqual(resVillagePos.biomeId, resRiftPos.biomeId, 'zone resolution does not depend on profile.pos');
            assertEqual(resVillagePos.biomeId, 'peak', 'Player Lv.14 matches peak (10-18, midpoint 14)');

            const tieBase = {
              playerLevel: 7,
              trainerXp: getCumulativeXpForPlayerLevel(7),
              team: [{ level: 45, hp: 120 }],
            };
            const tieFresh = resolveFarmingBiomeForLevel({ ...tieBase, shrinesCleared: [] });
            const tieCaveCleared = resolveFarmingBiomeForLevel({
              ...tieBase,
              shrinesCleared: ['cave_shrine', 'eclipse_shrine'],
            });
            assertEqual(tieFresh.biomeId, 'cave', 'Player Lv.7 selects cave first when both shrines uncleared');
            assertEqual(tieCaveCleared.biomeId, 'water', 'Player Lv.7 prefers uncleared water shrine when cave shrines cleared');
          },
        },
        {
          name: 'Safe-Zone recall (getSafeZoneWarpPoint, storage.warpToSafeZone, KeyH, #warp-safe-btn, #guide-warp-safe-btn, AudioEngine.playSafeRecall & boot cancel)',
          async fn() {
            const TEST_KEY = 'starlight_pokemon_test_s47_safe_recall_v1';
            const app = window.__starlightApp;
            const ow = app?.overworld;
            assert(Boolean(app && ow), 'GameApp & OverworldEngine mounted');

            // 1. Safe Zone tile beside Healing Fountain & all 18 biome warp points walkable
            const safeWp = getSafeZoneWarpPoint();
            assertEqual(safeWp.biomeId, 'village', 'getSafeZoneWarpPoint targets Starlight Village');
            assertEqual(safeWp.biome?.id, 'village', 'getSafeZoneWarpPoint returns village biome object');
            assertEqual(isTileWalkableAt(safeWp.x, safeWp.y), true, 'Safe Zone landing tile is walkable');
            assertEqual(WORLD_MAP[safeWp.y]?.[safeWp.x], TILE.PATH, 'Safe Zone landing tile is TILE.PATH');
            assertEqual(BIOMES.village.encounters.length, 0, 'Starlight Village has zero wild encounters');
            assertEqual(getBiomeAt(safeWp.x, safeWp.y).id, 'village', 'Safe Zone landing tile is inside village');
            const villageHeals = [];
            for (let y = 0; y < WORLD_ROWS; y++) {
              for (let x = 0; x < WORLD_COLS; x++) {
                if (WORLD_MAP[y]?.[x] === TILE.HEAL && getBiomeAt(x, y).id === 'village') {
                  villageHeals.push({ x, y });
                }
              }
            }
            assertGreater(villageHeals.length, 0, 'Starlight Village has Healing Fountain tile');
            assert(
              villageHeals.some((h) => Math.abs(h.x - safeWp.x) + Math.abs(h.y - safeWp.y) <= 4),
              'Safe Zone landing tile is right beside Starlight Village Healing Fountain',
            );

            const blockedTiles = new Set([
              TILE.WALL,
              TILE.WATER,
              TILE.LAVA,
              TILE.SHRINE,
              TILE.CHEST,
              TILE.NPC,
              TILE.ROOF,
              TILE.SIGN,
              TILE.LANDMARK,
            ]);
            for (const biomeId of Object.keys(BIOMES)) {
              assert(Boolean(BIOME_WARP_POINTS[biomeId]), `BIOME_WARP_POINTS has ${biomeId}`);
              const wp = getBiomeWarpPoint(biomeId);
              assertEqual(wp.biomeId, biomeId, `getBiomeWarpPoint(${biomeId}) returns matching biomeId`);
              assertEqual(isTileWalkableAt(wp.x, wp.y), true, `${biomeId} warp (${wp.x},${wp.y}) is walkable`);
              const tile = WORLD_MAP[wp.y]?.[wp.x];
              assertEqual(SOLID_TILES.has(tile), false, `${biomeId} warp (${wp.x},${wp.y}) is non-solid`);
              assertEqual(blockedTiles.has(tile), false, `${biomeId} warp (${wp.x},${wp.y}) not on solid/interactive tile`);
              assertEqual(getBiomeAt(wp.x, wp.y).id, biomeId, `${biomeId} warp (${wp.x},${wp.y}) inside biome`);
              const coordKey = `${wp.x},${wp.y}`;
              assert(
                !SHRINES[coordKey] && !CHESTS[coordKey] && !NPCS[coordKey]
                && !RIVAL_TRAINERS[coordKey] && !LANDMARKS[coordKey] && !SIGNPOSTS[coordKey],
                `${biomeId} warp (${coordKey}) does not collide with interactive object coords`,
              );
            }

            // 2. AudioEngine.playSafeRecall muted / suspended / running + 0 leaked timers/nodes
            const mutedAudio = new AudioEngine({ attachUnlockListeners: false });
            mutedAudio.muted = true;
            const mutedSafe = mutedAudio.playSafeRecall({ phase: 'full' });
            assertEqual(mutedSafe.played, false, 'muted playSafeRecall returns played:false');
            assertEqual(mutedSafe.muted, true, 'muted playSafeRecall returns muted:true');
            assertEqual(mutedSafe.phase, 'full', 'muted playSafeRecall reports phase');
            assertEqual(mutedSafe.mode, 'safe', 'muted playSafeRecall reports mode:safe');
            assertEqual(mutedAudio.playWarpTeleport({ phase: 'full', mode: 'safe' }).mode, 'safe', 'muted playWarpTeleport mode:safe delegates to playSafeRecall');

            const suspSafeEngine = new AudioEngine({ attachUnlockListeners: false });
            suspSafeEngine.muted = false;
            suspSafeEngine.ctx = createMockAudioCtx('suspended', false);
            suspSafeEngine.masterFilter = { connect() {} };
            suspSafeEngine.masterGain = { gain: { value: 1 }, connect() {} };
            suspSafeEngine.noiseBuffer = { length: 44100 };
            const suspSafeRes = suspSafeEngine.playSafeRecall({ phase: 'full' });
            assertEqual(suspSafeRes.played, true, 'suspended context queues safe recall cue');
            assertEqual(suspSafeRes.mode, 'safe', 'suspended safe recall reports mode:safe');
            assertEqual(suspSafeEngine._pendingVoices.length, 12, 'suspended safe recall queues 12 voices (11 tonal + 1 noise)');
            assertEqual(suspSafeEngine.getDiagnostics().schedulerActive, false, 'safe recall leaks 0 scheduler timers');
            assertEqual(suspSafeEngine.getDiagnostics().activeBgmNodes, 0, 'safe recall leaks 0 BGM nodes');
            suspSafeEngine.ctx.state = 'running';
            suspSafeEngine._flushPendingVoices();
            assertEqual(suspSafeEngine._pendingVoices.length, 0, 'flushing drains safe recall pending queue');
            assertEqual(suspSafeEngine.ctx.createdOsc.length, 11, 'flushed safe recall plays 11 oscillators');
            assertEqual(
              suspSafeEngine.ctx.createdBuf.filter((src) => src.buffer === suspSafeEngine.noiseBuffer).length,
              1,
              'flushed safe recall plays 1 airy breeze noise',
            );

            const runSafeEngine = new AudioEngine({ attachUnlockListeners: false });
            runSafeEngine.muted = false;
            runSafeEngine.ctx = createMockAudioCtx('running', true);
            runSafeEngine.masterFilter = { connect() {} };
            runSafeEngine.masterGain = { gain: { value: 1 }, connect() {} };
            runSafeEngine.noiseBuffer = { length: 44100 };
            assertEqual(runSafeEngine.playSafeRecall({ phase: 'depart' }).played, true, 'running playSafeRecall depart plays');
            assertEqual(runSafeEngine.playSafeRecall({ phase: 'arrive' }).played, true, 'running playSafeRecall arrive plays');
            assertEqual(runSafeEngine.playSafeRecall({ phase: 'full' }).played, true, 'running playSafeRecall full plays');
            assertEqual(runSafeEngine.playWarpTeleport({ phase: 'full', mode: 'safe' }).mode, 'safe', 'running playWarpTeleport mode:safe delegates');
            assertGreater(runSafeEngine.ctx.createdOsc.length, 20, 'running playSafeRecall synthesizes chime & Cmaj9 hearth chord');
            assertGreater(
              runSafeEngine.ctx.createdBuf.filter((src) => src.buffer === runSafeEngine.noiseBuffer).length,
              2,
              'running playSafeRecall synthesizes bandpass breeze noise',
            );
            assertEqual(runSafeEngine.getDiagnostics().schedulerActive, false, 'running playSafeRecall leaks 0 scheduler timers');
            assertEqual(runSafeEngine.getDiagnostics().activeBgmNodes, 0, 'running playSafeRecall leaks 0 BGM nodes');

            // 3. storage.warpToSafeZone + GameApp triggerSafeZoneWarp guards, KeyH, #warp-safe-btn, #guide-warp-safe-btn & boot cancel
            const snap = snapshotAppForTest(app);
            const origPlaySafeRecall = audio.playSafeRecall;
            const safeAudioCalls = [];

            try {
              audio.playSafeRecall = function patchedPlaySafeRecall(opts = {}) {
                safeAudioCalls.push(opts);
                return origPlaySafeRecall.call(this, opts);
              };

              window.localStorage.removeItem(TEST_KEY);
              const store = new StorageManager(TEST_KEY);
              assertEqual(store.warpToSafeZone().warped, false, 'warpToSafeZone blocked before trainer selected');
              store.selectTrainer('ozias');
              store.chooseStarter(4);
              const sProf = store.getActiveProfile();
              store.addRewards({ starShards: 5, cheerCharges: 1 });
              store.unlockArcade();
              sProf.stats.steps = 37;
              sProf.cheerStepProgress = 14;
              const riftPt = getBiomeWarpPoint('rift');
              store.warpToZone(riftPt.x, riftPt.y, riftPt.dir, 'rift');
              const snapTeam = sProf.team.length;
              const snapBag = JSON.stringify(sProf.bag);
              const snapArcade = sProf.arcade.charges;
              const snapXp = sProf.trainerXp;
              const snapLv = sProf.playerLevel;

              const safeRes = store.warpToSafeZone();
              assertEqual(safeRes.warped, true, 'storage.warpToSafeZone succeeds from rift');
              assertEqual(safeRes.mode, 'safe', 'storage.warpToSafeZone returns mode:safe');
              assertEqual(safeRes.biomeId, 'village', 'storage.warpToSafeZone returns biomeId:village');
              assertEqual(safeRes.pos.x, safeWp.x, 'storage.warpToSafeZone lands at safeWp.x');
              assertEqual(safeRes.pos.y, safeWp.y, 'storage.warpToSafeZone lands at safeWp.y');
              assertEqual(sProf.stats.steps, 37, 'warpToSafeZone preserves stats.steps');
              assertEqual(sProf.cheerStepProgress, 14, 'warpToSafeZone preserves cheerStepProgress');
              assertEqual(sProf.team.length, snapTeam, 'warpToSafeZone preserves team');
              assertEqual(JSON.stringify(sProf.bag), snapBag, 'warpToSafeZone preserves bag');
              assertEqual(sProf.arcade.charges, snapArcade, 'warpToSafeZone preserves arcade charges');
              assertEqual(sProf.trainerXp, snapXp, 'warpToSafeZone preserves trainerXp');
              assertEqual(sProf.playerLevel, snapLv, 'warpToSafeZone preserves playerLevel');

              // Live GameApp Safe-Zone guards
              window.localStorage.removeItem(STORAGE_KEY);
              storage.state = storage.load();
              app.showBootScreen();
              assertEqual((await app.triggerSafeZoneWarp({ instant: true })).warped, false, 'triggerSafeZoneWarp blocked on boot');
              app.selectTrainer('violet');
              assertEqual((await app.triggerSafeZoneWarp({ instant: true })).warped, false, 'triggerSafeZoneWarp blocked on starter');
              storage.chooseStarter(1);
              app.enterOverworld(true);
              assertEqual((await app.triggerSafeZoneWarp({ instant: true })).warped, false, 'triggerSafeZoneWarp blocked while dialogueOpen');
              app.closeDialogue();

              app.encounterTransitioning = true;
              assertEqual((await app.triggerSafeZoneWarp({ instant: true })).warped, false, 'triggerSafeZoneWarp blocked during encounterTransitioning');
              app.encounterTransitioning = false;

              const bStart = app.battle.start({ enemy: createPokemon(16, 4), biomeId: 'forest' });
              const bFlush = setInterval(() => app.battle.finishTypewriter(), 15);
              try {
                await bStart;
              } finally {
                clearInterval(bFlush);
              }
              app.syncControlVisibility();
              assertEqual((await app.triggerSafeZoneWarp({ instant: true })).warped, false, 'triggerSafeZoneWarp blocked during battle');
              app.battle.stop({ outcome: 'escaped', faintedAll: false });
              app.syncControlVisibility();
              app.syncOverworldPause();

              app.openPokedex('guide');
              assertEqual((await app.triggerSafeZoneWarp({ instant: true })).warped, false, 'triggerSafeZoneWarp blocked while Pokédex open');
              app.pokedex.close();
              app.openSettings();
              assertEqual((await app.triggerSafeZoneWarp({ instant: true })).warped, false, 'triggerSafeZoneWarp blocked while Settings open');
              app.closeSettings();
              storage.unlockArcade();
              app.openMinigame();
              assertEqual((await app.triggerSafeZoneWarp({ instant: true })).warped, false, 'triggerSafeZoneWarp blocked while Sky-Hop open');
              app.minigame.close();

              app.warpTransitioning = true;
              assertEqual((await app.triggerSafeZoneWarp({ instant: true })).warped, false, 'triggerSafeZoneWarp blocked while warpTransitioning');
              app.warpTransitioning = false;

              // Move Violet to Rift, queue held key + touch path, and execute Safe-Zone recall
              storage.warpToZone(riftPt.x, riftPt.y, riftPt.dir, 'rift');
              ow.syncFromProfile();
              app.input.pushDirection('left');
              ow.walkToTile(riftPt.x - 1, riftPt.y);

              const recallRes = await app.triggerSafeZoneWarp({ instant: true });
              assertEqual(recallRes.warped, true, 'triggerSafeZoneWarp succeeds on clean overworld');
              assertEqual(recallRes.mode, 'safe', 'triggerSafeZoneWarp returns mode:safe');
              assertEqual(recallRes.biomeId, 'village', 'triggerSafeZoneWarp lands in village');
              assertEqual(recallRes.x, safeWp.x, 'triggerSafeZoneWarp x === safeWp.x');
              assertEqual(recallRes.y, safeWp.y, 'triggerSafeZoneWarp y === safeWp.y');
              assertEqual(app.input.getDirection(), null, 'triggerSafeZoneWarp clears held keyboard input');
              assertEqual(ow.getTouchNavigationState().autoPathLength, 0, 'triggerSafeZoneWarp clears touch navigation');
              assertEqual(safeAudioCalls.length, 1, 'audio.playSafeRecall called once');
              assertEqual(safeAudioCalls[0]?.phase, 'full', 'audio.playSafeRecall called with phase=full');
              assertEqual(ow._warpBeam?.tone, 'safe', 'overworld warp beam uses safe tone');
              assert(app.biomeBannerEl.textContent.includes('Starlight Village'), 'biome banner displays Starlight Village');
              assert(app.celebrationLayerEl.textContent.includes('SAFE ZONE RECALL!'), 'celebration displays SAFE ZONE RECALL!');

              // KeyH shortcut (ignored inside <input>, works on overworld)
              const tempInput = document.createElement('input');
              document.body.appendChild(tempInput);
              tempInput.focus();
              app.input.lastEmitTime.safeWarp = 0;
              tempInput.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyH', key: 'h', bubbles: true }));
              assertEqual(app.warpTransitioning, false, 'KeyH ignored when focused inside editable input');
              tempInput.blur();
              tempInput.remove();

              storage.warpToZone(riftPt.x, riftPt.y, riftPt.dir, 'rift');
              ow.syncFromProfile();
              app.input.lastEmitTime.safeWarp = 0;
              window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyH', key: 'h', bubbles: true }));
              assertEqual(app.warpTransitioning, true, 'KeyH initiates Safe-Zone recall');
              assertEqual(app.warpTransitionEl.dataset.mode, 'safe', '#warp-transition sets data-mode="safe" during Safe-Zone recall');
              const keyHDeadline = performance.now() + 1500;
              while (app.warpTransitioning && performance.now() < keyHDeadline) {
                await new Promise((r) => setTimeout(r, 25));
              }
              assertEqual(app.warpTransitioning, false, 'KeyH Safe-Zone recall finishes cleanly');
              assertEqual(app.warpTransitionEl.dataset.mode, undefined, '#warp-transition clears data-mode after finish');
              assertEqual(storage.getActiveProfile().pos.x, safeWp.x, 'KeyH recall lands at Safe Zone x');
              assertEqual(storage.getActiveProfile().pos.y, safeWp.y, 'KeyH recall lands at Safe Zone y');

              // #warp-safe-btn click triggers Safe-Zone recall
              storage.warpToZone(riftPt.x, riftPt.y, riftPt.dir, 'rift');
              ow.syncFromProfile();
              document.getElementById('warp-safe-btn').click();
              assertEqual(app.warpTransitioning, true, '#warp-safe-btn click initiates Safe-Zone recall');
              const safeBtnDeadline = performance.now() + 1500;
              while (app.warpTransitioning && performance.now() < safeBtnDeadline) {
                await new Promise((r) => setTimeout(r, 25));
              }
              assertEqual(storage.getActiveProfile().pos.x, safeWp.x, '#warp-safe-btn lands at Safe Zone x');
              assertEqual(storage.getActiveProfile().pos.y, safeWp.y, '#warp-safe-btn lands at Safe Zone y');

              // Guide tab #guide-warp-safe-btn closes Pokédex and triggers Safe-Zone recall
              storage.warpToZone(riftPt.x, riftPt.y, riftPt.dir, 'rift');
              ow.syncFromProfile();
              app.openPokedex('guide');
              const guideSafeBtn = document.getElementById('guide-warp-safe-btn');
              assert(Boolean(guideSafeBtn), '#guide-warp-safe-btn rendered in Guide tab');
              guideSafeBtn.click();
              assertEqual(app.pokedex.isOpen(), false, 'clicking #guide-warp-safe-btn closes Pokédex');
              assertEqual(app.warpTransitioning, true, 'clicking #guide-warp-safe-btn initiates Safe-Zone recall');
              const guideSafeDeadline = performance.now() + 1500;
              while (app.warpTransitioning && performance.now() < guideSafeDeadline) {
                await new Promise((r) => setTimeout(r, 25));
              }
              assertEqual(storage.getActiveProfile().pos.x, safeWp.x, '#guide-warp-safe-btn lands at Safe Zone x');
              assertEqual(storage.getActiveProfile().pos.y, safeWp.y, '#guide-warp-safe-btn lands at Safe Zone y');

              // Boot cancellation mid Safe-Zone recall
              storage.warpToZone(riftPt.x, riftPt.y, riftPt.dir, 'rift');
              ow.syncFromProfile();
              const cancelPromise = app.triggerSafeZoneWarp();
              assertEqual(app.warpTransitioning, true, 'non-instant Safe-Zone recall sets warpTransitioning=true');
              assertEqual(app.warpTransitionEl.dataset.mode, 'safe', '#warp-transition has data-mode="safe"');
              app.showBootScreen();
              const cancelRes = await cancelPromise;
              assertEqual(cancelRes.warped, false, 'showBootScreen cancels active Safe-Zone recall');
              assertEqual(cancelRes.reason, 'cancelled', 'cancelled Safe-Zone recall returns reason=cancelled');
              assertEqual(app.warpTransitioning, false, 'warpTransitioning cleared on Safe-Zone cancel');
              assertEqual(app.warpTransitionEl.hidden, true, '#warp-transition hidden on Safe-Zone cancel');
              assertEqual(app.warpTransitionEl.dataset.mode, undefined, 'data-mode cleared on Safe-Zone cancel');
              assertEqual(storage.getProfile('violet').pos.x, riftPt.x, 'cancelled Safe-Zone recall preserves prior x');
              assertEqual(storage.getProfile('violet').pos.y, riftPt.y, 'cancelled Safe-Zone recall preserves prior y');
            } finally {
              window.localStorage.removeItem(TEST_KEY);
              audio.playSafeRecall = origPlaySafeRecall;
              restoreAppFromSnapshot(app, snap);
            }
          },
        },
        {
          name: 'Level-matched farming warp (KeyT, AudioEngine.playWarpTeleport, #guide-warp-zone-btn, banner/celebration & boot cancellation)',
          async fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            // 1. AudioEngine.playWarpTeleport muted / suspended (13 voices) / running verification
            const mutedAudio = new AudioEngine({ attachUnlockListeners: false });
            mutedAudio.muted = true;
            const mutedRes = mutedAudio.playWarpTeleport({ phase: 'full' });
            assertEqual(mutedRes.played, false, 'muted playWarpTeleport returns played:false');
            assertEqual(mutedRes.muted, true, 'muted playWarpTeleport returns muted:true');
            assertEqual(mutedRes.phase, 'full', 'muted playWarpTeleport reports phase');

            const suspEngine = new AudioEngine({ attachUnlockListeners: false });
            suspEngine.muted = false;
            suspEngine.ctx = createMockAudioCtx('suspended', false);
            suspEngine.masterFilter = { connect() {} };
            suspEngine.masterGain = { gain: { value: 1 }, connect() {} };
            suspEngine.noiseBuffer = { length: 44100 };
            const suspRes = suspEngine.playWarpTeleport({ phase: 'full' });
            assertEqual(suspRes.played, true, 'suspended context accepts and queues warp cue');
            assertEqual(suspEngine._pendingVoices.length, 13, 'suspended context queues all 13 warp voices (12 tonal + 1 noise)');
            assertEqual(suspEngine.getDiagnostics().schedulerActive, false, 'no scheduler timer leaked');
            assertEqual(suspEngine.getDiagnostics().activeBgmNodes, 0, 'no BGM nodes leaked');
            suspEngine.ctx.state = 'running';
            suspEngine._flushPendingVoices();
            assertEqual(suspEngine._pendingVoices.length, 0, 'flushing pending voices drains queue on resume');
            assertEqual(suspEngine.ctx.createdOsc.length, 12, 'flushed queue plays all 12 warp oscillators');
            assertEqual(
              suspEngine.ctx.createdBuf.filter((src) => src.buffer === suspEngine.noiseBuffer).length,
              1,
              'flushed queue plays warp whoosh noise',
            );

            const runEngine = new AudioEngine({ attachUnlockListeners: false });
            runEngine.muted = false;
            runEngine.ctx = createMockAudioCtx('running', true);
            runEngine.masterFilter = { connect() {} };
            runEngine.masterGain = { gain: { value: 1 }, connect() {} };
            runEngine.noiseBuffer = { length: 44100 };
            assertEqual(runEngine.playWarpTeleport({ phase: 'depart' }).played, true, 'running context plays depart phase');
            assertEqual(runEngine.playWarpTeleport({ phase: 'arrive' }).played, true, 'running context plays arrive phase');
            assertEqual(runEngine.playWarpTeleport({ phase: 'full' }).played, true, 'running context plays full phase');
            assertGreater(runEngine.ctx.createdOsc.length, 10, 'warp cue synthesizes multi-note arpeggio + chord');
            assertGreater(runEngine.ctx.createdBuf.length, 0, 'warp cue synthesizes bandpass whoosh noise');
            assertEqual(runEngine.getDiagnostics().schedulerActive, false, 'no scheduler timer leaked after running warp cues');
            assertEqual(runEngine.getDiagnostics().activeBgmNodes, 0, 'no BGM nodes leaked after running warp cues');

            // 2. GameApp farming warp guards, KeyT, Guide CTA, tone, banner/celebration & boot cancel
            const snap = snapshotAppForTest(app);
            const origPlayWarpTeleport = audio.playWarpTeleport;
            const warpAudioCalls = [];

            try {
              audio.playWarpTeleport = function patchedPlayWarpTeleport(opts = {}) {
                warpAudioCalls.push(opts);
                return origPlayWarpTeleport.call(this, opts);
              };

              window.localStorage.removeItem(STORAGE_KEY);
              storage.state = storage.load();

              app.showBootScreen();
              assertEqual(app.canTriggerZoneWarp(), false, 'warp blocked on boot screen');
              assertEqual((await app.triggerLevelZoneWarp({ instant: true })).warped, false, 'triggerLevelZoneWarp blocked on boot');

              app.selectTrainer('violet');
              assertEqual(app.canTriggerZoneWarp(), false, 'warp blocked on starter screen');
              assertEqual((await app.triggerLevelZoneWarp({ instant: true })).warped, false, 'triggerLevelZoneWarp blocked on starter');

              storage.chooseStarter(1);
              app.enterOverworld(true);
              assertEqual(app.canTriggerZoneWarp(), false, 'warp blocked while dialogueOpen');
              assertEqual((await app.triggerLevelZoneWarp({ instant: true })).warped, false, 'triggerLevelZoneWarp blocked during dialogue');
              app.closeDialogue();
              assertEqual(app.canTriggerZoneWarp(), true, 'warp allowed on clean non-battle overworld');

              app.openPokedex('guide');
              assertEqual(app.canTriggerZoneWarp(), false, 'warp blocked when Pokédex modal open');
              const guideText = document.getElementById('pokedex-body')?.textContent || '';
              const guidePill = document.querySelector('#pokedex-body .guide-recommended-pill');
              const guideWarpBtn = document.getElementById('guide-warp-zone-btn');
              const guideSafeBtn = document.getElementById('guide-warp-safe-btn');
              const recBiomeCard = document.querySelector('#pokedex-body .biome-progress-card.is-recommended');
              assert(guideText.includes('Trainer Power:'), 'Guide tab preserves Trainer Power stat');
              assert(guideText.includes('Player Level: Lv.1'), 'Guide tab shows Player Level: Lv.1');
              assert(Boolean(guidePill && guidePill.textContent.includes('Recommended for Player Lv.1')), 'Guide tab shows Player Lv.1 recommended pill');
              assert(Boolean(guideWarpBtn && guideWarpBtn.textContent.includes('Lv.2–7')), 'Guide tab shows farming warp button');
              assert(Boolean(guideSafeBtn && guideSafeBtn.textContent.includes('Safe Zone')), 'Guide tab shows Safe Zone button');
              assert(Boolean(recBiomeCard && recBiomeCard.querySelector('.biome-recommended-tag')), 'Guide tab marks matching biome card');
              app.pokedex.close();

              app.input.pushDirection('right');
              app.overworld.walkToTile(8, 13);
              const warpRes = await app.triggerLevelZoneWarp({ instant: true });
              assertEqual(warpRes.warped, true, 'triggerLevelZoneWarp succeeds on overworld');
              assertEqual(warpRes.mode, 'farm', 'triggerLevelZoneWarp returns mode:farm');
              assertEqual(warpRes.biomeId, 'forest', 'Player Lv.1 Violet warps to Whispering Forest');
              assertEqual(warpRes.playerLevel, 1, 'triggerLevelZoneWarp reports playerLevel:1');
              assertEqual(app.input.getDirection(), null, 'triggerLevelZoneWarp clears held keyboard input');
              assertEqual(app.overworld.getTouchNavigationState().autoPathLength, 0, 'triggerLevelZoneWarp clears touch navigation');
              assertEqual(warpAudioCalls.length, 1, 'audio.playWarpTeleport called once');
              assertEqual(warpAudioCalls[0]?.phase, 'full', 'audio.playWarpTeleport called with phase=full');
              assertEqual(app.overworld._warpBeam?.tone, 'starlight', 'farming warp uses starlight beam tone');
              assert(
                app.biomeBannerEl.textContent.includes('Whispering Forest') && app.biomeBannerEl.textContent.includes('Lv.2–7'),
                `#biome-banner shows zone name & Lv.2–7 (got "${app.biomeBannerEl.textContent}")`,
              );
              assert(
                app.celebrationLayerEl.textContent.includes('Whispering Forest') && app.celebrationLayerEl.textContent.includes('Lv.2–7'),
                'celebration shows zone name & Lv.2–7',
              );

              const savedNow = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
              const forestPt = getBiomeWarpPoint('forest');
              assertEqual(savedNow.profiles.violet.pos.x, forestPt.x, 'localStorage persisted forest warp x');
              assertEqual(savedNow.profiles.violet.pos.y, forestPt.y, 'localStorage persisted forest warp y');
              assert(savedNow.profiles.violet.biomesVisited.includes('forest'), 'localStorage recorded forest visited');

              // KeyT shortcut ignored inside <input> & triggers warp on overworld
              const tempInput = document.createElement('input');
              document.body.appendChild(tempInput);
              tempInput.focus();
              app.input.lastEmitTime.warp = 0;
              tempInput.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyT', key: 't', bubbles: true }));
              assertEqual(app.warpTransitioning, false, 'KeyT ignored inside editable input');
              tempInput.blur();
              tempInput.remove();

              storage.updatePosition(8, 15, 'down', false);
              app.overworld.syncFromProfile();
              app.input.lastEmitTime.warp = 0;
              window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyT', key: 't', bubbles: true }));
              assertEqual(app.warpTransitioning, true, 'KeyT initiates warp transition on overworld');
              assertEqual(app.warpTransitionEl.dataset.mode, 'farm', '#warp-transition sets data-mode="farm" during farming warp');
              const keyTDeadline = performance.now() + 1500;
              while (app.warpTransitioning && performance.now() < keyTDeadline) {
                await new Promise((r) => setTimeout(r, 25));
              }
              assertEqual(app.warpTransitioning, false, 'KeyT warp transition finished cleanly');
              assertEqual(storage.getActiveProfile().pos.x, forestPt.x, 'KeyT warp landed in forest');

              // #guide-warp-zone-btn closes Pokédex and triggers warp
              storage.updatePosition(8, 15, 'down', false);
              app.overworld.syncFromProfile();
              app.openPokedex('guide');
              document.getElementById('guide-warp-zone-btn').click();
              assertEqual(app.pokedex.isOpen(), false, 'clicking #guide-warp-zone-btn closes Pokédex');
              assertEqual(app.warpTransitioning, true, 'clicking #guide-warp-zone-btn initiates warp');
              const guideDeadline = performance.now() + 1500;
              while (app.warpTransitioning && performance.now() < guideDeadline) {
                await new Promise((r) => setTimeout(r, 25));
              }
              assertEqual(storage.getActiveProfile().pos.x, forestPt.x, 'Guide warp CTA landed in forest');

              // Clean cancellation on showBootScreen() mid-warp
              storage.updatePosition(8, 15, 'down', false);
              app.overworld.syncFromProfile();
              const cancelPromise = app.triggerLevelZoneWarp();
              assertEqual(app.warpTransitioning, true, 'non-instant warp sets warpTransitioning=true');
              assertEqual(app.warpTransitionEl.hidden, false, '#warp-transition visible during warp');
              app.showBootScreen();
              const cancelRes = await cancelPromise;
              assertEqual(cancelRes.warped, false, 'showBootScreen cancels active warp');
              assertEqual(cancelRes.reason, 'cancelled', 'cancelled warp returns reason=cancelled');
              assertEqual(app.warpTransitioning, false, 'warpTransitioning cleared on cancel');
              assertEqual(app.warpTransitionEl.hidden, true, '#warp-transition hidden on cancel');
              assertEqual(storage.getProfile('violet').pos.x, 8, 'cancelled warp does not mutate village x');
              assertEqual(storage.getProfile('violet').pos.y, 15, 'cancelled warp does not mutate village y');
            } finally {
              audio.playWarpTeleport = origPlayWarpTeleport;
              restoreAppFromSnapshot(app, snap);
            }
          },
        },
        {
          name: 'Clean minimap removal, 2-button #warp-dock visibility lifecycle, pointer isolation, #compass-hud Guide, #hud-player-level & zero-overlap layout',
          async fn() {
            const app = window.__starlightApp;
            assert(Boolean(app), 'GameApp mounted');

            const snap = snapshotAppForTest(app);

            const rectOf = (sel) => {
              const el = document.querySelector(sel);
              if (!el || el.hidden) return null;
              const style = window.getComputedStyle(el);
              if (style.display === 'none' || style.visibility === 'hidden') return null;
              const r = el.getBoundingClientRect();
              if (r.width <= 0 || r.height <= 0) return null;
              return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
            };
            const overlaps = (a, b) => Boolean(
              a && b && !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom),
            );

            try {
              window.localStorage.removeItem(STORAGE_KEY);
              storage.state = storage.load();

              // 1. Assert clean minimap removal (DOM + app + overworld)
              assertEqual(document.getElementById('minimap-hud'), null, '#minimap-hud cleanly removed from DOM');
              assertEqual(document.getElementById('minimap-canvas'), null, '#minimap-canvas cleanly removed from DOM');
              assertEqual(document.getElementById('minimap-canvas-wrap'), null, '#minimap-canvas-wrap cleanly removed from DOM');
              assertEqual(document.getElementById('minimap-zone-label'), null, '#minimap-zone-label cleanly removed from DOM');
              assertEqual(app.minimapHudEl, undefined, 'app.minimapHudEl cleanly removed');
              assertEqual(app.isMinimapHidden, undefined, 'app.isMinimapHidden cleanly removed');
              assertEqual(app.syncMinimapHud, undefined, 'app.syncMinimapHud cleanly removed');
              assertEqual(app.overworld.attachMinimapCanvas, undefined, 'overworld.attachMinimapCanvas cleanly removed');
              assertEqual(app.overworld.renderMinimap, undefined, 'overworld.renderMinimap cleanly removed');
              assertEqual(app.overworld.getMinimapState, undefined, 'overworld.getMinimapState cleanly removed');

              const warpDock = document.getElementById('warp-dock');
              const warpZoneBtn = document.getElementById('warp-zone-btn');
              const warpSafeBtn = document.getElementById('warp-safe-btn');
              const warpZoneLabel = document.getElementById('warp-zone-label');
              const warpSafeLabel = document.getElementById('warp-safe-label');
              const hudPlayerLevel = document.getElementById('hud-player-level');
              const compassHud = document.getElementById('compass-hud');
              assert(
                Boolean(warpDock && warpZoneBtn && warpSafeBtn && warpZoneLabel && warpSafeLabel && hudPlayerLevel && compassHud),
                '2-button #warp-dock, #hud-player-level & #compass-hud DOM elements present',
              );

              // 2. Hidden on boot & starter
              app.showBootScreen();
              assertEqual(app.isWarpDockHidden(), true, 'isWarpDockHidden() true on boot');
              assertEqual(warpDock.hidden, true, '#warp-dock hidden on boot');

              app.selectTrainer('violet');
              assertEqual(app.isWarpDockHidden(), true, 'isWarpDockHidden() true on starter screen');
              assertEqual(warpDock.hidden, true, '#warp-dock hidden on starter screen');

              // 3. Visible on non-battle overworld
              storage.chooseStarter(1);
              app.enterOverworld(true);
              // During welcome dialogue, dock is visible but disabled via canTriggerZoneWarp()
              assertEqual(warpDock.hidden, false, '#warp-dock visible during overworld dialogue');
              assertEqual(warpZoneBtn.disabled, true, '#warp-zone-btn disabled during dialogue');
              assertEqual(warpSafeBtn.disabled, true, '#warp-safe-btn disabled during dialogue');
              assertEqual(warpZoneBtn.getAttribute('aria-disabled'), 'true', '#warp-zone-btn aria-disabled during dialogue');

              app.closeDialogue();
              assertEqual(app.isWarpDockHidden(), false, 'isWarpDockHidden() false on clean overworld');
              assertEqual(warpDock.hidden, false, '#warp-dock visible on clean overworld');
              assertEqual(warpZoneBtn.disabled, false, '#warp-zone-btn enabled on clean overworld');
              assertEqual(warpSafeBtn.disabled, false, '#warp-safe-btn enabled on clean overworld');
              assertEqual(warpZoneLabel.textContent, 'Farm • Lv.2–7', '#warp-zone-label initializes to Farm • Lv.2–7');
              assertEqual(warpSafeLabel.textContent, 'Safe Zone', '#warp-safe-label displays Safe Zone');
              assertEqual(hudPlayerLevel.textContent, 'Lv.1', '#hud-player-level initializes to Lv.1');

              // 4. Hidden on Pokédex, Settings, Sky-Hop, encounterTransitioning & Battle; restored on close
              app.openPokedex('dex');
              assertEqual(app.isWarpDockHidden(), true, 'isWarpDockHidden() true when Pokédex opens');
              assertEqual(warpDock.hidden, true, '#warp-dock hidden when Pokédex opens');
              app.pokedex.close();
              assertEqual(warpDock.hidden, false, '#warp-dock restored when Pokédex closes');

              app.openSettings();
              assertEqual(warpDock.hidden, true, '#warp-dock hidden when Settings opens');
              app.closeSettings();
              assertEqual(warpDock.hidden, false, '#warp-dock restored when Settings closes');

              storage.unlockArcade();
              app.openMinigame();
              assertEqual(warpDock.hidden, true, '#warp-dock hidden when Sky-Hop opens');
              app.minigame.close();
              assertEqual(warpDock.hidden, false, '#warp-dock restored when Sky-Hop closes');

              app.encounterTransitioning = true;
              app.syncControlVisibility();
              assertEqual(warpDock.hidden, true, '#warp-dock hidden during encounterTransitioning');
              app.encounterTransitioning = false;
              app.syncControlVisibility();
              assertEqual(warpDock.hidden, false, '#warp-dock restored after encounterTransitioning');

              app.warpTransitioning = true;
              app.syncWarpDock();
              assertEqual(warpZoneBtn.disabled, true, '#warp-zone-btn disabled during warpTransitioning');
              assertEqual(warpSafeBtn.disabled, true, '#warp-safe-btn disabled during warpTransitioning');
              app.warpTransitioning = false;
              app.syncWarpDock();
              assertEqual(warpZoneBtn.disabled, false, '#warp-zone-btn re-enabled after warpTransitioning');

              const startBattleP = app.battle.start({ enemy: createPokemon(16, 4), biomeId: 'forest' });
              const flushT = setInterval(() => app.battle.finishTypewriter(), 15);
              try {
                await startBattleP;
              } finally {
                clearInterval(flushT);
              }
              app.syncControlVisibility();
              assertEqual(warpDock.hidden, true, '#warp-dock hidden when battle starts');
              assertEqual(window.getComputedStyle(warpDock).display, 'none', 'body.in-battle forces #warp-dock display:none');
              app.battle.stop({ outcome: 'escaped', faintedAll: false });
              app.syncControlVisibility();
              app.syncOverworldPause();
              assertEqual(warpDock.hidden, false, '#warp-dock restored when battle stops');

              // 5. #hud-player-level & #warp-zone-label update from Player Level progression (not party mon levels)
              const prof = storage.getActiveProfile();
              prof.team[0].level = 48;
              app.refreshHud();
              assertEqual(hudPlayerLevel.textContent, 'Lv.1', '#hud-player-level ignores Lv.48 starter');
              assertEqual(warpZoneLabel.textContent, 'Farm • Lv.2–7', '#warp-zone-label ignores Lv.48 starter');

              prof.badges = ['meadow', 'flame', 'cascade', 'thunder']; // 4*60 = 240 XP
              prof.shrinesCleared = ['forest_shrine', 'cave_shrine']; // 2*85 = 170 XP
              prof.stats.battlesWon = 1; // +14 -> 424 XP -> Lv.8
              syncProfilePlayerProgression(prof);
              app.refreshHud();
              assertEqual(hudPlayerLevel.textContent, 'Lv.8', '#hud-player-level updates to Lv.8');
              assertEqual(warpZoneLabel.textContent, 'Farm • Lv.5–10', '#warp-zone-label updates to Farm • Lv.5–10 for Player Lv.8 with badges');

              // 6. Pointer isolation on #warp-dock, #warp-zone-btn & #warp-safe-btn
              for (const targetEl of [warpDock, warpZoneBtn, warpSafeBtn]) {
                const r = targetEl.getBoundingClientRect();
                targetEl.dispatchEvent(new PointerEvent('pointerdown', {
                  pointerId: 12, button: 0, clientX: r.left + 4, clientY: r.top + 4, bubbles: true, cancelable: true,
                }));
                targetEl.dispatchEvent(new PointerEvent('pointerup', {
                  pointerId: 12, button: 0, clientX: r.left + 4, clientY: r.top + 4, bubbles: true, cancelable: true,
                }));
              }
              assertEqual(app.overworld.getTouchNavigationState().autoPathLength, 0, 'pointer events on #warp-dock never leak walk to canvas');

              // 7. #compass-hud opens Guide tab & Trainer tab shows Player Level + Trainer XP
              compassHud.click();
              assertEqual(app.pokedex.isOpen(), true, 'clicking #compass-hud opens Pokédex');
              assertEqual(app.pokedex.activeTab, 'guide', 'clicking #compass-hud opens Guide tab');
              app.openPokedex('trainer');
              const trainerText = document.getElementById('pokedex-body')?.textContent || '';
              assert(trainerText.includes('Player Level') && trainerText.includes('Lv.8'), 'Trainer tab shows Player Level Lv.8');
              assert(trainerText.includes('Trainer XP') && trainerText.includes('424 XP'), 'Trainer tab shows Trainer XP total');
              app.pokedex.close();

              // 8. Zero bounding-box overlap among #warp-dock, #compass-hud, #biome-banner & #interact-pill
              for (const [w, h] of [[1280, 720], [1024, 768], [768, 1024], [390, 844]]) {
                app.cabinetEl.style.width = `${w}px`;
                app.cabinetEl.style.height = `${h}px`;
                app.handleBiomeChange(BIOMES.rift, true);
                app.handleInteractHint({ label: '💬 Read Sign' });
                app.syncWarpDock();
                await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

                const boxes = {
                  warpDock: rectOf('#warp-dock'),
                  compass: rectOf('#compass-hud'),
                  banner: rectOf('#biome-banner'),
                  interact: rectOf('#interact-pill'),
                };
                assert(
                  Boolean(boxes.warpDock && boxes.compass && boxes.banner && boxes.interact),
                  `${w}x${h}: all 4 overworld HUD overlays visible`,
                );
                const pairs = [
                  ['warpDock', 'compass'],
                  ['warpDock', 'banner'],
                  ['warpDock', 'interact'],
                  ['compass', 'banner'],
                  ['compass', 'interact'],
                  ['banner', 'interact'],
                ];
                for (const [aName, bName] of pairs) {
                  assertEqual(
                    overlaps(boxes[aName], boxes[bName]),
                    false,
                    `${w}x${h}: #${aName} must not overlap #${bName}`,
                  );
                }
              }
            } finally {
              restoreAppFromSnapshot(app, snap);
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
