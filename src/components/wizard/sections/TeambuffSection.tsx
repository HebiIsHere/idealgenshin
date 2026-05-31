import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TeamBuffPanel, { TeamBuffConfig } from '../../optimizer/TeamBuffPanel';
import PortalOverlay, { usePopover } from './PortalOverlay';
import { calcLaumaPrayer } from '../../../utils/calcLaumaPrayer';

interface TeambuffSectionProps {
  teamBuffConfig: TeamBuffConfig;
  setTeamBuffConfig: (v: TeamBuffConfig) => void;
  laumaCons: string;
  setLaumaCons: (v: string) => void;
  laumaEM: number;
  setLaumaEM: (v: number) => void;
  reactionType: string;
}

export default function TeambuffSection({
  teamBuffConfig, setTeamBuffConfig, laumaCons, setLaumaCons, laumaEM, setLaumaEM, reactionType,
}: TeambuffSectionProps) {
  const pop = usePopover();
  const isMB = reactionType === ('MOON_BLOOM' as any);

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 0.5, color: 'primary.main' }}>队伍 Buff</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        添加辅助角色、圣遗物套装、元素共鸣等增益
      </Typography>

      <Box onClick={() => pop.setOpen(true)} sx={{
        mb: 2, p: 1, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', borderRadius: 1.5,
        bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
        '&:hover': { bgcolor: 'rgba(91,192,235,0.06)', borderColor: 'rgba(91,192,235,0.2)' },
        transition: 'background-color 0.2s, border-color 0.2s',
      }}>
        <Typography variant="subtitle2" sx={{ color: 'primary.main', flexGrow: 1 }}>队伍增益</Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>点击展开</Typography>
        <ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} />
      </Box>

      <PortalOverlay open={pop.open} exiting={pop.exiting} onClose={pop.close} maxHeight="80vh">
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>队伍增益</Typography>
        <TeamBuffPanel config={teamBuffConfig} onChange={setTeamBuffConfig} />
        {isMB && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2 }}>
            <Typography variant="body2" sx={{ mb: 0.5, color: 'primary.main' }}>祷歌型附伤（菈乌玛·月绽放专用）</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <FormControl size="small" sx={{ width: 120 }}>
                <Select value={laumaCons} onChange={(e) => setLaumaCons(e.target.value)}>
                  <MenuItem value="c0">0 命</MenuItem>
                  <MenuItem value="c2">2 命</MenuItem>
                  <MenuItem value="c3">3 命</MenuItem>
                </Select>
              </FormControl>
              <TextField label="菈乌玛精通" type="number" size="small" value={laumaEM || ''} placeholder="0" sx={{ width: 120 }}
                slotProps={{ htmlInput: { step: 1 } }}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '' || raw === '-') { setLaumaEM(0); return; }
                  const v = parseInt(raw);
                  if (!isNaN(v)) setLaumaEM(v);
                }} />
            </Box>
            <Typography variant="caption" color="text.secondary">
              = {laumaEM || 0} × {laumaCons === 'c0' ? '4.0' : laumaCons === 'c2' ? '8.0' : '8.723'} = {Math.round(calcLaumaPrayer(laumaEM, laumaCons)).toLocaleString()}
            </Typography>
          </Box>
        )}
      </PortalOverlay>
    </Box>
  );
}
