import * as Config from './config.js';
import { GAME_META, SPECIES, TRAINERS, TYPES, getSpriteUrls } from './config.js';
import * as PokemonMod from './pokemon.js';
import { generateSilhouetteDataUri } from './pokemon.js';
import {
  BIOMES,
  BIOME_MINIMAP_PALETTE,
  CHESTS,
  FIELD_QUESTS,
  LANDMARKS,
  NPCS,
  RIVAL_TRAINERS,
  SECRET_ARCADE_SPOT,
  SHRINES,
  SIGNPOSTS,
  SOLID_TILES,
  TILE,
  WORLD_COLS,
  WORLD_MAP,
  WORLD_ROWS,
  findNearestSafePosition,
  getBiomeAt,
  getBiomeWarpPoint,
  getTileDepthInfo,
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

const LANDMARK_ENTRIES = Object.entries(LANDMARKS).map(([key, landmark]) => {
  const [x, y] = key.split(',').map(Number);
  return { x, y, landmark };
});

const NPC_ENTRIES = Object.entries(NPCS).map(([key, npc]) => {
  const [x, y] = key.split(',').map(Number);
  return { x, y, npc };
});

const RIVAL_ENTRIES = Object.entries(RIVAL_TRAINERS).map(([key, rival]) => {
  const [x, y] = key.split(',').map(Number);
  return { x, y, rival };
});

const SHRINE_BY_TILE_INDEX = new Map(
  Object.entries(SHRINES).map(([key, shrine]) => {
    const [x, y] = key.split(',').map(Number);
    return [y * WORLD_COLS + x, shrine];
  }),
);

const CHEST_BY_TILE_INDEX = new Map(
  Object.entries(CHESTS).map(([key, chest]) => {
    const [x, y] = key.split(',').map(Number);
    return [y * WORLD_COLS + x, chest];
  }),
);

const AURORA_BAND_COLORS = {
  crater: ['rgba(56, 189, 248, 0.1)', 'rgba(244, 114, 182, 0.09)', 'rgba(250, 204, 21, 0.08)'],
  faeveldt: ['rgba(249, 168, 212, 0.09)', 'rgba(192, 132, 252, 0.085)', 'rgba(167, 243, 208, 0.075)'],
  rift: ['rgba(232, 121, 249, 0.095)', 'rgba(56, 189, 248, 0.085)', 'rgba(250, 204, 21, 0.07)'],
  sanctum: ['rgba(167, 139, 250, 0.095)', 'rgba(103, 232, 249, 0.085)', 'rgba(250, 204, 21, 0.065)'],
  peak: ['rgba(56, 189, 248, 0.085)', 'rgba(52, 211, 153, 0.09)', 'rgba(192, 132, 252, 0.08)'],
};

const SPARKLE_COLORS = ['#fef08a', '#67e8f9', '#ffffff', '#e879f9'];
const MYSTERY_NOTE_COLORS = ['#fde047', '#e879f9'];
const ANTLER_BLOSSOM_COORDS = [[8, 2], [15, 2], [21, 2]];

function sortActorsByY(a, b) {
  return a.sortY - b.sortY;
}

const DIR_VEC = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

const CARDINAL_STEPS = [
  ['up', 0, -1],
  ['down', 0, 1],
  ['left', -1, 0],
  ['right', 1, 0],
];

const DISCOVERY_NODE_KINDS = ['shimmer', 'starfall', 'mystery_cry'];

const CELEBRATION_PALETTES = {
  gold: ['#fde047', '#facc15', '#fef08a', '#fb923c', '#ffffff'],
  starlight: ['#67e8f9', '#c084fc', '#fde047', '#f472b6', '#ffffff'],
  cosmic: ['#67e8f9', '#c084fc', '#fde047', '#f472b6', '#ffffff'],
  emerald: ['#4ade80', '#fde047', '#38bdf8', '#a7f3d0', '#ffffff'],
  quest: ['#4ade80', '#fde047', '#38bdf8', '#a7f3d0', '#ffffff'],
  heal: ['#f472b6', '#fbcfe8', '#67e8f9', '#fde047', '#ffffff'],
  pink: ['#f472b6', '#fbcfe8', '#67e8f9', '#fde047', '#ffffff'],
};

const WARP_SWIRL_COLORS = ['#67e8f9', '#38bdf8', '#c084fc', '#e879f9', '#fde047', '#ffffff'];
const MINIMAP_SCALE = 2;
const MINIMAP_WIDTH = WORLD_COLS * MINIMAP_SCALE;
const MINIMAP_HEIGHT = WORLD_ROWS * MINIMAP_SCALE;

const PATH_MINIMAP_TILES = new Set([
  TILE.PATH,
  TILE.BRIDGE,
  TILE.CAVE_PATH,
  TILE.VOLCANO_PATH,
  TILE.SNOW_PATH,
  TILE.RUNE_TRAIL,
  TILE.GROVE_PATH,
  TILE.DUNE_PATH,
  TILE.MARSH_PATH,
  TILE.SANCTUM_PATH,
  TILE.CANYON_PATH,
  TILE.REEF_PATH,
  TILE.RUINS_PATH,
  TILE.RIFT_PATH,
  TILE.FAE_PATH,
  TILE.ATOLL_PATH,
  TILE.CROWN_PATH,
  TILE.TERA_PATH,
  TILE.HEAL,
]);

const SHRINE_COORDS = Object.entries(SHRINES).map(([key, shrine]) => {
  const [x, y] = key.split(',').map(Number);
  return { id: shrine.id, biome: shrine.biome, x, y };
});

const HEAL_COORDS = (() => {
  const coords = [];
  for (let y = 0; y < WORLD_ROWS; y++) {
    for (let x = 0; x < WORLD_COLS; x++) {
      if (WORLD_MAP[y]?.[x] === TILE.HEAL) {
        coords.push({ x, y });
      }
    }
  }
  return coords;
})();

const BIOME_MINIMAP_SHAPES = (() => {
  const shapes = {};
  const grid = Array.from({ length: WORLD_ROWS }, (_, y) =>
    Array.from({ length: WORLD_COLS }, (_, x) => getBiomeAt(x, y).id),
  );

  for (let y = 0; y < WORLD_ROWS; y++) {
    let runId = grid[y][0];
    let runStart = 0;
    for (let x = 1; x <= WORLD_COLS; x++) {
      const bId = x < WORLD_COLS ? grid[y][x] : null;
      if (bId !== runId) {
        if (!shapes[runId]) shapes[runId] = { spans: [], edges: [] };
        const w = x - runStart;
        const match = shapes[runId].spans.find(
          (m) => m.x === runStart && m.w === w && m.y + m.h === y,
        );
        if (match) match.h += 1;
        else shapes[runId].spans.push({ x: runStart, y, w, h: 1 });
        runId = bId;
        runStart = x;
      }
    }
  }

  for (const [bId, data] of Object.entries(shapes)) {
    for (let y = 0; y < WORLD_ROWS; y++) {
      for (const dy of [-1, 1]) {
        const ey = (y + (dy > 0 ? 1 : 0)) * MINIMAP_SCALE;
        let start = -1;
        for (let x = 0; x <= WORLD_COLS; x++) {
          const isEdge = x < WORLD_COLS
            && grid[y][x] === bId
            && (y + dy < 0 || y + dy >= WORLD_ROWS || grid[y + dy][x] !== bId);
          if (isEdge && start === -1) start = x;
          else if (!isEdge && start !== -1) {
            data.edges.push([start * MINIMAP_SCALE, ey, x * MINIMAP_SCALE, ey]);
            start = -1;
          }
        }
      }
    }
    for (let x = 0; x < WORLD_COLS; x++) {
      for (const dx of [-1, 1]) {
        const ex = (x + (dx > 0 ? 1 : 0)) * MINIMAP_SCALE;
        let start = -1;
        for (let y = 0; y <= WORLD_ROWS; y++) {
          const isEdge = y < WORLD_ROWS
            && grid[y][x] === bId
            && (x + dx < 0 || x + dx >= WORLD_COLS || grid[y][x + dx] !== bId);
          if (isEdge && start === -1) start = y;
          else if (!isEdge && start !== -1) {
            data.edges.push([ex, start * MINIMAP_SCALE, ex, y * MINIMAP_SCALE]);
            start = -1;
          }
        }
      }
    }
  }

  return shapes;
})();

const MINIMAP_WALL_COLOR_CACHE = new Map();

function darkenHexColor(hex, factor = 0.46) {
  const key = `${hex}:${factor}`;
  if (MINIMAP_WALL_COLOR_CACHE.has(key)) return MINIMAP_WALL_COLOR_CACHE.get(key);
  const clean = typeof hex === 'string' ? hex.replace('#', '') : '';
  if (clean.length !== 6) return '#1e293b';
  const r = Math.max(0, Math.min(255, Math.round(parseInt(clean.slice(0, 2), 16) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(parseInt(clean.slice(2, 4), 16) * factor)));
  const b = Math.max(0, Math.min(255, Math.round(parseInt(clean.slice(4, 6), 16) * factor)));
  const out = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  MINIMAP_WALL_COLOR_CACHE.set(key, out);
  return out;
}

function getMinimapTileColor(x, y, tile, biomeId) {
  const pal = BIOME_MINIMAP_PALETTE[biomeId] || BIOME_MINIMAP_PALETTE.forest;
  if (tile === TILE.WATER) return '#0284c7';
  if (tile === TILE.LAVA) return '#dc2626';
  if (tile === TILE.ROOF) return x < 9 ? '#a855f7' : '#ef4444';
  if (tile === TILE.WALL) return '#e2e8f0';
  if (PATH_MINIMAP_TILES.has(tile)) return pal.path;
  if (ENCOUNTER_TILE_BIOME[tile]) return pal.encounter;
  if (SOLID_TILES.has(tile)) return darkenHexColor(pal.base, 0.46);
  return pal.base;
}

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
    onDiscoveryNode = null,
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
    this.onDiscoveryNode = onDiscoveryNode;
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

    this.autoPath = [];
    this.autoInteractTarget = null;
    this.touchDestination = null;
    this._touchDestArriveTimer = null;
    this.touchSteerActive = false;
    this.touchSteerDir = null;
    this._pointerState = null;
    this._holdTimer = null;
    this._lastNodeKind = null;

    this._renderActors = [];
    this._actorPool = [];
    this._camOut = { px: 0, py: 0, camX: 0, camY: 0 };
    this._lookTrainerId = null;
    this._lookStyleId = null;
    this._lookAccessory = null;
    this._lookAura = null;
    this._lookCape = null;
    this._cachedTrainerLook = null;
    this._auroraGradBiome = null;
    this._auroraGradW = 0;
    this._auroraGradCtx = null;
    this._auroraGrads = null;

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
    this._warpBeam = null;

    this.minimapCanvas = null;
    this.minimapCtx = null;
    this._minimapBaseCanvas = null;
    this._minimapRecommendedBiomeId = null;
    this._minimapCamOut = { px: 0, py: 0, camX: 0, camY: 0 };

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

    this._bindCanvasPointerEvents();
  }

  syncViewportSize() {
    const parent = this.canvas?.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      const fallbackW = GAME_META.viewportCols * this.tileSize;
      const fallbackH = GAME_META.viewportRows * this.tileSize;
      this.viewW = fallbackW;
      this.viewH = fallbackH;
      if (this.canvas && (this.canvas.width !== fallbackW || this.canvas.height !== fallbackH)) {
        this.canvas.width = fallbackW;
        this.canvas.height = fallbackH;
      }
      return;
    }

    const zoom = Math.max(1.35, Math.min(2.2, Math.min(rect.width / 440, rect.height / 310)));
    const nextW = Math.max(288, Math.min(WORLD_COLS * this.tileSize, Math.round(rect.width / zoom)));
    const nextH = Math.max(224, Math.min(WORLD_ROWS * this.tileSize, Math.round(rect.height / zoom)));

    if (nextW !== this.viewW || nextH !== this.viewH || this.canvas.width !== nextW || this.canvas.height !== nextH) {
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

  syncFollower(returnState = true) {
    const profile = this.getProfile();
    if (!profile) {
      this.followerUid = null;
      this.followerSpeciesId = null;
      this.followerShiny = false;
      this.followerUpgradeTier = 0;
      this.followerMoving = false;
      return returnState ? this.getFollowerState() : null;
    }

    if (!this.currentBiomeId && profile.pos) {
      this.currentBiomeId = getBiomeAt(profile.pos.x, profile.pos.y).id;
    }

    const lead = profile.team?.[0] || null;
    const nextUid = lead ? (lead.uid ?? null) : null;
    const rawId = lead ? Number(lead.speciesId) : NaN;
    const nextSpeciesId = Number.isFinite(rawId) ? rawId : null;
    const nextShiny = Boolean(lead?.isShiny);
    const nextUpgradeTier = lead ? Math.max(0, Math.min(5, Number(lead.upgradeTier) || 0)) : 0;

    if (!this.followerInitialized || this.followerTrainerId !== profile.trainerId) {
      this._placeFollowerBehind(profile.pos.x, profile.pos.y, profile.pos.dir);
      this.followerTrainerId = profile.trainerId;
      this.followerUid = nextUid;
      this.followerSpeciesId = nextSpeciesId;
      this.followerShiny = nextShiny;
      this.followerUpgradeTier = nextUpgradeTier;
      return returnState ? this.getFollowerState() : null;
    }

    const changed = (
      nextUid !== this.followerUid ||
      nextSpeciesId !== this.followerSpeciesId ||
      nextShiny !== this.followerShiny ||
      nextUpgradeTier !== this.followerUpgradeTier
    );

    if (changed) {
      this.followerUid = nextUid;
      this.followerSpeciesId = nextSpeciesId;
      this.followerShiny = nextShiny;
      this.followerUpgradeTier = nextUpgradeTier;
      if (lead) {
        this._spawnFollowerChangePuff(profile);
      } else {
        this.followerMoving = false;
      }
    }

    return returnState ? this.getFollowerState() : null;
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

  _bindCanvasPointerEvents() {
    if (!this.canvas || typeof this.canvas.addEventListener !== 'function') return;
    this._onPointerDown = (e) => this._handlePointerDown(e);
    this._onPointerMove = (e) => this._handlePointerMove(e);
    this._onPointerUp = (e) => this._handlePointerUp(e);
    this._onPointerCancel = (e) => this._handlePointerCancel(e);
    this._onContextMenu = (e) => {
      if (this.active) e.preventDefault?.();
    };

    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    this.canvas.addEventListener('pointermove', this._onPointerMove);
    this.canvas.addEventListener('pointerup', this._onPointerUp);
    this.canvas.addEventListener('pointercancel', this._onPointerCancel);
    this.canvas.addEventListener('lostpointercapture', this._onPointerCancel);
    this.canvas.addEventListener('contextmenu', this._onContextMenu);
  }

  destroy() {
    this.clearTouchNavigation();
    this._resizeObserver?.disconnect?.();
    this.minimapCanvas = null;
    this.minimapCtx = null;
    this._minimapBaseCanvas = null;
    this._warpBeam = null;
    if (!this.canvas || typeof this.canvas.removeEventListener !== 'function') return;
    if (this._onPointerDown) this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    if (this._onPointerMove) this.canvas.removeEventListener('pointermove', this._onPointerMove);
    if (this._onPointerUp) this.canvas.removeEventListener('pointerup', this._onPointerUp);
    if (this._onPointerCancel) {
      this.canvas.removeEventListener('pointercancel', this._onPointerCancel);
      this.canvas.removeEventListener('lostpointercapture', this._onPointerCancel);
    }
    if (this._onContextMenu) this.canvas.removeEventListener('contextmenu', this._onContextMenu);
  }

  _clearHoldTimer() {
    if (this._holdTimer !== null) {
      clearTimeout(this._holdTimer);
      this._holdTimer = null;
    }
  }

  _clearPointerSteering() {
    this._clearHoldTimer();
    this._pointerState = null;
    this.touchSteerActive = false;
    this.touchSteerDir = null;
  }

  clearTouchNavigation() {
    this._clearPointerSteering();
    this.autoPath = [];
    this.autoInteractTarget = null;
    this.touchDestination = null;
    this._touchDestArriveTimer = null;
  }

  getTouchNavigationState() {
    return {
      autoPathLength: this.autoPath.length,
      autoPath: [...this.autoPath],
      touchDestination: this.touchDestination ? { ...this.touchDestination } : null,
      autoInteractTarget: this.autoInteractTarget ? { ...this.autoInteractTarget } : null,
      touchSteerActive: this.touchSteerActive,
      touchSteerDir: this.touchSteerDir,
    };
  }

  _getCameraPosition(profile, out = null) {
    const ts = this.tileSize;
    const baseX = profile?.pos?.x ?? (GAME_META.spawn?.x ?? 8);
    const baseY = profile?.pos?.y ?? (GAME_META.spawn?.y ?? 15);
    const px = this.moving
      ? this.moveStartX + (this.moveTargetX - this.moveStartX) * this.moveProgress
      : baseX;
    const py = this.moving
      ? this.moveStartY + (this.moveTargetY - this.moveStartY) * this.moveProgress
      : baseY;

    const maxCamX = Math.max(0, Math.round(WORLD_COLS * ts - this.viewW));
    const maxCamY = Math.max(0, Math.round(WORLD_ROWS * ts - this.viewH));
    const camX = Math.round(Math.max(0, Math.min(maxCamX, Math.round(px * ts - this.viewW / 2 + ts / 2))));
    const camY = Math.round(Math.max(0, Math.min(maxCamY, Math.round(py * ts - this.viewH / 2 + ts / 2))));
    if (out) {
      out.px = px;
      out.py = py;
      out.camX = camX;
      out.camY = camY;
      return out;
    }
    return { px, py, camX, camY };
  }

  screenToWorldTile(clientX, clientY) {
    const rect = this.canvas?.getBoundingClientRect?.() || { left: 0, top: 0, width: 0, height: 0 };
    let canvasX = this.viewW / 2;
    let canvasY = this.viewH / 2;

    if (rect.width > 0 && rect.height > 0) {
      const safeClientX = Number.isFinite(Number(clientX)) ? Number(clientX) : rect.left + rect.width / 2;
      const safeClientY = Number.isFinite(Number(clientY)) ? Number(clientY) : rect.top + rect.height / 2;
      const scale = Math.max(rect.width / this.viewW, rect.height / this.viewH);
      const offsetX = (rect.width - this.viewW * scale) / 2;
      const offsetY = (rect.height - this.viewH * scale) / 2;
      canvasX = (safeClientX - rect.left - offsetX) / scale;
      canvasY = (safeClientY - rect.top - offsetY) / scale;
    }

    const profile = this.getProfile?.();
    const { camX, camY } = this._getCameraPosition(profile);
    const maxWorldX = WORLD_COLS * this.tileSize - 0.001;
    const maxWorldY = WORLD_ROWS * this.tileSize - 0.001;
    const worldX = Math.max(0, Math.min(maxWorldX, camX + canvasX));
    const worldY = Math.max(0, Math.min(maxWorldY, camY + canvasY));
    const tileX = Math.max(0, Math.min(WORLD_COLS - 1, Math.floor(worldX / this.tileSize)));
    const tileY = Math.max(0, Math.min(WORLD_ROWS - 1, Math.floor(worldY / this.tileSize)));

    return { tileX, tileY, worldX, worldY, canvasX, canvasY };
  }

  _computeTouchSteerDir(clientX, clientY) {
    const profile = this.getProfile?.();
    if (!profile) return null;
    const { canvasX, canvasY } = this.screenToWorldTile(clientX, clientY);
    const { px, py, camX, camY } = this._getCameraPosition(profile);
    const playerScreenX = px * this.tileSize - camX + this.tileSize / 2;
    const playerScreenY = py * this.tileSize - camY + this.tileSize / 2;
    const dx = canvasX - playerScreenX;
    const dy = canvasY - playerScreenY;
    if (Math.hypot(dx, dy) < 6) return null;

    const horizDir = dx >= 0 ? 'right' : 'left';
    const vertDir = dy >= 0 ? 'down' : 'up';
    const useHoriz = Math.abs(dx) >= Math.abs(dy);
    const primaryDir = useHoriz ? horizDir : vertDir;
    const secondaryDir = useHoriz ? vertDir : horizDir;
    const perpDelta = useHoriz ? Math.abs(dy) : Math.abs(dx);

    const curX = profile.pos.x;
    const curY = profile.pos.y;
    const pVec = DIR_VEC[primaryDir];
    if (this.isTileWalkable(curX + pVec.dx, curY + pVec.dy)) {
      return primaryDir;
    }

    const sVec = DIR_VEC[secondaryDir];
    if (perpDelta >= 10 && this.isTileWalkable(curX + sVec.dx, curY + sVec.dy)) {
      return secondaryDir;
    }

    return primaryDir;
  }

  _enterTouchSteer() {
    if (!this._pointerState) return;
    this._pointerState.dragging = true;
    this.autoPath = [];
    this.autoInteractTarget = null;
    this.touchDestination = null;
    this._touchDestArriveTimer = null;
    this.touchSteerActive = true;
    this.touchSteerDir = this._computeTouchSteerDir(
      this._pointerState.clientX,
      this._pointerState.clientY,
    );
  }

  _handlePointerDown(e) {
    if (e.button === 2 || (e.pointerType === 'mouse' && e.button !== undefined && e.button !== 0)) {
      return;
    }
    if (!this.active || this.paused) return;
    e.preventDefault?.();

    const pointerId = e.pointerId ?? 0;
    if (this._pointerState && this._pointerState.pointerId !== pointerId) return;

    try {
      this.canvas?.setPointerCapture?.(pointerId);
    } catch {
      // Synthetic pointer events in unit tests may not have an active browser pointer ID.
    }

    this._clearHoldTimer();
    const downTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this._pointerState = {
      pointerId,
      downTime,
      startX: e.clientX,
      startY: e.clientY,
      clientX: e.clientX,
      clientY: e.clientY,
      dragging: false,
    };

    this._holdTimer = setTimeout(() => {
      this._holdTimer = null;
      if (!this._pointerState || this._pointerState.pointerId !== pointerId || !this.active || this.paused) {
        return;
      }
      this._enterTouchSteer();
    }, 150);
  }

  _handlePointerMove(e) {
    const pointerId = e.pointerId ?? 0;
    if (!this._pointerState || this._pointerState.pointerId !== pointerId) return;
    this._pointerState.clientX = e.clientX;
    this._pointerState.clientY = e.clientY;

    if (!this.active || this.paused) {
      this._clearPointerSteering();
      return;
    }

    const dist = Math.hypot(e.clientX - this._pointerState.startX, e.clientY - this._pointerState.startY);
    if (!this._pointerState.dragging && dist >= 14) {
      this._clearHoldTimer();
      this._enterTouchSteer();
    } else if (this.touchSteerActive) {
      this.touchSteerDir = this._computeTouchSteerDir(e.clientX, e.clientY);
    }
  }

  _handlePointerUp(e) {
    const pointerId = e.pointerId ?? 0;
    if (!this._pointerState || this._pointerState.pointerId !== pointerId) return;
    const state = this._pointerState;
    this._clearPointerSteering();

    try {
      if (this.canvas?.hasPointerCapture?.(pointerId)) {
        this.canvas.releasePointerCapture(pointerId);
      }
    } catch {
      // Ignore synthetic capture cleanup errors.
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsed = now - state.downTime;
    const dist = Math.hypot(e.clientX - state.startX, e.clientY - state.startY);
    if (this.active && !this.paused && !state.dragging && elapsed < 260 && dist < 14) {
      const { tileX, tileY } = this.screenToWorldTile(e.clientX, e.clientY);
      this.walkToTile(tileX, tileY);
    }
  }

  _handlePointerCancel(e) {
    const pointerId = e?.pointerId;
    if (this._pointerState && pointerId !== undefined && this._pointerState.pointerId !== pointerId) return;
    this._clearPointerSteering();
  }

  _directionBetween(fx, fy, tx, ty) {
    const dx = tx - fx;
    const dy = ty - fy;
    if (dx === 0 && dy === 0) return null;
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  }

  _faceTile(tx, ty) {
    const profile = this.getProfile?.();
    if (!profile) return;
    const dir = this._directionBetween(profile.pos.x, profile.pos.y, tx, ty);
    if (!dir) return;
    if (profile.pos.dir !== dir) {
      profile.pos.dir = dir;
      this.onStepSaved?.(profile.pos.x, profile.pos.y, dir, false);
    }
    this.refreshInteractHint();
  }

  walkToTile(tileX, tileY) {
    if (!this.active || this.paused) return false;
    const profile = this.getProfile?.();
    if (!profile) return false;
    if (
      tileX === null || tileX === undefined || tileX === '' ||
      tileY === null || tileY === undefined || tileY === '' ||
      !Number.isFinite(Number(tileX)) || !Number.isFinite(Number(tileY))
    ) {
      return false;
    }
    const tx = Math.trunc(Number(tileX));
    const ty = Math.trunc(Number(tileY));
    if (tx < 0 || ty < 0 || tx >= WORLD_COLS || ty >= WORLD_ROWS) {
      return false;
    }

    this.touchSteerActive = false;
    this.touchSteerDir = null;
    this.autoPath = [];
    this.autoInteractTarget = null;
    this.touchDestination = null;
    this._touchDestArriveTimer = null;

    const px = profile.pos.x;
    const py = profile.pos.y;
    const interactive = this.getInteractiveAtTile(tx, ty);

    if (!this.moving && interactive) {
      if (interactive.type === 'heal' && tx === px && ty === py) {
        this.refreshInteractHint();
        if (!this.triggerInteract()) {
          this.onHealSpot?.();
        }
        return true;
      }
      if (Math.abs(tx - px) + Math.abs(ty - py) === 1) {
        this._faceTile(tx, ty);
        return this.triggerInteract();
      }
    }

    const startX = this.moving ? this.moveTargetX : px;
    const startY = this.moving ? this.moveTargetY : py;

    if (this.moving && interactive) {
      if (
        (interactive.type === 'heal' && tx === startX && ty === startY) ||
        Math.abs(tx - startX) + Math.abs(ty - startY) === 1
      ) {
        this.autoInteractTarget = { x: tx, y: ty };
        this.touchDestination = {
          x: startX,
          y: startY,
          isInteract: true,
          createdAt: typeof performance !== 'undefined' ? performance.now() : Date.now(),
        };
        return true;
      }
    }

    if (!interactive && tx === startX && ty === startY) {
      return false;
    }

    const targetIsWalkable = !interactive && this.isTileWalkable(tx, ty);

    // Forgiving near-edge snapping for solid non-interactive tiles within Manhattan radius 1..2
    let snapCandidates = null;
    let snapRankByIdx = null;
    if (!interactive && !targetIsWalkable) {
      snapCandidates = [];
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const targetDist = Math.abs(dx) + Math.abs(dy);
          if (targetDist < 1 || targetDist > 2) continue;
          const cx = tx + dx;
          const cy = ty + dy;
          if (cx < 0 || cy < 0 || cx >= WORLD_COLS || cy >= WORLD_ROWS) continue;
          if (!this.isTileWalkable(cx, cy)) continue;
          const startDist = Math.abs(cx - startX) + Math.abs(cy - startY);
          snapCandidates.push({
            x: cx,
            y: cy,
            idx: cy * WORLD_COLS + cx,
            targetDist,
            startDist,
          });
        }
      }
      if (snapCandidates.length === 0) {
        return false;
      }
      snapCandidates.sort((a, b) => (
        a.targetDist - b.targetDist ||
        a.startDist - b.startDist ||
        a.y - b.y ||
        a.x - b.x
      ));
      snapRankByIdx = new Map();
      for (let i = 0; i < snapCandidates.length; i++) {
        snapRankByIdx.set(snapCandidates[i].idx, i);
      }
    }

    const maxVisited = 1400;
    const startIdx = startY * WORLD_COLS + startX;
    const visited = new Set([startIdx]);
    const parent = new Map();
    const queue = [[startX, startY]];

    let goalX = null;
    let goalY = null;
    let bestSnapCand = null;

    if (snapRankByIdx && snapRankByIdx.has(startIdx)) {
      bestSnapCand = snapCandidates[snapRankByIdx.get(startIdx)];
      if (
        bestSnapCand.targetDist === snapCandidates[0].targetDist &&
        bestSnapCand.startDist === snapCandidates[0].startDist
      ) {
        goalX = bestSnapCand.x;
        goalY = bestSnapCand.y;
      }
    }

    if (goalX === null) {
      for (let head = 0; head < queue.length; head++) {
        const [cx, cy] = queue[head];
        if (interactive) {
          if (Math.abs(cx - tx) + Math.abs(cy - ty) === 1) {
            goalX = cx;
            goalY = cy;
            break;
          }
        } else if (targetIsWalkable) {
          if (cx === tx && cy === ty) {
            goalX = cx;
            goalY = cy;
            break;
          }
        } else if (snapRankByIdx) {
          const rank = snapRankByIdx.get(cy * WORLD_COLS + cx);
          if (rank !== undefined) {
            const cand = snapCandidates[rank];
            if (
              !bestSnapCand ||
              cand.targetDist < bestSnapCand.targetDist ||
              (cand.targetDist === bestSnapCand.targetDist && cand.startDist < bestSnapCand.startDist)
            ) {
              bestSnapCand = cand;
              if (
                bestSnapCand.targetDist === snapCandidates[0].targetDist &&
                bestSnapCand.startDist === snapCandidates[0].startDist
              ) {
                goalX = bestSnapCand.x;
                goalY = bestSnapCand.y;
                break;
              }
            }
          }
        }

        if (visited.size >= maxVisited) continue;

        for (const [dirName, dx, dy] of CARDINAL_STEPS) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= WORLD_COLS || ny >= WORLD_ROWS) continue;
          const nIdx = ny * WORLD_COLS + nx;
          if (visited.has(nIdx) || !this.isTileWalkable(nx, ny)) continue;
          visited.add(nIdx);
          parent.set(nIdx, { prevIdx: cy * WORLD_COLS + cx, dir: dirName });
          queue.push([nx, ny]);
          if (visited.size >= maxVisited) break;
        }
      }
    }

    if (goalX === null && bestSnapCand) {
      goalX = bestSnapCand.x;
      goalY = bestSnapCand.y;
    }

    if (goalX === null || goalY === null) {
      return false;
    }

    const steps = [];
    let curIdx = goalY * WORLD_COLS + goalX;
    while (curIdx !== startIdx) {
      const entry = parent.get(curIdx);
      if (!entry) break;
      steps.push(entry.dir);
      curIdx = entry.prevIdx;
    }
    steps.reverse();

    if (steps.length === 0 && !this.moving && !interactive) {
      if (!targetIsWalkable && goalX === startX && goalY === startY) {
        this.touchDestination = {
          x: goalX,
          y: goalY,
          isInteract: false,
          createdAt: typeof performance !== 'undefined' ? performance.now() : Date.now(),
        };
        this._touchDestArriveTimer = 0.22;
        return true;
      }
      return false;
    }

    this.autoPath = steps;
    this.autoInteractTarget = interactive ? { x: tx, y: ty } : null;
    this.touchDestination = {
      x: goalX,
      y: goalY,
      isInteract: Boolean(this.autoInteractTarget),
      createdAt: typeof performance !== 'undefined' ? performance.now() : Date.now(),
    };
    return true;
  }

  syncFromProfile() {
    this.syncViewportSize();
    this.clearTouchNavigation();
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
    this.rustleTile = null;
    this.particles = [];
    this.ripples = [];
    if (this.followerTrainerId && this.followerTrainerId !== profile.trainerId) {
      this.rarePatches = [];
    }
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
      this.followerUpgradeTier = leadMeta.upgradeTier;
    }
    this.syncFollower();

    this.onBiomeChange?.(biome, false);
    this.lastHintKey = null;
    this.refreshInteractHint();
  }

  setActive(active) {
    this.active = active;
    if (active) {
      this.syncFromProfile();
    } else {
      this.clearTouchNavigation();
      this.moving = false;
      this.moveProgress = 0;
      this.followerMoving = false;
      this.followerInitialized = false;
      this.rustleTile = null;
      this._warpBeam = null;
    }
  }

  setPaused(paused) {
    this.paused = paused;
    if (paused) {
      this.clearTouchNavigation();
    }
  }

  isTileWalkable(x, y) {
    return isTileWalkableAt(x, y);
  }

  _pickNextDiscoveryNodeKind() {
    let pool = DISCOVERY_NODE_KINDS.filter(
      (k) => k !== this._lastNodeKind && !this.rarePatches.some((p) => p.kind === k),
    );
    if (pool.length === 0) {
      pool = DISCOVERY_NODE_KINDS.filter((k) => k !== this._lastNodeKind);
    }
    const kind = pool[Math.floor(Math.random() * pool.length)] || DISCOVERY_NODE_KINDS[0];
    this._lastNodeKind = kind;
    return kind;
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
        const kind = this._pickNextDiscoveryNodeKind();
        this.rarePatches.push({
          x: chosen.x,
          y: chosen.y,
          biomeId: chosen.biomeId,
          kind,
          ttl: 18 + Math.random() * 6,
        });
      }
      this.rarePatchSpawnCooldown = 4.0;
    } else {
      this.rarePatchSpawnCooldown = 2.0;
    }
  }

  getInteractiveAtTile(tx, ty) {
    if (!Number.isInteger(tx) || !Number.isInteger(ty)) return null;
    if (tx < 0 || ty < 0 || tx >= WORLD_COLS || ty >= WORLD_ROWS) return null;
    const profile = this.getProfile?.();
    const tile = WORLD_MAP[ty]?.[tx];
    const key = `${tx},${ty}`;

    if (tile === TILE.SIGN && SIGNPOSTS[key]) {
      return { type: 'sign', key, x: tx, y: ty, label: '💬 Read Sign', data: SIGNPOSTS[key] };
    }
    if (tile === TILE.SHRINE && SHRINES[key]) {
      return { type: 'shrine', key, x: tx, y: ty, label: `⚔️ ${SHRINES[key].name}`, data: SHRINES[key] };
    }
    if (tile === TILE.CHEST && CHESTS[key]) {
      const opened = Boolean(profile?.chestsOpened?.includes(CHESTS[key].id));
      return {
        type: 'chest',
        key,
        x: tx,
        y: ty,
        label: opened ? '📦 Empty Chest' : '💎 Open Chest',
        data: CHESTS[key],
        opened,
      };
    }
    if (tile === TILE.HEAL) {
      return { type: 'heal', key, x: tx, y: ty, label: '💖 Healing Fountain', data: null };
    }
    if (NPCS[key]) {
      return {
        type: 'npc',
        key,
        x: tx,
        y: ty,
        label: `💬 Talk: ${NPCS[key].name}`,
        data: NPCS[key],
      };
    }
    if (RIVAL_TRAINERS[key]) {
      const rival = RIVAL_TRAINERS[key];
      return {
        type: 'rival',
        key,
        x: tx,
        y: ty,
        label: `⚔️ Battle ${rival.name}`,
        data: rival,
      };
    }
    if (LANDMARKS[key]) {
      return {
        type: 'landmark',
        key,
        x: tx,
        y: ty,
        label: `${LANDMARKS[key].icon} ${LANDMARKS[key].name}`,
        data: LANDMARKS[key],
      };
    }
    if (SECRET_ARCADE_SPOT && SECRET_ARCADE_SPOT.x === tx && SECRET_ARCADE_SPOT.y === ty) {
      const unlocked = Boolean(this.getProfile?.()?.arcade?.unlocked);
      return {
        type: 'arcade',
        key,
        x: tx,
        y: ty,
        unlocked,
        label: unlocked ? `${SECRET_ARCADE_SPOT.icon} ${SECRET_ARCADE_SPOT.name}` : '🔍 Mysterious Wall',
        data: SECRET_ARCADE_SPOT,
      };
    }
    return null;
  }

  getInteractiveTarget() {
    const profile = this.getProfile();
    if (!profile) return null;
    const { x, y, dir } = profile.pos;

    if (WORLD_MAP[y]?.[x] === TILE.HEAL) {
      return { type: 'heal', key: `${x},${y}`, x, y, label: '💖 Heal Team', data: null };
    }

    const vec = DIR_VEC[dir] || DIR_VEC.down;
    return this.getInteractiveAtTile(x + vec.dx, y + vec.dy);
  }

  refreshInteractHint() {
    const target = this.getInteractiveTarget();
    const hintKey = target
      ? `${target.type}:${target.key}:${target.opened ? '1' : '0'}:${target.unlocked ? '1' : '0'}`
      : 'none';
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

  triggerCelebrationBurst(tileX, tileY, preset = 'gold') {
    const profile = this.getProfile?.();
    const tx = Number.isFinite(Number(tileX)) ? Number(tileX) : (profile?.pos?.x ?? 8);
    const ty = Number.isFinite(Number(tileY)) ? Number(tileY) : (profile?.pos?.y ?? 15);
    const palette = CELEBRATION_PALETTES[preset] || CELEBRATION_PALETTES.gold;
    const cx = tx * this.tileSize + 16;
    const cy = ty * this.tileSize + 16;
    const count = 26;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.32;
      const speed = 26 + Math.random() * 44;
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 10,
        y: cy + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 22,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4,
        color: palette[i % palette.length],
        size: 2.2 + Math.random() * 2.4,
      });
    }
    return count;
  }

  /**
   * Spawn swirling starlight particles and activate the vertical warp beam overlay.
   * @param {'depart'|'arrive'} phase
   * @param {number|null} tileX
   * @param {number|null} tileY
   */
  triggerWarpEffect(phase = 'depart', tileX = null, tileY = null) {
    const profile = this.getProfile?.();
    const x = tileX !== null && tileX !== undefined && tileX !== '' && Number.isFinite(Number(tileX))
      ? Number(tileX)
      : (profile?.pos?.x ?? 8);
    const y = tileY !== null && tileY !== undefined && tileY !== '' && Number.isFinite(Number(tileY))
      ? Number(tileY)
      : (profile?.pos?.y ?? 15);
    const safePhase = phase === 'arrive' ? 'arrive' : 'depart';
    const cx = x * this.tileSize + 16;
    const cy = y * this.tileSize + 16;
    const count = safePhase === 'depart' ? 16 : 22;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.25;
      const radius = safePhase === 'depart' ? 10 + Math.random() * 6 : 3 + Math.random() * 5;
      const radialSpeed = safePhase === 'depart' ? -14 - Math.random() * 14 : 24 + Math.random() * 28;
      const swirlSpeed = safePhase === 'depart' ? 32 : 24;
      const tx = -Math.sin(angle);
      const ty = Math.cos(angle);
      this.particles.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius * 0.65,
        vx: Math.cos(angle) * radialSpeed + tx * swirlSpeed,
        vy: Math.sin(angle) * radialSpeed * 0.6 + ty * swirlSpeed * 0.4 - (safePhase === 'depart' ? 36 : 24),
        life: 0,
        maxLife: (safePhase === 'depart' ? 0.34 : 0.48) + Math.random() * 0.16,
        color: WARP_SWIRL_COLORS[i % WARP_SWIRL_COLORS.length],
        size: 2 + Math.random() * 2.2,
      });
    }

    this._warpBeam = {
      phase: safePhase,
      x,
      y,
      life: 0,
      maxLife: safePhase === 'depart' ? 0.32 : 0.52,
    };
    return this._warpBeam;
  }

  /**
   * Relocate trainer and companion cleanly to a guaranteed-walkable landing tile.
   * @param {number} x
   * @param {number} y
   * @param {string} dir
   * @param {{ announceBiome?: boolean }} options
   */
  warpToPosition(x, y, dir = 'down', { announceBiome = false } = {}) {
    this.clearTouchNavigation();
    this.moving = false;
    this.moveProgress = 0;
    this.followerMoving = false;
    this.rustleTile = null;

    const safe = findNearestSafePosition(x, y, dir);
    const profile = this.getProfile?.();

    if (profile) {
      if (!profile.pos || typeof profile.pos !== 'object') {
        profile.pos = { x: safe.x, y: safe.y, dir: safe.dir };
      } else {
        profile.pos.x = safe.x;
        profile.pos.y = safe.y;
        profile.pos.dir = safe.dir;
      }
      this.moveStartX = safe.x;
      this.moveStartY = safe.y;
      this.moveTargetX = safe.x;
      this.moveTargetY = safe.y;
      this.stepsSinceBattle = 3;
      this.encounterTileStreak = 0;

      this._placeFollowerBehind(safe.x, safe.y, safe.dir);
      this.followerTrainerId = profile.trainerId;
      const leadMeta = this._readLeadMeta(profile.team?.[0] || null);
      this.followerUid = leadMeta.uid;
      this.followerSpeciesId = leadMeta.speciesId;
      this.followerShiny = leadMeta.isShiny;
      this.followerUpgradeTier = leadMeta.upgradeTier;
      this.syncFollower(false);

      this.ripples = [];
      this.rarePatches = [];
      this.rarePatchSpawnCooldown = 0;
      this.refreshRarePatches(profile, 0);
    }

    const biome = getBiomeAt(safe.x, safe.y);
    this.currentBiomeId = biome.id;
    this.lastHintKey = null;
    this.refreshInteractHint();
    this.triggerWarpEffect('arrive', safe.x, safe.y);
    this.triggerCelebrationBurst(safe.x, safe.y, 'starlight');

    if (announceBiome) {
      this.onBiomeChange?.(biome, true);
    }

    this.render(typeof performance !== 'undefined' ? performance.now() : Date.now());
    return { x: safe.x, y: safe.y, dir: safe.dir, biomeId: this.currentBiomeId };
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
    if (this._warpBeam) {
      const safeDt = Number.isFinite(dt) && dt > 0 ? dt : 0;
      this._warpBeam.life += safeDt;
      if (this._warpBeam.life >= this._warpBeam.maxLife) {
        this._warpBeam = null;
      }
    }

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
      this.syncFollower(false);
    }

    if (!this.active || this.paused) return;
    const profile = this.getProfile();
    if (!profile) return;

    if (heldDir) {
      this.autoPath = [];
      this.autoInteractTarget = null;
      this.touchDestination = null;
      this._touchDestArriveTimer = null;
      this.touchSteerActive = false;
      this.touchSteerDir = null;
    }

    if (this._touchDestArriveTimer !== null) {
      this._touchDestArriveTimer -= dt;
      if (this._touchDestArriveTimer <= 0) {
        this._touchDestArriveTimer = null;
        if (!this.moving && this.autoPath.length === 0 && !this.autoInteractTarget) {
          this.touchDestination = null;
        }
      }
    }

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

        if (this.active && !this.paused && this.autoPath.length === 0) {
          if (this.autoInteractTarget) {
            const interactAt = this.autoInteractTarget;
            this.autoInteractTarget = null;
            this.touchDestination = null;
            this._faceTile(interactAt.x, interactAt.y);
            this.triggerInteract();
          } else if (
            this.touchDestination &&
            this.touchDestination.x === profile.pos.x &&
            this.touchDestination.y === profile.pos.y
          ) {
            this.touchDestination = null;
          }
        }
      }
    }

    if (!this.moving && !this.paused && this.active) {
      if (heldDir) {
        this.tryStartMove(heldDir);
      } else if (this.touchSteerActive) {
        if (this._pointerState) {
          this.touchSteerDir = this._computeTouchSteerDir(
            this._pointerState.clientX,
            this._pointerState.clientY,
          );
        }
        if (this.touchSteerDir) {
          this.tryStartMove(this.touchSteerDir);
        }
      } else if (this.autoPath.length > 0) {
        const stepDir = this.autoPath.shift();
        const vec = DIR_VEC[stepDir];
        if (vec && this.isTileWalkable(profile.pos.x + vec.dx, profile.pos.y + vec.dy)) {
          this.tryStartMove(stepDir);
        } else {
          this.autoPath = [];
          this.autoInteractTarget = null;
          this.touchDestination = null;
        }
      }
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
      const { depthTier } = getTileDepthInfo(x, y);

      const rareIdx = this.rarePatches.findIndex((p) => p.x === x && p.y === y);
      if (rareIdx !== -1) {
        const [patch] = this.rarePatches.splice(rareIdx, 1);
        const nodeKind = patch?.kind || 'shimmer';
        if (nodeKind === 'starfall') {
          this.spawnParticles(x, y, '#67e8f9', 14, true);
          this.spawnParticles(x, y, '#f472b6', 8, true);
        } else if (nodeKind === 'mystery_cry') {
          this.spawnParticles(x, y, '#c084fc', 14, true);
          this.spawnParticles(x, y, '#fde047', 8, true);
        } else {
          this.spawnParticles(x, y, '#facc15', 14, true);
          this.spawnParticles(x, y, '#ffffff', 8, true);
        }
        this.stepsSinceBattle = 0;
        this.encounterTileStreak = 0;
        this.clearTouchNavigation();
        if (nodeKind === 'starfall' && typeof this.onDiscoveryNode === 'function') {
          this.onDiscoveryNode({ kind: 'starfall', biomeId: encounterBiome, x, y, depthTier });
        } else {
          this.onWildEncounter?.(encounterBiome, { isRarePatch: true, nodeKind, depthTier });
        }
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
          this.clearTouchNavigation();
          this.onWildEncounter?.(encounterBiome, { isRarePatch: false, depthTier });
        }
      }
    } else {
      this.stepsSinceBattle += 1;
      this.encounterTileStreak = 0;
    }
  }

  _pushRenderActor(kind, sortY, sx, sy, npc = null, rival = null, lead = null) {
    const idx = this._renderActors.length;
    let slot = this._actorPool[idx];
    if (!slot) {
      slot = { kind, sortY, sx, sy, npc, rival, lead };
      this._actorPool[idx] = slot;
    } else {
      slot.kind = kind;
      slot.sortY = sortY;
      slot.sx = sx;
      slot.sy = sy;
      slot.npc = npc;
      slot.rival = rival;
      slot.lead = lead;
    }
    this._renderActors.push(slot);
  }

  _getResolvedTrainerLookCached(trainerId, appearance = null) {
    const styleId = appearance?.styleId ?? null;
    const accessory = appearance?.accessory ?? null;
    const aura = appearance?.aura ?? null;
    const cape = Boolean(appearance?.cape);
    if (
      this._cachedTrainerLook &&
      this._lookTrainerId === trainerId &&
      this._lookStyleId === styleId &&
      this._lookAccessory === accessory &&
      this._lookAura === aura &&
      this._lookCape === cape
    ) {
      return this._cachedTrainerLook;
    }
    const resolved = getResolvedTrainerLook(trainerId, appearance);
    this._lookTrainerId = trainerId;
    this._lookStyleId = styleId;
    this._lookAccessory = accessory;
    this._lookAura = aura;
    this._lookCape = cape;
    this._cachedTrainerLook = resolved;
    return resolved;
  }

  render(nowMs) {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.setTransform?.(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;

    const profile = this.getProfile();
    if (!profile) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, this.viewW, this.viewH);
      return;
    }

    if (this.active || this.followerInitialized) {
      this.syncFollower(false);
    }

    const cam = this._getCameraPosition(profile, this._camOut);
    const { px, py, camX, camY } = cam;
    const ts = this.tileSize;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    const startCol = Math.max(0, Math.floor(camX / ts));
    const endCol = Math.min(WORLD_COLS - 1, Math.ceil((camX + this.viewW) / ts));
    const startRow = Math.max(0, Math.floor(camY / ts));
    const endRow = Math.min(WORLD_ROWS - 1, Math.ceil((camY + this.viewH) / ts));

    for (let row = startRow; row <= endRow; row++) {
      const sy = Math.round(row * ts - camY);
      for (let col = startCol; col <= endCol; col++) {
        this.drawTile(ctx, col, row, Math.round(col * ts - camX), sy, nowMs, profile);
      }
    }

    // Subtle shallow-water & snow step ripples
    this.drawStepRipples(ctx, camX, camY);

    // Draw touch-destination ring & path breadcrumbs on the ground layer
    this.drawTouchWayfinding(ctx, camX, camY, px, py, nowMs, profile, false);

    // Draw glowing rare-spawn / discovery nodes on encounter tiles
    for (let i = 0; i < this.rarePatches.length; i++) {
      const patch = this.rarePatches[i];
      if (patch.x < startCol || patch.x > endCol || patch.y < startRow || patch.y > endRow) continue;
      this.drawRarePatchOverlay(ctx, Math.round(patch.x * ts - camX), Math.round(patch.y * ts - camY), nowMs, patch.kind);
    }

    // Draw environmental landmarks
    for (let i = 0; i < LANDMARK_ENTRIES.length; i++) {
      const entry = LANDMARK_ENTRIES[i];
      if (entry.x < startCol || entry.x > endCol || entry.y < startRow || entry.y > endRow) continue;
      this.drawLandmark(ctx, Math.round(entry.x * ts - camX), Math.round(entry.y * ts - camY), entry.landmark, nowMs);
    }

    // Draw Secret Starlight Sky-Hop Arcade Cabinet
    if (
      SECRET_ARCADE_SPOT &&
      SECRET_ARCADE_SPOT.x >= startCol - 1 &&
      SECRET_ARCADE_SPOT.x <= endCol + 1 &&
      SECRET_ARCADE_SPOT.y >= startRow - 1 &&
      SECRET_ARCADE_SPOT.y <= endRow + 1
    ) {
      this.drawSecretArcadeCabinet(
        ctx,
        Math.round(SECRET_ARCADE_SPOT.x * ts - camX),
        Math.round(SECRET_ARCADE_SPOT.y * ts - camY),
        nowMs,
        profile,
      );
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

    // Collect visible NPCs, rivals, follower & player into pooled list for zero-alloc Y-sorted rendering
    const actors = this._renderActors;
    actors.length = 0;
    for (let i = 0; i < NPC_ENTRIES.length; i++) {
      const entry = NPC_ENTRIES[i];
      if (entry.x < startCol - 1 || entry.x > endCol + 1 || entry.y < startRow - 1 || entry.y > endRow + 1) continue;
      this._pushRenderActor('npc', entry.y, Math.round(entry.x * ts - camX), Math.round(entry.y * ts - camY), entry.npc, null, null);
    }
    for (let i = 0; i < RIVAL_ENTRIES.length; i++) {
      const entry = RIVAL_ENTRIES[i];
      if (entry.x < startCol - 1 || entry.x > endCol + 1 || entry.y < startRow - 1 || entry.y > endRow + 1) continue;
      this._pushRenderActor('rival', entry.y, Math.round(entry.x * ts - camX), Math.round(entry.y * ts - camY), null, entry.rival, null);
    }
    this._pushRenderActor('player', py, Math.round(px * ts - camX), Math.round(py * ts - camY), null, null, null);

    const lead = profile.team?.[0] || null;
    if (lead) {
      const followerActiveMove = Boolean(this.moving && this.followerMoving);
      const fx = followerActiveMove
        ? this.followerStartX + (this.followerTargetX - this.followerStartX) * this.moveProgress
        : this.followerX;
      const fy = followerActiveMove
        ? this.followerStartY + (this.followerTargetY - this.followerStartY) * this.moveProgress
        : this.followerY;
      this._pushRenderActor('follower', fy - 0.001, Math.round(fx * ts - camX), Math.round(fy * ts - camY), null, null, lead);
    }

    actors.sort(sortActorsByY);

    for (let i = 0; i < actors.length; i++) {
      const actor = actors[i];
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

    // Draw hold/drag-steering reticle & chevron on top overlay layer
    this.drawTouchWayfinding(ctx, camX, camY, px, py, nowMs, profile, true);

    // Draw luminous Starlight Warp beam & rune ring
    this._drawWarpBeam(ctx, camX, camY, nowMs);

    // Draw particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - camX, p.y - camY, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawWarpBeam(ctx, camX, camY, nowMs = 0) {
    if (!this._warpBeam) return;
    const { phase, x, y, life, maxLife } = this._warpBeam;
    const progress = Math.max(0, Math.min(1, life / (maxLife || 0.35)));
    const ts = this.tileSize;
    const cx = Math.round(x * ts + ts / 2 - camX);
    const cy = Math.round(y * ts + ts / 2 - camY);
    const isDepart = phase === 'depart';
    const alpha = isDepart
      ? Math.max(0.15, Math.sin(progress * Math.PI * 0.85 + 0.15))
      : Math.max(0, 1 - progress * progress);

    const pillarW = isDepart
      ? Math.max(4, 22 * (1 - progress * 0.55))
      : Math.max(6, 26 * (1 - progress * 0.72));
    const coreW = Math.max(2, pillarW * 0.42);
    const pillarTop = Math.max(0, cy - 150);
    const pillarHeight = cy + 12 - pillarTop;
    const ringRadius = isDepart
      ? 20 * (1 - progress * 0.7) + 4
      : 6 + progress * 22;

    ctx.save();
    ctx.globalAlpha = alpha * 0.34;
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(Math.round(cx - pillarW / 2), pillarTop, Math.round(pillarW), pillarHeight);

    ctx.globalAlpha = alpha * 0.42;
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(Math.round(cx - pillarW * 0.36), pillarTop, Math.round(pillarW * 0.72), pillarHeight);

    ctx.globalAlpha = alpha * 0.78;
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(Math.round(cx - coreW / 2), pillarTop, Math.round(coreW), pillarHeight);

    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = isDepart ? '#67e8f9' : '#fde047';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (typeof ctx.ellipse === 'function') {
      ctx.ellipse(cx, cy + 10, ringRadius, ringRadius * 0.42, 0, 0, Math.PI * 2);
    } else {
      ctx.arc(cx, cy + 10, ringRadius, 0, Math.PI * 2);
    }
    ctx.stroke();

    ctx.globalAlpha = alpha * 0.75;
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (typeof ctx.ellipse === 'function') {
      ctx.ellipse(cx, cy + 10, Math.max(3, ringRadius * 0.68), Math.max(1.5, ringRadius * 0.28), 0, 0, Math.PI * 2);
    } else {
      ctx.arc(cx, cy + 10, Math.max(3, ringRadius * 0.68), 0, Math.PI * 2);
    }
    ctx.stroke();

    const spin = progress * Math.PI * 2 + nowMs * 0.008;
    for (let i = 0; i < 4; i++) {
      const a = spin + (Math.PI / 2) * i;
      const sx = Math.round(cx + Math.cos(a) * ringRadius);
      const sy = Math.round(cy + 10 + Math.sin(a) * ringRadius * 0.42);
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#fde047';
      ctx.fillRect(sx - 1, sy - 1, 3, 3);
    }
    ctx.restore();
  }

  /**
   * Bind the 200x168 minimap canvas and build the cached offscreen base map once.
   * @param {HTMLCanvasElement|null} canvasEl
   */
  attachMinimapCanvas(canvasEl) {
    if (!canvasEl) {
      this.minimapCanvas = null;
      this.minimapCtx = null;
      return;
    }
    this.minimapCanvas = canvasEl;
    if (canvasEl.width !== MINIMAP_WIDTH) canvasEl.width = MINIMAP_WIDTH;
    if (canvasEl.height !== MINIMAP_HEIGHT) canvasEl.height = MINIMAP_HEIGHT;
    this.minimapCtx = canvasEl.getContext?.('2d') || null;
    if (!this._minimapBaseCanvas) {
      this._minimapBaseCanvas = this._buildMinimapBaseCanvas();
    }
  }

  _buildMinimapBaseCanvas() {
    if (this._minimapBaseCanvas) return this._minimapBaseCanvas;
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
      return null;
    }
    const offscreen = document.createElement('canvas');
    offscreen.width = MINIMAP_WIDTH;
    offscreen.height = MINIMAP_HEIGHT;
    const mctx = offscreen.getContext?.('2d');
    if (!mctx) return null;

    mctx.imageSmoothingEnabled = false;
    for (let y = 0; y < WORLD_ROWS; y++) {
      for (let x = 0; x < WORLD_COLS; x++) {
        const tile = WORLD_MAP[y][x];
        const biomeId = getBiomeAt(x, y).id;
        mctx.fillStyle = getMinimapTileColor(x, y, tile, biomeId);
        mctx.fillRect(x * MINIMAP_SCALE, y * MINIMAP_SCALE, MINIMAP_SCALE, MINIMAP_SCALE);
        if (tile === TILE.FLOWER) {
          mctx.fillStyle = BIOME_MINIMAP_PALETTE[biomeId]?.accent || '#f472b6';
          mctx.fillRect(x * MINIMAP_SCALE, y * MINIMAP_SCALE, 1, 1);
        }
      }
    }

    this._minimapBaseCanvas = offscreen;
    return offscreen;
  }

  /**
   * Render the live Starlight Universe minimap with landmarks, recommended zone, viewport box, and trainer pip.
   * @param {number} nowMs
   * @param {{ recommendedBiomeId?: string|null }} opts
   */
  renderMinimap(nowMs = 0, opts = {}) {
    const recommendedBiomeId = opts?.recommendedBiomeId || null;
    this._minimapRecommendedBiomeId = recommendedBiomeId;
    if (!this.minimapCanvas || !this.minimapCtx) return;

    const mctx = this.minimapCtx;
    const t = Number.isFinite(Number(nowMs)) ? Number(nowMs) : 0;
    if (!this._minimapBaseCanvas) {
      this._minimapBaseCanvas = this._buildMinimapBaseCanvas();
    }

    mctx.save?.();
    mctx.setTransform?.(1, 0, 0, 1, 0, 0);
    mctx.imageSmoothingEnabled = false;
    mctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    if (this._minimapBaseCanvas) {
      mctx.drawImage(this._minimapBaseCanvas, 0, 0);
    } else {
      mctx.fillStyle = '#0f172a';
      mctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);
    }

    const pulse = 0.5 + 0.5 * Math.sin(t * 0.005);

    // 1. Recommended farming biome highlight wash, perimeter border, and warp target star
    if (recommendedBiomeId && BIOMES[recommendedBiomeId]) {
      const shape = BIOME_MINIMAP_SHAPES[recommendedBiomeId];
      if (shape) {
        mctx.fillStyle = `rgba(250, 204, 21, ${(0.1 + pulse * 0.1).toFixed(3)})`;
        for (let i = 0; i < shape.spans.length; i++) {
          const s = shape.spans[i];
          mctx.fillRect(s.x * MINIMAP_SCALE, s.y * MINIMAP_SCALE, s.w * MINIMAP_SCALE, s.h * MINIMAP_SCALE);
        }
        mctx.strokeStyle = `rgba(253, 224, 71, ${(0.64 + pulse * 0.34).toFixed(3)})`;
        mctx.lineWidth = 1.5;
        mctx.beginPath();
        for (let i = 0; i < shape.edges.length; i++) {
          const [ex1, ey1, ex2, ey2] = shape.edges[i];
          const cx1 = ex1 <= 0 ? 0.75 : ex1 >= MINIMAP_WIDTH ? MINIMAP_WIDTH - 0.75 : ex1;
          const cy1 = ey1 <= 0 ? 0.75 : ey1 >= MINIMAP_HEIGHT ? MINIMAP_HEIGHT - 0.75 : ey1;
          const cx2 = ex2 <= 0 ? 0.75 : ex2 >= MINIMAP_WIDTH ? MINIMAP_WIDTH - 0.75 : ex2;
          const cy2 = ey2 <= 0 ? 0.75 : ey2 >= MINIMAP_HEIGHT ? MINIMAP_HEIGHT - 0.75 : ey2;
          mctx.moveTo(cx1, cy1);
          mctx.lineTo(cx2, cy2);
        }
        mctx.stroke();
      }

      const warp = getBiomeWarpPoint(recommendedBiomeId);
      const wx = warp.x * MINIMAP_SCALE + 1;
      const wy = warp.y * MINIMAP_SCALE + 1;
      mctx.fillStyle = '#0f172a';
      mctx.fillRect(wx - 2, wy - 2, 5, 5);
      mctx.fillStyle = '#fde047';
      mctx.fillRect(wx - 2, wy, 5, 1);
      mctx.fillRect(wx, wy - 2, 1, 5);
      mctx.fillStyle = '#ffffff';
      mctx.fillRect(wx, wy, 1, 1);
    }

    // 2. Key Landmarks: Starlight Village home marker, 15 Heal spots, 20 Shrines
    const homeX = 8 * MINIMAP_SCALE + 1;
    const homeY = 15 * MINIMAP_SCALE + 1;
    mctx.fillStyle = '#0f172a';
    mctx.fillRect(homeX - 2, homeY - 2, 5, 5);
    mctx.fillStyle = '#fde047';
    mctx.fillRect(homeX - 1, homeY - 1, 3, 3);
    mctx.fillStyle = '#ffffff';
    mctx.fillRect(homeX, homeY, 1, 1);

    for (let i = 0; i < HEAL_COORDS.length; i++) {
      const h = HEAL_COORDS[i];
      const hx = h.x * MINIMAP_SCALE;
      const hy = h.y * MINIMAP_SCALE;
      mctx.fillStyle = '#f472b6';
      mctx.fillRect(hx - 1, hy, 4, 2);
      mctx.fillRect(hx, hy - 1, 2, 4);
      mctx.fillStyle = '#ffffff';
      mctx.fillRect(hx, hy, 2, 2);
    }

    const profile = this.getProfile?.();
    const clearedSet = new Set(profile?.shrinesCleared || []);
    for (let i = 0; i < SHRINE_COORDS.length; i++) {
      const s = SHRINE_COORDS[i];
      const sx = s.x * MINIMAP_SCALE;
      const sy = s.y * MINIMAP_SCALE;
      mctx.fillStyle = '#0f172a';
      mctx.fillRect(sx - 1, sy - 1, 4, 4);
      mctx.fillStyle = clearedSet.has(s.id) ? '#4ade80' : '#c084fc';
      mctx.fillRect(sx, sy, 2, 2);
    }

    // 3. Subtle translucent camera viewport rectangle
    if (profile) {
      const cam = this._getCameraPosition(profile, this._minimapCamOut);
      const ts = this.tileSize || 32;
      const vx = (cam.camX / ts) * MINIMAP_SCALE;
      const vy = (cam.camY / ts) * MINIMAP_SCALE;
      const vw = (this.viewW / ts) * MINIMAP_SCALE;
      const vh = (this.viewH / ts) * MINIMAP_SCALE;

      mctx.fillStyle = 'rgba(248, 250, 252, 0.08)';
      mctx.fillRect(vx, vy, vw, vh);
      mctx.strokeStyle = 'rgba(248, 250, 252, 0.56)';
      mctx.lineWidth = 1;
      mctx.strokeRect(vx + 0.5, vy + 0.5, Math.max(1, vw - 1), Math.max(1, vh - 1));

      // 4. Live pulsing trainer marker at (px * 2 + 1, py * 2 + 1)
      const tx = cam.px * MINIMAP_SCALE + 1;
      const ty = cam.py * MINIMAP_SCALE + 1;
      const look = this._getResolvedTrainerLookCached(profile.trainerId || 'violet', profile.appearance);
      const accent = look?.accent || '#c084fc';
      const trainerPulse = 0.5 + 0.5 * Math.sin(t * 0.008);

      mctx.globalAlpha = 0.28 + trainerPulse * 0.14;
      mctx.fillStyle = accent;
      mctx.beginPath();
      mctx.arc(tx, ty, 3.4 + trainerPulse * 1.4, 0, Math.PI * 2);
      mctx.fill();

      mctx.globalAlpha = 0.65 + trainerPulse * 0.35;
      mctx.strokeStyle = accent;
      mctx.lineWidth = 1.25;
      mctx.beginPath();
      mctx.arc(tx, ty, 3.2 + trainerPulse * 1.8, 0, Math.PI * 2);
      mctx.stroke();

      mctx.globalAlpha = 1;
      mctx.fillStyle = '#0f172a';
      mctx.beginPath();
      mctx.arc(tx, ty, 2.6, 0, Math.PI * 2);
      mctx.fill();

      mctx.fillStyle = '#ffffff';
      mctx.beginPath();
      mctx.arc(tx, ty, 1.7, 0, Math.PI * 2);
      mctx.fill();

      mctx.fillStyle = '#fde047';
      mctx.fillRect(Math.round(tx - 0.5), Math.round(ty - 0.5), 1, 1);
    }

    mctx.restore?.();
  }

  /**
   * Diagnostics snapshot for minimap HUD tests and telemetry.
   */
  getMinimapState() {
    const profile = this.getProfile?.();
    const px = Number.isFinite(profile?.pos?.x) ? profile.pos.x : 8;
    const py = Number.isFinite(profile?.pos?.y) ? profile.pos.y : 15;
    return {
      attached: Boolean(this.minimapCanvas),
      baseCached: Boolean(this._minimapBaseCanvas),
      width: MINIMAP_WIDTH,
      height: MINIMAP_HEIGHT,
      recommendedBiomeId: this._minimapRecommendedBiomeId || null,
      trainerPos: { x: px, y: py },
      shrineCount: SHRINE_COORDS.length,
      healSpotCount: HEAL_COORDS.length,
    };
  }

  drawStepRipples(ctx, camX, camY) {
    if (!this.ripples.length) return;
    ctx.save();
    for (let i = 0; i < this.ripples.length; i++) {
      const r = this.ripples[i];
      const progress = Math.min(1, r.life / r.maxLife);
      const alpha = Math.max(0, 1 - progress);
      const cx = Math.round(r.x * this.tileSize + 16 - camX);
      const cy = Math.round(r.y * this.tileSize + 24 - camY);
      if (r.kind === 'water') {
        ctx.globalAlpha = alpha * 0.85;
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 4 + progress * 9, 2 + progress * 4, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (progress > 0.25) {
          ctx.globalAlpha = alpha * 0.65;
          ctx.strokeStyle = '#67e8f9';
          ctx.beginPath();
          ctx.ellipse(cx, cy, 2 + progress * 5, 1 + progress * 2.2, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (r.kind === 'sand') {
        ctx.globalAlpha = alpha * 0.36;
        ctx.fillStyle = '#92400e';
        ctx.fillRect(cx - 5, cy - 1, 3, 2);
        ctx.fillRect(cx + 2, cy + 1, 3, 2);
        ctx.globalAlpha = alpha * 0.55;
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 1, 4 + progress * 5, 2 + progress * 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.globalAlpha = alpha * 0.4;
        ctx.fillStyle = '#64748b';
        ctx.fillRect(cx - 5, cy - 1, 3, 2);
        ctx.fillRect(cx + 2, cy + 1, 3, 2);
        ctx.globalAlpha = alpha * 0.72;
        ctx.strokeStyle = '#f8fafc';
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
    const bandColors = AURORA_BAND_COLORS[biomeId];
    if (bandColors) {
      // Soft dancing northern aurora ribbons (or cosmic/Terastal/pastel ribbons)
      const canGrad = typeof ctx.createLinearGradient === 'function';
      if (
        canGrad &&
        (!this._auroraGrads || this._auroraGradBiome !== biomeId || this._auroraGradW !== this.viewW || this._auroraGradCtx !== ctx)
      ) {
        this._auroraGrads = [];
        for (let b = 0; b < bandColors.length; b++) {
          const grad = ctx.createLinearGradient(0, 0, this.viewW, 0);
          grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
          grad.addColorStop(0.3 + b * 0.1, bandColors[b]);
          grad.addColorStop(0.75, bandColors[(b + 1) % bandColors.length]);
          grad.addColorStop(1, 'rgba(192, 132, 252, 0)');
          this._auroraGrads.push(grad);
        }
        this._auroraGradBiome = biomeId;
        this._auroraGradW = this.viewW;
        this._auroraGradCtx = ctx;
      }
      for (let b = 0; b < bandColors.length; b++) {
        const waveY = 14 + b * 14 + Math.sin(nowMs * 0.0014 + b * 1.7) * 8;
        const shiftX = Math.sin(nowMs * 0.0009 + b * 2.1) * 28;
        ctx.fillStyle = canGrad ? this._auroraGrads[b] : bandColors[b];
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
    sx = Math.round(sx);
    sy = Math.round(sy);
    const tile = WORLD_MAP[ty][tx];
    const ts = this.tileSize;
    const h = hash2d(tx, ty);
    const tileBiomeId = getBiomeAt(tx, ty).id;

    // Base ground layer (only for tiles that don't fill the full ts x ts bounds in their switch case)
    if (tile === TILE.SHALLOW_WATER) {
      ctx.fillStyle = tileBiomeId === 'volcano'
        ? '#3b1f1e'
        : tileBiomeId === 'marsh'
          ? '#0d4a44'
          : tileBiomeId === 'sanctum'
            ? '#1e1b4b'
            : '#f3d999';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tile === TILE.SNOW_GRASS) {
      ctx.fillStyle = '#dbeafe';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tile === TILE.MARSH_GRASS || tile === TILE.MARSH_WALL) {
      ctx.fillStyle = '#114239';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tile === TILE.CANYON_GRASS) {
      ctx.fillStyle = '#b9772c';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tile === TILE.FAE_GRASS || tile === TILE.FAE_WALL) {
      ctx.fillStyle = '#382a54';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (tile === TILE.CROWN_GRASS) {
      ctx.fillStyle = '#293548';
      ctx.fillRect(sx, sy, ts, ts);
    } else if (
      tile === TILE.GRASS ||
      tile === TILE.TALL_GRASS ||
      tile === TILE.TREE ||
      tile === TILE.FLOWER ||
      tile === TILE.SIGN ||
      tile === TILE.SHRINE ||
      tile === TILE.CHEST ||
      tile === TILE.RUNE_TRAIL ||
      tile === TILE.LANTERN ||
      tile === TILE.GROVE_GRASS ||
      (tile === TILE.HEAL && tileBiomeId !== 'village')
    ) {
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
        const sway = Math.round(Math.sin(nowMs * 0.0045 + tx * 0.7 + ty * 0.5) * 1.8);
        const sway2 = Math.round(sway * 0.7);
        const rustle = this.rustleTile && this.rustleTile.x === tx && this.rustleTile.y === ty ? 3 : 0;
        ctx.fillStyle = '#4ade80';
        for (let i = 0; i < 4; i++) {
          const bx = sx + 4 + i * 7;
          ctx.fillRect(bx + sway + (i % 2 ? rustle : -rustle), sy + 6, 4, 10);
          ctx.fillRect(bx - sway2, sy + 18, 4, 10);
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
        const wave = Math.round(Math.sin(nowMs * 0.004 + tx * 0.8 + ty * 0.6) * 2.5);
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
        const shimmer = Math.round(Math.sin(nowMs * 0.005 + tx * 1.1 + ty) * 2);
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
        const flow = Math.round(Math.sin(nowMs * 0.0038 + tx * 0.9 + ty * 0.7) * 3);
        const halfFlow = Math.round(flow * 0.5);
        const glow = 0.7 + 0.3 * Math.sin(nowMs * 0.005 + tx + ty * 1.3);
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(sx + 3 + halfFlow, sy + 5, 13, 6);
        ctx.fillRect(sx + 13 - halfFlow, sy + 19, 14, 6);
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
        const sway = Math.round(Math.sin(nowMs * 0.004 + tx * 0.8 + ty * 0.6) * 1.5);
        const sway2 = Math.round(sway * 0.7);
        const rustle = this.rustleTile && this.rustleTile.x === tx && this.rustleTile.y === ty ? 3 : 0;
        ctx.fillStyle = '#38bdf8';
        for (let i = 0; i < 4; i++) {
          const bx = sx + 4 + i * 7;
          ctx.fillRect(bx + sway + (i % 2 ? rustle : -rustle), sy + 6, 4, 9);
          ctx.fillRect(bx - sway2, sy + 18, 4, 9);
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
                                : '#38bdf8';
        ctx.fillRect(sx + 11, sy + 14, 10, 4);
        ctx.fillRect(sx + 14, sy + 11, 4, 10);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(sx + 14, sy + 14, 4, 4);
        ctx.globalAlpha = 1;
        break;
      }

      case TILE.LANTERN: {
        const haloPulse = 0.24 + 0.12 * Math.sin(nowMs * 0.005 + tx * 0.9 + ty);
        ctx.globalAlpha = haloPulse;
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(sx + 16, sy + 13, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
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
        if (SECRET_ARCADE_SPOT && tx === SECRET_ARCADE_SPOT.x && ty === SECRET_ARCADE_SPOT.y) {
          const arcadeUnlocked = Boolean(this.getProfile?.()?.arcade?.unlocked);
          if (arcadeUnlocked) {
            // Cozy timber alcove recess behind the Secret Starlight Arcade Cabinet
            ctx.fillStyle = '#78350f';
            ctx.fillRect(sx + 3, sy + 1, ts - 6, ts - 1);
            ctx.fillStyle = '#fef3c7';
            ctx.fillRect(sx + 4, sy + 2, ts - 8, ts - 6);
          } else {
            // Disguised cottage plaster wall with subtle hidden panel seam
            ctx.fillStyle = 'rgba(100, 116, 139, 0.35)';
            ctx.fillRect(sx + 5, sy + 4, 1, ts - 8);
            ctx.fillRect(sx + ts - 6, sy + 4, 1, ts - 8);
            ctx.fillRect(sx + 5, sy + 4, ts - 10, 1);
          }
        } else if (tx === 4 || tx === 13) {
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
        const sway = Math.round(Math.sin(nowMs * 0.005 + tx) * 1.2);
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
        const shrine = SHRINE_BY_TILE_INDEX.get(ty * WORLD_COLS + tx);
        const cleared = shrine && Boolean(profile?.shrinesCleared?.includes(shrine.id));
        ctx.fillStyle = '#475569';
        ctx.fillRect(sx + 4, sy + 18, 24, 12);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(sx + 7, sy + 14, 18, 6);
        const bob = Math.round(Math.sin(nowMs * 0.006) * 2.5);
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
        const chest = CHEST_BY_TILE_INDEX.get(ty * WORLD_COLS + tx);
        const opened = chest && Boolean(profile?.chestsOpened?.includes(chest.id));
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
        const sway = Math.round(Math.sin(nowMs * 0.0042 + tx * 0.75 + ty * 0.55) * 1.7);
        const sway2 = Math.round(sway * 0.7);
        const swaySmall = Math.round(sway * 0.4);
        const rustle = this.rustleTile && this.rustleTile.x === tx && this.rustleTile.y === ty ? 3 : 0;
        ctx.fillStyle = '#34d399';
        for (let i = 0; i < 4; i++) {
          const bx = sx + 4 + i * 7;
          ctx.fillRect(bx + sway + (i % 2 ? rustle : -rustle), sy + 6, 4, 9);
          ctx.fillRect(bx - sway2, sy + 18, 4, 9);
        }
        ctx.fillStyle = '#065f46';
        ctx.fillRect(sx + 3, sy + 15, ts - 6, 2);
        ctx.fillStyle = h > 0.45 ? '#f9a8d4' : '#fbcfe8';
        ctx.fillRect(sx + 6 + swaySmall, sy + 8, 3, 3);
        ctx.fillRect(sx + 20 - swaySmall, sy + 20, 3, 3);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(sx + 7 + swaySmall, sy + 9, 1, 1);
        ctx.fillRect(sx + 21 - swaySmall, sy + 21, 1, 1);
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
        ctx.globalAlpha = 0.35 + 0.3 * Math.sin(nowMs * 0.004 + tx * 0.9 + ty * 1.1);
        ctx.fillStyle = '#67e8f9';
        ctx.fillRect(sx + 15, sy + 3, 2, 26);
        ctx.fillRect(sx + 3, sy + 15, 26, 2);
        ctx.globalAlpha = 1;
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
        const shift = Math.round(Math.sin(nowMs * 0.0035 + tx * 0.7 + ty * 0.4) * 1.4);
        const rustle = this.rustleTile && this.rustleTile.x === tx && this.rustleTile.y === ty ? 3 : 0;
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
        const sway = Math.round(Math.sin(nowMs * 0.0044 + tx * 0.7 + ty * 0.6) * 1.6);
        const sway2 = Math.round(sway * 0.7);
        const rustle = this.rustleTile && this.rustleTile.x === tx && this.rustleTile.y === ty ? 3 : 0;
        ctx.fillStyle = '#2dd4bf';
        for (let i = 0; i < 4; i++) {
          const bx = sx + 4 + i * 7;
          ctx.fillRect(bx + sway + (i % 2 ? rustle : -rustle), sy + 6, 4, 9);
          ctx.fillRect(bx - sway2, sy + 18, 4, 9);
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
        ctx.globalAlpha = 0.45 + 0.35 * Math.sin(nowMs * 0.0045 + tx + ty);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(sx + 15, sy + 2, 2, 28);
        ctx.fillRect(sx + 2, sy + 15, 28, 2);
        ctx.globalAlpha = 1;
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
        const sway = Math.round(Math.sin(nowMs * 0.0048 + tx * 0.75 + ty * 0.5) * 1.8);
        const sway2 = Math.round(sway * 0.7);
        const rustle = this.rustleTile && this.rustleTile.x === tx && this.rustleTile.y === ty ? 3 : 0;
        ctx.fillStyle = '#eab308';
        for (let i = 0; i < 4; i++) {
          const bx = sx + 4 + i * 7;
          ctx.fillRect(bx + sway + (i % 2 ? rustle : -rustle), sy + 6, 4, 10);
          ctx.fillRect(bx - sway2, sy + 18, 4, 10);
        }
        ctx.fillStyle = '#fde047';
        for (let i = 0; i < 4; i++) {
          const bx = sx + 5 + i * 7;
          ctx.fillRect(bx + sway, sy + 6, 2, 4);
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
        const wave = Math.round(Math.sin(nowMs * 0.0046 + tx * 0.9 + ty * 0.7) * 2.2);
        const rustle = this.rustleTile && this.rustleTile.x === tx && this.rustleTile.y === ty ? 3 : 0;
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
        ctx.globalAlpha = 0.55 + 0.4 * Math.sin(nowMs * 0.0055 + tx + ty);
        ctx.fillStyle = '#e879f9';
        ctx.fillRect(sx + 15, sy + 2, 2, 28);
        ctx.fillRect(sx + 2, sy + 15, 28, 2);
        ctx.globalAlpha = 1;
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
        const sway = Math.round(Math.sin(nowMs * 0.0044 + tx * 0.8 + ty * 0.55) * 1.7);
        const sway2 = Math.round(sway * 0.7);
        const swaySmall = Math.round(sway * 0.4);
        const rustle = this.rustleTile && this.rustleTile.x === tx && this.rustleTile.y === ty ? 3 : 0;
        ctx.fillStyle = '#6ee7b7';
        for (let i = 0; i < 4; i++) {
          const bx = sx + 4 + i * 7;
          ctx.fillRect(bx + sway + (i % 2 ? rustle : -rustle), sy + 6, 4, 9);
          ctx.fillRect(bx - sway2, sy + 18, 4, 9);
        }
        const bloom = 0.6 + 0.4 * Math.sin(nowMs * 0.0055 + tx + ty);
        ctx.globalAlpha = bloom;
        ctx.fillStyle = h > 0.5 ? '#f9a8d4' : '#e879f9';
        ctx.fillRect(sx + 6 + swaySmall, sy + 8, 4, 3);
        ctx.fillRect(sx + 20 - swaySmall, sy + 20, 4, 3);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(sx + 7 + swaySmall, sy + 9, 2, 1);
        ctx.fillRect(sx + 21 - swaySmall, sy + 21, 2, 1);
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
        ctx.globalAlpha = 0.4 + 0.35 * Math.sin(nowMs * 0.0045 + tx + ty);
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(sx + 15, sy + 2, 2, 28);
        ctx.fillRect(sx + 2, sy + 15, 28, 2);
        ctx.globalAlpha = 1;
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
        const shift = Math.round(Math.sin(nowMs * 0.0038 + tx * 0.7 + ty * 0.5) * 1.4);
        const rustle = this.rustleTile && this.rustleTile.x === tx && this.rustleTile.y === ty ? 3 : 0;
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
        const sway = Math.round(Math.sin(nowMs * 0.0046 + tx * 0.75 + ty * 0.5) * 1.7);
        const sway2 = Math.round(sway * 0.7);
        const swaySmall = Math.round(sway * 0.4);
        const rustle = this.rustleTile && this.rustleTile.x === tx && this.rustleTile.y === ty ? 3 : 0;
        ctx.fillStyle = '#2dd4bf';
        for (let i = 0; i < 4; i++) {
          const bx = sx + 4 + i * 7;
          ctx.fillRect(bx + sway + (i % 2 ? rustle : -rustle), sy + 6, 4, 10);
          ctx.fillRect(bx - sway2, sy + 18, 4, 10);
        }
        ctx.fillStyle = h > 0.5 ? '#c084fc' : '#e2e8f0';
        ctx.fillRect(sx + 6 + swaySmall, sy + 7, 3, 3);
        ctx.fillRect(sx + 21 - swaySmall, sy + 19, 3, 3);
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
        ctx.globalAlpha = 0.55 + 0.4 * Math.sin(nowMs * 0.0055 + tx + ty);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(sx + 15, sy + 2, 2, 28);
        ctx.fillRect(sx + 2, sy + 15, 28, 2);
        ctx.globalAlpha = 1;
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

  drawRarePatchOverlay(ctx, sx, sy, nowMs, kind = 'shimmer') {
    sx = Math.round(sx);
    sy = Math.round(sy);
    const ts = this.tileSize;
    const pulse = 0.55 + 0.45 * Math.sin(nowMs * 0.01);
    const aurora = 0.5 + 0.5 * Math.cos(nowMs * 0.007 + sx * 0.05);
    ctx.save();

    if (kind === 'starfall') {
      // Sparkling fallen meteor crystal node
      ctx.globalAlpha = 0.12 + aurora * 0.14;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(sx + 16, sy + 16, 13, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.6 + pulse * 0.35;
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(sx + 16, sy + 16, 11 + pulse * 1.6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 1;
      const bob = Math.round(Math.sin(nowMs * 0.0065 + sx * 0.1) * 2.2);
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(sx + 16, sy + 6 + bob);
      ctx.lineTo(sx + 23, sy + 15 + bob);
      ctx.lineTo(sx + 16, sy + 24 + bob);
      ctx.lineTo(sx + 9, sy + 15 + bob);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#67e8f9';
      ctx.beginPath();
      ctx.moveTo(sx + 16, sy + 8 + bob);
      ctx.lineTo(sx + 20, sy + 15 + bob);
      ctx.lineTo(sx + 16, sy + 21 + bob);
      ctx.lineTo(sx + 12, sy + 15 + bob);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx + 14, sy + 11 + bob, 2, 3);
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(sx + 6, sy + 8, 3, 1);
      ctx.fillRect(sx + 7, sy + 7, 1, 3);
      ctx.fillRect(sx + 23, sy + 22, 3, 1);
      ctx.fillRect(sx + 24, sy + 21, 1, 3);
      ctx.restore();
      return;
    }

    if (kind === 'mystery_cry') {
      // Musical glowing rustle node
      ctx.globalAlpha = 0.14 + aurora * 0.12;
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(sx + 3, sy + 3, ts - 6, ts - 6);

      ctx.globalAlpha = 0.55 + pulse * 0.4;
      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(sx + 16, sy + 17, 11 + pulse * 1.5, 9 + pulse * 1.2, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 1;
      // Floating pixel music notes
      for (let i = 0; i < 2; i++) {
        const phase = nowMs * 0.0055 + i * 2.1;
        const nx = Math.round(sx + 10 + i * 11 + Math.sin(phase) * 2);
        const ny = Math.round(sy + 18 - ((phase % 2.4) / 2.4) * 11);
        ctx.fillStyle = MYSTERY_NOTE_COLORS[i];
        ctx.fillRect(nx, ny + 4, 4, 3);
        ctx.fillRect(nx + 3, ny - 2, 2, 7);
        ctx.fillRect(nx + 3, ny - 2, 5, 2);
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx + 7, sy + 22, 2, 2);
      ctx.fillRect(sx + 23, sy + 9, 2, 2);
      ctx.restore();
      return;
    }

    ctx.globalAlpha = 0.08 + aurora * 0.1;
    ctx.fillStyle = '#67e8f9';
    ctx.fillRect(sx + 3, sy + 3, ts - 6, ts - 6);

    ctx.globalAlpha = 0.55 + pulse * 0.42;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 2, sy + 2, ts - 4, ts - 4);

    // Subtle aurora corner glints
    ctx.globalAlpha = 0.45 + aurora * 0.45;
    ctx.fillStyle = '#67e8f9';
    ctx.fillRect(sx + 2, sy + 2, 3, 3);
    ctx.fillRect(sx + ts - 5, sy + 2, 3, 3);
    ctx.globalAlpha = 1;

    // Shimmering gold & aurora star sparkles dancing over the rustling patch
    for (let i = 0; i < 4; i++) {
      const phase = nowMs * 0.0065 + i * 1.65;
      const rx = Math.round(sx + 7 + ((i * 7 + Math.sin(phase) * 4) % 18));
      const ry = Math.round(sy + 20 - Math.abs(Math.cos(phase * 1.15)) * 15);
      ctx.fillStyle = SPARKLE_COLORS[i];
      ctx.fillRect(rx - 1, ry, 3, 1);
      ctx.fillRect(rx, ry - 1, 1, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rx, ry, 1, 1);
    }
    ctx.restore();
  }

  drawSecretArcadeCabinet(ctx, sx, sy, nowMs = 0, profile = null) {
    sx = Math.round(sx);
    sy = Math.round(sy);
    const unlocked = Boolean(profile?.arcade?.unlocked);
    const attuned = Boolean(
      (profile?.badges?.length || 0) >= 1 ||
      Object.keys(profile?.pokedex?.caught || {}).length >= 5,
    );
    const charges = profile?.arcade?.charges === undefined
      ? (unlocked ? 3 : 0)
      : (Number(profile.arcade.charges) || 0);
    const pulse = 0.55 + 0.45 * Math.sin(nowMs * 0.006);
    ctx.save();

    if (!unlocked) {
      // Disguised cottage wall panel with tiny star-etched seam until unlocked
      if (attuned) {
        ctx.globalAlpha = 0.14 + pulse * 0.16;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(sx + 16, sy + 15, 10, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = attuned ? 0.55 + pulse * 0.35 : 0.36;
      ctx.fillStyle = attuned ? '#0284c7' : '#94a3b8';
      ctx.fillRect(sx + 7, sy + 6, 18, 1);
      ctx.fillRect(sx + 7, sy + 6, 1, 20);
      ctx.fillRect(sx + 24, sy + 6, 1, 20);
      ctx.fillRect(sx + 7, sy + 25, 18, 1);

      // Tiny etched 4-point star rune at (sx + 16, sy + 15)
      const cx = sx + 16;
      const cy = sy + 15;
      ctx.globalAlpha = attuned ? 0.65 + pulse * 0.35 : 0.42 + pulse * 0.14;
      ctx.fillStyle = attuned ? '#fde047' : '#cbd5e1';
      ctx.fillRect(cx - 2, cy, 5, 1);
      ctx.fillRect(cx, cy - 2, 1, 5);
      ctx.fillStyle = attuned ? '#67e8f9' : '#94a3b8';
      ctx.fillRect(cx, cy, 1, 1);

      if (attuned) {
        const sparkY = Math.round(sy + 4 - Math.abs(Math.sin(nowMs * 0.005)) * 2);
        ctx.globalAlpha = 0.5 + pulse * 0.45;
        ctx.fillStyle = '#fde047';
        ctx.fillRect(sx + 15, sparkY, 3, 1);
        ctx.fillRect(sx + 16, sparkY - 1, 1, 3);
      }

      ctx.restore();
      return;
    }

    const powered = charges > 0;
    const badgeUnlocked = true;

    // Soft ambient arcade glow halo behind facade
    ctx.globalAlpha = powered ? (0.18 + pulse * 0.16) : (0.14 + pulse * 0.12);
    ctx.fillStyle = powered ? '#67e8f9' : '#facc15';
    ctx.beginPath();
    ctx.arc(sx + 16, sy + 17, 15, 0, Math.PI * 2);
    ctx.fill();

    // Cozy timber alcove frame tucked into cottage wall
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#78350f';
    ctx.fillRect(sx + 4, sy + 2, 24, 28);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(sx + 5, sy + 3, 22, 26);

    // Base ground shadow
    ctx.globalAlpha = 0.36;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(sx + 5, sy + 28, 22, 4);
    ctx.globalAlpha = 1;

    // Arcade cabinet silhouette & side molding
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(sx + 6, sy + 4, 20, 25);
    ctx.fillStyle = '#312e81';
    ctx.fillRect(sx + 7, sy + 5, 18, 23);

    // Top Glowing Marquee Header (brass bezel + animated starlight marquee strip)
    ctx.fillStyle = '#eab308';
    ctx.fillRect(sx + 6, sy + 4, 20, 6);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(sx + 7, sy + 4, 18, 5);

    ctx.globalAlpha = 0.25 + pulse * 0.28;
    ctx.fillStyle = powered ? '#38bdf8' : '#fb923c';
    ctx.fillRect(sx + 6, sy + 3, 20, 8);
    ctx.globalAlpha = 1;

    ctx.fillStyle = powered ? '#0284c7' : '#c2410c';
    ctx.fillRect(sx + 8, sy + 5, 16, 4);
    ctx.fillStyle = powered ? '#38bdf8' : '#fb923c';
    ctx.fillRect(sx + 9, sy + 6, 14, 2);

    // Crisp pixel marquee title lettering & star emblem
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx + 10, sy + 6, 2, 2);
    ctx.fillRect(sx + 13, sy + 6, 2, 1);
    ctx.fillRect(sx + 16, sy + 6, 2, 2);
    ctx.fillRect(sx + 19, sy + 6, 3, 1);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(sx + 15, sy + 5, 2, 1);

    // Recessed CRT Screen Bezel + Live Sky-Hop Attract Animation
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(sx + 8, sy + 11, 16, 9);
    ctx.fillStyle = powered ? '#0e7490' : '#3730a3';
    ctx.fillRect(sx + 9, sy + 12, 14, 7);
    ctx.fillStyle = powered ? '#0891b2' : '#4338ca';
    ctx.fillRect(sx + 10, sy + 13, 12, 5);

    // Subtle CRT glass reflection glint
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(sx + 10, sy + 12, 4, 1);
    ctx.fillRect(sx + 10, sy + 13, 1, 2);
    ctx.globalAlpha = 1;

    // Animated starlight pixel sprite on cabinet screen
    const hopY = Math.round(Math.sin(nowMs * 0.008) * 1.4);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(sx + 12, sy + 15 + hopY, 3, 2);
    ctx.fillStyle = powered ? '#f472b6' : '#fef08a';
    ctx.fillRect(sx + 18, sy + 14 - hopY, 2, 2);

    // Angled Control Deck with Joystick & Glowing Arcade Buttons
    ctx.fillStyle = '#4338ca';
    ctx.fillRect(sx + 7, sy + 20, 18, 4);
    ctx.fillStyle = '#6366f1';
    ctx.fillRect(sx + 8, sy + 20, 16, 1);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(sx + 10, sy + 20, 1, 2);
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(sx + 9, sy + 19, 3, 2);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(sx + 16, sy + 21, 2, 2);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(sx + 19, sy + 21, 2, 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(sx + 22, sy + 21, 2, 2);

    // Cabinet Coin Door & Illuminated Star Slot
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(sx + 8, sy + 24, 16, 5);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(sx + 12, sy + 25, 8, 3);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(sx + 13, sy + 26, 6, 1);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(sx + 15, sy + 26, 2, 1);

    // Subtle Golden Starlight Badge once profile.arcade?.unlocked is true
    if (badgeUnlocked) {
      const bx = sx + 22;
      const by = sy + 1;
      ctx.fillStyle = '#b45309';
      ctx.fillRect(bx, by, 7, 7);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(bx + 1, by + 1, 5, 5);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(bx + 2, by + 2, 3, 3);
      ctx.globalAlpha = 0.7 + pulse * 0.3;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx + 2, by + 3, 3, 1);
      ctx.fillRect(bx + 3, by + 2, 1, 3);
      ctx.globalAlpha = 1;
    } else {
      // Subtle mystery spark above locked cabinet
      const sparkY = Math.round(sy + 1 - Math.abs(Math.sin(nowMs * 0.005)) * 2);
      ctx.globalAlpha = 0.5 + pulse * 0.4;
      ctx.fillStyle = powered ? '#67e8f9' : '#fde047';
      ctx.fillRect(sx + 15, sparkY, 3, 1);
      ctx.fillRect(sx + 16, sparkY - 1, 1, 3);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  drawTouchWayfinding(ctx, camX, camY, px, py, nowMs, profile, overlayLayer = false) {
    const ts = this.tileSize;
    if (!overlayLayer) {
      if (!this.touchDestination) return;
      const pulse = 0.5 + 0.5 * Math.sin(nowMs * 0.009);
      const ringHex = this.touchDestination.isInteract ? '#facc15' : '#67e8f9';
      ctx.save();

      // Breadcrumb dots along autoPath
      if (this.autoPath.length > 0) {
        let bx = this.moving ? this.moveTargetX : profile.pos.x;
        let by = this.moving ? this.moveTargetY : profile.pos.y;
        ctx.globalAlpha = 0.72;
        ctx.fillStyle = ringHex;
        if (this.moving) {
          ctx.beginPath();
          ctx.arc(Math.round(bx * ts + 16 - camX), Math.round(by * ts + 16 - camY), 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        for (let i = 0; i < this.autoPath.length - 1; i++) {
          const vec = DIR_VEC[this.autoPath[i]];
          if (!vec) break;
          bx += vec.dx;
          by += vec.dy;
          ctx.beginPath();
          ctx.arc(Math.round(bx * ts + 16 - camX), Math.round(by * ts + 16 - camY), 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Pulsing Starlight Destination Ring
      const destX = Math.round(this.touchDestination.x * ts + 16 - camX);
      const destY = Math.round(this.touchDestination.y * ts + 16 - camY);
      ctx.globalAlpha = 0.58 + pulse * 0.38;
      ctx.strokeStyle = ringHex;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(destX, destY, 9 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 0.16 + pulse * 0.12;
      ctx.fillStyle = ringHex;
      ctx.beginPath();
      ctx.arc(destX, destY, 6 + pulse * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Subtle golden focus corners on autoInteractTarget
      if (this.autoInteractTarget) {
        const ix = Math.round(this.autoInteractTarget.x * ts - camX);
        const iy = Math.round(this.autoInteractTarget.y * ts - camY);
        ctx.globalAlpha = 0.65 + pulse * 0.35;
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.strokeRect(ix + 3, iy + 3, ts - 6, ts - 6);
      }

      ctx.restore();
      return;
    }

    // Overlay layer: hold/drag-steering reticle & directional chevron
    if (!this.touchSteerActive) return;
    ctx.save();
    const playerCx = Math.round(px * ts + 16 - camX);
    const playerCy = Math.round(py * ts + 16 - camY);
    const pulse = 0.55 + 0.45 * Math.sin(nowMs * 0.012);

    if (this.touchSteerDir && DIR_VEC[this.touchSteerDir]) {
      const vec = DIR_VEC[this.touchSteerDir];
      const chevX = playerCx + vec.dx * 19;
      const chevY = playerCy + vec.dy * 19;
      ctx.globalAlpha = 0.65 + pulse * 0.3;
      ctx.fillStyle = '#67e8f9';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (this.touchSteerDir === 'right') {
        ctx.moveTo(chevX + 5, chevY);
        ctx.lineTo(chevX - 3, chevY - 5);
        ctx.lineTo(chevX - 3, chevY + 5);
      } else if (this.touchSteerDir === 'left') {
        ctx.moveTo(chevX - 5, chevY);
        ctx.lineTo(chevX + 3, chevY - 5);
        ctx.lineTo(chevX + 3, chevY + 5);
      } else if (this.touchSteerDir === 'up') {
        ctx.moveTo(chevX, chevY - 5);
        ctx.lineTo(chevX - 5, chevY + 3);
        ctx.lineTo(chevX + 5, chevY + 3);
      } else {
        ctx.moveTo(chevX, chevY + 5);
        ctx.lineTo(chevX - 5, chevY - 3);
        ctx.lineTo(chevX + 5, chevY - 3);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (this._pointerState) {
      const { canvasX, canvasY } = this.screenToWorldTile(
        this._pointerState.clientX,
        this._pointerState.clientY,
      );
      ctx.globalAlpha = 0.48 + pulse * 0.35;
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 11 + pulse * 2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#67e8f9';
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 4, 0, Math.PI * 2);
      ctx.fill();
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
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#facc15';
      ctx.fillRect(sx + 8, floatY - 1, 16, 13);
      ctx.globalAlpha = 1;
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
      for (let i = 0; i < ANTLER_BLOSSOM_COORDS.length; i++) {
        const [bx, by] = ANTLER_BLOSSOM_COORDS[i];
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
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = look.aura === 'hearts'
      ? '#f472b6'
      : look.aura === 'lightning'
        ? '#38bdf8'
        : look.aura === 'blossom'
          ? '#fb7185'
          : look.aura === 'cosmic'
            ? '#2dd4bf'
            : '#facc15';
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
    const look = this._getResolvedTrainerLookCached(trainerId, appearance);
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
      ctx.globalAlpha = shiny ? (pulse + 0.15) : pulse;
      ctx.strokeStyle = shiny
        ? '#facc15'
        : upgradeTier >= 4
          ? '#facc15'
          : upgradeTier >= 2
            ? '#c084fc'
            : '#67e8f9';
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
