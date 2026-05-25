/**
 * Global TypeScript type definitions for 理想原生 (Ideal Nascent).
 * All percentage values are stored as decimals internally (e.g. 50% → 0.5).
 */

// ===== Enumerations =====

/** Artifact stat types (used for both main stats and sub-stats). */
export enum SubstatType {
  ATK_PERCENT = 'ATK_PERCENT',
  ATK_FLAT = 'ATK_FLAT',
  HP_PERCENT = 'HP_PERCENT',
  HP_FLAT = 'HP_FLAT',
  DEF_PERCENT = 'DEF_PERCENT',
  DEF_FLAT = 'DEF_FLAT',
  CRIT_RATE = 'CRIT_RATE',
  CRIT_DMG = 'CRIT_DMG',
  ELEMENTAL_MASTERY = 'ELEMENTAL_MASTERY',
  ENERGY_RECHARGE = 'ENERGY_RECHARGE',
  // Elemental damage bonus (main-stat only on Goblet)
  PYRO_DMG_BONUS = 'PYRO_DMG_BONUS',
  HYDRO_DMG_BONUS = 'HYDRO_DMG_BONUS',
  CRYO_DMG_BONUS = 'CRYO_DMG_BONUS',
  ELECTRO_DMG_BONUS = 'ELECTRO_DMG_BONUS',
  ANEMO_DMG_BONUS = 'ANEMO_DMG_BONUS',
  GEO_DMG_BONUS = 'GEO_DMG_BONUS',
  DENDRO_DMG_BONUS = 'DENDRO_DMG_BONUS',
  PHYSICAL_DMG_BONUS = 'PHYSICAL_DMG_BONUS',
  HEALING_BONUS = 'HEALING_BONUS',
}

/** 元素类型。 */
export enum ElementType {
  PYRO = 'PYRO',
  HYDRO = 'HYDRO',
  CRYO = 'CRYO',
  ELECTRO = 'ELECTRO',
  ANEMO = 'ANEMO',
  GEO = 'GEO',
  DENDRO = 'DENDRO',
}

/** Artifact slot (piece) types. */
export enum ArtifactSlotType {
  FLOWER = 'FLOWER',
  FEATHER = 'FEATHER',
  SANDS = 'SANDS',
  GOBLET = 'GOBLET',
  CIRCLET = 'CIRCLET',
}

/** Elemental reaction types. */
export enum ReactionType {
  NONE = 'NONE',
  // Amplifying reactions
  VAPORIZE = 'VAPORIZE',
  MELT = 'MELT',
  // Transformative reactions
  OVERLOADED = 'OVERLOADED',
  SUPERCONDUCT = 'SUPERCONDUCT',
  ELECTRO_CHARGED = 'ELECTRO_CHARGED',
  SWIRL = 'SWIRL',
  HYPERBLOOM = 'HYPERBLOOM',
  BLOOM = 'BLOOM',
  BURGEON = 'BURGEON',
  BURNING = 'BURNING',
  SHATTER = 'SHATTER',
  // Catalyze reactions
  AGGRAVATION = 'AGGRAVATION',
  SPREAD = 'SPREAD',
  // Moonsign reactions
  MOON_BLOOM = 'MOON_BLOOM',
  MOON_ELECTRO = 'MOON_ELECTRO',
  MOON_CRYSTAL = 'MOON_CRYSTAL',
  REACTION_MOON_ELECTRO = 'REACTION_MOON_ELECTRO',
  REACTION_MOON_CRYSTAL = 'REACTION_MOON_CRYSTAL',
}

/** Damage calculation path — determines which zone pipeline is used. */
export enum DamagePath {
  DIRECT = 'DIRECT',
  AMPLIFYING = 'AMPLIFYING',
  TRANSFORMATIVE = 'TRANSFORMATIVE',
  CATALYZE = 'CATALYZE',
  MOONSIGN = 'MOONSIGN',
  /** 直伤月反应(BaseDamageZone→Crit→Resist→Elevation)。含技能倍率。 */
  MOONSIGN_DIRECT = 'MOONSIGN_DIRECT',
}

/**
 * Damage scaling type (determines which stat the damage scales off).
 * @deprecated Use StatScaling instead. This enum will be removed in a future version.
 */
export enum ScalingType {
  ATK = 'ATK',
  HP = 'HP',
  DEF = 'DEF',
}

/** Weapon type classification. */
export enum WeaponType {
  SWORD = 'SWORD',
  CLAYMORE = 'CLAYMORE',
  POLEARM = 'POLEARM',
  BOW = 'BOW',
  CATALYST = 'CATALYST',
}

// ===== Data Models =====

/** Multi-attribute scaling ratios. Base = Σ(stat × ratio). */
export interface StatScaling {
  /** ATK scaling ratio (0–1, default 0). */
  atkRatio: number;
  /** HP scaling ratio (0–1, default 0). */
  hpRatio: number;
  /** DEF scaling ratio (0–1, default 0). */
  defRatio: number;
  /** EM scaling ratio (0–1, default 0). */
  emRatio: number;
}

/** Base character stats at a given level (before any gear). */
export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  critRate: number;
  critDmg: number;
  em: number;
  er: number;
}

/** Ascension stat bonus (e.g. Hu Tao gets CRIT DMG on ascension). */
export interface AscensionStat {
  type: SubstatType;
  /** Values indexed by ascension phase (0–6). 90-level chars use index 6. */
  values: number[];
}

/** Character data loaded from JSON configuration. */
export interface CharacterData {
  id: string;
  name: string;
  nameZh: string;
  element: ElementType;
  weaponType: WeaponType;
  baseStats: BaseStats;
  ascensionStat: AscensionStat;
  /** Sub-stats relevant to this character's optimization. */
  relevantSubstats: SubstatType[];
  /** Default multi-attribute scaling for damage calculation. */
  defaultStatScaling: StatScaling;
}

/** Single refinement level data for a weapon. */
export interface RefinementLevel {
  /** Chinese description with refinement-scaled values substituted. */
  description: string;
  /** Placeholder values for {0}, {1}, {2}, ... */
  values: string[];
}

/** Weapon data loaded from JSON configuration. */
export interface WeaponData {
  id: string;
  name: string;
  nameZh: string;
  rarity: number;
  weaponType: WeaponType;
  baseAtk: number;
  substatType: SubstatType;
  /** Percentage sub-stats stored as decimal (e.g. 0.466 for 46.6%). Flat stats stored as raw value. */
  substatValue: number;
  passiveName: string;
  passiveDesc: string;
  /** Refinement-level passive descriptions (index 0 = R1, ..., index 4 = R5). */
  refinements?: RefinementLevel[];
}

/** A single sub-stat entry on an artifact. */
export interface SubStatEntry {
  type: SubstatType;
  /** Stored as decimal for percentage types, flat for flat types. */
  value: number;
}

/** An artifact instance (one of 5 pieces). */
export interface ArtifactInstance {
  id: string;
  slot: ArtifactSlotType;
  mainStatType: SubstatType;
  mainStatValue: number;
  subStats: SubStatEntry[];
  setName: string;
}

/** Allocation of N rolls to a sub-stat type. */
export interface SubstatAllocation {
  type: SubstatType;
  /** Number of rolls (integer). */
  rolls: number;
}

/** Team buff entry. */
export interface TeamBuff {
  name: string;
  statType: SubstatType;
  /** Flat or percentage value. */
  value: number;
}

// ===== Stat Conversion =====

/**
 * 属性转模规则。
 * 用于武器被动/圣遗物效果中"基于当前面板某属性按比例转换为另一属性"的机制。
 *
 * 武器示例：
 *   赤沙之杖: from='em', to='totalAtk', ratio=0.52  → totalAtk += em × 0.52
 *   圣显之钥: from='totalHp', to='totalAtk', ratio=0.0052 → totalAtk += HP × 0.52%
 *
 * 圣遗物示例：
 *   饰金之梦 4件套: from='totalAtk', to='dmgBonus', ratio=0.14
 *
 * 所有计算为 flat addition（目标 += 源 × 比例），不经过百分比路径。
 */
export interface StatConversion {
  /** 源属性（从 ComputedStats 中读取）。 */
  from: 'totalHp' | 'totalAtk' | 'totalDef' | 'em' | 'er';
  /** 目标属性（叠加到 ComputedStats 的对应字段）。
   *  baseDamageFlat 为基础伤害区固定值（绝缘之旗印类羽毛机制）。 */
  to: 'totalHp' | 'totalAtk' | 'totalDef' | 'dmgBonus' | 'critRate' | 'critDmg' | 'baseDamageFlat';
  /** 转换比例（十进制）。如 52% → 0.52，0.52% → 0.0052。 */
  ratio: number;
  /** 目标属性叠加上限（可选）。如绝缘之旗印 dmgBonus 上限 0.75。 */
  maxCap?: number;
}

// ===== Build & Stats =====

/** A complete character build specification. */
export interface CharacterBuild {
  character: CharacterData;
  /** 武器配置（含被动效果），替代旧版 weapon: WeaponData */
  weaponConfig: WeaponConfig;
  artifacts: ArtifactInstance[];
  characterLevel: number;
  skillMultiplier: number;
  reactionType: ReactionType;
  teamBuffs: TeamBuff[];
  /** 队伍 buff 面板计算的合并加成（辅助+圣遗物+共鸣+月曜+自定义）。 */
  teamBuffBonuses?: ZoneBonusInput;
  /** Optional stat scaling override; falls back to character.defaultStatScaling. */
  statScaling?: StatScaling;
  /** 命座配置 */
  constellationConfig: ConstellationConfig;
  /** 天赋配置（用户手动填入天赋提供的独立乘区等加成）。 */
  talentConfig: TalentConfig;
  /** 圣遗物套装加成（自动从选中的套装叠加）。 */
  setBonus: ZoneBonusInput;
  /** 增幅反应基础系数（1.5 或 2.0），0 表示由引擎 fallback 为 1.5。 */
  amplifyingMultiplier?: number;
  /** 倍率提升乘区（如行秋 C4 ×1.5、宵宫 E ×1.5~1.7）。默认 1.0。 */
  baseDmgMultiplier?: number;
  /** 属性转模规则列表（武器被动/圣遗物效果）。
   *  在静态属性计算完成后，用第一轮面板值计算映射叠加。
   *  武器示例：赤沙之杖 [{ from:'em', to:'totalAtk', ratio:0.52 }] */
  statConversions?: StatConversion[];
}

/** Computed final stats after applying all modifiers. */
export interface ComputedStats {
  totalHp: number;
  totalAtk: number;
  totalDef: number;
  critRate: number;
  critDmg: number;
  dmgBonus: number;
  em: number;
  er: number;
  /** 动态生成的基础伤害区固定值（如来歆余响 4件套: ATK × 70%）。 */
  baseDamageFlat?: number;
}

/** Context passed into the damage formula pipeline. */
export interface DamageContext {
  stats: ComputedStats;
  skillMultiplier: number;
  /** Base DMG Multiplier (e.g. Xingqiu C4 ×1.5, Yoimiya E ×1.5~1.7). Multiplied directly into skill multiplier. Defaults to 1.0. */
  baseDmgMultiplier?: number;
  /** Multi-attribute scaling ratios. Replaces the deprecated ScalingType. */
  statScaling: StatScaling;
  reactionType: ReactionType;
  enemyLevel: number;
  enemyResistance: number;
  amplifyingMultiplier: number;
  /** Character level for defense calculation. Defaults to 90. */
  characterLevel?: number;
  /** Defense reduction ratios (e.g. Superconduct 0.4). Sum is clamped to [0, DEF_REDUCTION_CAP (0.9)]. Defaults to []. */
  defReductions?: number[];
  /** Defense ignore ratio (e.g. Raiden C2 0.6). Defaults to 0. */
  defIgnore?: number;
  /** Monster defense increase ratios (e.g. domain buff stones). Defaults to []. */
  defIncreases?: number[];
  /** Elevation bonus for Moonsign path. Defaults to 0. */
  elevationBonus?: number;
  /** 额外乘区加成（武器被动 + 命座），各乘区从中读取并叠加。 */
  extraBonuses: ZoneBonusInput;
  /** 独立乘区加成（天赋/命座提供的独立于增伤区的乘数）。 */
  independentBonus: number;
}

// ===== Damage Result =====

/** Output of the damage formula — total damage and per-zone multipliers. */
export interface DamageResult {
  totalDamage: number;
  baseDamage: number;
  scalingMultiplier: number;
  bonusMultiplier: number;
  critMultiplier: number;
  resistanceMultiplier: number;
  defenseMultiplier: number;
  reactionMultiplier: number;
  /** Which damage path was used for this calculation. */
  damagePath: DamagePath;
  /** Aggravation/Spray bonus added to base damage (Catalyze path only). */
  aggravationBonus?: number;
  /** Elevation multiplier (Moonsign path only). */
  elevationMultiplier?: number;
  /** Independent multiplier (talent/constellation special bonuses). */
  independentMultiplier?: number;
  /** Debug: per-zone calculation breakdowns. */
  baseDebug?: { totalAtk: number; skillMultiplier: number; rawBase: number; baseDamageFlat: number; result: number };
  bonusDebug?: { dmgBonus: number; result: number };
  critDebug?: { critRate: number; critDmg: number; effectiveCritRate: number; result: number };
  resistDebug?: { enemyResistance: number; resistReduction: number; effectiveRes: number; result: number };
  defenseDebug?: { characterLevel: number; enemyLevel: number; charTerm: number; enemyTerm: number; defReductionSum: number; defIncreaseSum: number; defIgnore: number; effectiveEnemyDef: number; result: number };
  ampDebug?: { baseMultiplier: number; em: number; emBonus: number; ampReactionBonus: number; result: number };
  transDebug?: { rate: number; levelMultiplier: number; em: number; emBonus: number; transformReactionBonus: number; result: number };
  cataDebug?: { baseRate: number; levelMultiplier: number; em: number; emBonus: number; result: number };
  moonDebug?: { moonRate: number; levelMultiplier: number; em: number; emBonus: number; moonReactionBonus: number; result: number };
  elevDebug?: { elevationBonus: number; result: number };
  indepDebug?: { talentBonus: number; ctxBonus: number; result: number };
  authorityDebug?: { authorityMultiplier: number; result: number };
  featherDebug?: { flat: number; scalingSum: number; result: number };
  prayerDebug?: { flat: number; scalingSum: number; result: number };
  masteryDebug?: { em: number; emBonus: number; result: number; type: string };
  moonSignDebug?: { moonBonus: number; result: number };
}

// ===== Optimizer Request/Response =====

/** Request for the redistribute optimizer. */
export interface RedistributeRequest {
  build: CharacterBuild;
  currentAllocations: SubstatAllocation[];
}

/** Result from the redistribute optimizer. */
export interface RedistributeResult {
  originalDamage: number;
  optimizedDamage: number;
  improvementPercent: number;
  optimizedAllocations: SubstatAllocation[];
  currentAllocations: SubstatAllocation[];
  /** Detailed per-zone breakdown of the original damage calculation. */
  originalBreakdown?: DamageResult;
  /** Detailed per-zone breakdown of the optimized damage calculation. */
  optimizedBreakdown?: DamageResult;
  /** Optimized character stats. */
  optimizedStats?: ComputedStats;
  /** Original character stats. */
  originalStats?: ComputedStats;
}

/** Request for the ideal template optimizer. */
export interface IdealRequest {
  character: CharacterData;
  totalRolls: number;
  skillMultiplier: number;
  reactionType: ReactionType;
  /** 增幅反应基础系数（1.5 或 2.0）。 */
  amplifyingMultiplier?: number;
  /** 倍率提升乘区（如行秋 C4 ×1.5）。默认 1.0。 */
  baseDmgMultiplier?: number;
  /** 使用当前角色构建（含武器/命座/套装/队伍 buff）而非默认参考构建。 */
  build?: CharacterBuild;
  /** 是否搜索主词条组合（420 种）。默认 false，保持向后兼容。 */
  searchMainStats?: boolean;
}

/** Result from the ideal template optimizer. */
export interface IdealResult {
  theoreticalDamage: number;
  idealAllocations: SubstatAllocation[];
  /** Detailed per-zone breakdown of the ideal damage calculation. */
  breakdown?: DamageResult;
  /** Optimized character stats. */
  idealStats?: ComputedStats;
  /** 主词条组合（仅在 searchMainStats=true 时有值）。 */
  mainStatCombo?: {
    sands: SubstatType;
    goblet: SubstatType;
    circlet: SubstatType;
  };
  /** DEBUG: build summary for troubleshooting. */
  _debug?: {
    artifacts: number;
    weapon: string;
    totalAtk: number;
    skillMultiplier: number;
    reactionType: string;
    firstDamage: number;
  };
}

// ===== Artifact Set Data (P2) =====

/** Artifact set data skeleton (to be populated in P2). */
export interface ArtifactSetData {
  id: string;
  name: string;
  nameZh: string;
  twoPcEffect: string;
  fourPcEffect: string;
  /** Structured 2-piece bonus values. */
  twoPcBonus?: Partial<ZoneBonusInput>;
  /** Structured 4-piece bonus values. */
  fourPcBonus?: Partial<ZoneBonusInput>;
  /** Dynamic 2-piece bonus (stat-dependent, e.g. 绝缘 ER→DMG). */
  twoPcDynamic?: StatConversion;
  /** Dynamic 4-piece bonus (stat-dependent, e.g. 来歆 ATK→baseDamageFlat). */
  fourPcDynamic?: StatConversion;
}

// ===== Showcase & Set Bonus =====

/** 2/4-piece set bonus detection result. */
export interface SetBonusResult {
  /** Artifact set name in Chinese (e.g. "炽烈的炎之魔女"). */
  setName: string;
  /** Number of artifacts from this set equipped by the character. */
  count: number;
  /** Whether the 2-piece bonus is active (count >= 2). */
  bonus2: boolean;
  /** Whether the 4-piece bonus is active (count >= 4). */
  bonus4: boolean;
}

/** A character parsed from Enka Network showcase data. */
export interface ShowcaseCharacter {
  /** Enka avatarId (e.g. 10000002). */
  characterId: string;
  /** Character name resolved from nameTextMapHash, or avatarId as fallback. */
  characterName: string;
  /** Character level. */
  characterLevel: number;
  /** Artifacts equipped on this character. */
  artifacts: ArtifactInstance[];
  /** Detected 2/4-piece set bonuses for this character. */
  setBonuses: SetBonusResult[];
  /** Weapon projectile ID from Enka (itemId), or null if not found. */
  weaponProjectId: string | null;
  /** Weapon level from Enka (1-90). */
  weaponLevel: number;
  /** Weapon refinement rank from Enka (1-5). */
  weaponRefinement: number;
}

// ===== V2: Zone Bonus & Weapon/Constellation Input =====

/** Per-zone bonus input for weapon passive and constellation effects. */
export interface ZoneBonusInput {
  /** Attack zone bonus (percentage, e.g. 0.2 = +20% ATK). */
  atkPercent?: number;
  /** Attack zone bonus (flat value, e.g. 300 = +300 ATK). */
  atkFlat?: number;
  /** HP zone bonus (percentage). */
  hpPercent?: number;
  /** HP zone bonus (flat value). */
  hpFlat?: number;
  /** Defense zone bonus (percentage). */
  defPercent?: number;
  /** Defense zone bonus (flat value). */
  defFlat?: number;
  /** Damage bonus zone (percentage, e.g. 0.3 = +30% DMG bonus). */
  dmgBonus?: number;
  /** Crit rate bonus (percentage, e.g. 0.08 = +8% CR). */
  critRate?: number;
  /** Crit damage bonus (percentage, e.g. 0.4 = +40% CD). */
  critDmg?: number;
  /** Elemental mastery bonus (flat value, e.g. 60 = +60 EM). */
  elementalMastery?: number;
  /** Energy recharge bonus (percentage). */
  energyRecharge?: number;
  /** Resistance reduction (percentage, e.g. 0.2 = -20% resist). */
  resistReduction?: number;
  /** Base damage bonus (flat value, added to baseDamage). */
  baseDamageFlat?: number;
  /** Defense ignore ratio (e.g. 0.6 = ignore 60% DEF). */
  defIgnore?: number;
  /** Monster defense increase ratios (e.g. domain buff stones). */
  defIncreases?: number[];
  /** Defense reduction ratios (e.g. Superconduct 0.4). */
  defReductions?: number[];
  /** Reaction damage bonus for transformative reactions (e.g. 0.4 = +40%). */
  transformReactionBonus?: number;
  /** Reaction damage bonus for moonsign reactions. */
  moonReactionBonus?: number;
  /** Amplifying reaction DMG bonus (Vaporize/Melt coefficient, e.g. 0.15 = +15%). Stacked with EM bonus. */
  ampReactionBonus?: number;
  /** Independent damage multiplier bonus (e.g. 0.5 = +50% independent). */
  independentBonus?: number;
  /** Elevation bonus for Moonsign path (e.g. 0.3 = +30%). */
  elevationBonus?: number;
  /** 大权区倍率（有条件额外倍率，如那维莱特）。 */
  authorityMultiplier?: number;
  /** 羽毛型附伤：固定值（申鹤式附加伤害）。 */
  featherFlat?: number;
  /** 羽毛型附伤：属性×缩放比。 */
  featherScaling?: { atkRatio?: number; hpRatio?: number; defRatio?: number; emRatio?: number };
  /** 祷歌型附伤：固定值（菈乌玛式附加伤害）。 */
  prayerFlat?: number;
  /** 祷歌型附伤：属性×缩放比。 */
  prayerScaling?: { atkRatio?: number; hpRatio?: number; defRatio?: number; emRatio?: number };
  /** 月兆区加成（百分比，如 0.10 = +10%）。 */
  moonSignBonus?: number;
}

/** Weapon configuration selected by the user. */
export interface WeaponConfig {
  /** Selected weapon data (auto-fills base ATK + sub stat). */
  weaponData: WeaponData;
  /** Weapon level (default 90). */
  weaponLevel: number;
  /** Weapon refinement rank (1-5, default 1). */
  refinement: number;
  /** Weapon passive per-zone bonuses (user manually fills). */
  passiveBonus: ZoneBonusInput;
}

/** Constellation configuration. */
export interface ConstellationConfig {
  /** Current constellation level (0-6). */
  level: number;
  /** Per-zone bonuses from constellations (user manually fills). */
  bonus: ZoneBonusInput;
}

/** Talent configuration. */
export interface TalentConfig {
  /** Per-zone bonuses from talents (user manually fills). */
  bonus: ZoneBonusInput;
}

// ===== V2: Typical Scenario =====

/** A preset typical damage scenario. */
// ===== V2: Damage Comparison =====

/** Damage comparison result (before vs after optimization). */
export interface DamageComparison {
  /** Scenario name. */
  scenarioName: string;
  /** Current configuration damage. */
  currentDamage: number;
  /** Optimized configuration damage. */
  optimizedDamage: number;
  /** Damage improvement percentage. */
  improvementPercent: number;
  /** Current configuration damage breakdown. */
  currentBreakdown: DamageResult;
  /** Optimized configuration damage breakdown. */
  optimizedBreakdown: DamageResult;
}

// ===== V2: Zone Analysis =====

/** Single zone analysis entry. */
export interface ZoneAnalysisEntry {
  /** Zone name. */
  zoneName: string;
  /** Current substat rolls. */
  currentRolls: number;
  /** Optimized substat rolls. */
  optimizedRolls: number;
  /** Roll change. */
  rollChange: number;
  /** This zone's contribution to total damage improvement (percentage). */
  damageContribution: number;
}

/** Zone analysis result. */
export interface ZoneAnalysis {
  /** Per-zone analysis entries. */
  entries: ZoneAnalysisEntry[];
  /** Total current rolls. */
  totalCurrentRolls: number;
  /** Total optimized rolls. */
  totalOptimizedRolls: number;
  /** Total damage improvement percentage. */
  totalImprovement: number;
}

// ===== V2: Character Save =====

/** Complete character save data. */
export interface CharacterSave {
  /** Unique save ID (UUID). */
  saveId: string;
  /** Save name (defaults to character name). */
  name: string;
  /** Creation time (ISO 8601). */
  createdAt: string;
  /** Last update time (ISO 8601). */
  updatedAt: string;
  /** Character ID. */
  characterId: string;
  /** Character level. */
  characterLevel: number;
  /** Weapon configuration. */
  weaponConfig: WeaponConfig;
  /** Constellation configuration. */
  constellationConfig: ConstellationConfig;
  /** Talent configuration. */
  talentConfig: TalentConfig;
  /** Artifacts (5 pieces). */
  artifacts: ArtifactInstance[];
  /** Whether imported from Enka. */
  fromEnka: boolean;
  /** Enka UID (optional, only for Enka imports). */
  uid?: string;
  /** 技能倍率（Tab2 覆盖值）。可选，向后兼容。 */
  skillMultiplier?: number;
  /** 反应类型（Tab2 选择值）。可选，向后兼容。 */
  reactionType?: string;
  /** 增幅反应倍率。可选，向后兼容。 */
  amplifyingMultiplier?: number;
  /** 武器属性转模规则。可选，向后兼容。 */
  statConversions?: StatConversion[];
  /** 队伍增益列表。可选，向后兼容。 */
  teamBuffs?: TeamBuff[];
  /** 圣遗物套装静态加成。可选，向后兼容。 */
  setBonus?: ZoneBonusInput;
}

/** Export file format. */
export interface ExportData {
  /** File format version. */
  version: string;
  /** Export timestamp (ISO 8601). */
  exportedAt: string;
  /** App identifier. */
  app: string;
  /** Character saves. */
  saves: CharacterSave[];
}
