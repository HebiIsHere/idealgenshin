import type { SharePayload } from './share';
import { ArtifactSlotType, SubstatType } from '../types';
import type { ArtifactInstance } from '../types';

/**
 * 将 SharePayload 中的圣遗物数据还原为 ArtifactInstance[]。
 */
export function restoreArtifacts(payload: SharePayload): ArtifactInstance[] {
  return (payload.artifacts ?? []).map((a, i) => ({
    id: `shared_${i}_${Date.now()}`,
    slot: a.slot as ArtifactSlotType,
    mainStatType: a.mainStatType as SubstatType,
    mainStatValue: a.mainStatValue,
    setName: a.setName || '',
    initialSubstatCount: a.initialSubstatCount,
    subStats: (a.subStats ?? []).map((s) => ({
      type: s.type as SubstatType,
      value: s.value,
    })),
  }));
}
