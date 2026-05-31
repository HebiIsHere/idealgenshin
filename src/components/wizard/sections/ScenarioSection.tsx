import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import type { StatScaling } from '../../../types';

interface ScenarioSectionProps {
  customScaling: StatScaling;
  setCustomScaling: (v: StatScaling) => void;
  scalingEntries: { key: keyof StatScaling; value: number }[];
  reactionOptions: { type: string; label: string }[];
  reactIdx: number;
  handleReactionChange: (idx: number) => void;
  reactionType: string;
}

const scalingLabels: Record<string, string> = { atkRatio: '攻击力', hpRatio: '生命值', defRatio: '防御力', emRatio: '元素精通' };

export default function ScenarioSection({
  customScaling, setCustomScaling, scalingEntries, reactionOptions, reactIdx, handleReactionChange, reactionType,
}: ScenarioSectionProps) {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 0.5, color: 'primary.main' }}>倍率与反应</Typography>
      <Box sx={{ mb: 2, p: 1.25, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2, borderLeft: '2px solid', borderColor: 'primary.main' }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'primary.main' }}>倍率</Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', display: 'block', mb: 1 }}>
          至多两种属性混合，直接输入百分比数值（如 230.7 表示 230.7%）
        </Typography>
        {scalingEntries.map((entry) => (
          <Box key={entry.key} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <FormControl size="small" sx={{ width: 100 }}>
              <Select value={entry.key} onChange={(e) => {
                const newKey = e.target.value as keyof StatScaling;
                const next = { atkRatio: 0, hpRatio: 0, defRatio: 0, emRatio: 0 } as StatScaling;
                next[newKey] = entry.value;
                setCustomScaling(next);
              }}>
                {(['atkRatio', 'hpRatio', 'defRatio', 'emRatio'] as (keyof StatScaling)[]).filter(k => k === entry.key || !scalingEntries.some(s => s.key === k)).map(k => (
                  <MenuItem key={k} value={k}>{scalingLabels[k]}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField size="small" type="number" value={Number((entry.value * 100).toFixed(4))} sx={{ width: 80 }}
              slotProps={{ htmlInput: { step: 0.1, min: 0 } }}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) {
                  const next = { ...customScaling };
                  next[entry.key] = v / 100;
                  setCustomScaling(next);
                }
              }} />
            <Typography variant="caption" color="text.secondary">%</Typography>
            {scalingEntries.length > 1 && (
              <Button size="small" color="error" sx={{ minWidth: 24, fontSize: '0.7rem' }} onClick={() => {
                const next = { ...customScaling };
                next[entry.key] = 0;
                setCustomScaling(next);
              }}>×</Button>
            )}
          </Box>
        ))}
        {scalingEntries.length < 2 && (
          <Button size="small" variant="outlined" sx={{ mt: 0.5 }} onClick={() => {
            const unused = (['atkRatio', 'hpRatio', 'defRatio', 'emRatio'] as (keyof StatScaling)[]).find(k => !scalingEntries.some(s => s.key === k));
            if (unused) {
              const next = { ...customScaling };
              next[unused] = 1;
              setCustomScaling(next);
            }
          }}>+ 添加倍率种类</Button>
        )}
      </Box>
      <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>反应类型</Typography>
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
        {reactionOptions.map((opt, i) => (
          <Chip key={opt.type} label={opt.label} color={reactIdx === i ? 'primary' : 'default'} variant={reactIdx === i ? 'filled' : 'outlined'} onClick={() => handleReactionChange(i)} size="small" />
        ))}
      </Box>
      <Box sx={{ mb: 1, p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          反应系数: {reactionType === 'NONE' ? '1.0' : reactionType === 'VAPORIZE' ? '1.5/2.0' : reactionType === 'MELT' ? '1.5/2.0' : reactionType === 'MOON_ELECTRO' ? '3.0' : reactionType === 'MOON_BLOOM' ? '1.0' : reactionType === 'MOON_CRYSTAL' ? '1.6' : reactionType === 'REACTION_MOON_ELECTRO' ? '1.8' : reactionType === 'REACTION_MOON_CRYSTAL' ? '0.96' : '—'} · 怪物抗性: 10% · 怪物等级: 100
        </Typography>
      </Box>
    </Box>
  );
}
