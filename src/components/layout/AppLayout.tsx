import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import Header from './Header';

/** Main layout: fixed header + scrollable content area. */
function AppLayout(): React.ReactElement {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* 顶部标题栏 */}
      <Header />

      {/* 主内容区 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

export default AppLayout;
