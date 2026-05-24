import type { CharacterBuild, ComputedStats, SubstatAllocation } from '../types';
import { SUBSTAT_MID_VALUES } from '../data/constants';
import { StatCalculator } from '../engine/stats';

/**
 * 根据优化的词条分配，构建虚拟 Build 并计算最终面板。
 * 将原 Build 的所有圣遗物副词条替换为分配值（使用中档值），然后重新计算属性。
 */
export function computeStatsFromAllocation(
  originalBuild: CharacterBuild,
  allocation: SubstatAllocation[],
): ComputedStats {
  const subStats = allocation
    .filter((a) => a.rolls > 0)
    .map((a) => ({
      type: a.type,
      value: a.rolls * ((SUBSTAT_MID_VALUES as Record<string, number>)[a.type] ?? 0),
    }));

  // 将所有副词条集中到第一个圣遗物，其余清空（总词条数一致）
  const newArtifacts = originalBuild.artifacts.map((artifact, idx) => {
    if (idx === 0) return { ...artifact, subStats };
    return { ...artifact, subStats: [] as typeof artifact.subStats };
  });

  const virtualBuild: CharacterBuild = { ...originalBuild, artifacts: newArtifacts };
  return StatCalculator.compute(virtualBuild);
}
