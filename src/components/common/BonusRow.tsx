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
  const [text, setText] = React.useState(value !== undefined ? String(value) : '');

  React.useEffect(() => {
    if (value !== undefined) setText(String(value));
  }, [value]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
      <TextField
        label={label}
        size="small"
        type="number"
        value={text}
        placeholder="0"
        sx={{ width: 100 }}
        slotProps={{ htmlInput: { step: 0.01 } }}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          if (raw === '' || raw === '-') {
            onChange(0);
            return;
          }
          const v = parseFloat(raw);
          if (!isNaN(v)) onChange(v);
        }}
        onBlur={() => {
          if (value !== undefined) setText(String(value));
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
