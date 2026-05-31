import { ArtifactSlotType, SubstatType } from '../types';
import type { CharacterBuild } from '../types';
import { MAIN_STAT_BY_SLOT, MAIN_STAT_MAX_VALUES } from '../data/constants';

export interface MainStatCombo {
  sands: SubstatType;
  goblet: SubstatType;
  circlet: SubstatType;
}

const UNIVERSAL_GOBLET_TYPES: SubstatType[] = [
  SubstatType.ATK_PERCENT, SubstatType.HP_PERCENT, SubstatType.DEF_PERCENT, SubstatType.ELEMENTAL_MASTERY,
];

/** Enumerate all valid main stat combos (sands × goblet × circlet). */
export function enumerateMainStatCombos(elementDmgStat: SubstatType | undefined): MainStatCombo[] {
  const sandsOptions = MAIN_STAT_BY_SLOT['SANDS'];
  const gobletOptions = MAIN_STAT_BY_SLOT['GOBLET'];
  const circletOptions = MAIN_STAT_BY_SLOT['CIRCLET'];

  const filteredGoblet = gobletOptions.filter(
    (t) => UNIVERSAL_GOBLET_TYPES.includes(t) || (elementDmgStat !== undefined && t === elementDmgStat),
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

/** Apply a main stat combo to a build's artifacts. */
export function applyMainStats(build: CharacterBuild, combo: MainStatCombo): CharacterBuild {
  const newArtifacts = build.artifacts.map((a) => {
    switch (a.slot) {
      case ArtifactSlotType.SANDS: return { ...a, mainStatType: combo.sands, mainStatValue: MAIN_STAT_MAX_VALUES[combo.sands] ?? 0 };
      case ArtifactSlotType.GOBLET: return { ...a, mainStatType: combo.goblet, mainStatValue: MAIN_STAT_MAX_VALUES[combo.goblet] ?? 0 };
      case ArtifactSlotType.CIRCLET: return { ...a, mainStatType: combo.circlet, mainStatValue: MAIN_STAT_MAX_VALUES[combo.circlet] ?? 0 };
      default: return a;
    }
  });
  return { ...build, artifacts: newArtifacts };
}

/** Extract current main stats from a build. */
export function getCurrentMainStats(build: CharacterBuild): MainStatCombo {
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
