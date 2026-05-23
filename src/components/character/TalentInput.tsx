import React, { useMemo } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Chip from '@mui/material/Chip';
import ZoneBonusInput from '../common/ZoneBonusInput';
import { useCharacterStore } from '../../store/slices/characterSlice';
import type { ZoneBonusInput as ZoneBonusInputType } from '../../types';
import talentRef from '../../data/talents/ref.json';

/** Talent reference data type. */
interface TalentEntry {
  key: string;
  name: string;
  description: string;
  params: string[];
}

/**
 * TalentInput — 天赋模拟组件。
 * 左侧展开天赋名+描述+参数（来自 ref.json），右侧 ZoneBonusInput 供用户手动填入。
 */
function TalentInput(): React.ReactElement {
  const { selectedCharacter, talentConfig, setTalentConfig } = useCharacterStore();

  const talents: TalentEntry[] = useMemo(() => {
    if (!selectedCharacter) return [];
    const ref = (talentRef as Record<string, { talents: TalentEntry[] }>)[selectedCharacter.id];
    return ref?.talents ?? [];
  }, [selectedCharacter]);

  const handleChange = (newBonus: ZoneBonusInputType) => {
    setTalentConfig(newBonus);
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1, color: 'primary.main' }}>
        天赋
      </Typography>

      {talents.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {selectedCharacter ? '暂无天赋数据' : '请先选择角色'}
        </Typography>
      )}

      {talents.map((talent) => (
        <Accordion
          key={talent.key}
          disableGutters
          sx={{
            mb: 0.5,
            bgcolor: 'rgba(212, 168, 67, 0.04)',
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ fontSize: '1rem' }} />}
            sx={{ minHeight: 36, '& .MuiAccordionSummary-content': { my: 0.5, alignItems: 'center', gap: 1 } }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {talent.name}
            </Typography>
            {talent.params.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {talent.params.slice(0, 2).map((p, i) => (
                  <Chip
                    key={i}
                    label={p.split('|').pop() || p}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.6rem', height: 18, '& .MuiChip-label': { px: 0.75 } }}
                  />
                ))}
              </Box>
            )}
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, pb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap', mb: talent.params.length > 0 ? 1 : 0 }}>
              {talent.description || '暂无描述'}
            </Typography>
            {talent.params.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, p: 0.75, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.03)' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.25 }}>Lv.10 倍率：</Typography>
                {talent.params.map((p, i) => (
                  <Typography key={i} variant="caption" sx={{ color: 'primary.main', lineHeight: 1.5 }}>
                    {p}
                  </Typography>
                ))}
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      ))}

      <Box sx={{ mt: 1.5 }}>
        <Typography variant="body2" sx={{ mb: 0.75, color: 'text.secondary' }}>
          请根据天赋效果，手动填入各乘区的实际加成数值
        </Typography>
        <ZoneBonusInput
          value={talentConfig?.bonus ?? {}}
          onChange={handleChange}
          disabled={!selectedCharacter}
        />
      </Box>
    </Paper>
  );
}

export default TalentInput;
