import type { DamageContext } from '../../types';
import type { DamageZone } from './base';

/**
 * ScalingZone — selects the appropriate scaling attribute multiplier.
 *
 * For the standard formula, the scaling is already included in the base damage
 * (skillMultiplier × scalingStat). This zone exists to represent the scaling
 * choice explicitly and returns 1.0 as a passthrough, since the base zone
 * already incorporates it.
 *
 * Future extension: some multi-hit combos may separate base from scaling.
 */
export class ScalingZone implements DamageZone {
  calculate(_ctx: DamageContext): number {
    // Scaling is already incorporated into BaseDamageZone
    return 1.0;
  }

  getName(): string {
    return '倍率区';
  }
}
