import React from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import { formatDamage } from '../../utils/format';
import type { DamageResult } from '../../types';

const PATH_NAMES: Record<string, string> = {
  DIRECT: '直伤',
  AMPLIFYING: '增幅',
  TRANSFORMATIVE: '剧变',
  CATALYZE: '激化',
  MOONSIGN: '月曜',
  MOONSIGN_DIRECT: '直伤月曜',
};

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(4) + '%';
}

interface RowProps { label: string; value?: string; sub?: string; highlight?: boolean; }

function FlowRow({ label, value, sub, highlight }: RowProps) {
  return (
    <TableRow sx={{ '&:last-child td': { borderBottom: 0 } }}>
      <TableCell sx={{ py: 0.5, px: 1, color: 'text.secondary', fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {label}
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1, textAlign: 'right', fontSize: '0.75rem', fontWeight: highlight ? 700 : 400, color: highlight ? 'primary.main' : 'text.primary', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {value ?? '—'}
      </TableCell>
      {sub !== undefined && (
        <TableCell sx={{ py: 0.5, px: 1, fontSize: '0.65rem', color: 'text.disabled', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {sub}
        </TableCell>
      )}
    </TableRow>
  );
}

interface DamageFlowProps {
  result: DamageResult;
  computedStats?: { totalAtk: number; totalHp: number; totalDef: number; em: number; critRate: number; critDmg: number; dmgBonus: number } | null;
}

function DamageFlow({ result, computedStats }: DamageFlowProps): React.ReactElement {
  if (!result) return <Typography color="text.secondary">无计算结果</Typography>;
  const pathName = PATH_NAMES[result.damagePath] ?? result.damagePath;

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ color: 'primary.main' }}>
          伤害计算流程
        </Typography>
        <Chip label={pathName} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 18 }} />
      </Box>

      {/* === Layer 1: Base Damage === */}
      <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600, display: 'block', mb: 0.5, fontSize: "0.78rem" }}>
        Layer 1 — 基础伤害
      </Typography>
      <Table size="small" sx={{ mb: 0.5, '& td': { fontSize: '0.72rem' } }}>
        <TableBody>
          {result.baseDebug && (
            <>
              <FlowRow label="总攻击力" value={fmt(result.baseDebug.totalAtk)} />
              {(result.baseDebug.atkRatio ?? 0) > 0 && (
                <FlowRow label="倍率" value={`×${fmt(result.baseDebug. ?? 0)}`} sub={result.baseDebug.atkRatio > 0 ? `${(result.baseDebug.atkRatio * 100).toFixed(4)}%` : ''} />
              )}
              {(result.baseDebug.hpRatio ?? 0) > 0 && (
                <FlowRow label="生命倍率" value={`×${fmt(result.baseDebug. ?? 0)}`} />
              )}
              {(result.baseDebug.defRatio ?? 0) > 0 && (
                <FlowRow label="防御倍率" value={`×${fmt(result.baseDebug. ?? 0)}`} />
              )}
              {(result.baseDebug.emRatio ?? 0) > 0 && (
                <FlowRow label="精通倍率" value={`×${fmt(result.baseDebug. ?? 0)}`} />
              )}
              {result.baseDebug.baseDmgMultiplier && result.baseDebug.baseDmgMultiplier !== 1 && (
                <FlowRow label="倍率提升" value={`×${fmt(result.baseDebug. ?? 0)}`} />
              )}
              {(() => {
                const parts: string[] = [];
                const b = result.baseDebug;
                if ((b.atkRatio ?? 0) > 0) parts.push(`${fmt(b.totalAtk)} × ${fmt(b.atkRatio)}`);
                if ((b.hpRatio ?? 0) > 0) parts.push(`${fmt(b.totalHp ?? 0)} × ${fmt(b.hpRatio)}`);
                if ((b.defRatio ?? 0) > 0) parts.push(`${fmt(b.totalDef ?? 0)} × ${fmt(b.defRatio)}`);
                if ((b.emRatio ?? 0) > 0) parts.push(`${fmt(b.em ?? 0)} × ${fmt(b.emRatio)}`);
                const formula = parts.length > 0 ? parts.join(' + ') : `${fmt(b.totalAtk)} × ${fmt(b.atkRatio ?? 0)}`;
                return <FlowRow label="基础伤害区" value={fmt(result.baseDamage)} sub={`${formula}`} />;
              })()}
            </>
          )}
          {!result.baseDebug && <FlowRow label="基础伤害" value={fmt(result.baseDamage)} />}
        </TableBody>
      </Table>

      {/* Authority & Feather */}
      {result.authorityDebug && result.authorityDebug.result > 1 && (
        <Table size="small" sx={{ mb: 0.5, '& td': { fontSize: '0.72rem' } }}>
          <TableBody>
            <FlowRow label="大权区" value={`×${fmt(result.authorityDebug.result)}`} sub={result.authorityDebug.bonus > 0 ? `+${(result.authorityDebug.bonus * 100).toFixed(4)}%` : ''} />
          </TableBody>
        </Table>
      )}
      {result.featherDebug && result.featherDebug.result > 0 && (
        <Table size="small" sx={{ mb: 0.5, '& td': { fontSize: '0.72rem' } }}>
          <TableBody>
            <FlowRow label="+ 羽毛附伤" value={fmt(result.featherDebug.result)} />
          </TableBody>
        </Table>
      )}
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
        → 内层伤害 (base × authority + feather)
      </Typography>

      {/* === Layer 2: 反应化一（反应系数 × 月兆区）=== */}
      <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600, display: 'block', mb: 0.5, fontSize: "0.78rem" }}>
        Layer 2 — 反应化一
      </Typography>
      <Table size="small" sx={{ mb: 0.5, '& td': { fontSize: '0.72rem' } }}>
        <TableBody>
          {result.damagePath === 'AMPLIFYING' && result.ampDebug && (
            <FlowRow label="增幅系数" value={`×${fmt(result.ampDebug.baseMultiplier)}`} sub={result.ampDebug.baseMultiplier > 1 ? '蒸发/融化' : ''} />
          )}
          {result.damagePath === 'TRANSFORMATIVE' && result.transDebug && (
            <FlowRow label="剧变基础" value={fmt(result.transDebug.result)} sub={`Rate × LvMult × (1+EM)`} />
          )}
          {result.damagePath === 'CATALYZE' && result.cataDebug && (
            <FlowRow label="+ 激化附伤" value={fmt(result.cataDebug.result)} sub="加至基础伤害区" />
          )}
          {result.moonDebug && (
            <FlowRow label="月反应率" value={`×${fmt(result.moonDebug.moonRate)}`} />
          )}
          {result.moonSignDebug && result.moonSignDebug.moonBonus > 0 && (
            <FlowRow label="月兆区" value={`×${fmt(result.moonSignDebug.result)}`} />
          )}
        </TableBody>
      </Table>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
        → 反应核心 (reactionCoeff × innerDamage × moonSign)
      </Typography>

      {/* === Layer 3: 反应化二（精通 × 增伤 + 祷歌附伤）=== */}
      <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600, display: 'block', mb: 0.5, fontSize: "0.78rem" }}>
        Layer 3 — 反应化二
      </Typography>
      <Table size="small" sx={{ mb: 0.5, '& td': { fontSize: '0.72rem' } }}>
        <TableBody>
          {result.masteryDebug && (
            <FlowRow label="精通区" value={`×${fmt(result.masteryDebug.result)}`}
              sub={result.masteryDebug.type === 'amplifying' ? `EM ${result.masteryDebug.em} → ${fmtPct(result.masteryDebug.emBonus)}`
                : result.masteryDebug.type === 'transformative' ? `EM ${result.masteryDebug.em} → ${fmtPct(result.masteryDebug.emBonus)}`
                : result.masteryDebug.type === 'moonsign' ? `EM ${result.masteryDebug.em} → ${fmtPct(result.masteryDebug.emBonus)}`
                : undefined} />
          )}
          {result.bonusMultiplier > 1 && result.bonusDebug && (
            <FlowRow label="增伤区" value={`×${fmt(result.bonusMultiplier)}`} sub={fmtPct(result.bonusDebug.dmgBonus)} />
          )}
          {result.prayerDebug && result.prayerDebug.result > 0 && (
            <FlowRow label="+ 祷歌附伤" value={fmt(result.prayerDebug.result)} />
          )}
          <FlowRow label="反应乘数" value={`×${fmt(result.reactionMultiplier)}`} highlight />
        </TableBody>
      </Table>

      {/* === Layer 4: 外层乘区 === */}
      <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600, display: 'block', mb: 0.5, fontSize: "0.78rem" }}>
        Layer 4 — 外层乘区
      </Typography>
      <Table size="small" sx={{ mb: 0.5, '& td': { fontSize: '0.72rem' } }}>
        <TableBody>
          {result.critMultiplier > 1 && result.critDebug && (
            <FlowRow label="暴击区" value={`×${fmt(result.critMultiplier)}`}
              sub={`CR ${fmtPct(result.critDebug.critRate)} × CD ${fmtPct(result.critDebug.critDmg)}`} />
          )}
          {result.elevationMultiplier && result.elevationMultiplier > 1 && result.elevDebug && (
            <FlowRow label="擢升区" value={`×${fmt(result.elevationMultiplier)}`} sub={fmtPct(result.elevDebug.elevationBonus)} />
          )}
          <FlowRow label="防御区" value={result.defenseMultiplier === 1 ? '×1.0000（无视）' : `×${fmt(result.defenseMultiplier)}`}
            sub={result.defenseDebug ? `Lv${result.defenseDebug.characterLevel} vs Lv${result.defenseDebug.enemyLevel}` : '直伤月反应不计算防御'} />
          <FlowRow label="抗性区" value={`×${fmt(result.resistanceMultiplier)}`}
            sub={result.resistDebug ? `抗性 ${fmtPct(result.resistDebug.effectiveRes)}` : undefined} />
          {result.independentMultiplier && result.independentMultiplier > 1 && result.indepDebug && (
            <FlowRow label="独立乘区" value={`×${fmt(result.independentMultiplier)}`} />
          )}
        </TableBody>
      </Table>

      {/* === Final Result === */}
      <Divider sx={{ my: 1.5 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
          最终伤害
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
          {formatDamage(result.totalDamage)}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'right', mt: 0.25 }}>
        路径: {pathName}
        {computedStats && ` · ATK ${fmt(computedStats.totalAtk)} · CR/CD ${fmtPct(computedStats.critRate)}/${fmtPct(computedStats.critDmg)}`}
      </Typography>
    </Paper>
  );
}

export default DamageFlow;
