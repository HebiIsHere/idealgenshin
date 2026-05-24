import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircleIcon from '@mui/icons-material/Circle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useWizardStore, WIZARD_SECTIONS, type WizardSection } from '../../store/slices/wizardSlice';
import { useCharacterStore } from '../../store/slices/characterSlice';

const SECTION_LABELS: Record<string, string> = {
  import: 'Enka 导入',
  character: '角色选择',
  weapon: '武器配置',
  artifacts: '圣遗物',
  talents: '天赋与命座',
  teambuffs: '队伍 Buff',
  scenario: '场景与倍率',
};

interface SectionStepperProps {
  /** Extra result section labels */
  resultLabels?: Record<string, string>;
}

function SectionStepper({ resultLabels = {} }: SectionStepperProps): React.ReactElement {
  const currentIndex = useWizardStore((s) => s.currentIndex);
  const sections = useWizardStore((s) => s.sections);
  const goToSection = useWizardStore((s) => s.goToSection);
  const selectedCharacter = useCharacterStore((s) => s.selectedCharacter);

  const getLabel = (key: WizardSection): string => {
    const s = String(key);
    if (s.startsWith('result_')) return resultLabels[s] ?? '计算结果';
    return SECTION_LABELS[s] ?? s;
  };

  const isResult = (key: WizardSection): boolean => String(key).startsWith('result_');

  return (
    <Box
      sx={{
        position: 'fixed',
        left: 24,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        alignItems: 'center',
      }}
    >
      {sections.filter(s => !isResult(s)).map((key, idx) => {
        const originalIdx = sections.indexOf(key);
        const isCurrent = originalIdx === currentIndex;
        const isPast = originalIdx < currentIndex;
        const disabled = !selectedCharacter && originalIdx > 0;

        return (
          <Box
            key={String(key)}
            onClick={() => { if (!disabled) goToSection(originalIdx); }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: disabled ? 'default' : 'pointer',
              opacity: disabled ? 0.3 : 1,
              py: 0.75,
              transition: 'opacity 200ms ease',
              '&:hover': { opacity: disabled ? 0.3 : 1 },
            }}
          >
            {/* 圆点指示器 */}
            <Box sx={{ position: 'relative', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isPast ? (
                <CheckCircleIcon sx={{ fontSize: 14, color: 'primary.main' }} />
              ) : isCurrent ? (
                <CircleIcon sx={{ fontSize: 10, color: 'primary.main' }} />
              ) : (
                <RadioButtonUncheckedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              )}
            </Box>

            {/* 标签 */}
            <Typography
              variant="caption"
              sx={{
                color: isCurrent ? 'primary.main' : isPast ? 'text.primary' : 'text.secondary',
                fontWeight: isCurrent ? 600 : 400,
                fontSize: '0.65rem',
                lineHeight: 1,
                whiteSpace: 'nowrap',
                transition: 'color 200ms ease',
              }}
            >
              {getLabel(key)}
            </Typography>

            {/* 连线 */}
            {idx < sections.filter(s => !isResult(s)).length - 1 && (
              <Box
                sx={{
                  position: 'absolute',
                  left: 7.5,
                  top: 22,
                  width: 1,
                  height: 8,
                  bgcolor: originalIdx < currentIndex ? 'primary.main' : 'divider',
                  transition: 'background-color 200ms ease',
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}

export default SectionStepper;
