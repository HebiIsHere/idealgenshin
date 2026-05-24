import React, { useMemo, useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Slider from '@mui/material/Slider';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

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
import ZoneBonusInput from '../components/common/ZoneBonusInput';
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
import type { CharacterBuild, ArtifactInstance, DamageContext, DamageResult, StatScaling, ZoneBonusInput as ZBType } from '../types';
import { ArtifactSlotType, SubstatType, ElementType, ReactionType } from '../types';

/* ===== Mini-input components for free bonus fields ===== */

function BonusRow({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
      <Typography variant="caption" sx={{ minWidth: 80, color: 'text.secondary' }}>{label}</Typography>
      <TextField size="small" type="number" value={value} sx={{ width: 80 }}
        slotProps={{ htmlInput: { step: 0.01 } }}
        onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v); }} />
      {hint && <Typography variant="caption" color="text.disabled">{hint}</Typography>}
    </Box>
  );
}

function SkillPercentInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <TextField label="技能倍率 (%)" type="number" size="small" value={(value * 100).toFixed(4)}
        onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v / 100); }}
        slotProps={{ htmlInput: { step: 0.01, min: 0, max: 100000 } }} sx={{ width: 140 }} />
      <Typography variant="body2" color="text.secondary">%</Typography>
    </Box>
  );
}

function StatScalingInput({ value, onChange }: { value: StatScaling; onChange: (v: StatScaling) => void }) {
  const stats: { key: keyof StatScaling; label: string }[] = [
    { key: 'atkRatio', label: '攻击力' }, { key: 'hpRatio', label: '生命值' }, { key: 'defRatio', label: '防御力' }, { key: 'emRatio', label: '元素精通' },
  ];
  const active = stats.filter(s => (value[s.key] ?? 0) > 0);

  const setEntry = (i: number, k: keyof StatScaling, r: number) => {
    const next = { atkRatio: 0, hpRatio: 0, defRatio: 0, emRatio: 0 } as StatScaling;
    // Keep the other entry if exists
    const other = i === 0 ? 1 : 0;
    if (active.length >= 2 && active[other]) {
      next[active[other].key] = active[other].ratio ?? 1;
    }
    next[k] = r;
    onChange(next);
  };

  const addEntry = () => {
    const unused = stats.find(s => !active.some(a => a.key === s.key));
    if (unused && active.length < 2) {
      const next = { ...value };
      next[unused.key] = 1;
      onChange(next);
    }
  };

  const removeEntry = (k: keyof StatScaling) => {
    const next = { ...value };
    next[k] = 0;
    onChange(next);
  };

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>倍率种类（最多两项混合）</Typography>
      {active.map((s, i) => (
        <Box key={s.key} sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'center' }}>
          <FormControl size="small" sx={{ width: 100 }}>
            <Select value={s.key} onChange={(e) => setEntry(i, e.target.value as keyof StatScaling, s.ratio ?? 1)}>
              {stats.map(st => <MenuItem key={st.key} value={st.key}>{st.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" type="number" value={((s.ratio ?? 1) * 100).toFixed(1)} sx={{ width: 80 }}
            slotProps={{ htmlInput: { step: 0.1, min: 0, max: 10000 } }}
            onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setEntry(i, s.key, v / 100); }} />
          <Typography variant="body2" color="text.secondary">%</Typography>
          {active.length > 1 && (
            <Button size="small" color="error" onClick={() => removeEntry(s.key)} sx={{ minWidth: 24, fontSize: '0.7rem' }}>×</Button>
          )}
        </Box>
      ))}
      {active.length < 2 && (
        <Button size="small" variant="outlined" onClick={addEntry} sx={{ mt: 0.5 }}>+ 添加倍率种类</Button>
      )}
    </Box>
  );
}

/* Lauma prayer: EM × multiplier based on constellation */
function calcLaumaPrayer(em: number, cons: string): number {
  const multipliers: Record<string, number> = { 'c0': 3.75, 'c2': 5.0, 'c3': 5.5 };
  return em * (multipliers[cons] ?? 0);
}

/* ===== Main WizardPage ===== */

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
    statConversions, setConversions, setWeaponConfig, setTalentConfig, setConstellationBonus,
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

  // Custom stat scaling (card 7)
  const [customScaling, setCustomScaling] = useState<StatScaling>({ atkRatio: 1, hpRatio: 0, defRatio: 0, emRatio: 0 });

  // Free team bonus inputs (separate from TeamBuffPanel)
  const [teamFreeBonus, setTeamFreeBonus] = useState<ZBType>({});

  // ---- Reactions ----
  const isNod = selectedCharacter ? isNodKraiCharacter(selectedCharacter.id) : false;
  const charElement = selectedCharacter?.element ?? ElementType.PYRO;
  const reactionOptions = useMemo(() => getReactionOptions(charElement, isNod), [charElement, isNod]);
  const reactIdx = useMemo(() => reactionOptions.findIndex((o) => o.type === reactionType), [reactionOptions, reactionType]);

  React.useEffect(() => {
    const first = reactionOptions[0];
    if (first) { setReactionType(first.type); if (first.amplifyingMultiplier !== undefined) setAmplifyingMultiplier(first.amplifyingMultiplier); }
  }, [selectedCharacter?.id]);

  // Sync character default scaling when character changes
  React.useEffect(() => {
    if (selectedCharacter) setCustomScaling({ ...selectedCharacter.defaultStatScaling });
  }, [selectedCharacter?.id]);

  const handleReactionChange = useCallback((idx: number) => {
    const opt = reactionOptions[idx];
    if (!opt) return;
    setReactionType(opt.type);
    if (opt.amplifyingMultiplier !== undefined) setAmplifyingMultiplier(opt.amplifyingMultiplier);
  }, [reactionOptions, setReactionType, setAmplifyingMultiplier]);

  const scenarios = selectedCharacter ? getScenariosByCharacterId(selectedCharacter.id)?.scenarios ?? [] : [];
  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId) ?? null;

  // ---- Build & Stats ----
  const currentBuild = useMemo<CharacterBuild | null>(() => {
    if (!selectedCharacter) return null;
    const artifactList = Object.values(ArtifactSlotType).map((slot) => artifacts[slot]).filter((a): a is ArtifactInstance => a !== null);
    // Add Lauma prayer to team buff bonuses if applicable
    const prayerBonus: ZBType = {};
    if (reactionType === 'MOON_BLOOM' as any) {
      prayerBonus.prayerFlat = calcLaumaPrayer(laumaEM, laumaCons);
    }
    const mergedTeamBonuses: ZBType = { ...teamBuffBonuses, ...prayerBonus, ...teamFreeBonus };
    return {
      character: selectedCharacter,
      weaponConfig: weaponConfig ?? { weaponData: DEFAULT_WEAPON, weaponLevel: 90, refinement: 1, passiveBonus: {} },
      artifacts: artifactList, characterLevel, skillMultiplier, reactionType, amplifyingMultiplier,
      teamBuffs, constellationConfig, talentConfig, setBonus, teamBuffBonuses: mergedTeamBonuses,
      statScaling: customScaling,
      statConversions: [...statConversions, ...setConversions].length > 0 ? [...statConversions, ...setConversions] : undefined,
    };
  }, [selectedCharacter, artifacts, characterLevel, skillMultiplier, reactionType, amplifyingMultiplier,
    teamBuffs, weaponConfig, constellationConfig, talentConfig, setBonus, statConversions, setConversions, teamBuffBonuses, customScaling, laumaEM, laumaCons]);

  const computedStats = useMemo(() => { if (!currentBuild) return null; return StatCalculator.compute(currentBuild); }, [currentBuild]);

  // ---- Actions ----
  const handleCalcDamage = useCallback(() => {
    if (!currentBuild || !computedStats) return;
    const eb = mergeExtraBonuses(currentBuild);
    const ctx: DamageContext = {
      stats: computedStats, skillMultiplier: currentBuild.skillMultiplier,
      statScaling: customScaling, reactionType: currentBuild.reactionType,
      enemyLevel: selectedScenario?.enemyLevel ?? 100, enemyResistance: 0.10,
      amplifyingMultiplier: currentBuild.amplifyingMultiplier ?? 0, characterLevel: currentBuild.characterLevel,
      defReductions: [...(eb.defReductions ?? [])], defIgnore: eb.defIgnore ?? 0, elevationBonus: eb.elevationBonus ?? 0,
      extraBonuses: eb, independentBonus: 0,
    };
    const result = DamageFormula.calculate(ctx);
    setDamageResult(result);
    const idx = insertResultSection('伤害计算结果');
    setResultLabels((prev) => ({ ...prev, [`result_${idx}`]: '伤害计算结果' }));
  }, [currentBuild, computedStats, customScaling, selectedScenario, insertResultSection]);

  const handleRedistribute = useCallback(() => {
    if (!currentBuild) return;
    const vm = new Map<SubstatType, number>();
    for (const s of Object.values(ArtifactSlotType)) { const a = artifacts[s]; if (!a) continue; for (const sub of a.subStats) vm.set(sub.type, (vm.get(sub.type) ?? 0) + sub.value); }
    const bAtk = (selectedCharacter?.baseStats.atk ?? 0) + (weaponConfig?.weaponData?.baseAtk ?? 0);
    const fold = (ft: SubstatType, pt: SubstatType, b: number) => { if (b > 0 && vm.has(ft)) { vm.set(pt, (vm.get(pt) ?? 0) + vm.get(ft)! / b); vm.delete(ft); } };
    fold(SubstatType.ATK_FLAT, SubstatType.ATK_PERCENT, bAtk); fold(SubstatType.HP_FLAT, SubstatType.HP_PERCENT, selectedCharacter?.baseStats.hp ?? 0); fold(SubstatType.DEF_FLAT, SubstatType.DEF_PERCENT, selectedCharacter?.baseStats.def ?? 0);
    const rm = new Map<SubstatType, number>(); for (const [t, v] of vm) { const mv = SUBSTAT_MID_VALUES[t] ?? 1; if (mv > 0) rm.set(t, v / mv); }
    const allocs = Array.from(rm.entries()).map(([t, r]) => ({ type: t, rolls: r }));
    const rel = new Set(selectedCharacter?.relevantSubstats ?? []); const f = allocs.filter(a => rel.has(a.type));
    if (f.length === 0) return;
    runOptimizationWithComparison(currentBuild, f, selectedScenario?.name ?? '默认场景');
    const idx = insertResultSection('重优化结果');
    setResultLabels((prev) => ({ ...prev, [`result_${idx}`]: '重优化结果' }));
  }, [currentBuild, artifacts, selectedCharacter, weaponConfig, selectedScenario, runOptimizationWithComparison, insertResultSection]);

  const handleIdealTemplate = useCallback(() => {
    if (!currentBuild) return;
    runIdealTemplate(currentBuild.character, idealRollCount, currentBuild.skillMultiplier, currentBuild.reactionType, currentBuild, searchMainStats);
    const idx = insertResultSection('理想模板');
    setResultLabels((prev) => ({ ...prev, [`result_${idx}`]: '理想模板' }));
  }, [currentBuild, idealRollCount, searchMainStats, runIdealTemplate, insertResultSection]);

  // ---- Render sections ----
  const renderSection = useCallback((section: WizardSection): React.ReactNode => {
    const s = String(section);
    if (s.startsWith('result_')) {
      if (resultLabels[s]?.includes('理想') || (idealResult && !s.includes('重优化'))) {
        return (<Box><Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>理想模板</Typography>{idealResult ? <Box sx={{ textAlign: 'center' }}><Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700 }}>{Math.round(idealResult.theoreticalDamage).toLocaleString('en-US')}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>理论伤害（{idealRollCount} 词条）</Typography></Box> : <Typography color="text.secondary">计算中…</Typography>}</Box>);
      }
      if (resultLabels[s]?.includes('重优化') || (redistributeResult && !s.includes('理想'))) {
        return (<Box><Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>同词条重优化</Typography>{redistributeResult ? <Box><Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 2 }}><Box sx={{ textAlign: 'center' }}><Typography variant="caption" color="text.secondary">优化前</Typography><Typography variant="h6">{formatDamage(redistributeResult.originalDamage)}</Typography></Box><Box sx={{ textAlign: 'center' }}><Typography variant="caption" color="text.secondary">优化后</Typography><Typography variant="h6" sx={{ color: 'success.light' }}>{formatDamage(redistributeResult.optimizedDamage)}</Typography></Box></Box>{damageComparison && <Typography variant="body1" sx={{ textAlign: 'center', color: damageComparison.improvementPercent > 0 ? 'success.main' : 'text.primary', fontWeight: 600 }}>提升 {damageComparison.improvementPercent >= 0 ? '+' : ''}{(damageComparison.improvementPercent * 100).toFixed(1)}%</Typography>}</Box> : <Typography color="text.secondary">计算中…</Typography>}</Box>);
      }
      return (<Box><Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>伤害计算结果</Typography>{damageResult ? <Box sx={{ textAlign: 'center' }}><Typography variant="h3" sx={{ color: 'primary.main', fontWeight: 700 }}>{formatDamage(damageResult.totalDamage)}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{selectedScenario ? `场景: ${selectedScenario.name}` : '当前配置伤害'}</Typography></Box> : <Typography color="text.secondary">尚未计算</Typography>}</Box>);
    }

    const wb = weaponConfig?.passiveBonus ?? {};
    const setWb = (v: ZBType) => { if (weaponConfig) setWeaponConfig(weaponConfig.weaponData, weaponConfig.weaponLevel, weaponConfig.refinement, v); };
    const tb = talentConfig?.bonus ?? {};
    const setTb = (v: ZBType) => setTalentConfig(v);

    switch (s) {
      case 'import':
        return (<Box><Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>Enka 导入</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>输入 UID 自动导入角色展柜数据，省去手动填写</Typography><ArtifactImport /></Box>);

      case 'character':
        return (<Box><Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>选择角色</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>选择一位需要分析的角色</Typography><CharacterSelect /><Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}><TextField label="角色等级" type="number" size="small" value={characterLevel} onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1 && v <= 90) setCharacterLevel(v); }} slotProps={{ htmlInput: { min: 1, max: 90 } }} sx={{ width: 120 }} /></Box></Box>);

      case 'weapon':
        return (<Box><Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>武器配置</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>选择武器并配置精炼等级</Typography><WeaponSelect />{weaponConfig && <Box sx={{ mt: 2 }}><WeaponPassiveInput /></Box>}<Divider sx={{ my: 2 }} /><Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>额外加成（武器提供）</Typography><BonusRow label="羽毛附伤" value={wb.featherFlat ?? 0} onChange={(v) => setWb({ ...wb, featherFlat: v })} hint="固定值" /><BonusRow label="精通区" value={wb.elementalMastery ?? 0} onChange={(v) => setWb({ ...wb, elementalMastery: v })} hint="EM" /><BonusRow label="增伤区" value={(wb.dmgBonus ?? 0) * 100} onChange={(v) => setWb({ ...wb, dmgBonus: v / 100 })} hint="%" /><BonusRow label="暴击率" value={(wb.critRate ?? 0) * 100} onChange={(v) => setWb({ ...wb, critRate: v / 100 })} hint="%" /><BonusRow label="暴击伤害" value={(wb.critDmg ?? 0) * 100} onChange={(v) => setWb({ ...wb, critDmg: v / 100 })} hint="%" /></Box>);

      case 'artifacts':
        return (<Box><Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>圣遗物配置</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>逐部位填入圣遗物主/副词条属性</Typography><ArtifactEditor /><Box sx={{ mt: 2 }}><ArtifactSetSelect importedSetNames={[]} importedSetCounts={{}} /></Box></Box>);

      case 'talents':
        return (<Box><Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>天赋与命座</Typography>
          <Box sx={{ maxHeight: 180, overflowY: 'auto', mb: 1, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { background: 'rgba(212,168,67,0.15)', borderRadius: 2 } }}><TalentInput /></Box>
          <Box sx={{ mb: 1 }}><ConstellationInput /></Box>
          <Divider sx={{ my: 1 }} />
          <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>⑤ 自由输入（覆盖/补充天赋数值）</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
            <BonusRow label="大权区" value={tb.authorityMultiplier ?? 1} onChange={(v) => setTb({ ...tb, authorityMultiplier: v })} hint="那维莱特式有条件倍率" />
            <BonusRow label="月兆角色数" value={tb.moonCharacterCount ?? 0} onChange={(v) => setTb({ ...tb, moonCharacterCount: v })} hint="人" />
            <BonusRow label="精通区" value={tb.elementalMastery ?? 0} onChange={(v) => setTb({ ...tb, elementalMastery: v })} hint="EM" />
            <BonusRow label="增伤区" value={(tb.dmgBonus ?? 0) * 100} onChange={(v) => setTb({ ...tb, dmgBonus: v / 100 })} hint="%" />
            <BonusRow label="暴击率" value={(tb.critRate ?? 0) * 100} onChange={(v) => setTb({ ...tb, critRate: v / 100 })} hint="%" />
            <BonusRow label="暴击伤害" value={(tb.critDmg ?? 0) * 100} onChange={(v) => setTb({ ...tb, critDmg: v / 100 })} hint="%" />
            <BonusRow label="擢升区" value={(tb.elevationBonus ?? 0) * 100} onChange={(v) => setTb({ ...tb, elevationBonus: v / 100 })} hint="%" />
            <BonusRow label="减抗" value={(tb.resistReduction ?? 0) * 100} onChange={(v) => setTb({ ...tb, resistReduction: v / 100 })} hint="%" />
          </Box></Box>);

      case 'teambuffs': {
        const isMB = reactionType === ('MOON_BLOOM' as any);
        const tfb = teamFreeBonus;
        const setTfb = (v: ZBType) => setTeamFreeBonus(v);
        return (<Box><Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>队伍 Buff</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>添加辅助角色、圣遗物套装、元素共鸣等增益</Typography><TeamBuffPanel config={teamBuffConfig} onChange={setTeamBuffConfig} /><Divider sx={{ my: 1 }} /><Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>⑤ 自由输入（覆盖/补充队伍数值）</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
            <BonusRow label="羽毛附伤" value={tfb.featherFlat ?? 0} onChange={(v) => setTfb({ ...tfb, featherFlat: v })} hint="固定值" />
            <BonusRow label="月兆角色数" value={tfb.moonCharacterCount ?? 0} onChange={(v) => setTfb({ ...tfb, moonCharacterCount: v })} hint="人" />
            <BonusRow label="精通区" value={tfb.elementalMastery ?? 0} onChange={(v) => setTfb({ ...tfb, elementalMastery: v })} hint="EM" />
            <BonusRow label="增伤区" value={(tfb.dmgBonus ?? 0) * 100} onChange={(v) => setTfb({ ...tfb, dmgBonus: v / 100 })} hint="%" />
            <BonusRow label="暴击率" value={(tfb.critRate ?? 0) * 100} onChange={(v) => setTfb({ ...tfb, critRate: v / 100 })} hint="%" />
            <BonusRow label="暴击伤害" value={(tfb.critDmg ?? 0) * 100} onChange={(v) => setTfb({ ...tfb, critDmg: v / 100 })} hint="%" />
            <BonusRow label="擢升区" value={(tfb.elevationBonus ?? 0) * 100} onChange={(v) => setTfb({ ...tfb, elevationBonus: v / 100 })} hint="%" />
            <BonusRow label="减抗" value={(tfb.resistReduction ?? 0) * 100} onChange={(v) => setTfb({ ...tfb, resistReduction: v / 100 })} hint="%" />
          </Box>
          {isMB && (<Box sx={{ mt: 1, p: 1.5, bgcolor: 'rgba(212,168,67,0.06)', borderRadius: 2 }}><Typography variant="body2" sx={{ mb: 1, color: 'primary.main' }}>祷歌型附伤（菈乌玛·月绽放专用）</Typography><Box sx={{ display: 'flex', gap: 1, mb: 1 }}><FormControl size="small" sx={{ width: 120 }}><Select value={laumaCons} onChange={(e) => setLaumaCons(e.target.value)}><MenuItem value="c0">0 命</MenuItem><MenuItem value="c2">2 命</MenuItem><MenuItem value="c3">3 命</MenuItem></Select></FormControl><TextField label="菈乌玛精通" type="number" size="small" value={laumaEM} onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) setLaumaEM(v); }} sx={{ width: 120 }} /></Box><Typography variant="caption" color="text.secondary">= {laumaEM} × {laumaCons === 'c0' ? '3.75' : laumaCons === 'c2' ? '5.0' : '5.5'} = {Math.round(calcLaumaPrayer(laumaEM, laumaCons)).toLocaleString()}</Typography></Box>)}
        </Box>);
      }

      case 'scenario':
        return (<Box><Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>攻击配置与场景</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>设置技能倍率、属性缩放、反应类型及敌人参数</Typography>
          <Box sx={{ mb: 2 }}><SkillPercentInput value={skillMultiplier} onChange={setSkillMultiplier} /></Box>
          <Box sx={{ mb: 2 }}><StatScalingInput value={customScaling} onChange={setCustomScaling} /></Box>
          <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>反应类型</Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>{reactionOptions.map((opt, i) => (<Chip key={opt.type} label={opt.label} color={reactIdx === i ? 'primary' : 'default'} variant={reactIdx === i ? 'filled' : 'outlined'} onClick={() => handleReactionChange(i)} size="small" />))}</Box>
          <Box sx={{ mb: 1, p: 1.5, bgcolor: 'rgba(212,168,67,0.06)', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">反应系数: {reactionType === 'NONE' ? '1.0' : reactionType === 'VAPORIZE' ? '1.5/2.0' : reactionType === 'MELT' ? '1.5/2.0' : reactionType === 'MOON_ELECTRO' ? '3.0' : reactionType === 'MOON_BLOOM' ? '1.0' : reactionType === 'MOON_CRYSTAL' ? '1.6' : reactionType === 'REACTION_MOON_ELECTRO' ? '1.8' : reactionType === 'REACTION_MOON_CRYSTAL' ? '0.96' : '—'} · 怪物抗性: 10% · 怪物等级: 100</Typography>
          </Box>
          <ScenarioSelect /></Box>);

      default:
        return <Typography color="text.secondary">未知板块</Typography>;
    }
  }, [selectedCharacter, characterLevel, skillMultiplier, reactionType, amplifyingMultiplier, weaponConfig, talentConfig, teamBuffConfig, reactionOptions, reactIdx, handleReactionChange, selectedScenario, damageResult, redistributeResult, idealResult, damageComparison, idealRollCount, resultLabels, customScaling, laumaCons, laumaEM, setSkillMultiplier, setCharacterLevel, setTalentConfig, setWeaponConfig, setConstellationBonus]);

  return (
    <Box sx={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
      <LoadingOverlay visible={isCalculating} progress={progress} message="正在计算…" />
      <IconButton onClick={exitWizard} sx={{ position: 'fixed', top: 16, left: 16, zIndex: 20, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}><ArrowBackIcon /></IconButton>
      <SectionStepper resultLabels={resultLabels} />
      <Box sx={{ position: 'absolute', left: 64, top: 0, right: 280, bottom: 0 }}><SectionRoller renderSection={renderSection} /></Box>
      <Box sx={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 20, display: 'flex', gap: 1 }}>
        <Button variant="outlined" size="small" disabled={currentIndex === 0} onClick={() => goToSection(currentIndex - 1)}>上一步</Button>
        {currentIndex < sections.length - 1 && <Button variant="contained" size="small" onClick={nextSectionFn}>下一步</Button>}
      </Box>
      <Box sx={{ position: 'fixed', top: 56, right: 16, width: 248, zIndex: 5, maxHeight: 'calc(100vh - 80px)', overflowY: 'auto', '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { background: 'rgba(212,168,67,0.2)', borderRadius: 2 } }}>
        <CharacterStatPanel stats={computedStats} showActions onCalcDamage={handleCalcDamage} onRedistribute={handleRedistribute} onIdealTemplate={handleIdealTemplate} />
      </Box>
    </Box>
  );
}

export default WizardPage;
