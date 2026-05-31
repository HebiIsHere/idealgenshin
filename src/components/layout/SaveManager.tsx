import React, { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import LinkIcon from '@mui/icons-material/Link';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import { useSaveStore } from '../../store/slices/saveSlice';
import type { CharacterSave } from '../../types';
import { encodeFromSave, decodeBuildFromHash } from '../../utils/share';
import { applySharePayload } from '../../utils/applyShare';

interface SaveManagerProps {
  open: boolean;
  onClose: () => void;
}

function SaveManager({ open, onClose }: SaveManagerProps): React.ReactElement {
  const { saves, listSaves, loadSave, deleteSave, saveCurrent, clearImportError } = useSaveStore();
  const [snackMsg, setSnackMsg] = useState('');
  const [snackOpen, setSnackOpen] = useState(false);

  useEffect(() => {
    if (open) { listSaves(); clearImportError(); }
  }, [open, listSaves, clearImportError]);

  const showSnack = (msg: string) => { setSnackMsg(msg); setSnackOpen(true); };

  const handleLoad = (saveId: string) => { loadSave(saveId); onClose(); };

  const handleDelete = (saveId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确定要删除此存档吗？')) deleteSave(saveId);
  };

  const handleShare = (save: CharacterSave, e: React.MouseEvent) => {
    e.stopPropagation();
    const hash = encodeFromSave(save);
    if (!hash) { showSnack('无法生成分享链接'); return; }
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    navigator.clipboard.writeText(url).then(() => showSnack('分享链接已复制到剪贴板'))
      .catch(() => showSnack('复制失败'));
  };

  const handlePasteShare = () => {
    navigator.clipboard.readText().then((text) => {
      const hash = text.includes('#') ? text.split('#')[1] : text;
      const payload = decodeBuildFromHash('#' + hash);
      if (!payload) { showSnack('无法识别的分享链接'); return; }

      applySharePayload(payload);
      showSnack('配置已加载');
      onClose();
    }).catch(() => showSnack('无法读取剪贴板'));
  };

  const handleExport = () => {
    const { exportSaves } = useSaveStore.getState();
    const allSaves = saves;
    const jsonStr = exportSaves(allSaves.map(s => s.saveId));
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `idealgenshin-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const jsonStr = ev.target?.result as string;
        if (jsonStr) {
          const { importSaves } = useSaveStore.getState();
          importSaves(jsonStr);
          listSaves();
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>配置管理</Typography>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {saves.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary" sx={{ mb: 2 }}>暂无保存的配置</Typography>
            </Box>
          ) : (
            saves.map((save) => (
              <Box
                key={save.saveId}
                onClick={() => handleLoad(save.saveId)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1, p: 1.5, mb: 0.5,
                  borderRadius: 1.5, cursor: 'pointer',
                  bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  '&:hover': { bgcolor: 'rgba(91,192,235,0.06)', borderColor: 'rgba(91,192,235,0.2)' },
                  transition: 'background-color 0.2s, border-color 0.2s',
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {save.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Lv.{save.characterLevel} · {save.weaponConfig?.weaponData?.nameZh ?? '无武器'}
                    {save.updatedAt ? ` · ${new Date(save.updatedAt).toLocaleDateString('zh-CN')}` : ''}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={(e) => handleShare(save, e)} title="复制分享链接" sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                  <LinkIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={(e) => handleDelete(save.saveId, e)} color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))
          )}
        </DialogContent>

        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" size="small" sx={{ flex: 1 }} onClick={() => { saveCurrent(); onClose(); }}>
              保存当前配置
            </Button>
            <Button variant="outlined" size="small" startIcon={<ContentPasteIcon />} onClick={handlePasteShare}>
              粘贴分享链接
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', pt: 0.5 }}>
            <Button size="small" variant="text" sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', minWidth: 'auto', px: 1 }} startIcon={<DownloadIcon sx={{ fontSize: 14 }} />} onClick={handleExport}>
              导出 JSON
            </Button>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.15)', lineHeight: '28px' }}>|</Typography>
            <Button size="small" variant="text" sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', minWidth: 'auto', px: 1 }} startIcon={<UploadIcon sx={{ fontSize: 14 }} />} onClick={handleImport}>
              导入 JSON
            </Button>
          </Box>
        </Box>
      </Dialog>

      <Snackbar open={snackOpen} autoHideDuration={2500} onClose={() => setSnackOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setSnackOpen(false)}>{snackMsg}</Alert>
      </Snackbar>
    </>
  );
}

export default SaveManager;
