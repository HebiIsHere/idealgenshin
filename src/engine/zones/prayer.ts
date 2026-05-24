import type { DamageContext } from '../../types';
import type { DamageZone } from './base';

/**
 * PrayerZone — 祷歌型附伤区。
 *
 * 在反应系数和月兆区之后、精通/增伤/暴击之前叠加的固定伤害。
 * 命名依据：菈乌玛（Lauma），目前只存在于月反应中。
 *
 * 公式：Σ(附伤角色属性 × 附伤倍率) 或直接传入固定值。
 * 不吃反应系数和月兆缩放，但吃精通/增伤/暴击/擢升/防御/抗性。
 */
export class PrayerZone implements DamageZone {
  calculate(ctx: DamageContext): number {
    const flat = ctx.extraBonuses?.prayerFlat ?? 0;

    let scalingSum = 0;
    const prayerScaling = ctx.extraBonuses?.prayerScaling;
    if (prayerScaling) {
      const { stats } = ctx;
      scalingSum += stats.totalAtk * (prayerScaling.atkRatio ?? 0);
      scalingSum += stats.totalHp * (prayerScaling.hpRatio ?? 0);
      scalingSum += stats.totalDef * (prayerScaling.defRatio ?? 0);
      scalingSum += stats.em * (prayerScaling.emRatio ?? 0);
    }

    const result = flat + scalingSum;

    if (result > 0) {
      (ctx as any).__prayerDebug = { flat, scalingSum, result };
    }
    return result;
  }

  getName(): string {
    return '祷歌型附伤';
  }
}
