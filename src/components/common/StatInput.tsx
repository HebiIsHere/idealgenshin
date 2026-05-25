import React from 'react';
import type { SubstatType } from '../../types';
import { PERCENTAGE_STAT_TYPES, STAT_DISPLAY_NAMES } from '../../data/constants';

interface StatInputProps {
  /** Stat type. */
  type: SubstatType;
  /** Current value. */
  value: number;
  /** Change handler. */
  onChange: (value: number) => void;
  /** Whether the input is disabled. */
  disabled?: boolean;
  /** Minimum value. */
  min?: number;
  /** Maximum value. */
  max?: number;
  /** Label override. */
  label?: string;
}

/** Reusable stat input component with type-aware formatting. */
function StatInput({
  type,
  value,
  onChange,
  disabled = false,
  min = 0,
  max,
  label,
}: StatInputProps): React.ReactElement {
  const isPercent = PERCENTAGE_STAT_TYPES.has(type);
  const displayLabel = label ?? STAT_DISPLAY_NAMES[type] ?? type;
  const step = isPercent ? 0.1 : 1;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = parseFloat(e.target.value);
    if (isNaN(rawValue)) return;
    // Convert percentage display to decimal for storage
    const internalValue = isPercent ? rawValue / 100 : rawValue;
    onChange(Math.max(min, max !== undefined ? Math.min(internalValue, max) : internalValue));
  };

  const displayValue = isPercent ? (value * 100).toFixed(4) : value.toFixed(4);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ minWidth: 80, fontSize: '0.875rem', color: '#A0A0B0' }}>
        {displayLabel}
      </span>
      <input
        type="number"
        value={displayValue}
        onChange={handleChange}
        disabled={disabled}
        step={step}
        min={isPercent ? min * 100 : min}
        max={max !== undefined ? (isPercent ? max * 100 : max) : undefined}
        style={{
          width: 80,
          padding: '4px 8px',
          borderRadius: 4,
          border: '1px solid rgba(212, 168, 67, 0.3)',
          backgroundColor: '#16213E',
          color: '#E0E0E0',
          fontSize: '0.875rem',
        }}
      />
      {isPercent && <span style={{ fontSize: '0.75rem', color: '#A0A0B0' }}>%</span>}
    </div>
  );
}

export default StatInput;
