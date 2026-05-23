import type { ArtifactInstance, SetBonusResult } from '../types';
import { resolveSetName } from '../data/artifact_sets';

/**
 * Detect 2-piece and 4-piece set bonuses from a list of artifacts.
 *
 * Groups artifacts by setName, counts each group, and determines
 * whether 2-piece or 4-piece bonuses are active.
 *
 * Handles mixed sets correctly (e.g. 2+2+1 off-piece → two 2-piece bonuses).
 * Only returns sets that have at least the 2-piece bonus active.
 *
 * @param artifacts - Array of ArtifactInstance to analyze
 * @returns Array of SetBonusResult for sets with active bonuses
 */
export function detectSetBonuses(artifacts: ArtifactInstance[]): SetBonusResult[] {
  if (!artifacts || artifacts.length === 0) {
    return [];
  }

  // Group by setName, counting occurrences
  const setCounts = new Map<string, number>();
  for (const artifact of artifacts) {
    const rawName = artifact.setName ?? '';
    if (!rawName) continue;

    // Resolve hash to Chinese name if it looks like a numeric hash
    // (Artifacts parsed from Enka are pre-resolved; this handles manual/replay cases)
    const resolvedName = looksLikeHash(rawName) ? resolveSetName(rawName) : rawName;
    if (!resolvedName) continue; // Skip unresolved hashes

    const currentCount = setCounts.get(resolvedName) ?? 0;
    setCounts.set(resolvedName, currentCount + 1);
  }

  // Build results for sets with at least 2 pieces
  const results: SetBonusResult[] = [];
  for (const [setName, count] of setCounts) {
    if (count >= 2) {
      results.push({
        setName,
        count,
        bonus2: count >= 2,
        bonus4: count >= 4,
      });
    }
  }

  // Sort: 4-piece sets first, then by count descending
  results.sort((a, b) => {
    if (a.bonus4 !== b.bonus4) {
      return a.bonus4 ? -1 : 1;
    }
    return b.count - a.count;
  });

  return results;
}

/**
 * Check if a string looks like a numeric hash from Enka API.
 * Enka returns setNameTextMapHash as a number like "1847225849".
 */
function looksLikeHash(value: string): boolean {
  return /^\d+$/.test(value);
}

/**
 * Format set bonus results into a human-readable summary string.
 *
 * Examples:
 * - "炽烈的炎之魔女 ×4（2+4件套生效）"
 * - "流浪大地的乐团 ×2 + 炽烈的炎之魔女 ×2"
 * - "炽烈的炎之魔女 ×2（2件套生效）"
 *
 * @param bonuses - Array of SetBonusResult to format
 * @returns Formatted summary string
 */
export function formatSetBonuses(bonuses: SetBonusResult[]): string {
  if (bonuses.length === 0) {
    return '无套装效果';
  }

  const parts = bonuses.map((b) => {
    if (b.bonus4) {
      return `${b.setName} ×4（2+4件套生效）`;
    }
    return `${b.setName} ×2`;
  });

  if (bonuses.length === 1) {
    const b = bonuses[0];
    if (b.bonus4) {
      return `${b.setName} ×4（2+4件套生效）`;
    }
    return `${b.setName} ×2（2件套生效）`;
  }

  // Multiple set bonuses (e.g. 2+2)
  return parts.join(' + ') + '（双2件套）';
}
