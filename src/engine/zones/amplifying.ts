import type { DamageContext } from '../../types';
import type { DamageZone } from './base';
import { getAmplifyingEMBonus } from '../../data/constants';
import { ReactionType } from '../../types';

/**
 * AmplifyingZone — amplifying reaction multiplier (Vaporize / Melt).
 *
 * Amplifying Multiplier = Reaction Base Multiplier × (1 + EM Bonus + Other Reaction Bonus)
 *
 * Reaction Base Multipliers:
 * - Vaporize: Pyro on Hydro = 1.5×, Hydro on Pyro = 2.0×
 * - Melt: Cryo on Pyro = 1.5×, Pyro on Cryo = 2.0×
 *
 * EM Bonus = 2.78 × EM / (EM + 1400)
 *
 * Path guard: returns 1.0 for non-amplifying reactions (including new reaction types).
 */
export class AmplifyingZone implements DamageZone {
  calculate(ctx: DamageContext): number {
    const { reactionType, stats, amplifyingMultiplier } = ctx;

    // Path guard: only amplifying reactions (Vaporize/Melt) produce a multiplier > 1.0
    if (reactionType === ReactionType.NONE || !isAmplifyingReaction(reactionType)) {
      return 1.0;
    }

    // Base reaction multiplier from context (determined by element interaction order)
    const baseMultiplier = amplifyingMultiplier > 0 ? amplifyingMultiplier : getBaseReactionMultiplier(reactionType);

    const emBonus = getAmplifyingEMBonus(stats.em);
    const ampReactionBonus = ctx.extraBonuses?.ampReactionBonus ?? 0;
    const result = baseMultiplier * (1 + emBonus + ampReactionBonus);
    (ctx as any).__ampDebug = { baseMultiplier, em: stats.em, emBonus, ampReactionBonus, result };
    return result;
  }

  getName(): string {
    return '增幅反应区';
  }
}

/**
 * Check if a reaction is an amplifying reaction.
 */
function isAmplifyingReaction(type: ReactionType): boolean {
  return type === ReactionType.VAPORIZE || type === ReactionType.MELT;
}

/**
 * Get the base reaction multiplier for a given reaction type.
 * Default: assumes the weaker (1.5×) variant.
 * The actual multiplier depends on element application order,
 * which is set via amplifyingMultiplier in DamageContext.
 */
function getBaseReactionMultiplier(type: ReactionType): number {
  switch (type) {
    case ReactionType.VAPORIZE:
      return 1.5; // Default to weaker variant; user should set amplifyingMultiplier
    case ReactionType.MELT:
      return 1.5; // Default to weaker variant
    default:
      return 1.0;
  }
}
