import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import type { ComputedStats } from '../../types';

interface CharacterStatPanelProps {
  stats: ComputedStats | null;
}

/** 角色面板——列表状排布，用于悬浮弹出。 */
function CharacterStatPanel({ stats }: CharacterStatPanelProps): React.ReactElement {
  if (!stats) {
    return (
      <Paper sx={{ p: 2, opacity: 0.5 }}>
        <Typography variant="subtitle1" sx={{ color: 'primary.main' }}>
          角色面板
        </Typography>
        <Typography variant="body2" color="text.secondary">
          请先选择角色以查看属性
        </Typography>
      </Paper>
    );
  }

  const rows: { label: string; value: string; accent?: boolean }[] = [
    { label: '生命值',    value: stats.totalHp.toFixed(0) },
    { label: '攻击力',    value: stats.totalAtk.toFixed(0) },
    { label: '防御力',    value: stats.totalDef.toFixed(0) },
    { label: '暴击率',    value: (stats.critRate * 100).toFixed(1) + '%', accent: true },
    { label: '暴击伤害',  value: (stats.critDmg * 100).toFixed(1) + '%', accent: true },
    { label: '元素精通',  value: stats.em.toFixed(0) },
    { label: '充能效率',  value: (stats.er * 100).toFixed(1) + '%' },
    { label: '伤害加成',  value: (stats.dmgBonus * 100).toFixed(1) + '%' },
  ];

  return (
    <Paper sx={{ p: 0, boxShadow: 'none', bgcolor: 'transparent' }}>
      <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main', fontWeight: 600 }}>
        角色面板
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {rows.map((r) => (
          <Box
            key={r.label}
            sx={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              px: 1.5, py: 0.75,
              borderRadius: 1,
              bgcolor: 'rgba(255,255,255,0.03)',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {r.label}
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: r.accent ? 'primary.main' : 'text.primary' }}
            >
              {r.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

export default CharacterStatPanel;
