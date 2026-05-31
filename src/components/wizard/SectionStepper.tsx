import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useWizardStore, type WizardSection } from '../../store/slices/wizardSlice';

const SECTION_LABELS: Record<string, string> = {
  import:     'Enka 导入',
  character:  '角色选择',
  weapon:     '武器配置',
  artifacts:  '圣遗物',
  talents:    '天赋与命座',
  scenario:   '倍率与反应',
  teambuffs:  '队伍 Buff',
};

const ANIM_MS = 200;

interface SectionStepperProps {
  resultLabels?: Record<string, string>;
}

function SectionStepper({ resultLabels = {} }: SectionStepperProps): React.ReactElement {
  const currentIndex = useWizardStore((s) => s.currentIndex);
  const sections = useWizardStore((s) => s.sections);
  const goToSection = useWizardStore((s) => s.goToSection);

  const isResult = (key: WizardSection): boolean => String(key).startsWith('result_');
  const isCurrentResult = isResult(sections[currentIndex] ?? '' as WizardSection);

  const getLabel = (key: WizardSection): string => {
    const s = String(key);
    if (s.startsWith('result_')) return resultLabels[s] ?? '计算结果';
    return SECTION_LABELS[s] ?? s;
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
        gap: '4px',
        alignItems: 'stretch',
        bgcolor: 'rgba(15,22,41,0.7)',
        backdropFilter: 'blur(16px) saturate(120%)',
        WebkitBackdropFilter: 'blur(16px) saturate(120%)',
        borderRadius: '20px',
        p: '8px',
        border: '1px solid rgba(255,255,255,0.06)',
        maxWidth: 160,
      }}
    >
      {sections.map((key, idx) => {
        const isCurrent = idx === currentIndex;
        const isPast = idx < currentIndex;
        const resultItem = isResult(key);
        const hidden = resultItem && !isCurrentResult;

        return (
          <Box
            key={String(key)}
            onClick={() => { if (!hidden) goToSection(idx); }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: hidden ? 'default' : 'pointer',
              py: hidden ? 0 : '6px',
              px: hidden ? 0 : '12px',
              borderRadius: '999px',
              maxHeight: hidden ? 0 : 32,
              opacity: hidden ? 0 : 1,
              overflow: 'hidden',
              pointerEvents: hidden ? 'none' : 'auto',
              transform: hidden ? 'translateX(-8px)' : 'translateX(0)',
              transition: `opacity ${ANIM_MS}ms cubic-bezier(0.16,1,0.3,1), transform ${ANIM_MS}ms cubic-bezier(0.16,1,0.3,1), max-height ${ANIM_MS}ms cubic-bezier(0.16,1,0.3,1), background-color ${ANIM_MS}ms cubic-bezier(0.16,1,0.3,1)`,
              bgcolor: isCurrent ? 'rgba(91,192,235,0.12)' : 'transparent',
              '&:hover': hidden ? {} : {
                bgcolor: isCurrent ? 'rgba(91,192,235,0.16)' : 'rgba(91,192,235,0.04)',
              },
            }}
          >
            {/* 步骤编号圆 */}
            <Box
              sx={{
                width: 18, height: 18, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                fontSize: '0.58rem', fontWeight: 600,
                bgcolor: isCurrent ? 'rgba(91,192,235,0.18)'
                  : isPast ? 'rgba(91,192,235,0.08)'
                  : 'rgba(255,255,255,0.04)',
                color: isCurrent ? '#D0E8EF'
                  : isPast ? 'rgba(91,192,235,0.4)'
                  : 'rgba(255,255,255,0.25)',
                transition: `background-color ${ANIM_MS}ms cubic-bezier(0.16,1,0.3,1), color ${ANIM_MS}ms cubic-bezier(0.16,1,0.3,1)`,
              }}
            >
              {isPast ? '✓' : resultItem ? '★' : idx + 1}
            </Box>

            {/* 标签 */}
            <Typography
              sx={{
                fontSize: '0.72rem',
                lineHeight: 1,
                whiteSpace: 'nowrap',
                fontWeight: isCurrent ? 600 : isPast ? 400 : 300,
                color: isCurrent ? '#5BC0EB'
                  : isPast ? 'rgba(91,192,235,0.45)'
                  : 'rgba(208,232,239,0.35)',
                transition: `color ${ANIM_MS}ms cubic-bezier(0.16,1,0.3,1)`,
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
