import {
  GAME_META,
  SPECIES,
  STARTER_IDS,
  TRAINERS,
  TYPES,
} from './config.js';
import { attachPokemonSprite, createPokemon, rollWildPokemon } from './pokemon.js';
import { storage } from './storage.js';
import { audio } from './audio.js';
import { InputController } from './input.js';
import { OverworldEngine, drawTrainerPortrait } from './overworld.js';
import { BattleEngine } from './battle.js';
import { PokedexUI } from './pokedex.js';

class GameApp {
  constructor() {
    this.cabinetEl = document.getElementById('app-cabinet');
    this.bootScreenEl = document.getElementById('boot-screen');
    this.starterScreenEl = document.getElementById('starter-screen');
    this.gameShellEl = document.getElementById('game-shell');

    this.starterGreetingEl = document.getElementById('starter-greeting');
    this.starterCardsEl = document.getElementById('starter-cards');

    this.hudPortraitEl = document.getElementById('hud-portrait');
    this.hudTrainerNameEl = document.getElementById('hud-trainer-name');
    this.hudLeadLabelEl = document.getElementById('hud-lead-label');
    this.hudLeadHpEl = document.getElementById('hud-lead-hp');
    this.hudDexBtn = document.getElementById('hud-btn-dex');
    this.hudBadgesBtn = document.getElementById('hud-btn-badges');
    this.hudMuteBtn = document.getElementById('hud-btn-mute');
    this.hudPadBtn = document.getElementById('hud-btn-pad');
    this.hudSettingsBtn = document.getElementById('hud-btn-settings');

    this.biomeBannerEl = document.getElementById('biome-banner');
    this.interactPillEl = document.getElementById('interact-pill');
    this.worldDialogueEl = document.getElementById('world-dialogue');
    this.worldDialogueTextEl = document.getElementById('world-dialogue-text');
    this.encounterFlashEl = document.getElementById('encounter-flash');

    this.badgeToastEl = document.getElementById('badge-toast');
    this.badgeToastIconEl = document.getElementById('badge-toast-icon');
    this.badgeToastNameEl = document.getElementById('badge-toast-name');
    this.badgeToastDescEl = document.getElementById('badge-toast-desc');

    this.settingsModalEl = document.getElementById('settings-modal');
    this.settingsCloseBtn = document.getElementById('settings-close-btn');
    this.settingMuteBtn = document.getElementById('setting-mute-btn');
    this.settingCrtBtn = document.getElementById('setting-crt-btn');
    this.settingPadBtn = document.getElementById('setting-pad-btn');
    this.settingSwitchBtn = document.getElementById('setting-switch-trainer-btn');

    this.resetTrainerBtn = document.getElementById('reset-trainer-btn');
    this.resetTrainerFill = document.getElementById('reset-trainer-fill');
    this.resetAllBtn = document.getElementById('reset-all-btn');
    this.resetAllFill = document.getElementById('reset-all-fill');
    this.resetStatusEl = document.getElementById('reset-status-msg');

    this.dialogueOpen = false;
    this.biomeBannerTimer = null;
    this.badgeToastTimer = null;
    this.lastFrameTime = performance.now();

    this.input = new InputController();
    this.pokedex = new PokedexUI({
      storage,
      audio,
      onTeamChanged: () => this.refreshHud(),
    });

    this.battle = new BattleEngine({
      storage,
      audio,
      onBattleEnd: (result) => this.handleBattleEnd(result),
      onBadgesUnlocked: (badges) => this.showBadgeToast(badges),
      onHudRefresh: () => this.refreshHud(),
    });

    this.overworld = new OverworldEngine(document.getElementById('overworld-canvas'), {
      getProfile: () => storage.getActiveProfile(),
      onStepSaved: (x, y, dir, incSteps) => storage.updatePosition(x, y, dir, incSteps),
      onWildEncounter: (biomeId) => this.startWildEncounter(biomeId),
      onInteract: (target) => this.handleWorldInteract(target),
      onHealSpot: () => this.handleHealSpot(false),
      onBiomeChange: (biome, announce) => this.handleBiomeChange(biome, announce),
      onInteractHint: (target) => this.handleInteractHint(target),
    });

    this.init();
  }

  init() {
    this.applySettings();
    this.bindBootEvents();
    this.bindHudAndModalEvents();
    this.bindInputEvents();
    this.showBootScreen();
    requestAnimationFrame((now) => this.loop(now));
  }

  applySettings() {
    const settings = storage.getSettings();
    audio.setMuted(settings.muted);
    this.cabinetEl?.classList.toggle('crt-enabled', settings.crtEnabled);

    document.body.classList.remove('force-controls', 'hide-controls');
    if (settings.showTouchPad === 'show') document.body.classList.add('force-controls');
    if (settings.showTouchPad === 'hide') document.body.classList.add('hide-controls');

    if (this.hudMuteBtn) this.hudMuteBtn.textContent = settings.muted ? '🔇' : '🔊';
    if (this.settingMuteBtn) this.settingMuteBtn.textContent = settings.muted ? '🔇 Muted' : '🔊 Sound On';
    if (this.settingCrtBtn) this.settingCrtBtn.textContent = settings.crtEnabled ? '📺 CRT On' : '📺 CRT Off';
    if (this.settingPadBtn) {
      const labels = { auto: '🎮 Auto', show: '🎮 Always On', hide: '🎮 Hidden' };
      this.settingPadBtn.textContent = labels[settings.showTouchPad] || '🎮 Auto';
    }
  }

  applyTrainerTheme(trainerId) {
    const trainer = TRAINERS[trainerId] || TRAINERS.violet;
    const root = document.documentElement.style;
    root.setProperty('--trainer-accent', trainer.accent);
    root.setProperty('--trainer-accent-dark', trainer.accentDark);
    root.setProperty('--trainer-accent-soft', trainer.accentSoft);
  }

  bindBootEvents() {
    document.getElementById('trainer-card-violet')?.addEventListener('click', () => {
      audio.unlock();
      audio.playMenuBlip(760);
      this.selectTrainer('violet');
    });

    document.getElementById('trainer-card-ozias')?.addEventListener('click', () => {
      audio.unlock();
      audio.playMenuBlip(760);
      this.selectTrainer('ozias');
    });
  }

  bindHudAndModalEvents() {
    this.hudDexBtn?.addEventListener('click', () => {
      audio.playMenuBlip(680);
      this.openPokedex('dex');
    });

    this.hudBadgesBtn?.addEventListener('click', () => {
      audio.playMenuBlip(680);
      this.openPokedex('badges');
    });

    document.getElementById('quick-dex-btn')?.addEventListener('click', () => {
      audio.playMenuBlip(680);
      this.openPokedex('team');
    });

    this.hudMuteBtn?.addEventListener('click', () => this.toggleMute());
    this.settingMuteBtn?.addEventListener('click', () => this.toggleMute());

    this.hudPadBtn?.addEventListener('click', () => {
      audio.playMenuBlip(640);
      const current = storage.getSettings().showTouchPad;
      const order = ['auto', 'show', 'hide'];
      const next = order[(order.indexOf(current) + 1) % order.length];
      storage.updateSettings({ showTouchPad: next });
      this.applySettings();
    });

    this.settingPadBtn?.addEventListener('click', () => {
      audio.playMenuBlip(640);
      const current = storage.getSettings().showTouchPad;
      const order = ['auto', 'show', 'hide'];
      const next = order[(order.indexOf(current) + 1) % order.length];
      storage.updateSettings({ showTouchPad: next });
      this.applySettings();
    });

    this.settingCrtBtn?.addEventListener('click', () => {
      audio.playMenuBlip(640);
      const next = !storage.getSettings().crtEnabled;
      storage.updateSettings({ crtEnabled: next });
      this.applySettings();
    });

    this.hudSettingsBtn?.addEventListener('click', () => {
      audio.playMenuBlip(660);
      this.openSettings();
    });

    this.settingsCloseBtn?.addEventListener('click', () => {
      audio.playMenuBlip(480);
      this.closeSettings();
    });

    this.settingsModalEl?.addEventListener('click', (e) => {
      if (e.target === this.settingsModalEl) this.closeSettings();
    });

    this.settingSwitchBtn?.addEventListener('click', () => {
      audio.playMenuBlip(640);
      this.closeSettings();
      this.pokedex.close();
      if (this.battle.active) this.battle.stop({ outcome: 'escaped', faintedAll: false });
      this.showBootScreen();
    });

    this.interactPillEl?.addEventListener('click', () => {
      this.overworld.triggerInteract();
    });

    this.worldDialogueEl?.addEventListener('click', () => {
      this.closeDialogue();
    });

    this.bindHoldReset(this.resetTrainerBtn, this.resetTrainerFill, () => {
      const id = storage.getActiveTrainerId();
      storage.resetTrainerProgress(id);
      this.resetStatusEl.textContent = `${TRAINERS[id]?.name || 'Trainer'}'s progress was reset cleanly!`;
      setTimeout(() => {
        this.closeSettings();
        this.showBootScreen();
      }, 450);
    });

    this.bindHoldReset(this.resetAllBtn, this.resetAllFill, () => {
      storage.resetAllProgress();
      this.resetStatusEl.textContent = 'Both Violet and Ozias profiles were reset cleanly!';
      setTimeout(() => {
        this.closeSettings();
        this.showBootScreen();
      }, 450);
    });
  }

  bindHoldReset(btnEl, fillEl, onConfirmed) {
    if (!btnEl || !fillEl) return;
    let holding = false;
    let startTime = 0;
    let rafId = null;
    let lastTickStep = -1;
    const HOLD_MS = 3000;

    const cancelHold = (showHint = false) => {
      if (!holding) return;
      holding = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      fillEl.style.width = '0%';
      if (showHint && this.resetStatusEl) {
        this.resetStatusEl.textContent = 'Hold steady for 3 full seconds to confirm reset.';
      }
    };

    const tick = (now) => {
      if (!holding) return;
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / HOLD_MS);
      fillEl.style.width = `${(progress * 100).toFixed(1)}%`;

      const step = Math.floor(elapsed / 300);
      if (step !== lastTickStep) {
        lastTickStep = step;
        audio.playHoldTick(progress);
      }

      if (progress >= 1) {
        holding = false;
        rafId = null;
        fillEl.style.width = '100%';
        audio.playLevelUp();
        onConfirmed();
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    btnEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      holding = true;
      startTime = performance.now();
      lastTickStep = -1;
      if (this.resetStatusEl) this.resetStatusEl.textContent = 'Holding... keep pressing for 3 seconds!';
      rafId = requestAnimationFrame(tick);
    });

    btnEl.addEventListener('pointerup', () => cancelHold(true));
    btnEl.addEventListener('pointerleave', () => cancelHold(true));
    btnEl.addEventListener('pointercancel', () => cancelHold(false));
    btnEl.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  bindInputEvents() {
    this.input.on('action', () => {
      if (this.dialogueOpen) {
        this.closeDialogue();
        return;
      }
      if (this.battle.active) {
        this.battle.triggerPrimaryAction();
        return;
      }
      if (!this.pokedex.isOpen() && !this.isSettingsOpen() && !this.gameShellEl.hidden) {
        this.overworld.triggerInteract();
      }
    });

    this.input.on('cancel', () => {
      if (this.dialogueOpen) {
        this.closeDialogue();
        return;
      }
      if (this.pokedex.isOpen()) {
        this.pokedex.close();
        this.syncOverworldPause();
        return;
      }
      if (this.isSettingsOpen()) {
        this.closeSettings();
        return;
      }
      if (this.battle.active) {
        this.battle.triggerCancelAction();
      }
    });

    this.input.on('pokedex', () => {
      if (this.gameShellEl.hidden || this.battle.active || this.isSettingsOpen()) return;
      if (this.pokedex.isOpen()) {
        this.pokedex.close();
        this.syncOverworldPause();
      } else {
        this.openPokedex('dex');
      }
    });
  }

  toggleMute() {
    const next = !storage.getSettings().muted;
    storage.updateSettings({ muted: next });
    this.applySettings();
    if (!next) audio.playMenuBlip(740);
  }

  showBootScreen() {
    this.overworld.setActive(false);
    this.bootScreenEl.hidden = false;
    this.starterScreenEl.hidden = true;
    this.gameShellEl.hidden = true;
    this.closeDialogue();

    drawTrainerPortrait(document.getElementById('portrait-violet'), 'violet');
    drawTrainerPortrait(document.getElementById('portrait-ozias'), 'ozias');

    const vSum = storage.getProfileSummary('violet');
    const oSum = storage.getProfileSummary('ozias');
    document.getElementById('summary-violet').textContent = vSum.label;
    document.getElementById('summary-ozias').textContent = oSum.label;

    audio.playBGM('title');
  }

  selectTrainer(trainerId) {
    storage.selectTrainer(trainerId);
    this.applyTrainerTheme(trainerId);
    const profile = storage.getActiveProfile();
    if (!profile.starterId) {
      this.showStarterScreen(trainerId);
    } else {
      this.enterOverworld(false);
    }
  }

  showStarterScreen(trainerId) {
    const trainer = TRAINERS[trainerId];
    this.bootScreenEl.hidden = true;
    this.starterScreenEl.hidden = false;
    this.gameShellEl.hidden = true;

    this.starterGreetingEl.textContent = `Welcome, ${trainer.name}! Choose your first partner Pokémon!`;
    this.starterCardsEl.innerHTML = '';

    for (const id of STARTER_IDS) {
      const sp = SPECIES[id];
      const typeInfo = TYPES[sp.type];

      const card = document.createElement('div');
      card.className = 'starter-card';
      card.style.borderColor = typeInfo.color;

      const spriteBox = document.createElement('div');
      spriteBox.className = 'starter-sprite-box';
      const img = document.createElement('img');
      attachPokemonSprite(img, sp.id, { back: false, timeoutMs: 2000 });
      spriteBox.appendChild(img);

      const badge = document.createElement('span');
      badge.className = 'type-pill';
      badge.style.backgroundColor = typeInfo.bg;
      badge.style.borderColor = typeInfo.color;
      badge.textContent = `${typeInfo.icon} ${typeInfo.label}`;

      const title = document.createElement('h3');
      title.textContent = sp.name;

      const flavor = document.createElement('p');
      flavor.className = 'starter-flavor';
      flavor.textContent = sp.flavor;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'starter-pick-btn';
      btn.textContent = `Choose ${sp.name}!`;
      btn.addEventListener('click', () => {
        audio.playCaptureSuccess();
        storage.chooseStarter(sp.id);
        this.enterOverworld(true);
      });

      card.appendChild(spriteBox);
      card.appendChild(badge);
      card.appendChild(title);
      card.appendChild(flavor);
      card.appendChild(btn);
      this.starterCardsEl.appendChild(card);
    }
  }

  enterOverworld(isBrandNew) {
    const profile = storage.getActiveProfile();
    if (!profile) return;

    this.bootScreenEl.hidden = true;
    this.starterScreenEl.hidden = true;
    this.gameShellEl.hidden = false;

    drawTrainerPortrait(this.hudPortraitEl, profile.trainerId);
    this.hudTrainerNameEl.textContent = TRAINERS[profile.trainerId]?.name || 'Trainer';
    this.refreshHud();

    this.overworld.setActive(true);
    this.syncOverworldPause();
    audio.playBGM('overworld');

    if (isBrandNew) {
      const lead = profile.team[0];
      const trainerName = TRAINERS[profile.trainerId]?.name || 'Trainer';
      this.openDialogue(
        `${trainerName} & ${lead?.name || 'Partner'} set out on Starlight Island! Explore North to Whispering Forest, East to Crystal Cavern, or South to Sapphire Lagoon!`
      );
    }
  }

  refreshHud() {
    const profile = storage.getActiveProfile();
    if (!profile) return;

    const lead = profile.team[0];
    if (lead) {
      this.hudLeadLabelEl.textContent = `Lv.${lead.level} ${lead.name}`;
      const pct = Math.max(0, Math.min(100, Math.round((lead.hp / Math.max(1, lead.maxHp)) * 100)));
      this.hudLeadHpEl.style.width = `${pct}%`;
      this.hudLeadHpEl.style.backgroundColor = pct <= 20 ? '#ef4444' : pct <= 50 ? '#f59e0b' : '#10b981';
    }

    const totalSpecies = Object.keys(SPECIES).length;
    const caughtCount = Object.keys(profile.pokedex.caught).length;
    this.hudDexBtn.textContent = `📖 Dex ${caughtCount}/${totalSpecies}`;
    this.hudBadgesBtn.textContent = `🏅 ${profile.badges.length}/6`;
  }

  syncOverworldPause() {
    const paused = this.dialogueOpen || this.battle.active || this.pokedex.isOpen() || this.isSettingsOpen();
    this.overworld.setPaused(paused);
  }

  openDialogue(message) {
    const profile = storage.getActiveProfile();
    const trainerName = TRAINERS[profile?.trainerId]?.name || 'Trainer';
    const text = message.replaceAll('{trainer}', trainerName);
    this.worldDialogueTextEl.textContent = text;
    this.worldDialogueEl.hidden = false;
    this.dialogueOpen = true;
    this.syncOverworldPause();
  }

  closeDialogue() {
    if (!this.dialogueOpen) return;
    audio.playMenuBlip(540);
    this.worldDialogueEl.hidden = true;
    this.dialogueOpen = false;
    this.syncOverworldPause();
  }

  handleBiomeChange(biome, announce) {
    if (!this.biomeBannerEl) return;
    this.biomeBannerEl.textContent = `${biome.icon} ${biome.name}`;
    if (!announce) {
      this.biomeBannerEl.hidden = false;
      clearTimeout(this.biomeBannerTimer);
      this.biomeBannerTimer = setTimeout(() => {
        this.biomeBannerEl.hidden = true;
      }, 2200);
      return;
    }
    this.biomeBannerEl.hidden = false;
    clearTimeout(this.biomeBannerTimer);
    this.biomeBannerTimer = setTimeout(() => {
      this.biomeBannerEl.hidden = true;
    }, 2400);
  }

  handleInteractHint(target) {
    if (!this.interactPillEl) return;
    if (!target) {
      this.interactPillEl.hidden = true;
      return;
    }
    this.interactPillEl.textContent = target.label;
    this.interactPillEl.hidden = false;
  }

  handleWorldInteract(target) {
    audio.playMenuBlip(700);
    if (target.type === 'sign') {
      this.openDialogue(target.data);
    } else if (target.type === 'heal') {
      this.handleHealSpot(true);
    } else if (target.type === 'chest') {
      const chest = target.data;
      if (storage.markChestOpened(chest.id)) {
        audio.playLevelUp();
        storage.addRewards(chest.rewards);
        this.overworld.refreshInteractHint();
        this.openDialogue(chest.message);
      } else {
        this.openDialogue('This treasure chest has already been opened!');
      }
    } else if (target.type === 'shrine') {
      const shrine = target.data;
      const profile = storage.getActiveProfile();
      if (profile?.shrinesCleared.includes(shrine.id)) {
        this.openDialogue(shrine.clearedText);
      } else {
        this.startShrineEncounter(shrine);
      }
    }
  }

  handleHealSpot(explicitInteract = false) {
    const profile = storage.getActiveProfile();
    if (!profile) return;
    const anyInjured = profile.team.some((m) => m.hp < m.maxHp) || profile.bag.potions < 5;
    if (!anyInjured && !explicitInteract) return;

    storage.healTeam(true);
    this.refreshHud();
    audio.playHealChime();
    this.openDialogue('✨ Starlight Fountain restored your whole team to full HP and refilled Berry Potions!');
  }

  getAverageTeamLevel() {
    const profile = storage.getActiveProfile();
    if (!profile || profile.team.length === 0) return 5;
    const sum = profile.team.reduce((acc, m) => acc + m.level, 0);
    return sum / profile.team.length;
  }

  async triggerEncounterTransition() {
    this.input.clearAll();
    this.syncOverworldPause();
    audio.playEncounterAlert();
    if (this.encounterFlashEl) {
      this.encounterFlashEl.hidden = false;
      await new Promise((res) => setTimeout(res, 380));
      this.encounterFlashEl.hidden = true;
    }
    audio.playBGM('battle');
  }

  async startWildEncounter(biomeId) {
    if (this.battle.active) return;
    if (!storage.ensureHealthyParty()) return;
    const wild = rollWildPokemon(biomeId, this.getAverageTeamLevel());
    if (!wild) return;

    await this.triggerEncounterTransition();
    this.battle.start({
      enemy: wild,
      biomeId,
      isShrine: false,
      shrineData: null,
    });
  }

  async startShrineEncounter(shrine) {
    if (this.battle.active) return;
    if (!storage.ensureHealthyParty()) return;
    const guardian = createPokemon(shrine.guardianId, shrine.level, shrine.biome);
    await this.triggerEncounterTransition();
    this.battle.start({
      enemy: guardian,
      biomeId: 'shrine',
      isShrine: true,
      shrineData: shrine,
    });
  }

  handleBattleEnd(result) {
    audio.playBGM('overworld');

    if (result.faintedAll) {
      storage.updatePosition(GAME_META.spawn.x, GAME_META.spawn.y, 'down', false);
      storage.healTeam(true);
      this.overworld.syncFromProfile();
      audio.playHealChime();
      this.openDialogue('Professor Willow gently healed your team back at Starlight Village! You are ready to explore again.');
    } else {
      this.overworld.syncFromProfile();
    }

    this.refreshHud();
    this.syncOverworldPause();
  }

  showBadgeToast(badges) {
    if (!badges || badges.length === 0 || !this.badgeToastEl) return;
    const first = badges[0];
    this.badgeToastIconEl.textContent = first.icon;
    this.badgeToastNameEl.textContent = first.name;
    this.badgeToastDescEl.textContent = badges.length > 1
      ? `+ ${badges.length - 1} more badge unlocked!`
      : first.description;
    this.badgeToastEl.hidden = false;
    audio.playBadgeFanfare();

    clearTimeout(this.badgeToastTimer);
    this.badgeToastTimer = setTimeout(() => {
      this.badgeToastEl.hidden = true;
    }, 4400);
  }

  openPokedex(tab = 'dex') {
    this.pokedex.open(tab);
    this.syncOverworldPause();
  }

  isSettingsOpen() {
    return Boolean(this.settingsModalEl && !this.settingsModalEl.hidden);
  }

  openSettings() {
    if (!this.settingsModalEl) return;
    if (this.resetStatusEl) this.resetStatusEl.textContent = '';
    this.settingsModalEl.hidden = false;
    this.syncOverworldPause();
  }

  closeSettings() {
    if (!this.settingsModalEl) return;
    this.settingsModalEl.hidden = true;
    this.syncOverworldPause();
  }

  loop(nowMs) {
    const dt = Math.min(0.05, Math.max(0, (nowMs - this.lastFrameTime) / 1000));
    this.lastFrameTime = nowMs;

    const dir = this.input.getDirection();
    this.overworld.update(dt, dir);
    this.overworld.render(nowMs);

    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.__starlightApp = new GameApp();
});
