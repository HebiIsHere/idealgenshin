import type { DamageContext } from '../../types';
import type { DamageZone } from './base';

/**
 * BonusZone — 元素/其他伤害加成乘数。
 * Bonus Multiplier = 1 + Damage Bonus%
 *
 * Damage Bonus 包括:
 * - 圣遗物杯子元素伤害加成
 * - 套装效果（P2）
 * - 其他来源的伤害加成（武器被动、命座等已通过 StatCalculator 叠加到 ComputedStats）
 */
export class BonusZone implements DamageZone {
  calculate(ctx: DamageContext): number {
    const result = 1 + ctx.stats.dmgBonus;
    (ctx as any).__bonusDebug = { dmgBonus: ctx.stats.dmgBonus, result };
    return result;
  }

  getName(): string {
    return '增伤区';
  }
}
