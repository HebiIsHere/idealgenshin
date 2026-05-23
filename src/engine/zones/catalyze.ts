import type { DamageContext } from '../../types';
import type { DamageZone } from './base';
import { ReactionType } from '../../types';
import { AGGRAVATION_BASE_RATES, getAggravationEMBonus, getLevelMultiplier } from '../../data/constants';

/**
 * CatalyzeZone — computes the aggravation/spread bonus for catalyze reactions.
 *
 * Aggravation Bonus = BaseRate × LevelMultiplier × (1 + EM Bonus)
 *
 * Where:
 * - BaseRate: AGGRAVATION = 1.15, SPREAD = 1.25
 * - LevelMultiplier: from LEVEL_MULTIPLIERS table based on character level
 * - EM Bonus = 5 × EM / (EM + 1200)
 *
 * IMPORTANT: This zone returns an ADDITIVE bonus that is added to baseDamage,
 * not a multiplicative multiplier. In the catalyze formula:
 *   effectiveBase = baseDamage + aggravationBonus
 */
export class CatalyzeZone implements DamageZone {
  calculate(ctx: DamageContext): number {
    const { reactionType, stats } = ctx;

    // Guard: only catalyze reactions (Aggravation/Spread)
    if (reactionType !== ReactionType.AGGRAVATION && reactionType !== ReactionType.SPREAD) {
      return 0;
    }

    const baseRate = AGGRAVATION_BASE_RATES[reactionType] ?? 0;
    const levelMultiplier = getLevelMultiplier(ctx.characterLevel ?? 90);
    const emBonus = getAggravationEMBonus(stats.em);
    const result = baseRate * levelMultiplier * (1 + emBonus);
    (ctx as any).__cataDebug = { baseRate, levelMultiplier, em: stats.em, emBonus, result };
    return result;
  }

  getName(): string {
    return '激化区';
  }
}
