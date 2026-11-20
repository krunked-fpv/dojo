import { BADGES, BIOMES, MOVES, SPECIES, TYPES } from './config.js';
import { attachPokemonSprite } from './pokemon.js';

export class PokedexUI {
  constructor({ storage, audio, onTeamChanged }) {
    this.storage = storage;
    this.audio = audio;
    this.onTeamChanged = onTeamChanged;

    this.modalEl = document.getElementById('pokedex-modal');
    this.closeBtn = document.getElementById('pokedex-close-btn');
    this.bodyEl = document.getElementById('pokedex-body');

    this.tabButtons = {
      dex: document.getElementById('pokedex-tab-dex'),
      team: document.getElementById('pokedex-tab-team'),
      badges: document.getElementById('pokedex-tab-badges'),
    };

    this.activeTab = 'dex';
    this.selectedSpeciesId = null;
    this.swapBoxIndex = null;

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
    if (this.modalEl) {
      this.modalEl.hidden = false;
    }
    this.render();
  }

  close() {
    if (this.modalEl) {
      this.modalEl.hidden = true;
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
    } else {
      this.renderBadges(profile);
    }
  }

  renderDex(profile) {
    const allSpecies = Object.values(SPECIES).sort((a, b) => a.id - b.id);
    const caughtCount = Object.keys(profile.pokedex.caught).length;
    const seenCount = profile.pokedex.seen.length;

    if (!this.selectedSpeciesId) {
      this.selectedSpeciesId = allSpecies[0].id;
    }

    const wrap = document.createElement('div');
    wrap.className = 'dex-layout';

    const header = document.createElement('div');
    header.className = 'dex-summary-bar';
    header.innerHTML = `
      <span>📖 Caught: <strong>${caughtCount}/${allSpecies.length}</strong></span>
      <span>👀 Seen: <strong>${seenCount}/${allSpecies.length}</strong></span>
      <span>🏆 Wins: <strong>${profile.stats.battlesWon}</strong></span>
    `;
    wrap.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'dex-grid';

    for (const sp of allSpecies) {
      const isCaught = Boolean(profile.pokedex.caught[sp.id]);
      const isSeen = isCaught || profile.pokedex.seen.includes(sp.id);
      const typeInfo = TYPES[sp.type];

      const card = document.createElement('button');
      card.type = 'button';
      card.className = `dex-card ${isCaught ? 'is-caught' : isSeen ? 'is-seen' : 'is-unknown'} ${
        this.selectedSpeciesId === sp.id ? 'is-selected' : ''
      }`;

      const numBadge = document.createElement('span');
      numBadge.className = 'dex-num';
      numBadge.textContent = `#${String(sp.id).padStart(3, '0')}`;
      card.appendChild(numBadge);

      if (isSeen) {
        const img = document.createElement('img');
        img.className = `dex-sprite ${isCaught ? '' : 'is-silhouette'}`;
        attachPokemonSprite(img, sp.id, { back: false, timeoutMs: 1800 });
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

    // Detail inspector drawer
    const selected = SPECIES[this.selectedSpeciesId] || allSpecies[0];
    const selCaught = profile.pokedex.caught[selected.id] || 0;
    const selSeen = selCaught > 0 || profile.pokedex.seen.includes(selected.id);
    const selType = TYPES[selected.type];
    const habitat = selected.biome === 'starter'
      ? 'Professor Lab Trio'
      : BIOMES[selected.biome]?.name || 'Starlight Island';

    const detail = document.createElement('div');
    detail.className = 'dex-detail';

    if (selSeen) {
      const sprite = document.createElement('img');
      sprite.className = `dex-detail-sprite ${selCaught ? '' : 'is-silhouette'}`;
      attachPokemonSprite(sprite, selected.id, { back: false, timeoutMs: 1800 });
      detail.appendChild(sprite);
    }

    const info = document.createElement('div');
    info.className = 'dex-detail-info';
    const moveTags = selCaught
      ? selected.movePool.map((mId) => MOVES[mId]?.name).filter(Boolean).join(' • ')
      : 'Catch to inspect full moveset!';

    info.innerHTML = `
      <div class="dex-detail-head">
        <strong>#${String(selected.id).padStart(3, '0')} ${selSeen ? selected.name : 'Undiscovered Pokémon'}</strong>
        <span class="type-pill" style="background:${selType.bg};border-color:${selType.color}">${selType.icon} ${selType.label}</span>
      </div>
      <p class="dex-detail-flavor">${selCaught ? selected.flavor : `Habitat Clue: Explore ${habitat} to meet this Pokémon!`}</p>
      <div class="dex-detail-meta">
        <span>📍 ${habitat}</span>
        <span>🔴 Caught: ${selCaught}</span>
        <span>⚔️ ${moveTags}</span>
      </div>
    `;
    detail.appendChild(info);
    wrap.appendChild(detail);

    this.bodyEl.innerHTML = '';
    this.bodyEl.appendChild(wrap);
  }

  renderTeam(profile) {
    const wrap = document.createElement('div');
    wrap.className = 'team-layout';

    const bagBar = document.createElement('div');
    bagBar.className = 'dex-summary-bar';
    bagBar.innerHTML = `
      <span>🎒 Berry Potions: <strong>${profile.bag.potions}</strong></span>
      <span>🔵 Great Balls: <strong>${profile.bag.greatBalls}</strong></span>
      <span>🔴 Poké Balls: <strong>∞</strong></span>
    `;
    wrap.appendChild(bagBar);

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
      const typeInfo = TYPES[mon.type];
      const hpPct = Math.round((mon.hp / Math.max(1, mon.maxHp)) * 100);
      const xpPct = Math.min(100, Math.round((mon.xp / Math.max(1, mon.xpToNext)) * 100));

      const card = document.createElement('div');
      card.className = `team-card ${idx === 0 ? 'is-lead' : ''}`;

      const top = document.createElement('div');
      top.className = 'team-card-top';

      const img = document.createElement('img');
      attachPokemonSprite(img, mon.speciesId, { back: false, timeoutMs: 1800 });
      top.appendChild(img);

      const meta = document.createElement('div');
      meta.className = 'team-card-meta';
      meta.innerHTML = `
        <div class="team-card-title">
          <strong>${mon.name}</strong>
          <span class="team-lv">Lv.${mon.level}</span>
        </div>
        <span class="type-pill" style="background:${typeInfo.bg};border-color:${typeInfo.color}">${typeInfo.icon} ${typeInfo.label}</span>
        <div class="team-bar-row">HP ${mon.hp}/${mon.maxHp}</div>
        <div class="hp-track"><div class="hp-fill ${hpPct <= 22 ? 'is-low' : hpPct <= 50 ? 'is-mid' : ''}" style="width:${hpPct}%"></div></div>
        <div class="xp-track"><div class="xp-fill" style="width:${xpPct}%"></div></div>
      `;
      top.appendChild(meta);
      card.appendChild(top);

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

    // Reserve Box section
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
        card.className = `box-card ${this.swapBoxIndex === boxIdx ? 'is-selected' : ''}`;
        const img = document.createElement('img');
        attachPokemonSprite(img, mon.speciesId, { back: false, timeoutMs: 1800 });
        const label = document.createElement('div');
        label.innerHTML = `<strong>${mon.name}</strong><small>Lv.${mon.level}</small>`;
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

  renderBadges(profile) {
    const wrap = document.createElement('div');
    wrap.className = 'badges-layout';

    const header = document.createElement('div');
    header.className = 'dex-summary-bar';
    header.innerHTML = `
      <span>🏅 Badges Earned: <strong>${profile.badges.length}/${BADGES.length}</strong></span>
      <span>⛩️ Shrines Cleared: <strong>${profile.shrinesCleared.length}/3</strong></span>
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
