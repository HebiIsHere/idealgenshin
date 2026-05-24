import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { SubstatType } from '../../types';
import { STAT_DISPLAY_NAMES } from '../../data/constants';
import { formatStatValue } from '../../utils/format';

interface StatDisplayProps {
  type: SubstatType;
  value: number;
  label?: string;
  highlight?: boolean;
  compareValue?: number;
}

function StatDisplay({
  type,
  value,
  label,
  highlight = false,
  compareValue,
}: StatDisplayProps): React.ReactElement {
  const displayName = label ?? STAT_DISPLAY_NAMES[type] ?? type;
  const formattedValue = formatStatValue(type, value);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
      <Typography
        variant="body2"
        sx={{ color: highlight ? 'primary.main' : 'text.secondary', fontWeight: highlight ? 600 : 400 }}
      >
        {displayName}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography
          variant="body2"
          sx={{ color: highlight ? 'primary.main' : 'text.primary', fontWeight: highlight ? 600 : 400 }}
        >
          {formattedValue}
        </Typography>
        {compareValue !== undefined && (
          <>
            <Typography variant="caption" color="text.secondary">→</Typography>
            <Typography
              variant="body2"
              sx={{
                color: compareValue > value ? 'success.main' : compareValue < value ? 'error.main' : 'text.primary',
                fontWeight: 600,
              }}
            >
              {formatStatValue(type, compareValue)}
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
}

export default StatDisplay;
