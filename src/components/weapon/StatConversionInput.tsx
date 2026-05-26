import React, { useState, useCallback, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Paper from '@mui/material/Paper';
import { useCharacterStore } from '../../store/slices/characterSlice';
import type { StatConversion } from '../../types';

/** 源属性标签映射。 */
const FROM_LABELS: Record<StatConversion['from'], string> = {
  totalAtk: '攻击力 (ATK)',
  totalHp: '生命值上限 (HP)',
  totalDef: '防御力 (DEF)',
  em: '元素精通 (EM)',
  er: '充能效率 (ER%)',
};

/** 目标属性标签映射。 */
const TO_LABELS: Record<StatConversion['to'], string> = {
  totalAtk: '攻击力 (ATK)',
  totalHp: '生命值上限 (HP)',
  totalDef: '防御力 (DEF)',
  dmgBonus: '伤害加成 (DMG%)',
  critRate: '暴击率 (CR%)',
  critDmg: '暴击伤害 (CD%)',
  baseDamageFlat: '基础伤害 (固定值)',
};

/** 源属性所有可选值。 */
const FROM_OPTIONS: StatConversion['from'][] = ['totalHp', 'totalAtk', 'totalDef', 'em', 'er'];

/** 目标属性所有可选值。 */
const TO_OPTIONS: StatConversion['to'][] = ['totalHp', 'totalAtk', 'totalDef', 'dmgBonus', 'critRate', 'critDmg'];

/** 比例 placeholder 提示。 */
function getRatioPlaceholder(to: StatConversion['to']): string {
  switch (to) {
    case 'totalAtk': case 'totalHp': case 'totalDef': return '例: 0.52';
    case 'dmgBonus': return '例: 0.14';
    case 'critRate': case 'critDmg': return '例: 0.12';
    case 'baseDamageFlat': return '例: 1.0';
  }
}

/**
 * StatConversionInput — 属性转模规则输入组件。
 *
 * 用户选择"源属性 → 目标属性 + 比例"，系统在第一轮属性计算后
 * 自动将 源值 × 比例 叠加到目标属性上（第二轮计算）。
 *
 * 性能说明：比例输入使用局部状态（仅失焦时提交 store），
 * 避免每次击键触发级联重渲染。
 */
function StatConversionInput(): React.ReactElement {
  const { statConversions, addStatConversion, removeStatConversion } = useCharacterStore();

  // 局部比例值（String，避免击键 parseFloat）
  const [localRatios, setLocalRatios] = useState<Record<number, string>>({});

  // 索引计数器（用于 key 稳定性）
  const nextIdx = useRef(0);
  const [rowKeys, setRowKeys] = useState<number[]>([]);

  // 当 store 的 statConversions 长度变化时，同步局部状态
  useEffect(() => {
    if (statConversions.length === rowKeys.length) return;
    if (statConversions.length > rowKeys.length) {
      const keys: number[] = [];
      for (let i = 0; i < statConversions.length; i++) {
        if (i < rowKeys.length) {
          keys.push(rowKeys[i]);
        } else {
          keys.push(nextIdx.current++);
        }
      }
      setRowKeys(keys);
    } else {
      setRowKeys(rowKeys.slice(0, statConversions.length));
    }
  }, [statConversions.length]);

  // 提交一条转模到 store
  const commitConv = useCallback((index: number, conv: StatConversion) => {
    const updated = [...statConversions];
    updated[index] = conv;
    (useCharacterStore as any).setState({ statConversions: updated, isResultExpired: true });
  }, [statConversions]);

  // 删除
  const handleRemove = useCallback((index: number) => {
    removeStatConversion(index);
    setLocalRatios((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }, [removeStatConversion]);

  // 添加
  const handleAdd = useCallback(() => {
    addStatConversion({ from: 'em', to: 'totalAtk', ratio: 0.52 });
  }, [addStatConversion]);

  // Select 变更（立即提交）
  const handleFromChange = useCallback((index: number, value: string) => {
    if (!(FROM_OPTIONS as string[]).includes(value)) return;
    commitConv(index, { ...statConversions[index], from: value as StatConversion['from'] });
  }, [statConversions, commitConv]);

  const handleToChange = useCallback((index: number, value: string) => {
    if (!(TO_OPTIONS as string[]).includes(value)) return;
    commitConv(index, { ...statConversions[index], to: value as StatConversion['to'] });
  }, [statConversions, commitConv]);

  // 比例输入（仅局部更新，失焦才提交）
  const handleRatioChange = useCallback((index: number, raw: string) => {
    setLocalRatios((prev) => ({ ...prev, [index]: raw }));
  }, []);

  const handleRatioBlur = useCallback((index: number) => {
    const raw = localRatios[index];
    if (raw === undefined) return;
    const v = parseFloat(raw);
    if (isNaN(v) || v < 0) return;
    commitConv(index, { ...statConversions[index], ratio: v });
  }, [localRatios, statConversions, commitConv]);

  const handleRatioKeyDown = useCallback((e: React.KeyboardEvent, _index: number) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  }, []);

  // 获取当前显示的 ratio 值
  const getRatioValue = useCallback((index: number): string => {
    if (localRatios[index] !== undefined) return localRatios[index];
    return String(statConversions[index]?.ratio ?? '');
  }, [localRatios, statConversions]);

  return (
    <Paper sx={{ p: 2, mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ color: 'primary.main' }}>
          属性转模（基于面板值的映射计算）
        </Typography>
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={handleAdd}>
          添加
        </Button>
      </Box>

      {statConversions.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
          暂无转模规则。例：赤沙之杖 "将 52% 元素精通转为攻击力"。
        </Typography>
      )}

      {statConversions.map((conv, i) => (
        <Box
          key={rowKeys[i] ?? i}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap',
            p: 0.75, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.02)',
          }}
        >
          <Select
            size="small"
            value={conv.from}
            onChange={(e) => handleFromChange(i, e.target.value)}
            sx={{ minWidth: 130 }}
          >
            {FROM_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>{FROM_LABELS[opt]}</MenuItem>
            ))}
          </Select>

          <ArrowForwardIcon sx={{ color: 'text.secondary', fontSize: 18 }} />

          <Select
            size="small"
            value={conv.to}
            onChange={(e) => handleToChange(i, e.target.value)}
            sx={{ minWidth: 140 }}
          >
            {TO_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>{TO_LABELS[opt]}</MenuItem>
            ))}
          </Select>

          <TextField
            size="small"
            type="number"
            slotProps={{
              htmlInput: { step: 0.001, min: 0, max: 100 },
            }}
            value={getRatioValue(i)}
            onChange={(e) => handleRatioChange(i, e.target.value)}
            onBlur={() => handleRatioBlur(i)}
            onKeyDown={(e) => handleRatioKeyDown(e, i)}
            placeholder={getRatioPlaceholder(conv.to)}
            sx={{ width: 110 }}
          />

          <Typography variant="caption" color="text.secondary">×</Typography>

          <IconButton size="small" onClick={() => handleRemove(i)} color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}

      {statConversions.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
          这些映射将在第一轮计算完成后自动叠加到面板上。
        </Typography>
      )}
    </Paper>
  );
}

export default StatConversionInput;