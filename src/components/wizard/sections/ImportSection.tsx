import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ArtifactImport from '../../artifact/ArtifactImport';

export default function ImportSection() {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 0.5, color: 'primary.main' }}>Enka 导入</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        输入 UID 自动导入角色展柜数据，省去手动填写
      </Typography>
      <ArtifactImport />
    </Box>
  );
}
