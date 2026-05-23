import type { CharacterScenarios } from '../../types';
import allScenariosData from './_all.json';

const allScenariosArr = allScenariosData as CharacterScenarios[];

let scenarioCache: Map<string, CharacterScenarios> | null = null;

function getCache(): Map<string, CharacterScenarios> {
  if (!scenarioCache) {
    scenarioCache = new Map();
    for (const s of allScenariosArr) {
      if (s?.characterId) scenarioCache.set(s.characterId, s as CharacterScenarios);
    }
  }
  return scenarioCache;
}

export function loadAllScenarios(): Map<string, CharacterScenarios> {
  return getCache();
}

export function getScenariosByCharacterId(characterId: string): CharacterScenarios | undefined {
  return getCache().get(characterId);
}

export function getAllScenarios(): CharacterScenarios[] {
  return Array.from(getCache().values()).sort((a, b) => a.characterId.localeCompare(b.characterId));
}
