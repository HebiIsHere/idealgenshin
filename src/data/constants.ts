import { SubstatType, ElementType } from '../types';

/**
 * Game constants for Genshin Impact damage calculations.
 * All percentage values stored as decimals (50% → 0.5).
 */

// ===== Sub-stat Mid Values (P0 Fixed) =====
// Each sub-stat roll is approximated by its mid value for optimization.

/** Mid value per roll for each sub-stat type. Percentage types are decimals. */
export const SUBSTAT_MID_VALUES: Record<SubstatType, number> = {
  [SubstatType.CRIT_RATE]: 0.033,       // 3.3%
  [SubstatType.CRIT_DMG]: 0.066,        // 6.6%
  [SubstatType.ATK_PERCENT]: 0.05,       // 5.0%
  [SubstatType.HP_PERCENT]: 0.05,        // 5.0%
  [SubstatType.DEF_PERCENT]: 0.062,      // 6.2%
  [SubstatType.ELEMENTAL_MASTERY]: 19.8, // flat
  [SubstatType.ENERGY_RECHARGE]: 0.055,  // 5.5%
  [SubstatType.ATK_FLAT]: 18.0,          // flat
  [SubstatType.HP_FLAT]: 268.5,          // flat
  [SubstatType.DEF_FLAT]: 21.4,          // flat
  // Elemental damage bonus types — not rollable as sub-stats, set to 0
  [SubstatType.PYRO_DMG_BONUS]: 0,
  [SubstatType.HYDRO_DMG_BONUS]: 0,
  [SubstatType.CRYO_DMG_BONUS]: 0,
  [SubstatType.ELECTRO_DMG_BONUS]: 0,
  [SubstatType.ANEMO_DMG_BONUS]: 0,
  [SubstatType.GEO_DMG_BONUS]: 0,
  [SubstatType.DENDRO_DMG_BONUS]: 0,
  [SubstatType.PHYSICAL_DMG_BONUS]: 0,
  [SubstatType.HEALING_BONUS]: 0,
};

/** Sub-stat types that can appear as artifact sub-stats (not main-stat only). */
export const ROLLABLE_SUBSTAT_TYPES: SubstatType[] = [
  SubstatType.CRIT_RATE,
  SubstatType.CRIT_DMG,
  SubstatType.ATK_PERCENT,
  SubstatType.HP_PERCENT,
  SubstatType.DEF_PERCENT,
  SubstatType.ELEMENTAL_MASTERY,
  SubstatType.ENERGY_RECHARGE,
  SubstatType.ATK_FLAT,
  SubstatType.HP_FLAT,
  SubstatType.DEF_FLAT,
];

/** Maximum rolls a single sub-stat can receive on a 5-star artifact. */
export const MAX_ROLLS_PER_SUBSTAT = 6;

/** Maximum total sub-stat rolls across 5 artifacts (45 slots × 1.176 max tier ≈ 53). */
export const MAX_TOTAL_ROLLS = 53;

// ===== Main Stat Max Values (5-star, Level 20) =====

export const MAIN_STAT_MAX_VALUES: Record<SubstatType, number> = {
  [SubstatType.HP_FLAT]: 4780,
  [SubstatType.ATK_FLAT]: 311,
  [SubstatType.HP_PERCENT]: 0.466,
  [SubstatType.ATK_PERCENT]: 0.466,
  [SubstatType.DEF_PERCENT]: 0.583,
  [SubstatType.CRIT_RATE]: 0.311,
  [SubstatType.CRIT_DMG]: 0.622,
  [SubstatType.ELEMENTAL_MASTERY]: 186.5,
  [SubstatType.ENERGY_RECHARGE]: 0.518,
  [SubstatType.DEF_FLAT]: 0,
  [SubstatType.PYRO_DMG_BONUS]: 0.466,
  [SubstatType.HYDRO_DMG_BONUS]: 0.466,
  [SubstatType.CRYO_DMG_BONUS]: 0.466,
  [SubstatType.ELECTRO_DMG_BONUS]: 0.466,
  [SubstatType.ANEMO_DMG_BONUS]: 0.466,
  [SubstatType.GEO_DMG_BONUS]: 0.466,
  [SubstatType.DENDRO_DMG_BONUS]: 0.466,
  [SubstatType.PHYSICAL_DMG_BONUS]: 0.583,
  [SubstatType.HEALING_BONUS]: 0.359,
};

// ===== Main Stat by Slot Mapping =====

/** Valid main stat types for each artifact slot. */
export const MAIN_STAT_BY_SLOT: Record<string, SubstatType[]> = {
  FLOWER: [SubstatType.HP_FLAT],
  FEATHER: [SubstatType.ATK_FLAT],
  SANDS: [SubstatType.ATK_PERCENT, SubstatType.HP_PERCENT, SubstatType.DEF_PERCENT, SubstatType.ELEMENTAL_MASTERY, SubstatType.ENERGY_RECHARGE],
  GOBLET: [SubstatType.ATK_PERCENT, SubstatType.HP_PERCENT, SubstatType.DEF_PERCENT, SubstatType.ELEMENTAL_MASTERY, SubstatType.PYRO_DMG_BONUS, SubstatType.HYDRO_DMG_BONUS, SubstatType.CRYO_DMG_BONUS, SubstatType.ELECTRO_DMG_BONUS, SubstatType.ANEMO_DMG_BONUS, SubstatType.GEO_DMG_BONUS, SubstatType.DENDRO_DMG_BONUS, SubstatType.PHYSICAL_DMG_BONUS],
  CIRCLET: [SubstatType.ATK_PERCENT, SubstatType.HP_PERCENT, SubstatType.DEF_PERCENT, SubstatType.CRIT_RATE, SubstatType.CRIT_DMG, SubstatType.ELEMENTAL_MASTERY, SubstatType.HEALING_BONUS],
};

// ===== Resistance Table =====

/** Base elemental resistance for common enemy types (as decimal). */
export const ENEMY_BASE_RESISTANCE: Record<string, number> = {
  STANDARD: 0.10,
  HUMANOID: 0.10,
  BOSS: 0.10,
  PYRO_SLIME_PYRO: 0.75,
  HYDRO_SLIME_HYDRO: 0.75,
  CRYO_SLIME_CRYO: 0.75,
  ELECTRO_SLIME_ELECTRO: 0.75,
  RUIN_PHYSICAL: 0.70,
};

/** Default enemy level for calculations. Updated to 100 for 5.2 version. */
export const DEFAULT_ENEMY_LEVEL = 100;

/** Default enemy resistance (10%). */
export const DEFAULT_ENEMY_RESISTANCE = 0.10;

// ===== Defense Formula Constants =====

/** Character base level constant used in defense calculation. */
export const DEF_LEVEL_CONSTANT = 100;

/** Defense reduction hard cap. KQM: hard capped at 90%. */
export const DEF_REDUCTION_CAP = 0.9;

// ===== Elemental Mastery Scaling =====

/**
 * Elemental mastery bonus formula for amplifying reactions (Vaporize/Melt).
 * Bonus = 2.78 × EM / (EM + 1400)
 */
export function getAmplifyingEMBonus(em: number): number {
  return (2.78 * em) / (em + 1400);
}

/**
 * Elemental mastery bonus formula for transformative reactions.
 * Bonus = 16 × EM / (EM + 2000)
 */
export function getTransformativeEMBonus(em: number): number {
  return (16 * em) / (em + 2000);
}

/**
 * Elemental mastery bonus formula for catalyze reactions (Aggravation/Spread).
 * Bonus = 5 × EM / (EM + 1200)
 */
export function getAggravationEMBonus(em: number): number {
  return (5 * em) / (em + 1200);
}

/**
 * Elemental mastery bonus formula for moonsign reactions.
 * Bonus = 6 × EM / (EM + 2000)
 */
export function getMoonsignEMBonus(em: number): number {
  return (6 * em) / (em + 2000);
}

// ===== Reaction Multipliers =====

/** Base reaction multiplier for amplifying reactions. */
export const AMPLIFYING_MULTIPLIERS: Record<string, number> = {
  VAPORIZE_PYRO_HYDRO: 1.5,  // Pyro on Hydro
  VAPORIZE_HYDRO_PYRO: 2.0,  // Hydro on Pyro
  MELT_CRYO_PYRO: 1.5,       // Cryo on Pyro
  MELT_PYRO_CRYO: 2.0,       // Pyro on Cryo
};

// ===== Transformative Reaction Rates (5.2 Version) =====

/** Transformative reaction base rates for version 5.2. */
export const TRANSFORM_RATES_V52: Record<string, number> = {
  OVERLOADED: 2.75,
  SUPERCONDUCT: 1.5,
  ELECTRO_CHARGED: 2.0,
  SWIRL: 0.6,
  HYPERBLOOM: 3.0,
  BLOOM: 2.0,
  BURGEON: 3.0,
  BURNING: 0.25,
  SHATTER: 3.0,
};

/** Level multipliers for transformative/catalyze/moonsign base damage. */
export const LEVEL_MULTIPLIERS: Record<number, number> = {
  1: 17.17,
  10: 28.21,
  20: 53.75,
  30: 95.02,
  40: 152.61,
  50: 234.97,
  60: 351.71,
  70: 765.64,
  80: 1077.44,
  85: 1027.50,
  90: 1446.85,
  95: 1561.46,
  100: 1674.81,
};

/**
 * Get the level multiplier for a given character level.
 * If the exact level is not in the table, returns the nearest available level.
 * @param level - Character level (1–100)
 * @returns Level multiplier value
 */
export function getLevelMultiplier(level: number): number {
  if (LEVEL_MULTIPLIERS[level] !== undefined) {
    return LEVEL_MULTIPLIERS[level];
  }
  // Find the nearest available level
  const levels = Object.keys(LEVEL_MULTIPLIERS).map(Number).sort((a, b) => a - b);
  const nearest = levels.reduce((prev, curr) =>
    Math.abs(curr - level) < Math.abs(prev - level) ? curr : prev
  );
  return LEVEL_MULTIPLIERS[nearest];
}

// ===== Catalyze (Aggravation/Spread) Constants =====

/** Base rates for catalyze reactions. */
export const AGGRAVATION_BASE_RATES: Record<string, number> = {
  AGGRAVATION: 1.15,  // 超激化
  SPREAD: 1.25,       // 蔓激化
};

// ===== Moonsign Constants =====

/** Base rates for moonsign reactions. */
export const MOON_RATES: Record<string, number> = {
  MOON_BLOOM: 1.0,              // 月绽放
  MOON_ELECTRO: 3.0,            // 月感电
  MOON_CRYSTAL: 1.6,            // 月结晶
  REACTION_MOON_ELECTRO: 1.8,   // 反应月感电
  REACTION_MOON_CRYSTAL: 0.96,  // 反应月结晶
};

// ===== Ascension Stat Values =====
/** Character ascension stat at 6th ascension (level 90 with max ascension). */
export const ASCENSION_6_VALUES: Record<string, number> = {
  CRIT_RATE: 0.312,        // 31.2%
  CRIT_DMG: 0.624,         // 62.4%
  ATK_PERCENT: 0.24,       // 24%
  HP_PERCENT: 0.24,        // 24%
  DEF_PERCENT: 0.30,       // 30%
  ELEMENTAL_MASTERY: 96,
  ENERGY_RECHARGE: 0.267,  // 26.7%
};

// ===== Element → Damage Bonus Stat Mapping =====

/** Map element types to their corresponding damage bonus stat type on Goblet. */
export const ELEMENT_DMG_BONUS_STAT: Record<string, SubstatType> = {
  [ElementType.PYRO]: SubstatType.PYRO_DMG_BONUS,
  [ElementType.HYDRO]: SubstatType.HYDRO_DMG_BONUS,
  [ElementType.CRYO]: SubstatType.CRYO_DMG_BONUS,
  [ElementType.ELECTRO]: SubstatType.ELECTRO_DMG_BONUS,
  [ElementType.ANEMO]: SubstatType.ANEMO_DMG_BONUS,
  [ElementType.GEO]: SubstatType.GEO_DMG_BONUS,
  [ElementType.DENDRO]: SubstatType.DENDRO_DMG_BONUS,
};

// ===== Sub-stat Display Names =====

/** Chinese display names for all stat types. */
export const STAT_DISPLAY_NAMES: Record<SubstatType, string> = {
  [SubstatType.ATK_PERCENT]: '攻击力%',
  [SubstatType.ATK_FLAT]: '攻击力',
  [SubstatType.HP_PERCENT]: '生命值%',
  [SubstatType.HP_FLAT]: '生命值',
  [SubstatType.DEF_PERCENT]: '防御力%',
  [SubstatType.DEF_FLAT]: '防御力',
  [SubstatType.CRIT_RATE]: '暴击率',
  [SubstatType.CRIT_DMG]: '暴击伤害',
  [SubstatType.ELEMENTAL_MASTERY]: '元素精通',
  [SubstatType.ENERGY_RECHARGE]: '充能效率',
  [SubstatType.PYRO_DMG_BONUS]: '火元素伤害加成',
  [SubstatType.HYDRO_DMG_BONUS]: '水元素伤害加成',
  [SubstatType.CRYO_DMG_BONUS]: '冰元素伤害加成',
  [SubstatType.ELECTRO_DMG_BONUS]: '雷元素伤害加成',
  [SubstatType.ANEMO_DMG_BONUS]: '风元素伤害加成',
  [SubstatType.GEO_DMG_BONUS]: '岩元素伤害加成',
  [SubstatType.DENDRO_DMG_BONUS]: '草元素伤害加成',
  [SubstatType.PHYSICAL_DMG_BONUS]: '物理伤害加成',
  [SubstatType.HEALING_BONUS]: '治疗加成',
};

/** Whether a sub-stat type is a percentage type (vs flat). */
export const PERCENTAGE_STAT_TYPES: Set<SubstatType> = new Set([
  SubstatType.ATK_PERCENT,
  SubstatType.HP_PERCENT,
  SubstatType.DEF_PERCENT,
  SubstatType.CRIT_RATE,
  SubstatType.CRIT_DMG,
  SubstatType.ENERGY_RECHARGE,
  SubstatType.PYRO_DMG_BONUS,
  SubstatType.HYDRO_DMG_BONUS,
  SubstatType.CRYO_DMG_BONUS,
  SubstatType.ELECTRO_DMG_BONUS,
  SubstatType.ANEMO_DMG_BONUS,
  SubstatType.GEO_DMG_BONUS,
  SubstatType.DENDRO_DMG_BONUS,
  SubstatType.PHYSICAL_DMG_BONUS,
  SubstatType.HEALING_BONUS,
]);
