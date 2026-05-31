import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArtifactEditor from '../../artifact/ArtifactEditor';
import ArtifactSetSelect from '../../artifact/ArtifactSetSelect';
import PortalOverlay, { usePopover } from './PortalOverlay';

interface ArtifactSectionProps {
  importedSetNames: string[];
  importedSetCounts: Record<string, number>;
}

export default function ArtifactSection({ importedSetNames, importedSetCounts }: ArtifactSectionProps) {
  const editorPop = usePopover();
  const setPop = usePopover();

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 0.5, color: 'primary.main' }}>圣遗物配置</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        逐部位填入圣遗物主/副词条属性
      </Typography>

      <Box onClick={() => editorPop.setOpen(true)} sx={{
        mb: 2, p: 1, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', borderRadius: 1.5,
        bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
        '&:hover': { bgcolor: 'rgba(91,192,235,0.06)', borderColor: 'rgba(91,192,235,0.2)' },
        transition: 'background-color 0.2s, border-color 0.2s',
      }}>
        <Typography variant="subtitle2" sx={{ color: 'primary.main', flexGrow: 1 }}>圣遗物编辑</Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>点击展开</Typography>
        <ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} />
      </Box>

      <PortalOverlay open={editorPop.open} exiting={editorPop.exiting} onClose={editorPop.close}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>圣遗物编辑</Typography>
        <ArtifactEditor />
      </PortalOverlay>

      <Box onClick={() => setPop.setOpen(true)} sx={{
        mb: 1, p: 1, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', borderRadius: 1.5,
        bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
        '&:hover': { bgcolor: 'rgba(91,192,235,0.06)', borderColor: 'rgba(91,192,235,0.2)' },
        transition: 'background-color 0.2s, border-color 0.2s',
      }}>
        <Typography variant="subtitle2" sx={{ color: 'primary.main', flexGrow: 1 }}>套装组合</Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>点击展开</Typography>
        <ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} />
      </Box>

      <PortalOverlay open={setPop.open} exiting={setPop.exiting} onClose={setPop.close} maxHeight="70vh">
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>套装组合</Typography>
        <ArtifactSetSelect importedSetNames={importedSetNames} importedSetCounts={importedSetCounts} />
      </PortalOverlay>
    </Box>
  );
}
