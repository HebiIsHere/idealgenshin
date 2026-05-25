import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useWizardStore, type WizardSection } from '../../store/slices/wizardSlice';

const SECTION_LABELS: Record<string, { label: string; num: string }> = {
  import:     { label: 'Enka 导入',  num: '①' },
  character:  { label: '角色选择',   num: '②' },
  weapon:     { label: '武器配置',   num: '③' },
  artifacts:  { label: '圣遗物',     num: '④' },
  talents:    { label: '天赋与命座', num: '⑤' },
  scenario:   { label: '倍率与反应', num: '⑥' },
  teambuffs:  { label: '队伍 Buff',  num: '⑦' },
};

const ANIM_MS = 280;

interface SectionStepperProps {
  resultLabels?: Record<string, string>;
}

function SectionStepper({ resultLabels = {} }: SectionStepperProps): React.ReactElement {
  const currentIndex = useWizardStore((s) => s.currentIndex);
  const sections = useWizardStore((s) => s.sections);
  const goToSection = useWizardStore((s) => s.goToSection);

  const isResult = (key: WizardSection): boolean => String(key).startsWith('result_');
  const isCurrentResult = isResult(sections[currentIndex] ?? '' as WizardSection);
  const allSections = sections;

  const getLabel = (key: WizardSection): string => {
    const s = String(key);
    if (s.startsWith('result_')) return resultLabels[s] ?? '计算结果';
    return SECTION_LABELS[s]?.label ?? s;
  };

  const getNum = (key: WizardSection): string => {
    const s = String(key);
    if (s.startsWith('result_')) return '★';
    return SECTION_LABELS[s]?.num ?? '·';
  };

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
        alignItems: 'flex-start',
      }}
    >
      {allSections.map((key) => {
        const originalIdx = sections.indexOf(key);
        const isCurrent = originalIdx === currentIndex;
        const isPast = originalIdx < currentIndex;
        const resultItem = isResult(key);
        const hidden = resultItem && !isCurrentResult;

        return (
          <Box
            key={String(key)}
            onClick={() => { if (!hidden) goToSection(originalIdx); }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: hidden ? 'default' : 'pointer',
              py: hidden ? 0 : 0.5,
              px: 1,
              borderRadius: 1,
              maxHeight: hidden ? 0 : 32,
              opacity: hidden ? 0 : 1,
              overflow: 'hidden',
              pointerEvents: hidden ? 'none' : 'auto',
              transform: hidden ? 'translateX(-12px)' : 'translateX(0)',
              transition: `all ${ANIM_MS}ms cubic-bezier(0.16,1,0.3,1)`,
              bgcolor: isCurrent ? 'rgba(212,168,67,0.12)' : 'transparent',
              '&:hover': hidden ? {} : { bgcolor: isCurrent ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.04)' },
            }}
          >
            {/* 步骤编号 */}
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.55rem',
                width: 14,
                textAlign: 'center',
                color: isCurrent ? 'primary.main'
                  : isPast ? 'rgba(255,255,255,0.5)'
                  : 'rgba(255,255,255,0.2)',
                fontWeight: isCurrent ? 700 : 400,
                transition: `color ${ANIM_MS}ms cubic-bezier(0.16,1,0.3,1)`,
              }}
            >
              {getNum(key)}
            </Typography>

            {/* 标签 */}
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.62rem',
                lineHeight: 1,
                whiteSpace: 'nowrap',
                fontWeight: isCurrent ? 600 : isPast ? 400 : 300,
                color: isCurrent ? 'primary.main'
                  : isPast ? 'rgba(255,255,255,0.6)'
                  : 'rgba(255,255,255,0.3)',
                transition: `color ${ANIM_MS}ms cubic-bezier(0.16,1,0.3,1)`,
                opacity: 1,
              }}
            >
              {getLabel(key)}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

export default SectionStepper;
