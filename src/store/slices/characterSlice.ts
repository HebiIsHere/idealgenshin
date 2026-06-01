import { create } from 'zustand';
import type { CharacterData, ReactionType, StatConversion, TeamBuff, WeaponConfig, ConstellationConfig, TalentConfig, ZoneBonusInput, StatScaling } from '../../types';
import { getCharacterById } from '../../data/characters';
import { getWeaponsByType } from '../../data/weapons/index';

/** 队伍 Buff 配置（与 TeamBuffPanel 的 TeamBuffConfig 一致）。 */
export interface TeamBuffConfigSlice {
  supportIds: string[];
  artifactIds: string[];
  resonanceId: string;
  moonsignEnabled: boolean;
  moonsignBonus: number;
  customBuffs: Partial<ZoneBonusInput>;
}

function defaultTeamBuffConfig(): TeamBuffConfigSlice {
  return {
    supportIds: [],
    artifactIds: [],
    resonanceId: '',
    moonsignEnabled: false,
    moonsignBonus: 0.36,
    customBuffs: {},
  };
}

/**
 * 角色切片 — 管理角色选择、等级、技能配置、武器配置、命座配置和场景选择。
 */

interface CharacterState {
  /** 当前选中的角色数据（null 表示未选中）。 */
  selectedCharacter: CharacterData | null;
  /** 角色等级 (1-90)。 */
  characterLevel: number;
  /** 技能倍率（小数，如 3.28 表示 328%）。 */
  skillMultiplier: number;
  /** 选中的反应类型。 */
  reactionType: ReactionType;
  /** 队伍增益。 */
  teamBuffs: TeamBuff[];
  /** 增幅反应倍率 (1.5 或 2.0)。 */
  amplifyingMultiplier: number;
  /** 敌人等级。 */
  enemyLevel: number;
  /** 敌人抗性（小数）。 */
  enemyResistance: number;
  /** 武器配置（含被动效果）。 */
  weaponConfig: WeaponConfig | null;
  /** 命座配置。 */
  constellationConfig: ConstellationConfig;
  /** 天赋配置（用户手动填入天赋提供的乘区加成）。 */
  talentConfig: TalentConfig;
  /** 圣遗物套装加成（自动从选中的套装叠加）。 */
  setBonus: ZoneBonusInput;
  /** 属性转模规则（武器被动，如赤沙之杖 em→totalAtk 0.52）。 */
  statConversions: StatConversion[];
  /** 圣遗物套装产生的动态转模（如绝缘之旗印 ER→dmgBonus）。 */
  setConversions: StatConversion[];
  /** 自定义多属性缩放（Tab2 倍率配置）。 */
  customScaling: StatScaling;
  /** 队伍 Buff 面板配置。 */
  teamBuffConfig: TeamBuffConfigSlice;
  /** 菈乌玛命座。 */
  laumaCons: string;
  /** 菈乌玛精通。 */
  laumaEM: number;
  /** Tab2/3 的结果是否已过期（Tab1 数据变更时标记）。 */
  isResultExpired: boolean;
}

interface CharacterActions {
  /** 根据ID选择角色。 */
  selectCharacter: (id: string) => void;
  /** 设置角色等级。 */
  setCharacterLevel: (level: number) => void;
  /** 设置技能倍率。 */
  setSkillMultiplier: (multiplier: number) => void;
  /** 设置反应类型。 */
  setReactionType: (type: ReactionType) => void;
  /** 设置增幅倍率。 */
  setAmplifyingMultiplier: (multiplier: number) => void;
  /** 设置敌人等级。 */
  setEnemyLevel: (level: number) => void;
  /** 设置敌人抗性。 */
  setEnemyResistance: (resistance: number) => void;
  /** 添加队伍增益。 */
  addTeamBuff: (buff: TeamBuff) => void;
  /** 按索引移除队伍增益。 */
  removeTeamBuff: (index: number) => void;
  /** 设置武器配置（选中武器后自动填充基础属性）。 */
  setWeaponConfig: (weaponData: import('../../types').WeaponData, level?: number, refinement?: number) => void;
  /** 设置武器精炼等级。 */
  setWeaponRefinement: (refinement: number) => void;
  /** 设置武器被动效果各乘区加成。 */
  setWeaponPassiveBonus: (bonus: import('../../types').ZoneBonusInput) => void;
  /** 设置命座配置。 */
  setConstellationConfig: (level: number, bonus: import('../../types').ZoneBonusInput) => void;
  /** 设置命座加成（不改变等级）。 */
  setConstellationBonus: (bonus: import('../../types').ZoneBonusInput) => void;
  /** 设置天赋配置（覆盖全部加成）。 */
  setTalentConfig: (bonus: import('../../types').ZoneBonusInput) => void;
  /** 设置圣遗物套装加成。 */
  setSetBonus: (bonus: ZoneBonusInput) => void;
  /** 设置圣遗物套装产生的动态转模。 */
  setSetConversions: (convs: StatConversion[]) => void;
  /** 添加一条属性转模规则。 */
  addStatConversion: (conv: StatConversion) => void;
  /** 按索引删除一条属性转模规则。 */
  removeStatConversion: (index: number) => void;
  /** 替换所有属性转模规则。 */
  setStatConversions: (list: StatConversion[]) => void;
  /** 设置自定义多属性缩放。 */
  setCustomScaling: (scaling: StatScaling) => void;
  /** 设置队伍 Buff 配置。 */
  setTeamBuffConfig: (config: TeamBuffConfigSlice) => void;
  /** 设置菈乌玛配置。 */
  setLaumaConfig: (cons: string, em: number) => void;
  /** 标记 Tab2/3 结果为已过期。 */
  markResultExpired: () => void;
  /** 重置所有角色状态。 */
  reset: () => void;
}

const initialState: CharacterState = {
  selectedCharacter: null,
  characterLevel: 90,
  skillMultiplier: 1.0,
  reactionType: 'NONE' as ReactionType,
  teamBuffs: [],
  amplifyingMultiplier: 0,
  enemyLevel: 90,
  enemyResistance: 0.10,
  weaponConfig: null,
  constellationConfig: {
    level: 0,
    bonus: {},
  },
  talentConfig: {
    bonus: {},
  },
  setBonus: {},
  statConversions: [],
  setConversions: [],
  customScaling: { atkRatio: 3, hpRatio: 0, defRatio: 0, emRatio: 0 },
  teamBuffConfig: defaultTeamBuffConfig(),
  laumaCons: 'c0',
  laumaEM: 0,
  isResultExpired: false,
};

export const useCharacterStore = create<CharacterState & CharacterActions>((set) => ({
  ...initialState,

  selectCharacter: (id: string) => {
    const character = getCharacterById(id);
    if (!character) {
      set({ selectedCharacter: null });
      return;
    }

    // 根据角色武器类型自动选择第一把武器
    const weapons = getWeaponsByType(character.weaponType);
    const defaultWeapon = weapons.length > 0 ? weapons[0] : null;

    set({
      selectedCharacter: character,
      reactionType: 'NONE' as ReactionType,
      teamBuffs: [],
      weaponConfig: defaultWeapon
        ? { weaponData: defaultWeapon, weaponLevel: 90, refinement: 1, passiveBonus: {} }
        : null,
      constellationConfig: { level: 0, bonus: {} },
      talentConfig: { bonus: {} },
      setBonus: {},
      statConversions: [],
      setConversions: [],
      customScaling: { atkRatio: 3, hpRatio: 0, defRatio: 0, emRatio: 0 },
      teamBuffConfig: defaultTeamBuffConfig(),
      laumaCons: 'c0',
      laumaEM: 0,
      isResultExpired: true,
    });
  },

  setCharacterLevel: (level: number) => set({ characterLevel: level }),
  setSkillMultiplier: (multiplier: number) => set({ skillMultiplier: multiplier, isResultExpired: true }),
  setReactionType: (type: ReactionType) => set({ reactionType: type, isResultExpired: true }),
  setAmplifyingMultiplier: (multiplier: number) => set({ amplifyingMultiplier: multiplier }),
  setEnemyLevel: (level: number) => set({ enemyLevel: level }),
  setEnemyResistance: (resistance: number) => set({ enemyResistance: resistance }),

  addTeamBuff: (buff: TeamBuff) =>
    set((state) => ({ teamBuffs: [...state.teamBuffs, buff], isResultExpired: true })),

  removeTeamBuff: (index: number) =>
    set((state) => ({
      teamBuffs: state.teamBuffs.filter((_, i) => i !== index),
      isResultExpired: true,
    })),

  setWeaponConfig: (weaponData, level = 90, refinement = 1) =>
    set({
      weaponConfig: { weaponData, weaponLevel: level, refinement, passiveBonus: {} },
      isResultExpired: true,
    }),

  setWeaponRefinement: (refinement: number) =>
    set((state) => ({
      weaponConfig: state.weaponConfig
        ? { ...state.weaponConfig, refinement }
        : null,
      isResultExpired: true,
    })),

  setWeaponPassiveBonus: (bonus) =>
    set((state) => ({
      weaponConfig: state.weaponConfig
        ? { ...state.weaponConfig, passiveBonus: bonus }
        : null,
      isResultExpired: true,
    })),

  setConstellationConfig: (level, bonus) =>
    set({
      constellationConfig: { level, bonus },
      isResultExpired: true,
    }),

  setConstellationBonus: (bonus) =>
    set((state) => ({
      constellationConfig: { ...state.constellationConfig, bonus },
      isResultExpired: true,
    })),

  setTalentConfig: (bonus) =>
    set({
      talentConfig: { bonus },
      isResultExpired: true,
    }),

  setSetBonus: (bonus) =>
    set({
      setBonus: bonus,
      isResultExpired: true,
    }),

  setSetConversions: (convs) =>
    set({
      setConversions: convs,
      isResultExpired: true,
    }),

  addStatConversion: (conv) =>
    set((state) => ({
      statConversions: [...state.statConversions, conv],
      isResultExpired: true,
    })),

  removeStatConversion: (index) =>
    set((state) => ({
      statConversions: state.statConversions.filter((_, i) => i !== index),
      isResultExpired: true,
    })),

  setStatConversions: (list) =>
    set({
      statConversions: list,
      isResultExpired: true,
    }),

  setCustomScaling: (scaling) =>
    set({ customScaling: scaling, isResultExpired: true }),

  setTeamBuffConfig: (config) =>
    set({ teamBuffConfig: config, isResultExpired: true }),

  setLaumaConfig: (cons, em) =>
    set({ laumaCons: cons, laumaEM: em, isResultExpired: true }),

  markResultExpired: () => set({ isResultExpired: true }),

  reset: () => set(initialState),
}));
