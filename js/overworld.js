import { GAME_META, TRAINERS } from './config.js';
import {
  CHESTS,
  FIELD_QUESTS,
  LANDMARKS,
  NPCS,
  SHRINES,
  SIGNPOSTS,
  TILE,
  WORLD_COLS,
  WORLD_MAP,
  WORLD_ROWS,
  findNearestSafePosition,
  getBiomeAt,
  isTileWalkableAt,
} from './world-data.js';

const ENCOUNTER_TILE_BIOME = {
  [TILE.TALL_GRASS]: 'forest',
  [TILE.CAVE_FLOOR]: 'cave',
  [TILE.SHALLOW_WATER]: 'water',
  [TILE.VOLCANO_FLOOR]: 'volcano',
  [TILE.SNOW_GRASS]: 'peak',
};

const QUEST_BY_ID = new Map(FIELD_QUESTS.map((q) => [q.id, q]));

const DIR_VEC = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

function hash2d(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export function drawTrainerPortrait(canvas, trainerId) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  const trainer = TRAINERS[trainerId] || TRAINERS.violet;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.save();
  const s = Math.min(w, h) / 36;
  ctx.scale(s, s);

  // Soft glow background circle
  ctx.fillStyle = trainer.accentSoft;
  ctx.beginPath();
  ctx.arc(18, 19, 15, 0, Math.PI * 2);
  ctx.fill();

  // Hair / Back
  ctx.fillStyle = trainer.hair;
  ctx.fillRect(10, 8, 16, 14);
  if (trainerId === 'violet') {
    ctx.fillRect(9, 12, 3, 10);
    ctx.fillRect(24, 12, 3, 10);
  }

  // Cap
  ctx.fillStyle = trainer.outfitPrimary;
  ctx.fillRect(9, 6, 18, 6);
  ctx.fillStyle = trainer.outfitSecondary;
  ctx.fillRect(11, 10, 14, 3);
  // Cap badge
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(16, 7, 4, 3);

  // Face
  ctx.fillStyle = trainer.skin;
  ctx.fillRect(11, 12, 14, 10);

  // Eyes
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(13, 15, 2, 3);
  ctx.fillRect(21, 15, 2, 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(13, 15, 1, 1);
  ctx.fillRect(21, 15, 1, 1);

  // Rosy smile
  ctx.fillStyle = '#f43f5e';
  ctx.fillRect(16, 19, 4, 1);

  // Outfit shoulders
  ctx.fillStyle = trainer.outfitPrimary;
  ctx.fillRect(9, 22, 18, 10);
  ctx.fillStyle = trainer.outfitSecondary;
  ctx.fillRect(13, 22, 10, 5);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(17, 24, 2, 2);

  ctx.restore();
}

export class OverworldEngine {
  constructor(canvas, {
    getProfile,
    onStepSaved,
    onWildEncounter,
    onInteract,
    onHealSpot,
    onBiomeChange,
    onInteractHint,
  }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tileSize = GAME_META.tileSize;
    this.viewW = GAME_META.viewportCols * this.tileSize;
    this.viewH = GAME_META.viewportRows * this.tileSize;

    this.getProfile = getProfile;
    this.onStepSaved = onStepSaved;
    this.onWildEncounter = onWildEncounter;
    this.onInteract = onInteract;
    this.onHealSpot = onHealSpot;
    this.onBiomeChange = onBiomeChange;
    this.onInteractHint = onInteractHint;

    this.active = false;
    this.paused = false;
    this.moving = false;
    this.moveStartX = 8;
    this.moveStartY = 15;
    this.moveTargetX = 8;
    this.moveTargetY = 15;
    this.moveProgress = 0;
    this.moveDuration = 0.145;
    this.walkFrame = 0;

    this.stepsSinceBattle = 4;
    this.encounterTileStreak = 0;
    this.currentBiomeId = null;
    this.lastHintKey = null;

    this.particles = [];
    this.rustleTile = null;
    this.rarePatches = [];
    this.rarePatchSpawnCooldown = 1.0;

    this.ambientMotes = Array.from({ length: 22 }, (_, i) => ({
      seed: i * 1.73,
      xFrac: ((i * 37) % 100) / 100,
      yFrac: ((i * 61) % 100) / 100,
      speed: 0.45 + (i % 4) * 0.2,
      size: i % 3 === 0 ? 2 : 1.5,
    }));

    if (typeof ResizeObserver !== 'undefined' && this.canvas?.parentElement) {
      this._resizeObserver = new ResizeObserver(() => this.syncViewportSize());
      this._resizeObserver.observe(this.canvas.parentElement);
    }
  }

  syncViewportSize() {
    const parent = this.canvas?.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      this.viewW = GAME_META.viewportCols * this.tileSize;
      this.viewH = GAME_META.viewportRows * this.tileSize;
      return;
    }

    const zoom = Math.max(1.35, Math.min(2.2, Math.min(rect.width / 440, rect.height / 310)));
    const nextW = Math.max(288, Math.min(WORLD_COLS * this.tileSize, Math.round(rect.width / zoom)));
    const nextH = Math.max(224, Math.min(WORLD_ROWS * this.tileSize, Math.round(rect.height / zoom)));

    if (nextW !== this.viewW || nextH !== this.viewH) {
      this.viewW = nextW;
      this.viewH = nextH;
      this.canvas.width = nextW;
      this.canvas.height = nextH;
    }
  }

  syncFromProfile() {
    this.syncViewportSize();
    const profile = this.getProfile();
    if (!profile) return;

    if (!this.isTileWalkable(profile.pos.x, profile.pos.y)) {
      const safe = findNearestSafePosition(profile.pos.x, profile.pos.y, profile.pos.dir);
      profile.pos.x = safe.x;
      profile.pos.y = safe.y;
      profile.pos.dir = safe.dir;
      this.onStepSaved?.(safe.x, safe.y, safe.dir, false);
    }

    this.moving = false;
    this.moveStartX = profile.pos.x;
    this.moveStartY = profile.pos.y;
    this.moveTargetX = profile.pos.x;
    this.moveTargetY = profile.pos.y;
    this.moveProgress = 0;
    this.stepsSinceBattle = 4;
    this.encounterTileStreak = 0;
    this.particles = [];
    this.rarePatchSpawnCooldown = 0;
    this.refreshRarePatches(profile, 0);

    const biome = getBiomeAt(profile.pos.x, profile.pos.y);
    this.currentBiomeId = biome.id;
    this.onBiomeChange?.(biome, false);
    this.refreshInteractHint();
  }

  setActive(active) {
    this.active = active;
    if (active) {
      this.syncFromProfile();
    }
  }

  setPaused(paused) {
    this.paused = paused;
  }

  isTileWalkable(x, y) {
    return isTileWalkableAt(x, y);
  }

  refreshRarePatches(profile, dt = 0) {
    if (!profile) return;
    for (let i = this.rarePatches.length - 1; i >= 0; i--) {
      const patch = this.rarePatches[i];
      patch.ttl -= dt;
      const dist = Math.abs(patch.x - profile.pos.x) + Math.abs(patch.y - profile.pos.y);
      if (patch.ttl <= 0 || dist > 18) {
        this.rarePatches.splice(i, 1);
      }
    }

    if (dt > 0) {
      this.rarePatchSpawnCooldown -= dt;
    }
    if (this.rarePatches.length >= 2 || this.rarePatchSpawnCooldown > 0) return;

    const px = profile.pos.x;
    const py = profile.pos.y;
    const candidates = [];
    const occupied = new Set(this.rarePatches.map((p) => `${p.x},${p.y}`));

    for (let dy = -7; dy <= 7; dy++) {
      for (let dx = -9; dx <= 9; dx++) {
        const cx = px + dx;
        const cy = py + dy;
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dist < 2 || dist > 12) continue;
        if (occupied.has(`${cx},${cy}`) || !this.isTileWalkable(cx, cy)) continue;
        const tile = WORLD_MAP[cy]?.[cx];
        const biomeId = ENCOUNTER_TILE_BIOME[tile];
        if (biomeId) {
          candidates.push({ x: cx, y: cy, biomeId });
        }
      }
    }

    if (candidates.length > 0) {
      const slots = Math.min(2 - this.rarePatches.length, candidates.length);
      for (let i = 0; i < slots; i++) {
        const pickIdx = Math.floor(Math.random() * candidates.length);
        const [chosen] = candidates.splice(pickIdx, 1);
        this.rarePatches.push({
          x: chosen.x,
          y: chosen.y,
          biomeId: chosen.biomeId,
          ttl: 18 + Math.random() * 6,
        });
      }
      this.rarePatchSpawnCooldown = 4.0;
    } else {
      this.rarePatchSpawnCooldown = 2.0;
    }
  }

  getInteractiveTarget() {
    const profile = this.getProfile();
    if (!profile) return null;
    const { x, y, dir } = profile.pos;

    if (WORLD_MAP[y]?.[x] === TILE.HEAL) {
      return { type: 'heal', key: `${x},${y}`, label: '💖 Heal Team', data: null };
    }

    const vec = DIR_VEC[dir] || DIR_VEC.down;
    const tx = x + vec.dx;
    const ty = y + vec.dy;
    if (tx < 0 || ty < 0 || tx >= WORLD_COLS || ty >= WORLD_ROWS) return null;

    const tile = WORLD_MAP[ty][tx];
    const key = `${tx},${ty}`;
    if (tile === TILE.SIGN && SIGNPOSTS[key]) {
      return { type: 'sign', key, label: '💬 Read Sign', data: SIGNPOSTS[key] };
    }
    if (tile === TILE.SHRINE && SHRINES[key]) {
      return { type: 'shrine', key, label: `⚔️ ${SHRINES[key].name}`, data: SHRINES[key] };
    }
    if (tile === TILE.CHEST && CHESTS[key]) {
      const opened = profile.chestsOpened.includes(CHESTS[key].id);
      return {
        type: 'chest',
        key,
        label: opened ? '📦 Empty Chest' : '💎 Open Chest',
        data: CHESTS[key],
        opened,
      };
    }
    if (tile === TILE.HEAL) {
      return { type: 'heal', key, label: '💖 Healing Fountain', data: null };
    }
    if (NPCS[key]) {
      return {
        type: 'npc',
        key,
        label: `💬 Talk: ${NPCS[key].name}`,
        data: NPCS[key],
      };
    }
    if (LANDMARKS[key]) {
      return {
        type: 'landmark',
        key,
        label: `${LANDMARKS[key].icon} ${LANDMARKS[key].name}`,
        data: LANDMARKS[key],
      };
    }
    return null;
  }

  refreshInteractHint() {
    const target = this.getInteractiveTarget();
    const hintKey = target ? `${target.type}:${target.key}:${target.opened ? '1' : '0'}` : 'none';
    if (hintKey !== this.lastHintKey) {
      this.lastHintKey = hintKey;
      this.onInteractHint?.(target);
    }
  }

  triggerInteract() {
    if (!this.active || this.paused || this.moving) return false;
    const target = this.getInteractiveTarget();
    if (!target) return false;
    this.onInteract?.(target);
    return true;
  }

  spawnParticles(tileX, tileY, color, count = 7, upward = false) {
    const cx = tileX * this.tileSize + 16;
    const cy = tileY * this.tileSize + 20;
    for (let i = 0; i < count; i++) {
      const angle = upward
        ? -Math.PI / 2 + (Math.random() - 0.5) * 1.1
        : Math.random() * Math.PI * 2;
      const speed = upward ? 26 + Math.random() * 28 : 18 + Math.random() * 34;
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 14,
        y: cy + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (upward ? 14 : 12),
        life: 0,
        maxLife: 0.45 + Math.random() * 0.3,
        color,
        size: 2 + Math.random() * 2.5,
      });
    }
  }

  update(dt, heldDir) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 45 * dt;
      }
    }

    if (this.rustleTile) {
      this.rustleTile.timer -= dt;
      if (this.rustleTile.timer <= 0) this.rustleTile = null;
    }

    if (!this.active || this.paused) return;
    const profile = this.getProfile();
    if (!profile) return;

    this.refreshRarePatches(profile, dt);

    if (this.moving) {
      this.moveProgress += dt / this.moveDuration;
      if (this.moveProgress >= 1) {
        this.moving = false;
        this.moveProgress = 0;
        profile.pos.x = this.moveTargetX;
        profile.pos.y = this.moveTargetY;
        this.onStepSaved?.(profile.pos.x, profile.pos.y, profile.pos.dir, true);
        this.handleTileArrival(profile.pos.x, profile.pos.y);
      }
    }

    if (!this.moving && heldDir) {
      this.tryStartMove(heldDir);
    }
  }

  tryStartMove(dir) {
    const profile = this.getProfile();
    if (!profile) return;
    const vec = DIR_VEC[dir];
    if (!vec) return;

    const changedDir = profile.pos.dir !== dir;
    profile.pos.dir = dir;

    const nx = profile.pos.x + vec.dx;
    const ny = profile.pos.y + vec.dy;

    if (!this.isTileWalkable(nx, ny)) {
      if (changedDir) {
        this.onStepSaved?.(profile.pos.x, profile.pos.y, dir, false);
      }
      this.refreshInteractHint();
      return;
    }

    this.moving = true;
    this.moveStartX = profile.pos.x;
    this.moveStartY = profile.pos.y;
    this.moveTargetX = nx;
    this.moveTargetY = ny;
    this.moveProgress = 0;
    this.walkFrame = (this.walkFrame + 1) % 2;
    this.refreshInteractHint();
  }

  handleTileArrival(x, y) {
    this.refreshInteractHint();

    const biome = getBiomeAt(x, y);
    if (biome.id !== this.currentBiomeId) {
      this.currentBiomeId = biome.id;
      this.onBiomeChange?.(biome, true);
    }

    const tile = WORLD_MAP[y][x];

    if (tile === TILE.HEAL) {
      this.spawnParticles(x, y, '#f472b6', 12, true);
      this.spawnParticles(x, y, '#67e8f9', 8, true);
      this.onHealSpot?.();
      return;
    }

    const encounterBiome = ENCOUNTER_TILE_BIOME[tile];
    if (encounterBiome) {
      this.rustleTile = { x, y, timer: 0.25 };

      const rareIdx = this.rarePatches.findIndex((p) => p.x === x && p.y === y);
      if (rareIdx !== -1) {
        this.rarePatches.splice(rareIdx, 1);
        this.spawnParticles(x, y, '#facc15', 14, true);
        this.spawnParticles(x, y, '#ffffff', 8, true);
        this.stepsSinceBattle = 0;
        this.encounterTileStreak = 0;
        this.onWildEncounter?.(encounterBiome, { isRarePatch: true });
        return;
      }

      if (tile === TILE.TALL_GRASS) this.spawnParticles(x, y, '#4ade80', 6);
      else if (tile === TILE.CAVE_FLOOR) this.spawnParticles(x, y, '#c084fc', 6);
      else if (tile === TILE.SHALLOW_WATER) this.spawnParticles(x, y, '#7dd3fc', 7);
      else if (tile === TILE.VOLCANO_FLOOR) this.spawnParticles(x, y, '#fb923c', 7, true);
      else if (tile === TILE.SNOW_GRASS) this.spawnParticles(x, y, '#a5f3fc', 7, true);

      this.stepsSinceBattle += 1;
      this.encounterTileStreak += 1;
      if (this.stepsSinceBattle >= 4) {
        const guaranteed = this.encounterTileStreak >= 9;
        if (guaranteed || Math.random() < 0.21) {
          this.stepsSinceBattle = 0;
          this.encounterTileStreak = 0;
          this.onWildEncounter?.(encounterBiome, { isRarePatch: false });
        }
      }
    } else {
      this.stepsSinceBattle += 1;
      this.encounterTileStreak = 0;
    }
  }

  render(nowMs) {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const profile = this.getProfile();
    if (!profile) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, this.viewW, this.viewH);
      return;
    }

    const px = this.moving
      ? this.moveStartX + (this.moveTargetX - this.moveStartX) * this.moveProgress
      : profile.pos.x;
    const py = this.moving
      ? this.moveStartY + (this.moveTargetY - this.moveStartY) * this.moveProgress
      : profile.pos.y;

    const maxCamX = Math.max(0, WORLD_COLS * this.tileSize - this.viewW);
    const maxCamY = Math.max(0, WORLD_ROWS * this.tileSize - this.viewH);
    const camX = Math.max(0, Math.min(maxCamX, Math.round(px * this.tileSize - this.viewW / 2 + 16)));
    const camY = Math.max(0, Math.min(maxCamY, Math.round(py * this.tileSize - this.viewH / 2 + 16)));

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    const startCol = Math.max(0, Math.floor(camX / this.tileSize));
    const endCol = Math.min(WORLD_COLS - 1, Math.ceil((camX + this.viewW) / this.tileSize));
    const startRow = Math.max(0, Math.floor(camY / this.tileSize));
    const endRow = Math.min(WORLD_ROWS - 1, Math.ceil((camY + this.viewH) / this.tileSize));

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        this.drawTile(ctx, col, row, col * this.tileSize - camX, row * this.tileSize - camY, nowMs, profile);
      }
    }

    // Draw glowing rare-spawn patches on encounter tiles
    for (const patch of this.rarePatches) {
      if (patch.x < startCol || patch.x > endCol || patch.y < startRow || patch.y > endRow) continue;
      this.drawRarePatchOverlay(ctx, patch.x * this.tileSize - camX, patch.y * this.tileSize - camY, nowMs);
    }

    // Draw environmental landmarks
    for (const [key, landmark] of Object.entries(LANDMARKS)) {
      const [lx, ly] = key.split(',').map(Number);
      if (lx < startCol || lx > endCol || ly < startRow || ly > endRow) continue;
      this.drawLandmark(ctx, lx * this.tileSize - camX, ly * this.tileSize - camY, landmark, nowMs);
    }

    // Subtle drifting atmosphere shadows over outdoor biome regions
    const biomeId = this.currentBiomeId || getBiomeAt(profile.pos.x, profile.pos.y).id;
    if (biomeId !== 'cave') {
      ctx.save();
      ctx.fillStyle = biomeId === 'volcano'
        ? 'rgba(251, 146, 60, 0.055)'
        : biomeId === 'peak'
          ? 'rgba(103, 232, 249, 0.065)'
          : 'rgba(15, 23, 42, 0.085)';
      for (let c = 0; c < 3; c++) {
        const span = this.viewW + 180;
        const cx = ((nowMs * (0.011 + c * 0.004) + c * 190 - camX * 0.35) % span + span) % span - 90;
        const cy = 28 + c * Math.max(54, Math.floor(this.viewH * 0.28));
        ctx.beginPath();
        ctx.ellipse(cx, cy, 44 + c * 10, 14 + c * 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Collect visible NPCs + player for clean Y-sorted rendering
    const actors = [];
    for (const [key, npc] of Object.entries(NPCS)) {
      const [nx, ny] = key.split(',').map(Number);
      if (nx < startCol - 1 || nx > endCol + 1 || ny < startRow - 1 || ny > endRow + 1) continue;
      actors.push({
        kind: 'npc',
        sortY: ny,
        sx: nx * this.tileSize - camX,
        sy: ny * this.tileSize - camY,
        npc,
      });
    }
    actors.push({
      kind: 'player',
      sortY: py,
      sx: Math.round(px * this.tileSize - camX),
      sy: Math.round(py * this.tileSize - camY),
    });
    actors.sort((a, b) => a.sortY - b.sortY);

    for (const actor of actors) {
      if (actor.kind === 'player') {
        this.drawPlayer(ctx, actor.sx, actor.sy, profile.trainerId, profile.pos.dir, nowMs);
      } else {
        this.drawNpc(ctx, actor.sx, actor.sy, actor.npc, nowMs, profile);
      }
    }

    // Draw ambient biome motes (fireflies, cave crystals, sea mist, volcanic embers, peak snowflakes)
    ctx.save();
    for (let i = 0; i < this.ambientMotes.length; i++) {
      const mote = this.ambientMotes[i];
      const driftDown = biomeId === 'peak';
      const ySpeed = driftDown ? 0.011 : 0.006;
      const yDir = driftDown ? 1 : -1;
      const mx = Math.round(((mote.xFrac * this.viewW + Math.sin(nowMs * 0.0012 * mote.speed + mote.seed) * 16) % this.viewW + this.viewW) % this.viewW);
      const my = Math.round(((mote.yFrac * this.viewH + yDir * nowMs * ySpeed * mote.speed) % this.viewH + this.viewH) % this.viewH);
      const twinkle = 0.28 + 0.5 * (0.5 + 0.5 * Math.sin(nowMs * 0.004 * mote.speed + mote.seed * 2));
      ctx.globalAlpha = twinkle;
      if (biomeId === 'cave') {
        ctx.fillStyle = '#e879f9';
      } else if (biomeId === 'water') {
        ctx.fillStyle = '#e0f2fe';
      } else if (biomeId === 'volcano') {
        ctx.fillStyle = i % 2 === 0 ? '#fb923c' : '#fde047';
      } else if (biomeId === 'peak') {
        ctx.fillStyle = i % 3 === 0 ? '#a5f3fc' : i % 3 === 1 ? '#e0f2fe' : '#c084fc';
      } else {
        ctx.fillStyle = '#fef08a';
      }
      ctx.fillRect(mx, my, mote.size, mote.size);
    }
    ctx.restore();

    // Draw particles
    for (const p of this.particles) {
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - camX, p.y - camY, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawBaseGround(ctx, sx, sy, ts, h, tileBiomeId) {
    if (tileBiomeId === 'cave') {
      ctx.fillStyle = '#4c4566';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tileBiomeId === 'volcano') {
      ctx.fillStyle = '#574645';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tileBiomeId === 'peak') {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tileBiomeId === 'water') {
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(sx, sy, ts, ts);
    } else {
      ctx.fillStyle = h > 0.5 ? '#5ec269' : '#57ba62';
      ctx.fillRect(sx, sy, ts, ts);
      if (h > 0.72) {
        ctx.fillStyle = '#48a453';
        ctx.fillRect(sx + 6, sy + 10, 3, 2);
        ctx.fillRect(sx + 20, sy + 22, 3, 2);
      }
    }
  }

  drawTile(ctx, tx, ty, sx, sy, nowMs, profile) {
    const tile = WORLD_MAP[ty][tx];
    const ts = this.tileSize;
    const h = hash2d(tx, ty);
    const tileBiomeId = getBiomeAt(tx, ty).id;

    // Base ground layer
    if (tile === TILE.CAVE_WALL || tile === TILE.CAVE_FLOOR || tile === TILE.CAVE_PATH) {
      ctx.fillStyle = '#2b2640';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tile === TILE.SAND || tile === TILE.SHALLOW_WATER || tile === TILE.WATER || tile === TILE.BRIDGE) {
      ctx.fillStyle = tileBiomeId === 'volcano' ? '#3b1f1e' : '#f3d999';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tile === TILE.LAVA || tile === TILE.VOLCANO_FLOOR || tile === TILE.VOLCANO_PATH) {
      ctx.fillStyle = '#3b1f1e';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tile === TILE.ICE_WALL || tile === TILE.SNOW_GRASS || tile === TILE.SNOW_PATH) {
      ctx.fillStyle = '#dbeafe';
      ctx.fillRect(sx, sy, ts, ts);
    } else {
      this.drawBaseGround(ctx, sx, sy, ts, h, tileBiomeId);
    }

    switch (tile) {
      case TILE.PATH: {
        ctx.fillStyle = '#e7c68b';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#d4ae6d';
        if (h > 0.45) ctx.fillRect(sx + 6, sy + 7, 5, 4);
        if (h < 0.65) ctx.fillRect(sx + 19, sy + 20, 6, 4);
        break;
      }

      case TILE.TALL_GRASS: {
        ctx.fillStyle = '#2d8a47';
        ctx.fillRect(sx + 1, sy + 1, ts - 2, ts - 2);
        const sway = Math.sin(nowMs * 0.0045 + tx * 0.7 + ty * 0.5) * 1.8;
        const rustle = this.rustleTile && this.rustleTile.x === tx && this.rustleTile.y === ty ? 3.2 : 0;
        ctx.fillStyle = '#4ade80';
        for (let i = 0; i < 4; i++) {
          const bx = sx + 4 + i * 7;
          ctx.fillRect(bx + sway + (i % 2 ? rustle : -rustle), sy + 6, 4, 10);
          ctx.fillRect(bx - sway * 0.7, sy + 18, 4, 10);
        }
        ctx.fillStyle = '#166534';
        ctx.fillRect(sx + 3, sy + 15, ts - 6, 2);
        break;
      }

      case TILE.TREE: {
        ctx.fillStyle = '#14532d';
        ctx.fillRect(sx + 3, sy + 5, ts - 6, ts - 7);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(sx + 12, sy + 22, 8, 9);
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(sx + 16, sy + 14, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(sx + 13, sy + 11, 7, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case TILE.WATER: {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(sx, sy, ts, ts);
        const wave = Math.sin(nowMs * 0.004 + tx * 0.8 + ty * 0.6) * 2.5;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(sx + 4 + wave, sy + 9, 10, 3);
        ctx.fillRect(sx + 15 - wave, sy + 22, 11, 3);

        ctx.fillStyle = 'rgba(224, 242, 254, 0.78)';
        const foamOffset = Math.round((Math.sin(nowMs * 0.005 + tx + ty) + 1) * 1.2);
        if (ty > 0 && WORLD_MAP[ty - 1][tx] !== TILE.WATER) {
          ctx.fillRect(sx, sy + foamOffset, ts, 3);
        }
        if (ty < WORLD_ROWS - 1 && WORLD_MAP[ty + 1][tx] !== TILE.WATER) {
          ctx.fillRect(sx, sy + ts - 3 - foamOffset, ts, 3);
        }
        if (tx > 0 && WORLD_MAP[ty][tx - 1] !== TILE.WATER) {
          ctx.fillRect(sx + foamOffset, sy, 3, ts);
        }
        if (tx < WORLD_COLS - 1 && WORLD_MAP[ty][tx + 1] !== TILE.WATER) {
          ctx.fillRect(sx + ts - 3 - foamOffset, sy, 3, ts);
        }
        break;
      }

      case TILE.SHALLOW_WATER: {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(sx + 2, sy + 2, ts - 4, ts - 4);
        ctx.fillStyle = '#67e8f9';
        ctx.fillRect(sx + 4, sy + 4, ts - 8, ts - 8);
        const shimmer = Math.sin(nowMs * 0.005 + tx * 1.1 + ty) * 2;
        ctx.fillStyle = '#ecfeff';
        ctx.fillRect(sx + 8 + shimmer, sy + 11, 10, 2);
        ctx.fillRect(sx + 12 - shimmer, sy + 21, 9, 2);
        break;
      }

      case TILE.SAND: {
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#eab308';
        if (h > 0.5) ctx.fillRect(sx + 8, sy + 12, 3, 2);
        if (h < 0.45) ctx.fillRect(sx + 21, sy + 23, 3, 2);
        break;
      }

      case TILE.BRIDGE: {
        const overLava = tileBiomeId === 'volcano';
        ctx.fillStyle = overLava ? '#dc2626' : '#0284c7';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = overLava ? '#44403c' : '#92400e';
        ctx.fillRect(sx, sy + 2, ts, ts - 4);
        ctx.fillStyle = overLava ? '#57534e' : '#b45309';
        for (let px = 2; px < ts; px += 8) {
          ctx.fillRect(sx + px, sy + 4, 6, ts - 8);
        }
        ctx.fillStyle = overLava ? '#fb923c' : '#fde68a';
        ctx.fillRect(sx, sy + 2, ts, 2);
        ctx.fillRect(sx, sy + ts - 4, ts, 2);
        break;
      }

      case TILE.CAVE_WALL: {
        const isVolcanoRim = tileBiomeId === 'volcano';
        ctx.fillStyle = isVolcanoRim ? '#451a1a' : '#3f385c';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = isVolcanoRim ? '#6b2c26' : '#5b5280';
        ctx.fillRect(sx + 2, sy + 2, ts - 4, 10);
        ctx.fillStyle = isVolcanoRim ? '#230d0d' : '#1e1a2e';
        ctx.fillRect(sx, sy + ts - 4, ts, 4);
        if (h > 0.72) {
          ctx.fillStyle = isVolcanoRim ? '#f97316' : '#a855f7';
          ctx.fillRect(sx + 12, sy + 10, 5, 7);
        }
        break;
      }

      case TILE.CAVE_PATH: {
        ctx.fillStyle = '#4c4566';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#5e567d';
        if (h > 0.5) ctx.fillRect(sx + 7, sy + 9, 6, 4);
        break;
      }

      case TILE.CAVE_FLOOR: {
        ctx.fillStyle = '#352f4d';
        ctx.fillRect(sx, sy, ts, ts);
        const pulse = 0.65 + Math.sin(nowMs * 0.005 + tx + ty) * 0.35;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = h > 0.5 ? '#22d3ee' : '#e879f9';
        ctx.fillRect(sx + 7, sy + 8, 5, 7);
        ctx.fillRect(sx + 20, sy + 18, 5, 7);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + 8, sy + 9, 2, 2);
        ctx.fillRect(sx + 21, sy + 19, 2, 2);
        ctx.globalAlpha = 1;
        break;
      }

      case TILE.LAVA: {
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(sx, sy, ts, ts);
        const flow = Math.sin(nowMs * 0.0038 + tx * 0.9 + ty * 0.7) * 3;
        const glow = 0.7 + 0.3 * Math.sin(nowMs * 0.005 + tx + ty * 1.3);
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(sx + 3 + flow * 0.5, sy + 5, 13, 6);
        ctx.fillRect(sx + 13 - flow * 0.5, sy + 19, 14, 6);
        ctx.globalAlpha = glow;
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(sx + 5 + flow, sy + 7, 9, 3);
        ctx.fillRect(sx + 15 - flow, sy + 21, 9, 3);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(sx + 8 + flow, sy + 8, 4, 2);
        ctx.globalAlpha = 1;
        break;
      }

      case TILE.VOLCANO_FLOOR: {
        ctx.fillStyle = h > 0.5 ? '#4a2521' : '#3d1e1b';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#291513';
        ctx.fillRect(sx + 3, sy + 4, 7, 4);
        ctx.fillRect(sx + 18, sy + 20, 8, 4);
        const emberPulse = 0.45 + 0.5 * Math.sin(nowMs * 0.006 + tx * 1.4 + ty);
        ctx.globalAlpha = emberPulse;
        ctx.fillStyle = h > 0.4 ? '#f97316' : '#fb923c';
        ctx.fillRect(sx + 8, sy + 12, 4, 4);
        ctx.fillRect(sx + 21, sy + 7, 4, 4);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(sx + 9, sy + 13, 2, 2);
        ctx.globalAlpha = 1;
        break;
      }

      case TILE.VOLCANO_PATH: {
        ctx.fillStyle = '#5c4947';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#735b58';
        if (h > 0.4) ctx.fillRect(sx + 5, sy + 6, 7, 4);
        if (h < 0.7) ctx.fillRect(sx + 18, sy + 19, 7, 4);
        break;
      }

      case TILE.ICE_WALL: {
        ctx.fillStyle = '#0e7490';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(sx + 2, sy + 2, ts - 4, 14);
        ctx.fillStyle = '#a5f3fc';
        ctx.fillRect(sx + 4, sy + 3, 12, 6);
        ctx.fillRect(sx + 18, sy + 8, 8, 5);
        ctx.fillStyle = '#ecfeff';
        ctx.fillRect(sx + 6, sy + 4, 6, 2);
        ctx.fillStyle = '#164e63';
        ctx.fillRect(sx, sy + ts - 4, ts, 4);
        break;
      }

      case TILE.SNOW_GRASS: {
        ctx.fillStyle = '#bae6fd';
        ctx.fillRect(sx + 1, sy + 1, ts - 2, ts - 2);
        const sway = Math.sin(nowMs * 0.004 + tx * 0.8 + ty * 0.6) * 1.5;
        const rustle = this.rustleTile && this.rustleTile.x === tx && this.rustleTile.y === ty ? 3.0 : 0;
        ctx.fillStyle = '#38bdf8';
        for (let i = 0; i < 4; i++) {
          const bx = sx + 4 + i * 7;
          ctx.fillRect(bx + sway + (i % 2 ? rustle : -rustle), sy + 6, 4, 9);
          ctx.fillRect(bx - sway * 0.7, sy + 18, 4, 9);
        }
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(sx + 5, sy + 5, 3, 3);
        ctx.fillRect(sx + 21, sy + 17, 3, 3);
        break;
      }

      case TILE.SNOW_PATH: {
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#cbd5e1';
        if (h > 0.45) ctx.fillRect(sx + 7, sy + 8, 6, 3);
        if (h < 0.65) ctx.fillRect(sx + 18, sy + 21, 6, 3);
        break;
      }

      case TILE.RUNE_TRAIL: {
        this.drawBaseGround(ctx, sx, sy, ts, h, tileBiomeId);
        ctx.fillStyle = '#334155';
        ctx.fillRect(sx + 3, sy + 3, ts - 6, ts - 6);
        ctx.fillStyle = '#475569';
        ctx.fillRect(sx + 5, sy + 5, ts - 10, ts - 10);
        const runePulse = 0.58 + 0.42 * Math.sin(nowMs * 0.0055 + (tx + ty) * 0.65);
        ctx.globalAlpha = runePulse;
        ctx.fillStyle = tileBiomeId === 'volcano' ? '#fb923c' : '#38bdf8';
        ctx.fillRect(sx + 11, sy + 14, 10, 4);
        ctx.fillRect(sx + 14, sy + 11, 4, 10);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(sx + 14, sy + 14, 4, 4);
        ctx.globalAlpha = 1;
        break;
      }

      case TILE.LANTERN: {
        this.drawBaseGround(ctx, sx, sy, ts, h, tileBiomeId);
        const haloPulse = 0.24 + 0.12 * Math.sin(nowMs * 0.005 + tx * 0.9 + ty);
        ctx.save();
        ctx.fillStyle = `rgba(250, 204, 21, ${haloPulse.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sx + 16, sy + 13, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // Stone base & iron post
        ctx.fillStyle = '#334155';
        ctx.fillRect(sx + 11, sy + 24, 10, 6);
        ctx.fillStyle = '#475569';
        ctx.fillRect(sx + 14, sy + 15, 4, 11);
        // Lantern cap & glowing glass
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(sx + 10, sy + 6, 12, 3);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(sx + 11, sy + 9, 10, 7);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(sx + 13, sy + 10, 6, 5);
        break;
      }

      case TILE.ROOF: {
        ctx.fillStyle = tx < 9 ? '#a855f7' : '#ef4444';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = tx < 9 ? '#c084fc' : '#f87171';
        ctx.fillRect(sx, sy + 4, ts, 6);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(sx, sy + ts - 4, ts, 4);
        break;
      }

      case TILE.WALL: {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(sx, sy + ts - 4, ts, 4);
        if (tx === 4 || tx === 13) {
          ctx.fillStyle = '#78350f';
          ctx.fillRect(sx + 9, sy + 8, 14, 24);
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(sx + 19, sy + 19, 3, 3);
        } else {
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(sx + 8, sy + 8, 16, 12);
          ctx.fillStyle = '#e0f2fe';
          ctx.fillRect(sx + 10, sy + 10, 5, 8);
        }
        break;
      }

      case TILE.FLOWER: {
        const sway = Math.sin(nowMs * 0.005 + tx) * 1.2;
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(sx + 7 + sway, sy + 8, 6, 6);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(sx + 9 + sway, sy + 10, 2, 2);
        ctx.fillStyle = '#fb7185';
        ctx.fillRect(sx + 19 - sway, sy + 19, 6, 6);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(sx + 21 - sway, sy + 21, 2, 2);
        break;
      }

      case TILE.SIGN: {
        this.drawBaseGround(ctx, sx, sy, ts, h, tileBiomeId);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(sx + 14, sy + 18, 4, 11);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(sx + 5, sy + 6, 22, 14);
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(sx + 8, sy + 10, 16, 2);
        ctx.fillRect(sx + 8, sy + 14, 12, 2);
        break;
      }

      case TILE.HEAL: {
        if (tileBiomeId === 'village') {
          ctx.fillStyle = '#e7c68b';
          ctx.fillRect(sx, sy, ts, ts);
        } else {
          this.drawBaseGround(ctx, sx, sy, ts, h, tileBiomeId);
        }
        const glow = 0.72 + Math.sin(nowMs * 0.006) * 0.25;
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(sx + 16, sy + 16, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = glow;
        ctx.fillStyle = '#a5f3fc';
        ctx.beginPath();
        ctx.arc(sx + 16, sy + 16, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(sx + 14, sy + 10, 4, 12);
        ctx.fillRect(sx + 10, sy + 14, 12, 4);
        break;
      }

      case TILE.SHRINE: {
        const shrine = SHRINES[`${tx},${ty}`];
        const cleared = shrine && profile.shrinesCleared.includes(shrine.id);
        this.drawBaseGround(ctx, sx, sy, ts, h, tileBiomeId);
        ctx.fillStyle = '#475569';
        ctx.fillRect(sx + 4, sy + 18, 24, 12);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(sx + 7, sy + 14, 18, 6);
        const bob = Math.sin(nowMs * 0.006) * 2.5;
        ctx.fillStyle = cleared
          ? '#facc15'
          : shrine?.biome === 'forest'
            ? '#4ade80'
            : shrine?.biome === 'cave'
              ? '#c084fc'
              : shrine?.biome === 'volcano'
                ? '#fb7185'
                : shrine?.biome === 'peak'
                  ? '#67e8f9'
                  : '#38bdf8';
        ctx.beginPath();
        ctx.arc(sx + 16, sy + 9 + bob, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + 14, sy + 7 + bob, 2, 2);
        break;
      }

      case TILE.CHEST: {
        const chest = CHESTS[`${tx},${ty}`];
        const opened = chest && profile.chestsOpened.includes(chest.id);
        this.drawBaseGround(ctx, sx, sy, ts, h, tileBiomeId);
        ctx.fillStyle = opened ? '#64748b' : '#b45309';
        ctx.fillRect(sx + 6, sy + 10, 20, 16);
        ctx.fillStyle = opened ? '#94a3b8' : '#f59e0b';
        ctx.fillRect(sx + 6, sy + 10, 20, 6);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(sx + 14, sy + 14, 4, 5);
        break;
      }

      default:
        break;
    }
  }

  drawRarePatchOverlay(ctx, sx, sy, nowMs) {
    const ts = this.tileSize;
    const pulse = 0.55 + 0.45 * Math.sin(nowMs * 0.01);
    ctx.save();
    ctx.strokeStyle = `rgba(250, 204, 21, ${(0.5 + pulse * 0.45).toFixed(2)})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 2, sy + 2, ts - 4, ts - 4);

    // Shimmering gold star sparkles dancing over the rustling patch
    for (let i = 0; i < 3; i++) {
      const phase = nowMs * 0.007 + i * 2.1;
      const rx = sx + 8 + ((i * 8 + Math.sin(phase) * 4) % 18);
      const ry = sy + 16 - Math.abs(Math.cos(phase * 1.1)) * 12;
      ctx.fillStyle = i === 1 ? '#ffffff' : '#fef08a';
      ctx.fillRect(Math.round(rx), Math.round(ry), 3, 3);
    }
    ctx.restore();
  }

  drawLandmark(ctx, sx, sy, landmark, nowMs) {
    const glow = 0.55 + 0.45 * Math.sin(nowMs * 0.005);
    ctx.save();
    if (landmark.id === 'landmark_telescope') {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 27, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#475569';
      ctx.fillRect(sx + 11, sy + 18, 3, 9);
      ctx.fillRect(sx + 18, sy + 18, 3, 9);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(sx + 9, sy + 10, 14, 5);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(sx + 21, sy + 8, 5, 5);
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx + 24, sy + 6, 3, 3);
    } else if (landmark.id === 'landmark_great_tree') {
      ctx.globalAlpha = 0.4 + glow * 0.45;
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx + 16, sy + 14, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(sx + 7, sy + 7, 3, 3);
      ctx.fillRect(sx + 22, sy + 10, 3, 3);
    } else if (landmark.id === 'landmark_caldera_cairn') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 27, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#292524';
      ctx.fillRect(sx + 7, sy + 20, 18, 6);
      ctx.fillStyle = '#44403c';
      ctx.fillRect(sx + 10, sy + 14, 12, 6);
      ctx.fillStyle = '#57534e';
      ctx.fillRect(sx + 12, sy + 9, 8, 5);
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#fb923c';
      ctx.fillRect(sx + 14, sy + 11, 4, 4);
    } else if (landmark.id === 'landmark_coral_arch') {
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(sx + 5, sy + 10, 5, 16);
      ctx.fillRect(sx + 22, sy + 10, 5, 16);
      ctx.fillRect(sx + 7, sy + 6, 18, 6);
      ctx.fillStyle = '#fbcfe8';
      ctx.fillRect(sx + 10, sy + 8, 12, 2);
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(sx + 14, sy + 14, 4, 4);
    } else if (landmark.id === 'landmark_aurora_spire') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 27, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4f46e5';
      ctx.fillRect(sx + 11, sy + 12, 10, 15);
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(sx + 13, sy + 6, 6, 16);
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(sx + 15, sy + 3, 2, 8);
    }
    ctx.restore();
  }

  drawNpc(ctx, sx, sy, npc, nowMs, profile) {
    const palette = npc.palette || {};
    const bob = Math.sin(nowMs * 0.004 + sx * 0.1) * 0.8;

    // Warm shadow + subtle glow ring
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(sx + 16, sy + 28, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const y = Math.round(sy - bob);

    // Legs
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(sx + 10, y + 23, 5, 5);
    ctx.fillRect(sx + 17, y + 23, 5, 5);

    // Outfit
    ctx.fillStyle = palette.outfitPrimary || '#38bdf8';
    ctx.fillRect(sx + 9, y + 14, 14, 10);
    ctx.fillStyle = palette.outfitSecondary || '#facc15';
    ctx.fillRect(sx + 13, y + 15, 6, 7);

    // Head & Hair
    ctx.fillStyle = palette.hair || '#475569';
    ctx.fillRect(sx + 9, y + 4, 14, 11);

    // Face
    ctx.fillStyle = palette.skin || '#fde2c8';
    ctx.fillRect(sx + 10, y + 8, 12, 7);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(sx + 12, y + 10, 2, 3);
    ctx.fillRect(sx + 18, y + 10, 2, 3);

    // Hat / Trim
    if (palette.hat) {
      ctx.fillStyle = palette.hat;
      ctx.fillRect(sx + 8, y + 2, 16, 5);
      ctx.fillStyle = palette.outfitSecondary || '#fef08a';
      ctx.fillRect(sx + 10, y + 5, 12, 2);
    }

    // Floating quest / unvisited indicator
    const quest = QUEST_BY_ID.get(npc.questId);
    const questDone = Boolean(quest && (profile?.questsCompleted || []).includes(quest.id));
    const questReady = Boolean(quest && !questDone && quest.check?.(profile));
    const unvisited = !(profile?.npcsTalked || []).includes(npc.id);

    if (questReady || (unvisited && !questDone)) {
      const floatY = y - 8 + Math.sin(nowMs * 0.008) * (questReady ? 2.4 : 1.3);
      ctx.save();
      ctx.fillStyle = questReady ? '#facc15' : '#fef08a';
      ctx.fillRect(sx + 11, Math.round(floatY), 10, 9);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx + 11, Math.round(floatY), 10, 9);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(sx + 15, Math.round(floatY) + 2, 2, 4);
      ctx.fillRect(sx + 15, Math.round(floatY) + 7, 2, 1);
      ctx.restore();
    }
  }

  drawPlayer(ctx, sx, sy, trainerId, dir, nowMs) {
    const trainer = TRAINERS[trainerId] || TRAINERS.violet;
    const bob = this.moving ? Math.abs(Math.sin(this.moveProgress * Math.PI)) * 3 : Math.sin(nowMs * 0.004) * 0.6;
    const stepShift = this.moving ? (this.walkFrame === 0 ? 2 : -2) : 0;

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(sx + 16, sy + 28, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const y = Math.round(sy - bob);

    // Legs
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(sx + 10, y + 23 + (stepShift > 0 ? -1 : 0), 5, 5);
    ctx.fillRect(sx + 17, y + 23 + (stepShift < 0 ? -1 : 0), 5, 5);

    // Body / Jacket
    ctx.fillStyle = trainer.outfitPrimary;
    ctx.fillRect(sx + 9, y + 14, 14, 10);
    ctx.fillStyle = trainer.outfitSecondary;
    ctx.fillRect(sx + 12, y + 15, 8, 6);

    // Head & Hair
    ctx.fillStyle = trainer.hair;
    ctx.fillRect(sx + 9, y + 4, 14, 11);

    // Face (unless facing up)
    if (dir !== 'up') {
      ctx.fillStyle = trainer.skin;
      if (dir === 'down') {
        ctx.fillRect(sx + 10, y + 8, 12, 7);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(sx + 12, y + 10, 2, 3);
        ctx.fillRect(sx + 18, y + 10, 2, 3);
      } else if (dir === 'left') {
        ctx.fillRect(sx + 9, y + 8, 8, 7);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(sx + 11, y + 10, 2, 3);
      } else if (dir === 'right') {
        ctx.fillRect(sx + 15, y + 8, 8, 7);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(sx + 19, y + 10, 2, 3);
      }
    }

    // Trainer Cap + Emblem
    ctx.fillStyle = trainer.outfitPrimary;
    ctx.fillRect(sx + 8, y + 2, 16, 5);
    ctx.fillStyle = trainer.outfitSecondary;
    ctx.fillRect(sx + 9, y + 6, 14, 2);
    if (dir === 'down') {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(sx + 14, y + 3, 4, 2);
    }
  }
}
