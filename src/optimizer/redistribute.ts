import type {
  RedistributeRequest,
  RedistributeResult,
  SubstatAllocation,
  CharacterBuild,
  ComputedStats,
  DamageContext,
  DamageResult,
  StatScaling,
} from '../types';
import { StatCalculator } from '../engine/stats';
import { DamageFormula } from '../engine/formula';
import { SearchSpaceExplorer } from './search';
import { SUBSTAT_MID_VALUES, DEFAULT_ENEMY_LEVEL, DEFAULT_ENEMY_RESISTANCE } from '../data/constants';
import { mergeExtraBonuses } from '../utils/mergeExtraBonuses';

/**
 * RedistributeOptimizer — finds the optimal sub-stat allocation
 * given a fixed total number of rolls.
 *
 * Algorithm:
 * 1. Extract total rolls from current allocations
 * 2. Get the character's relevant sub-stats
 * 3. Use enumerateAndEvaluate() with inline pruning and callback-based evaluation
 * 4. Return the best distribution found
 */
export class RedistributeOptimizer {
  /**
   * Optimize sub-stat redistribution.
   * @param req - Request containing the current build and allocations
   * @param onProgress - Optional progress callback (0-1)
   * @returns Optimization result with best allocation and improvement
   */
  static optimize(
    req: RedistributeRequest,
    onProgress?: (progress: number) => void,
  ): RedistributeResult {
    const { build, currentAllocations, anchoredTypes } = req;

    // Calculate current damage
    const currentStats = StatCalculator.compute(build);
    const currentDamage = evaluateDamage(build, currentStats);
    const originalBreakdown = evaluateDamageWithBreakdown(build, currentStats);

    // 拆分锚定词条与自由词条
    const anchoredSet = new Set(anchoredTypes ?? []);
    const anchoredAllocations = currentAllocations.filter((a) => anchoredSet.has(a.type));
    const freeAllocations = currentAllocations.filter((a) => !anchoredSet.has(a.type));

    // Calculate total rolls from free allocations only
    const totalRolls = freeAllocations.reduce((sum, a) => sum + a.rolls, 0);

    // 获取相关词条（排除锚定类型），并根据当前倍率配置动态扩展
    const relSet = new Set(build.character.relevantSubstats);
    const sc = build.statScaling ?? build.character.defaultStatScaling;
    if ((sc.hpRatio ?? 0) > 0) { relSet.add('HP_PERCENT' as any); relSet.add('HP_FLAT' as any); }
    if ((sc.defRatio ?? 0) > 0) { relSet.add('DEF_PERCENT' as any); relSet.add('DEF_FLAT' as any); }
    if ((sc.atkRatio ?? 0) > 0) { relSet.add('ATK_PERCENT' as any); relSet.add('ATK_FLAT' as any); }
    if ((sc.emRatio ?? 0) > 0) { relSet.add('ELEMENTAL_MASTERY' as any); }
    // 排除锚定的词条类型
    for (const t of anchoredSet) { relSet.delete(t as any); }
    const relevantTypes = Array.from(relSet) as any[];

    if (totalRolls === 0 || relevantTypes.length === 0) {
      // 无可优化词条：结果 = 当前分配
      const fullAllocation = [...freeAllocations, ...anchoredAllocations];
      return {
        originalDamage: currentDamage,
        optimizedDamage: currentDamage,
        improvementPercent: 0,
        optimizedAllocations: fullAllocation,
        currentAllocations,
        originalBreakdown,
        optimizedBreakdown: originalBreakdown,
        originalStats: currentStats,
        optimizedStats: currentStats,
      };
    }

    // Use hill-climbing optimization on free types only.
    // 评估时始终合并锚定词条，确保 bestDamage 代表完整伤害。
    const { bestAllocation, bestDamage } = SearchSpaceExplorer.hillClimb(
      totalRolls,
      relevantTypes,
      (allocation: SubstatAllocation[]): number => {
        const fullAllocation = [...allocation, ...anchoredAllocations];
        const virtualBuild = buildWithAllocation(build, fullAllocation);
        const virtualStats = StatCalculator.compute(virtualBuild);
        return evaluateDamage(virtualBuild, virtualStats);
      },
      freeAllocations,  // use free allocation as initial guess
      onProgress,
    );

    // 合并结果：自由词条优化分配 + 锚定词条不变
    const mergedAllocations = [...bestAllocation, ...anchoredAllocations];

    // 用完整分配重新计算伤害和 breakdown，确保一致性
    const optimizedBuild = buildWithAllocation(build, mergedAllocations);
    const optimizedStats = StatCalculator.compute(optimizedBuild);
    const optimizedDamage = evaluateDamage(optimizedBuild, optimizedStats);
    const optimizedBreakdown = evaluateDamageWithBreakdown(optimizedBuild, optimizedStats);

    const improvementPercent = currentDamage > 0
      ? (optimizedDamage - currentDamage) / currentDamage
      : 0;

    return {
      originalDamage: currentDamage,
      optimizedDamage,
      improvementPercent,
      optimizedAllocations: mergedAllocations,
      currentAllocations,
      originalBreakdown,
      optimizedBreakdown,
      originalStats: currentStats,
      optimizedStats,
    };
  }
}

/**
 * Create a virtual build with the given sub-stat allocation.
 * Replaces all artifact sub-stats with the allocation using mid-values.
 */
function buildWithAllocation(
  originalBuild: CharacterBuild,
  allocation: SubstatAllocation[],
): CharacterBuild {
  // Convert allocation to sub-stat entries using mid-values
  const subStats = allocation
    .filter((a) => a.rolls > 0)
    .map((a) => ({
      type: a.type,
      value: a.rolls * ((SUBSTAT_MID_VALUES as any)[a.type] ?? 0),
    }));

  // Replace all artifact sub-stats while keeping main stats
  const newArtifacts = originalBuild.artifacts.map((artifact, idx) => {
    if (idx === 0) {
      // First artifact gets all the sub-stats
      return {
        ...artifact,
        subStats,
      };
    }
    // Other artifacts get empty sub-stats (already accounted for)
    return {
      ...artifact,
      subStats: [],
    };
  });

  return {
    ...originalBuild,
    artifacts: newArtifacts,
  };
}

/**
 * Resolve stat scaling from build: use build override or fall back to character default.
 */
function resolveStatScaling(build: CharacterBuild): StatScaling {
  return build.statScaling ?? build.character.defaultStatScaling;
}

/**
 * Evaluate damage for a build using the damage formula.
 */
function evaluateDamage(build: CharacterBuild, stats: ComputedStats): number {
  const extraBonuses = mergeExtraBonuses(build);
  const ctx: DamageContext = {
    stats,
    skillMultiplier: build.skillMultiplier,
    statScaling: resolveStatScaling(build),
    reactionType: build.reactionType,
    enemyLevel: DEFAULT_ENEMY_LEVEL,
    enemyResistance: DEFAULT_ENEMY_RESISTANCE,
    // 0 = default 1.5× (weak side); set 2.0× for Hydro→Pyro / Pyro→Cryo explicitly via scenario
    amplifyingMultiplier: build.amplifyingMultiplier ?? 0,
    baseDmgMultiplier: build.baseDmgMultiplier ?? 1.0,
    characterLevel: build.characterLevel,
    defReductions: [...(extraBonuses.defReductions ?? [])],
    defIgnore: extraBonuses.defIgnore ?? 0,
    elevationBonus: extraBonuses.elevationBonus ?? 0,
    extraBonuses,
    independentBonus: 0,
  };

  const result = DamageFormula.calculate(ctx);
  const dmg = result.totalDamage;
  if (!isFinite(dmg)) {
    console.warn('[RedistributeOptimizer] Non-finite damage:', dmg, 'stats:', JSON.stringify(stats));
    return 0;
  }
  return dmg;
}

/**
 * Evaluate damage for a build and return the full per-zone breakdown.
 * Used for display purposes — the optimization loop still uses evaluateDamage().
 */
function evaluateDamageWithBreakdown(build: CharacterBuild, stats: ComputedStats): DamageResult {
  const extraBonuses = mergeExtraBonuses(build);
  const ctx: DamageContext = {
    stats,
    skillMultiplier: build.skillMultiplier,
    statScaling: resolveStatScaling(build),
    reactionType: build.reactionType,
    enemyLevel: DEFAULT_ENEMY_LEVEL,
    enemyResistance: DEFAULT_ENEMY_RESISTANCE,
    amplifyingMultiplier: build.amplifyingMultiplier ?? 0,
    baseDmgMultiplier: build.baseDmgMultiplier ?? 1.0,
    characterLevel: build.characterLevel,
    defReductions: [...(extraBonuses.defReductions ?? [])],
    defIgnore: extraBonuses.defIgnore ?? 0,
    elevationBonus: extraBonuses.elevationBonus ?? 0,
    extraBonuses,
    independentBonus: 0,
  };

  return DamageFormula.calculate(ctx);
}
