import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import type { SubstatType } from '../../types';
import { PERCENTAGE_STAT_TYPES, STAT_DISPLAY_NAMES } from '../../data/constants';

interface StatInputProps {
  type: SubstatType;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  label?: string;
}

function StatInput({
  type,
  value,
  onChange,
  disabled = false,
  min = 0,
  max,
  label,
}: StatInputProps): React.ReactElement {
  const isPercent = PERCENTAGE_STAT_TYPES.has(type);
  const displayLabel = label ?? STAT_DISPLAY_NAMES[type] ?? type;
  const step = isPercent ? 0.1 : 1;

  const toDisplay = (v: number) => {
    if (v === 0) return '';
    return isPercent ? (v * 100).toFixed(4) : v.toFixed(4);
  };
  const [text, setText] = useState(toDisplay(value));

  useEffect(() => {
    setText(toDisplay(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setText(raw);
    if (raw === '' || raw === '-') {
      onChange(0);
      return;
    }
    const num = parseFloat(raw);
    if (isNaN(num)) return;
    const internal = isPercent ? num / 100 : num;
    const clamped = Math.max(min, max !== undefined ? Math.min(internal, max) : internal);
    onChange(clamped);
  };

  const handleBlur = () => {
    setText(toDisplay(value));
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <TextField
        label={displayLabel}
        size="small"
        type="number"
        value={text}
        disabled={disabled}
        onChange={handleChange}
        onBlur={handleBlur}
        slotProps={{
          htmlInput: { step, min: isPercent ? min * 100 : min, max: max !== undefined ? (isPercent ? max * 100 : max) : undefined },
        }}
        sx={{ width: 100 }}
      />
      {isPercent && <Typography variant="caption" color="text.disabled">%</Typography>}
    </Box>
  );
}

export default StatInput;
