import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type { ArtifactInstance } from '../../types';
import { ArtifactSlotType, SubstatType } from '../../types';
import { useArtifactStore } from '../../store/slices/artifactSlice';
import {
  MAIN_STAT_BY_SLOT,
  MAIN_STAT_MAX_VALUES,
  STAT_DISPLAY_NAMES,
  ROLLABLE_SUBSTAT_TYPES,
} from '../../data/constants';
import { generateId } from '../../utils/helper';
import { formatStatValue } from '../../utils/format';

const SLOT_NAMES: Record<ArtifactSlotType, string> = {
  [ArtifactSlotType.FLOWER]: '生之花',
  [ArtifactSlotType.FEATHER]: '死之羽',
  [ArtifactSlotType.SANDS]: '时之沙',
  [ArtifactSlotType.GOBLET]: '空之杯',
  [ArtifactSlotType.CIRCLET]: '理之冠',
};

/** Artifact editor — manual entry form for all 5 artifact pieces. */
function ArtifactEditor(): React.ReactElement {
  const { artifacts, setArtifact } = useArtifactStore();

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ color: 'primary.main', mb: 1 }}>
        圣遗物手动录入
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 1,
        }}
      >
        {Object.values(ArtifactSlotType).map((slot) => (
          <ArtifactSlotEditor
            key={slot}
            slot={slot}
            artifact={artifacts[slot]}
            onChange={(artifact) => setArtifact(slot, artifact)}
          />
        ))}
      </Box>
    </Box>
  );
}

/** Editor for a single artifact slot. */
function ArtifactSlotEditor({
  slot,
  artifact,
  onChange,
}: {
  slot: ArtifactSlotType;
  artifact: ArtifactInstance | null;
  onChange: (artifact: ArtifactInstance | null) => void;
}): React.ReactElement {
  const validMainStats = MAIN_STAT_BY_SLOT[slot] ?? [];
  const currentMainStat = artifact?.mainStatType ?? validMainStats[0];

  // Auto-initialize artifact when the slot has only one possible main stat
  // (e.g. Flower always has HP_FLAT, Feather always has ATK_FLAT)
  // Without this, the Select won't trigger onChange for a single-option list,
  // leaving artifact stuck as null and preventing sub-stat addition.
  React.useEffect(() => {
    if (artifact == null && validMainStats.length === 1) {
      handleMainStatChange(validMainStats[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot]);

  const handleMainStatChange = (newMainType: SubstatType) => {
    const newArtifact: ArtifactInstance = {
      id: artifact?.id ?? generateId(),
      slot,
      mainStatType: newMainType,
      mainStatValue: MAIN_STAT_MAX_VALUES[newMainType] ?? 0,
      subStats: artifact?.subStats ?? [],
      setName: artifact?.setName ?? '',
    };
    onChange(newArtifact);
  };

  const handleSubStatChange = (index: number, field: 'type' | 'value', val: string | number) => {
    if (!artifact) return;
    const newSubStats = [...artifact.subStats];
    if (field === 'type') {
      newSubStats[index] = { ...newSubStats[index], type: val as SubstatType, value: 0 };
    } else {
      newSubStats[index] = { ...newSubStats[index], value: val as number };
    }
    onChange({ ...artifact, subStats: newSubStats });
  };

  const handleAddSubStat = () => {
    if (!artifact || artifact.subStats.length >= 4) return;
    const usedTypes = new Set(artifact.subStats.map((s) => s.type));
    usedTypes.add(artifact.mainStatType);
    const availableType = ROLLABLE_SUBSTAT_TYPES.find((t) => !usedTypes.has(t));
    if (!availableType) return;
    onChange({
      ...artifact,
      subStats: [...artifact.subStats, { type: availableType, value: 0 }],
    });
  };

  const handleRemoveSubStat = (index: number) => {
    if (!artifact) return;
    onChange({
      ...artifact,
      subStats: artifact.subStats.filter((_, i) => i !== index),
    });
  };

  return (
    <Paper sx={{ p: 1.5 }}>
      <Typography variant="caption" sx={{ mb: 1, display: 'block', color: 'primary.main', fontWeight: 600 }}>
        {SLOT_NAMES[slot]}
      </Typography>

      {/* Main stat selector */}
      <FormControl size="small" sx={{ mb: 1.5, minWidth: 160 }}>
        <InputLabel>主词条</InputLabel>
        <Select
          value={currentMainStat}
          label="主词条"
          onChange={(e) => handleMainStatChange(e.target.value as SubstatType)}
        >
          {validMainStats.map((type) => (
            <MenuItem key={type} value={type}>
              {STAT_DISPLAY_NAMES[type]} ({formatStatValue(type, MAIN_STAT_MAX_VALUES[type] ?? 0)})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Sub-stats */}
      {artifact?.subStats.map((sub, index) => (
        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={sub.type}
              onChange={(e) => handleSubStatChange(index, 'type', e.target.value)}
            >
              {ROLLABLE_SUBSTAT_TYPES.map((type) => (
                <MenuItem key={type} value={type} disabled={type === currentMainStat}>
                  {STAT_DISPLAY_NAMES[type]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            type="number"
            value={sub.value}
            onChange={(e) => handleSubStatChange(index, 'value', parseFloat(e.target.value) || 0)}
            size="small"
            sx={{ width: 80 }}
            inputProps={{ min: 0, step: 0.1 }}
          />
          <IconButton size="small" onClick={() => handleRemoveSubStat(index)} color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}

      {artifact != null && artifact.subStats.length < 4 && (
        <IconButton size="small" onClick={handleAddSubStat} sx={{ color: 'primary.main' }}>
          <AddIcon fontSize="small" />
          <Typography variant="caption">添加副词条</Typography>
        </IconButton>
      )}
      {artifact == null && (
        <Typography variant="caption" sx={{ color: 'text.disabled', pl: 1 }}>
          请先选择主词条
        </Typography>
      )}
    </Paper>
  );
}

export default ArtifactEditor;
