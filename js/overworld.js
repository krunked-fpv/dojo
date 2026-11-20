import {
  CHESTS,
  GAME_META,
  SHRINES,
  SIGNPOSTS,
  TILE,
  TRAINERS,
  WORLD_COLS,
  WORLD_MAP,
  WORLD_ROWS,
  getBiomeAt,
} from './config.js';

const SOLID_TILES = new Set([
  TILE.TREE,
  TILE.WATER,
  TILE.CAVE_WALL,
  TILE.WALL,
  TILE.ROOF,
  TILE.SIGN,
  TILE.SHRINE,
  TILE.CHEST,
]);

const ENCOUNTER_TILE_BIOME = {
  [TILE.TALL_GRASS]: 'forest',
  [TILE.CAVE_FLOOR]: 'cave',
  [TILE.SHALLOW_WATER]: 'water',
};

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

    this.ambientMotes = Array.from({ length: 18 }, (_, i) => ({
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
    this.moving = false;
    this.moveStartX = profile.pos.x;
    this.moveStartY = profile.pos.y;
    this.moveTargetX = profile.pos.x;
    this.moveTargetY = profile.pos.y;
    this.moveProgress = 0;
    this.stepsSinceBattle = 4;
    this.encounterTileStreak = 0;
    this.particles = [];

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
    if (x < 0 || y < 0 || x >= WORLD_COLS || y >= WORLD_ROWS) return false;
    const tile = WORLD_MAP[y][x];
    return !SOLID_TILES.has(tile);
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
    // Update particles even if paused slightly
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
      if (tile === TILE.TALL_GRASS) this.spawnParticles(x, y, '#4ade80', 6);
      else if (tile === TILE.CAVE_FLOOR) this.spawnParticles(x, y, '#c084fc', 6);
      else if (tile === TILE.SHALLOW_WATER) this.spawnParticles(x, y, '#7dd3fc', 7);

      this.stepsSinceBattle += 1;
      this.encounterTileStreak += 1;
      if (this.stepsSinceBattle >= 4) {
        const guaranteed = this.encounterTileStreak >= 9;
        if (guaranteed || Math.random() < 0.21) {
          this.stepsSinceBattle = 0;
          this.encounterTileStreak = 0;
          this.onWildEncounter?.(encounterBiome);
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

    // Subtle drifting cloud shadows over outdoor biome regions
    const biomeId = this.currentBiomeId || getBiomeAt(profile.pos.x, profile.pos.y).id;
    if (biomeId !== 'cave') {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.085)';
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

    // Draw player
    const playerScreenX = Math.round(px * this.tileSize - camX);
    const playerScreenY = Math.round(py * this.tileSize - camY);
    this.drawPlayer(ctx, playerScreenX, playerScreenY, profile.trainerId, profile.pos.dir, nowMs);

    // Draw ambient biome motes (fireflies, cave crystal sparkles, sea mist)
    ctx.save();
    for (const mote of this.ambientMotes) {
      const mx = Math.round(((mote.xFrac * this.viewW + Math.sin(nowMs * 0.0012 * mote.speed + mote.seed) * 14) % this.viewW + this.viewW) % this.viewW);
      const my = Math.round(((mote.yFrac * this.viewH - nowMs * 0.006 * mote.speed) % this.viewH + this.viewH) % this.viewH);
      const twinkle = 0.28 + 0.45 * (0.5 + 0.5 * Math.sin(nowMs * 0.004 * mote.speed + mote.seed * 2));
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = biomeId === 'cave' ? '#e879f9' : biomeId === 'water' ? '#e0f2fe' : '#fef08a';
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

  drawTile(ctx, tx, ty, sx, sy, nowMs, profile) {
    const tile = WORLD_MAP[ty][tx];
    const ts = this.tileSize;
    const h = hash2d(tx, ty);
    const inCave = tx >= 19 && ty <= 17;

    // Base ground
    if (tile === TILE.CAVE_WALL || tile === TILE.CAVE_FLOOR || tile === TILE.CAVE_PATH) {
      ctx.fillStyle = '#2b2640';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tile === TILE.SAND || tile === TILE.SHALLOW_WATER || tile === TILE.WATER || tile === TILE.BRIDGE) {
      ctx.fillStyle = '#f3d999';
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

        // Animated shoreline foam edges next to non-water tiles
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
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(sx, sy + 2, ts, ts - 4);
        ctx.fillStyle = '#b45309';
        for (let px = 2; px < ts; px += 8) {
          ctx.fillRect(sx + px, sy + 4, 6, ts - 8);
        }
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(sx, sy + 2, ts, 2);
        ctx.fillRect(sx, sy + ts - 4, ts, 2);
        break;
      }

      case TILE.CAVE_WALL: {
        ctx.fillStyle = '#3f385c';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#5b5280';
        ctx.fillRect(sx + 2, sy + 2, ts - 4, 10);
        ctx.fillStyle = '#1e1a2e';
        ctx.fillRect(sx, sy + ts - 4, ts, 4);
        if (h > 0.72) {
          ctx.fillStyle = '#a855f7';
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
        // Window or door
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
        if (inCave) {
          ctx.fillStyle = '#4c4566';
          ctx.fillRect(sx, sy, ts, ts);
        } else if (ty >= 18) {
          ctx.fillStyle = '#fde68a';
          ctx.fillRect(sx, sy, ts, ts);
        }
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
        ctx.fillStyle = '#e7c68b';
        ctx.fillRect(sx, sy, ts, ts);
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
        if (inCave) {
          ctx.fillStyle = '#4c4566';
          ctx.fillRect(sx, sy, ts, ts);
        } else if (ty >= 18) {
          ctx.fillStyle = '#fde68a';
          ctx.fillRect(sx, sy, ts, ts);
        }
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
        if (inCave) {
          ctx.fillStyle = '#4c4566';
          ctx.fillRect(sx, sy, ts, ts);
        } else if (ty >= 18) {
          ctx.fillStyle = '#fde68a';
          ctx.fillRect(sx, sy, ts, ts);
        }
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
