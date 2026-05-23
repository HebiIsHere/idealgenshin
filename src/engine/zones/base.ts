import type { DamageContext } from '../../types';

/**
 * DamageZone — 每个伤害计算乘区的抽象接口。
 * 每个乘区产出一个乘数，在公式管道中组合。
 */
export interface DamageZone {
  /** 计算该乘区的贡献（乘数或基础值）。 */
  calculate(ctx: DamageContext): number;
  /** 人类可读的乘区名称。 */
  getName(): string;
}

/**
 * BaseDamageZone — 使用多属性缩放计算原始基础伤害。
 * Base Damage = Skill Multiplier × Σ(stat × ratio) + extraBonuses.baseDamageFlat
 *
 * 缩放由 StatScaling 决定:
 * rawBase = totalAtk × atkRatio + totalHp × hpRatio + totalDef × defRatio + em × emRatio
 * baseDamage = skillMultiplier × rawBase + baseDamageFlat
 *
 * 当只有一个 ratio 为非零时，行为等价于旧的单属性缩放。
 */
export class BaseDamageZone implements DamageZone {
  calculate(ctx: DamageContext): number {
    const { stats, skillMultiplier, statScaling, extraBonuses } = ctx;

    const rawBase =
      stats.totalAtk * statScaling.atkRatio +
      stats.totalHp * statScaling.hpRatio +
      stats.totalDef * statScaling.defRatio +
      stats.em * statScaling.emRatio;

    const baseDmgMultiplier = ctx.baseDmgMultiplier ?? 1.0;
    const extraBaseFlat = extraBonuses?.baseDamageFlat ?? 0;
    const conversionBaseFlat = stats.baseDamageFlat ?? 0;
    const totalBaseFlat = extraBaseFlat + conversionBaseFlat;
    const result = skillMultiplier * baseDmgMultiplier * rawBase + totalBaseFlat;

    (ctx as any).__baseDebug = { totalAtk: stats.totalAtk, skillMultiplier, baseDmgMultiplier, rawBase, baseDamageFlat: totalBaseFlat, result };
    return result;
  }

  getName(): string {
    return '基础伤害区';
  }
}
