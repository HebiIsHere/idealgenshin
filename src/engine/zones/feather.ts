import type { DamageContext } from '../../types';
import type { DamageZone } from './base';

/**
 * FeatherZone — 羽毛型附伤区。
 *
 * 在反应系数和月兆区之前叠加的固定伤害，
 * 来源于其他角色的属性×倍率加成（如申鹤的冰翎）。
 *
 * 公式：Σ(附伤角色属性 × 附伤倍率) 或直接传入固定值。
 *
 * 命名依据：申鹤和社区习惯。
 */
export class FeatherZone implements DamageZone {
  calculate(ctx: DamageContext): number {
    const flat = ctx.extraBonuses?.featherFlat ?? 0;

    // 属性缩放型：Σ(stat × ratio)
    let scalingSum = 0;
    const featherScaling = ctx.extraBonuses?.featherScaling;
    if (featherScaling) {
      const { stats } = ctx;
      scalingSum += stats.totalAtk * (featherScaling.atkRatio ?? 0);
      scalingSum += stats.totalHp * (featherScaling.hpRatio ?? 0);
      scalingSum += stats.totalDef * (featherScaling.defRatio ?? 0);
      scalingSum += stats.em * (featherScaling.emRatio ?? 0);
    }

    const result = flat + scalingSum;

    if (result > 0) {
      (ctx as any).__featherDebug = { flat, scalingSum, result };
    }
    return result;
  }

  getName(): string {
    return '羽毛型附伤';
  }
}
