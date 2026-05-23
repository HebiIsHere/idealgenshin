import type { DamageContext } from '../../types';
import type { DamageZone } from './base';
import { ReactionType } from '../../types';
import { MOON_RATES, getMoonsignEMBonus, getLevelMultiplier } from '../../data/constants';

/**
 * MoonsignZone — computes the base damage for moonsign reactions.
 *
 * Moon Base Damage = MoonRate × LevelMultiplier × (1 + EM Bonus)
 *
 * Where:
 * - MoonRate: varies by moonsign reaction type (MOON_BLOOM=1.0, MOON_ELECTRO=3.0, etc.)
 * - LevelMultiplier: from LEVEL_MULTIPLIERS table based on character level
 * - EM Bonus = 6 × EM / (EM + 2000)
 *
 * IMPORTANT: This zone returns the COMPLETE base damage for the moonsign path.
 * No skill multiplier or scaling stat is involved — similar to transformative reactions.
 */
export class MoonsignZone implements DamageZone {
  calculate(ctx: DamageContext): number {
    const { reactionType, stats } = ctx;

    // Guard: only moonsign reactions
    if (!isMoonsignReaction(reactionType)) {
      return 0;
    }

    const moonRate = MOON_RATES[reactionType] ?? 0;
    const levelMultiplier = getLevelMultiplier(ctx.characterLevel ?? 90);
    const emBonus = getMoonsignEMBonus(stats.em);
    const moonReactionBonus = ctx.extraBonuses?.moonReactionBonus ?? 0;
    const result = moonRate * levelMultiplier * (1 + emBonus + moonReactionBonus);
    (ctx as any).__moonDebug = { moonRate, levelMultiplier, em: stats.em, emBonus, moonReactionBonus, result };
    return result;
  }

  getName(): string {
    return '月曜区';
  }
}

/**
 * Check if a reaction is a moonsign reaction.
 */
function isMoonsignReaction(type: ReactionType): boolean {
  return [
    ReactionType.MOON_BLOOM,
    ReactionType.MOON_ELECTRO,
    ReactionType.MOON_CRYSTAL,
    ReactionType.REACTION_MOON_ELECTRO,
    ReactionType.REACTION_MOON_CRYSTAL,
  ].includes(type);
}
