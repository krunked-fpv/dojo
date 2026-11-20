import { BADGES, GAME_META, SPECIES, TRAINERS } from './config.js';
import { Pokemon, createStarterPokemon } from './pokemon.js';

const STORAGE_KEY = 'starlight_pokemon_save_v1';

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
    bag: {
      potions: 5,
      greatBalls: 3,
    },
    stats: {
      battlesWon: 0,
      totalCaught: 0,
      steps: 0,
    },
  };
}

function createFreshSaveState() {
  return {
    version: 1,
    activeTrainerId: null,
    settings: {
      muted: false,
      crtEnabled: true,
      showTouchPad: 'auto',
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
    pos: {
      x: Number.isFinite(raw.pos?.x) ? raw.pos.x : fresh.pos.x,
      y: Number.isFinite(raw.pos?.y) ? raw.pos.y : fresh.pos.y,
      dir: raw.pos?.dir || fresh.pos.dir,
    },
    team,
    box,
    pokedex: {
      seen: Array.isArray(raw.pokedex?.seen)
        ? [...new Set(raw.pokedex.seen.map(Number).filter((id) => Number.isFinite(id)))]
        : [],
      caught: raw.pokedex?.caught && typeof raw.pokedex.caught === 'object' ? { ...raw.pokedex.caught } : {},
    },
    badges: Array.isArray(raw.badges) ? [...new Set(raw.badges)] : [],
    shrinesCleared: Array.isArray(raw.shrinesCleared) ? [...new Set(raw.shrinesCleared)] : [],
    chestsOpened: Array.isArray(raw.chestsOpened) ? [...new Set(raw.chestsOpened)] : [],
    bag: {
      potions: Math.max(0, Number.isFinite(Number(raw.bag?.potions)) ? Number(raw.bag.potions) : 5),
      greatBalls: Math.max(0, Number.isFinite(Number(raw.bag?.greatBalls)) ? Number(raw.bag.greatBalls) : 3),
    },
    stats: {
      battlesWon: Math.max(0, Number.isFinite(Number(raw.stats?.battlesWon)) ? Number(raw.stats.battlesWon) : 0),
      totalCaught: Math.max(0, Number.isFinite(Number(raw.stats?.totalCaught)) ? Number(raw.stats.totalCaught) : 0),
      steps: Math.max(0, Number.isFinite(Number(raw.stats?.steps)) ? Number(raw.stats.steps) : 0),
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
        version: 1,
        activeTrainerId: parsed.activeTrainerId && TRAINERS[parsed.activeTrainerId] ? parsed.activeTrainerId : null,
        settings: {
          muted: Boolean(parsed.settings?.muted ?? false),
          crtEnabled: Boolean(parsed.settings?.crtEnabled ?? true),
          showTouchPad: ['auto', 'show', 'hide'].includes(parsed.settings?.showTouchPad)
            ? parsed.settings.showTouchPad
            : 'auto',
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
    const serialized = JSON.stringify({
      version: 1,
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

  recordCaught(pokemonInstance) {
    const profile = this.getActiveProfile();
    if (!profile || !pokemonInstance) return { destination: 'team', newBadges: [] };

    const numId = Number(pokemonInstance.speciesId);
    this.recordSeen(numId, false);
    profile.pokedex.caught[numId] = (profile.pokedex.caught[numId] || 0) + 1;
    profile.stats.totalCaught += 1;

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
    if (!profile || !profile.bag[itemKey] || profile.bag[itemKey] <= 0) return false;
    profile.bag[itemKey] -= 1;
    this.save();
    return true;
  }

  addRewards({ potions = 0, greatBalls = 0 }) {
    const profile = this.getActiveProfile();
    if (!profile) return;
    profile.bag.potions += potions;
    profile.bag.greatBalls += greatBalls;
    this.save();
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
    this.state.settings = { ...this.state.settings, ...partial };
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
