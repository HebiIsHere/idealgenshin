import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import CalculateIcon from '@mui/icons-material/Calculate';
import TuneIcon from '@mui/icons-material/Tune';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import type { ComputedStats } from '../../types';
import { useWizardStore } from '../../store/slices/wizardSlice';

interface CharacterStatPanelProps {
  stats: ComputedStats | null;
  /** 是否显示操作按钮（仅在向导模式显示） */
  showActions?: boolean;
  /** 操作按钮回调 */
  onCalcDamage?: () => void;
  onRedistribute?: () => void;
  onIdealTemplate?: () => void;
}

function CharacterStatPanel({
  stats,
  showActions = false,
  onCalcDamage,
  onRedistribute,
  onIdealTemplate,
}: CharacterStatPanelProps): React.ReactElement {
  if (!stats) {
    return (
      <Paper sx={{ p: 2, opacity: 0.5 }}>
        <Typography variant="subtitle1" sx={{ color: 'primary.main', mb: 1 }}>
          角色面板
        </Typography>
        <Typography variant="body2" color="text.secondary">
          请先选择角色
        </Typography>
      </Paper>
    );
  }

  const rows: { label: string; value: string; accent?: boolean }[] = [
    { label: '生命值', value: stats.totalHp.toFixed(0) },
    { label: '攻击力', value: stats.totalAtk.toFixed(0) },
    { label: '防御力', value: stats.totalDef.toFixed(0) },
    { label: '暴击率', value: (stats.critRate * 100).toFixed(1) + '%', accent: true },
    { label: '暴击伤害', value: (stats.critDmg * 100).toFixed(1) + '%', accent: true },
    { label: '元素精通', value: stats.em.toFixed(0) },
    { label: '充能效率', value: (stats.er * 100).toFixed(1) + '%' },
    { label: '伤害加成', value: (stats.dmgBonus * 100).toFixed(1) + '%' },
  ];

  return (
    <Paper sx={{ p: 2, boxShadow: '0 4px 24px rgba(0,0,0,0.4)', border: '1px solid', borderColor: 'rgba(212,168,67,0.15)' }}>
      <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main', fontWeight: 600 }}>
        角色面板
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {rows.map((r) => (
          <Box
            key={r.label}
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              px: 1, py: 0.25, borderRadius: 0.5, bgcolor: 'rgba(255,255,255,0.02)' }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              {r.label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem',
              color: r.accent ? 'primary.main' : 'text.primary' }}>
              {r.value}
            </Typography>
          </Box>
        ))}
      </Box>

      {showActions && (
        <Stack spacing={1} sx={{ mt: 2 }}>
          <Button
            variant="contained" size="small" fullWidth
            startIcon={<CalculateIcon />}
            onClick={onCalcDamage}
          >
            计算伤害
          </Button>
          <Button
            variant="outlined" size="small" fullWidth
            startIcon={<TuneIcon />}
            onClick={onRedistribute}
          >
            同词条重优化
          </Button>
          <Button
            variant="outlined" size="small" fullWidth
            startIcon={<AutoAwesomeIcon />}
            onClick={onIdealTemplate}
          >
            理想模板
          </Button>
        </Stack>
      )}
    </Paper>
  );
}

export default CharacterStatPanel;
