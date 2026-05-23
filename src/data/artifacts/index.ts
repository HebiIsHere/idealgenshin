import type { ArtifactSetData } from '../../types';
import allSetsData from './_all.json';

const allSetsArr = allSetsData as ArtifactSetData[];

let setCache: Map<string, ArtifactSetData> | null = null;

function getCache(): Map<string, ArtifactSetData> {
  if (!setCache) {
    setCache = new Map();
    for (const s of allSetsArr) {
      if (s?.id) setCache.set(s.id, s as ArtifactSetData);
    }
  }
  return setCache;
}

export function getAllArtifactSets(): ArtifactSetData[] {
  return [...allSetsArr].sort((a, b) => a.nameZh.localeCompare(b.nameZh, 'zh-CN'));
}

export function getArtifactSetById(id: string): ArtifactSetData | undefined {
  return getCache().get(id);
}

export function searchArtifactSets(query: string): ArtifactSetData[] {
  if (!query.trim()) return getAllArtifactSets();
  const q = query.toLowerCase();
  return getAllArtifactSets().filter(
    (s) => s.nameZh.includes(query) || s.name.toLowerCase().includes(q) || s.id.includes(q),
  );
}
