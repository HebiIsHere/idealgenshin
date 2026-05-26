import React from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import BonusRow from '../common/BonusRow';
import StatConversionInput from './StatConversionInput';
import { useCharacterStore } from '../../store/slices/characterSlice';
import type { ZoneBonusInput } from '../../types';

/**
 * Render a description string, highlighting numeric values that differ from the R1 baseline.
 */
function highlightDesc(current: string, base: string): React.ReactNode {
  if (!current || !base || current === base) return current;

  const NUM_RE = /[\d.]+%?/g;
  const baseNums: string[] = [];
  for (const m of base.matchAll(NUM_RE)) baseNums.push(m[0]);

  const currMatches = [...current.matchAll(NUM_RE)];
  const segments: React.ReactNode[] = [];
  let cursor = 0;

  currMatches.forEach((match, i) => {
    const start = match.index!;
    const raw = match[0];

    if (start > cursor) {
      segments.push(current.substring(cursor, start));
    }

    const changed = i < baseNums.length && raw !== baseNums[i];
    if (changed) {
      segments.push(
        <Box
          component="span"
          key={start}
          sx={{ color: 'warning.main', fontWeight: 700 }}
        >
          {raw}
        </Box>,
      );
    } else {
      segments.push(raw);
    }

    cursor = start + raw.length;
  });

  if (cursor < current.length) {
    segments.push(current.substring(cursor));
  }

  return segments;
}

/**
 * WeaponPassiveInput — 武器被动效果展示与模拟组件。
 * - 展示精炼对应的被动描述（变化数值高亮）
 * - 被动效果模拟：手动填入各乘区实际加成数值
 * - 属性转模输入
 */
function WeaponPassiveInput(): React.ReactElement {
  const { weaponConfig, setWeaponPassiveBonus } = useCharacterStore();

  const passiveName = weaponConfig?.weaponData.passiveName ?? '';
  const refinement = weaponConfig?.refinement ?? 1;
  const refinements = weaponConfig?.weaponData.refinements;

  // 当前精炼等级的描述，变化数值高亮
  const currentDesc = refinements?.[refinement - 1]?.description ?? '';
  const baseDesc = refinements?.[0]?.description ?? '';

  // 被动加成
  const pb = weaponConfig?.passiveBonus ?? ({} as ZoneBonusInput);
  const setPb = (patch: Partial<ZoneBonusInput>) => {
    setWeaponPassiveBonus({ ...(weaponConfig?.passiveBonus ?? {}), ...patch } as ZoneBonusInput);
  };

  // 仅当用户已设置时显示数值，否则留空（避免无法删除的 0）
  const showPct = (key: keyof ZoneBonusInput) => {
    const v = pb[key] as number | undefined;
    return v ? Number((v * 100).toFixed(4)) : undefined;
  };
  const showNum = (key: keyof ZoneBonusInput) => {
    const v = pb[key] as number | undefined;
    return v ? Number(v.toFixed(4)) : undefined;
  };
  const setPct = (key: keyof ZoneBonusInput) => (v: number) => {
    setPb({ [key]: v / 100 } as Partial<ZoneBonusInput>);
  };
  const setFlat = (key: keyof ZoneBonusInput) => (v: number) => {
    setPb({ [key]: v } as Partial<ZoneBonusInput>);
  };

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1, color: 'primary.main', fontSize: '0.9rem' }}>
        武器被动效果
      </Typography>

      {passiveName && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {passiveName}
          </Typography>
          <Chip
            label={`R${refinement}`}
            size="small"
            color="primary"
            sx={{ fontSize: '0.65rem', height: 20 }}
          />
        </Box>
      )}

      {currentDesc && (
        <Box
          sx={{
            mb: 1.5,
            p: 1,
            borderRadius: 1,
            bgcolor: 'rgba(255,255,255,0.04)',
            borderLeft: '3px solid',
            borderColor: 'primary.main',
          }}
        >
          <Typography variant="caption" sx={{ lineHeight: 1.5, color: 'rgba(255,255,255,0.7)' }}>
            {highlightDesc(currentDesc, baseDesc)}
          </Typography>
          {refinement > 1 && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'warning.main', lineHeight: 1.4 }}>
              ⬆ 高亮数值为相较 R1 的变化
            </Typography>
          )}
        </Box>
      )}

      {!currentDesc && (
        <Typography variant="body2" sx={{ mb: 1.5, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
          该武器为低星武器，无被动效果，可直接填写下方模拟数值
        </Typography>
      )}

      <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.06)' }} />

      <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>
        被动效果模拟
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'rgba(255,255,255,0.35)' }}>
        根据被动描述，手动填入各乘区实际加成数值
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 0.5 }}>
        <BonusRow label="攻击力%" value={showPct('atkPercent')} onChange={setPct('atkPercent')} hint="%" />
        <BonusRow label="防御力%" value={showPct('defPercent')} onChange={setPct('defPercent')} hint="%" />
        <BonusRow label="生命值%" value={showPct('hpPercent')} onChange={setPct('hpPercent')} hint="%" />
        <BonusRow label="攻击力" value={showNum('atkFlat')} onChange={setFlat('atkFlat')} hint="固定值" />
        <BonusRow label="防御力" value={showNum('defFlat')} onChange={setFlat('defFlat')} hint="固定值" />
        <BonusRow label="生命值" value={showNum('hpFlat')} onChange={setFlat('hpFlat')} hint="固定值" />
        <BonusRow label="增伤区" value={showPct('dmgBonus')} onChange={setPct('dmgBonus')} hint="%" />
        <BonusRow label="精通区" value={showNum('elementalMastery')} onChange={setFlat('elementalMastery')} hint="EM" />
        <BonusRow label="暴击率" value={showPct('critRate')} onChange={setPct('critRate')} hint="%" />
        <BonusRow label="暴击伤害" value={showPct('critDmg')} onChange={setPct('critDmg')} hint="%" />
        <BonusRow label="羽毛附伤" value={showNum('featherFlat')} onChange={setFlat('featherFlat')} hint="固定值" />
      </Box>

      <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.06)' }} />

      <StatConversionInput />
    </Box>
  );
}

export default WeaponPassiveInput;
