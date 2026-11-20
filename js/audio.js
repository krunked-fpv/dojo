// Warm Handheld Procedural Web Audio Engine (Master Low-Pass, ADSR Envelopes, Zero External Assets)

export const THEMES = {
  title: {
    stepSec: 0.22,
    melody: [
      523.25, 0, 659.25, 783.99, 1046.5, 0, 987.77, 783.99,
      587.33, 0, 698.46, 880.0, 1046.5, 987.77, 880.0, 659.25,
    ],
    arp: [
      261.63, 329.63, 392.0, 523.25, 329.63, 392.0, 493.88, 392.0,
      293.66, 349.23, 440.0, 587.33, 246.94, 392.0, 493.88, 392.0,
    ],
    bass: [
      130.81, 0, 196.0, 0, 164.81, 0, 196.0, 0,
      174.61, 0, 220.0, 0, 196.0, 0, 146.83, 0,
    ],
    leadGain: 0.058,
    arpGain: 0.042,
    bassGain: 0.095,
  },
  overworld: {
    stepSec: 0.175,
    melody: [
      523.25, 0, 659.25, 783.99, 659.25, 0, 587.33, 659.25,
      783.99, 880.0, 783.99, 659.25, 587.33, 0, 523.25, 0,
      587.33, 0, 698.46, 880.0, 783.99, 0, 659.25, 587.33,
      523.25, 659.25, 783.99, 659.25, 523.25, 0, 392.0, 0,
    ],
    arp: [
      261.63, 329.63, 392.0, 329.63, 261.63, 329.63, 392.0, 329.63,
      293.66, 349.23, 440.0, 349.23, 246.94, 293.66, 392.0, 293.66,
      293.66, 349.23, 440.0, 349.23, 246.94, 329.63, 392.0, 329.63,
      261.63, 329.63, 392.0, 329.63, 261.63, 392.0, 246.94, 196.0,
    ],
    bass: [
      130.81, 0, 196.0, 130.81, 164.81, 0, 196.0, 164.81,
      174.61, 0, 220.0, 174.61, 196.0, 0, 246.94, 196.0,
      146.83, 0, 220.0, 146.83, 196.0, 0, 246.94, 196.0,
      130.81, 164.81, 196.0, 164.81, 130.81, 0, 196.0, 0,
    ],
    leadGain: 0.055,
    arpGain: 0.04,
    bassGain: 0.095,
  },
  battle: {
    stepSec: 0.135,
    melody: [
      659.25, 659.25, 0, 783.99, 698.46, 659.25, 587.33, 659.25,
      880.0, 0, 783.99, 698.46, 659.25, 587.33, 523.25, 587.33,
      659.25, 783.99, 880.0, 0, 987.77, 880.0, 783.99, 698.46,
      783.99, 659.25, 587.33, 659.25, 523.25, 0, 493.88, 0,
    ],
    arp: [
      329.63, 392.0, 493.88, 392.0, 329.63, 392.0, 493.88, 392.0,
      349.23, 440.0, 523.25, 440.0, 293.66, 349.23, 440.0, 349.23,
      329.63, 392.0, 493.88, 392.0, 392.0, 493.88, 587.33, 493.88,
      293.66, 349.23, 440.0, 392.0, 329.63, 392.0, 293.66, 349.23,
    ],
    bass: [
      164.81, 0, 246.94, 164.81, 164.81, 0, 246.94, 196.0,
      174.61, 0, 261.63, 174.61, 146.83, 0, 220.0, 146.83,
      164.81, 0, 246.94, 164.81, 196.0, 0, 293.66, 196.0,
      146.83, 196.0, 220.0, 196.0, 164.81, 0, 146.83, 0,
    ],
    leadGain: 0.062,
    arpGain: 0.046,
    bassGain: 0.105,
  },
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterFilter = null;
    this.masterGain = null;
    this.warmPulseWave = null;
    this.noiseBuffer = null;
    this.muted = false;
    this.unlocked = false;

    this.currentTheme = null;
    this.schedulerTimer = null;
    this.nextStepTime = 0;
    this.stepIndex = 0;

    this._boundUnlock = () => this.unlock();
    if (typeof window !== 'undefined') {
      const opts = { capture: true, passive: true };
      window.addEventListener('pointerdown', this._boundUnlock, opts);
      window.addEventListener('pointerup', this._boundUnlock, opts);
      window.addEventListener('touchstart', this._boundUnlock, opts);
      window.addEventListener('touchend', this._boundUnlock, opts);
      window.addEventListener('keydown', this._boundUnlock, opts);
      window.addEventListener('click', this._boundUnlock, opts);
    }
  }

  buildWarmPulseWave(ctx) {
    if (typeof ctx.createPeriodicWave !== 'function') return null;
    try {
      const harmonics = 10;
      const real = new Float32Array(harmonics + 1);
      const imag = new Float32Array(harmonics + 1);
      // Warm 25%-ish duty-style band-limited pulse with rolled-off upper harmonics
      for (let n = 1; n <= harmonics; n++) {
        const rolloff = 1 / (n * (1 + n * 0.18));
        imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * 0.28) * rolloff * 2.2;
      }
      return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    } catch {
      return null;
    }
  }

  ensureContext() {
    if (this.ctx) return this.ctx;
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    try {
      this.ctx = new AudioCtx();
      this.masterFilter = this.ctx.createBiquadFilter();
      this.masterFilter.type = 'lowpass';
      this.masterFilter.frequency.value = 1120;
      this.masterFilter.Q.value = 0.72;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.32;

      this.masterFilter.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.warmPulseWave = this.buildWarmPulseWave(this.ctx);
      this.noiseBuffer = this.buildNoiseBuffer(this.ctx);
      return this.ctx;
    } catch {
      this.ctx = null;
      this.masterFilter = null;
      this.masterGain = null;
      return null;
    }
  }

  buildNoiseBuffer(ctx) {
    const length = Math.max(1, Math.floor(ctx.sampleRate));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  unlock() {
    const ctx = this.ensureContext();
    if (!ctx) return Promise.resolve(false);

    const onReady = () => {
      this.unlocked = ctx.state === 'running';
      if (this.unlocked && this.currentTheme && !this.schedulerTimer && !this.muted) {
        this.startScheduler();
      }
      return this.unlocked;
    };

    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      try {
        return Promise.resolve(ctx.resume()).then(onReady).catch(() => false);
      } catch {
        return Promise.resolve(false);
      }
    }
    return Promise.resolve(onReady());
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.32, now, 0.02);
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

  triggerVoice({
    freq,
    endFreq = null,
    midFreq = null,
    wave = 'triangle',
    useWarmPulse = false,
    attack = 0.008,
    decay = 0.05,
    sustain = 0.36,
    duration = 0.14,
    gain = 0.12,
    delay = 0,
    startTime = null,
  }) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterFilter || ctx.state !== 'running') return;

    const dur = Math.max(0.03, duration);
    const start = startTime !== null ? startTime : ctx.currentTime + Math.max(0, delay);
    const atk = Math.min(dur * 0.45, Math.max(0.004, attack));
    const decEnd = Math.min(dur * 0.8, atk + Math.max(0.01, decay));
    const peakGain = Math.max(0.001, gain);
    const sustainGain = Math.max(0.0001, peakGain * Math.max(0.05, Math.min(0.95, sustain)));

    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    if (useWarmPulse && this.warmPulseWave) {
      osc.setPeriodicWave(this.warmPulseWave);
    } else {
      osc.type = wave === 'square' ? 'triangle' : wave;
    }

    const startHz = Math.max(20, freq);
    osc.frequency.setValueAtTime(startHz, start);
    if (midFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, midFreq), start + dur * 0.45);
    }
    if (endFreq !== null && endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + dur);
    }

    env.gain.setValueAtTime(0.0001, start);
    env.gain.linearRampToValueAtTime(peakGain, start + atk);
    if (decEnd > atk && decEnd < dur) {
      env.gain.exponentialRampToValueAtTime(sustainGain, start + decEnd);
    }
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    osc.connect(env);
    env.connect(this.masterFilter);
    osc.start(start);
    osc.stop(start + dur + 0.025);
  }

  playTone(opts) {
    this.triggerVoice({
      wave: opts.type === 'square' ? 'triangle' : (opts.type || 'triangle'),
      useWarmPulse: opts.type === 'square',
      ...opts,
    });
  }

  playNoise({
    duration = 0.14,
    gain = 0.18,
    filterType = 'lowpass',
    startFreq = 820,
    endFreq = 180,
    q = 1.0,
    attack = 0.006,
    delay = 0,
  }) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterFilter || ctx.state !== 'running' || !this.noiseBuffer) return;

    const dur = Math.max(0.03, duration);
    const start = ctx.currentTime + Math.max(0, delay);
    const atk = Math.min(dur * 0.35, Math.max(0.003, attack));

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(Math.max(40, startFreq), start);
    if (endFreq !== startFreq) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), start + dur);
    }

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.linearRampToValueAtTime(Math.max(0.001, gain), start + atk);
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    src.connect(filter);
    filter.connect(env);
    env.connect(this.masterFilter);

    src.start(start);
    src.stop(start + dur + 0.025);
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
    this.schedulerTimer = setInterval(() => this.scheduleAhead(), 85);
  }

  scheduleAhead() {
    if (this.muted || !this.currentTheme || !this.ctx || this.ctx.state !== 'running') return;
    const theme = THEMES[this.currentTheme];
    if (!theme) return;

    while (this.nextStepTime < this.ctx.currentTime + 0.24) {
      const idx = this.stepIndex % theme.melody.length;
      const melFreq = theme.melody[idx];
      const arpFreq = theme.arp ? theme.arp[idx % theme.arp.length] : 0;
      const bassFreq = theme.bass[idx % theme.bass.length];
      const stepDur = theme.stepSec;

      if (melFreq > 0) {
        this.triggerVoice({
          freq: melFreq,
          useWarmPulse: true,
          wave: 'triangle',
          startTime: this.nextStepTime,
          duration: stepDur * 0.82,
          attack: 0.01,
          decay: 0.045,
          sustain: 0.42,
          gain: Math.min(0.12, theme.leadGain),
        });
      }
      if (arpFreq > 0) {
        this.triggerVoice({
          freq: arpFreq,
          wave: 'sine',
          startTime: this.nextStepTime,
          duration: stepDur * 0.72,
          attack: 0.008,
          decay: 0.04,
          sustain: 0.3,
          gain: Math.min(0.12, theme.arpGain),
        });
      }
      if (bassFreq > 0) {
        this.triggerVoice({
          freq: bassFreq,
          wave: 'triangle',
          startTime: this.nextStepTime,
          duration: stepDur * 0.88,
          attack: 0.008,
          decay: 0.05,
          sustain: 0.5,
          gain: Math.min(0.12, theme.bassGain),
        });
      }

      this.nextStepTime += stepDur;
      this.stepIndex += 1;
    }
  }

  // --- Sound Effects ---

  playMenuBlip(pitch = 620) {
    this.triggerVoice({
      freq: pitch,
      endFreq: pitch * 1.15,
      wave: 'triangle',
      duration: 0.07,
      attack: 0.005,
      sustain: 0.25,
      gain: 0.085,
    });
  }

  playEncounterAlert() {
    const notes = [392.0, 523.25, 659.25, 783.99];
    notes.forEach((n, i) => {
      this.triggerVoice({
        freq: n,
        useWarmPulse: true,
        wave: 'triangle',
        duration: 0.09,
        gain: 0.11,
        delay: i * 0.055,
      });
    });
  }

  playPhysicalImpact(power = 45) {
    const boost = Math.min(1.25, Math.max(0.85, power / 50));
    // Tactile downward pitch thud (110Hz -> 20Hz) + low-passed noise burst
    this.triggerVoice({
      freq: 110,
      endFreq: 20,
      wave: 'triangle',
      duration: 0.16,
      attack: 0.004,
      decay: 0.06,
      sustain: 0.2,
      gain: 0.24 * boost,
    });
    this.triggerVoice({
      freq: 92,
      endFreq: 20,
      wave: 'sine',
      duration: 0.14,
      attack: 0.004,
      sustain: 0.25,
      gain: 0.18 * boost,
    });
    this.playNoise({
      duration: 0.13,
      gain: 0.22 * boost,
      filterType: 'lowpass',
      startFreq: 780,
      endFreq: 130,
      q: 0.9,
    });
  }

  playTackle() {
    this.playPhysicalImpact(42);
  }

  playElemental(type, moveId = '') {
    if (moveId === 'tackle' || moveId === 'quick_attack') {
      this.playPhysicalImpact(moveId === 'quick_attack' ? 50 : 42);
      return;
    }

    switch (type) {
      case 'fire':
        this.triggerVoice({
          freq: 250,
          endFreq: 88,
          wave: 'triangle',
          duration: 0.24,
          gain: 0.14,
        });
        [0, 0.05, 0.1, 0.16].forEach((d, idx) => {
          this.playNoise({
            duration: 0.09,
            gain: 0.15 - idx * 0.018,
            filterType: 'bandpass',
            startFreq: 420 + idx * 140,
            endFreq: 1050,
            q: 1.6,
            delay: d,
          });
        });
        break;

      case 'water':
        this.playNoise({
          duration: 0.22,
          gain: 0.14,
          filterType: 'lowpass',
          startFreq: 980,
          endFreq: 320,
        });
        [
          [310, 690, 0],
          [410, 830, 0.06],
          [520, 940, 0.12],
        ].forEach(([f1, f2, d]) => {
          this.triggerVoice({
            freq: f1,
            endFreq: f2,
            wave: 'sine',
            duration: 0.11,
            gain: 0.12,
            delay: d,
          });
        });
        break;

      case 'grass':
        [523.25, 659.25, 783.99, 987.77].forEach((f, i) => {
          this.triggerVoice({
            freq: f,
            endFreq: f * 1.12,
            wave: 'triangle',
            duration: 0.1,
            gain: 0.11,
            delay: i * 0.048,
          });
        });
        this.playNoise({
          duration: 0.16,
          gain: 0.1,
          filterType: 'bandpass',
          startFreq: 950,
          endFreq: 480,
          q: 1.4,
        });
        break;

      case 'electric':
        this.triggerVoice({
          freq: 880,
          endFreq: 420,
          useWarmPulse: true,
          wave: 'triangle',
          duration: 0.1,
          gain: 0.1,
          delay: 0,
        });
        this.triggerVoice({
          freq: 1046.5,
          endFreq: 523.25,
          wave: 'triangle',
          duration: 0.12,
          gain: 0.11,
          delay: 0.065,
        });
        this.playNoise({
          duration: 0.12,
          gain: 0.11,
          filterType: 'bandpass',
          startFreq: 980,
          endFreq: 620,
          q: 2.0,
          delay: 0.02,
        });
        break;

      case 'rock':
        this.triggerVoice({
          freq: 105,
          endFreq: 20,
          wave: 'triangle',
          duration: 0.2,
          gain: 0.22,
        });
        this.playNoise({
          duration: 0.2,
          gain: 0.22,
          filterType: 'lowpass',
          startFreq: 620,
          endFreq: 110,
        });
        break;

      case 'psychic':
      case 'star':
        this.triggerVoice({
          freq: 440,
          endFreq: 880,
          wave: 'sine',
          duration: 0.22,
          gain: 0.12,
          delay: 0,
        });
        this.triggerVoice({
          freq: 659.25,
          endFreq: 987.77,
          wave: 'triangle',
          duration: 0.22,
          gain: 0.09,
          delay: 0.04,
        });
        break;

      case 'wind':
        this.playNoise({
          duration: 0.22,
          gain: 0.16,
          filterType: 'bandpass',
          startFreq: 380,
          endFreq: 980,
          q: 1.8,
        });
        this.triggerVoice({
          freq: 493.88,
          endFreq: 739.99,
          wave: 'triangle',
          duration: 0.16,
          gain: 0.09,
        });
        break;

      case 'heal':
        this.playHealChime();
        break;

      default:
        this.playPhysicalImpact(45);
        break;
    }
  }

  playPokeballThrow() {
    this.triggerVoice({
      freq: 300,
      endFreq: 720,
      wave: 'sine',
      duration: 0.18,
      gain: 0.13,
    });
    this.triggerVoice({
      freq: 450,
      endFreq: 880,
      wave: 'triangle',
      duration: 0.14,
      gain: 0.07,
      delay: 0.03,
    });
  }

  playPokeballAbsorb() {
    this.triggerVoice({
      freq: 760,
      endFreq: 310,
      wave: 'triangle',
      duration: 0.22,
      gain: 0.11,
    });
    this.triggerVoice({
      freq: 520,
      endFreq: 240,
      wave: 'sine',
      duration: 0.22,
      gain: 0.1,
      delay: 0.02,
    });
  }

  playPokeballBounce(bounceIdx = 0) {
    const scale = Math.pow(0.68, Math.max(0, bounceIdx));
    // Soft metallic click + tactile shell bounce
    this.triggerVoice({
      freq: 960,
      endFreq: 410,
      wave: 'triangle',
      duration: 0.055,
      attack: 0.003,
      decay: 0.02,
      sustain: 0.2,
      gain: 0.11 * scale,
    });
    this.triggerVoice({
      freq: 165,
      endFreq: 68,
      wave: 'sine',
      duration: 0.075,
      attack: 0.003,
      gain: 0.13 * scale,
    });
    this.playNoise({
      duration: 0.04,
      gain: 0.08 * scale,
      filterType: 'bandpass',
      startFreq: 1050,
      endFreq: 680,
      q: 2.2,
    });
  }

  playPokeballWobble(step = 1) {
    const base = 240 + (step % 2) * 28;
    this.triggerVoice({
      freq: base,
      midFreq: base * 1.38,
      endFreq: base * 0.9,
      wave: 'triangle',
      duration: 0.13,
      attack: 0.008,
      sustain: 0.35,
      gain: 0.11,
    });
    this.triggerVoice({
      freq: base * 1.5,
      endFreq: base * 1.12,
      wave: 'sine',
      duration: 0.1,
      gain: 0.075,
      delay: 0.03,
    });
  }

  playBreakout() {
    this.playNoise({
      duration: 0.14,
      gain: 0.16,
      filterType: 'bandpass',
      startFreq: 980,
      endFreq: 420,
      q: 1.2,
    });
    this.triggerVoice({
      freq: 460,
      endFreq: 210,
      wave: 'triangle',
      duration: 0.18,
      gain: 0.13,
    });
  }

  playCaptureSuccess() {
    // Authentic 3-tone rising major chord lock (C5 -> E5 -> G5 -> locked C major triad)
    const lockTones = [523.25, 659.25, 783.99];
    lockTones.forEach((freq, i) => {
      this.triggerVoice({
        freq,
        wave: 'triangle',
        useWarmPulse: true,
        duration: 0.14,
        gain: 0.1,
        delay: i * 0.11,
      });
    });

    const chordDelay = 0.34;
    [261.63, 523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      this.triggerVoice({
        freq,
        wave: i === 0 ? 'triangle' : 'sine',
        useWarmPulse: i === 4,
        duration: 0.48,
        attack: 0.015,
        decay: 0.1,
        sustain: 0.55,
        gain: i === 0 ? 0.11 : 0.085,
        delay: chordDelay,
      });
    });
  }

  playLevelUp() {
    // Harmonized multi-voice major arpeggio (C-E-G-C)
    const lead = [523.25, 659.25, 783.99, 1046.5];
    const harmony = [329.63, 392.0, 523.25, 659.25];
    lead.forEach((freq, i) => {
      const isLast = i === lead.length - 1;
      const delay = i * 0.095;
      const dur = isLast ? 0.38 : 0.12;
      this.triggerVoice({
        freq,
        useWarmPulse: true,
        wave: 'triangle',
        duration: dur,
        gain: 0.1,
        delay,
      });
      this.triggerVoice({
        freq: harmony[i],
        wave: 'triangle',
        duration: dur,
        gain: 0.085,
        delay,
      });
    });
    this.triggerVoice({
      freq: 261.63,
      wave: 'triangle',
      duration: 0.42,
      gain: 0.11,
      delay: 0.285,
    });
  }

  playHealChime() {
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
    notes.forEach((n, i) => {
      this.triggerVoice({
        freq: n,
        wave: 'sine',
        duration: 0.2,
        gain: 0.12,
        delay: i * 0.085,
      });
      this.triggerVoice({
        freq: n * 0.5,
        wave: 'triangle',
        duration: 0.2,
        gain: 0.065,
        delay: i * 0.085,
      });
    });
  }

  playBadgeFanfare() {
    const lead = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    const harmony = [329.63, 392.0, 523.25, 659.25, 783.99];
    lead.forEach((freq, i) => {
      const isLast = i === lead.length - 1;
      const delay = i * 0.1;
      const dur = isLast ? 0.46 : 0.13;
      this.triggerVoice({
        freq,
        useWarmPulse: true,
        wave: 'triangle',
        duration: dur,
        gain: 0.105,
        delay,
      });
      this.triggerVoice({
        freq: harmony[i],
        wave: 'triangle',
        duration: dur,
        gain: 0.08,
        delay,
      });
    });
  }

  playHoldTick(progress) {
    const freq = 310 + Math.round(progress * 440);
    this.triggerVoice({
      freq,
      wave: 'sine',
      duration: 0.06,
      gain: 0.075,
    });
  }
}

export const audio = new AudioEngine();
