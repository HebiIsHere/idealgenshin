import React, { useMemo, useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import ScenarioSelect from './ScenarioSelect';
import TeamBuffPanel, { TeamBuffConfig, defaultTeamBuffConfig, computeTeamBuffBonuses } from './TeamBuffPanel';
import CharacterStatPanel from '../character/CharacterStatPanel';
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

/** 详细调试信息：返回每个乘区的计算步骤列表。 */
interface ZoneDetail {
  zoneLabel: string;
  value: number | string;
  displayValue: string;
  steps: string[];
}

function getZoneDetail(key: string, zoneName: string | undefined, value: number | string, result: any): ZoneDetail | null {
  const d = result as DamageResult;

  switch (key) {
    case 'baseDamage': {
      const b = d.baseDebug;
      if (!b) {
        return { zoneLabel: zoneName ?? key, value: value as number, displayValue: formatDamage(value as number), steps: [`${formatNumber(value as number)}`] };
      }
      const steps: string[] = [];
      steps.push(`ATK = ${formatNumber(b.totalAtk)}`);
      steps.push(`攻击倍率 = ${formatNumber(b.skillMultiplier)}`);
      steps.push(`基础伤害 = ATK × 攻击倍率 = ${formatNumber(b.totalAtk)} × ${formatNumber(b.skillMultiplier)} = ${formatNumber(b.rawBase)}`);
      if (b.baseDamageFlat) {
        steps.push(`+ 基础伤害固定值 = ${formatNumber(b.baseDamageFlat)}`);
      }
      steps.push(`= ${formatNumber(b.result)}`);
      return { zoneLabel: zoneName ?? key, value: value as number, displayValue: formatNumber(value as number), steps };
    }
    case 'bonusMultiplier': {
      const b = d.bonusDebug;
      if (!b) return null;
      const steps = [
        `增伤 = ${(b.dmgBonus * 100).toFixed(1)}%`,
        `1 + 增伤 = 1 + ${(b.dmgBonus * 100).toFixed(1)}% = ${formatNumber(b.result, 6)}`,
      ];
      return { zoneLabel: zoneName ?? key, value: value as number, displayValue: `×${formatNumber(value as number, 6)}`, steps };
    }
    case 'critMultiplier': {
      const b = d.critDebug;
      if (!b) return null;
      const steps = [
        `暴击率 = ${(b.critRate * 100).toFixed(1)}%`,
        `暴击伤害 = ${(b.critDmg * 100).toFixed(1)}%`,
        `有效暴击率 = ${(b.effectiveCritRate * 100).toFixed(1)}%`,
        `1 + 有效暴击率 × 暴击伤害 = 1 + ${(b.effectiveCritRate * 100).toFixed(1)}% × ${(b.critDmg * 100).toFixed(1)}% = ${formatNumber(b.result, 6)}`,
      ];
      return { zoneLabel: zoneName ?? key, value: value as number, displayValue: `×${formatNumber(value as number, 6)}`, steps };
    }
    case 'resistanceMultiplier': {
      const b = d.resistDebug;
      if (!b) return null;
      const r = b.effectiveRes;
      const formulaDesc = r < 0
        ? `1 − ${r.toFixed(2)}/2`
        : r < 0.75
          ? `1 − ${r.toFixed(2)}`
          : `1/(1+4×${r.toFixed(2)})`;
      const steps = [
        `敌方基础抗性 = ${(b.enemyResistance * 100).toFixed(1)}%`,
        `减抗总和 = ${(b.resistReduction * 100).toFixed(1)}%`,
        `有效抗性 = ${(b.enemyResistance * 100).toFixed(1)}% − ${(b.resistReduction * 100).toFixed(1)}% = ${(r * 100).toFixed(1)}%`,
        `抗性乘数 = ${formulaDesc} = ${formatNumber(b.result, 6)}`,
      ];
      return { zoneLabel: zoneName ?? key, value: value as number, displayValue: `×${formatNumber(value as number, 6)}`, steps };
    }
    case 'defenseMultiplier': {
      const b = d.defenseDebug;
      if (!b) return null;
      const steps = [
        `角色等级 = ${b.characterLevel}`,
        `敌方等级 = ${b.enemyLevel}`,
        `角色项 = ${b.characterLevel} + 100 = ${formatNumber(b.charTerm)}`,
        `敌方项 = (${b.enemyLevel} + 100) × ${formatNumber(1 - b.defReductionSum, 4)} × ${formatNumber(1 - b.defIgnore, 4)}`,
        `= ${b.enemyTerm} × ${formatNumber(1 - b.defReductionSum, 4)} × ${formatNumber(1 - b.defIgnore, 4)} = ${formatNumber(b.effectiveEnemyDef)}`,
        `防御乘数 = ${formatNumber(b.charTerm)} / (${formatNumber(b.charTerm)} + ${formatNumber(b.effectiveEnemyDef)}) = ${formatNumber(b.result, 6)}`,
      ];
      return { zoneLabel: zoneName ?? key, value: value as number, displayValue: `×${formatNumber(value as number, 6)}`, steps };
    }
    case 'reactionMultiplier': {
      const amp = d.ampDebug;
      const trans = d.transDebug;
      const moon = d.moonDebug;
      if (amp) {
        const steps = [
          `反应基础系数 = ${amp.baseMultiplier}`,
          `元素精通 = ${amp.em}`,
          `EM增幅 = ${(amp.emBonus * 100).toFixed(1)}%`,
          ...(amp.ampReactionBonus ? [`反应伤害加成 = ${(amp.ampReactionBonus * 100).toFixed(1)}%`] : []),
          `反应乘数 = ${amp.baseMultiplier} × (1 + ${(amp.emBonus * 100).toFixed(1)}%${amp.ampReactionBonus ? ' + ' + (amp.ampReactionBonus * 100).toFixed(1) + '%' : ''}) = ${formatNumber(amp.result, 6)}`,
        ];
        return { zoneLabel: zoneName ?? key, value: value as number, displayValue: `×${formatNumber(value as number, 6)}`, steps };
      }
      if (trans) {
        const tBonus = trans.transformReactionBonus ?? 0;
        const steps = [
          `反应系数 = ${trans.rate}`,
          `等级乘数 = ${formatNumber(trans.levelMultiplier)}`,
          `元素精通 = ${trans.em}`,
          `EM增幅 = ${(trans.emBonus * 100).toFixed(1)}%`,
          ...(tBonus ? [`剧变反应加成 = ${(tBonus * 100).toFixed(1)}%`] : []),
          `反应乘数 = ${trans.rate} × ${formatNumber(trans.levelMultiplier)} × (1 + ${(trans.emBonus * 100).toFixed(1)}%${tBonus ? ' + ' + (tBonus * 100).toFixed(1) + '%' : ''}) = ${formatNumber(trans.result)}`,
        ];
        return { zoneLabel: zoneName ?? key, value: value as number, displayValue: `×${formatNumber(value as number)}`, steps };
      }
      if (moon) {
        const mBonus = moon.moonReactionBonus ?? 0;
        const steps = [
          `月反应倍率 = ${moon.moonRate}`,
          `元素精通 = ${moon.em}`,
          `EM增幅 = ${(moon.emBonus * 100).toFixed(1)}%`,
          ...(mBonus ? [`月反应加成 = ${(mBonus * 100).toFixed(1)}%`] : []),
          `反应乘数 = ${moon.moonRate} × (1 + ${(moon.emBonus * 100).toFixed(1)}%${mBonus ? ' + ' + (mBonus * 100).toFixed(1) + '%' : ''}) = ${formatNumber(moon.result)}`,
        ];
        return { zoneLabel: zoneName ?? key, value: value as number, displayValue: `×${formatNumber(value as number)}`, steps };
      }
      return { zoneLabel: zoneName ?? key, value: value as number, displayValue: `×${formatNumber(value as number, 6)}`, steps: [`值: ${formatNumber(value as number, 6)}`] };
    }
    case 'aggravationBonus': {
      const b = d.cataDebug;
      if (!b) return null;
      const steps = [
        `基础倍率 = ${b.baseRate}`,
        `等级乘数 = ${formatNumber(b.levelMultiplier)}`,
        `元素精通 = ${b.em}`,
        `EM增幅 = ${(b.emBonus * 100).toFixed(1)}%`,
        `激化加成 = ${b.baseRate} × ${formatNumber(b.levelMultiplier)} × (1 + ${(b.emBonus * 100).toFixed(1)}%) = ${formatNumber(b.result)}`,
      ];
      return { zoneLabel: zoneName ?? key, value: value as number, displayValue: formatNumber(value as number), steps };
    }
    case 'elevationMultiplier': {
      const b = d.elevDebug;
      if (!b) return null;
      const steps = [
        `擢升加成 = ${(b.elevationBonus * 100).toFixed(0)}%`,
        `擢升乘数 = 1 + ${(b.elevationBonus * 100).toFixed(1)}% = ${formatNumber(b.result, 6)}`,
      ];
      return { zoneLabel: zoneName ?? key, value: value as number, displayValue: `×${formatNumber(value as number, 6)}`, steps };
    }
    case 'independentMultiplier': {
      const b = d.indepDebug;
      if (!b) return null;
      const steps = [
        `天赋加成 = ${(b.talentBonus * 100).toFixed(0)}%`,
        `上下文加成 = ${(b.ctxBonus * 100).toFixed(0)}%`,
        `独立乘数 = 1 + ${(b.talentBonus * 100).toFixed(1)}% + ${(b.ctxBonus * 100).toFixed(1)}% = ${formatNumber(b.result, 6)}`,
      ];
      return { zoneLabel: zoneName ?? key, value: value as number, displayValue: `×${formatNumber(value as number, 6)}`, steps };
    }
    case 'damagePath': {
      return { zoneLabel: zoneName ?? key, value: value as string, displayValue: DAMAGE_PATH_LABELS[value as DamagePath] ?? String(value), steps: [] };
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

  // 构建 CharacterBuild（含队伍 Buff）
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

  // 实时计算含队伍 Buff 的最终面板
  const computedStats = useMemo(() => {
    if (!currentBuild) return null;
    return StatCalculator.compute(currentBuild);
  }, [currentBuild]);

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

      {/* 实时角色面板（含队伍 Buff） */}
      <Paper sx={{ p: 2 }}>
        <CharacterStatPanel stats={computedStats} />
        {selectedCharacter && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            ※ 已包含队伍 Buff 加成
          </Typography>
        )}
      </Paper>

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

          {/* 细化计算过程 */}
          <Paper sx={{ p: 0 }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" sx={{ color: 'primary.main', fontWeight: 600 }}>
                计算过程
              </Typography>
            </Box>

            <Box sx={{ px: 2, py: 1.5 }}>
              {ZONE_ORDER.map((key) => {
                const zoneName = ZONE_LABELS[key];
                const value = damageResult[key];
                const isNonNumeric = key === 'damagePath';

                if (isNonNumeric && value === undefined) return null;
                if (key === 'aggravationBonus' && (value === undefined || value === 0)) return null;
                if (key === 'elevationMultiplier' && (value === undefined || value === 1)) return null;
                if (key === 'independentMultiplier' && (value === undefined || value === 1)) return null;

                const detail = getZoneDetail(key, zoneName, value as number | string, damageResult);
                if (!detail) return null;

                return (
                  <Box key={key} sx={{ mb: 1.5 }}>
                    {/* 乘区标题 */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        mb: 0.5,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: 'text.primary' }}
                      >
                        {detail.zoneLabel}
                      </Typography>
                      {/* 数值 */}
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: isNonNumeric ? 'text.secondary' : 'primary.main',
                          bgcolor: 'rgba(212,168,67,0.08)',
                          px: 1,
                          py: 0.25,
                          borderRadius: 0.5,
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                        }}
                      >
                        {detail.displayValue}
                      </Typography>
                    </Box>

                    {/* 计算步骤 */}
                    {detail.steps.length > 0 && (
                      <Box
                        sx={{
                          ml: 2,
                          pl: 1.5,
                          borderLeft: '2px solid',
                          borderColor: 'divider',
                        }}
                      >
                        {detail.steps.map((step, i) => (
                          <Typography
                            key={i}
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: 'block',
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              lineHeight: 1.8,
                              color: i === detail.steps.length - 1
                                ? 'text.primary'
                                : 'text.secondary',
                              fontWeight: i === detail.steps.length - 1 ? 600 : 400,
                            }}
                          >
                            {step}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
                );
              })}

              {/* 总伤害公式 */}
              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  伤害公式：
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 0.75 }}>
                {ZONE_ORDER.map((key) => {
                  const value = damageResult[key];
                  if (key === 'damagePath') return null;
                  if (key === 'aggravationBonus' && (value === undefined || value === 0)) return null;
                  if (key === 'elevationMultiplier' && (value === undefined || value === 1)) return null;
                  if (key === 'independentMultiplier' && (value === undefined || value === 1)) return null;
                  if (value === undefined) return null;

                  const zoneName = ZONE_LABELS[key];
                  const isBase = key === 'baseDamage';
                  const displayVal = isBase
                    ? formatNumber(value as number)
                    : `×${formatNumber(value as number, 6)}`;

                  return (
                    <Box key={key} sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'primary.main', fontWeight: 600, fontSize: '0.75rem' }}>
                        {displayVal}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.6rem' }}>
                        {zoneName}
                      </Typography>
                    </Box>
                  );
                })}
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.75rem' }}>
                  =
                </Typography>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'primary.main', fontWeight: 700, fontSize: '0.75rem' }}>
                    {formatDamage(damageResult.totalDamage)}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.6rem' }}>
                    总伤害
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
}

export default DamageCalcTab;
