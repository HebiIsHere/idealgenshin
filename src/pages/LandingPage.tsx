import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Container from '@mui/material/Container';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { keyframes } from '@mui/system';
import { useWizardStore } from '../store/slices/wizardSlice';
import SaveManager from '../components/layout/SaveManager';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
`;

const fadeOut = keyframes`
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-16px); }
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(212, 168, 67, 0.4); }
  50% { box-shadow: 0 0 0 16px rgba(212, 168, 67, 0); }
`;

const EXIT_MS = 350;

function LandingPage(): React.ReactElement {
  const enterWizard = useWizardStore((s) => s.enterWizard);
  const [exiting, setExiting] = useState(false);
  const [saveManagerOpen, setSaveManagerOpen] = useState(false);

  const handleEnter = () => {
    setExiting(true);
    setTimeout(() => enterWizard(), EXIT_MS);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        position: 'relative',
        overflow: 'hidden',
        animation: exiting ? `${fadeOut} ${EXIT_MS}ms cubic-bezier(0.16,1,0.3,1) both` : 'none',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      {/* 文件按钮 - 右上角 */}
      <IconButton
        onClick={() => setSaveManagerOpen(true)}
        title="存档管理"
        sx={{ position: 'fixed', top: 16, right: 16, zIndex: 20, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
      >
        <FolderOpenIcon />
      </IconButton>

      <Box
        sx={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,168,67,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="sm" sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <Typography
          variant="h2"
          sx={{ fontWeight: 200, color: 'text.primary', letterSpacing: '0.08em', mb: 1,
            animation: `${fadeIn} 0.8s cubic-bezier(0.16,1,0.3,1) both` }}
        >
          理想原生
        </Typography>

        <Typography
          variant="body1"
          sx={{ color: 'text.secondary', mb: 6, lineHeight: 1.8,
            animation: `${fadeIn} 0.8s 0.2s cubic-bezier(0.16,1,0.3,1) both` }}
        >
          基于完整伤害公式的圣遗物词条优化工具
          <br />
          逐区填写 · 问答引导 · 可视化计算
        </Typography>

        <Box sx={{ animation: `${fadeIn} 0.8s 0.4s cubic-bezier(0.16,1,0.3,1) both` }}>
          <Button
            variant="contained" size="large" startIcon={<AutoAwesomeIcon />}
            onClick={handleEnter}
            sx={{ px: 6, py: 2, fontSize: '1.1rem', borderRadius: 3, animation: `${pulse} 3s infinite` }}
          >
            开始配置
          </Button>
        </Box>

        <Typography variant="caption" sx={{ color: 'text.disabled', mt: 4, display: 'block',
          animation: `${fadeIn} 0.8s 0.6s cubic-bezier(0.16,1,0.3,1) both` }}>
          作者：袔苾 · v3.1
        </Typography>
      </Container>

      <SaveManager open={saveManagerOpen} onClose={() => setSaveManagerOpen(false)} />
    </Box>
  );
}

export default LandingPage;
