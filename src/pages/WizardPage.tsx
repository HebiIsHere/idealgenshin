import React, { useMemo, useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Chip from '@mui/material/Chip';

import { useWizardStore, type WizardSection } from '../store/slices/wizardSlice';
import { useCharacterStore } from '../store/slices/characterSlice';
import { useArtifactStore } from '../store/slices/artifactSlice';
import { useOptimizerStore } from '../store/slices/optimizerSlice';

import { StatCalculator } from '../engine/stats';
import { DamageFormula } from '../engine/formula';
import { mergeExtraBonuses } from '../utils/mergeExtraBonuses';

import CharacterSelect from '../components/character/CharacterSelect';
import CharacterStatPanel from '../components/character/CharacterStatPanel';
import WeaponSelect from '../components/weapon/WeaponSelect';
import WeaponPassiveInput from '../components/weapon/WeaponPassiveInput';
import ArtifactEditor from '../components/artifact/ArtifactEditor';
import ArtifactSetSelect from '../components/artifact/ArtifactSetSelect';
import ArtifactImport from '../components/artifact/ArtifactImport';
import TalentInput from '../components/character/TalentInput';
import ConstellationInput from '../components/character/ConstellationInput';
import TeamBuffPanel, { TeamBuffConfig, defaultTeamBuffConfig, computeTeamBuffBonuses } from '../components/optimizer/TeamBuffPanel';
import ScenarioSelect from '../components/optimizer/ScenarioSelect';
import LoadingOverlay from '../components/common/LoadingOverlay';
import SectionStepper from '../components/wizard/SectionStepper';
import SectionRoller from '../components/wizard/SectionRoller';

import { DEFAULT_WEAPON } from '../data/weapons';
import { SUBSTAT_MID_VALUES } from '../data/constants';
import { getReactionOptions, isNodKraiCharacter } from '../data/reactions';
import { getScenariosByCharacterId } from '../data/scenarios';
import { formatDamage, formatNumber } from '../utils/format';
import type { CharacterBuild, ArtifactInstance, DamageContext, DamageResult, SubstatAllocation } from '../types';
import { ArtifactSlotType, SubstatType, ElementType } from '../types';

function WizardPage(): React.ReactElement {
  const currentIndex = useWizardStore((s) => s.currentIndex);
  const sections = useWizardStore((s) => s.sections);
  const goToSection = useWizardStore((s) => s.goToSection);
  const nextSectionFn = useWizardStore((s) => s.nextSection);
  const insertResultSection = useWizardStore((s) => s.insertResultSection);
  const exitWizard = useWizardStore((s) => s.exitWizard);

  const {
    selectedCharacter, characterLevel, skillMultiplier, reactionType, amplifyingMultiplier,
    setSkillMultiplier, setReactionType, setAmplifyingMultiplier, setCharacterLevel,
    teamBuffs, weaponConfig, constellationConfig, talentConfig, setBonus,
    statConversions, setConversions, setWeaponConfig, setWeaponRefinement,
    selectedScenarioId,
  } = useCharacterStore();

  const { artifacts } = useArtifactStore();
  const { isCalculating, progress, redistributeResult, idealResult, damageComparison,
    runOptimizationWithComparison, runIdealTemplate } = useOptimizerStore();

  const [teamBuffConfig, setTeamBuffConfig] = useState<TeamBuffConfig>(defaultTeamBuffConfig());
  const teamBuffBonuses = useMemo(() => computeTeamBuffBonuses(teamBuffConfig), [teamBuffConfig]);
  const [damageResult, setDamageResult] = useState<DamageResult | null>(null);
  const [idealRollCount] = useState(25);
  const [searchMainStats] = useState(false);
  const [resultLabels, setResultLabels] = useState<Record<string, string>>({});

  const isNod = selectedCharacter ? isNodKraiCharacter(selectedCharacter.id) : false;
  const charElement = selectedCharacter?.element ?? ElementType.PYRO;
  const reactionOptions = useMemo(() => getReactionOptions(charElement, isNod), [charElement, isNod]);
  const reactIdx = useMemo(() => {
    const idx = reactionOptions.findIndex((o) => o.type === reactionType);
    return idx >= 0 ? idx : 0;
  }, [reactionOptions, reactionType]);

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

  const scenarios = selectedCharacter ? getScenariosByCharacterId(selectedCharacter.id)?.scenarios ?? [] : [];
  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId) ?? null;

  const currentBuild = useMemo<CharacterBuild | null>(() => {
    if (!selectedCharacter) return null;
    const artifactList = Object.values(ArtifactSlotType)
      .map((slot) => artifacts[slot]).filter((a): a is ArtifactInstance => a !== null);
    return {
      character: selectedCharacter,
      weaponConfig: weaponConfig ?? { weaponData: DEFAULT_WEAPON, weaponLevel: 90, refinement: 1, passiveBonus: {} },
      artifacts: artifactList, characterLevel, skillMultiplier, reactionType, amplifyingMultiplier,
      teamBuffs, constellationConfig, talentConfig, setBonus, teamBuffBonuses,
      statConversions: [...statConversions, ...setConversions].length > 0 ? [...statConversions, ...setConversions] : undefined,
    };
  }, [selectedCharacter, artifacts, characterLevel, skillMultiplier, reactionType, amplifyingMultiplier,
    teamBuffs, weaponConfig, constellationConfig, talentConfig, setBonus, statConversions, setConversions, teamBuffBonuses]);

  const computedStats = useMemo(() => {
    if (!currentBuild) return null;
    return StatCalculator.compute(currentBuild);
  }, [currentBuild]);

  const handleCalcDamage = useCallback(() => {
    if (!currentBuild || !computedStats) return;
    const extraBonuses = mergeExtraBonuses(currentBuild);
    const ctx: DamageContext = {
      stats: computedStats, skillMultiplier: currentBuild.skillMultiplier,
      statScaling: currentBuild.statScaling ?? currentBuild.character.defaultStatScaling,
      reactionType: currentBuild.reactionType,
      enemyLevel: selectedScenario?.enemyLevel ?? 100,
      enemyResistance: selectedScenario?.enemyResistance ?? 0.10,
      amplifyingMultiplier: currentBuild.amplifyingMultiplier ?? 0,
      characterLevel: currentBuild.characterLevel,
      defReductions: [], defIgnore: 0, elevationBonus: 0,
      extraBonuses, independentBonus: 0,
    };
    const result = DamageFormula.calculate(ctx);
    setDamageResult(result);
    const idx = insertResultSection('伤害计算结果');
    setResultLabels((prev) => ({ ...prev, [`result_${idx}`]: '伤害计算结果' }));
  }, [currentBuild, computedStats, selectedScenario, insertResultSection]);

  const handleRedistribute = useCallback(() => {
    if (!currentBuild) return;
    const valueMap = new Map<SubstatType, number>();
    for (const slot of Object.values(ArtifactSlotType)) {
      const a = artifacts[slot];
      if (!a) continue;
      for (const sub of a.subStats) valueMap.set(sub.type, (valueMap.get(sub.type) ?? 0) + sub.value);
    }
    const baseAtk = (selectedCharacter?.baseStats.atk ?? 0) + (weaponConfig?.weaponData?.baseAtk ?? 0);
    const baseHp = selectedCharacter?.baseStats.hp ?? 0;
    const baseDef = selectedCharacter?.baseStats.def ?? 0;
    const fold = (ft: SubstatType, pt: SubstatType, b: number) => {
      if (b > 0 && valueMap.has(ft)) { valueMap.set(pt, (valueMap.get(pt) ?? 0) + valueMap.get(ft)! / b); valueMap.delete(ft); }
    };
    fold(SubstatType.ATK_FLAT, SubstatType.ATK_PERCENT, baseAtk);
    fold(SubstatType.HP_FLAT, SubstatType.HP_PERCENT, baseHp);
    fold(SubstatType.DEF_FLAT, SubstatType.DEF_PERCENT, baseDef);
    const rollMap = new Map<SubstatType, number>();
    for (const [type, val] of valueMap) { const mv = SUBSTAT_MID_VALUES[type] ?? 1; if (mv > 0) rollMap.set(type, val / mv); }
    const allocs = Array.from(rollMap.entries()).map(([type, rolls]) => ({ type, rolls }));
    const relevant = new Set(selectedCharacter?.relevantSubstats ?? []);
    const filtered = allocs.filter(a => relevant.has(a.type));
    if (filtered.length === 0) return;
    runOptimizationWithComparison(currentBuild, filtered, selectedScenario?.name ?? '默认场景');
    const idx = insertResultSection('重优化结果');
    setResultLabels((prev) => ({ ...prev, [`result_${idx}`]: '重优化结果' }));
  }, [currentBuild, artifacts, selectedCharacter, weaponConfig, selectedScenario, runOptimizationWithComparison, insertResultSection]);

  const handleIdealTemplate = useCallback(() => {
    if (!currentBuild) return;
    runIdealTemplate(currentBuild.character, idealRollCount, currentBuild.skillMultiplier, currentBuild.reactionType, currentBuild, searchMainStats);
    const idx = insertResultSection('理想模板');
    setResultLabels((prev) => ({ ...prev, [`result_${idx}`]: '理想模板' }));
  }, [currentBuild, idealRollCount, searchMainStats, runIdealTemplate, insertResultSection]);

  const renderSection = useCallback((section: WizardSection): React.ReactNode => {
    const s = String(section);
    if (s.startsWith('result_')) {
      if (s.includes('理想模板') || (idealResult && resultLabels[s]?.includes('理想'))) {
        return (<Box><Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>理想模板</Typography>
          {idealResult ? (<Box sx={{ textAlign: 'center' }}><Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700 }}>{Math.round(idealResult.theoreticalDamage).toLocaleString('en-US')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>理论伤害（{idealRollCount} 词条）</Typography></Box>) : <Typography color="text.secondary">计算中…</Typography>}</Box>);
      }
      if (s.includes('重优化') || (redistributeResult && resultLabels[s]?.includes('重优化'))) {
        return (<Box><Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>同词条重优化</Typography>
          {redistributeResult ? (<Box><Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 2 }}>
            <Box sx={{ textAlign: 'center' }}><Typography variant="caption" color="text.secondary">优化前</Typography><Typography variant="h6">{formatDamage(redistributeResult.originalDamage)}</Typography></Box>
            <Box sx={{ textAlign: 'center' }}><Typography variant="caption" color="text.secondary">优化后</Typography><Typography variant="h6" sx={{ color: 'success.light' }}>{formatDamage(redistributeResult.optimizedDamage)}</Typography></Box>
          </Box>{damageComparison && <Typography variant="body1" sx={{ textAlign: 'center', color: damageComparison.improvementPercent > 0 ? 'success.main' : 'text.primary', fontWeight: 600 }}>提升 {damageComparison.improvementPercent >= 0 ? '+' : ''}{(damageComparison.improvementPercent * 100).toFixed(1)}%</Typography>}</Box>) : <Typography color="text.secondary">计算中…</Typography>}</Box>);
      }
      return (<Box><Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>伤害计算结果</Typography>
        {damageResult ? (<Box sx={{ textAlign: 'center' }}><Typography variant="h3" sx={{ color: 'primary.main', fontWeight: 700 }}>{formatDamage(damageResult.totalDamage)}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{selectedScenario ? `场景: ${selectedScenario.name}` : '当前配置伤害'}</Typography></Box>) : <Typography color="text.secondary">尚未计算</Typography>}</Box>);
    }

    switch (s) {
      case 'character':
        return (<Box><Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>选择角色与等级</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>请选择需要分析的角色</Typography>
          <CharacterSelect />
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box component="input" type="number" min={1} max={90} value={characterLevel}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1 && v <= 90) setCharacterLevel(v); }}
              sx={{ width: 80, p: 1, borderRadius: 1, border: '1px solid', borderColor: 'rgba(212,168,67,0.2)', bgcolor: '#16213E', color: 'text.primary', fontSize: '0.9rem' }} />
            <Typography variant="body2" color="text.secondary">级</Typography>
          </Box></Box>);
      case 'weapon':
        return (<Box><Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>武器配置</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>选择武器并配置精炼等级</Typography>
          <WeaponSelect />{weaponConfig && <WeaponPassiveInput />}</Box>);
      case 'artifacts':
        return (<Box><Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>圣遗物配置</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>填入圣遗物属性，或使用 Enka 自动导入</Typography>
          <ArtifactImport /><ArtifactEditor /><ArtifactSetSelect importedSetNames={[]} importedSetCounts={{}} /></Box>);
      case 'talents':
        return (<Box><Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>天赋与命座</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>查看角色天赋效果，手动填入加成数值</Typography>
          <TalentInput /><Box sx={{ mt: 2 }}><Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>命座模拟</Typography><ConstellationInput /></Box></Box>);
      case 'teambuffs':
        return (<Box><Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>队伍 Buff</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>添加辅助、圣遗物、共鸣等队伍增益</Typography>
          <TeamBuffPanel config={teamBuffConfig} onChange={setTeamBuffConfig} /></Box>);
      case 'scenario':
        return (<Box><Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>攻击配置与场景</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>设置技能倍率、反应类型及敌人参数</Typography>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">技能倍率</Typography>
            <Box component="input" type="number" step={0.0001} min={0} max={1000} value={skillMultiplier}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setSkillMultiplier(v); }}
              sx={{ width: 120, p: 1, borderRadius: 1, border: '1px solid', borderColor: 'rgba(212,168,67,0.2)', bgcolor: '#16213E', color: 'text.primary', fontSize: '0.9rem' }} />
            <Typography variant="body2" color="text.secondary">= {(skillMultiplier * 100).toFixed(2)}%</Typography></Box>
          <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>反应类型</Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>{reactionOptions.map((opt, i) => (
            <Chip key={opt.type} label={opt.label} color={reactIdx === i ? 'primary' : 'default'} variant={reactIdx === i ? 'filled' : 'outlined'} onClick={() => handleReactionChange(i)} size="small" />))}</Box>
          <ScenarioSelect /></Box>);
      default:
        return <Typography color="text.secondary">未知板块</Typography>;
    }
  }, [selectedCharacter, characterLevel, skillMultiplier, reactionType, amplifyingMultiplier, weaponConfig,
    teamBuffConfig, reactionOptions, reactIdx, handleReactionChange, selectedScenario,
    damageResult, redistributeResult, idealResult, damageComparison, idealRollCount, resultLabels,
    setCharacterLevel, setSkillMultiplier]);

  return (
    <Box sx={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
      <LoadingOverlay visible={isCalculating} progress={progress} message="正在计算…" />

      <IconButton onClick={exitWizard}
        sx={{ position: 'fixed', top: 16, left: 16, zIndex: 20, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
        <ArrowBackIcon />
      </IconButton>

      <SectionStepper resultLabels={resultLabels} />

      <Box sx={{ position: 'absolute', left: 64, top: 0, right: 280, bottom: 0 }}>
        <SectionRoller renderSection={renderSection} />
      </Box>

      <Box sx={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 20, display: 'flex', gap: 1 }}>
        <Button variant="outlined" size="small" disabled={currentIndex === 0} onClick={() => goToSection(currentIndex - 1)}>上一步</Button>
        {currentIndex < sections.length - 1 && <Button variant="contained" size="small" onClick={nextSectionFn}>下一步</Button>}
      </Box>

      <Box sx={{ position: 'fixed', top: 56, right: 16, width: 248, zIndex: 5, maxHeight: 'calc(100vh - 80px)', overflowY: 'auto',
        '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { background: 'rgba(212,168,67,0.2)', borderRadius: 2 } }}>
        <CharacterStatPanel stats={computedStats} showActions
          onCalcDamage={handleCalcDamage} onRedistribute={handleRedistribute} onIdealTemplate={handleIdealTemplate} />
      </Box>
    </Box>
  );
}

export default WizardPage;
