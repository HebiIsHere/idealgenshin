import { create } from 'zustand';
import * as Comlink from 'comlink';
import type {
  RedistributeResult,
  IdealResult,
  CharacterBuild,
  SubstatAllocation,
  DamageComparison,
  ZoneAnalysis,
  ZoneAnalysisEntry,
  ComputedStats,
} from '../../types';
import { SubstatType } from '../../types';
import type { OptimizerWorkerAPI } from '../../optimizer/worker';
import { StatCalculator } from '../../engine/stats';
import { DamageFormula } from '../../engine/formula';
import { SUBSTAT_MID_VALUES } from '../../data/constants';
import { mergeExtraBonuses } from '../../utils/mergeExtraBonuses';

/**
 * 优化器切片 — 管理优化结果、伤害对比、乘区分析和 Web Worker 生命周期。
 */

interface OptimizerState {
  /** 是否正在优化。 */
  isCalculating: boolean;
  /** 当前优化进度 (0-1)。 */
  progress: number;
  /** 重分配优化结果。 */
  redistributeResult: RedistributeResult | null;
  /** 理想模板优化结果。 */
  idealResult: IdealResult | null;
  /** 错误消息。 */
  error: string | null;
  /** 伤害前后对比结果。 */
  damageComparison: DamageComparison | null;
  /** 乘区词条分析结果。 */
  zoneAnalysis: ZoneAnalysis | null;
}

interface OptimizerActions {
  /** 运行重分配优化。 */
  runRedistribution: (build: CharacterBuild, currentAllocations: SubstatAllocation[], anchoredTypes?: SubstatType[], enableMainStatSearch?: boolean) => Promise<void>;
  /** 运行理想模板优化。当 build 存在时使用当前配置（武器/命座/套装）。 */
  runIdealTemplate: (
    character: CharacterBuild['character'],
    totalRolls: number,
    skillMultiplier: number,
    reactionType: CharacterBuild['reactionType'],
    build?: CharacterBuild,
    anchoredAllocations?: SubstatAllocation[], enableMainStatSearch?: boolean,
  ) => Promise<void>;
  /** 运行优化并自动计算伤害对比和乘区分析。 */
  runOptimizationWithComparison: (
    build: CharacterBuild,
    currentAllocations: SubstatAllocation[],
    scenarioName: string,
    anchoredTypes?: SubstatType[], enableMainStatSearch?: boolean,
  ) => Promise<void>;
  /** 清除优化结果。 */
  clearResults: () => void;
  /** 重置状态。 */
  reset: () => void;
}

const initialState: OptimizerState = {
  isCalculating: false,
  progress: 0,
  redistributeResult: null,
  idealResult: null,
  error: null,
  damageComparison: null,
  zoneAnalysis: null,
};

/**
 * 创建并封装优化器 Web Worker。
 * 使用 Comlink 简化 Worker 通信。
 */
function createOptimizerWorker(): { api: Comlink.Remote<OptimizerWorkerAPI>; worker: Worker } {
  const worker = new Worker(
    new URL('../../optimizer/worker.ts', import.meta.url),
    { type: 'module' },
  );
  const api = Comlink.wrap<OptimizerWorkerAPI>(worker);
  return { api, worker };
}

/** 单例 Worker 实例 — 首次使用时懒创建。 */
let workerInstance: { api: Comlink.Remote<OptimizerWorkerAPI>; worker: Worker } | null = null;

function getWorker(): { api: Comlink.Remote<OptimizerWorkerAPI>; worker: Worker } {
  if (!workerInstance) {
    workerInstance = createOptimizerWorker();
  }
  return workerInstance;
}

/**
 * 终止优化器 Worker（如卸载或重置时）。
 */
function terminateWorker(): void {
  if (workerInstance) {
    workerInstance.worker.terminate();
    workerInstance = null;
  }
}

/**
 * 计算乘区词条分析。
 * 冻结其他乘区，单独调整某乘区词条数至优化值，计算伤害差值作为该乘区贡献。
 */
function computeZoneAnalysis(
  build: CharacterBuild,
  currentAllocations: SubstatAllocation[],
  optimizedAllocations: SubstatAllocation[],
  currentDamage: number,
  optimizedDamage: number,
): ZoneAnalysis {
  const totalImprovement = currentDamage > 0
    ? (optimizedDamage - currentDamage) / currentDamage
    : 0;

  const entries: ZoneAnalysisEntry[] = [];

  // 乘区名称映射
  const ZONE_NAMES: Record<string, string> = {
    [SubstatType.CRIT_RATE]: '暴击率',
    [SubstatType.CRIT_DMG]: '暴击伤害',
    [SubstatType.ATK_PERCENT]: '攻击区',
    [SubstatType.ATK_FLAT]: '攻击区',
    [SubstatType.HP_PERCENT]: '生命区',
    [SubstatType.HP_FLAT]: '生命区',
    [SubstatType.DEF_PERCENT]: '防御区',
    [SubstatType.DEF_FLAT]: '防御区',
    [SubstatType.ELEMENTAL_MASTERY]: '精通区',
    [SubstatType.ENERGY_RECHARGE]: '充能区',
  };

  // 按乘区分组计算贡献
  const currentMap = new Map(currentAllocations.map((a) => [a.type, a.rolls]));
  const optimizedMap = new Map(optimizedAllocations.map((a) => [a.type, a.rolls]));

  // 收集所有词条类型
  const allTypes = new Set([...currentMap.keys(), ...optimizedMap.keys()]);

  // 按乘区分组
  const zoneGroups = new Map<string, SubstatAllocation[]>();
  for (const type of allTypes) {
    const zoneName = ZONE_NAMES[type] ?? '其他';
    if (!zoneGroups.has(zoneName)) {
      zoneGroups.set(zoneName, []);
    }
    zoneGroups.get(zoneName)!.push({
      type,
      rolls: (optimizedMap.get(type) ?? 0) - (currentMap.get(type) ?? 0),
    });
  }

  // 构造虚拟 build 的辅助函数
  const makeBuild = (allocations: SubstatAllocation[]): CharacterBuild => {
    const artifacts = build.artifacts.map((artifact, idx) => {
      if (idx === 0) {
        const subStats = allocations
          .filter((a) => a.rolls > 0)
          .map((a) => ({ type: a.type, value: a.rolls * (SUBSTAT_MID_VALUES[a.type] ?? 0) }));
        return { ...artifact, subStats };
      }
      return { ...artifact, subStats: [] };
    });
    return { ...build, artifacts };
  };

  const makeCtx = (b: CharacterBuild, stats: ComputedStats): Parameters<typeof DamageFormula.calculate>[0] => {
    const eb = mergeExtraBonuses(b);
    return {
      stats,
      skillMultiplier: b.skillMultiplier,
      statScaling: b.statScaling ?? b.character.defaultStatScaling,
      reactionType: b.reactionType,
      enemyLevel: 100,
      enemyResistance: 0.10,
      amplifyingMultiplier: b.amplifyingMultiplier ?? 0,
      characterLevel: b.characterLevel,
      defReductions: [...(eb.defReductions ?? [])],
      defIgnore: eb.defIgnore ?? 0,
      elevationBonus: eb.elevationBonus ?? 0,
      independentBonus: 0,
      extraBonuses: eb,
    };
  };

  // 基准伤害：全部使用当前分配的 mid-value 近似
  const baselineBuild = makeBuild(currentAllocations);
  const baselineStats = StatCalculator.compute(baselineBuild);
  const baselineDamage = DamageFormula.calculate(makeCtx(baselineBuild, baselineStats)).totalDamage;

  // 计算每个乘区的词条变化和伤害贡献（相对基准线差分）
  for (const [zoneName, changes] of zoneGroups) {
    const currentRolls = changes.reduce((s, c) => s + (currentMap.get(c.type) ?? 0), 0);
    const optimizedRolls = changes.reduce((s, c) => s + (optimizedMap.get(c.type) ?? 0), 0);
    const rollChange = optimizedRolls - currentRolls;

    let contribution = 0;
    if (rollChange !== 0 && baselineDamage > 0) {
      // 中间态：该乘区用优化值，其余用当前值
      const midAllocations = currentAllocations.map((a) => {
        if (changes.some((c) => c.type === a.type)) {
          return { type: a.type, rolls: optimizedMap.get(a.type) ?? 0 };
        }
        return a;
      });
      for (const change of changes) {
        if (!currentAllocations.some((a) => a.type === change.type)) {
          midAllocations.push({ type: change.type, rolls: optimizedMap.get(change.type) ?? 0 });
        }
      }

      const midBuild = makeBuild(midAllocations);
      const midStats = StatCalculator.compute(midBuild);
      const midDamage = DamageFormula.calculate(makeCtx(midBuild, midStats)).totalDamage;
      contribution = baselineDamage > 0 ? (midDamage - baselineDamage) / baselineDamage : 0;
    }

    entries.push({
      zoneName,
      currentRolls,
      optimizedRolls,
      rollChange,
      damageContribution: contribution,
    });
  }

  // 按伤害贡献降序排列
  entries.sort((a, b) => Math.abs(b.damageContribution) - Math.abs(a.damageContribution));

  const totalCurrentRolls = currentAllocations.reduce((s, a) => s + a.rolls, 0);
  const totalOptimizedRolls = optimizedAllocations.reduce((s, a) => s + a.rolls, 0);

  return {
    entries,
    totalCurrentRolls,
    totalOptimizedRolls,
    totalImprovement,
  };
}

export const useOptimizerStore = create<OptimizerState & OptimizerActions>((set, _get) => ({
  ...initialState,

  runRedistribution: async (build, currentAllocations, anchoredTypes, enableMainStatSearch) => {
    set({ isCalculating: true, progress: 0, error: null });

    try {
      const { api } = getWorker();

      // 创建进度回调，从 Worker 中调用。
      const progressCallback = Comlink.proxy(async (progress: number): Promise<void> => {
        set({ progress });
      });

      const result = await api.redistribute(
        { build, currentAllocations, anchoredTypes, enableMainStatSearch },
        progressCallback,
      );
      set({ redistributeResult: result, isCalculating: false, progress: 1 });
    } catch (err) {
      terminateWorker();
      set({
        error: err instanceof Error ? err.message : '优化计算失败',
        isCalculating: false,
      });
    }
  },

  runIdealTemplate: async (character, totalRolls, skillMultiplier, reactionType, build, anchoredAllocations, enableMainStatSearch) => {
    set({ isCalculating: true, progress: 0, error: null });

    try {
      const { api } = getWorker();

      const progressCallback = Comlink.proxy(async (progress: number): Promise<void> => {
        set({ progress });
      });

      const result = await api.generateIdeal(
        { character, totalRolls, skillMultiplier, reactionType, build, anchoredAllocations, enableMainStatSearch },
        progressCallback,
      );
      set({ idealResult: result, isCalculating: false, progress: 1 });
    } catch (err) {
      terminateWorker();
      set({
        error: err instanceof Error ? err.message : '优化计算失败',
        isCalculating: false,
      });
    }
  },

  runOptimizationWithComparison: async (build, currentAllocations, scenarioName, anchoredTypes, enableMainStatSearch) => {
    set({ isCalculating: true, progress: 0, error: null });

    try {
      const { api } = getWorker();

      const progressCallback = Comlink.proxy(async (progress: number): Promise<void> => {
        set({ progress });
      });

      const result = await api.redistribute(
        { build, currentAllocations, anchoredTypes, enableMainStatSearch },
        progressCallback,
      );

      // 计算伤害对比
      const damageComparison: DamageComparison = {
        scenarioName,
        currentDamage: result.originalDamage,
        optimizedDamage: result.optimizedDamage,
        improvementPercent: result.improvementPercent,
        currentBreakdown: result.originalBreakdown ?? {
          totalDamage: result.originalDamage,
          baseDamage: 0,
          scalingMultiplier: 1,
          bonusMultiplier: 1,
          critMultiplier: 1,
          resistanceMultiplier: 1,
          defenseMultiplier: 1,
          reactionMultiplier: 1,
          damagePath: 'DIRECT' as any,
        },
        optimizedBreakdown: result.optimizedBreakdown ?? {
          totalDamage: result.optimizedDamage,
          baseDamage: 0,
          scalingMultiplier: 1,
          bonusMultiplier: 1,
          critMultiplier: 1,
          resistanceMultiplier: 1,
          defenseMultiplier: 1,
          reactionMultiplier: 1,
          damagePath: 'DIRECT' as any,
        },
      };

      // 计算乘区分析
      const zoneAnalysis = computeZoneAnalysis(
        build,
        currentAllocations,
        result.optimizedAllocations,
        result.originalDamage,
        result.optimizedDamage,
      );

      set({
        redistributeResult: result,
        damageComparison,
        zoneAnalysis,
        isCalculating: false,
        progress: 1,
      });
    } catch (err) {
      terminateWorker();
      set({
        error: err instanceof Error ? err.message : '优化计算失败',
        isCalculating: false,
      });
    }
  },

  clearResults: () => set({ redistributeResult: null, idealResult: null, error: null, damageComparison: null, zoneAnalysis: null }),
  reset: () => {
    terminateWorker();
    set(initialState);
  },
}));
