import {
  BADGES,
  BIOMES,
  EVOLUTION_ITEMS,
  EVOLUTIONS,
  GAME_META,
  SHRINES,
  SPECIES,
  STARTER_IDS,
  TRAINERS,
  TRAINER_ACCESSORIES,
  TRAINER_AURAS,
  TRAINER_STYLES,
  WORLD_COLS,
  WORLD_MAP,
  WORLD_ROWS,
  findNearestSafePosition,
  isTileWalkableAt,
} from './config.js';
import { Pokemon, createStarterPokemon } from './pokemon.js';

export const STORAGE_KEY = 'starlight_pokemon_save_v1';

const SOLID_TILE_IDS = new Set([3, 4, 8, 11, 12, 14, 16, 17, 18, 21, 25]);
const VALID_DIRS = new Set(['up', 'down', 'left', 'right']);
const VALID_PACES = new Set(['cinema', 'classic', 'fast']);

const SPECIES_ID_BY_NAME = new Map(
  Object.values(SPECIES || {}).map((sp) => [String(sp.name).trim().toLowerCase(), Number(sp.id)]),
);

const DIRECT_ENCOUNTER_IDS = new Set(
  [
    ...Object.values(BIOMES || {}).flatMap((b) => (b?.encounters || []).map((e) => Number(e?.id))),
    ...Object.values(SHRINES || {}).map((s) => Number(s?.guardianId)),
    ...(STARTER_IDS || []).map(Number),
  ].filter((id) => Number.isInteger(id) && Boolean(SPECIES[id])),
);

const PARENTS_BY_SPECIES = new Map();
for (const [fromKey, rules] of Object.entries(EVOLUTIONS || {})) {
  const fromId = Number(fromKey);
  if (!SPECIES[fromId] || !Array.isArray(rules)) continue;
  for (const rule of rules) {
    const toId = Number(rule?.to);
    if (!SPECIES[toId]) continue;
    const list = PARENTS_BY_SPECIES.get(toId) || [];
    if (!list.includes(fromId)) {
      list.push(fromId);
      PARENTS_BY_SPECIES.set(toId, list);
    }
  }
}

const SHRINE_BY_ID = new Map(
  Object.values(SHRINES || {})
    .filter((shrine) => shrine && shrine.id)
    .map((shrine) => [String(shrine.id), shrine]),
);

export function resolveSpeciesId(raw) {
  if (typeof raw === 'number') {
    return Number.isInteger(raw) && SPECIES[raw] ? raw : null;
  }
  if (typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  const noHash = trimmed.startsWith('#') ? trimmed.slice(1).trim() : trimmed;
  if (/^\d+$/.test(noHash)) {
    const num = Number(noHash);
    return Number.isSafeInteger(num) && SPECIES[num] ? num : null;
  }

  const byName = SPECIES_ID_BY_NAME.get(trimmed.toLowerCase());
  return byName !== undefined && SPECIES[byName] ? byName : null;
}

function isPlainObject(val) {
  return Boolean(val) && typeof val === 'object' && !Array.isArray(val);
}

function computeSyncedPokedexState(profile) {
  const rawPokedex = isPlainObject(profile?.pokedex) ? profile.pokedex : null;
  const rawCaught = rawPokedex?.caught;
  const rawSeen = rawPokedex?.seen;

  const caught = {};
  if (Array.isArray(rawCaught)) {
    for (const item of rawCaught) {
      const id = resolveSpeciesId(item);
      if (id !== null) {
        caught[id] = Math.max(caught[id] || 0, 1);
      }
    }
  } else if (isPlainObject(rawCaught)) {
    for (const [k, v] of Object.entries(rawCaught)) {
      const id = resolveSpeciesId(k);
      if (id === null) continue;
      if (v === false || v === null || v === undefined || v === '') continue;
      const count = v === true ? 1 : Math.floor(Number(v));
      if (Number.isFinite(count) && count >= 1) {
        caught[id] = Math.max(caught[id] || 0, count);
      }
    }
  }

  const ownedCounts = new Map();
  const ownedMons = [
    ...(Array.isArray(profile?.team) ? profile.team : []),
    ...(Array.isArray(profile?.box) ? profile.box : []),
  ];
  for (const mon of ownedMons) {
    const spId = resolveSpeciesId(mon?.speciesId);
    if (spId !== null) {
      ownedCounts.set(spId, (ownedCounts.get(spId) || 0) + 1);
    }
  }
  for (const [spId, ownedCount] of ownedCounts.entries()) {
    caught[spId] = Math.max(caught[spId] || 0, ownedCount);
  }

  const starterId = resolveSpeciesId(profile?.starterId);
  if (starterId !== null) {
    caught[starterId] = Math.max(caught[starterId] || 0, 1);
  }

  // Walk non-wild single-parent evolution edges backwards to recover evolved starter/gift pre-evolutions
  for (const spId of Object.keys(caught).map(Number)) {
    let cur = spId;
    const visited = new Set([cur]);
    while (!DIRECT_ENCOUNTER_IDS.has(cur)) {
      const parents = PARENTS_BY_SPECIES.get(cur);
      if (!parents || parents.length !== 1) break;
      const parentId = parents[0];
      if (visited.has(parentId)) break;
      visited.add(parentId);
      if (SPECIES[parentId]) {
        caught[parentId] = Math.max(caught[parentId] || 0, 1);
      }
      cur = parentId;
    }
  }

  const seenSet = new Set();
  if (Array.isArray(rawSeen)) {
    for (const item of rawSeen) {
      const id = resolveSpeciesId(item);
      if (id !== null) seenSet.add(id);
    }
  } else if (isPlainObject(rawSeen)) {
    for (const [k, v] of Object.entries(rawSeen)) {
      if (!v) continue;
      const id = resolveSpeciesId(k);
      if (id !== null) seenSet.add(id);
    }
  }

  for (const id of Object.keys(caught).map(Number)) {
    seenSet.add(id);
  }

  const shrinesCleared = Array.isArray(profile?.shrinesCleared) ? profile.shrinesCleared : [];
  for (const shrineId of shrinesCleared) {
    const shrine = SHRINE_BY_ID.get(String(shrineId));
    const guardianId = resolveSpeciesId(shrine?.guardianId);
    if (guardianId !== null) {
      seenSet.add(guardianId);
    }
  }

  const seen = [...seenSet].sort((a, b) => a - b);
  const sumOfCaughtCounts = Object.values(caught).reduce((sum, count) => sum + count, 0);
  const prevTotalRaw = Number(profile?.stats?.totalCaught);
  const safePrevTotal = Number.isFinite(prevTotalRaw) && prevTotalRaw >= 0 ? prevTotalRaw : 0;
  const totalCaught = Math.max(safePrevTotal, sumOfCaughtCounts);

  return {
    rawPokedex,
    rawCaught,
    rawSeen,
    caught,
    seen,
    totalCaught,
  };
}

export function syncProfilePokedex(profile) {
  if (!profile || typeof profile !== 'object') {
    return { changed: false, seenCount: 0, caughtCount: 0 };
  }

  const {
    rawPokedex,
    rawCaught,
    rawSeen,
    caught,
    seen,
    totalCaught,
  } = computeSyncedPokedexState(profile);

  const nextCaughtKeys = Object.keys(caught);
  let caughtChanged = !isPlainObject(rawCaught) || Object.keys(rawCaught).length !== nextCaughtKeys.length;
  if (!caughtChanged) {
    for (const key of nextCaughtKeys) {
      if (!Object.prototype.hasOwnProperty.call(rawCaught, key) || rawCaught[key] !== caught[key]) {
        caughtChanged = true;
        break;
      }
    }
  }

  let seenChanged = !Array.isArray(rawSeen) || rawSeen.length !== seen.length;
  if (!seenChanged) {
    for (let i = 0; i < seen.length; i += 1) {
      if (rawSeen[i] !== seen[i]) {
        seenChanged = true;
        break;
      }
    }
  }

  let statsChanged = false;
  if (!isPlainObject(profile.stats)) {
    profile.stats = {
      battlesWon: 0,
      totalCaught,
      steps: 0,
      evolutions: 0,
      shiniesFound: 0,
      upgrades: 0,
    };
    statsChanged = true;
  } else if (profile.stats.totalCaught !== totalCaught) {
    profile.stats.totalCaught = totalCaught;
    statsChanged = true;
  }

  if (!rawPokedex) {
    profile.pokedex = { seen, caught };
  } else {
    profile.pokedex.seen = seen;
    profile.pokedex.caught = caught;
  }

  const changed = !rawPokedex || caughtChanged || seenChanged || statsChanged;
  return {
    changed,
    seenCount: seen.length,
    caughtCount: nextCaughtKeys.length,
  };
}

export function isSpeciesCaught(profile, speciesId) {
  const id = resolveSpeciesId(speciesId);
  if (!id || !profile || typeof profile !== 'object') return false;
  const rawCaught = profile.pokedex?.caught;
  if (isPlainObject(rawCaught) && typeof rawCaught[id] === 'number' && Number.isFinite(rawCaught[id]) && rawCaught[id] >= 1) {
    return true;
  }
  const { caught } = computeSyncedPokedexState(profile);
  return (caught[id] || 0) >= 1;
}

export function isSpeciesSeen(profile, speciesId) {
  const id = resolveSpeciesId(speciesId);
  if (!id || !profile || typeof profile !== 'object') return false;
  const rawSeen = profile.pokedex?.seen;
  if (Array.isArray(rawSeen) && rawSeen.includes(id)) {
    return true;
  }
  if (isSpeciesCaught(profile, id)) {
    return true;
  }
  const { seen } = computeSyncedPokedexState(profile);
  return seen.includes(id);
}

function isMapTileWalkable(x, y) {
  if (!Array.isArray(WORLD_MAP) || WORLD_ROWS <= 0 || WORLD_COLS <= 0) return true;
  if (x < 0 || y < 0 || x >= WORLD_COLS || y >= WORLD_ROWS) return false;
  const tile = WORLD_MAP[y]?.[x];
  return tile !== undefined && !SOLID_TILE_IDS.has(tile);
}

function isSafeWorldTile(x, y) {
  if (typeof isTileWalkableAt === 'function') {
    return isTileWalkableAt(x, y);
  }
  return isMapTileWalkable(x, y);
}

function fallbackNearestSafe(x, y, dir) {
  if (typeof findNearestSafePosition === 'function') {
    return findNearestSafePosition(x, y, dir);
  }
  const spawnX = GAME_META.spawn?.x ?? 8;
  const spawnY = GAME_META.spawn?.y ?? 15;
  const queue = [[x, y]];
  const visited = new Set([`${x},${y}`]);
  const deltas = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ];
  for (let head = 0; head < queue.length; head += 1) {
    const [cx, cy] = queue[head];
    if (isSafeWorldTile(cx, cy)) {
      return { x: cx, y: cy, dir };
    }
    for (const [dx, dy] of deltas) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= WORLD_COLS || ny >= WORLD_ROWS) continue;
      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push([nx, ny]);
    }
  }
  return { x: spawnX, y: spawnY, dir };
}

export function sanitizePosition(rawPos) {
  const spawnX = GAME_META.spawn?.x ?? 8;
  const spawnY = GAME_META.spawn?.y ?? 15;
  const spawnDir = GAME_META.spawn?.dir || 'down';
  const dir = VALID_DIRS.has(rawPos?.dir) ? rawPos.dir : spawnDir;

  const rawX = Number(rawPos?.x);
  const rawY = Number(rawPos?.y);
  if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) {
    return fallbackNearestSafe(spawnX, spawnY, dir);
  }

  const ix = Math.round(rawX);
  const iy = Math.round(rawY);
  if (ix < 0 || iy < 0 || ix >= WORLD_COLS || iy >= WORLD_ROWS) {
    return fallbackNearestSafe(spawnX, spawnY, dir);
  }

  if (isSafeWorldTile(ix, iy)) {
    return { x: ix, y: iy, dir };
  }

  return fallbackNearestSafe(ix, iy, dir);
}

function hydrateGems(rawGems) {
  const gems = {};
  for (const key of Object.keys(EVOLUTION_ITEMS)) {
    const val = Number(rawGems?.[key]);
    gems[key] = Number.isFinite(val) && val > 0 ? Math.floor(val) : 0;
  }
  if (rawGems && typeof rawGems === 'object') {
    for (const [key, rawVal] of Object.entries(rawGems)) {
      if (!(key in gems)) {
        const val = Number(rawVal);
        if (Number.isFinite(val) && val > 0) {
          gems[key] = Math.floor(val);
        }
      }
    }
  }
  return gems;
}

function hydrateUniqueStrings(rawList) {
  if (!Array.isArray(rawList)) return [];
  return [...new Set(rawList.map((item) => String(item)).filter(Boolean))];
}

function hydrateAppearance(rawAppearance) {
  const rawStyleId = rawAppearance?.styleId;
  const styleId = rawStyleId && TRAINER_STYLES?.[rawStyleId] ? rawStyleId : 'default';
  const rawAccessory = rawAppearance?.accessory;
  const accessory = rawAccessory && TRAINER_ACCESSORIES?.[rawAccessory] ? rawAccessory : 'cap';
  const rawAura = rawAppearance?.aura;
  const aura = rawAura && TRAINER_AURAS?.[rawAura] ? rawAura : 'none';
  return {
    styleId,
    accessory,
    cape: Boolean(rawAppearance?.cape),
    aura,
  };
}

function hydrateStarShards(rawShards, fallback = 2) {
  if (rawShards === null || rawShards === undefined || rawShards === '') return fallback;
  const num = Number(rawShards);
  return Number.isFinite(num) ? Math.max(0, Math.floor(num)) : fallback;
}

function createFreshProfile(trainerId) {
  return {
    trainerId,
    starterId: null,
    pos: { ...GAME_META.spawn },
    appearance: hydrateAppearance(null),
    team: [],
    box: [],
    pokedex: {
      seen: [],
      caught: {},
    },
    badges: [],
    shrinesCleared: [],
    chestsOpened: [],
    questsCompleted: [],
    npcsTalked: [],
    biomesVisited: [],
    rivalsDefeated: [],
    bag: {
      potions: 5,
      greatBalls: 3,
      starBalls: 1,
      starShards: 4,
      gems: hydrateGems(null),
    },
    stats: {
      battlesWon: 0,
      totalCaught: 0,
      steps: 0,
      evolutions: 0,
      shiniesFound: 0,
      upgrades: 0,
    },
  };
}

function createFreshSaveState() {
  return {
    version: 2,
    activeTrainerId: null,
    settings: {
      muted: false,
      crtEnabled: true,
      showTouchPad: 'auto',
      battlePace: 'cinema',
    },
    profiles: {
      violet: createFreshProfile('violet'),
      ozias: createFreshProfile('ozias'),
    },
  };
}

function safeHydrateMon(item) {
  if (!item || typeof item !== 'object') return null;
  try {
    return Pokemon.fromJSON(item);
  } catch {
    return null;
  }
}

function repairProfileParty(profile) {
  if (!profile) return profile;
  if (profile.team.length === 0 && profile.box.length > 0) {
    profile.team.push(profile.box.shift());
  }
  if (profile.starterId && profile.team.length === 0) {
    const fallbackId = SPECIES[profile.starterId] ? profile.starterId : 1;
    profile.team.push(createStarterPokemon(fallbackId));
  }
  if (profile.team.length > 0 && profile.team.every((mon) => mon.isFainted)) {
    profile.team[0].healFull();
  }
  return profile;
}

function hydrateProfile(raw, trainerId) {
  const fresh = createFreshProfile(trainerId);
  if (!raw || typeof raw !== 'object') return fresh;

  const team = Array.isArray(raw.team)
    ? raw.team.map(safeHydrateMon).filter(Boolean).slice(0, 6)
    : [];
  const box = Array.isArray(raw.box)
    ? raw.box.map(safeHydrateMon).filter(Boolean)
    : [];

  const starterId = resolveSpeciesId(raw.starterId);
  const rawPokedex = isPlainObject(raw.pokedex) ? raw.pokedex : {};
  const rawSeen = Array.isArray(rawPokedex.seen)
    ? [...rawPokedex.seen]
    : (isPlainObject(rawPokedex.seen) ? { ...rawPokedex.seen } : []);
  const rawCaught = Array.isArray(rawPokedex.caught)
    ? [...rawPokedex.caught]
    : (isPlainObject(rawPokedex.caught) ? { ...rawPokedex.caught } : {});

  const profile = repairProfileParty({
    trainerId,
    starterId,
    pos: sanitizePosition(raw.pos),
    appearance: hydrateAppearance(raw.appearance),
    team,
    box,
    pokedex: {
      seen: rawSeen,
      caught: rawCaught,
    },
    badges: hydrateUniqueStrings(raw.badges),
    shrinesCleared: hydrateUniqueStrings(raw.shrinesCleared),
    chestsOpened: hydrateUniqueStrings(raw.chestsOpened),
    questsCompleted: hydrateUniqueStrings(raw.questsCompleted),
    npcsTalked: hydrateUniqueStrings(raw.npcsTalked),
    biomesVisited: hydrateUniqueStrings(raw.biomesVisited),
    rivalsDefeated: hydrateUniqueStrings(raw.rivalsDefeated),
    bag: {
      potions: Math.max(0, Number.isFinite(Number(raw.bag?.potions)) ? Number(raw.bag.potions) : 5),
      greatBalls: Math.max(0, Number.isFinite(Number(raw.bag?.greatBalls)) ? Number(raw.bag.greatBalls) : 3),
      starBalls: Math.max(0, Math.floor(Number(raw.bag?.starBalls) || 0)),
      starShards: hydrateStarShards(raw.bag?.starShards, 2),
      gems: hydrateGems(raw.bag?.gems),
    },
    stats: {
      battlesWon: Math.max(0, Number.isFinite(Number(raw.stats?.battlesWon)) ? Number(raw.stats.battlesWon) : 0),
      totalCaught: Math.max(0, Number.isFinite(Number(raw.stats?.totalCaught)) ? Number(raw.stats.totalCaught) : 0),
      steps: Math.max(0, Number.isFinite(Number(raw.stats?.steps)) ? Number(raw.stats.steps) : 0),
      evolutions: Math.max(0, Number.isFinite(Number(raw.stats?.evolutions)) ? Number(raw.stats.evolutions) : 0),
      shiniesFound: Math.max(0, Number.isFinite(Number(raw.stats?.shiniesFound)) ? Number(raw.stats.shiniesFound) : 0),
      upgrades: Math.max(0, Number.isFinite(Number(raw.stats?.upgrades)) ? Math.floor(Number(raw.stats.upgrades)) : 0),
    },
  });

  syncProfilePokedex(profile);
  return profile;
}

export class StorageManager {
  constructor(storageKey = STORAGE_KEY) {
    this.storageKey = storageKey;
    this.memoryFallback = null;
    this.state = this.load();
  }

  load() {
    let rawJson = null;
    try {
      rawJson = window.localStorage.getItem(this.storageKey);
    } catch {
      rawJson = this.memoryFallback;
    }

    if (!rawJson) {
      return createFreshSaveState();
    }

    try {
      const parsed = JSON.parse(rawJson);
      return {
        version: 2,
        activeTrainerId: parsed.activeTrainerId && TRAINERS[parsed.activeTrainerId] ? parsed.activeTrainerId : null,
        settings: {
          muted: Boolean(parsed.settings?.muted ?? false),
          crtEnabled: Boolean(parsed.settings?.crtEnabled ?? true),
          showTouchPad: ['auto', 'show', 'hide'].includes(parsed.settings?.showTouchPad)
            ? parsed.settings.showTouchPad
            : 'auto',
          battlePace: VALID_PACES.has(parsed.settings?.battlePace) ? parsed.settings.battlePace : 'cinema',
        },
        profiles: {
          violet: hydrateProfile(parsed.profiles?.violet, 'violet'),
          ozias: hydrateProfile(parsed.profiles?.ozias, 'ozias'),
        },
      };
    } catch {
      return createFreshSaveState();
    }
  }

  save() {
    this.state.version = 2;
    const serialized = JSON.stringify({
      version: 2,
      activeTrainerId: this.state.activeTrainerId,
      settings: this.state.settings,
      profiles: {
        violet: this.serializeProfile(this.state.profiles.violet),
        ozias: this.serializeProfile(this.state.profiles.ozias),
      },
    });
    this.memoryFallback = serialized;
    try {
      window.localStorage.setItem(this.storageKey, serialized);
    } catch {
      // Fallback already retained in memoryFallback if storage quota/privacy mode blocks writes
    }
  }

  syncPokedex(profile = this.getActiveProfile(), persist = true) {
    if (!profile) return null;
    const { changed } = syncProfilePokedex(profile);
    if (changed && persist) {
      this.save();
    }
    return profile.pokedex || null;
  }

  ensureValidParty(profile = this.getActiveProfile()) {
    if (!profile) return null;
    const beforeLen = profile.team.length;
    repairProfileParty(profile);
    const { changed: dexChanged } = syncProfilePokedex(profile);
    if (profile.team.length !== beforeLen || dexChanged) {
      this.save();
    }
    return profile.team;
  }

  ensureHealthyParty(profile = this.getActiveProfile()) {
    if (!profile) return false;
    this.ensureValidParty(profile);
    if (profile.team.length === 0) return false;
    if (profile.team.every((mon) => mon.isFainted)) {
      profile.team[0].healFull();
      this.save();
    }
    return true;
  }

  serializeProfile(profile) {
    return {
      ...profile,
      appearance: hydrateAppearance(profile.appearance),
      rivalsDefeated: hydrateUniqueStrings(profile.rivalsDefeated),
      team: profile.team.map((p) => p.toJSON()),
      box: profile.box.map((p) => p.toJSON()),
    };
  }

  selectTrainer(trainerId) {
    if (!TRAINERS[trainerId]) throw new Error(`Unknown trainerId: ${trainerId}`);
    this.state.activeTrainerId = trainerId;
    const profile = this.getActiveProfile();
    this.syncPokedex(profile, true);
    this.save();
    return profile;
  }

  getActiveTrainerId() {
    return this.state.activeTrainerId;
  }

  getProfile(trainerId) {
    return this.state.profiles[trainerId] || null;
  }

  getActiveProfile() {
    if (!this.state.activeTrainerId) return null;
    return this.state.profiles[this.state.activeTrainerId] || null;
  }

  getProfileSummary(trainerId) {
    const profile = this.getProfile(trainerId);
    if (!profile || !profile.starterId) {
      return { started: false, label: 'New Adventure!', leadId: null, dexCount: 0, badgeCount: 0 };
    }
    syncProfilePokedex(profile);
    const lead = profile.team[0];
    const dexCount = Object.keys(profile.pokedex.caught).length;
    const badgeCount = profile.badges.length;
    const leadLabel = lead ? `Lv.${lead.level} ${lead.displayName || lead.name}` : 'Ready';
    return {
      started: true,
      label: `${leadLabel} • Dex ${dexCount}/${Object.keys(SPECIES).length} • ${badgeCount} Badges`,
      leadId: lead ? lead.speciesId : profile.starterId,
      dexCount,
      badgeCount,
    };
  }

  chooseStarter(speciesId) {
    const profile = this.getActiveProfile();
    if (!profile) return null;
    const resolvedInput = resolveSpeciesId(speciesId) ?? speciesId;
    const starter = createStarterPokemon(resolvedInput);
    const numId = Number(starter.speciesId);
    profile.starterId = numId;
    profile.team = [starter];
    profile.box = [];
    profile.pos = { ...GAME_META.spawn };
    if (!isPlainObject(profile.pokedex) || !isPlainObject(profile.pokedex.caught)) {
      syncProfilePokedex(profile);
    }
    this.recordSeen(numId, false);
    profile.pokedex.caught[numId] = (profile.pokedex.caught[numId] || 0) + 1;
    profile.stats.totalCaught = (Number(profile.stats?.totalCaught) || 0) + 1;
    syncProfilePokedex(profile);
    this.evaluateBadges(false);
    this.save();
    return starter;
  }

  updatePosition(x, y, dir, incSteps = false) {
    const profile = this.getActiveProfile();
    if (!profile) return;
    profile.pos = { x, y, dir };
    if (incSteps) profile.stats.steps += 1;
    this.save();
  }

  recordSeen(speciesId, persist = true) {
    const profile = this.getActiveProfile();
    if (!profile) return;
    const numId = resolveSpeciesId(speciesId);
    if (!numId || !SPECIES[numId]) return;
    if (!isPlainObject(profile.pokedex) || !Array.isArray(profile.pokedex.seen)) {
      syncProfilePokedex(profile);
    }
    const alreadySeen = profile.pokedex.seen.includes(numId);
    if (!alreadySeen) {
      profile.pokedex.seen.push(numId);
    }
    const { changed } = syncProfilePokedex(profile);
    if (persist && (!alreadySeen || changed)) {
      this.save();
    }
  }

  recordShinyEncounter(persist = true) {
    const profile = this.getActiveProfile();
    if (!profile) return 0;
    profile.stats.shiniesFound = (profile.stats.shiniesFound || 0) + 1;
    if (persist) this.save();
    return profile.stats.shiniesFound;
  }

  recordCaught(pokemonInstance) {
    const profile = this.getActiveProfile();
    if (!profile || !pokemonInstance) return { destination: 'team', newBadges: [] };

    const numId = resolveSpeciesId(pokemonInstance.speciesId);
    if (!numId || !SPECIES[numId]) return { destination: 'team', newBadges: [] };

    if (!isPlainObject(profile.pokedex) || !isPlainObject(profile.pokedex.caught)) {
      syncProfilePokedex(profile);
    }
    this.recordSeen(numId, false);
    profile.pokedex.caught[numId] = (profile.pokedex.caught[numId] || 0) + 1;
    profile.stats.totalCaught = (Number(profile.stats?.totalCaught) || 0) + 1;
    if (pokemonInstance.isShiny) {
      profile.stats.shiniesFound = (profile.stats.shiniesFound || 0) + 1;
    }

    let destination = 'team';
    if (profile.team.length < 6) {
      profile.team.push(pokemonInstance);
    } else {
      profile.box.push(pokemonInstance);
      destination = 'box';
    }

    syncProfilePokedex(profile);
    const newBadges = this.evaluateBadges(false);
    this.save();
    return { destination, newBadges };
  }

  swapTeamWithBox(teamIdx, boxIdx) {
    const profile = this.getActiveProfile();
    if (!profile) return false;
    if (teamIdx < 0 || teamIdx >= profile.team.length) return false;
    if (boxIdx < 0 || boxIdx >= profile.box.length) return false;
    const temp = profile.team[teamIdx];
    profile.team[teamIdx] = profile.box[boxIdx];
    profile.box[boxIdx] = temp;
    syncProfilePokedex(profile);
    this.save();
    return true;
  }

  setLeadPokemon(teamIdx) {
    const profile = this.getActiveProfile();
    if (!profile || teamIdx <= 0 || teamIdx >= profile.team.length) return false;
    const [picked] = profile.team.splice(teamIdx, 1);
    profile.team.unshift(picked);
    syncProfilePokedex(profile);
    this.save();
    return true;
  }

  healTeam(refillMinPotions = false) {
    const profile = this.getActiveProfile();
    if (!profile) return;
    for (const mon of profile.team) {
      mon.healFull();
    }
    if (refillMinPotions && profile.bag.potions < 5) {
      profile.bag.potions = 5;
    }
    this.save();
  }

  useItem(itemKey) {
    const profile = this.getActiveProfile();
    if (!profile) return false;
    if (EVOLUTION_ITEMS[itemKey]) {
      return this.useGem(itemKey);
    }
    if (!profile.bag || !profile.bag[itemKey] || profile.bag[itemKey] <= 0) return false;
    profile.bag[itemKey] -= 1;
    this.save();
    return true;
  }

  addGem(gemId, count = 1, persist = true) {
    const profile = this.getActiveProfile();
    if (!profile || !EVOLUTION_ITEMS[gemId]) return 0;
    const add = Math.max(0, Math.round(Number(count) || 0));
    if (!profile.bag.gems || typeof profile.bag.gems !== 'object') {
      profile.bag.gems = hydrateGems(null);
    }
    profile.bag.gems[gemId] = Math.max(0, (profile.bag.gems[gemId] || 0) + add);
    if (persist) this.save();
    return profile.bag.gems[gemId];
  }

  useGem(gemId, persist = true) {
    const profile = this.getActiveProfile();
    if (!profile || !profile.bag?.gems || (profile.bag.gems[gemId] || 0) <= 0) return false;
    profile.bag.gems[gemId] -= 1;
    if (persist) this.save();
    return true;
  }

  addStarShards(count = 1, persist = true) {
    const profile = this.getActiveProfile();
    if (!profile) return 0;
    if (!profile.bag || typeof profile.bag !== 'object') {
      profile.bag = { potions: 0, greatBalls: 0, starBalls: 0, starShards: 0, gems: hydrateGems(null) };
    }
    const add = Math.max(0, Math.round(Number(count) || 0));
    const prev = hydrateStarShards(profile.bag.starShards, 0);
    profile.bag.starShards = prev + add;
    if (persist) this.save();
    return profile.bag.starShards;
  }

  addRewards({ potions = 0, greatBalls = 0, starBalls = 0, starShards = 0, gems = {} } = {}, persist = true) {
    const profile = this.getActiveProfile();
    if (!profile) return;
    if (!profile.bag || typeof profile.bag !== 'object') {
      profile.bag = { potions: 0, greatBalls: 0, starBalls: 0, starShards: 0, gems: hydrateGems(null) };
    }
    const safePotions = Math.max(0, Math.round(Number(potions) || 0));
    const safeBalls = Math.max(0, Math.round(Number(greatBalls) || 0));
    const safeStarBalls = Math.max(0, Math.round(Number(starBalls) || 0));
    const safeShards = Math.max(0, Math.round(Number(starShards) || 0));
    profile.bag.potions = (Number(profile.bag.potions) || 0) + safePotions;
    profile.bag.greatBalls = (Number(profile.bag.greatBalls) || 0) + safeBalls;
    profile.bag.starBalls = (Number(profile.bag.starBalls) || 0) + safeStarBalls;
    profile.bag.starShards = hydrateStarShards(profile.bag.starShards, 0) + safeShards;
    if (gems && typeof gems === 'object') {
      for (const [gemId, amount] of Object.entries(gems)) {
        if (EVOLUTION_ITEMS[gemId] && Number(amount) > 0) {
          this.addGem(gemId, Number(amount), false);
        }
      }
    }
    if (persist) this.save();
  }

  upgradePokemon(monOrUid) {
    const profile = this.getActiveProfile();
    if (!profile) {
      return { upgraded: false, reason: 'no_profile' };
    }

    const targetUid = typeof monOrUid === 'string' ? monOrUid : monOrUid?.uid;
    const mon = [...(profile.team || []), ...(profile.box || [])].find((m) => m.uid === targetUid)
      || (monOrUid instanceof Pokemon ? monOrUid : null);
    if (!mon) {
      return { upgraded: false, reason: 'not_found' };
    }

    const cost = typeof mon.getUpgradeCost === 'function' ? mon.getUpgradeCost() : null;
    if (cost === null) {
      return {
        upgraded: false,
        reason: 'max_tier',
        cost: null,
        remainingShards: hydrateStarShards(profile.bag?.starShards, 0),
      };
    }

    if (!profile.bag || typeof profile.bag !== 'object') {
      profile.bag = { potions: 0, greatBalls: 0, starBalls: 0, starShards: 0, gems: hydrateGems(null) };
    }
    const currentShards = hydrateStarShards(profile.bag.starShards, 0);
    if (currentShards < cost) {
      return {
        upgraded: false,
        reason: 'insufficient_shards',
        cost,
        remainingShards: currentShards,
      };
    }

    const remainingShards = currentShards - cost;
    profile.bag.starShards = remainingShards;
    const upgradeRes = mon.applyUpgrade();
    if (!upgradeRes?.upgraded) {
      profile.bag.starShards = currentShards;
      return {
        upgraded: false,
        reason: upgradeRes?.reason || 'upgrade_failed',
        cost,
        remainingShards: currentShards,
      };
    }

    if (!isPlainObject(profile.stats)) {
      profile.stats = {
        battlesWon: 0,
        totalCaught: 0,
        steps: 0,
        evolutions: 0,
        shiniesFound: 0,
        upgrades: 0,
      };
    }
    profile.stats.upgrades = Math.max(0, Math.floor(Number(profile.stats.upgrades) || 0)) + 1;
    syncProfilePokedex(profile);
    const newBadges = this.evaluateBadges(false);
    this.save();

    return {
      upgraded: true,
      cost,
      remainingShards,
      oldTier: upgradeRes.oldTier,
      newTier: upgradeRes.newTier,
      levelResult: upgradeRes.levelResult,
      pendingEvo: upgradeRes.pendingEvo,
      newBadges,
    };
  }

  hasAnyReadyEvolution(profile = this.getActiveProfile()) {
    if (!profile || typeof profile !== 'object') return false;
    const gems = profile.bag?.gems || {};
    const mons = [
      ...(Array.isArray(profile.team) ? profile.team : []),
      ...(Array.isArray(profile.box) ? profile.box : []),
    ];
    return mons.some((mon) => {
      if (!mon) return false;
      if (typeof mon.getPendingLevelEvolution === 'function' && mon.getPendingLevelEvolution()) {
        return true;
      }
      if (typeof mon.getAvailableItemEvolutions === 'function') {
        return mon.getAvailableItemEvolutions(gems).some((opt) => Boolean(opt?.canUse));
      }
      return false;
    });
  }

  updateAppearance(partial = {}) {
    const profile = this.getActiveProfile();
    if (!profile) return null;
    const current = hydrateAppearance(profile.appearance);
    const patch = partial && typeof partial === 'object' ? partial : {};
    profile.appearance = hydrateAppearance({
      ...current,
      ...patch,
    });
    this.save();
    return profile.appearance;
  }

  setPokemonNickname(uid, nickname) {
    const profile = this.getActiveProfile();
    if (!profile || !uid) return null;
    const mon = [...profile.team, ...profile.box].find((m) => m.uid === uid);
    if (!mon) return null;
    if (typeof mon.setNickname === 'function') {
      mon.setNickname(nickname);
    } else {
      const cleaned = typeof nickname === 'string' ? nickname.trim().slice(0, 14).trim() : '';
      mon.nickname = cleaned.length > 0 ? cleaned : null;
    }
    this.save();
    return mon;
  }

  evolvePokemon(monOrUid, toSpeciesId, itemKey = null) {
    const profile = this.getActiveProfile();
    if (!profile) return null;
    const targetId = resolveSpeciesId(toSpeciesId);
    if (!targetId || !SPECIES[targetId]) return null;

    const targetUid = typeof monOrUid === 'string' ? monOrUid : monOrUid?.uid;
    const mon = [...profile.team, ...profile.box].find((m) => m.uid === targetUid)
      || (monOrUid instanceof Pokemon ? monOrUid : null);
    if (!mon) return null;

    if (itemKey) {
      if (!this.useGem(itemKey, false)) return null;
    }

    if (!isPlainObject(profile.pokedex) || !isPlainObject(profile.pokedex.caught)) {
      syncProfilePokedex(profile);
    }

    const preEvoId = resolveSpeciesId(mon.speciesId);
    if (preEvoId && SPECIES[preEvoId]) {
      this.recordSeen(preEvoId, false);
      profile.pokedex.caught[preEvoId] = Math.max(profile.pokedex.caught[preEvoId] || 0, 1);
    }

    const evolution = mon.evolve(targetId);
    this.recordSeen(targetId, false);
    profile.pokedex.caught[targetId] = (profile.pokedex.caught[targetId] || 0) + 1;
    profile.stats.evolutions = (profile.stats.evolutions || 0) + 1;
    syncProfilePokedex(profile);

    const newBadges = this.evaluateBadges(false);
    this.save();
    return { evolution, newBadges };
  }

  recordBiomeVisited(biomeId) {
    const profile = this.getActiveProfile();
    if (!profile || !biomeId) return false;
    if (!Array.isArray(profile.biomesVisited)) profile.biomesVisited = [];
    if (profile.biomesVisited.includes(biomeId)) return false;
    profile.biomesVisited.push(biomeId);
    this.save();
    return true;
  }

  markNpcTalked(npcId) {
    const profile = this.getActiveProfile();
    if (!profile || !npcId) return false;
    if (!Array.isArray(profile.npcsTalked)) profile.npcsTalked = [];
    if (profile.npcsTalked.includes(npcId)) return false;
    profile.npcsTalked.push(npcId);
    this.save();
    return true;
  }

  completeQuest(questId, rewards = {}) {
    const profile = this.getActiveProfile();
    if (!profile || !questId) {
      return { completed: false, alreadyCompleted: false, rewards: null, newBadges: [] };
    }
    if (!Array.isArray(profile.questsCompleted)) profile.questsCompleted = [];
    if (profile.questsCompleted.includes(questId)) {
      return { completed: false, alreadyCompleted: true, rewards: null, newBadges: [] };
    }

    profile.questsCompleted.push(questId);
    this.addRewards(rewards || {}, false);
    const newBadges = this.evaluateBadges(false);
    this.save();
    return { completed: true, rewards, newBadges };
  }

  markChestOpened(chestId) {
    const profile = this.getActiveProfile();
    if (!profile || profile.chestsOpened.includes(chestId)) return false;
    profile.chestsOpened.push(chestId);
    this.save();
    return true;
  }

  markShrineCleared(shrineId) {
    const profile = this.getActiveProfile();
    if (!profile) return [];
    if (!profile.shrinesCleared.includes(shrineId)) {
      profile.shrinesCleared.push(shrineId);
    }
    syncProfilePokedex(profile);
    const newBadges = this.evaluateBadges(false);
    this.save();
    return newBadges;
  }

  markRivalDefeated(rivalId, rewards = {}) {
    const profile = this.getActiveProfile();
    if (!profile || !rivalId) {
      return { firstWin: false, newBadges: [] };
    }
    if (!Array.isArray(profile.rivalsDefeated)) {
      profile.rivalsDefeated = [];
    }
    const id = String(rivalId);
    const firstWin = !profile.rivalsDefeated.includes(id);
    if (firstWin) {
      profile.rivalsDefeated.push(id);
    }
    if (rewards && typeof rewards === 'object') {
      this.addRewards(rewards, false);
    }
    const newBadges = this.evaluateBadges(false);
    this.save();
    return { firstWin, newBadges };
  }

  recordBattleWin() {
    const profile = this.getActiveProfile();
    if (!profile) return [];
    profile.stats.battlesWon += 1;
    const newBadges = this.evaluateBadges(false);
    this.save();
    return newBadges;
  }

  evaluateBadges(persist = true) {
    const profile = this.getActiveProfile();
    if (!profile) return [];
    const unlockedNow = [];
    for (const badge of BADGES) {
      if (!profile.badges.includes(badge.id) && badge.check(profile)) {
        profile.badges.push(badge.id);
        unlockedNow.push(badge);
      }
    }
    if (persist && unlockedNow.length > 0) this.save();
    return unlockedNow;
  }

  getSettings() {
    return this.state.settings;
  }

  updateSettings(partial) {
    const next = { ...this.state.settings, ...partial };
    if (!VALID_PACES.has(next.battlePace)) {
      next.battlePace = this.state.settings?.battlePace || 'cinema';
    }
    this.state.settings = next;
    this.save();
    return this.state.settings;
  }

  resetTrainerProgress(trainerId = this.state.activeTrainerId) {
    if (!trainerId || !TRAINERS[trainerId]) return;
    this.state.profiles[trainerId] = createFreshProfile(trainerId);
    this.save();
  }

  resetAllProgress() {
    const settings = { ...this.state.settings };
    this.state = createFreshSaveState();
    this.state.settings = settings;
    this.save();
  }
}

export const storage = new StorageManager();
