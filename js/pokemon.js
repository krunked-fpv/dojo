import { SPECIES, MOVES, TYPE_CHART, TYPES, BIOMES, getSpriteUrls } from './config.js';

function makeUid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export class Pokemon {
  constructor({ uid = makeUid(), speciesId, level = 5, xp = 0, hp = null, caughtBiome = 'wild', movePp = null }) {
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

    this.movePp = {};
    for (const moveId of this.species.movePool) {
      const maxPp = MOVES[moveId]?.pp || 20;
      const saved = movePp && typeof movePp === 'object' ? Number(movePp[moveId]) : NaN;
      this.movePp[moveId] = Number.isFinite(saved) ? Math.max(0, Math.min(maxPp, Math.round(saved))) : maxPp;
    }
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
    this.restoreAllPp();
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

  getMovePp(moveId) {
    const max = MOVES[moveId]?.pp || 20;
    const raw = this.movePp?.[moveId];
    const current = Number.isFinite(Number(raw)) ? Math.max(0, Math.min(max, Math.round(Number(raw)))) : max;
    return { current, max };
  }

  consumeMovePp(moveId) {
    const { current, max } = this.getMovePp(moveId);
    if (!this.movePp) this.movePp = {};
    this.movePp[moveId] = Math.max(0, Math.min(max, current - 1));
    return this.movePp[moveId];
  }

  restoreAllPp() {
    if (!this.movePp) this.movePp = {};
    for (const moveId of this.species.movePool) {
      this.movePp[moveId] = MOVES[moveId]?.pp || 20;
    }
  }

  hasAnyMovePp() {
    return this.species.movePool.some((moveId) => this.getMovePp(moveId).current > 0);
  }

  toJSON() {
    return {
      uid: this.uid,
      speciesId: this.speciesId,
      level: this.level,
      xp: this.xp,
      hp: this.hp,
      caughtBiome: this.caughtBiome,
      movePp: { ...this.movePp },
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

export function calculateDamage(attacker, defender, move, options = {}) {
  if (move?.category === 'heal') {
    const rawMaxHp = Number(attacker?.maxHp);
    const safeMaxHp = Number.isFinite(rawMaxHp) && rawMaxHp > 0 ? rawMaxHp : 20;
    const heal = Math.max(8, Math.round(safeMaxHp * 0.38));
    return {
      category: 'heal',
      heal,
      damage: 0,
      effectiveness: 1,
      isCrit: false,
      missed: false,
    };
  }

  const accuracy = Number.isFinite(Number(move?.accuracy)) ? Number(move.accuracy) : 100;
  const hitRoll = options.forceHit === true ? 0 : options.forceHit === false ? 999 : Math.random() * 100;
  if (hitRoll > accuracy) {
    return {
      category: 'attack',
      heal: 0,
      damage: 0,
      effectiveness: 1,
      isCrit: false,
      missed: true,
    };
  }

  const stab = attacker?.type && move?.type && attacker.type === move.type ? 1.25 : 1;
  const effectiveness = getTypeEffectiveness(move?.type, defender?.type);
  const isCrit = options.forceCrit !== undefined ? Boolean(options.forceCrit) : Math.random() < 0.08;
  const critMult = isCrit ? 1.5 : 1;
  const variance = Number.isFinite(Number(options.fixedVariance))
    ? Number(options.fixedVariance)
    : 0.9 + Math.random() * 0.2;

  const safeLv = Number.isFinite(Number(attacker?.level)) ? Math.max(1, Number(attacker.level)) : 1;
  const safeAtk = Number.isFinite(Number(attacker?.atk)) ? Math.max(1, Number(attacker.atk)) : 1;
  const safeDef = Number.isFinite(Number(defender?.def)) ? Math.max(1, Number(defender.def)) : 1;
  const safePower = Number.isFinite(Number(move?.power)) ? Math.max(0, Number(move.power)) : 0;

  const basePower = (((2 * safeLv) / 5 + 2) * safePower * (safeAtk / safeDef)) / 18 + 2;
  const damage = Math.max(1, Math.round(basePower * stab * effectiveness * critMult * variance));

  return {
    category: 'attack',
    heal: 0,
    damage: Number.isFinite(damage) ? damage : 1,
    effectiveness,
    isCrit,
    missed: false,
  };
}

export function calculateCatchAttempt(wildPokemon, ballBonus = 1.0) {
  const rawMaxHp = Number(wildPokemon?.maxHp);
  const safeMaxHp = Number.isFinite(rawMaxHp) && rawMaxHp > 0 ? rawMaxHp : 1;
  const rawHp = Number(wildPokemon?.hp);
  const clampedHp = Number.isFinite(rawHp) ? Math.max(0, Math.min(safeMaxHp, rawHp)) : safeMaxHp;
  const hpRatio = clampedHp / safeMaxHp;

  const rawFactor = Number(wildPokemon?.species?.catchFactor);
  const factor = Number.isFinite(rawFactor) && rawFactor > 0 ? rawFactor : 0.78;
  const rawBonus = Number(ballBonus);
  const safeBonus = Number.isFinite(rawBonus) && rawBonus > 0 ? rawBonus : 1.0;

  const raw = (1 - 0.68 * hpRatio) * factor * safeBonus;
  const chance = raw <= 0.82
    ? Math.max(0.08, raw)
    : Math.min(0.995, 0.82 + 0.175 * (1 - Math.exp(-(raw - 0.82) * 1.8)));

  const caught = Math.random() < chance;
  const shakes = caught ? 3 : Math.min(3, 1 + Math.floor(Math.random() * 2) + (Math.random() < 0.35 ? 1 : 0));
  return { caught, shakes, chance };
}

export function generateSilhouetteDataUri(species, back = false) {
  const fill = species?.color || '#38bdf8';
  const name = (species?.name || 'Mystery').slice(0, 11);
  const eyes = back
    ? '<path d="M36 32 L48 22 L60 32" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.65"/>'
    : '<circle cx="38" cy="45" r="5" fill="#090d1a"/><circle cx="58" cy="45" r="5" fill="#090d1a"/><circle cx="36.5" cy="43.2" r="1.8" fill="#ffffff"/><circle cx="56.5" cy="43.2" r="1.8" fill="#ffffff"/><path d="M43 56 Q48 60 53 56" fill="none" stroke="#090d1a" stroke-width="2.5" stroke-linecap="round"/>';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96"><ellipse cx="48" cy="83" rx="26" ry="6" fill="rgba(2,6,23,0.45)"/><path d="M27 32 L18 14 L38 24 Z" fill="${fill}" stroke="#090d1a" stroke-width="3.5" stroke-linejoin="round"/><path d="M69 32 L78 14 L58 24 Z" fill="${fill}" stroke="#090d1a" stroke-width="3.5" stroke-linejoin="round"/><rect x="22" y="23" width="52" height="52" rx="24" fill="${fill}" stroke="#090d1a" stroke-width="4"/><rect x="25" y="26" width="46" height="46" rx="21" fill="none" stroke="#ffffff" stroke-width="1.8" opacity="0.7"/>${eyes}<text x="48" y="90" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle" fill="#ffffff" stroke="#090d1a" stroke-width="2.8" paint-order="stroke">${name}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function attachPokemonSprite(imgEl, speciesOrId, { back = false, timeoutMs = 2000 } = {}) {
  if (!imgEl) return Promise.resolve();
  const species = typeof speciesOrId === 'object' ? speciesOrId : SPECIES[Number(speciesOrId)];
  const inlineFallback = generateSilhouetteDataUri(species || null, back);

  if (!species) {
    imgEl.alt = 'Wild Pokémon';
    imgEl.onerror = null;
    imgEl.src = inlineFallback;
    return Promise.resolve();
  }

  const token = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  imgEl.dataset.loadToken = token;
  imgEl.alt = species.name;

  const urls = getSpriteUrls(species.id, back);
  const localSvg = `./assets/fallback/${species.type}.svg`;
  const candidates = [urls.animated, urls.static, localSvg, inlineFallback];

  // Immediately render local fallback sprite when empty or switching species so images never flash blank or stale
  const nextSpeciesKey = `${species.id}:${back ? 'back' : 'front'}`;
  if (!imgEl.getAttribute('src') || imgEl.dataset.speciesKey !== nextSpeciesKey) {
    imgEl.dataset.speciesKey = nextSpeciesKey;
    imgEl.onerror = () => {
      imgEl.onerror = null;
      imgEl.src = inlineFallback;
    };
    imgEl.src = localSvg;
  }

  return new Promise((resolve) => {
    let settled = false;
    let index = 0;

    const finishWithFallback = () => {
      if (settled) return;
      settled = true;
      if (imgEl.dataset.loadToken === token) {
        imgEl.onload = null;
        imgEl.onerror = null;
        imgEl.src = inlineFallback;
      }
      resolve();
    };

    const finishSuccess = (loadedUrl) => {
      if (settled) return;
      settled = true;
      if (imgEl.dataset.loadToken === token) {
        imgEl.onerror = () => {
          imgEl.onerror = null;
          imgEl.src = inlineFallback;
        };
        imgEl.src = loadedUrl;
      }
      resolve();
    };

    const timer = setTimeout(() => {
      if (imgEl.dataset.loadToken === token && (!imgEl.complete || imgEl.naturalWidth === 0)) {
        finishWithFallback();
      } else if (!settled) {
        settled = true;
        resolve();
      }
    }, Math.max(50, Number(timeoutMs) || 2000));

    const abortStale = () => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    const tryNext = () => {
      if (imgEl.dataset.loadToken !== token) {
        abortStale();
        return;
      }
      if (index >= candidates.length - 1) {
        clearTimeout(timer);
        finishWithFallback();
        return;
      }

      const nextUrl = candidates[index++];
      if (typeof Image !== 'undefined') {
        const probe = new Image();
        probe.onload = () => {
          if (imgEl.dataset.loadToken !== token) {
            abortStale();
            return;
          }
          clearTimeout(timer);
          finishSuccess(nextUrl);
        };
        probe.onerror = () => {
          if (imgEl.dataset.loadToken !== token) {
            abortStale();
            return;
          }
          tryNext();
        };
        probe.src = nextUrl;
      } else {
        imgEl.onload = () => {
          if (imgEl.dataset.loadToken !== token) {
            abortStale();
            return;
          }
          clearTimeout(timer);
          finishSuccess(nextUrl);
        };
        imgEl.onerror = () => {
          if (imgEl.dataset.loadToken !== token) {
            abortStale();
            return;
          }
          tryNext();
        };
        imgEl.src = nextUrl;
      }
    };

    tryNext();
  });
}
