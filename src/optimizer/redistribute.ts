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
import { SUBSTAT_MID_VALUES, DEFAULT_ENEMY_LEVEL, DEFAULT_ENEMY_RESISTANCE, ELEMENT_DMG_BONUS_STAT } from '../data/constants';
import { mergeExtraBonuses } from '../utils/mergeExtraBonuses';
import { enumerateMainStatCombos, applyMainStats, getCurrentMainStats, type MainStatCombo } from './mainStatSearch';

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
    const { build, currentAllocations, anchoredTypes, enableMainStatSearch } = req;

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
        mainStatCombo: getCurrentMainStats(build),
      };
    }

    let bestAllocation = freeAllocations;
    let bestDamage = currentDamage;
    let bestCombo: MainStatCombo = getCurrentMainStats(build);

    if (enableMainStatSearch) {
      // Phase 1: enumerate main stat combos, quick evaluate
      const elementDmgStat = ELEMENT_DMG_BONUS_STAT[build.character.element];
      const allCombos = enumerateMainStatCombos(elementDmgStat);
      const scored: { combo: MainStatCombo; damage: number }[] = [];
      for (let i = 0; i < allCombos.length; i++) {
        const combo = allCombos[i];
        const b = applyMainStats(build, combo);
        const { damage } = SearchSpaceExplorer.quickEvaluate(totalRolls, relevantTypes,
          (alloc) => {
            const fullAlloc = [...alloc, ...anchoredAllocations];
            const vb = buildWithAllocation(b, fullAlloc);
            return evaluateDamage(vb, StatCalculator.compute(vb));
          });
        scored.push({ combo, damage });
        if (onProgress) onProgress((i / allCombos.length) * 0.3);
      }

      // Top 20 by quick score
      scored.sort((a, b) => b.damage - a.damage);
      const topN = scored.slice(0, 20);

      // Phase 2: full hill climbing on top N combos
      bestDamage = -Infinity;
      bestCombo = topN[0].combo;

      for (let i = 0; i < topN.length; i++) {
        const { combo } = topN[i];
        const buildWithMain = applyMainStats(build, combo);
        const { bestAllocation: alloc, bestDamage: dmg } = SearchSpaceExplorer.hillClimb(
          totalRolls, relevantTypes,
          (allocation) => {
            const fullAlloc = [...allocation, ...anchoredAllocations];
            const vb = buildWithAllocation(buildWithMain, fullAlloc);
            return evaluateDamage(vb, StatCalculator.compute(vb));
          },
          freeAllocations,
          (p) => onProgress?.(0.3 + (i + p) / topN.length * 0.7),
        );
        if (dmg > bestDamage) { bestDamage = dmg; bestAllocation = alloc; bestCombo = combo; }
      }
    } else {
      // Single combo: hill climbing with current main stats
      const { bestAllocation: alloc, bestDamage: dmg } = SearchSpaceExplorer.hillClimb(
        totalRolls, relevantTypes,
        (allocation) => {
          const fullAlloc = [...allocation, ...anchoredAllocations];
          const vb = buildWithAllocation(build, fullAlloc);
          return evaluateDamage(vb, StatCalculator.compute(vb));
        },
        freeAllocations,
        onProgress,
      );
      bestDamage = dmg;
      bestAllocation = alloc;
    }

    const mergedAllocations = [...bestAllocation, ...anchoredAllocations];
    const finalBuild = buildWithAllocation(applyMainStats(build, bestCombo), mergedAllocations);
    const optimizedStats = StatCalculator.compute(finalBuild);
    const optimizedDamage = evaluateDamage(finalBuild, optimizedStats);
    const optimizedBreakdown = evaluateDamageWithBreakdown(finalBuild, optimizedStats);

    const improvementPercent = currentDamage > 0
      ? (optimizedDamage - currentDamage) / currentDamage : 0;

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
      mainStatCombo: bestCombo,
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
