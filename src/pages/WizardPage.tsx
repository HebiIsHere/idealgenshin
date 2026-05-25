import React, { useMemo, useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import Chip from '@mui/material/Chip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { useWizardStore, type WizardSection } from '../store/slices/wizardSlice';
import { useCharacterStore } from '../store/slices/characterSlice';
import { useArtifactStore } from '../store/slices/artifactSlice';
import { useOptimizerStore } from '../store/slices/optimizerSlice';
import { useSaveStore } from '../store/slices/saveSlice';

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
import TeamBuffPanel, { TeamBuffConfig, defaultTeamBuffConfig, computeTeamBuffBonuses } from '../components/optimizer/TeamBuffPanel';
import LoadingOverlay from '../components/common/LoadingOverlay';
import BonusRow from '../components/common/BonusRow';
import RefAccordion, { type RefEntry } from '../components/common/RefAccordion';
import ErrorBoundary from '../components/common/ErrorBoundary';
import DamageFlow from '../components/optimizer/DamageFlow';
import ZoneAnalysisTable from '../components/optimizer/ZoneAnalysisTable';
import SaveManager from '../components/layout/SaveManager';
import SectionStepper from '../components/wizard/SectionStepper';
import SectionRoller from '../components/wizard/SectionRoller';

import { DEFAULT_WEAPON, getWeaponById } from '../data/weapons';
import { getAllArtifactSets } from '../data/artifacts';
import { SUBSTAT_MID_VALUES, STAT_DISPLAY_NAMES } from '../data/constants';
import talentRef from '../data/talents/ref.json';
import constellationRef from '../data/constellations/ref.json';
import avatarMap from '../data/avatar_to_character.json';
import { getReactionOptions, isNodKraiCharacter } from '../data/reactions';
import { formatDamage } from '../utils/format';
import type { CharacterBuild, ArtifactInstance, DamageContext, DamageResult, StatScaling, ZoneBonusInput as ZBType } from '../types';
import { ArtifactSlotType, SubstatType, ElementType } from '../types';

/* Lauma prayer: EM × multiplier based on constellation */
function calcLaumaPrayer(em: number, cons: string): number {
  const multipliers: Record<string, number> = { 'c0': 4.0, 'c2': 8.0, 'c3': 8.723 };
  return em * (multipliers[cons] ?? 0);
}

/* ===== Main WizardPage ===== */

function WizardPage(): React.ReactElement {
  const currentIndex = useWizardStore((s) => s.currentIndex);
  const sections = useWizardStore((s) => s.sections);
  const goToSection = useWizardStore((s) => s.goToSection);
  const nextSectionFn = useWizardStore((s) => s.nextSection);
  const insertResultSection = useWizardStore((s) => s.insertResultSection);
  const removeResultSections = useWizardStore((s) => s.removeResultSections);
  const exitWizard = useWizardStore((s) => s.exitWizard);
  const saveCurrent = useSaveStore((s) => s.saveCurrent);
  const [saveManagerOpen, setSaveManagerOpen] = useState(false);

  const {
    selectedCharacter, characterLevel, skillMultiplier, reactionType, amplifyingMultiplier,
    setSkillMultiplier, setReactionType, setAmplifyingMultiplier, setCharacterLevel,
    teamBuffs, weaponConfig, constellationConfig, talentConfig, setBonus,
    statConversions, setConversions, setWeaponConfig, setTalentConfig, setConstellationBonus,
    setSetBonus, selectCharacter, setWeaponRefinement,
  } = useCharacterStore();

  const { artifacts, showcaseCharacters, selectedShowcaseIdx } = useArtifactStore();
  const { isCalculating, progress, redistributeResult, idealResult, damageComparison, zoneAnalysis,
    runOptimizationWithComparison, runIdealTemplate } = useOptimizerStore();

  const [teamBuffConfig, setTeamBuffConfig] = useState<TeamBuffConfig>(defaultTeamBuffConfig());
  const teamBuffBonuses = useMemo(() => computeTeamBuffBonuses(teamBuffConfig), [teamBuffConfig]);
  const [damageResult, setDamageResult] = useState<DamageResult | null>(null);
  const [idealRollCount, setIdealRollCount] = useState(25);
  const [searchMainStats] = useState(false);
  const [resultLabels, setResultLabels] = useState<Record<string, string>>({});

  // Lauma prayer config
  const [laumaCons, setLaumaCons] = useState<string>('c0');
  const [laumaEM, setLaumaEM] = useState<number>(0);

  // 倍率配置（至多两种混合，默认攻击力 300%）
  const [customScaling, setCustomScaling] = useState<StatScaling>({ atkRatio: 3, hpRatio: 0, defRatio: 0, emRatio: 0 });

  // 活跃的倍率条目
  const scalingEntries = useMemo(() => {
    const keys: (keyof StatScaling)[] = ['atkRatio', 'hpRatio', 'defRatio', 'emRatio'];
    return keys.filter(k => (customScaling[k] ?? 0) > 0).map(k => ({ key: k, value: customScaling[k] }));
  }, [customScaling]);
  const scalingLabels: Record<string, string> = { atkRatio: '攻击力', hpRatio: '生命值', defRatio: '防御力', emRatio: '元素精通' };

  // 天赋/命座详情展开状态
  const [talentExpand, setTalentExpand] = useState(false);
  const [constExpand, setConstExpand] = useState(false);

  // Imported artifact set detection for ArtifactSetSelect
  const importedSetCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of Object.values(artifacts)) {
      if (a?.setName) counts[a.setName] = (counts[a.setName] || 0) + 1;
    }
    return counts;
  }, [artifacts]);
  const importedSetNames = Object.keys(importedSetCounts);

  // Talent entries for reference display
  const talentEntries = useMemo(() => {
    if (!selectedCharacter) return [] as { key: string; name: string; description: string; params: string[] }[];
    const ref = (talentRef as Record<string, { talents: { key: string; name: string; description: string; params: string[] }[] }>)[selectedCharacter.id];
    return ref?.talents ?? [];
  }, [selectedCharacter]);

  // Constellation entries for reference display
  const constEntries: RefEntry[] = useMemo(() => {
    if (!selectedCharacter) return [];
    const ref = (constellationRef as Record<string, { constellations: RefEntry[] }>)[selectedCharacter.id];
    return ref?.constellations ?? [];
  }, [selectedCharacter]);

  // ---- Reactions ----
  // Enka import sync: auto-fill character + weapon when showcase data changes
  React.useEffect(() => {
    if (showcaseCharacters.length === 0) return;
    const sc = showcaseCharacters[selectedShowcaseIdx];
    if (!sc) return;

    const mapEntry = (avatarMap as Record<string, { projectId: string; zhName: string }>)[sc.characterId];
    if (mapEntry?.projectId && mapEntry.projectId !== selectedCharacter?.id) {
      selectCharacter(mapEntry.projectId);
    }
    if (sc.characterLevel !== characterLevel) {
      setCharacterLevel(sc.characterLevel);
    }
    if (sc.weaponProjectId && sc.weaponProjectId !== weaponConfig?.weaponData?.id) {
      const wd = getWeaponById(sc.weaponProjectId);
      if (wd) {
        setWeaponConfig(wd, sc.weaponLevel, sc.weaponRefinement);
      }
    }
    // Auto-detect and apply set bonuses from imported artifacts
    const setCounts: Record<string, number> = {};
    for (const a of Object.values(artifacts)) {
      if (a?.setName) setCounts[a.setName] = (setCounts[a.setName] || 0) + 1;
    }
    const entries = Object.entries(setCounts).sort(([,a], [,b]) => b - a);
    if (entries.length > 0) {
      const allSets = getAllArtifactSets();
      const [mainName, mainCount] = entries[0];
      const setA = allSets.find(s => s.nameZh === mainName);
      if (setA && mainCount >= 2) {
        const bonus: import('../types').ZoneBonusInput = {};
        const merge = (s: Partial<import('../types').ZoneBonusInput> | undefined) => {
          if (!s) return;
          for (const [k, v] of Object.entries(s)) {
            (bonus as any)[k] = ((bonus as any)[k] ?? 0) + (v as number);
          }
        };
        merge(setA.twoPcBonus);
        if (mainCount >= 4) merge(setA.fourPcBonus);
        else {
          const secondName = entries[1]?.[0];
          const secondCount = entries[1]?.[1] || 0;
          if (secondCount >= 2) {
            const setB = allSets.find(s => s.nameZh === secondName);
            if (setB) merge(setB.twoPcBonus);
          }
        }
        if (Object.keys(bonus).length > 0) setSetBonus(bonus);
      }
    }
  }, [showcaseCharacters, selectedShowcaseIdx, artifacts]);

  const isNod = selectedCharacter ? isNodKraiCharacter(selectedCharacter.id) : false;
  const charElement = selectedCharacter?.element ?? ElementType.PYRO;
  const reactionOptions = useMemo(() => getReactionOptions(charElement, isNod), [charElement, isNod]);
  const reactIdx = useMemo(() => reactionOptions.findIndex((o) => o.type === reactionType), [reactionOptions, reactionType]);

  React.useEffect(() => {
    const first = reactionOptions[0];
    if (first) { setReactionType(first.type); if (first.amplifyingMultiplier !== undefined) setAmplifyingMultiplier(first.amplifyingMultiplier); }
  }, [selectedCharacter?.id]);

  const handleReactionChange = useCallback((idx: number) => {
    const opt = reactionOptions[idx];
    if (!opt) return;
    setReactionType(opt.type);
    if (opt.amplifyingMultiplier !== undefined) setAmplifyingMultiplier(opt.amplifyingMultiplier);
  }, [reactionOptions, setReactionType, setAmplifyingMultiplier]);

  // ---- Build & Stats ----
  const currentBuild = useMemo<CharacterBuild | null>(() => {
    if (!selectedCharacter) return null;
    const artifactList = Object.values(ArtifactSlotType).map((slot) => artifacts[slot]).filter((a): a is ArtifactInstance => a !== null);
    // Add Lauma prayer to team buff bonuses if applicable
    const prayerBonus: ZBType = {};
    if (reactionType === 'MOON_BLOOM' as any) {
      prayerBonus.prayerFlat = calcLaumaPrayer(laumaEM, laumaCons);
    }
    const mergedTeamBonuses: ZBType = { ...teamBuffBonuses, ...prayerBonus };
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
      enemyLevel: 100, enemyResistance: 0.10,
      amplifyingMultiplier: currentBuild.amplifyingMultiplier ?? 0, characterLevel: currentBuild.characterLevel,
      defReductions: [...(eb.defReductions ?? [])], defIgnore: eb.defIgnore ?? 0, elevationBonus: eb.elevationBonus ?? 0,
      extraBonuses: eb, independentBonus: 0,
    };
    const result = DamageFormula.calculate(ctx);
    setDamageResult(result);
    removeResultSections();
    const idx = insertResultSection('伤害计算结果');
    setResultLabels((prev) => ({ ...prev, [`result_${idx}`]: '伤害计算结果' }));
  }, [currentBuild, computedStats, customScaling, insertResultSection, removeResultSections]);

  const handleRedistribute = useCallback(() => {
    if (!currentBuild) return;
    const vm = new Map<SubstatType, number>();
    for (const s of Object.values(ArtifactSlotType)) { const a = artifacts[s]; if (!a) continue; for (const sub of a.subStats) vm.set(sub.type, (vm.get(sub.type) ?? 0) + sub.value); }
    const bAtk = (selectedCharacter?.baseStats.atk ?? 0) + (weaponConfig?.weaponData?.baseAtk ?? 0);
    const fold = (ft: SubstatType, pt: SubstatType, b: number) => { if (b > 0 && vm.has(ft)) { vm.set(pt, (vm.get(pt) ?? 0) + vm.get(ft)! / b); vm.delete(ft); } };
    fold(SubstatType.ATK_FLAT, SubstatType.ATK_PERCENT, bAtk); fold(SubstatType.HP_FLAT, SubstatType.HP_PERCENT, selectedCharacter?.baseStats.hp ?? 0); fold(SubstatType.DEF_FLAT, SubstatType.DEF_PERCENT, selectedCharacter?.baseStats.def ?? 0);
    const rm = new Map<SubstatType, number>(); for (const [t, v] of vm) { const mv = SUBSTAT_MID_VALUES[t] ?? 1; if (mv > 0) rm.set(t, v / mv); }
    const allocs = Array.from(rm.entries()).map(([t, r]) => ({ type: t, rolls: r }));
    const rel = new Set(selectedCharacter?.relevantSubstats ?? []);
    // 根据当前倍率配置动态扩展相关词条
    if ((customScaling.hpRatio ?? 0) > 0) { rel.add(SubstatType.HP_PERCENT); rel.add(SubstatType.HP_FLAT); }
    if ((customScaling.defRatio ?? 0) > 0) { rel.add(SubstatType.DEF_PERCENT); rel.add(SubstatType.DEF_FLAT); }
    if ((customScaling.atkRatio ?? 0) > 0) { rel.add(SubstatType.ATK_PERCENT); rel.add(SubstatType.ATK_FLAT); }
    if ((customScaling.emRatio ?? 0) > 0) { rel.add(SubstatType.ELEMENTAL_MASTERY); }
    const f = allocs.filter(a => rel.has(a.type));
    if (f.length === 0) return;
    runOptimizationWithComparison(currentBuild, f, '默认场景');
    removeResultSections();
    const idx = insertResultSection('重优化结果');
    setResultLabels((prev) => ({ ...prev, [`result_${idx}`]: '重优化结果' }));
  }, [currentBuild, artifacts, selectedCharacter, weaponConfig, runOptimizationWithComparison, insertResultSection, removeResultSections]);

  const handleIdealTemplate = useCallback(() => {
    if (!currentBuild) return;
    runIdealTemplate(currentBuild.character, idealRollCount, currentBuild.skillMultiplier, currentBuild.reactionType, currentBuild, searchMainStats);
    removeResultSections();
    const idx = insertResultSection('理想模板');
    setResultLabels((prev) => ({ ...prev, [`result_${idx}`]: '理想模板' }));
  }, [currentBuild, idealRollCount, searchMainStats, runIdealTemplate, insertResultSection, removeResultSections]);

  // ---- Render sections ----
  const tb = talentConfig?.bonus ?? {};
  const setTb = (v: ZBType) => { setTalentConfig(v); };
  const cb = constellationConfig?.bonus ?? {};
  const setCb = (v: ZBType) => { setConstellationBonus(v); };
  const showPct = (bonus: ZBType, key: string) => {
    const v = (bonus as any)[key] as number | undefined;
    return v ? Number((v * 100).toFixed(4)) : undefined;
  };
  const showNum = (bonus: ZBType, key: string) => {
    const v = (bonus as any)[key] as number | undefined;
    return v ? Number(v.toFixed(4)) : undefined;
  };
  const setPct = (setter: (v: ZBType) => void, bonus: ZBType, key: string) => (v: number) => {
    setter({ ...bonus, [key]: v / 100 });
  };
  const setFlat = (setter: (v: ZBType) => void, bonus: ZBType, key: string) => (v: number) => {
    setter({ ...bonus, [key]: v });
  };

  const renderSection = useCallback((section: WizardSection): React.ReactNode => {
    const s = String(section);
    if (s.startsWith('result_')) {
      if (resultLabels[s]?.includes('理想')) {
        return (<Box><Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>理想模板</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="body2" color="text.secondary">词条数</Typography>
            <TextField size="small" type="number" value={idealRollCount} sx={{ width: 80 }}
              slotProps={{ htmlInput: { step: 0.1, min: 0.1, max: 50 } }}
              onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0.1 && v <= 50) setIdealRollCount(v); }} />
            <Button size="small" variant="outlined" onClick={handleIdealTemplate}>刷新</Button>
          </Box>
          {idealResult ? <>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700 }}>{Math.round(idealResult.theoreticalDamage).toLocaleString('en-US')}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>理论伤害（{idealRollCount} 词条）</Typography>
            </Box>
            {idealResult.idealStats && computedStats && (
              <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1, mb: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>理想面板对比</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.5 }}>
                  {([
                    ['生命值', 'totalHp', 0], ['攻击力', 'totalAtk', 0], ['防御力', 'totalDef', 0],
                    ['暴击率', 'critRate', 1], ['暴击伤害', 'critDmg', 1], ['元素精通', 'em', 0],
                    ['充能效率', 'er', 1], ['伤害加成', 'dmgBonus', 1],
                  ] as const).map(([label, key, isPct]) => {
                    const oldVal = (computedStats as any)?.[key] ?? 0;
                    const newVal = (idealResult.idealStats as any)?.[key] ?? 0;
                    const changed = Math.abs(newVal - oldVal) > 1e-6;
                    const fmtVal = (v: number) => isPct ? (v * 100).toFixed(4) + '%' : v.toFixed(4);
                    return (
                      <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5 }}>
                        <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.45)' }}>{label}</Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: changed ? 'success.light' : 'rgba(255,255,255,0.7)', fontWeight: changed ? 600 : 400 }}>{fmtVal(newVal)}</Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
            {idealResult.idealAllocations && (
              <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1, mb: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>理想词条分配</Typography>
                {idealResult.idealAllocations.map((a) => (
                  <Box key={a.type} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', width: 90, color: 'rgba(255,255,255,0.45)' }}>{STAT_DISPLAY_NAMES[a.type] ?? a.type}</Typography>
                    <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>{a.rolls.toFixed(4)}条</Typography>
                  </Box>
                ))}
              </Box>
            )}
            {idealResult.breakdown && <DamageFlow result={idealResult.breakdown} computedStats={idealResult.idealStats ?? computedStats} />}
          </> : <Typography color="text.secondary">计算中…</Typography>}
        </Box>);
      }
      if (resultLabels[s]?.includes('重优化')) {
        return (<Box>
          <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>同词条重优化</Typography>
          {redistributeResult ? <>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 2 }}>
              <Box sx={{ textAlign: 'center' }}><Typography variant="caption" color="text.secondary">优化前</Typography><Typography variant="h6">{formatDamage(redistributeResult.originalDamage)}</Typography></Box>
              <Box sx={{ textAlign: 'center' }}><Typography variant="caption" color="text.secondary">优化后</Typography><Typography variant="h6" sx={{ color: 'success.light' }}>{formatDamage(redistributeResult.optimizedDamage)}</Typography></Box>
            </Box>
            {damageComparison && <Typography variant="body1" sx={{ textAlign: 'center', color: damageComparison.improvementPercent > 0 ? 'success.main' : 'text.primary', fontWeight: 600, mb: 2 }}>提升 {damageComparison.improvementPercent >= 0 ? '+' : ''}{(damageComparison.improvementPercent * 100).toFixed(4)}%</Typography>}

            {/* 优化后角色面板对比 */}
            {redistributeResult.optimizedStats && (
              <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1, mb: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>优化后角色面板</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.5 }}>
                  {([
                    ['生命值', 'totalHp', 0], ['攻击力', 'totalAtk', 0], ['防御力', 'totalDef', 0],
                    ['暴击率', 'critRate', 1], ['暴击伤害', 'critDmg', 1], ['元素精通', 'em', 0],
                    ['充能效率', 'er', 1], ['伤害加成', 'dmgBonus', 1],
                  ] as const).map(([label, key, isPct]) => {
                    const oldVal = (redistributeResult.originalStats as any)?.[key] ?? 0;
                    const newVal = (redistributeResult.optimizedStats as any)?.[key] ?? 0;
                    const changed = Math.abs(newVal - oldVal) > 1e-6;
                    const fmtVal = (v: number) => isPct ? (v * 100).toFixed(4) + '%' : v.toFixed(4);
                    return (
                      <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5 }}>
                        <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.45)' }}>{label}</Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: changed ? 'success.light' : 'rgba(255,255,255,0.7)', fontWeight: changed ? 600 : 400 }}>
                          {fmtVal(newVal)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* 词条分布对比 */}
            {redistributeResult.currentAllocations && redistributeResult.optimizedAllocations && (
              <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1, mb: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>词条分布对比</Typography>
                {redistributeResult.optimizedAllocations.map((opt) => {
                  const cur = redistributeResult.currentAllocations.find(a => a.type === opt.type);
                  const curRolls = cur?.rolls ?? 0;
                  const changed = Math.abs(opt.rolls - curRolls) > 0.001;
                  return (
                    <Box key={opt.type} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                      <Typography variant="caption" sx={{ fontSize: '0.6rem', width: 90, color: 'rgba(255,255,255,0.45)' }}>{STAT_DISPLAY_NAMES[opt.type] ?? opt.type}</Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>{curRolls.toFixed(4)}条</Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)' }}>→</Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', color: changed ? 'success.light' : 'rgba(255,255,255,0.7)', fontWeight: changed ? 600 : 400 }}>{opt.rolls.toFixed(4)}条</Typography>
                    </Box>
                  );
                })}
              </Box>
            )}

            {zoneAnalysis && <ZoneAnalysisTable analysis={zoneAnalysis} />}

            <ErrorBoundary><DamageFlow result={redistributeResult.optimizedBreakdown ?? damageResult!} computedStats={redistributeResult.optimizedStats ?? computedStats} /></ErrorBoundary>
          </> : <Typography color="text.secondary">计算中…</Typography>}
        </Box>);
      }
      return (<Box><Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>伤害计算结果</Typography>{damageResult ? <><Box sx={{ textAlign: 'center', mb: 2 }}><Typography variant="h3" sx={{ color: 'primary.main', fontWeight: 700 }}>{formatDamage(damageResult.totalDamage)}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>当前配置伤害</Typography></Box><DamageFlow result={damageResult} computedStats={computedStats} /></> : <Typography color="text.secondary">尚未计算</Typography>}</Box>);
    }

    switch (s) {
      case 'import':
        return (<Box><Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>Enka 导入</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>输入 UID 自动导入角色展柜数据，省去手动填写</Typography><ArtifactImport /></Box>);

      case 'character':
        return (<Box><Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>选择角色</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>选择一位需要分析的角色</Typography><CharacterSelect /><Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}><TextField label="角色等级" type="number" size="small" value={characterLevel} onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1 && v <= 90) setCharacterLevel(v); }} slotProps={{ htmlInput: { min: 1, max: 90 } }} sx={{ width: 120 }} /></Box></Box>);

      case 'weapon':
        return (<Box><Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>武器配置</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>选择武器并查看被动效果</Typography>
          <WeaponSelect />
          {weaponConfig && (<><Box sx={{ mt: 1, mb: 1, p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2 }}><Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>{weaponConfig.weaponData.nameZh}</Typography><Typography variant="body2" color="text.secondary">基础攻击力: {weaponConfig.weaponData.baseAtk}</Typography>{weaponConfig.weaponData.substatType && weaponConfig.weaponData.substatValue > 0 && <Typography variant="body2" color="text.secondary">{({ ATK_PERCENT: '攻击力%', DEF_PERCENT: '防御力%', HP_PERCENT: '生命值%', CRIT_RATE: '暴击率%', CRIT_DMG: '暴击伤害%', ELEMENTAL_MASTERY: '元素精通', ENERGY_RECHARGE: '充能效率', PHYSICAL_DMG_BONUS: '物理伤害%' } as Record<string,string>)[weaponConfig.weaponData.substatType] || weaponConfig.weaponData.substatType}: {weaponConfig.weaponData.substatType === 'ELEMENTAL_MASTERY' ? Math.round(weaponConfig.weaponData.substatValue) : `${(weaponConfig.weaponData.substatValue*100).toFixed(4)}%`}</Typography>}<Typography variant="body2" color="text.secondary">等级: {weaponConfig.weaponLevel}</Typography>
            <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}><Typography variant="body2" color="text.secondary">精炼:</Typography>{[1,2,3,4,5].map((r) => (<Chip key={r} label={`R${r}`} size="small" color={weaponConfig.refinement === r ? 'primary' : 'default'} variant={weaponConfig.refinement === r ? 'filled' : 'outlined'} onClick={() => setWeaponRefinement(r)} sx={{ cursor: 'pointer', minWidth: 36 }} />))}</Box></Box>
            <WeaponPassiveInput /></>)}</Box>);

      case 'artifacts':
        return (<Box><Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>圣遗物配置</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>逐部位填入圣遗物主/副词条属性</Typography><ArtifactEditor /><Box sx={{ mt: 2 }}><ArtifactSetSelect importedSetNames={importedSetNames} importedSetCounts={importedSetCounts} /></Box></Box>);

      case 'talents':
        return (<Box>
          <Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>天赋与命座</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>手动填入天赋和命座对应的实际加成数值</Typography>
          <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2, borderLeft: '3px solid', borderColor: 'primary.main' }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'primary.main' }}>天赋模拟</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', display: 'block', mb: 1 }}>固有天赋等角色自身机制提供的乘区加成</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
              <BonusRow label="大权区" value={showPct(tb, 'authorityMultiplier')} onChange={setPct(setTb, tb, 'authorityMultiplier')} hint="%" />
              <BonusRow label="月兆区" value={showPct(tb, 'moonSignBonus')} onChange={setPct(setTb, tb, 'moonSignBonus')} hint="%" />
              <BonusRow label="增伤区" value={showPct(tb, 'dmgBonus')} onChange={setPct(setTb, tb, 'dmgBonus')} hint="%" />
              <BonusRow label="精通区" value={showNum(tb, 'elementalMastery')} onChange={setFlat(setTb, tb, 'elementalMastery')} hint="EM" />
              <BonusRow label="攻击力%" value={showPct(tb, 'atkPercent')} onChange={setPct(setTb, tb, 'atkPercent')} hint="%" />
              <BonusRow label="防御力%" value={showPct(tb, 'defPercent')} onChange={setPct(setTb, tb, 'defPercent')} hint="%" />
              <BonusRow label="生命值%" value={showPct(tb, 'hpPercent')} onChange={setPct(setTb, tb, 'hpPercent')} hint="%" />
              <BonusRow label="攻击力" value={showNum(tb, 'atkFlat')} onChange={setFlat(setTb, tb, 'atkFlat')} hint="固定值" />
              <BonusRow label="防御力" value={showNum(tb, 'defFlat')} onChange={setFlat(setTb, tb, 'defFlat')} hint="固定值" />
              <BonusRow label="生命值" value={showNum(tb, 'hpFlat')} onChange={setFlat(setTb, tb, 'hpFlat')} hint="固定值" />
              <BonusRow label="羽毛附伤" value={showNum(tb, 'featherFlat')} onChange={setFlat(setTb, tb, 'featherFlat')} hint="固定值" />
            </Box>
            <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
              ⚠ 百分比类数值无需输入 % 号，直接填数字即可（如 61.7 表示 61.7%）
            </Typography>
            <RefAccordion open={talentExpand} onToggle={() => setTalentExpand(!talentExpand)} entries={talentEntries} buttonLabel="查看天赋详情" emptyHint={selectedCharacter ? '暂无天赋数据' : '请先选择角色'} />
          </Box>
          <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2, borderLeft: '3px solid', borderColor: 'secondary.main' }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'secondary.main' }}>命座模拟</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', display: 'block', mb: 1 }}>命之座效果提供的乘区加成</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
              <BonusRow label="暴击率" value={showPct(cb, 'critRate')} onChange={setPct(setCb, cb, 'critRate')} hint="%" />
              <BonusRow label="暴击伤害" value={showPct(cb, 'critDmg')} onChange={setPct(setCb, cb, 'critDmg')} hint="%" />
              <BonusRow label="擢升区" value={showPct(cb, 'elevationBonus')} onChange={setPct(setCb, cb, 'elevationBonus')} hint="%" />
              <BonusRow label="减抗" value={showPct(cb, 'resistReduction')} onChange={setPct(setCb, cb, 'resistReduction')} hint="%" />
              <BonusRow label="增伤区" value={showPct(cb, 'dmgBonus')} onChange={setPct(setCb, cb, 'dmgBonus')} hint="%" />
              <BonusRow label="攻击力%" value={showPct(cb, 'atkPercent')} onChange={setPct(setCb, cb, 'atkPercent')} hint="%" />
              <BonusRow label="防御力%" value={showPct(cb, 'defPercent')} onChange={setPct(setCb, cb, 'defPercent')} hint="%" />
              <BonusRow label="生命值%" value={showPct(cb, 'hpPercent')} onChange={setPct(setCb, cb, 'hpPercent')} hint="%" />
              <BonusRow label="攻击力" value={showNum(cb, 'atkFlat')} onChange={setFlat(setCb, cb, 'atkFlat')} hint="固定值" />
              <BonusRow label="防御力" value={showNum(cb, 'defFlat')} onChange={setFlat(setCb, cb, 'defFlat')} hint="固定值" />
              <BonusRow label="生命值" value={showNum(cb, 'hpFlat')} onChange={setFlat(setCb, cb, 'hpFlat')} hint="固定值" />
            </Box>
            <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
              ⚠ 百分比类数值无需输入 % 号，直接填数字即可（如 61.7 表示 61.7%）
            </Typography>
            <RefAccordion open={constExpand} onToggle={() => setConstExpand(!constExpand)} entries={constEntries} buttonLabel="查看命座详情" emptyHint={selectedCharacter ? '暂无命座数据' : '请先选择角色'} />
          </Box></Box>);

      case 'teambuffs': {
        const isMB = reactionType === ('MOON_BLOOM' as any);
        return (<Box><Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>队伍 Buff</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>添加辅助角色、圣遗物套装、元素共鸣等增益（自由输入已整合至⑤）</Typography><TeamBuffPanel config={teamBuffConfig} onChange={setTeamBuffConfig} />
          {isMB && (<Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2 }}><Typography variant="body2" sx={{ mb: 1, color: 'primary.main' }}>祷歌型附伤（菈乌玛·月绽放专用）</Typography><Box sx={{ display: 'flex', gap: 1, mb: 1 }}><FormControl size="small" sx={{ width: 120 }}><Select value={laumaCons} onChange={(e) => setLaumaCons(e.target.value)}><MenuItem value="c0">0 命</MenuItem><MenuItem value="c2">2 命</MenuItem><MenuItem value="c3">3 命</MenuItem></Select></FormControl><TextField label="菈乌玛精通" type="number" size="small" value={laumaEM || ''} placeholder="0" sx={{ width: 120 }} slotProps={{ htmlInput: { step: 1 } }} onChange={(e) => { const raw = e.target.value; if (raw === '' || raw === '-') { setLaumaEM(0); return; } const v = parseInt(raw); if (!isNaN(v)) setLaumaEM(v); }} /></Box><Typography variant="caption" color="text.secondary">= {laumaEM || 0} × {laumaCons === 'c0' ? '4.0' : laumaCons === 'c2' ? '8.0' : '8.723'} = {Math.round(calcLaumaPrayer(laumaEM, laumaCons)).toLocaleString()}</Typography></Box>)}
        </Box>);
      }

      case 'scenario':
        return (<Box><Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>倍率与反应</Typography>
          <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2, borderLeft: '3px solid', borderColor: 'primary.main' }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'primary.main' }}>倍率</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', display: 'block', mb: 1 }}>至多两种属性混合，直接输入百分比数值（如 230.7 表示 230.7%）</Typography>
            {scalingEntries.map((entry) => (
              <Box key={entry.key} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <FormControl size="small" sx={{ width: 100 }}>
                  <Select value={entry.key} onChange={(e) => {
                    const newKey = e.target.value as keyof StatScaling;
                    const next = { atkRatio: 0, hpRatio: 0, defRatio: 0, emRatio: 0 } as StatScaling;
                    next[newKey] = entry.value;
                    setCustomScaling(next);
                  }}>
                    {(['atkRatio','hpRatio','defRatio','emRatio'] as (keyof StatScaling)[]).filter(k => k === entry.key || !scalingEntries.some(s => s.key === k)).map(k => (
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
                const unused = (['atkRatio','hpRatio','defRatio','emRatio'] as (keyof StatScaling)[]).find(k => !scalingEntries.some(s => s.key === k));
                if (unused) {
                  const next = { ...customScaling };
                  next[unused] = 1;
                  setCustomScaling(next);
                }
              }}>+ 添加倍率种类</Button>
            )}
          </Box>
          <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>反应类型</Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>{reactionOptions.map((opt, i) => (<Chip key={opt.type} label={opt.label} color={reactIdx === i ? 'primary' : 'default'} variant={reactIdx === i ? 'filled' : 'outlined'} onClick={() => handleReactionChange(i)} size="small" />))}</Box>
          <Box sx={{ mb: 1, p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">反应系数: {reactionType === 'NONE' ? '1.0' : reactionType === 'VAPORIZE' ? '1.5/2.0' : reactionType === 'MELT' ? '1.5/2.0' : reactionType === 'MOON_ELECTRO' ? '3.0' : reactionType === 'MOON_BLOOM' ? '1.0' : reactionType === 'MOON_CRYSTAL' ? '1.6' : reactionType === 'REACTION_MOON_ELECTRO' ? '1.8' : reactionType === 'REACTION_MOON_CRYSTAL' ? '0.96' : '—'} · 怪物抗性: 10% · 怪物等级: 100</Typography>
          </Box>
          </Box>);

      default:
        return <Typography color="text.secondary">未知板块</Typography>;
    }
  }, [selectedCharacter, characterLevel, skillMultiplier, amplifyingMultiplier, weaponConfig, talentConfig, teamBuffConfig, reactionOptions, reactIdx, handleReactionChange, damageResult, redistributeResult, idealResult, damageComparison, idealRollCount, resultLabels, customScaling, laumaCons, laumaEM, talentExpand, constExpand, setSkillMultiplier, setCharacterLevel, setTalentConfig, setWeaponConfig, setConstellationBonus]);

  return (
    <Box sx={{ position: 'relative', width: '100vw', height: '100vh', bgcolor: 'background.default' }}>
      <LoadingOverlay visible={isCalculating} progress={progress} message="正在计算…" />
      <Box sx={{ position: 'fixed', top: 16, left: 16, zIndex: 20, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={exitWizard} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}><ArrowBackIcon /></IconButton>
        <Button variant="outlined" size="small" onClick={saveCurrent} sx={{ fontSize: '0.75rem', px: 2 }}>保存配置</Button>
        <Button variant="outlined" size="small" onClick={() => setSaveManagerOpen(true)} sx={{ fontSize: '0.75rem', px: 2 }}>添加配置</Button>
      </Box>
      <SectionStepper resultLabels={resultLabels} />
      <Box sx={{ position: 'absolute', left: 64, top: 0, right: 280, bottom: 0 }}><SectionRoller renderSection={renderSection} /></Box>
      <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 20, display: 'flex', gap: 1.5 }}>
        <Button variant="outlined" disabled={currentIndex === 0} onClick={() => goToSection(currentIndex - 1)} sx={{ px: 3, py: 1, fontSize: '0.9rem' }}>上一步</Button>
        {currentIndex < sections.length - 1 && <Button variant="contained" onClick={nextSectionFn} sx={{ px: 3, py: 1, fontSize: '0.9rem' }}>下一步</Button>}
      </Box>
      <Box sx={{ position: 'fixed', top: 56, right: 16, width: 248, zIndex: 5, maxHeight: 'calc(100vh - 80px)', overflowY: 'auto', '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { background: 'rgba(212,168,67,0.2)', borderRadius: 2 } }}>
        <CharacterStatPanel stats={computedStats} showActions onCalcDamage={handleCalcDamage} onRedistribute={handleRedistribute} onIdealTemplate={handleIdealTemplate} />
      </Box>
      <SaveManager open={saveManagerOpen} onClose={() => setSaveManagerOpen(false)} />
    </Box>
  );
}

export default WizardPage;

