import React, { useState, useMemo } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { searchCharacters } from '../../data/characters';
import { useCharacterStore } from '../../store/slices/characterSlice';

/** Element color map for visual indicators. */
const ELEMENT_COLORS: Record<string, string> = {
  PYRO: '#EF7938',
  HYDRO: '#4CC2F1',
  CRYO: '#9FD6E3',
  ELECTRO: '#D09FF0',
  ANEMO: '#74C2A8',
  GEO: '#F0B640',
  DENDRO: '#A5C83B',
};

/** Character selector with search and element filter. */
function CharacterSelect(): React.ReactElement {
  const { selectedCharacter, selectCharacter } = useCharacterStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCharacters = useMemo(
    () => searchCharacters(searchQuery),
    [searchQuery],
  );

  return (
    <Autocomplete
      options={filteredCharacters}
      getOptionLabel={(option) => `${option.nameZh} (${option.name})`}
      value={selectedCharacter}
      onChange={(_event, newValue) => {
        if (newValue) {
          selectCharacter(newValue.id);
          setSearchQuery(newValue.nameZh);
        }
      }}
      inputValue={searchQuery}
      onInputChange={(_event, newInputValue) => {
        setSearchQuery(newInputValue);
      }}
      filterOptions={(x) => x}
      clearOnBlur={false}
      selectOnFocus
      renderOption={(props, option) => {
        const { key, ...restProps } = props as any;
        return (
          <Box component="li" key={option.id} {...restProps} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: ELEMENT_COLORS[option.element] ?? '#888',
              }}
            />
            <Typography sx={{ flexGrow: 1 }}>{option.nameZh}</Typography>
            <Typography variant="caption" color="text.secondary">
              {option.name}
            </Typography>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="选择角色"
          placeholder="搜索角色名…"
          size="small"
        />
      )}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      sx={{ minWidth: 260 }}
    />
  );
}

export default CharacterSelect;
