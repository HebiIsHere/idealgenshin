import React, { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import CloseIcon from '@mui/icons-material/Close';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Alert from '@mui/material/Alert';
import { useSaveStore } from '../../store/slices/saveSlice';
import type { CharacterSave } from '../../types';

interface SaveManagerProps {
  /** 是否显示弹窗。 */
  open: boolean;
  /** 关闭弹窗回调。 */
  onClose: () => void;
}

/**
 * SaveManager — 存档管理弹窗。
 * 存档列表/重命名/删除/快速切换/导入JSON/新建角色/导出UID隐私选项。
 */
function SaveManager({ open, onClose }: SaveManagerProps): React.ReactElement {
  const {
    saves,
    listSaves,
    loadSave,
    deleteSave,
    renameSave,
    importSaves,
    exportSaves,
    importError,
    clearImportError,
    currentSaveId,
  } = useSaveStore();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [includeUid, setIncludeUid] = useState(false);

  // 打开时刷新存档列表
  useEffect(() => {
    if (open) {
      listSaves();
      clearImportError();
    }
  }, [open, listSaves, clearImportError]);

  /** 加载存档。 */
  const handleLoad = (saveId: string) => {
    loadSave(saveId);
    onClose();
  };

  /** 删除存档。 */
  const handleDelete = (saveId: string) => {
    if (window.confirm('确定要删除此存档吗？')) {
      deleteSave(saveId);
    }
  };

  /** 开始重命名。 */
  const handleStartRename = (save: CharacterSave) => {
    setRenamingId(save.saveId);
    setRenameValue(save.name);
  };

  /** 确认重命名。 */
  const handleConfirmRename = () => {
    if (renamingId && renameValue.trim()) {
      renameSave(renamingId, renameValue.trim());
      setRenamingId(null);
      setRenameValue('');
    }
  };

  /** 导出存档。 */
  const handleExport = () => {
    const saveIds = saves.map((s) => s.saveId);
    const jsonStr = exportSaves(saveIds, includeUid);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `genshin-optimizer-saves-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** 导入存档。 */
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
          const result = importSaves(jsonStr);
          if (result.success) {
            listSaves();
          }
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          存档管理
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* 导入错误 */}
        {importError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {importError}
          </Alert>
        )}

        {/* 存档列表 */}
        {saves.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">暂无存档</Typography>
          </Box>
        ) : (
          <List dense>
            {saves.map((save) => (
              <ListItem
                key={save.saveId}
                onClick={() => handleLoad(save.saveId)}
                sx={{
                  cursor: 'pointer',
                  borderRadius: 1,
                  mb: 0.5,
                  bgcolor: currentSaveId === save.saveId ? 'rgba(212, 168, 67, 0.08)' : 'transparent',
                  '&:hover': { bgcolor: 'rgba(212, 168, 67, 0.06)' },
                }}
              >
                <ListItemText
                  primary={
                    renamingId === save.saveId ? (
                      <TextField
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConfirmRename();
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        size="small"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        sx={{ width: '100%' }}
                      />
                    ) : (
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {save.name}
                      </Typography>
                    )
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {save.characterId} · Lv.{save.characterLevel} · {save.weaponConfig?.weaponData?.nameZh ?? '无武器'}
                      {save.updatedAt && ` · ${new Date(save.updatedAt).toLocaleDateString('zh-CN')}`}
                    </Typography>
                  }
                />
                <ListItemSecondaryAction>
                  {renamingId === save.saveId ? (
                    <Button size="small" onClick={(e) => { e.stopPropagation(); handleConfirmRename(); }}>
                      确认
                    </Button>
                  ) : (
                    <>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleStartRename(save); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(save.saveId); }} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ flexDirection: 'column', gap: 1, p: 2 }}>
        {/* 导出隐私选项 */}
        <FormControlLabel
          control={
            <Checkbox
              checked={includeUid}
              onChange={(e) => setIncludeUid(e.target.checked)}
              size="small"
            />
          }
          label="导出包含UID"
          sx={{ alignSelf: 'flex-start' }}
        />

        <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
          <Button
            startIcon={<UploadIcon />}
            onClick={handleImport}
            variant="outlined"
            size="small"
            sx={{ flex: 1 }}
          >
            导入JSON
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            variant="outlined"
            size="small"
            disabled={saves.length === 0}
            sx={{ flex: 1 }}
          >
            导出存档
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

export default SaveManager;
