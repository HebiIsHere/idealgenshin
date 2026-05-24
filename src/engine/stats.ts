import type {
  CharacterBuild,
  ComputedStats,
  StatConversion,
  SubstatType,
  ZoneBonusInput,
} from '../types';
import { SubstatType as SubType } from '../types';
import { ELEMENT_DMG_BONUS_STAT } from '../data/constants';

/**
 * StatCalculator — 从 CharacterBuild 计算最终 ComputedStats。
 *
 * 属性叠加规则:
 * - Total = (Base) × (1 + sum_of_%_bonuses) + sum_of_flat_bonuses
 * - CRIT Rate, CRIT DMG, EM, ER 为纯加法: base + sum_of_all_sources
 * - Damage Bonus 为加法: sum_of_all_dmg_bonus_sources
 */
export class StatCalculator {
  /**
   * 从 CharacterBuild 计算最终属性。
   * @param build - 完整的角色构建配置
   * @returns 应用所有修饰后的 ComputedStats
   */
  static compute(build: CharacterBuild): ComputedStats {
    const { character, weaponConfig, artifacts, teamBuffs, constellationConfig, talentConfig, teamBuffBonuses, setBonus } = build;
    const base = character.baseStats;
    const weapon = weaponConfig.weaponData;

    // 百分比加成累加器（乘算叠加到基础值上）
    let hpPercentBonus = 0;
    let atkPercentBonus = 0;
    let defPercentBonus = 0;

    // 固定值加成累加器
    let hpFlatBonus = 0;
    let atkFlatBonus = 0;
    let defFlatBonus = 0;

    // 武器基础攻击力（需要与角色基础攻击合并后再乘 ATK%，不能算作固定值）
    let weaponBaseAtk = 0;

    // 加法属性累加器（直接叠加到基础值上）
    let critRateBonus = 0;
    let critDmgBonus = 0;
    let emBonus = 0;
    let erBonus = 0;

    // 伤害加成累加器
    let dmgBonus = 0;

    // 2. 突破属性
    const ascValues = character.ascensionStat.values;
    const ascValue = ascValues.length > 0 ? ascValues[ascValues.length - 1] : 0;
    accumulateStat(character.ascensionStat.type, ascValue, {
      hpPercent: (v) => { hpPercentBonus += v; },
      hpFlat: (v) => { hpFlatBonus += v; },
      atkPercent: (v) => { atkPercentBonus += v; },
      atkFlat: (v) => { atkFlatBonus += v; },
      defPercent: (v) => { defPercentBonus += v; },
      defFlat: (v) => { defFlatBonus += v; },
      critRate: (v) => { critRateBonus += v; },
      critDmg: (v) => { critDmgBonus += v; },
      em: (v) => { emBonus += v; },
      er: (v) => { erBonus += v; },
      dmgBonus: (v) => { dmgBonus += v; },
    });

    // 3. 武器基础攻击力（与角色基础攻击合并） + 武器副词条
    weaponBaseAtk = weapon.baseAtk;
    accumulateStat(weapon.substatType, weapon.substatValue, {
      hpPercent: (v) => { hpPercentBonus += v; },
      hpFlat: (v) => { hpFlatBonus += v; },
      atkPercent: (v) => { atkPercentBonus += v; },
      atkFlat: (v) => { atkFlatBonus += v; },
      defPercent: (v) => { defPercentBonus += v; },
      defFlat: (v) => { defFlatBonus += v; },
      critRate: (v) => { critRateBonus += v; },
      critDmg: (v) => { critDmgBonus += v; },
      em: (v) => { emBonus += v; },
      er: (v) => { erBonus += v; },
      dmgBonus: (v) => { dmgBonus += v; },
    });

    // 4 & 5. 圣遗物主词条 + 副词条
    for (const artifact of artifacts) {
      // 主词条
      const mainType = artifact.mainStatType;
      const mainValue = artifact.mainStatValue;

      // 检查是否为元素伤害加成
      const elementDmgStat = ELEMENT_DMG_BONUS_STAT[character.element];
      if ((elementDmgStat && mainType === elementDmgStat) ||
          mainType === SubType.PHYSICAL_DMG_BONUS) {
        dmgBonus += mainValue;
      } else {
        accumulateStat(mainType, mainValue, {
          hpPercent: (v) => { hpPercentBonus += v; },
          hpFlat: (v) => { hpFlatBonus += v; },
          atkPercent: (v) => { atkPercentBonus += v; },
          atkFlat: (v) => { atkFlatBonus += v; },
          defPercent: (v) => { defPercentBonus += v; },
          defFlat: (v) => { defFlatBonus += v; },
          critRate: (v) => { critRateBonus += v; },
          critDmg: (v) => { critDmgBonus += v; },
          em: (v) => { emBonus += v; },
          er: (v) => { erBonus += v; },
          dmgBonus: (v) => { dmgBonus += v; },
        });
      }

      // 副词条
      for (const sub of artifact.subStats) {
        accumulateStat(sub.type, sub.value, {
          hpPercent: (v) => { hpPercentBonus += v; },
          hpFlat: (v) => { hpFlatBonus += v; },
          atkPercent: (v) => { atkPercentBonus += v; },
          atkFlat: (v) => { atkFlatBonus += v; },
          defPercent: (v) => { defPercentBonus += v; },
          defFlat: (v) => { defFlatBonus += v; },
          critRate: (v) => { critRateBonus += v; },
          critDmg: (v) => { critDmgBonus += v; },
          em: (v) => { emBonus += v; },
          er: (v) => { erBonus += v; },
          dmgBonus: (v) => { dmgBonus += v; },
        });
      }
    }

    // 6. 队伍增益
    for (const buff of teamBuffs) {
      accumulateStat(buff.statType, buff.value, {
        hpPercent: (v) => { hpPercentBonus += v; },
        hpFlat: (v) => { hpFlatBonus += v; },
        atkPercent: (v) => { atkPercentBonus += v; },
        atkFlat: (v) => { atkFlatBonus += v; },
        defPercent: (v) => { defPercentBonus += v; },
        defFlat: (v) => { defFlatBonus += v; },
        critRate: (v) => { critRateBonus += v; },
        critDmg: (v) => { critDmgBonus += v; },
        em: (v) => { emBonus += v; },
        er: (v) => { erBonus += v; },
        dmgBonus: (v) => { dmgBonus += v; },
      });
    }

    // 基础值（步骤3已赋值 weaponBaseAtk，用于正确计算 ATK%/HP%/DEF% 叠加）
    const baseHp = base.hp;
    const baseAtk = base.atk + weaponBaseAtk;
    const baseDef = base.def;

    // 7. 叠加武器被动加成
    const weaponPassiveStats = StatCalculator.applyZoneBonus(
      { totalHp: base.hp * (1 + hpPercentBonus) + hpFlatBonus,
        totalAtk: baseAtk * (1 + atkPercentBonus) + atkFlatBonus,
        totalDef: base.def * (1 + defPercentBonus) + defFlatBonus,
        critRate: Math.min(base.critRate + critRateBonus, 1.0),
        critDmg: base.critDmg + critDmgBonus,
        dmgBonus,
        em: base.em + emBonus,
        er: base.er + erBonus,
      },
      weaponConfig.passiveBonus,
      baseHp,
      baseAtk,
      baseDef,
    );

    // 8. 叠加命座加成
    const withConstellation = StatCalculator.applyZoneBonus(
      weaponPassiveStats,
      constellationConfig?.bonus ?? {},
      baseHp,
      baseAtk,
      baseDef,
    );

    // 8.5 叠加天赋加成（用户手动填入的乘区加成）
    const withTalent = StatCalculator.applyZoneBonus(
      withConstellation,
      talentConfig?.bonus ?? {},
      baseHp,
      baseAtk,
      baseDef,
    );

    // 9. 叠加队伍 Buff（辅助/圣遗物/共鸣/月曜/自定义）
    const withTeam = StatCalculator.applyZoneBonus(
      withTalent,
      teamBuffBonuses ?? {},
      baseHp,
      baseAtk,
      baseDef,
    );

    // 10. 叠加圣遗物套装效果
    const finalStats = StatCalculator.applyZoneBonus(
      withTeam,
      setBonus ?? {},
      baseHp,
      baseAtk,
      baseDef,
    );

    // 11. 第二遍：属性转模（用第一轮面板值做映射叠加）
    //     武器示例：赤沙之杖 totalAtk += em × 0.52
    const conversions = build.statConversions;
    if (conversions && conversions.length > 0) {
      return StatCalculator.applyStatConversions(finalStats, conversions);
    }

    return finalStats;
  }

  /**
   * 第二遍计算 — 将第一轮面板各属性按比例转换为目标属性。
   *
   * 所有叠加都是 flat addition（目标 += 源 × 比例），不经过百分比路径。
   * 不迭代 — 原神转模效果是单向映射（源不会被目标影响），一轮即收敛。
   *
   * @param stats - 第一轮计算出的最终面板
   * @param conversions - 转模规则列表
   * @returns 叠加转模加成后的最终面板
   */
  static applyStatConversions(
    stats: ComputedStats,
    conversions: StatConversion[],
  ): ComputedStats {
    const result = { ...stats };

    for (const conv of conversions) {
      const source = result[conv.from];
      const rawDelta = source * conv.ratio;

      // 应用上限（如果配置了 maxCap）
      const delta = conv.maxCap !== undefined ? Math.min(rawDelta, conv.maxCap) : rawDelta;

      switch (conv.to) {
        case 'totalHp':
          result.totalHp += delta;
          break;
        case 'totalAtk':
          result.totalAtk += delta;
          break;
        case 'totalDef':
          result.totalDef += delta;
          break;
        case 'dmgBonus':
          result.dmgBonus += delta;
          break;
        case 'critRate':
          result.critRate = Math.min(result.critRate + delta, 1.0);
          break;
        case 'critDmg':
          result.critDmg += delta;
          break;
        case 'baseDamageFlat':
          result.baseDamageFlat = (result.baseDamageFlat ?? 0) + delta;
          break;
      }
    }

    return result;
  }

  /**
   * 将 ZoneBonusInput 的各字段叠加到 ComputedStats 上。
   * 所有数值为叠加（累加），不替换已有值。
   *
   * 对于 ATK%/HP%/DEF%：在原神中，所有百分比加成均作用于基础值（不含其他加成）。
   * 因此叠加公式为: newTotal = currentTotal + base × percentBonus + flatBonus
   * 而非: newTotal = currentTotal × (1 + percentBonus) + flatBonus
   *
   * @param stats - 当前计算属性
   * @param bonus - 乘区加成输入
   * @param baseHp - 角色基础生命值（character.baseStats.hp）
   * @param baseAtk - 总基础攻击力（character.baseStats.atk + weapon.baseAtk）
   * @param baseDef - 角色基础防御力（character.baseStats.def）
   * @returns 叠加后的新 ComputedStats
   */
  static applyZoneBonus(
    stats: ComputedStats,
    bonus: ZoneBonusInput,
    baseHp: number,
    baseAtk: number,
    baseDef: number,
  ): ComputedStats {
    return {
      totalHp: stats.totalHp + baseHp * (bonus.hpPercent ?? 0) + (bonus.hpFlat ?? 0),
      totalAtk: stats.totalAtk + baseAtk * (bonus.atkPercent ?? 0) + (bonus.atkFlat ?? 0),
      totalDef: stats.totalDef + baseDef * (bonus.defPercent ?? 0) + (bonus.defFlat ?? 0),
      critRate: Math.min(stats.critRate + (bonus.critRate ?? 0), 1.0),
      critDmg: stats.critDmg + (bonus.critDmg ?? 0),
      dmgBonus: stats.dmgBonus + (bonus.dmgBonus ?? 0),
      em: stats.em + (bonus.elementalMastery ?? 0),
      er: stats.er + (bonus.energyRecharge ?? 0),
    };
  }
}

/** 属性累加回调集合。 */
interface StatAccumulators {
  hpPercent: (value: number) => void;
  hpFlat: (value: number) => void;
  atkPercent: (value: number) => void;
  atkFlat: (value: number) => void;
  defPercent: (value: number) => void;
  defFlat: (value: number) => void;
  critRate: (value: number) => void;
  critDmg: (value: number) => void;
  em: (value: number) => void;
  er: (value: number) => void;
  dmgBonus: (value: number) => void;
}

/**
 * 将属性类型/值路由到正确的累加器回调。
 */
function accumulateStat(type: SubstatType, value: number, acc: StatAccumulators): void {
  switch (type) {
    case SubType.HP_PERCENT:
      acc.hpPercent(value);
      break;
    case SubType.HP_FLAT:
      acc.hpFlat(value);
      break;
    case SubType.ATK_PERCENT:
      acc.atkPercent(value);
      break;
    case SubType.ATK_FLAT:
      acc.atkFlat(value);
      break;
    case SubType.DEF_PERCENT:
      acc.defPercent(value);
      break;
    case SubType.DEF_FLAT:
      acc.defFlat(value);
      break;
    case SubType.CRIT_RATE:
      acc.critRate(value);
      break;
    case SubType.CRIT_DMG:
      acc.critDmg(value);
      break;
    case SubType.ELEMENTAL_MASTERY:
      acc.em(value);
      break;
    case SubType.ENERGY_RECHARGE:
      acc.er(value);
      break;
    // 元素伤害加成类型
    case SubType.PYRO_DMG_BONUS:
    case SubType.HYDRO_DMG_BONUS:
    case SubType.CRYO_DMG_BONUS:
    case SubType.ELECTRO_DMG_BONUS:
    case SubType.ANEMO_DMG_BONUS:
    case SubType.GEO_DMG_BONUS:
    case SubType.DENDRO_DMG_BONUS:
    case SubType.PHYSICAL_DMG_BONUS:
      acc.dmgBonus(value);
      break;
    case SubType.HEALING_BONUS:
      // 治疗加成不影响伤害计算，暂忽略
      break;
    default:
      break;
  }
}
