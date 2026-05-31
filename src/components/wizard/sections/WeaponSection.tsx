import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useCharacterStore } from '../../../store/slices/characterSlice';
import WeaponSelect from '../../weapon/WeaponSelect';
import WeaponPassiveInput from '../../weapon/WeaponPassiveInput';
import PortalOverlay, { usePopover } from './PortalOverlay';

const SUBSTAT_LABELS: Record<string, string> = {
  ATK_PERCENT: '攻击力%', DEF_PERCENT: '防御力%', HP_PERCENT: '生命值%',
  CRIT_RATE: '暴击率%', CRIT_DMG: '暴击伤害%', ELEMENTAL_MASTERY: '元素精通',
  ENERGY_RECHARGE: '充能效率', PHYSICAL_DMG_BONUS: '物理伤害%',
};

interface WeaponSectionProps {
  onSelectWeapon: (id: string) => void;
}

export default function WeaponSection({ onSelectWeapon }: WeaponSectionProps) {
  const weaponConfig = useCharacterStore((s) => s.weaponConfig);
  const setWeaponRefinement = useCharacterStore((s) => s.setWeaponRefinement);
  const pop = usePopover();

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 0.5, color: 'primary.main' }}>武器配置</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        选择武器并查看被动效果
      </Typography>
      <WeaponSelect onSelectWeapon={onSelectWeapon} />
      {weaponConfig && (
        <>
          <Box sx={{ mt: 1, mb: 1, p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2 }}>
            <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>
              {weaponConfig.weaponData.nameZh}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              基础攻击力: {weaponConfig.weaponData.baseAtk}
            </Typography>
            {weaponConfig.weaponData.substatType && weaponConfig.weaponData.substatValue > 0 && (
              <Typography variant="body2" color="text.secondary">
                {SUBSTAT_LABELS[weaponConfig.weaponData.substatType] || weaponConfig.weaponData.substatType}
                : {weaponConfig.weaponData.substatType === 'ELEMENTAL_MASTERY' ? Math.round(weaponConfig.weaponData.substatValue) : `${(weaponConfig.weaponData.substatValue * 100).toFixed(4)}%`}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              等级: {weaponConfig.weaponLevel}
            </Typography>
            <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary">精炼:</Typography>
              {[1, 2, 3, 4, 5].map((r) => (
                <Chip
                  key={r} label={`R${r}`} size="small"
                  color={weaponConfig.refinement === r ? 'primary' : 'default'}
                  variant={weaponConfig.refinement === r ? 'filled' : 'outlined'}
                  onClick={() => setWeaponRefinement(r)}
                  sx={{ cursor: 'pointer', minWidth: 36 }}
                />
              ))}
            </Box>
          </Box>
          <Box className="diamond-divider">◆</Box>

          <Box onClick={() => pop.setOpen(true)} sx={{
            mb: 1, p: 1, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', borderRadius: 1.5,
            bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            '&:hover': { bgcolor: 'rgba(91,192,235,0.06)', borderColor: 'rgba(91,192,235,0.2)' },
            transition: 'background-color 0.2s, border-color 0.2s',
          }}>
            <Typography variant="subtitle2" sx={{ color: 'primary.main', flexGrow: 1 }}>被动效果模拟</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>点击展开</Typography>
            <ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} />
          </Box>

          <PortalOverlay open={pop.open} exiting={pop.exiting} onClose={pop.close}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>被动效果模拟</Typography>
            <WeaponPassiveInput />
          </PortalOverlay>
        </>
      )}
    </Box>
  );
}
