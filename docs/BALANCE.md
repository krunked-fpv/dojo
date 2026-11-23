# Pokémon: Starlight Island — Balance Dial Reference

> **Single Source of Truth:** [`js/balance.js`](../js/balance.js)
>
> All combat pacing, XP rubber-banding, encounter scaling, overworld cadence, and readiness thresholds live in the frozen `BALANCE` object exported by `js/balance.js` (and re-exported by `js/pokemon.js`). Tune dials in `js/balance.js` rather than scattering magic numbers across gameplay modules.

---

## Non-Negotiable Invariants

Keep these invariants intact when tuning dials:

1. **Zero Build / Zero Dependencies:** `js/balance.js` is a pure native ES6 module with no imports; `sw.js` precaches `./js/balance.js` in `CORE_SHELL_URLS`.
2. **Save Sanctity (`starlight_pokemon_save_v1`):**
   - `Pokemon.toJSON()` / `Pokemon.fromJSON()` schema is unchanged.
   - `mon.xpToNext` stays `lv * 22 + 15`.
   - `getBondTier()` retains exact thresholds and values (`xpMult: 1.0 / 1.08 / 1.12 / 1.20`, `critBonus: 0 / 0.02 / 0.04 / 0.04`, `endureChance: 0 / 0 / 0.15 / 0.25`).
   - `BALANCE.combat.critBaseChance` stays `0.08`.
   - `evaluateOffensiveAbility()` / `evaluateDefensiveAbility()` keep exact `mult`, `drainRatio`, and `critBonus` outputs.
   - `getPlayerLevel()` / `getPlayerLevelXpRequired()` / `TRAINER_XP_WEIGHTS` never inspect party or box levels.
3. **Canonical Type Effectiveness:** `calculateDamage().effectiveness` always returns the raw `TYPE_CHART` value (`2`, `1.5`, `1`, `0.5`) so battle badges (`2x SUPER`, `1.5x BOOST`, `0.5x RESIST`) stay accurate, while actual combat damage uses `resolveEffectivenessDamageMult()`.
4. **Post-Cap Drain:** `drainHeal` is always computed *after* `applyComposureGuardrail()` so `drainHeal === Math.max(1, Math.round(damage * drainRatio))`.

---

## Balance Dial Reference

### 1. `BALANCE.combat`

| Dial | Default | Turn UP (↑) | Turn DOWN (↓) |
| --- | --- | --- | --- |
| `damageDivisor` | `28` | Slower fights, higher TTK, less burst damage | Faster fights, lower TTK, more 1-shot risk |
| `statRatioExponent` | `0.78` | ATK/DEF mismatches swing damage more sharply | Flattens stat gaps; tanks and sweepers feel closer |
| `minStatRatio` | `0.45` | Raises damage floor when attacking high-DEF targets | Underleveled or low-ATK hits deal closer to 1 HP |
| `maxStatRatio` | `2.35` | High-ATK sweepers punch harder into squishy targets | Caps glass-cannon burst more tightly |
| `stabMult` | `1.2` | Rewards same-type moves more strongly | Makes off-type coverage moves more competitive |
| `critBaseChance` | `0.08` | More random crits (**keep `0.08`** for bond/ability tests) | Fewer random crits |
| `critMult` | `1.35` | Crits feel deadlier and swingier | Crits feel gentler and safer for kids |
| `superEffectiveDamageMult` | `1.65` | `2x` matchups kill faster (risks 1-shots when stacked) | Softens type counters; longer back-and-forth fights |
| `mildSuperEffectiveMult` | `1.35` | `1.5x` matchups hit noticeably harder | `1.5x` moves feel closer to neutral |
| `resistedDamageMult` | `0.6` | Resisted attacks still chip steadily | Resisted attacks become harder walls |
| `offenseSoftCapKnee` | `2.2` | Allows higher stacked offense before compression | Compresses STAB+SE+Ability+Crit stacking earlier |
| `offenseSoftCapSlope` | `0.45` | Stacked crits/abilities retain more extra punch (must stay `> 0`) | Tighter ceiling on stacked multipliers |
| `stageStep` | `0.2` | Buff/debuff moves swing stats faster (+20%/stage default) | Buff stages matter less per turn |
| `minStage` | `-4` | Less severe max stat drops | Allows deeper stat debuffs |
| `maxStage` | `4` | Higher buff ceiling | Tighter buff ceiling |
| `shieldMult` | `0.68` | Shields mitigate less incoming damage | Shields mitigate more incoming damage |
| `varianceMin` | `0.92` | Tighter damage consistency (higher low rolls) | Wider low-roll variance |
| `varianceMax` | `1.08` | Wider high-roll spikes | Tighter damage consistency (lower high rolls) |
| `potionHealRatio` | `0.5` | Potions restore a larger slice of `maxHp` | Potions recover less HP in mid/late game |
| `potionMinHeal` | `20` | Stronger early-game Potion floor | Smaller early-game Potion heal |

### 2. `BALANCE.combat.composure`

Opt-in full-HP opening guardrail (`options.applyComposure === true`). Only triggers when `defender.hp >= defender.maxHp` and `defender.maxHp > 1`, preventing surprise turn-1 sweeps inside fair level bands while still allowing huge level advantages (e.g., Lv.25 vs Lv.2) to 1-shot cleanly.

| Dial | Default | Turn UP (↑) | Turn DOWN (↓) |
| --- | --- | --- | --- |
| `enabled` | `true` | Guardrail active when battle passes `applyComposure: true` | Disables all composure capping globally |
| `playerFullHpMaxRatio` | `0.72` | Player can lose more HP on a full-HP opening hit | Player keeps more HP cushion on turn 1 |
| `playerGapRampStart` | `4` | Keeps base `0.72` cap across wider enemy level leads | Starts ramping toward `playerMaxRampRatio` sooner |
| `playerGapHardCap` | `8` | Protects player (and bosses) against even larger level gaps | Turns off composure earlier when venturing into dangerous zones |
| `playerMaxRampRatio` | `0.88` | Closer to lethal at `levelGap === playerGapHardCap` | Larger survival margin even at `+8` level disadvantage |
| `wildFullHpMaxRatio` | `0.84` | Wilds can lose more HP on turn 1 (easier catch setup) | Wilds stay bulkier on turn 1 |
| `wildMaxLevelAdvantage` | `5` | Prevents 1-shotting slightly weaker wilds across a wider gap | Allows players to 1-shot weaker wilds sooner |
| `bossFullHpMaxRatio` | `0.65` | Bosses can be bursted down faster on turn 1 | Boss fights guarantee at least a 2-turn opening exchange |

### 3. `BALANCE.progression`

| Dial | Default | Turn UP (↑) | Turn DOWN (↓) |
| --- | --- | --- | --- |
| `maxLevel` | `50` | Raises global level cap | Lowers global level cap |
| `upgradeStatBonusPerTier` | `0.04` | Each ★ Star Rank grants stronger stats (★5 = `+20%` default) | Shrinks stat gap between ★0 and ★5 Pokémon |
| `upgradeXpRatio` | `0.45` | Upgrading with Star Shards grants bigger level jumps | Keeps Star-Rank upgrades from snowballing levels |
| `upgradeMinXp` | `25` | Higher minimum XP floor for low-level upgrades | Lower floor on early upgrades |
| `powerTopWeights` | `[0.5, 0.3, 0.2]` | Shifts Trainer Power weight across top 3 party members | Emphasizes broader team average vs solo ace |
| `powerPairWeights` | `[0.65, 0.35]` | Shifts Trainer Power weight for 2-member teams | Balances lead vs partner evenly |
| `powerBadgeBonusPerBadge` | `0.15` | Badges escalate scaled Shrine/Rival levels faster | Scaled encounters track team level more strictly |
| `powerBadgeBonusCap` | `2.0` | Higher late-game badge level offset | Smaller late-game badge level offset |

### 4. `BALANCE.xp`

| Dial | Default | Turn UP (↑) | Turn DOWN (↓) |
| --- | --- | --- | --- |
| `enemyLevelFactor` | `11` | Faster leveling across all battles | Slower leveling curve |
| `baseFlat` | `10` | Faster early-game leveling (Lv.1–8) | Slower early-game leveling |
| `minActiveXp` | `8` | Higher XP floor when heavily overleveled | Smaller floor when farming low-level foes |
| `minBenchXp` | `5` | Higher minimum bench XP floor | Smaller minimum bench XP |
| `overlevelDecayPerLevel` | `0.24` | Overleveled leads taper down faster (anti-snowball) | Overleveled leads keep earning fuller XP |
| `overlevelMinMult` | `0.22` | Higher floor for overleveled XP | Stricter XP wall when farming weak wilds |
| `underlevelBoostPerLevel` | `0.14` | Underleveled leads catch up faster on tough wins | Gentler catch-up bonus |
| `underlevelMaxMult` | `1.65` | Bigger jackpot XP for giant-slaying wins | Tighter cap on catch-up XP |
| `benchBaseShare` | `0.42` | Equal-level bench teammates grow faster passively | Encourages rotating teammates into active combat |
| `benchCatchupPerLevel` | `0.08` | Lagging bench teammates catch up to the lead faster | Slower bench catch-up per level behind |
| `benchMaxShare` | `0.78` | Higher maximum catch-up share for low-level bench mons | Lower cap on passive bench catch-up |
| `benchOverlevelMinShare` | `0.2` | Higher share when bench mon is `>3` levels above enemy | Stronger taper for overleveled bench mons |

### 5. `BALANCE.scaling`

| Dial | Default | Turn UP (↑) | Turn DOWN (↓) |
| --- | --- | --- | --- |
| `biomeOffsets` | `village: -2, forest: -1, cave/water/volcano/desert: 0, peak..rift: +1` | Makes scaled biomes tougher relative to Player Level | Makes scaled biomes gentler relative to Player Level |
| `wildMaxBonusAboveRange` | `3` | Allows rare + elite + deep wilds to spike further above `maxLv` | Tightens max wild level ceiling above biome range |
| `noviceOutskirtsCatchFactorCutoff` | `0.73` | Treats more mid-catch species as tough bruisers at `0` badges & `depthTier === 0` | Restricts novice outskirts weight scaling to fewer hard-to-catch bruisers |
| `noviceOutskirtsToughWeightMult` | `0.25` | Increases tough bruiser frequency in `0`-badge outskirts (`depthTier === 0`, clamped `>= 1`) | Reduces tough bruisers in `0`-badge outskirts (`>= 1` clamp preserves `1025/1025` reachability) |
| `noviceRarePatchMinBadgesForElite` | `1` | Delays random Elite rolls on rare grass patches to higher badge counts (`forceElite` still overrides) | Unlocks random rare-patch Elites earlier (`0` restores 0-badge rare Elites) |
| `wildEliteBaseChance` | `0.06` | More frequent wild Elites once `badges >= 2` | Fewer surprise wild Elites |
| `wildEliteBadgeStep` | `0.012` | Elite rate climbs faster with badges | Flatter elite spawn curve |
| `wildEliteChanceCap` | `0.18` | Higher max grass Elite rate in late game | Lower late-game Elite ceiling |
| `wildRareEliteChanceLow` | `0.25` | More Elites on rare patches (`badges < 4`) | Gentler early rare patches |
| `wildRareEliteChanceHigh` | `0.32` | More Elites on rare patches (`badges >= 4`) | Gentler veteran rare patches |
| `shrineGuardMaxOffsetAbovePower` | `1` | Scaled Shrine Guardians outlevel Trainer Power more | Keeps first-clear Shrine Guardians near party level |
| `shrineGuardMaxTier` | `3` | Higher max Star Rank on Shrine Guardians | Lower stat wall on Shrine Guardians |
| `shrineTrialBaseOffset` | `1` | Higher baseline Astral Shrine Trial levels | Gentler initial Astral Trial entry |
| `shrineTrialMaxCountBonus` | `3` | Steeper escalation across repeated Trial clears | Flatter repeat Trial curve |
| `shrineTrialMaxTier` | `4` | Allows ★5 Trial bosses (min stays ★2) | Softer Trial boss stats |
| `rivalRematchBaseBoost` | `1` | Tougher first Rival rematch | Gentler first Rival rematch |
| `rivalRematchMaxCountBonus` | `3` | Steeper escalation across repeated Rival rematches | Caps Rival rematch escalation tighter |
| `rivalMaxTier` | `3` | Higher Star Rank on Rival parties | Keeps Rival parties below ★4/★5 stat walls |
| `apexTraitDamageMult` | `1.08` | Apex wilds hit harder | Apex wilds hit closer to standard wilds |

### 6. `BALANCE.overworld`

| Dial | Default | Turn UP (↑) | Turn DOWN (↓) |
| --- | --- | --- | --- |
| `minStepsBetweenWilds` | `5` | Longer breathing room between grass encounters | More frequent wild battles |
| `wildEncounterChance` | `0.19` | Faster encounter triggers after cooldown | Quieter exploration |
| `maxEncounterStreak` | `10` | Longer dry streaks allowed before pity encounter | Guarantees encounters sooner when hunting |
| `postWarpGraceSteps` | `3` | More safe steps after warping into a biome | Encounters can trigger immediately after warp |
| `postEscapeGraceSteps` | `3` | Easier to walk out of grass after fleeing | Higher chance of re-encountering right after Run |

### 7. `BALANCE.readiness`

| Dial | Default | Turn UP (↑) | Turn DOWN (↓) |
| --- | --- | --- | --- |
| `favoredDelta` | `-2` | Marks more encounters `✅ Favored` | Requires bigger level lead for `✅ Favored` |
| `balancedMaxDelta` | `2` | Wider `⚖️ Even Match` band | Flags slight underleveling as `⚠️ Tough` sooner |
| `challengingMaxDelta` | `5` | Wider `⚠️ Tough` band before `🚨 Risky` | Warns `🚨 Risky` earlier on level gaps |
| `lowHpWarnRatio` | `0.65` | Flags `needsHeal` earlier when party takes light chip damage | Only warns to heal when party is heavily worn down |

> **Non-Biome 100%-Healthy-Weakness Escalation (`assessEncounterReadiness`):** When evaluating a non-biome encounter (`source !== 'biome'`, falling back to `kind !== 'biome'` when `source` is omitted) whose base level tier is `balanced` (`tierIdx === 1` / `⚖️ Even Match`) with `levelDelta >= 1`, no party super-effective type advantage (`!hasTypeAdvantage`), and `100%` of healthy party defensive types weak to at least one enemy type (`defensiveTypes.length > 0 && weakCount === defensiveTypes.length`), `assessEncounterReadiness` escalates `tierIdx` from `1` to `2` (`'challenging'` / `⚠️ Tough`) before applying `healthyCount === 0 -> 3` and the `needsHeal` (`+1`) step. This preserves neutral/resistant matchups (e.g., Lv.5 Bulbasaur vs Lv.6/7 Pikachu remains `⚖️ Even Match`) while flagging mono-weak pairings (e.g., Lv.5 Squirtle vs Lv.6 Pikachu) as `⚠️ Tough` so players see the `✨ Farm Zone` pivot.

---

## Combat Formula & Target TTK Curves

### Damage Pipeline (`calculateDamage`)

1. **Softened Stat Ratio:** `statRatio = softenStatRatio(effAtk, effDef) = clamp(atk / def, 0.45, 2.35) ^ 0.78`.
2. **Base Power:** `basePower = (((2 * level) / 5 + 2) * movePower * statRatio) / 28`.
3. **Effective Type Multiplier:** `effDamageMult = resolveEffectivenessDamageMult(rawEffectiveness)` (`2 -> 1.65`, `1.5 -> 1.35`, `1 -> 1.0`, `0.5 -> 0.6`, `0 -> 0`). Raw `effectiveness` is still returned on the result object.
4. **Offensive Soft Cap:** `offenseMult = applyOffenseSoftCap(stab * effDamageMult * critMult * attackerAbMult * traitDmgMult)`:
   - Below `2.2`: linear (`mult`).
   - Above `2.2`: `2.2 + (mult - 2.2) * 0.45` — strictly monotonic (`crit > nonCrit`, `ability > noAbility`) while stopping 4x–5x instant-kill spikes.
5. **Mitigation & Variance:** `preComposure = max(1, round(basePower * offenseMult * variance * shieldMult * defenderAbMult))`.
6. **Optional Composure Guardrail:** When `options.applyComposure === true` and defender is at full HP (`hp >= maxHp > 1`), caps opening hits by `defenderSide`, `isBoss`, and `levelGap`.
7. **Post-Cap Drain:** `drainHeal = max(1, round(finalDamage * drainRatio))`.

### Target TTK Curves (Lv. 5 – Lv. 35)

| Scenario | Expected Damage (% Max HP) | Target TTK | Notes |
| --- | --- | --- | --- |
| Equal-level neutral (e.g. Tackle / standard STAB) | `22% – 36%` | **3 – 4 turns** | Leaves room for Shields, buffs, catching, and Potions |
| Equal-level Super Effective + STAB | `40% – 60%` | **2 – 3 turns** | Rewards type knowledge without turn-1 deletion |
| Equal-level SE + STAB + Ability + Crit | `50% – 72%` | **2 turns** | Soft cap (`2.2` knee) prevents zero-counterplay 1-shots |
| Boss / Shrine Guardian opening hit (Composure on) | `<= 65%` on boss, `<= 72%` on player | **3 – 5 turns** | Guarantees both sides act; Shields and Potions shine |
| Underleveled (`+4` to `+8` enemy lead, Composure on) | Player opening cap ramps `72% -> 88%` | **2 turns** | Survivable turn 1 with clear danger warning; `+9` gap turns off composure |
| Overleveled sweep (`+6+` player lead vs wild) | Uncapped (`> 100%`) | **1 turn** | Composure steps aside so veteran trainers breeze past Lv.2 wilds |

---

## XP Rubber-Band & Bench Share Reference

Base active XP: `baseXp = round((enemyLevel * 11 + 10) * scale)`.

### Active Multiplier (`getXpDeltaMultiplier(monLevel, enemyLevel)`)

| Level Delta (`enemyLv - monLv`) | Meaning | `deltaMult` | Flag |
| --- | --- | --- | --- |
| `+5` or higher | Heavily underleveled | `1.65x` (cap) | `isCatchup: true` |
| `+3` | Underleveled | `1.42x` | `isCatchup: true` |
| `+1` | Slightly underleveled | `1.14x` | `isCatchup: true` |
| `0` | Equal level | `1.00x` | Neutral |
| `-1` | 1 level over | `0.76x` | `isTapered: true` |
| `-2` | 2 levels over | `0.5776x` | `isTapered: true` |
| `-3` | 3 levels over | `0.439x` | `isTapered: true` |
| `-4` | 4 levels over | `0.3336x` | `isTapered: true` |
| `-5` | 5 levels over | `0.2536x` | `isTapered: true` |
| `-6` or lower | Heavily overleveled | `0.22x` (floor) | `isTapered: true` |

### Smart Bench Share (`computeBenchXpShare(benchMon, activeMon, enemy, activeBaseXp)`)

Bench share always scales off the **un-tapered** `activeBaseXp` so an overleveled lead never starves a low-level teammate:

| Bench Position | `shareRatio` | `isCatchup` |
| --- | --- | --- |
| `5+` levels behind active (and `<= 3` above enemy) | `0.78` (cap) | `true` |
| `2` levels behind active (and `<= 3` above enemy) | `0.58` | `true` |
| Equal to active (and `<= 3` above enemy) | `0.42` (base) | `false` |
| `4` levels above enemy | `0.34` | `false` |
| `6+` levels above enemy | `0.20` (floor) | `false` |

---

## Scaling Anchor Rules

Starlight Island intentionally separates **three progression anchors** so catching a high-level Pokémon or rotating a new starter never breaks world difficulty:

1. **Trainer Player Level (`getPlayerLevel(profile)`)**
   - Computed *strictly* from trainer milestones (`battlesWon`, `badges`, `shrinesCleared`, `rivalsDefeated`, rematches, trials, quests, unique Dex catches). **Never reads party or box levels.**
   - Anchors **wild biome scaling** (`getBiomeScaledRange`) and **recommended farming zones** (`resolveRecommendedFarmingZone`).
2. **Trainer Power Level (`getTrainerPowerLevel(profile)`)**
   - Weighted top-3 party levels (`50% / 30% / 20%`, or `65% / 35%` for 2, `100%` for 1) plus a capped badge bonus (`min(2.0, badges * 0.15)`).
   - Anchors **set-piece bosses**: `getScaledShrineGuard` (`+1` max offset, max `★3`), `getScaledShrineTrial` (`+1` base + up to `+3` trial bonus, `★2..★4`), and `getScaledRivalParty` (`+1` base + up to `+3` rematch bonus, max `★3`).
3. **Party Readiness Level (`getPartyReadinessLevel(profile)` -> `assessEncounterReadiness`)**
   - Weighted top-3 **healthy** party levels (falls back to all team if all fainted, `5` if empty).
   - Powers pre-battle readiness pills (`✅ Favored`, `⚖️ Even Match`, `⚠️ Tough`, `🚨 Risky`), low-HP heal warnings (`< 65%` avg HP or any fainted), type counter hints, and kid-friendly tactical tips.

---

## Running a Node Balance Simulation

No build step or external packages are required. Run the static CI gate plus a quick Node simulation directly from the repo root:

```bash
# 1. Verify syntax, sw.js precache parity, dataset counts, walkability & economy invariants
node scripts/ci-static-gate.mjs

# 2. Run a quick TTK, composure, XP rubber-band & scaling spot check across Lv. 5–35
node --input-type=module -e "
import { BALANCE, computeBattleXpReward, computeBenchXpShare } from './js/balance.js';
import { MOVES, SHRINES, RIVAL_TRAINERS } from './js/config.js';
import {
  createPokemon, calculateDamage, getTrainerPowerLevel,
  getScaledShrineGuard, getScaledShrineTrial, getScaledRivalParty,
  assessEncounterReadiness,
} from './js/pokemon.js';

const s5 = createPokemon(7, 5), c5 = createPokemon(4, 5);
console.log('Lv.5 Squirtle Water Gun vs Charmander:', calculateDamage(s5, c5, MOVES.water_gun, { forceHit: true, forceCrit: false, fixedVariance: 1 }));
console.log('Lv.5 SE+Crit+Composure:', calculateDamage(s5, c5, MOVES.bubble_beam, { forceHit: true, forceCrit: true, fixedVariance: 1, applyAbilities: true, applyComposure: true, defenderSide: 'player' }));
console.log('XP Equal (Lv.10 vs 10):', computeBattleXpReward({ level: 10 }, { level: 10 }));
console.log('XP Overleveled (Lv.20 vs 10):', computeBattleXpReward({ level: 20 }, { level: 10 }));
console.log('XP Underleveled (Lv.10 vs 15):', computeBattleXpReward({ level: 10 }, { level: 15 }));
console.log('Bench Catch-Up (Lv.6 behind Lv.12 vs Lv.10):', computeBenchXpShare({ level: 6 }, { level: 12 }, { level: 10 }, 120));
const vet = { team: [createPokemon(25, 22), createPokemon(6, 20), createPokemon(9, 18)], badges: ['a','b','c','d','e','f'], rivalsDefeated: ['rival_leo'] };
console.log('Veteran Power:', getTrainerPowerLevel(vet));
console.log('Shrine Guard:', getScaledShrineGuard(Object.values(SHRINES)[0], vet));
console.log('Shrine Trial:', getScaledShrineTrial(Object.values(SHRINES)[0], vet));
console.log('Rival Rematch:', getScaledRivalParty(Object.values(RIVAL_TRAINERS)[0], vet));
console.log('Readiness:', assessEncounterReadiness(vet, { kind: 'shrine', targetLevel: 23, enemyTypes: ['fire'] }));
"
```
