import * as Config from './config.js';
import * as PokemonMod from './pokemon.js';
import {
  BADGES,
  BIOMES,
  EVOLUTION_ITEMS,
  EVOLUTIONS,
  FIELD_QUESTS,
  MOVES,
  RIVAL_TRAINERS,
  SHRINES,
  SPECIES,
  TRAINER_ACCESSORIES,
  TRAINER_STYLES,
  TRAINERS,
  TYPES,
  getBiomeDiscoveryStats,
  getCompassGuidance,
  resolveTrainerLook,
} from './config.js';
import { attachPokemonSprite } from './pokemon.js';
import { drawTrainerPortrait } from './overworld.js';

const BIOME_ORDER = ['village', 'forest', 'cave', 'water', 'volcano', 'peak', 'grove'];

const FALLBACK_STYLES = {
  default: { id: 'default', name: 'Signature Outfit', icon: '✨', outfitPrimary: '#a855f7', outfitSecondary: '#f472b6', accent: '#c084fc', accentDark: '#7e22ce', accentSoft: 'rgba(192, 132, 252, 0.22)' },
  royal: { id: 'royal', name: 'Starlight Royal', icon: '👑', outfitPrimary: '#6366f1', outfitSecondary: '#fbbf24', accent: '#818cf8', accentDark: '#4338ca', accentSoft: 'rgba(129, 140, 248, 0.22)' },
  aurora: { id: 'aurora', name: 'Aurora Frost', icon: '❄️', outfitPrimary: '#06b6d4', outfitSecondary: '#a5f3fc', accent: '#22d3ee', accentDark: '#0e7490', accentSoft: 'rgba(34, 211, 238, 0.22)' },
  ember: { id: 'ember', name: 'Ember Explorer', icon: '🔥', outfitPrimary: '#ea580c', outfitSecondary: '#fde047', accent: '#fb923c', accentDark: '#9a3412', accentSoft: 'rgba(251, 146, 60, 0.22)' },
  ranger: { id: 'ranger', name: 'Emerald Ranger', icon: '🌿', outfitPrimary: '#16a34a', outfitSecondary: '#bef264', accent: '#4ade80', accentDark: '#15803d', accentSoft: 'rgba(74, 222, 128, 0.22)' },
  nebula: { id: 'nebula', name: 'Cosmic Nebula', icon: '🌌', outfitPrimary: '#db2777', outfitSecondary: '#67e8f9', accent: '#f472b6', accentDark: '#9d174d', accentSoft: 'rgba(244, 114, 182, 0.22)' },
  solstice: { id: 'solstice', name: 'Solar Sovereign', icon: '☀️', outfitPrimary: '#d97706', outfitSecondary: '#fef08a', accent: '#fbbf24', accentDark: '#92400e', accentSoft: 'rgba(251, 191, 36, 0.24)' },
  twilight: { id: 'twilight', name: 'Eclipse Mystic', icon: '🔮', outfitPrimary: '#581c87', outfitSecondary: '#c084fc', accent: '#a855f7', accentDark: '#3b0764', accentSoft: 'rgba(168, 85, 247, 0.24)' },
  celestial: { id: 'celestial', name: 'Astral Guardian', icon: '🌠', outfitPrimary: '#0f766e', outfitSecondary: '#fde68a', accent: '#2dd4bf', accentDark: '#115e59', accentSoft: 'rgba(45, 212, 191, 0.24)' },
  sakura: { id: 'sakura', name: 'Starlight Blossom', icon: '🌸', outfitPrimary: '#e11d48', outfitSecondary: '#fbcfe8', accent: '#fb7185', accentDark: '#9f1239', accentSoft: 'rgba(251, 113, 133, 0.24)' },
};

const FALLBACK_ACCESSORIES = {
  cap: { id: 'cap', name: 'Adventure Cap', icon: '🧢' },
  crown: { id: 'crown', name: 'Starlight Crown', icon: '👑' },
  wizard: { id: 'wizard', name: 'Mystic Hat', icon: '🧙' },
  headband: { id: 'headband', name: 'Thunder Headband', icon: '🎀' },
  goggles: { id: 'goggles', name: 'Explorer Goggles', icon: '🥽' },
  halo: { id: 'halo', name: 'Starlight Halo', icon: '💫' },
  visor: { id: 'visor', name: 'Astral Visor', icon: '🕶️' },
  antlers: { id: 'antlers', name: 'Grove Blossom', icon: '🌸' },
};

const FALLBACK_AURAS = {
  none: { id: 'none', name: 'No Aura', icon: '⚪', color: '#94a3b8' },
  stars: { id: 'stars', name: 'Starlight Sparks', icon: '✨', color: '#fde047' },
  hearts: { id: 'hearts', name: 'Buddy Hearts', icon: '💖', color: '#f472b6' },
  lightning: { id: 'lightning', name: 'Storm Sparks', icon: '⚡', color: '#38bdf8' },
  blossom: { id: 'blossom', name: 'Sakura Petals', icon: '🌸', color: '#fb7185' },
  cosmic: { id: 'cosmic', name: 'Astral Orbit', icon: '🪐', color: '#2dd4bf' },
};

const FALLBACK_BIOME_OFFSETS = {
  forest: -1,
  cave: 0,
  water: 0,
  volcano: 1,
  peak: 2,
  grove: 2,
};

function escapeHtml(raw) {
  return String(raw ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function getBondTierSafe(rawBond) {
  const num = Number(rawBond);
  const bond = Number.isFinite(num) ? Math.max(0, Math.min(100, Math.round(num))) : 20;
  if (typeof PokemonMod.getBondTier === 'function') {
    const res = PokemonMod.getBondTier(bond);
    if (res && typeof res === 'object') return res;
  }
  if (bond >= 85) {
    return { tier: 3, id: 'soulmate', label: 'Best Buddy', icon: '🌟', xpMult: 1.2, critBonus: 0.04, endureChance: 0.25 };
  }
  if (bond >= 60) {
    return { tier: 2, id: 'trusted', label: 'Trusted Buddy', icon: '💖', xpMult: 1.12, critBonus: 0.04, endureChance: 0.15 };
  }
  if (bond >= 40) {
    return { tier: 1, id: 'friend', label: 'Good Friend', icon: '💛', xpMult: 1.08, critBonus: 0.02, endureChance: 0 };
  }
  return { tier: 0, id: 'partner', label: 'New Partner', icon: '🌱', xpMult: 1.0, critBonus: 0, endureChance: 0 };
}

export function getTrainerAppearanceOptions() {
  const stylesMap = Config.TRAINER_STYLES && Object.keys(Config.TRAINER_STYLES).length >= Object.keys(FALLBACK_STYLES).length
    ? Config.TRAINER_STYLES
    : { ...FALLBACK_STYLES, ...(Config.TRAINER_STYLES || TRAINER_STYLES || {}) };
  const accMap = Config.TRAINER_ACCESSORIES && Object.keys(Config.TRAINER_ACCESSORIES).length >= Object.keys(FALLBACK_ACCESSORIES).length
    ? Config.TRAINER_ACCESSORIES
    : { ...FALLBACK_ACCESSORIES, ...(Config.TRAINER_ACCESSORIES || TRAINER_ACCESSORIES || {}) };
  const aurasMap = Config.TRAINER_AURAS && Object.keys(Config.TRAINER_AURAS).length >= Object.keys(FALLBACK_AURAS).length
    ? Config.TRAINER_AURAS
    : { ...FALLBACK_AURAS, ...(Config.TRAINER_AURAS || {}) };
  return { stylesMap, accMap, aurasMap };
}

export function getTrainerPowerSafe(profile) {
  if (typeof PokemonMod.getTrainerPowerLevel === 'function') {
    const val = Number(PokemonMod.getTrainerPowerLevel(profile));
    if (Number.isFinite(val)) return val;
  }
  const levels = (profile?.team || [])
    .map((m) => Number(m?.level) || 1)
    .sort((a, b) => b - a);
  if (levels.length === 0) return 5;
  const top1 = levels[0];
  const top2 = levels[1] ?? top1;
  const badgeBonus = (profile?.badges?.length || 0) * 0.45;
  return Math.max(1, Math.min(50, Math.round(top1 * 0.68 + top2 * 0.32 + badgeBonus)));
}

export function getBiomeScaledInfo(biome, profile) {
  if (!biome || biome.id === 'village' || !Array.isArray(biome.levelRange)) {
    return {
      isSafe: true,
      minLv: null,
      maxLv: null,
      baseMin: null,
      baseMax: null,
      threatLabel: 'Safe Zone',
      threatTone: 'safe',
      isScaled: false,
    };
  }

  const [baseMin, baseMax] = biome.levelRange;
  if (typeof PokemonMod.getBiomeScaledRange === 'function') {
    const res = PokemonMod.getBiomeScaledRange(biome.id, profile);
    if (res && Number.isFinite(res.minLv) && Number.isFinite(res.maxLv)) {
      const label = res.threatLabel || 'Balanced';
      return {
        isSafe: false,
        minLv: res.minLv,
        maxLv: res.maxLv,
        baseMin: res.baseMin ?? baseMin,
        baseMax: res.baseMax ?? baseMax,
        threatLabel: label,
        threatTone: String(res.threatTone || label).toLowerCase(),
        isScaled: Boolean(res.isScaled),
      };
    }
  }

  const power = getTrainerPowerSafe(profile);
  const badgesCount = profile?.badges?.length || 0;
  if (badgesCount === 0 && power <= baseMax) {
    return {
      isSafe: false,
      minLv: baseMin,
      maxLv: baseMax,
      baseMin,
      baseMax,
      threatLabel: 'Balanced',
      threatTone: 'balanced',
      isScaled: false,
    };
  }

  const offset = FALLBACK_BIOME_OFFSETS[biome.id] ?? 0;
  const center = Math.max(baseMin, Math.min(50, power + offset));
  const minLv = Math.max(baseMin, Math.min(48, center - 2));
  const maxLv = Math.min(50, Math.max(minLv + 2, center + 2));
  let threatLabel = 'Balanced';
  if (maxLv >= 28) threatLabel = 'Apex';
  else if (maxLv >= 18) threatLabel = 'Veteran';
  else if (maxLv > baseMax || offset > 0) threatLabel = 'Challenging';

  return {
    isSafe: false,
    minLv,
    maxLv,
    baseMin,
    baseMax,
    threatLabel,
    threatTone: threatLabel.toLowerCase(),
    isScaled: minLv !== baseMin || maxLv !== baseMax,
  };
}

export function hasAnyReadyEvolutionSafe(profile, storage = null) {
  if (!profile) return false;
  if (typeof storage?.hasAnyReadyEvolution === 'function') {
    return Boolean(storage.hasAnyReadyEvolution(profile));
  }
  const gems = profile.bag?.gems || {};
  const mons = [...(profile.team || []), ...(profile.box || [])];
  return mons.some((mon) => {
    if (!mon) return false;
    if (typeof mon.getPendingLevelEvolution === 'function' && mon.getPendingLevelEvolution()) {
      return true;
    }
    if (typeof mon.getAvailableItemEvolutions === 'function') {
      return mon.getAvailableItemEvolutions(gems).some((opt) => opt.canUse);
    }
    return false;
  });
}

function resolveDexSpeciesId(raw) {
  if (typeof raw === 'number') {
    return Number.isInteger(raw) && SPECIES[raw] ? raw : null;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim().replace(/^#/, '');
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      return Number.isInteger(num) && SPECIES[num] ? num : null;
    }
    const lower = trimmed.toLowerCase();
    if (lower) {
      for (const sp of Object.values(SPECIES)) {
        if (sp.name.toLowerCase() === lower) {
          return sp.id;
        }
      }
    }
  }
  return null;
}

export function getReconciledDexState(profile, storage = null) {
  const caughtMap = new Map();
  const seenSet = new Set();
  if (!profile) {
    return { caughtMap, seenSet };
  }

  storage?.syncPokedex?.(profile, true);

  const rawCaught = profile.pokedex?.caught;
  if (Array.isArray(rawCaught)) {
    for (const rawId of rawCaught) {
      const numId = resolveDexSpeciesId(rawId);
      if (numId !== null) {
        caughtMap.set(numId, Math.max(caughtMap.get(numId) || 0, 1));
      }
    }
  } else if (rawCaught && typeof rawCaught === 'object') {
    for (const [rawKey, rawCount] of Object.entries(rawCaught)) {
      const numId = resolveDexSpeciesId(rawKey);
      if (numId === null) continue;
      const numCount = rawCount === true ? 1 : Number(rawCount);
      if (Number.isFinite(numCount) && numCount > 0) {
        caughtMap.set(numId, Math.max(caughtMap.get(numId) || 0, Math.floor(numCount) || 1));
      }
    }
  }

  const rawSeen = profile.pokedex?.seen;
  if (Array.isArray(rawSeen)) {
    for (const rawId of rawSeen) {
      const numId = resolveDexSpeciesId(rawId);
      if (numId !== null) {
        seenSet.add(numId);
      }
    }
  } else if (rawSeen && typeof rawSeen === 'object') {
    for (const [rawKey, flag] of Object.entries(rawSeen)) {
      if (!flag) continue;
      const numId = resolveDexSpeciesId(rawKey);
      if (numId !== null) {
        seenSet.add(numId);
      }
    }
  }

  const starterId = resolveDexSpeciesId(profile.starterId);
  if (starterId !== null) {
    caughtMap.set(starterId, Math.max(caughtMap.get(starterId) || 0, 1));
    seenSet.add(starterId);
  }

  const ownedCounts = new Map();
  for (const mon of [...(profile.team || []), ...(profile.box || [])]) {
    if (!mon) continue;
    const spId = resolveDexSpeciesId(mon.speciesId);
    if (spId !== null) {
      ownedCounts.set(spId, (ownedCounts.get(spId) || 0) + 1);
    }
  }
  for (const [spId, ownedCount] of ownedCounts.entries()) {
    caughtMap.set(spId, Math.max(caughtMap.get(spId) || 0, ownedCount));
    seenSet.add(spId);
  }

  for (const id of caughtMap.keys()) {
    seenSet.add(id);
  }

  return { caughtMap, seenSet };
}

function formatEvolutionCondition(rule) {
  if (!rule) return '';
  const parts = [];
  if (rule.item) {
    const gem = EVOLUTION_ITEMS?.[rule.item];
    parts.push(`${gem?.icon || '💎'} ${gem?.name || rule.item}`);
  }
  if (rule.minLevel) {
    parts.push(`Lv.${rule.minLevel}`);
  }
  return parts.join(' or ');
}

function formatRewardsList(rewards = {}) {
  const chips = [];
  if (rewards.potions) chips.push(`🍓 ${rewards.potions} Potion${rewards.potions > 1 ? 's' : ''}`);
  if (rewards.greatBalls) chips.push(`🔵 ${rewards.greatBalls} Great Ball${rewards.greatBalls > 1 ? 's' : ''}`);
  if (rewards.starBalls) chips.push(`🌟 ${rewards.starBalls} Star Ball${rewards.starBalls > 1 ? 's' : ''}`);
  if (rewards.starShards) chips.push(`✨ ${rewards.starShards} Star Shard${rewards.starShards > 1 ? 's' : ''}`);
  if (rewards.gems && typeof rewards.gems === 'object') {
    for (const [gemId, count] of Object.entries(rewards.gems)) {
      if (count > 0) {
        const gem = EVOLUTION_ITEMS?.[gemId];
        chips.push(`${gem?.icon || '💎'} ${count} ${gem?.name || gemId}`);
      }
    }
  }
  return chips;
}

function formatCompassArrow(guidance, profile) {
  if (!guidance) return '🧭 Explore';
  if (guidance.distance === 0) return '✨ Here';
  if (typeof guidance.arrowDir === 'string' && /[↑↓←→↗↘↙↖]/.test(guidance.arrowDir) && /[A-Za-z]/.test(guidance.arrowDir)) {
    return guidance.arrowDir;
  }
  if (Number.isFinite(guidance.targetX) && Number.isFinite(guidance.targetY) && profile?.pos) {
    const dx = guidance.targetX - profile.pos.x;
    const dy = guidance.targetY - profile.pos.y;
    if (Math.abs(dx) + Math.abs(dy) <= 1) return '✨ Here';
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle >= -22.5 && angle < 22.5) return '→ East';
    if (angle >= 22.5 && angle < 67.5) return '↘ SE';
    if (angle >= 67.5 && angle < 112.5) return '↓ South';
    if (angle >= 112.5 && angle < 157.5) return '↙ SW';
    if (angle >= 157.5 || angle < -157.5) return '← West';
    if (angle >= -157.5 && angle < -112.5) return '↖ NW';
    if (angle >= -112.5 && angle < -67.5) return '↑ North';
    return '↗ NE';
  }
  return guidance.arrowDir || '🧭 Explore';
}

export class PokedexUI {
  constructor({ storage, audio, onTeamChanged, onBadgesUnlocked, onAppearanceChanged, onClose }) {
    this.storage = storage;
    this.audio = audio;
    this.onTeamChanged = onTeamChanged;
    this.onBadgesUnlocked = onBadgesUnlocked;
    this.onAppearanceChanged = onAppearanceChanged;
    this.onClose = onClose;

    this.modalEl = document.getElementById('pokedex-modal');
    this.closeBtn = document.getElementById('pokedex-close-btn');
    this.bodyEl = document.getElementById('pokedex-body');

    this.tabButtons = {
      dex: document.getElementById('pokedex-tab-dex'),
      team: document.getElementById('pokedex-tab-team'),
      badges: document.getElementById('pokedex-tab-badges'),
      guide: document.getElementById('pokedex-tab-guide'),
      trainer: document.getElementById('pokedex-tab-trainer'),
    };

    this.activeTab = 'dex';
    this.dexFilter = 'all';
    this.selectedSpeciesId = null;
    this.swapBoxIndex = null;
    this.evoBanner = null;
    this.editingNicknameUid = null;
    this._fallbackStyle = null;
    this._fallbackAcc = null;
    this._fallbackAura = null;

    this.bindUI();
  }

  bindUI() {
    this.closeBtn?.addEventListener('click', () => {
      this.audio.playMenuBlip(480);
      this.close();
    });

    this.modalEl?.addEventListener('click', (e) => {
      if (e.target === this.modalEl) {
        this.close();
      }
    });

    Object.entries(this.tabButtons).forEach(([tab, btn]) => {
      btn?.addEventListener('click', () => {
        this.audio.playMenuBlip(680);
        this.activeTab = tab;
        this.swapBoxIndex = null;
        this.evoBanner = null;
        this.editingNicknameUid = null;
        if (tab === 'dex') {
          this.dexFilter = 'all';
        }
        this.render();
      });
    });
  }

  isOpen() {
    return Boolean(this.modalEl && !this.modalEl.hidden);
  }

  open(tab = 'dex') {
    this.activeTab = tab;
    this.swapBoxIndex = null;
    this.evoBanner = null;
    this.editingNicknameUid = null;
    this._fallbackStyle = null;
    this._fallbackAcc = null;
    this._fallbackAura = null;
    if (tab === 'dex') {
      this.dexFilter = 'all';
    }
    if (this.modalEl) {
      this.modalEl.hidden = false;
    }
    this.render();
  }

  close() {
    const wasOpen = this.isOpen();
    this.evoBanner = null;
    this.editingNicknameUid = null;
    this._fallbackStyle = null;
    this._fallbackAcc = null;
    this._fallbackAura = null;
    if (this.modalEl) {
      this.modalEl.hidden = true;
    }
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (wasOpen) {
      this.onClose?.();
    }
  }

  render() {
    const profile = this.storage.getActiveProfile();
    if (!profile || !this.bodyEl) return;

    Object.entries(this.tabButtons).forEach(([tab, btn]) => {
      btn?.classList.toggle('is-active', tab === this.activeTab);
    });

    if (this.activeTab === 'dex') {
      this.renderDex(profile);
    } else if (this.activeTab === 'team') {
      this.renderTeam(profile);
    } else if (this.activeTab === 'guide') {
      this.renderGuide(profile);
    } else if (this.activeTab === 'trainer') {
      this.renderTrainer(profile);
    } else {
      this.renderBadges(profile);
    }
  }

  buildEvolutionChainEl(selected, selSeen) {
    const box = document.createElement('div');
    box.className = 'dex-evo-chain';

    if (!selSeen) {
      box.innerHTML = '<span>🧬 Meet or catch this Pokémon to reveal its evolution chain!</span>';
      return box;
    }

    const fromRules = [];
    for (const [fromIdStr, rules] of Object.entries(EVOLUTIONS || {})) {
      const fromId = Number(fromIdStr);
      for (const rule of rules || []) {
        if (rule.to === selected.id) {
          fromRules.push({ fromId, rule });
        }
      }
    }
    const toRules = EVOLUTIONS?.[selected.id] || [];

    if (fromRules.length === 0 && toRules.length === 0) {
      box.innerHTML = '<span>🧬 Stand-alone Pokémon (No Evolution)</span>';
      return box;
    }

    const label = document.createElement('span');
    label.className = 'dex-evo-label';
    label.textContent = '🧬 Evolution Family:';
    box.appendChild(label);

    const makeChip = (prefix, speciesId, condText) => {
      const sp = SPECIES[speciesId];
      if (!sp) return null;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'dex-evo-chip';
      chip.textContent = `${prefix} ${sp.name}${condText ? ` (${condText})` : ''}`;
      chip.addEventListener('click', () => {
        this.audio.playMenuBlip(700);
        this.selectedSpeciesId = sp.id;
        this.render();
      });
      return chip;
    };

    for (const { fromId, rule } of fromRules) {
      const chip = makeChip('Evolves from', fromId, formatEvolutionCondition(rule));
      if (chip) box.appendChild(chip);
    }
    for (const rule of toRules) {
      const chip = makeChip('Evolves into', rule.to, formatEvolutionCondition(rule));
      if (chip) box.appendChild(chip);
    }

    return box;
  }

  renderDex(profile) {
    const allSpecies = Object.values(SPECIES).sort((a, b) => a.id - b.id);
    const { caughtMap, seenSet } = getReconciledDexState(profile, this.storage);
    const caughtCount = allSpecies.filter((sp) => (caughtMap.get(sp.id) || 0) > 0).length;
    const seenCount = allSpecies.filter((sp) => seenSet.has(sp.id)).length;

    const filterDefs = [
      { id: 'all', label: `All (${allSpecies.length})` },
      { id: 'caught', label: `Caught (${caughtCount})` },
      { id: 'uncaught', label: `Need to Catch (${allSpecies.length - caughtCount})` },
      { id: 'forest', label: '🌲 Forest' },
      { id: 'cave', label: '💎 Cave' },
      { id: 'water', label: '🌊 Lagoon' },
      { id: 'volcano', label: '🌋 Caldera' },
      { id: 'peak', label: '❄️ Peak' },
      { id: 'grove', label: '🌸 Grove' },
      { id: 'starter', label: '🌟 Starters' },
    ];
    if (!filterDefs.some((f) => f.id === this.dexFilter)) {
      this.dexFilter = 'all';
    }

    const filteredSpecies = allSpecies.filter((sp) => {
      const isCaught = (caughtMap.get(sp.id) || 0) > 0;
      if (this.dexFilter === 'all') return true;
      if (this.dexFilter === 'caught') return isCaught;
      if (this.dexFilter === 'uncaught') return !isCaught;
      return sp.biome === this.dexFilter;
    });

    if (filteredSpecies.length > 0 && !filteredSpecies.some((sp) => sp.id === this.selectedSpeciesId)) {
      this.selectedSpeciesId = filteredSpecies[0].id;
    } else if (!this.selectedSpeciesId || !SPECIES[this.selectedSpeciesId]) {
      this.selectedSpeciesId = allSpecies[0].id;
    }

    const wrap = document.createElement('div');
    wrap.className = 'dex-layout';

    const header = document.createElement('div');
    header.className = 'dex-summary-bar';
    header.innerHTML = `
      <span>📖 Caught: <strong>${caughtCount}/${allSpecies.length}</strong></span>
      <span>👀 Seen: <strong>${seenCount}/${allSpecies.length}</strong></span>
      <span>🏆 Wins: <strong>${profile.stats?.battlesWon || 0}</strong></span>
      <span>✨ Shimmers: <strong>${profile.stats?.shiniesFound || 0}</strong></span>
    `;
    wrap.appendChild(header);

    const filterBar = document.createElement('div');
    filterBar.className = 'dex-filter-bar';
    for (const f of filterDefs) {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.dataset.filter = f.id;
      pill.className = `dex-filter-pill ${this.dexFilter === f.id ? 'is-active' : ''}`;
      pill.textContent = f.label;
      pill.addEventListener('click', () => {
        this.audio.playMenuBlip(680);
        this.dexFilter = f.id;
        this.render();
      });
      filterBar.appendChild(pill);
    }
    wrap.appendChild(filterBar);

    const grid = document.createElement('div');
    grid.className = 'dex-grid';

    if (filteredSpecies.length === 0) {
      const emptyNote = document.createElement('p');
      emptyNote.className = 'empty-note dex-empty-note';
      emptyNote.textContent = '✨ No Pokémon match this filter yet — keep exploring Starlight Island!';
      grid.appendChild(emptyNote);
    }

    for (const sp of filteredSpecies) {
      const isCaught = (caughtMap.get(sp.id) || 0) > 0;
      const isSeen = isCaught || seenSet.has(sp.id);
      const typeInfo = TYPES[sp.type] || TYPES.normal;

      const card = document.createElement('button');
      card.type = 'button';
      card.className = [
        'dex-card',
        isCaught ? 'is-caught' : isSeen ? 'is-seen' : 'is-unknown',
        this.selectedSpeciesId === sp.id ? 'is-selected' : '',
      ].filter(Boolean).join(' ');

      const numBadge = document.createElement('span');
      numBadge.className = 'dex-num';
      numBadge.textContent = `#${String(sp.id).padStart(3, '0')}`;
      card.appendChild(numBadge);

      if (isSeen) {
        const img = document.createElement('img');
        img.className = `dex-sprite ${isCaught ? 'is-caught-sprite' : 'is-seen-sprite'}`;
        attachPokemonSprite(img, sp.id, { back: false, timeoutMs: 2200 });
        card.appendChild(img);
      } else {
        const mystery = document.createElement('div');
        mystery.className = 'dex-mystery';
        mystery.textContent = '?';
        card.appendChild(mystery);
      }

      const nameEl = document.createElement('div');
      nameEl.className = 'dex-name';
      nameEl.textContent = isSeen ? sp.name : '???';
      card.appendChild(nameEl);

      const badge = document.createElement('span');
      badge.className = 'type-pill';
      if (isCaught) {
        badge.textContent = `${typeInfo.icon} ${typeInfo.label}`;
        badge.style.backgroundColor = typeInfo.bg;
        badge.style.borderColor = typeInfo.color;
      } else if (isSeen) {
        badge.textContent = 'Seen';
        badge.style.backgroundColor = '#334155';
      } else {
        const biomeLabel = sp.biome === 'starter' ? 'Lab' : (BIOMES[sp.biome]?.name.split(' ')[0] || 'Wild');
        badge.textContent = biomeLabel;
        badge.style.backgroundColor = '#1e293b';
      }
      card.appendChild(badge);

      card.addEventListener('click', () => {
        this.audio.playMenuBlip(700);
        this.selectedSpeciesId = sp.id;
        this.render();
      });

      grid.appendChild(card);
    }
    wrap.appendChild(grid);

    const selected = SPECIES[this.selectedSpeciesId] || allSpecies[0];
    const selCaught = caughtMap.get(selected.id) || 0;
    const selSeen = selCaught > 0 || seenSet.has(selected.id);
    const selType = TYPES[selected.type] || TYPES.normal;
    const habitat = selected.biome === 'starter'
      ? 'Professor Lab Trio'
      : BIOMES[selected.biome]?.name || 'Starlight Island';

    const detail = document.createElement('div');
    detail.className = 'dex-detail';

    if (selSeen) {
      const sprite = document.createElement('img');
      sprite.className = `dex-detail-sprite ${selCaught > 0 ? 'is-caught-sprite' : 'is-seen-sprite'}`;
      attachPokemonSprite(sprite, selected.id, { back: false, timeoutMs: 2200 });
      detail.appendChild(sprite);
    }

    const info = document.createElement('div');
    info.className = 'dex-detail-info';
    const moveTags = selCaught
      ? selected.movePool.map((mId) => MOVES[mId]?.name).filter(Boolean).join(' • ')
      : 'Catch to inspect full moveset!';
    const typeBadgeHtml = selSeen
      ? `<span class="type-pill" style="background:${selType.bg};border-color:${selType.color}">${selType.icon} ${selType.label}</span>`
      : '<span class="type-pill" style="background:#1e293b;border-color:#475569">❓ Unknown</span>';

    info.innerHTML = `
      <div class="dex-detail-head">
        <strong>#${String(selected.id).padStart(3, '0')} ${selSeen ? selected.name : 'Undiscovered Pokémon'}</strong>
        ${typeBadgeHtml}
      </div>
      <p class="dex-detail-flavor">${selCaught ? selected.flavor : `Habitat Clue: Explore ${habitat} to meet this Pokémon!`}</p>
      <div class="dex-detail-meta">
        <span>📍 ${habitat}</span>
        <span>🔴 Caught: ${selCaught}</span>
        <span>⚔️ ${moveTags}</span>
      </div>
    `;
    info.appendChild(this.buildEvolutionChainEl(selected, selSeen));
    detail.appendChild(info);
    wrap.appendChild(detail);

    this.bodyEl.innerHTML = '';
    this.bodyEl.appendChild(wrap);
  }

  getMonEvolutionOptions(mon, bagGems = {}) {
    const levelEvo = typeof mon.getPendingLevelEvolution === 'function' ? mon.getPendingLevelEvolution() : null;
    const itemEvos = typeof mon.getAvailableItemEvolutions === 'function'
      ? mon.getAvailableItemEvolutions(bagGems)
      : [];
    const rules = EVOLUTIONS?.[mon.speciesId] || [];

    const ready = [];
    const hints = [];

    if (levelEvo) {
      const targetName = levelEvo.toSpecies?.name || SPECIES[levelEvo.toId]?.name || 'Evolution';
      ready.push({
        toId: levelEvo.toId,
        targetName,
        item: null,
        label: `✨ Evolve → ${targetName}!`,
      });
    }

    for (const opt of itemEvos) {
      if (levelEvo && opt.toId === levelEvo.toId) continue;
      const targetName = opt.toSpecies?.name || SPECIES[opt.toId]?.name || 'Evolution';
      const matchedRule = rules.find((rule) => rule.to === opt.toId && rule.item === opt.item);
      const minLevel = Number(opt.minLevel ?? matchedRule?.minLevel);
      if (opt.canUse) {
        ready.push({
          toId: opt.toId,
          targetName,
          item: opt.item,
          label: `✨ ${opt.itemInfo?.icon || '💎'} Evolve → ${targetName}!`,
        });
      } else {
        const levelHint = Number.isFinite(minLevel) && mon.level < minLevel
          ? ` (or Lv.${minLevel})`
          : '';
        hints.push(`${opt.itemInfo?.icon || '💎'} Evolves with ${opt.itemInfo?.name || opt.item}${levelHint}`);
      }
    }

    if (!levelEvo) {
      for (const rule of rules) {
        if (!rule.item && rule.minLevel && mon.level < rule.minLevel) {
          const targetName = SPECIES[rule.to]?.name || 'Evolution';
          hints.push(`⬆️ Evolves to ${targetName} at Lv.${rule.minLevel}`);
          break;
        }
      }
    }

    return { ready, hints };
  }

  triggerInModalEvolution(mon, option) {
    if (typeof this.storage.evolvePokemon !== 'function') return;
    const oldName = mon.name;
    const res = this.storage.evolvePokemon(mon.uid, option.toId, option.item || null);
    const evo = res?.evolution || res;
    if (!evo) return;

    if (typeof this.audio?.playEvolutionFanfare === 'function') {
      this.audio.playEvolutionFanfare();
    } else {
      this.audio?.playLevelUp?.();
    }

    this.evoBanner = {
      kind: 'evo',
      oldName: evo.oldName || oldName,
      newName: evo.newName || option.targetName,
      unlockedMoves: Array.isArray(evo.unlockedMoves) ? evo.unlockedMoves : [],
      isShiny: Boolean(mon.isShiny),
    };

    this.onTeamChanged?.();
    if (res?.newBadges?.length) {
      this.onBadgesUnlocked?.(res.newBadges);
    }
    this.render();
  }

  triggerPokemonUpgrade(mon) {
    if (!mon || typeof this.storage.upgradePokemon !== 'function') return;
    const prevStats = {
      maxHp: Number(mon.maxHp) || 0,
      atk: Number(mon.atk) || 0,
      def: Number(mon.def) || 0,
      spd: Number(mon.spd) || 0,
      tier: Math.max(0, Number(mon.upgradeTier) || 0),
    };

    const res = this.storage.upgradePokemon(mon.uid);
    if (!res?.upgraded) return;

    if (typeof this.audio?.playUpgradeFanfare === 'function') {
      this.audio.playUpgradeFanfare();
    } else {
      this.audio?.playLevelUp?.();
    }

    const newTier = Math.max(prevStats.tier + 1, Number(res.newTier ?? mon.upgradeTier) || prevStats.tier + 1);
    const pendingEvoName = res.pendingEvo?.toSpecies?.name
      || (res.pendingEvo?.toId ? SPECIES[res.pendingEvo.toId]?.name : null);

    this.evoBanner = {
      kind: 'upgrade',
      monName: mon.displayName || mon.name,
      isShiny: Boolean(mon.isShiny),
      oldTier: res.oldTier ?? prevStats.tier,
      newTier,
      hpGain: Math.max(0, (Number(mon.maxHp) || 0) - prevStats.maxHp),
      atkGain: Math.max(0, (Number(mon.atk) || 0) - prevStats.atk),
      defGain: Math.max(0, (Number(mon.def) || 0) - prevStats.def),
      spdGain: Math.max(0, (Number(mon.spd) || 0) - prevStats.spd),
      levelsGained: Number(res.levelResult?.levelsGained) || 0,
      newLevel: Number(res.levelResult?.newLevel ?? mon.level) || mon.level,
      pendingEvoName,
      newBadges: Array.isArray(res.newBadges) ? res.newBadges : [],
    };

    this.onTeamChanged?.();
    if (res.newBadges?.length) {
      this.onBadgesUnlocked?.(res.newBadges);
    }
    this.render();
  }

  triggerBuddyCheer(mon) {
    if (!mon) return;
    let res = null;
    if (typeof this.storage.cheerPokemon === 'function') {
      res = this.storage.cheerPokemon(mon.uid);
    } else {
      const prevBond = Number.isFinite(Number(mon.bond)) ? Number(mon.bond) : 20;
      const nextBond = typeof mon.gainBond === 'function'
        ? mon.gainBond(10)
        : Math.min(100, Math.max(0, Math.round(prevBond + 10)));
      if (typeof mon.gainBond !== 'function') mon.bond = nextBond;
      const newBadges = this.storage.evaluateBadges?.(false) || [];
      this.storage.save?.();
      res = {
        cheered: true,
        bond: nextBond,
        tier: getBondTierSafe(nextBond),
        newBadges,
      };
    }
    if (!res?.cheered) return;

    if (typeof this.audio?.playBuddyCheer === 'function') {
      this.audio.playBuddyCheer();
    } else {
      this.audio?.playMenuBlip?.(820);
    }

    const finalBond = Number.isFinite(Number(res.bond)) ? Number(res.bond) : (Number(mon.bond) || 20);
    const tier = res.tier || getBondTierSafe(finalBond);
    this.evoBanner = {
      kind: 'cheer',
      monName: mon.displayName || mon.name,
      isShiny: Boolean(mon.isShiny),
      bond: finalBond,
      tier,
      newBadges: Array.isArray(res.newBadges) ? res.newBadges : [],
    };

    this.onTeamChanged?.();
    if (res.newBadges?.length) {
      this.onBadgesUnlocked?.(res.newBadges);
    }
    this.render();
  }

  buildMonStatsRow(mon, compact = false) {
    const atk = typeof mon.getEffectiveAtk === 'function' ? mon.getEffectiveAtk() : mon.atk;
    const def = typeof mon.getEffectiveDef === 'function' ? mon.getEffectiveDef() : mon.def;
    const spd = typeof mon.getEffectiveSpd === 'function' ? mon.getEffectiveSpd() : mon.spd;
    const row = document.createElement('div');
    row.className = `mon-stats-row${compact ? ' is-compact' : ''}`;
    row.innerHTML = `
      <span>⚔️ ATK <strong>${atk ?? 0}</strong></span>
      <span>🛡️ DEF <strong>${def ?? 0}</strong></span>
      <span>💨 SPD <strong>${spd ?? 0}</strong></span>
    `;
    return row;
  }

  buildPowerUpControl(mon, starShards, maxTier, compact = false) {
    const tier = Math.max(0, Number(mon.upgradeTier) || 0);
    if (tier >= maxTier) {
      const maxPill = document.createElement('span');
      maxPill.className = `rank-max-pill${compact ? ' is-compact' : ''}`;
      maxPill.textContent = '★ MAX RANK';
      return maxPill;
    }

    const cost = typeof mon.getUpgradeCost === 'function'
      ? mon.getUpgradeCost()
      : (tier + 1) * 2;
    const safeCost = Math.max(1, Number(cost) || 2);
    const canAfford = starShards >= safeCost;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `upgrade-btn${compact ? ' is-compact' : ''}`;
    btn.textContent = `⚡ Power Up (${safeCost} ✨)`;
    btn.disabled = !canAfford;
    btn.title = canAfford
      ? `Boost HP/ATK/DEF/SPD +5% to ★${tier + 1}, full heal & gain bonus XP`
      : `Need ${safeCost} Star Shards (you have ${starShards})`;
    btn.addEventListener('click', () => this.triggerPokemonUpgrade(mon));
    return btn;
  }

  renderTeam(profile) {
    const wrap = document.createElement('div');
    wrap.className = 'team-layout';

    const maxTier = Math.max(1, Number(PokemonMod.MAX_UPGRADE_TIER) || 5);
    const starShards = Math.max(0, Number(profile.bag?.starShards) || 0);
    const gems = profile.bag?.gems || {};
    const gemItems = Object.values(EVOLUTION_ITEMS || {});
    const gemBadgesHtml = gemItems.map((gem) => (
      `<span class="gem-chip" title="${gem.name}: ${gem.description}">${gem.icon} <strong>${gems[gem.id] || 0}</strong></span>`
    )).join('');

    const starBalls = profile.bag?.starBalls || 0;
    const bagBar = document.createElement('div');
    bagBar.className = 'dex-summary-bar';
    bagBar.innerHTML = `
      <span>🍓 Potions: <strong>${profile.bag.potions}</strong></span>
      <span>🔵 Great Balls: <strong>${profile.bag.greatBalls}</strong></span>
      <span>🌟 Star Balls: <strong>${starBalls}</strong></span>
      <span>✨ Shards: <strong>${profile.bag?.starShards ?? 0}</strong></span>
      <span>🔴 Poké Balls: <strong>∞</strong></span>
      <span class="gem-bag-strip">💎 Gems: ${gemBadgesHtml || 'None'}</span>
    `;
    wrap.appendChild(bagBar);

    if (this.evoBanner) {
      const banner = document.createElement('div');
      banner.className = 'evo-celebration-banner';
      const copy = document.createElement('div');

      if (this.evoBanner.kind === 'upgrade') {
        const b = this.evoBanner;
        const statParts = [];
        if (b.hpGain > 0) statParts.push(`+${b.hpGain} HP`);
        if (b.atkGain > 0) statParts.push(`+${b.atkGain} ATK`);
        if (b.defGain > 0) statParts.push(`+${b.defGain} DEF`);
        if (b.spdGain > 0) statParts.push(`+${b.spdGain} SPD`);
        const statText = statParts.length ? statParts.join(' • ') : '+5% Starlight Stat Boost';
        const xpText = b.levelsGained > 0
          ? `⬆️ Leveled up to Lv.${b.newLevel}!`
          : '✨ Bonus XP, Full Heal & +10 Bond!';
        const extraBits = [
          b.pendingEvoName ? `🌟 Evolution Ready → ${b.pendingEvoName}!` : '',
          b.newBadges?.length ? `🏅 Badge Unlocked: ${b.newBadges.map((badge) => badge.name).join(', ')}!` : '',
        ].filter(Boolean);

        copy.innerHTML = `
          <div class="evo-celebration-eyebrow">⚡ STARLIGHT POWER UP • ★${b.newTier}${b.newTier >= maxTier ? ' MAX!' : ''}</div>
          <strong>${b.isShiny ? '✨ ' : ''}${escapeHtml(b.monName)} reached Star Rank ★${b.newTier}!</strong>
          <p>${statText} • ${xpText}${extraBits.length ? ` • ${extraBits.join(' • ')}` : ''}</p>
        `;
      } else if (this.evoBanner.kind === 'cheer') {
        const b = this.evoBanner;
        const tier = b.tier || getBondTierSafe(b.bond);
        const perks = [];
        if (tier.xpMult > 1) perks.push(`+${Math.round((tier.xpMult - 1) * 100)}% XP`);
        if (tier.critBonus > 0) perks.push(`+${Math.round(tier.critBonus * 100)}% Crit`);
        if (tier.endureChance > 0) perks.push(`${Math.round(tier.endureChance * 100)}% Endure`);
        const perkText = perks.length ? ` • Perks: ${perks.join(', ')}` : ' • Reach 40+ Bond for bonus XP & Crit!';
        const badgeText = b.newBadges?.length
          ? ` • 🏅 Badge Unlocked: ${b.newBadges.map((badge) => escapeHtml(badge.name)).join(', ')}!`
          : '';
        copy.innerHTML = `
          <div class="evo-celebration-eyebrow">💖 BUDDY CHEER • ${tier.icon} ${escapeHtml(tier.label.toUpperCase())}</div>
          <strong>${b.isShiny ? '✨ ' : ''}${escapeHtml(b.monName)} beamed with joy! (Bond ${b.bond}/100)</strong>
          <p>${tier.icon} ${escapeHtml(tier.label)}${perkText}${badgeText}</p>
        `;
      } else {
        const moveNames = (this.evoBanner.unlockedMoves || [])
          .map((mId) => MOVES[mId]?.name || mId)
          .filter(Boolean);
        copy.innerHTML = `
          <div class="evo-celebration-eyebrow">🌟 STARLIGHT EVOLUTION COMPLETE!</div>
          <strong>${this.evoBanner.isShiny ? '✨ ' : ''}${escapeHtml(this.evoBanner.oldName)} evolved into ${escapeHtml(this.evoBanner.newName)}!</strong>
          ${moveNames.length ? `<p>Unlocked moves: ${moveNames.join(' • ')}</p>` : '<p>Stats surged higher for new island adventures!</p>'}
        `;
      }

      const dismissBtn = document.createElement('button');
      dismissBtn.type = 'button';
      dismissBtn.className = 'mini-btn';
      dismissBtn.textContent = 'Awesome!';
      dismissBtn.addEventListener('click', () => {
        this.evoBanner = null;
        this.render();
      });
      banner.appendChild(copy);
      banner.appendChild(dismissBtn);
      wrap.appendChild(banner);
    }

    if (this.swapBoxIndex !== null) {
      const notice = document.createElement('div');
      notice.className = 'swap-notice';
      const boxMon = profile.box[this.swapBoxIndex];
      const swapLabel = document.createElement('span');
      swapLabel.textContent = 'Select a Team slot below to swap with ';
      const strongSwap = document.createElement('strong');
      strongSwap.textContent = `${boxMon?.displayName || boxMon?.name} (Lv.${boxMon?.level})`;
      swapLabel.appendChild(strongSwap);
      notice.appendChild(swapLabel);

      const cancelSwap = document.createElement('button');
      cancelSwap.type = 'button';
      cancelSwap.className = 'mini-btn';
      cancelSwap.textContent = 'Cancel';
      cancelSwap.addEventListener('click', () => {
        this.swapBoxIndex = null;
        this.render();
      });
      notice.appendChild(cancelSwap);
      wrap.appendChild(notice);
    }

    const teamTitle = document.createElement('h3');
    teamTitle.className = 'section-heading';
    teamTitle.textContent = `Active Team (${profile.team.length}/6)`;
    wrap.appendChild(teamTitle);

    const teamGrid = document.createElement('div');
    teamGrid.className = 'team-grid';
    let focusNicknameInput = null;

    profile.team.forEach((mon, idx) => {
      const typeInfo = TYPES[mon.type] || TYPES.normal;
      const hpPct = Math.round((mon.hp / Math.max(1, mon.maxHp)) * 100);
      const xpPct = Math.min(100, Math.round((mon.xp / Math.max(1, mon.xpToNext)) * 100));
      const displayName = mon.displayName || mon.name;
      const isNicknamed = Boolean(mon.nickname && mon.nickname !== mon.name);
      const bond = Number.isFinite(Number(mon.bond)) ? Math.max(0, Math.min(100, Math.round(Number(mon.bond)))) : 20;
      const bondTier = getBondTierSafe(bond);

      const card = document.createElement('div');
      card.className = `team-card ${idx === 0 ? 'is-lead' : ''} ${mon.isShiny ? 'is-shiny-card' : ''}`;

      const top = document.createElement('div');
      top.className = 'team-card-top';

      const img = document.createElement('img');
      attachPokemonSprite(img, mon, { back: false, shiny: Boolean(mon.isShiny), timeoutMs: 1800 });
      top.appendChild(img);

      const meta = document.createElement('div');
      meta.className = 'team-card-meta';

      const titleRow = document.createElement('div');
      titleRow.className = 'team-card-title';
      const titleNameWrap = document.createElement('span');
      titleNameWrap.className = 'team-name-wrap';
      const titleStrong = document.createElement('strong');
      titleStrong.textContent = displayName;
      titleNameWrap.appendChild(titleStrong);
      if (isNicknamed) {
        const subSpecies = document.createElement('span');
        subSpecies.className = 'team-species-sub';
        subSpecies.textContent = `(${mon.name})`;
        titleNameWrap.appendChild(subSpecies);
      }
      const lvSpan = document.createElement('span');
      lvSpan.className = 'team-lv';
      lvSpan.textContent = `Lv.${mon.level}`;
      titleRow.appendChild(titleNameWrap);
      titleRow.appendChild(lvSpan);
      meta.appendChild(titleRow);

      const tier = Math.max(0, Number(mon.upgradeTier) || 0);
      const pillRow = document.createElement('div');
      pillRow.className = 'team-pill-row';
      pillRow.innerHTML = `
        <span class="type-pill" style="background:${typeInfo.bg};border-color:${typeInfo.color}">${typeInfo.icon} ${typeInfo.label}</span>
        <span class="rank-pill${tier >= maxTier ? ' is-max-rank' : tier > 0 ? ' is-upgraded' : ''}">★${tier}</span>
        ${mon.isShiny ? '<span class="shiny-badge">✨ Shimmer</span>' : ''}
        <span class="bond-badge is-tier-${bondTier.tier}${bondTier.tier >= 2 ? ' is-best-buddy' : ''}" title="${escapeHtml(bondTier.label)}">${bondTier.icon} ${escapeHtml(bondTier.label)} • Bond ${bond}/100</span>
      `;
      meta.appendChild(pillRow);

      const barsWrap = document.createElement('div');
      barsWrap.innerHTML = `
        <div class="team-bar-row">HP ${mon.hp}/${mon.maxHp}</div>
        <div class="hp-track"><div class="hp-fill ${hpPct <= 22 ? 'is-low' : hpPct <= 50 ? 'is-mid' : ''}" style="width:${hpPct}%"></div></div>
        <div class="xp-track"><div class="xp-fill" style="width:${xpPct}%"></div></div>
      `;
      meta.appendChild(barsWrap);
      meta.appendChild(this.buildMonStatsRow(mon, false));

      top.appendChild(meta);
      card.appendChild(top);

      if (this.editingNicknameUid === mon.uid && this.swapBoxIndex === null) {
        const nickForm = document.createElement('form');
        nickForm.className = 'nickname-edit-form';
        const nickInput = document.createElement('input');
        nickInput.type = 'text';
        nickInput.className = 'nickname-input';
        nickInput.maxLength = 14;
        nickInput.value = mon.nickname || '';
        nickInput.placeholder = mon.name;
        nickInput.setAttribute('aria-label', `Nickname for ${mon.name}`);

        const saveBtn = document.createElement('button');
        saveBtn.type = 'submit';
        saveBtn.className = 'mini-btn is-accent nickname-save-btn';
        saveBtn.textContent = 'Save';

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'mini-btn nickname-clear-btn';
        resetBtn.title = 'Reset to species name';
        resetBtn.textContent = 'Reset';
        resetBtn.addEventListener('click', () => {
          this.storage.setPokemonNickname?.(mon.uid, '');
          this.editingNicknameUid = null;
          this.audio?.playMenuBlip?.(640);
          this.onTeamChanged?.();
          this.render();
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'mini-btn nickname-cancel-btn';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => {
          this.editingNicknameUid = null;
          this.audio?.playMenuBlip?.(520);
          this.render();
        });

        nickForm.addEventListener('submit', (e) => {
          e.preventDefault();
          this.storage.setPokemonNickname?.(mon.uid, nickInput.value);
          this.editingNicknameUid = null;
          this.audio?.playMenuBlip?.(760);
          this.onTeamChanged?.();
          this.render();
        });

        nickForm.appendChild(nickInput);
        nickForm.appendChild(saveBtn);
        nickForm.appendChild(resetBtn);
        nickForm.appendChild(cancelBtn);
        card.appendChild(nickForm);
        focusNicknameInput = nickInput;
      }

      const { ready: evoReady, hints: evoHints } = this.getMonEvolutionOptions(mon, gems);
      if (evoReady.length > 0 && this.swapBoxIndex === null) {
        const evoRow = document.createElement('div');
        evoRow.className = 'evo-btn-row';
        for (const opt of evoReady) {
          const evoBtn = document.createElement('button');
          evoBtn.type = 'button';
          evoBtn.className = 'evolve-btn';
          evoBtn.textContent = opt.label;
          evoBtn.addEventListener('click', () => this.triggerInModalEvolution(mon, opt));
          evoRow.appendChild(evoBtn);
        }
        card.appendChild(evoRow);
      } else if (evoHints.length > 0) {
        const hintRow = document.createElement('div');
        hintRow.className = 'evo-hint-row';
        for (const text of evoHints) {
          const pill = document.createElement('span');
          pill.className = 'evo-hint-pill';
          pill.textContent = text;
          hintRow.appendChild(pill);
        }
        card.appendChild(hintRow);
      }

      if (this.swapBoxIndex === null) {
        const powerRow = document.createElement('div');
        powerRow.className = 'mon-power-row';
        powerRow.appendChild(this.buildPowerUpControl(mon, starShards, maxTier, false));
        card.appendChild(powerRow);
      }

      const actions = document.createElement('div');
      actions.className = 'team-card-actions';

      if (this.swapBoxIndex !== null) {
        const swapBtn = document.createElement('button');
        swapBtn.type = 'button';
        swapBtn.className = 'mini-btn is-accent';
        swapBtn.textContent = '⇄ Swap Here';
        swapBtn.addEventListener('click', () => {
          this.audio.playMenuBlip(780);
          this.storage.swapTeamWithBox(idx, this.swapBoxIndex);
          this.swapBoxIndex = null;
          this.onTeamChanged?.();
          this.render();
        });
        actions.appendChild(swapBtn);
      } else {
        if (idx > 0) {
          const leadBtn = document.createElement('button');
          leadBtn.type = 'button';
          leadBtn.className = 'mini-btn is-accent';
          leadBtn.textContent = '★ Set Lead';
          leadBtn.addEventListener('click', () => {
            this.audio.playMenuBlip(740);
            this.storage.setLeadPokemon(idx);
            this.onTeamChanged?.();
            this.render();
          });
          actions.appendChild(leadBtn);
        } else {
          const leadPill = document.createElement('span');
          leadPill.className = 'lead-pill';
          leadPill.textContent = '★ Lead Partner';
          actions.appendChild(leadPill);
        }

        const actionBtnsRight = document.createElement('div');
        actionBtnsRight.className = 'team-card-actions-right';

        const cheerBtn = document.createElement('button');
        cheerBtn.type = 'button';
        cheerBtn.className = 'mini-btn cheer-btn';
        cheerBtn.textContent = '💖 Cheer Buddy';
        cheerBtn.title = `Cheer ${displayName} to raise Bond (+10)`;
        cheerBtn.addEventListener('click', () => this.triggerBuddyCheer(mon));
        actionBtnsRight.appendChild(cheerBtn);

        if (this.editingNicknameUid !== mon.uid) {
          const nickBtn = document.createElement('button');
          nickBtn.type = 'button';
          nickBtn.className = 'mini-btn nickname-edit-btn';
          nickBtn.textContent = '✏️ Nickname';
          nickBtn.addEventListener('click', () => {
            this.audio?.playMenuBlip?.(680);
            this.editingNicknameUid = mon.uid;
            this.render();
          });
          actionBtnsRight.appendChild(nickBtn);
        }

        if (mon.hp < mon.maxHp && profile.bag.potions > 0) {
          const healBtn = document.createElement('button');
          healBtn.type = 'button';
          healBtn.className = 'mini-btn is-heal';
          healBtn.textContent = '🍓 Heal';
          healBtn.addEventListener('click', () => {
            if (this.storage.useItem('potions')) {
              this.audio.playHealChime();
              mon.healAmount(Math.max(18, Math.round(mon.maxHp * 0.45)));
              this.storage.save();
              this.onTeamChanged?.();
              this.render();
            }
          });
          actionBtnsRight.appendChild(healBtn);
        }

        actions.appendChild(actionBtnsRight);
      }

      card.appendChild(actions);
      teamGrid.appendChild(card);
    });
    wrap.appendChild(teamGrid);

    const boxTitle = document.createElement('h3');
    boxTitle.className = 'section-heading';
    boxTitle.textContent = `Reserve Box (${profile.box.length})`;
    wrap.appendChild(boxTitle);

    if (profile.box.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-note';
      empty.textContent = 'Catch more than 6 Pokémon and extra friends will rest happily here!';
      wrap.appendChild(empty);
    } else {
      const boxGrid = document.createElement('div');
      boxGrid.className = 'box-grid';
      profile.box.forEach((mon, boxIdx) => {
        const typeInfo = TYPES[mon.type] || TYPES.normal;
        const displayName = mon.displayName || mon.name;
        const isNicknamed = Boolean(mon.nickname && mon.nickname !== mon.name);
        const { ready: boxEvoReady } = this.getMonEvolutionOptions(mon, gems);
        const isEvoReady = boxEvoReady.length > 0;

        const card = document.createElement('div');
        card.className = [
          'box-card',
          this.swapBoxIndex === boxIdx ? 'is-selected' : '',
          mon.isShiny ? 'is-shiny-card' : '',
          isEvoReady ? 'is-evo-ready' : '',
        ].filter(Boolean).join(' ');

        const topRow = document.createElement('div');
        topRow.className = 'box-card-top';

        const img = document.createElement('img');
        attachPokemonSprite(img, mon, { back: false, shiny: Boolean(mon.isShiny), timeoutMs: 1800 });

        const info = document.createElement('div');
        info.className = 'box-card-info';
        const nameLine = document.createElement('strong');
        nameLine.textContent = `${mon.isShiny ? '✨ ' : ''}${displayName}${isNicknamed ? ` (${mon.name})` : ''}`;
        const lvLine = document.createElement('small');
        lvLine.textContent = `Lv.${mon.level}`;
        const tier = Math.max(0, Number(mon.upgradeTier) || 0);
        const boxBond = Number.isFinite(Number(mon.bond)) ? Math.max(0, Math.min(100, Math.round(Number(mon.bond)))) : 20;
        const boxBondTier = getBondTierSafe(boxBond);
        const pillLine = document.createElement('div');
        pillLine.className = 'box-card-pills';
        pillLine.innerHTML = `
          <span class="type-pill" style="background:${typeInfo.bg};border-color:${typeInfo.color}">${typeInfo.icon} ${typeInfo.label}</span>
          <span class="rank-pill${tier >= maxTier ? ' is-max-rank' : tier > 0 ? ' is-upgraded' : ''}">★${tier}</span>
          ${mon.isShiny ? '<span class="shiny-badge">✨ Shimmer</span>' : ''}
          <span class="bond-badge is-compact is-tier-${boxBondTier.tier}${boxBondTier.tier >= 2 ? ' is-best-buddy' : ''}" title="${escapeHtml(boxBondTier.label)}">${boxBondTier.icon} ${escapeHtml(boxBondTier.label)} • Bond ${boxBond}/100</span>
        `;
        info.appendChild(nameLine);
        info.appendChild(lvLine);
        info.appendChild(pillLine);

        topRow.appendChild(img);
        topRow.appendChild(info);
        card.appendChild(topRow);
        card.appendChild(this.buildMonStatsRow(mon, true));

        if (isEvoReady && this.swapBoxIndex === null) {
          const evoRow = document.createElement('div');
          evoRow.className = 'evo-btn-row';
          for (const opt of boxEvoReady) {
            const evoBtn = document.createElement('button');
            evoBtn.type = 'button';
            evoBtn.className = 'evolve-btn box-evolve-btn';
            evoBtn.textContent = opt.label;
            evoBtn.addEventListener('click', () => this.triggerInModalEvolution(mon, opt));
            evoRow.appendChild(evoBtn);
          }
          card.appendChild(evoRow);
        }

        if (this.swapBoxIndex === null) {
          const boxPowerRow = document.createElement('div');
          boxPowerRow.className = 'mon-power-row is-compact';
          boxPowerRow.appendChild(this.buildPowerUpControl(mon, starShards, maxTier, true));
          card.appendChild(boxPowerRow);
        }

        const actionsRow = document.createElement('div');
        actionsRow.className = 'box-card-actions';
        if (this.swapBoxIndex === null) {
          const cheerBtn = document.createElement('button');
          cheerBtn.type = 'button';
          cheerBtn.className = 'mini-btn cheer-btn is-compact';
          cheerBtn.textContent = '💖 Cheer Buddy';
          cheerBtn.title = `Cheer ${displayName} to raise Bond (+10)`;
          cheerBtn.addEventListener('click', () => this.triggerBuddyCheer(mon));
          actionsRow.appendChild(cheerBtn);
        }
        const swapBtn = document.createElement('button');
        swapBtn.type = 'button';
        swapBtn.className = 'mini-btn box-swap-btn';
        swapBtn.textContent = this.swapBoxIndex === boxIdx ? 'Selected' : 'Swap';
        swapBtn.addEventListener('click', () => {
          this.audio.playMenuBlip(680);
          this.swapBoxIndex = boxIdx;
          this.render();
        });
        actionsRow.appendChild(swapBtn);
        card.appendChild(actionsRow);

        boxGrid.appendChild(card);
      });
      wrap.appendChild(boxGrid);
    }

    this.bodyEl.innerHTML = '';
    this.bodyEl.appendChild(wrap);
    if (focusNicknameInput) {
      focusNicknameInput.focus();
      focusNicknameInput.select();
    }
  }

  renderGuide(profile) {
    const wrap = document.createElement('div');
    wrap.className = 'guide-layout';

    const allSpecies = Object.values(SPECIES);
    const totalSpecies = allSpecies.length;
    const { caughtMap } = getReconciledDexState(profile, this.storage);
    const caughtCount = allSpecies.filter((sp) => (caughtMap.get(sp.id) || 0) > 0).length;
    const totalShrines = Object.keys(SHRINES).length;
    const quests = Array.isArray(FIELD_QUESTS) ? FIELD_QUESTS : Object.values(FIELD_QUESTS || {});
    const doneQuests = quests.filter((q) => profile.questsCompleted?.includes(q.id)).length;
    const rivalsList = Object.values(RIVAL_TRAINERS || {}).filter(Boolean);
    const rivalsDefeated = rivalsList.filter((r) => profile.rivalsDefeated?.includes(r.id)).length;

    const guidance = typeof getCompassGuidance === 'function' ? getCompassGuidance(profile, SPECIES) : null;
    const dirText = formatCompassArrow(guidance, profile);
    const targetBiome = guidance?.targetBiomeId ? BIOMES[guidance.targetBiomeId] : null;
    const powerLevel = getTrainerPowerSafe(profile);
    const starShards = profile.bag?.starShards ?? 0;

    const compassCard = document.createElement('div');
    compassCard.className = 'guide-compass-card';
    compassCard.innerHTML = `
      <div class="guide-compass-head">
        <span class="guide-compass-badge">${guidance?.icon || '🧭'} STARLIGHT COMPASS OBJECTIVE</span>
        <span class="guide-compass-dir">${dirText}${Number.isFinite(guidance?.distance) && guidance.distance > 0 ? ` • ${guidance.distance} tiles` : ''}</span>
      </div>
      <h3 class="guide-compass-title">${guidance?.title || 'Explore Starlight Island & Discover All 7 Biomes!'}</h3>
      <div class="guide-compass-stats">
        ${targetBiome ? `<span>📍 Destination: <strong>${targetBiome.icon} ${targetBiome.name}</strong></span>` : ''}
        <span>⚡ Trainer Power: <strong>Lv.${powerLevel}</strong></span>
        <span>✨ Star Shards: <strong>${starShards}</strong></span>
        <span>📖 Dex: <strong>${caughtCount}/${totalSpecies}</strong></span>
        <span>⛩️ Shrines: <strong>${(profile.shrinesCleared || []).length}/${totalShrines}</strong></span>
        <span>⚔️ Rivals: <strong>${rivalsDefeated}/${rivalsList.length}</strong></span>
        <span>📜 Quests: <strong>${doneQuests}/${quests.length}</strong></span>
      </div>
    `;
    wrap.appendChild(compassCard);

    const biomesHeading = document.createElement('h3');
    biomesHeading.className = 'section-heading';
    biomesHeading.textContent = 'Island Regions & Discovery';
    wrap.appendChild(biomesHeading);

    const biomeGrid = document.createElement('div');
    biomeGrid.className = 'guide-grid';

    const seenBiomeIds = new Set();
    const orderedBiomes = [];
    for (const id of BIOME_ORDER) {
      if (BIOMES[id]) {
        orderedBiomes.push(BIOMES[id]);
        seenBiomeIds.add(id);
      }
    }
    for (const b of Object.values(BIOMES)) {
      if (!seenBiomeIds.has(b.id)) orderedBiomes.push(b);
    }

    for (const biome of orderedBiomes) {
      const stats = typeof getBiomeDiscoveryStats === 'function'
        ? getBiomeDiscoveryStats(profile, biome.id)
        : null;
      const biomeShrines = Object.values(SHRINES).filter((s) => s.biome === biome.id);
      const biomeRival = rivalsList.find((r) => r.biome === biome.id) || null;
      const visited = Boolean(profile.biomesVisited?.includes(biome.id) || biome.id === 'village');
      const scaled = getBiomeScaledInfo(biome, profile);
      const lvRange = scaled.isSafe ? 'Safe Zone' : `Lv.${scaled.minLv}–${scaled.maxLv}`;
      const totalBiomeSp = stats?.totalSpecies ?? biome.encounters?.length ?? 0;
      const caughtBiome = stats?.caught ?? 0;
      const seenBiome = stats?.seen ?? 0;
      const pct = totalBiomeSp > 0 ? Math.min(100, Math.round((caughtBiome / totalBiomeSp) * 100)) : 100;

      const card = document.createElement('div');
      card.className = `biome-progress-card ${stats?.shrineCleared ? 'is-cleared' : visited ? 'is-visited' : ''}`;

      const statusLabel = stats?.shrineCleared
        ? '✓ Shrine Cleared'
        : visited
          ? 'Visited'
          : 'Unexplored';

      const dexRow = totalBiomeSp > 0
        ? `<span>📖 Caught ${caughtBiome}/${totalBiomeSp} (Seen ${seenBiome})</span>`
        : '<span>💖 Healing Fountain &amp; Lab</span>';
      const chestRow = stats && stats.chestsTotal > 0
        ? `<span>📦 Chests ${stats.chestsOpened}/${stats.chestsTotal}</span>`
        : '';
      const shrineRow = biomeShrines.map((sh) => {
        const cleared = Boolean(profile.shrinesCleared?.includes(sh.id));
        const guard = typeof PokemonMod.getScaledShrineGuard === 'function'
          ? PokemonMod.getScaledShrineGuard(sh, profile)
          : null;
        const guardLv = guard?.level ?? sh.level;
        return `<span>⛩️ ${sh.name}: ${cleared ? 'Cleared ✓' : `Guardian Lv.${guardLv}`}</span>`;
      }).join('');
      const rivalRow = biomeRival
        ? `<span>⚔️ ${biomeRival.name}: ${profile.rivalsDefeated?.includes(biomeRival.id) ? 'Defeated ✓ (Rematchable)' : 'Ready to Duel!'}</span>`
        : '';
      const threatPill = !scaled.isSafe
        ? `<span class="biome-threat-tag is-${scaled.threatTone}" title="${scaled.isScaled ? `Scaled from base Lv.${scaled.baseMin}–${scaled.baseMax}` : 'Matches base island level range'}">${scaled.threatLabel}</span>`
        : '';

      card.innerHTML = `
        <div class="biome-card-head">
          <strong>${biome.icon} ${biome.name}</strong>
          <div class="biome-card-pills">
            ${threatPill}
            <span class="biome-lv-pill">${lvRange}</span>
          </div>
        </div>
        <div class="biome-card-meta">
          <span class="biome-status-tag ${stats?.shrineCleared ? 'is-cleared' : ''}">${statusLabel}</span>
          ${dexRow}
          ${chestRow}
          ${shrineRow}
          ${rivalRow}
        </div>
        ${totalBiomeSp > 0 ? `<div class="biome-progress-track"><div class="biome-progress-fill" style="width:${pct}%"></div></div>` : ''}
      `;
      biomeGrid.appendChild(card);
    }
    wrap.appendChild(biomeGrid);

    if (rivalsList.length > 0) {
      const rivalHeading = document.createElement('h3');
      rivalHeading.className = 'section-heading';
      rivalHeading.textContent = `Rival Trainers (${rivalsDefeated}/${rivalsList.length})`;
      wrap.appendChild(rivalHeading);

      const rivalGrid = document.createElement('div');
      rivalGrid.className = 'guide-grid';
      for (const rival of rivalsList) {
        const defeated = Boolean(profile.rivalsDefeated?.includes(rival.id));
        const biomeInfo = BIOMES[rival.biome];
        const partyCount = Array.isArray(rival.party) ? rival.party.length : 1;
        const rewardChips = formatRewardsList(defeated ? (rival.rematchRewards || rival.rewards) : rival.rewards);
        const rCard = document.createElement('div');
        rCard.className = `quest-card ${defeated ? 'is-done' : ''}`;
        rCard.innerHTML = `
          <div class="quest-card-head">
            <strong>${defeated ? '🏆' : '⚔️'} ${rival.name}</strong>
            <span class="quest-status-pill">${defeated ? 'Defeated ✓ (+2 Lv Rematch)' : `${partyCount} Pokémon`}</span>
          </div>
          <p class="quest-desc">${biomeInfo ? `${biomeInfo.icon} ${biomeInfo.name}` : 'Starlight Island'} • ${defeated ? 'Challenge again anytime for bonus items!' : 'Talk to challenge this rival!'}</p>
          ${rewardChips.length ? `<div class="quest-reward-row">${rewardChips.map((c) => `<span class="quest-reward-chip">${c}</span>`).join('')}</div>` : ''}
        `;
        rivalGrid.appendChild(rCard);
      }
      wrap.appendChild(rivalGrid);
    }

    const questHeading = document.createElement('h3');
    questHeading.className = 'section-heading';
    questHeading.textContent = `Field Quests (${doneQuests}/${quests.length})`;
    wrap.appendChild(questHeading);

    const questsList = document.createElement('div');
    questsList.className = 'quests-list';

    if (quests.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-note';
      empty.textContent = 'Talk to Island Guides around Starlight Island to discover special quests!';
      questsList.appendChild(empty);
    } else {
      for (const quest of quests) {
        const done = Boolean(profile.questsCompleted?.includes(quest.id));
        const ready = !done && Boolean(quest.check?.(profile));
        const progress = typeof quest.progressText === 'function' ? quest.progressText(profile) : '';
        const rewardChips = formatRewardsList(quest.rewards);

        const qCard = document.createElement('div');
        qCard.className = `quest-card ${done ? 'is-done' : ready ? 'is-ready' : ''}`;
        const statusText = done ? '✓ Completed' : ready ? '★ Ready! Talk to NPC' : 'In Progress';

        qCard.innerHTML = `
          <div class="quest-card-head">
            <strong>${done ? '✅' : ready ? '🌟' : '📜'} ${quest.title}</strong>
            <span class="quest-status-pill">${statusText}</span>
          </div>
          <p class="quest-desc">${quest.description}</p>
          <div class="quest-footer">
            ${progress ? `<span class="quest-progress-text">${progress}</span>` : ''}
            <div class="quest-reward-row">
              ${rewardChips.map((c) => `<span class="quest-reward-chip">${c}</span>`).join('')}
            </div>
          </div>
        `;
        questsList.appendChild(qCard);
      }
    }
    wrap.appendChild(questsList);

    this.bodyEl.innerHTML = '';
    this.bodyEl.appendChild(wrap);
  }

  renderBadges(profile) {
    const wrap = document.createElement('div');
    wrap.className = 'badges-layout';

    const totalShrines = Object.keys(SHRINES).length;
    const header = document.createElement('div');
    header.className = 'dex-summary-bar';
    header.innerHTML = `
      <span>🏅 Badges Earned: <strong>${profile.badges.length}/${BADGES.length}</strong></span>
      <span>⛩️ Shrines Cleared: <strong>${profile.shrinesCleared.length}/${totalShrines}</strong></span>
    `;
    wrap.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'badges-grid';

    for (const badge of BADGES) {
      const earned = profile.badges.includes(badge.id);
      const typeInfo = TYPES[badge.type] || TYPES.normal;

      const card = document.createElement('div');
      card.className = `badge-card ${earned ? 'is-earned' : 'is-locked'}`;
      if (earned) {
        card.style.borderColor = typeInfo.color;
      }

      card.innerHTML = `
        <div class="badge-emblem" style="background:${earned ? typeInfo.bg : '#1e293b'};border-color:${earned ? typeInfo.color : '#475569'}">
          <span>${earned ? badge.icon : '🔒'}</span>
        </div>
        <div class="badge-info">
          <strong>${badge.name}</strong>
          <p>${badge.description}</p>
          <span class="badge-status">${earned ? '✓ Unlocked!' : 'Keep Exploring'}</span>
        </div>
      `;
      grid.appendChild(card);
    }

    wrap.appendChild(grid);
    this.bodyEl.innerHTML = '';
    this.bodyEl.appendChild(wrap);
  }

  renderTrainer(profile) {
    const wrap = document.createElement('div');
    wrap.className = 'trainer-studio-layout';

    const appearance = profile.appearance || { styleId: 'default', accessory: 'cap', cape: false, aura: 'none' };
    const trainerInfo = TRAINERS?.[profile.trainerId] || TRAINERS?.violet || { name: 'Trainer', emblem: '★', tagline: 'Starlight Explorer' };
    const { stylesMap, accMap, aurasMap } = getTrainerAppearanceOptions();
    const styles = Object.values(stylesMap);
    const accessories = Object.values(accMap);
    const auras = Object.values(aurasMap);

    const rawStyle = this._fallbackStyle ?? appearance.styleId ?? 'default';
    const currentStyleId = stylesMap[rawStyle] ? rawStyle : (styles[0]?.id || 'default');
    const rawAcc = this._fallbackAcc ?? appearance.accessory ?? 'cap';
    const currentAccId = accMap[rawAcc] ? rawAcc : (accessories[0]?.id || 'cap');
    const rawAura = this._fallbackAura ?? appearance.aura ?? 'none';
    const currentAura = aurasMap[rawAura] ? rawAura : 'none';
    const currentStyle = stylesMap[currentStyleId] || styles[0];
    const currentAcc = accMap[currentAccId] || accessories[0];
    const currentAuraInfo = aurasMap[currentAura] || auras[0];
    const previewAppearance = {
      ...appearance,
      styleId: currentStyleId,
      accessory: currentAccId,
      aura: currentAura,
    };

    const hero = document.createElement('div');
    hero.className = 'trainer-studio-hero';

    const previewWrap = document.createElement('div');
    previewWrap.className = 'trainer-studio-preview-wrap';
    previewWrap.dataset.aura = currentAura;
    const previewCanvas = document.createElement('canvas');
    previewCanvas.id = 'trainer-studio-preview';
    previewCanvas.width = 112;
    previewCanvas.height = 112;
    previewCanvas.className = 'trainer-studio-preview';
    previewWrap.appendChild(previewCanvas);

    const auraTag = currentAura !== 'none' && currentAuraInfo
      ? ` • ${currentAuraInfo.icon || '✨'} ${currentAuraInfo.name}`
      : '';
    const heroInfo = document.createElement('div');
    heroInfo.className = 'trainer-studio-hero-info';
    heroInfo.innerHTML = `
      <span class="trainer-badge-tag">${trainerInfo.emblem || '★'} ${trainerInfo.name.toUpperCase()}</span>
      <h3 class="trainer-studio-title">${trainerInfo.name}'s Style Studio</h3>
      <p class="trainer-studio-sub">${currentStyle?.icon || '⭐'} ${currentStyle?.name || 'Signature Outfit'} • ${currentAcc?.icon || '🧢'} ${currentAcc?.name || 'Adventure Cap'}${auraTag}</p>
    `;

    const capeBtn = document.createElement('button');
    capeBtn.id = 'trainer-cape-toggle';
    capeBtn.type = 'button';
    capeBtn.className = `cape-toggle-btn ${appearance.cape ? 'is-active' : ''}`;
    capeBtn.textContent = `🦸 Starlight Cape: ${appearance.cape ? 'ON' : 'OFF'}`;
    capeBtn.addEventListener('click', () => {
      const updated = this.storage.updateAppearance?.({ cape: !appearance.cape }) || { ...previewAppearance, cape: !appearance.cape };
      const resolvedForDraw = { ...previewAppearance, ...updated, styleId: currentStyleId, accessory: currentAccId, aura: currentAura, cape: Boolean(updated?.cape) };
      this.audio?.playMenuBlip?.(760);
      drawTrainerPortrait(previewCanvas, profile.trainerId, resolvedForDraw);
      this.onAppearanceChanged?.(resolvedForDraw);
      this.render();
    });
    heroInfo.appendChild(capeBtn);

    hero.appendChild(previewWrap);
    hero.appendChild(heroInfo);
    wrap.appendChild(hero);

    const styleHeading = document.createElement('h3');
    styleHeading.className = 'section-heading';
    styleHeading.textContent = 'Outfit Palette';
    wrap.appendChild(styleHeading);

    const styleGrid = document.createElement('div');
    styleGrid.className = 'style-chip-grid';
    for (const style of styles) {
      const look = (typeof resolveTrainerLook === 'function' && (style.id === 'default' || Config.TRAINER_STYLES?.[style.id]))
        ? resolveTrainerLook(profile.trainerId, { ...previewAppearance, styleId: style.id })
        : style;
      const primary = look?.outfitPrimary || style.outfitPrimary || '#a855f7';
      const secondary = look?.outfitSecondary || style.outfitSecondary || '#f472b6';

      const chip = document.createElement('button');
      chip.type = 'button';
      chip.dataset.styleId = style.id;
      chip.className = `style-chip ${currentStyleId === style.id ? 'is-active' : ''}`;
      chip.innerHTML = `
        <span class="style-swatch-pair" aria-hidden="true">
          <span class="style-swatch" style="background:${primary}"></span>
          <span class="style-swatch" style="background:${secondary}"></span>
        </span>
        <span class="style-chip-label">${style.icon || '🎨'} ${style.name}</span>
      `;
      chip.addEventListener('click', () => {
        const updated = this.storage.updateAppearance?.({ styleId: style.id }) || { ...previewAppearance, styleId: style.id };
        this._fallbackStyle = updated?.styleId !== style.id ? style.id : null;
        const resolvedForDraw = { ...previewAppearance, ...updated, styleId: style.id };
        this.audio?.playMenuBlip?.(720);
        drawTrainerPortrait(previewCanvas, profile.trainerId, resolvedForDraw);
        this.onAppearanceChanged?.(resolvedForDraw);
        this.render();
      });
      styleGrid.appendChild(chip);
    }
    wrap.appendChild(styleGrid);

    const accHeading = document.createElement('h3');
    accHeading.className = 'section-heading';
    accHeading.textContent = 'Headgear & Accessory';
    wrap.appendChild(accHeading);

    const accGrid = document.createElement('div');
    accGrid.className = 'accessory-chip-grid';
    for (const acc of accessories) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.dataset.accessoryId = acc.id;
      chip.className = `accessory-chip ${currentAccId === acc.id ? 'is-active' : ''}`;
      chip.innerHTML = `<span class="accessory-chip-icon">${acc.icon || '🧢'}</span><span>${acc.name}</span>`;
      chip.addEventListener('click', () => {
        const updated = this.storage.updateAppearance?.({ accessory: acc.id }) || { ...previewAppearance, accessory: acc.id };
        this._fallbackAcc = updated?.accessory !== acc.id ? acc.id : null;
        const resolvedForDraw = { ...previewAppearance, ...updated, accessory: acc.id };
        this.audio?.playMenuBlip?.(740);
        drawTrainerPortrait(previewCanvas, profile.trainerId, resolvedForDraw);
        this.onAppearanceChanged?.(resolvedForDraw);
        this.render();
      });
      accGrid.appendChild(chip);
    }
    wrap.appendChild(accGrid);

    const auraHeading = document.createElement('h3');
    auraHeading.className = 'section-heading';
    auraHeading.textContent = 'Starlight Aura';
    wrap.appendChild(auraHeading);

    const auraGrid = document.createElement('div');
    auraGrid.className = 'aura-chip-grid';
    for (const aura of auras) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.dataset.auraId = aura.id;
      chip.className = `aura-chip ${currentAura === aura.id ? 'is-active' : ''}`;
      chip.innerHTML = `<span class="aura-chip-icon">${aura.icon || '✨'}</span><span>${aura.name}</span>`;
      chip.addEventListener('click', () => {
        const updated = this.storage.updateAppearance?.({ aura: aura.id }) || { ...previewAppearance, aura: aura.id };
        this._fallbackAura = updated?.aura !== aura.id ? aura.id : null;
        const resolvedForDraw = { ...previewAppearance, ...updated, aura: aura.id };
        this.audio?.playMenuBlip?.(760);
        drawTrainerPortrait(previewCanvas, profile.trainerId, resolvedForDraw);
        this.onAppearanceChanged?.(resolvedForDraw);
        this.render();
      });
      auraGrid.appendChild(chip);
    }
    wrap.appendChild(auraGrid);

    const allSpecies = Object.values(SPECIES);
    const { caughtMap } = getReconciledDexState(profile, this.storage);
    const caughtCount = allSpecies.filter((sp) => (caughtMap.get(sp.id) || 0) > 0).length;
    const totalShrines = Object.keys(SHRINES || {}).length;
    const totalRivals = Object.keys(RIVAL_TRAINERS || {}).length;
    const rivalsDefeated = (profile.rivalsDefeated || []).length;

    const statsHeading = document.createElement('h3');
    statsHeading.className = 'section-heading';
    statsHeading.textContent = 'Trainer Adventure Stats';
    wrap.appendChild(statsHeading);

    const statsCard = document.createElement('div');
    statsCard.className = 'trainer-stats-grid';
    statsCard.innerHTML = `
      <div class="trainer-stat-card"><span>👣 Steps</span><strong>${profile.stats?.steps || 0}</strong></div>
      <div class="trainer-stat-card"><span>🏆 Wins</span><strong>${profile.stats?.battlesWon || 0}</strong></div>
      <div class="trainer-stat-card"><span>📖 Dex</span><strong>${caughtCount}/${allSpecies.length}</strong></div>
      <div class="trainer-stat-card"><span>⛩️ Shrines</span><strong>${(profile.shrinesCleared || []).length}/${totalShrines}</strong></div>
      <div class="trainer-stat-card"><span>⚔️ Rivals</span><strong>${rivalsDefeated}/${totalRivals}</strong></div>
      <div class="trainer-stat-card"><span>⚡ Power Ups</span><strong>${profile.stats?.upgrades || 0}</strong></div>
      <div class="trainer-stat-card"><span>✨ Star Shards</span><strong>${profile.bag?.starShards ?? 0}</strong></div>
      <div class="trainer-stat-card"><span>🌟 Shimmers</span><strong>${profile.stats?.shiniesFound || 0}</strong></div>
    `;
    wrap.appendChild(statsCard);

    this.bodyEl.innerHTML = '';
    this.bodyEl.appendChild(wrap);
    drawTrainerPortrait(previewCanvas, profile.trainerId, previewAppearance);
  }
}
