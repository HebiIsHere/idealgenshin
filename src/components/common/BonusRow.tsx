import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';

/**
 * BonusRow — 迷你数值输入行，用于自由输入模块。
 * label: 左侧标签
 * value: 当前值（显示用）
 * onChange: 值变化回调
 * hint: 右侧提示文本
 */
function BonusRow({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
  hint?: string;
}): React.ReactElement {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
      <Typography variant="caption" sx={{ minWidth: 80, color: 'text.secondary' }}>
        {label}
      </Typography>
      <TextField
        size="small"
        type="number"
        value={value ?? ''}
        placeholder="0"
        sx={{ width: 80 }}
        slotProps={{ htmlInput: { step: 0.01 } }}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '' || raw === '-') {
            onChange(0);
            return;
          }
          const v = parseFloat(raw);
          if (!isNaN(v)) onChange(v);
        }}
      />
      {hint && (
        <Typography variant="caption" color="text.disabled">
          {hint}
        </Typography>
      )}
    </Box>
  );
}

export default BonusRow;
