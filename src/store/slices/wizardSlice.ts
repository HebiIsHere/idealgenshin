import { create } from 'zustand';

/** 滚筒板块标识 */
export const WIZARD_SECTIONS = [
  'import',      // Enka 导入
  'character',   // 角色选择
  'weapon',      // 武器配置
  'artifacts',   // 圣遗物
  'talents',     // 天赋与命座
  'scenario',    // 倍率与反应
  'teambuffs',   // 队伍 Buff
] as const;

export type WizardSection = (typeof WIZARD_SECTIONS)[number] | `result_${number}`;

interface WizardState {
  /** 当前激活的板块索引 */
  currentIndex: number;
  /** 板块列表（含动态插入的结果板块） */
  sections: WizardSection[];
  /** 是否在向导模式 */
  active: boolean;

  /** 进入向导 */
  enterWizard: () => void;
  /** 退出向导回到首页 */
  exitWizard: () => void;
  /** 滚动到指定板块 */
  goToSection: (index: number) => void;
  /** 下一步 */
  nextSection: () => void;
  /** 插入结果板块 */
  insertResultSection: (label: string) => number;
  /** 移除结果板块 */
  removeResultSections: () => void;
  /** 是否有未完成板块 */
  isAllSectionsCompleted: () => boolean;
}

let resultCounter = 0;

export const useWizardStore = create<WizardState>((set, get) => ({
  currentIndex: 0,
  sections: [...WIZARD_SECTIONS],
  active: false,

  enterWizard: () => set({ active: true, currentIndex: 0, sections: [...WIZARD_SECTIONS] }),
  exitWizard: () => set({ active: false, currentIndex: 0, sections: [...WIZARD_SECTIONS] }),

  goToSection: (index) => set({ currentIndex: index }),

  nextSection: () => {
    const { currentIndex, sections } = get();
    if (currentIndex < sections.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  insertResultSection: (label) => {
    resultCounter++;
    const key = `result_${resultCounter}` as WizardSection;
    set((state) => {
      const newSections = [...state.sections, key];
      return { sections: newSections, currentIndex: newSections.length - 1 };
    });
    return resultCounter;
  },

  removeResultSections: () => {
    set((state) => ({
      sections: state.sections.filter((s) => !String(s).startsWith('result_')),
      currentIndex: Math.min(state.currentIndex, WIZARD_SECTIONS.length - 1),
    }));
  },

  isAllSectionsCompleted: () => {
    const { currentIndex, sections } = get();
    return currentIndex >= sections.length - 1;
  },
}));
