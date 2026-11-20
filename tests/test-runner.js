// Zero-Dependency Automated Test Suite for Pokémon: Starlight Island
// Run manually via `await window.runGameTests()` in DevTools console or automatically via `?test=true`

import { BADGES, MOVES, SPECIES, TYPE_CHART } from '../js/config.js';
import {
  Pokemon,
  attachPokemonSprite,
  calculateCatchAttempt,
  calculateDamage,
  createPokemon,
  generateSilhouetteDataUri,
  getTypeEffectiveness,
} from '../js/pokemon.js';
import { StorageManager } from '../js/storage.js';
import { AudioEngine, THEMES } from '../js/audio.js';
import { BattleEngine } from '../js/battle.js';

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
            const testAudio = new AudioEngine();
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
              testAudio.stopBGM();
              if (testAudio.ctx && typeof testAudio.ctx.close === 'function') {
                await testAudio.ctx.close().catch(() => {});
              }
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
            try {
              window.localStorage.removeItem(TEST_KEY);
              const store = new StorageManager(TEST_KEY);
              store.selectTrainer('violet'); // unstarted: team is empty
              let endedWith = null;
              const engine = new BattleEngine({
                storage: store,
                audio: { playMenuBlip() {} },
                onBattleEnd: (res) => {
                  endedWith = res;
                },
              });
              engine.start({ enemy: createPokemon(25, 5), biomeId: 'forest' });
              assertEqual(engine.active, false, 'BattleEngine does not stay stuck active on empty team');
              assertEqual(endedWith?.outcome, 'escaped', 'BattleEngine invokes onBattleEnd cleanly');
              assert(BADGES.length === 6 && Object.keys(SPECIES).length === 18, 'Config roster intact');
            } finally {
              window.localStorage.removeItem(TEST_KEY);
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
