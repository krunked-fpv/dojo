import {
  SPECIES,
  MOVES,
  TYPE_CHART,
  TYPES,
  BIOMES,
  EVOLUTIONS,
  EVOLUTION_ITEMS,
  getSpriteUrls,
} from './config.js';

function makeUid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export class Pokemon {
  constructor({
    uid = makeUid(),
    speciesId,
    level = 5,
    xp = 0,
    hp = null,
    caughtBiome = 'wild',
    movePp = null,
    isShiny = false,
  }) {
    const species = SPECIES[speciesId];
    if (!species) {
      throw new Error(`Unknown Pokémon speciesId: ${speciesId}`);
    }
    this.uid = uid;
    this.speciesId = Number(speciesId);
    this.level = Math.max(1, Math.min(50, Number(level) || 5));
    this.xp = Math.max(0, Number(xp) || 0);
    this.caughtBiome = caughtBiome;
    this.isShiny = Boolean(isShiny);

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

    this.resetBattleState();
  }

  resetBattleState() {
    this.battleStages = { atk: 0, def: 0, spd: 0 };
    this.shieldTurns = 0;
  }

  applyStageBoost(stat, delta = 1) {
    if (!this.battleStages || typeof this.battleStages !== 'object') {
      this.battleStages = { atk: 0, def: 0, spd: 0 };
    }
    const key = ['atk', 'def', 'spd'].includes(stat) ? stat : 'atk';
    const prev = Number(this.battleStages[key]) || 0;
    const step = Number.isFinite(Number(delta)) ? Math.round(Number(delta)) : 0;
    const next = Math.max(-4, Math.min(4, prev + step));
    this.battleStages[key] = next;
    return { stat: key, stage: next, changed: next !== prev };
  }

  getStageMultiplier(stat) {
    const stage = Number(this.battleStages?.[stat]) || 0;
    if (stage === 0) return 1.0;
    if (stage > 0) return 1 + stage * 0.25;
    return 1 / (1 - stage * 0.25);
  }

  getEffectiveAtk() {
    const stage = Number(this.battleStages?.atk) || 0;
    if (stage === 0) return this.atk;
    return Math.max(1, Math.round(this.atk * this.getStageMultiplier('atk')));
  }

  getEffectiveDef() {
    const stage = Number(this.battleStages?.def) || 0;
    if (stage === 0) return this.def;
    return Math.max(1, Math.round(this.def * this.getStageMultiplier('def')));
  }

  getEffectiveSpd() {
    const stage = Number(this.battleStages?.spd) || 0;
    if (stage === 0) return this.spd;
    return Math.max(1, Math.round(this.spd * this.getStageMultiplier('spd')));
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

  getPendingLevelEvolution() {
    const rules = EVOLUTIONS[this.speciesId] || [];
    for (const rule of rules) {
      if (Number.isFinite(Number(rule.minLevel)) && this.level >= rule.minLevel && SPECIES[rule.to]) {
        return {
          fromId: this.speciesId,
          toId: rule.to,
          toSpecies: SPECIES[rule.to],
          minLevel: rule.minLevel,
        };
      }
    }
    return null;
  }

  getAvailableItemEvolutions(bagGems = {}) {
    const rules = EVOLUTIONS[this.speciesId] || [];
    const gems = bagGems && typeof bagGems === 'object' ? bagGems : {};
    return rules
      .filter((rule) => rule.item && EVOLUTION_ITEMS[rule.item] && SPECIES[rule.to])
      .map((rule) => ({
        item: rule.item,
        itemInfo: EVOLUTION_ITEMS[rule.item],
        toId: rule.to,
        toSpecies: SPECIES[rule.to],
        canUse: (Number(gems[rule.item]) || 0) > 0,
      }));
  }

  evolve(toId) {
    const targetId = Number(toId);
    const targetSpecies = SPECIES[targetId];
    if (!targetSpecies) {
      throw new Error(`Unknown evolution target speciesId: ${toId}`);
    }

    const oldSpeciesId = this.speciesId;
    const oldName = this.name;
    const oldMax = this.maxHp;
    const oldPoolSet = new Set(this.species.movePool);
    const prevPp = this.movePp || {};

    this.speciesId = targetId;
    this.recalculateStats();

    if (this.hp > 0) {
      this.hp = Math.min(this.maxHp, this.hp + Math.max(4, this.maxHp - oldMax));
    }

    const nextMovePp = {};
    const unlockedMoves = [];
    for (const moveId of targetSpecies.movePool) {
      const maxPp = MOVES[moveId]?.pp || 20;
      if (oldPoolSet.has(moveId) && Number.isFinite(Number(prevPp[moveId]))) {
        nextMovePp[moveId] = Math.max(0, Math.min(maxPp, Math.round(Number(prevPp[moveId]))));
      } else {
        nextMovePp[moveId] = maxPp;
        if (!oldPoolSet.has(moveId)) {
          unlockedMoves.push(moveId);
        }
      }
    }
    this.movePp = nextMovePp;

    return {
      oldSpeciesId,
      newSpeciesId: targetId,
      oldName,
      newName: targetSpecies.name,
      unlockedMoves,
    };
  }

  toJSON() {
    return {
      uid: this.uid,
      speciesId: this.speciesId,
      level: this.level,
      xp: this.xp,
      hp: this.hp,
      caughtBiome: this.caughtBiome,
      isShiny: Boolean(this.isShiny),
      movePp: { ...this.movePp },
    };
  }

  static fromJSON(data) {
    return new Pokemon(data);
  }
}

export function createPokemon(speciesId, level = 5, biome = 'wild', options = {}) {
  return new Pokemon({
    speciesId,
    level,
    caughtBiome: biome,
    isShiny: Boolean(options?.isShiny),
  });
}

export function createStarterPokemon(speciesId) {
  return new Pokemon({ speciesId, level: 5, caughtBiome: 'starter' });
}

export function rollWildPokemon(biomeId, avgTeamLevel = 5, options = {}) {
  const biome = BIOMES[biomeId];
  if (!biome || !biome.encounters.length) return null;

  const isRarePatch = Boolean(options?.isRarePatch);
  const weightedPool = biome.encounters.map((entry) => ({
    id: entry.id,
    weight: isRarePatch ? Math.max(1, Math.round(1000 / Math.max(4, entry.weight))) : entry.weight,
  }));

  const totalWeight = weightedPool.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;
  let pickedId = weightedPool[0].id;
  for (const entry of weightedPool) {
    roll -= entry.weight;
    if (roll <= 0) {
      pickedId = entry.id;
      break;
    }
  }

  const [minLv, maxLv] = biome.levelRange;
  const targetCenter = Math.max(minLv, Math.min(maxLv, Math.round(avgTeamLevel * 0.85)));
  const rareBoost = isRarePatch ? 1 + Math.floor(Math.random() * 2) : 0;
  const levelBonus = Number.isFinite(Number(options?.levelBonus)) ? Math.round(Number(options.levelBonus)) : 0;
  const maxAllowed = Math.min(50, maxLv + rareBoost + Math.max(0, levelBonus));
  const span = Math.max(
    minLv,
    Math.min(maxAllowed, targetCenter + Math.floor(Math.random() * 3) - 1 + rareBoost + levelBonus),
  );

  const shinyChance = isRarePatch ? 1 / 6 : 0.05;
  const isShiny = options?.forceShiny !== undefined ? Boolean(options.forceShiny) : Math.random() < shinyChance;

  return createPokemon(pickedId, Math.max(1, Math.min(50, span)), biomeId, { isShiny });
}

export function getTypeEffectiveness(moveType, defenderType) {
  const table = TYPE_CHART[moveType];
  if (!table) return 1;
  return table[defenderType] ?? 1;
}

export function calculateDamage(attacker, defender, move, options = {}) {
  const rawMaxHp = Number(attacker?.maxHp);
  const safeMaxHp = Number.isFinite(rawMaxHp) && rawMaxHp > 0 ? rawMaxHp : 20;

  if (move?.category === 'heal') {
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

  if (move?.category === 'buff') {
    return {
      category: 'buff',
      buffStat: move.buffStat || 'atk',
      buffStages: Number.isFinite(Number(move.buffStages)) ? Number(move.buffStages) : 1,
      grantShield: false,
      heal: 0,
      damage: 0,
      effectiveness: 1,
      isCrit: false,
      missed: false,
    };
  }

  if (move?.category === 'shield') {
    return {
      category: 'shield',
      buffStat: move.buffStat || 'def',
      buffStages: Number.isFinite(Number(move.buffStages)) ? Number(move.buffStages) : 1,
      grantShield: true,
      heal: Math.max(4, Math.round(safeMaxHp * 0.12)),
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

  const rawAtk = typeof attacker?.getEffectiveAtk === 'function' ? attacker.getEffectiveAtk() : attacker?.atk;
  const rawDef = typeof defender?.getEffectiveDef === 'function' ? defender.getEffectiveDef() : defender?.def;

  const safeLv = Number.isFinite(Number(attacker?.level)) ? Math.max(1, Number(attacker.level)) : 1;
  const safeAtk = Number.isFinite(Number(rawAtk)) ? Math.max(1, Number(rawAtk)) : 1;
  const safeDef = Number.isFinite(Number(rawDef)) ? Math.max(1, Number(rawDef)) : 1;
  const safePower = Number.isFinite(Number(move?.power)) ? Math.max(0, Number(move.power)) : 0;

  const basePower = (((2 * safeLv) / 5 + 2) * safePower * (safeAtk / safeDef)) / 18 + 2;
  const shieldMult = (Number(defender?.shieldTurns) || 0) > 0 ? 0.65 : 1;
  const damage = Math.max(1, Math.round(basePower * stab * effectiveness * critMult * variance * shieldMult));

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

const resolvedSpriteCache = new Map();

export function attachPokemonSprite(imgEl, speciesOrMon, options = {}) {
  if (!imgEl) return Promise.resolve();
  const { back = false, timeoutMs = 2000 } = options || {};

  let species = null;
  let inferredShiny = false;
  if (speciesOrMon && typeof speciesOrMon === 'object') {
    inferredShiny = Boolean(speciesOrMon.isShiny);
    if (speciesOrMon.species && speciesOrMon.species.id) {
      species = speciesOrMon.species;
    } else if (speciesOrMon.speciesId !== undefined) {
      species = SPECIES[Number(speciesOrMon.speciesId)] || null;
    } else if (speciesOrMon.id !== undefined) {
      species = SPECIES[Number(speciesOrMon.id)] || speciesOrMon;
    }
  } else if (speciesOrMon !== undefined && speciesOrMon !== null) {
    species = SPECIES[Number(speciesOrMon)] || null;
  }

  const shiny = Boolean(options?.shiny ?? inferredShiny);
  imgEl.classList.toggle('is-shiny-sprite', shiny);

  const inlineFallback = generateSilhouetteDataUri(species || null, back);

  if (!species) {
    imgEl.alt = 'Wild Pokémon';
    imgEl.onload = null;
    imgEl.onerror = null;
    imgEl.src = inlineFallback;
    return Promise.resolve();
  }

  const token = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  imgEl.dataset.loadToken = token;
  imgEl.alt = species.name;

  const nextSpeciesKey = `${species.id}:${back ? 'back' : 'front'}:${shiny ? 'shiny' : 'std'}`;
  if (resolvedSpriteCache.has(nextSpeciesKey)) {
    const cachedUrl = resolvedSpriteCache.get(nextSpeciesKey);
    imgEl.dataset.speciesKey = nextSpeciesKey;
    imgEl.onload = null;
    imgEl.onerror = () => {
      resolvedSpriteCache.delete(nextSpeciesKey);
      imgEl.onerror = null;
      imgEl.src = inlineFallback;
    };
    imgEl.src = cachedUrl;
    return Promise.resolve();
  }

  const urls = getSpriteUrls(species.id, back, shiny);
  const localSvg = `./assets/fallback/${species.type}.svg`;
  const totalBudgetMs = Math.max(50, Number(timeoutMs) || 2000);
  const animatedBudgetMs = Math.max(25, Math.round(totalBudgetMs * 0.55));
  const remoteCandidates = [
    { url: urls.animated, capMs: animatedBudgetMs },
    { url: urls.static, capMs: null },
  ];

  let placeholderErrored = false;
  // Immediately render local fallback sprite when empty or switching species so images never flash blank or stale
  if (!imgEl.getAttribute('src') || imgEl.dataset.speciesKey !== nextSpeciesKey) {
    imgEl.dataset.speciesKey = nextSpeciesKey;
    imgEl.onerror = () => {
      placeholderErrored = true;
      imgEl.onerror = null;
      imgEl.src = inlineFallback;
    };
    imgEl.src = localSvg;
  }

  return new Promise((resolve) => {
    let settled = false;
    const startTime = Date.now();

    const abortStale = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    const finishSuccess = (loadedUrl) => {
      if (settled) return;
      settled = true;
      if (imgEl.dataset.loadToken === token) {
        if (/^https?:\/\//i.test(loadedUrl)) {
          resolvedSpriteCache.set(nextSpeciesKey, loadedUrl);
        }
        imgEl.onload = null;
        imgEl.onerror = () => {
          resolvedSpriteCache.delete(nextSpeciesKey);
          imgEl.onerror = null;
          imgEl.src = inlineFallback;
        };
        imgEl.src = loadedUrl;
      }
      resolve();
    };

    const finalizeAfterRemoteFailure = () => {
      if (settled) return;
      settled = true;
      if (imgEl.dataset.loadToken !== token) {
        resolve();
        return;
      }
      const currentSrc = imgEl.getAttribute('src') || '';
      if (placeholderErrored || currentSrc.startsWith('data:image/svg+xml')) {
        imgEl.onload = null;
        imgEl.onerror = null;
        if (!currentSrc.startsWith('data:image/svg+xml')) {
          imgEl.src = inlineFallback;
        }
        resolve();
        return;
      }
      if (imgEl.complete && imgEl.naturalWidth > 0) {
        resolve();
        return;
      }
      imgEl.onload = null;
      imgEl.onerror = null;
      imgEl.src = inlineFallback;
      resolve();
    };

    const tryRemote = (stepIdx) => {
      if (imgEl.dataset.loadToken !== token) {
        abortStale();
        return;
      }
      if (stepIdx >= remoteCandidates.length) {
        finalizeAfterRemoteFailure();
        return;
      }

      const elapsed = Date.now() - startTime;
      const remaining = totalBudgetMs - elapsed;
      if (remaining <= 0) {
        finalizeAfterRemoteFailure();
        return;
      }

      const { url, capMs } = remoteCandidates[stepIdx];
      const probeBudgetMs = capMs === null ? remaining : Math.min(capMs, remaining);
      const target = typeof Image !== 'undefined' ? new Image() : imgEl;
      let probeDone = false;
      let probeTimer = null;

      const finishProbe = (succeeded) => {
        if (probeDone) return;
        probeDone = true;
        if (probeTimer !== null) {
          clearTimeout(probeTimer);
          probeTimer = null;
        }
        target.onload = null;
        target.onerror = null;
        if (imgEl.dataset.loadToken !== token) {
          abortStale();
          return;
        }
        if (succeeded) {
          finishSuccess(url);
        } else {
          tryRemote(stepIdx + 1);
        }
      };

      probeTimer = setTimeout(() => finishProbe(false), probeBudgetMs);
      target.onload = () => finishProbe(true);
      target.onerror = () => finishProbe(false);
      target.src = url;
    };

    tryRemote(0);
  });
}
