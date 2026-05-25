import type { CharacterBuild, ZoneBonusInput } from '../types';

/**
 * 合并武器被动、命座、天赋、圣遗物套装和队伍 buff 为统一的 extraBonuses。
 * 所有数值叠加（不替换）。零值字段不写入返回对象，确保各 Zone 的 ?? 默认值生效。
 */
export function mergeExtraBonuses(build: CharacterBuild): ZoneBonusInput {
  const sources = [
    build.weaponConfig.passiveBonus ?? {},
    build.constellationConfig?.bonus ?? {},
    build.talentConfig?.bonus ?? {},
    build.setBonus ?? {},
    build.teamBuffBonuses ?? {},
  ];

  const add = (key: string): number => sources.reduce((sum, s) => sum + ((s as any)[key] ?? 0), 0);

  const concat = (key: string): number[] =>
    sources.reduce((arr: number[], s) => [...arr, ...((s as any)[key] ?? [])], []);

  const setIf = (key: string, val: number): Record<string, number> => (val !== 0 ? { [key]: val } : {});
  const arrIf = (key: string, val: number[]): Record<string, number[]> => (val.length > 0 ? { [key]: val } : {});
  const objIf = (key: string, val: any): Record<string, any> => (val != null ? { [key]: val } : {});

  const featherScaling = sources.find(s => (s as any).featherScaling)?.featherScaling ??
    sources.find(s => s.featherScaling)?.featherScaling;
  const prayerScaling = sources.find(s => (s as any).prayerScaling)?.prayerScaling ??
    sources.find(s => s.prayerScaling)?.prayerScaling;

  return {
    ...setIf('atkPercent', add('atkPercent')),
    ...setIf('atkFlat', add('atkFlat')),
    ...setIf('hpPercent', add('hpPercent')),
    ...setIf('hpFlat', add('hpFlat')),
    ...setIf('defPercent', add('defPercent')),
    ...setIf('defFlat', add('defFlat')),
    ...setIf('dmgBonus', add('dmgBonus')),
    ...setIf('critRate', add('critRate')),
    ...setIf('critDmg', add('critDmg')),
    ...setIf('elementalMastery', add('elementalMastery')),
    ...setIf('energyRecharge', add('energyRecharge')),
    ...setIf('resistReduction', add('resistReduction')),
    ...setIf('baseDamageFlat', add('baseDamageFlat')),
    ...setIf('defIgnore', add('defIgnore')),
    ...setIf('independentBonus', add('independentBonus')),
    ...setIf('elevationBonus', add('elevationBonus')),
    ...setIf('transformReactionBonus', add('transformReactionBonus')),
    ...setIf('moonReactionBonus', add('moonReactionBonus')),
    ...setIf('ampReactionBonus', add('ampReactionBonus')),
    ...setIf('authorityMultiplier', add('authorityMultiplier')),
    ...setIf('moonSignBonus', add('moonSignBonus')),
    ...setIf('featherFlat', add('featherFlat')),
    ...objIf('featherScaling', featherScaling),
    ...setIf('prayerFlat', add('prayerFlat')),
    ...objIf('prayerScaling', prayerScaling),
    ...arrIf('defReductions', concat('defReductions')),
    ...arrIf('defIncreases', concat('defIncreases')),
  };
}
