import React, { useState, useCallback } from 'react';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import ShareIcon from '@mui/icons-material/Share';

interface Props {
  /** 返回编码后的 hash 片段（如 "s=XXXX"），返回 null 表示无数据可分享 */
  getShareHash: () => string | null;
  size?: 'small' | 'medium';
}

function ShareButton({ getShareHash, size = 'small' }: Props): React.ReactElement {
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');

  const handleShare = useCallback(() => {
    const hash = getShareHash();
    if (!hash) {
      setSnackMsg('暂无配置数据可分享');
      setSnackOpen(true);
      return;
    }

    const url = `${window.location.origin}${window.location.pathname}#${hash}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setSnackMsg('分享链接已复制到剪贴板');
        setSnackOpen(true);
      }).catch(() => {
        setSnackMsg('复制失败，请手动复制地址栏链接');
        setSnackOpen(true);
      });
    } else {
      // Fallback for older browsers
      try {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setSnackMsg('分享链接已复制到剪贴板');
      } catch {
        setSnackMsg('复制失败，请手动复制地址栏链接');
      }
      setSnackOpen(true);
    }
  }, [getShareHash]);

  return (
    <>
      <IconButton size={size} onClick={handleShare} title="分享配置" sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
        <ShareIcon fontSize={size} />
      </IconButton>
      <Snackbar open={snackOpen} autoHideDuration={2500} onClose={() => setSnackOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" sx={{ width: '100%' }} onClose={() => setSnackOpen(false)}>
          {snackMsg}
        </Alert>
      </Snackbar>
    </>
  );
}

export default ShareButton;
