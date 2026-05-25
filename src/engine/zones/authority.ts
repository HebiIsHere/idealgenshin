import type { DamageContext } from '../../types';
import type { DamageZone } from './base';

/**
 * AuthorityZone — 大权区（有条件倍率）。
 *
 * 实质上是一个独立于技能倍率的额外倍率因子，
 * 通常来自角色自身的特殊机制，不受其他角色天赋影响。
 * 命名依据：那维莱特（Neuvillette）。
 *
 * 默认值 1.0（无额外倍率），传入的值为百分比小数（如 0.617 表示 +61.7%）。
 */
export class AuthorityZone implements DamageZone {
  calculate(ctx: DamageContext): number {
    const bonus = ctx.extraBonuses?.authorityMultiplier ?? 0;
    const result = 1 + bonus;
    (ctx as any).__authorityDebug = { bonus, result };
    return result;
  }

  getName(): string {
    return '大权区';
  }
}
