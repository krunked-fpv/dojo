// Secret Unlockable Mini-Game: Starlight Sky-Hop Arcade

import * as PokemonMod from './pokemon.js';
import { EVOLUTION_ITEMS, SPECIES, TYPES, getBiomeAt } from './config.js';
import { THEMES } from './audio.js';

const CANVAS_W = 760;
const CANVAS_H = 420;
const PLAYER_X = 132;
const PLAYER_MIN_Y = 40;
const PLAYER_MAX_Y = CANVAS_H - 40;
const MAX_HEARTS = 3;

export const WAVE_TEMPLATES = [
  {
    id: 'rising_arc',
    name: 'Rising Starlight Arc',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.78 },
      { delay: 0.35, kind: 'star', yFrac: 0.66 },
      { delay: 0.7, kind: 'star', yFrac: 0.54 },
      { delay: 1.05, kind: 'bigstar', yFrac: 0.42 },
      { delay: 1.4, kind: 'star', yFrac: 0.3 },
      { delay: 1.75, kind: 'star', yFrac: 0.2 },
      { delay: 1.1, kind: 'cloud', yFrac: 0.78 },
    ],
  },
  {
    id: 'falling_cascade',
    name: 'Starfall Cascade',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.2 },
      { delay: 0.35, kind: 'star', yFrac: 0.32 },
      { delay: 0.7, kind: 'star', yFrac: 0.46 },
      { delay: 1.05, kind: 'bigstar', yFrac: 0.6 },
      { delay: 1.4, kind: 'star', yFrac: 0.74 },
      { delay: 1.75, kind: 'star', yFrac: 0.82 },
      { delay: 0.9, kind: 'cloud', yFrac: 0.22 },
    ],
  },
  {
    id: 'sine_ribbon',
    name: 'Celestial Ribbon',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.5 },
      { delay: 0.32, kind: 'star', yFrac: 0.34 },
      { delay: 0.64, kind: 'star', yFrac: 0.24 },
      { delay: 0.96, kind: 'star', yFrac: 0.36 },
      { delay: 1.28, kind: 'star', yFrac: 0.56 },
      { delay: 1.6, kind: 'bigstar', yFrac: 0.72 },
      { delay: 1.92, kind: 'star', yFrac: 0.56 },
      { delay: 0.85, kind: 'cloud', yFrac: 0.78 },
      { delay: 1.85, kind: 'cloud', yFrac: 0.22 },
    ],
  },
  {
    id: 'twin_lanes',
    name: 'Twin Sky Lanes',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.25 },
      { delay: 0.0, kind: 'star', yFrac: 0.75 },
      { delay: 0.45, kind: 'star', yFrac: 0.25 },
      { delay: 0.45, kind: 'star', yFrac: 0.75 },
      { delay: 0.9, kind: 'cloud', yFrac: 0.5 },
      { delay: 1.3, kind: 'bigstar', yFrac: 0.25 },
      { delay: 1.3, kind: 'bigstar', yFrac: 0.75 },
      { delay: 1.85, kind: 'cloud', yFrac: 0.5 },
    ],
  },
  {
    id: 'diamond_constellation',
    name: 'Diamond Constellation',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.5 },
      { delay: 0.35, kind: 'star', yFrac: 0.34 },
      { delay: 0.35, kind: 'star', yFrac: 0.66 },
      { delay: 0.7, kind: 'star', yFrac: 0.22 },
      { delay: 0.7, kind: 'bigstar', yFrac: 0.5 },
      { delay: 0.7, kind: 'star', yFrac: 0.78 },
      { delay: 1.05, kind: 'star', yFrac: 0.34 },
      { delay: 1.05, kind: 'star', yFrac: 0.66 },
      { delay: 1.4, kind: 'star', yFrac: 0.5 },
      { delay: 1.85, kind: 'cloud', yFrac: 0.22 },
      { delay: 1.85, kind: 'cloud', yFrac: 0.78 },
    ],
  },
  {
    id: 'comet_chase',
    name: 'Rainbow Comet Chase',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.48 },
      { delay: 0.28, kind: 'star', yFrac: 0.48 },
      { delay: 0.58, kind: 'comet', yFrac: 0.48, speedMult: 1.25 },
      { delay: 1.05, kind: 'cloud', yFrac: 0.24 },
      { delay: 1.05, kind: 'cloud', yFrac: 0.74 },
      { delay: 1.5, kind: 'star', yFrac: 0.48 },
      { delay: 1.8, kind: 'comet', yFrac: 0.35, speedMult: 1.25 },
    ],
  },
  {
    id: 'zigzag_sky',
    name: 'Skyline Zigzag',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.24 },
      { delay: 0.4, kind: 'star', yFrac: 0.5 },
      { delay: 0.8, kind: 'star', yFrac: 0.76 },
      { delay: 1.2, kind: 'bigstar', yFrac: 0.5 },
      { delay: 1.6, kind: 'star', yFrac: 0.24 },
      { delay: 2.0, kind: 'star', yFrac: 0.5 },
      { delay: 0.55, kind: 'cloud', yFrac: 0.82 },
      { delay: 1.45, kind: 'cloud', yFrac: 0.18 },
    ],
  },
  {
    id: 'sky_ladder',
    name: 'Starlight Ladder',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.8 },
      { delay: 0.35, kind: 'star', yFrac: 0.65 },
      { delay: 0.7, kind: 'star', yFrac: 0.5 },
      { delay: 1.05, kind: 'star', yFrac: 0.35 },
      { delay: 1.4, kind: 'bigstar', yFrac: 0.2 },
      { delay: 0.75, kind: 'cloud', yFrac: 0.22 },
      { delay: 1.65, kind: 'cloud', yFrac: 0.72 },
    ],
  },
  {
    id: 'orbit_halo',
    name: 'Astral Orbit Halo',
    items: [
      { delay: 0.1, kind: 'star', yFrac: 0.35 },
      { delay: 0.1, kind: 'star', yFrac: 0.65 },
      { delay: 0.45, kind: 'star', yFrac: 0.22 },
      { delay: 0.45, kind: 'comet', yFrac: 0.5 },
      { delay: 0.45, kind: 'star', yFrac: 0.78 },
      { delay: 0.8, kind: 'star', yFrac: 0.35 },
      { delay: 0.8, kind: 'star', yFrac: 0.65 },
      { delay: 1.45, kind: 'cloud', yFrac: 0.48 },
    ],
  },
  {
    id: 'meteor_shower',
    name: 'Prism Meteor Shower',
    items: [
      { delay: 0.0, kind: 'comet', yFrac: 0.24, speedMult: 1.2 },
      { delay: 0.4, kind: 'star', yFrac: 0.42 },
      { delay: 0.75, kind: 'comet', yFrac: 0.6, speedMult: 1.2 },
      { delay: 1.15, kind: 'star', yFrac: 0.78 },
      { delay: 1.5, kind: 'bigstar', yFrac: 0.46 },
      { delay: 0.9, kind: 'cloud', yFrac: 0.22 },
      { delay: 1.75, kind: 'cloud', yFrac: 0.76 },
    ],
  },
  {
    id: 'aurora_bridge',
    name: 'Aurora Sky Bridge',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.5 },
      { delay: 0.3, kind: 'star', yFrac: 0.5 },
      { delay: 0.6, kind: 'bigstar', yFrac: 0.5 },
      { delay: 0.9, kind: 'star', yFrac: 0.5 },
      { delay: 1.2, kind: 'star', yFrac: 0.5 },
      { delay: 0.45, kind: 'cloud', yFrac: 0.22 },
      { delay: 0.45, kind: 'cloud', yFrac: 0.78 },
      { delay: 1.45, kind: 'cloud', yFrac: 0.24 },
      { delay: 1.45, kind: 'cloud', yFrac: 0.76 },
    ],
  },
  {
    id: 'double_helix',
    name: 'Cosmic Double Helix',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.3 },
      { delay: 0.0, kind: 'star', yFrac: 0.7 },
      { delay: 0.45, kind: 'star', yFrac: 0.46 },
      { delay: 0.45, kind: 'star', yFrac: 0.54 },
      { delay: 0.9, kind: 'star', yFrac: 0.7 },
      { delay: 0.9, kind: 'star', yFrac: 0.3 },
      { delay: 1.35, kind: 'bigstar', yFrac: 0.5 },
      { delay: 1.8, kind: 'cloud', yFrac: 0.22 },
      { delay: 1.8, kind: 'cloud', yFrac: 0.78 },
    ],
  },
  {
    id: 'nebula_sprint',
    name: 'Nebula Star Trio',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.26 },
      { delay: 0.25, kind: 'star', yFrac: 0.26 },
      { delay: 0.5, kind: 'bigstar', yFrac: 0.26 },
      { delay: 0.65, kind: 'cloud', yFrac: 0.62 },
      { delay: 1.1, kind: 'star', yFrac: 0.74 },
      { delay: 1.35, kind: 'star', yFrac: 0.74 },
      { delay: 1.6, kind: 'comet', yFrac: 0.74 },
      { delay: 1.7, kind: 'cloud', yFrac: 0.34 },
    ],
  },
  {
    id: 'starlight_crown',
    name: 'Starlight Crown',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.68 },
      { delay: 0.35, kind: 'star', yFrac: 0.44 },
      { delay: 0.7, kind: 'star', yFrac: 0.6 },
      { delay: 1.05, kind: 'bigstar', yFrac: 0.25 },
      { delay: 1.4, kind: 'star', yFrac: 0.6 },
      { delay: 1.75, kind: 'star', yFrac: 0.44 },
      { delay: 2.1, kind: 'star', yFrac: 0.68 },
      { delay: 1.05, kind: 'cloud', yFrac: 0.78 },
    ],
  },
];

const SKY_PALETTES = [
  { name: 'Starlight Village Dusk', top: '#0f172a', mid: '#312e81', bottom: '#4c1d95', accent: '#c084fc' },
  { name: 'Whispering Canopy', top: '#064e3b', mid: '#0f766e', bottom: '#1e3a8a', accent: '#4ade80' },
  { name: 'Sapphire Horizon', top: '#0c4a6e', mid: '#0284c7', bottom: '#1e1b4b', accent: '#38bdf8' },
  { name: 'Ember Sunset', top: '#431407', mid: '#c2410c', bottom: '#7c2d12', accent: '#fb923c' },
  { name: 'Starfall Aurora', top: '#1e1b4b', mid: '#0f766e', bottom: '#3b0764', accent: '#67e8f9' },
  { name: 'Celestial Blossom', top: '#500724', mid: '#9d174d', bottom: '#312e81', accent: '#f9a8d4' },
  { name: 'Sunstone Mirage', top: '#451a03', mid: '#b45309', bottom: '#1e293b', accent: '#fde047' },
  { name: 'Astral Citadel', top: '#090d1a', mid: '#4338ca', bottom: '#0f172a', accent: '#a78bfa' },
  { name: 'Terastal Prism', top: '#1e1b4b', mid: '#0369a1', bottom: '#831843', accent: '#f472b6' },
];

export class StarlightMinigame {
  constructor({ storage = null, audio = null, onClose = null, onCelebrate = null, onRewardsEarned = null } = {}) {
    this.storage = storage;
    this.audio = audio;
    this.onClose = onClose;
    this.onCelebrate = onCelebrate;
    this.onRewardsEarned = onRewardsEarned;

    this.modalEl = typeof document !== 'undefined' ? document.getElementById('minigame-modal') : null;
    this.canvas = typeof document !== 'undefined' ? document.getElementById('minigame-canvas') : null;
    this.ctx = this.canvas?.getContext?.('2d') || null;
    this.pauseBtn = typeof document !== 'undefined' ? document.getElementById('minigame-pause-btn') : null;
    this.closeBtn = typeof document !== 'undefined' ? document.getElementById('minigame-close-btn') : null;
    this.dashBtn = typeof document !== 'undefined' ? document.getElementById('minigame-dash-btn') : null;
    this.partnerPillEl = typeof document !== 'undefined' ? document.getElementById('minigame-partner-pill') : null;
    this.hudScoreEl = typeof document !== 'undefined' ? document.getElementById('minigame-hud-score') : null;
    this.hudWaveEl = typeof document !== 'undefined' ? document.getElementById('minigame-hud-wave') : null;
    this.hudHeartsEl = typeof document !== 'undefined' ? document.getElementById('minigame-hud-hearts') : null;
    this.hudComboEl = typeof document !== 'undefined' ? document.getElementById('minigame-hud-combo') : null;
    this.hudBestEl = typeof document !== 'undefined' ? document.getElementById('minigame-hud-best') : null;
    this.resultsEl = typeof document !== 'undefined' ? document.getElementById('minigame-results') : null;
    this.resultsCardEl = typeof document !== 'undefined' ? document.getElementById('minigame-results-card') : null;
    this.replayBtn = typeof document !== 'undefined' ? document.getElementById('minigame-replay-btn') : null;
    this.doneBtn = typeof document !== 'undefined' ? document.getElementById('minigame-done-btn') : null;

    this._open = false;
    this.paused = false;
    this.rafId = null;
    this.lastFrameMs = 0;

    this.waveDeck = [];
    this.lastWaveId = null;
    this.currentWave = null;
    this.pendingSpawns = [];
    this.waveElapsed = 0;
    this.waveBannerTimer = 0;

    this.score = 0;
    this.wave = 1;
    this.hearts = MAX_HEARTS;
    this.combo = 1;
    this.comboStreak = 0;
    this.starsCollected = 0;
    this.runEnded = false;
    this.runRecorded = false;

    this.playerY = CANVAS_H * 0.5;
    this.playerVy = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.magnetTimer = 0;
    this.hitInvulnTimer = 0;
    this.shakeTimer = 0;

    this.pointerActive = false;
    this.activePointerId = null;
    this.pointerTargetY = null;
    this.keysHeld = new Set();

    this.entities = [];
    this.particles = [];
    this.bgStars = Array.from({ length: 44 }, (_, idx) => ({
      x: ((idx * 97) % CANVAS_W),
      y: ((idx * 61) % (CANVAS_H - 40)) + 16,
      r: 1 + (idx % 3) * 0.8,
      speed: 24 + (idx % 5) * 14,
      twinkle: idx * 0.7,
    }));

    this.leadMon = null;
    this.leadSpecies = SPECIES[25];
    this.leadTypeInfo = TYPES.electric || TYPES.normal;
    this.playerSpriteImg = null;
    this._prevBgmTheme = null;

    this._onKeyDown = (e) => this.handleKeyDown(e);
    this._onKeyUp = (e) => this.handleKeyUp(e);
    this._onVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.hidden && this.isOpen() && !this.runEnded) {
        this.pause();
      }
    };
    this._onWindowBlur = () => {
      if (this.isOpen() && !this.runEnded) {
        this.pause();
      }
    };

    this.bindUI();
  }

  bindUI() {
    this.pauseBtn?.addEventListener('click', () => {
      this.audio?.unlock?.();
      this.audio?.playMenuBlip?.(this.paused ? 720 : 520);
      this.togglePause();
    });

    this.closeBtn?.addEventListener('click', () => {
      this.audio?.playMenuBlip?.(480);
      this.close();
    });

    this.doneBtn?.addEventListener('click', () => {
      this.audio?.playMenuBlip?.(540);
      this.close();
    });

    this.replayBtn?.addEventListener('click', () => {
      this.audio?.unlock?.();
      this.audio?.playMenuBlip?.(740);
      this.startNewRun();
    });

    this.modalEl?.addEventListener('click', (e) => {
      if (e.target === this.modalEl) {
        this.close();
      }
    });

    this.dashBtn?.addEventListener('click', () => {
      this.audio?.unlock?.();
      this.activateDash();
    });

    if (this.canvas) {
      const resolveCanvasY = (clientY) => {
        const rect = this.canvas.getBoundingClientRect();
        if (rect && rect.height > 0) {
          const norm = (clientY - rect.top) / rect.height;
          return Math.max(PLAYER_MIN_Y, Math.min(PLAYER_MAX_Y, norm * CANVAS_H));
        }
        return Math.max(PLAYER_MIN_Y, Math.min(PLAYER_MAX_Y, clientY));
      };

      this.canvas.addEventListener('pointerdown', (e) => {
        if (!this._open || this.runEnded || this.paused) return;
        e.preventDefault();
        this.audio?.unlock?.();
        this.activePointerId = e.pointerId;
        this.pointerActive = true;
        this.pointerTargetY = resolveCanvasY(e.clientY);
        try {
          this.canvas.setPointerCapture?.(e.pointerId);
        } catch {
          // Ignore capture failure on synthetic events
        }
        this._spawnTrailParticles(PLAYER_X, this.playerY, 4);
      });

      this.canvas.addEventListener('pointermove', (e) => {
        if (!this._open || this.runEnded || this.paused || !this.pointerActive) return;
        if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;
        e.preventDefault();
        this.pointerTargetY = resolveCanvasY(e.clientY);
      });

      const releasePointer = (e) => {
        if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;
        this.pointerActive = false;
        this.activePointerId = null;
      };

      this.canvas.addEventListener('pointerup', releasePointer);
      this.canvas.addEventListener('pointercancel', releasePointer);
      this.canvas.addEventListener('lostpointercapture', releasePointer);
      this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this._onKeyDown);
      window.addEventListener('keyup', this._onKeyUp);
      window.addEventListener('blur', this._onWindowBlur);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this._onVisibilityChange);
    }
  }

  destroy() {
    this._stopLoop();
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this._onKeyDown);
      window.removeEventListener('keyup', this._onKeyUp);
      window.removeEventListener('blur', this._onWindowBlur);
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this._onVisibilityChange);
    }
  }

  setPaused(nextPaused) {
    const shouldPause = Boolean(nextPaused);
    if (!this._open || this.runEnded) return false;
    if (this.paused === shouldPause) return true;

    this.paused = shouldPause;
    if (shouldPause) {
      this.keysHeld.clear();
      this.pointerActive = false;
      this.activePointerId = null;
      this.pointerTargetY = null;
      this._stopLoop();
      this.syncHud();
      this.render(typeof performance !== 'undefined' ? performance.now() : Date.now());
    } else {
      this.lastFrameMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.syncHud();
      this._startLoop();
    }
    return true;
  }

  pause() {
    return this.setPaused(true);
  }

  resume() {
    return this.setPaused(false);
  }

  togglePause() {
    return this.setPaused(!this.paused);
  }

  isOpen() {
    return Boolean(this._open && (!this.modalEl || !this.modalEl.hidden));
  }

  _refillWaveDeck() {
    const deck = WAVE_TEMPLATES.map((tpl) => ({ ...tpl }));
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    if (this.lastWaveId && deck.length > 1 && deck[deck.length - 1].id === this.lastWaveId) {
      const swapIdx = Math.floor(Math.random() * (deck.length - 1));
      const lastIdx = deck.length - 1;
      [deck[lastIdx], deck[swapIdx]] = [deck[swapIdx], deck[lastIdx]];
    }
    this.waveDeck = deck;
  }

  drawNextWave() {
    if (!Array.isArray(this.waveDeck) || this.waveDeck.length === 0) {
      this._refillWaveDeck();
    }
    let next = this.waveDeck.pop();
    if (this.lastWaveId && next?.id === this.lastWaveId && this.waveDeck.length > 0) {
      const alt = this.waveDeck[0];
      this.waveDeck[0] = next;
      next = alt;
    }
    this.lastWaveId = next?.id || null;
    return next;
  }

  getSkyTheme(wave = this.wave) {
    const idx = Math.floor(Math.max(0, (Number(wave) || 1) - 1) / 2) % SKY_PALETTES.length;
    return SKY_PALETTES[idx];
  }

  _resolveLeadPartner() {
    const profile = this.storage?.getActiveProfile?.() || null;
    const lead = profile?.team?.[0] || null;
    const spId = Number(lead?.speciesId) || Number(profile?.starterId) || 25;
    const sp = SPECIES[spId] || SPECIES[25];
    const typeId = lead?.type || sp?.type || 'electric';
    const typeInfo = TYPES[typeId] || TYPES.normal;

    this.leadMon = lead;
    this.leadSpecies = sp;
    this.leadTypeInfo = typeInfo;

    if (this.partnerPillEl) {
      const name = lead?.displayName || lead?.name || sp?.name || 'Partner';
      const shinyTag = lead?.isShiny ? '✨ ' : '';
      this.partnerPillEl.textContent = `${typeInfo.icon} ${shinyTag}${name}`;
      this.partnerPillEl.style.borderColor = typeInfo.color;
      this.partnerPillEl.style.background = typeInfo.bg;
    }

    if (typeof Image !== 'undefined') {
      const img = new Image();
      this.playerSpriteImg = img;
      PokemonMod.attachPokemonSprite?.(img, lead || sp.id, {
        back: false,
        shiny: Boolean(lead?.isShiny),
        timeoutMs: 2200,
      });
    }
  }

  open() {
    this.audio?.unlock?.();
    const curTheme = this.audio?.currentTheme || null;
    if (curTheme && curTheme !== 'arcade') {
      this._prevBgmTheme = curTheme;
    }

    this._open = true;
    if (this.modalEl) {
      this.modalEl.hidden = false;
    }

    this._resolveLeadPartner();
    this.audio?.playPokemonCry?.(this.leadMon || this.leadSpecies?.id || 25);
    this.audio?.playBGM?.('arcade');

    this.startNewRun();
  }

  startNewRun() {
    this._stopLoop();
    this.paused = false;
    this.score = 0;
    this.wave = 1;
    this.hearts = MAX_HEARTS;
    this.combo = 1;
    this.comboStreak = 0;
    this.starsCollected = 0;
    this.runEnded = false;
    this.runRecorded = false;

    this.playerY = CANVAS_H * 0.5;
    this.playerVy = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.magnetTimer = 0;
    this.hitInvulnTimer = 0;
    this.shakeTimer = 0;
    this.pointerActive = false;
    this.activePointerId = null;
    this.pointerTargetY = null;
    this.keysHeld.clear();

    this.entities = [];
    this.particles = [];
    if (this.resultsEl) {
      this.resultsEl.hidden = true;
    }

    this._beginWave(1);
    this.syncHud();
    this.render(typeof performance !== 'undefined' ? performance.now() : Date.now());
    this._startLoop();
  }

  close() {
    const wasOpen = this._open;
    this._stopLoop();
    this._open = false;
    this.paused = false;
    this.pointerActive = false;
    this.activePointerId = null;
    this.pointerTargetY = null;
    this.keysHeld.clear();

    if (this.modalEl) {
      this.modalEl.hidden = true;
    }
    if (this.resultsEl) {
      this.resultsEl.hidden = true;
    }
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    if (wasOpen) {
      const profile = this.storage?.getActiveProfile?.();
      const biome = profile?.pos ? getBiomeAt(profile.pos.x, profile.pos.y) : null;
      const restoreTheme = (biome && THEMES[biome.id])
        ? biome.id
        : (this._prevBgmTheme && THEMES[this._prevBgmTheme] ? this._prevBgmTheme : 'overworld');
      this.audio?.playBGM?.(restoreTheme);
      this.onClose?.();
    }
  }

  _beginWave(waveNum) {
    this.wave = waveNum;
    this.currentWave = this.drawNextWave();
    this.waveElapsed = 0;
    this.waveBannerTimer = 1.8;

    const baseItems = Array.isArray(this.currentWave?.items) ? this.currentWave.items : [];
    const flip = waveNum % 2 === 0;
    this.pendingSpawns = baseItems.map((item) => ({
      ...item,
      yFrac: flip ? Math.max(0.16, Math.min(0.84, 1 - item.yFrac)) : item.yFrac,
      spawned: false,
    }));

    if (waveNum >= 3 && waveNum % 3 === 0 && this.hearts < MAX_HEARTS) {
      this.pendingSpawns.push({
        delay: 1.5,
        kind: 'heart',
        yFrac: 0.5,
        spawned: false,
      });
    }
  }

  _spawnEntity(spec) {
    const waveSpeedBoost = Math.min(180, (this.wave - 1) * 14);
    const speed = (225 + waveSpeedBoost) * (spec.speedMult || 1);
    const y = Math.max(36, Math.min(CANVAS_H - 36, spec.yFrac * CANVAS_H));
    const kind = spec.kind || 'star';
    const radius = kind === 'cloud' ? 22 : kind === 'bigstar' ? 22 : kind === 'comet' ? 19 : 16;

    this.entities.push({
      kind,
      x: CANVAS_W + 34,
      y,
      baseY: y,
      radius,
      speed,
      age: 0,
      bobAmp: kind === 'comet' ? 26 : 10,
      bobFreq: kind === 'comet' ? 4.5 : 2.6,
    });
  }

  activateDash() {
    if (!this._open || this.runEnded || this.paused || this.dashCooldown > 0 || this.dashTimer > 0) {
      return false;
    }
    this.dashTimer = 1.6;
    this.dashCooldown = 3.2;
    this.magnetTimer = Math.max(this.magnetTimer, 1.6);
    this.audio?.playArcadeBoost?.();
    this._spawnTrailParticles(PLAYER_X, this.playerY, 18, true);
    this.syncHud();
    return true;
  }

  handleKeyDown(e) {
    if (!this.isOpen()) return;
    const isEscape = e.code === 'Escape' || e.key === 'Escape';
    if (isEscape) {
      e.preventDefault();
      this.close();
      return;
    }

    const isSpace = e.code === 'Space' || e.key === ' ';
    const isEnter = e.code === 'Enter' || e.code === 'NumpadEnter' || e.key === 'Enter';
    if (this.runEnded) {
      if (!e.repeat && (isSpace || isEnter) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.target === this.closeBtn || e.target === this.doneBtn) return;
        e.preventDefault();
        this.audio?.unlock?.();
        this.audio?.playMenuBlip?.(740);
        this.startNewRun();
      }
      return;
    }

    const isKeyP = e.code === 'KeyP' || e.key === 'p' || e.key === 'P';
    if (isKeyP && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (!e.repeat) {
        e.preventDefault();
        this.audio?.unlock?.();
        this.audio?.playMenuBlip?.(this.paused ? 720 : 520);
        this.togglePause();
      }
      return;
    }

    if (this.paused) return;

    const isUp = e.code === 'ArrowUp' || e.code === 'KeyW' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W';
    const isDown = e.code === 'ArrowDown' || e.code === 'KeyS' || e.key === 'ArrowDown' || e.key === 's' || e.key === 'S';
    if (isUp) {
      e.preventDefault();
      this.keysHeld.add('up');
      this.pointerTargetY = null;
    } else if (isDown) {
      e.preventDefault();
      this.keysHeld.add('down');
      this.pointerTargetY = null;
    } else if (isSpace) {
      e.preventDefault();
      if (!e.repeat) {
        this.activateDash();
      }
    }
  }

  handleKeyUp(e) {
    const isUp = e.code === 'ArrowUp' || e.code === 'KeyW' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W';
    const isDown = e.code === 'ArrowDown' || e.code === 'KeyS' || e.key === 'ArrowDown' || e.key === 's' || e.key === 'S';
    if (isUp) {
      this.keysHeld.delete('up');
    } else if (isDown) {
      this.keysHeld.delete('down');
    }
  }

  _spawnTrailParticles(x, y, count = 2, burst = false) {
    const baseColor = this.leadTypeInfo?.color || '#38bdf8';
    const colors = this.dashTimer > 0 || this.leadMon?.isShiny
      ? [baseColor, '#fde047', '#f472b6', '#ffffff']
      : [baseColor, '#bae6fd', '#fde047'];

    for (let i = 0; i < count; i++) {
      const angle = burst ? (Math.PI * 2 * i) / Math.max(1, count) : Math.PI + (Math.random() - 0.5) * 0.9;
      const speed = burst ? 90 + Math.random() * 140 : 60 + Math.random() * 80;
      this.particles.push({
        x: x - (burst ? 0 : 18),
        y: y + (Math.random() - 0.5) * 14,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: burst ? 0.55 : 0.42,
        size: burst ? 4.5 : 3.2,
        color: colors[i % colors.length],
      });
    }
  }

  update(dt) {
    if (!this._open || this.runEnded || this.paused) return;

    const clampedDt = Math.min(0.05, Math.max(0.001, dt));
    if (this.dashTimer > 0) this.dashTimer = Math.max(0, this.dashTimer - clampedDt);
    if (this.dashCooldown > 0) this.dashCooldown = Math.max(0, this.dashCooldown - clampedDt);
    if (this.magnetTimer > 0) this.magnetTimer = Math.max(0, this.magnetTimer - clampedDt);
    if (this.hitInvulnTimer > 0) this.hitInvulnTimer = Math.max(0, this.hitInvulnTimer - clampedDt);
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - clampedDt);
    if (this.waveBannerTimer > 0) this.waveBannerTimer = Math.max(0, this.waveBannerTimer - clampedDt);

    // Player vertical steering (Keyboard or Direct Pointer Tap/Drag)
    const speedMult = this.dashTimer > 0 ? 1.25 : 1.0;
    if (this.keysHeld.has('up') || this.keysHeld.has('down')) {
      const dir = (this.keysHeld.has('down') ? 1 : 0) - (this.keysHeld.has('up') ? 1 : 0);
      this.playerVy = dir * 320 * speedMult;
      this.playerY += this.playerVy * clampedDt;
    } else if (this.pointerTargetY !== null) {
      const diff = this.pointerTargetY - this.playerY;
      if (Math.abs(diff) <= 3) {
        this.playerY = this.pointerTargetY;
        this.playerVy = 0;
        if (!this.pointerActive) this.pointerTargetY = null;
      } else {
        const followRate = this.pointerActive ? 14 : 9.5;
        this.playerVy = Math.max(-480, Math.min(480, diff * followRate));
        this.playerY += this.playerVy * clampedDt;
      }
    } else {
      this.playerVy *= Math.pow(0.02, clampedDt);
    }
    this.playerY = Math.max(PLAYER_MIN_Y, Math.min(PLAYER_MAX_Y, this.playerY));

    // Ambient starlight trail behind Lead Pokémon
    if (Math.random() < (this.dashTimer > 0 ? 0.95 : 0.45)) {
      this._spawnTrailParticles(PLAYER_X, this.playerY, this.dashTimer > 0 ? 2 : 1, false);
    }

    // Background twinkling stars scroll
    const scrollBoost = this.dashTimer > 0 ? 1.45 : 1.0;
    for (const s of this.bgStars) {
      s.x -= s.speed * scrollBoost * clampedDt;
      s.twinkle += clampedDt * 3;
      if (s.x < -4) s.x = CANVAS_W + 4;
    }

    // Wave spawn scheduling
    this.waveElapsed += clampedDt;
    let maxDelay = 0;
    for (const sp of this.pendingSpawns) {
      if (sp.delay > maxDelay) maxDelay = sp.delay;
      if (!sp.spawned && this.waveElapsed >= sp.delay) {
        sp.spawned = true;
        this._spawnEntity(sp);
      }
    }

    // Update entities & collisions
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const ent = this.entities[i];
      ent.age += clampedDt;
      ent.x -= ent.speed * scrollBoost * clampedDt;
      ent.y = Math.max(28, Math.min(CANVAS_H - 28, ent.baseY + Math.sin(ent.age * ent.bobFreq) * ent.bobAmp));

      // Magnet attraction for collectibles
      if (ent.kind !== 'cloud' && (this.dashTimer > 0 || this.magnetTimer > 0)) {
        const dx = PLAYER_X - ent.x;
        const dy = this.playerY - ent.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1 && dist < 210) {
          const pull = 360 * clampedDt;
          ent.x += (dx / dist) * pull;
          ent.baseY += (dy / dist) * pull;
          ent.y = ent.baseY;
        }
      }

      const dist = Math.hypot(ent.x - PLAYER_X, ent.y - this.playerY);
      const hitRadius = ent.kind === 'cloud' ? 28 : 34;

      if (dist <= hitRadius) {
        if (ent.kind === 'cloud') {
          if (this.dashTimer > 0) {
            this.score += 15;
            this.audio?.playArcadeStar?.(this.combo);
            this._spawnTrailParticles(ent.x, ent.y, 10, true);
            this.entities.splice(i, 1);
          } else if (this.hitInvulnTimer <= 0) {
            this.hearts = Math.max(0, this.hearts - 1);
            this.combo = 1;
            this.comboStreak = 0;
            this.hitInvulnTimer = 1.4;
            this.shakeTimer = 0.28;
            this.audio?.playArcadeBump?.();
            this._spawnTrailParticles(PLAYER_X, this.playerY, 12, true);
            this.entities.splice(i, 1);
            if (this.hearts <= 0) {
              this.endRun();
              return;
            }
          }
          continue;
        }

        if (ent.kind === 'heart') {
          this.hearts = Math.min(MAX_HEARTS, this.hearts + 1);
          this.score += 20;
          this.audio?.playHealChime?.();
          this._spawnTrailParticles(ent.x, ent.y, 10, true);
          this.entities.splice(i, 1);
          continue;
        }

        // Star collectible
        this.starsCollected += 1;
        this.comboStreak += ent.kind === 'bigstar' ? 2 : 1;
        this.combo = Math.min(8, 1 + Math.floor(this.comboStreak / 3));
        const basePts = ent.kind === 'bigstar' ? 30 : ent.kind === 'comet' ? 25 : 10;
        this.score += basePts * this.combo;
        if (ent.kind === 'comet') {
          this.magnetTimer = Math.max(this.magnetTimer, 1.0);
        }
        this.audio?.playArcadeStar?.(this.combo);
        this._spawnTrailParticles(ent.x, ent.y, ent.kind === 'bigstar' ? 12 : 6, true);
        this.entities.splice(i, 1);
        continue;
      }

      if (ent.x < -50) {
        this.entities.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += clampedDt;
      p.x += p.vx * clampedDt;
      p.y += p.vy * clampedDt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // Advance wave when spawns complete and screen clears (or wave duration passes)
    const allSpawned = this.pendingSpawns.every((sp) => sp.spawned);
    if (allSpawned && (this.entities.length === 0 || this.waveElapsed >= maxDelay + 3.2)) {
      this.score += 25;
      this._beginWave(this.wave + 1);
    }

    this.syncHud();
  }

  computeRewards(score = this.score, wave = this.wave) {
    const safeScore = Math.max(0, Math.floor(Number(score) || 0));
    const starShards = Math.min(8, Math.max(1, 1 + Math.floor(safeScore / 120)));
    const potions = safeScore >= 240 ? 2 : 1;
    const greatBalls = safeScore >= 150 ? (safeScore >= 400 ? 2 : 1) : 0;
    const starBalls = safeScore >= 320 || wave >= 5 ? 1 : 0;
    const rewards = { starShards, potions };
    if (greatBalls > 0) rewards.greatBalls = greatBalls;
    if (starBalls > 0) rewards.starBalls = starBalls;
    if (safeScore >= 500) {
      const gemKeys = Object.keys(EVOLUTION_ITEMS || {});
      if (gemKeys.length > 0) {
        const picked = gemKeys[Math.floor(Math.random() * gemKeys.length)];
        rewards.gems = { [picked]: 1 };
      }
    }
    return rewards;
  }

  _formatRewardBadges(rewards = {}) {
    const chips = [];
    if (rewards.starShards) chips.push(`✨ +${rewards.starShards} Star Shard${rewards.starShards > 1 ? 's' : ''}`);
    if (rewards.potions) chips.push(`🍓 +${rewards.potions} Berry Potion${rewards.potions > 1 ? 's' : ''}`);
    if (rewards.greatBalls) chips.push(`🔵 +${rewards.greatBalls} Great Ball${rewards.greatBalls > 1 ? 's' : ''}`);
    if (rewards.starBalls) chips.push(`🌟 +${rewards.starBalls} Star Ball${rewards.starBalls > 1 ? 's' : ''}`);
    if (rewards.gems && typeof rewards.gems === 'object') {
      for (const [gemId, count] of Object.entries(rewards.gems)) {
        if (count > 0) {
          const gem = EVOLUTION_ITEMS?.[gemId];
          chips.push(`${gem?.icon || '💎'} +${count} ${gem?.name || gemId}`);
        }
      }
    }
    return chips;
  }

  endRun() {
    if (this.runEnded) return null;
    this.runEnded = true;
    this.paused = false;
    this._stopLoop();
    if (typeof document !== 'undefined' && (document.activeElement === this.pauseBtn || document.activeElement === this.dashBtn)) {
      document.activeElement.blur();
    }

    const rewards = this.computeRewards(this.score, this.wave);
    let recordRes = null;
    if (!this.runRecorded) {
      this.runRecorded = true;
      if (typeof this.storage?.recordArcadeRun === 'function') {
        recordRes = this.storage.recordArcadeRun({
          score: this.score,
          wave: this.wave,
          stars: this.starsCollected,
          rewards,
        });
      } else {
        this.storage?.addRewards?.(rewards);
      }
    }

    this.syncHud();
    const rewardChips = this._formatRewardBadges(rewards);
    const highScore = recordRes?.highScore ?? Math.max(this.score, this.storage?.getActiveProfile?.()?.arcade?.highScore || 0);
    const isNewBest = Boolean(recordRes?.isNewBest);

    if (this.resultsCardEl) {
      this.resultsCardEl.innerHTML = `
        ${isNewBest ? '<span class="minigame-new-best">🏆 NEW HIGH SCORE!</span>' : ''}
        <h3>✨ Sky-Hop Flight Complete!</h3>
        <div class="minigame-results-stats">
          <span>⭐ Score: <strong>${this.score}</strong></span>
          <span>🌊 Wave: <strong>${this.wave}</strong></span>
          <span>💫 Stars: <strong>${this.starsCollected}</strong></span>
          <span>🏆 Best: <strong>${highScore}</strong></span>
        </div>
        <div class="minigame-results-rewards">
          ${rewardChips.map((c) => `<span class="quest-reward-chip">${c}</span>`).join('')}
        </div>
      `;
    }
    if (this.resultsEl) {
      this.resultsEl.hidden = false;
    }

    this.audio?.playArcadeUnlockFanfare?.();
    this.onRewardsEarned?.(rewards, recordRes);
    this.onCelebrate?.({
      icon: '🕹️',
      title: isNewBest ? 'NEW SKY-HOP RECORD!' : 'SKY-HOP REWARDS EARNED!',
      subtitle: rewardChips.join(' • '),
      tone: 'arcade',
    });

    return { score: this.score, wave: this.wave, stars: this.starsCollected, rewards, recordRes };
  }

  syncHud() {
    const profile = this.storage?.getActiveProfile?.();
    const best = Math.max(this.score, Number(profile?.arcade?.highScore) || 0);
    if (this.hudScoreEl) this.hudScoreEl.textContent = `⭐ ${this.score}`;
    if (this.hudWaveEl) this.hudWaveEl.textContent = `🌊 Wave ${this.wave}`;
    if (this.hudHeartsEl) {
      const full = '❤️'.repeat(Math.max(0, this.hearts));
      const empty = '🖤'.repeat(Math.max(0, MAX_HEARTS - this.hearts));
      this.hudHeartsEl.textContent = `${full}${empty}`;
    }
    if (this.hudComboEl) this.hudComboEl.textContent = `🔥 x${this.combo}`;
    if (this.hudBestEl) this.hudBestEl.textContent = `🏆 Best ${best}`;

    if (this.pauseBtn) {
      this.pauseBtn.disabled = this.runEnded;
      this.pauseBtn.textContent = this.paused ? '▶️' : '⏸️';
      this.pauseBtn.setAttribute('aria-label', this.paused ? 'Resume Arcade' : 'Pause Arcade');
      this.pauseBtn.setAttribute('aria-pressed', this.paused ? 'true' : 'false');
      this.pauseBtn.classList.toggle('is-paused', this.paused);
    }

    if (this.dashBtn) {
      const dashing = this.dashTimer > 0;
      const cooling = this.dashCooldown > 0 && !dashing;
      this.dashBtn.classList.toggle('is-dashing', dashing);
      this.dashBtn.disabled = this.runEnded || this.paused || dashing || cooling;
      this.dashBtn.textContent = dashing
        ? '⚡ Star Dashing!'
        : cooling
          ? `⏳ Dash ${Math.ceil(this.dashCooldown)}s`
          : '⚡ Star Dash';
    }
  }

  render(nowMs = 0) {
    const ctx = this.ctx;
    if (!ctx) return;

    const sky = this.getSkyTheme(this.wave);
    ctx.save();
    if (this.shakeTimer > 0) {
      const mag = 5 * (this.shakeTimer / 0.28);
      ctx.translate((Math.random() - 0.5) * mag * 2, (Math.random() - 0.5) * mag * 2);
    }

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, sky.top);
    grad.addColorStop(0.55, sky.mid);
    grad.addColorStop(1, sky.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Twinkling stars
    for (const s of this.bgStars) {
      const alpha = 0.35 + 0.55 * Math.abs(Math.sin(s.twinkle));
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Soft parallax hills along bottom
    ctx.fillStyle = 'rgba(15, 23, 42, 0.38)';
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_H);
    for (let x = 0; x <= CANVAS_W; x += 38) {
      const hillY = CANVAS_H - 36 - Math.sin((x + nowMs * 0.05) * 0.015) * 16;
      ctx.lineTo(x, hillY);
    }
    ctx.lineTo(CANVAS_W, CANVAS_H);
    ctx.closePath();
    ctx.fill();

    // Particles (starlight trail & bursts)
    for (const p of this.particles) {
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - p.life / (p.maxLife * 1.4)), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Entities
    for (const ent of this.entities) {
      if (ent.kind === 'cloud') {
        ctx.save();
        ctx.translate(ent.x, ent.y);
        ctx.fillStyle = 'rgba(49, 46, 129, 0.92)';
        ctx.beginPath();
        ctx.arc(-10, 4, 14, 0, Math.PI * 2);
        ctx.arc(10, 4, 14, 0, Math.PI * 2);
        ctx.arc(0, -6, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', 0, 3);
        ctx.restore();
      } else if (ent.kind === 'heart') {
        ctx.save();
        ctx.translate(ent.x, ent.y);
        ctx.fillStyle = '#f472b6';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💖', 0, 0);
        ctx.restore();
      } else {
        const isBig = ent.kind === 'bigstar';
        const isComet = ent.kind === 'comet';
        ctx.save();
        ctx.translate(ent.x, ent.y);
        ctx.rotate(ent.age * (isComet ? 4 : 2));
        ctx.fillStyle = isComet ? '#67e8f9' : isBig ? '#facc15' : '#fef08a';
        ctx.shadowColor = isComet ? '#38bdf8' : '#fde047';
        ctx.shadowBlur = isBig || isComet ? 14 : 8;
        this._drawStarPath(ctx, 0, 0, isBig ? 17 : isComet ? 15 : 12, isBig ? 8 : 6, 5);
        ctx.fill();
        ctx.restore();
      }
    }

    // Player Lead Pokémon
    ctx.save();
    ctx.translate(PLAYER_X, this.playerY);
    const tilt = Math.max(-0.28, Math.min(0.28, this.playerVy / 900));
    ctx.rotate(tilt);

    if (this.hitInvulnTimer > 0 && Math.floor(this.hitInvulnTimer * 14) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    // Type-colored Starlight Shield / Dash Halo
    const auraColor = this.dashTimer > 0 ? '#fde047' : (this.leadTypeInfo?.color || '#38bdf8');
    ctx.beginPath();
    ctx.arc(0, 0, this.dashTimer > 0 ? 34 : 28, 0, Math.PI * 2);
    ctx.fillStyle = this.dashTimer > 0 ? 'rgba(250, 204, 21, 0.28)' : 'rgba(56, 189, 248, 0.14)';
    ctx.fill();
    ctx.lineWidth = this.dashTimer > 0 ? 3 : 2;
    ctx.strokeStyle = auraColor;
    ctx.stroke();

    const img = this.playerSpriteImg;
    let drewSprite = false;
    if (img && img.complete && img.naturalWidth > 0) {
      try {
        ctx.drawImage(img, -28, -28, 56, 56);
        drewSprite = true;
      } catch {
        drewSprite = false;
      }
    }
    if (!drewSprite) {
      this._drawPartnerOrb(ctx);
    }
    ctx.restore();

    // Sky Biome Pill + Wave Callout
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.strokeStyle = sky.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(12, 12, 224, 28, 14);
    } else {
      ctx.rect(12, 12, 224, 28);
    }
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🌌 ${sky.name}`, 24, 26);

    if (this.waveBannerTimer > 0 && this.currentWave) {
      ctx.globalAlpha = Math.min(1, this.waveBannerTimer);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.fillRect(CANVAS_W / 2 - 150, 14, 300, 32);
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Wave ${this.wave}: ${this.currentWave.name}`, CANVAS_W / 2, 30);
    }
    ctx.restore();

    if (this.paused && !this.runEnded) {
      this._drawPauseOverlay(ctx);
    }

    ctx.restore();
  }

  _drawPartnerOrb(ctx) {
    const typeColor = this.leadTypeInfo?.color || '#38bdf8';

    // Golden protective ring around the fallback Partner Orb
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#fde047';
    ctx.stroke();

    // Type-colored Starlight Partner Orb
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    if (typeof ctx.createRadialGradient === 'function') {
      const orbGrad = ctx.createRadialGradient(-5, -5, 3, 0, 0, 18);
      orbGrad.addColorStop(0, '#ffffff');
      orbGrad.addColorStop(0.38, typeColor);
      orbGrad.addColorStop(1, typeColor);
      ctx.fillStyle = orbGrad;
    } else {
      ctx.fillStyle = typeColor;
    }
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.stroke();

    // Crisp centered type icon
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(15, 23, 42, 0.85)';
    ctx.shadowBlur = 4;
    ctx.fillText(this.leadTypeInfo?.icon || '⭐', 0, 1);
  }

  _drawPauseOverlay(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(7, 11, 20, 0.58)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const cardW = 290;
    const cardH = 92;
    const cardX = (CANVAS_W - cardW) / 2;
    const cardY = (CANVAS_H - cardH) / 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(cardX, cardY, cardW, cardH, 16);
    } else {
      ctx.rect(cardX, cardY, cardW, cardH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('⏸️ PAUSED', CANVAS_W / 2, cardY + 34);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('Tap ▶️ or press P to resume flight', CANVAS_W / 2, cardY + 64);
    ctx.restore();
  }

  _drawStarPath(ctx, cx, cy, outerR, innerR, points = 5) {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / points;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < points; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.closePath();
  }

  _startLoop() {
    this._stopLoop();
    if (this.paused || !this._open || this.runEnded) return;
    if (typeof requestAnimationFrame !== 'function') return;
    this.lastFrameMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const tick = (now) => {
      if (!this._open || this.runEnded || this.paused) {
        this.rafId = null;
        return;
      }
      const dt = (now - this.lastFrameMs) / 1000;
      this.lastFrameMs = now;
      this.update(dt);
      this.render(now);
      if (this._open && !this.runEnded && !this.paused) {
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.rafId = null;
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  _stopLoop() {
    if (this.rafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.rafId);
    }
    this.rafId = null;
  }

  getDiagnostics() {
    return {
      open: this.isOpen(),
      paused: Boolean(this.paused),
      rafActive: this.rafId !== null,
      waveDeckRemaining: this.waveDeck.length,
      lastWaveId: this.lastWaveId,
      score: this.score,
      wave: this.wave,
      hearts: this.hearts,
      combo: this.combo,
    };
  }
}
