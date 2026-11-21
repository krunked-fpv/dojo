import {
  BADGES,
  BIOMES,
  EVOLUTION_ITEMS,
  FIELD_QUESTS,
  GAME_META,
  SHRINES,
  SPECIES,
  STARTER_IDS,
  TRAINERS,
  TYPES,
  getBiomeAt,
  getBiomeDiscoveryStats,
  getCompassGuidance,
} from './config.js';
import { attachPokemonSprite, createPokemon, rollWildPokemon } from './pokemon.js';
import { storage } from './storage.js';
import { THEMES, audio } from './audio.js';
import { InputController } from './input.js';
import { OverworldEngine, drawTrainerPortrait } from './overworld.js';
import { BattleEngine } from './battle.js';
import { PokedexUI } from './pokedex.js';

function resolveValidSpeciesId(raw) {
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

function countCaughtSpecies(profile) {
  if (!profile) return 0;
  const caughtIds = new Set();
  const rawCaught = profile.pokedex?.caught;
  if (Array.isArray(rawCaught)) {
    for (const rawId of rawCaught) {
      const numId = resolveValidSpeciesId(rawId);
      if (numId !== null) caughtIds.add(numId);
    }
  } else if (rawCaught && typeof rawCaught === 'object') {
    for (const [rawKey, rawVal] of Object.entries(rawCaught)) {
      const numId = resolveValidSpeciesId(rawKey);
      if (numId === null) continue;
      const val = rawVal === true ? 1 : Number(rawVal);
      if (Number.isFinite(val) && val > 0) {
        caughtIds.add(numId);
      }
    }
  }

  const starterId = resolveValidSpeciesId(profile.starterId);
  if (starterId !== null) {
    caughtIds.add(starterId);
  }

  for (const mon of [...(profile.team || []), ...(profile.box || [])]) {
    const spId = resolveValidSpeciesId(mon?.speciesId);
    if (spId !== null) {
      caughtIds.add(spId);
    }
  }

  return caughtIds.size;
}

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
    this.compassHudEl = document.getElementById('compass-hud');
    this.compassArrowEl = document.getElementById('compass-arrow');
    this.compassGoalEl = document.getElementById('compass-goal');
    this.compassSubEl = document.getElementById('compass-biome-progress');
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
    this.settingPaceBtn = document.getElementById('setting-pace-btn');
    this.settingSwitchBtn = document.getElementById('setting-switch-trainer-btn');

    this.resetTrainerBtn = document.getElementById('reset-trainer-btn');
    this.resetTrainerFill = document.getElementById('reset-trainer-fill');
    this.resetAllBtn = document.getElementById('reset-all-btn');
    this.resetAllFill = document.getElementById('reset-all-fill');
    this.resetStatusEl = document.getElementById('reset-status-msg');

    this.dialogueOpen = false;
    this.manualBattlePad = false;
    this._wasInBattle = false;
    this._wasModalOpen = false;
    this._lastCompassHidden = null;
    this.biomeBannerTimer = null;
    this.badgeToastTimer = null;
    this.resetRedirectTimer = null;
    this.encounterTransitioning = false;
    this.encounterTimer = null;
    this.encounterToken = 0;

    this.loopRafId = null;
    this.loopStartCount = 0;
    this.lastFrameTime = performance.now();
    this.fpsSampleStart = this.lastFrameTime;
    this.fpsFrameCount = 0;
    this.measuredFps = 0;

    this.audio = audio;
    this.input = new InputController();
    this.pokedex = new PokedexUI({
      storage,
      audio,
      onTeamChanged: () => this.refreshHud(),
      onBadgesUnlocked: (badges) => this.showBadgeToast(badges),
      onClose: () => {
        this.syncControlVisibility();
        this.syncOverworldPause();
      },
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
      onStepSaved: (x, y, dir, incSteps) => {
        storage.updatePosition(x, y, dir, incSteps);
        this.updateCompassHud();
      },
      onWildEncounter: (biomeId, encounterMeta = {}) => this.startWildEncounter(biomeId, encounterMeta),
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

    if (this.cabinetEl) {
      this.cabinetEl.dataset.diagnostics = JSON.stringify(this.getDiagnostics());
    }

    this.startMainLoop();
  }

  blurFocusedControl() {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  startMainLoop() {
    if (this.loopRafId !== null) {
      cancelAnimationFrame(this.loopRafId);
      this.loopRafId = null;
    }
    this.loopStartCount += 1;
    this.lastFrameTime = performance.now();
    this.fpsSampleStart = this.lastFrameTime;
    this.fpsFrameCount = 0;
    this.loopRafId = requestAnimationFrame((now) => this.loop(now));
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
    if (this.settingPaceBtn) {
      const paceLabels = { cinema: '🎬 Cinema', classic: '⚡ Classic', fast: '🚀 Fast' };
      const pace = settings.battlePace || 'cinema';
      this.settingPaceBtn.textContent = paceLabels[pace] || '🎬 Cinema';
    }
    this.syncControlVisibility();
  }

  syncControlVisibility() {
    const inBattle = Boolean(this.battle?.active || this.encounterTransitioning);
    const modalOpen = Boolean(this.pokedex?.isOpen() || this.isSettingsOpen());
    if (!inBattle) {
      this.manualBattlePad = false;
    }

    const becameInBattle = inBattle && !this._wasInBattle;
    const becameModalOpen = modalOpen && !this._wasModalOpen;
    this._wasInBattle = inBattle;
    this._wasModalOpen = modalOpen;

    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.toggle('in-battle', inBattle);
      document.body.classList.toggle('modal-open', modalOpen);
      document.body.classList.toggle('manual-battle-pad', inBattle && this.manualBattlePad);
    }

    if (becameInBattle || becameModalOpen) {
      this.input.clearAll();
    }

    if (this.hudPadBtn) {
      const settings = storage.getSettings();
      const active = inBattle ? this.manualBattlePad : settings.showTouchPad === 'show';
      this.hudPadBtn.classList.toggle('is-active', active);
      const nextTitle = inBattle
        ? (this.manualBattlePad ? 'Hide On-Screen Gamepad in Battle' : 'Show On-Screen Gamepad in Battle')
        : ({
            auto: 'Gamepad Mode: Auto (Tap to cycle)',
            show: 'Gamepad Mode: Always On (Tap to cycle)',
            hide: 'Gamepad Mode: Hidden (Tap to cycle)',
          }[settings.showTouchPad] || 'Toggle On-Screen Gamepad');
      if (this.hudPadBtn.title !== nextTitle) {
        this.hudPadBtn.title = nextTitle;
      }
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

    this.compassHudEl?.addEventListener('click', () => {
      audio.playMenuBlip(680);
      this.openPokedex('guide');
    });

    this.hudMuteBtn?.addEventListener('click', () => this.toggleMute());
    this.settingMuteBtn?.addEventListener('click', () => this.toggleMute());

    this.hudPadBtn?.addEventListener('click', () => {
      audio.playMenuBlip(640);
      const inBattle = Boolean(this.battle?.active || this.encounterTransitioning);
      if (inBattle) {
        this.manualBattlePad = !this.manualBattlePad;
        this.syncControlVisibility();
      } else {
        const current = storage.getSettings().showTouchPad;
        const order = ['auto', 'show', 'hide'];
        const next = order[(order.indexOf(current) + 1) % order.length];
        storage.updateSettings({ showTouchPad: next });
        this.applySettings();
      }
      this.blurFocusedControl();
    });

    this.settingPadBtn?.addEventListener('click', () => {
      audio.playMenuBlip(640);
      const current = storage.getSettings().showTouchPad;
      const order = ['auto', 'show', 'hide'];
      const next = order[(order.indexOf(current) + 1) % order.length];
      storage.updateSettings({ showTouchPad: next });
      this.applySettings();
      this.blurFocusedControl();
    });

    this.settingPaceBtn?.addEventListener('click', () => {
      audio.playMenuBlip(640);
      const current = storage.getSettings().battlePace || 'cinema';
      const order = ['cinema', 'classic', 'fast'];
      const next = order[(order.indexOf(current) + 1) % order.length];
      storage.updateSettings({ battlePace: next });
      this.applySettings();
      this.blurFocusedControl();
    });

    this.settingCrtBtn?.addEventListener('click', () => {
      audio.playMenuBlip(640);
      const next = !storage.getSettings().crtEnabled;
      storage.updateSettings({ crtEnabled: next });
      this.applySettings();
      this.blurFocusedControl();
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
      if (this.resetRedirectTimer) clearTimeout(this.resetRedirectTimer);
      this.resetRedirectTimer = setTimeout(() => {
        this.resetRedirectTimer = null;
        this.closeSettings();
        this.showBootScreen();
      }, 450);
    });

    this.bindHoldReset(this.resetAllBtn, this.resetAllFill, () => {
      storage.resetAllProgress();
      this.resetStatusEl.textContent = 'Both Violet and Ozias profiles were reset cleanly!';
      if (this.resetRedirectTimer) clearTimeout(this.resetRedirectTimer);
      this.resetRedirectTimer = setTimeout(() => {
        this.resetRedirectTimer = null;
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
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (!holding) return;
      holding = false;
      fillEl.style.width = '0%';
      if (showHint && this.resetStatusEl) {
        this.resetStatusEl.textContent = 'Hold steady for 3 full seconds to confirm reset.';
      }
    };

    const tick = (now) => {
      if (!holding) {
        rafId = null;
        return;
      }
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
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
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
      if (!this.pokedex.isOpen() && !this.isSettingsOpen() && !this.gameShellEl.hidden && !this.encounterTransitioning) {
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
      if (this.gameShellEl.hidden || this.battle.active || this.encounterTransitioning || this.isSettingsOpen()) return;
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
    this.blurFocusedControl();
  }

  cancelEncounterTransition() {
    this.encounterToken += 1;
    this.encounterTransitioning = false;
    if (this.encounterTimer !== null) {
      clearTimeout(this.encounterTimer);
      this.encounterTimer = null;
    }
    if (this.encounterFlashEl) {
      this.encounterFlashEl.hidden = true;
    }
  }

  showBootScreen() {
    this.cancelEncounterTransition();
    if (this.battle?.active) {
      this.battle.stop({ outcome: 'escaped', faintedAll: false });
    }
    this.pokedex?.close?.();
    if (this.isSettingsOpen()) {
      this.settingsModalEl.hidden = true;
    }
    this.manualBattlePad = false;
    this.input.clearAll();
    this.overworld.setActive(false);
    this.bootScreenEl.hidden = false;
    this.starterScreenEl.hidden = true;
    this.gameShellEl.hidden = true;
    this.closeDialogue();
    this.syncControlVisibility();
    this.updateCompassHud();

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
    this.syncControlVisibility();
    this.updateCompassHud();

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

    storage.syncPokedex?.(profile, false);

    this.bootScreenEl.hidden = true;
    this.starterScreenEl.hidden = true;
    this.gameShellEl.hidden = false;

    drawTrainerPortrait(this.hudPortraitEl, profile.trainerId);
    this.hudTrainerNameEl.textContent = TRAINERS[profile.trainerId]?.name || 'Trainer';
    this.refreshHud();

    this.overworld.setActive(true);
    this.syncControlVisibility();
    this.syncOverworldPause();

    const startBiome = getBiomeAt(profile.pos.x, profile.pos.y);
    const startTheme = startBiome && THEMES[startBiome.id] ? startBiome.id : 'overworld';
    audio.playBGM(startTheme);
    this.updateCompassHud();

    if (isBrandNew) {
      const lead = profile.team[0];
      const trainerName = TRAINERS[profile.trainerId]?.name || 'Trainer';
      this.openDialogue(
        `${trainerName} & ${lead?.name || 'Partner'} set out on Starlight Island! Follow the Starlight Compass to Whispering Forest, Crystal Cavern, Sapphire Lagoon, Ember Caldera, and Starfall Peak!`
      );
    }
  }

  refreshHud() {
    const profile = storage.getActiveProfile();
    if (!profile) return;

    storage.syncPokedex?.(profile, false);

    const lead = profile.team[0];
    if (lead) {
      this.hudLeadLabelEl.textContent = `Lv.${lead.level} ${lead.isShiny ? '✨ ' : ''}${lead.name}`;
      const pct = Math.max(0, Math.min(100, Math.round((lead.hp / Math.max(1, lead.maxHp)) * 100)));
      this.hudLeadHpEl.style.width = `${pct}%`;
      this.hudLeadHpEl.style.backgroundColor = pct <= 20 ? '#ef4444' : pct <= 50 ? '#f59e0b' : '#10b981';
    }

    const totalSpecies = Object.keys(SPECIES).length;
    const caughtCount = countCaughtSpecies(profile);
    this.hudDexBtn.textContent = `📖 Dex ${caughtCount}/${totalSpecies}`;
    this.hudBadgesBtn.textContent = `🏅 ${profile.badges.length}/${BADGES.length}`;
    this.overworld?.syncFollower?.();
    this.updateCompassHud();
  }

  formatCompassDirection(guidance, profile) {
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
    return guidance.arrowDir || '🧭 Go';
  }

  isCompassHidden() {
    return Boolean(
      !storage.getActiveProfile() ||
      this.gameShellEl?.hidden ||
      this.battle?.active ||
      this.encounterTransitioning ||
      this.dialogueOpen ||
      this.pokedex?.isOpen() ||
      this.isSettingsOpen()
    );
  }

  updateCompassVisibility() {
    if (!this.compassHudEl) return;
    const shouldHide = this.isCompassHidden();
    if (this._lastCompassHidden !== shouldHide) {
      this._lastCompassHidden = shouldHide;
      this.compassHudEl.hidden = shouldHide;
      if (!shouldHide) {
        this.updateCompassHud();
      }
    }
  }

  updateCompassHud() {
    if (!this.compassHudEl) return;
    const shouldHide = this.isCompassHidden();
    this._lastCompassHidden = shouldHide;
    this.compassHudEl.hidden = shouldHide;
    if (shouldHide) return;

    const profile = storage.getActiveProfile();
    if (!profile) return;

    storage.syncPokedex?.(profile, false);

    const guidance = typeof getCompassGuidance === 'function' ? getCompassGuidance(profile, SPECIES) : null;
    const currentBiome = getBiomeAt(profile.pos.x, profile.pos.y) || BIOMES.village;
    const stats = typeof getBiomeDiscoveryStats === 'function' && currentBiome
      ? getBiomeDiscoveryStats(profile, currentBiome.id)
      : null;

    const dirLabel = this.formatCompassDirection(guidance, profile);
    if (this.compassArrowEl) {
      this.compassArrowEl.textContent = guidance?.icon || '🧭';
    }
    if (this.compassGoalEl) {
      const goalTitle = guidance?.title || 'Explore Starlight Island';
      this.compassGoalEl.textContent = `${dirLabel} • ${goalTitle}`;
    }
    if (this.compassSubEl) {
      const totalSpecies = Object.keys(SPECIES).length;
      const totalCaught = countCaughtSpecies(profile);
      const totalShrines = Object.keys(SHRINES).length;
      if (stats && stats.totalSpecies > 0) {
        const chestPart = stats.chestsTotal > 0 ? ` • 📦 ${stats.chestsOpened}/${stats.chestsTotal}` : '';
        const hasShrine = Object.values(SHRINES).some((s) => s.biome === currentBiome.id);
        const shrinePart = hasShrine ? ` • ${stats.shrineCleared ? '⛩️ ✓' : '⛩️ Open'}` : '';
        this.compassSubEl.textContent = `${currentBiome.icon} Dex ${stats.caught}/${stats.totalSpecies}${chestPart}${shrinePart}`;
      } else {
        this.compassSubEl.textContent = `${currentBiome?.icon || '🏡'} Dex ${totalCaught}/${totalSpecies} • Shrines ${profile.shrinesCleared.length}/${totalShrines}`;
      }
    }
  }

  syncOverworldPause() {
    if (this.worldDialogueEl && this.worldDialogueEl.hidden && this.dialogueOpen) {
      this.dialogueOpen = false;
    }
    this.syncControlVisibility();
    this.updateCompassVisibility();
    const paused = (
      this.dialogueOpen ||
      this.encounterTransitioning ||
      this.battle.active ||
      this.pokedex.isOpen() ||
      this.isSettingsOpen()
    );
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
    this.blurFocusedControl();
    this.syncOverworldPause();
  }

  handleBiomeChange(biome, announce) {
    if (biome?.id) {
      storage.recordBiomeVisited?.(biome.id);
      const themeId = THEMES[biome.id] ? biome.id : 'overworld';
      if (!this.battle.active && !this.encounterTransitioning && this.gameShellEl && !this.gameShellEl.hidden) {
        if (audio.currentTheme !== themeId) {
          audio.playBGM(themeId);
        }
      }
    }

    this.updateCompassHud();

    if (!this.biomeBannerEl || !biome) return;
    this.biomeBannerEl.textContent = `${biome.icon} ${biome.name}`;
    this.biomeBannerEl.hidden = false;
    clearTimeout(this.biomeBannerTimer);
    this.biomeBannerTimer = setTimeout(() => {
      this.biomeBannerEl.hidden = true;
    }, announce ? 2400 : 2200);
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

  formatRewardSummary(rewards = {}) {
    const parts = [];
    if (rewards.potions) parts.push(`+${rewards.potions} Berry Potion${rewards.potions > 1 ? 's' : ''}`);
    if (rewards.greatBalls) parts.push(`+${rewards.greatBalls} Great Ball${rewards.greatBalls > 1 ? 's' : ''}`);
    if (rewards.gems && typeof rewards.gems === 'object') {
      for (const [gemId, count] of Object.entries(rewards.gems)) {
        if (count > 0) {
          const item = EVOLUTION_ITEMS?.[gemId];
          parts.push(`+${count} ${item?.icon || '💎'} ${item?.name || gemId}`);
        }
      }
    }
    return parts.join(', ');
  }

  handleNpcInteract(npc) {
    if (!npc) return;
    storage.markNpcTalked?.(npc.id);
    const profile = storage.getActiveProfile();
    const quests = Array.isArray(FIELD_QUESTS) ? FIELD_QUESTS : Object.values(FIELD_QUESTS || {});
    const quest = quests.find((q) => (npc.questId && q.id === npc.questId) || q.npcId === npc.id) || null;

    if (quest && profile) {
      if (profile.questsCompleted?.includes(quest.id)) {
        this.openDialogue(`${npc.name}: "${quest.completeDialogue || npc.greeting}"`);
        this.refreshHud();
        return;
      }
      if (quest.check?.(profile)) {
        const res = storage.completeQuest?.(quest.id, quest.rewards || {});
        audio.playLevelUp();
        this.overworld.refreshInteractHint();
        this.refreshHud();
        if (res?.newBadges?.length) {
          this.showBadgeToast(res.newBadges);
        }
        const rewardText = this.formatRewardSummary(quest.rewards);
        const msg = quest.completeDialogue
          ? `✨ Quest Complete (${quest.title})! ${npc.name}: "${quest.completeDialogue}"${rewardText ? ` [${rewardText}]` : ''}`
          : `✨ Quest Complete: ${quest.title}!${rewardText ? ` Earned ${rewardText}!` : ''}`;
        this.openDialogue(msg);
        return;
      }
      const hint = typeof quest.progressText === 'function' ? quest.progressText(profile) : quest.description;
      this.openDialogue(`${npc.name}: "${npc.greeting}" — Quest [${quest.title}]: ${hint}`);
      this.refreshHud();
      return;
    }

    this.openDialogue(`${npc.name}: "${npc.greeting}"`);
    this.refreshHud();
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
        this.refreshHud();
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
    } else if (target.type === 'npc') {
      this.handleNpcInteract(target.data);
    } else if (target.type === 'landmark') {
      const lm = target.data;
      if (typeof lm === 'string') {
        this.openDialogue(lm);
      } else if (lm) {
        this.openDialogue(`${lm.icon || '🗿'} ${lm.name}: ${lm.description}`);
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
    const token = ++this.encounterToken;
    this.encounterTransitioning = true;
    this.manualBattlePad = false;
    this.input.clearAll();
    this.syncControlVisibility();
    this.syncOverworldPause();
    audio.stopBGM();
    audio.playEncounterAlert();

    try {
      if (this.encounterFlashEl) {
        this.encounterFlashEl.hidden = false;
        await new Promise((res) => {
          if (this.encounterTimer !== null) {
            clearTimeout(this.encounterTimer);
          }
          this.encounterTimer = setTimeout(() => {
            this.encounterTimer = null;
            res();
          }, 380);
        });
        this.encounterFlashEl.hidden = true;
      }

      if (token !== this.encounterToken) return false;
      audio.playBGM('battle');
      return true;
    } finally {
      if (token === this.encounterToken) {
        this.encounterTransitioning = false;
        this.syncControlVisibility();
        this.syncOverworldPause();
      }
    }
  }

  async startWildEncounter(biomeId, encounterMeta = {}) {
    if (this.battle.active || this.encounterTransitioning) return;
    if (!storage.ensureHealthyParty()) return;
    const wild = rollWildPokemon(biomeId, this.getAverageTeamLevel(), encounterMeta);
    if (!wild) return;

    const ready = await this.triggerEncounterTransition();
    if (!ready || this.battle.active) return;
    this.manualBattlePad = false;
    this.battle.start({
      enemy: wild,
      biomeId,
      isShrine: false,
      shrineData: null,
    });
    this.syncControlVisibility();
    this.syncOverworldPause();
    this.updateCompassHud();
  }

  async startShrineEncounter(shrine) {
    if (this.battle.active || this.encounterTransitioning) return;
    if (!storage.ensureHealthyParty()) return;
    const guardian = createPokemon(shrine.guardianId, shrine.level, shrine.biome);
    const ready = await this.triggerEncounterTransition();
    if (!ready || this.battle.active) return;
    this.manualBattlePad = false;
    this.battle.start({
      enemy: guardian,
      biomeId: 'shrine',
      isShrine: true,
      shrineData: shrine,
    });
    this.syncControlVisibility();
    this.syncOverworldPause();
    this.updateCompassHud();
  }

  handleBattleEnd(result) {
    this.manualBattlePad = false;

    if (result.faintedAll) {
      storage.updatePosition(GAME_META.spawn.x, GAME_META.spawn.y, 'down', false);
      storage.healTeam(true);
      this.overworld.syncFromProfile();
      audio.playHealChime();
      this.openDialogue('Professor Willow gently healed your team back at Starlight Village! You are ready to explore again.');
    } else {
      this.overworld.syncFromProfile();
    }

    const profile = storage.getActiveProfile();
    const bId = profile ? getBiomeAt(profile.pos.x, profile.pos.y).id : 'overworld';
    audio.playBGM(THEMES[bId] ? bId : 'overworld');

    this.refreshHud();
    this.blurFocusedControl();
    this.syncControlVisibility();
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
    if (this.battle.active || this.encounterTransitioning) return;
    this.pokedex.open(tab);
    this.syncControlVisibility();
    this.syncOverworldPause();
  }

  isSettingsOpen() {
    return Boolean(this.settingsModalEl && !this.settingsModalEl.hidden);
  }

  openSettings() {
    if (!this.settingsModalEl) return;
    if (this.resetStatusEl) this.resetStatusEl.textContent = '';
    this.settingsModalEl.hidden = false;
    this.syncControlVisibility();
    this.syncOverworldPause();
  }

  closeSettings() {
    if (!this.settingsModalEl) return;
    this.settingsModalEl.hidden = true;
    this.blurFocusedControl();
    this.syncControlVisibility();
    this.syncOverworldPause();
  }

  getDiagnostics() {
    return {
      loopRafActive: this.loopRafId !== null,
      loopStartCount: this.loopStartCount,
      measuredFps: Number(this.measuredFps.toFixed(2)),
      encounterTransitioning: this.encounterTransitioning,
      battle: this.battle?.getDiagnostics?.() || null,
      audio: this.audio?.getDiagnostics?.() || null,
    };
  }

  loop(nowMs) {
    const dt = Math.min(0.05, Math.max(0, (nowMs - this.lastFrameTime) / 1000));
    this.lastFrameTime = nowMs;

    this.fpsFrameCount += 1;
    const windowElapsed = nowMs - this.fpsSampleStart;
    if (windowElapsed >= 1000) {
      this.measuredFps = (this.fpsFrameCount * 1000) / windowElapsed;
      this.fpsFrameCount = 0;
      this.fpsSampleStart = nowMs;
      if (this.cabinetEl) {
        this.cabinetEl.dataset.diagnostics = JSON.stringify(this.getDiagnostics());
      }
    }

    this.syncOverworldPause();

    const battleShowing = this.battle.active && !this.battle.screenEl?.hidden;
    if (!battleShowing) {
      const dir = this.input.getDirection();
      this.overworld.update(dt, dir);
      this.overworld.render(nowMs);
    }

    this.loopRafId = requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.__starlightApp = new GameApp();
});
