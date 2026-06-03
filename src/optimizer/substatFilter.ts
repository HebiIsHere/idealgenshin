/**
 * 副词条有效性判断 — 统一的单点真理，优化器和 UI 共用。
 *
 * 规则：
 * - 充能（ER）：仅在有 ER→X 转模（武器/圣遗物套装）或角色先天受益时才有效
 * - 精通（EM）：仅在非直伤反应、有 EM 倍率、或有 EM→X 转模时才有效
 * - 其他词条：信任角色数据中的 relevantSubstats
 */

import type { SubstatType } from '../types';
import type { CharacterBuild } from '../types';
import { SubstatType as ST } from '../types';

/** 先天受益于充能的角色 ID 列表（有 ER→伤害的被动天赋，不依赖圣遗物/武器）。 */
const INNATE_ER_CHARACTERS = new Set([
  'raiden_shogun',   // 雷电将军：ER→雷伤
  'mona',            // 莫娜：ER→水伤
]);

export interface EffectivenessContext {
  characterId: string;
  reactionType: string;
  statScaling: { emRatio?: number };
  allConversions: { from: string }[];
}

function buildCtx(build: CharacterBuild): EffectivenessContext {
  return {
    characterId: build.character?.id ?? '',
    reactionType: build.reactionType as string ?? 'NONE',
    statScaling: build.statScaling ?? build.character?.defaultStatScaling ?? { emRatio: 0 },
    allConversions: [
      ...(build.statConversions ?? []),
    ],
  };
}

/**
 * 判断某个副词条类型在当前 build 下是否对伤害有效。
 * 这是引擎中关于「有效词条」的唯一权威判断。
 */
export function isSubstatEffective(type: SubstatType | string, build: CharacterBuild): boolean {
  const ctx = buildCtx(build);

  if (type === ST.ENERGY_RECHARGE || type === 'ENERGY_RECHARGE') {
    return (
      INNATE_ER_CHARACTERS.has(ctx.characterId) ||
      ctx.allConversions.some((c: { from: string }) => c.from === 'er')
    );
  }

  if (type === ST.ELEMENTAL_MASTERY || type === 'ELEMENTAL_MASTERY') {
    if (ctx.reactionType === 'NONE') {
      return (
        (ctx.statScaling.emRatio ?? 0) > 0 ||
        ctx.allConversions.some((c: { from: string }) => c.from === 'em')
      );
    }
    return true; // 有反应时 EM 总是有效
  }

  // 其他类型：信任角色数据
  return true;
}

/** 便捷方法：传入类型字符串，返回是否需要过滤掉 */
export function filterEffectiveTypes(
  types: Iterable<SubstatType | string>,
  build: CharacterBuild,
): (SubstatType | string)[] {
  return Array.from(types).filter((t) => isSubstatEffective(t, build));
}
