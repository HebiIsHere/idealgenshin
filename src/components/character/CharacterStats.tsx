import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import type { ComputedStats } from '../../types';
import { formatStatValue } from '../../utils/format';
import { SubstatType } from '../../types';
import { STAT_DISPLAY_NAMES } from '../../data/constants';

interface CharacterStatsProps {
  /** Computed stats to display. */
  stats: ComputedStats | null;
}

/** Display a character's computed stats in a panel. */
function CharacterStats({ stats }: CharacterStatsProps): React.ReactElement {
  if (!stats) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">请先选择角色</Typography>
      </Paper>
    );
  }

  const statEntries: Array<{ type: SubstatType; value: number }> = [
    { type: SubstatType.HP_FLAT, value: stats.totalHp },
    { type: SubstatType.ATK_FLAT, value: stats.totalAtk },
    { type: SubstatType.DEF_FLAT, value: stats.totalDef },
    { type: SubstatType.CRIT_RATE, value: stats.critRate },
    { type: SubstatType.CRIT_DMG, value: stats.critDmg },
    { type: SubstatType.ELEMENTAL_MASTERY, value: stats.em },
    { type: SubstatType.ENERGY_RECHARGE, value: stats.er },
    { type: SubstatType.PYRO_DMG_BONUS, value: stats.dmgBonus },
  ];

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1.5, color: 'primary.main' }}>
        角色属性
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0.5 }}>
        {statEntries.map((entry) => (
          <Box
            key={entry.type}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 0.5,
              px: 1,
              borderRadius: 1,
              '&:hover': { bgcolor: 'rgba(212, 168, 67, 0.05)' },
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {entry.type === SubstatType.PYRO_DMG_BONUS ? '伤害加成' : STAT_DISPLAY_NAMES[entry.type]}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {entry.type === SubstatType.PYRO_DMG_BONUS
                ? formatStatValue(SubstatType.PYRO_DMG_BONUS, entry.value)
                : formatStatValue(entry.type, entry.value)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

export default CharacterStats;
