import type { DamageContext } from '../../types';
import type { DamageZone } from './base';
import { getTransformativeEMBonus, TRANSFORM_RATES_V52, getLevelMultiplier } from '../../data/constants';
import { ReactionType } from '../../types';

/**
 * TransformativeZone — transformative reaction base damage.
 *
 * Transformative Base Damage = Rate × LevelMultiplier × (1 + EM Bonus)
 *
 * The resistance multiplier is applied separately by ResistanceZone.
 * This zone returns the full transformative base damage (including EM bonus).
 *
 * For transformative reactions, this IS the base damage — no skill multiplier
 * or scaling stat is involved.
 */
export class TransformativeZone implements DamageZone {
  calculate(ctx: DamageContext): number {
    const { reactionType, stats } = ctx;

    if (!isTransformativeReaction(reactionType)) {
      return 0;
    }

    const rate = TRANSFORM_RATES_V52[reactionType] ?? 0;
    const levelMultiplier = getLevelMultiplier(ctx.characterLevel ?? 90);
    const emBonus = getTransformativeEMBonus(stats.em);
    const transformReactionBonus = ctx.extraBonuses?.transformReactionBonus ?? 0;
    const result = rate * levelMultiplier * (1 + emBonus + transformReactionBonus);
    (ctx as any).__transDebug = { rate, levelMultiplier, em: stats.em, emBonus, transformReactionBonus, result };
    return result;
  }

  getName(): string {
    return '剧变反应区';
  }
}

/**
 * Check if a reaction is a transformative reaction.
 */
function isTransformativeReaction(type: ReactionType): boolean {
  return [
    ReactionType.OVERLOADED,
    ReactionType.SUPERCONDUCT,
    ReactionType.ELECTRO_CHARGED,
    ReactionType.SWIRL,
    ReactionType.HYPERBLOOM,
    ReactionType.BLOOM,
    ReactionType.BURGEON,
    ReactionType.BURNING,
    ReactionType.SHATTER,
  ].includes(type);
}
