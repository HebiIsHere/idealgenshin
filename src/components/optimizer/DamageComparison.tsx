import React from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import type { DamageComparison as DamageComparisonType } from '../../types';
import { formatDamage, formatPercent } from '../../utils/format';

interface DamageComparisonProps {
  /** 伤害对比数据。 */
  comparison: DamageComparisonType;
}

/**
 * DamageComparison — 当前伤害 vs 优化后伤害 + 差值 + 提升百分比，大字展示。
 */
function DamageComparisonView({ comparison }: DamageComparisonProps): React.ReactElement {
  const damageDiff = comparison.optimizedDamage - comparison.currentDamage;

  return (
    <Paper sx={{ p: 3, textAlign: 'center' }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
        伤害前后对比 — {comparison.scenarioName}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
        {/* 当前伤害 */}
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            当前伤害
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            {formatDamage(comparison.currentDamage)}
          </Typography>
        </Box>

        {/* 箭头 + 提升 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          <ArrowForwardIcon sx={{ color: 'primary.main', fontSize: 32 }} />
          <Typography
            variant="h6"
            sx={{
              color: comparison.improvementPercent > 0 ? 'success.main' : 'error.main',
              fontWeight: 700,
            }}
          >
            {formatPercent(comparison.improvementPercent)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            +{formatDamage(damageDiff)}
          </Typography>
        </Box>

        {/* 优化后伤害 */}
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            优化后
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: comparison.improvementPercent > 0 ? 'success.main' : 'text.primary',
            }}
          >
            {formatDamage(comparison.optimizedDamage)}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

export default DamageComparisonView;
