import React from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import ZoneBonusInput from '../common/ZoneBonusInput';
import StatConversionInput from './StatConversionInput';
import { useCharacterStore } from '../../store/slices/characterSlice';
import type { ZoneBonusInput as ZoneBonusInputType } from '../../types';

/**
 * WeaponPassiveInput — 武器被动效果输入组件。
 * 包装 ZoneBonusInput，标题为"武器被动效果"，展示精炼对应的被动描述提示。
 */
function WeaponPassiveInput(): React.ReactElement {
  const { weaponConfig, setWeaponPassiveBonus } = useCharacterStore();

  const passiveBonus: ZoneBonusInputType = weaponConfig?.passiveBonus ?? {};
  const passiveName = weaponConfig?.weaponData.passiveName ?? '';
  const refinement = weaponConfig?.refinement ?? 1;
  const refinements = weaponConfig?.weaponData.refinements;
  
  // 根据精炼等级获取对应描述
  const refinementDesc = refinements?.[refinement - 1]?.description ?? '';
  const passiveDesc = refinementDesc || (weaponConfig?.weaponData.passiveDesc ?? '');

  const handleChange = (newBonus: ZoneBonusInputType) => {
    setWeaponPassiveBonus(newBonus);
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1, color: 'primary.main' }}>
        武器被动效果
      </Typography>

      {passiveName && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {passiveName}
          </Typography>
          <Chip
            label={`R${refinement}`}
            size="small"
            color="primary"
            sx={{ fontSize: '0.65rem', height: 20 }}
          />
        </Box>
      )}

      {passiveDesc && (
        <Box
          sx={{
            mb: 1.5,
            p: 1,
            borderRadius: 1,
            bgcolor: 'rgba(212, 168, 67, 0.06)',
            borderLeft: '3px solid',
            borderColor: 'primary.main',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
            {passiveDesc}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'warning.main', lineHeight: 1.4 }}>
            ⚠ 请自行根据上述精炼等级对应的被动效果，将实际数值填入下方各乘区加成
          </Typography>
        </Box>
      )}

      {!passiveDesc && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          请根据武器被动效果，手动填写各乘区的实际加成数值
        </Typography>
      )}

      <ZoneBonusInput
        value={passiveBonus}
        onChange={handleChange}
        disabled={!weaponConfig}
      />

      <StatConversionInput />
    </Paper>
  );
}

export default WeaponPassiveInput;
