import {
  BADGES,
  BIOMES,
  EVOLUTION_ITEMS,
  EVOLUTIONS,
  FIELD_QUESTS,
  MOVES,
  SHRINES,
  SPECIES,
  TYPES,
  getBiomeDiscoveryStats,
  getCompassGuidance,
} from './config.js';
import { attachPokemonSprite } from './pokemon.js';

const BIOME_ORDER = ['village', 'forest', 'cave', 'water', 'volcano', 'peak'];

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
  constructor({ storage, audio, onTeamChanged, onBadgesUnlocked, onClose }) {
    this.storage = storage;
    this.audio = audio;
    this.onTeamChanged = onTeamChanged;
    this.onBadgesUnlocked = onBadgesUnlocked;
    this.onClose = onClose;

    this.modalEl = document.getElementById('pokedex-modal');
    this.closeBtn = document.getElementById('pokedex-close-btn');
    this.bodyEl = document.getElementById('pokedex-body');

    this.tabButtons = {
      dex: document.getElementById('pokedex-tab-dex'),
      team: document.getElementById('pokedex-tab-team'),
      badges: document.getElementById('pokedex-tab-badges'),
      guide: document.getElementById('pokedex-tab-guide'),
    };

    this.activeTab = 'dex';
    this.selectedSpeciesId = null;
    this.swapBoxIndex = null;
    this.evoBanner = null;

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
    if (this.modalEl) {
      this.modalEl.hidden = false;
    }
    this.render();
  }

  close() {
    const wasOpen = this.isOpen();
    this.evoBanner = null;
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

    if (!this.selectedSpeciesId || !SPECIES[this.selectedSpeciesId]) {
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

    const grid = document.createElement('div');
    grid.className = 'dex-grid';

    for (const sp of allSpecies) {
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
      if (opt.canUse) {
        ready.push({
          toId: opt.toId,
          targetName,
          item: opt.item,
          label: `✨ ${opt.itemInfo?.icon || '💎'} Evolve → ${targetName}!`,
        });
      } else {
        hints.push(`${opt.itemInfo?.icon || '💎'} Evolves with ${opt.itemInfo?.name || opt.item}`);
      }
    }

    if (!levelEvo) {
      const rules = EVOLUTIONS?.[mon.speciesId] || [];
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

  renderTeam(profile) {
    const wrap = document.createElement('div');
    wrap.className = 'team-layout';

    const gems = profile.bag?.gems || {};
    const gemItems = Object.values(EVOLUTION_ITEMS || {});
    const gemBadgesHtml = gemItems.map((gem) => (
      `<span class="gem-chip" title="${gem.name}: ${gem.description}">${gem.icon} <strong>${gems[gem.id] || 0}</strong></span>`
    )).join('');

    const bagBar = document.createElement('div');
    bagBar.className = 'dex-summary-bar';
    bagBar.innerHTML = `
      <span>🍓 Potions: <strong>${profile.bag.potions}</strong></span>
      <span>🔵 Great Balls: <strong>${profile.bag.greatBalls}</strong></span>
      <span>🔴 Poké Balls: <strong>∞</strong></span>
      <span class="gem-bag-strip">💎 Gems: ${gemBadgesHtml || 'None'}</span>
    `;
    wrap.appendChild(bagBar);

    if (this.evoBanner) {
      const banner = document.createElement('div');
      banner.className = 'evo-celebration-banner';
      const moveNames = this.evoBanner.unlockedMoves
        .map((mId) => MOVES[mId]?.name || mId)
        .filter(Boolean);
      const copy = document.createElement('div');
      copy.innerHTML = `
        <div class="evo-celebration-eyebrow">🌟 STARLIGHT EVOLUTION COMPLETE!</div>
        <strong>${this.evoBanner.isShiny ? '✨ ' : ''}${this.evoBanner.oldName} evolved into ${this.evoBanner.newName}!</strong>
        ${moveNames.length ? `<p>Unlocked moves: ${moveNames.join(' • ')}</p>` : '<p>Stats surged higher for new island adventures!</p>'}
      `;
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
      notice.innerHTML = `<span>Select a Team slot below to swap with <strong>${boxMon?.name} (Lv.${boxMon?.level})</strong></span>`;
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

    profile.team.forEach((mon, idx) => {
      const typeInfo = TYPES[mon.type] || TYPES.normal;
      const hpPct = Math.round((mon.hp / Math.max(1, mon.maxHp)) * 100);
      const xpPct = Math.min(100, Math.round((mon.xp / Math.max(1, mon.xpToNext)) * 100));

      const card = document.createElement('div');
      card.className = `team-card ${idx === 0 ? 'is-lead' : ''} ${mon.isShiny ? 'is-shiny-card' : ''}`;

      const top = document.createElement('div');
      top.className = 'team-card-top';

      const img = document.createElement('img');
      attachPokemonSprite(img, mon, { back: false, shiny: Boolean(mon.isShiny), timeoutMs: 1800 });
      top.appendChild(img);

      const meta = document.createElement('div');
      meta.className = 'team-card-meta';
      const shinyTag = mon.isShiny ? '<span class="shiny-badge">✨ Shimmer</span>' : '';
      meta.innerHTML = `
        <div class="team-card-title">
          <strong>${mon.name}</strong>
          <span class="team-lv">Lv.${mon.level}</span>
        </div>
        <div class="team-pill-row">
          <span class="type-pill" style="background:${typeInfo.bg};border-color:${typeInfo.color}">${typeInfo.icon} ${typeInfo.label}</span>
          ${shinyTag}
        </div>
        <div class="team-bar-row">HP ${mon.hp}/${mon.maxHp}</div>
        <div class="hp-track"><div class="hp-fill ${hpPct <= 22 ? 'is-low' : hpPct <= 50 ? 'is-mid' : ''}" style="width:${hpPct}%"></div></div>
        <div class="xp-track"><div class="xp-fill" style="width:${xpPct}%"></div></div>
      `;
      top.appendChild(meta);
      card.appendChild(top);

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
          actions.appendChild(healBtn);
        }
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
        const card = document.createElement('div');
        card.className = `box-card ${this.swapBoxIndex === boxIdx ? 'is-selected' : ''} ${mon.isShiny ? 'is-shiny-card' : ''}`;
        const img = document.createElement('img');
        attachPokemonSprite(img, mon, { back: false, shiny: Boolean(mon.isShiny), timeoutMs: 1800 });
        const label = document.createElement('div');
        label.innerHTML = `<strong>${mon.isShiny ? '✨ ' : ''}${mon.name}</strong><small>Lv.${mon.level}</small>`;
        const swapBtn = document.createElement('button');
        swapBtn.type = 'button';
        swapBtn.className = 'mini-btn';
        swapBtn.textContent = this.swapBoxIndex === boxIdx ? 'Selected' : 'Swap';
        swapBtn.addEventListener('click', () => {
          this.audio.playMenuBlip(680);
          this.swapBoxIndex = boxIdx;
          this.render();
        });
        card.appendChild(img);
        card.appendChild(label);
        card.appendChild(swapBtn);
        boxGrid.appendChild(card);
      });
      wrap.appendChild(boxGrid);
    }

    this.bodyEl.innerHTML = '';
    this.bodyEl.appendChild(wrap);
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

    const guidance = typeof getCompassGuidance === 'function' ? getCompassGuidance(profile, SPECIES) : null;
    const dirText = formatCompassArrow(guidance, profile);
    const targetBiome = guidance?.targetBiomeId ? BIOMES[guidance.targetBiomeId] : null;

    const compassCard = document.createElement('div');
    compassCard.className = 'guide-compass-card';
    compassCard.innerHTML = `
      <div class="guide-compass-head">
        <span class="guide-compass-badge">${guidance?.icon || '🧭'} STARLIGHT COMPASS OBJECTIVE</span>
        <span class="guide-compass-dir">${dirText}${Number.isFinite(guidance?.distance) && guidance.distance > 0 ? ` • ${guidance.distance} tiles` : ''}</span>
      </div>
      <h3 class="guide-compass-title">${guidance?.title || 'Explore Starlight Island & Discover All 6 Biomes!'}</h3>
      <div class="guide-compass-stats">
        ${targetBiome ? `<span>📍 Destination: <strong>${targetBiome.icon} ${targetBiome.name}</strong></span>` : ''}
        <span>📖 Dex: <strong>${caughtCount}/${totalSpecies}</strong></span>
        <span>⛩️ Shrines: <strong>${(profile.shrinesCleared || []).length}/${totalShrines}</strong></span>
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
      const shrine = Object.values(SHRINES).find((s) => s.biome === biome.id) || null;
      const visited = Boolean(profile.biomesVisited?.includes(biome.id) || biome.id === 'village');
      const lvRange = Array.isArray(biome.levelRange) ? `Lv.${biome.levelRange[0]}–${biome.levelRange[1]}` : 'Safe Zone';
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
      const shrineRow = shrine
        ? `<span>⛩️ ${shrine.name}: ${stats?.shrineCleared ? 'Cleared ✓' : `Guardian Lv.${shrine.level}`}</span>`
        : '';

      card.innerHTML = `
        <div class="biome-card-head">
          <strong>${biome.icon} ${biome.name}</strong>
          <span class="biome-lv-pill">${lvRange}</span>
        </div>
        <div class="biome-card-meta">
          <span class="biome-status-tag ${stats?.shrineCleared ? 'is-cleared' : ''}">${statusLabel}</span>
          ${dexRow}
          ${chestRow}
          ${shrineRow}
        </div>
        ${totalBiomeSp > 0 ? `<div class="biome-progress-track"><div class="biome-progress-fill" style="width:${pct}%"></div></div>` : ''}
      `;
      biomeGrid.appendChild(card);
    }
    wrap.appendChild(biomeGrid);

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
}
