import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import CachedIcon from '@mui/icons-material/Cached';
import { useOptimizerStore } from '../../../store/slices/optimizerSlice';
import { STAT_DISPLAY_NAMES } from '../../../data/constants';
import { formatDamage } from '../../../utils/format';
import ErrorBoundary from '../../common/ErrorBoundary';
import DamageFlow from '../../optimizer/DamageFlow';
import ZoneAnalysisTable from '../../optimizer/ZoneAnalysisTable';
import PortalOverlay, { usePopover } from './PortalOverlay';
import { useV5Ripple } from '../../../hooks/useV5Ripple';
import type { SubstatType, DamageResult } from '../../../types';

interface Allocation {
  type: SubstatType;
  rolls: number;
}

interface ResultSectionProps {
  section: string;
  resultLabels: Record<string, string>;
  damageResult: DamageResult | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  computedStats: any;
  isCalculating: boolean;
  // 理想模板
  idealRollCount: number;
  idealRollText: string;
  setIdealRollText: (v: string) => void;
  setIdealRollCount: (v: number) => void;
  idealAvailableTypes: SubstatType[];
  idealAnchors: Map<SubstatType, number>;
  idealInputs: Map<SubstatType, string>;
  handleIdealPinToggle: (type: SubstatType) => void;
  handleIdealInputChange: (type: SubstatType, value: string) => void;
  handleRunIdeal: () => void;
  // 重优化
  currentAllocations: Allocation[];
  anchoredTypes: Set<SubstatType>;
  toggleAnchor: (type: SubstatType) => void;
  handleRunRedistribute: () => void;
}

const PANEL_ATTRS = [
  ['生命值', 'totalHp', 0], ['攻击力', 'totalAtk', 0], ['防御力', 'totalDef', 0],
  ['暴击率', 'critRate', 1], ['暴击伤害', 'critDmg', 1],
  ['元素精通', 'em', 0], ['充能效率', 'er', 1], ['伤害加成', 'dmgBonus', 1],
] as const;

export default function ResultSection(props: ResultSectionProps) {
  const {
    section, resultLabels, damageResult, computedStats, isCalculating,
    idealRollCount, idealRollText, setIdealRollText, setIdealRollCount,
    idealAvailableTypes, idealAnchors, idealInputs,
    handleIdealPinToggle, handleIdealInputChange, handleRunIdeal,
    currentAllocations, anchoredTypes, toggleAnchor, handleRunRedistribute,
  } = props;

  const { redistributeResult, idealResult, damageComparison, zoneAnalysis, clearResults } = useOptimizerStore();
  const pop = usePopover();
  const s = String(section);

  // ---- 理想模板 ----
  if (resultLabels[s]?.includes('理想')) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: 'primary.main' }}>理想模板</Typography>
          {idealResult && (
            <IconButton size="small" onClick={clearResults} sx={{ bgcolor: 'rgba(255,255,255,0.06)', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}>
              <CachedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="body2" color="text.secondary">词条数</Typography>
          <TextField size="small" type="number" value={idealRollText} sx={{ width: 100 }}
            slotProps={{ htmlInput: { step: 0.1, min: 0.1, max: 50 } }}
            onChange={(e) => {
              const raw = e.target.value;
              setIdealRollText(raw);
              const v = parseFloat(raw);
              if (!isNaN(v) && v >= 0.1 && v <= 50) setIdealRollCount(v);
            }}
            onBlur={() => {
              const v = parseFloat(idealRollText);
              if (isNaN(v) || v < 0.1) setIdealRollText(String(idealRollCount));
            }} />
        </Box>
        {idealResult ? (
          <>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700 }}>
                {Math.round(idealResult.theoreticalDamage).toLocaleString('en-US')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                理论期望伤害（{idealRollCount} 词条）
              </Typography>
            </Box>
            {idealResult.idealStats && computedStats && (
              <Box sx={{ p: 1, mb: 1.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1.5, border: '1px solid rgba(255,255,255,0.06)' }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', mb: 0.5, display: 'block', px: 0.25 }}>理想面板对比</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.8fr', gap: 0, fontSize: '0.65rem' }}>
                  <Typography variant="caption" sx={{ px: 0.5, py: 0.25, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>属性</Typography>
                  <Typography variant="caption" sx={{ px: 0.5, py: 0.25, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>当前</Typography>
                  <Typography variant="caption" sx={{ px: 0.5, py: 0.25, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>理想</Typography>
                  <Typography variant="caption" sx={{ px: 0.5, py: 0.25, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>Δ</Typography>
                  {PANEL_ATTRS.map(([label, key, isPct]) => {
                    const oldVal = (computedStats as any)?.[key] ?? 0;
                    const newVal = (idealResult.idealStats as any)?.[key] ?? 0;
                    const delta = newVal - oldVal;
                    const changed = Math.abs(delta) > 1e-6;
                    const fmt = (v: number) => isPct ? (v * 100).toFixed(1) + '%' : Math.round(v).toString();
                    const deltaFmt = isPct ? (delta * 100).toFixed(1) + '%' : Math.round(delta).toString();
                    return (
                      <React.Fragment key={key}>
                        <Typography variant="caption" sx={{ px: 0.5, py: 0.2, color: changed ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)' }}>{label}</Typography>
                        <Typography variant="caption" sx={{ px: 0.5, py: 0.2, color: 'rgba(255,255,255,0.45)', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(oldVal)}</Typography>
                        <Typography variant="caption" sx={{ px: 0.5, py: 0.2, color: changed ? 'success.light' : 'rgba(255,255,255,0.6)', textAlign: 'right', fontFamily: 'monospace', fontWeight: changed ? 600 : 400 }}>{fmt(newVal)}</Typography>
                        <Typography variant="caption" sx={{ px: 0.5, py: 0.2, color: delta > 0 ? 'success.light' : delta < 0 ? 'error.light' : 'rgba(255,255,255,0.3)', textAlign: 'right', fontFamily: 'monospace', fontWeight: changed ? 600 : 400 }}>{delta > 0 ? '+' : ''}{deltaFmt}</Typography>
                      </React.Fragment>
                    );
                  })}
                </Box>
              </Box>
            )}
            <Box onClick={() => pop.setOpen(true)} sx={{ mb: 1, p: 1, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', '&:hover': { bgcolor: 'rgba(91,192,235,0.06)', borderColor: 'rgba(91,192,235,0.2)' }, transition: 'background-color 0.2s, border-color 0.2s' }}>
              <Typography variant="subtitle2" sx={{ color: 'primary.main', flexGrow: 1 }}>查看详情</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>点击展开</Typography>
              <ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} />
            </Box>
            <PortalOverlay open={pop.open} exiting={pop.exiting} onClose={pop.close} maxWidth={700} maxHeight="85vh">
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ color: 'primary.main' }}>理想模板详情</Typography>
              </Box>
              {idealResult.idealAllocations && (
                <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1, mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>理想词条分配</Typography>
                  {idealResult.idealAllocations.map((a) => (
                    <Box key={a.type} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                      <Typography variant="caption" sx={{ fontSize: '0.6rem', width: 90, color: 'rgba(255,255,255,0.45)' }}>{STAT_DISPLAY_NAMES[a.type] ?? a.type}</Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>{a.rolls.toFixed(4)}条</Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {idealResult.breakdown && <DamageFlow result={idealResult.breakdown} computedStats={idealResult.idealStats ?? computedStats} />}
            </PortalOverlay>
          </>
        ) : (
          <IdealInput
            idealRollCount={idealRollCount} idealAvailableTypes={idealAvailableTypes}
            idealAnchors={idealAnchors} idealInputs={idealInputs}
            handleIdealPinToggle={handleIdealPinToggle} handleIdealInputChange={handleIdealInputChange}
            handleRunIdeal={handleRunIdeal} isCalculating={isCalculating}
          />
        )}
      </Box>
    );
  }

  // ---- 同词条重优化 ----
  if (resultLabels[s]?.includes('重优化')) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: 'primary.main' }}>同词条重优化</Typography>
          {redistributeResult && (
            <IconButton size="small" onClick={clearResults} sx={{ bgcolor: 'rgba(255,255,255,0.06)', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}>
              <CachedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          )}
        </Box>
        {redistributeResult ? (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 2 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">优化前</Typography>
                <Typography variant="h6">{formatDamage(redistributeResult.originalDamage)}</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">优化后</Typography>
                <Typography variant="h6" sx={{ color: 'success.light' }}>{formatDamage(redistributeResult.optimizedDamage)}</Typography>
              </Box>
            </Box>
            {damageComparison && (
              <Typography variant="body1" sx={{ textAlign: 'center', color: damageComparison.improvementPercent > 0 ? 'success.main' : 'text.primary', fontWeight: 600, mb: 2 }}>
                提升 {damageComparison.improvementPercent >= 0 ? '+' : ''}{(damageComparison.improvementPercent * 100).toFixed(4)}%
              </Typography>
            )}
            {redistributeResult.currentAllocations && redistributeResult.optimizedAllocations && (
              <Box sx={{ p: 1, mb: 1.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1.5, border: '1px solid rgba(255,255,255,0.06)' }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', mb: 0.5, display: 'block', px: 0.25 }}>词条分布对比</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr', gap: 0, fontSize: '0.65rem' }}>
                  <Typography variant="caption" sx={{ px: 0.5, py: 0.25, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>词条</Typography>
                  <Typography variant="caption" sx={{ px: 0.5, py: 0.25, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>优化前</Typography>
                  <Typography variant="caption" sx={{ px: 0.5, py: 0.25, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>优化后</Typography>
                  <Typography variant="caption" sx={{ px: 0.5, py: 0.25, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>Δ</Typography>
                  {redistributeResult.optimizedAllocations.map((opt) => {
                    const cur = redistributeResult.currentAllocations.find(a => a.type === opt.type);
                    const curRolls = cur?.rolls ?? 0;
                    const delta = opt.rolls - curRolls;
                    const changed = Math.abs(delta) > 0.001;
                    return (
                      <React.Fragment key={opt.type}>
                        <Typography variant="caption" sx={{ px: 0.5, py: 0.2, color: changed ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)' }}>{STAT_DISPLAY_NAMES[opt.type] ?? opt.type}</Typography>
                        <Typography variant="caption" sx={{ px: 0.5, py: 0.2, color: 'rgba(255,255,255,0.45)', textAlign: 'right', fontFamily: 'monospace' }}>{curRolls.toFixed(1)}</Typography>
                        <Typography variant="caption" sx={{ px: 0.5, py: 0.2, color: changed ? 'success.light' : 'rgba(255,255,255,0.6)', textAlign: 'right', fontFamily: 'monospace', fontWeight: changed ? 600 : 400 }}>{opt.rolls.toFixed(1)}</Typography>
                        <Typography variant="caption" sx={{ px: 0.5, py: 0.2, color: delta > 0 ? 'success.light' : delta < 0 ? 'error.light' : 'rgba(255,255,255,0.3)', textAlign: 'right', fontFamily: 'monospace', fontWeight: changed ? 600 : 400 }}>{delta > 0 ? '+' : ''}{delta.toFixed(1)}</Typography>
                      </React.Fragment>
                    );
                  })}
                </Box>
              </Box>
            )}
            <Box onClick={() => pop.setOpen(true)} sx={{ mb: 1, p: 1, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', '&:hover': { bgcolor: 'rgba(91,192,235,0.06)', borderColor: 'rgba(91,192,235,0.2)' }, transition: 'background-color 0.2s, border-color 0.2s' }}>
              <Typography variant="subtitle2" sx={{ color: 'primary.main', flexGrow: 1 }}>查看详情</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>点击展开</Typography>
              <ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} />
            </Box>
            <PortalOverlay open={pop.open} exiting={pop.exiting} onClose={pop.close} maxWidth={700} maxHeight="85vh">
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ color: 'primary.main' }}>重优化详情</Typography>
              </Box>
              {redistributeResult.optimizedStats && (
                <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1, mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>优化后角色面板</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.5 }}>
                    {PANEL_ATTRS.map(([label, key, isPct]) => {
                      const oldVal = (redistributeResult.originalStats as any)?.[key] ?? 0;
                      const newVal = (redistributeResult.optimizedStats as any)?.[key] ?? 0;
                      const changed = Math.abs(newVal - oldVal) > 1e-6;
                      const fmtVal = (v: number) => isPct ? (v * 100).toFixed(4) + '%' : v.toFixed(4);
                      return (
                        <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5 }}>
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.45)' }}>{label}</Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: changed ? 'success.light' : 'rgba(255,255,255,0.7)', fontWeight: changed ? 600 : 400 }}>{fmtVal(newVal)}</Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}
              {zoneAnalysis && <ZoneAnalysisTable analysis={zoneAnalysis} />}
              <ErrorBoundary>
                <DamageFlow result={redistributeResult.optimizedBreakdown ?? damageResult!} computedStats={redistributeResult.optimizedStats ?? computedStats} />
              </ErrorBoundary>
            </PortalOverlay>
          </>
        ) : (
          <RedistributeInput
            currentAllocations={currentAllocations} anchoredTypes={anchoredTypes}
            toggleAnchor={toggleAnchor} handleRunRedistribute={handleRunRedistribute}
            isCalculating={isCalculating}
          />
        )}
      </Box>
    );
  }

  // ---- 伤害计算结果 ----
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>期望伤害</Typography>
      {damageResult ? (
        <>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="h3" sx={{ color: 'primary.main', fontWeight: 700 }}>{formatDamage(damageResult.totalDamage)}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>当前期望伤害</Typography>
          </Box>
          <Box onClick={() => pop.setOpen(true)} sx={{ mb: 1, p: 1, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', '&:hover': { bgcolor: 'rgba(91,192,235,0.06)', borderColor: 'rgba(91,192,235,0.2)' }, transition: 'background-color 0.2s, border-color 0.2s' }}>
            <Typography variant="subtitle2" sx={{ color: 'primary.main', flexGrow: 1 }}>期望伤害计算流程</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>点击展开</Typography>
            <ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} />
          </Box>
          <PortalOverlay open={pop.open} exiting={pop.exiting} onClose={pop.close} maxWidth={700} maxHeight="85vh">
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>期望伤害计算流程</Typography>
            <DamageFlow result={damageResult} computedStats={computedStats} />
          </PortalOverlay>
        </>
      ) : (
        <Typography color="text.secondary">尚未计算</Typography>
      )}
    </Box>
  );
}

// ---- Internal sub-components ----

function IdealInput({
  idealRollCount, idealAvailableTypes, idealAnchors, idealInputs,
  handleIdealPinToggle, handleIdealInputChange, handleRunIdeal, isCalculating,
}: {
  idealRollCount: number;
  idealAvailableTypes: SubstatType[];
  idealAnchors: Map<SubstatType, number>;
  idealInputs: Map<SubstatType, string>;
  handleIdealPinToggle: (type: SubstatType) => void;
  handleIdealInputChange: (type: SubstatType, value: string) => void;
  handleRunIdeal: () => void;
  isCalculating: boolean;
}) {
  const ripple = useV5Ripple();
  const anchoredSum = Array.from(idealAnchors.values()).reduce((s, v) => s + v, 0);
  const remainingBudget = idealRollCount - anchoredSum;
  const canRun = remainingBudget > 0;
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'primary.main', fontSize: '0.8rem' }}>📐 词条锚定</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
        输入期望的词条数并点击 📌 锚定，系统将固定该词条数量生成理想模板
      </Typography>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'visible', mb: 2 }}>
        {idealAvailableTypes.length === 0 ? (
          <Box sx={{ px: 1.5, py: 2, textAlign: 'center' }}><Typography variant="caption" color="text.secondary">暂无可用词条类型</Typography></Box>
        ) : (
          <>
            {idealAvailableTypes.map((type, idx) => {
              const isAnchored = idealAnchors.has(type);
              const anchoredVal = idealAnchors.get(type);
              const inputVal = isAnchored ? String(anchoredVal) : (idealInputs.get(type) ?? '');
              return (
                <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, bgcolor: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                  <TextField
                    label={STAT_DISPLAY_NAMES[type] ?? type}
                    size="small"
                    type="number"
                    value={inputVal}
                    disabled={isAnchored}
                    onChange={(e) => handleIdealInputChange(type, e.target.value)}
                    slotProps={{ htmlInput: { min: 0.1, step: 0.1, style: { fontSize: '0.75rem' } } }}
                    sx={{ width: 100, '& .MuiOutlinedInput-root': { bgcolor: isAnchored ? 'rgba(255,255,255,0.06)' : 'transparent' } }}
                    placeholder="—"
                  />
                  <IconButton size="small" onClick={() => handleIdealPinToggle(type)} sx={{ p: 1, color: isAnchored ? 'primary.main' : 'rgba(255,255,255,0.25)', '&:hover': { color: 'primary.main' } }}>
                    {isAnchored ? <PushPinIcon sx={{ fontSize: 18 }} /> : <PushPinOutlinedIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                  <Typography variant="body2" sx={{ flex: 1, fontSize: '0.8rem', color: isAnchored ? 'text.primary' : 'text.secondary' }}>{STAT_DISPLAY_NAMES[type] ?? type}</Typography>
                </Box>
              );
            })}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1.5, py: 0.75, bgcolor: 'rgba(208,228,220,0.06)', borderTop: '1px solid', borderColor: 'divider', flexWrap: 'wrap', gap: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'primary.main', fontSize: '0.65rem' }}>📌 已锚定 {idealAnchors.size} 项</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>剩余预算 {remainingBudget.toFixed(1)} / {idealRollCount} 词条</Typography>
            </Box>
          </>
        )}
      </Box>
      <Button className="btn-hero" variant="contained" fullWidth onClick={(e) => { ripple(e); handleRunIdeal(); }} disabled={!canRun || isCalculating}>
        {isCalculating ? '计算中…' : '开始生成理想模板'}
      </Button>
    </Box>
  );
}

function RedistributeInput({
  currentAllocations, anchoredTypes, toggleAnchor, handleRunRedistribute, isCalculating,
}: {
  currentAllocations: Allocation[];
  anchoredTypes: Set<SubstatType>;
  toggleAnchor: (type: SubstatType) => void;
  handleRunRedistribute: () => void;
  isCalculating: boolean;
}) {
  const ripple = useV5Ripple();
  const freeRollSum = currentAllocations.filter((a) => !anchoredTypes.has(a.type)).reduce((s, a) => s + a.rolls, 0);
  const freeCount = currentAllocations.filter((a) => !anchoredTypes.has(a.type)).length;
  const canRun = freeCount > 0 && freeRollSum > 0;
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'primary.main', fontSize: '0.8rem' }}>优化前词条分布</Typography>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'visible', mb: 2 }}>
        {currentAllocations.length === 0 ? (
          <Box sx={{ px: 1.5, py: 2, textAlign: 'center' }}><Typography variant="caption" color="text.secondary">暂无词条数据，请先在圣遗物配置中填入副词条</Typography></Box>
        ) : (
          <>
            {currentAllocations.map((alloc, idx) => {
              const isAnchored = anchoredTypes.has(alloc.type);
              return (
                <Box key={alloc.type} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, bgcolor: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', opacity: isAnchored ? 1 : 0.85 }}>
                  <IconButton size="small" onClick={() => toggleAnchor(alloc.type)} sx={{ p: 1, color: isAnchored ? 'primary.main' : 'rgba(255,255,255,0.25)', '&:hover': { color: 'primary.main' } }}>
                    {isAnchored ? <PushPinIcon sx={{ fontSize: 18 }} /> : <PushPinOutlinedIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                  <Typography variant="body2" sx={{ flex: 1, fontSize: '0.8rem', color: isAnchored ? 'text.primary' : 'text.secondary' }}>{STAT_DISPLAY_NAMES[alloc.type] ?? alloc.type}</Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600, color: isAnchored ? 'primary.main' : 'text.primary', fontFamily: 'monospace' }}>{alloc.rolls.toFixed(1)} 条</Typography>
                </Box>
              );
            })}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1.5, py: 0.75, bgcolor: 'rgba(208,228,220,0.06)', borderTop: '1px solid', borderColor: 'divider', flexWrap: 'wrap', gap: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'primary.main', fontSize: '0.65rem' }}>📌 已锚定 {anchoredTypes.size} 项</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>可优化 {freeRollSum.toFixed(1)} 词条</Typography>
            </Box>
          </>
        )}
      </Box>
      <Button className="btn-hero" variant="contained" fullWidth onClick={(e) => { ripple(e); handleRunRedistribute(); }} disabled={!canRun || isCalculating}>
        {isCalculating ? '计算中…' : '开始优化'}
      </Button>
    </Box>
  );
}
