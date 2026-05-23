/**
 * Tests for the Damage Formula — the most critical part of the optimizer.
 *
 * Validates each zone independently and the full pipeline end-to-end
 * using hand-computed expected values based on the Genshin damage formula.
 *
 * Covers all 5 paths: DIRECT, AMPLIFYING, TRANSFORMATIVE, CATALYZE, MOONSIGN.
 */
import { describe, it, expect } from 'vitest';
import { BaseDamageZone } from '../engine/zones/base';
import { ScalingZone } from '../engine/zones/scaling';
import { BonusZone } from '../engine/zones/bonus';
import { CritZone } from '../engine/zones/crit';
import { ResistanceZone } from '../engine/zones/resistance';
import { DefenseZone } from '../engine/zones/defense';
import { AmplifyingZone } from '../engine/zones/amplifying';
import { TransformativeZone } from '../engine/zones/transformative';
import { CatalyzeZone } from '../engine/zones/catalyze';
import { MoonsignZone } from '../engine/zones/moonsign';
import { ElevationZone } from '../engine/zones/elevation';
import { DamageFormula } from '../engine/formula';
import { ReactionType, DamagePath } from '../types';
import type { DamageContext, ComputedStats, StatScaling } from '../types';
import {
  DEFAULT_ENEMY_LEVEL,
  TRANSFORM_RATES_V52,
  LEVEL_MULTIPLIERS,
  AGGRAVATION_BASE_RATES,
  MOON_RATES,
  getLevelMultiplier,
  getAggravationEMBonus,
  getMoonsignEMBonus,
  getTransformativeEMBonus,
} from '../data/constants';

// ============================================================
// Helper: common StatScaling presets
// ============================================================
const ATK_SCALING: StatScaling = { atkRatio: 1, hpRatio: 0, defRatio: 0, emRatio: 0 };
const HP_SCALING: StatScaling = { atkRatio: 0, hpRatio: 1, defRatio: 0, emRatio: 0 };
const DEF_SCALING: StatScaling = { atkRatio: 0, hpRatio: 0, defRatio: 1, emRatio: 0 };
const MIXED_ATK_EM: StatScaling = { atkRatio: 0.5, hpRatio: 0, defRatio: 0, emRatio: 0.5 };

// ============================================================
// Helper: create a minimal DamageContext for testing
// ============================================================
function makeCtx(overrides: Partial<DamageContext> = {}): DamageContext {
  const defaultStats: ComputedStats = {
    totalHp: 30000,
    totalAtk: 2000,
    totalDef: 800,
    critRate: 0.5,
    critDmg: 1.0,
    dmgBonus: 0.466,
    em: 100,
    er: 1.0,
  };
  return {
    stats: defaultStats,
    skillMultiplier: 2.0,
    statScaling: ATK_SCALING,
    reactionType: ReactionType.NONE,
    enemyLevel: 90,
    enemyResistance: 0.10,
    amplifyingMultiplier: 0,
    characterLevel: 90,
    defReductions: [],
    defIgnore: 0,
    elevationBonus: 0,
    extraBonuses: {},
    independentBonus: 0,
    ...overrides,
  };
}

// ============================================================
// 1. BaseDamageZone — multi-attribute scaling
// ============================================================
describe('BaseDamageZone', () => {
  it('ATK scaling: base = skillMultiplier * totalAtk', () => {
    const zone = new BaseDamageZone();
    const ctx = makeCtx({ statScaling: ATK_SCALING, skillMultiplier: 3.0 });
    // 3.0 * 2000 = 6000
    expect(zone.calculate(ctx)).toBeCloseTo(6000, 2);
  });

  it('HP scaling: base = skillMultiplier * totalHp (Hu Tao)', () => {
    const zone = new BaseDamageZone();
    const ctx = makeCtx({ statScaling: HP_SCALING, skillMultiplier: 0.1 });
    // 0.1 * 30000 = 3000
    expect(zone.calculate(ctx)).toBeCloseTo(3000, 2);
  });

  it('DEF scaling: base = skillMultiplier * totalDef', () => {
    const zone = new BaseDamageZone();
    const ctx = makeCtx({ statScaling: DEF_SCALING, skillMultiplier: 1.5 });
    // 1.5 * 800 = 1200
    expect(zone.calculate(ctx)).toBeCloseTo(1200, 2);
  });

  it('Multi-attribute scaling: atkRatio=0.5, emRatio=0.5', () => {
    const zone = new BaseDamageZone();
    const ctx = makeCtx({ statScaling: MIXED_ATK_EM, skillMultiplier: 2.0 });
    // rawBase = 2000*0.5 + 100*0.5 = 1000 + 50 = 1050
    // baseDamage = 2.0 * 1050 = 2100
    expect(zone.calculate(ctx)).toBeCloseTo(2100, 2);
  });

  it('All ratios zero yields baseDamage = 0', () => {
    const zone = new BaseDamageZone();
    const noScaling: StatScaling = { atkRatio: 0, hpRatio: 0, defRatio: 0, emRatio: 0 };
    const ctx = makeCtx({ statScaling: noScaling, skillMultiplier: 2.0 });
    expect(zone.calculate(ctx)).toBe(0);
  });
});

// ============================================================
// 2. ScalingZone (passthrough = 1.0)
// ============================================================
describe('ScalingZone', () => {
  it('always returns 1.0', () => {
    const zone = new ScalingZone();
    expect(zone.calculate(makeCtx())).toBe(1.0);
  });
});

// ============================================================
// 3. BonusZone
// ============================================================
describe('BonusZone', () => {
  it('returns 1 + dmgBonus', () => {
    const zone = new BonusZone();
    const ctx = makeCtx(); // dmgBonus = 0.466
    expect(zone.calculate(ctx)).toBeCloseTo(1.466, 3);
  });

  it('returns 1.0 when no dmgBonus', () => {
    const zone = new BonusZone();
    const stats: ComputedStats = {
      totalHp: 30000, totalAtk: 2000, totalDef: 800,
      critRate: 0.5, critDmg: 1.0, dmgBonus: 0, em: 100, er: 1.0,
    };
    const ctx = makeCtx({ stats });
    expect(zone.calculate(ctx)).toBeCloseTo(1.0, 3);
  });
});

// ============================================================
// 4. CritZone
// ============================================================
describe('CritZone', () => {
  it('crit multiplier = 1 + min(critRate, 1) * critDmg', () => {
    const zone = new CritZone();
    const ctx = makeCtx(); // critRate=0.5, critDmg=1.0 => 1 + 0.5*1.0 = 1.5
    expect(zone.calculate(ctx)).toBeCloseTo(1.5, 3);
  });

  it('crit rate capped at 1.0', () => {
    const zone = new CritZone();
    const stats: ComputedStats = {
      totalHp: 30000, totalAtk: 2000, totalDef: 800,
      critRate: 1.5, critDmg: 2.0, dmgBonus: 0, em: 0, er: 1.0,
    };
    const ctx = makeCtx({ stats });
    // 1 + min(1.5, 1) * 2.0 = 1 + 1.0 * 2.0 = 3.0
    expect(zone.calculate(ctx)).toBeCloseTo(3.0, 3);
  });

  it('zero crit rate gives 1.0 multiplier', () => {
    const zone = new CritZone();
    const stats: ComputedStats = {
      totalHp: 30000, totalAtk: 2000, totalDef: 800,
      critRate: 0, critDmg: 2.0, dmgBonus: 0, em: 0, er: 1.0,
    };
    const ctx = makeCtx({ stats });
    expect(zone.calculate(ctx)).toBeCloseTo(1.0, 3);
  });
});

// ============================================================
// 5. ResistanceZone — three-segment formula
// ============================================================
describe('ResistanceZone', () => {
  const zone = new ResistanceZone();

  it('R < 0: multiplier = 1 - R/2', () => {
    // R = -0.2 => 1 - (-0.2)/2 = 1 + 0.1 = 1.1
    const ctx = makeCtx({ enemyResistance: -0.2 });
    expect(zone.calculate(ctx)).toBeCloseTo(1.1, 3);
  });

  it('R = -0.1: multiplier = 1 - (-0.1)/2 = 1.05', () => {
    const ctx = makeCtx({ enemyResistance: -0.1 });
    expect(zone.calculate(ctx)).toBeCloseTo(1.05, 3);
  });

  it('0 <= R < 0.75: multiplier = 1 - R', () => {
    // R = 0.10 => 1 - 0.10 = 0.90
    const ctx = makeCtx({ enemyResistance: 0.10 });
    expect(zone.calculate(ctx)).toBeCloseTo(0.90, 3);
  });

  it('R = 0.50: multiplier = 0.50', () => {
    const ctx = makeCtx({ enemyResistance: 0.50 });
    expect(zone.calculate(ctx)).toBeCloseTo(0.50, 3);
  });

  it('R = 0: multiplier = 1.0 (boundary)', () => {
    const ctx = makeCtx({ enemyResistance: 0 });
    expect(zone.calculate(ctx)).toBeCloseTo(1.0, 3);
  });

  it('R >= 0.75: multiplier = 1/(1+4R)', () => {
    // R = 0.75 => 1/(1+3) = 0.25
    const ctx = makeCtx({ enemyResistance: 0.75 });
    expect(zone.calculate(ctx)).toBeCloseTo(0.25, 3);
  });

  it('R = 1.0 (100%): multiplier = 1/(1+4) = 0.2', () => {
    const ctx = makeCtx({ enemyResistance: 1.0 });
    expect(zone.calculate(ctx)).toBeCloseTo(0.2, 3);
  });
});

// ============================================================
// 6. DefenseZone — extended with defReductions/defIgnore
// ============================================================
describe('DefenseZone', () => {
  const zone = new DefenseZone();

  it('def multiplier = (charLv+100) / ((charLv+100) + (enemyLv+100))', () => {
    // charLv=90, enemyLv=90
    // (90+100) / ((90+100)+(90+100)) = 190/380 = 0.5
    const ctx = makeCtx({ enemyLevel: 90, characterLevel: 90 });
    expect(zone.calculate(ctx)).toBeCloseTo(0.5, 3);
  });

  it('enemy level 100: 190 / (190+200) = 190/390', () => {
    const ctx = makeCtx({ enemyLevel: 100, characterLevel: 90 });
    expect(zone.calculate(ctx)).toBeCloseTo(190 / 390, 5);
  });

  it('enemy level 80: 190 / (190+180) = 190/370', () => {
    const ctx = makeCtx({ enemyLevel: 80, characterLevel: 90 });
    expect(zone.calculate(ctx)).toBeCloseTo(190 / 370, 5);
  });

  it('defReductions=[0.4] (Superconduct scenario): reduces enemy defense', () => {
    // charLv=90, enemyLv=90, defReduction=0.4
    // charTerm = 190
    // effectiveEnemyDef = 190 * (1 - 0.4) * (1 - 0) = 190 * 0.6 = 114
    // result = 190 / (190 + 114) = 190 / 304 ≈ 0.625
    const ctx = makeCtx({ enemyLevel: 90, characterLevel: 90, defReductions: [0.4] });
    expect(zone.calculate(ctx)).toBeCloseTo(190 / (190 + 114), 5);
  });

  it('defIgnore=0.6 (Raiden C2 scenario): ignores 60% defense', () => {
    // charLv=90, enemyLv=90, defIgnore=0.6
    // charTerm = 190
    // effectiveEnemyDef = 190 * (1 - 0) * (1 - 0.6) = 190 * 0.4 = 76
    // result = 190 / (190 + 76) = 190 / 266 ≈ 0.7143
    const ctx = makeCtx({ enemyLevel: 90, characterLevel: 90, defIgnore: 0.6 });
    expect(zone.calculate(ctx)).toBeCloseTo(190 / (190 + 76), 5);
  });

  it('defReductions sum is capped at DEF_REDUCTION_CAP (0.9)', () => {
    // defReductions = [0.6, 0.6] → sum = 1.2, clamped to 0.9 (KQM hard cap)
    // effectiveEnemyDef = 190 * (1 - 0.9) = 19
    // result = 190 / (190 + 19) = 190 / 209 ≈ 0.909
    const ctx = makeCtx({ enemyLevel: 90, characterLevel: 90, defReductions: [0.6, 0.6] });
    expect(zone.calculate(ctx)).toBeCloseTo(190 / 209, 3);
  });

  it('defIncreases offset defReductions (domain buff stones)', () => {
    // defReductions = [0.4], defIncreases = [0.3]
    // defReductionSum = 0.4, defIncreaseSum = 0.3
    // effectiveEnemyDef = 190 * (1 - 0.4 + 0.3) * (1 - 0) = 190 * 0.9 = 171
    // result = 190 / (190 + 171) = 190 / 361 ≈ 0.5263
    const ctx = makeCtx({ enemyLevel: 90, characterLevel: 90, defReductions: [0.4], defIncreases: [0.3] });
    expect(zone.calculate(ctx)).toBeCloseTo(190 / 361, 3);
  });

  it('defaults: characterLevel defaults to 90', () => {
    // Without explicit characterLevel, should default to 90
    const ctx = makeCtx({ enemyLevel: 90 });
    // Remove characterLevel to test default
    const ctxNoLevel = { ...ctx };
    delete ctxNoLevel.characterLevel;
    expect(zone.calculate(ctxNoLevel)).toBeCloseTo(0.5, 3);
  });

  it('defIgnore capped at 1.0: multiplier never exceeds 1.0', () => {
    // defIgnore = 1.5 should be capped to 1.0
    const ctx = makeCtx({ enemyLevel: 90, characterLevel: 90, defIgnore: 0, extraBonuses: { defIgnore: 1.5 } });
    // capped at 1.0 → effectiveEnemyDef = 0 → multiplier = 1.0
    expect(zone.calculate(ctx)).toBeCloseTo(1.0, 3);
  });

  it('defIgnore at 0.6 works correctly (Raiden C2)', () => {
    const ctx = makeCtx({ enemyLevel: 90, characterLevel: 90, defIgnore: 0, extraBonuses: { defIgnore: 0.6 } });
    // effectiveEnemyDef = 190 * 1 * 0.4 = 76 → 190/266
    expect(zone.calculate(ctx)).toBeCloseTo(190 / (190 + 76), 5);
  });
});

// ============================================================
// 7. AmplifyingZone — Vaporize / Melt with EM bonus
// ============================================================
describe('AmplifyingZone', () => {
  const zone = new AmplifyingZone();

  it('NONE reaction returns 1.0', () => {
    const ctx = makeCtx({ reactionType: ReactionType.NONE });
    expect(zone.calculate(ctx)).toBeCloseTo(1.0, 3);
  });

  it('Vaporize with amplifyingMultiplier=1.5 (Pyro on Hydro) and EM=0', () => {
    const stats: ComputedStats = {
      totalHp: 30000, totalAtk: 2000, totalDef: 800,
      critRate: 0.5, critDmg: 1.0, dmgBonus: 0, em: 0, er: 1.0,
    };
    const ctx = makeCtx({
      stats,
      reactionType: ReactionType.VAPORIZE,
      amplifyingMultiplier: 1.5,
    });
    // EM=0 => bonus = 0 => 1.5 * (1 + 0) = 1.5
    expect(zone.calculate(ctx)).toBeCloseTo(1.5, 3);
  });

  it('Melt with amplifyingMultiplier=2.0 (Pyro on Cryo) and EM=100', () => {
    const stats: ComputedStats = {
      totalHp: 30000, totalAtk: 2000, totalDef: 800,
      critRate: 0.5, critDmg: 1.0, dmgBonus: 0, em: 100, er: 1.0,
    };
    const ctx = makeCtx({
      stats,
      reactionType: ReactionType.MELT,
      amplifyingMultiplier: 2.0,
    });
    // EM bonus = 2.78 * 100 / (100 + 1400) = 278/1500
    const emBonus = 2.78 * 100 / 1500;
    // Result = 2.0 * (1 + emBonus)
    expect(zone.calculate(ctx)).toBeCloseTo(2.0 * (1 + emBonus), 3);
  });

  it('EM bonus formula: 2.78*EM/(EM+1400)', () => {
    const stats: ComputedStats = {
      totalHp: 30000, totalAtk: 2000, totalDef: 800,
      critRate: 0.5, critDmg: 1.0, dmgBonus: 0, em: 200, er: 1.0,
    };
    const ctx = makeCtx({
      stats,
      reactionType: ReactionType.VAPORIZE,
      amplifyingMultiplier: 1.5,
    });
    const emBonus = 2.78 * 200 / (200 + 1400);
    // 1.5 * (1 + emBonus)
    expect(zone.calculate(ctx)).toBeCloseTo(1.5 * (1 + emBonus), 3);
  });

  it('Non-amplifying new reaction types return 1.0 (path guard)', () => {
    const ctx = makeCtx({ reactionType: ReactionType.AGGRAVATION });
    expect(zone.calculate(ctx)).toBeCloseTo(1.0, 3);
  });
});

// ============================================================
// 8. TransformativeZone — 5.2 rates
// ============================================================
describe('TransformativeZone', () => {
  const zone = new TransformativeZone();

  it('NONE reaction returns 0', () => {
    const ctx = makeCtx({ reactionType: ReactionType.NONE });
    expect(zone.calculate(ctx)).toBe(0);
  });

  it('Overloaded at lv90: rate 2.75 × levelMultiplier 1446.85 × (1 + EM bonus)', () => {
    const stats: ComputedStats = {
      totalHp: 30000, totalAtk: 2000, totalDef: 800,
      critRate: 0.5, critDmg: 1.0, dmgBonus: 0, em: 100, er: 1.0,
    };
    const ctx = makeCtx({ stats, reactionType: ReactionType.OVERLOADED, characterLevel: 90 });
    // rate = 2.75, levelMult = 1446.85, emBonus = 16*100/2100
    const emBonus = getTransformativeEMBonus(100);
    const expected = 2.75 * 1446.85 * (1 + emBonus);
    expect(zone.calculate(ctx)).toBeCloseTo(expected, 1);
  });

  it('Hyperbloom at lv90: rate 3.0 × levelMultiplier 1446.85 × (1 + EM bonus)', () => {
    const stats: ComputedStats = {
      totalHp: 30000, totalAtk: 2000, totalDef: 800,
      critRate: 0.5, critDmg: 1.0, dmgBonus: 0, em: 200, er: 1.0,
    };
    const ctx = makeCtx({ stats, reactionType: ReactionType.HYPERBLOOM, characterLevel: 90 });
    const emBonus = getTransformativeEMBonus(200);
    const expected = 3.0 * 1446.85 * (1 + emBonus);
    expect(zone.calculate(ctx)).toBeCloseTo(expected, 1);
  });

  it('Overloaded at lv80 uses lv80 level multiplier', () => {
    const stats: ComputedStats = {
      totalHp: 30000, totalAtk: 2000, totalDef: 800,
      critRate: 0.5, critDmg: 1.0, dmgBonus: 0, em: 0, er: 1.0,
    };
    const ctx = makeCtx({ stats, reactionType: ReactionType.OVERLOADED, characterLevel: 80 });
    // rate = 2.75, levelMult = 776.67, emBonus = 0
    const expected = 2.75 * 776.67;
    expect(zone.calculate(ctx)).toBeCloseTo(expected, 1);
  });
});

// ============================================================
// 9. CatalyzeZone
// ============================================================
describe('CatalyzeZone', () => {
  const zone = new CatalyzeZone();

  it('NONE reaction returns 0', () => {
    const ctx = makeCtx({ reactionType: ReactionType.NONE });
    expect(zone.calculate(ctx)).toBe(0);
  });

  it('Aggravation: baseRate 1.15 × levelMult × (1 + EM bonus)', () => {
    const stats: ComputedStats = {
      totalHp: 30000, totalAtk: 2000, totalDef: 800,
      critRate: 0.5, critDmg: 1.0, dmgBonus: 0, em: 100, er: 1.0,
    };
    const ctx = makeCtx({ stats, reactionType: ReactionType.AGGRAVATION, characterLevel: 90 });
    const emBonus = getAggravationEMBonus(100);
    const expected = 1.15 * 1446.85 * (1 + emBonus);
    expect(zone.calculate(ctx)).toBeCloseTo(expected, 1);
  });

  it('Spread: baseRate 1.25 × levelMult × (1 + EM bonus)', () => {
    const stats: ComputedStats = {
      totalHp: 30000, totalAtk: 2000, totalDef: 800,
      critRate: 0.5, critDmg: 1.0, dmgBonus: 0, em: 100, er: 1.0,
    };
    const ctx = makeCtx({ stats, reactionType: ReactionType.SPREAD, characterLevel: 90 });
    const emBonus = getAggravationEMBonus(100);
    const expected = 1.25 * 1446.85 * (1 + emBonus);
    expect(zone.calculate(ctx)).toBeCloseTo(expected, 1);
  });

  it('VAPORIZE reaction returns 0 (not catalyze)', () => {
    const ctx = makeCtx({ reactionType: ReactionType.VAPORIZE });
    expect(zone.calculate(ctx)).toBe(0);
  });
});

// ============================================================
// 10. MoonsignZone
// ============================================================
describe('MoonsignZone', () => {
  const zone = new MoonsignZone();

  it('NONE reaction returns 0', () => {
    const ctx = makeCtx({ reactionType: ReactionType.NONE });
    expect(zone.calculate(ctx)).toBe(0);
  });

  it('MOON_BLOOM: rate 1.0 × levelMult × (1 + EM bonus)', () => {
    const stats: ComputedStats = {
      totalHp: 30000, totalAtk: 2000, totalDef: 800,
      critRate: 0.5, critDmg: 1.0, dmgBonus: 0, em: 100, er: 1.0,
    };
    const ctx = makeCtx({ stats, reactionType: ReactionType.MOON_BLOOM, characterLevel: 90 });
    const emBonus = getMoonsignEMBonus(100);
    const expected = 1.0 * 1446.85 * (1 + emBonus);
    expect(zone.calculate(ctx)).toBeCloseTo(expected, 1);
  });

  it('MOON_ELECTRO: rate 3.0 × levelMult × (1 + EM bonus)', () => {
    const stats: ComputedStats = {
      totalHp: 30000, totalAtk: 2000, totalDef: 800,
      critRate: 0.5, critDmg: 1.0, dmgBonus: 0, em: 200, er: 1.0,
    };
    const ctx = makeCtx({ stats, reactionType: ReactionType.MOON_ELECTRO, characterLevel: 90 });
    const emBonus = getMoonsignEMBonus(200);
    const expected = 3.0 * 1446.85 * (1 + emBonus);
    expect(zone.calculate(ctx)).toBeCloseTo(expected, 1);
  });

  it('REACTION_MOON_CRYSTAL: rate 0.96', () => {
    const stats: ComputedStats = {
      totalHp: 30000, totalAtk: 2000, totalDef: 800,
      critRate: 0.5, critDmg: 1.0, dmgBonus: 0, em: 0, er: 1.0,
    };
    const ctx = makeCtx({ stats, reactionType: ReactionType.REACTION_MOON_CRYSTAL, characterLevel: 90 });
    const expected = 0.96 * 1446.85;
    expect(zone.calculate(ctx)).toBeCloseTo(expected, 1);
  });
});

// ============================================================
// 11. ElevationZone
// ============================================================
describe('ElevationZone', () => {
  const zone = new ElevationZone();

  it('Default elevationBonus=0 returns 1.0', () => {
    const ctx = makeCtx({ elevationBonus: 0 });
    expect(zone.calculate(ctx)).toBeCloseTo(1.0, 3);
  });

  it('elevationBonus=0.3 returns 1.3', () => {
    const ctx = makeCtx({ elevationBonus: 0.3 });
    expect(zone.calculate(ctx)).toBeCloseTo(1.3, 3);
  });

  it('elevationBonus defaults to 0 when not specified', () => {
    const ctx = makeCtx();
    delete ctx.elevationBonus;
    expect(zone.calculate(ctx)).toBeCloseTo(1.0, 3);
  });
});

// ============================================================
// 12. resolvePath
// ============================================================
describe('DamageFormula.resolvePath', () => {
  it('NONE → DIRECT', () => {
    expect(DamageFormula.resolvePath(ReactionType.NONE)).toBe(DamagePath.DIRECT);
  });

  it('VAPORIZE → AMPLIFYING', () => {
    expect(DamageFormula.resolvePath(ReactionType.VAPORIZE)).toBe(DamagePath.AMPLIFYING);
  });

  it('MELT → AMPLIFYING', () => {
    expect(DamageFormula.resolvePath(ReactionType.MELT)).toBe(DamagePath.AMPLIFYING);
  });

  it('OVERLOADED → TRANSFORMATIVE', () => {
    expect(DamageFormula.resolvePath(ReactionType.OVERLOADED)).toBe(DamagePath.TRANSFORMATIVE);
  });

  it('SWIRL → TRANSFORMATIVE', () => {
    expect(DamageFormula.resolvePath(ReactionType.SWIRL)).toBe(DamagePath.TRANSFORMATIVE);
  });

  it('AGGRAVATION → CATALYZE', () => {
    expect(DamageFormula.resolvePath(ReactionType.AGGRAVATION)).toBe(DamagePath.CATALYZE);
  });

  it('SPREAD → CATALYZE', () => {
    expect(DamageFormula.resolvePath(ReactionType.SPREAD)).toBe(DamagePath.CATALYZE);
  });

  it('MOON_BLOOM → MOONSIGN', () => {
    expect(DamageFormula.resolvePath(ReactionType.MOON_BLOOM)).toBe(DamagePath.MOONSIGN);
  });

  it('REACTION_MOON_ELECTRO → MOONSIGN_DIRECT', () => {
    expect(DamageFormula.resolvePath(ReactionType.REACTION_MOON_ELECTRO)).toBe(DamagePath.MOONSIGN_DIRECT);
  });
});

// ============================================================
// 13. Full Pipeline — DIRECT path
// ============================================================
describe('DamageFormula — DIRECT path', () => {
  it('No reaction: DIRECT path, no reaction multiplier', () => {
    const stats: ComputedStats = {
      totalHp: 30000,
      totalAtk: 2000,
      totalDef: 800,
      critRate: 0.5,
      critDmg: 1.0,
      dmgBonus: 0.466,
      em: 100,
      er: 1.0,
    };
    const ctx: DamageContext = {
      stats,
      skillMultiplier: 2.0,
      statScaling: ATK_SCALING,
      reactionType: ReactionType.NONE,
      enemyLevel: 90,
      enemyResistance: 0.10,
      amplifyingMultiplier: 0,
      characterLevel: 90,
      extraBonuses: {},
    };

    const result = DamageFormula.calculate(ctx);
    expect(result.damagePath).toBe(DamagePath.DIRECT);

    // base = 2.0 * 2000 = 4000
    // bonus = 1 + 0.466 = 1.466
    // crit = 1 + 0.5 * 1.0 = 1.5
    // resistance = 1 - 0.10 = 0.90
    // defense = 190/380 = 0.5
    // reaction = 1.0 (no reaction)
    const expected = 4000 * 1.466 * 1.5 * 0.90 * 0.5;
    expect(result.totalDamage).toBeCloseTo(expected, -1);
    expect(result.reactionMultiplier).toBeCloseTo(1.0, 3);
  });
});

// ============================================================
// 14. Full Pipeline — AMPLIFYING path (regression)
// ============================================================
describe('DamageFormula — AMPLIFYING path', () => {
  it('Hu Tao charged attack (HP scaling, Vaporize)', () => {
    const stats: ComputedStats = {
      totalHp: 30000,
      totalAtk: 1500,
      totalDef: 700,
      critRate: 0.70,
      critDmg: 2.20,
      dmgBonus: 0.466,
      em: 100,
      er: 1.0,
    };
    const ctx: DamageContext = {
      stats,
      skillMultiplier: 2.5,
      statScaling: HP_SCALING,
      reactionType: ReactionType.VAPORIZE,
      enemyLevel: 90,
      enemyResistance: 0.10,
      amplifyingMultiplier: 1.5,
      characterLevel: 90,
      extraBonuses: {},
    };

    const result = DamageFormula.calculate(ctx);
    expect(result.damagePath).toBe(DamagePath.AMPLIFYING);

    // base = 2.5 * 30000 = 75000
    // bonus = 1.466
    // crit = 1 + 0.70 * 2.20 = 2.54
    // resistance = 0.90
    // defense = 0.5
    // reaction = 1.5 * (1 + 2.78*100/1500)
    const emBonus = 2.78 * 100 / 1500;
    const reactionMult = 1.5 * (1 + emBonus);
    const expected = 75000 * 1.466 * 2.54 * 0.90 * 0.5 * reactionMult;
    expect(result.totalDamage).toBeCloseTo(expected, -1);
  });

  it('Raiden Shogun burst (ATK scaling, no reaction → DIRECT)', () => {
    const stats: ComputedStats = {
      totalHp: 12707,
      totalAtk: 2000,
      totalDef: 799,
      critRate: 0.60,
      critDmg: 1.80,
      dmgBonus: 0.466,
      em: 0,
      er: 1.3,
    };
    const ctx: DamageContext = {
      stats,
      skillMultiplier: 5.0,
      statScaling: ATK_SCALING,
      reactionType: ReactionType.NONE,
      enemyLevel: 90,
      enemyResistance: 0.10,
      amplifyingMultiplier: 0,
      characterLevel: 90,
      extraBonuses: {},
    };

    const result = DamageFormula.calculate(ctx);
    // base = 5.0 * 2000 = 10000
    // bonus = 1.466
    // crit = 1 + 0.60 * 1.80 = 2.08
    // res = 0.90
    // def = 0.5
    const expected = 10000 * 1.466 * 2.08 * 0.90 * 0.5;
    expect(result.totalDamage).toBeCloseTo(expected, -1);
  });
});

// ============================================================
// 15. Full Pipeline — TRANSFORMATIVE path
// ============================================================
describe('DamageFormula — TRANSFORMATIVE path', () => {
  it('Overloaded: rate × levelMult × (1+EM) × resistance', () => {
    const stats: ComputedStats = {
      totalHp: 30000,
      totalAtk: 2000,
      totalDef: 800,
      critRate: 0.5,
      critDmg: 1.0,
      dmgBonus: 0,
      em: 100,
      er: 1.0,
    };
    const ctx: DamageContext = {
      stats,
      skillMultiplier: 1.0,
      statScaling: ATK_SCALING,
      reactionType: ReactionType.OVERLOADED,
      enemyLevel: 90,
      enemyResistance: 0.10,
      amplifyingMultiplier: 0,
      characterLevel: 90,
      extraBonuses: {},
    };

    const result = DamageFormula.calculate(ctx);
    expect(result.damagePath).toBe(DamagePath.TRANSFORMATIVE);

    // Transformative: baseDamage = 2.75 * 1446.85 * (1 + emBonus)
    const emBonus = getTransformativeEMBonus(100);
    const baseDamage = 2.75 * 1446.85 * (1 + emBonus);
    const resistance = 0.90;
    const expected = baseDamage * resistance;
    expect(result.totalDamage).toBeCloseTo(expected, -1);

    // No crit, no defense, no bonus
    expect(result.critMultiplier).toBe(1);
    expect(result.defenseMultiplier).toBe(1);
    expect(result.bonusMultiplier).toBe(1);
  });
});

// ============================================================
// 16. Full Pipeline — CATALYZE path
// ============================================================
describe('DamageFormula — CATALYZE path', () => {
  it('Aggravation: baseDamage + aggravationBonus, then × bonus × crit × resist × defense', () => {
    const stats: ComputedStats = {
      totalHp: 30000,
      totalAtk: 2000,
      totalDef: 800,
      critRate: 0.5,
      critDmg: 1.0,
      dmgBonus: 0.466,
      em: 100,
      er: 1.0,
    };
    const ctx: DamageContext = {
      stats,
      skillMultiplier: 2.0,
      statScaling: ATK_SCALING,
      reactionType: ReactionType.AGGRAVATION,
      enemyLevel: 90,
      enemyResistance: 0.10,
      amplifyingMultiplier: 0,
      characterLevel: 90,
      extraBonuses: {},
    };

    const result = DamageFormula.calculate(ctx);
    expect(result.damagePath).toBe(DamagePath.CATALYZE);

    // baseDamage = 2.0 * 2000 = 4000
    const baseDamage = 4000;

    // aggravationBonus = 1.15 * 1446.85 * (1 + emBonus)
    const emBonus = getAggravationEMBonus(100);
    const aggravationBonus = 1.15 * 1446.85 * (1 + emBonus);
    expect(result.aggravationBonus).toBeCloseTo(aggravationBonus, 0);

    // effectiveBase = baseDamage + aggravationBonus
    const effectiveBase = baseDamage + aggravationBonus;

    // bonus = 1.466, crit = 1.5, resist = 0.90, defense = 0.5
    const expected = effectiveBase * 1.466 * 1.5 * 0.90 * 0.5;
    expect(result.totalDamage).toBeCloseTo(expected, -1);
  });

  it('Spread: uses SPREAD baseRate 1.25', () => {
    const stats: ComputedStats = {
      totalHp: 30000,
      totalAtk: 2000,
      totalDef: 800,
      critRate: 0.5,
      critDmg: 1.0,
      dmgBonus: 0.0,
      em: 0,
      er: 1.0,
    };
    const ctx: DamageContext = {
      stats,
      skillMultiplier: 2.0,
      statScaling: ATK_SCALING,
      reactionType: ReactionType.SPREAD,
      enemyLevel: 90,
      enemyResistance: 0.10,
      amplifyingMultiplier: 0,
      characterLevel: 90,
      extraBonuses: {},
    };

    const result = DamageFormula.calculate(ctx);
    expect(result.damagePath).toBe(DamagePath.CATALYZE);

    // aggravationBonus = 1.25 * 1446.85 * (1 + 0) = 1.25 * 1446.85
    const aggravationBonus = 1.25 * 1446.85;
    expect(result.aggravationBonus).toBeCloseTo(aggravationBonus, 1);
  });
});

// ============================================================
// 17. Full Pipeline — MOONSIGN path
// ============================================================
describe('DamageFormula — MOONSIGN path', () => {
  it('MOON_BLOOM: moonBaseDamage × crit × resist × elevation, no bonus/defense', () => {
    const stats: ComputedStats = {
      totalHp: 30000,
      totalAtk: 2000,
      totalDef: 800,
      critRate: 0.5,
      critDmg: 1.0,
      dmgBonus: 0.466, // should NOT be applied
      em: 100,
      er: 1.0,
    };
    const ctx: DamageContext = {
      stats,
      skillMultiplier: 2.0,
      statScaling: ATK_SCALING,
      reactionType: ReactionType.MOON_BLOOM,
      enemyLevel: 90,
      enemyResistance: 0.10,
      amplifyingMultiplier: 0,
      characterLevel: 90,
      elevationBonus: 0.3,
      extraBonuses: {},
    };

    const result = DamageFormula.calculate(ctx);
    expect(result.damagePath).toBe(DamagePath.MOONSIGN);

    // moonBaseDamage = 1.0 * 1446.85 * (1 + emBonus)
    const emBonus = getMoonsignEMBonus(100);
    const moonBaseDamage = 1.0 * 1446.85 * (1 + emBonus);

    // crit = 1.5, resist = 0.90, elevation = 1.3
    const expected = moonBaseDamage * 1.5 * 0.90 * 1.3;
    expect(result.totalDamage).toBeCloseTo(expected, -1);

    // No bonus, no defense
    expect(result.bonusMultiplier).toBe(1);
    expect(result.defenseMultiplier).toBe(1);
    expect(result.elevationMultiplier).toBeCloseTo(1.3, 3);
  });

  it('MOON_ELECTRO with no elevation: elevationMultiplier = 1.0', () => {
    const stats: ComputedStats = {
      totalHp: 30000,
      totalAtk: 2000,
      totalDef: 800,
      critRate: 0.5,
      critDmg: 1.0,
      dmgBonus: 0,
      em: 0,
      er: 1.0,
    };
    const ctx: DamageContext = {
      stats,
      skillMultiplier: 1.0,
      statScaling: ATK_SCALING,
      reactionType: ReactionType.MOON_ELECTRO,
      enemyLevel: 90,
      enemyResistance: 0.10,
      amplifyingMultiplier: 0,
      characterLevel: 90,
      elevationBonus: 0,
      extraBonuses: {},
    };

    const result = DamageFormula.calculate(ctx);
    expect(result.damagePath).toBe(DamagePath.MOONSIGN);
    expect(result.elevationMultiplier).toBeCloseTo(1.0, 3);

    // moonBaseDamage = 3.0 * 1446.85 * (1 + 0) = 4340.55
    const expected = 3.0 * 1446.85 * 1.0 * 1.5 * 0.90 * 1.0;
    expect(result.totalDamage).toBeCloseTo(expected, -1);
  });
});

// ============================================================
// 18. Constants validation
// ============================================================
describe('Constants validation', () => {
  it('DEFAULT_ENEMY_LEVEL is 100', () => {
    expect(DEFAULT_ENEMY_LEVEL).toBe(100);
  });

  it('TRANSFORM_RATES_V52 values are correct', () => {
    expect(TRANSFORM_RATES_V52.OVERLOADED).toBe(2.75);
    expect(TRANSFORM_RATES_V52.SUPERCONDUCT).toBe(1.5);
    expect(TRANSFORM_RATES_V52.ELECTRO_CHARGED).toBe(2.0);
    expect(TRANSFORM_RATES_V52.SWIRL).toBe(0.6);
    expect(TRANSFORM_RATES_V52.HYPERBLOOM).toBe(3.0);
    expect(TRANSFORM_RATES_V52.BLOOM).toBe(2.0);
    expect(TRANSFORM_RATES_V52.BURGEON).toBe(3.0);
    expect(TRANSFORM_RATES_V52.BURNING).toBe(0.25);
    expect(TRANSFORM_RATES_V52.SHATTER).toBe(3.0);
  });

  it('LEVEL_MULTIPLIERS values are correct', () => {
    expect(LEVEL_MULTIPLIERS[90]).toBeCloseTo(1446.85, 2);
    expect(LEVEL_MULTIPLIERS[80]).toBeCloseTo(776.67, 2);
    expect(LEVEL_MULTIPLIERS[85]).toBeCloseTo(1027.50, 2);
  });

  it('getLevelMultiplier returns correct values', () => {
    expect(getLevelMultiplier(90)).toBeCloseTo(1446.85, 2);
    expect(getLevelMultiplier(80)).toBeCloseTo(776.67, 2);
    // Level 100 → nearest is 90
    expect(getLevelMultiplier(100)).toBeCloseTo(1446.85, 2);
  });

  it('AGGRAVATION_BASE_RATES values are correct', () => {
    expect(AGGRAVATION_BASE_RATES.AGGRAVATION).toBe(1.15);
    expect(AGGRAVATION_BASE_RATES.SPREAD).toBe(1.25);
  });

  it('MOON_RATES values are correct', () => {
    expect(MOON_RATES.MOON_BLOOM).toBe(1.0);
    expect(MOON_RATES.MOON_ELECTRO).toBe(3.0);
    expect(MOON_RATES.MOON_CRYSTAL).toBe(1.6);
    expect(MOON_RATES.REACTION_MOON_ELECTRO).toBe(1.8);
    expect(MOON_RATES.REACTION_MOON_CRYSTAL).toBe(0.96);
  });

  it('Overloaded at lv90 = 2.75 × 1446.85 = 3978.8375', () => {
    const expected = 2.75 * 1446.85;
    expect(expected).toBeCloseTo(3978.8375, 3);
  });
});

// ============================================================
// 19. Edge Cases
// ============================================================
describe('Edge cases', () => {
  it('Zero skill multiplier yields zero damage', () => {
    const ctx = makeCtx({ skillMultiplier: 0 });
    const result = DamageFormula.calculate(ctx);
    expect(result.totalDamage).toBe(0);
  });

  it('100% crit rate is capped properly', () => {
    const stats: ComputedStats = {
      totalHp: 30000, totalAtk: 2000, totalDef: 800,
      critRate: 1.2, critDmg: 2.0, dmgBonus: 0, em: 0, er: 1.0,
    };
    const ctx = makeCtx({ stats });
    const result = DamageFormula.calculate(ctx);
    // crit zone = 1 + min(1.2,1) * 2.0 = 3.0
    expect(result.critMultiplier).toBeCloseTo(3.0, 3);
  });

  it('Negative enemy resistance increases damage', () => {
    const ctx1 = makeCtx({ enemyResistance: 0.10 });
    const ctx2 = makeCtx({ enemyResistance: -0.10 });
    const r1 = DamageFormula.calculate(ctx1);
    const r2 = DamageFormula.calculate(ctx2);
    // Lower resistance should yield higher damage
    expect(r2.totalDamage).toBeGreaterThan(r1.totalDamage);
  });
});
