import type { DamageContext } from '../../types';
import type { DamageZone } from './base';

/**
 * IndependentZone — independent damage multiplier.
 *
 * Placed LAST in the damage pipeline (after all other zones).
 * Multiplier = 1 + ΣindependentBonus
 *
 * Uses:
 * - Talent passives that multiply damage independently of DMG Bonus
 * - Certain constellations with multiplicative effects
 * - Weapon passives that provide separate multipliers
 */
export class IndependentZone implements DamageZone {
  calculate(ctx: DamageContext): number {
    const talentBonus = ctx.extraBonuses?.independentBonus ?? 0;
    const ctxBonus = ctx.independentBonus ?? 0;
    const result = 1 + talentBonus + ctxBonus;
    (ctx as any).__indepDebug = { talentBonus, ctxBonus, result };
    return result;
  }

  getName(): string {
    return '独立乘区';
  }
}
