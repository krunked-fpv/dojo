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
  GROVE_GRASS: 26,
  GROVE_PATH: 27,
  DUNE_SAND: 28,
  DUNE_PATH: 29,
  SANDSTONE_WALL: 30,
  MARSH_GRASS: 31,
  MARSH_PATH: 32,
  MARSH_WALL: 33,
  SANCTUM_FLOOR: 34,
  SANCTUM_PATH: 35,
  SANCTUM_WALL: 36,
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
  TILE.SANDSTONE_WALL,
  TILE.MARSH_WALL,
  TILE.SANCTUM_WALL,
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
      { id: 152, weight: 14 },
      { id: 387, weight: 14 },
      { id: 495, weight: 14 },
      { id: 123, weight: 10 },
      { id: 214, weight: 8 },
      { id: 396, weight: 16 },
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
      { id: 41, weight: 18 },
      { id: 304, weight: 14 },
      { id: 524, weight: 14 },
      { id: 200, weight: 12 },
      { id: 302, weight: 10 },
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
      { id: 349, weight: 14 },
      { id: 158, weight: 14 },
      { id: 393, weight: 14 },
      { id: 501, weight: 14 },
      { id: 170, weight: 14 },
      { id: 90, weight: 14 },
      { id: 183, weight: 16 },
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
      { id: 155, weight: 18 },
      { id: 156, weight: 10 },
      { id: 371, weight: 14 },
      { id: 255, weight: 14 },
      { id: 390, weight: 14 },
      { id: 228, weight: 14 },
      { id: 218, weight: 14 },
      { id: 125, weight: 10 },
      { id: 636, weight: 10 },
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
      { id: 361, weight: 18 },
      { id: 372, weight: 10 },
      { id: 220, weight: 16 },
      { id: 215, weight: 14 },
      { id: 459, weight: 14 },
      { id: 582, weight: 14 },
      { id: 613, weight: 14 },
      { id: 359, weight: 10 },
    ],
  },
  grove: {
    id: 'grove',
    name: 'Celestial Grove',
    icon: '🌸',
    levelRange: [12, 20],
    encounters: [
      { id: 175, weight: 20 },
      { id: 252, weight: 20 },
      { id: 447, weight: 16 },
      { id: 280, weight: 14 },
      { id: 133, weight: 12 },
      { id: 333, weight: 12 },
      { id: 176, weight: 10 },
      { id: 253, weight: 10 },
      { id: 1, weight: 8 },
      { id: 4, weight: 8 },
      { id: 7, weight: 8 },
      { id: 546, weight: 14 },
      { id: 548, weight: 14 },
      { id: 570, weight: 12 },
      { id: 572, weight: 14 },
      { id: 427, weight: 14 },
    ],
  },
  desert: {
    id: 'desert',
    name: 'Sunstone Dunes',
    icon: '🏜️',
    levelRange: [11, 19],
    encounters: [
      { id: 27, weight: 18 },
      { id: 111, weight: 16 },
      { id: 231, weight: 18 },
      { id: 246, weight: 14 },
      { id: 328, weight: 16 },
      { id: 443, weight: 14 },
      { id: 551, weight: 16 },
      { id: 343, weight: 15 },
      { id: 112, weight: 10 },
      { id: 329, weight: 10 },
      { id: 444, weight: 10 },
    ],
  },
  marsh: {
    id: 'marsh',
    name: 'Glowspore Bayou',
    icon: '🍄',
    levelRange: [14, 22],
    encounters: [
      { id: 258, weight: 16 },
      { id: 270, weight: 18 },
      { id: 285, weight: 16 },
      { id: 406, weight: 16 },
      { id: 194, weight: 18 },
      { id: 355, weight: 14 },
      { id: 607, weight: 14 },
      { id: 577, weight: 14 },
      { id: 271, weight: 10 },
      { id: 315, weight: 10 },
      { id: 608, weight: 10 },
    ],
  },
  sanctum: {
    id: 'sanctum',
    name: 'Astral Sky Citadel',
    icon: '🌌',
    levelRange: [16, 26],
    encounters: [
      { id: 81, weight: 18 },
      { id: 137, weight: 14 },
      { id: 374, weight: 16 },
      { id: 610, weight: 16 },
      { id: 633, weight: 14 },
      { id: 574, weight: 16 },
      { id: 624, weight: 15 },
      { id: 249, weight: 5 },
      { id: 82, weight: 10 },
      { id: 375, weight: 10 },
      { id: 611, weight: 10 },
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
  g: TILE.GROVE_GRASS,
  m: TILE.GROVE_PATH,
  d: TILE.DUNE_SAND,
  u: TILE.DUNE_PATH,
  D: TILE.SANDSTONE_WALL,
  y: TILE.MARSH_GRASS,
  b: TILE.MARSH_PATH,
  M: TILE.MARSH_WALL,
  z: TILE.SANCTUM_FLOOR,
  k: TILE.SANCTUM_PATH,
  Z: TILE.SANCTUM_WALL,
};

// 68 columns x 60 rows cohesive island linking Village, Forest, Cavern, Lagoon, Ember Caldera, Starfall Peak, Celestial Grove, Sunstone Dunes, Glowspore Bayou & Astral Sky Citadel
const RAW_MAP = [
  'TTTTTTTTTTTTTTTTTTTT################################DDDDDDDDDDDDDDDD',
  'T..,,,,..T..,,,,.CT##ppcccCc#cccccc##vvvvaaaLLLLvvv#DddddDuuuuuudddD',
  'T.,,,,,,....,,,,..T#pccccccp#cppppp##vCvaaaLLvvLLvv#DddddduuddddddCD',
  'T..C,,,..T..,,,S..T#cp###ccp#cp##Sp##vvvvaaLviSivLv#DddddduurddddDDD',
  'T..,,,,..T..,,,r..T#cp#Cpccp#cp##rpi#aaaaavLvvrvvLv#DduuudirSriddddD',
  'T....====...=rrr..T#cpppccccpppccrprraaaaavLLBBLLLL#DduuudddrruddddD',
  'T.,,====,,,,====,.T##ccc######cccppi#vvvvvaaaaraavv#DduuudddduuddddD',
  'T.,,==,,,T..==,,,,T#ccccccppccccccp##vvvvvLLaaaarav#DdddddddduuddddD',
  'T..===..==!===..,.T#pccccc#pcccccpp####vvLLaLaaaarS#DddduuuuuuuddddD',
  'TTTi====iTTTTTTTTTT#ppcccc#pp####pp##vvvaaaaaaavvvv#DDdduudddddddddD',
  'T..*====*.........T##pccccccp#pp#pp##vvaaaLLLLaaavv#DduudduuuDDddddD',
  'T.RRRR..*..RRRR..*T#pp#r#ccpp#ppCpp##vvaaLLBBLLaaav#DCuuuudddddddddD',
  'T.HHHH.*...HHHH..*T#cp#r#ccpppppppp##vvaaavvvaaaavv#DddduuuuuuuddddD',
  'T..==..+====..==..T#cp#S#ccccccc#pp##aaa+a!aaaaaCv##DddddduuuudddddD',
  'T..==..===!==.==..Tipp#!###pppp##ppi#aaaaiaaaaaavvvauu!uuuuuuudddddD',
  'T..==...==..=======pppppppppppppppprraaaaaaaaaaavvvauuuu+uuuuuuddddD',
  'T..**...==........TippppppppppppppprraaaaaiaaaaaLLv#DddduuuuuuuddddD',
  'T.......==........T########pp######i#vvvvaaarrrvvLv#DddddddduuuddddD',
  'TTTTi..===..iTTTTTTTssssssspp##ssssT#######irr#i####DddddddduuuddddD',
  'Tssss..===..ssssssTsssssssspp##ssssTIfffffnnrrnnfffIDddDDddduuuddddD',
  'Tss..ssss!==ssss..sssswwwssssppwwssTInSnffnnffnnfffIDddddddduuuddddD',
  'TsswwwwsssssssswwwwsswwwwwwsssswwssTInnnnnffffffnnfIDddddddduuuddddD',
  'Tsswwww~~BBBB~~wwwwss~~BBBB~~wwwwssiIfffnffff+ffnCIIDddddduuuuuddddD',
  'Tssw~~~~~ssss~~wwww~~~~srSsss~BBBBrrrffff!ffffffffffuuuuuuuuuuuddddD',
  'TsswCsssssww~~~wwww~~~~ssrsss~~wwssiIfffnnfffffnnfffuuuuudddduuddddD',
  'Tsswssssssww~~~~~~~~~~~ssssss~~~~~~TInnnnnfffffnnnnIDdddddddduuddddD',
  'T~~~~~~wwww~~~~~~~~~~~~~BB~~~~~~~~~TInnnIIfffffIIInIDdddddddruuddddD',
  'TTTTTTTTBBTTTTTTTTTTTTTirriTTTTTTTTTIfnnIIffrrfIIffIDddddddirriddddD',
  'T~~wwwwwBBww~~~wwww~~CssssffffnnfffIInffffrrffnnfffIDddddddrrddddddD',
  'T~wwwwsssssss~~wwww~~sssssffnnnnfffIIfffffrrfffnnnnIDDDDDDDrrDDDDDDD',
  'T~wwwsssssssswwww~~~~sssssffffnnffffffffffffIffnnnnIZZZZZZZrrZZZZZZZ',
  'T~wwssssss*ssssswwBBBBBBBBrffffffffffnffffffIffnnffIZzzzzzzkkzzzzzzZ',
  'T~wwwsssss*sssswww~~~wwwwwIfffnnnnffffffrfffIfffrrrrrrkkkkkkkzzzzCzZ',
  'T~~wwwwsssssswwww~~~~wwwwwInnnIInnnfffffrrriSiIfrffIZzzzzzzkkzzzzzzZ',
  'T~~~wwwwwswwwww~~~~~~wwwwwInnCIInnnfffnnffrrrrrffCfIZzzzzzkkkkzzzzzZ',
  'T~~~~~~wwwww~~~~~~~~~~~~~~InnnffnnnnnnnnfffffffffnnIZzzZZzkkkkzZZzzZ',
  'T~~~~~~~BB~~~~~~~~~~~~~~~~IfffffffffffffnffffffffnnIZzzzzkkkkkkzzzzZ',
  'TTTTTTTTBBTTTTTTTTTTTTTTTTIIIIIIIIrrIIIIIIIIIIIIIIIIZzzzzkkkkkkzzzzZ',
  'TTgggggimm!mmgigT~~Tg*ggggggg*gggirriggggggTTgg*gggTZzzzzzkkkkzzzzzZ',
  'TgT*ggmmmmmmmmggg~~gggmmmmmmmgggg*rr*ggggTgggggggTgTZzzzzzzkkzzzzzzZ',
  'Tg*gggmmmg*mmmmmmBBmmmmimmmimmmmmmrrmmmmmmmrirrriggTZzzZZzzkkzzZZzzZ',
  'Tggg*mmm*mmmmmggg~~gmmmmm+mmmmmmmmrrrrmrrrrrrrSrrmgrrrkkkkkkkzzzzzzZ',
  'Tggggmmgggggggg*g~~gmmmm*m*mmmmmmmmmmmmmmmmmmrrrgggrrrkkkkkkkzzzzzzZ',
  'Tgg*g*mgggggggggg~~ggmmmmmmmmggggggggggggggggmgggggTZzzzzzzkkzzzzzzZ',
  'TgggCmmmmmmmmmmmmBBmgmmmmmmmmgg*ggg*gggg*gggggmmg*gTZzzzzzzkkzzzzzzZ',
  'Tgg*gg*ggggggg*gg~~gg*gggg*ggTgggggggg*gggggggg*CgTTZzzzzzzkkzzzzzzZ',
  'TTgggggggggTTgggT~~TggggggggggTggggggggTgggggggggTTTZzzzzzkkkkzzzzzZ',
  'TTTTTTTmmTTTTTTTT~~TTTTTTmmTTTTTTTTTTTTTTTrrTTTTTTTTZzzzzzkkkkzzzzzZ',
  'MMMMMMMbbMMMMMMMM~~MMMMMMbbMMMMMMMMMZZZZZZrrZZZZZZZZZzzZZzzkkzzzzzzZ',
  'Myyyyyybb!yyyyyyM~~MyyyyybbbyyyyyyyMZzzzzzkkzzzzzzzZZzzzzzzkkzzzzzzZ',
  'MyyyyyybbbbbbbbMM~~MyyyyybbbbMMMyyyMZzzzzzkkzzzzzzzZZzzzzzkkkrrzzzzZ',
  'MyyMyyybbbbbbbbyy~~yybbbbbbbbyrSryyMZzzzzzkk!zzzzzzZZzzzzzkkirrizzzZ',
  'Myyyyyybbbbbbbbb~~~~bbbbbbbbbirriyyMZzzkkkkkzzzzkkkkkkkkkkkkkrrzzzzZ',
  'MyyyyyyyyyybbbbbBBBBbbbbbbbbbyrryyBBkkkkkkkk+kkkrrrrkkkkkkkkkrSrzzzZ',
  'Myyyyyyyyyybbb+bBBBBbbbbbbbbbyyyyyBBkkkkkkkkkkkkkkkkkkkkkkkkkrrzzzzZ',
  'My~~~~yyyyybbbyy~~~~yybbbbyyyyyyyyyMZzzkkkkkzzzzkkkkkkkkkkkkirrizzzZ',
  'My~CBBbbbbbyyyyyM~~MyybbbbyyyyyyyyyMZzCzzzkkzzzzzzzZZzzzzzzkkrrzzzzZ',
  'My~~~~yyyyyyyyyyM~~MyyyCyyyyyyyyyyyMZzzzzzkkzzzzzzzZZzzzzzzkkzzzzzzZ',
  'MyyyyyyyyyyyyyyyM~~MyyyyyyyyyyyyyyyMZzzzzzkkzzzzzzzZZzzzzzzzzzzzzzzZ',
  'MMMMMMMMMMMMMMMMM~~MMMMMMMMMMMMMMMMMZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
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
  '10,38': 'Celestial Grove: Blossom petals drift over moonstone paths! Meet Togepi, Treecko, and Riolu in the emerald meadows, heal at the Starlight Fountain, and seek Celestial Grove Shrine to the East!',
  '54,14': 'Sunstone Dunes: Golden mirage sands shimmer with Ground, Rock, and Dragon Pokémon! Heal at the oasis fountain nearby, watch out for Nomad Zara & Mirage Ace Sahara, and seek Sunstone Mirage Shrine to the North!',
  '9,49': 'Glowspore Bayou: Bioluminescent reeds and cypress lanterns light the misty boardwalks! Befriend Water, Grass, and Ghost Pokémon, and cross the eastern bridges toward Glowspore Lantern Shrine!',
  '44,51': 'Astral Sky Citadel: Starlight marble halls bridge the heavens! Heal at the courtyard fountain, speak with Astronomer Atlas, and ascend the eastern promenade to challenge Astral Sky Sanctum!',
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
  '46,41': {
    id: 'grove_shrine',
    name: 'Celestial Grove Shrine',
    biome: 'grove',
    guardianId: 385,
    level: 20,
    badgeId: 'grove',
    intro: 'The mythical Guardian Jirachi awakens beneath drifting sakura starlight! Triumph to earn the Astral Grove Badge!',
    clearedText: 'Celestial melodies chime across the moonstone dais. Your Astral Grove Badge shines with starlight!',
  },
  '60,4': {
    id: 'desert_shrine',
    name: 'Sunstone Mirage Shrine',
    biome: 'desert',
    guardianId: 248,
    level: 19,
    badgeId: 'mirage',
    intro: 'The mighty Guardian Tyranitar shakes the Sunstone Mirage Shrine with golden sandstorms! Triumph to claim the Sunstone Mirage Badge!',
    clearedText: 'Golden desert winds hum serenely over the Sunstone Mirage Shrine. Your Sunstone Mirage Badge gleams brightly!',
  },
  '31,51': {
    id: 'marsh_shrine',
    name: 'Glowspore Lantern Shrine',
    biome: 'marsh',
    guardianId: 251,
    level: 22,
    badgeId: 'bayou',
    intro: 'The mythical Guardian Celebi emerges from glowing emerald mist at Glowspore Lantern Shrine! Triumph to earn the Glowspore Lantern Badge!',
    clearedText: 'Bioluminescent spores drift peacefully around Glowspore Lantern Shrine. You carry Celebi’s timeless blessing!',
  },
  '62,53': {
    id: 'sanctum_shrine',
    name: 'Astral Sky Sanctum',
    biome: 'sanctum',
    guardianId: 384,
    level: 25,
    badgeId: 'zenith',
    intro: 'The Sky Guardian Rayquaza descends from cosmic starlight at Astral Sky Sanctum! Conquer this supreme trial to claim the Astral Zenith Crown!',
    clearedText: 'Starlight auroras crown the Astral Sky Sanctum in emerald-gold splendor. You wear the Astral Zenith Crown!',
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
  '4,44': {
    id: 'grove_chest_astral',
    biome: 'grove',
    label: 'Astral Wishing Chest',
    rewards: { potions: 2, starBalls: 2, starShards: 4, gems: { astral_gem: 1 } },
    message: '{trainer} opened the Astral Wishing Chest and found an Astral Gem 🌠 + 4 ✨ Star Shards + 2 🌟 Star Balls + 2 Berry Potions!',
  },
  '48,45': {
    id: 'grove_chest_wish',
    biome: 'grove',
    label: 'Sakura Star Chest',
    rewards: { potions: 3, greatBalls: 2, starShards: 3, gems: { moon_gem: 1, astral_gem: 1 } },
    message: '{trainer} opened the Sakura Star Chest and found a Starlight Gem 🌙 + an Astral Gem 🌠 + 3 ✨ Star Shards + 2 Great Balls + 3 Berry Potions!',
  },
  '66,2': {
    id: 'desert_chest_prism',
    biome: 'desert',
    label: 'Sunstone Prism Vault',
    rewards: { potions: 2, greatBalls: 2, starShards: 4, gems: { prism_gem: 1 } },
    message: '{trainer} opened the Sunstone Prism Vault and found a Prism Gem 💠 + 4 ✨ Star Shards + 2 Great Balls + 2 Berry Potions!',
  },
  '53,11': {
    id: 'desert_chest_sun',
    biome: 'desert',
    label: 'Golden Mirage Chest',
    rewards: { potions: 2, starBalls: 2, starShards: 3, gems: { sun_gem: 1 } },
    message: '{trainer} opened the Golden Mirage Chest and found a Sunburst Gem ☀️ + 3 ✨ Star Shards + 2 🌟 Star Balls + 2 Berry Potions!',
  },
  '3,56': {
    id: 'marsh_chest_dusk',
    biome: 'marsh',
    label: 'Glowspore Lantern Chest',
    rewards: { potions: 2, greatBalls: 2, starShards: 4, gems: { dusk_gem: 1 } },
    message: '{trainer} opened the Glowspore Lantern Chest and found a Twilight Gem 🔮 + 4 ✨ Star Shards + 2 Great Balls + 2 Berry Potions!',
  },
  '23,57': {
    id: 'marsh_chest_leaf',
    biome: 'marsh',
    label: 'Bayou Emerald Chest',
    rewards: { potions: 3, starBalls: 1, starShards: 3, gems: { leaf_gem: 1 } },
    message: '{trainer} opened the Bayou Emerald Chest and found a Verdant Gem 🍃 + 3 ✨ Star Shards + 1 🌟 Star Ball + 3 Berry Potions!',
  },
  '38,56': {
    id: 'sanctum_chest_prism',
    biome: 'sanctum',
    label: 'Astral Prism Reliquary',
    rewards: { potions: 2, starBalls: 2, starShards: 5, gems: { prism_gem: 1 } },
    message: '{trainer} opened the Astral Prism Reliquary and found a Prism Gem 💠 + 5 ✨ Star Shards + 2 🌟 Star Balls + 2 Berry Potions!',
  },
  '65,32': {
    id: 'sanctum_chest_astral',
    biome: 'sanctum',
    label: 'Zenith Starlight Coffer',
    rewards: { potions: 3, greatBalls: 3, starBalls: 2, starShards: 5, gems: { astral_gem: 1 } },
    message: '{trainer} opened the Zenith Starlight Coffer and found an Astral Gem 🌠 + 5 ✨ Star Shards + 2 🌟 Star Balls + 3 Great Balls + 3 Berry Potions!',
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
  '12,40': {
    id: 'npc_hana',
    name: 'Botanist Hana',
    role: 'Celestial Grove Naturalist',
    biome: 'grove',
    palette: {
      outfitPrimary: '#be185d',
      outfitSecondary: '#fbcfe8',
      hair: '#4c1d95',
      skin: '#fde2c8',
      hat: '#ec4899',
    },
    greeting: 'Welcome to Celestial Grove, {trainer}! Befriend 2 Celestial Grove Pokémon—or clear the Celestial Grove Shrine—and I will share a rare Astral Gem!',
    questId: 'quest_hana_grove',
  },
  '27,43': {
    id: 'npc_sora',
    name: 'Aura Master Sora',
    role: 'Starlight Bond Mentor',
    biome: 'grove',
    palette: {
      outfitPrimary: '#0f766e',
      outfitSecondary: '#fde68a',
      hair: '#1e293b',
      skin: '#f6cfa9',
      hat: '#115e59',
    },
    greeting: 'Your heart resonates with your partners, {trainer}! Reach 60+ Bond (Trusted Buddy 💖) with any Pokémon—or perform 2 evolutions—for an Astral Gem!',
    questId: 'quest_sora_bond',
  },
  '59,13': {
    id: 'npc_zara',
    name: 'Nomad Zara',
    role: 'Dune Archaeologist',
    biome: 'desert',
    palette: {
      outfitPrimary: '#d97706',
      outfitSecondary: '#fef08a',
      hair: '#451a03',
      skin: '#f6cfa9',
      hat: '#b45309',
    },
    greeting: 'The golden dunes hide ancient crystalline relics, {trainer}! Befriend 2 Sunstone Dunes Pokémon—or clear Sunstone Mirage Shrine—and I will share a Prism Gem!',
    questId: 'quest_zara_desert',
  },
  '13,50': {
    id: 'npc_milo',
    name: 'Mycologist Milo',
    role: 'Bayou Naturalist',
    biome: 'marsh',
    palette: {
      outfitPrimary: '#0d9488',
      outfitSecondary: '#c084fc',
      hair: '#334155',
      skin: '#fde2c8',
      hat: '#115e59',
    },
    greeting: 'Look at those glowing spores drifting across the bayou, {trainer}! Catch 2 Glowspore Bayou species—or clear Glowspore Lantern Shrine—for a Twilight Gem!',
    questId: 'quest_milo_marsh',
  },
  '40,52': {
    id: 'npc_atlas',
    name: 'Astronomer Atlas',
    role: 'Citadel Archivist',
    biome: 'sanctum',
    palette: {
      outfitPrimary: '#312e81',
      outfitSecondary: '#67e8f9',
      hair: '#e2e8f0',
      skin: '#fde2c8',
      hat: '#4338ca',
    },
    greeting: 'You stand within the Astral Sky Citadel, {trainer}! Befriend 2 Citadel species—or triumph at Astral Sky Sanctum—for both a Prism Gem and an Astral Gem!',
    questId: 'quest_atlas_sanctum',
  },
};

function countCaughtFromList(profile, ids) {
  const caught = profile?.pokedex?.caught || {};
  return ids.filter((id) => {
    const v = caught[id];
    return v === true || Number(v) > 0;
  }).length;
}

function countTotalCaught(profile) {
  const caught = profile?.pokedex?.caught || {};
  return Object.values(caught).filter((v) => v === true || Number(v) > 0).length;
}

const FOREST_QUEST_IDS = [10, 11, 16, 25, 39, 43, 133, 143, 179, 280, 403, 152, 153, 154, 387, 388, 389, 495, 496, 497, 123, 212, 214, 396, 397, 398];
const CAVE_QUEST_IDS = [35, 37, 63, 74, 92, 93, 95, 180, 281, 41, 42, 169, 304, 305, 306, 524, 525, 526, 200, 429, 302];
const WATER_QUEST_IDS = [54, 58, 60, 116, 117, 120, 129, 131, 363, 158, 159, 160, 393, 394, 395, 501, 502, 503, 170, 171, 90, 91, 183, 184];
const VOLCANO_CORE_IDS = [77, 126];
const VOLCANO_ALL_IDS = [77, 37, 58, 126, 74, 181, 404, 255, 256, 257, 390, 391, 392, 228, 229, 218, 219, 125, 466, 636, 637];
const PEAK_CORE_IDS = [86, 147, 148];
const YUKI_PEAK_IDS = [86, 87, 144, 147, 148, 149, 151, 230, 333, 334, 363, 364, 365, 471, 220, 221, 473, 215, 461, 459, 460, 362, 582, 583, 584, 613, 614, 359];
const TWILIGHT_QUEST_IDS = [35, 36, 63, 64, 65, 92, 93, 94, 196, 197, 280, 281, 282, 41, 42, 169, 200, 429, 302, 355, 356, 477, 607, 608, 609, 577, 578, 579, 574, 575, 576];
const GROVE_QUEST_IDS = [175, 176, 468, 252, 253, 254, 350, 385, 447, 448, 475, 478, 546, 547, 548, 549, 570, 571, 572, 573, 427, 428];
const DESERT_QUEST_IDS = [27, 28, 111, 112, 464, 231, 232, 246, 247, 248, 328, 329, 330, 443, 444, 445, 551, 552, 553, 343, 344];
const MARSH_QUEST_IDS = [258, 259, 260, 270, 271, 272, 285, 286, 406, 315, 407, 194, 195, 355, 356, 477, 607, 608, 609, 577, 578, 579, 251];
const SANCTUM_QUEST_IDS = [81, 82, 462, 137, 233, 474, 374, 375, 376, 610, 611, 612, 633, 634, 635, 574, 575, 576, 624, 625, 249, 384];

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
      return countTotalCaught(profile) >= 10;
    },
    progressText(profile) {
      const n = Math.min(10, countTotalCaught(profile));
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
      const caught = countTotalCaught(profile);
      const evos = profile?.stats?.evolutions || 0;
      return visited >= 4 || evos >= 1 || caught >= 6;
    },
    progressText(profile) {
      const visited = Math.min(4, (profile?.biomesVisited || []).length);
      const caught = Math.min(6, countTotalCaught(profile));
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
  {
    id: 'quest_hana_grove',
    npcId: 'npc_hana',
    title: 'Celestial Grove Naturalist',
    description: 'Catch 2 Celestial Grove species or clear the Celestial Grove Shrine.',
    rewards: { gems: { astral_gem: 1 }, starBalls: 1, potions: 2 },
    check(profile) {
      if (profile?.shrinesCleared?.includes('grove_shrine')) return true;
      return countCaughtFromList(profile, GROVE_QUEST_IDS) >= 2;
    },
    progressText(profile) {
      if (profile?.shrinesCleared?.includes('grove_shrine')) return 'Celestial Grove Shrine cleared!';
      const n = Math.min(2, countCaughtFromList(profile, GROVE_QUEST_IDS));
      return `${n}/2 Celestial Grove species caught`;
    },
    completeDialogue: 'The blossoms bloom brighter for you, {trainer}! Botanist Hana gifted you an Astral Gem 🌠, 1 🌟 Star Ball, and 2 Berry Potions!',
  },
  {
    id: 'quest_sora_bond',
    npcId: 'npc_sora',
    title: 'Heartfelt Bond Master',
    description: 'Reach 60+ Bond on any owned Pokémon or perform at least 2 evolutions.',
    rewards: { gems: { astral_gem: 1 }, starShards: 4, starBalls: 1 },
    check(profile) {
      if ((profile?.stats?.evolutions || 0) >= 2) return true;
      const owned = [...(profile?.team || []), ...(profile?.box || [])];
      return owned.some((mon) => (Number(mon?.bond) || 0) >= 60);
    },
    progressText(profile) {
      const owned = [...(profile?.team || []), ...(profile?.box || [])];
      const topBond = owned.reduce((best, mon) => Math.max(best, Number(mon?.bond) || 0), 0);
      const evos = Math.min(2, profile?.stats?.evolutions || 0);
      return `Highest Bond ${Math.min(60, topBond)}/60 or ${evos}/2 evolutions`;
    },
    completeDialogue: 'True harmony shines between trainer and partner, {trainer}! Aura Master Sora rewarded you with an Astral Gem 🌠, 4 ✨ Star Shards, and 1 🌟 Star Ball!',
  },
  {
    id: 'quest_zara_desert',
    npcId: 'npc_zara',
    title: 'Sunstone Dunes Explorer',
    description: 'Catch 2 Sunstone Dunes Pokémon or clear the Sunstone Mirage Shrine.',
    rewards: { gems: { prism_gem: 1 }, starShards: 4, starBalls: 1 },
    check(profile) {
      if (profile?.shrinesCleared?.includes('desert_shrine')) return true;
      return countCaughtFromList(profile, DESERT_QUEST_IDS) >= 2;
    },
    progressText(profile) {
      if (profile?.shrinesCleared?.includes('desert_shrine')) return 'Sunstone Mirage Shrine cleared!';
      const n = Math.min(2, countCaughtFromList(profile, DESERT_QUEST_IDS));
      return `${n}/2 Sunstone Dunes species caught`;
    },
    completeDialogue: 'Golden wisdom, {trainer}! Nomad Zara gifted you a Prism Gem 💠, 4 ✨ Star Shards, and 1 🌟 Star Ball!',
  },
  {
    id: 'quest_milo_marsh',
    npcId: 'npc_milo',
    title: 'Glowspore Bayou Chronicler',
    description: 'Catch 2 Glowspore Bayou Pokémon or clear the Glowspore Lantern Shrine.',
    rewards: { gems: { dusk_gem: 1 }, starShards: 4, starBalls: 1 },
    check(profile) {
      if (profile?.shrinesCleared?.includes('marsh_shrine')) return true;
      return countCaughtFromList(profile, MARSH_QUEST_IDS) >= 2;
    },
    progressText(profile) {
      if (profile?.shrinesCleared?.includes('marsh_shrine')) return 'Glowspore Lantern Shrine cleared!';
      const n = Math.min(2, countCaughtFromList(profile, MARSH_QUEST_IDS));
      return `${n}/2 Glowspore Bayou species caught`;
    },
    completeDialogue: 'Radiant field notes, {trainer}! Mycologist Milo gifted you a Twilight Gem 🔮, 4 ✨ Star Shards, and 1 🌟 Star Ball!',
  },
  {
    id: 'quest_atlas_sanctum',
    npcId: 'npc_atlas',
    title: 'Astral Sky Pathfinder',
    description: 'Catch 2 Astral Sky Citadel Pokémon or clear the Astral Sky Sanctum.',
    rewards: { gems: { prism_gem: 1, astral_gem: 1 }, starShards: 5, starBalls: 2 },
    check(profile) {
      if (profile?.shrinesCleared?.includes('sanctum_shrine')) return true;
      return countCaughtFromList(profile, SANCTUM_QUEST_IDS) >= 2;
    },
    progressText(profile) {
      if (profile?.shrinesCleared?.includes('sanctum_shrine')) return 'Astral Sky Sanctum cleared!';
      const n = Math.min(2, countCaughtFromList(profile, SANCTUM_QUEST_IDS));
      return `${n}/2 Astral Sky Citadel species caught`;
    },
    completeDialogue: 'The constellations applaud you, {trainer}! Astronomer Atlas gifted you a Prism Gem 💠, an Astral Gem 🌠, 5 ✨ Star Shards, and 2 🌟 Star Balls!',
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
  '38,41': {
    id: 'rival_kieran',
    name: 'Astral Envoy Kieran',
    role: 'Celestial Grove Challenger',
    biome: 'grove',
    palette: {
      outfitPrimary: '#0f766e',
      outfitSecondary: '#fbcfe8',
      hair: '#312e81',
      skin: '#fde2c8',
      hat: '#115e59',
      accent: '#2dd4bf',
    },
    party: [
      { speciesId: 254, level: 18 },
      { speciesId: 350, level: 19 },
      { speciesId: 448, level: 21 },
    ],
    rewards: { starBalls: 2, starShards: 5, gems: { astral_gem: 1 } },
    rematchRewards: { starBalls: 1, starShards: 4 },
    intro: 'The sakura starlight foretold your arrival, {trainer}! Let’s test our Celestial Grove partners in battle!',
    rematchIntro: 'Ready for another radiant clash beneath the sakura canopy, {trainer}?',
    winText: 'Luminous strategy, {trainer}! Astral Envoy Kieran gifted you 2 🌟 Star Balls, 5 ✨ Star Shards, and an Astral Gem 🌠!',
    rematchWinText: 'Your bond glows like a comet, {trainer}! Kieran shared 1 🌟 Star Ball and 4 ✨ Star Shards after a thrilling rematch!',
  },
  '60,18': {
    id: 'rival_sahara',
    name: 'Mirage Ace Sahara',
    role: 'Sunstone Dunes Challenger',
    biome: 'desert',
    palette: {
      outfitPrimary: '#b45309',
      outfitSecondary: '#fde047',
      hair: '#451a03',
      skin: '#f6cfa9',
      hat: '#92400e',
      accent: '#fbbf24',
    },
    party: [
      { speciesId: 330, level: 19 },
      { speciesId: 553, level: 20 },
      { speciesId: 445, level: 22 },
    ],
    rewards: { starBalls: 2, starShards: 5, gems: { prism_gem: 1 } },
    rematchRewards: { starBalls: 1, starShards: 4 },
    intro: 'The desert mirage sharpens every battle instinct, {trainer}! Ready to challenge Sunstone Dunes’ finest?',
    rematchIntro: 'Back across the golden sands, {trainer}? Let’s raise another desert storm!',
    winText: 'Blistering brilliance, {trainer}! Mirage Ace Sahara gifted you 2 🌟 Star Balls, 5 ✨ Star Shards, and a Prism Gem 💠!',
    rematchWinText: 'True sandstorm mastery, {trainer}! Sahara shared 1 🌟 Star Ball and 4 ✨ Star Shards after a thrilling rematch!',
  },
  '24,53': {
    id: 'rival_nyx',
    name: 'Bayou Mystic Nyx',
    role: 'Glowspore Bayou Challenger',
    biome: 'marsh',
    palette: {
      outfitPrimary: '#581c87',
      outfitSecondary: '#2dd4bf',
      hair: '#1e1b4b',
      skin: '#fde2c8',
      hat: '#0f766e',
      accent: '#c084fc',
    },
    party: [
      { speciesId: 272, level: 21 },
      { speciesId: 407, level: 22 },
      { speciesId: 609, level: 23 },
    ],
    rewards: { starBalls: 2, starShards: 5, gems: { leaf_gem: 1 } },
    rematchRewards: { starBalls: 1, starShards: 4 },
    intro: 'The lantern spores dance to our rhythm, {trainer}! Step onto the bayou boardwalk and battle me!',
    rematchIntro: 'Ready for another glowing duel in Glowspore Bayou, {trainer}?',
    winText: 'Enchanting tactics, {trainer}! Bayou Mystic Nyx gifted you 2 🌟 Star Balls, 5 ✨ Star Shards, and a Verdant Gem 🍃!',
    rematchWinText: 'Your team gleams brighter than bayou spores, {trainer}! Nyx shared 1 🌟 Star Ball and 4 ✨ Star Shards!',
  },
  '59,46': {
    id: 'rival_zephyr',
    name: 'Zenith Champion Zephyr',
    role: 'Astral Sky Citadel Challenger',
    biome: 'sanctum',
    palette: {
      outfitPrimary: '#312e81',
      outfitSecondary: '#fde047',
      hair: '#e2e8f0',
      skin: '#fde2c8',
      hat: '#1e1b4b',
      accent: '#67e8f9',
    },
    party: [
      { speciesId: 462, level: 24 },
      { speciesId: 635, level: 25 },
      { speciesId: 376, level: 26 },
    ],
    rewards: { starBalls: 3, starShards: 6, gems: { astral_gem: 1 } },
    rematchRewards: { starBalls: 2, starShards: 5 },
    intro: 'Only trainers with sky-high resolve ascend Astral Sky Citadel, {trainer}! Show me your ultimate synergy!',
    rematchIntro: 'Once more beneath the zenith stars, {trainer}? Let’s clash at full cosmic strength!',
    winText: 'Transcendent victory, {trainer}! Zenith Champion Zephyr awarded you 3 🌟 Star Balls, 6 ✨ Star Shards, and an Astral Gem 🌠!',
    rematchWinText: 'Champion-grade brilliance, {trainer}! Zephyr gifted you 2 🌟 Star Balls and 5 ✨ Star Shards!',
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
  '6,41': {
    id: 'landmark_sakura_arbor',
    name: 'Sakura Star Arbor',
    biome: 'grove',
    icon: '🌸',
    description: 'An ancient blossom archway woven with glowing starlight vines. Wild Togepi, Treecko, and Riolu love playing in the emerald meadow nearby—and an Astral Gem 🌠 awakens Togetic, Riolu, Feebas, or Kirlia!',
  },
  '22,44': {
    id: 'landmark_astral_sundial',
    name: 'Astral Lotus Sundial',
    biome: 'grove',
    icon: '🌠',
    description: 'A moonstone dial aligned with Jirachi’s Celestial Grove Shrine to the east. Partners with 60+ Bond (Trusted Buddy 💖) gain battle perks and may even tough out a knockout blow at 1 HP!',
  },
  '56,4': {
    id: 'landmark_sunstone_obelisk',
    name: 'Sunstone Obelisk',
    biome: 'desert',
    icon: '🏜️',
    description: 'A radiant sandstone pillar humming with solar resonance. Trainers say Prism Gems 💠 awaken Rhydon, Boldore, Magneton, Porygon2, and Dusclops into unstoppable titans!',
  },
  '10,52': {
    id: 'landmark_glowspore_lantern',
    name: 'Giant Glowspore Lantern',
    biome: 'marsh',
    icon: '🍄',
    description: 'A towering bioluminescent mushroom spire guiding travelers over the misty boardwalks toward Celebi’s Glowspore Lantern Shrine in the east!',
  },
  '59,36': {
    id: 'landmark_astral_orrery',
    name: 'Astral Sky Orrery',
    biome: 'sanctum',
    icon: '🌌',
    description: 'Spinning golden rings chart every constellation above Starlight Island, aligning the path south toward Rayquaza’s Astral Sky Sanctum!',
  },
};

export function getBiomeAt(x, y) {
  if (x >= 52) {
    return y <= 29 ? BIOMES.desert : BIOMES.sanctum;
  }
  if (y >= 48) {
    return x <= 35 ? BIOMES.marsh : BIOMES.sanctum;
  }
  if (y >= 38) return BIOMES.grove;
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
    const rawVal = caughtObj[id];
    const isCaught = rawVal === true || Number(rawVal) > 0;
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
  const caughtCount = countTotalCaught(profile);
  const totalSpecies = speciesMap ? Object.keys(speciesMap).length : 256;

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
  } else if (!shrinesCleared.has('grove_shrine')) {
    const pos = findEntryCoords(SHRINES, (s) => s.id === 'grove_shrine');
    goal = {
      icon: '🌸',
      title: 'Celestial Grove Shrine (South)',
      targetBiomeId: 'grove',
      targetX: pos.x,
      targetY: pos.y,
    };
  } else if (!shrinesCleared.has('desert_shrine')) {
    const pos = findEntryCoords(SHRINES, (s) => s.id === 'desert_shrine');
    goal = {
      icon: '🏜️',
      title: 'Sunstone Mirage Shrine (East)',
      targetBiomeId: 'desert',
      targetX: pos.x,
      targetY: pos.y,
    };
  } else if (!shrinesCleared.has('marsh_shrine')) {
    const pos = findEntryCoords(SHRINES, (s) => s.id === 'marsh_shrine');
    goal = {
      icon: '🍄',
      title: 'Glowspore Lantern Shrine (SW)',
      targetBiomeId: 'marsh',
      targetX: pos.x,
      targetY: pos.y,
    };
  } else if (!shrinesCleared.has('sanctum_shrine')) {
    const pos = findEntryCoords(SHRINES, (s) => s.id === 'sanctum_shrine');
    goal = {
      icon: '🌌',
      title: 'Astral Sky Sanctum (SE)',
      targetBiomeId: 'sanctum',
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
