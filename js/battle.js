import { TYPES } from './config.js';
import {
  attachPokemonSprite,
  calculateCatchAttempt,
  calculateDamage,
  getTypeEffectiveness,
} from './pokemon.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

const ACTION_COOLDOWN_MS = 220;
const PHYSICAL_MOVE_IDS = new Set(['tackle', 'quick_attack', 'spark_dash', 'gust', 'rock_throw']);

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
    this.enemyHpFillEl = document.getElementById('enemy-hp-fill');
    this.enemySpriteEl = document.getElementById('enemy-sprite');

    this.playerNameEl = document.getElementById('player-name');
    this.playerLevelEl = document.getElementById('player-level');
    this.playerTypeEl = document.getElementById('player-type');
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
    this.state = 'INACTIVE';
    this.sessionId = 0;
    this.lastActionAt = 0;

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
    this.fxRaf = null;
    this.lastFxTime = 0;

    this.shakeTimer = 0;
    this.shakeDuration = 0;
    this.shakeIntensity = 0;

    this.typingTimer = null;
    this.typingResolve = null;
    this.typingFullText = '';

    this.displayedEnemyHp = 0;
    this.displayedPlayerHp = 0;
    this.mustSwitchForced = false;

    this.bindUI();
  }

  bindUI() {
    this.logEl?.addEventListener('click', () => this.finishTypewriter());
    this.btnBall?.addEventListener('click', () => this.handleThrowBall(false));
    this.btnGreat?.addEventListener('click', () => this.handleThrowBall(true));
    this.btnPotion?.addEventListener('click', () => this.handleUsePotion());
    this.btnTeam?.addEventListener('click', () => this.openTeamDrawer(false));
    this.btnRun?.addEventListener('click', () => this.handleRun());
    this.teamCloseBtn?.addEventListener('click', () => {
      if (!this.mustSwitchForced) {
        this.audio?.playMenuBlip?.(480);
        this.closeTeamDrawer();
      }
    });

    if (typeof ResizeObserver !== 'undefined' && this.stageEl) {
      const ro = new ResizeObserver(() => this.syncCanvasSize());
      ro.observe(this.stageEl);
    }
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

  canAcceptPlayerAction() {
    if (!this.active || this.busy || this.state !== 'PLAYER_INPUT') return false;
    if (this.teamDrawerEl && !this.teamDrawerEl.hidden) return false;
    const now = performance.now();
    if (now - this.lastActionAt < ACTION_COOLDOWN_MS) return false;
    return true;
  }

  markActionLocked(nextState = 'EXECUTING_TURN') {
    this.lastActionAt = performance.now();
    this.busy = true;
    this.state = nextState;
    this.setControlsDisabled(true);
  }

  unlockPlayerInput() {
    if (!this.active) return;
    this.busy = false;
    this.state = 'PLAYER_INPUT';
    this.setControlsDisabled(false);
    this.renderActionButtons();
  }

  isSessionValid(sid) {
    return this.active && sid === this.sessionId;
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

    const firstHealthy = profile.team.findIndex((m) => !m.isFainted);
    this.playerIndex = firstHealthy >= 0 ? firstHealthy : 0;
    this.player = profile.team[this.playerIndex];
    if (this.player.isFainted) {
      this.player.healFull();
    }

    const sid = ++this.sessionId;
    this.enemy = enemy;
    this.biomeId = isShrine ? 'shrine' : biomeId;
    this.isShrine = isShrine;
    this.shrineData = shrineData;

    this.active = true;
    this.busy = true;
    this.state = 'INTRO';
    this.mustSwitchForced = false;
    this.particles = [];
    this.popups = [];
    this.pokeballAnim = null;
    this.captureBeam = null;
    this.shakeTimer = 0;
    if (this.stageEl) this.stageEl.style.transform = '';

    this.storage.recordSeen(enemy.speciesId);

    this.screenEl.hidden = false;
    this.stageEl.dataset.biome = this.biomeId;
    this.syncCanvasSize();
    this.startFxLoop();

    this.enemySpriteEl.className = 'fighter-sprite fighter-sprite-enemy is-idle';
    this.playerSpriteEl.className = 'fighter-sprite fighter-sprite-player is-idle';
    this.displayedEnemyHp = enemy.hp;
    this.displayedPlayerHp = this.player.hp;

    this.renderStatusCards();
    this.renderMoveButtons();
    this.renderActionButtons();
    this.setControlsDisabled(true);

    await Promise.all([
      attachPokemonSprite(this.enemySpriteEl, enemy.speciesId, { back: false, timeoutMs: 2000 }),
      attachPokemonSprite(this.playerSpriteEl, this.player.speciesId, { back: true, timeoutMs: 2000 }),
    ]);

    if (!this.isSessionValid(sid)) return;

    const introMsg = isShrine && shrineData
      ? shrineData.intro
      : `A wild ${enemy.name} appeared! Go, ${this.player.name}!`;
    await this.say(introMsg);

    if (!this.isSessionValid(sid)) return;
    this.unlockPlayerInput();
  }

  stop(result = { outcome: 'escaped', faintedAll: false }) {
    this.sessionId += 1;
    this.active = false;
    this.busy = false;
    this.state = 'INACTIVE';
    this.pokeballAnim = null;
    this.captureBeam = null;
    this.particles = [];
    this.popups = [];
    this.shakeTimer = 0;
    if (this.stageEl) this.stageEl.style.transform = '';
    this.closeTeamDrawer();
    this.finishTypewriter();
    if (this.fxRaf) {
      cancelAnimationFrame(this.fxRaf);
      this.fxRaf = null;
    }
    if (this.screenEl) this.screenEl.hidden = true;
    this.onBattleEnd?.(result);
  }

  triggerPrimaryAction() {
    if (!this.active) return;
    if (this.typingResolve) {
      this.finishTypewriter();
      return;
    }
    if (this.canAcceptPlayerAction()) {
      const firstMove = this.movesEl?.querySelector('button:not(:disabled)');
      if (firstMove) firstMove.click();
    }
  }

  triggerCancelAction() {
    if (!this.active) return;
    if (this.teamDrawerEl && !this.teamDrawerEl.hidden && !this.mustSwitchForced) {
      this.closeTeamDrawer();
    }
  }

  renderStatusCards() {
    if (!this.enemy || !this.player) return;
    const profile = this.storage.getActiveProfile();
    const caughtBefore = Boolean(profile?.pokedex?.caught?.[this.enemy.speciesId]);

    this.enemyNameEl.textContent = this.enemy.name;
    this.enemyLevelEl.textContent = `Lv.${this.enemy.level}`;
    const eType = TYPES[this.enemy.type] || TYPES.normal;
    this.enemyTypeEl.textContent = `${eType.icon} ${eType.label}`;
    this.enemyTypeEl.style.background = eType.bg;
    this.enemyTypeEl.style.color = '#ffffff';
    this.enemyDexPillEl.hidden = !caughtBefore || this.isShrine;
    this.updateHpBarVisual(this.enemyHpFillEl, this.displayedEnemyHp, this.enemy.maxHp);

    this.playerNameEl.textContent = this.player.name;
    this.playerLevelEl.textContent = `Lv.${this.player.level}`;
    const pType = TYPES[this.player.type] || TYPES.normal;
    this.playerTypeEl.textContent = `${pType.icon} ${pType.label}`;
    this.playerTypeEl.style.background = pType.bg;
    this.playerTypeEl.style.color = '#ffffff';
    this.updateHpBarVisual(this.playerHpFillEl, this.displayedPlayerHp, this.player.maxHp);
    this.playerHpTextEl.textContent = `HP ${Math.round(this.displayedPlayerHp)}/${this.player.maxHp}`;
    const xpPct = Math.min(100, Math.round((this.player.xp / Math.max(1, this.player.xpToNext)) * 100));
    this.playerXpFillEl.style.width = `${xpPct}%`;
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
      // Pure vibrant Emerald above 50%, subtly warming as it nears 50%
      const blend = Math.max(0, Math.min(1, (65 - pct) / 15));
      startCol = lerpHex(HP_COLOR_EMERALD_A, HP_COLOR_AMBER_A, blend * 0.25);
      endCol = lerpHex(HP_COLOR_EMERALD_B, HP_COLOR_AMBER_B, blend * 0.25);
    } else if (pct > 20) {
      // Morph smoothly between Emerald/Amber (50%) and Amber/Crimson (20%)
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

  async animateHpTo(side, targetHp, duration = 480) {
    const sid = this.sessionId;
    const startHp = side === 'enemy' ? this.displayedEnemyHp : this.displayedPlayerHp;
    const maxHp = side === 'enemy' ? this.enemy.maxHp : this.player.maxHp;
    const startTime = performance.now();

    return new Promise((resolve) => {
      const tick = (now) => {
        if (!this.isSessionValid(sid)) {
          resolve();
          return;
        }
        const t = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const current = startHp + (targetHp - startHp) * eased;

        if (side === 'enemy') {
          this.displayedEnemyHp = current;
          this.updateHpBarVisual(this.enemyHpFillEl, current, maxHp);
        } else {
          this.displayedPlayerHp = current;
          this.updateHpBarVisual(this.playerHpFillEl, current, maxHp);
          this.playerHpTextEl.textContent = `HP ${Math.round(current)}/${maxHp}`;
        }

        if (t < 1 && this.isSessionValid(sid)) {
          requestAnimationFrame(tick);
        } else {
          if (side === 'enemy') {
            this.displayedEnemyHp = targetHp;
            this.updateHpBarVisual(this.enemyHpFillEl, targetHp, maxHp);
          } else {
            this.displayedPlayerHp = targetHp;
            this.updateHpBarVisual(this.playerHpFillEl, targetHp, maxHp);
            this.playerHpTextEl.textContent = `HP ${Math.round(targetHp)}/${maxHp}`;
            this.onHudRefresh?.();
          }
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }

  renderMoveButtons() {
    if (!this.movesEl || !this.player || !this.enemy) return;
    const moves = this.player.getMoveObjects();
    this.movesEl.innerHTML = '';

    for (const move of moves) {
      const typeMeta = TYPES[move.type] || TYPES.normal;
      const eff = move.category === 'heal' ? 1 : getTypeEffectiveness(move.type, this.enemy.type);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'move-btn';
      btn.style.backgroundColor = typeMeta.bg;
      btn.style.borderColor = typeMeta.color;

      let badgeHtml = '';
      if (move.category === 'heal') {
        badgeHtml = '<span class="move-eff-tag is-heal">♥ HEAL</span>';
      } else if (eff > 1) {
        badgeHtml = '<span class="move-eff-tag is-super">★ SUPER!</span>';
      } else if (eff < 1) {
        badgeHtml = '<span class="move-eff-tag">• RESIST</span>';
      }

      btn.innerHTML = `
        <span class="move-btn-main">
          <span class="move-btn-name">${typeMeta.icon} ${move.name}</span>
          <span class="move-btn-meta">${typeMeta.label} • ${move.category === 'heal' ? 'Restores HP' : `Power ${move.power}`}</span>
        </span>
        ${badgeHtml}
      `;
      btn.addEventListener('click', () => this.handlePlayerMove(move));
      this.movesEl.appendChild(btn);
    }
  }

  renderActionButtons() {
    const profile = this.storage.getActiveProfile();
    if (!profile || !this.player) return;

    const locked = this.busy || this.state !== 'PLAYER_INPUT';
    this.btnBall.textContent = this.isShrine ? '🛡️ Guardian' : '🔴 Poké Ball ∞';
    this.btnBall.disabled = locked;
    this.btnGreat.textContent = `🔵 Great Ball (${profile.bag.greatBalls})`;
    this.btnGreat.disabled = locked || this.isShrine || profile.bag.greatBalls <= 0;
    this.btnPotion.textContent = `🍓 Potion (${profile.bag.potions})`;
    this.btnPotion.disabled = locked || profile.bag.potions <= 0 || this.player.hp >= this.player.maxHp;
    this.btnTeam.disabled = locked || profile.team.length <= 1;
    this.btnRun.disabled = locked;
  }

  setControlsDisabled(disabled) {
    this.movesEl?.querySelectorAll('button').forEach((btn) => {
      btn.disabled = disabled;
    });
    if (this.btnBall) this.btnBall.disabled = disabled;
    if (this.btnRun) this.btnRun.disabled = disabled;
    if (disabled) {
      if (this.btnGreat) this.btnGreat.disabled = true;
      if (this.btnPotion) this.btnPotion.disabled = true;
      if (this.btnTeam) this.btnTeam.disabled = true;
    } else {
      this.renderActionButtons();
    }
  }

  say(text, speedMs = 17) {
    this.finishTypewriter();
    this.typingFullText = text;
    if (this.logEl) this.logEl.textContent = '';

    return new Promise((resolve) => {
      this.typingResolve = resolve;
      let idx = 0;
      this.typingTimer = setInterval(() => {
        if (!this.active) {
          this.finishTypewriter();
          return;
        }
        idx += 1;
        if (this.logEl) this.logEl.textContent = text.slice(0, idx);
        if (idx >= text.length) {
          clearInterval(this.typingTimer);
          this.typingTimer = null;
          setTimeout(() => {
            if (this.typingResolve === resolve) {
              this.typingResolve = null;
              resolve();
            }
          }, 240);
        }
      }, speedMs);
    });
  }

  finishTypewriter() {
    if (this.typingTimer) {
      clearInterval(this.typingTimer);
      this.typingTimer = null;
      if (this.logEl && this.typingFullText) {
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

  spawnFloatingText(x, y, text, color = '#ffffff', size = 20, delay = 0) {
    this.popups.push({
      x,
      y,
      vy: -50,
      life: -delay,
      maxLife: 1.05,
      text,
      color,
      size,
    });
  }

  spawnImpactDust(point, count = 10) {
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
        maxLife: 0.36 + Math.random() * 0.22,
        color: i % 2 === 0 ? '#e2e8f0' : '#cbd5e1',
        size: 5 + Math.random() * 5,
        shape: 'dust',
      });
    }
  }

  spawnImpactFX(side, type, labelText = '', labelColor = '#ffffff', options = {}) {
    const center = this.getSpriteCenter(side);
    const pedestal = this.getPedestalPoint(side);
    const typeColor = (TYPES[type] || TYPES.normal).color;
    const count = options.count || 22;

    if (options.ring) {
      this.particles.push({
        x: center.x,
        y: center.y,
        vx: 0,
        vy: 0,
        gravity: 0,
        life: 0,
        maxLife: 0.32,
        color: options.ringColor || typeColor,
        size: 14,
        maxRadius: options.ringRadius || 78,
        shape: 'ring',
      });
    }

    if (options.dust) {
      this.spawnImpactDust(pedestal, 12);
    }

    const shapeMap = {
      fire: 'ember',
      water: 'bubble',
      grass: 'leaf',
      electric: 'bolt',
      psychic: 'star',
      heal: 'star',
      star: 'star',
    };
    const shape = shapeMap[type] || 'circle';

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.35;
      const speed = 75 + Math.random() * 155;
      const isBuoyant = shape === 'ember' || shape === 'bubble';
      this.particles.push({
        x: center.x + (Math.random() - 0.5) * 18,
        y: center.y + (Math.random() - 0.5) * 18,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isBuoyant ? 55 : 22),
        gravity: isBuoyant ? -75 : shape === 'leaf' ? 45 : 190,
        life: 0,
        maxLife: 0.45 + Math.random() * 0.28,
        color: i % 3 === 0 ? '#ffffff' : typeColor,
        size: shape === 'leaf' ? 7 + Math.random() * 4 : 3.5 + Math.random() * 4.5,
        rotation: angle,
        spin: (Math.random() - 0.5) * 10,
        shape,
      });
    }

    if (labelText) {
      this.spawnFloatingText(center.x, center.y - 24, labelText, labelColor, options.fontSize || 24, 0);
    }
  }

  async animateElementalStream(attackerSide, defenderSide, move, sessionId) {
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
      normal: move.fx === 'star' ? 'star' : 'dust',
    };
    const shape = shapeByType[move.type] || 'circle';
    const steps = 12;

    for (let s = 0; s < steps; s++) {
      if (!this.isSessionValid(sessionId)) return;
      const t = s / (steps - 1);
      const ctrlX = (start.x + target.x) * 0.5;
      const ctrlY = Math.min(start.y, target.y) - 44;
      const inv = 1 - t;
      const px = inv * inv * start.x + 2 * inv * t * ctrlX + t * t * target.x;
      const py = inv * inv * start.y + 2 * inv * t * ctrlY + t * t * target.y;

      const burstCount = shape === 'leaf' ? 2 : 3;
      for (let k = 0; k < burstCount; k++) {
        const spread = (Math.random() - 0.5) * 18;
        const speed = 60 + Math.random() * 75;
        const dx = target.x - start.x;
        const dy = target.y - start.y;
        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.35;

        this.particles.push({
          x: px + spread,
          y: py + (Math.random() - 0.5) * 16,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (shape === 'bubble' || shape === 'ember' ? 35 : 0),
          gravity: shape === 'bubble' || shape === 'ember' ? -60 : 25,
          life: 0,
          maxLife: 0.32 + Math.random() * 0.16,
          color: k === 0 && shape !== 'leaf' ? '#ffffff' : typeMeta.color,
          size: shape === 'leaf' ? 8 : 5 + Math.random() * 3.5,
          rotation: angle,
          spin: shape === 'leaf' ? 12 : 4,
          shape,
        });
      }
      await sleep(22);
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
    if (this.fxRaf) cancelAnimationFrame(this.fxRaf);
    this.lastFxTime = performance.now();

    const frame = (now) => {
      if (!this.active) return;
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

    // Draw capture energy beam behind Pokéball when active
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

    // Update & render particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life < 0) continue;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      if (p.pullTo) {
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
      } else if (p.shape === 'ember') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (1 - progress * 0.3), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.48, 0, Math.PI * 2);
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

    // Draw Pokéball animation if active
    if (this.pokeballAnim) {
      this.drawPokeball(ctx, this.pokeballAnim);
    }

    // Floating combat text (damage numbers, SUPER EFFECTIVE!, CRITICAL HIT!)
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

    // Ground shadow beneath ball when near pedestal
    if (ball.shadowAlpha) {
      ctx.save();
      ctx.rotate(-(ball.angle || 0));
      ctx.fillStyle = `rgba(2, 6, 23, ${ball.shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(0, r + 4, 15, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Outer circle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Top half
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

    // Specular shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-6, -7, 4.5, 2.5, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Center band & outline
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
    const atkSprite = attackerSide === 'player' ? this.playerSpriteEl : this.enemySpriteEl;
    const defSprite = defenderSide === 'enemy' ? this.enemySpriteEl : this.playerSpriteEl;
    const isQuick = move.id === 'quick_attack' || move.id === 'spark_dash';
    const lungeClass = attackerSide === 'player'
      ? (isQuick ? 'quick-lunge-right' : 'lunge-right')
      : (isQuick ? 'quick-lunge-left' : 'lunge-left');

    atkSprite.classList.remove('is-idle');
    atkSprite.classList.add(lungeClass);

    if (move.category === 'heal') {
      this.audio?.playElemental?.('heal', move.id);
      this.spawnImpactFX(attackerSide, 'heal', `+${result.heal} HP`, '#86efac', { fontSize: 22 });
      await sleep(320);
      if (!this.isSessionValid(sessionId)) return;
      atkSprite.classList.remove(lungeClass);
      atkSprite.classList.add('is-idle');
      return;
    }

    const isPhysical = PHYSICAL_MOVE_IDS.has(move.id) || move.fx === 'impact';
    if (isPhysical) {
      if (move.id === 'tackle' || move.id === 'quick_attack') {
        this.audio?.playPhysicalImpact?.(move.power);
      } else {
        this.audio?.playElemental?.(move.type, move.id);
      }
      await sleep(150);
    } else {
      this.audio?.playElemental?.(move.type, move.id);
      await this.animateElementalStream(attackerSide, defenderSide, move, sessionId);
    }

    if (!this.isSessionValid(sessionId)) return;

    if (result.missed) {
      this.spawnImpactFX(defenderSide, 'normal', 'MISSED!', '#cbd5e1', { count: 8, fontSize: 20 });
    } else {
      defSprite.classList.remove('is-idle');
      defSprite.classList.add('hit-shake');

      const maxHp = Math.max(1, defender?.maxHp || 30);
      const dmgIntensity = (result.damage / maxHp) * 18 + (result.isCrit ? 4 : 0) + (result.effectiveness > 1 ? 3 : 0);
      this.triggerScreenShake(Math.max(4, Math.min(15, dmgIntensity)), isPhysical ? 260 : 220);

      const center = this.getSpriteCenter(defenderSide);
      const dmgColor = result.isCrit ? '#fde047' : result.effectiveness > 1 ? '#fb923c' : '#ffffff';
      this.spawnImpactFX(defenderSide, move.type, `-${result.damage}`, dmgColor, {
        dust: isPhysical,
        ring: true,
        ringRadius: result.isCrit ? 96 : 74,
        fontSize: result.isCrit ? 26 : 23,
      });

      let tagOffsetY = -52;
      if (result.effectiveness > 1) {
        this.spawnFloatingText(center.x, center.y + tagOffsetY, 'SUPER EFFECTIVE!', '#fde047', 16, 0.05);
        tagOffsetY -= 22;
      } else if (result.effectiveness < 1) {
        this.spawnFloatingText(center.x, center.y + tagOffsetY, 'NOT VERY EFFECTIVE', '#cbd5e1', 14, 0.05);
        tagOffsetY -= 20;
      }
      if (result.isCrit) {
        this.spawnFloatingText(center.x, center.y + tagOffsetY, 'CRITICAL HIT!', '#fb923c', 17, 0.09);
      }
    }

    await sleep(360);
    if (!this.isSessionValid(sessionId)) return;
    atkSprite.classList.remove(lungeClass);
    atkSprite.classList.add('is-idle');
    defSprite.classList.remove('hit-shake');
    defSprite.classList.add('is-idle');
  }

  async handlePlayerMove(move) {
    if (!this.canAcceptPlayerAction()) return;
    if (!this.player || this.player.isFainted || !this.enemy || this.enemy.isFainted) return;

    const sid = this.sessionId;
    this.markActionLocked('EXECUTING_TURN');
    this.audio?.playMenuBlip?.(680);

    try {
      const playerFaster = this.player.spd >= this.enemy.spd;

      if (playerFaster) {
        const ended = await this.executeTurn('player', move, sid);
        if (ended || !this.isSessionValid(sid)) return;
        const enemyEnded = await this.executeEnemyTurn(sid);
        if (enemyEnded || !this.isSessionValid(sid)) return;
      } else {
        const enemyEnded = await this.executeEnemyTurn(sid);
        if (enemyEnded || !this.isSessionValid(sid)) return;
        const ended = await this.executeTurn('player', move, sid);
        if (ended || !this.isSessionValid(sid)) return;
      }

      if (!this.isSessionValid(sid)) return;
      this.unlockPlayerInput();
      await this.say(`What will ${this.player.name} do?`);
    } finally {
      if (this.isSessionValid(sid) && this.state === 'EXECUTING_TURN') {
        this.unlockPlayerInput();
      }
    }
  }

  async executeTurn(side, move, sid = this.sessionId) {
    if (!this.isSessionValid(sid)) return true;
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
      await this.animateHpTo(side, attacker.hp);
      if (!this.isSessionValid(sid)) return true;
      await this.say(`${attacker.name} restored ${gained} HP!`);
      return false;
    }

    if (result.missed) {
      await this.say(`${attacker.name}'s attack missed!`);
      return false;
    }

    defender.takeDamage(result.damage);
    this.storage.save();
    await this.animateHpTo(defSide, defender.hp);
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

    if (defender.isFainted) {
      this.state = 'RESOLVING';
      if (defSide === 'enemy') {
        await this.handleEnemyDefeated(sid);
      } else {
        await this.handlePlayerFainted(sid);
      }
      return true;
    }
    return false;
  }

  async executeEnemyTurn(sid = this.sessionId) {
    if (!this.isSessionValid(sid) || !this.enemy || this.enemy.isFainted || !this.player || this.player.isFainted) {
      return true;
    }
    const moves = this.enemy.getMoveObjects();
    if (moves.length === 0) return false;
    let chosen = moves[Math.floor(Math.random() * moves.length)];
    if (chosen.category === 'heal' && this.enemy.hp > this.enemy.maxHp * 0.6) {
      const attacks = moves.filter((m) => m.category === 'attack');
      if (attacks.length > 0) {
        chosen = attacks[Math.floor(Math.random() * attacks.length)];
      }
    }
    return this.executeTurn('enemy', chosen, sid);
  }

  async handleUsePotion() {
    if (!this.canAcceptPlayerAction()) return;
    if (!this.player || this.player.isFainted || this.player.hp >= this.player.maxHp) return;
    if (!this.storage.useItem('potions')) return;

    const sid = this.sessionId;
    this.markActionLocked('EXECUTING_TURN');
    this.audio?.playHealChime?.();

    const healAmount = Math.max(18, Math.round(this.player.maxHp * 0.45));
    const gained = this.player.healAmount(healAmount);
    this.storage.save();
    this.spawnImpactFX('player', 'heal', `+${gained} HP`, '#86efac', { fontSize: 22 });
    await this.animateHpTo('player', this.player.hp);
    if (!this.isSessionValid(sid)) return;
    await this.say(`Used a Berry Potion! ${this.player.name} recovered ${gained} HP!`);

    const ended = await this.executeEnemyTurn(sid);
    if (ended || !this.isSessionValid(sid)) return;

    this.unlockPlayerInput();
    await this.say(`What will ${this.player.name} do?`);
  }

  async handleThrowBall(isGreat) {
    if (!this.canAcceptPlayerAction()) return;
    if (!this.enemy || this.enemy.isFainted || !this.player || this.player.isFainted) return;

    const sid = this.sessionId;
    if (this.isShrine) {
      this.markActionLocked('EXECUTING_TURN');
      this.audio?.playMenuBlip?.(340);
      await this.say("Shrine Guardians can't be caught! Defeat it to win the Elemental Badge!");
      if (!this.isSessionValid(sid)) return;
      this.unlockPlayerInput();
      return;
    }

    if (isGreat && !this.storage.useItem('greatBalls')) {
      return;
    }

    this.markActionLocked('CAPTURE_SEQUENCE');
    const ballName = isGreat ? 'Great Ball' : 'Poké Ball';
    await this.say(`Threw a ${ballName}!`);
    if (!this.isSessionValid(sid)) return;

    this.audio?.playPokeballThrow?.();

    const start = this.getSpriteCenter('player');
    const target = this.getSpriteCenter('enemy');
    const pedestal = this.getPedestalPoint('enemy');
    const hoverPos = { x: target.x, y: target.y - 38 };
    const attempt = calculateCatchAttempt(this.enemy, isGreat ? 1.45 : 1.0);

    // Stage 1: Parabolic arcing throw
    await this.animateBallFlight(start, hoverPos, isGreat, 430, sid);
    if (!this.isSessionValid(sid)) return;

    // Stage 2: Open red capture beam -> wild Pokémon turns into glowing red energy silhouette and gets pulled in
    this.captureBeam = { x: target.x, y: target.y };
    this.pokeballAnim = { x: hoverPos.x, y: hoverPos.y, angle: 0, isGreat, glow: true, scale: 1.08 };
    this.enemySpriteEl.classList.remove('is-idle');
    this.enemySpriteEl.classList.add('capture-energize');
    this.audio?.playPokeballAbsorb?.();
    await sleep(180);
    if (!this.isSessionValid(sid)) return;

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

    this.enemySpriteEl.classList.add('capture-pull');
    await sleep(300);
    if (!this.isSessionValid(sid)) return;
    this.captureBeam = null;

    // Stage 3: Drop ball to pedestal with damped physical bounces + sound + dust
    await this.animateBallDropAndBounce(hoverPos.x, hoverPos.y, pedestal.y - 12, isGreat, sid);
    if (!this.isSessionValid(sid)) return;

    // Stage 4: 1..3 timed wobbles with suspenseful pauses
    const restY = pedestal.y - 12;
    for (let i = 1; i <= attempt.shakes; i++) {
      if (!this.isSessionValid(sid)) return;
      this.audio?.playPokeballWobble?.(i);
      await this.animateBallWobble(hoverPos.x, restY, isGreat, i % 2 === 1 ? -1 : 1, sid);
      await sleep(380);
    }
    if (!this.isSessionValid(sid)) return;

    // Stage 5: Capture Lock Starburst OR Breakout
    if (attempt.caught) {
      this.state = 'RESOLVING';
      this.pokeballAnim = { x: hoverPos.x, y: restY, angle: 0, isGreat, glow: true, shadowAlpha: 0.45 };
      this.audio?.playCaptureSuccess?.();
      this.spawnStarBurst({ x: hoverPos.x, y: restY });
      this.spawnFloatingText(hoverPos.x, restY - 36, 'GOTCHA!', '#fde047', 24, 0);
      await sleep(620);
      if (!this.isSessionValid(sid)) return;
      this.pokeballAnim = null;

      this.enemy.hp = Math.max(1, this.enemy.hp);
      const { destination, newBadges } = this.storage.recordCaught(this.enemy);
      const winBadges = this.storage.recordBattleWin();
      const allNewBadges = [...newBadges, ...winBadges];

      await this.say(`Gotcha! ${this.enemy.name} was caught!`);
      if (!this.isSessionValid(sid)) return;
      if (destination === 'box') {
        await this.say(`${this.enemy.name} was sent to your Reserve Box (Team of 6 is full)!`);
      }

      await this.awardVictoryXp(0.6, sid);
      if (!this.isSessionValid(sid)) return;
      this.onHudRefresh?.();
      if (allNewBadges.length > 0) {
        this.onBadgesUnlocked?.(allNewBadges);
      }
      this.stop({ outcome: 'caught', caughtSpecies: this.enemy.speciesId });
      return;
    }

    // Breakout!
    this.audio?.playBreakout?.();
    this.pokeballAnim = null;
    this.enemySpriteEl.classList.remove('capture-energize', 'capture-pull', 'capture-shrink');
    this.enemySpriteEl.classList.add('is-idle');
    this.spawnImpactFX('enemy', 'normal', 'Broke free!', '#fde047', { count: 16, fontSize: 19 });
    await this.say(`Oh no! ${this.enemy.name} broke free!`);
    if (!this.isSessionValid(sid)) return;

    const ended = await this.executeEnemyTurn(sid);
    if (ended || !this.isSessionValid(sid)) return;

    this.unlockPlayerInput();
    await this.say(`What will ${this.player.name} do?`);
  }

  animateBallFlight(start, target, isGreat, duration, sid = this.sessionId) {
    const startTime = performance.now();
    return new Promise((resolve) => {
      const tick = (now) => {
        if (!this.isSessionValid(sid)) {
          resolve();
          return;
        }
        const t = Math.min(1, (now - startTime) / duration);
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
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  async animateBallDropAndBounce(x, fromY, groundY, isGreat, sid = this.sessionId) {
    // Initial drop from hover down to pedestal
    await this.animateBallSegment(x, fromY, groundY, 0, isGreat, 210, sid);
    if (!this.isSessionValid(sid)) return;
    this.audio?.playPokeballBounce?.(0);
    this.spawnImpactDust({ x, y: groundY + 12 }, 7);

    // Three damped physical bounces
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
    const startTime = performance.now();
    return new Promise((resolve) => {
      const tick = (now) => {
        if (!this.isSessionValid(sid)) {
          resolve();
          return;
        }
        const t = Math.min(1, (now - startTime) / duration);
        const eased = t * t;
        this.pokeballAnim = {
          x,
          y: y0 + (y1 - y0) * eased,
          angle,
          isGreat,
          glow: false,
          shadowAlpha: 0.25 + eased * 0.2,
        };
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  animateBallBounceArc(x, groundY, height, isGreat, duration, sid) {
    const startTime = performance.now();
    return new Promise((resolve) => {
      const tick = (now) => {
        if (!this.isSessionValid(sid)) {
          resolve();
          return;
        }
        const t = Math.min(1, (now - startTime) / duration);
        const arc = Math.sin(t * Math.PI) * height;
        this.pokeballAnim = {
          x,
          y: groundY - arc,
          angle: 0,
          isGreat,
          glow: false,
          shadowAlpha: Math.max(0.18, 0.45 - (arc / 40) * 0.22),
        };
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  animateBallWobble(x, y, isGreat, dir, sid = this.sessionId) {
    const startTime = performance.now();
    const duration = 280;
    return new Promise((resolve) => {
      const tick = (now) => {
        if (!this.isSessionValid(sid)) {
          resolve();
          return;
        }
        const t = Math.min(1, (now - startTime) / duration);
        const swing = Math.sin(t * Math.PI * 2) * 0.46 * dir;
        this.pokeballAnim = {
          x: x + Math.sin(t * Math.PI * 2) * 7 * dir,
          y,
          angle: swing,
          isGreat,
          glow: t < 0.55,
          shadowAlpha: 0.42,
        };
        if (t < 1) requestAnimationFrame(tick);
        else {
          this.pokeballAnim = { x, y, angle: 0, isGreat, glow: false, shadowAlpha: 0.42 };
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }

  async handleEnemyDefeated(sid = this.sessionId) {
    this.enemySpriteEl.classList.remove('is-idle');
    this.enemySpriteEl.classList.add('faint-drop');
    await sleep(340);
    if (!this.isSessionValid(sid)) return;

    await this.say(`${this.enemy.name} fainted!`);
    if (!this.isSessionValid(sid)) return;

    const badgeList = [...this.storage.recordBattleWin()];
    if (this.isShrine && this.shrineData) {
      const shrineBadges = this.storage.markShrineCleared(this.shrineData.id);
      badgeList.push(...shrineBadges);
    }

    await this.awardVictoryXp(1.0, sid);
    if (!this.isSessionValid(sid)) return;

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

  async awardVictoryXp(scale = 1.0, sid = this.sessionId) {
    if (!this.isSessionValid(sid)) return;
    const xpGain = Math.max(12, Math.round((this.enemy.level * 14 + 12) * scale));
    await this.say(`${this.player.name} gained ${xpGain} XP!`);
    if (!this.isSessionValid(sid)) return;

    const levelResult = this.player.gainXp(xpGain);
    this.storage.save();
    this.displayedPlayerHp = this.player.hp;
    this.renderStatusCards();
    this.onHudRefresh?.();

    if (levelResult.leveledUp) {
      this.audio?.playLevelUp?.();
      const center = this.getSpriteCenter('player');
      this.spawnStarBurst(center);
      this.spawnFloatingText(center.x, center.y - 40, `LEVEL UP! Lv.${levelResult.newLevel}`, '#fde047', 20, 0);
      await this.say(`${this.player.name} grew to Level ${levelResult.newLevel}!`);
    }
  }

  async handlePlayerFainted(sid = this.sessionId) {
    this.playerSpriteEl.classList.remove('is-idle');
    this.playerSpriteEl.classList.add('faint-drop');
    await sleep(340);
    if (!this.isSessionValid(sid)) return;
    await this.say(`${this.player.name} fainted!`);
    if (!this.isSessionValid(sid)) return;

    const profile = this.storage.getActiveProfile();
    const healthyIdx = profile?.team?.findIndex((mon) => !mon.isFainted) ?? -1;
    if (healthyIdx >= 0) {
      this.state = 'FORCED_SWITCH';
      this.busy = false;
      this.mustSwitchForced = true;
      this.openTeamDrawer(true);
      return;
    }

    await this.say('Your team needs a quick rest! Returning to Starlight Fountain...');
    if (!this.isSessionValid(sid)) return;
    this.stop({ outcome: 'fainted', faintedAll: true });
  }

  async handleRun() {
    if (!this.canAcceptPlayerAction()) return;
    const sid = this.sessionId;
    this.markActionLocked('RESOLVING');
    this.audio?.playMenuBlip?.(520);
    await this.say(this.isShrine ? 'Stepped back safely from the Shrine!' : 'Got away safely!');
    if (!this.isSessionValid(sid)) return;
    this.stop({ outcome: 'escaped', faintedAll: false });
  }

  openTeamDrawer(forced = false) {
    if (!this.active) return;
    if (!forced && !this.canAcceptPlayerAction()) return;
    const profile = this.storage.getActiveProfile();
    if (!profile || !this.teamDrawerEl || !this.teamListEl) return;

    this.mustSwitchForced = forced;
    this.teamCloseBtn.hidden = forced;
    this.teamDrawerEl.hidden = false;
    this.teamListEl.innerHTML = '';

    profile.team.forEach((mon, idx) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'battle-switch-card';
      const isCurrent = idx === this.playerIndex;
      card.disabled = mon.isFainted || isCurrent;

      const img = document.createElement('img');
      attachPokemonSprite(img, mon.speciesId, { back: false, timeoutMs: 1500 });

      const info = document.createElement('div');
      info.innerHTML = `
        <strong>${mon.name}</strong> <span style="color:#fde047">Lv.${mon.level}</span>
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
    const profile = this.storage.getActiveProfile();
    if (!profile || !profile.team[teamIdx] || profile.team[teamIdx].isFainted) return;
    if (teamIdx === this.playerIndex) return;

    const sid = this.sessionId;
    const wasForced = this.mustSwitchForced;
    this.mustSwitchForced = false;
    this.closeTeamDrawer();
    this.markActionLocked('EXECUTING_TURN');

    this.playerIndex = teamIdx;
    this.player = profile.team[teamIdx];
    this.displayedPlayerHp = this.player.hp;
    this.playerSpriteEl.className = 'fighter-sprite fighter-sprite-player is-idle';

    this.renderStatusCards();
    this.renderMoveButtons();
    this.onHudRefresh?.();
    await attachPokemonSprite(this.playerSpriteEl, this.player.speciesId, { back: true, timeoutMs: 1800 });
    if (!this.isSessionValid(sid)) return;
    await this.say(`Go, ${this.player.name}!`);
    if (!this.isSessionValid(sid)) return;

    if (!wasForced) {
      const ended = await this.executeEnemyTurn(sid);
      if (ended || !this.isSessionValid(sid)) return;
    }

    this.unlockPlayerInput();
    await this.say(`What will ${this.player.name} do?`);
  }
}
