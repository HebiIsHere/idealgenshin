import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useCharacterStore } from '../../../store/slices/characterSlice';
import BonusRow from '../../common/BonusRow';
import RefAccordion, { type RefEntry } from '../../common/RefAccordion';
import PortalOverlay, { usePopover } from './PortalOverlay';
import talentRef from '../../../data/talents/ref.json';
import constellationRef from '../../../data/constellations/ref.json';
import type { ZoneBonusInput as ZBType } from '../../../types';

function showPct(bonus: ZBType, key: string) {
  const v = (bonus as any)[key] as number | undefined;
  return v ? Number((v * 100).toFixed(4)) : undefined;
}
function showNum(bonus: ZBType, key: string) {
  const v = (bonus as any)[key] as number | undefined;
  return v ? Number(v.toFixed(4)) : undefined;
}
function setPct(setter: (v: ZBType) => void, bonus: ZBType, key: string) {
  return (v: number) => { setter({ ...bonus, [key]: v / 100 }); };
}
function setFlat(setter: (v: ZBType) => void, bonus: ZBType, key: string) {
  return (v: number) => { setter({ ...bonus, [key]: v }); };
}

export default function TalentSection() {
  const selectedCharacter = useCharacterStore((s) => s.selectedCharacter);
  const talentConfig = useCharacterStore((s) => s.talentConfig);
  const setTalentConfig = useCharacterStore((s) => s.setTalentConfig);
  const constellationConfig = useCharacterStore((s) => s.constellationConfig);
  const setConstellationBonus = useCharacterStore((s) => s.setConstellationBonus);

  const [talentExpand, setTalentExpand] = useState(false);
  const [constExpand, setConstExpand] = useState(false);
  const talentPop = usePopover();
  const constPop = usePopover();

  const tb = talentConfig?.bonus ?? {};
  const setTb = (v: ZBType) => { setTalentConfig(v); };
  const cb = constellationConfig?.bonus ?? {};
  const setCb = (v: ZBType) => { setConstellationBonus(v); };

  const talentEntries = useMemo(() => {
    if (!selectedCharacter) return [] as { key: string; name: string; description: string; params: string[] }[];
    const ref = (talentRef as Record<string, { talents: { key: string; name: string; description: string; params: string[] }[] }>)[selectedCharacter.id];
    return ref?.talents ?? [];
  }, [selectedCharacter]);

  const constEntries: RefEntry[] = useMemo(() => {
    if (!selectedCharacter) return [];
    const ref = (constellationRef as Record<string, { constellations: RefEntry[] }>)[selectedCharacter.id];
    return ref?.constellations ?? [];
  }, [selectedCharacter]);

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 0.5, color: 'primary.main' }}>天赋与命座</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        手动填入天赋和命座对应的实际加成数值
      </Typography>

      {/* 天赋模拟 */}
      <Box onClick={() => talentPop.setOpen(true)} sx={{
        mb: 1, p: 1, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', borderRadius: 1.5,
        bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
        '&:hover': { bgcolor: 'rgba(91,192,235,0.06)', borderColor: 'rgba(91,192,235,0.2)' },
        transition: 'background-color 0.2s, border-color 0.2s',
      }}>
        <Typography variant="subtitle2" sx={{ color: 'primary.main', flexGrow: 1 }}>天赋模拟</Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>点击展开</Typography>
        <ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} />
      </Box>
      <PortalOverlay open={talentPop.open} exiting={talentPop.exiting} onClose={talentPop.close} maxHeight="75vh">
        <Typography variant="subtitle2" sx={{ mb: 0.25, color: 'primary.main' }}>天赋模拟</Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', display: 'block', mb: 1 }}>
          固有天赋等角色自身机制提供的乘区加成
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 0.25 }}>
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
          <BonusRow label="基础攻击力" value={showNum(tb, 'baseAtkFlat')} onChange={setFlat(setTb, tb, 'baseAtkFlat')} hint="白值" />
          <BonusRow label="羽毛附伤" value={showNum(tb, 'featherFlat')} onChange={setFlat(setTb, tb, 'featherFlat')} hint="固定值" />
        </Box>
        <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
          ⚠ 百分比类数值无需输入 % 号，直接填数字即可（如 61.7 表示 61.7%）
        </Typography>
        <RefAccordion open={talentExpand} onToggle={() => setTalentExpand(!talentExpand)} entries={talentEntries} buttonLabel="查看天赋详情" emptyHint={selectedCharacter ? '暂无天赋数据' : '请先选择角色'} />
      </PortalOverlay>

      <Box className="diamond-divider">◆</Box>

      {/* 命座模拟 */}
      <Box onClick={() => constPop.setOpen(true)} sx={{
        mb: 1, p: 1, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', borderRadius: 1.5,
        bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
        '&:hover': { bgcolor: 'rgba(91,192,235,0.06)', borderColor: 'rgba(91,192,235,0.2)' },
        transition: 'background-color 0.2s, border-color 0.2s',
      }}>
        <Typography variant="subtitle2" sx={{ color: 'secondary.main', flexGrow: 1 }}>命座模拟</Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>点击展开</Typography>
        <ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} />
      </Box>
      <PortalOverlay open={constPop.open} exiting={constPop.exiting} onClose={constPop.close} maxHeight="75vh">
        <Typography variant="subtitle2" sx={{ mb: 0.25, color: 'secondary.main' }}>命座模拟</Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', display: 'block', mb: 1 }}>
          命之座效果提供的乘区加成
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 0.25 }}>
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
          <BonusRow label="基础攻击力" value={showNum(cb, 'baseAtkFlat')} onChange={setFlat(setCb, cb, 'baseAtkFlat')} hint="白值" />
        </Box>
        <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
          ⚠ 百分比类数值无需输入 % 号，直接填数字即可（如 61.7 表示 61.7%）
        </Typography>
        <RefAccordion open={constExpand} onToggle={() => setConstExpand(!constExpand)} entries={constEntries} buttonLabel="查看命座详情" emptyHint={selectedCharacter ? '暂无命座数据' : '请先选择角色'} />
      </PortalOverlay>
    </Box>
  );
}
