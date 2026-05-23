import { create } from 'zustand';
import type { CharacterSave } from '../../types';
import { SaveService, type ImportResult } from '../../services/save';
import { useCharacterStore } from './characterSlice';
import { useArtifactStore } from './artifactSlice';
import { ArtifactSlotType } from '../../types';

/**
 * 存档切片 — 管理角色存档列表、当前存档ID、导入导出状态。
 */

interface SaveState {
  /** 所有存档列表。 */
  saves: CharacterSave[];
  /** 当前加载的存档ID。 */
  currentSaveId: string | null;
  /** 导入错误信息。 */
  importError: string | null;
  /** 最近一次导入结果。 */
  lastImportResult: ImportResult | null;
}

interface SaveActions {
  /** 从 SaveService 加载所有存档。 */
  listSaves: () => void;
  /** 加载指定存档，恢复 characterSlice 和 artifactSlice 状态。 */
  loadSave: (saveId: string) => void;
  /** 保存当前角色配置为存档（新建或覆盖）。 */
  saveCurrent: () => void;
  /** 更新当前已有的存档。 */
  updateCurrent: () => void;
  /** 删除指定存档。 */
  deleteSave: (saveId: string) => void;
  /** 重命名存档。 */
  renameSave: (saveId: string, newName: string) => void;
  /** 导出存档为 JSON 字符串。 */
  exportSaves: (saveIds: string[], includeUid?: boolean) => string;
  /** 从 JSON 字符串导入存档。 */
  importSaves: (jsonStr: string) => ImportResult;
  /** 清除导入错误。 */
  clearImportError: () => void;
  /** 设置当前存档ID。 */
  setCurrentSaveId: (saveId: string | null) => void;
  /** 重置状态。 */
  reset: () => void;
}

const initialState: SaveState = {
  saves: [],
  currentSaveId: null,
  importError: null,
  lastImportResult: null,
};

export const useSaveStore = create<SaveState & SaveActions>((set, get) => ({
  ...initialState,

  listSaves: () => {
    const saves = SaveService.listSaves();
    set({ saves });
  },

  loadSave: (saveId: string) => {
    const save = SaveService.getSave(saveId);
    if (!save) return;

    // 恢复 characterSlice 状态
    const characterStore = useCharacterStore.getState();
    characterStore.selectCharacter(save.characterId);
    characterStore.setCharacterLevel(save.characterLevel);

    // 恢复武器配置
    if (save.weaponConfig) {
      // 需要通过 characterStore 的 setWeaponConfig 设置
      characterStore.setWeaponConfig(save.weaponConfig.weaponData, save.weaponConfig.weaponLevel, save.weaponConfig.refinement ?? 1);
      characterStore.setWeaponPassiveBonus(save.weaponConfig.passiveBonus);
    }

    // 恢复命座配置
    characterStore.setConstellationConfig(save.constellationConfig.level, save.constellationConfig.bonus);

    // 恢复天赋配置
    if (save.talentConfig) {
      characterStore.setTalentConfig(save.talentConfig.bonus);
    }

    // 恢复场景选择
    characterStore.setSelectedScenario(save.selectedScenarioId ?? null);

    // 恢复 Tab2 倍率/反应
    if (save.skillMultiplier !== undefined && save.skillMultiplier !== null) {
      characterStore.setSkillMultiplier(save.skillMultiplier);
    }
    if (save.reactionType !== undefined && save.reactionType !== null) {
      characterStore.setReactionType(save.reactionType as any);
    }
    if (save.amplifyingMultiplier !== undefined && save.amplifyingMultiplier !== null) {
      characterStore.setAmplifyingMultiplier(save.amplifyingMultiplier);
    }

    // 恢复武器转模
    if (save.statConversions) {
      characterStore.setStatConversions(save.statConversions);
    }

    // 恢复队伍增益
    if (save.teamBuffs) {
      // 逐个添加
      for (const buff of save.teamBuffs) {
        characterStore.addTeamBuff(buff);
      }
    }

    // 恢复套装静态加成
    if (save.setBonus) {
      characterStore.setSetBonus(save.setBonus);
    }

    // 恢复 artifactSlice 状态
    const artifactStore = useArtifactStore.getState();
    artifactStore.setAllArtifacts(save.artifacts);

    set({ currentSaveId: saveId });
  },

  saveCurrent: () => {
    const characterStore = useCharacterStore.getState();
    const artifactStore = useArtifactStore.getState();
    const { currentSaveId } = get();

    const selectedCharacter = characterStore.selectedCharacter;
    if (!selectedCharacter) return;

    // 收集圣遗物列表
    const artifacts = Object.values(ArtifactSlotType)
      .map((slot) => artifactStore.artifacts[slot])
      .filter((a): a is NonNullable<typeof a> => a !== null);

    // 检查是否有武器配置
    const weaponConfig = characterStore.weaponConfig ?? {
      weaponData: {
        id: 'default_weapon',
        name: 'Dull Blade',
        nameZh: '无锋剑',
        rarity: 1,
        weaponType: selectedCharacter.weaponType,
        baseAtk: 23,
        substatType: 'ATK_PERCENT' as any,
        substatValue: 0,
        passiveName: '',
        passiveDesc: '',
      },
      weaponLevel: 90,
      refinement: 1,
      passiveBonus: {},
    };

    const extraFields = {
      skillMultiplier: characterStore.skillMultiplier,
      reactionType: characterStore.reactionType,
      amplifyingMultiplier: characterStore.amplifyingMultiplier,
      statConversions: characterStore.statConversions?.length > 0 ? characterStore.statConversions : undefined,
      teamBuffs: characterStore.teamBuffs?.length > 0 ? characterStore.teamBuffs : undefined,
      setBonus: Object.keys(characterStore.setBonus).length > 0 ? characterStore.setBonus : undefined,
    };

    if (currentSaveId) {
      // 更新已有存档
      const existing = SaveService.getSave(currentSaveId);
      if (existing) {
        const updated: CharacterSave = {
          ...existing,
          ...extraFields,
          characterId: selectedCharacter.id,
          characterLevel: characterStore.characterLevel,
          weaponConfig,
          constellationConfig: characterStore.constellationConfig,
          talentConfig: characterStore.talentConfig,
          artifacts,
          selectedScenarioId: characterStore.selectedScenarioId ?? '',
          fromEnka: false,
        };
        SaveService.saveCharacter(updated);
      }
    } else {
      // 新建存档
      const newSave = SaveService.createSave({
        ...extraFields,
        name: selectedCharacter.nameZh,
        characterId: selectedCharacter.id,
        characterLevel: characterStore.characterLevel,
        weaponConfig,
        constellationConfig: characterStore.constellationConfig,
        talentConfig: characterStore.talentConfig,
        artifacts,
        selectedScenarioId: characterStore.selectedScenarioId ?? '',
        fromEnka: false,
      });
      SaveService.saveCharacter(newSave);
      set({ currentSaveId: newSave.saveId });
    }

    // 刷新存档列表
    const saves = SaveService.listSaves();
    set({ saves });
  },

  updateCurrent: () => {
    const { currentSaveId } = get();
    if (!currentSaveId) return;

    const characterStore = useCharacterStore.getState();
    const artifactStore = useArtifactStore.getState();
    const selectedCharacter = characterStore.selectedCharacter;
    if (!selectedCharacter) return;

    const artifacts = Object.values(ArtifactSlotType)
      .map((slot) => artifactStore.artifacts[slot])
      .filter((a): a is NonNullable<typeof a> => a !== null);

    const weaponConfig = characterStore.weaponConfig ?? {
      weaponData: {
        id: 'default_weapon',
        name: 'Dull Blade',
        nameZh: '无锋剑',
        rarity: 1,
        weaponType: selectedCharacter.weaponType,
        baseAtk: 23,
        substatType: 'ATK_PERCENT' as any,
        substatValue: 0,
        passiveName: '',
        passiveDesc: '',
      },
      weaponLevel: 90,
      refinement: 1,
      passiveBonus: {},
    };

    const existing = SaveService.getSave(currentSaveId);
    if (existing) {
      const updated: CharacterSave = {
        ...existing,
        skillMultiplier: characterStore.skillMultiplier,
        reactionType: characterStore.reactionType,
        amplifyingMultiplier: characterStore.amplifyingMultiplier,
        statConversions: characterStore.statConversions?.length > 0 ? characterStore.statConversions : undefined,
        teamBuffs: characterStore.teamBuffs?.length > 0 ? characterStore.teamBuffs : undefined,
        setBonus: Object.keys(characterStore.setBonus).length > 0 ? characterStore.setBonus : undefined,
        characterId: selectedCharacter.id,
        characterLevel: characterStore.characterLevel,
        weaponConfig,
        constellationConfig: characterStore.constellationConfig,
        talentConfig: characterStore.talentConfig,
        artifacts,
        selectedScenarioId: characterStore.selectedScenarioId ?? '',
      };
      SaveService.saveCharacter(updated);
    }

    const saves = SaveService.listSaves();
    set({ saves });
  },

  deleteSave: (saveId: string) => {
    SaveService.deleteSave(saveId);
    const { currentSaveId } = get();
    if (currentSaveId === saveId) {
      set({ currentSaveId: null });
    }
    const saves = SaveService.listSaves();
    set({ saves });
  },

  renameSave: (saveId: string, newName: string) => {
    SaveService.renameSave(saveId, newName);
    const saves = SaveService.listSaves();
    set({ saves });
  },

  exportSaves: (saveIds: string[], includeUid: boolean = false): string => {
    const allSaves = SaveService.listSaves();
    const selectedSaves = allSaves.filter((s) => saveIds.includes(s.saveId));
    return SaveService.exportToJSON(selectedSaves, includeUid);
  },

  importSaves: (jsonStr: string): ImportResult => {
    const result = SaveService.importFromJSON(jsonStr);
    if (result.success) {
      const saves = SaveService.listSaves();
      set({ saves, importError: null, lastImportResult: result });
    } else {
      set({
        importError: result.errors.join('; '),
        lastImportResult: result,
      });
    }
    return result;
  },

  clearImportError: () => set({ importError: null }),

  setCurrentSaveId: (saveId: string | null) => set({ currentSaveId: saveId }),

  reset: () => set(initialState),
}));
