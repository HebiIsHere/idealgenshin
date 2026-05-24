import type { DamageContext } from '../../types';
import type { DamageZone } from './base';
import { ReactionType } from '../../types';

/**
 * MasteryZone — 精通区（独立外层乘区）。
 *
 * 根据反应类型路由到不同的 EM 曲线：
 * - 直伤/激化/无反应：1
 * - 增幅（蒸发/融化）：1 + 2.78×EM/(EM+1400) + Σ反应增伤
 * - 剧变（绽放/超载等）：1 + 16×EM/(EM+2000) + Σ反应增伤
 * - 月反应：1 + 6×EM/(EM+2000) + Σ月反应增伤
 */
export class MasteryZone implements DamageZone {
  calculate(ctx: DamageContext): number {
    const { reactionType, stats } = ctx;

    if (this.isAmplifying(reactionType)) {
      const emBonus = (2.78 * stats.em) / (stats.em + 1400);
      const ampBonus = ctx.extraBonuses?.ampReactionBonus ?? 0;
      const result = 1 + emBonus + ampBonus;
      (ctx as any).__masteryDebug = { em: stats.em, emBonus, ampBonus, result, type: 'amplifying' };
      return result;
    }

    if (this.isTransformative(reactionType)) {
      const emBonus = (16 * stats.em) / (stats.em + 2000);
      const transBonus = ctx.extraBonuses?.transformReactionBonus ?? 0;
      const result = 1 + emBonus + transBonus;
      (ctx as any).__masteryDebug = { em: stats.em, emBonus, transBonus, result, type: 'transformative' };
      return result;
    }

    if (this.isMoonsign(reactionType)) {
      const emBonus = (6 * stats.em) / (stats.em + 2000);
      const moonBonus = ctx.extraBonuses?.moonReactionBonus ?? 0;
      const result = 1 + emBonus + moonBonus;
      (ctx as any).__masteryDebug = { em: stats.em, emBonus, moonBonus, result, type: 'moonsign' };
      return result;
    }

    // 直伤 / 激化：精通区 = 1（激化加成已在倍率区处理）
    return 1;
  }

  private isAmplifying(type: ReactionType): boolean {
    return type === ReactionType.VAPORIZE || type === ReactionType.MELT;
  }

  private isTransformative(type: ReactionType): boolean {
    return [
      ReactionType.OVERLOADED, ReactionType.SUPERCONDUCT,
      ReactionType.ELECTRO_CHARGED, ReactionType.SWIRL,
      ReactionType.HYPERBLOOM, ReactionType.BLOOM,
      ReactionType.BURGEON, ReactionType.BURNING,
      ReactionType.SHATTER,
    ].includes(type);
  }

  private isMoonsign(type: ReactionType): boolean {
    return [
      ReactionType.MOON_BLOOM, ReactionType.MOON_ELECTRO,
      ReactionType.MOON_CRYSTAL,
      ReactionType.REACTION_MOON_ELECTRO, ReactionType.REACTION_MOON_CRYSTAL,
    ].includes(type);
  }

  getName(): string {
    return '精通区';
  }
}
