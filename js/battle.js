import { SPECIES, TYPES } from './config.js';
import {
  attachPokemonSprite,
  calculateCatchAttempt,
  calculateDamage,
  getTypeEffectiveness,
} from './pokemon.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    this.enemy = null;
    this.player = null;
    this.playerIndex = 0;
    this.biomeId = 'forest';
    this.isShrine = false;
    this.shrineData = null;

    this.particles = [];
    this.popups = [];
    this.pokeballAnim = null;
    this.fxRaf = null;
    this.lastFxTime = 0;

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
    this.teamCloseBtn?.addEventListener('click', () => this.closeTeamDrawer());

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
    }
  }

  async start({ enemy, biomeId = 'forest', isShrine = false, shrineData = null }) {
    const profile = this.storage.getActiveProfile();
    if (!profile || profile.team.length === 0) return;

    const firstHealthy = profile.team.findIndex((m) => !m.isFainted);
    this.playerIndex = firstHealthy >= 0 ? firstHealthy : 0;
    this.player = profile.team[this.playerIndex];
    if (this.player.isFainted) {
      this.player.healFull();
    }

    this.enemy = enemy;
    this.biomeId = isShrine ? 'shrine' : biomeId;
    this.isShrine = isShrine;
    this.shrineData = shrineData;

    this.active = true;
    this.busy = true;
    this.mustSwitchForced = false;
    this.particles = [];
    this.popups = [];
    this.pokeballAnim = null;

    this.storage.recordSeen(enemy.speciesId);

    this.screenEl.hidden = false;
    this.stageEl.dataset.biome = this.biomeId;
    this.syncCanvasSize();
    this.startFxLoop();

    this.enemySpriteEl.className = 'fighter-sprite is-idle';
    this.playerSpriteEl.className = 'fighter-sprite is-idle';
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

    if (!this.active) return;

    const introMsg = isShrine && shrineData
      ? shrineData.intro
      : `A wild ${enemy.name} appeared! Go, ${this.player.name}!`;
    await this.say(introMsg);

    this.busy = false;
    this.setControlsDisabled(false);
  }

  stop(result = { outcome: 'escaped', faintedAll: false }) {
    this.active = false;
    this.busy = false;
    this.pokeballAnim = null;
    this.closeTeamDrawer();
    this.finishTypewriter();
    if (this.fxRaf) {
      cancelAnimationFrame(this.fxRaf);
      this.fxRaf = null;
    }
    this.screenEl.hidden = true;
    this.onBattleEnd?.(result);
  }

  triggerPrimaryAction() {
    if (!this.active) return;
    if (this.typingResolve) {
      this.finishTypewriter();
      return;
    }
    if (!this.busy && this.teamDrawerEl.hidden) {
      const firstMove = this.movesEl?.querySelector('button');
      if (firstMove && !firstMove.disabled) firstMove.click();
    }
  }

  triggerCancelAction() {
    if (!this.active) return;
    if (!this.teamDrawerEl.hidden && !this.mustSwitchForced) {
      this.closeTeamDrawer();
    }
  }

  renderStatusCards() {
    const profile = this.storage.getActiveProfile();
    const caughtBefore = Boolean(profile?.pokedex?.caught?.[this.enemy.speciesId]);

    this.enemyNameEl.textContent = this.enemy.name;
    this.enemyLevelEl.textContent = `Lv.${this.enemy.level}`;
    const eType = TYPES[this.enemy.type];
    this.enemyTypeEl.textContent = `${eType.icon} ${eType.label}`;
    this.enemyTypeEl.style.background = eType.bg;
    this.enemyTypeEl.style.color = '#ffffff';
    this.enemyDexPillEl.hidden = !caughtBefore || this.isShrine;
    this.updateHpBarVisual(this.enemyHpFillEl, this.displayedEnemyHp, this.enemy.maxHp);

    this.playerNameEl.textContent = this.player.name;
    this.playerLevelEl.textContent = `Lv.${this.player.level}`;
    const pType = TYPES[this.player.type];
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
    const pct = Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100));
    el.style.width = `${pct}%`;
    el.classList.toggle('is-mid', pct <= 50 && pct > 22);
    el.classList.toggle('is-low', pct <= 22);
  }

  async animateHpTo(side, targetHp, duration = 360) {
    const startHp = side === 'enemy' ? this.displayedEnemyHp : this.displayedPlayerHp;
    const maxHp = side === 'enemy' ? this.enemy.maxHp : this.player.maxHp;
    const startTime = performance.now();

    return new Promise((resolve) => {
      const tick = (now) => {
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

        if (t < 1 && this.active) {
          requestAnimationFrame(tick);
        } else {
          if (side === 'enemy') this.displayedEnemyHp = targetHp;
          else {
            this.displayedPlayerHp = targetHp;
            this.playerHpTextEl.textContent = `HP ${Math.round(targetHp)}/${maxHp}`;
          }
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }

  renderMoveButtons() {
    if (!this.movesEl) return;
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
    if (!profile) return;

    this.btnBall.textContent = this.isShrine ? '🛡️ Guardian' : '🔴 Poké Ball ∞';
    this.btnGreat.textContent = `🔵 Great Ball (${profile.bag.greatBalls})`;
    this.btnGreat.disabled = this.busy || this.isShrine || profile.bag.greatBalls <= 0;
    this.btnPotion.textContent = `🍓 Potion (${profile.bag.potions})`;
    this.btnPotion.disabled = this.busy || profile.bag.potions <= 0 || this.player.hp >= this.player.maxHp;
    this.btnTeam.disabled = this.busy || profile.team.length <= 1;
    this.btnRun.disabled = this.busy;
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

  say(text, speedMs = 18) {
    this.finishTypewriter();
    this.typingFullText = text;
    this.logEl.textContent = '';

    return new Promise((resolve) => {
      this.typingResolve = resolve;
      let idx = 0;
      this.typingTimer = setInterval(() => {
        if (!this.active) {
          this.finishTypewriter();
          return;
        }
        idx += 1;
        this.logEl.textContent = text.slice(0, idx);
        if (idx >= text.length) {
          clearInterval(this.typingTimer);
          this.typingTimer = null;
          setTimeout(() => {
            if (this.typingResolve === resolve) {
              this.typingResolve = null;
              resolve();
            }
          }, 260);
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
    if (!this.stageEl) return { x: 160, y: 110 };
    const stageRect = this.stageEl.getBoundingClientRect();
    const targetEl = side === 'enemy' ? this.enemySpriteEl : this.playerSpriteEl;
    const rect = targetEl?.getBoundingClientRect();
    if (!rect || rect.width === 0) {
      return side === 'enemy'
        ? { x: stageRect.width * 0.76, y: stageRect.height * 0.34 }
        : { x: stageRect.width * 0.24, y: stageRect.height * 0.72 };
    }
    return {
      x: rect.left - stageRect.left + rect.width / 2,
      y: rect.top - stageRect.top + rect.height / 2,
    };
  }

  spawnImpactFX(side, type, labelText = '', labelColor = '#ffffff') {
    const center = this.getSpriteCenter(side);
    const typeColor = (TYPES[type] || TYPES.normal).color;
    const count = 20;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 70 + Math.random() * 140;
      this.particles.push({
        x: center.x,
        y: center.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        life: 0,
        maxLife: 0.48 + Math.random() * 0.22,
        color: i % 3 === 0 ? '#ffffff' : typeColor,
        size: 3 + Math.random() * 4,
        star: type === 'electric' || type === 'psychic' || type === 'heal',
      });
    }

    if (labelText) {
      this.popups.push({
        x: center.x,
        y: center.y - 26,
        vy: -42,
        life: 0,
        maxLife: 0.95,
        text: labelText,
        color: labelColor,
      });
    }
  }

  spawnStarBurst(center) {
    const colors = ['#fde047', '#f472b6', '#38bdf8', '#4ade80', '#ffffff'];
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 150;
      this.particles.push({
        x: center.x,
        y: center.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0,
        maxLife: 0.7 + Math.random() * 0.35,
        color: colors[i % colors.length],
        size: 4 + Math.random() * 4,
        star: true,
      });
    }
  }

  startFxLoop() {
    if (this.fxRaf) cancelAnimationFrame(this.fxRaf);
    this.lastFxTime = performance.now();

    const frame = (now) => {
      if (!this.active) return;
      const dt = Math.min(0.05, (now - this.lastFxTime) / 1000);
      this.lastFxTime = now;
      this.updateAndDrawFx(dt);
      this.fxRaf = requestAnimationFrame(frame);
    };
    this.fxRaf = requestAnimationFrame(frame);
  }

  updateAndDrawFx(dt) {
    const ctx = this.fxCtx;
    if (!ctx || !this.fxCanvas) return;
    ctx.clearRect(0, 0, this.fxCanvas.width, this.fxCanvas.height);

    // Update & render particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 180 * dt;

      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      if (p.star) {
        ctx.rotate(p.life * 6);
        ctx.fillRect(-p.size, -p.size * 0.35, p.size * 2, p.size * 0.7);
        ctx.fillRect(-p.size * 0.35, -p.size, p.size * 0.7, p.size * 2);
      } else {
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

    // Floating damage / crit / heal popups
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.life += dt;
      if (pop.life >= pop.maxLife) {
        this.popups.splice(i, 1);
        continue;
      }
      pop.y += pop.vy * dt;
      pop.vy *= 0.94;
      const alpha = Math.max(0, 1 - Math.pow(pop.life / pop.maxLife, 1.8));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '900 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0f172a';
      ctx.strokeText(pop.text, pop.x, pop.y);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.restore();
    }
  }

  drawPokeball(ctx, ball) {
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.angle || 0);
    const r = 16;

    // Outer circle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Top half (Red for Poké Ball, Blue for Great Ball)
    ctx.fillStyle = ball.isGreat ? '#0ea5e9' : '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, r, Math.PI, 0);
    ctx.closePath();
    ctx.fill();

    // Great Ball accents
    if (ball.isGreat) {
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-10, -10, 5, 4);
      ctx.fillRect(5, -10, 5, 4);
    }

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
    ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  async playAttackVisual(attackerSide, defenderSide, move, result) {
    const atkSprite = attackerSide === 'player' ? this.playerSpriteEl : this.enemySpriteEl;
    const defSprite = defenderSide === 'enemy' ? this.enemySpriteEl : this.playerSpriteEl;

    atkSprite.classList.remove('is-idle');
    atkSprite.classList.add(attackerSide === 'player' ? 'lunge-right' : 'lunge-left');

    if (move.category === 'heal') {
      this.audio.playElemental('heal');
      this.spawnImpactFX(attackerSide, 'heal', `+${result.heal} HP`, '#86efac');
      await sleep(320);
      atkSprite.classList.remove('lunge-right', 'lunge-left');
      atkSprite.classList.add('is-idle');
      return;
    }

    if (move.type === 'normal' && move.id === 'tackle') {
      this.audio.playTackle();
    } else {
      this.audio.playElemental(move.type);
    }

    await sleep(160);
    if (!this.active) return;

    if (result.missed) {
      this.spawnImpactFX(defenderSide, 'normal', 'MISSED!', '#cbd5e1');
    } else {
      defSprite.classList.remove('is-idle');
      defSprite.classList.add('hit-shake');
      const popupTag = result.isCrit
        ? `-${result.damage} CRIT!`
        : result.effectiveness > 1
          ? `-${result.damage} SUPER!`
          : `-${result.damage}`;
      const popupColor = result.isCrit ? '#fde047' : result.effectiveness > 1 ? '#fbbf24' : '#ffffff';
      this.spawnImpactFX(defenderSide, move.type, popupTag, popupColor);
    }

    await sleep(340);
    atkSprite.classList.remove('lunge-right', 'lunge-left');
    atkSprite.classList.add('is-idle');
    defSprite.classList.remove('hit-shake');
    defSprite.classList.add('is-idle');
  }

  async handlePlayerMove(move) {
    if (!this.active || this.busy) return;
    this.busy = true;
    this.setControlsDisabled(true);
    this.audio.playMenuBlip(740);

    const playerFaster = this.player.spd >= this.enemy.spd;

    if (playerFaster) {
      const ended = await this.executeTurn('player', move);
      if (ended || !this.active) return;
      const enemyEnded = await this.executeEnemyTurn();
      if (enemyEnded || !this.active) return;
    } else {
      const enemyEnded = await this.executeEnemyTurn();
      if (enemyEnded || !this.active) return;
      const ended = await this.executeTurn('player', move);
      if (ended || !this.active) return;
    }

    this.busy = false;
    this.setControlsDisabled(false);
    this.renderActionButtons();
    await this.say(`What will ${this.player.name} do?`);
  }

  async executeTurn(side, move) {
    const isPlayer = side === 'player';
    const attacker = isPlayer ? this.player : this.enemy;
    const defender = isPlayer ? this.enemy : this.player;
    const defSide = isPlayer ? 'enemy' : 'player';

    await this.say(`${attacker.name} used ${move.name}!`);
    if (!this.active) return true;

    const result = calculateDamage(attacker, defender, move);
    await this.playAttackVisual(side, defSide, move, result);
    if (!this.active) return true;

    if (result.category === 'heal') {
      const gained = attacker.healAmount(result.heal);
      this.storage.save();
      await this.animateHpTo(side, attacker.hp);
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

    if (result.effectiveness > 1) {
      await this.say("It's super effective!");
    } else if (result.effectiveness < 1) {
      await this.say("It's not very effective...");
    }
    if (result.isCrit) {
      await this.say('A critical hit!');
    }

    if (defender.isFainted) {
      if (defSide === 'enemy') {
        await this.handleEnemyDefeated();
      } else {
        await this.handlePlayerFainted();
      }
      return true;
    }
    return false;
  }

  async executeEnemyTurn() {
    const moves = this.enemy.getMoveObjects();
    let chosen = moves[Math.floor(Math.random() * moves.length)];
    // Use heal move only when below 60% HP
    if (chosen.category === 'heal' && this.enemy.hp > this.enemy.maxHp * 0.6) {
      const attacks = moves.filter((m) => m.category === 'attack');
      if (attacks.length > 0) {
        chosen = attacks[Math.floor(Math.random() * attacks.length)];
      }
    }
    return this.executeTurn('enemy', chosen);
  }

  async handleUsePotion() {
    if (!this.active || this.busy) return;
    if (this.player.hp >= this.player.maxHp) return;
    if (!this.storage.useItem('potions')) return;

    this.busy = true;
    this.setControlsDisabled(true);
    this.audio.playHealChime();

    const healAmount = Math.max(18, Math.round(this.player.maxHp * 0.45));
    const gained = this.player.healAmount(healAmount);
    this.storage.save();
    this.spawnImpactFX('player', 'heal', `+${gained} HP`, '#86efac');
    await this.animateHpTo('player', this.player.hp);
    await this.say(`Used a Berry Potion! ${this.player.name} recovered ${gained} HP!`);

    const ended = await this.executeEnemyTurn();
    if (ended || !this.active) return;

    this.busy = false;
    this.setControlsDisabled(false);
    this.renderActionButtons();
    await this.say(`What will ${this.player.name} do?`);
  }

  async handleThrowBall(isGreat) {
    if (!this.active || this.busy) return;
    if (this.isShrine) {
      this.audio.playMenuBlip(320);
      await this.say("Shrine Guardians can't be caught! Defeat it to win the Elemental Badge!");
      return;
    }
    if (isGreat && !this.storage.useItem('greatBalls')) {
      return;
    }

    this.busy = true;
    this.setControlsDisabled(true);

    const ballName = isGreat ? 'Great Ball' : 'Poké Ball';
    await this.say(`Threw a ${ballName}!`);
    this.audio.playPokeballThrow();

    const start = this.getSpriteCenter('player');
    const target = this.getSpriteCenter('enemy');
    const attempt = calculateCatchAttempt(this.enemy, isGreat ? 1.45 : 1.0);

    // Parabolic throw flight
    await this.animateBallFlight(start, target, isGreat, 420);
    if (!this.active) return;

    // Shrink wild Pokémon inside
    this.enemySpriteEl.classList.remove('is-idle');
    this.enemySpriteEl.classList.add('capture-shrink');
    this.spawnImpactFX('enemy', 'psychic');
    await sleep(240);

    // Drop ball to pad
    const dropY = target.y + 24;
    await this.animateBallDrop(target.x, target.y, dropY, isGreat, 240);

    // 1..3 timed wobbles
    for (let i = 1; i <= attempt.shakes; i++) {
      this.audio.playPokeballWobble(i);
      await this.animateBallWobble(target.x, dropY, isGreat, i % 2 === 1 ? -1 : 1);
      await sleep(260);
    }

    if (attempt.caught) {
      this.pokeballAnim = { x: target.x, y: dropY, angle: 0, isGreat, glow: true };
      this.audio.playCaptureSuccess();
      this.spawnStarBurst({ x: target.x, y: dropY });
      await sleep(550);
      this.pokeballAnim = null;

      const { destination, newBadges } = this.storage.recordCaught(this.enemy);
      const winBadges = this.storage.recordBattleWin();
      const allNewBadges = [...newBadges, ...winBadges];

      await this.say(`Gotcha! ${this.enemy.name} was caught!`);
      if (destination === 'box') {
        await this.say(`${this.enemy.name} was sent to your Reserve Box (Team of 6 is full)!`);
      }

      await this.awardVictoryXp(0.6);
      this.onHudRefresh?.();
      if (allNewBadges.length > 0) {
        this.onBadgesUnlocked?.(allNewBadges);
      }
      this.stop({ outcome: 'caught', caughtSpecies: this.enemy.speciesId });
      return;
    }

    // Breakout!
    this.audio.playBreakout();
    this.pokeballAnim = null;
    this.enemySpriteEl.classList.remove('capture-shrink');
    this.enemySpriteEl.classList.add('is-idle');
    this.spawnImpactFX('enemy', 'normal', 'Broke free!', '#fde047');
    await this.say(`Oh no! ${this.enemy.name} broke free!`);

    const ended = await this.executeEnemyTurn();
    if (ended || !this.active) return;

    this.busy = false;
    this.setControlsDisabled(false);
    this.renderActionButtons();
    await this.say(`What will ${this.player.name} do?`);
  }

  animateBallFlight(start, target, isGreat, duration) {
    const startTime = performance.now();
    return new Promise((resolve) => {
      const tick = (now) => {
        const t = Math.min(1, (now - startTime) / duration);
        const arcHeight = Math.sin(t * Math.PI) * 95;
        this.pokeballAnim = {
          x: start.x + (target.x - start.x) * t,
          y: start.y + (target.y - start.y) * t - arcHeight,
          angle: t * Math.PI * 4,
          isGreat,
          glow: false,
        };
        if (t < 1 && this.active) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  animateBallDrop(x, fromY, toY, isGreat, duration) {
    const startTime = performance.now();
    return new Promise((resolve) => {
      const tick = (now) => {
        const t = Math.min(1, (now - startTime) / duration);
        const bounce = Math.abs(Math.sin(t * Math.PI * 1.5)) * (1 - t) * 18;
        this.pokeballAnim = {
          x,
          y: fromY + (toY - fromY) * t - bounce,
          angle: 0,
          isGreat,
          glow: false,
        };
        if (t < 1 && this.active) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  animateBallWobble(x, y, isGreat, dir) {
    const startTime = performance.now();
    const duration = 260;
    return new Promise((resolve) => {
      const tick = (now) => {
        const t = Math.min(1, (now - startTime) / duration);
        const swing = Math.sin(t * Math.PI * 2) * 0.42 * dir;
        this.pokeballAnim = {
          x: x + Math.sin(t * Math.PI * 2) * 6 * dir,
          y,
          angle: swing,
          isGreat,
          glow: false,
        };
        if (t < 1 && this.active) requestAnimationFrame(tick);
        else {
          this.pokeballAnim = { x, y, angle: 0, isGreat, glow: false };
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }

  async handleEnemyDefeated() {
    this.enemySpriteEl.classList.remove('is-idle');
    this.enemySpriteEl.classList.add('faint-drop');
    await sleep(320);

    await this.say(`${this.enemy.name} fainted!`);

    const badgeList = [...this.storage.recordBattleWin()];
    if (this.isShrine && this.shrineData) {
      const shrineBadges = this.storage.markShrineCleared(this.shrineData.id);
      badgeList.push(...shrineBadges);
    }

    await this.awardVictoryXp(1.0);

    // Friendly bonus loot roll
    if (Math.random() < 0.35) {
      const bonus = Math.random() < 0.5 ? { potions: 1 } : { greatBalls: 1 };
      this.storage.addRewards(bonus);
      const itemLabel = bonus.potions ? 'a Berry Potion' : 'a Great Ball';
      await this.say(`Found ${itemLabel} on the victory trail!`);
    }

    this.onHudRefresh?.();
    if (badgeList.length > 0) {
      this.onBadgesUnlocked?.(badgeList);
    }
    this.stop({ outcome: 'won', isShrine: this.isShrine });
  }

  async awardVictoryXp(scale = 1.0) {
    const xpGain = Math.max(12, Math.round((this.enemy.level * 14 + 12) * scale));
    await this.say(`${this.player.name} gained ${xpGain} XP!`);

    const levelResult = this.player.gainXp(xpGain);
    this.storage.save();
    this.renderStatusCards();

    if (levelResult.leveledUp) {
      this.audio.playLevelUp();
      const center = this.getSpriteCenter('player');
      this.spawnStarBurst(center);
      await this.say(`${this.player.name} grew to Level ${levelResult.newLevel}!`);
    }
  }

  async handlePlayerFainted() {
    this.playerSpriteEl.classList.remove('is-idle');
    this.playerSpriteEl.classList.add('faint-drop');
    await sleep(320);
    await this.say(`${this.player.name} fainted!`);

    const profile = this.storage.getActiveProfile();
    const healthyIdx = profile.team.findIndex((mon) => !mon.isFainted);
    if (healthyIdx >= 0) {
      this.mustSwitchForced = true;
      this.openTeamDrawer(true);
      return;
    }

    await this.say('Your team needs a quick rest! Returning to Starlight Fountain...');
    this.stop({ outcome: 'fainted', faintedAll: true });
  }

  async handleRun() {
    if (!this.active || this.busy) return;
    this.audio.playMenuBlip(520);
    this.busy = true;
    this.setControlsDisabled(true);
    await this.say(this.isShrine ? 'Stepped back safely from the Shrine!' : 'Got away safely!');
    this.stop({ outcome: 'escaped', faintedAll: false });
  }

  openTeamDrawer(forced = false) {
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
    const profile = this.storage.getActiveProfile();
    if (!profile || !profile.team[teamIdx] || profile.team[teamIdx].isFainted) return;

    const wasForced = this.mustSwitchForced;
    this.mustSwitchForced = false;
    this.closeTeamDrawer();
    this.busy = true;
    this.setControlsDisabled(true);

    this.playerIndex = teamIdx;
    this.player = profile.team[teamIdx];
    this.displayedPlayerHp = this.player.hp;
    this.playerSpriteEl.className = 'fighter-sprite is-idle';

    this.renderStatusCards();
    this.renderMoveButtons();
    await attachPokemonSprite(this.playerSpriteEl, this.player.speciesId, { back: true, timeoutMs: 1800 });
    await this.say(`Go, ${this.player.name}!`);

    if (!wasForced) {
      const ended = await this.executeEnemyTurn();
      if (ended || !this.active) return;
    }

    this.busy = false;
    this.setControlsDisabled(false);
    this.renderActionButtons();
    await this.say(`What will ${this.player.name} do?`);
  }
}
