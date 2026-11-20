import { MOVES, TYPES } from './config.js';
import {
  attachPokemonSprite,
  calculateCatchAttempt,
  calculateDamage,
  getTypeEffectiveness,
} from './pokemon.js';

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
]);

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

    this.playerNameEl = document.getElementById('player-name');
    this.playerLevelEl = document.getElementById('player-level');
    this.playerTypeEl = document.getElementById('player-type');
    this.playerStagesEl = document.getElementById('player-stages');
    this.playerHpFillEl = document.getElementById('player-hp-fill');
    this.playerHpTextEl = document.getElementById('player-hp-text');
    this.playerXpFillEl = document.getElementById('player-xp-fill');
    this.playerSpriteEl = document.getElementById('player-sprite');

    this.logEl = document.getElementById('battle-log');
    this.movesEl = document.getElementById('battle-moves');
    this.btnBall = document.getElementById('battle-btn-ball');
    this.btnGreat = document.getElementById('battle-btn-great');
    this.btnPotion = document.getElementById('battle-btn-potion');
    this.btnTeam = document.getElementById('battle-btn-team');
    this.btnRun = document.getElementById('battle-btn-run');

    this.teamDrawerEl = document.getElementById('battle-team-drawer');
    this.teamListEl = document.getElementById('battle-team-list');
    this.teamCloseBtn = document.getElementById('battle-team-close');

    this.active = false;
    this.busy = false;
    this.state = BATTLE_STATES.INACTIVE;
    this.sessionId = 0;
    this.turnToken = 0;
    this.lastActionAt = 0;
    this.selectedMoveIndex = 0;

    this.enemy = null;
    this.player = null;
    this.playerIndex = 0;
    this.biomeId = 'forest';
    this.isShrine = false;
    this.shrineData = null;

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
    this.resizeObserver = null;
    this._uiAbort = new AbortController();

    this.bindUI();
  }

  bindUI() {
    const signal = this._uiAbort.signal;
    this.logEl?.addEventListener('click', () => this.finishTypewriter(), { signal });
    this.btnBall?.addEventListener('click', () => this.handleThrowBall(false), { signal });
    this.btnGreat?.addEventListener('click', () => this.handleThrowBall(true), { signal });
    this.btnPotion?.addEventListener('click', () => this.handleUsePotion(), { signal });
    this.btnTeam?.addEventListener('click', () => this.openTeamDrawer(false), { signal });
    this.btnRun?.addEventListener('click', () => this.handleRun(), { signal });

    const actionButtons = [this.btnBall, this.btnGreat, this.btnPotion, this.btnTeam, this.btnRun];
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
    el.className = `fighter-sprite fighter-sprite-${side} is-idle${mon?.isShiny ? ' is-shiny-sprite' : ''}`;
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
    this.setIdlePrompt(`What will ${this.player.name} do?`);
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

  async start({ enemy, biomeId = 'forest', isShrine = false, shrineData = null }) {
    const profile = this.storage.getActiveProfile();
    if (!profile) {
      this.onBattleEnd?.({ outcome: 'escaped', faintedAll: false });
      return;
    }

    this.storage.ensureHealthyParty?.(profile);
    if (profile.team.length === 0 || !enemy) {
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
    this.lastActionAt = 0;
    this.selectedMoveIndex = 0;
    this.enemy = enemy;
    this.biomeId = isShrine ? 'shrine' : biomeId;
    this.isShrine = isShrine;
    this.shrineData = shrineData;

    this.player.resetBattleState?.();
    this.enemy.resetBattleState?.();

    this.active = true;
    this.busy = true;
    this.state = BATTLE_STATES.INTRO;
    this.mustSwitchForced = false;
    this.particles = [];
    this.popups = [];
    this.pokeballAnim = null;
    this.captureBeam = null;
    this.shakeTimer = 0;
    if (this.stageEl) this.stageEl.style.transform = '';

    this.storage.recordSeen(enemy.speciesId);

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
    this.displayedEnemyHp = enemy.hp;
    this.displayedPlayerHp = this.player.hp;

    this.renderStatusCards();
    this.renderMoveButtons();
    this.renderActionButtons();
    this.setControlsDisabled(true);

    await Promise.all([
      attachPokemonSprite(this.enemySpriteEl, enemy.speciesId, {
        back: false,
        shiny: Boolean(enemy.isShiny),
        timeoutMs: 2000,
      }),
      attachPokemonSprite(this.playerSpriteEl, this.player.speciesId, {
        back: true,
        shiny: Boolean(this.player.isShiny),
        timeoutMs: 2000,
      }),
    ]);

    if (!this.isSessionValid(sid)) return;

    this.enemySpriteEl?.classList.toggle('is-shiny-sprite', Boolean(enemy.isShiny));
    this.playerSpriteEl?.classList.toggle('is-shiny-sprite', Boolean(this.player.isShiny));

    if (enemy.isShiny) {
      this.audio?.playShinySparkle?.();
      this.spawnShinyIntroSparkles('enemy');
    }

    const introMsg = isShrine && shrineData
      ? shrineData.intro
      : enemy.isShiny
        ? `✨ A rare Starlight Shimmer ${enemy.name} appeared! Go, ${this.player.name}!`
        : `A wild ${enemy.name} appeared! Go, ${this.player.name}!`;
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
    this.pokeballAnim = null;
    this.captureBeam = null;
    this.particles = [];
    this.popups = [];
    this.shakeTimer = 0;
    if (this.stageEl) this.stageEl.style.transform = '';
    this.enemySpriteEl?.classList.remove('windup', 'hit-stop', 'hit-shake', 'evo-glow', 'evo-flash');
    this.playerSpriteEl?.classList.remove('windup', 'hit-stop', 'hit-shake', 'evo-glow', 'evo-flash');

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

  renderStagePills(containerEl, mon) {
    if (!containerEl || !mon) return;
    const chips = [];
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

    if (this.enemyNameEl) this.enemyNameEl.textContent = this.enemy.name;
    if (this.enemyLevelEl) this.enemyLevelEl.textContent = `Lv.${this.enemy.level}`;
    const eType = TYPES[this.enemy.type] || TYPES.normal;
    if (this.enemyTypeEl) {
      this.enemyTypeEl.textContent = `${eType.icon} ${eType.label}`;
      this.enemyTypeEl.style.background = eType.bg;
      this.enemyTypeEl.style.color = '#ffffff';
    }
    if (this.enemyDexPillEl) {
      this.enemyDexPillEl.hidden = !caughtBefore || this.isShrine;
    }
    this.updateHpBarVisual(this.enemyHpFillEl, this.displayedEnemyHp, this.enemy.maxHp);
    if (this.enemyStagesEl) {
      this.renderStagePills(this.enemyStagesEl, this.enemy);
    }

    if (this.playerNameEl) this.playerNameEl.textContent = this.player.name;
    if (this.playerLevelEl) this.playerLevelEl.textContent = `Lv.${this.player.level}`;
    const pType = TYPES[this.player.type] || TYPES.normal;
    if (this.playerTypeEl) {
      this.playerTypeEl.textContent = `${pType.icon} ${pType.label}`;
      this.playerTypeEl.style.background = pType.bg;
      this.playerTypeEl.style.color = '#ffffff';
    }
    this.updateHpBarVisual(this.playerHpFillEl, this.displayedPlayerHp, this.player.maxHp);
    if (this.playerHpTextEl) {
      this.playerHpTextEl.textContent = `HP ${Math.round(this.displayedPlayerHp)}/${this.player.maxHp}`;
    }
    if (this.playerXpFillEl) {
      const xpPct = Math.min(100, Math.round((this.player.xp / Math.max(1, this.player.xpToNext)) * 100));
      this.playerXpFillEl.style.width = `${xpPct}%`;
    }
    if (this.playerStagesEl) {
      this.renderStagePills(this.playerStagesEl, this.player);
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

  renderMoveButtons() {
    if (!this.movesEl || !this.player || !this.enemy) return;
    const moves = this.player.getMoveObjects();
    const hasAnyPp = this.player.hasAnyMovePp();
    this.movesEl.innerHTML = '';

    if (this.selectedMoveIndex >= moves.length) {
      this.selectedMoveIndex = 0;
    }

    moves.forEach((move, idx) => {
      const typeMeta = TYPES[move.type] || TYPES.normal;
      const isNonAttack = move.category === 'heal' || move.category === 'buff' || move.category === 'shield';
      const eff = isNonAttack ? 1 : getTypeEffectiveness(move.type, this.enemy.type);
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
      } else if (eff > 1) {
        effBadgeHtml = '<span class="move-eff-tag is-super">★ 2× SUPER</span>';
      } else if (eff < 1) {
        effBadgeHtml = '<span class="move-eff-tag is-resist">½× RESIST</span>';
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
    if (this.btnBall) {
      this.btnBall.textContent = this.isShrine ? '🛡️ Guardian' : '🔴 Poké Ball ∞';
      this.btnBall.disabled = locked;
    }
    if (this.btnGreat) {
      this.btnGreat.textContent = `🔵 Great Ball (${profile.bag.greatBalls})`;
      this.btnGreat.disabled = locked || this.isShrine || profile.bag.greatBalls <= 0;
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

  spawnChargeParticles(side, type, pace) {
    const center = this.getSpriteCenter(side);
    const typeColor = (TYPES[type] || TYPES.normal).color;
    const lifeScale = pace?.particleLifeScale || 1.2;
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
    const fxColors = {
      heal: '#4ade80',
      buff: '#fde047',
      shield: '#67e8f9',
    };
    const typeColor = TYPES[type]?.color || fxColors[type] || TYPES.normal.color;
    const count = options.count || 22;

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
        color: '#ffffff',
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
    };
    const shape = shapeMap[type] || 'circle';

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.35;
      const speed = 75 + Math.random() * 155;
      const isBuoyant = shape === 'ember' || shape === 'bubble' || shape === 'wisp' || shape === 'dragonflame';
      this.particles.push({
        x: center.x + (Math.random() - 0.5) * 18,
        y: center.y + (Math.random() - 0.5) * 18,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isBuoyant ? 55 : 22),
        gravity: isBuoyant ? -75 : shape === 'leaf' || shape === 'crystal' ? 48 : 190,
        life: 0,
        maxLife: (0.45 + Math.random() * 0.28) * lifeScale,
        color: i % 3 === 0 ? '#ffffff' : typeColor,
        size: shape === 'leaf' ? 7 + Math.random() * 4 : 3.5 + Math.random() * 4.5,
        rotation: angle,
        spin: (Math.random() - 0.5) * 10,
        shape,
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

  async animateElementalStream(attackerSide, defenderSide, move, sessionId) {
    const pace = this.getPaceConfig();
    const start = this.getSpriteCenter(attackerSide);
    const target = this.getSpriteCenter(defenderSide);
    const typeMeta = TYPES[move.type] || TYPES.normal;

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
    const shape = shapeByType[move.type] || 'circle';
    const steps = pace.streamSteps || 14;
    const stepWaitMs = pace.streamStepMs || 30;
    const lifeScale = pace.particleLifeScale || 1.2;

    for (let s = 0; s < steps; s++) {
      if (!this.isSessionValid(sessionId)) return;
      const t = s / Math.max(1, steps - 1);
      const ctrlX = (start.x + target.x) * 0.5;
      const ctrlY = Math.min(start.y, target.y) - 48;
      const inv = 1 - t;
      const px = inv * inv * start.x + 2 * inv * t * ctrlX + t * t * target.x;
      const py = inv * inv * start.y + 2 * inv * t * ctrlY + t * t * target.y;

      const burstCount = shape === 'leaf' ? 3 : 4;
      for (let k = 0; k < burstCount; k++) {
        const spread = (Math.random() - 0.5) * 18;
        const speed = 55 + Math.random() * 75;
        const dx = target.x - start.x;
        const dy = target.y - start.y;
        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.38;

        this.particles.push({
          x: px + spread,
          y: py + (Math.random() - 0.5) * 16,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (shape === 'bubble' || shape === 'ember' || shape === 'wisp' ? 32 : 0),
          gravity: shape === 'bubble' || shape === 'ember' || shape === 'wisp' ? -55 : 22,
          life: 0,
          maxLife: (0.34 + Math.random() * 0.18) * Math.min(1.4, lifeScale),
          color: k === 0 && shape !== 'leaf' ? '#ffffff' : typeMeta.color,
          size: shape === 'leaf' ? 8 : 5 + Math.random() * 3.5,
          rotation: angle,
          spin: shape === 'leaf' || shape === 'crystal' ? 10 : 4,
          shape,
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
      grad.addColorStop(0, 'rgba(254, 202, 202, 0.92)');
      grad.addColorStop(0.5, 'rgba(239, 68, 68, 0.65)');
      grad.addColorStop(1, 'rgba(239, 68, 68, 0.08)');
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
        const radius = p.size + (p.maxRadius - p.size) * (1 - Math.pow(1 - progress, 2));
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1.5, 4 * (1 - progress));
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
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
        ctx.fillStyle = '#22c55e';
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(p.size, 0);
        ctx.quadraticCurveTo(0, -p.size * 0.65, -p.size, 0);
        ctx.quadraticCurveTo(0, p.size * 0.65, p.size, 0);
        ctx.fill();
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

    if (ball.shadowAlpha) {
      ctx.save();
      ctx.rotate(-(ball.angle || 0));
      ctx.fillStyle = `rgba(2, 6, 23, ${ball.shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(0, r + 4, 15, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = ball.isGreat ? '#0ea5e9' : '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, r, Math.PI, 0);
    ctx.closePath();
    ctx.fill();

    if (ball.isGreat) {
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-10, -10, 5, 4);
      ctx.fillRect(5, -10, 5, 4);
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-6, -7, 4.5, 2.5, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-r, -2.5, r * 2, 5);

    ctx.fillStyle = ball.glow ? '#fde047' : '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 5.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  async playAttackVisual(attackerSide, defenderSide, move, result, defender, sessionId) {
    const pace = this.getPaceConfig();
    const atkSprite = attackerSide === 'player' ? this.playerSpriteEl : this.enemySpriteEl;
    const defSprite = defenderSide === 'enemy' ? this.enemySpriteEl : this.playerSpriteEl;
    const isQuick = move.id === 'quick_attack' || move.id === 'spark_dash' || move.id === 'agility_dash';
    const lungeClass = attackerSide === 'player'
      ? (isQuick ? 'quick-lunge-right' : 'lunge-right')
      : (isQuick ? 'quick-lunge-left' : 'lunge-left');

    // Beat 1: Wind-Up Anticipation
    atkSprite?.classList.remove('is-idle');
    atkSprite?.classList.add('windup');
    this.audio?.playWindup?.(move.type);
    this.spawnChargeParticles(attackerSide, move.type, pace);
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
      atkSprite?.classList.remove(lungeClass);
      atkSprite?.classList.add('is-idle');
      return;
    }

    if (move.category === 'buff' || result.category === 'buff') {
      atkSprite?.classList.add(lungeClass);
      this.audio?.playBuffChime?.();
      const statShort = { atk: 'ATK', def: 'DEF', spd: 'SPD' }[result.buffStat || move.buffStat || 'atk'] || 'STAT';
      const fxType = move.type && move.type !== 'normal' ? move.type : 'buff';
      this.spawnImpactFX(attackerSide, fxType, `${statShort} ▲!`, '#fde047', {
        ring: true,
        ringRadius: 88,
        ringColor: '#fde047',
        count: 20,
        fontSize: 22,
        lifeScale: pace.particleLifeScale,
      });
      await this.wait(Math.max(240, pace.postImpactMs), sessionId);
      if (!this.isSessionValid(sessionId)) return;
      atkSprite?.classList.remove(lungeClass);
      atkSprite?.classList.add('is-idle');
      return;
    }

    if (move.category === 'shield' || result.category === 'shield') {
      atkSprite?.classList.add(lungeClass);
      this.audio?.playShieldChime?.();
      this.spawnImpactFX(attackerSide, 'shield', 'SHIELD UP!', '#67e8f9', {
        ring: true,
        ringRadius: 94,
        ringColor: '#67e8f9',
        count: 22,
        fontSize: 21,
        lifeScale: pace.particleLifeScale,
      });
      await this.wait(Math.max(240, pace.postImpactMs), sessionId);
      if (!this.isSessionValid(sessionId)) return;
      atkSprite?.classList.remove(lungeClass);
      atkSprite?.classList.add('is-idle');
      return;
    }

    // Beat 2: Travel / Delivery
    atkSprite?.classList.add(lungeClass);
    const isPhysical = PHYSICAL_MOVE_IDS.has(move.id) || move.fx === 'impact';
    if (isPhysical) {
      if (move.id === 'tackle' || move.id === 'quick_attack') {
        this.audio?.playPhysicalImpact?.(move.power);
      } else {
        this.audio?.playElemental?.(move.type, move.id);
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

      const maxHp = Math.max(1, defender?.maxHp || 30);
      const dmgIntensity = (result.damage / maxHp) * 18 + (result.isCrit ? 4 : 0) + (result.effectiveness > 1 ? 3 : 0);
      this.triggerScreenShake(Math.max(4, Math.min(15, dmgIntensity)), isPhysical ? 280 : 240);

      const center = this.getSpriteCenter(defenderSide);
      const dmgColor = result.isCrit ? '#fde047' : result.effectiveness > 1 ? '#fb923c' : '#ffffff';
      this.spawnImpactFX(defenderSide, move.type, `-${result.damage}`, dmgColor, {
        dust: isPhysical,
        ring: true,
        ringRadius: result.isCrit ? 96 : 74,
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
    atkSprite?.classList.remove(lungeClass);
    atkSprite?.classList.add('is-idle');
    defSprite?.classList.remove('hit-stop', 'hit-shake');
    defSprite?.classList.add('is-idle');
  }

  chooseEnemyMove() {
    if (!this.enemy || this.enemy.isFainted || !this.player || this.player.isFainted) {
      return null;
    }
    const moves = this.enemy.getMoveObjects();
    if (moves.length === 0) return null;
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

    await this.say(`${attacker.name} used ${move.name}!`);
    if (!this.isSessionValid(sid) || attacker.isFainted || defender.isFainted) return true;

    const result = calculateDamage(attacker, defender, move);
    await this.playAttackVisual(side, defSide, move, result, defender, sid);
    if (!this.isSessionValid(sid)) return true;

    if (result.category === 'heal') {
      const gained = attacker.healAmount(result.heal);
      this.storage.save();
      await this.animateHpTo(side, attacker.hp, pace.hpDrainMs);
      if (!this.isSessionValid(sid)) return true;
      await this.say(`${attacker.name} restored ${gained} HP!`);
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
          ? `${attacker.name}'s ${statLabel} can't go any higher!`
          : `${attacker.name}'s ${statLabel} rose!`,
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
        `${attacker.name} raised a Starlight Shield!${gained > 0 ? ` (+${gained} HP)` : ''}`,
      );
      this.state = BATTLE_STATES.CHECK_FAINT;
      return false;
    }

    if (result.missed) {
      await this.say(`${attacker.name}'s attack missed!`);
      this.state = BATTLE_STATES.CHECK_FAINT;
      return false;
    }

    defender.takeDamage(result.damage);
    if ((defender.shieldTurns || 0) > 0) {
      defender.shieldTurns = Math.max(0, defender.shieldTurns - 1);
    }
    this.renderStatusCards();
    this.storage.save();
    await this.animateHpTo(defSide, defender.hp, pace.hpDrainMs);
    if (!this.isSessionValid(sid)) return true;

    if (result.effectiveness > 1) {
      await this.say("It's super effective!");
    } else if (result.effectiveness < 1) {
      await this.say("It's not very effective...");
    }
    if (result.isCrit) {
      await this.say('A critical hit!');
    }

    if (!this.isSessionValid(sid)) return true;

    this.state = BATTLE_STATES.CHECK_FAINT;
    if (defender.isFainted) {
      if (defSide === 'enemy') {
        this.state = BATTLE_STATES.BATTLE_END;
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
      await this.say(`Used a Berry Potion! ${this.player.name} recovered ${gained} HP!`);
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

  async handleThrowBall(isGreat) {
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

    if (isGreat && !this.storage.useItem('greatBalls')) {
      return;
    }

    const token = this.lockPlayerAction(BATTLE_STATES.ACTION_ANIMATING);
    try {
      const ballName = isGreat ? 'Great Ball' : 'Poké Ball';
      await this.say(`Threw a ${ballName}!`);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      this.audio?.playPokeballThrow?.();

      const start = this.getSpriteCenter('player');
      const target = this.getSpriteCenter('enemy');
      const pedestal = this.getPedestalPoint('enemy');
      const hoverPos = { x: target.x, y: target.y - 38 };
      const attempt = calculateCatchAttempt(this.enemy, isGreat ? 1.45 : 1.0);

      await this.animateBallFlight(start, hoverPos, isGreat, 430, sid);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      this.captureBeam = { x: target.x, y: target.y };
      this.pokeballAnim = { x: hoverPos.x, y: hoverPos.y, angle: 0, isGreat, glow: true, scale: 1.08 };
      this.enemySpriteEl?.classList.remove('is-idle');
      this.enemySpriteEl?.classList.add('capture-energize');
      this.audio?.playPokeballAbsorb?.();
      await this.wait(180, sid);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      for (let i = 0; i < 16; i++) {
        this.particles.push({
          x: target.x + (Math.random() - 0.5) * 66,
          y: target.y + (Math.random() - 0.5) * 66,
          vx: 0,
          vy: 0,
          gravity: 0,
          pullTo: hoverPos,
          life: 0,
          maxLife: 0.32,
          color: i % 2 === 0 ? '#f87171' : '#fecaca',
          size: 4 + Math.random() * 3,
          shape: 'star',
        });
      }

      this.enemySpriteEl?.classList.add('capture-pull');
      await this.wait(300, sid);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;
      this.captureBeam = null;

      await this.animateBallDropAndBounce(hoverPos.x, hoverPos.y, pedestal.y - 12, isGreat, sid);
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      const pace = this.getPaceConfig();
      const restY = pedestal.y - 12;
      for (let i = 1; i <= attempt.shakes; i++) {
        if (!this.isSessionValid(sid) || this.turnToken !== token) return;
        this.audio?.playPokeballWobble?.(i);
        await this.animateBallWobble(hoverPos.x, restY, isGreat, i % 2 === 1 ? -1 : 1, sid);
        await this.wait(pace.ballWobblePauseMs, sid);
      }
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;

      if (attempt.caught) {
        this.state = BATTLE_STATES.BATTLE_END;
        this.pokeballAnim = { x: hoverPos.x, y: restY, angle: 0, isGreat, glow: true, shadowAlpha: 0.45 };
        this.audio?.playCaptureSuccess?.();
        this.spawnStarBurst({ x: hoverPos.x, y: restY });
        this.spawnFloatingText(hoverPos.x, restY - 36, 'GOTCHA!', '#fde047', 24, 0, 1.45);
        await this.wait(Math.max(480, Math.round(pace.postImpactMs * 1.3)), sid);
        if (!this.isSessionValid(sid) || this.turnToken !== token) return;
        this.pokeballAnim = null;

        this.enemy.hp = Math.max(1, this.enemy.hp);
        const { destination, newBadges } = this.storage.recordCaught(this.enemy);
        const winBadges = this.storage.recordBattleWin();
        const allNewBadges = [...newBadges, ...winBadges];

        await this.say(`Gotcha! ${this.enemy.name} was caught!`);
        if (!this.isSessionValid(sid) || this.turnToken !== token) return;
        if (destination === 'box') {
          await this.say(`${this.enemy.name} was sent to your Reserve Box (Team of 6 is full)!`);
        }

        const evoBadges = await this.awardVictoryXp(0.6, sid, { deferBadges: true });
        if (!this.isSessionValid(sid) || this.turnToken !== token) return;
        if (Array.isArray(evoBadges) && evoBadges.length > 0) {
          allNewBadges.push(...evoBadges);
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

  animateBallFlight(start, target, isGreat, duration, sid = this.sessionId) {
    return this._runBallRaf(duration, sid, (t) => {
      const arcHeight = Math.sin(t * Math.PI) * 104;
      const bx = start.x + (target.x - start.x) * t;
      const by = start.y + (target.y - start.y) * t - arcHeight;
      this.pokeballAnim = {
        x: bx,
        y: by,
        angle: t * Math.PI * 5,
        isGreat,
        glow: false,
        scale: 1.0 - t * 0.08,
      };
      if (Math.random() < 0.45) {
        this.particles.push({
          x: bx,
          y: by,
          vx: (Math.random() - 0.5) * 28,
          vy: (Math.random() - 0.5) * 28,
          gravity: 0,
          life: 0,
          maxLife: 0.22,
          color: isGreat ? '#7dd3fc' : '#fef08a',
          size: 2.5,
          shape: 'star',
        });
      }
    });
  }

  async animateBallDropAndBounce(x, fromY, groundY, isGreat, sid = this.sessionId) {
    await this.animateBallSegment(x, fromY, groundY, 0, isGreat, 210, sid);
    if (!this.isSessionValid(sid)) return;
    this.audio?.playPokeballBounce?.(0);
    this.spawnImpactDust({ x, y: groundY + 12 }, 7);

    const bounceHeights = [30, 14, 6];
    const bounceDurations = [190, 140, 100];
    for (let b = 0; b < bounceHeights.length; b++) {
      if (!this.isSessionValid(sid)) return;
      await this.animateBallBounceArc(x, groundY, bounceHeights[b], isGreat, bounceDurations[b], sid);
      if (!this.isSessionValid(sid)) return;
      this.audio?.playPokeballBounce?.(b + 1);
      if (b === 0) this.spawnImpactDust({ x, y: groundY + 12 }, 4);
    }
  }

  animateBallSegment(x, y0, y1, angle, isGreat, duration, sid) {
    return this._runBallRaf(duration, sid, (t) => {
      const eased = t * t;
      this.pokeballAnim = {
        x,
        y: y0 + (y1 - y0) * eased,
        angle,
        isGreat,
        glow: false,
        shadowAlpha: 0.25 + eased * 0.2,
      };
    });
  }

  animateBallBounceArc(x, groundY, height, isGreat, duration, sid) {
    return this._runBallRaf(duration, sid, (t) => {
      const arc = Math.sin(t * Math.PI) * height;
      this.pokeballAnim = {
        x,
        y: groundY - arc,
        angle: 0,
        isGreat,
        glow: false,
        shadowAlpha: Math.max(0.18, 0.45 - (arc / 40) * 0.22),
      };
    });
  }

  animateBallWobble(x, y, isGreat, dir, sid = this.sessionId) {
    return this._runBallRaf(
      280,
      sid,
      (t) => {
        const swing = Math.sin(t * Math.PI * 2) * 0.46 * dir;
        this.pokeballAnim = {
          x: x + Math.sin(t * Math.PI * 2) * 7 * dir,
          y,
          angle: swing,
          isGreat,
          glow: t < 0.55,
          shadowAlpha: 0.42,
        };
      },
      () => {
        this.pokeballAnim = { x, y, angle: 0, isGreat, glow: false, shadowAlpha: 0.42 };
      },
    );
  }

  async handleEnemyDefeated(sid = this.sessionId) {
    const pace = this.getPaceConfig();
    this.state = BATTLE_STATES.BATTLE_END;
    this.audio?.playFaint?.();
    this.enemySpriteEl?.classList.remove('is-idle');
    this.enemySpriteEl?.classList.add('faint-drop');
    await this.wait(Math.max(320, pace.postImpactMs), sid);
    if (!this.isSessionValid(sid)) return;

    await this.say(`${this.enemy.name} fainted!`);
    if (!this.isSessionValid(sid)) return;

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

    if (Math.random() < 0.35) {
      const bonus = Math.random() < 0.5 ? { potions: 1 } : { greatBalls: 1 };
      this.storage.addRewards(bonus);
      const itemLabel = bonus.potions ? 'a Berry Potion' : 'a Great Ball';
      await this.say(`Found ${itemLabel} on the victory trail!`);
      if (!this.isSessionValid(sid)) return;
    }

    this.onHudRefresh?.();
    if (badgeList.length > 0) {
      this.onBadgesUnlocked?.(badgeList);
    }
    this.stop({ outcome: 'won', isShrine: this.isShrine });
  }

  async awardVictoryXp(scale = 1.0, sid = this.sessionId, { deferBadges = false } = {}) {
    if (!this.isSessionValid(sid)) return [];
    const xpGain = Math.max(12, Math.round((this.enemy.level * 14 + 12) * scale));
    await this.say(`${this.player.name} gained ${xpGain} XP!`);
    if (!this.isSessionValid(sid)) return [];

    const levelResult = this.player.gainXp(xpGain);
    this.storage.save();
    this.displayedPlayerHp = this.player.hp;
    this.renderStatusCards();
    this.onHudRefresh?.();

    if (levelResult.leveledUp) {
      this.audio?.playLevelUp?.();
      const center = this.getSpriteCenter('player');
      this.spawnStarBurst(center);
      this.spawnFloatingText(center.x, center.y - 40, `LEVEL UP! Lv.${levelResult.newLevel}`, '#fde047', 20, 0, 1.45);
      await this.say(`${this.player.name} grew to Level ${levelResult.newLevel}!`);
    }

    const pendingEvo = this.player.getPendingLevelEvolution?.();
    if (pendingEvo && this.isSessionValid(sid)) {
      return this.runEvolutionCeremony(pendingEvo, sid, { emitBadges: !deferBadges });
    }
    return [];
  }

  async runEvolutionCeremony(pendingEvo, sid = this.sessionId, { emitBadges = true } = {}) {
    if (!pendingEvo || !this.player || !this.isSessionValid(sid)) return [];

    const oldName = this.player.name;
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

    await attachPokemonSprite(this.playerSpriteEl, pendingEvo.toId, {
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

    const unlockedList = Array.isArray(evoRes?.evolution?.unlockedMoves) ? evoRes.evolution.unlockedMoves : [];
    const moveNames = unlockedList
      .map((m) => (typeof m === 'string' ? (MOVES[m]?.name || m) : m?.name || ''))
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
    await this.say(`${this.player.name} fainted!`);
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
    await this.say(this.isShrine ? 'Stepped back safely from the Shrine!' : 'Got away safely!');
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
      attachPokemonSprite(img, mon.speciesId, {
        back: false,
        shiny: Boolean(mon.isShiny),
        timeoutMs: 1500,
      });

      const info = document.createElement('div');
      info.innerHTML = `
        <strong>${mon.isShiny ? '✨ ' : ''}${mon.name}</strong> <span style="color:#fde047">Lv.${mon.level}</span>
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
      await attachPokemonSprite(this.playerSpriteEl, this.player.speciesId, {
        back: true,
        shiny: Boolean(this.player.isShiny),
        timeoutMs: 1800,
      });
      if (!this.isSessionValid(sid) || this.turnToken !== token) return;
      this.playerSpriteEl?.classList.toggle('is-shiny-sprite', Boolean(this.player.isShiny));
      await this.say(`Go, ${this.player.name}!`);
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
