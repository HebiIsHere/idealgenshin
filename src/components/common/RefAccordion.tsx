import React from 'react';
import Collapse from '@mui/material/Collapse';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export interface RefEntry {
  name: string;
  description: string;
  params?: string[];
  index?: number;
}

interface RefAccordionProps {
  open: boolean;
  onToggle: () => void;
  entries: RefEntry[];
  buttonLabel: string;
  emptyHint: string;
}

function RefAccordion({ open, onToggle, entries, buttonLabel, emptyHint }: RefAccordionProps): React.ReactElement {
  return (
    <Box sx={{ mt: 1 }}>
      <Button
        size="small"
        variant="text"
        onClick={onToggle}
        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
      >
        {buttonLabel}
      </Button>
      <Collapse in={open}>
        <Box sx={{ mt: 1 }}>
          {entries.length === 0 && (
            <Typography variant="caption" color="text.disabled">
              {emptyHint}
            </Typography>
          )}
          {entries.map((entry, i) => (
            <Accordion
              key={i}
              disableGutters
              sx={{
                mb: 0.5,
                bgcolor: 'rgba(255,255,255,0.04)',
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ fontSize: '1rem' }} />}
                sx={{ minHeight: 32, '& .MuiAccordionSummary-content': { my: 0.25 } }}
              >
                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                  {entry.index ? `C${entry.index} · ` : ''}{entry.name}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {entry.description || '暂无描述'}
                </Typography>
                {entry.params && entry.params.length > 0 && (
                  <Box sx={{ mt: 0.5, p: 0.75, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.03)' }}>
                    {entry.params.map((p, j) => (
                      <Typography key={j} variant="caption" sx={{ display: 'block', color: 'primary.main', lineHeight: 1.5 }}>
                        {p}
                      </Typography>
                    ))}
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

export default RefAccordion;
