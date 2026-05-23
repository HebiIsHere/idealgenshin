import type {
  IdealRequest,
  IdealResult,
  SubstatAllocation,
  CharacterBuild,
  ComputedStats,
  DamageContext,
  DamageResult,
} from '../types';
import { ArtifactSlotType, SubstatType } from '../types';
import { StatCalculator } from '../engine/stats';
import { DamageFormula } from '../engine/formula';
import { SearchSpaceExplorer } from './search';
import {
  SUBSTAT_MID_VALUES,
  MAIN_STAT_MAX_VALUES,
  MAIN_STAT_BY_SLOT,
  DEFAULT_ENEMY_LEVEL,
  DEFAULT_ENEMY_RESISTANCE,
  ELEMENT_DMG_BONUS_STAT,
  MAX_TOTAL_ROLLS,
} from '../data/constants';
import { mergeExtraBonuses } from '../utils/mergeExtraBonuses';

/** 主词条组合结果。 */
interface MainStatCombo {
  sands: SubstatType;
  goblet: SubstatType;
  circlet: SubstatType;
}

/**
 * IdealTemplateOptimizer — 生成理论最优圣遗物方案。
 *
 * 支持两种模式：
 * 1. 基础模式（searchMainStats=false）：固定主词条，仅搜索副词条分配
 * 2. 主词条搜索模式（searchMainStats=true）：枚举 420 种主词条组合，每种内部搜索副词条
 *
 * 当 req.build 存在时，使用当前角色配置（武器/命座/套装/队伍 buff），
 * 否则回退到默认参考构建。
 */
export class IdealTemplateOptimizer {
  static generate(
    req: IdealRequest,
    onProgress?: (progress: number) => void,
  ): IdealResult {
    const { character, totalRolls, skillMultiplier, reactionType, amplifyingMultiplier, baseDmgMultiplier, build, searchMainStats } = req;

    if (totalRolls <= 0) {
      return { theoreticalDamage: 0, idealAllocations: [], _debug: { artifacts: 0, weapon: 'n/a', totalAtk: 0, skillMultiplier: 0, reactionType: 'n/a', firstDamage: 0 } };
    }

    const relevantTypes = character.relevantSubstats;

    // 词条数不能超过可分配上限（理论最大 45 条，5 个圣遗物各 9 个词条槽）
    const effectiveRolls = Math.min(totalRolls, MAX_TOTAL_ROLLS);

    // 使用传入的 build 或创建默认参考构建
    const baseBuild = build ?? createDefaultBuild(character, skillMultiplier, reactionType, amplifyingMultiplier, baseDmgMultiplier);

    // 确保 build 至少有 5 个圣遗物位置（无导入时补默认主词条）
    const refBuild = ensureArtifacts(baseBuild, character);

    if (!searchMainStats) {
      // 基础模式：固定主词条
      const result = runSingleSearch(refBuild, effectiveRolls, relevantTypes, onProgress);
      result.mainStatCombo = getCurrentMainStats(refBuild);
      return result;
    }

    // 主词条搜索模式：枚举所有合法组合
    const elementDmgStat = ELEMENT_DMG_BONUS_STAT[character.element];
    const combos = enumerateMainStatCombos(elementDmgStat);

    let globalBestAllocation: SubstatAllocation[] = [];
    let globalBestDamage = -Infinity;
    let globalBestCombo: MainStatCombo = combos[0];
    let globalBestBreakdown: DamageResult | undefined;
    const totalCombos = combos.length;

    for (let i = 0; i < totalCombos; i++) {
      const combo = combos[i];
      const buildWithMain = applyMainStats(refBuild, combo);

      // 均匀分配作为爬山初始值
      const initialGuess = relevantTypes.map((type) => ({
        type,
        rolls: effectiveRolls / relevantTypes.length,
      }));

      const { bestAllocation, bestDamage } = SearchSpaceExplorer.hillClimb(
        effectiveRolls,
        relevantTypes,
        (allocation: SubstatAllocation[]): number => {
          const virtualBuild = applyAllocation(buildWithMain, allocation);
          const virtualStats = StatCalculator.compute(virtualBuild);
          return evaluateDamage(virtualBuild, virtualStats);
        },
        initialGuess,
        (subProgress) => onProgress?.((i + subProgress) / totalCombos),
      );

      if (bestDamage > globalBestDamage) {
        globalBestDamage = bestDamage;
        globalBestAllocation = bestAllocation;
        globalBestCombo = combo;
      }

      onProgress?.((i + 1) / totalCombos);
    }

    const finalBuild = applyAllocation(applyMainStats(refBuild, globalBestCombo), globalBestAllocation);
    const finalStats = StatCalculator.compute(finalBuild);
    globalBestBreakdown = evaluateDamageWithBreakdown(finalBuild, finalStats);

    return {
      theoreticalDamage: globalBestDamage,
      idealAllocations: globalBestAllocation,
      breakdown: globalBestBreakdown,
      mainStatCombo: globalBestCombo,
      _debug: {
        artifacts: refBuild.artifacts?.length ?? 0,
        weapon: refBuild.weaponConfig?.weaponData?.nameZh || 'unknown',
        totalAtk: finalStats.totalAtk,
        skillMultiplier: refBuild.skillMultiplier,
        reactionType: refBuild.reactionType,
        firstDamage: globalBestDamage,
      },
    };
  }
}

/** 基础模式：单次主词条搜索，使用 hill-climb（与重优化一致）。 */
function runSingleSearch(
  baseBuild: CharacterBuild,
  totalRolls: number,
  relevantTypes: SubstatType[],
  onProgress?: (progress: number) => void,
): IdealResult {
  // 均匀分配作为爬山初始值
  const initialGuess = relevantTypes.map((type) => ({
    type,
    rolls: totalRolls / relevantTypes.length,
  }));

  const { bestAllocation, bestDamage } = SearchSpaceExplorer.hillClimb(
    totalRolls,
    relevantTypes,
    (allocation: SubstatAllocation[]): number => {
      const virtualBuild = applyAllocation(baseBuild, allocation);
      const virtualStats = StatCalculator.compute(virtualBuild);
      return evaluateDamage(virtualBuild, virtualStats);
    },
    initialGuess,
    onProgress,
  );

  // round to 1 decimal for display consistency (hillClimb already does this)
  const roundedAllocation = bestAllocation.map((a) => ({
    ...a,
    rolls: Math.round(a.rolls * 10) / 10,
  }));

  const bestBuild = applyAllocation(baseBuild, roundedAllocation);
  const bestStats = StatCalculator.compute(bestBuild);
  const breakdown = evaluateDamageWithBreakdown(bestBuild, bestStats);

  return {
    theoreticalDamage: bestDamage,
    idealAllocations: roundedAllocation,
    breakdown,
    _debug: {
      artifacts: baseBuild.artifacts?.length ?? 0,
      weapon: baseBuild.weaponConfig?.weaponData?.nameZh || 'unknown',
      totalAtk: bestStats.totalAtk,
      skillMultiplier: baseBuild.skillMultiplier,
      reactionType: baseBuild.reactionType,
      firstDamage: bestDamage,
    },
  };
}

/** 确保 build 有 5 个圣遗物位置（缺失的补默认主词条）。 */
function ensureArtifacts(build: CharacterBuild, character: CharacterBuild['character']): CharacterBuild {
  const existing = [...(build.artifacts ?? [])];
  const sandsOptions = MAIN_STAT_BY_SLOT['SANDS'];
  const gobletOptions = MAIN_STAT_BY_SLOT['GOBLET'];
  const circletOptions = MAIN_STAT_BY_SLOT['CIRCLET'];
  const elementDmgStat = ELEMENT_DMG_BONUS_STAT[character.element];

  const defaults: Record<string, { slot: ArtifactSlotType; type: SubstatType; value: number }> = {
    [ArtifactSlotType.FLOWER]: { slot: ArtifactSlotType.FLOWER, type: SubstatType.HP_FLAT, value: MAIN_STAT_MAX_VALUES[SubstatType.HP_FLAT] },
    [ArtifactSlotType.FEATHER]: { slot: ArtifactSlotType.FEATHER, type: SubstatType.ATK_FLAT, value: MAIN_STAT_MAX_VALUES[SubstatType.ATK_FLAT] },
    [ArtifactSlotType.SANDS]: { slot: ArtifactSlotType.SANDS, type: sandsOptions[0], value: MAIN_STAT_MAX_VALUES[sandsOptions[0]] ?? 0 },
    [ArtifactSlotType.GOBLET]: { slot: ArtifactSlotType.GOBLET, type: elementDmgStat ?? gobletOptions[0], value: MAIN_STAT_MAX_VALUES[elementDmgStat ?? gobletOptions[0]] ?? 0 },
    [ArtifactSlotType.CIRCLET]: { slot: ArtifactSlotType.CIRCLET, type: circletOptions[0], value: MAIN_STAT_MAX_VALUES[circletOptions[0]] ?? 0 },
  };

  for (const slot of Object.values(ArtifactSlotType)) {
    if (!existing.some(a => a.slot === slot)) {
      const d = defaults[slot];
      existing.push({ id: `ideal_${slot.toLowerCase()}`, slot: d.slot, mainStatType: d.type, mainStatValue: d.value, subStats: [], setName: 'ideal' });
    }
  }

  return { ...build, artifacts: existing };
}

/** 通用杯子主词条（非元素伤害）。 */
const UNIVERSAL_GOBLET_TYPES: SubstatType[] = [
  SubstatType.ATK_PERCENT,
  SubstatType.HP_PERCENT,
  SubstatType.DEF_PERCENT,
  SubstatType.ELEMENTAL_MASTERY,
];

/** 枚举所有合法主词条组合。
 *  杯子规则：排除物理伤害；元素伤害只保留与角色匹配的一种。 */
function enumerateMainStatCombos(elementDmgStat: SubstatType | undefined): MainStatCombo[] {
  const sandsOptions = MAIN_STAT_BY_SLOT['SANDS'];
  const gobletOptions = MAIN_STAT_BY_SLOT['GOBLET'];
  const circletOptions = MAIN_STAT_BY_SLOT['CIRCLET'];

  // 过滤杯子选项：通用 + 匹配的元素伤害（排除物理）
  const filteredGoblet = gobletOptions.filter(
    (t) =>
      UNIVERSAL_GOBLET_TYPES.includes(t) ||
      (elementDmgStat !== undefined && t === elementDmgStat),
  );

  const combos: MainStatCombo[] = [];
  for (const sands of sandsOptions) {
    for (const goblet of filteredGoblet) {
      for (const circlet of circletOptions) {
        combos.push({ sands, goblet, circlet });
      }
    }
  }
  return combos;
}

/** 将主词条组合应用到 build 的圣遗物上。 */
function applyMainStats(build: CharacterBuild, combo: MainStatCombo): CharacterBuild {
  const newArtifacts = build.artifacts.map((a) => {
    switch (a.slot) {
      case ArtifactSlotType.SANDS:
        return { ...a, mainStatType: combo.sands, mainStatValue: MAIN_STAT_MAX_VALUES[combo.sands] ?? 0 };
      case ArtifactSlotType.GOBLET:
        return { ...a, mainStatType: combo.goblet, mainStatValue: MAIN_STAT_MAX_VALUES[combo.goblet] ?? 0 };
      case ArtifactSlotType.CIRCLET:
        return { ...a, mainStatType: combo.circlet, mainStatValue: MAIN_STAT_MAX_VALUES[combo.circlet] ?? 0 };
      default:
        return a;
    }
  });
  return { ...build, artifacts: newArtifacts };
}

/** 将副词条分配应用到 build。 */
function applyAllocation(build: CharacterBuild, allocation: SubstatAllocation[]): CharacterBuild {
  const subStats = allocation
    .filter((a) => a.rolls > 0)
    .map((a) => ({ type: a.type, value: a.rolls * ((SUBSTAT_MID_VALUES as any)[a.type] ?? 0) }));

  const newArtifacts = build.artifacts.map((a, idx) =>
    idx === 0 ? { ...a, subStats } : { ...a, subStats: [] },
  );
  return { ...build, artifacts: newArtifacts };
}

/** 创建默认参考 build（无 build 传入时使用）。 */
function createDefaultBuild(
  character: IdealRequest['character'],
  skillMultiplier: number,
  reactionType: any,
  amplifyingMultiplier?: number,
  baseDmgMultiplier?: number,
): CharacterBuild {
  const sandsOptions = MAIN_STAT_BY_SLOT['SANDS'];
  const gobletOptions = MAIN_STAT_BY_SLOT['GOBLET'];
  const circletOptions = MAIN_STAT_BY_SLOT['CIRCLET'];
  const elementDmgStat = ELEMENT_DMG_BONUS_STAT[character.element];

  const artifacts = [
    { id: 'ideal_flower', slot: ArtifactSlotType.FLOWER, mainStatType: SubstatType.HP_FLAT, mainStatValue: MAIN_STAT_MAX_VALUES[SubstatType.HP_FLAT], subStats: [], setName: 'ideal' },
    { id: 'ideal_feather', slot: ArtifactSlotType.FEATHER, mainStatType: SubstatType.ATK_FLAT, mainStatValue: MAIN_STAT_MAX_VALUES[SubstatType.ATK_FLAT], subStats: [], setName: 'ideal' },
    { id: 'ideal_sands', slot: ArtifactSlotType.SANDS, mainStatType: sandsOptions[0], mainStatValue: MAIN_STAT_MAX_VALUES[sandsOptions[0]] ?? 0, subStats: [], setName: 'ideal' },
    { id: 'ideal_goblet', slot: ArtifactSlotType.GOBLET, mainStatType: elementDmgStat ?? gobletOptions[0], mainStatValue: MAIN_STAT_MAX_VALUES[elementDmgStat ?? gobletOptions[0]] ?? 0, subStats: [], setName: 'ideal' },
    { id: 'ideal_circlet', slot: ArtifactSlotType.CIRCLET, mainStatType: circletOptions[0], mainStatValue: MAIN_STAT_MAX_VALUES[circletOptions[0]] ?? 0, subStats: [], setName: 'ideal' },
  ];

  return {
    character,
    weaponConfig: { weaponData: { id: '', name: '', nameZh: '', rarity: 1, weaponType: 'SWORD' as any, baseAtk: 23, substatType: SubstatType.ATK_PERCENT, substatValue: 0, passiveName: '', passiveDesc: '' }, weaponLevel: 90, refinement: 1, passiveBonus: {} },
    artifacts,
    characterLevel: 90,
    skillMultiplier,
    reactionType,
    teamBuffs: [],
    statScaling: character.defaultStatScaling,
    constellationConfig: { level: 0, bonus: {} },
    talentConfig: { bonus: {} },
    setBonus: {},
    amplifyingMultiplier,
    baseDmgMultiplier,
  };
}

/** 评估伤害。 */
function evaluateDamage(build: CharacterBuild, stats: ComputedStats): number {
  const extraBonuses = mergeExtraBonuses(build);
  const ctx: DamageContext = {
    stats,
    skillMultiplier: build.skillMultiplier,
    statScaling: build.statScaling ?? build.character.defaultStatScaling,
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
    independentBonus: extraBonuses.independentBonus ?? 0,
  };
  const dmg = DamageFormula.calculate(ctx).totalDamage;
  return isFinite(dmg) ? dmg : 0;
}

/** 评估伤害（含完整 breakdown）。 */
function evaluateDamageWithBreakdown(build: CharacterBuild, stats: ComputedStats): DamageResult {
  const extraBonuses = mergeExtraBonuses(build);
  return DamageFormula.calculate({
    stats,
    skillMultiplier: build.skillMultiplier,
    statScaling: build.statScaling ?? build.character.defaultStatScaling,
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
    independentBonus: extraBonuses.independentBonus ?? 0,
  });
}

/** 从 build 中提取当前沙/杯/头的主词条类型。 */
function getCurrentMainStats(build: CharacterBuild): { sands: SubstatType; goblet: SubstatType; circlet: SubstatType } {
  const artifacts = build.artifacts ?? [];
  const sands = artifacts.find((a) => a.slot === ArtifactSlotType.SANDS);
  const goblet = artifacts.find((a) => a.slot === ArtifactSlotType.GOBLET);
  const circlet = artifacts.find((a) => a.slot === ArtifactSlotType.CIRCLET);
  return {
    sands: sands?.mainStatType ?? SubstatType.ATK_PERCENT,
    goblet: goblet?.mainStatType ?? SubstatType.ATK_PERCENT,
    circlet: circlet?.mainStatType ?? SubstatType.CRIT_RATE,
  };
}
