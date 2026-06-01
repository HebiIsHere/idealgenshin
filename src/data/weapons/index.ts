import { SubstatType, WeaponType } from '../../types';
import type { WeaponData, RefinementLevel } from '../../types';
import allWeaponsData from './_all.json';
import refinementsData from './refinements.json';

const allWeaponsArr = allWeaponsData as WeaponData[];
const refinementsMap = refinementsData as Record<string, { effectName: string; refinements: RefinementLevel[] }>;

let weaponCache: Map<string, WeaponData> | null = null;

function getCache(): Map<string, WeaponData> {
  if (!weaponCache) {
    weaponCache = new Map();
    for (const w of allWeaponsArr) {
      if (w?.id) {
        const refData = refinementsMap[w.id];
        const merged: WeaponData = {
          ...(w as WeaponData),
          // prefer embedded refinements (from individual JSON), fallback to refinements.json
          refinements: (w as WeaponData).refinements ?? refData?.refinements,
        };
        weaponCache.set(w.id, merged);
      }
    }
  }
  return weaponCache;
}

export function getWeaponById(id: string): WeaponData | undefined {
  return getCache().get(id);
}

function getAllWeapons(): WeaponData[] {
  return [...allWeaponsArr].sort((a, b) => {
    if (a.weaponType !== b.weaponType) return a.weaponType.localeCompare(b.weaponType);
    return b.rarity - a.rarity;
  });
}

export function getWeaponsByType(weaponType: string): WeaponData[] {
  return getAllWeapons().filter((w) => w.weaponType === weaponType);
}

export const DEFAULT_WEAPON: WeaponData = {
  id: 'default_weapon',
  name: 'Dull Blade',
  nameZh: '无锋剑',
  rarity: 1,
  weaponType: WeaponType.SWORD,
  baseAtk: 23,
  substatType: SubstatType.ATK_PERCENT,
  substatValue: 0,
  passiveName: '',
  passiveDesc: '',
};
