// Authentic Retro Chiptune Web Audio Engine (Lookahead Sync, Duty-Cycle Pulse Waves & Percussion)

const E2 = 82.41;
const F2 = 87.31;
const Fs2 = 92.50;
const G2 = 98.00;
const Gs2 = 103.83;
const Ab2 = 103.83;
const A2 = 110.00;
const Bb2 = 116.54;
const B1 = 61.74;
const B2 = 123.47;
const C2 = 65.41;
const D2 = 73.42;
const Ds2 = 77.78;

const C3 = 130.81;
const Cs3 = 138.59;
const D3 = 146.83;
const Ds3 = 155.56;
const E3 = 164.81;
const F3 = 174.61;
const Fs3 = 185.00;
const G3 = 196.00;
const Gs3 = 207.65;
const A3 = 220.00;
const Bb3 = 233.08;
const B3 = 246.94;

const C4 = 261.63;
const Cs4 = 277.18;
const D4 = 293.66;
const Ds4 = 311.13;
const E4 = 329.63;
const F4 = 349.23;
const Fs4 = 369.99;
const G4 = 392.00;
const Gs4 = 415.30;
const A4 = 440.00;
const Bb4 = 466.16;
const B4 = 493.88;

const C5 = 523.25;
const Cs5 = 554.37;
const D5 = 587.33;
const Ds5 = 622.25;
const E5 = 659.25;
const F5 = 698.46;
const Fs5 = 739.99;
const G5 = 783.99;
const Gs5 = 830.61;
const A5 = 880.00;
const Bb5 = 932.33;
const B5 = 987.77;
const C6 = 1046.50;
const D6 = 1174.66;
const E6 = 1318.51;

export const THEMES = {
  title: {
    stepSec: 0.195,
    leadWave: 'pulse25',
    melody: [
      E4, 0, G4, B4, E5, 0, D5, B4,
      C5, 0, B4, A4, G4, 0, Fs4, 0,
      E4, 0, G4, B4, E5, 0, Fs5, G5,
      Fs5, 0, D5, B4, E5, 0, 0, 0,
    ],
    arp: [
      B3, 0, 0, E4, 0, 0, B3, 0,
      C4, 0, 0, E4, 0, 0, D4, 0,
      B3, 0, 0, E4, 0, 0, G4, 0,
      D4, 0, B3, 0, E4, 0, 0, 0,
    ],
    bass: [
      E3, 0, B2, 0, E3, 0, G3, 0,
      C3, 0, G3, 0, B2, 0, Fs3, 0,
      E3, 0, B2, 0, E3, 0, G3, 0,
      D3, 0, B2, 0, E3, 0, B2, 0,
    ],
    drums: [
      'K', 0, 'h', 0, 'S', 0, 'h', 0,
      'K', 0, 'h', 0, 'S', 0, 'h', 'h',
    ],
    leadGain: 0.056,
    arpGain: 0.032,
    bassGain: 0.092,
    drumGain: 0.045,
  },
  overworld: {
    stepSec: 0.165,
    leadWave: 'pulse25',
    melody: [
      G4, 0, B4, D5, G5, 0, Fs5, D5,
      E5, 0, D5, C5, B4, 0, A4, 0,
      G4, 0, B4, D5, E5, 0, D5, B4,
      C5, B4, A4, G4, A4, 0, D4, 0,
      G4, 0, B4, D5, G5, 0, A5, G5,
      Fs5, 0, D5, Fs5, G5, 0, E5, 0,
      D5, 0, C5, B4, A4, 0, B4, C5,
      D5, 0, Fs4, 0, G4, 0, 0, 0,
    ],
    arp: [
      D4, 0, 0, B3, 0, 0, D4, 0,
      C4, 0, 0, E4, 0, 0, D4, 0,
      B3, 0, 0, D4, 0, 0, B3, 0,
      E4, 0, C4, 0, D4, 0, 0, 0,
    ],
    bass: [
      G3, 0, D3, 0, G3, 0, B2, 0,
      C3, 0, G3, 0, G2, 0, D3, 0,
      G3, 0, D3, 0, E3, 0, B2, 0,
      C3, 0, A2, 0, D3, 0, A2, 0,
      G3, 0, D3, 0, G3, 0, B2, 0,
      D3, 0, A2, 0, E3, 0, B2, 0,
      C3, 0, G2, 0, A2, 0, C3, 0,
      D3, 0, A2, 0, G2, 0, D3, 0,
    ],
    drums: [
      'K', 0, 'h', 0, 'S', 0, 'h', 0,
      'K', 0, 'K', 0, 'S', 0, 'h', 0,
    ],
    leadGain: 0.056,
    arpGain: 0.030,
    bassGain: 0.095,
    drumGain: 0.048,
  },
  battle: {
    // Grounded, tense Gen 1 / Gen 3 inspired E-minor battle groove (~106 BPM 16th grid, -1 = sustain tie)
    stepSec: 0.142,
    leadWave: 'pulse25',
    melody: [
      // Bar 1: Bold dramatic Em -> Bb tension intro
      E4, -1, 0, E4, G4, -1, 0, A4, Bb4, -1, -1, 0, A4, -1, G4, 0,
      // Bar 2: Minor rise -> B7 dominant stab
      E4, -1, 0, G4, B4, -1, -1, 0, Ds5, -1, -1, 0, B4, -1, 0, 0,
      // Bar 3: Driving E-minor battle motif
      E5, -1, -1, D5, E5, 0, G5, -1, Fs5, -1, E5, 0, B4, -1, -1, 0,
      // Bar 4: Urgent dominant response
      E5, -1, -1, Fs5, G5, 0, A5, -1, Fs5, -1, Ds5, -1, B4, -1, 0, 0,
      // Bar 5: High-energy minor hook
      G5, -1, -1, Fs5, E5, 0, B4, -1, C5, -1, D5, 0, E5, -1, -1, 0,
      // Bar 6: Phrygian bII (F) -> B7 turnaround
      F5, -1, -1, E5, D5, 0, C5, -1, B4, -1, Ds5, -1, E5, -1, 0, 0,
      // Bar 7: Ascending minor climax
      C5, -1, E5, -1, G5, -1, B5, -1, A5, -1, G5, 0, Fs5, -1, E5, 0,
      // Bar 8: B7 lock -> Em resolve
      Ds5, -1, Fs5, -1, B5, -1, -1, 0, A5, 0, Fs5, 0, E5, -1, 0, 0,
    ],
    // Held chord tones only on strong bar accents
    arp: [
      B3, -1, 0, 0, B3, -1, 0, 0, D4, -1, 0, 0, 0, 0, 0, 0,
      B3, -1, 0, 0, E4, -1, 0, 0, Fs4, -1, 0, 0, Ds4, -1, 0, 0,
      B4, -1, 0, 0, G4, -1, 0, 0, A4, -1, 0, 0, G4, -1, 0, 0,
      B4, -1, 0, 0, B4, -1, 0, 0, A4, -1, 0, 0, Fs4, -1, 0, 0,
      B4, -1, 0, 0, G4, -1, 0, 0, E4, -1, 0, 0, G4, -1, 0, 0,
      A4, -1, 0, 0, F4, -1, 0, 0, Fs4, -1, 0, 0, Ds4, -1, 0, 0,
      E4, -1, 0, 0, G4, -1, 0, 0, C5, -1, 0, 0, B4, -1, 0, 0,
      Fs4, -1, 0, 0, Ds5, -1, 0, 0, B4, -1, 0, 0, G4, -1, 0, 0,
    ],
    // Heavy, grounded 8th-note octave/fifth triangle bassline
    bass: [
      E2, 0, E3, 0, E2, 0, B2, 0, E2, 0, E3, 0, D2, 0, D3, 0,
      E2, 0, E3, 0, G2, 0, G3, 0, B1, 0, B2, 0, Ds2, 0, Fs2, 0,
      E2, 0, E3, 0, B2, 0, E3, 0, D2, 0, D3, 0, B1, 0, B2, 0,
      E2, 0, E3, 0, G2, 0, G3, 0, B1, 0, B2, 0, Ds2, 0, B2, 0,
      G2, 0, G3, 0, E2, 0, E3, 0, C2, 0, C3, 0, E2, 0, E3, 0,
      F2, 0, F3, 0, D2, 0, D3, 0, B1, 0, B2, 0, E2, 0, B2, 0,
      C2, 0, C3, 0, G2, 0, C3, 0, A2, 0, A3, 0, B2, 0, E3, 0,
      B1, 0, B2, 0, Ds2, 0, B2, 0, B1, 0, Fs2, 0, E2, 0, B2, 0,
    ],
    // Clean 4/4 pocket with minimal crisp percussion (zero fast-forward noise clutter)
    drums: [
      'K', 0, 0, 0, 'S', 0, 'h', 0,
      'K', 0, 'K', 0, 'S', 0, 'h', 0,
      'K', 0, 0, 0, 'S', 0, 'h', 0,
      'K', 0, 'K', 0, 'S', 0, 0, 'S',
    ],
    leadGain: 0.064,
    arpGain: 0.032,
    bassGain: 0.108,
    drumGain: 0.052,
  },
  forest: {
    // Warm gentle woodland flute/pulse groove (G Major / E Minor pastoral)
    stepSec: 0.175,
    leadWave: 'pulse25',
    arpWave: 'triangle',
    melody: [
      B4, -1, D5, 0, E5, -1, G5, 0,
      Fs5, -1, D5, B4, A4, -1, 0, 0,
      G4, -1, B4, 0, D5, -1, B4, 0,
      C5, B4, A4, G4, E4, -1, 0, 0,
      E5, -1, D5, C5, B4, -1, D5, 0,
      C5, -1, A4, B4, G4, -1, 0, 0,
      A4, B4, C5, D5, E5, -1, Fs5, 0,
      D5, -1, B4, A4, G4, -1, 0, 0,
    ],
    arp: [
      G4, 0, D4, 0, B3, 0, D4, 0,
      A4, 0, Fs4, 0, D4, 0, Fs4, 0,
      E4, 0, B3, 0, G3, 0, B3, 0,
      C4, 0, E4, 0, G4, 0, E4, 0,
    ],
    bass: [
      G3, 0, D3, 0, E3, 0, B2, 0,
      D3, 0, A2, 0, D3, 0, A2, 0,
      G3, 0, D3, 0, B2, 0, G2, 0,
      C3, 0, G3, 0, E3, 0, B2, 0,
      C3, 0, G3, 0, G2, 0, D3, 0,
      A2, 0, E3, 0, G2, 0, D3, 0,
      C3, 0, A2, 0, D3, 0, Fs3, 0,
      G3, 0, D3, 0, G2, 0, D3, 0,
    ],
    drums: [
      'K', 0, 0, 'h', 0, 0, 'h', 0,
      'K', 0, 0, 'h', 'S', 0, 'h', 0,
    ],
    leadGain: 0.052,
    arpGain: 0.028,
    bassGain: 0.088,
    drumGain: 0.036,
  },
  cave: {
    // Mysterious echoing crystal minor arpeggio (D Minor)
    stepSec: 0.180,
    leadWave: 'pulse12',
    arpWave: 'triangle',
    melody: [
      D5, -1, -1, 0, F5, -1, E5, 0,
      A4, -1, -1, 0, C5, -1, Bb4, 0,
      A4, -1, G4, 0, F4, -1, E4, 0,
      D4, -1, F4, A4, Cs5, -1, 0, 0,
      D5, -1, A4, 0, F5, -1, D5, 0,
      E5, -1, C5, 0, Bb4, -1, G4, 0,
      A4, -1, Cs5, 0, E5, -1, A5, 0,
      F5, -1, E5, Cs5, D5, -1, 0, 0,
    ],
    arp: [
      D4, 0, A4, 0, F4, 0, A4, 0,
      C4, 0, G4, 0, E4, 0, G4, 0,
      Bb3, 0, F4, 0, D4, 0, F4, 0,
      A3, 0, E4, 0, Cs4, 0, E4, 0,
    ],
    bass: [
      D3, 0, 0, 0, A2, 0, 0, 0,
      C3, 0, 0, 0, G2, 0, 0, 0,
      Bb2, 0, 0, 0, F2, 0, 0, 0,
      A2, 0, 0, 0, E2, 0, A2, 0,
      D3, 0, A2, 0, D3, 0, F3, 0,
      C3, 0, G2, 0, Bb2, 0, F2, 0,
      A2, 0, E3, 0, A2, 0, Cs3, 0,
      D3, 0, A2, 0, D2, 0, 0, 0,
    ],
    drums: [
      'K', 0, 0, 0, 0, 0, 'h', 0,
      0, 0, 'h', 0, 'S', 0, 0, 0,
    ],
    leadGain: 0.048,
    arpGain: 0.034,
    bassGain: 0.084,
    drumGain: 0.028,
  },
  water: {
    // Breezy sunlit lagoon bounce (C Major / F Major)
    stepSec: 0.160,
    leadWave: 'pulse25',
    melody: [
      E5, 0, G5, 0, C6, -1, B5, G5,
      A5, 0, G5, E5, D5, -1, 0, 0,
      F5, 0, A5, 0, G5, -1, E5, C5,
      D5, E5, F5, G5, E5, -1, 0, 0,
      G5, 0, E5, C5, A4, 0, C5, D5,
      E5, 0, G5, E5, D5, -1, 0, 0,
      C5, 0, D5, E5, F5, 0, G5, A5,
      G5, -1, D5, B4, C5, -1, 0, 0,
    ],
    arp: [
      C4, 0, E4, G4, C4, 0, E4, G4,
      F4, 0, A4, C5, G4, 0, B4, D5,
      A4, 0, C5, E5, F4, 0, A4, C5,
      G4, 0, B4, D5, C4, 0, E4, G4,
    ],
    bass: [
      C3, 0, G2, C3, C3, 0, E3, 0,
      F3, 0, C3, 0, G2, 0, D3, 0,
      F3, 0, C3, F3, C3, 0, G2, 0,
      G2, 0, D3, 0, C3, 0, G2, 0,
      C3, 0, E3, 0, A2, 0, E3, 0,
      C3, 0, G2, 0, G2, 0, D3, 0,
      A2, 0, E3, 0, F2, 0, C3, 0,
      G2, 0, D3, G2, C3, 0, G2, 0,
    ],
    drums: [
      'K', 0, 'h', 0, 'S', 0, 'h', 'h',
      'K', 0, 'h', 'K', 'S', 0, 'h', 0,
    ],
    leadGain: 0.054,
    arpGain: 0.032,
    bassGain: 0.090,
    drumGain: 0.042,
  },
  volcano: {
    // Driving fiery bass & heroic minor brassy pulse (A Minor / E Phrygian)
    stepSec: 0.148,
    leadWave: 'pulse25',
    melody: [
      A4, -1, 0, A4, C5, -1, E5, 0,
      F5, -1, E5, D5, E5, -1, B4, 0,
      A4, -1, C5, D5, E5, -1, A5, 0,
      Gs5, -1, E5, B4, E5, -1, 0, 0,
      F5, -1, D5, B4, E5, -1, C5, A4,
      D5, -1, B4, Gs4, A4, -1, E4, 0,
      F4, -1, A4, C5, E5, -1, D5, C5,
      B4, -1, Gs4, E4, A4, -1, 0, 0,
    ],
    arp: [
      A3, -1, E4, 0, A3, -1, E4, 0,
      D4, -1, F4, 0, E4, -1, Gs4, 0,
      A3, -1, E4, 0, C4, -1, E4, 0,
      E4, -1, B4, 0, Gs4, -1, E4, 0,
    ],
    bass: [
      A2, 0, A3, 0, E2, 0, A2, 0,
      F2, 0, F3, 0, E2, 0, B2, 0,
      A2, 0, A3, 0, C3, 0, E3, 0,
      E2, 0, E3, 0, Gs2, 0, B2, 0,
      D2, 0, D3, 0, C2, 0, C3, 0,
      B1, 0, B2, 0, A2, 0, E3, 0,
      F2, 0, C3, 0, E2, 0, B2, 0,
      E2, 0, Gs2, B2, A2, 0, E2, 0,
    ],
    drums: [
      'K', 0, 'h', 0, 'S', 0, 'h', 0,
      'K', 'K', 'h', 0, 'S', 0, 'h', 'S',
    ],
    leadGain: 0.060,
    arpGain: 0.034,
    bassGain: 0.104,
    drumGain: 0.048,
  },
  peak: {
    // Ethereal crystalline starlit bell-pulse waltz (3/4 feel: 48 steps, A Major / F# Minor)
    stepSec: 0.185,
    leadWave: 'pulse12',
    arpWave: 'triangle',
    melody: [
      Cs5, -1, E5, A5, -1, Gs5,
      Fs5, -1, E5, Cs5, -1, 0,
      D5, -1, Fs5, E5, -1, Cs5,
      B4, -1, -1, 0, 0, 0,
      A4, -1, Cs5, E5, -1, A5,
      Gs5, -1, Fs5, E5, -1, Cs5,
      D5, -1, B4, Cs5, -1, Gs4,
      A4, -1, -1, 0, 0, 0,
    ],
    arp: [
      A4, 0, E4, Cs5, 0, E4,
      Fs4, 0, Cs4, A4, 0, Cs4,
      D4, 0, A4, E4, 0, B4,
      E4, 0, B4, Gs4, 0, B4,
    ],
    bass: [
      A2, 0, E3, A3, E3, 0,
      Fs2, 0, Cs3, Fs3, Cs3, 0,
      D3, 0, A3, E3, 0, B3,
      E2, 0, B2, E3, B2, 0,
      A2, 0, E3, Cs3, 0, A3,
      E3, 0, B3, Cs3, 0, Gs3,
      D3, 0, A3, E3, 0, B2,
      A2, 0, E3, A2, 0, 0,
    ],
    drums: [
      'K', 0, 'h', 0, 'h', 0,
      'K', 0, 'h', 'S', 0, 'h',
    ],
    leadGain: 0.050,
    arpGain: 0.032,
    bassGain: 0.084,
    drumGain: 0.024,
  },
  shrine: {
    // Epic guardian showdown theme (D Minor heroic battle, 128 steps)
    stepSec: 0.136,
    leadWave: 'pulse25',
    melody: [
      D5, -1, 0, D5, F5, -1, A5, 0, Bb5, -1, -1, 0, A5, -1, G5, 0,
      F5, -1, E5, D5, Cs5, -1, E5, 0, A5, -1, -1, 0, E5, -1, 0, 0,
      D5, -1, F5, 0, A5, -1, D6, 0, C6, -1, Bb5, 0, A5, -1, G5, 0,
      F5, -1, G5, 0, E5, -1, Cs5, 0, D5, -1, -1, 0, A4, -1, 0, 0,
      Bb4, -1, D5, 0, F5, -1, Bb5, 0, A5, -1, G5, 0, F5, -1, E5, 0,
      G5, -1, E5, 0, C5, -1, G4, 0, A4, -1, Cs5, 0, E5, -1, A5, 0,
      D6, -1, C6, 0, Bb5, -1, A5, 0, G5, -1, F5, 0, E5, -1, D5, 0,
      Cs5, -1, E5, 0, A5, -1, Cs5, 0, D5, -1, -1, 0, 0, 0, 0, 0,
    ],
    arp: [
      D4, -1, 0, 0, A4, -1, 0, 0, Bb4, -1, 0, 0, G4, -1, 0, 0,
      F4, -1, 0, 0, E4, -1, 0, 0, A4, -1, 0, 0, Cs4, -1, 0, 0,
      D4, -1, 0, 0, F4, -1, 0, 0, C5, -1, 0, 0, G4, -1, 0, 0,
      A4, -1, 0, 0, E4, -1, 0, 0, D4, -1, 0, 0, A3, -1, 0, 0,
    ],
    bass: [
      D2, 0, D3, 0, D2, 0, A2, 0, Bb2, 0, Bb3, 0, G2, 0, G3, 0,
      F2, 0, F3, 0, A2, 0, A3, 0, A2, 0, E3, 0, Cs3, 0, A2, 0,
      D2, 0, D3, 0, F2, 0, F3, 0, C2, 0, C3, 0, G2, 0, G3, 0,
      A2, 0, A3, 0, A2, 0, E2, 0, D2, 0, D3, 0, A2, 0, D3, 0,
      Bb2, 0, Bb3, 0, F2, 0, F3, 0, F2, 0, C3, 0, D3, 0, A2, 0,
      C2, 0, C3, 0, G2, 0, C3, 0, A2, 0, A3, 0, E3, 0, A2, 0,
      Bb2, 0, Bb3, 0, G2, 0, G3, 0, E2, 0, E3, 0, D2, 0, D3, 0,
      A2, 0, E3, 0, A2, 0, Cs3, 0, D2, 0, A2, 0, D3, 0, 0, 0,
    ],
    drums: [
      'K', 0, 'h', 0, 'S', 0, 'h', 0,
      'K', 0, 'K', 'h', 'S', 0, 'h', 'S',
    ],
    leadGain: 0.064,
    arpGain: 0.036,
    bassGain: 0.108,
    drumGain: 0.052,
  },
  rival: {
    // Energetic Rival Duel chiptune (C Minor heroic pulse groove, 128 steps)
    stepSec: 0.132,
    leadWave: 'pulse25',
    melody: [
      // Bar 1: Crisp rival challenge motif
      G4, -1, 0, G4, C5, -1, Ds5, 0, D5, -1, C5, 0, B4, -1, G4, 0,
      // Bar 2: Syncopated climb to G5
      C5, -1, D5, 0, Ds5, -1, F5, 0, G5, -1, -1, 0, D5, -1, 0, 0,
      // Bar 3: High-energy rival hook
      G5, -1, 0, F5, Ds5, 0, D5, -1, C5, -1, D5, 0, Ds5, -1, G4, 0,
      // Bar 4: Ab -> G dominant answer
      Gs5, -1, G5, 0, F5, -1, Ds5, 0, D5, -1, B4, 0, G4, -1, 0, 0,
      // Bar 5: Driving octave leap & melodic run
      C5, -1, G5, -1, F5, 0, Ds5, 0, D5, -1, F5, 0, Ds5, -1, C5, 0,
      // Bar 6: Fm -> Bb -> Eb lift
      F5, -1, Gs5, 0, G5, 0, F5, 0, Ds5, -1, Bb4, 0, Ds5, -1, G5, 0,
      // Bar 7: Climactic run toward C6
      Gs5, -1, G5, 0, F5, 0, Ds5, 0, F5, -1, G5, 0, Bb5, -1, C6, 0,
      // Bar 8: B5 -> G5 -> C5 triumphant turnaround
      B5, -1, G5, 0, D5, -1, B4, 0, C5, -1, -1, 0, 0, 0, 0, 0,
    ],
    arp: [
      C4, -1, Ds4, 0, G4, -1, Ds4, 0, D4, -1, G4, 0, B4, -1, G4, 0,
      C4, -1, Ds4, 0, G4, -1, C5, 0, D4, -1, G4, 0, B4, -1, G4, 0,
      Gs4, -1, C5, 0, Ds5, -1, C5, 0, G4, -1, Bb4, 0, D5, -1, Bb4, 0,
      F4, -1, Gs4, 0, C5, -1, Gs4, 0, G4, -1, B4, 0, D5, -1, B4, 0,
    ],
    bass: [
      C2, 0, C3, 0, C2, 0, G2, 0, G2, 0, G3, 0, B2, 0, D3, 0,
      C2, 0, C3, 0, Ds2, 0, G2, 0, G2, 0, D3, 0, G2, 0, B2, 0,
      C2, 0, C3, 0, G2, 0, C3, 0, Bb2, 0, F3, 0, Ds2, 0, Bb2, 0,
      Gs2, 0, Ds3, 0, F2, 0, C3, 0, G2, 0, D3, 0, G2, 0, B2, 0,
      C2, 0, C3, 0, Ds2, 0, C3, 0, Bb2, 0, D3, 0, C2, 0, G2, 0,
      F2, 0, C3, 0, F2, 0, Gs2, 0, Ds2, 0, Bb2, 0, G2, 0, Ds3, 0,
      Gs2, 0, Ds3, 0, F2, 0, C3, 0, Bb2, 0, F3, 0, C3, 0, G3, 0,
      G2, 0, D3, 0, G2, 0, B2, 0, C2, 0, G2, 0, C3, 0, 0, 0,
    ],
    drums: [
      'K', 0, 'h', 0, 'S', 0, 'h', 'K',
      'K', 0, 'h', 0, 'S', 0, 'h', 'S',
    ],
    leadGain: 0.062,
    arpGain: 0.034,
    bassGain: 0.106,
    drumGain: 0.052,
  },
  grove: {
    // Dreamy 64-step pentatonic starlight grove melody (D Major / B Minor Pentatonic)
    stepSec: 0.172,
    leadWave: 'pulse12',
    arpWave: 'triangle',
    melody: [
      D5, -1, E5, Fs5, A5, -1, -1, 0, B5, -1, A5, Fs5, E5, -1, D5, 0,
      Fs5, -1, A5, B5, D6, -1, -1, 0, B5, -1, A5, Fs5, E5, -1, 0, 0,
      A5, -1, Fs5, E5, D5, -1, E5, Fs5, A5, -1, B5, A5, Fs5, -1, D5, 0,
      E5, -1, Fs5, A5, B5, -1, A5, Fs5, E5, -1, Fs5, E5, D5, -1, 0, 0,
    ],
    arp: [
      D4, 0, A4, 0, Fs4, 0, A4, 0, B3, 0, Fs4, 0, D4, 0, Fs4, 0,
      G3, 0, D4, 0, B4, 0, D4, 0, A3, 0, E4, 0, A4, 0, E4, 0,
    ],
    bass: [
      D3, 0, A2, 0, D3, 0, Fs3, 0, B2, 0, Fs3, 0, B2, 0, D3, 0,
      G2, 0, D3, 0, G3, 0, D3, 0, A2, 0, E3, 0, A2, 0, E3, 0,
      D3, 0, A2, 0, Fs2, 0, D3, 0, G2, 0, D3, 0, B2, 0, Fs3, 0,
      A2, 0, E3, 0, A2, 0, E3, 0, D2, 0, A2, 0, D3, 0, 0, 0,
    ],
    drums: [
      'K', 0, 0, 'h', 0, 0, 'h', 0,
      'K', 0, 0, 'h', 'S', 0, 'h', 0,
    ],
    leadGain: 0.052,
    arpGain: 0.032,
    bassGain: 0.086,
    drumGain: 0.026,
  },
  desert: {
    // Exotic E Phrygian Dominant desert adventure groove (64 steps)
    stepSec: 0.156,
    leadWave: 'pulse25',
    arpWave: 'pulse12',
    melody: [
      E4, -1, F4, Gs4, B4, -1, Gs4, F4, E4, -1, Gs4, B4, C5, -1, B4, 0,
      D5, -1, C5, B4, Gs4, -1, F4, Gs4, B4, -1, Gs4, F4, E4, -1, 0, 0,
      E5, -1, F5, E5, D5, -1, C5, B4, C5, -1, D5, C5, B4, -1, Gs4, 0,
      A4, -1, C5, B4, Gs4, -1, F4, Gs4, E4, -1, B4, Gs4, E4, -1, 0, 0,
    ],
    arp: [
      E4, 0, Gs4, B4, E4, 0, Gs4, B4,
      F4, 0, A4, C5, F4, 0, A4, C5,
      D4, 0, F4, A4, Gs4, 0, B4, E5,
      A3, 0, C4, E4, Gs3, 0, B3, E4,
    ],
    bass: [
      E2, 0, E3, 0, B2, 0, E3, 0, E2, 0, E3, 0, Gs2, 0, B2, 0,
      F2, 0, F3, 0, C3, 0, F3, 0, E2, 0, B2, 0, E3, 0, B2, 0,
      A2, 0, E3, 0, G2, 0, D3, 0, F2, 0, C3, 0, E2, 0, B2, 0,
      F2, 0, C3, 0, Gs2, 0, B2, 0, E2, 0, B2, 0, E3, 0, 0, 0,
    ],
    drums: [
      'K', 0, 'h', 'K', 'S', 0, 'h', 0,
      'K', 0, 'h', 'K', 'S', 0, 'h', 'S',
    ],
    leadGain: 0.056,
    arpGain: 0.030,
    bassGain: 0.094,
    drumGain: 0.044,
  },
  marsh: {
    // Mysterious bouncy G Dorian bayou waltz/groove (96 steps = 16 x 6/8 bars)
    stepSec: 0.174,
    leadWave: 'pulse12',
    arpWave: 'triangle',
    melody: [
      G4, -1, Bb4, D5, -1, C5,
      Bb4, -1, A4, G4, -1, 0,
      F4, -1, A4, C5, -1, Bb4,
      A4, -1, G4, Fs4, -1, 0,
      G4, -1, Bb4, D5, -1, E5,
      F5, -1, D5, C5, -1, Bb4,
      A4, -1, C5, Bb4, -1, Fs4,
      G4, -1, -1, 0, 0, 0,
      D5, -1, E5, F5, -1, D5,
      C5, -1, Bb4, A4, -1, G4,
      Bb4, -1, C5, D5, -1, C5,
      A4, -1, Fs4, D4, -1, 0,
      G4, -1, A4, Bb4, -1, D5,
      E5, -1, C5, A4, -1, Bb4,
      D5, -1, C5, Bb4, -1, A4,
      G4, -1, -1, 0, 0, 0,
    ],
    arp: [
      G4, 0, D4, Bb4, 0, D4,
      F4, 0, C4, A4, 0, C4,
      E4, 0, C4, G4, 0, C4,
      D4, 0, A4, Fs4, 0, A4,
    ],
    bass: [
      G2, 0, D3, G3, 0, D3,
      G2, 0, D3, Bb2, 0, D3,
      F2, 0, C3, F3, 0, C3,
      D2, 0, A2, D3, 0, A2,
      G2, 0, D3, G3, 0, E3,
      F2, 0, C3, Bb2, 0, F3,
      C3, 0, G3, D3, 0, A2,
      G2, 0, D3, G2, 0, 0,
      Bb2, 0, F3, D3, 0, F3,
      C3, 0, G3, F2, 0, C3,
      G2, 0, D3, Bb2, 0, F3,
      D3, 0, A2, D2, 0, 0,
      G2, 0, D3, G3, 0, D3,
      C3, 0, G3, A2, 0, E3,
      D3, 0, A2, D3, 0, A2,
      G2, 0, D3, G2, 0, 0,
    ],
    drums: [
      'K', 0, 'h', 'S', 0, 'h',
      'K', 0, 'h', 'S', 'h', 0,
    ],
    leadGain: 0.052,
    arpGain: 0.032,
    bassGain: 0.088,
    drumGain: 0.030,
  },
  sanctum: {
    // Majestic cosmic astral anthem in E Major / C# Minor (128 steps)
    stepSec: 0.158,
    leadWave: 'pulse25',
    arpWave: 'triangle',
    melody: [
      E5, -1, -1, B4, Gs5, -1, Fs5, 0, E5, -1, Ds5, E5, Fs5, -1, 0, 0,
      Cs5, -1, -1, E5, Gs5, -1, B5, 0, A5, -1, Gs5, Fs5, E5, -1, 0, 0,
      Gs5, -1, Fs5, E5, Ds5, -1, E5, Fs5, Gs5, -1, B5, 0, Fs5, -1, 0, 0,
      E5, -1, Ds5, Cs5, B4, -1, Cs5, Ds5, E5, -1, -1, 0, 0, 0, 0, 0,
      A5, -1, Gs5, Fs5, E5, -1, Cs5, 0, Fs5, -1, Gs5, A5, B5, -1, 0, 0,
      Gs5, -1, E5, B4, Cs5, -1, E5, Fs5, Gs5, -1, Fs5, Ds5, B4, -1, 0, 0,
      Cs5, -1, E5, Gs5, A5, -1, B5, 0, Gs5, -1, E5, Cs5, Ds5, -1, Fs5, 0,
      E5, -1, B4, Gs4, B4, -1, Ds5, 0, E5, -1, -1, 0, 0, 0, 0, 0,
    ],
    arp: [
      E4, 0, B4, Gs4, E4, 0, B4, Gs4,
      B3, 0, Fs4, Ds4, B3, 0, Fs4, Ds4,
      Cs4, 0, Gs4, E4, Cs4, 0, Gs4, E4,
      A3, 0, E4, Cs4, B3, 0, Fs4, Ds4,
    ],
    bass: [
      E2, 0, E3, 0, B2, 0, E3, 0, B1, 0, B2, 0, Fs2, 0, B2, 0,
      Cs3, 0, Gs3, 0, Cs3, 0, E3, 0, A2, 0, E3, 0, B2, 0, Fs3, 0,
      E2, 0, B2, 0, B1, 0, Fs2, 0, Cs3, 0, Gs3, 0, B2, 0, Fs3, 0,
      A2, 0, E3, 0, B2, 0, Fs3, 0, E2, 0, B2, 0, E3, 0, 0, 0,
      A2, 0, E3, 0, A2, 0, Cs3, 0, B2, 0, Fs3, 0, B2, 0, Ds3, 0,
      E2, 0, B2, 0, Cs3, 0, Gs3, 0, B2, 0, Fs3, 0, B1, 0, Fs2, 0,
      Cs3, 0, Gs3, 0, A2, 0, E3, 0, E2, 0, B2, 0, B1, 0, Fs2, 0,
      E2, 0, B2, 0, B1, 0, B2, 0, E2, 0, B2, 0, E3, 0, 0, 0,
    ],
    drums: [
      'K', 0, 'h', 0, 'S', 0, 'h', 0,
      'K', 0, 'K', 'h', 'S', 0, 'h', 'S',
    ],
    leadGain: 0.058,
    arpGain: 0.034,
    bassGain: 0.096,
    drumGain: 0.044,
  },
};

export class AudioEngine {
  constructor({ silent = false, attachUnlockListeners = true } = {}) {
    this.ctx = null;
    this.masterFilter = null;
    this.masterGain = null;
    this.bgmBus = null;
    this.silentSink = null;
    this.silent = Boolean(silent);

    this.pulse12Wave = null;
    this.pulse25Wave = null;
    this.warmPulseWave = null;
    this.noiseBuffer = null;

    this.muted = false;
    this.unlocked = false;
    this._unlockPromise = null;

    this.currentTheme = null;
    this.schedulerTimer = null;
    this.schedulerStartCount = 0;
    this.bgmGeneration = 0;
    this.activeBgmNodes = new Set();

    this.nextStepTime = 0;
    this.stepIndex = 0;
    this.bgmSyncStartTime = 0;
    this.bgmStepsSinceSync = 0;
    this._lastCursorAt = 0;

    this._boundUnlock = () => this.unlock();
    this._unlockListenersAttached = false;
    if (attachUnlockListeners && typeof window !== 'undefined') {
      const opts = { capture: true, passive: true };
      window.addEventListener('pointerdown', this._boundUnlock, opts);
      window.addEventListener('pointerup', this._boundUnlock, opts);
      window.addEventListener('touchstart', this._boundUnlock, opts);
      window.addEventListener('touchend', this._boundUnlock, opts);
      window.addEventListener('keydown', this._boundUnlock, opts);
      window.addEventListener('click', this._boundUnlock, opts);
      this._unlockListenersAttached = true;
    }
  }

  _removeUnlockListeners() {
    if (!this._unlockListenersAttached || typeof window === 'undefined') return;
    const opts = { capture: true, passive: true };
    window.removeEventListener('pointerdown', this._boundUnlock, opts);
    window.removeEventListener('pointerup', this._boundUnlock, opts);
    window.removeEventListener('touchstart', this._boundUnlock, opts);
    window.removeEventListener('touchend', this._boundUnlock, opts);
    window.removeEventListener('keydown', this._boundUnlock, opts);
    window.removeEventListener('click', this._boundUnlock, opts);
    this._unlockListenersAttached = false;
  }

  buildPulseWave(ctx, duty = 0.25) {
    if (typeof ctx.createPeriodicWave !== 'function') return null;
    try {
      const harmonics = 16;
      const real = new Float32Array(harmonics + 1);
      const imag = new Float32Array(harmonics + 1);
      for (let n = 1; n <= harmonics; n++) {
        // Gentle Gibbs/Nyquist roll-off while preserving authentic Game Boy square bite
        const rolloff = 1 / (1 + Math.pow(n / 11, 2));
        imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty) * rolloff * 2.0;
      }
      return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    } catch {
      return null;
    }
  }

  buildWarmPulseWave(ctx) {
    return this.buildPulseWave(ctx, 0.25);
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
      this.masterFilter.frequency.value = 1260;
      this.masterFilter.Q.value = 0.65;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.34;

      this.bgmBus = this.ctx.createGain();
      this.bgmBus.gain.value = 1.0;

      this.bgmBus.connect(this.masterFilter);
      this.masterFilter.connect(this.masterGain);
      if (this.silent) {
        this.silentSink = this.ctx.createGain();
        this.silentSink.gain.value = 0;
        this.masterGain.connect(this.silentSink);
        this.silentSink.connect(this.ctx.destination);
      } else {
        this.masterGain.connect(this.ctx.destination);
      }

      this.pulse12Wave = this.buildPulseWave(this.ctx, 0.125);
      this.pulse25Wave = this.buildPulseWave(this.ctx, 0.25);
      this.warmPulseWave = this.pulse25Wave;
      this.noiseBuffer = this.buildNoiseBuffer(this.ctx);
      return this.ctx;
    } catch {
      this.ctx = null;
      this.masterFilter = null;
      this.masterGain = null;
      this.bgmBus = null;
      this.silentSink = null;
      return null;
    }
  }

  async destroy() {
    this.stopBGM();
    this._removeUnlockListeners();
    this.unlocked = false;
    this._unlockPromise = null;
    const ctx = this.ctx;
    this.ctx = null;
    this.masterFilter = null;
    this.masterGain = null;
    this.bgmBus = null;
    this.silentSink = null;
    if (ctx && typeof ctx.close === 'function') {
      await ctx.close().catch(() => {});
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
    if (this.unlocked && ctx.state === 'running') {
      this._removeUnlockListeners();
      return Promise.resolve(true);
    }
    if (this._unlockPromise) return this._unlockPromise;

    const onReady = () => {
      this._unlockPromise = null;
      this.unlocked = ctx.state === 'running';
      if (this.unlocked) {
        this._removeUnlockListeners();
        if (this.currentTheme && !this.schedulerTimer && !this.muted) {
          this.startScheduler();
        }
      }
      return this.unlocked;
    };

    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      try {
        this._unlockPromise = Promise.resolve(ctx.resume())
          .then(onReady)
          .catch(() => {
            this._unlockPromise = null;
            return false;
          });
        return this._unlockPromise;
      } catch {
        this._unlockPromise = null;
        return Promise.resolve(false);
      }
    }
    return Promise.resolve(onReady());
  }

  _haltActiveBgmNodes() {
    for (const entry of this.activeBgmNodes) {
      try {
        entry.source.onended = null;
      } catch {
        // Ignore
      }
      try {
        entry.source.stop();
      } catch {
        // Ignore already-stopped nodes
      }
      try {
        entry.source.disconnect();
      } catch {
        // Ignore
      }
      try {
        entry.gain.disconnect();
      } catch {
        // Ignore
      }
    }
    this.activeBgmNodes.clear();

    if (this.ctx && this.masterFilter) {
      if (this.bgmBus) {
        try {
          this.bgmBus.disconnect();
        } catch {
          // Ignore
        }
      }
      this.bgmBus = this.ctx.createGain();
      this.bgmBus.gain.value = 1.0;
      this.bgmBus.connect(this.masterFilter);
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.34, now, 0.015);
    }
    if (this.muted) {
      this.bgmGeneration += 1;
      this.stopScheduler();
      this._haltActiveBgmNodes();
    } else if (this.currentTheme && this.ctx && this.ctx.state === 'running') {
      this.startScheduler();
    }
  }

  isMuted() {
    return this.muted;
  }

  _trackBgmNode(source, gainNode) {
    const entry = { source, gain: gainNode };
    this.activeBgmNodes.add(entry);
    source.onended = () => {
      this.activeBgmNodes.delete(entry);
      try {
        source.disconnect();
      } catch {
        // Ignore
      }
      try {
        gainNode.disconnect();
      } catch {
        // Ignore
      }
    };
  }

  triggerVoice({
    freq,
    endFreq = null,
    midFreq = null,
    wave = 'triangle',
    useWarmPulse = false,
    attack = 0.006,
    decay = 0.045,
    sustain = 0.36,
    duration = 0.14,
    gain = 0.12,
    delay = 0,
    startTime = null,
    destination = null,
    trackBgm = false,
  }) {
    if (this.muted) return null;
    const ctx = this.ensureContext();
    const dest = destination || this.masterFilter;
    if (!ctx || !dest || ctx.state !== 'running') return null;

    const dur = Math.max(0.025, duration);
    const start = startTime !== null ? startTime : ctx.currentTime + Math.max(0, delay);
    const atk = Math.min(dur * 0.45, Math.max(0.002, attack));
    const decEnd = Math.min(dur * 0.82, atk + Math.max(0.008, decay));
    const peakGain = Math.max(0.001, gain);
    const sustainGain = Math.max(0.0001, peakGain * Math.max(0.04, Math.min(0.95, sustain)));

    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    if (wave === 'pulse12' && this.pulse12Wave) {
      osc.setPeriodicWave(this.pulse12Wave);
    } else if ((wave === 'pulse25' || wave === 'square' || useWarmPulse) && this.pulse25Wave) {
      osc.setPeriodicWave(this.pulse25Wave);
    } else {
      osc.type = wave === 'pulse12' || wave === 'pulse25' ? 'square' : wave;
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
    env.connect(dest);
    if (trackBgm) {
      this._trackBgmNode(osc, env);
    }
    osc.start(start);
    osc.stop(start + dur + 0.02);
    return osc;
  }

  playTone(opts) {
    this.triggerVoice({
      wave: opts.type === 'square' ? 'pulse25' : (opts.type || 'triangle'),
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
    q = 0.9,
    attack = 0.003,
    delay = 0,
    startTime = null,
    destination = null,
    trackBgm = false,
  }) {
    if (this.muted) return null;
    const ctx = this.ensureContext();
    const dest = destination || this.masterFilter;
    if (!ctx || !dest || ctx.state !== 'running' || !this.noiseBuffer) return null;

    const dur = Math.max(0.02, duration);
    const start = startTime !== null ? startTime : ctx.currentTime + Math.max(0, delay);
    const atk = Math.min(dur * 0.35, Math.max(0.002, attack));

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(Math.max(30, startFreq), start);
    if (endFreq !== startFreq) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), start + dur);
    }

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.linearRampToValueAtTime(Math.max(0.001, gain), start + atk);
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    src.connect(filter);
    filter.connect(env);
    env.connect(dest);
    if (trackBgm) {
      this._trackBgmNode(src, env);
    }

    src.start(start);
    src.stop(start + dur + 0.02);
    return src;
  }

  triggerDrum(hitType, startTime, drumGain = 0.08) {
    if (!hitType || !this.bgmBus) return;
    if (hitType === 'K') {
      // Pure grounded low-frequency triangle kick thud (zero white-noise clutter)
      this.triggerVoice({
        freq: 112,
        endFreq: 36,
        wave: 'triangle',
        startTime,
        duration: 0.075,
        attack: 0.002,
        decay: 0.03,
        sustain: 0.25,
        gain: Math.min(0.11, drumGain * 1.25),
        destination: this.bgmBus,
        trackBgm: true,
      });
    } else if (hitType === 'S') {
      // Warm tight Game Boy snare
      this.triggerVoice({
        freq: 175,
        endFreq: 78,
        wave: 'triangle',
        startTime,
        duration: 0.055,
        attack: 0.002,
        decay: 0.024,
        sustain: 0.2,
        gain: drumGain * 0.72,
        destination: this.bgmBus,
        trackBgm: true,
      });
      this.playNoise({
        startTime,
        duration: 0.06,
        gain: drumGain * 0.78,
        filterType: 'lowpass',
        startFreq: 920,
        endFreq: 240,
        q: 0.65,
        attack: 0.002,
        destination: this.bgmBus,
        trackBgm: true,
      });
    } else if (hitType === 'h') {
      // Subtle soft low-passed tick
      this.playNoise({
        startTime,
        duration: 0.018,
        gain: drumGain * 0.24,
        filterType: 'lowpass',
        startFreq: 980,
        endFreq: 420,
        q: 0.65,
        attack: 0.002,
        destination: this.bgmBus,
        trackBgm: true,
      });
    }
  }

  playBGM(theme) {
    if (!THEMES[theme]) return;
    if (this.currentTheme === theme && this.schedulerTimer) return;

    this.stopBGM();
    this.currentTheme = theme;
    this.stepIndex = 0;

    const ctx = this.ensureContext();
    if (!ctx || this.muted || ctx.state !== 'running') return;
    this.startScheduler();
  }

  stopBGM() {
    this.bgmGeneration += 1;
    this.stopScheduler();
    this._haltActiveBgmNodes();
    this.currentTheme = null;
    this.stepIndex = 0;
    this.nextStepTime = 0;
    this.bgmSyncStartTime = 0;
    this.bgmStepsSinceSync = 0;
  }

  stopScheduler() {
    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  startScheduler() {
    this.stopScheduler();
    const ctx = this.ensureContext();
    if (!ctx || !this.currentTheme) return;

    const gen = ++this.bgmGeneration;
    this.schedulerStartCount += 1;
    this.nextStepTime = ctx.currentTime + 0.03;
    this.bgmSyncStartTime = this.nextStepTime;
    this.bgmStepsSinceSync = 0;
    this.schedulerTimer = setInterval(() => this.scheduleAhead(gen), 25);
    this.scheduleAhead(gen);
  }

  _countHoldSteps(arr, startIdx) {
    if (!arr || arr.length === 0) return 1;
    let hold = 1;
    while (startIdx + hold < arr.length && arr[startIdx + hold] === -1) {
      hold += 1;
    }
    return hold;
  }

  scheduleAhead(gen = this.bgmGeneration) {
    if (gen !== this.bgmGeneration) return;
    if (this.muted || !this.currentTheme || !this.ctx || this.ctx.state !== 'running') return;
    const theme = THEMES[this.currentTheme];
    if (!theme) return;

    const now = this.ctx.currentTime;
    // Anti-burst guard: if browser tab was backgrounded or stalled, re-anchor cleanly instead of dumping backlog
    if (now - this.nextStepTime > 0.5) {
      this.nextStepTime = now + 0.03;
      this.bgmSyncStartTime = this.nextStepTime;
      this.bgmStepsSinceSync = 0;
    }

    const horizon = now + 0.14;
    const dest = this.bgmBus || this.masterFilter;

    while (this.nextStepTime < horizon) {
      const idx = this.stepIndex % theme.melody.length;
      const melFreq = theme.melody[idx];
      const arpIdx = theme.arp ? idx % theme.arp.length : 0;
      const arpFreq = theme.arp ? theme.arp[arpIdx] : 0;
      const bassIdx = idx % theme.bass.length;
      const bassFreq = theme.bass[bassIdx];
      const drumHit = theme.drums ? theme.drums[idx % theme.drums.length] : null;
      const stepDur = theme.stepSec;

      if (melFreq > 0) {
        const melHold = this._countHoldSteps(theme.melody, idx);
        this.triggerVoice({
          freq: melFreq,
          wave: theme.leadWave || 'pulse25',
          startTime: this.nextStepTime,
          duration: stepDur * Math.max(0.72, melHold - 0.16),
          attack: 0.005,
          decay: 0.035,
          sustain: 0.54,
          gain: Math.min(0.12, theme.leadGain),
          destination: dest,
          trackBgm: true,
        });
      }
      if (arpFreq > 0) {
        const arpHold = this._countHoldSteps(theme.arp, arpIdx);
        this.triggerVoice({
          freq: arpFreq,
          wave: theme.arpWave || 'pulse25',
          startTime: this.nextStepTime,
          duration: stepDur * Math.max(0.65, arpHold - 0.18),
          attack: 0.004,
          decay: 0.025,
          sustain: 0.42,
          gain: Math.min(0.12, theme.arpGain),
          destination: dest,
          trackBgm: true,
        });
      }
      if (bassFreq > 0) {
        const bassHold = this._countHoldSteps(theme.bass, bassIdx);
        this.triggerVoice({
          freq: bassFreq,
          wave: 'triangle',
          startTime: this.nextStepTime,
          duration: stepDur * Math.max(0.84, bassHold - 0.12),
          attack: 0.004,
          decay: 0.035,
          sustain: 0.62,
          gain: Math.min(0.12, theme.bassGain),
          destination: dest,
          trackBgm: true,
        });
      }
      if (drumHit) {
        this.triggerDrum(drumHit, this.nextStepTime, theme.drumGain || 0.052);
      }

      this.nextStepTime += stepDur;
      this.stepIndex += 1;
      this.bgmStepsSinceSync += 1;
    }
  }

  getDiagnostics() {
    const theme = this.currentTheme ? THEMES[this.currentTheme] : null;
    const stepSec = theme?.stepSec || 0;
    const expectedStepsPerSec = stepSec > 0 ? 1 / stepSec : 0;
    const audioNow = this.ctx ? this.ctx.currentTime : 0;
    const elapsedAudio = this.bgmStepsSinceSync > 0 && this.ctx
      ? Math.max(0.001, (this.nextStepTime - this.bgmSyncStartTime))
      : 0;
    const measuredStepsPerSec = elapsedAudio > 0 && this.bgmStepsSinceSync > 0
      ? this.bgmStepsSinceSync / elapsedAudio
      : 0;
    const tempoDriftPct = expectedStepsPerSec > 0 && measuredStepsPerSec > 0
      ? Math.abs(measuredStepsPerSec - expectedStepsPerSec) / expectedStepsPerSec * 100
      : 0;

    return {
      currentTheme: this.currentTheme,
      unlocked: this.unlocked,
      muted: this.muted,
      schedulerActive: this.schedulerTimer !== null,
      schedulerStartCount: this.schedulerStartCount,
      activeBgmNodes: this.activeBgmNodes.size,
      stepIndex: this.stepIndex,
      stepSec,
      expectedStepsPerSec: Number(expectedStepsPerSec.toFixed(3)),
      measuredStepsPerSec: Number(measuredStepsPerSec.toFixed(3)),
      tempoDriftPct: Number(tempoDriftPct.toFixed(4)),
      audioCurrentTime: Number(audioNow.toFixed(3)),
    };
  }

  // --- Sound Effects ---

  playCursorMove() {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this._lastCursorAt < 35) return;
    this._lastCursorAt = now;
    this.triggerVoice({
      freq: 720,
      wave: 'pulse25',
      duration: 0.032,
      attack: 0.002,
      decay: 0.015,
      sustain: 0.25,
      gain: 0.05,
    });
  }

  playMoveSelect() {
    this.triggerVoice({
      freq: 587.33,
      wave: 'pulse25',
      duration: 0.048,
      attack: 0.002,
      decay: 0.02,
      sustain: 0.45,
      gain: 0.085,
      delay: 0,
    });
    this.triggerVoice({
      freq: 880.0,
      wave: 'pulse25',
      duration: 0.078,
      attack: 0.002,
      decay: 0.03,
      sustain: 0.4,
      gain: 0.095,
      delay: 0.048,
    });
  }

  playMenuBlip(pitch = 620) {
    this.triggerVoice({
      freq: pitch,
      wave: 'pulse25',
      duration: 0.045,
      attack: 0.002,
      decay: 0.02,
      sustain: 0.25,
      gain: 0.065,
    });
  }

  playEncounterAlert() {
    // Bold 2-step minor encounter alert
    this.triggerVoice({
      freq: B4,
      wave: 'pulse25',
      duration: 0.11,
      attack: 0.004,
      decay: 0.03,
      sustain: 0.55,
      gain: 0.09,
      delay: 0,
    });
    this.triggerVoice({
      freq: E5,
      wave: 'pulse25',
      duration: 0.20,
      attack: 0.004,
      decay: 0.04,
      sustain: 0.55,
      gain: 0.09,
      delay: 0.12,
    });
  }

  playPhysicalImpact(power = 45) {
    const boost = Math.min(1.25, Math.max(0.85, power / 50));
    // Heavy, punchy low-frequency thud with instant noise transient, zero high-pitched ringing
    this.triggerVoice({
      freq: 128,
      endFreq: 26,
      wave: 'sine',
      duration: 0.14,
      attack: 0.002,
      decay: 0.045,
      sustain: 0.22,
      gain: 0.24 * boost,
    });
    this.triggerVoice({
      freq: 96,
      endFreq: 22,
      wave: 'triangle',
      duration: 0.13,
      attack: 0.002,
      decay: 0.045,
      sustain: 0.18,
      gain: 0.19 * boost,
    });
    this.playNoise({
      duration: 0.095,
      gain: 0.22 * boost,
      filterType: 'lowpass',
      startFreq: 620,
      endFreq: 95,
      q: 0.65,
      attack: 0.002,
    });
  }

  playTackle() {
    this.playPhysicalImpact(42);
  }

  playFaint() {
    // Low-frequency descending pitch drop
    this.triggerVoice({
      freq: 220,
      endFreq: 46,
      wave: 'pulse25',
      duration: 0.44,
      attack: 0.005,
      decay: 0.14,
      sustain: 0.35,
      gain: 0.11,
    });
    this.triggerVoice({
      freq: 110,
      endFreq: 28,
      wave: 'triangle',
      duration: 0.44,
      attack: 0.005,
      decay: 0.15,
      sustain: 0.38,
      gain: 0.16,
    });
    this.playNoise({
      duration: 0.18,
      gain: 0.11,
      filterType: 'lowpass',
      startFreq: 340,
      endFreq: 65,
      q: 0.65,
      delay: 0.16,
    });
  }

  playElemental(type, moveId = '') {
    if (moveId === 'tackle' || moveId === 'quick_attack') {
      this.playPhysicalImpact(moveId === 'quick_attack' ? 50 : 42);
      return;
    }

    if (moveId === 'sky_wing') {
      this.playNoise({
        duration: 0.2,
        gain: 0.16,
        filterType: 'bandpass',
        startFreq: 440,
        endFreq: 1120,
        q: 1.4,
      });
      this.triggerVoice({
        freq: 523.25,
        endFreq: 880,
        wave: 'triangle',
        duration: 0.14,
        gain: 0.1,
      });
      this.playPhysicalImpact(56);
      return;
    }

    if (moveId === 'star_melody') {
      [523.25, 659.25, 783.99, 987.77, 1046.5].forEach((freq, i) => {
        this.triggerVoice({
          freq,
          endFreq: freq * 1.02,
          wave: i % 2 === 0 ? 'pulse25' : 'sine',
          duration: 0.11,
          gain: 0.082,
          delay: i * 0.045,
        });
      });
      return;
    }

    if (moveId === 'hyper_nova') {
      this.triggerVoice({
        freq: 220,
        midFreq: 659.25,
        endFreq: 1046.5,
        wave: 'pulse25',
        duration: 0.28,
        gain: 0.11,
      });
      [523.25, 783.99, 1046.5].forEach((freq, i) => {
        this.triggerVoice({
          freq,
          wave: 'sine',
          duration: 0.24,
          gain: 0.085,
          delay: 0.05 + i * 0.03,
        });
      });
      this.playNoise({
        duration: 0.2,
        gain: 0.14,
        filterType: 'lowpass',
        startFreq: 980,
        endFreq: 240,
        delay: 0.06,
      });
      return;
    }

    if (moveId === 'petal_blizzard') {
      [587.33, 739.99, 880.0, 1174.66].forEach((f, i) => {
        this.triggerVoice({
          freq: f,
          endFreq: f * 1.12,
          wave: 'pulse25',
          duration: 0.1,
          gain: 0.088,
          delay: i * 0.04,
        });
      });
      this.playNoise({
        duration: 0.22,
        gain: 0.13,
        filterType: 'bandpass',
        startFreq: 1050,
        endFreq: 480,
        q: 1.3,
      });
      return;
    }

    if (moveId === 'cosmos_mind') {
      [440, 554.37, 659.25, 880, 1108.73].forEach((f, i) => {
        this.triggerVoice({
          freq: f,
          wave: 'sine',
          duration: 0.14,
          gain: 0.082,
          delay: i * 0.045,
        });
      });
      return;
    }

    if (moveId === 'meteor_slam') {
      this.triggerVoice({
        freq: 420,
        endFreq: 52,
        wave: 'triangle',
        duration: 0.24,
        gain: 0.2,
      });
      this.playNoise({
        duration: 0.22,
        gain: 0.22,
        filterType: 'lowpass',
        startFreq: 760,
        endFreq: 95,
        q: 0.8,
        delay: 0.04,
      });
      return;
    }

    if (moveId === 'phantom_claw') {
      this.triggerVoice({
        freq: 466.16,
        midFreq: 622.25,
        endFreq: 246.94,
        wave: 'pulse12',
        duration: 0.22,
        gain: 0.085,
      });
      this.playNoise({
        duration: 0.14,
        gain: 0.14,
        filterType: 'bandpass',
        startFreq: 980,
        endFreq: 360,
        q: 1.8,
      });
      return;
    }

    if (moveId === 'thunder_tempest') {
      [987.77, 1174.66, 880, 1318.51].forEach((f, i) => {
        this.triggerVoice({
          freq: f,
          endFreq: f * 0.55,
          wave: i % 2 === 0 ? 'pulse12' : 'pulse25',
          duration: 0.095,
          gain: 0.09,
          delay: i * 0.042,
        });
      });
      this.playNoise({
        duration: 0.18,
        gain: 0.15,
        filterType: 'lowpass',
        startFreq: 960,
        endFreq: 180,
        delay: 0.04,
      });
      return;
    }

    if (moveId === 'aurora_flare') {
      this.playNoise({
        duration: 0.22,
        gain: 0.1,
        filterType: 'bandpass',
        startFreq: 1200,
        endFreq: 720,
        q: 1.6,
      });
      [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => {
        this.triggerVoice({
          freq: f,
          endFreq: f * 1.06,
          wave: i % 2 === 0 ? 'sine' : 'pulse12',
          duration: 0.14,
          gain: 0.08,
          delay: i * 0.04,
        });
      });
      return;
    }

    if (moveId === 'cotton_guard') {
      this.playShieldChime();
      return;
    }

    if (moveId === 'thunder_fang') {
      this.playPhysicalImpact(62);
      this.triggerVoice({
        freq: 1174.66,
        endFreq: 523.25,
        wave: 'pulse12',
        duration: 0.09,
        gain: 0.095,
      });
      this.triggerVoice({
        freq: 1318.51,
        endFreq: 659.25,
        wave: 'pulse25',
        duration: 0.1,
        gain: 0.09,
        delay: 0.045,
      });
      this.playNoise({
        duration: 0.11,
        gain: 0.12,
        filterType: 'bandpass',
        startFreq: 1150,
        endFreq: 480,
        q: 1.7,
        delay: 0.02,
      });
      return;
    }

    if (moveId === 'wild_volt') {
      this.triggerVoice({
        freq: 329.63,
        endFreq: 1318.51,
        wave: 'pulse12',
        duration: 0.16,
        gain: 0.095,
      });
      this.triggerVoice({
        freq: 135,
        endFreq: 32,
        wave: 'triangle',
        duration: 0.24,
        gain: 0.17,
        delay: 0.08,
      });
      [1174.66, 1567.98, 987.77, 1318.51].forEach((f, i) => {
        this.triggerVoice({
          freq: f,
          endFreq: f * 0.52,
          wave: i % 2 === 0 ? 'pulse12' : 'pulse25',
          duration: 0.095,
          gain: 0.088,
          delay: 0.085 + i * 0.04,
        });
      });
      this.playNoise({
        duration: 0.2,
        gain: 0.15,
        filterType: 'lowpass',
        startFreq: 980,
        endFreq: 140,
        delay: 0.08,
      });
      return;
    }

    if (moveId === 'moonblast') {
      [587.33, 739.99, 880.0, 1174.66, 1318.51].forEach((f, i) => {
        this.triggerVoice({
          freq: f,
          endFreq: f * 1.03,
          wave: i % 2 === 0 ? 'sine' : 'triangle',
          duration: 0.15,
          gain: 0.085,
          delay: i * 0.036,
        });
      });
      this.triggerVoice({
        freq: 220,
        endFreq: 58,
        wave: 'triangle',
        duration: 0.28,
        gain: 0.15,
        delay: 0.12,
      });
      this.playNoise({
        duration: 0.22,
        gain: 0.1,
        filterType: 'bandpass',
        startFreq: 1100,
        endFreq: 520,
        q: 1.5,
        delay: 0.1,
      });
      return;
    }

    if (moveId === 'calm_aura') {
      [440.0, 554.37, 659.25, 880.0, 987.77].forEach((f, i) => {
        this.triggerVoice({
          freq: f,
          wave: 'sine',
          duration: 0.26,
          attack: 0.014,
          sustain: 0.52,
          gain: 0.09,
          delay: i * 0.055,
        });
        this.triggerVoice({
          freq: f * 0.5,
          wave: 'triangle',
          duration: 0.22,
          gain: 0.055,
          delay: i * 0.055,
        });
      });
      return;
    }

    if (moveId === 'shadow_pulse') {
      this.triggerVoice({
        freq: 349.23,
        midFreq: 466.16,
        endFreq: 207.65,
        wave: 'sine',
        duration: 0.3,
        gain: 0.12,
      });
      this.triggerVoice({
        freq: 523.25,
        midFreq: 392.0,
        endFreq: 246.94,
        wave: 'pulse12',
        duration: 0.28,
        gain: 0.078,
        delay: 0.04,
      });
      [415.3, 311.13].forEach((f, i) => {
        this.triggerVoice({
          freq: f,
          endFreq: f * 0.78,
          wave: 'sine',
          duration: 0.16,
          gain: 0.085,
          delay: 0.1 + i * 0.08,
        });
      });
      this.playNoise({
        duration: 0.26,
        gain: 0.1,
        filterType: 'bandpass',
        startFreq: 720,
        endFreq: 210,
        q: 2.0,
        delay: 0.02,
      });
      return;
    }

    if (moveId === 'iron_crush') {
      this.triggerVoice({
        freq: 987.77,
        endFreq: 880.0,
        wave: 'pulse12',
        duration: 0.14,
        gain: 0.085,
      });
      this.triggerVoice({
        freq: 739.99,
        endFreq: 659.25,
        wave: 'triangle',
        duration: 0.16,
        gain: 0.1,
        delay: 0.01,
      });
      this.triggerVoice({
        freq: 140,
        endFreq: 26,
        wave: 'triangle',
        duration: 0.26,
        gain: 0.22,
        delay: 0.04,
      });
      this.playNoise({
        duration: 0.22,
        gain: 0.22,
        filterType: 'lowpass',
        startFreq: 780,
        endFreq: 90,
        q: 0.75,
        delay: 0.04,
      });
      return;
    }

    if (moveId === 'glacier_crash') {
      [1046.5, 1318.51, 1567.98, 1975.53].forEach((f, i) => {
        this.triggerVoice({
          freq: f,
          endFreq: f * 1.04,
          wave: i % 2 === 0 ? 'pulse12' : 'sine',
          duration: 0.1,
          gain: 0.08,
          delay: i * 0.032,
        });
      });
      this.triggerVoice({
        freq: 165,
        endFreq: 36,
        wave: 'triangle',
        duration: 0.18,
        gain: 0.18,
        delay: 0.04,
      });
      this.playNoise({
        duration: 0.2,
        gain: 0.14,
        filterType: 'bandpass',
        startFreq: 1200,
        endFreq: 540,
        q: 1.8,
        delay: 0.02,
      });
      return;
    }

    if (moveId === 'magma_cannon') {
      this.triggerVoice({
        freq: 148,
        endFreq: 34,
        wave: 'triangle',
        duration: 0.3,
        gain: 0.19,
      });
      this.triggerVoice({
        freq: 293.66,
        endFreq: 110,
        wave: 'pulse25',
        duration: 0.22,
        gain: 0.09,
      });
      this.triggerVoice({
        freq: 349.23,
        endFreq: 98,
        wave: 'pulse25',
        duration: 0.24,
        gain: 0.09,
        delay: 0.06,
      });
      [0, 0.06, 0.12, 0.18].forEach((d, idx) => {
        this.playNoise({
          duration: 0.11,
          gain: 0.17 - idx * 0.02,
          filterType: idx % 2 === 0 ? 'bandpass' : 'lowpass',
          startFreq: 520 + idx * 140,
          endFreq: idx % 2 === 0 ? 1050 : 180,
          q: 1.2,
          delay: d,
        });
      });
      return;
    }

    if (moveId === 'leaf_blade') {
      this.playNoise({
        duration: 0.14,
        gain: 0.14,
        filterType: 'bandpass',
        startFreq: 1180,
        endFreq: 420,
        q: 1.5,
      });
      [659.25, 880.0, 1174.66].forEach((f, i) => {
        this.triggerVoice({
          freq: f,
          endFreq: f * 1.18,
          wave: i % 2 === 0 ? 'pulse12' : 'pulse25',
          duration: 0.085,
          gain: 0.09,
          delay: i * 0.038,
        });
      });
      this.playPhysicalImpact(62);
      return;
    }

    if (moveId === 'eruption_flare') {
      this.triggerVoice({
        freq: 175,
        endFreq: 36,
        wave: 'triangle',
        duration: 0.3,
        gain: 0.2,
      });
      this.triggerVoice({
        freq: 311.13,
        midFreq: 440,
        endFreq: 110,
        wave: 'pulse25',
        duration: 0.24,
        gain: 0.095,
      });
      [0, 0.055, 0.11, 0.17].forEach((d, idx) => {
        this.playNoise({
          duration: 0.12,
          gain: 0.18 - idx * 0.02,
          filterType: idx % 2 === 0 ? 'bandpass' : 'lowpass',
          startFreq: 480 + idx * 160,
          endFreq: idx % 2 === 0 ? 1120 : 190,
          q: 1.1,
          delay: d,
        });
      });
      return;
    }

    if (moveId === 'aura_sphere') {
      this.triggerVoice({
        freq: 329.63,
        endFreq: 659.25,
        wave: 'sine',
        duration: 0.18,
        gain: 0.11,
      });
      this.triggerVoice({
        freq: 440,
        endFreq: 880,
        wave: 'pulse12',
        duration: 0.18,
        gain: 0.075,
        delay: 0.02,
      });
      [523.25, 783.99, 1046.5].forEach((f, i) => {
        this.triggerVoice({
          freq: f,
          endFreq: f * 1.02,
          wave: i === 1 ? 'triangle' : 'sine',
          duration: 0.2,
          gain: 0.088,
          delay: 0.1 + i * 0.025,
        });
      });
      this.playNoise({
        duration: 0.15,
        gain: 0.12,
        filterType: 'lowpass',
        startFreq: 960,
        endFreq: 260,
        delay: 0.1,
      });
      return;
    }

    if (moveId === 'psycho_cut') {
      [0, 0.065].forEach((d, idx) => {
        this.triggerVoice({
          freq: idx === 0 ? 1046.5 : 1318.51,
          endFreq: idx === 0 ? 587.33 : 739.99,
          wave: 'pulse12',
          duration: 0.1,
          gain: 0.09,
          delay: d,
        });
        this.triggerVoice({
          freq: idx === 0 ? 783.99 : 987.77,
          endFreq: idx === 0 ? 440 : 523.25,
          wave: 'sine',
          duration: 0.12,
          gain: 0.085,
          delay: d + 0.012,
        });
      });
      this.playNoise({
        duration: 0.16,
        gain: 0.12,
        filterType: 'bandpass',
        startFreq: 1220,
        endFreq: 520,
        q: 1.8,
      });
      return;
    }

    if (moveId === 'aqua_tail') {
      this.playNoise({
        duration: 0.22,
        gain: 0.15,
        filterType: 'lowpass',
        startFreq: 1080,
        endFreq: 310,
      });
      [523.25, 659.25, 783.99, 987.77].forEach((f, i) => {
        this.triggerVoice({
          freq: f,
          endFreq: f * 1.04,
          wave: i % 2 === 0 ? 'sine' : 'pulse12',
          duration: 0.1,
          gain: 0.082,
          delay: i * 0.036,
        });
      });
      this.playPhysicalImpact(64);
      return;
    }

    if (moveId === 'draco_meteor') {
      [
        [1318.51, 392.0, 0],
        [1174.66, 329.63, 0.055],
        [1567.98, 440.0, 0.11],
      ].forEach(([f1, f2, d]) => {
        this.triggerVoice({
          freq: f1,
          endFreq: f2,
          wave: 'pulse12',
          duration: 0.14,
          gain: 0.085,
          delay: d,
        });
      });
      this.triggerVoice({
        freq: 196,
        endFreq: 28,
        wave: 'triangle',
        duration: 0.28,
        gain: 0.21,
        delay: 0.12,
      });
      this.playNoise({
        duration: 0.24,
        gain: 0.2,
        filterType: 'lowpass',
        startFreq: 860,
        endFreq: 110,
        q: 0.8,
        delay: 0.12,
      });
      return;
    }

    if (moveId === 'omen_wind') {
      this.triggerVoice({
        freq: 466.16,
        midFreq: 587.33,
        endFreq: 261.63,
        wave: 'sine',
        duration: 0.3,
        gain: 0.11,
      });
      [1046.5, 1318.51, 1567.98].forEach((f, i) => {
        this.triggerVoice({
          freq: f,
          endFreq: f * 0.94,
          wave: 'pulse12',
          duration: 0.12,
          gain: 0.072,
          delay: 0.03 + i * 0.045,
        });
      });
      this.playNoise({
        duration: 0.26,
        gain: 0.11,
        filterType: 'bandpass',
        startFreq: 960,
        endFreq: 340,
        q: 1.9,
        delay: 0.02,
      });
      return;
    }

    if (moveId === 'doom_desire') {
      [880.0, 1046.5, 1318.51, 1567.98].forEach((f, i) => {
        this.triggerVoice({
          freq: f,
          wave: i % 2 === 0 ? 'pulse12' : 'sine',
          duration: 0.14,
          gain: 0.08,
          delay: i * 0.04,
        });
      });
      [587.33, 880.0, 1174.66].forEach((f) => {
        this.triggerVoice({
          freq: f,
          endFreq: f * 1.01,
          wave: 'sine',
          duration: 0.28,
          gain: 0.09,
          delay: 0.16,
        });
      });
      this.triggerVoice({
        freq: 220,
        endFreq: 44,
        wave: 'triangle',
        duration: 0.26,
        gain: 0.18,
        delay: 0.16,
      });
      this.playNoise({
        duration: 0.2,
        gain: 0.13,
        filterType: 'bandpass',
        startFreq: 1120,
        endFreq: 480,
        q: 1.4,
        delay: 0.16,
      });
      return;
    }

    if (this._playSprint6MoveSfx(moveId)) {
      return;
    }

    switch (type) {
      case 'fire':
        this.triggerVoice({
          freq: 240,
          endFreq: 82,
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
            endFreq: 980,
            q: 1.4,
            delay: d,
          });
        });
        break;

      case 'water':
        this.playNoise({
          duration: 0.22,
          gain: 0.14,
          filterType: 'lowpass',
          startFreq: 920,
          endFreq: 300,
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
            endFreq: f * 1.1,
            wave: 'pulse25',
            duration: 0.095,
            gain: 0.09,
            delay: i * 0.048,
          });
        });
        this.playNoise({
          duration: 0.15,
          gain: 0.1,
          filterType: 'bandpass',
          startFreq: 900,
          endFreq: 440,
          q: 1.2,
        });
        break;

      case 'electric':
        this.triggerVoice({
          freq: 880,
          endFreq: 420,
          wave: 'pulse12',
          duration: 0.095,
          gain: 0.095,
          delay: 0,
        });
        this.triggerVoice({
          freq: 1046.5,
          endFreq: 523.25,
          wave: 'pulse25',
          duration: 0.115,
          gain: 0.1,
          delay: 0.065,
        });
        this.playNoise({
          duration: 0.11,
          gain: 0.11,
          filterType: 'bandpass',
          startFreq: 960,
          endFreq: 580,
          q: 1.6,
          delay: 0.02,
        });
        break;

      case 'rock':
        this.triggerVoice({
          freq: 112,
          endFreq: 24,
          wave: 'triangle',
          duration: 0.18,
          gain: 0.22,
        });
        this.playNoise({
          duration: 0.18,
          gain: 0.22,
          filterType: 'lowpass',
          startFreq: 580,
          endFreq: 100,
          q: 0.7,
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

      case 'ice':
        this.playNoise({
          duration: 0.24,
          gain: 0.11,
          filterType: 'bandpass',
          startFreq: 1150,
          endFreq: 680,
          q: 1.8,
        });
        [880, 1174.66, 1318.51, 1567.98].forEach((f, i) => {
          this.triggerVoice({
            freq: f,
            endFreq: f * 1.03,
            wave: i % 2 === 0 ? 'pulse12' : 'sine',
            duration: 0.11,
            gain: 0.082,
            delay: i * 0.042,
          });
        });
        break;

      case 'ghost':
        this.triggerVoice({
          freq: 370,
          midFreq: 493.88,
          endFreq: 233.08,
          wave: 'sine',
          duration: 0.28,
          gain: 0.12,
        });
        this.triggerVoice({
          freq: 554.37,
          midFreq: 440,
          endFreq: 311.13,
          wave: 'pulse12',
          duration: 0.26,
          gain: 0.072,
          delay: 0.05,
        });
        this.playNoise({
          duration: 0.24,
          gain: 0.09,
          filterType: 'bandpass',
          startFreq: 640,
          endFreq: 240,
          q: 1.9,
          delay: 0.02,
        });
        break;

      case 'dragon':
        this.triggerVoice({
          freq: 146.83,
          midFreq: 293.66,
          endFreq: 440,
          wave: 'pulse25',
          duration: 0.26,
          gain: 0.105,
        });
        this.triggerVoice({
          freq: 220,
          endFreq: 587.33,
          wave: 'triangle',
          duration: 0.24,
          gain: 0.13,
          delay: 0.04,
        });
        this.playNoise({
          duration: 0.22,
          gain: 0.14,
          filterType: 'lowpass',
          startFreq: 880,
          endFreq: 220,
          q: 0.85,
        });
        break;

      case 'wind':
        this.playNoise({
          duration: 0.22,
          gain: 0.16,
          filterType: 'bandpass',
          startFreq: 380,
          endFreq: 940,
          q: 1.5,
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

      case 'buff':
        this.playBuffChime();
        break;

      case 'shield':
        this.playShieldChime();
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
    this.triggerVoice({
      freq: 820,
      endFreq: 360,
      wave: 'triangle',
      duration: 0.055,
      attack: 0.003,
      decay: 0.02,
      sustain: 0.2,
      gain: 0.105 * scale,
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
      filterType: 'lowpass',
      startFreq: 860,
      endFreq: 340,
      q: 0.8,
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
      filterType: 'lowpass',
      startFreq: 860,
      endFreq: 280,
      q: 0.9,
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
    const lockTones = [523.25, 659.25, 783.99];
    lockTones.forEach((freq, i) => {
      this.triggerVoice({
        freq,
        wave: 'pulse25',
        duration: 0.14,
        gain: 0.095,
        delay: i * 0.11,
      });
    });

    const chordDelay = 0.34;
    [261.63, 523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      this.triggerVoice({
        freq,
        wave: i === 4 ? 'pulse25' : i === 0 ? 'triangle' : 'sine',
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
    const lead = [523.25, 659.25, 783.99, 1046.5];
    const harmony = [329.63, 392.0, 523.25, 659.25];
    lead.forEach((freq, i) => {
      const isLast = i === lead.length - 1;
      const delay = i * 0.095;
      const dur = isLast ? 0.38 : 0.12;
      this.triggerVoice({
        freq,
        wave: 'pulse25',
        duration: dur,
        gain: 0.095,
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
        wave: 'pulse25',
        duration: dur,
        gain: 0.1,
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

  playWindup(type = 'normal') {
    const highSweep = type === 'psychic' || type === 'ice' || type === 'electric' || type === 'ghost';
    const startFreq = highSweep ? 320 : 190;
    const endFreq = highSweep ? 680 : 390;
    this.triggerVoice({
      freq: startFreq,
      endFreq,
      wave: type === 'ghost' ? 'sine' : 'triangle',
      duration: 0.15,
      attack: 0.015,
      decay: 0.04,
      sustain: 0.45,
      gain: 0.075,
    });
  }

  playHitStop() {
    this.triggerVoice({
      freq: 92,
      endFreq: 28,
      wave: 'sine',
      duration: 0.085,
      attack: 0.002,
      decay: 0.03,
      sustain: 0.2,
      gain: 0.22,
    });
    this.playNoise({
      duration: 0.045,
      gain: 0.14,
      filterType: 'lowpass',
      startFreq: 420,
      endFreq: 90,
      q: 0.7,
      attack: 0.002,
    });
  }

  playBuffChime() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      this.triggerVoice({
        freq: f,
        wave: 'pulse25',
        duration: i === notes.length - 1 ? 0.22 : 0.085,
        gain: 0.08,
        delay: i * 0.055,
      });
      this.triggerVoice({
        freq: f * 0.5,
        wave: 'triangle',
        duration: 0.14,
        gain: 0.06,
        delay: i * 0.055,
      });
    });
  }

  playShieldChime() {
    const notes = [587.33, 880.0, 1174.66];
    notes.forEach((f, i) => {
      this.triggerVoice({
        freq: f,
        wave: 'sine',
        duration: 0.24,
        attack: 0.008,
        sustain: 0.5,
        gain: 0.105,
        delay: i * 0.06,
      });
      this.triggerVoice({
        freq: f * 0.5,
        wave: 'triangle',
        duration: 0.2,
        gain: 0.06,
        delay: i * 0.06,
      });
    });
  }

  playShinySparkle() {
    const notes = [659.25, 783.99, 987.77, 1318.51, 1567.98];
    notes.forEach((f, i) => {
      this.triggerVoice({
        freq: f,
        wave: i % 2 === 0 ? 'pulse12' : 'sine',
        duration: 0.14,
        attack: 0.004,
        sustain: 0.45,
        gain: 0.085,
        delay: i * 0.058,
      });
    });
  }

  playEvolutionStart() {
    const pulse = [293.66, 349.23, 440.0, 523.25, 659.25, 783.99];
    pulse.forEach((f, i) => {
      this.triggerVoice({
        freq: f,
        endFreq: f * 1.04,
        wave: 'pulse25',
        duration: 0.14,
        attack: 0.01,
        sustain: 0.55,
        gain: 0.08,
        delay: i * 0.11,
      });
      this.triggerVoice({
        freq: f * 0.5,
        wave: 'triangle',
        duration: 0.16,
        gain: 0.07,
        delay: i * 0.11,
      });
    });
  }

  playEvolutionFanfare() {
    const lead = [523.25, 659.25, 783.99, 1046.5, 987.77, 1046.5, 1318.51];
    const timings = [0, 0.09, 0.18, 0.27, 0.40, 0.49, 0.60];
    const durs = [0.09, 0.09, 0.09, 0.13, 0.09, 0.11, 0.50];
    lead.forEach((f, i) => {
      this.triggerVoice({
        freq: f,
        wave: 'pulse25',
        duration: durs[i],
        attack: 0.006,
        sustain: 0.58,
        gain: 0.095,
        delay: timings[i],
      });
      this.triggerVoice({
        freq: f * 0.5,
        wave: 'triangle',
        duration: durs[i],
        gain: 0.085,
        delay: timings[i],
      });
    });
    [261.63, 392.0, 523.25].forEach((f) => {
      this.triggerVoice({
        freq: f,
        wave: 'sine',
        duration: 0.52,
        gain: 0.08,
        delay: 0.60,
      });
    });
  }

  playXpTick(progress = 0.5) {
    const p = Math.max(0, Math.min(1, Number.isFinite(Number(progress)) ? Number(progress) : 0.5));
    const freq = 420 + p * 640;
    this.triggerVoice({
      freq,
      endFreq: freq * 1.06,
      wave: 'pulse25',
      duration: 0.048,
      attack: 0.002,
      decay: 0.018,
      sustain: 0.3,
      gain: 0.06,
    });
  }

  playStarBallShimmer() {
    const notes = [783.99, 987.77, 1174.66, 1567.98, 1975.53];
    notes.forEach((freq, i) => {
      this.triggerVoice({
        freq,
        endFreq: freq * 1.03,
        wave: i % 2 === 0 ? 'pulse12' : 'sine',
        duration: 0.16,
        attack: 0.004,
        decay: 0.04,
        sustain: 0.45,
        gain: 0.08,
        delay: i * 0.048,
      });
    });
    this.triggerVoice({
      freq: 392.0,
      endFreq: 783.99,
      wave: 'triangle',
      duration: 0.28,
      gain: 0.085,
      delay: 0.02,
    });
  }

  playUpgradeFanfare() {
    const lead = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51, 1567.98];
    lead.forEach((freq, i) => {
      const isFinal = i === lead.length - 1;
      const delay = i * 0.068;
      const duration = isFinal ? 0.42 : 0.14;
      this.triggerVoice({
        freq,
        endFreq: freq * 1.015,
        wave: i % 2 === 0 ? 'sine' : 'pulse12',
        duration,
        attack: 0.005,
        decay: 0.04,
        sustain: 0.52,
        gain: isFinal ? 0.095 : 0.082,
        delay,
      });
      this.triggerVoice({
        freq: freq * 0.5,
        wave: 'triangle',
        duration,
        gain: isFinal ? 0.095 : 0.062,
        delay,
      });
    });
    [523.25, 783.99, 1046.5].forEach((freq) => {
      this.triggerVoice({
        freq,
        wave: 'sine',
        duration: 0.48,
        attack: 0.01,
        sustain: 0.55,
        gain: 0.075,
        delay: 0.408,
      });
    });
  }

  playBuddyCheer() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const isLast = i === notes.length - 1;
      const delay = i * 0.068;
      this.triggerVoice({
        freq,
        endFreq: freq * 1.02,
        wave: i % 2 === 0 ? 'sine' : 'pulse25',
        duration: isLast ? 0.34 : 0.14,
        attack: 0.006,
        sustain: 0.52,
        gain: isLast ? 0.105 : 0.088,
        delay,
      });
      this.triggerVoice({
        freq: freq * 0.5,
        wave: 'triangle',
        duration: isLast ? 0.3 : 0.13,
        gain: 0.065,
        delay,
      });
    });
  }

  playBuddyEndure() {
    this.triggerVoice({
      freq: 146.83,
      endFreq: 82.41,
      wave: 'triangle',
      duration: 0.12,
      attack: 0.004,
      sustain: 0.4,
      gain: 0.13,
    });
    const resolveNotes = [440.0, 554.37, 659.25, 880.0, 1108.73];
    resolveNotes.forEach((freq, i) => {
      const isLast = i === resolveNotes.length - 1;
      const delay = 0.07 + i * 0.062;
      this.triggerVoice({
        freq,
        endFreq: freq * 1.015,
        wave: i % 2 === 0 ? 'sine' : 'pulse25',
        duration: isLast ? 0.38 : 0.15,
        attack: 0.006,
        sustain: 0.55,
        gain: isLast ? 0.105 : 0.088,
        delay,
      });
      this.triggerVoice({
        freq: freq * 0.5,
        wave: 'triangle',
        duration: isLast ? 0.34 : 0.14,
        gain: 0.062,
        delay,
      });
    });
  }

  _playSprint6MoveSfx(moveId) {
    switch (moveId) {
      case 'frenzy_flora':
        this.playNoise({
          duration: 0.28,
          gain: 0.14,
          filterType: 'bandpass',
          startFreq: 980,
          endFreq: 380,
          q: 1.4,
        });
        [440, 554.37, 659.25, 830.61, 1108.73].forEach((f, i) => {
          this.triggerVoice({
            freq: f,
            endFreq: f * 1.08,
            wave: i % 2 === 0 ? 'pulse25' : 'triangle',
            duration: 0.12,
            gain: 0.082,
            delay: i * 0.042,
          });
        });
        this.triggerVoice({
          freq: 146.83,
          endFreq: 48,
          wave: 'triangle',
          duration: 0.22,
          gain: 0.15,
          delay: 0.14,
        });
        return true;

      case 'spore_burst':
        this.playNoise({
          duration: 0.22,
          gain: 0.1,
          filterType: 'bandpass',
          startFreq: 860,
          endFreq: 480,
          q: 1.6,
        });
        [523.25, 622.25, 783.99, 932.33, 1174.66].forEach((f, i) => {
          this.triggerVoice({
            freq: f,
            endFreq: f * 1.12,
            wave: i % 2 === 0 ? 'sine' : 'pulse12',
            duration: 0.12,
            gain: 0.078,
            delay: i * 0.04,
          });
        });
        return true;

      case 'solar_blade':
        this.triggerVoice({
          freq: 329.63,
          endFreq: 987.77,
          wave: 'pulse25',
          duration: 0.14,
          gain: 0.09,
        });
        [0.05, 0.11].forEach((d, idx) => {
          this.playNoise({
            duration: 0.11,
            gain: 0.14,
            filterType: 'bandpass',
            startFreq: idx === 0 ? 1150 : 1280,
            endFreq: 420,
            q: 1.7,
            delay: d,
          });
        });
        this.playPhysicalImpact(76);
        return true;

      case 'fiery_dance':
        [440, 523.25, 659.25, 783.99, 880].forEach((f, i) => {
          this.triggerVoice({
            freq: f,
            endFreq: f * 1.04,
            wave: i % 2 === 0 ? 'pulse25' : 'triangle',
            duration: 0.11,
            gain: 0.084,
            delay: i * 0.044,
          });
        });
        [0, 0.09].forEach((d) => {
          this.playNoise({
            duration: 0.12,
            gain: 0.13,
            filterType: 'bandpass',
            startFreq: 520,
            endFreq: 1020,
            q: 1.3,
            delay: d,
          });
        });
        return true;

      case 'hydro_vortex':
        this.playNoise({
          duration: 0.28,
          gain: 0.16,
          filterType: 'lowpass',
          startFreq: 980,
          endFreq: 240,
        });
        [
          [261.63, 523.25, 0],
          [329.63, 659.25, 0.06],
          [392.0, 783.99, 0.12],
        ].forEach(([f1, f2, d]) => {
          this.triggerVoice({
            freq: f1,
            endFreq: f2,
            wave: 'sine',
            duration: 0.12,
            gain: 0.1,
            delay: d,
          });
        });
        this.triggerVoice({
          freq: 130.81,
          endFreq: 34,
          wave: 'triangle',
          duration: 0.24,
          gain: 0.17,
          delay: 0.12,
        });
        return true;

      case 'razor_shell':
        this.triggerVoice({
          freq: 1046.5,
          endFreq: 1318.51,
          wave: 'pulse12',
          duration: 0.07,
          gain: 0.078,
        });
        this.triggerVoice({
          freq: 587.33,
          midFreq: 783.99,
          endFreq: 493.88,
          wave: 'sine',
          duration: 0.18,
          gain: 0.1,
          delay: 0.03,
        });
        this.playPhysicalImpact(66);
        return true;

      case 'plasma_cannon':
        [659.25, 987.77].forEach((f, i) => {
          this.triggerVoice({
            freq: f,
            wave: 'pulse12',
            duration: 0.06,
            gain: 0.078,
            delay: i * 0.035,
          });
        });
        this.triggerVoice({
          freq: 1174.66,
          midFreq: 659.25,
          endFreq: 293.66,
          wave: 'pulse25',
          duration: 0.24,
          gain: 0.1,
          delay: 0.07,
        });
        this.triggerVoice({
          freq: 146.83,
          endFreq: 32,
          wave: 'triangle',
          duration: 0.22,
          gain: 0.18,
          delay: 0.1,
        });
        this.playNoise({
          duration: 0.18,
          gain: 0.14,
          filterType: 'bandpass',
          startFreq: 1080,
          endFreq: 280,
          q: 1.5,
          delay: 0.07,
        });
        return true;

      case 'volt_tackle':
        this.triggerVoice({
          freq: 293.66,
          endFreq: 1174.66,
          wave: 'pulse12',
          duration: 0.15,
          gain: 0.09,
        });
        this.playPhysicalImpact(72);
        [1046.5, 1318.51, 880.0].forEach((f, i) => {
          this.triggerVoice({
            freq: f,
            endFreq: f * 0.62,
            wave: i % 2 === 0 ? 'pulse12' : 'pulse25',
            duration: 0.095,
            gain: 0.085,
            delay: 0.07 + i * 0.038,
          });
        });
        return true;

      case 'sandstorm_crush':
        this.playNoise({
          duration: 0.26,
          gain: 0.16,
          filterType: 'bandpass',
          startFreq: 720,
          endFreq: 340,
          q: 1.2,
        });
        [118, 98].forEach((f, i) => {
          this.triggerVoice({
            freq: f,
            endFreq: 24,
            wave: 'triangle',
            duration: 0.18,
            gain: 0.2,
            delay: 0.04 + i * 0.075,
          });
        });
        this.playNoise({
          duration: 0.2,
          gain: 0.2,
          filterType: 'lowpass',
          startFreq: 660,
          endFreq: 95,
          q: 0.7,
          delay: 0.08,
        });
        return true;

      case 'prism_laser':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          this.triggerVoice({
            freq: f,
            wave: i % 2 === 0 ? 'sine' : 'pulse12',
            duration: 0.12,
            gain: 0.075,
            delay: i * 0.025,
          });
        });
        this.triggerVoice({
          freq: 880,
          midFreq: 1318.51,
          endFreq: 659.25,
          wave: 'sine',
          duration: 0.24,
          gain: 0.11,
          delay: 0.06,
        });
        this.playNoise({
          duration: 0.18,
          gain: 0.1,
          filterType: 'bandpass',
          startFreq: 1200,
          endFreq: 620,
          q: 2.0,
          delay: 0.08,
        });
        return true;

      case 'zen_meteor':
        this.triggerVoice({
          freq: 392.0,
          endFreq: 783.99,
          wave: 'sine',
          duration: 0.16,
          gain: 0.105,
        });
        this.triggerVoice({
          freq: 175,
          endFreq: 32,
          wave: 'triangle',
          duration: 0.24,
          gain: 0.2,
          delay: 0.09,
        });
        this.triggerVoice({
          freq: 987.77,
          endFreq: 659.25,
          wave: 'sine',
          duration: 0.18,
          gain: 0.085,
          delay: 0.11,
        });
        this.playNoise({
          duration: 0.18,
          gain: 0.17,
          filterType: 'lowpass',
          startFreq: 760,
          endFreq: 110,
          delay: 0.09,
        });
        return true;

      case 'icicle_spear':
        this.triggerVoice({
          freq: 1174.66,
          wave: 'sine',
          duration: 0.08,
          gain: 0.075,
        });
        [987.77, 1174.66, 1318.51].forEach((f, i) => {
          this.triggerVoice({
            freq: f,
            endFreq: f * 0.76,
            wave: i % 2 === 0 ? 'pulse12' : 'sine',
            duration: 0.085,
            gain: 0.082,
            delay: 0.03 + i * 0.055,
          });
        });
        this.playNoise({
          duration: 0.2,
          gain: 0.12,
          filterType: 'bandpass',
          startFreq: 1220,
          endFreq: 560,
          q: 1.8,
          delay: 0.08,
        });
        return true;

      case 'spectral_lantern':
        this.triggerVoice({
          freq: 349.23,
          midFreq: 523.25,
          endFreq: 246.94,
          wave: 'sine',
          duration: 0.3,
          gain: 0.11,
        });
        [622.25, 466.16, 739.99].forEach((f, i) => {
          this.triggerVoice({
            freq: f,
            endFreq: f * 0.88,
            wave: 'pulse12',
            duration: 0.13,
            gain: 0.072,
            delay: 0.04 + i * 0.06,
          });
        });
        this.playNoise({
          duration: 0.24,
          gain: 0.095,
          filterType: 'bandpass',
          startFreq: 680,
          endFreq: 240,
          q: 2.0,
        });
        return true;

      case 'night_daze':
        this.triggerVoice({
          freq: 293.66,
          midFreq: 440.0,
          endFreq: 196.0,
          wave: 'sine',
          duration: 0.28,
          gain: 0.115,
        });
        [659.25, 493.88, 392.0].forEach((f, i) => {
          this.triggerVoice({
            freq: f,
            endFreq: f * 0.82,
            wave: 'pulse12',
            duration: 0.12,
            gain: 0.078,
            delay: 0.04 + i * 0.052,
          });
        });
        this.playNoise({
          duration: 0.22,
          gain: 0.12,
          filterType: 'bandpass',
          startFreq: 940,
          endFreq: 260,
          q: 1.7,
          delay: 0.05,
        });
        return true;

      case 'dragon_rush':
        this.triggerVoice({
          freq: 196.0,
          endFreq: 587.33,
          wave: 'pulse25',
          duration: 0.18,
          gain: 0.095,
        });
        this.playNoise({
          duration: 0.22,
          gain: 0.15,
          filterType: 'bandpass',
          startFreq: 440,
          endFreq: 1050,
          q: 1.2,
        });
        this.triggerVoice({
          freq: 135,
          endFreq: 28,
          wave: 'triangle',
          duration: 0.26,
          gain: 0.2,
          delay: 0.08,
        });
        [293.66, 440.0].forEach((f) => {
          this.triggerVoice({
            freq: f,
            wave: 'pulse25',
            duration: 0.2,
            gain: 0.075,
            delay: 0.1,
          });
        });
        return true;

      case 'dune_aegis':
        [220.0, 329.63].forEach((f) => {
          this.triggerVoice({
            freq: f,
            wave: 'triangle',
            duration: 0.22,
            gain: 0.085,
          });
        });
        [587.33, 739.99, 880.0, 1174.66].forEach((f, i) => {
          this.triggerVoice({
            freq: f,
            wave: 'sine',
            duration: 0.22,
            attack: 0.008,
            sustain: 0.5,
            gain: 0.092,
            delay: i * 0.048,
          });
        });
        this.playNoise({
          duration: 0.16,
          gain: 0.08,
          filterType: 'bandpass',
          startFreq: 920,
          endFreq: 480,
          q: 1.4,
        });
        return true;

      default:
        return false;
    }
  }

  playAbilityCue(abilityId = '', type = 'normal') {
    const id = String(abilityId || '');
    switch (id) {
      case 'overgrow':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          this.triggerVoice({ freq: f, wave: 'pulse25', duration: 0.1, gain: 0.075, delay: i * 0.036 });
        });
        return;
      case 'blaze':
        [392.0, 493.88, 587.33, 783.99].forEach((f, i) => {
          this.triggerVoice({ freq: f, endFreq: f * 1.04, wave: 'pulse25', duration: 0.11, gain: 0.08, delay: i * 0.036 });
        });
        this.playNoise({ duration: 0.12, gain: 0.09, filterType: 'bandpass', startFreq: 520, endFreq: 980, q: 1.4 });
        return;
      case 'torrent':
        [440.0, 587.33, 783.99, 987.77].forEach((f, i) => {
          this.triggerVoice({ freq: f, wave: i % 2 === 0 ? 'sine' : 'triangle', duration: 0.12, gain: 0.082, delay: i * 0.038 });
        });
        return;
      case 'volt_reflex':
        [783.99, 1046.5, 1318.51].forEach((f, i) => {
          this.triggerVoice({ freq: f, endFreq: f * 1.05, wave: 'pulse12', duration: 0.08, gain: 0.08, delay: i * 0.03 });
        });
        return;
      case 'storm_conduit':
        [659.25, 987.77, 1318.51].forEach((f, i) => {
          this.triggerVoice({ freq: f, wave: 'pulse12', duration: 0.1, gain: 0.08, delay: i * 0.036 });
          this.triggerVoice({ freq: f * 0.5, wave: 'triangle', duration: 0.11, gain: 0.055, delay: i * 0.036 });
        });
        return;
      case 'diamond_guard':
        [587.33, 880.0, 1174.66].forEach((f, i) => {
          this.triggerVoice({ freq: f, wave: 'sine', duration: 0.2, gain: 0.09, delay: i * 0.045 });
        });
        return;
      case 'dune_titan':
        this.triggerVoice({ freq: 146.83, endFreq: 220.0, wave: 'triangle', duration: 0.16, gain: 0.12 });
        [440.0, 554.37, 659.25].forEach((f, i) => {
          this.triggerVoice({ freq: f, wave: 'pulse25', duration: 0.11, gain: 0.07, delay: 0.03 + i * 0.038 });
        });
        return;
      case 'mystic_prism':
        [659.25, 830.61, 987.77, 1318.51].forEach((f, i) => {
          this.triggerVoice({ freq: f, wave: i % 2 === 0 ? 'sine' : 'pulse12', duration: 0.12, gain: 0.078, delay: i * 0.035 });
        });
        return;
      case 'cosmic_presence':
        [293.66, 440.0, 659.25, 880.0, 1174.66].forEach((f, i) => {
          this.triggerVoice({ freq: f, wave: i === 0 ? 'triangle' : 'sine', duration: 0.16, gain: 0.08, delay: i * 0.036 });
        });
        return;
      case 'permafrost':
        [987.77, 1174.66, 1318.51].forEach((f, i) => {
          this.triggerVoice({ freq: f, wave: i % 2 === 0 ? 'sine' : 'pulse12', duration: 0.13, gain: 0.075, delay: i * 0.038 });
        });
        return;
      case 'shadow_cloak':
        [392.0, 466.16, 587.33, 311.13].forEach((f, i) => {
          this.triggerVoice({ freq: f, wave: i % 2 === 0 ? 'sine' : 'pulse12', duration: 0.14, gain: 0.075, delay: i * 0.042 });
        });
        return;
      case 'dragon_heart':
        [293.66, 440.0, 587.33, 880.0].forEach((f, i) => {
          this.triggerVoice({ freq: f, wave: i === 0 ? 'triangle' : 'pulse25', duration: 0.14, gain: 0.082, delay: i * 0.04 });
        });
        return;
      case 'prism_scales':
        [523.25, 783.99, 987.77, 1318.51].forEach((f, i) => {
          this.triggerVoice({ freq: f, wave: 'sine', duration: 0.16, gain: 0.082, delay: i * 0.04 });
        });
        return;
      case 'starlight_grace':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          this.triggerVoice({ freq: f, wave: 'sine', duration: 0.18, gain: 0.09, delay: i * 0.05 });
        });
        return;
      default: {
        const fallbackByType = {
          grass: 'overgrow',
          fire: 'blaze',
          water: 'torrent',
          electric: 'storm_conduit',
          rock: 'diamond_guard',
          psychic: 'mystic_prism',
          ice: 'permafrost',
          ghost: 'shadow_cloak',
          dragon: 'dragon_heart',
        };
        if (fallbackByType[type]) {
          this.playAbilityCue(fallbackByType[type], 'normal');
        } else {
          this.playBuffChime();
        }
        return;
      }
    }
  }
}

export const audio = new AudioEngine();
