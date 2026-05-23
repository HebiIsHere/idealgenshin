import type { DamageContext } from '../../types';
import type { DamageZone } from './base';

/**
 * CritZone — 暴击乘数。
 * Crit Multiplier = 1 + min(Crit Rate, 1) × Crit Damage
 *
 * 表示包含暴击的平均伤害乘数。
 * 暴击率上限为 100%（1.0）。
 * 武器被动/命座的暴击加成已通过 StatCalculator 叠加到 ComputedStats。
 */
export class CritZone implements DamageZone {
  calculate(ctx: DamageContext): number {
    const effectiveCritRate = Math.min(ctx.stats.critRate, 1.0);
    const result = 1 + effectiveCritRate * ctx.stats.critDmg;
    (ctx as any).__critDebug = { critRate: ctx.stats.critRate, critDmg: ctx.stats.critDmg, effectiveCritRate, result };
    return result;
  }

  getName(): string {
    return '暴击区';
  }
}
