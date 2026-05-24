import type { DamageContext, DamageResult } from '../types';
import { ReactionType, DamagePath } from '../types';
import { getMoonsignEMBonus, MOON_RATES } from '../data/constants';
import {
  BaseDamageZone,
  BonusZone,
  CritZone,
  ResistanceZone,
  DefenseZone,
  AmplifyingZone,
  TransformativeZone,
  CatalyzeZone,
  MoonsignZone,
  ElevationZone,
  IndependentZone,
} from './zones';

/**
 * DamageFormula — orchestrates the 5-path damage zone pipeline.
 *
 * Paths:
 * - DIRECT:     Base → Bonus → Crit → Resist → Defense (no reaction)
 * - AMPLIFYING: Base → Bonus → Crit → Resist → Defense → Amplifying
 * - TRANSFORMATIVE: TransformativeZone → Resist (no base/bonus/crit/defense)
 * - CATALYZE:   Base → CatalyzeZone(+additive) → Bonus → Crit → Resist → Defense
 * - MOONSIGN:   MoonsignZone → Crit → Resist → Elevation (no bonus/defense)
 */
export class DamageFormula {

  /**
   * Calculate damage from a DamageContext.
   * Routes to the appropriate formula path based on reaction type.
   * @param ctx - Complete damage context including stats, skill, and enemy info
   * @returns DamageResult with total damage, per-zone multipliers, and path info
   */
  static calculate(ctx: DamageContext): DamageResult {
    const path = DamageFormula.resolvePath(ctx.reactionType);

    switch (path) {
      case DamagePath.DIRECT:
        return DamageFormula.calculateDirect(ctx);
      case DamagePath.AMPLIFYING:
        return DamageFormula.calculateAmplifying(ctx);
      case DamagePath.TRANSFORMATIVE:
        return DamageFormula.calculateTransformative(ctx);
      case DamagePath.CATALYZE:
        return DamageFormula.calculateCatalyze(ctx);
      case DamagePath.MOONSIGN:
        return DamageFormula.calculateMoonsign(ctx);
      case DamagePath.MOONSIGN_DIRECT:
        return DamageFormula.calculateMoonsignDirect(ctx);
      default:
        return DamageFormula.calculateDirect(ctx);
    }
  }

  /**
   * Resolve a ReactionType to a DamagePath.
   * @param type - The reaction type
   * @returns The corresponding damage calculation path
   */
  static resolvePath(type: ReactionType): DamagePath {
    if (type === ReactionType.NONE) return DamagePath.DIRECT;
    if (type === ReactionType.VAPORIZE || type === ReactionType.MELT) return DamagePath.AMPLIFYING;
    if ([
      ReactionType.OVERLOADED,
      ReactionType.SUPERCONDUCT,
      ReactionType.ELECTRO_CHARGED,
      ReactionType.SWIRL,
      ReactionType.HYPERBLOOM,
      ReactionType.BLOOM,
      ReactionType.BURGEON,
      ReactionType.BURNING,
      ReactionType.SHATTER,
    ].includes(type)) return DamagePath.TRANSFORMATIVE;
    if (type === ReactionType.AGGRAVATION || type === ReactionType.SPREAD) return DamagePath.CATALYZE;
    if ([
      ReactionType.MOON_BLOOM,
      ReactionType.MOON_ELECTRO,
      ReactionType.MOON_CRYSTAL,
    ].includes(type)) return DamagePath.MOONSIGN;
    if (type === ReactionType.REACTION_MOON_ELECTRO || type === ReactionType.REACTION_MOON_CRYSTAL) {
      return DamagePath.MOONSIGN_DIRECT;
    }
    return DamagePath.DIRECT; // fallback
  }

  /**
   * Direct damage path (no reaction).
   * Final = Base × Bonus × Crit × Resist × Defense × Independent
   */
  private static calculateDirect(ctx: DamageContext): DamageResult {
    const baseDamage = new BaseDamageZone().calculate(ctx);
    const bonusMultiplier = new BonusZone().calculate(ctx);
    const critMultiplier = new CritZone().calculate(ctx);
    const resistanceMultiplier = new ResistanceZone().calculate(ctx);
    const defenseMultiplier = new DefenseZone().calculate(ctx);
    const independentMultiplier = new IndependentZone().calculate(ctx);

    const totalDamage =
      baseDamage *
      bonusMultiplier *
      critMultiplier *
      resistanceMultiplier *
      defenseMultiplier *
      independentMultiplier;

    return {
      totalDamage,
      baseDamage,
      scalingMultiplier: 1,
      bonusMultiplier,
      critMultiplier,
      resistanceMultiplier,
      defenseMultiplier,
      reactionMultiplier: 1,
      damagePath: DamagePath.DIRECT,
      aggravationBonus: 0,
      elevationMultiplier: 1,
      independentMultiplier,
      baseDebug: (ctx as any).__baseDebug,
      bonusDebug: (ctx as any).__bonusDebug,
      critDebug: (ctx as any).__critDebug,
      resistDebug: (ctx as any).__resistDebug,
      defenseDebug: (ctx as any).__defenseDebug,
    };
  }

  /**
   * Amplifying damage path (Vaporize / Melt).
   * Final = Base × Bonus × Crit × Resist × Defense × Reaction × Independent
   */
  private static calculateAmplifying(ctx: DamageContext): DamageResult {
    const baseDamage = new BaseDamageZone().calculate(ctx);
    const bonusMultiplier = new BonusZone().calculate(ctx);
    const critMultiplier = new CritZone().calculate(ctx);
    const resistanceMultiplier = new ResistanceZone().calculate(ctx);
    const defenseMultiplier = new DefenseZone().calculate(ctx);
    const reactionMultiplier = new AmplifyingZone().calculate(ctx);
    const independentMultiplier = new IndependentZone().calculate(ctx);

    const totalDamage =
      baseDamage *
      bonusMultiplier *
      critMultiplier *
      resistanceMultiplier *
      defenseMultiplier *
      reactionMultiplier *
      independentMultiplier;

    return {
      totalDamage,
      baseDamage,
      scalingMultiplier: 1,
      bonusMultiplier,
      critMultiplier,
      resistanceMultiplier,
      defenseMultiplier,
      reactionMultiplier,
      damagePath: DamagePath.AMPLIFYING,
      aggravationBonus: 0,
      elevationMultiplier: 1,
      independentMultiplier,
      baseDebug: (ctx as any).__baseDebug,
      bonusDebug: (ctx as any).__bonusDebug,
      critDebug: (ctx as any).__critDebug,
      resistDebug: (ctx as any).__resistDebug,
      defenseDebug: (ctx as any).__defenseDebug,
      ampDebug: (ctx as any).__ampDebug,
    };
  }

  /**
   * Transformative damage path.
   * Transformative = ZoneBaseDamage × Resist × Independent
   * No base damage, no bonus, no crit, no defense, no skill multiplier.
   */
  private static calculateTransformative(ctx: DamageContext): DamageResult {
    const baseDamage = new TransformativeZone().calculate(ctx);
    const resistanceMultiplier = new ResistanceZone().calculate(ctx);
    const independentMultiplier = new IndependentZone().calculate(ctx);

    const totalDamage = baseDamage * resistanceMultiplier * independentMultiplier;

    return {
      totalDamage,
      baseDamage,
      scalingMultiplier: 1,
      bonusMultiplier: 1,
      critMultiplier: 1,
      resistanceMultiplier,
      defenseMultiplier: 1,
      reactionMultiplier: 1,
      damagePath: DamagePath.TRANSFORMATIVE,
      aggravationBonus: 0,
      elevationMultiplier: 1,
      independentMultiplier,
      resistDebug: (ctx as any).__resistDebug,
      transDebug: (ctx as any).__transDebug,
    };
  }

  /**
   * Catalyze damage path (Aggravation / Spread).
   * effectiveBase = baseDamage + aggravationBonus
   * Final = effectiveBase × Bonus × Crit × Resist × Defense × Independent
   */
  private static calculateCatalyze(ctx: DamageContext): DamageResult {
    const baseDamage = new BaseDamageZone().calculate(ctx);
    const aggravationBonus = new CatalyzeZone().calculate(ctx);
    const effectiveBase = baseDamage + aggravationBonus;
    const bonusMultiplier = new BonusZone().calculate(ctx);
    const critMultiplier = new CritZone().calculate(ctx);
    const resistanceMultiplier = new ResistanceZone().calculate(ctx);
    const defenseMultiplier = new DefenseZone().calculate(ctx);
    const independentMultiplier = new IndependentZone().calculate(ctx);

    const totalDamage =
      effectiveBase *
      bonusMultiplier *
      critMultiplier *
      resistanceMultiplier *
      defenseMultiplier *
      independentMultiplier;

    return {
      totalDamage,
      baseDamage,
      scalingMultiplier: 1,
      bonusMultiplier,
      critMultiplier,
      resistanceMultiplier,
      defenseMultiplier,
      reactionMultiplier: 1,
      damagePath: DamagePath.CATALYZE,
      aggravationBonus,
      elevationMultiplier: 1,
      independentMultiplier,
      baseDebug: (ctx as any).__baseDebug,
      cataDebug: (ctx as any).__cataDebug,
      bonusDebug: (ctx as any).__bonusDebug,
      critDebug: (ctx as any).__critDebug,
      resistDebug: (ctx as any).__resistDebug,
      defenseDebug: (ctx as any).__defenseDebug,
    };
  }

  /**
   * Moonsign damage path.
   * Final = MoonBaseDamage × Crit × Resist × Elevation × Independent
   * No bonus zone, no defense zone, no skill multiplier.
   */
  private static calculateMoonsign(ctx: DamageContext): DamageResult {
    const baseDamage = new MoonsignZone().calculate(ctx);
    const critMultiplier = new CritZone().calculate(ctx);
    const resistanceMultiplier = new ResistanceZone().calculate(ctx);
    const elevationMultiplier = new ElevationZone().calculate(ctx);
    const independentMultiplier = new IndependentZone().calculate(ctx);

    const totalDamage = baseDamage * critMultiplier * resistanceMultiplier * elevationMultiplier * independentMultiplier;

    return {
      totalDamage,
      baseDamage,
      scalingMultiplier: 1,
      bonusMultiplier: 1,
      critMultiplier,
      resistanceMultiplier,
      defenseMultiplier: 1,
      reactionMultiplier: 1,
      damagePath: DamagePath.MOONSIGN,
      aggravationBonus: 0,
      elevationMultiplier,
      independentMultiplier,
      moonDebug: (ctx as any).__moonDebug,
      critDebug: (ctx as any).__critDebug,
      resistDebug: (ctx as any).__resistDebug,
      elevDebug: (ctx as any).__elevDebug,
    };
  }

  /**
   * Direct-damage Moonsign path (直伤月反应).
   * Used by REACTION_MOON_ELECTRO and REACTION_MOON_CRYSTAL.
   * These are skill/passive hits that deal "extra damage treated as moonsign reaction",
   * e.g. 伊涅芙 passive: 攻击力×65% → 视为月感电反应伤害.
   *
   * Unlike regular moonsign (MoonsignZone, level+EM based), this path uses
   * BaseDamageZone with the character's skill multiplier and ATK scaling.
   *
   * Final = BaseDamage(含技能倍率×属性) × MoonRate × (1+EM加成+反应加成) × Crit × Resist × Elevation × Independent
   * MoonRate = MOON_RATES[reactionType] (直伤月反应倍率)
   * No bonus zone, no defense zone.
   */
  private static calculateMoonsignDirect(ctx: DamageContext): DamageResult {
    const baseDamage = new BaseDamageZone().calculate(ctx);
    const critMultiplier = new CritZone().calculate(ctx);
    const resistanceMultiplier = new ResistanceZone().calculate(ctx);
    const elevationMultiplier = new ElevationZone().calculate(ctx);
    const independentMultiplier = new IndependentZone().calculate(ctx);

    // 月反应精通向加成（直伤月反应走 ATK 缩放，但反应增幅部分仍需 EM）
    // 公式: 技能倍率 × 反应倍率 × (1 + EM加成 + 反应加成) × 暴击 × 抗性 × 擢升 × 独立
    const moonRate = MOON_RATES[ctx.reactionType] ?? 1;
    const emBonus = getMoonsignEMBonus(ctx.stats.em);
    const moonReactionBonus = ctx.extraBonuses?.moonReactionBonus ?? 0;
    const moonMultiplier = moonRate * (1 + emBonus + moonReactionBonus);

    const totalDamage = baseDamage * critMultiplier * resistanceMultiplier * elevationMultiplier * independentMultiplier * moonMultiplier;

    return {
      totalDamage,
      baseDamage,
      scalingMultiplier: 1,
      bonusMultiplier: 1,
      critMultiplier,
      resistanceMultiplier,
      defenseMultiplier: 1,
      reactionMultiplier: moonMultiplier,
      damagePath: DamagePath.MOONSIGN_DIRECT,
      aggravationBonus: 0,
      elevationMultiplier,
      independentMultiplier,
      baseDebug: (ctx as any).__baseDebug,
      critDebug: (ctx as any).__critDebug,
      resistDebug: (ctx as any).__resistDebug,
      elevDebug: (ctx as any).__elevDebug,
      moonDebug: { em: ctx.stats.em, emBonus, moonReactionBonus, result: moonMultiplier },
    };
  }
}
