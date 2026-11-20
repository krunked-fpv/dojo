// 100% Procedural Web Audio API Chiptune Synthesizer (Zero external audio assets)

const THEMES = {
  title: {
    stepSec: 0.22,
    melody: [
      523.25, 659.25, 783.99, 1046.5, 987.77, 783.99, 659.25, 523.25,
      587.33, 698.46, 880.0, 1046.5, 987.77, 880.0, 783.99, 659.25,
    ],
    bass: [
      130.81, 0, 196.0, 0, 164.81, 0, 196.0, 0,
      174.61, 0, 220.0, 0, 196.0, 0, 246.94, 0,
    ],
    leadGain: 0.085,
    bassGain: 0.14,
  },
  overworld: {
    stepSec: 0.165,
    melody: [
      523.25, 0, 659.25, 783.99, 659.25, 0, 587.33, 659.25,
      783.99, 880.0, 783.99, 659.25, 587.33, 0, 523.25, 0,
      587.33, 0, 698.46, 880.0, 783.99, 0, 659.25, 587.33,
      523.25, 659.25, 783.99, 659.25, 523.25, 0, 392.0, 0,
    ],
    bass: [
      130.81, 130.81, 196.0, 130.81, 164.81, 164.81, 196.0, 164.81,
      174.61, 174.61, 220.0, 174.61, 196.0, 196.0, 246.94, 196.0,
      146.83, 146.83, 220.0, 146.83, 196.0, 196.0, 246.94, 196.0,
      130.81, 164.81, 196.0, 164.81, 130.81, 0, 196.0, 0,
    ],
    leadGain: 0.08,
    bassGain: 0.13,
  },
  battle: {
    stepSec: 0.125,
    melody: [
      659.25, 659.25, 0, 783.99, 698.46, 659.25, 587.33, 659.25,
      880.0, 0, 783.99, 698.46, 659.25, 587.33, 523.25, 587.33,
      659.25, 783.99, 880.0, 0, 987.77, 880.0, 783.99, 698.46,
      783.99, 659.25, 587.33, 659.25, 523.25, 0, 493.88, 0,
    ],
    bass: [
      164.81, 164.81, 329.63, 164.81, 164.81, 164.81, 329.63, 196.0,
      174.61, 174.61, 349.23, 174.61, 146.83, 146.83, 293.66, 146.83,
      164.81, 164.81, 329.63, 164.81, 196.0, 196.0, 392.0, 196.0,
      146.83, 196.0, 220.0, 196.0, 164.81, 0, 146.83, 0,
    ],
    leadGain: 0.095,
    bassGain: 0.15,
  },
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.noiseBuffer = null;
    this.muted = false;
    this.unlocked = false;

    this.currentTheme = null;
    this.schedulerTimer = null;
    this.nextStepTime = 0;
    this.stepIndex = 0;

    this._boundUnlock = () => this.unlock();
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', this._boundUnlock, { capture: true, passive: true });
      window.addEventListener('touchstart', this._boundUnlock, { capture: true, passive: true });
      window.addEventListener('keydown', this._boundUnlock, { capture: true, passive: true });
    }
  }

  ensureContext() {
    if (this.ctx) return this.ctx;
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.28;
    this.masterGain.connect(this.ctx.destination);
    this.noiseBuffer = this.buildNoiseBuffer(this.ctx);
    return this.ctx;
  }

  buildNoiseBuffer(ctx) {
    const length = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  unlock() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        this.unlocked = true;
        if (this.currentTheme && !this.schedulerTimer && !this.muted) {
          this.startScheduler();
        }
      }).catch(() => {});
    } else {
      this.unlocked = true;
      if (this.currentTheme && !this.schedulerTimer && !this.muted) {
        this.startScheduler();
      }
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.28, now, 0.02);
    }
    if (this.muted) {
      this.stopScheduler();
    } else if (this.currentTheme && this.ctx && this.ctx.state === 'running') {
      this.startScheduler();
    }
  }

  isMuted() {
    return this.muted;
  }

  playTone({ freq, endFreq = null, type = 'square', duration = 0.12, gain = 0.14, delay = 0 }) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;

    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), start);
    if (endFreq !== null && endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + duration);
    }

    env.gain.setValueAtTime(0.0001, start);
    env.gain.linearRampToValueAtTime(gain, start + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(env);
    env.connect(this.masterGain);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  playNoise({ duration = 0.14, gain = 0.22, filterType = 'bandpass', startFreq = 1200, endFreq = 300, delay = 0 }) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running' || !this.noiseBuffer) return;

    const start = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(Math.max(40, startFreq), start);
    if (endFreq !== startFreq) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), start + duration);
    }

    const env = ctx.createGain();
    env.gain.setValueAtTime(Math.max(0.0001, gain), start);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    src.connect(filter);
    filter.connect(env);
    env.connect(this.masterGain);

    src.start(start);
    src.stop(start + duration + 0.02);
  }

  playBGM(theme) {
    if (!THEMES[theme]) return;
    if (this.currentTheme === theme && this.schedulerTimer) return;
    this.currentTheme = theme;
    this.stepIndex = 0;

    const ctx = this.ensureContext();
    if (!ctx || this.muted || ctx.state !== 'running') return;
    this.startScheduler();
  }

  stopBGM() {
    this.currentTheme = null;
    this.stopScheduler();
  }

  stopScheduler() {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  startScheduler() {
    this.stopScheduler();
    const ctx = this.ensureContext();
    if (!ctx || !this.currentTheme) return;

    this.nextStepTime = ctx.currentTime + 0.05;
    this.schedulerTimer = setInterval(() => this.scheduleAhead(), 90);
  }

  scheduleAhead() {
    if (this.muted || !this.currentTheme || !this.ctx || this.ctx.state !== 'running') return;
    const theme = THEMES[this.currentTheme];
    if (!theme) return;

    while (this.nextStepTime < this.ctx.currentTime + 0.22) {
      const idx = this.stepIndex % theme.melody.length;
      const melFreq = theme.melody[idx];
      const bassFreq = theme.bass[idx];
      const stepDur = theme.stepSec;

      if (melFreq > 0) {
        this.scheduleNote(melFreq, 'square', this.nextStepTime, stepDur * 0.78, theme.leadGain);
      }
      if (bassFreq > 0) {
        this.scheduleNote(bassFreq, 'triangle', this.nextStepTime, stepDur * 0.85, theme.bassGain);
      }
      if (this.currentTheme === 'battle' && idx % 2 === 1) {
        this.scheduleHat(this.nextStepTime, idx % 4 === 3 ? 0.05 : 0.028);
      } else if (this.currentTheme === 'overworld' && idx % 4 === 2) {
        this.scheduleHat(this.nextStepTime, 0.02);
      }

      this.nextStepTime += stepDur;
      this.stepIndex += 1;
    }
  }

  scheduleNote(freq, wave, startTime, duration, peakGain) {
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, startTime);

    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(peakGain, startTime + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(env);
    env.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  scheduleHat(startTime, peakGain) {
    if (!this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(5200, startTime);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(peakGain, startTime);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.035);

    src.connect(filter);
    filter.connect(env);
    env.connect(this.masterGain);
    src.start(startTime);
    src.stop(startTime + 0.045);
  }

  // --- Sound Effects ---

  playMenuBlip(pitch = 660) {
    this.playTone({ freq: pitch, endFreq: pitch * 1.18, type: 'square', duration: 0.06, gain: 0.09 });
  }

  playEncounterAlert() {
    const notes = [440, 587.33, 880, 1174.66];
    notes.forEach((n, i) => {
      this.playTone({ freq: n, type: 'square', duration: 0.07, gain: 0.13, delay: i * 0.055 });
    });
  }

  playTackle() {
    this.playNoise({ duration: 0.13, gain: 0.28, filterType: 'lowpass', startFreq: 1600, endFreq: 180 });
    this.playTone({ freq: 185, endFreq: 55, type: 'triangle', duration: 0.13, gain: 0.26 });
  }

  playElemental(type) {
    switch (type) {
      case 'electric':
        this.playTone({ freq: 980, endFreq: 1760, type: 'square', duration: 0.08, gain: 0.14, delay: 0 });
        this.playTone({ freq: 1520, endFreq: 680, type: 'square', duration: 0.09, gain: 0.13, delay: 0.07 });
        this.playTone({ freq: 1840, endFreq: 1020, type: 'square', duration: 0.11, gain: 0.12, delay: 0.15 });
        break;
      case 'fire':
        this.playNoise({ duration: 0.26, gain: 0.28, filterType: 'bandpass', startFreq: 380, endFreq: 1900 });
        this.playTone({ freq: 240, endFreq: 110, type: 'sawtooth', duration: 0.22, gain: 0.12 });
        break;
      case 'water':
        this.playNoise({ duration: 0.22, gain: 0.22, filterType: 'bandpass', startFreq: 1500, endFreq: 420 });
        this.playTone({ freq: 440, endFreq: 780, type: 'sine', duration: 0.1, gain: 0.14, delay: 0.02 });
        this.playTone({ freq: 520, endFreq: 960, type: 'sine', duration: 0.1, gain: 0.13, delay: 0.11 });
        break;
      case 'grass':
        [520, 680, 880].forEach((f, i) => {
          this.playTone({ freq: f, endFreq: f * 1.45, type: 'triangle', duration: 0.07, gain: 0.16, delay: i * 0.055 });
        });
        break;
      case 'rock':
        this.playNoise({ duration: 0.22, gain: 0.3, filterType: 'lowpass', startFreq: 900, endFreq: 130 });
        this.playTone({ freq: 150, endFreq: 48, type: 'square', duration: 0.18, gain: 0.16 });
        break;
      case 'psychic':
        this.playTone({ freq: 580, endFreq: 1180, type: 'sine', duration: 0.2, gain: 0.14, delay: 0 });
        this.playTone({ freq: 620, endFreq: 1240, type: 'triangle', duration: 0.2, gain: 0.1, delay: 0.04 });
        break;
      case 'heal':
        this.playHealChime();
        break;
      default:
        this.playTackle();
        break;
    }
  }

  playPokeballThrow() {
    this.playTone({ freq: 380, endFreq: 940, type: 'sine', duration: 0.18, gain: 0.16 });
    this.playTone({ freq: 720, endFreq: 480, type: 'square', duration: 0.06, gain: 0.09, delay: 0.2 });
  }

  playPokeballWobble(step = 1) {
    const base = 360 - step * 28;
    this.playTone({ freq: base, endFreq: base * 0.65, type: 'square', duration: 0.08, gain: 0.11 });
    this.playTone({ freq: base * 1.25, endFreq: base * 0.85, type: 'triangle', duration: 0.07, gain: 0.1, delay: 0.06 });
  }

  playBreakout() {
    this.playNoise({ duration: 0.14, gain: 0.22, filterType: 'highpass', startFreq: 1100, endFreq: 2600 });
    this.playTone({ freq: 520, endFreq: 220, type: 'square', duration: 0.16, gain: 0.12 });
  }

  playCaptureSuccess() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this.playTone({
        freq: n,
        type: 'square',
        duration: i === notes.length - 1 ? 0.36 : 0.11,
        gain: 0.13,
        delay: i * 0.11,
      });
    });
    this.playTone({ freq: 523.25, type: 'triangle', duration: 0.38, gain: 0.14, delay: 0.33 });
  }

  playLevelUp() {
    const notes = [587.33, 739.99, 880.0, 1174.66];
    notes.forEach((n, i) => {
      this.playTone({
        freq: n,
        type: 'square',
        duration: i === notes.length - 1 ? 0.32 : 0.09,
        gain: 0.12,
        delay: i * 0.09,
      });
    });
  }

  playHealChime() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this.playTone({ freq: n, type: 'sine', duration: 0.18, gain: 0.16, delay: i * 0.09 });
    });
  }

  playBadgeFanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((n, i) => {
      this.playTone({
        freq: n,
        type: 'square',
        duration: i === notes.length - 1 ? 0.42 : 0.1,
        gain: 0.14,
        delay: i * 0.095,
      });
    });
  }

  playHoldTick(progress) {
    const freq = 320 + Math.round(progress * 560);
    this.playTone({ freq, type: 'sine', duration: 0.05, gain: 0.08 });
  }
}

export const audio = new AudioEngine();
