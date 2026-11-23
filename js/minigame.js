// Secret Unlockable Mini-Game: Starlight Sky-Hop Arcade

import * as PokemonMod from './pokemon.js';
import { EVOLUTION_ITEMS, SPECIES, TYPES, getBiomeAt } from './config.js';
import { THEMES } from './audio.js';
import { ARCADE_SHARD_BUYIN_COST, MAX_ARCADE_CHARGES } from './storage.js';

const CANVAS_W = 760;
const CANVAS_H = 420;
const PLAYER_X = 132;
const PLAYER_MIN_Y = 40;
const PLAYER_MAX_Y = CANVAS_H - 40;
const MAX_HEARTS = 3;

export const MIN_ARCADE_REWARD_SCORE = 80;
export const MAX_ARCADE_SHARDS = 4;

const BASE_GEM_POOL = ['leaf_gem', 'fire_gem', 'water_gem', 'thunder_gem', 'moon_gem', 'sun_gem'];
const MID_GEM_POOL = ['ice_gem', 'dusk_gem', 'astral_gem'];
const ENDGAME_GEM_POOL = ['prism_gem', 'chrono_gem', 'nebula_gem', 'pixie_gem', 'alola_gem', 'crown_gem', 'tera_gem'];

export function getUnlockedArcadeGemPool(profile = null) {
  const badgeCount = Array.isArray(profile?.badges) ? profile.badges.length : 0;
  const pool = [...BASE_GEM_POOL];
  if (badgeCount >= 3) {
    pool.push(...MID_GEM_POOL);
  }
  if (badgeCount >= 8) {
    pool.push(...ENDGAME_GEM_POOL);
  }
  return pool.filter((id) => Boolean(EVOLUTION_ITEMS?.[id]));
}

export const WAVE_TEMPLATES = [
  {
    id: 'rising_arc',
    name: 'Rising Starlight Arc',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.78 },
      { delay: 0.25, kind: 'cloud', yFrac: 0.5 },
      { delay: 0.35, kind: 'star', yFrac: 0.66 },
      { delay: 0.7, kind: 'star', yFrac: 0.54 },
      { delay: 0.78, kind: 'cloud', yFrac: 0.32 },
      { delay: 1.05, kind: 'bigstar', yFrac: 0.42 },
      { delay: 1.25, kind: 'storm_orb', yFrac: 0.56 },
      { delay: 1.4, kind: 'star', yFrac: 0.3 },
      { delay: 1.75, kind: 'star', yFrac: 0.2 },
      { delay: 1.75, kind: 'cloud', yFrac: 0.76 },
    ],
  },
  {
    id: 'falling_cascade',
    name: 'Starfall Cascade',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.2 },
      { delay: 0.28, kind: 'cloud', yFrac: 0.48 },
      { delay: 0.35, kind: 'star', yFrac: 0.32 },
      { delay: 0.7, kind: 'star', yFrac: 0.46 },
      { delay: 0.85, kind: 'cloud', yFrac: 0.22 },
      { delay: 1.05, kind: 'bigstar', yFrac: 0.6 },
      { delay: 1.22, kind: 'storm_orb', yFrac: 0.46 },
      { delay: 1.4, kind: 'star', yFrac: 0.74 },
      { delay: 1.75, kind: 'star', yFrac: 0.82 },
      { delay: 1.82, kind: 'cloud', yFrac: 0.56 },
    ],
  },
  {
    id: 'sine_ribbon',
    name: 'Celestial Ribbon',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.5 },
      { delay: 0.32, kind: 'star', yFrac: 0.34 },
      { delay: 0.42, kind: 'cloud', yFrac: 0.54 },
      { delay: 0.64, kind: 'star', yFrac: 0.24 },
      { delay: 0.85, kind: 'cloud', yFrac: 0.78 },
      { delay: 0.96, kind: 'star', yFrac: 0.36 },
      { delay: 1.15, kind: 'storm_orb', yFrac: 0.5 },
      { delay: 1.28, kind: 'star', yFrac: 0.56 },
      { delay: 1.6, kind: 'bigstar', yFrac: 0.72 },
      { delay: 1.85, kind: 'cloud', yFrac: 0.22 },
      { delay: 1.92, kind: 'star', yFrac: 0.56 },
    ],
  },
  {
    id: 'twin_lanes',
    name: 'Twin Sky Lanes',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.25 },
      { delay: 0.0, kind: 'cloud', yFrac: 0.5 },
      { delay: 0.0, kind: 'star', yFrac: 0.75 },
      { delay: 0.45, kind: 'star', yFrac: 0.25 },
      { delay: 0.45, kind: 'star', yFrac: 0.75 },
      { delay: 0.9, kind: 'cloud', yFrac: 0.5 },
      { delay: 0.9, kind: 'cloud', yFrac: 0.26 },
      { delay: 1.3, kind: 'bigstar', yFrac: 0.25 },
      { delay: 1.3, kind: 'storm_orb', yFrac: 0.5 },
      { delay: 1.3, kind: 'bigstar', yFrac: 0.75 },
      { delay: 1.85, kind: 'cloud', yFrac: 0.5 },
      { delay: 1.85, kind: 'cloud', yFrac: 0.74 },
    ],
  },
  {
    id: 'diamond_constellation',
    name: 'Diamond Constellation',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.5 },
      { delay: 0.35, kind: 'star', yFrac: 0.34 },
      { delay: 0.35, kind: 'cloud', yFrac: 0.5 },
      { delay: 0.35, kind: 'star', yFrac: 0.66 },
      { delay: 0.7, kind: 'star', yFrac: 0.22 },
      { delay: 0.7, kind: 'bigstar', yFrac: 0.5 },
      { delay: 0.7, kind: 'star', yFrac: 0.78 },
      { delay: 1.05, kind: 'star', yFrac: 0.34 },
      { delay: 1.05, kind: 'storm_orb', yFrac: 0.5 },
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
      { delay: 0.45, kind: 'cloud', yFrac: 0.3 },
      { delay: 0.58, kind: 'comet', yFrac: 0.48, speedMult: 1.25 },
      { delay: 0.92, kind: 'storm_orb', yFrac: 0.52 },
      { delay: 1.05, kind: 'cloud', yFrac: 0.24 },
      { delay: 1.05, kind: 'cloud', yFrac: 0.74 },
      { delay: 1.5, kind: 'star', yFrac: 0.48 },
      { delay: 1.8, kind: 'comet', yFrac: 0.35, speedMult: 1.25 },
      { delay: 1.82, kind: 'cloud', yFrac: 0.64 },
    ],
  },
  {
    id: 'zigzag_sky',
    name: 'Skyline Zigzag',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.24 },
      { delay: 0.22, kind: 'cloud', yFrac: 0.5 },
      { delay: 0.4, kind: 'star', yFrac: 0.5 },
      { delay: 0.55, kind: 'cloud', yFrac: 0.82 },
      { delay: 0.8, kind: 'star', yFrac: 0.76 },
      { delay: 1.05, kind: 'storm_orb', yFrac: 0.48 },
      { delay: 1.2, kind: 'bigstar', yFrac: 0.5 },
      { delay: 1.45, kind: 'cloud', yFrac: 0.18 },
      { delay: 1.6, kind: 'star', yFrac: 0.24 },
      { delay: 1.78, kind: 'cloud', yFrac: 0.58 },
      { delay: 2.0, kind: 'star', yFrac: 0.5 },
    ],
  },
  {
    id: 'sky_ladder',
    name: 'Starlight Ladder',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.8 },
      { delay: 0.35, kind: 'star', yFrac: 0.65 },
      { delay: 0.4, kind: 'cloud', yFrac: 0.44 },
      { delay: 0.7, kind: 'star', yFrac: 0.5 },
      { delay: 0.75, kind: 'cloud', yFrac: 0.22 },
      { delay: 1.05, kind: 'star', yFrac: 0.35 },
      { delay: 1.15, kind: 'storm_orb', yFrac: 0.62 },
      { delay: 1.4, kind: 'bigstar', yFrac: 0.2 },
      { delay: 1.65, kind: 'cloud', yFrac: 0.72 },
      { delay: 1.75, kind: 'cloud', yFrac: 0.42 },
    ],
  },
  {
    id: 'orbit_halo',
    name: 'Astral Orbit Halo',
    items: [
      { delay: 0.1, kind: 'star', yFrac: 0.35 },
      { delay: 0.1, kind: 'cloud', yFrac: 0.5 },
      { delay: 0.1, kind: 'star', yFrac: 0.65 },
      { delay: 0.45, kind: 'star', yFrac: 0.22 },
      { delay: 0.45, kind: 'comet', yFrac: 0.5 },
      { delay: 0.45, kind: 'star', yFrac: 0.78 },
      { delay: 0.8, kind: 'star', yFrac: 0.35 },
      { delay: 0.8, kind: 'storm_orb', yFrac: 0.5 },
      { delay: 0.8, kind: 'star', yFrac: 0.65 },
      { delay: 1.3, kind: 'void_meteor', yFrac: 0.3 },
      { delay: 1.45, kind: 'cloud', yFrac: 0.48 },
    ],
  },
  {
    id: 'meteor_shower',
    name: 'Prism Meteor Shower',
    items: [
      { delay: 0.0, kind: 'comet', yFrac: 0.24, speedMult: 1.2 },
      { delay: 0.2, kind: 'void_meteor', yFrac: 0.56 },
      { delay: 0.4, kind: 'star', yFrac: 0.42 },
      { delay: 0.75, kind: 'comet', yFrac: 0.6, speedMult: 1.2 },
      { delay: 0.9, kind: 'cloud', yFrac: 0.22 },
      { delay: 1.15, kind: 'star', yFrac: 0.78 },
      { delay: 1.25, kind: 'storm_orb', yFrac: 0.48 },
      { delay: 1.5, kind: 'bigstar', yFrac: 0.46 },
      { delay: 1.75, kind: 'cloud', yFrac: 0.76 },
    ],
  },
  {
    id: 'aurora_bridge',
    name: 'Aurora Sky Bridge',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.5 },
      { delay: 0.25, kind: 'cloud', yFrac: 0.32 },
      { delay: 0.3, kind: 'star', yFrac: 0.5 },
      { delay: 0.45, kind: 'cloud', yFrac: 0.22 },
      { delay: 0.45, kind: 'cloud', yFrac: 0.78 },
      { delay: 0.6, kind: 'bigstar', yFrac: 0.5 },
      { delay: 0.9, kind: 'star', yFrac: 0.5 },
      { delay: 0.95, kind: 'storm_orb', yFrac: 0.66 },
      { delay: 1.2, kind: 'star', yFrac: 0.5 },
      { delay: 1.45, kind: 'cloud', yFrac: 0.24 },
      { delay: 1.45, kind: 'void_meteor', yFrac: 0.52 },
      { delay: 1.45, kind: 'cloud', yFrac: 0.76 },
    ],
  },
  {
    id: 'double_helix',
    name: 'Cosmic Double Helix',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.3 },
      { delay: 0.0, kind: 'cloud', yFrac: 0.5 },
      { delay: 0.0, kind: 'star', yFrac: 0.7 },
      { delay: 0.45, kind: 'star', yFrac: 0.46 },
      { delay: 0.45, kind: 'star', yFrac: 0.54 },
      { delay: 0.9, kind: 'star', yFrac: 0.7 },
      { delay: 0.9, kind: 'storm_orb', yFrac: 0.5 },
      { delay: 0.9, kind: 'star', yFrac: 0.3 },
      { delay: 1.35, kind: 'bigstar', yFrac: 0.5 },
      { delay: 1.65, kind: 'void_meteor', yFrac: 0.42 },
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
      { delay: 0.35, kind: 'cloud', yFrac: 0.48 },
      { delay: 0.5, kind: 'bigstar', yFrac: 0.26 },
      { delay: 0.65, kind: 'cloud', yFrac: 0.62 },
      { delay: 1.0, kind: 'storm_orb', yFrac: 0.38 },
      { delay: 1.1, kind: 'star', yFrac: 0.74 },
      { delay: 1.35, kind: 'star', yFrac: 0.74 },
      { delay: 1.6, kind: 'comet', yFrac: 0.74 },
      { delay: 1.7, kind: 'cloud', yFrac: 0.34 },
      { delay: 1.75, kind: 'void_meteor', yFrac: 0.56 },
    ],
  },
  {
    id: 'starlight_crown',
    name: 'Starlight Crown',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.68 },
      { delay: 0.25, kind: 'cloud', yFrac: 0.42 },
      { delay: 0.35, kind: 'star', yFrac: 0.44 },
      { delay: 0.7, kind: 'star', yFrac: 0.6 },
      { delay: 0.85, kind: 'storm_orb', yFrac: 0.48 },
      { delay: 1.05, kind: 'bigstar', yFrac: 0.25 },
      { delay: 1.05, kind: 'cloud', yFrac: 0.78 },
      { delay: 1.4, kind: 'star', yFrac: 0.6 },
      { delay: 1.55, kind: 'void_meteor', yFrac: 0.36 },
      { delay: 1.75, kind: 'star', yFrac: 0.44 },
      { delay: 2.1, kind: 'star', yFrac: 0.68 },
    ],
  },
  {
    id: 'starlight_spiral',
    name: 'Starlight Spiral',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.5 },
      { delay: 0.28, kind: 'star', yFrac: 0.34 },
      { delay: 0.32, kind: 'cloud', yFrac: 0.64 },
      { delay: 0.56, kind: 'star', yFrac: 0.22 },
      { delay: 0.84, kind: 'bigstar', yFrac: 0.36 },
      { delay: 0.92, kind: 'cloud', yFrac: 0.18 },
      { delay: 1.12, kind: 'star', yFrac: 0.54 },
      { delay: 1.24, kind: 'storm_orb', yFrac: 0.42 },
      { delay: 1.4, kind: 'star', yFrac: 0.72 },
      { delay: 1.68, kind: 'comet', yFrac: 0.8, speedMult: 1.2 },
      { delay: 1.8, kind: 'cloud', yFrac: 0.48 },
    ],
  },
  {
    id: 'prism_slalom',
    name: 'Prism Slalom',
    items: [
      { delay: 0.0, kind: 'cloud', yFrac: 0.24 },
      { delay: 0.05, kind: 'star', yFrac: 0.46 },
      { delay: 0.35, kind: 'star', yFrac: 0.62 },
      { delay: 0.5, kind: 'cloud', yFrac: 0.8 },
      { delay: 0.7, kind: 'bigstar', yFrac: 0.52 },
      { delay: 0.9, kind: 'cloud', yFrac: 0.24 },
      { delay: 1.05, kind: 'star', yFrac: 0.44 },
      { delay: 1.28, kind: 'storm_orb', yFrac: 0.68 },
      { delay: 1.4, kind: 'star', yFrac: 0.3 },
      { delay: 1.65, kind: 'comet', yFrac: 0.24, speedMult: 1.22 },
      { delay: 1.85, kind: 'cloud', yFrac: 0.58 },
    ],
  },
  {
    id: 'meteor_weave',
    name: 'Starlight Weave',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.32 },
      { delay: 0.0, kind: 'star', yFrac: 0.68 },
      { delay: 0.35, kind: 'cloud', yFrac: 0.5 },
      { delay: 0.5, kind: 'comet', yFrac: 0.26, speedMult: 1.2 },
      { delay: 0.82, kind: 'star', yFrac: 0.72 },
      { delay: 1.05, kind: 'void_meteor', yFrac: 0.46 },
      { delay: 1.15, kind: 'bigstar', yFrac: 0.24 },
      { delay: 1.45, kind: 'cloud', yFrac: 0.78 },
      { delay: 1.6, kind: 'star', yFrac: 0.56 },
      { delay: 1.88, kind: 'star', yFrac: 0.38 },
    ],
  },
  {
    id: 'eclipse_gate',
    name: 'Eclipse Twin Gate',
    items: [
      { delay: 0.0, kind: 'cloud', yFrac: 0.22 },
      { delay: 0.0, kind: 'star', yFrac: 0.5 },
      { delay: 0.0, kind: 'cloud', yFrac: 0.78 },
      { delay: 0.42, kind: 'star', yFrac: 0.36 },
      { delay: 0.42, kind: 'star', yFrac: 0.64 },
      { delay: 0.85, kind: 'bigstar', yFrac: 0.5 },
      { delay: 0.9, kind: 'storm_orb', yFrac: 0.24 },
      { delay: 1.25, kind: 'cloud', yFrac: 0.5 },
      { delay: 1.55, kind: 'comet', yFrac: 0.28, speedMult: 1.25 },
      { delay: 1.55, kind: 'star', yFrac: 0.72 },
    ],
  },
  {
    id: 'shooting_gallery',
    name: 'Shooting Star Cascade',
    items: [
      { delay: 0.0, kind: 'comet', yFrac: 0.22, speedMult: 1.26 },
      { delay: 0.32, kind: 'comet', yFrac: 0.44, speedMult: 1.26 },
      { delay: 0.4, kind: 'cloud', yFrac: 0.72 },
      { delay: 0.68, kind: 'comet', yFrac: 0.66, speedMult: 1.26 },
      { delay: 0.95, kind: 'cloud', yFrac: 0.26 },
      { delay: 1.12, kind: 'bigstar', yFrac: 0.48 },
      { delay: 1.35, kind: 'storm_orb', yFrac: 0.74 },
      { delay: 1.55, kind: 'star', yFrac: 0.32 },
      { delay: 1.85, kind: 'star', yFrac: 0.52 },
    ],
  },
  {
    id: 'crescent_moon',
    name: 'Crescent Moon Arc',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.2 },
      { delay: 0.28, kind: 'star', yFrac: 0.34 },
      { delay: 0.32, kind: 'cloud', yFrac: 0.62 },
      { delay: 0.56, kind: 'bigstar', yFrac: 0.5 },
      { delay: 0.84, kind: 'star', yFrac: 0.66 },
      { delay: 0.96, kind: 'cloud', yFrac: 0.3 },
      { delay: 1.12, kind: 'star', yFrac: 0.8 },
      { delay: 1.38, kind: 'storm_orb', yFrac: 0.52 },
      { delay: 1.55, kind: 'star', yFrac: 0.36 },
      { delay: 1.85, kind: 'comet', yFrac: 0.22, speedMult: 1.22 },
    ],
  },
  {
    id: 'thunder_steppe',
    name: 'Thundersteppe Hop',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.72 },
      { delay: 0.25, kind: 'storm_orb', yFrac: 0.38 },
      { delay: 0.42, kind: 'star', yFrac: 0.72 },
      { delay: 0.72, kind: 'cloud', yFrac: 0.76 },
      { delay: 0.84, kind: 'bigstar', yFrac: 0.3 },
      { delay: 1.12, kind: 'star', yFrac: 0.24 },
      { delay: 1.25, kind: 'cloud', yFrac: 0.54 },
      { delay: 1.5, kind: 'comet', yFrac: 0.34, speedMult: 1.24 },
      { delay: 1.78, kind: 'void_meteor', yFrac: 0.66 },
      { delay: 1.9, kind: 'star', yFrac: 0.26 },
    ],
  },
  {
    id: 'nebula_tunnel',
    name: 'Nebula Sky Tunnel',
    items: [
      { delay: 0.0, kind: 'cloud', yFrac: 0.2 },
      { delay: 0.0, kind: 'cloud', yFrac: 0.8 },
      { delay: 0.15, kind: 'star', yFrac: 0.5 },
      { delay: 0.48, kind: 'star', yFrac: 0.5 },
      { delay: 0.78, kind: 'cloud', yFrac: 0.24 },
      { delay: 0.78, kind: 'cloud', yFrac: 0.76 },
      { delay: 0.84, kind: 'bigstar', yFrac: 0.5 },
      { delay: 1.22, kind: 'storm_orb', yFrac: 0.54 },
      { delay: 1.45, kind: 'star', yFrac: 0.3 },
      { delay: 1.75, kind: 'comet', yFrac: 0.68, speedMult: 1.22 },
    ],
  },
  {
    id: 'zenith_stair',
    name: 'Zenith Sky Stairs',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.78 },
      { delay: 0.26, kind: 'star', yFrac: 0.64 },
      { delay: 0.36, kind: 'cloud', yFrac: 0.34 },
      { delay: 0.54, kind: 'star', yFrac: 0.5 },
      { delay: 0.82, kind: 'star', yFrac: 0.36 },
      { delay: 0.92, kind: 'cloud', yFrac: 0.74 },
      { delay: 1.1, kind: 'bigstar', yFrac: 0.24 },
      { delay: 1.38, kind: 'storm_orb', yFrac: 0.48 },
      { delay: 1.56, kind: 'star', yFrac: 0.62 },
      { delay: 1.85, kind: 'comet', yFrac: 0.76, speedMult: 1.2 },
    ],
  },
  {
    id: 'aurora_zigzag',
    name: 'Aurora Sky Pulse',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.26 },
      { delay: 0.26, kind: 'cloud', yFrac: 0.48 },
      { delay: 0.42, kind: 'star', yFrac: 0.74 },
      { delay: 0.68, kind: 'void_meteor', yFrac: 0.32 },
      { delay: 0.82, kind: 'bigstar', yFrac: 0.7 },
      { delay: 1.08, kind: 'cloud', yFrac: 0.52 },
      { delay: 1.22, kind: 'star', yFrac: 0.26 },
      { delay: 1.48, kind: 'storm_orb', yFrac: 0.68 },
      { delay: 1.65, kind: 'comet', yFrac: 0.28, speedMult: 1.24 },
      { delay: 1.9, kind: 'star', yFrac: 0.48 },
    ],
  },
  {
    id: 'supernova_ring',
    name: 'Supernova Star Ring',
    items: [
      { delay: 0.0, kind: 'star', yFrac: 0.5 },
      { delay: 0.28, kind: 'star', yFrac: 0.28 },
      { delay: 0.28, kind: 'star', yFrac: 0.72 },
      { delay: 0.56, kind: 'cloud', yFrac: 0.5 },
      { delay: 0.65, kind: 'bigstar', yFrac: 0.22 },
      { delay: 0.65, kind: 'bigstar', yFrac: 0.78 },
      { delay: 1.0, kind: 'storm_orb', yFrac: 0.5 },
      { delay: 1.32, kind: 'star', yFrac: 0.34 },
      { delay: 1.32, kind: 'star', yFrac: 0.66 },
      { delay: 1.68, kind: 'cloud', yFrac: 0.24 },
      { delay: 1.68, kind: 'cloud', yFrac: 0.76 },
    ],
  },
  {
    id: 'astral_crosswind',
    name: 'Astral Jetstream',
    items: [
      { delay: 0.0, kind: 'comet', yFrac: 0.5, speedMult: 1.28 },
      { delay: 0.3, kind: 'cloud', yFrac: 0.28 },
      { delay: 0.42, kind: 'star', yFrac: 0.64 },
      { delay: 0.7, kind: 'star', yFrac: 0.76 },
      { delay: 0.88, kind: 'void_meteor', yFrac: 0.44 },
      { delay: 1.05, kind: 'bigstar', yFrac: 0.24 },
      { delay: 1.32, kind: 'cloud', yFrac: 0.72 },
      { delay: 1.48, kind: 'storm_orb', yFrac: 0.48 },
      { delay: 1.72, kind: 'comet', yFrac: 0.28, speedMult: 1.24 },
      { delay: 1.95, kind: 'star', yFrac: 0.62 },
    ],
  },
];

const SKY_PALETTES = [
  { name: 'Starlight Village Dusk', top: '#0f172a', mid: '#312e81', bottom: '#4c1d95', accent: '#c084fc' },
  { name: 'Whispering Canopy', top: '#064e3b', mid: '#0f766e', bottom: '#1e3a8a', accent: '#4ade80' },
  { name: 'Crystal Cavern Glow', top: '#1e1b4b', mid: '#6d28d9', bottom: '#0f172a', accent: '#e879f9' },
  { name: 'Sapphire Horizon', top: '#0c4a6e', mid: '#0284c7', bottom: '#1e1b4b', accent: '#38bdf8' },
  { name: 'Ember Sunset', top: '#431407', mid: '#c2410c', bottom: '#7c2d12', accent: '#fb923c' },
  { name: 'Starfall Aurora', top: '#1e1b4b', mid: '#0f766e', bottom: '#3b0764', accent: '#67e8f9' },
  { name: 'Celestial Blossom', top: '#500724', mid: '#9d174d', bottom: '#312e81', accent: '#f9a8d4' },
  { name: 'Sunstone Mirage', top: '#451a03', mid: '#b45309', bottom: '#1e293b', accent: '#fde047' },
  { name: 'Glowspore Twilight', top: '#022c22', mid: '#115e59', bottom: '#312e81', accent: '#2dd4bf' },
  { name: 'Astral Citadel', top: '#090d1a', mid: '#4338ca', bottom: '#0f172a', accent: '#a78bfa' },
  { name: 'Thundersteppe Storm', top: '#1e293b', mid: '#854d0e', bottom: '#0f172a', accent: '#facc15' },
  { name: 'Abyssal Pearl Sky', top: '#082f49', mid: '#0e7490', bottom: '#1e1b4b', accent: '#7dd3fc' },
  { name: 'Chrono Relic Sunset', top: '#2e1065', mid: '#b45309', bottom: '#172554', accent: '#fbbf24' },
  { name: 'Mythic Rift Nebula', top: '#3b0764', mid: '#a21caf', bottom: '#0f172a', accent: '#f0abfc' },
  { name: 'Faeveldt Rose Dawn', top: '#4c0519', mid: '#db2777', bottom: '#312e81', accent: '#fbcfe8' },
  { name: 'Sunburst Alola Horizon', top: '#7c2d12', mid: '#ea580c', bottom: '#0e7490', accent: '#fed7aa' },
  { name: 'Iron Crown Summit', top: '#0f172a', mid: '#334155', bottom: '#1e3a8a', accent: '#93c5fd' },
  { name: 'Terastal Prism', top: '#1e1b4b', mid: '#0369a1', bottom: '#831843', accent: '#f472b6' },
];

export class StarlightMinigame {
  constructor({ storage = null, audio = null, onClose = null, onCelebrate = null, onRunStart = null, onRewardsEarned = null } = {}) {
    this.storage = storage;
    this.audio = audio;
    this.onClose = onClose;
    this.onCelebrate = onCelebrate;
    this.onRunStart = onRunStart;
    this.onRewardsEarned = onRewardsEarned;

    this.modalEl = typeof document !== 'undefined' ? document.getElementById('minigame-modal') : null;
    this.canvas = typeof document !== 'undefined' ? document.getElementById('minigame-canvas') : null;
    this.ctx = this.canvas?.getContext?.('2d') || null;
    this.pauseBtn = typeof document !== 'undefined' ? document.getElementById('minigame-pause-btn') : null;
    this.closeBtn = typeof document !== 'undefined' ? document.getElementById('minigame-close-btn') : null;
    this.dashBtn = typeof document !== 'undefined' ? document.getElementById('minigame-dash-btn') : null;
    this.partnerPillEl = typeof document !== 'undefined' ? document.getElementById('minigame-partner-pill') : null;
    this.hudChargesEl = typeof document !== 'undefined' ? document.getElementById('minigame-hud-charges') : null;
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
    this.outOfCharges = false;
    this.rafId = null;
    this.lastFrameMs = 0;

    this.waveDeck = [];
    this.lastWaveId = null;
    this.lastOpeningWaveId = null;
    this.recentWaveIds = [];
    this.runSkyOffset = 0;
    this.lastRunSkyOffset = null;
    this.currentWave = null;
    this.pendingSpawns = [];
    this.waveElapsed = 0;
    this.waveBannerTimer = 0;
    this.windVy = 0;

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
        this._spawnTrailParticles(PLAYER_X, this.playerY, 8, true);
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

  _refillWaveDeck(extraAvoidIds = []) {
    const deck = WAVE_TEMPLATES.map((tpl) => ({ ...tpl }));
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const recentAvoid = new Set([
      this.lastWaveId,
      ...this.recentWaveIds.slice(-4),
      ...extraAvoidIds,
    ].filter(Boolean));
    if (deck.length > 1) {
      const checkTailCount = Math.min(4, deck.length - 1);
      for (let offset = 0; offset < checkTailCount; offset++) {
        const tailIdx = deck.length - 1 - offset;
        if (!recentAvoid.has(deck[tailIdx].id)) continue;
        const swapIdx = deck.findIndex((item, idx) => idx < tailIdx && !recentAvoid.has(item.id));
        if (swapIdx !== -1) {
          [deck[tailIdx], deck[swapIdx]] = [deck[swapIdx], deck[tailIdx]];
        }
      }
      if (this.lastWaveId && deck[deck.length - 1].id === this.lastWaveId) {
        const altIdx = deck.findIndex((item) => item.id !== this.lastWaveId);
        if (altIdx !== -1) {
          const lastIdx = deck.length - 1;
          [deck[lastIdx], deck[altIdx]] = [deck[altIdx], deck[lastIdx]];
        }
      }
    }
    this.waveDeck = deck;
  }

  drawNextWave(isOpening = false) {
    const extraAvoid = isOpening && this.lastOpeningWaveId ? [this.lastOpeningWaveId] : [];
    if (!Array.isArray(this.waveDeck) || this.waveDeck.length === 0) {
      this._refillWaveDeck(extraAvoid);
    }
    const immediateAvoid = new Set([this.lastWaveId, ...extraAvoid].filter(Boolean));
    if (this.waveDeck.length > 1 && immediateAvoid.has(this.waveDeck[this.waveDeck.length - 1]?.id)) {
      const swapIdx = this.waveDeck.findIndex((w) => !immediateAvoid.has(w.id));
      if (swapIdx !== -1) {
        const lastIdx = this.waveDeck.length - 1;
        [this.waveDeck[lastIdx], this.waveDeck[swapIdx]] = [this.waveDeck[swapIdx], this.waveDeck[lastIdx]];
      }
    }
    let next = this.waveDeck.pop();
    if (this.lastWaveId && next?.id === this.lastWaveId && this.waveDeck.length > 0) {
      const alt = this.waveDeck[0];
      this.waveDeck[0] = next;
      next = alt;
    }
    this.lastWaveId = next?.id || null;
    if (isOpening && this.lastWaveId) {
      this.lastOpeningWaveId = this.lastWaveId;
    }
    if (this.lastWaveId) {
      this.recentWaveIds = [...this.recentWaveIds.filter((id) => id !== this.lastWaveId), this.lastWaveId].slice(-8);
    }
    return next;
  }

  getSkyTheme(wave = this.wave) {
    const waveIdx = Math.max(0, (Number(wave) || 1) - 1);
    const idx = ((Number(this.runSkyOffset) || 0) + waveIdx) % SKY_PALETTES.length;
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

  _getArcadeStateSnapshot() {
    if (typeof this.storage?.getArcadeState === 'function') {
      return this.storage.getArcadeState();
    }
    const profile = this.storage?.getActiveProfile?.();
    return {
      unlocked: Boolean(profile?.arcade?.unlocked ?? true),
      charges: profile?.arcade?.charges ?? MAX_ARCADE_CHARGES,
      maxCharges: MAX_ARCADE_CHARGES,
      stepProgress: 0,
      stepsPerCharge: 50,
      stepsUntilNext: 50,
      battleProgress: 0,
      battlesPerCharge: 2,
      battlesUntilNext: 2,
      shardBuyInCost: ARCADE_SHARD_BUYIN_COST,
      starShards: Number(profile?.bag?.starShards) || 0,
      canBuyWithShards: false,
      gemCooldown: Number(profile?.arcade?.gemCooldown) || 0,
    };
  }

  _bindBuyInButton() {
    const buyBtn = this.resultsCardEl?.querySelector?.('#minigame-shard-buy-btn') || null;
    if (!buyBtn) return;
    buyBtn.addEventListener('click', () => {
      this.audio?.unlock?.();
      const buyRes = this.storage?.buyArcadeChargeWithShards?.();
      if (buyRes?.purchased) {
        this.audio?.playArcadeStar?.(4);
        this.onRewardsEarned?.(null, null);
        this.startNewRun();
      } else {
        this.audio?.playMenuBlip?.(340);
      }
    });
  }

  _enterStandbyScreen(reason = 'empty_charges') {
    this._stopLoop();
    this.paused = false;
    this.runEnded = true;
    this.outOfCharges = true;
    this.entities = [];
    this.particles = [];
    this.pendingSpawns = [];
    this.keysHeld.clear();
    this.pointerActive = false;
    this.activePointerId = null;
    this.pointerTargetY = null;

    const st = this._getArcadeStateSnapshot();
    const isLocked = reason === 'locked' || !st.unlocked;

    if (this.resultsCardEl) {
      if (isLocked) {
        this.resultsCardEl.innerHTML = `
          <span class="minigame-tier-pill">🔒 HIDDEN CABINET</span>
          <h3>🔒 Sky-Hop Arcade Locked</h3>
          <p class="minigame-next-tier">Earn 1 Island Badge or register 5 Pokémon species, then knock 3 times on the star-marked cottage wall in Starlight Village!</p>
        `;
      } else {
        this.resultsCardEl.innerHTML = `
          <span class="minigame-tier-pill">⚡ OUT OF CHARGES (${st.charges}/${st.maxCharges} 🎟️)</span>
          <h3>🎟️ Sky-Hop Needs a Recharge!</h3>
          <div class="minigame-standby-hints">
            <span>👣 ${st.stepsUntilNext} steps (${st.stepProgress}/${st.stepsPerCharge}) → +1 🎟️</span>
            <span>⚔️ ${st.battlesUntilNext} battle${st.battlesUntilNext === 1 ? '' : 's'} (${st.battleProgress}/${st.battlesPerCharge}) → +1 🎟️</span>
            <span>⛩️ Shrine / Rival Win → +1 🎟️</span>
          </div>
          <button
            id="minigame-shard-buy-btn"
            type="button"
            class="setting-toggle-btn is-primary minigame-buy-btn"
            ${st.canBuyWithShards ? '' : 'disabled aria-disabled="true"'}
          >
            ${st.canBuyWithShards
              ? `✨ Buy +1 Flight (${st.shardBuyInCost} ✨ • Have ${st.starShards} ✨)`
              : `🔒 Buy +1 Flight (${st.starShards}/${st.shardBuyInCost} ✨)`}
          </button>
        `;
        this._bindBuyInButton();
      }
    }

    if (this.replayBtn) {
      this.replayBtn.disabled = true;
      this.replayBtn.setAttribute('aria-disabled', 'true');
      this.replayBtn.textContent = isLocked
        ? '🔒 Locked'
        : `🔒 Play Again (0/${st.maxCharges} 🎟️)`;
    }
    if (this.resultsEl) {
      this.resultsEl.hidden = false;
    }

    this.syncHud();
    this.render(typeof performance !== 'undefined' ? performance.now() : Date.now());
  }

  startNewRun() {
    this._stopLoop();

    if (this.storage && typeof this.storage.isArcadeUnlocked === 'function' && !this.storage.isArcadeUnlocked()) {
      this._enterStandbyScreen('locked');
      return false;
    }

    if (this.storage && typeof this.storage.consumeArcadeCharge === 'function') {
      const chargeRes = this.storage.consumeArcadeCharge();
      if (!chargeRes?.consumed) {
        this._enterStandbyScreen(chargeRes?.reason || 'empty_charges');
        this.onRewardsEarned?.(null, null);
        return false;
      }
    }

    this.outOfCharges = false;
    this.paused = false;
    this.score = 0;
    this.wave = 1;
    this.hearts = MAX_HEARTS;
    this.combo = 1;
    this.comboStreak = 0;
    this.starsCollected = 0;
    this.runEnded = false;
    this.runRecorded = false;
    this.windVy = 0;

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
    let skyStart = Math.floor(Math.random() * SKY_PALETTES.length);
    if (SKY_PALETTES.length > 1 && skyStart === this.lastRunSkyOffset) {
      skyStart = (skyStart + 1 + Math.floor(Math.random() * (SKY_PALETTES.length - 1))) % SKY_PALETTES.length;
    }
    this.runSkyOffset = skyStart;
    this.lastRunSkyOffset = skyStart;
    if (typeof document !== 'undefined' && (document.activeElement === this.replayBtn || document.activeElement === this.doneBtn)) {
      document.activeElement.blur();
    }
    if (this.replayBtn) {
      this.replayBtn.disabled = false;
      this.replayBtn.removeAttribute('aria-disabled');
      this.replayBtn.textContent = '🕹️ Play Again';
    }
    if (this.resultsEl) {
      this.resultsEl.hidden = true;
    }

    this.onRunStart?.();
    this.onRewardsEarned?.(null, null);
    this._beginWave(1);
    this.syncHud();
    this.render(typeof performance !== 'undefined' ? performance.now() : Date.now());
    this._startLoop();
    return true;
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
    this.currentWave = this.drawNextWave(waveNum === 1);
    this.waveElapsed = 0;
    this.waveBannerTimer = 1.8;
    this._spawnWaveFanfareParticles(waveNum);

    const baseItems = Array.isArray(this.currentWave?.items) ? this.currentWave.items : [];
    const flip = waveNum % 2 === 0;
    const delayScale = Math.max(0.58, 1 - (waveNum - 1) * 0.045);
    this.pendingSpawns = baseItems.map((item) => ({
      ...item,
      delay: Number((item.delay * delayScale).toFixed(3)),
      yFrac: flip ? Math.max(0.16, Math.min(0.84, 1 - item.yFrac)) : item.yFrac,
      spawned: false,
    }));

    if (waveNum >= 2) {
      this.pendingSpawns.push({
        delay: Number((0.75 * delayScale).toFixed(3)),
        kind: 'storm_orb',
        yFrac: flip ? 0.34 : 0.66,
        spawned: false,
      });
    }

    if (waveNum >= 3) {
      const meteorCount = Math.min(3, 1 + Math.floor((waveNum - 3) / 3));
      for (let idx = 0; idx < meteorCount; idx += 1) {
        this.pendingSpawns.push({
          delay: Number(((0.45 + idx * 0.72) * delayScale).toFixed(3)),
          kind: 'void_meteor',
          yFrac: 0.22 + ((waveNum + idx * 2) % 4) * 0.18,
          spawned: false,
        });
      }
    }

    if (waveNum >= 4 && waveNum % 2 === 0) {
      const gateDelay = Number((1.55 * delayScale).toFixed(3));
      this.pendingSpawns.push(
        { delay: gateDelay, kind: 'cloud', yFrac: 0.36, spawned: false },
        { delay: gateDelay, kind: 'bigstar', yFrac: 0.5, spawned: false },
        { delay: gateDelay, kind: 'cloud', yFrac: 0.64, spawned: false },
      );
    }

    if (waveNum >= 5 && waveNum % 5 === 0 && this.hearts < MAX_HEARTS) {
      this.pendingSpawns.push({
        delay: Number((1.45 * delayScale).toFixed(3)),
        kind: 'heart',
        yFrac: flip ? 0.24 : 0.76,
        spawned: false,
      });
    }
  }

  _spawnEntity(spec) {
    const waveSpeedBoost = Math.min(265, (this.wave - 1) * 24);
    const kind = spec.kind || 'star';
    const defaultSpeedMult = kind === 'void_meteor' ? 1.34 : kind === 'storm_orb' ? 1.16 : 1;
    const speed = (255 + waveSpeedBoost) * (spec.speedMult || defaultSpeedMult);
    const y = Math.max(36, Math.min(CANVAS_H - 36, spec.yFrac * CANVAS_H));
    const radius = kind === 'void_meteor'
      ? 21
      : kind === 'storm_orb'
        ? 20
        : kind === 'cloud'
          ? 22
          : kind === 'bigstar'
            ? 20
            : kind === 'comet'
              ? 18
              : 15;
    const spawnX = kind === 'void_meteor' ? CANVAS_W + 96 : CANVAS_W + 34;
    const vy = kind === 'void_meteor'
      ? (y > CANVAS_H * 0.5 ? -1 : 1) * (48 + Math.min(34, this.wave * 3))
      : 0;
    const bobAmp = kind === 'storm_orb'
      ? 46 + Math.min(24, this.wave * 2.5)
      : kind === 'comet'
        ? 26
        : kind === 'void_meteor'
          ? 0
          : 10;
    const bobFreq = kind === 'storm_orb'
      ? 3.6 + Math.min(1.4, this.wave * 0.12)
      : kind === 'comet'
        ? 4.5
        : 2.6;

    this.entities.push({
      kind,
      x: spawnX,
      y,
      baseY: y,
      vy,
      radius,
      speed,
      age: 0,
      bobAmp,
      bobFreq,
    });
  }

  activateDash() {
    if (!this._open || this.runEnded || this.paused || this.dashCooldown > 0 || this.dashTimer > 0) {
      return false;
    }
    this.dashTimer = 1.15;
    this.dashCooldown = 4.6;
    this.magnetTimer = Math.max(this.magnetTimer, 1.15);
    this.audio?.playArcadeBoost?.();
    this._spawnTrailParticles(PLAYER_X, this.playerY, 36, true);
    this.particles.push({
      x: PLAYER_X,
      y: this.playerY,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0.48,
      size: 26,
      maxSize: 82,
      color: '#fde047',
      shape: 'ring',
    });
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
        if (e.target === this.closeBtn || e.target === this.doneBtn || e.target?.id === 'minigame-shard-buy-btn') return;
        e.preventDefault();
        const charges = typeof this.storage?.getArcadeState === 'function'
          ? this.storage.getArcadeState().charges
          : 1;
        if (this.outOfCharges || charges <= 0) {
          this.audio?.playMenuBlip?.(340);
          return;
        }
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
      ? [baseColor, '#fde047', '#f472b6', '#ffffff', '#67e8f9']
      : [baseColor, '#bae6fd', '#fde047', '#ffffff'];
    const shapes = burst ? ['star', 'spark', 'dot'] : ['dot', 'spark'];

    for (let i = 0; i < count; i++) {
      const angle = burst ? (Math.PI * 2 * i) / Math.max(1, count) + (Math.random() - 0.5) * 0.25 : Math.PI + (Math.random() - 0.5) * 0.9;
      const speed = burst ? 90 + Math.random() * 165 : 65 + Math.random() * 85;
      this.particles.push({
        x: x - (burst ? 0 : 18),
        y: y + (Math.random() - 0.5) * 14,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: burst ? 0.58 + Math.random() * 0.18 : 0.44,
        size: burst ? 4.8 + (i % 3) * 0.9 : 3.2,
        color: colors[i % colors.length],
        shape: shapes[i % shapes.length],
      });
    }
  }

  _spawnWaveFanfareParticles(waveNum = 1) {
    const sky = this.getSkyTheme(waveNum);
    const colors = [sky.accent || '#38bdf8', '#fde047', '#f472b6', '#ffffff', '#67e8f9'];
    const count = waveNum > 1 ? 28 : 16;
    for (let i = 0; i < count; i++) {
      const y = 26 + ((CANVAS_H - 52) * i) / Math.max(1, count - 1) + (Math.random() - 0.5) * 18;
      this.particles.push({
        x: waveNum > 1 ? CANVAS_W - 24 - (i % 4) * 32 : PLAYER_X + (Math.random() - 0.3) * 80,
        y,
        vx: waveNum > 1 ? -(180 + Math.random() * 160) : 70 + Math.random() * 120,
        vy: (Math.random() - 0.5) * 60,
        life: 0,
        maxLife: 0.72 + Math.random() * 0.22,
        size: 4.5 + (i % 3) * 1.2,
        color: colors[i % colors.length],
        shape: i % 2 === 0 ? 'star' : 'spark',
      });
    }
  }

  _spawnVictoryBurstParticles() {
    const sky = this.getSkyTheme(this.wave);
    const colors = ['#fde047', '#f472b6', '#38bdf8', sky.accent || '#a78bfa', '#ffffff'];
    for (let i = 0; i < 44; i++) {
      const angle = (Math.PI * 2 * i) / 44;
      const speed = 110 + (i % 5) * 48;
      this.particles.push({
        x: PLAYER_X + ((i % 3) - 1) * 24,
        y: this.playerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.85,
        size: 5 + (i % 3) * 1.2,
        color: colors[i % colors.length],
        shape: i % 3 === 0 ? 'star' : 'spark',
      });
    }
    this.particles.push({
      x: PLAYER_X,
      y: this.playerY,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0.65,
      size: 24,
      maxSize: 120,
      color: '#fde047',
      shape: 'ring',
    });
  }

  update(dt) {
    if (!this._open || this.runEnded || this.paused) return;

    const clampedDt = Math.min(0.05, Math.max(0.001, dt));
    if (this.dashTimer > 0) {
      this.dashTimer = Math.max(0, this.dashTimer - clampedDt);
    } else if (this.dashCooldown > 0) {
      this.dashCooldown = Math.max(0, this.dashCooldown - clampedDt);
    }
    if (this.magnetTimer > 0) this.magnetTimer = Math.max(0, this.magnetTimer - clampedDt);
    if (this.hitInvulnTimer > 0) this.hitInvulnTimer = Math.max(0, this.hitInvulnTimer - clampedDt);
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - clampedDt);
    if (this.waveBannerTimer > 0) this.waveBannerTimer = Math.max(0, this.waveBannerTimer - clampedDt);

    // Player vertical steering (Keyboard or Direct Pointer Tap/Drag)
    const speedMult = this.dashTimer > 0 ? 1.25 : 1.0;
    if (this.keysHeld.has('up') || this.keysHeld.has('down')) {
      const dir = (this.keysHeld.has('down') ? 1 : 0) - (this.keysHeld.has('up') ? 1 : 0);
      this.playerVy = dir * 355 * speedMult;
      this.playerY += this.playerVy * clampedDt;
    } else if (this.pointerTargetY !== null) {
      const diff = this.pointerTargetY - this.playerY;
      if (Math.abs(diff) <= 3) {
        this.playerY = this.pointerTargetY;
        this.playerVy = 0;
        if (!this.pointerActive) this.pointerTargetY = null;
      } else {
        const followRate = this.pointerActive ? 15.5 : 10.5;
        this.playerVy = Math.max(-520, Math.min(520, diff * followRate));
        this.playerY += this.playerVy * clampedDt;
      }
    } else {
      this.playerVy *= Math.pow(0.02, clampedDt);
    }

    // Wave 5+ gentle rhythmic sky crosswind
    if (this.wave >= 5) {
      this.windVy = Math.sin(this.waveElapsed * 1.9) * Math.min(54, (this.wave - 4) * 10);
      this.playerY += this.windVy * (this.pointerActive ? 0.3 : 1) * clampedDt;
    } else {
      this.windVy = 0;
    }
    this.playerY = Math.max(PLAYER_MIN_Y, Math.min(PLAYER_MAX_Y, this.playerY));

    // Ambient starlight trail behind Lead Pokémon
    if (Math.random() < (this.dashTimer > 0 ? 0.98 : 0.6)) {
      this._spawnTrailParticles(PLAYER_X, this.playerY, this.dashTimer > 0 ? 4 : 2, false);
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

      if (ent.kind === 'void_meteor') {
        ent.baseY += (ent.vy || 0) * clampedDt;
        if (ent.baseY < 42) {
          ent.baseY = 42;
          ent.vy = Math.abs(ent.vy || 50);
        } else if (ent.baseY > CANVAS_H - 42) {
          ent.baseY = CANVAS_H - 42;
          ent.vy = -Math.abs(ent.vy || 50);
        }
        ent.y = ent.baseY;
      } else {
        ent.y = Math.max(28, Math.min(CANVAS_H - 28, ent.baseY + Math.sin(ent.age * ent.bobFreq) * ent.bobAmp));
      }

      const isHazard = ent.kind === 'cloud' || ent.kind === 'storm_orb' || ent.kind === 'void_meteor';

      // Magnet attraction for collectibles
      if (!isHazard && (this.dashTimer > 0 || this.magnetTimer > 0)) {
        const dx = PLAYER_X - ent.x;
        const dy = this.playerY - ent.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1 && dist < 125) {
          const pull = 280 * clampedDt;
          ent.x += (dx / dist) * pull;
          ent.baseY += (dy / dist) * pull;
          ent.y = ent.baseY;
        }
      }

      const dist = Math.hypot(ent.x - PLAYER_X, ent.y - this.playerY);
      const hitRadius = ent.kind === 'cloud'
        ? 28
        : ent.kind === 'storm_orb'
          ? 26
          : ent.kind === 'void_meteor'
            ? 27
            : 29;

      if (dist <= hitRadius) {
        if (ent.kind === 'void_meteor') {
          if (this.dashTimer > 0) {
            // Void Meteor shatters Star Dash armor without losing a heart
            this.dashTimer = 0;
            this.magnetTimer = 0;
            this.combo = 1;
            this.comboStreak = 0;
            this.hitInvulnTimer = 0.55;
            this.shakeTimer = 0.22;
            this.audio?.playArcadeBump?.();
            this._spawnTrailParticles(ent.x, ent.y, 28, true);
            this.particles.push({ x: ent.x, y: ent.y, vx: 0, vy: 0, life: 0, maxLife: 0.42, size: 18, maxSize: 74, color: '#f87171', shape: 'ring' });
            this.entities.splice(i, 1);
          } else if (this.hitInvulnTimer <= 0) {
            this.hearts = Math.max(0, this.hearts - 1);
            this.combo = 1;
            this.comboStreak = 0;
            this.hitInvulnTimer = 1.0;
            this.shakeTimer = 0.28;
            this.audio?.playArcadeBump?.();
            this._spawnTrailParticles(PLAYER_X, this.playerY, 24, true);
            this.entities.splice(i, 1);
            if (this.hearts <= 0) {
              this.endRun();
              return;
            }
          }
          continue;
        }

        if (ent.kind === 'cloud' || ent.kind === 'storm_orb') {
          if (this.dashTimer > 0) {
            this.score += ent.kind === 'storm_orb' ? 8 : 5;
            this.audio?.playArcadeStar?.(this.combo);
            this._spawnTrailParticles(ent.x, ent.y, 20, true);
            this.entities.splice(i, 1);
          } else if (this.hitInvulnTimer <= 0) {
            this.hearts = Math.max(0, this.hearts - 1);
            this.combo = 1;
            this.comboStreak = 0;
            this.hitInvulnTimer = 1.0;
            this.shakeTimer = 0.28;
            this.audio?.playArcadeBump?.();
            this._spawnTrailParticles(PLAYER_X, this.playerY, 24, true);
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
          this.score += 15;
          this.audio?.playHealChime?.();
          this._spawnTrailParticles(ent.x, ent.y, 20, true);
          this.particles.push({ x: ent.x, y: ent.y, vx: 0, vy: 0, life: 0, maxLife: 0.45, size: 16, maxSize: 64, color: '#f472b6', shape: 'ring' });
          this.entities.splice(i, 1);
          continue;
        }

        // Star collectible
        this.starsCollected += 1;
        this.comboStreak += ent.kind === 'bigstar' ? 2 : 1;
        this.combo = Math.min(5, 1 + Math.floor(this.comboStreak / 5));
        const basePts = ent.kind === 'bigstar' ? 20 : ent.kind === 'comet' ? 16 : 8;
        this.score += basePts * this.combo;
        if (ent.kind === 'comet') {
          this.magnetTimer = Math.max(this.magnetTimer, 0.85);
        }
        this.audio?.playArcadeStar?.(this.combo);
        this._spawnTrailParticles(ent.x, ent.y, ent.kind === 'bigstar' ? 24 : 12, true);
        if (ent.kind === 'bigstar') {
          this.particles.push({ x: ent.x, y: ent.y, vx: 0, vy: 0, life: 0, maxLife: 0.4, size: 14, maxSize: 58, color: '#fde047', shape: 'ring' });
        }
        this.entities.splice(i, 1);
        continue;
      }

      if (ent.x < -36) {
        if (ent.kind === 'star' || ent.kind === 'bigstar' || ent.kind === 'comet') {
          this.comboStreak = Math.max(0, this.comboStreak - 4);
          this.combo = Math.min(5, 1 + Math.floor(this.comboStreak / 5));
        }
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
      this.score += 12 + Math.min(28, this.wave * 4);
      this._beginWave(this.wave + 1);
    }

    this.syncHud();
  }

  _getRewardTierMeta(score = this.score, wave = this.wave) {
    const rawScore = Number(score);
    const safeScore = Number.isFinite(rawScore) ? Math.max(0, Math.floor(rawScore)) : 0;
    const rawWave = Number(wave);
    const safeWave = Number.isFinite(rawWave) ? Math.max(1, Math.floor(rawWave)) : 1;

    if (safeScore >= 900 && safeWave >= 8) {
      return { tier: 6, label: 'Tier 6: Astral Legend', nextHint: 'Max Reward Tier Reached!' };
    }
    if (safeScore >= 650 && safeWave >= 6) {
      return { tier: 5, label: 'Tier 5: Starlight Ace', nextHint: 'Next Tier: 900+ pts & Wave 8 for Evolution Gem / Bonus Star Ball!' };
    }
    if (safeScore >= 450 && safeWave >= 5) {
      return { tier: 4, label: 'Tier 4: Comet Vanguard', nextHint: 'Next Tier: 650+ pts & Wave 6 for +4 ✨, +2 🔵 & +1 🌟!' };
    }
    if (safeScore >= 300 && safeWave >= 3) {
      return { tier: 3, label: 'Tier 3: Nebula Glider', nextHint: 'Next Tier: 450+ pts & Wave 5 for +3 ✨ & +2 🍓!' };
    }
    if (safeScore >= 180 && safeWave >= 2) {
      return { tier: 2, label: 'Tier 2: Starlight Flyer', nextHint: 'Next Tier: 300+ pts & Wave 3 for +1 🔵 Great Ball!' };
    }
    if (safeScore >= MIN_ARCADE_REWARD_SCORE) {
      return { tier: 1, label: 'Tier 1: Sky Rookie', nextHint: 'Next Tier: 180+ pts & Wave 2 for +2 ✨ & +1 💖 Cheer Heart!' };
    }
    return { tier: 0, label: 'Flight Warm-Up', nextHint: `Next Tier: ${MIN_ARCADE_REWARD_SCORE}+ pts to win Star Shards & Berry Potions!` };
  }

  computeRewards(score = this.score, wave = this.wave, profileOverride = null) {
    const rawScore = Number(score);
    const safeScore = Number.isFinite(rawScore) ? Math.max(0, Math.floor(rawScore)) : 0;
    const rawWave = Number(wave);
    const safeWave = Number.isFinite(rawWave) ? Math.max(1, Math.floor(rawWave)) : 1;

    if (safeScore < MIN_ARCADE_REWARD_SCORE) {
      return { starShards: 0, potions: 0 };
    }

    let starShards = 1;
    let potions = 1;
    let greatBalls = 0;
    let starBalls = 0;
    let cheerCharges = 0;

    if (safeScore >= 180 && safeWave >= 2) {
      starShards = 2;
      cheerCharges = 1;
    }
    if (safeScore >= 300 && safeWave >= 3) {
      greatBalls = 1;
    }
    if (safeScore >= 450 && safeWave >= 5) {
      starShards = 3;
      potions = 2;
    }
    if (safeScore >= 650 && safeWave >= 6) {
      starShards = 4;
      greatBalls = 2;
      starBalls = 1;
    }

    const rewards = {
      starShards: Math.min(MAX_ARCADE_SHARDS, starShards),
      potions,
    };
    if (greatBalls > 0) rewards.greatBalls = greatBalls;
    if (starBalls > 0) rewards.starBalls = starBalls;
    if (cheerCharges > 0) rewards.cheerCharges = cheerCharges;

    if (safeScore >= 900 && safeWave >= 8) {
      const profile = profileOverride || this.storage?.getActiveProfile?.() || null;
      const gemCooldown = Math.max(0, Math.floor(Number(profile?.arcade?.gemCooldown) || 0));
      if (gemCooldown > 0) {
        rewards.starBalls = (rewards.starBalls || 0) + 1;
      } else {
        const pool = getUnlockedArcadeGemPool(profile);
        if (pool.length > 0) {
          const picked = pool[Math.floor(Math.random() * pool.length)];
          rewards.gems = { [picked]: 1 };
        }
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
    if (rewards.cheerCharges) chips.push(`💖 +${rewards.cheerCharges} Cheer Heart${rewards.cheerCharges > 1 ? 's' : ''}`);
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
    this.keysHeld.clear();
    this.pointerActive = false;
    this.activePointerId = null;
    this.pointerTargetY = null;
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

    const arcadeState = this._getArcadeStateSnapshot();
    this.outOfCharges = arcadeState.charges <= 0;
    this.syncHud();

    const rewardChips = this._formatRewardBadges(rewards);
    const hasRewards = rewardChips.length > 0;
    const displayChips = hasRewards
      ? rewardChips
      : [`✨ Score ${MIN_ARCADE_REWARD_SCORE}+ pts to win Star Shards & prizes!`];
    const highScore = recordRes?.highScore ?? Math.max(this.score, this.storage?.getActiveProfile?.()?.arcade?.highScore || 0);
    const isNewBest = Boolean(recordRes?.isNewBest) && this.score > 0;
    const tierMeta = this._getRewardTierMeta(this.score, this.wave);

    const buySectionHtml = arcadeState.charges <= 0
      ? `
        <div class="minigame-standby-hints">
          <span>👣 ${arcadeState.stepsUntilNext} steps → +1 🎟️</span>
          <span>⚔️ ${arcadeState.battlesUntilNext} battle${arcadeState.battlesUntilNext === 1 ? '' : 's'} → +1 🎟️</span>
          <span>⛩️ Shrine / Rival → +1 🎟️</span>
        </div>
        <button
          id="minigame-shard-buy-btn"
          type="button"
          class="setting-toggle-btn is-primary minigame-buy-btn"
          ${arcadeState.canBuyWithShards ? '' : 'disabled aria-disabled="true"'}
        >
          ${arcadeState.canBuyWithShards
            ? `✨ Buy +1 Flight (${arcadeState.shardBuyInCost} ✨ • Have ${arcadeState.starShards} ✨)`
            : `🔒 Buy +1 Flight (${arcadeState.starShards}/${arcadeState.shardBuyInCost} ✨)`}
        </button>
      `
      : '';

    if (this.resultsCardEl) {
      this.resultsCardEl.innerHTML = `
        ${isNewBest ? '<span class="minigame-new-best">🏆 NEW HIGH SCORE!</span>' : ''}
        <span class="minigame-tier-pill">${tierMeta.label}</span>
        <h3>${hasRewards ? '✨ Sky-Hop Flight Complete!' : '🌟 Nice Try, Sky Flyer!'}</h3>
        <div class="minigame-results-stats">
          <span>⭐ Score: <strong>${this.score}</strong></span>
          <span>🌊 Wave: <strong>${this.wave}</strong></span>
          <span>💫 Stars: <strong>${this.starsCollected}</strong></span>
          <span>🏆 Best: <strong>${highScore}</strong></span>
          <span>🎟️ Charges: <strong>${arcadeState.charges}/${arcadeState.maxCharges}</strong></span>
        </div>
        <div class="minigame-results-rewards">
          ${displayChips.map((c) => `<span class="quest-reward-chip${hasRewards ? '' : ' is-retry-tip'}">${c}</span>`).join('')}
        </div>
        <p class="minigame-next-tier">${tierMeta.nextHint}</p>
        ${buySectionHtml}
      `;
      this._bindBuyInButton();
    }

    if (this.replayBtn) {
      if (arcadeState.charges > 0) {
        this.replayBtn.disabled = false;
        this.replayBtn.removeAttribute('aria-disabled');
        this.replayBtn.textContent = `🕹️ Play Again (${arcadeState.charges}/${arcadeState.maxCharges} 🎟️)`;
      } else {
        this.replayBtn.disabled = true;
        this.replayBtn.setAttribute('aria-disabled', 'true');
        this.replayBtn.textContent = `🔒 Play Again (0/${arcadeState.maxCharges} 🎟️)`;
      }
    }

    if (this.resultsEl) {
      this.resultsEl.hidden = false;
    }

    if (hasRewards) {
      this._spawnVictoryBurstParticles();
      this.render(typeof performance !== 'undefined' ? performance.now() : Date.now());
      this.audio?.playArcadeUnlockFanfare?.();
    } else {
      this.audio?.playMenuBlip?.(380);
    }
    this.onRewardsEarned?.(rewards, recordRes);
    if (hasRewards) {
      this.onCelebrate?.({
        icon: '🕹️',
        title: isNewBest ? 'NEW SKY-HOP RECORD!' : 'SKY-HOP REWARDS EARNED!',
        subtitle: rewardChips.join(' • '),
        tone: 'arcade',
      });
    }

    return { score: this.score, wave: this.wave, stars: this.starsCollected, rewards, recordRes };
  }

  syncHud() {
    const profile = this.storage?.getActiveProfile?.();
    const arcadeState = this._getArcadeStateSnapshot();
    const best = Math.max(this.score, Number(profile?.arcade?.highScore) || 0);
    if (this.hudChargesEl) this.hudChargesEl.textContent = `🎟️ ${arcadeState.charges}/${arcadeState.maxCharges}`;
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

    // Particles (starlight trail, stars, sparks & shockwave rings)
    for (const p of this.particles) {
      const progress = Math.min(1, Math.max(0, p.life / Math.max(0.001, p.maxLife)));
      const alpha = Math.max(0, 1 - progress);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (p.shape === 'ring') {
        const radius = p.size + ((p.maxSize || 70) - p.size) * progress;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, 3 * (1 - progress));
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.shape === 'star') {
        const r = Math.max(1.5, p.size * (1 - progress * 0.45));
        ctx.fillStyle = p.color;
        this._drawStarPath(ctx, p.x, p.y, r * 1.4, r * 0.65, 4);
        ctx.fill();
      } else if (p.shape === 'spark') {
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.fillStyle = p.color;
        const len = Math.max(3, p.size * 2.2 * (1 - progress * 0.5));
        ctx.fillRect(-len * 0.5, -1.2, len, 2.4);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.size * (1 - progress * 0.65)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
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
      } else if (ent.kind === 'storm_orb') {
        ctx.save();
        ctx.translate(ent.x, ent.y);
        ctx.rotate(ent.age * 4.5);
        ctx.fillStyle = 'rgba(88, 28, 135, 0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#67e8f9';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.rotate(-ent.age * 4.5);
        ctx.fillStyle = '#e0f2fe';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌀', 0, 1);
        ctx.restore();
      } else if (ent.kind === 'void_meteor') {
        if (ent.x > CANVAS_W + 8) {
          const warnPulse = 0.45 + 0.55 * Math.abs(Math.sin(nowMs * 0.014));
          ctx.save();
          ctx.globalAlpha = warnPulse;
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(CANVAS_W - 18, ent.y, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fecaca';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 15px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('!', CANVAS_W - 18, ent.y + 1);
          ctx.restore();
        } else {
          ctx.save();
          ctx.translate(ent.x, ent.y);
          ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
          ctx.beginPath();
          ctx.moveTo(0, -14);
          ctx.lineTo(36, 0);
          ctx.lineTo(0, 14);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#450a0a';
          ctx.beginPath();
          ctx.arc(0, 0, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.fillStyle = '#fca5a5';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('☄️', 0, 1);
          ctx.restore();
        }
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
    ctx.fillText(`🌌 ${sky.name}${this.wave >= 5 ? ' • 💨' : ''}`, 24, 26);

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
    const arcadeState = this._getArcadeStateSnapshot();
    return {
      open: this.isOpen(),
      paused: Boolean(this.paused),
      outOfCharges: Boolean(this.outOfCharges),
      charges: arcadeState.charges,
      rafActive: this.rafId !== null,
      waveDeckRemaining: this.waveDeck.length,
      waveTemplateCount: WAVE_TEMPLATES.length,
      skyPaletteCount: SKY_PALETTES.length,
      lastWaveId: this.lastWaveId,
      lastOpeningWaveId: this.lastOpeningWaveId,
      recentWaveCount: this.recentWaveIds.length,
      score: this.score,
      wave: this.wave,
      hearts: this.hearts,
      combo: this.combo,
    };
  }
}
