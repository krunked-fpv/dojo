import * as Config from './config.js';
import { GAME_META, SPECIES, TRAINERS, TYPES, getSpriteUrls } from './config.js';
import * as PokemonMod from './pokemon.js';
import { generateSilhouetteDataUri } from './pokemon.js';
import {
  CHESTS,
  FIELD_QUESTS,
  LANDMARKS,
  NPCS,
  RIVAL_TRAINERS,
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

const FALLBACK_TRAINER_STYLES = {
  default: null,
  royal: {
    outfitPrimary: '#7e22ce',
    outfitSecondary: '#facc15',
    accent: '#c084fc',
    accentDark: '#581c87',
    accentSoft: 'rgba(192, 132, 252, 0.25)',
  },
  aurora: {
    outfitPrimary: '#0891b2',
    outfitSecondary: '#a5f3fc',
    accent: '#38bdf8',
    accentDark: '#164e63',
    accentSoft: 'rgba(56, 189, 248, 0.25)',
  },
  ember: {
    outfitPrimary: '#ea580c',
    outfitSecondary: '#fde047',
    accent: '#fb923c',
    accentDark: '#9a3412',
    accentSoft: 'rgba(251, 146, 60, 0.25)',
  },
  ranger: {
    outfitPrimary: '#15803d',
    outfitSecondary: '#bef264',
    accent: '#4ade80',
    accentDark: '#14532d',
    accentSoft: 'rgba(74, 222, 128, 0.25)',
  },
  nebula: {
    outfitPrimary: '#312e81',
    outfitSecondary: '#f472b6',
    accent: '#818cf8',
    accentDark: '#1e1b4b',
    accentSoft: 'rgba(129, 140, 248, 0.25)',
  },
  solstice: {
    outfitPrimary: '#d97706',
    outfitSecondary: '#fef08a',
    accent: '#fbbf24',
    accentDark: '#92400e',
    accentSoft: 'rgba(251, 191, 36, 0.25)',
  },
  twilight: {
    outfitPrimary: '#581c87',
    outfitSecondary: '#c084fc',
    accent: '#e879f9',
    accentDark: '#3b0764',
    accentSoft: 'rgba(192, 132, 252, 0.25)',
  },
  celestial: {
    outfitPrimary: '#0f766e',
    outfitSecondary: '#fde68a',
    accent: '#2dd4bf',
    accentDark: '#115e59',
    accentSoft: 'rgba(45, 212, 191, 0.24)',
  },
  sakura: {
    outfitPrimary: '#e11d48',
    outfitSecondary: '#fbcfe8',
    accent: '#fb7185',
    accentDark: '#9f1239',
    accentSoft: 'rgba(251, 113, 133, 0.24)',
  },
};

const FALLBACK_ACCESSORY_IDS = new Set(['cap', 'crown', 'wizard', 'headband', 'goggles', 'halo', 'visor', 'antlers']);
const FALLBACK_AURA_IDS = new Set(['none', 'stars', 'hearts', 'lightning', 'blossom', 'cosmic']);

function getResolvedTrainerLook(trainerId, appearance = null) {
  const base = TRAINERS[trainerId] || TRAINERS.violet;
  const rawStyleId = appearance?.styleId;
  const rawAcc = appearance?.accessory;
  const rawAura = appearance?.aura;

  const resolved = typeof Config.resolveTrainerLook === 'function'
    ? Config.resolveTrainerLook(trainerId, appearance)
    : null;

  const configHasStyle = !rawStyleId || rawStyleId === 'default' || Boolean(Config.TRAINER_STYLES?.[rawStyleId]);
  const fallbackStyle = rawStyleId && Object.prototype.hasOwnProperty.call(FALLBACK_TRAINER_STYLES, rawStyleId)
    ? FALLBACK_TRAINER_STYLES[rawStyleId]
    : null;
  const useFallbackStyle = !configHasStyle && Boolean(fallbackStyle);

  const styleId = useFallbackStyle
    ? rawStyleId
    : (resolved?.styleId || (rawStyleId && fallbackStyle ? rawStyleId : 'default'));

  const accessory = (rawAcc && (Config.TRAINER_ACCESSORIES?.[rawAcc] || FALLBACK_ACCESSORY_IDS.has(rawAcc)))
    ? rawAcc
    : (resolved?.accessory || 'cap');

  const aura = (rawAura && (Config.TRAINER_AURAS?.[rawAura] || FALLBACK_AURA_IDS.has(rawAura)))
    ? rawAura
    : (resolved?.aura || 'none');

  if (resolved && !useFallbackStyle) {
    return {
      ...resolved,
      styleId,
      accessory,
      aura,
      cape: Boolean(appearance?.cape ?? resolved.cape),
    };
  }

  const style = useFallbackStyle
    ? fallbackStyle
    : (styleId !== 'default' ? FALLBACK_TRAINER_STYLES[styleId] : null);

  return {
    ...base,
    styleId,
    outfitPrimary: style?.outfitPrimary || base.outfitPrimary,
    outfitSecondary: style?.outfitSecondary || base.outfitSecondary,
    accent: style?.accent || base.accent,
    accentDark: style?.accentDark || base.accentDark,
    accentSoft: style?.accentSoft || base.accentSoft,
    accessory,
    aura,
    cape: Boolean(appearance?.cape),
  };
}

const ENCOUNTER_TILE_BIOME = {
  [TILE.TALL_GRASS]: 'forest',
  [TILE.CAVE_FLOOR]: 'cave',
  [TILE.SHALLOW_WATER]: 'water',
  [TILE.VOLCANO_FLOOR]: 'volcano',
  [TILE.SNOW_GRASS]: 'peak',
  [TILE.GROVE_GRASS]: 'grove',
  [TILE.DUNE_SAND]: 'desert',
  [TILE.MARSH_GRASS]: 'marsh',
  [TILE.SANCTUM_FLOOR]: 'sanctum',
  [TILE.CANYON_GRASS]: 'canyon',
  [TILE.REEF_WATER]: 'reef',
  [TILE.RUINS_FLOOR]: 'ruins',
  [TILE.RIFT_FLOOR]: 'rift',
  [TILE.FAE_GRASS]: 'faeveldt',
  [TILE.ATOLL_SAND]: 'atoll',
  [TILE.CROWN_GRASS]: 'highlands',
  [TILE.TERA_FLOOR]: 'crater',
};

const FOLLOWER_ARCHETYPES = [
  'biped',
  'quadruped',
  'winged',
  'serpentine',
  'aquatic',
  'insectoid',
  'draconic',
  'construct',
  'amorphous',
  'flora',
];

const FOLLOWER_ARCHETYPE_SET = new Set(FOLLOWER_ARCHETYPES);

function resolveFollowerArchetypeFallback(species) {
  const fromMod = typeof PokemonMod.resolveSpeciesArchetype === 'function'
    ? PokemonMod.resolveSpeciesArchetype(species)
    : null;
  if (fromMod && FOLLOWER_ARCHETYPE_SET.has(fromMod)) {
    return fromMod;
  }
  const type = String(species?.type || '').toLowerCase();
  const id = Math.abs(Math.round(Number(species?.id) || 0));
  if (type === 'bug') return 'insectoid';
  if (type === 'water') return 'aquatic';
  if (type === 'dragon') return 'draconic';
  if (type === 'flying') return 'winged';
  if (type === 'grass') return 'flora';
  if (type === 'ghost') return 'amorphous';
  if (type === 'steel' || type === 'rock') return 'construct';
  if (type === 'poison') return 'serpentine';
  if (type === 'fighting' || type === 'psychic') return 'biped';
  return FOLLOWER_ARCHETYPES[id % FOLLOWER_ARCHETYPES.length];
}

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

export function drawTrainerPortrait(canvas, trainerId, appearance = null) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  const look = getResolvedTrainerLook(trainerId, appearance);
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.save();
  const s = Math.min(w, h) / 36;
  ctx.scale(s, s);

  // Soft glow background circle
  ctx.fillStyle = look.accentSoft;
  ctx.beginPath();
  ctx.arc(18, 19, 15, 0, Math.PI * 2);
  ctx.fill();
  if (look.styleId !== 'default' || look.cape || look.aura !== 'none') {
    ctx.strokeStyle = look.aura === 'hearts'
      ? '#f472b6'
      : look.aura === 'lightning'
        ? '#38bdf8'
        : look.aura === 'stars'
          ? '#facc15'
          : look.aura === 'blossom'
            ? '#fb7185'
            : look.aura === 'cosmic'
              ? '#2dd4bf'
              : look.accent;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Optional flowing Starlight Cape behind shoulders
  if (look.cape) {
    ctx.fillStyle = look.accentDark;
    ctx.beginPath();
    ctx.moveTo(8, 22);
    ctx.lineTo(28, 22);
    ctx.lineTo(31, 33);
    ctx.lineTo(5, 33);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = look.outfitSecondary;
    ctx.fillRect(8, 22, 20, 2);
  }

  // Hair / Back
  ctx.fillStyle = look.hair;
  ctx.fillRect(10, 8, 16, 14);
  if (trainerId === 'violet') {
    ctx.fillRect(9, 12, 3, 10);
    ctx.fillRect(24, 12, 3, 10);
  }

  // Face
  ctx.fillStyle = look.skin;
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

  // Accessory / Headgear
  if (look.accessory === 'crown') {
    ctx.fillStyle = '#eab308';
    ctx.fillRect(10, 8, 16, 4);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(10, 4, 3, 4);
    ctx.fillRect(16, 3, 4, 5);
    ctx.fillRect(23, 4, 3, 4);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(17, 4, 2, 2);
    ctx.fillStyle = look.accent || '#38bdf8';
    ctx.fillRect(17, 9, 2, 2);
  } else if (look.accessory === 'wizard') {
    ctx.fillStyle = look.accentDark;
    ctx.fillRect(5, 10, 26, 3);
    ctx.fillRect(10, 6, 16, 4);
    ctx.fillRect(13, 2, 10, 4);
    ctx.fillRect(16, 0, 4, 3);
    ctx.fillStyle = look.outfitSecondary;
    ctx.fillRect(10, 8, 16, 2);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(17, 4, 2, 2);
    ctx.fillRect(16, 5, 4, 1);
  } else if (look.accessory === 'headband') {
    ctx.fillStyle = look.outfitSecondary;
    ctx.fillRect(9, 9, 18, 3);
    ctx.fillStyle = look.accent;
    ctx.fillRect(27, 10, 3, 2);
    ctx.fillRect(28, 12, 3, 2);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(16, 9, 4, 2);
  } else if (look.accessory === 'goggles') {
    ctx.fillStyle = look.accentDark || '#334155';
    ctx.fillRect(9, 9, 18, 3);
    ctx.fillStyle = '#475569';
    ctx.fillRect(10, 7, 7, 5);
    ctx.fillRect(19, 7, 7, 5);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(11, 8, 5, 3);
    ctx.fillRect(20, 8, 5, 3);
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(12, 8, 2, 1);
    ctx.fillRect(21, 8, 2, 1);
  } else if (look.accessory === 'halo') {
    ctx.save();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.42)';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(18, 4.5, 8.5, 2.3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(18, 4.5, 8.5, 2.3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(11, 3, 2, 2);
    ctx.fillRect(24, 4, 2, 2);
    ctx.restore();
  } else if (look.accessory === 'visor') {
    // Sleek glowing cyan & gold Astral Visor
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(9, 13, 18, 6);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(9, 13, 18, 1);
    ctx.fillRect(9, 15, 2, 2);
    ctx.fillRect(25, 15, 2, 2);
    ctx.fillStyle = '#0891b2';
    ctx.fillRect(10, 14, 16, 4);
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(11, 14, 14, 3);
    ctx.fillStyle = '#67e8f9';
    ctx.fillRect(12, 15, 5, 1);
    ctx.fillRect(19, 15, 5, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(13, 14, 3, 1);
  } else if (look.accessory === 'antlers') {
    // Sakura Blossom Crown / Grove Hairpiece
    ctx.fillStyle = '#15803d';
    ctx.fillRect(9, 9, 18, 2);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(10, 5, 2, 4);
    ctx.fillRect(8, 3, 2, 3);
    ctx.fillRect(24, 5, 2, 4);
    ctx.fillRect(26, 3, 2, 3);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(14, 8, 2, 2);
    ctx.fillRect(20, 8, 2, 2);
    for (const [bx, by] of [[9, 6], [17, 7], [24, 6]]) {
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(bx, by, 3, 3);
      ctx.fillStyle = '#fbcfe8';
      ctx.fillRect(bx, by, 1, 1);
      ctx.fillRect(bx + 2, by + 2, 1, 1);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(bx + 1, by + 1, 1, 1);
    }
  } else {
    // Default Adventure Cap
    ctx.fillStyle = look.outfitPrimary;
    ctx.fillRect(9, 6, 18, 6);
    ctx.fillStyle = look.outfitSecondary;
    ctx.fillRect(11, 10, 14, 3);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(16, 7, 4, 3);
  }

  // Outfit shoulders
  ctx.fillStyle = look.outfitPrimary;
  ctx.fillRect(9, 22, 18, 10);
  ctx.fillStyle = look.outfitSecondary;
  ctx.fillRect(13, 22, 10, 5);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(17, 24, 2, 2);
  if (look.cape) {
    ctx.fillRect(10, 22, 2, 2);
    ctx.fillRect(24, 22, 2, 2);
  }

  // Optional Aura Motifs on Portrait
  if (look.aura === 'stars') {
    const pts = [[5, 9, '#fde047'], [30, 10, '#fef08a'], [6, 26, '#c084fc'], [30, 25, '#fde047']];
    for (const [ax, ay, col] of pts) {
      ctx.fillStyle = col;
      ctx.fillRect(ax - 1, ay, 3, 1);
      ctx.fillRect(ax, ay - 1, 1, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ax, ay, 1, 1);
    }
  } else if (look.aura === 'hearts') {
    const hearts = [[5, 9], [28, 11], [6, 25]];
    for (const [hx, hy] of hearts) {
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(hx, hy, 2, 2);
      ctx.fillRect(hx + 3, hy, 2, 2);
      ctx.fillRect(hx + 1, hy + 1, 3, 2);
      ctx.fillRect(hx + 2, hy + 3, 1, 1);
      ctx.fillStyle = '#fecdd3';
      ctx.fillRect(hx, hy, 1, 1);
    }
  } else if (look.aura === 'lightning') {
    ctx.fillStyle = '#fde047';
    ctx.fillRect(5, 8, 2, 3);
    ctx.fillRect(4, 11, 3, 2);
    ctx.fillRect(6, 13, 2, 3);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(29, 10, 2, 3);
    ctx.fillRect(28, 13, 3, 2);
    ctx.fillRect(30, 15, 2, 3);
  } else if (look.aura === 'blossom') {
    const petals = [[5, 9, '#f9a8d4'], [29, 11, '#fb7185'], [6, 25, '#fbcfe8'], [29, 24, '#f472b6']];
    for (const [px, py, col] of petals) {
      ctx.fillStyle = col;
      ctx.fillRect(px, py, 3, 2);
      ctx.fillRect(px + 1, py - 1, 2, 3);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(px + 1, py, 1, 1);
    }
  } else if (look.aura === 'cosmic') {
    ctx.save();
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(18, 19, 15, 6, -0.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    for (const [cx, cy, col] of [[5, 11, '#2dd4bf'], [30, 10, '#fde68a'], [6, 27, '#67e8f9'], [29, 26, '#2dd4bf']]) {
      ctx.fillStyle = col;
      ctx.fillRect(cx - 1, cy, 3, 1);
      ctx.fillRect(cx, cy - 1, 1, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx, cy, 1, 1);
    }
  }

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

    this.followerTrainerId = null;
    this.followerUid = null;
    this.followerSpeciesId = null;
    this.followerShiny = false;
    this.followerUpgradeTier = 0;
    this.followerInitialized = false;
    this.followerX = GAME_META.spawn?.x ?? 8;
    this.followerY = GAME_META.spawn?.y ?? 15;
    this.followerStartX = this.followerX;
    this.followerStartY = this.followerY;
    this.followerTargetX = this.followerX;
    this.followerTargetY = this.followerY;
    this.followerDir = GAME_META.spawn?.dir || 'down';
    this.followerMoving = false;
    this._followerSpriteCache = new Map();

    this.particles = [];
    this.ripples = [];
    this.rustleTile = null;
    this.rarePatches = [];
    this.rarePatchSpawnCooldown = 1.0;

    this.ambientMotes = Array.from({ length: 26 }, (_, i) => ({
      seed: i * 1.73,
      xFrac: ((i * 37) % 100) / 100,
      yFrac: ((i * 61) % 100) / 100,
      speed: 0.45 + (i % 4) * 0.2,
      size: i % 3 === 0 ? 2 : 1.5,
      variant: i % 2,
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

  _placeFollowerBehind(px, py, dir = 'down') {
    const safeDir = DIR_VEC[dir] ? dir : 'down';
    const vec = DIR_VEC[safeDir];
    let fx = px;
    let fy = py;

    const bx = px - vec.dx;
    const by = py - vec.dy;
    if (this.isTileWalkable(bx, by)) {
      fx = bx;
      fy = by;
    } else {
      const cardinals = [
        [0, 1],
        [0, -1],
        [-1, 0],
        [1, 0],
      ];
      for (const [dx, dy] of cardinals) {
        const cx = px + dx;
        const cy = py + dy;
        if (cx === bx && cy === by) continue;
        if (this.isTileWalkable(cx, cy)) {
          fx = cx;
          fy = cy;
          break;
        }
      }
    }

    this.followerX = fx;
    this.followerY = fy;
    this.followerStartX = fx;
    this.followerStartY = fy;
    this.followerTargetX = fx;
    this.followerTargetY = fy;
    this.followerDir = safeDir;
    this.followerMoving = false;
    this.followerInitialized = true;
  }

  _spawnFollowerChangePuff(profile) {
    const accent = getResolvedTrainerLook(profile?.trainerId, profile?.appearance).accent || '#c084fc';
    this.spawnParticles(this.followerX, this.followerY, '#fde047', 4, true);
    this.spawnParticles(this.followerX, this.followerY, accent, 2, true);
  }

  _readLeadMeta(lead) {
    if (!lead) {
      return { uid: null, speciesId: null, isShiny: false, upgradeTier: 0 };
    }
    const rawId = Number(lead.speciesId);
    const upgradeTier = Math.max(0, Math.min(5, Number(lead.upgradeTier) || 0));
    return {
      uid: lead.uid ?? null,
      speciesId: Number.isFinite(rawId) ? rawId : null,
      isShiny: Boolean(lead.isShiny),
      upgradeTier,
    };
  }

  syncFollower() {
    const profile = this.getProfile();
    if (!profile) {
      this.followerUid = null;
      this.followerSpeciesId = null;
      this.followerShiny = false;
      this.followerUpgradeTier = 0;
      this.followerMoving = false;
      return this.getFollowerState();
    }

    if (!this.currentBiomeId && profile.pos) {
      this.currentBiomeId = getBiomeAt(profile.pos.x, profile.pos.y).id;
    }

    const lead = profile.team?.[0] || null;
    const next = this._readLeadMeta(lead);

    if (!this.followerInitialized || this.followerTrainerId !== profile.trainerId) {
      this._placeFollowerBehind(profile.pos.x, profile.pos.y, profile.pos.dir);
      this.followerTrainerId = profile.trainerId;
      this.followerUid = next.uid;
      this.followerSpeciesId = next.speciesId;
      this.followerShiny = next.isShiny;
      this.followerUpgradeTier = next.upgradeTier;
      return this.getFollowerState();
    }

    const changed = (
      next.uid !== this.followerUid ||
      next.speciesId !== this.followerSpeciesId ||
      next.isShiny !== this.followerShiny ||
      next.upgradeTier !== this.followerUpgradeTier
    );

    if (changed) {
      this.followerUid = next.uid;
      this.followerSpeciesId = next.speciesId;
      this.followerShiny = next.isShiny;
      this.followerUpgradeTier = next.upgradeTier;
      if (lead) {
        this._spawnFollowerChangePuff(profile);
      } else {
        this.followerMoving = false;
      }
    }

    return this.getFollowerState();
  }

  getFollowerState() {
    const profile = this.getProfile();
    const lead = profile?.team?.[0] || null;
    const isMoving = Boolean(this.moving && this.followerMoving);
    const renderX = isMoving
      ? this.followerStartX + (this.followerTargetX - this.followerStartX) * this.moveProgress
      : this.followerX;
    const renderY = isMoving
      ? this.followerStartY + (this.followerTargetY - this.followerStartY) * this.moveProgress
      : this.followerY;
    const { speciesId, upgradeTier } = this._readLeadMeta(lead);
    const name = lead ? (lead.name ?? SPECIES[speciesId]?.name ?? null) : null;

    return {
      active: Boolean(lead),
      uid: lead?.uid ?? null,
      speciesId,
      name,
      isShiny: Boolean(lead?.isShiny),
      upgradeTier,
      x: this.followerX,
      y: this.followerY,
      renderX,
      renderY,
      dir: this.followerDir,
      moving: isMoving,
      biomeId: this.currentBiomeId,
    };
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
    this.ripples = [];
    this.rarePatchSpawnCooldown = 0;
    this.refreshRarePatches(profile, 0);

    const biome = getBiomeAt(profile.pos.x, profile.pos.y);
    this.currentBiomeId = biome.id;

    const canPreserveFollower = (
      this.followerInitialized &&
      this.followerTrainerId === profile.trainerId &&
      Math.abs(this.followerX - profile.pos.x) + Math.abs(this.followerY - profile.pos.y) === 1 &&
      this.isTileWalkable(this.followerX, this.followerY)
    );

    if (canPreserveFollower) {
      this.followerStartX = this.followerX;
      this.followerStartY = this.followerY;
      this.followerTargetX = this.followerX;
      this.followerTargetY = this.followerY;
      this.followerMoving = false;
    } else {
      this._placeFollowerBehind(profile.pos.x, profile.pos.y, profile.pos.dir);
      this.followerTrainerId = profile.trainerId;
      const leadMeta = this._readLeadMeta(profile.team?.[0] || null);
      this.followerUid = leadMeta.uid;
      this.followerSpeciesId = leadMeta.speciesId;
      this.followerShiny = leadMeta.isShiny;
    }
    this.syncFollower();

    this.onBiomeChange?.(biome, false);
    this.refreshInteractHint();
  }

  setActive(active) {
    this.active = active;
    if (active) {
      this.syncFromProfile();
    } else {
      this.moving = false;
      this.followerMoving = false;
      this.followerInitialized = false;
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
    if (RIVAL_TRAINERS[key]) {
      const rival = RIVAL_TRAINERS[key];
      return {
        type: 'rival',
        key,
        label: `⚔️ Battle ${rival.name}`,
        data: rival,
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

  spawnStepRipple(tx, ty) {
    const tile = WORLD_MAP[ty]?.[tx];
    if (tile === TILE.SHALLOW_WATER || tile === TILE.REEF_WATER) {
      this.ripples.push({ x: tx, y: ty, kind: 'water', life: 0, maxLife: 0.62 });
    } else if (tile === TILE.SNOW_GRASS || tile === TILE.SNOW_PATH) {
      this.ripples.push({ x: tx, y: ty, kind: 'snow', life: 0, maxLife: 0.68 });
    } else if (tile === TILE.DUNE_SAND || tile === TILE.ATOLL_SAND) {
      this.ripples.push({ x: tx, y: ty, kind: 'sand', life: 0, maxLife: 0.65 });
    }
    if (this.ripples.length > 14) {
      this.ripples.splice(0, this.ripples.length - 14);
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

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.life += dt;
      if (r.life >= r.maxLife) {
        this.ripples.splice(i, 1);
      }
    }

    if (this.rustleTile) {
      this.rustleTile.timer -= dt;
      if (this.rustleTile.timer <= 0) this.rustleTile = null;
    }

    if (this.active || this.followerInitialized) {
      this.syncFollower();
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
        const hadFollowerStep = this.followerMoving;
        this.followerX = this.followerTargetX;
        this.followerY = this.followerTargetY;
        this.followerStartX = this.followerX;
        this.followerStartY = this.followerY;
        this.followerMoving = false;
        if (hadFollowerStep) {
          this.spawnStepRipple(this.followerX, this.followerY);
        }
        this.onStepSaved?.(profile.pos.x, profile.pos.y, profile.pos.dir, true);
        this.handleTileArrival(profile.pos.x, profile.pos.y);
      }
    }

    if (!this.moving && !this.paused && this.active && heldDir) {
      this.tryStartMove(heldDir);
    }
  }

  tryStartMove(dir) {
    const profile = this.getProfile();
    if (!profile) return;
    const vec = DIR_VEC[dir];
    if (!vec) return;

    if (!this.followerInitialized || this.followerTrainerId !== profile.trainerId) {
      this.syncFollower();
    }

    const changedDir = profile.pos.dir !== dir;
    profile.pos.dir = dir;

    const prevX = profile.pos.x;
    const prevY = profile.pos.y;
    const nx = prevX + vec.dx;
    const ny = prevY + vec.dy;

    if (!this.isTileWalkable(nx, ny)) {
      if (changedDir) {
        this.onStepSaved?.(prevX, prevY, dir, false);
      }
      this.refreshInteractHint();
      return;
    }

    this.moving = true;
    this.moveStartX = prevX;
    this.moveStartY = prevY;
    this.moveTargetX = nx;
    this.moveTargetY = ny;
    this.moveProgress = 0;
    this.walkFrame = (this.walkFrame + 1) % 2;

    this.followerStartX = this.followerX;
    this.followerStartY = this.followerY;
    this.followerTargetX = prevX;
    this.followerTargetY = prevY;
    const fdx = prevX - this.followerStartX;
    const fdy = prevY - this.followerStartY;
    if (fdx !== 0 || fdy !== 0) {
      if (Math.abs(fdx) >= Math.abs(fdy)) {
        this.followerDir = fdx > 0 ? 'right' : 'left';
      } else {
        this.followerDir = fdy > 0 ? 'down' : 'up';
      }
      this.followerMoving = true;
    } else {
      this.followerDir = dir;
      this.followerMoving = false;
    }

    this.refreshInteractHint();
  }

  handleTileArrival(x, y) {
    this.refreshInteractHint();
    this.spawnStepRipple(x, y);

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
      else if (tile === TILE.GROVE_GRASS) this.spawnParticles(x, y, '#f9a8d4', 7, true);
      else if (tile === TILE.DUNE_SAND) this.spawnParticles(x, y, '#fbbf24', 7);
      else if (tile === TILE.MARSH_GRASS) this.spawnParticles(x, y, '#2dd4bf', 7, true);
      else if (tile === TILE.SANCTUM_FLOOR) this.spawnParticles(x, y, '#a78bfa', 7, true);
      else if (tile === TILE.CANYON_GRASS) this.spawnParticles(x, y, '#facc15', 7);
      else if (tile === TILE.REEF_WATER) this.spawnParticles(x, y, '#38bdf8', 7);
      else if (tile === TILE.RUINS_FLOOR) this.spawnParticles(x, y, '#f59e0b', 7, true);
      else if (tile === TILE.RIFT_FLOOR) this.spawnParticles(x, y, '#e879f9', 8, true);
      else if (tile === TILE.FAE_GRASS) this.spawnParticles(x, y, '#f9a8d4', 7, true);
      else if (tile === TILE.ATOLL_SAND) this.spawnParticles(x, y, '#fb923c', 7);
      else if (tile === TILE.CROWN_GRASS) this.spawnParticles(x, y, '#94a3b8', 7, true);
      else if (tile === TILE.TERA_FLOOR) this.spawnParticles(x, y, '#38bdf8', 8, true);

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

    if (this.active || this.followerInitialized) {
      this.syncFollower();
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

    // Subtle shallow-water & snow step ripples
    this.drawStepRipples(ctx, camX, camY);

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
          : biomeId === 'grove'
            ? 'rgba(244, 114, 182, 0.05)'
            : biomeId === 'desert'
              ? 'rgba(251, 191, 36, 0.06)'
              : biomeId === 'marsh'
                ? 'rgba(45, 212, 191, 0.055)'
                : biomeId === 'sanctum'
                  ? 'rgba(167, 139, 250, 0.06)'
                  : biomeId === 'canyon'
                    ? 'rgba(250, 204, 21, 0.055)'
                    : biomeId === 'reef'
                      ? 'rgba(56, 189, 248, 0.055)'
                      : biomeId === 'ruins'
                        ? 'rgba(245, 158, 11, 0.055)'
                        : biomeId === 'rift'
                          ? 'rgba(232, 121, 249, 0.065)'
                          : biomeId === 'faeveldt'
                            ? 'rgba(249, 168, 212, 0.06)'
                            : biomeId === 'atoll'
                              ? 'rgba(251, 146, 60, 0.055)'
                              : biomeId === 'highlands'
                                ? 'rgba(148, 163, 184, 0.06)'
                                : biomeId === 'crater'
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

    // Collect visible NPCs, rivals, follower & player for clean Y-sorted rendering
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
    for (const [key, rival] of Object.entries(RIVAL_TRAINERS)) {
      const [rx, ry] = key.split(',').map(Number);
      if (rx < startCol - 1 || rx > endCol + 1 || ry < startRow - 1 || ry > endRow + 1) continue;
      actors.push({
        kind: 'rival',
        sortY: ry,
        sx: rx * this.tileSize - camX,
        sy: ry * this.tileSize - camY,
        rival,
      });
    }
    actors.push({
      kind: 'player',
      sortY: py,
      sx: Math.round(px * this.tileSize - camX),
      sy: Math.round(py * this.tileSize - camY),
    });

    const lead = profile.team?.[0] || null;
    if (lead) {
      const followerActiveMove = Boolean(this.moving && this.followerMoving);
      const fx = followerActiveMove
        ? this.followerStartX + (this.followerTargetX - this.followerStartX) * this.moveProgress
        : this.followerX;
      const fy = followerActiveMove
        ? this.followerStartY + (this.followerTargetY - this.followerStartY) * this.moveProgress
        : this.followerY;
      actors.push({
        kind: 'follower',
        sortY: fy - 0.001,
        sx: Math.round(fx * this.tileSize - camX),
        sy: Math.round(fy * this.tileSize - camY),
        lead,
      });
    }

    actors.sort((a, b) => a.sortY - b.sortY);

    for (const actor of actors) {
      if (actor.kind === 'player') {
        this.drawPlayer(ctx, actor.sx, actor.sy, profile.trainerId, profile.pos.dir, nowMs, profile.appearance);
      } else if (actor.kind === 'follower') {
        this.drawFollower(ctx, actor.sx, actor.sy, actor.lead, this.followerDir, nowMs);
      } else if (actor.kind === 'rival') {
        this.drawRival(ctx, actor.sx, actor.sy, actor.rival, nowMs, profile);
      } else {
        this.drawNpc(ctx, actor.sx, actor.sy, actor.npc, nowMs, profile);
      }
    }

    // Draw biome-specific ambient weather motes & peak aurora shimmer
    this.drawBiomeWeather(ctx, biomeId, nowMs);

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

  drawStepRipples(ctx, camX, camY) {
    if (!this.ripples.length) return;
    ctx.save();
    for (const r of this.ripples) {
      const progress = Math.min(1, r.life / r.maxLife);
      const alpha = Math.max(0, 1 - progress);
      const cx = r.x * this.tileSize + 16 - camX;
      const cy = r.y * this.tileSize + 24 - camY;
      if (r.kind === 'water') {
        ctx.strokeStyle = `rgba(224, 242, 254, ${(alpha * 0.85).toFixed(3)})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 4 + progress * 9, 2 + progress * 4, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (progress > 0.25) {
          ctx.strokeStyle = `rgba(103, 232, 249, ${(alpha * 0.65).toFixed(3)})`;
          ctx.beginPath();
          ctx.ellipse(cx, cy, 2 + progress * 5, 1 + progress * 2.2, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (r.kind === 'sand') {
        ctx.fillStyle = `rgba(146, 64, 14, ${(alpha * 0.36).toFixed(3)})`;
        ctx.fillRect(Math.round(cx - 5), Math.round(cy - 1), 3, 2);
        ctx.fillRect(Math.round(cx + 2), Math.round(cy + 1), 3, 2);
        ctx.strokeStyle = `rgba(254, 240, 138, ${(alpha * 0.55).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 1, 4 + progress * 5, 2 + progress * 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(100, 116, 139, ${(alpha * 0.4).toFixed(3)})`;
        ctx.fillRect(Math.round(cx - 5), Math.round(cy - 1), 3, 2);
        ctx.fillRect(Math.round(cx + 2), Math.round(cy + 1), 3, 2);
        ctx.strokeStyle = `rgba(248, 250, 252, ${(alpha * 0.72).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 1, 5 + progress * 5, 2.5 + progress * 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawBiomeWeather(ctx, biomeId, nowMs) {
    ctx.save();
    if (biomeId === 'peak' || biomeId === 'sanctum' || biomeId === 'rift' || biomeId === 'crater' || biomeId === 'faeveldt') {
      // Soft dancing northern aurora ribbons (or cosmic/Terastal/pastel ribbons)
      const bandColors = biomeId === 'crater'
        ? ['rgba(56, 189, 248, 0.1)', 'rgba(244, 114, 182, 0.09)', 'rgba(250, 204, 21, 0.08)']
        : biomeId === 'faeveldt'
          ? ['rgba(249, 168, 212, 0.09)', 'rgba(192, 132, 252, 0.085)', 'rgba(167, 243, 208, 0.075)']
          : biomeId === 'rift'
            ? ['rgba(232, 121, 249, 0.095)', 'rgba(56, 189, 248, 0.085)', 'rgba(250, 204, 21, 0.07)']
            : biomeId === 'sanctum'
              ? ['rgba(167, 139, 250, 0.095)', 'rgba(103, 232, 249, 0.085)', 'rgba(250, 204, 21, 0.065)']
              : ['rgba(56, 189, 248, 0.085)', 'rgba(52, 211, 153, 0.09)', 'rgba(192, 132, 252, 0.08)'];
      for (let b = 0; b < bandColors.length; b++) {
        const waveY = 14 + b * 14 + Math.sin(nowMs * 0.0014 + b * 1.7) * 8;
        const shiftX = Math.sin(nowMs * 0.0009 + b * 2.1) * 28;
        const grad = ctx.createLinearGradient(0, waveY - 12, this.viewW, waveY + 26);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        grad.addColorStop(0.3 + b * 0.1, bandColors[b]);
        grad.addColorStop(0.75, bandColors[(b + 1) % bandColors.length]);
        grad.addColorStop(1, 'rgba(192, 132, 252, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, waveY + 8);
        ctx.quadraticCurveTo(this.viewW * 0.35 + shiftX, waveY - 14, this.viewW * 0.7, waveY + 12);
        ctx.quadraticCurveTo(this.viewW * 0.88 - shiftX * 0.5, waveY + 22, this.viewW, waveY + 4);
        ctx.lineTo(this.viewW, waveY + 28);
        ctx.lineTo(0, waveY + 28);
        ctx.closePath();
        ctx.fill();
      }
    }

    for (let i = 0; i < this.ambientMotes.length; i++) {
      const mote = this.ambientMotes[i];
      const twinkle = 0.3 + 0.55 * (0.5 + 0.5 * Math.sin(nowMs * 0.004 * mote.speed + mote.seed * 2));

      if (biomeId === 'village' || biomeId === 'forest') {
        if (mote.variant === 0) {
          // Falling blossom petals
          const mx = Math.round(((mote.xFrac * this.viewW + nowMs * 0.007 * mote.speed + Math.sin(nowMs * 0.002 + mote.seed) * 10) % this.viewW + this.viewW) % this.viewW);
          const my = Math.round(((mote.yFrac * this.viewH + nowMs * 0.009 * mote.speed) % this.viewH + this.viewH) % this.viewH);
          ctx.globalAlpha = 0.55 * twinkle + 0.2;
          ctx.fillStyle = i % 4 === 0 ? '#f9a8d4' : '#fbcfe8';
          ctx.fillRect(mx, my, 3, 2);
        } else {
          // Warm drifting fireflies
          const mx = Math.round(((mote.xFrac * this.viewW + Math.sin(nowMs * 0.0014 * mote.speed + mote.seed) * 20) % this.viewW + this.viewW) % this.viewW);
          const my = Math.round(((mote.yFrac * this.viewH - nowMs * 0.004 * mote.speed + Math.cos(nowMs * 0.0016 + mote.seed) * 10) % this.viewH + this.viewH) % this.viewH);
          ctx.globalAlpha = twinkle * 0.42;
          ctx.fillStyle = '#bef264';
          ctx.fillRect(mx - 1, my - 1, 4, 4);
          ctx.globalAlpha = twinkle;
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(mx, my, 2, 2);
        }
      } else if (biomeId === 'cave') {
        // Crystal glints
        const mx = Math.round(((mote.xFrac * this.viewW + Math.sin(nowMs * 0.0008 + mote.seed) * 8) % this.viewW + this.viewW) % this.viewW);
        const my = Math.round(((mote.yFrac * this.viewH + Math.cos(nowMs * 0.0007 + mote.seed) * 8) % this.viewH + this.viewH) % this.viewH);
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = i % 3 === 0 ? '#22d3ee' : '#e879f9';
        ctx.fillRect(mx, my, 2, 2);
        if (twinkle > 0.65) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(mx - 1, my, 4, 1);
          ctx.fillRect(mx, my - 1, 1, 4);
        }
      } else if (biomeId === 'water') {
        // Seafoam bubbles rising softly
        const mx = Math.round(((mote.xFrac * this.viewW + Math.sin(nowMs * 0.0018 * mote.speed + mote.seed) * 12) % this.viewW + this.viewW) % this.viewW);
        const my = Math.round(((mote.yFrac * this.viewH - nowMs * 0.007 * mote.speed) % this.viewH + this.viewH) % this.viewH);
        ctx.globalAlpha = twinkle * 0.85;
        ctx.fillStyle = '#7dd3fc';
        ctx.fillRect(mx, my, 3, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mx, my, 1, 1);
      } else if (biomeId === 'volcano') {
        // Rising glowing embers
        const mx = Math.round(((mote.xFrac * this.viewW + Math.sin(nowMs * 0.0022 * mote.speed + mote.seed) * 18) % this.viewW + this.viewW) % this.viewW);
        const my = Math.round(((mote.yFrac * this.viewH - nowMs * 0.015 * mote.speed) % this.viewH + this.viewH) % this.viewH);
        ctx.globalAlpha = Math.min(1, twinkle * 1.1);
        ctx.fillStyle = i % 2 === 0 ? '#fb923c' : '#fde047';
        ctx.fillRect(mx, my, mote.size, mote.size + 1);
      } else if (biomeId === 'grove') {
        if (mote.variant === 0) {
          // Drifting pink sakura petals
          const mx = Math.round(((mote.xFrac * this.viewW + nowMs * 0.011 * mote.speed + Math.sin(nowMs * 0.0024 + mote.seed) * 14) % this.viewW + this.viewW) % this.viewW);
          const my = Math.round(((mote.yFrac * this.viewH + nowMs * 0.01 * mote.speed) % this.viewH + this.viewH) % this.viewH);
          ctx.globalAlpha = 0.6 + 0.35 * twinkle;
          ctx.fillStyle = i % 3 === 0 ? '#fb7185' : i % 3 === 1 ? '#f9a8d4' : '#fbcfe8';
          ctx.fillRect(mx, my, 3, 2);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(mx + 1, my, 1, 1);
        } else {
          // Floating teal astral motes
          const mx = Math.round(((mote.xFrac * this.viewW + Math.sin(nowMs * 0.0017 * mote.speed + mote.seed) * 20) % this.viewW + this.viewW) % this.viewW);
          const my = Math.round(((mote.yFrac * this.viewH - nowMs * 0.006 * mote.speed + Math.cos(nowMs * 0.0018 + mote.seed) * 9) % this.viewH + this.viewH) % this.viewH);
          ctx.globalAlpha = twinkle * 0.42;
          ctx.fillStyle = '#2dd4bf';
          ctx.fillRect(mx - 1, my - 1, 4, 4);
          ctx.globalAlpha = Math.min(1, twinkle + 0.15);
          ctx.fillStyle = i % 4 === 1 ? '#67e8f9' : '#5eead4';
          ctx.fillRect(mx, my, 2, 2);
        }
      } else if (biomeId === 'desert') {
        // Drifting golden sand motes & sunlit dust
        const mx = Math.round(((mote.xFrac * this.viewW + nowMs * 0.019 * mote.speed) % this.viewW + this.viewW) % this.viewW);
        const my = Math.round(((mote.yFrac * this.viewH + Math.sin(nowMs * 0.0025 * mote.speed + mote.seed) * 8 + nowMs * 0.003) % this.viewH + this.viewH) % this.viewH);
        ctx.globalAlpha = 0.45 + 0.4 * twinkle;
        ctx.fillStyle = i % 3 === 0 ? '#fef08a' : i % 3 === 1 ? '#fbbf24' : '#fdba74';
        ctx.fillRect(mx, my, mote.variant === 0 ? 3 : 2, 1.5);
        if (i % 5 === 0 && twinkle > 0.6) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(mx, my, 1, 1);
        }
      } else if (biomeId === 'marsh') {
        // Glowing bioluminescent bayou spores
        const mx = Math.round(((mote.xFrac * this.viewW + Math.sin(nowMs * 0.0014 * mote.speed + mote.seed) * 18) % this.viewW + this.viewW) % this.viewW);
        const my = Math.round(((mote.yFrac * this.viewH - nowMs * 0.0065 * mote.speed + Math.cos(nowMs * 0.0017 + mote.seed) * 8) % this.viewH + this.viewH) % this.viewH);
        ctx.globalAlpha = twinkle * 0.36;
        ctx.fillStyle = i % 3 === 0 ? '#c084fc' : '#2dd4bf';
        ctx.fillRect(mx - 1, my - 1, 5, 5);
        ctx.globalAlpha = Math.min(1, twinkle + 0.2);
        ctx.fillStyle = i % 3 === 0 ? '#e879f9' : i % 3 === 1 ? '#5eead4' : '#bef264';
        ctx.fillRect(mx, my, 2, 2);
      } else if (biomeId === 'sanctum') {
        // Twinkling starlight motes in the Astral Sky Citadel
        const mx = Math.round(((mote.xFrac * this.viewW + Math.sin(nowMs * 0.0011 * mote.speed + mote.seed) * 12) % this.viewW + this.viewW) % this.viewW);
        const my = Math.round(((mote.yFrac * this.viewH - nowMs * 0.004 * mote.speed + Math.cos(nowMs * 0.0012 + mote.seed) * 10) % this.viewH + this.viewH) % this.viewH);
        ctx.globalAlpha = Math.min(1, twinkle + 0.15);
        ctx.fillStyle = i % 3 === 0 ? '#fde68a' : i % 3 === 1 ? '#67e8f9' : '#c4b5fd';
        ctx.fillRect(mx, my, 2, 2);
        if (twinkle > 0.62) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(mx - 1, my, 4, 1);
          ctx.fillRect(mx, my - 1, 1, 4);
        }
      } else if (biomeId === 'canyon') {
        // Warm steppe wind motes & crackling canyon static sparks
        if (mote.variant === 0) {
          const mx = Math.round(((mote.xFrac * this.viewW + nowMs * 0.018 * mote.speed) % this.viewW + this.viewW) % this.viewW);
          const my = Math.round(((mote.yFrac * this.viewH + Math.sin(nowMs * 0.0028 * mote.speed + mote.seed) * 6) % this.viewH + this.viewH) % this.viewH);
          ctx.globalAlpha = 0.4 + 0.35 * twinkle;
          ctx.fillStyle = i % 4 === 0 ? '#fef08a' : '#f59e0b';
          ctx.fillRect(mx, my, 3, 1.5);
        } else {
          const mx = Math.round(((mote.xFrac * this.viewW + Math.sin(nowMs * 0.004 * mote.speed + mote.seed) * 10) % this.viewW + this.viewW) % this.viewW);
          const my = Math.round(((mote.yFrac * this.viewH + Math.cos(nowMs * 0.003 * mote.speed + mote.seed) * 10) % this.viewH + this.viewH) % this.viewH);
          ctx.globalAlpha = twinkle > 0.55 ? 0.9 : 0.25;
          ctx.fillStyle = i % 3 === 0 ? '#38bdf8' : '#fde047';
          ctx.fillRect(mx, my, 2, 2);
          if (twinkle > 0.7) {
            ctx.fillRect(mx + 1, my - 2, 1, 2);
            ctx.fillRect(mx - 1, my + 2, 1, 2);
          }
        }
      } else if (biomeId === 'reef') {
        // Rising pearl bubbles & bioluminescent coral motes
        const mx = Math.round(((mote.xFrac * this.viewW + Math.sin(nowMs * 0.0019 * mote.speed + mote.seed) * 12) % this.viewW + this.viewW) % this.viewW);
        const my = Math.round(((mote.yFrac * this.viewH - nowMs * 0.0085 * mote.speed) % this.viewH + this.viewH) % this.viewH);
        ctx.globalAlpha = Math.min(1, twinkle * 0.9);
        ctx.fillStyle = i % 3 === 0 ? '#f472b6' : i % 3 === 1 ? '#67e8f9' : '#a5f3fc';
        ctx.fillRect(mx, my, 3, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mx, my, 1, 1);
      } else if (biomeId === 'ruins') {
        // Floating golden chrono dust & temple rune motes
        const mx = Math.round(((mote.xFrac * this.viewW + Math.sin(nowMs * 0.0013 * mote.speed + mote.seed) * 14) % this.viewW + this.viewW) % this.viewW);
        const my = Math.round(((mote.yFrac * this.viewH - nowMs * 0.005 * mote.speed + Math.cos(nowMs * 0.0016 + mote.seed) * 8) % this.viewH + this.viewH) % this.viewH);
        ctx.globalAlpha = twinkle * 0.38;
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(mx - 1, my - 1, 4, 4);
        ctx.globalAlpha = Math.min(1, twinkle + 0.15);
        ctx.fillStyle = i % 3 === 0 ? '#fef08a' : i % 3 === 1 ? '#fbbf24' : '#67e8f9';
        ctx.fillRect(mx, my, 2, 2);
      } else if (biomeId === 'rift') {
        // Prismatic rift starlight shards & nebula sparks
        const mx = Math.round(((mote.xFrac * this.viewW + Math.sin(nowMs * 0.0016 * mote.speed + mote.seed) * 16) % this.viewW + this.viewW) % this.viewW);
        const my = Math.round(((mote.yFrac * this.viewH - nowMs * 0.0055 * mote.speed + Math.cos(nowMs * 0.0019 + mote.seed) * 12) % this.viewH + this.viewH) % this.viewH);
        ctx.globalAlpha = Math.min(1, twinkle + 0.2);
        ctx.fillStyle = i % 3 === 0 ? '#e879f9' : i % 3 === 1 ? '#38bdf8' : '#fde047';
        ctx.fillRect(mx, my, 2, 2);
        if (twinkle > 0.6) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(mx - 1, my, 4, 1);
          ctx.fillRect(mx, my - 1, 1, 4);
        }
      } else if (biomeId === 'faeveldt') {
        // Pastel drifting fairy dust & pixie flower petals
        const mx = Math.round(((mote.xFrac * this.viewW + nowMs * 0.009 * mote.speed + Math.sin(nowMs * 0.002 + mote.seed) * 14) % this.viewW + this.viewW) % this.viewW);
        const my = Math.round(((mote.yFrac * this.viewH + Math.cos(nowMs * 0.0018 + mote.seed) * 10 + nowMs * 0.004 * mote.speed) % this.viewH + this.viewH) % this.viewH);
        ctx.globalAlpha = Math.min(1, twinkle + 0.15);
        ctx.fillStyle = i % 3 === 0 ? '#f9a8d4' : i % 3 === 1 ? '#c084fc' : '#a7f3d0';
        ctx.fillRect(mx, my, mote.variant === 0 ? 3 : 2, 2);
        if (twinkle > 0.68) {
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(mx, my, 1, 1);
        }
      } else if (biomeId === 'atoll') {
        // Warm sunburst lagoon sparkles & coral seafoam wisps
        const mx = Math.round(((mote.xFrac * this.viewW + Math.sin(nowMs * 0.002 * mote.speed + mote.seed) * 15) % this.viewW + this.viewW) % this.viewW);
        const my = Math.round(((mote.yFrac * this.viewH - nowMs * 0.007 * mote.speed) % this.viewH + this.viewH) % this.viewH);
        ctx.globalAlpha = Math.min(1, twinkle * 0.9);
        ctx.fillStyle = i % 3 === 0 ? '#fb923c' : i % 3 === 1 ? '#fef08a' : '#38bdf8';
        ctx.fillRect(mx, my, 3, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mx, my, 1, 1);
      } else if (biomeId === 'highlands') {
        // Crisp silver highland mist & sovereign wind glints
        const mx = Math.round(((mote.xFrac * this.viewW + nowMs * 0.017 * mote.speed) % this.viewW + this.viewW) % this.viewW);
        const my = Math.round(((mote.yFrac * this.viewH + Math.sin(nowMs * 0.0025 * mote.speed + mote.seed) * 7) % this.viewH + this.viewH) % this.viewH);
        ctx.globalAlpha = 0.45 + 0.4 * twinkle;
        ctx.fillStyle = i % 3 === 0 ? '#cbd5e1' : i % 3 === 1 ? '#67e8f9' : '#fde047';
        ctx.fillRect(mx, my, mote.variant === 0 ? 3 : 2, 1.5);
      } else if (biomeId === 'crater') {
        // Iridescent Terastal crystal motes & prism star sparkles
        const mx = Math.round(((mote.xFrac * this.viewW + Math.sin(nowMs * 0.0017 * mote.speed + mote.seed) * 14) % this.viewW + this.viewW) % this.viewW);
        const my = Math.round(((mote.yFrac * this.viewH - nowMs * 0.006 * mote.speed + Math.cos(nowMs * 0.002 + mote.seed) * 10) % this.viewH + this.viewH) % this.viewH);
        ctx.globalAlpha = Math.min(1, twinkle + 0.22);
        ctx.fillStyle = i % 3 === 0 ? '#38bdf8' : i % 3 === 1 ? '#f472b6' : '#fef08a';
        ctx.fillRect(mx, my, 2, 2);
        if (twinkle > 0.58) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(mx - 1, my, 4, 1);
          ctx.fillRect(mx, my - 1, 1, 4);
        }
      } else {
        // Peak snowflakes
        const mx = Math.round(((mote.xFrac * this.viewW + Math.sin(nowMs * 0.0015 * mote.speed + mote.seed) * 16) % this.viewW + this.viewW) % this.viewW);
        const my = Math.round(((mote.yFrac * this.viewH + nowMs * 0.013 * mote.speed) % this.viewH + this.viewH) % this.viewH);
        ctx.globalAlpha = Math.min(0.95, twinkle + 0.15);
        ctx.fillStyle = i % 3 === 0 ? '#a5f3fc' : i % 3 === 1 ? '#ffffff' : '#e0f2fe';
        ctx.fillRect(mx, my, Math.ceil(mote.size), Math.ceil(mote.size));
      }
    }
    ctx.restore();
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
    } else if (tileBiomeId === 'grove') {
      ctx.fillStyle = h > 0.5 ? '#26795d' : '#216c52';
      ctx.fillRect(sx, sy, ts, ts);
      if (h > 0.72) {
        ctx.fillStyle = '#339975';
        ctx.fillRect(sx + 6, sy + 10, 3, 2);
        ctx.fillRect(sx + 20, sy + 22, 3, 2);
      }
    } else if (tileBiomeId === 'desert') {
      ctx.fillStyle = h > 0.5 ? '#eab660' : '#e0a64b';
      ctx.fillRect(sx, sy, ts, ts);
      if (h > 0.68) {
        ctx.fillStyle = '#c88a32';
        ctx.fillRect(sx + 7, sy + 11, 3, 2);
        ctx.fillRect(sx + 21, sy + 22, 3, 2);
      }
    } else if (tileBiomeId === 'marsh') {
      ctx.fillStyle = h > 0.5 ? '#195449' : '#14473e';
      ctx.fillRect(sx, sy, ts, ts);
      if (h > 0.7) {
        ctx.fillStyle = '#2dd4bf';
        ctx.fillRect(sx + 8, sy + 12, 2, 2);
        ctx.fillRect(sx + 21, sy + 23, 2, 2);
      }
    } else if (tileBiomeId === 'sanctum') {
      ctx.fillStyle = h > 0.5 ? '#252158' : '#1e1b4b';
      ctx.fillRect(sx, sy, ts, ts);
      if (h > 0.7) {
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(sx + 6, sy + 9, 2, 2);
        ctx.fillRect(sx + 22, sy + 21, 2, 2);
      }
    } else if (tileBiomeId === 'canyon') {
      ctx.fillStyle = h > 0.5 ? '#cf8e3f' : '#c38134';
      ctx.fillRect(sx, sy, ts, ts);
      if (h > 0.68) {
        ctx.fillStyle = '#9a5a25';
        ctx.fillRect(sx + 7, sy + 10, 3, 2);
        ctx.fillRect(sx + 20, sy + 22, 3, 2);
      }
    } else if (tileBiomeId === 'reef') {
      ctx.fillStyle = h > 0.5 ? '#0e586d' : '#0b4b5d';
      ctx.fillRect(sx, sy, ts, ts);
      if (h > 0.7) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(sx + 7, sy + 11, 2, 2);
        ctx.fillRect(sx + 21, sy + 22, 2, 2);
      }
    } else if (tileBiomeId === 'ruins') {
      ctx.fillStyle = h > 0.5 ? '#5b442c' : '#4d3924';
      ctx.fillRect(sx, sy, ts, ts);
      if (h > 0.68) {
        ctx.fillStyle = '#b45309';
        ctx.fillRect(sx + 6, sy + 9, 3, 2);
        ctx.fillRect(sx + 22, sy + 22, 3, 2);
      }
    } else if (tileBiomeId === 'rift') {
      ctx.fillStyle = h > 0.5 ? '#1d1035' : '#160b29';
      ctx.fillRect(sx, sy, ts, ts);
      if (h > 0.68) {
        ctx.fillStyle = '#e879f9';
        ctx.fillRect(sx + 6, sy + 9, 2, 2);
        ctx.fillRect(sx + 22, sy + 21, 2, 2);
      }
    } else if (tileBiomeId === 'faeveldt') {
      ctx.fillStyle = h > 0.5 ? '#4c3a6e' : '#433262';
      ctx.fillRect(sx, sy, ts, ts);
      if (h > 0.7) {
        ctx.fillStyle = '#f9a8d4';
        ctx.fillRect(sx + 7, sy + 10, 2, 2);
        ctx.fillRect(sx + 21, sy + 22, 2, 2);
      }
    } else if (tileBiomeId === 'atoll') {
      ctx.fillStyle = h > 0.5 ? '#f5c77e' : '#eab96e';
      ctx.fillRect(sx, sy, ts, ts);
      if (h > 0.7) {
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(sx + 6, sy + 11, 2, 2);
        ctx.fillRect(sx + 22, sy + 22, 2, 2);
      }
    } else if (tileBiomeId === 'highlands') {
      ctx.fillStyle = h > 0.5 ? '#3b4a5e' : '#334155';
      ctx.fillRect(sx, sy, ts, ts);
      if (h > 0.7) {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(sx + 7, sy + 9, 3, 2);
        ctx.fillRect(sx + 21, sy + 22, 3, 2);
      }
    } else if (tileBiomeId === 'crater') {
      ctx.fillStyle = h > 0.5 ? '#132a46' : '#0f223a';
      ctx.fillRect(sx, sy, ts, ts);
      if (h > 0.68) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(sx + 6, sy + 9, 2, 2);
        ctx.fillRect(sx + 22, sy + 21, 2, 2);
      }
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
      ctx.fillStyle = tileBiomeId === 'volcano'
        ? '#3b1f1e'
        : tileBiomeId === 'marsh'
          ? '#0d4a44'
          : tileBiomeId === 'sanctum'
            ? '#1e1b4b'
            : '#f3d999';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tile === TILE.LAVA || tile === TILE.VOLCANO_FLOOR || tile === TILE.VOLCANO_PATH) {
      ctx.fillStyle = '#3b1f1e';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tile === TILE.ICE_WALL || tile === TILE.SNOW_GRASS || tile === TILE.SNOW_PATH) {
      ctx.fillStyle = '#dbeafe';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tile === TILE.DUNE_SAND || tile === TILE.DUNE_PATH || tile === TILE.SANDSTONE_WALL) {
      ctx.fillStyle = '#d99b42';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tile === TILE.MARSH_GRASS || tile === TILE.MARSH_PATH || tile === TILE.MARSH_WALL) {
      ctx.fillStyle = '#114239';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tile === TILE.SANCTUM_FLOOR || tile === TILE.SANCTUM_PATH || tile === TILE.SANCTUM_WALL) {
      ctx.fillStyle = '#1a1642';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tile === TILE.CANYON_GRASS || tile === TILE.CANYON_PATH || tile === TILE.CANYON_WALL) {
      ctx.fillStyle = '#b9772c';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tile === TILE.REEF_WATER || tile === TILE.REEF_PATH || tile === TILE.REEF_WALL) {
      ctx.fillStyle = '#073c56';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tile === TILE.RUINS_FLOOR || tile === TILE.RUINS_PATH || tile === TILE.RUINS_WALL) {
      ctx.fillStyle = '#4a3520';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tile === TILE.RIFT_FLOOR || tile === TILE.RIFT_PATH || tile === TILE.RIFT_WALL) {
      ctx.fillStyle = '#130924';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tile === TILE.FAE_GRASS || tile === TILE.FAE_PATH || tile === TILE.FAE_WALL) {
      ctx.fillStyle = '#382a54';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tile === TILE.ATOLL_SAND || tile === TILE.ATOLL_PATH || tile === TILE.ATOLL_WALL) {
      ctx.fillStyle = '#e7b36a';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tile === TILE.CROWN_GRASS || tile === TILE.CROWN_PATH || tile === TILE.CROWN_WALL) {
      ctx.fillStyle = '#293548';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tile === TILE.TERA_FLOOR || tile === TILE.TERA_PATH || tile === TILE.TERA_WALL) {
      ctx.fillStyle = '#0c1c33';
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
        if (tileBiomeId === 'grove') {
          ctx.fillStyle = '#f9a8d4';
          ctx.fillRect(sx + 9, sy + 8, 3, 3);
          ctx.fillRect(sx + 19, sy + 11, 3, 3);
          ctx.fillRect(sx + 14, sy + 16, 3, 2);
          ctx.fillStyle = '#fbcfe8';
          ctx.fillRect(sx + 13, sy + 6, 3, 2);
        }
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
        const overMarsh = tileBiomeId === 'marsh';
        const overSanctum = tileBiomeId === 'sanctum';
        ctx.fillStyle = overLava
          ? '#dc2626'
          : overMarsh
            ? '#0d5c56'
            : overSanctum
              ? '#1e1b4b'
              : '#0284c7';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = overLava
          ? '#44403c'
          : overSanctum
            ? '#4338ca'
            : overMarsh
              ? '#78350f'
              : '#92400e';
        ctx.fillRect(sx, sy + 2, ts, ts - 4);
        ctx.fillStyle = overLava
          ? '#57534e'
          : overSanctum
            ? '#6366f1'
            : overMarsh
              ? '#9a4d18'
              : '#b45309';
        for (let px = 2; px < ts; px += 8) {
          ctx.fillRect(sx + px, sy + 4, 6, ts - 8);
        }
        ctx.fillStyle = overLava
          ? '#fb923c'
          : overMarsh
            ? '#2dd4bf'
            : overSanctum
              ? '#fde047'
              : '#fde68a';
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
        ctx.fillStyle = tileBiomeId === 'volcano'
          ? '#fb923c'
          : tileBiomeId === 'grove'
            ? '#f472b6'
            : tileBiomeId === 'desert'
              ? '#fbbf24'
              : tileBiomeId === 'marsh'
                ? '#2dd4bf'
                : tileBiomeId === 'sanctum'
                  ? '#a78bfa'
                  : tileBiomeId === 'canyon'
                    ? '#fde047'
                    : tileBiomeId === 'reef'
                      ? '#67e8f9'
                      : tileBiomeId === 'ruins'
                        ? '#f59e0b'
                        : tileBiomeId === 'rift'
                          ? '#e879f9'
                          : tileBiomeId === 'faeveldt'
                            ? '#f9a8d4'
                            : tileBiomeId === 'atoll'
                              ? '#fb923c'
                              : tileBiomeId === 'highlands'
                                ? '#cbd5e1'
                                : tileBiomeId === 'crater'
                                  ? '#38bdf8'
                                  : '#38bdf8';
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
          : shrine?.id === 'thunder_shrine'
            ? '#fde047'
            : shrine?.id === 'starlight_shrine'
              ? '#f472b6'
              : shrine?.id === 'eclipse_shrine'
                ? '#e879f9'
                : shrine?.id === 'grove_shrine' || shrine?.biome === 'grove'
                  ? '#f472b6'
                  : shrine?.id === 'desert_shrine' || shrine?.biome === 'desert'
                    ? '#f59e0b'
                    : shrine?.id === 'marsh_shrine' || shrine?.biome === 'marsh'
                      ? '#2dd4bf'
                      : shrine?.id === 'sanctum_shrine' || shrine?.biome === 'sanctum'
                        ? '#a78bfa'
                        : shrine?.id === 'canyon_shrine' || shrine?.biome === 'canyon'
                          ? '#fde047'
                          : shrine?.id === 'reef_shrine' || shrine?.biome === 'reef'
                            ? '#38bdf8'
                              : shrine?.id === 'ruins_shrine' || shrine?.biome === 'ruins'
                                ? '#f59e0b'
                                : shrine?.id === 'rift_shrine' || shrine?.biome === 'rift'
                                  ? '#e879f9'
                                  : shrine?.id === 'faeveldt_shrine' || shrine?.biome === 'faeveldt'
                                    ? '#f9a8d4'
                                    : shrine?.id === 'atoll_shrine' || shrine?.biome === 'atoll'
                                      ? '#fb923c'
                                      : shrine?.id === 'highlands_shrine' || shrine?.biome === 'highlands'
                                        ? '#cbd5e1'
                                        : shrine?.id === 'crater_shrine' || shrine?.biome === 'crater'
                                          ? '#38bdf8'
                                          : shrine?.biome === 'forest'
                                            ? '#4ade80'
                                            : shrine?.biome === 'cave'
                                              ? '#c084fc'
                                              : shrine?.biome === 'volcano'
                                                ? '#fb7185'
                                                : shrine?.biome === 'peak'
                                                  ? '#67e8f9'
                                                  : '#38bdf8';
        if (cleared || shrine?.id === 'eclipse_shrine' || shrine?.id === 'grove_shrine' || shrine?.id === 'desert_shrine' || shrine?.id === 'marsh_shrine' || shrine?.id === 'sanctum_shrine' || shrine?.id === 'canyon_shrine' || shrine?.id === 'reef_shrine' || shrine?.id === 'ruins_shrine' || shrine?.id === 'rift_shrine' || shrine?.id === 'faeveldt_shrine' || shrine?.id === 'atoll_shrine' || shrine?.id === 'highlands_shrine' || shrine?.id === 'crater_shrine') {
          ctx.save();
          ctx.globalAlpha = 0.35 + 0.25 * Math.sin(nowMs * 0.007);
          ctx.strokeStyle = shrine?.id === 'eclipse_shrine' && !cleared
            ? '#c084fc'
            : shrine?.id === 'grove_shrine' && !cleared
              ? '#2dd4bf'
              : shrine?.id === 'desert_shrine' && !cleared
                ? '#fde047'
                : shrine?.id === 'marsh_shrine' && !cleared
                  ? '#a78bfa'
                  : shrine?.id === 'sanctum_shrine' && !cleared
                    ? '#38bdf8'
                    : shrine?.id === 'canyon_shrine' && !cleared
                      ? '#38bdf8'
                      : shrine?.id === 'reef_shrine' && !cleared
                        ? '#f472b6'
                        : shrine?.id === 'ruins_shrine' && !cleared
                          ? '#67e8f9'
                          : shrine?.id === 'rift_shrine' && !cleared
                            ? '#fde047'
                            : shrine?.id === 'faeveldt_shrine' && !cleared
                              ? '#a7f3d0'
                              : shrine?.id === 'atoll_shrine' && !cleared
                                ? '#fef08a'
                                : shrine?.id === 'highlands_shrine' && !cleared
                                  ? '#60a5fa'
                                  : shrine?.id === 'crater_shrine' && !cleared
                                    ? '#f472b6'
                                    : '#fef08a';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(sx + 16, sy + 9 + bob, 9, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        ctx.beginPath();
        ctx.arc(sx + 16, sy + 9 + bob, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shrine?.id === 'thunder_shrine' && !cleared
          ? '#38bdf8'
          : shrine?.id === 'eclipse_shrine' && !cleared
            ? '#312e81'
            : '#ffffff';
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

      case TILE.GROVE_GRASS: {
        ctx.fillStyle = '#157056';
        ctx.fillRect(sx + 1, sy + 1, ts - 2, ts - 2);
        const sway = Math.sin(nowMs * 0.0042 + tx * 0.75 + ty * 0.55) * 1.7;
        const rustle = this.rustleTile && this.rustleTile.x === tx && this.rustleTile.y === ty ? 3.2 : 0;
        ctx.fillStyle = '#34d399';
        for (let i = 0; i < 4; i++) {
          const bx = sx + 4 + i * 7;
          ctx.fillRect(bx + sway + (i % 2 ? rustle : -rustle), sy + 6, 4, 9);
          ctx.fillRect(bx - sway * 0.7, sy + 18, 4, 9);
        }
        ctx.fillStyle = '#065f46';
        ctx.fillRect(sx + 3, sy + 15, ts - 6, 2);
        ctx.fillStyle = h > 0.45 ? '#f9a8d4' : '#fbcfe8';
        ctx.fillRect(sx + 6 + sway * 0.4, sy + 8, 3, 3);
        ctx.fillRect(sx + 20 - sway * 0.4, sy + 20, 3, 3);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(sx + 7 + sway * 0.4, sy + 9, 1, 1);
        ctx.fillRect(sx + 21 - sway * 0.4, sy + 21, 1, 1);
        break;
      }

      case TILE.GROVE_PATH: {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = h > 0.5 ? '#e2e8f0' : '#dbeafe';
        ctx.fillRect(sx + 1, sy + 1, 14, 14);
        ctx.fillRect(sx + 17, sy + 17, 14, 14);
        ctx.fillStyle = h > 0.5 ? '#dbeafe' : '#e2e8f0';
        ctx.fillRect(sx + 17, sy + 1, 14, 14);
        ctx.fillRect(sx + 1, sy + 17, 14, 14);
        // Subtle starlight seam glint
        const glint = 0.35 + 0.3 * Math.sin(nowMs * 0.004 + tx * 0.9 + ty * 1.1);
        ctx.fillStyle = `rgba(103, 232, 249, ${glint.toFixed(2)})`;
        ctx.fillRect(sx + 15, sy + 3, 2, 26);
        ctx.fillRect(sx + 3, sy + 15, 26, 2);
        if (h > 0.65) {
          ctx.fillStyle = '#f5d0fe';
          ctx.fillRect(sx + 6, sy + 7, 3, 2);
        } else if (h < 0.35) {
          ctx.fillStyle = '#bae6fd';
          ctx.fillRect(sx + 22, sy + 23, 3, 2);
        }
        break;
      }

      case TILE.DUNE_SAND: {
        // Sunlit golden dune ripples (desert wild encounter tile)
        ctx.fillStyle = h > 0.5 ? '#e5a93b' : '#dc9b2e';
        ctx.fillRect(sx, sy, ts, ts);
        const shift = Math.sin(nowMs * 0.0035 + tx * 0.7 + ty * 0.4) * 1.4;
        const rustle = this.rustleTile && this.rustleTile.x === tx && this.rustleTile.y === ty ? 2.8 : 0;
        ctx.fillStyle = '#c27820';
        ctx.fillRect(sx + 2, sy + 9, 13, 3);
        ctx.fillRect(sx + 16, sy + 21, 13, 3);
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(sx + 4 + shift + rustle, sy + 7, 12, 3);
        ctx.fillRect(sx + 15 - shift - rustle, sy + 19, 12, 3);
        ctx.fillStyle = '#fffbeb';
        ctx.fillRect(sx + 7 + shift, sy + 7, 5, 1);
        ctx.fillRect(sx + 18 - shift, sy + 19, 5, 1);
        const glint = 0.45 + 0.45 * Math.sin(nowMs * 0.006 + tx * 1.3 + ty);
        ctx.globalAlpha = glint;
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(sx + 24, sy + 7, 2, 2);
        ctx.fillRect(sx + 6, sy + 24, 2, 2);
        ctx.globalAlpha = 1;
        break;
      }

      case TILE.DUNE_PATH: {
        // Sun-baked sandstone flagstones
        ctx.fillStyle = '#b45309';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = h > 0.5 ? '#f5d08a' : '#f1c273';
        ctx.fillRect(sx + 1, sy + 1, 14, 14);
        ctx.fillRect(sx + 17, sy + 17, 14, 14);
        ctx.fillStyle = h > 0.5 ? '#f1c273' : '#f5d08a';
        ctx.fillRect(sx + 17, sy + 1, 14, 14);
        ctx.fillRect(sx + 1, sy + 17, 14, 14);
        ctx.fillStyle = '#d97706';
        if (h > 0.4) ctx.fillRect(sx + 6, sy + 6, 3, 2);
        if (h < 0.65) ctx.fillRect(sx + 21, sy + 22, 3, 2);
        break;
      }

      case TILE.SANDSTONE_WALL: {
        // Stratified sandstone mesa cliff wall (solid)
        ctx.fillStyle = '#92400e';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(sx + 2, sy + 2, ts - 4, 8);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(sx + 4, sy + 3, 10, 4);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(sx + 2, sy + 10, ts - 4, 8);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(sx + 2, sy + 18, ts - 4, 9);
        ctx.fillStyle = '#451a03';
        ctx.fillRect(sx, sy + ts - 5, ts, 5);
        if (h > 0.7) {
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(sx + 20, sy + 13, 3, 3);
        }
        break;
      }

      case TILE.MARSH_GRASS: {
        // Glowing bioluminescent bayou turf (marsh wild encounter tile)
        ctx.fillStyle = '#0f5247';
        ctx.fillRect(sx + 1, sy + 1, ts - 2, ts - 2);
        const sway = Math.sin(nowMs * 0.0044 + tx * 0.7 + ty * 0.6) * 1.6;
        const rustle = this.rustleTile && this.rustleTile.x === tx && this.rustleTile.y === ty ? 3.2 : 0;
        ctx.fillStyle = '#2dd4bf';
        for (let i = 0; i < 4; i++) {
          const bx = sx + 4 + i * 7;
          ctx.fillRect(bx + sway + (i % 2 ? rustle : -rustle), sy + 6, 4, 9);
          ctx.fillRect(bx - sway * 0.7, sy + 18, 4, 9);
        }
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(sx + 3, sy + 15, ts - 6, 2);
        const sporePulse = 0.55 + 0.45 * Math.sin(nowMs * 0.005 + tx * 1.1 + ty * 0.9);
        ctx.globalAlpha = sporePulse;
        ctx.fillStyle = h > 0.5 ? '#c084fc' : '#5eead4';
        ctx.fillRect(sx + 6, sy + 8, 4, 3);
        ctx.fillRect(sx + 21, sy + 20, 4, 3);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(sx + 7, sy + 9, 2, 1);
        ctx.fillRect(sx + 22, sy + 21, 2, 1);
        ctx.globalAlpha = 1;
        break;
      }

      case TILE.MARSH_PATH: {
        // Mossy bayou stepping-stone & peat trail
        ctx.fillStyle = '#285249';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#52796f';
        ctx.fillRect(sx + 3, sy + 4, 12, 10);
        ctx.fillRect(sx + 16, sy + 16, 12, 11);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(sx + 5, sy + 6, 8, 6);
        ctx.fillRect(sx + 18, sy + 18, 8, 7);
        ctx.fillStyle = '#2dd4bf';
        if (h > 0.45) ctx.fillRect(sx + 4, sy + 22, 3, 2);
        if (h < 0.65) ctx.fillRect(sx + 22, sy + 7, 3, 2);
        break;
      }

      case TILE.MARSH_WALL: {
        // Ancient cypress tree & bioluminescent spore wall (solid)
        ctx.fillStyle = '#062c25';
        ctx.fillRect(sx + 2, sy + 3, ts - 4, ts - 5);
        ctx.fillStyle = '#5c3a28';
        ctx.fillRect(sx + 11, sy + 19, 10, 12);
        ctx.fillStyle = '#0f766e';
        ctx.beginPath();
        ctx.arc(sx + 16, sy + 14, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#14b8a6';
        ctx.beginPath();
        ctx.arc(sx + 13, sy + 11, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#34d399';
        ctx.fillRect(sx + 6, sy + 17, 2, 7);
        ctx.fillRect(sx + 24, sy + 16, 2, 8);
        const capGlow = 0.65 + 0.35 * Math.sin(nowMs * 0.0045 + tx + ty);
        ctx.globalAlpha = capGlow;
        ctx.fillStyle = h > 0.5 ? '#c084fc' : '#5eead4';
        ctx.fillRect(sx + 9, sy + 10, 4, 3);
        ctx.fillRect(sx + 18, sy + 13, 4, 3);
        ctx.globalAlpha = 1;
        break;
      }

      case TILE.SANCTUM_FLOOR: {
        // Cosmic rune marble encounter pad (sanctum wild encounter tile)
        ctx.fillStyle = h > 0.5 ? '#26205a' : '#1f1a4d';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.strokeStyle = '#4338ca';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 2, sy + 2, ts - 4, ts - 4);
        const rustle = this.rustleTile && this.rustleTile.x === tx && this.rustleTile.y === ty ? 0.35 : 0;
        const pulse = Math.min(1, 0.45 + 0.4 * Math.sin(nowMs * 0.005 + tx * 0.8 + ty * 0.7) + rustle);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = h > 0.5 ? '#a78bfa' : '#67e8f9';
        ctx.fillRect(sx + 10, sy + 15, 12, 2);
        ctx.fillRect(sx + 15, sy + 10, 2, 12);
        ctx.fillRect(sx + 12, sy + 12, 8, 8);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(sx + 15, sy + 15, 2, 2);
        ctx.globalAlpha = 1;
        break;
      }

      case TILE.SANCTUM_PATH: {
        // Polished astral sky marble & gold-inlay walkway
        ctx.fillStyle = '#4338ca';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = h > 0.5 ? '#e2e8f0' : '#ddd6fe';
        ctx.fillRect(sx + 1, sy + 1, 14, 14);
        ctx.fillRect(sx + 17, sy + 17, 14, 14);
        ctx.fillStyle = h > 0.5 ? '#ddd6fe' : '#e2e8f0';
        ctx.fillRect(sx + 17, sy + 1, 14, 14);
        ctx.fillRect(sx + 1, sy + 17, 14, 14);
        const glint = 0.45 + 0.35 * Math.sin(nowMs * 0.0045 + tx + ty);
        ctx.fillStyle = `rgba(250, 204, 21, ${glint.toFixed(2)})`;
        ctx.fillRect(sx + 15, sy + 2, 2, 28);
        ctx.fillRect(sx + 2, sy + 15, 28, 2);
        break;
      }

      case TILE.SANCTUM_WALL: {
        // Ornate indigo & gold Astral Citadel pillar parapet (solid)
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#312e81';
        ctx.fillRect(sx + 2, sy + 2, ts - 4, ts - 6);
        ctx.fillStyle = '#4f46e5';
        ctx.fillRect(sx + 4, sy + 4, ts - 8, 12);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(sx + 2, sy + 2, ts - 4, 2);
        ctx.fillRect(sx + 2, sy + 16, ts - 4, 2);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(sx + 14, sy + 8, 4, 4);
        const coreGlow = 0.55 + 0.45 * Math.sin(nowMs * 0.0055 + tx + ty);
        ctx.globalAlpha = coreGlow;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(sx + 15, sy + 9, 2, 2);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(sx, sy + ts - 4, ts, 4);
        break;
      }

      case TILE.CANYON_GRASS: {
        // Golden savannah grass with swaying ochre blades & static electric sparks
        ctx.fillStyle = h > 0.5 ? '#a16207' : '#854d0e';
        ctx.fillRect(sx + 1, sy + 1, ts - 2, ts - 2);
        const sway = Math.sin(nowMs * 0.0048 + tx * 0.75 + ty * 0.5) * 1.8;
        const rustle = this.rustleTile && this.rustleTile.x === tx && this.rustleTile.y === ty ? 3.2 : 0;
        ctx.fillStyle = '#eab308';
        for (let i = 0; i < 4; i++) {
          const bx = sx + 4 + i * 7;
          ctx.fillRect(bx + sway + (i % 2 ? rustle : -rustle), sy + 6, 4, 10);
          ctx.fillRect(bx - sway * 0.7, sy + 18, 4, 10);
        }
        ctx.fillStyle = '#fde047';
        for (let i = 0; i < 4; i++) {
          const bx = sx + 5 + i * 7;
          ctx.fillRect(bx + sway * 1.1, sy + 6, 2, 4);
        }
        const spark = 0.35 + 0.65 * Math.sin(nowMs * 0.009 + tx * 1.9 + ty * 1.1);
        if (spark > 0.72) {
          ctx.globalAlpha = spark;
          ctx.fillStyle = h > 0.5 ? '#38bdf8' : '#fef08a';
          ctx.fillRect(sx + 8, sy + 10, 2, 2);
          ctx.fillRect(sx + 21, sy + 20, 2, 2);
          ctx.globalAlpha = 1;
        }
        break;
      }

      case TILE.CANYON_PATH: {
        // Warm terracotta mesa trail with weathered sandstone pebbles
        ctx.fillStyle = '#9a5a25';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = h > 0.5 ? '#d9924c' : '#cd833e';
        ctx.fillRect(sx + 1, sy + 1, 14, 14);
        ctx.fillRect(sx + 17, sy + 17, 14, 14);
        ctx.fillStyle = h > 0.5 ? '#cd833e' : '#d9924c';
        ctx.fillRect(sx + 17, sy + 1, 14, 14);
        ctx.fillRect(sx + 1, sy + 17, 14, 14);
        ctx.fillStyle = '#7c3f12';
        if (h > 0.45) ctx.fillRect(sx + 6, sy + 7, 4, 3);
        if (h < 0.65) ctx.fillRect(sx + 20, sy + 21, 5, 3);
        break;
      }

      case TILE.CANYON_WALL: {
        // Stratified red-ochre canyon mesa wall with fulgurite thunder crystal veins (solid)
        ctx.fillStyle = '#7c2d12';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(sx + 2, sy + 2, ts - 4, 7);
        ctx.fillStyle = '#c2410c';
        ctx.fillRect(sx + 2, sy + 9, ts - 4, 9);
        ctx.fillStyle = '#9a3412';
        ctx.fillRect(sx + 2, sy + 18, ts - 4, 9);
        ctx.fillStyle = '#431407';
        ctx.fillRect(sx, sy + ts - 5, ts, 5);
        if (h > 0.6) {
          ctx.fillStyle = '#fde047';
          ctx.fillRect(sx + 9, sy + 10, 2, 5);
          ctx.fillRect(sx + 11, sy + 13, 3, 2);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(sx + 10, sy + 12, 1, 2);
        }
        break;
      }

      case TILE.REEF_WATER: {
        // Shimmering abyssal pearl-coral trench water (reef wild encounter tile)
        ctx.fillStyle = '#0369a1';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(sx + 2, sy + 2, ts - 4, ts - 4);
        const wave = Math.sin(nowMs * 0.0046 + tx * 0.9 + ty * 0.7) * 2.2;
        const rustle = this.rustleTile && this.rustleTile.x === tx && this.rustleTile.y === ty ? 2.5 : 0;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(sx + 5 + wave + rustle, sy + 8, 10, 3);
        ctx.fillRect(sx + 14 - wave - rustle, sy + 21, 11, 3);
        // Coral polyps & pearl glints
        ctx.fillStyle = h > 0.5 ? '#f472b6' : '#2dd4bf';
        ctx.fillRect(sx + 6, sy + 16, 4, 4);
        ctx.fillRect(sx + 22, sy + 10, 4, 4);
        const glint = 0.5 + 0.5 * Math.sin(nowMs * 0.006 + tx * 1.4 + ty);
        ctx.globalAlpha = glint;
        ctx.fillStyle = '#ecfeff';
        ctx.fillRect(sx + 7, sy + 17, 2, 2);
        ctx.fillRect(sx + 23, sy + 11, 2, 2);
        ctx.globalAlpha = 1;
        break;
      }

      case TILE.REEF_PATH: {
        // Iridescent mother-of-pearl coral boardwalk
        ctx.fillStyle = '#0e7490';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = h > 0.5 ? '#e0f2fe' : '#bae6fd';
        ctx.fillRect(sx + 1, sy + 1, ts - 2, ts - 2);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(sx + 3, sy + 3, 12, 12);
        ctx.fillRect(sx + 17, sy + 17, 12, 12);
        ctx.fillStyle = '#fbcfe8';
        ctx.fillRect(sx + 17, sy + 3, 12, 12);
        ctx.fillRect(sx + 3, sy + 17, 12, 12);
        ctx.fillStyle = '#67e8f9';
        ctx.fillRect(sx + 15, sy + 2, 2, 28);
        ctx.fillRect(sx + 2, sy + 15, 28, 2);
        break;
      }

      case TILE.REEF_WALL: {
        // Deep indigo trench rock wall studded with glowing coral fans (solid)
        ctx.fillStyle = '#082f49';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#0c4a6e';
        ctx.fillRect(sx + 2, sy + 2, ts - 4, 14);
        ctx.fillStyle = '#155e75';
        ctx.fillRect(sx + 4, sy + 5, ts - 8, 8);
        ctx.fillStyle = '#041b2d';
        ctx.fillRect(sx, sy + ts - 4, ts, 4);
        ctx.fillStyle = h > 0.5 ? '#fb7185' : '#22d3ee';
        ctx.fillRect(sx + 6, sy + 8, 5, 6);
        ctx.fillRect(sx + 20, sy + 10, 5, 6);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(sx + 8, sy + 9, 2, 2);
        ctx.fillRect(sx + 21, sy + 11, 2, 2);
        break;
      }

      case TILE.RUINS_FLOOR: {
        // Carved amber clockwork temple rune slab (ruins wild encounter tile)
        ctx.fillStyle = h > 0.5 ? '#4a3520' : '#3f2d1b';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 2, sy + 2, ts - 4, ts - 4);
        const rustle = this.rustleTile && this.rustleTile.x === tx && this.rustleTile.y === ty ? 0.35 : 0;
        const pulse = Math.min(1, 0.48 + 0.42 * Math.sin(nowMs * 0.005 + tx * 0.8 + ty * 0.6) + rustle);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = h > 0.5 ? '#f59e0b' : '#fbbf24';
        ctx.fillRect(sx + 9, sy + 15, 14, 2);
        ctx.fillRect(sx + 15, sy + 9, 2, 14);
        ctx.strokeStyle = '#fcd34d';
        ctx.strokeRect(sx + 11, sy + 11, 10, 10);
        ctx.fillStyle = '#67e8f9';
        ctx.fillRect(sx + 15, sy + 15, 2, 2);
        ctx.globalAlpha = 1;
        break;
      }

      case TILE.RUINS_PATH: {
        // Ancient bronze-and-limestone temple flagstones with gold gear inlay
        ctx.fillStyle = '#92400e';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = h > 0.5 ? '#e7c68b' : '#d8b272';
        ctx.fillRect(sx + 1, sy + 1, 14, 14);
        ctx.fillRect(sx + 17, sy + 17, 14, 14);
        ctx.fillStyle = h > 0.5 ? '#d8b272' : '#e7c68b';
        ctx.fillRect(sx + 17, sy + 1, 14, 14);
        ctx.fillRect(sx + 1, sy + 17, 14, 14);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(sx + 15, sy + 2, 2, 28);
        ctx.fillRect(sx + 2, sy + 15, 28, 2);
        break;
      }

      case TILE.RUINS_WALL: {
        // Weathered sandstone & bronze clockwork temple wall (solid)
        ctx.fillStyle = '#451a03';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(sx + 2, sy + 2, ts - 4, ts - 6);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(sx + 4, sy + 4, ts - 8, 12);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(sx + 2, sy + 2, ts - 4, 2);
        ctx.fillRect(sx + 2, sy + 16, ts - 4, 2);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(sx + 13, sy + 8, 6, 4);
        ctx.fillStyle = '#67e8f9';
        ctx.fillRect(sx + 15, sy + 9, 2, 2);
        ctx.fillStyle = '#290f02';
        ctx.fillRect(sx, sy + ts - 4, ts, 4);
        break;
      }

      case TILE.RIFT_FLOOR: {
        // Starry obsidian nebula floor with prismatic cracks (rift wild encounter tile)
        ctx.fillStyle = h > 0.5 ? '#1a0c30' : '#130824';
        ctx.fillRect(sx, sy, ts, ts);
        const rustle = this.rustleTile && this.rustleTile.x === tx && this.rustleTile.y === ty ? 0.35 : 0;
        const glow = Math.min(1, 0.5 + 0.45 * Math.sin(nowMs * 0.006 + tx * 0.9 + ty * 0.8) + rustle);
        ctx.globalAlpha = glow;
        ctx.fillStyle = h > 0.5 ? '#e879f9' : '#38bdf8';
        ctx.fillRect(sx + 6, sy + 14, 20, 2);
        ctx.fillRect(sx + 15, sy + 6, 2, 20);
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(sx + 11, sy + 11, 10, 10);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(sx + 14, sy + 14, 4, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + 5, sy + 6, 2, 2);
        ctx.fillRect(sx + 25, sy + 24, 2, 2);
        ctx.globalAlpha = 1;
        break;
      }

      case TILE.RIFT_PATH: {
        // Prismatic crystalline star-bridge walkway
        ctx.fillStyle = '#581c87';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = h > 0.5 ? '#c4b5fd' : '#e9d5ff';
        ctx.fillRect(sx + 1, sy + 1, 14, 14);
        ctx.fillRect(sx + 17, sy + 17, 14, 14);
        ctx.fillStyle = h > 0.5 ? '#fbcfe8' : '#bae6fd';
        ctx.fillRect(sx + 17, sy + 1, 14, 14);
        ctx.fillRect(sx + 1, sy + 17, 14, 14);
        const shimmer = 0.55 + 0.4 * Math.sin(nowMs * 0.0055 + tx + ty);
        ctx.fillStyle = `rgba(232, 121, 249, ${shimmer.toFixed(2)})`;
        ctx.fillRect(sx + 15, sy + 2, 2, 28);
        ctx.fillRect(sx + 2, sy + 15, 28, 2);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(sx + 14, sy + 14, 4, 4);
        break;
      }

      case TILE.RIFT_WALL: {
        // Faceted prismatic obsidian crystal spire wall (solid)
        ctx.fillStyle = '#090514';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#3b0764';
        ctx.fillRect(sx + 2, sy + 2, ts - 4, ts - 6);
        ctx.fillStyle = '#7e22ce';
        ctx.fillRect(sx + 5, sy + 4, ts - 10, 14);
        const facetGlow = 0.6 + 0.4 * Math.sin(nowMs * 0.006 + tx * 1.2 + ty);
        ctx.globalAlpha = facetGlow;
        ctx.fillStyle = h > 0.5 ? '#e879f9' : '#22d3ee';
        ctx.fillRect(sx + 8, sy + 6, 6, 8);
        ctx.fillRect(sx + 18, sy + 8, 5, 7);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + 10, sy + 7, 2, 3);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#020617';
        ctx.fillRect(sx, sy + ts - 4, ts, 4);
        break;
      }

      case TILE.FAE_GRASS: {
        // Luminous pastel fae meadow turf with glowing fairy blossoms (faeveldt wild encounter tile)
        ctx.fillStyle = h > 0.5 ? '#352957' : '#2e224d';
        ctx.fillRect(sx + 1, sy + 1, ts - 2, ts - 2);
        const sway = Math.sin(nowMs * 0.0044 + tx * 0.8 + ty * 0.55) * 1.7;
        const rustle = this.rustleTile && this.rustleTile.x === tx && this.rustleTile.y === ty ? 3.2 : 0;
        ctx.fillStyle = '#6ee7b7';
        for (let i = 0; i < 4; i++) {
          const bx = sx + 4 + i * 7;
          ctx.fillRect(bx + sway + (i % 2 ? rustle : -rustle), sy + 6, 4, 9);
          ctx.fillRect(bx - sway * 0.7, sy + 18, 4, 9);
        }
        const bloom = 0.6 + 0.4 * Math.sin(nowMs * 0.0055 + tx + ty);
        ctx.globalAlpha = bloom;
        ctx.fillStyle = h > 0.5 ? '#f9a8d4' : '#e879f9';
        ctx.fillRect(sx + 6 + sway * 0.4, sy + 8, 4, 3);
        ctx.fillRect(sx + 20 - sway * 0.4, sy + 20, 4, 3);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(sx + 7 + sway * 0.4, sy + 9, 2, 1);
        ctx.fillRect(sx + 21 - sway * 0.4, sy + 21, 2, 1);
        ctx.globalAlpha = 1;
        break;
      }

      case TILE.FAE_PATH: {
        // Rose-quartz & moonstone glade flagstones
        ctx.fillStyle = '#831843';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = h > 0.5 ? '#fce7f3' : '#fbcfe8';
        ctx.fillRect(sx + 1, sy + 1, 14, 14);
        ctx.fillRect(sx + 17, sy + 17, 14, 14);
        ctx.fillStyle = h > 0.5 ? '#f5d0fe' : '#e9d5ff';
        ctx.fillRect(sx + 17, sy + 1, 14, 14);
        ctx.fillRect(sx + 1, sy + 17, 14, 14);
        const glint = 0.4 + 0.35 * Math.sin(nowMs * 0.0045 + tx + ty);
        ctx.fillStyle = `rgba(244, 114, 182, ${glint.toFixed(2)})`;
        ctx.fillRect(sx + 15, sy + 2, 2, 28);
        ctx.fillRect(sx + 2, sy + 15, 28, 2);
        break;
      }

      case TILE.FAE_WALL: {
        // Luminous pastel-blossom Faeveldt tree canopy wall (solid)
        ctx.fillStyle = '#2e1065';
        ctx.fillRect(sx + 2, sy + 3, ts - 4, ts - 5);
        ctx.fillStyle = '#831843';
        ctx.fillRect(sx + 12, sy + 20, 8, 10);
        ctx.fillStyle = '#db2777';
        ctx.beginPath();
        ctx.arc(sx + 16, sy + 14, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f9a8d4';
        ctx.beginPath();
        ctx.arc(sx + 13, sy + 11, 7, 0, Math.PI * 2);
        ctx.fill();
        const faeGlow = 0.65 + 0.35 * Math.sin(nowMs * 0.005 + tx + ty);
        ctx.globalAlpha = faeGlow;
        ctx.fillStyle = '#a7f3d0';
        ctx.fillRect(sx + 9, sy + 9, 3, 3);
        ctx.fillRect(sx + 20, sy + 13, 3, 3);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(sx + 15, sy + 7, 2, 2);
        ctx.globalAlpha = 1;
        break;
      }

      case TILE.ATOLL_SAND: {
        // Sunlit warm coral Alola beach sand with hibiscus petals (atoll wild encounter tile)
        ctx.fillStyle = h > 0.5 ? '#f5b963' : '#eba94f';
        ctx.fillRect(sx, sy, ts, ts);
        const shift = Math.sin(nowMs * 0.0038 + tx * 0.7 + ty * 0.5) * 1.4;
        const rustle = this.rustleTile && this.rustleTile.x === tx && this.rustleTile.y === ty ? 2.8 : 0;
        ctx.fillStyle = '#d97706';
        ctx.fillRect(sx + 3, sy + 10, 12, 2);
        ctx.fillRect(sx + 17, sy + 22, 12, 2);
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(sx + 5 + shift + rustle, sy + 8, 11, 3);
        ctx.fillRect(sx + 15 - shift - rustle, sy + 19, 11, 3);
        ctx.fillStyle = h > 0.5 ? '#fb7185' : '#38bdf8';
        ctx.fillRect(sx + 8, sy + 14, 4, 3);
        ctx.fillRect(sx + 22, sy + 8, 4, 3);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(sx + 9, sy + 15, 2, 1);
        break;
      }

      case TILE.ATOLL_PATH: {
        // Tropical sunlit palmwood & shell boardwalk
        ctx.fillStyle = '#9a3412';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#d97706';
        for (let py = 2; py < ts; py += 8) {
          ctx.fillRect(sx + 2, sy + py, ts - 4, 6);
        }
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(sx + 2, sy + 2, 2, ts - 4);
        ctx.fillRect(sx + ts - 4, sy + 2, 2, ts - 4);
        if (h > 0.6) {
          ctx.fillStyle = '#fbcfe8';
          ctx.fillRect(sx + 14, sy + 13, 4, 3);
        }
        break;
      }

      case TILE.ATOLL_WALL: {
        // Tropical basalt & palm-canopy sea cliff studded with sunlit coral (solid)
        ctx.fillStyle = '#7c2d12';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#9a3412';
        ctx.fillRect(sx + 2, sy + 4, ts - 4, 16);
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(sx + 16, sy + 10, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(sx + 6, sy + 6, 8, 4);
        ctx.fillRect(sx + 18, sy + 6, 8, 4);
        ctx.fillStyle = '#fb7185';
        ctx.fillRect(sx + 10, sy + 17, 4, 4);
        ctx.fillRect(sx + 20, sy + 18, 4, 4);
        ctx.fillStyle = '#431407';
        ctx.fillRect(sx, sy + ts - 4, ts, 4);
        break;
      }

      case TILE.CROWN_GRASS: {
        // Highland slate-emerald heather turf with silver thistles (highlands wild encounter tile)
        ctx.fillStyle = h > 0.5 ? '#1e4e4a' : '#19423f';
        ctx.fillRect(sx + 1, sy + 1, ts - 2, ts - 2);
        const sway = Math.sin(nowMs * 0.0046 + tx * 0.75 + ty * 0.5) * 1.7;
        const rustle = this.rustleTile && this.rustleTile.x === tx && this.rustleTile.y === ty ? 3.2 : 0;
        ctx.fillStyle = '#2dd4bf';
        for (let i = 0; i < 4; i++) {
          const bx = sx + 4 + i * 7;
          ctx.fillRect(bx + sway + (i % 2 ? rustle : -rustle), sy + 6, 4, 10);
          ctx.fillRect(bx - sway * 0.7, sy + 18, 4, 10);
        }
        ctx.fillStyle = h > 0.5 ? '#c084fc' : '#e2e8f0';
        ctx.fillRect(sx + 6 + sway * 0.4, sy + 7, 3, 3);
        ctx.fillRect(sx + 21 - sway * 0.4, sy + 19, 3, 3);
        break;
      }

      case TILE.CROWN_PATH: {
        // Dressed Highland slate flagstones with forged iron-gold trim
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = h > 0.5 ? '#64748b' : '#475569';
        ctx.fillRect(sx + 1, sy + 1, 14, 14);
        ctx.fillRect(sx + 17, sy + 17, 14, 14);
        ctx.fillStyle = h > 0.5 ? '#475569' : '#64748b';
        ctx.fillRect(sx + 17, sy + 1, 14, 14);
        ctx.fillRect(sx + 1, sy + 17, 14, 14);
        ctx.fillStyle = 'rgba(250, 204, 21, 0.42)';
        ctx.fillRect(sx + 15, sy + 2, 2, 28);
        ctx.fillRect(sx + 2, sy + 15, 28, 2);
        break;
      }

      case TILE.CROWN_WALL: {
        // Iron Crown slate bastion & shield-emblem parapet (solid)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#334155';
        ctx.fillRect(sx + 2, sy + 2, ts - 4, ts - 6);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(sx + 4, sy + 4, ts - 8, 12);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(sx + 2, sy + 2, ts - 4, 2);
        ctx.fillRect(sx + 13, sy + 7, 6, 7);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(sx + 15, sy + 9, 2, 3);
        ctx.fillStyle = '#020617';
        ctx.fillRect(sx, sy + ts - 4, ts, 4);
        break;
      }

      case TILE.TERA_FLOOR: {
        // Deep Area Zero crystal cavern floor with iridescent diamond prisms (crater wild encounter tile)
        ctx.fillStyle = h > 0.5 ? '#0f2544' : '#0b1d38';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.strokeStyle = '#1e40af';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 2, sy + 2, ts - 4, ts - 4);
        const rustle = this.rustleTile && this.rustleTile.x === tx && this.rustleTile.y === ty ? 0.35 : 0;
        const glow = Math.min(1, 0.5 + 0.45 * Math.sin(nowMs * 0.006 + tx * 0.9 + ty * 0.8) + rustle);
        ctx.globalAlpha = glow;
        ctx.fillStyle = h > 0.5 ? '#38bdf8' : '#f472b6';
        ctx.fillRect(sx + 12, sy + 8, 8, 16);
        ctx.fillRect(sx + 8, sy + 12, 16, 8);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(sx + 13, sy + 13, 6, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + 15, sy + 15, 2, 2);
        ctx.globalAlpha = 1;
        break;
      }

      case TILE.TERA_PATH: {
        // Iridescent Terastal crystal bridge & refracting walkway
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = h > 0.5 ? '#bae6fd' : '#e0f2fe';
        ctx.fillRect(sx + 1, sy + 1, 14, 14);
        ctx.fillRect(sx + 17, sy + 17, 14, 14);
        ctx.fillStyle = h > 0.5 ? '#fbcfe8' : '#fef08a';
        ctx.fillRect(sx + 17, sy + 1, 14, 14);
        ctx.fillRect(sx + 1, sy + 17, 14, 14);
        const shimmer = 0.55 + 0.4 * Math.sin(nowMs * 0.0055 + tx + ty);
        ctx.fillStyle = `rgba(56, 189, 248, ${shimmer.toFixed(2)})`;
        ctx.fillRect(sx + 15, sy + 2, 2, 28);
        ctx.fillRect(sx + 2, sy + 15, 28, 2);
        break;
      }

      case TILE.TERA_WALL: {
        // Faceted iridescent Terastal crystal monolith wall (solid)
        ctx.fillStyle = '#081426';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(sx + 2, sy + 2, ts - 4, ts - 6);
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(sx + 5, sy + 4, ts - 10, 14);
        const facet = 0.6 + 0.4 * Math.sin(nowMs * 0.006 + tx * 1.1 + ty);
        ctx.globalAlpha = facet;
        ctx.fillStyle = h > 0.5 ? '#67e8f9' : '#f472b6';
        ctx.fillRect(sx + 8, sy + 6, 6, 9);
        ctx.fillRect(sx + 18, sy + 8, 5, 7);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + 10, sy + 7, 2, 3);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#020617';
        ctx.fillRect(sx, sy + ts - 4, ts, 4);
        break;
      }

      default:
        break;
    }
  }

  drawRarePatchOverlay(ctx, sx, sy, nowMs) {
    const ts = this.tileSize;
    const pulse = 0.55 + 0.45 * Math.sin(nowMs * 0.01);
    const aurora = 0.5 + 0.5 * Math.cos(nowMs * 0.007 + sx * 0.05);
    ctx.save();
    ctx.fillStyle = `rgba(103, 232, 249, ${(0.08 + aurora * 0.1).toFixed(2)})`;
    ctx.fillRect(sx + 3, sy + 3, ts - 6, ts - 6);

    ctx.strokeStyle = `rgba(250, 204, 21, ${(0.55 + pulse * 0.42).toFixed(2)})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 2, sy + 2, ts - 4, ts - 4);

    // Subtle aurora corner glints
    ctx.fillStyle = `rgba(103, 232, 249, ${(0.45 + aurora * 0.45).toFixed(2)})`;
    ctx.fillRect(sx + 2, sy + 2, 3, 3);
    ctx.fillRect(sx + ts - 5, sy + 2, 3, 3);

    // Shimmering gold & aurora star sparkles dancing over the rustling patch
    const sparkleColors = ['#fef08a', '#67e8f9', '#ffffff', '#e879f9'];
    for (let i = 0; i < 4; i++) {
      const phase = nowMs * 0.0065 + i * 1.65;
      const rx = Math.round(sx + 7 + ((i * 7 + Math.sin(phase) * 4) % 18));
      const ry = Math.round(sy + 20 - Math.abs(Math.cos(phase * 1.15)) * 15);
      ctx.fillStyle = sparkleColors[i];
      ctx.fillRect(rx - 1, ry, 3, 1);
      ctx.fillRect(rx, ry - 1, 1, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rx, ry, 1, 1);
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
    } else if (landmark.id === 'landmark_starlight_forge') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 27, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.fillRect(sx + 8, sy + 21, 16, 6);
      ctx.fillStyle = '#4338ca';
      ctx.fillRect(sx + 11, sy + 10, 10, 12);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(sx + 13, sy + 6, 6, 11);
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(sx + 15, sy + 3, 2, 8);
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(sx + 10, sy + 13, 2, 2);
      ctx.fillRect(sx + 20, sy + 11, 2, 2);
    } else if (landmark.id === 'landmark_eclipse_monolith') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.32)';
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 27, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#312e81';
      ctx.fillRect(sx + 9, sy + 19, 14, 8);
      ctx.fillStyle = '#581c87';
      ctx.fillRect(sx + 11, sy + 9, 10, 12);
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(sx + 13, sy + 6, 6, 6);
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#fde047';
      ctx.fillRect(sx + 15, sy + 11, 2, 5);
      ctx.fillStyle = '#e879f9';
      ctx.fillRect(sx + 14, sy + 7, 3, 2);
    } else if (landmark.id === 'landmark_sakura_arbor') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 27, 11, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.fillRect(sx + 5, sy + 11, 4, 16);
      ctx.fillRect(sx + 23, sy + 11, 4, 16);
      ctx.fillRect(sx + 4, sy + 6, 24, 5);
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(sx + 5, sy + 4, 22, 5);
      ctx.fillStyle = '#fbcfe8';
      ctx.fillRect(sx + 8, sy + 3, 7, 4);
      ctx.fillRect(sx + 18, sy + 4, 7, 4);
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(sx + 14, sy + 12, 4, 4);
    } else if (landmark.id === 'landmark_astral_sundial') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 27, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(sx + 7, sy + 20, 18, 6);
      ctx.fillStyle = '#0f766e';
      ctx.fillRect(sx + 10, sy + 14, 12, 7);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(sx + 11, sy + 12, 10, 2);
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#2dd4bf';
      ctx.fillRect(sx + 14, sy + 6, 4, 7);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx + 15, sy + 7, 2, 3);
    } else if (landmark.id === 'landmark_sunstone_obelisk') {
      ctx.fillStyle = 'rgba(69, 26, 3, 0.3)';
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 27, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#92400e';
      ctx.fillRect(sx + 8, sy + 21, 16, 6);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(sx + 11, sy + 11, 10, 11);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(sx + 13, sy + 6, 6, 6);
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(sx + 14, sy + 3, 4, 7);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx + 15, sy + 4, 2, 3);
    } else if (landmark.id === 'landmark_glowspore_lantern') {
      ctx.fillStyle = 'rgba(6, 44, 37, 0.32)';
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 27, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(sx + 13, sy + 15, 6, 12);
      ctx.fillStyle = '#0f766e';
      ctx.fillRect(sx + 6, sy + 8, 20, 8);
      ctx.fillStyle = '#2dd4bf';
      ctx.fillRect(sx + 8, sy + 5, 16, 5);
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(sx + 10, sy + 9, 4, 3);
      ctx.fillRect(sx + 19, sy + 10, 4, 3);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(sx + 15, sy + 7, 3, 3);
    } else if (landmark.id === 'landmark_astral_orrery') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.32)';
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 27, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#312e81';
      ctx.fillRect(sx + 8, sy + 20, 16, 6);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(sx + 14, sy + 14, 4, 7);
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 11, 10, 4, -0.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 11, 10, 4, 0.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#67e8f9';
      ctx.beginPath();
      ctx.arc(sx + 16, sy + 11, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (landmark.id === 'landmark_canyon_spire') {
      ctx.fillStyle = 'rgba(67, 20, 7, 0.32)';
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 27, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9a3412';
      ctx.fillRect(sx + 8, sy + 20, 16, 6);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(sx + 11, sy + 11, 10, 10);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(sx + 13, sy + 5, 6, 7);
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(sx + 14, sy + 2, 4, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx + 15, sy + 3, 2, 2);
    } else if (landmark.id === 'landmark_pearl_trench') {
      ctx.fillStyle = 'rgba(8, 47, 73, 0.34)';
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 27, 11, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(sx + 5, sy + 11, 5, 15);
      ctx.fillRect(sx + 22, sy + 11, 5, 15);
      ctx.fillRect(sx + 7, sy + 6, 18, 6);
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(sx + 9, sy + 8, 14, 2);
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(sx + 16, sy + 16, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (landmark.id === 'landmark_chrono_sundial') {
      ctx.fillStyle = 'rgba(69, 26, 3, 0.32)';
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 27, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.fillRect(sx + 7, sy + 20, 18, 6);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(sx + 10, sy + 12, 12, 9);
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(sx + 16, sy + 12, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(sx + 15, sy + 7, 2, 6);
      ctx.fillRect(sx + 16, sy + 11, 5, 2);
    } else if (landmark.id === 'landmark_rift_nexus') {
      ctx.fillStyle = 'rgba(9, 5, 20, 0.36)';
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 27, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3b0764';
      ctx.fillRect(sx + 9, sy + 19, 14, 7);
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(sx + 12, sy + 9, 8, 11);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 11, 10, 4, -0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#e879f9';
      ctx.beginPath();
      ctx.arc(sx + 16, sy + 11, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(sx + 15, sy + 10, 2, 2);
    } else if (landmark.id === 'landmark_faeveldt_arch') {
      ctx.fillStyle = 'rgba(46, 16, 101, 0.28)';
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 27, 11, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#db2777';
      ctx.fillRect(sx + 5, sy + 11, 5, 15);
      ctx.fillRect(sx + 22, sy + 11, 5, 15);
      ctx.fillRect(sx + 7, sy + 6, 18, 6);
      ctx.fillStyle = '#fbcfe8';
      ctx.fillRect(sx + 9, sy + 7, 14, 3);
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#a7f3d0';
      ctx.fillRect(sx + 14, sy + 14, 4, 4);
    } else if (landmark.id === 'landmark_atoll_altar') {
      ctx.fillStyle = 'rgba(124, 45, 18, 0.28)';
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 27, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d97706';
      ctx.fillRect(sx + 7, sy + 20, 18, 6);
      ctx.fillStyle = '#fb923c';
      ctx.fillRect(sx + 10, sy + 13, 12, 8);
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(sx + 16, sy + 10, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(sx + 15, sy + 16, 2, 3);
    } else if (landmark.id === 'landmark_highlands_citadel') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 27, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.fillRect(sx + 8, sy + 20, 16, 6);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(sx + 10, sy + 8, 12, 13);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(sx + 12, sy + 10, 8, 7);
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(sx + 14, sy + 12, 4, 3);
    } else if (landmark.id === 'landmark_crater_tera_core') {
      ctx.fillStyle = 'rgba(8, 20, 38, 0.36)';
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 27, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(sx + 9, sy + 20, 14, 6);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(sx + 12, sy + 8, 8, 12);
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(sx + 10, sy + 11, 4, 5);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(sx + 18, sy + 11, 4, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx + 15, sy + 6, 2, 10);
    } else {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 27, 9, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.fillRect(sx + 11, sy + 10, 10, 16);
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#fde047';
      ctx.fillRect(sx + 14, sy + 12, 4, 4);
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

    if (questReady) {
      const floatY = Math.round(y - 10 + Math.sin(nowMs * 0.008) * 2.4);
      const pulse = 0.45 + 0.35 * Math.sin(nowMs * 0.009);
      ctx.save();
      ctx.fillStyle = `rgba(250, 204, 21, ${pulse.toFixed(2)})`;
      ctx.fillRect(sx + 8, floatY - 1, 16, 13);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(sx + 9, floatY, 14, 11);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx + 9, floatY, 14, 11);
      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', sx + 16, floatY + 6);
      ctx.restore();
    } else if (unvisited && !questDone) {
      const floatY = Math.round(y - 8 + Math.sin(nowMs * 0.008) * 1.3);
      ctx.save();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(sx + 11, floatY, 10, 9);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx + 11, floatY, 10, 9);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(sx + 15, floatY + 2, 2, 4);
      ctx.fillRect(sx + 15, floatY + 7, 2, 1);
      ctx.restore();
    }
  }

  drawRival(ctx, sx, sy, rival, nowMs, profile) {
    const palette = rival.palette || {};
    const defeated = Boolean(profile?.rivalsDefeated?.includes(rival.id));
    const bob = Math.sin(nowMs * 0.005 + sx * 0.1) * 0.9;

    // Ground aura ring + shadow
    ctx.save();
    ctx.globalAlpha = defeated ? 0.25 : 0.4 + 0.16 * Math.sin(nowMs * 0.006);
    ctx.strokeStyle = palette.accent || '#f97316';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(sx + 16, sy + 28, 11, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(sx + 16, sy + 28, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const y = Math.round(sy - bob);

    // Duelist scarf/cloak behind shoulders
    ctx.fillStyle = palette.accent || '#f97316';
    ctx.fillRect(sx + 7, y + 14, 18, 7);

    // Athletic boots / legs
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(sx + 10, y + 23, 5, 5);
    ctx.fillRect(sx + 17, y + 23, 5, 5);

    // Trainer jacket & trim
    ctx.fillStyle = palette.outfitPrimary || '#dc2626';
    ctx.fillRect(sx + 9, y + 14, 14, 10);
    ctx.fillStyle = palette.outfitSecondary || '#facc15';
    ctx.fillRect(sx + 10, y + 14, 12, 3);
    ctx.fillRect(sx + 14, y + 17, 4, 6);

    // Head & Hair
    ctx.fillStyle = palette.hair || '#334155';
    ctx.fillRect(sx + 9, y + 4, 14, 11);

    // Face & determined eyes
    ctx.fillStyle = palette.skin || '#fde2c8';
    ctx.fillRect(sx + 10, y + 8, 12, 7);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(sx + 12, y + 10, 2, 3);
    ctx.fillRect(sx + 18, y + 10, 2, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx + 12, y + 10, 1, 1);
    ctx.fillRect(sx + 18, y + 10, 1, 1);

    // Rival Visor / Cap
    ctx.fillStyle = palette.hat || '#991b1b';
    ctx.fillRect(sx + 8, y + 2, 16, 5);
    ctx.fillStyle = palette.outfitSecondary || '#fde047';
    ctx.fillRect(sx + 9, y + 6, 14, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx + 15, y + 3, 2, 2);

    // Floating battle (⚔️) or rematchable (✨) indicator
    const floatY = Math.round(y - 11 + Math.sin(nowMs * 0.0075) * 2);
    ctx.save();
    ctx.fillStyle = defeated ? 'rgba(14, 116, 144, 0.92)' : 'rgba(153, 27, 27, 0.94)';
    ctx.fillRect(sx + 9, floatY, 14, 11);
    ctx.strokeStyle = defeated ? '#67e8f9' : '#facc15';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 9, floatY, 14, 11);
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(defeated ? '✨' : '⚔️', sx + 16, floatY + 6);
    ctx.restore();
  }

  _drawPlayerCape(ctx, sx, y, dir, sway, look) {
    ctx.fillStyle = look.accentDark || '#581c87';
    if (dir === 'up') {
      ctx.fillRect(sx + 7 + sway, y + 13, 18, 12);
      ctx.fillStyle = look.outfitSecondary;
      ctx.fillRect(sx + 10 + sway, y + 14, 12, 9);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(sx + 10, y + 14, 2, 2);
      ctx.fillRect(sx + 20, y + 14, 2, 2);
      return;
    }
    if (dir === 'left') {
      const w = 9 + Math.max(0, sway);
      ctx.fillRect(sx + 16, y + 14, w, 10);
      ctx.fillStyle = look.outfitSecondary;
      ctx.fillRect(sx + 18 + Math.max(0, sway), y + 21, 5, 2);
      return;
    }
    if (dir === 'right') {
      const extra = Math.max(0, -sway);
      ctx.fillRect(sx + 7 - extra, y + 14, 9 + extra, 10);
      ctx.fillStyle = look.outfitSecondary;
      ctx.fillRect(sx + 9 - extra, y + 21, 5, 2);
      return;
    }
    ctx.fillRect(sx + 6 + sway, y + 14, 20, 11);
    ctx.fillStyle = look.outfitSecondary;
    ctx.fillRect(sx + 7 + sway, y + 23, 18, 2);
  }

  _drawPlayerAccessory(ctx, sx, y, dir, nowMs, look) {
    if (look.accessory === 'crown') {
      ctx.fillStyle = '#eab308';
      ctx.fillRect(sx + 9, y + 3, 14, 3);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(sx + 9, y, 3, 3);
      ctx.fillRect(sx + 14, y - 1, 4, 4);
      ctx.fillRect(sx + 20, y, 3, 3);
      ctx.fillStyle = look.accent || '#38bdf8';
      ctx.fillRect(sx + 15, y + 3, 2, 2);
      return;
    }
    if (look.accessory === 'wizard') {
      ctx.fillStyle = look.accentDark || '#312e81';
      ctx.fillRect(sx + 5, y + 5, 22, 3);
      ctx.fillRect(sx + 9, y + 2, 14, 3);
      ctx.fillRect(sx + 12, y - 1, 8, 3);
      ctx.fillRect(sx + 15, y - 3, 3, 2);
      ctx.fillStyle = look.outfitSecondary;
      ctx.fillRect(sx + 9, y + 4, 14, 2);
      if (dir !== 'up') {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(sx + 15, y + 1, 2, 2);
      }
      return;
    }
    if (look.accessory === 'headband') {
      ctx.fillStyle = look.outfitSecondary;
      ctx.fillRect(sx + 8, y + 5, 16, 3);
      const tailShift = Math.round(Math.sin(nowMs * 0.01) * 0.9);
      const tailX = dir === 'right' ? sx + 5 : sx + 24;
      ctx.fillStyle = look.accent;
      ctx.fillRect(tailX, y + 5 + tailShift, 3, 4);
      if (dir !== 'up') {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(sx + 15, y + 5, 2, 2);
      }
      return;
    }
    if (look.accessory === 'goggles') {
      ctx.fillStyle = look.accentDark || '#334155';
      ctx.fillRect(sx + 8, y + 4, 16, 3);
      if (dir === 'down') {
        ctx.fillStyle = '#475569';
        ctx.fillRect(sx + 10, y + 3, 5, 4);
        ctx.fillRect(sx + 17, y + 3, 5, 4);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(sx + 11, y + 4, 3, 2);
        ctx.fillRect(sx + 18, y + 4, 3, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + 11, y + 4, 1, 1);
        ctx.fillRect(sx + 18, y + 4, 1, 1);
      } else if (dir === 'left') {
        ctx.fillStyle = '#475569';
        ctx.fillRect(sx + 9, y + 3, 6, 4);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(sx + 10, y + 4, 4, 2);
      } else if (dir === 'right') {
        ctx.fillStyle = '#475569';
        ctx.fillRect(sx + 17, y + 3, 6, 4);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(sx + 18, y + 4, 4, 2);
      } else {
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(sx + 14, y + 4, 4, 3);
      }
      return;
    }
    if (look.accessory === 'halo') {
      const haloBob = Math.sin(nowMs * 0.006) * 0.9;
      const hy = y - 1 + haloBob;
      ctx.save();
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.38)';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.ellipse(sx + 16, hy, 7.5, 2.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(sx + 16, hy, 7.5, 2.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      const glintX = Math.round(sx + 16 + Math.cos(nowMs * 0.004) * 6.5);
      const glintY = Math.round(hy + Math.sin(nowMs * 0.004) * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(glintX, glintY, 2, 2);
      ctx.restore();
      return;
    }
    if (look.accessory === 'visor') {
      // Sleek glowing cyan/gold visor
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(sx + 8, y + 8, 16, 4);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(sx + 8, y + 8, 16, 1);
      if (dir === 'down') {
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(sx + 10, y + 9, 12, 3);
        ctx.fillStyle = '#67e8f9';
        const scanShift = Math.round((Math.sin(nowMs * 0.008) + 1) * 4);
        ctx.fillRect(sx + 11 + scanShift, y + 9, 3, 2);
      } else if (dir === 'left') {
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(sx + 9, y + 9, 7, 3);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(sx + 16, y + 9, 2, 2);
      } else if (dir === 'right') {
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(sx + 16, y + 9, 7, 3);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(sx + 14, y + 9, 2, 2);
      } else {
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(sx + 14, y + 9, 4, 2);
      }
      return;
    }
    if (look.accessory === 'antlers') {
      // Sakura Blossom Crown / Grove Hairpiece
      ctx.fillStyle = '#15803d';
      ctx.fillRect(sx + 8, y + 4, 16, 2);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(sx + 9, y + 1, 2, 3);
      ctx.fillRect(sx + 7, y - 1, 2, 3);
      ctx.fillRect(sx + 21, y + 1, 2, 3);
      ctx.fillRect(sx + 23, y - 1, 2, 3);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(sx + 12, y + 3, 2, 2);
      ctx.fillRect(sx + 18, y + 3, 2, 2);
      for (const [bx, by] of [[8, 2], [15, 2], [21, 2]]) {
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(sx + bx, y + by, 3, 3);
        ctx.fillStyle = '#fbcfe8';
        ctx.fillRect(sx + bx, y + by, 1, 1);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(sx + bx + 1, y + by + 1, 1, 1);
      }
      return;
    }

    // Default Adventure Cap
    ctx.fillStyle = look.outfitPrimary;
    ctx.fillRect(sx + 8, y + 2, 16, 5);
    ctx.fillStyle = look.outfitSecondary;
    if (dir === 'left') {
      ctx.fillRect(sx + 6, y + 6, 12, 2);
    } else if (dir === 'right') {
      ctx.fillRect(sx + 14, y + 6, 12, 2);
    } else {
      ctx.fillRect(sx + 9, y + 6, 14, 2);
    }
    if (dir === 'down') {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(sx + 14, y + 3, 4, 2);
    }
  }

  _drawPlayerAuraBase(ctx, sx, sy, nowMs, look) {
    if (!look.aura || look.aura === 'none') return;
    const pulse = 0.25 + 0.16 * Math.sin(nowMs * 0.006);
    ctx.save();
    ctx.strokeStyle = look.aura === 'hearts'
      ? `rgba(244, 114, 182, ${pulse.toFixed(2)})`
      : look.aura === 'lightning'
        ? `rgba(56, 189, 248, ${pulse.toFixed(2)})`
        : look.aura === 'blossom'
          ? `rgba(251, 113, 133, ${pulse.toFixed(2)})`
          : look.aura === 'cosmic'
            ? `rgba(45, 212, 191, ${pulse.toFixed(2)})`
            : `rgba(250, 204, 21, ${pulse.toFixed(2)})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(sx + 16, sy + 28, 12, 5.2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  _drawPlayerAuraParticles(ctx, sx, y, nowMs, look) {
    if (!look.aura || look.aura === 'none') return;
    ctx.save();
    if (look.aura === 'stars') {
      for (let i = 0; i < 4; i++) {
        const angle = nowMs * 0.003 + i * (Math.PI / 2);
        const rx = Math.round(sx + 16 + Math.cos(angle) * 12);
        const ry = Math.round(y + 14 + Math.sin(angle * 1.2) * 8);
        ctx.globalAlpha = 0.65 + 0.35 * Math.sin(nowMs * 0.008 + i);
        ctx.fillStyle = i % 2 === 0 ? '#fde047' : '#c084fc';
        ctx.fillRect(rx - 1, ry, 3, 1);
        ctx.fillRect(rx, ry - 1, 1, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(rx, ry, 1, 1);
      }
    } else if (look.aura === 'hearts') {
      for (let i = 0; i < 3; i++) {
        const phase = ((nowMs * 0.00095 + i * 0.33) % 1 + 1) % 1;
        const hx = Math.round(sx + 14 + Math.sin(phase * Math.PI * 2 + i * 2.1) * 9);
        const hy = Math.round(y + 22 - phase * 22);
        ctx.globalAlpha = Math.sin(phase * Math.PI) * 0.92;
        ctx.fillStyle = i % 2 === 0 ? '#fb7185' : '#f472b6';
        ctx.fillRect(hx, hy, 2, 2);
        ctx.fillRect(hx + 3, hy, 2, 2);
        ctx.fillRect(hx + 1, hy + 1, 3, 2);
        ctx.fillRect(hx + 2, hy + 3, 1, 1);
        ctx.fillStyle = '#fecdd3';
        ctx.fillRect(hx, hy, 1, 1);
      }
    } else if (look.aura === 'lightning') {
      for (let i = 0; i < 3; i++) {
        const angle = nowMs * 0.0065 + i * ((Math.PI * 2) / 3);
        const bx = Math.round(sx + 15 + Math.cos(angle) * 11);
        const by = Math.round(y + 13 + Math.sin(angle * 1.4) * 7);
        const flash = 0.55 + 0.45 * Math.sin(nowMs * 0.02 + i * 2.4);
        ctx.globalAlpha = flash;
        ctx.fillStyle = i % 2 === 0 ? '#fde047' : '#38bdf8';
        ctx.fillRect(bx, by, 2, 3);
        ctx.fillRect(bx - 1, by + 2, 3, 1);
        ctx.fillRect(bx + 1, by + 3, 2, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bx, by + 2, 1, 1);
      }
    } else if (look.aura === 'blossom') {
      for (let i = 0; i < 4; i++) {
        const phase = ((nowMs * 0.001 + i * 0.25) % 1 + 1) % 1;
        const px = Math.round(sx + 15 + Math.cos(phase * Math.PI * 2 + i * 1.57) * 11);
        const py = Math.round(y + 6 + phase * 18);
        ctx.globalAlpha = Math.sin(phase * Math.PI) * 0.92;
        ctx.fillStyle = i % 2 === 0 ? '#f9a8d4' : '#fb7185';
        ctx.fillRect(px, py, 3, 2);
        ctx.fillStyle = '#fbcfe8';
        ctx.fillRect(px + 1, py - 1, 2, 2);
      }
    } else if (look.aura === 'cosmic') {
      for (let i = 0; i < 3; i++) {
        const angle = nowMs * 0.0038 + i * ((Math.PI * 2) / 3);
        const cx = Math.round(sx + 16 + Math.cos(angle) * 12);
        const cy = Math.round(y + 14 + Math.sin(angle) * 7);
        ctx.globalAlpha = 0.72 + 0.28 * Math.sin(nowMs * 0.007 + i);
        ctx.fillStyle = i === 0 ? '#fde68a' : i === 1 ? '#2dd4bf' : '#67e8f9';
        ctx.fillRect(cx - 1, cy, 3, 1);
        ctx.fillRect(cx, cy - 1, 1, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx, cy, 1, 1);
      }
    }
    ctx.restore();
  }

  drawPlayer(ctx, sx, sy, trainerId, dir, nowMs, appearance = null) {
    const look = getResolvedTrainerLook(trainerId, appearance);
    const bob = this.moving ? Math.abs(Math.sin(this.moveProgress * Math.PI)) * 3 : Math.sin(nowMs * 0.004) * 0.6;
    const stepShift = this.moving ? (this.walkFrame === 0 ? 2 : -2) : 0;
    const capeSway = Math.round(Math.sin(nowMs * 0.008 + (this.moving ? this.moveProgress * Math.PI : 0)) * (this.moving ? 2 : 1));

    // Ground aura ring + shadow
    this._drawPlayerAuraBase(ctx, sx, sy, nowMs, look);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(sx + 16, sy + 28, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const y = Math.round(sy - bob);

    if (look.cape && dir !== 'up') {
      this._drawPlayerCape(ctx, sx, y, dir, capeSway, look);
    }

    // Legs
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(sx + 10, y + 23 + (stepShift > 0 ? -1 : 0), 5, 5);
    ctx.fillRect(sx + 17, y + 23 + (stepShift < 0 ? -1 : 0), 5, 5);

    // Body / Jacket
    ctx.fillStyle = look.outfitPrimary;
    ctx.fillRect(sx + 9, y + 14, 14, 10);
    ctx.fillStyle = look.outfitSecondary;
    ctx.fillRect(sx + 12, y + 15, 8, 6);
    if (look.cape && dir === 'down') {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(sx + 10, y + 15, 2, 2);
      ctx.fillRect(sx + 20, y + 15, 2, 2);
    }

    if (look.cape && dir === 'up') {
      this._drawPlayerCape(ctx, sx, y, dir, capeSway, look);
    }

    // Head & Hair
    ctx.fillStyle = look.hair;
    ctx.fillRect(sx + 9, y + 4, 14, 11);

    // Face (unless facing up)
    if (dir !== 'up') {
      ctx.fillStyle = look.skin;
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

    // Trainer Headgear / Accessory
    this._drawPlayerAccessory(ctx, sx, y, dir, nowMs, look);

    // Floating 60fps Trainer Aura particles
    this._drawPlayerAuraParticles(ctx, sx, y, nowMs, look);
  }

  _getFollowerSpriteEntry(species, useBack, shiny) {
    if (!species?.id) return null;
    const key = `${species.id}:${useBack ? 'back' : 'front'}:${shiny ? 'shiny' : 'std'}`;
    if (this._followerSpriteCache.has(key)) {
      return this._followerSpriteCache.get(key);
    }

    const entry = { img: null, status: 'loading', tier: 0, src: null };
    this._followerSpriteCache.set(key, entry);

    if (typeof Image === 'undefined') {
      entry.status = 'fallback';
      return entry;
    }

    const urls = getSpriteUrls(species.id, useBack, shiny) || {};
    const safeType = species?.type && TYPES?.[species.type] ? species.type : 'normal';
    const remoteUrls = [
      urls.animated,
      urls.static,
      ...(Array.isArray(urls.fallbacks) ? urls.fallbacks : []),
    ].filter((u, idx, arr) => typeof u === 'string' && u.length > 0 && arr.indexOf(u) === idx);
    const remoteCount = remoteUrls.length;
    const candidates = [
      ...remoteUrls,
      `./assets/fallback/${safeType}.svg`,
      generateSilhouetteDataUri(species, useBack),
    ];

    const tryLoad = (idx) => {
      if (idx >= candidates.length) {
        entry.status = 'failed';
        return;
      }
      const url = candidates[idx];
      const img = new Image();
      let settled = false;
      let timer = null;

      const cleanup = () => {
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
        img.onload = null;
        img.onerror = null;
      };

      const advance = () => {
        if (settled) return;
        settled = true;
        cleanup();
        tryLoad(idx + 1);
      };

      // Prevent slow remote GIF/PNG requests from stalling local fallback rendering
      if (idx < remoteCount && typeof setTimeout === 'function') {
        timer = setTimeout(advance, idx === 0 ? 1400 : 1000);
      }

      img.onload = () => {
        if (settled) return;
        settled = true;
        cleanup();
        if (img.naturalWidth > 0) {
          entry.img = img;
          entry.status = 'loaded';
          entry.tier = idx;
          entry.src = url;
        } else {
          tryLoad(idx + 1);
        }
      };

      img.onerror = advance;
      img.src = url;
    };

    tryLoad(0);
    return entry;
  }

  _drawMiniCompanionFallback(ctx, sx, y, species, dir) {
    const bodyColor = species?.color || '#38bdf8';
    const accentColor = TYPES[species?.type]?.color || '#fef08a';
    const archetype = resolveFollowerArchetypeFallback(species);
    const eyeShift = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;

    const drawEyes = (ex1, ex2, ey, visor = false) => {
      if (dir === 'up') {
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(sx + 15, y + 16, 2, 4);
        ctx.globalAlpha = 1;
        return;
      }
      if (visor) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(ex1 - 1 + eyeShift, ey - 1, (ex2 - ex1) + 5, 4);
        ctx.fillStyle = accentColor;
        ctx.fillRect(ex1 + eyeShift, ey, (ex2 - ex1) + 3, 2);
        return;
      }
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(ex1 + eyeShift, ey, 2, 2);
      ctx.fillRect(ex2 + eyeShift, ey, 2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ex1 + eyeShift, ey, 1, 1);
      ctx.fillRect(ex2 + eyeShift, ey, 1, 1);
    };

    if (archetype === 'quadruped') {
      const bx = sx + 7;
      const by = y + 13;
      // 4 legs + tail + horizontal quadruped body + pointed ears
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx + 1, by, 3, 4);
      ctx.fillRect(bx + 6, by, 3, 4);
      ctx.fillRect(bx + 1, by + 3, 15, 8);
      ctx.fillRect(bx + 2, by + 11, 3, 3);
      ctx.fillRect(bx + 6, by + 11, 3, 3);
      ctx.fillRect(bx + 11, by + 11, 3, 3);
      ctx.fillRect(bx + 14, by + 4, 3, 4);
      ctx.fillStyle = accentColor;
      ctx.fillRect(bx + 15, by + 3, 3, 3);
      ctx.fillStyle = bodyColor;
      ctx.fillRect(bx + 2, by + 4, 13, 7);
      ctx.fillRect(bx + 3, by + 10, 2, 3);
      ctx.fillRect(bx + 7, by + 10, 2, 3);
      ctx.fillRect(bx + 11, by + 10, 2, 3);
      drawEyes(bx + 3, bx + 6, by + 6);
      return;
    }

    if (archetype === 'winged') {
      const bx = sx + 7;
      const by = y + 11;
      // Outstretched left & right wings + avian crest + beak
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx, by + 4, 18, 7);
      ctx.fillRect(bx + 4, by + 1, 10, 12);
      ctx.fillStyle = accentColor;
      ctx.fillRect(bx + 1, by + 5, 4, 5);
      ctx.fillRect(bx + 13, by + 5, 4, 5);
      ctx.fillRect(bx + 8, by, 2, 3);
      ctx.fillStyle = bodyColor;
      ctx.fillRect(bx + 5, by + 2, 8, 10);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(bx + 7, by + 12, 2, 2);
      ctx.fillRect(bx + 10, by + 12, 2, 2);
      if (dir !== 'up') {
        ctx.fillRect(bx + 8 + eyeShift, by + 7, 2, 2);
      }
      drawEyes(bx + 6, bx + 10, by + 5);
      return;
    }

    if (archetype === 'serpentine') {
      const bx = sx + 7;
      const by = y + 11;
      // S-curved coiled serpent body + crested hood + tail rattle
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx + 3, by + 1, 8, 6);
      ctx.fillRect(bx + 7, by + 5, 8, 5);
      ctx.fillRect(bx + 2, by + 9, 13, 5);
      ctx.fillStyle = bodyColor;
      ctx.fillRect(bx + 4, by + 2, 6, 4);
      ctx.fillRect(bx + 8, by + 6, 6, 3);
      ctx.fillRect(bx + 3, by + 10, 11, 3);
      ctx.fillStyle = accentColor;
      ctx.fillRect(bx + 13, by + 9, 3, 3);
      ctx.fillRect(bx + 5, by, 4, 2);
      drawEyes(bx + 4, bx + 8, by + 3);
      return;
    }

    if (archetype === 'aquatic') {
      const bx = sx + 7;
      const by = y + 12;
      // Sleek swimmer with tall dorsal fin & forked caudal fin
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx + 6, by, 4, 4);
      ctx.fillRect(bx + 2, by + 3, 11, 9);
      ctx.fillRect(bx + 13, by + 2, 4, 11);
      ctx.fillStyle = accentColor;
      ctx.fillRect(bx + 7, by + 1, 2, 3);
      ctx.fillRect(bx + 14, by + 3, 3, 3);
      ctx.fillRect(bx + 14, by + 9, 3, 3);
      ctx.fillStyle = bodyColor;
      ctx.fillRect(bx + 3, by + 4, 10, 7);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(bx + 5, by + 8, 5, 2);
      drawEyes(bx + 4, bx + 8, by + 5);
      return;
    }

    if (archetype === 'insectoid') {
      const bx = sx + 8;
      const by = y + 11;
      // Twin antennae + segmented thorax/abdomen + 4 side legs + wing shimmer
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx + 3, by, 2, 3);
      ctx.fillRect(bx + 11, by, 2, 3);
      ctx.fillRect(bx + 3, by + 3, 10, 10);
      ctx.fillRect(bx + 1, by + 6, 3, 2);
      ctx.fillRect(bx + 12, by + 6, 3, 2);
      ctx.fillRect(bx + 1, by + 10, 3, 2);
      ctx.fillRect(bx + 12, by + 10, 3, 2);
      ctx.fillStyle = bodyColor;
      ctx.fillRect(bx + 4, by + 4, 8, 4);
      ctx.fillRect(bx + 5, by + 9, 6, 4);
      ctx.fillStyle = accentColor;
      ctx.fillRect(bx + 2, by + 4, 3, 4);
      ctx.fillRect(bx + 11, by + 4, 3, 4);
      drawEyes(bx + 5, bx + 9, by + 5);
      return;
    }

    if (archetype === 'draconic') {
      const bx = sx + 7;
      const by = y + 11;
      // Twin horns, bat-like wing fins, armored crest, spiked tail
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx + 4, by, 3, 4);
      ctx.fillRect(bx + 11, by, 3, 4);
      ctx.fillRect(bx, by + 5, 18, 6);
      ctx.fillRect(bx + 4, by + 3, 10, 11);
      ctx.fillStyle = accentColor;
      ctx.fillRect(bx + 1, by + 6, 4, 4);
      ctx.fillRect(bx + 13, by + 6, 4, 4);
      ctx.fillRect(bx + 5, by + 1, 2, 2);
      ctx.fillRect(bx + 11, by + 1, 2, 2);
      ctx.fillStyle = bodyColor;
      ctx.fillRect(bx + 5, by + 4, 8, 9);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(bx + 7, by + 9, 4, 3);
      drawEyes(bx + 6, bx + 10, by + 6);
      return;
    }

    if (archetype === 'construct') {
      const bx = sx + 8;
      const by = y + 11;
      // Geometric iron/stone chassis + heavy shoulder pauldrons + glowing visor
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx + 3, by + 1, 10, 13);
      ctx.fillRect(bx, by + 4, 16, 6);
      ctx.fillStyle = bodyColor;
      ctx.fillRect(bx + 4, by + 2, 8, 11);
      ctx.fillStyle = accentColor;
      ctx.fillRect(bx + 1, by + 5, 3, 4);
      ctx.fillRect(bx + 12, by + 5, 3, 4);
      ctx.fillRect(bx + 6, by + 9, 4, 3);
      drawEyes(bx + 5, bx + 9, by + 5, true);
      return;
    }

    if (archetype === 'amorphous') {
      const bx = sx + 8;
      const by = y + 11;
      // Floating spectral dome + wavy tattered hem + twin spirit wisps
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx + 3, by + 2, 10, 10);
      ctx.fillRect(bx + 2, by + 5, 12, 8);
      ctx.fillStyle = accentColor;
      ctx.fillRect(bx, by + 3, 2, 3);
      ctx.fillRect(bx + 14, by + 4, 2, 3);
      ctx.fillStyle = bodyColor;
      ctx.fillRect(bx + 4, by + 3, 8, 8);
      ctx.fillRect(bx + 3, by + 6, 10, 5);
      ctx.fillRect(bx + 3, by + 11, 2, 2);
      ctx.fillRect(bx + 7, by + 11, 2, 3);
      ctx.fillRect(bx + 11, by + 11, 2, 2);
      drawEyes(bx + 5, bx + 9, by + 6);
      return;
    }

    if (archetype === 'flora') {
      const bx = sx + 8;
      const by = y + 11;
      // Blossom crown + leafy collar + sprout body & root feet
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx + 4, by, 8, 5);
      ctx.fillRect(bx + 2, by + 4, 12, 9);
      ctx.fillStyle = accentColor;
      ctx.fillRect(bx + 5, by + 1, 6, 3);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(bx + 7, by + 2, 2, 2);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(bx + 2, by + 8, 12, 3);
      ctx.fillStyle = bodyColor;
      ctx.fillRect(bx + 4, by + 5, 8, 7);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(bx + 4, by + 12, 3, 2);
      ctx.fillRect(bx + 9, by + 12, 3, 2);
      drawEyes(bx + 5, bx + 9, by + 6);
      return;
    }

    // Default 'biped': upright companion with ear tufts, arms & feet
    const bx = sx + 9;
    const by = y + 12;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(bx + 1, by, 4, 4);
    ctx.fillRect(bx + 9, by, 4, 4);
    ctx.fillRect(bx + 1, by + 3, 12, 10);
    ctx.fillStyle = accentColor;
    ctx.fillRect(bx + 2, by + 1, 2, 3);
    ctx.fillRect(bx + 10, by + 1, 2, 3);
    ctx.fillStyle = bodyColor;
    ctx.fillRect(bx + 2, by + 4, 10, 8);
    ctx.fillRect(bx + 3, by + 3, 8, 10);
    ctx.fillStyle = accentColor;
    ctx.fillRect(bx + 5, by + 10, 4, 2);
    drawEyes(bx + 4, bx + 8, by + 6);
  }

  drawFollower(ctx, sx, sy, lead, dir, nowMs = 0) {
    if (!lead) return;
    const species = SPECIES[Number(lead.speciesId)] || null;
    const safeDir = DIR_VEC[dir] ? dir : 'down';
    const useBack = safeDir === 'up';
    const shiny = Boolean(lead.isShiny);
    const upgradeTier = Math.max(0, Math.min(5, Number(lead.upgradeTier) || 0));

    // Subtle Star Rank / Shiny ground glow ring
    if (upgradeTier > 0 || shiny) {
      const pulse = 0.3 + 0.18 * Math.sin(nowMs * 0.006);
      ctx.save();
      ctx.strokeStyle = shiny
        ? `rgba(250, 204, 21, ${(pulse + 0.15).toFixed(2)})`
        : upgradeTier >= 4
          ? `rgba(250, 204, 21, ${pulse.toFixed(2)})`
          : upgradeTier >= 2
            ? `rgba(192, 132, 252, ${pulse.toFixed(2)})`
            : `rgba(103, 232, 249, ${pulse.toFixed(2)})`;
      ctx.lineWidth = upgradeTier >= 4 || shiny ? 1.6 : 1.2;
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 28, 10, 4.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Soft ground shadow ellipse
    ctx.fillStyle = 'rgba(0, 0, 0, 0.26)';
    ctx.beginPath();
    ctx.ellipse(sx + 16, sy + 28, 8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const hop = this.moving && this.followerMoving
      ? Math.abs(Math.sin(this.moveProgress * Math.PI)) * 2.8
      : Math.sin(nowMs * 0.0055) * 0.8;
    const y = Math.round(sy - hop);

    const entry = species ? this._getFollowerSpriteEntry(species, useBack, shiny) : null;
    if (entry?.img?.complete && entry.img.naturalWidth > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const size = 26;
      const drawX = sx + 3;
      const drawY = y + 3;
      if (!useBack && safeDir === 'right') {
        ctx.translate(drawX + size, drawY);
        ctx.scale(-1, 1);
        ctx.drawImage(entry.img, 0, 0, size, size);
      } else {
        ctx.drawImage(entry.img, drawX, drawY, size, size);
      }
      ctx.restore();
    } else {
      ctx.save();
      this._drawMiniCompanionFallback(ctx, sx, y, species, safeDir);
      ctx.restore();
    }

    if (upgradeTier > 0) {
      const moteCount = upgradeTier >= 3 ? 2 : 1;
      for (let i = 0; i < moteCount; i++) {
        const phase = ((nowMs * 0.0011 + i * 0.5) % 1 + 1) % 1;
        const mx = Math.round(sx + 10 + i * 12 + Math.sin(phase * Math.PI * 2) * 2);
        const my = Math.round(y + 21 - phase * 15);
        ctx.save();
        ctx.globalAlpha = Math.sin(phase * Math.PI) * 0.85;
        ctx.fillStyle = upgradeTier >= 4 ? '#fef08a' : '#67e8f9';
        ctx.fillRect(mx, my, 2, 2);
        ctx.restore();
      }
    }

    if (shiny) {
      for (let i = 0; i < 2; i++) {
        const angle = nowMs * 0.005 + i * Math.PI;
        const ox = Math.round(sx + 16 + Math.cos(angle) * 11);
        const oy = Math.round(y + 15 + Math.sin(angle) * 8);
        ctx.fillStyle = i === 0 ? '#fde047' : '#ffffff';
        ctx.fillRect(ox - 1, oy, 3, 1);
        ctx.fillRect(ox, oy - 1, 1, 3);
      }
    }
  }
}
