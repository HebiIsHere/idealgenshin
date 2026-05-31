import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import CharacterSelect from '../../character/CharacterSelect';

interface CharacterSectionProps {
  characterLevel: number;
  setCharacterLevel: (v: number) => void;
  onSelectCharacter: (id: string) => void;
}

export default function CharacterSection({ characterLevel, setCharacterLevel, onSelectCharacter }: CharacterSectionProps) {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 0.5, color: 'primary.main' }}>选择角色</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        选择一位需要分析的角色
      </Typography>
      <CharacterSelect onSelectCharacter={onSelectCharacter} />
      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          label="角色等级"
          type="number"
          size="small"
          value={characterLevel}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            if (!isNaN(v) && v >= 1 && v <= 100) setCharacterLevel(v);
          }}
          slotProps={{ htmlInput: { min: 1, max: 100 } }}
          sx={{ width: 120 }}
        />
      </Box>
    </Box>
  );
}
