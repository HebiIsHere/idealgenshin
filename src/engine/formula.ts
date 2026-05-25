import type { DamageContext, DamageResult } from '../types';
import { ReactionType, DamagePath } from '../types';
import { MOON_RATES, getLevelMultiplier, TRANSFORM_RATES_V52 } from '../data/constants';
import {
  BaseDamageZone,
  BonusZone,
  CritZone,
  ResistanceZone,
  DefenseZone,
  AmplifyingZone,
  CatalyzeZone,
  MoonsignZone,
  ElevationZone,
  IndependentZone,
  AuthorityZone,
  FeatherZone,
  PrayerZone,
  MasteryZone,
} from './zones';

/**
 * DamageFormula — 统一伤害公式管道。
 *
 * 公式（大一统）：
 *   Layer 1:       倍率区 × 大权区 + 羽毛型附伤
 *   Layer 2:       反应系数 × Layer1 × 月兆区
 *   Layer 3:       Layer2 × 精通区 × 增伤区 + 祷歌型附伤
 *   Layer 4:       Layer3 × 暴击区 × 擢升区 × 防御 × 抗性 × 独立乘区
 *
 * 四条路径（DIRECT / AMPLIFYING / TRANSFORMATIVE / CATALYZE / MOONSIGN_DIRECT）
 * 共享同一管道，通过各乘区的开关值（1 / 实际值）实现差异化。
 */
export class DamageFormula {

  /* ================================================================
   * Public API
   * ================================================================ */

  static calculate(ctx: DamageContext): DamageResult {
    const path = DamageFormula.resolvePath(ctx.reactionType);

    // ── Layer 1: 基础伤害区 ──
    const rawBase = DamageFormula.computeRawBase(ctx, path);
    const authority = new AuthorityZone().calculate(ctx);
    const feather = new FeatherZone().calculate(ctx);
    const innerDamage = rawBase * authority + feather;

    // ── Layer 2: 反应化一（反应系数 × 月兆区）──
    const reactionCoeff = DamageFormula.getReactionCoefficient(ctx, path);
    const moonSign = DamageFormula.computeMoonSign(ctx, path);
    const reactionCore = reactionCoeff * innerDamage * moonSign;

    // ── Layer 3: 反应化二（精通 × 增伤 + 祷歌附伤）──
    const mastery = new MasteryZone().calculate(ctx);
    const bonus = DamageFormula.computeBonus(ctx, path);
    const prayer = DamageFormula.computePrayer(ctx, path);
    const reactedBase = reactionCore * mastery * bonus + prayer;

    // ── Layer 4: 外层乘区 ──
    const crit = DamageFormula.computeCrit(ctx, path);
    const elevation = new ElevationZone().calculate(ctx);
    const defense = DamageFormula.computeDefense(ctx, path);
    const resistance = new ResistanceZone().calculate(ctx);
    const independent = new IndependentZone().calculate(ctx);

    const totalDamage =
      reactedBase * crit * elevation * defense * resistance * independent;

    // ── Debug ──
    const cataBonus = (path === DamagePath.CATALYZE) ? (ctx as any).__cataDebug : undefined;
    const transDebug = (path === DamagePath.TRANSFORMATIVE) ? (ctx as any).__transDebug : undefined;
    const ampDebug = (path === DamagePath.AMPLIFYING) ? (ctx as any).__ampDebug : undefined;
    // moonDebug unused

    return {
      totalDamage,
      baseDamage: rawBase,
      scalingMultiplier: 1,
      bonusMultiplier: bonus,
      critMultiplier: crit,
      resistanceMultiplier: resistance,
      defenseMultiplier: defense,
      reactionMultiplier: reactionCoeff * moonSign * mastery * bonus,
      damagePath: path,
      aggravationBonus: cataBonus ? new CatalyzeZone().calculate(ctx) : 0,
      elevationMultiplier: elevation,
      independentMultiplier: independent,
      baseDebug: (ctx as any).__baseDebug,
      bonusDebug: bonus > 1 ? (ctx as any).__bonusDebug : undefined,
      critDebug: crit > 1 ? (ctx as any).__critDebug : undefined,
      resistDebug: (ctx as any).__resistDebug,
      defenseDebug: (ctx as any).__defenseDebug,
      ampDebug,
      transDebug,
      cataDebug: (ctx as any).__cataDebug,
      moonDebug: (ctx as any).__moonDebug,
      elevDebug: elevation > 1 ? (ctx as any).__elevDebug : undefined,
      indepDebug: independent > 1 ? (ctx as any).__indepDebug : undefined,
      authorityDebug: authority > 1 ? (ctx as any).__authorityDebug : undefined,
      featherDebug: feather > 0 ? (ctx as any).__featherDebug : undefined,
      prayerDebug: prayer > 0 ? (ctx as any).__prayerDebug : undefined,
      masteryDebug: mastery > 1 ? (ctx as any).__masteryDebug : undefined,
      moonSignDebug: (ctx as any).__moonSignDebug,
    };
  }

  static resolvePath(type: ReactionType): DamagePath {
    if (type === ReactionType.NONE) return DamagePath.DIRECT;
    if (type === ReactionType.VAPORIZE || type === ReactionType.MELT) return DamagePath.AMPLIFYING;
    if ([ReactionType.OVERLOADED, ReactionType.SUPERCONDUCT, ReactionType.ELECTRO_CHARGED,
      ReactionType.SWIRL, ReactionType.HYPERBLOOM, ReactionType.BLOOM, ReactionType.BURGEON,
      ReactionType.BURNING, ReactionType.SHATTER].includes(type)) return DamagePath.TRANSFORMATIVE;
    if (type === ReactionType.AGGRAVATION || type === ReactionType.SPREAD) return DamagePath.CATALYZE;
    if ([ReactionType.MOON_BLOOM, ReactionType.MOON_ELECTRO, ReactionType.MOON_CRYSTAL,
      ReactionType.REACTION_MOON_ELECTRO, ReactionType.REACTION_MOON_CRYSTAL].includes(type))
      return DamagePath.MOONSIGN_DIRECT;
    return DamagePath.DIRECT;
  }

  /* ================================================================
   * Per-path helpers
   * ================================================================ */

  /** Layer 1: 倍率区 = 属性缩放 or 等级乘数 or 属性+激化附加。 */
  private static computeRawBase(ctx: DamageContext, path: DamagePath): number {
    if (path === DamagePath.TRANSFORMATIVE) {
      const rate = TRANSFORM_RATES_V52[ctx.reactionType] ?? 0;
      const lvl = getLevelMultiplier(ctx.characterLevel ?? 90);
      return rate * lvl;
    }
    // 直伤 / 增幅 / 激化 / 月反应：属性缩放
    const base = new BaseDamageZone().calculate(ctx);
    if (path === DamagePath.CATALYZE) {
      return base + new CatalyzeZone().calculate(ctx);
    }
    return base;
  }

  /** Layer 2: 反应系数。 */
  private static getReactionCoefficient(ctx: DamageContext, path: DamagePath): number {
    if (path === DamagePath.AMPLIFYING) {
      return new AmplifyingZone().calculate(ctx);
    }
    if (path === DamagePath.MOONSIGN || path === DamagePath.MOONSIGN_DIRECT) {
      return MOON_RATES[ctx.reactionType] ?? 1;
    }
    return 1;
  }

  /** Layer 2: 月兆区。仅月反应路径激活。 */
  private static computeMoonSign(ctx: DamageContext, path: DamagePath): number {
    if (path === DamagePath.MOONSIGN || path === DamagePath.MOONSIGN_DIRECT) {
      return new MoonsignZone().calculate(ctx);
    }
    return 1;
  }

  /** Layer 3: 祷歌型附伤。仅月反应路径可能非零。 */
  private static computePrayer(ctx: DamageContext, path: DamagePath): number {
    if (path === DamagePath.MOONSIGN || path === DamagePath.MOONSIGN_DIRECT) {
      return new PrayerZone().calculate(ctx);
    }
    return 0;
  }

  /** Layer 3: 增伤区。剧变和月反应跳过。 */
  private static computeBonus(ctx: DamageContext, path: DamagePath): number {
    if (path === DamagePath.TRANSFORMATIVE) return 1;
    if (path === DamagePath.MOONSIGN_DIRECT) return 1;
    if (path === DamagePath.MOONSIGN) return 1;
    return new BonusZone().calculate(ctx);
  }

  /** Layer 4: 暴击区。剧变跳过。 */
  private static computeCrit(ctx: DamageContext, path: DamagePath): number {
    if (path === DamagePath.TRANSFORMATIVE) return 1;
    return new CritZone().calculate(ctx);
  }

  /** Layer 4: 防御区。直伤月反应无视。 */
  private static computeDefense(ctx: DamageContext, path: DamagePath): number {
    if (path === DamagePath.MOONSIGN_DIRECT) return 1;
    return new DefenseZone().calculate(ctx);
  }
}
