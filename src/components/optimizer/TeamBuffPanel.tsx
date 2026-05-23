import React, { useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Autocomplete from '@mui/material/Autocomplete';
import Grid from '@mui/material/Grid2';
import Divider from '@mui/material/Divider';

import supportBuffs from '../../data/support_buffs.json';
import supportArtifacts from '../../data/support_artifacts.json';
import elementalResonance from '../../data/elemental_resonance.json';
import type { ZoneBonusInput } from '../../types';

/** Support character descriptor. */
interface SupportEntry {
  id?: string;
  name: string;
  nameEn: string;
  rarity: number;
  element: string;
  buffs: Partial<ZoneBonusInput>;
}

/** Artifact set descriptor. */
interface ArtifactEntry {
  id?: string;
  name: string;
  nameEn: string;
  rarity: number;
  buffs: Partial<ZoneBonusInput>;
}

/** Resonance entry. */
interface ResonanceEntry {
  id?: string;
  name: string;
  desc: string;
  buffs?: Partial<ZoneBonusInput>;
}

/** Props. */
export interface TeamBuffConfig {
  supportIds: string[];
  artifactIds: string[];
  resonanceId: string;
  moonsignEnabled: boolean;
  moonsignBonus: number;
  customBuffs: Partial<ZoneBonusInput>;
}

export function defaultTeamBuffConfig(): TeamBuffConfig {
  return {
    supportIds: [],
    artifactIds: [],
    resonanceId: '',
    moonsignEnabled: false,
    moonsignBonus: 0.36,
    customBuffs: {},
  };
}

/** Compute the combined ZoneBonusInput from all team buff sources. */
export function computeTeamBuffBonuses(config: TeamBuffConfig): ZoneBonusInput {
  const result: ZoneBonusInput = {};

  // 1) Support characters
  for (const id of config.supportIds) {
    const s = (supportBuffs as Record<string, SupportEntry>)[id];
    if (!s) continue;
    mergeInto(result, s.buffs);
  }

  // 2) Artifact sets
  for (const id of config.artifactIds) {
    const a = (supportArtifacts as Record<string, ArtifactEntry>)[id];
    if (!a) continue;
    mergeInto(result, a.buffs);
  }

  // 3) Elemental resonance
  if (config.resonanceId) {
    const r = (elementalResonance as Record<string, ResonanceEntry>)[config.resonanceId];
    if (r?.buffs) mergeInto(result, r.buffs);
  }

  // 4) Moonsign — 反应区加成（非擢升乘区）
  if (config.moonsignEnabled) {
    result.moonReactionBonus = (result.moonReactionBonus ?? 0) + (config.moonsignBonus ?? 0.36);
  }

  // 5) Custom
  mergeInto(result, config.customBuffs);

  return result;
}

function mergeInto(target: ZoneBonusInput, source: Partial<ZoneBonusInput>) {
  const keys = Object.keys(source) as (keyof ZoneBonusInput)[];
  for (const k of keys) {
    if (k === 'defReductions') {
      const src = source.defReductions ?? [];
      target.defReductions = [...(target.defReductions ?? []), ...src];
    } else {
      const val = source[k] as number;
      const cur = (target[k] as number) ?? 0;
      target[k] = (cur + val) as any;
    }
  }
}

// ===== Component =====

interface TeamBuffPanelProps {
  config: TeamBuffConfig;
  onChange: (config: TeamBuffConfig) => void;
}

function TeamBuffPanel({ config, onChange }: TeamBuffPanelProps): React.ReactElement {
  const supports = useMemo(() => Object.entries(supportBuffs).map(([id, s]) => ({ id, ...s } as SupportEntry)), []);
  const artifacts = useMemo(() => Object.entries(supportArtifacts).map(([id, a]) => ({ id, ...a } as ArtifactEntry)), []);
  const resonances = useMemo(() => Object.entries(elementalResonance).map(([id, r]) => ({ id, ...r } as ResonanceEntry)), []);

  const update = useCallback((patch: Partial<TeamBuffConfig>) => {
    onChange({ ...config, ...patch });
  }, [config, onChange]);

  // Custom buff fields that can be manually input
  const customFields: { key: keyof ZoneBonusInput; label: string; step: number }[] = [
    { key: 'atkPercent', label: '攻击力%', step: 0.01 },
    { key: 'atkFlat', label: '攻击力（数值）', step: 1 },
    { key: 'dmgBonus', label: '增伤%', step: 0.01 },
    { key: 'critRate', label: '暴击率%', step: 0.01 },
    { key: 'critDmg', label: '暴击伤害%', step: 0.01 },
    { key: 'elementalMastery', label: '元素精通', step: 1 },
    { key: 'resistReduction', label: '减抗%', step: 0.01 },
    { key: 'moonReactionBonus', label: '月反应增伤%', step: 0.01 },
    { key: 'independentBonus', label: '独立乘区%', step: 0.01 },
    { key: 'elevationBonus', label: '擢升乘区%', step: 0.01 },
  ];

  return (
    <Accordion defaultExpanded={false} disableGutters elevation={0}
      sx={{ '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2, minHeight: 40 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
          🛡️ 队伍 Buff（辅助 / 圣遗物 / 共鸣 / 月曜 / 自定义）
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* ===== 1. 辅助角色选择 ===== */}
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
              ① 辅助角色（可多选）
            </Typography>
            <Autocomplete
              multiple
              size="small"
              options={supports}
              getOptionLabel={(o) => `${'★'.repeat(o.rarity)} ${o.name}`}
              value={supports.filter((s) => s.id && config.supportIds.includes(s.id))}
              onChange={(_, vals) => update({ supportIds: vals.map((v) => v.id!).filter(Boolean) })}
              renderTags={(selected, getTagProps) =>
                selected.map((s, idx) => {
                  const { key, ...rest } = getTagProps({ index: idx });
                  return <Chip key={s.id} label={s.name} size="small" {...rest} />;
                })
              }
              renderInput={(params) => <TextField {...params} label="选择辅助角色" />}
              filterOptions={(x) => x}
              clearOnBlur={false}
            />
          </Box>

          <Divider />

          {/* ===== 2. 辅助圣遗物 ===== */}
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
              ② 辅助圣遗物（可多选）
            </Typography>
            <Autocomplete
              multiple
              size="small"
              options={artifacts}
              getOptionLabel={(o) => `[${o.rarity}★] ${o.name}`}
              value={artifacts.filter((a) => a.id && config.artifactIds.includes(a.id))}
              onChange={(_, vals) => update({ artifactIds: vals.map((v) => v.id!).filter(Boolean) })}
              renderTags={(selected, getTagProps) =>
                selected.map((a, idx) => {
                  const { key, ...rest } = getTagProps({ index: idx });
                  return <Chip key={a.id} label={a.name} size="small" {...rest} />;
                })
              }
              renderInput={(params) => <TextField {...params} label="选择辅助圣遗物" />}
              filterOptions={(x) => x}
              clearOnBlur={false}
            />
          </Box>

          <Divider />

          {/* ===== 3. 元素共鸣 ===== */}
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
              ③ 元素共鸣
            </Typography>
            <FormControl size="small" fullWidth>
              <InputLabel>共鸣类型</InputLabel>
              <Select
                value={config.resonanceId}
                label="共鸣类型"
                onChange={(e) => update({ resonanceId: e.target.value })}
              >
                <MenuItem value="">无</MenuItem>
                {resonances.map((r) => (
                  <MenuItem key={r.id} value={r.id}>{r.name} — {r.desc}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Divider />

          {/* ===== 4. 月曜加成 ===== */}
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
              ④ 月曜加成（满辉）
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={config.moonsignEnabled}
                  onChange={(e) => update({ moonsignEnabled: e.target.checked })}
                />
              }
              label="启用满辉月曜加成（反应区，非擢升）"
            />
            <TextField
              size="small"
              type="number"
              label="月曜反应增伤%"
              value={config.moonsignBonus * 100}
              onChange={(e) => update({ moonsignBonus: Math.max(0, Math.min(1, Number(e.target.value) / 100)) })}
              disabled={!config.moonsignEnabled}
              inputProps={{ min: 0, max: 100, step: 1 }}
              sx={{ mt: 0.5, width: 180 }}
            />
          </Box>

          <Divider />

          {/* ===== 5. 自由输入 ===== */}
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
              ⑤ 自由输入（覆盖/补充）
            </Typography>
            <Grid container spacing={1}>
              {customFields.map((f) => (
                <Grid size={{ xs: 6, sm: 4 }} key={f.key}>
                  <TextField
                    size="small"
                    type="number"
                    fullWidth
                    label={f.label}
                    value={((config.customBuffs[f.key] as number) ?? 0) * (f.key === 'elementalMastery' || f.key === 'atkFlat' ? 1 : 100)}
                    onChange={(e) => {
                      const raw = Number(e.target.value);
                      const scale = (f.key === 'elementalMastery' || f.key === 'atkFlat') ? 1 : 100;
                      update({ customBuffs: { ...config.customBuffs, [f.key]: isNaN(raw) ? undefined : raw / scale } });
                    }}
                    inputProps={{ step: f.step }}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>

        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

export default TeamBuffPanel;
