import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { CharacterSave } from '../types';

/** 分享时保存的最小关键字段（去掉了完整的 CharacterData，只留 ID 用于还原）。 */
export interface SharePayload {
  v: number;              // 格式版本号
  characterId: string;
  characterLevel: number;
  weaponId: string;
  weaponLevel: number;
  weaponRefinement: number;
  weaponPassive: Record<string, number>;
  constellationLevel: number;
  constellationBonus: Record<string, number>;
  talentBonus: Record<string, number>;
  skillMultiplier: number;
  reactionType: string;
  amplifyingMultiplier: number;
  customScaling: { atkRatio: number; hpRatio: number; defRatio: number; emRatio: number };
  artifacts: {
    slot: string;
    mainStatType: string;
    mainStatValue: number;
    setName: string;
    subStats: { type: string; value: number }[];
  }[];
  teamBuffs: { name: string; statType: string; value: number }[];
  setBonus: Record<string, number>;
  statConversions: { from: string; to: string; ratio: number; maxCap?: number }[];
  laumaCons: string;
  laumaEM: number;
  teamBuffConfig?: {
    supportIds: string[];
    artifactIds: string[];
    resonanceId: string;
    moonsignEnabled: boolean;
    moonsignBonus: number;
    customBuffs: Record<string, number>;
  };
}

/**
 * 从 URL hash 中解析 SharePayload。
 * 返回 null 表示没有分享数据或解析失败。
 */
export function decodeBuildFromHash(hash: string): SharePayload | null {
  try {
    const raw = hash.startsWith('#') ? hash.slice(1) : hash;
    if (!raw.startsWith('s=')) return null;
    const compressed = raw.slice(2);
    const json = decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    const payload = JSON.parse(json) as SharePayload;
    if (payload.v !== 1) return null;
    return payload;
  } catch {
    return null;
  }
}

/** 从 CharacterSave（localStorage 存档格式）还原为 SharePayload。 */
export function encodeFromSave(save: CharacterSave): string | null {
  try {
    const payload: SharePayload = {
      v: 1,
      characterId: save.characterId,
      characterLevel: save.characterLevel,
      weaponId: save.weaponConfig.weaponData.id,
      weaponLevel: save.weaponConfig.weaponLevel,
      weaponRefinement: save.weaponConfig.refinement,
      weaponPassive: filterZero(save.weaponConfig.passiveBonus as Record<string, number>),
      constellationLevel: save.constellationConfig?.level ?? 0,
      constellationBonus: filterZero(save.constellationConfig?.bonus as Record<string, number> ?? {}),
      talentBonus: filterZero(save.talentConfig?.bonus as Record<string, number> ?? {}),
      skillMultiplier: save.skillMultiplier ?? 1.0,
      reactionType: save.reactionType ?? 'NONE',
      amplifyingMultiplier: save.amplifyingMultiplier ?? 0,
      customScaling: save.customScaling ?? { atkRatio: 3, hpRatio: 0, defRatio: 0, emRatio: 0 },
      artifacts: (save.artifacts ?? []).map((a) => ({
        slot: a.slot,
        mainStatType: a.mainStatType,
        mainStatValue: a.mainStatValue,
        setName: a.setName || '',
        subStats: (a.subStats ?? []).map((s) => ({ type: s.type, value: s.value })),
      })),
      teamBuffs: (save.teamBuffs ?? []).map((b) => ({ name: b.name, statType: b.statType, value: b.value })),
      setBonus: filterZero(save.setBonus as Record<string, number> ?? {}),
      statConversions: (save.statConversions ?? []).map((c) => ({ from: c.from, to: c.to, ratio: c.ratio, maxCap: c.maxCap })),
      laumaCons: save.laumaCons ?? 'c0',
      laumaEM: save.laumaEM ?? 0,
      teamBuffConfig: save.teamBuffConfig ? {
        supportIds: save.teamBuffConfig.supportIds ?? [],
        artifactIds: save.teamBuffConfig.artifactIds ?? [],
        resonanceId: save.teamBuffConfig.resonanceId ?? '',
        moonsignEnabled: save.teamBuffConfig.moonsignEnabled ?? false,
        moonsignBonus: save.teamBuffConfig.moonsignBonus ?? 0.36,
        customBuffs: save.teamBuffConfig.customBuffs as Record<string, number> ?? {},
      } : undefined,
    };
    const json = JSON.stringify(payload);
    const compressed = compressToEncodedURIComponent(json);
    return `s=${compressed}`;
  } catch {
    return null;
  }
}

function filterZero(obj: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== 0 && v !== undefined && v !== null) result[k] = v;
  }
  return result;
}
