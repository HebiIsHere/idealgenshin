import type { DamageContext } from '../../types';
import type { DamageZone } from './base';
import { ReactionType } from '../../types';

/**
 * AmplifyingZone — 增幅反应系数。
 *
 * 仅返回反应基础倍率（1.5 或 2.0），精通部分已移至 MasteryZone。
 *
 * Reaction Base Multipliers:
 * - Vaporize: Pyro on Hydro = 1.5×, Hydro on Pyro = 2.0×
 * - Melt: Cryo on Pyro = 1.5×, Pyro on Cryo = 2.0×
 */
export class AmplifyingZone implements DamageZone {
  calculate(ctx: DamageContext): number {
    const { reactionType, amplifyingMultiplier } = ctx;

    if (reactionType === ReactionType.NONE) return 1.0;
    if (reactionType !== ReactionType.VAPORIZE && reactionType !== ReactionType.MELT) return 1.0;

    const baseMultiplier = amplifyingMultiplier > 0 ? amplifyingMultiplier : this.getBaseMultiplier(reactionType);
    (ctx as any).__ampDebug = { baseMultiplier, result: baseMultiplier };
    return baseMultiplier;
  }

  private getBaseMultiplier(type: ReactionType): number {
    switch (type) {
      case ReactionType.VAPORIZE: return 1.5;
      case ReactionType.MELT: return 1.5;
      default: return 1.0;
    }
  }

  getName(): string {
    return '增幅反应区';
  }
}
