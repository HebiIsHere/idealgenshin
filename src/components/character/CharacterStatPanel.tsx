import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import CalculateIcon from '@mui/icons-material/Calculate';
import TuneIcon from '@mui/icons-material/Tune';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { ComputedStats } from '../../types';

interface CharacterStatPanelProps {
  stats: ComputedStats | null;
  showActions?: boolean;
  compact?: boolean;
  onCalcDamage?: () => void;
  onRedistribute?: () => void;
  onIdealTemplate?: () => void;
}

function StatRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Box
      sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        px: 1, py: 0.25, borderRadius: 0.5, bgcolor: 'rgba(255,255,255,0.03)',
      }}
    >
      <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.78rem',
        color: accent ? 'primary.main' : 'rgba(255,255,255,0.85)' }}>
        {value}
      </Typography>
    </Box>
  );
}

function CharacterStatPanel({
  stats,
  showActions = false,
  compact = false,
  onCalcDamage,
  onRedistribute,
  onIdealTemplate,
}: CharacterStatPanelProps): React.ReactElement {
  const [expanded, setExpanded] = React.useState(false);

  if (compact && stats) {
    const compactExtra: { label: string; value: string }[] = [
      { label: '生命', value: stats.totalHp.toFixed(0) },
      { label: '防御', value: stats.totalDef.toFixed(0) },
      { label: '充能', value: (stats.er * 100).toFixed(1) + '%' },
      { label: '增伤', value: (stats.dmgBonus * 100).toFixed(1) + '%' },
    ];
    if (stats.baseDamageFlat !== undefined && stats.baseDamageFlat > 0) {
      compactExtra.push({ label: '基础伤害', value: stats.baseDamageFlat.toFixed(0) });
    }

    return (
      <Box>
        <Collapse in={expanded}>
          <Box sx={{
            display: 'flex', gap: 1.5, flexWrap: 'wrap', pb: 0.5,
            justifyContent: 'center',
          }}>
            {compactExtra.map((r) => (
              <Typography key={r.label} variant="caption" sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                {r.label} {r.value}
              </Typography>
            ))}
          </Box>
        </Collapse>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>ATK {stats.totalAtk.toFixed(0)}</Typography>
          <Typography variant="caption" sx={{ color: 'primary.main', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>CR {(stats.critRate * 100).toFixed(1)}%</Typography>
          <Typography variant="caption" sx={{ color: 'primary.main', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>CD {(stats.critDmg * 100).toFixed(1)}%</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>EM {stats.em.toFixed(0)}</Typography>

          <Button
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{ textTransform: 'none', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', minWidth: 0, px: 0.25, py: 0 }}
          >
            {expanded ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
          </Button>

          {showActions && (
            <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
              <Button variant="contained" size="small" onClick={onCalcDamage} sx={{ fontSize: '0.65rem', px: 1, py: 0.25, minWidth: 0 }}>计算</Button>
              <Button variant="outlined" size="small" onClick={onRedistribute} sx={{ fontSize: '0.65rem', px: 1, py: 0.25, minWidth: 0 }}>重优化</Button>
              <Button variant="outlined" size="small" onClick={onIdealTemplate} sx={{ fontSize: '0.65rem', px: 1, py: 0.25, minWidth: 0 }}>理想</Button>
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  if (!stats) {
    return (
      <Paper sx={{ p: 2, opacity: 0.5, border: '1px solid rgba(255,255,255,0.04)' }}>
        <Typography variant="subtitle2" sx={{ color: 'primary.main', mb: 0.5 }}>
          角色面板
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', mb: 1 }}>
          选择角色后自动计算
        </Typography>
        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)' }}>
          在「角色选择」卡片中挑选角色，或在「Enka 导入」中通过 UID 导入
        </Typography>
      </Paper>
    );
  }

  const core: { label: string; value: string; accent?: boolean }[] = [
    { label: '攻击力', value: stats.totalAtk.toFixed(4) },
    { label: '暴击率', value: (stats.critRate * 100).toFixed(4) + '%', accent: true },
    { label: '暴击伤害', value: (stats.critDmg * 100).toFixed(4) + '%', accent: true },
  ];

  const extra: { label: string; value: string; accent?: boolean }[] = [
    { label: '生命值', value: stats.totalHp.toFixed(4) },
    { label: '防御力', value: stats.totalDef.toFixed(4) },
    { label: '元素精通', value: stats.em.toFixed(4) },
    { label: '充能效率', value: (stats.er * 100).toFixed(4) + '%' },
    { label: '伤害加成', value: (stats.dmgBonus * 100).toFixed(4) + '%' },
  ];

  return (
    <Paper sx={{ p: 2, boxShadow: '0 4px 24px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main', fontWeight: 600, fontSize: '0.8rem' }}>
        角色面板
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {core.map((r) => (
          <StatRow key={r.label} {...r} />
        ))}

        <Collapse in={expanded}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.25 }}>
            {extra.map((r) => (
              <StatRow key={r.label} {...r} />
            ))}
          </Box>
        </Collapse>

        <Button
          size="small"
          onClick={() => setExpanded(!expanded)}
          endIcon={expanded ? <ExpandLessIcon fontSize="inherit" /> : <ExpandMoreIcon fontSize="inherit" />}
          sx={{ textTransform: 'none', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', justifyContent: 'flex-start', px: 0.5, py: 0, minHeight: 20, mt: 0.25 }}
        >
          {expanded ? '收起' : `展开全部（${extra.length} 项）`}
        </Button>
      </Box>

      {showActions && (
        <Stack spacing={0.75} sx={{ mt: 1.5 }}>
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
