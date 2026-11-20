export const GAME_META = {
  title: 'Pokémon: Starlight Island',
  subtitle: 'Violet & Ozias Adventure',
  version: '1.0.0',
  tileSize: 32,
  viewportCols: 15,
  viewportRows: 11,
  spawn: { x: 8, y: 15, dir: 'down' },
};

export const TRAINERS = {
  violet: {
    id: 'violet',
    name: 'Violet',
    accent: '#c084fc',
    accentDark: '#7e22ce',
    accentSoft: 'rgba(192, 132, 252, 0.22)',
    outfitPrimary: '#a855f7',
    outfitSecondary: '#f472b6',
    hair: '#3b0764',
    skin: '#fde2c8',
    emblem: '★',
    tagline: 'Starlight Mystic & Explorer',
  },
  ozias: {
    id: 'ozias',
    name: 'Ozias',
    accent: '#38bdf8',
    accentDark: '#0369a1',
    accentSoft: 'rgba(56, 189, 248, 0.22)',
    outfitPrimary: '#0ea5e9',
    outfitSecondary: '#f59e0b',
    hair: '#451a03',
    skin: '#f6cfa9',
    emblem: '⚡',
    tagline: 'Thunder Champion & Ranger',
  },
};

export const TYPES = {
  grass: { id: 'grass', label: 'Grass', color: '#22c55e', bg: '#14532d', icon: '🌿' },
  fire: { id: 'fire', label: 'Fire', color: '#f97316', bg: '#7c2d12', icon: '🔥' },
  water: { id: 'water', label: 'Water', color: '#38bdf8', bg: '#0c4a6e', icon: '💧' },
  electric: { id: 'electric', label: 'Electric', color: '#facc15', bg: '#713f12', icon: '⚡' },
  rock: { id: 'rock', label: 'Rock', color: '#a8a29e', bg: '#44403c', icon: '🪨' },
  psychic: { id: 'psychic', label: 'Psychic', color: '#f472b6', bg: '#701a75', icon: '✨' },
  normal: { id: 'normal', label: 'Normal', color: '#cbd5e1', bg: '#334155', icon: '⭐' },
};

export const TYPE_CHART = {
  grass: { water: 2, rock: 2, fire: 0.5, grass: 0.5 },
  fire: { grass: 2, water: 0.5, rock: 0.5, fire: 0.5 },
  water: { fire: 2, rock: 2, grass: 0.5, water: 0.5 },
  electric: { water: 2, grass: 0.5, electric: 0.5, rock: 0.5 },
  rock: { fire: 2, electric: 2, grass: 0.5, water: 0.5, rock: 0.5 },
  psychic: { rock: 1.5, psychic: 0.5 },
  normal: { rock: 0.5 },
};

export const MOVES = {
  tackle: { id: 'tackle', name: 'Tackle', type: 'normal', power: 40, accuracy: 100, pp: 25, damageClass: 'physical', category: 'attack', fx: 'impact' },
  quick_attack: { id: 'quick_attack', name: 'Quick Attack', type: 'normal', power: 48, accuracy: 100, pp: 25, damageClass: 'physical', category: 'attack', fx: 'impact' },
  swift: { id: 'swift', name: 'Swift Stars', type: 'normal', power: 58, accuracy: 100, pp: 20, damageClass: 'special', category: 'attack', fx: 'star' },
  gust: { id: 'gust', name: 'Wing Gust', type: 'normal', power: 46, accuracy: 100, pp: 25, damageClass: 'special', category: 'attack', fx: 'wind' },
  vine_whip: { id: 'vine_whip', name: 'Vine Whip', type: 'grass', power: 46, accuracy: 100, pp: 25, damageClass: 'physical', category: 'attack', fx: 'grass' },
  razor_leaf: { id: 'razor_leaf', name: 'Razor Leaf', type: 'grass', power: 58, accuracy: 96, pp: 20, damageClass: 'physical', category: 'attack', fx: 'grass' },
  solar_pulse: { id: 'solar_pulse', name: 'Solar Beam', type: 'grass', power: 72, accuracy: 95, pp: 10, damageClass: 'special', category: 'attack', fx: 'grass' },
  synthesis: { id: 'synthesis', name: 'Synthesis', type: 'grass', power: 0, accuracy: 100, pp: 10, damageClass: 'status', category: 'heal', fx: 'heal' },
  ember: { id: 'ember', name: 'Ember', type: 'fire', power: 46, accuracy: 100, pp: 25, damageClass: 'special', category: 'attack', fx: 'fire' },
  flame_wheel: { id: 'flame_wheel', name: 'Flame Wheel', type: 'fire', power: 60, accuracy: 96, pp: 20, damageClass: 'physical', category: 'attack', fx: 'fire' },
  fire_spin: { id: 'fire_spin', name: 'Fire Spin', type: 'fire', power: 70, accuracy: 92, pp: 15, damageClass: 'special', category: 'attack', fx: 'fire' },
  morning_sun: { id: 'morning_sun', name: 'Morning Sun', type: 'fire', power: 0, accuracy: 100, pp: 10, damageClass: 'status', category: 'heal', fx: 'heal' },
  water_gun: { id: 'water_gun', name: 'Water Gun', type: 'water', power: 46, accuracy: 100, pp: 25, damageClass: 'special', category: 'attack', fx: 'water' },
  bubble_beam: { id: 'bubble_beam', name: 'Bubble Beam', type: 'water', power: 60, accuracy: 98, pp: 20, damageClass: 'special', category: 'attack', fx: 'water' },
  surf_wave: { id: 'surf_wave', name: 'Tidal Wave', type: 'water', power: 74, accuracy: 95, pp: 15, damageClass: 'special', category: 'attack', fx: 'water' },
  aqua_ring: { id: 'aqua_ring', name: 'Aqua Ring', type: 'water', power: 0, accuracy: 100, pp: 10, damageClass: 'status', category: 'heal', fx: 'heal' },
  thunder_shock: { id: 'thunder_shock', name: 'Thunder Shock', type: 'electric', power: 48, accuracy: 100, pp: 25, damageClass: 'special', category: 'attack', fx: 'electric' },
  thunderbolt: { id: 'thunderbolt', name: 'Thunderbolt', type: 'electric', power: 68, accuracy: 96, pp: 15, damageClass: 'special', category: 'attack', fx: 'electric' },
  spark_dash: { id: 'spark_dash', name: 'Spark Dash', type: 'electric', power: 56, accuracy: 100, pp: 20, damageClass: 'physical', category: 'attack', fx: 'electric' },
  rock_throw: { id: 'rock_throw', name: 'Rock Throw', type: 'rock', power: 50, accuracy: 96, pp: 20, damageClass: 'physical', category: 'attack', fx: 'rock' },
  rock_slide: { id: 'rock_slide', name: 'Rock Slide', type: 'rock', power: 66, accuracy: 94, pp: 15, damageClass: 'physical', category: 'attack', fx: 'rock' },
  gem_crash: { id: 'gem_crash', name: 'Crystal Smash', type: 'rock', power: 72, accuracy: 92, pp: 10, damageClass: 'physical', category: 'attack', fx: 'rock' },
  confusion: { id: 'confusion', name: 'Confusion', type: 'psychic', power: 50, accuracy: 100, pp: 25, damageClass: 'special', category: 'attack', fx: 'psychic' },
  psybeam: { id: 'psybeam', name: 'Psybeam', type: 'psychic', power: 64, accuracy: 98, pp: 20, damageClass: 'special', category: 'attack', fx: 'psychic' },
  starlight_ray: { id: 'starlight_ray', name: 'Starlight Ray', type: 'psychic', power: 72, accuracy: 95, pp: 10, damageClass: 'special', category: 'attack', fx: 'psychic' },
  wish: { id: 'wish', name: 'Star Wish', type: 'psychic', power: 0, accuracy: 100, pp: 10, damageClass: 'status', category: 'heal', fx: 'heal' },
};

export const STARTER_IDS = [1, 4, 7];

export const SPECIES = {
  1: {
    id: 1,
    name: 'Bulbasaur',
    type: 'grass',
    biome: 'starter',
    catchFactor: 0.72,
    color: '#4ade80',
    baseStats: { hp: 48, atk: 50, def: 50, spd: 45 },
    movePool: ['vine_whip', 'tackle', 'razor_leaf', 'synthesis'],
    flavor: 'A sunny seed rests on its back, blooming with sweet forest energy.',
  },
  4: {
    id: 4,
    name: 'Charmander',
    type: 'fire',
    biome: 'starter',
    catchFactor: 0.72,
    color: '#fb923c',
    baseStats: { hp: 44, atk: 54, def: 44, spd: 60 },
    movePool: ['ember', 'quick_attack', 'flame_wheel', 'morning_sun'],
    flavor: 'Its lively tail flame burns brightest when cheering on its trainer!',
  },
  7: {
    id: 7,
    name: 'Squirtle',
    type: 'water',
    biome: 'starter',
    catchFactor: 0.72,
    color: '#38bdf8',
    baseStats: { hp: 47, atk: 48, def: 58, spd: 46 },
    movePool: ['water_gun', 'tackle', 'bubble_beam', 'aqua_ring'],
    flavor: 'A playful swimmer whose sleek shell slices swiftly through waves.',
  },
  10: {
    id: 10,
    name: 'Caterpie',
    type: 'grass',
    biome: 'forest',
    catchFactor: 0.94,
    color: '#84cc16',
    baseStats: { hp: 42, atk: 36, def: 38, spd: 44 },
    movePool: ['tackle', 'vine_whip', 'quick_attack', 'synthesis'],
    flavor: 'A friendly green crawler who naps beneath Whispering Forest leaves.',
  },
  16: {
    id: 16,
    name: 'Pidgey',
    type: 'normal',
    biome: 'forest',
    catchFactor: 0.9,
    color: '#d97706',
    baseStats: { hp: 42, atk: 45, def: 40, spd: 56 },
    movePool: ['gust', 'quick_attack', 'tackle', 'swift'],
    flavor: 'Flutters between sunlit treetops and loves racing coastal breezes.',
  },
  25: {
    id: 25,
    name: 'Pikachu',
    type: 'electric',
    biome: 'forest',
    catchFactor: 0.74,
    color: '#facc15',
    baseStats: { hp: 45, atk: 56, def: 42, spd: 72 },
    movePool: ['thunder_shock', 'quick_attack', 'spark_dash', 'thunderbolt'],
    flavor: 'Stores cheerful lightning bolts in its rosy cheeks to light dark trails.',
  },
  43: {
    id: 43,
    name: 'Oddish',
    type: 'grass',
    biome: 'forest',
    catchFactor: 0.88,
    color: '#34d399',
    baseStats: { hp: 46, atk: 48, def: 50, spd: 34 },
    movePool: ['vine_whip', 'razor_leaf', 'tackle', 'synthesis'],
    flavor: 'Wanders happily under starlight with leafy sprouts swaying on top.',
  },
  133: {
    id: 133,
    name: 'Eevee',
    type: 'normal',
    biome: 'forest',
    catchFactor: 0.74,
    color: '#d4a373',
    baseStats: { hp: 52, atk: 52, def: 48, spd: 56 },
    movePool: ['quick_attack', 'swift', 'tackle', 'wish'],
    flavor: 'Brimming with endless possibilities and always eager to make new friends.',
  },
  35: {
    id: 35,
    name: 'Clefairy',
    type: 'psychic',
    biome: 'cave',
    catchFactor: 0.8,
    color: '#f472b6',
    baseStats: { hp: 58, atk: 46, def: 48, spd: 40 },
    movePool: ['confusion', 'swift', 'psybeam', 'wish'],
    flavor: 'Dances in glowing Crystal Cavern beams whenever the moon shines high.',
  },
  37: {
    id: 37,
    name: 'Vulpix',
    type: 'fire',
    biome: 'cave',
    catchFactor: 0.82,
    color: '#fb7185',
    baseStats: { hp: 44, atk: 48, def: 44, spd: 60 },
    movePool: ['ember', 'flame_wheel', 'quick_attack', 'morning_sun'],
    flavor: 'Warm embers twinkle inside its six curled tails like cozy lanterns.',
  },
  63: {
    id: 63,
    name: 'Abra',
    type: 'psychic',
    biome: 'cave',
    catchFactor: 0.78,
    color: '#fbbf24',
    baseStats: { hp: 40, atk: 58, def: 38, spd: 70 },
    movePool: ['confusion', 'psybeam', 'starlight_ray', 'wish'],
    flavor: 'Senses kindly trainers even while floating peacefully in a daydream.',
  },
  74: {
    id: 74,
    name: 'Geodude',
    type: 'rock',
    biome: 'cave',
    catchFactor: 0.88,
    color: '#a8a29e',
    baseStats: { hp: 46, atk: 56, def: 66, spd: 30 },
    movePool: ['rock_throw', 'tackle', 'rock_slide', 'gem_crash'],
    flavor: 'Tough as mountain granite and loves friendly arm-wrestling contests.',
  },
  95: {
    id: 95,
    name: 'Onix',
    type: 'rock',
    biome: 'cave',
    catchFactor: 0.65,
    color: '#78716c',
    baseStats: { hp: 54, atk: 58, def: 74, spd: 52 },
    movePool: ['rock_throw', 'rock_slide', 'gem_crash', 'tackle'],
    flavor: 'A towering crystal-carving serpent guarding the deepest cavern halls.',
  },
  54: {
    id: 54,
    name: 'Psyduck',
    type: 'water',
    biome: 'water',
    catchFactor: 0.86,
    color: '#fde047',
    baseStats: { hp: 50, atk: 50, def: 46, spd: 50 },
    movePool: ['water_gun', 'confusion', 'bubble_beam', 'aqua_ring'],
    flavor: 'Splashes in Sapphire Lagoon until surprising psychic ripples appear!',
  },
  58: {
    id: 58,
    name: 'Growlithe',
    type: 'fire',
    biome: 'water',
    catchFactor: 0.8,
    color: '#fb923c',
    baseStats: { hp: 52, atk: 58, def: 46, spd: 58 },
    movePool: ['ember', 'flame_wheel', 'fire_spin', 'quick_attack'],
    flavor: 'A loyal coastal pup that bounds happily along the sun-warmed beach.',
  },
  60: {
    id: 60,
    name: 'Poliwag',
    type: 'water',
    biome: 'water',
    catchFactor: 0.9,
    color: '#60a5fa',
    baseStats: { hp: 44, atk: 46, def: 42, spd: 64 },
    movePool: ['water_gun', 'bubble_beam', 'quick_attack', 'aqua_ring'],
    flavor: 'The swirl on its belly shimmers softly as it skips across tidepools.',
  },
  120: {
    id: 120,
    name: 'Staryu',
    type: 'water',
    biome: 'water',
    catchFactor: 0.82,
    color: '#f59e0b',
    baseStats: { hp: 44, atk: 52, def: 50, spd: 68 },
    movePool: ['water_gun', 'swift', 'starlight_ray', 'aqua_ring'],
    flavor: 'Its ruby core blinks in rhythm with distant constellations above.',
  },
  131: {
    id: 131,
    name: 'Lapras',
    type: 'water',
    biome: 'water',
    catchFactor: 0.64,
    color: '#38bdf8',
    baseStats: { hp: 70, atk: 56, def: 60, spd: 52 },
    movePool: ['bubble_beam', 'surf_wave', 'psybeam', 'aqua_ring'],
    flavor: 'A gentle sea songster that carries young explorers over turquoise waves.',
  },
};

export function getSpriteUrls(id, back = false) {
  const dir = back ? 'back/' : '';
  return {
    animated: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${dir}${id}.gif`,
    static: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dir}${id}.png`,
  };
}

export const BADGES = [
  {
    id: 'meadow',
    name: 'Meadow Badge',
    type: 'grass',
    icon: '🌿',
    description: 'Clear the Forest Shrine or catch 3 Grass/Forest friends.',
    check(profile) {
      if (profile.shrinesCleared.includes('forest_shrine')) return true;
      const grassCount = Object.keys(profile.pokedex.caught).filter((id) => {
        const sp = SPECIES[Number(id)];
        return sp && (sp.type === 'grass' || sp.biome === 'forest');
      }).length;
      return grassCount >= 3;
    },
  },
  {
    id: 'flame',
    name: 'Ember Badge',
    type: 'fire',
    icon: '🔥',
    description: 'Catch 2 Fire-type Pokémon or clear the Crystal Shrine.',
    check(profile) {
      if (profile.shrinesCleared.includes('cave_shrine')) return true;
      const fireCount = Object.keys(profile.pokedex.caught).filter((id) => SPECIES[Number(id)]?.type === 'fire').length;
      return fireCount >= 2;
    },
  },
  {
    id: 'cascade',
    name: 'Cascade Badge',
    type: 'water',
    icon: '💧',
    description: 'Clear the Lagoon Shrine or catch 3 Water-type Pokémon.',
    check(profile) {
      if (profile.shrinesCleared.includes('water_shrine')) return true;
      const waterCount = Object.keys(profile.pokedex.caught).filter((id) => SPECIES[Number(id)]?.type === 'water').length;
      return waterCount >= 3;
    },
  },
  {
    id: 'thunder',
    name: 'Spark Badge',
    type: 'electric',
    icon: '⚡',
    description: 'Befriend Pikachu in Whispering Forest or win 6 battles.',
    check(profile) {
      return Boolean(profile.pokedex.caught[25]) || profile.stats.battlesWon >= 6;
    },
  },
  {
    id: 'boulder',
    name: 'Crystal Badge',
    type: 'rock',
    icon: '💎',
    description: 'Clear the Crystal Shrine or catch 2 Rock-type Pokémon.',
    check(profile) {
      if (profile.shrinesCleared.includes('cave_shrine')) return true;
      const rockCount = Object.keys(profile.pokedex.caught).filter((id) => SPECIES[Number(id)]?.type === 'rock').length;
      return rockCount >= 2;
    },
  },
  {
    id: 'starlight',
    name: 'Starlight Crown',
    type: 'psychic',
    icon: '🌟',
    description: 'Register 10 unique Pokémon species in your Pokédex!',
    check(profile) {
      return Object.keys(profile.pokedex.caught).length >= 10;
    },
  },
];

export * from './world-data.js';
