import type { DamageContext } from '../../types';
import type { DamageZone } from './base';

/**
 * ElevationZone — elevation multiplier for moonsign reactions.
 *
 * Elevation Multiplier = 1 + ElevationBonus
 *
 * Where elevationBonus is a percentage stored as decimal (e.g. 0.3 for 30%).
 * Defaults to 0, producing a multiplier of 1.0 (no effect).
 *
 * This zone is only used in the Moonsign damage path.
 */
export class ElevationZone implements DamageZone {
  calculate(ctx: DamageContext): number {
    const elevationBonus = ctx.elevationBonus ?? 0;
    const result = 1 + elevationBonus;
    (ctx as any).__elevDebug = { elevationBonus, result };
    return result;
  }

  getName(): string {
    return '擢升区';
  }
}
