import type { ArtifactInstance, SubStatEntry, SubstatType, CharacterBuild, ShowcaseCharacter } from '../types';
import { ArtifactSlotType } from '../types';
import { resolveSetName, resolveCharacterName, fuzzyMatchSetName } from '../data/artifact_sets';
import { detectSetBonuses } from './set-bonus';
import { WEAPON_ID_MAP } from '../data/weapon_id_map';

/**
 * EnkaService — client for the Enka Network API.
 * Fetches character showcase data and parses it into CharacterBuild objects.
 *
 * API Docs: https://enka.network/
 * Endpoint: GET https://enka.network/api/uid/{uid}
 */

const ENKA_API_BASE = '/enka-api/api/uid';

/** Error types for Enka API interactions. */
export class EnkaError extends Error {
  constructor(
    message: string,
    public code: 'NOT_FOUND' | 'API_UNAVAILABLE' | 'RATE_LIMITED' | 'PARSE_ERROR' | 'NETWORK_ERROR',
  ) {
    super(message);
    this.name = 'EnkaError';
  }
}

/**
 * Common Enka API fetch logic — handles network request, status codes, and JSON parsing.
 * Shared by both fetchCharacterBuild and fetchAllCharacterBuilds.
 *
 * @param uid - Genshin Impact UID
 * @returns Parsed JSON response from Enka API
 * @throws EnkaError on API failures
 */
async function fetchEnkaApi(uid: string): Promise<any> {
  const url = `${ENKA_API_BASE}/${uid}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        'Accept-Language': 'zh-CN',
      },
    });
  } catch {
    throw new EnkaError(
      '网络请求失败，请检查网络连接',
      'NETWORK_ERROR',
    );
  }

  if (response.status === 400) {
    // Enka returns 400 when the player hasn't been looked up on their site yet.
    // The user needs to visit https://enka.network/u/{uid} first to register the profile.
    throw new EnkaError(
      `UID「${uid}」暂未收录，请先到 enka.network/u/${uid} 查看一次角色展柜，再回来导入`,
      'NOT_FOUND',
    );
  }

  if (response.status === 404) {
    throw new EnkaError(
      '未找到该UID对应的玩家数据',
      'NOT_FOUND',
    );
  }

  if (response.status === 429) {
    throw new EnkaError(
      '请求过于频繁，请稍后再试',
      'RATE_LIMITED',
    );
  }

  if (!response.ok) {
    throw new EnkaError(
      `API请求失败 (${response.status})`,
      'API_UNAVAILABLE',
    );
  }

  try {
    return await response.json();
  } catch {
    throw new EnkaError(
      'API返回数据解析失败',
      'PARSE_ERROR',
    );
  }
}

/**
 * Fetch character data from Enka Network API (single character, legacy).
 * @param uid - Genshin Impact UID
 * @param charIdx - Index of the character in the showcase (0-7)
 * @returns CharacterBuild parsed from Enka data
 * @throws EnkaError on API failures
 */
export async function fetchCharacterBuild(
  uid: string,
  charIdx: number = 0,
): Promise<Partial<CharacterBuild>> {
  const data = await fetchEnkaApi(uid);

  try {
    return parseEnkaData(data, charIdx);
  } catch {
    throw new EnkaError(
      '角色数据解析失败，请确认角色展柜中有该角色',
      'PARSE_ERROR',
    );
  }
}

/**
 * Fetch ALL characters from Enka Network showcase.
 * Returns parsed data for every character in the showcase.
 *
 * @param uid - Genshin Impact UID
 * @returns Array of ShowcaseCharacter with artifacts and set bonuses
 * @throws EnkaError on API failures
 */
export async function fetchAllCharacterBuilds(uid: string): Promise<ShowcaseCharacter[]> {
  const data = await fetchEnkaApi(uid);

  try {
    return parseAllCharacters(data);
  } catch {
    throw new EnkaError(
      '角色数据解析失败，请确认角色展柜中有角色',
      'PARSE_ERROR',
    );
  }
}

/**
 * Parse Enka Network API response into a partial CharacterBuild (legacy single-character).
 * P0: Simplified parsing — extracts artifacts and basic character info.
 */
function parseEnkaData(data: any, charIdx: number): Partial<CharacterBuild> {
  const avatarInfoList = data?.avatarInfoList;
  if (!avatarInfoList || !Array.isArray(avatarInfoList) || avatarInfoList.length === 0) {
    throw new Error('No characters found in showcase');
  }

  const charData = avatarInfoList[charIdx];
  if (!charData) {
    throw new Error(`Character at index ${charIdx} not found`);
  }

  // Parse artifacts
  const artifacts = parseArtifacts(charData.equipList);

  return {
    artifacts,
    characterLevel: charData.propMap?.['4001']?.val ?? 90,
  };
}

/**
 * Parse ALL characters from Enka showcase data.
 * Returns an array of ShowcaseCharacter, each with their artifacts and detected set bonuses.
 */
export function parseAllCharacters(data: any): ShowcaseCharacter[] {
  const avatarInfoList = data?.avatarInfoList;
  if (!avatarInfoList || !Array.isArray(avatarInfoList) || avatarInfoList.length === 0) {
    throw new Error('No characters found in showcase');
  }

  const characters: ShowcaseCharacter[] = [];

  for (const charData of avatarInfoList) {
    try {
      const avatarId = String(charData.avatarId ?? 'unknown');
      const characterLevel = Number(charData.propMap?.['4001']?.val ?? 90);

      // Resolve character name from avatarId
      const characterName = resolveCharacterName(avatarId);

      // Parse artifacts
      const artifacts = parseArtifacts(charData.equipList);

      // Detect set bonuses
      const setBonuses = detectSetBonuses(artifacts);

      // Parse weapon data
      const weaponInfo = parseWeapon(charData.equipList);

      characters.push({
        characterId: avatarId,
        characterName,
        characterLevel,
        artifacts,
        setBonuses,
        weaponProjectId: weaponInfo.projectId,
        weaponLevel: weaponInfo.level,
        weaponRefinement: weaponInfo.refinement,
      });
    } catch (error) {
      // Skip characters that fail to parse rather than crashing the whole import
      console.warn('Failed to parse character:', charData?.avatarId, error);
      continue;
    }
  }

  return characters;
}

/**
 * Parse equipped items from Enka data into ArtifactInstance array.
 * P0: Simplified — uses basic stat mapping.
 */
export function parseArtifacts(equipList: any[]): ArtifactInstance[] {
  if (!equipList || !Array.isArray(equipList)) return [];

  return equipList
    .filter((item: any) => item.flat?.itemType === 'ITEM_RELIQUARY')
    .map((item: any, index: number) => {
      const flat = item.flat;
      const mainStat = flat.reliquaryMainstat;
      const subStats = flat.reliquarySubstats ?? [];

      const slotType = mapSlotType(flat.equipType);
      const mainStatType = mapSubstatType(mainStat?.mainPropId);
      const mainStatValue = mainStat?.statValue ?? 0;

      const parsedSubStats: SubStatEntry[] = subStats.map((sub: any) => ({
        type: mapSubstatType(sub.appendPropId),
        value: convertStatValue(mapSubstatType(sub.appendPropId), sub.statValue),
      }));

      // Resolve setNameTextMapHash to Chinese name; fall back to fuzzy match from icon
      const rawSetName = flat.setNameTextMapHash ?? '';
      const iconName = flat.icon ?? '';
      let setName = rawSetName ? resolveSetName(rawSetName) : '';
      // If hash lookup failed, try fuzzy match from icon
      if (!setName && iconName) {
        setName = fuzzyMatchSetName(iconName);
      }
      // Debug: log unresolved artifacts
      if (!setName && rawSetName) {
        console.warn('[enka] Unresolved artifact set — hash:', rawSetName, 'icon:', iconName);
      }

      return {
        id: `enka_${index}_${Date.now()}`,
        slot: slotType,
        mainStatType,
        mainStatValue: convertStatValue(mainStatType, mainStatValue),
        subStats: parsedSubStats,
        setName,
      } as ArtifactInstance;
    });
}

/**
 * Map Enka equip type to ArtifactSlotType.
 */
function mapSlotType(equipType: string): ArtifactSlotType {
  switch (equipType) {
    case 'EQUIP_BRACER':
      return ArtifactSlotType.FLOWER;
    case 'EQUIP_NECKLACE':
      return ArtifactSlotType.FEATHER;
    case 'EQUIP_SHOES':
      return ArtifactSlotType.SANDS;
    case 'EQUIP_RING':
      return ArtifactSlotType.GOBLET;
    case 'EQUIP_DRESS':
      return ArtifactSlotType.CIRCLET;
    default:
      return ArtifactSlotType.FLOWER;
  }
}

/**
 * Map Enka property ID to SubstatType.
 */
function mapSubstatType(propId: string): SubstatType {
  const mapping: Record<string, SubstatType> = {
    FIGHT_PROP_HP: 'HP_FLAT' as SubstatType,
    FIGHT_PROP_HP_PERCENT: 'HP_PERCENT' as SubstatType,
    FIGHT_PROP_ATTACK: 'ATK_FLAT' as SubstatType,
    FIGHT_PROP_ATTACK_PERCENT: 'ATK_PERCENT' as SubstatType,
    FIGHT_PROP_DEFENSE: 'DEF_FLAT' as SubstatType,
    FIGHT_PROP_DEFENSE_PERCENT: 'DEF_PERCENT' as SubstatType,
    FIGHT_PROP_CRITICAL: 'CRIT_RATE' as SubstatType,
    FIGHT_PROP_CRITICAL_HURT: 'CRIT_DMG' as SubstatType,
    FIGHT_PROP_ELEMENT_MASTERY: 'ELEMENTAL_MASTERY' as SubstatType,
    FIGHT_PROP_CHARGE_EFFICIENCY: 'ENERGY_RECHARGE' as SubstatType,
    FIGHT_PROP_FIRE_ADD_HURT: 'PYRO_DMG_BONUS' as SubstatType,
    FIGHT_PROP_WATER_ADD_HURT: 'HYDRO_DMG_BONUS' as SubstatType,
    FIGHT_PROP_ICE_ADD_HURT: 'CRYO_DMG_BONUS' as SubstatType,
    FIGHT_PROP_ELEC_ADD_HURT: 'ELECTRO_DMG_BONUS' as SubstatType,
    FIGHT_PROP_WIND_ADD_HURT: 'ANEMO_DMG_BONUS' as SubstatType,
    FIGHT_PROP_ROCK_ADD_HURT: 'GEO_DMG_BONUS' as SubstatType,
    FIGHT_PROP_GRASS_ADD_HURT: 'DENDRO_DMG_BONUS' as SubstatType,
    FIGHT_PROP_PHYSICAL_ADD_HURT: 'PHYSICAL_DMG_BONUS' as SubstatType,
    FIGHT_PROP_HEAL_ADD: 'HEALING_BONUS' as SubstatType,
  };
  return mapping[propId] ?? ('ATK_FLAT' as SubstatType);
}

/** Result of parsing a weapon from Enka equipList. */
interface ParsedWeapon {
  /** Project weapon database id (null if unmatched). */
  projectId: string | null;
  /** Weapon level (1-90). */
  level: number;
  /** Refinement rank (1-5). */
  refinement: number;
}

/**
 * Parse weapon data from Enka equipList.
 * Finds the ITEM_WEAPON entry, resolves the itemId to our weapon database,
 * and extracts level and refinement.
 */
function parseWeapon(equipList: any[]): ParsedWeapon {
  if (!equipList || !Array.isArray(equipList)) {
    return { projectId: null, level: 90, refinement: 1 };
  }

  const weapon = equipList.find(
    (item: any) => item.flat?.itemType === 'ITEM_WEAPON',
  );

  if (!weapon) {
    return { projectId: null, level: 90, refinement: 1 };
  }

  const itemId = String(weapon.itemId ?? '');
  const mapEntry = WEAPON_ID_MAP[itemId];
  const projectId = mapEntry?.projectId ?? null;

  // Weapon level from weapon object or propMap
  const level = Number(weapon.weapon?.level ?? weapon.reliquary?.level ?? 90);

  // Refinement rank from affixMap (keys are affix IDs, values are refinement + 1)
  let refinement = 1;
  const affixMap = weapon.weapon?.affixMap;
  if (affixMap && typeof affixMap === 'object') {
    const affixValues = Object.values(affixMap) as number[];
    if (affixValues.length > 0) {
      refinement = Math.max(1, Math.min(5, affixValues[0]));
    }
  }

  // Debug unmatched weapons
  if (!projectId && itemId) {
    console.warn('[enka] Unmatched weapon — itemId:', itemId, 'icon:', weapon.flat?.icon);
  }

  return { projectId, level, refinement };
}

/**
 * Convert Enka stat value to internal decimal representation.
 * Enka returns percentage values as whole numbers (e.g. 46.6 for 46.6%),
 * while we store them as decimals (0.466).
 */
function convertStatValue(type: SubstatType, value: number): number {
  const PERCENTAGE_TYPES: Set<string> = new Set([
    'HP_PERCENT', 'ATK_PERCENT', 'DEF_PERCENT',
    'CRIT_RATE', 'CRIT_DMG', 'ENERGY_RECHARGE',
    'PYRO_DMG_BONUS', 'HYDRO_DMG_BONUS', 'CRYO_DMG_BONUS',
    'ELECTRO_DMG_BONUS', 'ANEMO_DMG_BONUS', 'GEO_DMG_BONUS',
    'DENDRO_DMG_BONUS', 'PHYSICAL_DMG_BONUS', 'HEALING_BONUS',
  ]);
  if (PERCENTAGE_TYPES.has(type)) {
    return value / 100;
  }
  return value;
}
