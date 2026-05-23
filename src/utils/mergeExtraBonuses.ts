import type { CharacterBuild, ZoneBonusInput } from '../types';

/**
 * 合并武器被动、命座、天赋、圣遗物套装和队伍 buff 为统一的 extraBonuses。
 * 所有数值叠加（不替换），defReductions 数组合并。
 */
export function mergeExtraBonuses(build: CharacterBuild): ZoneBonusInput {
  const weaponBonus = build.weaponConfig.passiveBonus ?? {};
  const constellationBonus = build.constellationConfig?.bonus ?? {};
  const talentBonus = build.talentConfig?.bonus ?? {};
  const setBonus = build.setBonus ?? {};
  const teamBuffBonuses = build.teamBuffBonuses ?? {};
  return {
    atkPercent: (weaponBonus.atkPercent ?? 0) + (constellationBonus.atkPercent ?? 0) + (talentBonus.atkPercent ?? 0) + (setBonus.atkPercent ?? 0) + (teamBuffBonuses.atkPercent ?? 0),
    atkFlat: (weaponBonus.atkFlat ?? 0) + (constellationBonus.atkFlat ?? 0) + (talentBonus.atkFlat ?? 0) + (teamBuffBonuses.atkFlat ?? 0),
    hpPercent: (weaponBonus.hpPercent ?? 0) + (constellationBonus.hpPercent ?? 0) + (talentBonus.hpPercent ?? 0) + (teamBuffBonuses.hpPercent ?? 0),
    hpFlat: (weaponBonus.hpFlat ?? 0) + (constellationBonus.hpFlat ?? 0) + (talentBonus.hpFlat ?? 0) + (teamBuffBonuses.hpFlat ?? 0),
    defPercent: (weaponBonus.defPercent ?? 0) + (constellationBonus.defPercent ?? 0) + (talentBonus.defPercent ?? 0) + (teamBuffBonuses.defPercent ?? 0),
    defFlat: (weaponBonus.defFlat ?? 0) + (constellationBonus.defFlat ?? 0) + (talentBonus.defFlat ?? 0) + (teamBuffBonuses.defFlat ?? 0),
    dmgBonus: (weaponBonus.dmgBonus ?? 0) + (constellationBonus.dmgBonus ?? 0) + (talentBonus.dmgBonus ?? 0) + (setBonus.dmgBonus ?? 0) + (teamBuffBonuses.dmgBonus ?? 0),
    critRate: (weaponBonus.critRate ?? 0) + (constellationBonus.critRate ?? 0) + (talentBonus.critRate ?? 0) + (setBonus.critRate ?? 0) + (teamBuffBonuses.critRate ?? 0),
    critDmg: (weaponBonus.critDmg ?? 0) + (constellationBonus.critDmg ?? 0) + (talentBonus.critDmg ?? 0) + (setBonus.critDmg ?? 0) + (teamBuffBonuses.critDmg ?? 0),
    elementalMastery: (weaponBonus.elementalMastery ?? 0) + (constellationBonus.elementalMastery ?? 0) + (talentBonus.elementalMastery ?? 0) + (setBonus.elementalMastery ?? 0) + (teamBuffBonuses.elementalMastery ?? 0),
    energyRecharge: (weaponBonus.energyRecharge ?? 0) + (constellationBonus.energyRecharge ?? 0) + (talentBonus.energyRecharge ?? 0) + (setBonus.energyRecharge ?? 0) + (teamBuffBonuses.energyRecharge ?? 0),
    resistReduction: (weaponBonus.resistReduction ?? 0) + (constellationBonus.resistReduction ?? 0) + (talentBonus.resistReduction ?? 0) + (setBonus.resistReduction ?? 0) + (teamBuffBonuses.resistReduction ?? 0),
    baseDamageFlat: (weaponBonus.baseDamageFlat ?? 0) + (constellationBonus.baseDamageFlat ?? 0) + (talentBonus.baseDamageFlat ?? 0) + (setBonus.baseDamageFlat ?? 0) + (teamBuffBonuses.baseDamageFlat ?? 0),
    defIgnore: (weaponBonus.defIgnore ?? 0) + (constellationBonus.defIgnore ?? 0) + (talentBonus.defIgnore ?? 0) + (setBonus.defIgnore ?? 0) + (teamBuffBonuses.defIgnore ?? 0),
    independentBonus: (weaponBonus.independentBonus ?? 0) + (constellationBonus.independentBonus ?? 0) + (talentBonus.independentBonus ?? 0) + (setBonus.independentBonus ?? 0) + (teamBuffBonuses.independentBonus ?? 0),
    elevationBonus: (weaponBonus.elevationBonus ?? 0) + (constellationBonus.elevationBonus ?? 0) + (talentBonus.elevationBonus ?? 0) + (setBonus.elevationBonus ?? 0) + (teamBuffBonuses.elevationBonus ?? 0),
    transformReactionBonus: (weaponBonus.transformReactionBonus ?? 0) + (constellationBonus.transformReactionBonus ?? 0) + (talentBonus.transformReactionBonus ?? 0) + (setBonus.transformReactionBonus ?? 0) + (teamBuffBonuses.transformReactionBonus ?? 0),
    moonReactionBonus: (weaponBonus.moonReactionBonus ?? 0) + (constellationBonus.moonReactionBonus ?? 0) + (talentBonus.moonReactionBonus ?? 0) + (setBonus.moonReactionBonus ?? 0) + (teamBuffBonuses.moonReactionBonus ?? 0),
    ampReactionBonus: (weaponBonus.ampReactionBonus ?? 0) + (constellationBonus.ampReactionBonus ?? 0) + (talentBonus.ampReactionBonus ?? 0) + (setBonus.ampReactionBonus ?? 0) + (teamBuffBonuses.ampReactionBonus ?? 0),
    defReductions: [
      ...(weaponBonus.defReductions ?? []),
      ...(constellationBonus.defReductions ?? []),
      ...(talentBonus.defReductions ?? []),
      ...(teamBuffBonuses.defReductions ?? []),
    ],
  };
}
