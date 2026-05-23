import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { fetchAllCharacterBuilds } from '../../services/enka';
import { CacheService } from '../../services/cache';
import { formatSetBonuses } from '../../services/set-bonus';
import { useArtifactStore } from '../../store/slices/artifactSlice';

const CACHE_PREFIX = 'enka_uid_';
const CACHE_TTL = 3600 * 1000; // 1 hour

/** Artifact import from Enka Network API with full showcase support. */
function ArtifactImport(): React.ReactElement {
  const [uid, setUid] = useState('');
  const [error, setError] = useState<string | null>(null);
  const {
    setAllArtifacts,
    setImporting,
    setImportError,
    isImporting,
    showcaseCharacters,
    selectedShowcaseIdx,
    setShowcaseCharacters,
    selectShowcaseCharacter,
  } = useArtifactStore();

  const handleImport = async () => {
    if (!uid.trim()) {
      setError('请输入UID');
      return;
    }

    setError(null);
    setImporting(true);

    try {
      // Check cache first
      const cacheKey = `${CACHE_PREFIX}${uid}`;
      const cached = CacheService.get<{ characters: ReturnType<typeof fetchAllCharacterBuilds> extends Promise<infer T> ? T : never }>(cacheKey);
      if (cached && cached.characters) {
        setShowcaseCharacters(cached.characters);
        if (cached.characters.length > 0) {
          setAllArtifacts(cached.characters[0].artifacts);
        }
        setImporting(false);
        return;
      }

      const characters = await fetchAllCharacterBuilds(uid.trim());

      if (characters.length === 0) {
        setError('展柜中没有角色数据');
        setImporting(false);
        return;
      }

      // Store all characters in state
      setShowcaseCharacters(characters);

      // Auto-fill first character's artifacts
      setAllArtifacts(characters[0].artifacts);

      // Cache the whole showcase data
      CacheService.set(cacheKey, { characters }, CACHE_TTL);

      setImporting(false);
    } catch (err: any) {
      const message = err?.message ?? '导入失败';
      setError(message);
      setImportError(message);
      setImporting(false);
    }
  };

  const handleCharacterSelect = (idx: number) => {
    selectShowcaseCharacter(idx);
  };

  const selectedChar = showcaseCharacters[selectedShowcaseIdx] ?? null;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1.5, color: 'primary.main' }}>
        Enka 自动导入
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        输入UID自动从角色展柜导入全部角色圣遗物数据
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          label="UID"
          value={uid}
          onChange={(e) => setUid(e.target.value)}
          placeholder="输入游戏UID"
          size="small"
          sx={{ flexGrow: 1 }}
          disabled={isImporting}
        />
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={isImporting || !uid.trim()}
          sx={{ minWidth: 80 }}
        >
          {isImporting ? <CircularProgress size={20} /> : '导入'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {error}
        </Alert>
      )}

      {/* Character selector — shown after successful import */}
      {showcaseCharacters.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="showcase-char-select-label">选择角色</InputLabel>
            <Select
              labelId="showcase-char-select-label"
              value={selectedShowcaseIdx}
              label="选择角色"
              onChange={(e) => handleCharacterSelect(Number(e.target.value))}
            >
              {showcaseCharacters.map((char, idx) => (
                <MenuItem key={char.characterId} value={idx}>
                  {char.characterName} Lv.{char.characterLevel}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Set bonus display for selected character */}
          {selectedChar && selectedChar.setBonuses.length > 0 && (
            <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {selectedChar.setBonuses.map((bonus) => (
                <Chip
                  key={bonus.setName}
                  label={bonus.bonus4
                    ? `${bonus.setName} ×4`
                    : `${bonus.setName} ×2`}
                  size="small"
                  color={bonus.bonus4 ? 'primary' : 'default'}
                  variant={bonus.bonus4 ? 'filled' : 'outlined'}
                  sx={{ fontSize: '0.75rem' }}
                />
              ))}
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', ml: 0.5 }}>
                {formatSetBonuses(selectedChar.setBonuses)}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
}

export default ArtifactImport;
