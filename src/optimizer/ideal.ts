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
import { enumerateMainStatCombos, applyMainStats, getCurrentMainStats, type MainStatCombo } from './mainStatSearch';
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

/** Top-N combos from quick evaluation to run full hill climbing on. */
const TOP_N_COMBOS = 20;

/**
 * IdealTemplateOptimizer — 生成理论最优圣遗物方案。
 * 默认搜索主属性组合（420 种 × 快速评估取 Top20 × 爬山精算）。
 */
export class IdealTemplateOptimizer {
  static generate(
    req: IdealRequest,
    onProgress?: (progress: number) => void,
  ): IdealResult {
    const { character, totalRolls, skillMultiplier, reactionType, amplifyingMultiplier, baseDmgMultiplier, build, anchoredAllocations, enableMainStatSearch } = req;

    const anchoredRollSum = anchoredAllocations?.reduce((s, a) => s + a.rolls, 0) ?? 0;
    const remainingRolls = totalRolls - anchoredRollSum;
    const anchoredTypeSet = new Set((anchoredAllocations ?? []).map((a) => a.type));

    if (remainingRolls <= 0 && anchoredRollSum > 0) {
      const refBuild = (build ?? createDefaultBuild(character, skillMultiplier, reactionType, amplifyingMultiplier, baseDmgMultiplier));
      const finalBuild = applyAllocation(ensureArtifacts(refBuild, character), anchoredAllocations ?? []);
      const finalStats = StatCalculator.compute(finalBuild);
      const dmg = evaluateDamage(finalBuild, finalStats);
      return { theoreticalDamage: dmg, idealAllocations: anchoredAllocations ?? [], breakdown: evaluateDamageWithBreakdown(finalBuild, finalStats), idealStats: finalStats, mainStatCombo: getCurrentMainStats(finalBuild), _debug: { artifacts: refBuild.artifacts?.length ?? 0, weapon: refBuild.weaponConfig?.weaponData?.nameZh || 'unknown', totalAtk: finalStats.totalAtk, skillMultiplier: refBuild.skillMultiplier, reactionType: refBuild.reactionType, firstDamage: dmg } };
    }

    const relevantTypes = character.relevantSubstats.filter((t) => !anchoredTypeSet.has(t));
    const effectiveRolls = Math.min(remainingRolls, MAX_TOTAL_ROLLS);
    const baseBuild = build ?? createDefaultBuild(character, skillMultiplier, reactionType, amplifyingMultiplier, baseDmgMultiplier);
    const refBuild = ensureArtifacts(baseBuild, character);

    let globalBestAllocation: SubstatAllocation[] = [];
    let globalBestDamage = -Infinity;
    let globalBestCombo: MainStatCombo = getCurrentMainStats(refBuild);

    if (enableMainStatSearch) {
      // Phase 1: enumerate main stat combos, quick evaluate with uniform allocation
      const elementDmgStat = ELEMENT_DMG_BONUS_STAT[character.element];
      const allCombos = enumerateMainStatCombos(elementDmgStat);
      const scored: { combo: MainStatCombo; damage: number }[] = [];

      for (let i = 0; i < allCombos.length; i++) {
        const combo = allCombos[i];
        const b = applyMainStats(refBuild, combo);
        const { damage } = SearchSpaceExplorer.quickEvaluate(
          effectiveRolls, relevantTypes,
          (alloc) => evaluateDamage(b, StatCalculator.compute(applyAllocation(b, alloc))),
        );
        scored.push({ combo, damage });
        if (onProgress) onProgress((i / allCombos.length) * 0.3);
      }

      scored.sort((a, b) => b.damage - a.damage);
      const topN = scored.slice(0, TOP_N_COMBOS);

      // Phase 2: full hill climbing on top N
      globalBestCombo = topN[0].combo;

      for (let i = 0; i < topN.length; i++) {
        const { combo } = topN[i];
        const buildWithMain = applyMainStats(refBuild, combo);
        const initialGuess = relevantTypes.map((t) => ({ type: t, rolls: effectiveRolls / relevantTypes.length }));

        const { bestAllocation, bestDamage } = SearchSpaceExplorer.hillClimb(
          effectiveRolls, relevantTypes,
          (alloc) => {
            const vb = applyAllocation(buildWithMain, alloc);
            return evaluateDamage(vb, StatCalculator.compute(vb));
          },
          initialGuess,
          (p) => onProgress?.(0.3 + (i + p) / topN.length * 0.7),
        );

        if (bestDamage > globalBestDamage) {
          globalBestDamage = bestDamage;
          globalBestAllocation = bestAllocation;
          globalBestCombo = combo;
        }
      }
    } else {
      // Single combo: hill climbing with current main stats
      const initialGuess = relevantTypes.map((t) => ({ type: t, rolls: effectiveRolls / relevantTypes.length }));
      const { bestAllocation, bestDamage } = SearchSpaceExplorer.hillClimb(
        effectiveRolls, relevantTypes,
        (alloc) => {
          const vb = applyAllocation(refBuild, alloc);
          return evaluateDamage(vb, StatCalculator.compute(vb));
        },
        initialGuess,
        onProgress,
      );
      globalBestDamage = bestDamage;
      globalBestAllocation = bestAllocation;
    }

    const mergedAllocations = [...globalBestAllocation, ...(anchoredAllocations ?? [])];
    const finalBuild = applyAllocation(applyMainStats(refBuild, globalBestCombo), mergedAllocations);
    const finalStats = StatCalculator.compute(finalBuild);
    const breakdown = evaluateDamageWithBreakdown(finalBuild, finalStats);

    return {
      theoreticalDamage: globalBestDamage,
      idealAllocations: mergedAllocations,
      breakdown,
      idealStats: finalStats,
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
    independentBonus: 0,
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
    independentBonus: 0,
  });
}

