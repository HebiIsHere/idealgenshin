import { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface LoadingOverlayProps {
  visible: boolean;
  progress?: number;
  message?: string;
  minDurationMs?: number;
}

function LoadingOverlay({
  visible,
  progress,
  message = '正在计算',
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
        bgcolor: 'rgba(0,0,48,0.85)',
        backdropFilter: 'blur(6px)',
        opacity: exiting ? 0 : 1,
        transition: 'opacity 300ms cubic-bezier(0.16,1,0.3,1)',
        gap: 2.5,
      }}
    >
      {/* v5 双环 Spinner */}
      <div className="spinner-ring" />

      {/* 加载文字 + 弹跳点 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        <Typography variant="body1" sx={{ color: 'rgba(208,232,239,0.55)', fontSize: '0.9rem' }}>
          {message}
        </Typography>
        <span className="loading-dots">
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-dot" />
        </span>
      </Box>

      {/* v5 进度条 */}
      {progress !== undefined && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <div className="v5-progress">
            <div className="v5-progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <Typography variant="caption" sx={{ color: 'rgba(208,232,239,0.4)', fontSize: '0.7rem' }}>
            {Math.round(progress * 100)}%
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default LoadingOverlay;
