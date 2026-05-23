import React, { useMemo, useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Alert from '@mui/material/Alert';
import ScenarioSelect from './ScenarioSelect';
import TeamBuffPanel, { TeamBuffConfig, defaultTeamBuffConfig, computeTeamBuffBonuses } from './TeamBuffPanel';
import { useCharacterStore } from '../../store/slices/characterSlice';
import { useArtifactStore } from '../../store/slices/artifactSlice';
import { StatCalculator } from '../../engine/stats';
import { DamageFormula } from '../../engine/formula';
import { DEFAULT_WEAPON } from '../../data/weapons/index';
import { getScenariosByCharacterId } from '../../data/scenarios';
import { formatDamage, formatNumber } from '../../utils/format';
import { mergeExtraBonuses } from '../../utils/mergeExtraBonuses';
import { DamagePath } from '../../types';
import type { CharacterBuild, ArtifactInstance, DamageContext, DamageResult } from '../../types';
import { ArtifactSlotType, ElementType } from '../../types';
import { getReactionOptions, isNodKraiCharacter } from '../../data/reactions';

/** 伤害路径中文标签。 */
const DAMAGE_PATH_LABELS: Record<DamagePath, string> = {
  [DamagePath.DIRECT]: '直伤',
  [DamagePath.AMPLIFYING]: '增幅',
  [DamagePath.TRANSFORMATIVE]: '剧变',
  [DamagePath.CATALYZE]: '激化',
  [DamagePath.MOONSIGN]: '月曜',
  [DamagePath.MOONSIGN_DIRECT]: '直伤月曜',
};

/** 乘区标签。 */
const ZONE_LABELS: Partial<Record<keyof Omit<DamageResult, 'totalDamage' | 'scalingMultiplier'>, string>> = {
  baseDamage: '基础伤害区',
  bonusMultiplier: '增伤区',
  critMultiplier: '暴击区',
  resistanceMultiplier: '抗性区',
  defenseMultiplier: '防御区',
  reactionMultiplier: '反应区',
  damagePath: '伤害路径',
  aggravationBonus: '激化加成',
  elevationMultiplier: '擢升乘区',
  independentMultiplier: '独立乘区',
};

const ZONE_ORDER: (keyof typeof ZONE_LABELS)[] = [
  'damagePath',
  'baseDamage',
  'bonusMultiplier',
  'critMultiplier',
  'resistanceMultiplier',
  'defenseMultiplier',
  'reactionMultiplier',
  'aggravationBonus',
  'elevationMultiplier',
  'independentMultiplier',
];

/** Debug breakdown helper — returns formula summary + detail lines for each zone. */
function getZoneDebug(key: string, result: any): { formula: string; lines: string[] } | null {
  const d = result;
  switch (key) {
    case 'baseDamage': {
      const b = d.baseDebug;
      if (!b) return null;
      return {
        formula: `ATK ${formatNumber(b.totalAtk)} × 倍率 ${formatNumber(b.skillMultiplier)}` + (b.baseDamageFlat ? ` + ${formatNumber(b.baseDamageFlat)}` : ''),
        lines: [
          `rawBase = ${formatNumber(b.totalAtk)} × ${formatNumber(b.skillMultiplier)} = ${formatNumber(b.rawBase)}`,
          ...(b.baseDamageFlat ? [`+ baseDamageFlat = ${formatNumber(b.baseDamageFlat)}`] : []),
          `= ${formatNumber(b.result)}`,
        ],
      };
    }
    case 'bonusMultiplier': {
      const b = d.bonusDebug;
      if (!b) return null;
      return { formula: `1 + ${(b.dmgBonus * 100).toFixed(1)}%`, lines: [`= 1 + ${(b.dmgBonus * 100).toFixed(1)}% = ${formatNumber(b.result, 6)}`] };
    }
    case 'critMultiplier': {
      const b = d.critDebug;
      if (!b) return null;
      return { formula: `1 + CR ${(b.critRate * 100).toFixed(1)}% × CD ${(b.critDmg * 100).toFixed(1)}%`, lines: [`= 1 + ${(b.effectiveCritRate * 100).toFixed(1)}% × ${(b.critDmg * 100).toFixed(1)}% = ${formatNumber(b.result, 6)}`] };
    }
    case 'resistanceMultiplier': {
      const b = d.resistDebug;
      if (!b) return null;
      const r = b.effectiveRes;
      const formulaDesc = r < 0 ? `1 − ${r.toFixed(2)}/2` : r < 0.75 ? `1 − ${r.toFixed(2)}` : `1/(1+4×${r.toFixed(2)})`;
      return { formula: `基础抗性 ${(b.enemyResistance * 100).toFixed(0)}% − 减抗 ${(b.resistReduction * 100).toFixed(0)}%`, lines: [`有效抗性 = ${(b.enemyResistance * 100).toFixed(1)}% − ${(b.resistReduction * 100).toFixed(1)}% = ${(r * 100).toFixed(1)}%`, `= ${formulaDesc} = ${formatNumber(b.result, 6)}`] };
    }
    case 'defenseMultiplier': {
      const b = d.defenseDebug;
      if (!b) return null;
      return {
        formula: `(${b.characterLevel}+100)/((${b.characterLevel}+100)+(${b.enemyLevel}+100))`,
        lines: [
          `= ${b.charTerm} / (${b.charTerm} + ${b.enemyTerm}×${1 - b.defReductionSum}×${1 - b.defIgnore})`,
          `= ${b.charTerm} / (${b.charTerm} + ${b.effectiveEnemyDef}) = ${formatNumber(b.result, 6)}`,
        ],
      };
    }
    case 'reactionMultiplier': {
      const b = d.ampDebug || d.transDebug;
      if (!b) return null;
      if ('baseMultiplier' in b) return { formula: `${b.baseMultiplier} × (1 + EM加成${b.ampReactionBonus ? '+' + (b.ampReactionBonus*100).toFixed(0) + '%' : ''})`, lines: [`= ${b.baseMultiplier} × (1 + ${(b.emBonus * 100).toFixed(1)}%${b.ampReactionBonus ? ' + ' + (b.ampReactionBonus*100).toFixed(1) + '%' : ''}) = ${formatNumber(b.result, 6)}`] };
      const rbonus = (b.transformReactionBonus ?? b.moonReactionBonus ?? 0);
      return { formula: `系数 ${b.rate ?? b.moonRate} × 等级乘数`, lines: [`= ${b.rate ?? b.moonRate} × ${formatNumber(b.levelMultiplier)} × (1 + ${(b.emBonus * 100).toFixed(1)}%${rbonus ? ' + ' + (rbonus * 100).toFixed(1) + '%' : ''}) = ${formatNumber(b.result)}`] };
    }
    case 'aggravationBonus': {
      const b = d.cataDebug;
      if (!b) return null;
      return { formula: `${b.baseRate} × 等级乘数 × (1 + EM)`, lines: [`= ${b.baseRate} × ${formatNumber(b.levelMultiplier)} × (1 + ${(b.emBonus * 100).toFixed(1)}%) = ${formatNumber(b.result)}`] };
    }
    case 'elevationMultiplier': {
      const b = d.elevDebug;
      if (!b) return null;
      return { formula: `1 + ${(b.elevationBonus * 100).toFixed(0)}%`, lines: [`= 1 + ${(b.elevationBonus * 100).toFixed(1)}% = ${formatNumber(b.result, 6)}`] };
    }
    case 'independentMultiplier': {
      const b = d.indepDebug;
      if (!b) return null;
      return { formula: `1 + ${(b.talentBonus * 100).toFixed(0)}% + ${(b.ctxBonus * 100).toFixed(0)}%`, lines: [`= 1 + ${(b.talentBonus * 100).toFixed(1)}% + ${(b.ctxBonus * 100).toFixed(1)}% = ${formatNumber(b.result, 6)}`] };
    }
    default:
      return null;
  }
}

/**
 * DamageCalcTab — Tab2: 伤害计算。
 * 典型场景选择 + 当前配置伤害计算 + 过程分解展示。
 */
function DamageCalcTab(): React.ReactElement {
  const {
    selectedCharacter,
    characterLevel,
    skillMultiplier,
    reactionType,
    amplifyingMultiplier,
    setSkillMultiplier,
    setReactionType,
    setAmplifyingMultiplier,
    teamBuffs,
    weaponConfig,
    constellationConfig,
    talentConfig,
    setBonus,
    statConversions,
    setConversions,
    selectedScenarioId,
    isResultExpired,
  } = useCharacterStore();

  const { artifacts } = useArtifactStore();

  // 计算结果
  const [damageResult, setDamageResult] = useState<DamageResult | null>(null);

  // 队伍 Buff 面板状态
  const [teamBuffConfig, setTeamBuffConfig] = useState<TeamBuffConfig>(defaultTeamBuffConfig());
  const teamBuffBonuses = useMemo(() => computeTeamBuffBonuses(teamBuffConfig), [teamBuffConfig]);

  // ---- 倍率区 + 反应区（写入 store） ----
  const isNod = selectedCharacter ? isNodKraiCharacter(selectedCharacter.id) : false;
  const charElement = selectedCharacter?.element ?? ElementType.PYRO;

  const reactionOptions = useMemo(() => getReactionOptions(charElement, isNod), [charElement, isNod]);

  // 当前 reactionType → reactionOptions 的索引
  const reactIdx = useMemo(() => {
    const idx = reactionOptions.findIndex((o) => o.type === reactionType);
    return idx >= 0 ? idx : 0;
  }, [reactionOptions, reactionType]);

  // 当切换角色时重置反应
  React.useEffect(() => {
    const first = reactionOptions[0];
    if (first) {
      setReactionType(first.type);
      if (first.amplifyingMultiplier !== undefined) setAmplifyingMultiplier(first.amplifyingMultiplier);
    }
  }, [selectedCharacter?.id]);

  const handleReactionChange = useCallback((idx: number) => {
    const opt = reactionOptions[idx];
    if (!opt) return;
    setReactionType(opt.type);
    if (opt.amplifyingMultiplier !== undefined) setAmplifyingMultiplier(opt.amplifyingMultiplier);
  }, [reactionOptions, setReactionType, setAmplifyingMultiplier]);
  // ---- end 倍率区+反应区 ----

  // 获取选中场景（仅用于敌人等级/抗性）
  const scenarios = selectedCharacter
    ? getScenariosByCharacterId(selectedCharacter.id)?.scenarios ?? []
    : [];
  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId) ?? null;

  // 构建 CharacterBuild
  const currentBuild = useMemo<CharacterBuild | null>(() => {
    if (!selectedCharacter) return null;
    const artifactList = Object.values(ArtifactSlotType)
      .map((slot) => artifacts[slot])
      .filter((a): a is ArtifactInstance => a !== null);

    return {
      character: selectedCharacter,
      weaponConfig: weaponConfig ?? {
        weaponData: DEFAULT_WEAPON,
        weaponLevel: 90,
        refinement: 1,
        passiveBonus: {},
      },
      artifacts: artifactList,
      characterLevel,
      skillMultiplier,
      reactionType,
      amplifyingMultiplier,
      teamBuffs,
      constellationConfig,
      talentConfig,
      setBonus,
      teamBuffBonuses,
      statConversions: [...statConversions, ...setConversions].length > 0
        ? [...statConversions, ...setConversions] : undefined,
    };
  }, [selectedCharacter, artifacts, characterLevel, skillMultiplier, reactionType, amplifyingMultiplier, teamBuffs, weaponConfig, constellationConfig, talentConfig, setBonus, statConversions, setConversions, teamBuffBonuses]);

  // 计算伤害
  const handleCalculate = useCallback(() => {
    if (!currentBuild) return;

    const stats = StatCalculator.compute(currentBuild);
    const extraBonuses = mergeExtraBonuses(currentBuild);
    const ctx: DamageContext = {
      stats,
      skillMultiplier: currentBuild.skillMultiplier,
      statScaling: currentBuild.statScaling ?? currentBuild.character.defaultStatScaling,
      reactionType: currentBuild.reactionType,
      enemyLevel: selectedScenario?.enemyLevel ?? 100,
      enemyResistance: selectedScenario?.enemyResistance ?? 0.10,
      amplifyingMultiplier: currentBuild.amplifyingMultiplier ?? 0,
      characterLevel: currentBuild.characterLevel,
      defReductions: (currentBuild as any).defReductions ?? [],
      defIgnore: (currentBuild as any).defIgnore ?? 0,
      elevationBonus: (currentBuild as any).elevationBonus ?? 0,
      extraBonuses,
      independentBonus: 0,
    };

    const result = DamageFormula.calculate(ctx);
    setDamageResult(result);
  }, [currentBuild, selectedScenario]);

  if (!selectedCharacter) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">请先在"角色与装备"标签页选择角色</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* 数据过期提示 */}
      {isResultExpired && damageResult && (
        <Alert severity="warning" variant="outlined">
          数据已更新，请重新计算
        </Alert>
      )}

      {/* 倍率区 + 反应区 */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1.5, color: 'primary.main' }}>
          攻击配置
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
          <TextField
            label="单次攻击倍率"
            type="number"
            size="small"
            slotProps={{ htmlInput: { step: 0.01, min: 0, max: 1000 } }}
            value={skillMultiplier}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) setSkillMultiplier(v);
            }}
            sx={{ width: 160 }}
          />
          <Typography variant="body2" color="text.secondary">
            × 100 = {(skillMultiplier * 100).toFixed(0)}%
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
          反应类型
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          {reactionOptions.map((opt, i) => (
            <Chip
              key={opt.type}
              label={opt.label}
              color={reactIdx === i ? 'primary' : 'default'}
              variant={reactIdx === i ? 'filled' : 'outlined'}
              onClick={() => handleReactionChange(i)}
              size="small"
            />
          ))}
        </Box>
      </Paper>

      {/* 典型场景选择（仅用于敌人等级/抗性预设） */}
      <ScenarioSelect />

      {/* 队伍 Buff 面板 */}
      <TeamBuffPanel config={teamBuffConfig} onChange={setTeamBuffConfig} />

      {/* 计算按钮 */}
      <Button
        variant="contained"
        size="large"
        onClick={handleCalculate}
        disabled={!selectedCharacter}
        fullWidth
      >
        计算当前伤害
      </Button>

      {/* 计算结果 */}
      {damageResult && (
        <>
          {/* 总伤害 */}
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              {selectedScenario ? `场景: ${selectedScenario.name}` : '当前配置伤害'}
            </Typography>
            <Typography variant="h3" sx={{ color: 'primary.main', fontWeight: 700 }}>
              {formatDamage(damageResult.totalDamage)}
            </Typography>
          </Paper>

          {/* 计算过程分解 */}
          <Accordion defaultExpanded={false} disableGutters elevation={0}
            sx={{
              '&:before': { display: 'none' },
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2, minHeight: 40, '&.Mui-expanded': { minHeight: 40 } }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                ▼ 查看计算过程
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {ZONE_ORDER.map((key) => {
                  const zoneName = ZONE_LABELS[key];
                  const value = damageResult[key];
                  const isBase = key === 'baseDamage';
                  const isNonNumeric = key === 'damagePath';

                  if (isNonNumeric && value === undefined) return null;
                  if (key === 'aggravationBonus' && (value === undefined || value === 0)) return null;
                  if (key === 'elevationMultiplier' && (value === undefined || value === 1)) return null;
                  if (key === 'independentMultiplier' && (value === undefined || value === 1)) return null;

                  const debug = getZoneDebug(key, damageResult);

                  return (
                    <Box key={key}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', py: 0.25 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 80 }}>
                          {zoneName}
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary', flex: 1, textAlign: 'center' }}>
                          {isNonNumeric
                            ? (DAMAGE_PATH_LABELS[value as DamagePath] ?? String(value))
                            : isBase
                              ? `${formatNumber(value as number)}`
                              : `×${formatNumber(value as number, 6)}`}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600, minWidth: 60, textAlign: 'right' }}>
                          {isNonNumeric ? '' : isBase ? formatDamage(value as number) : `×${formatNumber(value as number, 6)}`}
                        </Typography>
                      </Box>
                      {debug && debug.lines.length > 0 && (
                        <Accordion disableGutters sx={{ ml: 10, mb: 0.5, bgcolor: 'rgba(255,255,255,0.02)', '&:before': { display: 'none' } }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: '0.8rem' }} />} sx={{ minHeight: 24, '& .MuiAccordionSummary-content': { my: 0 } }}>
                            <Typography variant="caption" color="text.secondary">{debug.formula}</Typography>
                          </AccordionSummary>
                          <AccordionDetails sx={{ pt: 0, pb: 0.5 }}>
                            {debug.lines.map((line, i) => (
                              <Typography key={i} variant="caption" color="text.secondary" sx={{ display: 'block', fontFamily: 'monospace', lineHeight: 1.8 }}>
                                {line}
                              </Typography>
                            ))}
                          </AccordionDetails>
                        </Accordion>
                      )}
                    </Box>
                  );
                })}
              </Box>

              {/* 总伤害 */}
              <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px dashed', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  总伤害
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {formatDamage(damageResult.totalDamage)}
                </Typography>
              </Box>
            </AccordionDetails>
          </Accordion>
        </>
      )}
    </Box>
  );
}

export default DamageCalcTab;
