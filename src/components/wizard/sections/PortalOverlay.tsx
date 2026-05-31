import { ReactNode, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Box from '@mui/material/Box';

interface PortalOverlayProps {
  open: boolean;
  exiting: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
  maxHeight?: string;
  width?: string;
}

const KEYFRAMES = `
@keyframes overlayEnter {
  from { opacity: 0; transform: translateY(16px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes overlayExit {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to   { opacity: 0; transform: translateY(12px) scale(0.97); }
}
`;

export default function PortalOverlay({
  open, exiting, onClose, children, maxWidth = 600, maxHeight = '80vh', width,
}: PortalOverlayProps) {
  if (!open) return null;
  return createPortal(
    <Box
      sx={{
        position: 'fixed', inset: 0, zIndex: 1300, display: 'flex', justifyContent: 'center',
        bgcolor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
        animation: exiting ? 'overlayExit 200ms ease-in forwards' : 'overlayEnter 280ms cubic-bezier(0.16,1,0.3,1)',
      }}
      onClick={onClose}
    >
      <style>{KEYFRAMES}</style>
      <Box
        onClick={(e) => e.stopPropagation()}
        sx={{
          maxWidth, width: width ?? (maxWidth > 600 ? '92vw' : '90vw'), my: 'auto', minHeight: 0, maxHeight,
          bgcolor: 'rgba(22,33,62,0.96)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, p: 2.5,
          overflowY: 'auto', '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none',
        }}
      >
        {children}
      </Box>
    </Box>,
    document.body,
  );
}

/** Hook for popover open/exit state + closeWithAnim */
export function usePopover() {
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const close = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      if (mountedRef.current) { setOpen(false); setExiting(false); }
    }, 200);
  }, []);
  return { open, setOpen, exiting, close } as const;
}
