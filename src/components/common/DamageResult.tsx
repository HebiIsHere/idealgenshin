import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { formatDamage, formatImprovement } from '../../utils/format';
import type { DamageResult } from '../../types';

interface DamageResultProps {
  /** Damage calculation result. */
  result: DamageResult;
  /** Original damage for comparison (in redistribute mode). */
  originalDamage?: number;
  /** Whether to show detailed breakdown. */
  showBreakdown?: boolean;
}

/** Display damage calculation result with optional breakdown. */
function DamageResultDisplay({
  result,
  originalDamage,
  showBreakdown = false,
}: DamageResultProps): React.ReactElement {
  const improvement = originalDamage && originalDamage > 0
    ? (result.totalDamage - originalDamage) / originalDamage
    : undefined;

  return (
    <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
      {/* Main damage number */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography variant="h3" sx={{ color: 'primary.main', fontWeight: 700 }}>
          {formatDamage(result.totalDamage)}
        </Typography>
        {improvement !== undefined && improvement !== 0 && (
          <Typography
            variant="h6"
            sx={{
              color: improvement > 0 ? 'success.main' : 'error.main',
              mt: 1,
            }}
          >
            {formatImprovement(improvement)}
          </Typography>
        )}
      </Box>

      {/* Breakdown */}
      {showBreakdown && (
        <Box sx={{ mt: 2, borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            伤害乘区明细
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, fontSize: '0.8rem' }}>
            <span style={{ color: '#A0A0B0' }}>基础伤害</span>
            <span style={{ textAlign: 'right' }}>{formatDamage(result.baseDamage)}</span>
            <span style={{ color: '#A0A0B0' }}>增伤区</span>
            <span style={{ textAlign: 'right' }}>×{result.bonusMultiplier.toFixed(4)}</span>
            <span style={{ color: '#A0A0B0' }}>暴击区</span>
            <span style={{ textAlign: 'right' }}>×{result.critMultiplier.toFixed(4)}</span>
            <span style={{ color: '#A0A0B0' }}>抗性区</span>
            <span style={{ textAlign: 'right' }}>×{result.resistanceMultiplier.toFixed(4)}</span>
            <span style={{ color: '#A0A0B0' }}>防御区</span>
            <span style={{ textAlign: 'right' }}>×{result.defenseMultiplier.toFixed(4)}</span>
            <span style={{ color: '#A0A0B0' }}>反应区</span>
            <span style={{ textAlign: 'right' }}>×{result.reactionMultiplier.toFixed(4)}</span>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default DamageResultDisplay;
