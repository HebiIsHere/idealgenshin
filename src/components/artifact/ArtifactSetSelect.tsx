import React, { useState, useMemo, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import { getAllArtifactSets, searchArtifactSets } from '../../data/artifacts';
import type { ArtifactSetData, StatConversion, ZoneBonusInput } from '../../types';
import { useCharacterStore } from '../../store/slices/characterSlice';

interface Props {
  importedSetNames?: string[];
  /** 套装名 → 件数映射，用于推导 4件套/2+2/散搭模式 */
  importedSetCounts?: Record<string, number>;
}

/** 套装组合模式 */
type SetMode = 'none' | '4pc' | '2+2';

/**
 * ArtifactSetSelect — 圣遗物套装选择。
 *
 * 规则：5 个圣遗物部位，仅支持三种组合：
 * - 4件套（1 套 ×4 + 1 散件）
 * - 2+2（2 套 ×2 + 1 散件）
 * - 散搭（无套装加成）
 */
function ArtifactSetSelect({ importedSetNames = [], importedSetCounts = {} }: Props): React.ReactElement {
  const allSets = useMemo(() => getAllArtifactSets(), []);
  const { setSetBonus, setSetConversions } = useCharacterStore();
  const [mode, setMode] = useState<SetMode>('none');

  // 套装A（4件套时的唯一套装，或2+2时的第一套）
  const [setA, setSetA] = useState<ArtifactSetData | null>(null);
  // 套装B（仅2+2时使用）
  const [setB, setSetB] = useState<ArtifactSetData | null>(null);

  // 标记：用户是否已手动修改过选择（防止 auto-detect 覆盖手动选择）
  const userTouchedRef = useRef(false);
  // 标记：上次自动检测的 Enka 数据签名（防止相同数据重复触发）
  const lastAutoSigRef = useRef('');

  // 从所有套装中匹配已导入的套装名（仅含 ≥2 件的套装，散件不显示）
  const importedSets = useMemo(() => {
    if (importedSetNames.length === 0) return [];
    return importedSetNames
      .map(name => searchArtifactSets(name)[0])
      .filter((set): set is ArtifactSetData => !!set && (importedSetCounts[set.nameZh] || 0) >= 2);
  }, [importedSetNames, importedSetCounts]);

  // 仅在 Enka 导入后自动检测一次；新数据导入时重新检测
  useEffect(() => {
    const entries = Object.entries(importedSetCounts).sort(([,a], [,b]) => b - a);
    if (entries.length === 0) return;
    
    // 用 count 签名判断是否同一批数据已处理过
    const sig = entries.map(([k, v]) => `${k}:${v}`).join('|');
    if (sig === lastAutoSigRef.current) return;
    // 新数据 → 重置手动标记，允许自动检测
    userTouchedRef.current = false;
    lastAutoSigRef.current = sig;

    const [mainName, mainCount] = entries[0];
    const secondName = entries[1]?.[0];
    const secondCount = entries[1]?.[1] || 0;
    
    if (mainCount >= 4) {
      setMode('4pc');
      setSetA(importedSets.find(s => s.nameZh === mainName) || null);
      setSetB(null);
    } else if (mainCount >= 2 && secondCount >= 2) {
      setMode('2+2');
      setSetA(importedSets.find(s => s.nameZh === mainName) || null);
      setSetB(importedSets.find(s => s.nameZh === secondName) || null);
    } else if (mainCount >= 2) {
      setMode('4pc');
      setSetA(importedSets.find(s => s.nameZh === mainName) || null);
      setSetB(null);
    }
  }, [importedSetCounts, importedSets]);

  // 切换模式时标记用户手动操作
  const handleModeChange = (newMode: SetMode) => {
    userTouchedRef.current = true;
    setMode(newMode);
    if (newMode === '4pc') setSetB(null);
    if (newMode === 'none') { setSetA(null); setSetB(null); }
  };

  // 套装选择变化时，自动将静态加成写入 store
  useEffect(() => {
    const bonus: ZoneBonusInput = {};
    const merge = (s: Partial<ZoneBonusInput> | undefined) => {
      if (!s) return;
      for (const [k, v] of Object.entries(s)) {
        (bonus as any)[k] = ((bonus as any)[k] ?? 0) + (v as number);
      }
    };
    if (mode === '4pc' && setA) {
      merge(setA.twoPcBonus);
      merge(setA.fourPcBonus);
    } else if (mode === '2+2' && setA && setB) {
      merge(setA.twoPcBonus);
      merge(setB.twoPcBonus);
    }
    setSetBonus(bonus);
  }, [mode, setA, setB, setSetBonus]);

  // 套装选择变化时，自动生成动态转模（如绝缘之旗印 ER→dmgBonus）
  useEffect(() => {
    const convs: StatConversion[] = [];
    if (mode === '4pc') {
      // 4件套：同时触发 2件套和 4件套的动态转模
      if (setA?.twoPcDynamic) convs.push(setA.twoPcDynamic);
      if (setA?.fourPcDynamic) convs.push(setA.fourPcDynamic);
    } else if (mode === '2+2') {
      // 2+2：仅触发 2件套的动态转模
      if (setA?.twoPcDynamic) convs.push(setA.twoPcDynamic);
      if (setB?.twoPcDynamic) convs.push(setB.twoPcDynamic);
    }
    setSetConversions(convs);
  }, [mode, setA, setB, setSetConversions]);

  // 过滤已选套装
  const filteredSets = (exclude: ArtifactSetData | null) =>
    allSets.filter(s => !exclude || s.id !== exclude.id);

  const showEffect = (set: ArtifactSetData, piece: 2 | 4) => (
    <Box sx={{ p: 1.5, bgcolor: 'rgba(212, 168, 67, 0.08)', borderRadius: 1, border: '1px solid rgba(212, 168, 67, 0.12)', flex: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main', mb: 0.5 }}>
        {set.nameZh}（{piece}件套）
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {piece === 2 ? set.twoPcEffect : set.fourPcEffect}
      </Typography>
    </Box>
  );

  return (
    <Box>
      {/* === Enka 导入的套装效果 === */}
      {importedSets.length > 0 && (
        <Box sx={{ mb: 2 }}>
          {importedSets.map((set) => {
            const count = importedSetCounts[set.nameZh] || 0;
            const has4pc = count >= 4;
            return (
            <Box key={set.id} sx={{ mb: 1.5, p: 1.5, bgcolor: 'rgba(76, 175, 80, 0.06)', borderRadius: 1, border: '1px solid rgba(76, 175, 80, 0.15)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Chip label="Enka" size="small" color="success" sx={{ fontSize: '0.65rem', height: 20 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>{set.nameZh}</Typography>
                <Chip
                  label={has4pc ? `×${count}` : `×${count}`}
                  size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ pl: 1 }}>🔹 2件套：{set.twoPcEffect}</Typography>
              {has4pc && (
                <Typography variant="body2" color="text.secondary" sx={{ pl: 1 }}>🔸 4件套：{set.fourPcEffect}</Typography>
              )}
            </Box>
          )})}
        </Box>
      )}

      {/* === 手动配置套装组合 === */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
          {importedSets.length > 0 ? '手动覆盖套装组合' : '套装组合'}
        </Typography>

        {/* 模式选择 */}
        <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
          {([
            ['none', '散搭'],
            ['4pc', '4件套'],
            ['2+2', '2+2'],
          ] as const).map(([key, label]) => (
            <Chip
              key={key}
              label={label}
              color={mode === key ? 'primary' : 'default'}
              variant={mode === key ? 'filled' : 'outlined'}
              onClick={() => handleModeChange(key)}
              size="small"
            />
          ))}
        </Box>

        {/* 4件套模式 — 选一个套装 */}
        {mode === '4pc' && (
          <Box>
            <Autocomplete
              options={filteredSets(null)}
              getOptionLabel={o => `${o.nameZh} (${o.name})`}
              value={setA}
              onChange={(_, v) => { userTouchedRef.current = true; setSetA(v); }}
              size="small"
              renderInput={p => <TextField {...p} label="4件套" />}
              isOptionEqualToValue={(o, v) => o.id === v.id}
            />
            {setA && (
              <Box sx={{ mt: 2, display: 'flex', gap: 1.5 }}>
                {showEffect(setA, 2)}
                {showEffect(setA, 4)}
              </Box>
            )}
          </Box>
        )}

        {/* 2+2模式 — 选两个不同套装 */}
        {mode === '2+2' && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              套装 A（2件）
            </Typography>
            <Autocomplete
              options={filteredSets(setB)}
              getOptionLabel={o => `${o.nameZh} (${o.name})`}
              value={setA}
              onChange={(_, v) => { userTouchedRef.current = true; setSetA(v); }}
              size="small"
              renderInput={p => <TextField {...p} label="选择套装 A" />}
              isOptionEqualToValue={(o, v) => o.id === v.id}
            />

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, mb: 0.5, display: 'block' }}>
              套装 B（2件）
            </Typography>
            <Autocomplete
              options={filteredSets(setA)}
              getOptionLabel={o => `${o.nameZh} (${o.name})`}
              value={setB}
              onChange={(_, v) => { userTouchedRef.current = true; setSetB(v); }}
              size="small"
              renderInput={p => <TextField {...p} label="选择套装 B" />}
              isOptionEqualToValue={(o, v) => o.id === v.id}
            />

            {setA && setB && (
              <Box sx={{ mt: 2, display: 'flex', gap: 1.5 }}>
                {showEffect(setA, 2)}
                {showEffect(setB, 2)}
              </Box>
            )}
            {setA && !setB && (
              <Box sx={{ mt: 2 }}>{showEffect(setA, 2)}</Box>
            )}
          </Box>
        )}

        {/* 散搭 — 无套装效果 */}
        {mode === 'none' && (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            未选择套装 — 不触发任何套装效果
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default ArtifactSetSelect;
