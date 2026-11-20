import {
  BADGES,
  EVOLUTION_ITEMS,
  GAME_META,
  SPECIES,
  TRAINERS,
  WORLD_COLS,
  WORLD_MAP,
  WORLD_ROWS,
} from './config.js';
import { Pokemon, createStarterPokemon } from './pokemon.js';

export const STORAGE_KEY = 'starlight_pokemon_save_v1';

const SOLID_TILE_IDS = new Set([3, 4, 8, 11, 12, 14, 16, 17, 18, 21, 25]);
const VALID_DIRS = new Set(['up', 'down', 'left', 'right']);
const VALID_PACES = new Set(['cinema', 'classic', 'fast']);

function isMapTileWalkable(x, y) {
  if (!Array.isArray(WORLD_MAP) || WORLD_ROWS <= 0 || WORLD_COLS <= 0) return true;
  if (x < 0 || y < 0 || x >= WORLD_COLS || y >= WORLD_ROWS) return false;
  const tile = WORLD_MAP[y]?.[x];
  return tile !== undefined && !SOLID_TILE_IDS.has(tile);
}

export function sanitizePosition(rawPos) {
  const spawnX = GAME_META.spawn?.x ?? 8;
  const spawnY = GAME_META.spawn?.y ?? 15;
  const spawnDir = GAME_META.spawn?.dir || 'down';
  const dir = VALID_DIRS.has(rawPos?.dir) ? rawPos.dir : spawnDir;

  const rawX = Number(rawPos?.x);
  const rawY = Number(rawPos?.y);
  if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) {
    return { x: spawnX, y: spawnY, dir };
  }

  const ix = Math.round(rawX);
  const iy = Math.round(rawY);
  if (ix < 0 || iy < 0 || ix >= WORLD_COLS || iy >= WORLD_ROWS) {
    return { x: spawnX, y: spawnY, dir };
  }

  if (isMapTileWalkable(ix, iy)) {
    return { x: ix, y: iy, dir };
  }

  const queue = [[ix, iy]];
  const visited = new Set([`${ix},${iy}`]);
  const deltas = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ];

  for (let head = 0; head < queue.length; head += 1) {
    const [cx, cy] = queue[head];
    if (isMapTileWalkable(cx, cy)) {
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

function createFreshProfile(trainerId) {
  return {
    trainerId,
    starterId: null,
    pos: { ...GAME_META.spawn },
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
    bag: {
      potions: 5,
      greatBalls: 3,
      gems: hydrateGems(null),
    },
    stats: {
      battlesWon: 0,
      totalCaught: 0,
      steps: 0,
      evolutions: 0,
      shiniesFound: 0,
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

  const starterNum = Number(raw.starterId);
  const starterId = Number.isFinite(starterNum) && SPECIES[starterNum] ? starterNum : null;

  return repairProfileParty({
    trainerId,
    starterId,
    pos: sanitizePosition(raw.pos),
    team,
    box,
    pokedex: {
      seen: Array.isArray(raw.pokedex?.seen)
        ? [...new Set(raw.pokedex.seen.map(Number).filter((id) => Number.isFinite(id)))]
        : [],
      caught: raw.pokedex?.caught && typeof raw.pokedex.caught === 'object' ? { ...raw.pokedex.caught } : {},
    },
    badges: hydrateUniqueStrings(raw.badges),
    shrinesCleared: hydrateUniqueStrings(raw.shrinesCleared),
    chestsOpened: hydrateUniqueStrings(raw.chestsOpened),
    questsCompleted: hydrateUniqueStrings(raw.questsCompleted),
    npcsTalked: hydrateUniqueStrings(raw.npcsTalked),
    biomesVisited: hydrateUniqueStrings(raw.biomesVisited),
    bag: {
      potions: Math.max(0, Number.isFinite(Number(raw.bag?.potions)) ? Number(raw.bag.potions) : 5),
      greatBalls: Math.max(0, Number.isFinite(Number(raw.bag?.greatBalls)) ? Number(raw.bag.greatBalls) : 3),
      gems: hydrateGems(raw.bag?.gems),
    },
    stats: {
      battlesWon: Math.max(0, Number.isFinite(Number(raw.stats?.battlesWon)) ? Number(raw.stats.battlesWon) : 0),
      totalCaught: Math.max(0, Number.isFinite(Number(raw.stats?.totalCaught)) ? Number(raw.stats.totalCaught) : 0),
      steps: Math.max(0, Number.isFinite(Number(raw.stats?.steps)) ? Number(raw.stats.steps) : 0),
      evolutions: Math.max(0, Number.isFinite(Number(raw.stats?.evolutions)) ? Number(raw.stats.evolutions) : 0),
      shiniesFound: Math.max(0, Number.isFinite(Number(raw.stats?.shiniesFound)) ? Number(raw.stats.shiniesFound) : 0),
    },
  });
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

  ensureValidParty(profile = this.getActiveProfile()) {
    if (!profile) return null;
    const beforeLen = profile.team.length;
    repairProfileParty(profile);
    if (profile.team.length !== beforeLen) {
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
      team: profile.team.map((p) => p.toJSON()),
      box: profile.box.map((p) => p.toJSON()),
    };
  }

  selectTrainer(trainerId) {
    if (!TRAINERS[trainerId]) throw new Error(`Unknown trainerId: ${trainerId}`);
    this.state.activeTrainerId = trainerId;
    this.save();
    return this.getActiveProfile();
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
    const lead = profile.team[0];
    const dexCount = Object.keys(profile.pokedex.caught).length;
    const badgeCount = profile.badges.length;
    const leadLabel = lead ? `Lv.${lead.level} ${lead.name}` : 'Ready';
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
    const starter = createStarterPokemon(speciesId);
    profile.starterId = Number(speciesId);
    profile.team = [starter];
    profile.box = [];
    profile.pos = { ...GAME_META.spawn };
    this.recordSeen(speciesId, false);
    profile.pokedex.caught[Number(speciesId)] = (profile.pokedex.caught[Number(speciesId)] || 0) + 1;
    profile.stats.totalCaught += 1;
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
    const numId = Number(speciesId);
    if (!profile.pokedex.seen.includes(numId)) {
      profile.pokedex.seen.push(numId);
      if (persist) this.save();
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

    const numId = Number(pokemonInstance.speciesId);
    this.recordSeen(numId, false);
    profile.pokedex.caught[numId] = (profile.pokedex.caught[numId] || 0) + 1;
    profile.stats.totalCaught += 1;
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
    this.save();
    return true;
  }

  setLeadPokemon(teamIdx) {
    const profile = this.getActiveProfile();
    if (!profile || teamIdx <= 0 || teamIdx >= profile.team.length) return false;
    const [picked] = profile.team.splice(teamIdx, 1);
    profile.team.unshift(picked);
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
    if (!profile.bag[itemKey] || profile.bag[itemKey] <= 0) return false;
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

  addRewards({ potions = 0, greatBalls = 0, gems = {} } = {}, persist = true) {
    const profile = this.getActiveProfile();
    if (!profile) return;
    const safePotions = Math.max(0, Math.round(Number(potions) || 0));
    const safeBalls = Math.max(0, Math.round(Number(greatBalls) || 0));
    profile.bag.potions += safePotions;
    profile.bag.greatBalls += safeBalls;
    if (gems && typeof gems === 'object') {
      for (const [gemId, amount] of Object.entries(gems)) {
        if (EVOLUTION_ITEMS[gemId] && Number(amount) > 0) {
          this.addGem(gemId, Number(amount), false);
        }
      }
    }
    if (persist) this.save();
  }

  evolvePokemon(monOrUid, toSpeciesId, itemKey = null) {
    const profile = this.getActiveProfile();
    if (!profile) return null;
    const targetId = Number(toSpeciesId);
    if (!SPECIES[targetId]) return null;

    const targetUid = typeof monOrUid === 'string' ? monOrUid : monOrUid?.uid;
    const mon = [...profile.team, ...profile.box].find((m) => m.uid === targetUid)
      || (monOrUid instanceof Pokemon ? monOrUid : null);
    if (!mon) return null;

    if (itemKey) {
      if (!this.useGem(itemKey, false)) return null;
    }

    const evolution = mon.evolve(targetId);
    this.recordSeen(targetId, false);
    profile.pokedex.caught[targetId] = (profile.pokedex.caught[targetId] || 0) + 1;
    profile.stats.evolutions = (profile.stats.evolutions || 0) + 1;

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
    const newBadges = this.evaluateBadges(false);
    this.save();
    return newBadges;
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
