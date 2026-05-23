import type { DamageContext } from '../../types';
import type { DamageZone } from './base';
import { DEF_LEVEL_CONSTANT, DEF_REDUCTION_CAP } from '../../data/constants';

/**
 * DefenseZone — 敌人防御乘数。
 *
 * Defense Multiplier = (CharLevel + 100) / ((CharLevel + 100) + EffectiveEnemyDef)
 *
 * 其中:
 * EffectiveEnemyDef = (EnemyLevel + 100) × (1 - defReductionSum + defIncreaseSum) × (1 - defIgnore)
 * defReductionSum = clamp(0, DEF_REDUCTION_CAP, Σ defReductions)  // 硬上限 90%（KQM）
 * defIncreaseSum = clamp(0, 1, Σ defIncreases)  // 怪物防御增加（罕见，默认 0）
 *
 * - CharLevel: 角色等级（来自 DamageContext，默认 90）
 * - EnemyLevel: 敌人等级
 * - defReductions: 防御降低比例数组（如超导 0.4），总和上限 90%
 * - defIgnore: 无视防御比例（如雷电 C2 0.6）
 * - defIncreases: 怪物防御增加比例数组（如属性强化石），默认 []
 *
 * NOTE: BWIKI 记载减防上限「估测 100%」，但 KQM 经实测断言「hard capped at 90%」。
 * 本引擎采纳 KQM 数据。如需调整，修改 DEF_REDUCTION_CAP 常量即可。
 */
export class DefenseZone implements DamageZone {
  calculate(ctx: DamageContext): number {
    const characterLevel = Number(ctx.characterLevel ?? 90);
    const enemyLevel = Number(ctx.enemyLevel);

    const ctxDefReductions = ctx.defReductions ?? [];
    const extraDefReductions = ctx.extraBonuses?.defReductions ?? [];
    const defReductions = [...ctxDefReductions, ...extraDefReductions];

    const ctxDefIgnore = ctx.defIgnore ?? 0;
    const extraDefIgnore = ctx.extraBonuses?.defIgnore ?? 0;
    const defIgnore = Math.max(0, Math.min(1, ctxDefIgnore + extraDefIgnore));

    // 怪物防御增加（副本属性强化石等，极罕见，默认 0）
    const ctxDefIncreases = ctx.defIncreases ?? [];
    const extraDefIncreases = ctx.extraBonuses?.defIncreases ?? [];
    const defIncreases = [...ctxDefIncreases, ...extraDefIncreases];
    const defIncreaseSum = Math.min(1, defIncreases.reduce((a, b) => a + b, 0));

    const charTerm = characterLevel + DEF_LEVEL_CONSTANT;
    const enemyTerm = enemyLevel + DEF_LEVEL_CONSTANT;

    const defReductionSum = Math.max(0, Math.min(DEF_REDUCTION_CAP, defReductions.reduce((a, b) => a + b, 0)));
    const effectiveEnemyDef = enemyTerm * (1 - defReductionSum + defIncreaseSum) * (1 - defIgnore);

    const result = charTerm / (charTerm + effectiveEnemyDef);
    
    // 挂到 ctx 上供 formula.ts 取出存入 DamageResult
    (ctx as any).__defenseDebug = {
      characterLevel, enemyLevel,
      charTerm, enemyTerm, defReductionSum, defIncreaseSum, defIgnore,
      effectiveEnemyDef, result,
    };
    return result;
  }

  getName(): string {
    return '防御区';
  }
}
