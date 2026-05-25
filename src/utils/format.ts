import { PERCENTAGE_STAT_TYPES } from '../data/constants';
import type { SubstatType } from '../types';

const DECIMALS = 4;

/**
 * Format a stat value for display.
 * Percentage types are multiplied by 100 and suffixed with %.
 * Flat types are displayed as-is.
 */
export function formatStatValue(type: SubstatType, value: number): string {
  if (PERCENTAGE_STAT_TYPES.has(type)) {
    return `${(value * 100).toFixed(DECIMALS)}%`;
  }
  return formatNumber(value);
}

/**
 * Format a number with thousands separators.
 * e.g. 12345.6789 → "12,345.6789"
 */
export function formatNumber(value: number, decimals: number = DECIMALS): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format damage number for display.
 * e.g. 1234567.8901 → "1,234,567.8901"
 */
export function formatDamage(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: DECIMALS,
    maximumFractionDigits: DECIMALS,
  });
}

/**
 * Format a percentage value for display.
 * Input is decimal (0.153 → "+15.3000%")
 */
export function formatPercent(value: number, showSign: boolean = true): string {
  const percent = value * 100;
  const sign = showSign && percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(DECIMALS)}%`;
}

/**
 * Format improvement percentage.
 * e.g. 0.153 → "+15.3000%"
 * e.g. -0.05 → "-5.0000%"
 */
export function formatImprovement(value: number): string {
  const percent = value * 100;
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(DECIMALS)}%`;
}
