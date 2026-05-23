import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
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

/**
 * Format a breakdown value for display.
 * Handles both number and DamagePath enum types.
 */
function formatBreakdownValue(_key: string, value: number | DamagePath | undefined): string {
  if (value === undefined) return '-';
  if (typeof value === 'string') {
    // DamagePath is a string enum
    return DAMAGE_PATH_LABELS[value as DamagePath] ?? String(value);
  }
  return formatNumber(value, 4);
}

/**
 * Format a breakdown value for the right-column display.
 * Returns a multiplier-style string for numbers, or a label for DamagePath.
 */
function formatBreakdownDisplay(key: string, value: number | DamagePath | undefined): string {
  if (value === undefined) return '-';
  if (typeof value === 'string') {
    return DAMAGE_PATH_LABELS[value as DamagePath] ?? String(value);
  }
  if (key === 'baseDamage') {
    return formatDamage(value);
  }
  return `×${formatNumber(value, 4)}`;
}

/** Mapping from DamageResult multiplier field key to Chinese display name. */
const ZONE_LABELS: Partial<Record<keyof Omit<DamageResult, 'totalDamage' | 'scalingMultiplier'>, string>> = {
  baseDamage: '基础伤害区',
  bonusMultiplier: '增伤区',
  critMultiplier: '暴击区',
  resistanceMultiplier: '抗性区',
  defenseMultiplier: '防御区',
  reactionMultiplier: '反应区',
  damagePath: '伤害路径',
  aggravationBonus: '激化加成',
  elevationMultiplier: '擢升倍率',
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
];

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
 * Render a single DamageResult breakdown inside an Accordion.
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
        {/* Per-zone details */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {ZONE_ORDER.map((key) => {
            const zoneName = ZONE_LABELS[key];
            const value = breakdown[key];
            const isBase = key === 'baseDamage';
            const isNonNumeric = key === 'damagePath';

            // Skip fields with default/empty values that aren't meaningful
            if (isNonNumeric && value === undefined) return null;
            if (key === 'aggravationBonus' && (value === undefined || value === 0)) return null;
            if (key === 'elevationMultiplier' && (value === undefined || value === 1)) return null;

            return (
              <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', py: 0.25 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 80 }}>
                  {zoneName}
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary', flex: 1, textAlign: 'center' }}>
                  {isNonNumeric
                    ? formatBreakdownValue(key, value as number | DamagePath | undefined)
                    : isBase
                      ? `${formatNumber(value as number)}`
                      : `${formatNumber(value as number, 4)}`}
                </Typography>
                <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600, minWidth: 60, textAlign: 'right' }}>
                  {formatBreakdownDisplay(key, value as number | DamagePath | undefined)}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* Total */}
        <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px dashed', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            总伤害
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
            {formatDamage(breakdown.totalDamage)}
          </Typography>
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
