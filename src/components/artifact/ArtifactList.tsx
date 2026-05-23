import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import type { ArtifactInstance } from '../../types';
import { STAT_DISPLAY_NAMES } from '../../data/constants';
import { formatStatValue } from '../../utils/format';

const SLOT_NAMES: Record<string, string> = {
  FLOWER: '生之花',
  FEATHER: '死之羽',
  SANDS: '时之沙',
  GOBLET: '空之杯',
  CIRCLET: '理之冠',
};

interface ArtifactListProps {
  /** Array of artifact instances to display. */
  artifacts: ArtifactInstance[];
}

/** Display artifacts as a list of compact cards. */
function ArtifactList({ artifacts }: ArtifactListProps): React.ReactElement {
  if (artifacts.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">暂无圣遗物数据</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {artifacts.map((artifact) => (
        <ArtifactCard key={artifact.id} artifact={artifact} />
      ))}
    </Box>
  );
}

function ArtifactCard({ artifact }: { artifact: ArtifactInstance }): React.ReactElement {
  const slotName = SLOT_NAMES[artifact.slot] ?? artifact.slot;
  const mainName = STAT_DISPLAY_NAMES[artifact.mainStatType] ?? artifact.mainStatType;
  const mainValue = formatStatValue(artifact.mainStatType, artifact.mainStatValue);

  return (
    <Paper
      sx={{
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderLeft: '3px solid',
        borderColor: 'primary.main',
      }}
    >
      <Typography variant="caption" sx={{ minWidth: 48, color: 'text.secondary' }}>
        {slotName}
      </Typography>
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>
            {mainName}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {mainValue}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {artifact.subStats.map((sub, i) => (
            <Chip
              key={i}
              label={`${STAT_DISPLAY_NAMES[sub.type] ?? sub.type} ${formatStatValue(sub.type, sub.value)}`}
              size="small"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          ))}
        </Box>
      </Box>
    </Paper>
  );
}

export default ArtifactList;
