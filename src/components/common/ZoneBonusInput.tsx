import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import type { ZoneBonusInput } from '../../types';

/**
 * ZoneBonusInput — 按乘区分组的输入框组件。
 * 武器被动和命座共用此组件。
 *
 * 7个乘区各一行：
 * - 攻击区：atkPercent + atkFlat
 * - 生命区：hpPercent + hpFlat
 * - 防御区：defPercent + defFlat
 * - 增伤区：dmgBonus
 * - 暴击区：critRate + critDmg
 * - 精通区：elementalMastery
 * - 抗性区：resistReduction
 * - 基础伤害区：baseDamageFlat
 */

interface ZoneBonusInputProps {
  /** 当前值。 */
  value: ZoneBonusInput;
  /** 值变更回调。 */
  onChange: (value: ZoneBonusInput) => void;
  /** 是否禁用。 */
  disabled?: boolean;
}

/** 乘区行定义。 */
interface ZoneRow {
  /** 乘区名称。 */
  label: string;
  /** 该行的输入字段。 */
  fields: Array<{
    key: keyof ZoneBonusInput;
    label: string;
    unit: string;
    tooltip: string;
    isPercent: boolean;
  }>;
}

/** 乘区定义。 */
const ZONE_ROWS: ZoneRow[] = [
  {
    label: '攻击区',
    fields: [
      { key: 'atkPercent', label: '攻击力%', unit: '%', tooltip: '攻击力百分比加成（如武器被动提供20%攻击力）', isPercent: true },
      { key: 'atkFlat', label: '攻击力', unit: '点', tooltip: '固定攻击力加成', isPercent: false },
    ],
  },
  {
    label: '生命区',
    fields: [
      { key: 'hpPercent', label: '生命值%', unit: '%', tooltip: '生命值百分比加成', isPercent: true },
      { key: 'hpFlat', label: '生命值', unit: '点', tooltip: '固定生命值加成', isPercent: false },
    ],
  },
  {
    label: '防御区',
    fields: [
      { key: 'defPercent', label: '防御力%', unit: '%', tooltip: '防御力百分比加成', isPercent: true },
      { key: 'defFlat', label: '防御力', unit: '点', tooltip: '固定防御力加成', isPercent: false },
    ],
  },
  {
    label: '增伤区',
    fields: [
      { key: 'dmgBonus', label: '伤害加成', unit: '%', tooltip: '元素/物理伤害加成（如武器被动提供12%伤害加成）', isPercent: true },
    ],
  },
  {
    label: '暴击区',
    fields: [
      { key: 'critRate', label: '暴击率', unit: '%', tooltip: '暴击率加成（如命座提供8%暴击率）', isPercent: true },
      { key: 'critDmg', label: '暴击伤害', unit: '%', tooltip: '暴击伤害加成', isPercent: true },
    ],
  },
  {
    label: '精通区',
    fields: [
      { key: 'elementalMastery', label: '元素精通', unit: '点', tooltip: '元素精通加成', isPercent: false },
    ],
  },
  {
    label: '抗性区',
    fields: [
      { key: 'resistReduction', label: '减抗', unit: '%', tooltip: '敌人抗性降低（如命座提供20%减抗）', isPercent: true },
    ],
  },
  {
    label: '基础伤害区',
    fields: [
      { key: 'baseDamageFlat', label: '基础伤害', unit: '点', tooltip: '直接加到基础伤害上的固定值', isPercent: false },
    ],
  },
  {
    label: '穿防区',
    fields: [
      { key: 'defIgnore', label: '无视防御', unit: '%', tooltip: '无视敌人防御比例（如雷电C2提供60%）', isPercent: true },
    ],
  },
  {
    label: '独立乘区',
    fields: [
      { key: 'independentBonus', label: '独立加成', unit: '%', tooltip: '独立于增伤区的额外乘算加成（天赋/命座特有）', isPercent: true },
    ],
  },
  {
    label: '擢升区',
    fields: [
      { key: 'elevationBonus', label: '擢升加成', unit: '%', tooltip: '月反应擢升加成（仅月反应路径生效）', isPercent: true },
    ],
  },
  {
    label: '反应伤害区',
    fields: [
      { key: 'transformReactionBonus', label: '剧变反应', unit: '%', tooltip: '超载/感电/绽放等剧变反应伤害加成（如魔女4、乐园套）', isPercent: true },
      { key: 'moonReactionBonus', label: '月曜反应', unit: '%', tooltip: '月感电/月绽放等月曜反应伤害加成', isPercent: true },
      { key: 'ampReactionBonus', label: '增幅反应', unit: '%', tooltip: '蒸发/融化加成系数提高（如魔女4件套+15%）', isPercent: true },
    ],
  },
];

/** 按乘区分组的输入框组件。 */
function ZoneBonusInputComp({ value, onChange, disabled = false }: ZoneBonusInputProps): React.ReactElement {
  const handleFieldChange = (key: keyof ZoneBonusInput, rawValue: string, isPercent: boolean) => {
    let numVal: number;
    if (rawValue === '') {
      numVal = 0;
    } else {
      numVal = parseFloat(rawValue);
      if (isNaN(numVal)) return;
      // 百分比字段：用户输入的是百分比值（如 20），需转为小数（0.2）
      if (isPercent) {
        numVal = numVal / 100;
      }
    }

    onChange({
      ...value,
      [key]: numVal,
    });
  };

  /** 将内部存储值转为展示值。 */
  const toDisplayValue = (key: keyof ZoneBonusInput, isPercent: boolean): string => {
    const raw = value[key] as number | undefined;
    if (raw === undefined || raw === 0) return '';
    // 百分比字段：内部是小数（0.2），展示为百分比值（20）
    if (isPercent) {
      return String(Math.round(raw * 10000) / 100); // 避免浮点精度问题
    }
    return String(raw);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {ZONE_ROWS.map((row) => (
        <Box key={row.label}>
          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, mb: 0.5, display: 'block' }}>
            {row.label}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {row.fields.map((field) => (
              <Tooltip key={field.key} title={field.tooltip} arrow placement="top">
                <TextField
                  label={field.label}
                  value={toDisplayValue(field.key, field.isPercent)}
                  onChange={(e) => handleFieldChange(field.key, e.target.value, field.isPercent)}
                  size="small"
                  type="number"
                  disabled={disabled}
                  inputProps={{ step: field.isPercent ? 1 : 10, min: 0 }}
                  InputProps={{
                    endAdornment: (
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                        {field.unit}
                      </Typography>
                    ),
                  }}
                  sx={{ minWidth: 110, flex: '1 1 110px' }}
                />
              </Tooltip>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export default ZoneBonusInputComp;
