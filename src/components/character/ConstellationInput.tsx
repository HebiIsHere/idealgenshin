import React from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import ZoneBonusInput from '../common/ZoneBonusInput';
import { useCharacterStore } from '../../store/slices/characterSlice';
import type { ZoneBonusInput as ZoneBonusInputType } from '../../types';

/**
 * ConstellationInput — 命座乘区加成输入组件。
 * 不提供命座数量选择，直接填写各乘区加成数值。
 */
function ConstellationInput(): React.ReactElement {
  const { constellationConfig, setConstellationBonus } = useCharacterStore();

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1.5, color: 'primary.main' }}>
        命座加成
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
        请根据命座效果，手动填写各乘区的实际加成数值
      </Typography>
      <ZoneBonusInput
        value={constellationConfig.bonus}
        onChange={setConstellationBonus}
      />
    </Paper>
  );
}

export default ConstellationInput;
