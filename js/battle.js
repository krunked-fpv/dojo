import * as Config from './config.js';
import * as PokemonMod from './pokemon.js';

const FALLBACK_TYPES = {
  grass: { id: 'grass', label: 'Grass', color: '#22c55e', bg: '#14532d', icon: '🌿' },
  fire: { id: 'fire', label: 'Fire', color: '#f97316', bg: '#7c2d12', icon: '🔥' },
  water: { id: 'water', label: 'Water', color: '#38bdf8', bg: '#0c4a6e', icon: '💧' },
  electric: { id: 'electric', label: 'Electric', color: '#facc15', bg: '#713f12', icon: '⚡' },
  rock: { id: 'rock', label: 'Rock', color: '#a8a29e', bg: '#44403c', icon: '🪨' },
  psychic: { id: 'psychic', label: 'Psychic', color: '#f472b6', bg: '#701a75', icon: '✨' },
  normal: { id: 'normal', label: 'Normal', color: '#cbd5e1', bg: '#334155', icon: '⭐' },
  ice: { id: 'ice', label: 'Ice', color: '#67e8f9', bg: '#164e63', icon: '❄️' },
  ghost: { id: 'ghost', label: 'Ghost', color: '#a855f7', bg: '#3b0764', icon: '👻' },
  dragon: { id: 'dragon', label: 'Dragon', color: '#818cf8', bg: '#312e81', icon: '🐉' },
  fighting: { id: 'fighting', label: 'Fighting', color: '#fb7185', bg: '#881337', icon: '🥊' },
  flying: { id: 'flying', label: 'Flying', color: '#93c5fd', bg: '#1e3a8a', icon: '🪽' },
  poison: { id: 'poison', label: 'Poison', color: '#c084fc', bg: '#581c87', icon: '🧪' },
  ground: { id: 'ground', label: 'Ground', color: '#f59e0b', bg: '#78350f', icon: '⛰️' },
  bug: { id: 'bug', label: 'Bug', color: '#a3e635', bg: '#365314', icon: '🦋' },
  steel: { id: 'steel', label: 'Steel', color: '#94a3b8', bg: '#334155', icon: '⚙️' },
  dark: { id: 'dark', label: 'Dark', color: '#818cf8', bg: '#1e1b4b', icon: '🌙' },
  fairy: { id: 'fairy', label: 'Fairy', color: '#f9a8d4', bg: '#831843', icon: '🧚' },
};

const FALLBACK_ITEMS = {
  fire_gem: { id: 'fire_gem', name: 'Ember Gem', icon: '🔥', color: '#f97316' },
  water_gem: { id: 'water_gem', name: 'Tide Gem', icon: '💧', color: '#38bdf8' },
  thunder_gem: { id: 'thunder_gem', name: 'Spark Gem', icon: '⚡', color: '#facc15' },
  moon_gem: { id: 'moon_gem', name: 'Starlight Gem', icon: '🌙', color: '#e879f9' },
  leaf_gem: { id: 'leaf_gem', name: 'Verdant Gem', icon: '🍃', color: '#22c55e' },
  ice_gem: { id: 'ice_gem', name: 'Aurora Gem', icon: '❄️', color: '#67e8f9' },
  sun_gem: { id: 'sun_gem', name: 'Sunburst Gem', icon: '☀️', color: '#fbbf24' },
  dusk_gem: { id: 'dusk_gem', name: 'Twilight Gem', icon: '🔮', color: '#9333ea' },
  astral_gem: { id: 'astral_gem', name: 'Astral Gem', icon: '🌠', color: '#38bdf8' },
  prism_gem: { id: 'prism_gem', name: 'Prism Gem', icon: '💠', color: '#a78bfa' },
  chrono_gem: { id: 'chrono_gem', name: 'Chrono Amber', icon: '⏳', color: '#f59e0b' },
  nebula_gem: { id: 'nebula_gem', name: 'Nebula Core', icon: '☄️', color: '#ec4899' },
  pixie_gem: { id: 'pixie_gem', name: 'Pixie Ribbon Gem', icon: '🎀', color: '#f9a8d4' },
  alola_gem: { id: 'alola_gem', name: 'Island Kahuna Shell', icon: '🌺', color: '#38bdf8' },
  crown_gem: { id: 'crown_gem', name: 'Sovereign Crest', icon: '🛡️', color: '#94a3b8' },
  tera_gem: { id: 'tera_gem', name: 'Terastal Shard', icon: '💎', color: '#67e8f9' },
};

const FALLBACK_ABILITIES = {
  overgrow: { id: 'overgrow', name: 'Verdant Bloom', icon: '🌿', type: 'grass', trigger: 'attack' },
  blaze: { id: 'blaze', name: 'Solar Blaze', icon: '🔥', type: 'fire', trigger: 'attack' },
  torrent: { id: 'torrent', name: 'Tidal Surge', icon: '💧', type: 'water', trigger: 'attack' },
  volt_reflex: { id: 'volt_reflex', name: 'Volt Reflex', icon: '⚡', type: 'electric', trigger: 'entry', stat: 'spd', stages: 1 },
  storm_conduit: { id: 'storm_conduit', name: 'Storm Conduit', icon: '🌩️', type: 'electric', trigger: 'attack' },
  diamond_guard: { id: 'diamond_guard', name: 'Diamond Guard', icon: '💎', type: 'rock', trigger: 'entry', stat: 'def', stages: 1 },
  dune_titan: { id: 'dune_titan', name: 'Dune Titan', icon: '🏜️', type: 'rock', trigger: 'attack' },
  mystic_prism: { id: 'mystic_prism', name: 'Mystic Prism', icon: '✨', type: 'psychic', trigger: 'attack' },
  cosmic_presence: { id: 'cosmic_presence', name: 'Cosmic Presence', icon: '🌌', type: 'psychic', trigger: 'entry', stat: 'atk', stages: 1 },
  permafrost: { id: 'permafrost', name: 'Permafrost Veil', icon: '❄️', type: 'ice', trigger: 'defense' },
  shadow_cloak: { id: 'shadow_cloak', name: 'Twilight Cloak', icon: '👻', type: 'ghost', trigger: 'attack' },
  dragon_heart: { id: 'dragon_heart', name: 'Dragon Soul', icon: '🐉', type: 'dragon', trigger: 'attack' },
  prism_scales: { id: 'prism_scales', name: 'Prism Scales', icon: '🛡️', type: 'water', trigger: 'defense' },
  starlight_grace: { id: 'starlight_grace', name: 'Starlight Grace', icon: '💖', type: 'normal', trigger: 'turn_end' },
  chlorophyll_rush: { id: 'chlorophyll_rush', name: 'Sunlit Canopy', icon: '🌻', type: 'grass', trigger: 'entry', stat: 'spd', stages: 1 },
  nectar_siphon: { id: 'nectar_siphon', name: 'Bloom Siphon', icon: '🌺', type: 'grass', trigger: 'attack', drainRatio: 0.2 },
  magma_armor: { id: 'magma_armor', name: 'Obsidian Heart', icon: '🌋', type: 'fire', trigger: 'defense' },
  supernova_core: { id: 'supernova_core', name: 'Solar Flare', icon: '☀️', type: 'fire', trigger: 'entry', stat: 'atk', stages: 1 },
  abyssal_current: { id: 'abyssal_current', name: 'Abyssal Tide', icon: '🪸', type: 'water', trigger: 'turn_end' },
  pearl_aegis: { id: 'pearl_aegis', name: 'Pearl Bastion', icon: '🫧', type: 'water', trigger: 'entry', stat: 'def', stages: 1, grantShield: true, shieldTurns: 1 },
  thunder_steppe: { id: 'thunder_steppe', name: 'Steppe Dynamo', icon: '⚡', type: 'electric', trigger: 'turn_end', boostStat: 'spd', boostStages: 1 },
  rail_overload: { id: 'rail_overload', name: 'Plasma Overload', icon: '🔋', type: 'electric', trigger: 'attack', critBonus: 0.15 },
  fossil_bastion: { id: 'fossil_bastion', name: 'Relic Armor', icon: '🏛️', type: 'rock', trigger: 'defense' },
  chrono_shift: { id: 'chrono_shift', name: 'Chrono Gear', icon: '⏳', type: 'psychic', trigger: 'entry', stat: 'spd', stages: 1 },
  champion_spirit: { id: 'champion_spirit', name: 'Dojo Valor', icon: '🥋', type: 'normal', trigger: 'attack' },
  aurora_cloak: { id: 'aurora_cloak', name: 'Glacial Crown', icon: '🏔️', type: 'ice', trigger: 'attack' },
  phantom_mirage: { id: 'phantom_mirage', name: 'Specter Veil', icon: '🕯️', type: 'ghost', trigger: 'defense', counterBoostStat: 'spd' },
  rift_sovereign: { id: 'rift_sovereign', name: 'Astral Rift', icon: '☄️', type: 'dragon', trigger: 'entry', stat: 'atk', stages: 1, grantShield: true, shieldTurns: 1 },
  orichalcum_pulse: { id: 'orichalcum_pulse', name: 'Orichalcum Might', icon: '🥊', type: 'fighting', trigger: 'entry', stat: 'atk', stages: 1 },
  gale_wings: { id: 'gale_wings', name: 'Skyward Gale', icon: '🪽', type: 'flying', trigger: 'entry', stat: 'spd', stages: 1 },
  toxic_alchemy: { id: 'toxic_alchemy', name: 'Venom Siphon', icon: '🧪', type: 'poison', trigger: 'attack', drainRatio: 0.2 },
  stamina_earth: { id: 'stamina_earth', name: 'Terra Stamina', icon: '⛰️', type: 'ground', trigger: 'defense', counterBoostStat: 'def' },
  swarm_resonance: { id: 'swarm_resonance', name: 'Emerald Swarm', icon: '🦋', type: 'bug', trigger: 'attack' },
  corviknight_armor: { id: 'corviknight_armor', name: 'Mirror Bastion', icon: '🛡️', type: 'steel', trigger: 'defense' },
  supreme_overlord: { id: 'supreme_overlord', name: 'Shogun Crest', icon: '♟️', type: 'dark', trigger: 'attack', critBonus: 0.15 },
  pixilate_aura: { id: 'pixilate_aura', name: 'Pixie Veil', icon: '🧚', type: 'fairy', trigger: 'attack' },
  disguise_veil: { id: 'disguise_veil', name: 'Playful Disguise', icon: '🎭', type: 'fairy', trigger: 'entry', stat: 'def', stages: 1, grantShield: true, shieldTurns: 1 },
  tera_prism: { id: 'tera_prism', name: 'Terastal Crown', icon: '💎', type: 'dragon', trigger: 'turn_end', boostStat: 'atk', boostStages: 1 },
};

const ENCOUNTER_TRAITS = {
  curious: { id: 'curious', icon: '✨', label: 'Curious', callout: '✨ Curious', cssClass: 'is-trait-curious', color: '#67e8f9' },
  treasure: { id: 'treasure', icon: '💎', label: 'Treasure', callout: '💎 Treasure', cssClass: 'is-trait-treasure', color: '#fde047' },
  spirited: { id: 'spirited', icon: '⚡', label: 'Spirited', callout: '⚡ Spirited', cssClass: 'is-trait-spirited', color: '#fb923c' },
  apex: { id: 'apex', icon: '👑', label: 'Apex', callout: '👑 Apex', cssClass: 'is-trait-apex', color: '#f472b6' },
};

function resolveEncounterTraitMeta(traitId) {
  if (!traitId || typeof traitId !== 'string') return null;
  return ENCOUNTER_TRAITS[traitId.toLowerCase()] || null;
}

function getTypesMap() {
  return Config.TYPES || FALLBACK_TYPES;
}

function resolveTypeMeta(typeId) {
  const map = getTypesMap();
  return map[typeId] || FALLBACK_TYPES[typeId] || map.normal || FALLBACK_TYPES.normal;
}

function getMovesMap() {
  return Config.MOVES || {};
}

function getEvolutionItemsMap() {
  return Config.EVOLUTION_ITEMS || FALLBACK_ITEMS;
}

function getAbilitiesMap() {
  return Config.ABILITIES || FALLBACK_ABILITIES;
}

function resolveAbilityMeta(abilityOrId) {
  if (!abilityOrId) return null;
  const map = getAbilitiesMap();
  if (typeof abilityOrId === 'string') {
    return map[abilityOrId] || FALLBACK_ABILITIES[abilityOrId] || null;
  }
  if (typeof abilityOrId === 'object') {
    const id = abilityOrId.id || abilityOrId.abilityId || '';
    const base = (id && (map[id] || FALLBACK_ABILITIES[id])) || null;
    if (base) {
      return { ...base, ...abilityOrId, id: base.id };
    }
    if (abilityOrId.name) {
      return { id: id || 'ability', icon: '✨', type: 'normal', ...abilityOrId };
    }
  }
  return null;
}

function computeTypeEffectiveness(moveType, defenderType) {
  if (typeof PokemonMod.getTypeEffectiveness === 'function') {
    return PokemonMod.getTypeEffectiveness(moveType, defenderType);
  }
  return 1;
}

export const BATTLE_STATES = {
  INACTIVE: 'INACTIVE',
  INTRO: 'INTRO',
  PLAYER_INPUT: 'PLAYER_INPUT',
  ACTION_ANIMATING: 'ACTION_ANIMATING',
  OPPONENT_AI: 'OPPONENT_AI',
  OPPONENT_ANIMATING: 'OPPONENT_ANIMATING',
  CHECK_FAINT: 'CHECK_FAINT',
  RETURN_TO_INPUT: 'RETURN_TO_INPUT',
  FORCED_SWITCH: 'FORCED_SWITCH',
  BATTLE_END: 'BATTLE_END',
};

const BATTLE_PACE_PRESETS = {
  cinema: {
    saySpeedMs: 24,
    sayHoldMs: 880,
    windupMs: 240,
    streamSteps: 14,
    streamStepMs: 42,
    physicalStrikeMs: 150,
    hitStopMs: 140,
    postImpactMs: 480,
    hpDrainMs: 620,
    interTurnMs: 480,
    ballWobblePauseMs: 560,
    particleLifeScale: 1.55,
  },
  classic: {
    saySpeedMs: 18,
    sayHoldMs: 560,
    windupMs: 170,
    streamSteps: 14,
    streamStepMs: 30,
    physicalStrikeMs: 130,
    hitStopMs: 90,
    postImpactMs: 380,
    hpDrainMs: 480,
    interTurnMs: 300,
    ballWobblePauseMs: 420,
    particleLifeScale: 1.2,
  },
  fast: {
    saySpeedMs: 10,
    sayHoldMs: 260,
    windupMs: 110,
    streamSteps: 12,
    streamStepMs: 18,
    physicalStrikeMs: 100,
    hitStopMs: 50,
    postImpactMs: 240,
    hpDrainMs: 320,
    interTurnMs: 140,
    ballWobblePauseMs: 260,
    particleLifeScale: 0.9,
  },
};

function lerpChannel(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function lerpHex(c1, c2, t) {
  const clamped = Math.max(0, Math.min(1, t));
  return `rgb(${lerpChannel(c1[0], c2[0], clamped)}, ${lerpChannel(c1[1], c2[1], clamped)}, ${lerpChannel(c1[2], c2[2], clamped)})`;
}

const HP_COLOR_EMERALD_A = [16, 185, 129];
const HP_COLOR_EMERALD_B = [52, 211, 153];
const HP_COLOR_AMBER_A = [245, 158, 11];
const HP_COLOR_AMBER_B = [251, 191, 36];
const HP_COLOR_CRIMSON_A = [220, 38, 38];
const HP_COLOR_CRIMSON_B = [251, 113, 133];

const ACTION_COOLDOWN_MS = 180;
export const PHYSICAL_MOVE_IDS = new Set([
  'tackle',
  'quick_attack',
  'spark_dash',
  'gust',
  'rock_throw',
  'starlight_claw',
  'thunder_fang',
  'wild_volt',
  'iron_crush',
  'glacier_crash',
  'leaf_blade',
  'psycho_cut',
  'aqua_tail',
  'solar_blade',
  'razor_shell',
  'volt_tackle',
  'sandstorm_crush',
  'zen_meteor',
  'icicle_spear',
  'dragon_rush',
  'thorn_barrage',
  'blaze_kick',
  'pearl_cascade',
  'steppe_bolt',
  'canyon_rend',
  'champion_strike',
  'rift_claw',
  'close_combat',
  'collision_course',
  'brave_bird',
  'poison_jab',
  'earthquake',
  'headlong_rush',
  'x_scissor',
  'gigaton_hammer',
  'kowtow_cleave',
  'play_rough',
  'dragon_darts',
  'bitter_blade',
]);

export const MOVE_FX_CLASS = {
  thunder_fang: 'fx-electric-charge',
  wild_volt: 'fx-electric-charge',
  moonblast: 'fx-moon-charge',
  calm_aura: 'fx-calm-aura',
  shadow_pulse: 'fx-ghost-charge',
  iron_crush: 'fx-metal-flash',
  glacier_crash: 'fx-ice-charge',
  magma_cannon: 'fx-magma-charge',
  leaf_blade: 'fx-grove-slash',
  eruption_flare: 'fx-lava-plume',
  aura_sphere: 'fx-aura-charge',
  psycho_cut: 'fx-psycho-cut',
  aqua_tail: 'fx-prism-tail',
  draco_meteor: 'fx-comet-storm',
  omen_wind: 'fx-omen-frost',
  doom_desire: 'fx-starlight-wish',
  frenzy_flora: 'fx-emerald-canopy',
  spore_burst: 'fx-spore-burst',
  solar_blade: 'fx-solar-blade',
  fiery_dance: 'fx-fiery-dance',
  hydro_vortex: 'fx-hydro-vortex',
  razor_shell: 'fx-razor-shell',
  plasma_cannon: 'fx-plasma-cannon',
  volt_tackle: 'fx-volt-tackle',
  sandstorm_crush: 'fx-sandstorm-crush',
  prism_laser: 'fx-prism-laser',
  zen_meteor: 'fx-zen-meteor',
  icicle_spear: 'fx-icicle-spear',
  spectral_lantern: 'fx-spectral-lantern',
  night_daze: 'fx-night-daze',
  dragon_rush: 'fx-dragon-rush',
  dune_aegis: 'fx-dune-aegis',
  thorn_barrage: 'fx-thorn-barrage',
  jungle_totem: 'fx-jungle-totem',
  inferno_overdrive: 'fx-inferno-overdrive',
  blaze_kick: 'fx-blaze-kick',
  abyssal_geyser: 'fx-abyssal-geyser',
  pearl_cascade: 'fx-pearl-cascade',
  steppe_bolt: 'fx-steppe-bolt',
  ion_tempest: 'fx-ion-tempest',
  canyon_rend: 'fx-canyon-rend',
  amber_bastion: 'fx-amber-bastion',
  chrono_cannon: 'fx-chrono-cannon',
  champion_strike: 'fx-champion-strike',
  polar_lance: 'fx-polar-lance',
  relic_hex: 'fx-relic-hex',
  rift_claw: 'fx-rift-claw',
  cosmos_supernova: 'fx-cosmos-supernova',
  close_combat: 'fx-close-combat',
  vacuum_wave: 'fx-vacuum-wave',
  collision_course: 'fx-collision-course',
  brave_bird: 'fx-brave-bird',
  air_slash: 'fx-air-slash',
  tailwind_grace: 'fx-tailwind-grace',
  sludge_wave: 'fx-sludge-wave',
  poison_jab: 'fx-poison-jab',
  malignant_chain: 'fx-malignant-chain',
  earthquake: 'fx-earthquake',
  earth_power: 'fx-earth-power',
  headlong_rush: 'fx-headlong-rush',
  bug_buzz: 'fx-bug-buzz',
  x_scissor: 'fx-x-scissor',
  quiver_step: 'fx-quiver-step',
  flash_cannon: 'fx-flash-cannon',
  gigaton_hammer: 'fx-gigaton-hammer',
  king_shield: 'fx-king-shield',
  dark_pulse: 'fx-dark-pulse',
  kowtow_cleave: 'fx-kowtow-cleave',
  lunar_shroud: 'fx-lunar-shroud',
  dazzling_gleam: 'fx-dazzling-gleam',
  play_rough: 'fx-play-rough',
  geomancy_bloom: 'fx-geomancy-bloom',
  water_shuriken: 'fx-water-shuriken',
  dragon_darts: 'fx-dragon-darts',
  bitter_blade: 'fx-bitter-blade',
  electro_drift: 'fx-electro-drift',
};

const ALL_MOVE_FX_CLASSES = Object.values(MOVE_FX_CLASS);

export const SPRITE_MOTION_STYLES = ['breathe', 'bob', 'float', 'flutter'];

export function resolveSpriteMotionStyle(monOrSpecies) {
  if (!monOrSpecies) return 'breathe';
  const rawId = typeof monOrSpecies === 'number' || typeof monOrSpecies === 'string'
    ? Number(monOrSpecies)
    : Number(monOrSpecies.speciesId ?? monOrSpecies.id ?? monOrSpecies.species?.id);
  const species = (Number.isFinite(rawId) && Config.SPECIES?.[rawId]) || monOrSpecies.species || monOrSpecies || null;
  const type = String(monOrSpecies.type || species?.type || '').toLowerCase();

  if (type === 'flying' || type === 'bug') return 'flutter';
  if (type === 'ghost' || type === 'psychic' || type === 'fairy' || type === 'dragon') return 'float';
  if (type === 'electric' || type === 'water' || type === 'fighting' || type === 'dark') return 'bob';
  if (type === 'ice') return (Number.isFinite(rawId) && rawId % 2 === 0) ? 'float' : 'breathe';
  if (type === 'grass' || type === 'fire' || type === 'rock' || type === 'ground' || type === 'steel' || type === 'normal') {
    return 'breathe';
  }
  if (Number.isFinite(rawId) && rawId > 0) {
    return SPRITE_MOTION_STYLES[Math.abs(Math.trunc(rawId)) % SPRITE_MOTION_STYLES.length];
  }
  return 'breathe';
}

function normalizeBallStyle(ballType) {
  if (ballType === true || ballType === 'great') return 'great';
  if (ballType === 'star') return 'star';
  return 'pokeball';
}

export function resolveMoveParticleShape(move) {
  if (!move) return 'circle';
  if (move.id === 'star_melody') return 'note';
  if (move.id === 'moonblast' || move.id === 'psycho_cut' || move.id === 'solar_blade' || move.id === 'razor_shell' || move.id === 'night_daze' || move.id === 'air_slash' || move.id === 'dark_pulse' || move.id === 'lunar_shroud') return 'crescent';
  if (move.id === 'thunder_fang' || move.id === 'wild_volt' || move.id === 'plasma_cannon' || move.id === 'volt_tackle' || move.id === 'steppe_bolt' || move.id === 'ion_tempest' || move.id === 'electro_drift') return 'lightning';
  if (move.id === 'iron_crush' || move.id === 'sandstorm_crush' || move.id === 'canyon_rend' || move.id === 'earthquake' || move.id === 'headlong_rush') return 'stone';
  if (move.id === 'earth_power') return 'ember';
  if (move.id === 'spore_burst') return 'spore';
  if (move.id === 'icicle_spear' || move.id === 'polar_lance' || move.id === 'poison_jab' || move.id === 'dragon_darts') return 'lance';
  if (move.id === 'prism_laser' || move.id === 'dune_aegis') return 'crystal';
  if (move.id === 'zen_meteor') return 'orb';
  if (move.id === 'thorn_barrage' || move.id === 'quiver_step' || move.id === 'geomancy_bloom') return 'petal';
  if (move.id === 'jungle_totem') return 'leaf';
  if (move.id === 'inferno_overdrive' || move.id === 'blaze_kick') return 'ember';
  if (move.id === 'abyssal_geyser' || move.id === 'champion_strike' || move.id === 'close_combat' || move.id === 'vacuum_wave' || move.id === 'bug_buzz') return 'wave_arc';
  if (move.id === 'pearl_cascade') return 'bubble';
  if (move.id === 'amber_bastion' || move.id === 'gigaton_hammer' || move.id === 'king_shield') return 'hexagon';
  if (move.id === 'chrono_cannon') return 'gear';
  if (move.id === 'relic_hex' || move.id === 'malignant_chain') return 'sigil';
  if (move.id === 'rift_claw' || move.id === 'x_scissor' || move.id === 'kowtow_cleave' || move.id === 'bitter_blade') return 'slash';
  if (move.id === 'cosmos_supernova' || move.id === 'collision_course' || move.id === 'dazzling_gleam') return 'star';
  if (move.id === 'play_rough') return 'heart';
  if (move.id === 'flash_cannon') return 'ray';
  if (move.id === 'water_shuriken') return 'shuriken';
  if (move.id === 'brave_bird') return 'feather';
  if (move.id === 'sludge_wave') return 'venom';
  if (move.fx === 'wind' || move.id === 'sky_wing' || move.id === 'gust' || move.id === 'omen_wind' || move.id === 'tailwind_grace') return 'wind';
  if (move.id === 'phantom_claw' || move.id === 'starlight_claw' || move.id === 'leaf_blade') return 'slash';
  if (move.id === 'doom_desire' || move.id === 'aura_sphere') return 'star';
  if (move.id === 'draco_meteor' || move.id === 'dragon_rush') return 'dragonflame';
  if (move.id === 'eruption_flare' || move.id === 'fiery_dance') return 'ember';
  if (move.id === 'aqua_tail' || move.id === 'hydro_vortex') return 'bubble';
  if (move.id === 'frenzy_flora') return 'leaf';
  if (move.id === 'spectral_lantern') return 'wisp';
  const shapeByType = {
    fire: 'ember',
    water: 'bubble',
    grass: 'leaf',
    electric: 'bolt',
    psychic: 'star',
    rock: 'dust',
    ice: 'crystal',
    ghost: 'wisp',
    dragon: 'dragonflame',
    fighting: 'wave_arc',
    flying: 'feather',
    poison: 'venom',
    ground: 'stone',
    bug: 'petal',
    steel: 'hexagon',
    dark: 'crescent',
    fairy: 'star',
    normal: move.fx === 'star' ? 'star' : 'dust',
  };
  return shapeByType[move.type] || 'circle';
}

export class BattleEngine {
  constructor({ storage, audio, onBattleEnd, onBadgesUnlocked, onHudRefresh }) {
    this.storage = storage;
    this.audio = audio;
    this.onBattleEnd = onBattleEnd;
    this.onBadgesUnlocked = onBadgesUnlocked;
    this.onHudRefresh = onHudRefresh;

    this.screenEl = document.getElementById('battle-screen');
    this.stageEl = document.getElementById('battle-stage');
    this.fxCanvas = document.getElementById('battle-fx-canvas');
    this.fxCtx = this.fxCanvas ? this.fxCanvas.getContext('2d') : null;

    this.enemyNameEl = document.getElementById('enemy-name');
    this.enemyLevelEl = document.getElementById('enemy-level');
    this.enemyTypeEl = document.getElementById('enemy-type');
    this.enemyDexPillEl = document.getElementById('enemy-dex-pill');
    this.enemyStagesEl = document.getElementById('enemy-stages');
    this.enemyHpFillEl = document.getElementById('enemy-hp-fill');
    this.enemySpriteEl = document.getElementById('enemy-sprite');
    this.enemyStatusCardEl = this.enemyNameEl?.closest('.status-card-enemy') || document.querySelector('.status-card-enemy');

    this.playerNameEl = document.getElementById('player-name');
    this.playerLevelEl = document.getElementById('player-level');
    this.playerTypeEl = document.getElementById('player-type');
    this.playerStagesEl = document.getElementById('player-stages');
    this.playerHpFillEl = document.getElementById('player-hp-fill');
    this.playerHpTextEl = document.getElementById('player-hp-text');
    this.playerXpFillEl = document.getElementById('player-xp-fill');
    this.playerSpriteEl = document.getElementById('player-sprite');
    this.playerStatusCardEl = this.playerNameEl?.closest('.status-card-player') || document.querySelector('.status-card-player');

    this.logEl = document.getElementById('battle-log');
    this.movesEl = document.getElementById('battle-moves');
    this.btnBall = document.getElementById('battle-btn-ball');
    this.btnGreat = document.getElementById('battle-btn-great');
    this.btnStar = document.getElementById('battle-btn-star');
    this.btnPotion = document.getElementById('battle-btn-potion');
    this.btnTeam = document.getElementById('battle-btn-team');
    this.btnRun = document.getElementById('battle-btn-run');

    this.teamDrawerEl = document.getElementById('battle-team-drawer');
    this.teamListEl = document.getElementById('battle-team-list');
    this.teamCloseBtn = document.getElementById('battle-team-close');
    this.enemyPartyPipsEl = this.ensureEnemyPartyPipsEl();
    this.abilitiesEnabled = true;
    this.abilityBannerEl = this.ensureAbilityBannerEl();

    this.active = false;
    this.busy = false;
    this.state = BATTLE_STATES.INACTIVE;
    this.sessionId = 0;
    this.turnToken = 0;
    this.lastActionAt = -ACTION_COOLDOWN_MS;
    this.selectedMoveIndex = 0;

    this.enemy = null;
    this.enemyParty = [];
    this.enemyPartyIndex = 0;
    this.player = null;
    this.playerIndex = 0;
    this.biomeId = 'forest';
    this.isShrine = false;
    this.shrineData = null;
    this.isTrainer = false;
    this.trainerData = null;

    this.particles = [];
    this.abilityStageFx = [];
    this.popups = [];
    this.pokeballAnim = null;
    this.captureBeam = null;

    // Single-instance tracked loop and timer handles
    this.fxRaf = null;
    this.fxLoopCount = 0;
    this.lastFxTime = 0;
    this.hpRafs = { enemy: null, player: null };
    this.hpResolvers = { enemy: null, player: null };
    this.xpRaf = null;
    this.xpResolver = null;
    this.ballRafId = null;
    this.ballResolver = null;
    this.pendingTimers = new Map();

    this.shakeTimer = 0;
    this.shakeDuration = 0;
    this.shakeIntensity = 0;

    this.typingTimer = null;
    this.typingHoldTimer = null;
    this.typingResolve = null;
    this.typingFullText = '';
    this._lastSkipPointerUpAt = -1000;

    this.displayedEnemyHp = 0;
    this.displayedPlayerHp = 0;
    this.mustSwitchForced = false;
    this.playerBuddyEndured = false;
    this.resizeObserver = null;
    this._uiAbort = new AbortController();

    this.bindUI();
  }

  ensureEnemyPartyPipsEl() {
    let el = document.getElementById('enemy-party-pips');
    if (el) return el;
    const head = this.enemyLevelEl?.parentElement || document.querySelector('.status-card-enemy .status-head');
    if (!head) return null;
    el = document.createElement('span');
    el.id = 'enemy-party-pips';
    el.className = 'enemy-party-pips';
    el.hidden = true;
    if (this.enemyLevelEl && this.enemyLevelEl.parentElement === head) {
      head.insertBefore(el, this.enemyLevelEl);
    } else {
      head.appendChild(el);
    }
    return el;
  }

  ensureAbilityBannerEl() {
    let el = document.getElementById('battle-ability-banner');
    if (el) return el;
    const host = this.stageEl || this.screenEl;
    if (!host) return null;
    el = document.createElement('div');
    el.id = 'battle-ability-banner';
    el.className = 'battle-ability-banner';
    el.hidden = true;
    el.setAttribute('aria-live', 'polite');
    host.appendChild(el);
    return el;
  }

  hideAbilityBanner() {
    this.abilityStageFx = [];
    if (this.stageEl) {
      delete this.stageEl.dataset.abilityAura;
    }
    const el = this.abilityBannerEl || document.getElementById('battle-ability-banner');
    if (!el) return;
    this.abilityBannerEl = el;
    el.hidden = true;
    el.textContent = '';
    delete el.dataset.type;
    delete el.dataset.side;
    delete el.dataset.ability;
  }

  bindUI() {
    const signal = this._uiAbort.signal;
    const handleTapToSkip = (event, isPointerUp = false) => {
      if (this.teamDrawerEl && !this.teamDrawerEl.hidden) return;
      if (event?.target?.closest?.('#battle-team-drawer, button, input, select, a')) return;
      if (isPointerUp && event?.pointerType === 'mouse' && event.button !== 0) return;
      const isTypewriterActive = this.typingTimer !== null || this.typingHoldTimer !== null || this.typingResolve !== null;
      if (!isTypewriterActive) return;

      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (isPointerUp) {
        this._lastSkipPointerUpAt = now;
      } else if (now - this._lastSkipPointerUpAt < 150) {
        return;
      }
      this.finishTypewriter();
    };
    this.logEl?.addEventListener('pointerup', (e) => handleTapToSkip(e, true), { signal });
    this.logEl?.addEventListener('click', (e) => handleTapToSkip(e, false), { signal });
    this.stageEl?.addEventListener('pointerup', (e) => handleTapToSkip(e, true), { signal });
    this.stageEl?.addEventListener('click', (e) => handleTapToSkip(e, false), { signal });
    this.btnBall?.addEventListener('click', () => this.handleThrowBall('pokeball'), { signal });
    this.btnGreat?.addEventListener('click', () => this.handleThrowBall('great'), { signal });
    this.btnStar?.addEventListener('click', () => this.handleThrowBall('star'), { signal });
    this.btnPotion?.addEventListener('click', () => this.handleUsePotion(), { signal });
    this.btnTeam?.addEventListener('click', () => this.openTeamDrawer(false), { signal });
    this.btnRun?.addEventListener('click', () => this.handleRun(), { signal });

    const actionButtons = [this.btnBall, this.btnGreat, this.btnStar, this.btnPotion, this.btnTeam, this.btnRun];
    for (const btn of actionButtons) {
      if (!btn) continue;
      const playHoverCue = () => {
        if (!btn.disabled && this.canAcceptPlayerAction()) {
          this.audio?.playCursorMove?.();
        }
      };
      btn.addEventListener('pointerenter', playHoverCue, { signal });
      btn.addEventListener('focus', playHoverCue, { signal });
    }

    this.teamCloseBtn?.addEventListener('click', () => {
      if (!this.mustSwitchForced) {
        this.audio?.playMenuBlip?.(480);
        this.closeTeamDrawer();
      }
    }, { signal });

    if (typeof ResizeObserver !== 'undefined' && this.stageEl) {
      this.resizeObserver = new ResizeObserver(() => this.syncCanvasSize());
      this.resizeObserver.observe(this.stageEl);
    }
  }

  destroy() {
    this.stop();
    this._uiAbort.abort();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  syncCanvasSize() {
    if (!this.fxCanvas || !this.stageEl) return;
    const rect = this.stageEl.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.fxCanvas.width = Math.round(rect.width);
      this.fxCanvas.height = Math.round(rect.height);
      if (this.fxCtx) {
        this.fxCtx.imageSmoothingEnabled = false;
      }
    }
  }

  clearAllTimersAndLoops() {
    if (this.fxRaf !== null) {
      cancelAnimationFrame(this.fxRaf);
      this.fxRaf = null;
    }

    for (const side of ['enemy', 'player']) {
      if (this.hpRafs[side] !== null) {
        cancelAnimationFrame(this.hpRafs[side]);
        this.hpRafs[side] = null;
      }
      if (this.hpResolvers[side]) {
        const res = this.hpResolvers[side];
        this.hpResolvers[side] = null;
        res();
      }
    }

    if (this.ballRafId !== null) {
      cancelAnimationFrame(this.ballRafId);
      this.ballRafId = null;
    }
    if (this.ballResolver) {
      const res = this.ballResolver;
      this.ballResolver = null;
      res();
    }

    if (this.xpRaf !== null) {
      cancelAnimationFrame(this.xpRaf);
      this.xpRaf = null;
    }
    if (this.xpResolver) {
      const res = this.xpResolver;
      this.xpResolver = null;
      res();
    }

    for (const [timerId, resolve] of this.pendingTimers.entries()) {
      clearTimeout(timerId);
      this.pendingTimers.delete(timerId);
      resolve();
    }

    this.finishTypewriter();
  }

  wait(ms, sid = this.sessionId) {
    if (!this.isSessionValid(sid) || ms <= 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const timerId = setTimeout(() => {
        this.pendingTimers.delete(timerId);
        done();
      }, ms);
      this.pendingTimers.set(timerId, done);
    });
  }

  canAcceptPlayerAction() {
    if (!this.active || this.busy || this.state !== BATTLE_STATES.PLAYER_INPUT) return false;
    if (this.teamDrawerEl && !this.teamDrawerEl.hidden) return false;
    const now = performance.now();
    if (now - this.lastActionAt < ACTION_COOLDOWN_MS) return false;
    return true;
  }

  lockPlayerAction(nextState = BATTLE_STATES.ACTION_ANIMATING) {
    this.turnToken += 1;
    this.lastActionAt = performance.now();
    this.busy = true;
    this.state = nextState;
    this.screenEl?.classList.add('is-action-locked');
    this.setControlsDisabled(true);
    return this.turnToken;
  }

  markActionLocked(nextState = BATTLE_STATES.ACTION_ANIMATING) {
    return this.lockPlayerAction(nextState);
  }

  unlockPlayerInput() {
    if (!this.active) return;
    this.busy = false;
    this.lastActionAt = -ACTION_COOLDOWN_MS;
    this.state = BATTLE_STATES.PLAYER_INPUT;
    this.screenEl?.classList.remove('is-action-locked');
    this.setControlsDisabled(false);
    this.syncMoveSelectionVisuals();
  }

  setIdlePrompt(text) {
    this.finishTypewriter();
    this.typingFullText = text;
    if (this.logEl) {
      this.logEl.classList.remove('is-typing', 'is-waiting');
      this.logEl.textContent = text;
    }
  }

  getPaceConfig() {
    const paceKey = this.storage?.getSettings?.()?.battlePace || 'cinema';
    return BATTLE_PACE_PRESETS[paceKey] || BATTLE_PACE_PRESETS.cinema;
  }

  _resetSpriteClasses(side) {
    const el = side === 'enemy' ? this.enemySpriteEl : this.playerSpriteEl;
    const mon = side === 'enemy' ? this.enemy : this.player;
    if (!el) return;
    el.className = `fighter-sprite fighter-sprite-${side} is-idle${mon?.isShiny ? ' is-shiny-sprite' : ''}${side === 'enemy' && mon?.isElite ? ' is-elite-sprite' : ''}`;
    if (mon) {
      el.dataset.motion = resolveSpriteMotionStyle(mon);
    } else {
      delete el.dataset.motion;
    }
  }

  returnToPlayerInput(sid = this.sessionId) {
    if (!this.isSessionValid(sid) || !this.player || !this.enemy) return;
    if (this.player.isFainted || this.enemy.isFainted) return;

    this.state = BATTLE_STATES.RETURN_TO_INPUT;
    this.finishTypewriter();

    this._resetSpriteClasses('enemy');
    this._resetSpriteClasses('player');

    this.renderStatusCards();
    this.renderMoveButtons();
    this.setIdlePrompt(`What will ${this.player.displayName || this.player.name} do?`);
    this.unlockPlayerInput();
  }

  isSessionValid(sid) {
    return this.active && sid === this.sessionId;
  }

  getDiagnostics() {
    return {
      active: this.active,
      busy: this.busy,
      state: this.state,
      sessionId: this.sessionId,
      turnToken: this.turnToken,
      fxRafActive: this.fxRaf !== null,
      fxLoopCount: this.fxLoopCount,
      pendingTimers: this.pendingTimers.size,
      activeHpRafs: Number(this.hpRafs.enemy !== null) + Number(this.hpRafs.player !== null),
      ballRafActive: this.ballRafId !== null,
      particleCount: this.particles.length,
      popupCount: this.popups.length,
      actionLockedClass: Boolean(this.screenEl?.classList.contains('is-action-locked')),
    };
  }

  async start({
    enemy,
    enemyParty = null,
    biomeId = 'forest',
    isShrine = false,
    shrineData = null,
    isTrainer = false,
    trainerData = null,
  }) {
    const profile = this.storage.getActiveProfile();
    if (!profile) {
      this.onBattleEnd?.({ outcome: 'escaped', faintedAll: false });
      return;
    }

    this.storage.ensureHealthyParty?.(profile);
    const party = Array.isArray(enemyParty) && enemyParty.length > 0
      ? enemyParty.filter(Boolean)
      : (enemy ? [enemy] : []);
    const firstHealthyEnemy = party.findIndex((m) => !m.isFainted);
    const activeEnemyIdx = enemy && party.includes(enemy) && !enemy.isFainted
      ? party.indexOf(enemy)
      : (firstHealthyEnemy >= 0 ? firstHealthyEnemy : 0);
    const leadEnemy = party[activeEnemyIdx] || enemy || null;

    if (profile.team.length === 0 || !leadEnemy) {
      this.onBattleEnd?.({ outcome: 'escaped', faintedAll: false });
      return;
    }

    // Clear any leftover timers/RAFs before establishing new session
    this.clearAllTimersAndLoops();

    const firstHealthy = profile.team.findIndex((m) => !m.isFainted);
    this.playerIndex = firstHealthy >= 0 ? firstHealthy : 0;
    this.player = profile.team[this.playerIndex];
    if (this.player.isFainted) {
      this.player.healFull();
    }

    const sid = ++this.sessionId;
    this.turnToken = 0;
    this.lastActionAt = -ACTION_COOLDOWN_MS;
    this.selectedMoveIndex = 0;
    this.enemyParty = party;
    this.enemyPartyIndex = Math.max(0, activeEnemyIdx);
    this.enemy = leadEnemy;
    this.biomeId = isShrine ? 'shrine' : biomeId;
    this.isShrine = isShrine;
    this.shrineData = shrineData;
    this.isTrainer = Boolean(isTrainer);
    this.trainerData = trainerData || null;

    this.player.resetBattleState?.();
    for (const enemyMon of this.enemyParty) {
      enemyMon.resetBattleState?.();
    }

    this.active = true;
    this.busy = true;
    this.state = BATTLE_STATES.INTRO;
    this.mustSwitchForced = false;
    this.playerBuddyEndured = false;
    this.particles = [];
    this.abilityStageFx = [];
    this.popups = [];
    this.pokeballAnim = null;
    this.captureBeam = null;
    this.shakeTimer = 0;
    this.hideAbilityBanner();
    if (this.stageEl) this.stageEl.style.transform = '';

    this.storage.recordSeen(leadEnemy.speciesId);

    if (this.screenEl) {
      this.screenEl.hidden = false;
      this.screenEl.classList.add('is-action-locked');
    }
    if (this.stageEl) {
      this.stageEl.dataset.biome = this.biomeId;
    }
    this.syncCanvasSize();
    this.startFxLoop();

    this._resetSpriteClasses('enemy');
    this._resetSpriteClasses('player');
    this.displayedEnemyHp = leadEnemy.hp;
    this.displayedPlayerHp = this.player.hp;

    this.renderStatusCards();
    this.renderMoveButtons();
    this.renderActionButtons();
    this.setControlsDisabled(true);

    await Promise.all([
      PokemonMod.attachPokemonSprite(this.enemySpriteEl, leadEnemy.speciesId, {
        back: false,
        shiny: Boolean(leadEnemy.isShiny),
        timeoutMs: 2000,
      }),
      PokemonMod.attachPokemonSprite(this.playerSpriteEl, this.player.speciesId, {
        back: true,
        shiny: Boolean(this.player.isShiny),
        timeoutMs: 2000,
      }),
    ]);

    if (!this.isSessionValid(sid)) return;

    this.enemySpriteEl?.classList.toggle('is-shiny-sprite', Boolean(leadEnemy.isShiny));
    this.enemySpriteEl?.classList.toggle('is-elite-sprite', Boolean(leadEnemy.isElite));
    this.playerSpriteEl?.classList.toggle('is-shiny-sprite', Boolean(this.player.isShiny));
    this.enemySpriteEl?.classList.remove('is-idle', 'enemy-sendout');
    this.playerSpriteEl?.classList.remove('is-idle', 'player-sendout');
    if (this.enemySpriteEl) void this.enemySpriteEl.offsetWidth;
    if (this.playerSpriteEl) void this.playerSpriteEl.offsetWidth;
    this.enemySpriteEl?.classList.add('enemy-sendout');
    this.playerSpriteEl?.classList.add('player-sendout');
    this.audio?.playPokemonCry?.(leadEnemy);

    if (leadEnemy.isShiny) {
      this.audio?.playShinySparkle?.();
      this.spawnShinyIntroSparkles('enemy');
    }
    if (leadEnemy.isElite || (isShrine && shrineData?.isAstralTrial)) {
      if (!leadEnemy.isShiny) {
        this.audio?.playShinySparkle?.();
      }
      this.spawnEliteIntroAura('enemy');
    }

    const wildTrait = !isShrine && !this.isTrainer ? resolveEncounterTraitMeta(leadEnemy.encounterTrait) : null;
    if (wildTrait) {
      const enemyCenter = this.getSpriteCenter('enemy');
      this.spawnFloatingText(enemyCenter.x, enemyCenter.y - 44, wildTrait.callout, wildTrait.color, 17, 0.08, 1.45);
      for (let i = 0; i < 8; i++) {
        const ang = (Math.PI * 2 * i) / 8;
        this.particles.push({
          x: enemyCenter.x + Math.cos(ang) * 16,
          y: enemyCenter.y + Math.sin(ang) * 14,
          vx: Math.cos(ang) * 44,
          vy: Math.sin(ang) * 44 - 16,
          gravity: -12,
          life: -(i * 0.015),
          maxLife: 0.65,
          color: wildTrait.color,
          size: 4.5,
          rotation: ang,
          spin: 6,
          shape: 'star',
        });
      }
    }

    const playerName = this.player.displayName || this.player.name;
    const traitTag = wildTrait ? ` (${wildTrait.callout})` : '';
    let introMsg = '';
    if (isShrine && shrineData) {
      if (shrineData.isAstralTrial) {
        introMsg = `🌟 Astral Shrine Trial #${shrineData.trialNumber || 1}! Guardian ${leadEnemy.name} appeared! Go, ${playerName}!`;
      } else {
        introMsg = shrineData.intro;
      }
    } else if (this.isTrainer && this.trainerData) {
      const isRematch = Boolean(this.trainerData.id && profile.rivalsDefeated?.includes(this.trainerData.id));
      const line = (isRematch && this.trainerData.rematchIntro) || this.trainerData.intro;
      introMsg = line
        ? `${this.trainerData.name}: "${line}" Sent out ${leadEnemy.name}! Go, ${playerName}!`
        : `${this.trainerData.name} sent out ${leadEnemy.name}! Go, ${playerName}!`;
    } else if (leadEnemy.isElite && leadEnemy.isShiny) {
      introMsg = `✨ A rare ELITE wild ${leadEnemy.name}${traitTag} appeared! (Starlight Shimmer!) Go, ${playerName}!`;
    } else if (leadEnemy.isElite) {
      introMsg = `⚡ A rare ELITE wild ${leadEnemy.name}${traitTag} appeared! Go, ${playerName}!`;
    } else if (leadEnemy.isShiny) {
      introMsg = `✨ A rare Starlight Shimmer ${leadEnemy.name}${traitTag} appeared! Go, ${playerName}!`;
    } else {
      introMsg = `A wild ${leadEnemy.name}${traitTag} appeared! Go, ${playerName}!`;
    }
    await this.say(introMsg);

    if (!this.isSessionValid(sid)) return;
    this.enemySpriteEl?.classList.remove('enemy-sendout');
    this.enemySpriteEl?.classList.add('is-idle');
    this.playerSpriteEl?.classList.remove('player-sendout');
    this.playerSpriteEl?.classList.add('is-idle');
    await this.triggerEntryAbility('player', this.player, sid);
    if (!this.isSessionValid(sid)) return;
    await this.triggerEntryAbility('enemy', this.enemy, sid);
    if (!this.isSessionValid(sid)) return;
    this.returnToPlayerInput(sid);
  }

  triggerCelebrationGlow(mode = 'victory', durationMs = 780) {
    if (!this.stageEl) return;
    const clsMap = {
      capture: 'is-celebrating-capture',
      levelup: 'is-celebrating-levelup',
      evo: 'is-celebrating-evo',
      victory: 'is-celebrating-victory',
    };
    this.clearCelebrationGlow();
    this.stageEl.classList.add('is-celebrating', clsMap[mode] || 'is-celebrating-victory');
    if (durationMs > 0) {
      const sid = this.sessionId;
      const timerId = setTimeout(() => {
        this.pendingTimers.delete(timerId);
        if (this.sessionId === sid) {
          this.clearCelebrationGlow();
        }
      }, durationMs);
      this.pendingTimers.set(timerId, () => {});
    }
  }

  clearCelebrationGlow() {
    if (!this.stageEl) return;
    this.stageEl.classList.remove(
      'is-celebrating',
      'is-celebrating-capture',
      'is-celebrating-levelup',
      'is-celebrating-evo',
      'is-celebrating-victory',
    );
  }

  stop(result = { outcome: 'escaped', faintedAll: false }) {
    this.sessionId += 1;
    this.turnToken += 1;
    this.active = false;
    this.busy = false;
    this.state = BATTLE_STATES.INACTIVE;
    this.mustSwitchForced = false;
    this.playerBuddyEndured = false;
    this.isShrine = false;
    this.shrineData = null;
    this.isTrainer = false;
    this.trainerData = null;
    this.enemyParty = [];
    this.enemyPartyIndex = 0;
    this.pokeballAnim = null;
    this.captureBeam = null;
    this.particles = [];
    this.abilityStageFx = [];
    this.popups = [];
    this.shakeTimer = 0;
    this.shakeDuration = 0;
    this.shakeIntensity = 0;
    this.hideAbilityBanner();
    this.clearCelebrationGlow();
    if (this.stageEl) {
      this.stageEl.style.transform = '';
      delete this.stageEl.dataset.abilityAura;
    }
    if (this.enemySpriteEl) {
      delete this.enemySpriteEl.dataset.motion;
      this.enemySpriteEl.classList.remove(
        'is-idle', 'windup', 'lunge-right', 'lunge-left', 'quick-lunge-right', 'quick-lunge-left',
        'hit-stop', 'hit-shake', 'evo-glow', 'evo-flash',
        'enemy-sendout', 'player-sendout', 'faint-drop',
        'capture-energize', 'capture-pull', 'capture-shrink',
        'is-shiny-sprite', 'is-elite-sprite', 'ability-pulse', ...ALL_MOVE_FX_CLASSES,
      );
    }
    if (this.playerSpriteEl) {
      delete this.playerSpriteEl.dataset.motion;
      this.playerSpriteEl.classList.remove(
        'is-idle', 'windup', 'lunge-right', 'lunge-left', 'quick-lunge-right', 'quick-lunge-left',
        'hit-stop', 'hit-shake', 'evo-glow', 'evo-flash',
        'enemy-sendout', 'player-sendout', 'faint-drop',
        'capture-energize', 'capture-pull', 'capture-shrink',
        'is-shiny-sprite', 'is-elite-sprite', 'ability-pulse', ...ALL_MOVE_FX_CLASSES,
      );
    }
    const enemyCard = this.enemyStatusCardEl || this.enemyNameEl?.closest('.status-card-enemy') || document.querySelector('.status-card-enemy');
    enemyCard?.classList.remove('is-elite-card');

    this.closeTeamDrawer();
    this.clearAllTimersAndLoops();

    if (this.screenEl) {
      this.screenEl.classList.remove('is-action-locked');
      this.screenEl.hidden = true;
    }
    this.onBattleEnd?.(result);
  }

  triggerPrimaryAction() {
    if (!this.active) return;
    if (this.typingResolve) {
      this.finishTypewriter();
      return;
    }
    if (this.canAcceptPlayerAction()) {
      const selectedBtn = this.movesEl?.querySelector('.move-card.is-selected:not(:disabled)');
      const fallbackBtn = this.movesEl?.querySelector('.move-card:not(:disabled)');
      const target = selectedBtn || fallbackBtn;
      if (target) target.click();
    }
  }

  triggerCancelAction() {
    if (!this.active) return;
    if (this.teamDrawerEl && !this.teamDrawerEl.hidden && !this.mustSwitchForced) {
      this.closeTeamDrawer();
    }
  }

  syncRankPill(side, mon) {
    const card = side === 'enemy'
      ? (this.enemyStatusCardEl || this.enemyNameEl?.closest('.status-card-enemy') || document.querySelector('.status-card-enemy'))
      : (this.playerStatusCardEl || this.playerNameEl?.closest('.status-card-player') || document.querySelector('.status-card-player'));
    if (!card) return;
    const pillId = side === 'enemy' ? 'enemy-rank-pill' : 'player-rank-pill';
    let pill = card.querySelector(`#${pillId}`) || card.querySelector('.rank-pill');
    const tier = Math.max(0, Math.min(5, Math.round(Number(mon?.upgradeTier) || 0)));
    if (tier <= 0) {
      if (pill) pill.remove();
      return;
    }
    if (!pill) {
      pill = document.createElement('span');
      pill.id = pillId;
      pill.className = 'rank-pill';
      const levelEl = side === 'enemy' ? this.enemyLevelEl : this.playerLevelEl;
      const head = levelEl?.parentElement || card.querySelector('.status-head');
      if (head && levelEl && levelEl.parentElement === head) {
        head.insertBefore(pill, levelEl);
      } else if (head) {
        head.appendChild(pill);
      } else {
        card.appendChild(pill);
      }
    }
    pill.textContent = `★${tier}`;
    pill.title = `Star Rank ★${tier}`;
  }

  renderStagePills(containerEl, mon, { isEnemy = false } = {}) {
    if (!containerEl || !mon) return;
    const chips = [];
    if (isEnemy && mon.isElite) {
      chips.push('<span class="stage-chip elite-badge is-elite">⚡ ELITE</span>');
    }
    if (isEnemy && !this.isShrine && !this.isTrainer) {
      const trait = resolveEncounterTraitMeta(mon.encounterTrait);
      if (trait) {
        chips.push(`<span class="stage-chip is-trait ${trait.cssClass}">${trait.callout}</span>`);
      }
    }
    if (mon.isShiny) {
      chips.push('<span class="stage-chip is-shiny">✨ SHIMMER</span>');
    }
    if ((mon.shieldTurns || 0) > 0) {
      chips.push(`<span class="stage-chip is-shield">🛡️ SHIELD (${mon.shieldTurns})</span>`);
    }
    const stages = mon.battleStages || {};
    const labels = { atk: 'ATK', def: 'DEF', spd: 'SPD' };
    for (const [stat, label] of Object.entries(labels)) {
      const val = Number(stages[stat] || 0);
      if (val > 0) {
        chips.push(`<span class="stage-chip is-buff">${label} ▲${val > 1 ? val : ''}</span>`);
      } else if (val < 0) {
        chips.push(`<span class="stage-chip is-debuff">${label} ▼${Math.abs(val) > 1 ? Math.abs(val) : ''}</span>`);
      }
    }
    containerEl.innerHTML = chips.join('');
    containerEl.hidden = chips.length === 0;
  }

  renderStatusCards() {
    if (!this.enemy || !this.player) return;
    const profile = this.storage.getActiveProfile();
    const caughtBefore = Boolean(profile?.pokedex?.caught?.[this.enemy.speciesId]);

    const enemyCard = this.enemyStatusCardEl || this.enemyNameEl?.closest('.status-card-enemy') || document.querySelector('.status-card-enemy');
    enemyCard?.classList.toggle('is-elite-card', Boolean(this.enemy.isElite));
    this.enemySpriteEl?.classList.toggle('is-elite-sprite', Boolean(this.enemy.isElite));

    if (this.enemyNameEl) this.enemyNameEl.textContent = this.enemy.name;
    if (this.enemyLevelEl) this.enemyLevelEl.textContent = `Lv.${this.enemy.level}`;
    this.syncRankPill('enemy', this.enemy);
    const eType = resolveTypeMeta(this.enemy.type);
    if (this.enemyTypeEl) {
      this.enemyTypeEl.textContent = `${eType.icon} ${eType.label}`;
      this.enemyTypeEl.style.background = eType.bg;
      this.enemyTypeEl.style.color = '#ffffff';
    }
    if (this.enemyDexPillEl) {
      this.enemyDexPillEl.hidden = !caughtBefore || this.isShrine || this.isTrainer;
    }
    const pipsEl = this.enemyPartyPipsEl || this.ensureEnemyPartyPipsEl();
    if (pipsEl) {
      this.enemyPartyPipsEl = pipsEl;
      if (Array.isArray(this.enemyParty) && this.enemyParty.length > 1) {
        pipsEl.innerHTML = this.enemyParty.map((mon, idx) => {
          const stateCls = mon?.isFainted ? ' is-fainted' : idx === this.enemyPartyIndex ? ' is-active' : '';
          const title = mon ? `${mon.name} Lv.${mon.level}${mon.isFainted ? ' (Fainted)' : ''}` : '';
          return `<span class="enemy-party-pip${stateCls}" title="${title}"></span>`;
        }).join('');
        pipsEl.hidden = false;
      } else {
        pipsEl.innerHTML = '';
        pipsEl.hidden = true;
      }
    }
    this.updateHpBarVisual(this.enemyHpFillEl, this.displayedEnemyHp, this.enemy.maxHp);
    if (this.enemyStagesEl) {
      this.renderStagePills(this.enemyStagesEl, this.enemy, { isEnemy: true });
    }

    if (this.playerNameEl) this.playerNameEl.textContent = this.player.displayName || this.player.name;
    if (this.playerLevelEl) this.playerLevelEl.textContent = `Lv.${this.player.level}`;
    this.syncRankPill('player', this.player);
    const pType = resolveTypeMeta(this.player.type);
    if (this.playerTypeEl) {
      this.playerTypeEl.textContent = `${pType.icon} ${pType.label}`;
      this.playerTypeEl.style.background = pType.bg;
      this.playerTypeEl.style.color = '#ffffff';
    }
    this.updateHpBarVisual(this.playerHpFillEl, this.displayedPlayerHp, this.player.maxHp);
    if (this.playerHpTextEl) {
      this.playerHpTextEl.textContent = `HP ${Math.round(this.displayedPlayerHp)}/${this.player.maxHp}`;
    }
    if (this.playerXpFillEl && this.xpRaf === null) {
      const xpPct = Math.min(100, Math.round((this.player.xp / Math.max(1, this.player.xpToNext)) * 100));
      this.playerXpFillEl.style.width = `${xpPct}%`;
    }
    if (this.playerStagesEl) {
      this.renderStagePills(this.playerStagesEl, this.player, { isEnemy: false });
    }
  }

  updateHpBarVisual(el, hp, maxHp) {
    if (!el) return;
    const safeMax = Number.isFinite(Number(maxHp)) && Number(maxHp) > 0 ? Number(maxHp) : 1;
    const safeHp = Number.isFinite(Number(hp)) ? Math.max(0, Number(hp)) : 0;
    const pct = Math.max(0, Math.min(100, (safeHp / safeMax) * 100));
    el.style.width = `${pct}%`;

    const isHigh = pct > 50;
    const isMid = pct > 20 && pct <= 50;
    const isLow = pct <= 20;
    el.classList.toggle('is-high', isHigh);
    el.classList.toggle('is-mid', isMid);
    el.classList.toggle('is-low', isLow);

    let startCol;
    let endCol;
    if (pct > 50) {
      const blend = Math.max(0, Math.min(1, (65 - pct) / 15));
      startCol = lerpHex(HP_COLOR_EMERALD_A, HP_COLOR_AMBER_A, blend * 0.25);
      endCol = lerpHex(HP_COLOR_EMERALD_B, HP_COLOR_AMBER_B, blend * 0.25);
    } else if (pct > 20) {
      const t = (50 - pct) / 30;
      startCol = lerpHex(HP_COLOR_AMBER_A, HP_COLOR_CRIMSON_A, Math.max(0, (t - 0.55) / 0.45) * 0.35);
      endCol = lerpHex(HP_COLOR_AMBER_B, HP_COLOR_CRIMSON_B, Math.max(0, (t - 0.55) / 0.45) * 0.35);
    } else {
      const t = (20 - pct) / 20;
      startCol = lerpHex(HP_COLOR_CRIMSON_A, [185, 28, 28], t * 0.5);
      endCol = lerpHex(HP_COLOR_CRIMSON_B, [239, 68, 68], t * 0.5);
    }
    el.style.background = `linear-gradient(90deg, ${startCol}, ${endCol})`;
  }

  async animateHpTo(side, targetHp, duration = 460) {
    const sid = this.sessionId;
    if (!this.isSessionValid(sid)) return;

    if (this.hpRafs[side] !== null) {
      cancelAnimationFrame(this.hpRafs[side]);
      this.hpRafs[side] = null;
    }
    if (this.hpResolvers[side]) {
      const prevResolve = this.hpResolvers[side];
      this.hpResolvers[side] = null;
      prevResolve();
    }

    const startHp = side === 'enemy' ? this.displayedEnemyHp : this.displayedPlayerHp;
    const maxHp = side === 'enemy' ? this.enemy.maxHp : this.player.maxHp;
    const startTime = performance.now();

    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        this.hpRafs[side] = null;
        if (this.hpResolvers[side] === done) {
          this.hpResolvers[side] = null;
        }
        resolve();
      };
      this.hpResolvers[side] = done;

      const tick = (now) => {
        if (!this.isSessionValid(sid)) {
          done();
          return;
        }
        const t = Math.min(1, (now - startTime) / Math.max(1, duration));
        const eased = 1 - Math.pow(1 - t, 3);
        const current = startHp + (targetHp - startHp) * eased;

        if (side === 'enemy') {
          this.displayedEnemyHp = current;
          this.updateHpBarVisual(this.enemyHpFillEl, current, maxHp);
        } else {
          this.displayedPlayerHp = current;
          this.updateHpBarVisual(this.playerHpFillEl, current, maxHp);
          if (this.playerHpTextEl) {
            this.playerHpTextEl.textContent = `HP ${Math.round(current)}/${maxHp}`;
          }
        }

        if (t < 1 && this.isSessionValid(sid)) {
          this.hpRafs[side] = requestAnimationFrame(tick);
        } else {
          if (side === 'enemy') {
            this.displayedEnemyHp = targetHp;
            this.updateHpBarVisual(this.enemyHpFillEl, targetHp, maxHp);
          } else {
            this.displayedPlayerHp = targetHp;
            this.updateHpBarVisual(this.playerHpFillEl, targetHp, maxHp);
            if (this.playerHpTextEl) {
              this.playerHpTextEl.textContent = `HP ${Math.round(targetHp)}/${maxHp}`;
            }
            this.onHudRefresh?.();
          }
          done();
        }
      };

      this.hpRafs[side] = requestAnimationFrame(tick);
    });
  }

  selectMoveCard(index, playSound = false) {
    if (!this.movesEl) return;
    const cards = Array.from(this.movesEl.querySelectorAll('.move-card'));
    if (cards.length === 0) return;

    const clamped = Math.max(0, Math.min(cards.length - 1, index));
    const changed = clamped !== this.selectedMoveIndex;
    this.selectedMoveIndex = clamped;
    cards.forEach((card, i) => {
      card.classList.toggle('is-selected', i === clamped);
    });
    if (playSound && changed && this.canAcceptPlayerAction()) {
      this.audio?.playCursorMove?.();
    }
  }

  syncMoveSelectionVisuals() {
    this.selectMoveCard(this.selectedMoveIndex, false);
  }

  moveSelectionCursor(dir) {
    if (!this.canAcceptPlayerAction() || !this.movesEl) return false;
    const cards = Array.from(this.movesEl.querySelectorAll('.move-card'));
    const count = cards.length;
    if (count === 0) return false;

    const cur = Math.max(0, Math.min(count - 1, this.selectedMoveIndex));
    let next = cur;

    if (dir === 'left') {
      if (cur % 2 === 1) next = cur - 1;
    } else if (dir === 'right') {
      if (cur % 2 === 0 && cur + 1 < count) next = cur + 1;
    } else if (dir === 'up') {
      if (cur >= 2) next = cur - 2;
    } else if (dir === 'down') {
      if (cur + 2 < count) next = cur + 2;
      else if (cur < 2 && count === 3) next = 2;
    }

    if (next !== cur && cards[next]?.disabled) {
      const alt = cards.findIndex((c, idx) => idx !== cur && !c.disabled && (
        (dir === 'down' && idx >= 2) ||
        (dir === 'up' && idx < 2) ||
        (dir === 'right' && idx % 2 === 1) ||
        (dir === 'left' && idx % 2 === 0)
      ));
      if (alt >= 0) next = alt;
      else return false;
    }

    this.selectMoveCard(next, true);
    return next !== cur;
  }

  selectMoveBySlot(slotIdx) {
    if (!this.canAcceptPlayerAction() || !this.movesEl) return false;
    const idx = Number(slotIdx);
    if (!Number.isInteger(idx) || idx < 0) return false;
    const cards = Array.from(this.movesEl.querySelectorAll('.move-card'));
    const card = cards[idx];
    if (!card || card.disabled) {
      if (card?.disabled) this.audio?.playMenuBlip?.(300);
      return false;
    }
    this.selectMoveCard(idx, false);
    card.click();
    return true;
  }

  renderMoveButtons() {
    if (!this.movesEl || !this.player || !this.enemy) return;
    const moves = this.player.getMoveObjects();
    const hasAnyPp = this.player.hasAnyMovePp();
    this.movesEl.innerHTML = '';

    if (this.selectedMoveIndex < 0 || this.selectedMoveIndex >= moves.length) {
      this.selectedMoveIndex = 0;
    }
    if (moves.length > 0 && hasAnyPp) {
      const currentMove = moves[this.selectedMoveIndex];
      const currentPp = currentMove ? this.player.getMovePp(currentMove.id).current : 0;
      if (currentPp <= 0) {
        const firstAvailableIdx = moves.findIndex((m) => this.player.getMovePp(m.id).current > 0);
        if (firstAvailableIdx >= 0) {
          this.selectedMoveIndex = firstAvailableIdx;
        }
      }
    }

    moves.forEach((move, idx) => {
      const typeMeta = resolveTypeMeta(move.type);
      const isNonAttack = move.category === 'heal'
        || move.category === 'buff'
        || move.category === 'shield'
        || move.damageClass === 'status'
        || (Number(move.power) || 0) <= 0;
      const eff = isNonAttack || !this.enemy ? 1 : computeTypeEffectiveness(move.type, this.enemy.type);
      const pp = this.player.getMovePp(move.id);
      const outOfPp = pp.current <= 0 && hasAnyPp;
      const ppRatio = pp.max > 0 ? pp.current / pp.max : 0;
      const ppStateClass = pp.current === 0 || ppRatio <= 0.25 ? 'is-critical' : ppRatio <= 0.5 ? 'is-low' : '';
      const filledPips = pp.current <= 0 ? 0 : Math.max(1, Math.min(5, Math.round(ppRatio * 5)));

      let pipsHtml = '';
      for (let p = 0; p < 5; p++) {
        pipsHtml += `<span class="pp-pip${p < filledPips ? ' is-filled' : ''}"></span>`;
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `move-btn move-card move-card--${move.type}${idx === this.selectedMoveIndex ? ' is-selected' : ''}`;
      btn.dataset.moveId = move.id;
      btn.dataset.moveType = move.type;
      btn.dataset.outOfPp = outOfPp ? '1' : '0';

      let effBadgeHtml = '';
      if (move.category === 'heal') {
        effBadgeHtml = '<span class="move-eff-tag is-heal" title="Restores partner HP">♥ RECOVER</span>';
      } else if (move.category === 'buff') {
        effBadgeHtml = '<span class="move-eff-tag is-buff" title="Boosts partner stats">⚡ STAT UP</span>';
      } else if (move.category === 'shield') {
        effBadgeHtml = '<span class="move-eff-tag is-shield" title="Raises partner defense">🛡️ GUARD</span>';
      } else if (eff >= 2) {
        effBadgeHtml = '<span class="move-eff-tag move-eff-badge move-eff-pill is-super" title="Super Effective! (2× damage)">2x SUPER</span>';
      } else if (eff > 1) {
        effBadgeHtml = '<span class="move-eff-tag move-eff-badge move-eff-pill is-boost" title="Good Boost! (1.5× damage)">1.5x BOOST</span>';
      } else if (eff === 0) {
        effBadgeHtml = '<span class="move-eff-tag move-eff-badge move-eff-pill is-immune" title="No Effect (0× damage)">0x IMMUNE</span>';
      } else if (eff < 1) {
        effBadgeHtml = '<span class="move-eff-tag move-eff-badge move-eff-pill is-resist" title="Resisted (½× damage)">0.5x RESIST</span>';
      }

      const statShort = { atk: 'ATK', def: 'DEF', spd: 'SPD' }[move.buffStat || 'atk'] || 'STAT';
      let catClass = move.damageClass === 'physical' ? 'physical' : 'special';
      let catLabel = catClass === 'physical' ? '💥 PHY' : '✦ SPC';
      let powerLabel = `PWR ${move.power}`;

      if (move.category === 'heal') {
        catClass = 'status';
        catLabel = '💚 HEAL';
        powerLabel = 'HEAL 38%';
      } else if (move.category === 'buff') {
        catClass = 'buff';
        catLabel = '⚡ BOOST';
        powerLabel = `${statShort} +${move.buffStages || 1}`;
      } else if (move.category === 'shield') {
        catClass = 'shield';
        catLabel = '🛡️ SHIELD';
        powerLabel = 'DEF +35%';
      }

      btn.innerHTML = `
        <span class="move-card-top">
          <span class="move-name-wrap">
            <span class="move-cursor" aria-hidden="true">▶</span>
            <span class="move-btn-name">${typeMeta.icon} ${move.name}</span>
          </span>
          ${effBadgeHtml}
        </span>
        <span class="move-card-bottom">
          <span class="move-stats-wrap">
            <span class="move-cat-badge is-${catClass}">${catLabel}</span>
            <span class="move-pwr-tag">${powerLabel}</span>
          </span>
          <span class="move-pp-wrap ${ppStateClass}">
            <span class="move-pp-text">PP ${pp.current}/${pp.max}</span>
            <span class="pp-pips" aria-hidden="true">${pipsHtml}</span>
          </span>
        </span>
      `;

      const locked = this.busy || this.state !== BATTLE_STATES.PLAYER_INPUT;
      btn.disabled = locked || outOfPp;

      btn.addEventListener('pointerenter', () => {
        if (!btn.disabled && this.canAcceptPlayerAction()) {
          this.selectMoveCard(idx, true);
        }
      });
      btn.addEventListener('focus', () => {
        if (!btn.disabled && this.canAcceptPlayerAction()) {
          this.selectMoveCard(idx, true);
        }
      });
      btn.addEventListener('click', () => {
        this.selectedMoveIndex = idx;
        this.handlePlayerMove(move);
      });

      this.movesEl.appendChild(btn);
    });
  }

  renderActionButtons() {
    const profile = this.storage.getActiveProfile();
    if (!profile || !this.player) return;

    const locked = this.busy || this.state !== BATTLE_STATES.PLAYER_INPUT;
    const starBalls = Math.max(0, Number(profile.bag?.starBalls) || 0);
    if (this.btnBall) {
      this.btnBall.textContent = this.isShrine ? '🛡️ Guardian' : '🔴 Poké Ball ∞';
      this.btnBall.disabled = locked;
    }
    if (this.btnGreat) {
      this.btnGreat.textContent = `🔵 Great Ball (${profile.bag.greatBalls})`;
      this.btnGreat.disabled = locked || this.isShrine || this.isTrainer || profile.bag.greatBalls <= 0;
    }
    if (this.btnStar) {
      this.btnStar.textContent = `🌟 Star Ball (${starBalls})`;
      this.btnStar.disabled = locked || this.isShrine || this.isTrainer || starBalls <= 0;
    }
    if (this.btnPotion) {
      this.btnPotion.textContent = `🍓 Potion (${profile.bag.potions})`;
      this.btnPotion.disabled = locked || profile.bag.potions <= 0 || this.player.hp >= this.player.maxHp;
    }
    if (this.btnTeam) {
      this.btnTeam.disabled = locked || profile.team.length <= 1;
    }
    if (this.btnRun) {
      this.btnRun.disabled = locked;
    }
  }

  setControlsDisabled(disabled) {
    this.movesEl?.querySelectorAll('button').forEach((btn) => {
      const outOfPp = btn.dataset.outOfPp === '1';
      btn.disabled = Boolean(disabled) || outOfPp;
    });
    if (this.btnBall) this.btnBall.disabled = Boolean(disabled);
    if (this.btnRun) this.btnRun.disabled = Boolean(disabled);
    if (disabled) {
      if (this.btnGreat) this.btnGreat.disabled = true;
      if (this.btnStar) this.btnStar.disabled = true;
      if (this.btnPotion) this.btnPotion.disabled = true;
      if (this.btnTeam) this.btnTeam.disabled = true;
    } else {
      this.renderActionButtons();
    }
  }

  say(text, speedMs = null, holdMs = null) {
    this.finishTypewriter();
    const pace = this.getPaceConfig();
    const resolvedSpeed = speedMs !== null && speedMs !== undefined && Number.isFinite(Number(speedMs))
      ? Number(speedMs)
      : pace.saySpeedMs;
    const resolvedHold = holdMs !== null && holdMs !== undefined && Number.isFinite(Number(holdMs))
      ? Number(holdMs)
      : pace.sayHoldMs;
    const safeText = String(text ?? '');
    this.typingFullText = safeText;

    if (this.logEl) {
      this.logEl.textContent = '';
      this.logEl.classList.remove('is-waiting');
      this.logEl.classList.add('is-typing');
    }

    return new Promise((resolve) => {
      this.typingResolve = resolve;
      let idx = 0;

      const enterWaitingPhase = () => {
        if (this.typingTimer !== null) {
          clearInterval(this.typingTimer);
          this.typingTimer = null;
        }
        if (this.logEl) {
          this.logEl.textContent = safeText;
          this.logEl.classList.remove('is-typing');
          this.logEl.classList.add('is-waiting');
        }
        if (resolvedHold <= 0) {
          this.finishTypewriter();
          return;
        }
        this.typingHoldTimer = setTimeout(() => {
          this.typingHoldTimer = null;
          if (this.typingResolve === resolve) {
            if (this.logEl) {
              this.logEl.classList.remove('is-typing', 'is-waiting');
            }
            this.typingResolve = null;
            resolve();
          }
        }, resolvedHold);
      };

      if (resolvedSpeed <= 0 || safeText.length === 0) {
        enterWaitingPhase();
        return;
      }

      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.typingTimer = setInterval(() => {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const elapsedChars = Math.floor((now - startedAt) / Math.max(1, resolvedSpeed));
        idx = Math.min(safeText.length, Math.max(idx + 1, elapsedChars));
        if (this.logEl) {
          this.logEl.textContent = safeText.slice(0, idx);
        }
        if (idx >= safeText.length) {
          enterWaitingPhase();
        }
      }, resolvedSpeed);
    });
  }

  finishTypewriter() {
    if (this.typingTimer !== null) {
      clearInterval(this.typingTimer);
      this.typingTimer = null;
    }
    if (this.typingHoldTimer !== null) {
      clearTimeout(this.typingHoldTimer);
      this.typingHoldTimer = null;
    }
    if (this.logEl) {
      this.logEl.classList.remove('is-typing', 'is-waiting');
      if (this.typingFullText) {
        this.logEl.textContent = this.typingFullText;
      }
    }
    if (this.typingResolve) {
      const done = this.typingResolve;
      this.typingResolve = null;
      done();
    }
  }

  getSpriteCenter(side) {
    if (!this.stageEl) return { x: 180, y: 120 };
    const stageRect = this.stageEl.getBoundingClientRect();
    const targetEl = side === 'enemy' ? this.enemySpriteEl : this.playerSpriteEl;
    const rect = targetEl?.getBoundingClientRect();
    if (!rect || rect.width === 0) {
      return side === 'enemy'
        ? { x: stageRect.width * 0.75, y: stageRect.height * 0.34 }
        : { x: stageRect.width * 0.24, y: stageRect.height * 0.68 };
    }
    return {
      x: rect.left - stageRect.left + rect.width / 2,
      y: rect.top - stageRect.top + rect.height / 2,
    };
  }

  getPedestalPoint(side) {
    if (!this.stageEl) return { x: 180, y: 150 };
    const stageRect = this.stageEl.getBoundingClientRect();
    const mountSelector = side === 'enemy' ? '.fighter-mount-enemy .fighter-pedestal' : '.fighter-mount-player .fighter-pedestal';
    const pedEl = this.stageEl.querySelector(mountSelector);
    const rect = pedEl?.getBoundingClientRect();
    if (!rect || rect.width === 0) {
      const center = this.getSpriteCenter(side);
      return { x: center.x, y: center.y + 48 };
    }
    return {
      x: rect.left - stageRect.left + rect.width / 2,
      y: rect.top - stageRect.top + rect.height * 0.42,
    };
  }

  prefersReducedMotion() {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  triggerScreenShake(intensity = 6, durationMs = 260) {
    if (this.prefersReducedMotion()) {
      this.shakeIntensity = 0;
      this.shakeDuration = 0;
      this.shakeTimer = 0;
      if (this.stageEl) this.stageEl.style.transform = '';
      return;
    }
    this.shakeIntensity = Math.min(16, Math.max(2, intensity));
    this.shakeDuration = Math.max(0.08, durationMs / 1000);
    this.shakeTimer = this.shakeDuration;
  }

  spawnFloatingText(x, y, text, color = '#ffffff', size = 20, delay = 0, maxLife = 1.45) {
    this.popups.push({
      x,
      y,
      vy: -44,
      life: -delay,
      maxLife,
      text,
      color,
      size,
    });
  }

  spawnShinyIntroSparkles(side = 'enemy') {
    const center = this.getSpriteCenter(side);
    const colors = ['#fde047', '#fef08a', '#ffffff', '#f472b6'];
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24 + (Math.random() - 0.5) * 0.3;
      const speed = 42 + Math.random() * 96;
      this.particles.push({
        x: center.x + (Math.random() - 0.5) * 26,
        y: center.y + (Math.random() - 0.5) * 26,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 24,
        gravity: -18,
        life: -(i * 0.015),
        maxLife: 0.8 + Math.random() * 0.35,
        color: colors[i % colors.length],
        size: 4 + Math.random() * 3.5,
        rotation: angle,
        spin: 7,
        shape: 'star',
      });
    }
  }

  spawnEliteIntroAura(side = 'enemy') {
    const center = this.getSpriteCenter(side);
    const ringColors = ['#fbbf24', '#a855f7', '#fde047'];
    ringColors.forEach((color, idx) => {
      this.particles.push({
        x: center.x,
        y: center.y,
        vx: 0,
        vy: 0,
        gravity: 0,
        life: -(idx * 0.06),
        maxLife: 0.55,
        color,
        size: 16,
        maxRadius: 88 + idx * 20,
        lineWidth: 3.5,
        shape: 'ring',
      });
    });
    const auraColors = ['#fde047', '#c084fc', '#fb923c', '#ffffff'];
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      this.particles.push({
        x: center.x + Math.cos(angle) * 58,
        y: center.y + Math.sin(angle) * 44,
        orbitCenter: center,
        orbitAngle: angle,
        orbitRadius: 56 + (i % 3) * 10,
        orbitRadialVel: -16,
        orbitAngVel: i % 2 === 0 ? 5.2 : -4.4,
        life: -(i * 0.015),
        maxLife: 0.95,
        color: auraColors[i % auraColors.length],
        size: i % 3 === 0 ? 5.5 : 4,
        rotation: angle,
        spin: 6,
        shape: i % 2 === 0 ? 'star' : 'lightning',
      });
    }
  }

  spawnAbilityFX(side, abilityId, abilityType = 'normal', pace = null) {
    const center = this.getSpriteCenter(side);
    const otherSide = side === 'enemy' ? 'player' : 'enemy';
    const otherCenter = this.getSpriteCenter(otherSide);
    const pedestal = this.getPedestalPoint(side);
    const lifeScale = Math.min(1.35, pace?.particleLifeScale || 1.15);
    const profiles = {
      overgrow: { rings: ['#22c55e', '#fde047'], cols: ['#22c55e', '#4ade80', '#fde047'], shape: 'leaf', altShape: 'petal', orbit: 6.2, stageKind: 'canopy_bloom', stageCols: ['#22c55e', '#4ade80', '#fde047'] },
      blaze: { rings: ['#f97316', '#fde047'], cols: ['#ef4444', '#fb923c', '#fde047'], shape: 'ember', altShape: 'wave_arc', orbit: 7.4, stageKind: 'flame_pillars', stageCols: ['#ef4444', '#fb923c', '#fde047'] },
      torrent: { rings: ['#38bdf8', '#e0f2fe'], cols: ['#38bdf8', '#22d3ee', '#bae6fd'], shape: 'bubble', altShape: 'wave_arc', orbit: -6.4, stageKind: 'tidal_vortex', stageCols: ['#38bdf8', '#22d3ee', '#e0f2fe'] },
      volt_reflex: { rings: ['#fde047', '#38bdf8'], cols: ['#fde047', '#38bdf8', '#ffffff'], shape: 'lightning', altShape: 'bolt', orbit: 9.2, stageKind: 'lightning_cage', stageCols: ['#fde047', '#38bdf8', '#ffffff'] },
      storm_conduit: { rings: ['#facc15', '#22d3ee'], cols: ['#fde047', '#22d3ee', '#ffffff'], shape: 'bolt', altShape: 'wave_arc', orbit: -8.6, stageKind: 'storm_arcs', stageCols: ['#facc15', '#22d3ee', '#ffffff'] },
      diamond_guard: { rings: ['#67e8f9', '#e2e8f0'], cols: ['#ffffff', '#67e8f9', '#fbbf24'], shape: 'crystal', altShape: 'hexagon', orbit: 5.0, stageKind: 'prism_array', stageCols: ['#67e8f9', '#e2e8f0', '#fbbf24'] },
      dune_titan: { rings: ['#f59e0b', '#d6a36b'], cols: ['#fbbf24', '#d97706', '#a8a29e'], shape: 'stone', altShape: 'sigil', orbit: -5.4, stageKind: 'monolith_pillars', stageCols: ['#f59e0b', '#d97706', '#fef3c7'] },
      mystic_prism: { rings: ['#f472b6', '#67e8f9'], cols: ['#f472b6', '#67e8f9', '#fde047', '#a855f7'], shape: 'crystal', altShape: 'sigil', orbit: 6.8, stageKind: 'kaleidoscope', stageCols: ['#f472b6', '#67e8f9', '#fde047'] },
      cosmic_presence: { rings: ['#a855f7', '#fde047'], cols: ['#818cf8', '#f472b6', '#fde047'], shape: 'crescent', altShape: 'sigil', orbit: 5.6, stageKind: 'orbital_rings', stageCols: ['#a855f7', '#f472b6', '#fde047'] },
      permafrost: { rings: ['#67e8f9', '#a7f3d0'], cols: ['#e0f2fe', '#67e8f9', '#a7f3d0'], shape: 'hexagon', altShape: 'crystal', orbit: -4.8, stageKind: 'hex_lattice', stageCols: ['#e0f2fe', '#67e8f9', '#a7f3d0'] },
      shadow_cloak: { rings: ['#a855f7', '#7e22ce'], cols: ['#a855f7', '#c084fc', '#e9d5ff'], shape: 'wisp', altShape: 'sigil', orbit: -6.6, stageKind: 'crescent_shroud', stageCols: ['#a855f7', '#7e22ce', '#e9d5ff'] },
      dragon_heart: { rings: ['#6366f1', '#fde047'], cols: ['#818cf8', '#6366f1', '#fde047'], shape: 'dragonflame', altShape: 'star', orbit: 7.2, stageKind: 'constellation', stageCols: ['#818cf8', '#fde047', '#38bdf8'] },
      prism_scales: { rings: ['#38bdf8', '#f472b6'], cols: ['#67e8f9', '#f472b6', '#fde047', '#ffffff'], shape: 'hexagon', altShape: 'bubble', orbit: 5.2, stageKind: 'scale_dome', stageCols: ['#67e8f9', '#f472b6', '#fde047'] },
      starlight_grace: { rings: ['#f472b6', '#fde047'], cols: ['#f472b6', '#fb7185', '#fde047', '#ffffff'], shape: 'heart', altShape: 'petal', orbit: 4.5, stageKind: 'grace_halo', stageCols: ['#f472b6', '#fde047', '#ffffff'] },
      chlorophyll_rush: { rings: ['#84cc16', '#fde047'], cols: ['#fde047', '#4ade80', '#bef264'], shape: 'petal', altShape: 'leaf', orbit: 7.0, stageKind: 'sunbeams', stageCols: ['#fde047', '#4ade80', '#bef264'] },
      nectar_siphon: { rings: ['#f43f5e', '#22c55e'], cols: ['#fb7185', '#4ade80', '#f472b6', '#bbf7d0'], shape: 'petal', altShape: 'heart', orbit: 5.8, stageKind: 'siphon_stream', stageCols: ['#fb7185', '#22c55e', '#fde047'] },
      magma_armor: { rings: ['#ef4444', '#78350f'], cols: ['#fb923c', '#ef4444', '#57534e'], shape: 'hexagon', altShape: 'ember', orbit: -4.6, stageKind: 'armor_plates', stageCols: ['#fb923c', '#ef4444', '#44403c'] },
      supernova_core: { rings: ['#fde047', '#ef4444'], cols: ['#ffffff', '#fde047', '#fb923c', '#ef4444'], shape: 'wave_arc', altShape: 'ember', orbit: 8.4, stageKind: 'solar_corona', stageCols: ['#fde047', '#fb923c', '#ef4444'] },
      abyssal_current: { rings: ['#2dd4bf', '#f472b6'], cols: ['#2dd4bf', '#38bdf8', '#f472b6'], shape: 'wave_arc', altShape: 'bubble', orbit: -5.8, stageKind: 'coral_tide', stageCols: ['#2dd4bf', '#06b6d4', '#f472b6'] },
      pearl_aegis: { rings: ['#cffafe', '#f9a8d4'], cols: ['#ffffff', '#a5f3fc', '#f9a8d4', '#fde68a'], shape: 'bubble', altShape: 'hexagon', orbit: 4.8, stageKind: 'pearl_dome', stageCols: ['#a5f3fc', '#f9a8d4', '#ffffff'] },
      thunder_steppe: { rings: ['#fde047', '#f59e0b'], cols: ['#fde047', '#fbbf24', '#ffffff'], shape: 'gear', altShape: 'lightning', orbit: 8.8, stageKind: 'dynamo_coils', stageCols: ['#fde047', '#f59e0b', '#38bdf8'] },
      rail_overload: { rings: ['#22d3ee', '#fde047'], cols: ['#22d3ee', '#fde047', '#ffffff'], shape: 'lightning', altShape: 'ray', orbit: 9.6, stageKind: 'rail_crosshair', stageCols: ['#22d3ee', '#fde047', '#ffffff'] },
      fossil_bastion: { rings: ['#d97706', '#fef3c7'], cols: ['#d97706', '#a8a29e', '#fde68a'], shape: 'sigil', altShape: 'stone', orbit: -4.4, stageKind: 'stone_bastion', stageCols: ['#f59e0b', '#a8a29e', '#fef3c7'] },
      chrono_shift: { rings: ['#f59e0b', '#c084fc'], cols: ['#fde047', '#f59e0b', '#c084fc', '#ffffff'], shape: 'gear', altShape: 'sigil', orbit: 6.4, stageKind: 'clockwork_dial', stageCols: ['#fde047', '#f59e0b', '#c084fc'] },
      champion_spirit: { rings: ['#fb7185', '#fde047'], cols: ['#fb7185', '#fde047', '#ffffff'], shape: 'wave_arc', altShape: 'star', orbit: 8.2, stageKind: 'dojo_rings', stageCols: ['#fb7185', '#fde047', '#ffffff'] },
      aurora_cloak: { rings: ['#67e8f9', '#a7f3d0'], cols: ['#67e8f9', '#34d399', '#c084fc', '#ffffff'], shape: 'hexagon', altShape: 'crystal', orbit: 5.4, stageKind: 'aurora_ribbons', stageCols: ['#34d399', '#67e8f9', '#c084fc'] },
      phantom_mirage: { rings: ['#a855f7', '#2dd4bf'], cols: ['#a855f7', '#2dd4bf', '#e9d5ff'], shape: 'wisp', altShape: 'sigil', orbit: -6.2, stageKind: 'spectral_lanterns', stageCols: ['#2dd4bf', '#a855f7', '#e9d5ff'] },
      rift_sovereign: { rings: ['#ec4899', '#6366f1'], cols: ['#ec4899', '#6366f1', '#67e8f9', '#fde047'], shape: 'sigil', altShape: 'dragonflame', orbit: 7.8, stageKind: 'rift_portal', stageCols: ['#ec4899', '#6366f1', '#67e8f9'] },
      orichalcum_pulse: { rings: ['#dc2626', '#fbbf24'], cols: ['#ef4444', '#fbbf24', '#fb7185', '#ffffff'], shape: 'wave_arc', altShape: 'star', orbit: 8.8, stageKind: 'orichalcum_burst', stageCols: ['#ef4444', '#fbbf24', '#fde047'] },
      gale_wings: { rings: ['#38bdf8', '#e0f2fe'], cols: ['#38bdf8', '#7dd3fc', '#e0f2fe', '#ffffff'], shape: 'feather', altShape: 'wind', orbit: 9.4, stageKind: 'skyward_feathers', stageCols: ['#38bdf8', '#bae6fd', '#ffffff'] },
      toxic_alchemy: { rings: ['#a855f7', '#4ade80'], cols: ['#a855f7', '#c084fc', '#4ade80', '#e9d5ff'], shape: 'venom', altShape: 'bubble', orbit: -6.8, stageKind: 'alchemical_siphon', stageCols: ['#a855f7', '#4ade80', '#e9d5ff'] },
      stamina_earth: { rings: ['#d97706', '#fde68a'], cols: ['#d97706', '#f59e0b', '#a8a29e', '#fde68a'], shape: 'stone', altShape: 'hexagon', orbit: -5.2, stageKind: 'tectonic_bastion', stageCols: ['#d97706', '#f59e0b', '#fde68a'] },
      swarm_resonance: { rings: ['#84cc16', '#fde047'], cols: ['#84cc16', '#a3e635', '#34d399', '#fde047'], shape: 'petal', altShape: 'wind', orbit: 9.8, stageKind: 'emerald_swarm', stageCols: ['#84cc16', '#34d399', '#fde047'] },
      corviknight_armor: { rings: ['#cbd5e1', '#38bdf8'], cols: ['#e2e8f0', '#94a3b8', '#67e8f9', '#ffffff'], shape: 'hexagon', altShape: 'crystal', orbit: -5.6, stageKind: 'mirror_bastion', stageCols: ['#e2e8f0', '#94a3b8', '#67e8f9'] },
      supreme_overlord: { rings: ['#a855f7', '#ef4444'], cols: ['#6366f1', '#a855f7', '#ef4444', '#fbbf24'], shape: 'sigil', altShape: 'slash', orbit: -7.4, stageKind: 'shogun_crest', stageCols: ['#ef4444', '#a855f7', '#fbbf24'] },
      pixilate_aura: { rings: ['#f472b6', '#fde047'], cols: ['#f472b6', '#f9a8d4', '#fde047', '#ffffff'], shape: 'star', altShape: 'heart', orbit: 6.6, stageKind: 'pixie_glimmer', stageCols: ['#f472b6', '#f9a8d4', '#fde047'] },
      disguise_veil: { rings: ['#818cf8', '#f472b6'], cols: ['#818cf8', '#c084fc', '#f472b6', '#e9d5ff'], shape: 'wisp', altShape: 'sigil', orbit: -6.0, stageKind: 'disguise_curtain', stageCols: ['#818cf8', '#c084fc', '#f472b6'] },
      tera_prism: { rings: ['#22d3ee', '#f472b6'], cols: ['#22d3ee', '#f472b6', '#fde047', '#ffffff'], shape: 'crystal', altShape: 'hexagon', orbit: 8.6, stageKind: 'terastal_crown', stageCols: ['#22d3ee', '#f472b6', '#fde047'] },
    };
    const fallbackByType = {
      grass: 'overgrow',
      fire: 'blaze',
      water: 'torrent',
      electric: 'storm_conduit',
      rock: 'diamond_guard',
      psychic: 'mystic_prism',
      ice: 'permafrost',
      ghost: 'shadow_cloak',
      dragon: 'dragon_heart',
      normal: 'starlight_grace',
      fighting: 'orichalcum_pulse',
      flying: 'gale_wings',
      poison: 'toxic_alchemy',
      ground: 'stamina_earth',
      bug: 'swarm_resonance',
      steel: 'corviknight_armor',
      dark: 'supreme_overlord',
      fairy: 'pixilate_aura',
    };
    const cfg = profiles[abilityId] || profiles[fallbackByType[abilityType]] || profiles.starlight_grace;

    this.abilityStageFx.push({
      kind: cfg.stageKind,
      abilityId,
      x: center.x,
      y: center.y,
      pedestalY: pedestal.y,
      tx: otherCenter.x,
      ty: otherCenter.y,
      side,
      colors: cfg.stageCols || cfg.cols,
      life: 0,
      maxLife: 0.56 * lifeScale,
      seed: Math.random() * Math.PI * 2,
    });

    cfg.rings.forEach((col, idx) => {
      this.particles.push({
        x: center.x,
        y: center.y,
        vx: 0,
        vy: 0,
        gravity: 0,
        life: -(idx * 0.045),
        maxLife: 0.44 * lifeScale,
        color: col,
        size: 14,
        maxRadius: 74 + idx * 22,
        lineWidth: 3.4 - idx * 0.6,
        shape: 'ring',
      });
    });

    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      const isBurst = i % 3 === 0;
      const pickedShape = i % 5 === 0 && cfg.shape !== 'heart'
        ? 'star'
        : i % 2 === 1 && cfg.altShape
          ? cfg.altShape
          : cfg.shape;
      const baseParticle = {
        x: center.x + Math.cos(angle) * (isBurst ? 12 : 48),
        y: center.y + Math.sin(angle) * (isBurst ? 12 : 36),
        vx: isBurst ? Math.cos(angle) * 82 : 0,
        vy: isBurst ? Math.sin(angle) * 82 - 22 : 0,
        gravity: cfg.shape === 'heart' || cfg.shape === 'ember' || cfg.shape === 'bubble' || cfg.shape === 'petal' ? -32 : 0,
        life: -(i * 0.012),
        maxLife: 0.56 * lifeScale,
        color: cfg.cols[i % cfg.cols.length],
        size: pickedShape === 'heart' || pickedShape === 'petal' ? 6.5 : pickedShape === 'gear' || pickedShape === 'sigil' ? 6.2 : 5 + (i % 2) * 2,
        rotation: angle,
        spin: 6.5,
        shape: pickedShape,
      };
      if (!isBurst) {
        baseParticle.orbitCenter = center;
        baseParticle.orbitAngle = angle;
        baseParticle.orbitRadius = 46 + (i % 2) * 12;
        baseParticle.orbitRadialVel = -22;
        baseParticle.orbitAngVel = cfg.orbit;
      }
      this.particles.push(baseParticle);
    }
  }

  async playAbilityVisual(side, abilityOrId, effectSummary = '', sessionId = this.sessionId) {
    const ability = resolveAbilityMeta(abilityOrId);
    if (!ability) return;
    if (this.active && !this.isSessionValid(sessionId)) return;

    const pace = this.getPaceConfig();
    const bannerMs = pace.sayHoldMs <= 280 ? 180 : pace.sayHoldMs <= 600 ? 320 : 440;
    const bannerEl = this.abilityBannerEl || this.ensureAbilityBannerEl();
    const spriteEl = side === 'enemy' ? this.enemySpriteEl : this.playerSpriteEl;
    const abilityType = ability.type || 'normal';
    const summaryText = String(effectSummary || '').trim();

    if (this.stageEl) {
      this.stageEl.dataset.abilityAura = abilityType;
    }

    if (bannerEl) {
      this.abilityBannerEl = bannerEl;
      bannerEl.innerHTML = '';
      const iconSpan = document.createElement('span');
      iconSpan.className = 'ability-banner-icon';
      iconSpan.textContent = ability.icon || '✨';
      const textSpan = document.createElement('span');
      textSpan.className = 'ability-banner-text';
      textSpan.textContent = summaryText ? `${ability.name} — ${summaryText}` : ability.name;
      bannerEl.append(iconSpan, ' ', textSpan);
      bannerEl.dataset.type = abilityType;
      bannerEl.dataset.side = side === 'enemy' ? 'enemy' : 'player';
      bannerEl.dataset.ability = ability.id;
      bannerEl.hidden = false;
    }

    spriteEl?.classList.remove('ability-pulse');
    if (spriteEl) {
      void spriteEl.offsetWidth;
      spriteEl.classList.add('ability-pulse');
    }

    this.audio?.playAbilityCue?.(ability.id, abilityType);
    this.spawnAbilityFX(side, ability.id, abilityType, pace);

    try {
      if (this.active) {
        await this.wait(bannerMs, sessionId);
      } else {
        await new Promise((r) => setTimeout(r, Math.min(80, bannerMs)));
      }
    } finally {
      if (!this.active || this.isSessionValid(sessionId)) {
        spriteEl?.classList.remove('ability-pulse');
      }
      if (this.stageEl && (!this.active || this.isSessionValid(sessionId))) {
        delete this.stageEl.dataset.abilityAura;
      }
      if (!this.active || this.isSessionValid(sessionId)) {
        this.hideAbilityBanner();
      }
    }
  }

  async triggerEntryAbility(side, mon, sid = this.sessionId) {
    if (!this.isSessionValid(sid) || this.abilitiesEnabled === false || !mon || mon.isFainted || mon.abilityEntryTriggered) {
      return null;
    }
    const entryRes = PokemonMod.evaluateEntryAbility?.(mon);
    if (!entryRes || entryRes.triggered === false) return null;

    mon.abilityEntryTriggered = true;
    const stat = entryRes.stat || entryRes.ability?.stat;
    const stages = Number.isFinite(Number(entryRes.stages ?? entryRes.ability?.stages))
      ? Number(entryRes.stages ?? entryRes.ability?.stages)
      : 1;
    if (stat && !entryRes.applied) {
      mon.applyStageBoost?.(stat, stages);
    }
    if (entryRes.grantShield) {
      mon.shieldTurns = Math.max(mon.shieldTurns || 0, Number(entryRes.shieldTurns) || 1);
    }

    this.renderStatusCards();
    this.storage.save?.();

    const statShort = { atk: 'ATK', def: 'DEF', spd: 'SPD' }[stat] || 'STAT';
    const summary = entryRes.summary || `${statShort} +${stages}!`;
    const center = this.getSpriteCenter(side);
    const floatText = entryRes.grantShield ? `${statShort} ▲ & 🛡️!` : `${statShort} ▲!`;
    this.spawnFloatingText(center.x, center.y - 26, floatText, entryRes.grantShield ? '#67e8f9' : '#fde047', 19, 0, 1.3);
    await this.playAbilityVisual(side, entryRes.ability || entryRes.abilityId, summary, sid);
    return entryRes;
  }

  async triggerTurnEndAbility(side, mon, sid = this.sessionId) {
    if (
      !this.isSessionValid(sid) ||
      this.abilitiesEnabled === false ||
      !mon ||
      mon.isFainted ||
      mon.hp <= 0
    ) {
      return null;
    }
    const turnEndRes = PokemonMod.evaluateTurnEndAbility?.(mon);
    if (!turnEndRes || turnEndRes.triggered === false) return null;

    const healAmt = Number(turnEndRes.heal);
    const canHeal = Number.isFinite(healAmt) && healAmt > 0 && mon.hp < mon.maxHp;
    const boostStat = turnEndRes.boostStat || null;
    const boostStages = Number.isFinite(Number(turnEndRes.boostStages)) && Number(turnEndRes.boostStages) > 0
      ? Number(turnEndRes.boostStages)
      : 1;

    if (!canHeal && !boostStat) return null;

    const pace = this.getPaceConfig();
    let gained = 0;
    if (canHeal) {
      gained = mon.healAmount(healAmt);
    }
    let boosted = false;
    if (boostStat) {
      const boostRes = mon.applyStageBoost?.(boostStat, boostStages);
      boosted = boostRes ? boostRes.changed !== false : true;
    }
    if (gained <= 0 && !boosted) return null;

    this.renderStatusCards();
    this.storage.save?.();

    if (gained > 0) {
      this.spawnImpactFX(side, 'heal', `+${gained} HP`, '#f9a8d4', {
        ring: true,
        ringColor: turnEndRes.abilityId === 'abyssal_current' ? '#2dd4bf' : '#f472b6',
        fontSize: 20,
        count: 14,
        lifeScale: pace.particleLifeScale,
      });
    }
    if (boosted && boostStat) {
      const statShort = { atk: 'ATK', def: 'DEF', spd: 'SPD' }[boostStat] || 'STAT';
      const center = this.getSpriteCenter(side);
      this.spawnFloatingText(
        center.x,
        center.y - (gained > 0 ? 44 : 26),
        `${statShort} ▲!`,
        '#fde047',
        19,
        0,
        1.3,
      );
    }

    const defaultSummary = gained > 0
      ? `+${gained} HP`
      : `${({ atk: 'ATK', def: 'DEF', spd: 'SPD' }[boostStat] || 'STAT')} +${boostStages}!`;
    const summary = turnEndRes.summary || defaultSummary;
    await this.playAbilityVisual(side, turnEndRes.ability || turnEndRes.abilityId, summary, sid);
    if (!this.isSessionValid(sid)) return turnEndRes;
    if (gained > 0) {
      await this.animateHpTo(side, mon.hp, pace.hpDrainMs);
    }
    return turnEndRes;
  }

  spawnChargeParticles(side, type, pace, move = null) {
    const center = this.getSpriteCenter(side);
    const typeColor = resolveTypeMeta(type).color;
    const lifeScale = pace?.particleLifeScale || 1.2;
    const moveId = move?.id || '';

    if (moveId === 'wild_volt' || moveId === 'thunder_fang') {
      const count = moveId === 'wild_volt' ? 12 : 8;
      if (moveId === 'wild_volt') {
        this.particles.push({
          x: center.x,
          y: center.y,
          vx: 0,
          vy: 0,
          gravity: 0,
          life: 0,
          maxLife: 0.28 * Math.min(1.3, lifeScale),
          color: '#fde047',
          size: 52,
          maxRadius: 12,
          shape: 'ring',
        });
      }
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
        const dist = 44 + Math.random() * 20;
        this.particles.push({
          x: center.x + Math.cos(angle) * dist,
          y: center.y + Math.sin(angle) * dist,
          vx: 0,
          vy: 0,
          gravity: 0,
          pullTo: center,
          life: 0,
          maxLife: 0.22 * Math.min(1.3, lifeScale),
          color: i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? '#38bdf8' : '#fde047',
          size: 4 + Math.random() * 2.5,
          rotation: angle,
          shape: i % 2 === 0 ? 'lightning' : 'bolt',
        });
      }
      return;
    }

    if (moveId === 'moonblast') {
      this.particles.push({
        x: center.x,
        y: center.y - 10,
        vx: 0,
        vy: 0,
        gravity: 0,
        life: 0,
        maxLife: 0.28 * Math.min(1.3, lifeScale),
        color: '#f472b6',
        size: 8,
        maxRadius: 48,
        shape: 'ring',
      });
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10;
        this.particles.push({
          x: center.x + Math.cos(angle) * 52,
          y: center.y + Math.sin(angle) * 44,
          orbitCenter: center,
          orbitAngle: angle,
          orbitRadius: 50,
          orbitRadialVel: -95,
          orbitAngVel: 7.5,
          life: 0,
          maxLife: 0.26 * Math.min(1.3, lifeScale),
          color: i % 2 === 0 ? '#f9a8d4' : '#c084fc',
          size: i % 3 === 0 ? 7.5 : 4.5,
          rotation: angle,
          spin: 5,
          shape: i % 3 === 0 ? 'crescent' : 'star',
        });
      }
      return;
    }

    if (moveId === 'calm_aura' || moveId === 'shadow_pulse') {
      const cols = moveId === 'calm_aura'
        ? ['#f472b6', '#c084fc', '#67e8f9', '#ffffff']
        : ['#a855f7', '#7e22ce', '#e9d5ff'];
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10;
        this.particles.push({
          x: center.x + Math.cos(angle) * 48,
          y: center.y + Math.sin(angle) * 38,
          orbitCenter: center,
          orbitAngle: angle,
          orbitRadius: 46,
          orbitRadialVel: -60,
          orbitAngVel: moveId === 'calm_aura' ? 4.8 : -7.2,
          life: 0,
          maxLife: 0.26 * Math.min(1.3, lifeScale),
          color: cols[i % cols.length],
          size: 4.5 + (i % 2) * 2,
          shape: moveId === 'calm_aura' ? 'star' : 'wisp',
        });
      }
      return;
    }

    if (moveId === 'iron_crush' || moveId === 'glacier_crash' || moveId === 'magma_cannon') {
      const cols = moveId === 'iron_crush'
        ? ['#ffffff', '#e2e8f0', '#94a3b8']
        : moveId === 'glacier_crash'
          ? ['#ffffff', '#67e8f9', '#bae6fd']
          : ['#fde047', '#fb923c', '#ef4444'];
      const pShape = moveId === 'iron_crush'
        ? 'star'
        : moveId === 'glacier_crash'
          ? 'crystal'
          : 'ember';
      if (moveId === 'iron_crush') {
        this.particles.push({
          x: center.x,
          y: center.y,
          vx: 0,
          vy: 0,
          gravity: 0,
          life: 0,
          maxLife: 0.22 * Math.min(1.3, lifeScale),
          color: '#ffffff',
          size: 10,
          maxRadius: 56,
          lineWidth: 4,
          shape: 'ring',
        });
      }
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.25;
        const dist = 42 + Math.random() * 16;
        this.particles.push({
          x: center.x + Math.cos(angle) * dist,
          y: center.y + Math.sin(angle) * dist,
          vx: 0,
          vy: 0,
          gravity: 0,
          pullTo: center,
          life: 0,
          maxLife: 0.24 * Math.min(1.3, lifeScale),
          color: cols[i % cols.length],
          size: 4.5 + Math.random() * 2.5,
          rotation: angle,
          spin: 8,
          shape: pShape,
        });
      }
      return;
    }

    const sprint5Charges = {
      leaf_blade: { cols: ['#22c55e', '#4ade80', '#bbf7d0', '#ffffff'], shape: 'leaf', ring: '#22c55e', orbit: false },
      eruption_flare: { cols: ['#fde047', '#fb923c', '#ef4444'], shape: 'ember', ring: '#f97316', orbit: false },
      aura_sphere: { cols: ['#38bdf8', '#6366f1', '#a5f3fc', '#ffffff'], shape: 'orb', ring: '#38bdf8', orbit: true, angVel: 7.5 },
      psycho_cut: { cols: ['#f472b6', '#e879f9', '#c084fc', '#ffffff'], shape: 'crescent', ring: '#f472b6', orbit: false },
      aqua_tail: { cols: ['#38bdf8', '#67e8f9', '#34d399', '#f472b6'], shape: 'bubble', ring: '#38bdf8', orbit: true, angVel: 6.2 },
      draco_meteor: { cols: ['#818cf8', '#fde047', '#c084fc', '#ffffff'], shape: 'star', ring: '#818cf8', orbit: false },
      omen_wind: { cols: ['#a855f7', '#67e8f9', '#c084fc', '#e0f2fe'], shape: 'crystal', ring: '#a855f7', orbit: true, angVel: -7.0 },
      doom_desire: { cols: ['#fde047', '#fef08a', '#38bdf8', '#ffffff'], shape: 'star', ring: '#fde047', orbit: true, angVel: 5.4 },
    };
    const s5 = sprint5Charges[moveId];
    if (s5) {
      this.particles.push({
        x: center.x,
        y: center.y,
        vx: 0,
        vy: 0,
        gravity: 0,
        life: 0,
        maxLife: 0.26 * Math.min(1.3, lifeScale),
        color: s5.ring,
        size: 10,
        maxRadius: 52,
        lineWidth: 3.2,
        shape: 'ring',
      });
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.2;
        const dist = 44 + Math.random() * 14;
        const particle = {
          x: center.x + Math.cos(angle) * dist,
          y: center.y + Math.sin(angle) * dist,
          vx: 0,
          vy: 0,
          gravity: 0,
          life: 0,
          maxLife: 0.26 * Math.min(1.3, lifeScale),
          color: s5.cols[i % s5.cols.length],
          size: s5.shape === 'crescent' ? 7 : 4.5 + Math.random() * 2.5,
          rotation: angle,
          spin: 7,
          shape: s5.shape,
        };
        if (s5.orbit) {
          particle.orbitCenter = center;
          particle.orbitAngle = angle;
          particle.orbitRadius = 48;
          particle.orbitRadialVel = -92;
          particle.orbitAngVel = s5.angVel;
        } else {
          particle.pullTo = center;
        }
        this.particles.push(particle);
      }
      return;
    }

    const sprint6Charges = {
      frenzy_flora: { cols: ['#22c55e', '#4ade80', '#fde047'], shape: 'leaf', ring: '#22c55e', secondaryRing: '#fde047', orbit: true, angVel: 7.4 },
      spore_burst: { cols: ['#2dd4bf', '#f472b6', '#a7f3d0'], shape: 'spore', ring: '#2dd4bf', secondaryRing: '#f472b6', orbit: true, angVel: -5.6 },
      solar_blade: { cols: ['#fde047', '#fb923c', '#ffffff'], shape: 'ember', ring: '#fde047', secondaryRing: '#f97316', orbit: false },
      fiery_dance: { cols: ['#ef4444', '#fb923c', '#fde047'], shape: 'ember', ring: '#ef4444', secondaryRing: '#fbbf24', orbit: true, angVel: 8.2 },
      hydro_vortex: { cols: ['#38bdf8', '#22d3ee', '#e0f2fe'], shape: 'bubble', ring: '#0ea5e9', secondaryRing: '#67e8f9', orbit: true, angVel: -8.8 },
      razor_shell: { cols: ['#22d3ee', '#fb7185', '#ffffff'], shape: 'star', ring: '#22d3ee', secondaryRing: '#fb7185', orbit: false },
      plasma_cannon: { cols: ['#22d3ee', '#fde047', '#ffffff'], shape: 'bolt', ring: '#22d3ee', secondaryRing: '#fde047', orbit: false, contractRing: true },
      volt_tackle: { cols: ['#fde047', '#ffffff', '#38bdf8'], shape: 'lightning', ring: '#fde047', secondaryRing: '#ffffff', orbit: true, angVel: 9.4 },
      sandstorm_crush: { cols: ['#f59e0b', '#d6a36b', '#fde68a'], shape: 'dust', ring: '#f59e0b', secondaryRing: '#b45309', orbit: true, angVel: 7.8 },
      prism_laser: { cols: ['#67e8f9', '#f472b6', '#fde047', '#a855f7'], shape: 'crystal', ring: '#f472b6', secondaryRing: '#67e8f9', orbit: true, angVel: 6.4 },
      zen_meteor: { cols: ['#f472b6', '#a855f7', '#e9d5ff'], shape: 'orb', ring: '#f472b6', secondaryRing: '#a855f7', orbit: true, angVel: 6.8 },
      icicle_spear: { cols: ['#67e8f9', '#bae6fd', '#ffffff'], shape: 'crystal', ring: '#67e8f9', secondaryRing: '#e0f2fe', orbit: true, angVel: -6.2 },
      spectral_lantern: { cols: ['#a855f7', '#2dd4bf', '#e9d5ff'], shape: 'wisp', ring: '#a855f7', secondaryRing: '#2dd4bf', orbit: true, angVel: -6.8 },
      night_daze: { cols: ['#9333ea', '#f43f5e', '#c084fc'], shape: 'crescent', ring: '#9333ea', secondaryRing: '#f43f5e', orbit: false, contractRing: true },
      dragon_rush: { cols: ['#6366f1', '#fde047', '#38bdf8'], shape: 'dragonflame', ring: '#6366f1', secondaryRing: '#fde047', orbit: false },
      dune_aegis: { cols: ['#fbbf24', '#d97706', '#fef3c7'], shape: 'stone', ring: '#fbbf24', secondaryRing: '#fef3c7', orbit: true, angVel: 5.4 },
    };
    const sprint7Charges = {
      thorn_barrage: { cols: ['#22c55e', '#f472b6', '#bbf7d0'], shape: 'petal', ring: '#22c55e', secondaryRing: '#f472b6', orbit: true, angVel: 7.2 },
      jungle_totem: { cols: ['#16a34a', '#fde047', '#4ade80'], shape: 'leaf', ring: '#16a34a', secondaryRing: '#fde047', orbit: true, angVel: 5.8 },
      inferno_overdrive: { cols: ['#ef4444', '#fb923c', '#fde047'], shape: 'ember', ring: '#ef4444', secondaryRing: '#fde047', orbit: true, angVel: 8.8 },
      blaze_kick: { cols: ['#fb923c', '#ef4444', '#fde047'], shape: 'ember', ring: '#fb923c', secondaryRing: '#fde047', orbit: false },
      abyssal_geyser: { cols: ['#06b6d4', '#38bdf8', '#cffafe'], shape: 'wave_arc', ring: '#06b6d4', secondaryRing: '#38bdf8', orbit: true, angVel: -7.8 },
      pearl_cascade: { cols: ['#a5f3fc', '#f9a8d4', '#ffffff'], shape: 'bubble', ring: '#a5f3fc', secondaryRing: '#f472b6', orbit: true, angVel: 6.4 },
      steppe_bolt: { cols: ['#fde047', '#f59e0b', '#ffffff'], shape: 'lightning', ring: '#fde047', secondaryRing: '#f59e0b', orbit: false },
      ion_tempest: { cols: ['#38bdf8', '#fde047', '#ffffff'], shape: 'lightning', ring: '#38bdf8', secondaryRing: '#fde047', orbit: false, contractRing: true },
      canyon_rend: { cols: ['#d97706', '#f59e0b', '#78716c'], shape: 'stone', ring: '#d97706', secondaryRing: '#fde047', orbit: false },
      amber_bastion: { cols: ['#f59e0b', '#fef3c7', '#fbbf24'], shape: 'hexagon', ring: '#f59e0b', secondaryRing: '#fef3c7', orbit: true, angVel: 5.2 },
      chrono_cannon: { cols: ['#fde047', '#c084fc', '#f59e0b'], shape: 'gear', ring: '#f59e0b', secondaryRing: '#c084fc', orbit: true, angVel: 6.2 },
      champion_strike: { cols: ['#fb7185', '#fde047', '#ffffff'], shape: 'wave_arc', ring: '#fb7185', secondaryRing: '#fde047', orbit: false },
      polar_lance: { cols: ['#67e8f9', '#e0f2fe', '#ffffff'], shape: 'lance', ring: '#67e8f9', secondaryRing: '#e0f2fe', orbit: true, angVel: -6.6 },
      relic_hex: { cols: ['#a855f7', '#f59e0b', '#e9d5ff'], shape: 'sigil', ring: '#a855f7', secondaryRing: '#f59e0b', orbit: true, angVel: -6.0 },
      rift_claw: { cols: ['#ec4899', '#6366f1', '#67e8f9'], shape: 'slash', ring: '#ec4899', secondaryRing: '#6366f1', orbit: false },
      cosmos_supernova: { cols: ['#f472b6', '#fde047', '#818cf8', '#ffffff'], shape: 'star', ring: '#f472b6', secondaryRing: '#fde047', orbit: false, contractRing: true },
    };
    const sprint8Charges = {
      close_combat: { cols: ['#ef4444', '#fb923c', '#fde047'], shape: 'wave_arc', ring: '#ef4444', secondaryRing: '#fbbf24', orbit: true, angVel: 9.2 },
      vacuum_wave: { cols: ['#f87171', '#e0f2fe', '#ffffff'], shape: 'wave_arc', ring: '#ef4444', secondaryRing: '#ffffff', orbit: false, contractRing: true },
      collision_course: { cols: ['#dc2626', '#fbbf24', '#ffffff'], shape: 'star', ring: '#dc2626', secondaryRing: '#fbbf24', orbit: false },
      brave_bird: { cols: ['#38bdf8', '#e0f2fe', '#ffffff'], shape: 'feather', ring: '#38bdf8', secondaryRing: '#ffffff', orbit: true, angVel: 8.8 },
      air_slash: { cols: ['#7dd3fc', '#bae6fd', '#ffffff'], shape: 'feather', ring: '#7dd3fc', secondaryRing: '#e0f2fe', orbit: false },
      tailwind_grace: { cols: ['#7dd3fc', '#e0f2fe', '#a7f3d0'], shape: 'feather', ring: '#7dd3fc', secondaryRing: '#ffffff', orbit: true, angVel: 6.4 },
      sludge_wave: { cols: ['#a855f7', '#4ade80', '#e9d5ff'], shape: 'venom', ring: '#a855f7', secondaryRing: '#4ade80', orbit: true, angVel: -6.8 },
      poison_jab: { cols: ['#a855f7', '#c084fc', '#4ade80'], shape: 'venom', ring: '#a855f7', secondaryRing: '#c084fc', orbit: false },
      malignant_chain: { cols: ['#c084fc', '#f43f5e', '#4ade80'], shape: 'sigil', ring: '#a855f7', secondaryRing: '#f43f5e', orbit: true, angVel: -7.2 },
      earthquake: { cols: ['#d97706', '#f59e0b', '#a8a29e'], shape: 'stone', ring: '#d97706', secondaryRing: '#fde68a', orbit: false },
      earth_power: { cols: ['#f59e0b', '#ef4444', '#fde68a'], shape: 'ember', ring: '#d97706', secondaryRing: '#ef4444', orbit: true, angVel: 6.0 },
      headlong_rush: { cols: ['#d97706', '#fbbf24', '#dc2626'], shape: 'stone', ring: '#b45309', secondaryRing: '#fbbf24', orbit: false },
      bug_buzz: { cols: ['#84cc16', '#34d399', '#fde047'], shape: 'wave_arc', ring: '#84cc16', secondaryRing: '#34d399', orbit: true, angVel: 8.6 },
      x_scissor: { cols: ['#84cc16', '#bef264', '#ffffff'], shape: 'slash', ring: '#84cc16', secondaryRing: '#bef264', orbit: false },
      quiver_step: { cols: ['#a3e635', '#f472b6', '#fde047'], shape: 'petal', ring: '#84cc16', secondaryRing: '#f472b6', orbit: true, angVel: 5.8 },
      flash_cannon: { cols: ['#e2e8f0', '#38bdf8', '#ffffff'], shape: 'crystal', ring: '#cbd5e1', secondaryRing: '#38bdf8', orbit: false, contractRing: true },
      gigaton_hammer: { cols: ['#f472b6', '#cbd5e1', '#ffffff'], shape: 'hexagon', ring: '#f472b6', secondaryRing: '#e2e8f0', orbit: false },
      king_shield: { cols: ['#fbbf24', '#cbd5e1', '#ef4444'], shape: 'hexagon', ring: '#fbbf24', secondaryRing: '#e2e8f0', orbit: true, angVel: 4.8 },
      dark_pulse: { cols: ['#7e22ce', '#6366f1', '#1e1b4b'], shape: 'crescent', ring: '#7e22ce', secondaryRing: '#c084fc', orbit: true, angVel: -7.4 },
      kowtow_cleave: { cols: ['#a855f7', '#ef4444', '#fbbf24'], shape: 'slash', ring: '#6366f1', secondaryRing: '#ef4444', orbit: false },
      lunar_shroud: { cols: ['#818cf8', '#c084fc', '#e9d5ff'], shape: 'crescent', ring: '#6366f1', secondaryRing: '#e9d5ff', orbit: true, angVel: -5.4 },
      dazzling_gleam: { cols: ['#f472b6', '#fde047', '#ffffff'], shape: 'star', ring: '#f472b6', secondaryRing: '#fde047', orbit: false, contractRing: true },
      play_rough: { cols: ['#f472b6', '#f9a8d4', '#fde047'], shape: 'heart', ring: '#f472b6', secondaryRing: '#f9a8d4', orbit: true, angVel: 7.4 },
      geomancy_bloom: { cols: ['#f472b6', '#38bdf8', '#fde047', '#4ade80'], shape: 'petal', ring: '#f472b6', secondaryRing: '#fde047', orbit: true, angVel: 6.2 },
      water_shuriken: { cols: ['#38bdf8', '#bae6fd', '#ffffff'], shape: 'shuriken', ring: '#38bdf8', secondaryRing: '#e0f2fe', orbit: true, angVel: 11.2 },
      dragon_darts: { cols: ['#6366f1', '#22d3ee', '#f43f5e'], shape: 'lance', ring: '#6366f1', secondaryRing: '#22d3ee', orbit: false },
      bitter_blade: { cols: ['#ef4444', '#a855f7', '#fde047'], shape: 'ember', ring: '#dc2626', secondaryRing: '#a855f7', orbit: false },
      electro_drift: { cols: ['#22d3ee', '#a855f7', '#fde047'], shape: 'lightning', ring: '#22d3ee', secondaryRing: '#a855f7', orbit: false, contractRing: true },
    };
    const s6 = sprint6Charges[moveId] || sprint7Charges[moveId] || sprint8Charges[moveId];
    if (s6) {
      this.particles.push({
        x: center.x,
        y: center.y,
        vx: 0,
        vy: 0,
        gravity: 0,
        life: 0,
        maxLife: 0.28 * Math.min(1.3, lifeScale),
        color: s6.ring,
        size: s6.contractRing ? 56 : 10,
        maxRadius: s6.contractRing ? 10 : 54,
        lineWidth: 3.4,
        shape: 'ring',
      });
      this.particles.push({
        x: center.x,
        y: center.y,
        vx: 0,
        vy: 0,
        gravity: 0,
        life: -0.05,
        maxLife: 0.26 * Math.min(1.3, lifeScale),
        color: s6.secondaryRing,
        size: s6.contractRing ? 40 : 14,
        maxRadius: s6.contractRing ? 6 : 68,
        lineWidth: 2.4,
        shape: 'ring',
      });
      const count = 12;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
        const dist = 46 + Math.random() * 14;
        const particle = {
          x: center.x + Math.cos(angle) * dist,
          y: center.y + Math.sin(angle) * dist,
          vx: 0,
          vy: 0,
          gravity: 0,
          life: 0,
          maxLife: 0.27 * Math.min(1.3, lifeScale),
          color: s6.cols[i % s6.cols.length],
          size: s6.shape === 'crescent' ? 7 : 4.8 + Math.random() * 2.5,
          rotation: angle,
          spin: 7.5,
          shape: s6.shape,
        };
        if (s6.orbit) {
          particle.orbitCenter = center;
          particle.orbitAngle = angle;
          particle.orbitRadius = 50;
          particle.orbitRadialVel = moveId === 'dune_aegis' || moveId === 'amber_bastion' ? -40 : -92;
          particle.orbitAngVel = s6.angVel;
        } else {
          particle.pullTo = center;
        }
        this.particles.push(particle);
      }
      return;
    }

    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.3;
      const dist = 42 + Math.random() * 18;
      this.particles.push({
        x: center.x + Math.cos(angle) * dist,
        y: center.y + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        gravity: 0,
        pullTo: center,
        life: 0,
        maxLife: 0.24 * Math.min(1.3, lifeScale),
        color: i % 2 === 0 ? '#ffffff' : typeColor,
        size: 3.5 + Math.random() * 2.5,
        shape: 'star',
      });
    }
  }

  spawnImpactDust(point, count = 10, lifeScale = 1.0) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 45 + Math.random() * 95;
      this.particles.push({
        x: point.x + (Math.random() - 0.5) * 26,
        y: point.y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.45 - 24,
        gravity: 25,
        life: 0,
        maxLife: (0.36 + Math.random() * 0.22) * lifeScale,
        color: i % 2 === 0 ? '#e2e8f0' : '#cbd5e1',
        size: 5 + Math.random() * 5,
        shape: 'dust',
      });
    }
  }

  spawnImpactFX(side, type, labelText = '', labelColor = '#ffffff', options = {}) {
    const pace = this.getPaceConfig();
    const lifeScale = options.lifeScale ?? pace.particleLifeScale ?? 1.2;
    const center = this.getSpriteCenter(side);
    const pedestal = this.getPedestalPoint(side);
    const typesMap = getTypesMap();
    const fxColors = {
      heal: '#4ade80',
      buff: '#fde047',
      shield: '#67e8f9',
    };
    const typeColor = fxColors[type] || (typesMap[type]?.color || resolveTypeMeta(type).color);
    const count = options.count || 22;
    const moveId = options.moveId || '';

    if (options.ring) {
      const baseRadius = options.ringRadius || 78;
      this.particles.push({
        x: center.x,
        y: center.y,
        vx: 0,
        vy: 0,
        gravity: 0,
        life: 0,
        maxLife: 0.34 * Math.min(1.4, lifeScale),
        color: options.ringColor || typeColor,
        size: 14,
        maxRadius: baseRadius,
        shape: 'ring',
      });
      this.particles.push({
        x: center.x,
        y: center.y,
        vx: 0,
        vy: 0,
        gravity: 0,
        life: -0.055,
        maxLife: 0.42 * Math.min(1.4, lifeScale),
        color: options.secondaryRingColor || '#ffffff',
        size: 18,
        maxRadius: Math.round(baseRadius * 1.32),
        shape: 'ring',
      });
    }

    if (options.dust) {
      this.spawnImpactDust(pedestal, 12, lifeScale);
    }

    const shapeMap = {
      fire: 'ember',
      water: 'bubble',
      grass: 'leaf',
      electric: 'bolt',
      psychic: 'star',
      ice: 'crystal',
      ghost: 'wisp',
      dragon: 'dragonflame',
      fighting: 'wave_arc',
      flying: 'feather',
      poison: 'venom',
      ground: 'stone',
      bug: 'petal',
      steel: 'hexagon',
      dark: 'crescent',
      fairy: 'star',
      heal: 'star',
      buff: 'star',
      shield: 'crystal',
      star: 'star',
      wind: 'wind',
      slash: 'slash',
      note: 'note',
    };
    const shape = options.shapeOverride || shapeMap[type] || 'circle';

    if (options.slash) {
      const slashAngles = moveId === 'thunder_fang'
        ? [-0.85, 0.85, -0.45, 0.45, 0.05]
        : moveId === 'leaf_blade' || moveId === 'x_scissor'
          ? [-0.785, 0.785, -0.785, 0.785]
          : moveId === 'psycho_cut'
            ? [-0.65, 0.65, -0.25, 0.25]
            : moveId === 'kowtow_cleave'
              ? [-0.95, 0.18, -0.55]
              : moveId === 'bitter_blade'
                ? [-0.75, 0.75, 0]
                : [-0.65, 0.65, -0.35, 0.45];
      slashAngles.forEach((ang, idx) => {
        this.particles.push({
          x: center.x + (Math.random() - 0.5) * (moveId === 'leaf_blade' ? 12 : 18),
          y: center.y + (Math.random() - 0.5) * (moveId === 'leaf_blade' ? 12 : 18),
          vx: Math.cos(ang) * (moveId === 'leaf_blade' ? 58 : 42),
          vy: Math.sin(ang) * (moveId === 'leaf_blade' ? 58 : 42),
          gravity: 0,
          life: -(idx * 0.022),
          maxLife: (moveId === 'leaf_blade' ? 0.28 : 0.24) * Math.min(1.4, lifeScale),
          color: idx % 2 === 0 ? (options.slashColor || typeColor) : '#ffffff',
          size: (moveId === 'leaf_blade' ? 18 : 14) + Math.random() * 5,
          rotation: ang,
          spin: 0,
          shape: 'slash',
        });
      });
    }

    if (options.extraDust) {
      this.spawnImpactDust(pedestal, 10, lifeScale);
    }

    // Move-specific signature impact spectacles for Sprint 4 moves
    if (moveId === 'thunder_fang') {
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI * 2 * i) / 6;
        this.particles.push({
          x: center.x + Math.cos(ang) * 14,
          y: center.y + Math.sin(ang) * 14,
          vx: Math.cos(ang) * 95,
          vy: Math.sin(ang) * 95,
          gravity: 0,
          life: -(i * 0.015),
          maxLife: 0.28 * Math.min(1.4, lifeScale),
          color: i % 2 === 0 ? '#fde047' : '#38bdf8',
          size: 9 + Math.random() * 4,
          rotation: ang + 0.4,
          shape: 'lightning',
        });
      }
    } else if (moveId === 'wild_volt') {
      for (let i = 0; i < 8; i++) {
        const ox = (i - 3.5) * 16 + (Math.random() - 0.5) * 8;
        this.particles.push({
          x: center.x + ox,
          y: center.y - 68,
          vx: (Math.random() - 0.5) * 28,
          vy: 230 + Math.random() * 90,
          gravity: 0,
          life: -(i * 0.022),
          maxLife: 0.32 * Math.min(1.4, lifeScale),
          color: i % 3 === 0 ? '#ffffff' : '#fde047',
          size: 12 + Math.random() * 5,
          rotation: (Math.random() - 0.5) * 0.35,
          shape: 'lightning',
        });
      }
    } else if (moveId === 'moonblast') {
      const moonCols = ['#f472b6', '#e879f9', '#c084fc', '#fef08a', '#ffffff'];
      for (let i = 0; i < 10; i++) {
        const ang = (Math.PI * 2 * i) / 10;
        const speed = 75 + Math.random() * 115;
        this.particles.push({
          x: center.x,
          y: center.y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed - 18,
          gravity: 10,
          life: -(i * 0.014),
          maxLife: (0.48 + Math.random() * 0.22) * lifeScale,
          color: moonCols[i % moonCols.length],
          size: 7 + Math.random() * 4,
          rotation: ang,
          spin: 5,
          shape: 'crescent',
        });
      }
    } else if (moveId === 'calm_aura') {
      const orbCols = ['#f472b6', '#c084fc', '#67e8f9', '#ffffff'];
      [68, 92, 114].forEach((rad, idx) => {
        this.particles.push({
          x: center.x,
          y: center.y,
          vx: 0,
          vy: 0,
          gravity: 0,
          life: -(idx * 0.06),
          maxLife: 0.55 * Math.min(1.4, lifeScale),
          color: orbCols[idx % orbCols.length],
          size: 18,
          maxRadius: rad,
          lineWidth: 2.8,
          shape: 'ring',
        });
      });
      for (let i = 0; i < 12; i++) {
        const ang = (Math.PI * 2 * i) / 12;
        this.particles.push({
          x: center.x + Math.cos(ang) * 54,
          y: center.y + Math.sin(ang) * 38,
          orbitCenter: center,
          orbitAngle: ang,
          orbitRadius: 52 + (i % 2) * 14,
          orbitRadialVel: -4,
          orbitAngVel: i % 2 === 0 ? 3.8 : -3.4,
          life: -(i * 0.02),
          maxLife: 0.92 * Math.min(1.3, lifeScale),
          color: orbCols[i % orbCols.length],
          size: i % 2 === 0 ? 5 : 4,
          rotation: ang,
          spin: 4,
          shape: i % 3 === 0 ? 'crystal' : 'star',
        });
      }
    } else if (moveId === 'shadow_pulse') {
      ['#a855f7', '#c084fc', '#e9d5ff'].forEach((col, idx) => {
        this.particles.push({
          x: center.x,
          y: center.y,
          vx: 0,
          vy: 0,
          gravity: 0,
          life: -(idx * 0.06),
          maxLife: 0.46 * Math.min(1.4, lifeScale),
          color: col,
          size: 16,
          maxRadius: 72 + idx * 28,
          lineWidth: 3.4,
          shape: 'ring',
        });
      });
    } else if (moveId === 'iron_crush') {
      this.particles.push({
        x: pedestal.x,
        y: pedestal.y,
        vx: 0,
        vy: 0,
        gravity: 0,
        life: -0.03,
        maxLife: 0.38 * Math.min(1.4, lifeScale),
        color: '#d6a36b',
        size: 16,
        maxRadius: 110,
        lineWidth: 4.5,
        shape: 'ring',
      });
      for (let i = 0; i < 12; i++) {
        const ang = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.3;
        const speed = 75 + Math.random() * 120;
        this.particles.push({
          x: center.x + (Math.random() - 0.5) * 20,
          y: center.y + (Math.random() - 0.5) * 16,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed - 65,
          gravity: 320,
          life: 0,
          maxLife: (0.48 + Math.random() * 0.25) * lifeScale,
          color: i % 3 === 0 ? '#cbd5e1' : i % 2 === 0 ? '#94a3b8' : '#64748b',
          size: 5 + Math.random() * 4,
          rotation: ang,
          spin: (Math.random() - 0.5) * 12,
          shape: 'stone',
        });
      }
    } else if (moveId === 'glacier_crash') {
      for (let i = 0; i < 12; i++) {
        const ang = (Math.PI * 2 * i) / 12 + Math.random() * 0.2;
        const speed = 95 + Math.random() * 145;
        this.particles.push({
          x: center.x + (Math.random() - 0.5) * 20,
          y: center.y + (Math.random() - 0.5) * 20,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed - 50,
          gravity: 165,
          life: 0,
          maxLife: (0.5 + Math.random() * 0.25) * lifeScale,
          color: i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? '#bae6fd' : '#67e8f9',
          size: 6 + Math.random() * 4,
          rotation: ang,
          spin: (Math.random() - 0.5) * 12,
          shape: 'crystal',
        });
      }
    } else if (moveId === 'magma_cannon') {
      const lavaCols = ['#fde047', '#fb923c', '#ef4444', '#dc2626'];
      for (let i = 0; i < 18; i++) {
        const spreadVx = (Math.random() - 0.5) * 210;
        const upVy = -(130 + Math.random() * 150);
        this.particles.push({
          x: center.x + (Math.random() - 0.5) * 26,
          y: center.y + 8,
          vx: spreadVx,
          vy: upVy,
          gravity: 270,
          life: -(i * 0.012),
          maxLife: (0.55 + Math.random() * 0.28) * lifeScale,
          color: lavaCols[i % lavaCols.length],
          size: 5.5 + Math.random() * 4.5,
          shape: 'ember',
        });
      }
    } else if (moveId === 'leaf_blade') {
      const leafCols = ['#22c55e', '#4ade80', '#10b981', '#bbf7d0'];
      for (let i = 0; i < 14; i++) {
        const ang = (Math.PI * 2 * i) / 14 + Math.random() * 0.25;
        const spd = 95 + Math.random() * 130;
        this.particles.push({
          x: center.x,
          y: center.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 20,
          gravity: 50,
          life: -(i * 0.01),
          maxLife: (0.48 + Math.random() * 0.22) * lifeScale,
          color: leafCols[i % leafCols.length],
          size: 7.5 + Math.random() * 3.5,
          rotation: ang,
          spin: (Math.random() - 0.5) * 14,
          shape: 'leaf',
        });
      }
    } else if (moveId === 'eruption_flare') {
      const lavaCols = ['#fef08a', '#fb923c', '#ef4444', '#b91c1c'];
      for (let i = 0; i < 20; i++) {
        this.particles.push({
          x: pedestal.x + (Math.random() - 0.5) * 44,
          y: pedestal.y - 4,
          vx: (Math.random() - 0.5) * 200,
          vy: -(165 + Math.random() * 155),
          gravity: 310,
          life: -(i * 0.014),
          maxLife: (0.56 + Math.random() * 0.28) * lifeScale,
          color: lavaCols[i % lavaCols.length],
          size: 6 + Math.random() * 4.5,
          shape: 'ember',
        });
      }
    } else if (moveId === 'aura_sphere') {
      ['#38bdf8', '#6366f1', '#ffffff'].forEach((col, idx) => {
        this.particles.push({
          x: center.x,
          y: center.y,
          vx: 0,
          vy: 0,
          gravity: 0,
          life: -(idx * 0.05),
          maxLife: 0.44 * Math.min(1.4, lifeScale),
          color: col,
          size: 16,
          maxRadius: 72 + idx * 24,
          lineWidth: 3.8,
          shape: 'ring',
        });
      });
      for (let i = 0; i < 14; i++) {
        const ang = (Math.PI * 2 * i) / 14;
        const spd = 110 + Math.random() * 110;
        this.particles.push({
          x: center.x,
          y: center.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          gravity: 0,
          life: 0,
          maxLife: 0.45 * lifeScale,
          color: i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? '#38bdf8' : '#818cf8',
          size: i % 3 === 0 ? 7 : 5,
          rotation: ang,
          spin: 8,
          shape: i % 3 === 0 ? 'orb' : 'star',
        });
      }
    } else if (moveId === 'psycho_cut') {
      const cutCols = ['#f472b6', '#e879f9', '#c084fc', '#ffffff'];
      [-0.7, 0.7].forEach((ang, idx) => {
        this.particles.push({
          x: center.x + (idx === 0 ? -10 : 10),
          y: center.y,
          vx: Math.cos(ang) * 70,
          vy: Math.sin(ang) * 70,
          gravity: 0,
          life: -(idx * 0.03),
          maxLife: 0.34 * Math.min(1.4, lifeScale),
          color: cutCols[idx],
          size: 16,
          rotation: ang,
          spin: idx === 0 ? 6 : -6,
          shape: 'crescent',
        });
      });
    } else if (moveId === 'aqua_tail') {
      const prismCols = ['#38bdf8', '#67e8f9', '#34d399', '#c084fc', '#f472b6'];
      for (let i = 0; i < 14; i++) {
        const ang = (Math.PI * 2 * i) / 14;
        const spd = 90 + Math.random() * 125;
        this.particles.push({
          x: center.x,
          y: center.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 36,
          gravity: -40,
          life: -(i * 0.01),
          maxLife: (0.48 + Math.random() * 0.2) * lifeScale,
          color: prismCols[i % prismCols.length],
          size: 5 + Math.random() * 4,
          rotation: ang,
          spin: 7,
          shape: i % 3 === 0 ? 'star' : 'bubble',
        });
      }
    } else if (moveId === 'draco_meteor') {
      this.particles.push({
        x: pedestal.x,
        y: pedestal.y,
        vx: 0,
        vy: 0,
        gravity: 0,
        life: -0.02,
        maxLife: 0.42 * Math.min(1.4, lifeScale),
        color: '#818cf8',
        size: 18,
        maxRadius: 118,
        lineWidth: 4.5,
        shape: 'ring',
      });
      for (let i = 0; i < 12; i++) {
        const ang = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.25;
        const spd = 90 + Math.random() * 145;
        this.particles.push({
          x: center.x + (Math.random() - 0.5) * 24,
          y: center.y + 6,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 75,
          gravity: 310,
          life: 0,
          maxLife: (0.5 + Math.random() * 0.25) * lifeScale,
          color: i % 2 === 0 ? '#94a3b8' : '#6366f1',
          size: 5 + Math.random() * 4,
          rotation: ang,
          spin: (Math.random() - 0.5) * 12,
          shape: 'stone',
        });
      }
    } else if (moveId === 'omen_wind') {
      const omenCols = ['#a855f7', '#67e8f9', '#c084fc', '#e0f2fe'];
      for (let i = 0; i < 14; i++) {
        const ang = (Math.PI * 2 * i) / 14;
        this.particles.push({
          x: center.x + Math.cos(ang) * 42,
          y: center.y + Math.sin(ang) * 32,
          orbitCenter: center,
          orbitAngle: ang,
          orbitRadius: 40 + (i % 3) * 12,
          orbitRadialVel: 28,
          orbitAngVel: i % 2 === 0 ? 8.5 : -7.5,
          life: -(i * 0.014),
          maxLife: 0.62 * Math.min(1.3, lifeScale),
          color: omenCols[i % omenCols.length],
          size: i % 3 === 0 ? 7.5 : 5.5,
          rotation: ang,
          spin: 8,
          shape: i % 3 === 0 ? 'wind' : i % 2 === 0 ? 'crystal' : 'wisp',
        });
      }
    } else if (moveId === 'doom_desire') {
      this.particles.push({
        x: center.x,
        y: center.y,
        vx: 0,
        vy: 0,
        gravity: 0,
        life: 0,
        maxLife: 0.36 * Math.min(1.4, lifeScale),
        color: '#fde047',
        size: 36,
        shape: 'beam',
      });
      for (let i = 0; i < 14; i++) {
        const ang = (Math.PI * 2 * i) / 14;
        const spd = 105 + Math.random() * 145;
        this.particles.push({
          x: center.x,
          y: center.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 32,
          gravity: 80,
          life: 0,
          maxLife: (0.55 + Math.random() * 0.25) * lifeScale,
          color: i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? '#fde047' : '#38bdf8',
          size: 5.5 + Math.random() * 4,
          rotation: ang,
          spin: 9,
          shape: 'star',
        });
      }
    } else {
      if (!this._spawnSprint8Impact(moveId, center, pedestal, lifeScale)
        && !this._spawnSprint7Impact(moveId, center, pedestal, lifeScale)) {
        this._spawnSprint6Impact(moveId, center, pedestal, lifeScale);
      }
    }

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.35;
      const speed = 75 + Math.random() * 155;
      const isBuoyant = shape === 'ember' || shape === 'bubble' || shape === 'wisp' || shape === 'dragonflame' || shape === 'note' || shape === 'spore' || shape === 'petal' || shape === 'wave_arc' || shape === 'feather';
      let pShape = shape;
      let pColor = i % 3 === 0 ? '#ffffff' : typeColor;
      if (options.aurora) {
        const auroraCols = ['#67e8f9', '#a7f3d0', '#f472b6', '#ffffff'];
        pColor = auroraCols[i % auroraCols.length];
        if (i % 3 === 0) pShape = 'star';
      } else if (options.petalColors) {
        const petalCols = ['#22c55e', '#4ade80', '#f9a8d4', '#fbcfe8'];
        pColor = petalCols[i % petalCols.length];
      } else if (options.extraNotes && i % 2 === 0) {
        pShape = 'note';
        const noteCols = ['#fde047', '#f472b6', '#38bdf8', '#ffffff'];
        pColor = noteCols[i % noteCols.length];
      } else {
        const moveOverrides = {
          moonblast: { cols: ['#f472b6', '#e879f9', '#c084fc', '#ffffff'], shapes: ['star', 'star', 'wisp'] },
          calm_aura: { cols: ['#fbcfe8', '#e9d5ff', '#a5f3fc', '#ffffff'], shapes: ['star'] },
          shadow_pulse: { cols: ['#a855f7', '#7e22ce', '#c084fc', '#e9d5ff'], shapes: ['wisp'] },
          leaf_blade: { cols: ['#22c55e', '#4ade80', '#bbf7d0', '#ffffff'], shapes: ['leaf', 'star'] },
          aura_sphere: { cols: ['#38bdf8', '#6366f1', '#a5f3fc', '#ffffff'], shapes: ['star', 'star', 'wisp'] },
          psycho_cut: { cols: ['#f472b6', '#e879f9', '#c084fc', '#ffffff'], shapes: ['star', 'star', 'crescent'] },
          aqua_tail: { cols: ['#38bdf8', '#67e8f9', '#34d399', '#f472b6'], shapes: ['bubble', 'star'] },
          draco_meteor: { cols: ['#fde047', '#818cf8', '#c084fc', '#f472b6'], shapes: ['dragonflame', 'star'] },
          omen_wind: { cols: ['#a855f7', '#67e8f9', '#c084fc', '#e0f2fe'], shapes: ['wisp', 'wisp', 'crystal'] },
          doom_desire: { cols: ['#fde047', '#fef08a', '#38bdf8', '#ffffff'], shapes: ['star'] },
          frenzy_flora: { cols: ['#22c55e', '#4ade80', '#fde047', '#bbf7d0'], shapes: ['leaf', 'star'] },
          spore_burst: { cols: ['#2dd4bf', '#f472b6', '#a7f3d0', '#f9a8d4'], shapes: ['spore', 'star'] },
          solar_blade: { cols: ['#fde047', '#fb923c', '#ef4444', '#ffffff'], shapes: ['ember', 'star'] },
          fiery_dance: { cols: ['#ef4444', '#fb923c', '#fde047', '#ffffff'], shapes: ['ember', 'star'] },
          hydro_vortex: { cols: ['#38bdf8', '#22d3ee', '#e0f2fe', '#0284c7'], shapes: ['bubble'] },
          razor_shell: { cols: ['#22d3ee', '#fb7185', '#e0f2fe', '#ffffff'], shapes: ['bubble', 'star'] },
          plasma_cannon: { cols: ['#22d3ee', '#fde047', '#ffffff', '#38bdf8'], shapes: ['lightning', 'star'] },
          volt_tackle: { cols: ['#fde047', '#ffffff', '#38bdf8', '#facc15'], shapes: ['lightning', 'star'] },
          sandstorm_crush: { cols: ['#f59e0b', '#d6a36b', '#fde68a', '#b45309'], shapes: ['dust', 'stone'] },
          prism_laser: { cols: ['#ef4444', '#fde047', '#22c55e', '#38bdf8', '#a855f7', '#f472b6'], shapes: ['crystal', 'star'] },
          zen_meteor: { cols: ['#f472b6', '#a855f7', '#67e8f9', '#ffffff'], shapes: ['star', 'orb'] },
          icicle_spear: { cols: ['#67e8f9', '#bae6fd', '#ffffff', '#38bdf8'], shapes: ['crystal'] },
          spectral_lantern: { cols: ['#a855f7', '#2dd4bf', '#c084fc', '#e9d5ff'], shapes: ['wisp', 'spore'] },
          night_daze: { cols: ['#9333ea', '#f43f5e', '#c084fc', '#fde047'], shapes: ['crescent', 'star'] },
          dragon_rush: { cols: ['#6366f1', '#fde047', '#38bdf8', '#ffffff'], shapes: ['dragonflame', 'star'] },
          dune_aegis: { cols: ['#fbbf24', '#d97706', '#fef3c7', '#67e8f9'], shapes: ['crystal', 'dust'] },
          thorn_barrage: { cols: ['#22c55e', '#f472b6', '#bbf7d0', '#ffffff'], shapes: ['petal', 'leaf'] },
          jungle_totem: { cols: ['#16a34a', '#fde047', '#4ade80', '#ffffff'], shapes: ['leaf', 'sigil'] },
          inferno_overdrive: { cols: ['#ef4444', '#fb923c', '#fde047', '#ffffff'], shapes: ['ember', 'wave_arc'] },
          blaze_kick: { cols: ['#fb923c', '#ef4444', '#fde047', '#ffffff'], shapes: ['ember', 'star'] },
          abyssal_geyser: { cols: ['#06b6d4', '#38bdf8', '#cffafe', '#ffffff'], shapes: ['wave_arc', 'bubble'] },
          pearl_cascade: { cols: ['#a5f3fc', '#f9a8d4', '#ffffff', '#38bdf8'], shapes: ['bubble', 'star'] },
          steppe_bolt: { cols: ['#fde047', '#f59e0b', '#ffffff', '#38bdf8'], shapes: ['lightning', 'star'] },
          ion_tempest: { cols: ['#38bdf8', '#fde047', '#ffffff', '#22d3ee'], shapes: ['lightning', 'bolt'] },
          canyon_rend: { cols: ['#d97706', '#f59e0b', '#78716c', '#fde68a'], shapes: ['stone', 'dust'] },
          amber_bastion: { cols: ['#f59e0b', '#fef3c7', '#fbbf24', '#ffffff'], shapes: ['hexagon', 'sigil'] },
          chrono_cannon: { cols: ['#fde047', '#f59e0b', '#c084fc', '#ffffff'], shapes: ['gear', 'star'] },
          champion_strike: { cols: ['#fb7185', '#fde047', '#ffffff'], shapes: ['wave_arc', 'star'] },
          polar_lance: { cols: ['#67e8f9', '#e0f2fe', '#ffffff', '#38bdf8'], shapes: ['hexagon', 'crystal'] },
          relic_hex: { cols: ['#a855f7', '#f59e0b', '#e9d5ff', '#fde047'], shapes: ['sigil', 'wisp'] },
          rift_claw: { cols: ['#ec4899', '#6366f1', '#67e8f9', '#ffffff'], shapes: ['sigil', 'dragonflame'] },
          cosmos_supernova: { cols: ['#f472b6', '#fde047', '#818cf8', '#ffffff'], shapes: ['star', 'dragonflame'] },
          close_combat: { cols: ['#ef4444', '#fb923c', '#fde047', '#ffffff'], shapes: ['wave_arc', 'star'] },
          vacuum_wave: { cols: ['#f87171', '#bae6fd', '#ffffff', '#ef4444'], shapes: ['wave_arc', 'wind'] },
          collision_course: { cols: ['#dc2626', '#fbbf24', '#fb7185', '#ffffff'], shapes: ['star', 'wave_arc'] },
          brave_bird: { cols: ['#38bdf8', '#e0f2fe', '#ffffff', '#7dd3fc'], shapes: ['feather', 'wind'] },
          air_slash: { cols: ['#7dd3fc', '#bae6fd', '#ffffff', '#38bdf8'], shapes: ['wind', 'feather'] },
          tailwind_grace: { cols: ['#7dd3fc', '#e0f2fe', '#a7f3d0', '#ffffff'], shapes: ['feather', 'wind'] },
          sludge_wave: { cols: ['#a855f7', '#4ade80', '#c084fc', '#e9d5ff'], shapes: ['venom', 'bubble'] },
          poison_jab: { cols: ['#a855f7', '#c084fc', '#4ade80', '#e9d5ff'], shapes: ['venom', 'star'] },
          malignant_chain: { cols: ['#a855f7', '#f43f5e', '#4ade80', '#e9d5ff'], shapes: ['sigil', 'venom'] },
          earthquake: { cols: ['#d97706', '#f59e0b', '#a8a29e', '#fde68a'], shapes: ['stone', 'dust'] },
          earth_power: { cols: ['#f59e0b', '#ef4444', '#fde68a', '#b45309'], shapes: ['ember', 'stone'] },
          headlong_rush: { cols: ['#b45309', '#f59e0b', '#ef4444', '#fde68a'], shapes: ['stone', 'dust'] },
          bug_buzz: { cols: ['#84cc16', '#34d399', '#fde047', '#ffffff'], shapes: ['wave_arc', 'note'] },
          x_scissor: { cols: ['#84cc16', '#bef264', '#34d399', '#ffffff'], shapes: ['slash', 'wave_arc'] },
          quiver_step: { cols: ['#a3e635', '#f472b6', '#fde047', '#ffffff'], shapes: ['petal', 'star'] },
          flash_cannon: { cols: ['#e2e8f0', '#38bdf8', '#94a3b8', '#ffffff'], shapes: ['ray', 'crystal'] },
          gigaton_hammer: { cols: ['#f472b6', '#e2e8f0', '#94a3b8', '#ffffff'], shapes: ['hexagon', 'star'] },
          king_shield: { cols: ['#fbbf24', '#e2e8f0', '#ef4444', '#ffffff'], shapes: ['hexagon', 'crystal'] },
          dark_pulse: { cols: ['#7e22ce', '#6366f1', '#c084fc', '#1e1b4b'], shapes: ['crescent', 'sigil'] },
          kowtow_cleave: { cols: ['#6366f1', '#ef4444', '#fbbf24', '#e9d5ff'], shapes: ['slash', 'crescent'] },
          lunar_shroud: { cols: ['#818cf8', '#c084fc', '#e9d5ff', '#ffffff'], shapes: ['crescent', 'wisp'] },
          dazzling_gleam: { cols: ['#f472b6', '#fde047', '#a855f7', '#ffffff'], shapes: ['star', 'crystal'] },
          play_rough: { cols: ['#f472b6', '#f9a8d4', '#fde047', '#ffffff'], shapes: ['heart', 'dust'] },
          geomancy_bloom: { cols: ['#f472b6', '#38bdf8', '#fde047', '#4ade80'], shapes: ['petal', 'star'] },
          water_shuriken: { cols: ['#38bdf8', '#bae6fd', '#0284c7', '#ffffff'], shapes: ['shuriken', 'bubble'] },
          dragon_darts: { cols: ['#6366f1', '#22d3ee', '#f43f5e', '#fde047'], shapes: ['lance', 'dragonflame'] },
          bitter_blade: { cols: ['#ef4444', '#a855f7', '#fde047', '#fb7185'], shapes: ['ember', 'slash'] },
          electro_drift: { cols: ['#22d3ee', '#a855f7', '#fde047', '#ffffff'], shapes: ['lightning', 'ray'] },
        };
        const ov = moveOverrides[moveId];
        if (ov) {
          pColor = ov.cols[i % ov.cols.length];
          pShape = ov.shapes[i % ov.shapes.length];
        }
      }
      this.particles.push({
        x: center.x + (Math.random() - 0.5) * 18,
        y: center.y + (Math.random() - 0.5) * 18,
        vx: Math.cos(angle) * speed,
        vy: moveId === 'calm_aura'
          ? -30 - Math.random() * 50
          : Math.sin(angle) * speed - (isBuoyant ? 55 : 22),
        gravity: moveId === 'calm_aura'
          ? -36
          : isBuoyant ? -75 : pShape === 'leaf' || pShape === 'crystal' ? 48 : 190,
        life: 0,
        maxLife: (0.45 + Math.random() * 0.28) * lifeScale,
        color: pColor,
        size: pShape === 'leaf' ? 7 + Math.random() * 4 : 3.5 + Math.random() * 4.5,
        rotation: angle,
        spin: (Math.random() - 0.5) * 10,
        shape: pShape,
      });
    }

    if (labelText) {
      this.spawnFloatingText(
        center.x,
        center.y - 24,
        labelText,
        labelColor,
        options.fontSize || 24,
        0,
        options.popupLife || 1.45,
      );
    }
  }

  _spawnSprint6Impact(moveId, center, pedestal, lifeScale = 1.2) {
    switch (moveId) {
      case 'frenzy_flora': {
        const cols = ['#22c55e', '#4ade80', '#fde047', '#bbf7d0'];
        for (let i = 0; i < 18; i++) {
          this.particles.push({
            x: pedestal.x + (Math.random() - 0.5) * 52,
            y: pedestal.y - 4,
            vx: (Math.random() - 0.5) * 140,
            vy: -(160 + Math.random() * 165),
            gravity: 165,
            life: -(i * 0.014),
            maxLife: (0.62 + Math.random() * 0.24) * lifeScale,
            color: cols[i % cols.length],
            size: i % 3 === 0 ? 8.5 : 6.5,
            rotation: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 14,
            shape: i % 3 === 0 ? 'star' : 'leaf',
          });
        }
        return;
      }
      case 'spore_burst': {
        const cols = ['#2dd4bf', '#f472b6', '#a7f3d0', '#fbcfe8'];
        for (let i = 0; i < 16; i++) {
          const ang = (Math.PI * 2 * i) / 16;
          const spd = 45 + Math.random() * 85;
          this.particles.push({
            x: center.x + (Math.random() - 0.5) * 20,
            y: center.y + (Math.random() - 0.5) * 16,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 36,
            gravity: -45,
            life: -(i * 0.016),
            maxLife: (0.66 + Math.random() * 0.28) * lifeScale,
            color: cols[i % cols.length],
            size: 5.5 + Math.random() * 4,
            shape: 'spore',
          });
        }
        return;
      }
      case 'solar_blade': {
        [-0.78, 0.78, -0.78, 0.78].forEach((ang, idx) => {
          this.particles.push({
            x: center.x + (idx < 2 ? -6 : 6),
            y: center.y,
            vx: Math.cos(ang) * 72,
            vy: Math.sin(ang) * 72,
            gravity: 0,
            life: -(idx * 0.025),
            maxLife: 0.32 * Math.min(1.4, lifeScale),
            color: idx % 2 === 0 ? '#fde047' : '#fb923c',
            size: 20,
            rotation: ang,
            spin: 0,
            shape: 'slash',
          });
        });
        return;
      }
      case 'fiery_dance': {
        ['#ef4444', '#fbbf24', '#fde047'].forEach((col, idx) => {
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: 0,
            vy: 0,
            gravity: 0,
            life: -(idx * 0.05),
            maxLife: 0.52 * Math.min(1.4, lifeScale),
            color: col,
            size: 16,
            maxRadius: 76 + idx * 24,
            lineWidth: 3.4,
            shape: 'ring',
          });
        });
        for (let i = 0; i < 14; i++) {
          const ang = (Math.PI * 2 * i) / 14;
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * 110,
            vy: Math.sin(ang) * 90 - 45,
            gravity: -65,
            life: 0,
            maxLife: 0.52 * lifeScale,
            color: i % 2 === 0 ? '#ef4444' : '#fde047',
            size: 6.5,
            rotation: ang,
            spin: 8,
            shape: i % 3 === 0 ? 'star' : 'ember',
          });
        }
        return;
      }
      case 'hydro_vortex': {
        this.particles.push({
          x: pedestal.x,
          y: pedestal.y,
          vx: 0,
          vy: 0,
          gravity: 0,
          life: 0,
          maxLife: 0.42 * Math.min(1.4, lifeScale),
          color: '#38bdf8',
          size: 32,
          shape: 'beam',
        });
        for (let i = 0; i < 18; i++) {
          this.particles.push({
            x: pedestal.x + (Math.random() - 0.5) * 42,
            y: pedestal.y - 4,
            vx: (Math.random() - 0.5) * 150,
            vy: -(170 + Math.random() * 140),
            gravity: 280,
            life: -(i * 0.012),
            maxLife: (0.56 + Math.random() * 0.22) * lifeScale,
            color: i % 2 === 0 ? '#38bdf8' : '#e0f2fe',
            size: 5.5 + Math.random() * 4,
            shape: 'bubble',
          });
        }
        return;
      }
      case 'razor_shell': {
        [-0.65, 0.65].forEach((ang, idx) => {
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * 65,
            vy: Math.sin(ang) * 65,
            gravity: 0,
            life: -(idx * 0.03),
            maxLife: 0.28 * Math.min(1.4, lifeScale),
            color: idx === 0 ? '#22d3ee' : '#fb7185',
            size: 18,
            rotation: ang,
            spin: 0,
            shape: 'slash',
          });
        });
        return;
      }
      case 'plasma_cannon': {
        ['#22d3ee', '#fde047', '#ffffff'].forEach((col, idx) => {
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: 0,
            vy: 0,
            gravity: 0,
            life: -(idx * 0.045),
            maxLife: 0.46 * Math.min(1.4, lifeScale),
            color: col,
            size: 16,
            maxRadius: 74 + idx * 26,
            lineWidth: 3.6 - idx * 0.5,
            shape: 'ring',
          });
        });
        return;
      }
      case 'volt_tackle': {
        for (let i = 0; i < 8; i++) {
          const ox = (i - 3.5) * 15;
          this.particles.push({
            x: center.x + ox,
            y: center.y - 72,
            vx: (Math.random() - 0.5) * 26,
            vy: 245 + Math.random() * 75,
            gravity: 0,
            life: -(i * 0.018),
            maxLife: 0.32 * Math.min(1.4, lifeScale),
            color: i % 3 === 0 ? '#ffffff' : '#fde047',
            size: 13,
            rotation: (Math.random() - 0.5) * 0.3,
            shape: 'lightning',
          });
        }
        return;
      }
      case 'sandstorm_crush': {
        this.particles.push({
          x: pedestal.x,
          y: pedestal.y,
          vx: 0,
          vy: 0,
          gravity: 0,
          life: 0,
          maxLife: 0.42 * Math.min(1.4, lifeScale),
          color: '#f59e0b',
          size: 18,
          maxRadius: 118,
          lineWidth: 4.5,
          shape: 'ring',
        });
        for (let i = 0; i < 12; i++) {
          const ang = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.3;
          const spd = 85 + Math.random() * 130;
          this.particles.push({
            x: center.x + (Math.random() - 0.5) * 24,
            y: center.y + 6,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 72,
            gravity: 310,
            life: 0,
            maxLife: (0.52 + Math.random() * 0.24) * lifeScale,
            color: i % 2 === 0 ? '#d97706' : '#a8a29e',
            size: 5.5 + Math.random() * 4,
            rotation: ang,
            spin: (Math.random() - 0.5) * 12,
            shape: 'stone',
          });
        }
        return;
      }
      case 'prism_laser': {
        const prismCols = ['#ef4444', '#fde047', '#22c55e', '#38bdf8', '#a855f7', '#f472b6'];
        for (let i = 0; i < 16; i++) {
          const ang = (Math.PI * 2 * i) / 16;
          const spd = 95 + Math.random() * 125;
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 20,
            gravity: 65,
            life: -(i * 0.01),
            maxLife: (0.52 + Math.random() * 0.2) * lifeScale,
            color: prismCols[i % prismCols.length],
            size: 6.5 + Math.random() * 3,
            rotation: ang,
            spin: 9,
            shape: 'crystal',
          });
        }
        return;
      }
      case 'zen_meteor': {
        ['#f472b6', '#a855f7', '#67e8f9'].forEach((col, idx) => {
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: 0,
            vy: 0,
            gravity: 0,
            life: -(idx * 0.055),
            maxLife: 0.5 * Math.min(1.4, lifeScale),
            color: col,
            size: 18,
            maxRadius: 82 + idx * 28,
            lineWidth: 4 - idx * 0.6,
            shape: 'ring',
          });
        });
        return;
      }
      case 'icicle_spear': {
        for (let i = 0; i < 14; i++) {
          const ang = (Math.PI * 2 * i) / 14;
          const spd = 95 + Math.random() * 135;
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 40,
            gravity: 150,
            life: -(i * 0.012),
            maxLife: (0.52 + Math.random() * 0.22) * lifeScale,
            color: i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? '#67e8f9' : '#bae6fd',
            size: 6.5 + Math.random() * 3.5,
            rotation: ang,
            spin: 10,
            shape: 'crystal',
          });
        }
        return;
      }
      case 'spectral_lantern': {
        ['#a855f7', '#2dd4bf', '#e9d5ff'].forEach((col, idx) => {
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: 0,
            vy: 0,
            gravity: 0,
            life: -(idx * 0.06),
            maxLife: 0.54 * Math.min(1.4, lifeScale),
            color: col,
            size: 16,
            maxRadius: 72 + idx * 22,
            lineWidth: 3.2,
            shape: 'ring',
          });
        });
        for (let i = 0; i < 12; i++) {
          const ang = (Math.PI * 2 * i) / 12;
          this.particles.push({
            x: center.x + Math.cos(ang) * 44,
            y: center.y + Math.sin(ang) * 34,
            orbitCenter: center,
            orbitAngle: ang,
            orbitRadius: 46,
            orbitRadialVel: 14,
            orbitAngVel: i % 2 === 0 ? 5.6 : -4.8,
            life: -(i * 0.016),
            maxLife: 0.72 * lifeScale,
            color: i % 2 === 0 ? '#a855f7' : '#2dd4bf',
            size: 5.5,
            shape: 'wisp',
          });
        }
        return;
      }
      case 'night_daze': {
        const dazeCols = ['#9333ea', '#f43f5e', '#c084fc', '#fde047'];
        for (let i = 0; i < 12; i++) {
          const ang = (Math.PI * 2 * i) / 12;
          const spd = 85 + Math.random() * 115;
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 24,
            gravity: 30,
            life: -(i * 0.014),
            maxLife: (0.5 + Math.random() * 0.2) * lifeScale,
            color: dazeCols[i % dazeCols.length],
            size: 7.5 + Math.random() * 3,
            rotation: ang,
            spin: 6,
            shape: i % 2 === 0 ? 'crescent' : 'star',
          });
        }
        return;
      }
      case 'dragon_rush': {
        this.particles.push({
          x: pedestal.x,
          y: pedestal.y,
          vx: 0,
          vy: 0,
          gravity: 0,
          life: 0,
          maxLife: 0.44 * Math.min(1.4, lifeScale),
          color: '#6366f1',
          size: 18,
          maxRadius: 120,
          lineWidth: 4.5,
          shape: 'ring',
        });
        for (let i = 0; i < 16; i++) {
          const ang = (Math.PI * 2 * i) / 16;
          const spd = 95 + Math.random() * 130;
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 45,
            gravity: -50,
            life: 0,
            maxLife: (0.54 + Math.random() * 0.22) * lifeScale,
            color: i % 3 === 0 ? '#fde047' : i % 2 === 0 ? '#6366f1' : '#38bdf8',
            size: 6.5 + Math.random() * 3,
            rotation: ang,
            spin: 8,
            shape: i % 3 === 0 ? 'star' : 'dragonflame',
          });
        }
        return;
      }
      case 'dune_aegis': {
        ['#fbbf24', '#fef3c7', '#67e8f9'].forEach((col, idx) => {
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: 0,
            vy: 0,
            gravity: 0,
            life: -(idx * 0.055),
            maxLife: 0.56 * Math.min(1.4, lifeScale),
            color: col,
            size: 18,
            maxRadius: 68 + idx * 24,
            lineWidth: 3.2,
            shape: 'ring',
          });
        });
        for (let i = 0; i < 12; i++) {
          const ang = (Math.PI * 2 * i) / 12;
          this.particles.push({
            x: center.x + Math.cos(ang) * 52,
            y: center.y + Math.sin(ang) * 38,
            orbitCenter: center,
            orbitAngle: ang,
            orbitRadius: 52 + (i % 2) * 10,
            orbitRadialVel: -6,
            orbitAngVel: i % 2 === 0 ? 4.2 : -3.8,
            life: -(i * 0.02),
            maxLife: 0.88 * Math.min(1.3, lifeScale),
            color: i % 3 === 0 ? '#67e8f9' : i % 2 === 0 ? '#fbbf24' : '#fef3c7',
            size: 5.5,
            rotation: ang,
            spin: 5,
            shape: i % 2 === 0 ? 'crystal' : 'star',
          });
        }
        return;
      }
      default:
        return;
    }
  }

  _spawnSprint7Impact(moveId, center, pedestal, lifeScale = 1.2) {
    switch (moveId) {
      case 'thorn_barrage': {
        const cols = ['#22c55e', '#f472b6', '#4ade80', '#bbf7d0'];
        for (let i = 0; i < 16; i++) {
          const ang = (Math.PI * 2 * i) / 16;
          const spd = 88 + Math.random() * 125;
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 26,
            gravity: 35,
            life: -(i * 0.01),
            maxLife: (0.5 + Math.random() * 0.22) * lifeScale,
            color: cols[i % cols.length],
            size: 7.5 + Math.random() * 3,
            rotation: ang,
            spin: (Math.random() - 0.5) * 14,
            shape: i % 2 === 0 ? 'petal' : 'leaf',
          });
        }
        return true;
      }
      case 'jungle_totem': {
        ['#16a34a', '#fde047', '#4ade80'].forEach((col, idx) => {
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: 0,
            vy: 0,
            gravity: 0,
            life: -(idx * 0.05),
            maxLife: 0.54 * Math.min(1.4, lifeScale),
            color: col,
            size: 16,
            maxRadius: 76 + idx * 24,
            lineWidth: 3.4,
            shape: 'ring',
          });
        });
        for (let i = 0; i < 12; i++) {
          const ang = (Math.PI * 2 * i) / 12;
          this.particles.push({
            x: center.x + Math.cos(ang) * 46,
            y: center.y + Math.sin(ang) * 34,
            orbitCenter: center,
            orbitAngle: ang,
            orbitRadius: 48,
            orbitRadialVel: -10,
            orbitAngVel: i % 2 === 0 ? 5.6 : -4.8,
            life: -(i * 0.015),
            maxLife: 0.72 * lifeScale,
            color: i % 2 === 0 ? '#4ade80' : '#fde047',
            size: 6.5,
            rotation: ang,
            spin: 6,
            shape: i % 3 === 0 ? 'sigil' : 'leaf',
          });
        }
        return true;
      }
      case 'inferno_overdrive': {
        ['#ef4444', '#fb923c', '#fde047'].forEach((col, idx) => {
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: 0,
            vy: 0,
            gravity: 0,
            life: -(idx * 0.04),
            maxLife: 0.48 * Math.min(1.4, lifeScale),
            color: col,
            size: 16,
            maxRadius: 84 + idx * 24,
            lineWidth: 3.8,
            shape: 'ring',
          });
        });
        for (let i = 0; i < 18; i++) {
          const ang = (Math.PI * 2 * i) / 18;
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * (105 + Math.random() * 125),
            vy: Math.sin(ang) * 95 - 48,
            gravity: -60,
            life: -(i * 0.01),
            maxLife: (0.52 + Math.random() * 0.24) * lifeScale,
            color: i % 3 === 0 ? '#fde047' : i % 2 === 0 ? '#fb923c' : '#ef4444',
            size: 7 + Math.random() * 3,
            rotation: ang,
            spin: 9,
            shape: i % 3 === 0 ? 'wave_arc' : 'ember',
          });
        }
        return true;
      }
      case 'blaze_kick': {
        [-0.75, 0.75].forEach((ang, idx) => {
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * 78,
            vy: Math.sin(ang) * 78,
            gravity: 0,
            life: -(idx * 0.025),
            maxLife: 0.32 * Math.min(1.4, lifeScale),
            color: idx === 0 ? '#fde047' : '#ef4444',
            size: 19,
            rotation: ang,
            spin: 0,
            shape: 'slash',
          });
        });
        for (let i = 0; i < 14; i++) {
          const ang = (Math.PI * 2 * i) / 14;
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * 120,
            vy: Math.sin(ang) * 105 - 35,
            gravity: 140,
            life: 0,
            maxLife: 0.48 * lifeScale,
            color: i % 2 === 0 ? '#fb923c' : '#fde047',
            size: 6,
            shape: 'ember',
          });
        }
        return true;
      }
      case 'abyssal_geyser': {
        this.particles.push({
          x: pedestal.x,
          y: pedestal.y,
          vx: 0,
          vy: 0,
          gravity: 0,
          life: 0,
          maxLife: 0.44 * Math.min(1.4, lifeScale),
          color: '#06b6d4',
          size: 34,
          shape: 'beam',
        });
        for (let i = 0; i < 18; i++) {
          this.particles.push({
            x: pedestal.x + (Math.random() - 0.5) * 44,
            y: pedestal.y - 4,
            vx: (Math.random() - 0.5) * 155,
            vy: -(175 + Math.random() * 145),
            gravity: 270,
            life: -(i * 0.012),
            maxLife: (0.58 + Math.random() * 0.22) * lifeScale,
            color: i % 3 === 0 ? '#cffafe' : i % 2 === 0 ? '#38bdf8' : '#06b6d4',
            size: 6.5 + Math.random() * 3.5,
            rotation: (Math.random() - 0.5) * 1.2,
            spin: 6,
            shape: i % 3 === 0 ? 'wave_arc' : 'bubble',
          });
        }
        return true;
      }
      case 'pearl_cascade': {
        const cols = ['#a5f3fc', '#f9a8d4', '#38bdf8', '#ffffff'];
        for (let i = 0; i < 14; i++) {
          const ang = (Math.PI * 2 * i) / 14;
          const spd = 85 + Math.random() * 115;
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 32,
            gravity: -35,
            life: -(i * 0.012),
            maxLife: (0.5 + Math.random() * 0.2) * lifeScale,
            color: cols[i % cols.length],
            size: 5.5 + Math.random() * 3.5,
            rotation: ang,
            spin: 7,
            shape: i % 3 === 0 ? 'hexagon' : 'bubble',
          });
        }
        return true;
      }
      case 'steppe_bolt':
      case 'ion_tempest': {
        const isTempest = moveId === 'ion_tempest';
        const strikeCount = isTempest ? 10 : 7;
        for (let i = 0; i < strikeCount; i++) {
          const ox = (i - (strikeCount - 1) * 0.5) * 14;
          this.particles.push({
            x: center.x + ox,
            y: center.y - 74,
            vx: (Math.random() - 0.5) * 30,
            vy: 245 + Math.random() * 85,
            gravity: 0,
            life: -(i * 0.018),
            maxLife: 0.34 * Math.min(1.4, lifeScale),
            color: i % 3 === 0 ? '#ffffff' : isTempest ? '#38bdf8' : '#fde047',
            size: 12.5,
            rotation: (Math.random() - 0.5) * 0.32,
            shape: 'lightning',
          });
        }
        return true;
      }
      case 'canyon_rend': {
        this.particles.push({
          x: pedestal.x,
          y: pedestal.y,
          vx: 0,
          vy: 0,
          gravity: 0,
          life: 0,
          maxLife: 0.44 * Math.min(1.4, lifeScale),
          color: '#d97706',
          size: 18,
          maxRadius: 124,
          lineWidth: 4.8,
          shape: 'ring',
        });
        for (let i = 0; i < 14; i++) {
          const ang = (Math.PI * 2 * i) / 14 + (Math.random() - 0.5) * 0.25;
          const spd = 90 + Math.random() * 135;
          this.particles.push({
            x: center.x + (Math.random() - 0.5) * 24,
            y: center.y + 6,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 78,
            gravity: 320,
            life: 0,
            maxLife: (0.54 + Math.random() * 0.24) * lifeScale,
            color: i % 3 === 0 ? '#f59e0b' : i % 2 === 0 ? '#d97706' : '#78716c',
            size: 6 + Math.random() * 4,
            rotation: ang,
            spin: (Math.random() - 0.5) * 12,
            shape: 'stone',
          });
        }
        return true;
      }
      case 'amber_bastion': {
        ['#f59e0b', '#fef3c7', '#fbbf24'].forEach((col, idx) => {
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: 0,
            vy: 0,
            gravity: 0,
            life: -(idx * 0.055),
            maxLife: 0.58 * Math.min(1.4, lifeScale),
            color: col,
            size: 18,
            maxRadius: 72 + idx * 24,
            lineWidth: 3.4,
            shape: 'ring',
          });
        });
        for (let i = 0; i < 12; i++) {
          const ang = (Math.PI * 2 * i) / 12;
          this.particles.push({
            x: center.x + Math.cos(ang) * 52,
            y: center.y + Math.sin(ang) * 38,
            orbitCenter: center,
            orbitAngle: ang,
            orbitRadius: 54,
            orbitRadialVel: -6,
            orbitAngVel: i % 2 === 0 ? 4.4 : -3.8,
            life: -(i * 0.02),
            maxLife: 0.9 * Math.min(1.3, lifeScale),
            color: i % 2 === 0 ? '#fbbf24' : '#fef3c7',
            size: 6.5,
            rotation: ang,
            spin: 5,
            shape: i % 2 === 0 ? 'hexagon' : 'sigil',
          });
        }
        return true;
      }
      case 'chrono_cannon': {
        ['#fde047', '#c084fc', '#f59e0b'].forEach((col, idx) => {
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: 0,
            vy: 0,
            gravity: 0,
            life: -(idx * 0.05),
            maxLife: 0.5 * Math.min(1.4, lifeScale),
            color: col,
            size: 16,
            maxRadius: 78 + idx * 26,
            lineWidth: 3.4,
            shape: 'ring',
          });
        });
        for (let i = 0; i < 12; i++) {
          const ang = (Math.PI * 2 * i) / 12;
          const spd = 90 + Math.random() * 115;
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            gravity: 25,
            life: -(i * 0.012),
            maxLife: (0.52 + Math.random() * 0.2) * lifeScale,
            color: i % 2 === 0 ? '#fde047' : '#c084fc',
            size: 7.5,
            rotation: ang,
            spin: (i % 2 === 0 ? 1 : -1) * 9,
            shape: i % 2 === 0 ? 'gear' : 'sigil',
          });
        }
        return true;
      }
      case 'champion_strike': {
        ['#fb7185', '#fde047', '#ffffff'].forEach((col, idx) => {
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: 0,
            vy: 0,
            gravity: 0,
            life: -(idx * 0.04),
            maxLife: 0.42 * Math.min(1.4, lifeScale),
            color: col,
            size: 16,
            maxRadius: 76 + idx * 24,
            lineWidth: 3.8,
            shape: 'ring',
          });
        });
        for (let i = 0; i < 12; i++) {
          const ang = (Math.PI * 2 * i) / 12;
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * 135,
            vy: Math.sin(ang) * 135,
            gravity: 0,
            life: 0,
            maxLife: 0.42 * lifeScale,
            color: i % 2 === 0 ? '#fb7185' : '#fde047',
            size: 8.5,
            rotation: ang,
            spin: 6,
            shape: i % 2 === 0 ? 'wave_arc' : 'star',
          });
        }
        return true;
      }
      case 'polar_lance': {
        for (let i = 0; i < 14; i++) {
          const ang = (Math.PI * 2 * i) / 14;
          const spd = 100 + Math.random() * 130;
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 30,
            gravity: 120,
            life: -(i * 0.012),
            maxLife: (0.52 + Math.random() * 0.22) * lifeScale,
            color: i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? '#67e8f9' : '#bae6fd',
            size: 7 + Math.random() * 3,
            rotation: ang,
            spin: 10,
            shape: i % 2 === 0 ? 'hexagon' : 'lance',
          });
        }
        return true;
      }
      case 'relic_hex': {
        ['#a855f7', '#f59e0b', '#e9d5ff'].forEach((col, idx) => {
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: 0,
            vy: 0,
            gravity: 0,
            life: -(idx * 0.055),
            maxLife: 0.54 * Math.min(1.4, lifeScale),
            color: col,
            size: 16,
            maxRadius: 74 + idx * 24,
            lineWidth: 3.4,
            shape: 'ring',
          });
        });
        for (let i = 0; i < 12; i++) {
          const ang = (Math.PI * 2 * i) / 12;
          this.particles.push({
            x: center.x + Math.cos(ang) * 44,
            y: center.y + Math.sin(ang) * 34,
            orbitCenter: center,
            orbitAngle: ang,
            orbitRadius: 46,
            orbitRadialVel: 18,
            orbitAngVel: i % 2 === 0 ? 5.8 : -5.0,
            life: -(i * 0.015),
            maxLife: 0.72 * lifeScale,
            color: i % 2 === 0 ? '#a855f7' : '#f59e0b',
            size: 7,
            rotation: ang,
            spin: 6,
            shape: i % 2 === 0 ? 'sigil' : 'wisp',
          });
        }
        return true;
      }
      case 'rift_claw': {
        [-0.78, 0.78, -0.35, 0.35].forEach((ang, idx) => {
          this.particles.push({
            x: center.x + (idx % 2 === 0 ? -8 : 8),
            y: center.y,
            vx: Math.cos(ang) * 76,
            vy: Math.sin(ang) * 76,
            gravity: 0,
            life: -(idx * 0.022),
            maxLife: 0.32 * Math.min(1.4, lifeScale),
            color: idx % 2 === 0 ? '#ec4899' : '#6366f1',
            size: 20,
            rotation: ang,
            spin: 0,
            shape: 'slash',
          });
        });
        for (let i = 0; i < 10; i++) {
          const ang = (Math.PI * 2 * i) / 10;
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * 115,
            vy: Math.sin(ang) * 115,
            gravity: 0,
            life: 0,
            maxLife: 0.46 * lifeScale,
            color: i % 2 === 0 ? '#67e8f9' : '#ec4899',
            size: 6.5,
            rotation: ang,
            spin: 8,
            shape: 'sigil',
          });
        }
        return true;
      }
      case 'cosmos_supernova': {
        this.particles.push({
          x: center.x,
          y: center.y,
          vx: 0,
          vy: 0,
          gravity: 0,
          life: 0,
          maxLife: 0.4 * Math.min(1.4, lifeScale),
          color: '#f472b6',
          size: 38,
          shape: 'beam',
        });
        ['#f472b6', '#fde047', '#6366f1'].forEach((col, idx) => {
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: 0,
            vy: 0,
            gravity: 0,
            life: -(idx * 0.045),
            maxLife: 0.56 * Math.min(1.4, lifeScale),
            color: col,
            size: 18,
            maxRadius: 88 + idx * 28,
            lineWidth: 4.0,
            shape: 'ring',
          });
        });
        for (let i = 0; i < 18; i++) {
          const ang = (Math.PI * 2 * i) / 18;
          const spd = 115 + Math.random() * 145;
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 36,
            gravity: 40,
            life: 0,
            maxLife: (0.58 + Math.random() * 0.25) * lifeScale,
            color: i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? '#fde047' : '#f472b6',
            size: 7 + Math.random() * 3.5,
            rotation: ang,
            spin: 9,
            shape: i % 3 === 0 ? 'dragonflame' : 'star',
          });
        }
        return true;
      }
      default:
        return false;
    }
  }

  _spawnSprint8Impact(moveId, center, pedestal, lifeScale) {
    switch (moveId) {
      case 'close_combat': {
        for (let i = 0; i < 6; i++) {
          const ang = (Math.PI * 2 * i) / 6 + (Math.random() - 0.5) * 0.3;
          this.particles.push({
            x: center.x + (Math.random() - 0.5) * 28,
            y: center.y + (Math.random() - 0.5) * 22,
            vx: Math.cos(ang) * 95,
            vy: Math.sin(ang) * 95,
            gravity: 0,
            life: -(i * 0.02),
            maxLife: 0.34 * lifeScale,
            color: i % 2 === 0 ? '#ef4444' : '#fbbf24',
            size: 13 + Math.random() * 4,
            rotation: ang,
            spin: 0,
            shape: 'wave_arc',
          });
        }
        return true;
      }
      case 'vacuum_wave': {
        for (let r = 0; r < 2; r++) {
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: 0,
            vy: 0,
            gravity: 0,
            life: -(r * 0.045),
            maxLife: 0.38 * lifeScale,
            color: r === 0 ? '#f87171' : '#bae6fd',
            size: 16,
            maxRadius: 92 + r * 28,
            lineWidth: 3.4,
            shape: 'ring',
          });
        }
        return true;
      }
      case 'collision_course': {
        this.particles.push({
          x: center.x,
          y: center.y,
          vx: 0,
          vy: 0,
          gravity: 0,
          life: 0,
          maxLife: 0.48 * lifeScale,
          color: '#fbbf24',
          size: 20,
          maxRadius: 118,
          lineWidth: 4.5,
          shape: 'ring',
        });
        for (let i = 0; i < 10; i++) {
          const ang = (Math.PI * 2 * i) / 10;
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * 165,
            vy: Math.sin(ang) * 165,
            gravity: 35,
            life: 0,
            maxLife: 0.44 * lifeScale,
            color: i % 2 === 0 ? '#dc2626' : '#fbbf24',
            size: 9,
            rotation: ang,
            spin: 6,
            shape: i % 2 === 0 ? 'ray' : 'star',
          });
        }
        return true;
      }
      case 'brave_bird': {
        for (let i = 0; i < 12; i++) {
          const ang = (Math.PI * 2 * i) / 12;
          this.particles.push({
            x: center.x + (Math.random() - 0.5) * 20,
            y: center.y + (Math.random() - 0.5) * 20,
            vx: Math.cos(ang) * 140,
            vy: Math.sin(ang) * 110 - 30,
            gravity: -28,
            life: -(i * 0.014),
            maxLife: 0.48 * lifeScale,
            color: i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? '#bae6fd' : '#38bdf8',
            size: 7.5 + Math.random() * 2.5,
            rotation: ang,
            spin: (Math.random() - 0.5) * 8,
            shape: 'feather',
          });
        }
        return true;
      }
      case 'air_slash': {
        [-0.75, 0.75, 0].forEach((ang, idx) => {
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * 75,
            vy: Math.sin(ang) * 75,
            gravity: 0,
            life: -(idx * 0.025),
            maxLife: 0.36 * lifeScale,
            color: idx === 2 ? '#ffffff' : '#7dd3fc',
            size: 16,
            rotation: ang,
            spin: 2.5,
            shape: 'wind',
          });
        });
        return true;
      }
      case 'tailwind_grace': {
        for (let i = 0; i < 8; i++) {
          const ang = (Math.PI * 2 * i) / 8;
          this.particles.push({
            x: center.x + Math.cos(ang) * 24,
            y: center.y + 18,
            vx: Math.cos(ang) * 48,
            vy: -78 - Math.random() * 44,
            gravity: -25,
            life: -(i * 0.02),
            maxLife: 0.56 * lifeScale,
            color: i % 2 === 0 ? '#bae6fd' : '#a7f3d0',
            size: 7,
            rotation: ang,
            spin: 5,
            shape: 'feather',
          });
        }
        return true;
      }
      case 'sludge_wave':
      case 'poison_jab':
      case 'malignant_chain': {
        const dropletCount = moveId === 'sludge_wave' ? 14 : 9;
        for (let i = 0; i < dropletCount; i++) {
          const ang = (Math.PI * 2 * i) / dropletCount + Math.random() * 0.25;
          const spd = 70 + Math.random() * 115;
          this.particles.push({
            x: center.x + (Math.random() - 0.5) * 20,
            y: center.y + (Math.random() - 0.5) * 20,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 45,
            gravity: 210,
            life: -(i * 0.015),
            maxLife: 0.52 * lifeScale,
            color: i % 3 === 0 ? '#4ade80' : i % 2 === 0 ? '#c084fc' : '#a855f7',
            size: 6 + Math.random() * 3.5,
            rotation: ang,
            spin: 4,
            shape: moveId === 'malignant_chain' && i % 2 === 0 ? 'sigil' : 'venom',
          });
        }
        return true;
      }
      case 'earthquake':
      case 'headlong_rush': {
        this.spawnImpactDust(pedestal, 16, lifeScale);
        for (let i = 0; i < 10; i++) {
          const sideSign = i % 2 === 0 ? -1 : 1;
          this.particles.push({
            x: pedestal.x + sideSign * (12 + Math.random() * 38),
            y: pedestal.y - 4,
            vx: sideSign * (42 + Math.random() * 68),
            vy: -135 - Math.random() * 85,
            gravity: 340,
            life: -(i * 0.018),
            maxLife: 0.54 * lifeScale,
            color: i % 3 === 0 ? '#f59e0b' : i % 2 === 0 ? '#d97706' : '#78716c',
            size: 7 + Math.random() * 5,
            rotation: Math.random() * Math.PI,
            spin: (Math.random() - 0.5) * 10,
            shape: 'stone',
          });
        }
        return true;
      }
      case 'earth_power': {
        for (let i = -1; i <= 1; i++) {
          this.particles.push({
            x: pedestal.x + i * 24,
            y: pedestal.y,
            vx: i * 18,
            vy: -165 - Math.random() * 45,
            gravity: 110,
            life: -(Math.abs(i) * 0.03),
            maxLife: 0.52 * lifeScale,
            color: i === 0 ? '#fde047' : '#f59e0b',
            size: 9 + Math.random() * 3,
            rotation: 0,
            spin: 6,
            shape: 'ember',
          });
        }
        return true;
      }
      case 'bug_buzz': {
        for (let r = 0; r < 3; r++) {
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: 0,
            vy: 0,
            gravity: 0,
            life: -(r * 0.055),
            maxLife: 0.45 * lifeScale,
            color: r % 2 === 0 ? '#84cc16' : '#34d399',
            size: 14,
            maxRadius: 68 + r * 26,
            lineWidth: 3.2,
            shape: 'ring',
          });
        }
        return true;
      }
      case 'x_scissor': {
        [-0.785, 0.785].forEach((ang, idx) => {
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * 48,
            vy: Math.sin(ang) * 48,
            gravity: 0,
            life: -(idx * 0.03),
            maxLife: 0.34 * lifeScale,
            color: idx === 0 ? '#bef264' : '#84cc16',
            size: 19,
            rotation: ang,
            spin: 0,
            shape: 'slash',
          });
        });
        return true;
      }
      case 'quiver_step': {
        for (let i = 0; i < 10; i++) {
          const ang = (Math.PI * 2 * i) / 10;
          this.particles.push({
            x: center.x + Math.cos(ang) * 22,
            y: center.y + Math.sin(ang) * 14,
            vx: Math.cos(ang) * 56,
            vy: -55 - Math.random() * 45,
            gravity: -28,
            life: -(i * 0.02),
            maxLife: 0.56 * lifeScale,
            color: i % 3 === 0 ? '#f472b6' : i % 2 === 0 ? '#a3e635' : '#fde047',
            size: 6.5,
            rotation: ang,
            spin: 7,
            shape: 'petal',
          });
        }
        return true;
      }
      case 'flash_cannon': {
        for (let i = 0; i < 8; i++) {
          const ang = (Math.PI * 2 * i) / 8;
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * 145,
            vy: Math.sin(ang) * 145,
            gravity: 0,
            life: 0,
            maxLife: 0.38 * lifeScale,
            color: i % 2 === 0 ? '#e2e8f0' : '#38bdf8',
            size: 7.5,
            length: 28,
            rotation: ang,
            spin: 0,
            shape: 'ray',
          });
        }
        return true;
      }
      case 'gigaton_hammer': {
        this.spawnImpactDust(pedestal, 14, lifeScale);
        this.particles.push({
          x: center.x,
          y: center.y + 8,
          vx: 0,
          vy: 0,
          gravity: 0,
          life: 0,
          maxLife: 0.46 * lifeScale,
          color: '#f472b6',
          size: 22,
          maxRadius: 114,
          lineWidth: 4.5,
          shape: 'ring',
        });
        for (let i = 0; i < 8; i++) {
          const ang = (Math.PI * 2 * i) / 8;
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * 135,
            vy: Math.sin(ang) * 105 - 35,
            gravity: 220,
            life: 0,
            maxLife: 0.46 * lifeScale,
            color: i % 2 === 0 ? '#e2e8f0' : '#f472b6',
            size: 8.5,
            rotation: ang,
            spin: 6,
            shape: 'hexagon',
          });
        }
        return true;
      }
      case 'king_shield': {
        for (let i = 0; i < 6; i++) {
          const ang = (Math.PI * 2 * i) / 6;
          this.particles.push({
            x: center.x + Math.cos(ang) * 34,
            y: center.y + Math.sin(ang) * 26,
            vx: Math.cos(ang) * 22,
            vy: Math.sin(ang) * 18 - 14,
            gravity: -10,
            life: -(i * 0.025),
            maxLife: 0.56 * lifeScale,
            color: i % 2 === 0 ? '#fbbf24' : '#e2e8f0',
            size: 8.5,
            rotation: ang,
            spin: 2.5,
            shape: 'hexagon',
          });
        }
        return true;
      }
      case 'dark_pulse':
      case 'kowtow_cleave':
      case 'lunar_shroud': {
        for (let i = 0; i < 9; i++) {
          const ang = (Math.PI * 2 * i) / 9;
          this.particles.push({
            x: center.x + (moveId === 'lunar_shroud' ? Math.cos(ang) * 26 : 0),
            y: center.y + (moveId === 'lunar_shroud' ? Math.sin(ang) * 18 : 0),
            vx: Math.cos(ang) * (moveId === 'lunar_shroud' ? 42 : 120),
            vy: Math.sin(ang) * (moveId === 'lunar_shroud' ? 32 : 110),
            gravity: -18,
            life: -(i * 0.02),
            maxLife: 0.46 * lifeScale,
            color: i % 3 === 0 ? '#ef4444' : i % 2 === 0 ? '#a855f7' : '#818cf8',
            size: 8.5,
            rotation: ang,
            spin: 6.5,
            shape: moveId === 'kowtow_cleave' && i % 2 === 0 ? 'slash' : 'crescent',
          });
        }
        return true;
      }
      case 'dazzling_gleam':
      case 'play_rough':
      case 'geomancy_bloom': {
        const rainbow = ['#f472b6', '#fde047', '#38bdf8', '#4ade80', '#c084fc'];
        for (let i = 0; i < 12; i++) {
          const ang = (Math.PI * 2 * i) / 12;
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * 115,
            vy: Math.sin(ang) * 105 - 24,
            gravity: -26,
            life: -(i * 0.015),
            maxLife: 0.52 * lifeScale,
            color: rainbow[i % rainbow.length],
            size: 7 + Math.random() * 2.5,
            rotation: ang,
            spin: 7,
            shape: moveId === 'play_rough' ? 'heart' : moveId === 'geomancy_bloom' ? 'petal' : 'star',
          });
        }
        return true;
      }
      case 'water_shuriken': {
        for (let i = 0; i < 7; i++) {
          const ang = (Math.PI * 2 * i) / 7;
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * 135,
            vy: Math.sin(ang) * 115,
            gravity: 25,
            life: -(i * 0.025),
            maxLife: 0.42 * lifeScale,
            color: i % 2 === 0 ? '#38bdf8' : '#ffffff',
            size: 7.5,
            rotation: ang,
            spin: 14,
            shape: 'shuriken',
          });
        }
        return true;
      }
      case 'dragon_darts': {
        [-18, 18].forEach((offset, idx) => {
          this.particles.push({
            x: center.x + offset,
            y: center.y - idx * 8,
            vx: offset * 2.8,
            vy: -38,
            gravity: 0,
            life: -(idx * 0.05),
            maxLife: 0.44 * lifeScale,
            color: idx === 0 ? '#22d3ee' : '#f43f5e',
            size: 10,
            rotation: idx === 0 ? -0.4 : 0.4,
            spin: 0,
            shape: 'lance',
          });
        });
        return true;
      }
      case 'bitter_blade': {
        [-0.75, 0.75].forEach((ang, idx) => {
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * 44,
            vy: Math.sin(ang) * 44,
            gravity: 0,
            life: -(idx * 0.025),
            maxLife: 0.36 * lifeScale,
            color: idx === 0 ? '#ef4444' : '#a855f7',
            size: 18,
            rotation: ang,
            spin: 0,
            shape: 'slash',
          });
        });
        for (let i = 0; i < 8; i++) {
          const ang = (Math.PI * 2 * i) / 8;
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * 85,
            vy: -60 - Math.random() * 55,
            gravity: -65,
            life: 0,
            maxLife: 0.48 * lifeScale,
            color: i % 2 === 0 ? '#ef4444' : '#c084fc',
            size: 6.5,
            shape: 'ember',
          });
        }
        return true;
      }
      case 'electro_drift': {
        for (let i = 0; i < 10; i++) {
          const ang = (Math.PI * 2 * i) / 10;
          this.particles.push({
            x: center.x,
            y: center.y,
            vx: Math.cos(ang) * 165,
            vy: Math.sin(ang) * 145,
            gravity: 0,
            life: 0,
            maxLife: 0.4 * lifeScale,
            color: i % 3 === 0 ? '#a855f7' : i % 2 === 0 ? '#22d3ee' : '#fde047',
            size: 8.5,
            rotation: ang,
            spin: 8,
            shape: i % 2 === 0 ? 'lightning' : 'ray',
          });
        }
        return true;
      }
      default:
        return false;
    }
  }

  spawnPhysicalElementalTrail(attackerSide, defenderSide, move, pace) {
    if (!move || (move.type === 'normal' && move.fx !== 'wind' && move.id !== 'champion_strike')) return;
    const start = this.getSpriteCenter(attackerSide);
    const target = this.getSpriteCenter(defenderSide);
    const typeMeta = resolveTypeMeta(move.type);
    const lifeScale = pace?.particleLifeScale || 1.2;
    const shape = resolveMoveParticleShape(move);
    const dx = target.x - start.x;
    const dy = target.y - start.y;
    const angle = Math.atan2(dy, dx);
    const steps = move.id === 'wild_volt' || move.id === 'leaf_blade'
      ? 9
      : move.id === 'aqua_tail'
        ? 10
        : move.id === 'psycho_cut'
          ? 8
          : 7;

    for (let s = 0; s < steps; s++) {
      const t = s / Math.max(1, steps - 1);
      const px = start.x + dx * (0.2 + t * 0.72);
      const py = start.y + dy * (0.2 + t * 0.72);
      const isPetal = move.id === 'petal_blizzard';
      let color = isPetal && s % 2 === 1 ? '#f9a8d4' : (s % 2 === 0 ? typeMeta.color : '#ffffff');
      let pShape = shape;
      if (move.id === 'leaf_blade') {
        color = s % 3 === 0 ? '#bbf7d0' : s % 2 === 0 ? '#22c55e' : '#4ade80';
        pShape = s % 2 === 0 ? 'slash' : 'leaf';
      } else if (move.id === 'psycho_cut') {
        const dist = Math.max(1, Math.hypot(dx, dy));
        const perpX = -dy / dist;
        const perpY = dx / dist;
        [-11, 11].forEach((off, laneIdx) => {
          this.particles.push({
            x: px + perpX * off,
            y: py + perpY * off,
            vx: Math.cos(angle) * 68,
            vy: Math.sin(angle) * 68,
            gravity: 0,
            life: -(s * 0.014),
            maxLife: 0.24 * Math.min(1.4, lifeScale),
            color: (s + laneIdx) % 2 === 0 ? '#f472b6' : '#c084fc',
            size: 9 + (s % 2) * 2,
            rotation: angle + (laneIdx === 0 ? -0.35 : 0.35),
            spin: laneIdx === 0 ? 7 : -7,
            shape: 'crescent',
          });
        });
        continue;
      } else if (move.id === 'aqua_tail') {
        const dist = Math.max(1, Math.hypot(dx, dy));
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const wave = Math.sin(t * Math.PI * 3) * 18;
        const prismCols = ['#38bdf8', '#67e8f9', '#34d399', '#c084fc', '#f472b6'];
        color = prismCols[s % prismCols.length];
        pShape = s % 3 === 0 ? 'slash' : s % 2 === 0 ? 'bubble' : 'star';
        this.particles.push({
          x: px + perpX * wave,
          y: py + perpY * wave,
          vx: Math.cos(angle) * 58,
          vy: Math.sin(angle) * 58,
          gravity: -15,
          life: -(s * 0.012),
          maxLife: 0.28 * Math.min(1.4, lifeScale),
          color,
          size: pShape === 'slash' ? 12 : 6.5,
          rotation: angle + wave * 0.04,
          spin: 6,
          shape: pShape,
        });
        continue;
      } else if (move.id === 'thunder_fang') {
        color = s % 2 === 0 ? '#fde047' : '#38bdf8';
        pShape = s % 3 === 0 ? 'slash' : 'lightning';
      } else if (move.id === 'wild_volt') {
        color = s % 2 === 0 ? '#fde047' : '#ffffff';
        pShape = s % 2 === 0 ? 'lightning' : 'star';
        if (s % 3 === 1) {
          this.particles.push({
            x: px,
            y: py,
            vx: 0,
            vy: 0,
            gravity: 0,
            life: -(s * 0.015),
            maxLife: 0.24 * Math.min(1.4, lifeScale),
            color: '#fde047',
            size: 10,
            maxRadius: 34,
            shape: 'ring',
          });
        }
      } else if (move.id === 'iron_crush') {
        color = s % 2 === 0 ? '#e2e8f0' : '#94a3b8';
        pShape = s % 2 === 0 ? 'slash' : 'stone';
      } else if (move.id === 'glacier_crash') {
        color = s % 2 === 0 ? '#67e8f9' : '#e0f2fe';
        pShape = 'crystal';
      } else if (move.id === 'solar_blade') {
        color = s % 2 === 0 ? '#fde047' : '#ef4444';
        pShape = s % 2 === 0 ? 'crescent' : 'ember';
      } else if (move.id === 'razor_shell') {
        const dist = Math.max(1, Math.hypot(dx, dy));
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const arc = Math.sin(t * Math.PI) * 34;
        this.particles.push({
          x: px + perpX * arc,
          y: py + perpY * arc,
          vx: Math.cos(angle) * 60,
          vy: Math.sin(angle) * 60,
          gravity: 0,
          life: -(s * 0.014),
          maxLife: 0.28 * Math.min(1.4, lifeScale),
          color: s % 2 === 0 ? '#22d3ee' : '#fb7185',
          size: 11,
          rotation: angle + s * 1.1,
          spin: 18,
          shape: 'crescent',
        });
        continue;
      } else if (move.id === 'volt_tackle') {
        color = s % 2 === 0 ? '#fde047' : '#ffffff';
        pShape = s % 2 === 0 ? 'lightning' : 'star';
        if (s % 2 === 0) {
          this.particles.push({
            x: px,
            y: py,
            vx: 0,
            vy: 0,
            gravity: 0,
            life: -(s * 0.012),
            maxLife: 0.24 * Math.min(1.4, lifeScale),
            color: '#fde047',
            size: 12,
            maxRadius: 38,
            shape: 'ring',
          });
        }
      } else if (move.id === 'sandstorm_crush') {
        color = s % 2 === 0 ? '#d97706' : '#a8a29e';
        pShape = s % 3 === 0 ? 'dust' : 'stone';
      } else if (move.id === 'zen_meteor') {
        color = s % 2 === 0 ? '#f472b6' : '#a855f7';
        pShape = s % 2 === 0 ? 'orb' : 'star';
      } else if (move.id === 'icicle_spear') {
        const dist = Math.max(1, Math.hypot(dx, dy));
        const perpX = -dy / dist;
        const perpY = dx / dist;
        [-14, 0, 14].forEach((laneOff, waveIdx) => {
          this.particles.push({
            x: start.x + perpX * laneOff + dx * (0.14 + t * 0.65),
            y: start.y + perpY * laneOff + dy * (0.14 + t * 0.65),
            vx: Math.cos(angle) * 145,
            vy: Math.sin(angle) * 145,
            gravity: 0,
            life: -(waveIdx * 0.045 + s * 0.01),
            maxLife: 0.26 * Math.min(1.4, lifeScale),
            color: (s + waveIdx) % 2 === 0 ? '#67e8f9' : '#e0f2fe',
            size: 11,
            rotation: angle,
            spin: 0,
            shape: 'lance',
          });
        });
        continue;
      } else if (move.id === 'dragon_rush') {
        color = s % 3 === 0 ? '#fde047' : s % 2 === 0 ? '#6366f1' : '#38bdf8';
        pShape = s % 2 === 0 ? 'dragonflame' : 'wind';
      } else if (move.id === 'thorn_barrage') {
        const dist = Math.max(1, Math.hypot(dx, dy));
        const perpX = -dy / dist;
        const perpY = dx / dist;
        [-12, 12].forEach((off, laneIdx) => {
          this.particles.push({
            x: px + perpX * off * (1 - t * 0.5),
            y: py + perpY * off * (1 - t * 0.5),
            vx: Math.cos(angle) * 72,
            vy: Math.sin(angle) * 72,
            gravity: 10,
            life: -(s * 0.014),
            maxLife: 0.28 * Math.min(1.4, lifeScale),
            color: (s + laneIdx) % 2 === 0 ? '#22c55e' : '#f472b6',
            size: 7.5,
            rotation: angle + s * 0.4,
            spin: 8,
            shape: (s + laneIdx) % 2 === 0 ? 'leaf' : 'petal',
          });
        });
        continue;
      } else if (move.id === 'blaze_kick') {
        color = s % 3 === 0 ? '#fde047' : s % 2 === 0 ? '#fb923c' : '#ef4444';
        pShape = s % 2 === 0 ? 'ember' : 'wave_arc';
      } else if (move.id === 'pearl_cascade') {
        const dist = Math.max(1, Math.hypot(dx, dy));
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const wave = Math.sin(t * Math.PI * 3.5) * 16;
        this.particles.push({
          x: px + perpX * wave,
          y: py + perpY * wave,
          vx: Math.cos(angle) * 62,
          vy: Math.sin(angle) * 62,
          gravity: -18,
          life: -(s * 0.012),
          maxLife: 0.28 * Math.min(1.4, lifeScale),
          color: s % 3 === 0 ? '#f9a8d4' : s % 2 === 0 ? '#a5f3fc' : '#ffffff',
          size: s % 2 === 0 ? 7.5 : 6,
          rotation: angle,
          spin: 7,
          shape: s % 3 === 0 ? 'hexagon' : 'bubble',
        });
        continue;
      } else if (move.id === 'steppe_bolt') {
        color = s % 2 === 0 ? '#fde047' : '#f59e0b';
        pShape = s % 3 === 0 ? 'bolt' : 'lightning';
      } else if (move.id === 'canyon_rend') {
        color = s % 2 === 0 ? '#d97706' : '#f59e0b';
        pShape = s % 2 === 0 ? 'stone' : 'slash';
      } else if (move.id === 'champion_strike') {
        color = s % 2 === 0 ? '#fb7185' : '#fde047';
        pShape = s % 2 === 0 ? 'wave_arc' : 'star';
      } else if (move.id === 'rift_claw') {
        color = s % 3 === 0 ? '#67e8f9' : s % 2 === 0 ? '#ec4899' : '#6366f1';
        pShape = s % 2 === 0 ? 'slash' : 'sigil';
      } else if (move.id === 'close_combat') {
        color = s % 2 === 0 ? '#ef4444' : '#fbbf24';
        pShape = s % 2 === 0 ? 'wave_arc' : 'star';
      } else if (move.id === 'collision_course') {
        color = s % 3 === 0 ? '#ffffff' : s % 2 === 0 ? '#fbbf24' : '#dc2626';
        pShape = s % 2 === 0 ? 'ray' : 'star';
      } else if (move.id === 'brave_bird') {
        color = s % 3 === 0 ? '#ffffff' : s % 2 === 0 ? '#38bdf8' : '#bae6fd';
        pShape = s % 2 === 0 ? 'feather' : 'wind';
      } else if (move.id === 'poison_jab') {
        color = s % 3 === 0 ? '#4ade80' : s % 2 === 0 ? '#c084fc' : '#a855f7';
        pShape = s % 2 === 0 ? 'venom' : 'lance';
      } else if (move.id === 'earthquake' || move.id === 'headlong_rush') {
        color = move.id === 'headlong_rush' && s % 2 === 0 ? '#ef4444' : (s % 2 === 0 ? '#d97706' : '#f59e0b');
        pShape = s % 2 === 0 ? 'stone' : 'dust';
      } else if (move.id === 'x_scissor') {
        color = s % 2 === 0 ? '#84cc16' : '#bef264';
        pShape = s % 2 === 0 ? 'slash' : 'wave_arc';
      } else if (move.id === 'gigaton_hammer') {
        color = s % 2 === 0 ? '#f472b6' : '#e2e8f0';
        pShape = s % 2 === 0 ? 'hexagon' : 'star';
      } else if (move.id === 'kowtow_cleave') {
        color = s % 3 === 0 ? '#fbbf24' : s % 2 === 0 ? '#ef4444' : '#6366f1';
        pShape = s % 2 === 0 ? 'slash' : 'crescent';
      } else if (move.id === 'play_rough') {
        color = s % 3 === 0 ? '#fde047' : s % 2 === 0 ? '#f472b6' : '#f9a8d4';
        pShape = s % 2 === 0 ? 'heart' : 'dust';
      } else if (move.id === 'dragon_darts') {
        const dist = Math.max(1, Math.hypot(dx, dy));
        const perpX = -dy / dist;
        const perpY = dx / dist;
        [-10, 10].forEach((off, laneIdx) => {
          this.particles.push({
            x: px + perpX * off,
            y: py + perpY * off,
            vx: Math.cos(angle) * 90,
            vy: Math.sin(angle) * 90,
            gravity: 0,
            life: -(s * 0.012),
            maxLife: 0.28 * Math.min(1.4, lifeScale),
            color: laneIdx === 0 ? '#22d3ee' : '#f43f5e',
            size: 8.5,
            rotation: angle,
            spin: 0,
            shape: 'lance',
          });
        });
        continue;
      } else if (move.id === 'bitter_blade') {
        color = s % 3 === 0 ? '#fde047' : s % 2 === 0 ? '#ef4444' : '#a855f7';
        pShape = s % 2 === 0 ? 'slash' : 'ember';
      }
      this.particles.push({
        x: px + (Math.random() - 0.5) * 16,
        y: py + (Math.random() - 0.5) * 16,
        vx: Math.cos(angle) * (45 + Math.random() * 55),
        vy: Math.sin(angle) * (45 + Math.random() * 55),
        gravity: 10,
        life: -(s * 0.014),
        maxLife: (0.24 + Math.random() * 0.14) * Math.min(1.4, lifeScale),
        color,
        size: pShape === 'slash' ? 11 + Math.random() * 4 : pShape === 'leaf' ? 7 : 5.5 + Math.random() * 3,
        rotation: angle + (Math.random() - 0.5) * 0.5,
        spin: pShape === 'leaf' || pShape === 'crystal' ? 9 : 2,
        shape: pShape,
      });
    }
  }

  async animateElementalStream(attackerSide, defenderSide, move, sessionId) {
    const pace = this.getPaceConfig();
    const start = this.getSpriteCenter(attackerSide);
    const target = this.getSpriteCenter(defenderSide);
    const typeMeta = resolveTypeMeta(move.type);

    const shape = resolveMoveParticleShape(move);
    const steps = pace.streamSteps || 14;
    const stepWaitMs = pace.streamStepMs || 30;
    const lifeScale = pace.particleLifeScale || 1.2;
    const dx = target.x - start.x;
    const dy = target.y - start.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const perpX = -dy / dist;
    const perpY = dx / dist;

    for (let s = 0; s < steps; s++) {
      if (!this.isSessionValid(sessionId)) return;
      const t = s / Math.max(1, steps - 1);
      const ctrlX = (start.x + target.x) * 0.5;
      const ctrlY = Math.min(start.y, target.y) - 48;
      const inv = 1 - t;
      const px = inv * inv * start.x + 2 * inv * t * ctrlX + t * t * target.x;
      const py = inv * inv * start.y + 2 * inv * t * ctrlY + t * t * target.y;

      if (move.id === 'magma_cannon') {
        // Dual-core intertwined molten fireball stream
        const helix = Math.sin(t * Math.PI * 4) * 14;
        const angle = Math.atan2(dy, dx);
        const cores = [
          { offset: helix, color: '#fde047', trail: '#fb923c' },
          { offset: -helix, color: '#ef4444', trail: '#dc2626' },
        ];
        for (const core of cores) {
          const cx = px + perpX * core.offset;
          const cy = py + perpY * core.offset;
          this.particles.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * 60 + (Math.random() - 0.5) * 20,
            vy: Math.sin(angle) * 60 - 15,
            gravity: -40,
            life: 0,
            maxLife: 0.36 * Math.min(1.4, lifeScale),
            color: core.color,
            size: 7.5 + Math.random() * 2.5,
            shape: 'ember',
          });
          this.particles.push({
            x: cx + (Math.random() - 0.5) * 10,
            y: cy + (Math.random() - 0.5) * 10,
            vx: (Math.random() - 0.5) * 45,
            vy: -30 - Math.random() * 35,
            gravity: -65,
            life: 0,
            maxLife: 0.32 * Math.min(1.4, lifeScale),
            color: core.trail,
            size: 4.5 + Math.random() * 2.5,
            shape: 'ember',
          });
        }
        if (s < steps - 1) {
          await this.wait(stepWaitMs, sessionId);
        }
        continue;
      }

      if (move.id === 'eruption_flare') {
        const angle = Math.atan2(dy, dx);
        const plumeCols = ['#fef08a', '#fb923c', '#ef4444'];
        for (let k = 0; k < 3; k++) {
          this.particles.push({
            x: px + (Math.random() - 0.5) * 18,
            y: py + (Math.random() - 0.5) * 14,
            vx: Math.cos(angle) * 55 + (Math.random() - 0.5) * 35,
            vy: -35 - Math.random() * 55,
            gravity: -55,
            life: 0,
            maxLife: 0.36 * Math.min(1.4, lifeScale),
            color: plumeCols[(s + k) % plumeCols.length],
            size: 6.5 + Math.random() * 3.5,
            shape: 'ember',
          });
        }
        if (s % 2 === 0) {
          this.particles.push({
            x: px + (Math.random() - 0.5) * 16,
            y: py - 6,
            vx: (Math.random() - 0.5) * 30,
            vy: -45 - Math.random() * 30,
            gravity: -40,
            life: 0,
            maxLife: 0.4 * Math.min(1.4, lifeScale),
            color: '#78716c',
            size: 7 + Math.random() * 3,
            shape: 'dust',
          });
        }
        if (s < steps - 1) await this.wait(stepWaitMs, sessionId);
        continue;
      }

      if (move.id === 'aura_sphere') {
        const helix = Math.sin(t * Math.PI * 4.5) * 16;
        const angle = Math.atan2(dy, dx);
        this.particles.push({
          x: px,
          y: py,
          vx: Math.cos(angle) * 40,
          vy: Math.sin(angle) * 40,
          gravity: 0,
          life: 0,
          maxLife: 0.22 * Math.min(1.4, lifeScale),
          color: '#38bdf8',
          size: 11 + t * 3,
          shape: 'orb',
        });
        [1, -1].forEach((dir, idx) => {
          this.particles.push({
            x: px + perpX * helix * dir,
            y: py + perpY * helix * dir,
            vx: (Math.random() - 0.5) * 26,
            vy: (Math.random() - 0.5) * 26,
            gravity: 0,
            life: 0,
            maxLife: 0.32 * Math.min(1.4, lifeScale),
            color: idx === 0 ? '#6366f1' : '#a5f3fc',
            size: 5 + Math.random() * 2,
            rotation: angle + t * 4,
            spin: 6,
            shape: idx === 0 ? 'wisp' : 'star',
          });
        });
        if (s < steps - 1) await this.wait(stepWaitMs, sessionId);
        continue;
      }

      if (move.id === 'draco_meteor') {
        const skyX = target.x - 95 + (s % 4) * 42 + (Math.random() - 0.5) * 24;
        const skyY = Math.max(-16, target.y - 165);
        const flightTime = 0.24;
        const vx = (target.x + (Math.random() - 0.5) * 22 - skyX) / flightTime;
        const vy = (target.y + (Math.random() - 0.5) * 18 - skyY) / flightTime;
        const cometAng = Math.atan2(vy, vx);
        this.particles.push({
          x: skyX,
          y: skyY,
          vx,
          vy,
          gravity: 0,
          life: 0,
          maxLife: flightTime * 1.08,
          color: s % 2 === 0 ? '#fde047' : '#818cf8',
          size: 9.5,
          rotation: cometAng,
          spin: 0,
          shape: 'dragonflame',
        });
        this.particles.push({
          x: skyX,
          y: skyY,
          vx: vx * 0.92,
          vy: vy * 0.92,
          gravity: 0,
          life: 0,
          maxLife: flightTime * 1.12,
          color: s % 2 === 0 ? '#c084fc' : '#ffffff',
          size: 11,
          rotation: cometAng,
          spin: 0,
          shape: 'slash',
        });
        this.particles.push({
          x: skyX + (Math.random() - 0.5) * 14,
          y: skyY + (Math.random() - 0.5) * 14,
          vx: vx * 0.78,
          vy: vy * 0.78,
          gravity: 0,
          life: 0,
          maxLife: flightTime * 1.15,
          color: '#fde047',
          size: 5.5,
          rotation: cometAng,
          spin: 8,
          shape: 'star',
        });
        if (s < steps - 1) await this.wait(stepWaitMs, sessionId);
        continue;
      }

      if (move.id === 'omen_wind') {
        const vortexR = 8 + t * 24;
        const ang = t * Math.PI * 5;
        const vxX = px + perpX * Math.cos(ang) * vortexR;
        const vxY = py + perpY * Math.sin(ang) * vortexR;
        const omenCols = ['#a855f7', '#67e8f9', '#c084fc', '#e0f2fe'];
        for (let k = 0; k < 3; k++) {
          const pShape = k === 0 ? 'wind' : k === 1 ? 'crystal' : 'wisp';
          this.particles.push({
            x: vxX + (Math.random() - 0.5) * 12,
            y: vxY + (Math.random() - 0.5) * 12,
            vx: (dx / dist) * 70 + (Math.random() - 0.5) * 35,
            vy: (dy / dist) * 70 + (Math.random() - 0.5) * 35,
            gravity: -20,
            life: 0,
            maxLife: 0.36 * Math.min(1.4, lifeScale),
            color: omenCols[(s + k) % omenCols.length],
            size: pShape === 'wind' ? 8.5 : 5.5,
            rotation: ang + k * 0.8,
            spin: 9,
            shape: pShape,
          });
        }
        if (s < steps - 1) await this.wait(stepWaitMs, sessionId);
        continue;
      }

      if (move.id === 'doom_desire') {
        const sigilY = Math.max(22, target.y - 76);
        if (t < 0.48) {
          const sigilR = 30;
          const vAng = (s % 5) * ((Math.PI * 2) / 5) - Math.PI * 0.5;
          this.particles.push({
            x: target.x + Math.cos(vAng) * sigilR,
            y: sigilY + Math.sin(vAng) * sigilR * 0.62,
            vx: 0,
            vy: 0,
            gravity: 0,
            life: 0,
            maxLife: 0.4 * Math.min(1.4, lifeScale),
            color: s % 2 === 0 ? '#fde047' : '#38bdf8',
            size: 6.5,
            rotation: vAng,
            spin: 6,
            shape: 'star',
          });
          if (s % 3 === 0) {
            this.particles.push({
              x: target.x,
              y: sigilY,
              vx: 0,
              vy: 0,
              gravity: 0,
              life: 0,
              maxLife: 0.34 * Math.min(1.4, lifeScale),
              color: '#fef08a',
              size: 14,
              maxRadius: 42,
              lineWidth: 2.5,
              shape: 'ring',
            });
          }
        } else {
          this.particles.push({
            x: target.x,
            y: target.y,
            vx: 0,
            vy: 0,
            gravity: 0,
            life: 0,
            maxLife: 0.24 * Math.min(1.4, lifeScale),
            color: '#fde047',
            size: 28,
            shape: 'beam',
          });
          for (let k = 0; k < 3; k++) {
            this.particles.push({
              x: target.x + (Math.random() - 0.5) * 24,
              y: sigilY + Math.random() * 76,
              vx: (Math.random() - 0.5) * 45,
              vy: 145 + Math.random() * 80,
              gravity: 0,
              life: 0,
              maxLife: 0.3 * Math.min(1.4, lifeScale),
              color: k === 0 ? '#ffffff' : k === 1 ? '#fde047' : '#38bdf8',
              size: 5 + Math.random() * 2.5,
              rotation: k,
              spin: 8,
              shape: 'star',
            });
          }
        }
        if (s < steps - 1) await this.wait(stepWaitMs, sessionId);
        continue;
      }

      if (this._emitSprint8StreamStep(move, s, steps, t, px, py, start, target, dx, dy, dist, perpX, perpY, lifeScale)) {
        if (s < steps - 1) await this.wait(stepWaitMs, sessionId);
        continue;
      }
      if (this._emitSprint6StreamStep(move, s, steps, t, px, py, start, target, dx, dy, dist, perpX, perpY, lifeScale)) {
        if (s < steps - 1) await this.wait(stepWaitMs, sessionId);
        continue;
      }
      if (this._emitSprint7StreamStep(move, s, steps, t, px, py, start, target, dx, dy, dist, perpX, perpY, lifeScale)) {
        if (s < steps - 1) await this.wait(stepWaitMs, sessionId);
        continue;
      }

      if (move.id === 'shadow_pulse' && s % 3 === 0) {
        this.particles.push({
          x: px,
          y: py,
          vx: (dx / dist) * 85,
          vy: (dy / dist) * 85,
          gravity: 0,
          life: 0,
          maxLife: 0.36 * Math.min(1.4, lifeScale),
          color: s % 2 === 0 ? '#a855f7' : '#c084fc',
          size: 8,
          maxRadius: 34 + t * 22,
          lineWidth: 2.8,
          shape: 'ring',
        });
      }

      const burstCount = shape === 'leaf' ? 3 : 4;
      for (let k = 0; k < burstCount; k++) {
        const spread = (Math.random() - 0.5) * 18;
        const speed = 55 + Math.random() * 75;
        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.38;
        let particleShape = shape;
        let particleColor = k === 0 && shape !== 'leaf' ? '#ffffff' : typeMeta.color;

        if (move.id === 'star_melody') {
          particleShape = k % 2 === 0 ? 'note' : 'star';
          const melodyCols = ['#fde047', '#f472b6', '#38bdf8', '#ffffff'];
          particleColor = melodyCols[(s + k) % melodyCols.length];
        } else if (move.id === 'hyper_nova') {
          particleShape = 'star';
          const novaCols = ['#fde047', '#c084fc', '#38bdf8', '#ffffff'];
          particleColor = novaCols[(s + k) % novaCols.length];
        } else if (move.id === 'moonblast') {
          particleShape = k === 0 ? 'crescent' : k % 2 === 0 ? 'star' : 'wisp';
          const moonCols = ['#f472b6', '#e879f9', '#c084fc', '#fef08a'];
          particleColor = moonCols[(s + k) % moonCols.length];
        } else if (move.id === 'shadow_pulse') {
          particleShape = 'wisp';
          const ghostCols = ['#a855f7', '#7e22ce', '#c084fc', '#e9d5ff'];
          particleColor = ghostCols[(s + k) % ghostCols.length];
        } else if (move.id === 'aurora_flare') {
          particleShape = k % 2 === 0 ? 'crystal' : 'star';
          const auroraCols = ['#67e8f9', '#a7f3d0', '#f472b6', '#ffffff'];
          particleColor = auroraCols[(s + k) % auroraCols.length];
        } else if (move.id === 'petal_blizzard' && k % 2 === 1) {
          particleColor = '#f9a8d4';
        }

        this.particles.push({
          x: px + spread,
          y: py + (Math.random() - 0.5) * 16,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (particleShape === 'bubble' || particleShape === 'ember' || particleShape === 'wisp' || particleShape === 'note' || particleShape === 'feather' ? 32 : 0),
          gravity: particleShape === 'bubble' || particleShape === 'ember' || particleShape === 'wisp' || particleShape === 'note' || particleShape === 'feather' ? -55 : 22,
          life: 0,
          maxLife: (0.34 + Math.random() * 0.18) * Math.min(1.4, lifeScale),
          color: particleColor,
          size: particleShape === 'leaf' ? 8 : move.id === 'hyper_nova' || move.id === 'moonblast' ? 6.5 + Math.random() * 3.5 : 5 + Math.random() * 3.5,
          rotation: angle,
          spin: particleShape === 'leaf' || particleShape === 'crystal' ? 10 : 4,
          shape: particleShape,
        });
      }
      if (s < steps - 1) {
        await this.wait(stepWaitMs, sessionId);
      }
    }
  }

  _emitSprint6StreamStep(move, s, steps, t, px, py, start, target, dx, dy, dist, perpX, perpY, lifeScale) {
    const id = move.id;
    const angle = Math.atan2(dy, dx);
    if (id === 'frenzy_flora') {
      const vortexR = 10 + Math.sin(t * Math.PI) * 26;
      const spinAng = t * Math.PI * 5;
      const cols = ['#22c55e', '#4ade80', '#fde047', '#bbf7d0'];
      for (let k = 0; k < 3; k++) {
        const phi = spinAng + (k * Math.PI * 2) / 3;
        this.particles.push({
          x: px + perpX * Math.cos(phi) * vortexR,
          y: py + perpY * Math.sin(phi) * vortexR - k * 4,
          vx: (dx / dist) * 65 + (Math.random() - 0.5) * 30,
          vy: (dy / dist) * 65 - 24,
          gravity: 10,
          life: 0,
          maxLife: 0.36 * Math.min(1.4, lifeScale),
          color: cols[(s + k) % cols.length],
          size: k === 0 ? 9 : 6.5,
          rotation: phi,
          spin: 11,
          shape: k === 0 ? 'wind' : 'leaf',
        });
      }
      return true;
    }

    if (id === 'spore_burst') {
      const cols = ['#2dd4bf', '#f472b6', '#a7f3d0', '#fbcfe8'];
      for (let k = 0; k < 3; k++) {
        const drift = Math.sin(t * Math.PI * 3 + k * 2.1) * 18;
        this.particles.push({
          x: px + perpX * drift + (Math.random() - 0.5) * 14,
          y: py + perpY * drift + (Math.random() - 0.5) * 14,
          vx: (dx / dist) * 42 + (Math.random() - 0.5) * 24,
          vy: -18 - Math.random() * 28,
          gravity: -30,
          life: 0,
          maxLife: 0.44 * Math.min(1.4, lifeScale),
          color: cols[(s + k) % cols.length],
          size: 5.5 + (k % 2) * 2,
          shape: k === 2 ? 'star' : 'spore',
        });
      }
      return true;
    }

    if (id === 'fiery_dance') {
      const wingSpan = Math.sin(t * Math.PI * 3.5) * 26;
      const cols = ['#ef4444', '#fb923c', '#fde047'];
      [-1, 1].forEach((wingSide, idx) => {
        this.particles.push({
          x: px + perpX * wingSpan * wingSide,
          y: py + perpY * wingSpan * wingSide,
          vx: Math.cos(angle) * 52,
          vy: Math.sin(angle) * 52 - 18,
          gravity: -45,
          life: 0,
          maxLife: 0.36 * Math.min(1.4, lifeScale),
          color: cols[(s + idx) % cols.length],
          size: idx === 0 ? 8 : 6.5,
          rotation: angle + wingSide * 0.45,
          spin: wingSide * 6,
          shape: s % 3 === 0 ? 'wind' : 'ember',
        });
      });
      return true;
    }

    if (id === 'hydro_vortex') {
      const helix = Math.sin(t * Math.PI * 5) * 20;
      const cols = ['#38bdf8', '#22d3ee', '#e0f2fe', '#0284c7'];
      for (let k = 0; k < 3; k++) {
        const dir = k === 0 ? 1 : k === 1 ? -1 : 0;
        this.particles.push({
          x: px + perpX * helix * dir,
          y: py + perpY * helix * dir,
          vx: (dx / dist) * 68,
          vy: (dy / dist) * 68 - 10,
          gravity: -18,
          life: 0,
          maxLife: 0.34 * Math.min(1.4, lifeScale),
          color: cols[(s + k) % cols.length],
          size: k === 2 ? 9 : 6,
          rotation: angle + helix * 0.03,
          spin: 8,
          shape: k === 2 ? 'wind' : 'bubble',
        });
      }
      return true;
    }

    if (id === 'plasma_cannon') {
      const beamX = start.x + dx * t;
      const beamY = start.y + dy * t;
      this.particles.push({
        x: beamX,
        y: beamY,
        vx: Math.cos(angle) * 90,
        vy: Math.sin(angle) * 90,
        gravity: 0,
        life: 0,
        maxLife: 0.24 * Math.min(1.4, lifeScale),
        color: s % 2 === 0 ? '#22d3ee' : '#fde047',
        size: 10,
        length: 34,
        rotation: angle,
        shape: 'ray',
      });
      this.particles.push({
        x: beamX + perpX * (Math.random() - 0.5) * 14,
        y: beamY + perpY * (Math.random() - 0.5) * 14,
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
        gravity: 0,
        life: 0,
        maxLife: 0.24 * Math.min(1.4, lifeScale),
        color: s % 3 === 0 ? '#ffffff' : '#fde047',
        size: 7,
        rotation: angle + (Math.random() - 0.5) * 0.6,
        shape: 'lightning',
      });
      return true;
    }

    if (id === 'prism_laser') {
      const prismCols = ['#ef4444', '#fde047', '#22c55e', '#38bdf8', '#a855f7', '#f472b6'];
      const beamX = start.x + dx * t;
      const beamY = start.y + dy * t;
      [-10, 0, 10].forEach((lane, idx) => {
        this.particles.push({
          x: beamX + perpX * lane,
          y: beamY + perpY * lane,
          vx: Math.cos(angle) * 85,
          vy: Math.sin(angle) * 85,
          gravity: 0,
          life: 0,
          maxLife: 0.26 * Math.min(1.4, lifeScale),
          color: prismCols[(s + idx * 2) % prismCols.length],
          size: idx === 1 ? 9 : 5.5,
          length: 30,
          rotation: angle + (idx - 1) * 0.06,
          shape: 'ray',
        });
      });
      if (s % 2 === 0) {
        this.particles.push({
          x: beamX + (Math.random() - 0.5) * 18,
          y: beamY + (Math.random() - 0.5) * 18,
          vx: (Math.random() - 0.5) * 45,
          vy: (Math.random() - 0.5) * 45,
          gravity: 0,
          life: 0,
          maxLife: 0.32 * Math.min(1.4, lifeScale),
          color: prismCols[s % prismCols.length],
          size: 6,
          rotation: angle,
          spin: 9,
          shape: 'crystal',
        });
      }
      return true;
    }

    if (id === 'spectral_lantern') {
      const orbWave = Math.sin(t * Math.PI * 3.5) * 20;
      const cols = ['#a855f7', '#2dd4bf', '#c084fc'];
      [-1, 1].forEach((dir, idx) => {
        this.particles.push({
          x: px + perpX * orbWave * dir,
          y: py + perpY * orbWave * dir,
          vx: Math.cos(angle) * 48,
          vy: Math.sin(angle) * 48 - 14,
          gravity: -25,
          life: 0,
          maxLife: 0.38 * Math.min(1.4, lifeScale),
          color: cols[(s + idx) % cols.length],
          size: idx === 0 ? 7.5 : 5.5,
          shape: idx === 0 ? 'spore' : 'wisp',
        });
      });
      return true;
    }

    if (id === 'night_daze') {
      const cols = ['#9333ea', '#f43f5e', '#c084fc'];
      if (s % 2 === 0) {
        this.particles.push({
          x: px,
          y: py,
          vx: (dx / dist) * 75,
          vy: (dy / dist) * 75,
          gravity: 0,
          life: 0,
          maxLife: 0.32 * Math.min(1.4, lifeScale),
          color: cols[s % cols.length],
          size: 9,
          maxRadius: 36 + t * 24,
          lineWidth: 2.8,
          shape: 'ring',
        });
      }
      for (let k = 0; k < 2; k++) {
        this.particles.push({
          x: px + perpX * (k === 0 ? -12 : 12),
          y: py + perpY * (k === 0 ? -12 : 12),
          vx: Math.cos(angle) * 65,
          vy: Math.sin(angle) * 65,
          gravity: 0,
          life: 0,
          maxLife: 0.28 * Math.min(1.4, lifeScale),
          color: cols[(s + k) % cols.length],
          size: 8.5,
          rotation: angle,
          spin: k === 0 ? 6 : -6,
          shape: 'crescent',
        });
      }
      return true;
    }

    return false;
  }

  _emitSprint7StreamStep(move, s, steps, t, px, py, start, target, dx, dy, dist, perpX, perpY, lifeScale) {
    const id = move.id;
    const angle = Math.atan2(dy, dx);

    if (id === 'inferno_overdrive') {
      const helix = Math.sin(t * Math.PI * 4.5) * 18;
      const cols = ['#fde047', '#fb923c', '#ef4444'];
      [-1, 1].forEach((dir, idx) => {
        this.particles.push({
          x: px + perpX * helix * dir,
          y: py + perpY * helix * dir,
          vx: Math.cos(angle) * 65,
          vy: Math.sin(angle) * 65 - 16,
          gravity: -42,
          life: 0,
          maxLife: 0.34 * Math.min(1.4, lifeScale),
          color: cols[(s + idx) % cols.length],
          size: idx === 0 ? 8 : 6.5,
          rotation: angle + dir * 0.4,
          spin: dir * 8,
          shape: s % 3 === 0 ? 'wave_arc' : 'ember',
        });
      });
      return true;
    }

    if (id === 'abyssal_geyser') {
      const wave = Math.sin(t * Math.PI * 4) * 18;
      this.particles.push({
        x: px + perpX * wave,
        y: py + perpY * wave,
        vx: (dx / dist) * 64,
        vy: (dy / dist) * 64 - 12,
        gravity: -24,
        life: 0,
        maxLife: 0.34 * Math.min(1.4, lifeScale),
        color: s % 2 === 0 ? '#06b6d4' : '#cffafe',
        size: 8.5,
        rotation: angle,
        spin: 7,
        shape: s % 2 === 0 ? 'wave_arc' : 'bubble',
      });
      return true;
    }

    if (id === 'ion_tempest') {
      const beamX = start.x + dx * t;
      const beamY = start.y + dy * t;
      this.particles.push({
        x: beamX,
        y: beamY,
        vx: Math.cos(angle) * 92,
        vy: Math.sin(angle) * 92,
        gravity: 0,
        life: 0,
        maxLife: 0.24 * Math.min(1.4, lifeScale),
        color: s % 2 === 0 ? '#38bdf8' : '#fde047',
        size: 9.5,
        length: 34,
        rotation: angle,
        shape: 'ray',
      });
      this.particles.push({
        x: beamX + perpX * (Math.random() - 0.5) * 18,
        y: beamY + perpY * (Math.random() - 0.5) * 18,
        vx: (Math.random() - 0.5) * 44,
        vy: (Math.random() - 0.5) * 44,
        gravity: 0,
        life: 0,
        maxLife: 0.25 * Math.min(1.4, lifeScale),
        color: s % 2 === 0 ? '#fde047' : '#ffffff',
        size: 7.5,
        rotation: angle + (Math.random() - 0.5) * 0.6,
        shape: 'lightning',
      });
      return true;
    }

    if (id === 'chrono_cannon') {
      const beamX = start.x + dx * t;
      const beamY = start.y + dy * t;
      this.particles.push({
        x: beamX,
        y: beamY,
        vx: Math.cos(angle) * 64,
        vy: Math.sin(angle) * 64,
        gravity: 0,
        life: 0,
        maxLife: 0.34 * Math.min(1.4, lifeScale),
        color: s % 2 === 0 ? '#fde047' : '#c084fc',
        size: 8.5,
        rotation: angle + t * 5,
        spin: s % 2 === 0 ? 10 : -10,
        shape: s % 2 === 0 ? 'gear' : 'sigil',
      });
      if (s % 3 === 0) {
        this.particles.push({
          x: beamX,
          y: beamY,
          vx: 0,
          vy: 0,
          gravity: 0,
          life: 0,
          maxLife: 0.3 * Math.min(1.4, lifeScale),
          color: '#f59e0b',
          size: 10,
          maxRadius: 34,
          lineWidth: 2.6,
          shape: 'ring',
        });
      }
      return true;
    }

    if (id === 'polar_lance') {
      [-12, 0, 12].forEach((lane, idx) => {
        this.particles.push({
          x: start.x + perpX * lane + dx * t,
          y: start.y + perpY * lane + dy * t,
          vx: Math.cos(angle) * 110,
          vy: Math.sin(angle) * 110,
          gravity: 0,
          life: 0,
          maxLife: 0.26 * Math.min(1.4, lifeScale),
          color: (s + idx) % 2 === 0 ? '#67e8f9' : '#e0f2fe',
          size: idx === 1 ? 10 : 7,
          rotation: angle,
          spin: idx === 1 ? 0 : 8,
          shape: idx === 1 ? 'lance' : 'hexagon',
        });
      });
      return true;
    }

    if (id === 'relic_hex') {
      const wave = Math.sin(t * Math.PI * 3.5) * 20;
      const cols = ['#a855f7', '#f59e0b', '#e9d5ff'];
      [-1, 1].forEach((dir, idx) => {
        this.particles.push({
          x: px + perpX * wave * dir,
          y: py + perpY * wave * dir,
          vx: Math.cos(angle) * 48,
          vy: Math.sin(angle) * 48 - 12,
          gravity: -20,
          life: 0,
          maxLife: 0.38 * Math.min(1.4, lifeScale),
          color: cols[(s + idx) % cols.length],
          size: 7.5,
          rotation: angle + t * 3,
          spin: 6,
          shape: idx === 0 ? 'sigil' : 'wisp',
        });
      });
      return true;
    }

    if (id === 'cosmos_supernova') {
      const beamX = start.x + dx * t;
      const beamY = start.y + dy * t;
      const helix = Math.sin(t * Math.PI * 5) * 18;
      this.particles.push({
        x: beamX,
        y: beamY,
        vx: Math.cos(angle) * 72,
        vy: Math.sin(angle) * 72,
        gravity: 0,
        life: 0,
        maxLife: 0.28 * Math.min(1.4, lifeScale),
        color: s % 2 === 0 ? '#f472b6' : '#fde047',
        size: 10 + t * 4,
        shape: 'orb',
      });
      [-1, 1].forEach((dir, idx) => {
        this.particles.push({
          x: px + perpX * helix * dir,
          y: py + perpY * helix * dir,
          vx: Math.cos(angle) * 52,
          vy: Math.sin(angle) * 52,
          gravity: 0,
          life: 0,
          maxLife: 0.34 * Math.min(1.4, lifeScale),
          color: idx === 0 ? '#6366f1' : '#fde047',
          size: 6.5,
          rotation: angle + t * 4,
          spin: 8,
          shape: idx === 0 ? 'dragonflame' : 'star',
        });
      });
      return true;
    }

    return false;
  }

  _emitSprint8StreamStep(move, s, steps, t, px, py, start, target, dx, dy, dist, perpX, perpY, lifeScale) {
    const id = move.id;
    const angle = Math.atan2(dy, dx);
    if (id === 'vacuum_wave') {
      const wave = Math.sin(t * Math.PI * 3) * 14;
      this.particles.push({
        x: px + perpX * wave,
        y: py + perpY * wave,
        vx: (dx / dist) * 115,
        vy: (dy / dist) * 115,
        gravity: 0,
        life: 0,
        maxLife: 0.34 * Math.min(1.4, lifeScale),
        color: s % 2 === 0 ? '#f87171' : '#bae6fd',
        size: 11,
        rotation: angle,
        spin: 0,
        shape: 'wave_arc',
      });
      return true;
    }

    if (id === 'air_slash') {
      [-12, 12].forEach((off, idx) => {
        this.particles.push({
          x: px + perpX * off,
          y: py + perpY * off,
          vx: (dx / dist) * 95,
          vy: (dy / dist) * 95,
          gravity: 0,
          life: 0,
          maxLife: 0.36 * Math.min(1.4, lifeScale),
          color: (s + idx) % 2 === 0 ? '#7dd3fc' : '#ffffff',
          size: idx === 0 ? 11 : 7,
          rotation: angle + (idx === 0 ? -0.35 : 0.35),
          spin: idx === 0 ? 4 : 9,
          shape: idx === 0 ? 'wind' : 'feather',
        });
      });
      return true;
    }

    if (id === 'sludge_wave') {
      const cols = ['#a855f7', '#4ade80', '#c084fc'];
      for (let k = -1; k <= 1; k++) {
        const swell = Math.sin(t * Math.PI * 3 + k) * 18;
        this.particles.push({
          x: px + perpX * (swell + k * 12),
          y: py + perpY * (swell + k * 12),
          vx: (dx / dist) * 62,
          vy: (dy / dist) * 62 - 14,
          gravity: 40,
          life: 0,
          maxLife: 0.42 * Math.min(1.4, lifeScale),
          color: cols[(s + k + 1) % cols.length],
          size: k === 0 ? 8 : 6,
          rotation: angle,
          spin: 3,
          shape: k === 0 ? 'venom' : 'bubble',
        });
      }
      return true;
    }

    if (id === 'malignant_chain') {
      const chainX = start.x + dx * t;
      const chainY = start.y + dy * t + Math.sin(t * Math.PI * 5) * 14;
      this.particles.push({
        x: chainX,
        y: chainY,
        vx: (dx / dist) * 55,
        vy: (dy / dist) * 55,
        gravity: 0,
        life: 0,
        maxLife: 0.42 * Math.min(1.4, lifeScale),
        color: s % 2 === 0 ? '#c084fc' : '#f43f5e',
        size: 7.5,
        rotation: angle + s * 0.6,
        spin: 8,
        shape: s % 3 === 0 ? 'venom' : 'sigil',
      });
      return true;
    }

    if (id === 'earth_power') {
      const gx = start.x + dx * Math.min(1, t * 1.05);
      const gy = target.y + 34 - t * 28;
      this.particles.push({
        x: gx + (Math.random() - 0.5) * 26,
        y: gy,
        vx: (Math.random() - 0.5) * 32,
        vy: -135 - Math.random() * 55,
        gravity: 95,
        life: 0,
        maxLife: 0.44 * Math.min(1.4, lifeScale),
        color: s % 3 === 0 ? '#fde047' : s % 2 === 0 ? '#ef4444' : '#d97706',
        size: 7.5,
        rotation: Math.random() * Math.PI,
        spin: 6,
        shape: s % 2 === 0 ? 'ember' : 'stone',
      });
      return true;
    }

    if (id === 'bug_buzz') {
      if (s % 2 === 0) {
        this.particles.push({
          x: px,
          y: py,
          vx: (dx / dist) * 90,
          vy: (dy / dist) * 90,
          gravity: 0,
          life: 0,
          maxLife: 0.34 * Math.min(1.4, lifeScale),
          color: s % 4 === 0 ? '#84cc16' : '#34d399',
          size: 10,
          maxRadius: 34 + t * 22,
          lineWidth: 2.8,
          shape: 'ring',
        });
      }
      this.particles.push({
        x: px + perpX * Math.sin(t * Math.PI * 4) * 14,
        y: py + perpY * Math.sin(t * Math.PI * 4) * 14,
        vx: (dx / dist) * 80,
        vy: (dy / dist) * 80,
        gravity: 0,
        life: 0,
        maxLife: 0.34 * Math.min(1.4, lifeScale),
        color: '#bef264',
        size: 8.5,
        rotation: angle,
        spin: 0,
        shape: 'wave_arc',
      });
      return true;
    }

    if (id === 'flash_cannon') {
      const beamX = start.x + dx * t;
      const beamY = start.y + dy * t;
      [-10, 0, 10].forEach((off, idx) => {
        this.particles.push({
          x: beamX + perpX * off,
          y: beamY + perpY * off,
          vx: (dx / dist) * 115,
          vy: (dy / dist) * 115,
          gravity: 0,
          life: 0,
          maxLife: 0.28 * Math.min(1.4, lifeScale),
          color: idx === 1 ? '#ffffff' : s % 2 === 0 ? '#38bdf8' : '#e2e8f0',
          size: idx === 1 ? 8 : 6,
          length: 26,
          rotation: angle,
          spin: 0,
          shape: idx === 1 ? 'ray' : 'crystal',
        });
      });
      return true;
    }

    if (id === 'dark_pulse') {
      if (s % 2 === 0) {
        this.particles.push({
          x: px,
          y: py,
          vx: (dx / dist) * 84,
          vy: (dy / dist) * 84,
          gravity: 0,
          life: 0,
          maxLife: 0.38 * Math.min(1.4, lifeScale),
          color: s % 4 === 0 ? '#7e22ce' : '#6366f1',
          size: 10,
          maxRadius: 36 + t * 24,
          lineWidth: 3.0,
          shape: 'ring',
        });
      }
      this.particles.push({
        x: px + (Math.random() - 0.5) * 18,
        y: py + (Math.random() - 0.5) * 18,
        vx: (dx / dist) * 72,
        vy: (dy / dist) * 72,
        gravity: -12,
        life: 0,
        maxLife: 0.36 * Math.min(1.4, lifeScale),
        color: s % 2 === 0 ? '#c084fc' : '#818cf8',
        size: 7.5,
        rotation: angle,
        spin: 7,
        shape: 'crescent',
      });
      return true;
    }

    if (id === 'dazzling_gleam') {
      const cols = ['#f472b6', '#fde047', '#ffffff', '#c084fc'];
      for (let k = -1; k <= 1; k++) {
        this.particles.push({
          x: px + perpX * k * 14,
          y: py + perpY * k * 14,
          vx: (dx / dist) * 85 + (Math.random() - 0.5) * 35,
          vy: (dy / dist) * 85 + (Math.random() - 0.5) * 35,
          gravity: -16,
          life: 0,
          maxLife: 0.38 * Math.min(1.4, lifeScale),
          color: cols[(s + k + 1) % cols.length],
          size: k === 0 ? 7.5 : 5.5,
          rotation: angle + k * 0.6,
          spin: 9,
          shape: k === 0 ? 'star' : 'crystal',
        });
      }
      return true;
    }

    if (id === 'water_shuriken') {
      const lane = (s % 3) - 1;
      this.particles.push({
        x: start.x + dx * t + perpX * lane * 12,
        y: start.y + dy * t + perpY * lane * 12,
        vx: (dx / dist) * 145,
        vy: (dy / dist) * 145,
        gravity: 0,
        life: 0,
        maxLife: 0.32 * Math.min(1.4, lifeScale),
        color: s % 2 === 0 ? '#38bdf8' : '#e0f2fe',
        size: 8,
        rotation: angle,
        spin: 18,
        shape: 'shuriken',
      });
      return true;
    }

    if (id === 'electro_drift') {
      const zigzag = ((s % 2 === 0 ? 1 : -1) * 18) * (1 - Math.abs(t - 0.5));
      const bx = start.x + dx * t + perpX * zigzag;
      const by = start.y + dy * t + perpY * zigzag;
      this.particles.push({
        x: bx,
        y: by,
        vx: (dx / dist) * 110,
        vy: (dy / dist) * 110,
        gravity: 0,
        life: 0,
        maxLife: 0.3 * Math.min(1.4, lifeScale),
        color: s % 3 === 0 ? '#a855f7' : s % 2 === 0 ? '#22d3ee' : '#fde047',
        size: 8,
        length: 28,
        rotation: angle,
        spin: 8,
        shape: s % 2 === 0 ? 'lightning' : 'ray',
      });
      return true;
    }

    return false;
  }

  spawnStarBurst(center) {
    const colors = ['#fde047', '#f472b6', '#38bdf8', '#4ade80', '#ffffff'];
    this.particles.push({
      x: center.x,
      y: center.y,
      vx: 0,
      vy: 0,
      gravity: 0,
      life: 0,
      maxLife: 0.45,
      color: '#fde047',
      size: 14,
      maxRadius: 112,
      shape: 'ring',
    });

    for (let i = 0; i < 40; i++) {
      const angle = (Math.PI * 2 * i) / 40 + Math.random() * 0.25;
      const speed = 95 + Math.random() * 175;
      this.particles.push({
        x: center.x,
        y: center.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 48,
        gravity: 165,
        life: 0,
        maxLife: 0.72 + Math.random() * 0.38,
        color: colors[i % colors.length],
        size: 4.5 + Math.random() * 4.5,
        rotation: angle,
        spin: 8,
        shape: 'star',
      });
    }
  }

  spawnCelebrationConfetti({
    center = null,
    colors = null,
    ringColors = null,
    rings = true,
    waves = 2,
    countPerWave = 28,
    spreadX = 140,
  } = {}) {
    const fallbackW = this.fxCanvas?.width || 480;
    const fallbackH = this.fxCanvas?.height || 260;
    const origin = center && Number.isFinite(center.x) && Number.isFinite(center.y)
      ? center
      : { x: fallbackW * 0.5, y: fallbackH * 0.48 };
    const palette = Array.isArray(colors) && colors.length > 0
      ? colors
      : ['#fde047', '#38bdf8', '#f472b6', '#4ade80', '#c084fc', '#ffffff'];

    if (rings) {
      const rPalette = Array.isArray(ringColors) && ringColors.length > 0
        ? ringColors
        : ['#fde047', '#38bdf8', '#f472b6'];
      rPalette.forEach((col, idx) => {
        this.particles.push({
          x: origin.x,
          y: origin.y,
          vx: 0,
          vy: 0,
          gravity: 0,
          life: -(idx * 0.085),
          maxLife: 0.58,
          color: col,
          size: 16,
          maxRadius: 96 + idx * 38,
          lineWidth: 4.0 - idx * 0.7,
          shape: 'ring',
        });
      });
    }

    const totalWaves = Math.max(1, Math.min(3, Math.round(waves)));
    for (let wave = 0; wave < totalWaves; wave++) {
      const waveDelay = wave * 0.19;
      const count = Math.max(8, countPerWave);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
        const speed = (wave === 0 ? 105 : 135) + Math.random() * 145;
        const offsetX = wave === 0 ? (Math.random() - 0.5) * 18 : (Math.random() - 0.5) * spreadX;
        const offsetY = wave === 0 ? (Math.random() - 0.5) * 14 : -12 + (Math.random() - 0.5) * 28;
        const isStar = i % 3 === 0;
        this.particles.push({
          x: origin.x + offsetX,
          y: origin.y + offsetY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (wave === 0 ? 75 : 105),
          gravity: isStar ? 140 : 185,
          drag: 0.975,
          life: -(waveDelay + i * 0.004),
          maxLife: (isStar ? 0.85 : 1.05) + Math.random() * 0.3,
          color: palette[(i + wave) % palette.length],
          size: isStar ? 4.5 + Math.random() * 3.5 : 4.2 + Math.random() * 2.8,
          rotation: Math.random() * Math.PI * 2,
          spin: (i % 2 === 0 ? 1 : -1) * (6 + Math.random() * 6),
          flutterSpeed: 10 + Math.random() * 8,
          shape: isStar ? 'star' : 'confetti',
        });
      }
    }
  }

  spawnBuddyEndureBurst(side = 'player') {
    const center = this.getSpriteCenter(side);
    const colors = ['#f472b6', '#fb7185', '#fde047', '#ffffff'];
    this.particles.push({
      x: center.x,
      y: center.y,
      vx: 0,
      vy: 0,
      gravity: 0,
      life: 0,
      maxLife: 0.48,
      color: '#f472b6',
      size: 14,
      maxRadius: 102,
      lineWidth: 3.6,
      shape: 'ring',
    });
    this.particles.push({
      x: center.x,
      y: center.y,
      vx: 0,
      vy: 0,
      gravity: 0,
      life: -0.06,
      maxLife: 0.48,
      color: '#fde047',
      size: 16,
      maxRadius: 124,
      lineWidth: 2.6,
      shape: 'ring',
    });

    for (let i = 0; i < 28; i++) {
      const angle = (Math.PI * 2 * i) / 28 + Math.random() * 0.22;
      const speed = 72 + Math.random() * 128;
      const isHeart = i % 2 === 0;
      this.particles.push({
        x: center.x + (Math.random() - 0.5) * 16,
        y: center.y + (Math.random() - 0.5) * 16,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 56,
        gravity: 48,
        life: -(i * 0.008),
        maxLife: 0.78 + Math.random() * 0.32,
        color: colors[i % colors.length],
        size: isHeart ? 7 + Math.random() * 3 : 4.5 + Math.random() * 3.5,
        rotation: isHeart ? 0 : angle,
        spin: isHeart ? 0 : 7,
        shape: isHeart ? 'heart' : 'star',
      });
    }

    this.spawnFloatingText(center.x, center.y - 34, 'ENDURED! 1 HP', '#f472b6', 22, 0, 1.55);
  }

  startFxLoop() {
    if (this.fxRaf !== null) {
      cancelAnimationFrame(this.fxRaf);
      this.fxRaf = null;
    }
    this.fxLoopCount += 1;
    const loopSid = this.sessionId;
    this.lastFxTime = performance.now();

    const frame = (now) => {
      if (!this.isSessionValid(loopSid)) {
        this.fxRaf = null;
        return;
      }
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFxTime) / 1000));
      this.lastFxTime = now;
      this.updateAndDrawFx(dt);
      this.fxRaf = requestAnimationFrame(frame);
    };
    this.fxRaf = requestAnimationFrame(frame);
  }

  updateAndDrawFx(dt) {
    if (this.shakeTimer > 0 && this.stageEl) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      const decay = this.shakeDuration > 0 ? this.shakeTimer / this.shakeDuration : 0;
      const mag = this.shakeIntensity * decay;
      const phase = performance.now() * 0.08;
      const dx = Math.round(Math.sin(phase * 1.9) * mag);
      const dy = Math.round(Math.cos(phase * 2.5) * mag * 0.75);
      this.stageEl.style.transform = this.shakeTimer > 0 ? `translate3d(${dx}px, ${dy}px, 0)` : '';
    }

    const ctx = this.fxCtx;
    if (!ctx || !this.fxCanvas) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.fxCanvas.width, this.fxCanvas.height);

    if (this.captureBeam && this.pokeballAnim) {
      const b = this.pokeballAnim;
      const t = this.captureBeam;
      const grad = ctx.createLinearGradient(b.x, b.y, t.x, t.y);
      if (b.isStar || b.ballStyle === 'star') {
        grad.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
        grad.addColorStop(0.35, 'rgba(192, 132, 252, 0.78)');
        grad.addColorStop(0.7, 'rgba(56, 189, 248, 0.48)');
        grad.addColorStop(1, 'rgba(168, 85, 247, 0.08)');
      } else if (b.isGreat || b.ballStyle === 'great') {
        grad.addColorStop(0, 'rgba(186, 230, 253, 0.92)');
        grad.addColorStop(0.5, 'rgba(14, 165, 233, 0.65)');
        grad.addColorStop(1, 'rgba(14, 165, 233, 0.08)');
      } else {
        grad.addColorStop(0, 'rgba(254, 202, 202, 0.92)');
        grad.addColorStop(0.5, 'rgba(239, 68, 68, 0.65)');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0.08)');
      }
      ctx.save();
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(b.x - 5, b.y + 4);
      ctx.lineTo(b.x + 5, b.y + 4);
      ctx.lineTo(t.x + 48, t.y + 18);
      ctx.lineTo(t.x - 48, t.y + 18);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    for (let i = (this.abilityStageFx?.length || 0) - 1; i >= 0; i--) {
      const fx = this.abilityStageFx[i];
      fx.life += dt;
      if (fx.life < 0) continue;
      if (fx.life >= fx.maxLife) {
        this.abilityStageFx.splice(i, 1);
        continue;
      }
      this.drawAbilityStageFx(ctx, fx);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life < 0) continue;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      if (p.orbitCenter) {
        p.orbitAngle += (p.orbitAngVel || 6) * dt;
        p.orbitRadius = Math.max(4, p.orbitRadius + (p.orbitRadialVel || -45) * dt);
        p.x = p.orbitCenter.x + Math.cos(p.orbitAngle) * p.orbitRadius;
        p.y = p.orbitCenter.y + Math.sin(p.orbitAngle) * p.orbitRadius * 0.72;
      } else if (p.pullTo) {
        p.x += (p.pullTo.x - p.x) * Math.min(1, dt * 8.5);
        p.y += (p.pullTo.y - p.y) * Math.min(1, dt * 8.5);
      } else {
        if (p.drag) {
          p.vx *= Math.pow(p.drag, dt * 60);
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += (p.gravity ?? 180) * dt;
      }
      if (p.spin) {
        p.rotation = (p.rotation || 0) + p.spin * dt;
      }

      const progress = p.life / p.maxLife;
      const alpha = Math.max(0, 1 - progress);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);

      if (p.shape === 'ring') {
        const radius = Math.max(2, p.size + (p.maxRadius - p.size) * (1 - Math.pow(1 - progress, 2)));
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1.5, (p.lineWidth || 4) * (1 - progress));
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.shape === 'crescent') {
        ctx.rotate(p.rotation || 0);
        const r = p.size * (1 + progress * 0.25);
        const x0 = Math.cos(-Math.PI * 0.65) * r;
        const y0 = Math.sin(-Math.PI * 0.65) * r;
        ctx.fillStyle = p.color || '#f472b6';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI * 0.65, Math.PI * 0.65, false);
        ctx.quadraticCurveTo(r * 0.28, 0, x0, y0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (p.shape === 'lightning') {
        ctx.rotate(p.rotation || 0);
        const len = p.size * (1.75 + progress * 0.55);
        ctx.strokeStyle = p.color || '#fde047';
        ctx.lineWidth = Math.max(1.8, 3.6 * (1 - progress * 0.5));
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-len * 0.45, -len * 0.85);
        ctx.lineTo(len * 0.16, -len * 0.18);
        ctx.lineTo(-len * 0.18, len * 0.18);
        ctx.lineTo(len * 0.48, len * 0.88);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, 1.5 * (1 - progress * 0.5));
        ctx.stroke();
      } else if (p.shape === 'stone') {
        ctx.rotate(p.rotation || 0);
        const s = p.size;
        ctx.fillStyle = p.color || '#94a3b8';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-s * 0.82, -s * 0.38);
        ctx.lineTo(0, -s);
        ctx.lineTo(s * 0.9, -s * 0.28);
        ctx.lineTo(s * 0.62, s * 0.85);
        ctx.lineTo(-s * 0.65, s * 0.76);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (p.shape === 'ember' || p.shape === 'dragonflame') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (1 - progress * 0.3), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = p.shape === 'dragonflame' ? '#e0e7ff' : '#fef08a';
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.48, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'crystal') {
        ctx.rotate(p.rotation || 0);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, -p.size * 1.35);
        ctx.lineTo(p.size * 0.78, 0);
        ctx.lineTo(0, p.size * 1.35);
        ctx.lineTo(-p.size * 0.78, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (p.shape === 'wisp') {
        const wobble = Math.sin(p.life * 14) * 3;
        ctx.translate(wobble, 0);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (1 - progress * 0.25), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(243, 232, 255, 0.75)';
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'bubble') {
        const wobble = Math.sin(p.life * 16) * 2;
        ctx.translate(wobble, 0);
        ctx.fillStyle = 'rgba(125, 211, 252, 0.42)';
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-p.size * 0.32, -p.size * 0.32, Math.max(1.2, p.size * 0.25), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'leaf') {
        ctx.rotate(p.rotation || 0);
        ctx.fillStyle = p.color && p.color !== '#ffffff' ? p.color : '#22c55e';
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(p.size, 0);
        ctx.quadraticCurveTo(0, -p.size * 0.65, -p.size, 0);
        ctx.quadraticCurveTo(0, p.size * 0.65, p.size, 0);
        ctx.fill();
        ctx.stroke();
      } else if (p.shape === 'slash') {
        ctx.rotate(p.rotation || 0);
        const len = p.size * (1.4 + progress * 1.3);
        const thick = Math.max(1.2, p.size * 0.4 * (1 - progress * 0.68));
        ctx.fillStyle = p.color || '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-len, 0);
        ctx.quadraticCurveTo(0, -thick, len, 0);
        ctx.quadraticCurveTo(0, thick * 0.42, -len, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-len * 0.72, 0);
        ctx.quadraticCurveTo(0, -thick * 0.45, len * 0.72, 0);
        ctx.quadraticCurveTo(0, thick * 0.16, -len * 0.72, 0);
        ctx.closePath();
        ctx.fill();
      } else if (p.shape === 'wind') {
        ctx.rotate(p.rotation || 0);
        const w = p.size * (1.65 + progress * 0.85);
        ctx.strokeStyle = p.color || '#e2e8f0';
        ctx.lineWidth = Math.max(1.4, 3.2 * (1 - progress * 0.6));
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-w, 0);
        ctx.quadraticCurveTo(-w * 0.25, -p.size * 0.75, w * 0.4, 0);
        ctx.quadraticCurveTo(w * 0.85, p.size * 0.55, w, -p.size * 0.2);
        ctx.stroke();
      } else if (p.shape === 'note') {
        const wobble = Math.sin(p.life * 10) * 0.14;
        ctx.rotate((p.rotation || 0) * 0.15 + wobble);
        const s = p.size;
        ctx.fillStyle = p.color || '#fde047';
        ctx.strokeStyle = p.color || '#fde047';
        ctx.beginPath();
        ctx.ellipse(-s * 0.24, s * 0.42, s * 0.52, s * 0.36, -0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = Math.max(1.6, s * 0.26);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(s * 0.18, s * 0.38);
        ctx.lineTo(s * 0.18, -s * 0.92);
        ctx.quadraticCurveTo(s * 0.82, -s * 0.7, s * 0.7, -s * 0.18);
        ctx.stroke();
      } else if (p.shape === 'dust') {
        const radius = p.size * (0.7 + progress * 0.9);
        ctx.globalAlpha = alpha * 0.65;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'bolt') {
        ctx.rotate(p.rotation || 0);
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(0, -p.size * 1.4);
        ctx.lineTo(p.size * 0.55, 0);
        ctx.lineTo(0, p.size * 1.4);
        ctx.lineTo(-p.size * 0.55, 0);
        ctx.closePath();
        ctx.fill();
      } else if (p.shape === 'orb') {
        const r = p.size * (1 - progress * 0.22);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.38)';
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = p.color || '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-r * 0.2, -r * 0.2, Math.max(1.5, r * 0.45), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'spore') {
        const pulse = 1 + Math.sin(p.life * 16) * 0.16;
        const r = Math.max(2, p.size * (1 - progress * 0.2) * pulse);
        ctx.fillStyle = p.color || '#2dd4bf';
        ctx.globalAlpha = alpha * 0.42;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-r * 0.2, -r * 0.2, Math.max(1.2, r * 0.42), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'lance') {
        ctx.rotate(p.rotation || 0);
        const len = p.size * 1.9;
        const halfW = Math.max(2, p.size * 0.36);
        ctx.fillStyle = p.color || '#67e8f9';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(len, 0);
        ctx.lineTo(-len * 0.55, -halfW);
        ctx.lineTo(-len * 0.85, 0);
        ctx.lineTo(-len * 0.55, halfW);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (p.shape === 'ray') {
        ctx.rotate(p.rotation || 0);
        const len = p.length || p.size * 3.4;
        const thick = Math.max(2, p.size * (1 - progress * 0.45));
        ctx.globalAlpha = alpha * 0.48;
        ctx.fillStyle = p.color || '#22d3ee';
        ctx.fillRect(-len * 0.5, -thick * 0.9, len, thick * 1.8);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-len * 0.5, -thick * 0.32, len, thick * 0.64);
      } else if (p.shape === 'beam') {
        const w = Math.max(4, p.size * (1 - progress * 0.55));
        ctx.fillStyle = 'rgba(253, 224, 71, 0.34)';
        ctx.fillRect(-w * 0.9, -180, w * 1.8, 225);
        ctx.fillStyle = p.color || '#fde047';
        ctx.fillRect(-w * 0.45, -180, w * 0.9, 225);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-w * 0.2, -180, w * 0.4, 225);
      } else if (p.shape === 'heart') {
        const s = p.size * (1 - progress * 0.18);
        ctx.fillStyle = p.color || '#f472b6';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.85);
        ctx.bezierCurveTo(-s * 1.25, s * 0.1, -s * 1.15, -s * 0.95, 0, -s * 0.32);
        ctx.bezierCurveTo(s * 1.15, -s * 0.95, s * 1.25, s * 0.1, 0, s * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (p.shape === 'gear') {
        ctx.rotate(p.rotation || p.life * 4);
        this._drawGearShape(ctx, p.size * 1.25, p.color || '#fde047', '#fef3c7', 8);
      } else if (p.shape === 'hexagon') {
        ctx.rotate(p.rotation || 0);
        this._drawHexagonShape(ctx, p.size * 1.25, p.color || '#67e8f9', '#ffffff');
      } else if (p.shape === 'petal') {
        ctx.rotate(p.rotation || 0);
        const s = p.size * 1.15;
        ctx.fillStyle = p.color || '#f472b6';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.bezierCurveTo(s * 0.9, -s * 0.45, s * 0.75, s * 0.65, 0, s);
        ctx.bezierCurveTo(-s * 0.75, s * 0.65, -s * 0.9, -s * 0.45, 0, -s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (p.shape === 'sigil') {
        ctx.rotate(p.rotation || 0);
        this._drawSigilShape(ctx, p.size * 1.35, p.color || '#c084fc');
      } else if (p.shape === 'wave_arc') {
        ctx.rotate(p.rotation || 0);
        const r = p.size * (1.2 + progress * 0.45);
        ctx.strokeStyle = p.color || '#38bdf8';
        ctx.lineWidth = Math.max(1.8, 3.8 * (1 - progress * 0.55));
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI * 0.42, Math.PI * 0.42);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, 1.5 * (1 - progress * 0.6));
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.78, -Math.PI * 0.32, Math.PI * 0.32);
        ctx.stroke();
      } else if (p.shape === 'shuriken') {
        ctx.rotate((p.rotation || 0) + p.life * 16);
        const r = p.size * (1.35 - progress * 0.15);
        ctx.fillStyle = p.color || '#38bdf8';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        for (let b = 0; b < 4; b++) {
          const a0 = (Math.PI * b) / 2;
          const aMid = a0 + Math.PI / 4;
          const xTip = Math.cos(a0) * r;
          const yTip = Math.sin(a0) * r;
          const xIn = Math.cos(aMid) * (r * 0.32);
          const yIn = Math.sin(aMid) * (r * 0.32);
          if (b === 0) ctx.moveTo(xTip, yTip);
          else ctx.lineTo(xTip, yTip);
          ctx.lineTo(xIn, yIn);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (p.shape === 'feather') {
        ctx.rotate(p.rotation || 0);
        const len = p.size * 1.65;
        const w = p.size * 0.52;
        ctx.fillStyle = p.color || '#bae6fd';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, len, w, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-len * 0.85, 0);
        ctx.lineTo(len * 0.85, 0);
        ctx.stroke();
      } else if (p.shape === 'venom') {
        ctx.rotate(p.rotation || 0);
        const s = p.size * (1.15 - progress * 0.12);
        ctx.fillStyle = p.color || '#a855f7';
        ctx.strokeStyle = '#e9d5ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -s * 1.25);
        ctx.bezierCurveTo(s * 0.85, -s * 0.1, s * 0.9, s * 0.95, 0, s * 1.15);
        ctx.bezierCurveTo(-s * 0.9, s * 0.95, -s * 0.85, -s * 0.1, 0, -s * 1.25);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (p.shape === 'confetti') {
        ctx.rotate((p.rotation || 0) + p.life * (p.spin || 8));
        const flutter = Math.cos(p.life * (p.flutterSpeed || 14));
        const w = p.size * 1.45;
        const h = Math.max(2, p.size * 0.72 * Math.abs(flutter));
        ctx.fillStyle = p.color || '#fde047';
        ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(-w * 0.5, -h * 0.5, w, Math.max(1, h * 0.35));
      } else if (p.shape === 'star' || p.star) {
        ctx.rotate(p.rotation || p.life * 6);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size, -p.size * 0.32, p.size * 2, p.size * 0.64);
        ctx.fillRect(-p.size * 0.32, -p.size, p.size * 0.64, p.size * 2);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (this.pokeballAnim) {
      this.drawPokeball(ctx, this.pokeballAnim);
    }

    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.life += dt;
      if (pop.life < 0) continue;
      if (pop.life >= pop.maxLife) {
        this.popups.splice(i, 1);
        continue;
      }
      pop.y += pop.vy * dt;
      pop.vy *= 0.94;
      const progress = pop.life / pop.maxLife;
      const popScale = progress < 0.14 ? 0.78 + (progress / 0.14) * 0.34 : 1.0;
      const alpha = Math.max(0, 1 - Math.pow(progress, 1.8));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(pop.x, pop.y);
      ctx.scale(popScale, popScale);
      ctx.font = `900 ${pop.size || 20}px ui-rounded, 'Trebuchet MS', system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = '#090d1a';
      ctx.strokeText(pop.text, 0, 0);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, 0, 0);
      ctx.restore();
    }
  }

  _drawGearShape(ctx, r, fillColor = '#fde047', strokeColor = '#fef3c7', teeth = 8) {
    const innerR = r * 0.74;
    const outerR = r * 1.12;
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const a0 = (Math.PI * 2 * i) / (teeth * 2);
      const a1 = (Math.PI * 2 * (i + 0.5)) / (teeth * 2);
      const rad = i % 2 === 0 ? outerR : innerR;
      const x0 = Math.cos(a0) * rad;
      const y0 = Math.sin(a0) * rad;
      const x1 = Math.cos(a1) * rad;
      const y1 = Math.sin(a1) * rad;
      if (i === 0) ctx.moveTo(x0, y0);
      else ctx.lineTo(x0, y0);
      ctx.lineTo(x1, y1);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(1.8, r * 0.32), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  _drawHexagonShape(ctx, r, fillColor = '#67e8f9', strokeColor = '#ffffff') {
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.save();
    ctx.globalAlpha *= 0.72;
    ctx.fill();
    ctx.restore();
    ctx.stroke();
  }

  _drawSigilShape(ctx, r, color = '#c084fc') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(-r * 0.68, -r * 0.68, r * 1.36, r * 1.36);
    ctx.save();
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-r * 0.62, -r * 0.62, r * 1.24, r * 1.24);
    ctx.restore();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(1.8, r * 0.24), 0, Math.PI * 2);
    ctx.fill();
  }

  drawAbilityStageFx(ctx, fx) {
    const progress = Math.max(0, Math.min(1, fx.life / Math.max(0.05, fx.maxLife)));
    const fade = Math.sin(Math.min(1, progress) * Math.PI);
    const cols = fx.colors || ['#fde047', '#38bdf8', '#ffffff'];
    const c0 = cols[0] || '#fde047';
    const c1 = cols[1] || c0;
    const c2 = cols[2] || '#ffffff';
    const x = fx.x;
    const y = fx.y;
    const pedY = Number.isFinite(fx.pedestalY) ? fx.pedestalY : y + 44;

    ctx.save();
    ctx.globalAlpha = Math.max(0.12, fade * 0.92);

    switch (fx.kind) {
      case 'clockwork_dial': {
        // Rotating golden clockwork dial, nested gears & sweeping hands
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = c0;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 56 + progress * 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = c2;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, 44, progress * 3, progress * 3 + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        // Sweeping clock hands
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(progress * 8) * 38, Math.sin(progress * 8) * 38);
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(-progress * 3.2 - 1.1) * 24, Math.sin(-progress * 3.2 - 1.1) * 24);
        ctx.stroke();
        // 3 interlocking gears
        [
          { gx: -46, gy: -34, r: 15, dir: 1, col: c1 },
          { gx: 48, gy: -28, r: 17, dir: -1, col: c0 },
          { gx: 36, gy: 38, r: 13, dir: 1, col: c2 },
        ].forEach((g) => {
          ctx.save();
          ctx.translate(g.gx, g.gy);
          ctx.rotate(g.dir * progress * 6.5);
          this._drawGearShape(ctx, g.r, g.col, '#fef3c7', 8);
          ctx.restore();
        });
        ctx.restore();
        break;
      }
      case 'hex_lattice': {
        // Interlocking 6-fold icy snowflake crystal lattice + radial frost spokes
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-progress * 1.4);
        ctx.strokeStyle = c0;
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const ang = (Math.PI / 3) * i;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(ang) * 52, Math.sin(ang) * 40);
          ctx.stroke();
          ctx.save();
          ctx.translate(Math.cos(ang) * 42, Math.sin(ang) * 32);
          ctx.rotate(ang + progress * 2);
          this._drawHexagonShape(ctx, 13, i % 2 === 0 ? c1 : c2, '#ffffff');
          ctx.restore();
        }
        ctx.restore();
        break;
      }
      case 'aurora_ribbons': {
        [0, 1].forEach((band) => {
          ctx.strokeStyle = band === 0 ? c0 : c2;
          ctx.lineWidth = 6 - band * 2;
          ctx.beginPath();
          for (let s = 0; s <= 12; s++) {
            const t = s / 12;
            const rx = x - 78 + t * 156;
            const ry = y - 54 + band * 16 + Math.sin(t * Math.PI * 2.5 + progress * 8 + band) * 14;
            if (s === 0) ctx.moveTo(rx, ry);
            else ctx.lineTo(rx, ry);
          }
          ctx.stroke();
        });
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(progress * 1.6);
        for (let i = 0; i < 4; i++) {
          const ang = (Math.PI / 2) * i + 0.4;
          ctx.save();
          ctx.translate(Math.cos(ang) * 44, Math.sin(ang) * 34);
          this._drawHexagonShape(ctx, 11, c1, '#ffffff');
          ctx.restore();
        }
        ctx.restore();
        break;
      }
      case 'rift_portal': {
        ctx.save();
        ctx.translate(x, y - 4);
        for (let ring = 0; ring < 3; ring++) {
          ctx.save();
          ctx.rotate((ring % 2 === 0 ? 1 : -1) * (progress * 5 + ring * 0.7));
          ctx.strokeStyle = cols[ring % cols.length];
          ctx.lineWidth = 3.2 - ring * 0.6;
          ctx.beginPath();
          ctx.ellipse(0, 0, 56 - ring * 12, 34 - ring * 7, 0.25 * ring, 0, Math.PI * 1.65);
          ctx.stroke();
          ctx.restore();
        }
        for (let sp = 0; sp < 6; sp++) {
          const ang = (Math.PI * 2 * sp) / 6 + progress * 4.5;
          ctx.strokeStyle = sp % 2 === 0 ? c0 : c2;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(ang) * 14, Math.sin(ang) * 10);
          ctx.lineTo(Math.cos(ang + 0.3) * 62, Math.sin(ang + 0.3) * 42);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case 'siphon_stream': {
        const hasTarget = Number.isFinite(fx.tx) && Number.isFinite(fx.ty) && Math.hypot(fx.tx - x, fx.ty - y) > 16;
        const sx = hasTarget ? fx.tx : x + 68;
        const sy = hasTarget ? fx.ty : y - 48;
        const ctrlX = (sx + x) * 0.5;
        const ctrlY = Math.min(sy, y) - 56;
        ctx.strokeStyle = c0;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(ctrlX, ctrlY, x, y);
        ctx.stroke();
        ctx.strokeStyle = c1;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy + 5);
        ctx.quadraticCurveTo(ctrlX, ctrlY + 12, x, y);
        ctx.stroke();
        for (let b = 0; b < 5; b++) {
          const bt = (progress * 1.4 + b * 0.18) % 1;
          const inv = 1 - bt;
          const bx = inv * inv * sx + 2 * inv * bt * ctrlX + bt * bt * x;
          const by = inv * inv * sy + 2 * inv * bt * ctrlY + bt * bt * y;
          ctx.fillStyle = b % 2 === 0 ? c1 : c0;
          ctx.beginPath();
          ctx.arc(bx, by, 5.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'flame_pillars': {
        [-44, 44].forEach((ox, idx) => {
          const px = x + ox;
          const colH = 74 + Math.sin(progress * Math.PI * 2) * 18;
          const grad = ctx.createLinearGradient(px, pedY, px, pedY - colH);
          grad.addColorStop(0, c0);
          grad.addColorStop(0.6, c1);
          grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(px - 14, pedY);
          ctx.quadraticCurveTo(px - 8 + Math.sin(progress * 14 + idx) * 8, pedY - colH * 0.55, px, pedY - colH);
          ctx.quadraticCurveTo(px + 8 - Math.sin(progress * 14 + idx) * 8, pedY - colH * 0.55, px + 14, pedY);
          ctx.closePath();
          ctx.fill();
        });
        break;
      }
      case 'solar_corona': {
        const coreR = 26 + progress * 34;
        ctx.strokeStyle = c0;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(x, y, coreR, 0, Math.PI * 2);
        ctx.stroke();
        for (let r = 0; r < 12; r++) {
          const ang = (Math.PI * 2 * r) / 12 + progress * 2.2;
          const len = coreR + 18 + (r % 2) * 14;
          ctx.strokeStyle = r % 2 === 0 ? c0 : c2;
          ctx.lineWidth = r % 2 === 0 ? 3.2 : 2;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(ang) * (coreR * 0.8), y + Math.sin(ang) * (coreR * 0.8));
          ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
          ctx.stroke();
        }
        break;
      }
      case 'armor_plates': {
        ctx.save();
        ctx.translate(x, y);
        for (let i = 0; i < 4; i++) {
          const ang = (Math.PI / 2) * i + progress * 2.6;
          ctx.save();
          ctx.rotate(ang);
          ctx.translate(46, 0);
          ctx.fillStyle = c2;
          ctx.strokeStyle = c0;
          ctx.lineWidth = 2.4;
          ctx.fillRect(-10, -18, 20, 36);
          ctx.strokeRect(-10, -18, 20, 36);
          ctx.strokeStyle = c1;
          ctx.beginPath();
          ctx.moveTo(-4, -12);
          ctx.lineTo(4, 12);
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
        break;
      }
      case 'pearl_dome':
      case 'scale_dome': {
        const r = 56 + progress * 8;
        const grad = ctx.createRadialGradient(x - 16, y - 16, 6, x, y, r);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        grad.addColorStop(0.55, fx.kind === 'pearl_dome' ? 'rgba(165, 243, 252, 0.25)' : 'rgba(56, 189, 248, 0.24)');
        grad.addColorStop(1, 'rgba(244, 114, 182, 0.45)');
        ctx.fillStyle = grad;
        ctx.strokeStyle = c0;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (fx.kind === 'scale_dome') {
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i + progress * 1.8;
            ctx.save();
            ctx.translate(x + Math.cos(a) * (r * 0.68), y + Math.sin(a) * (r * 0.68));
            this._drawHexagonShape(ctx, 11, c1, '#ffffff');
            ctx.restore();
          }
        } else {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, y, r * 0.82, -2.3, -1.3);
          ctx.stroke();
        }
        break;
      }
      case 'coral_tide': {
        for (let s = 0; s < 2; s++) {
          ctx.strokeStyle = s === 0 ? c0 : c2;
          ctx.lineWidth = 4 - s;
          ctx.beginPath();
          for (let k = 0; k <= 12; k++) {
            const t = k / 12;
            const wx = x - 70 + t * 140;
            const wy = pedY - 8 - s * 14 + Math.sin(t * Math.PI * 3 + progress * 9 + s) * 9;
            if (k === 0) ctx.moveTo(wx, wy);
            else ctx.lineTo(wx, wy);
          }
          ctx.stroke();
        }
        [-40, 40].forEach((ox, idx) => {
          ctx.fillStyle = idx === 0 ? c2 : c0;
          ctx.beginPath();
          ctx.arc(x + ox, pedY - 22 - progress * 26, 6, 0, Math.PI * 2);
          ctx.fill();
        });
        break;
      }
      case 'tidal_vortex': {
        [0, 1, 2].forEach((w) => {
          ctx.strokeStyle = cols[w % cols.length];
          ctx.lineWidth = 4 - w * 0.7;
          ctx.beginPath();
          const rad = 36 + w * 14 + progress * 12;
          const startA = progress * (w % 2 === 0 ? 5 : -5) + w * 1.2;
          ctx.arc(x, y + 6, rad, startA, startA + Math.PI * 1.25);
          ctx.stroke();
        });
        break;
      }
      case 'lightning_cage': {
        const pts = 6;
        ctx.strokeStyle = c0;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        for (let i = 0; i <= pts; i++) {
          const a = (Math.PI * 2 * (i % pts)) / pts + progress * 3;
          const jitter = (i % 2 === 0 ? 1 : -1) * Math.sin(progress * 28 + i) * 7;
          const px = x + Math.cos(a) * (48 + jitter);
          const py = y + Math.sin(a) * (42 - jitter);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        break;
      }
      case 'storm_arcs': {
        ctx.strokeStyle = c0;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y - 54, 34, Math.PI * 0.9, Math.PI * 2.1);
        ctx.stroke();
        [-28, 0, 28].forEach((ox, idx) => {
          ctx.strokeStyle = idx === 1 ? '#ffffff' : c1;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(x + ox, y - 62);
          ctx.lineTo(x + ox * 0.5 + (idx - 1) * 10, y - 22);
          ctx.lineTo(x + ox * 0.2, y + 12);
          ctx.stroke();
        });
        break;
      }
      case 'rail_crosshair': {
        const cx = Number.isFinite(fx.tx) ? fx.tx : x;
        const cy = Number.isFinite(fx.ty) ? fx.ty : y;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(progress * 4.5);
        ctx.strokeStyle = c0;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(0, 0, 42 - progress * 8, 0, Math.PI * 2);
        ctx.stroke();
        [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((ang) => {
          ctx.strokeStyle = c1;
          ctx.beginPath();
          ctx.moveTo(Math.cos(ang) * 18, Math.sin(ang) * 18);
          ctx.lineTo(Math.cos(ang) * 52, Math.sin(ang) * 52);
          ctx.stroke();
        });
        ctx.restore();
        break;
      }
      case 'dynamo_coils': {
        [-42, 42].forEach((ox, idx) => {
          ctx.save();
          ctx.translate(x + ox, y);
          ctx.rotate((idx === 0 ? 1 : -1) * progress * 8);
          this._drawGearShape(ctx, 16, c0, c2, 8);
          ctx.restore();
        });
        ctx.strokeStyle = c2;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(x - 36, y);
        ctx.quadraticCurveTo(x, y + Math.sin(progress * 32) * 24, x + 36, y);
        ctx.stroke();
        break;
      }
      case 'dojo_rings': {
        [0, 1].forEach((r) => {
          ctx.strokeStyle = r === 0 ? c0 : c1;
          ctx.lineWidth = 4 - r;
          ctx.beginPath();
          ctx.ellipse(x, y + 6, 48 + r * 20 + progress * 16, 20 + r * 8 + progress * 6, 0, 0, Math.PI * 2);
          ctx.stroke();
        });
        for (let k = 0; k < 6; k++) {
          const ang = (Math.PI * 2 * k) / 6 + progress * 2;
          ctx.strokeStyle = k % 2 === 0 ? c0 : '#ffffff';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(ang) * 28, y + Math.sin(ang) * 20);
          ctx.lineTo(x + Math.cos(ang) * 62, y + Math.sin(ang) * 44);
          ctx.stroke();
        }
        break;
      }
      case 'stone_bastion': {
        const archH = 56 * Math.min(1, progress * 2.2);
        [-42, 42].forEach((ox) => {
          ctx.fillStyle = c1;
          ctx.strokeStyle = c2;
          ctx.lineWidth = 2;
          ctx.fillRect(x + ox - 8, pedY - archH, 16, archH);
          ctx.strokeRect(x + ox - 8, pedY - archH, 16, archH);
        });
        ctx.fillStyle = c0;
        ctx.strokeStyle = c2;
        ctx.fillRect(x - 50, pedY - archH - 10, 100, 12);
        ctx.strokeRect(x - 50, pedY - archH - 10, 100, 12);
        ctx.save();
        ctx.translate(x, y - 4);
        this._drawSigilShape(ctx, 16, c0);
        ctx.restore();
        break;
      }
      case 'monolith_pillars': {
        [-48, 0, 48].forEach((ox, idx) => {
          const h = (idx === 1 ? 62 : 44) * Math.min(1, progress * 2.2);
          ctx.fillStyle = idx === 1 ? c1 : c0;
          ctx.strokeStyle = c2;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + ox - 10, pedY);
          ctx.lineTo(x + ox, pedY - h);
          ctx.lineTo(x + ox + 10, pedY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });
        break;
      }
      case 'spectral_lanterns': {
        for (let i = 0; i < 5; i++) {
          const ang = (Math.PI * 2 * i) / 5 + progress * 2.4;
          const lx = x + Math.cos(ang) * 50;
          const ly = y + Math.sin(ang) * 32 - Math.sin(progress * 10 + i) * 7;
          ctx.strokeStyle = c2;
          ctx.lineWidth = 1.6;
          ctx.strokeRect(lx - 6, ly - 8, 12, 16);
          ctx.fillStyle = i % 2 === 0 ? c0 : c1;
          ctx.beginPath();
          ctx.arc(lx, ly, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'crescent_shroud': {
        ctx.save();
        ctx.translate(x, y);
        for (let i = 0; i < 3; i++) {
          const ang = (Math.PI * 2 * i) / 3 - progress * 5.2;
          ctx.save();
          ctx.rotate(ang);
          ctx.strokeStyle = i % 2 === 0 ? c0 : c2;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, 0, 48, -0.55, 0.55);
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
        break;
      }
      case 'constellation': {
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = c0;
        ctx.lineWidth = 2;
        const pts = [];
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI * 2 * i) / 6 + progress * 1.6;
          const rad = i % 2 === 0 ? 52 : 34;
          pts.push([Math.cos(a) * rad, Math.sin(a) * rad * 0.72]);
        }
        ctx.beginPath();
        pts.forEach(([px, py], idx) => (idx === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
        ctx.closePath();
        ctx.stroke();
        pts.forEach(([px, py], idx) => {
          ctx.fillStyle = idx % 2 === 0 ? c1 : c2;
          ctx.beginPath();
          ctx.arc(px, py, 4.5, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
        break;
      }
      case 'orbital_rings': {
        ctx.save();
        ctx.translate(x, y);
        [0.45, -0.45].forEach((tilt, idx) => {
          ctx.save();
          ctx.rotate(tilt + progress * (idx === 0 ? 1.5 : -1.5));
          ctx.strokeStyle = idx === 0 ? c0 : c2;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.ellipse(0, 0, 58, 22, 0, 0, Math.PI * 2);
          ctx.stroke();
          const mA = progress * (idx === 0 ? 6 : -6);
          ctx.fillStyle = idx === 0 ? c2 : c1;
          ctx.beginPath();
          ctx.arc(Math.cos(mA) * 58, Math.sin(mA) * 22, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
        ctx.restore();
        break;
      }
      case 'kaleidoscope': {
        ctx.save();
        ctx.translate(x, y);
        [1, -1].forEach((dir, idx) => {
          ctx.save();
          ctx.rotate(dir * progress * 3.8);
          ctx.strokeStyle = idx === 0 ? c0 : c1;
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          for (let i = 0; i <= 3; i++) {
            const a = ((Math.PI * 2) / 3) * (i % 3);
            const px = Math.cos(a) * 50;
            const py = Math.sin(a) * 50;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.restore();
        });
        ctx.restore();
        break;
      }
      case 'sunbeams': {
        for (let b = 0; b < 4; b++) {
          const sx = x - 52 + b * 32;
          ctx.fillStyle = b % 2 === 0 ? 'rgba(253, 224, 71, 0.24)' : 'rgba(74, 222, 128, 0.22)';
          ctx.beginPath();
          ctx.moveTo(sx - 18, y - 82);
          ctx.lineTo(sx - 2, y - 82);
          ctx.lineTo(sx + 26, pedY);
          ctx.lineTo(sx + 6, pedY);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }
      case 'grace_halo': {
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = c1;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.ellipse(0, -46, 36, 11, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = c0;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, 48, -Math.PI * 0.75, -Math.PI * 0.25);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'canopy_bloom': {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(progress * 2.2);
        for (let i = 0; i < 6; i++) {
          const ang = (Math.PI * 2 * i) / 6;
          ctx.save();
          ctx.rotate(ang);
          ctx.fillStyle = i % 2 === 0 ? c0 : c1;
          ctx.beginPath();
          ctx.ellipse(36, 0, 14, 7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
        break;
      }
      case 'orichalcum_burst': {
        ctx.save();
        ctx.translate(x, y);
        const rad = 22 + progress * 46;
        ctx.strokeStyle = c1;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.arc(0, 0, rad, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 8; i++) {
          const ang = (Math.PI * 2 * i) / 8 + progress * 2.8;
          ctx.strokeStyle = i % 2 === 0 ? c0 : c2;
          ctx.lineWidth = 2.8;
          ctx.beginPath();
          ctx.moveTo(Math.cos(ang) * 18, Math.sin(ang) * 18);
          ctx.lineTo(Math.cos(ang) * (rad + 14), Math.sin(ang) * (rad + 14));
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case 'skyward_feathers': {
        ctx.save();
        ctx.translate(x, y);
        for (let i = 0; i < 5; i++) {
          const ang = -Math.PI * 0.8 + i * 0.4 + Math.sin(progress * 6 + i) * 0.14;
          const dist = 28 + progress * 34;
          ctx.save();
          ctx.translate(Math.cos(ang) * dist, Math.sin(ang) * dist - progress * 14);
          ctx.rotate(ang + Math.PI * 0.25);
          ctx.fillStyle = i % 2 === 0 ? c0 : c2;
          ctx.beginPath();
          ctx.ellipse(0, 0, 14, 4.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
        break;
      }
      case 'alchemical_siphon': {
        ctx.save();
        ctx.translate(x, y);
        for (let i = 0; i < 3; i++) {
          const ang = progress * 4.2 + (Math.PI * 2 * i) / 3;
          ctx.strokeStyle = i % 2 === 0 ? c0 : c1;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.ellipse(0, 4, 42, 16, ang * 0.25, 0, Math.PI * 1.4);
          ctx.stroke();
          ctx.fillStyle = c2;
          ctx.beginPath();
          ctx.arc(Math.cos(ang) * 34, Math.sin(ang) * 14 - progress * 24, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        break;
      }
      case 'tectonic_bastion': {
        for (let i = -1; i <= 1; i++) {
          const bx = x + i * 28;
          const lift = Math.min(1, progress * 1.8) * (40 - Math.abs(i) * 8);
          ctx.fillStyle = i === 0 ? c1 : c0;
          ctx.strokeStyle = c2;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(bx - 11, pedY);
          ctx.lineTo(bx - 7, pedY - lift);
          ctx.lineTo(bx + 7, pedY - lift - 6);
          ctx.lineTo(bx + 11, pedY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        break;
      }
      case 'emerald_swarm': {
        ctx.save();
        ctx.translate(x, y);
        for (let i = 0; i < 8; i++) {
          const ang = progress * 6.4 + (Math.PI * 2 * i) / 8;
          const rx = Math.cos(ang) * (32 + (i % 3) * 10);
          const ry = Math.sin(ang * 1.5) * 22;
          ctx.fillStyle = i % 2 === 0 ? c0 : c1;
          ctx.beginPath();
          ctx.ellipse(rx, ry, 6.5, 3.2, ang, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        break;
      }
      case 'mirror_bastion': {
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = c0;
        ctx.lineWidth = 2.6;
        for (let ring = 0; ring < 2; ring++) {
          const rad = 32 + ring * 14;
          ctx.beginPath();
          for (let i = 0; i <= 6; i++) {
            const a = (Math.PI * 2 * (i % 6)) / 6 + (ring === 0 ? progress : -progress) * 1.8;
            const px = Math.cos(a) * rad;
            const py = Math.sin(a) * rad;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.strokeStyle = ring === 0 ? c2 : c0;
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case 'shogun_crest': {
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = c2;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -14, 36, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
        for (let i = -1; i <= 1; i += 2) {
          ctx.strokeStyle = c0;
          ctx.lineWidth = 2.8;
          ctx.beginPath();
          ctx.moveTo(i * 42, -32);
          ctx.lineTo(-i * 38, 28);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case 'pixie_glimmer': {
        ctx.save();
        ctx.translate(x, y);
        for (let i = 0; i < 6; i++) {
          const ang = (Math.PI * 2 * i) / 6 + progress * 3.1;
          const dist = 28 + Math.sin(progress * 8 + i) * 10;
          ctx.save();
          ctx.translate(Math.cos(ang) * dist, Math.sin(ang) * (dist * 0.72));
          ctx.rotate(ang);
          ctx.fillStyle = i % 2 === 0 ? c0 : c2;
          ctx.fillRect(-7, -2, 14, 4);
          ctx.fillRect(-2, -7, 4, 14);
          ctx.restore();
        }
        ctx.restore();
        break;
      }
      case 'disguise_curtain': {
        ctx.save();
        ctx.translate(x, y);
        for (let i = -2; i <= 2; i++) {
          const sway = Math.sin(progress * 8 + i) * 7;
          ctx.strokeStyle = i % 2 === 0 ? c0 : c2;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(i * 15, -52);
          ctx.quadraticCurveTo(i * 15 + sway, -6, i * 18 - sway, 46);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case 'terastal_crown': {
        ctx.save();
        ctx.translate(x, y - 16);
        ctx.strokeStyle = c0;
        ctx.fillStyle = 'rgba(34, 211, 238, 0.18)';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(0, -48);
        ctx.lineTo(36, 0);
        ctx.lineTo(0, 38);
        ctx.lineTo(-36, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        for (let i = 0; i < 4; i++) {
          const ang = progress * 3.5 + (Math.PI * i) / 2;
          this._drawSigilShape(ctx, 8, i % 2 === 0 ? c1 : c2);
          ctx.rotate(ang * 0.25);
        }
        ctx.restore();
        break;
      }
      case 'prism_array':
      default: {
        ctx.save();
        ctx.translate(x, y);
        for (let i = 0; i < 6; i++) {
          const ang = (Math.PI * 2 * i) / 6 + progress * 2.6;
          ctx.save();
          ctx.translate(Math.cos(ang) * 44, Math.sin(ang) * 34);
          ctx.rotate(ang);
          this._drawSigilShape(ctx, 10, i % 2 === 0 ? c0 : c1);
          ctx.restore();
        }
        ctx.restore();
        break;
      }
    }

    ctx.restore();
  }

  drawPokeball(ctx, ball) {
    ctx.save();
    ctx.translate(ball.x, ball.y);
    const scale = ball.scale ?? 1;
    ctx.scale(scale, scale);
    ctx.rotate(ball.angle || 0);
    const r = 17;
    const isStar = Boolean(ball.isStar || ball.ballStyle === 'star');
    const isGreat = Boolean(!isStar && (ball.isGreat || ball.ballStyle === 'great'));

    if (ball.shadowAlpha) {
      ctx.save();
      ctx.rotate(-(ball.angle || 0));
      ctx.fillStyle = `rgba(2, 6, 23, ${ball.shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(0, r + 4, 15, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = isStar ? '#f5f3ff' : '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    if (isStar) {
      const starGrad = ctx.createLinearGradient(-r, -r, r, 0);
      starGrad.addColorStop(0, '#a855f7');
      starGrad.addColorStop(0.5, '#6b21a8');
      starGrad.addColorStop(1, '#3b0764');
      ctx.fillStyle = starGrad;
    } else {
      ctx.fillStyle = isGreat ? '#0ea5e9' : '#ef4444';
    }
    ctx.beginPath();
    ctx.arc(0, 0, r, Math.PI, 0);
    ctx.closePath();
    ctx.fill();

    if (isStar) {
      // Gold cosmic star emblem on dome
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-5, -11, 10, 2.4);
      ctx.fillRect(-1.2, -14.8, 2.4, 10);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-10, -8, 3, 3);
      ctx.fillRect(7, -8, 3, 3);
    } else if (isGreat) {
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-10, -10, 5, 4);
      ctx.fillRect(5, -10, 5, 4);
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-6, -7, 4.5, 2.5, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = isStar ? '#fde047' : '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-r, -2.5, r * 2, 5);

    ctx.fillStyle = ball.glow ? '#fde047' : isStar ? '#fef08a' : '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 5.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();
    ctx.restore();
  }

  async playAttackVisual(attackerSide, defenderSide, move, result, defender, sessionId) {
    const pace = this.getPaceConfig();
    const atkSprite = attackerSide === 'player' ? this.playerSpriteEl : this.enemySpriteEl;
    const defSprite = defenderSide === 'enemy' ? this.enemySpriteEl : this.playerSpriteEl;
    const isQuick = move.id === 'quick_attack'
      || move.id === 'spark_dash'
      || move.id === 'agility_dash'
      || move.id === 'sky_wing'
      || move.id === 'phantom_claw'
      || move.id === 'thunder_fang'
      || move.id === 'wild_volt'
      || move.id === 'leaf_blade'
      || move.id === 'psycho_cut'
      || move.id === 'solar_blade'
      || move.id === 'razor_shell'
      || move.id === 'volt_tackle'
      || move.id === 'dragon_rush'
      || move.id === 'blaze_kick'
      || move.id === 'steppe_bolt'
      || move.id === 'champion_strike'
      || move.id === 'rift_claw'
      || move.id === 'close_combat'
      || move.id === 'collision_course'
      || move.id === 'brave_bird'
      || move.id === 'poison_jab'
      || move.id === 'headlong_rush'
      || move.id === 'x_scissor'
      || move.id === 'kowtow_cleave'
      || move.id === 'play_rough'
      || move.id === 'dragon_darts'
      || move.id === 'bitter_blade';
    const lungeClass = attackerSide === 'player'
      ? (isQuick ? 'quick-lunge-right' : 'lunge-right')
      : (isQuick ? 'quick-lunge-left' : 'lunge-left');
    const fxClass = MOVE_FX_CLASS[move.id] || '';

    // Beat 1: Wind-Up Anticipation
    atkSprite?.classList.remove('is-idle');
    atkSprite?.classList.add('windup');
    if (fxClass) atkSprite?.classList.add(fxClass);
    this.audio?.playWindup?.(move.type);
    this.spawnChargeParticles(attackerSide, move.type, pace, move);
    await this.wait(pace.windupMs, sessionId);
    if (!this.isSessionValid(sessionId)) return;
    atkSprite?.classList.remove('windup');

    if (move.category === 'heal' || result.category === 'heal') {
      atkSprite?.classList.add(lungeClass);
      this.audio?.playElemental?.('heal', move.id);
      this.spawnImpactFX(attackerSide, 'heal', `+${result.heal} HP`, '#86efac', {
        moveId: move.id,
        ring: true,
        ringColor: move.id === 'geomancy_bloom' ? '#f472b6' : '#4ade80',
        secondaryRingColor: move.id === 'geomancy_bloom' ? '#fde047' : '#ffffff',
        fontSize: 22,
        lifeScale: pace.particleLifeScale,
      });
      await this.wait(Math.max(240, pace.postImpactMs), sessionId);
      if (!this.isSessionValid(sessionId)) return;
      atkSprite?.classList.remove(lungeClass, ...ALL_MOVE_FX_CLASSES);
      atkSprite?.classList.add('is-idle');
      return;
    }

    if (move.category === 'buff' || result.category === 'buff') {
      atkSprite?.classList.add(lungeClass);
      if (move.id === 'cosmos_mind') {
        this.audio?.playElemental?.('psychic', 'cosmos_mind');
      } else if (move.id === 'jungle_totem') {
        this.audio?.playElemental?.('grass', 'jungle_totem');
      } else if (move.id === 'tailwind_grace') {
        this.audio?.playElemental?.('flying', 'tailwind_grace');
      } else if (move.id === 'quiver_step') {
        this.audio?.playElemental?.('bug', 'quiver_step');
      } else if (move.id === 'geomancy_bloom') {
        this.audio?.playElemental?.('fairy', 'geomancy_bloom');
      }
      this.audio?.playBuffChime?.();
      const statShort = { atk: 'ATK', def: 'DEF', spd: 'SPD' }[result.buffStat || move.buffStat || 'atk'] || 'STAT';
      const fxType = move.type && move.type !== 'normal' ? move.type : 'buff';
      const isSignatureBuff = move.id === 'cosmos_mind'
        || move.id === 'jungle_totem'
        || move.id === 'tailwind_grace'
        || move.id === 'quiver_step'
        || move.id === 'geomancy_bloom';
      const buffRingByMove = {
        cosmos_mind: '#f472b6',
        jungle_totem: '#22c55e',
        tailwind_grace: '#38bdf8',
        quiver_step: '#84cc16',
        geomancy_bloom: '#f472b6',
      };
      const buffSecRingByMove = {
        jungle_totem: '#fde047',
        tailwind_grace: '#a7f3d0',
        quiver_step: '#f472b6',
        geomancy_bloom: '#fde047',
      };
      this.spawnImpactFX(attackerSide, fxType, `${statShort} ▲!`, '#fde047', {
        moveId: move.id,
        ring: true,
        ringRadius: isSignatureBuff ? 102 : 88,
        ringColor: buffRingByMove[move.id] || '#fde047',
        secondaryRingColor: buffSecRingByMove[move.id] || '#ffffff',
        count: isSignatureBuff ? 28 : 20,
        fontSize: 22,
        lifeScale: pace.particleLifeScale,
      });
      await this.wait(Math.max(240, pace.postImpactMs), sessionId);
      if (!this.isSessionValid(sessionId)) return;
      atkSprite?.classList.remove(lungeClass, ...ALL_MOVE_FX_CLASSES);
      atkSprite?.classList.add('is-idle');
      return;
    }

    if (move.category === 'shield' || result.category === 'shield') {
      atkSprite?.classList.add(lungeClass);
      const isCalm = move.id === 'calm_aura';
      const isCotton = move.id === 'cotton_guard';
      const isDuneAegis = move.id === 'dune_aegis';
      const isAmberBastion = move.id === 'amber_bastion';
      const isKingShield = move.id === 'king_shield';
      const isLunarShroud = move.id === 'lunar_shroud';
      if (isCalm) {
        this.audio?.playElemental?.('psychic', 'calm_aura');
      } else if (isDuneAegis) {
        this.audio?.playElemental?.('rock', 'dune_aegis');
      } else if (isAmberBastion) {
        this.audio?.playElemental?.('rock', 'amber_bastion');
      } else if (isKingShield) {
        this.audio?.playElemental?.('steel', 'king_shield');
      } else if (isLunarShroud) {
        this.audio?.playElemental?.('dark', 'lunar_shroud');
      } else {
        this.audio?.playShieldChime?.();
      }
      this.spawnImpactFX(
        attackerSide,
        isCalm ? 'psychic' : isCotton ? 'buff' : (isDuneAegis || isAmberBastion) ? 'rock' : isKingShield ? 'steel' : isLunarShroud ? 'dark' : 'shield',
        isCalm ? 'CALM AURA!' : isCotton ? 'COTTON GUARD!' : isDuneAegis ? 'MIRAGE BASTION!' : isAmberBastion ? 'RELIC BASTION!' : isKingShield ? "KING'S SHIELD!" : isLunarShroud ? 'LUNAR SHROUD!' : 'SHIELD UP!',
        isCalm ? '#e9d5ff' : isCotton ? '#fef08a' : (isDuneAegis || isAmberBastion || isKingShield) ? '#fde68a' : isLunarShroud ? '#c084fc' : '#67e8f9',
        {
          moveId: move.id,
          ring: true,
          ringRadius: isCalm ? 98 : (isDuneAegis || isAmberBastion || isKingShield || isLunarShroud) ? 104 : 94,
          ringColor: isCalm ? '#c084fc' : isCotton ? '#fde047' : (isDuneAegis || isAmberBastion) ? '#f59e0b' : isKingShield ? '#fbbf24' : isLunarShroud ? '#818cf8' : '#67e8f9',
          secondaryRingColor: isCalm ? '#67e8f9' : (isDuneAegis || isAmberBastion || isKingShield) ? '#fef3c7' : isLunarShroud ? '#e9d5ff' : '#ffffff',
          count: isCalm ? 16 : 22,
          fontSize: 21,
          lifeScale: pace.particleLifeScale,
        },
      );
      await this.wait(Math.max(240, pace.postImpactMs), sessionId);
      if (!this.isSessionValid(sessionId)) return;
      atkSprite?.classList.remove(lungeClass, ...ALL_MOVE_FX_CLASSES);
      atkSprite?.classList.add('is-idle');
      return;
    }

    // Beat 2: Travel / Delivery
    atkSprite?.classList.add(lungeClass);
    const isPhysical = move.damageClass === 'physical' || PHYSICAL_MOVE_IDS.has(move.id) || move.fx === 'impact';
    const hasElementalTrail = isPhysical && (move.type !== 'normal' || move.fx === 'wind' || move.id === 'champion_strike');
    if (isPhysical) {
      if ((move.id === 'tackle' || move.id === 'quick_attack') && move.fx !== 'wind') {
        this.audio?.playPhysicalImpact?.(move.power);
      } else {
        this.audio?.playElemental?.(move.fx === 'wind' ? 'wind' : move.type, move.id);
      }
      if (hasElementalTrail) {
        this.spawnPhysicalElementalTrail(attackerSide, defenderSide, move, pace);
      }
      await this.wait(pace.physicalStrikeMs, sessionId);
    } else {
      this.audio?.playElemental?.(move.type, move.id);
      await this.animateElementalStream(attackerSide, defenderSide, move, sessionId);
    }

    if (!this.isSessionValid(sessionId)) return;

    // Beat 3: Hit-Stop Freeze & Impact
    if (result.missed) {
      this.spawnImpactFX(defenderSide, 'normal', 'MISSED!', '#cbd5e1', {
        count: 8,
        fontSize: 20,
        lifeScale: pace.particleLifeScale,
      });
    } else {
      defSprite?.classList.remove('is-idle');
      defSprite?.classList.add('hit-stop');
      this.audio?.playHitStop?.();
      await this.wait(pace.hitStopMs, sessionId);
      if (!this.isSessionValid(sessionId)) return;
      defSprite?.classList.remove('hit-stop');
      defSprite?.classList.add('hit-shake');

      const heavyMoves = new Set([
        'meteor_slam', 'hyper_nova', 'wild_volt', 'iron_crush', 'magma_cannon', 'moonblast', 'glacier_crash',
        'eruption_flare', 'aura_sphere', 'draco_meteor', 'doom_desire',
        'frenzy_flora', 'solar_blade', 'hydro_vortex', 'plasma_cannon', 'volt_tackle',
        'sandstorm_crush', 'prism_laser', 'zen_meteor', 'dragon_rush',
        'inferno_overdrive', 'abyssal_geyser', 'ion_tempest', 'canyon_rend',
        'chrono_cannon', 'polar_lance', 'relic_hex', 'rift_claw', 'cosmos_supernova',
        'close_combat', 'collision_course', 'brave_bird', 'earthquake', 'earth_power',
        'headlong_rush', 'flash_cannon', 'gigaton_hammer', 'kowtow_cleave',
        'dazzling_gleam', 'geomancy_bloom', 'electro_drift',
      ]);
      const maxHp = Math.max(1, defender?.maxHp || 30);
      const dmgIntensity = (result.damage / maxHp) * 18
        + (result.isCrit ? 4 : 0)
        + (result.effectiveness > 1 ? 3 : 0)
        + (heavyMoves.has(move.id) ? 3 : 0);
      this.triggerScreenShake(Math.max(4, Math.min(15, dmgIntensity)), isPhysical ? 280 : 240);

      const center = this.getSpriteCenter(defenderSide);
      const dmgColor = result.isCrit ? '#fde047' : result.effectiveness > 1 ? '#fb923c' : '#ffffff';
      const impactType = move.fx === 'wind' ? 'wind' : move.fx === 'star' && move.type === 'normal' ? 'star' : move.type;
      const slashColorByMove = {
        thunder_fang: '#facc15',
        leaf_blade: '#4ade80',
        psycho_cut: '#f472b6',
        aqua_tail: '#38bdf8',
        solar_blade: '#fde047',
        razor_shell: '#22d3ee',
        thorn_barrage: '#4ade80',
        blaze_kick: '#fb923c',
        canyon_rend: '#f59e0b',
        champion_strike: '#fb7185',
        rift_claw: '#ec4899',
        air_slash: '#bae6fd',
        poison_jab: '#c084fc',
        x_scissor: '#bef264',
        kowtow_cleave: '#ef4444',
        bitter_blade: '#a855f7',
      };
      const ringColorByMove = {
        moonblast: '#f472b6',
        iron_crush: '#e2e8f0',
        wild_volt: '#fde047',
        magma_cannon: '#f97316',
        leaf_blade: '#22c55e',
        eruption_flare: '#f97316',
        aura_sphere: '#38bdf8',
        psycho_cut: '#f472b6',
        aqua_tail: '#38bdf8',
        draco_meteor: '#818cf8',
        omen_wind: '#a855f7',
        doom_desire: '#fde047',
        frenzy_flora: '#22c55e',
        spore_burst: '#2dd4bf',
        solar_blade: '#fde047',
        fiery_dance: '#ef4444',
        hydro_vortex: '#38bdf8',
        razor_shell: '#22d3ee',
        plasma_cannon: '#22d3ee',
        volt_tackle: '#fde047',
        sandstorm_crush: '#f59e0b',
        prism_laser: '#f472b6',
        zen_meteor: '#a855f7',
        icicle_spear: '#67e8f9',
        spectral_lantern: '#a855f7',
        night_daze: '#9333ea',
        dragon_rush: '#6366f1',
        thorn_barrage: '#22c55e',
        inferno_overdrive: '#ef4444',
        blaze_kick: '#fb923c',
        abyssal_geyser: '#06b6d4',
        pearl_cascade: '#a5f3fc',
        steppe_bolt: '#fde047',
        ion_tempest: '#38bdf8',
        canyon_rend: '#d97706',
        chrono_cannon: '#f59e0b',
        champion_strike: '#fb7185',
        polar_lance: '#67e8f9',
        relic_hex: '#a855f7',
        rift_claw: '#ec4899',
        cosmos_supernova: '#f472b6',
        close_combat: '#ef4444',
        vacuum_wave: '#f87171',
        collision_course: '#dc2626',
        brave_bird: '#38bdf8',
        air_slash: '#7dd3fc',
        tailwind_grace: '#38bdf8',
        sludge_wave: '#a855f7',
        poison_jab: '#a855f7',
        malignant_chain: '#c084fc',
        earthquake: '#d97706',
        earth_power: '#f59e0b',
        headlong_rush: '#b45309',
        bug_buzz: '#84cc16',
        x_scissor: '#84cc16',
        quiver_step: '#a3e635',
        flash_cannon: '#e2e8f0',
        gigaton_hammer: '#f472b6',
        king_shield: '#fbbf24',
        dark_pulse: '#7e22ce',
        kowtow_cleave: '#6366f1',
        lunar_shroud: '#818cf8',
        dazzling_gleam: '#f472b6',
        play_rough: '#f472b6',
        geomancy_bloom: '#f472b6',
        water_shuriken: '#38bdf8',
        dragon_darts: '#6366f1',
        bitter_blade: '#ef4444',
        electro_drift: '#22d3ee',
      };
      const secondaryRingByMove = {
        moonblast: '#c084fc',
        leaf_blade: '#bbf7d0',
        eruption_flare: '#fde047',
        aura_sphere: '#6366f1',
        psycho_cut: '#c084fc',
        aqua_tail: '#f472b6',
        draco_meteor: '#fde047',
        omen_wind: '#67e8f9',
        doom_desire: '#38bdf8',
        frenzy_flora: '#fde047',
        spore_burst: '#f472b6',
        solar_blade: '#f97316',
        fiery_dance: '#fbbf24',
        hydro_vortex: '#e0f2fe',
        razor_shell: '#fb7185',
        plasma_cannon: '#fde047',
        volt_tackle: '#ffffff',
        sandstorm_crush: '#b45309',
        prism_laser: '#67e8f9',
        zen_meteor: '#f472b6',
        icicle_spear: '#ffffff',
        spectral_lantern: '#2dd4bf',
        night_daze: '#f43f5e',
        dragon_rush: '#fde047',
        thorn_barrage: '#f472b6',
        inferno_overdrive: '#fde047',
        blaze_kick: '#fde047',
        abyssal_geyser: '#38bdf8',
        pearl_cascade: '#f472b6',
        steppe_bolt: '#f59e0b',
        ion_tempest: '#fde047',
        canyon_rend: '#fde047',
        chrono_cannon: '#c084fc',
        champion_strike: '#fde047',
        polar_lance: '#e0f2fe',
        relic_hex: '#f59e0b',
        rift_claw: '#6366f1',
        cosmos_supernova: '#fde047',
        close_combat: '#fbbf24',
        vacuum_wave: '#bae6fd',
        collision_course: '#fbbf24',
        brave_bird: '#ffffff',
        air_slash: '#e0f2fe',
        tailwind_grace: '#a7f3d0',
        sludge_wave: '#4ade80',
        poison_jab: '#c084fc',
        malignant_chain: '#f43f5e',
        earthquake: '#fde68a',
        earth_power: '#ef4444',
        headlong_rush: '#fbbf24',
        bug_buzz: '#34d399',
        x_scissor: '#bef264',
        quiver_step: '#f472b6',
        flash_cannon: '#38bdf8',
        gigaton_hammer: '#e2e8f0',
        king_shield: '#e2e8f0',
        dark_pulse: '#c084fc',
        kowtow_cleave: '#ef4444',
        lunar_shroud: '#e9d5ff',
        dazzling_gleam: '#fde047',
        play_rough: '#f9a8d4',
        geomancy_bloom: '#fde047',
        water_shuriken: '#e0f2fe',
        dragon_darts: '#22d3ee',
        bitter_blade: '#a855f7',
        electro_drift: '#a855f7',
      };
      const bigBurstMoves = new Set([
        'hyper_nova', 'thunder_tempest', 'wild_volt', 'magma_cannon',
        'eruption_flare', 'aura_sphere', 'draco_meteor', 'omen_wind', 'doom_desire',
        'frenzy_flora', 'fiery_dance', 'hydro_vortex', 'plasma_cannon', 'volt_tackle',
        'sandstorm_crush', 'prism_laser', 'zen_meteor', 'dragon_rush',
        'inferno_overdrive', 'abyssal_geyser', 'ion_tempest', 'canyon_rend',
        'chrono_cannon', 'polar_lance', 'relic_hex', 'rift_claw', 'cosmos_supernova',
        'close_combat', 'collision_course', 'brave_bird', 'sludge_wave', 'earthquake',
        'earth_power', 'headlong_rush', 'bug_buzz', 'flash_cannon', 'gigaton_hammer',
        'dark_pulse', 'dazzling_gleam', 'geomancy_bloom', 'electro_drift',
      ]);
      this.spawnImpactFX(defenderSide, impactType, `-${result.damage}`, dmgColor, {
        moveId: move.id,
        dust: isPhysical || move.id === 'magma_cannon' || move.id === 'eruption_flare' || move.id === 'draco_meteor' || move.id === 'sandstorm_crush' || move.id === 'dragon_rush' || move.id === 'canyon_rend' || move.id === 'rift_claw' || move.id === 'earth_power',
        extraDust: move.id === 'meteor_slam' || move.id === 'iron_crush' || move.id === 'draco_meteor' || move.id === 'sandstorm_crush' || move.id === 'zen_meteor' || move.id === 'canyon_rend' || move.id === 'earthquake' || move.id === 'headlong_rush' || move.id === 'gigaton_hammer' || move.id === 'collision_course',
        slash: hasElementalTrail || move.id === 'phantom_claw' || move.id === 'starlight_claw' || move.id === 'thunder_fang' || move.id === 'solar_blade' || move.id === 'razor_shell' || move.id === 'blaze_kick' || move.id === 'champion_strike' || move.id === 'rift_claw' || move.id === 'x_scissor' || move.id === 'kowtow_cleave' || move.id === 'bitter_blade' || move.id === 'poison_jab',
        slashColor: slashColorByMove[move.id],
        shapeOverride: move.id === 'star_melody'
          ? 'note'
          : move.fx === 'wind' || move.id === 'omen_wind'
            ? 'wind'
            : move.id === 'glacier_crash' || move.id === 'icicle_spear' || move.id === 'prism_laser' || move.id === 'polar_lance'
              ? 'crystal'
              : move.id === 'spore_burst'
                ? 'spore'
                : move.id === 'chrono_cannon'
                  ? 'gear'
                  : move.id === 'relic_hex' || move.id === 'malignant_chain'
                    ? 'sigil'
                    : move.id === 'water_shuriken'
                      ? 'shuriken'
                      : move.id === 'brave_bird' || move.id === 'air_slash'
                        ? 'feather'
                        : move.id === 'sludge_wave' || move.id === 'poison_jab'
                          ? 'venom'
                          : move.id === 'bug_buzz'
                            ? 'wave_arc'
                            : move.id === 'gigaton_hammer'
                              ? 'hexagon'
                              : null,
        extraNotes: move.id === 'star_melody',
        aurora: move.id === 'aurora_flare',
        petalColors: move.id === 'petal_blizzard',
        ring: true,
        ringColor: ringColorByMove[move.id],
        secondaryRingColor: secondaryRingByMove[move.id] || '#ffffff',
        ringRadius: result.isCrit ? 96 : heavyMoves.has(move.id) ? 106 : 74,
        count: bigBurstMoves.has(move.id) ? 28 : 22,
        fontSize: result.isCrit ? 26 : 23,
        lifeScale: pace.particleLifeScale,
        popupLife: 1.45,
      });

      let tagOffsetY = -52;
      if (result.effectiveness > 1) {
        this.spawnFloatingText(center.x, center.y + tagOffsetY, 'SUPER EFFECTIVE!', '#fde047', 16, 0.05, 1.45);
        tagOffsetY -= 22;
      } else if (result.effectiveness < 1) {
        this.spawnFloatingText(center.x, center.y + tagOffsetY, 'NOT VERY EFFECTIVE', '#cbd5e1', 14, 0.05, 1.45);
        tagOffsetY -= 20;
      }
      if (result.isCrit) {
        this.spawnFloatingText(center.x, center.y + tagOffsetY, 'CRITICAL HIT!', '#fb923c', 17, 0.09, 1.45);
      }
    }

    await this.wait(pace.postImpactMs, sessionId);
    if (!this.isSessionValid(sessionId)) return;
    atkSprite?.classList.remove(lungeClass, ...ALL_MOVE_FX_CLASSES);
    atkSprite?.classList.add('is-idle');
    defSprite?.classList.remove('hit-stop', 'hit-shake');
    defSprite?.classList.add('is-idle');
  }

  chooseEnemyMove() {
    if (!this.enemy || this.enemy.isFainted || !this.player || this.player.isFainted) {
      return null;
    }
    const allMoves = this.enemy.getMoveObjects();
    if (allMoves.length === 0) return null;
    const moves = typeof this.enemy.getMovePp === 'function'
      ? allMoves.filter((m) => this.enemy.getMovePp(m.id).current > 0)
      : allMoves;
    if (moves.length === 0) {
      return {
        id: 'tackle',
        name: 'Struggle',
        type: 'normal',
        power: 35,
        accuracy: 100,
        pp: 99,
        damageClass: 'physical',
        category: 'attack',
        fx: 'impact',
        _isStruggle: true,
      };
    }
    const attacks = moves.filter((m) => m.category === 'attack' || !m.category);
    let chosen = moves[Math.floor(Math.random() * moves.length)];
    if (chosen.category === 'heal' && this.enemy.hp > this.enemy.maxHp * 0.6 && attacks.length > 0) {
      chosen = attacks[Math.floor(Math.random() * attacks.length)];
    } else if (chosen.category === 'shield' && (this.enemy.shieldTurns || 0) > 0 && attacks.length > 0) {
      chosen = attacks[Math.floor(Math.random() * attacks.length)];
    } else if (chosen.category === 'buff') {
      const stat = chosen.buffStat || 'atk';
      const stage = Number(this.enemy.battleStages?.[stat] || 0);
      if ((stage >= 2 || this.enemy.hp < this.enemy.maxHp * 0.35) && attacks.length > 0) {
        chosen = attacks[Math.floor(Math.random() * attacks.length)];
      }
    }
    return chosen;
  }

  async handlePlayerMove(move) {
    if (!this.canAcceptPlayerAction()) return;
    if (!this.player || this.player.isFainted || !this.enemy || this.enemy.isFainted) return;

    let activeMove = move;
    const ppInfo = this.player.getMovePp(move.id);
    if (ppInfo.current <= 0) {
      if (this.player.hasAnyMovePp()) {
        this.audio?.playMenuBlip?.(300);
        return;
      }
      activeMove = {
        id: 'tackle',
        name: 'Struggle',
        type: 'normal',
        power: 35,
        accuracy: 100,
        pp: 99,
        damageClass: 'physical',
        category: 'attack',
        fx: 'impact',
        _isStruggle: true,
      };
    }

    const sid = this.sessionId;
    const pace = this.getPaceConfig();
    const token = this.lockPlayerAction(BATTLE_STATES.ACTION_ANIMATING);
    this.audio?.playMoveSelect?.();

    if (ppInfo.current > 0 && !activeMove._isStruggle) {
      this.player.consumeMovePp(move.id);
      this.storage.save();
      this.renderMoveButtons();
      this.setControlsDisabled(true);
    }

    try {
      const playerSpd = this.player.getEffectiveSpd?.() ?? this.player.spd;
      const enemySpd = this.enemy.getEffectiveSpd?.() ?? this.enemy.spd;
      const playerFaster = playerSpd >= enemySpd;

      if (playerFaster) {
        this.state = BATTLE_STATES.ACTION_ANIMATING;
        const playerEnded = await this.executeMoveAction('player', activeMove, sid);
        if (playerEnded || !this.isSessionValid(sid) || this.turnToken !== token) return;

        await this.wait(pace.interTurnMs, sid);
        if (!this.isSessionValid(sid) || this.turnToken !== token) return;

        this.state = BATTLE_STATES.OPPONENT_AI;
        const enemyMove = this.chooseEnemyMove();
        if (enemyMove) {
          this.state = BATTLE_STATES.OPPONENT_ANIMATING;
          const enemyEnded = await this.executeMoveAction('enemy', enemyMove, sid);
          if (enemyEnded || !this.isSessionValid(sid) || this.turnToken !== token) return;
        }
      } else {
        this.state = BATTLE_STATES.OPPONENT_AI;
        const enemyMove = this.chooseEnemyMove();
        if (enemyMove) {
          this.state = BATTLE_STATES.OPPONENT_ANIMATING;
          const enemyEnded = await this.executeMoveAction('enemy', enemyMove, sid);
          if (enemyEnded || !this.isSessionValid(sid) || this.turnToken !== token) return;

          await this.wait(pace.interTurnMs, sid);
          if (!this.isSessionValid(sid) || this.turnToken !== token) return;
        }

        this.state = BATTLE_STATES.ACTION_ANIMATING;
        const playerEnded = await this.executeMoveAction('player', activeMove, sid);
        if (playerEnded || !this.isSessionValid(sid) || this.turnToken !== token) return;
      }

      if (!this.isSessionValid(sid) || this.turnToken !== token) return;
      this.returnToPlayerInput(sid);
    } catch (err) {
      console.error('Turn execution error:', err);
      if (
        this.isSessionValid(sid) &&
        this.turnToken === token &&
        this.state !== BATTLE_STATES.FORCED_SWITCH &&
        this.state !== BATTLE_STATES.BATTLE_END
      ) {
        this.returnToPlayerInput(sid);
      }
    }
  }

  async executeMoveAction(side, move, sid = this.sessionId) {
    if (!this.isSessionValid(sid)) return true;
    const pace = this.getPaceConfig();
    const isPlayer = side === 'player';
    const attacker = isPlayer ? this.player : this.enemy;
    const defender = isPlayer ? this.enemy : this.player;
    const defSide = isPlayer ? 'enemy' : 'player';

    if (!attacker || !defender || attacker.isFainted || defender.isFainted) {
      return true;
    }

    if (!isPlayer && !move?._isStruggle) {
      attacker.consumeMovePp?.(move.id);
    }

    const attackerLabel = isPlayer ? (attacker.displayName || attacker.name) : attacker.name;
    await this.say(`${attackerLabel} used ${move.name}!`);
    if (!this.isSessionValid(sid) || attacker.isFainted || defender.isFainted) return true;

    const result = PokemonMod.calculateDamage(attacker, defender, move, {
      applyAbilities: this.abilitiesEnabled !== false,
    });

    if (!result.missed && result.attackerAbilityTrigger && this.abilitiesEnabled !== false) {
      const atkTrig = result.attackerAbilityTrigger;
      await this.playAbilityVisual(side, atkTrig.ability || atkTrig.abilityId, atkTrig.summary || '', sid);
      if (!this.isSessionValid(sid) || attacker.isFainted || defender.isFainted) return true;
    }

    await this.playAttackVisual(side, defSide, move, result, defender, sid);
    if (!this.isSessionValid(sid)) return true;

    if (result.category === 'heal') {
      const gained = attacker.healAmount(result.heal);
      this.storage.save();
      await this.animateHpTo(side, attacker.hp, pace.hpDrainMs);
      if (!this.isSessionValid(sid)) return true;
      await this.say(`${attackerLabel} restored ${gained} HP!`);
      await this.triggerTurnEndAbility(side, attacker, sid);
      if (!this.isSessionValid(sid)) return true;
      this.state = BATTLE_STATES.CHECK_FAINT;
      return false;
    }

    if (result.category === 'buff') {
      const stat = result.buffStat || move.buffStat || 'atk';
      const boostRes = attacker.applyStageBoost?.(stat, result.buffStages || move.buffStages || 1);
      this.renderStatusCards();
      this.storage.save();
      const statLabel = { atk: 'Attack', def: 'Defense', spd: 'Speed' }[stat] || 'Power';
      await this.say(
        boostRes && !boostRes.changed
          ? `${attackerLabel}'s ${statLabel} can't go any higher!`
          : `${attackerLabel}'s ${statLabel} rose!`,
      );
      await this.triggerTurnEndAbility(side, attacker, sid);
      if (!this.isSessionValid(sid)) return true;
      this.state = BATTLE_STATES.CHECK_FAINT;
      return false;
    }

    if (result.category === 'shield') {
      const stat = result.buffStat || 'def';
      attacker.applyStageBoost?.(stat, result.buffStages || move.buffStages || 1);
      if (result.grantShield) {
        attacker.shieldTurns = 2;
      }
      let gained = 0;
      if (result.heal > 0) {
        gained = attacker.healAmount(result.heal);
      }
      this.renderStatusCards();
      this.storage.save();
      if (gained > 0) {
        await this.animateHpTo(side, attacker.hp, pace.hpDrainMs);
        if (!this.isSessionValid(sid)) return true;
      }
      await this.say(
        `${attackerLabel} raised a Starlight Shield!${gained > 0 ? ` (+${gained} HP)` : ''}`,
      );
      await this.triggerTurnEndAbility(side, attacker, sid);
      if (!this.isSessionValid(sid)) return true;
      this.state = BATTLE_STATES.CHECK_FAINT;
      return false;
    }

    if (result.missed) {
      await this.say(`${attackerLabel}'s attack missed!`);
      await this.triggerTurnEndAbility(side, attacker, sid);
      if (!this.isSessionValid(sid)) return true;
      this.state = BATTLE_STATES.CHECK_FAINT;
      return false;
    }

    if (result.defenderAbilityTrigger && this.abilitiesEnabled !== false) {
      const defTrig = result.defenderAbilityTrigger;
      await this.playAbilityVisual(defSide, defTrig.ability || defTrig.abilityId, defTrig.summary || '', sid);
      if (!this.isSessionValid(sid)) return true;
    }

    const prevDefenderHp = Number(defender.hp) || 0;
    defender.takeDamage(result.damage);
    let buddyEndured = false;
    if (
      !isPlayer &&
      defender === this.player &&
      prevDefenderHp > 1 &&
      defender.hp <= 0 &&
      (Number(this.player.bond) || 0) >= 60 &&
      !this.playerBuddyEndured &&
      this.allowBuddyEndure !== false
    ) {
      const bondVal = Number(this.player.bond) || 0;
      const endureChance = this.forceBuddyEndure === true
        ? 1.0
        : (PokemonMod.getBondTier?.(bondVal)?.endureChance ?? (bondVal >= 85 ? 0.25 : 0.15));
      if (this.forceBuddyEndure === true || Math.random() < endureChance) {
        this.playerBuddyEndured = true;
        this.player.hp = 1;
        buddyEndured = true;
      }
    }
    if ((defender.shieldTurns || 0) > 0) {
      defender.shieldTurns = Math.max(0, defender.shieldTurns - 1);
    }
    this.renderStatusCards();
    this.storage.save();
    await this.animateHpTo(defSide, defender.hp, pace.hpDrainMs);
    if (!this.isSessionValid(sid)) return true;

    const drainAmt = Number(result.attackerAbilityTrigger?.drainHeal);
    if (
      this.abilitiesEnabled !== false &&
      Number.isFinite(drainAmt) &&
      drainAmt > 0 &&
      attacker.hp > 0 &&
      attacker.hp < attacker.maxHp
    ) {
      const drained = attacker.healAmount(drainAmt);
      if (drained > 0) {
        this.renderStatusCards();
        this.storage.save();
        this.spawnImpactFX(side, 'heal', `+${drained} HP`, '#86efac', {
          ring: true,
          ringColor: '#4ade80',
          fontSize: 20,
          count: 14,
          lifeScale: pace.particleLifeScale,
        });
        await this.animateHpTo(side, attacker.hp, pace.hpDrainMs);
        if (!this.isSessionValid(sid)) return true;
      }
    }

    const defTrig = result.defenderAbilityTrigger;
    if (
      this.abilitiesEnabled !== false &&
      defTrig?.counterBoostStat &&
      defender.hp > 0
    ) {
      const cStat = defTrig.counterBoostStat;
      const cStages = Number.isFinite(Number(defTrig.counterBoostStages)) ? Number(defTrig.counterBoostStages) : 1;
      defender.applyStageBoost?.(cStat, cStages);
      this.renderStatusCards();
      this.storage.save();
      const statShort = { atk: 'ATK', def: 'DEF', spd: 'SPD' }[cStat] || 'STAT';
      const defCenter = this.getSpriteCenter(defSide);
      this.spawnFloatingText(defCenter.x, defCenter.y - 28, `${statShort} ▲!`, '#c084fc', 19, 0, 1.3);
    }

    if (buddyEndured) {
      if (typeof this.audio?.playBuddyEndure === 'function') {
        this.audio.playBuddyEndure();
      } else {
        this.audio?.playShieldChime?.();
      }
      this.spawnBuddyEndureBurst('player');
    }

    if (result.effectiveness > 1) {
      await this.say("It's super effective!");
    } else if (result.effectiveness < 1) {
      await this.say("It's not very effective...");
    }
    if (result.isCrit) {
      await this.say('A critical hit!');
    }
    if (buddyEndured && this.isSessionValid(sid)) {
      const playerName = this.player.displayName || this.player.name;
      await this.say(`💖 ${playerName} toughed it out at 1 HP for its trainer!`);
    }

    if (!this.isSessionValid(sid)) return true;

    this.state = BATTLE_STATES.CHECK_FAINT;
    if (defender.isFainted) {
      if (defSide === 'enemy') {
        await this.handleEnemyDefeated(sid);
      } else {
        await this.handlePlayerFainted(sid);
      }
      return true;
    }
    await this.triggerTurnEndAbility(side, attacker, sid);
    if (!this.isSessionValid(sid)) return true;
    return false;
  }

  async executeTurn(side, move, sid = this.sessionId) {
    return this.executeMoveAction(side, move, sid);
  }

  async executeEnemyTurn(sid = this.sessionId) {
    if (!this.isSessionValid(sid) || !this.enemy || this.enemy.isFainted || !this.player || this.player.isFainted) {
      return true;
    }
    this.state = BATTLE_STATES.OPPONENT_AI;
    const chosen = this.chooseEnemyMove();
    if (!chosen) return false;
    this.state = BATTLE_STATES.OPPONENT_ANIMATING;
    return this.executeMoveAction('enemy', chosen, sid);
  }

  async handleUsePotion() {
    if (!this.canAcceptPlayerAction()) return;
    if (!this.player || this.player.isFainted || this.player.hp >= this.player.maxHp) return;
    if (!this.storage.useItem('potions')) return;

    const sid = this.sessionId;
    const pace = this.getPaceConfig();
    const token = this.lockPlayerAction(BATTLE_STATES.ACTION_ANIMATING);
    this.audio?.playHealChime?.();

    try {
      const healAmount = Math.max(18, Math.round(this.player.maxHp * 0.45));
      const gained = this.player.healAmount(healAmount);
      this.storage.save();
      this.spawnImpactFX('player', 'heal', `+${gained} HP`, '#86efac', {
        ring: true,
        ringColor: '#4ade80',
        fontSize: 22,
        lifeScale: pace.particleLifeScale,
      });
      await this.animateHpTo('player', this.player.hp, pace.hpDrainMs);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;
      await this.say(`Used a Berry Potion! ${this.player.displayName || this.player.name} recovered ${gained} HP!`);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      await this.wait(Math.round(pace.interTurnMs * 0.7), sid);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      this.state = BATTLE_STATES.CHECK_FAINT;
      const ended = await this.executeEnemyTurn(sid);
      if (ended || !this.isSessionValid(sid) || this.turnToken !== token) return;

      this.returnToPlayerInput(sid);
    } catch (err) {
      console.error('Potion error:', err);
      if (
        this.isSessionValid(sid) &&
        this.turnToken === token &&
        this.state !== BATTLE_STATES.FORCED_SWITCH &&
        this.state !== BATTLE_STATES.BATTLE_END
      ) {
        this.returnToPlayerInput(sid);
      }
    }
  }

  async handleThrowBall(ballType = 'pokeball') {
    if (!this.canAcceptPlayerAction()) return;
    if (!this.enemy || this.enemy.isFainted || !this.player || this.player.isFainted) return;

    const sid = this.sessionId;
    if (this.isShrine) {
      const token = this.lockPlayerAction(BATTLE_STATES.ACTION_ANIMATING);
      this.audio?.playMenuBlip?.(340);
      await this.say("Shrine Guardians can't be caught! Defeat it to win the Elemental Badge!");
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;
      this.returnToPlayerInput(sid);
      return;
    }

    if (this.isTrainer) {
      const token = this.lockPlayerAction(BATTLE_STATES.ACTION_ANIMATING);
      this.audio?.playMenuBlip?.(340);
      await this.say("You can't catch another trainer's Pokémon!");
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;
      this.returnToPlayerInput(sid);
      return;
    }

    const ballStyle = normalizeBallStyle(ballType);
    const isGreat = ballStyle === 'great';
    const isStar = ballStyle === 'star';

    if (isGreat && !this.storage.useItem('greatBalls')) {
      return;
    }
    if (isStar && !this.storage.useItem('starBalls')) {
      return;
    }

    const token = this.lockPlayerAction(BATTLE_STATES.ACTION_ANIMATING);
    try {
      const ballName = isStar ? 'Star Ball' : isGreat ? 'Great Ball' : 'Poké Ball';
      const ballBonus = isStar ? 2.0 : isGreat ? 1.45 : 1.0;
      await this.say(`Threw a ${ballName}!`);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      this.audio?.playPokeballThrow?.();
      if (isStar) {
        this.audio?.playStarBallShimmer?.();
      }

      const start = this.getSpriteCenter('player');
      const target = this.getSpriteCenter('enemy');
      const pedestal = this.getPedestalPoint('enemy');
      const hoverPos = { x: target.x, y: target.y - 38 };
      const attempt = PokemonMod.calculateCatchAttempt(this.enemy, ballBonus);

      await this.animateBallFlight(start, hoverPos, ballStyle, 430, sid);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      this.captureBeam = { x: target.x, y: target.y };
      this.pokeballAnim = {
        x: hoverPos.x,
        y: hoverPos.y,
        angle: 0,
        ballStyle,
        isGreat,
        isStar,
        glow: true,
        scale: 1.08,
      };
      this.enemySpriteEl?.classList.remove('is-idle');
      this.enemySpriteEl?.classList.add('capture-energize');
      this.audio?.playPokeballAbsorb?.();
      if (isStar) {
        this.audio?.playStarBallShimmer?.();
      }
      await this.wait(180, sid);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      const absorbColors = isStar
        ? ['#fde047', '#c084fc', '#67e8f9', '#f472b6']
        : isGreat
          ? ['#7dd3fc', '#f43f5e']
          : ['#f87171', '#fecaca'];
      for (let i = 0; i < (isStar ? 22 : 16); i++) {
        this.particles.push({
          x: target.x + (Math.random() - 0.5) * 66,
          y: target.y + (Math.random() - 0.5) * 66,
          vx: 0,
          vy: 0,
          gravity: 0,
          pullTo: hoverPos,
          life: 0,
          maxLife: 0.32,
          color: absorbColors[i % absorbColors.length],
          size: 4 + Math.random() * 3,
          shape: 'star',
        });
      }

      this.enemySpriteEl?.classList.add('capture-pull');
      await this.wait(300, sid);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;
      this.captureBeam = null;

      await this.animateBallDropAndBounce(hoverPos.x, hoverPos.y, pedestal.y - 12, ballStyle, sid);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      const pace = this.getPaceConfig();
      const restY = pedestal.y - 12;
      for (let i = 1; i <= attempt.shakes; i++) {
        if (!this.isSessionValid(sid) || this.turnToken !== token) return;
        this.audio?.playPokeballWobble?.(i);
        await this.animateBallWobble(hoverPos.x, restY, ballStyle, i % 2 === 1 ? -1 : 1, sid);
        await this.wait(pace.ballWobblePauseMs, sid);
      }
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      if (attempt.caught) {
        this.state = BATTLE_STATES.BATTLE_END;
        this.pokeballAnim = {
          x: hoverPos.x,
          y: restY,
          angle: 0,
          ballStyle,
          isGreat,
          isStar,
          glow: true,
          shadowAlpha: 0.45,
        };
        this.audio?.playCaptureSuccess?.();
        this.triggerCelebrationGlow('capture', 850);
        this.spawnStarBurst({ x: hoverPos.x, y: restY });
        this.spawnCelebrationConfetti({
          center: { x: hoverPos.x, y: restY },
          colors: ['#fde047', '#38bdf8', '#f472b6', '#4ade80', '#ffffff'],
          ringColors: ['#fde047', '#38bdf8', '#f472b6'],
        });
        this.spawnFloatingText(hoverPos.x, restY - 38, '✨ GOTCHA!', '#fde047', 25, 0, 1.55);

        const isCurious = !this.isShrine && !this.isTrainer && this.enemy?.encounterTrait === 'curious';
        if (isCurious) {
          this.spawnFloatingText(hoverPos.x, restY - 64, '✨ Curious +4 Bond!', '#67e8f9', 16, 0.14, 1.45);
        }
        await this.wait(Math.max(480, Math.round(pace.postImpactMs * 1.3)), sid);
        if (!this.isSessionValid(sid) || this.turnToken !== token) return;
        this.pokeballAnim = null;

        this.enemy.hp = Math.max(1, this.enemy.hp);
        this.player?.gainBond?.(4);
        if (isCurious) {
          this.player?.gainBond?.(4);
          this.enemy?.gainBond?.(4);
        }
        const { destination, newBadges } = this.storage.recordCaught(this.enemy);
        const winBadges = this.storage.recordBattleWin();
        const allNewBadges = [...newBadges, ...winBadges];

        await this.say(
          isCurious
            ? `Gotcha! ${this.enemy.name} was caught! (✨ Curious +4 Bonus Bond!)`
            : `Gotcha! ${this.enemy.name} was caught!`,
        );
        if (!this.isSessionValid(sid) || this.turnToken !== token) return;
        if (destination === 'box') {
          await this.say(`${this.enemy.name} was sent to your Reserve Box (Team of 6 is full)!`);
        }

        const evoBadges = await this.awardVictoryXp(0.6, sid, {
          deferBadges: true,
          excludeUids: this.enemy?.uid ? [this.enemy.uid] : null,
        });
        if (!this.isSessionValid(sid) || this.turnToken !== token) return;
        if (Array.isArray(evoBadges) && evoBadges.length > 0) {
          allNewBadges.push(...evoBadges);
        }
        const shards = this.awardBattleStarShards({ caught: true });
        if (shards > 0) {
          await this.say(`+${shards} ✨ Star Shards!`);
          if (!this.isSessionValid(sid) || this.turnToken !== token) return;
        }
        this.onHudRefresh?.();
        if (allNewBadges.length > 0) {
          this.onBadgesUnlocked?.(allNewBadges);
        }
        this.stop({ outcome: 'caught', caughtSpecies: this.enemy.speciesId });
        return;
      }

      this.audio?.playBreakout?.();
      this.pokeballAnim = null;
      this.enemySpriteEl?.classList.remove('capture-energize', 'capture-pull', 'capture-shrink');
      this.enemySpriteEl?.classList.add('is-idle');
      if (this.enemy.isShiny) {
        this.enemySpriteEl?.classList.add('is-shiny-sprite');
      }
      if (this.enemy.isElite) {
        this.enemySpriteEl?.classList.add('is-elite-sprite');
      }
      this.spawnImpactFX('enemy', 'normal', 'Broke free!', '#fde047', {
        count: 16,
        fontSize: 19,
        lifeScale: pace.particleLifeScale,
      });
      await this.say(`Oh no! ${this.enemy.name} broke free!`);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      await this.wait(Math.round(pace.interTurnMs * 0.7), sid);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      const ended = await this.executeEnemyTurn(sid);
      if (ended || !this.isSessionValid(sid) || this.turnToken !== token) return;

      this.returnToPlayerInput(sid);
    } catch (err) {
      console.error('Capture sequence error:', err);
      if (
        this.isSessionValid(sid) &&
        this.turnToken === token &&
        this.state !== BATTLE_STATES.FORCED_SWITCH &&
        this.state !== BATTLE_STATES.BATTLE_END
      ) {
        this.returnToPlayerInput(sid);
      }
    }
  }

  _runBallRaf(duration, sid, onStep, onDone) {
    if (this.ballRafId !== null) {
      cancelAnimationFrame(this.ballRafId);
      this.ballRafId = null;
    }
    if (this.ballResolver) {
      const prev = this.ballResolver;
      this.ballResolver = null;
      prev();
    }

    const startTime = performance.now();
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        this.ballRafId = null;
        if (this.ballResolver === finish) {
          this.ballResolver = null;
        }
        resolve();
      };
      this.ballResolver = finish;

      const tick = (now) => {
        if (!this.isSessionValid(sid)) {
          finish();
          return;
        }
        const t = Math.min(1, (now - startTime) / Math.max(1, duration));
        onStep(t);
        if (t < 1) {
          this.ballRafId = requestAnimationFrame(tick);
        } else {
          onDone?.();
          finish();
        }
      };
      this.ballRafId = requestAnimationFrame(tick);
    });
  }

  animateBallFlight(start, target, ballOpt, duration, sid = this.sessionId) {
    const ballStyle = normalizeBallStyle(ballOpt);
    const isGreat = ballStyle === 'great';
    const isStar = ballStyle === 'star';
    const trailColors = isStar ? ['#fde047', '#c084fc', '#38bdf8'] : isGreat ? ['#7dd3fc'] : ['#fef08a'];
    return this._runBallRaf(duration, sid, (t) => {
      const arcHeight = Math.sin(t * Math.PI) * 104;
      const bx = start.x + (target.x - start.x) * t;
      const by = start.y + (target.y - start.y) * t - arcHeight;
      this.pokeballAnim = {
        x: bx,
        y: by,
        angle: t * Math.PI * 5,
        ballStyle,
        isGreat,
        isStar,
        glow: isStar,
        scale: 1.0 - t * 0.08,
      };
      if (Math.random() < (isStar ? 0.8 : 0.45)) {
        this.particles.push({
          x: bx,
          y: by,
          vx: (Math.random() - 0.5) * 28,
          vy: (Math.random() - 0.5) * 28,
          gravity: 0,
          life: 0,
          maxLife: isStar ? 0.3 : 0.22,
          color: trailColors[Math.floor(Math.random() * trailColors.length)],
          size: isStar ? 3.5 : 2.5,
          shape: 'star',
        });
      }
    });
  }

  async animateBallDropAndBounce(x, fromY, groundY, ballOpt, sid = this.sessionId) {
    const ballStyle = normalizeBallStyle(ballOpt);
    await this.animateBallSegment(x, fromY, groundY, 0, ballStyle, 210, sid);
    if (!this.isSessionValid(sid)) return;
    this.audio?.playPokeballBounce?.(0);
    this.spawnImpactDust({ x, y: groundY + 12 }, 7);

    const bounceHeights = [30, 14, 6];
    const bounceDurations = [190, 140, 100];
    for (let b = 0; b < bounceHeights.length; b++) {
      if (!this.isSessionValid(sid)) return;
      await this.animateBallBounceArc(x, groundY, bounceHeights[b], ballStyle, bounceDurations[b], sid);
      if (!this.isSessionValid(sid)) return;
      this.audio?.playPokeballBounce?.(b + 1);
      if (b === 0) this.spawnImpactDust({ x, y: groundY + 12 }, 4);
    }
  }

  animateBallSegment(x, y0, y1, angle, ballOpt, duration, sid) {
    const ballStyle = normalizeBallStyle(ballOpt);
    const isGreat = ballStyle === 'great';
    const isStar = ballStyle === 'star';
    return this._runBallRaf(duration, sid, (t) => {
      const eased = t * t;
      this.pokeballAnim = {
        x,
        y: y0 + (y1 - y0) * eased,
        angle,
        ballStyle,
        isGreat,
        isStar,
        glow: false,
        shadowAlpha: 0.25 + eased * 0.2,
      };
    });
  }

  animateBallBounceArc(x, groundY, height, ballOpt, duration, sid) {
    const ballStyle = normalizeBallStyle(ballOpt);
    const isGreat = ballStyle === 'great';
    const isStar = ballStyle === 'star';
    return this._runBallRaf(duration, sid, (t) => {
      const arc = Math.sin(t * Math.PI) * height;
      this.pokeballAnim = {
        x,
        y: groundY - arc,
        angle: 0,
        ballStyle,
        isGreat,
        isStar,
        glow: false,
        shadowAlpha: Math.max(0.18, 0.45 - (arc / 40) * 0.22),
      };
    });
  }

  animateBallWobble(x, y, ballOpt, dir, sid = this.sessionId) {
    const ballStyle = normalizeBallStyle(ballOpt);
    const isGreat = ballStyle === 'great';
    const isStar = ballStyle === 'star';
    return this._runBallRaf(
      280,
      sid,
      (t) => {
        const swing = Math.sin(t * Math.PI * 2) * 0.46 * dir;
        this.pokeballAnim = {
          x: x + Math.sin(t * Math.PI * 2) * 7 * dir,
          y,
          angle: swing,
          ballStyle,
          isGreat,
          isStar,
          glow: t < 0.55,
          shadowAlpha: 0.42,
        };
      },
      () => {
        this.pokeballAnim = {
          x,
          y,
          angle: 0,
          ballStyle,
          isGreat,
          isStar,
          glow: false,
          shadowAlpha: 0.42,
        };
      },
    );
  }

  async handleEnemyDefeated(sid = this.sessionId) {
    const pace = this.getPaceConfig();
    const nextEnemyIdx = this.isTrainer
      ? this.enemyParty.findIndex((mon, idx) => idx > this.enemyPartyIndex && !mon.isFainted)
      : -1;
    const fallbackIdx = nextEnemyIdx >= 0
      ? nextEnemyIdx
      : (this.isTrainer ? this.enemyParty.findIndex((mon) => !mon.isFainted) : -1);
    const hasNextEnemy = fallbackIdx >= 0;

    this.state = hasNextEnemy ? BATTLE_STATES.CHECK_FAINT : BATTLE_STATES.BATTLE_END;
    this.audio?.playFaint?.();
    this.enemySpriteEl?.classList.remove('is-idle');
    this.enemySpriteEl?.classList.add('faint-drop');
    await this.wait(Math.max(320, pace.postImpactMs), sid);
    if (!this.isSessionValid(sid)) return;

    this.renderStatusCards();
    await this.say(`${this.enemy.name} fainted!`);
    if (!this.isSessionValid(sid)) return;

    if (hasNextEnemy) {
      await this.awardVictoryXp(1.0, sid, { deferBadges: false, grantBenchBond: false });
      if (!this.isSessionValid(sid)) return;

      this.enemyPartyIndex = fallbackIdx;
      this.enemy = this.enemyParty[this.enemyPartyIndex];
      this.enemy.resetBattleState?.();
      this.displayedEnemyHp = this.enemy.hp;
      this.storage.recordSeen(this.enemy.speciesId);

      this._resetSpriteClasses('enemy');
      this.enemySpriteEl?.classList.remove('faint-drop');
      this.renderStatusCards();
      await PokemonMod.attachPokemonSprite(this.enemySpriteEl, this.enemy.speciesId, {
        back: false,
        shiny: Boolean(this.enemy.isShiny),
        timeoutMs: 2000,
      });
      if (!this.isSessionValid(sid)) return;

      this.enemySpriteEl?.classList.toggle('is-shiny-sprite', Boolean(this.enemy.isShiny));
      this.enemySpriteEl?.classList.toggle('is-elite-sprite', Boolean(this.enemy.isElite));
      this.enemySpriteEl?.classList.remove('is-idle', 'enemy-sendout');
      if (this.enemySpriteEl) void this.enemySpriteEl.offsetWidth;
      this.enemySpriteEl?.classList.add('enemy-sendout');
      this.audio?.playPokeballThrow?.();
      this.audio?.playPokemonCry?.(this.enemy);
      this.spawnImpactFX('enemy', this.enemy.type, '', '#ffffff', {
        ring: true,
        ringRadius: 84,
        count: 18,
        lifeScale: pace.particleLifeScale,
      });
      if (this.enemy.isShiny) {
        this.audio?.playShinySparkle?.();
        this.spawnShinyIntroSparkles('enemy');
      }
      if (this.enemy.isElite) {
        this.spawnEliteIntroAura('enemy');
      }

      const rivalName = this.trainerData?.name || 'Rival';
      await this.say(`${rivalName} sent out ${this.enemy.name}!`);
      if (!this.isSessionValid(sid)) return;

      this.enemySpriteEl?.classList.remove('enemy-sendout');
      this.enemySpriteEl?.classList.add('is-idle');
      await this.triggerEntryAbility('enemy', this.enemy, sid);
      if (!this.isSessionValid(sid)) return;

      this.returnToPlayerInput(sid);
      return;
    }

    this.player?.gainBond?.(4);
    const badgeList = [...this.storage.recordBattleWin()];
    const wasShrine = this.isShrine;
    const wasShrineData = this.shrineData;
    const isAstralTrial = Boolean(wasShrine && wasShrineData?.isAstralTrial);
    let shrineTrialRecorded = false;

    if (wasShrine && wasShrineData) {
      const shrineBadges = this.storage.markShrineCleared(wasShrineData.id);
      if (Array.isArray(shrineBadges)) {
        badgeList.push(...shrineBadges);
      }
      if (isAstralTrial && typeof this.storage.recordShrineTrialWin === 'function') {
        const trialRes = this.storage.recordShrineTrialWin(wasShrineData.id, { starShards: 3, starBalls: 1 });
        shrineTrialRecorded = true;
        const trialBadges = Array.isArray(trialRes?.newBadges)
          ? trialRes.newBadges
          : (Array.isArray(trialRes) ? trialRes : []);
        if (trialBadges.length > 0) {
          badgeList.push(...trialBadges);
        }
      }
    }

    if (wasShrine || this.isTrainer) {
      const playerCenter = this.getSpriteCenter('player');
      const enemyCenter = this.getSpriteCenter('enemy');
      if (wasShrine) {
        this.audio?.playBadgeFanfare?.();
      } else {
        (this.audio?.playQuestCompleteFanfare || this.audio?.playLevelUp)?.call(this.audio);
      }
      this.triggerCelebrationGlow('victory', 900);
      this.spawnStarBurst(enemyCenter);
      this.spawnCelebrationConfetti({
        center: playerCenter,
        countPerWave: 32,
        colors: isAstralTrial
          ? ['#fde047', '#c084fc', '#38bdf8', '#f472b6', '#ffffff']
          : ['#fde047', '#4ade80', '#38bdf8', '#f472b6', '#ffffff'],
        ringColors: isAstralTrial ? ['#fde047', '#c084fc', '#38bdf8'] : ['#fde047', '#4ade80', '#38bdf8'],
      });
      const calloutText = isAstralTrial
        ? '🌟 ASTRAL TRIAL WON!'
        : wasShrine
          ? '⛩️ SHRINE CLEARED!'
          : '🏆 RIVAL VICTORY!';
      this.spawnFloatingText(playerCenter.x, playerCenter.y - 46, calloutText, '#fde047', 22, 0, 1.55);
      await this.wait(Math.max(260, Math.round(pace.postImpactMs * 0.85)), sid);
      if (!this.isSessionValid(sid)) return;
      if (isAstralTrial) {
        const trialNum = wasShrineData?.trialNumber || 1;
        await this.say(
          shrineTrialRecorded
            ? `🌟 Astral Shrine Trial #${trialNum} Complete! Earned +3 ✨ Star Shards & +1 🌟 Star Ball!`
            : `🌟 Astral Shrine Trial #${trialNum} Complete!`,
        );
        if (!this.isSessionValid(sid)) return;
      }
    }

    const evoBadges = await this.awardVictoryXp(1.0, sid, { deferBadges: true });
    if (!this.isSessionValid(sid)) return;
    if (Array.isArray(evoBadges) && evoBadges.length > 0) {
      badgeList.push(...evoBadges);
    }

    const shards = this.awardBattleStarShards({ caught: false });
    if (shards > 0) {
      const trait = !wasShrine && !this.isTrainer ? this.enemy?.encounterTrait : null;
      if (trait === 'treasure' || trait === 'apex') {
        const enemyCenter = this.getSpriteCenter('enemy');
        this.spawnCelebrationConfetti({
          center: enemyCenter,
          waves: 1,
          countPerWave: 16,
          colors: ['#fde047', '#fbbf24', '#ffffff'],
          rings: false,
        });
        this.spawnFloatingText(
          enemyCenter.x,
          enemyCenter.y - 32,
          trait === 'treasure' ? '💎 +1 Treasure Shard!' : '👑 +1 Apex Shard!',
          '#fde047',
          17,
          0,
          1.35,
        );
      }
      await this.say(`+${shards} ✨ Star Shards!`);
      if (!this.isSessionValid(sid)) return;
    }

    if (!this.isTrainer) {
      const dropChance = this.isShrine ? 0.9 : 0.45;
      if (Math.random() < dropChance) {
        const dropBiome = this.shrineData?.biome || this.biomeId;
        const gemByBiome = {
          forest: () => 'leaf_gem',
          cave: () => 'moon_gem',
          water: () => 'water_gem',
          volcano: () => (Math.random() < 0.5 ? 'fire_gem' : 'thunder_gem'),
          peak: () => 'ice_gem',
          grove: () => 'astral_gem',
          desert: () => (Math.random() < 0.5 ? 'prism_gem' : 'sun_gem'),
          marsh: () => (Math.random() < 0.5 ? 'dusk_gem' : 'leaf_gem'),
          sanctum: () => (Math.random() < 0.5 ? 'prism_gem' : 'astral_gem'),
          canyon: () => (Math.random() < 0.5 ? 'thunder_gem' : 'sun_gem'),
          reef: () => (Math.random() < 0.5 ? 'water_gem' : 'moon_gem'),
          ruins: () => (Math.random() < 0.5 ? 'chrono_gem' : 'dusk_gem'),
          rift: () => (Math.random() < 0.5 ? 'nebula_gem' : 'astral_gem'),
          faeveldt: () => 'pixie_gem',
          atoll: () => 'alola_gem',
          highlands: () => 'crown_gem',
          crater: () => 'tera_gem',
        };
        const fallbackGemNames = {
          leaf_gem: 'Verdant Gem',
          moon_gem: 'Starlight Gem',
          water_gem: 'Tide Gem',
          fire_gem: 'Ember Gem',
          thunder_gem: 'Spark Gem',
          ice_gem: 'Aurora Gem',
          sun_gem: 'Sunburst Gem',
          dusk_gem: 'Twilight Gem',
          astral_gem: 'Astral Gem',
          prism_gem: 'Prism Gem',
          chrono_gem: 'Chrono Amber',
          nebula_gem: 'Nebula Core',
          pixie_gem: 'Pixie Ribbon Gem',
          alola_gem: 'Island Kahuna Shell',
          crown_gem: 'Sovereign Crest',
          tera_gem: 'Terastal Shard',
        };
        const gemId = gemByBiome[dropBiome]?.() || null;
        const roll = Math.random();
        let bonus = null;
        let itemLabel = '';

        if (gemId && roll < 0.34) {
          bonus = { gems: { [gemId]: 1 } };
          const gemMeta = getEvolutionItemsMap()?.[gemId] || FALLBACK_ITEMS[gemId];
          const gemName = gemMeta?.name || fallbackGemNames[gemId] || 'Evolution Gem';
          itemLabel = `${gemMeta?.icon || '💎'} a ${gemName}`;
        } else if (roll < 0.58) {
          bonus = { starBalls: 1 };
          itemLabel = '🌟 a Star Ball';
        } else if (roll < 0.8) {
          bonus = { greatBalls: 1 };
          itemLabel = '🔵 a Great Ball';
        } else {
          bonus = { potions: 1 };
          itemLabel = '🍓 a Berry Potion';
        }

        this.storage.addRewards(bonus);
        await this.say(`Found ${itemLabel} on the victory trail!`);
        if (!this.isSessionValid(sid)) return;
      }
    }

    this.onHudRefresh?.();
    if (badgeList.length > 0) {
      this.onBadgesUnlocked?.(badgeList);
    }
    this.stop({
      outcome: 'won',
      isShrine: wasShrine,
      shrineData: wasShrineData,
      shrineTrialRecorded,
      isTrainer: this.isTrainer,
      trainerData: this.trainerData,
    });
  }

  async animateXpTo(fromPct, toPct, duration = 450, sid = this.sessionId) {
    if (!this.isSessionValid(sid) || !this.playerXpFillEl) return;
    const safeFrom = Math.max(0, Math.min(100, Number(fromPct) || 0));
    const safeTo = Math.max(0, Math.min(100, Number(toPct) || 0));
    if (duration <= 0 || Math.abs(safeTo - safeFrom) < 0.25) {
      this.playerXpFillEl.style.width = `${safeTo}%`;
      return;
    }

    if (this.xpRaf !== null) {
      cancelAnimationFrame(this.xpRaf);
      this.xpRaf = null;
    }
    if (this.xpResolver) {
      const prev = this.xpResolver;
      this.xpResolver = null;
      prev();
    }

    const startTime = performance.now();
    let lastTickAt = -100;

    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        this.xpRaf = null;
        if (this.xpResolver === done) {
          this.xpResolver = null;
        }
        resolve();
      };
      this.xpResolver = done;

      const tick = (now) => {
        if (!this.isSessionValid(sid)) {
          done();
          return;
        }
        const t = Math.min(1, (now - startTime) / Math.max(1, duration));
        const eased = 1 - Math.pow(1 - t, 2);
        const pct = safeFrom + (safeTo - safeFrom) * eased;
        if (this.playerXpFillEl) {
          this.playerXpFillEl.style.width = `${pct.toFixed(2)}%`;
        }
        if (now - lastTickAt >= 58 && t < 0.98) {
          lastTickAt = now;
          this.audio?.playXpTick?.(pct / 100);
        }

        if (t < 1 && this.isSessionValid(sid)) {
          this.xpRaf = requestAnimationFrame(tick);
        } else {
          if (this.playerXpFillEl) {
            this.playerXpFillEl.style.width = `${Math.round(safeTo)}%`;
          }
          done();
        }
      };

      this.xpRaf = requestAnimationFrame(tick);
    });
  }

  awardBattleStarShards({ caught = false } = {}) {
    const trait = !this.isShrine && !this.isTrainer ? this.enemy?.encounterTrait : null;
    const hasShardTrait = trait === 'treasure' || trait === 'apex';
    let rawShards;
    if (typeof PokemonMod.getBattleShardReward === 'function') {
      const withTrait = PokemonMod.getBattleShardReward(this.enemy, {
        isShrine: this.isShrine,
        isTrainer: this.isTrainer,
        caught: Boolean(caught),
      });
      const withoutTrait = hasShardTrait
        ? PokemonMod.getBattleShardReward(
            { ...this.enemy, encounterTrait: null },
            {
              isShrine: this.isShrine,
              isTrainer: this.isTrainer,
              caught: Boolean(caught),
            },
          )
        : withTrait;
      const traitAlreadyCounted = withTrait > withoutTrait;
      rawShards = (!caught && hasShardTrait && !traitAlreadyCounted)
        ? withTrait + 1
        : withTrait;
    } else {
      rawShards = (this.isShrine ? 3 : this.isTrainer ? 2 : this.enemy?.isElite ? 3 : 1)
        + (!caught && hasShardTrait ? 1 : 0);
    }
    const shards = Math.max(0, Math.round(Number(rawShards) || 0));
    if (shards <= 0 || !this.storage) return 0;

    if (typeof this.storage.addStarShards === 'function') {
      this.storage.addStarShards(shards);
    } else {
      const profile = this.storage.getActiveProfile?.();
      const before = Number(profile?.bag?.starShards) || 0;
      this.storage.addRewards?.({ starShards: shards });
      const after = Number(profile?.bag?.starShards) || 0;
      if (after === before && profile) {
        if (!profile.bag || typeof profile.bag !== 'object') {
          profile.bag = { potions: 0, greatBalls: 0, starBalls: 0, gems: {}, starShards: 0 };
        }
        profile.bag.starShards = before + shards;
        this.storage.save?.();
      }
    }
    return shards;
  }

  async awardVictoryXp(scale = 1.0, sid = this.sessionId, { deferBadges = false, excludeUids = null, grantBenchBond = true } = {}) {
    if (!this.isSessionValid(sid)) return [];
    const pace = this.getPaceConfig();
    const playerName = this.player.displayName || this.player.name;
    const prevXp = this.player.xp;
    const prevXpToNext = Math.max(1, this.player.xpToNext);
    const startPct = Math.min(100, (prevXp / prevXpToNext) * 100);

    const bondMult = PokemonMod.getBondTier?.(this.player.bond)?.xpMult ?? 1.0;
    const isSpirited = !this.isShrine && !this.isTrainer && this.enemy?.encounterTrait === 'spirited';
    const traitMult = isSpirited ? 1.15 : 1.0;
    const xpGain = Math.max(12, Math.round((this.enemy.level * 14 + 12) * scale * bondMult * traitMult));
    await this.say(isSpirited ? `${playerName} gained ${xpGain} XP (⚡ Spirited +15%)!` : `${playerName} gained ${xpGain} XP!`);
    if (!this.isSessionValid(sid)) return [];

    const levelResult = this.player.gainXp(xpGain);
    const profile = this.storage.getActiveProfile?.();
    const excludeSet = new Set(Array.isArray(excludeUids) ? excludeUids.filter(Boolean) : []);
    const benchShareXp = Math.max(6, Math.round(xpGain * 0.4));
    const benchReceivers = [];
    const benchLevelUps = [];
    if (profile && Array.isArray(profile.team)) {
      for (const mate of profile.team) {
        if (!mate || mate === this.player || (this.player.uid && mate.uid === this.player.uid)) continue;
        if (mate.uid && excludeSet.has(mate.uid)) continue;
        if (mate.isFainted || Number(mate.hp) <= 0) continue;
        const benchRes = mate.gainXp?.(benchShareXp);
        if (grantBenchBond) {
          mate.gainBond?.(2);
        }
        benchReceivers.push(mate);
        if (benchRes?.leveledUp) {
          benchLevelUps.push({
            name: mate.displayName || mate.name,
            newLevel: benchRes.newLevel,
          });
        }
      }
    }

    const bondBadges = (grantBenchBond && typeof this.storage.evaluateBadges === 'function')
      ? this.storage.evaluateBadges(false)
      : [];
    this.storage.save();
    this.displayedPlayerHp = this.player.hp;
    const endPct = Math.min(100, (this.player.xp / Math.max(1, this.player.xpToNext)) * 100);

    if (levelResult.leveledUp) {
      await this.animateXpTo(startPct, 100, Math.round((pace.hpDrainMs || 460) * 0.8), sid);
      if (!this.isSessionValid(sid)) return [];

      this.audio?.playLevelUp?.();
      this.triggerCelebrationGlow('levelup', 780);
      const center = this.getSpriteCenter('player');
      this.spawnStarBurst(center);
      this.spawnCelebrationConfetti({
        center,
        colors: ['#fde047', '#fbbf24', '#38bdf8', '#4ade80', '#ffffff'],
        ringColors: ['#fde047', '#fb923c', '#38bdf8'],
      });
      this.spawnFloatingText(center.x, center.y - 42, `🌟 LEVEL UP! Lv.${levelResult.newLevel}`, '#fde047', 22, 0, 1.55);
      this.renderStatusCards();
      if (this.playerXpFillEl) {
        this.playerXpFillEl.style.width = '0%';
      }
      this.onHudRefresh?.();
      await this.say(`${playerName} grew to Level ${levelResult.newLevel}!`);
      if (!this.isSessionValid(sid)) return [];

      if (endPct > 0) {
        await this.animateXpTo(0, endPct, Math.round((pace.hpDrainMs || 460) * 0.7), sid);
        if (!this.isSessionValid(sid)) return [];
      }
    } else {
      await this.animateXpTo(startPct, endPct, pace.hpDrainMs || 460, sid);
      if (!this.isSessionValid(sid)) return [];
    }

    if (benchReceivers.length > 0 && this.isSessionValid(sid)) {
      if (benchLevelUps.length > 0 && !levelResult.leveledUp) {
        this.audio?.playLevelUp?.();
      }
      const lvlSummary = benchLevelUps.length > 0
        ? ` (${benchLevelUps.map((u) => `${u.name} → Lv.${u.newLevel}!`).join(', ')})`
        : '';
      await this.say(`Team bench gained ${benchShareXp} Catch-Up XP!${lvlSummary}`);
      if (!this.isSessionValid(sid)) return [];
    }

    this.renderStatusCards();
    this.onHudRefresh?.();

    const pendingEvo = this.player.getPendingLevelEvolution?.();
    if (pendingEvo && this.isSessionValid(sid)) {
      const evoBadges = await this.runEvolutionCeremony(pendingEvo, sid, { emitBadges: !deferBadges });
      if (!deferBadges && bondBadges.length > 0) {
        this.onBadgesUnlocked?.(bondBadges);
      }
      return [...bondBadges, ...(Array.isArray(evoBadges) ? evoBadges : [])];
    }
    if (!deferBadges && bondBadges.length > 0) {
      this.onBadgesUnlocked?.(bondBadges);
    }
    return bondBadges;
  }

  async runEvolutionCeremony(pendingEvo, sid = this.sessionId, { emitBadges = true } = {}) {
    if (!pendingEvo || !this.player || !this.isSessionValid(sid)) return [];

    const oldName = this.player.displayName || this.player.name;
    const center = this.getSpriteCenter('player');
    await this.say(`What?! ${oldName} is glowing with Starlight energy!`);
    if (!this.isSessionValid(sid)) return [];

    this.audio?.playEvolutionStart?.();
    this.playerSpriteEl?.classList.remove('is-idle');
    this.playerSpriteEl?.classList.add('evo-glow');

    const spiralColors = ['#fde047', '#f472b6', '#38bdf8', '#c084fc', '#ffffff'];
    for (let i = 0; i < 24; i++) {
      const startAngle = (Math.PI * 2 * i) / 24;
      this.particles.push({
        x: center.x + Math.cos(startAngle) * 78,
        y: center.y + Math.sin(startAngle) * 56,
        orbitCenter: center,
        orbitAngle: startAngle,
        orbitRadius: 72 + (i % 3) * 14,
        orbitRadialVel: -52,
        orbitAngVel: 7.5,
        life: -(i * 0.025),
        maxLife: 1.05,
        color: spiralColors[i % spiralColors.length],
        size: 4.5 + (i % 3) * 1.5,
        rotation: startAngle,
        spin: 9,
        shape: 'star',
      });
    }

    await this.wait(560, sid);
    if (!this.isSessionValid(sid)) return [];

    this.playerSpriteEl?.classList.add('evo-flash');
    await this.wait(420, sid);
    if (!this.isSessionValid(sid)) return [];

    const evoRes = typeof this.storage.evolvePokemon === 'function'
      ? this.storage.evolvePokemon(this.player.uid, pendingEvo.toId)
      : { evolution: this.player.evolve?.(pendingEvo.toId), newBadges: [] };

    await PokemonMod.attachPokemonSprite(this.playerSpriteEl, pendingEvo.toId, {
      back: true,
      shiny: Boolean(this.player.isShiny),
      timeoutMs: 2000,
    });
    if (!this.isSessionValid(sid)) return [];

    this.playerSpriteEl?.classList.remove('evo-glow', 'evo-flash');
    this._resetSpriteClasses('player');
    this.displayedPlayerHp = this.player.hp;
    this.renderStatusCards();
    this.renderMoveButtons();
    this.onHudRefresh?.();

    this.audio?.playEvolutionFanfare?.();
    this.audio?.playPokemonCry?.(this.player);
    this.triggerCelebrationGlow('evo', 960);
    this.spawnStarBurst(center);
    this.spawnCelebrationConfetti({
      center,
      countPerWave: 34,
      colors: ['#fde047', '#f472b6', '#38bdf8', '#c084fc', '#ffffff'],
      ringColors: ['#fde047', '#c084fc', '#38bdf8'],
    });
    this.spawnFloatingText(center.x, center.y - 46, '🌟 EVOLVED!', '#fde047', 26, 0, 1.65);

    const movesMap = getMovesMap();
    const unlockedList = Array.isArray(evoRes?.evolution?.unlockedMoves) ? evoRes.evolution.unlockedMoves : [];
    const moveNames = unlockedList
      .map((m) => (typeof m === 'string' ? (movesMap[m]?.name || m) : m?.name || ''))
      .filter(Boolean);
    const moveText = moveNames.length > 0 ? ` Learned ${moveNames.join(', ')}!` : '';

    await this.say(`✨ Congratulations! ${oldName} evolved into ${this.player.name}!${moveText}`);
    if (!this.isSessionValid(sid)) return [];

    const evoBadges = Array.isArray(evoRes?.newBadges) ? evoRes.newBadges : [];
    if (emitBadges && evoBadges.length > 0) {
      this.onBadgesUnlocked?.(evoBadges);
    }
    return evoBadges;
  }

  async handlePlayerFainted(sid = this.sessionId) {
    const pace = this.getPaceConfig();
    this.audio?.playFaint?.();
    this.playerSpriteEl?.classList.remove('is-idle');
    this.playerSpriteEl?.classList.add('faint-drop');
    await this.wait(Math.max(320, pace.postImpactMs), sid);
    if (!this.isSessionValid(sid)) return;
    await this.say(`${this.player.displayName || this.player.name} fainted!`);
    if (!this.isSessionValid(sid)) return;

    const profile = this.storage.getActiveProfile();
    const healthyIdx = profile?.team?.findIndex((mon) => !mon.isFainted) ?? -1;
    if (healthyIdx >= 0) {
      this.state = BATTLE_STATES.FORCED_SWITCH;
      this.busy = false;
      this.mustSwitchForced = true;
      this.screenEl?.classList.remove('is-action-locked');
      this.openTeamDrawer(true);
      return;
    }

    this.state = BATTLE_STATES.BATTLE_END;
    await this.say('Your team needs a quick rest! Returning to Starlight Fountain...');
    if (!this.isSessionValid(sid)) return;
    this.stop({ outcome: 'fainted', faintedAll: true });
  }

  async handleRun() {
    if (!this.canAcceptPlayerAction()) return;
    const sid = this.sessionId;
    const token = this.lockPlayerAction(BATTLE_STATES.BATTLE_END);
    this.audio?.playMenuBlip?.(520);
    await this.say(
      this.isShrine
        ? 'Stepped back safely from the Shrine!'
        : this.isTrainer
          ? 'Stepped back safely from the duel!'
          : 'Got away safely!',
    );
    if (!this.isSessionValid(sid) || this.turnToken !== token) return;
    this.stop({ outcome: 'escaped', faintedAll: false });
  }

  openTeamDrawer(forced = false) {
    if (!this.active) return;
    if (!forced && !this.canAcceptPlayerAction()) return;
    const profile = this.storage.getActiveProfile();
    if (!profile || !this.teamDrawerEl || !this.teamListEl) return;

    if (!forced) {
      this.audio?.playMenuBlip?.(640);
    }

    this.mustSwitchForced = forced;
    if (this.teamCloseBtn) this.teamCloseBtn.hidden = forced;
    this.teamDrawerEl.hidden = false;
    this.teamListEl.innerHTML = '';

    profile.team.forEach((mon, idx) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'battle-switch-card';
      const isCurrent = idx === this.playerIndex;
      card.disabled = mon.isFainted || isCurrent;

      const img = document.createElement('img');
      PokemonMod.attachPokemonSprite(img, mon.speciesId, {
        back: false,
        shiny: Boolean(mon.isShiny),
        timeoutMs: 1500,
      });

      const rankBadge = (mon.upgradeTier || 0) > 0
        ? ` <span class="rank-pill">★${mon.upgradeTier}</span>`
        : '';
      const info = document.createElement('div');
      info.innerHTML = `
        <strong>${mon.isShiny ? '✨ ' : ''}${mon.displayName || mon.name}</strong>${rankBadge} <span style="color:#fde047">Lv.${mon.level}</span>
        <div style="font-size:0.75rem;color:#cbd5e1">HP ${mon.hp}/${mon.maxHp} ${isCurrent ? '• Active' : mon.isFainted ? '• Fainted' : ''}</div>
      `;

      card.appendChild(img);
      card.appendChild(info);
      card.addEventListener('click', () => this.switchPlayerPokemon(idx));
      this.teamListEl.appendChild(card);
    });
  }

  closeTeamDrawer() {
    if (this.teamDrawerEl) {
      this.teamDrawerEl.hidden = true;
    }
  }

  async switchPlayerPokemon(teamIdx) {
    if (!this.active || this.busy) return;
    if (this.state !== BATTLE_STATES.PLAYER_INPUT && this.state !== BATTLE_STATES.FORCED_SWITCH) return;
    const profile = this.storage.getActiveProfile();
    if (!profile || !profile.team[teamIdx] || profile.team[teamIdx].isFainted) return;
    if (teamIdx === this.playerIndex) return;

    const sid = this.sessionId;
    const pace = this.getPaceConfig();
    const wasForced = this.mustSwitchForced;
    this.mustSwitchForced = false;
    this.closeTeamDrawer();
    const token = this.lockPlayerAction(BATTLE_STATES.ACTION_ANIMATING);
    this.audio?.playMoveSelect?.();

    try {
      this.playerIndex = teamIdx;
      this.player = profile.team[teamIdx];
      this.player.resetBattleState?.();
      this.selectedMoveIndex = 0;
      this.displayedPlayerHp = this.player.hp;
      this._resetSpriteClasses('player');

      this.renderStatusCards();
      this.renderMoveButtons();
      this.setControlsDisabled(true);
      this.onHudRefresh?.();
      await PokemonMod.attachPokemonSprite(this.playerSpriteEl, this.player.speciesId, {
        back: true,
        shiny: Boolean(this.player.isShiny),
        timeoutMs: 1800,
      });
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;
      this.playerSpriteEl?.classList.toggle('is-shiny-sprite', Boolean(this.player.isShiny));
      this.playerSpriteEl?.classList.remove('is-idle', 'player-sendout');
      if (this.playerSpriteEl) void this.playerSpriteEl.offsetWidth;
      this.playerSpriteEl?.classList.add('player-sendout');
      this.audio?.playPokeballThrow?.();
      this.audio?.playPokemonCry?.(this.player);
      this.spawnImpactFX('player', this.player.type, '', '#ffffff', {
        ring: true,
        ringRadius: 72,
        count: 14,
        lifeScale: pace.particleLifeScale,
      });
      await this.say(`Go, ${this.player.displayName || this.player.name}!`);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      this.playerSpriteEl?.classList.remove('player-sendout');
      this.playerSpriteEl?.classList.add('is-idle');
      await this.triggerEntryAbility('player', this.player, sid);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      if (!wasForced) {
        await this.wait(Math.round(pace.interTurnMs * 0.7), sid);
        if (!this.isSessionValid(sid) || this.turnToken !== token) return;
        const ended = await this.executeEnemyTurn(sid);
        if (ended || !this.isSessionValid(sid) || this.turnToken !== token) return;
      }

      this.returnToPlayerInput(sid);
    } catch (err) {
      console.error('Switch error:', err);
      if (
        this.isSessionValid(sid) &&
        this.turnToken === token &&
        this.state !== BATTLE_STATES.FORCED_SWITCH &&
        this.state !== BATTLE_STATES.BATTLE_END
      ) {
        this.returnToPlayerInput(sid);
      }
    }
  }
}
