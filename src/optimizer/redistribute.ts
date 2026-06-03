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
import { filterEffectiveTypes } from './substatFilter';

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

    // 过滤对伤害无效的词条类型（ER/EM 条件判断统一由 substatFilter 处理）
    const effectiveTypes = filterEffectiveTypes(relSet, build);
    relSet.clear();
    for (const t of effectiveTypes) { relSet.add(t as any); }

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
 * Distributes rolls across artifacts respecting per-artifact type constraints:
 * each artifact keeps exactly its 4 original types (no deletion, no addition),
 * each type gets 1-6 rolls per artifact.
 *
 * Ineffective types keep their original roll counts unchanged.
 * Effective types get rolls from the pooled allocation, distributed evenly
 * across artifacts that contain them.
 */
function buildWithAllocation(
  originalBuild: CharacterBuild,
  allocation: SubstatAllocation[],
): CharacterBuild {
  const allocMap = new Map<string, number>(allocation.map((a) => [a.type as string, a.rolls]));

  // Build per-artifact type info
  const artifactTypes: { idx: number; effective: string[]; locked: { type: string; rolls: number }[] }[] = [];

  for (let i = 0; i < originalBuild.artifacts.length; i++) {
    const art = originalBuild.artifacts[i];
    if (!art || art.subStats.length === 0) {
      artifactTypes.push({ idx: i, effective: [], locked: [] });
      continue;
    }
    const types = art.subStats.map((s) => s.type);
    const effective: string[] = [];
    const locked: { type: string; rolls: number }[] = [];
    for (const t of types) {
      if (allocMap.has(t)) {
        effective.push(t);
      } else {
        // Locked type: keep original rolls
        const origValue = art.subStats.find((s) => s.type === t)?.value ?? 0;
        const midVal = (SUBSTAT_MID_VALUES as any)[t] ?? 1;
        locked.push({ type: t, rolls: midVal > 0 ? origValue / midVal : 1 });
      }
    }
    artifactTypes.push({ idx: i, effective, locked });
  }

  // Distribute pooled allocation across artifacts
  const newArtifacts = originalBuild.artifacts.map((artifact, idx) => {
    const info = artifactTypes[idx];
    if (!info || (info.effective.length === 0 && info.locked.length === 0)) {
      return { ...artifact, subStats: [] };
    }

    const newSubStats: { type: any; value: number }[] = [];

    // Locked types: keep original rolls
    for (const lt of info.locked) {
      const mid = (SUBSTAT_MID_VALUES as any)[lt.type] ?? 1;
      newSubStats.push({ type: lt.type, value: lt.rolls * mid });
    }

    // Effective types: distribute allocation evenly among artifacts that have this type
    for (const t of info.effective) {
      const pooledRolls = allocMap.get(t) ?? 0;
      // Count how many artifacts have this effective type
      const artifactCount = artifactTypes.filter(
        (a) => a.effective.includes(t),
      ).length;
      const share = artifactCount > 0 ? pooledRolls / artifactCount : 0;
      // Clamp to artifact limits: min 1, max 6
      const clamped = Math.max(1, Math.min(6, share));
      const mid = (SUBSTAT_MID_VALUES as any)[t] ?? 1;
      newSubStats.push({ type: t, value: clamped * mid });
    }

    // Ensure exactly 4 types: pad with locked types if needed, or drop excess
    // (should never happen if input is valid)

    return {
      ...artifact,
      subStats: newSubStats,
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
