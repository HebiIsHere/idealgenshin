import React, { useMemo, useCallback, useState } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { useWizardStore, type WizardSection } from '../store/slices/wizardSlice';
import { useCharacterStore } from '../store/slices/characterSlice';
import { useArtifactStore } from '../store/slices/artifactSlice';
import { useOptimizerStore } from '../store/slices/optimizerSlice';
import { useSaveStore } from '../store/slices/saveSlice';

import { StatCalculator } from '../engine/stats';
import { DamageFormula } from '../engine/formula';
import { mergeExtraBonuses } from '../utils/mergeExtraBonuses';

import CharacterStatPanel from '../components/character/CharacterStatPanel';
import { TeamBuffConfig, defaultTeamBuffConfig, computeTeamBuffBonuses } from '../components/optimizer/TeamBuffPanel';
import LoadingOverlay from '../components/common/LoadingOverlay';
import StickerThrower from '../components/common/StickerThrower';
import SaveManager from '../components/layout/SaveManager';
import SectionStepper from '../components/wizard/SectionStepper';
import SectionRoller from '../components/wizard/SectionRoller';

import ImportSection from '../components/wizard/sections/ImportSection';
import CharacterSection from '../components/wizard/sections/CharacterSection';
import WeaponSection from '../components/wizard/sections/WeaponSection';
import ArtifactSection from '../components/wizard/sections/ArtifactSection';
import TalentSection from '../components/wizard/sections/TalentSection';
import ScenarioSection from '../components/wizard/sections/ScenarioSection';
import TeambuffSection from '../components/wizard/sections/TeambuffSection';
import ResultSection from '../components/wizard/sections/ResultSection';

import { DEFAULT_WEAPON, getWeaponById } from '../data/weapons';
import { getAllArtifactSets } from '../data/artifacts';
import { SUBSTAT_MID_VALUES } from '../data/constants';
import avatarMap from '../data/avatar_to_character.json';
import { getReactionOptions, isNodKraiCharacter } from '../data/reactions';
import type { CharacterBuild, ArtifactInstance, DamageContext, DamageResult, StatScaling, ZoneBonusInput as ZBType } from '../types';
import { ArtifactSlotType, SubstatType, ElementType } from '../types';

import { calcLaumaPrayer } from '../utils/calcLaumaPrayer';

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
    setReactionType, setAmplifyingMultiplier, setCharacterLevel,
    teamBuffs, weaponConfig, constellationConfig, talentConfig, setBonus,
    statConversions, setConversions, setWeaponConfig,
    setSetBonus, selectCharacter,
  } = useCharacterStore();

  const { artifacts, showcaseCharacters, selectedShowcaseIdx } = useArtifactStore();
  const { isCalculating, progress, runOptimizationWithComparison, runIdealTemplate } = useOptimizerStore();

  const [teamBuffConfig, setTeamBuffConfig] = useState<TeamBuffConfig>(defaultTeamBuffConfig());
  const teamBuffBonuses = useMemo(() => computeTeamBuffBonuses(teamBuffConfig), [teamBuffConfig]);
  const [damageResult, setDamageResult] = useState<DamageResult | null>(null);
  const [idealRollCount, setIdealRollCount] = useState(25);
  const [idealRollText, setIdealRollText] = useState('25');
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
  // Brief loading state for character/weapon selection
  const [isCharLoading, setIsCharLoading] = useState(false);
  const handleSelectCharacter = useCallback((id: string) => {
    setIsCharLoading(true);
    selectCharacter(id);
    requestAnimationFrame(() => requestAnimationFrame(() => setIsCharLoading(false)));
  }, [selectCharacter]);
  const handleSelectWeapon = useCallback((id: string) => {
    setIsCharLoading(true);
    const wd = getWeaponById(id);
    if (wd) setWeaponConfig(wd, 90);
    requestAnimationFrame(() => requestAnimationFrame(() => setIsCharLoading(false)));
  }, [setWeaponConfig]);

  // Imported artifact set detection for ArtifactSetSelect
  const importedSetCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of Object.values(artifacts)) {
      if (a?.setName) counts[a.setName] = (counts[a.setName] || 0) + 1;
    }
    return counts;
  }, [artifacts]);
  const importedSetNames = Object.keys(importedSetCounts);

  // 当前词条分配（同词条重优化用）
  const currentAllocations = useMemo(() => {
    const vm = new Map<SubstatType, number>();
    for (const s of Object.values(ArtifactSlotType)) {
      const a = artifacts[s]; if (!a) continue;
      for (const sub of a.subStats) vm.set(sub.type, (vm.get(sub.type) ?? 0) + sub.value);
    }
    const bAtk = (selectedCharacter?.baseStats.atk ?? 0) + (weaponConfig?.weaponData?.baseAtk ?? 0);
    const fold = (ft: SubstatType, pt: SubstatType, b: number) => {
      if (b > 0 && vm.has(ft)) { vm.set(pt, (vm.get(pt) ?? 0) + vm.get(ft)! / b); vm.delete(ft); }
    };
    fold(SubstatType.ATK_FLAT, SubstatType.ATK_PERCENT, bAtk);
    fold(SubstatType.HP_FLAT, SubstatType.HP_PERCENT, selectedCharacter?.baseStats.hp ?? 0);
    fold(SubstatType.DEF_FLAT, SubstatType.DEF_PERCENT, selectedCharacter?.baseStats.def ?? 0);
    const rm = new Map<SubstatType, number>();
    for (const [t, v] of vm) { const mv = SUBSTAT_MID_VALUES[t] ?? 1; if (mv > 0) rm.set(t, v / mv); }
    const allocs = Array.from(rm.entries()).map(([t, r]) => ({ type: t, rolls: r }));
    const rel = new Set(selectedCharacter?.relevantSubstats ?? []);
    if ((customScaling.hpRatio ?? 0) > 0) { rel.add(SubstatType.HP_PERCENT); rel.add(SubstatType.HP_FLAT); }
    if ((customScaling.defRatio ?? 0) > 0) { rel.add(SubstatType.DEF_PERCENT); rel.add(SubstatType.DEF_FLAT); }
    if ((customScaling.atkRatio ?? 0) > 0) { rel.add(SubstatType.ATK_PERCENT); rel.add(SubstatType.ATK_FLAT); }
    if ((customScaling.emRatio ?? 0) > 0) { rel.add(SubstatType.ELEMENTAL_MASTERY); }
    return allocs.filter(a => rel.has(a.type));
  }, [artifacts, selectedCharacter, weaponConfig, customScaling]);

  // 锚定状态
  const [anchoredTypes, setAnchoredTypes] = useState<Set<SubstatType>>(new Set());
  const toggleAnchor = useCallback((type: SubstatType) => {
    setAnchoredTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) { next.delete(type); } else { next.add(type); }
      return next;
    });
  }, []);

  // 理想模板锚定（手动输入模式）
  const idealAvailableTypes = useMemo(() => {
    if (!selectedCharacter) return [] as SubstatType[];
    return selectedCharacter.relevantSubstats;
  }, [selectedCharacter]);
  const [idealAnchors, setIdealAnchors] = useState<Map<SubstatType, number>>(new Map());
  const [idealInputs, setIdealInputs] = useState<Map<SubstatType, string>>(new Map());

  const handleIdealPinToggle = useCallback((type: SubstatType) => {
    if (idealAnchors.has(type)) {
      setIdealAnchors((prev) => { const n = new Map(prev); n.delete(type); return n; });
      setIdealInputs((prev) => { const n = new Map(prev); n.delete(type); return n; });
    } else {
      const raw = idealInputs.get(type) ?? '';
      const val = parseFloat(raw);
      if (isNaN(val) || val <= 0) return;
      const currentSum = Array.from(idealAnchors.values()).reduce((s, v) => s + v, 0);
      if (currentSum + val > idealRollCount) return;
      setIdealAnchors((prev) => new Map(prev).set(type, val));
    }
  }, [idealAnchors, idealInputs, idealRollCount]);

  const handleIdealInputChange = useCallback((type: SubstatType, value: string) => {
    setIdealInputs((prev) => { const n = new Map(prev); n.set(type, value); return n; });
  }, []);

  React.useEffect(() => { setAnchoredTypes(new Set()); setIdealAnchors(new Map()); setIdealInputs(new Map()); }, [selectedCharacter]);

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
    const idx = insertResultSection('期望伤害');
    setResultLabels((prev) => ({ ...prev, [`result_${idx}`]: '期望伤害' }));
  }, [currentBuild, computedStats, customScaling, insertResultSection, removeResultSections]);

  const handleRedistribute = useCallback(() => {
    if (!currentBuild) return;
    removeResultSections();
    const idx = insertResultSection('重优化结果');
    setResultLabels((prev) => ({ ...prev, [`result_${idx}`]: '重优化结果' }));
  }, [currentBuild, insertResultSection, removeResultSections]);

  const handleRunRedistribute = useCallback(() => {
    if (!currentBuild || currentAllocations.length === 0) return;
    const freeAllocs = currentAllocations.filter((a) => !anchoredTypes.has(a.type));
    if (freeAllocs.length === 0) return;
    const anchoredArr = anchoredTypes.size > 0 ? Array.from(anchoredTypes) : undefined;
    runOptimizationWithComparison(currentBuild, currentAllocations, '默认场景', anchoredArr);
  }, [currentBuild, currentAllocations, anchoredTypes, runOptimizationWithComparison]);

  const handleIdealTemplate = useCallback(() => {
    if (!currentBuild) return;
    removeResultSections();
    const idx = insertResultSection('理想模板');
    setResultLabels((prev) => ({ ...prev, [`result_${idx}`]: '理想模板' }));
  }, [currentBuild, insertResultSection, removeResultSections]);

  const handleRunIdeal = useCallback(() => {
    if (!currentBuild) return;
    const anchoredAllocs = idealAnchors.size > 0
      ? Array.from(idealAnchors.entries()).map(([type, rolls]) => ({ type, rolls }))
      : undefined;
    runIdealTemplate(currentBuild.character, idealRollCount, currentBuild.skillMultiplier, currentBuild.reactionType, currentBuild, anchoredAllocs, searchMainStats);
  }, [currentBuild, idealRollCount, searchMainStats, idealAnchors, runIdealTemplate]);

  // ---- Render sections ----
  const renderSection = useCallback((section: WizardSection): React.ReactNode => {
    const s = String(section);
    if (s.startsWith('result_')) {
      return (
        <ResultSection
          section={s} resultLabels={resultLabels}
          damageResult={damageResult} computedStats={computedStats}
          isCalculating={isCalculating}
          idealRollCount={idealRollCount} idealRollText={idealRollText}
          setIdealRollText={setIdealRollText} setIdealRollCount={setIdealRollCount}
          idealAvailableTypes={idealAvailableTypes}
          idealAnchors={idealAnchors} idealInputs={idealInputs}
          handleIdealPinToggle={handleIdealPinToggle}
          handleIdealInputChange={handleIdealInputChange}
          handleRunIdeal={handleRunIdeal}
          currentAllocations={currentAllocations} anchoredTypes={anchoredTypes}
          toggleAnchor={toggleAnchor} handleRunRedistribute={handleRunRedistribute}
        />
      );
    }
    switch (s) {
      case 'import': return <ImportSection />;
      case 'character': return <CharacterSection characterLevel={characterLevel} setCharacterLevel={setCharacterLevel} onSelectCharacter={handleSelectCharacter} />;
      case 'weapon': return <WeaponSection onSelectWeapon={handleSelectWeapon} />;
      case 'artifacts': return <ArtifactSection importedSetNames={importedSetNames} importedSetCounts={importedSetCounts} />;
      case 'talents': return <TalentSection />;
      case 'teambuffs': return <TeambuffSection teamBuffConfig={teamBuffConfig} setTeamBuffConfig={setTeamBuffConfig} laumaCons={laumaCons} setLaumaCons={setLaumaCons} laumaEM={laumaEM} setLaumaEM={setLaumaEM} reactionType={reactionType} />;
      case 'scenario': return <ScenarioSection customScaling={customScaling} setCustomScaling={setCustomScaling} scalingEntries={scalingEntries} reactionOptions={reactionOptions} reactIdx={reactIdx} handleReactionChange={handleReactionChange} reactionType={reactionType} />;
      default: return <Typography color="text.secondary">未知板块</Typography>;
    }
  }, [resultLabels, damageResult, computedStats, isCalculating, idealRollCount, idealRollText, idealAvailableTypes, idealAnchors, idealInputs, handleIdealPinToggle, handleIdealInputChange, handleRunIdeal, currentAllocations, anchoredTypes, toggleAnchor, handleRunRedistribute, characterLevel, setCharacterLevel, handleSelectCharacter, handleSelectWeapon, importedSetNames, importedSetCounts, teamBuffConfig, setTeamBuffConfig, laumaCons, laumaEM, reactionType, customScaling, scalingEntries, reactionOptions, reactIdx, handleReactionChange]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <>
      {/* 海面背景 — 必须在最外层，否则被 bgcolor 遮盖 */}
      <Box sx={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          linear-gradient(180deg,
            rgba(11,20,36,0) 0%,
            rgba(30,60,90,0.12) 40%,
            rgba(45,90,130,0.2) 70%,
            rgba(60,120,160,0.22) 85%,
            rgba(80,150,180,0.18) 95%,
            rgba(100,170,200,0.14) 100%
          )
        `,
      }}>
        <Box sx={{
          position: 'absolute', inset: 0,
          background: `
            linear-gradient(180deg,
              rgba(11,20,36,0) 30%,
              rgba(20,50,80,0.16) 60%,
              rgba(40,80,120,0.26) 80%,
              rgba(70,130,170,0.22) 92%,
              rgba(90,160,190,0.14) 100%
            )
          `,
          animation: 'waveShift 8s ease-in-out 1s infinite reverse',
        }} />
        {['10%','22%','35%','48%','58%','68%','78%','88%'].map((left, i) => (
          <Box key={i} sx={{
            position: 'absolute', bottom: -20, left, zIndex: 0,
            width: ([14,10,22,14,18,8,16,10] as number[])[i], height: ([14,10,22,14,18,8,16,10] as number[])[i],
            borderRadius: '50%', bgcolor: 'transparent',
            border: '1.5px solid rgba(130,200,230,0.2)',
            animation: `bubbleRise ${([8,9,7,10,8.5,9.5,7.5,9] as number[])[i]}s ${([0,1.5,0.8,3,2,4,1,2.5] as number[])[i]}s linear infinite`,
          }} />
        ))}
      </Box>

      <Box sx={{ position: 'relative', width: '100vw', height: '100vh', bgcolor: 'transparent' }}>
      <LoadingOverlay visible={isCalculating || isCharLoading} progress={isCalculating ? progress : undefined} message={isCalculating ? '正在计算…' : '正在加载…'} />
      <StickerThrower characterName={selectedCharacter?.nameZh ?? null} />
      <Box sx={{ position: 'fixed', top: { xs: 8, md: 16 }, left: { xs: 8, md: 16 }, zIndex: 20, display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 1 } }}>
        <IconButton onClick={exitWizard} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}><ArrowBackIcon /></IconButton>
        <Button variant="outlined" size="small" onClick={saveCurrent} sx={{ fontSize: { xs: '0.65rem', md: '0.75rem' }, px: { xs: 1, md: 2 } }}>保存配置</Button>
        <Button variant="outlined" size="small" onClick={() => setSaveManagerOpen(true)} sx={{ fontSize: { xs: '0.65rem', md: '0.75rem' }, px: { xs: 1, md: 2 } }}>添加配置</Button>
      </Box>
      {!isMobile && <SectionStepper resultLabels={resultLabels} />}
      <Box sx={{ position: 'absolute', left: { xs: 0, md: 64 }, top: 0, right: { xs: 0, md: 280 }, bottom: { xs: 130, md: 0 }, animation: 'fadeInUp 400ms 100ms cubic-bezier(0.16,1,0.3,1) both', '@keyframes fadeInUp': { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}><SectionRoller renderSection={renderSection} /></Box>
      <Box sx={{ position: 'fixed', bottom: { xs: 72, md: 24 }, right: { xs: 8, sm: 24 }, zIndex: 20, display: 'flex', gap: { xs: 0.5, md: 1.5 }, bgcolor: 'rgba(15,22,41,0.75)', backdropFilter: 'blur(8px) saturate(120%)', WebkitBackdropFilter: 'blur(8px) saturate(120%)', borderRadius: 2, p: { xs: 0.75, md: 1 }, border: '1px solid rgba(255,255,255,0.08)' }}>
        <Button variant="outlined" disabled={currentIndex === 0} onClick={() => goToSection(currentIndex - 1)} sx={{ px: { xs: 1.5, md: 3 }, py: { xs: 0.5, md: 1 }, fontSize: { xs: '0.8rem', md: '0.9rem' }, minWidth: 0 }}>上一步</Button>
        {currentIndex < sections.length - 1 && <Button variant="contained" onClick={nextSectionFn} sx={{ px: { xs: 1.5, md: 3 }, py: { xs: 0.5, md: 1 }, fontSize: { xs: '0.8rem', md: '0.9rem' }, minWidth: 0 }}>下一步</Button>}
      </Box>
      {isMobile ? (
        <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 15, p: 1.5, bgcolor: 'rgba(15,22,41,0.92)', backdropFilter: 'blur(16px) saturate(120%)', WebkitBackdropFilter: 'blur(16px) saturate(120%)', borderTop: '1px solid rgba(255,255,255,0.12)', animation: 'fadeIn 300ms cubic-bezier(0.16,1,0.3,1)', '@keyframes fadeIn': { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>
          <CharacterStatPanel stats={computedStats} showActions onCalcDamage={handleCalcDamage} onRedistribute={handleRedistribute} onIdealTemplate={handleIdealTemplate} compact />
        </Box>
      ) : (
        <Box sx={{ position: 'fixed', top: 56, right: 16, width: 248, zIndex: 5, maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}>
          <CharacterStatPanel stats={computedStats} showActions onCalcDamage={handleCalcDamage} onRedistribute={handleRedistribute} onIdealTemplate={handleIdealTemplate} />
        </Box>
      )}
      <SaveManager open={saveManagerOpen} onClose={() => setSaveManagerOpen(false)} />
      <Box sx={{ position: 'fixed', bottom: { xs: 4, md: 8 }, left: { xs: 8, md: 16 }, zIndex: 5, pointerEvents: 'none' }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.18)', fontSize: { xs: '0.55rem', md: '0.65rem' } }}>
          数据来源：genshin-db · Enka Network API
        </Typography>
      </Box>
    </Box>
    </>
  );
}

export default WizardPage;

