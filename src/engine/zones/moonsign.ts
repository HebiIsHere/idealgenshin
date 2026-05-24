import type { DamageContext } from '../../types';
import type { DamageZone } from './base';
import { ReactionType } from '../../types';

/**
 * MoonsignZone — 月兆区乘数。
 *
 * 月兆区 = 1 + Σ(每个月兆角色提供的提升)
 *
 * 在统一公式中位于反应系数之后，应用于反应化计算。
 * 默认每人提升 0.05 (5%)，具体值由外部通过 extraBonuses 传入。
 */
export class MoonsignZone implements DamageZone {
  calculate(ctx: DamageContext): number {
    const moonCount = ctx.extraBonuses?.moonCharacterCount ?? 0;
    const perCharBonus = ctx.extraBonuses?.moonPerCharBonus ?? 0.05;
    const result = 1 + moonCount * perCharBonus;
    (ctx as any).__moonSignDebug = { moonCharacters: moonCount, perCharBonus, result };
    return result;
  }

  getName(): string {
    return '月兆区';
  }
}
