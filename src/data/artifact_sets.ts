import type { ArtifactSetData } from '../types';

/**
 * Artifact set data (P2 skeleton).
 * Will be populated with full set data and effects in P2 phase.
 */

/**
 * Mapping from Enka setNameTextMapHash (number as string) to Chinese set name.
 * Hash values sourced from GenshinData ReliquarySetExcelConfigData.json.
 * If a hash is not found, the fallback display is "未知套装(#{hash})".
 */
/** Map from Enka setNameTextMapHash to Chinese set name. */
const ARTIFACT_SET_HASH_MAP: Record<string, string> = {
  // ===== 5星套装（按SetID排序，数据源自 ReliquarySetExcelConfigData） =====

  // 15007: Gladiator's Finale
  '1950711078': '角斗士的终幕礼',
  // 15008: Wanderer's Troupe
  '3776130198': '流浪大地的乐团',
  // 15009: Thundering Fury
  '1523555942': '如雷的盛怒',
  // 15010: Thundersoother
  '3435100542': '平息鸣雷的尊者',
  // 15011: Bloodstained Chivalry
  '1817050462': '染血的骑士道',
  // 15012: Archaic Petra
  '1407486230': '悠古的磐岩',
  // 15013: Retracing Bolide
  '568790406': '逆飞的流星',
  // 15014: Crimson Witch of Flames
  '2664577174': '炽烈的炎之魔女',
  // 15015: Lavawalker
  '3519135894': '渡过烈火的贤人',
  // 15016: Viridescent Venerer
  '744843214': '翠绿之影',
  // 15017: Blizzard Strayer
  '3006628830': '冰风迷途的勇士',
  // 15018: Heart of Depth
  '3846340430': '沉沦之心',
  // 15019: Tenacity of the Millelith
  '3379981326': '千岩牢固',
  // 15020: Pale Flame
  '178637006': '苍白之火',
  // 15021: Emblem of Severed Fate
  '771272886': '绝缘之旗印',
  // 15022: Echoes of an Offering
  '652463502': '回声之林夜话',
  // 15023: Husk of Opulent Dreams
  '2550361214': '沉沦之壳',
  // 15024: Ocean-Hued Clam
  '260761190': '海染砗磲',
  // 15025: Vermillion Hereafter
  '235669822': '辰砂往生录',
  // 15026: Shimenawa's Reminiscence
  '1245570190': '追忆之注连',
  // 15027: Deepwood Memories
  '294255758': '深林的记忆',
  // 15028: Gilded Dreams
  '429562510': '饰金之梦',
  // 15029: Desert Pavilion Chronicle
  '1718787446': '沙上楼阁史话',
  // 15030: Flower of Paradise Lost
  '2924198126': '乐园遗落之花',
  // 15031: Marechaussee Hunter
  '3907124974': '逐影猎人',
  // 15032: Golden Troupe
  '2609407638': '黄金剧团',
  // 15033: Song of Days Past
  '1880736934': '昔时之歌',
  // 15034: Nighttime Whispers in the Echoing Woods
  '2533737011': '辰辉往复之录',
  // 15035: Vourukasha's Glow
  '3557567224': '花海甘露之光',
  // 15036: Nymph's Dream
  '2616035840': '水仙之梦',
  // 15037: Harmonic Whimsy
  '4196160804': '谐律异想断章',
  // 15038: Unfinished Reverie
  '1534641900': '未完的暗剧',
  // 15039: Scroll of the Hero of Cinder City
  '408170300': '烬城勇者之卷',
  // 15040: Obsidian Codex
  '3137877609': '黑曜秘典',

  // === New hashes from Enka debug logs ===
  '3626267699': '来歆余响',        // 15024
  '4145306051': '饰金之梦',        // 15026
  '3410220315': '黄金剧团',        // 15032
  '147298547': '流浪大地的乐团',   // 15003
  '3690673363': '穹境示现之夜',    // 15041
  '625305019': '纺月的夜歌',        // 15042
  '2538235187': '沙上楼阁史话',    // 15027
  '894629371': '晨星与月的晓歌',   // 15043
  '1249831355': '逐影猎人',        // 15031
  '1774578891': '黑曜秘典',        // 15038
  '2177723555': '深廊终曲',        // 15040

  // ===== Noblesse Oblige — 额外验证的常用hash =====
  '4021451694': '昔日宗室之仪',

  // ===== Maiden Beloved =====
  '3088315113': '被怜爱的少女',

  // ===== 4星常用套装 =====
  // 15009: Instructor
  '1600414334': '教官',
  // 15010: The Exile
  '1799147854': '流放者',
  // 10003: Traveling Doctor
  '232496686': '游医',
  // 10002: Lucky Dog
  '3286811710': '幸运儿',
  // 10007: Martial Artist
  '2152781502': '武人',
  // 10006: Berserker
  '2301958078': '战狂',
  // 15002: Brave Heart
  '3418857494': '勇者之心',
  // 10004: Resolution of Sojourner
  '2558816190': '行者之心',
  // 15006: Gambler
  '2097515030': '赌徒',
  // 10001: Adventurer
  '3554068574': '冒险家',
  // 10005: Tiny Miracle
  '1440602798': '奇迹',
};

/**
 * Resolve an Enka setNameTextMapHash to a Chinese set name.
 * @param hash - The hash value (number or string)
 * @returns Chinese name or "未知套装(#{hash})" if not found
 */
export function resolveSetName(hash: number | string): string {
  const key = String(hash);
  const known = ARTIFACT_SET_HASH_MAP[key];
  if (known) return known;
  return '';
}

/**
 * Enka icon SetID → Chinese set name.
 * Auto-generated from genshin-db — always up to date.
 * Source: src/data/enka_set_id_map.ts
 */
import { ENKA_SET_ID_NAME_MAP } from './enka_set_id_map';

/**
 * Fuzzy-match an artifact set name from icon/English name to Chinese set name.
 * Used as fallback when hash lookup fails.
 */
export function fuzzyMatchSetName(iconName: string): string {
  if (!iconName) return '';
  // Extract set ID from Enka icon format: UI_RelicIcon_15038_4 → 15038
  const match = iconName.match(/(\d+)/);
  if (!match) return '';
  const setId = parseInt(match[1]);
  // Look up in Enka set ID → Chinese name map
  return ENKA_SET_ID_NAME_MAP[setId] ?? '';
}

/**
 * Mapping from Enka avatarId to Chinese character name.
 * Auto-generated from genshin-db — always up to date.
 * Source: scripts/generate-character-id-map.mjs → src/data/character_id_name_map.ts
 */
import { CHARACTER_ID_NAME_MAP } from './character_id_name_map';

/**
 * Resolve an Enka avatarId to a Chinese character name.
 * @param avatarId - The avatarId (number or string)
 * @returns Chinese name or the avatarId string as fallback
 */
export function resolveCharacterName(avatarId: number | string): string {
  const key = String(avatarId);
  return CHARACTER_ID_NAME_MAP[key] ?? key;
}
