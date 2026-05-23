import type { CharacterData } from '../../types';
import allCharactersData from './_all.json';

const allCharactersArr = allCharactersData as CharacterData[];

/** Cache of loaded character data indexed by character ID. */
let characterCache: Map<string, CharacterData> | null = null;

function getCache(): Map<string, CharacterData> {
  if (!characterCache) {
    characterCache = new Map();
    for (const c of allCharactersArr) {
      if (c?.id) characterCache.set(c.id, c as CharacterData);
    }
  }
  return characterCache;
}

export function loadAllCharacters(): Map<string, CharacterData> {
  return getCache();
}

export function getCharacterById(id: string): CharacterData | undefined {
  return getCache().get(id);
}

export function getAllCharacters(): CharacterData[] {
  return [...allCharactersArr].sort((a, b) => {
    if (a.element !== b.element) return a.element.localeCompare(b.element);
    return a.nameZh.localeCompare(b.nameZh, 'zh-CN');
  });
}

export function searchCharacters(query: string): CharacterData[] {
  if (!query.trim()) return getAllCharacters();
  const q = query.toLowerCase();
  return getAllCharacters().filter(
    (c) => c.nameZh.includes(query) || c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q),
  );
}
