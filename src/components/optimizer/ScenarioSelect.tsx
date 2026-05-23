import React from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { useCharacterStore } from '../../store/slices/characterSlice';
import { getScenariosByCharacterId } from '../../data/scenarios';
import { ReactionType, DamagePath } from '../../types';

/** 反应类型中文标签。 */
const REACTION_LABELS: Record<string, string> = {
  [ReactionType.NONE]: '无反应',
  [ReactionType.VAPORIZE]: '蒸发',
  [ReactionType.MELT]: '融化',
  [ReactionType.OVERLOADED]: '超载',
  [ReactionType.SUPERCONDUCT]: '超导',
  [ReactionType.ELECTRO_CHARGED]: '感电',
  [ReactionType.SWIRL]: '扩散',
  [ReactionType.HYPERBLOOM]: '超绽放',
  [ReactionType.BLOOM]: '绽放',
  [ReactionType.BURGEON]: '烈绽放',
  [ReactionType.AGGRAVATION]: '超激化',
  [ReactionType.SPREAD]: '蔓激化',
};

/** 伤害路径中文标签。 */
const PATH_LABELS: Record<string, string> = {
  [DamagePath.DIRECT]: '直伤',
  [DamagePath.AMPLIFYING]: '增幅',
  [DamagePath.TRANSFORMATIVE]: '剧变',
  [DamagePath.CATALYZE]: '激化',
  [DamagePath.MOONSIGN]: '月曜',
  [DamagePath.MOONSIGN_DIRECT]: '直伤月曜',
};

/** 典型场景选择组件。 */
function ScenarioSelect(): React.ReactElement {
  const { selectedCharacter, selectedScenarioId, setSelectedScenario } = useCharacterStore();

  const scenarios = selectedCharacter
    ? getScenariosByCharacterId(selectedCharacter.id)?.scenarios ?? []
    : [];

  const handleSelect = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
  };

  if (!selectedCharacter) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">请先选择角色</Typography>
      </Paper>
    );
  }

  if (scenarios.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">该角色暂无预设场景</Typography>
      </Paper>
    );
  }

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId) ?? null;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1.5, color: 'primary.main' }}>
        典型场景
      </Typography>

      <RadioGroup
        value={selectedScenarioId ?? ''}
        onChange={(e) => handleSelect(e.target.value)}
      >
        {scenarios.map((scenario) => (
          <FormControlLabel
            key={scenario.id}
            value={scenario.id}
            control={<Radio size="small" />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {scenario.name}
                </Typography>
                <Chip
                  label={PATH_LABELS[scenario.damagePath] ?? scenario.damagePath}
                  size="small"
                  sx={{ fontSize: '0.7rem', height: 20 }}
                  color={scenario.damagePath === DamagePath.AMPLIFYING ? 'primary' : 'default'}
                  variant="outlined"
                />
                {scenario.reactionType !== ReactionType.NONE && (
                  <Chip
                    label={REACTION_LABELS[scenario.reactionType] ?? scenario.reactionType}
                    size="small"
                    sx={{ fontSize: '0.7rem', height: 20 }}
                    color="secondary"
                    variant="outlined"
                  />
                )}
              </Box>
            }
            sx={{ mb: 0.5, alignItems: 'flex-start' }}
          />
        ))}
      </RadioGroup>

      {/* 选中场景的参数展示 */}
      {selectedScenario && (
        <Box
          sx={{
            mt: 1.5,
            p: 1.5,
            borderRadius: 1,
            bgcolor: 'rgba(212, 168, 67, 0.06)',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            {selectedScenario.description}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary">
              倍率: {(selectedScenario.skillMultiplier * 100).toFixed(0)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              敌人Lv.{selectedScenario.enemyLevel}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              抗性: {(selectedScenario.enemyResistance * 100).toFixed(0)}%
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
}

export default ScenarioSelect;
