import React, { useMemo, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Fab from '@mui/material/Fab';
import Popover from '@mui/material/Popover';
import Tooltip from '@mui/material/Tooltip';
import BarChartIcon from '@mui/icons-material/BarChart';
import CharacterSelect from '../character/CharacterSelect';
import CharacterStatPanel from '../character/CharacterStatPanel';
import WeaponSelect from '../weapon/WeaponSelect';
import WeaponPassiveInput from '../weapon/WeaponPassiveInput';
import ConstellationInput from '../character/ConstellationInput';
import TalentInput from '../character/TalentInput';
import ArtifactImport from '../artifact/ArtifactImport';
import ArtifactEditor from '../artifact/ArtifactEditor';
import ArtifactSetSelect from '../artifact/ArtifactSetSelect';
import { useCharacterStore } from '../../store/slices/characterSlice';
import { useArtifactStore } from '../../store/slices/artifactSlice';
import { StatCalculator } from '../../engine/stats';
import { searchCharacters } from '../../data/characters';
import avatarMap from '../../data/avatar_to_character.json';
import { DEFAULT_WEAPON, getWeaponById } from '../../data/weapons';
import type { CharacterBuild, ArtifactInstance } from '../../types';
import { ArtifactSlotType } from '../../types';

const SUBSTAT_LABEL: Record<string, string> = {
  ATK_PERCENT: '攻击力%', DEF_PERCENT: '防御力%', HP_PERCENT: '生命值%',
  CRIT_RATE: '暴击率', CRIT_DMG: '暴击伤害',
  ELEMENTAL_MASTERY: '元素精通', ENERGY_RECHARGE: '充能效率',
  PHYSICAL_DMG_BONUS: '物理伤害',
};

/**
 * CharacterSetupTab — Tab1: 角色与装备。
 *
 * 布局：
 *   1. Enka 自动导入（顶部紧凑卡片，点击导入后将数据填充到下方角色配置）
 *   2. 角色配置（主体）
 *      - 角色 + 等级
 *      - 武器 + 被动
 *      - 命座模拟
 *      - 圣遗物属性
 *      - 圣遗物套装
 *   3. 动态角色面板
 */
function CharacterSetupTab(): React.ReactElement {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const panelOpen = Boolean(anchorEl);
  const {
    selectedCharacter, characterLevel, skillMultiplier, reactionType, teamBuffs,
    weaponConfig, constellationConfig, talentConfig, setBonus, statConversions, setConversions, setCharacterLevel, selectCharacter, setWeaponConfig, setWeaponRefinement,
  } = useCharacterStore();

  const {
    artifacts, showcaseCharacters, selectedShowcaseIdx,
  } = useArtifactStore();

  // 当Enka导入的角色变化时，通过 avatarId 精确匹配项目角色
  useEffect(() => {
    if (showcaseCharacters.length === 0) return;
    const sc = showcaseCharacters[selectedShowcaseIdx];
    if (!sc) return;
    
    // 通过 avatarId 映射（精确匹配）
    const mapEntry = (avatarMap as Record<string, { projectId: string; zhName: string }>)[sc.characterId];
    if (mapEntry?.projectId && mapEntry.projectId !== selectedCharacter?.id) {
      selectCharacter(mapEntry.projectId);
    }
    
    // 自动填充等级
    if (sc.characterLevel !== characterLevel) {
      setCharacterLevel(sc.characterLevel);
    }

    // 自动填充武器（Enka 导入了武器数据时）
    if (sc.weaponProjectId && sc.weaponProjectId !== weaponConfig?.weaponData?.id) {
      const weaponData = getWeaponById(sc.weaponProjectId);
      if (weaponData) {
        setWeaponConfig(weaponData, sc.weaponLevel, sc.weaponRefinement);
      }
    }
  }, [showcaseCharacters, selectedShowcaseIdx]);

  const currentBuild = useMemo<CharacterBuild | null>(() => {
    if (!selectedCharacter) return null;
    const artifactList = Object.values(ArtifactSlotType)
      .map((slot) => artifacts[slot])
      .filter((a): a is ArtifactInstance => a !== null);
    return {
      character: selectedCharacter,
      weaponConfig: weaponConfig ?? { weaponData: DEFAULT_WEAPON, weaponLevel: 90, refinement: 1, passiveBonus: {} },
      artifacts: artifactList,
      characterLevel,
      skillMultiplier,
      reactionType,
      teamBuffs,
      constellationConfig,
      talentConfig,
      setBonus,
      statConversions: [...statConversions, ...setConversions].length > 0
        ? [...statConversions, ...setConversions] : undefined,
    };
  }, [selectedCharacter, artifacts, characterLevel, skillMultiplier, reactionType, teamBuffs, weaponConfig, constellationConfig, talentConfig, setBonus, statConversions, setConversions]);

  const computedStats = useMemo(() => {
    if (!currentBuild) return null;
    return StatCalculator.compute(currentBuild);
  }, [currentBuild]);

  // 从已导入的圣遗物中提取套装名称及件数
  const importedSetCounts = useMemo(() => {
    const counts = new Map<string, number>();
    Object.values(artifacts).forEach(a => {
      if (a?.setName) counts.set(a.setName, (counts.get(a.setName) || 0) + 1);
    });
    return Object.fromEntries(counts);
  }, [artifacts]);
  const importedSetNames = Object.keys(importedSetCounts);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* ===== 1. Enka 自动导入（紧凑卡片） ===== */}
      <ArtifactImport />

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

      {/* ===== 2. 角色配置 ===== */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, color: 'primary.main' }}>
          角色配置
        </Typography>

        {/* 角色选择 + 等级 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>角色</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <CharacterSelect />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="角色等级" type="number" value={characterLevel}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1 && val <= 90) setCharacterLevel(val);
                }}
                size="small" inputProps={{ min: 1, max: 90 }} sx={{ width: '100%' }}
              />
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.04)' }} />

        {/* 天赋 */}
        <Box sx={{ mb: 2 }}>
          <TalentInput />
        </Box>

        <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.04)' }} />

        {/* 武器 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>武器</Typography>
          <WeaponSelect />
          {weaponConfig && (
            <Box sx={{ mt: 1, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">基础攻击力: {weaponConfig.weaponData.baseAtk}</Typography>
              {weaponConfig.weaponData.substatType && weaponConfig.weaponData.substatValue > 0 && (
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                  {SUBSTAT_LABEL[weaponConfig.weaponData.substatType] || weaponConfig.weaponData.substatType}:{' '}
                  {weaponConfig.weaponData.substatType === 'ELEMENTAL_MASTERY'
                    ? Math.round(weaponConfig.weaponData.substatValue)
                    : `${(weaponConfig.weaponData.substatValue * 100).toFixed(1)}%`}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">等级: {weaponConfig.weaponLevel}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" color="text.secondary">精炼:</Typography>
                {[1, 2, 3, 4, 5].map((r) => (
                  <Chip
                    key={r}
                    label={`R${r}`}
                    size="small"
                    color={weaponConfig.refinement === r ? 'primary' : 'default'}
                    variant={weaponConfig.refinement === r ? 'filled' : 'outlined'}
                    onClick={() => setWeaponRefinement(r)}
                    sx={{ fontSize: '0.65rem', cursor: 'pointer', minWidth: 36 }}
                  />
                ))}
              </Box>
            </Box>
          )}
          {weaponConfig && <WeaponPassiveInput />}
        </Box>

        <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.04)' }} />

        {/* 命座模拟 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>命座模拟</Typography>
          <ConstellationInput />
        </Box>

        <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.04)' }} />

        {/* 圣遗物属性 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>圣遗物属性</Typography>
          <ArtifactEditor />
        </Box>

        <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.04)' }} />

        {/* 圣遗物套装 */}
        <Box>
          <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>圣遗物套装</Typography>
          <ArtifactSetSelect importedSetNames={importedSetNames} importedSetCounts={importedSetCounts} />
        </Box>
      </Paper>

      {/* ===== 3. 悬浮角色面板 ===== */}
      <Tooltip title="查看角色面板" placement="left">
        <Fab
          color="primary"
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1100 }}
        >
          <BarChartIcon />
        </Fab>
      </Tooltip>
      <Popover
        open={panelOpen}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{ paper: { sx: { borderRadius: 2, bgcolor: 'background.paper', backgroundImage: 'none' } } }}
      >
        <Box sx={{ width: 320, p: 2 }}>
          <CharacterStatPanel stats={computedStats} />
        </Box>
      </Popover>
    </Box>
  );
}

export default CharacterSetupTab;
