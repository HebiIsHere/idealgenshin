import { ElementType, ReactionType, DamagePath } from '../types';

/**
 * A reaction option available to a character in the damage calculator.
 */
export interface ReactionOption {
  type: ReactionType;
  label: string;
  damagePath: DamagePath;
  /** 增幅反应倍率（蒸发/融化专用，自动定死）。 */
  amplifyingMultiplier?: number;
}

/** 挪德卡莱角色名单（可触发直伤月反应）。 */
const NOD_KRAI_CHARS = new Set([
  'aino',      // 爱诺（水）
  'columbina', // 哥伦比娅（水）
  'flins',     // 菲林斯（雷）
  'illuga',    // 叶洛亚（岩）
  'jahoda',    // 雅珂达（风）
  'lauma',     // 菈乌玛（草）
  'linnea',    // 莉奈娅（岩）
  'nefer',     // 奈芙尔（草）
  'ineffa',    // 伊涅芙（雷）
  'zibai',     // 兹白（岩）
]);

/** 检查角色是否为挪德卡莱角色（能触发直伤月反应）。 */
export function isNodKraiCharacter(characterId: string): boolean {
  return NOD_KRAI_CHARS.has(characterId);
}

/**
 * 根据角色元素和挪德卡莱状态获取可用的反应选项。
 *
 * 规则：
 * - 所有角色都有"直伤"（无反应）
 * - 火：直伤 + 蒸发(1.5×) + 融化(2.0×)
 * - 水：直伤 + 蒸发(2.0×)
 * - 冰：直伤 + 融化(1.5×)
 * - 雷：直伤 + 超激化
 * - 草：直伤 + 蔓激化
 * - 风/岩：仅直伤（无增幅/激化反应）
 * - 挪德卡莱角色追加对应的直伤月反应
 */
export function getReactionOptions(element: ElementType, isNod: boolean): ReactionOption[] {
  const options: ReactionOption[] = [
    { type: ReactionType.NONE, label: '直伤（无反应）', damagePath: DamagePath.DIRECT },
  ];

  switch (element) {
    case ElementType.PYRO:
      options.push({ type: ReactionType.VAPORIZE, label: '蒸发（火打水 1.5×）', damagePath: DamagePath.AMPLIFYING, amplifyingMultiplier: 1.5 });
      options.push({ type: ReactionType.MELT, label: '融化（火打冰 2.0×）', damagePath: DamagePath.AMPLIFYING, amplifyingMultiplier: 2.0 });
      break;
    case ElementType.HYDRO:
      options.push({ type: ReactionType.VAPORIZE, label: '蒸发（水打火 2.0×）', damagePath: DamagePath.AMPLIFYING, amplifyingMultiplier: 2.0 });
      break;
    case ElementType.CRYO:
      options.push({ type: ReactionType.MELT, label: '融化（冰打火 1.5×）', damagePath: DamagePath.AMPLIFYING, amplifyingMultiplier: 1.5 });
      break;
    case ElementType.ELECTRO:
      options.push({ type: ReactionType.AGGRAVATION, label: '超激化', damagePath: DamagePath.CATALYZE });
      break;
    case ElementType.DENDRO:
      options.push({ type: ReactionType.SPREAD, label: '蔓激化', damagePath: DamagePath.CATALYZE });
      break;
    case ElementType.ANEMO:
    case ElementType.GEO:
      break;
  }

  if (isNod) {
    switch (element) {
      case ElementType.ELECTRO:
        options.push({ type: ReactionType.REACTION_MOON_ELECTRO, label: '直伤月感电', damagePath: DamagePath.MOONSIGN_DIRECT });
        break;
      case ElementType.GEO:
        options.push({ type: ReactionType.REACTION_MOON_CRYSTAL, label: '直伤月结晶', damagePath: DamagePath.MOONSIGN_DIRECT });
        break;
      case ElementType.HYDRO:
      case ElementType.DENDRO:
        options.push({ type: ReactionType.MOON_BLOOM, label: '月绽放', damagePath: DamagePath.MOONSIGN });
        break;
      case ElementType.ANEMO:
        break;
    }
  }

  return options;
}
