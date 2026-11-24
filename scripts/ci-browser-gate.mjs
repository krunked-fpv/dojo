#!/usr/bin/env node
/**
 * Automated Chromium CI gate for Pokémon: Starlight Island.
 *
 * - Pure Node ESM `node:http` static server bound to `127.0.0.1:0`
 * - Graceful Playwright discovery (`import('playwright')`, `NODE_PATH`, global npm, `_npx` cache)
 * - Stage A: `?test=true` full automated test suite at 1280x720
 * - Stage B: 6-viewport layout & touch matrix (390x844, 412x915, 667x375, 768x1024, 1024x768, 1280x720)
 * - Stage C: Offline PWA Service Worker boot -> starter -> `#game-shell` gate
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

const EXTERNAL_SPRITE_HOST_RE = /(?:^|\.)(?:pokeapi\.co|raw\.githubusercontent\.com)$/i;

const VIEWPORT_MATRIX = [
  { name: 'android-390x844', width: 390, height: 844, hasTouch: true },
  { name: 'android-412x915', width: 412, height: 915, hasTouch: true },
  { name: 'landscape-667x375', width: 667, height: 375, hasTouch: true },
  { name: 'tablet-768x1024', width: 768, height: 1024, hasTouch: true },
  { name: 'tablet-1024x768', width: 1024, height: 768, hasTouch: true },
  { name: 'chromebook-1280x720', width: 1280, height: 720, hasTouch: false },
];

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
    // Ignore npm lookup failures in restricted shells
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
          const full = path.join(base, d.name);
          let mtimeMs = 0;
          try {
            mtimeMs = fs.statSync(full).mtimeMs;
          } catch {
            mtimeMs = 0;
          }
          return { full, mtimeMs };
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
    // Fall through to CJS / NODE_PATH / global / _npx discovery
  }

  try {
    const req = createRequire(import.meta.url);
    const resolved = req.resolve('playwright');
    const esmSibling = path.join(path.dirname(resolved), 'index.mjs');
    const targets = fs.existsSync(esmSibling) && esmSibling !== resolved
      ? [esmSibling, resolved]
      : [resolved];
    for (const target of targets) {
      try {
        const mod = unwrapPlaywright(await import(pathToFileURL(target).href));
        if (mod) return mod;
      } catch {
        // Try next resolution target
      }
    }
  } catch {
    // Fall through to candidate directories
  }

  const importedModules = [];
  for (const pkgDir of collectPlaywrightCandidates()) {
    const entry = getPlaywrightEntrypoint(pkgDir);
    if (!entry) continue;
    try {
      const mod = unwrapPlaywright(await import(pathToFileURL(entry).href));
      if (mod?.chromium) {
        try {
          const defaultExec = mod.chromium.executablePath?.();
          if (defaultExec && fs.existsSync(defaultExec)) {
            return mod;
          }
        } catch {
          // Keep looking for an exact browser match, else keep fallback
        }
        importedModules.push(mod);
      }
    } catch {
      // Try next candidate
    }
  }

  if (importedModules.length > 0) {
    return importedModules[0];
  }

  throw new Error(
    'Unable to resolve `playwright`. Install via `npx --yes playwright install --with-deps chromium` or set NODE_PATH / PLAYWRIGHT_PATH.',
  );
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
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }
  }

  return null;
}

async function launchChromium(pw) {
  const args = process.platform === 'linux'
    ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    : [];

  const explicit = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (explicit && fs.existsSync(explicit)) {
    return pw.chromium.launch({ headless: true, executablePath: explicit, args });
  }

  let defaultExec = null;
  try {
    defaultExec = pw.chromium.executablePath?.();
  } catch {
    defaultExec = null;
  }

  if (defaultExec && fs.existsSync(defaultExec)) {
    return pw.chromium.launch({ headless: true, args });
  }

  const cachedExec = findCachedChromiumExecutable();
  if (cachedExec) {
    return pw.chromium.launch({ headless: true, executablePath: cachedExec, args });
  }

  for (const channel of ['chrome', 'msedge']) {
    try {
      return await pw.chromium.launch({ headless: true, channel, args });
    } catch {
      // Try next system channel
    }
  }

  return pw.chromium.launch({ headless: true, args });
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

function attachPageTelemetry(page, baseUrl, { allowOfflineTestRunner = false } = {}) {
  const pageErrors = [];
  const consoleErrors = [];
  const localHttpErrors = [];

  page.on('pageerror', (err) => {
    pageErrors.push(err?.stack || err?.message || String(err));
  });

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const locUrl = msg.location()?.url || '';
    if (isExternalProbeUrl(locUrl)) return;
    if (allowOfflineTestRunner && locUrl.startsWith(baseUrl) && locUrl.endsWith('/tests/test-runner.js')) {
      return;
    }
    consoleErrors.push(`${msg.text()}${locUrl ? ` (${locUrl})` : ''}`);
  });

  page.on('response', (res) => {
    const status = res.status();
    if (status < 400) return;
    const resUrl = res.url();
    if (isExternalProbeUrl(resUrl)) return;
    if (allowOfflineTestRunner && resUrl.startsWith(baseUrl) && resUrl.endsWith('/tests/test-runner.js')) {
      return;
    }
    if (resUrl.startsWith(baseUrl)) {
      localHttpErrors.push(`${status} ${resUrl}`);
    }
  });

  return { pageErrors, consoleErrors, localHttpErrors };
}

function assertCleanTelemetry(label, telemetry) {
  const problems = [];
  if (telemetry.pageErrors.length > 0) {
    problems.push(`pageerror(${telemetry.pageErrors.length}): ${telemetry.pageErrors.slice(0, 3).join(' | ')}`);
  }
  if (telemetry.consoleErrors.length > 0) {
    problems.push(`console.error(${telemetry.consoleErrors.length}): ${telemetry.consoleErrors.slice(0, 3).join(' | ')}`);
  }
  if (telemetry.localHttpErrors.length > 0) {
    problems.push(`local HTTP >= 400(${telemetry.localHttpErrors.length}): ${telemetry.localHttpErrors.slice(0, 3).join(' | ')}`);
  }
  if (problems.length > 0) {
    throw new Error(`${label} telemetry failed — ${problems.join('; ')}`);
  }
}

async function runStageA(browser, baseUrl) {
  console.log('\n--- Stage A: Full Test Suite (`/?test=true` at 1280x720) ---');
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  try {
    const page = await context.newPage();
    const telemetry = attachPageTelemetry(page, baseUrl);

    await page.goto(`${baseUrl}/?test=true`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__starlightTestSummary), null, { timeout: 300000 });

    const summary = await page.evaluate(() => {
      const s = window.__starlightTestSummary;
      return {
        passed: s.passed,
        failed: s.failed,
        total: s.total,
        durationMs: s.durationMs,
        allPassed: s.allPassed,
        failures: (s.results || []).filter((r) => !r.passed),
      };
    });

    if (!summary.allPassed || summary.failed !== 0 || summary.total <= 0) {
      const failDetails = summary.failures
        .map((f) => `[${f.suite}] ${f.name}: ${f.error}`)
        .join(' | ');
      throw new Error(
        `Stage A failed: ${summary.passed}/${summary.total} passed, ${summary.failed} failed (${failDetails})`,
      );
    }

    assertCleanTelemetry('Stage A', telemetry);
    console.log(
      `[PASS] Stage A: ${summary.passed}/${summary.total} suites/tests passed in ${summary.durationMs}ms; 0 pageerror, 0 console.error, 0 local HTTP >= 400`,
    );
  } finally {
    await context.close();
  }
}

async function runStageB(browser, baseUrl) {
  console.log('\n--- Stage B: 6-Viewport Layout & Touch Matrix ---');
  for (const vp of VIEWPORT_MATRIX) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.hasTouch,
    });
    try {
      const page = await context.newPage();
      const telemetry = attachPageTelemetry(page, baseUrl);

      await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#trainer-card-violet', { state: 'visible' });
      await page.waitForFunction(() => Boolean(window.__starlightApp));

      await page.click('#trainer-card-violet');
      await page.waitForSelector('.starter-pick-btn', { state: 'visible' });
      await page.click('.starter-pick-btn');
      await page.waitForSelector('#game-shell:not([hidden])', { state: 'visible' });

      // Dismiss welcome dialogue cleanly if shown
      await page.evaluate(() => {
        window.__starlightApp?.closeDialogue?.();
      });

      // 1. HUD overflow check with #hud-install-group and #hud-btn-arcade unhidden
      const hudRes = await page.evaluate(async () => {
        const app = window.__starlightApp;
        const installGroup = document.getElementById('hud-install-group');
        const arcadeBtn = document.getElementById('hud-btn-arcade');
        app?.pokedex?.storage?.unlockArcade?.();
        app?.refreshHud?.();
        if (installGroup) installGroup.hidden = false;
        if (arcadeBtn) arcadeBtn.hidden = false;

        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const hudBar = document.querySelector('.hud-bar');
        const hudRect = hudBar.getBoundingClientRect();
        return {
          scrollWidth: hudBar.scrollWidth,
          clientWidth: hudBar.clientWidth,
          installVisible: !installGroup?.hidden,
          arcadeVisible: !arcadeBtn?.hidden,
          right: Math.round(hudRect.right),
          innerWidth: window.innerWidth,
        };
      });

      if (
        !hudRes.installVisible
        || !hudRes.arcadeVisible
        || hudRes.scrollWidth > hudRes.clientWidth + 2
        || hudRes.right > hudRes.innerWidth + 2
      ) {
        throw new Error(
          `${vp.name}: .hud-bar overflow (${hudRes.scrollWidth} > ${hudRes.clientWidth}, right=${hudRes.right}/${hudRes.innerWidth})`,
        );
      }

      // 2. Battle layout, zero-jump dock stability & bounding-box collision check
      const battleRes = await page.evaluate(async () => {
        const app = window.__starlightApp;
        const { createPokemon } = await import('./js/pokemon.js');
        const { RIVAL_TRAINERS } = await import('./js/config.js');
        const profile = app.pokedex?.storage?.getActiveProfile?.();
        const venusaur = createPokemon(3, 36, 'forest', {
          moveIds: ['vine_whip', 'razor_leaf', 'solar_pulse', 'synthesis'],
        });
        if (profile) {
          profile.team = [venusaur];
        }
        const rival = RIVAL_TRAINERS['81,71'] || Object.values(RIVAL_TRAINERS)[0];
        const enemy = createPokemon(1024, 36, 'crater', {
          isElite: true,
          upgradeTier: 4,
          encounterTrait: 'apex',
        });
        const startPromise = app.battle.start({
          enemy,
          enemyParty: [enemy],
          isTrainer: true,
          trainerData: rival,
          biomeId: 'crater',
        });
        app.syncControlVisibility();
        const typeFlush = setInterval(() => app.battle.finishTypewriter(), 20);
        try {
          await startPromise;
        } finally {
          clearInterval(typeFlush);
        }
        while (app.battle.active && !app.battle.canAcceptPlayerAction()) {
          await new Promise((r) => setTimeout(r, 15));
        }

        const waitFrames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const rectOf = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
        };
        const overlaps = (a, b) => Boolean(
          a && b && !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom),
        );

        const captureState = (label) => {
          const deckEl = document.querySelector('.battle-deck');
          const logEl = document.getElementById('battle-log');
          const movesEl = document.getElementById('battle-moves');
          const actionsEl = document.getElementById('battle-actions');
          const stageEl = document.getElementById('battle-stage');
          const eCard = rectOf('.status-card-enemy');
          const pCard = rectOf('.status-card-player');
          const eSprite = rectOf('#enemy-sprite');
          const pSprite = rectOf('#player-sprite');
          const deckRect = rectOf('.battle-deck');

          return {
            label,
            battleVisible: !document.getElementById('battle-screen')?.hidden,
            rects: {
              deck: deckRect,
              log: rectOf('#battle-log'),
              actions: rectOf('#battle-actions'),
              moves: rectOf('#battle-moves'),
              stage: rectOf('#battle-stage'),
            },
            eCard_vs_pSprite: overlaps(eCard, pSprite),
            pCard_vs_eSprite: overlaps(pCard, eSprite),
            eCard_vs_eSprite: overlaps(eCard, eSprite),
            pCard_vs_pSprite: overlaps(pCard, pSprite),
            deckTop: deckRect ? Math.round(deckRect.top) : -1,
            deckBottom: deckRect ? Math.round(deckRect.bottom) : 99999,
            docOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
            deckOverflow: Boolean(deckEl && deckEl.scrollWidth > deckEl.clientWidth + 2),
            logOverflow: Boolean(logEl && logEl.scrollWidth > logEl.clientWidth + 2),
            movesOverflow: Boolean(movesEl && movesEl.scrollWidth > movesEl.clientWidth + 2),
            actionsOverflow: Boolean(actionsEl && actionsEl.scrollWidth > actionsEl.clientWidth + 2),
            deckScrollWidth: deckEl ? deckEl.scrollWidth : 99999,
            deckClientWidth: deckEl ? deckEl.clientWidth : 0,
            stageHeight: stageEl ? Math.round(stageEl.getBoundingClientRect().height) : 0,
            logText: logEl?.textContent || '',
            hasRawBraces: /\{[^}]+\}|[{}]/.test(logEl?.textContent || ''),
            isTyping: Boolean(logEl?.classList.contains('is-typing')),
            isLongText: Boolean(logEl?.classList.contains('is-long-text')),
            isXlongText: Boolean(logEl?.classList.contains('is-xlong-text')),
            typedLen: logEl?.querySelector('.battle-log-typed')?.textContent?.length ?? 0,
            ghostLen: logEl?.querySelector('.battle-log-ghost')?.textContent?.length ?? 0,
            scrollTop: logEl?.scrollTop ?? -1,
            moveCardCount: document.querySelectorAll('#battle-moves .move-card').length,
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
          };
        };

        const states = [];
        try {
          // State 1: Baseline 1-line prompt + 4-move grid
          app.battle.setIdlePrompt('What will Venusaur do?');
          await waitFrames();
          states.push(captureState('idle-1line-4moves'));

          // State 2: Mid-typewriter streaming (240+ char Rival string)
          const xlongRivalMsg = '{rival}: "{trainer}, we hiked from Starlight Village all the way across Terastal Crystal Crater and Astral Sky Citadel to test {pokemon} with {move} under full Starlight Resonance! Let us see whether your Starlight Bond can endure our fiercest storm!"';
          const sayP = app.battle.say(xlongRivalMsg, 30, 350);
          await new Promise((r) => setTimeout(r, 100));
          await waitFrames();
          states.push(captureState('mid-typewriter-220+'));
          app.battle.finishTypewriter();
          await sayP;
          await waitFrames();
          states.push(captureState('settled-220+'));

          // State 3: ~85-char 2-line combat message & ~94-char .is-long-text message
          app.battle.setIdlePrompt('Venusaur unleashed Razor Leaf! It struck Tyranitar with a sharp critical hit today!');
          await waitFrames();
          states.push(captureState('two-line-83chars'));

          app.battle.setIdlePrompt('✨ Venusaur unleashed Starlight Solar Pulse! Critical hit landed cleanly against Tyranitar now!');
          await waitFrames();
          states.push(captureState('two-line-94chars-long'));

          // State 4: 1-move grid vs 4-move grid
          venusaur.moves = ['razor_leaf'];
          app.battle.renderMoveButtons();
          app.battle.setIdlePrompt('What will Venusaur do?');
          await waitFrames();
          states.push(captureState('one-move-deck'));
        } finally {
          app.battle.stop({ outcome: 'escaped', faintedAll: false });
          app.syncControlVisibility();
          app.syncOverworldPause();
        }

        return {
          baseline: states[0],
          states,
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
        };
      });

      const base = battleRes.baseline;
      if (!base || base.moveCardCount !== 4) {
        throw new Error(`${vp.name}: expected 4-move baseline, got ${base?.moveCardCount}`);
      }
      const midState = battleRes.states.find((s) => s.label === 'mid-typewriter-220+');
      if (!midState?.isTyping || midState.typedLen <= 0 || midState.ghostLen <= 0 || midState.scrollTop !== 0) {
        throw new Error(`${vp.name}: mid-typewriter ghost-span invariant failed (${JSON.stringify(midState)})`);
      }
      const xlongState = battleRes.states.find((s) => s.label === 'settled-220+');
      if (!xlongState?.isXlongText || xlongState.logText.length < 220) {
        throw new Error(`${vp.name}: 220+ char Rival string missing .is-xlong-text (${JSON.stringify(xlongState)})`);
      }
      const oneMoveState = battleRes.states.find((s) => s.label === 'one-move-deck');
      if (!oneMoveState || oneMoveState.moveCardCount !== 1) {
        throw new Error(`${vp.name}: expected 1-move deck, got ${oneMoveState?.moveCardCount}`);
      }

      let maxDockShiftPx = 0;
      for (const st of battleRes.states) {
        if (
          !st.battleVisible
          || st.eCard_vs_pSprite
          || st.pCard_vs_eSprite
          || st.eCard_vs_eSprite
          || st.pCard_vs_pSprite
        ) {
          throw new Error(`${vp.name} [${st.label}]: battle card/sprite overlap or hidden (${JSON.stringify(st)})`);
        }
        if (
          st.deckTop < -1
          || st.deckBottom > st.innerHeight + 2
          || st.docOverflow
          || st.deckOverflow
          || st.logOverflow
          || st.movesOverflow
          || st.actionsOverflow
        ) {
          throw new Error(
            `${vp.name} [${st.label}]: battle dock clip/overflow (top=${st.deckTop}, bottom=${st.deckBottom}/${st.innerHeight}, overflows=${JSON.stringify({ doc: st.docOverflow, deck: st.deckOverflow, log: st.logOverflow, moves: st.movesOverflow, actions: st.actionsOverflow })})`,
          );
        }
        if (st.hasRawBraces) {
          throw new Error(`${vp.name} [${st.label}]: raw braces leaked in #battle-log ("${st.logText}")`);
        }
        for (const elKey of ['deck', 'log', 'actions', 'moves', 'stage']) {
          const cur = st.rects[elKey];
          const ref = base.rects[elKey];
          if (!cur || !ref || cur.width <= 0 || cur.height <= 0) {
            throw new Error(`${vp.name} [${st.label}]: missing rect for ${elKey}`);
          }
          for (const prop of ['top', 'bottom', 'height']) {
            const delta = Math.abs(cur[prop] - ref[prop]);
            if (delta > maxDockShiftPx) maxDockShiftPx = delta;
            if (delta >= 0.5) {
              throw new Error(
                `${vp.name} [${st.label}]: zero-jump violation on ${elKey}.${prop}: delta=${delta.toFixed(2)}px (cur=${cur[prop]}, base=${ref[prop]})`,
              );
            }
          }
        }
      }

      // 3. #pokedex-body horizontal overflow check (Pokédex + Style Studio)
      await page.click('#hud-btn-dex');
      await page.waitForSelector('#pokedex-modal:not([hidden])', { state: 'visible' });
      const dexRes = await page.evaluate(async () => {
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const body = document.getElementById('pokedex-body');
        const card = document.querySelector('#pokedex-modal .modal-card');
        const cardRect = card ? card.getBoundingClientRect() : null;
        return {
          scrollWidth: body ? body.scrollWidth : 99999,
          clientWidth: body ? body.clientWidth : 0,
          cardLeft: cardRect ? Math.round(cardRect.left) : -1,
          cardRight: cardRect ? Math.round(cardRect.right) : 99999,
          innerWidth: window.innerWidth,
        };
      });
      await page.click('#pokedex-tab-trainer');
      const styleRes = await page.evaluate(async () => {
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const body = document.getElementById('pokedex-body');
        const nickInput = document.getElementById('trainer-nickname-input');
        return {
          scrollWidth: body ? body.scrollWidth : 99999,
          clientWidth: body ? body.clientWidth : 0,
          hasNickInput: Boolean(nickInput),
        };
      });
      await page.click('#pokedex-close-btn');
      await page.waitForSelector('#pokedex-modal[hidden]', { state: 'attached' });

      if (
        dexRes.scrollWidth > dexRes.clientWidth + 2
        || dexRes.cardLeft < -1
        || dexRes.cardRight > dexRes.innerWidth + 2
        || styleRes.scrollWidth > styleRes.clientWidth + 2
        || !styleRes.hasNickInput
      ) {
        throw new Error(
          `${vp.name}: #pokedex-body horizontal overflow or missing Style Studio nickname row (dex=${dexRes.scrollWidth}/${dexRes.clientWidth}, style=${styleRes.scrollWidth}/${styleRes.clientWidth}, hasNick=${styleRes.hasNickInput}, card=[${dexRes.cardLeft},${dexRes.cardRight}]/${dexRes.innerWidth})`,
        );
      }

      // 4. #minigame-modal controls & #minigame-dash-btn visibility inside viewport
      await page.evaluate(() => {
        const arcadeBtn = document.getElementById('hud-btn-arcade');
        if (arcadeBtn) arcadeBtn.hidden = false;
      });
      await page.click('#hud-btn-arcade');
      await page.waitForSelector('#minigame-modal:not([hidden])', { state: 'visible' });
      const miniRes = await page.evaluate(async () => {
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const controls = document.querySelector('#minigame-modal .minigame-controls');
        const dashBtn = document.getElementById('minigame-dash-btn');
        const card = document.querySelector('#minigame-modal .minigame-card');
        const cRect = controls?.getBoundingClientRect();
        const dRect = dashBtn?.getBoundingClientRect();
        return {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          cardScrollWidth: card ? card.scrollWidth : 99999,
          cardClientWidth: card ? card.clientWidth : 0,
          controlsBox: cRect
            ? { left: Math.round(cRect.left), top: Math.round(cRect.top), right: Math.round(cRect.right), bottom: Math.round(cRect.bottom), w: Math.round(cRect.width), h: Math.round(cRect.height) }
            : null,
          dashBox: dRect
            ? { left: Math.round(dRect.left), top: Math.round(dRect.top), right: Math.round(dRect.right), bottom: Math.round(dRect.bottom), w: Math.round(dRect.width), h: Math.round(dRect.height) }
            : null,
        };
      });
      await page.click('#minigame-close-btn');
      await page.waitForSelector('#minigame-modal[hidden]', { state: 'attached' });

      const fitsViewport = (box) => Boolean(
        box
        && box.w > 0
        && box.h > 0
        && box.left >= -1
        && box.top >= -1
        && box.right <= miniRes.innerWidth + 2
        && box.bottom <= miniRes.innerHeight + 2,
      );
      if (
        !fitsViewport(miniRes.controlsBox)
        || !fitsViewport(miniRes.dashBox)
        || miniRes.cardScrollWidth > miniRes.cardClientWidth + 2
      ) {
        throw new Error(`${vp.name}: #minigame-modal controls/#minigame-dash-btn out of viewport (${JSON.stringify(miniRes)})`);
      }

      assertCleanTelemetry(`Stage B (${vp.name})`, telemetry);
      console.log(
        `[PASS] Stage B (${vp.name}, hasTouch=${vp.hasTouch}): HUD ${hudRes.scrollWidth}/${hudRes.clientWidth}, Battle 0-overlap (deck=${base.deckBottom}/${battleRes.innerHeight}, maxShift=${maxDockShiftPx.toFixed(2)}px across ${battleRes.states.length} states), Dex ${dexRes.scrollWidth}/${dexRes.clientWidth} + Style ${styleRes.scrollWidth}/${styleRes.clientWidth}, Sky-Hop dash=[${miniRes.dashBox.left},${miniRes.dashBox.top}..${miniRes.dashBox.right},${miniRes.dashBox.bottom}]`,
      );
    } finally {
      await context.close();
    }
  }
}

async function runStageC(browser, baseUrl) {
  console.log('\n--- Stage C: Offline PWA Service Worker Gate ---');
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  try {
    const page = await context.newPage();

    // Online warm-up: register & activate Service Worker
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    const swReady = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        throw new Error('navigator.serviceWorker unavailable');
      }
      const reg = await navigator.serviceWorker.ready;
      const deadline = Date.now() + 8000;
      while (!navigator.serviceWorker.controller && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 40));
      }
      const cacheKeys = await caches.keys();
      return {
        active: Boolean(reg.active),
        controller: Boolean(navigator.serviceWorker.controller),
        cacheKeys,
      };
    });

    if (!swReady.active || !swReady.controller) {
      throw new Error(`Service worker not active/controlling before offline test (${JSON.stringify(swReady)})`);
    }

    // Track offline telemetry specifically after going offline
    const telemetry = attachPageTelemetry(page, baseUrl, { allowOfflineTestRunner: true });
    await context.setOffline(true);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#trainer-card-violet', { state: 'visible' });
    await page.waitForFunction(() => Boolean(window.__starlightApp));

    await page.click('#trainer-card-violet');
    await page.waitForSelector('.starter-pick-btn', { state: 'visible' });
    await page.click('.starter-pick-btn');
    await page.waitForSelector('#game-shell:not([hidden])', { state: 'visible' });

    const offlineState = await page.evaluate(() => ({
      shellVisible: !document.getElementById('game-shell')?.hidden,
      canvasVisible: Boolean(document.getElementById('overworld-canvas')?.getBoundingClientRect().width > 0),
      leadLabel: document.getElementById('hud-lead-label')?.textContent || '',
      controlling: Boolean(navigator.serviceWorker.controller),
    }));

    if (!offlineState.shellVisible || !offlineState.canvasVisible || !offlineState.controlling) {
      throw new Error(`Offline #game-shell entry incomplete: ${JSON.stringify(offlineState)}`);
    }

    assertCleanTelemetry('Stage C (Offline PWA)', telemetry);
    console.log(
      `[PASS] Stage C: SW active (${swReady.cacheKeys.join(', ')}) -> offline reload -> Violet -> starter -> #game-shell (${offlineState.leadLabel}) with 0 pageerror`,
    );
  } finally {
    await context.close();
  }
}

async function main() {
  console.log('=== Pokémon: Starlight Island — Browser CI Gate ===');
  let server = null;
  let browser = null;

  try {
    const pw = await resolvePlaywright();
    const started = await startStaticServer(ROOT_DIR);
    server = started.server;
    const { baseUrl } = started;
    console.log(`Static server listening at ${baseUrl} (root: ${ROOT_DIR})`);

    browser = await launchChromium(pw);
    console.log(`Chromium launched (version ${browser.version()})`);

    await runStageA(browser, baseUrl);
    await runStageB(browser, baseUrl);
    await runStageC(browser, baseUrl);

    console.log('\n=== Browser CI Gate PASSED (Stages A, B, C) ===');
    process.exitCode = 0;
  } catch (err) {
    console.error('\n[FAIL] Browser CI Gate failed:', err?.stack || err?.message || err);
    process.exitCode = 1;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore cleanup errors
      }
    }
    if (server) {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(() => resolve()));
    }
  }
}

main();
