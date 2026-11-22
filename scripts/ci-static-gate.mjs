#!/usr/bin/env node
/**
 * Zero-dependency static CI gate for Pokémon: Starlight Island.
 *
 * Default mode is strict (exits 1 if any check fails).
 * Pass `--pre-merge` only when dry-running on a pre-reconciliation branch
 * before sprint11/ergonomics merges its sw.js v11 cache bump.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const PRE_MERGE = process.argv.includes('--pre-merge');

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CONFLICT_LINE_RE = new RegExp(
  `^(?:${'<'.repeat(7)}(?:\\s.*)?|${'='.repeat(7)}|${'>'.repeat(7)}(?:\\s.*)?)$`,
);

const LEGACY_DPAD_IDS = [
  'dpad',
  'btn-a',
  'btn-b',
  'quick-dex-btn',
  'hud-btn-pad',
  'setting-pad-btn',
];

const EXPECTED_ICON_DIMS = {
  'icon-192.png': [192, 192],
  'icon-512.png': [512, 512],
  'apple-touch-icon.png': [180, 180],
};

const POST_SHRINE_ROAMER_IDS = [
  144, 145, 146, 151, 385, 248, 251, 384, 249, 243, 244, 382, 245, 483, 486, 493, 150, 250, 643, 644, 649,
  717, 718, 719, 720, 721, 792, 800, 801, 802, 807, 808, 889, 890, 893, 898, 905, 1007, 1008, 1009, 1010, 1017, 1025,
];

function createReporter() {
  const results = [];
  let warnings = 0;

  return {
    pass(name, detail = '') {
      results.push({ name, passed: true, detail });
      console.log(`[PASS] ${name}${detail ? ` — ${detail}` : ''}`);
    },
    fail(name, detail = '') {
      results.push({ name, passed: false, detail });
      console.error(`[FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
    },
    warn(name, detail = '') {
      warnings += 1;
      console.warn(`[WARN] ${name}${detail ? ` — ${detail}` : ''}`);
    },
    assert(condition, name, detail = '') {
      if (condition) {
        this.pass(name, detail);
      } else {
        this.fail(name, detail);
      }
      return Boolean(condition);
    },
    summary() {
      const passed = results.filter((r) => r.passed).length;
      const failed = results.length - passed;
      return { passed, failed, total: results.length, warnings };
    },
  };
}

function listFilesWithExts(relDir, exts) {
  const absDir = path.join(ROOT_DIR, relDir);
  if (!fs.existsSync(absDir)) return [];
  const out = [];
  const stack = [absDir];
  while (stack.length > 0) {
    const dir = stack.pop();
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && exts.includes(path.extname(entry.name).toLowerCase())) {
        out.push(path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/'));
      }
    }
  }
  return out.sort();
}

function readPngHeader(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 24) {
    return { valid: false, reason: `file too small (${buf.length} bytes)` };
  }
  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { valid: false, reason: 'invalid PNG signature' };
  }
  const ihdrTag = buf.toString('ascii', 12, 16);
  if (ihdrTag !== 'IHDR') {
    return { valid: false, reason: `expected IHDR chunk, got ${ihdrTag}` };
  }
  return {
    valid: true,
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

function checkSyntax(reporter) {
  const targets = [
    'sw.js',
    ...listFilesWithExts('js', ['.js', '.mjs']),
    ...listFilesWithExts('tests', ['.js', '.mjs']),
    ...listFilesWithExts('scripts', ['.js', '.mjs']),
  ];
  const uniqueTargets = [...new Set(targets)].filter((rel) => fs.existsSync(path.join(ROOT_DIR, rel)));

  const syntaxErrors = [];
  for (const rel of uniqueTargets) {
    try {
      execFileSync(process.execPath, ['--check', path.join(ROOT_DIR, rel)], {
        stdio: 'pipe',
        encoding: 'utf8',
      });
    } catch (err) {
      const msg = (err.stderr || err.message || String(err)).trim();
      syntaxErrors.push(`${rel}: ${msg}`);
    }
  }

  reporter.assert(
    syntaxErrors.length === 0,
    'Syntax check (node --check)',
    syntaxErrors.length === 0
      ? `${uniqueTargets.length} JS/MJS files valid`
      : syntaxErrors.join(' | '),
  );
}

function checkConflictMarkers(reporter) {
  const filesToScan = [
    'index.html',
    'manifest.json',
    'sw.js',
    'README.md',
    ...listFilesWithExts('css', ['.css']),
    ...listFilesWithExts('js', ['.js']),
    ...listFilesWithExts('tests', ['.js']),
    ...listFilesWithExts('scripts', ['.mjs']),
  ];
  const uniqueFiles = [...new Set(filesToScan)].filter((rel) => fs.existsSync(path.join(ROOT_DIR, rel)));

  const hits = [];
  for (const rel of uniqueFiles) {
    const content = fs.readFileSync(path.join(ROOT_DIR, rel), 'utf8');
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (CONFLICT_LINE_RE.test(lines[i])) {
        hits.push(`${rel}:${i + 1}`);
      }
    }
  }

  reporter.assert(
    hits.length === 0,
    'Zero git conflict markers',
    hits.length === 0 ? `${uniqueFiles.length} text files clean` : `found at ${hits.join(', ')}`,
  );
}

function checkManifestAndIcons(reporter) {
  const manifestPath = path.join(ROOT_DIR, 'manifest.json');
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    reporter.pass('manifest.json valid JSON');
  } catch (err) {
    reporter.fail('manifest.json valid JSON', err.message);
    return;
  }

  const desc = typeof manifest.description === 'string' ? manifest.description : '';
  const has1025Copy = !desc.includes('110 ') && desc.includes('1,025');
  if (has1025Copy) {
    reporter.pass('manifest.json 1,025 description', 'does not contain "110 " and includes "1,025"');
  } else {
    reporter.fail('manifest.json 1,025 description', `description="${desc}"`);
  }

  const iconFiles = listFilesWithExts('assets/icons', ['.png']);
  const iconFailures = [];
  for (const rel of iconFiles) {
    const base = path.basename(rel);
    const info = readPngHeader(path.join(ROOT_DIR, rel));
    if (!info.valid) {
      iconFailures.push(`${rel}: ${info.reason}`);
      continue;
    }
    const expected = EXPECTED_ICON_DIMS[base];
    if (expected) {
      if (info.width !== expected[0] || info.height !== expected[1]) {
        iconFailures.push(`${rel}: expected ${expected[0]}x${expected[1]}, got ${info.width}x${info.height}`);
      }
    } else if (info.width <= 0 || info.height <= 0) {
      iconFailures.push(`${rel}: non-positive dimensions ${info.width}x${info.height}`);
    }
  }

  for (const requiredName of Object.keys(EXPECTED_ICON_DIMS)) {
    const rel = `assets/icons/${requiredName}`;
    if (!iconFiles.includes(rel)) {
      iconFailures.push(`${rel}: missing required PNG icon`);
    }
  }

  reporter.assert(
    iconFailures.length === 0,
    'PWA PNG icons (signature + IHDR dimensions)',
    iconFailures.length === 0
      ? iconFiles.map((f) => {
          const [w, h] = EXPECTED_ICON_DIMS[path.basename(f)] || [];
          return `${path.basename(f)}(${w}x${h})`;
        }).join(', ')
      : iconFailures.join(' | '),
  );
}

function extractCoreShellUrls(swText) {
  const match = swText.match(/const\s+CORE_SHELL_URLS\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) return null;
  const parsed = [];
  const itemRe = /['"]([^'"]+)['"]/g;
  let m;
  while ((m = itemRe.exec(match[1])) !== null) {
    parsed.push(m[1]);
  }
  return parsed;
}

function checkServiceWorkerAndReadme(reporter) {
  const swText = fs.readFileSync(path.join(ROOT_DIR, 'sw.js'), 'utf8');
  const readmeText = fs.readFileSync(path.join(ROOT_DIR, 'README.md'), 'utf8');

  const hasSwV11 = swText.includes('starlight-shell-v11') && swText.includes('starlight-assets-v11');
  if (hasSwV11) {
    reporter.pass('sw.js v11 cache constants', 'starlight-shell-v11 & starlight-assets-v11');
  } else if (PRE_MERGE) {
    const hasV10 = swText.includes('starlight-shell-v10') && swText.includes('starlight-assets-v10');
    if (hasV10) {
      reporter.warn(
        'sw.js v11 cache constants (--pre-merge)',
        'currently v10; v11 lands when sprint11/ergonomics merges on sprint11/ci-staging',
      );
    } else {
      reporter.fail('sw.js cache constants', 'neither v11 nor v10 found');
    }
  } else {
    reporter.fail('sw.js v11 cache constants', 'missing starlight-shell-v11 or starlight-assets-v11');
  }

  if (readmeText.includes('starlight-shell-v11')) {
    reporter.pass('README.md starlight-shell-v11 reference');
  } else if (PRE_MERGE && readmeText.includes('starlight-shell-v10')) {
    reporter.warn(
      'README.md starlight-shell-v11 reference (--pre-merge)',
      'currently v10; v11 lands when sprint11/ergonomics merges on sprint11/ci-staging',
    );
  } else {
    reporter.fail('README.md starlight-shell-v11 reference', 'missing starlight-shell-v11');
  }

  const coreUrls = extractCoreShellUrls(swText);
  if (!coreUrls) {
    reporter.fail('sw.js CORE_SHELL_URLS parse', 'could not locate CORE_SHELL_URLS array');
    return;
  }

  const diskRuntimeFiles = [
    './index.html',
    './manifest.json',
    ...listFilesWithExts('css', ['.css']).map((p) => `./${p}`),
    ...listFilesWithExts('js', ['.js']).map((p) => `./${p}`),
    ...listFilesWithExts('assets/icons', ['.png']).map((p) => `./${p}`),
    ...listFilesWithExts('assets/fallback', ['.svg']).map((p) => `./${p}`),
  ].sort();

  const seenUrls = new Set();
  const duplicateUrls = [];
  for (const url of coreUrls) {
    if (seenUrls.has(url)) duplicateUrls.push(url);
    seenUrls.add(url);
  }

  const forbiddenUrls = coreUrls.filter(
    (u) => u.startsWith('./scripts/') || u.startsWith('./tests/') || u.startsWith('./.github/'),
  );
  const missingFromSw = diskRuntimeFiles.filter((u) => !seenUrls.has(u));
  const diskSet = new Set(diskRuntimeFiles);
  const extraInSw = coreUrls.filter((u) => u !== './' && !diskSet.has(u));

  const problems = [];
  if (duplicateUrls.length > 0) problems.push(`duplicates: ${duplicateUrls.join(', ')}`);
  if (forbiddenUrls.length > 0) problems.push(`forbidden non-runtime URLs: ${forbiddenUrls.join(', ')}`);
  if (missingFromSw.length > 0) problems.push(`missing on-disk files: ${missingFromSw.join(', ')}`);
  if (extraInSw.length > 0) problems.push(`stale/unexpected entries: ${extraInSw.join(', ')}`);

  reporter.assert(
    problems.length === 0,
    'sw.js CORE_SHELL_URLS 100% disk parity',
    problems.length === 0
      ? `${coreUrls.length} entries match ${diskRuntimeFiles.length} runtime files`
      : problems.join(' | '),
  );
}

function checkIndexHtml(reporter) {
  const htmlText = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  const foundLegacy = [];
  for (const legacyId of LEGACY_DPAD_IDS) {
    const escaped = legacyId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\bid\\s*=\\s*["']${escaped}["']`, 'i');
    if (re.test(htmlText)) {
      foundLegacy.push(legacyId);
    }
  }

  reporter.assert(
    foundLegacy.length === 0,
    'index.html free of legacy D-Pad IDs',
    foundLegacy.length === 0 ? '0 legacy D-Pad IDs present' : `found id=${foundLegacy.join(', ')}`,
  );
}

async function checkGameModules(reporter) {
  const config = await import(pathToFileURL(path.join(ROOT_DIR, 'js/config.js')).href);
  const world = await import(pathToFileURL(path.join(ROOT_DIR, 'js/world-data.js')).href);
  const pokemon = await import(pathToFileURL(path.join(ROOT_DIR, 'js/pokemon.js')).href);

  const countChecks = [
    ['SPECIES', Object.keys(config.SPECIES || {}).length, 1025],
    ['TYPES', Object.keys(config.TYPES || {}).length, 18],
    ['MOVES', Object.keys(config.MOVES || {}).length, 128],
    ['ABILITIES', Object.keys(config.ABILITIES || {}).length, 38],
    ['EVOLUTION_ITEMS', Object.keys(config.EVOLUTION_ITEMS || {}).length, 16],
    ['BADGES', (config.BADGES || []).length, 28],
    ['BIOMES', Object.keys(world.BIOMES || {}).length, 18],
    ['SHRINES', Object.keys(world.SHRINES || {}).length, 20],
    ['CHESTS', Object.keys(world.CHESTS || {}).length, 36],
    ['NPCS', Object.keys(world.NPCS || {}).length, 23],
    ['FIELD_QUESTS', (world.FIELD_QUESTS || []).length, 23],
    ['RIVAL_TRAINERS', Object.keys(world.RIVAL_TRAINERS || {}).length, 17],
    ['LANDMARKS', Object.keys(world.LANDMARKS || {}).length, 20],
    ['SIGNPOSTS', Object.keys(world.SIGNPOSTS || {}).length, 18],
  ];

  const countFailures = countChecks
    .filter(([, actual, expected]) => actual !== expected)
    .map(([label, actual, expected]) => `${label}=${actual} (expected ${expected})`);

  reporter.assert(
    countFailures.length === 0,
    'Core game dataset counts',
    countFailures.length === 0
      ? '1025 SPECIES, 18 TYPES, 128 MOVES, 38 ABILITIES, 16 GEMS, 28 BADGES, 18 BIOMES, 20 SHRINES, 36 CHESTS, 23 NPCS, 23 QUESTS, 17 RIVALS, 20 LANDMARKS, 18 SIGNPOSTS'
      : countFailures.join(', '),
  );

  // Validate 100x84 WORLD_MAP geometry
  const mapRowsOk =
    world.WORLD_COLS === 100
    && world.WORLD_ROWS === 84
    && Array.isArray(world.WORLD_MAP)
    && world.WORLD_MAP.length === 84
    && world.WORLD_MAP.every((row) => Array.isArray(row) && row.length === 100);
  reporter.assert(mapRowsOk, '100x84 WORLD_MAP dimensions', `${world.WORLD_COLS}x${world.WORLD_ROWS}`);

  // 100% BFS walkability from (8, 15) to all interactive targets + SECRET_ARCADE_SPOT
  const spawnX = 8;
  const spawnY = 15;
  const spawnWalkable = world.isTileWalkableAt(spawnX, spawnY);
  const visited = new Set(spawnWalkable ? [`${spawnX},${spawnY}`] : []);
  const queue = spawnWalkable ? [[spawnX, spawnY]] : [];

  for (let head = 0; head < queue.length; head++) {
    const [cx, cy] = queue[head];
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      const k = `${nx},${ny}`;
      if (!visited.has(k) && world.isTileWalkableAt(nx, ny)) {
        visited.add(k);
        queue.push([nx, ny]);
      }
    }
  }

  const isReachableTarget = (coordKey) => {
    if (visited.has(coordKey)) return true;
    const [x, y] = coordKey.split(',').map(Number);
    return [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => visited.has(`${x + dx},${y + dy}`));
  };

  const unreachableTargets = [];
  const targetMaps = [
    ['shrine', world.SHRINES],
    ['chest', world.CHESTS],
    ['npc', world.NPCS],
    ['rival', world.RIVAL_TRAINERS],
    ['landmark', world.LANDMARKS],
    ['signpost', world.SIGNPOSTS],
  ];
  for (const [kind, mapObj] of targetMaps) {
    for (const key of Object.keys(mapObj || {})) {
      if (!isReachableTarget(key)) {
        unreachableTargets.push(`${kind}:${key}`);
      }
    }
  }
  const arcadeKey = world.SECRET_ARCADE_SPOT?.key || `${world.SECRET_ARCADE_SPOT?.x},${world.SECRET_ARCADE_SPOT?.y}`;
  if (!arcadeKey || !isReachableTarget(arcadeKey)) {
    unreachableTargets.push(`arcade:${arcadeKey}`);
  }

  reporter.assert(
    spawnWalkable && unreachableTargets.length === 0,
    '100% BFS walkability from (8, 15)',
    unreachableTargets.length === 0
      ? `${visited.size} walkable tiles; all 134 interactive targets + SECRET_ARCADE_SPOT(${arcadeKey}) reachable`
      : `unreachable: ${unreachableTargets.join(', ')}`,
  );

  // 100% 1..1025 National Dex reachability
  const reachableSpecies = new Set((config.STARTER_IDS || []).map(Number));
  for (const biome of Object.values(world.BIOMES || {})) {
    for (const enc of biome.encounters || []) {
      reachableSpecies.add(Number(enc.id));
    }
  }
  for (const shrine of Object.values(world.SHRINES || {})) {
    reachableSpecies.add(Number(shrine.guardianId));
  }
  for (const roamerId of POST_SHRINE_ROAMER_IDS) {
    reachableSpecies.add(roamerId);
  }

  let evoChanged = true;
  while (evoChanged) {
    evoChanged = false;
    for (const [fromKey, rules] of Object.entries(config.EVOLUTIONS || {})) {
      const fromId = Number(fromKey);
      for (const rule of rules || []) {
        const toId = Number(rule.to);
        if (reachableSpecies.has(fromId) && !reachableSpecies.has(toId)) {
          reachableSpecies.add(toId);
          evoChanged = true;
        }
      }
    }
  }

  const missingSpecies = [];
  for (let id = 1; id <= 1025; id++) {
    if (!config.SPECIES?.[id] || !reachableSpecies.has(id)) {
      missingSpecies.push(id);
    }
  }

  const starterSample = pokemon.createPokemon?.(1, 5);
  const sampleStatsOk = Boolean(
    starterSample
    && Number.isFinite(starterSample.maxHp)
    && starterSample.maxHp > 0
    && Number.isFinite(starterSample.atk)
    && starterSample.atk > 0,
  );

  reporter.assert(
    missingSpecies.length === 0 && sampleStatsOk,
    '100% 1..1025 National Dex reachability & Pokemon module sanity',
    missingSpecies.length === 0 && sampleStatsOk
      ? `${reachableSpecies.size}/1025 species reachable via starters/biomes/shrines/roamers/evolutions`
      : `missing=${missingSpecies.slice(0, 10).join(',')} sampleStatsOk=${sampleStatsOk}`,
  );
}

async function checkEconomyAndCheerInvariants(reporter) {
  const storageMod = await import(pathToFileURL(path.join(ROOT_DIR, 'js/storage.js')).href);
  const pokemonMod = await import(pathToFileURL(path.join(ROOT_DIR, 'js/pokemon.js')).href);
  const minigameMod = await import(pathToFileURL(path.join(ROOT_DIR, 'js/minigame.js')).href);

  const failures = [];
  const check = (cond, msg) => {
    if (!cond) failures.push(msg);
  };

  check(storageMod.MAX_CHEER_CHARGES === 3, `MAX_CHEER_CHARGES=${storageMod.MAX_CHEER_CHARGES} !== 3`);
  check(storageMod.STEPS_PER_CHEER_CHARGE === 25, `STEPS_PER_CHEER_CHARGE=${storageMod.STEPS_PER_CHEER_CHARGE} !== 25`);

  const store = new storageMod.StorageManager('__ci_static_economy_gate__');
  store.resetAllProgress();
  store.selectTrainer('violet');
  const starter = store.chooseStarter(1); // Bulbasaur Lv.5
  const profile = store.getActiveProfile();

  check(profile?.bag?.starShards === 0, `fresh starShards=${profile?.bag?.starShards} !== 0`);
  check(profile?.bag?.cheerCharges === 0, `fresh cheerCharges=${profile?.bag?.cheerCharges} !== 0`);
  check(profile?.cheerStepProgress === 0, `fresh cheerStepProgress=${profile?.cheerStepProgress} !== 0`);
  check(profile?.stats?.cheers === 0, `fresh stats.cheers=${profile?.stats?.cheers} !== 0`);

  // Non-finite / negative / boolean currency rejection
  store.addStarShards(Infinity);
  store.addStarShards(-Infinity);
  store.addStarShards(NaN);
  store.addStarShards(-5);
  store.addStarShards(true);
  check(profile.bag.starShards === 0, `non-finite addStarShards mutated shards=${profile.bag.starShards}`);

  store.addRewards({
    potions: Infinity,
    greatBalls: NaN,
    starBalls: -3,
    starShards: Infinity,
    cheerCharges: Infinity,
    gems: { sun_gem: Infinity, thunder_gem: NaN },
  });
  check(profile.bag.potions === 5, `non-finite addRewards mutated potions=${profile.bag.potions}`);
  check(profile.bag.starShards === 0, `non-finite addRewards mutated shards=${profile.bag.starShards}`);
  check(profile.bag.cheerCharges === 0, `non-finite addRewards mutated cheers=${profile.bag.cheerCharges}`);
  check(profile.bag.gems.sun_gem === 0 && profile.bag.gems.thunder_gem === 0, 'non-finite addRewards mutated gems');

  const repaired = storageMod.validateAndRepairProfile({
    trainerId: 'violet',
    bag: { potions: Infinity, greatBalls: -2, starBalls: NaN, starShards: Infinity, cheerCharges: Infinity, gems: { sun_gem: Infinity } },
    cheerStepProgress: Infinity,
  }, 'violet');
  check(
    repaired.bag.potions === 0
      && repaired.bag.greatBalls === 0
      && repaired.bag.starBalls === 0
      && repaired.bag.starShards === 0
      && repaired.bag.cheerCharges === 0
      && repaired.bag.gems.sun_gem === 0
      && repaired.cheerStepProgress === 0,
    'validateAndRepairProfile failed to clamp Infinity/NaN/negatives to 0',
  );

  // cheerPokemon zero-charge & max-bond guards
  const zeroCheerRes = store.cheerPokemon(starter.uid);
  check(
    zeroCheerRes?.cheered === false && zeroCheerRes?.reason === 'insufficient_cheers',
    `expected insufficient_cheers, got ${JSON.stringify(zeroCheerRes)}`,
  );
  check(starter.bond === 20, `zero-charge cheer mutated bond to ${starter.bond}`);

  store.addCheerCharges(2);
  starter.bond = 100;
  const maxBondRes = store.cheerPokemon(starter.uid);
  check(
    maxBondRes?.cheered === false && maxBondRes?.reason === 'max_bond' && profile.bag.cheerCharges === 2,
    `max_bond guard failed (${JSON.stringify(maxBondRes)}, cheers=${profile.bag.cheerCharges})`,
  );

  // upgradePokemon unowned & insufficient shards guards
  const unowned = pokemonMod.createPokemon(4, 5);
  const unownedUp = store.upgradePokemon(unowned);
  check(unownedUp?.upgraded === false && unownedUp?.reason === 'not_found', 'upgradePokemon accepted unowned mon');
  const brokeUp = store.upgradePokemon(starter.uid);
  check(brokeUp?.upgraded === false && brokeUp?.reason === 'insufficient_shards', 'upgradePokemon accepted 0 shards');

  // evolvePokemon invalid, under-level, and gemless guards
  const underLevelEvo = store.evolvePokemon(starter.uid, 2);
  const wrongTargetEvo = store.evolvePokemon(starter.uid, 25);
  const pika = pokemonMod.createPokemon(25, 10);
  store.recordCaught(pika);
  const gemlessItemEvo = store.evolvePokemon(pika.uid, 26, 'thunder_gem');
  const omittedItemEvo = store.evolvePokemon(pika.uid, 26);
  const wrongGemEvo = store.evolvePokemon(pika.uid, 26, 'sun_gem');
  check(
    underLevelEvo === null
      && wrongTargetEvo === null
      && gemlessItemEvo === null
      && omittedItemEvo === null
      && wrongGemEvo === null,
    'evolvePokemon failed to reject invalid/gemless/under-level evolutions',
  );

  // StarlightMinigame.computeRewards <60 & non-finite guard
  const mg = new minigameMod.StarlightMinigame({ storage: store, audio: null });
  for (const badScore of [0, 59, -10, NaN, Infinity]) {
    const r = mg.computeRewards(badScore, 5);
    check(
      r.starShards === 0 && r.potions === 0 && !r.greatBalls && !r.starBalls && !r.cheerCharges && !r.gems,
      `computeRewards(${badScore}) leaked rewards: ${JSON.stringify(r)}`,
    );
  }
  const r60 = mg.computeRewards(60, 1);
  const r120 = mg.computeRewards(120, 1);
  check(r60.starShards === 1 && r60.potions === 1 && !r60.cheerCharges, `computeRewards(60) unexpected: ${JSON.stringify(r60)}`);
  check(r120.starShards === 2 && r120.potions === 1 && r120.cheerCharges === 1, `computeRewards(120) unexpected: ${JSON.stringify(r120)}`);

  // pokedex.js zero unguarded gainBond cheer fallbacks
  const pokedexText = fs.readFileSync(path.join(ROOT_DIR, 'js/pokedex.js'), 'utf8');
  const hasUnguardedGainBond = /\.gainBond\s*\(/.test(pokedexText);
  check(!hasUnguardedGainBond, 'js/pokedex.js contains unguarded gainBond call');

  reporter.assert(
    failures.length === 0,
    'Economy & Buddy Cheer invariants',
    failures.length === 0
      ? 'MAX_CHEER_CHARGES=3, STEPS_PER_CHEER_CHARGE=25, 0-start bag, Infinity/NaN rejected, Cheer/Evo/Minigame guards enforced, 0 gainBond fallbacks in pokedex.js'
      : failures.join(' | '),
  );
}

async function main() {
  console.log(`=== Pokémon: Starlight Island — Static CI Gate (${PRE_MERGE ? 'pre-merge' : 'strict'}) ===`);
  const reporter = createReporter();

  checkSyntax(reporter);
  checkConflictMarkers(reporter);
  checkManifestAndIcons(reporter);
  checkServiceWorkerAndReadme(reporter);
  checkIndexHtml(reporter);
  await checkGameModules(reporter);
  await checkEconomyAndCheerInvariants(reporter);

  const { passed, failed, total, warnings } = reporter.summary();
  console.log(`=== Static Gate Result: ${passed}/${total} passed, ${failed} failed, ${warnings} warnings ===`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error('[FATAL] Static CI gate crashed:', err);
  process.exitCode = 1;
});
