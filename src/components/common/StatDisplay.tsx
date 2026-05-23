import React from 'react';
import type { SubstatType } from '../../types';
import { STAT_DISPLAY_NAMES } from '../../data/constants';
import { formatStatValue } from '../../utils/format';

interface StatDisplayProps {
  /** Stat type. */
  type: SubstatType;
  /** Value to display. */
  value: number;
  /** Optional label override. */
  label?: string;
  /** Whether to highlight this stat. */
  highlight?: boolean;
  /** Additional value to show (e.g. optimized vs current). */
  compareValue?: number;
}

/** Display a stat name and value, optionally with a comparison. */
function StatDisplay({
  type,
  value,
  label,
  highlight = false,
  compareValue,
}: StatDisplayProps): React.ReactElement {
  const displayName = label ?? STAT_DISPLAY_NAMES[type] ?? type;
  const formattedValue = formatStatValue(type, value);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 0',
      }}
    >
      <span
        style={{
          fontSize: '0.875rem',
          color: highlight ? '#D4A843' : '#A0A0B0',
          fontWeight: highlight ? 600 : 400,
        }}
      >
        {displayName}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            fontSize: '0.875rem',
            color: highlight ? '#D4A843' : '#E0E0E0',
            fontWeight: highlight ? 600 : 400,
          }}
        >
          {formattedValue}
        </span>
        {compareValue !== undefined && (
          <>
            <span style={{ fontSize: '0.75rem', color: '#A0A0B0' }}>→</span>
            <span
              style={{
                fontSize: '0.875rem',
                color: compareValue > value ? '#74C2A8' : compareValue < value ? '#EF7938' : '#E0E0E0',
                fontWeight: 600,
              }}
            >
              {formatStatValue(type, compareValue)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default StatDisplay;
