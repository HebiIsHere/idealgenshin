import React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Chip from '@mui/material/Chip';
import { ReactionType } from '../../types';
import type { StatScaling } from '../../types';
import { useCharacterStore } from '../../store/slices/characterSlice';

/**
 * Derive a Chinese display label from a StatScaling object.
 * Picks the stat with the highest ratio.
 */
function getScalingLabel(scaling: StatScaling): string {
  const ratios: Array<{ label: string; ratio: number }> = [
    { label: '攻击力', ratio: scaling.atkRatio },
    { label: '生命值', ratio: scaling.hpRatio },
    { label: '防御力', ratio: scaling.defRatio },
    { label: '元素精通', ratio: scaling.emRatio },
  ];
  // Sort by ratio descending; pick the highest
  ratios.sort((a, b) => b.ratio - a.ratio);
  if (ratios[0].ratio > 0) {
    return ratios[0].label;
  }
  // Default fallback
  return '攻击力';
}

interface SkillInputProps {
  /** Whether to show reaction type selector. */
  showReaction?: boolean;
}

/** Skill multiplier input and reaction type selector. */
function SkillInput({ showReaction = true }: SkillInputProps): React.ReactElement {
  const {
    skillMultiplier,
    setSkillMultiplier,
    reactionType,
    setReactionType,
    amplifyingMultiplier,
    setAmplifyingMultiplier,
    selectedCharacter,
  } = useCharacterStore();

  const scalingLabel = selectedCharacter
    ? getScalingLabel(selectedCharacter.defaultStatScaling)
    : '攻击力';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Skill Multiplier */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <TextField
          label="技能倍率 (%)"
          type="number"
          value={(skillMultiplier * 100).toFixed(1)}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) setSkillMultiplier(val / 100);
          }}
          size="small"
          inputProps={{ min: 0, step: 10 }}
          helperText="输入技能倍率百分比，如 328 表示 328%"
          sx={{ flex: 1 }}
        />
        <Chip
          label={`基于${scalingLabel}`}
          size="small"
          sx={{
            mt: 0.5,
            bgcolor: 'rgba(212, 168, 67, 0.15)',
            color: 'primary.main',
            fontWeight: 600,
            fontSize: '0.75rem',
          }}
        />
      </Box>

      {/* Reaction Type */}
      {showReaction && (
        <FormControl size="small">
          <InputLabel>反应类型</InputLabel>
          <Select
            value={reactionType}
            label="反应类型"
            onChange={(e) => setReactionType(e.target.value as ReactionType)}
          >
            <MenuItem value={ReactionType.NONE}>无反应</MenuItem>
            <MenuItem value={ReactionType.VAPORIZE}>蒸发</MenuItem>
            <MenuItem value={ReactionType.MELT}>融化</MenuItem>
            <MenuItem value={ReactionType.OVERLOADED}>超载</MenuItem>
            <MenuItem value={ReactionType.SUPERCONDUCT}>超导</MenuItem>
            <MenuItem value={ReactionType.ELECTRO_CHARGED}>感电</MenuItem>
            <MenuItem value={ReactionType.SWIRL}>扩散</MenuItem>
            <MenuItem value={ReactionType.HYPERBLOOM}>超绽放</MenuItem>
            <MenuItem value={ReactionType.BLOOM}>绽放</MenuItem>
            <MenuItem value={ReactionType.BURGEON}>烈绽放</MenuItem>
            <MenuItem value={ReactionType.AGGRAVATION}>超激化</MenuItem>
            <MenuItem value={ReactionType.SPREAD}>蔓激化</MenuItem>
            <MenuItem value={ReactionType.MOON_BLOOM}>月绽放</MenuItem>
            <MenuItem value={ReactionType.MOON_ELECTRO}>月感电</MenuItem>
            <MenuItem value={ReactionType.MOON_CRYSTAL}>月结晶</MenuItem>
            <MenuItem value={ReactionType.REACTION_MOON_ELECTRO}>反应月感电</MenuItem>
            <MenuItem value={ReactionType.REACTION_MOON_CRYSTAL}>反应月结晶</MenuItem>
          </Select>
        </FormControl>
      )}

      {/* Amplifying Multiplier (only for amplifying reactions) */}
      {(reactionType === ReactionType.VAPORIZE || reactionType === ReactionType.MELT) && (
        <FormControl size="small">
          <InputLabel>反应倍率</InputLabel>
          <Select
            value={amplifyingMultiplier}
            label="反应倍率"
            onChange={(e) => setAmplifyingMultiplier(parseFloat(e.target.value as string))}
          >
            <MenuItem value={1.5}>1.5×</MenuItem>
            <MenuItem value={2.0}>2.0×</MenuItem>
          </Select>
        </FormControl>
      )}
    </Box>
  );
}

export default SkillInput;
