import React, { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

interface LoadingOverlayProps {
  visible: boolean;
  progress?: number;
  message?: string;
  /** 最低显示时长 (ms)，确保星座动画完整播放。默认 1800。 */
  minDurationMs?: number;
}

const STARS = [
  { cx: 30, cy: 6, r: 2.5 },
  { cx: 50, cy: 18, r: 3 },
  { cx: 54, cy: 42, r: 2.5 },
  { cx: 30, cy: 54, r: 3 },
  { cx: 6, cy: 42, r: 2.5 },
  { cx: 10, cy: 18, r: 3 },
];

const LINES = [
  { x1: 30, y1: 6, x2: 50, y2: 18 },
  { x1: 50, y1: 18, x2: 54, y2: 42 },
  { x1: 54, y1: 42, x2: 30, y2: 54 },
  { x1: 30, y1: 54, x2: 6, y2: 42 },
  { x1: 6, y1: 42, x2: 10, y2: 18 },
  { x1: 10, y1: 18, x2: 30, y2: 6 },
  { x1: 30, y1: 6, x2: 30, y2: 54 },
  { x1: 10, y1: 18, x2: 50, y2: 42 },
];

function LoadingOverlay({
  visible,
  progress,
  message = '正在计算中…',
  minDurationMs = 1800,
}: LoadingOverlayProps): React.ReactElement | null {
  const [show, setShow] = useState(false);
  const [exiting, setExiting] = useState(false);
  const startedAt = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (visible) {
      startedAt.current = Date.now();
      setExiting(false);
      setShow(true);
      if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = undefined; }
    }
  }, [visible]);

  useEffect(() => {
    if (!visible && show) {
      const elapsed = Date.now() - startedAt.current;
      const remaining = Math.max(0, minDurationMs - elapsed);
      hideTimer.current = setTimeout(() => {
        setExiting(true);
        setTimeout(() => setShow(false), 300);
      }, remaining);
    }
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [visible, show, minDurationMs]);

  if (!show) return null;

  return (
    <Box
      sx={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        bgcolor: 'rgba(15, 22, 41, 0.88)', backdropFilter: 'blur(4px)',
        opacity: exiting ? 0 : 1,
        transition: 'opacity 300ms cubic-bezier(0.16,1,0.3,1)',
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      }}
    >
      {/* 星座星图 */}
      <Box sx={{ mb: 3 }} className={exiting ? 'constellation-done' : undefined}>
        <svg width="80" height="80" viewBox="0 0 60 60">
          {LINES.map((line, i) => (
            <line key={`l${i}`} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
              stroke="rgba(212,168,67,0.12)" strokeWidth="0.6" />
          ))}
          {STARS.map((star, i) => (
            <circle key={i} className="constellation-star" cx={star.cx} cy={star.cy} r={star.r}
              fill="#D4A843" />
          ))}
        </svg>
      </Box>

      <Typography variant="h6" sx={{ color: 'text.primary', mb: 2 }}>{message}</Typography>

      {progress !== undefined && (
        <Box sx={{ width: 300 }}>
          <LinearProgress variant="determinate" value={progress * 100}
            sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(212,168,67,0.1)',
              '& .MuiLinearProgress-bar': { borderRadius: 3, background: 'linear-gradient(90deg, #D4A843, #F0D68C)' } }} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
            {Math.round(progress * 100)}%
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default LoadingOverlay;
