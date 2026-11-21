import * as Config from './config.js';
import * as PokemonMod from './pokemon.js';

const FALLBACK_TYPES = {
  normal: { id: 'normal', label: 'Normal', color: '#cbd5e1', bg: '#334155', icon: '⭐' },
};

function getTypesMap() {
  return Config.TYPES || FALLBACK_TYPES;
}

function getMovesMap() {
  return Config.MOVES || {};
}

function getEvolutionItemsMap() {
  return Config.EVOLUTION_ITEMS || {};
}

function computeTypeEffectiveness(moveType, defenderType) {
  if (typeof PokemonMod.getTypeEffectiveness === 'function') {
    return PokemonMod.getTypeEffectiveness(moveType, defenderType);
  }
  return 1;
}

export const BATTLE_STATES = {
  INACTIVE: 'INACTIVE',
  INTRO: 'INTRO',
  PLAYER_INPUT: 'PLAYER_INPUT',
  ACTION_ANIMATING: 'ACTION_ANIMATING',
  OPPONENT_AI: 'OPPONENT_AI',
  OPPONENT_ANIMATING: 'OPPONENT_ANIMATING',
  CHECK_FAINT: 'CHECK_FAINT',
  RETURN_TO_INPUT: 'RETURN_TO_INPUT',
  FORCED_SWITCH: 'FORCED_SWITCH',
  BATTLE_END: 'BATTLE_END',
};

const BATTLE_PACE_PRESETS = {
  cinema: {
    saySpeedMs: 24,
    sayHoldMs: 880,
    windupMs: 240,
    streamSteps: 14,
    streamStepMs: 42,
    physicalStrikeMs: 150,
    hitStopMs: 140,
    postImpactMs: 480,
    hpDrainMs: 620,
    interTurnMs: 480,
    ballWobblePauseMs: 560,
    particleLifeScale: 1.55,
  },
  classic: {
    saySpeedMs: 18,
    sayHoldMs: 560,
    windupMs: 170,
    streamSteps: 14,
    streamStepMs: 30,
    physicalStrikeMs: 130,
    hitStopMs: 90,
    postImpactMs: 380,
    hpDrainMs: 480,
    interTurnMs: 300,
    ballWobblePauseMs: 420,
    particleLifeScale: 1.2,
  },
  fast: {
    saySpeedMs: 10,
    sayHoldMs: 260,
    windupMs: 110,
    streamSteps: 12,
    streamStepMs: 18,
    physicalStrikeMs: 100,
    hitStopMs: 50,
    postImpactMs: 240,
    hpDrainMs: 320,
    interTurnMs: 140,
    ballWobblePauseMs: 260,
    particleLifeScale: 0.9,
  },
};

function lerpChannel(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function lerpHex(c1, c2, t) {
  const clamped = Math.max(0, Math.min(1, t));
  return `rgb(${lerpChannel(c1[0], c2[0], clamped)}, ${lerpChannel(c1[1], c2[1], clamped)}, ${lerpChannel(c1[2], c2[2], clamped)})`;
}

const HP_COLOR_EMERALD_A = [16, 185, 129];
const HP_COLOR_EMERALD_B = [52, 211, 153];
const HP_COLOR_AMBER_A = [245, 158, 11];
const HP_COLOR_AMBER_B = [251, 191, 36];
const HP_COLOR_CRIMSON_A = [220, 38, 38];
const HP_COLOR_CRIMSON_B = [251, 113, 133];

const ACTION_COOLDOWN_MS = 180;
const PHYSICAL_MOVE_IDS = new Set([
  'tackle',
  'quick_attack',
  'spark_dash',
  'gust',
  'rock_throw',
  'starlight_claw',
  'thunder_fang',
  'wild_volt',
  'iron_crush',
  'glacier_crash',
  'leaf_blade',
  'psycho_cut',
  'aqua_tail',
]);

const MOVE_FX_CLASS = {
  thunder_fang: 'fx-electric-charge',
  wild_volt: 'fx-electric-charge',
  moonblast: 'fx-moon-charge',
  calm_aura: 'fx-calm-aura',
  shadow_pulse: 'fx-ghost-charge',
  iron_crush: 'fx-metal-flash',
  glacier_crash: 'fx-ice-charge',
  magma_cannon: 'fx-magma-charge',
  leaf_blade: 'fx-grove-slash',
  eruption_flare: 'fx-lava-plume',
  aura_sphere: 'fx-aura-charge',
  psycho_cut: 'fx-psycho-cut',
  aqua_tail: 'fx-prism-tail',
  draco_meteor: 'fx-comet-storm',
  omen_wind: 'fx-omen-frost',
  doom_desire: 'fx-starlight-wish',
};

const ALL_MOVE_FX_CLASSES = Object.values(MOVE_FX_CLASS);

function normalizeBallStyle(ballType) {
  if (ballType === true || ballType === 'great') return 'great';
  if (ballType === 'star') return 'star';
  return 'pokeball';
}

function resolveMoveParticleShape(move) {
  if (!move) return 'circle';
  if (move.id === 'star_melody') return 'note';
  if (move.id === 'moonblast' || move.id === 'psycho_cut') return 'crescent';
  if (move.id === 'thunder_fang' || move.id === 'wild_volt') return 'lightning';
  if (move.id === 'iron_crush') return 'stone';
  if (move.fx === 'wind' || move.id === 'sky_wing' || move.id === 'gust' || move.id === 'omen_wind') return 'wind';
  if (move.id === 'phantom_claw' || move.id === 'starlight_claw' || move.id === 'leaf_blade') return 'slash';
  if (move.id === 'doom_desire' || move.id === 'aura_sphere') return 'star';
  if (move.id === 'draco_meteor') return 'dragonflame';
  if (move.id === 'eruption_flare') return 'ember';
  if (move.id === 'aqua_tail') return 'bubble';
  const shapeByType = {
    fire: 'ember',
    water: 'bubble',
    grass: 'leaf',
    electric: 'bolt',
    psychic: 'star',
    rock: 'dust',
    ice: 'crystal',
    ghost: 'wisp',
    dragon: 'dragonflame',
    normal: move.fx === 'star' ? 'star' : 'dust',
  };
  return shapeByType[move.type] || 'circle';
}

export class BattleEngine {
  constructor({ storage, audio, onBattleEnd, onBadgesUnlocked, onHudRefresh }) {
    this.storage = storage;
    this.audio = audio;
    this.onBattleEnd = onBattleEnd;
    this.onBadgesUnlocked = onBadgesUnlocked;
    this.onHudRefresh = onHudRefresh;

    this.screenEl = document.getElementById('battle-screen');
    this.stageEl = document.getElementById('battle-stage');
    this.fxCanvas = document.getElementById('battle-fx-canvas');
    this.fxCtx = this.fxCanvas ? this.fxCanvas.getContext('2d') : null;

    this.enemyNameEl = document.getElementById('enemy-name');
    this.enemyLevelEl = document.getElementById('enemy-level');
    this.enemyTypeEl = document.getElementById('enemy-type');
    this.enemyDexPillEl = document.getElementById('enemy-dex-pill');
    this.enemyStagesEl = document.getElementById('enemy-stages');
    this.enemyHpFillEl = document.getElementById('enemy-hp-fill');
    this.enemySpriteEl = document.getElementById('enemy-sprite');
    this.enemyStatusCardEl = this.enemyNameEl?.closest('.status-card-enemy') || document.querySelector('.status-card-enemy');

    this.playerNameEl = document.getElementById('player-name');
    this.playerLevelEl = document.getElementById('player-level');
    this.playerTypeEl = document.getElementById('player-type');
    this.playerStagesEl = document.getElementById('player-stages');
    this.playerHpFillEl = document.getElementById('player-hp-fill');
    this.playerHpTextEl = document.getElementById('player-hp-text');
    this.playerXpFillEl = document.getElementById('player-xp-fill');
    this.playerSpriteEl = document.getElementById('player-sprite');
    this.playerStatusCardEl = this.playerNameEl?.closest('.status-card-player') || document.querySelector('.status-card-player');

    this.logEl = document.getElementById('battle-log');
    this.movesEl = document.getElementById('battle-moves');
    this.btnBall = document.getElementById('battle-btn-ball');
    this.btnGreat = document.getElementById('battle-btn-great');
    this.btnStar = document.getElementById('battle-btn-star');
    this.btnPotion = document.getElementById('battle-btn-potion');
    this.btnTeam = document.getElementById('battle-btn-team');
    this.btnRun = document.getElementById('battle-btn-run');

    this.teamDrawerEl = document.getElementById('battle-team-drawer');
    this.teamListEl = document.getElementById('battle-team-list');
    this.teamCloseBtn = document.getElementById('battle-team-close');
    this.enemyPartyPipsEl = this.ensureEnemyPartyPipsEl();

    this.active = false;
    this.busy = false;
    this.state = BATTLE_STATES.INACTIVE;
    this.sessionId = 0;
    this.turnToken = 0;
    this.lastActionAt = -ACTION_COOLDOWN_MS;
    this.selectedMoveIndex = 0;

    this.enemy = null;
    this.enemyParty = [];
    this.enemyPartyIndex = 0;
    this.player = null;
    this.playerIndex = 0;
    this.biomeId = 'forest';
    this.isShrine = false;
    this.shrineData = null;
    this.isTrainer = false;
    this.trainerData = null;

    this.particles = [];
    this.popups = [];
    this.pokeballAnim = null;
    this.captureBeam = null;

    // Single-instance tracked loop and timer handles
    this.fxRaf = null;
    this.fxLoopCount = 0;
    this.lastFxTime = 0;
    this.hpRafs = { enemy: null, player: null };
    this.hpResolvers = { enemy: null, player: null };
    this.xpRaf = null;
    this.xpResolver = null;
    this.ballRafId = null;
    this.ballResolver = null;
    this.pendingTimers = new Map();

    this.shakeTimer = 0;
    this.shakeDuration = 0;
    this.shakeIntensity = 0;

    this.typingTimer = null;
    this.typingHoldTimer = null;
    this.typingResolve = null;
    this.typingFullText = '';

    this.displayedEnemyHp = 0;
    this.displayedPlayerHp = 0;
    this.mustSwitchForced = false;
    this.playerBuddyEndured = false;
    this.resizeObserver = null;
    this._uiAbort = new AbortController();

    this.bindUI();
  }

  ensureEnemyPartyPipsEl() {
    let el = document.getElementById('enemy-party-pips');
    if (el) return el;
    const head = this.enemyLevelEl?.parentElement || document.querySelector('.status-card-enemy .status-head');
    if (!head) return null;
    el = document.createElement('span');
    el.id = 'enemy-party-pips';
    el.className = 'enemy-party-pips';
    el.hidden = true;
    if (this.enemyLevelEl && this.enemyLevelEl.parentElement === head) {
      head.insertBefore(el, this.enemyLevelEl);
    } else {
      head.appendChild(el);
    }
    return el;
  }

  bindUI() {
    const signal = this._uiAbort.signal;
    this.logEl?.addEventListener('click', () => this.finishTypewriter(), { signal });
    this.btnBall?.addEventListener('click', () => this.handleThrowBall('pokeball'), { signal });
    this.btnGreat?.addEventListener('click', () => this.handleThrowBall('great'), { signal });
    this.btnStar?.addEventListener('click', () => this.handleThrowBall('star'), { signal });
    this.btnPotion?.addEventListener('click', () => this.handleUsePotion(), { signal });
    this.btnTeam?.addEventListener('click', () => this.openTeamDrawer(false), { signal });
    this.btnRun?.addEventListener('click', () => this.handleRun(), { signal });

    const actionButtons = [this.btnBall, this.btnGreat, this.btnStar, this.btnPotion, this.btnTeam, this.btnRun];
    for (const btn of actionButtons) {
      if (!btn) continue;
      const playHoverCue = () => {
        if (!btn.disabled && this.canAcceptPlayerAction()) {
          this.audio?.playCursorMove?.();
        }
      };
      btn.addEventListener('pointerenter', playHoverCue, { signal });
      btn.addEventListener('focus', playHoverCue, { signal });
    }

    this.teamCloseBtn?.addEventListener('click', () => {
      if (!this.mustSwitchForced) {
        this.audio?.playMenuBlip?.(480);
        this.closeTeamDrawer();
      }
    }, { signal });

    if (typeof ResizeObserver !== 'undefined' && this.stageEl) {
      this.resizeObserver = new ResizeObserver(() => this.syncCanvasSize());
      this.resizeObserver.observe(this.stageEl);
    }
  }

  destroy() {
    this.stop();
    this._uiAbort.abort();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  syncCanvasSize() {
    if (!this.fxCanvas || !this.stageEl) return;
    const rect = this.stageEl.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.fxCanvas.width = Math.round(rect.width);
      this.fxCanvas.height = Math.round(rect.height);
      if (this.fxCtx) {
        this.fxCtx.imageSmoothingEnabled = false;
      }
    }
  }

  clearAllTimersAndLoops() {
    if (this.fxRaf !== null) {
      cancelAnimationFrame(this.fxRaf);
      this.fxRaf = null;
    }

    for (const side of ['enemy', 'player']) {
      if (this.hpRafs[side] !== null) {
        cancelAnimationFrame(this.hpRafs[side]);
        this.hpRafs[side] = null;
      }
      if (this.hpResolvers[side]) {
        const res = this.hpResolvers[side];
        this.hpResolvers[side] = null;
        res();
      }
    }

    if (this.ballRafId !== null) {
      cancelAnimationFrame(this.ballRafId);
      this.ballRafId = null;
    }
    if (this.ballResolver) {
      const res = this.ballResolver;
      this.ballResolver = null;
      res();
    }

    if (this.xpRaf !== null) {
      cancelAnimationFrame(this.xpRaf);
      this.xpRaf = null;
    }
    if (this.xpResolver) {
      const res = this.xpResolver;
      this.xpResolver = null;
      res();
    }

    for (const [timerId, resolve] of this.pendingTimers.entries()) {
      clearTimeout(timerId);
      this.pendingTimers.delete(timerId);
      resolve();
    }

    this.finishTypewriter();
  }

  wait(ms, sid = this.sessionId) {
    if (!this.isSessionValid(sid) || ms <= 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const timerId = setTimeout(() => {
        this.pendingTimers.delete(timerId);
        done();
      }, ms);
      this.pendingTimers.set(timerId, done);
    });
  }

  canAcceptPlayerAction() {
    if (!this.active || this.busy || this.state !== BATTLE_STATES.PLAYER_INPUT) return false;
    if (this.teamDrawerEl && !this.teamDrawerEl.hidden) return false;
    const now = performance.now();
    if (now - this.lastActionAt < ACTION_COOLDOWN_MS) return false;
    return true;
  }

  lockPlayerAction(nextState = BATTLE_STATES.ACTION_ANIMATING) {
    this.turnToken += 1;
    this.lastActionAt = performance.now();
    this.busy = true;
    this.state = nextState;
    this.screenEl?.classList.add('is-action-locked');
    this.setControlsDisabled(true);
    return this.turnToken;
  }

  markActionLocked(nextState = BATTLE_STATES.ACTION_ANIMATING) {
    return this.lockPlayerAction(nextState);
  }

  unlockPlayerInput() {
    if (!this.active) return;
    this.busy = false;
    this.lastActionAt = -ACTION_COOLDOWN_MS;
    this.state = BATTLE_STATES.PLAYER_INPUT;
    this.screenEl?.classList.remove('is-action-locked');
    this.setControlsDisabled(false);
    this.syncMoveSelectionVisuals();
  }

  setIdlePrompt(text) {
    this.finishTypewriter();
    this.typingFullText = text;
    if (this.logEl) {
      this.logEl.classList.remove('is-typing', 'is-waiting');
      this.logEl.textContent = text;
    }
  }

  getPaceConfig() {
    const paceKey = this.storage?.getSettings?.()?.battlePace || 'cinema';
    return BATTLE_PACE_PRESETS[paceKey] || BATTLE_PACE_PRESETS.cinema;
  }

  _resetSpriteClasses(side) {
    const el = side === 'enemy' ? this.enemySpriteEl : this.playerSpriteEl;
    const mon = side === 'enemy' ? this.enemy : this.player;
    if (!el) return;
    el.className = `fighter-sprite fighter-sprite-${side} is-idle${mon?.isShiny ? ' is-shiny-sprite' : ''}${side === 'enemy' && mon?.isElite ? ' is-elite-sprite' : ''}`;
  }

  returnToPlayerInput(sid = this.sessionId) {
    if (!this.isSessionValid(sid) || !this.player || !this.enemy) return;
    if (this.player.isFainted || this.enemy.isFainted) return;

    this.state = BATTLE_STATES.RETURN_TO_INPUT;
    this.finishTypewriter();

    this._resetSpriteClasses('enemy');
    this._resetSpriteClasses('player');

    this.renderStatusCards();
    this.renderMoveButtons();
    this.setIdlePrompt(`What will ${this.player.displayName || this.player.name} do?`);
    this.unlockPlayerInput();
  }

  isSessionValid(sid) {
    return this.active && sid === this.sessionId;
  }

  getDiagnostics() {
    return {
      active: this.active,
      busy: this.busy,
      state: this.state,
      sessionId: this.sessionId,
      turnToken: this.turnToken,
      fxRafActive: this.fxRaf !== null,
      fxLoopCount: this.fxLoopCount,
      pendingTimers: this.pendingTimers.size,
      activeHpRafs: Number(this.hpRafs.enemy !== null) + Number(this.hpRafs.player !== null),
      ballRafActive: this.ballRafId !== null,
      particleCount: this.particles.length,
      popupCount: this.popups.length,
      actionLockedClass: Boolean(this.screenEl?.classList.contains('is-action-locked')),
    };
  }

  async start({
    enemy,
    enemyParty = null,
    biomeId = 'forest',
    isShrine = false,
    shrineData = null,
    isTrainer = false,
    trainerData = null,
  }) {
    const profile = this.storage.getActiveProfile();
    if (!profile) {
      this.onBattleEnd?.({ outcome: 'escaped', faintedAll: false });
      return;
    }

    this.storage.ensureHealthyParty?.(profile);
    const party = Array.isArray(enemyParty) && enemyParty.length > 0
      ? enemyParty.filter(Boolean)
      : (enemy ? [enemy] : []);
    const firstHealthyEnemy = party.findIndex((m) => !m.isFainted);
    const activeEnemyIdx = enemy && party.includes(enemy) && !enemy.isFainted
      ? party.indexOf(enemy)
      : (firstHealthyEnemy >= 0 ? firstHealthyEnemy : 0);
    const leadEnemy = party[activeEnemyIdx] || enemy || null;

    if (profile.team.length === 0 || !leadEnemy) {
      this.onBattleEnd?.({ outcome: 'escaped', faintedAll: false });
      return;
    }

    // Clear any leftover timers/RAFs before establishing new session
    this.clearAllTimersAndLoops();

    const firstHealthy = profile.team.findIndex((m) => !m.isFainted);
    this.playerIndex = firstHealthy >= 0 ? firstHealthy : 0;
    this.player = profile.team[this.playerIndex];
    if (this.player.isFainted) {
      this.player.healFull();
    }

    const sid = ++this.sessionId;
    this.turnToken = 0;
    this.lastActionAt = -ACTION_COOLDOWN_MS;
    this.selectedMoveIndex = 0;
    this.enemyParty = party;
    this.enemyPartyIndex = Math.max(0, activeEnemyIdx);
    this.enemy = leadEnemy;
    this.biomeId = isShrine ? 'shrine' : biomeId;
    this.isShrine = isShrine;
    this.shrineData = shrineData;
    this.isTrainer = Boolean(isTrainer);
    this.trainerData = trainerData || null;

    this.player.resetBattleState?.();
    for (const enemyMon of this.enemyParty) {
      enemyMon.resetBattleState?.();
    }

    this.active = true;
    this.busy = true;
    this.state = BATTLE_STATES.INTRO;
    this.mustSwitchForced = false;
    this.playerBuddyEndured = false;
    this.particles = [];
    this.popups = [];
    this.pokeballAnim = null;
    this.captureBeam = null;
    this.shakeTimer = 0;
    if (this.stageEl) this.stageEl.style.transform = '';

    this.storage.recordSeen(leadEnemy.speciesId);

    if (this.screenEl) {
      this.screenEl.hidden = false;
      this.screenEl.classList.add('is-action-locked');
    }
    if (this.stageEl) {
      this.stageEl.dataset.biome = this.biomeId;
    }
    this.syncCanvasSize();
    this.startFxLoop();

    this._resetSpriteClasses('enemy');
    this._resetSpriteClasses('player');
    this.displayedEnemyHp = leadEnemy.hp;
    this.displayedPlayerHp = this.player.hp;

    this.renderStatusCards();
    this.renderMoveButtons();
    this.renderActionButtons();
    this.setControlsDisabled(true);

    await Promise.all([
      PokemonMod.attachPokemonSprite(this.enemySpriteEl, leadEnemy.speciesId, {
        back: false,
        shiny: Boolean(leadEnemy.isShiny),
        timeoutMs: 2000,
      }),
      PokemonMod.attachPokemonSprite(this.playerSpriteEl, this.player.speciesId, {
        back: true,
        shiny: Boolean(this.player.isShiny),
        timeoutMs: 2000,
      }),
    ]);

    if (!this.isSessionValid(sid)) return;

    this.enemySpriteEl?.classList.toggle('is-shiny-sprite', Boolean(leadEnemy.isShiny));
    this.enemySpriteEl?.classList.toggle('is-elite-sprite', Boolean(leadEnemy.isElite));
    this.playerSpriteEl?.classList.toggle('is-shiny-sprite', Boolean(this.player.isShiny));

    if (leadEnemy.isShiny) {
      this.audio?.playShinySparkle?.();
      this.spawnShinyIntroSparkles('enemy');
    }
    if (leadEnemy.isElite) {
      if (!leadEnemy.isShiny) {
        this.audio?.playShinySparkle?.();
      }
      this.spawnEliteIntroAura('enemy');
    }

    const playerName = this.player.displayName || this.player.name;
    let introMsg = '';
    if (isShrine && shrineData) {
      introMsg = shrineData.intro;
    } else if (this.isTrainer && this.trainerData) {
      const isRematch = Boolean(this.trainerData.id && profile.rivalsDefeated?.includes(this.trainerData.id));
      const line = (isRematch && this.trainerData.rematchIntro) || this.trainerData.intro;
      introMsg = line
        ? `${this.trainerData.name}: "${line}" Sent out ${leadEnemy.name}! Go, ${playerName}!`
        : `${this.trainerData.name} sent out ${leadEnemy.name}! Go, ${playerName}!`;
    } else if (leadEnemy.isElite && leadEnemy.isShiny) {
      introMsg = `✨ A rare ELITE wild ${leadEnemy.name} appeared! (Starlight Shimmer!) Go, ${playerName}!`;
    } else if (leadEnemy.isElite) {
      introMsg = `⚡ A rare ELITE wild ${leadEnemy.name} appeared! Go, ${playerName}!`;
    } else if (leadEnemy.isShiny) {
      introMsg = `✨ A rare Starlight Shimmer ${leadEnemy.name} appeared! Go, ${playerName}!`;
    } else {
      introMsg = `A wild ${leadEnemy.name} appeared! Go, ${playerName}!`;
    }
    await this.say(introMsg);

    if (!this.isSessionValid(sid)) return;
    this.returnToPlayerInput(sid);
  }

  stop(result = { outcome: 'escaped', faintedAll: false }) {
    this.sessionId += 1;
    this.turnToken += 1;
    this.active = false;
    this.busy = false;
    this.state = BATTLE_STATES.INACTIVE;
    this.mustSwitchForced = false;
    this.playerBuddyEndured = false;
    this.isTrainer = false;
    this.trainerData = null;
    this.enemyParty = [];
    this.enemyPartyIndex = 0;
    this.pokeballAnim = null;
    this.captureBeam = null;
    this.particles = [];
    this.popups = [];
    this.shakeTimer = 0;
    if (this.stageEl) this.stageEl.style.transform = '';
    this.enemySpriteEl?.classList.remove(
      'windup', 'hit-stop', 'hit-shake', 'evo-glow', 'evo-flash',
      'enemy-sendout', 'faint-drop', 'is-elite-sprite', ...ALL_MOVE_FX_CLASSES,
    );
    this.playerSpriteEl?.classList.remove(
      'windup', 'hit-stop', 'hit-shake', 'evo-glow', 'evo-flash',
      'faint-drop', ...ALL_MOVE_FX_CLASSES,
    );
    const enemyCard = this.enemyStatusCardEl || this.enemyNameEl?.closest('.status-card-enemy') || document.querySelector('.status-card-enemy');
    enemyCard?.classList.remove('is-elite-card');

    this.closeTeamDrawer();
    this.clearAllTimersAndLoops();

    if (this.screenEl) {
      this.screenEl.classList.remove('is-action-locked');
      this.screenEl.hidden = true;
    }
    this.onBattleEnd?.(result);
  }

  triggerPrimaryAction() {
    if (!this.active) return;
    if (this.typingResolve) {
      this.finishTypewriter();
      return;
    }
    if (this.canAcceptPlayerAction()) {
      const selectedBtn = this.movesEl?.querySelector('.move-card.is-selected:not(:disabled)');
      const fallbackBtn = this.movesEl?.querySelector('.move-card:not(:disabled)');
      const target = selectedBtn || fallbackBtn;
      if (target) target.click();
    }
  }

  triggerCancelAction() {
    if (!this.active) return;
    if (this.teamDrawerEl && !this.teamDrawerEl.hidden && !this.mustSwitchForced) {
      this.closeTeamDrawer();
    }
  }

  syncRankPill(side, mon) {
    const card = side === 'enemy'
      ? (this.enemyStatusCardEl || this.enemyNameEl?.closest('.status-card-enemy') || document.querySelector('.status-card-enemy'))
      : (this.playerStatusCardEl || this.playerNameEl?.closest('.status-card-player') || document.querySelector('.status-card-player'));
    if (!card) return;
    const pillId = side === 'enemy' ? 'enemy-rank-pill' : 'player-rank-pill';
    let pill = card.querySelector(`#${pillId}`) || card.querySelector('.rank-pill');
    const tier = Math.max(0, Math.min(5, Math.round(Number(mon?.upgradeTier) || 0)));
    if (tier <= 0) {
      if (pill) pill.remove();
      return;
    }
    if (!pill) {
      pill = document.createElement('span');
      pill.id = pillId;
      pill.className = 'rank-pill';
      const levelEl = side === 'enemy' ? this.enemyLevelEl : this.playerLevelEl;
      const head = levelEl?.parentElement || card.querySelector('.status-head');
      if (head && levelEl && levelEl.parentElement === head) {
        head.insertBefore(pill, levelEl);
      } else if (head) {
        head.appendChild(pill);
      } else {
        card.appendChild(pill);
      }
    }
    pill.textContent = `★${tier}`;
    pill.title = `Star Rank ★${tier}`;
  }

  renderStagePills(containerEl, mon, { isEnemy = false } = {}) {
    if (!containerEl || !mon) return;
    const chips = [];
    if (isEnemy && mon.isElite) {
      chips.push('<span class="stage-chip elite-badge is-elite">⚡ ELITE</span>');
    }
    if (mon.isShiny) {
      chips.push('<span class="stage-chip is-shiny">✨ SHIMMER</span>');
    }
    if ((mon.shieldTurns || 0) > 0) {
      chips.push(`<span class="stage-chip is-shield">🛡️ SHIELD (${mon.shieldTurns})</span>`);
    }
    const stages = mon.battleStages || {};
    const labels = { atk: 'ATK', def: 'DEF', spd: 'SPD' };
    for (const [stat, label] of Object.entries(labels)) {
      const val = Number(stages[stat] || 0);
      if (val > 0) {
        chips.push(`<span class="stage-chip is-buff">${label} ▲${val > 1 ? val : ''}</span>`);
      } else if (val < 0) {
        chips.push(`<span class="stage-chip is-debuff">${label} ▼${Math.abs(val) > 1 ? Math.abs(val) : ''}</span>`);
      }
    }
    containerEl.innerHTML = chips.join('');
    containerEl.hidden = chips.length === 0;
  }

  renderStatusCards() {
    if (!this.enemy || !this.player) return;
    const profile = this.storage.getActiveProfile();
    const caughtBefore = Boolean(profile?.pokedex?.caught?.[this.enemy.speciesId]);
    const typesMap = getTypesMap();

    const enemyCard = this.enemyStatusCardEl || this.enemyNameEl?.closest('.status-card-enemy') || document.querySelector('.status-card-enemy');
    enemyCard?.classList.toggle('is-elite-card', Boolean(this.enemy.isElite));
    this.enemySpriteEl?.classList.toggle('is-elite-sprite', Boolean(this.enemy.isElite));

    if (this.enemyNameEl) this.enemyNameEl.textContent = this.enemy.name;
    if (this.enemyLevelEl) this.enemyLevelEl.textContent = `Lv.${this.enemy.level}`;
    this.syncRankPill('enemy', this.enemy);
    const eType = typesMap[this.enemy.type] || typesMap.normal || FALLBACK_TYPES.normal;
    if (this.enemyTypeEl) {
      this.enemyTypeEl.textContent = `${eType.icon} ${eType.label}`;
      this.enemyTypeEl.style.background = eType.bg;
      this.enemyTypeEl.style.color = '#ffffff';
    }
    if (this.enemyDexPillEl) {
      this.enemyDexPillEl.hidden = !caughtBefore || this.isShrine || this.isTrainer;
    }
    const pipsEl = this.enemyPartyPipsEl || this.ensureEnemyPartyPipsEl();
    if (pipsEl) {
      this.enemyPartyPipsEl = pipsEl;
      if (Array.isArray(this.enemyParty) && this.enemyParty.length > 1) {
        pipsEl.innerHTML = this.enemyParty.map((mon, idx) => {
          const stateCls = mon?.isFainted ? ' is-fainted' : idx === this.enemyPartyIndex ? ' is-active' : '';
          const title = mon ? `${mon.name} Lv.${mon.level}${mon.isFainted ? ' (Fainted)' : ''}` : '';
          return `<span class="enemy-party-pip${stateCls}" title="${title}"></span>`;
        }).join('');
        pipsEl.hidden = false;
      } else {
        pipsEl.innerHTML = '';
        pipsEl.hidden = true;
      }
    }
    this.updateHpBarVisual(this.enemyHpFillEl, this.displayedEnemyHp, this.enemy.maxHp);
    if (this.enemyStagesEl) {
      this.renderStagePills(this.enemyStagesEl, this.enemy, { isEnemy: true });
    }

    if (this.playerNameEl) this.playerNameEl.textContent = this.player.displayName || this.player.name;
    if (this.playerLevelEl) this.playerLevelEl.textContent = `Lv.${this.player.level}`;
    this.syncRankPill('player', this.player);
    const pType = typesMap[this.player.type] || typesMap.normal || FALLBACK_TYPES.normal;
    if (this.playerTypeEl) {
      this.playerTypeEl.textContent = `${pType.icon} ${pType.label}`;
      this.playerTypeEl.style.background = pType.bg;
      this.playerTypeEl.style.color = '#ffffff';
    }
    this.updateHpBarVisual(this.playerHpFillEl, this.displayedPlayerHp, this.player.maxHp);
    if (this.playerHpTextEl) {
      this.playerHpTextEl.textContent = `HP ${Math.round(this.displayedPlayerHp)}/${this.player.maxHp}`;
    }
    if (this.playerXpFillEl && this.xpRaf === null) {
      const xpPct = Math.min(100, Math.round((this.player.xp / Math.max(1, this.player.xpToNext)) * 100));
      this.playerXpFillEl.style.width = `${xpPct}%`;
    }
    if (this.playerStagesEl) {
      this.renderStagePills(this.playerStagesEl, this.player, { isEnemy: false });
    }
  }

  updateHpBarVisual(el, hp, maxHp) {
    if (!el) return;
    const safeMax = Number.isFinite(Number(maxHp)) && Number(maxHp) > 0 ? Number(maxHp) : 1;
    const safeHp = Number.isFinite(Number(hp)) ? Math.max(0, Number(hp)) : 0;
    const pct = Math.max(0, Math.min(100, (safeHp / safeMax) * 100));
    el.style.width = `${pct}%`;

    const isHigh = pct > 50;
    const isMid = pct > 20 && pct <= 50;
    const isLow = pct <= 20;
    el.classList.toggle('is-high', isHigh);
    el.classList.toggle('is-mid', isMid);
    el.classList.toggle('is-low', isLow);

    let startCol;
    let endCol;
    if (pct > 50) {
      const blend = Math.max(0, Math.min(1, (65 - pct) / 15));
      startCol = lerpHex(HP_COLOR_EMERALD_A, HP_COLOR_AMBER_A, blend * 0.25);
      endCol = lerpHex(HP_COLOR_EMERALD_B, HP_COLOR_AMBER_B, blend * 0.25);
    } else if (pct > 20) {
      const t = (50 - pct) / 30;
      startCol = lerpHex(HP_COLOR_AMBER_A, HP_COLOR_CRIMSON_A, Math.max(0, (t - 0.55) / 0.45) * 0.35);
      endCol = lerpHex(HP_COLOR_AMBER_B, HP_COLOR_CRIMSON_B, Math.max(0, (t - 0.55) / 0.45) * 0.35);
    } else {
      const t = (20 - pct) / 20;
      startCol = lerpHex(HP_COLOR_CRIMSON_A, [185, 28, 28], t * 0.5);
      endCol = lerpHex(HP_COLOR_CRIMSON_B, [239, 68, 68], t * 0.5);
    }
    el.style.background = `linear-gradient(90deg, ${startCol}, ${endCol})`;
  }

  async animateHpTo(side, targetHp, duration = 460) {
    const sid = this.sessionId;
    if (!this.isSessionValid(sid)) return;

    if (this.hpRafs[side] !== null) {
      cancelAnimationFrame(this.hpRafs[side]);
      this.hpRafs[side] = null;
    }
    if (this.hpResolvers[side]) {
      const prevResolve = this.hpResolvers[side];
      this.hpResolvers[side] = null;
      prevResolve();
    }

    const startHp = side === 'enemy' ? this.displayedEnemyHp : this.displayedPlayerHp;
    const maxHp = side === 'enemy' ? this.enemy.maxHp : this.player.maxHp;
    const startTime = performance.now();

    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        this.hpRafs[side] = null;
        if (this.hpResolvers[side] === done) {
          this.hpResolvers[side] = null;
        }
        resolve();
      };
      this.hpResolvers[side] = done;

      const tick = (now) => {
        if (!this.isSessionValid(sid)) {
          done();
          return;
        }
        const t = Math.min(1, (now - startTime) / Math.max(1, duration));
        const eased = 1 - Math.pow(1 - t, 3);
        const current = startHp + (targetHp - startHp) * eased;

        if (side === 'enemy') {
          this.displayedEnemyHp = current;
          this.updateHpBarVisual(this.enemyHpFillEl, current, maxHp);
        } else {
          this.displayedPlayerHp = current;
          this.updateHpBarVisual(this.playerHpFillEl, current, maxHp);
          if (this.playerHpTextEl) {
            this.playerHpTextEl.textContent = `HP ${Math.round(current)}/${maxHp}`;
          }
        }

        if (t < 1 && this.isSessionValid(sid)) {
          this.hpRafs[side] = requestAnimationFrame(tick);
        } else {
          if (side === 'enemy') {
            this.displayedEnemyHp = targetHp;
            this.updateHpBarVisual(this.enemyHpFillEl, targetHp, maxHp);
          } else {
            this.displayedPlayerHp = targetHp;
            this.updateHpBarVisual(this.playerHpFillEl, targetHp, maxHp);
            if (this.playerHpTextEl) {
              this.playerHpTextEl.textContent = `HP ${Math.round(targetHp)}/${maxHp}`;
            }
            this.onHudRefresh?.();
          }
          done();
        }
      };

      this.hpRafs[side] = requestAnimationFrame(tick);
    });
  }

  selectMoveCard(index, playSound = false) {
    if (!this.movesEl) return;
    const cards = Array.from(this.movesEl.querySelectorAll('.move-card'));
    if (cards.length === 0) return;

    const clamped = Math.max(0, Math.min(cards.length - 1, index));
    const changed = clamped !== this.selectedMoveIndex;
    this.selectedMoveIndex = clamped;
    cards.forEach((card, i) => {
      card.classList.toggle('is-selected', i === clamped);
    });
    if (playSound && changed && this.canAcceptPlayerAction()) {
      this.audio?.playCursorMove?.();
    }
  }

  syncMoveSelectionVisuals() {
    this.selectMoveCard(this.selectedMoveIndex, false);
  }

  moveSelectionCursor(dir) {
    if (!this.canAcceptPlayerAction() || !this.movesEl) return false;
    const cards = Array.from(this.movesEl.querySelectorAll('.move-card'));
    const count = cards.length;
    if (count === 0) return false;

    const cur = Math.max(0, Math.min(count - 1, this.selectedMoveIndex));
    let next = cur;

    if (dir === 'left') {
      if (cur % 2 === 1) next = cur - 1;
    } else if (dir === 'right') {
      if (cur % 2 === 0 && cur + 1 < count) next = cur + 1;
    } else if (dir === 'up') {
      if (cur >= 2) next = cur - 2;
    } else if (dir === 'down') {
      if (cur + 2 < count) next = cur + 2;
      else if (cur < 2 && count === 3) next = 2;
    }

    if (next !== cur && cards[next]?.disabled) {
      const alt = cards.findIndex((c, idx) => idx !== cur && !c.disabled && (
        (dir === 'down' && idx >= 2) ||
        (dir === 'up' && idx < 2) ||
        (dir === 'right' && idx % 2 === 1) ||
        (dir === 'left' && idx % 2 === 0)
      ));
      if (alt >= 0) next = alt;
      else return false;
    }

    this.selectMoveCard(next, true);
    return next !== cur;
  }

  selectMoveBySlot(slotIdx) {
    if (!this.canAcceptPlayerAction() || !this.movesEl) return false;
    const idx = Number(slotIdx);
    if (!Number.isInteger(idx) || idx < 0) return false;
    const cards = Array.from(this.movesEl.querySelectorAll('.move-card'));
    const card = cards[idx];
    if (!card || card.disabled) {
      if (card?.disabled) this.audio?.playMenuBlip?.(300);
      return false;
    }
    this.selectMoveCard(idx, false);
    card.click();
    return true;
  }

  renderMoveButtons() {
    if (!this.movesEl || !this.player || !this.enemy) return;
    const moves = this.player.getMoveObjects();
    const hasAnyPp = this.player.hasAnyMovePp();
    this.movesEl.innerHTML = '';

    if (this.selectedMoveIndex < 0 || this.selectedMoveIndex >= moves.length) {
      this.selectedMoveIndex = 0;
    }
    if (moves.length > 0 && hasAnyPp) {
      const currentMove = moves[this.selectedMoveIndex];
      const currentPp = currentMove ? this.player.getMovePp(currentMove.id).current : 0;
      if (currentPp <= 0) {
        const firstAvailableIdx = moves.findIndex((m) => this.player.getMovePp(m.id).current > 0);
        if (firstAvailableIdx >= 0) {
          this.selectedMoveIndex = firstAvailableIdx;
        }
      }
    }

    const typesMap = getTypesMap();
    moves.forEach((move, idx) => {
      const typeMeta = typesMap[move.type] || typesMap.normal || FALLBACK_TYPES.normal;
      const isNonAttack = move.category === 'heal'
        || move.category === 'buff'
        || move.category === 'shield'
        || move.damageClass === 'status'
        || (Number(move.power) || 0) <= 0;
      const eff = isNonAttack ? 1 : computeTypeEffectiveness(move.type, this.enemy?.type);
      const pp = this.player.getMovePp(move.id);
      const outOfPp = pp.current <= 0 && hasAnyPp;
      const ppRatio = pp.max > 0 ? pp.current / pp.max : 0;
      const ppStateClass = pp.current === 0 || ppRatio <= 0.25 ? 'is-critical' : ppRatio <= 0.5 ? 'is-low' : '';
      const filledPips = pp.current <= 0 ? 0 : Math.max(1, Math.min(5, Math.round(ppRatio * 5)));

      let pipsHtml = '';
      for (let p = 0; p < 5; p++) {
        pipsHtml += `<span class="pp-pip${p < filledPips ? ' is-filled' : ''}"></span>`;
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `move-btn move-card move-card--${move.type}${idx === this.selectedMoveIndex ? ' is-selected' : ''}`;
      btn.dataset.moveId = move.id;
      btn.dataset.moveType = move.type;
      btn.dataset.outOfPp = outOfPp ? '1' : '0';

      let effBadgeHtml = '';
      if (move.category === 'heal') {
        effBadgeHtml = '<span class="move-eff-tag is-heal">♥ RECOVER</span>';
      } else if (move.category === 'buff') {
        effBadgeHtml = '<span class="move-eff-tag is-buff">⚡ STAT UP</span>';
      } else if (move.category === 'shield') {
        effBadgeHtml = '<span class="move-eff-tag is-shield">🛡️ GUARD</span>';
      } else if (eff >= 2) {
        effBadgeHtml = '<span class="move-eff-tag move-eff-badge is-super">2x SUPER</span>';
      } else if (eff > 1) {
        effBadgeHtml = '<span class="move-eff-tag move-eff-badge is-boost">1.5x BOOST</span>';
      } else if (eff < 1) {
        effBadgeHtml = '<span class="move-eff-tag move-eff-badge is-resist">0.5x RESIST</span>';
      }

      const statShort = { atk: 'ATK', def: 'DEF', spd: 'SPD' }[move.buffStat || 'atk'] || 'STAT';
      let catClass = move.damageClass === 'physical' ? 'physical' : 'special';
      let catLabel = catClass === 'physical' ? '💥 PHY' : '✦ SPC';
      let powerLabel = `PWR ${move.power}`;

      if (move.category === 'heal') {
        catClass = 'status';
        catLabel = '💚 HEAL';
        powerLabel = 'HEAL 38%';
      } else if (move.category === 'buff') {
        catClass = 'buff';
        catLabel = '⚡ BOOST';
        powerLabel = `${statShort} +${move.buffStages || 1}`;
      } else if (move.category === 'shield') {
        catClass = 'shield';
        catLabel = '🛡️ SHIELD';
        powerLabel = 'DEF +35%';
      }

      btn.innerHTML = `
        <span class="move-card-top">
          <span class="move-name-wrap">
            <span class="move-cursor" aria-hidden="true">▶</span>
            <span class="move-btn-name">${typeMeta.icon} ${move.name}</span>
          </span>
          ${effBadgeHtml}
        </span>
        <span class="move-card-bottom">
          <span class="move-stats-wrap">
            <span class="move-cat-badge is-${catClass}">${catLabel}</span>
            <span class="move-pwr-tag">${powerLabel}</span>
          </span>
          <span class="move-pp-wrap ${ppStateClass}">
            <span class="move-pp-text">PP ${pp.current}/${pp.max}</span>
            <span class="pp-pips" aria-hidden="true">${pipsHtml}</span>
          </span>
        </span>
      `;

      const locked = this.busy || this.state !== BATTLE_STATES.PLAYER_INPUT;
      btn.disabled = locked || outOfPp;

      btn.addEventListener('pointerenter', () => {
        if (!btn.disabled && this.canAcceptPlayerAction()) {
          this.selectMoveCard(idx, true);
        }
      });
      btn.addEventListener('focus', () => {
        if (!btn.disabled && this.canAcceptPlayerAction()) {
          this.selectMoveCard(idx, true);
        }
      });
      btn.addEventListener('click', () => {
        this.selectedMoveIndex = idx;
        this.handlePlayerMove(move);
      });

      this.movesEl.appendChild(btn);
    });
  }

  renderActionButtons() {
    const profile = this.storage.getActiveProfile();
    if (!profile || !this.player) return;

    const locked = this.busy || this.state !== BATTLE_STATES.PLAYER_INPUT;
    const starBalls = Math.max(0, Number(profile.bag?.starBalls) || 0);
    if (this.btnBall) {
      this.btnBall.textContent = this.isShrine ? '🛡️ Guardian' : '🔴 Poké Ball ∞';
      this.btnBall.disabled = locked;
    }
    if (this.btnGreat) {
      this.btnGreat.textContent = `🔵 Great Ball (${profile.bag.greatBalls})`;
      this.btnGreat.disabled = locked || this.isShrine || this.isTrainer || profile.bag.greatBalls <= 0;
    }
    if (this.btnStar) {
      this.btnStar.textContent = `🌟 Star Ball (${starBalls})`;
      this.btnStar.disabled = locked || this.isShrine || this.isTrainer || starBalls <= 0;
    }
    if (this.btnPotion) {
      this.btnPotion.textContent = `🍓 Potion (${profile.bag.potions})`;
      this.btnPotion.disabled = locked || profile.bag.potions <= 0 || this.player.hp >= this.player.maxHp;
    }
    if (this.btnTeam) {
      this.btnTeam.disabled = locked || profile.team.length <= 1;
    }
    if (this.btnRun) {
      this.btnRun.disabled = locked;
    }
  }

  setControlsDisabled(disabled) {
    this.movesEl?.querySelectorAll('button').forEach((btn) => {
      const outOfPp = btn.dataset.outOfPp === '1';
      btn.disabled = Boolean(disabled) || outOfPp;
    });
    if (this.btnBall) this.btnBall.disabled = Boolean(disabled);
    if (this.btnRun) this.btnRun.disabled = Boolean(disabled);
    if (disabled) {
      if (this.btnGreat) this.btnGreat.disabled = true;
      if (this.btnStar) this.btnStar.disabled = true;
      if (this.btnPotion) this.btnPotion.disabled = true;
      if (this.btnTeam) this.btnTeam.disabled = true;
    } else {
      this.renderActionButtons();
    }
  }

  say(text, speedMs = null, holdMs = null) {
    this.finishTypewriter();
    const pace = this.getPaceConfig();
    const resolvedSpeed = speedMs !== null && speedMs !== undefined && Number.isFinite(Number(speedMs))
      ? Number(speedMs)
      : pace.saySpeedMs;
    const resolvedHold = holdMs !== null && holdMs !== undefined && Number.isFinite(Number(holdMs))
      ? Number(holdMs)
      : pace.sayHoldMs;
    const safeText = String(text ?? '');
    this.typingFullText = safeText;

    if (this.logEl) {
      this.logEl.textContent = '';
      this.logEl.classList.remove('is-waiting');
      this.logEl.classList.add('is-typing');
    }

    return new Promise((resolve) => {
      this.typingResolve = resolve;
      let idx = 0;

      const enterWaitingPhase = () => {
        if (this.typingTimer !== null) {
          clearInterval(this.typingTimer);
          this.typingTimer = null;
        }
        if (this.logEl) {
          this.logEl.textContent = safeText;
          this.logEl.classList.remove('is-typing');
          this.logEl.classList.add('is-waiting');
        }
        if (resolvedHold <= 0) {
          this.finishTypewriter();
          return;
        }
        this.typingHoldTimer = setTimeout(() => {
          this.typingHoldTimer = null;
          if (this.typingResolve === resolve) {
            if (this.logEl) {
              this.logEl.classList.remove('is-typing', 'is-waiting');
            }
            this.typingResolve = null;
            resolve();
          }
        }, resolvedHold);
      };

      if (resolvedSpeed <= 0 || safeText.length === 0) {
        enterWaitingPhase();
        return;
      }

      this.typingTimer = setInterval(() => {
        idx += 1;
        if (this.logEl) {
          this.logEl.textContent = safeText.slice(0, idx);
        }
        if (idx >= safeText.length) {
          enterWaitingPhase();
        }
      }, resolvedSpeed);
    });
  }

  finishTypewriter() {
    if (this.typingTimer !== null) {
      clearInterval(this.typingTimer);
      this.typingTimer = null;
    }
    if (this.typingHoldTimer !== null) {
      clearTimeout(this.typingHoldTimer);
      this.typingHoldTimer = null;
    }
    if (this.logEl) {
      this.logEl.classList.remove('is-typing', 'is-waiting');
      if (this.typingFullText) {
        this.logEl.textContent = this.typingFullText;
      }
    }
    if (this.typingResolve) {
      const done = this.typingResolve;
      this.typingResolve = null;
      done();
    }
  }

  getSpriteCenter(side) {
    if (!this.stageEl) return { x: 180, y: 120 };
    const stageRect = this.stageEl.getBoundingClientRect();
    const targetEl = side === 'enemy' ? this.enemySpriteEl : this.playerSpriteEl;
    const rect = targetEl?.getBoundingClientRect();
    if (!rect || rect.width === 0) {
      return side === 'enemy'
        ? { x: stageRect.width * 0.75, y: stageRect.height * 0.34 }
        : { x: stageRect.width * 0.24, y: stageRect.height * 0.68 };
    }
    return {
      x: rect.left - stageRect.left + rect.width / 2,
      y: rect.top - stageRect.top + rect.height / 2,
    };
  }

  getPedestalPoint(side) {
    if (!this.stageEl) return { x: 180, y: 150 };
    const stageRect = this.stageEl.getBoundingClientRect();
    const mountSelector = side === 'enemy' ? '.fighter-mount-enemy .fighter-pedestal' : '.fighter-mount-player .fighter-pedestal';
    const pedEl = this.stageEl.querySelector(mountSelector);
    const rect = pedEl?.getBoundingClientRect();
    if (!rect || rect.width === 0) {
      const center = this.getSpriteCenter(side);
      return { x: center.x, y: center.y + 48 };
    }
    return {
      x: rect.left - stageRect.left + rect.width / 2,
      y: rect.top - stageRect.top + rect.height * 0.42,
    };
  }

  triggerScreenShake(intensity = 6, durationMs = 260) {
    this.shakeIntensity = Math.min(16, Math.max(2, intensity));
    this.shakeDuration = Math.max(0.08, durationMs / 1000);
    this.shakeTimer = this.shakeDuration;
  }

  spawnFloatingText(x, y, text, color = '#ffffff', size = 20, delay = 0, maxLife = 1.45) {
    this.popups.push({
      x,
      y,
      vy: -44,
      life: -delay,
      maxLife,
      text,
      color,
      size,
    });
  }

  spawnShinyIntroSparkles(side = 'enemy') {
    const center = this.getSpriteCenter(side);
    const colors = ['#fde047', '#fef08a', '#ffffff', '#f472b6'];
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24 + (Math.random() - 0.5) * 0.3;
      const speed = 42 + Math.random() * 96;
      this.particles.push({
        x: center.x + (Math.random() - 0.5) * 26,
        y: center.y + (Math.random() - 0.5) * 26,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 24,
        gravity: -18,
        life: -(i * 0.015),
        maxLife: 0.8 + Math.random() * 0.35,
        color: colors[i % colors.length],
        size: 4 + Math.random() * 3.5,
        rotation: angle,
        spin: 7,
        shape: 'star',
      });
    }
  }

  spawnEliteIntroAura(side = 'enemy') {
    const center = this.getSpriteCenter(side);
    const ringColors = ['#fbbf24', '#a855f7', '#fde047'];
    ringColors.forEach((color, idx) => {
      this.particles.push({
        x: center.x,
        y: center.y,
        vx: 0,
        vy: 0,
        gravity: 0,
        life: -(idx * 0.06),
        maxLife: 0.55,
        color,
        size: 16,
        maxRadius: 88 + idx * 20,
        lineWidth: 3.5,
        shape: 'ring',
      });
    });
    const auraColors = ['#fde047', '#c084fc', '#fb923c', '#ffffff'];
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      this.particles.push({
        x: center.x + Math.cos(angle) * 58,
        y: center.y + Math.sin(angle) * 44,
        orbitCenter: center,
        orbitAngle: angle,
        orbitRadius: 56 + (i % 3) * 10,
        orbitRadialVel: -16,
        orbitAngVel: i % 2 === 0 ? 5.2 : -4.4,
        life: -(i * 0.015),
        maxLife: 0.95,
        color: auraColors[i % auraColors.length],
        size: i % 3 === 0 ? 5.5 : 4,
        rotation: angle,
        spin: 6,
        shape: i % 2 === 0 ? 'star' : 'lightning',
      });
    }
  }

  spawnChargeParticles(side, type, pace, move = null) {
    const center = this.getSpriteCenter(side);
    const typesMap = getTypesMap();
    const typeColor = (typesMap[type] || typesMap.normal || FALLBACK_TYPES.normal).color;
    const lifeScale = pace?.particleLifeScale || 1.2;
    const moveId = move?.id || '';

    if (moveId === 'wild_volt' || moveId === 'thunder_fang') {
      const count = moveId === 'wild_volt' ? 12 : 8;
      if (moveId === 'wild_volt') {
        this.particles.push({
          x: center.x,
          y: center.y,
          vx: 0,
          vy: 0,
          gravity: 0,
          life: 0,
          maxLife: 0.28 * Math.min(1.3, lifeScale),
          color: '#fde047',
          size: 52,
          maxRadius: 12,
          shape: 'ring',
        });
      }
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
        const dist = 44 + Math.random() * 20;
        this.particles.push({
          x: center.x + Math.cos(angle) * dist,
          y: center.y + Math.sin(angle) * dist,
          vx: 0,
          vy: 0,
          gravity: 0,
          pullTo: center,
          life: 0,
          maxLife: 0.22 * Math.min(1.3, lifeScale),
          color: i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? '#38bdf8' : '#fde047',
          size: 4 + Math.random() * 2.5,
          rotation: angle,
          shape: i % 2 === 0 ? 'lightning' : 'bolt',
        });
      }
      return;
    }

    if (moveId === 'moonblast') {
      this.particles.push({
        x: center.x,
        y: center.y - 10,
        vx: 0,
        vy: 0,
        gravity: 0,
        life: 0,
        maxLife: 0.28 * Math.min(1.3, lifeScale),
        color: '#f472b6',
        size: 8,
        maxRadius: 48,
        shape: 'ring',
      });
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10;
        this.particles.push({
          x: center.x + Math.cos(angle) * 52,
          y: center.y + Math.sin(angle) * 44,
          orbitCenter: center,
          orbitAngle: angle,
          orbitRadius: 50,
          orbitRadialVel: -95,
          orbitAngVel: 7.5,
          life: 0,
          maxLife: 0.26 * Math.min(1.3, lifeScale),
          color: i % 2 === 0 ? '#f9a8d4' : '#c084fc',
          size: i % 3 === 0 ? 7.5 : 4.5,
          rotation: angle,
          spin: 5,
          shape: i % 3 === 0 ? 'crescent' : 'star',
        });
      }
      return;
    }

    if (moveId === 'calm_aura' || moveId === 'shadow_pulse') {
      const cols = moveId === 'calm_aura'
        ? ['#f472b6', '#c084fc', '#67e8f9', '#ffffff']
        : ['#a855f7', '#7e22ce', '#e9d5ff'];
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10;
        this.particles.push({
          x: center.x + Math.cos(angle) * 48,
          y: center.y + Math.sin(angle) * 38,
          orbitCenter: center,
          orbitAngle: angle,
          orbitRadius: 46,
          orbitRadialVel: -60,
          orbitAngVel: moveId === 'calm_aura' ? 4.8 : -7.2,
          life: 0,
          maxLife: 0.26 * Math.min(1.3, lifeScale),
          color: cols[i % cols.length],
          size: 4.5 + (i % 2) * 2,
          shape: moveId === 'calm_aura' ? 'star' : 'wisp',
        });
      }
      return;
    }

    if (moveId === 'iron_crush' || moveId === 'glacier_crash' || moveId === 'magma_cannon') {
      const cols = moveId === 'iron_crush'
        ? ['#ffffff', '#e2e8f0', '#94a3b8']
        : moveId === 'glacier_crash'
          ? ['#ffffff', '#67e8f9', '#bae6fd']
          : ['#fde047', '#fb923c', '#ef4444'];
      const pShape = moveId === 'iron_crush'
        ? 'star'
        : moveId === 'glacier_crash'
          ? 'crystal'
          : 'ember';
      if (moveId === 'iron_crush') {
        this.particles.push({
          x: center.x,
          y: center.y,
          vx: 0,
          vy: 0,
          gravity: 0,
          life: 0,
          maxLife: 0.22 * Math.min(1.3, lifeScale),
          color: '#ffffff',
          size: 10,
          maxRadius: 56,
          lineWidth: 4,
          shape: 'ring',
        });
      }
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.25;
        const dist = 42 + Math.random() * 16;
        this.particles.push({
          x: center.x + Math.cos(angle) * dist,
          y: center.y + Math.sin(angle) * dist,
          vx: 0,
          vy: 0,
          gravity: 0,
          pullTo: center,
          life: 0,
          maxLife: 0.24 * Math.min(1.3, lifeScale),
          color: cols[i % cols.length],
          size: 4.5 + Math.random() * 2.5,
          rotation: angle,
          spin: 8,
          shape: pShape,
        });
      }
      return;
    }

    const sprint5Charges = {
      leaf_blade: { cols: ['#22c55e', '#4ade80', '#bbf7d0', '#ffffff'], shape: 'leaf', ring: '#22c55e', orbit: false },
      eruption_flare: { cols: ['#fde047', '#fb923c', '#ef4444'], shape: 'ember', ring: '#f97316', orbit: false },
      aura_sphere: { cols: ['#38bdf8', '#6366f1', '#a5f3fc', '#ffffff'], shape: 'orb', ring: '#38bdf8', orbit: true, angVel: 7.5 },
      psycho_cut: { cols: ['#f472b6', '#e879f9', '#c084fc', '#ffffff'], shape: 'crescent', ring: '#f472b6', orbit: false },
      aqua_tail: { cols: ['#38bdf8', '#67e8f9', '#34d399', '#f472b6'], shape: 'bubble', ring: '#38bdf8', orbit: true, angVel: 6.2 },
      draco_meteor: { cols: ['#818cf8', '#fde047', '#c084fc', '#ffffff'], shape: 'star', ring: '#818cf8', orbit: false },
      omen_wind: { cols: ['#a855f7', '#67e8f9', '#c084fc', '#e0f2fe'], shape: 'crystal', ring: '#a855f7', orbit: true, angVel: -7.0 },
      doom_desire: { cols: ['#fde047', '#fef08a', '#38bdf8', '#ffffff'], shape: 'star', ring: '#fde047', orbit: true, angVel: 5.4 },
    };
    const s5 = sprint5Charges[moveId];
    if (s5) {
      this.particles.push({
        x: center.x,
        y: center.y,
        vx: 0,
        vy: 0,
        gravity: 0,
        life: 0,
        maxLife: 0.26 * Math.min(1.3, lifeScale),
        color: s5.ring,
        size: 10,
        maxRadius: 52,
        lineWidth: 3.2,
        shape: 'ring',
      });
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.2;
        const dist = 44 + Math.random() * 14;
        const particle = {
          x: center.x + Math.cos(angle) * dist,
          y: center.y + Math.sin(angle) * dist,
          vx: 0,
          vy: 0,
          gravity: 0,
          life: 0,
          maxLife: 0.26 * Math.min(1.3, lifeScale),
          color: s5.cols[i % s5.cols.length],
          size: s5.shape === 'crescent' ? 7 : 4.5 + Math.random() * 2.5,
          rotation: angle,
          spin: 7,
          shape: s5.shape,
        };
        if (s5.orbit) {
          particle.orbitCenter = center;
          particle.orbitAngle = angle;
          particle.orbitRadius = 48;
          particle.orbitRadialVel = -92;
          particle.orbitAngVel = s5.angVel;
        } else {
          particle.pullTo = center;
        }
        this.particles.push(particle);
      }
      return;
    }

    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.3;
      const dist = 42 + Math.random() * 18;
      this.particles.push({
        x: center.x + Math.cos(angle) * dist,
        y: center.y + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        gravity: 0,
        pullTo: center,
        life: 0,
        maxLife: 0.24 * Math.min(1.3, lifeScale),
        color: i % 2 === 0 ? '#ffffff' : typeColor,
        size: 3.5 + Math.random() * 2.5,
        shape: 'star',
      });
    }
  }

  spawnImpactDust(point, count = 10, lifeScale = 1.0) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 45 + Math.random() * 95;
      this.particles.push({
        x: point.x + (Math.random() - 0.5) * 26,
        y: point.y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.45 - 24,
        gravity: 25,
        life: 0,
        maxLife: (0.36 + Math.random() * 0.22) * lifeScale,
        color: i % 2 === 0 ? '#e2e8f0' : '#cbd5e1',
        size: 5 + Math.random() * 5,
        shape: 'dust',
      });
    }
  }

  spawnImpactFX(side, type, labelText = '', labelColor = '#ffffff', options = {}) {
    const pace = this.getPaceConfig();
    const lifeScale = options.lifeScale ?? pace.particleLifeScale ?? 1.2;
    const center = this.getSpriteCenter(side);
    const pedestal = this.getPedestalPoint(side);
    const typesMap = getTypesMap();
    const fxColors = {
      heal: '#4ade80',
      buff: '#fde047',
      shield: '#67e8f9',
    };
    const typeColor = typesMap[type]?.color || fxColors[type] || typesMap.normal?.color || '#cbd5e1';
    const count = options.count || 22;
    const moveId = options.moveId || '';

    if (options.ring) {
      const baseRadius = options.ringRadius || 78;
      this.particles.push({
        x: center.x,
        y: center.y,
        vx: 0,
        vy: 0,
        gravity: 0,
        life: 0,
        maxLife: 0.34 * Math.min(1.4, lifeScale),
        color: options.ringColor || typeColor,
        size: 14,
        maxRadius: baseRadius,
        shape: 'ring',
      });
      this.particles.push({
        x: center.x,
        y: center.y,
        vx: 0,
        vy: 0,
        gravity: 0,
        life: -0.055,
        maxLife: 0.42 * Math.min(1.4, lifeScale),
        color: options.secondaryRingColor || '#ffffff',
        size: 18,
        maxRadius: Math.round(baseRadius * 1.32),
        shape: 'ring',
      });
    }

    if (options.dust) {
      this.spawnImpactDust(pedestal, 12, lifeScale);
    }

    const shapeMap = {
      fire: 'ember',
      water: 'bubble',
      grass: 'leaf',
      electric: 'bolt',
      psychic: 'star',
      ice: 'crystal',
      ghost: 'wisp',
      dragon: 'dragonflame',
      heal: 'star',
      buff: 'star',
      shield: 'crystal',
      star: 'star',
      wind: 'wind',
      slash: 'slash',
      note: 'note',
    };
    const shape = options.shapeOverride || shapeMap[type] || 'circle';

    if (options.slash) {
      const slashAngles = moveId === 'thunder_fang'
        ? [-0.85, 0.85, -0.45, 0.45, 0.05]
        : moveId === 'leaf_blade'
          ? [-0.785, 0.785, -0.785, 0.785]
          : moveId === 'psycho_cut'
            ? [-0.65, 0.65, -0.25, 0.25]
            : [-0.65, 0.65, -0.35, 0.45];
      slashAngles.forEach((ang, idx) => {
        this.particles.push({
          x: center.x + (Math.random() - 0.5) * (moveId === 'leaf_blade' ? 12 : 18),
          y: center.y + (Math.random() - 0.5) * (moveId === 'leaf_blade' ? 12 : 18),
          vx: Math.cos(ang) * (moveId === 'leaf_blade' ? 58 : 42),
          vy: Math.sin(ang) * (moveId === 'leaf_blade' ? 58 : 42),
          gravity: 0,
          life: -(idx * 0.022),
          maxLife: (moveId === 'leaf_blade' ? 0.28 : 0.24) * Math.min(1.4, lifeScale),
          color: idx % 2 === 0 ? (options.slashColor || typeColor) : '#ffffff',
          size: (moveId === 'leaf_blade' ? 18 : 14) + Math.random() * 5,
          rotation: ang,
          spin: 0,
          shape: 'slash',
        });
      });
    }

    if (options.extraDust) {
      this.spawnImpactDust(pedestal, 10, lifeScale);
    }

    // Move-specific signature impact spectacles for Sprint 4 moves
    if (moveId === 'thunder_fang') {
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI * 2 * i) / 6;
        this.particles.push({
          x: center.x + Math.cos(ang) * 14,
          y: center.y + Math.sin(ang) * 14,
          vx: Math.cos(ang) * 95,
          vy: Math.sin(ang) * 95,
          gravity: 0,
          life: -(i * 0.015),
          maxLife: 0.28 * Math.min(1.4, lifeScale),
          color: i % 2 === 0 ? '#fde047' : '#38bdf8',
          size: 9 + Math.random() * 4,
          rotation: ang + 0.4,
          shape: 'lightning',
        });
      }
    } else if (moveId === 'wild_volt') {
      for (let i = 0; i < 8; i++) {
        const ox = (i - 3.5) * 16 + (Math.random() - 0.5) * 8;
        this.particles.push({
          x: center.x + ox,
          y: center.y - 68,
          vx: (Math.random() - 0.5) * 28,
          vy: 230 + Math.random() * 90,
          gravity: 0,
          life: -(i * 0.022),
          maxLife: 0.32 * Math.min(1.4, lifeScale),
          color: i % 3 === 0 ? '#ffffff' : '#fde047',
          size: 12 + Math.random() * 5,
          rotation: (Math.random() - 0.5) * 0.35,
          shape: 'lightning',
        });
      }
    } else if (moveId === 'moonblast') {
      const moonCols = ['#f472b6', '#e879f9', '#c084fc', '#fef08a', '#ffffff'];
      for (let i = 0; i < 10; i++) {
        const ang = (Math.PI * 2 * i) / 10;
        const speed = 75 + Math.random() * 115;
        this.particles.push({
          x: center.x,
          y: center.y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed - 18,
          gravity: 10,
          life: -(i * 0.014),
          maxLife: (0.48 + Math.random() * 0.22) * lifeScale,
          color: moonCols[i % moonCols.length],
          size: 7 + Math.random() * 4,
          rotation: ang,
          spin: 5,
          shape: 'crescent',
        });
      }
    } else if (moveId === 'calm_aura') {
      const orbCols = ['#f472b6', '#c084fc', '#67e8f9', '#ffffff'];
      [68, 92, 114].forEach((rad, idx) => {
        this.particles.push({
          x: center.x,
          y: center.y,
          vx: 0,
          vy: 0,
          gravity: 0,
          life: -(idx * 0.06),
          maxLife: 0.55 * Math.min(1.4, lifeScale),
          color: orbCols[idx % orbCols.length],
          size: 18,
          maxRadius: rad,
          lineWidth: 2.8,
          shape: 'ring',
        });
      });
      for (let i = 0; i < 12; i++) {
        const ang = (Math.PI * 2 * i) / 12;
        this.particles.push({
          x: center.x + Math.cos(ang) * 54,
          y: center.y + Math.sin(ang) * 38,
          orbitCenter: center,
          orbitAngle: ang,
          orbitRadius: 52 + (i % 2) * 14,
          orbitRadialVel: -4,
          orbitAngVel: i % 2 === 0 ? 3.8 : -3.4,
          life: -(i * 0.02),
          maxLife: 0.92 * Math.min(1.3, lifeScale),
          color: orbCols[i % orbCols.length],
          size: i % 2 === 0 ? 5 : 4,
          rotation: ang,
          spin: 4,
          shape: i % 3 === 0 ? 'crystal' : 'star',
        });
      }
    } else if (moveId === 'shadow_pulse') {
      ['#a855f7', '#c084fc', '#e9d5ff'].forEach((col, idx) => {
        this.particles.push({
          x: center.x,
          y: center.y,
          vx: 0,
          vy: 0,
          gravity: 0,
          life: -(idx * 0.06),
          maxLife: 0.46 * Math.min(1.4, lifeScale),
          color: col,
          size: 16,
          maxRadius: 72 + idx * 28,
          lineWidth: 3.4,
          shape: 'ring',
        });
      });
    } else if (moveId === 'iron_crush') {
      this.particles.push({
        x: pedestal.x,
        y: pedestal.y,
        vx: 0,
        vy: 0,
        gravity: 0,
        life: -0.03,
        maxLife: 0.38 * Math.min(1.4, lifeScale),
        color: '#d6a36b',
        size: 16,
        maxRadius: 110,
        lineWidth: 4.5,
        shape: 'ring',
      });
      for (let i = 0; i < 12; i++) {
        const ang = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.3;
        const speed = 75 + Math.random() * 120;
        this.particles.push({
          x: center.x + (Math.random() - 0.5) * 20,
          y: center.y + (Math.random() - 0.5) * 16,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed - 65,
          gravity: 320,
          life: 0,
          maxLife: (0.48 + Math.random() * 0.25) * lifeScale,
          color: i % 3 === 0 ? '#cbd5e1' : i % 2 === 0 ? '#94a3b8' : '#64748b',
          size: 5 + Math.random() * 4,
          rotation: ang,
          spin: (Math.random() - 0.5) * 12,
          shape: 'stone',
        });
      }
    } else if (moveId === 'glacier_crash') {
      for (let i = 0; i < 12; i++) {
        const ang = (Math.PI * 2 * i) / 12 + Math.random() * 0.2;
        const speed = 95 + Math.random() * 145;
        this.particles.push({
          x: center.x + (Math.random() - 0.5) * 20,
          y: center.y + (Math.random() - 0.5) * 20,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed - 50,
          gravity: 165,
          life: 0,
          maxLife: (0.5 + Math.random() * 0.25) * lifeScale,
          color: i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? '#bae6fd' : '#67e8f9',
          size: 6 + Math.random() * 4,
          rotation: ang,
          spin: (Math.random() - 0.5) * 12,
          shape: 'crystal',
        });
      }
    } else if (moveId === 'magma_cannon') {
      const lavaCols = ['#fde047', '#fb923c', '#ef4444', '#dc2626'];
      for (let i = 0; i < 18; i++) {
        const spreadVx = (Math.random() - 0.5) * 210;
        const upVy = -(130 + Math.random() * 150);
        this.particles.push({
          x: center.x + (Math.random() - 0.5) * 26,
          y: center.y + 8,
          vx: spreadVx,
          vy: upVy,
          gravity: 270,
          life: -(i * 0.012),
          maxLife: (0.55 + Math.random() * 0.28) * lifeScale,
          color: lavaCols[i % lavaCols.length],
          size: 5.5 + Math.random() * 4.5,
          shape: 'ember',
        });
      }
    } else if (moveId === 'leaf_blade') {
      const leafCols = ['#22c55e', '#4ade80', '#10b981', '#bbf7d0'];
      for (let i = 0; i < 14; i++) {
        const ang = (Math.PI * 2 * i) / 14 + Math.random() * 0.25;
        const spd = 95 + Math.random() * 130;
        this.particles.push({
          x: center.x,
          y: center.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 20,
          gravity: 50,
          life: -(i * 0.01),
          maxLife: (0.48 + Math.random() * 0.22) * lifeScale,
          color: leafCols[i % leafCols.length],
          size: 7.5 + Math.random() * 3.5,
          rotation: ang,
          spin: (Math.random() - 0.5) * 14,
          shape: 'leaf',
        });
      }
    } else if (moveId === 'eruption_flare') {
      const lavaCols = ['#fef08a', '#fb923c', '#ef4444', '#b91c1c'];
      for (let i = 0; i < 20; i++) {
        this.particles.push({
          x: pedestal.x + (Math.random() - 0.5) * 44,
          y: pedestal.y - 4,
          vx: (Math.random() - 0.5) * 200,
          vy: -(165 + Math.random() * 155),
          gravity: 310,
          life: -(i * 0.014),
          maxLife: (0.56 + Math.random() * 0.28) * lifeScale,
          color: lavaCols[i % lavaCols.length],
          size: 6 + Math.random() * 4.5,
          shape: 'ember',
        });
      }
    } else if (moveId === 'aura_sphere') {
      ['#38bdf8', '#6366f1', '#ffffff'].forEach((col, idx) => {
        this.particles.push({
          x: center.x,
          y: center.y,
          vx: 0,
          vy: 0,
          gravity: 0,
          life: -(idx * 0.05),
          maxLife: 0.44 * Math.min(1.4, lifeScale),
          color: col,
          size: 16,
          maxRadius: 72 + idx * 24,
          lineWidth: 3.8,
          shape: 'ring',
        });
      });
      for (let i = 0; i < 14; i++) {
        const ang = (Math.PI * 2 * i) / 14;
        const spd = 110 + Math.random() * 110;
        this.particles.push({
          x: center.x,
          y: center.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          gravity: 0,
          life: 0,
          maxLife: 0.45 * lifeScale,
          color: i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? '#38bdf8' : '#818cf8',
          size: i % 3 === 0 ? 7 : 5,
          rotation: ang,
          spin: 8,
          shape: i % 3 === 0 ? 'orb' : 'star',
        });
      }
    } else if (moveId === 'psycho_cut') {
      const cutCols = ['#f472b6', '#e879f9', '#c084fc', '#ffffff'];
      [-0.7, 0.7].forEach((ang, idx) => {
        this.particles.push({
          x: center.x + (idx === 0 ? -10 : 10),
          y: center.y,
          vx: Math.cos(ang) * 70,
          vy: Math.sin(ang) * 70,
          gravity: 0,
          life: -(idx * 0.03),
          maxLife: 0.34 * Math.min(1.4, lifeScale),
          color: cutCols[idx],
          size: 16,
          rotation: ang,
          spin: idx === 0 ? 6 : -6,
          shape: 'crescent',
        });
      });
    } else if (moveId === 'aqua_tail') {
      const prismCols = ['#38bdf8', '#67e8f9', '#34d399', '#c084fc', '#f472b6'];
      for (let i = 0; i < 14; i++) {
        const ang = (Math.PI * 2 * i) / 14;
        const spd = 90 + Math.random() * 125;
        this.particles.push({
          x: center.x,
          y: center.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 36,
          gravity: -40,
          life: -(i * 0.01),
          maxLife: (0.48 + Math.random() * 0.2) * lifeScale,
          color: prismCols[i % prismCols.length],
          size: 5 + Math.random() * 4,
          rotation: ang,
          spin: 7,
          shape: i % 3 === 0 ? 'star' : 'bubble',
        });
      }
    } else if (moveId === 'draco_meteor') {
      this.particles.push({
        x: pedestal.x,
        y: pedestal.y,
        vx: 0,
        vy: 0,
        gravity: 0,
        life: -0.02,
        maxLife: 0.42 * Math.min(1.4, lifeScale),
        color: '#818cf8',
        size: 18,
        maxRadius: 118,
        lineWidth: 4.5,
        shape: 'ring',
      });
      for (let i = 0; i < 12; i++) {
        const ang = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.25;
        const spd = 90 + Math.random() * 145;
        this.particles.push({
          x: center.x + (Math.random() - 0.5) * 24,
          y: center.y + 6,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 75,
          gravity: 310,
          life: 0,
          maxLife: (0.5 + Math.random() * 0.25) * lifeScale,
          color: i % 2 === 0 ? '#94a3b8' : '#6366f1',
          size: 5 + Math.random() * 4,
          rotation: ang,
          spin: (Math.random() - 0.5) * 12,
          shape: 'stone',
        });
      }
    } else if (moveId === 'omen_wind') {
      const omenCols = ['#a855f7', '#67e8f9', '#c084fc', '#e0f2fe'];
      for (let i = 0; i < 14; i++) {
        const ang = (Math.PI * 2 * i) / 14;
        this.particles.push({
          x: center.x + Math.cos(ang) * 42,
          y: center.y + Math.sin(ang) * 32,
          orbitCenter: center,
          orbitAngle: ang,
          orbitRadius: 40 + (i % 3) * 12,
          orbitRadialVel: 28,
          orbitAngVel: i % 2 === 0 ? 8.5 : -7.5,
          life: -(i * 0.014),
          maxLife: 0.62 * Math.min(1.3, lifeScale),
          color: omenCols[i % omenCols.length],
          size: i % 3 === 0 ? 7.5 : 5.5,
          rotation: ang,
          spin: 8,
          shape: i % 3 === 0 ? 'wind' : i % 2 === 0 ? 'crystal' : 'wisp',
        });
      }
    } else if (moveId === 'doom_desire') {
      this.particles.push({
        x: center.x,
        y: center.y,
        vx: 0,
        vy: 0,
        gravity: 0,
        life: 0,
        maxLife: 0.36 * Math.min(1.4, lifeScale),
        color: '#fde047',
        size: 36,
        shape: 'beam',
      });
      for (let i = 0; i < 14; i++) {
        const ang = (Math.PI * 2 * i) / 14;
        const spd = 105 + Math.random() * 145;
        this.particles.push({
          x: center.x,
          y: center.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 32,
          gravity: 80,
          life: 0,
          maxLife: (0.55 + Math.random() * 0.25) * lifeScale,
          color: i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? '#fde047' : '#38bdf8',
          size: 5.5 + Math.random() * 4,
          rotation: ang,
          spin: 9,
          shape: 'star',
        });
      }
    }

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.35;
      const speed = 75 + Math.random() * 155;
      const isBuoyant = shape === 'ember' || shape === 'bubble' || shape === 'wisp' || shape === 'dragonflame' || shape === 'note';
      let pShape = shape;
      let pColor = i % 3 === 0 ? '#ffffff' : typeColor;
      if (options.aurora) {
        const auroraCols = ['#67e8f9', '#a7f3d0', '#f472b6', '#ffffff'];
        pColor = auroraCols[i % auroraCols.length];
        if (i % 3 === 0) pShape = 'star';
      } else if (options.petalColors) {
        const petalCols = ['#22c55e', '#4ade80', '#f9a8d4', '#fbcfe8'];
        pColor = petalCols[i % petalCols.length];
      } else if (options.extraNotes && i % 2 === 0) {
        pShape = 'note';
        const noteCols = ['#fde047', '#f472b6', '#38bdf8', '#ffffff'];
        pColor = noteCols[i % noteCols.length];
      } else if (moveId === 'moonblast') {
        const moonCols = ['#f472b6', '#e879f9', '#c084fc', '#ffffff'];
        pColor = moonCols[i % moonCols.length];
        pShape = i % 3 === 0 ? 'wisp' : 'star';
      } else if (moveId === 'calm_aura') {
        const calmCols = ['#fbcfe8', '#e9d5ff', '#a5f3fc', '#ffffff'];
        pColor = calmCols[i % calmCols.length];
        pShape = 'star';
      } else if (moveId === 'shadow_pulse') {
        const ghostCols = ['#a855f7', '#7e22ce', '#c084fc', '#e9d5ff'];
        pColor = ghostCols[i % ghostCols.length];
        pShape = 'wisp';
      } else if (moveId === 'leaf_blade') {
        const leafCols = ['#22c55e', '#4ade80', '#bbf7d0', '#ffffff'];
        pColor = leafCols[i % leafCols.length];
        pShape = i % 2 === 0 ? 'leaf' : 'star';
      } else if (moveId === 'aura_sphere') {
        const auraCols = ['#38bdf8', '#6366f1', '#a5f3fc', '#ffffff'];
        pColor = auraCols[i % auraCols.length];
        pShape = i % 3 === 0 ? 'wisp' : 'star';
      } else if (moveId === 'psycho_cut') {
        const cutCols = ['#f472b6', '#e879f9', '#c084fc', '#ffffff'];
        pColor = cutCols[i % cutCols.length];
        pShape = i % 3 === 0 ? 'crescent' : 'star';
      } else if (moveId === 'aqua_tail') {
        const prismCols = ['#38bdf8', '#67e8f9', '#34d399', '#f472b6'];
        pColor = prismCols[i % prismCols.length];
        pShape = i % 2 === 0 ? 'bubble' : 'star';
      } else if (moveId === 'draco_meteor') {
        const cometCols = ['#fde047', '#818cf8', '#c084fc', '#f472b6'];
        pColor = cometCols[i % cometCols.length];
        pShape = i % 2 === 0 ? 'dragonflame' : 'star';
      } else if (moveId === 'omen_wind') {
        const omenCols = ['#a855f7', '#67e8f9', '#c084fc', '#e0f2fe'];
        pColor = omenCols[i % omenCols.length];
        pShape = i % 3 === 0 ? 'crystal' : 'wisp';
      } else if (moveId === 'doom_desire') {
        const starCols = ['#fde047', '#fef08a', '#38bdf8', '#ffffff'];
        pColor = starCols[i % starCols.length];
        pShape = 'star';
      }
      this.particles.push({
        x: center.x + (Math.random() - 0.5) * 18,
        y: center.y + (Math.random() - 0.5) * 18,
        vx: Math.cos(angle) * speed,
        vy: moveId === 'calm_aura'
          ? -30 - Math.random() * 50
          : Math.sin(angle) * speed - (isBuoyant ? 55 : 22),
        gravity: moveId === 'calm_aura'
          ? -36
          : isBuoyant ? -75 : pShape === 'leaf' || pShape === 'crystal' ? 48 : 190,
        life: 0,
        maxLife: (0.45 + Math.random() * 0.28) * lifeScale,
        color: pColor,
        size: pShape === 'leaf' ? 7 + Math.random() * 4 : 3.5 + Math.random() * 4.5,
        rotation: angle,
        spin: (Math.random() - 0.5) * 10,
        shape: pShape,
      });
    }

    if (labelText) {
      this.spawnFloatingText(
        center.x,
        center.y - 24,
        labelText,
        labelColor,
        options.fontSize || 24,
        0,
        options.popupLife || 1.45,
      );
    }
  }

  spawnPhysicalElementalTrail(attackerSide, defenderSide, move, pace) {
    if (!move || (move.type === 'normal' && move.fx !== 'wind')) return;
    const start = this.getSpriteCenter(attackerSide);
    const target = this.getSpriteCenter(defenderSide);
    const typesMap = getTypesMap();
    const typeMeta = typesMap[move.type] || typesMap.normal || FALLBACK_TYPES.normal;
    const lifeScale = pace?.particleLifeScale || 1.2;
    const shape = resolveMoveParticleShape(move);
    const dx = target.x - start.x;
    const dy = target.y - start.y;
    const angle = Math.atan2(dy, dx);
    const steps = move.id === 'wild_volt' || move.id === 'leaf_blade'
      ? 9
      : move.id === 'aqua_tail'
        ? 10
        : move.id === 'psycho_cut'
          ? 8
          : 7;

    for (let s = 0; s < steps; s++) {
      const t = s / Math.max(1, steps - 1);
      const px = start.x + dx * (0.2 + t * 0.72);
      const py = start.y + dy * (0.2 + t * 0.72);
      const isPetal = move.id === 'petal_blizzard';
      let color = isPetal && s % 2 === 1 ? '#f9a8d4' : (s % 2 === 0 ? typeMeta.color : '#ffffff');
      let pShape = shape;
      if (move.id === 'leaf_blade') {
        color = s % 3 === 0 ? '#bbf7d0' : s % 2 === 0 ? '#22c55e' : '#4ade80';
        pShape = s % 2 === 0 ? 'slash' : 'leaf';
      } else if (move.id === 'psycho_cut') {
        const dist = Math.max(1, Math.hypot(dx, dy));
        const perpX = -dy / dist;
        const perpY = dx / dist;
        [-11, 11].forEach((off, laneIdx) => {
          this.particles.push({
            x: px + perpX * off,
            y: py + perpY * off,
            vx: Math.cos(angle) * 68,
            vy: Math.sin(angle) * 68,
            gravity: 0,
            life: -(s * 0.014),
            maxLife: 0.24 * Math.min(1.4, lifeScale),
            color: (s + laneIdx) % 2 === 0 ? '#f472b6' : '#c084fc',
            size: 9 + (s % 2) * 2,
            rotation: angle + (laneIdx === 0 ? -0.35 : 0.35),
            spin: laneIdx === 0 ? 7 : -7,
            shape: 'crescent',
          });
        });
        continue;
      } else if (move.id === 'aqua_tail') {
        const dist = Math.max(1, Math.hypot(dx, dy));
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const wave = Math.sin(t * Math.PI * 3) * 18;
        const prismCols = ['#38bdf8', '#67e8f9', '#34d399', '#c084fc', '#f472b6'];
        color = prismCols[s % prismCols.length];
        pShape = s % 3 === 0 ? 'slash' : s % 2 === 0 ? 'bubble' : 'star';
        this.particles.push({
          x: px + perpX * wave,
          y: py + perpY * wave,
          vx: Math.cos(angle) * 58,
          vy: Math.sin(angle) * 58,
          gravity: -15,
          life: -(s * 0.012),
          maxLife: 0.28 * Math.min(1.4, lifeScale),
          color,
          size: pShape === 'slash' ? 12 : 6.5,
          rotation: angle + wave * 0.04,
          spin: 6,
          shape: pShape,
        });
        continue;
      } else if (move.id === 'thunder_fang') {
        color = s % 2 === 0 ? '#fde047' : '#38bdf8';
        pShape = s % 3 === 0 ? 'slash' : 'lightning';
      } else if (move.id === 'wild_volt') {
        color = s % 2 === 0 ? '#fde047' : '#ffffff';
        pShape = s % 2 === 0 ? 'lightning' : 'star';
        if (s % 3 === 1) {
          this.particles.push({
            x: px,
            y: py,
            vx: 0,
            vy: 0,
            gravity: 0,
            life: -(s * 0.015),
            maxLife: 0.24 * Math.min(1.4, lifeScale),
            color: '#fde047',
            size: 10,
            maxRadius: 34,
            shape: 'ring',
          });
        }
      } else if (move.id === 'iron_crush') {
        color = s % 2 === 0 ? '#e2e8f0' : '#94a3b8';
        pShape = s % 2 === 0 ? 'slash' : 'stone';
      } else if (move.id === 'glacier_crash') {
        color = s % 2 === 0 ? '#67e8f9' : '#e0f2fe';
        pShape = 'crystal';
      }
      this.particles.push({
        x: px + (Math.random() - 0.5) * 16,
        y: py + (Math.random() - 0.5) * 16,
        vx: Math.cos(angle) * (45 + Math.random() * 55),
        vy: Math.sin(angle) * (45 + Math.random() * 55),
        gravity: 10,
        life: -(s * 0.014),
        maxLife: (0.24 + Math.random() * 0.14) * Math.min(1.4, lifeScale),
        color,
        size: pShape === 'slash' ? 11 + Math.random() * 4 : pShape === 'leaf' ? 7 : 5.5 + Math.random() * 3,
        rotation: angle + (Math.random() - 0.5) * 0.5,
        spin: pShape === 'leaf' || pShape === 'crystal' ? 9 : 2,
        shape: pShape,
      });
    }
  }

  async animateElementalStream(attackerSide, defenderSide, move, sessionId) {
    const pace = this.getPaceConfig();
    const start = this.getSpriteCenter(attackerSide);
    const target = this.getSpriteCenter(defenderSide);
    const typesMap = getTypesMap();
    const typeMeta = typesMap[move.type] || typesMap.normal || FALLBACK_TYPES.normal;

    const shape = resolveMoveParticleShape(move);
    const steps = pace.streamSteps || 14;
    const stepWaitMs = pace.streamStepMs || 30;
    const lifeScale = pace.particleLifeScale || 1.2;
    const dx = target.x - start.x;
    const dy = target.y - start.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const perpX = -dy / dist;
    const perpY = dx / dist;

    for (let s = 0; s < steps; s++) {
      if (!this.isSessionValid(sessionId)) return;
      const t = s / Math.max(1, steps - 1);
      const ctrlX = (start.x + target.x) * 0.5;
      const ctrlY = Math.min(start.y, target.y) - 48;
      const inv = 1 - t;
      const px = inv * inv * start.x + 2 * inv * t * ctrlX + t * t * target.x;
      const py = inv * inv * start.y + 2 * inv * t * ctrlY + t * t * target.y;

      if (move.id === 'magma_cannon') {
        // Dual-core intertwined molten fireball stream
        const helix = Math.sin(t * Math.PI * 4) * 14;
        const angle = Math.atan2(dy, dx);
        const cores = [
          { offset: helix, color: '#fde047', trail: '#fb923c' },
          { offset: -helix, color: '#ef4444', trail: '#dc2626' },
        ];
        for (const core of cores) {
          const cx = px + perpX * core.offset;
          const cy = py + perpY * core.offset;
          this.particles.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * 60 + (Math.random() - 0.5) * 20,
            vy: Math.sin(angle) * 60 - 15,
            gravity: -40,
            life: 0,
            maxLife: 0.36 * Math.min(1.4, lifeScale),
            color: core.color,
            size: 7.5 + Math.random() * 2.5,
            shape: 'ember',
          });
          this.particles.push({
            x: cx + (Math.random() - 0.5) * 10,
            y: cy + (Math.random() - 0.5) * 10,
            vx: (Math.random() - 0.5) * 45,
            vy: -30 - Math.random() * 35,
            gravity: -65,
            life: 0,
            maxLife: 0.32 * Math.min(1.4, lifeScale),
            color: core.trail,
            size: 4.5 + Math.random() * 2.5,
            shape: 'ember',
          });
        }
        if (s < steps - 1) {
          await this.wait(stepWaitMs, sessionId);
        }
        continue;
      }

      if (move.id === 'eruption_flare') {
        const angle = Math.atan2(dy, dx);
        const plumeCols = ['#fef08a', '#fb923c', '#ef4444'];
        for (let k = 0; k < 3; k++) {
          this.particles.push({
            x: px + (Math.random() - 0.5) * 18,
            y: py + (Math.random() - 0.5) * 14,
            vx: Math.cos(angle) * 55 + (Math.random() - 0.5) * 35,
            vy: -35 - Math.random() * 55,
            gravity: -55,
            life: 0,
            maxLife: 0.36 * Math.min(1.4, lifeScale),
            color: plumeCols[(s + k) % plumeCols.length],
            size: 6.5 + Math.random() * 3.5,
            shape: 'ember',
          });
        }
        if (s % 2 === 0) {
          this.particles.push({
            x: px + (Math.random() - 0.5) * 16,
            y: py - 6,
            vx: (Math.random() - 0.5) * 30,
            vy: -45 - Math.random() * 30,
            gravity: -40,
            life: 0,
            maxLife: 0.4 * Math.min(1.4, lifeScale),
            color: '#78716c',
            size: 7 + Math.random() * 3,
            shape: 'dust',
          });
        }
        if (s < steps - 1) await this.wait(stepWaitMs, sessionId);
        continue;
      }

      if (move.id === 'aura_sphere') {
        const helix = Math.sin(t * Math.PI * 4.5) * 16;
        const angle = Math.atan2(dy, dx);
        this.particles.push({
          x: px,
          y: py,
          vx: Math.cos(angle) * 40,
          vy: Math.sin(angle) * 40,
          gravity: 0,
          life: 0,
          maxLife: 0.22 * Math.min(1.4, lifeScale),
          color: '#38bdf8',
          size: 11 + t * 3,
          shape: 'orb',
        });
        [1, -1].forEach((dir, idx) => {
          this.particles.push({
            x: px + perpX * helix * dir,
            y: py + perpY * helix * dir,
            vx: (Math.random() - 0.5) * 26,
            vy: (Math.random() - 0.5) * 26,
            gravity: 0,
            life: 0,
            maxLife: 0.32 * Math.min(1.4, lifeScale),
            color: idx === 0 ? '#6366f1' : '#a5f3fc',
            size: 5 + Math.random() * 2,
            rotation: angle + t * 4,
            spin: 6,
            shape: idx === 0 ? 'wisp' : 'star',
          });
        });
        if (s < steps - 1) await this.wait(stepWaitMs, sessionId);
        continue;
      }

      if (move.id === 'draco_meteor') {
        const skyX = target.x - 95 + (s % 4) * 42 + (Math.random() - 0.5) * 24;
        const skyY = Math.max(-16, target.y - 165);
        const flightTime = 0.24;
        const vx = (target.x + (Math.random() - 0.5) * 22 - skyX) / flightTime;
        const vy = (target.y + (Math.random() - 0.5) * 18 - skyY) / flightTime;
        const cometAng = Math.atan2(vy, vx);
        this.particles.push({
          x: skyX,
          y: skyY,
          vx,
          vy,
          gravity: 0,
          life: 0,
          maxLife: flightTime * 1.08,
          color: s % 2 === 0 ? '#fde047' : '#818cf8',
          size: 9.5,
          rotation: cometAng,
          spin: 0,
          shape: 'dragonflame',
        });
        this.particles.push({
          x: skyX,
          y: skyY,
          vx: vx * 0.92,
          vy: vy * 0.92,
          gravity: 0,
          life: 0,
          maxLife: flightTime * 1.12,
          color: s % 2 === 0 ? '#c084fc' : '#ffffff',
          size: 11,
          rotation: cometAng,
          spin: 0,
          shape: 'slash',
        });
        this.particles.push({
          x: skyX + (Math.random() - 0.5) * 14,
          y: skyY + (Math.random() - 0.5) * 14,
          vx: vx * 0.78,
          vy: vy * 0.78,
          gravity: 0,
          life: 0,
          maxLife: flightTime * 1.15,
          color: '#fde047',
          size: 5.5,
          rotation: cometAng,
          spin: 8,
          shape: 'star',
        });
        if (s < steps - 1) await this.wait(stepWaitMs, sessionId);
        continue;
      }

      if (move.id === 'omen_wind') {
        const vortexR = 8 + t * 24;
        const ang = t * Math.PI * 5;
        const vxX = px + perpX * Math.cos(ang) * vortexR;
        const vxY = py + perpY * Math.sin(ang) * vortexR;
        const omenCols = ['#a855f7', '#67e8f9', '#c084fc', '#e0f2fe'];
        for (let k = 0; k < 3; k++) {
          const pShape = k === 0 ? 'wind' : k === 1 ? 'crystal' : 'wisp';
          this.particles.push({
            x: vxX + (Math.random() - 0.5) * 12,
            y: vxY + (Math.random() - 0.5) * 12,
            vx: (dx / dist) * 70 + (Math.random() - 0.5) * 35,
            vy: (dy / dist) * 70 + (Math.random() - 0.5) * 35,
            gravity: -20,
            life: 0,
            maxLife: 0.36 * Math.min(1.4, lifeScale),
            color: omenCols[(s + k) % omenCols.length],
            size: pShape === 'wind' ? 8.5 : 5.5,
            rotation: ang + k * 0.8,
            spin: 9,
            shape: pShape,
          });
        }
        if (s < steps - 1) await this.wait(stepWaitMs, sessionId);
        continue;
      }

      if (move.id === 'doom_desire') {
        const sigilY = Math.max(22, target.y - 76);
        if (t < 0.48) {
          const sigilR = 30;
          const vAng = (s % 5) * ((Math.PI * 2) / 5) - Math.PI * 0.5;
          this.particles.push({
            x: target.x + Math.cos(vAng) * sigilR,
            y: sigilY + Math.sin(vAng) * sigilR * 0.62,
            vx: 0,
            vy: 0,
            gravity: 0,
            life: 0,
            maxLife: 0.4 * Math.min(1.4, lifeScale),
            color: s % 2 === 0 ? '#fde047' : '#38bdf8',
            size: 6.5,
            rotation: vAng,
            spin: 6,
            shape: 'star',
          });
          if (s % 3 === 0) {
            this.particles.push({
              x: target.x,
              y: sigilY,
              vx: 0,
              vy: 0,
              gravity: 0,
              life: 0,
              maxLife: 0.34 * Math.min(1.4, lifeScale),
              color: '#fef08a',
              size: 14,
              maxRadius: 42,
              lineWidth: 2.5,
              shape: 'ring',
            });
          }
        } else {
          this.particles.push({
            x: target.x,
            y: target.y,
            vx: 0,
            vy: 0,
            gravity: 0,
            life: 0,
            maxLife: 0.24 * Math.min(1.4, lifeScale),
            color: '#fde047',
            size: 28,
            shape: 'beam',
          });
          for (let k = 0; k < 3; k++) {
            this.particles.push({
              x: target.x + (Math.random() - 0.5) * 24,
              y: sigilY + Math.random() * 76,
              vx: (Math.random() - 0.5) * 45,
              vy: 145 + Math.random() * 80,
              gravity: 0,
              life: 0,
              maxLife: 0.3 * Math.min(1.4, lifeScale),
              color: k === 0 ? '#ffffff' : k === 1 ? '#fde047' : '#38bdf8',
              size: 5 + Math.random() * 2.5,
              rotation: k,
              spin: 8,
              shape: 'star',
            });
          }
        }
        if (s < steps - 1) await this.wait(stepWaitMs, sessionId);
        continue;
      }

      if (move.id === 'shadow_pulse' && s % 3 === 0) {
        this.particles.push({
          x: px,
          y: py,
          vx: (dx / dist) * 85,
          vy: (dy / dist) * 85,
          gravity: 0,
          life: 0,
          maxLife: 0.36 * Math.min(1.4, lifeScale),
          color: s % 2 === 0 ? '#a855f7' : '#c084fc',
          size: 8,
          maxRadius: 34 + t * 22,
          lineWidth: 2.8,
          shape: 'ring',
        });
      }

      const burstCount = shape === 'leaf' ? 3 : 4;
      for (let k = 0; k < burstCount; k++) {
        const spread = (Math.random() - 0.5) * 18;
        const speed = 55 + Math.random() * 75;
        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.38;
        let particleShape = shape;
        let particleColor = k === 0 && shape !== 'leaf' ? '#ffffff' : typeMeta.color;

        if (move.id === 'star_melody') {
          particleShape = k % 2 === 0 ? 'note' : 'star';
          const melodyCols = ['#fde047', '#f472b6', '#38bdf8', '#ffffff'];
          particleColor = melodyCols[(s + k) % melodyCols.length];
        } else if (move.id === 'hyper_nova') {
          particleShape = 'star';
          const novaCols = ['#fde047', '#c084fc', '#38bdf8', '#ffffff'];
          particleColor = novaCols[(s + k) % novaCols.length];
        } else if (move.id === 'moonblast') {
          particleShape = k === 0 ? 'crescent' : k % 2 === 0 ? 'star' : 'wisp';
          const moonCols = ['#f472b6', '#e879f9', '#c084fc', '#fef08a'];
          particleColor = moonCols[(s + k) % moonCols.length];
        } else if (move.id === 'shadow_pulse') {
          particleShape = 'wisp';
          const ghostCols = ['#a855f7', '#7e22ce', '#c084fc', '#e9d5ff'];
          particleColor = ghostCols[(s + k) % ghostCols.length];
        } else if (move.id === 'aurora_flare') {
          particleShape = k % 2 === 0 ? 'crystal' : 'star';
          const auroraCols = ['#67e8f9', '#a7f3d0', '#f472b6', '#ffffff'];
          particleColor = auroraCols[(s + k) % auroraCols.length];
        } else if (move.id === 'petal_blizzard' && k % 2 === 1) {
          particleColor = '#f9a8d4';
        }

        this.particles.push({
          x: px + spread,
          y: py + (Math.random() - 0.5) * 16,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (particleShape === 'bubble' || particleShape === 'ember' || particleShape === 'wisp' || particleShape === 'note' ? 32 : 0),
          gravity: particleShape === 'bubble' || particleShape === 'ember' || particleShape === 'wisp' || particleShape === 'note' ? -55 : 22,
          life: 0,
          maxLife: (0.34 + Math.random() * 0.18) * Math.min(1.4, lifeScale),
          color: particleColor,
          size: particleShape === 'leaf' ? 8 : move.id === 'hyper_nova' || move.id === 'moonblast' ? 6.5 + Math.random() * 3.5 : 5 + Math.random() * 3.5,
          rotation: angle,
          spin: particleShape === 'leaf' || particleShape === 'crystal' ? 10 : 4,
          shape: particleShape,
        });
      }
      if (s < steps - 1) {
        await this.wait(stepWaitMs, sessionId);
      }
    }
  }

  spawnStarBurst(center) {
    const colors = ['#fde047', '#f472b6', '#38bdf8', '#4ade80', '#ffffff'];
    this.particles.push({
      x: center.x,
      y: center.y,
      vx: 0,
      vy: 0,
      gravity: 0,
      life: 0,
      maxLife: 0.45,
      color: '#fde047',
      size: 14,
      maxRadius: 112,
      shape: 'ring',
    });

    for (let i = 0; i < 40; i++) {
      const angle = (Math.PI * 2 * i) / 40 + Math.random() * 0.25;
      const speed = 95 + Math.random() * 175;
      this.particles.push({
        x: center.x,
        y: center.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 48,
        gravity: 165,
        life: 0,
        maxLife: 0.72 + Math.random() * 0.38,
        color: colors[i % colors.length],
        size: 4.5 + Math.random() * 4.5,
        rotation: angle,
        spin: 8,
        shape: 'star',
      });
    }
  }

  spawnBuddyEndureBurst(side = 'player') {
    const center = this.getSpriteCenter(side);
    const colors = ['#f472b6', '#fb7185', '#fde047', '#ffffff'];
    this.particles.push({
      x: center.x,
      y: center.y,
      vx: 0,
      vy: 0,
      gravity: 0,
      life: 0,
      maxLife: 0.48,
      color: '#f472b6',
      size: 14,
      maxRadius: 102,
      lineWidth: 3.6,
      shape: 'ring',
    });
    this.particles.push({
      x: center.x,
      y: center.y,
      vx: 0,
      vy: 0,
      gravity: 0,
      life: -0.06,
      maxLife: 0.48,
      color: '#fde047',
      size: 16,
      maxRadius: 124,
      lineWidth: 2.6,
      shape: 'ring',
    });

    for (let i = 0; i < 28; i++) {
      const angle = (Math.PI * 2 * i) / 28 + Math.random() * 0.22;
      const speed = 72 + Math.random() * 128;
      const isHeart = i % 2 === 0;
      this.particles.push({
        x: center.x + (Math.random() - 0.5) * 16,
        y: center.y + (Math.random() - 0.5) * 16,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 56,
        gravity: 48,
        life: -(i * 0.008),
        maxLife: 0.78 + Math.random() * 0.32,
        color: colors[i % colors.length],
        size: isHeart ? 7 + Math.random() * 3 : 4.5 + Math.random() * 3.5,
        rotation: isHeart ? 0 : angle,
        spin: isHeart ? 0 : 7,
        shape: isHeart ? 'heart' : 'star',
      });
    }

    this.spawnFloatingText(center.x, center.y - 34, 'ENDURED! 1 HP', '#f472b6', 22, 0, 1.55);
  }

  startFxLoop() {
    if (this.fxRaf !== null) {
      cancelAnimationFrame(this.fxRaf);
      this.fxRaf = null;
    }
    this.fxLoopCount += 1;
    const loopSid = this.sessionId;
    this.lastFxTime = performance.now();

    const frame = (now) => {
      if (!this.isSessionValid(loopSid)) {
        this.fxRaf = null;
        return;
      }
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFxTime) / 1000));
      this.lastFxTime = now;
      this.updateAndDrawFx(dt);
      this.fxRaf = requestAnimationFrame(frame);
    };
    this.fxRaf = requestAnimationFrame(frame);
  }

  updateAndDrawFx(dt) {
    if (this.shakeTimer > 0 && this.stageEl) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      const decay = this.shakeDuration > 0 ? this.shakeTimer / this.shakeDuration : 0;
      const mag = this.shakeIntensity * decay;
      const phase = performance.now() * 0.08;
      const dx = Math.round(Math.sin(phase * 1.9) * mag);
      const dy = Math.round(Math.cos(phase * 2.5) * mag * 0.75);
      this.stageEl.style.transform = this.shakeTimer > 0 ? `translate3d(${dx}px, ${dy}px, 0)` : '';
    }

    const ctx = this.fxCtx;
    if (!ctx || !this.fxCanvas) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.fxCanvas.width, this.fxCanvas.height);

    if (this.captureBeam && this.pokeballAnim) {
      const b = this.pokeballAnim;
      const t = this.captureBeam;
      const grad = ctx.createLinearGradient(b.x, b.y, t.x, t.y);
      if (b.isStar || b.ballStyle === 'star') {
        grad.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
        grad.addColorStop(0.35, 'rgba(192, 132, 252, 0.78)');
        grad.addColorStop(0.7, 'rgba(56, 189, 248, 0.48)');
        grad.addColorStop(1, 'rgba(168, 85, 247, 0.08)');
      } else if (b.isGreat || b.ballStyle === 'great') {
        grad.addColorStop(0, 'rgba(186, 230, 253, 0.92)');
        grad.addColorStop(0.5, 'rgba(14, 165, 233, 0.65)');
        grad.addColorStop(1, 'rgba(14, 165, 233, 0.08)');
      } else {
        grad.addColorStop(0, 'rgba(254, 202, 202, 0.92)');
        grad.addColorStop(0.5, 'rgba(239, 68, 68, 0.65)');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0.08)');
      }
      ctx.save();
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(b.x - 5, b.y + 4);
      ctx.lineTo(b.x + 5, b.y + 4);
      ctx.lineTo(t.x + 48, t.y + 18);
      ctx.lineTo(t.x - 48, t.y + 18);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life < 0) continue;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      if (p.orbitCenter) {
        p.orbitAngle += (p.orbitAngVel || 6) * dt;
        p.orbitRadius = Math.max(4, p.orbitRadius + (p.orbitRadialVel || -45) * dt);
        p.x = p.orbitCenter.x + Math.cos(p.orbitAngle) * p.orbitRadius;
        p.y = p.orbitCenter.y + Math.sin(p.orbitAngle) * p.orbitRadius * 0.72;
      } else if (p.pullTo) {
        p.x += (p.pullTo.x - p.x) * Math.min(1, dt * 8.5);
        p.y += (p.pullTo.y - p.y) * Math.min(1, dt * 8.5);
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += (p.gravity ?? 180) * dt;
      }
      if (p.spin) {
        p.rotation = (p.rotation || 0) + p.spin * dt;
      }

      const progress = p.life / p.maxLife;
      const alpha = Math.max(0, 1 - progress);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);

      if (p.shape === 'ring') {
        const radius = Math.max(2, p.size + (p.maxRadius - p.size) * (1 - Math.pow(1 - progress, 2)));
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1.5, (p.lineWidth || 4) * (1 - progress));
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.shape === 'crescent') {
        ctx.rotate(p.rotation || 0);
        const r = p.size * (1 + progress * 0.25);
        const x0 = Math.cos(-Math.PI * 0.65) * r;
        const y0 = Math.sin(-Math.PI * 0.65) * r;
        ctx.fillStyle = p.color || '#f472b6';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI * 0.65, Math.PI * 0.65, false);
        ctx.quadraticCurveTo(r * 0.28, 0, x0, y0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (p.shape === 'lightning') {
        ctx.rotate(p.rotation || 0);
        const len = p.size * (1.75 + progress * 0.55);
        ctx.strokeStyle = p.color || '#fde047';
        ctx.lineWidth = Math.max(1.8, 3.6 * (1 - progress * 0.5));
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-len * 0.45, -len * 0.85);
        ctx.lineTo(len * 0.16, -len * 0.18);
        ctx.lineTo(-len * 0.18, len * 0.18);
        ctx.lineTo(len * 0.48, len * 0.88);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, 1.5 * (1 - progress * 0.5));
        ctx.stroke();
      } else if (p.shape === 'stone') {
        ctx.rotate(p.rotation || 0);
        const s = p.size;
        ctx.fillStyle = p.color || '#94a3b8';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-s * 0.82, -s * 0.38);
        ctx.lineTo(0, -s);
        ctx.lineTo(s * 0.9, -s * 0.28);
        ctx.lineTo(s * 0.62, s * 0.85);
        ctx.lineTo(-s * 0.65, s * 0.76);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (p.shape === 'ember' || p.shape === 'dragonflame') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (1 - progress * 0.3), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = p.shape === 'dragonflame' ? '#e0e7ff' : '#fef08a';
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.48, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'crystal') {
        ctx.rotate(p.rotation || 0);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, -p.size * 1.35);
        ctx.lineTo(p.size * 0.78, 0);
        ctx.lineTo(0, p.size * 1.35);
        ctx.lineTo(-p.size * 0.78, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (p.shape === 'wisp') {
        const wobble = Math.sin(p.life * 14) * 3;
        ctx.translate(wobble, 0);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (1 - progress * 0.25), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(243, 232, 255, 0.75)';
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'bubble') {
        const wobble = Math.sin(p.life * 16) * 2;
        ctx.translate(wobble, 0);
        ctx.fillStyle = 'rgba(125, 211, 252, 0.42)';
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-p.size * 0.32, -p.size * 0.32, Math.max(1.2, p.size * 0.25), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'leaf') {
        ctx.rotate(p.rotation || 0);
        ctx.fillStyle = p.color && p.color !== '#ffffff' ? p.color : '#22c55e';
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(p.size, 0);
        ctx.quadraticCurveTo(0, -p.size * 0.65, -p.size, 0);
        ctx.quadraticCurveTo(0, p.size * 0.65, p.size, 0);
        ctx.fill();
        ctx.stroke();
      } else if (p.shape === 'slash') {
        ctx.rotate(p.rotation || 0);
        const len = p.size * (1.4 + progress * 1.3);
        const thick = Math.max(1.2, p.size * 0.4 * (1 - progress * 0.68));
        ctx.fillStyle = p.color || '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-len, 0);
        ctx.quadraticCurveTo(0, -thick, len, 0);
        ctx.quadraticCurveTo(0, thick * 0.42, -len, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-len * 0.72, 0);
        ctx.quadraticCurveTo(0, -thick * 0.45, len * 0.72, 0);
        ctx.quadraticCurveTo(0, thick * 0.16, -len * 0.72, 0);
        ctx.closePath();
        ctx.fill();
      } else if (p.shape === 'wind') {
        ctx.rotate(p.rotation || 0);
        const w = p.size * (1.65 + progress * 0.85);
        ctx.strokeStyle = p.color || '#e2e8f0';
        ctx.lineWidth = Math.max(1.4, 3.2 * (1 - progress * 0.6));
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-w, 0);
        ctx.quadraticCurveTo(-w * 0.25, -p.size * 0.75, w * 0.4, 0);
        ctx.quadraticCurveTo(w * 0.85, p.size * 0.55, w, -p.size * 0.2);
        ctx.stroke();
      } else if (p.shape === 'note') {
        const wobble = Math.sin(p.life * 10) * 0.14;
        ctx.rotate((p.rotation || 0) * 0.15 + wobble);
        const s = p.size;
        ctx.fillStyle = p.color || '#fde047';
        ctx.strokeStyle = p.color || '#fde047';
        ctx.beginPath();
        ctx.ellipse(-s * 0.24, s * 0.42, s * 0.52, s * 0.36, -0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = Math.max(1.6, s * 0.26);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(s * 0.18, s * 0.38);
        ctx.lineTo(s * 0.18, -s * 0.92);
        ctx.quadraticCurveTo(s * 0.82, -s * 0.7, s * 0.7, -s * 0.18);
        ctx.stroke();
      } else if (p.shape === 'dust') {
        const radius = p.size * (0.7 + progress * 0.9);
        ctx.globalAlpha = alpha * 0.65;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'bolt') {
        ctx.rotate(p.rotation || 0);
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(0, -p.size * 1.4);
        ctx.lineTo(p.size * 0.55, 0);
        ctx.lineTo(0, p.size * 1.4);
        ctx.lineTo(-p.size * 0.55, 0);
        ctx.closePath();
        ctx.fill();
      } else if (p.shape === 'orb') {
        const r = p.size * (1 - progress * 0.22);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.38)';
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = p.color || '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-r * 0.2, -r * 0.2, Math.max(1.5, r * 0.45), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'beam') {
        const w = Math.max(4, p.size * (1 - progress * 0.55));
        ctx.fillStyle = 'rgba(253, 224, 71, 0.34)';
        ctx.fillRect(-w * 0.9, -180, w * 1.8, 225);
        ctx.fillStyle = p.color || '#fde047';
        ctx.fillRect(-w * 0.45, -180, w * 0.9, 225);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-w * 0.2, -180, w * 0.4, 225);
      } else if (p.shape === 'heart') {
        const s = p.size * (1 - progress * 0.18);
        ctx.fillStyle = p.color || '#f472b6';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.85);
        ctx.bezierCurveTo(-s * 1.25, s * 0.1, -s * 1.15, -s * 0.95, 0, -s * 0.32);
        ctx.bezierCurveTo(s * 1.15, -s * 0.95, s * 1.25, s * 0.1, 0, s * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (p.shape === 'star' || p.star) {
        ctx.rotate(p.rotation || p.life * 6);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size, -p.size * 0.32, p.size * 2, p.size * 0.64);
        ctx.fillRect(-p.size * 0.32, -p.size, p.size * 0.64, p.size * 2);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (this.pokeballAnim) {
      this.drawPokeball(ctx, this.pokeballAnim);
    }

    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.life += dt;
      if (pop.life < 0) continue;
      if (pop.life >= pop.maxLife) {
        this.popups.splice(i, 1);
        continue;
      }
      pop.y += pop.vy * dt;
      pop.vy *= 0.94;
      const progress = pop.life / pop.maxLife;
      const popScale = progress < 0.14 ? 0.78 + (progress / 0.14) * 0.34 : 1.0;
      const alpha = Math.max(0, 1 - Math.pow(progress, 1.8));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(pop.x, pop.y);
      ctx.scale(popScale, popScale);
      ctx.font = `900 ${pop.size || 20}px ui-rounded, 'Trebuchet MS', system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = '#090d1a';
      ctx.strokeText(pop.text, 0, 0);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, 0, 0);
      ctx.restore();
    }
  }

  drawPokeball(ctx, ball) {
    ctx.save();
    ctx.translate(ball.x, ball.y);
    const scale = ball.scale ?? 1;
    ctx.scale(scale, scale);
    ctx.rotate(ball.angle || 0);
    const r = 17;
    const isStar = Boolean(ball.isStar || ball.ballStyle === 'star');
    const isGreat = Boolean(!isStar && (ball.isGreat || ball.ballStyle === 'great'));

    if (ball.shadowAlpha) {
      ctx.save();
      ctx.rotate(-(ball.angle || 0));
      ctx.fillStyle = `rgba(2, 6, 23, ${ball.shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(0, r + 4, 15, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = isStar ? '#f5f3ff' : '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    if (isStar) {
      const starGrad = ctx.createLinearGradient(-r, -r, r, 0);
      starGrad.addColorStop(0, '#a855f7');
      starGrad.addColorStop(0.5, '#6b21a8');
      starGrad.addColorStop(1, '#3b0764');
      ctx.fillStyle = starGrad;
    } else {
      ctx.fillStyle = isGreat ? '#0ea5e9' : '#ef4444';
    }
    ctx.beginPath();
    ctx.arc(0, 0, r, Math.PI, 0);
    ctx.closePath();
    ctx.fill();

    if (isStar) {
      // Gold cosmic star emblem on dome
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-5, -11, 10, 2.4);
      ctx.fillRect(-1.2, -14.8, 2.4, 10);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-10, -8, 3, 3);
      ctx.fillRect(7, -8, 3, 3);
    } else if (isGreat) {
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-10, -10, 5, 4);
      ctx.fillRect(5, -10, 5, 4);
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-6, -7, 4.5, 2.5, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = isStar ? '#fde047' : '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-r, -2.5, r * 2, 5);

    ctx.fillStyle = ball.glow ? '#fde047' : isStar ? '#fef08a' : '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 5.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();
    ctx.restore();
  }

  async playAttackVisual(attackerSide, defenderSide, move, result, defender, sessionId) {
    const pace = this.getPaceConfig();
    const atkSprite = attackerSide === 'player' ? this.playerSpriteEl : this.enemySpriteEl;
    const defSprite = defenderSide === 'enemy' ? this.enemySpriteEl : this.playerSpriteEl;
    const isQuick = move.id === 'quick_attack'
      || move.id === 'spark_dash'
      || move.id === 'agility_dash'
      || move.id === 'sky_wing'
      || move.id === 'phantom_claw'
      || move.id === 'thunder_fang'
      || move.id === 'wild_volt'
      || move.id === 'leaf_blade'
      || move.id === 'psycho_cut';
    const lungeClass = attackerSide === 'player'
      ? (isQuick ? 'quick-lunge-right' : 'lunge-right')
      : (isQuick ? 'quick-lunge-left' : 'lunge-left');
    const fxClass = MOVE_FX_CLASS[move.id] || '';

    // Beat 1: Wind-Up Anticipation
    atkSprite?.classList.remove('is-idle');
    atkSprite?.classList.add('windup');
    if (fxClass) atkSprite?.classList.add(fxClass);
    this.audio?.playWindup?.(move.type);
    this.spawnChargeParticles(attackerSide, move.type, pace, move);
    await this.wait(pace.windupMs, sessionId);
    if (!this.isSessionValid(sessionId)) return;
    atkSprite?.classList.remove('windup');

    if (move.category === 'heal' || result.category === 'heal') {
      atkSprite?.classList.add(lungeClass);
      this.audio?.playElemental?.('heal', move.id);
      this.spawnImpactFX(attackerSide, 'heal', `+${result.heal} HP`, '#86efac', {
        ring: true,
        ringColor: '#4ade80',
        fontSize: 22,
        lifeScale: pace.particleLifeScale,
      });
      await this.wait(Math.max(240, pace.postImpactMs), sessionId);
      if (!this.isSessionValid(sessionId)) return;
      atkSprite?.classList.remove(lungeClass, ...ALL_MOVE_FX_CLASSES);
      atkSprite?.classList.add('is-idle');
      return;
    }

    if (move.category === 'buff' || result.category === 'buff') {
      atkSprite?.classList.add(lungeClass);
      if (move.id === 'cosmos_mind') {
        this.audio?.playElemental?.('psychic', 'cosmos_mind');
      }
      this.audio?.playBuffChime?.();
      const statShort = { atk: 'ATK', def: 'DEF', spd: 'SPD' }[result.buffStat || move.buffStat || 'atk'] || 'STAT';
      const fxType = move.type && move.type !== 'normal' ? move.type : 'buff';
      this.spawnImpactFX(attackerSide, fxType, `${statShort} ▲!`, '#fde047', {
        ring: true,
        ringRadius: move.id === 'cosmos_mind' ? 102 : 88,
        ringColor: move.id === 'cosmos_mind' ? '#f472b6' : '#fde047',
        count: move.id === 'cosmos_mind' ? 28 : 20,
        fontSize: 22,
        lifeScale: pace.particleLifeScale,
      });
      await this.wait(Math.max(240, pace.postImpactMs), sessionId);
      if (!this.isSessionValid(sessionId)) return;
      atkSprite?.classList.remove(lungeClass, ...ALL_MOVE_FX_CLASSES);
      atkSprite?.classList.add('is-idle');
      return;
    }

    if (move.category === 'shield' || result.category === 'shield') {
      atkSprite?.classList.add(lungeClass);
      const isCalm = move.id === 'calm_aura';
      const isCotton = move.id === 'cotton_guard';
      if (isCalm) {
        this.audio?.playElemental?.('psychic', 'calm_aura');
      } else {
        this.audio?.playShieldChime?.();
      }
      this.spawnImpactFX(
        attackerSide,
        isCalm ? 'psychic' : isCotton ? 'buff' : 'shield',
        isCalm ? 'CALM AURA!' : isCotton ? 'COTTON GUARD!' : 'SHIELD UP!',
        isCalm ? '#e9d5ff' : isCotton ? '#fef08a' : '#67e8f9',
        {
          moveId: move.id,
          ring: true,
          ringRadius: isCalm ? 98 : 94,
          ringColor: isCalm ? '#c084fc' : isCotton ? '#fde047' : '#67e8f9',
          secondaryRingColor: isCalm ? '#67e8f9' : '#ffffff',
          count: isCalm ? 16 : 22,
          fontSize: 21,
          lifeScale: pace.particleLifeScale,
        },
      );
      await this.wait(Math.max(240, pace.postImpactMs), sessionId);
      if (!this.isSessionValid(sessionId)) return;
      atkSprite?.classList.remove(lungeClass, ...ALL_MOVE_FX_CLASSES);
      atkSprite?.classList.add('is-idle');
      return;
    }

    // Beat 2: Travel / Delivery
    atkSprite?.classList.add(lungeClass);
    const isPhysical = move.damageClass === 'physical' || PHYSICAL_MOVE_IDS.has(move.id) || move.fx === 'impact';
    const hasElementalTrail = isPhysical && (move.type !== 'normal' || move.fx === 'wind');
    if (isPhysical) {
      if ((move.id === 'tackle' || move.id === 'quick_attack') && move.fx !== 'wind') {
        this.audio?.playPhysicalImpact?.(move.power);
      } else {
        this.audio?.playElemental?.(move.fx === 'wind' ? 'wind' : move.type, move.id);
      }
      if (hasElementalTrail) {
        this.spawnPhysicalElementalTrail(attackerSide, defenderSide, move, pace);
      }
      await this.wait(pace.physicalStrikeMs, sessionId);
    } else {
      this.audio?.playElemental?.(move.type, move.id);
      await this.animateElementalStream(attackerSide, defenderSide, move, sessionId);
    }

    if (!this.isSessionValid(sessionId)) return;

    // Beat 3: Hit-Stop Freeze & Impact
    if (result.missed) {
      this.spawnImpactFX(defenderSide, 'normal', 'MISSED!', '#cbd5e1', {
        count: 8,
        fontSize: 20,
        lifeScale: pace.particleLifeScale,
      });
    } else {
      defSprite?.classList.remove('is-idle');
      defSprite?.classList.add('hit-stop');
      this.audio?.playHitStop?.();
      await this.wait(pace.hitStopMs, sessionId);
      if (!this.isSessionValid(sessionId)) return;
      defSprite?.classList.remove('hit-stop');
      defSprite?.classList.add('hit-shake');

      const heavyMoves = new Set([
        'meteor_slam', 'hyper_nova', 'wild_volt', 'iron_crush', 'magma_cannon', 'moonblast', 'glacier_crash',
        'eruption_flare', 'aura_sphere', 'draco_meteor', 'doom_desire',
      ]);
      const maxHp = Math.max(1, defender?.maxHp || 30);
      const dmgIntensity = (result.damage / maxHp) * 18
        + (result.isCrit ? 4 : 0)
        + (result.effectiveness > 1 ? 3 : 0)
        + (heavyMoves.has(move.id) ? 3 : 0);
      this.triggerScreenShake(Math.max(4, Math.min(15, dmgIntensity)), isPhysical ? 280 : 240);

      const center = this.getSpriteCenter(defenderSide);
      const dmgColor = result.isCrit ? '#fde047' : result.effectiveness > 1 ? '#fb923c' : '#ffffff';
      const impactType = move.fx === 'wind' ? 'wind' : move.fx === 'star' && move.type === 'normal' ? 'star' : move.type;
      const slashColorByMove = {
        thunder_fang: '#facc15',
        leaf_blade: '#4ade80',
        psycho_cut: '#f472b6',
        aqua_tail: '#38bdf8',
      };
      const ringColorByMove = {
        moonblast: '#f472b6',
        iron_crush: '#e2e8f0',
        wild_volt: '#fde047',
        magma_cannon: '#f97316',
        leaf_blade: '#22c55e',
        eruption_flare: '#f97316',
        aura_sphere: '#38bdf8',
        psycho_cut: '#f472b6',
        aqua_tail: '#38bdf8',
        draco_meteor: '#818cf8',
        omen_wind: '#a855f7',
        doom_desire: '#fde047',
      };
      const secondaryRingByMove = {
        moonblast: '#c084fc',
        leaf_blade: '#bbf7d0',
        eruption_flare: '#fde047',
        aura_sphere: '#6366f1',
        psycho_cut: '#c084fc',
        aqua_tail: '#f472b6',
        draco_meteor: '#fde047',
        omen_wind: '#67e8f9',
        doom_desire: '#38bdf8',
      };
      const bigBurstMoves = new Set([
        'hyper_nova', 'thunder_tempest', 'wild_volt', 'magma_cannon',
        'eruption_flare', 'aura_sphere', 'draco_meteor', 'omen_wind', 'doom_desire',
      ]);
      this.spawnImpactFX(defenderSide, impactType, `-${result.damage}`, dmgColor, {
        moveId: move.id,
        dust: isPhysical || move.id === 'magma_cannon' || move.id === 'eruption_flare' || move.id === 'draco_meteor',
        extraDust: move.id === 'meteor_slam' || move.id === 'iron_crush' || move.id === 'draco_meteor',
        slash: hasElementalTrail || move.id === 'phantom_claw' || move.id === 'starlight_claw' || move.id === 'thunder_fang',
        slashColor: slashColorByMove[move.id],
        shapeOverride: move.id === 'star_melody'
          ? 'note'
          : move.fx === 'wind' || move.id === 'omen_wind'
            ? 'wind'
            : move.id === 'glacier_crash'
              ? 'crystal'
              : null,
        extraNotes: move.id === 'star_melody',
        aurora: move.id === 'aurora_flare',
        petalColors: move.id === 'petal_blizzard',
        ring: true,
        ringColor: ringColorByMove[move.id],
        secondaryRingColor: secondaryRingByMove[move.id] || '#ffffff',
        ringRadius: result.isCrit ? 96 : heavyMoves.has(move.id) ? 106 : 74,
        count: bigBurstMoves.has(move.id) ? 28 : 22,
        fontSize: result.isCrit ? 26 : 23,
        lifeScale: pace.particleLifeScale,
        popupLife: 1.45,
      });

      let tagOffsetY = -52;
      if (result.effectiveness > 1) {
        this.spawnFloatingText(center.x, center.y + tagOffsetY, 'SUPER EFFECTIVE!', '#fde047', 16, 0.05, 1.45);
        tagOffsetY -= 22;
      } else if (result.effectiveness < 1) {
        this.spawnFloatingText(center.x, center.y + tagOffsetY, 'NOT VERY EFFECTIVE', '#cbd5e1', 14, 0.05, 1.45);
        tagOffsetY -= 20;
      }
      if (result.isCrit) {
        this.spawnFloatingText(center.x, center.y + tagOffsetY, 'CRITICAL HIT!', '#fb923c', 17, 0.09, 1.45);
      }
    }

    await this.wait(pace.postImpactMs, sessionId);
    if (!this.isSessionValid(sessionId)) return;
    atkSprite?.classList.remove(lungeClass, ...ALL_MOVE_FX_CLASSES);
    atkSprite?.classList.add('is-idle');
    defSprite?.classList.remove('hit-stop', 'hit-shake');
    defSprite?.classList.add('is-idle');
  }

  chooseEnemyMove() {
    if (!this.enemy || this.enemy.isFainted || !this.player || this.player.isFainted) {
      return null;
    }
    const allMoves = this.enemy.getMoveObjects();
    if (allMoves.length === 0) return null;
    const moves = typeof this.enemy.getMovePp === 'function'
      ? allMoves.filter((m) => this.enemy.getMovePp(m.id).current > 0)
      : allMoves;
    if (moves.length === 0) {
      return {
        id: 'tackle',
        name: 'Struggle',
        type: 'normal',
        power: 35,
        accuracy: 100,
        pp: 99,
        damageClass: 'physical',
        category: 'attack',
        fx: 'impact',
        _isStruggle: true,
      };
    }
    const attacks = moves.filter((m) => m.category === 'attack' || !m.category);
    let chosen = moves[Math.floor(Math.random() * moves.length)];
    if (chosen.category === 'heal' && this.enemy.hp > this.enemy.maxHp * 0.6 && attacks.length > 0) {
      chosen = attacks[Math.floor(Math.random() * attacks.length)];
    } else if (chosen.category === 'shield' && (this.enemy.shieldTurns || 0) > 0 && attacks.length > 0) {
      chosen = attacks[Math.floor(Math.random() * attacks.length)];
    } else if (chosen.category === 'buff') {
      const stat = chosen.buffStat || 'atk';
      const stage = Number(this.enemy.battleStages?.[stat] || 0);
      if ((stage >= 2 || this.enemy.hp < this.enemy.maxHp * 0.35) && attacks.length > 0) {
        chosen = attacks[Math.floor(Math.random() * attacks.length)];
      }
    }
    return chosen;
  }

  async handlePlayerMove(move) {
    if (!this.canAcceptPlayerAction()) return;
    if (!this.player || this.player.isFainted || !this.enemy || this.enemy.isFainted) return;

    const ppInfo = this.player.getMovePp(move.id);
    if (ppInfo.current <= 0 && this.player.hasAnyMovePp()) {
      this.audio?.playMenuBlip?.(300);
      return;
    }

    const sid = this.sessionId;
    const pace = this.getPaceConfig();
    const token = this.lockPlayerAction(BATTLE_STATES.ACTION_ANIMATING);
    this.audio?.playMoveSelect?.();

    if (ppInfo.current > 0) {
      this.player.consumeMovePp(move.id);
      this.storage.save();
      this.renderMoveButtons();
      this.setControlsDisabled(true);
    }

    try {
      const playerSpd = this.player.getEffectiveSpd?.() ?? this.player.spd;
      const enemySpd = this.enemy.getEffectiveSpd?.() ?? this.enemy.spd;
      const playerFaster = playerSpd >= enemySpd;

      if (playerFaster) {
        this.state = BATTLE_STATES.ACTION_ANIMATING;
        const playerEnded = await this.executeMoveAction('player', move, sid);
        if (playerEnded || !this.isSessionValid(sid) || this.turnToken !== token) return;

        await this.wait(pace.interTurnMs, sid);
        if (!this.isSessionValid(sid) || this.turnToken !== token) return;

        this.state = BATTLE_STATES.OPPONENT_AI;
        const enemyMove = this.chooseEnemyMove();
        if (enemyMove) {
          this.state = BATTLE_STATES.OPPONENT_ANIMATING;
          const enemyEnded = await this.executeMoveAction('enemy', enemyMove, sid);
          if (enemyEnded || !this.isSessionValid(sid) || this.turnToken !== token) return;
        }
      } else {
        this.state = BATTLE_STATES.OPPONENT_AI;
        const enemyMove = this.chooseEnemyMove();
        if (enemyMove) {
          this.state = BATTLE_STATES.OPPONENT_ANIMATING;
          const enemyEnded = await this.executeMoveAction('enemy', enemyMove, sid);
          if (enemyEnded || !this.isSessionValid(sid) || this.turnToken !== token) return;

          await this.wait(pace.interTurnMs, sid);
          if (!this.isSessionValid(sid) || this.turnToken !== token) return;
        }

        this.state = BATTLE_STATES.ACTION_ANIMATING;
        const playerEnded = await this.executeMoveAction('player', move, sid);
        if (playerEnded || !this.isSessionValid(sid) || this.turnToken !== token) return;
      }

      if (!this.isSessionValid(sid) || this.turnToken !== token) return;
      this.returnToPlayerInput(sid);
    } catch (err) {
      console.error('Turn execution error:', err);
      if (
        this.isSessionValid(sid) &&
        this.turnToken === token &&
        this.state !== BATTLE_STATES.FORCED_SWITCH &&
        this.state !== BATTLE_STATES.BATTLE_END
      ) {
        this.returnToPlayerInput(sid);
      }
    }
  }

  async executeMoveAction(side, move, sid = this.sessionId) {
    if (!this.isSessionValid(sid)) return true;
    const pace = this.getPaceConfig();
    const isPlayer = side === 'player';
    const attacker = isPlayer ? this.player : this.enemy;
    const defender = isPlayer ? this.enemy : this.player;
    const defSide = isPlayer ? 'enemy' : 'player';

    if (!attacker || !defender || attacker.isFainted || defender.isFainted) {
      return true;
    }

    if (!isPlayer && !move?._isStruggle) {
      attacker.consumeMovePp?.(move.id);
    }

    const attackerLabel = isPlayer ? (attacker.displayName || attacker.name) : attacker.name;
    await this.say(`${attackerLabel} used ${move.name}!`);
    if (!this.isSessionValid(sid) || attacker.isFainted || defender.isFainted) return true;

    const result = PokemonMod.calculateDamage(attacker, defender, move);
    await this.playAttackVisual(side, defSide, move, result, defender, sid);
    if (!this.isSessionValid(sid)) return true;

    if (result.category === 'heal') {
      const gained = attacker.healAmount(result.heal);
      this.storage.save();
      await this.animateHpTo(side, attacker.hp, pace.hpDrainMs);
      if (!this.isSessionValid(sid)) return true;
      await this.say(`${attackerLabel} restored ${gained} HP!`);
      this.state = BATTLE_STATES.CHECK_FAINT;
      return false;
    }

    if (result.category === 'buff') {
      const stat = result.buffStat || move.buffStat || 'atk';
      const boostRes = attacker.applyStageBoost?.(stat, result.buffStages || move.buffStages || 1);
      this.renderStatusCards();
      this.storage.save();
      const statLabel = { atk: 'Attack', def: 'Defense', spd: 'Speed' }[stat] || 'Power';
      await this.say(
        boostRes && !boostRes.changed
          ? `${attackerLabel}'s ${statLabel} can't go any higher!`
          : `${attackerLabel}'s ${statLabel} rose!`,
      );
      this.state = BATTLE_STATES.CHECK_FAINT;
      return false;
    }

    if (result.category === 'shield') {
      const stat = result.buffStat || 'def';
      attacker.applyStageBoost?.(stat, result.buffStages || move.buffStages || 1);
      if (result.grantShield) {
        attacker.shieldTurns = 2;
      }
      let gained = 0;
      if (result.heal > 0) {
        gained = attacker.healAmount(result.heal);
      }
      this.renderStatusCards();
      this.storage.save();
      if (gained > 0) {
        await this.animateHpTo(side, attacker.hp, pace.hpDrainMs);
        if (!this.isSessionValid(sid)) return true;
      }
      await this.say(
        `${attackerLabel} raised a Starlight Shield!${gained > 0 ? ` (+${gained} HP)` : ''}`,
      );
      this.state = BATTLE_STATES.CHECK_FAINT;
      return false;
    }

    if (result.missed) {
      await this.say(`${attackerLabel}'s attack missed!`);
      this.state = BATTLE_STATES.CHECK_FAINT;
      return false;
    }

    const prevDefenderHp = Number(defender.hp) || 0;
    defender.takeDamage(result.damage);
    let buddyEndured = false;
    if (
      !isPlayer &&
      defender === this.player &&
      prevDefenderHp > 1 &&
      defender.hp <= 0 &&
      (Number(this.player.bond) || 0) >= 60 &&
      !this.playerBuddyEndured &&
      this.allowBuddyEndure !== false
    ) {
      const bondVal = Number(this.player.bond) || 0;
      const endureChance = this.forceBuddyEndure === true
        ? 1.0
        : (PokemonMod.getBondTier?.(bondVal)?.endureChance ?? (bondVal >= 85 ? 0.25 : 0.15));
      if (this.forceBuddyEndure === true || Math.random() < endureChance) {
        this.playerBuddyEndured = true;
        this.player.hp = 1;
        buddyEndured = true;
      }
    }
    if ((defender.shieldTurns || 0) > 0) {
      defender.shieldTurns = Math.max(0, defender.shieldTurns - 1);
    }
    this.renderStatusCards();
    this.storage.save();
    await this.animateHpTo(defSide, defender.hp, pace.hpDrainMs);
    if (!this.isSessionValid(sid)) return true;

    if (buddyEndured) {
      if (typeof this.audio?.playBuddyEndure === 'function') {
        this.audio.playBuddyEndure();
      } else {
        this.audio?.playShieldChime?.();
      }
      this.spawnBuddyEndureBurst('player');
    }

    if (result.effectiveness > 1) {
      await this.say("It's super effective!");
    } else if (result.effectiveness < 1) {
      await this.say("It's not very effective...");
    }
    if (result.isCrit) {
      await this.say('A critical hit!');
    }
    if (buddyEndured && this.isSessionValid(sid)) {
      const playerName = this.player.displayName || this.player.name;
      await this.say(`💖 ${playerName} toughed it out at 1 HP for its trainer!`);
    }

    if (!this.isSessionValid(sid)) return true;

    this.state = BATTLE_STATES.CHECK_FAINT;
    if (defender.isFainted) {
      if (defSide === 'enemy') {
        await this.handleEnemyDefeated(sid);
      } else {
        await this.handlePlayerFainted(sid);
      }
      return true;
    }
    return false;
  }

  async executeTurn(side, move, sid = this.sessionId) {
    return this.executeMoveAction(side, move, sid);
  }

  async executeEnemyTurn(sid = this.sessionId) {
    if (!this.isSessionValid(sid) || !this.enemy || this.enemy.isFainted || !this.player || this.player.isFainted) {
      return true;
    }
    this.state = BATTLE_STATES.OPPONENT_AI;
    const chosen = this.chooseEnemyMove();
    if (!chosen) return false;
    this.state = BATTLE_STATES.OPPONENT_ANIMATING;
    return this.executeMoveAction('enemy', chosen, sid);
  }

  async handleUsePotion() {
    if (!this.canAcceptPlayerAction()) return;
    if (!this.player || this.player.isFainted || this.player.hp >= this.player.maxHp) return;
    if (!this.storage.useItem('potions')) return;

    const sid = this.sessionId;
    const pace = this.getPaceConfig();
    const token = this.lockPlayerAction(BATTLE_STATES.ACTION_ANIMATING);
    this.audio?.playHealChime?.();

    try {
      const healAmount = Math.max(18, Math.round(this.player.maxHp * 0.45));
      const gained = this.player.healAmount(healAmount);
      this.storage.save();
      this.spawnImpactFX('player', 'heal', `+${gained} HP`, '#86efac', {
        ring: true,
        ringColor: '#4ade80',
        fontSize: 22,
        lifeScale: pace.particleLifeScale,
      });
      await this.animateHpTo('player', this.player.hp, pace.hpDrainMs);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;
      await this.say(`Used a Berry Potion! ${this.player.displayName || this.player.name} recovered ${gained} HP!`);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      await this.wait(Math.round(pace.interTurnMs * 0.7), sid);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      this.state = BATTLE_STATES.CHECK_FAINT;
      const ended = await this.executeEnemyTurn(sid);
      if (ended || !this.isSessionValid(sid) || this.turnToken !== token) return;

      this.returnToPlayerInput(sid);
    } catch (err) {
      console.error('Potion error:', err);
      if (
        this.isSessionValid(sid) &&
        this.turnToken === token &&
        this.state !== BATTLE_STATES.FORCED_SWITCH &&
        this.state !== BATTLE_STATES.BATTLE_END
      ) {
        this.returnToPlayerInput(sid);
      }
    }
  }

  async handleThrowBall(ballType = 'pokeball') {
    if (!this.canAcceptPlayerAction()) return;
    if (!this.enemy || this.enemy.isFainted || !this.player || this.player.isFainted) return;

    const sid = this.sessionId;
    if (this.isShrine) {
      const token = this.lockPlayerAction(BATTLE_STATES.ACTION_ANIMATING);
      this.audio?.playMenuBlip?.(340);
      await this.say("Shrine Guardians can't be caught! Defeat it to win the Elemental Badge!");
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;
      this.returnToPlayerInput(sid);
      return;
    }

    if (this.isTrainer) {
      const token = this.lockPlayerAction(BATTLE_STATES.ACTION_ANIMATING);
      this.audio?.playMenuBlip?.(340);
      await this.say("You can't catch another trainer's Pokémon!");
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;
      this.returnToPlayerInput(sid);
      return;
    }

    const ballStyle = normalizeBallStyle(ballType);
    const isGreat = ballStyle === 'great';
    const isStar = ballStyle === 'star';

    if (isGreat && !this.storage.useItem('greatBalls')) {
      return;
    }
    if (isStar && !this.storage.useItem('starBalls')) {
      return;
    }

    const token = this.lockPlayerAction(BATTLE_STATES.ACTION_ANIMATING);
    try {
      const ballName = isStar ? 'Star Ball' : isGreat ? 'Great Ball' : 'Poké Ball';
      const ballBonus = isStar ? 2.0 : isGreat ? 1.45 : 1.0;
      await this.say(`Threw a ${ballName}!`);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      this.audio?.playPokeballThrow?.();
      if (isStar) {
        this.audio?.playStarBallShimmer?.();
      }

      const start = this.getSpriteCenter('player');
      const target = this.getSpriteCenter('enemy');
      const pedestal = this.getPedestalPoint('enemy');
      const hoverPos = { x: target.x, y: target.y - 38 };
      const attempt = PokemonMod.calculateCatchAttempt(this.enemy, ballBonus);

      await this.animateBallFlight(start, hoverPos, ballStyle, 430, sid);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      this.captureBeam = { x: target.x, y: target.y };
      this.pokeballAnim = {
        x: hoverPos.x,
        y: hoverPos.y,
        angle: 0,
        ballStyle,
        isGreat,
        isStar,
        glow: true,
        scale: 1.08,
      };
      this.enemySpriteEl?.classList.remove('is-idle');
      this.enemySpriteEl?.classList.add('capture-energize');
      this.audio?.playPokeballAbsorb?.();
      if (isStar) {
        this.audio?.playStarBallShimmer?.();
      }
      await this.wait(180, sid);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      const absorbColors = isStar
        ? ['#fde047', '#c084fc', '#67e8f9', '#f472b6']
        : isGreat
          ? ['#7dd3fc', '#f43f5e']
          : ['#f87171', '#fecaca'];
      for (let i = 0; i < (isStar ? 22 : 16); i++) {
        this.particles.push({
          x: target.x + (Math.random() - 0.5) * 66,
          y: target.y + (Math.random() - 0.5) * 66,
          vx: 0,
          vy: 0,
          gravity: 0,
          pullTo: hoverPos,
          life: 0,
          maxLife: 0.32,
          color: absorbColors[i % absorbColors.length],
          size: 4 + Math.random() * 3,
          shape: 'star',
        });
      }

      this.enemySpriteEl?.classList.add('capture-pull');
      await this.wait(300, sid);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;
      this.captureBeam = null;

      await this.animateBallDropAndBounce(hoverPos.x, hoverPos.y, pedestal.y - 12, ballStyle, sid);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      const pace = this.getPaceConfig();
      const restY = pedestal.y - 12;
      for (let i = 1; i <= attempt.shakes; i++) {
        if (!this.isSessionValid(sid) || this.turnToken !== token) return;
        this.audio?.playPokeballWobble?.(i);
        await this.animateBallWobble(hoverPos.x, restY, ballStyle, i % 2 === 1 ? -1 : 1, sid);
        await this.wait(pace.ballWobblePauseMs, sid);
      }
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      if (attempt.caught) {
        this.state = BATTLE_STATES.BATTLE_END;
        this.pokeballAnim = {
          x: hoverPos.x,
          y: restY,
          angle: 0,
          ballStyle,
          isGreat,
          isStar,
          glow: true,
          shadowAlpha: 0.45,
        };
        this.audio?.playCaptureSuccess?.();
        this.spawnStarBurst({ x: hoverPos.x, y: restY });
        this.spawnFloatingText(hoverPos.x, restY - 36, 'GOTCHA!', '#fde047', 24, 0, 1.45);
        await this.wait(Math.max(480, Math.round(pace.postImpactMs * 1.3)), sid);
        if (!this.isSessionValid(sid) || this.turnToken !== token) return;
        this.pokeballAnim = null;

        this.enemy.hp = Math.max(1, this.enemy.hp);
        this.player?.gainBond?.(4);
        const { destination, newBadges } = this.storage.recordCaught(this.enemy);
        const winBadges = this.storage.recordBattleWin();
        const allNewBadges = [...newBadges, ...winBadges];

        await this.say(`Gotcha! ${this.enemy.name} was caught!`);
        if (!this.isSessionValid(sid) || this.turnToken !== token) return;
        if (destination === 'box') {
          await this.say(`${this.enemy.name} was sent to your Reserve Box (Team of 6 is full)!`);
        }

        const evoBadges = await this.awardVictoryXp(0.6, sid, {
          deferBadges: true,
          excludeUids: this.enemy?.uid ? [this.enemy.uid] : null,
        });
        if (!this.isSessionValid(sid) || this.turnToken !== token) return;
        if (Array.isArray(evoBadges) && evoBadges.length > 0) {
          allNewBadges.push(...evoBadges);
        }
        const shards = this.awardBattleStarShards({ caught: true });
        if (shards > 0) {
          await this.say(`+${shards} ✨ Star Shards!`);
          if (!this.isSessionValid(sid) || this.turnToken !== token) return;
        }
        this.onHudRefresh?.();
        if (allNewBadges.length > 0) {
          this.onBadgesUnlocked?.(allNewBadges);
        }
        this.stop({ outcome: 'caught', caughtSpecies: this.enemy.speciesId });
        return;
      }

      this.audio?.playBreakout?.();
      this.pokeballAnim = null;
      this.enemySpriteEl?.classList.remove('capture-energize', 'capture-pull', 'capture-shrink');
      this.enemySpriteEl?.classList.add('is-idle');
      if (this.enemy.isShiny) {
        this.enemySpriteEl?.classList.add('is-shiny-sprite');
      }
      if (this.enemy.isElite) {
        this.enemySpriteEl?.classList.add('is-elite-sprite');
      }
      this.spawnImpactFX('enemy', 'normal', 'Broke free!', '#fde047', {
        count: 16,
        fontSize: 19,
        lifeScale: pace.particleLifeScale,
      });
      await this.say(`Oh no! ${this.enemy.name} broke free!`);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      await this.wait(Math.round(pace.interTurnMs * 0.7), sid);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      const ended = await this.executeEnemyTurn(sid);
      if (ended || !this.isSessionValid(sid) || this.turnToken !== token) return;

      this.returnToPlayerInput(sid);
    } catch (err) {
      console.error('Capture sequence error:', err);
      if (
        this.isSessionValid(sid) &&
        this.turnToken === token &&
        this.state !== BATTLE_STATES.FORCED_SWITCH &&
        this.state !== BATTLE_STATES.BATTLE_END
      ) {
        this.returnToPlayerInput(sid);
      }
    }
  }

  _runBallRaf(duration, sid, onStep, onDone) {
    if (this.ballRafId !== null) {
      cancelAnimationFrame(this.ballRafId);
      this.ballRafId = null;
    }
    if (this.ballResolver) {
      const prev = this.ballResolver;
      this.ballResolver = null;
      prev();
    }

    const startTime = performance.now();
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        this.ballRafId = null;
        if (this.ballResolver === finish) {
          this.ballResolver = null;
        }
        resolve();
      };
      this.ballResolver = finish;

      const tick = (now) => {
        if (!this.isSessionValid(sid)) {
          finish();
          return;
        }
        const t = Math.min(1, (now - startTime) / Math.max(1, duration));
        onStep(t);
        if (t < 1) {
          this.ballRafId = requestAnimationFrame(tick);
        } else {
          onDone?.();
          finish();
        }
      };
      this.ballRafId = requestAnimationFrame(tick);
    });
  }

  animateBallFlight(start, target, ballOpt, duration, sid = this.sessionId) {
    const ballStyle = normalizeBallStyle(ballOpt);
    const isGreat = ballStyle === 'great';
    const isStar = ballStyle === 'star';
    const trailColors = isStar ? ['#fde047', '#c084fc', '#38bdf8'] : isGreat ? ['#7dd3fc'] : ['#fef08a'];
    return this._runBallRaf(duration, sid, (t) => {
      const arcHeight = Math.sin(t * Math.PI) * 104;
      const bx = start.x + (target.x - start.x) * t;
      const by = start.y + (target.y - start.y) * t - arcHeight;
      this.pokeballAnim = {
        x: bx,
        y: by,
        angle: t * Math.PI * 5,
        ballStyle,
        isGreat,
        isStar,
        glow: isStar,
        scale: 1.0 - t * 0.08,
      };
      if (Math.random() < (isStar ? 0.8 : 0.45)) {
        this.particles.push({
          x: bx,
          y: by,
          vx: (Math.random() - 0.5) * 28,
          vy: (Math.random() - 0.5) * 28,
          gravity: 0,
          life: 0,
          maxLife: isStar ? 0.3 : 0.22,
          color: trailColors[Math.floor(Math.random() * trailColors.length)],
          size: isStar ? 3.5 : 2.5,
          shape: 'star',
        });
      }
    });
  }

  async animateBallDropAndBounce(x, fromY, groundY, ballOpt, sid = this.sessionId) {
    const ballStyle = normalizeBallStyle(ballOpt);
    await this.animateBallSegment(x, fromY, groundY, 0, ballStyle, 210, sid);
    if (!this.isSessionValid(sid)) return;
    this.audio?.playPokeballBounce?.(0);
    this.spawnImpactDust({ x, y: groundY + 12 }, 7);

    const bounceHeights = [30, 14, 6];
    const bounceDurations = [190, 140, 100];
    for (let b = 0; b < bounceHeights.length; b++) {
      if (!this.isSessionValid(sid)) return;
      await this.animateBallBounceArc(x, groundY, bounceHeights[b], ballStyle, bounceDurations[b], sid);
      if (!this.isSessionValid(sid)) return;
      this.audio?.playPokeballBounce?.(b + 1);
      if (b === 0) this.spawnImpactDust({ x, y: groundY + 12 }, 4);
    }
  }

  animateBallSegment(x, y0, y1, angle, ballOpt, duration, sid) {
    const ballStyle = normalizeBallStyle(ballOpt);
    const isGreat = ballStyle === 'great';
    const isStar = ballStyle === 'star';
    return this._runBallRaf(duration, sid, (t) => {
      const eased = t * t;
      this.pokeballAnim = {
        x,
        y: y0 + (y1 - y0) * eased,
        angle,
        ballStyle,
        isGreat,
        isStar,
        glow: false,
        shadowAlpha: 0.25 + eased * 0.2,
      };
    });
  }

  animateBallBounceArc(x, groundY, height, ballOpt, duration, sid) {
    const ballStyle = normalizeBallStyle(ballOpt);
    const isGreat = ballStyle === 'great';
    const isStar = ballStyle === 'star';
    return this._runBallRaf(duration, sid, (t) => {
      const arc = Math.sin(t * Math.PI) * height;
      this.pokeballAnim = {
        x,
        y: groundY - arc,
        angle: 0,
        ballStyle,
        isGreat,
        isStar,
        glow: false,
        shadowAlpha: Math.max(0.18, 0.45 - (arc / 40) * 0.22),
      };
    });
  }

  animateBallWobble(x, y, ballOpt, dir, sid = this.sessionId) {
    const ballStyle = normalizeBallStyle(ballOpt);
    const isGreat = ballStyle === 'great';
    const isStar = ballStyle === 'star';
    return this._runBallRaf(
      280,
      sid,
      (t) => {
        const swing = Math.sin(t * Math.PI * 2) * 0.46 * dir;
        this.pokeballAnim = {
          x: x + Math.sin(t * Math.PI * 2) * 7 * dir,
          y,
          angle: swing,
          ballStyle,
          isGreat,
          isStar,
          glow: t < 0.55,
          shadowAlpha: 0.42,
        };
      },
      () => {
        this.pokeballAnim = {
          x,
          y,
          angle: 0,
          ballStyle,
          isGreat,
          isStar,
          glow: false,
          shadowAlpha: 0.42,
        };
      },
    );
  }

  async handleEnemyDefeated(sid = this.sessionId) {
    const pace = this.getPaceConfig();
    const nextEnemyIdx = this.isTrainer
      ? this.enemyParty.findIndex((mon, idx) => idx > this.enemyPartyIndex && !mon.isFainted)
      : -1;
    const fallbackIdx = nextEnemyIdx >= 0
      ? nextEnemyIdx
      : (this.isTrainer ? this.enemyParty.findIndex((mon) => !mon.isFainted) : -1);
    const hasNextEnemy = fallbackIdx >= 0;

    this.state = hasNextEnemy ? BATTLE_STATES.CHECK_FAINT : BATTLE_STATES.BATTLE_END;
    this.audio?.playFaint?.();
    this.enemySpriteEl?.classList.remove('is-idle');
    this.enemySpriteEl?.classList.add('faint-drop');
    await this.wait(Math.max(320, pace.postImpactMs), sid);
    if (!this.isSessionValid(sid)) return;

    this.renderStatusCards();
    await this.say(`${this.enemy.name} fainted!`);
    if (!this.isSessionValid(sid)) return;

    if (hasNextEnemy) {
      await this.awardVictoryXp(1.0, sid, { deferBadges: false, grantBenchBond: false });
      if (!this.isSessionValid(sid)) return;

      this.enemyPartyIndex = fallbackIdx;
      this.enemy = this.enemyParty[this.enemyPartyIndex];
      this.enemy.resetBattleState?.();
      this.displayedEnemyHp = this.enemy.hp;
      this.storage.recordSeen(this.enemy.speciesId);

      this._resetSpriteClasses('enemy');
      this.enemySpriteEl?.classList.remove('faint-drop');
      this.renderStatusCards();
      await PokemonMod.attachPokemonSprite(this.enemySpriteEl, this.enemy.speciesId, {
        back: false,
        shiny: Boolean(this.enemy.isShiny),
        timeoutMs: 2000,
      });
      if (!this.isSessionValid(sid)) return;

      this.enemySpriteEl?.classList.toggle('is-shiny-sprite', Boolean(this.enemy.isShiny));
      this.enemySpriteEl?.classList.toggle('is-elite-sprite', Boolean(this.enemy.isElite));
      this.enemySpriteEl?.classList.remove('is-idle');
      this.enemySpriteEl?.classList.add('enemy-sendout');
      this.audio?.playPokeballThrow?.();
      this.spawnImpactFX('enemy', this.enemy.type, '', '#ffffff', {
        ring: true,
        ringRadius: 84,
        count: 18,
        lifeScale: pace.particleLifeScale,
      });
      if (this.enemy.isShiny) {
        this.audio?.playShinySparkle?.();
        this.spawnShinyIntroSparkles('enemy');
      }
      if (this.enemy.isElite) {
        this.spawnEliteIntroAura('enemy');
      }

      const rivalName = this.trainerData?.name || 'Rival';
      await this.say(`${rivalName} sent out ${this.enemy.name}!`);
      if (!this.isSessionValid(sid)) return;

      this.returnToPlayerInput(sid);
      return;
    }

    this.player?.gainBond?.(4);
    const badgeList = [...this.storage.recordBattleWin()];
    if (this.isShrine && this.shrineData) {
      const shrineBadges = this.storage.markShrineCleared(this.shrineData.id);
      badgeList.push(...shrineBadges);
    }

    const evoBadges = await this.awardVictoryXp(1.0, sid, { deferBadges: true });
    if (!this.isSessionValid(sid)) return;
    if (Array.isArray(evoBadges) && evoBadges.length > 0) {
      badgeList.push(...evoBadges);
    }

    const shards = this.awardBattleStarShards({ caught: false });
    if (shards > 0) {
      await this.say(`+${shards} ✨ Star Shards!`);
      if (!this.isSessionValid(sid)) return;
    }

    if (!this.isTrainer) {
      const dropChance = this.isShrine ? 0.9 : 0.45;
      if (Math.random() < dropChance) {
        const dropBiome = this.shrineData?.biome || this.biomeId;
        const gemByBiome = {
          forest: 'leaf_gem',
          cave: 'moon_gem',
          water: 'water_gem',
          volcano: Math.random() < 0.5 ? 'fire_gem' : 'thunder_gem',
          peak: 'ice_gem',
          grove: 'astral_gem',
        };
        const fallbackGemNames = {
          leaf_gem: 'Verdant Gem',
          moon_gem: 'Starlight Gem',
          water_gem: 'Tide Gem',
          fire_gem: 'Ember Gem',
          thunder_gem: 'Spark Gem',
          ice_gem: 'Aurora Gem',
          sun_gem: 'Sunburst Gem',
          dusk_gem: 'Twilight Gem',
          astral_gem: 'Astral Gem',
        };
        const gemId = gemByBiome[dropBiome] || null;
        const roll = Math.random();
        let bonus = null;
        let itemLabel = '';

        if (gemId && roll < 0.34) {
          bonus = { gems: { [gemId]: 1 } };
          const gemMeta = getEvolutionItemsMap()?.[gemId];
          const gemName = gemMeta?.name || fallbackGemNames[gemId] || 'Evolution Gem';
          itemLabel = `${gemMeta?.icon || '💎'} a ${gemName}`;
        } else if (roll < 0.58) {
          bonus = { starBalls: 1 };
          itemLabel = '🌟 a Star Ball';
        } else if (roll < 0.8) {
          bonus = { greatBalls: 1 };
          itemLabel = '🔵 a Great Ball';
        } else {
          bonus = { potions: 1 };
          itemLabel = '🍓 a Berry Potion';
        }

        this.storage.addRewards(bonus);
        await this.say(`Found ${itemLabel} on the victory trail!`);
        if (!this.isSessionValid(sid)) return;
      }
    }

    this.onHudRefresh?.();
    if (badgeList.length > 0) {
      this.onBadgesUnlocked?.(badgeList);
    }
    this.stop({
      outcome: 'won',
      isShrine: this.isShrine,
      isTrainer: this.isTrainer,
      trainerData: this.trainerData,
    });
  }

  async animateXpTo(fromPct, toPct, duration = 450, sid = this.sessionId) {
    if (!this.isSessionValid(sid) || !this.playerXpFillEl) return;
    const safeFrom = Math.max(0, Math.min(100, Number(fromPct) || 0));
    const safeTo = Math.max(0, Math.min(100, Number(toPct) || 0));
    if (duration <= 0 || Math.abs(safeTo - safeFrom) < 0.25) {
      this.playerXpFillEl.style.width = `${safeTo}%`;
      return;
    }

    if (this.xpRaf !== null) {
      cancelAnimationFrame(this.xpRaf);
      this.xpRaf = null;
    }
    if (this.xpResolver) {
      const prev = this.xpResolver;
      this.xpResolver = null;
      prev();
    }

    const startTime = performance.now();
    let lastTickAt = -100;

    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        this.xpRaf = null;
        if (this.xpResolver === done) {
          this.xpResolver = null;
        }
        resolve();
      };
      this.xpResolver = done;

      const tick = (now) => {
        if (!this.isSessionValid(sid)) {
          done();
          return;
        }
        const t = Math.min(1, (now - startTime) / Math.max(1, duration));
        const eased = 1 - Math.pow(1 - t, 2);
        const pct = safeFrom + (safeTo - safeFrom) * eased;
        if (this.playerXpFillEl) {
          this.playerXpFillEl.style.width = `${pct.toFixed(2)}%`;
        }
        if (now - lastTickAt >= 58 && t < 0.98) {
          lastTickAt = now;
          this.audio?.playXpTick?.(pct / 100);
        }

        if (t < 1 && this.isSessionValid(sid)) {
          this.xpRaf = requestAnimationFrame(tick);
        } else {
          if (this.playerXpFillEl) {
            this.playerXpFillEl.style.width = `${Math.round(safeTo)}%`;
          }
          done();
        }
      };

      this.xpRaf = requestAnimationFrame(tick);
    });
  }

  awardBattleStarShards({ caught = false } = {}) {
    const rawShards = typeof PokemonMod.getBattleShardReward === 'function'
      ? PokemonMod.getBattleShardReward(this.enemy, {
          isShrine: this.isShrine,
          isTrainer: this.isTrainer,
          caught: Boolean(caught),
        })
      : (this.isShrine ? 3 : this.isTrainer ? 2 : this.enemy?.isElite ? 3 : 1);
    const shards = Math.max(0, Math.round(Number(rawShards) || 0));
    if (shards <= 0 || !this.storage) return 0;

    if (typeof this.storage.addStarShards === 'function') {
      this.storage.addStarShards(shards);
    } else {
      const profile = this.storage.getActiveProfile?.();
      const before = Number(profile?.bag?.starShards) || 0;
      this.storage.addRewards?.({ starShards: shards });
      const after = Number(profile?.bag?.starShards) || 0;
      if (after === before && profile) {
        if (!profile.bag || typeof profile.bag !== 'object') {
          profile.bag = { potions: 0, greatBalls: 0, starBalls: 0, gems: {}, starShards: 0 };
        }
        profile.bag.starShards = before + shards;
        this.storage.save?.();
      }
    }
    return shards;
  }

  async awardVictoryXp(scale = 1.0, sid = this.sessionId, { deferBadges = false, excludeUids = null, grantBenchBond = true } = {}) {
    if (!this.isSessionValid(sid)) return [];
    const pace = this.getPaceConfig();
    const playerName = this.player.displayName || this.player.name;
    const prevXp = this.player.xp;
    const prevXpToNext = Math.max(1, this.player.xpToNext);
    const startPct = Math.min(100, (prevXp / prevXpToNext) * 100);

    const bondMult = PokemonMod.getBondTier?.(this.player.bond)?.xpMult ?? 1.0;
    const xpGain = Math.max(12, Math.round((this.enemy.level * 14 + 12) * scale * bondMult));
    await this.say(`${playerName} gained ${xpGain} XP!`);
    if (!this.isSessionValid(sid)) return [];

    const levelResult = this.player.gainXp(xpGain);
    const profile = this.storage.getActiveProfile?.();
    const excludeSet = new Set(Array.isArray(excludeUids) ? excludeUids.filter(Boolean) : []);
    const benchShareXp = Math.max(6, Math.round(xpGain * 0.4));
    const benchReceivers = [];
    const benchLevelUps = [];
    if (profile && Array.isArray(profile.team)) {
      for (const mate of profile.team) {
        if (!mate || mate === this.player || (this.player.uid && mate.uid === this.player.uid)) continue;
        if (mate.uid && excludeSet.has(mate.uid)) continue;
        if (mate.isFainted || Number(mate.hp) <= 0) continue;
        const benchRes = mate.gainXp?.(benchShareXp);
        if (grantBenchBond) {
          mate.gainBond?.(2);
        }
        benchReceivers.push(mate);
        if (benchRes?.leveledUp) {
          benchLevelUps.push({
            name: mate.displayName || mate.name,
            newLevel: benchRes.newLevel,
          });
        }
      }
    }

    const bondBadges = (grantBenchBond && typeof this.storage.evaluateBadges === 'function')
      ? this.storage.evaluateBadges(false)
      : [];
    this.storage.save();
    this.displayedPlayerHp = this.player.hp;
    const endPct = Math.min(100, (this.player.xp / Math.max(1, this.player.xpToNext)) * 100);

    if (levelResult.leveledUp) {
      await this.animateXpTo(startPct, 100, Math.round((pace.hpDrainMs || 460) * 0.8), sid);
      if (!this.isSessionValid(sid)) return [];

      this.audio?.playLevelUp?.();
      const center = this.getSpriteCenter('player');
      this.spawnStarBurst(center);
      this.spawnFloatingText(center.x, center.y - 40, `LEVEL UP! Lv.${levelResult.newLevel}`, '#fde047', 20, 0, 1.45);
      this.renderStatusCards();
      if (this.playerXpFillEl) {
        this.playerXpFillEl.style.width = '0%';
      }
      this.onHudRefresh?.();
      await this.say(`${playerName} grew to Level ${levelResult.newLevel}!`);
      if (!this.isSessionValid(sid)) return [];

      if (endPct > 0) {
        await this.animateXpTo(0, endPct, Math.round((pace.hpDrainMs || 460) * 0.7), sid);
        if (!this.isSessionValid(sid)) return [];
      }
    } else {
      await this.animateXpTo(startPct, endPct, pace.hpDrainMs || 460, sid);
      if (!this.isSessionValid(sid)) return [];
    }

    if (benchReceivers.length > 0 && this.isSessionValid(sid)) {
      if (benchLevelUps.length > 0 && !levelResult.leveledUp) {
        this.audio?.playLevelUp?.();
      }
      const lvlSummary = benchLevelUps.length > 0
        ? ` (${benchLevelUps.map((u) => `${u.name} → Lv.${u.newLevel}!`).join(', ')})`
        : '';
      await this.say(`Team bench gained ${benchShareXp} Catch-Up XP!${lvlSummary}`);
      if (!this.isSessionValid(sid)) return [];
    }

    this.renderStatusCards();
    this.onHudRefresh?.();

    const pendingEvo = this.player.getPendingLevelEvolution?.();
    if (pendingEvo && this.isSessionValid(sid)) {
      const evoBadges = await this.runEvolutionCeremony(pendingEvo, sid, { emitBadges: !deferBadges });
      if (!deferBadges && bondBadges.length > 0) {
        this.onBadgesUnlocked?.(bondBadges);
      }
      return [...bondBadges, ...(Array.isArray(evoBadges) ? evoBadges : [])];
    }
    if (!deferBadges && bondBadges.length > 0) {
      this.onBadgesUnlocked?.(bondBadges);
    }
    return bondBadges;
  }

  async runEvolutionCeremony(pendingEvo, sid = this.sessionId, { emitBadges = true } = {}) {
    if (!pendingEvo || !this.player || !this.isSessionValid(sid)) return [];

    const oldName = this.player.displayName || this.player.name;
    const center = this.getSpriteCenter('player');
    await this.say(`What?! ${oldName} is glowing with Starlight energy!`);
    if (!this.isSessionValid(sid)) return [];

    this.audio?.playEvolutionStart?.();
    this.playerSpriteEl?.classList.remove('is-idle');
    this.playerSpriteEl?.classList.add('evo-glow');

    const spiralColors = ['#fde047', '#f472b6', '#38bdf8', '#c084fc', '#ffffff'];
    for (let i = 0; i < 24; i++) {
      const startAngle = (Math.PI * 2 * i) / 24;
      this.particles.push({
        x: center.x + Math.cos(startAngle) * 78,
        y: center.y + Math.sin(startAngle) * 56,
        orbitCenter: center,
        orbitAngle: startAngle,
        orbitRadius: 72 + (i % 3) * 14,
        orbitRadialVel: -52,
        orbitAngVel: 7.5,
        life: -(i * 0.025),
        maxLife: 1.05,
        color: spiralColors[i % spiralColors.length],
        size: 4.5 + (i % 3) * 1.5,
        rotation: startAngle,
        spin: 9,
        shape: 'star',
      });
    }

    await this.wait(560, sid);
    if (!this.isSessionValid(sid)) return [];

    this.playerSpriteEl?.classList.add('evo-flash');
    await this.wait(420, sid);
    if (!this.isSessionValid(sid)) return [];

    const evoRes = typeof this.storage.evolvePokemon === 'function'
      ? this.storage.evolvePokemon(this.player.uid, pendingEvo.toId)
      : { evolution: this.player.evolve?.(pendingEvo.toId), newBadges: [] };

    await PokemonMod.attachPokemonSprite(this.playerSpriteEl, pendingEvo.toId, {
      back: true,
      shiny: Boolean(this.player.isShiny),
      timeoutMs: 2000,
    });
    if (!this.isSessionValid(sid)) return [];

    this.playerSpriteEl?.classList.remove('evo-glow', 'evo-flash');
    this._resetSpriteClasses('player');
    this.displayedPlayerHp = this.player.hp;
    this.renderStatusCards();
    this.renderMoveButtons();
    this.onHudRefresh?.();

    this.audio?.playEvolutionFanfare?.();
    this.spawnStarBurst(center);
    this.spawnFloatingText(center.x, center.y - 44, 'EVOLVED!', '#fde047', 24, 0, 1.55);

    const movesMap = getMovesMap();
    const unlockedList = Array.isArray(evoRes?.evolution?.unlockedMoves) ? evoRes.evolution.unlockedMoves : [];
    const moveNames = unlockedList
      .map((m) => (typeof m === 'string' ? (movesMap[m]?.name || m) : m?.name || ''))
      .filter(Boolean);
    const moveText = moveNames.length > 0 ? ` Learned ${moveNames.join(', ')}!` : '';

    await this.say(`✨ Congratulations! ${oldName} evolved into ${this.player.name}!${moveText}`);
    if (!this.isSessionValid(sid)) return [];

    const evoBadges = Array.isArray(evoRes?.newBadges) ? evoRes.newBadges : [];
    if (emitBadges && evoBadges.length > 0) {
      this.onBadgesUnlocked?.(evoBadges);
    }
    return evoBadges;
  }

  async handlePlayerFainted(sid = this.sessionId) {
    const pace = this.getPaceConfig();
    this.audio?.playFaint?.();
    this.playerSpriteEl?.classList.remove('is-idle');
    this.playerSpriteEl?.classList.add('faint-drop');
    await this.wait(Math.max(320, pace.postImpactMs), sid);
    if (!this.isSessionValid(sid)) return;
    await this.say(`${this.player.displayName || this.player.name} fainted!`);
    if (!this.isSessionValid(sid)) return;

    const profile = this.storage.getActiveProfile();
    const healthyIdx = profile?.team?.findIndex((mon) => !mon.isFainted) ?? -1;
    if (healthyIdx >= 0) {
      this.state = BATTLE_STATES.FORCED_SWITCH;
      this.busy = false;
      this.mustSwitchForced = true;
      this.screenEl?.classList.remove('is-action-locked');
      this.openTeamDrawer(true);
      return;
    }

    this.state = BATTLE_STATES.BATTLE_END;
    await this.say('Your team needs a quick rest! Returning to Starlight Fountain...');
    if (!this.isSessionValid(sid)) return;
    this.stop({ outcome: 'fainted', faintedAll: true });
  }

  async handleRun() {
    if (!this.canAcceptPlayerAction()) return;
    const sid = this.sessionId;
    const token = this.lockPlayerAction(BATTLE_STATES.BATTLE_END);
    this.audio?.playMenuBlip?.(520);
    await this.say(
      this.isShrine
        ? 'Stepped back safely from the Shrine!'
        : this.isTrainer
          ? 'Stepped back safely from the duel!'
          : 'Got away safely!',
    );
    if (!this.isSessionValid(sid) || this.turnToken !== token) return;
    this.stop({ outcome: 'escaped', faintedAll: false });
  }

  openTeamDrawer(forced = false) {
    if (!this.active) return;
    if (!forced && !this.canAcceptPlayerAction()) return;
    const profile = this.storage.getActiveProfile();
    if (!profile || !this.teamDrawerEl || !this.teamListEl) return;

    if (!forced) {
      this.audio?.playMenuBlip?.(640);
    }

    this.mustSwitchForced = forced;
    if (this.teamCloseBtn) this.teamCloseBtn.hidden = forced;
    this.teamDrawerEl.hidden = false;
    this.teamListEl.innerHTML = '';

    profile.team.forEach((mon, idx) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'battle-switch-card';
      const isCurrent = idx === this.playerIndex;
      card.disabled = mon.isFainted || isCurrent;

      const img = document.createElement('img');
      PokemonMod.attachPokemonSprite(img, mon.speciesId, {
        back: false,
        shiny: Boolean(mon.isShiny),
        timeoutMs: 1500,
      });

      const rankBadge = (mon.upgradeTier || 0) > 0
        ? ` <span class="rank-pill">★${mon.upgradeTier}</span>`
        : '';
      const info = document.createElement('div');
      info.innerHTML = `
        <strong>${mon.isShiny ? '✨ ' : ''}${mon.displayName || mon.name}</strong>${rankBadge} <span style="color:#fde047">Lv.${mon.level}</span>
        <div style="font-size:0.75rem;color:#cbd5e1">HP ${mon.hp}/${mon.maxHp} ${isCurrent ? '• Active' : mon.isFainted ? '• Fainted' : ''}</div>
      `;

      card.appendChild(img);
      card.appendChild(info);
      card.addEventListener('click', () => this.switchPlayerPokemon(idx));
      this.teamListEl.appendChild(card);
    });
  }

  closeTeamDrawer() {
    if (this.teamDrawerEl) {
      this.teamDrawerEl.hidden = true;
    }
  }

  async switchPlayerPokemon(teamIdx) {
    if (!this.active || this.busy) return;
    if (this.state !== BATTLE_STATES.PLAYER_INPUT && this.state !== BATTLE_STATES.FORCED_SWITCH) return;
    const profile = this.storage.getActiveProfile();
    if (!profile || !profile.team[teamIdx] || profile.team[teamIdx].isFainted) return;
    if (teamIdx === this.playerIndex) return;

    const sid = this.sessionId;
    const pace = this.getPaceConfig();
    const wasForced = this.mustSwitchForced;
    this.mustSwitchForced = false;
    this.closeTeamDrawer();
    const token = this.lockPlayerAction(BATTLE_STATES.ACTION_ANIMATING);
    this.audio?.playMoveSelect?.();

    try {
      this.playerIndex = teamIdx;
      this.player = profile.team[teamIdx];
      this.player.resetBattleState?.();
      this.selectedMoveIndex = 0;
      this.displayedPlayerHp = this.player.hp;
      this._resetSpriteClasses('player');

      this.renderStatusCards();
      this.renderMoveButtons();
      this.setControlsDisabled(true);
      this.onHudRefresh?.();
      await PokemonMod.attachPokemonSprite(this.playerSpriteEl, this.player.speciesId, {
        back: true,
        shiny: Boolean(this.player.isShiny),
        timeoutMs: 1800,
      });
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;
      this.playerSpriteEl?.classList.toggle('is-shiny-sprite', Boolean(this.player.isShiny));
      await this.say(`Go, ${this.player.displayName || this.player.name}!`);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      if (!wasForced) {
        await this.wait(Math.round(pace.interTurnMs * 0.7), sid);
        if (!this.isSessionValid(sid) || this.turnToken !== token) return;
        const ended = await this.executeEnemyTurn(sid);
        if (ended || !this.isSessionValid(sid) || this.turnToken !== token) return;
      }

      this.returnToPlayerInput(sid);
    } catch (err) {
      console.error('Switch error:', err);
      if (
        this.isSessionValid(sid) &&
        this.turnToken === token &&
        this.state !== BATTLE_STATES.FORCED_SWITCH &&
        this.state !== BATTLE_STATES.BATTLE_END
      ) {
        this.returnToPlayerInput(sid);
      }
    }
  }
}
