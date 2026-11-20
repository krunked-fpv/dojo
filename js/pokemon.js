import { SPECIES, MOVES, TYPE_CHART, TYPES, BIOMES, getSpriteUrls } from './config.js';

function makeUid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export class Pokemon {
  constructor({ uid = makeUid(), speciesId, level = 5, xp = 0, hp = null, caughtBiome = 'wild' }) {
    const species = SPECIES[speciesId];
    if (!species) {
      throw new Error(`Unknown Pokémon speciesId: ${speciesId}`);
    }
    this.uid = uid;
    this.speciesId = Number(speciesId);
    this.level = Math.max(1, Math.min(50, Number(level) || 5));
    this.xp = Math.max(0, Number(xp) || 0);
    this.caughtBiome = caughtBiome;

    this.maxHp = 20;
    this.atk = 10;
    this.def = 10;
    this.spd = 10;
    this.xpToNext = 100;
    this.recalculateStats();

    this.hp = hp === null || hp === undefined ? this.maxHp : Math.max(0, Math.min(this.maxHp, Number(hp)));
  }

  get species() {
    return SPECIES[this.speciesId];
  }

  get name() {
    return this.species.name;
  }

  get type() {
    return this.species.type;
  }

  get typeInfo() {
    return TYPES[this.type];
  }

  get isFainted() {
    return this.hp <= 0;
  }

  recalculateStats() {
    const base = this.species.baseStats;
    const lv = this.level;
    this.maxHp = Math.floor(((base.hp * 2) * lv) / 35) + lv + 18;
    this.atk = Math.floor(((base.atk * 2) * lv) / 40) + 7;
    this.def = Math.floor(((base.def * 2) * lv) / 40) + 6;
    this.spd = Math.floor(((base.spd * 2) * lv) / 40) + 6;
    this.xpToNext = lv * 22 + 15;
  }

  healFull() {
    this.hp = this.maxHp;
  }

  healAmount(amount) {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + Math.max(1, Math.round(amount)));
    return this.hp - before;
  }

  takeDamage(amount) {
    const before = this.hp;
    this.hp = Math.max(0, this.hp - Math.max(0, Math.round(amount)));
    return before - this.hp;
  }

  gainXp(amount) {
    const oldLevel = this.level;
    this.xp += Math.max(1, Math.round(amount));
    while (this.level < 50 && this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      const oldMax = this.maxHp;
      this.level += 1;
      this.recalculateStats();
      const bonus = Math.max(2, this.maxHp - oldMax + 3);
      if (this.hp > 0) {
        this.hp = Math.min(this.maxHp, this.hp + bonus);
      }
    }
    return {
      leveledUp: this.level > oldLevel,
      levelsGained: this.level - oldLevel,
      oldLevel,
      newLevel: this.level,
    };
  }

  getMoveObjects() {
    return this.species.movePool.map((moveId) => MOVES[moveId]).filter(Boolean);
  }

  toJSON() {
    return {
      uid: this.uid,
      speciesId: this.speciesId,
      level: this.level,
      xp: this.xp,
      hp: this.hp,
      caughtBiome: this.caughtBiome,
    };
  }

  static fromJSON(data) {
    return new Pokemon(data);
  }
}

export function createPokemon(speciesId, level = 5, biome = 'wild') {
  return new Pokemon({ speciesId, level, caughtBiome: biome });
}

export function createStarterPokemon(speciesId) {
  return new Pokemon({ speciesId, level: 5, caughtBiome: 'starter' });
}

export function rollWildPokemon(biomeId, avgTeamLevel = 5) {
  const biome = BIOMES[biomeId];
  if (!biome || !biome.encounters.length) return null;

  const totalWeight = biome.encounters.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;
  let pickedId = biome.encounters[0].id;
  for (const entry of biome.encounters) {
    roll -= entry.weight;
    if (roll <= 0) {
      pickedId = entry.id;
      break;
    }
  }

  const [minLv, maxLv] = biome.levelRange;
  const targetCenter = Math.max(minLv, Math.min(maxLv, Math.round(avgTeamLevel * 0.85)));
  const span = Math.max(minLv, Math.min(maxLv, targetCenter + Math.floor(Math.random() * 3) - 1));
  return createPokemon(pickedId, span, biomeId);
}

export function getTypeEffectiveness(moveType, defenderType) {
  const table = TYPE_CHART[moveType];
  if (!table) return 1;
  return table[defenderType] ?? 1;
}

export function calculateDamage(attacker, defender, move) {
  if (move.category === 'heal') {
    const heal = Math.max(8, Math.round(attacker.maxHp * 0.38));
    return {
      category: 'heal',
      heal,
      damage: 0,
      effectiveness: 1,
      isCrit: false,
      missed: false,
    };
  }

  if (Math.random() * 100 > (move.accuracy ?? 100)) {
    return {
      category: 'attack',
      heal: 0,
      damage: 0,
      effectiveness: 1,
      isCrit: false,
      missed: true,
    };
  }

  const stab = attacker.type === move.type ? 1.25 : 1;
  const effectiveness = getTypeEffectiveness(move.type, defender.type);
  const isCrit = Math.random() < 0.08;
  const critMult = isCrit ? 1.5 : 1;
  const variance = 0.9 + Math.random() * 0.2;

  const basePower = (((2 * attacker.level) / 5 + 2) * move.power * (attacker.atk / Math.max(1, defender.def))) / 18 + 2;
  const damage = Math.max(1, Math.round(basePower * stab * effectiveness * critMult * variance));

  return {
    category: 'attack',
    heal: 0,
    damage,
    effectiveness,
    isCrit,
    missed: false,
  };
}

export function calculateCatchAttempt(wildPokemon, ballBonus = 1.0) {
  const hpRatio = wildPokemon.hp / Math.max(1, wildPokemon.maxHp);
  const factor = wildPokemon.species.catchFactor ?? 0.78;
  const rawChance = (1 - 0.62 * hpRatio) * factor * ballBonus;
  const chance = Math.max(0.28, Math.min(0.96, rawChance));
  const caught = Math.random() < chance;
  const shakes = caught ? 3 : 1 + Math.floor(Math.random() * 2) + (Math.random() < 0.35 ? 1 : 0);
  return { caught, shakes, chance };
}

export function generateSilhouetteDataUri(species, back = false) {
  const color = species?.color || '#94a3b8';
  const name = (species?.name || 'Pokemon').slice(0, 10);
  const eyeSection = back
    ? `<circle cx="48" cy="36" r="6" fill="rgba(255,255,255,0.3)"/>`
    : `<circle cx="38" cy="46" r="4.5" fill="#0f172a"/><circle cx="58" cy="46" r="4.5" fill="#0f172a"/><circle cx="36.5" cy="44.5" r="1.6" fill="#ffffff"/><circle cx="56.5" cy="44.5" r="1.6" fill="#ffffff"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96"><ellipse cx="48" cy="82" rx="24" ry="5" fill="rgba(0,0,0,0.22)"/><rect x="24" y="26" width="48" height="48" rx="22" fill="${color}" stroke="#0f172a" stroke-width="3.5"/>${eyeSection}<text x="48" y="88" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle" fill="#ffffff" stroke="#0f172a" stroke-width="2" paint-order="stroke">${name}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function attachPokemonSprite(imgEl, speciesOrId, { back = false, timeoutMs = 2000 } = {}) {
  if (!imgEl) return Promise.resolve();
  const species = typeof speciesOrId === 'object' ? speciesOrId : SPECIES[Number(speciesOrId)];
  if (!species) return Promise.resolve();

  const token = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  imgEl.dataset.loadToken = token;
  imgEl.alt = species.name;

  const urls = getSpriteUrls(species.id, back);
  const localSvg = `./assets/fallback/${species.type}.svg`;
  const inlineFallback = generateSilhouetteDataUri(species, back);
  const candidates = [urls.animated, urls.static, localSvg, inlineFallback];

  return new Promise((resolve) => {
    let settled = false;
    let index = 0;

    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const timer = setTimeout(finish, timeoutMs);

    const tryNext = () => {
      if (imgEl.dataset.loadToken !== token) {
        clearTimeout(timer);
        finish();
        return;
      }
      if (index >= candidates.length - 1) {
        imgEl.onload = () => {
          clearTimeout(timer);
          finish();
        };
        imgEl.onerror = null;
        imgEl.src = inlineFallback;
        clearTimeout(timer);
        finish();
        return;
      }

      const nextUrl = candidates[index++];
      imgEl.onload = () => {
        if (imgEl.dataset.loadToken !== token) return;
        clearTimeout(timer);
        finish();
      };
      imgEl.onerror = () => {
        if (imgEl.dataset.loadToken !== token) return;
        tryNext();
      };
      imgEl.src = nextUrl;
    };

    tryNext();
  });
}
