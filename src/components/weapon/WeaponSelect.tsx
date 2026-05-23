import React, { useState, useMemo } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { getWeaponsByType } from '../../data/weapons/index';
import { useCharacterStore } from '../../store/slices/characterSlice';

/** 副属性中文标签 */
const SUBSTAT_LABELS: Record<string, string> = {
  ATK_PERCENT: '攻击力%',
  DEF_PERCENT: '防御力%',
  HP_PERCENT: '生命值%',
  CRIT_RATE: '暴击率',
  CRIT_DMG: '暴击伤害',
  ELEMENTAL_MASTERY: '元素精通',
  ENERGY_RECHARGE: '充能效率',
  PHYSICAL_DMG_BONUS: '物理伤害加成',
};

function substatDisplay(type: string, value: number): string {
  const label = SUBSTAT_LABELS[type] || type;
  if (type === 'ELEMENTAL_MASTERY') return `${label} ${Math.round(value)}`;
  return `${label} ${(value * 100).toFixed(1)}%`;
}

/** Weapon selector with type-based filtering, auto-fill, and substat display. */
function WeaponSelect(): React.ReactElement {
  const { selectedCharacter, weaponConfig, setWeaponConfig } = useCharacterStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredWeapons = useMemo(() => {
    if (!selectedCharacter) return [];
    const byType = getWeaponsByType(selectedCharacter.weaponType);
    if (!searchQuery.trim()) return byType;
    const q = searchQuery.toLowerCase();
    return byType.filter(
      (w) => w.nameZh.includes(searchQuery) || w.name.toLowerCase().includes(q),
    );
  }, [selectedCharacter, searchQuery]);

  const currentWeapon = weaponConfig?.weaponData ?? null;

  return (
    <Autocomplete
      options={filteredWeapons}
      getOptionLabel={(option) => `${option.nameZh} (${option.name})`}
      value={currentWeapon}
      onChange={(_event, newValue) => {
        if (newValue) {
          setWeaponConfig(newValue, 90);
          setSearchQuery(newValue.nameZh);
        }
      }}
      inputValue={searchQuery}
      onInputChange={(_event, newInputValue) => setSearchQuery(newInputValue)}
      filterOptions={(x) => x}
      clearOnBlur={false}
      selectOnFocus
      renderOption={(props, option) => {
        const { key, ...restProps } = props as any;
        return (
          <Box component="li" key={option.id} {...restProps} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`${option.rarity}★`}
              size="small"
              sx={{
                bgcolor: option.rarity >= 5 ? 'rgba(212, 168, 67, 0.2)' : 'rgba(160, 120, 80, 0.15)',
                color: option.rarity >= 5 ? '#D4A843' : '#C0A080',
                fontWeight: 600,
                fontSize: '0.7rem',
              }}
            />
            <Typography sx={{ flexGrow: 1 }}>{option.nameZh}</Typography>
            <Typography variant="caption" color="text.secondary">
              ATK {option.baseAtk}
            </Typography>
            <Typography variant="caption" sx={{ color: 'primary.main', ml: 0.5 }}>
              {substatDisplay(option.substatType, option.substatValue)}
            </Typography>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="选择武器"
          placeholder={selectedCharacter ? '搜索武器…' : '请先选择角色'}
          size="small"
          disabled={!selectedCharacter}
        />
      )}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      sx={{ minWidth: 260 }}
    />
  );
}

export default WeaponSelect;
