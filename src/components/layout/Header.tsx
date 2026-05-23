import React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import SaveManager from './SaveManager';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

/**
 * Header — 顶部标题栏。
 * 左侧显示应用名称，右侧放置存档管理下拉按钮。
 */
function Header(): React.ReactElement {
  const [saveManagerOpen, setSaveManagerOpen] = React.useState(false);

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
        }}
      >
        <Toolbar variant="dense" sx={{ minHeight: 48 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              color: 'primary.main',
              flexGrow: 1,
            }}
          >
            原神圣遗物词条优化器 V2
          </Typography>

          <IconButton
            color="inherit"
            onClick={() => setSaveManagerOpen(true)}
            title="存档管理"
            size="small"
          >
            <FolderOpenIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* 顶部偏移 */}
      <Box sx={{ height: 48 }} />

      {/* 存档管理弹窗 */}
      <SaveManager
        open={saveManagerOpen}
        onClose={() => setSaveManagerOpen(false)}
      />
    </>
  );
}

export default Header;
