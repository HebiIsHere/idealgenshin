import type { DamageContext } from '../../types';
import type { DamageZone } from './base';

/**
 * ResistanceZone — 敌人抗性乘数。
 *
 * 基于敌人抗性 (R) 的三种情况:
 * - R < 0:      Multiplier = 1 - R/2       (负抗性，伤害提升)
 * - 0 ≤ R < 0.75: Multiplier = 1 - R       (正常范围)
 * - R ≥ 0.75:  Multiplier = 1 / (1 + 4R)   (极高抗性)
 *
 * 所有抗性值存为小数 (10% = 0.10)。
 *
 * V2: 支持额外减抗（武器被动/命座），通过 extraBonuses.resistReduction 叠加。
 */
export class ResistanceZone implements DamageZone {
  calculate(ctx: DamageContext): number {
    const resistReduction = ctx.extraBonuses?.resistReduction ?? 0;
    const r = ctx.enemyResistance - resistReduction;
    let result: number;
    if (r < 0) {
      result = 1 - r / 2;
    } else if (r < 0.75) {
      result = 1 - r;
    } else {
      result = 1 / (1 + 4 * r);
    }
    (ctx as any).__resistDebug = { enemyResistance: ctx.enemyResistance, resistReduction, effectiveRes: r, result };
    return result;
  }

  getName(): string {
    return '抗性区';
  }
}
