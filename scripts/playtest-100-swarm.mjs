#!/usr/bin/env node
/**
 * Autonomous 100-Playtester Swarm Harness for Pokémon: Starlight Island.
 *
 * Launches isolated Playwright Chromium contexts across 10 behavioral cohorts (seeds 1..100),
 * alternating Violet & Ozias and cycling all 6 CI viewports:
 *   1. Chaos Kid Tapper (1..10)
 *   2. Boss & Shrine Rusher (11..20)
 *   3. Collector & 1,025-Dex Explorer (21..30)
 *   4. Overworld Pathfind Torturer (31..40)
 *   5. Sky-Hop Arcade Grinder (41..50)
 *   6. Legacy v1 Save & Profile Switcher (51..60)
 *   7. Offline PWA & Fallback Stress Tester (61..70)
 *   8. Tactical Strategist (71..80)
 *   9. Viewport & Orientation Flipper (81..90)
 *  10. Repeat Defeat-Reset Loop Tester (91..100)
 *
 * Mandatory rule: every seed must fight in real combat until all squad Pokémon faint
 * (`faintedAll: true`), cleanly trigger & dismiss Professor Willow's rescue reset at (8, 15),
 * verify full HP/PP, clean UI state, saved localStorage, and walkable control, while enforcing
 * a soft-lock/hang watchdog (>8s battle stall, >80 turns, unresponsive modal, failed reset).
 *
 * Usage:
 *   node scripts/playtest-100-swarm.mjs --concurrency=8 --seeds=1..100 --out=<tmpPath>
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  BIOMES,
  CHESTS,
  GAME_META,
  LANDMARKS,
  NPCS,
  RIVAL_TRAINERS,
  SECRET_ARCADE_SPOT,
  SHRINES,
  SIGNPOSTS,
  SPECIES,
  WORLD_COLS,
  WORLD_MAP,
  WORLD_ROWS,
  getBiomeAt,
  getTileDepthInfo,
  isTileWalkableAt,
} from '../js/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
};

const EXTERNAL_SPRITE_HOST_RE = /(?:^|\.)(?:pokeapi\.co|raw\.githubusercontent\.com|pokemondb\.net)$/i;

const VIEWPORTS = [
  { name: 'android-390x844', width: 390, height: 844, hasTouch: true, isMobile: true },
  { name: 'android-412x915', width: 412, height: 915, hasTouch: true, isMobile: true },
  { name: 'landscape-667x375', width: 667, height: 375, hasTouch: true, isMobile: true },
  { name: 'tablet-768x1024', width: 768, height: 1024, hasTouch: true, isMobile: true },
  { name: 'tablet-1024x768', width: 1024, height: 768, hasTouch: true, isMobile: true },
  { name: 'chromebook-1280x720', width: 1280, height: 720, hasTouch: false, isMobile: false },
];

const COHORT_NAMES = {
  1: 'Chaos Kid Tapper',
  2: 'Boss & Shrine Rusher',
  3: 'Collector & 1,025-Dex Explorer',
  4: 'Overworld Pathfind Torturer',
  5: 'Sky-Hop Arcade Grinder',
  6: 'Legacy v1 Save & Profile Switcher',
  7: 'Offline PWA & Fallback Stress Tester',
  8: 'Tactical Strategist',
  9: 'Viewport & Orientation Flipper',
  10: 'Repeat Defeat-Reset Loop Tester',
};

const STARTER_CHOICES = ['Bulbasaur', 'Charmander', 'Squirtle'];

function isExternalProbeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl);
    return EXTERNAL_SPRITE_HOST_RE.test(parsed.hostname);
  } catch {
    return false;
  }
}

function getPlaywrightEntrypoint(pkgDir) {
  for (const rel of ['index.mjs', 'index.js']) {
    const candidate = path.join(pkgDir, rel);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function collectPlaywrightCandidates() {
  const dirs = [];
  const pushPkgDir = (dir) => {
    if (dir && !dirs.includes(dir)) dirs.push(dir);
  };

  if (process.env.PLAYWRIGHT_PATH) {
    const raw = path.resolve(process.env.PLAYWRIGHT_PATH);
    if (fs.existsSync(raw)) {
      pushPkgDir(fs.statSync(raw).isDirectory() ? raw : path.dirname(raw));
    }
  }

  if (process.env.NODE_PATH) {
    for (const seg of process.env.NODE_PATH.split(path.delimiter).filter(Boolean)) {
      pushPkgDir(path.join(seg, 'playwright'));
      pushPkgDir(seg);
    }
  }

  const globalNodeModules = [];
  try {
    const npmRoot = execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['root', '-g'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 4000,
    }).trim();
    if (npmRoot) globalNodeModules.push(npmRoot);
  } catch {
    // Ignore npm lookup failures
  }

  const home = os.homedir();
  if (process.platform === 'win32') {
    if (process.env.APPDATA) globalNodeModules.push(path.join(process.env.APPDATA, 'npm', 'node_modules'));
    if (process.env.LOCALAPPDATA) {
      globalNodeModules.push(path.join(process.env.LOCALAPPDATA, 'Programs', 'nodejs', 'node_modules'));
    }
    globalNodeModules.push('C:\\Program Files\\nodejs\\node_modules');
  } else {
    globalNodeModules.push(
      '/usr/local/lib/node_modules',
      '/usr/lib/node_modules',
      path.join(home, '.npm-global', 'lib', 'node_modules'),
    );
  }

  for (const nm of globalNodeModules) {
    pushPkgDir(path.join(nm, 'playwright'));
  }

  const npxBases = [
    process.env.NPM_CONFIG_CACHE && path.join(process.env.NPM_CONFIG_CACHE, '_npx'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'npm-cache', '_npx'),
    process.env.APPDATA && path.join(process.env.APPDATA, 'npm-cache', '_npx'),
    path.join(home, '.npm', '_npx'),
    process.env.XDG_CACHE_HOME && path.join(process.env.XDG_CACHE_HOME, 'npm', '_npx'),
    path.join(home, '.cache', 'npm', '_npx'),
    '/root/.npm/_npx',
  ].filter(Boolean);

  for (const base of npxBases) {
    if (!fs.existsSync(base)) continue;
    let entries = [];
    try {
      entries = fs.readdirSync(base, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => {
          let mtimeMs = 0;
          try {
            mtimeMs = fs.statSync(path.join(base, d.name)).mtimeMs;
          } catch {
            mtimeMs = 0;
          }
          return { full: path.join(base, d.name), mtimeMs };
        })
        .sort((a, b) => b.mtimeMs - a.mtimeMs);
    } catch {
      continue;
    }
    for (const { full } of entries) {
      pushPkgDir(path.join(full, 'node_modules', 'playwright'));
    }
  }

  return dirs;
}

const unwrapPlaywright = (m) => (m?.chromium ? m : m?.default?.chromium ? m.default : null);

async function resolvePlaywright() {
  try {
    const mod = unwrapPlaywright(await import('playwright'));
    if (mod) return mod;
  } catch {
    // Fall through
  }

  const req = createRequire(import.meta.url);
  try {
    const resolved = req.resolve('playwright');
    const esmSibling = path.join(path.dirname(resolved), 'index.mjs');
    const candidates = fs.existsSync(esmSibling) ? [esmSibling, resolved] : [resolved];
    for (const entryPath of candidates) {
      try {
        const mod = unwrapPlaywright(await import(pathToFileURL(entryPath).href));
        if (mod) return mod;
      } catch {
        // Try next entrypoint
      }
    }
  } catch {
    // Fall through
  }

  for (const pkgDir of collectPlaywrightCandidates()) {
    const entry = getPlaywrightEntrypoint(pkgDir);
    if (!entry) continue;
    try {
      const mod = unwrapPlaywright(await import(pathToFileURL(entry).href));
      if (mod) return mod;
    } catch {
      // Try next candidate
    }
  }

  throw new Error('Could not resolve Playwright ESM runtime.');
}

function findCachedChromiumExecutable() {
  const explicit = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (explicit && fs.existsSync(explicit)) return explicit;

  const home = os.homedir();
  const cacheDirs = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'ms-playwright'),
    path.join(home, '.cache', 'ms-playwright'),
    path.join(home, 'Library', 'Caches', 'ms-playwright'),
  ].filter((d) => d && fs.existsSync(d));

  const relativeBinaries = process.platform === 'win32'
    ? [
        ['chrome-headless-shell-win64', 'chrome-headless-shell.exe'],
        ['chrome-win64', 'chrome.exe'],
        ['chrome-win', 'chrome.exe'],
      ]
    : process.platform === 'darwin'
      ? [
          ['chrome-headless-shell-mac-arm64', 'chrome-headless-shell'],
          ['chrome-headless-shell-mac-x64', 'chrome-headless-shell'],
          ['chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'],
        ]
      : [
          ['chrome-headless-shell-linux64', 'chrome-headless-shell'],
          ['chrome-linux64', 'chrome'],
          ['chrome-linux', 'chrome'],
        ];

  for (const cacheDir of cacheDirs) {
    let entries = [];
    try {
      entries = fs.readdirSync(cacheDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && /^chromium(?:_headless_shell)?-\d+$/.test(d.name))
        .map((d) => ({
          name: d.name,
          rev: Number(d.name.split('-').pop()) || 0,
          isShell: d.name.startsWith('chromium_headless_shell-'),
        }))
        .sort((a, b) => (b.rev - a.rev) || (Number(b.isShell) - Number(a.isShell)));
    } catch {
      continue;
    }
    for (const entry of entries) {
      for (const parts of relativeBinaries) {
        const candidate = path.join(cacheDir, entry.name, ...parts);
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  }
  return null;
}

async function launchChromium(pw, { headless = true } = {}) {
  const args = process.platform === 'linux'
    ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    : [];

  const explicit = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (explicit && fs.existsSync(explicit)) {
    return pw.chromium.launch({ headless, executablePath: explicit, args });
  }

  let defaultExec = null;
  try {
    defaultExec = pw.chromium.executablePath?.();
  } catch {
    defaultExec = null;
  }

  if (defaultExec && fs.existsSync(defaultExec)) {
    return pw.chromium.launch({ headless, args });
  }

  const cachedExec = findCachedChromiumExecutable();
  if (cachedExec) {
    return pw.chromium.launch({ headless, executablePath: cachedExec, args });
  }

  for (const channel of ['chrome', 'msedge']) {
    try {
      return await pw.chromium.launch({ headless, channel, args });
    } catch {
      // Try next channel
    }
  }

  return pw.chromium.launch({ headless, args });
}

function startStaticServer(rootDir) {
  const resolvedRoot = path.resolve(rootDir);
  const server = http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      res.end('Method Not Allowed');
      return;
    }

    let pathname = '/';
    try {
      pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
    } catch {
      res.statusCode = 400;
      res.end('Bad Request');
      return;
    }

    const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const targetPath = path.resolve(resolvedRoot, rel);
    if (targetPath !== resolvedRoot && !targetPath.startsWith(resolvedRoot + path.sep)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    let filePath = targetPath;
    try {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }
    } catch {
      res.statusCode = 500;
      res.end('Server Error');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
  });
}

function parseIntRanges(spec, minVal, maxVal) {
  const out = new Set();
  for (const part of String(spec).split(',').map((s) => s.trim()).filter(Boolean)) {
    const rangeMatch = part.match(/^(\d+)(?:\.\.|-)(\d+)$/);
    if (rangeMatch) {
      const a = Math.max(minVal, Number(rangeMatch[1]));
      const b = Math.min(maxVal, Number(rangeMatch[2]));
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.add(i);
    } else if (/^\d+$/.test(part)) {
      const n = Number(part);
      if (n >= minVal && n <= maxVal) out.add(n);
    }
  }
  return [...out].sort((a, b) => a - b);
}

function parseCliArgs(argv) {
  const opts = {
    concurrency: 8,
    seedsSpec: null,
    cohortSpec: null,
    outFile: null,
    timeoutMs: 300000,
    headful: false,
  };
  for (const arg of argv) {
    if (arg.startsWith('--concurrency=')) {
      opts.concurrency = Math.max(1, Math.min(16, Number(arg.split('=')[1]) || 8));
    } else if (arg.startsWith('--seeds=')) {
      opts.seedsSpec = arg.slice('--seeds='.length);
    } else if (arg.startsWith('--cohort=')) {
      opts.cohortSpec = arg.slice('--cohort='.length);
    } else if (arg.startsWith('--out=')) {
      opts.outFile = arg.slice('--out='.length);
    } else if (arg.startsWith('--timeout-ms=')) {
      opts.timeoutMs = Math.max(30000, Number(arg.split('=')[1]) || 300000);
    } else if (arg === '--headful') {
      opts.headful = true;
    }
  }

  let cohorts = null;
  if (opts.cohortSpec) {
    cohorts = new Set(parseIntRanges(opts.cohortSpec, 1, 10));
  }

  let seeds;
  if (opts.seedsSpec) {
    seeds = parseIntRanges(opts.seedsSpec, 1, 10000);
    if (cohorts) {
      seeds = seeds.filter((s) => cohorts.has(getCohortForSeed(s)));
    }
  } else if (cohorts) {
    seeds = [];
    for (const c of [...cohorts].sort((a, b) => a - b)) {
      for (let s = (c - 1) * 10 + 1; s <= c * 10; s++) seeds.push(s);
    }
  } else {
    seeds = Array.from({ length: 100 }, (_, i) => i + 1);
  }

  return { ...opts, seeds };
}

const FOREST_BRUISER_IDS = new Set([83, 114, 123, 127, 143, 214, 234, 352, 446]);
const OUTER_GEN_6_9_BIOMES = new Set(['faeveldt', 'atoll', 'highlands', 'crater', 'ruins', 'rift']);

function getCohortForSeed(seed) {
  if (seed >= 1 && seed <= 100) return Math.ceil(seed / 10);
  return Math.floor(((seed - 1) % 100) / 10) + 1;
}

function getAgentSpec(seed) {
  const cohort = getCohortForSeed(seed);
  return {
    seed,
    cohort,
    cohortOffset: (seed - 1) % 10,
    isWave2: seed >= 101,
    cohortName: COHORT_NAMES[cohort],
    trainerId: seed % 2 === 1 ? 'violet' : 'ozias',
    viewport: VIEWPORTS[(seed - 1) % VIEWPORTS.length],
    starterName: STARTER_CHOICES[(seed - 1) % STARTER_CHOICES.length],
  };
}

function createSeedRng(seed) {
  let state = (seed * 0x9e3779b1) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseCoordKey(key) {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

function getAllInteractiveEntries() {
  return {
    shrines: Object.entries(SHRINES).map(([k, v]) => ({ ...v, ...parseCoordKey(k), key: k })),
    rivals: Object.entries(RIVAL_TRAINERS).map(([k, v]) => ({ ...v, ...parseCoordKey(k), key: k })),
    chests: Object.entries(CHESTS).map(([k, v]) => ({ ...v, ...parseCoordKey(k), key: k })),
    npcs: Object.entries(NPCS).map(([k, v]) => ({ ...v, ...parseCoordKey(k), key: k })),
    landmarks: Object.entries(LANDMARKS).map(([k, v]) => ({ ...v, ...parseCoordKey(k), key: k })),
    signposts: Object.entries(SIGNPOSTS).map(([k, text]) => ({ text, ...parseCoordKey(k), key: k })),
  };
}

const WORLD_INDEX = getAllInteractiveEntries();

function attachRunTelemetry(page, baseUrl, spec) {
  const telemetry = {
    seed: spec.seed,
    cohort: spec.cohort,
    cohortName: spec.cohortName,
    trainerId: spec.trainerId,
    viewport: spec.viewport.name,
    pageErrors: [],
    consoleErrors: [],
    localHttpErrors: [],
    brokenImages: [],
    layoutIssues: [],
    anomalies: [],
    metrics: {
      battlesStarted: 0,
      battlesWon: 0,
      battlesFaintedAll: 0,
      resetsVerified: 0,
      catchesAttempted: 0,
      catchesSucceeded: 0,
      briefingsOpened: 0,
      arcadeRuns: 0,
      viewportsAudited: 0,
      lastBattleResult: null,
    },
    experience: {
      delights: [],
      frictions: [],
    },
    round2: {
      isWave2: Boolean(spec.isWave2),
      starterName: spec.starterName,
      compassStepsObserved: [],
      compassProgressionOk: null,
      forestOutskirtsDepthOk: null,
      forestOutskirtsBannerText: null,
      forestShrineLevelObserved: null,
      forestShrineReadinessTier: null,
      forestShrineReadinessBadge: null,
      forestShrinePivotLabel: null,
      farmPivotClicked: false,
      farmPivotLandedOk: null,
      forestOutskirtsEncounters: [],
      forestOutskirtsRareElites: 0,
      forestOutskirtsBruisers: 0,
      forestOutskirtsNidoranF: 0,
      forestOutskirtsNincada: 0,
      forestOutskirtsCatchesAttempted: 0,
      forestOutskirtsCatchesSucceeded: 0,
      skyHopUnattunedDialogue: null,
      skyHopUnattunedCountersOk: null,
      skyHopAttunedUnlocked: null,
      evoToastObserved: false,
      badgeToastObserved: false,
      outerBiomesVisited: [],
      shrineTrialTested: false,
      shrineTrialBriefingTitle: null,
      rivalRematchTested: false,
      rivalRematchBriefingTitle: null,
      measuredFpsSamples: [],
      measuredFpsAvg: null,
      measuredFpsMin: null,
    },
    allowOfflineRemoteNoise: false,
    allowOfflineLocalRunner: false,
  };

  const seenAnomalyKeys = new Set();
  const seenDelightKeys = new Set();
  const seenFrictionKeys = new Set();

  const recordAnomaly = (severity, category, code, message, extra = {}) => {
    const key = `${severity}|${code}|${extra.stage || ''}|${extra.viewport || spec.viewport.name}`;
    if (seenAnomalyKeys.has(key)) return;
    seenAnomalyKeys.add(key);
    telemetry.anomalies.push({
      severity,
      category,
      code,
      message,
      viewport: extra.viewport || telemetry.viewport,
      stage: extra.stage || 'runtime',
      ...extra,
    });
  };

  const addDelight = (code, category, stage, message) => {
    const key = `${code}|${stage}`;
    if (seenDelightKeys.has(key)) return;
    seenDelightKeys.add(key);
    telemetry.experience.delights.push({ code, category, stage, message });
  };

  const addFriction = (code, severity, stage, message) => {
    const key = `${code}|${stage}`;
    if (seenFrictionKeys.has(key)) return;
    seenFrictionKeys.add(key);
    telemetry.experience.frictions.push({ code, severity, stage, message });
  };

  page.on('pageerror', (err) => {
    const msg = err?.stack || err?.message || String(err);
    telemetry.pageErrors.push(msg);
    recordAnomaly('P0', 'Code', 'PAGEERROR', msg.split('\n')[0]);
  });

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text() || '';
    const locUrl = msg.location()?.url || '';
    if (isExternalProbeUrl(locUrl)) return;
    if (telemetry.allowOfflineRemoteNoise && /ERR_INTERNET_DISCONNECTED|Failed to load resource|ERR_FAILED/i.test(text)) {
      if (!locUrl || locUrl.startsWith(baseUrl) === false) return;
    }
    if (telemetry.allowOfflineLocalRunner && locUrl.startsWith(baseUrl) && locUrl.endsWith('/tests/test-runner.js')) {
      return;
    }
    const entry = `${text}${locUrl ? ` (${locUrl})` : ''}`;
    telemetry.consoleErrors.push(entry);
    recordAnomaly('P1', 'Code', 'CONSOLE_ERROR', entry);
  });

  page.on('response', (res) => {
    const status = res.status();
    if (status < 400) return;
    const resUrl = res.url();
    if (isExternalProbeUrl(resUrl)) return;
    if (resUrl.startsWith(baseUrl)) {
      const entry = `${status} ${resUrl}`;
      telemetry.localHttpErrors.push(entry);
      recordAnomaly('P0', 'Code', 'LOCAL_HTTP_ERROR', entry);
    }
  });

  return { telemetry, recordAnomaly, addDelight, addFriction };
}

async function getGameState(page) {
  return page.evaluate(() => {
    const app = window.__starlightApp;
    const isVis = (el) => {
      if (!el || el.hidden) return false;
      const cs = window.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    if (!app) {
      return { ready: false };
    }
    const profile = app.overworld?.getProfile?.() || app.pokedex?.storage?.getActiveProfile?.() || null;
    const storageMgr = app.pokedex?.storage || null;
    const ow = app.overworld;
    const bat = app.battle;
    const mg = app.minigame;
    const audio = app.audio;
    let savedPos = null;
    let savedPartyHp = null;
    try {
      const raw = JSON.parse(localStorage.getItem('starlight_pokemon_save_v1') || 'null');
      const activeKey = raw?.activeTrainerId || raw?.activeTrainer || profile?.trainerId;
      const savedProf = raw?.profiles?.[activeKey];
      if (savedProf) {
        savedPos = savedProf.pos || null;
        savedPartyHp = (savedProf.team || savedProf.party || []).map((p) => ({ hp: p.hp, maxHp: p.maxHp }));
      }
    } catch {
      // Ignore parse errors
    }

    const battleButtonsReady = Array.from(document.querySelectorAll('#battle-moves .move-card'))
      .some((b) => !b.disabled && isVis(b));

    return {
      ready: true,
      bootVisible: isVis(document.getElementById('boot-screen')),
      starterVisible: isVis(document.getElementById('starter-screen')),
      shellVisible: isVis(document.getElementById('game-shell')),
      trainerId: profile?.trainerId || null,
      pos: profile?.pos ? { ...profile.pos } : null,
      savedPos,
      savedPartyHp,
      biome: ow?.currentBiomeId || null,
      playerLevel: storageMgr?.getPlayerLevel?.() ?? null,
      shards: profile?.bag?.starShards ?? 0,
      cheerCharges: profile?.bag?.cheerCharges ?? 0,
      arcadeCharges: profile?.arcade?.charges ?? 0,
      arcadeUnlocked: Boolean(profile?.arcade?.unlocked),
      secretKnocks: profile?.arcade?.knocks || profile?.secretKnocks || 0,
      potions: profile?.bag?.potions ?? 0,
      greatBalls: profile?.bag?.greatBalls ?? 0,
      starBalls: profile?.bag?.starBalls ?? 0,
      caughtCount: Object.keys(profile?.pokedex?.caught || {}).length,
      caughtSpeciesIds: Object.keys(profile?.pokedex?.caught || {}).map(Number),
      badgesCount: Array.isArray(profile?.badges) ? profile.badges.length : Object.keys(profile?.badges || {}).length,
      party: (profile?.team || []).map((p, idx) => ({
        idx,
        uid: p.uid,
        id: p.speciesId,
        name: p.name,
        level: p.level,
        hp: p.hp,
        maxHp: p.maxHp,
        bond: p.bond || 0,
        upgradeTier: p.upgradeTier || 0,
        moves: (typeof p.getMoveObjects === 'function' ? p.getMoveObjects() : []).map((m) => {
          const ppInfo = typeof p.getMovePp === 'function' ? p.getMovePp(m.id) : null;
          const curPp = ppInfo && typeof ppInfo === 'object' ? ppInfo.current : (ppInfo ?? p.movePp?.[m.id] ?? m.pp ?? 0);
          const maxPpVal = ppInfo && typeof ppInfo === 'object' ? ppInfo.max : (m.pp ?? m.maxPp ?? 0);
          return {
            id: m.id,
            name: m.name,
            pp: curPp,
            maxPp: maxPpVal,
            power: m.power ?? 0,
            type: m.type,
          };
        }),
      })),
      boxLen: (profile?.box || []).length,
      overworld: {
        active: Boolean(ow?.active),
        paused: Boolean(ow?.paused),
        moving: Boolean(ow?.moving),
        pathLen: ow?.autoPath?.length || 0,
        graceSteps: ow?.encounterGraceSteps || 0,
        interactHintText: document.getElementById('interact-pill')?.textContent?.trim() || '',
        interactPillVisible: isVis(document.getElementById('interact-pill')),
      },
      battle: {
        active: Boolean(bat?.active),
        state: bat?.state || null,
        turn: bat?.turnToken || 0,
        mode: bat?.active ? (bat.isShrine ? 'shrine' : bat.isTrainer ? 'rival' : 'wild') : null,
        enemySpeciesId: bat?.enemy?.speciesId || null,
        enemyName: bat?.enemy?.name || null,
        enemyLevel: bat?.enemy?.level || null,
        enemyIsElite: Boolean(bat?.enemy?.isElite),
        enemyHp: bat?.enemy?.hp ?? null,
        enemyMaxHp: bat?.enemy?.maxHp ?? null,
        playerHp: bat?.player?.hp ?? null,
        playerMaxHp: bat?.player?.maxHp ?? null,
        canClickMove: battleButtonsReady,
        composureTriggered: Boolean(app._playtestComposureCount > 0),
        composureCount: app._playtestComposureCount || 0,
        lastResult: app._lastPlaytestBattleResult || bat?.lastResult || null,
        screenVisible: isVis(document.getElementById('battle-screen')),
        teamDrawerVisible: isVis(document.getElementById('battle-team-drawer')),
      },
      compassGoal: document.getElementById('compass-goal')?.textContent?.trim() || '',
      compassSub: document.getElementById('compass-biome-progress')?.textContent?.trim() || '',
      biomeBanner: {
        visible: isVis(document.getElementById('biome-banner')),
        text: document.getElementById('biome-banner')?.textContent?.trim() || '',
        readiness: document.getElementById('biome-banner')?.dataset?.readiness || null,
      },
      briefingInfo: isVis(document.getElementById('encounter-briefing-modal')) ? {
        title: document.getElementById('briefing-title')?.textContent?.trim() || '',
        tier: document.getElementById('briefing-readiness-pill')?.dataset?.tier || null,
        badgeText: document.getElementById('briefing-readiness-pill')?.textContent?.trim() || '',
        levelText: document.querySelector('#briefing-opponent-meta .briefing-lv-badge')?.textContent?.trim() || '',
        pivotVisible: isVis(document.getElementById('briefing-pivot-btn')),
        pivotLabel: document.getElementById('briefing-pivot-btn')?.textContent?.trim() || '',
      } : null,
      celebration: {
        visible: isVis(document.getElementById('celebration-layer')),
        text: document.getElementById('celebration-layer')?.textContent?.trim() || '',
      },
      badgeToast: {
        visible: isVis(document.getElementById('badge-toast')),
        name: document.getElementById('badge-toast-name')?.textContent?.trim() || '',
      },
      measuredFps: Number(app.measuredFps || 0),
      modals: {
        dialogue: isVis(document.getElementById('world-dialogue')),
        dialogueText: document.getElementById('world-dialogue-text')?.textContent?.trim() || '',
        briefing: isVis(document.getElementById('encounter-briefing-modal')),
        pokedex: isVis(document.getElementById('pokedex-modal')),
        settings: isVis(document.getElementById('settings-modal')),
        minigame: isVis(document.getElementById('minigame-modal')),
        minigameResults: isVis(document.getElementById('minigame-results')),
        encounterFlash: isVis(document.getElementById('encounter-flash')),
        warpTransition: isVis(document.getElementById('warp-transition')),
      },
      minigame: {
        running: Boolean(mg?.running),
        paused: Boolean(mg?.paused),
        score: mg?.score || 0,
        wave: mg?.wave || 0,
      },
      audio: {
        unlocked: Boolean(audio?.unlocked),
        muted: Boolean(audio?.muted),
        bgmMode: audio?.currentTheme || null,
        bgmKey: audio?.currentTheme || null,
        pausedByVisibility: Boolean(audio?._pausedByVisibility),
      },
    };
  });
}

async function auditImages(page, telemetry, recordAnomaly, stage) {
  await page.waitForTimeout(200);
  const broken = await page.evaluate(async () => {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const imgs = Array.from(document.querySelectorAll('img')).filter((img) => {
      if (!img.getAttribute('src')) return false;
      const r = img.getBoundingClientRect();
      const cs = window.getComputedStyle(img);
      return (
        cs.display !== 'none' &&
        cs.visibility !== 'hidden' &&
        r.width > 0 &&
        r.height > 0 &&
        r.bottom >= -50 &&
        r.top <= vh + 50 &&
        r.right >= -50 &&
        r.left <= vw + 50
      );
    });
    const pending = imgs.filter((img) => !img.complete);
    if (pending.length > 0) {
      await Promise.race([
        Promise.all(pending.map((img) => new Promise((res) => {
          if (img.complete) return res();
          img.addEventListener('load', res, { once: true });
          img.addEventListener('error', res, { once: true });
        }))),
        new Promise((res) => setTimeout(res, 1500)),
      ]);
    }
    return imgs
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => ({
        id: img.id || img.className || 'img',
        src: (img.getAttribute('src') || '').slice(0, 100),
        alt: img.alt || '',
      }));
  });
  for (const item of broken) {
    telemetry.brokenImages.push({ stage, ...item });
    recordAnomaly('P1', 'Audio/Assets', 'BROKEN_IMAGE', `Broken sprite/image (${item.id}): ${item.src}`, { stage });
  }
}

async function auditLayout(page, telemetry, recordAnomaly, stage, viewportName) {
  telemetry.metrics.viewportsAudited++;
  const findings = await page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const issues = [];

    const isVis = (el) => {
      if (!el || el.hidden) return false;
      const cs = window.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 1 && r.height > 1;
    };

    const rectOf = (el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };

    const overlapArea = (a, b) => {
      const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      return x * y;
    };

    if (document.documentElement.scrollWidth > vw + 1) {
      issues.push({
        severity: 'P1',
        code: 'DOC_H_OVERFLOW',
        message: `Document horizontal overflow: scrollWidth=${document.documentElement.scrollWidth} > innerWidth=${vw}`,
      });
    }

    const scrollCheckSelectors = [
      '#pokedex-modal .pokedex-card',
      '#pokedex-body',
      '#settings-modal .modal-card',
      '#encounter-briefing-modal .encounter-briefing-card',
      '#minigame-modal .minigame-card',
      '#minigame-results',
      '#battle-team-drawer',
    ];
    for (const sel of scrollCheckSelectors) {
      const el = document.querySelector(sel);
      if (!isVis(el)) continue;
      if (el.scrollWidth > el.clientWidth + 3) {
        issues.push({
          severity: 'P2',
          code: 'CONTAINER_H_OVERFLOW',
          message: `${sel} horizontal overflow (${el.scrollWidth} > ${el.clientWidth})`,
        });
      }
      // Check if non-scrollable container clips vertical content cleanly off-screen
      const cs = window.getComputedStyle(el);
      if (cs.overflowY === 'hidden' && el.scrollHeight > el.clientHeight + 6) {
        issues.push({
          severity: 'P1',
          code: 'CONTAINER_V_CLIPPED',
          message: `${sel} clips vertical content (${el.scrollHeight} > ${el.clientHeight}) with overflow-y:hidden`,
        });
      }
    }

    const mustFitSelectors = [
      '#hud-btn-dex', '#hud-btn-badges', '#hud-btn-arcade', '#hud-btn-mute', '#hud-btn-settings',
      '#warp-zone-btn', '#warp-safe-btn', '#interact-pill',
      '#battle-btn-ball', '#battle-btn-great', '#battle-btn-star', '#battle-btn-potion', '#battle-btn-team', '#battle-btn-run',
      '#briefing-battle-btn', '#briefing-pivot-btn', '#briefing-cancel-btn', '#briefing-close-btn',
      '#minigame-pause-btn', '#minigame-close-btn', '#minigame-dash-btn',
      '#minigame-replay-btn', '#minigame-done-btn', '#minigame-shard-buy-btn',
      '#pokedex-close-btn', '#settings-close-btn',
    ];
    for (const sel of mustFitSelectors) {
      const el = document.querySelector(sel);
      if (!isVis(el)) continue;
      const r = rectOf(el);
      // Only flag off-screen if NOT inside an actively vertically scrollable modal container or flag if outside viewport
      const scrollableAncestor = el.closest('.modal-card, .encounter-briefing-card, .pokedex-body, .minigame-results');
      const canScrollToReach = scrollableAncestor && (
        window.getComputedStyle(scrollableAncestor).overflowY === 'auto' ||
        window.getComputedStyle(scrollableAncestor).overflowY === 'scroll'
      );
      if (r.left < -1 || r.right > vw + 1 || r.top < -1 || (!canScrollToReach && r.bottom > vh + 1)) {
        issues.push({
          severity: 'P1',
          code: 'CONTROL_OFFSCREEN',
          message: `${sel} extends outside ${vw}x${vh} (${Math.round(r.left)},${Math.round(r.top)}..${Math.round(r.right)},${Math.round(r.bottom)})`,
        });
      } else if (canScrollToReach && r.bottom > vh + 1 && (
        sel.startsWith('#briefing-') || sel.startsWith('#minigame-')
      )) {
        issues.push({
          severity: 'P3',
          code: 'CTA_BELOW_FOLD_NEEDS_SCROLL',
          message: `${sel} falls below viewport fold on ${vw}x${vh} (bottom=${Math.round(r.bottom)} > ${vh}), requiring scroll inside modal`,
        });
      }
    }

    const checkPairwise = (selectors, label, minArea = 10, severity = 'P2') => {
      const items = [];
      for (const sel of selectors) {
        for (const el of document.querySelectorAll(sel)) {
          if (!isVis(el)) continue;
          items.push({ sel: el.id ? `#${el.id}` : sel, rect: rectOf(el), el });
        }
      }
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i];
          const b = items[j];
          if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
          const area = overlapArea(a.rect, b.rect);
          if (area > minArea) {
            issues.push({
              severity,
              code: 'OVERLAP_' + label.toUpperCase(),
              message: `${label} overlap (${Math.round(area)}px²): ${a.sel} vs ${b.sel}`,
            });
          }
        }
      }
    };

    const shellVis = isVis(document.getElementById('game-shell'));
    const battleVis = isVis(document.getElementById('battle-screen'));
    const briefingVis = isVis(document.getElementById('encounter-briefing-modal'));
    const settingsVis = isVis(document.getElementById('settings-modal'));
    const dexVis = isVis(document.getElementById('pokedex-modal'));
    const mgVis = isVis(document.getElementById('minigame-modal'));

    if (shellVis && !battleVis && !briefingVis && !settingsVis && !dexVis && !mgVis) {
      checkPairwise(
        ['.hud-bar', '#compass-hud', '#biome-banner', '#warp-dock', '#interact-pill'],
        'overworld_hud',
        12,
        'P1',
      );
      checkPairwise(['#warp-zone-btn', '#warp-safe-btn'], 'warp_dock_btns', 4, 'P1');
      if (isVis(document.getElementById('world-dialogue'))) {
        checkPairwise(['#world-dialogue', '#warp-dock', '#interact-pill'], 'dialogue_overlay', 12, 'P2');
      }
    }

    if (battleVis && !isVis(document.getElementById('battle-team-drawer'))) {
      checkPairwise(
        ['.status-card-enemy', '.status-card-player', '#enemy-sprite', '#player-sprite', '.battle-deck', '#battle-ability-banner', '#battle-log'],
        'battle_stage',
        16,
        'P2',
      );
      checkPairwise(
        ['#battle-btn-ball', '#battle-btn-great', '#battle-btn-star', '#battle-btn-potion', '#battle-btn-team', '#battle-btn-run', '#battle-moves .move-card'],
        'battle_controls',
        4,
        'P1',
      );
    }

    if (briefingVis) {
      checkPairwise(
        ['#briefing-title', '#briefing-close-btn', '#briefing-readiness-pill', '#briefing-opponent-meta', '#briefing-team-meta', '#briefing-tip', '#briefing-battle-btn', '#briefing-pivot-btn', '#briefing-cancel-btn'],
        'briefing_modal',
        6,
        'P1',
      );
    }

    if (settingsVis) {
      checkPairwise(
        ['#settings-close-btn', '#setting-mute-btn', '#setting-crt-btn', '#setting-pace-btn', '#setting-switch-trainer-btn', '#reset-trainer-btn', '#reset-all-btn'],
        'settings_modal',
        6,
        'P2',
      );
    }

    if (dexVis) {
      checkPairwise(['#pokedex-close-btn', '.pokedex-tab'], 'pokedex_header', 4, 'P2');
    }

    if (mgVis) {
      const mgCheck = ['#minigame-pause-btn', '#minigame-close-btn', '#minigame-dash-btn'];
      if (isVis(document.getElementById('minigame-results'))) {
        mgCheck.push('#minigame-replay-btn', '#minigame-done-btn', '#minigame-shard-buy-btn');
      }
      checkPairwise(mgCheck, 'minigame_controls', 6, 'P1');
    }

    return issues;
  });

  for (const item of findings) {
    telemetry.layoutIssues.push({ stage, viewport: viewportName || telemetry.viewport, ...item });
    recordAnomaly(item.severity, 'Visual/HUD', item.code, item.message, {
      stage,
      viewport: viewportName || telemetry.viewport,
    });
  }
}

async function dismissDialogue(page, telemetry, recordAnomaly, stage, maxClicks = 12) {
  let count = 0;
  for (let i = 0; i < maxClicks; i++) {
    const visible = await page.evaluate(() => {
      const el = document.getElementById('world-dialogue');
      return Boolean(el && !el.hidden && el.offsetWidth > 0);
    });
    if (!visible) return count;
    await page.click('#world-dialogue', { force: true }).catch(() => {});
    await page.waitForTimeout(90);
    count++;
  }
  const stillOpen = await page.evaluate(() => {
    const el = document.getElementById('world-dialogue');
    return Boolean(el && !el.hidden && el.offsetWidth > 0);
  });
  if (stillOpen) {
    recordAnomaly('P0', 'Gameplay/Mechanic', 'DIALOGUE_STUCK', `World dialogue failed to dismiss after ${maxClicks} clicks`, { stage });
  }
  return count;
}

async function installAppHooks(page) {
  await page.evaluate(() => {
    const app = window.__starlightApp;
    if (!app || app._playtestHooked) return;
    app._playtestHooked = true;
    app._playtestComposureCount = app._playtestComposureCount || 0;
    app._playtestWildLog = app._playtestWildLog || [];
    app._playtestCelebrations = app._playtestCelebrations || [];
    app._playtestBadgeToasts = app._playtestBadgeToasts || [];
    const origHandleBattleEnd = app.handleBattleEnd?.bind(app);
    if (origHandleBattleEnd) {
      app.handleBattleEnd = (res) => {
        app._lastPlaytestBattleResult = res ? { ...res } : null;
        return origHandleBattleEnd(res);
      };
    }
    const origBrace = app.battle?.spawnComposureBraceFX?.bind(app.battle);
    if (origBrace && app.battle) {
      app.battle.spawnComposureBraceFX = (...args) => {
        app._playtestComposureCount = (app._playtestComposureCount || 0) + 1;
        return origBrace(...args);
      };
    }
    const origStartWild = app.startWildEncounter?.bind(app);
    if (origStartWild) {
      app.startWildEncounter = async (biomeId, encounterMeta = {}) => {
        const prof = app.overworld?.getProfile?.();
        const badgesAtStart = Array.isArray(prof?.badges) ? prof.badges.length : 0;
        const posAtStart = prof?.pos ? { x: prof.pos.x, y: prof.pos.y } : null;
        await origStartWild(biomeId, encounterMeta);
        if (app.battle?.active && app.battle?.enemy) {
          app._playtestWildLog.push({
            biomeId,
            badgesCount: badgesAtStart,
            pos: posAtStart,
            depthTier: encounterMeta?.depthTier ?? null,
            isRarePatch: Boolean(encounterMeta?.isRarePatch),
            nodeKind: encounterMeta?.nodeKind || null,
            speciesId: app.battle.enemy.speciesId,
            name: app.battle.enemy.name,
            level: app.battle.enemy.level,
            isElite: Boolean(app.battle.enemy.isElite),
          });
        }
      };
    }
    const origCelebrate = app.triggerCelebration?.bind(app);
    if (origCelebrate) {
      app.triggerCelebration = (opts = {}) => {
        app._playtestCelebrations.push({
          icon: opts?.icon || '',
          title: opts?.title || '',
          subtitle: opts?.subtitle || '',
        });
        return origCelebrate(opts);
      };
    }
    const origBadgeToast = app.showBadgeToast?.bind(app);
    if (origBadgeToast) {
      app.showBadgeToast = (badges) => {
        if (Array.isArray(badges)) {
          app._playtestBadgeToasts.push(...badges.map((b) => b?.id || b?.name || String(b)));
        }
        return origBadgeToast(badges);
      };
    }
  });
}

function recordDelight(telemetry, code, category, stage, message) {
  if (!telemetry?.experience?.delights) return;
  if (telemetry.experience.delights.some((d) => d.code === code && d.stage === stage)) return;
  telemetry.experience.delights.push({ code, category, stage, message });
}

function recordFriction(telemetry, code, severity, stage, message) {
  if (!telemetry?.experience?.frictions) return;
  if (telemetry.experience.frictions.some((f) => f.code === code && f.stage === stage)) return;
  telemetry.experience.frictions.push({ code, severity, stage, message });
}

async function sampleFps(page, telemetry) {
  if (!telemetry?.round2?.isWave2) return;
  const fps = await page.evaluate(() => Number(window.__starlightApp?.measuredFps || 0)).catch(() => 0);
  if (fps > 0 && Number.isFinite(fps)) {
    const arr = telemetry.round2.measuredFpsSamples;
    arr.push(Number(fps.toFixed(1)));
    const sum = arr.reduce((a, b) => a + b, 0);
    telemetry.round2.measuredFpsAvg = Number((sum / arr.length).toFixed(1));
    telemetry.round2.measuredFpsMin = Number(Math.min(...arr).toFixed(1));
  }
}

async function syncRound2HooksTelemetry(page, telemetry, recordAnomaly, stage = 'r2-sync') {
  if (!telemetry?.round2?.isWave2) return;
  const data = await page.evaluate((sinceIdx) => {
    const app = window.__starlightApp;
    if (!app) return null;
    const wilds = (app._playtestWildLog || []).slice(sinceIdx);
    const celebrations = app._playtestCelebrations || [];
    const badgeToasts = app._playtestBadgeToasts || [];
    return {
      nextIdx: (app._playtestWildLog || []).length,
      wilds,
      celebrations,
      badgeToasts,
      fps: Number(app.measuredFps || 0),
    };
  }, telemetry._wildSyncedCount || 0).catch(() => null);
  if (!data) return;

  telemetry._wildSyncedCount = data.nextIdx;
  for (const w of data.wilds) {
    if (w.biomeId === 'forest' && w.badgesCount === 0 && w.depthTier === 0) {
      const isBruiser = FOREST_BRUISER_IDS.has(w.speciesId);
      telemetry.round2.forestOutskirtsEncounters.push({
        speciesId: w.speciesId,
        name: w.name,
        level: w.level,
        isRarePatch: w.isRarePatch,
        isElite: w.isElite,
        isBruiser,
      });
      if (isBruiser) telemetry.round2.forestOutskirtsBruisers++;
      if (w.speciesId === 29) telemetry.round2.forestOutskirtsNidoranF++;
      if (w.speciesId === 290) telemetry.round2.forestOutskirtsNincada++;
      if (w.isRarePatch && w.isElite) {
        telemetry.round2.forestOutskirtsRareElites++;
        recordAnomaly('P1', 'Gameplay/Mechanic', 'NOVICE_RARE_PATCH_ELITE', `0-badge Whispering Forest Outskirts rare patch rolled Elite ${w.name} Lv.${w.level}`, { stage });
      }
    }
  }
  if (data.celebrations.some((c) => /EVOLVED INTO/i.test(c.title || ''))) {
    telemetry.round2.evoToastObserved = true;
  }
  if (data.badgeToasts.length > 0) {
    telemetry.round2.badgeToastObserved = true;
  }
  if (data.fps > 0 && Number.isFinite(data.fps)) {
    const arr = telemetry.round2.measuredFpsSamples;
    arr.push(Number(data.fps.toFixed(1)));
    const sum = arr.reduce((a, b) => a + b, 0);
    telemetry.round2.measuredFpsAvg = Number((sum / arr.length).toFixed(1));
    telemetry.round2.measuredFpsMin = Number(Math.min(...arr).toFixed(1));
  }
}

function recordCompassGoalSnapshot(st, telemetry) {
  if (!telemetry?.round2?.isWave2 || !st?.compassGoal) return;
  const list = telemetry.round2.compassStepsObserved;
  const label = st.compassGoal;
  if (list[list.length - 1] !== label) {
    list.push(label);
  }
}

async function verifyForestOutskirtsDepth(page, telemetry, recordAnomaly, stage) {
  const depthAtEntrance = getTileDepthInfo(9, 6);
  const st = await getGameState(page);
  const ok = depthAtEntrance.biomeId === 'forest' && depthAtEntrance.depthTier === 0 && depthAtEntrance.zoneLabel === 'Outskirts';
  telemetry.round2.forestOutskirtsDepthOk = ok;
  telemetry.round2.forestOutskirtsBannerText = st.biomeBanner?.text || null;
  if (!ok) {
    recordAnomaly('P1', 'Gameplay/Mechanic', 'FOREST_OUTSKIRTS_DEPTH_MISMATCH', `Expected (9,6) forest depthTier=0 Outskirts, got ${JSON.stringify(depthAtEntrance)}`, { stage });
  } else if (st.biomeBanner?.readiness === 'challenging' || st.biomeBanner?.readiness === 'danger') {
    recordFriction(telemetry, 'OUTSKIRTS_BANNER_ALARMING', 'P3', stage, `Forest Outskirts banner showed ${st.biomeBanner.readiness} for fresh starter: "${st.biomeBanner.text}"`);
  } else {
    recordDelight(telemetry, 'FOREST_OUTSKIRTS_GENTLE_ENTRY', 'Gameplay/Mechanic', stage, `Whispering Forest entrance (9,6) resolved cleanly as Outskirts (${st.biomeBanner?.text || 'Whispering Forest'})`);
  }
}

async function triggerOutskirtsRarePatchEncounter(page, telemetry, recordAnomaly, stage, { maxWaitMs = 9000 } = {}) {
  const deadline = Date.now() + maxWaitMs;
  const patrol = [[9, 6], [8, 6], [8, 7], [9, 7]];
  let stepIdx = 0;
  while (Date.now() < deadline) {
    const st = await getGameState(page);
    if (st.battle.active) {
      await playActiveBattleToEnd(page, { strategy: 'run', telemetry, recordAnomaly, rng: Math.random, stage: `${stage}-clear` });
      continue;
    }
    const patch = await page.evaluate(() => {
      const patches = window.__starlightApp?.overworld?.rarePatches || [];
      return patches.map((p) => ({ x: p.x, y: p.y, biomeId: p.biomeId, kind: p.kind }));
    });
    const outskirtPatch = patch.find((p) => p.biomeId === 'forest' && getTileDepthInfo(p.x, p.y).depthTier === 0);
    if (outskirtPatch) {
      await navigateToCoord(page, outskirtPatch.x, outskirtPatch.y, { telemetry, recordAnomaly, rng: Math.random, maxDistance: 0, maxMs: 7000, fightWilds: 'win', stage });
      const post = await getGameState(page);
      if (post.modals.dialogue) await dismissDialogue(page, telemetry, recordAnomaly, stage);
      await syncRound2HooksTelemetry(page, telemetry, recordAnomaly, stage);
      if (telemetry.round2.forestOutskirtsEncounters.some((e) => e.isRarePatch)) {
        return true;
      }
    }
    const [nx, ny] = patrol[stepIdx % patrol.length];
    stepIdx++;
    await page.evaluate(({ x, y }) => {
      window.__starlightApp?.overworld?.walkToTile?.(x, y);
    }, { x: nx, y: ny });
    await page.waitForTimeout(320);
  }
  return telemetry.round2.forestOutskirtsEncounters.some((e) => e.isRarePatch);
}

async function tryInspectShrineTrialBriefing(page, shrine, telemetry, recordAnomaly, stage) {
  await triggerInteractAtTarget(page, shrine.x, shrine.y, telemetry, recordAnomaly, stage);
  const st = await getGameState(page);
  if (st.modals.briefing) {
    telemetry.metrics.briefingsOpened++;
    telemetry.round2.shrineTrialTested = true;
    telemetry.round2.shrineTrialBriefingTitle = st.briefingInfo?.title || null;
    await auditLayout(page, telemetry, recordAnomaly, `${stage}-layout`);
    if (!/Trial #/i.test(st.briefingInfo?.title || '')) {
      recordAnomaly('P2', 'Gameplay/Mechanic', 'SHRINE_TRIAL_BRIEFING_MISSING_LABEL', `Cleared shrine briefing missing Trial # label: "${st.briefingInfo?.title}"`, { stage });
    } else {
      recordDelight(telemetry, 'SHRINE_TRIAL_BRIEFING_CLEAR', 'Polish/UX', stage, `Astral Trial briefing displayed "${st.briefingInfo.title}" (${st.briefingInfo.badgeText}) cleanly`);
    }
    await page.click('#briefing-cancel-btn').catch(() => {});
    await page.waitForTimeout(160);
  }
}

async function tryInspectRivalRematchBriefing(page, rival, telemetry, recordAnomaly, stage) {
  await triggerInteractAtTarget(page, rival.x, rival.y, telemetry, recordAnomaly, stage);
  const st = await getGameState(page);
  if (st.modals.briefing) {
    telemetry.metrics.briefingsOpened++;
    telemetry.round2.rivalRematchTested = true;
    telemetry.round2.rivalRematchBriefingTitle = st.briefingInfo?.title || null;
    await auditLayout(page, telemetry, recordAnomaly, `${stage}-layout`);
    if (!/Rematch/i.test(st.briefingInfo?.title || '')) {
      recordAnomaly('P2', 'Gameplay/Mechanic', 'RIVAL_REMATCH_BRIEFING_MISSING_LABEL', `Defeated rival briefing missing Rematch label: "${st.briefingInfo?.title}"`, { stage });
    } else {
      recordDelight(telemetry, 'RIVAL_REMATCH_BRIEFING_CLEAR', 'Polish/UX', stage, `Rival Rematch briefing displayed "${st.briefingInfo.title}" (${st.briefingInfo.badgeText}) cleanly`);
    }
    await page.click('#briefing-cancel-btn').catch(() => {});
    await page.waitForTimeout(160);
  }
}

async function bootAndStartGame(page, baseUrl, spec, rng, telemetry, recordAnomaly) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForSelector(`#trainer-card-${spec.trainerId}`, { state: 'visible', timeout: 15000 });
  await auditLayout(page, telemetry, recordAnomaly, 'boot');
  await auditImages(page, telemetry, recordAnomaly, 'boot');

  await page.click(`#trainer-card-${spec.trainerId}`);
  await page.waitForSelector('.starter-pick-btn', { state: 'visible', timeout: 15000 });
  await auditLayout(page, telemetry, recordAnomaly, 'starter');
  await auditImages(page, telemetry, recordAnomaly, 'starter');

  if (rng() < 0.5) {
    await page.click('#starter-cape-toggle').catch(() => {});
  }
  const styleChips = page.locator('.starter-style-chip');
  const chipCount = await styleChips.count().catch(() => 0);
  if (chipCount > 0) {
    await styleChips.nth(Math.floor(rng() * chipCount)).click().catch(() => {});
  }

  const pickBtn = page.locator('.starter-pick-btn', { hasText: spec.starterName }).first();
  if (await pickBtn.count()) {
    await pickBtn.click();
  } else {
    await page.locator('.starter-pick-btn').first().click();
  }

  await page.waitForSelector('#game-shell', { state: 'visible', timeout: 15000 });
  await page.waitForTimeout(250);
  await dismissDialogue(page, telemetry, recordAnomaly, 'starter-intro');
  await auditLayout(page, telemetry, recordAnomaly, 'overworld-initial');

  await installAppHooks(page);
}

const ENCOUNTER_TILES = new Set([2, 5, 9, 19, 22, 26, 28, 31, 34, 37, 40, 43, 46, 49, 52, 55, 58]);

function findWorldPath(startX, startY, targetX, targetY) {
  if (startX === targetX && startY === targetY) return [];
  const total = WORLD_COLS * WORLD_ROWS;
  const distArr = new Int32Array(total).fill(1e9);
  const parent = new Int32Array(total).fill(-1);
  const key = (x, y) => y * WORLD_COLS + x;
  const startKey = key(startX, startY);
  distArr[startKey] = 0;

  // Simple bucketed queue / priority queue (costs are 1 for roads, 25 for tall grass)
  const pq = [[0, startX, startY]];
  let goalKey = -1;
  let bestSnap = null;
  const targetIsWalkable = isTileWalkableAt(targetX, targetY);

  while (pq.length > 0) {
    // Pop lowest cost element (small graph <= 6400 nodes)
    let bestIdx = 0;
    for (let i = 1; i < pq.length; i++) {
      if (pq[i][0] < pq[bestIdx][0]) bestIdx = i;
    }
    const [curCost, cx, cy] = pq[bestIdx];
    pq[bestIdx] = pq[pq.length - 1];
    pq.pop();

    const cKey = key(cx, cy);
    if (curCost > distArr[cKey]) continue;

    if (cx === targetX && cy === targetY) {
      goalKey = cKey;
      break;
    }
    const manhattan = Math.abs(cx - targetX) + Math.abs(cy - targetY);
    if (!targetIsWalkable && manhattan === 1) {
      goalKey = cKey;
      break;
    }
    if (!bestSnap || manhattan < bestSnap.dist) {
      bestSnap = { x: cx, y: cy, dist: manhattan, key: cKey };
    }

    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= WORLD_COLS || ny >= WORLD_ROWS) continue;
      if (!isTileWalkableAt(nx, ny)) continue;
      const nKey = key(nx, ny);
      const stepCost = ENCOUNTER_TILES.has(WORLD_MAP[ny]?.[nx]) ? 25 : 1;
      const nextCost = curCost + stepCost;
      if (nextCost < distArr[nKey]) {
        distArr[nKey] = nextCost;
        parent[nKey] = cKey;
        pq.push([nextCost, nx, ny]);
      }
    }
  }

  const endKey = goalKey !== -1 ? goalKey : (bestSnap ? bestSnap.key : -1);
  if (endKey === -1 || endKey === startKey) return [];

  const path = [];
  let cur = endKey;
  while (cur !== startKey && cur !== -1) {
    path.push([cur % WORLD_COLS, Math.floor(cur / WORLD_COLS)]);
    cur = parent[cur];
  }
  path.reverse();
  return path;
}

async function clickWorldTile(page, tx, ty) {
  const pt = await page.evaluate(({ x, y }) => {
    const app = window.__starlightApp;
    const ow = app?.overworld;
    const canvas = ow?.canvas;
    const prof = ow?.getProfile?.();
    if (!ow || !canvas || !prof) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const { camX, camY } = ow._getCameraPosition(prof);
    const scale = Math.max(rect.width / ow.viewW, rect.height / ow.viewH);
    const offsetX = (rect.width - ow.viewW * scale) / 2;
    const offsetY = (rect.height - ow.viewH * scale) / 2;
    const worldX = (x + 0.5) * ow.tileSize;
    const worldY = (y + 0.5) * ow.tileSize;
    const clientX = rect.left + offsetX + (worldX - camX) * scale;
    const clientY = rect.top + offsetY + (worldY - camY) * scale;
    const hudBottom = document.querySelector('.hud-bar')?.getBoundingClientRect()?.bottom || 0;
    if (clientX < rect.left + 8 || clientX > rect.right - 8 || clientY < Math.max(rect.top + 8, hudBottom + 8) || clientY > rect.bottom - 52) {
      return null;
    }
    if (document.elementFromPoint(clientX, clientY) !== canvas) {
      return null;
    }
    return { clientX, clientY };
  }, { x: tx, y: ty });

  if (pt) {
    await page.mouse.click(pt.clientX, pt.clientY);
    return 'pointer';
  }
  await page.evaluate(({ x, y }) => {
    window.__starlightApp?.overworld?.walkToTile?.(x, y);
  }, { x: tx, y: ty });
  return 'bfs';
}

async function navigateToCoord(page, targetX, targetY, {
  telemetry,
  recordAnomaly,
  rng,
  maxDistance = 1,
  maxMs = 30000,
  fightWilds = 'run',
  stage = 'navigate',
} = {}) {
  const deadline = Date.now() + maxMs;
  let lastMoveTime = Date.now();
  let lastPosKey = '';

  while (Date.now() < deadline) {
    const st = await getGameState(page);
    if (!st.ready) return false;

    if (st.modals.dialogue) {
      await dismissDialogue(page, telemetry, recordAnomaly, stage);
      continue;
    }
    if (st.battle.active) {
      await playActiveBattleToEnd(page, { strategy: fightWilds, telemetry, recordAnomaly, rng, stage });
      continue;
    }
    if (st.modals.briefing) {
      return true;
    }

    const pos = st.pos;
    if (!pos) return false;
    const dist = Math.abs(pos.x - targetX) + Math.abs(pos.y - targetY);
    if (dist <= maxDistance) {
      return true;
    }

    const key = `${pos.x},${pos.y}`;
    if (key !== lastPosKey) {
      lastPosKey = key;
      lastMoveTime = Date.now();
    }

    if (!st.overworld.moving && st.overworld.pathLen === 0) {
      const fullPath = findWorldPath(pos.x, pos.y, targetX, targetY);
      if (fullPath.length === 0) return false;
      const wpIdx = Math.min(fullPath.length - 1, 7);
      const [wx, wy] = fullPath[wpIdx];
      await clickWorldTile(page, wx, wy);
    } else if (Date.now() - lastMoveTime > 3500) {
      const fullPath = findWorldPath(pos.x, pos.y, targetX, targetY);
      if (fullPath.length > 0) {
        const [wx, wy] = fullPath[Math.min(fullPath.length - 1, 6)];
        await page.evaluate(({ x, y }) => {
          window.__starlightApp?.overworld?.walkToTile?.(x, y);
        }, { x: wx, y: wy });
      }
      lastMoveTime = Date.now();
    }

    await page.waitForTimeout(160);
  }
  return false;
}

async function triggerInteractAtTarget(page, tx, ty, telemetry, recordAnomaly, stage) {
  for (let attempt = 0; attempt < 2; attempt++) {
    for (let w = 0; w < 12; w++) {
      const busy = await page.evaluate(() => {
        const app = window.__starlightApp;
        const flash = document.getElementById('encounter-flash');
        const flashVis = Boolean(flash && !flash.hidden && flash.offsetWidth > 0);
        return Boolean(app?.overworld?.moving || app?.encounterTransitioning || flashVis);
      }).catch(() => false);
      if (!busy) break;
      await page.waitForTimeout(80);
    }
    const pre = await getGameState(page);
    if (pre.battle.active) {
      await playActiveBattleToEnd(page, { strategy: 'run', telemetry, recordAnomaly, rng: Math.random, stage: `${stage}-wild-clear` });
      await dismissDialogue(page, telemetry, recordAnomaly, `${stage}-wild-dlg`);
      continue;
    }
    if (pre.modals.dialogue) {
      await dismissDialogue(page, telemetry, recordAnomaly, `${stage}-pre-dlg`);
    }
    await page.evaluate(({ x, y }) => {
      const app = window.__starlightApp;
      const ow = app?.overworld;
      const prof = ow?.getProfile?.();
      if (!ow || !prof?.pos) return;
      const dx = x - prof.pos.x;
      const dy = y - prof.pos.y;
      if (Math.abs(dx) >= Math.abs(dy)) {
        prof.pos.dir = dx >= 0 ? 'right' : 'left';
      } else {
        prof.pos.dir = dy >= 0 ? 'down' : 'up';
      }
      ow.refreshInteractHint?.();
    }, { x: tx, y: ty });
    await page.waitForTimeout(90);
    const pillVisible = await page.evaluate(() => {
      const el = document.getElementById('interact-pill');
      return Boolean(el && !el.hidden && el.offsetWidth > 0);
    });
    if (pillVisible) {
      await page.click('#interact-pill', { force: true }).catch(() => {});
    } else {
      await page.keyboard.press('Space').catch(() => {});
    }
    await page.waitForTimeout(260);
    const st = await getGameState(page);
    if (st.battle.active || st.modals.encounterFlash) {
      await playActiveBattleToEnd(page, { strategy: 'run', telemetry, recordAnomaly, rng: Math.random, stage: `${stage}-post-wild` });
      await dismissDialogue(page, telemetry, recordAnomaly, `${stage}-post-wild-dlg`);
      continue;
    }
    if (st.modals.dialogue) {
      await dismissDialogue(page, telemetry, recordAnomaly, stage);
    }
    return;
  }
}

async function waitForBriefingBattleStart(page, telemetry, recordAnomaly, stage, maxWaitMs = 3600) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const cur = await getGameState(page);
    if (cur.battle.active) return true;
    if (cur.modals.dialogue) await dismissDialogue(page, telemetry, recordAnomaly, stage);
    await page.waitForTimeout(160);
  }
  return Boolean((await getGameState(page)).battle.active);
}

async function playActiveBattleToEnd(page, {
  strategy = 'win',
  telemetry,
  recordAnomaly,
  rng,
  stage = 'battle',
  chaosMidBattle = null,
} = {}) {
  let battleCounted = false;
  let lastState = null;
  let lastStateSince = Date.now();
  let lastTurnToken = -1;
  let observedTurns = 0;
  let lastTurnAt = Date.now();
  let didLayoutAudit = false;
  let didChaosHook = false;
  let usedStruggleTest = false;
  let weakenedWildOnce = false;
  let switchedOnce = false;
  let usedPotionOnce = false;

  while (true) {
    const st = await getGameState(page);
    if (!st.ready) break;

    if (!st.battle.active) {
      if (st.modals.encounterFlash) {
        await page.waitForTimeout(150);
        if (Date.now() - lastStateSince > 8000) {
          recordAnomaly('P0', 'Code', 'ENCOUNTER_FLASH_STUCK', 'Encounter flash overlay stayed visible >8s', { stage });
          break;
        }
        continue;
      }
      break;
    }

    if (!battleCounted) {
      battleCounted = true;
      telemetry.metrics.battlesStarted++;
    }

    const curState = st.battle.state;
    const curTurnToken = st.battle.turn;
    const now = Date.now();
    if (curState !== lastState) {
      if (curState === 'PLAYER_INPUT') observedTurns++;
      lastState = curState;
      lastStateSince = now;
    }
    if (curTurnToken !== lastTurnToken) {
      lastTurnToken = curTurnToken;
      lastTurnAt = now;
    }

    if (observedTurns > 80) {
      recordAnomaly('P0', 'Gameplay/Mechanic', 'BATTLE_TURN_CAP', `Battle exceeded 80 turns (turns=${observedTurns}, mode=${st.battle.mode})`, { stage });
      await page.evaluate(() => window.__starlightApp?.battle?.stop?.({ outcome: 'escaped', faintedAll: false }));
      break;
    }

    const modalBlocking = st.modals.settings || st.modals.pokedex || st.modals.minigame;
    if (!modalBlocking && curState !== 'PLAYER_INPUT' && curState !== 'FORCED_SWITCH' && now - lastStateSince > 8500) {
      recordAnomaly('P0', 'Code', 'BATTLE_STATE_STUCK', `Battle stuck in state "${curState}" for >8.5s (turns=${observedTurns})`, { stage });
      await page.evaluate(() => window.__starlightApp?.battle?.stop?.({ outcome: 'escaped', faintedAll: false }));
      break;
    }

    if (!didLayoutAudit && curState === 'PLAYER_INPUT') {
      didLayoutAudit = true;
      await auditLayout(page, telemetry, recordAnomaly, `${stage}-battle`);
      await auditImages(page, telemetry, recordAnomaly, `${stage}-battle`);
    }

    // Optional mid-battle hook (e.g. Cohort 1 Settings open mid-battle or Cohort 9 viewport flip)
    if (!didChaosHook && chaosMidBattle && curState === 'PLAYER_INPUT') {
      didChaosHook = true;
      await chaosMidBattle(st);
      lastStateSince = Date.now();
      lastTurnAt = Date.now();
      continue;
    }

    // Dismiss battle team drawer if accidentally left open when not switching
    if (st.battle.teamDrawerVisible && curState === 'FORCED_SWITCH') {
      const switchCards = page.locator('#battle-team-list .battle-switch-card:not([disabled])');
      const cnt = await switchCards.count();
      if (cnt > 0) {
        await switchCards.first().click({ force: true }).catch(() => {});
        await page.waitForTimeout(220);
        continue;
      }
      recordAnomaly('P0', 'Code', 'FORCED_SWITCH_NO_OPTIONS', 'Forced switch drawer visible with 0 clickable healthy mons', { stage });
      break;
    }

    if (st.battle.teamDrawerVisible && curState !== 'FORCED_SWITCH') {
      await page.click('#battle-team-close', { force: true }).catch(() => {});
      await page.waitForTimeout(150);
      continue;
    }

    if (curState === 'PLAYER_INPUT' && st.battle.canClickMove) {
      // Watchdog if turn doesn't budge in PLAYER_INPUT after repeated actions
      if (now - lastTurnAt > 8500) {
        recordAnomaly('P0', 'Code', 'BATTLE_INPUT_UNRESPONSIVE', `Battle stayed at PLAYER_INPUT turns=${observedTurns} >8.5s without advancing`, { stage });
        await page.evaluate(() => window.__starlightApp?.battle?.stop?.({ outcome: 'escaped', faintedAll: false }));
        break;
      }

      if (strategy === 'run' && st.battle.mode === 'wild') {
        await page.click('#battle-btn-run').catch(() => {});
        await page.waitForTimeout(250);
        continue;
      }

      if ((strategy === 'catch' || strategy === 'catch_new') && st.battle.mode === 'wild') {
        if (strategy === 'catch_new' && (
          (st.battle.enemySpeciesId && st.caughtSpeciesIds.includes(st.battle.enemySpeciesId)) ||
          observedTurns >= 3
        )) {
          await page.click('#battle-btn-run').catch(() => {});
          await page.waitForTimeout(240);
          continue;
        }
        telemetry.metrics.catchesAttempted++;
        if (telemetry.round2.isWave2 && st.biome === 'forest' && st.badgesCount === 0 && st.pos && getTileDepthInfo(st.pos.x, st.pos.y).depthTier === 0) {
          telemetry.round2.forestOutskirtsCatchesAttempted++;
        }
        const shouldWeaken = !weakenedWildOnce
          && st.battle.enemyHp > st.battle.enemyMaxHp * 0.65
          && (st.battle.enemyLevel >= 3 || st.battle.enemyMaxHp > 35);
        if (shouldWeaken) {
          weakenedWildOnce = true;
          const weakIdx = await page.evaluate(() => {
            const mon = window.__starlightApp?.battle?.player;
            const moveObjs = typeof mon?.getMoveObjects === 'function' ? mon.getMoveObjects() : [];
            const btns = Array.from(document.querySelectorAll('#battle-moves .move-card'));
            const ranked = btns.map((b, i) => ({
              i,
              disabled: b.disabled,
              power: moveObjs[i]?.power ?? 0,
            })).filter((x) => !x.disabled && x.power > 0);
            ranked.sort((a, b) => a.power - b.power);
            return ranked[0]?.i ?? -1;
          });
          if (weakIdx >= 0) {
            await page.locator('#battle-moves .move-card').nth(weakIdx).click().catch(() => {});
            await page.waitForTimeout(260);
            continue;
          }
        }
        if (strategy === 'catch_new' && st.greatBalls > 0) {
          await page.click('#battle-btn-great').catch(() => {});
        } else {
          await page.click('#battle-btn-ball').catch(() => {});
        }
        await page.waitForTimeout(320);
        continue;
      }

      if (strategy === 'potion_win') {
        if (st.battle.playerHp !== null && st.battle.playerMaxHp && st.battle.playerHp < st.battle.playerMaxHp * 0.65 && st.potions > 0) {
          await page.click('#battle-btn-potion').catch(() => {});
          await page.waitForTimeout(240);
          continue;
        }
      }

      if (strategy === 'tactical') {
        if (!usedPotionOnce && st.battle.playerHp < st.battle.playerMaxHp * 0.65 && st.potions > 0) {
          usedPotionOnce = true;
          await page.click('#battle-btn-potion').catch(() => {});
          await page.waitForTimeout(240);
          continue;
        }
        if (!switchedOnce && st.party.filter((p) => p.hp > 0).length >= 2 && observedTurns >= 2) {
          switchedOnce = true;
          await page.click('#battle-btn-team').catch(() => {});
          await page.waitForTimeout(180);
          const cards = page.locator('#battle-team-list .battle-switch-card:not([disabled])');
          if (await cards.count() > 0) {
            await cards.first().click().catch(() => {});
          } else {
            await page.click('#battle-team-close').catch(() => {});
          }
          await page.waitForTimeout(240);
          continue;
        }
      }

      if (strategy === 'chaos') {
        const moveCards = page.locator('#battle-moves .move-card:not([disabled])');
        const mCount = await moveCards.count();
        if (mCount > 0) {
          const target = moveCards.nth(Math.floor(rng() * mCount));
          // Chaos Kid double-taps move cards and pokeball/team mid-animation
          await Promise.allSettled([
            target.click({ force: true }),
            target.click({ force: true }),
            page.click('#battle-log', { force: true }),
          ]);
        }
        await page.waitForTimeout(140);
        continue;
      }

      if (strategy === 'lose') {
        // Pick weakest / status move so high-level opponent wipes the squad cleanly
        const movePickIdx = await page.evaluate(() => {
          const app = window.__starlightApp;
          const mon = app?.battle?.player;
          const moveObjs = typeof mon?.getMoveObjects === 'function' ? mon.getMoveObjects() : [];
          const btns = Array.from(document.querySelectorAll('#battle-moves .move-card'));
          if (!btns.length) return 0;
          const ranked = btns.map((b, i) => ({
            i,
            disabled: b.disabled,
            power: moveObjs[i]?.power ?? 40,
          })).filter((x) => !x.disabled);
          ranked.sort((a, b) => a.power - b.power);
          return ranked[0]?.i ?? 0;
        });
        await page.locator('#battle-moves .move-card').nth(movePickIdx).click().catch(() => {});
        await page.waitForTimeout(200);
        continue;
      }

      // Default 'win' / 'potion_win' / 'struggle': pick highest expected-damage move (power * eff * STAB), never spam 0-power/weak moves!
      const bestMoveIdx = await page.evaluate((preferStruggle) => {
        const mon = window.__starlightApp?.battle?.player;
        const moveObjs = typeof mon?.getMoveObjects === 'function' ? mon.getMoveObjects() : [];
        const myType = mon?.species?.type || null;
        const btns = Array.from(document.querySelectorAll('#battle-moves .move-card'));
        const candidates = btns.map((b, i) => {
          const txt = b.textContent || '';
          const effScore = txt.includes('SUPER') ? 2.0 : txt.includes('NOT VERY') ? 0.5 : txt.includes('IMMUNE') ? 0 : 1.0;
          const m = txt.match(/(\d+)\s*\/\s*(\d+)/);
          const pp = m ? Number(m[1]) : 10;
          const mo = moveObjs[i];
          const power = Number(mo?.power) || 0;
          const stab = (myType && mo?.type === myType) ? 1.25 : 1.0;
          const dmgScore = power > 0 ? power * effScore * stab : -1;
          return { i, disabled: b.disabled, effScore, pp, dmgScore };
        }).filter((c) => !c.disabled);
        if (!candidates.length) return 0;
        if (preferStruggle) {
          candidates.sort((a, b) => a.pp - b.pp);
          return candidates[0].i;
        }
        candidates.sort((a, b) => (b.dmgScore - a.dmgScore) || (b.effScore - a.effScore) || (b.pp - a.pp));
        return candidates[0].i;
      }, strategy === 'struggle' && !usedStruggleTest);

      if (strategy === 'struggle') usedStruggleTest = true;
      await page.locator('#battle-moves .move-card').nth(bestMoveIdx).click().catch(() => {});
      await page.waitForTimeout(200);
      continue;
    }

    // Advance battle log typewriter gently during enemy/animation states without breaking state
    await page.click('#battle-log', { force: true }).catch(() => {});
    await page.waitForTimeout(160);
  }

  const endSt = await getGameState(page);
  const res = endSt.battle.lastResult;
  telemetry.metrics.lastBattleResult = res;
  if (res?.outcome === 'won') telemetry.metrics.battlesWon++;
  if (res?.outcome === 'caught') {
    telemetry.metrics.catchesSucceeded++;
    if (telemetry.round2.isWave2 && endSt.biome === 'forest' && endSt.badgesCount <= 1 && endSt.pos && getTileDepthInfo(endSt.pos.x, endSt.pos.y).depthTier === 0) {
      telemetry.round2.forestOutskirtsCatchesSucceeded++;
    }
  }
  if (res?.faintedAll) telemetry.metrics.battlesFaintedAll++;
  await syncRound2HooksTelemetry(page, telemetry, recordAnomaly, stage);
  return endSt;
}

async function pickDangerTargetForDefeat(page, rng) {
  const st = await getGameState(page);
  const maxLv = Math.max(5, ...(st.party || []).map((p) => p.level || 5));
  const pool = [
    ...WORLD_INDEX.shrines.map((s) => ({ kind: 'shrine', ...s })),
    ...WORLD_INDEX.rivals.map((r) => ({ kind: 'rival', level: Math.max(...(r.party || [10]).map((p) => p.level || 10)), ...r })),
  ].sort((a, b) => (a.level || 10) - (b.level || 10));

  // Want opponent clearly strong enough (+7 levels over max squad member) while preferring road-accessible targets
  const strongEnough = pool.filter((t) => (t.level || 10) >= maxLv + 7);
  const candidates = strongEnough.length ? strongEnough : pool.slice(-4);
  // Caldera Blaze (45,14) has 0 encounter tiles along road; prioritize closer candidates near Village
  candidates.sort((a, b) => (Math.abs(a.x - 8) + Math.abs(a.y - 15)) - (Math.abs(b.x - 8) + Math.abs(b.y - 15)));
  return candidates[Math.floor(rng() * Math.min(2, candidates.length))];
}

async function runMandatoryDefeatAndResetVerify(page, spec, rng, telemetry, recordAnomaly, {
  targetOverride = null,
  stage = 'mandatory-defeat',
  chaosMidBattle = null,
} = {}) {
  // Ensure modals are closed & clear any previous battle result marker
  for (const closeSel of ['#pokedex-close-btn', '#settings-close-btn', '#briefing-cancel-btn', '#minigame-close-btn']) {
    const isVis = await page.locator(closeSel).isVisible().catch(() => false);
    if (isVis) await page.click(closeSel, { force: true }).catch(() => {});
  }
  await dismissDialogue(page, telemetry, recordAnomaly, `${stage}-pre`);
  await page.evaluate(() => {
    if (window.__starlightApp) window.__starlightApp._lastPlaytestBattleResult = null;
  });

  const target = targetOverride || await pickDangerTargetForDefeat(page, rng);

  const arrived = await navigateToCoord(page, target.x, target.y, {
    telemetry,
    recordAnomaly,
    rng,
    maxDistance: 1,
    maxMs: 65000,
    fightWilds: 'run',
    stage,
  });

  if (!arrived) {
    recordAnomaly('P1', 'Gameplay/Mechanic', 'DEFEAT_NAVIGATION_TIMEOUT', `Could not reach (${target.x},${target.y}) within 65s`, { stage });
  }

  // Trigger interaction at target if not already in briefing/battle
  let st = await getGameState(page);
  if (!st.modals.briefing && !st.battle.active) {
    await triggerInteractAtTarget(page, target.x, target.y, telemetry, recordAnomaly, stage);
    st = await getGameState(page);
  }

  if (st.modals.briefing) {
    telemetry.metrics.briefingsOpened++;
    await auditLayout(page, telemetry, recordAnomaly, `${stage}-briefing`);
    await page.click('#briefing-battle-btn');
    await page.waitForTimeout(450);
  }

  // Wait up to 4s for battle to activate
  for (let i = 0; i < 20; i++) {
    st = await getGameState(page);
    if (st.battle.active) break;
    if (st.modals.dialogue) await dismissDialogue(page, telemetry, recordAnomaly, stage);
    await page.waitForTimeout(200);
  }

  // Fallback to road-accessible Caldera Champion Blaze (45,14) if first target was unavailable
  if (!st.battle.active) {
    const alt = WORLD_INDEX.rivals.find((r) => r.key === '45,14') || WORLD_INDEX.shrines[4];
    await navigateToCoord(page, alt.x, alt.y, { telemetry, recordAnomaly, rng, maxDistance: 1, maxMs: 35000, fightWilds: 'run', stage });
    await triggerInteractAtTarget(page, alt.x, alt.y, telemetry, recordAnomaly, stage);
    if ((await getGameState(page)).modals.briefing) {
      await page.click('#briefing-battle-btn').catch(() => {});
      await page.waitForTimeout(400);
    }
  }

  const endSt = await playActiveBattleToEnd(page, {
    strategy: 'lose',
    telemetry,
    recordAnomaly,
    rng,
    stage,
    chaosMidBattle,
  });

  const lastRes = endSt.battle?.lastResult;
  if (!lastRes?.faintedAll) {
    recordAnomaly('P1', 'Gameplay/Mechanic', 'DEFEAT_NOT_FAINTED_ALL', `Expected faintedAll=true defeat vs ${target.name || target.id}, got outcome=${lastRes?.outcome}`, { stage });
  }

  // Wait for rescue dialogue (Professor Willow) and dismiss cleanly
  await page.waitForTimeout(350);
  const rescueSt = await getGameState(page);
  if (rescueSt.modals.dialogue) {
    await dismissDialogue(page, telemetry, recordAnomaly, `${stage}-willow-rescue`, 15);
  } else if (lastRes?.faintedAll) {
    recordAnomaly('P2', 'Polish/UX', 'MISSING_WILLOW_RESCUE_DIALOGUE', 'Professor Willow rescue dialogue did not appear after faintedAll defeat', { stage });
  }

  await page.waitForTimeout(350);
  const post = await getGameState(page);
  await auditLayout(page, telemetry, recordAnomaly, `${stage}-post-reset`);

  // Verify every invariant of clean reset at Starlight Village (8, 15)
  const spawnX = GAME_META.spawn.x;
  const spawnY = GAME_META.spawn.y;

  if (!post.pos || post.pos.x !== spawnX || post.pos.y !== spawnY) {
    recordAnomaly('P0', 'Gameplay/Mechanic', 'POST_DEFEAT_WRONG_POS', `Post-defeat pos=${JSON.stringify(post.pos)}, expected (${spawnX},${spawnY})`, { stage });
  }

  const unhealed = (post.party || []).filter((p) => p.hp !== p.maxHp || p.hp <= 0 || p.moves.some((m) => m.pp !== m.maxPp));
  if (unhealed.length > 0) {
    recordAnomaly('P0', 'Gameplay/Mechanic', 'POST_DEFEAT_UNHEALED', `Post-defeat party not fully restored HP/PP: ${JSON.stringify(unhealed)}`, { stage });
  }

  if (post.battle.active || post.battle.screenVisible) {
    recordAnomaly('P0', 'Code', 'POST_DEFEAT_BATTLE_STILL_OPEN', 'Battle state or #battle-screen stayed active/visible after defeat reset', { stage });
  }

  const staleModals = Object.entries(post.modals)
    .filter(([, v]) => v === true)
    .map(([k]) => k);
  if (staleModals.length > 0) {
    recordAnomaly('P1', 'Visual/HUD', 'POST_DEFEAT_STALE_MODAL', `Leftover modal(s)/overlay(s) visible after defeat reset: ${staleModals.join(', ')}`, { stage });
  }

  if (post.overworld.interactPillVisible) {
    recordAnomaly('P1', 'Visual/HUD', 'POST_DEFEAT_STALE_INTERACT_PILL', `Stale #interact-pill remained visible at (${spawnX},${spawnY}): "${post.overworld.interactHintText}"`, { stage });
  }

  if (post.overworld.paused) {
    recordAnomaly('P0', 'Code', 'POST_DEFEAT_OVERWORLD_PAUSED', 'Overworld remained paused after defeat reset & dialogue dismissal', { stage });
  }

  if (post.overworld.graceSteps <= 0) {
    recordAnomaly('P2', 'Gameplay/Mechanic', 'POST_DEFEAT_NO_GRACE_STEPS', `encounterGraceSteps=${post.overworld.graceSteps} after defeat reset`, { stage });
  }

  if (!post.savedPos || post.savedPos.x !== spawnX || post.savedPos.y !== spawnY) {
    recordAnomaly('P1', 'Code', 'POST_DEFEAT_STORAGE_NOT_SAVED', `localStorage pos not saved cleanly as (${spawnX},${spawnY}): ${JSON.stringify(post.savedPos)}`, { stage });
  }

  if (!post.audio.muted && post.audio.unlocked && post.audio.bgmMode && !['overworld', 'village'].includes(post.audio.bgmMode)) {
    recordAnomaly('P2', 'Audio/Assets', 'POST_DEFEAT_BGM_NOT_RESTORED', `Post-defeat BGM remained "${post.audio.bgmMode}" (${post.audio.bgmKey})`, { stage });
  }

  // Final Walkable Control Verification: press ArrowRight / tap adjacent (9,15) and verify real movement
  await page.keyboard.down('ArrowRight').catch(() => {});
  await page.waitForTimeout(320);
  await page.keyboard.up('ArrowRight').catch(() => {});
  await page.waitForTimeout(220);
  const movedSt = await getGameState(page);
  if (movedSt.pos?.x === spawnX && movedSt.pos?.y === spawnY) {
    // Try ArrowDown as well in case something stood right
    await page.keyboard.down('ArrowDown').catch(() => {});
    await page.waitForTimeout(320);
    await page.keyboard.up('ArrowDown').catch(() => {});
    await page.waitForTimeout(220);
  }
  const movedSt2 = await getGameState(page);
  const posAtSpawn = Boolean(post.pos && post.pos.x === spawnX && post.pos.y === spawnY);
  const walkedCleanly = Boolean(movedSt2.pos && (movedSt2.pos.x !== spawnX || movedSt2.pos.y !== spawnY));
  if (!walkedCleanly) {
    recordAnomaly('P0', 'Code', 'POST_DEFEAT_SOFTLOCK_CANNOT_WALK', `Player could not walk away from (${spawnX},${spawnY}) after defeat reset`, { stage });
  } else if (lastRes?.faintedAll && posAtSpawn && unhealed.length === 0) {
    telemetry.metrics.resetsVerified++;
  }
}

// ---------------- 10 Behavioral Cohort Implementations ----------------

async function triggerWildEncounterAtGrass(page, gx, gy, { maxSteps = 36 } = {}) {
  for (let i = 0; i < maxSteps; i++) {
    const st = await getGameState(page);
    if (st.battle.active) return true;
    const targetX = i % 2 === 0 ? gx : gx + 1;
    await page.evaluate(({ x, y }) => {
      window.__starlightApp?.overworld?.walkToTile?.(x, y);
    }, { x: targetX, y: gy });
    await page.waitForTimeout(160);
  }
  return Boolean((await getGameState(page)).battle.active);
}

async function runCohort1(page, spec, rng, telemetry, recordAnomaly) {
  // Chaos Kid Tapper: rapid double-taps, mid-animation clicks, opening Settings mid-battle right before/during faint
  await clickWorldTile(page, 9, 14);
  await page.click('#hud-btn-dex').catch(() => {});
  await page.click('#pokedex-close-btn', { force: true }).catch(() => {});
  await page.keyboard.press('t').catch(() => {});
  await page.waitForTimeout(120);
  await page.keyboard.press('h').catch(() => {});
  await page.waitForTimeout(250);

  if (spec.isWave2) {
    // Rapid Round 2 hotkey + multi-touch fuzzing during warp & HUD transitions
    for (const k of ['t', 'p', 'Escape', 'm', 'm', 'h', 'Escape', 'Space']) {
      await page.keyboard.press(k).catch(() => {});
      await page.waitForTimeout(45);
    }
    await dismissDialogue(page, telemetry, recordAnomaly, 'c1-r2-hotkey-fuzz');
    if (await page.locator('#pokedex-close-btn').isVisible().catch(() => false)) {
      await page.click('#pokedex-close-btn', { force: true }).catch(() => {});
    }
    await auditLayout(page, telemetry, recordAnomaly, 'c1-r2-post-fuzz');
    await sampleFps(page, telemetry);
    recordDelight(telemetry, 'RAPID_HOTKEY_FUZZ_RESILIENT', 'Code', 'c1-r2-post-fuzz', 'Rapid T/P/M/H/Escape/Space hotkey storm left clean responsive overworld');
  }

  // Trigger wild encounter in Forest grass (9, 6)
  await navigateToCoord(page, 9, 6, { telemetry, recordAnomaly, rng, maxDistance: 0, maxMs: 22000, fightWilds: 'win', stage: 'c1-grass' });
  await triggerWildEncounterAtGrass(page, 9, 6, { maxSteps: 36 });

  if ((await getGameState(page)).battle.active) {
    await playActiveBattleToEnd(page, {
      strategy: 'chaos',
      telemetry,
      recordAnomaly,
      rng,
      stage: 'c1-chaos-wild',
      chaosMidBattle: async () => {
        if (spec.isWave2) {
          // Fuzz battle hotkeys 1-4 + Space during mid-turn input
          for (const bk of ['1', '2', '3', 'Space']) {
            await page.keyboard.press(bk).catch(() => {});
            await page.waitForTimeout(30);
          }
        }
        // Test pressing Escape + attempting #hud-btn-settings & openSettings() mid-battle
        await page.keyboard.press('Escape').catch(() => {});
        const settingsBtn = page.locator('#hud-btn-settings');
        const btnEnabled = await settingsBtn.isEnabled().catch(() => false);
        if (btnEnabled && await settingsBtn.isVisible().catch(() => false)) {
          await settingsBtn.click({ timeout: 1000 }).catch(() => {});
        } else {
          await page.evaluate(() => window.__starlightApp?.openSettings?.());
        }
        await page.waitForTimeout(120);
        const stMid = await getGameState(page);
        if (stMid.modals.settings) {
          recordAnomaly('P1', 'Code', 'SETTINGS_ALLOWED_MID_BATTLE', 'Settings modal opened while battle is active without battle guard', { stage: 'c1-chaos-wild' });
          await auditLayout(page, telemetry, recordAnomaly, 'c1-settings-mid-battle');
          if (spec.seed % 2 === 1) {
            await page.click('#setting-switch-trainer-btn', { force: true }).catch(() => {});
            await page.waitForTimeout(200);
            const afterSwitch = await getGameState(page);
            if (!afterSwitch.bootVisible) {
              recordAnomaly('P1', 'Code', 'SWITCH_TRAINER_MID_BATTLE_BROKEN', 'Switching trainer from Settings mid-battle left unexpected screen state', { stage: 'c1-chaos-wild' });
            } else {
              await page.click(`#trainer-card-${spec.trainerId}`, { force: true }).catch(() => {});
              await page.waitForSelector('#game-shell', { state: 'visible', timeout: 8000 }).catch(() => {});
              const backSt = await getGameState(page);
              if (backSt.battle.active || backSt.battle.screenVisible) {
                recordAnomaly('P0', 'Code', 'BATTLE_LEAKED_AFTER_TRAINER_SWITCH', 'Battle stayed active/visible after mid-battle trainer switch', { stage: 'c1-chaos-wild' });
              }
            }
          } else {
            await page.click('#setting-pace-btn', { force: true }).catch(() => {});
            await page.click('#settings-close-btn', { force: true }).catch(() => {});
          }
        }
      },
    });
  }

  // Test opening Settings right BEFORE/DURING fainting in lethal Shrine battle
  const shrine = WORLD_INDEX.shrines.find((s) => s.x === 23 && s.y === 13) || WORLD_INDEX.shrines[3];
  await runMandatoryDefeatAndResetVerify(page, spec, rng, telemetry, recordAnomaly, {
    targetOverride: shrine,
    stage: 'c1-mandatory-defeat',
    chaosMidBattle: async () => {
      // Launch move first so enemy lethal attack & battle end fire while Settings is opened mid-turn
      await page.locator('#battle-moves .move-card:not([disabled])').last().click().catch(() => {});
      await page.waitForTimeout(150);
      const settingsBtn = page.locator('#hud-btn-settings');
      if ((await settingsBtn.isEnabled().catch(() => false)) && (await settingsBtn.isVisible().catch(() => false))) {
        await settingsBtn.click({ timeout: 1000 }).catch(() => {});
      } else {
        await page.evaluate(() => window.__starlightApp?.openSettings?.());
      }
      await page.waitForTimeout(120);
      if (spec.seed % 2 === 0 && (await getGameState(page)).modals.settings) {
        for (let w = 0; w < 24; w++) {
          await page.waitForTimeout(250);
          const cur = await getGameState(page);
          if (!cur.battle.active) {
            if (cur.modals.settings && cur.modals.dialogue) {
              recordAnomaly('P1', 'Visual/HUD', 'SETTINGS_MASKS_RESCUE_DIALOGUE', 'Settings modal stayed open over Professor Willow rescue dialogue after battle faintedAll', { stage: 'c1-pre-faint-settings' });
            }
            break;
          }
        }
      }
      if ((await getGameState(page)).modals.settings) {
        await page.click('#settings-close-btn', { force: true }).catch(() => {});
      }
    },
  });
  await sampleFps(page, telemetry);
}

async function runCohort2(page, spec, rng, telemetry, recordAnomaly) {
  if (!spec.isWave2) {
    // Round 1 Boss & Shrine Rusher behavior (deterministic for seeds 11..20)
    const nearTarget = spec.seed % 2 === 1
      ? WORLD_INDEX.rivals.find((r) => r.key === '11,5')
      : WORLD_INDEX.shrines.find((s) => s.key === '15,3');

    await navigateToCoord(page, nearTarget.x, nearTarget.y, { telemetry, recordAnomaly, rng, maxDistance: 1, maxMs: 25000, fightWilds: 'run', stage: 'c2-near-boss' });
    await triggerInteractAtTarget(page, nearTarget.x, nearTarget.y, telemetry, recordAnomaly, 'c2-near-briefing');
    const st = await getGameState(page);
    if (st.modals.briefing) {
      telemetry.metrics.briefingsOpened++;
      await auditLayout(page, telemetry, recordAnomaly, 'c2-briefing-near');
      await page.click('#briefing-cancel-btn').catch(() => {});
      await page.waitForTimeout(150);
      await triggerInteractAtTarget(page, nearTarget.x, nearTarget.y, telemetry, recordAnomaly, 'c2-near-reopen');
      await page.click('#briefing-battle-btn').catch(() => {});
      await page.waitForTimeout(350);
    }
    if ((await getGameState(page)).battle.active) {
      await playActiveBattleToEnd(page, { strategy: 'win', telemetry, recordAnomaly, rng, stage: 'c2-near-combat' });
      await dismissDialogue(page, telemetry, recordAnomaly, 'c2-post-near');
    }
    const hardTarget = spec.seed % 2 === 1
      ? WORLD_INDEX.shrines.find((s) => s.key === '23,13')
      : WORLD_INDEX.rivals.find((r) => r.key === '45,14');
    await runMandatoryDefeatAndResetVerify(page, spec, rng, telemetry, recordAnomaly, {
      targetOverride: hardTarget,
      stage: 'c2-boss-wipe',
    });
    return;
  }

  // Round 2 Onboarding + Starter Parity + Forest Shrine + Astral Trial Arc
  recordCompassGoalSnapshot(await getGameState(page), telemetry);

  // 1) Talk to Professor Willow (9, 12) -> verify Compass -> Meet Ranger Fern
  await navigateToCoord(page, 9, 12, { telemetry, recordAnomaly, rng, maxDistance: 1, maxMs: 12000, fightWilds: 'run', stage: 'c2-r2-willow' });
  await triggerInteractAtTarget(page, 9, 12, telemetry, recordAnomaly, 'c2-r2-willow-talk');
  recordCompassGoalSnapshot(await getGameState(page), telemetry);

  // 2) Step to Forest Outskirts entrance (9, 6) -> verify depthTier 0 Outskirts
  await navigateToCoord(page, 9, 6, { telemetry, recordAnomaly, rng, maxDistance: 0, maxMs: 14000, fightWilds: 'run', stage: 'c2-r2-outskirts' });
  await verifyForestOutskirtsDepth(page, telemetry, recordAnomaly, 'c2-r2-outskirts');

  // 3) Meet Ranger Fern (10, 7) -> verify Compass -> Catch Forest Friends
  await navigateToCoord(page, 10, 7, { telemetry, recordAnomaly, rng, maxDistance: 1, maxMs: 14000, fightWilds: 'run', stage: 'c2-r2-fern' });
  await triggerInteractAtTarget(page, 10, 7, telemetry, recordAnomaly, 'c2-r2-fern-talk');
  recordCompassGoalSnapshot(await getGameState(page), telemetry);

  // Heal starter to 100% HP at fountain if chipped while approaching Fern so solo Lv.5 readiness is pure
  const preRushSt = await getGameState(page);
  if (preRushSt.party[0] && preRushSt.party[0].hp < preRushSt.party[0].maxHp) {
    await page.keyboard.press('h').catch(() => {});
    await page.waitForTimeout(450);
    await navigateToCoord(page, 7, 13, { telemetry, recordAnomaly, rng, maxDistance: 1, maxMs: 12000, fightWilds: 'run', stage: 'c2-r2-fountain' });
    await triggerInteractAtTarget(page, 7, 13, telemetry, recordAnomaly, 'c2-r2-fountain-heal');
  }

  // 4) Rush Forest Shrine (15, 3) with solo Lv.5 starter -> verify Lv.6 + Squirtle vs Bulbasaur/Charmander readiness
  await navigateToCoord(page, 15, 3, { telemetry, recordAnomaly, rng, maxDistance: 1, maxMs: 20000, fightWilds: 'run', stage: 'c2-r2-forest-shrine' });
  await triggerInteractAtTarget(page, 15, 3, telemetry, recordAnomaly, 'c2-r2-forest-shrine-briefing');
  let st = await getGameState(page);
  const bInfo = st.briefingInfo;
  if (bInfo) {
    telemetry.metrics.briefingsOpened++;
    telemetry.round2.forestShrineLevelObserved = bInfo.levelText;
    telemetry.round2.forestShrineReadinessTier = bInfo.tier;
    telemetry.round2.forestShrineReadinessBadge = bInfo.badgeText;
    telemetry.round2.forestShrinePivotLabel = bInfo.pivotLabel || null;
    await auditLayout(page, telemetry, recordAnomaly, 'c2-r2-forest-shrine-briefing');

    if (bInfo.levelText !== 'Lv.6') {
      recordAnomaly('P1', 'Gameplay/Mechanic', 'FOREST_SHRINE_LEVEL_NOT_6', `Expected Forest Shrine Lv.6 for fresh starter, got "${bInfo.levelText}"`, { stage: 'c2-r2-forest-shrine-briefing' });
    }
    if (spec.starterName === 'Squirtle') {
      if (bInfo.tier !== 'challenging' || !bInfo.pivotVisible || !/Farm Zone/i.test(bInfo.pivotLabel)) {
        recordAnomaly('P1', 'Gameplay/Mechanic', 'SQUIRTLE_SHRINE_READINESS_MISMATCH', `Expected solo Lv.5 Squirtle vs Lv.6 Pikachu to show challenging (⚠️ Tough) + ✨ Farm Zone, got tier=${bInfo.tier}, pivot="${bInfo.pivotLabel}"`, { stage: 'c2-r2-forest-shrine-briefing' });
      } else {
        recordDelight(telemetry, 'SQUIRTLE_TOUGH_FARM_PIVOT', 'Polish/UX', 'c2-r2-forest-shrine-briefing', `Solo Lv.5 Squirtle saw "${bInfo.badgeText}" with "${bInfo.pivotLabel}" pivot before Lv.6 Pikachu`);
        await page.click('#briefing-pivot-btn').catch(() => {});
        telemetry.round2.farmPivotClicked = true;
        await page.waitForTimeout(750);
        const afterPivot = await getGameState(page);
        telemetry.round2.farmPivotLandedOk = afterPivot.biome === 'forest';
        if (!telemetry.round2.farmPivotLandedOk) {
          recordAnomaly('P1', 'Gameplay/Mechanic', 'FARM_ZONE_PIVOT_WRONG_BIOME', `Expected Farm Zone pivot to land in Whispering Forest, landed in "${afterPivot.biome}"`, { stage: 'c2-r2-farm-pivot' });
        }
      }
    } else {
      if (bInfo.tier !== 'balanced' && bInfo.tier !== 'favored') {
        recordAnomaly('P1', 'Gameplay/Mechanic', 'STARTER_SHRINE_TOO_HARSH', `Expected Lv.5 ${spec.starterName} vs Lv.6 Pikachu to be balanced/favored, got tier=${bInfo.tier} ("${bInfo.badgeText}")`, { stage: 'c2-r2-forest-shrine-briefing' });
      } else {
        recordDelight(telemetry, 'STARTER_SHRINE_BALANCED', 'Gameplay/Mechanic', 'c2-r2-forest-shrine-briefing', `Solo Lv.5 ${spec.starterName} saw fair "${bInfo.badgeText}" at Forest Shrine Lv.6`);
      }
      await page.click('#briefing-battle-btn').catch(() => {});
      if (await waitForBriefingBattleStart(page, telemetry, recordAnomaly, 'c2-r2-shrine-start')) {
        const postShrine = await playActiveBattleToEnd(page, { strategy: 'potion_win', telemetry, recordAnomaly, rng, stage: 'c2-r2-shrine-combat' });
        await dismissDialogue(page, telemetry, recordAnomaly, 'c2-r2-post-shrine');
        if (postShrine.battle?.lastResult?.outcome === 'won') {
          await tryInspectShrineTrialBriefing(page, { x: 15, y: 3 }, telemetry, recordAnomaly, 'c2-r2-shrine-trial');
        }
      }
    }
  }

  // Catch early friends + claim Ranger Supplies (3,3) + finish Squirtle Shrine clear
  if (telemetry.round2.farmPivotClicked || (await getGameState(page)).caughtCount < 3) {
    await navigateToCoord(page, 8, 6, { telemetry, recordAnomaly, rng, maxDistance: 0, maxMs: 16000, fightWilds: 'run', stage: 'c2-r2-friends-walk' });
    for (let i = 0; i < 6 && (await getGameState(page)).caughtCount < 3; i++) {
      if (!(await triggerWildEncounterAtGrass(page, 8, 6, { maxSteps: 22 }))) break;
      await playActiveBattleToEnd(page, { strategy: 'catch_new', telemetry, recordAnomaly, rng, stage: 'c2-r2-friends-catch' });
      await dismissDialogue(page, telemetry, recordAnomaly, 'c2-r2-friends-dlg');
    }
    recordCompassGoalSnapshot(await getGameState(page), telemetry);

    await navigateToCoord(page, 3, 3, { telemetry, recordAnomaly, rng, maxDistance: 1, maxMs: 16000, fightWilds: 'run', stage: 'c2-r2-supplies-walk' });
    await triggerInteractAtTarget(page, 3, 3, telemetry, recordAnomaly, 'c2-r2-supplies-open');
    recordCompassGoalSnapshot(await getGameState(page), telemetry);

    if (spec.starterName === 'Squirtle') {
      await navigateToCoord(page, 15, 3, { telemetry, recordAnomaly, rng, maxDistance: 1, maxMs: 18000, fightWilds: 'run', stage: 'c2-r2-squirtle-shrine-return' });
      await triggerInteractAtTarget(page, 15, 3, telemetry, recordAnomaly, 'c2-r2-squirtle-shrine-brief');
      if ((await getGameState(page)).modals.briefing) {
        await page.click('#briefing-battle-btn').catch(() => {});
        if (await waitForBriefingBattleStart(page, telemetry, recordAnomaly, 'c2-r2-squirtle-shrine-start')) {
          const postSq = await playActiveBattleToEnd(page, { strategy: 'potion_win', telemetry, recordAnomaly, rng, stage: 'c2-r2-squirtle-shrine-fight' });
          await dismissDialogue(page, telemetry, recordAnomaly, 'c2-r2-squirtle-shrine-win');
          if (postSq.battle?.lastResult?.outcome === 'won') {
            await tryInspectShrineTrialBriefing(page, { x: 15, y: 3 }, telemetry, recordAnomaly, 'c2-r2-squirtle-trial');
          }
        }
      }
    }
  }

  const compassList = telemetry.round2.compassStepsObserved;
  const sawFern = compassList.some((s) => /Fern/i.test(s));
  const sawFriends = compassList.some((s) => /Forest Friends/i.test(s));
  telemetry.round2.compassProgressionOk = sawFern && sawFriends;
  if (!telemetry.round2.compassProgressionOk) {
    recordAnomaly('P2', 'Polish/UX', 'COMPASS_NOVICE_PROGRESSION_INCOMPLETE', `Expected Fern -> Forest Friends in novice compass steps, saw: ${JSON.stringify(compassList)}`, { stage: 'c2-r2-compass' });
  } else {
    recordDelight(telemetry, 'COMPASS_NOVICE_GUIDANCE', 'Polish/UX', 'c2-r2-compass', `Novice Compass cleanly walked ${compassList.join(' -> ')}`);
  }

  await syncRound2HooksTelemetry(page, telemetry, recordAnomaly, 'c2-r2-sync');
  await sampleFps(page, telemetry);

  // Return to Starlight Village Safe Zone so long cross-biome boss navigation uses main road
  await page.click('#warp-safe-btn').catch(() => page.keyboard.press('h'));
  await page.waitForTimeout(550);

  const hardTarget = spec.seed % 2 === 1
    ? WORLD_INDEX.shrines.find((s) => s.key === '23,13')
    : WORLD_INDEX.rivals.find((r) => r.key === '45,14');
  await runMandatoryDefeatAndResetVerify(page, spec, rng, telemetry, recordAnomaly, {
    targetOverride: hardTarget,
    stage: 'c2-boss-wipe',
  });
}

async function runCohort3(page, spec, rng, telemetry, recordAnomaly) {
  const c3Start = Date.now();
  // Collector & 1,025-Dex Explorer: catch wilds, search/filter Dex (including regex/punctuation), cries, Team/Box, Shard upgrade, Cheer
  await navigateToCoord(page, 9, 6, { telemetry, recordAnomaly, rng, maxDistance: 0, maxMs: 20000, fightWilds: 'run', stage: 'c3-catch-walk' });
  const targetPartyOrCatches = spec.isWave2 ? 4 : 2;
  for (let attempt = 0; attempt < (spec.isWave2 ? 7 : 6) && (await getGameState(page)).caughtCount < targetPartyOrCatches; attempt++) {
    const triggered = await triggerWildEncounterAtGrass(page, 9, 6, { maxSteps: 22 });
    if (!triggered) break;
    await playActiveBattleToEnd(page, { strategy: spec.isWave2 ? 'catch_new' : 'catch', telemetry, recordAnomaly, rng, stage: 'c3-catch-wild' });
    await dismissDialogue(page, telemetry, recordAnomaly, 'c3-after-catch');
    const curCatch = await getGameState(page);
    if (curCatch.party[0] && curCatch.party[0].hp < curCatch.party[0].maxHp * 0.45) {
      await page.keyboard.press('h').catch(() => {});
      await page.waitForTimeout(420);
      await navigateToCoord(page, 7, 13, { telemetry, recordAnomaly, rng, maxDistance: 1, maxMs: 12000, fightWilds: 'run', stage: 'c3-heal' });
      await triggerInteractAtTarget(page, 7, 13, telemetry, recordAnomaly, 'c3-heal-fountain');
      await navigateToCoord(page, 9, 6, { telemetry, recordAnomaly, rng, maxDistance: 0, maxMs: 14000, fightWilds: 'run', stage: 'c3-return-grass' });
    }
  }

  if (spec.isWave2) {
    // Verify 0-badge Forest Outskirts Rare Patch rolls 0 random Elites
    await triggerOutskirtsRarePatchEncounter(page, telemetry, recordAnomaly, 'c3-r2-rare-patch', { maxWaitMs: 6500 });
    // Open Chest (17,1) Emerald Canopy Chest (Verdant Gem) & fight Ranger Leo (11,5) when budget allows
    await navigateToCoord(page, 17, 1, { telemetry, recordAnomaly, rng, maxDistance: 1, maxMs: 15000, fightWilds: 'run', stage: 'c3-r2-leaf-chest' });
    await triggerInteractAtTarget(page, 17, 1, telemetry, recordAnomaly, 'c3-r2-leaf-chest-open');
    if (Date.now() - c3Start < 140000) {
      await navigateToCoord(page, 11, 5, { telemetry, recordAnomaly, rng, maxDistance: 1, maxMs: 12000, fightWilds: 'run', stage: 'c3-r2-leo' });
      await triggerInteractAtTarget(page, 11, 5, telemetry, recordAnomaly, 'c3-r2-leo-brief');
      if ((await getGameState(page)).modals.briefing) {
        await page.click('#briefing-battle-btn').catch(() => {});
        if (await waitForBriefingBattleStart(page, telemetry, recordAnomaly, 'c3-r2-leo-start')) {
          await playActiveBattleToEnd(page, { strategy: 'potion_win', telemetry, recordAnomaly, rng, stage: 'c3-r2-leo-fight' });
          await dismissDialogue(page, telemetry, recordAnomaly, 'c3-r2-leo-win');
        }
      }
    }
    await page.click('#warp-safe-btn').catch(() => page.keyboard.press('h'));
    await page.waitForTimeout(450);
  }

  // Open Chest 26,1 or 4,24 for real Star Shards before upgrading (skip slow Lagoon detour if C3 elapsed > 165s)
  const shardChest = (!spec.isWave2 || Date.now() - c3Start < 165000)
    ? WORLD_INDEX.chests.find((c) => c.key === '4,24')
    : null;
  if (shardChest) {
    await navigateToCoord(page, shardChest.x, shardChest.y, { telemetry, recordAnomaly, rng, maxDistance: 1, maxMs: 22000, fightWilds: 'run', stage: 'c3-chest' });
    await triggerInteractAtTarget(page, shardChest.x, shardChest.y, telemetry, recordAnomaly, 'c3-chest-open');
  }

  // Open Pokédex and stress search, filters, detail view, cries, team/box guards, upgrade/cheer
  await page.click('#hud-btn-dex');
  await page.waitForSelector('#pokedex-modal', { state: 'visible', timeout: 8000 });
  await auditLayout(page, telemetry, recordAnomaly, 'c3-dex-tab');

  const queries = ['pikachu', '1025', '.*+?^${}()|[]\\', 'Mr. Mime', 'Type: Null', "Farfetch'd"];
  for (const q of queries) {
    await page.fill('#dex-search-input', q);
    await page.waitForTimeout(80);
  }
  await page.click('#dex-search-clear').catch(() => {});
  await page.selectOption('#dex-type-select', 'electric').catch(() => {});
  await page.selectOption('#dex-gen-select', '9').catch(() => {});
  await page.selectOption('#dex-type-select', 'all').catch(() => {});
  await page.selectOption('#dex-gen-select', 'all').catch(() => {});
  await page.waitForTimeout(100);

  // Open detail card & play cry
  const firstCard = page.locator('#pokedex-body .dex-card').first();
  if (await firstCard.count()) {
    await firstCard.click().catch(() => {});
    await page.waitForTimeout(180);
    await auditImages(page, telemetry, recordAnomaly, 'c3-dex-detail');
    const cryBtn = page.locator('#dex-detail-cry-btn');
    if (await cryBtn.count()) await cryBtn.click().catch(() => {});
  }

  // Switch to Team & Box tab -> test Cheer, Star Shard Upgrade, Evolution, Deposit/Lead guards
  await page.click('#pokedex-tab-team');
  await page.waitForTimeout(200);
  await auditLayout(page, telemetry, recordAnomaly, 'c3-team-tab');
  await auditImages(page, telemetry, recordAnomaly, 'c3-team-tab');

  const upgradeBtn = page.locator('#pokedex-body button', { hasText: /Upgrade|Star Power/i }).first();
  if (await upgradeBtn.count()) await upgradeBtn.click().catch(() => {});
  const cheerBtn = page.locator('#pokedex-body button', { hasText: /Cheer/i }).first();
  if (await cheerBtn.count()) {
    await cheerBtn.click().catch(() => {});
    await page.waitForTimeout(150);
  }
  if (spec.isWave2) {
    const evoBtn = page.locator('#pokedex-body .evolve-btn').first();
    if (await evoBtn.count()) {
      await evoBtn.click().catch(() => {});
      await page.waitForTimeout(260);
      await auditLayout(page, telemetry, recordAnomaly, 'c3-r2-post-evo');
      await syncRound2HooksTelemetry(page, telemetry, recordAnomaly, 'c3-r2-evo');
      if (telemetry.round2.evoToastObserved) {
        recordDelight(telemetry, 'EVO_CELEBRATION_TOAST', 'Polish/UX', 'c3-r2-evo', 'In-modal evolution triggered Starlight celebration banner & toast cleanly');
      }
    }
  }
  const leadBtn = page.locator('#pokedex-body button', { hasText: /Set Lead|Make Lead/i }).first();
  if (await leadBtn.count()) await leadBtn.click().catch(() => {});

  // Check remaining tabs quick layout
  for (const tabSel of ['#pokedex-tab-badges', '#pokedex-tab-guide', '#pokedex-tab-trainer']) {
    await page.click(tabSel);
    await page.waitForTimeout(120);
    await auditLayout(page, telemetry, recordAnomaly, `c3-${tabSel}`);
  }

  await page.click('#pokedex-close-btn');
  await page.waitForTimeout(150);
  await syncRound2HooksTelemetry(page, telemetry, recordAnomaly, 'c3-end');
  await sampleFps(page, telemetry);
  if (spec.isWave2) {
    await page.click('#warp-safe-btn').catch(() => page.keyboard.press('h'));
    await page.waitForTimeout(450);
  }

  await runMandatoryDefeatAndResetVerify(page, spec, rng, telemetry, recordAnomaly, { stage: 'c3-mandatory-defeat' });
}

async function runCohort4(page, spec, rng, telemetry, recordAnomaly) {
  // Overworld Pathfind Torturer: long BFS walkToTile, tapping solid adjacent tiles, hold-and-drag steering, chests/signs/landmarks/NPCs/fountain/discovery nodes
  for (const pt of [{ x: 7, y: 13 }, { x: 10, y: 14 }, { x: 9, y: 12 }, { x: 5, y: 16 }]) {
    await navigateToCoord(page, pt.x, pt.y, { telemetry, recordAnomaly, rng, maxDistance: 1, maxMs: 12000, fightWilds: 'run', stage: `c4-village-${pt.x}-${pt.y}` });
    await triggerInteractAtTarget(page, pt.x, pt.y, telemetry, recordAnomaly, `c4-interact-${pt.x}-${pt.y}`);
  }

  // Deliberately tap a solid tile near walkable land (12,12) to verify snap
  await clickWorldTile(page, 12, 12);
  await page.waitForTimeout(400);

  // Hold-and-drag touch/mouse steering test across overworld canvas
  const dragBox = await page.locator('#overworld-canvas').boundingBox();
  if (dragBox) {
    const cx = dragBox.x + dragBox.width * 0.5;
    const cy = dragBox.y + dragBox.height * 0.55;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 75, cy, { steps: 6 });
    await page.waitForTimeout(250);
    await page.mouse.move(cx + 75, cy - 65, { steps: 6 });
    await page.waitForTimeout(250);
    await page.mouse.up();
  }

  // Trigger rare discovery node if present
  const rareSpot = await page.evaluate(() => {
    const spots = window.__starlightApp?.overworld?.rarePatches || [];
    return spots[0] ? { x: spots[0].x, y: spots[0].y, kind: spots[0].kind } : null;
  });
  if (rareSpot) {
    await navigateToCoord(page, rareSpot.x, rareSpot.y, { telemetry, recordAnomaly, rng, maxDistance: 0, maxMs: 25000, fightWilds: 'run', stage: 'c4-discovery' });
    await dismissDialogue(page, telemetry, recordAnomaly, 'c4-discovery-dlg');
  }

  if (spec.isWave2) {
    // March to Outer Gen 6-9 Biome (odd -> Pixie Faeveldt Glade 84,14 -> 92,4 Shrine; even -> Sunburst Alola Atoll 8,73 -> 6,76 Shrine)
    const isOdd = spec.seed % 2 === 1;
    const biomeSpot = isOdd ? { id: 'faeveldt', x: 84, y: 14, shrineKey: '92,4' } : { id: 'atoll', x: 8, y: 73, shrineKey: '6,76' };
    const reachedOuter = await navigateToCoord(page, biomeSpot.x, biomeSpot.y, {
      telemetry,
      recordAnomaly,
      rng,
      maxDistance: 2,
      maxMs: 55000,
      fightWilds: 'run',
      stage: `c4-r2-outer-${biomeSpot.id}`,
    });
    const outerSt = await getGameState(page);
    if (reachedOuter || OUTER_GEN_6_9_BIOMES.has(outerSt.biome)) {
      const visitedId = outerSt.biome || biomeSpot.id;
      if (!telemetry.round2.outerBiomesVisited.includes(visitedId)) {
        telemetry.round2.outerBiomesVisited.push(visitedId);
      }
      await auditLayout(page, telemetry, recordAnomaly, `c4-r2-outer-${visitedId}`);
      await sampleFps(page, telemetry);
      recordDelight(telemetry, 'OUTER_GEN6_9_BIOME_TRAVERSAL', 'World/Overworld', `c4-r2-outer-${visitedId}`, `Reached outer biome ${visitedId} cleanly via long road BFS`);
    }
    const outerShrine = WORLD_INDEX.shrines.find((s) => s.key === biomeSpot.shrineKey) || WORLD_INDEX.rivals.find((r) => r.key === '45,14');
    await runMandatoryDefeatAndResetVerify(page, spec, rng, telemetry, recordAnomaly, {
      targetOverride: outerShrine,
      stage: 'c4-r2-outer-defeat',
    });
    return;
  }

  // Round 1 Long cross-biome walk east -> Rival Blaze (45, 14) -> mandatory defeat
  const longGoal = WORLD_INDEX.rivals.find((r) => r.key === '45,14') || WORLD_INDEX.shrines[3];
  await runMandatoryDefeatAndResetVerify(page, spec, rng, telemetry, recordAnomaly, {
    targetOverride: longGoal,
    stage: 'c4-long-march-defeat',
  });
}

async function runCohort5(page, spec, rng, telemetry, recordAnomaly) {
  if (spec.isWave2) {
    // Round 2 Sky-Hop Un-attuned Progress Counter Check BEFORE earning 1 Badge or 5 Dex species!
    await navigateToCoord(page, 11, 13, { telemetry, recordAnomaly, rng, maxDistance: 0, maxMs: 12000, fightWilds: 'run', stage: 'c5-r2-unattuned-walk' });
    await page.evaluate(({ x, y }) => {
      const app = window.__starlightApp;
      const ow = app?.overworld;
      const prof = ow?.getProfile?.();
      if (!ow || !prof?.pos) return;
      prof.pos.dir = y < prof.pos.y ? 'up' : 'down';
      ow.refreshInteractHint?.();
    }, { x: SECRET_ARCADE_SPOT.x, y: SECRET_ARCADE_SPOT.y });
    await page.waitForTimeout(90);
    await page.click('#interact-pill', { force: true }).catch(() => page.keyboard.press('Space'));
    await page.waitForTimeout(240);
    const dlgSt = await getGameState(page);
    const dlgText = dlgSt.modals.dialogueText || '';
    telemetry.round2.skyHopUnattunedDialogue = dlgText;
    const expectedBadge = `1 Island Badge (${Math.min(1, dlgSt.badgesCount)}/1)`;
    const expectedDex = `5 Pokédex species (${Math.min(5, dlgSt.caughtCount)}/5)`;
    const countersOk = dlgText.includes(expectedBadge) && dlgText.includes(expectedDex);
    telemetry.round2.skyHopUnattunedCountersOk = countersOk;
    await auditLayout(page, telemetry, recordAnomaly, 'c5-r2-unattuned-dialogue');
    if (!countersOk) {
      recordAnomaly('P1', 'Polish/UX', 'SKYHOP_UNATTUNED_COUNTERS_MISSING', `Un-attuned wall dialogue missing "${expectedBadge}" or "${expectedDex}": "${dlgText}"`, { stage: 'c5-r2-unattuned' });
    } else {
      recordDelight(telemetry, 'SKYHOP_UNATTUNED_LIVE_COUNTERS', 'Polish/UX', 'c5-r2-unattuned', `Un-attuned cottage wall clearly showed "${expectedBadge}" and "${expectedDex}" without clipping`);
    }
    await dismissDialogue(page, telemetry, recordAnomaly, 'c5-r2-unattuned-dismiss');
  }

  // Sky-Hop Arcade Grinder: attune Starlight (5 species or 1 Badge), 3-knock (11,12), play Flight Charges, pause/resume, Star Dash, results replay, 5-Shard buy-in, non-village BGM restore
  await navigateToCoord(page, 9, 6, { telemetry, recordAnomaly, rng, maxDistance: 0, maxMs: 18000, fightWilds: 'run', stage: 'c5-attune-walk' });
  for (let k = 0; k < (spec.isWave2 ? 11 : 20) && (await getGameState(page)).caughtCount < 5; k++) {
    const cur = await getGameState(page);
    if (cur.party[0] && cur.party[0].hp < cur.party[0].maxHp * 0.4) {
      await navigateToCoord(page, 7, 13, { telemetry, recordAnomaly, rng, maxDistance: 0, maxMs: 12000, fightWilds: 'run', stage: 'c5-fountain-heal' });
      await triggerInteractAtTarget(page, 7, 13, telemetry, recordAnomaly, 'c5-fountain-interact');
      await navigateToCoord(page, 9, 6, { telemetry, recordAnomaly, rng, maxDistance: 0, maxMs: 15000, fightWilds: 'run', stage: 'c5-attune-return' });
    }
    if (!(await triggerWildEncounterAtGrass(page, 9, 6, { maxSteps: 22 }))) break;
    await playActiveBattleToEnd(page, { strategy: 'catch_new', telemetry, recordAnomaly, rng, stage: 'c5-attune-wild' });
    await dismissDialogue(page, telemetry, recordAnomaly, 'c5-attune-dlg');
  }

  if (spec.isWave2 && (await getGameState(page)).caughtCount < 5 && (await getGameState(page)).badgesCount < 1) {
    // Fallback attunement via Meadow Badge (Forest Shrine 15,3) if 15 catch loops hit bad RNG
    await navigateToCoord(page, 15, 3, { telemetry, recordAnomaly, rng, maxDistance: 1, maxMs: 18000, fightWilds: 'run', stage: 'c5-r2-shrine-attune' });
    await triggerInteractAtTarget(page, 15, 3, telemetry, recordAnomaly, 'c5-r2-shrine-brief');
    if ((await getGameState(page)).modals.briefing) {
      await page.click('#briefing-battle-btn').catch(() => {});
      if (await waitForBriefingBattleStart(page, telemetry, recordAnomaly, 'c5-r2-shrine-start')) {
        await playActiveBattleToEnd(page, { strategy: 'potion_win', telemetry, recordAnomaly, rng, stage: 'c5-r2-shrine-fight' });
        await dismissDialogue(page, telemetry, recordAnomaly, 'c5-r2-shrine-win');
      }
    }
  }

  // Return to Starlight Village (or warp safe) & 3-knock SECRET_ARCADE_SPOT (11, 12) from (11, 13)
  await page.click('#warp-safe-btn').catch(() => {});
  await page.waitForTimeout(550);
  await navigateToCoord(page, 11, 13, { telemetry, recordAnomaly, rng, maxDistance: 0, maxMs: 15000, fightWilds: 'run', stage: 'c5-arcade-spot' });
  for (let knock = 0; knock < 4; knock++) {
    await triggerInteractAtTarget(page, SECRET_ARCADE_SPOT.x, SECRET_ARCADE_SPOT.y, telemetry, recordAnomaly, `c5-knock-${knock + 1}`);
    const mgOpen = (await getGameState(page)).modals.minigame;
    if (mgOpen) break;
  }

  let st = await getGameState(page);
  if (!st.modals.minigame) {
    await page.click('#hud-btn-arcade').catch(() => {});
    await page.waitForTimeout(250);
    await dismissDialogue(page, telemetry, recordAnomaly, 'c5-arcade-hud');
    st = await getGameState(page);
  }

  if (spec.isWave2) {
    telemetry.round2.skyHopAttunedUnlocked = Boolean(st.arcadeUnlocked && st.modals.minigame);
  }

  if (st.modals.minigame) {
    telemetry.metrics.arcadeRuns++;
    await auditLayout(page, telemetry, recordAnomaly, 'c5-arcade-open');
    await page.click('#minigame-pause-btn').catch(() => {});
    await page.waitForTimeout(150);
    await page.click('#minigame-pause-btn').catch(() => {});
    await page.click('#minigame-dash-btn').catch(() => {});
    await page.keyboard.press('Space').catch(() => {});

    // Sweep lanes up/down so hazards naturally deplete 3 heart shields to audit #minigame-results cleanly
    let reachedResults = false;
    for (let t = 0; t < 48; t++) {
      const key = t % 4 < 2 ? 'ArrowDown' : 'ArrowUp';
      await page.keyboard.down(key).catch(() => {});
      await page.waitForTimeout(380);
      await page.keyboard.up(key).catch(() => {});
      const mst = await getGameState(page);
      if (mst.modals.minigameResults) {
        reachedResults = true;
        break;
      }
      if (!mst.modals.minigame) break;
    }

    if (reachedResults) {
      await auditLayout(page, telemetry, recordAnomaly, 'c5-arcade-results');
      const buyInBtn = page.locator('#minigame-shard-buy-btn');
      if (await buyInBtn.count() && await buyInBtn.isVisible()) {
        await buyInBtn.click().catch(() => {});
        await page.waitForTimeout(150);
      }
      await page.click('#minigame-replay-btn').catch(() => {});
      await page.waitForTimeout(300);
      await auditLayout(page, telemetry, recordAnomaly, 'c5-arcade-replay');
    }

    await page.click('#minigame-close-btn', { force: true }).catch(() => {});
    await page.waitForTimeout(200);
  } else {
    recordAnomaly('P1', 'Gameplay/Mechanic', 'ARCADE_NOT_OPENED', 'Could not open Sky-Hop Arcade after Starlight attunement & 3 knocks', { stage: 'c5-arcade' });
  }

  // Test opening & closing Arcade in a non-village biome (`forest`) and check BGM restoration
  await navigateToCoord(page, 10, 8, { telemetry, recordAnomaly, rng, maxDistance: 1, maxMs: 12000, fightWilds: 'run', stage: 'c5-forest-bgm' });
  if ((await getGameState(page)).arcadeUnlocked) {
    await page.click('#hud-btn-arcade').catch(() => {});
    await page.waitForTimeout(250);
    await page.click('#minigame-close-btn', { force: true }).catch(() => {});
    await page.waitForTimeout(200);
    const afterMg = await getGameState(page);
    if (afterMg.audio.unlocked && !afterMg.audio.muted && afterMg.audio.bgmMode === 'arcade') {
      recordAnomaly('P1', 'Audio/Assets', 'ARCADE_CLOSE_BGM_STUCK', 'Arcade BGM did not restore biome BGM after close in forest', { stage: 'c5-forest-bgm' });
    }
  }

  await sampleFps(page, telemetry);
  await runMandatoryDefeatAndResetVerify(page, spec, rng, telemetry, recordAnomaly, {
    targetOverride: WORLD_INDEX.rivals.find((r) => r.key === '45,14'),
    stage: 'c5-mandatory-defeat',
  });
}

async function runCohort6(page, baseUrl, spec, rng, telemetry, recordAnomaly) {
  // Legacy v1 Save & Profile Switcher: corrupt/legacy localStorage payloads, Violet<->Ozias switch, <3s abort vs 3s Parent Zone reset
  // Seed tricky legacy v1 save payload into localStorage and reload
  const scenarioIdx = (spec.seed - 51) % 5;
  await page.evaluate(({ trainerId, variant }) => {
    const baseRaw = localStorage.getItem('starlight_pokemon_save_v1');
    const data = baseRaw ? JSON.parse(baseRaw) : { version: 1, activeTrainerId: trainerId, profiles: {} };
    data.version = 1;
    data.activeTrainerId = trainerId;
    const p = data.profiles[trainerId];
    if (!p) return;

    if (variant === 0) {
      // Legacy array format caught + solid tile position (0,0)
      p.pokedex = { seen: [1, 4, 25], caught: [1, 25] };
      p.pos = { x: 0, y: 0, dir: 'down' };
    } else if (variant === 1) {
      // Duplicate UIDs in team + box
      const teamArr = p.team || p.party || [];
      if (teamArr[0]) {
        const clone = JSON.parse(JSON.stringify(teamArr[0]));
        p.team = [...teamArr, clone];
        p.box = [JSON.parse(JSON.stringify(clone))];
      }
    } else if (variant === 2) {
      // All-0-HP team parked directly on wild grass (9, 6)!
      p.pos = { x: 9, y: 6, dir: 'down' };
      for (const mon of (p.team || [])) mon.hp = 0;
    } else if (variant === 3) {
      // Corrupt NaN / Infinity / negative fields
      p.bag.starShards = -999;
      p.bag.potions = NaN;
      p.bag.cheerCharges = Infinity;
      if (p.team?.[0]) p.team[0].xp = -50;
    } else {
      // Partial legacy profile missing bag & stats
      delete p.bag;
      delete p.stats;
      p.pos = { x: 11, y: 12, dir: 'up' }; // solid arcade wall!
    }
    localStorage.setItem('starlight_pokemon_save_v1', JSON.stringify(data));
  }, { trainerId: spec.trainerId, variant: scenarioIdx });

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(350);

  // Resume profile from boot screen if shown
  if ((await getGameState(page)).bootVisible) {
    await page.click(`#trainer-card-${spec.trainerId}`);
    await page.waitForSelector('#game-shell', { state: 'visible', timeout: 12000 });
  }
  await dismissDialogue(page, telemetry, recordAnomaly, 'c6-post-reload');
  await installAppHooks(page);

  const stAfterRepair = await getGameState(page);
  if (stAfterRepair.pos && !isTileWalkableAt(stAfterRepair.pos.x, stAfterRepair.pos.y)) {
    recordAnomaly('P0', 'Code', 'SOLID_POS_NOT_REPAIRED', `Corrupt/solid pos (${stAfterRepair.pos.x},${stAfterRepair.pos.y}) was not repaired to walkable tile`, { stage: 'c6-repair' });
  }
  if (stAfterRepair.shards < 0 || !Number.isFinite(stAfterRepair.shards) || !Number.isFinite(stAfterRepair.potions)) {
    recordAnomaly('P0', 'Code', 'CORRUPT_BAG_NOT_SANITIZED', `Corrupt bag fields remained: shards=${stAfterRepair.shards}, potions=${stAfterRepair.potions}`, { stage: 'c6-repair' });
  }
  const uids = (stAfterRepair.party || []).map((m) => m.uid);
  if (new Set(uids).size !== uids.length) {
    recordAnomaly('P1', 'Code', 'DUPLICATE_UID_NOT_DEDUPED', `Duplicate UIDs remained in party after load: ${JSON.stringify(uids)}`, { stage: 'c6-repair' });
  }
  if (scenarioIdx === 2 && stAfterRepair.party.every((m) => m.hp <= 0)) {
    // Check if walking on grass starts battle with 0-HP Pokémon!
    await page.keyboard.press('ArrowRight').catch(() => {});
    await page.waitForTimeout(400);
    const grassSt = await getGameState(page);
    if (grassSt.battle.active && grassSt.battle.playerHp <= 0) {
      recordAnomaly('P0', 'Code', 'BATTLE_STARTED_WITH_0HP_PARTY', 'Hydrating all-0-HP party in wild grass allowed battle to start with 0 HP player mon', { stage: 'c6-all-fainted-load' });
    }
  }

  // Test Settings -> Switch Trainer Violet <-> Ozias + Parent Zone <3s abort vs 3s hold reset
  await page.click('#hud-btn-settings');
  await page.waitForSelector('#settings-modal', { state: 'visible', timeout: 6000 });
  const parentDetails = page.locator('#settings-modal details.parent-zone');
  if (await parentDetails.count()) {
    await parentDetails.evaluate((el) => { el.open = true; });
  }
  await auditLayout(page, telemetry, recordAnomaly, 'c6-settings-parent-open');

  // < 3s hold abort on #reset-trainer-btn (hold 800ms -> release -> verify NOT reset)
  const resetBtn = page.locator('#reset-trainer-btn');
  const box = await resetBtn.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(800);
    await page.mouse.up();
    await page.waitForTimeout(200);
    const midSt = await getGameState(page);
    if (midSt.bootVisible || midSt.starterVisible) {
      recordAnomaly('P1', 'Gameplay/Mechanic', 'RESET_TRIGGERED_EARLY_UNDER_3S', 'Hold reset fired after only 800ms (<3s)', { stage: 'c6-hold-abort' });
    }
  }

  // On seeds 56..60 (or 156..160 in Wave 2) test full 3s hold reset on #reset-trainer-btn
  if (spec.cohortOffset >= 5 && box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(3300);
    await page.mouse.up();
    await page.waitForTimeout(400);
    // Re-pick trainer & starter cleanly
    if ((await getGameState(page)).bootVisible) {
      await page.click(`#trainer-card-${spec.trainerId}`);
    }
    if (await page.locator('.starter-pick-btn').first().isVisible().catch(() => false)) {
      await page.locator('.starter-pick-btn').first().click();
      await page.waitForSelector('#game-shell', { state: 'visible', timeout: 12000 });
      await dismissDialogue(page, telemetry, recordAnomaly, 'c6-post-reset-starter');
    }
  } else {
    // Switch Trainer Violet <-> Ozias & come back
    const otherTrainer = spec.trainerId === 'violet' ? 'ozias' : 'violet';
    await page.click('#setting-switch-trainer-btn');
    await page.waitForSelector(`#trainer-card-${otherTrainer}`, { state: 'visible', timeout: 8000 });
    await page.click(`#trainer-card-${otherTrainer}`);
    if (await page.locator('.starter-pick-btn').first().isVisible().catch(() => false)) {
      await page.locator('.starter-pick-btn').first().click();
    }
    await page.waitForSelector('#game-shell', { state: 'visible', timeout: 10000 });
    await dismissDialogue(page, telemetry, recordAnomaly, 'c6-switched-trainer');
  }

  await sampleFps(page, telemetry);
  await runMandatoryDefeatAndResetVerify(page, spec, rng, telemetry, recordAnomaly, { stage: 'c6-mandatory-defeat' });
}

async function runCohort7(page, context, spec, rng, telemetry, recordAnomaly) {
  // Offline PWA & Fallback Stress Tester: SW active, block remote sprites / go offline, audit 4-tier/10-archetype fallbacks (0 broken images), visibilitychange audio lifecycle
  const swReady = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return { supported: false };
    try {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((res) => setTimeout(() => res(null), 5000)),
      ]);
      return { supported: true, active: Boolean(reg?.active), script: reg?.active?.scriptURL || null };
    } catch (e) {
      return { supported: true, active: false, err: String(e) };
    }
  });

  if (swReady.supported && !swReady.active) {
    recordAnomaly('P2', 'Audio/Assets', 'SW_NOT_READY_IN_5S', 'Service Worker was not active within 5s', { stage: 'c7-sw' });
  }

  // Block external sprite hosts and toggle offline
  telemetry.allowOfflineRemoteNoise = true;
  await context.route(EXTERNAL_SPRITE_HOST_RE, (route) => route.abort());
  if (swReady.active) {
    await context.setOffline(true);
  }

  // Open Pokédex across all 5 tabs & several gen filters while remote sprites are blocked/offline -> must have 0 broken images!
  await page.click('#hud-btn-dex');
  await page.waitForSelector('#pokedex-modal', { state: 'visible', timeout: 8000 });
  for (const gen of ['1', '3', '6', '9']) {
    await page.selectOption('#dex-gen-select', gen).catch(() => {});
    await page.waitForTimeout(180);
    await auditImages(page, telemetry, recordAnomaly, `c7-dex-offline-gen${gen}`);
  }
  await page.click('#pokedex-close-btn');

  // Test visibilitychange hidden -> visible audio lifecycle
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(150);
  const hiddenAudio = await getGameState(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(150);
  const resumedAudio = await getGameState(page);
  if (hiddenAudio.audio.unlocked && !hiddenAudio.audio.muted && !hiddenAudio.audio.pausedByVisibility) {
    recordAnomaly('P2', 'Audio/Assets', 'AUDIO_DID_NOT_PAUSE_ON_HIDDEN', 'Visibility hidden event did not set _pausedByVisibility', { stage: 'c7-visibility' });
  }
  if (resumedAudio.audio.pausedByVisibility) {
    recordAnomaly('P2', 'Audio/Assets', 'AUDIO_STUCK_PAUSED_AFTER_VISIBLE', '_pausedByVisibility remained true after visibility restored', { stage: 'c7-visibility' });
  }

  await sampleFps(page, telemetry);
  await runMandatoryDefeatAndResetVerify(page, spec, rng, telemetry, recordAnomaly, { stage: 'c7-mandatory-defeat' });
  await context.setOffline(false).catch(() => {});
}

async function runCohort8(page, spec, rng, telemetry, recordAnomaly) {
  // Tactical Strategist: type matchups, catches 2nd mon, Team switching, Potions, 0-PP Struggle/low-PP moves, Warp Zone (T) & Safe Zone (H), Briefing Pivot, high-tier wipe
  await navigateToCoord(page, 9, 6, { telemetry, recordAnomaly, rng, maxDistance: 0, maxMs: 20000, fightWilds: 'run', stage: 'c8-catch' });
  for (let i = 0; i < 6 && (await getGameState(page)).party.length < 2; i++) {
    if (!(await triggerWildEncounterAtGrass(page, 9, 6, { maxSteps: 22 }))) break;
    await playActiveBattleToEnd(page, { strategy: 'catch_new', telemetry, recordAnomaly, rng, stage: 'c8-catch-wild' });
    await dismissDialogue(page, telemetry, recordAnomaly, 'c8-after-catch');
  }

  // Test Tactical battle (Potion + Switch + SE moves)
  if (await triggerWildEncounterAtGrass(page, 9, 6, { maxSteps: 22 })) {
    await playActiveBattleToEnd(page, { strategy: 'tactical', telemetry, recordAnomaly, rng, stage: 'c8-tactical-battle' });
    await dismissDialogue(page, telemetry, recordAnomaly, 'c8-post-tactical');
  }

  if (spec.isWave2) {
    // Heal up cleanly before challenging Forest Ranger Leo (11,5) so Rival Rematch is tested reliably
    const preLeo = await getGameState(page);
    if (preLeo.party.some((p) => p.hp < p.maxHp * 0.85)) {
      await page.keyboard.press('h').catch(() => {});
      await page.waitForTimeout(450);
      await navigateToCoord(page, 7, 13, { telemetry, recordAnomaly, rng, maxDistance: 1, maxMs: 12000, fightWilds: 'run', stage: 'c8-r2-leo-heal' });
      await triggerInteractAtTarget(page, 7, 13, telemetry, recordAnomaly, 'c8-r2-leo-fountain');
    }
    const leo = WORLD_INDEX.rivals.find((r) => r.key === '11,5');
    if (leo) {
      await navigateToCoord(page, leo.x, leo.y, { telemetry, recordAnomaly, rng, maxDistance: 1, maxMs: 18000, fightWilds: 'run', stage: 'c8-r2-leo-walk' });
      await triggerInteractAtTarget(page, leo.x, leo.y, telemetry, recordAnomaly, 'c8-r2-leo-brief');
      if ((await getGameState(page)).modals.briefing) {
        await page.click('#briefing-battle-btn').catch(() => {});
        if (await waitForBriefingBattleStart(page, telemetry, recordAnomaly, 'c8-r2-leo-start')) {
          const postLeo = await playActiveBattleToEnd(page, { strategy: 'potion_win', telemetry, recordAnomaly, rng, stage: 'c8-r2-leo-fight' });
          await dismissDialogue(page, telemetry, recordAnomaly, 'c8-r2-leo-win');
          if (postLeo.battle?.lastResult?.outcome === 'won') {
            await tryInspectRivalRematchBriefing(page, leo, telemetry, recordAnomaly, 'c8-r2-leo-rematch');
          }
        }
      }
    }
  }

  // Test Briefing Pivot button (`#briefing-pivot-btn`) on Twilight Eclipse Shrine (23, 13)
  await navigateToCoord(page, 23, 13, { telemetry, recordAnomaly, rng, maxDistance: 1, maxMs: 28000, fightWilds: 'run', stage: 'c8-pivot-approach' });
  await triggerInteractAtTarget(page, 23, 13, telemetry, recordAnomaly, 'c8-pivot-briefing');
  if ((await getGameState(page)).modals.briefing) {
    await auditLayout(page, telemetry, recordAnomaly, 'c8-briefing-pivot');
    await page.click('#briefing-pivot-btn').catch(() => {});
    await page.waitForTimeout(450);
  }

  // Test HUD Warp buttons / hotkeys T & H
  await page.click('#warp-zone-btn').catch(() => {});
  await page.waitForTimeout(450);
  await page.keyboard.press('h').catch(() => {});
  await page.waitForTimeout(450);

  await sampleFps(page, telemetry);
  await runMandatoryDefeatAndResetVerify(page, spec, rng, telemetry, recordAnomaly, { stage: 'c8-mandatory-defeat' });
}

async function runCohort9(page, spec, rng, telemetry, recordAnomaly) {
  // Viewport & Orientation Flipper: flip dynamically across all 6 viewports mid-Overworld, mid-Briefing, mid-Battle + Team Drawer, mid-Settings(Parent open), mid-Pokedex(5 tabs)
  const flipOrder = [
    VIEWPORTS[2], // 667x375 landscape first!
    VIEWPORTS[0], // 390x844
    VIEWPORTS[1], // 412x915
    VIEWPORTS[3], // 768x1024
    VIEWPORTS[4], // 1024x768
    VIEWPORTS[5], // 1280x720
  ];

  // 1. Overworld across all 6 viewports (checking #warp-dock vs #interact-pill vs #compass-hud)
  await navigateToCoord(page, 9, 13, { telemetry, recordAnomaly, rng, maxDistance: 1, maxMs: 10000, fightWilds: 'run', stage: 'c9-willow-adjacent' });
  await page.evaluate(() => {
    const app = window.__starlightApp;
    const p = app?.overworld?.getProfile?.();
    if (p?.pos) { p.pos.dir = 'up'; app.overworld?.refreshInteractHint?.(); }
  });
  for (const vp of flipOrder) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(120);
    await auditLayout(page, telemetry, recordAnomaly, `c9-overworld-${vp.name}`, vp.name);
  }
  if (spec.isWave2) {
    // Also flip #world-dialogue (un-attuned wall progress / Willow greeting) across landscape & portrait
    await page.click('#interact-pill', { force: true }).catch(() => page.keyboard.press('Space'));
    await page.waitForTimeout(180);
    for (const vp of [VIEWPORTS[2], VIEWPORTS[0], VIEWPORTS[5]]) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(90);
      await auditLayout(page, telemetry, recordAnomaly, `c9-r2-dialogue-${vp.name}`, vp.name);
    }
    await dismissDialogue(page, telemetry, recordAnomaly, 'c9-r2-dialogue-close');
  }
  // Test HUD Install App group visible at 390x844 & 667x375
  await page.evaluate(() => {
    const g = document.getElementById('hud-install-group');
    if (g) g.hidden = false;
  });
  for (const vp of [VIEWPORTS[0], VIEWPORTS[2]]) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(90);
    await auditLayout(page, telemetry, recordAnomaly, `c9-overworld-install-${vp.name}`, vp.name);
  }
  await page.evaluate(() => {
    const g = document.getElementById('hud-install-group');
    if (g) g.hidden = true;
  });

  // 2. Settings (with Parent Zone expanded!) across all 6 viewports
  await page.click('#hud-btn-settings');
  await page.waitForSelector('#settings-modal', { state: 'visible', timeout: 6000 });
  await page.locator('#settings-modal details.parent-zone').evaluate((el) => { el.open = true; }).catch(() => {});
  for (const vp of flipOrder) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(100);
    await auditLayout(page, telemetry, recordAnomaly, `c9-settings-expanded-${vp.name}`, vp.name);
  }
  await page.click('#settings-close-btn');

  // 3. Pokédex all 5 tabs at 667x375 & 390x844 & 1280x720
  await page.click('#hud-btn-dex');
  await page.waitForSelector('#pokedex-modal', { state: 'visible', timeout: 6000 });
  for (const vp of [VIEWPORTS[2], VIEWPORTS[0], VIEWPORTS[5]]) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const tab of ['#pokedex-tab-dex', '#pokedex-tab-team', '#pokedex-tab-badges', '#pokedex-tab-guide', '#pokedex-tab-trainer']) {
      await page.click(tab);
      await page.waitForTimeout(90);
      await auditLayout(page, telemetry, recordAnomaly, `c9-${tab}-${vp.name}`, vp.name);
    }
  }
  await page.click('#pokedex-close-btn');

  // 4. Multi-mon Rival Briefing Modal (#encounter-briefing-modal) across viewports (45, 14 Caldera Blaze 3-mon Rival!)
  // Trigger with damaged lead if possible so heal-alert & roster line both render during orientation flip
  await navigateToCoord(page, 45, 14, { telemetry, recordAnomaly, rng, maxDistance: 1, maxMs: 38000, fightWilds: 'run', stage: 'c9-rival-approach' });
  await page.evaluate(() => {
    const prof = window.__starlightApp?.overworld?.getProfile?.();
    if (prof?.team?.[0] && prof.team[0].hp > 4) {
      prof.team[0].hp = Math.max(1, Math.floor(prof.team[0].maxHp * 0.4));
    }
  });
  await triggerInteractAtTarget(page, 45, 14, telemetry, recordAnomaly, 'c9-rival-briefing');
  if ((await getGameState(page)).modals.briefing) {
    for (const vp of flipOrder) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(110);
      await auditLayout(page, telemetry, recordAnomaly, `c9-briefing-${vp.name}`, vp.name);
    }
    await page.click('#briefing-battle-btn');
    await page.waitForTimeout(400);
  }

  // 5. Mid-battle + Team Drawer flip across viewports during real lethal fight
  if ((await getGameState(page)).battle.active) {
    await playActiveBattleToEnd(page, {
      strategy: 'lose',
      telemetry,
      recordAnomaly,
      rng,
      stage: 'c9-battle-flip',
      chaosMidBattle: async () => {
        for (const vp of [VIEWPORTS[2], VIEWPORTS[0], VIEWPORTS[3], VIEWPORTS[5]]) {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.waitForTimeout(90);
          await auditLayout(page, telemetry, recordAnomaly, `c9-battle-${vp.name}`, vp.name);
        }
        await page.click('#battle-btn-team').catch(() => {});
        await page.waitForTimeout(120);
        for (const vp of [VIEWPORTS[2], VIEWPORTS[0]]) {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.waitForTimeout(90);
          await auditLayout(page, telemetry, recordAnomaly, `c9-battle-drawer-${vp.name}`, vp.name);
        }
        await page.click('#battle-team-close').catch(() => {});
        await page.setViewportSize({ width: spec.viewport.width, height: spec.viewport.height });
      },
    });
    // Finish verifying rescue reset after Rival wipe!
    await page.waitForTimeout(350);
    await dismissDialogue(page, telemetry, recordAnomaly, 'c9-post-rival-rescue', 15);
    const post = await getGameState(page);
    if (
      post.battle.lastResult?.faintedAll &&
      post.pos?.x === GAME_META.spawn.x &&
      post.pos?.y === GAME_META.spawn.y &&
      post.party.every((p) => p.hp === p.maxHp)
    ) {
      await page.keyboard.down('ArrowRight').catch(() => {});
      await page.waitForTimeout(300);
      await page.keyboard.up('ArrowRight').catch(() => {});
      const moved = await getGameState(page);
      if (moved.pos && (moved.pos.x !== GAME_META.spawn.x || moved.pos.y !== GAME_META.spawn.y)) {
        telemetry.metrics.resetsVerified++;
        await sampleFps(page, telemetry);
        return;
      }
    }
  }

  // Fallback if Blaze wasn't active/reached
  await sampleFps(page, telemetry);
  await runMandatoryDefeatAndResetVerify(page, spec, rng, telemetry, recordAnomaly, { stage: 'c9-mandatory-defeat' });
}

async function runCohort10(page, spec, rng, telemetry, recordAnomaly) {
  // Repeat Defeat-Reset Loop Tester: 3 consecutive real wipes across Wild, Shrine, and Rival!
  // Wipe 1: Shrine (23, 13) Twilight Eclipse Shrine Lv.16
  const shrine = WORLD_INDEX.shrines.find((s) => s.key === '23,13') || WORLD_INDEX.shrines[3];
  await runMandatoryDefeatAndResetVerify(page, spec, rng, telemetry, recordAnomaly, {
    targetOverride: shrine,
    stage: 'c10-wipe1-shrine',
  });

  // Wipe 2: Multi-mon Rival (45, 14) Caldera Blaze
  const rival = WORLD_INDEX.rivals.find((r) => r.key === '45,14') || WORLD_INDEX.rivals[1];
  await runMandatoryDefeatAndResetVerify(page, spec, rng, telemetry, recordAnomaly, {
    targetOverride: rival,
    stage: 'c10-wipe2-rival',
  });

  // Wipe 3: High-level Wild Grass in Volcano/Cave (walk along road to (44, 15) volcano floor & fight wild to faint!)
  await navigateToCoord(page, 44, 15, { telemetry, recordAnomaly, rng, maxDistance: 0, maxMs: 30000, fightWilds: 'run', stage: 'c10-wipe3-wild-march' });
  if ((await getGameState(page)).pos?.x > 20) {
    const encountered = await triggerWildEncounterAtGrass(page, 43, 15, { maxSteps: 36 });
    if (encountered) {
      await playActiveBattleToEnd(page, { strategy: 'lose', telemetry, recordAnomaly, rng, stage: 'c10-wipe3-wild-combat' });
      await page.waitForTimeout(350);
      await dismissDialogue(page, telemetry, recordAnomaly, 'c10-wipe3-rescue');
      const postW3 = await getGameState(page);
      if (
        postW3.battle.lastResult?.faintedAll &&
        postW3.pos?.x === GAME_META.spawn.x &&
        postW3.pos?.y === GAME_META.spawn.y &&
        postW3.party.every((p) => p.hp === p.maxHp)
      ) {
        await page.keyboard.down('ArrowRight').catch(() => {});
        await page.waitForTimeout(300);
        await page.keyboard.up('ArrowRight').catch(() => {});
        const movedW3 = await getGameState(page);
        if (movedW3.pos && (movedW3.pos.x !== GAME_META.spawn.x || movedW3.pos.y !== GAME_META.spawn.y)) {
          telemetry.metrics.resetsVerified++;
        }
      }
    }
  }

  // If wipe 3 wasn't triggered on grass yet, guarantee a 3rd defeat-reset verify cleanly
  if (telemetry.metrics.resetsVerified < 3) {
    await runMandatoryDefeatAndResetVerify(page, spec, rng, telemetry, recordAnomaly, {
      targetOverride: WORLD_INDEX.shrines.find((s) => s.key === '38,20') || shrine,
      stage: 'c10-wipe3-verify',
    });
  } else {
    // Still verify final spawn & movement
    const finalSt = await getGameState(page);
    if (finalSt.pos?.x !== GAME_META.spawn.x || finalSt.pos?.y !== GAME_META.spawn.y) {
      recordAnomaly('P0', 'Gameplay/Mechanic', 'C10_FINAL_POS_INVALID', `Expected (8,15) after 3rd wipe, got ${JSON.stringify(finalSt.pos)}`, { stage: 'c10-final' });
    }
  }
  await sampleFps(page, telemetry);
}

async function runSinglePlaytester(browser, baseUrl, seed, timeoutMs) {
  const spec = getAgentSpec(seed);
  const rng = createSeedRng(seed);
  const startedAt = Date.now();

  const context = await browser.newContext({
    viewport: { width: spec.viewport.width, height: spec.viewport.height },
    hasTouch: spec.viewport.hasTouch,
    isMobile: spec.viewport.isMobile,
  });
  const page = await context.newPage();
  const { telemetry, recordAnomaly } = attachRunTelemetry(page, baseUrl, spec);

  const runPromise = (async () => {
    await bootAndStartGame(page, baseUrl, spec, rng, telemetry, recordAnomaly);

    switch (spec.cohort) {
      case 1: await runCohort1(page, spec, rng, telemetry, recordAnomaly); break;
      case 2: await runCohort2(page, spec, rng, telemetry, recordAnomaly); break;
      case 3: await runCohort3(page, spec, rng, telemetry, recordAnomaly); break;
      case 4: await runCohort4(page, spec, rng, telemetry, recordAnomaly); break;
      case 5: await runCohort5(page, spec, rng, telemetry, recordAnomaly); break;
      case 6: await runCohort6(page, baseUrl, spec, rng, telemetry, recordAnomaly); break;
      case 7: await runCohort7(page, context, spec, rng, telemetry, recordAnomaly); break;
      case 8: await runCohort8(page, spec, rng, telemetry, recordAnomaly); break;
      case 9: await runCohort9(page, spec, rng, telemetry, recordAnomaly); break;
      case 10: await runCohort10(page, spec, rng, telemetry, recordAnomaly); break;
      default:
        await runMandatoryDefeatAndResetVerify(page, spec, rng, telemetry, recordAnomaly);
        break;
    }

    if (telemetry.metrics.resetsVerified < 1) {
      recordAnomaly('P0', 'Gameplay/Mechanic', 'MANDATORY_DEFEAT_RESET_MISSING', 'Agent did not complete verified defeat-to-(8,15)-walk check', { stage: 'final' });
    }
  })();

  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Playtester seed=${seed} exceeded ${timeoutMs}ms budget`));
    }, timeoutMs);
  });

  try {
    await Promise.race([runPromise, timeoutPromise]);
  } catch (err) {
    recordAnomaly('P0', 'Code', 'AGENT_RUN_ABORTED', err?.message || String(err), { stage: 'watchdog' });
  } finally {
    clearTimeout(timer);
    await context.close().catch(() => {});
  }

  telemetry.durationMs = Date.now() - startedAt;
  return telemetry;
}

function summarizeSwarmResults(runs) {
  const byCode = new Map();
  const byCohort = {};
  let totalPageErrors = 0;
  let totalConsoleErrors = 0;
  let totalLocalHttpErrors = 0;
  let totalBrokenImages = 0;
  let totalResetsVerified = 0;

  for (const r of runs) {
    totalPageErrors += r.pageErrors.length;
    totalConsoleErrors += r.consoleErrors.length;
    totalLocalHttpErrors += r.localHttpErrors.length;
    totalBrokenImages += r.brokenImages.length;
    totalResetsVerified += r.metrics.resetsVerified;

    if (!byCohort[r.cohort]) {
      byCohort[r.cohort] = {
        cohort: r.cohort,
        name: r.cohortName,
        agents: 0,
        resetsVerified: 0,
        faintedAllTotal: 0,
        p0: 0,
        p1: 0,
        p2: 0,
        p3: 0,
      };
    }
    const c = byCohort[r.cohort];
    c.agents++;
    c.resetsVerified += r.metrics.resetsVerified;
    c.faintedAllTotal += r.metrics.battlesFaintedAll;

    for (const a of r.anomalies) {
      if (a.severity === 'P0') c.p0++;
      else if (a.severity === 'P1') c.p1++;
      else if (a.severity === 'P2') c.p2++;
      else c.p3++;

      const key = `${a.severity}|${a.code}|${a.message.slice(0, 120)}`;
      if (!byCode.has(key)) {
        byCode.set(key, {
          severity: a.severity,
          category: a.category,
          code: a.code,
          sampleMessage: a.message,
          count: 0,
          seeds: [],
          viewports: [],
          stages: [],
        });
      }
      const agg = byCode.get(key);
      agg.count++;
      if (!agg.seeds.includes(r.seed)) agg.seeds.push(r.seed);
      if (a.viewport && !agg.viewports.includes(a.viewport)) agg.viewports.push(a.viewport);
      if (a.stage && !agg.stages.includes(a.stage)) agg.stages.push(a.stage);
    }
  }

  const sevRank = { P0: 0, P1: 1, P2: 2, P3: 3 };
  const groupedFindings = [...byCode.values()].sort(
    (a, b) => (sevRank[a.severity] - sevRank[b.severity]) || (b.count - a.count),
  );

  const wave2Runs = runs.filter((r) => r.round2?.isWave2);
  let round2Summary = null;
  if (wave2Runs.length > 0) {
    const delightsByCode = new Map();
    const frictionsByCode = new Map();
    const fpsAll = [];
    const outerBiomesSet = new Set();

    let totalEncounters = 0;
    let totalBruisers = 0;
    let totalRarePatches = 0;
    let totalRareElites = 0;
    let totalNidF = 0;
    let totalNincada = 0;
    let totalCatchAtt = 0;
    let totalCatchSuc = 0;

    let depthChecked = 0;
    let depthOk = 0;
    let shrineChecked = 0;
    let shrineLv6Ok = 0;
    let squirtleTotal = 0;
    let squirtleToughPivot = 0;
    let farmPivotLanded = 0;
    let bulbaTotal = 0;
    let bulbaBalanced = 0;
    let charTotal = 0;
    let charBalanced = 0;
    let compassChecked = 0;
    let compassOk = 0;

    let skyHopUnattunedChecked = 0;
    let skyHopUnattunedOk = 0;
    let skyHopAttunedChecked = 0;
    let skyHopAttunedOk = 0;

    let evoToastsCount = 0;
    let badgeToastsCount = 0;
    let shrineTrialsTested = 0;
    let rivalRematchesTested = 0;

    for (const r of wave2Runs) {
      const r2 = r.round2;
      for (const e of r2.forestOutskirtsEncounters || []) {
        totalEncounters++;
        if (e.isBruiser) totalBruisers++;
        if (e.isRarePatch) totalRarePatches++;
        if (e.isRarePatch && e.isElite) totalRareElites++;
        if (e.speciesId === 29) totalNidF++;
        if (e.speciesId === 290) totalNincada++;
      }
      totalCatchAtt += r2.forestOutskirtsCatchesAttempted || 0;
      totalCatchSuc += r2.forestOutskirtsCatchesSucceeded || 0;

      if (r2.forestOutskirtsDepthOk !== null) {
        depthChecked++;
        if (r2.forestOutskirtsDepthOk) depthOk++;
      }
      if (r2.forestShrineLevelObserved !== null) {
        shrineChecked++;
        if (r2.forestShrineLevelObserved === 'Lv.6') shrineLv6Ok++;
        if (r2.starterName === 'Squirtle') {
          squirtleTotal++;
          if (r2.forestShrineReadinessTier === 'challenging' && /Farm Zone/i.test(r2.forestShrinePivotLabel || '')) {
            squirtleToughPivot++;
          }
          if (r2.farmPivotLandedOk) farmPivotLanded++;
        } else if (r2.starterName === 'Bulbasaur') {
          bulbaTotal++;
          if (r2.forestShrineReadinessTier === 'balanced' || r2.forestShrineReadinessTier === 'favored') bulbaBalanced++;
        } else if (r2.starterName === 'Charmander') {
          charTotal++;
          if (r2.forestShrineReadinessTier === 'balanced' || r2.forestShrineReadinessTier === 'favored') charBalanced++;
        }
      }
      if (r2.compassProgressionOk !== null) {
        compassChecked++;
        if (r2.compassProgressionOk) compassOk++;
      }
      if (r2.skyHopUnattunedCountersOk !== null) {
        skyHopUnattunedChecked++;
        if (r2.skyHopUnattunedCountersOk) skyHopUnattunedOk++;
      }
      if (r2.skyHopAttunedUnlocked !== null) {
        skyHopAttunedChecked++;
        if (r2.skyHopAttunedUnlocked) skyHopAttunedOk++;
      }
      if (r2.evoToastObserved) evoToastsCount++;
      if (r2.badgeToastObserved) badgeToastsCount++;
      if (r2.shrineTrialTested) shrineTrialsTested++;
      if (r2.rivalRematchTested) rivalRematchesTested++;
      for (const b of r2.outerBiomesVisited || []) outerBiomesSet.add(b);
      for (const fps of r2.measuredFpsSamples || []) fpsAll.push(fps);

      for (const d of r.experience?.delights || []) {
        if (!delightsByCode.has(d.code)) {
          delightsByCode.set(d.code, { code: d.code, category: d.category, sampleMessage: d.message, count: 0, seeds: [] });
        }
        const agg = delightsByCode.get(d.code);
        agg.count++;
        if (!agg.seeds.includes(r.seed)) agg.seeds.push(r.seed);
      }
      for (const f of r.experience?.frictions || []) {
        if (!frictionsByCode.has(f.code)) {
          frictionsByCode.set(f.code, { code: f.code, severity: f.severity, sampleMessage: f.message, count: 0, seeds: [] });
        }
        const agg = frictionsByCode.get(f.code);
        agg.count++;
        if (!agg.seeds.includes(r.seed)) agg.seeds.push(r.seed);
      }
    }

    round2Summary = {
      wave2RunsCount: wave2Runs.length,
      forestOutskirts: {
        totalEncounters,
        bruisers: totalBruisers,
        bruiserPct: totalEncounters > 0 ? Number(((totalBruisers / totalEncounters) * 100).toFixed(1)) : 0,
        rarePatches: totalRarePatches,
        rareElites: totalRareElites,
        nidoranF: totalNidF,
        nincada: totalNincada,
        catchesAttempted: totalCatchAtt,
        catchesSucceeded: totalCatchSuc,
        catchRatePct: totalCatchAtt > 0 ? Number(((totalCatchSuc / totalCatchAtt) * 100).toFixed(1)) : 0,
      },
      onboarding: {
        depthChecked,
        depthOk,
        shrineChecked,
        shrineLv6Ok,
        squirtleTotal,
        squirtleToughPivot,
        farmPivotLanded,
        bulbaTotal,
        bulbaBalanced,
        charTotal,
        charBalanced,
        compassChecked,
        compassOk,
      },
      skyHop: {
        unattunedChecked: skyHopUnattunedChecked,
        unattunedOk: skyHopUnattunedOk,
        attunedChecked: skyHopAttunedChecked,
        attunedOk: skyHopAttunedOk,
      },
      midLate: {
        evoToastsCount,
        badgeToastsCount,
        outerBiomesVisited: [...outerBiomesSet],
        shrineTrialsTested,
        rivalRematchesTested,
      },
      fps: {
        samplesCount: fpsAll.length,
        avg: fpsAll.length ? Number((fpsAll.reduce((a, b) => a + b, 0) / fpsAll.length).toFixed(1)) : null,
        min: fpsAll.length ? Number(Math.min(...fpsAll).toFixed(1)) : null,
      },
      delights: [...delightsByCode.values()].sort((a, b) => b.count - a.count),
      frictions: [...frictionsByCode.values()].sort((a, b) => b.count - a.count),
    };
  }

  return {
    totalRuns: runs.length,
    totalResetsVerified,
    totalPageErrors,
    totalConsoleErrors,
    totalLocalHttpErrors,
    totalBrokenImages,
    cohorts: Object.values(byCohort).sort((a, b) => a.cohort - b.cohort),
    groupedFindings,
    round2Summary,
  };
}

async function main() {
  const opts = parseCliArgs(process.argv.slice(2));
  if (!opts.seeds.length) {
    console.error('No seeds matched --seeds / --cohort arguments.');
    process.exit(1);
  }

  console.log(`=== Pokémon: Starlight Island — ${opts.seeds.length}-Playtester Swarm ===`);
  console.log(`Seeds: ${opts.seeds[0]}..${opts.seeds[opts.seeds.length - 1]} (${opts.seeds.length} agents), concurrency=${opts.concurrency}`);

  const pw = await resolvePlaywright();
  const { server, baseUrl } = await startStaticServer(ROOT_DIR);
  const browser = await launchChromium(pw, { headless: !opts.headful });

  const results = new Array(opts.seeds.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= opts.seeds.length) return;
      const seed = opts.seeds[idx];
      const res = await runSinglePlaytester(browser, baseUrl, seed, opts.timeoutMs);
      results[idx] = res;
      const p0Count = res.anomalies.filter((a) => a.severity === 'P0').length;
      const p1Count = res.anomalies.filter((a) => a.severity === 'P1').length;
      console.log(
        `[seed ${String(seed).padStart(3, ' ')} | C${String(res.cohort).padStart(2, ' ')} | ${res.trainerId.padEnd(6)} | ${res.viewport.padEnd(19)}] `
        + `resets=${res.metrics.resetsVerified} battles=${res.metrics.battlesStarted} faintAll=${res.metrics.battlesFaintedAll} `
        + `anomalies=${res.anomalies.length} (P0=${p0Count},P1=${p1Count}) ${(res.durationMs / 1000).toFixed(1)}s`,
      );
    }
  }

  try {
    const workerCount = Math.min(opts.concurrency, opts.seeds.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
  } finally {
    await browser.close().catch(() => {});
    await new Promise((res) => server.close(res));
  }

  const summary = summarizeSwarmResults(results);
  console.log('\n=== Swarm Telemetry Summary ===');
  console.log(`Total agents: ${summary.totalRuns}, verified resets: ${summary.totalResetsVerified}, pageErrors: ${summary.totalPageErrors}, consoleErrors: ${summary.totalConsoleErrors}, localHttpErrors: ${summary.totalLocalHttpErrors}, brokenImages: ${summary.totalBrokenImages}`);
  for (const f of summary.groupedFindings) {
    console.log(`[${f.severity}] ${f.code} (x${f.count}, seeds=${f.seeds.slice(0, 8).join(',')}${f.seeds.length > 8 ? '...' : ''}, viewports=${f.viewports.join(',')}): ${f.sampleMessage}`);
  }
  if (summary.round2Summary) {
    const r2 = summary.round2Summary;
    console.log('\n=== Round 2 Experience & Telemetry ===');
    console.log(`Forest Outskirts (0-badge): encounters=${r2.forestOutskirts.totalEncounters}, bruisers=${r2.forestOutskirts.bruisers} (${r2.forestOutskirts.bruiserPct}%), rarePatches=${r2.forestOutskirts.rarePatches}, 0-badgeRareElites=${r2.forestOutskirts.rareElites}, NidoranF=${r2.forestOutskirts.nidoranF}, Nincada=${r2.forestOutskirts.nincada}, catches=${r2.forestOutskirts.catchesSucceeded}/${r2.forestOutskirts.catchesAttempted} (${r2.forestOutskirts.catchRatePct}%)`);
    console.log(`Onboarding: depth0=${r2.onboarding.depthOk}/${r2.onboarding.depthChecked}, shrineLv6=${r2.onboarding.shrineLv6Ok}/${r2.onboarding.shrineChecked}, squirtleToughPivot=${r2.onboarding.squirtleToughPivot}/${r2.onboarding.squirtleTotal} (landed=${r2.onboarding.farmPivotLanded}), bulbaFair=${r2.onboarding.bulbaBalanced}/${r2.onboarding.bulbaTotal}, charmanderFair=${r2.onboarding.charBalanced}/${r2.onboarding.charTotal}, compassOk=${r2.onboarding.compassOk}/${r2.onboarding.compassChecked}`);
    console.log(`Sky-Hop Counters: unattunedOk=${r2.skyHop.unattunedOk}/${r2.skyHop.unattunedChecked}, attunedUnlock=${r2.skyHop.attunedOk}/${r2.skyHop.attunedChecked}`);
    console.log(`Mid/Late: evoToasts=${r2.midLate.evoToastsCount}, badgeToasts=${r2.midLate.badgeToastsCount}, shrineTrials=${r2.midLate.shrineTrialsTested}, rivalRematches=${r2.midLate.rivalRematchesTested}, outerBiomes=${r2.midLate.outerBiomesVisited.join(',') || 'none'}`);
    console.log(`FPS: avg=${r2.fps.avg}, min=${r2.fps.min} (samples=${r2.fps.samplesCount})`);
    for (const d of r2.delights) {
      console.log(`[DELIGHT] ${d.code} (x${d.count}): ${d.sampleMessage}`);
    }
    for (const fr of r2.frictions) {
      console.log(`[FRICTION ${fr.severity}] ${fr.code} (x${fr.count}): ${fr.sampleMessage}`);
    }
  }

  if (opts.outFile) {
    const outPath = path.resolve(opts.outFile);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), summary, runs: results }, null, 2));
    console.log(`Report written to: ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
