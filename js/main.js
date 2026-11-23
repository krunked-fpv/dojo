import * as Config from './config.js';
import * as PokemonMod from './pokemon.js';
import {
  BADGES,
  BIOMES,
  EVOLUTION_ITEMS,
  FIELD_QUESTS,
  GAME_META,
  RIVAL_TRAINERS,
  SHRINES,
  SPECIES,
  STARTER_IDS,
  TRAINERS,
  TYPES,
  getBiomeAt,
  getBiomeDiscoveryStats,
  getCompassGuidance,
  resolveTrainerLook,
} from './config.js';
import { attachPokemonSprite, createPokemon, rollWildPokemon } from './pokemon.js';
import { storage } from './storage.js';
import { THEMES, audio } from './audio.js';
import { InputController } from './input.js';
import { OverworldEngine, drawTrainerPortrait } from './overworld.js';
import { BattleEngine } from './battle.js';
import { StarlightMinigame } from './minigame.js';
import {
  PokedexUI,
  getBiomeScaledInfo,
  getPlayerProgressionSafe,
  getRecommendedFarmingZoneSafe,
  getTrainerAppearanceOptions,
  hasAnyReadyEvolutionSafe,
} from './pokedex.js';

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
    this.starterStyleBarEl = document.getElementById('starter-style-bar');
    this.starterCardsEl = document.getElementById('starter-cards');

    this.hudBarEl = document.querySelector('.hud-bar');
    this.overworldCanvasEl = document.getElementById('overworld-canvas');
    this.hudPortraitEl = document.getElementById('hud-portrait');
    this.hudTrainerNameEl = document.getElementById('hud-trainer-name');
    this.hudPlayerLevelEl = document.getElementById('hud-player-level');
    this.hudLeadLabelEl = document.getElementById('hud-lead-label');
    this.hudLeadHpEl = document.getElementById('hud-lead-hp');
    this.hudDexBtn = document.getElementById('hud-btn-dex');
    this.hudBadgesBtn = document.getElementById('hud-btn-badges');
    this.hudArcadeBtn = document.getElementById('hud-btn-arcade');
    this.hudMuteBtn = document.getElementById('hud-btn-mute');
    this.hudSettingsBtn = document.getElementById('hud-btn-settings');

    this.biomeBannerEl = document.getElementById('biome-banner');
    this.compassHudEl = document.getElementById('compass-hud');
    this.compassArrowEl = document.getElementById('compass-arrow');
    this.compassGoalEl = document.getElementById('compass-goal');
    this.compassSubEl = document.getElementById('compass-biome-progress');
    this.warpDockEl = document.getElementById('warp-dock');
    this.warpZoneBtn = document.getElementById('warp-zone-btn');
    this.warpZoneLabelEl = document.getElementById('warp-zone-label');
    this.warpSafeBtn = document.getElementById('warp-safe-btn');
    this.warpSafeLabelEl = document.getElementById('warp-safe-label');
    this.warpTransitionEl = document.getElementById('warp-transition');
    this.warpCalloutEl = document.getElementById('warp-callout');
    this.interactPillEl = document.getElementById('interact-pill');
    this.worldDialogueEl = document.getElementById('world-dialogue');
    this.worldDialogueTextEl = document.getElementById('world-dialogue-text');
    this.encounterFlashEl = document.getElementById('encounter-flash');
    this.encounterCalloutEl = document.getElementById('encounter-callout');
    this.celebrationLayerEl = document.getElementById('celebration-layer');

    this.badgeToastEl = document.getElementById('badge-toast');
    this.badgeToastIconEl = document.getElementById('badge-toast-icon');
    this.badgeToastNameEl = document.getElementById('badge-toast-name');
    this.badgeToastDescEl = document.getElementById('badge-toast-desc');

    this.settingsModalEl = document.getElementById('settings-modal');
    this.settingsCloseBtn = document.getElementById('settings-close-btn');
    this.settingMuteBtn = document.getElementById('setting-mute-btn');
    this.settingCrtBtn = document.getElementById('setting-crt-btn');
    this.settingPaceBtn = document.getElementById('setting-pace-btn');
    this.settingSwitchBtn = document.getElementById('setting-switch-trainer-btn');
    this.settingInstallRowEl = document.getElementById('setting-install-row');
    this.settingInstallBtn = document.getElementById('setting-install-btn');

    this.pwaInstallBannerEl = document.getElementById('pwa-install-banner');
    this.pwaInstallBtn = document.getElementById('pwa-install-btn');
    this.pwaInstallDismissBtn = document.getElementById('pwa-install-dismiss');
    this.hudInstallGroupEl = document.getElementById('hud-install-group');
    this.hudInstallBtn = document.getElementById('hud-btn-install');
    this.hudInstallDismissBtn = document.getElementById('hud-btn-install-dismiss');
    this.deferredInstallPrompt = null;
    this.installPromptDismissed = false;

    this.resetTrainerBtn = document.getElementById('reset-trainer-btn');
    this.resetTrainerFill = document.getElementById('reset-trainer-fill');
    this.resetAllBtn = document.getElementById('reset-all-btn');
    this.resetAllFill = document.getElementById('reset-all-fill');
    this.resetStatusEl = document.getElementById('reset-status-msg');

    this.dialogueOpen = false;
    this._wasInBattle = false;
    this._wasModalOpen = false;
    this._lastCompassHidden = null;
    this._starterFallbackStyle = null;
    this._starterFallbackAcc = null;
    this._starterFallbackAura = null;
    this.biomeBannerTimer = null;
    this.badgeToastTimer = null;
    this.badgeQueue = [];
    this.badgeShowing = false;
    this.celebrationTimer = null;
    this._pendingShrineData = null;
    this._preBattleShrineTrialCount = null;
    this.resetRedirectTimer = null;
    this.encounterTransitioning = false;
    this.encounterTimer = null;
    this.encounterToken = 0;
    this.warpTransitioning = false;
    this.warpTimer = null;
    this.warpToken = 0;
    this.warpResolver = null;

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
      onCelebrate: (opts) => this.triggerCelebration(opts),
      onOpenArcade: () => {
        this.pokedex.close();
        this.openMinigame();
      },
      onWarpToLevelZone: () => {
        this.pokedex.close();
        this.syncControlVisibility();
        this.syncOverworldPause();
        return this.triggerLevelZoneWarp();
      },
      onWarpToSafeZone: () => {
        this.pokedex.close();
        this.syncControlVisibility();
        this.syncOverworldPause();
        return this.triggerSafeZoneWarp();
      },
      onAppearanceChanged: (overrideAppearance = null) => {
        const p = storage.getActiveProfile();
        if (p) {
          const look = overrideAppearance && typeof overrideAppearance === 'object'
            ? overrideAppearance
            : p.appearance;
          this.applyTrainerTheme(p.trainerId, look);
          drawTrainerPortrait(this.hudPortraitEl, p.trainerId, look);
        }
        this.overworld.syncFollower?.();
        if (this.overworld?.active) {
          this.overworld.render?.(performance.now());
        }
      },
      onClose: () => {
        this.syncControlVisibility();
        this.syncOverworldPause();
      },
    });

    this.minigame = new StarlightMinigame({
      storage,
      audio,
      onCelebrate: (opts) => this.triggerCelebration(opts),
      onRewardsEarned: () => this.refreshHud(),
      onClose: () => {
        this.refreshHud();
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

    this.overworld = new OverworldEngine(this.overworldCanvasEl, {
      getProfile: () => storage.getActiveProfile(),
      onStepSaved: (x, y, dir, incSteps) => {
        const stepRes = storage.updatePosition(x, y, dir, incSteps);
        if (stepRes?.stepCheerEarned) {
          this.overworld?.triggerCelebrationBurst?.(x, y, 'heal');
          if (!this.battle?.active && !this.dialogueOpen) {
            audio.playBuddyCheer?.();
          }
        }
        if (stepRes?.stepArcadeChargeEarned) {
          this.overworld?.triggerCelebrationBurst?.(x, y, 'arcade');
        }
        if (stepRes?.stepCheerEarned || stepRes?.stepArcadeChargeEarned) {
          if (this.pokedex?.isOpen?.()) {
            this.pokedex.render?.();
          }
          this.refreshHud?.();
        }
        this.updateCompassHud();
      },
      onWildEncounter: (biomeId, encounterMeta = {}) => this.startWildEncounter(biomeId, encounterMeta),
      onDiscoveryNode: (node) => this.handleDiscoveryNode(node),
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
    this.bindPwaEvents();
    this.syncInstallBanner();
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

    if (this.hudMuteBtn) this.hudMuteBtn.textContent = settings.muted ? '🔇' : '🔊';
    if (this.settingMuteBtn) this.settingMuteBtn.textContent = settings.muted ? '🔇 Muted' : '🔊 Sound On';
    if (this.settingCrtBtn) this.settingCrtBtn.textContent = settings.crtEnabled ? '📺 CRT On' : '📺 CRT Off';
    if (this.settingPaceBtn) {
      const paceLabels = { cinema: '🎬 Cinema', classic: '⚡ Classic', fast: '🚀 Fast' };
      const pace = settings.battlePace || 'cinema';
      this.settingPaceBtn.textContent = paceLabels[pace] || '🎬 Cinema';
    }
    this.syncControlVisibility();
  }

  syncControlVisibility(options = {}) {
    const inBattle = Boolean(this.battle?.active || this.encounterTransitioning);
    const modalOpen = Boolean(this.pokedex?.isOpen() || this.isSettingsOpen() || this.minigame?.isOpen());

    const becameInBattle = inBattle && !this._wasInBattle;
    const becameModalOpen = modalOpen && !this._wasModalOpen;
    this._wasInBattle = inBattle;
    this._wasModalOpen = modalOpen;

    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.toggle('in-battle', inBattle);
      document.body.classList.toggle('modal-open', modalOpen);
    }

    if (becameInBattle || becameModalOpen) {
      this.input.clearAll();
      this.overworld?.clearTouchNavigation?.();
    }

    if (!options?.skipWarpDock) {
      this.syncWarpDock();
    }
  }

  applyTrainerTheme(trainerId, appearance = null) {
    const profile = appearance === null ? storage.getProfile?.(trainerId) : null;
    const effectiveAppearance = appearance ?? profile?.appearance ?? null;
    const resolvedBase = typeof resolveTrainerLook === 'function'
      ? resolveTrainerLook(trainerId, effectiveAppearance)
      : (TRAINERS[trainerId] || TRAINERS.violet);
    const styleId = effectiveAppearance?.styleId;
    let trainer = resolvedBase;
    if (styleId && styleId !== 'default' && !Config.TRAINER_STYLES?.[styleId]) {
      const { stylesMap } = getTrainerAppearanceOptions();
      if (stylesMap[styleId]) {
        trainer = { ...resolvedBase, ...stylesMap[styleId] };
      }
    }
    const root = document.documentElement.style;
    root.setProperty('--trainer-accent', trainer.accent);
    root.setProperty('--trainer-accent-dark', trainer.accentDark || resolvedBase.accentDark);
    root.setProperty('--trainer-accent-soft', trainer.accentSoft || resolvedBase.accentSoft);
  }

  isStandaloneMode() {
    return Boolean(
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.navigator?.standalone === true
    );
  }

  bindPwaEvents() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      this.syncInstallBanner();
    });

    window.addEventListener('appinstalled', () => {
      this.deferredInstallPrompt = null;
      this.syncInstallBanner();
    });

    window.matchMedia?.('(display-mode: standalone)')?.addEventListener?.('change', () => {
      this.syncInstallBanner();
    });

    this.pwaInstallBtn?.addEventListener('click', () => this.triggerPwaInstall());
    this.hudInstallBtn?.addEventListener('click', () => this.triggerPwaInstall());
    this.settingInstallBtn?.addEventListener('click', () => this.triggerPwaInstall());
    this.pwaInstallDismissBtn?.addEventListener('click', () => this.dismissPwaInstall());
    this.hudInstallDismissBtn?.addEventListener('click', () => this.dismissPwaInstall());
  }

  syncInstallBanner() {
    const canShow = Boolean(
      this.deferredInstallPrompt &&
      !this.isStandaloneMode() &&
      !this.installPromptDismissed
    );
    if (this.pwaInstallBannerEl) this.pwaInstallBannerEl.hidden = !canShow;
    if (this.hudInstallGroupEl) this.hudInstallGroupEl.hidden = !canShow;
    if (this.settingInstallRowEl) this.settingInstallRowEl.hidden = !canShow;
  }

  async triggerPwaInstall() {
    const promptEvent = this.deferredInstallPrompt;
    if (!promptEvent || typeof promptEvent.prompt !== 'function') {
      this.syncInstallBanner();
      return null;
    }
    audio.playMenuBlip(720);
    try {
      await promptEvent.prompt();
      const choice = promptEvent.userChoice ? await promptEvent.userChoice : null;
      this.deferredInstallPrompt = null;
      return choice;
    } catch {
      return null;
    } finally {
      this.syncInstallBanner();
      this.blurFocusedControl();
    }
  }

  dismissPwaInstall() {
    audio.playMenuBlip(500);
    this.installPromptDismissed = true;
    this.syncInstallBanner();
    this.blurFocusedControl();
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
    this.hudPortraitEl?.addEventListener('click', () => {
      audio.playMenuBlip(680);
      this.openPokedex('trainer');
    });

    this.hudPortraitEl?.addEventListener('keydown', (e) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        audio.playMenuBlip(680);
        this.openPokedex('trainer');
      }
    });

    this.hudDexBtn?.addEventListener('click', () => {
      audio.playMenuBlip(680);
      this.openPokedex('dex');
    });

    this.hudBadgesBtn?.addEventListener('click', () => {
      audio.playMenuBlip(680);
      this.openPokedex('badges');
    });

    this.hudArcadeBtn?.addEventListener('click', () => {
      audio.unlock?.();
      audio.playMenuBlip(760);
      this.openMinigame();
    });

    this.compassHudEl?.addEventListener('click', () => {
      audio.playMenuBlip(680);
      this.openPokedex('guide');
    });

    if (this.warpDockEl) {
      for (const evtName of ['pointerdown', 'pointerup', 'click']) {
        this.warpDockEl.addEventListener(evtName, (e) => {
          e.stopPropagation();
          if (evtName === 'pointerdown') {
            audio.unlock?.();
          }
        });
      }
      this.warpDockEl.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        audio.unlock?.();
      }, { passive: true });
    }

    this.warpZoneBtn?.addEventListener('click', () => {
      audio.unlock?.();
      this.triggerLevelZoneWarp();
    });

    this.warpSafeBtn?.addEventListener('click', () => {
      audio.unlock?.();
      this.triggerSafeZoneWarp();
    });

    this.hudMuteBtn?.addEventListener('click', () => this.toggleMute());
    this.settingMuteBtn?.addEventListener('click', () => this.toggleMute());

    const wakeAudio = () => {
      audio.unlock?.();
    };
    this.overworldCanvasEl?.addEventListener('pointerdown', wakeAudio, { passive: true });
    this.overworldCanvasEl?.addEventListener('touchstart', wakeAudio, { passive: true });
    this.hudBarEl?.addEventListener('pointerdown', wakeAudio, { passive: true });
    this.hudBarEl?.addEventListener('touchstart', wakeAudio, { passive: true });

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
      this.minigame?.close?.();
      if (this.battle.active) this.battle.stop({ outcome: 'escaped', faintedAll: false });
      this.showBootScreen();
    });

    this.interactPillEl?.addEventListener('click', () => {
      this.overworld.triggerInteract();
    });

    this.worldDialogueEl?.addEventListener('click', () => {
      this.closeDialogue();
    });

    let canvasDownWhileDialogue = false;
    let lastCanvasPointerUpMs = 0;
    const canCanvasDismissDialogue = () => Boolean(
      this.dialogueOpen &&
      !this.battle.active &&
      !this.encounterTransitioning &&
      !this.pokedex.isOpen() &&
      !this.minigame?.isOpen() &&
      !this.isSettingsOpen(),
    );

    this.overworldCanvasEl?.addEventListener('pointerdown', (e) => {
      if (e.button === 2) return;
      canvasDownWhileDialogue = canCanvasDismissDialogue();
    });

    this.overworldCanvasEl?.addEventListener('pointerup', (e) => {
      if (e.button === 2) return;
      lastCanvasPointerUpMs = performance.now();
      if (canvasDownWhileDialogue && canCanvasDismissDialogue()) {
        canvasDownWhileDialogue = false;
        this.closeDialogue();
        return;
      }
      canvasDownWhileDialogue = false;
    });

    this.overworldCanvasEl?.addEventListener('pointercancel', () => {
      canvasDownWhileDialogue = false;
    });

    this.overworldCanvasEl?.addEventListener('click', () => {
      if (performance.now() - lastCanvasPointerUpMs < 140) return;
      if (canCanvasDismissDialogue()) {
        this.closeDialogue();
      }
    });

    this.bindHoldReset(this.resetTrainerBtn, this.resetTrainerFill, () => {
      const id = storage.getActiveTrainerId();
      this.cancelWarpTransition();
      this.minigame?.close?.();
      storage.resetTrainerProgress(id);
      if (this.hudArcadeBtn) {
        this.hudArcadeBtn.hidden = true;
        this.hudArcadeBtn.removeAttribute('data-charges');
        this.hudArcadeBtn.classList.remove('is-depleted');
      }
      this.resetStatusEl.textContent = `${TRAINERS[id]?.name || 'Trainer'}'s progress was reset cleanly!`;
      if (this.resetRedirectTimer) clearTimeout(this.resetRedirectTimer);
      this.resetRedirectTimer = setTimeout(() => {
        this.resetRedirectTimer = null;
        this.closeSettings();
        this.showBootScreen();
      }, 450);
    });

    this.bindHoldReset(this.resetAllBtn, this.resetAllFill, () => {
      this.cancelWarpTransition();
      this.minigame?.close?.();
      storage.resetAllProgress();
      if (this.hudArcadeBtn) {
        this.hudArcadeBtn.hidden = true;
        this.hudArcadeBtn.removeAttribute('data-charges');
        this.hudArcadeBtn.classList.remove('is-depleted');
      }
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
      if (this.minigame?.isOpen()) return;
      if (this.dialogueOpen) {
        this.closeDialogue();
        return;
      }
      if (this.battle.active) {
        this.battle.triggerPrimaryAction();
        return;
      }
      if (!this.pokedex.isOpen() && !this.isSettingsOpen() && !this.gameShellEl.hidden && !this.encounterTransitioning && !this.warpTransitioning) {
        this.overworld.triggerInteract();
      }
    });

    this.input.on('cancel', () => {
      if (this.minigame?.isOpen()) {
        this.minigame.close();
        return;
      }
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
      if (this.gameShellEl.hidden || this.battle.active || this.encounterTransitioning || this.warpTransitioning || this.isSettingsOpen() || this.minigame?.isOpen()) return;
      if (this.pokedex.isOpen()) {
        this.pokedex.close();
        this.syncOverworldPause();
      } else {
        this.openPokedex('dex');
      }
    });

    this.input.on('warp', () => {
      this.triggerLevelZoneWarp();
    });

    this.input.on('safeWarp', () => {
      this.triggerSafeZoneWarp();
    });

    this.input.on('navigate', (dir) => {
      if (this.battle.active) {
        this.battle.moveSelectionCursor?.(dir);
      }
    });

    this.input.on('moveSlot', (slot) => {
      if (this.battle.active) {
        this.battle.selectMoveBySlot?.(slot);
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
    if (typeof this.encounterResolver === 'function') {
      const resolve = this.encounterResolver;
      this.encounterResolver = null;
      resolve();
    }
    if (this.encounterFlashEl) {
      this.encounterFlashEl.hidden = true;
      this.encounterFlashEl.dataset.mode = 'wild';
    }
  }

  clearCelebration() {
    if (this.celebrationTimer !== null) {
      clearTimeout(this.celebrationTimer);
      this.celebrationTimer = null;
    }
    if (this.celebrationLayerEl) {
      this.celebrationLayerEl.hidden = true;
      this.celebrationLayerEl.innerHTML = '';
    }
  }

  triggerCelebration({ icon = '✨', title = 'CELEBRATION!', subtitle = '', tone = 'gold', durationMs = 2400 } = {}) {
    const layer = this.celebrationLayerEl;
    if (!layer) return;

    if (this.celebrationTimer !== null) {
      clearTimeout(this.celebrationTimer);
      this.celebrationTimer = null;
    }

    layer.dataset.tone = tone || 'gold';
    layer.innerHTML = '';

    const palettes = {
      gold: ['#fde047', '#f59e0b', '#38bdf8', '#f472b6', '#ffffff'],
      quest: ['#4ade80', '#fde047', '#38bdf8', '#a78bfa', '#ffffff'],
      heal: ['#f472b6', '#fbcfe8', '#fde047', '#38bdf8', '#ffffff'],
      starlight: ['#38bdf8', '#c084fc', '#fde047', '#67e8f9', '#ffffff'],
      arcade: ['#38bdf8', '#f472b6', '#fde047', '#a78bfa', '#4ade80'],
      badge: ['#fde047', '#fbbf24', '#c084fc', '#38bdf8', '#ffffff'],
      shrine: ['#a78bfa', '#2dd4bf', '#fde047', '#38bdf8', '#ffffff'],
    };
    const colors = palettes[tone] || palettes.gold;

    for (let i = 0; i < 26; i++) {
      const conf = document.createElement('span');
      conf.className = `celebration-confetti${i % 3 === 0 ? ' is-star' : ''}`;
      const angle = (Math.PI * 2 * i) / 26 + ((i % 2) * 0.14);
      const dist = 70 + (i % 5) * 34;
      conf.style.setProperty('--dx', `${Math.round(Math.cos(angle) * dist)}px`);
      conf.style.setProperty('--dy', `${Math.round(Math.sin(angle) * dist - 28)}px`);
      conf.style.setProperty('--rot', `${160 + (i * 37) % 240}deg`);
      conf.style.setProperty('--confetti-delay', `${(i % 6) * 28}ms`);
      conf.style.setProperty('--confetti-color', colors[i % colors.length]);
      layer.appendChild(conf);
    }

    const ribbon = document.createElement('div');
    ribbon.className = 'celebration-ribbon';
    const iconSpan = document.createElement('span');
    iconSpan.className = 'celebration-ribbon-icon';
    iconSpan.textContent = icon || '✨';
    const copy = document.createElement('div');
    copy.className = 'celebration-ribbon-copy';
    const titleEl = document.createElement('strong');
    titleEl.textContent = title || 'CELEBRATION!';
    copy.appendChild(titleEl);
    if (subtitle) {
      const subEl = document.createElement('span');
      subEl.textContent = subtitle;
      copy.appendChild(subEl);
    }
    ribbon.appendChild(iconSpan);
    ribbon.appendChild(copy);
    layer.appendChild(ribbon);

    layer.hidden = false;
    this.celebrationTimer = setTimeout(() => {
      this.celebrationTimer = null;
      if (this.celebrationLayerEl) {
        this.celebrationLayerEl.hidden = true;
        this.celebrationLayerEl.innerHTML = '';
      }
    }, Math.max(800, Number(durationMs) || 2400));
  }

  showBootScreen() {
    this.cancelEncounterTransition();
    this.cancelWarpTransition();
    this.clearCelebration();
    this.badgeQueue = [];
    this.badgeShowing = false;
    clearTimeout(this.badgeToastTimer);
    if (this.badgeToastEl) this.badgeToastEl.hidden = true;
    this._pendingShrineData = null;
    this._preBattleShrineTrialCount = null;
    if (this.battle?.active) {
      this.battle.stop({ outcome: 'escaped', faintedAll: false });
    }
    this.pokedex?.close?.();
    this.minigame?.close?.();
    if (this.isSettingsOpen()) {
      this.settingsModalEl.hidden = true;
    }
    this._starterFallbackStyle = null;
    this._starterFallbackAcc = null;
    this._starterFallbackAura = null;
    this.input.clearAll();
    this.overworld.setActive(false);
    if (this.hudArcadeBtn) {
      this.hudArcadeBtn.hidden = true;
      this.hudArcadeBtn.removeAttribute('data-charges');
      this.hudArcadeBtn.classList.remove('is-depleted');
    }
    this.bootScreenEl.hidden = false;
    this.starterScreenEl.hidden = true;
    this.gameShellEl.hidden = true;
    this.closeDialogue();
    this.syncControlVisibility();
    this.syncInstallBanner();
    this.updateCompassHud();
    this.syncWarpDock();

    drawTrainerPortrait(document.getElementById('portrait-violet'), 'violet', storage.getProfile('violet')?.appearance);
    drawTrainerPortrait(document.getElementById('portrait-ozias'), 'ozias', storage.getProfile('ozias')?.appearance);

    const vSum = storage.getProfileSummary('violet');
    const oSum = storage.getProfileSummary('ozias');
    document.getElementById('summary-violet').textContent = vSum.label;
    document.getElementById('summary-ozias').textContent = oSum.label;

    audio.playBGM('title');
  }

  selectTrainer(trainerId) {
    this.cancelWarpTransition();
    this._starterFallbackStyle = null;
    this._starterFallbackAcc = null;
    this._starterFallbackAura = null;
    storage.selectTrainer(trainerId);
    const profile = storage.getActiveProfile();
    this.applyTrainerTheme(trainerId, profile?.appearance);
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
    this.syncWarpDock();

    this.starterGreetingEl.textContent = `Welcome, ${trainer.name}! Choose your first partner Pokémon!`;
    this.renderStarterStyleBar(trainerId);
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

  renderStarterStyleBar(trainerId) {
    const bar = this.starterStyleBarEl || document.getElementById('starter-style-bar');
    if (!bar) return;

    const profile = storage.getProfile?.(trainerId) || storage.getActiveProfile();
    const appearance = profile?.appearance || { styleId: 'default', accessory: 'cap', cape: false, aura: 'none' };
    const { stylesMap, accMap, aurasMap } = getTrainerAppearanceOptions();
    const styles = Object.values(stylesMap);
    const accessories = Object.values(accMap);
    const auras = Object.values(aurasMap);

    const rawStyleId = this._starterFallbackStyle ?? appearance.styleId ?? 'default';
    const currentStyleId = stylesMap[rawStyleId] ? rawStyleId : (styles[0]?.id || 'default');
    const rawAccId = this._starterFallbackAcc ?? appearance.accessory ?? 'cap';
    const currentAccId = accMap[rawAccId] ? rawAccId : (accessories[0]?.id || 'cap');
    const rawAura = this._starterFallbackAura ?? appearance.aura ?? 'none';
    const currentAuraId = aurasMap[rawAura] ? rawAura : 'none';
    const currentStyle = stylesMap[currentStyleId] || styles[0];
    const currentAcc = accMap[currentAccId] || accessories[0];
    const previewLook = {
      ...appearance,
      styleId: currentStyleId,
      accessory: currentAccId,
      aura: currentAuraId,
    };

    bar.innerHTML = '';

    const previewWrap = document.createElement('div');
    previewWrap.className = 'starter-style-preview-wrap';
    previewWrap.dataset.aura = currentAuraId;
    const previewCanvas = document.createElement('canvas');
    previewCanvas.id = 'starter-style-preview';
    previewCanvas.width = 56;
    previewCanvas.height = 56;
    previewCanvas.className = 'starter-style-preview';
    previewWrap.appendChild(previewCanvas);
    bar.appendChild(previewWrap);

    const controls = document.createElement('div');
    controls.className = 'starter-style-controls';

    const topMeta = document.createElement('div');
    topMeta.className = 'starter-style-head';
    const labelEl = document.createElement('span');
    labelEl.className = 'starter-style-label';
    labelEl.innerHTML = `🎨 Look: <strong>${currentStyle?.icon || '✨'} ${currentStyle?.name || 'Signature'}</strong> • ${currentAcc?.icon || '🧢'} ${currentAcc?.name || 'Cap'}`;

    const capeBtn = document.createElement('button');
    capeBtn.id = 'starter-cape-toggle';
    capeBtn.type = 'button';
    capeBtn.className = `starter-cape-btn ${appearance.cape ? 'is-active' : ''}`;
    capeBtn.textContent = `🦸 Cape: ${appearance.cape ? 'ON' : 'OFF'}`;
    capeBtn.addEventListener('click', () => {
      const updated = storage.updateAppearance?.({ cape: !appearance.cape }) || { ...previewLook, cape: !appearance.cape };
      const resolved = { ...previewLook, ...updated, styleId: currentStyleId, accessory: currentAccId, aura: currentAuraId, cape: Boolean(updated?.cape) };
      audio.playMenuBlip(740);
      this.applyTrainerTheme(trainerId, resolved);
      this.renderStarterStyleBar(trainerId);
    });

    topMeta.appendChild(labelEl);
    topMeta.appendChild(capeBtn);
    controls.appendChild(topMeta);

    const styleRow = document.createElement('div');
    styleRow.className = 'starter-style-row';
    const styleTag = document.createElement('span');
    styleTag.className = 'starter-row-tag';
    styleTag.textContent = 'Outfit';
    styleRow.appendChild(styleTag);

    for (const style of styles) {
      const look = (typeof resolveTrainerLook === 'function' && (style.id === 'default' || Config.TRAINER_STYLES?.[style.id]))
        ? resolveTrainerLook(trainerId, { ...previewLook, styleId: style.id })
        : style;
      const primary = look?.outfitPrimary || style.outfitPrimary || '#a855f7';
      const secondary = look?.outfitSecondary || style.outfitSecondary || '#f472b6';
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.dataset.starterStyleId = style.id;
      chip.className = `starter-style-chip ${currentStyleId === style.id ? 'is-active' : ''}`;
      chip.title = style.name;
      chip.setAttribute('aria-label', style.name);
      chip.innerHTML = `
        <span class="style-swatch-pair" aria-hidden="true">
          <span class="style-swatch" style="background:${primary}"></span>
          <span class="style-swatch" style="background:${secondary}"></span>
        </span>
        <span class="starter-chip-icon">${style.icon || '✨'}</span>
      `;
      chip.addEventListener('click', () => {
        const updated = storage.updateAppearance?.({ styleId: style.id }) || { ...previewLook, styleId: style.id };
        this._starterFallbackStyle = updated?.styleId !== style.id ? style.id : null;
        const resolved = { ...previewLook, ...updated, styleId: style.id };
        audio.playMenuBlip(720);
        this.applyTrainerTheme(trainerId, resolved);
        this.renderStarterStyleBar(trainerId);
      });
      styleRow.appendChild(chip);
    }
    controls.appendChild(styleRow);

    const gearRow = document.createElement('div');
    gearRow.className = 'starter-style-row';
    const accTag = document.createElement('span');
    accTag.className = 'starter-row-tag';
    accTag.textContent = 'Gear';
    gearRow.appendChild(accTag);

    for (const acc of accessories) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.dataset.starterAccId = acc.id;
      chip.className = `starter-acc-chip ${currentAccId === acc.id ? 'is-active' : ''}`;
      chip.title = acc.name;
      chip.setAttribute('aria-label', acc.name);
      chip.textContent = acc.icon || '🧢';
      chip.addEventListener('click', () => {
        const updated = storage.updateAppearance?.({ accessory: acc.id }) || { ...previewLook, accessory: acc.id };
        this._starterFallbackAcc = updated?.accessory !== acc.id ? acc.id : null;
        const resolved = { ...previewLook, ...updated, accessory: acc.id };
        audio.playMenuBlip(740);
        this.applyTrainerTheme(trainerId, resolved);
        this.renderStarterStyleBar(trainerId);
      });
      gearRow.appendChild(chip);
    }
    controls.appendChild(gearRow);

    const auraRow = document.createElement('div');
    auraRow.className = 'starter-style-row';
    const auraDivider = document.createElement('span');
    auraDivider.className = 'starter-row-tag';
    auraDivider.textContent = 'Aura';
    auraRow.appendChild(auraDivider);

    for (const aura of auras) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.dataset.starterAuraId = aura.id;
      chip.className = `starter-aura-chip ${currentAuraId === aura.id ? 'is-active' : ''}`;
      chip.title = aura.name;
      chip.setAttribute('aria-label', aura.name);
      chip.textContent = aura.icon || '✨';
      chip.addEventListener('click', () => {
        const updated = storage.updateAppearance?.({ aura: aura.id }) || { ...previewLook, aura: aura.id };
        this._starterFallbackAura = updated?.aura !== aura.id ? aura.id : null;
        const resolved = { ...previewLook, ...updated, aura: aura.id };
        audio.playMenuBlip(760);
        this.applyTrainerTheme(trainerId, resolved);
        this.renderStarterStyleBar(trainerId);
      });
      auraRow.appendChild(chip);
    }

    controls.appendChild(auraRow);
    bar.appendChild(controls);
    drawTrainerPortrait(previewCanvas, trainerId, previewLook);
  }

  enterOverworld(isBrandNew) {
    const profile = storage.getActiveProfile();
    if (!profile) return;

    storage.syncPokedex?.(profile, false);

    this.bootScreenEl.hidden = true;
    this.starterScreenEl.hidden = true;
    this.gameShellEl.hidden = false;

    this.applyTrainerTheme(profile.trainerId, profile.appearance);
    drawTrainerPortrait(this.hudPortraitEl, profile.trainerId, profile.appearance);
    this.hudTrainerNameEl.textContent = TRAINERS[profile.trainerId]?.name || 'Trainer';
    this.refreshHud();

    this.overworld.setActive(true);
    this.syncControlVisibility();
    this.syncOverworldPause();

    const startBiome = getBiomeAt(profile.pos.x, profile.pos.y);
    const startTheme = startBiome && THEMES[startBiome.id] ? startBiome.id : 'overworld';
    audio.playBGM(startTheme);
    this.updateCompassHud();
    this.syncWarpDock();

    if (isBrandNew) {
      const lead = profile.team[0];
      const trainerName = TRAINERS[profile.trainerId]?.name || 'Trainer';
      this.openDialogue(
        `${trainerName} & ${lead?.displayName || lead?.name || 'Partner'} set out from Starlight Village! Follow the Starlight Compass across Whispering Forest, Crystal Cavern, Sapphire Lagoon, Ember Caldera, Starfall Peak, Celestial Grove, Sunstone Dunes, Glowspore Bayou, Astral Sky Citadel, Thundersteppe Canyon, Abyssal Pearl Trench, Chrono Relic Ruins, Mythic Starlight Rift, Pixie Faeveldt Glade, Sunburst Alola Atoll, Iron Crown Highlands, and Terastal Crystal Crater!`
      );
    }
  }

  refreshHud() {
    const profile = storage.getActiveProfile();
    if (!profile) return;

    storage.syncPokedex?.(profile, false);

    this.applyTrainerTheme(profile.trainerId, profile.appearance);
    drawTrainerPortrait(this.hudPortraitEl, profile.trainerId, profile.appearance);
    if (this.hudTrainerNameEl) {
      this.hudTrainerNameEl.textContent = TRAINERS[profile.trainerId]?.name || 'Trainer';
    }
    if (this.hudPlayerLevelEl) {
      const prog = getPlayerProgressionSafe(profile, storage);
      this.hudPlayerLevelEl.textContent = `Lv.${prog.level}`;
      this.hudPlayerLevelEl.title = prog.isMaxLevel
        ? `Player Level ${prog.level} (Max • ${prog.xp} XP)`
        : `Player Level ${prog.level} (${prog.xpIntoLevel}/${prog.xpToNext} XP to Lv.${prog.level + 1})`;
    }

    const lead = profile.team[0];
    if (lead) {
      this.hudLeadLabelEl.textContent = `Lv.${lead.level} ${lead.isShiny ? '✨ ' : ''}${lead.displayName || lead.name}`;
      const pct = Math.max(0, Math.min(100, Math.round((lead.hp / Math.max(1, lead.maxHp)) * 100)));
      this.hudLeadHpEl.style.width = `${pct}%`;
      this.hudLeadHpEl.style.backgroundColor = pct <= 20 ? '#ef4444' : pct <= 50 ? '#f59e0b' : '#10b981';
    }

    const totalSpecies = Object.keys(SPECIES).length;
    const caughtCount = countCaughtSpecies(profile);
    this.hudDexBtn.textContent = `📖 Dex ${caughtCount}/${totalSpecies}`;
    this.hudBadgesBtn.textContent = `🏅 ${profile.badges.length}/${BADGES.length}`;

    const evoReady = hasAnyReadyEvolutionSafe(profile, storage);
    this.hudDexBtn?.classList.toggle('has-evo-ready', evoReady);
    if (this.hudDexBtn) {
      this.hudDexBtn.title = evoReady
        ? 'Open Pokédex & Team (P) — ✨ Evolution Ready!'
        : 'Open Pokédex & Team (P)';
    }

    const arcadeState = typeof storage.getArcadeState === 'function'
      ? storage.getArcadeState(profile)
      : {
          unlocked: Boolean(storage.isArcadeUnlocked?.(profile) ?? profile?.arcade?.unlocked),
          charges: Number(profile?.arcade?.charges) || 0,
          maxCharges: 3,
        };
    if (this.hudArcadeBtn) {
      this.hudArcadeBtn.hidden = !arcadeState.unlocked;
      this.hudArcadeBtn.textContent = '🕹️';
      if (arcadeState.unlocked) {
        this.hudArcadeBtn.dataset.charges = String(arcadeState.charges);
        this.hudArcadeBtn.classList.toggle('is-depleted', arcadeState.charges <= 0);
        this.hudArcadeBtn.title = arcadeState.charges > 0
          ? `Play Starlight Sky-Hop Arcade (${arcadeState.charges}/${arcadeState.maxCharges} 🎟️)`
          : `Starlight Sky-Hop Arcade (0/${arcadeState.maxCharges} 🎟️ — walk, battle, or spend ✨ to recharge)`;
      } else {
        this.hudArcadeBtn.removeAttribute('data-charges');
        this.hudArcadeBtn.classList.remove('is-depleted');
        this.hudArcadeBtn.title = 'Play Starlight Sky-Hop Arcade';
      }
    }

    this.overworld?.syncFollower?.();
    this.updateCompassHud();
    this.syncWarpDock();
  }

  isWarpDockHidden() {
    return Boolean(
      !storage.getActiveProfile() ||
      !this.bootScreenEl?.hidden ||
      !this.starterScreenEl?.hidden ||
      this.gameShellEl?.hidden ||
      this.battle?.active ||
      this.encounterTransitioning ||
      (this.battle?.screenEl && !this.battle.screenEl.hidden) ||
      this.pokedex?.isOpen() ||
      this.isSettingsOpen() ||
      this.minigame?.isOpen()
    );
  }

  canTriggerZoneWarp() {
    return Boolean(
      !this.isWarpDockHidden() &&
      !this.dialogueOpen &&
      (!this.worldDialogueEl || this.worldDialogueEl.hidden) &&
      !this.warpTransitioning
    );
  }

  getRecommendedWarpTarget(profile = storage.getActiveProfile()) {
    const zone = getRecommendedFarmingZoneSafe(profile);
    const playerLevel = zone.playerLevel ?? zone.partyLevel ?? 1;
    return {
      biomeId: zone.biomeId,
      biome: zone.biome,
      playerLevel,
      partyLevel: playerLevel,
      minLv: zone.minLv,
      maxLv: zone.maxLv,
      x: zone.x,
      y: zone.y,
      dir: zone.dir,
    };
  }

  getSafeZoneTarget() {
    const fallback = {
      biomeId: 'village',
      biome: BIOMES.village,
      x: GAME_META.spawn?.x ?? 8,
      y: GAME_META.spawn?.y ?? 15,
      dir: GAME_META.spawn?.dir || 'down',
    };
    const pt = Config.getSafeZoneWarpPoint?.();
    if (!pt || typeof pt !== 'object') return fallback;
    return {
      biomeId: pt.biomeId || 'village',
      biome: pt.biome || BIOMES.village,
      x: Number.isFinite(pt.x) ? pt.x : fallback.x,
      y: Number.isFinite(pt.y) ? pt.y : fallback.y,
      dir: pt.dir || fallback.dir,
    };
  }

  syncWarpDock() {
    if (!this.warpDockEl) return;
    const hidden = this.isWarpDockHidden();
    if (this.warpDockEl.hidden !== hidden) {
      this.warpDockEl.hidden = hidden;
    }
    if (hidden) return;

    const profile = storage.getActiveProfile();
    if (!profile) return;

    const target = this.getRecommendedWarpTarget(profile);
    const safeTarget = this.getSafeZoneTarget();
    const canWarp = this.canTriggerZoneWarp();
    const disabled = !canWarp;

    const warpText = `Farm • Lv.${target.minLv}–${target.maxLv}`;
    if (this.warpZoneLabelEl && this.warpZoneLabelEl.textContent !== warpText) {
      this.warpZoneLabelEl.textContent = warpText;
    }

    const safeText = 'Safe Zone';
    if (this.warpSafeLabelEl && this.warpSafeLabelEl.textContent !== safeText) {
      this.warpSafeLabelEl.textContent = safeText;
    }

    const syncDockBtn = (btn, titleText) => {
      if (!btn) return;
      if (btn.disabled !== disabled) {
        btn.disabled = disabled;
      }
      if (btn.hasAttribute('aria-disabled') !== disabled) {
        if (disabled) {
          btn.setAttribute('aria-disabled', 'true');
        } else {
          btn.removeAttribute('aria-disabled');
        }
      }
      if (btn.title !== titleText) {
        btn.title = titleText;
      }
    };

    syncDockBtn(
      this.warpZoneBtn,
      `Warp to ${target.biome.name} (Lv.${target.minLv}–${target.maxLv} • Player Lv.${target.playerLevel}) [T]`,
    );
    syncDockBtn(
      this.warpSafeBtn,
      `Return safely to ${safeTarget.biome?.name || 'Starlight Village'} (Healing Fountain) [H]`,
    );
  }

  cancelWarpTransition() {
    this.warpToken += 1;
    if (this.warpTimer !== null) {
      clearTimeout(this.warpTimer);
      this.warpTimer = null;
    }
    if (typeof this.warpResolver === 'function') {
      const resolve = this.warpResolver;
      this.warpResolver = null;
      resolve();
    }
    this.warpTransitioning = false;
    if (this.warpTransitionEl) {
      this.warpTransitionEl.hidden = true;
      delete this.warpTransitionEl.dataset.mode;
    }
  }

  _waitWarpMs(ms) {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => {
      if (this.warpTimer !== null) {
        clearTimeout(this.warpTimer);
        this.warpTimer = null;
      }
      if (typeof this.warpResolver === 'function') {
        const prevResolve = this.warpResolver;
        this.warpResolver = null;
        prevResolve();
      }
      this.warpResolver = resolve;
      this.warpTimer = setTimeout(() => {
        this.warpTimer = null;
        if (this.warpResolver === resolve) {
          this.warpResolver = null;
        }
        resolve();
      }, ms);
    });
  }

  async _executeWarpSequence(options = {}, buildDescriptor) {
    if (!this.canTriggerZoneWarp()) {
      return { warped: false, reason: 'blocked' };
    }
    const profile = storage.getActiveProfile();
    if (!profile) {
      return { warped: false, reason: 'blocked' };
    }

    const descriptor = buildDescriptor(profile);
    const token = ++this.warpToken;
    this.warpTransitioning = true;
    this.input.clearAll();
    this.overworld?.clearTouchNavigation?.();
    this.blurFocusedControl();
    this.syncControlVisibility();
    this.syncOverworldPause();

    try {
      descriptor.playAudio();
      this.overworld?.triggerWarpEffect?.('depart', profile.pos?.x, profile.pos?.y, { tone: descriptor.effectTone });

      if (this.warpCalloutEl) {
        this.warpCalloutEl.textContent = descriptor.calloutText;
      }
      if (this.warpTransitionEl) {
        this.warpTransitionEl.dataset.mode = descriptor.transitionMode;
        this.warpTransitionEl.hidden = false;
      }

      await this._waitWarpMs(options?.instant ? 0 : 180);
      if (token !== this.warpToken || !storage.getActiveProfile()) {
        return { warped: false, reason: 'cancelled' };
      }

      const warpRes = descriptor.persistWarp();
      const landedPos = warpRes?.pos || descriptor.fallbackPos;
      if (warpRes?.newBadges?.length) {
        this.showBadgeToast(warpRes.newBadges);
      }

      if (typeof this.overworld?.warpToPosition === 'function') {
        this.overworld.warpToPosition(landedPos.x, landedPos.y, landedPos.dir, {
          announceBiome: false,
          tone: descriptor.effectTone,
        });
      } else {
        this.overworld?.syncFromProfile?.();
      }

      audio.playBGM(descriptor.bgmTheme);
      this.handleBiomeChange(descriptor.biome, true);
      this.triggerCelebration(descriptor.celebration);

      await this._waitWarpMs(options?.instant ? 0 : 200);
      if (token !== this.warpToken) {
        return { warped: false, reason: 'cancelled' };
      }

      if (this.warpTransitionEl) {
        this.warpTransitionEl.hidden = true;
        delete this.warpTransitionEl.dataset.mode;
      }
      this.warpTransitioning = false;
      this.refreshHud();
      this.syncControlVisibility();
      this.syncOverworldPause();
      this.syncWarpDock();

      return descriptor.buildResult(landedPos);
    } finally {
      if (token === this.warpToken) {
        this.warpTransitioning = false;
        if (this.warpTransitionEl) {
          this.warpTransitionEl.hidden = true;
          delete this.warpTransitionEl.dataset.mode;
        }
        this.syncControlVisibility();
        this.syncOverworldPause();
      }
    }
  }

  async triggerLevelZoneWarp(options = {}) {
    return this._executeWarpSequence(options, (profile) => {
      const target = this.getRecommendedWarpTarget(profile);
      const safePos = Config.findNearestSafePosition?.(target.x, target.y, target.dir)
        || { x: target.x, y: target.y, dir: target.dir || 'down' };

      return {
        transitionMode: 'farm',
        effectTone: 'starlight',
        calloutText: `🌟 Warping to ${target.biome.icon} ${target.biome.name} (Lv.${target.minLv}–${target.maxLv})!`,
        fallbackPos: safePos,
        biome: target.biome,
        bgmTheme: THEMES[target.biomeId] ? target.biomeId : 'overworld',
        celebration: {
          icon: target.biome.icon || '🌟',
          title: 'STARLIGHT WARP!',
          subtitle: `${target.biome.name} • Lv.${target.minLv}–${target.maxLv} Farming Zone`,
          tone: 'starlight',
          durationMs: 2200,
        },
        playAudio() {
          if (typeof audio.playWarpTeleport === 'function') {
            audio.playWarpTeleport({ phase: 'full' });
          } else {
            audio.playMenuBlip?.(880);
          }
        },
        persistWarp() {
          if (typeof storage.warpToZone === 'function') {
            return storage.warpToZone(safePos.x, safePos.y, safePos.dir, target.biomeId);
          }
          storage.updatePosition(safePos.x, safePos.y, safePos.dir, false);
          storage.recordBiomeVisited?.(target.biomeId);
          const newBadges = storage.evaluateBadges?.(false) || [];
          storage.save?.();
          return { warped: true, pos: { ...safePos }, biomeId: target.biomeId, newBadges };
        },
        buildResult: (landedPos) => ({
          warped: true,
          mode: 'farm',
          biomeId: target.biomeId,
          biomeName: target.biome.name,
          playerLevel: target.playerLevel,
          partyLevel: target.playerLevel,
          minLv: target.minLv,
          maxLv: target.maxLv,
          x: landedPos.x,
          y: landedPos.y,
          dir: landedPos.dir,
        }),
      };
    });
  }

  async triggerSafeZoneWarp(options = {}) {
    return this._executeWarpSequence(options, () => {
      const target = this.getSafeZoneTarget();
      const safePos = Config.findNearestSafePosition?.(target.x, target.y, target.dir)
        || { x: target.x, y: target.y, dir: target.dir || 'down' };
      const safeBiome = target.biome || BIOMES.village;

      return {
        transitionMode: 'safe',
        effectTone: 'safe',
        calloutText: '🏡 Returning to Starlight Village Safe Zone!',
        fallbackPos: safePos,
        biome: safeBiome,
        bgmTheme: THEMES.village ? 'village' : 'overworld',
        celebration: {
          icon: '🏡',
          title: 'SAFE ZONE RECALL!',
          subtitle: 'Starlight Village • Healing Fountain Nearby',
          tone: 'heal',
          durationMs: 2200,
        },
        playAudio() {
          if (typeof audio.playSafeRecall === 'function') {
            audio.playSafeRecall({ phase: 'full' });
          } else if (typeof audio.playWarpTeleport === 'function') {
            audio.playWarpTeleport({ phase: 'full', mode: 'safe' });
          } else if (typeof audio.playHealChime === 'function') {
            audio.playHealChime();
          } else {
            audio.playMenuBlip?.(740);
          }
        },
        persistWarp() {
          if (typeof storage.warpToSafeZone === 'function') {
            return storage.warpToSafeZone();
          }
          if (typeof storage.warpToZone === 'function') {
            return storage.warpToZone(safePos.x, safePos.y, safePos.dir, 'village');
          }
          storage.updatePosition(safePos.x, safePos.y, safePos.dir, false);
          storage.recordBiomeVisited?.('village');
          const newBadges = storage.evaluateBadges?.(false) || [];
          storage.save?.();
          return { warped: true, pos: { ...safePos }, biomeId: 'village', newBadges };
        },
        buildResult: (landedPos) => ({
          warped: true,
          mode: 'safe',
          biomeId: 'village',
          biomeName: safeBiome?.name || 'Starlight Village',
          x: landedPos.x,
          y: landedPos.y,
          dir: landedPos.dir,
        }),
      };
    });
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
      this.minigame?.isOpen() ||
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
    const scaled = getBiomeScaledInfo(currentBiome, profile);

    this.compassHudEl.dataset.threat = scaled.threatTone || 'balanced';
    this.compassHudEl.title = scaled.isSafe
      ? `Tap to open Island Guide — ${currentBiome.name} (Safe Zone)`
      : `Tap to open Island Guide — ${currentBiome.name}: Lv.${scaled.minLv}–${scaled.maxLv} (${scaled.threatLabel})`;

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
        const rangePart = !scaled.isSafe ? ` • Lv.${scaled.minLv}-${scaled.maxLv} ${scaled.threatLabel}` : '';
        const chestPart = stats.chestsTotal > 0 ? ` • 📦${stats.chestsOpened}/${stats.chestsTotal}` : '';
        const hasShrine = Object.values(SHRINES).some((s) => s.biome === currentBiome.id);
        const shrinePart = hasShrine ? ` • ${stats.shrineCleared ? '⛩️✓' : '⛩️Open'}` : '';
        this.compassSubEl.textContent = `${currentBiome.icon} Dex ${stats.caught}/${stats.totalSpecies}${rangePart}${chestPart}${shrinePart}`;
      } else {
        this.compassSubEl.textContent = `${currentBiome?.icon || '🏡'} Safe Zone • Dex ${totalCaught}/${totalSpecies} • Shrines ${profile.shrinesCleared.length}/${totalShrines}`;
      }
    }
  }

  syncOverworldPause(options = {}) {
    let syncOptions = options;
    if (this.worldDialogueEl && this.worldDialogueEl.hidden && this.dialogueOpen) {
      this.dialogueOpen = false;
      syncOptions = { ...options, skipWarpDock: false };
    }
    this.syncControlVisibility(syncOptions);
    this.updateCompassVisibility();
    const paused = (
      this.dialogueOpen ||
      this.encounterTransitioning ||
      this.warpTransitioning ||
      this.battle.active ||
      this.pokedex.isOpen() ||
      this.minigame?.isOpen() ||
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
    const profile = storage.getActiveProfile();
    const scaled = getBiomeScaledInfo(biome, profile);
    this.biomeBannerEl.dataset.threat = scaled.threatTone || 'balanced';
    this.biomeBannerEl.textContent = scaled.isSafe
      ? `${biome.icon} ${biome.name}`
      : `${biome.icon} ${biome.name} • Lv.${scaled.minLv}–${scaled.maxLv} (${scaled.threatLabel})`;
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
    const toCount = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : 0);
    const potions = toCount(rewards.potions);
    const greatBalls = toCount(rewards.greatBalls);
    const starBalls = toCount(rewards.starBalls);
    const starShards = toCount(rewards.starShards);
    const cheerCharges = toCount(rewards.cheerCharges);
    if (potions > 0) parts.push(`+${potions} Berry Potion${potions > 1 ? 's' : ''}`);
    if (greatBalls > 0) parts.push(`+${greatBalls} Great Ball${greatBalls > 1 ? 's' : ''}`);
    if (starBalls > 0) parts.push(`+${starBalls} Star Ball${starBalls > 1 ? 's' : ''}`);
    if (starShards > 0) parts.push(`+${starShards} ✨ Star Shard${starShards > 1 ? 's' : ''}`);
    if (cheerCharges > 0) parts.push(`+${cheerCharges} 💖 Cheer Heart${cheerCharges > 1 ? 's' : ''}`);
    if (rewards.gems && typeof rewards.gems === 'object') {
      const fallbackGems = {
        prism_gem: { icon: '💠', name: 'Prism Gem' },
        chrono_gem: { icon: '⏳', name: 'Chrono Amber' },
        nebula_gem: { icon: '☄️', name: 'Nebula Core' },
        pixie_gem: { icon: '🎀', name: 'Pixie Ribbon Gem' },
        alola_gem: { icon: '🌺', name: 'Island Kahuna Shell' },
        crown_gem: { icon: '🛡️', name: 'Sovereign Crest' },
        tera_gem: { icon: '💎', name: 'Terastal Shard' },
      };
      for (const [gemId, rawCount] of Object.entries(rewards.gems)) {
        const count = toCount(rawCount);
        if (count > 0) {
          const item = EVOLUTION_ITEMS?.[gemId] || fallbackGems[gemId];
          parts.push(`+${count} ${item?.icon || '💎'} ${item?.name || gemId}`);
        }
      }
    }
    return parts.join(', ');
  }

  _resolveTargetCoords(target, profile) {
    const parts = String(target?.key || '').split(',').map((v) => Number(v));
    if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
      return { tx: parts[0], ty: parts[1] };
    }
    return {
      tx: Number(profile?.pos?.x) || 8,
      ty: Number(profile?.pos?.y) || 15,
    };
  }

  handleNpcInteract(npc, target = null) {
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
        if (typeof audio.playQuestCompleteFanfare === 'function') {
          audio.playQuestCompleteFanfare();
        } else {
          audio.playLevelUp?.();
        }
        const { tx, ty } = this._resolveTargetCoords(target, profile);
        this.overworld?.triggerCelebrationBurst?.(tx, ty, 'quest');
        this.overworld.refreshInteractHint();
        this.refreshHud();
        const rewardText = this.formatRewardSummary(quest.rewards);
        this.triggerCelebration({
          icon: '📜',
          title: `QUEST COMPLETE: ${quest.title}!`,
          subtitle: rewardText || 'Reward Earned!',
          tone: 'quest',
        });
        if (res?.newBadges?.length) {
          this.showBadgeToast(res.newBadges);
        }
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

  handleDiscoveryNode(node = {}) {
    if (this.battle?.active || this.encounterTransitioning) return;
    const profile = storage.getActiveProfile();
    if (!profile) return;

    if (typeof storage.addStarShards === 'function') {
      storage.addStarShards(2);
    } else {
      storage.addRewards({ starShards: 2 });
    }

    if (typeof audio.playArcadeStar === 'function') {
      audio.playArcadeStar(3);
    } else if (typeof audio.playChestFanfare === 'function') {
      audio.playChestFanfare();
    } else {
      audio.playLevelUp?.();
    }

    const tx = Number.isFinite(Number(node?.x)) ? Number(node.x) : profile.pos.x;
    const ty = Number.isFinite(Number(node?.y)) ? Number(node.y) : profile.pos.y;
    this.overworld?.triggerCelebrationBurst?.(tx, ty, 'starlight');
    this.triggerCelebration({
      icon: '☄️',
      title: 'STARFALL DISCOVERY!',
      subtitle: '+2 ✨ Star Shards gathered!',
      tone: 'starlight',
    });
    this.refreshHud();
    this.openDialogue('☄️ A radiant Starfall Crystal shimmered in the wild! You collected +2 ✨ Star Shards!');
  }

  handleWorldInteract(target) {
    if (!target) return;
    audio.playMenuBlip(700);
    const profile = storage.getActiveProfile();
    const { tx, ty } = this._resolveTargetCoords(target, profile);

    if (target.type === 'sign') {
      this.openDialogue(target.data);
    } else if (target.type === 'heal') {
      this.handleHealSpot(true);
    } else if (target.type === 'chest') {
      const chest = target.data;
      if (storage.markChestOpened(chest.id)) {
        if (typeof audio.playChestFanfare === 'function') {
          audio.playChestFanfare();
        } else {
          audio.playLevelUp?.();
        }
        storage.addRewards(chest.rewards);
        this.overworld.refreshInteractHint();
        this.refreshHud();
        this.overworld?.triggerCelebrationBurst?.(tx, ty, 'gold');
        this.triggerCelebration({
          icon: '💎',
          title: 'TREASURE FOUND!',
          subtitle: this.formatRewardSummary(chest.rewards) || chest.label || 'Starlight Treasure!',
          tone: 'gold',
        });
        this.openDialogue(chest.message);
      } else {
        this.openDialogue('This treasure chest has already been opened!');
      }
    } else if (target.type === 'shrine') {
      const shrine = target.data;
      if (profile?.shrinesCleared.includes(shrine.id)) {
        this.startShrineEncounter(shrine, { isTrial: true });
      } else {
        this.startShrineEncounter(shrine, { isTrial: false });
      }
    } else if (target.type === 'rival') {
      this.startRivalEncounter(target.data);
    } else if (target.type === 'npc') {
      this.handleNpcInteract(target.data, target);
    } else if (target.type === 'arcade') {
      const unlocked = Boolean(storage.isArcadeUnlocked?.(profile));
      if (unlocked) {
        this.openMinigame();
        return;
      }
      const knockRes = storage.recordSecretKnock?.() || {
        knocks: 0,
        attuned: false,
        unlocked: false,
        justUnlocked: false,
      };
      if (!knockRes.attuned) {
        this.openDialogue('🔍 A faint star-shaped seam is etched into the cottage wall... Tiny runes whisper: "Earn 1 Island Badge or register 5 Pokédex species to attune your Starlight, then return and knock three times!"');
      } else if (knockRes.unlocked || knockRes.justUnlocked) {
        this.overworld?.triggerCelebrationBurst?.(tx, ty, 'arcade');
        this.overworld?.refreshInteractHint?.();
        this.triggerCelebration({
          icon: '🕹️',
          title: 'SECRET ARCADE UNLOCKED!',
          subtitle: 'Starlight Sky-Hop revealed! 3/3 🎟️ Charges ready!',
          tone: 'arcade',
        });
        if (typeof audio.playArcadeUnlockFanfare === 'function') {
          audio.playArcadeUnlockFanfare();
        } else {
          audio.playBadgeFanfare?.();
        }
        this.refreshHud();
        this.openMinigame();
      } else if (knockRes.knocks === 1) {
        this.openDialogue('🕹️ *Tap-tap!* Your Starlight resonates behind the hidden cottage panel! A secret latch clicks... (Secret Knock 1/3 — Knock twice more!)');
      } else {
        this.openDialogue(`🕹️ *Spark-chime!* Constellations shimmer along the wall seam! One more knock to open the secret cabinet... (Secret Knock ${knockRes.knocks}/3!)`);
      }
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
    const anyLowPp = profile.team.some((m) => {
      const moves = typeof m.getMoveObjects === 'function' ? m.getMoveObjects() : [];
      return moves.some((mv) => {
        const pp = m.getMovePp?.(mv.id);
        return pp && pp.current < pp.max;
      });
    });
    const anyInjured = profile.team.some((m) => m.hp < m.maxHp) || anyLowPp || profile.bag.potions < 5;
    if (!anyInjured && !explicitInteract) return;

    storage.healTeam(true);
    this.refreshHud();
    audio.playHealChime();
    this.overworld?.triggerCelebrationBurst?.(profile.pos.x, profile.pos.y, 'heal');
    this.triggerCelebration({
      icon: '💖',
      title: 'TEAM RESTORED!',
      subtitle: 'Full HP, PP & Berry Potions refilled!',
      tone: 'heal',
      durationMs: 1800,
    });
    this.openDialogue('✨ Starlight Fountain restored your whole team to full HP & PP and refilled Berry Potions!');
  }

  getAverageTeamLevel() {
    const profile = storage.getActiveProfile();
    if (!profile || profile.team.length === 0) return 5;
    const sum = profile.team.reduce((acc, m) => acc + m.level, 0);
    return sum / profile.team.length;
  }

  async triggerEncounterTransition(bgmTheme = 'battle', meta = {}) {
    const token = ++this.encounterToken;
    this.encounterTransitioning = true;
    this._starterFallbackStyle = null;
    this._starterFallbackAcc = null;
    this._starterFallbackAura = null;
    this.input.clearAll();
    this.overworld?.clearTouchNavigation?.();
    this.syncControlVisibility();
    this.syncOverworldPause();
    audio.stopBGM();
    audio.playEncounterAlert();

    const mode = ['wild', 'rare', 'rival', 'shrine'].includes(meta?.mode)
      ? meta.mode
      : (bgmTheme === 'shrine' || meta?.isShrine)
        ? 'shrine'
        : (bgmTheme === 'rival' || meta?.isTrainer)
          ? 'rival'
          : (meta?.isRarePatch || meta?.isShiny || meta?.isElite)
            ? 'rare'
            : 'wild';
    const modeLabels = {
      wild: '⚡ WILD ENCOUNTER!',
      rare: '✨ SHIMMER ENCOUNTER!',
      rival: '⚔️ RIVAL DUEL!',
      shrine: '⛩️ SHRINE GUARDIAN!',
    };

    try {
      if (this.encounterFlashEl) {
        this.encounterFlashEl.dataset.mode = mode;
        if (this.encounterCalloutEl) {
          this.encounterCalloutEl.textContent = modeLabels[mode] || modeLabels.wild;
        }
        this.encounterFlashEl.hidden = false;
        void this.encounterFlashEl.offsetWidth;
        await new Promise((res) => {
          if (this.encounterTimer !== null) {
            clearTimeout(this.encounterTimer);
          }
          if (typeof this.encounterResolver === 'function') {
            const prevResolve = this.encounterResolver;
            this.encounterResolver = null;
            prevResolve();
          }
          this.encounterResolver = res;
          this.encounterTimer = setTimeout(() => {
            this.encounterTimer = null;
            if (this.encounterResolver === res) {
              this.encounterResolver = null;
            }
            res();
          }, 400);
        });
        this.encounterFlashEl.hidden = true;
      }

      if (token !== this.encounterToken) return false;
      audio.playBGM(THEMES[bgmTheme] ? bgmTheme : 'battle');
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
    const profile = storage.getActiveProfile();
    const avgLevel = this.getAverageTeamLevel();
    const supportsProfileRoll = typeof PokemonMod.getBiomeScaledRange === 'function'
      || typeof PokemonMod.getTrainerPowerLevel === 'function';
    const wild = rollWildPokemon(biomeId, supportsProfileRoll ? (profile || avgLevel) : avgLevel, encounterMeta);
    if (!wild) return;

    const mode = (wild.isShiny || wild.isElite || encounterMeta?.isRarePatch) ? 'rare' : 'wild';
    const ready = await this.triggerEncounterTransition('battle', {
      mode,
      isRarePatch: Boolean(encounterMeta?.isRarePatch),
      isShiny: Boolean(wild.isShiny),
      isElite: Boolean(wild.isElite),
    });
    if (!ready || this.battle.active) return;
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

  async startShrineEncounter(shrine, { isTrial = false } = {}) {
    if (!shrine || this.battle.active || this.encounterTransitioning) return;
    if (!storage.ensureHealthyParty()) return;
    const profile = storage.getActiveProfile();
    const isAstralTrial = Boolean(isTrial || profile?.shrinesCleared?.includes(shrine.id));

    let guardianId = shrine.guardianId;
    let guardianLevel = shrine.level || 10;
    let upgradeTier = 0;
    let isElite = false;
    let shrineData = shrine;

    if (isAstralTrial) {
      const trialSpec = typeof PokemonMod.getScaledShrineTrial === 'function'
        ? (PokemonMod.getScaledShrineTrial(shrine, profile) || {})
        : {};
      guardianId = trialSpec.guardianId ?? shrine.guardianId;
      guardianLevel = Math.max(1, Math.min(50, Number(trialSpec.level ?? (shrine.level + 3)) || 12));
      upgradeTier = Math.max(1, Number(trialSpec.upgradeTier) || 2);
      isElite = trialSpec.isElite ?? true;
      const trialNumber = Math.max(1, Number(trialSpec.trialNumber) || ((profile?.shrineTrialCounts?.[shrine.id] || 0) + 1));
      const guardianName = SPECIES[guardianId]?.name || 'Guardian';
      shrineData = {
        ...shrine,
        isAstralTrial: true,
        trialNumber,
        intro: `⛩️ Astral Shrine Trial #${trialNumber}! Trial Boss ${guardianName} tests your Starlight Mastery!`,
      };
      this._preBattleShrineTrialCount = Number(profile?.shrineTrialCounts?.[shrine.id]) || 0;
    } else {
      const guardSpec = typeof PokemonMod.getScaledShrineGuard === 'function'
        ? (PokemonMod.getScaledShrineGuard(shrine, profile) || {})
        : {};
      guardianId = guardSpec.guardianId ?? shrine.guardianId;
      guardianLevel = Math.max(1, Math.min(50, Number(guardSpec.level ?? shrine.level) || shrine.level || 10));
      upgradeTier = Math.max(0, Number(guardSpec.upgradeTier) || 0);
      this._preBattleShrineTrialCount = null;
    }

    const guardian = createPokemon(guardianId, guardianLevel, shrine.biome, { upgradeTier, isElite });
    this._pendingShrineData = shrineData;
    const ready = await this.triggerEncounterTransition('shrine', {
      mode: 'shrine',
      isShrine: true,
      isAstralTrial,
    });
    if (!ready || this.battle.active) {
      this._pendingShrineData = null;
      this._preBattleShrineTrialCount = null;
      return;
    }
    this.battle.start({
      enemy: guardian,
      biomeId: 'shrine',
      isShrine: true,
      shrineData,
    });
    this.syncControlVisibility();
    this.syncOverworldPause();
    this.updateCompassHud();
  }

  async startRivalEncounter(rivalInput) {
    const rival = typeof rivalInput === 'string'
      ? Object.values(RIVAL_TRAINERS || {}).find((r) => r?.id === rivalInput) || null
      : rivalInput;
    if (!rival || this.battle.active || this.encounterTransitioning) return;
    if (!storage.ensureHealthyParty()) return;

    const profile = storage.getActiveProfile();
    const isRematch = Boolean(profile?.rivalsDefeated?.includes(rival.id));
    const levelBoost = isRematch ? 2 : 0;
    const scaledParty = typeof PokemonMod.getScaledRivalParty === 'function'
      ? PokemonMod.getScaledRivalParty(rival, profile)
      : null;
    const usingScaled = Array.isArray(scaledParty) && scaledParty.length > 0;
    const rawParty = usingScaled
      ? scaledParty
      : (Array.isArray(rival.party) && rival.party.length > 0 ? rival.party : [{ speciesId: 25, level: 6 }]);
    const enemyParty = rawParty
      .map((entry) => {
        const spId = entry.speciesId ?? entry.id;
        const baseLv = Number(entry.level) || 6;
        const lv = Math.min(50, Math.max(1, usingScaled ? baseLv : baseLv + levelBoost));
        const upgradeTier = Math.max(0, Number(entry.upgradeTier) || 0);
        return SPECIES[spId] ? createPokemon(spId, lv, rival.biome || 'forest', { upgradeTier }) : null;
      })
      .filter(Boolean);
    if (enemyParty.length === 0) return;

    const ready = await this.triggerEncounterTransition(THEMES.rival ? 'rival' : 'battle', {
      mode: 'rival',
      isTrainer: true,
    });
    if (!ready || this.battle.active) return;
    this.battle.start({
      enemy: enemyParty[0],
      enemyParty,
      biomeId: rival.biome || 'forest',
      isShrine: false,
      shrineData: null,
      isTrainer: true,
      trainerData: { ...rival, isRematch },
    });
    this.syncControlVisibility();
    this.syncOverworldPause();
    this.updateCompassHud();
  }

  handleBattleEnd(result) {
    const shrineData = result?.shrineData || this._pendingShrineData || null;
    const preTrialCount = this._preBattleShrineTrialCount;
    this._pendingShrineData = null;
    this._preBattleShrineTrialCount = null;
    let pendingDialogue = null;

    if (result?.faintedAll) {
      storage.updatePosition(GAME_META.spawn.x, GAME_META.spawn.y, 'down', false);
      storage.healTeam(true);
      this.overworld.syncFromProfile();
      audio.playHealChime();
      pendingDialogue = 'Professor Willow gently healed your team back at Starlight Village! You are ready to explore again.';
    } else {
      this.overworld.syncFromProfile();
      if (result?.outcome === 'won' && result?.isTrainer && result?.trainerData) {
        const rival = result.trainerData;
        const profileBefore = storage.getActiveProfile();
        const isRematch = Boolean(rival.isRematch || profileBefore?.rivalsDefeated?.includes(rival.id));
        const rewards = (isRematch ? rival.rematchRewards : rival.rewards) || {};
        const winRes = storage.markRivalDefeated?.(rival.id, rewards);
        this.overworld.refreshInteractHint?.();
        if (winRes?.newBadges?.length) {
          this.showBadgeToast(winRes.newBadges);
        }
        const rewardText = this.formatRewardSummary(rewards);
        const winText = (isRematch && rival.rematchWinText)
          ? rival.rematchWinText
          : (rival.winText || rival.defeatText || `${rival.name}: "What an awesome battle!"`);
        pendingDialogue = rewardText
          ? `${winText} [Earned ${rewardText}!]`
          : winText;
      } else if (result?.outcome === 'won' && result?.isShrine && shrineData?.isAstralTrial) {
        const afterCount = Number(storage.getActiveProfile()?.shrineTrialCounts?.[shrineData.id]) || 0;
        const alreadyRecorded = Boolean(
          result?.shrineTrialRecorded ||
          result?.trialRecorded ||
          (preTrialCount !== null && afterCount > preTrialCount),
        );
        if (!alreadyRecorded) {
          if (typeof storage.recordShrineTrialWin === 'function') {
            const trialRes = storage.recordShrineTrialWin(shrineData.id, { starShards: 3, starBalls: 1 });
            if (trialRes?.newBadges?.length) {
              this.showBadgeToast(trialRes.newBadges);
            }
          } else {
            storage.addRewards({ starShards: 3, starBalls: 1 });
          }
        }
        this.triggerCelebration({
          icon: '⛩️',
          title: `ASTRAL TRIAL #${shrineData.trialNumber || 1} CLEARED!`,
          subtitle: '+3 ✨ Star Shards • +1 🌟 Star Ball',
          tone: 'shrine',
        });
        pendingDialogue = `⛩️ Astral Shrine Trial #${shrineData.trialNumber || 1} Victory! Earned +3 ✨ Star Shards & +1 🌟 Star Ball!`;
      }
    }

    const profile = storage.getActiveProfile();
    const bId = profile ? getBiomeAt(profile.pos.x, profile.pos.y).id : 'overworld';
    audio.playBGM(THEMES[bId] ? bId : 'overworld');

    this.refreshHud();
    this.blurFocusedControl();
    this.syncControlVisibility();
    this.syncOverworldPause();

    if (pendingDialogue) {
      this.openDialogue(pendingDialogue);
    }
  }

  showBadgeToast(badges) {
    if (!badges || badges.length === 0 || !this.badgeToastEl) return;
    for (const badge of badges) {
      if (!badge) continue;
      if (!this.badgeQueue.some((queued) => queued.id === badge.id)) {
        this.badgeQueue.push(badge);
      }
    }
    if (!this.badgeShowing) {
      this._showNextBadgeToast();
    }
  }

  _showNextBadgeToast() {
    if (!this.badgeToastEl || this.badgeQueue.length === 0) {
      this.badgeShowing = false;
      if (this.badgeToastEl) this.badgeToastEl.hidden = true;
      return;
    }

    this.badgeShowing = true;
    const badge = this.badgeQueue.shift();
    const remaining = this.badgeQueue.length;
    this.badgeToastIconEl.textContent = badge.icon;
    this.badgeToastNameEl.textContent = badge.name;
    this.badgeToastDescEl.textContent = remaining > 0
      ? `${badge.description} (${remaining} more queued)`
      : badge.description;
    this.badgeToastEl.hidden = false;
    audio.playBadgeFanfare();
    this.triggerCelebration({
      icon: badge.icon || '🏅',
      title: `BADGE UNLOCKED: ${badge.name}!`,
      subtitle: badge.description,
      tone: 'badge',
      durationMs: 2400,
    });

    clearTimeout(this.badgeToastTimer);
    this.badgeToastTimer = setTimeout(() => {
      this._showNextBadgeToast();
    }, 3200);
  }

  openMinigame() {
    if (this.battle?.active || this.encounterTransitioning || this.warpTransitioning) return false;
    if (typeof storage.isArcadeUnlocked === 'function' && !storage.isArcadeUnlocked()) {
      return false;
    }
    if (this.dialogueOpen) this.closeDialogue();
    if (this.pokedex?.isOpen()) this.pokedex.close();
    if (this.isSettingsOpen()) this.closeSettings();
    this.overworld?.clearTouchNavigation?.();
    this.minigame?.open();
    this.syncControlVisibility();
    this.syncOverworldPause();
    return true;
  }

  openPokedex(tab = 'dex') {
    if (this.battle.active || this.encounterTransitioning || this.warpTransitioning) return;
    this.pokedex.open(tab);
    this.syncControlVisibility();
    this.syncOverworldPause();
  }

  isSettingsOpen() {
    return Boolean(this.settingsModalEl && !this.settingsModalEl.hidden);
  }

  openSettings() {
    if (!this.settingsModalEl || this.warpTransitioning) return;
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
      warpTransitioning: this.warpTransitioning,
      battle: this.battle?.getDiagnostics?.() || null,
      audio: this.audio?.getDiagnostics?.() || null,
      minigame: this.minigame?.getDiagnostics?.() || null,
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

    this.syncOverworldPause({ skipWarpDock: true });

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
