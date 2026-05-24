import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DamagePath } from '../../types';
import type { SubstatAllocation, SubstatType, DamageResult } from '../../types';
import { STAT_DISPLAY_NAMES } from '../../data/constants';
import { formatImprovement, formatDamage, formatNumber } from '../../utils/format';

/** Mapping from DamagePath enum value to Chinese display name. */
const DAMAGE_PATH_LABELS: Record<DamagePath, string> = {
  [DamagePath.DIRECT]: '直伤',
  [DamagePath.AMPLIFYING]: '增幅',
  [DamagePath.TRANSFORMATIVE]: '剧变',
  [DamagePath.CATALYZE]: '激化',
  [DamagePath.MOONSIGN]: '月曜',
  [DamagePath.MOONSIGN_DIRECT]: '直伤月曜',
};

/** Mapping from DamageResult multiplier field key to Chinese display name. */
const ZONE_LABELS: Partial<Record<keyof Omit<DamageResult, 'totalDamage' | 'scalingMultiplier'>, string>> = {
  baseDamage: '倍率区',
  bonusMultiplier: '增伤区',
  critMultiplier: '暴击区',
  resistanceMultiplier: '抗性区',
  defenseMultiplier: '防御区',
  reactionMultiplier: '反应区(系数×月兆)',
  damagePath: '伤害路径',
  aggravationBonus: '激化加成',
  elevationMultiplier: '擢升区',
  independentMultiplier: '独立乘区',
};

/** Ordered zone keys for display. */
const ZONE_ORDER: (keyof typeof ZONE_LABELS)[] = [
  'damagePath',
  'baseDamage',
  'bonusMultiplier',
  'critMultiplier',
  'resistanceMultiplier',
  'defenseMultiplier',
  'reactionMultiplier',
  'aggravationBonus',
  'elevationMultiplier',
  'independentMultiplier',
];

/** 提取每个乘区的详细计算步骤。 */
function getZoneDetail(key: string, _zoneName: string | undefined, value: number | string, result: DamageResult): { steps: string[]; displayValue: string } | null {
  const d = result;
  switch (key) {
    case 'baseDamage': {
      const b = d.baseDebug;
      const steps: string[] = [];
      if (b) {
        steps.push(`ATK = ${formatNumber(b.totalAtk)}`);
        steps.push(`攻击倍率 = ${formatNumber(b.skillMultiplier)}`);
        steps.push(`${formatNumber(b.totalAtk)} × ${formatNumber(b.skillMultiplier)} = ${formatNumber(b.rawBase)}`);
        if (b.baseDamageFlat) steps.push(`+ 固定值: ${formatNumber(b.baseDamageFlat)}`);
        steps.push(`= ${formatNumber(b.result)}`);
      } else {
        steps.push(`${formatNumber(value as number)}`);
      }
      return { steps, displayValue: formatNumber(value as number) };
    }
    case 'bonusMultiplier': {
      const b = d.bonusDebug;
      if (!b) return null;
      return { steps: [`增伤 = ${(b.dmgBonus * 100).toFixed(1)}%`, `1 + ${(b.dmgBonus * 100).toFixed(1)}% = ${formatNumber(b.result, 6)}`], displayValue: `×${formatNumber(value as number, 6)}` };
    }
    case 'critMultiplier': {
      const b = d.critDebug;
      if (!b) return null;
      return { steps: [`暴击率 = ${(b.critRate * 100).toFixed(1)}%`, `暴击伤害 = ${(b.critDmg * 100).toFixed(1)}%`, `有效暴击率 = ${(b.effectiveCritRate * 100).toFixed(1)}%`, `1 + ${(b.effectiveCritRate * 100).toFixed(1)}% × ${(b.critDmg * 100).toFixed(1)}% = ${formatNumber(b.result, 6)}`], displayValue: `×${formatNumber(value as number, 6)}` };
    }
    case 'resistanceMultiplier': {
      const b = d.resistDebug;
      if (!b) return null;
      const r = b.effectiveRes;
      const formulaDesc = r < 0 ? `1 − ${r.toFixed(2)}/2` : r < 0.75 ? `1 − ${r.toFixed(2)}` : `1/(1+4×${r.toFixed(2)})`;
      return { steps: [`敌方抗性 = ${(b.enemyResistance * 100).toFixed(1)}%`, `减抗 = ${(b.resistReduction * 100).toFixed(1)}%`, `有效抗性 = ${(r * 100).toFixed(1)}%`, `${formulaDesc} = ${formatNumber(b.result, 6)}`], displayValue: `×${formatNumber(value as number, 6)}` };
    }
    case 'defenseMultiplier': {
      const b = d.defenseDebug;
      if (!b) return null;
      return { steps: [`角色 ${b.characterLevel} 级 vs 敌方 ${b.enemyLevel} 级`, `(${b.charTerm})/(${b.charTerm}+${formatNumber(b.effectiveEnemyDef)}) = ${formatNumber(b.result, 6)}`], displayValue: `×${formatNumber(value as number, 6)}` };
    }
    case 'reactionMultiplier': {
      const amp = d.ampDebug;
      const trans = d.transDebug;
      const moon = d.moonDebug;
      if (amp) {
        const steps = [`反应系数 = ${amp.baseMultiplier}`, `EM增幅 = ${(amp.emBonus * 100).toFixed(1)}%`];
        if (amp.ampReactionBonus) steps.push(`反应加成 = ${(amp.ampReactionBonus * 100).toFixed(1)}%`);
        steps.push(`= ${formatNumber(amp.result, 6)}`);
        return { steps, displayValue: `×${formatNumber(value as number, 6)}` };
      }
      if (trans) {
        const steps = [`系数 ${trans.rate} × 等级 ${formatNumber(trans.levelMultiplier)}`, `EM增幅 = ${(trans.emBonus * 100).toFixed(1)}%`];
        if (trans.transformReactionBonus) steps.push(`剧变加成 = ${(trans.transformReactionBonus * 100).toFixed(1)}%`);
        steps.push(`= ${formatNumber(trans.result)}`);
        return { steps, displayValue: `×${formatNumber(value as number, 4)}` };
      }
      if (moon) {
        const steps = [`月反应倍率 = ${moon.moonRate}`, `EM增幅 = ${(moon.emBonus * 100).toFixed(1)}%`];
        if (moon.moonReactionBonus) steps.push(`月反应加成 = ${(moon.moonReactionBonus * 100).toFixed(1)}%`);
        steps.push(`= ${formatNumber(moon.result)}`);
        return { steps, displayValue: `×${formatNumber(value as number, 4)}` };
      }
      return { steps: [`${formatNumber(value as number, 6)}`], displayValue: `×${formatNumber(value as number, 6)}` };
    }
    case 'aggravationBonus': {
      const b = d.cataDebug;
      if (!b) return null;
      return { steps: [`基础 ${b.baseRate} × 等级 ${formatNumber(b.levelMultiplier)}`, `EM增幅 = ${(b.emBonus * 100).toFixed(1)}%`, `= ${formatNumber(b.result)}`], displayValue: formatNumber(value as number) };
    }
    case 'elevationMultiplier': {
      const b = d.elevDebug;
      if (!b) return null;
      return { steps: [`擢升加成 = ${(b.elevationBonus * 100).toFixed(0)}%`, `1 + ${(b.elevationBonus * 100).toFixed(1)}% = ${formatNumber(b.result, 6)}`], displayValue: `×${formatNumber(value as number, 6)}` };
    }
    case 'independentMultiplier': {
      const b = d.indepDebug;
      if (!b) return null;
      return { steps: [`天赋加成 = ${(b.talentBonus * 100).toFixed(0)}%`, `上下文加成 = ${(b.ctxBonus * 100).toFixed(0)}%`, `= ${formatNumber(b.result, 6)}`], displayValue: `×${formatNumber(value as number, 6)}` };
    }
    case 'damagePath': {
      return { steps: [], displayValue: DAMAGE_PATH_LABELS[value as DamagePath] ?? String(value) };
    }
    default:
      return null;
  }

  // 补充 debug: 大权区 / 羽毛附伤 / 祷歌附伤 / 精通区 / 月兆区
  const authorityD = d.authorityDebug;
  if (authorityD && authorityD.result > 1) {
    return { steps: [`有条件倍率 = ${formatNumber(authorityD.authorityMultiplier)}`, `= ${formatNumber(authorityD.result, 4)}`], displayValue: `×${formatNumber(authorityD.result, 4)}` };
  }
  const featherD = d.featherDebug;
  if (featherD && featherD.result > 0) {
    return { steps: [`固定值 = ${formatNumber(featherD.flat)}`, `缩放 = ${formatNumber(featherD.scalingSum)}`, `= ${formatNumber(featherD.result)}`], displayValue: `+${formatNumber(featherD.result)}` };
  }
  const prayerD = d.prayerDebug;
  if (prayerD && prayerD.result > 0) {
    return { steps: [`固定值 = ${formatNumber(prayerD.flat)}`, `缩放 = ${formatNumber(prayerD.scalingSum)}`, `= ${formatNumber(prayerD.result)}`], displayValue: `+${formatNumber(prayerD.result)}` };
  }
  const masteryD = d.masteryDebug;
  if (masteryD && masteryD.result > 1) {
    return { steps: [`EM = ${masteryD.em}`, `EM加成 = ${(masteryD.emBonus * 100).toFixed(1)}%`, `= ${formatNumber(masteryD.result, 6)}`], displayValue: `×${formatNumber(masteryD.result, 6)}` };
  }
  const moonSignD = d.moonSignDebug;
  if (moonSignD && moonSignD.result > 1) {
    return { steps: [`月兆角色 = ${moonSignD.moonCharacters}人`, `= ${formatNumber(moonSignD.result, 4)}`], displayValue: `×${formatNumber(moonSignD.result, 4)}` };
  }

  return null;
}

interface OptimizationResultProps {
  /** Original damage value. */
  originalDamage: number;
  /** Optimized damage value. */
  optimizedDamage: number;
  /** Improvement percentage. */
  improvementPercent: number;
  /** Original sub-stat allocation. */
  originalAllocations: SubstatAllocation[];
  /** Optimized sub-stat allocation. */
  optimizedAllocations: SubstatAllocation[];
  /** Detailed per-zone breakdown of the original damage. */
  originalBreakdown?: DamageResult;
  /** Detailed per-zone breakdown of the optimized damage. */
  optimizedBreakdown?: DamageResult;
}

/**
 * Render a single DamageResult breakdown inside an Accordion with detailed per-zone steps.
 */
function DamageBreakdownAccordion({
  label,
  breakdown,
}: {
  label: string;
  breakdown: DamageResult;
}): React.ReactElement {
  return (
    <Accordion defaultExpanded={false} disableGutters elevation={0}
      sx={{
        '&:before': { display: 'none' },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2, minHeight: 40, '&.Mui-expanded': { minHeight: 40 } }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
          {label}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
        {/* Per-zone details with steps */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {ZONE_ORDER.map((key) => {
            const zoneName = ZONE_LABELS[key];
            const value = breakdown[key];
            const isNonNumeric = key === 'damagePath';

            if (isNonNumeric && value === undefined) return null;
            if (key === 'aggravationBonus' && (value === undefined || value === 0)) return null;
            if (key === 'elevationMultiplier' && (value === undefined || value === 1)) return null;
            if (key === 'independentMultiplier' && (value === undefined || value === 1)) return null;

            const detail = getZoneDetail(key, zoneName, value as number | string, breakdown);
            if (!detail) return null;

            return (
              <Box key={key} sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.25 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {zoneName}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: isNonNumeric ? 'text.secondary' : 'primary.main',
                      bgcolor: 'rgba(212,168,67,0.06)',
                      px: 0.75,
                      py: 0.1,
                      borderRadius: 0.5,
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                    }}
                  >
                    {detail.displayValue}
                  </Typography>
                </Box>
                {detail.steps.length > 0 && (
                  <Box sx={{ ml: 2, pl: 1.5, borderLeft: '2px solid', borderColor: 'divider' }}>
                    {detail.steps.map((s, i) => (
                      <Typography
                        key={i}
                        variant="caption"
                        sx={{
                          display: 'block',
                          fontFamily: 'monospace',
                          fontSize: '0.7rem',
                          lineHeight: 1.7,
                          color: i === detail.steps.length - 1 ? 'text.primary' : 'text.secondary',
                          fontWeight: i === detail.steps.length - 1 ? 600 : 400,
                        }}
                      >
                        {s}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {/* 乘区流水公式 */}
        <Divider sx={{ my: 1 }} />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 0.5 }}>
          {ZONE_ORDER.map((key) => {
            const value = breakdown[key];
            if (key === 'damagePath') return null;
            if (key === 'aggravationBonus' && (value === undefined || value === 0)) return null;
            if (key === 'elevationMultiplier' && (value === undefined || value === 1)) return null;
            if (key === 'independentMultiplier' && (value === undefined || value === 1)) return null;
            if (value === undefined) return null;

            const zoneName = ZONE_LABELS[key];
            const isBase = key === 'baseDamage';
            const displayVal = isBase ? formatNumber(value as number) : `×${formatNumber(value as number, 6)}`;

            return (
              <Box key={key} sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'primary.main', fontWeight: 600, fontSize: '0.7rem' }}>
                  {displayVal}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.55rem' }}>
                  {zoneName}
                </Typography>
              </Box>
            );
          })}
          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.7rem' }}>=</Typography>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'primary.main', fontWeight: 700, fontSize: '0.7rem' }}>
              {formatDamage(breakdown.totalDamage)}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.55rem' }}>
              总伤害
            </Typography>
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

/** Display optimization results with before/after comparison. */
function OptimizationResult({
  originalDamage,
  optimizedDamage,
  improvementPercent,
  originalAllocations,
  optimizedAllocations,
  originalBreakdown,
  optimizedBreakdown,
}: OptimizationResultProps): React.ReactElement {
  // Build maps for easy lookup
  const originalMap = new Map<SubstatType, number>();
  const optimizedMap = new Map<SubstatType, number>();

  for (const alloc of originalAllocations) {
    originalMap.set(alloc.type, alloc.rolls);
  }
  for (const alloc of optimizedAllocations) {
    optimizedMap.set(alloc.type, alloc.rolls);
  }

  // 格式化词条数（保留1位小数）
  const fmtRolls = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  // Collect all stat types that appear in either allocation
  const allTypes = new Set<SubstatType>([
    ...originalAllocations.map((a) => a.type),
    ...optimizedAllocations.map((a) => a.type),
  ]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Damage comparison */}
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          伤害提升
        </Typography>
        <Typography
          variant="h3"
          sx={{
            color: improvementPercent > 0 ? 'success.main' : 'text.primary',
            fontWeight: 700,
          }}
        >
          {formatImprovement(improvementPercent)}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mt: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">优化前</Typography>
            <Typography variant="body1">{formatDamage(originalDamage)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">优化后</Typography>
            <Typography variant="body1" sx={{ color: 'success.main', fontWeight: 600 }}>
              {formatDamage(optimizedDamage)}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Collapsible damage breakdown */}
      {(originalBreakdown || optimizedBreakdown) && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {originalBreakdown && (
            <DamageBreakdownAccordion
              label="▼ 当前伤害计算过程"
              breakdown={originalBreakdown}
            />
          )}
          {optimizedBreakdown && (
            <DamageBreakdownAccordion
              label="▼ 优化后伤害计算过程"
              breakdown={optimizedBreakdown}
            />
          )}
        </Box>
      )}

      {/* Sub-stat comparison table */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'primary.main' }}>
          词条分配对比
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {/* Header */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 1, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">词条类型</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>当前</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>优化</Typography>
          </Box>

          {/* Rows */}
          {Array.from(allTypes).map((type) => {
            const origRolls = originalMap.get(type) ?? 0;
            const optRolls = optimizedMap.get(type) ?? 0;
            const diff = optRolls - origRolls;

            return (
              <Box
                key={type}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr',
                  gap: 1,
                  py: 0.5,
                  px: 1,
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'rgba(212, 168, 67, 0.05)' },
                }}
              >
                <Typography variant="body2">
                  {STAT_DISPLAY_NAMES[type]}
                </Typography>
                <Typography variant="body2" sx={{ textAlign: 'center' }}>
                  {fmtRolls(origRolls)} 条
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      textAlign: 'center',
                      color: diff > 0 ? 'success.main' : diff < 0 ? 'error.main' : 'text.primary',
                      fontWeight: diff !== 0 ? 600 : 400,
                    }}
                  >
                    {fmtRolls(optRolls)} 条
                  </Typography>
                  {diff !== 0 && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: diff > 0 ? 'success.main' : 'error.main',
                      }}
                    >
                      ({diff > 0 ? '+' : ''}{fmtRolls(diff)})
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Paper>
    </Box>
  );
}

export default OptimizationResult;
