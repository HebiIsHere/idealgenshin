import React, { useState, lazy, Suspense, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Container from '@mui/material/Container';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DescriptionIcon from '@mui/icons-material/Description';
import CloseIcon from '@mui/icons-material/Close';
import Paper from '@mui/material/Paper';
import { keyframes } from '@mui/system';
import { useWizardStore } from '../store/slices/wizardSlice';

const SaveManager = lazy(() => import('../components/layout/SaveManager'));

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
`;

const fadeOut = keyframes`
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-16px); }
`;

// 海面波动
const waveShift = keyframes`
  0%, 100% { transform: translateY(0) scaleY(1); }
  50% { transform: translateY(-4px) scaleY(1.03); }
`;

// 气泡上升
const bubbleRise = keyframes`
  0% { transform: translateY(0) scale(0.4); opacity: 0.3; }
  20% { opacity: 0.5; }
  100% { transform: translateY(-100vh) scale(1.4); opacity: 0; }
`;

// 按钮光晕呼吸
const float = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(91,192,235,0.3), 0 0 0 2px rgba(208,228,220,0.10); }
  50% { box-shadow: 0 0 36px rgba(91,192,235,0.45), 0 0 0 2px rgba(208,228,220,0.16); }
`;

const EXIT_MS = 350;

const BUBBLES = [
  { left: '10%', size: 22, delay: 0, duration: 7 },
  { left: '22%', size: 14, delay: 1.5, duration: 8 },
  { left: '35%', size: 30, delay: 0.8, duration: 6.5 },
  { left: '48%', size: 18, delay: 3, duration: 9 },
  { left: '58%', size: 26, delay: 2, duration: 7.5 },
  { left: '68%', size: 10, delay: 4, duration: 8.5 },
  { left: '78%', size: 22, delay: 1, duration: 6 },
  { left: '88%', size: 14, delay: 2.5, duration: 7.5 },
];

function LandingPage(): React.ReactElement {
  const enterWizard = useWizardStore((s) => s.enterWizard);
  const [exiting, setExiting] = useState(false);
  const [saveManagerOpen, setSaveManagerOpen] = useState(false);
  const [downloadPanelOpen, setDownloadPanelOpen] = useState(false);

  // Prefetch WizardPage chunk during idle time so entry is instant
  useEffect(() => {
    const idle = requestIdleCallback || ((cb: () => void) => setTimeout(cb, 2000));
    const id = idle(() => { import('./WizardPage'); });
    return () => { cancelIdleCallback ? cancelIdleCallback(id as number) : clearTimeout(id as ReturnType<typeof setTimeout>); };
  }, []);

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
        bgcolor: '#0B1424',
        position: 'relative',
        overflow: 'hidden',
        animation: exiting ? `${fadeOut} ${EXIT_MS}ms cubic-bezier(0.16,1,0.3,1) both` : 'none',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      {/* ===== 海面渐变层 ===== */}
      <Box
        sx={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: `
            linear-gradient(180deg,
              rgba(11,20,36,0) 0%,
              rgba(30,60,90,0.15) 40%,
              rgba(45,90,130,0.25) 70%,
              rgba(60,120,160,0.3) 85%,
              rgba(80,150,180,0.25) 95%,
              rgba(100,170,200,0.2) 100%
            )
          `,
          animation: `${waveShift} 6s ease-in-out infinite`,
        }}
      />
      {/* Furina 剪影 — 右侧淡入 */}
      <Box
        component="img"
        src="/furina-bg.svg"
        alt=""
        aria-hidden="true"
        sx={{
          position: 'fixed',
          top: '-14vh',
          right: '-50vw',
          width: '110vw',
          height: '132vh',
          objectFit: 'cover',
          objectPosition: '5% center',
          zIndex: 0,
          pointerEvents: 'none',
          opacity: 0.045,
          animation: 'furinaBreathe 6s cubic-bezier(0.45,0,0.55,1) infinite',
          '@keyframes furinaBreathe': {
            '0%, 100%': { opacity: 0.035 },
            '50%': { opacity: 0.06 },
          },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      />

      {/* 第二层海面：稍偏移制造纵深感 */}
      <Box
        sx={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: `
            linear-gradient(180deg,
              rgba(11,20,36,0) 30%,
              rgba(20,50,80,0.2) 60%,
              rgba(40,80,120,0.35) 80%,
              rgba(70,130,170,0.3) 92%,
              rgba(90,160,190,0.2) 100%
            )
          `,
          animation: `${waveShift} 8s ease-in-out 1s infinite reverse`,
        }}
      />

      {/* ===== 气泡 ===== */}
      {BUBBLES.map((b, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute', bottom: -20, left: b.left, zIndex: 1,
            width: b.size, height: b.size,
            borderRadius: '50%',
            bgcolor: 'transparent',
            border: '1.5px solid rgba(130,200,230,0.3)',
            pointerEvents: 'none',
            animation: `${bubbleRise} ${b.duration}s ${b.delay}s linear infinite`,
          }}
        />
      ))}

      {/* 存档按钮 */}
      <IconButton
        onClick={() => setSaveManagerOpen(true)}
        title="存档管理"
        sx={{ position: 'fixed', top: 16, right: 16, zIndex: 20, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
      >
        <FolderOpenIcon />
      </IconButton>

      {/* 中心光晕 */}
      <Box
        sx={{
          position: 'absolute',
          top: '30%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600, height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(91,192,235,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <Container disableGutters sx={{ width: '85vw', maxWidth: 1100, textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <Box sx={{ animation: `${fadeIn} 0.8s cubic-bezier(0.16,1,0.3,1) both` }}>
          <Typography
            sx={{
              fontFamily: '"Nunito", "Noto Sans SC", sans-serif',
              fontWeight: 200,
              fontSize: { xs: '2.6rem', sm: '4.5rem', md: 'min(8vw, 96px)' },
              color: 'text.primary',
              letterSpacing: '0.04em',
              lineHeight: 1.1,
              mb: 0.5,
            }}
          >
            IDEALGENSHIN
          </Typography>
        </Box>

        <Typography
          variant="body1"
          sx={{
            fontWeight: 300,
            color: 'text.secondary',
            fontSize: { xs: '0.9rem', md: 'min(2vw, 24px)' },
            letterSpacing: '0.06em',
            mb: 4,
            animation: `${fadeIn} 0.8s 0.15s cubic-bezier(0.16,1,0.3,1) both`,
          }}
        >
          理想原生
        </Typography>

        <Typography
          variant="body1"
          sx={{ color: 'text.secondary', mb: 6, lineHeight: 1.8,
            animation: `${fadeIn} 0.8s 0.3s cubic-bezier(0.16,1,0.3,1) both` }}
        >
          基于完整期望伤害公式的圣遗物词条优化工具
          <br />
          逐区填写 · 问答引导 · 可视化计算
        </Typography>

        <Box sx={{ animation: `${fadeIn} 0.8s 0.45s cubic-bezier(0.16,1,0.3,1) both` }}>
          <Button
            variant="contained" size="large" startIcon={<AutoAwesomeIcon />}
            onClick={handleEnter}
            sx={{
              px: 6, py: 2, fontSize: '1.1rem', borderRadius: 3,
              animation: `${float} 3s ease-in-out infinite`,
            }}
          >
            开始配置
          </Button>
        </Box>

        <Typography variant="caption" sx={{ color: 'text.disabled', mt: 4, display: 'block',
          animation: `${fadeIn} 0.8s 0.6s cubic-bezier(0.16,1,0.3,1) both` }}>
          作者：袔苾 · v4.2.2
        </Typography>
      </Container>

      <Suspense fallback={null}>
        <SaveManager open={saveManagerOpen} onClose={() => setSaveManagerOpen(false)} />
      </Suspense>

      {/* Download panel */}
      <Box sx={{ position: 'fixed', bottom: 16, left: 16, zIndex: 20 }}>
        <IconButton
          onClick={() => setDownloadPanelOpen(!downloadPanelOpen)}
          sx={{
            color: 'rgba(255,255,255,0.35)',
            '&:hover': { color: 'primary.main', bgcolor: 'rgba(91,192,235,0.08)' },
            transition: 'color 0.3s, background-color 0.3s',
          }}
          title="下载文档"
        >
          {downloadPanelOpen ? <CloseIcon fontSize="small" /> : <DescriptionIcon fontSize="small" />}
        </IconButton>
        {downloadPanelOpen && (
          <Paper
            elevation={4}
            sx={{
              position: 'absolute',
              bottom: 48,
              left: 0,
              p: 2,
              minWidth: 220,
              bgcolor: 'rgba(15,22,41,0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 2,
              animation: `${fadeIn} 0.25s cubic-bezier(0.16,1,0.3,1)`,
            }}
          >
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mb: 1, display: 'block' }}>
              下载文档
            </Typography>
            <Button
              size="small"
              fullWidth
              variant="text"
              startIcon={<DescriptionIcon fontSize="small" />}
              href="/理想原生v4.2.2-项目介绍手册.docx"
              download
              sx={{ justifyContent: 'flex-start', color: 'text.secondary', mb: 0.5, fontSize: '0.8rem' }}
            >
              项目介绍手册
            </Button>
            <Button
              size="small"
              fullWidth
              variant="text"
              startIcon={<DescriptionIcon fontSize="small" />}
              href="/理想原生v4.2.2-使用说明.docx"
              download
              sx={{ justifyContent: 'flex-start', color: 'text.secondary', fontSize: '0.8rem' }}
            >
              使用说明
            </Button>
          </Paper>
        )}
      </Box>
    </Box>
  );
}

export default LandingPage;
