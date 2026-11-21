export const TILE = {
  GRASS: 0,
  PATH: 1,
  TALL_GRASS: 2,
  TREE: 3,
  WATER: 4,
  SHALLOW_WATER: 5,
  SAND: 6,
  BRIDGE: 7,
  CAVE_WALL: 8,
  CAVE_FLOOR: 9,
  CAVE_PATH: 10,
  WALL: 11,
  ROOF: 12,
  FLOWER: 13,
  SIGN: 14,
  HEAL: 15,
  SHRINE: 16,
  CHEST: 17,
  LAVA: 18,
  VOLCANO_FLOOR: 19,
  VOLCANO_PATH: 20,
  ICE_WALL: 21,
  SNOW_GRASS: 22,
  SNOW_PATH: 23,
  RUNE_TRAIL: 24,
  LANTERN: 25,
};

export const SOLID_TILES = new Set([
  TILE.TREE,
  TILE.WATER,
  TILE.CAVE_WALL,
  TILE.WALL,
  TILE.ROOF,
  TILE.SIGN,
  TILE.SHRINE,
  TILE.CHEST,
  TILE.LAVA,
  TILE.ICE_WALL,
  TILE.LANTERN,
]);

export const BIOMES = {
  village: {
    id: 'village',
    name: 'Starlight Village',
    icon: '🏡',
    levelRange: [2, 4],
    encounters: [],
  },
  forest: {
    id: 'forest',
    name: 'Whispering Forest',
    icon: '🌲',
    levelRange: [2, 7],
    encounters: [
      { id: 10, weight: 22 },
      { id: 16, weight: 20 },
      { id: 43, weight: 18 },
      { id: 133, weight: 18 },
      { id: 25, weight: 14 },
      { id: 11, weight: 8 },
      { id: 39, weight: 14 },
      { id: 179, weight: 14 },
      { id: 143, weight: 6 },
      { id: 280, weight: 12 },
      { id: 403, weight: 14 },
    ],
  },
  cave: {
    id: 'cave',
    name: 'Crystal Cavern',
    icon: '💎',
    levelRange: [4, 10],
    encounters: [
      { id: 74, weight: 24 },
      { id: 35, weight: 20 },
      { id: 37, weight: 18 },
      { id: 63, weight: 16 },
      { id: 92, weight: 14 },
      { id: 95, weight: 8 },
      { id: 180, weight: 12 },
      { id: 93, weight: 8 },
      { id: 281, weight: 12 },
    ],
  },
  water: {
    id: 'water',
    name: 'Sapphire Lagoon',
    icon: '🌊',
    levelRange: [4, 10],
    encounters: [
      { id: 60, weight: 22 },
      { id: 54, weight: 20 },
      { id: 120, weight: 18 },
      { id: 58, weight: 16 },
      { id: 129, weight: 14 },
      { id: 131, weight: 10 },
      { id: 116, weight: 16 },
      { id: 117, weight: 8 },
      { id: 363, weight: 16 },
    ],
  },
  volcano: {
    id: 'volcano',
    name: 'Ember Caldera',
    icon: '🌋',
    levelRange: [8, 15],
    encounters: [
      { id: 77, weight: 28 },
      { id: 37, weight: 18 },
      { id: 58, weight: 18 },
      { id: 126, weight: 20 },
      { id: 74, weight: 16 },
      { id: 181, weight: 8 },
      { id: 404, weight: 14 },
    ],
  },
  peak: {
    id: 'peak',
    name: 'Starfall Peak',
    icon: '❄️',
    levelRange: [10, 18],
    encounters: [
      { id: 86, weight: 28 },
      { id: 147, weight: 22 },
      { id: 35, weight: 18 },
      { id: 92, weight: 16 },
      { id: 148, weight: 16 },
      { id: 333, weight: 18 },
      { id: 364, weight: 14 },
    ],
  },
};

const CHAR_TO_TILE = {
  '.': TILE.GRASS,
  '=': TILE.PATH,
  ',': TILE.TALL_GRASS,
  T: TILE.TREE,
  '~': TILE.WATER,
  w: TILE.SHALLOW_WATER,
  s: TILE.SAND,
  B: TILE.BRIDGE,
  '#': TILE.CAVE_WALL,
  c: TILE.CAVE_FLOOR,
  p: TILE.CAVE_PATH,
  H: TILE.WALL,
  R: TILE.ROOF,
  '*': TILE.FLOWER,
  '!': TILE.SIGN,
  '+': TILE.HEAL,
  S: TILE.SHRINE,
  C: TILE.CHEST,
  L: TILE.LAVA,
  v: TILE.VOLCANO_FLOOR,
  a: TILE.VOLCANO_PATH,
  I: TILE.ICE_WALL,
  n: TILE.SNOW_GRASS,
  f: TILE.SNOW_PATH,
  r: TILE.RUNE_TRAIL,
  i: TILE.LANTERN,
};

// 52 columns x 38 rows cohesive island linking Village, Forest, Cavern, Lagoon, Ember Caldera & Starfall Peak
const RAW_MAP = [
  'TTTTTTTTTTTTTTTTTTTT################################',
  'T..,,,,..T..,,,,.CT##ppcccCc#cccccc##vvvvaaaLLLLvvv#',
  'T.,,,,,,....,,,,..T#pccccccp#cppppp##vCvaaaLLvvLLvv#',
  'T..C,,,..T..,,,S..T#cp###ccp#cp##Sp##vvvvaaLviSivLv#',
  'T..,,,,..T..,,,r..T#cp#Cpccp#cp##rpi#aaaaavLvvrvvLv#',
  'T....====...=rrr..T#cpppccccpppccrprraaaaavLLBBLLLL#',
  'T.,,====,,,,====,.T##ccc######cccppi#vvvvvaaaaraavv#',
  'T.,,==,,,T..==,,,,T#ccccccppccccccp##vvvvvLLaaaarav#',
  'T..===..==!===..,.T#pccccc#pcccccpp####vvLLaLaaaarS#',
  'TTTi====iTTTTTTTTTT#ppcccc#pp####pp##vvvaaaaaaavvvv#',
  'T..*====*.........T##pccccccp#pp#pp##vvaaaLLLLaaavv#',
  'T.RRRR..*..RRRR..*T#pp#r#ccpp#ppCpp##vvaaLLBBLLaaav#',
  'T.HHHH.*...HHHH..*T#cp#r#ccpppppppp##vvaaavvvaaaavv#',
  'T..==..+====..==..T#cp#S#ccccccc#pp##aaa+a!aaaaaCv##',
  'T..==..===!==.==..Tipp#!###pppp##ppi#aaaaiaaaaaavvv#',
  'T..==...==..=======pppppppppppppppprraaaaaaaaaaavvv#',
  'T..**...==........TippppppppppppppprraaaaaiaaaaaLLv#',
  'T.......==........T########pp######i#vvvvaaarrrvvLv#',
  'TTTTi..===..iTTTTTTTssssssspp##ssssT#######irr#i####',
  'Tssss..===..ssssssTsssssssspp##ssssTIfffffnnrrnnfffI',
  'Tss..ssss!==ssss..sssswwwssssppwwssTInSnffnnffnnfffI',
  'TsswwwwsssssssswwwwsswwwwwwsssswwssTInnnnnffffffnnfI',
  'Tsswwww~~BBBB~~wwwwss~~BBBB~~wwwwssiIfffnffff+ffnCII',
  'Tssw~~~~~ssss~~wwww~~~~srSsss~BBBBrrrffff!fffffffffI',
  'TsswCsssssww~~~wwww~~~~ssrsss~~wwssiIfffnnfffffnnffI',
  'Tsswssssssww~~~~~~~~~~~ssssss~~~~~~TInnnnnfffffnnnnI',
  'T~~~~~~wwww~~~~~~~~~~~~~BB~~~~~~~~~TInnnIIfffffIIInI',
  'TTTTTTTTBBTTTTTTTTTTTTTirriTTTTTTTTTIfnnIIffrrfIIffI',
  'T~~wwwwwBBww~~~wwww~~CssssffffnnfffIInffffrrffnnfffI',
  'T~wwwwsssssss~~wwww~~sssssffnnnnfffIIfffffrrfffnnnnI',
  'T~wwwsssssssswwww~~~~sssssffffnnffffffffffffIffnnnnI',
  'T~wwssssss*ssssswwBBBBBBBBrffffffffffnffffffIffnnffI',
  'T~wwwsssss*sssswww~~~wwwwwIfffnnnnffffffrfffIfffrrrI',
  'T~~wwwwsssssswwww~~~~wwwwwInnnIInnnfffffrrriSiIfrffI',
  'T~~~wwwwwswwwww~~~~~~wwwwwInnCIInnnfffnnffrrrrrffCfI',
  'T~~~~~~wwwww~~~~~~~~~~~~~~InnnffnnnnnnnnfffffffffnnI',
  'T~~~~~~~~~~~~~~~~~~~~~~~~~IfffffffffffffnffffffffnnI',
  'TTTTTTTTTTTTTTTTTTTTTTTTTTIIIIIIIIIIIIIIIIIIIIIIIIII',
];

export const WORLD_ROWS = RAW_MAP.length;
export const WORLD_COLS = RAW_MAP[0].length;
export const WORLD_MAP = RAW_MAP.map((row, y) => {
  if (row.length !== WORLD_COLS) {
    throw new Error(`WORLD_MAP row ${y} length ${row.length} !== ${WORLD_COLS}`);
  }
  return Array.from(row, (ch) => {
    const tile = CHAR_TO_TILE[ch];
    if (tile === undefined) throw new Error(`Unknown map tile char: ${ch}`);
    return tile;
  });
});

export const SIGNPOSTS = {
  '10,14': 'Welcome, {trainer}! Step on the glowing Healing Fountain nearby anytime to restore your team. Paths lead North to Whispering Forest, East through Crystal Cavern to Ember Caldera, and South through Sapphire Lagoon to Starfall Peak!',
  '10,8': 'Whispering Forest: Wild Grass, Normal, and Electric Pokémon dance in the tall grass! Follow the glowing rune stones to reach the Forest Shrine.',
  '23,14': 'Crystal Cavern: Watch for shimmering crystal floors! Keep heading East through the lantern tunnels to reach Ember Caldera, or North to Crystal Shrine.',
  '9,20': 'Sapphire Lagoon: Splash through shallow coral pools to meet Water Pokémon—and cross wooden bridges to find the Lagoon Shrine or Starfall Peak to the Southeast!',
  '42,13': 'Ember Caldera: Molten rivers glow beneath basalt bridges! Meet Ponyta, Vulpix, Growlithe, and Magmar—and follow the rune bridge north to Caldera Shrine.',
  '41,23': 'Starfall Peak: Frosty starlit grass sparkles under the aurora! Watch for Seel, Clefairy, Gastly, and rare Dratini as you climb toward Starfall Shrine.',
};

export const SHRINES = {
  '15,3': {
    id: 'forest_shrine',
    name: 'Forest Shrine',
    biome: 'forest',
    guardianId: 25,
    level: 7,
    badgeId: 'meadow',
    intro: 'The Forest Guardian Pikachu crackles with emerald light! Defeat it to claim the Meadow Badge!',
    clearedText: 'The Forest Shrine hums peacefully! Your Meadow Badge glows warmly.',
  },
  '33,3': {
    id: 'cave_shrine',
    name: 'Crystal Shrine',
    biome: 'cave',
    guardianId: 95,
    level: 8,
    badgeId: 'boulder',
    intro: 'A towering Crystal Onix rises from the gemstones! Show your strength for the Crystal Badge!',
    clearedText: 'Crystal chimes echo through the cavern! The Crystal Shrine honors your victory.',
  },
  '25,23': {
    id: 'water_shrine',
    name: 'Lagoon Shrine',
    biome: 'water',
    guardianId: 131,
    level: 8,
    badgeId: 'cascade',
    intro: 'The Guardian Lapras sings across the waves! Win this battle to earn the Cascade Badge!',
    clearedText: 'Gentle sea foam sparkles around the Lagoon Shrine. You hold its blessing!',
  },
  '46,3': {
    id: 'volcano_shrine',
    name: 'Caldera Shrine',
    biome: 'volcano',
    guardianId: 146,
    level: 12,
    badgeId: 'magma',
    intro: 'The Guardian Moltres spreads blazing golden wings above the magma! Defeat it to earn the Magma Badge!',
    clearedText: 'Warm embers swirl serenely around the Caldera Shrine. The Magma Badge shines on your vest!',
  },
  '44,33': {
    id: 'peak_shrine',
    name: 'Starfall Shrine',
    biome: 'peak',
    guardianId: 144,
    level: 15,
    badgeId: 'aurora',
    intro: 'The Guardian Articuno descends in a flurry of starlit frost! Triumph to claim the Aurora Badge!',
    clearedText: 'Aurora ribbons shimmer softly above Starfall Shrine. You carry its celestial blessing!',
  },
  '50,8': {
    id: 'thunder_shrine',
    name: 'Thunder Roost Shrine',
    biome: 'volcano',
    guardianId: 145,
    level: 14,
    badgeId: 'tempest',
    intro: 'The Guardian Zapdos crackles atop Thunder Roost with golden stormlight! Triumph to earn the Sky Tempest Badge!',
    clearedText: 'Crisp electric sparks hum peacefully around Thunder Roost Shrine. Your Sky Tempest Badge shines!',
  },
  '38,20': {
    id: 'starlight_shrine',
    name: 'Starlight Sanctum',
    biome: 'peak',
    guardianId: 151,
    level: 18,
    badgeId: 'celestial',
    intro: 'The mythical Guardian Mew floats in an aurora halo at Starlight Sanctum! Prove your heart to claim the Celestial Mythic Crown!',
    clearedText: 'Starlight Sanctum shimmers with timeless cosmic grace. You hold Mew’s celestial blessing!',
  },
  '23,13': {
    id: 'eclipse_shrine',
    name: 'Twilight Eclipse Shrine',
    biome: 'cave',
    guardianId: 282,
    level: 16,
    badgeId: 'eclipse',
    intro: 'The Guardian Gardevoir steps through violet starlight at Twilight Eclipse Shrine! Triumph to earn the Twilight Eclipse Badge!',
    clearedText: 'Serene moonbeams chime over the Twilight Eclipse Shrine. Your Twilight Eclipse Badge shines!',
  },
};

export const CHESTS = {
  '3,3': {
    id: 'forest_chest',
    biome: 'forest',
    label: 'Forest Berry Stash',
    rewards: { potions: 3, greatBalls: 2 },
    message: '{trainer} opened the Forest Stash and found 3 Berry Potions + 2 Great Balls!',
  },
  '17,1': {
    id: 'forest_chest_leaf',
    biome: 'forest',
    label: 'Emerald Canopy Chest',
    rewards: { potions: 2, greatBalls: 2, gems: { leaf_gem: 1 } },
    message: '{trainer} opened the Emerald Canopy Chest and found a Verdant Gem 🍃 + 2 Berry Potions + 2 Great Balls!',
  },
  '26,1': {
    id: 'cave_chest_star',
    biome: 'cave',
    label: 'Starlight Vault Chest',
    rewards: { potions: 2, greatBalls: 1, starBalls: 2, starShards: 2 },
    message: '{trainer} opened the Starlight Vault Chest and found 2 🌟 Star Balls + 2 ✨ Star Shards + 1 Great Ball + 2 Berry Potions!',
  },
  '32,11': {
    id: 'cave_chest',
    biome: 'cave',
    label: 'Crystal Cache',
    rewards: { potions: 2, greatBalls: 3, starShards: 2 },
    message: '{trainer} opened the Crystal Cache and found 2 Berry Potions + 3 Great Balls + 2 ✨ Star Shards!',
  },
  '4,24': {
    id: 'lagoon_chest',
    biome: 'water',
    label: 'Lagoon Shell Chest',
    rewards: { potions: 3, greatBalls: 3, starShards: 2 },
    message: '{trainer} opened the Shell Chest and found 3 Berry Potions + 3 Great Balls + 2 ✨ Star Shards!',
  },
  '38,2': {
    id: 'volcano_chest_ember',
    biome: 'volcano',
    label: 'Caldera Ember Chest',
    rewards: { potions: 2, greatBalls: 2, starShards: 3, gems: { fire_gem: 1 } },
    message: '{trainer} opened the Caldera Ember Chest and found an Ember Gem 🔥 + 3 ✨ Star Shards + 2 Berry Potions + 2 Great Balls!',
  },
  '48,13': {
    id: 'volcano_chest_spark',
    biome: 'volcano',
    label: 'Lightning Basalt Chest',
    rewards: { potions: 1, greatBalls: 2, starShards: 3, gems: { thunder_gem: 1 } },
    message: '{trainer} opened the Lightning Basalt Chest and found a Spark Gem ⚡ + 3 ✨ Star Shards + 1 Berry Potion + 2 Great Balls!',
  },
  '49,22': {
    id: 'peak_chest_water',
    biome: 'peak',
    label: 'Glacial Tide Chest',
    rewards: { potions: 2, greatBalls: 2, starShards: 3, gems: { water_gem: 1 } },
    message: '{trainer} opened the Glacial Tide Chest and found a Tide Gem 💧 + 3 ✨ Star Shards + 2 Berry Potions + 2 Great Balls!',
  },
  '29,34': {
    id: 'peak_chest_moon',
    biome: 'peak',
    label: 'Moonbeam Ice Chest',
    rewards: { potions: 2, greatBalls: 3, starShards: 3, gems: { moon_gem: 1 } },
    message: '{trainer} opened the Moonbeam Ice Chest and found a Starlight Gem 🌙 + 3 ✨ Star Shards + 2 Berry Potions + 3 Great Balls!',
  },
  '49,34': {
    id: 'peak_chest_ice',
    biome: 'peak',
    label: 'Frost Crystal Chest',
    rewards: { potions: 2, greatBalls: 2, starShards: 3, gems: { ice_gem: 1 } },
    message: '{trainer} opened the Frost Crystal Chest and found an Aurora Gem ❄️ + 3 ✨ Star Shards + 2 Berry Potions + 2 Great Balls!',
  },
  '21,28': {
    id: 'lagoon_chest_sun',
    biome: 'water',
    label: 'Sunlit Cove Chest',
    rewards: { potions: 2, starBalls: 1, starShards: 3, gems: { sun_gem: 1 } },
    message: '{trainer} opened the Sunlit Cove Chest and found a Sunburst Gem ☀️ + 3 ✨ Star Shards + 1 🌟 Star Ball + 2 Berry Potions!',
  },
  '23,4': {
    id: 'cave_chest_dusk',
    biome: 'cave',
    label: 'Twilight Cavern Chest',
    rewards: { potions: 2, greatBalls: 2, starShards: 3, gems: { dusk_gem: 1 } },
    message: '{trainer} opened the Twilight Cavern Chest and found a Twilight Gem 🔮 + 3 ✨ Star Shards + 2 Great Balls + 2 Berry Potions!',
  },
};

export const NPCS = {
  '9,12': {
    id: 'npc_willow',
    name: 'Professor Willow',
    role: 'Island Researcher',
    biome: 'village',
    palette: {
      outfitPrimary: '#f8fafc',
      outfitSecondary: '#a855f7',
      hair: '#94a3b8',
      skin: '#fde2c8',
      hat: '#7e22ce',
    },
    greeting: 'Welcome, {trainer}! Explore all 6 regions of Starlight Island and register 10 unique Pokémon in your Dex for a special Starlight Gem!',
    questId: 'quest_willow_dex',
  },
  '10,7': {
    id: 'npc_fern',
    name: 'Ranger Fern',
    role: 'Forest Ranger',
    biome: 'forest',
    palette: {
      outfitPrimary: '#16a34a',
      outfitSecondary: '#facc15',
      hair: '#78350f',
      skin: '#f6cfa9',
      hat: '#15803d',
    },
    greeting: 'Listen to the leaves, {trainer}! Catch 3 different Whispering Forest Pokémon to earn supply packs from the Rangers!',
    questId: 'quest_forest_friends',
  },
  '22,16': {
    id: 'npc_pip',
    name: 'Geologist Pip',
    role: 'Cavern Geologist',
    biome: 'cave',
    palette: {
      outfitPrimary: '#7c3aed',
      outfitSecondary: '#22d3ee',
      hair: '#334155',
      skin: '#fde2c8',
      hat: '#f59e0b',
    },
    greeting: 'These crystals sing when trainers befriend cavern Pokémon, {trainer}! Catch any Crystal Cavern species and I will gift you a Starlight Gem!',
    questId: 'quest_cave_crystal',
  },
  '13,21': {
    id: 'npc_marina',
    name: 'Diver Marina',
    role: 'Lagoon Diver',
    biome: 'water',
    palette: {
      outfitPrimary: '#0284c7',
      outfitSecondary: '#67e8f9',
      hair: '#f43f5e',
      skin: '#f6cfa9',
      hat: '#0369a1',
    },
    greeting: 'The Sapphire tides are sparkling today, {trainer}! Catch 2 Lagoon species and I will share a Tide Gem I found on the reef!',
    questId: 'quest_lagoon_swimmers',
  },
  '40,12': {
    id: 'npc_ignis',
    name: 'Pyromancer Ignis',
    role: 'Caldera Flamekeeper',
    biome: 'volcano',
    palette: {
      outfitPrimary: '#ea580c',
      outfitSecondary: '#facc15',
      hair: '#450a0a',
      skin: '#fde2c8',
      hat: '#9a3412',
    },
    greeting: 'Brave heat in Ember Caldera, {trainer}! Befriend a volcanic partner (like Ponyta or Magmar) or clear Caldera Shrine for an Ember Gem!',
    questId: 'quest_volcano_brave',
  },
  '40,25': {
    id: 'npc_lyra',
    name: 'Stargazer Lyra',
    role: 'Aurora Astronomer',
    biome: 'peak',
    palette: {
      outfitPrimary: '#4f46e5',
      outfitSecondary: '#67e8f9',
      hair: '#e2e8f0',
      skin: '#fde2c8',
      hat: '#312e81',
    },
    greeting: 'Look at the aurora ribbons dancing above Starfall Peak, {trainer}! Catch Seel or Dratini—or clear Starfall Shrine—to earn a Spark Gem!',
    questId: 'quest_peak_aurora',
  },
  '5,16': {
    id: 'npc_celeste',
    name: 'Stylist Celeste',
    role: 'Island Stylist',
    biome: 'village',
    palette: {
      outfitPrimary: '#ec4899',
      outfitSecondary: '#fef08a',
      hair: '#6b21a8',
      skin: '#fde2c8',
      hat: '#be185d',
    },
    greeting: 'Looking sharp, {trainer}! Visit 4 regions, catch 6 species, or evolve a partner—and tap your HUD portrait anytime to customize your outfit!',
    questId: 'quest_celeste_style',
  },
  '37,32': {
    id: 'npc_yuki',
    name: 'Sculptor Yuki',
    role: 'Aurora Ice Sculptor',
    biome: 'peak',
    palette: {
      outfitPrimary: '#0891b2',
      outfitSecondary: '#e0f2fe',
      hair: '#cbd5e1',
      skin: '#fde2c8',
      hat: '#155e75',
    },
    greeting: 'The frost glitters like spun starlight, {trainer}! Befriend 2 Peak, Ice, or Dragon Pokémon—or clear Starfall Shrine—for an Aurora Gem!',
    questId: 'quest_yuki_peak',
  },
  '10,10': {
    id: 'npc_orion',
    name: 'Master Orion',
    role: 'Starlight Mentor',
    biome: 'village',
    palette: {
      outfitPrimary: '#312e81',
      outfitSecondary: '#fbbf24',
      hair: '#e2e8f0',
      skin: '#fde2c8',
      hat: '#4338ca',
    },
    greeting: 'Greetings, {trainer}! Open Team & Box in your Pokédex to channel ✨ Star Shards and Power Up a Pokémon’s Star Rank!',
    questId: 'quest_orion_upgrade',
  },
  '22,10': {
    id: 'npc_selene',
    name: 'Twilight Keeper Selene',
    role: 'Eclipse Lorekeeper',
    biome: 'cave',
    palette: {
      outfitPrimary: '#581c87',
      outfitSecondary: '#e879f9',
      hair: '#c7d2fe',
      skin: '#fde2c8',
      hat: '#3b0764',
    },
    greeting: 'The violet runes just east lead to Twilight Eclipse Shrine, {trainer}! Catch 2 Ghost or Psychic partners—or clear the Shrine—for a Twilight Gem!',
    questId: 'quest_selene_twilight',
  },
};

function countCaughtFromList(profile, ids) {
  const caught = profile?.pokedex?.caught || {};
  return ids.filter((id) => Boolean(caught[id])).length;
}

const FOREST_QUEST_IDS = [10, 11, 16, 25, 39, 43, 133, 143, 179, 280, 403];
const CAVE_QUEST_IDS = [35, 37, 63, 74, 92, 93, 95, 180, 281];
const WATER_QUEST_IDS = [54, 58, 60, 116, 117, 120, 129, 131, 363];
const VOLCANO_CORE_IDS = [77, 126];
const VOLCANO_ALL_IDS = [77, 37, 58, 126, 74, 181, 404];
const PEAK_CORE_IDS = [86, 147, 148];
const YUKI_PEAK_IDS = [86, 87, 144, 147, 148, 149, 151, 230, 333, 334, 363, 364, 365, 471];
const TWILIGHT_QUEST_IDS = [35, 36, 63, 64, 65, 92, 93, 94, 196, 197, 280, 281, 282];

export const FIELD_QUESTS = [
  {
    id: 'quest_forest_friends',
    npcId: 'npc_fern',
    title: 'Whispering Woodland Scout',
    description: 'Catch 3 different Whispering Forest Pokémon.',
    rewards: { greatBalls: 2, potions: 2 },
    check(profile) {
      return countCaughtFromList(profile, FOREST_QUEST_IDS) >= 3;
    },
    progressText(profile) {
      const n = Math.min(3, countCaughtFromList(profile, FOREST_QUEST_IDS));
      return `${n}/3 Forest species caught`;
    },
    completeDialogue: 'Splendid scouting, {trainer}! Ranger Fern handed you 2 Great Balls and 2 Berry Potions!',
  },
  {
    id: 'quest_cave_crystal',
    npcId: 'npc_pip',
    title: 'Crystal Cavern Spelunker',
    description: 'Befriend any Crystal Cavern Pokémon (Geodude, Clefairy, Vulpix, Abra, Gastly, or Onix).',
    rewards: { gems: { moon_gem: 1 }, potions: 1 },
    check(profile) {
      return countCaughtFromList(profile, CAVE_QUEST_IDS) >= 1;
    },
    progressText(profile) {
      const n = Math.min(1, countCaughtFromList(profile, CAVE_QUEST_IDS));
      return `${n}/1 Cavern species caught`;
    },
    completeDialogue: 'What a dazzling cavern friend, {trainer}! Geologist Pip gifted you a Starlight Gem 🌙 and 1 Berry Potion!',
  },
  {
    id: 'quest_lagoon_swimmers',
    npcId: 'npc_marina',
    title: 'Sapphire Tide Explorer',
    description: 'Catch 2 different Sapphire Lagoon Pokémon.',
    rewards: { gems: { water_gem: 1 }, greatBalls: 1 },
    check(profile) {
      return countCaughtFromList(profile, WATER_QUEST_IDS) >= 2;
    },
    progressText(profile) {
      const n = Math.min(2, countCaughtFromList(profile, WATER_QUEST_IDS));
      return `${n}/2 Lagoon species caught`;
    },
    completeDialogue: 'Splash-tastic work, {trainer}! Diver Marina rewarded you with a Tide Gem 💧 and 1 Great Ball!',
  },
  {
    id: 'quest_volcano_brave',
    npcId: 'npc_ignis',
    title: 'Heart of Ember Caldera',
    description: 'Catch Ponyta or Magmar (or 2 Caldera species), or clear the Caldera Shrine.',
    rewards: { gems: { fire_gem: 1 }, potions: 2 },
    check(profile) {
      if (profile?.shrinesCleared?.includes('volcano_shrine')) return true;
      if (countCaughtFromList(profile, VOLCANO_CORE_IDS) >= 1) return true;
      return countCaughtFromList(profile, VOLCANO_ALL_IDS) >= 2;
    },
    progressText(profile) {
      if (profile?.shrinesCleared?.includes('volcano_shrine')) return 'Caldera Shrine cleared!';
      if (countCaughtFromList(profile, VOLCANO_CORE_IDS) >= 1) return '1/1 Caldera partner caught';
      const n = Math.min(2, countCaughtFromList(profile, VOLCANO_ALL_IDS));
      return `${n}/2 Caldera species caught`;
    },
    completeDialogue: 'Blazing courage, {trainer}! Pyromancer Ignis presented you with an Ember Gem 🔥 and 2 Berry Potions!',
  },
  {
    id: 'quest_peak_aurora',
    npcId: 'npc_lyra',
    title: 'Aurora Summit Seeker',
    description: 'Catch Seel, Dratini, or Dragonair on Starfall Peak, or clear the Starfall Shrine.',
    rewards: { gems: { thunder_gem: 1 }, greatBalls: 2 },
    check(profile) {
      if (profile?.shrinesCleared?.includes('peak_shrine')) return true;
      return countCaughtFromList(profile, PEAK_CORE_IDS) >= 1;
    },
    progressText(profile) {
      if (profile?.shrinesCleared?.includes('peak_shrine')) return 'Starfall Shrine cleared!';
      const n = Math.min(1, countCaughtFromList(profile, PEAK_CORE_IDS));
      return `${n}/1 Peak species caught`;
    },
    completeDialogue: 'Starlight smiles on you, {trainer}! Stargazer Lyra gifted you a Spark Gem ⚡ and 2 Great Balls!',
  },
  {
    id: 'quest_willow_dex',
    npcId: 'npc_willow',
    title: 'Starlight Dex Researcher',
    description: 'Register 10 unique Pokémon species in your Starlight Pokédex.',
    rewards: { greatBalls: 3, potions: 2, gems: { moon_gem: 1 } },
    check(profile) {
      return Object.keys(profile?.pokedex?.caught || {}).length >= 10;
    },
    progressText(profile) {
      const n = Math.min(10, Object.keys(profile?.pokedex?.caught || {}).length);
      return `${n}/10 unique species caught`;
    },
    completeDialogue: 'Marvelous Pokédex research, {trainer}! Professor Willow rewarded you with a Starlight Gem 🌙, 3 Great Balls, and 2 Berry Potions!',
  },
  {
    id: 'quest_celeste_style',
    npcId: 'npc_celeste',
    title: 'Starlight Fashion Trailblazer',
    description: 'Explore 4+ island regions, catch 6 unique species, or evolve a partner Pokémon.',
    rewards: { starBalls: 2, gems: { leaf_gem: 1 } },
    check(profile) {
      const visited = (profile?.biomesVisited || []).length;
      const caught = Object.keys(profile?.pokedex?.caught || {}).length;
      const evos = profile?.stats?.evolutions || 0;
      return visited >= 4 || evos >= 1 || caught >= 6;
    },
    progressText(profile) {
      const visited = Math.min(4, (profile?.biomesVisited || []).length);
      const caught = Math.min(6, Object.keys(profile?.pokedex?.caught || {}).length);
      return `${visited}/4 regions visited or ${caught}/6 species caught (or evolve 1 Pokémon)`;
    },
    completeDialogue: 'Fabulous adventuring, {trainer}! Stylist Celeste presented you with 2 🌟 Star Balls and a Verdant Gem 🍃!',
  },
  {
    id: 'quest_yuki_peak',
    npcId: 'npc_yuki',
    title: 'Crystal Ice Sculptor',
    description: 'Catch 2 Peak, Ice, or Dragon Pokémon, or clear the Starfall Shrine.',
    rewards: { starBalls: 1, gems: { ice_gem: 1 } },
    check(profile) {
      if (profile?.shrinesCleared?.includes('peak_shrine')) return true;
      return countCaughtFromList(profile, YUKI_PEAK_IDS) >= 2;
    },
    progressText(profile) {
      if (profile?.shrinesCleared?.includes('peak_shrine')) return 'Starfall Shrine cleared!';
      const n = Math.min(2, countCaughtFromList(profile, YUKI_PEAK_IDS));
      return `${n}/2 Peak/Ice/Dragon species caught`;
    },
    completeDialogue: 'Chiseled like starlit crystal, {trainer}! Sculptor Yuki gifted you 1 🌟 Star Ball and an Aurora Gem ❄️!',
  },
  {
    id: 'quest_orion_upgrade',
    npcId: 'npc_orion',
    title: 'Star Rank Awakening',
    description: 'Use ✨ Star Shards in Team & Box to Power Up any Pokémon at least once.',
    rewards: { starShards: 4, starBalls: 1 },
    check(profile) {
      return (profile?.stats?.upgrades || 0) >= 1;
    },
    progressText(profile) {
      const n = Math.min(1, profile?.stats?.upgrades || 0);
      return `${n}/1 Pokémon powered up via Star Shards`;
    },
    completeDialogue: 'Magnificent resonance, {trainer}! Master Orion gifted you 4 ✨ Star Shards and 1 🌟 Star Ball!',
  },
  {
    id: 'quest_selene_twilight',
    npcId: 'npc_selene',
    title: 'Twilight Eclipse Watcher',
    description: 'Clear Twilight Eclipse Shrine or catch 2 Ghost/Psychic species.',
    rewards: { gems: { dusk_gem: 1 }, starShards: 3, starBalls: 1 },
    check(profile) {
      if (profile?.shrinesCleared?.includes('eclipse_shrine')) return true;
      return countCaughtFromList(profile, TWILIGHT_QUEST_IDS) >= 2;
    },
    progressText(profile) {
      if (profile?.shrinesCleared?.includes('eclipse_shrine')) return 'Twilight Eclipse Shrine cleared!';
      const n = Math.min(2, countCaughtFromList(profile, TWILIGHT_QUEST_IDS));
      return `${n}/2 Twilight Ghost/Psychic species caught`;
    },
    completeDialogue: 'The twilight crystals sing in harmony, {trainer}! Keeper Selene gifted you a Twilight Gem 🔮, 3 ✨ Star Shards, and 1 🌟 Star Ball!',
  },
];

export const RIVAL_TRAINERS = {
  '11,5': {
    id: 'rival_leo',
    name: 'Forest Ranger Leo',
    role: 'Whispering Forest Challenger',
    biome: 'forest',
    palette: {
      outfitPrimary: '#15803d',
      outfitSecondary: '#fde047',
      hair: '#78350f',
      skin: '#f6cfa9',
      hat: '#166534',
      accent: '#4ade80',
    },
    party: [
      { speciesId: 17, level: 7 },
      { speciesId: 44, level: 8 },
    ],
    rewards: { greatBalls: 2, potions: 2, gems: { leaf_gem: 1 } },
    rematchRewards: { greatBalls: 1, potions: 1 },
    intro: 'Hey {trainer}! Ready to test your teamwork under the forest canopy? Let’s battle!',
    rematchIntro: 'Back for a woodland rematch, {trainer}? My partners trained hard!',
    winText: 'Awesome teamwork, {trainer}! Forest Ranger Leo gifted you a Verdant Gem 🍃 and Ranger supplies!',
    rematchWinText: 'Sharp strategy, {trainer}! Leo shared bonus Ranger supplies after a great rematch!',
  },
  '31,8': {
    id: 'rival_aria',
    name: 'Crystal Ace Aria',
    role: 'Crystal Cavern Challenger',
    biome: 'cave',
    palette: {
      outfitPrimary: '#7e22ce',
      outfitSecondary: '#22d3ee',
      hair: '#1e1b4b',
      skin: '#fde2c8',
      hat: '#581c87',
      accent: '#e879f9',
    },
    party: [
      { speciesId: 64, level: 10 },
      { speciesId: 196, level: 11 },
    ],
    rewards: { greatBalls: 2, gems: { moon_gem: 1 } },
    rematchRewards: { greatBalls: 1 },
    intro: 'The crystals shimmer when strong trainers meet, {trainer}! Show me your sparkle!',
    rematchIntro: 'The cavern echoes with our rematch spirit, {trainer}!',
    winText: 'Dazzling victory, {trainer}! Crystal Ace Aria rewarded you with a Starlight Gem 🌙 and Great Balls!',
    rematchWinText: 'Brilliant battle, {trainer}! Aria handed you a Great Ball for another stellar duel!',
  },
  '7,30': {
    id: 'rival_kai',
    name: 'Tide Captain Kai',
    role: 'Sapphire Lagoon Challenger',
    biome: 'water',
    palette: {
      outfitPrimary: '#0369a1',
      outfitSecondary: '#fde047',
      hair: '#0f172a',
      skin: '#f6cfa9',
      hat: '#0284c7',
      accent: '#38bdf8',
    },
    party: [
      { speciesId: 61, level: 10 },
      { speciesId: 117, level: 12 },
    ],
    rewards: { starBalls: 1, gems: { water_gem: 1 } },
    rematchRewards: { greatBalls: 2 },
    intro: 'Ahoy, {trainer}! Think your crew can ride the Sapphire Lagoon waves? Battle stations!',
    rematchIntro: 'High tide rematch, {trainer}! Let’s make a splash!',
    winText: 'Smooth sailing, {trainer}! Tide Captain Kai gifted you a 🌟 Star Ball and a Tide Gem 💧!',
    rematchWinText: 'First-mate form, {trainer}! Kai shared extra Great Balls from his sea chest!',
  },
  '45,14': {
    id: 'rival_blaze',
    name: 'Caldera Champion Blaze',
    role: 'Ember Caldera Challenger',
    biome: 'volcano',
    palette: {
      outfitPrimary: '#c2410c',
      outfitSecondary: '#fef08a',
      hair: '#450a0a',
      skin: '#fde2c8',
      hat: '#9a3412',
      accent: '#fb923c',
    },
    party: [
      { speciesId: 59, level: 14 },
      { speciesId: 181, level: 15 },
      { speciesId: 471, level: 16 },
    ],
    rewards: { starBalls: 2, gems: { ice_gem: 1 } },
    rematchRewards: { starBalls: 1, potions: 2 },
    intro: 'Welcome to Ember Caldera, {trainer}! Show me if your team can outshine fire, thunder, and frost!',
    rematchIntro: 'Ready to turn up the heat again, {trainer}? Let’s clash at full power!',
    winText: 'Unstoppable spirit, {trainer}! Caldera Champion Blaze awarded you 2 🌟 Star Balls and an Aurora Gem ❄️!',
    rematchWinText: 'True Champion caliber, {trainer}! Blaze gifted you a 🌟 Star Ball and Berry Potions!',
  },
  '46,30': {
    id: 'rival_astra',
    name: 'Aurora Ace Astra',
    role: 'Starfall Peak Challenger',
    biome: 'peak',
    palette: {
      outfitPrimary: '#4338ca',
      outfitSecondary: '#fef08a',
      hair: '#f8fafc',
      skin: '#fde2c8',
      hat: '#312e81',
      accent: '#38bdf8',
    },
    party: [
      { speciesId: 334, level: 17 },
      { speciesId: 365, level: 18 },
      { speciesId: 282, level: 19 },
    ],
    rewards: { starBalls: 2, starShards: 4, gems: { sun_gem: 1 } },
    rematchRewards: { starBalls: 1, starShards: 3 },
    intro: 'The auroras shine brightest for fearless challengers, {trainer}! Ready to face Starfall Peak’s finest?',
    rematchIntro: 'Back beneath the starlight ridge, {trainer}? Let’s dance with aurora power again!',
    winText: 'Radiant victory, {trainer}! Aurora Ace Astra gifted you 2 🌟 Star Balls, 4 ✨ Star Shards, and a Sunburst Gem ☀️!',
    rematchWinText: 'Celestial teamwork, {trainer}! Astra shared a 🌟 Star Ball and 3 ✨ Star Shards after an unforgettable rematch!',
  },
};

export const LANDMARKS = {
  '16,11': {
    id: 'landmark_telescope',
    name: 'Starlight Telescope',
    biome: 'village',
    icon: '🔭',
    description: 'Through the brass lens, you spot smoke rising over Ember Caldera in the northeast and glittering aurora ribbons over Starfall Peak in the southeast!',
  },
  '9,3': {
    id: 'landmark_great_tree',
    name: 'Whispering Great Tree',
    biome: 'forest',
    icon: '🌳',
    description: 'Ancient emerald leaves shimmer overhead. Golden sparkles in nearby tall grass often attract rare friends—or even a Starlight Shimmer Pokémon!',
  },
  '42,9': {
    id: 'landmark_caldera_cairn',
    name: 'Ancient Caldera Cairn',
    biome: 'volcano',
    icon: '🪨',
    description: 'Stacked obsidian stones warm the air around the magma basin. An Ember Gem can awaken Fire-hearted Pokémon like Vulpix, Growlithe, or Eevee!',
  },
  '12,32': {
    id: 'landmark_coral_arch',
    name: 'Singing Coral Arch',
    biome: 'water',
    icon: '🪸',
    description: 'Gentle tides hum musical chords through rose-pearl coral. Just east across the Aurora Pier Bridge rises snowy Starfall Peak!',
  },
  '34,30': {
    id: 'landmark_aurora_spire',
    name: 'Aurora Star Spire',
    biome: 'peak',
    icon: '🌠',
    description: 'A crystalline obelisk that gathers falling starlight. Trainers say rare Dratini and Dragonair dance in the frosty grass near the summit!',
  },
  '7,8': {
    id: 'landmark_starlight_forge',
    name: 'Starlight Shard Pillar',
    biome: 'forest',
    icon: '✨',
    description: 'A humming crystal pillar etched with Star Ranks (★1–★5). Collect ✨ Star Shards from wild battles, shrines, chests, and rivals—then open Team & Box in your Pokédex to Power Up any partner!',
  },
  '25,13': {
    id: 'landmark_eclipse_monolith',
    name: 'Twilight Eclipse Monolith',
    biome: 'cave',
    icon: '🔮',
    description: 'Violet-gold runes point west to the Twilight Eclipse Shrine, where Gardevoir guards the Eclipse Badge. A Twilight Gem 🔮 awakens Steelix or Umbreon, while a Sunburst Gem ☀️ awakens Bellossom, Politoed, or Altaria!',
  },
};

export function getBiomeAt(x, y) {
  if (y <= 9 && x <= 19) return BIOMES.forest;
  if (x >= 20 && x <= 35 && y <= 17) return BIOMES.cave;
  if (x >= 36 && y <= 18) return BIOMES.volcano;
  if ((x >= 36 && y >= 19) || (x >= 26 && y >= 28)) return BIOMES.peak;
  if (y >= 18) return BIOMES.water;
  return BIOMES.village;
}

export function isTileWalkableAt(x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
  if (x < 0 || y < 0 || x >= WORLD_COLS || y >= WORLD_ROWS) return false;
  const key = `${x},${y}`;
  if (NPCS[key] || LANDMARKS[key] || RIVAL_TRAINERS[key]) return false;
  const tile = WORLD_MAP[y]?.[x];
  return tile !== undefined && !SOLID_TILES.has(tile);
}

const DEFAULT_SPAWN = { x: 8, y: 15, dir: 'down' };

export function findNearestSafePosition(x, y, dir = 'down') {
  const safeDir = ['up', 'down', 'left', 'right'].includes(dir) ? dir : 'down';
  if (Number.isFinite(x) && Number.isFinite(y)) {
    const rx = Math.round(x);
    const ry = Math.round(y);
    if (isTileWalkableAt(rx, ry)) {
      return { x: rx, y: ry, dir: safeDir };
    }
  }

  const startX = Number.isFinite(x) ? Math.max(0, Math.min(WORLD_COLS - 1, Math.round(x))) : DEFAULT_SPAWN.x;
  const startY = Number.isFinite(y) ? Math.max(0, Math.min(WORLD_ROWS - 1, Math.round(y))) : DEFAULT_SPAWN.y;
  const visited = new Set([`${startX},${startY}`]);
  const queue = [[startX, startY]];
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];

  while (queue.length > 0) {
    const [cx, cy] = queue.shift();
    if (isTileWalkableAt(cx, cy)) {
      return { x: cx, y: cy, dir: safeDir };
    }
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= WORLD_COLS || ny >= WORLD_ROWS) continue;
      const k = `${nx},${ny}`;
      if (!visited.has(k)) {
        visited.add(k);
        queue.push([nx, ny]);
      }
    }
  }

  return { ...DEFAULT_SPAWN, dir: safeDir };
}

function getBiomeChests(biomeId) {
  return Object.entries(CHESTS)
    .filter(([key, chest]) => {
      if (chest.biome) return chest.biome === biomeId;
      const [cx, cy] = key.split(',').map(Number);
      return getBiomeAt(cx, cy).id === biomeId;
    })
    .map(([, chest]) => chest);
}

export function getBiomeDiscoveryStats(profile, biomeId, _speciesMap = null) {
  const biome = BIOMES[biomeId] || BIOMES.village;
  const seenSet = new Set((profile?.pokedex?.seen || []).map(Number));
  const caughtObj = profile?.pokedex?.caught || {};
  const nativeIds = [...new Set((biome.encounters || []).map((e) => Number(e.id)))];

  let seen = 0;
  let caught = 0;
  for (const id of nativeIds) {
    const isCaught = Boolean(caughtObj[id]);
    if (isCaught) caught += 1;
    if (isCaught || seenSet.has(id)) seen += 1;
  }

  const shrinesClearedSet = new Set(profile?.shrinesCleared || []);
  const biomeShrines = Object.values(SHRINES).filter((s) => s.biome === biome.id);
  const hasShrine = biomeShrines.length > 0;
  const shrineCleared = hasShrine && biomeShrines.every((s) => shrinesClearedSet.has(s.id));

  const chestsOpenedSet = new Set(profile?.chestsOpened || []);
  const biomeChests = getBiomeChests(biome.id);
  const chestsOpened = biomeChests.filter((c) => chestsOpenedSet.has(c.id)).length;

  return {
    biomeId: biome.id,
    name: biome.name,
    icon: biome.icon,
    seen,
    caught,
    totalSpecies: nativeIds.length,
    hasShrine,
    shrineCleared,
    chestsOpened,
    chestsTotal: biomeChests.length,
  };
}

function parseCoordsKey(key) {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

function findEntryCoords(obj, predicate) {
  for (const [key, value] of Object.entries(obj)) {
    if (predicate(value)) return parseCoordsKey(key);
  }
  return { ...DEFAULT_SPAWN };
}

function computeArrowDir(dx, dy) {
  if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) return '★ Here';
  const angle = Math.atan2(dy, dx);
  const dirs = ['→ East', '↘ SE', '↓ South', '↙ SW', '← West', '↖ NW', '↑ North', '↗ NE'];
  const idx = Math.round(angle / (Math.PI / 4));
  return dirs[((idx % 8) + 8) % 8];
}

export function getCompassGuidance(profile, speciesMap = null) {
  const px = Number.isFinite(profile?.pos?.x) ? profile.pos.x : DEFAULT_SPAWN.x;
  const py = Number.isFinite(profile?.pos?.y) ? profile.pos.y : DEFAULT_SPAWN.y;
  const currentBiome = getBiomeAt(px, py);
  const biomeStats = getBiomeDiscoveryStats(profile, currentBiome.id, speciesMap);

  const npcsTalked = new Set(profile?.npcsTalked || []);
  const shrinesCleared = new Set(profile?.shrinesCleared || []);
  const caughtCount = Object.keys(profile?.pokedex?.caught || {}).length;
  const totalSpecies = speciesMap ? Object.keys(speciesMap).length : 90;

  let goal = null;

  if (!npcsTalked.has('npc_willow') && caughtCount <= 1 && shrinesCleared.size === 0) {
    const pos = findEntryCoords(NPCS, (n) => n.id === 'npc_willow');
    goal = {
      icon: '👩‍🔬',
      title: 'Talk to Professor Willow',
      targetBiomeId: 'village',
      targetX: pos.x,
      targetY: pos.y,
    };
  } else if (!shrinesCleared.has('forest_shrine')) {
    const pos = findEntryCoords(SHRINES, (s) => s.id === 'forest_shrine');
    goal = {
      icon: '🌲',
      title: 'Forest Shrine (North)',
      targetBiomeId: 'forest',
      targetX: pos.x,
      targetY: pos.y,
    };
  } else if (!shrinesCleared.has('cave_shrine')) {
    const pos = findEntryCoords(SHRINES, (s) => s.id === 'cave_shrine');
    goal = {
      icon: '💎',
      title: 'Crystal Shrine (East)',
      targetBiomeId: 'cave',
      targetX: pos.x,
      targetY: pos.y,
    };
  } else if (!shrinesCleared.has('water_shrine')) {
    const pos = findEntryCoords(SHRINES, (s) => s.id === 'water_shrine');
    goal = {
      icon: '🌊',
      title: 'Lagoon Shrine (South)',
      targetBiomeId: 'water',
      targetX: pos.x,
      targetY: pos.y,
    };
  } else if (!shrinesCleared.has('volcano_shrine')) {
    const pos = findEntryCoords(SHRINES, (s) => s.id === 'volcano_shrine');
    goal = {
      icon: '🌋',
      title: 'Caldera Shrine (Far East)',
      targetBiomeId: 'volcano',
      targetX: pos.x,
      targetY: pos.y,
    };
  } else if (!shrinesCleared.has('peak_shrine')) {
    const pos = findEntryCoords(SHRINES, (s) => s.id === 'peak_shrine');
    goal = {
      icon: '❄️',
      title: 'Starfall Shrine (SE Peak)',
      targetBiomeId: 'peak',
      targetX: pos.x,
      targetY: pos.y,
    };
  } else if (!shrinesCleared.has('thunder_shrine')) {
    const pos = findEntryCoords(SHRINES, (s) => s.id === 'thunder_shrine');
    goal = {
      icon: '🌩️',
      title: 'Thunder Roost Shrine (NE Cliff)',
      targetBiomeId: 'volcano',
      targetX: pos.x,
      targetY: pos.y,
    };
  } else if (!shrinesCleared.has('eclipse_shrine')) {
    const pos = findEntryCoords(SHRINES, (s) => s.id === 'eclipse_shrine');
    goal = {
      icon: '🔮',
      title: 'Twilight Eclipse Shrine (Cavern)',
      targetBiomeId: 'cave',
      targetX: pos.x,
      targetY: pos.y,
    };
  } else if (!shrinesCleared.has('starlight_shrine')) {
    const pos = findEntryCoords(SHRINES, (s) => s.id === 'starlight_shrine');
    goal = {
      icon: '👑',
      title: 'Starlight Sanctum (Peak Summit)',
      targetBiomeId: 'peak',
      targetX: pos.x,
      targetY: pos.y,
    };
  } else if (caughtCount < totalSpecies) {
    const pos = findEntryCoords(NPCS, (n) => n.id === 'npc_willow');
    goal = {
      icon: '📖',
      title: 'Complete Dex & Evolutions!',
      targetBiomeId: currentBiome.id,
      targetX: pos.x,
      targetY: pos.y,
    };
  } else {
    goal = {
      icon: '👑',
      title: 'Starlight Champion! Hunt Shimmers!',
      targetBiomeId: currentBiome.id,
      targetX: px,
      targetY: py,
    };
  }

  const dx = goal.targetX - px;
  const dy = goal.targetY - py;
  const distance = Math.round(Math.hypot(dx, dy));
  const arrowDir = computeArrowDir(dx, dy);

  return {
    ...goal,
    distance,
    arrowDir,
    biomeStats,
  };
}
