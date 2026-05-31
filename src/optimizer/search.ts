import type {
  SubstatType,
  SubstatAllocation,
} from '../types';
import { SUBSTAT_MID_VALUES, MAX_ROLLS_PER_SUBSTAT } from '../data/constants';

/**
 * Callback type for enumerateAndEvaluate.
 * Called once per complete allocation with the allocation and its index.
 * Returns the damage value for the allocation, or null to skip.
 */
export type AllocationCallback = (
  allocation: SubstatAllocation[],
  index: number,
) => number | null;

/**
 * Progress callback type for enumerateAndEvaluate.
 * Called periodically with progress (0-1).
 */
export type ProgressCallback = (progress: number) => void;

/**
 * SearchSpaceExplorer — enumerates all legal distributions of N rolls
 * across K sub-stat types, with pruning strategies to reduce search space.
 */
export class SearchSpaceExplorer {
  /**
   * Enumerate all distributions and evaluate each one via callback.
   * Uses inline pruning during recursion to skip branches that cannot
   * beat the current best damage, avoiding full materialization of
   * all distributions.
   *
   * Pruning strategy:
   * We track the "stat value sum" of the best allocation found so far.
   * Since damage is monotonically increasing with stat values for relevant
   * stats, if a partial allocation's maximum possible stat value sum
   * cannot beat the best allocation's stat value sum, it cannot produce
   * higher damage either — so we prune that branch.
   *
   * @param total - Total number of rolls to distribute
   * @param types - Array of SubstatType to distribute across
   * @param evaluateDamage - Callback that receives a complete allocation and returns its damage.
   *                         Called immediately at each leaf node — no intermediate array storage.
   * @param onProgress - Optional progress callback (0-1)
   * @param maxPerType - Maximum rolls per type (default: 6)
   * @returns The best allocation found and its damage
   */
  static enumerateAndEvaluate(
    total: number,
    types: SubstatType[],
    evaluateDamage: AllocationCallback,
    onProgress?: ProgressCallback,
    maxPerType: number = MAX_ROLLS_PER_SUBSTAT,
  ): { bestAllocation: SubstatAllocation[]; bestDamage: number } {
    if (types.length === 0 || total === 0) {
      // Edge case: no types or no rolls — evaluate the empty allocation
      const damage = evaluateDamage([], 0);
      return { bestAllocation: [], bestDamage: damage ?? 0 };
    }

    // Pre-compute the maximum mid-value among the relevant types for pruning
    let maxMidValue = 0;
    for (const t of types) {
      const v = SUBSTAT_MID_VALUES[t] ?? 0;
      if (v > maxMidValue) {
        maxMidValue = v;
      }
    }

    // Mutable state shared across recursion for pruning and progress tracking
    const state: EnumerationState = {
      bestDamage: -Infinity,
      bestAllocation: [] as SubstatAllocation[],
      bestStatValueSum: -Infinity,
      visitedCount: 0,
      // Estimate total nodes for progress reporting
      totalEstimate: estimateNodeCount(total, types.length, maxPerType),
      onProgress: onProgress ?? null,
      lastProgressUpdate: 0,
    };

    const current: SubstatAllocation[] = new Array(types.length);

    SearchSpaceExplorer.enumerateWithPruningRecursive(
      total,
      types,
      0,
      maxPerType,
      current,
      evaluateDamage,
      state,
      maxMidValue,
    );

    // Final progress update
    if (state.onProgress) {
      state.onProgress(1);
    }

    // Guard: if no allocation was valid, return 0 instead of -Infinity
    if (!isFinite(state.bestDamage) || state.bestDamage === -Infinity) {
      state.bestDamage = 0;
      state.bestAllocation = types.map((t) => ({ type: t, rolls: 0 }));
    }

    return { bestAllocation: state.bestAllocation, bestDamage: state.bestDamage };
  }

  /**
   * Recursive enumeration with inline pruning.
   *
   * Pruning heuristic:
   * For a partial allocation (types 0..index-1 assigned, types index..N-1 unassigned),
   * the maximum possible stat value sum is:
   *   current_stat_value + remaining_rolls × max_mid_value
   *
   * If this upper bound is <= the stat value sum of the best allocation found so far,
   * the branch cannot produce a better allocation and is pruned.
   *
   * This is safe because damage is a monotonically increasing function of
   * the stat values of relevant sub-stats (more rolls in relevant stats
   * always yields equal or higher damage).
   */
  private static enumerateWithPruningRecursive(
    remaining: number,
    types: SubstatType[],
    index: number,
    maxPerType: number,
    current: SubstatAllocation[],
    evaluateDamage: AllocationCallback,
    state: EnumerationState,
    maxMidValue: number,
  ): void {
    // Base case: all types processed
    if (index === types.length) {
      if (remaining === 0) {
        // Complete allocation — evaluate it
        const allocation = current.slice(0, index);
        const damage = evaluateDamage(allocation, state.visitedCount);
        if (damage !== null && damage > state.bestDamage) {
          state.bestDamage = damage;
          state.bestAllocation = allocation.map(a => ({ ...a }));
          // Update stat-value sum for pruning
          state.bestStatValueSum = computeStatValueSum(allocation);
        }
        state.visitedCount++;

        // Progress reporting (throttled)
        if (state.onProgress && state.visitedCount - state.lastProgressUpdate >= 500) {
          const progress = Math.min(state.visitedCount / state.totalEstimate, 0.99);
          state.onProgress(progress);
          state.lastProgressUpdate = state.visitedCount;
        }
      }
      return;
    }

    // If this is the last type, all remaining rolls go here
    if (index === types.length - 1) {
      if (remaining <= maxPerType) {
        current[index] = { type: types[index], rolls: remaining };
        const allocation = current.slice(0, index + 1);
        const damage = evaluateDamage(allocation, state.visitedCount);
        if (damage !== null && damage > state.bestDamage) {
          state.bestDamage = damage;
          state.bestAllocation = allocation.map(a => ({ ...a }));
          state.bestStatValueSum = computeStatValueSum(allocation);
        }
        state.visitedCount++;

        // Progress reporting (throttled)
        if (state.onProgress && state.visitedCount - state.lastProgressUpdate >= 500) {
          const progress = Math.min(state.visitedCount / state.totalEstimate, 0.99);
          state.onProgress(progress);
          state.lastProgressUpdate = state.visitedCount;
        }
      }
      return;
    }

    // --- Pruning: compute upper bound for the partial allocation ---
    // Current allocated value (from types 0..index-1 that are already set)
    let currentValue = 0;
    for (let i = 0; i < index; i++) {
      currentValue += current[i].rolls * (SUBSTAT_MID_VALUES[current[i].type] ?? 0);
    }
    // Upper bound: current value + remaining rolls × most valuable stat mid-value
    const upperBound = currentValue + remaining * maxMidValue;

    if (state.bestStatValueSum > -Infinity && upperBound <= state.bestStatValueSum) {
      // This branch's max possible stat value sum cannot beat the best allocation's
      // stat value sum. Since damage is monotonically increasing with stat values,
      // this branch cannot produce higher damage either — prune it.
      return;
    }

    // Try assigning 0 to min(remaining, maxPerType) rolls to current type
    const maxForThis = Math.min(remaining, maxPerType);
    for (let rolls = 0; rolls <= maxForThis; rolls++) {
      current[index] = { type: types[index], rolls };
      SearchSpaceExplorer.enumerateWithPruningRecursive(
        remaining - rolls,
        types,
        index + 1,
        maxPerType,
        current,
        evaluateDamage,
        state,
        maxMidValue,
      );
    }
  }

  /**
   * Optimize sub-stat allocation by hill-climbing from an initial guess.
   * For convex damage functions (diminishing returns), local optimum = global optimum.
   * Much faster than full enumeration for large roll counts.
   *
   * @param total - Total number of rolls (may be fractional)
   * @param types - Relevant sub-stat types
   * @param evaluateDamage - Function returning damage for a given allocation
   * @param initialGuess - Starting allocation (even distribution by default)
   * @param onProgress - Optional progress callback
   * @param stepSize - Roll movement granularity (default 0.1)
   * @returns Best allocation and its damage
   */
  static hillClimb(
    total: number,
    types: SubstatType[],
    evaluateDamage: (allocation: SubstatAllocation[]) => number,
    initialGuess?: SubstatAllocation[],
    onProgress?: (progress: number) => void,
    stepSize: number = 0.1,
  ): { bestAllocation: SubstatAllocation[]; bestDamage: number } {
    if (types.length === 0 || total <= 0) {
      const alloc: SubstatAllocation[] = [];
      const damage = evaluateDamage(alloc);
      return { bestAllocation: alloc, bestDamage: damage };
    }

    // Initial allocation: use guess if provided, otherwise evenly spread (preserve decimal total)
    let bestAllocation: SubstatAllocation[];
    if (initialGuess && initialGuess.length === types.length) {
      bestAllocation = initialGuess.map(g => ({ ...g }));
    } else {
      const base = total / types.length;
      bestAllocation = types.map((type) => ({ type, rolls: base }));
    }

    let bestDamage = evaluateDamage(bestAllocation);
    if (!isFinite(bestDamage)) bestDamage = 0;

    // Hill-climb: try moving stepSize rolls at a time, accept if damage improves
    const typeCount = types.length;
    let improved = true;
    let iteration = 0;
    const maxIterations = Math.ceil(total / stepSize) * typeCount * 2; // safety limit

    while (improved && iteration < maxIterations) {
      improved = false;
      iteration++;

      for (let fromIdx = 0; fromIdx < typeCount; fromIdx++) {
        if (bestAllocation[fromIdx].rolls < stepSize / 2) continue;

        for (let toIdx = 0; toIdx < typeCount; toIdx++) {
          if (fromIdx === toIdx) continue;

          // Try moving stepSize rolls from fromIdx to toIdx
          const moveAmount = Math.min(stepSize, bestAllocation[fromIdx].rolls);
          bestAllocation[fromIdx].rolls -= moveAmount;
          bestAllocation[toIdx].rolls += moveAmount;

          const newDamage = evaluateDamage(bestAllocation);
          if (isFinite(newDamage) && newDamage > bestDamage) {
            bestDamage = newDamage;
            improved = true;
          } else {
            // Revert
            bestAllocation[fromIdx].rolls += moveAmount;
            bestAllocation[toIdx].rolls -= moveAmount;
          }
        }
      }

      if (onProgress) {
        onProgress(Math.min(iteration / maxIterations, 0.99));
      }
    }

    if (onProgress) onProgress(1);

    // Round to 1 decimal to avoid floating-point drift from stepSize
    bestAllocation = bestAllocation.map(a => ({
      ...a,
      rolls: Math.round(a.rolls * 10) / 10,
    }));

    return { bestAllocation, bestDamage };
  }
  /**
   * Enumerate all distributions of `total` rolls across the given sub-stat types.
   * Uses recursive enumeration with lexicographic ordering.
   *
   * @deprecated Use enumerateAndEvaluate() instead for better performance.
   *             This method materializes all allocations into memory before
   *             evaluation, which is wasteful for large search spaces.
   *
   * @param total - Total number of rolls to distribute
   * @param types - Array of SubstatType to distribute across
   * @param maxPerType - Maximum rolls per type (default: 6)
   * @returns Array of allocation arrays (each is one valid distribution)
   */
  static enumerate(
    total: number,
    types: SubstatType[],
    maxPerType: number = MAX_ROLLS_PER_SUBSTAT,
  ): SubstatAllocation[][] {
    if (types.length === 0 || total === 0) {
      return [[]];
    }

    const results: SubstatAllocation[][] = [];

    SearchSpaceExplorer.enumerateRecursive(
      total,
      types,
      0,
      maxPerType,
      [],
      results,
    );

    return results;
  }

  /**
   * Recursive enumeration helper.
   * Distributes remaining rolls starting from the type at `index`.
   */
  private static enumerateRecursive(
    remaining: number,
    types: SubstatType[],
    index: number,
    maxPerType: number,
    current: SubstatAllocation[],
    results: SubstatAllocation[][],
  ): void {
    // Base case: all types processed
    if (index === types.length) {
      if (remaining === 0) {
        results.push([...current]);
      }
      return;
    }

    // If this is the last type, all remaining rolls go here
    if (index === types.length - 1) {
      if (remaining <= maxPerType) {
        results.push([
          ...current,
          { type: types[index], rolls: remaining },
        ]);
      }
      return;
    }

    // Try assigning 0 to min(remaining, maxPerType) rolls to current type
    const maxForThis = Math.min(remaining, maxPerType);
    for (let rolls = 0; rolls <= maxForThis; rolls++) {
      current.push({ type: types[index], rolls });
      SearchSpaceExplorer.enumerateRecursive(
        remaining - rolls,
        types,
        index + 1,
        maxPerType,
        current,
        results,
      );
      current.pop();
    }
  }

  /**
   * Prune branches that cannot beat the current best damage.
   * Uses a simple upper bound estimate: assume all remaining rolls
   * go to the most impactful stat (highest marginal damage per roll).
   *
   * @param branches - Array of partial allocations to evaluate
   * @param bestDamage - Current best damage found
   * @param _evaluateDamage - Function to evaluate damage for a partial allocation
   * @returns Filtered branches that have potential to beat bestDamage
   */
  static prune(
    branches: SubstatAllocation[][],
    bestDamage: number,
    _evaluateDamage: (alloc: SubstatAllocation[]) => number,
  ): SubstatAllocation[][] {
    return branches.filter((branch) => {
      const upperBound = SearchSpaceExplorer.estimateUpperBound(branch);
      return upperBound >= bestDamage;
    });
  }

  /**
   * Estimate an upper bound for damage given a partial allocation.
   * For P0, we use a simple heuristic: sum the mid-values weighted
   * by rolls, assuming optimal distribution.
   */
  static estimateUpperBound(allocation: SubstatAllocation[]): number {
    let totalValue = 0;
    for (const alloc of allocation) {
      totalValue += alloc.rolls * (SUBSTAT_MID_VALUES[alloc.type] ?? 0);
    }
    return totalValue;
  }

  /**
   * Get the most impactful sub-stat type based on mid-value per roll.
   * Used for greedy upper bound estimation.
   */
  /**
   * Quick evaluation: even distribution, single evaluation, no hill climbing.
   * Used as a fast scoring pass for main stat enumeration.
   */
  static quickEvaluate(
    total: number,
    types: SubstatType[],
    evaluateDamage: (allocation: SubstatAllocation[]) => number,
  ): { allocation: SubstatAllocation[]; damage: number } {
    if (types.length === 0 || total <= 0) {
      const dmg = evaluateDamage([]);
      return { allocation: [], damage: isFinite(dmg) ? dmg : 0 };
    }
    const base = total / types.length;
    const allocation = types.map((type) => ({ type, rolls: base }));
    const damage = evaluateDamage(allocation);
    return { allocation, damage: isFinite(damage) ? damage : 0 };
  }

  static getMostImpactfulType(types: SubstatType[]): SubstatType | null {
    if (types.length === 0) return null;

    let bestType = types[0];
    let bestValue = SUBSTAT_MID_VALUES[types[0]] ?? 0;

    for (let i = 1; i < types.length; i++) {
      const val = SUBSTAT_MID_VALUES[types[i]] ?? 0;
      if (val > bestValue) {
        bestValue = val;
        bestType = types[i];
      }
    }

    return bestType;
  }
}

/**
 * Compute the stat value sum for an allocation.
 * This is the sum of rolls × mid-value for each type.
 */
function computeStatValueSum(allocation: SubstatAllocation[]): number {
  let total = 0;
  for (const alloc of allocation) {
    total += alloc.rolls * (SUBSTAT_MID_VALUES[alloc.type] ?? 0);
  }
  return total;
}

/**
 * Internal state for the pruned enumeration.
 */
interface EnumerationState {
  /** Best damage found so far. */
  bestDamage: number;
  /** Best allocation found so far. */
  bestAllocation: SubstatAllocation[];
  /** Best stat-value sum found so far (used for pruning). */
  bestStatValueSum: number;
  /** Number of complete allocations evaluated. */
  visitedCount: number;
  /** Estimated total number of leaf nodes for progress reporting. */
  totalEstimate: number;
  /** Optional progress callback. */
  onProgress: ProgressCallback | null;
  /** Last visited count when progress was reported (for throttling). */
  lastProgressUpdate: number;
}

/**
 * Estimate the number of leaf nodes in the search tree.
 * This is the number of ways to distribute `total` rolls across `numTypes`
 * types with at most `maxPerType` per type.
 *
 * Uses a simple combinatorial estimate for progress reporting.
 * Does not need to be exact — only used for progress bar.
 */
function estimateNodeCount(total: number, numTypes: number, maxPerType: number): number {
  // Use the stars-and-bars with upper bound formula as a rough estimate.
  // For small search spaces, compute exactly; for large ones, use an upper bound.
  if (numTypes <= 1) return 1;
  if (numTypes === 2) {
    // Exact for 2 types: min(total, maxPerType) - max(0, total - maxPerType) + 1
    return Math.min(total, maxPerType) - Math.max(0, total - maxPerType) + 1;
  }
  // For 3+ types, use a rough multiplicative upper bound
  // This overestimates, but that's fine for progress reporting
  const maxPerDimension = Math.min(total, maxPerType) + 1;
  return Math.pow(maxPerDimension, numTypes - 1);
}
