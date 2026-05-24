import React, { useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import DamageComparisonView from './DamageComparison';
import ZoneAnalysisTable from './ZoneAnalysisTable';
import OptimizationResult from './OptimizationResult';
import ComparisonChart from './ComparisonChart';
import LoadingOverlay from '../common/LoadingOverlay';
import CharacterStatPanel from '../character/CharacterStatPanel';
import { useCharacterStore } from '../../store/slices/characterSlice';
import { useArtifactStore } from '../../store/slices/artifactSlice';
import { useOptimizerStore } from '../../store/slices/optimizerSlice';
import { DEFAULT_WEAPON } from '../../data/weapons';
import { getScenariosByCharacterId } from '../../data/scenarios';
import { SUBSTAT_MID_VALUES, MAX_TOTAL_ROLLS, STAT_DISPLAY_NAMES } from '../../data/constants';
import { StatCalculator } from '../../engine/stats';
import { computeStatsFromAllocation } from '../../utils/buildStats';
import type { CharacterBuild, SubstatAllocation, ArtifactInstance, ComputedStats } from '../../types';
import { ArtifactSlotType, SubstatType } from '../../types';

/** 优化模式枚举。 */
type OptimizeMode = 'redistribute' | 'ideal';

/**
 * AnalysisTab — Tab3: 词条分析与方案。
 * 优化模式选择 → 开始优化 → 伤害前后对比 + 乘区词条分析表 + 优化结果 + 优化后角色面板。
 */
function AnalysisTab(): React.ReactElement {
  const {
    selectedCharacter,
    characterLevel,
    skillMultiplier,
    reactionType,
    teamBuffs,
    weaponConfig,
    constellationConfig,
    talentConfig,
    setBonus,
    selectedScenarioId,
    isResultExpired,
  } = useCharacterStore();

  const { artifacts } = useArtifactStore();
  const {
    isCalculating,
    progress,
    redistributeResult,
    idealResult,
    error,
    damageComparison,
    zoneAnalysis,
    runOptimizationWithComparison,
    runIdealTemplate,
  } = useOptimizerStore();

  // 优化模式
  const [optimizeMode, setOptimizeMode] = React.useState<OptimizeMode>('redistribute');
  const [searchMainStats, setSearchMainStats] = React.useState(false);
  const [idealRollCount, setIdealRollCount] = React.useState(25);

  // 获取选中场景名称
  const scenarios = selectedCharacter
    ? getScenariosByCharacterId(selectedCharacter.id)?.scenarios ?? []
    : [];
  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId) ?? null;
  const scenarioName = selectedScenario?.name ?? '默认场景';

  // 构建 CharacterBuild
  const currentBuild = useMemo<CharacterBuild | null>(() => {
    if (!selectedCharacter) return null;
    const artifactList = Object.values(ArtifactSlotType)
      .map((slot) => artifacts[slot])
      .filter((a): a is ArtifactInstance => a !== null);

    return {
      character: selectedCharacter,
      weaponConfig: weaponConfig ?? {
        weaponData: DEFAULT_WEAPON,
        weaponLevel: 90,
        refinement: 1,
        passiveBonus: {},
      },
      artifacts: artifactList,
      characterLevel,
      skillMultiplier,
      reactionType,
      teamBuffs,
      constellationConfig,
      talentConfig,
      setBonus,
    };
  }, [selectedCharacter, artifacts, characterLevel, skillMultiplier, reactionType, teamBuffs, weaponConfig, constellationConfig, talentConfig, setBonus]);

  // 当前面板
  const currentStats = useMemo(() => {
    if (!currentBuild) return null;
    return StatCalculator.compute(currentBuild);
  }, [currentBuild]);

  // 同词条重优化——优化后面板
  const redistributeStats = useMemo<ComputedStats | null>(() => {
    if (!currentBuild || !redistributeResult) return null;
    return computeStatsFromAllocation(currentBuild, redistributeResult.optimizedAllocations);
  }, [currentBuild, redistributeResult]);

  // 理想模板——优化后面板
  const idealStats = useMemo<ComputedStats | null>(() => {
    if (!currentBuild || !idealResult) return null;
    return computeStatsFromAllocation(currentBuild, idealResult.idealAllocations);
  }, [currentBuild, idealResult]);

  // 提取当前词条分配（小数点词条，平攻/平血/平防自动折算为百分比）
  const currentAllocations = useMemo<SubstatAllocation[]>(() => {
    // Phase 1: 累计每个词条的原始数值（不做取整）
    const valueMap = new Map<SubstatType, number>();
    for (const slot of Object.values(ArtifactSlotType)) {
      const artifact = artifacts[slot];
      if (!artifact) continue;
      for (const sub of artifact.subStats) {
        valueMap.set(sub.type, (valueMap.get(sub.type) ?? 0) + sub.value);
      }
    }

    // Phase 2: 平攻/平血/平防 → 百分比折算（基于角色 + 武器基础值）
    const baseAtk = (selectedCharacter?.baseStats.atk ?? 0) + (weaponConfig?.weaponData?.baseAtk ?? 0);
    const baseHp = selectedCharacter?.baseStats.hp ?? 0;
    const baseDef = selectedCharacter?.baseStats.def ?? 0;

    const foldFlat = (flatType: SubstatType, percentType: SubstatType, base: number) => {
      if (base > 0 && valueMap.has(flatType)) {
        const flatVal = valueMap.get(flatType)!;
        const percentEquivalent = flatVal / base;
        valueMap.set(percentType, (valueMap.get(percentType) ?? 0) + percentEquivalent);
        valueMap.delete(flatType);
      }
    };
    foldFlat(SubstatType.ATK_FLAT, SubstatType.ATK_PERCENT, baseAtk);
    foldFlat(SubstatType.HP_FLAT, SubstatType.HP_PERCENT, baseHp);
    foldFlat(SubstatType.DEF_FLAT, SubstatType.DEF_PERCENT, baseDef);

    // Phase 3: 数值 ÷ 中档值 → 小数词条数
    const rollMap = new Map<SubstatType, number>();
    for (const [type, value] of valueMap) {
      const midValue = SUBSTAT_MID_VALUES[type] ?? 1;
      if (midValue > 0) {
        rollMap.set(type, value / midValue);
      }
    }

    const allocs = Array.from(rollMap.entries()).map(([type, rolls]) => ({ type, rolls }));
    // 仅保留角色相关词条
    if (selectedCharacter) {
      const relevant = new Set(selectedCharacter.relevantSubstats);
      return allocs.filter(a => relevant.has(a.type));
    }
    return allocs;
  }, [artifacts, selectedCharacter, weaponConfig]);

  // 优化回调
  const handleOptimize = useCallback(() => {
    if (!currentBuild) return;

    if (optimizeMode === 'redistribute') {
      if (currentAllocations.length === 0) return;
      runOptimizationWithComparison(currentBuild, currentAllocations, scenarioName);
    } else {
      // 理想模板模式
      runIdealTemplate(
        currentBuild.character,
        idealRollCount,
        currentBuild.skillMultiplier,
        currentBuild.reactionType,
        currentBuild,
        searchMainStats,
      );
    }
  }, [currentBuild, currentAllocations, optimizeMode, scenarioName, runOptimizationWithComparison, runIdealTemplate, idealRollCount, searchMainStats]);

  const canOptimize = selectedCharacter !== null && (
    optimizeMode === 'redistribute' ? currentAllocations.length > 0 : true
  );

  if (!selectedCharacter) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">请先在"角色与装备"标签页选择角色</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <LoadingOverlay visible={isCalculating} progress={progress} message="正在计算最优词条分配…" />

      {/* 数据过期提示 */}
      {isResultExpired && (damageComparison || redistributeResult || idealResult) && (
        <Alert severity="warning" variant="outlined">
          数据已更新，请重新计算
        </Alert>
      )}

      {/* 当前角色面板 */}
      <Paper sx={{ p: 2 }}>
        <CharacterStatPanel stats={currentStats} />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          ※ 当前装备面板
        </Typography>
      </Paper>

      {/* 优化模式选择 */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1.5, color: 'primary.main' }}>
          优化配置
        </Typography>
        <FormControl size="small" sx={{ minWidth: 200, mb: 2 }}>
          <InputLabel>优化模式</InputLabel>
          <Select
            value={optimizeMode}
            label="优化模式"
            onChange={(e) => setOptimizeMode(e.target.value as OptimizeMode)}
          >
            <MenuItem value="redistribute">同词条重优化</MenuItem>
            <MenuItem value="ideal">理想模板</MenuItem>
          </Select>
        </FormControl>

        {optimizeMode === 'redistribute' && (
          <Typography variant="body2" color="text.secondary">
            在当前词条总数不变的前提下，重新分配词条以最大化伤害
          </Typography>
        )}
        {optimizeMode === 'ideal' && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              生成理论最优词条分配目标，指导圣遗物刷取方向
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
              <TextField
                label="目标词条数"
                type="number"
                value={idealRollCount}
                onChange={(e) => setIdealRollCount(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                size="small"
                sx={{ width: 130 }}
                inputProps={{ min: 0.1, max: MAX_TOTAL_ROLLS, step: 0.5 }}
              />
              <FormControlLabel
                control={<Switch checked={searchMainStats} onChange={(e) => setSearchMainStats(e.target.checked)} size="small" />}
                label="搜索最优主词条组合（沙/杯/头）"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem', color: 'text.secondary' } }}
              />
            </Box>
          </>
        )}

        <Button
          variant="contained"
          size="large"
          onClick={handleOptimize}
          disabled={!canOptimize || isCalculating}
          fullWidth
          sx={{ mt: 2 }}
        >
          {isCalculating ? '计算中…' : '开始优化'}
        </Button>
      </Paper>

      {/* 错误提示 */}
      {error && (
        <Paper sx={{ p: 2, bgcolor: 'error.dark' }}>
          <Typography color="error.contrastText">{error}</Typography>
        </Paper>
      )}

      {/* 重分配优化结果 */}
      {optimizeMode === 'redistribute' && redistributeResult && (
        <>
          {/* 优化后角色面板 */}
          {redistributeStats && (
            <Paper sx={{ p: 2 }}>
              <CharacterStatPanel stats={redistributeStats} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                ※ 优化后角色面板（同词条重分配）
              </Typography>
            </Paper>
          )}

          {/* 伤害前后对比 */}
          {damageComparison && <DamageComparisonView comparison={damageComparison} />}

          {/* 乘区词条分析表 */}
          {zoneAnalysis && <ZoneAnalysisTable analysis={zoneAnalysis} />}

          {/* 详细优化结果 */}
          <OptimizationResult
            originalDamage={redistributeResult.originalDamage}
            optimizedDamage={redistributeResult.optimizedDamage}
            improvementPercent={redistributeResult.improvementPercent}
            originalAllocations={currentAllocations}
            optimizedAllocations={redistributeResult.optimizedAllocations}
            originalBreakdown={redistributeResult.originalBreakdown}
            optimizedBreakdown={redistributeResult.optimizedBreakdown}
          />

          {/* 词条分配对比图 */}
          <ComparisonChart
            original={currentAllocations}
            optimized={redistributeResult.optimizedAllocations}
          />
        </>
      )}

      {/* 理想模板结果 */}
      {optimizeMode === 'ideal' && idealResult && (
        <>
          {/* 理想后面板 */}
          {idealStats && (
            <Paper sx={{ p: 2 }}>
              <CharacterStatPanel stats={idealStats} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                ※ 理想模板角色面板（{idealRollCount} 词条）
              </Typography>
            </Paper>
          )}

          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              理论伤害
            </Typography>
            <Typography variant="h3" sx={{ color: 'primary.main', fontWeight: 700 }}>
              {Math.round(idealResult.theoreticalDamage).toLocaleString('en-US')}
            </Typography>
            {idealResult._debug && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                DEBUG: artifacts={idealResult._debug.artifacts} weapon={idealResult._debug.weapon}
                atk={Math.round(idealResult._debug.totalAtk)} mult={idealResult._debug.skillMultiplier}
                rxn={idealResult._debug.reactionType} firstDmg={Math.round(idealResult._debug.firstDamage)}
              </Typography>
            )}
          </Paper>

          {/* 主词条对比 */}
          {idealResult.mainStatCombo && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'primary.main' }}>
                主词条对比
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {(['sands', 'goblet', 'circlet'] as const).map((slot) => {
                  const slotLabel = slot === 'sands' ? '沙漏' : slot === 'goblet' ? '杯子' : '头冠';
                  const currentType = currentBuild?.artifacts?.find(
                    (a) => a.slot === (slot === 'sands' ? ArtifactSlotType.SANDS : slot === 'goblet' ? ArtifactSlotType.GOBLET : ArtifactSlotType.CIRCLET)
                  )?.mainStatType;
                  const idealType = idealResult.mainStatCombo![slot];
                  const changed = currentType !== idealType;
                  return (
                    <Box key={slot} sx={{ flex: '1 1 160px', minWidth: 140 }}>
                      <Typography variant="caption" color="text.secondary">{slotLabel}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Typography variant="body2" sx={{ color: changed ? 'text.secondary' : 'text.primary', textDecoration: changed ? 'line-through' : 'none' }}>
                          {currentType ? (STAT_DISPLAY_NAMES[currentType] ?? currentType) : '—'}
                        </Typography>
                        {changed && (
                          <>
                            <Typography variant="body2" color="text.secondary">→</Typography>
                            <Typography variant="body2" sx={{ color: 'success.light', fontWeight: 600 }}>
                              {STAT_DISPLAY_NAMES[idealType] ?? idealType}
                            </Typography>
                          </>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          )}

          <ComparisonChart
            original={[]}
            optimized={idealResult.idealAllocations.filter((a) => a.rolls > 0)}
            type="bar"
          />
        </>
      )}
    </Box>
  );
}

export default AnalysisTab;
